import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'
import { useMyCareerSeries } from '@/pages/high-student/_hooks/useRoadmap'

const AXES = [
  { key: 'speaking', label: '말하기·면접', color: '#378ADD' },
  { key: 'major', label: '전공지식', color: '#1D9E75' },
  { key: 'activity', label: '생기부 활동', color: '#EF9F27' },
] as const

type AxisKey = (typeof AXES)[number]['key']

interface MonthScore {
  ym: string
  label: string
  speaking: number | null
  major: number | null
  activity: number | null
  detail: Record<AxisKey, string>
}

/** 최근 N개월 (오래된 것부터) */
function recentMonths(n: number) {
  const out: { ym: string; label: string; from: string; to: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    out.push({
      ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${d.getMonth() + 1}월`,
      from: d.toISOString(),
      to: next.toISOString(),
    })
  }
  return out
}

const avg = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null

interface Props {
  onClose?: () => void
}

export default function MonthlyScore({ onClose }: Props) {
  const student = useAtomValue(studentState)
  const studentId = student?.id ? String(student.id) : undefined

  const months = useMemo(() => recentMonths(6), [])
  const rangeFrom = months[0].from

  const { data: career } = useMyCareerSeries()
  const targetMajor = career?.byGrade.get(3)?.major ?? career?.byGrade.get(1)?.major ?? null
  const targetUniv = career?.byGrade.get(3)?.university ?? null

  // ── 원본 조회 (6개월치 한 번에) ──────────────────────────
  const { data: raw, isLoading } = useQuery({
    queryKey: ['monthly-score-raw', studentId, rangeFrom],
    enabled: !!studentId,
    queryFn: async () => {
      const [mock, passage, major, topics, reports, changche] = await Promise.all([
        supabase
          .from('high_mock_exam_report')
          .select('total_score, created_at')
          .eq('student_id', studentId!)
          .gte('created_at', rangeFrom),
        supabase
          .from('high_passage_exam')
          .select('final_score, first_score, created_at')
          .eq('student_id', studentId!)
          .gte('created_at', rangeFrom),
        supabase
          .from('high_major_progress')
          .select('obj_score, obj_total, updated_at')
          .eq('student_id', studentId!)
          .gte('updated_at', rangeFrom),
        supabase
          .from('high_roadmap_topic')
          .select('id, created_at')
          .eq('student_id', studentId!)
          .gte('created_at', rangeFrom),
        supabase
          .from('high_roadmap_pipeline')
          .select('step, status, completed_at')
          .eq('student_id', studentId!)
          .eq('status', 'done')
          .gte('completed_at', rangeFrom),
        supabase
          .from('high_roadmap_changche')
          .select('id, created_at')
          .eq('student_id', studentId!)
          .gte('created_at', rangeFrom),
      ])

      return {
        mock: mock.data ?? [],
        passage: passage.data ?? [],
        major: major.data ?? [],
        topics: topics.data ?? [],
        reports: reports.data ?? [],
        changche: changche.data ?? [],
      }
    },
  })

  // ── 월별 집계 ────────────────────────────────────────────
  const scores: MonthScore[] = useMemo(() => {
    if (!raw) return []

    const inMonth = (d: string | null, m: (typeof months)[number]) =>
      !!d && d >= m.from && d < m.to

    return months.map((m) => {
      // 말하기 = 모의고사 총점 + 제시문 최종점수 평균
      const mockS = raw.mock
        .filter((r: any) => inMonth(r.created_at, m) && r.total_score != null)
        .map((r: any) => Number(r.total_score))
      const passS = raw.passage
        .filter((r: any) => inMonth(r.created_at, m))
        .map((r: any) => Number(r.final_score ?? r.first_score))
        .filter((n: number) => !Number.isNaN(n))
      const speaking = avg([...mockS, ...passS])

      // 전공 = 객관식 정답률
      const majorRows = raw.major.filter(
        (r: any) => inMonth(r.updated_at, m) && r.obj_total > 0,
      )
      const major = avg(
        majorRows.map((r: any) => (Number(r.obj_score) / Number(r.obj_total)) * 100),
      )

      // 활동 = 그 달에 만든 탐구·완료 단계·창체를 환산 (한 달 기준치 대비)
      const tCnt = raw.topics.filter((r: any) => inMonth(r.created_at, m)).length
      const pCnt = raw.reports.filter((r: any) => inMonth(r.completed_at, m)).length
      const cCnt = raw.changche.filter((r: any) => inMonth(r.created_at, m)).length
      const acted = tCnt + pCnt + cCnt
      const activity = acted === 0 ? null : Math.min(100, Math.round((acted / 6) * 100))

      return {
        ym: m.ym,
        label: m.label,
        speaking,
        major,
        activity,
        detail: {
          speaking: `모의고사 ${mockS.length}회 · 제시문 ${passS.length}회`,
          major: `전공 진도 ${majorRows.length}단원`,
          activity: `탐구 ${tCnt}개 · 단계 ${pCnt}개 · 창체 ${cCnt}개`,
        },
      }
    })
  }, [raw, months])

  const last = scores[scores.length - 1]
  const prev = scores[scores.length - 2]

  // 목표 대비 부족 항목 — 코멘트에 쓴다 (TargetProgress와 같은 쿼리 키라 재요청 없음)
  const { data: bench } = useQuery({
    queryKey: ['admit-benchmark', targetMajor],
    enabled: !!targetMajor,
    queryFn: async () => {
      const { data } = await supabase
        .from('high_admit_benchmark')
        .select('*')
        .eq('department', targetMajor!)
        .order('university', { nullsFirst: false })
      return (data ?? [])[0] ?? null
    },
  })

  const { data: counts } = useQuery({
    queryKey: ['my-activity-counts', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const c = async (table: string, extra?: (q: any) => any) => {
        let q = supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId!)
        if (extra) q = extra(q)
        const { count } = await q
        return count ?? 0
      }
      const [topics, changche, reading, reports, subjects] = await Promise.all([
        c('high_roadmap_topic'),
        c('high_roadmap_changche'),
        c('high_reading'),
        c('high_roadmap_pipeline', (q: any) => q.eq('step', 'report').eq('status', 'done')),
        c('high_roadmap_progress', (q: any) => q.eq('is_completed', true)),
      ])
      return { topics, changche, reading, reports, subjects }
    },
  })

  /** 전달 대비 변화 + 부족한 것으로 한 문단 만들기 */
  const comment = useMemo(() => {
    if (!last) return null

    const moved = AXES.map((a) => {
      const v = last[a.key]
      const p = prev?.[a.key] ?? null
      if (v === null || p === null || p === 0) return null
      return { label: a.label, pct: Math.round(((v - p) / p) * 100) }
    }).filter(Boolean) as { label: string; pct: number }[]

    const up = [...moved].sort((x, y) => y.pct - x.pct)[0]
    const down = [...moved].sort((x, y) => x.pct - y.pct)[0]

    const parts: string[] = []

    if (up && up.pct > 0) {
      parts.push(`${up.label}이 지난달보다 ${up.pct}% 올랐어요.`)
    }
    if (down && down.pct < 0 && down.label !== up?.label) {
      parts.push(`${down.label}은 ${Math.abs(down.pct)}% 낮아졌어요.`)
    }

    // 활동 기록이 아예 없던 축
    const none = AXES.filter((a) => last[a.key] === null).map((a) => a.label)
    if (none.length) {
      parts.push(`${none.join('·')}은 이번 달에 한 기록이 없어요.`)
    }

    // 목표 대비 가장 모자란 항목
    if (bench && counts) {
      const gaps = [
        { label: '탐구주제', mine: counts.topics, target: bench.topic_count, unit: '개' },
        { label: '보고서', mine: counts.reports, target: bench.report_count, unit: '편' },
        { label: '이수 과목', mine: counts.subjects, target: bench.subject_count, unit: '과목' },
        { label: '독서', mine: counts.reading, target: bench.reading_count, unit: '권' },
        { label: '창체 활동', mine: counts.changche, target: bench.changche_count, unit: '개' },
      ]
        .filter((g) => g.target && g.mine < g.target)
        .sort((a, b) => a.mine / (a.target as number) - b.mine / (b.target as number))

      if (gaps[0]) {
        const g = gaps[0]
        parts.push(
          `${g.label}가 ${g.mine}${g.unit}에 머물러 목표 대비 점수를 끌어내리고 있어요. 다음 달엔 ${(g.target as number) - g.mine}${g.unit} 더 채워보세요.`,
        )
      }
    }

    if (parts.length === 0) return null
    return parts.join(' ')
  }, [last, prev, bench, counts])

  const maxVal = 100

  if (isLoading) {
    return <div className="text-[13px] text-ink-muted">불러오는 중…</div>
  }

  return (
    <div className="max-w-[880px] mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[16px] font-extrabold text-ink mb-1">월별 점수</div>
          <div className="text-[12px] text-ink-secondary leading-relaxed">
            그 달에 한 활동만 반영해요. 시험기간처럼 활동이 적은 달은 낮게 나오는 게 정상이에요.
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="h-9 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold hover:bg-gray-50 flex-shrink-0"
          >
            닫기
          </button>
        )}
      </div>

      {/* 목표 달성률 */}
      <TargetProgress major={targetMajor} university={targetUniv} studentId={studentId} />

      {/* 막대 그래프 */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className="text-[14px] font-bold text-ink">달마다 한 것</span>
          <div className="ml-auto flex gap-3.5">
            {AXES.map((a) => (
              <span key={a.key} className="flex items-center gap-1.5 text-[11.5px] text-ink-secondary">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: a.color }}
                />
                {a.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-4 h-[200px] border-b border-slate-300 pb-0">
          {scores.map((s) => (
            <div
              key={s.ym}
              className="flex-1 flex items-end justify-center gap-1.5 h-full"
              title={AXES.map((a) => `${a.label} ${s[a.key] ?? '-'} (${s.detail[a.key]})`).join('\n')}
            >
              {AXES.map((a) => {
                const v = s[a.key]
                const h = v === null ? 0 : Math.max(3, (v / maxVal) * 196)
                return (
                  <div
                    key={a.key}
                    className="w-4 rounded-t-[3px] transition-all"
                    style={{
                      height: `${h}px`,
                      background: v === null ? '#E2E8F0' : a.color,
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-2.5">
          {scores.map((s, i) => {
            const isLast = i === scores.length - 1
            return (
              <span
                key={s.ym}
                className="flex-1 text-center text-[12px]"
                style={{
                  color: isLast ? '#1a1a1a' : '#94A3B8',
                  fontWeight: isLast ? 700 : 400,
                }}
              >
                {s.label}
              </span>
            )
          })}
        </div>

        {/* 이번 달 내역 */}
        {last && (
          <div className="border-t border-line mt-4 pt-4">
            <div className="text-[12.5px] text-ink-secondary mb-2.5">
              {last.label}에 한 것
            </div>
            <div className="flex flex-col gap-2.5">
              {AXES.map((a) => {
                const v = last[a.key]
                const p = prev?.[a.key] ?? null
                const diff = v !== null && p !== null ? v - p : null
                const rate =
                  v !== null && p !== null && p !== 0
                    ? Math.round(((v - p) / p) * 100)
                    : null
                return (
                  <div key={a.key} className="flex items-center gap-2 flex-wrap">
                    <span
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ background: a.color }}
                    />
                    <span className="text-[13.5px] text-ink">{a.label}</span>
                    <span className="text-[11.5px] text-ink-muted">{last.detail[a.key]}</span>
                    <span className="ml-auto flex items-center gap-2">
                      {diff !== null && diff !== 0 && (
                        <span
                          className="text-[11.5px] font-semibold"
                          style={{ color: diff > 0 ? '#059669' : '#DC2626' }}
                        >
                          {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}
                          {rate !== null && (
                            <span className="ml-1 font-medium">
                              ({rate > 0 ? '+' : ''}
                              {rate}%)
                            </span>
                          )}
                        </span>
                      )}
                      <span className="text-[14px] font-bold text-ink w-8 text-right">
                        {v ?? '-'}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {comment && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 mt-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[13px]">💡</span>
            <span className="text-[13px] font-bold text-amber-900">
              {last?.label} 코멘트
            </span>
          </div>
          <div className="text-[13.5px] text-ink leading-[1.75]">{comment}</div>
        </div>
      )}

      <div className="text-[10.5px] text-ink-muted mt-3 leading-relaxed">
        말하기는 모의고사·제시문 면접 점수, 전공지식은 전공특화문제 정답률, 생기부 활동은 그 달에
        만든 탐구·완료한 단계·창체 활동으로 계산해요.
      </div>
    </div>
  )
}

// ============================================================
// 목표 대학 달성률 (누적)
// ============================================================

function TargetProgress({
  major, university, studentId,
}: {
  major: string | null
  university: string | null
  studentId?: string
}) {
  const { data: bench } = useQuery({
    queryKey: ['admit-benchmark', major],
    enabled: !!major,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('high_admit_benchmark')
        .select('*')
        .eq('department', major!)
        .order('university', { nullsFirst: false })
      if (error) throw error
      return (data ?? [])[0] ?? null
    },
  })

  const { data: mine } = useQuery({
    queryKey: ['my-activity-counts', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const c = async (table: string, extra?: (q: any) => any) => {
        let q = supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId!)
        if (extra) q = extra(q)
        const { count } = await q
        return count ?? 0
      }
      const [topics, changche, reading, reports, subjects] = await Promise.all([
        c('high_roadmap_topic'),
        c('high_roadmap_changche'),
        c('high_reading'),
        c('high_roadmap_pipeline', (q: any) => q.eq('step', 'report').eq('status', 'done')),
        c('high_roadmap_progress', (q: any) => q.eq('is_completed', true)),
      ])
      return { topics, changche, reading, reports, subjects }
    },
  })

  const items = useMemo(() => {
    if (!mine) return []
    return [
      { label: '탐구주제', mine: mine.topics, target: bench?.topic_count ?? null },
      { label: '보고서', mine: mine.reports, target: bench?.report_count ?? null },
      { label: '이수 과목', mine: mine.subjects, target: bench?.subject_count ?? null },
      { label: '독서', mine: mine.reading, target: bench?.reading_count ?? null },
      { label: '창체 활동', mine: mine.changche, target: bench?.changche_count ?? null },
    ]
  }, [mine, bench])

  const pct = useMemo(() => {
    const valid = items.filter((i) => i.target && i.target > 0)
    if (valid.length === 0) return null
    const sum = valid.reduce((a, i) => a + Math.min(1, i.mine / (i.target as number)), 0)
    return Math.round((sum / valid.length) * 100)
  }, [items])

  if (!major) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 mb-3 text-[12px] text-amber-900">
        진로에서 희망 학과를 정하면 목표 대비 달성률도 같이 볼 수 있어요.
      </div>
    )
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-5 mb-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[14px] font-bold text-ink">
          {university ? `${university} ` : ''}
          {major}
        </span>
        {bench?.sample_size ? (
          <span className="text-[11px] text-ink-muted">
            합격자 {bench.sample_size}명 기준
          </span>
        ) : bench ? (
          <span className="text-[11px] text-ink-muted">{bench.source ?? '기준'}</span>
        ) : null}
      </div>

      {!bench ? (
        <div className="text-[12px] text-ink-secondary leading-relaxed">
          이 학과 기준 데이터가 아직 없어요. 등록되면 목표 대비 달성률이 표시돼요.
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5 mb-2.5">
            <span className="text-[38px] font-extrabold text-brand-high leading-none">
              {pct ?? '-'}
            </span>
            <span className="text-[15px] font-bold text-ink-muted">%</span>
          </div>

          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden mb-3.5">
            <div
              className="h-full rounded-full bg-brand-high"
              style={{ width: `${pct ?? 0}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {items.map((i) => {
              const enough = i.target !== null && i.mine >= i.target
              return (
                <div key={i.label} className="rounded-lg bg-gray-50 px-3 py-2.5">
                  <div className="text-[10.5px] text-ink-muted mb-0.5">{i.label}</div>
                  <div className="text-[15px] font-bold" style={{ color: enough ? '#059669' : '#1a1a1a' }}>
                    {i.mine}
                    {i.target !== null && (
                      <span className="text-[11px] font-medium text-ink-muted"> / {i.target}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}