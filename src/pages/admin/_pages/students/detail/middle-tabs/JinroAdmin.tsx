import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const THEME = {
  accent: '#10B981',
  accentDark: '#065F46',
  accentBg: '#ECFDF5',
  accentBorder: '#6EE7B7',
  accentShadow: 'rgba(16, 185, 129, 0.15)',
}

const DIR_LABEL: Record<string, string> = {
  people: '사람 · 소통',
  nature: '자연 · 생명',
  tech: '기술 · 도구',
  data: '자료 · 논리',
  make: '표현 · 창작',
}

interface TallyRow {
  mission_key: string
  grade: string
  month: number
  week: number
  verbs: string[] | null
  dirs: string[] | null
  keywords: { keyword: string; field: string }[] | null
  created_at: string
}

interface GroupRow {
  grade: string
  semester: number
  field_code: string
  items: string[]
  item_count: number
}

interface RecJob {
  name: string
  description: string | null
  dirs: string[] | null
}

interface RecDept {
  department_id: string
  name: string
  series: string
  score: number
  fields: string[]
  dirs: string[]
  jobs: RecJob[]
}

interface FieldRow {
  code: string
  name: string
  hint: string | null
  series: string[]
}

/** 월 1~4 = 1학기, 5~8 = 2학기 */
const toSemester = (month: number) => (month <= 4 ? 1 : 2)

/** profiles.grade('중3') ↔ 워크북 집계 grade('중3특목' / '중3일반') */
const gradeKeys = (grade: string) =>
  grade.startsWith('중3') ? ['중3', '중3특목', '중3일반'] : [grade]

/** 분야로 묶으려면 한 학기에 키워드가 이만큼은 있어야 한다 */
const MIN_KEYWORDS = 3

/* ================================================================
 * 1. 분야 목록 — 여러 곳에서 공용
 * ============================================================== */
function useFields() {
  return useQuery({
    queryKey: ['interest-fields'],
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<FieldRow[]> => {
      const { data, error } = await supabase
        .from('middle_interest_field')
        .select('code, name, hint, series')
        .eq('is_active', true)
        .order('display_order')
      if (error) throw error
      return (data ?? []) as FieldRow[]
    },
  })
}

/* ================================================================
 * 2. 학기 정리 — 한 학생
 * ============================================================== */
async function groupOneStudent(
  studentId: string,
  grade: string,
  semester: number,
  fields: FieldRow[],
): Promise<'done' | 'skip' | 'error'> {
  const months = semester === 1 ? [1, 2, 3, 4] : [5, 6, 7, 8]

  const { data: rows, error } = await supabase
    .from('jinro_tally')
    .select('keywords')
    .eq('student_id', studentId)
    .in('grade', gradeKeys(grade))
    .in('month', months)
  if (error) return 'error'

  const keywords = (rows ?? [])
    .flatMap(r => (r.keywords ?? []) as { keyword: string }[])
    .map(k => k?.keyword)
    .filter(Boolean)

  if (keywords.length < MIN_KEYWORDS) return 'skip'

  const { data, error: fnErr } = await supabase.functions.invoke('jinro-semester-group', {
    body: { keywords, fields },
  })
  if (fnErr || data?.error) return 'error'

  const groups = (data?.groups ?? []) as { field: string; items: string[] }[]
  if (!groups.length) return 'skip'

  // 기존 것 지우고 새로 넣는다 (다시 돌릴 수 있게)
  await supabase
    .from('jinro_semester_group')
    .delete()
    .eq('student_id', studentId)
    .eq('grade', grade)
    .eq('semester', semester)

  const { error: insErr } = await supabase.from('jinro_semester_group').insert(
    groups.map(g => ({
      student_id: studentId,
      grade,
      semester,
      field_code: g.field,
      items: g.items,
      item_count: g.items.length,
    })),
  )
  return insErr ? 'error' : 'done'
}

/* ================================================================
 * 3. 반 전체 정리 버튼
 * ============================================================== */
export function JinroBulkButton({
  students, grade, semester,
}: {
  students: { id: string; name: string }[]
  grade: string
  semester: number
}) {
  const qc = useQueryClient()
  const { data: fields = [] } = useFields()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<string>('')

  const run = async () => {
    if (!students.length || !fields.length) return
    if (!confirm(`${grade} ${semester}학기 활동을 정리할까요?\n학생 ${students.length}명 · 몇 분 걸릴 수 있어요.`)) return

    setRunning(true)
    setResult('')
    let done = 0, skip = 0, err = 0

    for (let i = 0; i < students.length; i++) {
      const r = await groupOneStudent(students[i].id, grade, semester, fields)
      if (r === 'done') done++
      else if (r === 'skip') skip++
      else err++
      setProgress(i + 1)
    }

    setRunning(false)
    setProgress(0)
    setResult(`${done}명 정리 완료 · ${skip}명 건너뜀(활동 부족) · ${err}명 실패`)
    qc.invalidateQueries({ queryKey: ['jinro-group'] })
    qc.invalidateQueries({ queryKey: ['jinro-recommend'] })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={run}
        disabled={running || !students.length}
        className="h-9 px-4 rounded-lg text-[12px] font-bold text-white disabled:opacity-50"
        style={{ background: THEME.accentDark }}
      >
        {running ? `정리하는 중… ${progress} / ${students.length}` : `${semester}학기 활동 정리하기`}
      </button>
      {result && (
        <span className="text-[11px] font-bold" style={{ color: THEME.accentDark }}>{result}</span>
      )}
    </div>
  )
}

/* ================================================================
 * 4. 학생 한 명 — 진로 지도 + 상담 자료
 * ============================================================== */
export function JinroStudentPanel({
  studentId, studentName, grade,
}: {
  studentId: string
  studentName: string
  grade: string
}) {
  const qc = useQueryClient()
  const { data: fields = [] } = useFields()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const { data: tally = [], isLoading: tl } = useQuery({
    queryKey: ['jinro-tally', studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<TallyRow[]> => {
      const { data, error } = await supabase
        .from('jinro_tally')
        .select('mission_key, grade, month, week, verbs, dirs, keywords, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as TallyRow[]
    },
  })

  const { data: groups = [], isLoading: gl } = useQuery({
    queryKey: ['jinro-group', studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<GroupRow[]> => {
      const { data, error } = await supabase
        .from('jinro_semester_group')
        .select('grade, semester, field_code, items, item_count')
        .eq('student_id', studentId)
      if (error) throw error
      return (data ?? []) as GroupRow[]
    },
  })

  /** 학과군은 중3(선택 단계)부터 — 중1 발견·중2 탐색 단계에서는 보여주지 않는다 */
  const showDept = grade.startsWith('중3')

  const { data: recs = [], isLoading: rl } = useQuery({
    queryKey: ['jinro-recommend', studentId],
    enabled: !!studentId && showDept,
    queryFn: async (): Promise<RecDept[]> => {
      const { data, error } = await supabase.rpc('jinro_recommend', { p_student_id: studentId, p_limit: 3 })
      if (error) throw error
      return (data ?? []) as RecDept[]
    },
  })

  const fieldName = (code: string) =>
    fields.find(f => f.code === code)?.name ?? code

  /** 방향 누적 */
  const dirCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const t of tally) for (const d of t.dirs ?? []) m[d] = (m[d] ?? 0) + 1
    return m
  }, [tally])

  const topDirs = useMemo(
    () => Object.entries(dirCounts).sort((a, b) => b[1] - a[1]),
    [dirCounts],
  )

  /** 분야 누적 — 학기 묶음을 합친다 */
  const fieldTotals = useMemo(() => {
    const m: Record<string, { count: number; sems: string[] }> = {}
    for (const g of groups) {
      const e = (m[g.field_code] ??= { count: 0, sems: [] })
      e.count += g.item_count
      e.sems.push(`${g.grade.replace('중', '')}-${g.semester}`)
    }
    return Object.entries(m).sort((a, b) => b[1].count - a[1].count)
  }, [groups])

  /** 아직 안 묶인 이번 학기 키워드 */
  const loose = useMemo(() => {
    const grouped = new Set(groups.flatMap(g => g.items))
    return tally
      .flatMap(t => (t.keywords ?? []).map(k => k.keyword))
      .filter(k => k && !grouped.has(k))
  }, [tally, groups])

  /** 최근 순 키워드 */
  const recent = useMemo(
    () => tally.flatMap(t => (t.keywords ?? []).map(k => k.keyword)).filter(Boolean),
    [tally],
  )

  /** 학기별 변화 */
  const bySemester = useMemo(() => {
    const m = new Map<string, Record<string, number>>()
    for (const g of groups) {
      const key = `${g.grade} ${g.semester}학기`
      const e = m.get(key) ?? {}
      e[g.field_code] = g.item_count
      m.set(key, e)
    }
    return [...m.entries()].sort()
  }, [groups])

  /** 지금 학년에서 가장 최근에 제출한 워크북의 학기 = 정리할 학기 */
  const cur = useMemo(() => {
    const keys = gradeKeys(grade)
    const mine = tally.filter(t => keys.includes(t.grade))
    if (!mine.length) return null
    const latest = mine[0] // created_at 내림차순
    const sem = toSemester(latest.month)
    const kwCount = mine
      .filter(t => toSemester(t.month) === sem)
      .reduce((n, t) => n + (t.keywords?.length ?? 0), 0)
    const alreadyGrouped = groups.some(g => keys.includes(g.grade) && g.semester === sem)
    return { sem, kwCount, alreadyGrouped }
  }, [tally, groups, grade])

  const runOne = async () => {
    if (!fields.length || !cur) return
    setBusy(true)
    setMsg('')
    const r = await groupOneStudent(studentId, grade, cur.sem, fields)
    setBusy(false)
    setMsg(
      r === 'done' ? `${cur.sem}학기 분야를 묶었어요` :
      r === 'skip' ? `키워드가 ${MIN_KEYWORDS}개 이상 모이면 묶을 수 있어요` :
      '실패했어요',
    )
    qc.invalidateQueries({ queryKey: ['jinro-group', studentId] })
    qc.invalidateQueries({ queryKey: ['jinro-recommend', studentId] })
  }

  if (tl || gl || (showDept && rl)) {
    return (
      <div className="bg-white border border-line rounded-2xl p-10 text-center">
        <div
          className="inline-block w-5 h-5 border-2 border-gray-200 rounded-full animate-spin mb-2"
          style={{ borderTopColor: THEME.accent }}
        />
        <div className="text-[12px] text-ink-secondary font-medium">불러오는 중...</div>
      </div>
    )
  }

  const empty = tally.length === 0

  return (
    <div className="flex flex-col gap-3">

      {/* 헤더 */}
      <div className="bg-white border border-line rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[14px] font-bold text-ink tracking-tight">
            {studentName} · 진로 데이터
          </div>
          <div className="text-[11px] text-ink-secondary mt-0.5">
            활동 {tally.length}건 · 묶인 분야 {fieldTotals.length}개 · 안 묶인 것 {loose.length}개
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {msg ? (
            <span className="text-[11px] font-bold" style={{ color: THEME.accentDark }}>{msg}</span>
          ) : cur && cur.kwCount < MIN_KEYWORDS ? (
            <span className="text-[11px] font-semibold text-ink-muted">
              {grade} {cur.sem}학기 키워드 {cur.kwCount} / {MIN_KEYWORDS} · 모이면 분야로 묶을 수 있어요
            </span>
          ) : null}
          {cur && (
            <button
              onClick={runOne}
              disabled={busy || cur.kwCount < MIN_KEYWORDS}
              className="h-9 px-4 rounded-lg text-[12px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: THEME.accent }}
            >
              {busy
                ? '묶는 중…'
                : `${cur.sem}학기 분야 ${cur.alreadyGrouped ? '다시 묶기' : '묶기'}`}
            </button>
          )}
        </div>
      </div>

      {empty ? (
        <div className="bg-white border border-line rounded-2xl p-12 text-center">
          <div className="text-[13px] font-bold text-ink mb-1">아직 활동 기록이 없어요</div>
          <div className="text-[11.5px] text-ink-secondary">
            학생이 워크북을 제출하면 여기에 쌓입니다.
          </div>
        </div>
      ) : (
        <>
          {/* 가까운 학과군 — 중3부터 */}
          {showDept && (
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="text-[13px] font-bold text-ink mb-1">가까운 학과군</div>
            <div className="text-[11px] text-ink-secondary mb-3">
              {fieldTotals.length > 0
                ? '관심 분야(중3×3 · 중2×2 · 중1×1)와 일하는 방식으로 계산했어요.'
                : '학기 정리를 하면 관심 분야를 바탕으로 학과군이 나와요.'}
            </div>

            {recs.length === 0 ? (
              <div className="text-[12px] text-ink-secondary py-4">
                계산할 활동이 아직 부족해요.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recs.map((r, i) => (
                  <div
                    key={r.department_id}
                    className="rounded-xl p-4"
                    style={{
                      background: i === 0 ? THEME.accentBg : '#F8FAFC',
                      border: `1px solid ${i === 0 ? THEME.accentBorder : '#E5E7EB'}`,
                    }}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0"
                        style={{ background: i === 0 ? THEME.accent : '#94A3B8' }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[14px] font-extrabold text-ink">{r.name}</span>
                      <span className="text-[11px] font-semibold text-ink-muted">{r.series}</span>
                      <span className="ml-auto text-[11px] font-bold" style={{ color: THEME.accentDark }}>
                        {r.score}점
                      </span>
                    </div>

                    <div className="text-[11px] text-ink-secondary mb-2 leading-relaxed">
                      근거 ·{' '}
                      {r.fields.length > 0 && <>분야 <b className="text-ink">{r.fields.join(', ')}</b></>}
                      {r.fields.length > 0 && r.dirs.length > 0 && ' / '}
                      {r.dirs.length > 0 && <>방식 <b className="text-ink">{r.dirs.map(d => DIR_LABEL[d] ?? d).join(', ')}</b></>}
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      {r.jobs.map(j => (
                        <span
                          key={j.name}
                          title={j.description ?? ''}
                          className="text-[11.5px] font-semibold px-2.5 py-1 rounded-lg bg-white"
                          style={{ border: '1px solid #E5E7EB', color: '#334155' }}
                        >
                          {j.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* 관심 분야 */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="text-[13px] font-bold text-ink mb-1">관심 분야</div>
            <div className="text-[11px] text-ink-secondary mb-3">
              학기가 끝날 때 묶인 결과예요. 옆 숫자는 활동 수입니다.
            </div>

            {fieldTotals.length === 0 ? (
              <div className="text-[12px] text-ink-secondary py-4">
                아직 묶인 분야가 없어요. 위에서 학기 정리를 돌려주세요.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {fieldTotals.map(([code, e], i) => {
                  const max = fieldTotals[0][1].count || 1
                  return (
                    <div key={code} className="flex items-center gap-3">
                      <span
                        className="text-[12.5px] font-bold flex-shrink-0"
                        style={{ width: 104, color: i === 0 ? THEME.accentDark : '#475569' }}
                      >
                        {fieldName(code)}
                      </span>
                      <span className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <span
                          className="block h-2 rounded-full"
                          style={{
                            width: `${(e.count / max) * 100}%`,
                            background: i === 0 ? THEME.accent : '#9FD6C6',
                          }}
                        />
                      </span>
                      <span className="text-[11.5px] font-bold text-ink-secondary w-9 text-right flex-shrink-0">
                        {e.count}
                      </span>
                      <span className="text-[10px] text-ink-muted flex-shrink-0" style={{ width: 88 }}>
                        {e.sems.join(' · ')}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 일하는 방식 */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="text-[13px] font-bold text-ink mb-1">일하는 방식</div>
            <div className="text-[11px] text-ink-secondary mb-3">
              같은 분야여도 이게 다르면 직업이 달라집니다.
            </div>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(DIR_LABEL).map(d => {
                const n = dirCounts[d] ?? 0
                const rank = topDirs.findIndex(([k]) => k === d)
                return (
                  <span
                    key={d}
                    className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg"
                    style={{
                      background: rank === 0 ? THEME.accent : rank === 1 ? '#9FD6C6' : n > 0 ? '#D6F2E6' : '#F8FAFC',
                      color: rank === 0 ? '#fff' : n > 0 ? '#04342C' : '#B6BCC4',
                      border: n > 0 ? 'none' : '1px solid #E5E7EB',
                    }}
                  >
                    {DIR_LABEL[d]} {n}
                  </span>
                )
              })}
            </div>
          </div>

          {/* 학기별 변화 */}
          {bySemester.length > 0 && (
            <div className="bg-white border border-line rounded-2xl p-5">
              <div className="text-[13px] font-bold text-ink mb-1">학기별 변화</div>
              <div className="text-[11px] text-ink-secondary mb-3">
                상담에서 쓰기 좋은 자료예요.
              </div>
              <div className="flex flex-col gap-2">
                {bySemester.map(([sem, obj]) => (
                  <div key={sem} className="flex items-start gap-3 flex-wrap">
                    <span className="text-[12px] font-bold text-ink-secondary flex-shrink-0" style={{ width: 84 }}>
                      {sem}
                    </span>
                    <div className="flex gap-1.5 flex-wrap flex-1">
                      {Object.entries(obj)
                        .sort((a, b) => b[1] - a[1])
                        .map(([code, n]) => (
                          <span
                            key={code}
                            className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: THEME.accentBg, color: THEME.accentDark }}
                          >
                            {fieldName(code)} {n}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 학생이 쓴 말 */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
              <div className="text-[13px] font-bold text-ink">학생이 쓴 활동</div>
              <span className="text-[11px] text-ink-muted">최근 순 · {recent.length}개</span>
            </div>
            <div className="text-[11px] text-ink-secondary mb-3">
              워크북 답안에서 뽑은 말입니다. 상담에서 그대로 인용할 수 있어요.
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {recent.slice(0, 40).map((k, i) => (
                <span
                  key={k + i}
                  className="text-[11.5px] px-2.5 py-1 rounded-lg"
                  style={{
                    background: i < 5 ? THEME.accentBg : '#F8FAFC',
                    color: i < 5 ? THEME.accentDark : '#64748B',
                    border: `1px solid ${i < 5 ? THEME.accentBorder : '#E5E7EB'}`,
                    fontWeight: i < 5 ? 700 : 500,
                  }}
                >
                  {k}
                </span>
              ))}
              {recent.length > 40 && (
                <span className="text-[11px] text-ink-muted px-2 py-1">외 {recent.length - 40}개</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}