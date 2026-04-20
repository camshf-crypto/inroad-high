import { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

// 파랑 테마
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

const UNIVERSITIES = [
  { id: 1, name: '서울대학교', dept: '컴퓨터공학부' },
  { id: 2, name: '연세대학교', dept: '컴퓨터과학과' },
  { id: 3, name: '고려대학교', dept: '컴퓨터학과' },
  { id: 4, name: '한양대학교', dept: '소프트웨어학부' },
  { id: 5, name: '성균관대학교', dept: '소프트웨어학과' },
  { id: 6, name: '중앙대학교', dept: '소프트웨어학부' },
]

const EVAL_CRITERIA: Record<number, { name: string; max: number; standard: number }[]> = {
  1: [
    { name: '논리력', max: 100, standard: 85 },
    { name: '전공이해도', max: 100, standard: 90 },
    { name: '창의력', max: 100, standard: 80 },
    { name: '표현력', max: 100, standard: 75 },
    { name: '인성', max: 100, standard: 70 },
  ],
  2: [
    { name: '전공적합성', max: 100, standard: 85 },
    { name: '인성', max: 100, standard: 80 },
    { name: '논리력', max: 100, standard: 75 },
    { name: '표현력', max: 100, standard: 70 },
  ],
  3: [
    { name: '전공이해도', max: 100, standard: 85 },
    { name: '논리력', max: 100, standard: 80 },
    { name: '창의력', max: 100, standard: 75 },
    { name: '인성', max: 100, standard: 70 },
    { name: '표현력', max: 100, standard: 65 },
    { name: '의사소통', max: 100, standard: 80 },
  ],
  4: [
    { name: '전공적합성', max: 100, standard: 80 },
    { name: '인성', max: 100, standard: 75 },
    { name: '표현력', max: 100, standard: 70 },
  ],
  5: [
    { name: '전공이해도', max: 100, standard: 85 },
    { name: '논리력', max: 100, standard: 80 },
    { name: '인성', max: 100, standard: 75 },
    { name: '의사소통', max: 100, standard: 70 },
  ],
  6: [
    { name: '전공적합성', max: 100, standard: 80 },
    { name: '인성', max: 100, standard: 75 },
    { name: '논리력', max: 100, standard: 70 },
    { name: '표현력', max: 100, standard: 65 },
    { name: '창의력', max: 100, standard: 60 },
  ],
}

const STUDENT_SCORES: Record<string, number[]> = {
  '1-1': [72, 80, 65, 70, 75],
  '1-2': [60, 70, 55, 65, 70],
  '2-1': [75, 80, 70, 65],
  '3-1': [80, 75, 70, 65, 60, 75],
}

const AI_ANALYSIS: Record<string, any> = {
  '1-1': {
    evalCriteria: '서울대학교 면접에서는 지원자의 사고의 깊이와 변화의 흔적을 중시합니다. 질문의 목적은 지원자가 전공과 관련된 경험을 통해 어떻게 사고가 확장되었는지를 확인하는 것입니다.',
    scores: [
      { label: '인성', score: 24, max: 30, desc: '자신의 탐구 과정을 통해 얻은 통찰을 성찰하고 있다.' },
      { label: '전공적합성', score: 40, max: 50, desc: '정보 전달 방식에 대한 탐구가 전공과의 핵심 역량과 연결됨을 강조했다.' },
      { label: '의사소통역량', score: 16, max: 20, desc: '설문조사와 데이터를 바탕으로 발표를 통해 논리를 전개했다.' },
    ],
    summary: '답변에서 전공적합성이 상대적으로 잘 드러났으며, 정보 전달 방식의 탐구가 전공의 주요 역량과 연결되었다. 그러나 수업 내용과의 직접적인 연관성이 부족하여 전공 학습 내용과의 구체적인 연결이 아쉬운 부분이다.',
    strengths: [
      '구체적인 탐구 경험을 잘 설명하였다.',
      '스토리텔링 방식과 정보 전달 방식에 대한 탐구가 전공과의 연결성을 명확히 했다.',
      '설문조사와 데이터를 활용한 논리 전개가 의사소통 역량을 잘 드러냈다.',
    ],
    improvements: [
      '수업 내용과의 직접적인 연관성이 부족하다.',
      '전공의 구체적인 학습 내용과의 연결이 명확하지 않다.',
      '전공 탐색이나 진로 고민과의 직접적인 연결 설명이 미흡하다.',
    ],
    tailSuggestions: [
      '심화수학 시간에 진행한 활동이 언론정보학과의 학습 내용과 어떻게 직접적으로 연결된다고 생각하나요?',
      '설문 조사 결과가 전공 선택에 어떤 영향을 주었는지 구체적으로 설명할 수 있나요?',
      '정보 전달 방식의 탐구 과정에서 어떤 어려움이 있었고, 이를 어떻게 극복했는지 설명해주세요.',
    ],
    second: {
      beforeDistribution: [
        { factorCode: 'F01', factorName: '인성', distribution: 30, evidence: '탐구 과정에서 성찰하는 모습이 드러남' },
        { factorCode: 'F02', factorName: '전공적합성', distribution: 50, evidence: '정보 전달 방식 탐구가 전공과 연결됨' },
        { factorCode: 'F03', factorName: '의사소통역량', distribution: 20, evidence: '데이터 기반 논리 전개' },
      ],
      afterDistribution: [
        { factorCode: 'F01', factorName: '인성', distribution: 25, evidence: '성찰은 있으나 구체적 사례 보완 필요' },
        { factorCode: 'F02', factorName: '전공적합성', distribution: 55, evidence: '전공 연결성이 더 명확해짐' },
        { factorCode: 'F03', factorName: '의사소통역량', distribution: 20, evidence: '논리 구조는 유지됨' },
      ],
      structureComment: '2차 답변은 전공적합성 측면에서 1차보다 연결성이 강화되었으나, 답변의 도입부에서 핵심 경험을 먼저 제시하는 구조가 아직 부족합니다. speechStructure 기준으로 보면 "경험 제시 → 의미 도출 → 전공 연결" 순서가 더 명확해야 하며, 연습 답변에서는 이 흐름에 맞게 문장 순서를 재정렬했습니다.',
      practiceAnswer: '저는 고등학교 2학년 때 데이터 저널리즘 프로젝트를 진행하면서 정보 전달 방식에 대해 깊이 고민하게 되었습니다. 설문조사 결과를 시각화하여 발표했을 때, 단순한 숫자보다 스토리텔링 방식이 청중에게 더 효과적으로 전달된다는 것을 경험했습니다. 이 경험을 통해 언론정보학과에서 배울 미디어 리터러시와 데이터 커뮤니케이션이 제가 탐구해 온 방향과 일치한다고 확신하게 되었습니다.',
    },
  },
}

const PAST_QUESTIONS: Record<number, any[]> = {
  1: [
    { id: 1, text: '본인의 전공 선택 동기와 관련된 구체적인 경험을 말해보세요.', type: '공통', answered: true, answer: '중학교 때 코딩 동아리에서 처음 프로그래밍을 접했고 문제를 논리적으로 해결하는 과정이 재미있었습니다.', prevFeedback: '', upgradedAnswer: '고등학교 2학년 때 데이터 저널리즘 프로젝트를 진행하면서 정보 전달 방식에 대해 깊이 고민하게 되었습니다.', finalFeedback: '', tails: [] },
    { id: 2, text: '가장 인상 깊었던 수업과 그 이유를 설명해주세요.', type: '공통', answered: true, answer: '고2 때 들은 인공지능 수업이 가장 인상 깊었습니다.', prevFeedback: '좋은 답변이에요! 더 구체적인 내용을 추가해보세요.', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 3, text: '팀 프로젝트에서 갈등이 생겼을 때 어떻게 해결했나요?', type: '인성', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 4, text: 'AI 기술의 윤리적 문제에 대해 어떻게 생각하시나요?', type: '전공', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  2: [
    { id: 1, text: '지원 학과에서 배우고 싶은 것이 무엇인가요?', type: '공통', answered: true, answer: '자연어 처리와 컴퓨터 비전을 깊이 공부하고 싶습니다.', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 2, text: '본인의 강점이 학과 공부에 어떻게 도움이 될까요?', type: '인성', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  3: [
    { id: 1, text: '전공 관련 최근 이슈에 대해 본인의 견해를 말해주세요.', type: '전공', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  4: [], 5: [], 6: [],
}

const TYPE_COLOR: Record<string, any> = {
  '공통': { bg: THEME.accentBg, color: THEME.accent, border: THEME.accentBorder },
  '전공': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '인성': { bg: '#FFF3E8', color: '#D97706', border: '#FDBA74' },
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

export default function PastTab({ student }: { student: any }) {
  const [selUniv, setSelUniv] = useState(UNIVERSITIES[0])
  const [selQ, setSelQ] = useState<any>(null)
  const [questions, setQuestions] = useState(PAST_QUESTIONS)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiData, setAiData] = useState<any>(null)
  const [aiTab, setAiTab] = useState<'first' | 'second'>('first')
  const [secondAiLoading, setSecondAiLoading] = useState(false)
  const [showTailModal, setShowTailModal] = useState(false)
  const [tailInput, setTailInput] = useState('')
  const [showAiTailModal, setShowAiTailModal] = useState(false)
  const [aiTailLoading, setAiTailLoading] = useState(false)
  const [aiTails, setAiTails] = useState<string[]>([])
  const [selectedAiTails, setSelectedAiTails] = useState<number[]>([])

  const curQuestions = questions[selUniv.id] || []

  const getStep = (q: any) => {
    if (!q.answered) return 0
    if (!q.prevFeedback) return 1
    if (!q.upgradedAnswer) return 2
    if (!q.finalFeedback) return 3
    return 4
  }

  const openAiAnalysis = (tab: 'first' | 'second' = 'first') => {
    setShowAiPanel(true)
    setAiTab(tab)
    if (tab === 'first') {
      setAiLoading(true)
      setAiData(null)
      setTimeout(() => {
        const key = `${selUniv.id}-${selQ?.id}`
        setAiData(AI_ANALYSIS[key] || null)
        setAiLoading(false)
      }, 1200)
    } else {
      setSecondAiLoading(true)
      setTimeout(() => {
        setSecondAiLoading(false)
      }, 1200)
    }
  }

  const sendFeedback = (type: 'first' | 'final') => {
    if (!selQ) return
    const key = type === 'first' ? String(selQ.id) : `${selQ.id}_final`
    const val = feedback[key] || ''
    if (!val.trim()) return
    if (type === 'first') {
      const updated = { ...questions, [selUniv.id]: questions[selUniv.id].map(q => q.id === selQ.id ? { ...q, prevFeedback: val } : q) }
      setQuestions(updated)
      setSelQ({ ...selQ, prevFeedback: val })
    } else {
      const updated = { ...questions, [selUniv.id]: questions[selUniv.id].map(q => q.id === selQ.id ? { ...q, finalFeedback: val } : q) }
      setQuestions(updated)
      setSelQ({ ...selQ, finalFeedback: val })
    }
    setFeedback(prev => ({ ...prev, [key]: '' }))
  }

  const addTail = () => {
    if (!tailInput.trim() || !selQ) return
    const updated = { ...questions, [selUniv.id]: questions[selUniv.id].map(q => q.id === selQ.id ? { ...q, tails: [...q.tails, tailInput.trim()] } : q) }
    setQuestions(updated)
    setSelQ({ ...selQ, tails: [...selQ.tails, tailInput.trim()] })
    setTailInput('')
    setShowTailModal(false)
  }

  const openAiTailModal = () => {
    setShowAiTailModal(true)
    setAiTailLoading(true)
    setAiTails([])
    setSelectedAiTails([])
    setTimeout(() => {
      const key = `${selUniv.id}-${selQ?.id}`
      setAiTails(AI_ANALYSIS[key]?.tailSuggestions || [])
      setAiTailLoading(false)
    }, 1200)
  }

  const deliverAiTails = () => {
    if (!selQ || selectedAiTails.length === 0) return
    const newTails = selectedAiTails.map(i => aiTails[i])
    const updated = { ...questions, [selUniv.id]: questions[selUniv.id].map(q => q.id === selQ.id ? { ...q, tails: [...q.tails, ...newTails] } : q) }
    setQuestions(updated)
    setSelQ({ ...selQ, tails: [...selQ.tails, ...newTails] })
    setShowAiTailModal(false)
    setAiTails([])
    setSelectedAiTails([])
  }

  const getRadarData = (univId: number, qId: number) => {
    const criteria = EVAL_CRITERIA[univId] || []
    const scores = STUDENT_SCORES[`${univId}-${qId}`] || criteria.map(() => 0)
    return criteria.map((c, i) => ({
      subject: c.name,
      standard: c.standard,
      student: scores[i] || 0,
      fullMark: 100,
    }))
  }

  const getBarData = (analysis: any) => {
    if (!analysis?.scores) return []
    return analysis.scores.map((s: any) => ({
      name: s.label,
      score: s.score,
      max: s.max,
      pct: Math.round((s.score / s.max) * 100),
    }))
  }

  const secondData = aiData?.second || null

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
  }
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#E5E7EB'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">

      {/* ==================== 대학 탭 ==================== */}
      <div className="flex gap-1.5 flex-wrap flex-shrink-0">
        {UNIVERSITIES.map(u => (
          <button
            key={u.id}
            onClick={() => { setSelUniv(u); setSelQ(null); setShowAiPanel(false); setAiData(null) }}
            className="px-4 py-1.5 rounded-full text-[12px] transition-all border"
            style={{
              background: selUniv.id === u.id ? THEME.accent : '#fff',
              color: selUniv.id === u.id ? '#fff' : '#6B7280',
              borderColor: selUniv.id === u.id ? THEME.accent : '#E5E7EB',
              fontWeight: selUniv.id === u.id ? 700 : 500,
              boxShadow: selUniv.id === u.id ? `0 2px 8px ${THEME.accentShadow}` : 'none',
            }}
          >
            🎓 {u.name}
          </button>
        ))}
      </div>

      {/* ==================== 메인 ==================== */}
      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* ==================== 왼쪽 질문 목록 ==================== */}
        <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-3 border-b border-line flex-shrink-0">
            <div className="text-[14px] font-extrabold text-ink tracking-tight">{selUniv.name}</div>
            <div className="text-[11px] font-semibold text-ink-secondary mt-0.5">{selUniv.dept}</div>
            <div className="text-[11px] font-medium text-ink-secondary mt-1.5">
              총 <span className="font-bold" style={{ color: THEME.accent }}>{curQuestions.length}개</span> ·
              답변완료 <span className="text-green-600 font-bold">{curQuestions.filter(q => q.answered).length}개</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {curQuestions.length === 0 ? (
              <div className="text-center py-10 text-ink-muted">
                <div className="text-3xl mb-2">📝</div>
                <div className="text-[12px] font-medium">기출문제가 없어요.</div>
              </div>
            ) : curQuestions.map((q, i) => {
              const tc = TYPE_COLOR[q.type] || TYPE_COLOR['공통']
              const isSelected = selQ?.id === q.id
              return (
                <button
                  key={q.id}
                  onClick={() => { setSelQ(q); setShowAiPanel(false); setAiData(null) }}
                  className="w-full rounded-xl px-3.5 py-3 mb-2 text-left transition-all"
                  style={{
                    border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                    background: isSelected ? THEME.accentBg : '#fff',
                    boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                  }}
                >
                  <div className="flex gap-1 mb-1.5 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: THEME.accentDark, background: '#fff', border: `1px solid ${THEME.accentBorder}60` }}
                    >
                      Q{i + 1}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}60` }}
                    >
                      {q.type}
                    </span>
                  </div>
                  <div className="text-[12px] font-semibold text-ink leading-[1.5] mb-1.5">{q.text}</div>
                  {q.answered ? (
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      ✓ {getStep(q)}/5단계
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      ⏳ 미답변
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ==================== 가운데 피드백 패널 ==================== */}
        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          {!selQ ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">🎓</div>
              <div className="text-[14px] font-bold text-ink-secondary">질문을 선택해주세요</div>
              <div className="text-[12px] font-medium">왼쪽에서 기출문제를 클릭하면 상세 내용을 볼 수 있어요</div>
            </div>
          ) : (
            <>
              {/* 헤더 */}
              <div className="px-5 py-4 border-b border-line flex-shrink-0">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="text-[14px] font-extrabold text-ink tracking-tight">
                      Q{curQuestions.findIndex(q => q.id === selQ.id) + 1}
                    </div>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{
                        background: TYPE_COLOR[selQ.type]?.bg,
                        color: TYPE_COLOR[selQ.type]?.color,
                        border: `1px solid ${TYPE_COLOR[selQ.type]?.border}60`,
                      }}
                    >
                      {selQ.type}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    {selQ.answered && (
                      <button
                        onClick={() => {
                          if (showAiPanel) { setShowAiPanel(false); setAiData(null) }
                          else openAiAnalysis('first')
                        }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border"
                        style={{
                          background: showAiPanel ? THEME.accent : THEME.accentBg,
                          color: showAiPanel ? '#fff' : THEME.accent,
                          borderColor: THEME.accent,
                          boxShadow: showAiPanel ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                        }}
                      >
                        ✨ AI 분석 {showAiPanel ? '닫기' : '보기'}
                      </button>
                    )}
                    <span
                      className="text-[11px] font-bold px-3 py-1 rounded-full"
                      style={{
                        background: selQ.answered ? '#ECFDF5' : '#FFF3E8',
                        color: selQ.answered ? '#059669' : '#D97706',
                        border: `1px solid ${selQ.answered ? '#6EE7B7' : '#FDBA74'}`,
                      }}
                    >
                      {selQ.answered ? '✓ 답변완료' : '⏳ 미답변'}
                    </span>
                  </div>
                </div>

                {/* 5단계 */}
                <div className="flex">
                  {STEP_LABELS.map((label, i) => {
                    const step = getStep(selQ)
                    const stepNum = i + 1
                    const isDone = stepNum < step
                    const isOn = stepNum === step
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                        {i < 4 && (
                          <div
                            className="absolute top-[11px] left-[55%] w-[90%] h-0.5 z-0"
                            style={{ background: isDone ? '#059669' : '#E5E7EB' }}
                          />
                        )}
                        <div
                          className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-extrabold z-10 relative"
                          style={{
                            background: isDone ? '#059669' : isOn ? THEME.accent : '#F3F4F6',
                            color: isDone || isOn ? '#fff' : '#9CA3AF',
                            border: `2px solid ${isDone ? '#059669' : isOn ? THEME.accent : '#E5E7EB'}`,
                          }}
                        >
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div
                          className="text-[10px] whitespace-nowrap"
                          style={{
                            color: isDone ? '#059669' : isOn ? THEME.accentDark : '#9CA3AF',
                            fontWeight: isOn ? 700 : 500,
                          }}
                        >
                          {label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 바디 */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

                {/* 질문 */}
                <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">📌 기출 질문</div>
                  <div className="text-[14px] font-bold text-ink leading-[1.6]">{selQ.text}</div>
                </div>

                {/* 히스토리 */}
                <div className="bg-white border border-line rounded-xl px-4 py-4">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-3">💬 답변 · 피드백 히스토리</div>
                  <div className="flex flex-col gap-4">

                    {/* Step 1 */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-extrabold text-white bg-ink-muted px-2 py-0.5 rounded-full">
                          Step 1
                        </span>
                        <span className="text-[11px] font-semibold text-ink-secondary">학생 첫 답변</span>
                      </div>
                      <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink leading-[1.8]">
                        {selQ.answered ? selQ.answer : <span className="text-ink-muted">아직 학생이 답변을 작성하지 않았어요.</span>}
                      </div>
                    </div>

                    {/* Step 2 */}
                    {selQ.answered && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                            style={{ background: THEME.accent }}
                          >
                            Step 2
                          </span>
                          <span className="text-[11px] font-semibold text-ink-secondary">선생님 1차 피드백</span>
                        </div>
                        {selQ.prevFeedback ? (
                          <div
                            className="rounded-lg px-3 py-2.5 text-[13px] font-medium leading-[1.8]"
                            style={{
                              background: THEME.accentBg,
                              border: `1px solid ${THEME.accentBorder}60`,
                              color: THEME.accentDark,
                            }}
                          >
                            {selQ.prevFeedback}
                          </div>
                        ) : (
                          <>
                            <textarea
                              value={feedback[String(selQ.id)] || ''}
                              onChange={e => setFeedback(prev => ({ ...prev, [String(selQ.id)]: e.target.value }))}
                              placeholder="학생 답변에 대한 피드백을 작성해주세요..."
                              rows={3}
                              className="w-full border border-line rounded-lg px-3 py-2.5 text-[12px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                              onFocus={handleTextareaFocus}
                              onBlur={handleTextareaBlur}
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => sendFeedback('first')}
                                className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                                style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                              >
                                📤 1차 피드백 전달
                              </button>
                              <button
                                className="px-4 py-2 bg-white border rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                                style={{ color: THEME.accent, borderColor: THEME.accent }}
                              >
                                ✨ AI 제안
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 3 */}
                    {selQ.prevFeedback && (
                      <div>
                        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold text-white bg-ink-muted px-2 py-0.5 rounded-full">
                              Step 3
                            </span>
                            <span className="text-[11px] font-semibold text-ink-secondary">학생 업그레이드 답변</span>
                          </div>
                          {selQ.upgradedAnswer && (
                            <button
                              onClick={() => {
                                if (showAiPanel && aiTab === 'second') { setShowAiPanel(false); setAiData(null) }
                                else openAiAnalysis('second')
                              }}
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border"
                              style={{
                                background: showAiPanel && aiTab === 'second' ? THEME.accent : THEME.accentBg,
                                color: showAiPanel && aiTab === 'second' ? '#fff' : THEME.accent,
                                borderColor: THEME.accent,
                              }}
                            >
                              ✨ 2차 AI 분석 {showAiPanel && aiTab === 'second' ? '닫기' : '보기'}
                            </button>
                          )}
                        </div>
                        <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink leading-[1.8]">
                          {selQ.upgradedAnswer || <span className="text-ink-muted">학생이 아직 업그레이드 답변을 작성하지 않았어요.</span>}
                        </div>
                      </div>
                    )}

                    {/* Step 4 */}
                    {selQ.upgradedAnswer && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-extrabold text-white bg-green-600 px-2 py-0.5 rounded-full">
                            Step 4
                          </span>
                          <span className="text-[11px] font-semibold text-ink-secondary">선생님 최종 피드백</span>
                        </div>
                        {selQ.finalFeedback ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-[13px] font-medium text-green-800 leading-[1.8]">
                            {selQ.finalFeedback}
                          </div>
                        ) : (
                          <>
                            <textarea
                              value={feedback[`${selQ.id}_final`] || ''}
                              onChange={e => setFeedback(prev => ({ ...prev, [`${selQ.id}_final`]: e.target.value }))}
                              placeholder="업그레이드된 답변에 대한 최종 피드백을 작성해주세요..."
                              rows={3}
                              className="w-full border border-line rounded-lg px-3 py-2.5 text-[12px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                              onFocus={e => {
                                e.target.style.borderColor = '#059669'
                                e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)'
                              }}
                              onBlur={handleTextareaBlur}
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => sendFeedback('final')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] font-bold hover:bg-green-700 transition-all hover:-translate-y-px"
                                style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                              >
                                ✓ 최종 피드백 전달
                              </button>
                              <button
                                className="px-4 py-2 bg-white border rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                                style={{ color: THEME.accent, borderColor: THEME.accent }}
                              >
                                ✨ AI 제안
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 5 꼬리질문 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                          style={{ background: getStep(selQ) >= 4 ? THEME.accent : '#6B7280' }}
                        >
                          Step 5
                        </span>
                        <span className="text-[11px] font-semibold text-ink-secondary">꼬리질문</span>
                        <div className="ml-auto flex gap-1.5">
                          <button
                            onClick={() => setShowTailModal(true)}
                            className="px-2.5 py-1 bg-white border rounded-md text-[11px] font-bold transition-all"
                            style={{ color: THEME.accent, borderColor: THEME.accent }}
                          >
                            + 직접 추가
                          </button>
                          <button
                            onClick={openAiTailModal}
                            className="px-2.5 py-1 text-white rounded-md text-[11px] font-bold transition-all"
                            style={{ background: THEME.accent, boxShadow: `0 2px 6px ${THEME.accentShadow}` }}
                          >
                            ✨ AI 생성
                          </button>
                        </div>
                      </div>
                      {selQ.tails.length === 0 ? (
                        <div className="text-center py-3 text-[12px] text-ink-muted font-medium bg-gray-50 rounded-lg">
                          꼬리질문이 없어요.
                        </div>
                      ) : selQ.tails.map((t: string, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 px-3 py-2.5 bg-gray-50 rounded-lg mb-1.5 text-[12px] font-medium text-ink leading-[1.5]"
                        >
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                            style={{ color: THEME.accentDark, background: '#fff', border: `1px solid ${THEME.accentBorder}60` }}
                          >
                            꼬리 {i + 1}
                          </span>
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ==================== 오른쪽 AI 분석 패널 ==================== */}
        {showAiPanel && selQ && (
          <div className="w-[440px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.08)]">

            {/* 패널 헤더 */}
            <div className="px-5 py-3.5 border-b border-line flex-shrink-0 flex items-center justify-between" style={{ background: THEME.accentBg }}>
              <div className="text-[14px] font-extrabold tracking-tight" style={{ color: THEME.accentDark }}>
                ✨ AI 분석
              </div>
              <button
                onClick={() => { setShowAiPanel(false); setAiData(null) }}
                className="text-ink-secondary text-lg hover:text-ink transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-white"
              >
                ✕
              </button>
            </div>

            {/* 1차/2차 탭 */}
            <div className="flex border-b border-line flex-shrink-0">
              <button
                onClick={() => { setAiTab('first'); openAiAnalysis('first') }}
                className="flex-1 py-3 text-center text-[12px] transition-all"
                style={{
                  fontWeight: aiTab === 'first' ? 700 : 500,
                  color: aiTab === 'first' ? THEME.accent : '#6B7280',
                  borderBottom: `2px solid ${aiTab === 'first' ? THEME.accent : 'transparent'}`,
                  background: aiTab === 'first' ? THEME.accentBg : 'transparent',
                }}
              >
                📊 1차 답변 분석
              </button>
              <button
                onClick={() => { if (selQ?.upgradedAnswer) { setAiTab('second'); openAiAnalysis('second') } }}
                disabled={!selQ?.upgradedAnswer}
                className="flex-1 py-3 text-center text-[12px] transition-all disabled:cursor-not-allowed"
                style={{
                  fontWeight: aiTab === 'second' ? 700 : 500,
                  color: !selQ?.upgradedAnswer ? '#D1D5DB' : aiTab === 'second' ? THEME.accent : '#6B7280',
                  borderBottom: `2px solid ${aiTab === 'second' ? THEME.accent : 'transparent'}`,
                  background: aiTab === 'second' ? THEME.accentBg : 'transparent',
                }}
              >
                📈 2차 답변 분석
                {!selQ?.upgradedAnswer && <div className="text-[9px] text-gray-300 font-medium">업그레이드 답변 필요</div>}
              </button>
            </div>

            {/* ==================== 1차 분석 내용 ==================== */}
            {aiTab === 'first' && (
              aiLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted">
                  <div className="text-4xl animate-pulse">✨</div>
                  <div className="text-[13px] font-medium">AI가 답변을 분석 중이에요...</div>
                </div>
              ) : !aiData ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-ink-muted">
                  <div className="text-3xl">📭</div>
                  <div className="text-[13px] font-medium">분석 데이터가 없어요.</div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

                  {/* 답변 정합성 분석 */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">✅</span>
                      <div className="text-[13px] font-extrabold text-green-800">답변 정합성 분석</div>
                    </div>
                    <div className="text-[11px] font-medium text-ink-secondary mb-3.5">
                      작성하신 답변을 대학별 핵심 평가 기준에 맞춰 다각도로 분석한 결과입니다.
                    </div>

                    {/* 레이더 차트 */}
                    <div className="h-56 mb-2.5 bg-white rounded-lg border border-green-200">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          data={getRadarData(selUniv.id, selQ.id)}
                          margin={{ top: 24, right: 40, bottom: 24, left: 40 }}
                        >
                          <PolarGrid stroke="#9CA3AF" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} />
                          <Radar name="대학 기준" dataKey="standard" stroke="#F97316" fill="#F97316" fillOpacity={0.4} strokeWidth={2} />
                          <Radar name="학생 답변" dataKey="student" stroke="#059669" fill="#059669" fillOpacity={0.5} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 범례 */}
                    <div className="flex gap-4 justify-center mb-3.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />대학 평가 기준
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-600" />학생 답변 데이터
                      </div>
                    </div>

                    {/* 바 차트 */}
                    {getBarData(aiData).map((d: any, i: number) => (
                      <div key={i} className="mb-2.5">
                        <div className="flex justify-between text-[12px] mb-1">
                          <span className="font-semibold text-ink">{d.name}</span>
                          <span className="font-bold text-green-600">{d.score}/{d.max}</span>
                        </div>
                        <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${d.pct}%`,
                              background: d.pct >= 80 ? '#059669' : d.pct >= 60 ? '#F97316' : '#EF4444',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 사유하는 질문 */}
                  <div className="bg-white border border-line rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">✅</span>
                      <div className="text-[13px] font-extrabold text-ink">사유하는 질문</div>
                    </div>
                    <div className="text-[11px] font-medium text-ink-secondary mb-2.5">
                      AI가 분석한 답변의 핵심 역량과 전략적인 개선 가이드를 확인해 보세요.
                    </div>
                    <div className="flex flex-col gap-2">
                      {(aiData.tailSuggestions || []).map((t: string, i: number) => (
                        <div key={i} className="flex gap-2 items-start px-3 py-2 bg-gray-50 rounded-lg">
                          <span
                            className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                            style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-[12px] font-medium text-ink leading-[1.6]">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI 종합 분석 */}
                  <div className="bg-white border border-line rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">✅</span>
                      <div className="text-[13px] font-extrabold text-ink">AI 종합 분석</div>
                    </div>
                    <div className="text-[11px] font-medium text-ink-secondary mb-3">
                      AI가 분석한 답변의 핵심 역량과 전략적인 개선 가이드를 확인해 보세요.
                    </div>

                    {/* 평가 기준 */}
                    <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 mb-3.5">
                      <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                        📋 {selUniv.name} 면접 평가 기준
                      </div>
                      <div className="text-[12px] font-medium text-ink leading-[1.7]">{aiData.evalCriteria}</div>
                    </div>

                    {/* 답변 적합성 평가 */}
                    <div className="mb-3.5">
                      <div className="text-[12px] font-extrabold text-ink mb-2.5">답변 적합성 평가</div>
                      {(aiData.scores || []).map((s: any, i: number) => (
                        <div key={i} className="mb-2.5">
                          <div className="text-[12px] font-bold text-ink mb-0.5">{i + 1}. {s.label} ({s.max}점)</div>
                          <div className="text-[12px] font-medium text-ink-secondary leading-[1.6]">{s.desc}</div>
                        </div>
                      ))}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mt-2">
                        <div className="text-[11px] font-bold text-amber-800 mb-1">■ 평가 요약</div>
                        <div className="text-[12px] font-medium text-amber-800 leading-[1.7]">{aiData.summary}</div>
                      </div>
                    </div>

                    {/* 강점 포인트 */}
                    <div className="mb-3.5">
                      <div className="text-[12px] font-extrabold text-green-600 mb-2">💪 강점 포인트</div>
                      {(aiData.strengths || []).map((s: string, i: number) => (
                        <div key={i} className="flex gap-1.5 mb-1.5 text-[12px] font-medium text-ink leading-[1.6] px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
                          <span className="text-green-600 font-extrabold flex-shrink-0">"</span>
                          {s}
                          <span className="text-green-600 font-extrabold flex-shrink-0">"</span>
                        </div>
                      ))}
                    </div>

                    {/* 개선 포인트 */}
                    <div>
                      <div className="text-[12px] font-extrabold text-red-500 mb-2">⚡ 개선 포인트</div>
                      {(aiData.improvements || []).map((s: string, i: number) => (
                        <div key={i} className="flex gap-1.5 mb-1.5 text-[12px] font-medium text-ink leading-[1.6] px-3 py-1.5 bg-red-50 border border-red-200 rounded-md">
                          <span className="text-red-500 font-extrabold flex-shrink-0">"</span>
                          {s}
                          <span className="text-red-500 font-extrabold flex-shrink-0">"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* ==================== 2차 분석 내용 ==================== */}
            {aiTab === 'second' && (
              secondAiLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted">
                  <div className="text-4xl animate-pulse">✨</div>
                  <div className="text-[13px] font-medium">AI가 2차 답변을 분석 중이에요...</div>
                </div>
              ) : !secondData ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-ink-muted">
                  <div className="text-3xl">📭</div>
                  <div className="text-[13px] font-medium">2차 분석 데이터가 없어요.</div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

                  {/* 1차 vs 2차 분포 비교 */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">✅</span>
                      <div className="text-[13px] font-extrabold text-green-800">1차 vs 2차 평가요소 분포 비교</div>
                    </div>
                    <div className="text-[11px] font-medium text-ink-secondary mb-3.5">
                      1차 답변과 2차 답변의 평가요소 분포 변화를 확인해보세요.
                    </div>

                    {/* 범례 */}
                    <div className="flex gap-3 mb-2">
                      <div className="text-[10px] font-semibold text-ink-secondary flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm" style={{ background: THEME.accentBorder }} />1차
                      </div>
                      <div className="text-[10px] font-semibold text-ink-secondary flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-green-600" />2차
                      </div>
                    </div>

                    {secondData.beforeDistribution.map((b: any, i: number) => {
                      const after = secondData.afterDistribution.find((a: any) => a.factorCode === b.factorCode)
                      const diff = (after?.distribution || 0) - b.distribution
                      return (
                        <div key={i} className="mb-3 bg-white rounded-lg p-3 border border-green-200">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[12px] font-bold text-ink">{b.factorName}</span>
                            <span
                              className="text-[11px] font-extrabold"
                              style={{ color: diff > 0 ? '#059669' : diff < 0 ? '#EF4444' : '#6B7280' }}
                            >
                              {diff > 0 ? `▲ +${diff}%` : diff < 0 ? `▼ ${diff}%` : '변동없음'}
                            </span>
                          </div>
                          {/* 1차 바 */}
                          <div className="mb-1.5">
                            <div className="text-[10px] font-medium text-ink-muted mb-0.5">1차 · {b.distribution}%</div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${b.distribution}%`, background: THEME.accentBorder }}
                              />
                            </div>
                          </div>
                          {/* 2차 바 */}
                          <div>
                            <div className="text-[10px] font-medium text-ink-muted mb-0.5">2차 · {after?.distribution || 0}%</div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-green-600 transition-all"
                                style={{ width: `${after?.distribution || 0}%` }}
                              />
                            </div>
                          </div>
                          {/* evidence */}
                          {after?.evidence && (
                            <div className="text-[11px] font-medium text-ink-secondary mt-2 leading-[1.5]">
                              → {after.evidence}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* 구조 코멘트 */}
                  <div className="bg-white border border-line rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">✅</span>
                      <div className="text-[13px] font-extrabold text-ink">구조 코멘트</div>
                    </div>
                    <div className="text-[11px] font-medium text-ink-secondary mb-2.5">
                      답변 구조 측면에서 보완이 필요한 부분을 확인하세요.
                    </div>
                    <div
                      className="rounded-lg px-3 py-3 text-[13px] font-medium leading-[1.8]"
                      style={{
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}60`,
                        color: THEME.accentDark,
                      }}
                    >
                      {secondData.structureComment}
                    </div>
                  </div>

                  {/* 연습 답변 */}
                  <div className="bg-white border border-line rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">✅</span>
                      <div className="text-[13px] font-extrabold text-ink">연습 답변</div>
                    </div>
                    <div className="text-[11px] font-medium text-ink-secondary mb-2.5">
                      2차 원답변을 스피치 구조에 맞게 재정렬한 연습 답변이에요.
                    </div>
                    <div className="bg-gray-50 border border-line rounded-lg px-3 py-3 text-[13px] font-medium text-ink leading-[1.9] italic">
                      "{secondData.practiceAnswer}"
                    </div>
                    <div className="mt-2 text-[11px] font-medium text-ink-muted leading-[1.5]">
                      ※ 이 연습 답변은 학생의 원답변을 구조에 맞게 재정렬한 것으로, 새로운 내용이 추가되지 않았습니다.
                    </div>
                  </div>

                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ==================== 꼬리질문 직접 추가 모달 ==================== */}
      {showTailModal && (
        <div
          onClick={() => setShowTailModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[460px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-[18px] font-extrabold text-ink mb-1">✏️ 꼬리질문 추가</div>
            <div className="text-[12px] font-medium text-ink-secondary mb-4">학생에게 추가로 물어볼 꼬리질문을 작성해요.</div>
            <textarea
              value={tailInput}
              onChange={e => setTailInput(e.target.value)}
              placeholder="꼬리질문을 입력해주세요..."
              rows={4}
              autoFocus
              className="w-full border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium outline-none resize-none leading-[1.7] transition-all mb-4 placeholder:text-ink-muted"
              onFocus={handleTextareaFocus}
              onBlur={handleTextareaBlur}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowTailModal(false); setTailInput('') }}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={addTail}
                disabled={!tailInput.trim()}
                className="flex-1 h-11 rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed"
                style={{
                  background: tailInput.trim() ? THEME.accent : '#E5E7EB',
                  color: tailInput.trim() ? '#fff' : '#9CA3AF',
                  boxShadow: tailInput.trim() ? `0 4px 12px ${THEME.accentShadow}` : 'none',
                }}
              >
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== AI 꼬리질문 모달 ==================== */}
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
            <div className="text-[18px] font-extrabold text-ink mb-1">✨ AI 꼬리질문 생성</div>
            <div className="text-[12px] font-medium text-ink-secondary mb-5">
              AI가 답변 내용을 분석해서 꼬리질문을 만들었어요. 전달할 질문을 선택해주세요.
            </div>
            {aiTailLoading ? (
              <div className="text-center py-10 text-ink-muted text-[13px] font-medium">
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                AI가 꼬리질문을 생성 중이에요...
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {aiTails.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedAiTails(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                    className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-left transition-all"
                    style={{
                      border: `1px solid ${selectedAiTails.includes(i) ? THEME.accent : '#E5E7EB'}`,
                      background: selectedAiTails.includes(i) ? THEME.accentBg : '#fff',
                    }}
                  >
                    <div
                      className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        border: `2px solid ${selectedAiTails.includes(i) ? THEME.accent : '#D1D5DB'}`,
                        background: selectedAiTails.includes(i) ? THEME.accent : '#fff',
                      }}
                    >
                      {selectedAiTails.includes(i) && <span className="text-[10px] text-white font-bold">✓</span>}
                    </div>
                    <span className="text-[13px] font-medium text-ink leading-[1.6]">{t}</span>
                  </button>
                ))}
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
                className="flex-1 h-11 rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed"
                style={{
                  background: selectedAiTails.length > 0 ? THEME.accent : '#E5E7EB',
                  color: selectedAiTails.length > 0 ? '#fff' : '#9CA3AF',
                  boxShadow: selectedAiTails.length > 0 ? `0 4px 12px ${THEME.accentShadow}` : 'none',
                }}
              >
                선택한 {selectedAiTails.length}개 전달
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}