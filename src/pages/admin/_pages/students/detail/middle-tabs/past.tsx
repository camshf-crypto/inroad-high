import { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

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
  '지원동기': { bg: '#EEF2FF', color: '#3B5BDB', border: '#BAC8FF' },
  '자기주도': { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' },
  '활동계획': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '인성':     { bg: '#FFF3E8', color: '#D97706', border: '#FDBA74' },
  '진로':     { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '전공':     { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' },
  '활동':     { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '자기소개': { bg: '#FFF7ED', color: '#C2410C', border: '#FDBA74' },
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']
const accentColor = '#059669'
const accentBg = '#ECFDF5'
const accentBorder = '#6EE7B7'
const accentDark = '#065F46'
const accentLight = '#D1FAE5'

export default function PastTab({ student }: { student: any }) {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'hidden' }}>

      {/* 학교 선택 */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 220 }}>
          <div onClick={() => setSchoolDropOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: `0.5px solid ${schoolDropOpen ? accentColor : '#E5E7EB'}`, borderRadius: 8, padding: '7px 10px', background: '#fff', cursor: 'text', height: 36 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>🏫</span>
            <input
              value={schoolInputValue}
              onChange={e => { setSchoolSearch(e.target.value); setSelSchool(''); setSelQ(null); setSchoolDropOpen(true) }}
              onFocus={() => setSchoolDropOpen(true)}
              placeholder="학교 검색..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, fontFamily: 'inherit', background: 'transparent', color: '#1a1a1a', minWidth: 0 }}
            />
            {selSchool ? (
              <button onClick={e => { e.stopPropagation(); setSelSchool(''); setSchoolSearch(''); setSelQ(null); setShowAiPanel(false) }}
                style={{ fontSize: 10, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>✕</button>
            ) : (
              <span onClick={e => { e.stopPropagation(); setSchoolDropOpen(!schoolDropOpen) }}
                style={{ fontSize: 10, color: '#9CA3AF', cursor: 'pointer', flexShrink: 0, userSelect: 'none' as const }}>▼</span>
            )}
          </div>
          {schoolDropOpen && (
            <>
              <div onClick={() => setSchoolDropOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} />
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 8, zIndex: 20, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                {filteredSchools.length === 0 ? (
                  <div style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' as const }}>검색 결과 없음</div>
                ) : filteredSchools.map((s, i) => (
                  <div key={i}
                    onClick={() => { setSelSchool(s); setSchoolSearch(''); setSchoolDropOpen(false); setSelQ(null); setShowAiPanel(false) }}
                    style={{ padding: '8px 12px', fontSize: 12, color: '#1a1a1a', cursor: 'pointer', background: selSchool === s ? accentBg : '#fff', borderBottom: i < filteredSchools.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}>
                    {s}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {selSchool && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: accentColor, background: accentBg, padding: '4px 12px', borderRadius: 99, border: `0.5px solid ${accentBorder}`, flexShrink: 0 }}>
            ✓ {selSchool} · {curQuestions.filter(q => q.answered).length}/{curQuestions.length} 답변완료
          </div>
        )}
      </div>

      {/* 메인 */}
      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>

        {/* 왼쪽 질문 목록 */}
        <div style={{ width: 280, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
            {selSchool ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{selSchool}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                  총 <span style={{ color: accentColor, fontWeight: 600 }}>{curQuestions.length}개</span> ·
                  답변완료 <span style={{ color: accentColor, fontWeight: 600 }}>{curQuestions.filter(q => q.answered).length}개</span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>학교를 선택해주세요</div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {!selSchool ? (
              <div style={{ textAlign: 'center' as const, padding: '40px 0', color: '#9CA3AF', fontSize: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🏫</div>위에서 학교를 선택해주세요
              </div>
            ) : curQuestions.length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: '40px 0', color: '#9CA3AF', fontSize: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>기출문제가 없어요.
              </div>
            ) : curQuestions.map((q, i) => {
              const tc = TYPE_COLOR[q.type] || TYPE_COLOR['지원동기']
              return (
                <div key={q.id} onClick={() => { setSelQ(q); setShowAiPanel(false); setAiData(null) }}
                  style={{ border: `0.5px solid ${selQ?.id === q.id ? accentColor : '#E5E7EB'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 7, cursor: 'pointer', background: selQ?.id === q.id ? accentBg : '#fff' }}>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: accentColor, background: accentBg, padding: '1px 7px', borderRadius: 99 }}>Q{i + 1}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 7px', borderRadius: 99, background: tc.bg, color: tc.color, border: `0.5px solid ${tc.border}` }}>{q.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.5, fontWeight: 500, marginBottom: 5 }}>{q.text}</div>
                  {q.answered
                    ? <span style={{ fontSize: 10, color: accentColor, background: accentBg, padding: '2px 7px', borderRadius: 99, border: `0.5px solid ${accentBorder}` }}>답변완료 · {getStep(q)}/5단계</span>
                    : <span style={{ fontSize: 10, color: '#D97706', background: '#FFF3E8', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #FDBA74' }}>미답변</span>
                  }
                </div>
              )
            })}
          </div>
        </div>

        {/* 가운데 피드백 패널 */}
        <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {!selQ ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
              <div style={{ fontSize: 32 }}>🏫</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>질문을 선택해주세요</div>
              <div style={{ fontSize: 12 }}>왼쪽에서 기출문제를 클릭하면 상세 내용을 볼 수 있어요</div>
            </div>
          ) : (
            <>
              {/* 헤더 */}
              <div style={{ padding: '13px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>Q{curQuestions.findIndex(q => q.id === selQ.id) + 1}</div>
                    <span style={{ fontSize: 11, background: accentBg, color: accentColor, padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{selSchool}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: (TYPE_COLOR[selQ.type] || TYPE_COLOR['지원동기']).bg, color: (TYPE_COLOR[selQ.type] || TYPE_COLOR['지원동기']).color, border: `0.5px solid ${(TYPE_COLOR[selQ.type] || TYPE_COLOR['지원동기']).border}` }}>{selQ.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {selQ.answered && (
                      <button onClick={() => { if (showAiPanel) { setShowAiPanel(false); setAiData(null) } else openAiAnalysis('first') }}
                        style={{ padding: '5px 12px', background: showAiPanel ? accentColor : accentBg, color: showAiPanel ? '#fff' : accentColor, border: `0.5px solid ${accentColor}`, borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ✨ AI 분석 {showAiPanel ? '닫기' : '보기'}
                      </button>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: selQ.answered ? accentBg : '#FFF3E8', color: selQ.answered ? accentColor : '#D97706', border: `0.5px solid ${selQ.answered ? accentBorder : '#FDBA74'}` }}>
                      {selQ.answered ? '답변완료' : '미답변'}
                    </span>
                  </div>
                </div>

                {/* 5단계 */}
                <div style={{ display: 'flex' }}>
                  {STEP_LABELS.map((label, i) => {
                    const step = getStep(selQ)
                    const stepNum = i + 1
                    const isDone = stepNum < step
                    const isOn = stepNum === step
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}>
                        {i < 4 && <div style={{ position: 'absolute', top: 11, left: '55%', width: '90%', height: 1, background: isDone ? accentColor : '#E5E7EB' }} />}
                        <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, zIndex: 1, position: 'relative', background: isDone ? accentColor : isOn ? accentColor : '#F3F4F6', color: isDone || isOn ? '#fff' : '#9CA3AF', border: `1px solid ${isDone ? accentColor : isOn ? accentColor : '#E5E7EB'}` }}>
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div style={{ fontSize: 10, color: isDone ? accentColor : isOn ? accentColor : '#9CA3AF', fontWeight: isOn ? 500 : 400, whiteSpace: 'nowrap' as const }}>{label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 바디 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* 질문 */}
                <div style={{ background: '#F8F7F5', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 5 }}>기출 질문</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.6 }}>{selQ.text}</div>
                </div>

                <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 12 }}>답변 · 피드백 히스토리</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Step 1 */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '2px 8px', borderRadius: 99 }}>Step 1</span>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>학생 첫 답변</span>
                      </div>
                      <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                        {selQ.answered ? selQ.answer : <span style={{ color: '#9CA3AF' }}>아직 학생이 답변을 작성하지 않았어요.</span>}
                      </div>
                    </div>

                    {/* Step 2 */}
                    {selQ.answered && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: accentColor, padding: '2px 8px', borderRadius: 99 }}>Step 2</span>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>선생님 1차 피드백</span>
                        </div>
                        {selQ.prevFeedback ? (
                          <div style={{ background: accentBg, border: `0.5px solid ${accentBorder}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: accentDark, lineHeight: 1.8 }}>
                            {selQ.prevFeedback}
                          </div>
                        ) : (
                          <>
                            <textarea value={feedback[String(selQ.id)] || ''} onChange={e => setFeedback(prev => ({ ...prev, [String(selQ.id)]: e.target.value }))}
                              placeholder="학생 답변에 대한 피드백을 작성해주세요..." rows={3}
                              style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 12, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit', lineHeight: 1.7, boxSizing: 'border-box' as const }} />
                            <div style={{ display: 'flex', gap: 7, marginTop: 7 }}>
                              <button onClick={() => sendFeedback('first')}
                                style={{ padding: '7px 14px', background: accentColor, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                                1차 피드백 전달
                              </button>
                              <button style={{ padding: '7px 14px', background: '#fff', color: accentColor, border: `0.5px solid ${accentColor}`, borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '2px 8px', borderRadius: 99 }}>Step 3</span>
                            <span style={{ fontSize: 11, color: '#6B7280' }}>학생 업그레이드 답변</span>
                          </div>
                          {selQ.upgradedAnswer && (
                            <button onClick={() => { if (showAiPanel && aiTab === 'second') { setShowAiPanel(false); setAiData(null) } else openAiAnalysis('second') }}
                              style={{ padding: '4px 10px', background: showAiPanel && aiTab === 'second' ? accentColor : accentBg, color: showAiPanel && aiTab === 'second' ? '#fff' : accentColor, border: `0.5px solid ${accentColor}`, borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                              ✨ 2차 AI 분석 {showAiPanel && aiTab === 'second' ? '닫기' : '보기'}
                            </button>
                          )}
                        </div>
                        <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                          {selQ.upgradedAnswer || <span style={{ color: '#9CA3AF' }}>학생이 아직 업그레이드 답변을 작성하지 않았어요.</span>}
                        </div>
                      </div>
                    )}

                    {/* Step 4 */}
                    {selQ.upgradedAnswer && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: accentColor, padding: '2px 8px', borderRadius: 99 }}>Step 4</span>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>선생님 최종 피드백</span>
                        </div>
                        {selQ.finalFeedback ? (
                          <div style={{ background: accentBg, border: `0.5px solid ${accentBorder}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: accentDark, lineHeight: 1.8 }}>
                            {selQ.finalFeedback}
                          </div>
                        ) : (
                          <>
                            <textarea value={feedback[`${selQ.id}_final`] || ''} onChange={e => setFeedback(prev => ({ ...prev, [`${selQ.id}_final`]: e.target.value }))}
                              placeholder="업그레이드된 답변에 대한 최종 피드백을 작성해주세요..." rows={3}
                              style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 12, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit', lineHeight: 1.7, boxSizing: 'border-box' as const }} />
                            <div style={{ display: 'flex', gap: 7, marginTop: 7 }}>
                              <button onClick={() => sendFeedback('final')}
                                style={{ padding: '7px 14px', background: accentColor, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                                최종 피드백 전달
                              </button>
                              <button style={{ padding: '7px 14px', background: '#fff', color: accentColor, border: `0.5px solid ${accentColor}`, borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                                ✨ AI 제안
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 5 꼬리질문 */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: getStep(selQ) >= 4 ? accentColor : '#6B7280', padding: '2px 8px', borderRadius: 99 }}>Step 5</span>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>꼬리질문</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          <button onClick={() => setShowTailModal(true)}
                            style={{ padding: '4px 10px', background: '#fff', color: accentColor, border: `0.5px solid ${accentColor}`, borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                            + 직접 추가
                          </button>
                          <button onClick={openAiTailModal}
                            style={{ padding: '4px 10px', background: accentColor, color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                            ✨ AI 생성
                          </button>
                        </div>
                      </div>
                      {selQ.tails.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' as const, padding: '12px 0' }}>꼬리질문이 없어요.</div>
                      ) : selQ.tails.map((t: string, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 10px', background: '#F8F7F5', borderRadius: 7, marginBottom: 5, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                          <span style={{ fontSize: 10, fontWeight: 500, color: accentColor, background: accentBg, padding: '2px 6px', borderRadius: 99, flexShrink: 0, marginTop: 1 }}>꼬리 {i + 1}</span>
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

        {/* 오른쪽 AI 분석 패널 */}
        {showAiPanel && selQ && (
          <div style={{ width: 420, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>✨ AI 분석</div>
              <div onClick={() => { setShowAiPanel(false); setAiData(null) }} style={{ fontSize: 16, color: '#9CA3AF', cursor: 'pointer' }}>✕</div>
            </div>

            {/* 1차/2차 탭 */}
            <div style={{ display: 'flex', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
              <div onClick={() => { setAiTab('first'); openAiAnalysis('first') }}
                style={{ flex: 1, padding: '10px 0', textAlign: 'center' as const, fontSize: 12, fontWeight: aiTab === 'first' ? 600 : 400, color: aiTab === 'first' ? accentColor : '#6B7280', borderBottom: aiTab === 'first' ? `2px solid ${accentColor}` : '2px solid transparent', cursor: 'pointer' }}>
                📊 1차 답변 분석
              </div>
              <div onClick={() => { if (selQ?.upgradedAnswer) { setAiTab('second'); openAiAnalysis('second') } }}
                style={{ flex: 1, padding: '10px 0', textAlign: 'center' as const, fontSize: 12, fontWeight: aiTab === 'second' ? 600 : 400, color: !selQ?.upgradedAnswer ? '#D1D5DB' : aiTab === 'second' ? accentColor : '#6B7280', borderBottom: aiTab === 'second' ? `2px solid ${accentColor}` : '2px solid transparent', cursor: selQ?.upgradedAnswer ? 'pointer' : 'not-allowed' }}>
                📈 2차 답변 분석
                {!selQ?.upgradedAnswer && <div style={{ fontSize: 10, color: '#D1D5DB' }}>업그레이드 답변 필요</div>}
              </div>
            </div>

            {/* 1차 분석 */}
            {aiTab === 'first' && (
              aiLoading ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#9CA3AF' }}>
                  <div style={{ fontSize: 32 }}>✨</div>
                  <div style={{ fontSize: 13 }}>AI가 답변을 분석 중이에요...</div>
                </div>
              ) : !aiData ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>분석 데이터가 없어요.</div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: accentBg, border: `0.5px solid ${accentBorder}`, borderRadius: 10, padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>✅</span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: accentDark }}>답변 정합성 분석</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 14 }}>작성하신 답변을 학교별 핵심 평가 기준에 맞춰 분석한 결과입니다.</div>
                    <div style={{ height: 220, marginBottom: 10 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={getRadarData(selSchool, selQ.id)} margin={{ top: 24, right: 40, bottom: 24, left: 40 }}>
                          <PolarGrid stroke="#9CA3AF" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} />
                          <Radar name="학교 기준" dataKey="standard" stroke="#F97316" fill="#F97316" fillOpacity={0.4} strokeWidth={2} />
                          <Radar name="학생 답변" dataKey="student" stroke={accentColor} fill={accentColor} fillOpacity={0.5} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B7280' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F97316' }} />학교 평가 기준
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B7280' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: accentColor }} />학생 답변 데이터
                      </div>
                    </div>
                    {getBarData(aiData).map((d: any, i: number) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151', marginBottom: 4 }}>
                          <span style={{ fontWeight: 500 }}>{d.name}</span>
                          <span style={{ color: accentColor, fontWeight: 600 }}>{d.score}/{d.max}</span>
                        </div>
                        <div style={{ height: 7, background: accentLight, borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${d.pct}%`, height: '100%', background: d.pct >= 80 ? accentColor : d.pct >= 60 ? '#F97316' : '#EF4444', borderRadius: 99, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>✅</span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>사유하는 질문</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>AI가 분석한 답변의 핵심 역량과 개선 가이드입니다.</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(aiData.tailSuggestions || []).map((t: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: '#F8F7F5', borderRadius: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, background: accentBg, padding: '1px 7px', borderRadius: 99, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                          <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>✅</span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>AI 종합 분석</div>
                    </div>
                    <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>{selSchool} 면접 평가 기준</div>
                      <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{aiData.evalCriteria}</div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>답변 적합성 평가</div>
                      {(aiData.scores || []).map((s: any, i: number) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 3 }}>{i + 1}. {s.label} ({s.max}점)</div>
                          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{s.desc}</div>
                        </div>
                      ))}
                      <div style={{ background: '#FFF3E8', border: '0.5px solid #FDBA74', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>■ 평가 요약</div>
                        <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.7 }}>{aiData.summary}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: accentColor, marginBottom: 8 }}>강점 포인트</div>
                      {(aiData.strengths || []).map((s: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, fontSize: 12, color: '#374151', lineHeight: 1.6, padding: '6px 10px', background: accentBg, borderRadius: 7 }}>
                          <span style={{ color: accentColor, flexShrink: 0, fontWeight: 600 }}>"</span>{s}<span style={{ color: accentColor, flexShrink: 0, fontWeight: 600 }}>"</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', marginBottom: 8 }}>개선 포인트</div>
                      {(aiData.improvements || []).map((s: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, fontSize: 12, color: '#374151', lineHeight: 1.6, padding: '6px 10px', background: '#FEF2F2', borderRadius: 7 }}>
                          <span style={{ color: '#EF4444', flexShrink: 0, fontWeight: 600 }}>"</span>{s}<span style={{ color: '#EF4444', flexShrink: 0, fontWeight: 600 }}>"</span>
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
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#9CA3AF' }}>
                  <div style={{ fontSize: 32 }}>✨</div>
                  <div style={{ fontSize: 13 }}>AI가 2차 답변을 분석 중이에요...</div>
                </div>
              ) : !secondData ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>2차 분석 데이터가 없어요.</div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: accentBg, border: `0.5px solid ${accentBorder}`, borderRadius: 10, padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>✅</span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: accentDark }}>1차 vs 2차 평가요소 분포 비교</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 14 }}>1차 답변과 2차 답변의 평가요소 분포 변화를 확인해보세요.</div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: '#BAC8FF' }} />1차
                      </div>
                      <div style={{ fontSize: 10, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: accentColor }} />2차
                      </div>
                    </div>
                    {secondData.beforeDistribution.map((b: any, i: number) => {
                      const after = secondData.afterDistribution.find((a: any) => a.factorCode === b.factorCode)
                      const diff = (after?.distribution || 0) - b.distribution
                      return (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>{b.factorName}</span>
                            <span style={{ fontSize: 11, color: diff > 0 ? accentColor : diff < 0 ? '#EF4444' : '#6B7280', fontWeight: 600 }}>
                              {diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : '변동없음'}
                            </span>
                          </div>
                          <div style={{ marginBottom: 3 }}>
                            <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>1차 · {b.distribution}%</div>
                            <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ width: `${b.distribution}%`, height: '100%', background: '#BAC8FF', borderRadius: 99 }} />
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>2차 · {after?.distribution || 0}%</div>
                            <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ width: `${after?.distribution || 0}%`, height: '100%', background: accentColor, borderRadius: 99, transition: 'width 0.5s ease' }} />
                            </div>
                          </div>
                          {after?.evidence && (
                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>→ {after.evidence}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>✅</span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>구조 코멘트</div>
                    </div>
                    <div style={{ background: accentBg, border: `0.5px solid ${accentBorder}`, borderRadius: 8, padding: '12px 14px', fontSize: 13, color: accentDark, lineHeight: 1.8 }}>
                      {secondData.structureComment}
                    </div>
                  </div>

                  <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>✅</span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>연습 답변</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>2차 원답변을 스피치 구조에 맞게 재정렬한 연습 답변이에요.</div>
                    <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.9, fontStyle: 'italic' }}>
                      "{secondData.practiceAnswer}"
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>
                      ※ 이 연습 답변은 학생의 원답변을 구조에 맞게 재정렬한 것으로, 새로운 내용이 추가되지 않았습니다.
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* 꼬리질문 직접 추가 모달 */}
      {showTailModal && (
        <div onClick={() => setShowTailModal(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>꼬리질문 추가</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>학생에게 추가로 물어볼 꼬리질문을 작성해요.</div>
            <textarea value={tailInput} onChange={e => setTailInput(e.target.value)}
              placeholder="꼬리질문을 입력해주세요..." rows={4} autoFocus
              style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none' as const, fontFamily: 'inherit', lineHeight: 1.7, marginBottom: 16, boxSizing: 'border-box' as const }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowTailModal(false); setTailInput('') }}
                style={{ flex: 1, height: 42, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
              <button onClick={addTail}
                style={{ flex: 1, height: 42, background: tailInput.trim() ? accentColor : '#E5E7EB', color: tailInput.trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: tailInput.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 꼬리질문 모달 */}
      {showAiTailModal && (
        <div onClick={() => setShowAiTailModal(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>✨ AI 꼬리질문 생성</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>AI가 답변 내용을 분석해서 꼬리질문을 만들었어요.</div>
            {aiTailLoading ? (
              <div style={{ textAlign: 'center' as const, padding: '32px 0', color: '#9CA3AF', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>✨</div>AI가 꼬리질문을 생성 중이에요...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {aiTails.map((t, i) => (
                  <div key={i} onClick={() => setSelectedAiTails(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', border: `0.5px solid ${selectedAiTails.includes(i) ? accentColor : '#E5E7EB'}`, borderRadius: 10, cursor: 'pointer', background: selectedAiTails.includes(i) ? accentBg : '#fff' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${selectedAiTails.includes(i) ? accentColor : '#D1D5DB'}`, background: selectedAiTails.includes(i) ? accentColor : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {selectedAiTails.includes(i) && <span style={{ fontSize: 10, color: '#fff' }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>{t}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAiTailModal(false)}
                style={{ flex: 1, height: 42, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
              <button onClick={deliverAiTails} disabled={selectedAiTails.length === 0 || aiTailLoading}
                style={{ flex: 1, height: 42, background: selectedAiTails.length > 0 ? accentColor : '#E5E7EB', color: selectedAiTails.length > 0 ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: selectedAiTails.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                선택한 {selectedAiTails.length}개 전달
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}