import { useState } from 'react'

const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 5, display: 'block' }
const SEC: React.CSSProperties = { border: '0.5px solid #E5E7EB', borderRadius: 12, background: '#fff', padding: 20, marginBottom: 14 }

const BOOKS = [
  { id: 1, grade: '고1', month: '7월', title: '사피엔스', author: '유발 하라리', subject: '역사·철학', reason: '인류의 발전 과정을 통해 AI 시대의 미래를 예측하고 싶어서요.', activity: '독서 후 AI와 인류의 미래에 대한 탐구 보고서를 작성할 예정입니다.', status: '완료', history: [{ type: 'student', text: '사피엔스를 읽고 싶어요.', date: '2025-01-15' }, { type: 'teacher', text: '좋은 선택이에요! 4부 이후를 특히 집중해서 읽어보세요.', date: '2025-01-17' }] },
  { id: 2, grade: '고2', month: '3월', title: '총균쇠', author: '재레드 다이아몬드', subject: '지리·역사', reason: '지리적 환경이 문명 발달에 미친 영향을 탐구하고 싶어요.', activity: '', status: '검토중', history: [{ type: 'student', text: '총균쇠를 읽고 싶습니다.', date: '2025-02-10' }] },
  { id: 3, grade: '고2', month: '5월', title: '이기적 유전자', author: '리처드 도킨스', subject: '생물·철학', reason: '생물학적 진화론을 통해 인간 행동을 이해하고 싶어요.', activity: '진화론적 관점에서 인간의 이타적 행동을 분석하는 에세이를 쓸 예정입니다.', status: '검토중', history: [{ type: 'student', text: '이기적 유전자를 읽고 싶어요.', date: '2025-03-01' }] },
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

export default function BookTab({ student, onOpenChat }: { student: any, onOpenChat: (type: 'topic' | 'book', context: string) => void }) {
  const [bookGrade, setBookGrade] = useState('전체')
  const [bookFeedback, setBookFeedback] = useState<Record<number, string>>({})
  const [bookStatus, setBookStatus] = useState<Record<number, string>>({})
  const [openBooks, setOpenBooks] = useState<Record<number, boolean>>({})

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['전체', '고1', '고2', '고3'].map(g => (
            <div key={g} onClick={() => setBookGrade(g)} style={{ padding: '5px 14px', borderRadius: 99, fontSize: 12, cursor: 'pointer', background: bookGrade === g ? '#1a1a1a' : '#fff', color: bookGrade === g ? '#fff' : '#6B7280', border: `0.5px solid ${bookGrade === g ? '#1a1a1a' : '#E5E7EB'}` }}>{g}</div>
          ))}
        </div>
        <button onClick={() => onOpenChat('book', '독서 추천')} style={{ padding: '7px 14px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>✨ 챗봇으로 도서 추천</button>
      </div>
      {BOOKS.filter(b => bookGrade === '전체' || b.grade === bookGrade).map(book => {
        const curStatus = bookStatus[book.id] || book.status
        const sc = statusColor(curStatus)
        const isOpen = openBooks[book.id] ?? true
        return (
          <div key={book.id} style={SEC}>
            <div onClick={() => setOpenBooks(prev => ({ ...prev, [book.id]: !isOpen }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>{book.grade} · {book.month}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color, border: `0.5px solid ${sc.border}` }}>{curStatus}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>{book.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>· {book.author}</div>
                </div>
                <span style={{ fontSize: 11, color: '#3B5BDB', background: '#EEF2FF', padding: '2px 8px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>연계 과목: {book.subject}</span>
              </div>
              <div style={{ fontSize: 18, color: '#6B7280', marginLeft: 12, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>∨</div>
            </div>
            {isOpen && (
              <div style={{ marginTop: 16, borderTop: '0.5px solid #E5E7EB', paddingTop: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={LABEL}>읽으려는 이유</label>
                  <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>{book.reason}</div>
                </div>
                {book.activity && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={LABEL}>독서 후 활동 계획</label>
                    <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>{book.activity}</div>
                  </div>
                )}
                <History history={book.history} />
                <div style={{ marginBottom: 12 }}>
                  <label style={LABEL}>피드백 작성</label>
                  <textarea value={bookFeedback[book.id] || ''} onChange={e => setBookFeedback(prev => ({ ...prev, [book.id]: e.target.value }))} placeholder="도서에 대한 피드백을 작성해주세요..." rows={3} style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ padding: '7px 16px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>피드백 전달</button>
                  <button onClick={() => onOpenChat('book', book.title)} style={{ padding: '7px 16px', background: '#fff', color: '#3B5BDB', border: '0.5px solid #3B5BDB', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>✨ 챗봇으로 추천</button>
                  <button onClick={() => setBookStatus(prev => ({ ...prev, [book.id]: '완료' }))} style={{ padding: '7px 16px', background: curStatus === '완료' ? '#059669' : '#E5E7EB', color: curStatus === '완료' ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}>완료 처리</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
      {BOOKS.filter(b => bookGrade === '전체' || b.grade === bookGrade).length === 0 && (
        <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, padding: '40px 0' }}>해당 학년의 독서리스트가 없어요.</div>
      )}
    </div>
  )
}