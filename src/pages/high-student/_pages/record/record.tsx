import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState } from '../../_store/auth'

const SUBJECTS = ['국어', '수학', '영어', '한국사', '통합사회', '통합과학', '과학', '사회', '정보', '진로와직업']
const CREATIVE = ['자율활동', '동아리활동', '봉사활동', '진로활동']
const GRADE_LIST = ['고1', '고2', '고3']

// 탐구주제 목업 (실제로는 TopicTab 데이터와 연동)
const TOPICS = [
  { id: 1, grade: '고1', month: '7월', title: '기후변화와 식량 안보', subject: '과학', status: '완료' },
  { id: 2, grade: '고2', month: '1월', title: '인공지능 윤리와 편향성 문제', subject: '정보', status: '검토중' },
  { id: 3, grade: '고2', month: '5월', title: '양자컴퓨팅의 암호화 위협', subject: '수학', status: '진행중' },
]

// 독서 목업 (실제로는 BookTab 데이터와 연동)
const BOOKS = [
  { id: 1, grade: '고1', month: '7월', title: '사피엔스', author: '유발 하라리', subject: '역사', status: '완료' },
  { id: 2, grade: '고2', month: '3월', title: '총균쇠', author: '재레드 다이아몬드', subject: '사회', status: '검토중' },
  { id: 3, grade: '고2', month: '5월', title: '이기적 유전자', author: '리처드 도킨스', subject: '과학', status: '검토중' },
]

// AI 생성된 생기부 문구 목업
const MOCK_RECORDS: Record<string, string> = {
  'topic-1': '기후변화와 식량 안보의 연관성을 탐구하는 활동에서 농업 생산량 변화에 관한 데이터를 직접 수집하고 분석하여 지속가능한 농업 기술의 발전 방향을 체계적으로 제시함. 환경 변화가 사회 전반에 미치는 복합적 영향을 과학적 근거에 기반하여 논리적으로 설명하는 역량을 보여줌.',
  'book-1': '유발 하라리의 「사피엔스」를 읽고 인류 문명의 발전 과정을 통해 AI 시대의 미래를 탐구함. 인지혁명·농업혁명·과학혁명의 흐름을 현대 기술 발전과 연결 지어 분석하고, 독서 후 AI와 인류의 미래에 대한 탐구 보고서를 작성하며 자신의 진로와의 연계성을 심화함.',
}

const initRecordData = () => {
  const data: Record<string, Record<string, string>> = {}
  GRADE_LIST.forEach(g => {
    data[g] = {}
    SUBJECTS.forEach(s => { data[g][s] = '' })
    CREATIVE.forEach(c => { data[g][c] = '' })
  })
  data['고1']['과학'] = MOCK_RECORDS['topic-1'] || ''
  data['고1']['역사'] = MOCK_RECORDS['book-1'] || ''
  return data
}

export default function Record() {
  const student = useAtomValue(studentState)
  const [selGrade, setSelGrade] = useState(student?.grade || '고1')
  const [selItem, setSelItem] = useState<{ type: 'topic' | 'book', id: number } | null>(null)
  const [recordData] = useState(initRecordData())
  const [fullScreen, setFullScreen] = useState(false)

  const gradeTopics = TOPICS.filter(t => t.grade === selGrade)
  const gradeBooks = BOOKS.filter(b => b.grade === selGrade)

  const getKey = (type: 'topic' | 'book', id: number) => `${type}-${id}`

  const GradeSheet = ({ grade, inModal = false }: { grade: string, inModal?: boolean }) => (
    <div style={{ marginBottom: inModal ? 32 : 16 }}>
      {inModal && (
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #1a1a1a' }}>
          {grade}
        </div>
      )}

      {/* 세특 */}
      <div style={{ marginBottom: inModal ? 20 : 12 }}>
        <div style={{ fontSize: inModal ? 13 : 11, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>
          5. 교과학습발달상황 · 세부능력 및 특기사항
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #374151' }}>
          <thead>
            <tr style={{ background: '#F3F4F6' }}>
              <th style={{ border: '1px solid #374151', padding: inModal ? '8px 12px' : '5px 8px', fontSize: inModal ? 12 : 10, fontWeight: 600, color: '#374151', width: 80, textAlign: 'center' as const }}>과목</th>
              <th style={{ border: '1px solid #374151', padding: inModal ? '8px 12px' : '5px 8px', fontSize: inModal ? 12 : 10, fontWeight: 600, color: '#374151', textAlign: 'center' as const }}>세부능력 및 특기사항</th>
            </tr>
          </thead>
          <tbody>
            {SUBJECTS.map(subject => (
              <tr key={subject}>
                <td style={{ border: '1px solid #374151', padding: inModal ? '8px 12px' : '5px 8px', fontSize: inModal ? 12 : 10, fontWeight: 500, color: '#374151', textAlign: 'center' as const, background: '#F9FAFB', verticalAlign: 'top' as const, whiteSpace: 'nowrap' as const }}>
                  {subject}
                </td>
                <td style={{ border: '1px solid #374151', padding: inModal ? '8px 12px' : '5px 8px', verticalAlign: 'top' as const }}>
                  <div style={{ fontSize: inModal ? 12 : 10, color: recordData[grade]?.[subject] ? '#1a1a1a' : '#D1D5DB', lineHeight: 1.8, minHeight: inModal ? 50 : 32, whiteSpace: 'pre-wrap' as const }}>
                    {recordData[grade]?.[subject] || '선생님이 작성 중이에요'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 창의적 체험활동 */}
      <div>
        <div style={{ fontSize: inModal ? 13 : 11, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>
          8. 창의적 체험활동상황
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #374151' }}>
          <thead>
            <tr style={{ background: '#F3F4F6' }}>
              <th style={{ border: '1px solid #374151', padding: inModal ? '8px 12px' : '5px 8px', fontSize: inModal ? 12 : 10, fontWeight: 600, color: '#374151', width: 80, textAlign: 'center' as const }}>영역</th>
              <th style={{ border: '1px solid #374151', padding: inModal ? '8px 12px' : '5px 8px', fontSize: inModal ? 12 : 10, fontWeight: 600, color: '#374151', textAlign: 'center' as const }}>특기사항</th>
            </tr>
          </thead>
          <tbody>
            {CREATIVE.map(area => (
              <tr key={area}>
                <td style={{ border: '1px solid #374151', padding: inModal ? '8px 12px' : '5px 8px', fontSize: inModal ? 12 : 10, fontWeight: 500, color: '#374151', textAlign: 'center' as const, background: '#F9FAFB', verticalAlign: 'top' as const, whiteSpace: 'nowrap' as const }}>
                  {area}
                </td>
                <td style={{ border: '1px solid #374151', padding: inModal ? '8px 12px' : '5px 8px', verticalAlign: 'top' as const }}>
                  <div style={{ fontSize: inModal ? 12 : 10, color: recordData[grade]?.[area] ? '#1a1a1a' : '#D1D5DB', lineHeight: 1.8, minHeight: inModal ? 50 : 32, whiteSpace: 'pre-wrap' as const }}>
                    {recordData[grade]?.[area] || '선생님이 작성 중이에요'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 50px)', overflow: 'hidden', padding: '28px 32px', boxSizing: 'border-box' as const, gap: 16 }}>

      {/* 왼쪽: 활동 목록 */}
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 학년 탭 */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexShrink: 0 }}>
          {GRADE_LIST.map(g => (
            <div key={g} onClick={() => { setSelGrade(g); setSelItem(null) }}
              style={{ flex: 1, padding: '6px 0', borderRadius: 99, fontSize: 12, cursor: 'pointer', textAlign: 'center' as const, background: selGrade === g ? '#3B5BDB' : '#fff', color: selGrade === g ? '#fff' : '#6B7280', border: `0.5px solid ${selGrade === g ? '#3B5BDB' : '#E5E7EB'}`, fontWeight: selGrade === g ? 500 : 400 }}>
              {g}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* 탐구주제 */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ background: '#EEF2FF', color: '#3B5BDB', padding: '2px 8px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>🔬 탐구주제</span>
              <span style={{ color: '#9CA3AF' }}>{gradeTopics.length}개</span>
            </div>
            {gradeTopics.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' as const, padding: '12px 0' }}>없음</div>
            ) : gradeTopics.map(topic => {
              const key = getKey('topic', topic.id)
              const isSelected = selItem?.type === 'topic' && selItem?.id === topic.id
              const hasRecord = !!MOCK_RECORDS[key]
              return (
                <div key={topic.id} onClick={() => setSelItem({ type: 'topic', id: topic.id })}
                  style={{ border: `0.5px solid ${isSelected ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 8, padding: '9px 11px', marginBottom: 6, cursor: 'pointer', background: isSelected ? '#EEF2FF' : '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: '#6B7280' }}>{topic.month} · {topic.subject}</span>
                    {hasRecord
                      ? <span style={{ fontSize: 9, color: '#059669', background: '#ECFDF5', padding: '1px 6px', borderRadius: 99, border: '0.5px solid #6EE7B7' }}>문구완성</span>
                      : <span style={{ fontSize: 9, color: '#D97706', background: '#FFF3E8', padding: '1px 6px', borderRadius: 99, border: '0.5px solid #FDBA74' }}>작성중</span>
                    }
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.4 }}>{topic.title}</div>
                </div>
              )
            })}
          </div>

          {/* 독서 */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ background: '#FFF7ED', color: '#D97706', padding: '2px 8px', borderRadius: 99, border: '0.5px solid #FDBA74' }}>📚 독서</span>
              <span style={{ color: '#9CA3AF' }}>{gradeBooks.length}개</span>
            </div>
            {gradeBooks.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' as const, padding: '12px 0' }}>없음</div>
            ) : gradeBooks.map(book => {
              const key = getKey('book', book.id)
              const isSelected = selItem?.type === 'book' && selItem?.id === book.id
              const hasRecord = !!MOCK_RECORDS[key]
              return (
                <div key={book.id} onClick={() => setSelItem({ type: 'book', id: book.id })}
                  style={{ border: `0.5px solid ${isSelected ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 8, padding: '9px 11px', marginBottom: 6, cursor: 'pointer', background: isSelected ? '#EEF2FF' : '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: '#6B7280' }}>{book.month} · {book.subject}</span>
                    {hasRecord
                      ? <span style={{ fontSize: 9, color: '#059669', background: '#ECFDF5', padding: '1px 6px', borderRadius: 99, border: '0.5px solid #6EE7B7' }}>문구완성</span>
                      : <span style={{ fontSize: 9, color: '#D97706', background: '#FFF3E8', padding: '1px 6px', borderRadius: 99, border: '0.5px solid #FDBA74' }}>작성중</span>
                    }
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>{book.title}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{book.author}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 오른쪽: 생기부 */}
      <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>📋 나의 생기부</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {GRADE_LIST.map(g => (
                <div key={g} onClick={() => setSelGrade(g)}
                  style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, cursor: 'pointer', background: selGrade === g ? '#1a1a1a' : '#fff', color: selGrade === g ? '#fff' : '#6B7280', border: `0.5px solid ${selGrade === g ? '#1a1a1a' : '#E5E7EB'}` }}>
                  {g}
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setFullScreen(true)}
            style={{ padding: '5px 12px', background: '#fff', color: '#3B5BDB', border: '0.5px solid #3B5BDB', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            ⛶ 전체화면
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          <GradeSheet grade={selGrade} />
        </div>
      </div>

      {/* 전체화면 모달 */}
      {fullScreen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '90vw', maxWidth: 960, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>📋 나의 학교생활기록부</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{student?.name} · 고1 ~ 고3 전체</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => window.print()}
                  style={{ padding: '7px 16px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🖨️ PDF 저장 / 인쇄
                </button>
                <button onClick={() => setFullScreen(false)}
                  style={{ padding: '7px 16px', background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  닫기
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
              <div style={{ textAlign: 'center' as const, fontSize: 20, fontWeight: 700, marginBottom: 28, color: '#1a1a1a' }}>
                학교생활기록부
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, textAlign: 'center' as const }}>
                {student?.name}
              </div>
              {GRADE_LIST.map(g => (
                <GradeSheet key={g} grade={g} inModal={true} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}