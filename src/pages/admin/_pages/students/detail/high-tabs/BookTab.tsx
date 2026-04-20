import { useState, useEffect } from 'react'

// 파랑 테마
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

const BOOKS = [
  { id: 1, grade: '고1', month: '7월', title: '사피엔스', author: '유발 하라리', subject: '역사·철학', reason: '인류의 발전 과정을 통해 AI 시대의 미래를 예측하고 싶어서요.', activity: '독서 후 AI와 인류의 미래에 대한 탐구 보고서를 작성할 예정입니다.', status: '완료', history: [{ type: 'student', text: '사피엔스를 읽고 싶어요.', date: '2025-01-15' }, { type: 'teacher', text: '좋은 선택이에요! 4부 이후를 특히 집중해서 읽어보세요.', date: '2025-01-17' }] },
  { id: 2, grade: '고2', month: '3월', title: '총균쇠', author: '재레드 다이아몬드', subject: '지리·역사', reason: '지리적 환경이 문명 발달에 미친 영향을 탐구하고 싶어요.', activity: '', status: '검토중', history: [{ type: 'student', text: '총균쇠를 읽고 싶습니다.', date: '2025-02-10' }] },
  { id: 3, grade: '고2', month: '5월', title: '이기적 유전자', author: '리처드 도킨스', subject: '생물·철학', reason: '생물학적 진화론을 통해 인간 행동을 이해하고 싶어요.', activity: '진화론적 관점에서 인간의 이타적 행동을 분석하는 에세이를 쓸 예정입니다.', status: '검토중', history: [{ type: 'student', text: '이기적 유전자를 읽고 싶어요.', date: '2025-03-01' }] },
]

const getStatusStyle = (s: string) => {
  if (s === '완료') return { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' }
  if (s === '검토중') return { bg: THEME.accentBg, color: THEME.accent, border: THEME.accentBorder }
  return { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' }
}

const History = ({ history }: { history: any[] }) => (
  <div className="mb-3.5">
    <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 block">
      💬 대화 히스토리
    </label>
    <div className="flex flex-col gap-2">
      {history.map((h, i) => (
        <div
          key={i}
          className="flex flex-col"
          style={{ alignItems: h.type === 'teacher' ? 'flex-end' : 'flex-start' }}
        >
          <div className="text-[10px] text-ink-muted font-semibold mb-1">
            {h.type === 'teacher' ? '👨‍🏫 선생님' : '👤 학생'} · {h.date}
          </div>
          <div
            className="max-w-[85%] px-3.5 py-2.5 text-[12.5px] font-medium leading-[1.6]"
            style={{
              borderRadius: h.type === 'teacher' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: h.type === 'teacher' ? THEME.accentBg : '#F8FAFC',
              border: `1px solid ${h.type === 'teacher' ? `${THEME.accentBorder}60` : '#E5E7EB'}`,
              color: h.type === 'teacher' ? THEME.accentDark : '#1a1a1a',
            }}
          >
            {h.text}
          </div>
        </div>
      ))}
    </div>
  </div>
)

export default function BookTab({ student, onOpenChat, openId, onClearOpenId }: {
  student: any
  onOpenChat: (type: 'topic' | 'book', context: string) => void
  openId?: number | null
  onClearOpenId?: () => void
}) {
  const [bookGrade, setBookGrade] = useState('전체')
  const [bookFeedback, setBookFeedback] = useState<Record<number, string>>({})
  const [bookStatus, setBookStatus] = useState<Record<number, string>>({})
  const [openBooks, setOpenBooks] = useState<Record<number, boolean>>({})

  // openId 들어오면 해당 항목 자동으로 열기
  useEffect(() => {
    if (openId != null) {
      const book = BOOKS.find(b => b.id === openId)
      if (book) {
        setBookGrade(book.grade)
        setOpenBooks(prev => ({ ...prev, [openId]: true }))
        setTimeout(() => {
          document.getElementById(`book-${openId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
      onClearOpenId?.()
    }
  }, [openId])

  const filteredBooks = BOOKS.filter(b => bookGrade === '전체' || b.grade === bookGrade)

  return (
    <div className="h-full overflow-y-auto">

      {/* 필터 & 챗봇 버튼 */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {['전체', '고1', '고2', '고3'].map(g => (
            <button
              key={g}
              onClick={() => setBookGrade(g)}
              className="px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
              style={{
                background: bookGrade === g ? THEME.accent : '#fff',
                color: bookGrade === g ? '#fff' : '#6B7280',
                borderColor: bookGrade === g ? THEME.accent : '#E5E7EB',
                boxShadow: bookGrade === g ? `0 2px 8px ${THEME.accentShadow}` : 'none',
              }}
            >
              {g}
            </button>
          ))}
        </div>
        <button
          onClick={() => onOpenChat('book', '독서 추천')}
          className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
          style={{
            background: THEME.accent,
            boxShadow: `0 4px 12px ${THEME.accentShadow}`,
          }}
        >
          ✨ 챗봇으로 도서 추천
        </button>
      </div>

      {/* 북리스트 */}
      {filteredBooks.map(book => {
        const curStatus = bookStatus[book.id] || book.status
        const sc = getStatusStyle(curStatus)
        const isOpen = openBooks[book.id] ?? true
        const isHighlighted = openId === book.id

        return (
          <div
            key={book.id}
            id={`book-${book.id}`}
            className="bg-white rounded-2xl p-5 mb-3.5 transition-all"
            style={{
              border: isHighlighted ? `2px solid ${THEME.accent}` : '1px solid #E5E7EB',
              boxShadow: isHighlighted ? `0 8px 24px ${THEME.accentShadow}` : '0 2px 8px rgba(15, 23, 42, 0.04)',
            }}
          >
            {/* 헤더 (클릭해서 열기/닫기) */}
            <div
              onClick={() => setOpenBooks(prev => ({ ...prev, [book.id]: !isOpen }))}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex-1">
                {/* 태그 */}
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2.5 py-0.5 rounded-full">
                    {book.grade} · {book.month}
                  </span>
                  <span
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      background: sc.bg,
                      color: sc.color,
                      border: `1px solid ${sc.border}60`,
                    }}
                  >
                    {curStatus === '완료' ? '✓' : curStatus === '검토중' ? '⏳' : '○'} {curStatus}
                  </span>
                </div>

                {/* 제목 */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-2xl">📖</span>
                  <div className="text-[16px] font-extrabold text-ink tracking-tight">{book.title}</div>
                  <div className="text-[12px] text-ink-secondary font-medium">· {book.author}</div>
                </div>

                {/* 연계 과목 */}
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full inline-block"
                  style={{
                    color: THEME.accentDark,
                    background: THEME.accentBg,
                    border: `1px solid ${THEME.accentBorder}60`,
                  }}
                >
                  🎯 연계 과목: {book.subject}
                </span>
              </div>
              <div
                className="text-ink-muted ml-3 transition-transform text-lg"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ∨
              </div>
            </div>

            {/* 펼친 컨텐츠 */}
            {isOpen && (
              <div className="mt-5 pt-5 border-t border-line">

                {/* 읽으려는 이유 */}
                <div className="mb-3.5">
                  <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 block">
                    💭 읽으려는 이유
                  </label>
                  <div className="bg-gray-50 border border-line rounded-lg px-4 py-3 text-[13px] font-medium text-ink leading-[1.7]">
                    {book.reason}
                  </div>
                </div>

                {/* 독서 후 활동 계획 */}
                {book.activity && (
                  <div className="mb-3.5">
                    <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 block">
                      📝 독서 후 활동 계획
                    </label>
                    <div className="bg-gray-50 border border-line rounded-lg px-4 py-3 text-[13px] font-medium text-ink leading-[1.7]">
                      {book.activity}
                    </div>
                  </div>
                )}

                {/* 히스토리 */}
                <History history={book.history} />

                {/* 피드백 작성 */}
                <div className="mb-3">
                  <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 block">
                    ✏️ 피드백 작성
                  </label>
                  <textarea
                    value={bookFeedback[book.id] || ''}
                    onChange={e => setBookFeedback(prev => ({ ...prev, [book.id]: e.target.value }))}
                    placeholder="도서에 대한 피드백을 작성해주세요..."
                    rows={3}
                    className="w-full border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium outline-none resize-y leading-[1.6] transition-all placeholder:text-ink-muted"
                    onFocus={e => {
                      e.target.style.borderColor = THEME.accent
                      e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#E5E7EB'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                    style={{
                      background: THEME.accent,
                      boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                    }}
                  >
                    📤 피드백 전달
                  </button>
                  <button
                    onClick={() => onOpenChat('book', book.title)}
                    className="px-4 py-2 bg-white border rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                    style={{
                      color: THEME.accent,
                      borderColor: THEME.accent,
                    }}
                  >
                    ✨ 챗봇으로 추천
                  </button>
                  <button
                    onClick={() => setBookStatus(prev => ({ ...prev, [book.id]: '완료' }))}
                    className="px-4 py-2 rounded-lg text-[12px] font-bold transition-all ml-auto disabled:cursor-not-allowed"
                    style={{
                      background: curStatus === '완료' ? '#059669' : '#E5E7EB',
                      color: curStatus === '완료' ? '#fff' : '#9CA3AF',
                      boxShadow: curStatus === '완료' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                    }}
                  >
                    {curStatus === '완료' ? '✓ 완료됨' : '완료 처리'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* 빈 상태 */}
      {filteredBooks.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-[13px] text-ink-secondary font-medium">
            해당 학년의 독서리스트가 없어요.
          </div>
        </div>
      )}
    </div>
  )
}