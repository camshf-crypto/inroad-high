import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'
import { useMyCareerSeries } from '@/pages/high-student/_hooks/useRoadmap'

interface Benchmark {
  university: string | null
  department: string
  topic_count: number | null
  subject_count: number | null
  reading_count: number | null
  changche_count: number | null
  report_count: number | null
  sample_size: number | null
  source: string | null
  note: string | null
}

interface Row {
  key: string
  label: string
  hint: string
  mine: number
  target: number | null
  unit: string
}

interface Props {
  onClose?: () => void
}

export default function AdmitCompare({ onClose }: Props) {
  const student = useAtomValue(studentState)
  const studentId = student?.id ? String(student.id) : undefined

  const { data: career } = useMyCareerSeries()
  const major =
    career?.byGrade.get(3)?.major ?? career?.byGrade.get(1)?.major ?? null

  // 목표 대학 (훅에 없어도 되게 직접 조회)
  const { data: university } = useQuery({
    queryKey: ['my-target-university', studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase
        .from('student_concept')
        .select('grade, university')
        .eq('student_id', studentId!)
        .not('university', 'is', null)
      const rows = data ?? []
      return (
        rows.find((r: any) => r.grade === '고3')?.university ??
        rows[0]?.university ??
        null
      )
    },
  })

  // 목표 학과 기준선 — 대학 지정본 우선, 없으면 학과 공통
  const { data: bench, isLoading: benchLoading } = useQuery({
    queryKey: ['admit-benchmark', major],
    enabled: !!major,
    queryFn: async (): Promise<Benchmark | null> => {
      const { data, error } = await supabase
        .from('high_admit_benchmark')
        .select('*')
        .eq('department', major!)
        .order('university', { nullsFirst: false })
      if (error) throw error
      return ((data ?? [])[0] as Benchmark) ?? null
    },
  })

  // 내 활동 집계
  const { data: mine, isLoading: mineLoading } = useQuery({
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
        c('high_roadmap_pipeline', (q: any) =>
          q.eq('step', 'report').eq('status', 'done'),
        ),
        c('high_roadmap_progress', (q: any) => q.eq('is_completed', true)),
      ])

      return { topics, changche, reading, reports, subjects }
    },
  })

  const rows: Row[] = useMemo(() => {
    if (!mine) return []
    return [
      {
        key: 'topic',
        label: '탐구주제',
        hint: '세특에 들어갈 탐구',
        mine: mine.topics,
        target: bench?.topic_count ?? null,
        unit: '개',
      },
      {
        key: 'report',
        label: '보고서',
        hint: '완성한 탐구 보고서',
        mine: mine.reports,
        target: bench?.report_count ?? null,
        unit: '편',
      },
      {
        key: 'subject',
        label: '이수 과목',
        hint: '완료 체크한 과목',
        mine: mine.subjects,
        target: bench?.subject_count ?? null,
        unit: '과목',
      },
      {
        key: 'reading',
        label: '독서',
        hint: '읽고 기록한 책',
        mine: mine.reading,
        target: bench?.reading_count ?? null,
        unit: '권',
      },
      {
        key: 'changche',
        label: '창체 활동',
        hint: '차별화 요소를 정한 활동',
        mine: mine.changche,
        target: bench?.changche_count ?? null,
        unit: '개',
      },
    ]
  }, [mine, bench])

  /** 항목별 달성률 평균 = 적합도 */
  const fit = useMemo(() => {
    const valid = rows.filter((r) => r.target && r.target > 0)
    if (valid.length === 0) return null
    const sum = valid.reduce(
      (a, r) => a + Math.min(1, r.mine / (r.target as number)),
      0,
    )
    return Math.round((sum / valid.length) * 100)
  }, [rows])

  if (benchLoading || mineLoading) {
    return <div className="text-[13px] text-ink-muted">불러오는 중…</div>
  }

  return (
    <div className="max-w-[760px] mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[16px] font-extrabold text-ink mb-1">
            합격 생기부와 비교
          </div>
          <div className="text-[12px] text-ink-secondary leading-relaxed">
            {major
              ? `${major}에 합격한 학생들이 3년간 쌓은 것과 비교해요.`
              : '목표 학과를 먼저 정해주세요.'}
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

      {!major ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-[13px] text-amber-900">
          진로에서 희망 학과를 정하면 비교할 수 있어요.
        </div>
      ) : !bench ? (
        <>
          <div className="rounded-2xl border border-line bg-gray-50 px-4 py-5 mb-3">
            <div className="text-[13px] font-semibold text-ink-secondary mb-1">
              {major} 기준 데이터가 아직 없어요
            </div>
            <div className="text-[11.5px] text-ink-muted leading-relaxed">
              합격자 기준이 등록되면 자동으로 비교돼요. 그때까지는 내가 쌓은 것만 확인할 수 있어요.
            </div>
          </div>
          <MyOnly rows={rows} />
        </>
      ) : (
        <>
          {/* 적합도 */}
          <div className="bg-white border border-line rounded-2xl p-5 mb-3">
            <div className="flex items-end gap-3 mb-3 flex-wrap">
              <div>
                <div className="text-[11px] font-bold text-ink-muted mb-0.5">적합도</div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-[36px] font-extrabold leading-none"
                    style={{
                      color:
                        (fit ?? 0) >= 80
                          ? '#059669'
                          : (fit ?? 0) >= 50
                            ? '#2563EB'
                            : '#D97706',
                    }}
                  >
                    {fit ?? '-'}
                  </span>
                  <span className="text-[14px] font-bold text-ink-muted">점</span>
                </div>
              </div>
              <div className="text-[11.5px] text-ink-secondary leading-relaxed pb-1">
                {bench.university
                  ? `${bench.university} `
                  : university
                    ? `${university} `
                    : ''}
                {major} 기준
                {bench.sample_size ? ` · 합격자 ${bench.sample_size}명` : ''}
              </div>
            </div>

            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${fit ?? 0}%`,
                  background:
                    (fit ?? 0) >= 80
                      ? '#10B981'
                      : (fit ?? 0) >= 50
                        ? '#2563EB'
                        : '#F59E0B',
                }}
              />
            </div>

            {bench.source && (
              <div className="text-[10.5px] text-ink-muted mt-2">근거: {bench.source}</div>
            )}
          </div>

          {/* 항목별 */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="text-[13px] font-bold text-ink mb-3">항목별로 보기</div>
            <div className="flex flex-col gap-3.5">
              {rows.map((r) => {
                const t = r.target
                const pct = t && t > 0 ? Math.min(100, (r.mine / t) * 100) : null
                const enough = t !== null && r.mine >= t
                return (
                  <div key={r.key}>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[12.5px] font-bold text-ink">{r.label}</span>
                      <span className="text-[10.5px] text-ink-muted">{r.hint}</span>
                      <span className="ml-auto text-[12px] font-bold">
                        <span style={{ color: enough ? '#059669' : '#1a1a1a' }}>
                          {r.mine}
                        </span>
                        <span className="text-ink-muted font-medium">
                          {t !== null ? ` / ${t}${r.unit}` : r.unit}
                        </span>
                      </span>
                    </div>

                    {pct !== null ? (
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: enough ? '#10B981' : '#93C5FD',
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-[10.5px] text-ink-muted">기준 데이터 없음</div>
                    )}

                    {t !== null && !enough && (
                      <div className="text-[11px] text-ink-muted mt-1">
                        {t - r.mine}
                        {r.unit} 더 쌓으면 기준에 닿아요
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {bench.note && (
              <div className="text-[11.5px] text-ink-secondary leading-relaxed mt-4 pt-3 border-t border-line">
                {bench.note}
              </div>
            )}
          </div>

          <div className="text-[10.5px] text-ink-muted mt-3 leading-relaxed">
            개수는 참고일 뿐이에요. 같은 3개여도 얼마나 깊이 파고들었는지가 훨씬 중요해요.
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================

function MyOnly({ rows }: { rows: Row[] }) {
  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="text-[13px] font-bold text-ink mb-3">내가 쌓은 것</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {rows.map((r) => (
          <div key={r.key} className="rounded-xl border border-line px-3.5 py-3">
            <div className="text-[10.5px] text-ink-muted mb-1">{r.label}</div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[22px] font-extrabold text-ink leading-none">
                {r.mine}
              </span>
              <span className="text-[11px] font-bold text-ink-muted">{r.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}