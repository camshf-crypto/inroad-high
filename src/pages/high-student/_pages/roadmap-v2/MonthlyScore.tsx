import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'

const AXES = [
  { key: 'speaking', label: '말하기·면접', color: '#378ADD' },
  { key: 'major', label: '전공지식', color: '#1D9E75' },
  { key: 'activity', label: '생기부 활동', color: '#EF9F27' },
] as const

type AxisKey = (typeof AXES)[number]['key']

/** 제시문 면접 main_intent_score 의 만점.
 *  실제 스케일이 10점 만점이면 10, 5점 만점이면 5로만 바꾸면 됩니다. */
const PASSAGE_SCORE_MAX = 100

interface MonthScore {
  ym: string
  label: string
  speaking: number | null
  major: number | null
  activity: number | null
  detail: Record<AxisKey, string>
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/**
 * jsonb 점수를 0~100 으로 환산한다.
 * high_mock_exam_report 의 scores / detailed_scores 는 구조가 확정되지 않아
 * 아래 형태를 모두 받아들이도록 방어적으로 작성함.
 *   - 숫자                       → 그대로
 *   - { total, max }             → total/max*100
 *   - { 국어: 80, 수학: 70 }      → 평균
 *   - [{ score, max }, ...]      → 합계/만점합계*100
 *   - [80, 70]                   → 100점 만점으로 보고 평균
 *   - 위 형태가 중첩된 객체        → 각각 환산 후 평균
 */
function toScore100(input: unknown): number | null {
  if (input === null || input === undefined) return null

  if (typeof input === 'number') {
    return Number.isFinite(input) ? clamp100(input) : null
  }

  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return null
    try {
      return toScore100(JSON.parse(trimmed))
    } catch {
      const n = Number(trimmed)
      return Number.isFinite(n) ? clamp100(n) : null
    }
  }

  if (Array.isArray(input)) {
    let got = 0
    let full = 0
    for (const item of input) {
      if (typeof item === 'number') {
        if (!Number.isFinite(item)) continue
        got += item
        full += 100
      } else if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>
        const s = Number(o.score ?? o.value ?? o.point)
        const m = Number(o.max ?? o.maxScore ?? o.total ?? 100)
        if (!Number.isFinite(s)) continue
        got += s
        full += Number.isFinite(m) && m > 0 ? m : 100
      }
    }
    return full > 0 ? clamp100((got / full) * 100) : null
  }

  if (typeof input === 'object') {
    const o = input as Record<string, unknown>

    // { total, max } / { totalScore, maxScore } 형태
    const total = Number(o.total ?? o.totalScore ?? o.sum ?? o.score)
    const max = Number(o.max ?? o.maxScore ?? o.maxTotal ?? o.total_max)
    if (Number.isFinite(total)) {
      return Number.isFinite(max) && max > 0
        ? clamp100((total / max) * 100)
        : clamp100(total)
    }

    const values = Object.values(o)

    // { 항목명: 점수 } 형태 → 평균
    const flat = values.map(Number).filter((n) => Number.isFinite(n))
    if (flat.length) {
      return clamp100(flat.reduce((a, b) => a + b, 0) / flat.length)
    }

    // 중첩된 형태 → 각각 환산 후 평균
    const nested = values
      .map(toScore100)
      .filter((n): n is number => n !== null)
    if (nested.length) {
      return clamp100(nested.reduce((a, b) => a + b, 0) / nested.length)
    }
  }

  return null
}

/** 오늘이 속한 학년도의 시작 연도 (3월 시작 기준) */
function academicYearStart(now = new Date()) {
  return now.getMonth() + 1 >= 3 ? now.getFullYear() : now.getFullYear() - 1
}

/** 해당 학년도의 3월 ~ 다음해 2월. 아직 오지 않은 달은 뺀다. */
function monthsOfSchoolYear(startYear: number) {
  const out: { ym: string; label: string; from: string; to: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(startYear, 2 + i, 1) // 3월부터
    if (d > now) break
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

  const { data: career } = useQuery({
    queryKey: ['my-concepts', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data } = await supabase
        .from('student_concept')
        .select('grade, major, university, career, updated_at')
        .eq('student_id', studentId!)
        .order('updated_at', { ascending: false })
      return data ?? []
    },
  })

  /** 학년별 진로 (고1/고2/고3). 같은 학년 row 가 여럿이면 최근 것 */
  const conceptByGrade = useMemo(() => {
    const m = new Map<number, any>()
    for (const r of career ?? []) {
      const raw = String((r as any).grade ?? '')
      if (!raw.includes('고')) continue // 중등 row 제외
      const g = Number(raw.replace(/[^0-9]/g, ''))
      if (!(g >= 1 && g <= 3)) continue
      if (!m.has(g)) m.set(g, r) // updated_at 내림차순이라 첫 개가 최신
    }
    return m
  }, [career])

  /** 학생의 현재 학년 (1~3). '고1' 같은 문자열도 처리 */
  const currentGrade = useMemo(() => {
    const s: any = student
    const raw = s?.grade ?? s?.grade_level ?? s?.school_grade ?? s?.high_grade
    const n = Number(String(raw ?? '').replace(/[^0-9]/g, ''))
    return n >= 1 && n <= 3 ? n : null
  }, [student])

  // 보고 있는 학년 탭. 처음엔 현재 학년.
  const [picked, setPicked] = useState<number | null>(null)
  const viewGrade = picked ?? currentGrade ?? 1

  // 그 학년의 학년도 (현재 학년 = 올해 학년도 기준으로 앞뒤로 이동)
  const months = useMemo(() => {
    const base = academicYearStart()
    const yearStart = base + (viewGrade - (currentGrade ?? viewGrade))
    return monthsOfSchoolYear(yearStart)
  }, [viewGrade, currentGrade])

  const rangeFrom = months[0]?.from ?? new Date().toISOString()
  const rangeTo = months[months.length - 1]?.to ?? new Date().toISOString()

  // 목표는 "보고 있는 학년" row 만 쓴다. 다른 학년으로 넘어가지 않는다.
  const target = conceptByGrade.get(viewGrade) ?? null
  const targetMajor = target?.major ?? null
  const targetUniv = target?.university ?? null
  const targetGrade = target ? viewGrade : null

  // ── 원본 조회 (6개월치 한 번에) ──────────────────────────
  const { data: raw, isLoading } = useQuery({
    queryKey: ['monthly-score-raw', studentId, rangeFrom, rangeTo],
    enabled: !!studentId,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const [mock, passage, major, topics, reports, changche] = await Promise.all([
        supabase
          .from('high_mock_exam_report')
          .select('scores, detailed_scores, created_at')
          .eq('student_id', studentId!)
          .gte('created_at', rangeFrom)
          .lt('created_at', rangeTo),
        supabase
          .from('high_passage_exam')
          .select('main_intent_score, created_at')
          .eq('student_id', studentId!)
          .gte('created_at', rangeFrom)
          .lt('created_at', rangeTo),
        supabase
          .from('high_major_progress')
          .select('obj_score, obj_total, updated_at')
          .eq('student_id', studentId!)
          .gte('updated_at', rangeFrom)
          .lt('updated_at', rangeTo),
        supabase
          .from('high_roadmap_topic')
          .select('id, created_at')
          .eq('student_id', studentId!)
          .gte('created_at', rangeFrom)
          .lt('created_at', rangeTo),
        supabase
          .from('high_roadmap_pipeline')
          .select('step, status, completed_at')
          .eq('student_id', studentId!)
          .eq('status', 'done')
          .gte('completed_at', rangeFrom)
          .lt('completed_at', rangeTo),
        supabase
          .from('high_roadmap_changche')
          .select('id, created_at')
          .eq('student_id', studentId!)
          .gte('created_at', rangeFrom)
          .lt('created_at', rangeTo),
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
      // 말하기 = 모의고사 환산점수 + 제시문 면접 점수 평균
      const mockS = raw.mock
        .filter((r: any) => inMonth(r.created_at, m))
        .map((r: any) => toScore100(r.scores ?? r.detailed_scores))
        .filter((n: number | null): n is number => n !== null)

      const passS = raw.passage
        .filter((r: any) => inMonth(r.created_at, m))
        .map((r: any) => {
          const n = Number(r.main_intent_score)
          if (!Number.isFinite(n)) return null
          return clamp100((n / PASSAGE_SCORE_MAX) * 100)
        })
        .filter((n: number | null): n is number => n !== null)

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

      {/* 학년 탭 */}
      <div className="flex items-center gap-2 mb-3">
        {[1, 2, 3].map((g) => {
          const locked = g > (currentGrade ?? 1)
          const active = g === viewGrade
          return (
            <button
              key={g}
              onClick={() => !locked && setPicked(g)}
              disabled={locked}
              className={[
                'h-9 px-4 rounded-full text-[13px] font-bold flex items-center gap-1.5 transition-colors',
                locked
                  ? 'bg-gray-100 text-ink-muted cursor-not-allowed'
                  : active
                    ? 'bg-brand-high text-white'
                    : 'bg-white border border-line text-ink-secondary hover:bg-gray-50',
              ].join(' ')}
            >
              고{g}
              {g === currentGrade && (
                <span
                  className={[
                    'text-[10px] font-semibold rounded-full px-1.5 py-0.5',
                    active ? 'bg-white/25 text-white' : 'bg-blue-50 text-brand-high',
                  ].join(' ')}
                >
                  현재
                </span>
              )}
              {locked && <span className="text-[11px]">🔒</span>}
            </button>
          )
        })}
      </div>
      <div className="text-[11.5px] text-ink-muted mb-3">
        {(currentGrade ?? 1) < 3
          ? `고${(currentGrade ?? 1) + 1}부터는 그 학년이 되면 열려요.`
          : '3학년까지 모두 볼 수 있어요.'}
      </div>

      {/* 목표 달성률 */}
      <TargetProgress
        major={targetMajor}
        university={targetUniv}
        grade={targetGrade ?? viewGrade}
        studentId={studentId}
      />

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

        <div
          className="flex items-end h-[200px] border-b border-slate-300 pb-0"
          style={{ gap: months.length > 8 ? 6 : 16 }}
        >
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

        <div className="flex mt-2.5" style={{ gap: months.length > 8 ? 6 : 16 }}>
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
  major, university, grade, studentId,
}: {
  major: string | null
  university: string | null
  grade?: number | null
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
        {grade ? `고${grade}` : '이 학년'} 진로에서 희망 학과를 정하면 목표 대비 달성률도 같이 볼 수 있어요.
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
        {grade ? (
          <span className="text-[10.5px] font-semibold text-brand-high bg-blue-50 rounded px-1.5 py-0.5">
            고{grade} 목표
          </span>
        ) : null}
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