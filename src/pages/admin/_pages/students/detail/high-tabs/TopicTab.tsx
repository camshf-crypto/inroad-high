import { useState, useEffect } from 'react'

const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 5, display: 'block' }
const SEC: React.CSSProperties = { border: '0.5px solid #E5E7EB', borderRadius: 12, background: '#fff', padding: 20, marginBottom: 14 }

const TOPICS = [
  { id: 1, grade: '고1', month: '7월', title: '기후변화와 식량 안보', content: '기후변화로 인한 농업 생산량 변화를 데이터로 분석하고, 지속가능한 농업 기술 발전 방향을 제시하겠습니다.', subject: '지구과학·사회', status: '완료', history: [{ type: 'student', text: '기후변화와 식량 안보에 대해 탐구하고 싶어요.', date: '2025-01-15' }, { type: 'teacher', text: '좋은 주제예요! 수직농장 기술 쪽으로 구체화해보는 건 어떨까요?', date: '2025-01-17' }] },
  { id: 2, grade: '고2', month: '1월', title: '인공지능 윤리와 편향성 문제', content: '머신러닝 모델의 학습 데이터 편향이 실제 사회적 차별로 이어지는 사례를 분석하겠습니다.', subject: '정보·윤리', status: '검토중', history: [{ type: 'student', text: '머신러닝 편향 문제에 대해 탐구하고 싶습니다.', date: '2025-01-10' }] },
]

const statusColor = (s: string) => {
  if (s === '완료') return { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' }
  if (s === '검토중') return { bg: '#EEF2FF', color: '#3B5BDB', border: '#BAC8FF' }
  return { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' }
}

const History = ({ history }: { history: any[] }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={LABEL}>대화 히스토리</label>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {history.map((h, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: h.type === 'teacher' ? 'flex-end' : 'flex-start' }}>
          <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 3 }}>{h.type === 'teacher' ? '선생님' : '학생'} · {h.date}</div>
          <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: h.type === 'teacher' ? '12px 12px 0 12px' : '12px 12px 12px 0', background: h.type === 'teacher' ? '#EEF2FF' : '#F8F7F5', border: `0.5px solid ${h.type === 'teacher' ? '#BAC8FF' : '#E5E7EB'}`, fontSize: 12, color: '#1a1a1a', lineHeight: 1.6 }}>{h.text}</div>
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
        // 해당 학년으로 필터 변경
        setTopicGrade(topic.grade)
        // 해당 항목 열기
        setOpenTopics(prev => ({ ...prev, [openId]: true }))
        // 스크롤
        setTimeout(() => {
          document.getElementById(`topic-${openId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
      onClearOpenId?.()
    }
  }, [openId])

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['전체', '고1', '고2', '고3'].map(g => (
          <div key={g} onClick={() => setTopicGrade(g)}
            style={{ padding: '5px 14px', borderRadius: 99, fontSize: 12, cursor: 'pointer', background: topicGrade === g ? '#1a1a1a' : '#fff', color: topicGrade === g ? '#fff' : '#6B7280', border: `0.5px solid ${topicGrade === g ? '#1a1a1a' : '#E5E7EB'}` }}>
            {g}
          </div>
        ))}
      </div>

      {TOPICS.filter(t => topicGrade === '전체' || t.grade === topicGrade).map(topic => {
        const curStatus = topicStatus[topic.id] || topic.status
        const sc = statusColor(curStatus)
        const isOpen = openTopics[topic.id] ?? true
        return (
          <div key={topic.id} id={`topic-${topic.id}`} style={{ ...SEC, border: openId === topic.id ? '0.5px solid #3B5BDB' : SEC.border }}>
            <div onClick={() => setOpenTopics(prev => ({ ...prev, [topic.id]: !isOpen }))}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>{topic.grade} · {topic.month}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color, border: `0.5px solid ${sc.border}` }}>{curStatus}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>{topic.title}</div>
                <span style={{ fontSize: 11, color: '#3B5BDB', background: '#EEF2FF', padding: '2px 8px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>연계 과목: {topic.subject}</span>
              </div>
              <div style={{ fontSize: 18, color: '#6B7280', marginLeft: 12, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>∨</div>
            </div>

            {isOpen && (
              <div style={{ marginTop: 16, borderTop: '0.5px solid #E5E7EB', paddingTop: 16 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={LABEL}>학생 작성 내용</label>
                  <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>{topic.content}</div>
                </div>
                <History history={topic.history} />
                <div style={{ marginBottom: 12 }}>
                  <label style={LABEL}>피드백 작성</label>
                  <textarea value={feedback[topic.id] || ''} onChange={e => setFeedback(prev => ({ ...prev, [topic.id]: e.target.value }))}
                    placeholder="탐구주제에 대한 피드백을 작성해주세요..." rows={3}
                    style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit', lineHeight: 1.6 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ padding: '8px 16px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>피드백 전달</button>
                  <button onClick={() => onOpenChat('topic', topic.title)}
                    style={{ padding: '8px 16px', background: '#fff', color: '#3B5BDB', border: '0.5px solid #3B5BDB', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✨ 챗봇으로 고도화</button>
                  <button onClick={() => setTopicStatus(prev => ({ ...prev, [topic.id]: '완료' }))}
                    style={{ padding: '8px 16px', background: curStatus === '완료' ? '#059669' : '#E5E7EB', color: curStatus === '완료' ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', marginLeft: 'auto', fontFamily: 'inherit' }}>완료 처리</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {TOPICS.filter(t => topicGrade === '전체' || t.grade === topicGrade).length === 0 && (
        <div style={{ textAlign: 'center' as const, color: '#6B7280', fontSize: 13, padding: '40px 0' }}>해당 학년의 탐구주제가 없어요.</div>
      )}
    </div>
  )
}