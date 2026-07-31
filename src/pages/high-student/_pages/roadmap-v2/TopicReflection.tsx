import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Q {
  key: string
  q: string
  why: string
  placeholder: string
}

/**
 * 기록 → 꼬리질문 사다리.
 * 앞 답변이 다음 질문의 재료가 되도록 순서를 짰다.
 */
const QUESTIONS: Q[] = [
  {
    key: 'trigger',
    q: '왜 이 주제를 골랐어?',
    why: '면접에서 제일 먼저 묻는 질문이에요. "선생님이 시켜서"가 아니라 나만의 계기가 있어야 해요.',
    placeholder: '수업에서 ○○을 배우다가 / 뉴스에서 봤는데 / 평소에 궁금했던 게…',
  },
  {
    key: 'focus',
    q: '그중에서 가장 궁금했던 건 뭐야?',
    why: '주제는 넓어도 진짜 궁금했던 한 가지가 있어요. 그게 탐구의 중심이에요.',
    placeholder: '왜 ○○은 △△일까가 제일 궁금했어요…',
  },
  {
    key: 'before_after',
    q: '알아보기 전엔 어떻게 생각했고, 알아본 뒤엔 뭐가 달라졌어?',
    why: '생각이 바뀐 지점이 곧 배움이에요. 이게 있으면 탐구가 살아 있는 기록이 돼요.',
    placeholder: '처음엔 ○○일 거라고 생각했는데, 알고 보니…',
  },
  {
    key: 'struggle',
    q: '하다가 막혔던 지점이 있었어? 어떻게 넘었어?',
    why: '막힘을 어떻게 넘었는지가 그 사람의 태도를 보여줘요. 잘 된 것보다 이게 더 중요해요.',
    placeholder: '자료를 못 찾아서 / 결과가 예상과 달라서…',
  },
  {
    key: 'connect',
    q: '이 탐구가 네 진로랑 어떻게 이어져?',
    why: '억지로 이을 필요는 없어요. 안 이어지면 안 이어진다고 적어도 괜찮아요.',
    placeholder: '이걸 하면서 ○○ 쪽 일이 어떤 건지 알게 됐어요…',
  },
  {
    key: 'next',
    q: '다음엔 뭘 더 알아보고 싶어?',
    why: '여기서 나온 게 다음 학년 탐구주제가 돼요. 로드맵이 이어지는 지점이에요.',
    placeholder: '이번엔 ○○까지만 봤는데, 다음엔 △△를…',
  },
]

interface Props {
  topicTitle: string
  major?: string | null
  career?: string | null
  grade?: number
  saved?: string | null
  onSaveContent: (content: string) => void
  saving?: boolean
}

export default function TopicReflection({
  topicTitle, major, career, grade, saved, onSaveContent, saving,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(0)
  const [deeper, setDeeper] = useState<Record<string, string>>({})
  const [asking, setAsking] = useState<string | null>(null)

  // 저장된 기록이 있으면 복원
  useEffect(() => {
    if (!saved) return
    const restored: Record<string, string> = {}
    for (const q of QUESTIONS) {
      const re = new RegExp(`Q\\\\. ${q.q}\\\\n([\\\\s\\\\S]*?)(?=\\\\nQ\\\\. |$)`)
      const m = saved.match(re)
      if (m) restored[q.key] = m[1].trim()
    }
    if (Object.keys(restored).length) setAnswers(restored)
  }, [saved])

  const answered = QUESTIONS.filter((q) => (answers[q.key] ?? '').trim().length > 0).length

  const compiled = useMemo(
    () =>
      QUESTIONS.filter((q) => (answers[q.key] ?? '').trim())
        .map((q) => `Q. ${q.q}\n${answers[q.key].trim()}`)
        .join('\n\n'),
    [answers],
  )

  /** 답변을 받아 한 번 더 파고드는 질문 (실패해도 진행엔 지장 없음) */
  const askDeeper = async (q: Q) => {
    const a = (answers[q.key] ?? '').trim()
    if (!a || asking) return
    setAsking(q.key)
    try {
      const { data, error } = await supabase.functions.invoke('research-coach', {
        body: {
          mode: 'chat',
          major: major ?? '미정',
          grade: grade ? `고${grade}` : undefined,
          job: career ?? undefined,
          topic: topicTitle,
          message:
            `학생이 "${topicTitle}" 탐구에 대해 이렇게 답했어요.\n` +
            `질문: ${q.q}\n답변: ${a}\n\n` +
            `이 답변에서 더 깊이 파고들 꼬리질문 하나만, 학생에게 직접 묻는 말투로 짧게 만들어줘.`,
        },
      })
      if (error || data?.error) throw new Error(error?.message || data?.error)
      setDeeper((p) => ({ ...p, [q.key]: data.reply as string }))
    } catch {
      setDeeper((p) => ({
        ...p,
        [q.key]: '지금은 추가 질문을 받지 못했어요. 답변을 조금 더 구체적으로 적어보는 것도 좋아요.',
      }))
    } finally {
      setAsking(null)
    }
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="text-[14px] font-extrabold text-ink mb-1">이 탐구를 왜 했는지 짚어보기</div>
      <div className="text-[11.5px] text-ink-muted mb-3 leading-relaxed">
        탐구를 끝냈다고 끝이 아니에요. 왜 했는지, 뭐가 달라졌는지를 말로 정리해두면 면접에서도
        생기부에서도 그대로 쓰여요.
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-brand-high rounded-full transition-all"
            style={{ width: `${(answered / QUESTIONS.length) * 100}%` }}
          />
        </div>
        <span className="text-[11px] text-ink-muted">
          {answered} / {QUESTIONS.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {QUESTIONS.map((q, i) => {
          const on = open === i
          const a = answers[q.key] ?? ''
          const done = a.trim().length > 0

          return (
            <div
              key={q.key}
              className="rounded-xl border transition-all"
              style={{ borderColor: on ? '#2563EB' : done ? '#A7F3D0' : '#E5E7EB' }}
            >
              <button
                onClick={() => setOpen(on ? -1 : i)}
                className="w-full text-left px-4 py-3 flex items-start gap-2.5"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 mt-0.5"
                  style={{
                    background: done ? '#10B981' : on ? '#2563EB' : '#F1F5F9',
                    color: done || on ? '#fff' : '#94A3B8',
                  }}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span
                    className="text-[13.5px] font-bold"
                    style={{ color: on ? '#1E3A8A' : '#334155' }}
                  >
                    {q.q}
                  </span>
                  {!on && done && (
                    <span className="block text-[11.5px] text-ink-muted mt-1 line-clamp-2">
                      {a}
                    </span>
                  )}
                </span>
              </button>

              {on && (
                <div className="px-4 pb-4">
                  <div className="text-[11px] text-ink-muted mb-2 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">
                    {q.why}
                  </div>

                  <textarea
                    value={a}
                    onChange={(e) => setAnswers((p) => ({ ...p, [q.key]: e.target.value }))}
                    placeholder={q.placeholder}
                    rows={4}
                    className="w-full border border-line rounded-lg px-3.5 py-2.5 text-[13px] leading-[1.7] outline-none resize-y focus:border-brand-high"
                  />

                  {deeper[q.key] && (
                    <div className="mt-2 rounded-lg border border-purple-200 bg-purple-50 px-3.5 py-2.5">
                      <div className="text-[10.5px] font-bold text-purple-700 mb-1">
                        한 번 더 물어볼게요
                      </div>
                      <div className="text-[12.5px] text-purple-900 leading-relaxed whitespace-pre-wrap">
                        {deeper[q.key]}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => askDeeper(q)}
                      disabled={!a.trim() || asking === q.key}
                      className="h-9 px-3.5 bg-white border border-purple-200 text-purple-700 rounded-lg text-[11.5px] font-bold hover:bg-purple-50 disabled:opacity-40"
                    >
                      {asking === q.key ? '생각하는 중…' : '더 깊게 물어봐 줘'}
                    </button>

                    {i < QUESTIONS.length - 1 && (
                      <button
                        onClick={() => setOpen(i + 1)}
                        disabled={!a.trim()}
                        className="h-9 px-3.5 bg-brand-high text-white rounded-lg text-[11.5px] font-bold disabled:opacity-40 ml-auto"
                      >
                        다음 질문 →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <span className="text-[11px] text-ink-muted">
          {answered === QUESTIONS.length
            ? '다 적었어요. 저장하면 활동 정리와 생기부 재료로 쓰여요.'
            : '지금까지 적은 것만 저장해도 괜찮아요.'}
        </span>
        <button
          onClick={() => onSaveContent(compiled)}
          disabled={answered === 0 || saving}
          className="ml-auto h-10 px-5 bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-40"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}