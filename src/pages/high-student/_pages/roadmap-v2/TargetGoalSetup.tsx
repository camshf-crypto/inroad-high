import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState, academyState } from '@/lib/auth/atoms'
import { type CareerSeriesData, type Grade } from '@/pages/high-student/_hooks/useRoadmap'
import {
  useAllUniversities,
  useDepartmentsOfUniversity,
} from '@/pages/high-student/_hooks/useMyHighQuestions'
import { DEPARTMENTS } from '@/pages/high-student/_pages/concept/departments'

const GRADE_TEXT_MAP: Record<Grade, string> = { 1: '고1', 2: '고2', 3: '고3' }

interface Dept {
  name: string
  series: string | null
}

interface PivotResult {
  fromMajor: string | null
  toMajor: string
  fromSeries: string | null
  toSeries: string | null
  kept: string[]      // 계속 이어지는 계통
  added: string[]     // 새로 열린 계통
  dropped: string[]   // 더는 추천되지 않는 계통 (진행한 건 그대로 남음)
}

interface Props {
  career: CareerSeriesData
  /** 목표를 바꾼 시점의 학년 (전환 기록용) */
  myGrade?: Grade
  onDone?: () => void
}

export default function TargetGoalSetup({ career, myGrade = 1, onDone }: Props) {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const qc = useQueryClient()

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined

  const [university, setUniversity] = useState('')
  const [major, setMajor] = useState('')
  const [job, setJob] = useState('')
  const [uniSearch, setUniSearch] = useState('')
  const [deptSearch, setDeptSearch] = useState('')
  const [uniOpen, setUniOpen] = useState(false)
  const [deptOpen, setDeptOpen] = useState(false)
  const [pivot, setPivot] = useState<PivotResult | null>(null)
  const [grade, setGrade] = useState<Grade>(myGrade)

  /** 현재 학년 +1 까지만 열림 (고1 → 고2까지, 고2 → 고3까지) */
  const maxGrade = Math.min(3, myGrade + 1) as Grade

  // 잠긴 학년을 보고 있으면 열린 마지막 학년으로 되돌림
  useEffect(() => {
    if (grade > maxGrade) setGrade(maxGrade)
  }, [grade, maxGrade])

  // 이미 정한 최종 목표 (고3 행)
  const { data: target, isLoading } = useQuery({
    queryKey: ['my-target-goal', studentId, academyId, grade],
    enabled: !!studentId && !!academyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_concept')
        .select('id, university, major, career, custom_goal, status')
        .eq('student_id', studentId!)
        .eq('academy_id', academyId!)
        .eq('grade', GRADE_TEXT_MAP[grade])
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    setUniversity(target?.university ?? '')
    setMajor(target?.major ?? '')
    setJob(target?.career ?? target?.custom_goal ?? '')
    setUniOpen(false)
    setDeptOpen(false)
  }, [target, grade])

  // 기출문제 DB의 대학·학과 목록 (면접 콘텐츠가 있는 조합)
  const { data: universities = [], isLoading: uniLoading } = useAllUniversities()
  const { data: deptList = [], isLoading: deptLoading } = useDepartmentsOfUniversity(university)

  // 계열 매핑용 학과 마스터
  const { data: depts = [] } = useQuery({
    queryKey: ['career-departments'],
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<Dept[]> => {
      const { data, error } = await supabase
        .from('high_career_department')
        .select('name, series')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as Dept[]
    },
  })

  const { data: recoSubjects = [] } = useQuery({
    queryKey: ['pivot-reco-subjects', pivot?.toSeries],
    enabled: !!pivot?.toSeries,
    queryFn: async (): Promise<{ grade: number; subject_name: string }[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_node')
        .select('grade, subject_name')
        .is('student_id', null)
        .contains('recommended_series', [pivot!.toSeries!])
        .order('grade')
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })

  const { data: lines = [] } = useQuery({
    queryKey: ['roadmap-lines-for-pivot'],
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<{ id: string; name: string; kind: string; series: string[] | null }[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_line')
        .select('id, name, kind, series')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })

  const uniFiltered = useMemo(() => {
    const q = uniSearch.trim()
    const list = universities.filter((u) => !!u)
    return q ? list.filter((u) => u.includes(q)) : list
  }, [universities, uniSearch])

  const deptFiltered = useMemo(() => {
    const q = deptSearch.trim()
    const list = deptList.filter((d) => !!d)
    return q ? list.filter((d) => d.includes(q)) : list
  }, [deptList, deptSearch])

  /**
   * 학과명으로 계열 찾기.
   * 기출문제 DB는 '경영대학 경영학'처럼 단과대가 붙어 나오고
   * 학과 마스터는 '경영학과'라서 표기가 안 맞는다.
   * 공백·접미사를 떼고 핵심어로 비교한다.
   */
  const pickedSeries = useMemo(() => {
    if (!major) return null

    const flat = major.replace(/\s/g, '')
    const exact = depts.find((d) => d.name === major)
    if (exact?.series) return exact.series

    const core = (name: string) =>
      name.replace(/\s/g, '').replace(/(학과|학부|전공|대학|과)$/g, '')

    // 핵심어가 긴 것부터 봐야 '경영학'이 '경영정보학'보다 먼저 걸리지 않는다
    const sorted = [...depts]
      .filter((d) => d.series && core(d.name).length >= 2)
      .sort((a, b) => core(b.name).length - core(a.name).length)

    const hit = sorted.find((d) => flat.includes(core(d.name)))
    return hit?.series ?? null
  }, [depts, major])

  /**
   * 고른 학과에 맞는 직업.
   * 기출문제 DB 학과명('경영대학 경영학')과 학과 마스터('경영학과') 표기가 달라서
   * 핵심어로 비교한다.
   */
  const majorJobs = useMemo(() => {
    if (!major) return []
    const flat = major.replace(/\s/g, '')
    const all = DEPARTMENTS.flatMap((d) => d.majors)

    const exact = all.find((m) => m.name === major)
    if (exact) return exact.careers

    const core = (name: string) =>
      name.replace(/\s/g, '').replace(/(학과|학부|전공|대학|과)$/g, '')

    const sorted = [...all]
      .filter((m) => core(m.name).length >= 2)
      .sort((a, b) => core(b.name).length - core(a.name).length)

    return sorted.find((m) => flat.includes(core(m.name)))?.careers ?? []
  }, [major])

  /** 진로 계열 검사에서 나온 직업들 */
  const jobSuggestions = useMemo(() => {
    const set = new Set<string>()
    for (const g of [1, 2, 3] as Grade[]) {
      const c = career.byGrade.get(g)
      if (c?.career) set.add(c.career)
      if (c?.customGoal) set.add(c.customGoal)
    }
    return [...set]
  }, [career])

  const save = useMutation({
    mutationFn: async (): Promise<PivotResult | null> => {
      if (!studentId || !academyId) throw new Error('학생 정보가 없습니다')
      if (!university.trim()) throw new Error('대학을 골라주세요')
      if (!major.trim()) throw new Error('희망 학과를 정해주세요')

      // 비교 대상: 이 학년에 원래 있던 값 → 없으면 직전 학년에 직접 정한 값
      const prevGrade = grade > 1 ? career.byGrade.get((grade - 1) as Grade) : undefined
      const prevFromEarlier = prevGrade?.isOwn ? prevGrade : undefined

      const prevMajor = target?.major ?? prevFromEarlier?.major ?? null
      const prevSeries = target?.major
        ? (depts.find((d) => d.name === target.major)?.series ?? null)
        : (prevFromEarlier?.series ?? null)

      const changed = !!prevMajor && prevMajor !== major.trim()

      const payload = {
        university: university.trim(),
        major: major.trim(),
        career: job.trim() || null,
        status: 'completed',
        updated_at: new Date().toISOString(),
      }

      if (target?.id) {
        const { error } = await supabase
          .from('student_concept')
          .update(payload)
          .eq('id', target.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('student_concept').insert({
          student_id: studentId,
          academy_id: academyId,
          grade: GRADE_TEXT_MAP[grade],
          ...payload,
        })
        if (error) throw error
      }

      if (!changed) return null

      // 계통이 어떻게 갈리는지 계산
      const fits = (l: { series: string[] | null }, sr: string | null) =>
        l.series === null || (!!sr && l.series.includes(sr))

      const before = lines.filter((l) => l.kind === '세특' && fits(l, prevSeries))
      const after = lines.filter((l) => l.kind === '세특' && fits(l, pickedSeries))

      const beforeIds = new Set(before.map((l) => l.id))
      const afterIds = new Set(after.map((l) => l.id))

      const result: PivotResult = {
        fromMajor: prevMajor,
        toMajor: major.trim(),
        fromSeries: prevSeries,
        toSeries: pickedSeries,
        kept: after.filter((l) => beforeIds.has(l.id)).map((l) => l.name),
        added: after.filter((l) => !beforeIds.has(l.id)).map((l) => l.name),
        dropped: before.filter((l) => !afterIds.has(l.id)).map((l) => l.name),
      }

      // 전환 기록 (실패해도 저장 자체는 유지)
      await supabase.from('high_career_pivot').insert({
        student_id: studentId,
        academy_id: academyId,
        changed_at_grade: grade,
        from_major: prevMajor,
        to_major: major.trim(),
        from_series: prevSeries,
        to_series: pickedSeries,
        bridge_note: `${prevMajor} → ${major.trim()}`,
      })

      return result
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['my-target-goal', studentId, academyId] })
      qc.invalidateQueries({ queryKey: ['my-career-series', studentId, academyId] })
      qc.invalidateQueries({ queryKey: ['my-concept-done', studentId, academyId] })
      qc.invalidateQueries({ queryKey: ['high-roadmap-board', studentId] })

      // 진로가 바뀌었으면 승계 안내를 먼저 보여준다
      if (result) setPivot(result)
      else if (grade < maxGrade) setGrade((grade + 1) as Grade)
      else onDone?.()
    },
  })

  if (isLoading) {
    return <div className="text-[13px] text-ink-muted">불러오는 중…</div>
  }

  // ── 진로를 바꾼 직후: 승계 안내 ──────────────────────────
  if (pivot) {
    const past = grade > 1 ? Array.from({ length: grade - 1 }, (_, i) => i + 1) : []
    const ahead = ([1, 2, 3] as Grade[]).filter((g) => g >= grade && g <= maxGrade)

    return (
      <div className="max-w-[680px]">
        <div className="mb-4">
          <div className="text-[16px] font-extrabold text-ink mb-1">
            고{grade} 진로가 바뀌었어요
          </div>
          <div className="flex items-center gap-2 flex-wrap text-[13px]">
            <span className="text-ink-secondary">{pivot.fromMajor}</span>
            <span className="text-ink-muted">→</span>
            <span className="font-bold text-brand-high-dark">{pivot.toMajor}</span>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '이어지는 계통', v: pivot.kept.length, color: '#059669' },
              { label: '새로 열린 계통', v: pivot.added.length, color: '#2563EB' },
              { label: '빠지는 계통', v: pivot.dropped.length, color: '#94A3B8' },
            ].map((x) => (
              <div key={x.label} className="rounded-xl border border-line px-3 py-2.5 text-center">
                <div className="text-[10.5px] text-ink-muted mb-0.5">{x.label}</div>
                <div className="text-[20px] font-extrabold" style={{ color: x.color }}>
                  {x.v}
                </div>
              </div>
            ))}
          </div>

          {pivot.kept.length > 0 && (
            <div>
              <div className="text-[12px] font-bold text-green-800 mb-1.5">
                그대로 이어져요
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pivot.kept.map((n) => (
                  <span
                    key={n}
                    className="text-[11.5px] text-green-800 bg-green-50 border border-green-200 rounded-full px-2.5 py-1"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pivot.added.length > 0 && (
            <div>
              <div className="text-[12px] font-bold text-brand-high-dark mb-1.5">
                새로 열렸어요
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pivot.added.map((n) => (
                  <span
                    key={n}
                    className="text-[11.5px] text-brand-high-dark bg-brand-high-pale border border-brand-high-light rounded-full px-2.5 py-1"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-[12px] font-bold text-amber-900 mb-1">
                고{past.join('·')}에서 한 건 그대로 남아요
              </div>
              <div className="text-[11.5px] text-amber-900 leading-relaxed">
                이미 들은 과목과 탐구는 바꿀 수 없고, 바꿀 필요도 없어요. 그때 한 탐구를 새 진로
                관점에서 이어가면 오히려 "왜 진로가 바뀌었는지"가 설명되는 기록이 돼요.
              </div>
            </div>
          )}

          <div className="rounded-xl border border-brand-high-light bg-brand-high-pale/50 px-4 py-3.5">
            <div className="text-[12px] font-bold text-brand-high-dark mb-0.5">
              {pivot.toSeries ? `${pivot.toSeries}계열` : '새 진로'} 기준 추천 과목
            </div>
            <div className="text-[11px] text-ink-muted mb-2.5">
              앞으로 들을 과목이에요. 학교에 개설된 것 중에서 고르면 돼요.
            </div>

            {recoSubjects.length === 0 ? (
              <div className="text-[12px] text-ink-secondary">
                이 계열은 아직 추천 과목이 등록돼 있지 않아요. 다음 화면에서 직접 골라주세요.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {ahead.map((g) => {
                  const list = recoSubjects.filter((r) => r.grade === g)
                  if (list.length === 0) return null
                  const seen = new Set<string>()
                  const unique = list.filter((r) =>
                    seen.has(r.subject_name) ? false : (seen.add(r.subject_name), true),
                  )
                  return (
                    <div key={g} className="flex gap-2">
                      <div className="flex-shrink-0 w-8 text-[11.5px] font-extrabold text-brand-high-dark pt-1">
                        고{g}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {unique.map((r) => (
                          <span
                            key={r.subject_name}
                            className="text-[11.5px] font-semibold text-brand-high-dark bg-white border border-brand-high-light rounded-lg px-2.5 py-1"
                          >
                            {r.subject_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setPivot(null)
              if (grade < maxGrade) setGrade((grade + 1) as Grade)
              else onDone?.()
            }}
            className="h-12 bg-brand-high text-white rounded-xl text-[14px] font-bold hover:bg-brand-high-dark transition-all"
          >
            과목 다시 고르기 →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[680px]">
      <div className="mb-4">
        <div className="text-[16px] font-extrabold text-ink mb-1">학년별 진로 정하기</div>
        <div className="text-[12px] text-ink-secondary leading-relaxed">
          가고 싶은 대학과 학과, 되고 싶은 직업을 적어주세요.
          <br />
          <span className="text-ink-muted">
            지금 확실하지 않아도 괜찮아요. 언제든 바꿀 수 있고, 바뀌면 로드맵이 이어서 맞춰줘요.
          </span>
        </div>
      </div>

      {/* 학년 탭 */}
      <div className="flex gap-1.5 mb-4">
        {([1, 2, 3] as Grade[]).map((g) => {
          const on = grade === g
          const c = career.byGrade.get(g)
          const filled = !!c?.isOwn
          const locked = g > maxGrade
          return (
            <button
              key={g}
              onClick={() => !locked && setGrade(g)}
              disabled={locked}
              title={locked ? `고${maxGrade} 때 열려요` : undefined}
              className="px-3.5 py-1.5 rounded-full text-[12px] border transition-all flex items-center gap-1.5"
              style={{
                background: on ? '#2563EB' : locked ? '#F8FAFC' : '#fff',
                color: on ? '#fff' : locked ? '#CBD5E1' : '#6B7280',
                borderColor: on ? '#2563EB' : locked ? '#E5E7EB' : filled ? '#A7F3D0' : '#E5E7EB',
                fontWeight: on ? 700 : 500,
                cursor: locked ? 'not-allowed' : 'pointer',
              }}
            >
              고{g}
              {locked && <span className="text-[10px]">🔒</span>}
              {!locked && filled && !on && <span className="text-[10px] text-green-600">✓</span>}
              {g === myGrade && (
                <span
                  className="text-[9px] font-bold px-1.5 rounded-full"
                  style={{
                    background: on ? 'rgba(255,255,255,.25)' : '#FEF3C7',
                    color: on ? '#fff' : '#92400E',
                  }}
                >
                  현재
                </span>
              )}
            </button>
          )
        })}
      </div>

      {maxGrade < 3 && (
        <div className="text-[11px] text-ink-muted mb-4 -mt-2">
          고{maxGrade + 1}은 고{maxGrade}가 되면 열려요. 지금은 고{maxGrade}까지만 정하면 돼요.
        </div>
      )}

      {/* 이전 학년에 정한 것 */}
      {grade > 1 && (() => {
        const prev = career.byGrade.get((grade - 1) as Grade)
        if (!prev?.major) return null
        return (
          <div className="rounded-xl border border-line bg-gray-50 px-4 py-3 mb-4">
            <div className="text-[11px] font-bold text-ink-secondary mb-1">
              고{grade - 1}에 정한 진로
            </div>
            <div className="text-[13px] text-ink">
              {[prev.series ? `${prev.series}계열` : null, prev.major, prev.career]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <div className="text-[11px] text-ink-muted mt-1.5 leading-relaxed">
              그대로 이어가려면 같은 학과를 고르면 되고, 바뀌었으면 새로 골라주세요. 고{grade - 1}에 한
              활동은 그대로 남아요.
            </div>
          </div>
        )
      })()}

      <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-5">
        {/* 대학 */}
        <div>
          <label className="text-[12px] font-bold text-ink-secondary block mb-1.5">
            가고 싶은 대학 <span className="text-red-500">*</span>
          </label>

          <button
            onClick={() => setUniOpen(!uniOpen)}
            className="w-full h-11 border rounded-lg px-3.5 text-left flex items-center justify-between gap-2 transition-all"
            style={{
              borderColor: university ? '#93C5FD' : '#E5E7EB',
              background: university ? '#EFF6FF' : '#fff',
            }}
          >
            <span
              className="text-[13.5px] truncate"
              style={{
                color: university ? '#1E3A8A' : '#94A3B8',
                fontWeight: university ? 700 : 400,
              }}
            >
              {university || '대학을 골라주세요'}
            </span>
            <span className="text-[11px] text-ink-muted flex-shrink-0">
              {uniOpen ? '접기 ▲' : university ? '바꾸기 ▼' : '펼치기 ▼'}
            </span>
          </button>

          {uniOpen && (
            <div className="mt-2">
              {uniLoading ? (
                <div className="text-[12px] text-ink-muted py-3">대학 목록 불러오는 중…</div>
              ) : (
                <>
                  <input
                    value={uniSearch}
                    onChange={(e) => setUniSearch(e.target.value)}
                    placeholder="대학 이름 검색 (예: 서울)"
                    autoFocus
                    className="w-full h-10 border border-line rounded-lg px-3.5 text-[13px] outline-none focus:border-brand-high mb-1.5"
                  />
                  <div className="text-[10.5px] text-ink-muted mb-1.5">
                    {uniFiltered.length}개
                  </div>
                  <div className="max-h-[200px] overflow-y-auto border border-line rounded-lg divide-y divide-slate-100">
                    {uniFiltered.length === 0 ? (
                      <div className="px-3.5 py-4 text-[12px] text-ink-muted text-center">
                        검색 결과가 없어요
                      </div>
                    ) : (
                      uniFiltered.map((u) => (
                        <button
                          key={u}
                          onClick={() => {
                            setUniversity(u)
                            setMajor('')
                            setDeptSearch('')
                            setUniOpen(false)
                            setDeptOpen(true)
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-[13px] hover:bg-brand-high-pale/50 transition-colors"
                          style={{
                            color: u === university ? '#1E3A8A' : '#1a1a1a',
                            fontWeight: u === university ? 700 : 400,
                          }}
                        >
                          {u}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 학과 */}
        <div>
          <label className="text-[12px] font-bold text-ink-secondary block mb-1.5">
            희망 학과 <span className="text-red-500">*</span>
          </label>

          <button
            onClick={() => university && setDeptOpen(!deptOpen)}
            disabled={!university}
            className="w-full h-11 border rounded-lg px-3.5 text-left flex items-center justify-between gap-2 transition-all disabled:bg-gray-50"
            style={{
              borderColor: major ? '#93C5FD' : '#E5E7EB',
              background: major ? '#EFF6FF' : undefined,
            }}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="text-[13.5px] truncate"
                style={{
                  color: major ? '#1E3A8A' : '#94A3B8',
                  fontWeight: major ? 700 : 400,
                }}
              >
                {!university ? '대학을 먼저 골라주세요' : major || '학과를 골라주세요'}
              </span>
              {pickedSeries && (
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full flex-shrink-0">
                  {pickedSeries}계열
                </span>
              )}
            </span>
            {university && (
              <span className="text-[11px] text-ink-muted flex-shrink-0">
                {deptOpen ? '접기 ▲' : major ? '바꾸기 ▼' : '펼치기 ▼'}
              </span>
            )}
          </button>

          {deptOpen && university && (
            <div className="mt-2">
              {deptLoading ? (
                <div className="text-[12px] text-ink-muted py-3">학과 목록 불러오는 중…</div>
              ) : (
                <>
                  <input
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    placeholder="학과 이름 검색"
                    autoFocus
                    className="w-full h-10 border border-line rounded-lg px-3.5 text-[13px] outline-none focus:border-brand-high mb-1.5"
                  />
                  <div className="text-[10.5px] text-ink-muted mb-1.5">
                    {university} · {deptFiltered.length}개
                  </div>
                  <div className="max-h-[200px] overflow-y-auto border border-line rounded-lg divide-y divide-slate-100">
                    {deptFiltered.length === 0 ? (
                      <div className="px-3.5 py-4 text-[12px] text-ink-muted text-center">
                        이 대학은 등록된 학과가 없어요. 다른 대학을 골라보세요.
                      </div>
                    ) : (
                      deptFiltered.map((d) => (
                        <button
                          key={d}
                          onClick={() => { setMajor(d); setDeptOpen(false) }}
                          className="w-full text-left px-3.5 py-2.5 text-[13px] hover:bg-brand-high-pale/50 transition-colors"
                          style={{
                            color: d === major ? '#1E3A8A' : '#1a1a1a',
                            fontWeight: d === major ? 700 : 400,
                          }}
                        >
                          {d}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 직업군 */}
        <div>
          <label className="text-[12px] font-bold text-ink-secondary block mb-1.5">
            되고 싶은 직업 <span className="text-ink-muted font-medium">(미정이면 비워도 돼요)</span>
          </label>

          {majorJobs.length > 0 && (
            <>
              <div className="text-[10.5px] text-ink-muted mb-1.5">
                {major}에서 이어지는 직업
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {majorJobs.map((j) => {
                  const on = job === j
                  return (
                    <button
                      key={j}
                      onClick={() => setJob(on ? '' : j)}
                      className="rounded-lg border px-3 py-1.5 text-[12.5px] transition-all"
                      style={{
                        borderColor: on ? '#2563EB' : '#E5E7EB',
                        background: on ? '#EFF6FF' : '#fff',
                        color: on ? '#1E3A8A' : '#475569',
                        fontWeight: on ? 700 : 500,
                      }}
                    >
                      {on ? '✓ ' : ''}
                      {j}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {jobSuggestions.filter((j) => !majorJobs.includes(j)).length > 0 && (
            <>
              <div className="text-[10.5px] text-ink-muted mb-1.5">
                진로 계열 검사에서 정한 직업
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {jobSuggestions
                  .filter((j) => !majorJobs.includes(j))
                  .map((j) => {
                    const on = job === j
                    return (
                      <button
                        key={j}
                        onClick={() => setJob(on ? '' : j)}
                        className="rounded-lg border px-3 py-1.5 text-[12.5px] transition-all"
                        style={{
                          borderColor: on ? '#2563EB' : '#E5E7EB',
                          background: on ? '#EFF6FF' : '#fff',
                          color: on ? '#1E3A8A' : '#94A3B8',
                          fontWeight: on ? 700 : 500,
                        }}
                      >
                        {on ? '✓ ' : ''}
                        {j}
                      </button>
                    )
                  })}
              </div>
            </>
          )}

          <div className="text-[10.5px] text-ink-muted mb-1.5">또는 직접 입력</div>

          <input
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="예: 약사, 연구원, 개발자"
            className="w-full h-11 border border-line rounded-lg px-3.5 text-[13.5px] outline-none focus:border-brand-high"
          />
        </div>

        {!pickedSeries && major && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11.5px] text-amber-900 leading-relaxed">
            직접 넣은 학과라 계열이 자동으로 안 잡혀요. 로드맵에서 계통이 적게 보이면 목록에 있는
            학과로 골라주세요.
          </div>
        )}

        <button
          onClick={() => save.mutate()}
          disabled={!university.trim() || !major.trim() || save.isPending}
          className="h-12 bg-brand-high text-white rounded-xl text-[14px] font-bold hover:bg-brand-high-dark transition-all disabled:opacity-40"
        >
          {save.isPending
            ? '저장 중…'
            : !university.trim()
              ? '대학을 골라주세요'
              : !major.trim()
                ? '희망 학과를 정해주세요'
                : grade < maxGrade
                  ? `고${grade} 저장하고 고${grade + 1} 정하기 →`
                  : '저장하고 다음 →'}
        </button>

        {save.isError && (
          <div className="text-[12px] text-red-600">
            저장하지 못했어요: {(save.error as Error).message}
          </div>
        )}
      </div>
    </div>
  )
}