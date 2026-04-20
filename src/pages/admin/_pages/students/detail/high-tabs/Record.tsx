import { useState } from 'react'

const TOPICS = [
  { id: 1, grade: '고1', month: '7월', title: '기후변화와 식량 안보', content: '기후변화로 인한 농업 생산량 변화를 데이터로 분석하고, 지속가능한 농업 기술 발전 방향을 제시하겠습니다.', subject: '과학', status: '완료' },
  { id: 2, grade: '고2', month: '1월', title: '인공지능 윤리와 편향성 문제', content: '머신러닝 모델의 학습 데이터 편향이 실제 사회적 차별로 이어지는 사례를 분석하겠습니다.', subject: '정보', status: '검토중' },
  { id: 3, grade: '고2', month: '5월', title: '양자컴퓨팅의 암호화 위협', content: '양자컴퓨터가 현재 RSA 암호화 시스템에 미치는 위협과 양자 내성 암호화 기술을 탐구합니다.', subject: '수학', status: '진행중' },
]

const BOOKS = [
  { id: 1, grade: '고1', month: '7월', title: '사피엔스', author: '유발 하라리', subject: '역사', reason: '인류의 발전 과정을 통해 AI 시대의 미래를 예측하고 싶어서요.', status: '완료' },
  { id: 2, grade: '고2', month: '3월', title: '총균쇠', author: '재레드 다이아몬드', subject: '사회', reason: '지리적 환경이 문명 발달에 미친 영향을 탐구하고 싶어요.', status: '검토중' },
  { id: 3, grade: '고2', month: '5월', title: '이기적 유전자', author: '리처드 도킨스', subject: '과학', reason: '생물학적 진화론을 통해 인간 행동을 이해하고 싶어요.', status: '검토중' },
]

const SUBJECTS = ['국어', '수학', '영어', '한국사', '통합사회', '통합과학', '과학', '사회', '정보', '진로와직업']
const CREATIVE = ['자율활동', '동아리활동', '봉사활동', '진로활동']
const GRADE_LIST = ['고1', '고2', '고3']

const MOCK_RECORDS: Record<string, string> = {
  'topic-1': '기후변화와 식량 안보의 연관성을 탐구하는 활동에서 농업 생산량 변화에 관한 데이터를 직접 수집하고 분석하여 지속가능한 농업 기술의 발전 방향을 체계적으로 제시함. 환경 변화가 사회 전반에 미치는 복합적 영향을 과학적 근거에 기반하여 논리적으로 설명하는 역량을 보여줌.',
  'topic-2': '인공지능 윤리와 편향성 문제를 주제로 머신러닝 모델의 학습 데이터 편향이 실제 사회적 차별로 이어지는 구체적 사례를 분석함. 기술 발전과 윤리적 책임 사이의 균형에 대한 비판적 사고를 발휘하며, 공정한 AI 개발을 위한 제도적·기술적 방안을 탐색하는 심화된 관심을 드러냄.',
  'book-1': '유발 하라리의 「사피엔스」를 읽고 인류 문명의 발전 과정을 통해 AI 시대의 미래를 탐구함. 인지혁명·농업혁명·과학혁명의 흐름을 현대 기술 발전과 연결 지어 분석하고, 독서 후 AI와 인류의 미래에 대한 탐구 보고서를 작성하며 자신의 진로와의 연계성을 심화함.',
  'book-2': '재레드 다이아몬드의 「총균쇠」를 읽고 지리적 환경이 문명 발달에 미친 영향을 탐구함. 역사적 불평등의 근원을 환경결정론적 관점에서 분석하며 비판적 사고력을 키웠고, 현대 글로벌 불평등 문제와 연결하여 폭넓은 사회적 시각을 갖춤.',
}

const MOCK_SUGGESTIONS: Record<string, { strengths: string[], improvements: string[], connection: string }> = {
  'topic-1': {
    strengths: ['데이터 기반의 논리적 분석 능력이 돋보임', '환경·사회 융합적 시각을 잘 드러냄'],
    improvements: ['탐구 방법론을 더 구체적으로 서술하면 좋음', '본인의 결론과 한계점을 명시하면 완성도 높아짐'],
    connection: '환경공학, 식품공학, 지속가능발전학과 연계 탁월',
  },
  'topic-2': {
    strengths: ['기술과 윤리를 융합한 비판적 시각이 우수', '구체적 사례 분석 능력이 뛰어남'],
    improvements: ['해결 방안 제시 부분을 더 구체화 필요', '국내 사례도 함께 제시하면 설득력 향상'],
    connection: '컴퓨터공학, 인공지능학과, 법학과 연계 가능',
  },
  'book-1': {
    strengths: ['독서와 진로를 연결하는 사고력이 탁월', '거시적 역사 흐름을 현대와 연결한 통찰력 우수'],
    improvements: ['구체적인 인용이나 핵심 개념 언급 추가 필요', '비판적 시각도 함께 서술하면 더 풍부해짐'],
    connection: '인문사회계열, AI융합학과, 철학과 연계 적합',
  },
  'book-2': {
    strengths: ['역사적 관점에서 사회 구조를 분석하는 능력 우수', '비판적 독서 태도가 돋보임'],
    improvements: ['저자의 주장에 대한 본인 견해를 더 명확히 서술 필요', '관련 도서와 비교 독서 추천'],
    connection: '사회학, 지리학, 국제관계학과 연계 가능',
  },
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
  data['고2']['정보'] = MOCK_RECORDS['topic-2'] || ''
  return data
}

export default function RecordTab({ student, onEditTopic, onEditBook }: {
  student: any
  onEditTopic: (id: number) => void
  onEditBook: (id: number) => void
}) {
  const [selGrade, setSelGrade] = useState('고1')
  const [selItem, setSelItem] = useState<{ type: 'topic' | 'book', id: number } | null>(null)
  const [records, setRecords] = useState<Record<string, string>>(MOCK_RECORDS)
  const [recordData, setRecordData] = useState(initRecordData())
  const [generating, setGenerating] = useState<string | null>(null)
  const [fullScreen, setFullScreen] = useState(false)
  const [editingCell, setEditingCell] = useState<{ grade: string, field: string } | null>(null)
  const [editText, setEditText] = useState('')

  const gradeTopics = TOPICS.filter(t => t.grade === selGrade)
  const gradeBooks = BOOKS.filter(b => b.grade === selGrade)

  const getKey = (type: 'topic' | 'book', id: number) => `${type}-${id}`
  const selectedKey = selItem ? getKey(selItem.type, selItem.id) : null
  const selectedRecord = selectedKey ? records[selectedKey] : null
  const selectedSuggestion = selectedKey ? MOCK_SUGGESTIONS[selectedKey] : null
  const selectedData = selItem
    ? selItem.type === 'topic' ? TOPICS.find(t => t.id === selItem.id) : BOOKS.find(b => b.id === selItem.id)
    : null

  const generateRecord = (type: 'topic' | 'book', id: number) => {
    const key = getKey(type, id)
    setGenerating(key)
    setTimeout(() => {
      const item = type === 'topic' ? TOPICS.find(t => t.id === id) : BOOKS.find(b => b.id === id)
      if (item) {
        const generated = type === 'topic'
          ? `${(item as any).subject} 교과 탐구활동에서 "${(item as any).title}"을 주제로 심화 탐구를 진행함. ${(item as any).content} 탐구 과정에서 관련 자료를 체계적으로 수집·분석하고 논리적 결론을 도출하는 역량을 보임.`
          : `"${(item as any).title}"(${(item as any).author})을 읽고 ${(item as any).subject} 분야에 대한 심화 탐구를 진행함. ${(item as any).reason} 독서 활동을 통해 비판적 사고력과 융합적 시각을 키움.`
        setRecords(prev => ({ ...prev, [key]: generated }))
        const subject = (item as any).subject
        if (subject) {
          setRecordData(prev => ({
            ...prev,
            [(item as any).grade]: { ...prev[(item as any).grade], [subject]: generated }
          }))
        }
      }
      setGenerating(null)
    }, 1500)
  }

  const deleteRecord = (key: string) => {
    setRecords(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const applyToRecord = (grade: string, subject: string, text: string) => {
    setRecordData(prev => ({
      ...prev,
      [grade]: { ...prev[grade], [subject]: (prev[grade][subject] ? prev[grade][subject] + '\n\n' : '') + text }
    }))
  }

  const startEditCell = (grade: string, field: string) => {
    setEditingCell({ grade, field })
    setEditText(recordData[grade]?.[field] || '')
  }

  const saveCell = () => {
    if (!editingCell) return
    setRecordData(prev => ({ ...prev, [editingCell.grade]: { ...prev[editingCell.grade], [editingCell.field]: editText } }))
    setEditingCell(null)
    setEditText('')
  }

  const GradeSheet = ({ grade, inModal = false }: { grade: string, inModal?: boolean }) => (
    <div style={{ marginBottom: inModal ? 32 : 16 }}>
      {inModal && (
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #1a1a1a' }}>
          {grade}
        </div>
      )}
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
                <td style={{ border: '1px solid #374151', padding: inModal ? '8px 12px' : '5px 8px', fontSize: inModal ? 12 : 10, fontWeight: 500, color: '#374151', textAlign: 'center' as const, background: '#F9FAFB', verticalAlign: 'top' as const, whiteSpace: 'nowrap' as const }}>{subject}</td>
                <td style={{ border: '1px solid #374151', padding: 0, verticalAlign: 'top' as const }}>
                  {!inModal && editingCell?.grade === grade && editingCell?.field === subject ? (
                    <div style={{ padding: 4 }}>
                      <textarea value={editText} onChange={e => setEditText(e.target.value)} autoFocus
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: 10, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' as const, minHeight: 50, padding: '4px 8px', boxSizing: 'border-box' as const }} />
                      <div style={{ display: 'flex', gap: 4, padding: '4px 8px' }}>
                        <button onClick={saveCell} style={{ padding: '3px 10px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>저장</button>
                        <button onClick={() => setEditingCell(null)} style={{ padding: '3px 10px', background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => !inModal && startEditCell(grade, subject)}
                      style={{ padding: inModal ? '8px 12px' : '5px 8px', fontSize: inModal ? 12 : 10, color: recordData[grade]?.[subject] ? '#1a1a1a' : '#D1D5DB', lineHeight: 1.8, minHeight: inModal ? 50 : 32, cursor: inModal ? 'default' : 'text', whiteSpace: 'pre-wrap' as const }}>
                      {recordData[grade]?.[subject] || (inModal ? '' : '클릭하여 입력')}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <div style={{ fontSize: inModal ? 13 : 11, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>8. 창의적 체험활동상황</div>
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
                <td style={{ border: '1px solid #374151', padding: inModal ? '8px 12px' : '5px 8px', fontSize: inModal ? 12 : 10, fontWeight: 500, color: '#374151', textAlign: 'center' as const, background: '#F9FAFB', verticalAlign: 'top' as const, whiteSpace: 'nowrap' as const }}>{area}</td>
                <td style={{ border: '1px solid #374151', padding: 0, verticalAlign: 'top' as const }}>
                  {!inModal && editingCell?.grade === grade && editingCell?.field === area ? (
                    <div style={{ padding: 4 }}>
                      <textarea value={editText} onChange={e => setEditText(e.target.value)} autoFocus
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: 10, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' as const, minHeight: 50, padding: '4px 8px', boxSizing: 'border-box' as const }} />
                      <div style={{ display: 'flex', gap: 4, padding: '4px 8px' }}>
                        <button onClick={saveCell} style={{ padding: '3px 10px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>저장</button>
                        <button onClick={() => setEditingCell(null)} style={{ padding: '3px 10px', background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => !inModal && startEditCell(grade, area)}
                      style={{ padding: inModal ? '8px 12px' : '5px 8px', fontSize: inModal ? 12 : 10, color: recordData[grade]?.[area] ? '#1a1a1a' : '#D1D5DB', lineHeight: 1.8, minHeight: inModal ? 50 : 32, cursor: inModal ? 'default' : 'text', whiteSpace: 'pre-wrap' as const }}>
                      {recordData[grade]?.[area] || (inModal ? '' : '클릭하여 입력')}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 12 }}>

      {/* 왼쪽: 활동 목록 */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexShrink: 0 }}>
          {GRADE_LIST.map(g => (
            <div key={g} onClick={() => { setSelGrade(g); setSelItem(null) }}
              style={{ flex: 1, padding: '5px 0', borderRadius: 99, fontSize: 11, cursor: 'pointer', textAlign: 'center' as const, background: selGrade === g ? '#3B5BDB' : '#fff', color: selGrade === g ? '#fff' : '#6B7280', border: `0.5px solid ${selGrade === g ? '#3B5BDB' : '#E5E7EB'}` }}>
              {g}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 탐구주제 */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ background: '#EEF2FF', color: '#3B5BDB', padding: '1px 7px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>🔬 탐구</span>
              <span>{gradeTopics.length}개</span>
            </div>
            {gradeTopics.length === 0
              ? <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' as const, padding: '8px 0' }}>없음</div>
              : gradeTopics.map(topic => {
                const key = getKey('topic', topic.id)
                const isSelected = selItem?.type === 'topic' && selItem?.id === topic.id
                const hasRecord = !!records[key]
                return (
                  <div key={topic.id} onClick={() => setSelItem({ type: 'topic', id: topic.id })}
                    style={{ border: `0.5px solid ${isSelected ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 8, padding: '8px 10px', marginBottom: 5, cursor: 'pointer', background: isSelected ? '#EEF2FF' : '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: '#6B7280' }}>{topic.month} · {topic.subject}</span>
                      {hasRecord && <span style={{ fontSize: 9, color: '#059669', background: '#ECFDF5', padding: '1px 5px', borderRadius: 99 }}>완성</span>}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.4 }}>{topic.title}</div>
                  </div>
                )
              })
            }
          </div>
          {/* 독서 */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ background: '#FFF7ED', color: '#D97706', padding: '1px 7px', borderRadius: 99, border: '0.5px solid #FDBA74' }}>📚 독서</span>
              <span>{gradeBooks.length}개</span>
            </div>
            {gradeBooks.length === 0
              ? <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' as const, padding: '8px 0' }}>없음</div>
              : gradeBooks.map(book => {
                const key = getKey('book', book.id)
                const isSelected = selItem?.type === 'book' && selItem?.id === book.id
                const hasRecord = !!records[key]
                return (
                  <div key={book.id} onClick={() => setSelItem({ type: 'book', id: book.id })}
                    style={{ border: `0.5px solid ${isSelected ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 8, padding: '8px 10px', marginBottom: 5, cursor: 'pointer', background: isSelected ? '#EEF2FF' : '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: '#6B7280' }}>{book.month} · {book.subject}</span>
                      {hasRecord && <span style={{ fontSize: 9, color: '#059669', background: '#ECFDF5', padding: '1px 5px', borderRadius: 99 }}>완성</span>}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#1a1a1a' }}>{book.title}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF' }}>{book.author}</div>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>

      {/* 가운데: AI 생기부 문구 + 보완점 */}
      <div style={{ width: 300, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selItem ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9CA3AF', padding: 20 }}>
            <div style={{ fontSize: 28 }}>✨</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#6B7280', textAlign: 'center' as const }}>활동을 선택하면 AI 생기부 문구를 생성해드려요</div>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                {selItem.type === 'topic' ? '🔬 탐구주제' : '📚 독서'} · {selGrade}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                {(selectedData as any)?.title}
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>과목: {(selectedData as any)?.subject}</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* AI 생기부 문구 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a' }}>✨ AI 생기부 문구</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {selectedRecord && (
                      <button onClick={() => deleteRecord(selectedKey!)}
                        style={{ padding: '3px 8px', background: '#FEF2F2', color: '#EF4444', border: '0.5px solid #FCA5A5', borderRadius: 6, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                        삭제
                      </button>
                    )}
                    <button onClick={() => generateRecord(selItem.type, selItem.id)}
                      disabled={generating === selectedKey}
                      style={{ padding: '3px 10px', background: generating === selectedKey ? '#E5E7EB' : '#3B5BDB', color: generating === selectedKey ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 6, fontSize: 10, cursor: generating === selectedKey ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                      {generating === selectedKey ? '생성중...' : selectedRecord ? '재생성' : '생성'}
                    </button>
                  </div>
                </div>

                {generating === selectedKey ? (
                  <div style={{ textAlign: 'center' as const, padding: '20px 0', color: '#9CA3AF', fontSize: 12 }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>✨</div>AI 분석 중...
                  </div>
                ) : !selectedRecord ? (
                  <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '12px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' as const }}>
                    생성 버튼을 눌러주세요
                  </div>
                ) : (
                  <>
                    <div style={{ background: '#F0FDF4', border: '0.5px solid #6EE7B7', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#1a1a1a', lineHeight: 1.8, marginBottom: 8 }}>
                      {selectedRecord}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: selectedRecord.length > 500 ? '#EF4444' : '#059669' }}>
                        {selectedRecord.length}자
                      </span>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => navigator.clipboard.writeText(selectedRecord)}
                          style={{ padding: '3px 8px', background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 5, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>복사</button>
                        <button onClick={() => {
                          const subject = (selectedData as any)?.subject
                          const grade = (selectedData as any)?.grade || selGrade
                          if (subject && selectedRecord) applyToRecord(grade, subject, selectedRecord)
                        }}
                          style={{ padding: '3px 8px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 5, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>생기부 반영</button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 피드백 작성 요청 버튼 */}
              <div style={{ borderTop: '0.5px solid #E5E7EB', paddingTop: 10 }}>
                <button
                  onClick={() => selItem.type === 'topic' ? onEditTopic(selItem.id) : onEditBook(selItem.id)}
                  style={{ width: '100%', padding: '9px 12px', background: '#F8F7F5', color: '#374151', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>💬 {selItem.type === 'topic' ? '탐구주제' : '독서리스트'} 탭에서 피드백 작성하기</span>
                  <span style={{ color: '#9CA3AF' }}>→</span>
                </button>
              </div>

              {/* AI 보완점 */}
              {selectedSuggestion && selectedRecord && (
                <div style={{ borderTop: '0.5px solid #E5E7EB', paddingTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>🔍 AI 보완점 분석</div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#059669', marginBottom: 5 }}>강점</div>
                    {selectedSuggestion.strengths.map((s, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#374151', lineHeight: 1.6, padding: '4px 8px', background: '#F0FDF4', borderRadius: 6, marginBottom: 4 }}>✓ {s}</div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#EF4444', marginBottom: 5 }}>개선 필요</div>
                    {selectedSuggestion.improvements.map((s, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#374151', lineHeight: 1.6, padding: '4px 8px', background: '#FEF2F2', borderRadius: 6, marginBottom: 4 }}>△ {s}</div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#3B5BDB', marginBottom: 5 }}>전공 연계</div>
                    <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.6, padding: '4px 8px', background: '#EEF2FF', borderRadius: 6 }}>🎓 {selectedSuggestion.connection}</div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 오른쪽: 실제 생기부 */}
      <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>📋 생기부</div>
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          <GradeSheet grade={selGrade} />
        </div>
      </div>

      {/* 전체화면 모달 */}
      {fullScreen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '90vw', maxWidth: 960, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>📋 학교생활기록부</div>
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
                {student?.name} · {student?.grade}
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