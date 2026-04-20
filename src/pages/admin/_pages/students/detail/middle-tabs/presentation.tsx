import { useState, useRef, useCallback } from 'react'

// 🌱 중등 초록 테마
const THEME = {
  accent: '#059669',
  accentDark: '#065F46',
  accentBg: '#ECFDF5',
  accentBorder: '#6EE7B7',
  accentShadow: 'rgba(16, 185, 129, 0.15)',
  gradient: 'linear-gradient(135deg, #065F46, #10B981)',
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

const INITIAL_RECORDS = [
  {
    id: 1,
    school: '인천하늘고',
    year: 2025,
    problemTitle: '문제 1번',
    subject: '인문사회',
    startedAt: '2025.04.01',
    lastUpdated: '2025.04.14',
    pdfMock: `[제시문]\n\n(가)\n민주주의(democracy)는 '민중'이라는 뜻의 고대 그리스어인 데모스(demos)와 그라토스(kratos)가 합해져서 생겨난 말이다. 이는 민주에 의한 지배가 아니라 한 사람이나 소수가 지배하는 것이 아니라 다수의 민중이 지배한다는 의미이다.\n\n(나)\n아테네의 철학자 플라톤은 이데아 혹은 형상에 관한 지식을 가진 소수의 능력을 갖춘 철학자가 정치를 할 때 진정한 이상 국가가 실현된다고 주장하였다.\n\n(다)\n[그림 제시문 - 소득 불평등 관련 그래프]\n소득을 가진 모든 개인이 가장행렬에 줄 선다. 이 가장행렬에 줄 서는 사람들의 키는 그 사람의 소득 크기에 비례한다.`,
    questions: [
      {
        id: 1,
        text: '제시문 (가)와 (나)를 바탕으로 민주주의와 엘리트주의의 공통점과 차이점을 설명하시오.',
        intent: ['제시문의 핵심 논지를 정확히 파악하는지 확인', '두 사상의 비교 분석 능력 평가'],
        answer: '민주주의는 다수의 민중이 지배하는 체제이고, 엘리트주의는 능력 있는 소수가 지배하는 체제입니다. 공통점은 둘 다 "통치의 정당성"을 추구한다는 점이고, 차이점은 정당성의 근거가 "민중의 의사"인지 "전문성"인지에 있습니다.',
        teacherFeedback: '핵심은 잘 잡았어요! 다만 제시문 (다)의 그래프를 함께 활용하면 더 풍부한 답변이 됩니다. 또한 "플라톤이 말한 철학자"의 구체적 정의를 언급하면 좋아요.',
        upgradedAnswer: '민주주의는 모든 시민이 동등하게 정치에 참여하는 체제이고, 플라톤이 주장한 엘리트주의는 이데아에 관한 지식을 가진 철학자가 통치하는 체제입니다. 공통점은 "공동선"을 목표로 한다는 점이며, 차이점은 민주주의가 "평등한 참여"를 중시한다면 엘리트주의는 "전문적 지혜"를 중시한다는 것입니다. 제시문 (다)의 그래프는 소득 불평등이 심화될수록 민주주의가 위협받을 수 있음을 보여줍니다.',
        finalFeedback: '',
        tails: [],
      },
      {
        id: 2,
        text: '제시문 (다)의 그래프가 보여주는 사회 현상을 설명하고, 이것이 민주주의에 미치는 영향을 논하시오.',
        intent: ['자료 해석 능력 평가', '사회 현상과 정치 체제의 연관성 파악 능력 확인'],
        answer: '그래프는 소득 불평등을 사람의 키 높이로 시각화한 것입니다. 상위 1%의 소득이 나머지를 압도적으로 능가하는 모습을 보여줍니다.',
        teacherFeedback: '',
        upgradedAnswer: '',
        finalFeedback: '',
        tails: [],
      },
    ],
  },
  {
    id: 2,
    school: '인천하늘고',
    year: 2025,
    problemTitle: '문제 2번',
    subject: '영어 지문',
    startedAt: '2025.04.10',
    lastUpdated: '2025.04.12',
    pdfMock: `[English Passage]\n\nMaybe a few were talking about it around here.\nNow, there is no more potential here...\n\nThe landscaper certainly was doing great in sales.\nA couple more won't hurt.\n\nProfits and sales are doing great, gave a few workers a bonus...\n\nWe need more cows.\n\nLater that year...`,
    questions: [
      {
        id: 1,
        text: '영어 제시문이 보여주는 경제적 현상을 요약하고, 이것이 지속 가능한 발전과 어떤 관련이 있는지 설명하시오.',
        intent: ['영어 독해 능력 및 핵심 내용 파악 능력 평가', '경제 개념과 환경의 연관성 이해 확인'],
        answer: '',
        teacherFeedback: '',
        upgradedAnswer: '',
        finalFeedback: '',
        tails: [],
      },
      {
        id: 2,
        text: '제시문에 나타난 사회 현상의 문제점을 지적하고, 해결 방안을 구체적으로 제시하시오.',
        intent: ['비판적 사고 능력 평가', '현실적인 문제 해결 방안 제시 능력 확인'],
        answer: '',
        teacherFeedback: '',
        upgradedAnswer: '',
        finalFeedback: '',
        tails: [],
      },
    ],
  },
  {
    id: 3,
    school: '민족사관고',
    year: 2025,
    problemTitle: '문제 1번',
    subject: '인문사회',
    startedAt: '2025.03.20',
    lastUpdated: '2025.03.25',
    pdfMock: `[제시문]\n\n(가)\n세계화란 국가 간 경계가 낮아지고 사람, 자본, 정보가 자유롭게 이동하는 현상이다. 이를 통해 경제적 효율성이 높아지지만, 문화적 다양성이 약화될 수 있다는 우려도 있다.\n\n(나)\n한 연구에 따르면 세계화 이후 다국적 기업이 개발도상국에 진출하면서 현지 경제가 성장했지만, 전통 문화와 지역 산업이 위기를 맞았다는 사례가 보고되었다.`,
    questions: [
      {
        id: 1,
        text: '제시문 (가)와 (나)를 바탕으로 세계화의 긍정적 효과와 부정적 효과를 균형 있게 논하시오.',
        intent: ['균형 잡힌 시각으로 현상을 분석하는 능력 평가', '세계화의 다양한 측면 이해 확인'],
        answer: '세계화는 경제적 효율성을 높이는 긍정적 효과가 있지만, 문화적 다양성과 지역 산업을 약화시키는 부정적 효과도 있습니다.',
        teacherFeedback: '기본 구조는 좋아요! 각각의 효과에 대한 구체적 사례를 추가하면 더 설득력 있는 답변이 됩니다.',
        upgradedAnswer: '',
        finalFeedback: '',
        tails: [],
      },
    ],
  },
]

const AI_TAIL_SUGGESTIONS = [
  '본인의 주장에 대한 반대 의견에 어떻게 대답하시겠어요?',
  '제시문의 관점과 현재 한국 사회를 연결하면 어떤 시사점이 있나요?',
  '만약 본인이 정책 결정자라면 어떤 선택을 하겠어요?',
]

export default function MiddlePresentationTab({ student }: { student: any }) {
  const [records, setRecords] = useState(INITIAL_RECORDS)
  const [selRecord, setSelRecord] = useState<any>(INITIAL_RECORDS[0])
  const [selQIdx, setSelQIdx] = useState(0)
  const [filterSchool, setFilterSchool] = useState<string>('all')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [teacherFbText, setTeacherFbText] = useState('')
  const [finalFbText, setFinalFbText] = useState('')
  const [newTailText, setNewTailText] = useState('')

  const [showAiTailModal, setShowAiTailModal] = useState(false)
  const [aiTailLoading, setAiTailLoading] = useState(false)
  const [selectedAiTails, setSelectedAiTails] = useState<number[]>([])

  const [leftWidth, setLeftWidth] = useState(45)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDragStart = useCallback(() => { isDragging.current = true }, [])
  const handleDragEnd = useCallback(() => { isDragging.current = false }, [])
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setLeftWidth(Math.min(70, Math.max(25, pct)))
  }, [])

  const getQStep = (q: any) => {
    if (!q.answer) return 1
    if (!q.teacherFeedback) return 2
    if (!q.upgradedAnswer) return 3
    if (!q.finalFeedback) return 4
    return 5
  }

  const getProblemStatus = (r: any) => {
    const total = r.questions.length
    const done = r.questions.filter((q: any) => q.finalFeedback).length
    const inProgress = r.questions.filter((q: any) => q.answer && !q.finalFeedback).length
    const notStarted = r.questions.filter((q: any) => !q.answer).length
    if (done === total) return { label: '✓ 완료', color: THEME.accent, bg: THEME.accentBg, border: THEME.accentBorder }
    if (inProgress > 0) return { label: '⏳ 진행중', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' }
    if (notStarted === total) return { label: '○ 시작전', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' }
    return { label: '진행중', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' }
  }

  const countFeedbacks = (r: any) =>
    r.questions.filter((q: any) => q.teacherFeedback || q.finalFeedback).length

  const selectRecord = (r: any) => {
    setSelRecord({ ...r })
    setSelQIdx(0)
    const firstQ = r.questions[0]
    setTeacherFbText(firstQ?.teacherFeedback || '')
    setFinalFbText(firstQ?.finalFeedback || '')
  }

  const selectQuestion = (idx: number) => {
    setSelQIdx(idx)
    const q = selRecord?.questions[idx]
    setTeacherFbText(q?.teacherFeedback || '')
    setFinalFbText(q?.finalFeedback || '')
  }

  const updateQuestion = (patch: any) => {
    if (!selRecord) return
    const updatedQuestions = selRecord.questions.map((q: any, i: number) =>
      i === selQIdx ? { ...q, ...patch } : q
    )
    const updatedRecord = { ...selRecord, questions: updatedQuestions, lastUpdated: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').slice(0, -1) }
    setRecords(prev => prev.map(r => r.id === selRecord.id ? updatedRecord : r))
    setSelRecord(updatedRecord)
  }

  const sendTeacherFeedback = () => {
    if (!teacherFbText.trim()) return
    updateQuestion({ teacherFeedback: teacherFbText })
  }

  const sendFinalFeedback = () => {
    if (!finalFbText.trim()) return
    updateQuestion({ finalFeedback: finalFbText })
  }

  const editTeacherFeedback = () => {
    const q = selRecord?.questions[selQIdx]
    setTeacherFbText(q?.teacherFeedback || '')
    updateQuestion({ teacherFeedback: '' })
  }

  const editFinalFeedback = () => {
    const q = selRecord?.questions[selQIdx]
    setFinalFbText(q?.finalFeedback || '')
    updateQuestion({ finalFeedback: '' })
  }

  const addTail = (text: string) => {
    if (!text.trim()) return
    const q = selRecord?.questions[selQIdx]
    const newTail = { text, answer: '' }
    updateQuestion({ tails: [...(q.tails || []), newTail] })
    setNewTailText('')
  }

  const removeTail = (idx: number) => {
    const q = selRecord?.questions[selQIdx]
    const newTails = [...(q.tails || [])].filter((_: any, i: number) => i !== idx)
    updateQuestion({ tails: newTails })
  }

  const openAiTailModal = () => {
    setShowAiTailModal(true)
    setAiTailLoading(true)
    setSelectedAiTails([])
    setTimeout(() => setAiTailLoading(false), 1200)
  }

  const deliverAiTails = () => {
    if (selectedAiTails.length === 0) return
    const q = selRecord?.questions[selQIdx]
    const newTails = selectedAiTails.map(i => ({ text: AI_TAIL_SUGGESTIONS[i], answer: '' }))
    updateQuestion({ tails: [...(q.tails || []), ...newTails] })
    setShowAiTailModal(false)
    setSelectedAiTails([])
  }

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
  }
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#E5E7EB'
    e.target.style.boxShadow = 'none'
  }

  const schools = Array.from(new Set(records.map(r => r.school)))
  const filteredRecords = filterSchool === 'all' ? records : records.filter(r => r.school === filterSchool)
  const selQ = selRecord?.questions[selQIdx]

  return (
    <div
      ref={containerRef}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      className="flex gap-3 h-full overflow-hidden"
    >

      {/* ==================== 왼쪽 목록 ==================== */}
      <div
        className="flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-300"
        style={{ width: sidebarCollapsed ? '60px' : '320px' }}
      >
        {sidebarCollapsed ? (
          /* 접힌 상태 */
          <div className="flex flex-col items-center py-3 h-full">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:bg-gray-50 mb-3"
              style={{ color: THEME.accent }}
              title="목록 펼치기"
            >
              <span className="text-lg">▶</span>
            </button>

            <div className="w-8 h-px bg-line mb-3" />

            <div className="flex-1 overflow-y-auto w-full flex flex-col items-center gap-1.5 px-2">
              {filteredRecords.map(r => {
                const isSelected = selRecord?.id === r.id
                return (
                  <button
                    key={r.id}
                    onClick={() => selectRecord(r)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-extrabold transition-all flex-shrink-0"
                    style={{
                      background: isSelected ? THEME.accent : THEME.accentBg,
                      color: isSelected ? '#fff' : THEME.accentDark,
                      border: `1px solid ${isSelected ? THEME.accent : THEME.accentBorder + '60'}`,
                      boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                    }}
                    title={`${r.school} · ${r.problemTitle}`}
                  >
                    {r.school[0]}
                  </button>
                )
              })}
            </div>

            <div className="w-8 h-px bg-line mt-2 mb-2" />
            <div
              className="text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ color: THEME.accent, background: THEME.accentBg }}
            >
              {records.length}
            </div>
          </div>
        ) : (
          /* 펼친 상태 */
          <>
            <div className="px-4 py-3 border-b border-line flex-shrink-0 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-extrabold text-ink tracking-tight">📄 제시문 면접 기록</div>
                <div className="text-[11px] font-medium text-ink-secondary mt-1">
                  총 <span className="font-bold" style={{ color: THEME.accent }}>{records.length}개</span> 문제
                </div>
              </div>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:bg-gray-100 hover:text-ink transition-colors flex-shrink-0"
                title="목록 접기"
              >
                <span className="text-base">◀</span>
              </button>
            </div>

            <div className="px-3 py-2.5 border-b border-line flex-shrink-0">
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setFilterSchool('all')}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                  style={{
                    borderColor: filterSchool === 'all' ? THEME.accent : '#E5E7EB',
                    background: filterSchool === 'all' ? THEME.accentBg : '#fff',
                    color: filterSchool === 'all' ? THEME.accentDark : '#6B7280',
                  }}
                >
                  전체
                </button>
                {schools.map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterSchool(s)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                    style={{
                      borderColor: filterSchool === s ? THEME.accent : '#E5E7EB',
                      background: filterSchool === s ? THEME.accentBg : '#fff',
                      color: filterSchool === s ? THEME.accentDark : '#6B7280',
                    }}
                  >
                    🏫 {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-10 text-ink-muted">
                  <div className="text-3xl mb-2">📄</div>
                  <div className="text-[12px] font-medium">기록이 없어요</div>
                </div>
              ) : filteredRecords.map(r => {
                const isSelected = selRecord?.id === r.id
                const status = getProblemStatus(r)
                const fbCount = countFeedbacks(r)
                return (
                  <button
                    key={r.id}
                    onClick={() => selectRecord(r)}
                    className="w-full rounded-xl px-3.5 py-3 mb-1.5 text-left transition-all"
                    style={{
                      border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                      background: isSelected ? THEME.accentBg : '#fff',
                      boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-base">🏫</span>
                      <div
                        className="text-[13px] font-extrabold tracking-tight flex-1"
                        style={{ color: isSelected ? THEME.accentDark : '#1a1a1a' }}
                      >
                        {r.school}
                      </div>
                      <span className="text-[10px] font-bold text-ink-muted">{r.year}</span>
                    </div>
                    <div className="text-[12px] font-semibold text-ink mb-1">
                      📄 {r.problemTitle}
                    </div>
                    <div className="text-[10px] font-medium text-ink-muted mb-2">
                      {r.subject} · {r.questions.length}문항
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: status.color,
                          background: status.bg,
                          border: `1px solid ${status.border}60`,
                        }}
                      >
                        {status.label}
                      </span>
                      {fbCount > 0 && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color: THEME.accent, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                        >
                          💬 피드백 {fbCount}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-medium text-ink-muted mt-1.5">
                      📅 최근수정 {r.lastUpdated}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ==================== 오른쪽 상세 ==================== */}
      {!selRecord ? (
        <div className="flex-1 bg-white border border-line rounded-2xl flex items-center justify-center shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-center text-ink-muted">
            <div className="text-4xl mb-2">📄</div>
            <div className="text-[14px] font-bold text-ink-secondary">기록을 선택해주세요</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">

          {/* 🆕 헤더 - 1줄로 압축 */}
          <div className="px-4 py-2.5 border-b border-line flex-shrink-0 flex items-center gap-2 flex-wrap">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all hover:-translate-y-px"
                style={{
                  color: THEME.accent,
                  background: '#fff',
                  border: `1px solid ${THEME.accent}`,
                }}
                title="목록 펼치기"
              >
                📚 기록
              </button>
            )}

            <div className="text-[14px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
              <span>🏫</span>
              <span>{selRecord.school}</span>
              <span className="text-ink-muted font-medium">·</span>
              <span>📄 {selRecord.problemTitle}</span>
            </div>

            <span className="text-[10px] font-semibold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
              📅 {selRecord.year}
            </span>
            <span className="text-[10px] font-semibold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
              {selRecord.subject}
            </span>

            {selRecord.questions.length > 1 && (
              <div className="flex gap-1 ml-auto">
                {selRecord.questions.map((q: any, i: number) => {
                  const isActive = selQIdx === i
                  const hasAnswer = !!q.answer
                  const hasFinalFb = !!q.finalFeedback
                  return (
                    <button
                      key={i}
                      onClick={() => selectQuestion(i)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all whitespace-nowrap"
                      style={{
                        background: isActive ? THEME.accent : '#fff',
                        color: isActive ? '#fff' : '#6B7280',
                        borderColor: isActive ? THEME.accent : '#E5E7EB',
                        boxShadow: isActive ? `0 2px 6px ${THEME.accentShadow}` : 'none',
                      }}
                    >
                      Q{i + 1} {hasFinalFb ? '✓' : hasAnswer ? '⏳' : '○'}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 분할 컨텐츠 */}
          <div className="flex flex-1 overflow-hidden">

            {/* 왼쪽: 제시문 */}
            <div
              className="overflow-y-auto px-5 py-4 bg-[#FAFAFA] flex-shrink-0"
              style={{ width: `${leftWidth}%` }}
            >
              <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">
                📖 제시문
              </div>
              <div
                className="bg-white border border-line rounded-xl px-5 py-4 text-[13px] text-ink leading-[2] whitespace-pre-line"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {selRecord.pdfMock}
              </div>
            </div>

            {/* 드래그 핸들 */}
            <div
              onMouseDown={handleDragStart}
              className="w-1 bg-line cursor-col-resize flex-shrink-0 flex items-center justify-center transition-colors hover:bg-[#6EE7B7]"
            >
              <div className="w-0.5 h-8 bg-ink-muted rounded-full" />
            </div>

            {/* 오른쪽: 질문 답변 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

              {/* 🆕 질문 + 의도 (2단 레이아웃) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  className="rounded-xl px-4 py-3"
                  style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: THEME.accent }}>
                    📌 문제 {selQIdx + 1}
                  </div>
                  <div className="text-[13.5px] font-bold leading-[1.6]" style={{ color: THEME.accentDark }}>
                    {selQ?.text}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">
                    💡 질문 의도
                  </div>
                  <ul className="pl-4">
                    {(selQ?.intent || []).map((item: string, i: number) => (
                      <li key={i} className="text-[12px] font-medium text-amber-800 leading-[1.6] list-disc">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 5단계 진행 */}
              <div className="bg-white border border-line rounded-xl px-4 py-3">
                <div className="flex">
                  {STEP_LABELS.map((label, i) => {
                    const qStep = getQStep(selQ)
                    const stepNum = i + 1
                    const isDone = stepNum < qStep
                    const isOn = stepNum === qStep
                    const active = isDone || isOn
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                        {i < 4 && (
                          <div
                            className="absolute top-[11px] left-[55%] w-[90%] h-px"
                            style={{ background: isDone ? THEME.accent : '#E5E7EB' }}
                          />
                        )}
                        <div
                          className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-extrabold z-10 relative border"
                          style={{
                            background: active ? THEME.accent : '#F3F4F6',
                            color: active ? '#fff' : '#9CA3AF',
                            borderColor: active ? THEME.accent : '#E5E7EB',
                          }}
                        >
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div
                          className="text-[10px] font-bold whitespace-nowrap"
                          style={{ color: active ? THEME.accentDark : '#9CA3AF' }}
                        >
                          {label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Step 1 */}
              <div className="bg-white border border-line rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 1</span>
                  <span className="text-[11px] font-bold text-ink-secondary">👤 학생 첫 답변</span>
                </div>
                {selQ?.answer ? (
                  <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                    {selQ.answer}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg px-3 py-4 text-[12px] font-medium text-ink-muted text-center">
                    ⏳ 학생이 아직 답변하지 않았어요
                  </div>
                )}
              </div>

              {/* Step 2 */}
              {selQ?.answer && (
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span
                      className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                      style={{ background: THEME.accent }}
                    >
                      Step 2
                    </span>
                    <span className="text-[11px] font-bold text-ink-secondary">💬 선생님 1차 피드백</span>
                    {selQ.teacherFeedback && (
                      <button
                        onClick={editTeacherFeedback}
                        className="ml-auto px-2 py-0.5 bg-white text-ink-secondary border border-line rounded text-[10px] font-bold hover:bg-gray-50 transition-colors"
                      >
                        ✏️ 수정
                      </button>
                    )}
                  </div>
                  {selQ.teacherFeedback ? (
                    <div
                      className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8]"
                      style={{
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}60`,
                        color: THEME.accentDark,
                      }}
                    >
                      {selQ.teacherFeedback}
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={teacherFbText}
                        onChange={e => setTeacherFbText(e.target.value)}
                        placeholder="학생 답변에 대한 피드백을 작성해주세요..."
                        rows={3}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                        onFocus={handleTextareaFocus}
                        onBlur={handleTextareaBlur}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={sendTeacherFeedback}
                          disabled={!teacherFbText.trim()}
                          className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                          style={{
                            background: teacherFbText.trim() ? THEME.accent : '#E5E7EB',
                            color: teacherFbText.trim() ? '#fff' : '#9CA3AF',
                            boxShadow: teacherFbText.trim() ? `0 2px 6px ${THEME.accentShadow}` : 'none',
                          }}
                        >
                          📤 피드백 전달
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 3 */}
              {selQ?.teacherFeedback && (
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 3</span>
                    <span className="text-[11px] font-bold text-ink-secondary">👤 학생 업그레이드 답변</span>
                  </div>
                  {selQ.upgradedAnswer ? (
                    <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                      {selQ.upgradedAnswer}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-4 text-[12px] font-medium text-amber-700 text-center">
                      ⏳ 학생이 업그레이드 답변 작성중이에요
                    </div>
                  )}
                </div>
              )}

              {/* Step 4 */}
              {selQ?.upgradedAnswer && (
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span
                      className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                      style={{ background: THEME.accent }}
                    >
                      Step 4
                    </span>
                    <span className="text-[11px] font-bold text-ink-secondary">💬 선생님 최종 피드백</span>
                    {selQ.finalFeedback && (
                      <button
                        onClick={editFinalFeedback}
                        className="ml-auto px-2 py-0.5 bg-white text-ink-secondary border border-line rounded text-[10px] font-bold hover:bg-gray-50 transition-colors"
                      >
                        ✏️ 수정
                      </button>
                    )}
                  </div>
                  {selQ.finalFeedback ? (
                    <div
                      className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8]"
                      style={{
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}60`,
                        color: THEME.accentDark,
                      }}
                    >
                      {selQ.finalFeedback}
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={finalFbText}
                        onChange={e => setFinalFbText(e.target.value)}
                        placeholder="업그레이드 답변에 대한 최종 피드백을 작성해주세요..."
                        rows={3}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                        onFocus={handleTextareaFocus}
                        onBlur={handleTextareaBlur}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={sendFinalFeedback}
                          disabled={!finalFbText.trim()}
                          className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                          style={{
                            background: finalFbText.trim() ? THEME.accent : '#E5E7EB',
                            color: finalFbText.trim() ? '#fff' : '#9CA3AF',
                            boxShadow: finalFbText.trim() ? `0 2px 6px ${THEME.accentShadow}` : 'none',
                          }}
                        >
                          📤 최종 피드백 전달
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 5 꼬리질문 */}
              {selQ?.finalFeedback && (
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                    <span
                      className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                      style={{ background: THEME.accent }}
                    >
                      Step 5
                    </span>
                    <span className="text-[11px] font-bold text-ink-secondary">🔗 꼬리질문</span>
                    <span className="ml-auto text-[10px] font-bold text-ink-muted">
                      {selQ.tails?.length || 0}개
                    </span>
                  </div>

                  {selQ.tails && selQ.tails.length > 0 && (
                    <div className="mb-3">
                      {selQ.tails.map((t: any, i: number) => (
                        <div key={i} className="mb-2">
                          <div
                            className="rounded-lg px-3 py-2.5 flex items-start gap-2 mb-1.5"
                            style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                          >
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ color: '#fff', background: THEME.accent }}
                            >
                              꼬리{i + 1}
                            </span>
                            <span className="text-[12.5px] font-medium flex-1 leading-[1.6]" style={{ color: THEME.accentDark }}>
                              {typeof t === 'string' ? t : t.text}
                            </span>
                            <button
                              onClick={() => removeTail(i)}
                              className="text-ink-muted hover:text-red-500 text-xs flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                          {typeof t !== 'string' && t.answer && (
                            <div className="ml-6 bg-gray-50 border border-line rounded-md px-3 py-2">
                              <div className="text-[10px] font-bold text-ink-muted mb-1">👤 학생 답변</div>
                              <div className="text-[12px] font-medium text-ink leading-[1.7]">{t.answer}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mb-2">
                    <input
                      value={newTailText}
                      onChange={e => setNewTailText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTail(newTailText)}
                      placeholder="꼬리질문을 직접 추가..."
                      className="flex-1 h-9 border border-line rounded-lg px-3 text-[12px] font-medium outline-none transition-all placeholder:text-ink-muted"
                      onFocus={e => {
                        e.target.style.borderColor = THEME.accent
                        e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = '#E5E7EB'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                    <button
                      onClick={() => addTail(newTailText)}
                      disabled={!newTailText.trim()}
                      className="h-9 px-3 text-white rounded-lg text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                      style={{
                        background: newTailText.trim() ? THEME.accent : '#E5E7EB',
                        color: newTailText.trim() ? '#fff' : '#9CA3AF',
                      }}
                    >
                      ➕ 추가
                    </button>
                  </div>

                  <button
                    onClick={openAiTailModal}
                    className="w-full h-9 bg-white border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                    style={{ color: THEME.accent, borderColor: THEME.accent }}
                  >
                    ✨ AI 꼬리질문 제안 받기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI 꼬리질문 모달 */}
      {showAiTailModal && (
        <div
          onClick={() => setShowAiTailModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[500px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-[18px] font-extrabold text-ink mb-1">✨ AI 꼬리질문 제안</div>
            <div className="text-[12px] font-medium text-ink-secondary mb-5">
              제시문과 학생 답변을 분석해서 추천하는 꼬리질문이에요.
            </div>

            {aiTailLoading ? (
              <div className="text-center py-10 text-ink-muted text-[13px] font-medium">
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                AI가 꼬리질문을 생성 중이에요...
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {AI_TAIL_SUGGESTIONS.map((s, i) => {
                  const isSelected = selectedAiTails.includes(i)
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedAiTails(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                      className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-left transition-all"
                      style={{
                        border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                        background: isSelected ? THEME.accentBg : '#fff',
                        boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                        style={{
                          border: `1.5px solid ${isSelected ? THEME.accent : '#D1D5DB'}`,
                          background: isSelected ? THEME.accent : '#fff',
                        }}
                      >
                        {isSelected && <span className="text-[11px] text-white font-bold">✓</span>}
                      </div>
                      <span
                        className="text-[13px] font-medium leading-[1.6]"
                        style={{ color: isSelected ? THEME.accentDark : '#1a1a1a' }}
                      >
                        {s}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowAiTailModal(false)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={deliverAiTails}
                disabled={selectedAiTails.length === 0 || aiTailLoading}
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                style={{
                  background: selectedAiTails.length > 0 ? THEME.accent : '#E5E7EB',
                  color: selectedAiTails.length > 0 ? '#fff' : '#9CA3AF',
                  boxShadow: selectedAiTails.length > 0 ? `0 4px 12px ${THEME.accentShadow}` : 'none',
                }}
              >
                📤 {selectedAiTails.length}개 전달
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}