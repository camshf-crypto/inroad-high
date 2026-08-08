import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { MIDDLE_ROADMAP } from '@/constants/middleRoadmap'

const THEME = {
  accent: '#10B981',
  accentDark: '#065F46',
  accentBg: '#ECFDF5',
  accentBorder: '#6EE7B7',
}

/**
 * blocks 구조 (mission_workbook.blocks)
 *
 * [
 *   { "id":"a1", "title":"활동 1. 경험 10개 떠올리기", "desc":"...",
 *     "fields":[
 *       { "id":"school", "label":"학교에서 기억나는 일", "type":"lines", "count":2 },
 *       { "id":"act",    "label":"내가 한 행동",        "type":"table",
 *         "columns":["경험","내가 한 행동"], "rows":10 },
 *       { "id":"tags",   "label":"자주 한 행동 3개",    "type":"tags", "count":3 },
 *       { "id":"memo",   "label":"왜 그렇게 했나요?",   "type":"long" },
 *       { "id":"one",    "label":"한 문장으로",         "type":"short" }
 *     ]
 *   }
 * ]
 */
type FieldType = 'short' | 'long' | 'lines' | 'tags' | 'table'

interface Field {
  id: string
  label?: string
  type?: FieldType
  hint?: string
  placeholder?: string
  count?: number
  columns?: string[]
  rows?: number
}

interface Section {
  id: string
  title: string
  desc?: string
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
  { id: 's1', title: '작성란', fields: [{ id: 'note', type: 'long', placeholder: '여기에 작성해 주세요.' }] },
]

export default function Workbook() {
  const { missionKey = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [draft, setDraft] = useState<Record<string, any>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [step, setStep] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded = useRef(false)

  // ── 이 미션이 속한 달 + 형제 주차들 ──
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

  // ── 워크북 ──
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

  // ── 내 답안 ──
  const { data: answer } = useQuery({
    queryKey: ['mission-workbook-answer', missionKey],
    enabled: !!missionKey,
    queryFn: async (): Promise<AnswerRow | null> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase
        .from('mission_workbook_answer')
        .select('answers, submitted_at')
        .eq('student_id', user.id)
        .eq('mission_key', missionKey)
        .maybeSingle()
      if (error) throw error
      return data as AnswerRow | null
    },
  })

  // 주차 바뀌면 초기화
  useEffect(() => {
    loaded.current = false
    setStep(0)
    setSaveState('idle')
  }, [missionKey])

  useEffect(() => {
    if (loaded.current || answer === undefined) return
    setDraft((answer?.answers as Record<string, any>) ?? {})
    loaded.current = true
  }, [answer])

  // ── 저장 ──
  const saveMutation = useMutation({
    mutationFn: async (p: { answers: Record<string, any>; submit?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요해요')
      const row: Record<string, unknown> = {
        student_id: user.id,
        mission_key: missionKey,
        answers: p.answers,
        updated_at: new Date().toISOString(),
      }
      if (p.submit) row.submitted_at = new Date().toISOString()
      const { error } = await supabase
        .from('mission_workbook_answer')
        .upsert(row, { onConflict: 'student_id,mission_key' })
      if (error) throw error
    },
    onSuccess: () => {
      setSaveState('saved')
      qc.invalidateQueries({ queryKey: ['mission-workbook-answer', missionKey] })
    },
    onError: () => setSaveState('idle'),
  })

  const push = (next: Record<string, any>) => {
    setDraft(next)
    setSaveState('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => saveMutation.mutate({ answers: next }), 1500)
  }

  const setVal = (id: string, v: any) => push({ ...draft, [id]: v })

  const setIdx = (id: string, i: number, v: string) => {
    const arr: string[] = Array.isArray(draft[id]) ? [...draft[id]] : []
    arr[i] = v
    push({ ...draft, [id]: arr })
  }

  const setCell = (id: string, r: number, c: number, v: string) => {
    const grid: string[][] = Array.isArray(draft[id]) ? draft[id].map((x: any) => [...(x ?? [])]) : []
    while (grid.length <= r) grid.push([])
    grid[r][c] = v
    push({ ...draft, [id]: grid })
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // 옛 형식(fields 없는 평평한 배열)도 안 터지게 정규화
  const sections: Section[] = useMemo(() => {
    const raw = workbook?.blocks
    if (!Array.isArray(raw) || raw.length === 0) return FALLBACK
    const ok = raw.filter(s => s && Array.isArray((s as any).fields)) as Section[]
    if (ok.length) return ok
    // 전부 옛 형식이면 한 활동으로 감싸기
    return [{
      id: 'legacy',
      title: workbook?.title ?? '작성란',
      fields: raw as unknown as Field[],
    }]
  }, [workbook])

  const cur = sections[Math.min(step, sections.length - 1)] ?? FALLBACK[0]
  const submitted = !!answer?.submitted_at
  const last = step >= sections.length - 1

  const inputCls = 'w-full rounded-lg border px-3 py-2.5 text-[13px] focus:outline-none focus:border-emerald-400'

  // ── 필드 하나 ──
  const renderField = (f: Field) => {
    const t = f.type ?? 'long'

    if (t === 'table') {
      const cols = f.columns ?? ['', '']
      const rows = f.rows ?? 5
      return (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full border-collapse" style={{ minWidth: cols.length * 130 }}>
            <thead>
              <tr>
                {cols.map((c, i) => (
                  <th key={i} className="text-[11px] font-bold text-ink-secondary text-left pb-1.5 px-1">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r}>
                  {cols.map((_, c) => (
                    <td key={c} className="px-1 pb-1.5">
                      <input
                        value={draft[f.id]?.[r]?.[c] ?? ''}
                        onChange={e => setCell(f.id, r, c, e.target.value)}
                        className="w-full rounded-md border px-2 py-1.5 text-[12.5px] focus:outline-none focus:border-emerald-400"
                        style={{ borderColor: '#E5E7EB' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (t === 'tags') {
      return (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: f.count ?? 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[13px] font-bold" style={{ color: THEME.accent }}>#</span>
              <input
                value={draft[f.id]?.[i] ?? ''}
                onChange={e => setIdx(f.id, i, e.target.value)}
                className="rounded-lg border px-2.5 py-1.5 text-[13px] w-28 focus:outline-none focus:border-emerald-400"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>
          ))}
        </div>
      )
    }

    if (t === 'lines') {
      return (
        <div className="space-y-1.5">
          {Array.from({ length: f.count ?? 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] text-ink-muted w-5 flex-shrink-0 text-right">{i + 1}.</span>
              <input
                value={draft[f.id]?.[i] ?? ''}
                onChange={e => setIdx(f.id, i, e.target.value)}
                placeholder={f.placeholder}
                className={inputCls}
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>
          ))}
        </div>
      )
    }

    if (t === 'short') {
      return (
        <input
          value={draft[f.id] ?? ''}
          onChange={e => setVal(f.id, e.target.value)}
          placeholder={f.placeholder}
          className={inputCls}
          style={{ borderColor: '#E5E7EB' }}
        />
      )
    }

    return (
      <textarea
        value={draft[f.id] ?? ''}
        onChange={e => setVal(f.id, e.target.value)}
        placeholder={f.placeholder}
        rows={4}
        className={`${inputCls} leading-[1.7] resize-y`}
        style={{ borderColor: '#E5E7EB' }}
      />
    )
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-7 box-border font-sans text-ink">
      <div className="max-w-3xl mx-auto pb-10">

        <button
          onClick={() => navigate('/middle-student/roadmap')}
          className="text-[12px] text-ink-muted hover:text-ink mb-4"
        >
          ← 로드맵으로
        </button>

        {/* 달 헤더 */}
        <div
          className="rounded-2xl px-5 py-4 mb-3"
          style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}` }}
        >
          <div className="text-[11px] font-bold mb-1" style={{ color: THEME.accentDark }}>
            {ctx ? `${ctx.grade} · ${ctx.month}` : '워크북'}
          </div>
          <h1 className="text-[18px] font-extrabold text-ink tracking-tight">{ctx?.theme ?? ''}</h1>
          {ctx?.output && (
            <div className="text-[11px] text-ink-secondary mt-1.5">
              이 달에 남기는 것 — <b>{ctx.output}</b>
            </div>
          )}
        </div>

        {/* 주차 탭 */}
        {ctx && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {ctx.weeks.map((w, i) => {
              const active = i === ctx.weekIndex
              return (
                <button
                  key={w.key}
                  onClick={() => navigate(`/middle-student/workbook/${w.key}`)}
                  className="flex-shrink-0 rounded-xl px-3.5 py-2 text-left transition-all"
                  style={{
                    background: active ? THEME.accent : '#fff',
                    border: `1px solid ${active ? THEME.accent : '#E5E7EB'}`,
                    minWidth: 130,
                  }}
                >
                  <div
                    className="text-[10px] font-bold mb-0.5"
                    style={{ color: active ? 'rgba(255,255,255,.85)' : '#9CA3AF' }}
                  >
                    {w.label}{w.subject ? ` · ${w.subject}` : ''}
                  </div>
                  <div
                    className="text-[11.5px] font-bold leading-[1.35] line-clamp-2"
                    style={{ color: active ? '#fff' : '#1a1a1a' }}
                  >
                    {w.text}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-[13px] text-ink-muted">불러오는 중…</div>
        ) : !workbook ? (
          <div className="rounded-2xl border border-line bg-white px-5 py-16 text-center">
            <div className="text-3xl mb-3">📝</div>
            <div className="text-[15px] font-bold text-ink mb-1.5">이 주차 워크북은 준비 중이에요</div>
            <div className="text-[12px] text-ink-secondary">다른 주차를 눌러보세요.</div>
          </div>
        ) : (
          <>
            {/* 오늘의 한 줄 / 미션 */}
            {workbook.intro && (
              <div
                className="rounded-2xl px-5 py-4 mb-4"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
              >
                <div className="text-[12.5px] text-amber-900 leading-[1.75] whitespace-pre-wrap">
                  {workbook.intro}
                </div>
              </div>
            )}

            {/* 활동 단계 표시 */}
            <div className="flex items-center gap-1.5 mb-3">
              {sections.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setStep(i)}
                  className="h-1.5 rounded-full flex-1 transition-all"
                  style={{ background: i <= step ? THEME.accent : '#E5E7EB' }}
                  title={s.title}
                />
              ))}
              <span className="text-[10.5px] text-ink-muted ml-1.5 flex-shrink-0">
                {step + 1}/{sections.length}
              </span>
            </div>

            {/* 현재 활동 */}
            <div className="rounded-2xl border border-line bg-white px-6 py-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-[15px] font-extrabold text-ink tracking-tight">{cur.title}</div>
                  {cur.desc && (
                    <div className="text-[11.5px] text-ink-secondary mt-1 leading-[1.6] whitespace-pre-wrap">
                      {cur.desc}
                    </div>
                  )}
                </div>
                <div
                  className="text-[11px] font-medium flex-shrink-0"
                  style={{ color: saveState === 'saved' ? THEME.accent : '#9CA3AF' }}
                >
                  {saveState === 'saving' ? '저장 중…' : saveState === 'saved' ? '✓ 저장됨' : ''}
                </div>
              </div>

              {(cur.fields ?? []).map(f => (
                <div key={f.id} className="mb-5 last:mb-0">
                  {f.label && (
                    <label className="block text-[12.5px] font-bold text-ink mb-1">{f.label}</label>
                  )}
                  {f.hint && <div className="text-[11px] text-ink-muted mb-1.5">{f.hint}</div>}
                  {renderField(f)}
                </div>
              ))}
            </div>

            {/* 이동 + 제출 */}
            <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-white via-white to-transparent">
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(s => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="rounded-xl px-5 py-3.5 text-[13px] font-bold border disabled:opacity-40"
                  style={{ borderColor: '#E5E7EB', background: '#fff' }}
                >
                  이전
                </button>

                {last ? (
                  <button
                    onClick={() => {
                      if (timer.current) clearTimeout(timer.current)
                      saveMutation.mutate({ answers: draft, submit: true })
                    }}
                    disabled={saveMutation.isPending}
                    className="flex-1 rounded-xl py-3.5 text-[13.5px] font-bold text-white disabled:opacity-50 shadow-lg"
                    style={{ background: THEME.accent }}
                  >
                    {saveMutation.isPending ? '저장 중…' : submitted ? '다시 제출하기' : '제출하기'}
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    className="flex-1 rounded-xl py-3.5 text-[13.5px] font-bold text-white shadow-lg"
                    style={{ background: THEME.accent }}
                  >
                    다음 활동 ›
                  </button>
                )}
              </div>
              {submitted && (
                <div className="text-[11px] text-ink-muted text-center mt-2">
                  제출 완료 — 선생님이 확인할 수 있어요
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}