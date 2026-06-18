import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Research } from '../../../../_hooks/useHighResearch'

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
}

interface Concept { major: string | null; career: string | null; grade: string | null }
interface Alt { title: string; desc: string }
interface EvalData {
  fit: string; fitReason: string; subjectMatch: string
  difficulty: string; action: string; suggestion: string; genAlts: Alt[]
}
interface EvalMsg {
  kind: 'eval'
  dataMode: 'matched' | 'major_only' | 'none'
  refsCount: number
  eval: EvalData | null
  dbAlts: Alt[]
}
interface ChatMsg {
  kind: 'chat'
  role: 'user' | 'assistant'
  content: string
  dataMode?: 'matched' | 'major_only' | 'none'
}
type Item = EvalMsg | ChatMsg

export default function ResearchCoachPanel({
  student, research, onClose, onUseAsFeedback,
}: {
  student: any
  research: Research
  onClose: () => void
  onUseAsFeedback?: (text: string) => void
}) {
  const [items, setItems] = useState<Item[]>([])
  const [input, setInput] = useState('')
  const [concept, setConcept] = useState<Concept | null>(null)
  const [conceptLoaded, setConceptLoaded] = useState(false)
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 진로 컨셉 로드 (학생의 현재 학년 profiles.grade에 맞는 컨셉)
  useEffect(() => {
    let cancelled = false
    async function load() {
      let sid = student?.id ? String(student.id) : null
      let currentGrade: string | null = student?.grade ? String(student.grade) : null

      // id/현재학년 없으면 email로 profiles 조회
      if ((!sid || !currentGrade) && student?.email) {
        const { data: prof } = await supabase
          .from('profiles').select('id, grade').eq('email', student.email).maybeSingle()
        if (prof) {
          sid = sid ?? (prof.id ? String(prof.id) : null)
          currentGrade = currentGrade ?? (prof.grade ? String(prof.grade) : null)
        }
      }
      if (!sid) { if (!cancelled) setConceptLoaded(true); return }

      const { data: concepts } = await supabase
        .from('student_concept').select('major, career, grade')
        .eq('student_id', sid).eq('status', 'approved')
        .order('created_at', { ascending: false })

      let picked: Concept | null = null
      if (concepts && concepts.length > 0) {
        // 학생 현재 학년(예: "고2")에 맞는 컨셉 우선
        if (currentGrade) {
          const num = currentGrade.replace(/[^0-9]/g, '')
          picked = (concepts as Concept[]).find(
            c => c.grade && c.grade.replace(/[^0-9]/g, '') === num,
          ) ?? null
        }
        // 못 찾으면 최신 컨셉 폴백
        if (!picked) picked = concepts[0] as Concept
      }
      if (!cancelled) { setConcept(picked); setConceptLoaded(true) }
    }
    load()
    return () => { cancelled = true }
  }, [student?.id, student?.email, student?.grade])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items.length, loading])

  const major = concept?.major ?? ''
  const career = concept?.career ?? undefined
  const grade = concept?.grade ? String(concept.grade).replace(/[^0-9]/g, '') : undefined

  // 1턴 자동 평가
  useEffect(() => {
    if (!conceptLoaded || started) return
    setStarted(true)
    if (!major) return

    setLoading(true)
    supabase.functions.invoke('research-coach', {
      body: {
        major, grade, job: career,
        subject: research.subject ?? undefined,
        topic: research.topic,
        content: research.content ?? undefined,
        history: [],
      },
    }).then(({ data, error }) => {
      setLoading(false)
      if (error || data?.error) {
        setItems([{ kind: 'chat', role: 'assistant', content: `오류: ${error?.message || data?.error}` }])
        return
      }
      setItems([{
        kind: 'eval',
        dataMode: data.dataMode,
        refsCount: data.refsCount,
        eval: data.eval,
        dbAlts: data.dbAlts ?? [],
      }])
    })
  }, [conceptLoaded, started, major])

  const buildHistory = () => {
    const h: { role: 'user' | 'assistant'; content: string }[] = []
    for (const it of items) {
      if (it.kind === 'chat') h.push({ role: it.role, content: it.content })
      else if (it.eval) {
        h.push({ role: 'assistant', content: `평가: ${it.eval.fit}. ${it.eval.suggestion}` })
      }
    }
    return h
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading || !major) return
    setItems(prev => [...prev, { kind: 'chat', role: 'user', content: text }])
    setInput('')
    setLoading(true)

    supabase.functions.invoke('research-coach', {
      body: { major, grade, job: career, message: text, history: buildHistory() },
    }).then(({ data, error }) => {
      setLoading(false)
      if (error || data?.error) {
        setItems(prev => [...prev, { kind: 'chat', role: 'assistant', content: `오류: ${error?.message || data?.error}` }])
        return
      }
      setItems(prev => [...prev, {
        kind: 'chat', role: 'assistant', content: data.reply, dataMode: data.dataMode,
      }])
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="w-[400px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden font-sans"
      style={{ boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}>

      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-line flex-shrink-0" style={{ background: THEME.accentBg }}>
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-bold flex items-center gap-1.5" style={{ color: THEME.accentDark }}>
            ✨ 탐구주제 고도화 챗봇
          </div>
          <button onClick={onClose}
            className="text-ink-muted hover:text-ink text-[16px] w-7 h-7 rounded-lg hover:bg-white/60 flex items-center justify-center transition-all">✕</button>
        </div>
        <div className="text-[11px] text-ink-secondary mt-1 font-medium truncate">
          {student.name} 학생{major && <span> · {major}{grade ? ` ${grade}학년` : ''}</span>}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
        {!conceptLoaded ? (
          <div className="flex-1 flex items-center justify-center text-ink-muted text-[12px]">불러오는 중...</div>
        ) : !major ? (
          <div className="text-[13px] text-ink-secondary leading-relaxed bg-white border border-line rounded-xl p-4">
            ⚠️ {student.name} 학생의 진로 컨셉(희망학과)이 아직 승인되지 않았어요. 진로계열검사를 완료·승인하면 학과 데이터 기반으로 평가해드릴 수 있어요.
          </div>
        ) : (
          items.map((it, i) =>
            it.kind === 'eval'
              ? <EvalCard key={i} msg={it} onUseAsFeedback={onUseAsFeedback} />
              : <ChatBubble key={i} msg={it} onUseAsFeedback={onUseAsFeedback} />,
          )
        )}

        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-ink-muted px-1">
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            AI가 분석 중...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* 입력창 */}
      <div className="border-t border-line bg-white flex-shrink-0 p-3">
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={major ? '메시지를 입력하세요...' : '진로 컨셉 승인 후 사용 가능해요'}
          rows={2} disabled={loading || !major}
          className="w-full border border-line rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none leading-relaxed transition-colors font-sans disabled:bg-gray-50 disabled:opacity-70"
          onFocus={e => { e.target.style.borderColor = THEME.accent }}
          onBlur={e => { e.target.style.borderColor = '#E5E7EB' }} />
        <div className="flex items-center justify-between mt-2">
          <div className="text-[10px] text-ink-muted font-medium">Enter로 전송 · 챗봇 답변을 피드백에 붙여넣기 가능</div>
          <button onClick={handleSend} disabled={!input.trim() || loading || !major}
            className="px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed"
            style={{
              background: input.trim() && !loading && major ? THEME.accent : '#E5E7EB',
              color: input.trim() && !loading && major ? '#fff' : '#9CA3AF',
            }}>전송 →</button>
        </div>
      </div>
    </div>
  )
}

// ── 1턴 평가 카드 (블록) ──
function EvalCard({ msg, onUseAsFeedback }: { msg: EvalMsg; onUseAsFeedback?: (t: string) => void }) {
  const e = msg.eval
  if (!e) return <div className="text-[12px] text-ink-muted">평가 결과를 불러오지 못했어요.</div>

  const fitColor =
    e.fit === '적합' ? { bg: '#ECFDF5', text: '#059669', bd: '#6EE7B7' }
    : e.fit === '부적합' ? { bg: '#FEF2F2', text: '#DC2626', bd: '#FCA5A5' }
    : { bg: '#FFFBEB', text: '#D97706', bd: '#FCD34D' }

  const feedbackText = `[적합도] ${e.fit} — ${e.fitReason}\n[과목 정합성] ${e.subjectMatch}\n[수정·심화 제안] ${e.suggestion}`

  return (
    <div className="flex flex-col gap-2.5">
      {/* 블록 1: 빠른 판단 */}
      <div className="bg-white border border-line rounded-xl overflow-hidden">
        <div className="px-3.5 py-2 border-b border-line-light">
          <span className="text-[12px] font-bold text-ink">⚡ 빠른 판단</span>
        </div>
        <div className="px-3.5 py-3 flex flex-col gap-2">
          <Row label="적합도">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full mr-1.5"
              style={{ background: fitColor.bg, color: fitColor.text, border: `1px solid ${fitColor.bd}` }}>
              {e.fit}
            </span>
            <span className="text-[12px] text-ink-secondary">{e.fitReason}</span>
          </Row>
          <Row label="과목 정합성"><span className="text-[12px] text-ink">{e.subjectMatch}</span></Row>
          <Row label="난이도"><span className="text-[12px] text-ink">{e.difficulty}</span></Row>
          <Row label="권장 조치">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {e.action}
            </span>
          </Row>
        </div>
      </div>

      {/* 블록 2: 수정·심화 제안 */}
      <div className="bg-white border border-line rounded-xl overflow-hidden">
        <div className="px-3.5 py-2 border-b border-line-light">
          <span className="text-[12px] font-bold text-ink">🔧 수정·심화 제안</span>
        </div>
        <div className="px-3.5 py-3 text-[12.5px] text-ink leading-relaxed">{e.suggestion}</div>
      </div>

      {/* 블록 3: 대안 추천 (DB + 생성) */}
      <div className="bg-white border border-line rounded-xl overflow-hidden">
        <div className="px-3.5 py-2 border-b border-line-light flex items-center justify-between">
          <span className="text-[12px] font-bold text-ink">💡 대안 추천</span>
          <span className="text-[10px] text-ink-muted font-medium">DB + 생성</span>
        </div>
        <div className="px-3.5 py-3 flex flex-col gap-2.5">
          {msg.dbAlts.length > 0 ? (
            msg.dbAlts.map((a, i) => (
              <AltItem key={`db-${i}`} tag="DB" tagColor={{ bg: '#EFF6FF', text: '#2563EB' }} alt={a} />
            ))
          ) : msg.dataMode !== 'none' ? (
            <div className="text-[11px] text-ink-muted italic">※ 검색된 데이터 중 이 진로에 딱 맞는 사례가 없어 생성 대안으로 안내해요.</div>
          ) : null}
          {e.genAlts?.map((a, i) => (
            <AltItem key={`gen-${i}`} tag="생성" tagColor={{ bg: '#F5F3FF', text: '#7C3AED' }} alt={a} />
          ))}
          {msg.dataMode === 'none' && (
            <div className="text-[11px] text-ink-muted italic">※ 이 학과는 축적된 데이터가 없어 생성 대안만 제공돼요.</div>
          )}
        </div>
      </div>

      {/* 피드백에 붙여넣기 */}
      {onUseAsFeedback && (
        <button onClick={() => onUseAsFeedback(feedbackText)}
          className="self-start text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-all">
          ↗ 피드백에 붙여넣기
        </button>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] font-semibold text-ink-muted w-[60px] flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 flex items-center flex-wrap">{children}</div>
    </div>
  )
}

function AltItem({ tag, tagColor, alt }: { tag: string; tagColor: { bg: string; text: string }; alt: Alt }) {
  return (
    <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: tagColor.bg, color: tagColor.text }}>{tag}</span>
        <span className="text-[12px] font-bold text-ink">{alt.title}</span>
      </div>
      <div className="text-[11.5px] text-ink-secondary leading-relaxed">{alt.desc}</div>
    </div>
  )
}

// ── 2턴+ 말풍선 ──
function ChatBubble({ msg, onUseAsFeedback }: { msg: ChatMsg; onUseAsFeedback?: (t: string) => void }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`text-[10px] font-semibold text-ink-muted mb-1 ${isUser ? 'mr-1' : 'ml-1'}`}>
        {isUser ? '👨‍🏫 나 (원장)' : '✨ AI 챗봇'}
      </div>
      <div className="max-w-[320px] px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
        style={{
          background: isUser ? THEME.accent : '#fff',
          color: isUser ? '#fff' : '#1a1a1a',
          border: isUser ? 'none' : '1px solid #E5E7EB',
          borderRadius: isUser ? '14px 2px 14px 14px' : '2px 14px 14px 14px',
          boxShadow: isUser ? `0 2px 8px ${THEME.accentShadow}` : '0 1px 2px rgba(15, 23, 42, 0.04)',
        }}>
        {msg.content}
      </div>
      {!isUser && (
        <div className="flex items-center gap-2 mt-1 ml-1 flex-wrap">
          {msg.dataMode === 'matched' && <Badge bg="bg-blue-50" text="text-blue-600" bd="border-blue-200">DB 기반</Badge>}
          {msg.dataMode === 'major_only' && <Badge bg="bg-indigo-50" text="text-indigo-600" bd="border-indigo-200">학과 일반</Badge>}
          {msg.dataMode === 'none' && <Badge bg="bg-gray-100" text="text-gray-500" bd="border-gray-200">일반 기준</Badge>}
          {onUseAsFeedback && (
            <button onClick={() => onUseAsFeedback(msg.content)}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-all">
              ↗ 피드백에 붙여넣기
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Badge({ bg, text, bd, children }: { bg: string; text: string; bd: string; children: React.ReactNode }) {
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${bg} ${text} border ${bd}`}>{children}</span>
}