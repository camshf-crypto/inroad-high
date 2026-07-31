import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState, academyState } from '@/lib/auth/atoms'
import {
  generateDebateOpening,
  generateDebateReply,
  generateDebateFeedback,
  type DebateStance,
  type DebateFeedback,
} from '@/lib/debate/debateService'

interface Msg {
  speaker: 'ai' | 'student'
  text: string
}

interface Props {
  topicId: string
  /** 탐구주제 제목 — 논제 기본값으로 쓴다 */
  topicTitle: string
  /** 이미 저장된 논제·기록이 있으면 */
  saved?: string | null
  onSaveContent: (content: string) => void
}

const STANCE_LABEL: Record<DebateStance, string> = { pro: '찬성', con: '반대' }
const other = (s: DebateStance): DebateStance => (s === 'pro' ? 'con' : 'pro')

export default function TopicDebate({ topicId, topicTitle, saved, onSaveContent }: Props) {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const qc = useQueryClient()

  const [motion, setMotion] = useState(topicTitle)
  const [stance, setStance] = useState<DebateStance | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<DebateFeedback | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const started = messages.length > 0
  const turns = messages.filter((m) => m.speaker === 'student').length

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, feedback])

  const start = async (s: DebateStance) => {
    if (!motion.trim()) {
      setError('논제를 먼저 적어주세요')
      return
    }
    setStance(s)
    setBusy(true)
    setError(null)
    try {
      const opening = await generateDebateOpening({ topic: motion.trim(), aiStance: other(s) })
      setMessages([{ speaker: 'ai', text: opening }])
    } catch (e: any) {
      setError('토론을 시작하지 못했어요: ' + (e?.message ?? ''))
      setStance(null)
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    const text = input.trim()
    if (!text || !stance || busy) return
    setInput('')
    const next = [...messages, { speaker: 'student' as const, text }]
    setMessages(next)
    setBusy(true)
    setError(null)
    try {
      const reply = await generateDebateReply({
        topic: motion.trim(),
        aiStance: other(stance),
        studentStance: stance,
        history: next.map((m) => ({ speaker: m.speaker, text: m.text })),
        studentText: text,
      })
      setMessages([...next, { speaker: 'ai', text: reply }])
    } catch (e: any) {
      setError('답변을 받지 못했어요: ' + (e?.message ?? ''))
    } finally {
      setBusy(false)
    }
  }

  const finish = useMutation({
    mutationFn: async () => {
      if (!stance) throw new Error('입장을 먼저 정해주세요')
      const result = await generateDebateFeedback({
        topic: motion.trim(),
        studentStance: stance,
        messages: messages.map((m) => ({ speaker: m.speaker, text: m.text })),
      })
      setFeedback(result)

      const studentId = student?.id ? String(student.id) : null
      if (studentId) {
        const { data } = await supabase
          .from('debate_sessions')
          .insert({
            student_id: studentId,
            academy_id: academy?.academyId ? String(academy.academyId) : null,
            topic: motion.trim(),
            topic_category: '탐구주제',
            student_stance: stance,
            ai_stance: other(stance),
            messages: messages.map((m) => ({ speaker: m.speaker, text: m.text })),
            turn_count: turns,
            ai_feedback: result,
            status: 'pending',
          })
          .select('id')
          .single()

        // 파이프라인 토론 단계에 세션 연결
        if (data?.id) {
          await supabase
            .from('high_roadmap_pipeline')
            .update({ linked_table: 'debate_sessions', linked_id: data.id })
            .eq('topic_id', topicId)
            .eq('step', 'debate')
        }
      }

      // 토론 기록을 단계 본문으로도 남긴다
      const log = [
        `논제: ${motion.trim()}`,
        `내 입장: ${STANCE_LABEL[stance]}`,
        '',
        ...messages.map((m) => `${m.speaker === 'ai' ? 'AI' : '나'}: ${m.text}`),
      ].join('\n')
      onSaveContent(log)

      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topic-pipeline', topicId] })
    },
    onError: (e: any) => setError('마무리에 실패했어요: ' + (e?.message ?? '')),
  })

  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="text-[14px] font-extrabold text-ink mb-1">AI와 찬반 토론</div>
      <div className="text-[11.5px] text-ink-muted mb-3 leading-relaxed">
        탐구 주제를 찬반이 갈리는 문장으로 다듬고, AI와 주고받으며 논거를 단단히 만들어요.
      </div>

      {/* 논제 */}
      <div className="mb-3">
        <div className="text-[11px] font-bold text-ink-secondary mb-1.5">논제</div>
        <textarea
          value={motion}
          onChange={(e) => setMotion(e.target.value)}
          disabled={started}
          rows={2}
          placeholder="예: 신약 개발에서 동물실험은 계속 허용되어야 한다"
          className="w-full border border-line rounded-lg px-3.5 py-2.5 text-[13px] outline-none resize-y focus:border-brand-high disabled:bg-gray-50"
        />
        {!started && (
          <div className="text-[10.5px] text-ink-muted mt-1">
            "~해야 한다", "~는 옳다"처럼 찬반이 갈리는 문장이어야 토론이 됩니다.
          </div>
        )}
      </div>

      {/* 입장 선택 */}
      {!started ? (
        <div>
          <div className="text-[11px] font-bold text-ink-secondary mb-1.5">내 입장</div>
          <div className="flex gap-2">
            {(['pro', 'con'] as DebateStance[]).map((s) => (
              <button
                key={s}
                onClick={() => start(s)}
                disabled={busy || !motion.trim()}
                className="flex-1 h-12 rounded-xl border-2 text-[14px] font-bold transition-all disabled:opacity-40"
                style={{
                  borderColor: s === 'pro' ? '#2563EB' : '#DC2626',
                  color: s === 'pro' ? '#1E3A8A' : '#991B1B',
                  background: '#fff',
                }}
              >
                {busy ? '준비 중…' : `${STANCE_LABEL[s]} 입장으로 시작`}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className="text-[11px] font-bold text-white bg-brand-high px-2.5 py-1 rounded-full">
              나 · {stance && STANCE_LABEL[stance]}
            </span>
            <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2.5 py-1 rounded-full">
              AI · {stance && STANCE_LABEL[other(stance)]}
            </span>
            <span className="ml-auto text-[11px] text-ink-muted">{turns}번 발언</span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto mb-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className="flex flex-col"
                style={{ alignItems: m.speaker === 'student' ? 'flex-end' : 'flex-start' }}
              >
                <div className="text-[10px] font-semibold text-ink-muted mb-1">
                  {m.speaker === 'student' ? '나' : 'AI'}
                </div>
                <div
                  className="max-w-[85%] px-3.5 py-2.5 text-[13px] leading-[1.7] whitespace-pre-wrap"
                  style={{
                    borderRadius:
                      m.speaker === 'student' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: m.speaker === 'student' ? '#2563EB' : '#F8FAFC',
                    color: m.speaker === 'student' ? '#fff' : '#1a1a1a',
                    border: m.speaker === 'student' ? 'none' : '1px solid #E5E7EB',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="text-[12px] text-ink-muted animate-pulse">AI가 생각하는 중…</div>
            )}
            <div ref={endRef} />
          </div>

          {!feedback && (
            <>
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  rows={2}
                  placeholder="근거를 들어 반박해보세요 (Enter로 전송)"
                  className="flex-1 border border-line rounded-lg px-3.5 py-2.5 text-[13px] outline-none resize-y focus:border-brand-high"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || busy}
                  className="w-[70px] bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-40"
                >
                  전송
                </button>
              </div>

              <button
                onClick={() => finish.mutate()}
                disabled={turns < 2 || busy || finish.isPending}
                className="w-full h-11 mt-2.5 bg-purple-600 text-white rounded-xl text-[13px] font-bold hover:bg-purple-700 disabled:opacity-40"
              >
                {finish.isPending
                  ? '분석 중…'
                  : turns < 2
                    ? '2번 이상 발언하면 마칠 수 있어요'
                    : '토론 마치고 분석받기'}
              </button>
            </>
          )}
        </>
      )}

      {/* 피드백 */}
      {feedback && (
        <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
          <div className="text-[13px] font-extrabold text-purple-900 mb-2">토론 분석</div>
          <div className="flex flex-col gap-2">
            {(feedback.criteria ?? []).map((c: any, i: number) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[12px] font-bold text-purple-900">{c.name}</span>
                  {typeof c.score === 'number' && (
                    <span className="text-[11px] font-bold text-purple-700">{c.score}점</span>
                  )}
                </div>
                {c.comment && (
                  <div className="text-[12px] text-ink-secondary leading-relaxed">{c.comment}</div>
                )}
              </div>
            ))}
          </div>
          {(feedback as any).summary && (
            <div className="text-[12px] text-purple-900 leading-relaxed mt-2.5 pt-2.5 border-t border-purple-200">
              {(feedback as any).summary}
            </div>
          )}
          <div className="text-[11px] text-ink-muted mt-2.5">
            토론 기록이 저장됐어요. 선생님이 확인 후 피드백을 남길 수 있어요.
          </div>
        </div>
      )}

      {error && <div className="text-[12px] text-red-600 mt-2.5">{error}</div>}

      {saved && !started && (
        <div className="mt-3 rounded-lg border border-line bg-gray-50 px-3.5 py-3">
          <div className="text-[11px] font-bold text-ink-secondary mb-1">지난 토론 기록</div>
          <div className="text-[12px] text-ink-secondary leading-relaxed whitespace-pre-wrap max-h-[180px] overflow-y-auto">
            {saved}
          </div>
        </div>
      )}
    </div>
  )
}