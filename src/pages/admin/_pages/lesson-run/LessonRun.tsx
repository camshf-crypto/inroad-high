import { useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { academyState } from '@/lib/auth/atoms'
import { MIDDLE_ROADMAP, type MiddleGradeKey } from '@/constants/middleRoadmap'
import { ROADMAP, type GradeKey } from '@/constants/roadmap'

const THEMES = {
  middle: {
    accent: '#10B981',
    accentDark: '#065F46',
    accentBg: '#ECFDF5',
    accentBorder: '#6EE7B7',
    accentShadow: 'rgba(16,185,129,.15)',
  },
  high: {
    accent: '#2563EB',
    accentDark: '#1E3A8A',
    accentBg: '#EFF6FF',
    accentBorder: '#93C5FD',
    accentShadow: 'rgba(37,99,235,.15)',
  },
} as const

type Level = 'middle' | 'high'

const GRADES_BY_LEVEL: Record<Level, string[]> = {
  middle: ['중1', '중2', '중3'],
  high: ['고1', '고2', '고3'],
}

interface Step {
  id: string
  title: string
  minutes?: number
  intent?: string
  script?: string
  coaching?: string
  questions?: string[]
  weakResponses?: string[]
  avoid?: string[]
  good?: string[]
  bad?: string[]
  watch?: string[]
  cases?: { when: string; say: string }[]
  recordIds?: string[]
}

interface RecordDef {
  id: string
  label: string
  type: 'score5' | 'choice'
  options?: string[]
}

interface Guide {
  purpose?: string
  outputs?: string[]
  principles?: string[]
  opening?: {
    minutes?: number
    script?: string
    prereq?: { key: string; label: string; fallback?: string }[]
  }
  steps?: Step[]
  closing?: {
    saveItems?: string[]
    checklist?: string[]
    nextMonth?: string
    notes?: { id: string; label: string }[]
  }
  records?: RecordDef[]
}

interface Student {
  id: string
  name: string
  grade: string
}

export default function LessonRun() {
  const academy = useAtomValue(academyState)
  const academyId = academy.academyId
  const qc = useQueryClient()

  const [level, setLevel] = useState<Level | null>(null)
  const [grade, setGrade] = useState<string>('중1')
  const [monthIdx, setMonthIdx] = useState(0)
  const [weekIdx, setWeekIdx] = useState(0)
  const [phase, setPhase] = useState<'open' | 'step' | 'close'>('open')
  const [stepIdx, setStepIdx] = useState(0)
  const [openStudent, setOpenStudent] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { scores: Record<string, any>; note: string }>>({})

  const lv: Level = level ?? 'middle'
  const THEME = THEMES[lv]
  const GRADES = GRADES_BY_LEVEL[lv]

  const roadmap = lv === 'middle'
    ? MIDDLE_ROADMAP[grade as MiddleGradeKey]
    : ROADMAP[grade as GradeKey]

  const month = roadmap[Math.min(monthIdx, roadmap.length - 1)]
  const mission = month.missions[Math.min(weekIdx, month.missions.length - 1)]
  const missionKey = mission.key

  const switchLevel = (lv: Level) => {
    setLevel(lv)
    setGrade(GRADES_BY_LEVEL[lv][0])
    setMonthIdx(0); setWeekIdx(0); setPhase('open'); setStepIdx(0)
  }

  // ── 우리 학원 해당 학년 학생 ──
  const { data: students } = useQuery({
    queryKey: ['lesson-run-students', academyId, level, grade],
    enabled: !!academyId && !!level,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, grade')
        .eq('academy_id', academyId)
        .eq('role', lv === 'middle' ? 'middle_student' : 'high_student')
        .eq('status', 'active')
        .eq('grade', grade)
        .order('name')
      if (error) throw error
      return (data ?? []) as Student[]
    },
  })

  // ── 이 달 4주차 전체 답안 (준비 상태 + 진행 현황) ──
  const monthKeys = month.missions.map(m => m.key)
  const { data: answers } = useQuery({
    queryKey: ['lesson-run-answers', academyId, level, grade, month.m],
    enabled: !!students?.length,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_workbook_answer')
        .select('student_id, mission_key, answers, submitted_at')
        .in('student_id', (students ?? []).map(s => s.id))
        .in('mission_key', monthKeys)
      if (error) throw error
      const map = new Map<string, { answers: Record<string, any>; submitted_at: string | null }>()
      for (const r of data ?? []) map.set(`${r.student_id}|${r.mission_key}`, r as any)
      return map
    },
  })

  // ── 지도 원고 ──
  const { data: guide, isLoading } = useQuery({
    queryKey: ['lesson-guide', missionKey],
    enabled: !!level,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_workbook')
        .select('teacher_guide')
        .eq('mission_key', missionKey)
        .maybeSingle()
      if (error) throw error
      return (data?.teacher_guide ?? null) as Guide | null
    },
  })

  // ── 선생님 기록 ──
  const { data: records } = useQuery({
    queryKey: ['lesson-records', missionKey],
    enabled: !!students?.length,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_teacher_record')
        .select('student_id, scores, note')
        .eq('mission_key', missionKey)
        .in('student_id', (students ?? []).map(s => s.id))
      if (error) throw error
      const map = new Map<string, { scores: Record<string, any>; note: string | null }>()
      for (const r of data ?? []) map.set(r.student_id, r as any)
      return map
    },
  })

  const saveRecord = useMutation({
    mutationFn: async (p: { studentId: string; scores: Record<string, any>; note: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요해요')
      const { error } = await supabase.from('lesson_teacher_record').upsert({
        teacher_id: user.id,
        student_id: p.studentId,
        mission_key: missionKey,
        scores: p.scores,
        note: p.note,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'teacher_id,student_id,mission_key' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson-records', missionKey] }),
  })

  const steps = guide?.steps ?? []
  const cur = steps[Math.min(stepIdx, Math.max(0, steps.length - 1))]

  // 학생별 준비 상태
  const readiness = (sid: string) => {
    const pre = guide?.opening?.prereq ?? []
    const missing = pre.filter(p => !answers?.get(`${sid}|${p.key}`))
    return { missing, ready: missing.length === 0 }
  }

  // 현재 활동을 학생이 채웠는지 (활동 id로 시작하는 필드가 있으면 진행 중)
  const stepProgress = (sid: string, stepId: string) => {
    const a = answers?.get(`${sid}|${missionKey}`)?.answers
    if (!a) return 'none'
    const keys = Object.keys(a).filter(k => k.startsWith(stepId))
    if (!keys.length) return 'none'
    const filled = keys.filter(k => {
      const v = a[k]
      if (Array.isArray(v)) return v.flat().filter(Boolean).length > 0
      return String(v ?? '').trim().length > 0
    })
    if (!filled.length) return 'none'
    return filled.length === keys.length ? 'done' : 'partial'
  }

  const draftOf = (sid: string) => drafts[sid] ?? {
    scores: records?.get(sid)?.scores ?? {},
    note: records?.get(sid)?.note ?? '',
  }
  const setDraft = (sid: string, patch: Partial<{ scores: Record<string, any>; note: string }>) =>
    setDrafts(d => ({ ...d, [sid]: { ...draftOf(sid), ...patch } }))

  const Chip = ({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all"
      style={{
        background: on ? THEME.accent : '#fff',
        color: on ? '#fff' : '#6B7280',
        border: `1px solid ${on ? THEME.accent : '#E5E7EB'}`,
      }}
    >
      {label}
    </button>
  )

  const Block = ({ title, items, color }: { title: string; items?: string[]; color?: string }) =>
    items?.length ? (
      <div className="mb-4">
        <div className="text-[11px] font-bold mb-1.5" style={{ color: color ?? THEME.accentDark }}>{title}</div>
        <ul className="space-y-1">
          {items.map((x, i) => (
            <li key={i} className="text-[12.5px] text-ink-secondary leading-[1.65] pl-3 relative">
              <span className="absolute left-0 top-0" style={{ color: color ?? '#9CA3AF' }}>·</span>
              <span className="whitespace-pre-wrap">{x}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null

  // ── 레벨 선택 화면 ──
  if (!level) {
    const CARDS: { lv: Level; label: string; desc: string }[] = [
      { lv: 'middle', label: '중등', desc: '중1 · 중2 · 중3\n진로 탐색 8개월 과정' },
      { lv: 'high', label: '고등', desc: '고1 · 고2 · 고3\n탐구 실행 · 심화 · 대입 완성' },
    ]
    return (
      <div className="h-full overflow-y-auto px-8 py-7 box-border font-sans text-ink flex items-center justify-center">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <div className="text-[22px] font-extrabold tracking-tight mb-1">수업 진행</div>
            <div className="text-[13px] text-ink-secondary">어느 과정 수업인지 선택해 주세요.</div>
          </div>

          <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
            {CARDS.map(c => {
              const t = THEMES[c.lv]
              return (
                <button
                  key={c.lv}
                  onClick={() => switchLevel(c.lv)}
                  className="rounded-3xl bg-white px-8 py-12 transition-all hover:-translate-y-1 text-center"
                  style={{ border: `2px solid ${t.accentBorder}`, boxShadow: `0 6px 20px ${t.accentShadow}` }}
                >
                  <div className="text-[26px] font-extrabold tracking-tight mb-2" style={{ color: t.accentDark }}>
                    {c.label}
                  </div>
                  <div className="text-[12.5px] text-ink-secondary leading-[1.7] whitespace-pre-line">
                    {c.desc}
                  </div>
                  <div
                    className="mt-6 inline-block text-[13px] font-bold px-6 py-2.5 rounded-xl text-white"
                    style={{ background: t.accent }}
                  >
                    수업 시작하기 ›
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-7 box-border font-sans text-ink">

      {/* 선택 바 */}
      <div className="bg-white border border-line rounded-2xl p-4 mb-4">
        <div className="flex gap-2 flex-wrap items-center">
          {GRADES.map(g => (
            <Chip key={g} label={g} on={grade === g}
              onClick={() => { setGrade(g); setMonthIdx(0); setWeekIdx(0); setPhase('open'); setStepIdx(0) }} />
          ))}
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <select
            value={monthIdx}
            onChange={e => { setMonthIdx(+e.target.value); setWeekIdx(0); setPhase('open'); setStepIdx(0) }}
            className="text-[12px] font-bold border border-line rounded-lg px-3 py-1.5 outline-none"
          >
            {roadmap.map((m, i) => (
              <option key={i} value={i}>{m.m} · {m.theme}</option>
            ))}
          </select>
          <select
            value={weekIdx}
            onChange={e => { setWeekIdx(+e.target.value); setPhase('open'); setStepIdx(0) }}
            className="text-[12px] font-bold border border-line rounded-lg px-3 py-1.5 outline-none"
          >
            {month.missions.map((ms, i) => (
              <option key={i} value={i}>{i + 1}주차 · {ms.subject ?? ''} {ms.t}</option>
            ))}
          </select>
          <div className="ml-auto text-[11px] text-ink-muted">
            학생 {students?.length ?? 0}명
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-[13px] text-ink-muted">불러오는 중…</div>
      ) : !guide ? (
        <div className="bg-white border border-line rounded-2xl py-20 text-center">
          <div className="text-3xl mb-3">📋</div>
          <div className="text-[15px] font-bold text-ink mb-1.5">이 주차 지도 원고가 아직 없어요</div>
          <div className="text-[12px] text-ink-secondary">{missionKey}</div>
        </div>
      ) : (
        <div className="grid gap-4 items-start grid-cols-[1fr_320px] max-lg:grid-cols-1">

          {/* 왼쪽 — 원고 */}
          <div className="bg-white border border-line rounded-2xl p-6">

            {/* 단계 바 */}
            <div className="flex items-center gap-1.5 mb-5">
              <button onClick={() => setPhase('open')} className="h-1.5 rounded-full flex-1 transition-all"
                style={{ background: phase !== 'open' ? THEME.accent : '#A7F3D0' }} title="수업 시작" />
              {steps.map((s, i) => (
                <button key={s.id} onClick={() => { setPhase('step'); setStepIdx(i) }}
                  className="h-1.5 rounded-full flex-1 transition-all"
                  style={{
                    background: phase === 'close' || (phase === 'step' && i < stepIdx) ? THEME.accent
                      : (phase === 'step' && i === stepIdx) ? '#A7F3D0' : '#E5E7EB',
                  }}
                  title={s.title} />
              ))}
              <button onClick={() => setPhase('close')} className="h-1.5 rounded-full flex-1 transition-all"
                style={{ background: phase === 'close' ? '#A7F3D0' : '#E5E7EB' }} title="수업 종료" />
            </div>

            {/* 화면 0 */}
            {phase === 'open' && (
              <>
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="text-[17px] font-extrabold tracking-tight">수업 시작</h2>
                  {guide.opening?.minutes && (
                    <span className="text-[11px] font-bold" style={{ color: THEME.accent }}>
                      권장 {guide.opening.minutes}분
                    </span>
                  )}
                </div>

                {guide.purpose && (
                  <div className="text-[12.5px] text-ink-secondary leading-[1.75] mb-4">{guide.purpose}</div>
                )}

                {guide.opening?.script && (
                  <div className="rounded-xl px-4 py-3 mb-4"
                    style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}` }}>
                    <div className="text-[10px] font-bold mb-1" style={{ color: THEME.accentDark }}>시작 멘트</div>
                    <div className="text-[13px] leading-[1.75]" style={{ color: THEME.accentDark }}>
                      “{guide.opening.script}”
                    </div>
                  </div>
                )}

                <Block title="오늘의 핵심 결과물" items={guide.outputs} />
                <Block title="선생님의 핵심 원칙" items={guide.principles} color="#B45309" />

                {/* 준비 상태 표 */}
                {!!guide.opening?.prereq?.length && (
                  <div className="mt-5">
                    <div className="text-[11px] font-bold mb-2" style={{ color: THEME.accentDark }}>수업 전 확인</div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-[12px]">
                        <thead>
                          <tr className="border-b border-line">
                            <th className="text-left py-2 font-bold text-ink-secondary">학생</th>
                            {guide.opening.prereq.map(p => (
                              <th key={p.key} className="text-left py-2 font-bold text-ink-secondary px-2">{p.label}</th>
                            ))}
                            <th className="text-left py-2 font-bold text-ink-secondary">준비 상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(students ?? []).map(s => {
                            const r = readiness(s.id)
                            return (
                              <tr key={s.id} className="border-b border-line/60">
                                <td className="py-2 font-bold text-ink">{s.name}</td>
                                {guide.opening!.prereq!.map(p => (
                                  <td key={p.key} className="py-2 px-2">
                                    {answers?.get(`${s.id}|${p.key}`)
                                      ? <span style={{ color: THEME.accent }}>완료</span>
                                      : <span className="text-amber-600">미완료</span>}
                                  </td>
                                ))}
                                <td className="py-2">
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                    style={{
                                      background: r.ready ? THEME.accentBg : '#FFFBEB',
                                      color: r.ready ? '#047857' : '#92400E',
                                    }}>
                                    {r.ready ? '준비 완료' : '보완 필요'}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-3 rounded-lg px-3.5 py-2.5" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <div className="text-[10px] font-bold text-amber-700 mb-1">데이터가 빠진 학생</div>
                      {guide.opening.prereq.map(p => (
                        <div key={p.key} className="text-[11.5px] text-amber-900 leading-[1.7]">
                          {p.label} 누락 → {p.fallback}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 화면 1~N */}
            {phase === 'step' && cur && (
              <>
                <div className="flex items-baseline gap-2 mb-3 flex-wrap">
                  <span className="text-[11px] font-bold text-ink-muted">화면 {stepIdx + 1}</span>
                  <h2 className="text-[17px] font-extrabold tracking-tight">{cur.title}</h2>
                  {cur.minutes && (
                    <span className="text-[11px] font-bold" style={{ color: THEME.accent }}>권장 {cur.minutes}분</span>
                  )}
                </div>

                {cur.intent && (
                  <div className="text-[12.5px] text-ink-secondary leading-[1.75] mb-4">{cur.intent}</div>
                )}

                {cur.script && (
                  <div className="rounded-xl px-4 py-3 mb-4"
                    style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}` }}>
                    <div className="text-[10px] font-bold mb-1" style={{ color: THEME.accentDark }}>멘트</div>
                    <div className="text-[13px] leading-[1.75]" style={{ color: THEME.accentDark }}>“{cur.script}”</div>
                  </div>
                )}

                <Block title="선생님 질문" items={cur.questions} />
                <Block title="자주 나오는 약한 반응" items={cur.weakResponses} color="#B45309" />
                <Block title="하면 안 되는 말" items={cur.avoid} color="#DC2626" />

                {cur.coaching && (
                  <div className="mb-4">
                    <div className="text-[11px] font-bold mb-1.5" style={{ color: THEME.accentDark }}>코칭 방법</div>
                    <div className="text-[12.5px] text-ink-secondary leading-[1.75] whitespace-pre-wrap">{cur.coaching}</div>
                  </div>
                )}

                {!!cur.cases?.length && (
                  <div className="mb-4">
                    <div className="text-[11px] font-bold mb-1.5" style={{ color: THEME.accentDark }}>상황별 코칭</div>
                    {cur.cases.map((c, i) => (
                      <div key={i} className="rounded-lg px-3.5 py-2.5 mb-1.5" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                        <div className="text-[11.5px] font-bold text-ink mb-1">{c.when}</div>
                        <div className="text-[12.5px] text-ink-secondary leading-[1.7]">“{c.say}”</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                  <Block title="좋은 예" items={cur.good} />
                  <Block title="약한 예" items={cur.bad} color="#DC2626" />
                </div>

                <Block title="관찰·진행 확인" items={cur.watch} />
              </>
            )}

            {/* 화면 마지막 */}
            {phase === 'close' && (
              <>
                <h2 className="text-[17px] font-extrabold tracking-tight mb-4">수업 종료</h2>
                <Block title="반드시 저장할 내용" items={guide.closing?.saveItems} />
                {guide.closing?.nextMonth && (
                  <div className="rounded-xl px-4 py-3 mt-2" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}` }}>
                    <div className="text-[10px] font-bold mb-1" style={{ color: THEME.accentDark }}>다음 달 연결</div>
                    <div className="text-[12.5px] leading-[1.75]" style={{ color: THEME.accentDark }}>{guide.closing.nextMonth}</div>
                  </div>
                )}

              </>
            )}

            {/* 이동 */}
            <div className="flex gap-2 mt-6 pt-5 border-t border-line">
              <button
                onClick={() => {
                  if (phase === 'close') { setPhase('step'); setStepIdx(steps.length - 1) }
                  else if (phase === 'step') {
                    if (stepIdx === 0) setPhase('open'); else setStepIdx(i => i - 1)
                  }
                }}
                disabled={phase === 'open'}
                className="rounded-xl px-5 py-3 text-[13px] font-bold border disabled:opacity-40"
                style={{ borderColor: '#E5E7EB', background: '#fff' }}
              >
                이전
              </button>
              <button
                onClick={() => {
                  if (phase === 'open') { setPhase('step'); setStepIdx(0) }
                  else if (phase === 'step') {
                    if (stepIdx >= steps.length - 1) setPhase('close'); else setStepIdx(i => i + 1)
                  }
                }}
                disabled={phase === 'close'}
                className="flex-1 rounded-xl py-3 text-[13.5px] font-bold text-white disabled:opacity-40"
                style={{ background: THEME.accent }}
              >
                {phase === 'open' ? '수업 시작 ›' : stepIdx >= steps.length - 1 ? '수업 마무리 ›' : '다음 화면 ›'}
              </button>
            </div>
          </div>

          {/* 오른쪽 — 학생 현황 + 기록 */}
          <div className="bg-white rounded-2xl p-5 sticky top-0 max-h-[calc(100vh-140px)] overflow-y-auto"
            style={{ border: `2px solid ${THEME.accent}`, boxShadow: `0 8px 24px ${THEME.accentShadow}` }}>
            <div className="text-[13px] font-extrabold mb-1">👥 학생 현황</div>
            <div className="text-[11px] text-ink-secondary mb-3">
              {phase === 'close' ? '오늘 활동 완료 현황'
                : phase === 'step' && cur ? `${cur.title} 진행도`
                : '오늘 수업 준비 상태'}
            </div>

            {(students ?? []).length === 0 && (
              <div className="text-[12px] text-ink-muted py-8 text-center">해당 학년 학생이 없어요</div>
            )}

            {(students ?? []).map(s => {
              const rec = records?.get(s.id)
              const isOpen = openStudent === s.id
              const d = draftOf(s.id)
              const stepRecords = (guide.records ?? []).filter(r =>
                phase === 'close' ? true : (cur?.recordIds ?? []).includes(r.id))
              const p = phase === 'step' && cur ? stepProgress(s.id, cur.id) : null
              const ready = readiness(s.id).ready
              const doneCount = steps.filter(st => stepProgress(s.id, st.id) === 'done').length
              const anyCount = steps.filter(st => stepProgress(s.id, st.id) !== 'none').length

              return (
                <div key={s.id} className="rounded-lg px-3 py-2.5 mb-1.5"
                  style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-bold flex-1">{s.name}</span>
                    {phase === 'close' ? (
                      <span className="text-[11px] font-bold" style={{
                        color: doneCount === steps.length ? THEME.accent : anyCount > 0 ? '#D97706' : '#9CA3AF',
                      }}>
                        {doneCount}/{steps.length} 활동
                      </span>
                    ) : p !== null ? (
                      <span className="text-[11px] font-bold" style={{
                        color: p === 'done' ? THEME.accent : p === 'partial' ? '#D97706' : '#9CA3AF',
                      }}>
                        {p === 'done' ? '완료' : p === 'partial' ? '작성 중' : '미작성'}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold" style={{ color: ready ? THEME.accent : '#D97706' }}>
                        {ready ? '준비 완료' : '보완 필요'}
                      </span>
                    )}
                    {(stepRecords.length > 0 || phase === 'close') && (
                      <button onClick={() => setOpenStudent(isOpen ? null : s.id)}
                        className="text-[11px] text-ink-muted hover:text-ink">
                        {isOpen ? '접기' : '기록'}
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <div className="mt-2.5 pt-2.5 border-t border-line">
                      {stepRecords.map(r => (
                        <div key={r.id} className="mb-2.5">
                          <div className="text-[11px] font-bold text-ink mb-1">{r.label}</div>
                          <div className="flex gap-1 flex-wrap">
                            {(r.type === 'score5' ? ['1', '2', '3', '4', '5'] : (r.options ?? [])).map(o => (
                              <button key={o}
                                onClick={() => setDraft(s.id, { scores: { ...d.scores, [r.id]: o } })}
                                className="text-[11px] font-bold px-2 py-1 rounded-md"
                                style={{
                                  background: String(d.scores[r.id]) === o ? THEME.accent : '#fff',
                                  color: String(d.scores[r.id]) === o ? '#fff' : '#6B7280',
                                  border: `1px solid ${String(d.scores[r.id]) === o ? THEME.accent : '#E5E7EB'}`,
                                }}>
                                {o}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      {phase === 'close' && (
                        <>
                          {(guide.closing?.notes ?? []).map(n => (
                            <div key={n.id} className="text-[10.5px] text-ink-muted mb-1 leading-[1.5]">{n.label}</div>
                          ))}
                          <textarea
                            value={d.note}
                            onChange={e => setDraft(s.id, { note: e.target.value })}
                            rows={3}
                            placeholder="수업 후 기록"
                            className="w-full text-[11.5px] border border-line rounded-md px-2 py-1.5 resize-none outline-none focus:border-emerald-400"
                          />
                        </>
                      )}

                      <button
                        onClick={() => saveRecord.mutate({ studentId: s.id, scores: d.scores, note: d.note })}
                        disabled={saveRecord.isPending}
                        className="w-full mt-1.5 rounded-md py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                        style={{ background: THEME.accent }}
                      >
                        {saveRecord.isPending ? '저장 중…' : rec ? '기록 수정' : '기록 저장'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}