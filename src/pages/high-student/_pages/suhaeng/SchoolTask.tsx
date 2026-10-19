// src/pages/high-student/_pages/suhaeng/SchoolTask.tsx
// 수행평가 > [내 학교 과제] 탭 — 학교 안내문으로 실제 과제를 함께 만든다
// 1 자료 준비 → 2 분석 확인(+입시로드맵 연결) → 3 질의응답 → 4 학습가이드 → 5 초안·채점 → 6 선생님 첨삭

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { studentState, academyState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'

type Task = any
type Draft = any

const STEPS = ['자료 준비', '분석 확인', '질의응답', '학습가이드', '초안 · 채점', '선생님 첨삭']
const STATUS_STEP: Record<string, number> = { draft: 0, analyzed: 1, qa: 2, guide: 3, writing: 4, submitted: 5, revise: 5, done: 5 }
const STATUS_LABEL: Record<string, string> = {
  draft: '자료 준비', analyzed: '분석 확인', qa: '질의응답', guide: '학습가이드',
  writing: '초안 작성 중', submitted: '선생님 확인 중', revise: '고쳐 쓰기 요청', done: '완료',
}
const BLANK_RE = /\[\[직접 입력:([^\]]*)\]\]/g
const blanksOf = (t: string) => Array.from((t || '').matchAll(BLANK_RE)).map(m => m[1].trim())

// ---------- AI 함수 호출 ----------
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

// ---------- 간단 마크다운 ----------
// 주소(https://...)는 눌러서 새 창으로 열 수 있게 — 학생이 진짜 출처인지 직접 확인
const URL_RE = /(https?:\/\/[^\s)<>」』,]+)/g
function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE)
  return <>{parts.map((p, i) => i % 2 === 1
    ? <a key={i} href={p.replace(/[.,]+$/, '')} target="_blank" rel="noopener noreferrer" className="text-brand-high-dark underline underline-offset-2 break-all hover:text-brand-high">{p}</a>
    : <React.Fragment key={i}>{p}</React.Fragment>)}</>
}
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\[직접 입력:[^\]]*\]\])/g)
  return <>{parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <b key={i}><Linkify text={p.slice(2, -2)} /></b>
    if (p.startsWith('[[직접 입력:')) return <span key={i} className="inline-block font-bold text-orange-800 bg-orange-50 border-2 border-dashed border-orange-400 rounded-md px-1.5 py-0.5 mx-0.5">직접 입력: {p.slice(8, -2).trim()}</span>
    return <Linkify key={i} text={p} />
  })}</>
}
function Md({ text }: { text: string }) {
  const lines = (text || '').split('\n')
  return (
    <div className="space-y-2 text-[14px] leading-[1.85] text-ink">
      {lines.map((l, i) => {
        const t = l.trim()
        if (!t) return <div key={i} className="h-1" />
        if (t.startsWith('### ')) return <h4 key={i} className="text-[15px] font-extrabold mt-3"><Inline text={t.slice(4)} /></h4>
        if (t.startsWith('## ')) return <h3 key={i} className="text-[17px] font-extrabold mt-4"><Inline text={t.slice(3)} /></h3>
        if (t.startsWith('# ')) return <h2 key={i} className="text-[21px] font-extrabold"><Inline text={t.slice(2)} /></h2>
        if (/^[-*] /.test(t)) return <div key={i} className="flex gap-2 pl-1"><span className="text-brand-high">•</span><span><Inline text={t.slice(2)} /></span></div>
        if (t.startsWith('>')) return <div key={i} className="border-l-4 border-brand-high-light pl-3 text-ink-secondary"><Inline text={t.replace(/^>\s?/, '')} /></div>
        return <p key={i}><Inline text={t} /></p>
      })}
    </div>
  )
}

const card = 'bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)]'
const btnMain = 'h-11 px-5 rounded-lg bg-brand-high hover:bg-brand-high-dark text-white text-[14px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed'
const btnSub = 'h-11 px-4 rounded-lg bg-white border border-line text-[13px] font-semibold text-ink-secondary hover:bg-gray-50 transition-all disabled:opacity-50'

function Busy({ text }: { text: string }) {
  return (
    <div className={`${card} px-6 py-10 flex flex-col items-center gap-3`}>
      <div className="w-8 h-8 border-4 border-brand-high-light border-t-brand-high rounded-full animate-spin" />
      <div className="text-[14px] font-bold text-ink">{text}</div>
      <div className="text-[12px] text-ink-muted">보통 20~40초 걸려요. 화면을 닫지 마세요.</div>
    </div>
  )
}

// =====================================================================
export default function SchoolTask() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined
  const qc = useQueryClient()
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['school-tasks', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase.from('high_school_task')
        .select('id, title, subject, task_type, status, current_round, updated_at, grade, semester')
        .eq('student_id', studentId!).order('updated_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const createTask = async () => {
    if (!studentId) return
    setCreating(true)
    try {
      const m = new Date().getMonth() + 1
      const gradeNum = Number(String((student as any)?.grade ?? '').replace(/[^0-9]/g, '')) || null
      const { data, error } = await supabase.from('high_school_task').insert({
        student_id: studentId, academy_id: academyId ?? null, grade: gradeNum,
        semester: m >= 3 && m <= 8 ? 1 : 2, status: 'draft',
      }).select('id').single()
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['school-tasks', studentId] })
      setOpenId(data.id)
    } catch (e: any) { alert('과제를 만들지 못했어요: ' + e.message) }
    finally { setCreating(false) }
  }

  if (openId) return <TaskFlow taskId={openId} onBack={() => { setOpenId(null); qc.invalidateQueries({ queryKey: ['school-tasks', studentId] }) }} />

  return (
    <div className="flex flex-col gap-4">
      <div className={`${card} p-5 flex items-center justify-between gap-4 flex-wrap`}>
        <div>
          <div className="text-[16px] font-extrabold text-ink">학교에서 받은 수행평가, 같이 해요</div>
          <div className="text-[12px] text-ink-secondary mt-1">안내문 사진이나 PDF를 올리면 내 입시로드맵과 이어서 탐구 방향을 잡아 줘요.</div>
        </div>
        <button onClick={createTask} disabled={creating} className={btnMain}>{creating ? '만드는 중...' : '+ 새 과제 시작'}</button>
      </div>

      <div className={card}>
        <div className="px-4 py-3 border-b border-line text-[14px] font-extrabold text-ink">내 과제</div>
        {isLoading ? (
          <div className="px-4 py-10 text-center text-ink-muted text-[12px]">불러오는 중...</div>
        ) : tasks.length === 0 ? (
          <div className="px-4 py-10 text-center text-ink-muted text-[12px]">아직 시작한 과제가 없어요</div>
        ) : (
          <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {tasks.map((t: any) => (
              <button key={t.id} onClick={() => setOpenId(t.id)}
                className="text-left rounded-xl border border-line bg-gray-50 hover:border-brand-high-light hover:shadow-sm px-4 py-3.5 transition-all">
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {t.subject && <span className="text-[10px] font-bold text-ink-secondary bg-white border border-line px-1.5 py-0.5 rounded">{t.subject}</span>}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.status === 'done' ? 'bg-green-100 text-green-800' : t.status === 'revise' ? 'bg-orange-100 text-orange-800' : 'bg-brand-high-pale text-brand-high-dark'}`}>{STATUS_LABEL[t.status] || t.status}</span>
                </div>
                <div className="text-[13px] font-bold text-ink leading-snug line-clamp-2 min-h-[36px]">{t.title || '제목 없는 과제 (안내문을 올려 주세요)'}</div>
                <div className="text-[10px] text-ink-muted mt-2">{new Date(t.updated_at).toLocaleDateString('ko-KR')}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================================
function TaskFlow({ taskId, onBack }: { taskId: string; onBack: () => void }) {
  const [task, setTask] = useState<Task | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [view, setView] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    const [t, d, c] = await Promise.all([
      supabase.from('high_school_task').select('*').eq('id', taskId).single(),
      supabase.from('high_school_task_draft').select('*').eq('task_id', taskId).order('round'),
      supabase.from('high_school_task_comment').select('*').eq('task_id', taskId).order('created_at'),
    ])
    if (t.data) setTask(t.data)
    setDrafts(d.data ?? [])
    setComments(c.data ?? [])
  }
  useEffect(() => { load() }, [taskId])

  const run = async (label: string, fn: () => Promise<any>) => {
    setBusy(label)
    try { await fn(); await load(); setView(null) }
    catch (e: any) { alert(e.message || '오류가 났어요') }
    finally { setBusy(null) }
  }

  if (!task) return <div className="py-16 text-center text-ink-muted text-[12px]">불러오는 중...</div>
  const reached = STATUS_STEP[task.status] ?? 0
  const step = view ?? reached

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[12px] font-semibold text-ink-secondary hover:text-ink">← 내 과제 목록</button>
        <div className="w-px h-4 bg-line" />
        <div className="text-[13px] font-bold text-ink truncate">{task.title || '새 과제'}</div>
      </div>

      <div className="flex gap-4 items-start flex-wrap">
        {/* 왼쪽 단계 */}
        <div className={`${card} p-3 w-full md:w-[200px] flex md:flex-col gap-1 overflow-x-auto`}>
          {STEPS.map((s, i) => {
            const done = i < reached, on = i === step, can = i <= reached && !busy
            return (
              <button key={s} disabled={!can} onClick={() => setView(i === reached ? null : i)}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left flex-shrink-0 ${on ? 'bg-brand-high-pale' : ''} ${can ? 'hover:bg-gray-50' : 'opacity-50 cursor-default'}`}>
                <span className={`w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center ${on ? 'bg-brand-high text-white' : done ? 'bg-brand-high-pale text-brand-high-dark' : 'bg-gray-100 text-ink-muted'}`}>{done && !on ? '✓' : i + 1}</span>
                <span className={`text-[13px] ${on ? 'font-extrabold text-brand-high-dark' : 'text-ink-secondary'}`}>{s}</span>
              </button>
            )
          })}
        </div>

        {/* 본문 */}
        <div className="flex-1 min-w-0 md:min-w-[520px]">
          {busy ? <Busy text={busy} /> :
            step === 0 ? <StepPrepare task={task} readOnly={reached > 0} onAnalyze={(patch) => run('안내문을 읽고 내 로드맵과 이어 보는 중이에요', async () => {
              const { error } = await supabase.from('high_school_task').update(patch).eq('id', task.id)
              if (error) throw error
              await callAI('analyze', { taskId: task.id })
            })} /> :
            step === 1 ? <StepAnalysis task={task} readOnly={reached > 1} onStart={(patch) => run('첫 질문을 만드는 중이에요', async () => {
              const { error } = await supabase.from('high_school_task').update(patch).eq('id', task.id)
              if (error) throw error
              await callAI('qa', { taskId: task.id })
            })} /> :
            step === 2 ? <StepQA task={task} readOnly={reached > 2}
              onAnswer={(qa) => run('다음 질문을 만드는 중이에요', async () => {
                const { error } = await supabase.from('high_school_task').update({ qa }).eq('id', task.id)
                if (error) throw error
                const r = await callAI('qa', { taskId: task.id })
                if (r.done) await callAI('guide', { taskId: task.id })
              })}
              onFinish={(qa) => run('학습가이드를 정리하는 중이에요', async () => {
                const { error } = await supabase.from('high_school_task').update({ qa }).eq('id', task.id)
                if (error) throw error
                await callAI('guide', { taskId: task.id })
              })} /> :
            step === 3 ? <StepGuide task={task} readOnly={reached > 4} hasDraft={drafts.length > 0}
              onDraft={(format) => run('고른 구조로 초안을 쓰는 중이에요', () => callAI('draft', { taskId: task.id, format }))} /> :
            step === 4 ? <StepDraft task={task} draft={drafts[drafts.length - 1]} readOnly={reached > 4} reload={load}
              onRedo={() => setView(3)}
              onScore={(content) => run('안내문 기준으로 채점하는 중이에요', () => callAI('score', { taskId: task.id, draftId: drafts[drafts.length - 1]?.id, content }))} /> :
            <StepReview task={task} drafts={drafts} comments={comments} reload={load} onRewrite={() => setView(null)} />}
        </div>
      </div>
    </div>
  )
}

// ---------- 1. 자료 준비 ----------
function StepPrepare({ task, readOnly, onAnalyze }: { task: Task; readOnly: boolean; onAnalyze: (patch: any) => void }) {
  const [files, setFiles] = useState<any[]>(task.source_files ?? [])
  const [text, setText] = useState<string>(task.source_text ?? '')
  const [showText, setShowText] = useState(!!task.source_text)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (list: FileList | null) => {
    if (!list?.length) return
    setUploading(true)
    try {
      const { data: u } = await supabase.auth.getUser()
      const uid = u.user?.id
      if (!uid) throw new Error('로그인 정보를 확인할 수 없어요')
      const added: any[] = []
      for (const f of Array.from(list).slice(0, 6 - files.length)) {
        if (f.size > 50 * 1024 * 1024) { alert(`${f.name}: 50MB 이하만 올릴 수 있어요`); continue }
        if (!(f.type.startsWith('image/') || f.type === 'application/pdf')) { alert(`${f.name}: 사진이나 PDF만 올릴 수 있어요`); continue }
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
        const path = `${uid}/${task.id}/${Date.now()}-${added.length}.${ext}`
        const { error } = await supabase.storage.from('school-task-files').upload(path, f, { upsert: false, contentType: f.type })
        if (error) throw error
        added.push({ path, name: f.name, type: f.type })
      }
      setFiles(prev => [...prev, ...added])
    } catch (e: any) { alert('올리기 실패: ' + e.message) }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' }
  }

  const ready = files.length > 0 || text.trim().length >= 30
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[20px] font-extrabold text-ink">학교 안내문을 올려 주세요</div>
        <div className="text-[13px] text-ink-secondary mt-1">선생님이 나눠 준 수행평가 안내문, 평가 기준표를 사진 찍거나 PDF로 올리면 돼요.</div>
      </div>

      <div className={`${card} p-5 flex flex-col gap-3`}>
        {!readOnly && (
          <button onClick={() => inputRef.current?.click()} disabled={uploading || files.length >= 6}
            className="w-full h-36 rounded-xl border-2 border-dashed border-brand-high-light bg-brand-high-pale/40 hover:bg-brand-high-pale flex flex-col items-center justify-center gap-1.5 transition-all">
            <span className="text-3xl">📄</span>
            <span className="text-[14px] font-bold text-brand-high-dark">{uploading ? '올리는 중...' : '사진 또는 PDF 올리기'}</span>
            <span className="text-[11px] text-ink-muted">여러 장 가능 · 최대 6개 · 한 개 50MB 이하</span>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => upload(e.target.files)} />
        {files.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {files.map((f, i) => (
              <div key={f.path} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-line">
                <span>{f.type === 'application/pdf' ? '📕' : '🖼️'}</span>
                <span className="text-[12px] font-medium text-ink truncate flex-1">{f.name}</span>
                {!readOnly && <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-[11px] text-red-500 hover:text-red-700">빼기</button>}
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowText(!showText)} className="self-start text-[12px] font-semibold text-ink-secondary hover:text-ink">
          {showText ? '▾' : '▸'} 글로 직접 붙여넣기
        </button>
        {showText && (
          <textarea value={text} onChange={e => setText(e.target.value)} readOnly={readOnly} rows={8}
            placeholder="안내문 내용을 복사해서 붙여넣어도 돼요. (과제 내용, 평가 기준, 유의사항 등)"
            className="w-full px-3 py-2.5 text-[13px] border border-line rounded-lg focus:outline-none focus:border-brand-high leading-[1.7]" />
        )}
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <button disabled={!ready || uploading} onClick={() => onAnalyze({ source_files: files, source_text: text.trim() || null })} className={btnMain}>분석 시작 →</button>
        </div>
      )}
    </div>
  )
}

// ---------- 2. 분석 확인 ----------
const lines = (v: any) => (Array.isArray(v) ? v.filter(Boolean).join('\n') : '')
const toList = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)

function StepAnalysis({ task, readOnly, onStart }: { task: Task; readOnly: boolean; onStart: (patch: any) => void }) {
  const a = task.analysis ?? {}
  const [title, setTitle] = useState(task.title ?? '')
  const [subject, setSubject] = useState(task.subject ?? '')
  const [required, setRequired] = useState(lines(a.required))
  const [penalties, setPenalties] = useState(lines(a.penalties))
  const [criteria, setCriteria] = useState<{ name: string; points: number }[]>(Array.isArray(a.criteria) ? a.criteria : [])
  const [useDeepen, setUseDeepen] = useState(!!task.roadmap_reco?.deepen)
  const reco = task.roadmap_reco ?? {}

  const save = () => onStart({
    title: title.trim(), subject: subject.trim(),
    analysis: { ...a, required: toList(required), penalties: toList(penalties), criteria: criteria.filter(c => c.name.trim()) },
    roadmap_reco: { ...reco, deepen: useDeepen ? reco.deepen : null },
    parent_topic_id: useDeepen ? (reco.deepen?.topicId ?? null) : null,
  })

  const field = 'w-full px-3 py-2 text-[13px] border border-line rounded-lg focus:outline-none focus:border-brand-high leading-[1.7] read-only:bg-gray-50'
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[20px] font-extrabold text-ink">분석 결과를 확인해 주세요</div>
        <div className="text-[13px] text-ink-secondary mt-1">{a.summary || 'AI가 안내문에서 뽑은 내용이에요. 틀린 곳은 고쳐 주세요.'}</div>
      </div>

      <div className="flex gap-4 flex-wrap items-start">
        <div className={`${card} p-5 flex-[3_1_380px] min-w-0 flex flex-col gap-3`}>
          <div className="text-[14px] font-extrabold text-ink">안내문에서 뽑은 내용</div>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-bold text-ink-secondary">과제</span>
            <input value={title} onChange={e => setTitle(e.target.value)} readOnly={readOnly} className={field} /></label>
          <div className="flex gap-2">
            <label className="flex-1 flex flex-col gap-1"><span className="text-[11px] font-bold text-ink-secondary">과목</span>
              <input value={subject} onChange={e => setSubject(e.target.value)} readOnly={readOnly} className={field} /></label>
            <label className="flex-1 flex flex-col gap-1"><span className="text-[11px] font-bold text-ink-secondary">형식</span>
              <input value={a.format || task.task_type || ''} readOnly className={field} /></label>
          </div>
          {a.prompt && <div className="text-[12px] leading-[1.7] text-ink-secondary bg-gray-50 rounded-lg px-3 py-2"><b>제시문 · 과제 내용</b><br />{a.prompt}</div>}
          <label className="flex flex-col gap-1"><span className="text-[11px] font-bold text-ink-secondary">필수 항목 (한 줄에 하나)</span>
            <textarea rows={4} value={required} onChange={e => setRequired(e.target.value)} readOnly={readOnly} className={field} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-bold text-orange-700">감점 주의 (한 줄에 하나)</span>
            <textarea rows={2} value={penalties} onChange={e => setPenalties(e.target.value)} readOnly={readOnly} className={`${field} bg-orange-50/50`} /></label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-ink-secondary">평가 기준</span>
            {criteria.map((c, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={c.name} readOnly={readOnly} onChange={e => setCriteria(criteria.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={`${field} flex-1`} />
                <input type="number" value={c.points ?? 0} readOnly={readOnly} onChange={e => setCriteria(criteria.map((x, j) => j === i ? { ...x, points: Number(e.target.value) } : x))} className={`${field} w-20 text-right`} />
                <span className="text-[11px] text-ink-muted">점</span>
                {!readOnly && <button onClick={() => setCriteria(criteria.filter((_, j) => j !== i))} className="text-[11px] text-red-500">삭제</button>}
              </div>
            ))}
            {!readOnly && <button onClick={() => setCriteria([...criteria, { name: '', points: 0 }])} className="self-start text-[12px] font-semibold text-brand-high-dark">+ 기준 추가</button>}
          </div>
          {a.limits && <div className="text-[12px] text-ink-secondary">분량 · 제출: {a.limits}</div>}
        </div>

        {/* 입시로드맵 연결 */}
        <div className="flex-[2_1_300px] min-w-0 bg-white border-2 border-brand-high rounded-xl p-5 flex flex-col gap-3">
          <div>
            <div className="text-[11px] font-extrabold text-brand-high">비커스 입시로드맵 연결</div>
            <div className="text-[17px] font-extrabold text-ink">내 로드맵과 이어 보면</div>
          </div>

          {reco.deepen ? (
            <div className={`rounded-lg border p-3 flex flex-col gap-2 ${useDeepen ? 'border-line bg-gray-50' : 'border-dashed border-line opacity-60'}`}>
              <div className="text-[12px] font-extrabold text-ink-secondary">이미 한 탐구 → 이번 과제에서 심화</div>
              <div className="flex gap-1.5 items-center flex-wrap">
                <span className="text-[10px] font-extrabold text-green-800 bg-green-100 px-1.5 py-0.5 rounded">했던 것</span>
                {reco.deepen.when && <span className="text-[11px] text-ink-muted">{reco.deepen.when}</span>}
              </div>
              <div className="text-[14px] font-extrabold text-ink">{reco.deepen.title}</div>
              {reco.deepen.did && <div className="text-[12px] text-ink-secondary">그때 한 것: {reco.deepen.did}</div>}
              <div className="flex gap-2 bg-white border border-brand-high-light rounded-lg p-2.5">
                <span className="flex-none h-fit text-[10px] font-extrabold text-white bg-brand-high px-1.5 py-0.5 rounded">심화</span>
                <span className="text-[13px] leading-[1.65]">{reco.deepen.how}</span>
              </div>
              {!readOnly && <button onClick={() => setUseDeepen(!useDeepen)} className="self-end text-[11px] font-semibold text-ink-muted hover:text-ink">{useDeepen ? '이건 안 이을래요' : '다시 잇기'}</button>}
            </div>
          ) : (
            <div className="text-[12px] text-ink-muted bg-gray-50 rounded-lg px-3 py-2.5">로드맵에 이어 쓸 지난 탐구가 아직 없어요. 이번 과제가 첫 탐구가 돼요.</div>
          )}

          {reco.thisTerm && (
            <div className="bg-brand-high-pale rounded-lg p-3">
              <div className="text-[11px] font-bold text-brand-high-dark">이번 학기 로드맵 · {reco.thisTerm.subject}</div>
              <div className="text-[14px] font-extrabold text-ink">{reco.thisTerm.title}</div>
              {reco.thisTerm.skills?.length > 0 && <div className="text-[11px] text-ink-secondary mt-0.5">채울 역량: {reco.thisTerm.skills.join(' · ')}</div>}
            </div>
          )}

          {reco.perSection?.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[12px] font-extrabold text-ink-secondary">이 과제에서 이렇게 하면 로드맵이 채워져요</div>
              {reco.perSection.map((p: any, i: number) => (
                <div key={i} className="flex gap-2 border border-line rounded-lg p-2.5">
                  <span className="flex-none h-fit text-[10px] font-extrabold text-white bg-brand-high px-1.5 py-0.5 rounded">{p.section}</span>
                  <span className="text-[12.5px] leading-[1.6]">{p.tip}</span>
                </div>
              ))}
            </div>
          )}

          {reco.saveForLater && (
            <div className="flex gap-2 border border-dashed border-line bg-gray-50 rounded-lg p-2.5">
              <span className="flex-none h-fit text-[10px] font-extrabold text-ink-secondary bg-gray-200 px-1.5 py-0.5 rounded">남겨 두기</span>
              <span className="text-[12.5px] leading-[1.6] text-ink-secondary">{reco.saveForLater.tip}{reco.saveForLater.subject ? ` (${reco.saveForLater.grade || ''} ${reco.saveForLater.subject})` : ''}</span>
            </div>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <button disabled={!title.trim()} onClick={save} className={btnMain}>수행평가 시작 →</button>
        </div>
      )}
    </div>
  )
}

// ---------- 3. 질의응답 ----------
function StepQA({ task, readOnly, onAnswer, onFinish }: { task: Task; readOnly: boolean; onAnswer: (qa: any[]) => void; onFinish: (qa: any[]) => void }) {
  const qa: any[] = Array.isArray(task.qa) ? task.qa : []
  const curIdx = qa.findIndex(x => !(Array.isArray(x.answer) ? x.answer.length : x.answer) && !x.custom)
  const cur = curIdx >= 0 ? qa[curIdx] : null
  // 첫 질문은 여러 개(최대 maxPick개) 골라 섞을 수 있다 — 답은 배열로 저장
  const multi = !!cur?.multi
  const maxPick = Number(cur?.maxPick) || (multi ? 2 : 1)
  const [picks, setPicks] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [typing, setTyping] = useState(false)
  useEffect(() => { setPicks([]); setCustom(''); setTyping(false) }, [curIdx, task.updated_at])
  const toggle = (label: string) => {
    setTyping(false)
    if (!multi) { setPicks([label]); return }
    setPicks(p => p.includes(label) ? p.filter(x => x !== label) : p.length >= maxPick ? [...p.slice(1), label] : [...p, label])
  }

  const answered = qa.filter(x => x.answer?.length || x.custom)
  const ansText = (x: any) => x.custom || (Array.isArray(x.answer) ? x.answer.join(' + ') : x.answer)
  const submit = () => {
    if (!cur) return
    const answer = typing ? null : multi ? picks : picks[0] ?? null
    const next = qa.map((x, i) => i === curIdx ? { ...x, answer, custom: typing ? custom.trim() : null } : x)
    onAnswer(next)
  }
  const redoFrom = (i: number) => { if (confirm(`${i + 1}번 질문부터 다시 답할까요?`)) onAnswer(qa.slice(0, i)) }

  return (
    <div className="flex gap-4 flex-wrap items-start">
      <div className="flex-[3_1_420px] min-w-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-bold text-brand-high">질의응답 · {Math.min(answered.length + 1, 5)} / 5</div>
          <div className="w-40 h-1.5 rounded bg-gray-200"><div className="h-full rounded bg-brand-high" style={{ width: `${Math.min(answered.length / 5, 1) * 100}%` }} /></div>
        </div>
        {cur && !readOnly ? (
          <div className={`${card} p-5 flex flex-col gap-3`}>
            {cur.badge && <span className="self-start text-[11px] font-extrabold text-brand-high-dark bg-brand-high-pale px-2.5 py-1 rounded-full">{cur.badge}</span>}
            <div className="text-[19px] font-extrabold text-ink leading-[1.5]">{cur.q}</div>
            {multi && <div className="text-[12px] font-semibold text-brand-high-dark -mt-1">1~{maxPick}개 골라요 · 2개를 고르면 섞어서 나만의 방향이 돼요</div>}
            {cur.note && <div className="text-[12px] text-ink-secondary bg-gray-50 border border-line rounded-lg px-3 py-2">👥 {cur.note}</div>}
            <div className="flex flex-col gap-2">
              {(cur.options ?? []).map((o: any) => {
                const on = picks.includes(o.label) && !typing
                return (
                  <button key={o.label} onClick={() => toggle(o.label)}
                    className={`text-left rounded-xl px-4 py-3 transition-all flex gap-3 items-start ${on ? 'border-2 border-brand-high bg-brand-high-pale' : 'border border-line hover:border-brand-high-light'}`}>
                    {multi && <span className={`flex-none mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center text-[11px] font-extrabold ${on ? 'bg-brand-high border-brand-high text-white' : 'border-line text-transparent'}`}>✓</span>}
                    <span className="min-w-0">
                      {o.from && <span className="inline-block text-[10px] font-bold text-brand-high-dark bg-white border border-brand-high-light rounded px-1.5 py-0.5 mb-1">{o.from}</span>}
                      <span className="block text-[14px] font-bold text-ink">{o.label}</span>
                      {o.desc && <span className="block text-[12px] text-ink-secondary mt-0.5">{o.desc}</span>}
                    </span>
                  </button>
                )
              })}
              <button onClick={() => { setTyping(true); setPicks([]) }} className={`text-left rounded-xl px-4 py-3 border border-dashed ${typing ? 'border-brand-high bg-brand-high-pale' : 'border-line'} text-[13px] font-bold text-ink-secondary`}>✍ 직접 입력할게요</button>
              {typing && <textarea autoFocus rows={3} value={custom} onChange={e => setCustom(e.target.value)} placeholder="내 생각을 자유롭게 써 주세요"
                className="w-full px-3 py-2.5 text-[13px] border border-line rounded-lg focus:outline-none focus:border-brand-high leading-[1.7]" />}
            </div>
            <div className="flex justify-between gap-2 flex-wrap">
              <button onClick={() => onAnswer(qa.slice(0, curIdx))} className={btnSub}>다른 질문으로 바꾸기</button>
              <div className="flex gap-2">
                {answered.length >= 3 && <button onClick={() => onFinish(answered)} className={btnSub}>여기까지 하고 가이드 보기</button>}
                <button disabled={typing ? !custom.trim() : picks.length === 0} onClick={submit} className={btnMain}>다음 →</button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${card} p-5 text-[13px] text-ink-secondary`}>
            {readOnly ? '질의응답을 마쳤어요. 오른쪽에서 답을 볼 수 있어요.' : '질문을 불러오지 못했어요.'}
            {!readOnly && <button onClick={() => onAnswer(qa)} className={`${btnMain} ml-3`}>질문 다시 받기</button>}
          </div>
        )}
      </div>

      <div className="flex-[2_1_260px] min-w-0 flex flex-col gap-3">
        <div className={`${card} p-4 flex flex-col gap-2`}>
          <div className="text-[13px] font-extrabold text-ink">이 과제와 이은 내 것</div>
          {task.roadmap_reco?.deepen && <div className="text-[12px] px-3 py-2 rounded-lg bg-gray-50">지난 탐구 · {task.roadmap_reco.deepen.title}</div>}
          {task.roadmap_reco?.thisTerm && <div className="text-[12px] px-3 py-2 rounded-lg bg-brand-high-pale text-brand-high-dark">로드맵 · {task.roadmap_reco.thisTerm.title}</div>}
        </div>
        <div className={`${card} p-4 flex flex-col gap-2.5`}>
          <div className="text-[13px] font-extrabold text-ink">내 답변</div>
          {answered.length === 0 && <div className="text-[12px] text-ink-muted">아직 답한 질문이 없어요</div>}
          {answered.map((x, i) => (
            <div key={i} className="border-b border-gray-100 pb-2">
              <div className="text-[11px] text-ink-muted">Q{i + 1} · {x.q}</div>
              <div className="text-[13px] text-ink leading-snug mt-0.5">{ansText(x)}</div>
              {!readOnly && <button onClick={() => redoFrom(i)} className="text-[11px] font-semibold text-brand-high-dark mt-1">여기부터 다시 답하기</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------- 4. 학습가이드 ----------
function StepGuide({ task, readOnly, hasDraft, onDraft }: { task: Task; readOnly: boolean; hasDraft: boolean; onDraft: (format: string) => void }) {
  // 글 구조 목록 · 추천 · 지금 고른 것 — 서버(school-task-ai 'formats')에서 받는다
  const { data: fm } = useQuery({
    queryKey: ['school-task-formats', task.id, task.analysis?.structure],
    enabled: !readOnly,
    queryFn: () => callAI('formats', { taskId: task.id }),
  })
  const [pick, setPick] = useState<string | null>(null)
  const sel = pick ?? fm?.current ?? null
  const selFmt = (fm?.formats ?? []).find((f: any) => f.key === sel)

  return (
    <div className="flex flex-col gap-4">
      <div className={`${card} p-6`}><Md text={task.guide || '가이드가 아직 없어요.'} /></div>
      {!readOnly && (
        <div className={`${card} p-5 flex flex-col gap-3`}>
          <div>
            <div className="text-[15px] font-extrabold text-ink">어떤 구조로 쓸까요?</div>
            <div className="text-[12px] text-ink-secondary mt-0.5">고른 구조대로 문단이 나뉘어 초안이 만들어져요. 안내문의 필수 항목은 문단 안에 다 들어가요.</div>
          </div>
          {!fm ? (
            <div className="text-[12px] text-ink-muted py-3">구조 목록을 불러오는 중...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {fm.formats.map((f: any) => (
                <button key={f.key} onClick={() => setPick(f.key)}
                  className={`text-left rounded-xl px-3 py-2.5 transition-all ${sel === f.key ? 'border-2 border-brand-high bg-brand-high-pale' : 'border border-line hover:border-brand-high-light'}`}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[13px] font-bold text-ink">{f.label}</span>
                    {f.key === fm.recommended && <span className="text-[10px] font-extrabold text-white bg-brand-high px-1.5 py-0.5 rounded">추천</span>}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">{f.hint}</div>
                </button>
              ))}
            </div>
          )}
          {selFmt && (
            <div className="text-[12px] text-ink-secondary bg-gray-50 rounded-lg px-3 py-2">
              <b className="text-ink">문단 순서</b> · {selFmt.parts.join(' → ')}
            </div>
          )}
          <div className="flex justify-end">
            <button disabled={!sel} onClick={() => sel && onDraft(sel)} className={btnMain}>
              {hasDraft ? '↻ 이 구조로 초안 다시 만들기' : '초안 만들기 →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- 5. 초안 · 채점 ----------
function StepDraft({ task, draft, readOnly, onScore, onRedo, reload }: { task: Task; draft: Draft; readOnly: boolean; onScore: (content: string) => void; onRedo: () => void; reload: () => Promise<void> }) {
  const [content, setContent] = useState<string>(draft?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(true)
  useEffect(() => { setContent(draft?.content ?? '') }, [draft?.id, draft?.updated_at])
  // 초안은 완성본이라 직접 채울 칸이 없다 — 혹시 남은 표시는 저장·제출할 때 숫자로만 센다
  const blanks = useMemo(() => blanksOf(content), [content])
  const sc = draft?.score

  if (!draft) return <div className={`${card} p-6 text-[13px] text-ink-muted`}>초안이 아직 없어요.</div>
  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('high_school_task_draft').update({ content, blanks_left: blanks.length, updated_at: new Date().toISOString() }).eq('id', draft.id)
    setSaving(false)
    if (error) alert('저장 실패: ' + error.message); else await reload()
  }
  const submit = async () => {
    if (!confirm('선생님께 제출할까요? 제출하면 선생님이 확인할 때까지 고칠 수 없어요.')) return
    const now = new Date().toISOString()
    const a = await supabase.from('high_school_task_draft').update({ content, blanks_left: 0, submitted_at: now }).eq('id', draft.id)
    const b = await supabase.from('high_school_task').update({ status: 'submitted', submitted_at: now, updated_at: now }).eq('id', task.id)
    if (a.error || b.error) { alert('제출 실패: ' + (a.error || b.error)!.message); return }
    alert('제출했어요! 선생님 첨삭을 기다려 주세요.')
    await reload()
  }

  return (
    <div className="flex gap-4 flex-wrap items-start">
      <div className={`${card} flex-[3_1_460px] min-w-0 flex flex-col`}>
        <div className="px-4 py-2.5 border-b border-line flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[13px] font-bold text-brand-high">{draft.round}차 초안</div>
          <div className="flex items-center gap-2">
            {!readOnly && <button onClick={onRedo} className="text-[12px] font-semibold text-ink-secondary border border-line rounded-md px-2.5 py-1">↻ 구조 바꿔 다시 만들기</button>}
            {!readOnly && <button onClick={() => setPreview(!preview)} className="text-[12px] font-semibold text-ink-secondary border border-line rounded-md px-2.5 py-1">{preview ? '✏️ 고치기' : '👀 미리보기'}</button>}
          </div>
        </div>
        <div className="p-5">
          {preview || readOnly ? <Md text={content} /> :
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={28}
              className="w-full px-3 py-2.5 text-[13.5px] border border-line rounded-lg focus:outline-none focus:border-brand-high leading-[1.8] font-sans" />}
        </div>
      </div>

      <div className="flex-[2_1_300px] min-w-0 flex flex-col gap-3">
        <div className={`${card} p-4 flex flex-col gap-2`}>
          <div className="flex items-baseline justify-between">
            <div className="text-[13px] font-extrabold text-ink">안내문 기준 채점</div>
            {sc ? <div className="text-[24px] font-extrabold text-brand-high-dark">{sc.total}<span className="text-[13px] text-ink-muted">/{sc.max}</span></div> : <div className="text-[12px] text-ink-muted">아직 안 받았어요</div>}
          </div>
          {sc?.items?.map((it: any, i: number) => (
            <div key={i} className={`rounded-lg px-3 py-2 ${it.got < it.max ? 'bg-orange-50' : 'bg-gray-50'}`}>
              <div className="flex justify-between text-[12.5px]"><span>{it.name}</span><b className={it.got < it.max ? 'text-orange-800' : ''}>{it.got} / {it.max}</b></div>
              {it.got < it.max && it.tip && <div className="text-[11.5px] text-ink-secondary leading-snug mt-1">{it.tip}</div>}
            </div>
          ))}
          {sc?.roadmap?.length > 0 && (
            <div className="bg-brand-high-pale rounded-lg px-3 py-2 text-[12px] leading-snug">
              <b className="text-brand-high-dark">로드맵 체크</b> · {sc.roadmap.map((r: any) => `${r.skill} ${r.filled ? '채워짐' : '아직'}`).join(' · ')}
            </div>
          )}
        </div>

        {!readOnly && (
          <>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className={`${btnSub} flex-1`}>{saving ? '저장 중...' : '💾 저장'}</button>
              <button onClick={() => onScore(content)} className={`${btnSub} flex-1 !border-brand-high !text-brand-high-dark`}>{sc ? '다시 채점받기' : '채점받기'}</button>
            </div>
            <button onClick={submit} className={`${btnMain} w-full`}>선생님께 제출</button>
          </>
        )}
      </div>
    </div>
  )
}

// ---------- 6. 선생님 첨삭 ----------
function StepReview({ task, drafts, comments, reload, onRewrite }: { task: Task; drafts: Draft[]; comments: any[]; reload: () => Promise<void>; onRewrite: () => void }) {
  const last = drafts[drafts.length - 1]
  const mine = comments.filter(c => c.draft_id === last?.id)
  const [busy, setBusy] = useState(false)

  const rewrite = async () => {
    if (!last) return
    setBusy(true)
    try {
      const round = (task.current_round ?? last.round) + 1
      const { error } = await supabase.from('high_school_task_draft').insert({ task_id: task.id, round, content: last.content, blanks_left: 0 })
      if (error) throw error
      await supabase.from('high_school_task').update({ current_round: round, status: 'writing', updated_at: new Date().toISOString() }).eq('id', task.id)
      await reload(); onRewrite()
    } catch (e: any) { alert('실패: ' + e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="flex gap-4 flex-wrap items-start">
      <div className={`${card} flex-[3_1_460px] min-w-0`}>
        <div className="px-4 py-2.5 border-b border-line text-[13px] font-bold text-ink-secondary">{last?.round}차 제출본</div>
        <div className="p-5"><Md text={last?.content || ''} /></div>
      </div>
      <div className="flex-[2_1_300px] min-w-0 flex flex-col gap-3">
        <div className={`rounded-xl p-4 border ${task.status === 'done' ? 'bg-green-50 border-green-200' : task.status === 'revise' ? 'bg-orange-50 border-orange-200' : 'bg-brand-high-pale border-brand-high-light'}`}>
          <div className="text-[14px] font-extrabold text-ink">
            {task.status === 'done' ? '🎉 완료됐어요' : task.status === 'revise' ? '✏️ 선생님이 고쳐 쓰기를 요청했어요' : '⏳ 선생님이 확인하고 있어요'}
          </div>
          {task.status === 'revise' && <button onClick={rewrite} disabled={busy} className={`${btnMain} w-full mt-3`}>{busy ? '준비 중...' : `${(task.current_round ?? 1) + 1}차로 고쳐 쓰기`}</button>}
        </div>

        {mine.length > 0 && (
          <div className={`${card} p-4 flex flex-col gap-2.5`}>
            <div className="text-[13px] font-extrabold text-ink">선생님 코멘트 {mine.length}</div>
            {mine.map(c => (
              <div key={c.id} className="border border-line rounded-lg p-3 flex flex-col gap-1.5">
                <span className={`self-start text-[10px] font-extrabold px-1.5 py-0.5 rounded ${c.importance === '필수' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-ink-secondary'}`}>{c.importance}</span>
                {c.quote && <div className="text-[12px] text-ink-muted">"{c.quote}"</div>}
                <div className="text-[13px] leading-[1.6] text-ink">{c.body}</div>
                {c.suggestion && <div className="text-[12px] text-brand-high-dark bg-brand-high-pale rounded px-2 py-1">제안: {c.suggestion}</div>}
              </div>
            ))}
          </div>
        )}

        {task.status === 'done' && task.setuk_text && (
          <div className={`${card} p-4 flex flex-col gap-2`}>
            <div className="text-[13px] font-extrabold text-brand-high-dark">세특 예상 문장</div>
            <div className="text-[13px] leading-[1.75] text-ink">{task.setuk_text}</div>
            {Array.isArray(task.interview_qs) && task.interview_qs.length > 0 && (
              <>
                <div className="text-[13px] font-extrabold text-ink mt-2">면접에서 이렇게 물어볼 수 있어요</div>
                {task.interview_qs.map((q: any, i: number) => <div key={i} className="text-[12.5px] text-ink-secondary">Q{i + 1}. {q.q}</div>)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}