import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const THEME = {
  accent: '#10B981',
  accentDark: '#065F46',
  accentBg: '#ECFDF5',
  accentBorder: '#6EE7B7',
  accentShadow: 'rgba(16, 185, 129, 0.15)',
}

/** 관심 방향 5개 */
export const DIRS: Record<string, { label: string; color: string; pale: string }> = {
  people: { label: '사람 · 소통', color: '#059669', pale: '#ECFDF5' },
  nature: { label: '자연 · 생명', color: '#0891B2', pale: '#ECFEFF' },
  tech:   { label: '기술 · 도구', color: '#D97706', pale: '#FFFBEB' },
  data:   { label: '자료 · 논리', color: '#2563EB', pale: '#EFF6FF' },
  make:   { label: '표현 · 창작', color: '#7C3AED', pale: '#F5F3FF' },
}

interface DeptRow {
  id: string
  field: string
  field_icon: string | null
  name: string
  description: string | null
  directions: string[] | null
}

interface JobRow {
  id: string
  department_id: string
  name: string
  description: string | null
  directions: string[] | null
  display_order: number
}

interface Props {
  /** 학생 누적 방향 — 많이 한 순서. 예: ['data','people'] */
  myDirs: string[]
  /** 방향별 횟수 */
  dirCounts: Record<string, number>
  /** 데이터가 아직 없을 때 */
  ready: boolean
}

export default function JinroResult({ myDirs, dirCounts, ready }: Props) {

  const { data: depts = [], isLoading: dl } = useQuery({
    queryKey: ['career-depts'],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<DeptRow[]> => {
      const { data, error } = await supabase
        .from('middle_career_department')
        .select('id, field, field_icon, name, description, directions')
        .eq('is_active', true)
      if (error) throw error
      return (data ?? []) as DeptRow[]
    },
  })

  const { data: jobs = [], isLoading: jl } = useQuery({
    queryKey: ['career-jobs'],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<JobRow[]> => {
      const { data, error } = await supabase
        .from('middle_career_job')
        .select('id, department_id, name, description, directions, display_order')
        .eq('is_active', true)
      if (error) throw error
      return (data ?? []) as JobRow[]
    },
  })

  /** 학과 점수 — 내 방향과 얼마나 맞나 */
  const ranked = useMemo(() => {
    if (!myDirs.length || !depts.length) return []

    const score = (dirs: string[] | null) => {
      if (!dirs?.length) return 0
      let s = 0
      dirs.forEach((d, i) => {
        const rank = myDirs.indexOf(d)
        if (rank === -1) return
        // 내 1순위 방향이면 3점, 2순위면 2점 / 학과의 주 방향이면 가중
        const base = rank === 0 ? 3 : rank === 1 ? 2 : 1
        s += i === 0 ? base * 1.5 : base
      })
      return s
    }

    const jobsByDept = new Map<string, JobRow[]>()
    for (const j of jobs) {
      const arr = jobsByDept.get(j.department_id) ?? []
      arr.push(j)
      jobsByDept.set(j.department_id, arr)
    }

    return depts
      .map(d => ({ dept: d, score: score(d.directions) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ dept, score }) => {
        // 직업도 내 방향에 맞게 정렬
        const list = (jobsByDept.get(dept.id) ?? []).slice().sort((a, b) => {
          const ja = a.directions?.[0] ? myDirs.indexOf(a.directions[0]) : 9
          const jb = b.directions?.[0] ? myDirs.indexOf(b.directions[0]) : 9
          const na = ja === -1 ? 9 : ja
          const nb = jb === -1 ? 9 : jb
          return na - nb || a.display_order - b.display_order
        })
        return { dept, score, jobs: list }
      })
  }, [depts, jobs, myDirs])

  if (!ready) {
    return (
      <div className="bg-white border border-line rounded-2xl p-12 text-center">
        <div className="text-[14px] font-bold text-ink mb-1">아직 준비 중이에요</div>
        <div className="text-[12px] text-ink-secondary leading-relaxed">
          워크북을 하면서 내가 한 행동이 쌓이면<br />
          나에게 맞는 학과군 3개와 직업이 나와요.
        </div>
      </div>
    )
  }

  if (dl || jl) {
    return (
      <div className="bg-white border border-line rounded-2xl p-10 text-center">
        <div
          className="inline-block w-6 h-6 border-2 border-gray-200 rounded-full animate-spin mb-3"
          style={{ borderTopColor: THEME.accent }}
        />
        <div className="text-[13px] text-ink-secondary font-medium">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* 요약 */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <div className="text-[14px] font-bold text-ink mb-1">4년 동안 쌓인 것</div>
        <div className="text-[11px] text-ink-secondary mb-4">
          하나로 정하지 않아요. 순위가 있는 후보로 남겨서 나중에 바꿀 수 있게 해요.
        </div>
        <div className="flex gap-2 flex-wrap">
          {myDirs.map((d, i) => {
            const D = DIRS[d]
            if (!D) return null
            return (
              <div
                key={d}
                className="rounded-xl px-3.5 py-2"
                style={{ background: D.pale, border: `1px solid ${D.color}33` }}
              >
                <div className="text-[10px] font-bold" style={{ color: D.color }}>
                  {i + 1}순위 방향
                </div>
                <div className="text-[13px] font-extrabold" style={{ color: D.color }}>
                  {D.label}
                  <span className="ml-1.5 text-[11px] font-bold opacity-70">
                    {dirCounts[d] ?? 0}회
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 학과군 3개 */}
      {ranked.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-10 text-center text-[12px] text-ink-secondary">
          아직 맞는 학과를 찾지 못했어요. 활동을 더 해보면 나와요.
        </div>
      ) : (
        ranked.map(({ dept, jobs: list }, i) => {
          const top = i === 0
          return (
            <div
              key={dept.id}
              className="rounded-2xl p-5"
              style={{
                background: top ? THEME.accentBg : '#fff',
                border: `1px solid ${top ? THEME.accent : '#E5E7EB'}`,
                boxShadow: top ? `0 4px 16px ${THEME.accentShadow}` : 'none',
              }}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: '#fff',
                    color: top ? THEME.accentDark : '#6B7280',
                    border: `1px solid ${top ? THEME.accentBorder : '#E5E7EB'}`,
                  }}
                >
                  {i + 1}순위
                </span>
                <span className="text-[16px] font-extrabold text-ink">{dept.name}</span>
                <span className="text-[11px] text-ink-muted">{dept.field}</span>
              </div>

              <div className="flex gap-1.5 flex-wrap mb-3">
                {(dept.directions ?? []).map(d => {
                  const D = DIRS[d]
                  if (!D) return null
                  return (
                    <span
                      key={d}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: D.pale, color: D.color }}
                    >
                      {D.label}
                    </span>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 max-md:grid-cols-1 gap-2">
                {list.map(j => {
                  const first = j.directions?.[0]
                  const D = first ? DIRS[first] : null
                  return (
                    <div
                      key={j.id}
                      className="rounded-xl px-3.5 py-3 bg-white"
                      style={{ border: '1px solid #E5E7EB' }}
                    >
                      <div className="text-[13px] font-extrabold text-ink">{j.name}</div>
                      {j.description && (
                        <div className="text-[11px] text-ink-secondary leading-[1.55] mt-1">
                          {j.description}
                        </div>
                      )}
                      {D && (
                        <div className="text-[10px] font-bold mt-2" style={{ color: D.color }}>
                          내 방향 · {D.label}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {/* 고등 연결 */}
      <div
        className="rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap"
        style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
      >
        <div>
          <div className="text-[13px] font-bold" style={{ color: '#1E3A8A' }}>
            고등 입시 로드맵으로 이어져요
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: '#3B82F6' }}>
            1순위로 시작하고, 2·3순위는 대안으로 남아요. 고2에 바꿔도 근거가 따라갑니다.
          </div>
        </div>
      </div>
    </div>
  )
}