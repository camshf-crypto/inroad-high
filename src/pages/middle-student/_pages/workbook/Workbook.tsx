import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { MIDDLE_ROADMAP } from '@/constants/middleRoadmap'

/* ── 팔레트 ─────────────────────────────────────────── */
const C = {
  ink: '#17343A',
  muted: '#6F8687',
  faint: '#9AA9A5',
  line: '#DCECE8',
  lineSoft: '#E4EEEB',
  paper: '#FFFEFB',
  canvas: '#F5FBF9',
  mint: '#DFF7EF',
  mintStrong: '#17A27C',
  mintDeep: '#087D65',
  sky: '#E7F4FF',
  skyInk: '#3B83B3',
  yellow: '#FFF2C9',
  yellowInk: '#A16F15',
  coral: '#FFE5DF',
  coralInk: '#BD6255',
  lavender: '#EEE9FF',
  lavenderInk: '#6E5ABD',
}

const BADGE = [
  { bg: C.mint, fg: C.mintDeep },
  { bg: C.sky, fg: C.skyInk },
  { bg: C.yellow, fg: C.yellowInk },
  { bg: C.coral, fg: C.coralInk },
  { bg: C.lavender, fg: C.lavenderInk },
]

/* 섹션 성격에 따라 바뀌는 아이콘 */
const ICONS = ['🧭', '✏️', '🔍', '🧩', '💬', '⭐', '🗂', '📊', '🎯', '🏁']

/**
 * blocks 구조 (mission_workbook.blocks) — Section[]
 *
 * 필드 타입 14종
 *  short / long / number / lines / tags / table / score
 *  check / checks / choice / chips / stars / sentence / info
 *
 * 섹션 variant
 *  plain(기본) / quote / point / output / next
 *
 * info 타입 필드는 오른쪽 「생각 도우미」 패널로 빠진다.
 */
type FieldType =
  | 'short' | 'long' | 'number' | 'lines' | 'tags' | 'table' | 'score'
  | 'check' | 'checks' | 'choice' | 'chips' | 'stars' | 'sentence' | 'info'

interface Field {
  id: string
  label?: string
  type?: FieldType
  hint?: string
  placeholder?: string
  suffix?: string
  rows?: number
  count?: number
  max?: number
  columns?: string[]
  firstColLabels?: string[]
  total?: boolean
  criteria?: string[]
  rowLabels?: string[]
  items?: string[]
  options?: string[]
  chip?: boolean
  pick?: number
  other?: boolean
  sentences?: string[]
  numbered?: boolean
  lines?: string[]
}

interface Section {
  id: string
  title: string
  desc?: string
  variant?: 'plain' | 'quote' | 'point' | 'output' | 'next'
  fields: Field[]
}

interface WorkbookRow {
  mission_key: string
  title: string
  intro: string | null
  blocks: Section[] | null
}

interface AnswerRow {
  answers: Record<string, unknown>
  submitted_at: string | null
}

const FALLBACK: Section[] = [
  { id: 's1', title: '적어보기', fields: [{ id: 'note', type: 'long', placeholder: '여기에 적어보세요' }] },
]

/* ── 마스코트 ───────────────────────────────────────── */
function Mascot({ week = 0, size = 96 }: { week?: number; size?: number }) {
  const props = ['✦', '✎', '◆', '♪']
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        border: '6px solid rgba(255,255,255,.75)',
        borderRadius: '37% 63% 52% 48% / 54% 42% 58% 46%',
        background: C.mintStrong,
        transform: 'rotate(7deg)',
      }}
      aria-hidden
    >
      <span style={{ position: 'absolute', width: 10, height: 10, top: size * 0.3, left: size * 0.24, borderRadius: '50%', background: '#fff' }} />
      <span style={{ position: 'absolute', width: 10, height: 10, top: size * 0.3, right: size * 0.24, borderRadius: '50%', background: '#fff' }} />
      <span
        style={{
          position: 'absolute',
          width: size * 0.3,
          height: size * 0.15,
          left: size * 0.28,
          bottom: size * 0.22,
          borderBottom: '5px solid #fff',
          borderRadius: '0 0 30px 30px',
        }}
      />
      <span style={{ position: 'absolute', top: -12, right: -8, fontSize: 22, transform: 'rotate(-14deg)' }}>
        {props[week % props.length]}
      </span>
    </div>
  )
}

/* ================================================================== */

export default function Workbook() {
  const { missionKey = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [draft, setDraft] = useState<Record<string, any>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [toast, setToast] = useState('')
  const [step, setStep] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded = useRef(false)
  const topRef = useRef<HTMLDivElement | null>(null)

  const goTop = () => topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2000)
  }

  const ctx = useMemo(() => {
    for (const [grade, months] of Object.entries(MIDDLE_ROADMAP)) {
      for (const month of months) {
        const idx = month.missions.findIndex(ms => ms.key === missionKey)
        if (idx >= 0) {
          return {
            grade,
            month: month.m,
            theme: month.theme,
            output: month.output,
            weekIndex: idx,
            weeks: month.missions.map((ms, i) => ({
              key: ms.key,
              label: `${i + 1}주차`,
              subject: ms.subject,
              text: ms.t,
            })),
            current: month.missions[idx],
          }
        }
      }
    }
    return null
  }, [missionKey])

  const { data: studentId } = useQuery({
    queryKey: ['auth-uid'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser()
      return data.user?.id ?? null
    },
  })

  const { data: workbook, isLoading } = useQuery({
    queryKey: ['mission-workbook', missionKey],
    enabled: !!missionKey,
    queryFn: async (): Promise<WorkbookRow | null> => {
      const { data, error } = await supabase
        .from('mission_workbook')
        .select('mission_key, title, intro, blocks')
        .eq('mission_key', missionKey)
        .maybeSingle()
      if (error) throw error
      return data as WorkbookRow | null
    },
  })

  const { data: answer } = useQuery({
    queryKey: ['mission-workbook-answer', missionKey, studentId],
    enabled: !!missionKey && !!studentId,
    queryFn: async (): Promise<AnswerRow | null> => {
      const { data, error } = await supabase
        .from('mission_workbook_answer')
        .select('answers, submitted_at')
        .eq('mission_key', missionKey)
        .eq('student_id', studentId)
        .maybeSingle()
      if (error) throw error
      return data as AnswerRow | null
    },
  })

  const sections = workbook?.blocks?.length ? workbook.blocks : FALLBACK
  const submitted = !!answer?.submitted_at
  const readOnly = submitted

  useEffect(() => {
    if (loaded.current) return
    if (answer === undefined) return
    setDraft(answer?.answers ?? {})
    loaded.current = true
  }, [answer])

  useEffect(() => {
    loaded.current = false
    setDraft({})
    setStep(0)
    setSaveState('idle')
  }, [missionKey])

  const save = useMutation({
    mutationFn: async (next: Record<string, any>) => {
      if (!studentId) return
      const { error } = await supabase
        .from('mission_workbook_answer')
        .upsert(
          { student_id: studentId, mission_key: missionKey, answers: next },
          { onConflict: 'student_id,mission_key' },
        )
      if (error) throw error
    },
    onSuccess: () => {
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 1800)
    },
    onError: () => setSaveState('idle'),
  })

  const submit = useMutation({
    mutationFn: async () => {
      if (!studentId) return
      const { error } = await supabase
        .from('mission_workbook_answer')
        .upsert(
          {
            student_id: studentId,
            mission_key: missionKey,
            answers: draft,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,mission_key' },
        )
      if (error) throw error
    },
    onSuccess: () => {
      showToast('워크북을 제출했어요!')
      qc.invalidateQueries({ queryKey: ['mission-workbook-answer', missionKey, studentId] })
    },
  })

  const setValue = (key: string, value: any) => {
    if (readOnly) return
    setDraft(prev => {
      const next = { ...prev, [key]: value }
      setSaveState('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => save.mutate(next), 700)
      return next
    })
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const isFilled = (v: any) => {
    if (v === undefined || v === null) return false
    if (typeof v === 'string') return v.trim() !== ''
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'boolean') return v
    return true
  }

  const filledCount = useMemo(
    () => Object.keys(draft).filter(k => isFilled(draft[k])).length,
    [draft],
  )

  /* 섹션별 작성 여부 */
  const sectionDone = useMemo(() => {
    return sections.map(s =>
      Object.keys(draft).some(k => k.startsWith(`${s.id}.`) && isFilled(draft[k])),
    )
  }, [sections, draft])

  if (isLoading) {
    return <div className="p-10 text-center text-[15px]" style={{ color: C.muted }}>불러오는 중…</div>
  }

  if (!workbook) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5 text-center" style={{ background: C.canvas }}>
        <Mascot size={84} />
        <p className="mt-6 text-[18px] font-black" style={{ color: C.ink }}>워크북을 준비하고 있어요</p>
        <p className="mt-2 text-[14px] font-bold" style={{ color: C.muted }}>
          {ctx ? `${ctx.grade} ${ctx.month} ${ctx.weeks[ctx.weekIndex]?.label}` : missionKey}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-7 rounded-2xl px-6 py-3 text-[14px] font-black"
          style={{ background: '#fff', color: C.muted, border: `1px solid ${C.line}` }}
        >
          돌아가기
        </button>
      </div>
    )
  }

  const total = sections.length
  const idx = Math.min(step, total - 1)
  const section = sections[idx]
  const isLast = idx === total - 1
  const coachFields = section.fields.filter(f => f.type === 'info')
  const workFields = section.fields.filter(f => f.type !== 'info')
  const week = ctx?.weeks[ctx.weekIndex]

  return (
    <div className="relative h-full overflow-y-auto" style={{ background: C.canvas }}>
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-14 pt-4">
        <div ref={topRef} />

        {/* ── 상단 바 ─────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              style={{
                position: 'relative',
                width: 38,
                height: 38,
                flex: '0 0 38px',
                borderRadius: 13,
                background: C.mintStrong,
              }}
            >
              <span style={{ position: 'absolute', width: 5, height: 5, top: 13, left: 10, borderRadius: '50%', background: '#fff' }} />
              <span style={{ position: 'absolute', width: 5, height: 5, top: 13, right: 10, borderRadius: '50%', background: '#fff' }} />
              <span style={{ position: 'absolute', width: 13, height: 7, left: 12, bottom: 10, borderBottom: '3px solid #fff', borderRadius: '0 0 20px 20px' }} />
            </div>
            <div>
              <p className="text-[16px] font-black leading-none tracking-tight" style={{ color: C.ink }}>비커스 탐험 노트</p>
              <p className="mt-1 text-[11px] font-bold" style={{ color: C.muted }}>{ctx?.theme ?? '나를 알아가는 시간'}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 rounded-full px-3.5 py-2 text-[12px] font-black"
            style={{ background: 'rgba(255,255,255,.84)', color: C.ink, border: `1px solid ${C.line}` }}
          >
            ← 로드맵
          </button>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[196px_minmax(0,1fr)_224px]">
          {/* ── 왼쪽 주차 레일 ─────────────────────── */}
          {ctx && (
            <aside
              className="rounded-[20px] p-2.5 lg:sticky lg:top-3 lg:p-3.5"
              style={{ background: 'rgba(255,255,255,.8)', border: `1px solid ${C.line}` }}
            >
              <div className="mb-2.5 hidden items-center justify-between px-1.5 lg:flex">
                <strong className="text-[13px]" style={{ color: C.ink }}>이번 달 탐험</strong>
                <span className="text-[11px] font-black" style={{ color: C.mintDeep }}>
                  {ctx.weekIndex + 1} / {ctx.weeks.length}주
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto lg:grid lg:gap-1.5 lg:overflow-visible">
                {ctx.weeks.map((w, i) => {
                  const on = i === ctx.weekIndex
                  return (
                    <button
                      key={w.key}
                      onClick={() => navigate(`/middle-student/workbook/${w.key}`)}
                      className="flex flex-shrink-0 items-center gap-2 rounded-[13px] px-2.5 py-2.5 text-left lg:w-full"
                      style={{
                        background: on ? C.mint : 'transparent',
                        border: `1px solid ${on ? '#BCE9DC' : 'transparent'}`,
                        color: on ? C.mintDeep : '#6D8180',
                      }}
                    >
                      <span
                        className="flex h-[25px] w-[25px] flex-shrink-0 items-center justify-center rounded-[9px] text-[11px] font-black"
                        style={{ background: on ? C.mintStrong : '#EDF4F1', color: on ? '#fff' : '#8AA09A' }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[12px] font-black leading-tight">
                        {w.subject ?? w.label}
                        <span className="block text-[10px] font-bold opacity-70">{w.label}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <div
                className="mt-3 hidden rounded-[13px] px-2.5 py-2.5 text-[11px] font-bold leading-relaxed lg:block"
                style={{ background: '#FFF8E4', color: '#886824' }}
              >
                {ctx.output ? `이번 달에 만드는 것 — ${ctx.output}` : '한 칸씩 채우면 저절로 완성돼요'}
              </div>
            </aside>
          )}

          {/* ── 가운데 본문 ────────────────────────── */}
          <main className="min-w-0">
            {/* 히어로 */}
            <section
              className="relative overflow-hidden rounded-[26px] px-6 py-6"
              style={{ background: C.mint, border: '1px solid #C9EEE3' }}
            >
              <span
                aria-hidden
                style={{ position: 'absolute', width: 180, height: 180, right: -38, top: -73, borderRadius: '50%', background: 'rgba(255,255,255,.42)' }}
              />
              <div className="relative flex justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] font-black" style={{ color: C.mintDeep }}>
                    <span>{ctx?.grade ?? '중등'}</span>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8BDAC3' }} />
                    <span>{ctx ? `${ctx.month} ${week?.label ?? ''}` : ''}</span>
                    {week?.subject && (
                      <>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8BDAC3' }} />
                        <span>{week.subject}</span>
                      </>
                    )}
                  </div>
                  <h1 className="text-[26px] font-black leading-[1.2] tracking-[-0.045em]" style={{ color: C.ink }}>
                    {workbook.title.replace(/^.*?—\s*/, '')}
                  </h1>
                  {workbook.intro && (
                    <p className="mt-2.5 max-w-[520px] text-[14px] font-bold leading-relaxed" style={{ color: '#597777' }}>
                      {workbook.intro}
                    </p>
                  )}
                </div>
                <Mascot week={ctx?.weekIndex ?? 0} />
              </div>
              <div className="relative mt-5 flex flex-wrap gap-2">
                {ctx?.output && (
                  <span
                    className="rounded-full px-3 py-2 text-[11px] font-black"
                    style={{ background: 'rgba(255,255,255,.8)', color: C.ink }}
                  >
                    오늘의 미션 <b style={{ color: C.mintDeep }}>{ctx.output}</b>
                  </span>
                )}
                <span
                  className="rounded-full px-3 py-2 text-[11px] font-black"
                  style={{ background: '#FFF3D4', color: '#806024' }}
                >
                  화면 <b style={{ color: '#BD7D14' }}>{total}개</b>
                </span>
                <span
                  className="rounded-full px-3 py-2 text-[11px] font-black"
                  style={{ background: 'rgba(255,255,255,.8)', color: C.ink }}
                >
                  적은 칸 <b style={{ color: C.mintDeep }}>{filledCount}개</b>
                </span>
              </div>
            </section>

            {/* 진행 지도 */}
            <section
              className="mt-3.5 rounded-[20px] px-4 py-4"
              style={{ background: 'rgba(255,255,255,.8)', border: `1px solid ${C.line}` }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <strong className="text-[12px]" style={{ color: C.ink }}>나의 탐험 지도</strong>
                <span className="text-[11px] font-black" style={{ color: C.muted }}>
                  {sectionDone.filter(Boolean).length} / {total} 화면 작성
                </span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {sections.map((s, i) => {
                  const done = sectionDone[i]
                  const now = i === idx
                  return (
                    <div key={s.id} className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() => { setStep(i); goTop() }}
                        className="flex items-center justify-center rounded-full text-[11px] font-black"
                        style={{
                          width: now ? 30 : 25,
                          height: now ? 30 : 25,
                          background: now ? C.mintStrong : done ? '#B8EAD9' : '#EEF3F1',
                          color: now ? '#fff' : done ? C.mintDeep : '#93A39E',
                          boxShadow: now ? '0 0 0 5px #D9F5ED' : 'none',
                        }}
                        title={s.title}
                      >
                        {done && !now ? '✓' : i + 1}
                      </button>
                      {i < total - 1 && (
                        <span style={{ width: 12, height: 3, borderRadius: 2, background: done ? '#AEE5D5' : '#E6F0ED' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* 작업 카드 */}
            <SectionCard
              section={section}
              index={idx}
              fields={workFields}
              draft={draft}
              setValue={setValue}
              readOnly={readOnly}
            />

            {/* 저장 상태 */}
            <div
              className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[14px] px-3.5 py-3"
              style={{ background: '#F0FBF7' }}
            >
              <div className="flex items-center gap-2 text-[11px] font-black" style={{ color: '#558177' }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: saveState === 'saving' ? '#E5AE3B' : '#36BD91',
                    boxShadow: saveState === 'saving' ? '0 0 0 4px #FFF0C8' : '0 0 0 4px #D5F5E9',
                  }}
                />
                {saveState === 'saving' ? '저장하고 있어요…' : saveState === 'saved' ? '저장했어요' : submitted ? '제출 완료' : '적으면 자동으로 저장돼요'}
              </div>
              <span className="text-[10px] font-black" style={{ color: '#72A198' }}>
                비커스에 내 활동 기록으로 남아요
              </span>
            </div>

            {/* 이동 버튼 */}
            <div className="mt-4 flex gap-3">
              <button
                disabled={idx === 0}
                onClick={() => { setStep(s => s - 1); goTop() }}
                className="rounded-[15px] px-6 text-[13px] font-black disabled:opacity-40"
                style={{ minHeight: 48, background: '#F8FAF9', color: '#7D8F8B', border: `1px solid #E5EBE8` }}
              >
                ← 이전
              </button>
              {!isLast ? (
                <button
                  onClick={() => { setStep(s => s + 1); goTop() }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[15px] text-[14px] font-black text-white"
                  style={{ minHeight: 48, background: C.mintStrong }}
                >
                  저장하고 다음으로 <span>→</span>
                </button>
              ) : submitted ? (
                <button
                  disabled
                  className="flex-1 rounded-[15px] text-[14px] font-black"
                  style={{ minHeight: 48, background: '#F8FAF9', color: C.faint, border: `1px solid #E5EBE8` }}
                >
                  제출 완료
                </button>
              ) : (
                <button
                  onClick={() => { if (confirm('제출하면 고칠 수 없어요. 제출할까요?')) submit.mutate() }}
                  className="flex-1 rounded-[15px] text-[14px] font-black text-white"
                  style={{ minHeight: 48, background: C.mintDeep }}
                >
                  다 했어요, 제출하기
                </button>
              )}
            </div>
          </main>

          {/* ── 오른쪽 생각 도우미 ─────────────────── */}
          <aside
            className="order-first rounded-[20px] p-4 lg:order-none lg:sticky lg:top-3"
            style={{ background: 'rgba(255,255,255,.8)', border: `1px solid ${C.line}` }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <strong className="text-[13px]" style={{ color: C.ink }}>오늘의 생각 도우미</strong>
              <span
                className="flex h-[26px] w-[26px] items-center justify-center rounded-[9px] text-[14px]"
                style={{ background: C.yellow }}
              >
                💡
              </span>
            </div>

            {section.desc && (
              <div
                className="rounded-[15px] px-3.5 py-3 text-[11px] font-black leading-relaxed"
                style={{ background: '#FFF6D9', color: '#775D29' }}
              >
                {section.desc}
              </div>
            )}

            {coachFields.length > 0 && (
              <div className="mt-3.5 grid gap-3">
                {coachFields.map(f => (
                  <div key={f.id}>
                    <p className="mb-1.5 text-[11px] font-black" style={{ color: C.mintDeep }}>
                      {f.label ?? '이렇게 해보세요'}
                    </p>
                    <div className="grid gap-2">
                      {(f.lines ?? []).map((l, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <b
                            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[7px] text-[10px] font-black"
                            style={{ background: C.mint, color: C.mintDeep }}
                          >
                            {i + 1}
                          </b>
                          <span className="text-[11px] font-bold leading-relaxed" style={{ color: '#68807D' }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!section.desc && coachFields.length === 0 && (
              <div
                className="rounded-[15px] px-3.5 py-3 text-[11px] font-black leading-relaxed"
                style={{ background: '#FFF6D9', color: '#775D29' }}
              >
                정답은 없어요. 내가 실제로 해 본 일이면 충분해요!
              </div>
            )}

            <div className="my-3.5 h-px" style={{ background: '#E5EFEC' }} />
            <p className="text-[11px] font-black" style={{ color: C.mintDeep }}>
              📌 지금 화면
              <small className="mt-1 block text-[10px] font-bold leading-relaxed" style={{ color: C.muted }}>
                {section.title}
              </small>
            </p>
          </aside>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full px-4 py-3 text-[12px] font-black"
          style={{ background: '#EFFCF7', color: C.mintDeep, border: '1px solid #BDEADA' }}
        >
          {toast} ✨
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* 작업 카드                                                          */
/* ================================================================== */

function SectionCard({
  section, index, fields, draft, setValue, readOnly,
}: {
  section: Section
  index: number
  fields: Field[]
  draft: Record<string, any>
  setValue: (k: string, v: any) => void
  readOnly: boolean
}) {
  const v = section.variant ?? 'plain'

  const skin =
    v === 'output'
      ? { bar: '#F0B83F', border: C.yellow, bg: '#FFFDF5', icon: '🏆', kicker: '오늘 만든 것' }
      : v === 'next'
        ? { bar: '#8574D4', border: C.lavender, bg: '#FBFAFF', icon: '🚀', kicker: '다음 예고' }
        : { bar: '#43C5A3', border: '#BFE9DD', bg: C.paper, icon: ICONS[index % ICONS.length], kicker: `${index + 1}번째 화면` }

  return (
    <section
      className="relative mt-3.5 overflow-hidden rounded-[26px]"
      style={{ background: skin.bg, border: `1px solid ${skin.border}` }}
    >
      <span aria-hidden style={{ position: 'absolute', inset: '0 auto 0 0', width: 7, background: skin.bar }} />

      <div className="px-6 py-5 pl-7" style={{ borderBottom: '1px dashed #D8E9E4' }}>
        <div className="flex items-center gap-2.5 text-[11px] font-black" style={{ color: C.mintDeep }}>
          <span
            className="flex h-[31px] w-[31px] items-center justify-center rounded-[11px] text-[17px]"
            style={{ background: C.yellow }}
          >
            {skin.icon}
          </span>
          <span>{skin.kicker}</span>
        </div>
        <h2 className="mt-2.5 text-[22px] font-black leading-snug tracking-[-0.04em]" style={{ color: C.ink }}>
          {section.title}
        </h2>
      </div>

      <div className="px-6 py-5 pl-7">
        {fields.length > 1 && (
          <div className="mb-3.5 flex items-center justify-between gap-2.5">
            <strong className="text-[13px]" style={{ color: C.ink }}>{fields.length}가지를 적어요</strong>
            <span className="text-[11px] font-black" style={{ color: C.muted }}>빈칸은 나중에 채워도 돼요</span>
          </div>
        )}
        <div className="grid gap-3.5">
          {fields.map((f, i) => (
            <FieldCard
              key={f.id}
              field={f}
              order={i}
              sectionId={section.id}
              draft={draft}
              setValue={setValue}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ================================================================== */
/* 필드 카드                                                          */
/* ================================================================== */

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  border: '1px solid #E1E8E4',
  borderRadius: 12,
  background: '#fff',
  color: C.ink,
  padding: '12px 13px',
  outline: 'none',
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.6,
}

function FieldCard({
  field: f, order, sectionId, draft, setValue, readOnly,
}: {
  field: Field
  order: number
  sectionId: string
  draft: Record<string, any>
  setValue: (k: string, v: any) => void
  readOnly: boolean
}) {
  const [openHint, setOpenHint] = useState(false)
  const base = `${sectionId}.${f.id}`
  const get = (k: string) => draft[k] ?? ''
  const type = f.type ?? 'short'
  const badge = BADGE[order % BADGE.length]

  const wrap = (children: React.ReactNode) => (
    <article
      className="rounded-[17px] px-3.5 py-3.5"
      style={{ background: '#FBFDFC', border: `1px solid ${C.lineSoft}` }}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] text-[11px] font-black"
            style={{ background: badge.bg, color: badge.fg }}
          >
            {order + 1}
          </span>
          {f.label && (
            <span className="text-[14px] font-black leading-snug" style={{ color: C.ink }}>{f.label}</span>
          )}
        </div>
        {f.hint && (
          <button
            type="button"
            onClick={() => setOpenHint(o => !o)}
            className="flex-shrink-0 text-[11px] font-black"
            style={{ color: openHint ? C.mintDeep : '#75A19A' }}
          >
            {openHint ? '힌트 닫기' : '힌트 보기'}
          </button>
        )}
      </div>

      {f.hint && openHint && (
        <div
          className="mt-2 rounded-[10px] px-2.5 py-2 text-[11px] font-bold leading-relaxed"
          style={{ background: '#F0FAF6', color: '#5C8179' }}
        >
          {f.hint}
        </div>
      )}

      <div className="mt-2.5">{children}</div>
    </article>
  )

  /* ---- 한 줄 / 숫자 ---- */
  if (type === 'short' || type === 'number') {
    return wrap(
      <div className="flex items-center gap-2">
        <input
          style={{ ...inputStyle, width: type === 'number' ? 110 : '100%', textAlign: type === 'number' ? 'center' : 'left' }}
          type={type === 'number' ? 'number' : 'text'}
          max={f.max}
          value={get(base)}
          placeholder={f.placeholder ?? '여기에 적어보세요'}
          disabled={readOnly}
          onChange={e => setValue(base, e.target.value)}
        />
        {f.suffix && <span className="text-[14px] font-black" style={{ color: C.muted }}>{f.suffix}</span>}
      </div>,
    )
  }

  /* ---- 여러 줄 ---- */
  if (type === 'long') {
    const val = String(get(base))
    const limit = f.max ?? 200
    return wrap(
      <>
        <textarea
          rows={f.rows ?? 2}
          maxLength={limit}
          style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
          value={val}
          placeholder={f.placeholder ?? '여기에 적어보세요'}
          disabled={readOnly}
          onChange={e => setValue(base, e.target.value)}
        />
        <div className="mt-1.5 flex justify-between px-0.5 text-[10px] font-black" style={{ color: '#A0B0AC' }}>
          <span>장면을 떠올려 구체적으로 적어요</span>
          <span>{val.length} / {limit}</span>
        </div>
      </>,
    )
  }

  /* ---- 번호 목록 ---- */
  if (type === 'lines') {
    return wrap(
      <div className="grid gap-2">
        {Array.from({ length: f.count ?? 3 }).map((_, i) => {
          const done = String(get(`${base}.${i}`)).trim() !== ''
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] text-[11px] font-black"
                style={{ background: done ? C.mintStrong : '#EDF4F1', color: done ? '#fff' : '#8AA09A' }}
              >
                {i + 1}
              </span>
              <input
                style={inputStyle}
                value={get(`${base}.${i}`)}
                placeholder={f.placeholder ?? '여기에 적어보세요'}
                disabled={readOnly}
                onChange={e => setValue(`${base}.${i}`, e.target.value)}
              />
            </div>
          )
        })}
      </div>,
    )
  }

  /* ---- # 키워드 ---- */
  if (type === 'tags') {
    return wrap(
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: f.count ?? 3 }).map((_, i) => {
          const done = String(get(`${base}.${i}`)).trim() !== ''
          return (
            <div
              key={i}
              className="flex items-center gap-1 rounded-full px-3 py-2"
              style={{ background: done ? C.mint : '#fff', border: `1px solid ${done ? '#BCE9DC' : '#E1E8E4'}` }}
            >
              <span className="text-[14px] font-black" style={{ color: C.mintStrong }}>#</span>
              <input
                className="bg-transparent outline-none"
                style={{ width: 88, fontSize: 14, fontWeight: 800, color: C.ink, border: 0 }}
                value={get(`${base}.${i}`)}
                placeholder="키워드"
                disabled={readOnly}
                onChange={e => setValue(`${base}.${i}`, e.target.value)}
              />
            </div>
          )
        })}
      </div>,
    )
  }

  /* ---- 표 ---- */
  if (type === 'table') {
    const cols = f.columns ?? ['항목', '내용']
    const rowCount = f.firstColLabels?.length ?? f.rows ?? 3
    return wrap(
      <>
        <div className="grid gap-2">
          {Array.from({ length: rowCount }).map((_, r) => (
            <div key={r} className="rounded-[13px] p-3" style={{ background: '#F4F9F7' }}>
              <p className="mb-2 text-[11px] font-black" style={{ color: C.mintDeep }}>
                {f.firstColLabels ? f.firstColLabels[r] : `${r + 1}번`}
              </p>
              <div className="flex flex-wrap gap-2">
                {cols.slice(1).map((c, ci) => (
                  <div key={ci} style={{ flex: cols.length > 2 ? '1 1 130px' : '1 1 100%' }}>
                    <p className="mb-1 text-[10px] font-black" style={{ color: C.faint }}>{c}</p>
                    <input
                      style={{ ...inputStyle, padding: '9px 11px', fontSize: 14 }}
                      value={get(`${base}.${r}.${ci}`)}
                      disabled={readOnly}
                      onChange={e => setValue(`${base}.${r}.${ci}`, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {f.total && (
          <div className="mt-2.5 flex items-center justify-end gap-2.5">
            <span className="text-[13px] font-black" style={{ color: C.ink }}>모두 더하면</span>
            <input
              style={{ ...inputStyle, width: 96, textAlign: 'center' }}
              value={get(`${base}.total`)}
              disabled={readOnly}
              onChange={e => setValue(`${base}.total`, e.target.value)}
            />
          </div>
        )}
      </>,
    )
  }

  /* ---- 점수 매기기 ---- */
  if (type === 'score') {
    const criteria = f.criteria ?? ['점수']
    const max = f.max ?? 5
    const labels = f.rowLabels ?? Array.from({ length: 5 }, (_, i) => String(i + 1))
    return wrap(
      <div className="grid gap-2.5">
        <p className="text-[11px] font-bold" style={{ color: C.faint }}>1점부터 {max}점까지 눌러서 점수를 줘요</p>
        {labels.map((lab, r) => {
          const sum = criteria.reduce((acc, _c, c) => {
            const n = Number(get(`${base}.${r}.${c}`))
            return acc + (isNaN(n) ? 0 : n)
          }, 0)
          return (
            <div key={r} className="rounded-[13px] p-3" style={{ background: '#F4F9F7' }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-black" style={{ color: C.ink }}>{lab}</span>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-black"
                  style={{ background: sum > 0 ? C.mintStrong : '#fff', color: sum > 0 ? '#fff' : C.faint }}
                >
                  {sum}점
                </span>
              </div>
              <div className="grid gap-1.5">
                {criteria.map((c, ci) => {
                  const cur = Number(get(`${base}.${r}.${ci}`)) || 0
                  return (
                    <div key={ci} className="flex items-center gap-2">
                      <span className="flex-shrink-0 text-[11px] font-black" style={{ width: 64, color: C.muted }}>{c}</span>
                      <div className="flex gap-1">
                        {Array.from({ length: max }, (_, i) => i + 1).map(n => {
                          const on = cur === n
                          return (
                            <button
                              key={n}
                              type="button"
                              disabled={readOnly}
                              onClick={() => setValue(`${base}.${r}.${ci}`, on ? '' : n)}
                              className="flex items-center justify-center rounded-[9px] text-[12px] font-black"
                              style={{
                                width: 30,
                                height: 30,
                                background: on ? C.mintStrong : '#fff',
                                color: on ? '#fff' : '#93A39E',
                                border: `1px solid ${on ? C.mintStrong : '#E1E8E4'}`,
                              }}
                            >
                              {n}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>,
    )
  }

  /* ---- 체크 하나 ---- */
  if (type === 'check') {
    const on = draft[base] === true
    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setValue(base, !on)}
        className="flex w-full items-center gap-3 rounded-[17px] px-3.5 py-3.5 text-left"
        style={{ background: on ? C.mint : '#FBFDFC', border: `1px solid ${on ? '#BCE9DC' : C.lineSoft}` }}
      >
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] text-[14px] font-black text-white"
          style={{ background: on ? C.mintStrong : '#fff', border: `1px solid ${on ? C.mintStrong : '#E1E8E4'}` }}
        >
          {on ? '✓' : ''}
        </span>
        <span className="text-[14px] font-black" style={{ color: on ? C.mintDeep : C.ink }}>{f.label}</span>
      </button>
    )
  }

  /* ---- 체크리스트 ---- */
  if (type === 'checks') {
    return wrap(
      <div className="grid gap-2">
        {(f.items ?? []).map((item, i) => {
          const on = draft[`${base}.${i}`] === true
          return (
            <button
              key={i}
              type="button"
              disabled={readOnly}
              onClick={() => setValue(`${base}.${i}`, !on)}
              className="flex w-full items-center gap-2.5 rounded-[13px] px-3 py-3 text-left"
              style={{ background: on ? C.mint : '#fff', border: `1px solid ${on ? '#BCE9DC' : '#E1E8E4'}` }}
            >
              <span
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[8px] text-[13px] font-black text-white"
                style={{ background: on ? C.mintStrong : '#fff', border: `1px solid ${on ? C.mintStrong : '#E1E8E4'}` }}
              >
                {on ? '✓' : ''}
              </span>
              <span className="text-[13px] font-black leading-snug" style={{ color: on ? C.mintDeep : C.ink }}>{item}</span>
            </button>
          )
        })}
      </div>,
    )
  }

  /* ---- 고르기 ---- */
  if (type === 'choice' || type === 'chips') {
    const multi = type === 'chips'
    const cur = draft[base]
    const selected: string[] = Array.isArray(cur) ? cur : cur ? [cur] : []
    const toggle = (opt: string) => {
      if (readOnly) return
      if (!multi) { setValue(base, selected[0] === opt ? '' : opt); return }
      setValue(base, selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
    }
    return wrap(
      <>
        <p className="mb-2 text-[11px] font-bold" style={{ color: C.faint }}>
          {f.pick ? `${f.pick}개 골라요` : multi ? '여러 개 골라도 돼요' : '하나만 골라요'}
        </p>
        <div className="flex flex-wrap gap-2">
          {(f.options ?? []).map(opt => {
            const on = selected.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                disabled={readOnly}
                onClick={() => toggle(opt)}
                className="rounded-full px-3.5 py-2.5 text-[13px] font-black"
                style={{
                  background: on ? '#DFF2FD' : '#fff',
                  color: on ? '#2F7196' : '#527D94',
                  border: `1px solid ${on ? '#84C8E7' : '#D6EAF5'}`,
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
        {f.other && (
          <div className="mt-2.5">
            <p className="mb-1.5 text-[11px] font-black" style={{ color: C.faint }}>직접 적고 싶으면</p>
            <input
              style={inputStyle}
              value={get(`${base}.other`)}
              placeholder="여기에 적어보세요"
              disabled={readOnly}
              onChange={e => setValue(`${base}.other`, e.target.value)}
            />
          </div>
        )}
      </>,
    )
  }

  /* ---- 별점 ---- */
  if (type === 'stars') {
    const max = f.max ?? 5
    const score = Number(draft[base]) || 0
    return (
      <div
        className="flex items-center justify-between rounded-[17px] px-3.5 py-3"
        style={{ background: '#FBFDFC', border: `1px solid ${C.lineSoft}` }}
      >
        <span className="text-[14px] font-black" style={{ color: C.ink }}>{f.label}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: max }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              disabled={readOnly}
              onClick={() => setValue(base, n === score ? 0 : n)}
              className="text-[26px] leading-none"
              style={{ color: n <= score ? '#F0B83F' : '#E3EBE8' }}
            >
              ★
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ---- 빈칸 문장 ---- */
  if (type === 'sentence') {
    return wrap(
      <div className="grid gap-2.5">
        {(f.sentences ?? []).map((s, si) => {
          const parts = s.split('___')
          return (
            <div key={si} className="rounded-[13px] px-3.5 py-3" style={{ background: '#F4F9F7' }}>
              {f.numbered && (
                <p className="mb-1.5 text-[11px] font-black" style={{ color: C.mintDeep }}>{si + 1}번</p>
              )}
              <div
                className="flex flex-wrap items-center gap-x-1.5 gap-y-2"
                style={{ fontSize: 15, lineHeight: 1.9, color: C.ink, fontWeight: 700 }}
              >
                {parts.map((part, pi) => (
                  <span key={pi} className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
                    <span>{part}</span>
                    {pi < parts.length - 1 && (
                      <input
                        style={{
                          background: '#fff',
                          border: `1px solid ${String(get(`${base}.${si}.${pi}`)).trim() ? '#84D4BB' : '#E1E8E4'}`,
                          borderRadius: 11,
                          padding: '7px 11px',
                          fontSize: 15,
                          fontWeight: 800,
                          color: C.mintDeep,
                          minWidth: 120,
                          outline: 'none',
                        }}
                        value={get(`${base}.${si}.${pi}`)}
                        placeholder="적어보세요"
                        disabled={readOnly}
                        onChange={e => setValue(`${base}.${si}.${pi}`, e.target.value)}
                      />
                    )}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>,
    )
  }

  return null
}