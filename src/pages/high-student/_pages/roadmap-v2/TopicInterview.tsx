import { useEffect, useMemo, useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'

// ============================================================
// 기본 질문 사다리 — 앞 답변이 다음 질문의 재료가 되도록
// ============================================================

const BASE_QUESTIONS = [
  '먼저, 이 탐구를 왜 하게 됐는지 얘기해줄래?',
  '그중에서 제일 궁금했던 게 뭐였어?',
  '알아보기 전이랑 후로 생각이 달라진 게 있어?',
  '하다가 막혔던 지점은 없었어? 어떻게 넘었어?',
  '이 탐구가 네 진로랑 어떻게 이어진다고 생각해?',
  '다음엔 뭘 더 알아보고 싶어?',
]

/** 기본 질문마다 꼬리질문을 몇 번까지 이어갈지 */
const MAX_FOLLOWUP = 1

interface Msg {
  role: 'ai' | 'student'
  text: string
  /** 기본 질문인지 꼬리질문인지 */
  kind?: 'base' | 'follow'
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

interface Props {
  topicTitle: string
  major?: string | null
  career?: string | null
  grade?: number
  saved?: string | null
  saving?: boolean
  onSaveContent: (content: string) => void
}

export default function TopicInterview({
  topicTitle, major, career, grade, saved, saving, onSaveContent,
}: Props) {
  const student = useAtomValue(studentState)
  const studentId = student?.id ? String(student.id) : undefined

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [baseIdx, setBaseIdx] = useState(0)
  const [followCount, setFollowCount] = useState(0)
  const [thinking, setThinking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const started = messages.length > 0
  const finished = baseIdx >= BASE_QUESTIONS.length
  const answered = messages.filter((m) => m.role === 'student').length

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const start = () => {
    setMessages([{ role: 'ai', text: BASE_QUESTIONS[0], kind: 'base' }])
    setBaseIdx(0)
    setFollowCount(0)
  }

  /** 학생 답변 → 꼬리질문 or 다음 기본 질문 */
  const submit = async (text: string) => {
    const answer = text.trim()
    if (!answer || thinking) return

    const next = [...messages, { role: 'student' as const, text: answer }]
    setMessages(next)
    setInput('')

    // 꼬리질문을 더 할 수 있으면 AI에게 묻는다
    if (followCount < MAX_FOLLOWUP) {
      setThinking(true)
      try {
        const { data, error } = await supabase.functions.invoke('research-coach', {
          body: {
            mode: 'chat',
            major: major ?? '미정',
            grade: grade ? `고${grade}` : undefined,
            job: career ?? undefined,
            topic: topicTitle,
            message:
              `"${topicTitle}" 탐구를 한 학생과 대화 중이야.\n` +
              `방금 내가 물은 것: ${messages[messages.length - 1]?.text}\n` +
              `학생 답변: ${answer}\n\n` +
              `이 답변에서 한 겹 더 들어가는 꼬리질문 하나만, 학생에게 직접 묻는 반말 말투로 한 문장으로 만들어줘. 설명이나 평가는 빼고 질문만.`,
            history: next.map((m) => ({
              role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
              content: m.text,
            })),
          },
        })
        if (error || data?.error) throw new Error(error?.message || data?.error)

        const q = String(data.reply ?? '').trim()
        if (q) {
          setMessages([...next, { role: 'ai', text: q, kind: 'follow' }])
          setFollowCount((c) => c + 1)
          setThinking(false)
          return
        }
      } catch {
        // 꼬리질문 실패하면 조용히 다음 기본 질문으로 넘어간다
      }
      setThinking(false)
    }

    // 다음 기본 질문
    const ni = baseIdx + 1
    setBaseIdx(ni)
    setFollowCount(0)
    if (ni < BASE_QUESTIONS.length) {
      setMessages([...next, { role: 'ai', text: BASE_QUESTIONS[ni], kind: 'base' }])
    }
  }

  const compiled = useMemo(
    () =>
      messages
        .map((m) => (m.role === 'ai' ? `Q. ${m.text}` : m.text))
        .join('\n\n'),
    [messages],
  )

  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="text-[14px] font-extrabold text-ink mb-1">
        이 탐구를 왜 했는지 이야기하기
      </div>
      <div className="text-[11.5px] text-ink-muted mb-3 leading-relaxed">
        말로 답하면 돼요. 하나씩 물어보면서 더 깊이 파고들 거예요. 여기서 나온 말이 면접 답변이
        되고 생기부 재료가 돼요.
      </div>

      {!started ? (
        <>
          {saved && (
            <div className="rounded-lg border border-line bg-gray-50 px-3.5 py-3 mb-3">
              <div className="text-[11px] font-bold text-ink-secondary mb-1">지난 기록</div>
              <div className="text-[12px] text-ink-secondary leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                {saved}
              </div>
            </div>
          )}
          <button
            onClick={start}
            className="w-full h-12 bg-brand-high text-white rounded-xl text-[14px] font-bold hover:bg-brand-high-dark transition-all"
          >
            {saved ? '다시 이야기하기' : '시작하기'}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-brand-high rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (baseIdx / BASE_QUESTIONS.length) * 100)}%`,
                }}
              />
            </div>
            <span className="text-[11px] text-ink-muted">
              {Math.min(baseIdx + (finished ? 0 : 1), BASE_QUESTIONS.length)} /{' '}
              {BASE_QUESTIONS.length}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto mb-3 pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className="flex flex-col"
                style={{ alignItems: m.role === 'student' ? 'flex-end' : 'flex-start' }}
              >
                <div className="text-[10px] font-semibold text-ink-muted mb-1">
                  {m.role === 'student' ? '나' : m.kind === 'follow' ? '한 번 더' : '질문'}
                </div>
                <div
                  className="max-w-[85%] px-3.5 py-2.5 text-[13px] leading-[1.7] whitespace-pre-wrap"
                  style={{
                    borderRadius:
                      m.role === 'student' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background:
                      m.role === 'student'
                        ? '#2563EB'
                        : m.kind === 'follow'
                          ? '#FAF5FF'
                          : '#F8FAFC',
                    color: m.role === 'student' ? '#fff' : '#1a1a1a',
                    border:
                      m.role === 'student'
                        ? 'none'
                        : m.kind === 'follow'
                          ? '1px solid #DDD6FE'
                          : '1px solid #E5E7EB',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="text-[12px] text-ink-muted animate-pulse">생각하는 중…</div>
            )}
            <div ref={endRef} />
          </div>

          {finished ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3.5">
              <div className="text-[13px] font-bold text-green-900 mb-1">
                다 이야기했어요
              </div>
              <div className="text-[11.5px] text-green-800 leading-relaxed mb-3">
                지금 한 말이 그대로 면접 답변이 되고, 마지막에 말한 "더 알아보고 싶은 것"은 다음
                학년 탐구주제가 돼요.
              </div>
              <button
                onClick={() => onSaveContent(compiled)}
                disabled={saving}
                className="w-full h-11 bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-40"
              >
                {saving ? '저장 중…' : '기록 저장하기'}
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 items-end">
                <MicButton studentId={studentId} onTranscript={(t) => submit(t)} />
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      submit(input)
                    }
                  }}
                  rows={2}
                  placeholder="말하거나 직접 적어도 돼요"
                  className="flex-1 border border-line rounded-lg px-3.5 py-2.5 text-[13px] outline-none resize-y focus:border-brand-high"
                />
                <button
                  onClick={() => submit(input)}
                  disabled={!input.trim() || thinking}
                  className="h-[52px] w-[64px] bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-40"
                >
                  전송
                </button>
              </div>

              {answered > 0 && (
                <button
                  onClick={() => onSaveContent(compiled)}
                  disabled={saving}
                  className="w-full h-10 mt-2.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold hover:bg-gray-50"
                >
                  여기까지 저장하고 나중에 이어하기
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// 음성 입력
// ============================================================

function MicButton({
  studentId, onTranscript,
}: {
  studentId?: string
  onTranscript: (text: string) => void
}) {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.start()
      recorderRef.current = rec
      setRecording(true)
    } catch {
      alert('마이크 권한이 필요해요. 브라우저 설정에서 허용해주세요.')
    }
  }

  const stop = async () => {
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') return

    setRecording(false)
    setProcessing(true)

    const blob = await new Promise<Blob>((resolve) => {
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: 'audio/webm' })
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        resolve(b)
      }
      rec.stop()
    })

    try {
      if (!studentId) throw new Error('로그인 정보가 없어요')
      const audioBase64 = await blobToBase64(blob)
      const { data, error } = await supabase.functions.invoke('middle-stt-short', {
        body: { audioBase64 },
      })
      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || '음성 변환 실패')
      }
      const text = String(data.text ?? '').trim()
      if (text) onTranscript(text)
      else alert('음성을 인식하지 못했어요. 다시 시도해주세요.')
    } catch (e: any) {
      alert('음성 처리 중 오류: ' + (e?.message ?? ''))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <button
      onClick={recording ? stop : start}
      disabled={processing}
      title={recording ? '말 끝나면 눌러주세요' : '눌러서 말하기'}
      className="h-[52px] w-[52px] rounded-lg text-[20px] flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-50"
      style={{
        background: recording ? '#DC2626' : '#fff',
        border: recording ? 'none' : '1px solid #E5E7EB',
        color: recording ? '#fff' : '#475569',
      }}
    >
      {processing ? '…' : recording ? '■' : '🎙'}
    </button>
  )
}