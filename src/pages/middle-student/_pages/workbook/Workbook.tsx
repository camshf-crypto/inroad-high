import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { MIDDLE_ROADMAP } from '@/constants/middleRoadmap'

/* ── 팔레트 — 진로 로드맵 길 화면과 같은 톤 ───────────── */
const C = {
  ink: '#1F2937',
  muted: '#6B7280',
  faint: '#9CA3AF',
  track: '#E5E7EB',
  soft: '#F3F4F6',
  panel: '#F8FAFC',
  green: '#10B981',
  greenDeep: '#065F46',
  greenBg: '#ECFDF5',
  greenLine: '#A7F3D0',
}

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
 * info 타입 필드는 「생각 도우미」 상자로 빠진다.
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
  /** 진로 지도로 보낼 필드 경로 — 예: { "verbs": "a12.pick_verbs" } */
  collect: Record<string, string> | null
}

interface AnswerRow {
  answers: Record<string, unknown>
  submitted_at: string | null
}

const FALLBACK: Section[] = [
  { id: 's1', title: '적어보기', fields: [{ id: 'note', type: 'long', placeholder: '여기에 적어보세요' }] },
]

/* ── 진로 지도 집계 ──────────────────────────────────
 * 제출하면 두 가지가 쌓인다.
 *  1) 행동동사 → 관심 방향 (어떻게 일하는가)
 *  2) AI가 뽑은 키워드 → 관심 분야 (무엇에 관심인가)
 * ─────────────────────────────────────────────────── */
const VERB_DIR: Record<string, string> = {
  '설명했다': 'people', '도왔다': 'people', '물었다': 'people',
  '설득했다': 'people', '의견을 맞췄다': 'people',
  '관찰했다': 'nature', '원인을 찾았다': 'nature', '탐구했다': 'nature', '확인했다': 'nature',
  '만들었다': 'tech', '고쳤다': 'tech', '바꿔봤다': 'tech', '시험했다': 'tech',
  '비교했다': 'data', '정리했다': 'data', '분류했다': 'data', '세어봤다': 'data', '기록했다': 'data',
  '그렸다': 'make', '썼다': 'make', '기획했다': 'make', '발표했다': 'make',
}

/** mission_key(middle1-01-2 / middle3g-05-1) → 학년·월·주차 */
function parseMissionKey(key: string) {
  const m = key.match(/^middle(\d+g?)-(\d+)-(\d+)$/)
  if (!m) return null
  const gradeMap: Record<string, string> = {
    '1': '중1', '2': '중2', '3': '중3특목', '3g': '중3일반',
  }
  return {
    grade: gradeMap[m[1]] ?? '중1',
    month: parseInt(m[2], 10),
    week: parseInt(m[3], 10),
  }
}

/** 관심 분야 목록 — AI에게 넘겨서 이 안에서만 고르게 한다 */
async function loadFields() {
  const { data } = await supabase
    .from('middle_interest_field')
    .select('code, name, hint')
    .eq('is_active', true)
    .order('display_order')
  return data ?? []
}

const isFilled = (v: any) => {
  if (v === undefined || v === null) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'boolean') return v
  return true
}

/* ── 정거장 — 길 화면의 동그라미 ─────────────────────── */
type StationState = 'now' | 'done' | 'todo'

function Station({
  label, state, size = 34,
}: {
  label: ReactNode
  state: StationState
  size?: number
}) {
  const style: CSSProperties =
    state === 'now'
      ? { background: '#fff', border: `3px solid ${C.green}`, color: C.greenDeep }
      : state === 'done'
        ? { background: C.green, border: `3px solid ${C.green}`, color: '#fff' }
        : { background: '#fff', border: `2px solid ${C.track}`, color: C.faint }

  return (
    <span
      className="relative z-10 flex flex-shrink-0 items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, fontSize: size >= 38 ? 15 : 12, ...style }}
    >
      {label}
    </span>
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
        .select('mission_key, title, intro, blocks, collect')
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

      /* ── 진로 지도용 집계 ─────────────────────────
       * 실패해도 워크북 제출은 성공 처리한다. */
      const path = workbook?.collect?.verbs
      if (!path) return

      const picked = draft[path]
      const verbs: string[] = Array.isArray(picked) ? picked : picked ? [picked] : []
      const parsed = parseMissionKey(missionKey)
      if (!verbs.length || !parsed) return

      const dirs = [
        ...new Set(verbs.map(v => VERB_DIR[v]).filter(Boolean) as string[]),
      ]

      /* AI가 오늘 활동을 12자 키워드로 뽑는다 */
      let keywords: { keyword: string; field: string }[] = []
      try {
        const fields = await loadFields()
        const { data: kw } = await supabase.functions.invoke('jinro-keyword', {
          body: {
            mission_title: workbook?.title ?? '',
            subject: ctx?.current?.subject ?? null,
            answers: draft,
            fields,
          },
        })
        keywords = kw?.items ?? []
      } catch (e) {
        console.error('[jinro-keyword]', e)
      }

      const { error: tallyErr } = await supabase
        .from('jinro_tally')
        .upsert(
          {
            student_id: studentId,
            mission_key: missionKey,
            grade: parsed.grade,
            month: parsed.month,
            week: parsed.week,
            verbs,
            dirs,
            keywords,
          },
          { onConflict: 'student_id,mission_key' },
        )
      if (tallyErr) console.error('[jinro_tally]', tallyErr)
    },
    onSuccess: () => {
      showToast('워크북을 제출했어요')
      qc.invalidateQueries({ queryKey: ['mission-workbook-answer', missionKey, studentId] })
      qc.invalidateQueries({ queryKey: ['jinro-tally'] })
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

  const filledCount = useMemo(
    () => Object.keys(draft).filter(k => isFilled(draft[k])).length,
    [draft],
  )

  const sectionDone = useMemo(() => {
    return sections.map(s =>
      Object.keys(draft).some(k => k.startsWith(`${s.id}.`) && isFilled(draft[k])),
    )
  }, [sections, draft])

  if (isLoading) {
    return <div className="p-10 text-center text-[14px]" style={{ color: C.muted }}>불러오는 중…</div>
  }

  if (!workbook) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white px-5 text-center">
        <div className="flex items-center gap-2" aria-hidden>
          {[0, 1, 2, 3, 4].map(i => (
            <span key={i} className="rounded-full" style={{ width: 10, height: 10, background: C.track }} />
          ))}
        </div>
        <p className="mt-6 text-[18px] font-extrabold" style={{ color: C.ink }}>워크북을 준비하고 있어요</p>
        <p className="mt-2 text-[13px]" style={{ color: C.faint }}>
          {ctx ? `${ctx.grade} ${ctx.month} ${ctx.weeks[ctx.weekIndex]?.label}` : missionKey}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-7 h-11 rounded-full px-6 text-[13px] font-bold"
          style={{ background: '#fff', color: C.muted, border: `1px solid ${C.track}` }}
        >
          로드맵으로 돌아가기
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
  const doneCount = sectionDone.filter(Boolean).length

  const stateOf = (i: number): StationState =>
    i === idx ? 'now' : sectionDone[i] ? 'done' : 'todo'

  const goStep = (i: number) => { setStep(i); goTop() }

  return (
    <div className="relative h-full overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-[1040px] px-5 pb-16 pt-5">
        <div ref={topRef} />

        {/* ── 상단 줄 ─────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full px-1 py-1 text-[13px] font-semibold hover:underline"
            style={{ color: C.muted }}
          >
            ← 진로 로드맵
          </button>
          <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: C.faint }}>
            <span
              className="rounded-full"
              style={{
                width: 8,
                height: 8,
                background: saveState === 'saving' ? '#F59E0B' : submitted ? C.greenDeep : C.green,
              }}
            />
            {saveState === 'saving'
              ? '저장하고 있어요'
              : saveState === 'saved'
                ? '저장했어요'
                : submitted ? '제출 완료' : '적으면 자동으로 저장돼요'}
          </div>
        </div>

        {/* ── 제목 ──────────────────────────────── */}
        <header className="mt-6">
          <p className="text-[13px] font-bold" style={{ color: C.greenDeep }}>
            {ctx
              ? `${ctx.grade} ${ctx.month} ${week?.label ?? ''}${week?.subject ? ` ${week.subject}` : ''}`
              : '중등 워크북'}
          </p>
          <h1 className="mt-1.5 text-[28px] font-extrabold leading-tight tracking-[-0.03em]" style={{ color: C.ink }}>
            {workbook.title.replace(/^.*?—\s*/, '')}
          </h1>
          {workbook.intro && (
            <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed" style={{ color: C.muted }}>
              {workbook.intro}
            </p>
          )}
          {ctx?.output && (
            <p className="mt-3 text-[12.5px]" style={{ color: C.faint }}>
              이번 달에 남기는 것 <b className="font-bold" style={{ color: C.greenDeep }}>{ctx.output}</b>
            </p>
          )}
        </header>

        {/* ── 이번 달 길 (주차 4개) ────────────────── */}
        {ctx && (
          <nav className="relative mt-8" aria-label="이번 달 주차">
            <span
              aria-hidden
              className="absolute rounded-full"
              style={{
                top: 17,
                left: `${50 / ctx.weeks.length}%`,
                right: `${50 / ctx.weeks.length}%`,
                height: 6,
                background: C.track,
              }}
            />
            <div className="relative flex">
              {ctx.weeks.map((w, i) => {
                const on = i === ctx.weekIndex
                return (
                  <button
                    key={w.key}
                    onClick={() => navigate(`/middle-student/workbook/${w.key}`)}
                    className="flex flex-1 flex-col items-center text-center"
                    aria-current={on ? 'step' : undefined}
                  >
                    <Station label={i + 1} state={on ? 'now' : 'todo'} size={40} />
                    <span
                      className="mt-2 text-[13px] font-bold leading-tight"
                      style={{ color: on ? C.greenDeep : C.faint }}
                    >
                      {w.subject ?? w.label}
                    </span>
                    <span className="mt-0.5 text-[11px]" style={{ color: on ? C.muted : '#C4C9D0' }}>
                      {on ? '지금 여기' : w.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </nav>
        )}

        <div className="my-8 h-px" style={{ background: C.soft }} />

        <div className="grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">

          {/* ── 오늘의 길 (화면 목록) ────────────────── */}
          <aside className="lg:sticky lg:top-4">
            <div className="mb-3 flex items-baseline justify-between">
              <strong className="text-[13px] font-bold" style={{ color: C.ink }}>오늘의 길</strong>
              <span className="text-[12px] font-semibold" style={{ color: C.faint }}>
                {doneCount} / {total}
              </span>
            </div>

            {/* 넓은 화면 — 세로 길 */}
            <ol className="relative hidden lg:block">
              <span
                aria-hidden
                className="absolute rounded-full"
                style={{ left: 13, top: 16, bottom: 16, width: 4, background: C.track }}
              />
              {sections.map((s, i) => {
                const st = stateOf(i)
                const star = s.variant === 'output'
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => goStep(i)}
                      className="flex w-full items-center gap-3 py-1.5 text-left"
                    >
                      <Station label={star ? '★' : st === 'done' ? '✓' : i + 1} state={st} size={30} />
                      <span
                        className="line-clamp-2 text-[13px] leading-snug"
                        style={{
                          color: st === 'now' ? C.ink : st === 'done' ? C.muted : C.faint,
                          fontWeight: st === 'now' ? 700 : 500,
                        }}
                      >
                        {s.title}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>

            {/* 좁은 화면 — 가로 길 */}
            <div className="flex items-center overflow-x-auto pb-1 lg:hidden">
              {sections.map((s, i) => {
                const st = stateOf(i)
                const star = s.variant === 'output'
                return (
                  <div key={s.id} className="flex flex-shrink-0 items-center">
                    <button onClick={() => goStep(i)} title={s.title}>
                      <Station label={star ? '★' : st === 'done' ? '✓' : i + 1} state={st} size={30} />
                    </button>
                    {i < total - 1 && (
                      <span style={{ width: 14, height: 4, background: C.track }} />
                    )}
                  </div>
                )
              })}
            </div>
          </aside>

          {/* ── 지금 화면 ───────────────────────────── */}
          <main className="min-w-0">
            <SectionView
              section={section}
              index={idx}
              total={total}
              fields={workFields}
              coachFields={coachFields}
              draft={draft}
              setValue={setValue}
              readOnly={readOnly}
            />

            {/* 이동 */}
            <div className="mt-10 flex gap-3">
              <button
                disabled={idx === 0}
                onClick={() => goStep(idx - 1)}
                className="h-12 rounded-full px-6 text-[14px] font-bold disabled:opacity-40"
                style={{ background: '#fff', color: C.muted, border: `1px solid ${C.track}` }}
              >
                이전
              </button>
              {!isLast ? (
                <button
                  onClick={() => goStep(idx + 1)}
                  className="h-12 flex-1 rounded-full text-[14px] font-bold text-white"
                  style={{ background: C.green }}
                >
                  다음 정거장으로
                </button>
              ) : submitted ? (
                <button
                  disabled
                  className="h-12 flex-1 rounded-full text-[14px] font-bold"
                  style={{ background: C.soft, color: C.faint }}
                >
                  제출 완료
                </button>
              ) : (
                <button
                  disabled={submit.isPending}
                  onClick={() => { if (confirm('제출하면 고칠 수 없어요. 제출할까요?')) submit.mutate() }}
                  className="h-12 flex-1 rounded-full text-[14px] font-bold text-white disabled:opacity-60"
                  style={{ background: C.greenDeep }}
                >
                  {submit.isPending ? '제출하고 정리하는 중…' : '다 했어요, 제출하기'}
                </button>
              )}
            </div>
            <p className="mt-3 text-center text-[12px]" style={{ color: C.faint }}>
              적은 칸 {filledCount}개 · 내 활동 기록으로 남아요
            </p>
          </main>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full px-5 py-3 text-[13px] font-bold"
          style={{ background: C.greenDeep, color: '#fff' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* 지금 화면                                                          */
/* ================================================================== */

function SectionView({
  section, index, total, fields, coachFields, draft, setValue, readOnly,
}: {
  section: Section
  index: number
  total: number
  fields: Field[]
  coachFields: Field[]
  draft: Record<string, any>
  setValue: (k: string, v: any) => void
  readOnly: boolean
}) {
  const v = section.variant ?? 'plain'
  const kicker =
    v === 'output' ? '오늘 만든 것' : v === 'next' ? '다음 예고' : `${index + 1}번째 정거장 · 전체 ${total}개`

  return (
    <section>
      <div className="flex items-center gap-4">
        <Station label={v === 'output' ? '★' : index + 1} state="now" size={48} />
        <div className="min-w-0">
          <p className="text-[12px] font-semibold" style={{ color: C.faint }}>{kicker}</p>
          <h2 className="mt-0.5 text-[22px] font-extrabold leading-snug tracking-[-0.02em]" style={{ color: C.ink }}>
            {section.title}
          </h2>
        </div>
      </div>

      {(section.desc || coachFields.length > 0) && (
        <div className="mt-5 rounded-2xl px-5 py-4" style={{ background: C.panel }}>
          <p className="text-[12px] font-bold" style={{ color: C.greenDeep }}>생각 도우미</p>
          {section.desc && (
            <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: C.muted }}>{section.desc}</p>
          )}
          {coachFields.map(f => (
            <div key={f.id} className="mt-3">
              {f.label && (
                <p className="mb-1.5 text-[12px] font-bold" style={{ color: C.ink }}>{f.label}</p>
              )}
              <ol className="grid gap-1.5">
                {(f.lines ?? []).map((l, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: '#fff', border: `1.5px solid ${C.greenLine}`, color: C.greenDeep }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px] leading-relaxed" style={{ color: C.muted }}>{l}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      {fields.length > 1 && (
        <p className="mt-6 text-[12.5px]" style={{ color: C.faint }}>
          {fields.length}가지를 적어요. 빈칸은 나중에 채워도 돼요.
        </p>
      )}

      <div className="mt-2">
        {fields.map((f, i) => (
          <FieldRow
            key={f.id}
            field={f}
            order={i}
            first={i === 0}
            sectionId={section.id}
            draft={draft}
            setValue={setValue}
            readOnly={readOnly}
          />
        ))}
      </div>
    </section>
  )
}

/* ================================================================== */
/* 필드                                                               */
/* ================================================================== */

const INPUT =
  'block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[15px] outline-none transition ' +
  'focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 disabled:bg-gray-50'

const inputText: CSSProperties = { color: C.ink, fontWeight: 500, lineHeight: 1.6 }

function Dot({ on, children, size = 24 }: { on: boolean; children: ReactNode; size?: number }) {
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
      style={{
        width: size,
        height: size,
        background: on ? C.green : '#fff',
        border: `2px solid ${on ? C.green : C.track}`,
        color: on ? '#fff' : C.faint,
      }}
    >
      {children}
    </span>
  )
}

function FieldRow({
  field: f, order, first, sectionId, draft, setValue, readOnly,
}: {
  field: Field
  order: number
  first: boolean
  sectionId: string
  draft: Record<string, any>
  setValue: (k: string, v: any) => void
  readOnly: boolean
}) {
  const [openHint, setOpenHint] = useState(false)
  const base = `${sectionId}.${f.id}`
  const get = (k: string) => draft[k] ?? ''
  const type = f.type ?? 'short'

  const answered = Object.keys(draft).some(
    k => (k === base || k.startsWith(`${base}.`)) && isFilled(draft[k]),
  )

  const wrap = (children: ReactNode) => (
    <article className="py-6" style={{ borderTop: first ? 'none' : `1px solid ${C.soft}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Dot on={answered}>{answered ? '✓' : order + 1}</Dot>
          {f.label && (
            <span className="text-[15px] font-bold leading-snug" style={{ color: C.ink }}>{f.label}</span>
          )}
        </div>
        {f.hint && (
          <button
            type="button"
            onClick={() => setOpenHint(o => !o)}
            className="flex-shrink-0 text-[12px] font-semibold"
            style={{ color: openHint ? C.greenDeep : C.faint }}
          >
            {openHint ? '힌트 닫기' : '힌트 보기'}
          </button>
        )}
      </div>

      {f.hint && openHint && (
        <p
          className="mt-2.5 rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed"
          style={{ background: C.greenBg, color: C.greenDeep }}
        >
          {f.hint}
        </p>
      )}

      <div className="mt-3.5 lg:pl-9">{children}</div>
    </article>
  )

  /* ---- 한 줄 / 숫자 ---- */
  if (type === 'short' || type === 'number') {
    return wrap(
      <div className="flex items-center gap-2">
        <input
          className={INPUT}
          style={{ ...inputText, width: type === 'number' ? 110 : '100%', textAlign: type === 'number' ? 'center' : 'left' }}
          type={type === 'number' ? 'number' : 'text'}
          max={f.max}
          value={get(base)}
          placeholder={f.placeholder ?? '여기에 적어보세요'}
          disabled={readOnly}
          onChange={e => setValue(base, e.target.value)}
        />
        {f.suffix && <span className="text-[14px] font-semibold" style={{ color: C.muted }}>{f.suffix}</span>}
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
          rows={f.rows ?? 3}
          maxLength={limit}
          className={INPUT}
          style={{ ...inputText, minHeight: 72, resize: 'vertical' }}
          value={val}
          placeholder={f.placeholder ?? '여기에 적어보세요'}
          disabled={readOnly}
          onChange={e => setValue(base, e.target.value)}
        />
        <div className="mt-1.5 flex justify-between px-0.5 text-[11.5px]" style={{ color: C.faint }}>
          <span>장면을 떠올려 구체적으로 적어요</span>
          <span>{val.length} / {limit}</span>
        </div>
      </>,
    )
  }

  /* ---- 번호 목록 ---- */
  if (type === 'lines') {
    return wrap(
      <div className="grid gap-2.5">
        {Array.from({ length: f.count ?? 3 }).map((_, i) => {
          const done = String(get(`${base}.${i}`)).trim() !== ''
          return (
            <div key={i} className="flex items-center gap-2.5">
              <Dot on={done} size={26}>{i + 1}</Dot>
              <input
                className={INPUT}
                style={inputText}
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
            <label
              key={i}
              className="flex items-center gap-1 rounded-full px-3.5 py-2"
              style={{ background: done ? C.greenBg : '#fff', border: `1.5px solid ${done ? C.green : C.track}` }}
            >
              <span className="text-[14px] font-bold" style={{ color: C.green }}>#</span>
              <input
                className="bg-transparent outline-none"
                style={{ width: 96, fontSize: 14, fontWeight: 600, color: C.ink, border: 0 }}
                value={get(`${base}.${i}`)}
                placeholder="키워드"
                disabled={readOnly}
                onChange={e => setValue(`${base}.${i}`, e.target.value)}
              />
            </label>
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
        <div className="grid gap-4">
          {Array.from({ length: rowCount }).map((_, r) => (
            <div key={r}>
              <p className="mb-1.5 text-[12.5px] font-bold" style={{ color: C.greenDeep }}>
                {f.firstColLabels ? f.firstColLabels[r] : `${r + 1}번`}
              </p>
              <div className="flex flex-wrap gap-2">
                {cols.slice(1).map((c, ci) => (
                  <div key={ci} style={{ flex: cols.length > 2 ? '1 1 140px' : '1 1 100%' }}>
                    <p className="mb-1 text-[11.5px]" style={{ color: C.faint }}>{c}</p>
                    <input
                      className={INPUT}
                      style={{ ...inputText, fontSize: 14, padding: '10px 12px' }}
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
          <div className="mt-3 flex items-center justify-end gap-2.5">
            <span className="text-[13px] font-bold" style={{ color: C.ink }}>모두 더하면</span>
            <input
              className={INPUT}
              style={{ ...inputText, width: 96, textAlign: 'center' }}
              value={get(`${base}.total`)}
              disabled={readOnly}
              onChange={e => setValue(`${base}.total`, e.target.value)}
            />
          </div>
        )}
      </>,
    )
  }

  /* ---- 점수 매기기 — 정거장처럼 누르는 동그라미 ---- */
  if (type === 'score') {
    const criteria = f.criteria ?? ['점수']
    const max = f.max ?? 5
    const labels = f.rowLabels ?? Array.from({ length: 5 }, (_, i) => String(i + 1))
    return wrap(
      <div className="grid gap-5">
        <p className="text-[12px]" style={{ color: C.faint }}>1점부터 {max}점까지 눌러서 점수를 줘요</p>
        {labels.map((lab, r) => {
          const sum = criteria.reduce((acc, _c, c) => {
            const n = Number(get(`${base}.${r}.${c}`))
            return acc + (isNaN(n) ? 0 : n)
          }, 0)
          return (
            <div key={r}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[14px] font-bold" style={{ color: C.ink }}>{lab}</span>
                <span className="text-[13px] font-bold" style={{ color: sum > 0 ? C.greenDeep : C.faint }}>
                  {sum}점
                </span>
              </div>
              <div className="grid gap-2">
                {criteria.map((c, ci) => {
                  const cur = Number(get(`${base}.${r}.${ci}`)) || 0
                  return (
                    <div key={ci} className="flex items-center gap-3">
                      <span className="flex-shrink-0 text-[12px]" style={{ width: 72, color: C.muted }}>{c}</span>
                      <div className="relative flex items-center">
                        <span
                          aria-hidden
                          className="absolute rounded-full"
                          style={{ left: 15, right: 15, height: 4, background: C.track }}
                        />
                        <div className="relative flex gap-2.5">
                          {Array.from({ length: max }, (_, i) => i + 1).map(n => {
                            const on = cur === n
                            const passed = cur > 0 && n < cur
                            return (
                              <button
                                key={n}
                                type="button"
                                disabled={readOnly}
                                onClick={() => setValue(`${base}.${r}.${ci}`, on ? '' : n)}
                                aria-pressed={on}
                                className="flex items-center justify-center rounded-full text-[12px] font-bold"
                                style={{
                                  width: 30,
                                  height: 30,
                                  background: on ? C.green : passed ? C.greenBg : '#fff',
                                  color: on ? '#fff' : passed ? C.greenDeep : C.faint,
                                  border: `2px solid ${on || passed ? C.green : C.track}`,
                                }}
                              >
                                {n}
                              </button>
                            )
                          })}
                        </div>
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
      <div className="py-4" style={{ borderTop: first ? 'none' : `1px solid ${C.soft}` }}>
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setValue(base, !on)}
          className="flex w-full items-center gap-3 text-left"
          aria-pressed={on}
        >
          <Dot on={on} size={26}>{on ? '✓' : ''}</Dot>
          <span className="text-[15px] font-bold" style={{ color: on ? C.greenDeep : C.ink }}>{f.label}</span>
        </button>
      </div>
    )
  }

  /* ---- 체크리스트 ---- */
  if (type === 'checks') {
    return wrap(
      <div className="grid gap-1">
        {(f.items ?? []).map((item, i) => {
          const on = draft[`${base}.${i}`] === true
          return (
            <button
              key={i}
              type="button"
              disabled={readOnly}
              onClick={() => setValue(`${base}.${i}`, !on)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-gray-50"
              aria-pressed={on}
            >
              <Dot on={on}>{on ? '✓' : ''}</Dot>
              <span className="text-[14px] leading-snug" style={{ color: on ? C.greenDeep : C.ink, fontWeight: on ? 700 : 500 }}>
                {item}
              </span>
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
    const limit = f.pick ?? 0
    const full = multi && limit > 0 && selected.length >= limit

    const toggle = (opt: string) => {
      if (readOnly) return
      if (!multi) { setValue(base, selected[0] === opt ? '' : opt); return }
      if (selected.includes(opt)) {
        setValue(base, selected.filter(s => s !== opt))
        return
      }
      if (full) return
      setValue(base, [...selected, opt])
    }

    return wrap(
      <>
        <p className="mb-2.5 text-[12px]" style={{ color: C.faint }}>
          {limit
            ? `${limit}개 골라요 · 지금 ${selected.length}개`
            : multi ? '여러 개 골라도 돼요' : '하나만 골라요'}
        </p>
        <div className="flex flex-wrap gap-2">
          {(f.options ?? []).map(opt => {
            const on = selected.includes(opt)
            const dim = !on && full
            return (
              <button
                key={opt}
                type="button"
                disabled={readOnly || dim}
                onClick={() => toggle(opt)}
                aria-pressed={on}
                className="rounded-full px-4 py-2.5 text-[13.5px] transition-colors"
                style={{
                  background: on ? C.green : '#fff',
                  color: on ? '#fff' : '#475569',
                  border: `1.5px solid ${on ? C.green : C.track}`,
                  fontWeight: on ? 700 : 500,
                  opacity: dim ? 0.35 : 1,
                  cursor: dim ? 'not-allowed' : 'pointer',
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
        {f.other && (
          <div className="mt-3">
            <p className="mb-1.5 text-[12px]" style={{ color: C.faint }}>직접 적고 싶으면</p>
            <input
              className={INPUT}
              style={inputText}
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
        className="flex items-center justify-between gap-3 py-4"
        style={{ borderTop: first ? 'none' : `1px solid ${C.soft}` }}
      >
        <span className="text-[15px] font-bold" style={{ color: C.ink }}>{f.label}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: max }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              disabled={readOnly}
              onClick={() => setValue(base, n === score ? 0 : n)}
              aria-label={`${n}점`}
              className="text-[26px] leading-none"
              style={{ color: n <= score ? C.green : C.track }}
            >
              ★
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ---- 빈칸 문장 — 밑줄 칸 ---- */
  if (type === 'sentence') {
    return wrap(
      <div className="grid gap-4">
        {(f.sentences ?? []).map((s, si) => {
          const parts = s.split('___')
          return (
            <div key={si}>
              {f.numbered && (
                <p className="mb-1 text-[12px] font-bold" style={{ color: C.greenDeep }}>{si + 1}번</p>
              )}
              <div
                className="flex flex-wrap items-center gap-x-1.5 gap-y-2"
                style={{ fontSize: 16, lineHeight: 2, color: C.ink, fontWeight: 500 }}
              >
                {parts.map((part, pi) => {
                  const k = `${base}.${si}.${pi}`
                  const has = String(get(k)).trim() !== ''
                  return (
                    <span key={pi} className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
                      <span>{part}</span>
                      {pi < parts.length - 1 && (
                        <input
                          className="bg-transparent outline-none focus:border-emerald-500"
                          style={{
                            borderBottom: `2px solid ${has ? C.green : C.track}`,
                            padding: '2px 6px',
                            fontSize: 16,
                            fontWeight: 700,
                            color: C.greenDeep,
                            minWidth: 130,
                          }}
                          value={get(k)}
                          placeholder="적어보세요"
                          disabled={readOnly}
                          onChange={e => setValue(k, e.target.value)}
                        />
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>,
    )
  }

  return null
}