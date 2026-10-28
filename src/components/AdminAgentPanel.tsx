// src/components/AdminAgentPanel.tsx
// 비커스 원장 AI 비서 — 오른쪽 아래 버튼 + 오른쪽 패널
// 엣지 함수 admin-agent 호출 (로그인한 원장 토큰이 자동으로 같이 감 → RLS 적용)

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type Card = { type: 'table'; title: string; columns: string[]; rows: (string | number)[][]; links?: string[] }
type Action = { type: 'open'; route: string }
type Usage = { input: number; output: number; calls: number }
type Msg = { role: 'user' | 'assistant'; content: string; cards?: Card[]; actions?: Action[]; usage?: Usage }

const SUGGEST = [
  '오늘 아침 브리핑 해줘',
  '입시 로드맵 빈 곳 있는 학생 알려줘',
  '보고서 검토 요청 온 거 있어?',
  '피드백 밀린 거 기능별로 알려줘',
  '수행평가 피드백 대기 목록 보여줘',
  '최근 일주일 미션 안 낸 중등 학생 누구야?',
]

export default function AdminAgentPanel() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', content: '안녕하세요, 원장님! 학생 현황이나 밀린 피드백을 말로 물어보세요. 🙂' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // 🎙️ 음성 입력 (기존 middle-stt-short = 네이버 CLOVA, 1분 이내)
  const [recording, setRecording] = useState(false)
  const [stt, setStt] = useState(false)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const rec = new MediaRecorder(stream)
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.start()
      recRef.current = rec
      setRecording(true)
    } catch {
      alert('마이크 권한이 필요해요. 브라우저 주소창 왼쪽 자물쇠에서 마이크를 허용해주세요.')
    }
  }

  const stopRec = async () => {
    const rec = recRef.current
    if (!rec || rec.state === 'inactive') return
    setRecording(false)
    setStt(true)
    const blob = await new Promise<Blob>(resolve => {
      rec.onstop = () => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        resolve(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
      rec.stop()
    })
    try {
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onloadend = () => resolve(String(r.result).split(',')[1] ?? '')
        r.onerror = reject
        r.readAsDataURL(blob)
      })
      const { data, error } = await supabase.functions.invoke('middle-stt-short', { body: { audioBase64 } })
      if (error || !data?.success) throw new Error(error?.message || data?.error || '변환 실패')
      const text = (data.text || '').trim()
      if (text) send(text)  // 말한 내용 바로 보내기
      else alert('말씀을 알아듣지 못했어요. 다시 한 번 말씀해주세요.')
    } catch (e: any) {
      alert('음성 변환 오류: ' + e.message)
    } finally {
      setStt(false)
    }
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, loading])

  // 사이드바 'AI 비서' 메뉴에서 열기
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('open-admin-agent', onOpen)
    return () => window.removeEventListener('open-admin-agent', onOpen)
  }, [])

  const send = async (text?: string) => {
    const message = (text ?? input).trim()
    if (!message || loading) return
    setInput('')
    const next: Msg[] = [...msgs, { role: 'user', content: message }]
    setMsgs(next)
    setLoading(true)
    try {
      const history = next.slice(1, -1).map(m => ({ role: m.role, content: m.content })) // 첫 인사말 제외
      const { data, error } = await supabase.functions.invoke('admin-agent', { body: { message, history } })
      if (error || data?.error) throw new Error(data?.error || error?.message)
      setMsgs([...next, { role: 'assistant', content: data.reply ?? '', cards: data.cards, actions: data.actions, usage: data.usage }])
      // 화면 열기 요청이면 바로 이동 (패널은 열린 채로)
      const open = (data.actions as Action[] | undefined)?.find(a => a.type === 'open')
      if (open) navigate(open.route)
    } catch (e: any) {
      setMsgs([...next, { role: 'assistant', content: '앗, 오류가 났어요: ' + (e?.message ?? '알 수 없음') }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* 열기 버튼 */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed right-6 bottom-6 z-[60] flex items-center gap-2 px-5 py-3 rounded-full text-white text-[14px] font-bold shadow-btn-primary hover:-translate-y-0.5 transition-all"
          style={{ background: 'linear-gradient(135deg,#1E40AF,#3B82F6)' }}>
          🤖 AI 비서
        </button>
      )}

      {/* 패널 */}
      {open && (
        <div className="fixed right-0 top-0 bottom-0 z-[60] w-[420px] max-w-full bg-white border-l border-line shadow-[0_0_40px_rgba(15,23,42,0.12)] flex flex-col">
          <div className="h-14 px-4 border-b border-line flex items-center gap-2 flex-shrink-0">
            <span className="text-[20px]">🤖</span>
            <div className="flex-1">
              <div className="text-[14px] font-extrabold text-ink">비커스 AI 비서</div>
              <div className="text-[11px] text-ink-muted">🔒 우리 학원 학생만 · 지금은 조회만 가능 · 예) “홍길동 예상질문 보여줘”</div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-ink-secondary">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
                <div className={m.role === 'user'
                  ? 'max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-brand-primary text-white text-[13px] font-semibold'
                  : 'max-w-[95%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white border border-line text-[13px] text-ink leading-relaxed whitespace-pre-wrap'}>
                  {m.content}

                  {m.cards?.map((c, ci) => (
                    <div key={ci} className="mt-3 border border-line rounded-xl overflow-hidden">
                      <div className="px-3 py-2 text-[12px] font-bold bg-gray-50 border-b border-line">
                        {c.title} <span className="text-ink-muted font-medium">· {c.rows.length}건</span>
                      </div>
                      <div className="max-h-[260px] overflow-y-auto">
                        <table className="w-full text-[12px]">
                          <thead><tr>{c.columns.map(col => <th key={col} className="text-left px-2.5 py-1.5 text-ink-muted font-semibold bg-white sticky top-0">{col}</th>)}</tr></thead>
                          <tbody>
                            {c.rows.map((r, ri) => (
                              <tr key={ri} onClick={() => c.links?.[ri] && navigate(c.links[ri])}
                                className={'border-t border-line-light ' + (c.links?.[ri] ? 'cursor-pointer hover:bg-blue-50' : '')}>
                                {r.map((cell, k) => <td key={k} className="px-2.5 py-1.5">{cell}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {c.links && <div className="px-3 py-1.5 text-[11px] text-ink-muted border-t border-line">행을 누르면 그 학생 화면으로 이동해요</div>}
                    </div>
                  ))}

                  {m.actions?.filter(a => a.type === 'open').map((a, ai) => (
                    <button key={ai} onClick={() => navigate(a.route)}
                      className="mt-3 block px-3 py-2 rounded-lg text-[12px] font-bold text-brand-primary border border-brand-primary-light hover:bg-brand-primary-bg">
                      👉 화면 다시 열기
                    </button>
                  ))}

                  {m.usage && (
                    <div className="mt-2 text-[10.5px] text-ink-muted">
                      🔢 {(m.usage.input + m.usage.output).toLocaleString()} 토큰 · AI {m.usage.calls}번 호출
                    </div>
                  )}
                </div>
              </div>
            ))}
            {recording && <div className="text-[12px] text-red-500 font-bold px-1">🎙️ 듣고 있어요… 다 말씀하시면 ⏹ 를 눌러주세요</div>}
            {stt && <div className="text-[12px] text-amber-600 px-1">✍️ 말씀을 글자로 바꾸는 중…</div>}
            {loading && <div className="text-[12px] text-ink-muted px-1">🔎 조회하는 중…</div>}
            <div ref={endRef} />
          </div>

          <div className="px-3 pt-2 flex gap-1.5 flex-wrap flex-shrink-0">
            {SUGGEST.map(s => (
              <button key={s} onClick={() => send(s)} disabled={loading}
                className="px-2.5 py-1.5 rounded-full border border-line text-[11.5px] font-semibold text-ink-secondary hover:border-brand-primary hover:text-brand-primary disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
          <div className="p-3 flex gap-2 flex-shrink-0">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send() }}
              placeholder="예) 피드백 밀린 거 몇 개야?"
              className="flex-1 px-3.5 py-2.5 border border-line rounded-xl text-[13px] focus:outline-none focus:border-brand-primary" />
            <button onClick={recording ? stopRec : startRec} disabled={loading || stt}
              title={recording ? '다시 누르면 보내요' : '말로 물어보기 (1분 이내)'}
              className={'w-11 rounded-xl border text-[18px] flex items-center justify-center ' +
                (recording ? 'bg-red-50 border-red-300 animate-pulse' : stt ? 'bg-amber-50 border-amber-200 cursor-wait' : 'border-line hover:border-brand-primary')}>
              {recording ? '⏹' : stt ? '⏳' : '🎙️'}
            </button>
            <button onClick={() => send()} disabled={loading || !input.trim()}
              className="px-4 rounded-xl bg-brand-primary text-white text-[13px] font-bold disabled:opacity-50">보내기</button>
          </div>
        </div>
      )}
    </>
  )
}