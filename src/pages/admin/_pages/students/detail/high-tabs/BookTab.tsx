import { useState, useRef, useEffect } from 'react'
import {
  useStudentReadings,
  useReadingAnalyses,
  useSendReadingTeacherFeedback,
  useCompleteReading,
  useUncompleteReading,
  buildReadingMessages,
  type Reading,
} from '../../../../_hooks/useHighReading'

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
}

export default function BookTab({ student, onOpenChat }: {
  student: any
  onOpenChat: (type: 'topic' | 'book', context: string) => void
  openId?: number | null
  onClearOpenId?: () => void
}) {
  const studentId: string = student.id

  const [selReadingId, setSelReadingId] = useState<string | null>(null)
  const [feedbackInput, setFeedbackInput] = useState('')
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: readings = [], isLoading } = useStudentReadings(studentId)
  const { data: analyses = [] } = useReadingAnalyses(selReadingId ?? undefined)

  const selected = readings.find(r => r.id === selReadingId)
  const messages = selected ? buildReadingMessages(selected, analyses) : []
  const isCompleted = selected?.status === 'completed'

  useEffect(() => {
    if (!selReadingId && readings.length > 0) {
      setSelReadingId(readings[0].id)
    }
  }, [readings, selReadingId])

  useEffect(() => {
    setIsFeedbackOpen(false)
    setFeedbackInput('')
  }, [selReadingId])

  const chatEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (isFeedbackOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isFeedbackOpen])

  const sendFeedback = useSendReadingTeacherFeedback(selReadingId ?? '', studentId)
  const complete = useCompleteReading(selReadingId ?? '')
  const uncomplete = useUncompleteReading(selReadingId ?? '')

  const handleSend = () => {
    if (!feedbackInput.trim() || !selReadingId || isCompleted) return
    sendFeedback.mutate(feedbackInput.trim(), {
      onSuccess: () => {
        setFeedbackInput('')
        setIsFeedbackOpen(false)
      },
    })
  }

  const handleCancel = () => {
    setIsFeedbackOpen(false)
    setFeedbackInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleToggleComplete = () => {
    if (!selReadingId) return
    if (isCompleted) {
      if (window.confirm('완료 처리를 해제할까요?')) uncomplete.mutate()
    } else {
      if (window.confirm('이 독서를 완료 처리할까요? 완료 후에는 추가 피드백을 보낼 수 없어요.')) {
        complete.mutate()
      }
    }
  }

  return (
    <div className="flex gap-4 h-full overflow-hidden font-sans text-ink">

      <div
        className="w-[280px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden"
        style={{ boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}
      >
        <div className="px-4 py-3 border-b border-line flex-shrink-0">
          <div className="text-[14px] font-bold text-ink tracking-tight">📘 독서리스트</div>
          <div className="text-[11px] text-ink-secondary mt-1 font-medium">
            총 <span style={{ color: THEME.accentDark }} className="font-bold">{readings.length}개</span>
            {readings.filter(r => r.status === 'completed').length > 0 && (
              <>
                {' '}· 완료{' '}
                <span className="text-emerald-600 font-bold">
                  {readings.filter(r => r.status === 'completed').length}개
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="text-center py-10">
              <div
                className="inline-block w-5 h-5 border-2 border-gray-200 rounded-full animate-spin"
                style={{ borderTopColor: THEME.accent }}
              />
              <div className="text-[12px] text-ink-muted mt-2">불러오는 중...</div>
            </div>
          ) : readings.length === 0 ? (
            <div className="text-center py-10 text-ink-muted">
              <div className="text-3xl mb-2">📚</div>
              <div className="text-[12px]">학생이 등록한 도서가 없어요.</div>
            </div>
          ) : (
            readings.map(r => (
              <ReadingCard
                key={r.id}
                reading={r}
                selected={selReadingId === r.id}
                onClick={() => setSelReadingId(r.id)}
              />
            ))
          )}
        </div>
      </div>

      <div
        className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0"
        style={{ boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}
      >
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
            <div className="text-4xl">📚</div>
            <div className="text-[14px] font-semibold text-ink-secondary">도서를 선택해주세요</div>
            <div className="text-[12px]">왼쪽에서 도서를 클릭하면 대화를 볼 수 있어요</div>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-line flex items-center justify-between flex-shrink-0 bg-white gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-[15px] font-bold text-ink tracking-tight truncate">
                    {selected.book_title}
                  </div>
                  {selected.author && (
                    <div className="text-[12px] text-ink-secondary font-medium flex-shrink-0">
                      · {selected.author}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {selected.subject && (
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: THEME.accentDark,
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}60`,
                      }}
                    >
                      {selected.subject}
                    </span>
                  )}
                  {isCompleted ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ 완료됨
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      ⏳ 진행 중
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onOpenChat('book', selected.book_title)}
                  className="px-3 py-1.5 bg-white border rounded-lg text-[11.5px] font-bold transition-all hover:-translate-y-px"
                  style={{ color: THEME.accent, borderColor: THEME.accentBorder }}
                  title="챗봇으로 도서 관련 아이디어 얻기"
                >
                  ✨ 챗봇
                </button>

                <button
                  onClick={handleToggleComplete}
                  disabled={complete.isPending || uncomplete.isPending}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all disabled:opacity-60"
                  style={{
                    background: isCompleted ? '#E5E7EB' : '#059669',
                    color: isCompleted ? '#6B7280' : '#fff',
                    boxShadow: isCompleted ? 'none' : '0 2px 6px rgba(5, 150, 105, 0.25)',
                  }}
                >
                  {isCompleted ? '↺ 완료 해제' : '✓ 완료 처리'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px]">
                  아직 메시지가 없어요.
                </div>
              ) : messages.map((msg, i) => {
                const isStudent = msg.role === 'student'
                const showDate = i === 0 || messages[i - 1].date !== msg.date
                return (
                  <div key={i}>
                    {showDate && (
                      <div className="text-center my-2">
                        <span className="text-[10px] font-semibold text-ink-muted bg-white border border-line px-3 py-1 rounded-full">
                          {msg.date}
                        </span>
                      </div>
                    )}
                    <div className={`flex flex-col ${isStudent ? 'items-start' : 'items-end'}`}>
                      <div className={`text-[10px] font-semibold text-ink-muted mb-1 ${isStudent ? 'ml-10' : 'mr-1'}`}>
                        {isStudent ? `👤 ${student.name}` : '👨‍🏫 나 (원장)'}
                      </div>
                      <div className={`flex items-end gap-2 ${isStudent ? 'flex-row' : 'flex-row-reverse'}`}>
                        {isStudent && (
                          <div className="w-8 h-8 rounded-full bg-gray-300 text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                            {student.name?.[0] ?? 'S'}
                          </div>
                        )}
                        <div
                          className="max-w-md px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
                          style={{
                            background: isStudent ? '#fff' : THEME.accent,
                            color: isStudent ? '#1a1a1a' : '#fff',
                            border: isStudent ? '1px solid #E5E7EB' : 'none',
                            borderRadius: isStudent ? '2px 14px 14px 14px' : '14px 2px 14px 14px',
                            boxShadow: isStudent ? '0 1px 2px rgba(15, 23, 42, 0.04)' : `0 2px 8px ${THEME.accentShadow}`,
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {isCompleted ? (
              <div className="px-4 py-3 border-t border-line bg-white flex-shrink-0">
                <div className="text-center py-2 text-[12px] text-ink-muted font-medium">
                  ✓ 완료 처리된 독서예요. 추가 피드백은 완료 해제 후 가능해요.
                </div>
              </div>
            ) : !isFeedbackOpen ? (
              <div className="px-4 py-2.5 border-t border-line bg-white flex-shrink-0 flex justify-end">
                <button
                  onClick={() => setIsFeedbackOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px flex items-center gap-1.5"
                  style={{
                    background: THEME.accent,
                    color: '#fff',
                    boxShadow: `0 2px 6px ${THEME.accentShadow}`,
                  }}
                >
                  ✏️ 피드백 작성
                </button>
              </div>
            ) : (
              <div className="border-t border-line bg-white flex-shrink-0">
                <div className="px-4 py-2.5 border-b border-line-light flex items-center justify-between">
                  <div className="text-[12px] font-bold text-ink flex items-center gap-1.5">
                    ✏️ 피드백 작성
                  </div>
                  <button
                    onClick={handleCancel}
                    className="text-ink-muted hover:text-ink text-[14px] w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all"
                  >
                    ✕
                  </button>
                </div>
                <div className="px-4 pt-3 pb-3">
                  <textarea
                    ref={textareaRef}
                    value={feedbackInput}
                    onChange={e => setFeedbackInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="피드백을 작성해주세요... (ESC로 취소 · Ctrl+Enter로 전송)"
                    rows={4}
                    disabled={sendFeedback.isPending}
                    className="w-full border border-line rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none leading-relaxed transition-colors font-sans disabled:bg-gray-50 disabled:opacity-70"
                    onFocus={e => { e.target.style.borderColor = THEME.accent }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB' }}
                  />
                  <div className="flex items-center gap-2 mt-2.5">
                    <button
                      onClick={handleCancel}
                      disabled={sendFeedback.isPending}
                      className="px-4 py-2 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-all disabled:opacity-60"
                    >
                      취소
                    </button>
                    <div className="text-[10px] text-ink-muted font-medium flex-1">
                      💡 챗봇(✨)에게 물어본 답변을 참고해서 전달하세요
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={!feedbackInput.trim() || sendFeedback.isPending}
                      className="px-5 py-2 rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed"
                      style={{
                        background: feedbackInput.trim() && !sendFeedback.isPending ? THEME.accent : '#E5E7EB',
                        color: feedbackInput.trim() && !sendFeedback.isPending ? '#fff' : '#9CA3AF',
                        boxShadow: feedbackInput.trim() && !sendFeedback.isPending ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                      }}
                    >
                      {sendFeedback.isPending ? '전송 중...' : '전송 →'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ReadingCard({
  reading,
  selected,
  onClick,
}: {
  reading: Reading
  selected: boolean
  onClick: () => void
}) {
  const isCompleted = reading.status === 'completed'

  return (
    <div
      onClick={onClick}
      className="relative border rounded-xl px-3 py-2.5 mb-1.5 cursor-pointer transition-all"
      style={{
        borderColor: selected ? THEME.accent : '#E5E7EB',
        background: selected ? THEME.accentBg : '#fff',
        boxShadow: selected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
      }}
    >
      <div className="flex gap-1 mb-1.5 flex-wrap">
        {isCompleted ? (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            ✓ 완료
          </span>
        ) : (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            ⏳ 진행
          </span>
        )}
      </div>
      <div className="text-[12.5px] font-semibold text-ink mb-0.5 leading-tight line-clamp-2">
        {reading.book_title}
      </div>
      {reading.author && (
        <div className="text-[11px] text-ink-secondary mb-1.5 font-medium truncate">
          {reading.author}
        </div>
      )}
      {reading.subject && (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            color: THEME.accentDark,
            background: THEME.accentBg,
            border: `1px solid ${THEME.accentBorder}60`,
          }}
        >
          {reading.subject}
        </span>
      )}
    </div>
  )
}