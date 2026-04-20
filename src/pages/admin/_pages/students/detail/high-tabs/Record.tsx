import { useState } from 'react'

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

  // 생기부 시트 컴포넌트
  const GradeSheet = ({ grade, inModal = false }: { grade: string, inModal?: boolean }) => (
    <div className={inModal ? 'mb-8' : 'mb-4'}>
      {inModal && (
        <div className="text-[15px] font-extrabold text-ink mb-3 pb-2 border-b-2 border-ink tracking-tight">
          📅 {grade}
        </div>
      )}

      {/* 세부능력 및 특기사항 */}
      <div className={inModal ? 'mb-5' : 'mb-3'}>
        <div className={`font-extrabold text-ink mb-1.5 tracking-tight ${inModal ? 'text-[13px]' : 'text-[11px]'}`}>
          5. 교과학습발달상황 · 세부능력 및 특기사항
        </div>
        <table className="w-full border-collapse border border-gray-700">
          <thead>
            <tr className="bg-gray-100">
              <th
                className={`border border-gray-700 font-bold text-ink w-20 text-center ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}
              >
                과목
              </th>
              <th
                className={`border border-gray-700 font-bold text-ink text-center ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}
              >
                세부능력 및 특기사항
              </th>
            </tr>
          </thead>
          <tbody>
            {SUBJECTS.map(subject => (
              <tr key={subject}>
                <td
                  className={`border border-gray-700 font-semibold text-ink text-center bg-gray-50 align-top whitespace-nowrap ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}
                >
                  {subject}
                </td>
                <td className="border border-gray-700 p-0 align-top">
                  {!inModal && editingCell?.grade === grade && editingCell?.field === subject ? (
                    <div className="p-1">
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        autoFocus
                        className="w-full border-none outline-none text-[10px] font-medium leading-[1.7] resize-y min-h-[50px] px-2 py-1 transition-all"
                        onFocus={e => {
                          e.target.style.boxShadow = `inset 0 0 0 2px ${THEME.accent}`
                        }}
                        onBlur={e => {
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                      <div className="flex gap-1 px-2 py-1">
                        <button
                          onClick={saveCell}
                          className="px-2.5 py-0.5 text-white rounded text-[11px] font-bold transition-all"
                          style={{ background: THEME.accent }}
                        >
                          💾 저장
                        </button>
                        <button
                          onClick={() => setEditingCell(null)}
                          className="px-2.5 py-0.5 bg-white text-ink-secondary border border-line rounded text-[11px] font-semibold hover:bg-gray-50 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => !inModal && startEditCell(grade, subject)}
                      className={`leading-[1.8] whitespace-pre-wrap transition-colors ${inModal ? 'px-3 py-2 text-[12px] min-h-[50px]' : 'px-2 py-1.5 text-[10px] min-h-[32px] cursor-text hover:bg-blue-50/30'}`}
                      style={{
                        color: recordData[grade]?.[subject] ? '#1a1a1a' : '#D1D5DB',
                      }}
                    >
                      {recordData[grade]?.[subject] || (inModal ? '' : '클릭하여 입력')}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 창의적 체험활동상황 */}
      <div>
        <div className={`font-extrabold text-ink mb-1.5 tracking-tight ${inModal ? 'text-[13px]' : 'text-[11px]'}`}>
          8. 창의적 체험활동상황
        </div>
        <table className="w-full border-collapse border border-gray-700">
          <thead>
            <tr className="bg-gray-100">
              <th
                className={`border border-gray-700 font-bold text-ink w-20 text-center ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}
              >
                영역
              </th>
              <th
                className={`border border-gray-700 font-bold text-ink text-center ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}
              >
                특기사항
              </th>
            </tr>
          </thead>
          <tbody>
            {CREATIVE.map(area => (
              <tr key={area}>
                <td
                  className={`border border-gray-700 font-semibold text-ink text-center bg-gray-50 align-top whitespace-nowrap ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}
                >
                  {area}
                </td>
                <td className="border border-gray-700 p-0 align-top">
                  {!inModal && editingCell?.grade === grade && editingCell?.field === area ? (
                    <div className="p-1">
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        autoFocus
                        className="w-full border-none outline-none text-[10px] font-medium leading-[1.7] resize-y min-h-[50px] px-2 py-1"
                      />
                      <div className="flex gap-1 px-2 py-1">
                        <button
                          onClick={saveCell}
                          className="px-2.5 py-0.5 text-white rounded text-[11px] font-bold transition-all"
                          style={{ background: THEME.accent }}
                        >
                          💾 저장
                        </button>
                        <button
                          onClick={() => setEditingCell(null)}
                          className="px-2.5 py-0.5 bg-white text-ink-secondary border border-line rounded text-[11px] font-semibold hover:bg-gray-50 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => !inModal && startEditCell(grade, area)}
                      className={`leading-[1.8] whitespace-pre-wrap transition-colors ${inModal ? 'px-3 py-2 text-[12px] min-h-[50px]' : 'px-2 py-1.5 text-[10px] min-h-[32px] cursor-text hover:bg-blue-50/30'}`}
                      style={{
                        color: recordData[grade]?.[area] ? '#1a1a1a' : '#D1D5DB',
                      }}
                    >
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
    <div className="flex h-full overflow-hidden gap-3">

      {/* ==================== 왼쪽: 활동 목록 ==================== */}
      <div className="w-[240px] flex-shrink-0 flex flex-col overflow-hidden">

        {/* 학년 탭 */}
        <div className="flex gap-1 mb-3 flex-shrink-0">
          {GRADE_LIST.map(g => {
            const isActive = selGrade === g
            return (
              <button
                key={g}
                onClick={() => { setSelGrade(g); setSelItem(null) }}
                className="flex-1 py-1.5 rounded-full text-[11px] font-bold text-center transition-all border"
                style={{
                  background: isActive ? THEME.accent : '#fff',
                  color: isActive ? '#fff' : '#6B7280',
                  borderColor: isActive ? THEME.accent : '#E5E7EB',
                  boxShadow: isActive ? `0 2px 6px ${THEME.accentShadow}` : 'none',
                }}
              >
                {g}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-3">

          {/* 탐구주제 */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: THEME.accentBg, color: THEME.accent, border: `1px solid ${THEME.accentBorder}60` }}
              >
                🔬 탐구
              </span>
              <span className="text-[10px] font-semibold text-ink-secondary">{gradeTopics.length}개</span>
            </div>
            {gradeTopics.length === 0 ? (
              <div className="text-[11px] font-medium text-ink-muted text-center py-2 bg-gray-50 rounded-lg">
                없음
              </div>
            ) : gradeTopics.map(topic => {
              const key = getKey('topic', topic.id)
              const isSelected = selItem?.type === 'topic' && selItem?.id === topic.id
              const hasRecord = !!records[key]
              return (
                <button
                  key={topic.id}
                  onClick={() => setSelItem({ type: 'topic', id: topic.id })}
                  className="w-full rounded-lg px-3 py-2 mb-1.5 text-left transition-all"
                  style={{
                    border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                    background: isSelected ? THEME.accentBg : '#fff',
                    boxShadow: isSelected ? `0 2px 6px ${THEME.accentShadow}` : 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-semibold text-ink-secondary">{topic.month} · {topic.subject}</span>
                    {hasRecord && (
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                        ✓ 완성
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] font-semibold text-ink leading-[1.4]">{topic.title}</div>
                </button>
              )
            })}
          </div>

          {/* 독서 */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                📚 독서
              </span>
              <span className="text-[10px] font-semibold text-ink-secondary">{gradeBooks.length}개</span>
            </div>
            {gradeBooks.length === 0 ? (
              <div className="text-[11px] font-medium text-ink-muted text-center py-2 bg-gray-50 rounded-lg">
                없음
              </div>
            ) : gradeBooks.map(book => {
              const key = getKey('book', book.id)
              const isSelected = selItem?.type === 'book' && selItem?.id === book.id
              const hasRecord = !!records[key]
              return (
                <button
                  key={book.id}
                  onClick={() => setSelItem({ type: 'book', id: book.id })}
                  className="w-full rounded-lg px-3 py-2 mb-1.5 text-left transition-all"
                  style={{
                    border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                    background: isSelected ? THEME.accentBg : '#fff',
                    boxShadow: isSelected ? `0 2px 6px ${THEME.accentShadow}` : 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-semibold text-ink-secondary">{book.month} · {book.subject}</span>
                    {hasRecord && (
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                        ✓ 완성
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] font-semibold text-ink">{book.title}</div>
                  <div className="text-[10px] font-medium text-ink-muted">{book.author}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ==================== 가운데: AI 생기부 문구 + 보완점 ==================== */}
      <div className="w-[320px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        {!selItem ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-ink-muted p-5">
            <div className="text-3xl">✨</div>
            <div className="text-[13px] font-bold text-ink-secondary text-center">
              활동을 선택하면<br />AI 생기부 문구를 생성해드려요
            </div>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="px-4 py-3 border-b border-line flex-shrink-0">
              <div className="text-[11px] font-semibold text-ink-secondary mb-1">
                {selItem.type === 'topic' ? '🔬 탐구주제' : '📚 독서'} · {selGrade}
              </div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">
                {(selectedData as any)?.title}
              </div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                과목: <span className="font-bold">{(selectedData as any)?.subject}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">

              {/* AI 생기부 문구 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] font-extrabold text-ink">✨ AI 생기부 문구</div>
                  <div className="flex gap-1">
                    {selectedRecord && (
                      <button
                        onClick={() => deleteRecord(selectedKey!)}
                        className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-md text-[10px] font-bold hover:bg-red-100 transition-colors"
                      >
                        🗑️ 삭제
                      </button>
                    )}
                    <button
                      onClick={() => generateRecord(selItem.type, selItem.id)}
                      disabled={generating === selectedKey}
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all disabled:cursor-not-allowed"
                      style={{
                        background: generating === selectedKey ? '#E5E7EB' : THEME.accent,
                        color: generating === selectedKey ? '#9CA3AF' : '#fff',
                        boxShadow: generating === selectedKey ? 'none' : `0 2px 4px ${THEME.accentShadow}`,
                      }}
                    >
                      {generating === selectedKey ? '⏳ 생성중...' : selectedRecord ? '🔄 재생성' : '✨ 생성'}
                    </button>
                  </div>
                </div>

                {generating === selectedKey ? (
                  <div className="text-center py-5 text-ink-muted">
                    <div className="text-2xl mb-1.5 animate-pulse">✨</div>
                    <div className="text-[12px] font-medium">AI 분석 중...</div>
                  </div>
                ) : !selectedRecord ? (
                  <div className="bg-gray-50 border border-line rounded-lg p-3 text-[12px] font-medium text-ink-muted text-center">
                    생성 버튼을 눌러주세요
                  </div>
                ) : (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-[12px] font-medium text-ink leading-[1.8] mb-2">
                      {selectedRecord}
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: selectedRecord.length > 500 ? '#EF4444' : '#059669' }}
                      >
                        {selectedRecord.length}자 {selectedRecord.length > 500 && '⚠️ 초과'}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigator.clipboard.writeText(selectedRecord)}
                          className="px-2 py-1 bg-white text-ink-secondary border border-line rounded text-[10px] font-bold hover:bg-gray-50 transition-colors"
                        >
                          📋 복사
                        </button>
                        <button
                          onClick={() => {
                            const subject = (selectedData as any)?.subject
                            const grade = (selectedData as any)?.grade || selGrade
                            if (subject && selectedRecord) applyToRecord(grade, subject, selectedRecord)
                          }}
                          className="px-2 py-1 text-white rounded text-[10px] font-bold transition-all"
                          style={{ background: THEME.accent, boxShadow: `0 2px 4px ${THEME.accentShadow}` }}
                        >
                          📥 생기부 반영
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 피드백 작성 요청 버튼 */}
              <div className="border-t border-line pt-2.5">
                <button
                  onClick={() => selItem.type === 'topic' ? onEditTopic(selItem.id) : onEditBook(selItem.id)}
                  className="w-full px-3 py-2.5 bg-gray-50 text-ink border border-line rounded-lg text-[12px] font-semibold text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <span>💬 {selItem.type === 'topic' ? '탐구주제' : '독서리스트'} 탭에서 피드백 작성하기</span>
                  <span className="text-ink-muted">→</span>
                </button>
              </div>

              {/* AI 보완점 */}
              {selectedSuggestion && selectedRecord && (
                <div className="border-t border-line pt-2.5">
                  <div className="text-[12px] font-extrabold text-ink mb-2">🔍 AI 보완점 분석</div>

                  {/* 강점 */}
                  <div className="mb-2.5">
                    <div className="text-[10px] font-extrabold text-green-600 mb-1.5">💪 강점</div>
                    {selectedSuggestion.strengths.map((s, i) => (
                      <div
                        key={i}
                        className="text-[11px] font-medium text-ink leading-[1.6] px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-md mb-1"
                      >
                        ✓ {s}
                      </div>
                    ))}
                  </div>

                  {/* 개선 필요 */}
                  <div className="mb-2.5">
                    <div className="text-[10px] font-extrabold text-red-500 mb-1.5">⚡ 개선 필요</div>
                    {selectedSuggestion.improvements.map((s, i) => (
                      <div
                        key={i}
                        className="text-[11px] font-medium text-ink leading-[1.6] px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-md mb-1"
                      >
                        △ {s}
                      </div>
                    ))}
                  </div>

                  {/* 전공 연계 */}
                  <div>
                    <div className="text-[10px] font-extrabold mb-1.5" style={{ color: THEME.accent }}>
                      🎓 전공 연계
                    </div>
                    <div
                      className="text-[11px] font-medium text-ink leading-[1.6] px-2.5 py-1.5 rounded-md"
                      style={{
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}60`,
                      }}
                    >
                      🎓 {selectedSuggestion.connection}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ==================== 오른쪽: 실제 생기부 ==================== */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="px-4 py-3 border-b border-line flex-shrink-0 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="text-[14px] font-extrabold text-ink tracking-tight">📋 생기부</div>
            <div className="flex gap-1">
              {GRADE_LIST.map(g => {
                const isActive = selGrade === g
                return (
                  <button
                    key={g}
                    onClick={() => setSelGrade(g)}
                    className="px-3 py-1 rounded-full text-[11px] font-bold transition-all border"
                    style={{
                      background: isActive ? '#1a1a1a' : '#fff',
                      color: isActive ? '#fff' : '#6B7280',
                      borderColor: isActive ? '#1a1a1a' : '#E5E7EB',
                    }}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          </div>
          <button
            onClick={() => setFullScreen(true)}
            className="px-3 py-1.5 bg-white border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
            style={{ color: THEME.accent, borderColor: THEME.accent }}
          >
            ⛶ 전체화면
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <GradeSheet grade={selGrade} />
        </div>
      </div>

      {/* ==================== 전체화면 모달 ==================== */}
      {fullScreen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="bg-white rounded-2xl flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            style={{ width: '90vw', maxWidth: 980, maxHeight: '92vh' }}
          >
            <div className="px-6 py-4 border-b border-line flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[17px] font-extrabold text-ink tracking-tight">📋 학교생활기록부</div>
                <div className="text-[12px] font-medium text-ink-secondary mt-0.5">
                  {student?.name} · 고1 ~ 고3 전체
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                  style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                >
                  🖨️ PDF 저장 / 인쇄
                </button>
                <button
                  onClick={() => setFullScreen(false)}
                  className="px-4 py-2 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-7">
              <div className="text-center text-[22px] font-extrabold text-ink mb-3 tracking-tight">
                🎓 학교생활기록부
              </div>
              <div className="text-[13px] font-semibold text-ink-secondary mb-6 text-center pb-4 border-b border-line">
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