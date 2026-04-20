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

const TOPICS = [
  { id: 1, grade: '고1', month: '7월', title: '기후변화와 식량 안보', content: '기후변화로 인한 농업 생산량 변화를 데이터로 분석하고, 지속가능한 농업 기술 발전 방향을 제시하겠습니다.', subject: '지구과학·사회', status: '완료', history: [{ type: 'student', text: '기후변화와 식량 안보에 대해 탐구하고 싶어요.', date: '2025-01-15' }, { type: 'teacher', text: '좋은 주제예요! 수직농장 기술 쪽으로 구체화해보는 건 어떨까요?', date: '2025-01-17' }] },
  { id: 2, grade: '고2', month: '1월', title: '인공지능 윤리와 편향성 문제', content: '머신러닝 모델의 학습 데이터 편향이 실제 사회적 차별로 이어지는 사례를 분석하겠습니다.', subject: '정보·윤리', status: '검토중', history: [{ type: 'student', text: '머신러닝 편향 문제에 대해 탐구하고 싶습니다.', date: '2025-01-10' }] },
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

export default function TopicTab({ student, onOpenChat, openId, onClearOpenId }: {
  student: any
  onOpenChat: (type: 'topic' | 'book', context: string) => void
  openId?: number | null
  onClearOpenId?: () => void
}) {
  const [topicGrade, setTopicGrade] = useState('전체')
  const [feedback, setFeedback] = useState<Record<number, string>>({})
  const [topicStatus, setTopicStatus] = useState<Record<number, string>>({})
  const [openTopics, setOpenTopics] = useState<Record<number, boolean>>({})

  // openId가 들어오면 해당 항목 자동으로 열기
  useEffect(() => {
    if (openId != null) {
      const topic = TOPICS.find(t => t.id === openId)
      if (topic) {
        setTopicGrade(topic.grade)
        setOpenTopics(prev => ({ ...prev, [openId]: true }))
        setTimeout(() => {
          document.getElementById(`topic-${openId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
      onClearOpenId?.()
    }
  }, [openId])

  const filteredTopics = TOPICS.filter(t => topicGrade === '전체' || t.grade === topicGrade)

  return (
    <div className="h-full overflow-y-auto">

      {/* 필터 */}
      <div className="flex gap-1.5 mb-4">
        {['전체', '고1', '고2', '고3'].map(g => (
          <button
            key={g}
            onClick={() => setTopicGrade(g)}
            className="px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
            style={{
              background: topicGrade === g ? THEME.accent : '#fff',
              color: topicGrade === g ? '#fff' : '#6B7280',
              borderColor: topicGrade === g ? THEME.accent : '#E5E7EB',
              boxShadow: topicGrade === g ? `0 2px 8px ${THEME.accentShadow}` : 'none',
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* 탐구주제 리스트 */}
      {filteredTopics.map(topic => {
        const curStatus = topicStatus[topic.id] || topic.status
        const sc = getStatusStyle(curStatus)
        const isOpen = openTopics[topic.id] ?? true
        const isHighlighted = openId === topic.id

        return (
          <div
            key={topic.id}
            id={`topic-${topic.id}`}
            className="bg-white rounded-2xl p-5 mb-3.5 transition-all"
            style={{
              border: isHighlighted ? `2px solid ${THEME.accent}` : '1px solid #E5E7EB',
              boxShadow: isHighlighted ? `0 8px 24px ${THEME.accentShadow}` : '0 2px 8px rgba(15, 23, 42, 0.04)',
            }}
          >
            {/* 헤더 (클릭 펼치기/접기) */}
            <div
              onClick={() => setOpenTopics(prev => ({ ...prev, [topic.id]: !isOpen }))}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex-1">
                {/* 태그 */}
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2.5 py-0.5 rounded-full">
                    {topic.grade} · {topic.month}
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
                  <span className="text-2xl">🔬</span>
                  <div className="text-[16px] font-extrabold text-ink tracking-tight">{topic.title}</div>
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
                  🎯 연계 과목: {topic.subject}
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

                {/* 학생 작성 내용 */}
                <div className="mb-3.5">
                  <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 block">
                    📝 학생 작성 내용
                  </label>
                  <div className="bg-gray-50 border border-line rounded-lg px-4 py-3 text-[13px] font-medium text-ink leading-[1.7]">
                    {topic.content}
                  </div>
                </div>

                {/* 히스토리 */}
                <History history={topic.history} />

                {/* 피드백 작성 */}
                <div className="mb-3">
                  <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 block">
                    ✏️ 피드백 작성
                  </label>
                  <textarea
                    value={feedback[topic.id] || ''}
                    onChange={e => setFeedback(prev => ({ ...prev, [topic.id]: e.target.value }))}
                    placeholder="탐구주제에 대한 피드백을 작성해주세요..."
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
                    onClick={() => onOpenChat('topic', topic.title)}
                    className="px-4 py-2 bg-white border rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                    style={{
                      color: THEME.accent,
                      borderColor: THEME.accent,
                    }}
                  >
                    ✨ 챗봇으로 고도화
                  </button>
                  <button
                    onClick={() => setTopicStatus(prev => ({ ...prev, [topic.id]: '완료' }))}
                    className="px-4 py-2 rounded-lg text-[12px] font-bold transition-all ml-auto"
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
      {filteredTopics.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔬</div>
          <div className="text-[13px] text-ink-secondary font-medium">
            해당 학년의 탐구주제가 없어요.
          </div>
        </div>
      )}
    </div>
  )
}