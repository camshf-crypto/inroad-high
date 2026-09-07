import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'

interface Props {
  topicId: string
  topicTitle: string
  major?: string | null
  grade?: number
  /** 2단계 보고서 본문 — 문제를 만드는 재료 */
  reportContent: string
  reportFormat?: string | null
  content: string
  saving?: boolean
  onSave: (content: string) => void
  /** 보고서가 없을 때 2단계로 보내기 */
  onGoReport?: () => void
}

interface QuizRow {
  id: string
  step: number
  kind: 'choice' | 'essay'
  question: string
  options: string[] | null
  answer: number | null
  explanation: string
  keywords: string[] | null
}

interface AttemptRow {
  id: string
  quiz_id: string
  selected: number | null
  essay_answer: string | null
  is_correct: boolean | null
}

const STEP_LABEL: Record<number, string> = {
  1: '핵심 파악',
  2: '개념 이해',
  3: '관계 파악',
  4: '추론하기',
}

const STEP_HINT: Record<number, string> = {
  1: '이 탐구가 결국 무엇을 밝히려 했는지',
  2: '내가 쓴 용어의 뜻',
  3: '두 개념이 어떻게 엮이는지',
  4: '배운 걸 새로운 조건에 적용하기',
}

export default function ArchiveWriter({
  topicId, topicTitle, major, grade, reportContent, reportFormat,
  content, saving, onSave, onGoReport,
}: Props) {
  const student = useAtomValue(studentState)
  const qc = useQueryClient()

  const studentId = student?.id ? String(student.id) : undefined

  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  /** 문제별 선택 (아직 제출 안 한 것) */
  const [picked, setPicked] = useState<Record<string, number>>({})
  const [essay, setEssay] = useState('')

  const { data: quizzes = [], isLoading: quizLoading } = useQuery({
    queryKey: ['topic-quiz', topicId],
    enabled: !!topicId,
    queryFn: async (): Promise<QuizRow[]> => {
      const { data, error } = await supabase
        .from('high_topic_quiz')
        .select('id, step, kind, question, options, answer, explanation, keywords')
        .eq('topic_id', topicId)
        .order('step')
      if (error) throw error
      return (data ?? []) as QuizRow[]
    },
  })

  const { data: attempts = [] } = useQuery({
    queryKey: ['topic-quiz-attempt', topicId, studentId],
    enabled: !!studentId && quizzes.length > 0,
    queryFn: async (): Promise<AttemptRow[]> => {
      const { data, error } = await supabase
        .from('high_topic_quiz_attempt')
        .select('id, quiz_id, selected, essay_answer, is_correct')
        .in('quiz_id', quizzes.map((q) => q.id))
        .eq('student_id', studentId!)
      if (error) throw error
      return (data ?? []) as AttemptRow[]
    },
  })

  const attemptMap = useMemo(() => {
    const m = new Map<string, AttemptRow>()
    for (const a of attempts) m.set(a.quiz_id, a)
    return m
  }, [attempts])

  const choiceQuizzes = quizzes.filter((q) => q.kind === 'choice')
  const essayQuiz = quizzes.find((q) => q.kind === 'essay') ?? null
  const solvedCount = quizzes.filter((q) => attemptMap.has(q.id)).length
  const correctCount = choiceQuizzes.filter((q) => attemptMap.get(q.id)?.is_correct).length
  const allSolved = quizzes.length > 0 && solvedCount === quizzes.length

  /** 문제 생성 */
  const generate = async () => {
    if (generating) return
    setGenerating(true)
    setGenError('')
    try {
      const { data, error } = await supabase.functions.invoke('topic-quiz-generate', {
        body: {
          topic_title: topicTitle,
          major: major ?? null,
          grade: grade ?? null,
          report_format: reportFormat ?? null,
          report_content: reportContent,
        },
      })
      if (error || data?.error) throw new Error(error?.message || data?.error)

      const rows = (data.questions as any[]).map((q) => ({
        topic_id: topicId,
        student_id: studentId,
        step: q.step,
        kind: q.kind,
        question: q.question,
        options: q.options ?? null,
        answer: q.answer ?? null,
        explanation: q.explanation,
        keywords: q.keywords ?? null,
      }))

      const { error: insErr } = await supabase.from('high_topic_quiz').insert(rows)
      if (insErr) throw insErr

      qc.invalidateQueries({ queryKey: ['topic-quiz', topicId] })
    } catch (e: any) {
      setGenError(e?.message ?? '문제를 만들지 못했어요')
    } finally {
      setGenerating(false)
    }
  }

  /** 객관식 제출 */
  const submitChoice = useMutation({
    mutationFn: async (v: { quiz: QuizRow; selected: number }) => {
      if (!studentId) throw new Error('학생 정보가 없습니다')
      const correct = v.selected === v.quiz.answer
      const { error } = await supabase.from('high_topic_quiz_attempt').insert({
        quiz_id: v.quiz.id,
        student_id: studentId,
        selected: v.selected,
        is_correct: correct,
        wrong_count: correct ? 0 : 1,
        next_review_at: correct
          ? null
          : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['topic-quiz-attempt', topicId, studentId] }),
  })

  /** 서술형 제출 */
  const submitEssay = useMutation({
    mutationFn: async (v: { quiz: QuizRow; text: string }) => {
      if (!studentId) throw new Error('학생 정보가 없습니다')
      const { error } = await supabase.from('high_topic_quiz_attempt').insert({
        quiz_id: v.quiz.id,
        student_id: studentId,
        essay_answer: v.text.trim(),
        is_correct: null,
      })
      if (error) throw error
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['topic-quiz-attempt', topicId, studentId] }),
  })

  /** 저장 본문 — 사람이 읽는 요약 */
  const compiled = useMemo(() => {
    if (!allSolved) return ''
    const lines: string[] = []
    const wrong = choiceQuizzes
      .filter((q) => attemptMap.get(q.id)?.is_correct === false)
      .map((q) => STEP_LABEL[q.step])
    lines.push(`확인 문제: ${correctCount}/${choiceQuizzes.length}`)
    if (wrong.length) lines.push(`틀린 단계: ${wrong.join(', ')}`)
    const ea = essayQuiz ? attemptMap.get(essayQuiz.id)?.essay_answer : null
    if (ea) lines.push(`\n내 생각: ${ea}`)
    return lines.join('\n')
  }, [allSolved, choiceQuizzes, attemptMap, correctCount, essayQuiz])

  const save = () => {
    onSave(compiled)
  }

  const reportReady = reportContent.replace(/\s/g, '').length >= 200

  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="text-[14px] font-extrabold text-ink mb-1">활동 정리하기</div>
      <div className="text-[11.5px] text-ink-muted mb-4 leading-relaxed">
        내가 쓴 보고서로 문제를 냈어요. 풀어보면 이 탐구를 실제로 이해했는지 확인할 수 있어요.
      </div>

      {/* 문제가 아직 없을 때 */}
      {quizzes.length === 0 && !quizLoading && (
        <div className="rounded-xl border border-line bg-gray-50 px-4 py-6 text-center mb-4">
          {!reportReady ? (
            <>
              <div className="text-[13px] font-bold text-ink mb-1">보고서가 아직 짧아요</div>
              <div className="text-[11.5px] text-ink-muted mb-3 leading-relaxed">
                2단계 보고서를 200자 이상 쓰면, 그 내용으로 문제를 만들어드려요.
              </div>
              {onGoReport && (
                <button
                  onClick={onGoReport}
                  className="h-10 px-4 bg-white border border-line text-ink-secondary rounded-lg text-[12.5px] font-bold hover:bg-gray-50"
                >
                  보고서 쓰러 가기 →
                </button>
              )}
            </>
          ) : (
            <>
              <div className="text-[13px] font-bold text-ink mb-1">확인 문제 4개</div>
              <div className="text-[11.5px] text-ink-muted mb-3 leading-relaxed">
                핵심 파악 · 개념 이해 · 관계 파악 · 추론하기 순서로 물어봐요.
              </div>
              <button
                onClick={generate}
                disabled={generating}
                className="h-11 px-5 bg-brand-high text-white rounded-xl text-[13px] font-bold disabled:opacity-40"
              >
                {generating ? '문제를 만드는 중…' : '문제 만들기'}
              </button>
              {genError && (
                <div className="text-[12px] text-red-600 mt-2.5">{genError}</div>
              )}
            </>
          )}
        </div>
      )}

      {/* 문제 */}
      {quizzes.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {/* 진행 표시 */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-1">
              {quizzes.map((q) => {
                const a = attemptMap.get(q.id)
                const bg = !a
                  ? '#E2E8F0'
                  : a.is_correct === false
                    ? '#F59E0B'
                    : '#10B981'
                return (
                  <span
                    key={q.id}
                    className="flex-1 h-1.5 rounded-full"
                    style={{ background: bg }}
                  />
                )
              })}
            </div>
            <span className="text-[11px] text-ink-muted tabular-nums">
              {solvedCount} / {quizzes.length}
            </span>
          </div>

          {quizzes.map((q) => {
            const a = attemptMap.get(q.id)
            const solved = !!a
            const sel = picked[q.id]

            return (
              <div
                key={q.id}
                className="rounded-xl border border-line p-4"
                style={{
                  borderColor: solved
                    ? a!.is_correct === false
                      ? '#FCD34D'
                      : '#A7F3D0'
                    : '#E5E7EB',
                  background: solved
                    ? a!.is_correct === false
                      ? '#FFFBEB'
                      : '#F0FDF4'
                    : '#fff',
                }}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10.5px] font-extrabold text-white bg-brand-high px-2 py-0.5 rounded-full">
                    {q.step}. {STEP_LABEL[q.step]}
                  </span>
                  <span className="text-[10.5px] text-ink-muted">{STEP_HINT[q.step]}</span>
                  {solved && (
                    <span
                      className="ml-auto text-[11px] font-bold"
                      style={{
                        color:
                          a!.is_correct === false
                            ? '#B45309'
                            : a!.is_correct === true
                              ? '#047857'
                              : '#6B7280',
                      }}
                    >
                      {a!.is_correct === false ? '아쉬워요' : a!.is_correct === true ? '정답' : '제출함'}
                    </span>
                  )}
                </div>

                <div className="text-[13.5px] font-bold text-ink leading-[1.7] mb-3">
                  {q.question}
                </div>

                {/* 객관식 */}
                {q.kind === 'choice' && q.options && (
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((opt, i) => {
                      const isAnswer = i === q.answer
                      const isMine = solved ? a!.selected === i : sel === i
                      const show = solved && (isAnswer || isMine)
                      return (
                        <button
                          key={i}
                          onClick={() => !solved && setPicked({ ...picked, [q.id]: i })}
                          disabled={solved}
                          className="text-left rounded-lg border px-3.5 py-2.5 text-[12.5px] leading-[1.6] transition-all disabled:cursor-default"
                          style={{
                            borderColor: show
                              ? isAnswer
                                ? '#10B981'
                                : '#F59E0B'
                              : isMine
                                ? '#2563EB'
                                : '#E5E7EB',
                            background: show
                              ? isAnswer
                                ? '#ECFDF5'
                                : '#FFFBEB'
                              : isMine
                                ? '#EFF6FF'
                                : '#fff',
                            color: '#1E293B',
                            fontWeight: show && isAnswer ? 700 : 500,
                          }}
                        >
                          <span className="text-ink-muted mr-2">{'①②③④'[i]}</span>
                          {opt}
                          {show && isAnswer && (
                            <span className="ml-2 text-[11px] font-bold text-green-700">정답</span>
                          )}
                          {show && isMine && !isAnswer && (
                            <span className="ml-2 text-[11px] font-bold text-amber-700">내 답</span>
                          )}
                        </button>
                      )
                    })}

                    {!solved && (
                      <button
                        onClick={() => submitChoice.mutate({ quiz: q, selected: sel })}
                        disabled={sel === undefined || submitChoice.isPending}
                        className="self-start mt-1.5 h-10 px-5 bg-brand-high text-white rounded-lg text-[12.5px] font-bold disabled:opacity-40"
                      >
                        {submitChoice.isPending ? '확인 중…' : '답 확인하기'}
                      </button>
                    )}
                  </div>
                )}

                {/* 서술형 */}
                {q.kind === 'essay' && (
                  <div>
                    {solved ? (
                      <div className="rounded-lg bg-white border border-line px-3.5 py-2.5 text-[12.5px] text-ink leading-[1.7] whitespace-pre-wrap">
                        {a!.essay_answer}
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={essay}
                          onChange={(e) => setEssay(e.target.value)}
                          placeholder="2~3문장으로 적어보세요. 보고서에서 배운 걸 여기 적용해보는 거예요."
                          rows={4}
                          className="w-full border border-line rounded-xl px-3.5 py-2.5 text-[13px] leading-[1.7] outline-none resize-y focus:border-brand-high"
                        />
                        <button
                          onClick={() => submitEssay.mutate({ quiz: q, text: essay })}
                          disabled={essay.trim().length < 20 || submitEssay.isPending}
                          className="mt-1.5 h-10 px-5 bg-brand-high text-white rounded-lg text-[12.5px] font-bold disabled:opacity-40"
                        >
                          {submitEssay.isPending
                            ? '제출 중…'
                            : essay.trim().length < 20
                              ? '20자 이상 적어주세요'
                              : '제출하기'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* 해설 */}
                {solved && (
                  <div className="mt-3 pt-3 border-t border-line">
                    <div className="text-[10.5px] font-bold text-ink-muted mb-1">
                      {q.kind === 'essay' ? '이런 점이 들어가면 좋아요' : '해설'}
                    </div>
                    <div className="text-[12.5px] text-ink-secondary leading-[1.75] whitespace-pre-wrap">
                      {q.explanation}
                    </div>
                    {q.keywords && q.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {q.keywords.map((k) => (
                          <button
                            key={k}
                            onClick={() =>
                              window.open(
                                `https://search.naver.com/search.naver?query=${encodeURIComponent(k)}`,
                                '_blank',
                                'noopener',
                              )
                            }
                            className="text-[10.5px] px-2 py-1 rounded-lg border border-line text-ink-secondary hover:border-brand-high-light hover:text-brand-high"
                          >
                            {k} ↗
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* 결과 */}
          {allSolved && (
            <div className="rounded-xl border-2 border-green-300 bg-green-50/60 px-4 py-3.5">
              <div className="text-[13px] font-extrabold text-green-900 mb-1">
                객관식 {correctCount} / {choiceQuizzes.length}
              </div>
              <div className="text-[12px] text-green-900 leading-relaxed">
                {correctCount === choiceQuizzes.length
                  ? '이 탐구는 제대로 파봤어요. 면접에서도 설명할 수 있을 거예요.'
                  : '틀린 단계는 보고서에서도 약한 부분이에요. 2단계로 돌아가 그 부분을 고쳐보세요.'}
              </div>
              {correctCount < choiceQuizzes.length && (
                <div className="text-[11px] text-green-800 mt-1.5">
                  틀린 문제는 3일 뒤에 다시 물어볼게요.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-4">
        <span className="text-[11px] text-ink-muted">
          {allSolved ? '문제를 다 풀었어요' : '문제를 다 풀면 결과가 함께 저장돼요'}
        </span>
        <button
          onClick={save}
          disabled={!compiled.trim() || saving}
          className="ml-auto h-10 px-5 bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-40"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}