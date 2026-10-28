// src/pages/admin/_pages/students/detail/high-tabs/SchoolTaskReview.tsx
// 고등 수행평가 > "학교 과제" 탭 — 학생이 찍어 올린 학교 과제를 선생님이 첨삭하는 화면
//   왼쪽: 학교 과제 목록 / 오른쪽: 단계·회차 기록 → [첨삭하기] 누르면 전체 화면 첨삭
//   전체 화면: 학생 제출본(드래그해서 코멘트) + 오른쪽 코멘트·세특 + 아래 AI 첨삭 / 재작성 요청 / 회차 완료
//   AI 코멘트는 숨김(visible_to_student=false)으로 들어오고, 선생님이 켠 것만 학생에게 보인다

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Task = any
type Draft = any
type Cm = any
export type TaskTab = 'school' | 'academy' | 'task'

const STATUS: Record<string, { label: string; cls: string }> = {
  submitted: { label: '첨삭 대기', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  revise: { label: '재작성 요청', cls: 'bg-brand-high-pale text-brand-high-dark border-brand-high-light' },
  done: { label: '회차 완료', cls: 'bg-green-50 text-green-700 border-green-200' },
}
const statusOf = (s: string) => STATUS[s] ?? { label: '학생 작성 중', cls: 'bg-gray-50 text-ink-secondary border-line' }
const STEPS = ['자료 준비', '분석·질의응답', '학습가이드', '초안·채점', '선생님 첨삭', '완료']
const STEP_OF: Record<string, number> = { draft: 0, analyzed: 1, qa: 1, guide: 2, writing: 3, submitted: 4, revise: 4, done: 6 }
const IMP = ['필수', '권장', '제안']
const impCls = (i: string) => i === '필수' ? 'bg-orange-50 text-orange-700 border-orange-200' : i === '권장' ? 'bg-brand-high-pale text-brand-high-dark border-brand-high-light' : 'bg-gray-50 text-ink-secondary border-line'
const fmt = (d?: string) => d ? new Date(d).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

async function callAI(action: string, body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke('school-task-ai', { body: { action, ...body } })
  if (error) {
    let msg = error.message
    try { const j = await (error as any).context?.json(); if (j?.error) msg = j.error } catch {}
    throw new Error(msg)
  }
  if (!data?.success) throw new Error(data?.error || 'AI 처리 실패')
  return data
}

// =====================================================================
// 탭 패널 (목록 + 요약) — SuhaengTab 에서 categoryTab === 'task' 일 때 이 화면을 통째로 보여준다
// =====================================================================
export default function SchoolTaskPanel({ student, onTab }: { student: any; onTab: (t: TaskTab) => void }) {
  const studentId = student?.id ? String(student.id) : ''
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [open, setOpen] = useState<number | null>(null) // 열린 회차

  const loadList = async () => {
    if (!studentId) return
    const { data } = await supabase.from('high_school_task')
      .select('id, title, subject, task_type, status, current_round, submitted_at, updated_at, source_files, source_text, setuk_text, interview_qs')
      .eq('student_id', studentId).order('updated_at', { ascending: false })
    setTasks(data ?? [])
    setLoading(false)
    if (!selId && data?.length) setSelId((data.find(t => t.status === 'submitted') ?? data[0]).id)
  }
  useEffect(() => { loadList() }, [studentId])

  const loadDrafts = async () => {
    if (!selId) return
    const { data } = await supabase.from('high_school_task_draft').select('id, round, submitted_at, score').eq('task_id', selId).order('round')
    setDrafts(data ?? [])
  }
  useEffect(() => { loadDrafts() }, [selId])

  const sel = tasks.find(t => t.id === selId)
  const waiting = tasks.filter(t => t.status === 'submitted').length
  const doneN = tasks.filter(t => t.status === 'done').length
  const submittedDrafts = drafts.filter(d => d.submitted_at)

  const tabBtn = (key: TaskTab, label: string) => (
    <button onClick={() => onTab(key)}
      className={`flex-1 py-2.5 text-[12px] font-bold border-b-2 flex items-center justify-center gap-1 ${key === 'task' ? 'text-brand-high-dark border-brand-high bg-brand-high-pale' : 'text-gray-400 border-transparent'}`}>
      {label}{key === 'task' && waiting > 0 && <span className="text-[10px] font-extrabold text-white bg-orange-500 rounded-full px-1.5">{waiting}</span>}
    </button>
  )

  return (
    <>
      <div className="flex gap-4 h-full overflow-hidden">
        {/* 왼쪽 목록 */}
        <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[16px]">✏️</span>
              <div className="text-[15px] font-extrabold text-ink tracking-tight">수행평가</div>
            </div>
            <div className="text-[11px] font-medium text-ink-secondary">
              학교 과제 <span className="font-bold text-brand-high">{tasks.length}건</span>
              <span className="mx-1.5 text-ink-muted">·</span>
              첨삭 대기 <span className="font-bold text-amber-700">{waiting}건</span>
              <span className="mx-1.5 text-ink-muted">·</span>
              완료 <span className="font-bold text-brand-high-dark">{doneN}건</span>
            </div>
          </div>
          <div className="flex border-b border-line flex-shrink-0">
            {tabBtn('academy', '📋 학원')}
            {tabBtn('task', '📸 학교 과제')}
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {loading ? <div className="text-center py-10 text-ink-muted text-[12px]">불러오는 중...</div>
              : tasks.length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  <div className="text-3xl mb-2">📭</div>
                  <div className="font-medium">학생이 올린 학교 과제가 없어요</div>
                  <div className="mt-1">학생 화면 수행평가 → 내 학교 과제에서 올려요</div>
                </div>
              ) : tasks.map(t => {
                const on = t.id === selId, st = statusOf(t.status)
                return (
                  <button key={t.id} onClick={() => setSelId(t.id)}
                    className={`w-full rounded-xl px-3 py-3 mb-1.5 text-left border-[1.5px] transition-all ${on ? 'border-brand-high bg-brand-high-pale shadow-[0_2px_8px_rgba(37,99,235,0.15)]' : 'border-gray-200 bg-white'}`}>
                    <div className="text-[13px] font-extrabold leading-[1.35] mb-0.5 truncate" style={{ color: on ? '#1E3A8A' : '#1a1a1a' }}>{t.title || '제목 없는 과제'}</div>
                    <div className="text-[11px] font-medium text-ink-muted mb-1.5">{t.subject || '과목 미정'}{t.task_type ? ` · ${t.task_type}` : ''}{t.current_round ? ` · ${t.current_round}차` : ''}</div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{t.status === 'submitted' ? '⏳ ' : ''}{st.label}</span>
                  </button>
                )
              })}
          </div>
        </div>

        {/* 오른쪽 요약 */}
        <div className="flex-1 min-w-0 bg-white border border-line rounded-2xl overflow-y-auto shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          {!sel ? <div className="h-full flex items-center justify-center text-ink-muted text-[13px]">왼쪽에서 과제를 골라 주세요</div> : (
            <>
              <div className="px-6 py-5 border-b border-line flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  {sel.task_type && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-brand-high-pale text-brand-high-dark">{sel.task_type}</span>}
                  <div className="text-[19px] font-extrabold text-ink mt-2">{sel.title || '제목 없는 과제'}</div>
                  <div className="text-[12px] text-ink-muted mt-1">{sel.subject} · 학생이 올린 학교 과제{sel.submitted_at ? ` · 최근 제출 ${fmt(sel.submitted_at)}` : ''}</div>
                </div>
                <div className="flex gap-2">
                  <SourceButton task={sel} />
                  <button disabled={!submittedDrafts.length} onClick={() => setOpen(submittedDrafts[submittedDrafts.length - 1].round)}
                    className="h-10 px-4 rounded-lg bg-brand-high hover:bg-brand-high-hover text-white text-[13px] font-bold disabled:opacity-40">
                    ✏️ {sel.status === 'submitted' ? '첨삭하기' : '첨삭 화면 열기'}
                  </button>
                </div>
              </div>
              <div className="flex px-6 pt-6 pb-2">
                {STEPS.map((n, i) => {
                  const cur = STEP_OF[sel.status] ?? 0, dn = i < cur, on = i === cur
                  return (
                    <div key={n} className="flex-1 text-center relative text-[12px] font-bold" style={{ color: dn ? '#334155' : on ? '#1E3A8A' : '#94A3B8' }}>
                      {i > 0 && <div className="absolute top-[15px] right-1/2 w-full h-[2px]" style={{ background: dn || on ? '#2563EB' : '#E2E8F0' }} />}
                      <div className="relative z-[1] w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center border-2"
                        style={{ background: dn ? '#2563EB' : '#fff', borderColor: dn || on ? '#2563EB' : '#E2E8F0', color: dn ? '#fff' : on ? '#2563EB' : '#94A3B8' }}>{dn ? '✓' : i + 1}</div>
                      {n}
                    </div>
                  )
                })}
              </div>
              <div className="px-6 py-5">
                <div className="text-[12px] font-bold text-ink-muted mb-2">회차 기록</div>
                {submittedDrafts.length === 0 && <div className="text-[13px] text-ink-muted border border-dashed border-line rounded-xl p-5 text-center">학생이 아직 선생님께 제출하지 않았어요 · 지금 단계: {statusOf(sel.status).label}</div>}
                {submittedDrafts.map(d => (
                  <div key={d.id} className="flex items-center gap-3 border border-line rounded-xl px-4 py-3 mb-2">
                    <span className="w-9 h-9 rounded-lg bg-brand-high-pale text-brand-high-dark font-extrabold text-[13px] flex items-center justify-center">{d.round}차</span>
                    <div className="flex-1 text-[13px]">
                      <b>{d.round}차 제출본</b><span className="text-ink-muted"> · {fmt(d.submitted_at)}{d.score?.total != null ? ` · AI 채점 ${d.score.total}점` : ''}</span>
                    </div>
                    <button onClick={() => setOpen(d.round)} className="h-8 px-3 rounded-lg border border-line text-[12px] font-semibold text-ink-secondary hover:bg-gray-50">열기 ›</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {sel && open != null && (
        <ReviewScreen task={sel} startRound={open}
          onClose={async () => { setOpen(null); await loadList(); await loadDrafts() }} />
      )}
    </>
  )
}

// 학생이 올린 안내문 원본 (사진·PDF)
function SourceButton({ task }: { task: Task }) {
  const [show, setShow] = useState(false)
  const [urls, setUrls] = useState<{ name: string; url: string | null; type: string }[]>([])
  const openIt = async () => {
    setShow(true)
    const files = Array.isArray(task.source_files) ? task.source_files : []
    const out = await Promise.all(files.map(async (f: any) => {
      const { data } = await supabase.storage.from('school-task-files').createSignedUrl(f.path, 600)
      return { name: f.name, type: f.type, url: data?.signedUrl ?? null }
    }))
    setUrls(out)
  }
  return (
    <>
      <button onClick={openIt} className="h-10 px-4 rounded-lg border border-line text-[13px] font-semibold text-ink-secondary hover:bg-gray-50">🖼️ 안내문 원본</button>
      {show && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onClick={() => setShow(false)}>
          <div className="bg-white rounded-2xl w-[760px] max-w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[17px] font-extrabold">안내문 원본</div>
              <button onClick={() => setShow(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100">✕</button>
            </div>
            {urls.map((f, i) => !f.url
              ? <div key={i} className="text-[13px] text-red-600 mb-2">{f.name}: 파일을 열 권한이 없어요 (저장소 권한 확인 필요)</div>
              : f.type === 'application/pdf'
                ? <a key={i} href={f.url} target="_blank" rel="noreferrer" className="block text-[13px] font-bold text-brand-high underline mb-2">📄 {f.name} 열기</a>
                : <img key={i} src={f.url} alt={f.name} className="w-full rounded-lg border border-line mb-3" />)}
            {task.source_text && <div className="text-[13px] leading-[1.75] whitespace-pre-wrap bg-gray-50 rounded-lg p-4 mt-2">{task.source_text}</div>}
            {!urls.length && !task.source_text && <div className="text-[13px] text-ink-muted">올린 안내문이 없어요.</div>}
          </div>
        </div>
      )}
    </>
  )
}

// =====================================================================
// 전체 화면 첨삭
// =====================================================================
function ReviewScreen({ task: task0, startRound, onClose }: { task: Task; startRound: number; onClose: () => void }) {
  const [task, setTask] = useState<Task>(task0)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [cms, setCms] = useState<Cm[]>([])
  const [round, setRound] = useState(startRound)
  const [busy, setBusy] = useState<string | null>(null)
  const [tab, setTab] = useState<'cm' | 'st'>('cm')
  const [act, setAct] = useState<string | null>(null)
  const [cmp, setCmp] = useState(startRound > 1)
  const [editing, setEditing] = useState<any | null>(null) // {id?, quote, importance, body, suggestion}
  const [selPop, setSelPop] = useState<{ x: number; y: number; text: string } | null>(null)
  const [setuk, setSetuk] = useState<string>(task0.setuk_text ?? '')
  const [showScore, setShowScore] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    const [t, d, c] = await Promise.all([
      supabase.from('high_school_task').select('*').eq('id', task0.id).single(),
      supabase.from('high_school_task_draft').select('*').eq('task_id', task0.id).order('round'),
      supabase.from('high_school_task_comment').select('*').eq('task_id', task0.id).order('created_at'),
    ])
    if (t.data) { setTask(t.data); setSetuk(t.data.setuk_text ?? '') }
    setDrafts((d.data ?? []).filter((x: Draft) => x.submitted_at))
    setCms(c.data ?? [])
  }
  useEffect(() => { load() }, [task0.id])
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  const draft = drafts.find(d => d.round === round)
  const prev = drafts.find(d => d.round === round - 1)
  const lastRound = drafts.length ? drafts[drafts.length - 1].round : 0
  const isLast = round === lastRound
  const canEdit = isLast && task.status === 'submitted'
  const mine = useMemo(() => cms.filter(c => c.draft_id === draft?.id), [cms, draft?.id])
  const shown = mine.filter(c => c.visible_to_student)
  const hiddenN = mine.length - shown.length
  const aiDone = mine.some(c => c.author === 'ai')
  // 앞 회차에 학생에게 보낸 코멘트 + 학생이 이번 회차에서 "반영했어요" 체크한 것
  const prevSent = useMemo(() => cms.filter(c => c.draft_id === prev?.id && c.visible_to_student), [cms, prev?.id])
  const addressed: string[] = Array.isArray(draft?.addressed) ? draft.addressed : []

  const run = async (label: string, fn: () => Promise<any>) => {
    setBusy(label)
    try { await fn(); await load() } catch (e: any) { alert(e.message || '오류가 났어요') } finally { setBusy(null) }
  }

  // ---- 코멘트 ----
  const runAI = () => run('ai', () => callAI('review', { taskId: task.id, draftId: draft.id }))
  const toggle = (c: Cm) => run('', async () => {
    const { error } = await supabase.from('high_school_task_comment').update({ visible_to_student: !c.visible_to_student }).eq('id', c.id)
    if (error) throw error
  })
  const remove = (c: Cm) => { if (confirm('이 코멘트를 지울까요?')) run('', async () => { const { error } = await supabase.from('high_school_task_comment').delete().eq('id', c.id); if (error) throw error }) }
  const saveEdit = () => {
    if (!editing?.body?.trim()) { alert('코멘트 내용을 적어 주세요'); return }
    const row = { importance: editing.importance, body: editing.body.trim(), suggestion: editing.suggestion?.trim() || null }
    run('', async () => {
      const { data: u } = await supabase.auth.getUser()
      const { error } = editing.id
        ? await supabase.from('high_school_task_comment').update(row).eq('id', editing.id)
        : await supabase.from('high_school_task_comment').insert({ ...row, task_id: task.id, draft_id: draft.id, author: 'teacher', teacher_id: u.user?.id ?? null, quote: editing.quote || null, visible_to_student: true })
      if (error) throw error
      setEditing(null)
    })
  }

  // ---- 드래그해서 코멘트 ----
  const onMouseUp = () => {
    if (!canEdit) return
    setTimeout(() => {
      const s = window.getSelection(), text = (s?.toString() || '').replace(/\s+/g, ' ').trim()
      if (!s || !text || text.length < 4 || !docRef.current?.contains(s.anchorNode)) { setSelPop(null); return }
      const r = s.getRangeAt(0).getBoundingClientRect()
      setSelPop({ x: r.left + r.width / 2, y: r.top, text })
    }, 10)
  }
  const fromSel = () => {
    if (!selPop) return
    setEditing({ quote: selPop.text, importance: '권장', body: '', suggestion: '' })
    setTab('cm'); setSelPop(null); window.getSelection()?.removeAllRanges()
  }

  // ---- 결정 ----
  const askRevise = () => {
    if (!shown.length) return
    if (!confirm(`켠 코멘트 ${shown.length}개를 학생에게 보내고 ${round + 1}차로 고쳐 쓰기를 요청할까요?${hiddenN ? `\n안 보냄으로 둔 코멘트 ${hiddenN}개는 학생에게 안 보여요.` : ''}`)) return
    run('revise', async () => {
      const { error } = await supabase.from('high_school_task').update({ status: 'revise', updated_at: new Date().toISOString() }).eq('id', task.id)
      if (error) throw error
    })
  }
  const askDone = () => {
    if (!confirm(`${round}차를 최종본으로 하고 회차를 완료할까요?\nAI가 세특 예상 문장과 면접 예상질문을 만들고, 학생 화면에도 보여요.`)) return
    run('done', async () => {
      await callAI('finalize', { taskId: task.id, draftId: draft.id })
      const { error } = await supabase.from('high_school_task').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', task.id)
      if (error) throw error
      setTab('st')
    })
  }
  const undoStatus = () => run('', async () => {
    const { error } = await supabase.from('high_school_task').update({ status: 'submitted', updated_at: new Date().toISOString() }).eq('id', task.id)
    if (error) throw error
  })
  const saveSetuk = () => run('', async () => {
    const { error } = await supabase.from('high_school_task').update({ setuk_text: setuk, updated_at: new Date().toISOString() }).eq('id', task.id)
    if (error) throw error
    alert('세특 문장을 저장했어요')
  })

  // 학생이 다음 회차를 이미 시작했으면 되돌리기 금지
  const studentMovedOn = (task.current_round ?? 0) > lastRound
  const st = statusOf(isLast ? task.status : 'revise')
  const prevLines = useMemo(() => new Set((prev?.content || '').split('\n').map((x: string) => x.trim())), [prev?.content])

  return (
    <div className="fixed inset-0 z-[70] bg-white flex flex-col">
      {/* 위 */}
      <div className="h-14 border-b border-line flex items-center gap-2.5 px-4 flex-shrink-0">
        <button onClick={onClose} className="h-9 px-3 rounded-lg border border-line text-[13px] font-semibold text-ink-secondary hover:bg-gray-50">‹ 닫기</button>
        <div className="text-[14px] font-extrabold text-ink truncate">{task.title || '학교 과제'} / 회차 {round}</div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
        <SourceButton task={task} />
        {draft?.score?.total != null && <button onClick={() => setShowScore(true)} className="h-10 px-3 rounded-lg border border-line text-[13px] font-semibold text-ink-secondary hover:bg-gray-50">📊 AI 채점 {draft.score.total}점</button>}
        <div className="ml-auto flex gap-1">
          {drafts.map(d => (
            <button key={d.id} onClick={() => { setRound(d.round); setCmp(d.round > 1); setAct(null); setEditing(null) }}
              className={`h-8 px-3 rounded-lg border text-[12px] font-extrabold ${d.round === round ? 'border-brand-high text-brand-high-dark bg-brand-high-pale' : 'border-line text-ink-muted'}`}>R{d.round}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[1fr_420px] min-h-0">
        {/* 왼쪽: 학생 제출본 */}
        <div className="flex flex-col min-h-0 bg-slate-50 border-r border-line">
          <div className="flex items-center gap-2 px-5 py-2.5 bg-white border-b border-line text-[12px] text-ink-muted">
            <b className="text-ink-secondary">👁 학생 제출본</b>
            <span>· {canEdit ? '텍스트를 드래그하여 코멘트 추가' : '읽기 전용'}</span>
            {round > 1 && (
              <label className="ml-auto flex items-center gap-2 font-bold text-ink-secondary cursor-pointer">
                <input type="checkbox" checked={cmp} onChange={e => setCmp(e.target.checked)} className="accent-blue-600" />
                {round - 1}차와 바뀐 곳 표시
              </label>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-7 py-6" onScroll={() => setSelPop(null)}>
            <div ref={docRef} onMouseUp={onMouseUp}
              className="max-w-[860px] mx-auto bg-white border border-line rounded-2xl px-8 py-7 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
              {draft ? <MarkedDoc text={draft.content || ''} cms={mine} act={act} onPick={id => { setAct(id); setTab('cm') }}
                changed={cmp && prev ? (line: string) => !prevLines.has(line.trim()) : null} />
                : <div className="text-ink-muted text-[13px]">불러오는 중...</div>}
            </div>
          </div>
        </div>

        {/* 오른쪽 */}
        <div className="flex flex-col min-h-0">
          <div className="flex gap-1 px-3.5 pt-2.5 border-b border-line flex-shrink-0">
            {[['cm', `코멘트 (${mine.length})`], ...(isLast && task.status === 'done' ? [['st', '세특']] : [])].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k as any)}
                className={`px-3 py-2 text-[13px] font-bold border-b-2 -mb-px ${tab === k ? 'text-brand-high-dark border-brand-high' : 'text-ink-muted border-transparent'}`}>{l}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2.5">
            {tab === 'cm' && (
              <>
                {prevSent.length > 0 && (
                  <div className="border border-line rounded-xl p-3.5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-extrabold">{round - 1}차 코멘트 반영</div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${prevSent.every(c => addressed.includes(c.id)) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>{prevSent.filter(c => addressed.includes(c.id)).length} / {prevSent.length}</span>
                    </div>
                    {prevSent.map(c => {
                      const ok = addressed.includes(c.id)
                      return (
                        <div key={c.id} className="flex gap-2 items-start border-t border-line pt-1.5 text-[12.5px] leading-[1.5]">
                          <span className={`font-extrabold ${ok ? 'text-green-600' : 'text-orange-600'}`}>{ok ? '✓' : '✕'}</span>
                          <div className="flex-1"><span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded border mr-1 ${impCls(c.importance)}`}>{c.importance}</span>{c.body.length > 50 ? c.body.slice(0, 50) + '…' : c.body}</div>
                        </div>
                      )
                    })}
                    <div className="text-[11.5px] text-ink-muted">학생이 "반영했어요"로 체크한 표시예요. 위에서 바뀐 곳 표시를 켜면 고친 문단이 노랗게 보여요.</div>
                  </div>
                )}
                {canEdit && !editing && (
                  <button onClick={() => setEditing({ quote: '', importance: '권장', body: '', suggestion: '' })}
                    className="h-10 rounded-lg border border-line text-[13px] font-bold text-ink-secondary hover:border-brand-high hover:text-brand-high-dark">＋ 전체 코멘트 추가</button>
                )}
                {editing && (
                  <div className="border-2 border-brand-high rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex gap-1">{IMP.map(x => (
                      <button key={x} onClick={() => setEditing({ ...editing, importance: x })}
                        className={`px-2.5 py-1 rounded-md border text-[12px] font-bold ${editing.importance === x ? 'border-brand-high text-brand-high-dark bg-brand-high-pale' : 'border-line text-ink-muted'}`}>{x}</button>
                    ))}</div>
                    {editing.quote ? <div className="text-[12px] text-ink-muted border-l-[3px] border-amber-300 pl-2">"{editing.quote}"</div> : <div className="text-[11.5px] text-ink-muted">전체 코멘트 — 글 전체에 대한 의견이에요</div>}
                    <textarea autoFocus rows={3} value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} placeholder="코멘트"
                      className="w-full px-3 py-2 text-[13px] border border-line rounded-lg focus:outline-none focus:border-brand-high resize-y" />
                    <input value={editing.suggestion || ''} onChange={e => setEditing({ ...editing, suggestion: e.target.value })} placeholder="고쳐 쓸 방향 (선택)"
                      className="w-full px-3 py-2 text-[13px] border border-line rounded-lg focus:outline-none focus:border-brand-high" />
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => setEditing(null)} className="h-8 px-3 rounded-lg border border-line text-[12px] font-semibold">취소</button>
                      <button onClick={saveEdit} className="h-8 px-3 rounded-lg bg-brand-high text-white text-[12px] font-bold">저장</button>
                    </div>
                  </div>
                )}
                {busy === 'ai' && (
                  <div className="border border-line rounded-xl p-6 text-center">
                    <div className="w-7 h-7 mx-auto border-4 border-brand-high-light border-t-brand-high rounded-full animate-spin" />
                    <div className="mt-2 text-[13px] font-bold text-brand-high-dark">AI가 {round}차 본문을 읽고 있어요…</div>
                  </div>
                )}
                {!mine.length && busy !== 'ai' && !editing && (
                  <div className="border border-line rounded-xl px-5 py-8 text-center">
                    <div className="text-[28px]">💬</div>
                    <div className="text-[14px] font-bold text-ink mt-1">이 회차에는 아직 코멘트가 없습니다</div>
                    <div className="text-[12px] text-ink-muted mt-1">{canEdit ? '텍스트를 선택해 코멘트를 추가하거나 AI 첨삭을 실행해 보세요.' : ''}</div>
                  </div>
                )}
                {mine.filter(c => c.id !== editing?.id).map(c => (
                  <div key={c.id} id={`cm-${c.id}`} onClick={() => setAct(c.id)}
                    className={`border rounded-xl p-3 flex flex-col gap-1.5 cursor-default ${act === c.id ? 'border-brand-high shadow-[0_0_0_3px_#EFF6FF]' : 'border-line'} ${c.visible_to_student ? 'bg-white' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${impCls(c.importance)}`}>{c.importance || '권장'}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md border border-line text-ink-muted">{c.author === 'ai' ? 'AI 초안' : '선생님'}</span>
                      {canEdit ? (
                        <button onClick={e => { e.stopPropagation(); toggle(c) }} className="ml-auto flex items-center gap-1.5 text-[12px] font-bold text-ink-muted">
                          {c.visible_to_student ? '✓ 보낼 코멘트' : '안 보냄'}
                          <span className={`w-8 h-[18px] rounded-full relative transition-all ${c.visible_to_student ? 'bg-brand-high' : 'bg-slate-300'}`}>
                            <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all ${c.visible_to_student ? 'left-[16px]' : 'left-[2px]'}`} />
                          </span>
                        </button>
                      ) : <span className={`ml-auto text-[11px] font-bold ${c.visible_to_student ? 'text-brand-high' : 'text-ink-muted'}`}>{c.visible_to_student ? '학생에게 보냄' : '안 보냄'}</span>}
                    </div>
                    {c.quote && <div className="text-[12px] text-ink-muted border-l-[3px] border-amber-300 pl-2 line-clamp-2">"{c.quote}"</div>}
                    <div className="text-[13px] leading-[1.6] text-ink whitespace-pre-wrap">{c.body}</div>
                    {c.suggestion && <div className="text-[12px] text-brand-high-dark bg-brand-high-pale rounded-md px-2 py-1.5">고쳐 쓸 방향: {c.suggestion}</div>}
                    {canEdit && (
                      <div className="flex gap-1">
                        <button onClick={() => setEditing({ id: c.id, quote: c.quote, importance: c.importance || '권장', body: c.body, suggestion: c.suggestion })} className="text-[12px] text-ink-muted hover:text-ink px-1.5">✏️ 수정</button>
                        <button onClick={() => remove(c)} className="text-[12px] text-ink-muted hover:text-red-600 px-1.5">🗑 삭제</button>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
            {tab === 'st' && (
              <div className="border border-line rounded-xl p-4 flex flex-col gap-2">
                <div className="text-[14px] font-extrabold">세특 예상 문장</div>
                <textarea rows={9} value={setuk} onChange={e => setSetuk(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] leading-[1.7] border border-line rounded-lg focus:outline-none focus:border-brand-high" />
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] text-ink-muted">{setuk.length}자 · 학생 화면에 보여요</span>
                  <button onClick={saveSetuk} className="h-8 px-3 rounded-lg bg-brand-high text-white text-[12px] font-bold">저장</button>
                </div>
                {Array.isArray(task.interview_qs) && task.interview_qs.length > 0 && (
                  <>
                    <div className="text-[14px] font-extrabold mt-2">면접 예상질문</div>
                    {task.interview_qs.map((q: any, i: number) => <div key={i} className="text-[13px] leading-[1.55] border-t border-line pt-1.5">Q{i + 1}. {q.q}</div>)}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 아래 */}
      <div className="border-t border-line px-4 py-2.5 flex items-center gap-2 flex-wrap flex-shrink-0">
        <span className="text-[12px] text-ink-muted">{canEdit ? '💾 자동 저장됨' : isLast ? '' : '지난 회차'}</span>
        <div className="ml-auto flex gap-1.5 items-center flex-wrap">
          {canEdit && (
            <>
              <button onClick={runAI} disabled={!!busy || aiDone} className="h-10 px-4 rounded-lg border border-line text-[13px] font-bold text-ink-secondary hover:bg-gray-50 disabled:opacity-40">✨ AI 첨삭{aiDone ? ' 완료' : ''}</button>
              <button onClick={askRevise} disabled={!!busy || !shown.length} className="h-10 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[13px] font-bold disabled:opacity-40">📨 학생에게 보내기{shown.length ? ` (${shown.length}개)` : ''} · 고쳐 쓰기 요청</button>
              <button onClick={askDone} disabled={!!busy} className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold disabled:opacity-40">{busy === 'done' ? '세특 만드는 중...' : '✓ 회차 완료'}</button>
            </>
          )}
          {isLast && task.status === 'revise' && !studentMovedOn && <button onClick={undoStatus} className="h-10 px-4 rounded-lg border border-line text-[13px] font-semibold">요청 취소</button>}
          {isLast && task.status === 'revise' && studentMovedOn && <span className="text-[12px] text-ink-muted">학생이 {lastRound + 1}차를 쓰는 중이에요</span>}
          {isLast && task.status === 'done' && <button onClick={undoStatus} className="h-10 px-4 rounded-lg border border-line text-[13px] font-semibold">완료 취소</button>}
        </div>
        {canEdit && <div className="w-full text-right text-[11.5px] text-ink-muted">① 보낼 코멘트를 스위치로 켜고 → ② [학생에게 보내기]를 누르면 켠 코멘트만 학생에게 가요. 스위치만 켜서는 아직 안 보내져요.{hiddenN ? ` (안 보냄 ${hiddenN}개)` : ''}</div>}
      </div>

      {selPop && (
        <button onMouseDown={e => e.preventDefault()} onClick={fromSel}
          className="fixed z-[75] -translate-x-1/2 -translate-y-full bg-slate-900 text-white text-[12px] font-bold px-3 py-2 rounded-lg shadow-lg"
          style={{ left: selPop.x, top: selPop.y - 6 }}>💬 여기에 코멘트</button>
      )}
      {showScore && draft?.score && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowScore(false)}>
          <div className="bg-white rounded-2xl w-[440px] max-w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="text-[17px] font-extrabold">안내문 기준 AI 채점 · {round}차</div>
            <div className="text-[12px] text-ink-muted mt-1">학생이 제출 전에 받은 점수예요. 첨삭 참고용이에요.</div>
            {(draft.score.items ?? []).map((it: any, i: number) => (
              <div key={i} className="border-t border-line py-2 mt-2 text-[13px]">
                <div className="flex justify-between"><span>{it.name}</span><b className={it.got < it.max ? 'text-orange-700' : ''}>{it.got} / {it.max}</b></div>
                {it.got < it.max && it.tip && <div className="text-[12px] text-ink-muted mt-0.5">{it.tip}</div>}
              </div>
            ))}
            <div className="flex justify-between border-t border-line pt-2 mt-1 font-extrabold"><span>합계</span><span className="text-brand-high-dark">{draft.score.total} / {draft.score.max}</span></div>
            <button onClick={() => setShowScore(false)} className="mt-4 w-full h-10 rounded-lg bg-brand-high text-white text-[13px] font-bold">닫기</button>
          </div>
        </div>
      )}
    </div>
  )
}

// 책 쪽수 빈칸은 필요 없어서 화면에서 지운다
const noPage = (t: string) => t.replace(/\s*·?\s*\[\[직접 입력:\s*쪽수\s*\]\]/g, '')

// 본문 + 코멘트 자리 노란 표시
function MarkedDoc({ text, cms, act, onPick, changed }: { text: string; cms: Cm[]; act: string | null; onPick: (id: string) => void; changed: ((line: string) => boolean) | null }) {
  const lines = text.split('\n')
  const marks = cms.filter(c => c.quote)
  const render = (raw: string) => {
    const t = noPage(raw.replace(/\*\*/g, ''))
    const hits: { s: number; e: number; c: Cm }[] = []
    marks.forEach(c => {
      const q = String(c.quote).replace(/\*\*/g, '').trim(), k = q ? t.indexOf(q) : -1
      if (k >= 0 && !hits.some(h => k < h.e && k + q.length > h.s)) hits.push({ s: k, e: k + q.length, c })
    })
    hits.sort((a, b) => a.s - b.s)
    const out: any[] = []; let pos = 0
    hits.forEach((h, i) => {
      if (h.s > pos) out.push(t.slice(pos, h.s))
      const strong = h.c.importance === '필수'
      out.push(<mark key={i} onClick={() => onPick(h.c.id)}
        className={`cursor-pointer rounded-sm px-0.5 border-b-2 text-inherit ${act === h.c.id ? 'bg-blue-100 border-brand-high' : !h.c.visible_to_student ? 'bg-slate-100 border-slate-300' : strong ? 'bg-orange-100 border-orange-500' : 'bg-amber-100 border-amber-400'}`}>{t.slice(h.s, h.e)}</mark>)
      pos = h.e
    })
    if (pos < t.length) out.push(t.slice(pos))
    // 학생이 안 채운 [[직접 입력: …]] 칸은 주황 점선 상자로
    return out.flatMap((o, i) => typeof o !== 'string' ? [o] : o.split(/(\[\[직접 입력:[^\]]*\]\])/g).map((p, j) => p.startsWith('[[직접 입력:')
      ? <span key={`b${i}-${j}`} className="inline-block font-bold text-orange-800 bg-orange-50 border-2 border-dashed border-orange-400 rounded-md px-1.5 mx-0.5 text-[13px]">빈칸: {p.slice(8, -2).trim()}</span>
      : p))
  }
  return (
    <div className="space-y-2 text-[15px] leading-[1.9] text-ink">
      {lines.map((l, i) => {
        const t = l.trim()
        if (!t) return <div key={i} className="h-1" />
        if (t.startsWith('### ')) return <h4 key={i} className="text-[16px] font-extrabold mt-4">{render(t.slice(4))}</h4>
        if (t.startsWith('## ')) return <h3 key={i} className="text-[18px] font-extrabold mt-4">{render(t.slice(3))}</h3>
        if (t.startsWith('# ')) return <h2 key={i} className="text-[21px] font-extrabold">{render(t.slice(2))}</h2>
        const chg = changed?.(l)
        const body = /^[-*] /.test(t) ? <><span className="text-brand-high mr-2">•</span>{render(t.slice(2))}</> : t.startsWith('>') ? render(t.replace(/^>\s?/, '')) : render(t)
        return <p key={i} className={chg ? 'bg-yellow-50 border-l-[3px] border-yellow-400 pl-3 -ml-[15px]' : t.startsWith('>') ? 'border-l-4 border-brand-high-light pl-3 text-ink-secondary' : ''}>{body}</p>
      })}
    </div>
  )
}