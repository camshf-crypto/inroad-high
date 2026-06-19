import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Research } from '../../../../_hooks/useHighResearch'

const THEME = {
  accent: '#2563EB', accentDark: '#1E3A8A', accentBg: '#EFF6FF',
  accentBorder: '#93C5FD', accentShadow: 'rgba(37, 99, 235, 0.15)',
}

interface Concept { major: string | null; career: string | null; grade: string | null }
interface EvalData {
  fit: string; fitReason: string; subjectMatch: string
  difficulty: string; action: string; comment: string
}
interface Alt { title: string; subject?: string; desc: string }

type Item =
  | { kind: 'eval'; data: EvalData | null; picked?: string }
  | { kind: 'alts'; direction: string; dataMode: string; dbAlts: Alt[]; keepAlts: Alt[]; careerAlts: Alt[] }
  | { kind: 'chat'; role: 'user' | 'assistant'; content: string; dataMode?: string }

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
  const [directionDone, setDirectionDone] = useState(false)  // 방향 선택 끝났나

  const scrollRef = useRef<HTMLDivElement>(null)

  // 진로 컨셉 로드 (학생 현재 학년)
  useEffect(() => {
    let cancelled = false
    async function load() {
      let sid = student?.id ? String(student.id) : null
      let g: string | null = student?.grade ? String(student.grade) : null
      if ((!sid || !g) && student?.email) {
        const { data: p } = await supabase.from('profiles').select('id, grade').eq('email', student.email).maybeSingle()
        if (p) { sid = sid ?? (p.id ? String(p.id) : null); g = g ?? (p.grade ? String(p.grade) : null) }
      }
      if (!sid) { if (!cancelled) setConceptLoaded(true); return }
      const { data: concepts } = await supabase
        .from('student_concept').select('major, career, grade')
        .eq('student_id', sid).eq('status', 'approved')
        .order('created_at', { ascending: false })
      let picked: Concept | null = null
      if (concepts && concepts.length > 0) {
        if (g) {
          const num = g.replace(/[^0-9]/g, '')
          picked = (concepts as Concept[]).find(c => c.grade && c.grade.replace(/[^0-9]/g, '') === num) ?? null
        }
        if (!picked) picked = concepts[0] as Concept
      }
      if (!cancelled) { setConcept(picked); setConceptLoaded(true) }
    }
    load()
    return () => { cancelled = true }
  }, [student?.id, student?.email, student?.grade])

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [items.length, loading])

  const major = concept?.major ?? ''
  const career = concept?.career ?? undefined
  const grade = concept?.grade ? String(concept.grade).replace(/[^0-9]/g, '') : undefined

  // 1턴: 적합도 평가
  useEffect(() => {
    if (!conceptLoaded || started || !major) return
    setStarted(true)
    setLoading(true)
    supabase.functions.invoke('research-coach', {
      body: {
        mode: 'eval', major, grade, job: career,
        subject: research.subject ?? undefined,
        topic: research.topic, content: research.content ?? undefined,
      },
    }).then(({ data, error }) => {
      setLoading(false)
      if (error || data?.error) {
        setItems([{ kind: 'chat', role: 'assistant', content: `오류: ${error?.message || data?.error}` }])
        return
      }
      setItems([{ kind: 'eval', data: data.eval }])
    })
  }, [conceptLoaded, started, major])

  // 방향 선택 → 2턴 대안
  const chooseDirection = (direction: 'keep' | 'career' | 'both', label: string) => {
    if (loading) return
    setDirectionDone(true)
    // 평가 카드에 선택 표시
    setItems(prev => prev.map(it => it.kind === 'eval' ? { ...it, picked: label } : it))
    setLoading(true)
    supabase.functions.invoke('research-coach', {
      body: {
        mode: 'alts', direction, major, grade, job: career,
        subject: research.subject ?? undefined,
        topic: research.topic, content: research.content ?? undefined,
      },
    }).then(({ data, error }) => {
      setLoading(false)
      if (error || data?.error) {
        setItems(prev => [...prev, { kind: 'chat', role: 'assistant', content: `오류: ${error?.message || data?.error}` }])
        return
      }
      setItems(prev => [...prev, {
        kind: 'alts', direction: data.direction, dataMode: data.dataMode,
        dbAlts: data.dbAlts ?? [], keepAlts: data.keepAlts ?? [], careerAlts: data.careerAlts ?? [],
      }])
    })
  }

  // 3턴+: 자유 코칭
  const buildHistory = () => {
    const h: { role: 'user' | 'assistant'; content: string }[] = []
    for (const it of items) {
      if (it.kind === 'chat') h.push({ role: it.role, content: it.content })
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
      body: { mode: 'chat', major, grade, job: career, message: text, history: buildHistory() },
    }).then(({ data, error }) => {
      setLoading(false)
      if (error || data?.error) {
        setItems(prev => [...prev, { kind: 'chat', role: 'assistant', content: `오류: ${error?.message || data?.error}` }])
        return
      }
      setItems(prev => [...prev, { kind: 'chat', role: 'assistant', content: data.reply, dataMode: data.dataMode }])
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
          items.map((it, i) => {
            if (it.kind === 'eval') return <EvalCard key={i} data={it.data} picked={it.picked} onChoose={chooseDirection} disabled={directionDone || loading} onUseAsFeedback={onUseAsFeedback} />
            if (it.kind === 'alts') return <AltsCard key={i} item={it} onUseAsFeedback={onUseAsFeedback} />
            return <ChatBubble key={i} msg={it} onUseAsFeedback={onUseAsFeedback} />
          })
        )}

        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-ink-muted px-1">
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>AI가 분석 중...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* 입력창 */}
      <div className="border-t border-line bg-white flex-shrink-0 p-3">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={major ? '추가로 물어보세요...' : '진로 컨셉 승인 후 사용 가능'}
          rows={2} disabled={loading || !major}
          className="w-full border border-line rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none leading-relaxed transition-colors font-sans disabled:bg-gray-50 disabled:opacity-70"
          onFocus={e => { e.target.style.borderColor = THEME.accent }}
          onBlur={e => { e.target.style.borderColor = '#E5E7EB' }} />
        <div className="flex items-center justify-between mt-2">
          <div className="text-[10px] text-ink-muted font-medium">Enter로 전송 · 답변을 피드백에 붙여넣기 가능</div>
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

// ── 1턴 평가 카드 + 방향 선택 버튼 ──
function EvalCard({ data, picked, onChoose, disabled, onUseAsFeedback }: {
  data: EvalData | null; picked?: string
  onChoose: (d: 'keep' | 'career' | 'both', label: string) => void
  disabled: boolean
  onUseAsFeedback?: (t: string) => void
}) {
  if (!data) return <div className="text-[12px] text-ink-muted">평가 결과를 불러오지 못했어요.</div>
  const fitColor = data.fit === '적합' ? { bg: '#ECFDF5', text: '#059669', bd: '#6EE7B7' }
    : data.fit === '부적합' ? { bg: '#FEF2F2', text: '#DC2626', bd: '#FCA5A5' }
    : { bg: '#FFFBEB', text: '#D97706', bd: '#FCD34D' }
  const feedbackText = `[적합도] ${data.fit} — ${data.fitReason}\n[과목 정합성] ${data.subjectMatch}\n[코멘트] ${data.comment}`

  return (
    <div className="flex flex-col gap-2.5">
      <div className="bg-white border border-line rounded-xl overflow-hidden">
        <div className="px-3.5 py-2 border-b border-line-light">
          <span className="text-[12px] font-bold text-ink">⚡ 빠른 판단</span>
        </div>
        <div className="px-3.5 py-3 flex flex-col gap-2">
          <Row label="적합도">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full mr-1.5"
              style={{ background: fitColor.bg, color: fitColor.text, border: `1px solid ${fitColor.bd}` }}>{data.fit}</span>
            <span className="text-[12px] text-ink-secondary">{data.fitReason}</span>
          </Row>
          <Row label="과목 정합성"><span className="text-[12px] text-ink">{data.subjectMatch}</span></Row>
          <Row label="난이도"><span className="text-[12px] text-ink">{data.difficulty}</span></Row>
          <Row label="권장 조치">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{data.action}</span>
          </Row>
          {data.comment && <div className="text-[12px] text-ink-secondary leading-relaxed mt-1 pt-2 border-t border-line-light">{data.comment}</div>}
        </div>
      </div>

      {/* 방향 선택 */}
      <div className="bg-white border border-line rounded-xl px-3.5 py-3">
        <div className="text-[12px] font-bold text-ink mb-2">🧭 어느 방향으로 발전시킬까요?</div>
        {picked ? (
          <div className="text-[11px] text-ink-muted">선택: <span className="font-bold" style={{ color: THEME.accentDark }}>{picked}</span></div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <DirBtn onClick={() => onChoose('keep', '과목 충실형')} disabled={disabled}
              title="과목 충실형" desc="과목 본연에 충실 + 진로는 자연스럽게" />
            <DirBtn onClick={() => onChoose('career', '진로 연계형')} disabled={disabled}
              title="진로 연계형" desc="희망 진로와 적극적으로 연결" />
            <DirBtn onClick={() => onChoose('both', '둘 다 비교')} disabled={disabled}
              title="둘 다 보기" desc="두 방향 비교해서 직접 고를게요" />
          </div>
        )}
      </div>

      {onUseAsFeedback && (
        <button onClick={() => onUseAsFeedback(feedbackText)}
          className="self-start text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-all">
          ↗ 피드백에 붙여넣기
        </button>
      )}
    </div>
  )
}

function DirBtn({ onClick, disabled, title, desc }: { onClick: () => void; disabled: boolean; title: string; desc: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="text-left px-3 py-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px"
      style={{ borderColor: THEME.accentBorder, background: '#fff' }}>
      <div className="text-[12px] font-bold" style={{ color: THEME.accentDark }}>{title}</div>
      <div className="text-[10.5px] text-ink-muted mt-0.5">{desc}</div>
    </button>
  )
}

// ── 2턴 대안 카드 ──
function AltsCard({ item, onUseAsFeedback }: {
  item: { dbAlts: Alt[]; keepAlts: Alt[]; careerAlts: Alt[]; dataMode: string }
  onUseAsFeedback?: (t: string) => void
}) {
  const mkFeedback = (a: Alt, tag: string) => `[${tag}] ${a.title}\n${a.subject ? `(${a.subject}) ` : ''}${a.desc}`
  return (
    <div className="bg-white border border-line rounded-xl overflow-hidden">
      <div className="px-3.5 py-2 border-b border-line-light">
        <span className="text-[12px] font-bold text-ink">💡 대안 추천</span>
      </div>
      <div className="px-3.5 py-3 flex flex-col gap-2.5">
        {item.dbAlts.length > 0 && item.dbAlts.map((a, i) => (
          <AltItem key={`db-${i}`} tag="DB 사례" color={{ bg: '#EFF6FF', text: '#2563EB' }} alt={a} onUse={onUseAsFeedback ? () => onUseAsFeedback(mkFeedback(a, 'DB 사례')) : undefined} />
        ))}
        {item.keepAlts.map((a, i) => (
          <AltItem key={`keep-${i}`} tag="과목 충실형" color={{ bg: '#ECFDF5', text: '#059669' }}
            alt={{ title: a.title, desc: `${a.subject ? `[${a.subject}] ` : ''}${a.desc}` }}
            onUse={onUseAsFeedback ? () => onUseAsFeedback(mkFeedback(a, '과목 충실형')) : undefined} />
        ))}
        {item.careerAlts.map((a, i) => (
          <AltItem key={`career-${i}`} tag="진로 연계형" color={{ bg: '#F5F3FF', text: '#7C3AED' }}
            alt={{ title: a.title, desc: `${a.subject ? `[${a.subject}] ` : ''}${a.desc}` }}
            onUse={onUseAsFeedback ? () => onUseAsFeedback(mkFeedback(a, '진로 연계형')) : undefined} />
        ))}
        {item.dbAlts.length === 0 && item.dataMode !== 'none' && (
          <div className="text-[11px] text-ink-muted italic">※ 검색된 데이터 중 학생 탐구와 맞는 사례가 없어 대안만 제안해요.</div>
        )}
        <div className="text-[10.5px] text-ink-muted mt-1 pt-2 border-t border-line-light">더 좁히고 싶으면 아래에 물어보세요 (예: "과목 충실형으로 더 구체적으로")</div>
      </div>
    </div>
  )
}

function AltItem({ tag, color, alt, onUse }: { tag: string; color: { bg: string; text: string }; alt: Alt; onUse?: () => void }) {
  return (
    <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: color.bg, color: color.text }}>{tag}</span>
        <span className="text-[12px] font-bold text-ink flex-1">{alt.title}</span>
        {onUse && (
          <button onClick={onUse} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-all">↗ 피드백</button>
        )}
      </div>
      <div className="text-[11.5px] text-ink-secondary leading-relaxed">{alt.desc}</div>
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

function ChatBubble({ msg, onUseAsFeedback }: {
  msg: { role: 'user' | 'assistant'; content: string; dataMode?: string }
  onUseAsFeedback?: (t: string) => void
}) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`text-[10px] font-semibold text-ink-muted mb-1 ${isUser ? 'mr-1' : 'ml-1'}`}>
        {isUser ? '👨‍🏫 나 (원장)' : '✨ AI 챗봇'}
      </div>
      <div className="max-w-[320px] px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
        style={{
          background: isUser ? THEME.accent : '#fff', color: isUser ? '#fff' : '#1a1a1a',
          border: isUser ? 'none' : '1px solid #E5E7EB',
          borderRadius: isUser ? '14px 2px 14px 14px' : '2px 14px 14px 14px',
          boxShadow: isUser ? `0 2px 8px ${THEME.accentShadow}` : '0 1px 2px rgba(15, 23, 42, 0.04)',
        }}>{msg.content}</div>
      {!isUser && onUseAsFeedback && (
        <button onClick={() => onUseAsFeedback(msg.content)}
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-all mt-1 ml-1">
          ↗ 피드백에 붙여넣기
        </button>
      )}
    </div>
  )
}