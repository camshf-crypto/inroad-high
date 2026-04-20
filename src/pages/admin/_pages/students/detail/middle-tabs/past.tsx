import { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

// 🌱 중등 초록 테마
const THEME = {
  accent: '#059669',
  accentDark: '#065F46',
  accentBg: '#ECFDF5',
  accentBorder: '#6EE7B7',
  accentLight: '#D1FAE5',
  accentShadow: 'rgba(16, 185, 129, 0.15)',
  gradient: 'linear-gradient(135deg, #065F46, #10B981)',
}

const ALL_SCHOOLS = [
  '인천하늘고', '한국과학영재학교', '경기과학고', '서울과학고', '한성과학고',
  '세종과학고', '대전과학고', '광주과학고', '대구과학고', '부산과학고',
  '대원외고', '대일외고', '명덕외고', '서울외고', '이화외고',
  '한영외고', '민족사관고', '하나고', '외대부고', '북일고',
  '상산고', '현대청운고', '포항제철고', '김천고', '휘문고',
  '중동고', '세화고', '양정고', '배재고', '이대부고',
]

const EVAL_CRITERIA: Record<string, { name: string; max: number; standard: number }[]> = {
  '인천하늘고': [
    { name: '자기주도성', max: 100, standard: 85 },
    { name: '전공적합성', max: 100, standard: 80 },
    { name: '인성', max: 100, standard: 75 },
    { name: '표현력', max: 100, standard: 70 },
  ],
  '민족사관고': [
    { name: '자기주도성', max: 100, standard: 90 },
    { name: '리더십', max: 100, standard: 85 },
    { name: '전공적합성', max: 100, standard: 80 },
    { name: '인성', max: 100, standard: 75 },
    { name: '표현력', max: 100, standard: 70 },
  ],
  '하나고': [
    { name: '인성', max: 100, standard: 90 },
    { name: '자기주도성', max: 100, standard: 85 },
    { name: '공동체의식', max: 100, standard: 80 },
    { name: '표현력', max: 100, standard: 75 },
  ],
  '대원외고': [
    { name: '어학능력', max: 100, standard: 90 },
    { name: '전공적합성', max: 100, standard: 85 },
    { name: '인성', max: 100, standard: 75 },
    { name: '표현력', max: 100, standard: 70 },
  ],
}

const STUDENT_SCORES: Record<string, number[]> = {
  '인천하늘고-1': [72, 75, 68, 65],
  '민족사관고-1': [78, 80, 72, 70, 68],
}

const AI_ANALYSIS: Record<string, any> = {
  '인천하늘고-1': {
    evalCriteria: '인천하늘고 면접에서는 자기주도적 학습 능력과 지원 동기의 진정성을 중시합니다.',
    scores: [
      { label: '자기주도성', score: 24, max: 30, desc: '스스로 학습 계획을 세우고 실천한 경험이 드러났다.' },
      { label: '전공적합성', score: 38, max: 50, desc: '지원 학교와의 연결성이 일부 드러났으나 구체성이 부족하다.' },
      { label: '의사소통역량', score: 14, max: 20, desc: '답변 구조는 있으나 논리 전개가 다소 아쉽다.' },
    ],
    summary: '자기주도성은 잘 드러났으나 인천하늘고 건학이념과의 연결이 부족하다.',
    strengths: ['자기주도적 학습 경험을 구체적으로 설명하였다.', '진로와 연결된 활동 경험이 잘 드러났다.'],
    improvements: ['학교 건학이념과의 연결이 명확하지 않다.', '지원 동기가 추상적이어서 구체적인 사례가 필요하다.'],
    tailSuggestions: [
      '인천하늘고의 자기주도학습 전형이 본인의 학습 방식과 어떻게 맞는지 구체적으로 설명해주세요.',
      '지원 동기에서 언급한 경험이 고등학교 입학 후 어떻게 발전될 것 같은지 말해보세요.',
    ],
    second: {
      beforeDistribution: [
        { factorCode: 'F01', factorName: '자기주도성', distribution: 35, evidence: '학습 계획 수립 경험 언급' },
        { factorCode: 'F02', factorName: '전공적합성', distribution: 40, evidence: '지원 동기와 진로 연결' },
        { factorCode: 'F03', factorName: '의사소통역량', distribution: 25, evidence: '논리적 전개 시도' },
      ],
      afterDistribution: [
        { factorCode: 'F01', factorName: '자기주도성', distribution: 30, evidence: '구체적 실천 사례 보완 필요' },
        { factorCode: 'F02', factorName: '전공적합성', distribution: 50, evidence: '학교 특성과의 연결이 강화됨' },
        { factorCode: 'F03', factorName: '의사소통역량', distribution: 20, evidence: '논리 흐름은 유지됨' },
      ],
      structureComment: '2차 답변은 전공적합성 측면에서 학교와의 연결이 강화되었습니다. 경험 제시 → 의미 도출 → 학교 연결 순서로 재정렬하면 더 명확한 답변이 됩니다.',
      practiceAnswer: '저는 중학교 3년간 매일 아침 30분씩 스스로 학습 계획을 세우고 실천해왔습니다. 이 과정에서 자기주도학습의 중요성을 깊이 깨달았고, 인천하늘고의 자기주도학습 전형이 제 학습 방식과 가장 잘 맞는다고 생각해 지원하게 되었습니다.',
    },
  },
}

const PAST_QUESTIONS: Record<string, any[]> = {
  '인천하늘고': [
    { id: 1, text: '인천하늘고에 지원한 구체적인 이유를 말해보세요.', type: '지원동기', answered: true, answer: '인천하늘고의 자기주도학습 전형이 제 학습 방식과 잘 맞는다고 생각했습니다.', prevFeedback: '', upgradedAnswer: '중학교 3년간 스스로 학습 계획을 세우고 실천해왔고, 이런 저의 학습 방식이 인천하늘고와 잘 맞는다고 생각합니다.', finalFeedback: '', tails: [] },
    { id: 2, text: '자기주도학습 경험을 구체적으로 말해보세요.', type: '자기주도', answered: true, answer: '매일 아침 30분씩 스스로 공부 계획을 세우고 실천했습니다.', prevFeedback: '좋은 경험이에요! 구체적인 성과를 추가해보세요.', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 3, text: '배려나 나눔을 실천한 경험을 말해보세요.', type: '인성', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 4, text: '졸업 후 진로 계획을 구체적으로 말해보세요.', type: '진로', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  '민족사관고': [
    { id: 1, text: '민족사관고에 지원한 이유와 입학 후 목표를 말해보세요.', type: '지원동기', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 2, text: '리더십을 발휘한 경험이 있다면 구체적으로 말해보세요.', type: '인성', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  '하나고': [
    { id: 1, text: '하나고의 교육철학과 본인의 가치관이 어떻게 연결되나요?', type: '지원동기', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 2, text: '공동체 생활에서 갈등을 해결한 경험을 말해보세요.', type: '인성', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  '대원외고': [
    { id: 1, text: '외국어 공부에 관심을 갖게 된 계기가 무엇인가요?', type: '지원동기', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 2, text: '글로벌 이슈 중 관심 있는 주제와 본인의 견해를 말해보세요.', type: '전공', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
}

const TYPE_COLOR: Record<string, any> = {
  '지원동기': { bg: '#EFF6FF', color: '#2563EB', border: '#93C5FD' },
  '자기주도': { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' },
  '활동계획': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '인성':     { bg: '#FFF3E8', color: '#D97706', border: '#FDBA74' },
  '진로':     { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '전공':     { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' },
  '활동':     { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '자기소개': { bg: '#FFF7ED', color: '#C2410C', border: '#FDBA74' },
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

export default function MiddlePastTab({ student }: { student: any }) {
  const [selSchool, setSelSchool] = useState('')
  const [schoolSearch, setSchoolSearch] = useState('')
  const [schoolDropOpen, setSchoolDropOpen] = useState(false)
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

  const curQuestions = selSchool ? (questions[selSchool] || []) : []
  const filteredSchools = ALL_SCHOOLS.filter(s => s.includes(schoolSearch))

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
        const key = `${selSchool}-${selQ?.id}`
        setAiData(AI_ANALYSIS[key] || null)
        setAiLoading(false)
      }, 1200)
    } else {
      setSecondAiLoading(true)
      setTimeout(() => { setSecondAiLoading(false) }, 1200)
    }
  }

  const sendFeedback = (type: 'first' | 'final') => {
    if (!selQ || !selSchool) return
    const key = type === 'first' ? String(selQ.id) : `${selQ.id}_final`
    const val = feedback[key] || ''
    if (!val.trim()) return
    if (type === 'first') {
      const updated = { ...questions, [selSchool]: questions[selSchool].map(q => q.id === selQ.id ? { ...q, prevFeedback: val } : q) }
      setQuestions(updated)
      setSelQ({ ...selQ, prevFeedback: val })
    } else {
      const updated = { ...questions, [selSchool]: questions[selSchool].map(q => q.id === selQ.id ? { ...q, finalFeedback: val } : q) }
      setQuestions(updated)
      setSelQ({ ...selQ, finalFeedback: val })
    }
    setFeedback(prev => ({ ...prev, [key]: '' }))
  }

  const addTail = () => {
    if (!tailInput.trim() || !selQ || !selSchool) return
    const updated = { ...questions, [selSchool]: questions[selSchool].map(q => q.id === selQ.id ? { ...q, tails: [...q.tails, tailInput.trim()] } : q) }
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
      const key = `${selSchool}-${selQ?.id}`
      setAiTails(AI_ANALYSIS[key]?.tailSuggestions || [])
      setAiTailLoading(false)
    }, 1200)
  }

  const deliverAiTails = () => {
    if (!selQ || selectedAiTails.length === 0 || !selSchool) return
    const newTails = selectedAiTails.map(i => aiTails[i])
    const updated = { ...questions, [selSchool]: questions[selSchool].map(q => q.id === selQ.id ? { ...q, tails: [...q.tails, ...newTails] } : q) }
    setQuestions(updated)
    setSelQ({ ...selQ, tails: [...selQ.tails, ...newTails] })
    setShowAiTailModal(false)
    setAiTails([])
    setSelectedAiTails([])
  }

  const getRadarData = (school: string, qId: number) => {
    const criteria = EVAL_CRITERIA[school] || []
    const scores = STUDENT_SCORES[`${school}-${qId}`] || criteria.map(() => 0)
    return criteria.map((c, i) => ({
      subject: c.name, standard: c.standard, student: scores[i] || 0, fullMark: 100,
    }))
  }

  const getBarData = (analysis: any) => {
    if (!analysis?.scores) return []
    return analysis.scores.map((s: any) => ({
      name: s.label, score: s.score, max: s.max, pct: Math.round((s.score / s.max) * 100),
    }))
  }

  const secondData = aiData?.second || null
  const schoolInputValue = selSchool && !schoolDropOpen ? selSchool : schoolSearch

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

      {/* ==================== 학교 선택 ==================== */}
      <div className="flex gap-2 flex-shrink-0 items-center flex-wrap">
        <div className="relative w-[240px]">
          <div
            onClick={() => setSchoolDropOpen(true)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white cursor-text h-10 transition-all"
            style={{
              border: `1px solid ${schoolDropOpen ? THEME.accent : '#E5E7EB'}`,
              boxShadow: schoolDropOpen ? `0 0 0 3px ${THEME.accentShadow}` : 'none',
            }}
          >
            <span className="text-sm flex-shrink-0">🏫</span>
            <input
              value={schoolInputValue}
              onChange={e => { setSchoolSearch(e.target.value); setSelSchool(''); setSelQ(null); setSchoolDropOpen(true) }}
              onFocus={() => setSchoolDropOpen(true)}
              placeholder="학교 검색..."
              className="flex-1 border-none outline-none text-[12.5px] font-medium bg-transparent text-ink min-w-0 placeholder:text-ink-muted"
            />
            {selSchool ? (
              <button
                onClick={e => { e.stopPropagation(); setSelSchool(''); setSchoolSearch(''); setSelQ(null); setShowAiPanel(false) }}
                className="text-[11px] text-ink-muted flex-shrink-0 hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            ) : (
              <span
                onClick={e => { e.stopPropagation(); setSchoolDropOpen(!schoolDropOpen) }}
                className="text-[11px] text-ink-muted cursor-pointer flex-shrink-0 select-none"
              >
                ▼
              </span>
            )}
          </div>
          {schoolDropOpen && (
            <>
              <div onClick={() => setSchoolDropOpen(false)} className="fixed inset-0 z-10" />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-lg z-20 max-h-[240px] overflow-y-auto shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
                {filteredSchools.length === 0 ? (
                  <div className="px-3 py-2.5 text-[12px] font-medium text-ink-muted text-center">검색 결과 없음</div>
                ) : filteredSchools.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => { setSelSchool(s); setSchoolSearch(''); setSchoolDropOpen(false); setSelQ(null); setShowAiPanel(false) }}
                    className="px-3 py-2 text-[12.5px] font-medium cursor-pointer transition-colors"
                    style={{
                      color: selSchool === s ? THEME.accentDark : '#1a1a1a',
                      background: selSchool === s ? THEME.accentBg : '#fff',
                      borderBottom: i < filteredSchools.length - 1 ? '1px solid #F3F4F6' : 'none',
                    }}
                    onMouseEnter={e => { if (selSchool !== s) e.currentTarget.style.background = '#F9FAFB' }}
                    onMouseLeave={e => { if (selSchool !== s) e.currentTarget.style.background = '#fff' }}
                  >
                    🏫 {s}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {selSchool && (
          <div
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full flex-shrink-0"
            style={{
              color: THEME.accentDark,
              background: THEME.accentBg,
              border: `1px solid ${THEME.accentBorder}60`,
              boxShadow: `0 2px 6px ${THEME.accentShadow}`,
            }}
          >
            ✓ {selSchool} · {curQuestions.filter(q => q.answered).length}/{curQuestions.length} 답변완료
          </div>
        )}
      </div>

      {/* ==================== 메인 ==================== */}
      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* ---------- 왼쪽 질문 목록 ---------- */}
        <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-3 border-b border-line flex-shrink-0">
            {selSchool ? (
              <>
                <div className="text-[13.5px] font-extrabold text-ink tracking-tight">🎓 {selSchool}</div>
                <div className="text-[11px] font-medium text-ink-secondary mt-1">
                  총 <span className="font-bold" style={{ color: THEME.accent }}>{curQuestions.length}개</span> ·
                  답변 <span className="font-bold" style={{ color: THEME.accent }}>{curQuestions.filter(q => q.answered).length}개</span>
                </div>
              </>
            ) : (
              <div className="text-[12px] font-medium text-ink-muted">학교를 선택해주세요</div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {!selSchool ? (
              <div className="text-center py-10 text-ink-muted">
                <div className="text-3xl mb-2">🏫</div>
                <div className="text-[12px] font-medium">위에서 학교를 선택해주세요</div>
              </div>
            ) : curQuestions.length === 0 ? (
              <div className="text-center py-10 text-ink-muted">
                <div className="text-3xl mb-2">📝</div>
                <div className="text-[12px] font-medium">기출문제가 없어요.</div>
              </div>
            ) : curQuestions.map((q, i) => {
              const tc = TYPE_COLOR[q.type] || TYPE_COLOR['지원동기']
              const isSelected = selQ?.id === q.id
              return (
                <button
                  key={q.id}
                  onClick={() => { setSelQ(q); setShowAiPanel(false); setAiData(null) }}
                  className="w-full rounded-xl px-3.5 py-3 mb-1.5 text-left transition-all"
                  style={{
                    border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                    background: isSelected ? THEME.accentBg : '#fff',
                    boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                  }}
                >
                  <div className="flex gap-1.5 mb-1.5 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                    >
                      Q{i + 1}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}60` }}
                    >
                      {q.type}
                    </span>
                  </div>
                  <div
                    className="text-[12.5px] font-semibold leading-[1.5] mb-1.5"
                    style={{ color: isSelected ? THEME.accentDark : '#1a1a1a' }}
                  >
                    {q.text}
                  </div>
                  {q.answered ? (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: THEME.accent, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                    >
                      ✓ 답변 · {getStep(q)}/5단계
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      ⏳ 미답변
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ---------- 가운데 피드백 패널 ---------- */}
        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          {!selQ ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">🎓</div>
              <div className="text-[14px] font-bold text-ink-secondary">질문을 선택해주세요</div>
              <div className="text-[12px] font-medium">왼쪽에서 기출문제를 클릭하세요</div>
            </div>
          ) : (
            <>
              {/* 헤더 */}
              <div className="px-5 py-4 border-b border-line flex-shrink-0">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-[13px] font-extrabold text-ink">Q{curQuestions.findIndex(q => q.id === selQ.id) + 1}</div>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                    >
                      🏫 {selSchool}
                    </span>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: (TYPE_COLOR[selQ.type] || TYPE_COLOR['지원동기']).bg,
                        color: (TYPE_COLOR[selQ.type] || TYPE_COLOR['지원동기']).color,
                        border: `1px solid ${(TYPE_COLOR[selQ.type] || TYPE_COLOR['지원동기']).border}60`,
                      }}
                    >
                      {selQ.type}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    {selQ.answered && (
                      <button
                        onClick={() => { if (showAiPanel) { setShowAiPanel(false); setAiData(null) } else openAiAnalysis('first') }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                        style={{
                          background: showAiPanel ? THEME.accent : '#fff',
                          color: showAiPanel ? '#fff' : THEME.accent,
                          border: `1px solid ${THEME.accent}`,
                          boxShadow: showAiPanel ? `0 4px 12px ${THEME.accentShadow}` : 'none',
                        }}
                      >
                        ✨ AI 분석 {showAiPanel ? '닫기' : '보기'}
                      </button>
                    )}
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: selQ.answered ? THEME.accentBg : '#FEF3C7',
                        color: selQ.answered ? THEME.accentDark : '#92400E',
                        border: `1px solid ${selQ.answered ? THEME.accentBorder : '#FCD34D'}60`,
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

              {/* 바디 */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

                {/* 질문 */}
                <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">📌 기출 질문</div>
                  <div className="text-[14px] font-bold text-ink leading-[1.6]">{selQ.text}</div>
                </div>

                <div className="bg-white border border-line rounded-xl px-5 py-4">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-3">📜 답변 · 피드백 히스토리</div>
                  <div className="flex flex-col gap-3.5">

                    {/* Step 1 */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 1</span>
                        <span className="text-[11px] font-bold text-ink-secondary">👤 학생 첫 답변</span>
                      </div>
                      {selQ.answered ? (
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
                    {selQ.answered && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>Step 2</span>
                          <span className="text-[11px] font-bold text-ink-secondary">💬 선생님 1차 피드백</span>
                        </div>
                        {selQ.prevFeedback ? (
                          <div
                            className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8]"
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
                              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                              onFocus={handleTextareaFocus}
                              onBlur={handleTextareaBlur}
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => sendFeedback('first')}
                                disabled={!(feedback[String(selQ.id)] || '').trim()}
                                className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                                style={{
                                  background: (feedback[String(selQ.id)] || '').trim() ? THEME.accent : '#E5E7EB',
                                  color: (feedback[String(selQ.id)] || '').trim() ? '#fff' : '#9CA3AF',
                                  boxShadow: (feedback[String(selQ.id)] || '').trim() ? `0 4px 12px ${THEME.accentShadow}` : 'none',
                                }}
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
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 3</span>
                            <span className="text-[11px] font-bold text-ink-secondary">👤 학생 업그레이드 답변</span>
                          </div>
                          {selQ.upgradedAnswer && (
                            <button
                              onClick={() => { if (showAiPanel && aiTab === 'second') { setShowAiPanel(false); setAiData(null) } else openAiAnalysis('second') }}
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
                              style={{
                                background: showAiPanel && aiTab === 'second' ? THEME.accent : '#fff',
                                color: showAiPanel && aiTab === 'second' ? '#fff' : THEME.accent,
                                border: `1px solid ${THEME.accent}`,
                              }}
                            >
                              ✨ 2차 AI 분석 {showAiPanel && aiTab === 'second' ? '닫기' : '보기'}
                            </button>
                          )}
                        </div>
                        {selQ.upgradedAnswer ? (
                          <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                            {selQ.upgradedAnswer}
                          </div>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-4 text-[12px] font-medium text-amber-700 text-center">
                            ⏳ 학생이 업그레이드 답변을 작성중이에요
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 4 */}
                    {selQ.upgradedAnswer && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>Step 4</span>
                          <span className="text-[11px] font-bold text-ink-secondary">💬 선생님 최종 피드백</span>
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
                              value={feedback[`${selQ.id}_final`] || ''}
                              onChange={e => setFeedback(prev => ({ ...prev, [`${selQ.id}_final`]: e.target.value }))}
                              placeholder="업그레이드된 답변에 대한 최종 피드백을 작성해주세요..."
                              rows={3}
                              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                              onFocus={handleTextareaFocus}
                              onBlur={handleTextareaBlur}
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => sendFeedback('final')}
                                disabled={!(feedback[`${selQ.id}_final`] || '').trim()}
                                className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                                style={{
                                  background: (feedback[`${selQ.id}_final`] || '').trim() ? THEME.accent : '#E5E7EB',
                                  color: (feedback[`${selQ.id}_final`] || '').trim() ? '#fff' : '#9CA3AF',
                                  boxShadow: (feedback[`${selQ.id}_final`] || '').trim() ? `0 4px 12px ${THEME.accentShadow}` : 'none',
                                }}
                              >
                                📤 최종 피드백 전달
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
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span
                          className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                          style={{ background: getStep(selQ) >= 4 ? THEME.accent : '#6B7280' }}
                        >
                          Step 5
                        </span>
                        <span className="text-[11px] font-bold text-ink-secondary">🔗 꼬리질문</span>
                        <div className="ml-auto flex gap-1.5">
                          <button
                            onClick={() => setShowTailModal(true)}
                            className="px-2.5 py-1 bg-white border rounded-md text-[11px] font-bold transition-all hover:-translate-y-px"
                            style={{ color: THEME.accent, borderColor: THEME.accent }}
                          >
                            ➕ 직접 추가
                          </button>
                          <button
                            onClick={openAiTailModal}
                            className="px-2.5 py-1 text-white rounded-md text-[11px] font-bold transition-all hover:-translate-y-px"
                            style={{ background: THEME.accent, boxShadow: `0 2px 6px ${THEME.accentShadow}` }}
                          >
                            ✨ AI 생성
                          </button>
                        </div>
                      </div>
                      {selQ.tails.length === 0 ? (
                        <div className="text-[12px] font-medium text-ink-muted text-center py-3 bg-gray-50 rounded-lg">
                          꼬리질문이 없어요.
                        </div>
                      ) : selQ.tails.map((t: string, i: number) => (
                        <div
                          key={i}
                          className="rounded-lg px-3 py-2.5 mb-1.5 flex items-start gap-2"
                          style={{
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}60`,
                          }}
                        >
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ color: '#fff', background: THEME.accent }}
                          >
                            꼬리{i + 1}
                          </span>
                          <span className="text-[12.5px] font-medium leading-[1.6]" style={{ color: THEME.accentDark }}>
                            {t}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ---------- 오른쪽 AI 분석 패널 ---------- */}
        {showAiPanel && selQ && (
          <div className="w-[420px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-3 border-b border-line flex-shrink-0 flex items-center justify-between">
              <div className="text-[13px] font-extrabold text-ink tracking-tight">✨ AI 분석</div>
              <button
                onClick={() => { setShowAiPanel(false); setAiData(null) }}
                className="text-ink-muted hover:text-ink text-base w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 1차/2차 탭 */}
            <div className="flex border-b border-line flex-shrink-0">
              <button
                onClick={() => { setAiTab('first'); openAiAnalysis('first') }}
                className="flex-1 py-2.5 text-center text-[12px] font-bold transition-all border-b-2"
                style={{
                  color: aiTab === 'first' ? THEME.accentDark : '#9CA3AF',
                  borderColor: aiTab === 'first' ? THEME.accent : 'transparent',
                  background: aiTab === 'first' ? THEME.accentBg : 'transparent',
                }}
              >
                📊 1차 답변 분석
              </button>
              <button
                onClick={() => { if (selQ?.upgradedAnswer) { setAiTab('second'); openAiAnalysis('second') } }}
                disabled={!selQ?.upgradedAnswer}
                className="flex-1 py-2.5 text-center text-[12px] font-bold transition-all border-b-2 disabled:cursor-not-allowed"
                style={{
                  color: !selQ?.upgradedAnswer ? '#D1D5DB' : aiTab === 'second' ? THEME.accentDark : '#9CA3AF',
                  borderColor: aiTab === 'second' ? THEME.accent : 'transparent',
                  background: aiTab === 'second' ? THEME.accentBg : 'transparent',
                }}
              >
                📈 2차 답변 분석
                {!selQ?.upgradedAnswer && <div className="text-[9px]">업그레이드 필요</div>}
              </button>
            </div>

            {/* 1차 분석 */}
            {aiTab === 'first' && (
              aiLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted">
                  <div className="text-3xl animate-pulse">✨</div>
                  <div className="text-[13px] font-medium">AI가 답변을 분석 중이에요...</div>
                </div>
              ) : !aiData ? (
                <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px] font-medium">
                  분석 데이터가 없어요.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                  {/* 정합성 분석 */}
                  <div
                    className="rounded-xl px-4 py-3.5"
                    style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">✅</span>
                      <div className="text-[13px] font-extrabold" style={{ color: THEME.accentDark }}>
                        답변 정합성 분석
                      </div>
                    </div>
                    <div className="text-[11px] font-medium text-ink-secondary mb-3">
                      작성하신 답변을 학교별 핵심 평가 기준에 맞춰 분석한 결과입니다.
                    </div>

                    {/* 레이더 차트 */}
                    <div className="h-[240px] mb-2 bg-white rounded-lg p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={getRadarData(selSchool, selQ.id)} margin={{ top: 24, right: 40, bottom: 24, left: 40 }}>
                          <PolarGrid stroke="#E5E7EB" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} tickLine={false} />
                          <Radar name="학교 기준" dataKey="standard" stroke="#F97316" fill="#F97316" fillOpacity={0.3} strokeWidth={2} />
                          <Radar name="학생 답변" dataKey="student" stroke={THEME.accent} fill={THEME.accent} fillOpacity={0.5} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex gap-4 justify-center mb-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />학교 기준
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: THEME.accent }} />학생 답변
                      </div>
                    </div>

                    {/* 점수 바 */}
                    {getBarData(aiData).map((d: any, i: number) => (
                      <div key={i} className="mb-2.5 bg-white rounded-lg px-3 py-2">
                        <div className="flex justify-between text-[12px] mb-1">
                          <span className="font-semibold text-ink">{d.name}</span>
                          <span className="font-bold" style={{ color: THEME.accent }}>{d.score}/{d.max}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${d.pct}%`,
                              background: d.pct >= 80 ? THEME.accent : d.pct >= 60 ? '#F97316' : '#EF4444',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 사유하는 질문 */}
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">🔍</span>
                      <div className="text-[13px] font-extrabold text-ink">사유하는 질문</div>
                    </div>
                    <div className="text-[11px] font-medium text-ink-secondary mb-2.5">
                      AI가 분석한 답변의 핵심 역량과 개선 가이드입니다.
                    </div>
                    <div className="flex flex-col gap-2">
                      {(aiData.tailSuggestions || []).map((t: string, i: number) => (
                        <div
                          key={i}
                          className="flex gap-2 items-start px-3 py-2 rounded-lg"
                          style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}
                        >
                          <span
                            className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                            style={{ color: '#fff', background: THEME.accent }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-[12px] font-medium leading-[1.6]" style={{ color: THEME.accentDark }}>
                            {t}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 종합 분석 */}
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">📊</span>
                      <div className="text-[13px] font-extrabold text-ink">AI 종합 분석</div>
                    </div>

                    <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 mb-3 mt-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                        🏫 {selSchool} 면접 평가 기준
                      </div>
                      <div className="text-[12px] font-medium text-ink leading-[1.7]">{aiData.evalCriteria}</div>
                    </div>

                    <div className="mb-3">
                      <div className="text-[12px] font-bold text-ink mb-2">답변 적합성 평가</div>
                      {(aiData.scores || []).map((s: any, i: number) => (
                        <div key={i} className="mb-2">
                          <div className="text-[12px] font-bold text-ink mb-0.5">{i + 1}. {s.label} ({s.max}점)</div>
                          <div className="text-[12px] font-medium text-ink-secondary leading-[1.6]">{s.desc}</div>
                        </div>
                      ))}
                      <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 mt-2">
                        <div className="text-[11px] font-bold text-orange-800 mb-1">📌 평가 요약</div>
                        <div className="text-[12px] font-medium text-orange-900 leading-[1.7]">{aiData.summary}</div>
                      </div>
                    </div>

                    {/* 강점 */}
                    <div className="mb-3">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: THEME.accent }}>
                        💪 강점 포인트
                      </div>
                      {(aiData.strengths || []).map((s: string, i: number) => (
                        <div
                          key={i}
                          className="text-[12px] font-medium leading-[1.6] px-3 py-2 rounded-lg mb-1.5"
                          style={{
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}40`,
                            color: THEME.accentDark,
                          }}
                        >
                          ✓ {s}
                        </div>
                      ))}
                    </div>

                    {/* 개선점 */}
                    <div>
                      <div className="text-[11px] font-extrabold text-red-500 uppercase tracking-wider mb-2">
                        ⚡ 개선 포인트
                      </div>
                      {(aiData.improvements || []).map((s: string, i: number) => (
                        <div
                          key={i}
                          className="text-[12px] font-medium text-red-900 leading-[1.6] px-3 py-2 bg-red-50 border border-red-200 rounded-lg mb-1.5"
                        >
                          △ {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* 2차 분석 */}
            {aiTab === 'second' && (
              secondAiLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted">
                  <div className="text-3xl animate-pulse">✨</div>
                  <div className="text-[13px] font-medium">AI가 2차 답변을 분석 중...</div>
                </div>
              ) : !secondData ? (
                <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px] font-medium">
                  2차 분석 데이터가 없어요.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                  {/* 분포 비교 */}
                  <div
                    className="rounded-xl px-4 py-3.5"
                    style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">📊</span>
                      <div className="text-[13px] font-extrabold" style={{ color: THEME.accentDark }}>
                        1차 vs 2차 평가요소 분포
                      </div>
                    </div>
                    <div className="text-[11px] font-medium text-ink-secondary mb-3">
                      1차 답변과 2차 답변의 평가요소 분포 변화를 확인해보세요.
                    </div>
                    <div className="flex gap-3 mb-2">
                      <div className="text-[10px] font-semibold text-ink-secondary flex items-center gap-1">
                        <div className="w-2 h-2 rounded bg-blue-300" />1차
                      </div>
                      <div className="text-[10px] font-semibold text-ink-secondary flex items-center gap-1">
                        <div className="w-2 h-2 rounded" style={{ background: THEME.accent }} />2차
                      </div>
                    </div>
                    {secondData.beforeDistribution.map((b: any, i: number) => {
                      const after = secondData.afterDistribution.find((a: any) => a.factorCode === b.factorCode)
                      const diff = (after?.distribution || 0) - b.distribution
                      return (
                        <div key={i} className="mb-3 bg-white rounded-lg px-3 py-2.5">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[12px] font-bold text-ink">{b.factorName}</span>
                            <span
                              className="text-[11px] font-extrabold"
                              style={{
                                color: diff > 0 ? THEME.accent : diff < 0 ? '#EF4444' : '#6B7280',
                              }}
                            >
                              {diff > 0 ? `▲ +${diff}%` : diff < 0 ? `▼ ${diff}%` : '변동없음'}
                            </span>
                          </div>
                          <div className="mb-1">
                            <div className="text-[10px] font-semibold text-ink-muted mb-0.5">1차 · {b.distribution}%</div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-300"
                                style={{ width: `${b.distribution}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold text-ink-muted mb-0.5">2차 · {after?.distribution || 0}%</div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${after?.distribution || 0}%`, background: THEME.accent }}
                              />
                            </div>
                          </div>
                          {after?.evidence && (
                            <div className="text-[11px] font-medium text-ink-secondary mt-1.5 leading-[1.5]">
                              → {after.evidence}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* 구조 코멘트 */}
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">🏗️</span>
                      <div className="text-[13px] font-extrabold text-ink">구조 코멘트</div>
                    </div>
                    <div
                      className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8]"
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
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">🎤</span>
                      <div className="text-[13px] font-extrabold text-ink">연습 답변</div>
                    </div>
                    <div className="text-[11px] font-medium text-ink-secondary mb-2.5">
                      2차 원답변을 스피치 구조에 맞게 재정렬한 연습 답변이에요.
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.9] italic">
                      "{secondData.practiceAnswer}"
                    </div>
                    <div className="mt-2 text-[11px] font-medium text-ink-muted leading-[1.5]">
                      ※ 학생의 원답변을 구조에 맞게 재정렬한 것이에요.
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
            <div className="text-[18px] font-extrabold text-ink mb-1">➕ 꼬리질문 추가</div>
            <div className="text-[12px] font-medium text-ink-secondary mb-4">학생에게 추가로 물어볼 꼬리질문을 작성해요.</div>
            <textarea
              value={tailInput}
              onChange={e => setTailInput(e.target.value)}
              placeholder="꼬리질문을 입력해주세요..."
              rows={4}
              autoFocus
              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-none leading-[1.7] mb-4 transition-all placeholder:text-ink-muted"
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
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                style={{
                  background: tailInput.trim() ? THEME.accent : '#E5E7EB',
                  color: tailInput.trim() ? '#fff' : '#9CA3AF',
                  boxShadow: tailInput.trim() ? `0 4px 12px ${THEME.accentShadow}` : 'none',
                }}
              >
                📤 추가하기
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
              AI가 답변 내용을 분석해서 꼬리질문을 만들었어요. 전달할 것을 선택하세요.
            </div>

            {aiTailLoading ? (
              <div className="text-center py-10 text-ink-muted text-[13px] font-medium">
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                AI가 꼬리질문을 생성 중이에요...
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {aiTails.map((t, i) => {
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
                        {t}
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