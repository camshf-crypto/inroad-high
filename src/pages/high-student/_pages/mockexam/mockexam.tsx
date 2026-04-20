import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState } from '../../_store/auth'

const EXAM_SCHEDULE: Record<string, { period: string, type: string, level: string, aiGenerated: boolean }[]> = {
  '고1': [
    { period: '2월말', type: '기초', level: '전공기초', aiGenerated: false },
    { period: '8월말', type: '기초심화', level: '전공기초', aiGenerated: false },
    { period: '10월말', type: '생기부 AI', level: '전공기초심화', aiGenerated: true },
  ],
  '고2': [
    { period: '2월말', type: '중급', level: '전공심화', aiGenerated: false },
    { period: '8월말', type: '중급심화', level: '전공심화', aiGenerated: false },
    { period: '10월말', type: '생기부 AI', level: '전공실전심화', aiGenerated: true },
  ],
  '고3': [
    { period: '2월말', type: '고급', level: '전공고급심화', aiGenerated: false },
    { period: '8월말', type: '생기부+기출 AI', level: '전공고급심화', aiGenerated: true },
    { period: '10월말', type: '최종실전', level: '전공고급심화', aiGenerated: false },
  ],
}

const MAIN_QUESTIONS: Record<string, Record<string, any[]>> = {
  '고1': {
    '2월말': [
      { id: 1, text: '자신을 간단히 소개해주세요.', type: '자기소개' },
      { id: 2, text: '해당 학과에 지원하게 된 동기는 무엇인가요?', type: '지원동기' },
      { id: 3, text: '본인의 장점과 단점을 말해주세요.', type: '인성' },
      { id: 4, text: '고등학교에서 가장 열심히 했던 활동은 무엇인가요?', type: '활동' },
    ],
    '8월말': [
      { id: 1, text: '1학기 동안 가장 인상 깊었던 수업과 이유를 말해주세요.', type: '학업' },
      { id: 2, text: '팀 프로젝트에서 갈등이 생겼을 때 어떻게 해결했나요?', type: '인성' },
      { id: 3, text: '본인이 꿈꾸는 미래 직업과 그 이유를 말해주세요.', type: '진로' },
      { id: 4, text: '독서를 통해 얻은 가장 큰 깨달음은 무엇인가요?', type: '독서' },
    ],
    '10월말': [
      { id: 1, text: '생기부에 기록된 탐구활동 중 가장 의미있었던 것을 설명해주세요.', type: '생기부', aiGenerated: true },
      { id: 2, text: '동아리 활동에서 본인의 역할과 성과를 말해주세요.', type: '생기부', aiGenerated: true },
      { id: 3, text: '수행평가에서 어떤 주제를 선택했고 왜 그 주제를 골랐나요?', type: '생기부', aiGenerated: true },
      { id: 4, text: '올해 가장 성장했다고 느끼는 부분은 무엇인가요?', type: '성장' },
    ],
  },
  '고2': {
    '2월말': [
      { id: 1, text: '고1 때 탐구활동이 고2 학습에 어떤 영향을 미쳤나요?', type: '학업연계' },
      { id: 2, text: '지원 학과와 관련된 시사 이슈에 대해 본인의 견해를 말해주세요.', type: '전공' },
      { id: 3, text: '리더십을 발휘했던 경험을 구체적으로 말해주세요.', type: '인성' },
      { id: 4, text: '본인의 학습 방법과 그 효과에 대해 설명해주세요.', type: '학업' },
    ],
    '8월말': [
      { id: 1, text: '1학기 탐구활동에서 가장 어려웠던 점과 극복 방법은?', type: '탐구' },
      { id: 2, text: '지원 학과 관련 책을 읽고 느낀 점을 말해주세요.', type: '독서' },
      { id: 3, text: '본인이 생각하는 해당 학과의 핵심 역량은 무엇인가요?', type: '전공' },
      { id: 4, text: '친구나 후배를 도왔던 경험과 그때 느낀 점을 말해주세요.', type: '인성' },
    ],
    '10월말': [
      { id: 1, text: '생기부의 세특에 기록된 활동 중 전공과 가장 연관된 것은?', type: '생기부', aiGenerated: true },
      { id: 2, text: '2년간의 탐구활동이 어떻게 발전해왔는지 설명해주세요.', type: '생기부', aiGenerated: true },
      { id: 3, text: '독서활동이 본인의 전공 선택에 어떤 영향을 미쳤나요?', type: '생기부', aiGenerated: true },
      { id: 4, text: '고3을 앞두고 본인의 각오와 목표를 말해주세요.', type: '진로' },
    ],
  },
  '고3': {
    '2월말': [
      { id: 1, text: '3년간의 고교생활을 통해 본인이 가장 성장한 점은 무엇인가요?', type: '성장' },
      { id: 2, text: '지원 학과에서 배우고 싶은 것과 졸업 후 계획을 말해주세요.', type: '진로' },
      { id: 3, text: '본인의 탐구활동이 지원 학과와 어떻게 연결되나요?', type: '전공연계' },
      { id: 4, text: '어려운 상황을 극복했던 경험과 그때 배운 점은?', type: '인성' },
    ],
    '8월말': [
      { id: 1, text: '생기부에 기록된 활동들이 지원 학과와 어떻게 연결되는지 설명해주세요.', type: '생기부', aiGenerated: true },
      { id: 2, text: '기출문제 준비 과정에서 가장 어려웠던 질문과 극복 방법은?', type: '기출', aiGenerated: true },
      { id: 3, text: '본인만의 차별화된 역량이 있다면 무엇인가요?', type: '생기부', aiGenerated: true },
      { id: 4, text: '입학 후 가장 먼저 하고 싶은 활동은 무엇인가요?', type: '진로' },
    ],
    '10월말': [
      { id: 1, text: '면접을 준비하면서 가장 많이 성장한 점은 무엇인가요?', type: '성장' },
      { id: 2, text: '지원 학과 교수님께 꼭 배우고 싶은 분야가 있다면?', type: '전공' },
      { id: 3, text: '본인이 지원 학과에 꼭 합격해야 하는 이유를 설명해주세요.', type: '지원동기' },
      { id: 4, text: '10년 후 본인의 모습을 구체적으로 그려주세요.', type: '진로' },
    ],
  },
}

const TAIL_QUESTIONS: Record<string, string> = {
  '자기소개': '방금 말씀하신 내용 중 가장 자랑스러운 점은 무엇인가요?',
  '지원동기': '구체적으로 언제 그 결심을 하게 됐나요?',
  '인성': '그 경험에서 배운 점을 지금 어떻게 적용하고 있나요?',
  '전공': '그 이슈에 대한 본인만의 해결책이 있다면 무엇인가요?',
  '생기부': '그 활동을 통해 가장 크게 배운 점은 무엇인가요?',
  '학업': '그 학습 방법을 사용하게 된 계기는 무엇인가요?',
  '진로': '그 직업에 필요한 핵심 역량은 무엇이라고 생각하나요?',
  '탐구': '탐구 결론에 한계점이 있다면 무엇인가요?',
  '독서': '그 책에서 가장 인상 깊었던 부분은 어디인가요?',
  '성장': '성장의 계기가 된 구체적인 사건이 있나요?',
  '활동': '그 활동에서 본인의 역할은 무엇이었나요?',
  '전공연계': '두 활동의 공통점은 무엇이라고 생각하나요?',
  '기출': '그 답변을 어떻게 더 발전시켰나요?',
  '학업연계': '고1 탐구가 고2에서 어떻게 심화됐나요?',
}

const MAJOR_QUESTIONS: Record<string, any[]> = {
  '전공기초': [
    { id: 1, q: '컴퓨터에서 이진수를 사용하는 이유는?' },
    { id: 2, q: '알고리즘이란 무엇인지 설명하세요.' },
    { id: 3, q: 'DNA의 이중나선 구조를 발견한 과학자는?' },
    { id: 4, q: '광합성 반응식을 쓰세요.' },
    { id: 5, q: '뉴턴의 제2법칙을 설명하세요.' },
    { id: 6, q: '세포분열의 종류 두 가지를 말하세요.' },
    { id: 7, q: '수요와 공급의 법칙을 설명하세요.' },
    { id: 8, q: '삼권분립이란 무엇인지 설명하세요.' },
    { id: 9, q: '미적분학에서 도함수의 의미는?' },
    { id: 10, q: '빅뱅 이론이란 무엇인지 설명하세요.' },
  ],
  '전공기초심화': [
    { id: 1, q: '정렬 알고리즘 3가지를 말하고 시간복잡도를 설명하세요.' },
    { id: 2, q: 'DNA 복제 과정을 설명하세요.' },
    { id: 3, q: '열역학 제2법칙을 설명하세요.' },
    { id: 4, q: '케인즈 경제학의 핵심 주장은?' },
    { id: 5, q: '사회계약론의 주요 사상가 3명을 말하세요.' },
    { id: 6, q: '미분방정식이란 무엇인지 설명하세요.' },
    { id: 7, q: '면역계에서 항원-항체 반응을 설명하세요.' },
    { id: 8, q: '상대성 이론의 핵심 개념은?' },
    { id: 9, q: '빅데이터의 3V를 설명하세요.' },
    { id: 10, q: '자연선택설을 설명하세요.' },
  ],
  '전공심화': [
    { id: 1, q: '머신러닝에서 과적합(Overfitting)이란?' },
    { id: 2, q: 'CRISPR-Cas9 기술을 설명하세요.' },
    { id: 3, q: '양자역학의 불확정성 원리란?' },
    { id: 4, q: '행동경제학이 전통경제학과 다른 점은?' },
    { id: 5, q: '포퓰리즘의 특징을 설명하세요.' },
    { id: 6, q: '미분기하학에서 곡률이란?' },
    { id: 7, q: '후성유전학(Epigenetics)이란?' },
    { id: 8, q: '특수 상대성 이론의 시간 지연 효과란?' },
    { id: 9, q: 'TCP/IP 프로토콜의 4계층을 설명하세요.' },
    { id: 10, q: '신경가소성(Neuroplasticity)이란?' },
  ],
  '전공실전심화': [
    { id: 1, q: 'GPT 모델의 Transformer 아키텍처에서 Attention 메커니즘을 설명하세요.' },
    { id: 2, q: 'mRNA 백신의 작동 원리를 설명하세요.' },
    { id: 3, q: '양자컴퓨터가 기존 컴퓨터보다 우수한 이유는?' },
    { id: 4, q: '현대 통화정책에서 양적완화의 메커니즘을 설명하세요.' },
    { id: 5, q: '딥러닝에서 역전파(Backpropagation) 알고리즘을 설명하세요.' },
    { id: 6, q: '줄기세포의 종류와 특징을 설명하세요.' },
    { id: 7, q: '블록체인 기술의 합의 알고리즘을 설명하세요.' },
    { id: 8, q: '유전자 발현 조절에서 전사인자의 역할은?' },
    { id: 9, q: '현대 물리학에서 표준 모형이란?' },
    { id: 10, q: '복잡계 이론에서 창발(Emergence)이란?' },
  ],
  '전공고급심화': [
    { id: 1, q: '인공신경망에서 Vanishing Gradient 문제와 해결책을 설명하세요.' },
    { id: 2, q: 'CRISPR 치료제의 윤리적 문제점을 설명하세요.' },
    { id: 3, q: '끈 이론(String Theory)의 핵심 개념을 설명하세요.' },
    { id: 4, q: 'ESG 투자와 전통적 재무 분석의 통합 방법론은?' },
    { id: 5, q: '언어 모델의 할루시네이션(Hallucination) 문제와 해결 방안은?' },
    { id: 6, q: '합성생물학에서 최소 게놈(Minimal Genome)의 의미는?' },
    { id: 7, q: '위상수학에서 위상 동형(Homeomorphism)이란?' },
    { id: 8, q: '신경과학에서 의식(Consciousness)에 대한 주요 이론은?' },
    { id: 9, q: '포스트 AGI 시대의 경제적 영향을 분석하세요.' },
    { id: 10, q: '다중우주론(Multiverse Theory)의 주요 버전들을 설명하세요.' },
  ],
}

const TYPE_COLOR: Record<string, any> = {
  '자기소개': { bg: '#EEF2FF', color: '#3B5BDB', border: '#BAC8FF' },
  '지원동기': { bg: '#EEF2FF', color: '#3B5BDB', border: '#BAC8FF' },
  '인성': { bg: '#FFF3E8', color: '#D97706', border: '#FDBA74' },
  '전공': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '생기부': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '학업': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '진로': { bg: '#FFF7ED', color: '#D97706', border: '#FDBA74' },
  '탐구': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '독서': { bg: '#FFF3E8', color: '#D97706', border: '#FDBA74' },
  '성장': { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' },
  '활동': { bg: '#EEF2FF', color: '#3B5BDB', border: '#BAC8FF' },
  '전공연계': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '기출': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '학업연계': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
}

const initExamData = (grade: string) => {
  const schedule = EXAM_SCHEDULE[grade] || []
  const result: Record<string, any> = {}
  schedule.forEach(exam => {
    const questions = MAIN_QUESTIONS[grade]?.[exam.period] || []
    const majorQs = MAJOR_QUESTIONS[exam.level] || []
    result[exam.period] = {
      status: '대기',
      mainAnswers: Object.fromEntries(questions.map(q => [q.id, {
        answer: '',
        submittedMain: false,
        revealedTail: false,
        tailAnswer: '',
        submittedTail: false,
        feedback: '',
        tailFeedback: '',
      }])),
      majorAnswers: Object.fromEntries(majorQs.map(q => [q.id, { answer: '', score: null, feedback: '' }])),
    }
  })
  return result
}

export default function MockExam() {
  const student = useAtomValue(studentState)
  const grade = student?.grade || '고1'
  const schedule = EXAM_SCHEDULE[grade] || []

  const now = new Date()
  const currentMonth = now.getMonth() + 1

  const isUnlocked = (period: string) => {
    if (period === '2월말') return currentMonth >= 2
    if (period === '8월말') return currentMonth >= 8
    if (period === '10월말') return currentMonth >= 10
    return false
  }

  const [selPeriod, setSelPeriod] = useState(schedule[0]?.period || '')
  const [examData, setExamData] = useState(() => initExamData(grade))
  const [activeSection, setActiveSection] = useState<'main' | 'major'>('main')
  const [selMainQ, setSelMainQ] = useState<number | null>(1)
  const [inputAnswer, setInputAnswer] = useState('')
  const [inputTail, setInputTail] = useState('')

  const curExam = examData[selPeriod]
  const curSchedule = schedule.find(s => s.period === selPeriod)
  const mainQuestions = MAIN_QUESTIONS[grade]?.[selPeriod] || []
  const majorQuestions = MAJOR_QUESTIONS[curSchedule?.level || '전공기초'] || []
  const selQ = mainQuestions.find(q => q.id === selMainQ)
  const selAns = selQ ? curExam?.mainAnswers[selQ.id] : null

  // 면접 전부 완료 체크 (본 질문 + 꼬리 1개)
  const allMainDone = mainQuestions.every(q => {
    const ans = curExam?.mainAnswers[q.id]
    return ans?.submittedMain && ans?.submittedTail
  })

  const answeredCount = mainQuestions.filter(q => curExam?.mainAnswers[q.id]?.submittedMain).length
  const majorAnsweredCount = majorQuestions.filter(q => curExam?.majorAnswers[q.id]?.answer?.trim()).length

  // 본 질문 제출
  const submitMain = (qId: number) => {
    if (!inputAnswer.trim()) return
    setExamData(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next[selPeriod].mainAnswers[qId].answer = inputAnswer
      next[selPeriod].mainAnswers[qId].submittedMain = true
      next[selPeriod].mainAnswers[qId].revealedTail = true
      return next
    })
    setInputAnswer('')
  }

  // 꼬리질문 제출
  const submitTail = (qId: number) => {
    if (!inputTail.trim()) return
    setExamData(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next[selPeriod].mainAnswers[qId].tailAnswer = inputTail
      next[selPeriod].mainAnswers[qId].submittedTail = true
      return next
    })
    setInputTail('')
  }

  // 전공특화 답변
  const updateMajorAnswer = (qId: number, value: string) => {
    setExamData(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next[selPeriod].majorAnswers[qId].answer = value
      return next
    })
  }

  const selectQuestion = (qId: number) => {
    setSelMainQ(qId)
    setInputAnswer('')
    setInputTail('')
  }

  return (
    <div style={{ height: 'calc(100vh - 50px)', overflow: 'hidden', padding: '20px 28px', boxSizing: 'border-box' as const, display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>면접 모의고사</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{student?.name} · {grade} · 분기별 실전 면접 대비</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ background: '#EEF2FF', borderRadius: 8, padding: '6px 14px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 10, color: '#6B7280' }}>면접 답변</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#3B5BDB' }}>{answeredCount}/{mainQuestions.length}</div>
          </div>
          <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '6px 14px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 10, color: '#6B7280' }}>전공 답변</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{majorAnsweredCount}/{majorQuestions.length}</div>
          </div>
        </div>
      </div>

      {/* 시험 일정 탭 */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {schedule.map(s => {
          const unlocked = isUnlocked(s.period)
          const isSelected = selPeriod === s.period
          const answered = (MAIN_QUESTIONS[grade]?.[s.period] || []).filter(q => examData[s.period]?.mainAnswers[q.id]?.submittedMain).length
          const total = (MAIN_QUESTIONS[grade]?.[s.period] || []).length
          return (
            <div key={s.period}
              onClick={() => { if (unlocked) { setSelPeriod(s.period); setSelMainQ(1); setActiveSection('main'); setInputAnswer(''); setInputTail('') } }}
              style={{ flex: 1, border: `0.5px solid ${isSelected ? '#3B5BDB' : unlocked ? '#E5E7EB' : '#F3F4F6'}`, borderRadius: 8, padding: '6px 10px', cursor: unlocked ? 'pointer' : 'not-allowed', background: isSelected ? '#EEF2FF' : unlocked ? '#fff' : '#F9FAFB', opacity: unlocked ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? '#3B5BDB' : unlocked ? '#1a1a1a' : '#9CA3AF' }}>
                  {!unlocked && '🔒 '}{s.period}
                </div>
                <span style={{ fontSize: 10, color: answered === total && unlocked ? '#059669' : '#6B7280', background: answered === total && unlocked ? '#ECFDF5' : '#F3F4F6', padding: '1px 6px', borderRadius: 99 }}>
                  {unlocked ? `${answered}/${total}` : '잠금'}
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{s.type} · {s.level}</div>
              {s.aiGenerated && unlocked && <div style={{ fontSize: 9, color: '#7C3AED', background: '#F5F3FF', padding: '1px 5px', borderRadius: 99, marginTop: 2, display: 'inline-block' }}>✨ AI</div>}
            </div>
          )
        })}
      </div>

      {/* 섹션 탭 */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {[
          { key: 'main', label: `📝 면접 질문 (${mainQuestions.length}문항)` },
          { key: 'major', label: `🧠 전공특화 (${majorQuestions.length}문항)` },
        ].map(tab => {
          const locked = tab.key === 'major' && !allMainDone
          return (
            <div key={tab.key}
              onClick={() => { if (!locked) setActiveSection(tab.key as any) }}
              style={{ padding: '7px 16px', borderRadius: 99, fontSize: 12, cursor: locked ? 'not-allowed' : 'pointer', background: activeSection === tab.key ? '#3B5BDB' : locked ? '#F3F4F6' : '#fff', color: activeSection === tab.key ? '#fff' : locked ? '#9CA3AF' : '#6B7280', border: `0.5px solid ${activeSection === tab.key ? '#3B5BDB' : locked ? '#F3F4F6' : '#E5E7EB'}`, fontWeight: activeSection === tab.key ? 500 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
              {locked && '🔒 '}{tab.label}
              {locked && <span style={{ fontSize: 10, color: '#9CA3AF' }}>(면접 완료 후 해제)</span>}
            </div>
          )
        })}
      </div>

      {/* 면접 질문 섹션 */}
      {activeSection === 'main' && (
        <div style={{ display: 'flex', gap: 14, flex: 1, overflow: 'hidden' }}>

          {/* 왼쪽 질문 목록 */}
          <div style={{ width: 220, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>본 질문 {mainQuestions.length}개</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>답변 제출 후 꼬리질문 공개</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
              {mainQuestions.map((q, i) => {
                const tc = TYPE_COLOR[q.type] || TYPE_COLOR['인성']
                const ans = curExam?.mainAnswers[q.id]
                const isSelected = selMainQ === q.id
                const isFullDone = ans?.submittedMain && ans?.submittedTail
                return (
                  <div key={q.id} onClick={() => selectQuestion(q.id)}
                    style={{ border: `0.5px solid ${isSelected ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 8, padding: '9px 11px', marginBottom: 6, cursor: 'pointer', background: isSelected ? '#EEF2FF' : '#fff' }}>
                    <div style={{ display: 'flex', gap: 5, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#3B5BDB', background: '#EEF2FF', padding: '1px 6px', borderRadius: 99 }}>Q{i + 1}</span>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: tc.bg, color: tc.color, border: `0.5px solid ${tc.border}` }}>{q.type}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#1a1a1a', lineHeight: 1.4, marginBottom: 4 }}>{q.text}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {isFullDone
                        ? <span style={{ fontSize: 9, color: '#059669', background: '#ECFDF5', padding: '1px 5px', borderRadius: 99, border: '0.5px solid #6EE7B7' }}>✓ 완료</span>
                        : ans?.submittedMain
                          ? <span style={{ fontSize: 9, color: '#7C3AED', background: '#F5F3FF', padding: '1px 5px', borderRadius: 99 }}>꼬리 대기</span>
                          : <span style={{ fontSize: 9, color: '#D97706', background: '#FFF3E8', padding: '1px 5px', borderRadius: 99 }}>미작성</span>
                      }
                      {ans?.feedback && <span style={{ fontSize: 9, color: '#3B5BDB', background: '#EEF2FF', padding: '1px 5px', borderRadius: 99 }}>피드백</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 오른쪽 답변 */}
          <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {!selQ ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>질문을 선택해주세요</div>
            ) : (
              <>
                <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0, background: '#F8F9FF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#3B5BDB', background: '#EEF2FF', padding: '2px 8px', borderRadius: 99 }}>Q{mainQuestions.findIndex(q => q.id === selQ.id) + 1}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: (TYPE_COLOR[selQ.type] || TYPE_COLOR['인성']).bg, color: (TYPE_COLOR[selQ.type] || TYPE_COLOR['인성']).color, border: `0.5px solid ${(TYPE_COLOR[selQ.type] || TYPE_COLOR['인성']).border}` }}>{selQ.type}</span>
                    {selQ.aiGenerated && <span style={{ fontSize: 10, color: '#7C3AED', background: '#F5F3FF', padding: '2px 7px', borderRadius: 99 }}>✨ AI 생성</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.6 }}>{selQ.text}</div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* 본 질문 답변 */}
                  {!selAns?.submittedMain ? (
                    <div style={{ border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>✏️ 내 답변 작성</div>
                      <textarea
                        value={inputAnswer}
                        onChange={e => setInputAnswer(e.target.value)}
                        placeholder="답변을 작성해주세요..."
                        rows={4}
                        style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit', lineHeight: 1.7, boxSizing: 'border-box' as const }} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{inputAnswer.length}자</span>
                        <button onClick={() => submitMain(selQ.id)}
                          disabled={!inputAnswer.trim()}
                          style={{ padding: '7px 20px', background: inputAnswer.trim() ? '#3B5BDB' : '#E5E7EB', color: inputAnswer.trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: inputAnswer.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                          제출 → 꼬리질문 받기
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#F0FDF4', border: '0.5px solid #6EE7B7', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', marginBottom: 6 }}>✓ 제출된 답변</div>
                      <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.8 }}>{selAns.answer}</div>
                      {selAns.feedback && (
                        <div style={{ marginTop: 10, background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#1E3A8A', lineHeight: 1.7 }}>
                          💬 선생님 피드백: {selAns.feedback}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 꼬리질문 - 본 질문 제출 후 공개 */}
                  {selAns?.revealedTail && (
                    <div style={{ border: `0.5px solid ${selAns.submittedTail ? '#6EE7B7' : '#BAC8FF'}`, borderRadius: 10, padding: '12px 14px', background: selAns.submittedTail ? '#F0FDF4' : '#F8F9FF' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED', background: '#F5F3FF', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #DDD6FE' }}>꼬리질문</span>
                        <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>
                          {TAIL_QUESTIONS[selQ.type] || '이 답변에서 가장 중요하게 생각한 부분은 무엇인가요?'}
                        </span>
                      </div>
                      {!selAns.submittedTail ? (
                        <>
                          <textarea
                            value={inputTail}
                            onChange={e => setInputTail(e.target.value)}
                            placeholder="꼬리질문 답변을 작성해주세요..."
                            rows={3}
                            style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 12, outline: 'none', resize: 'none' as const, fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' as const }} />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                            <span style={{ fontSize: 10, color: '#9CA3AF' }}>{inputTail.length}자</span>
                            <button onClick={() => submitTail(selQ.id)}
                              disabled={!inputTail.trim()}
                              style={{ padding: '6px 16px', background: inputTail.trim() ? '#7C3AED' : '#E5E7EB', color: inputTail.trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: inputTail.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                              제출 완료
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.7 }}>{selAns.tailAnswer}</div>
                          {selAns.tailFeedback && (
                            <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#1E3A8A', lineHeight: 1.7, marginTop: 8 }}>
                              💬 {selAns.tailFeedback}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* 완료 메시지 */}
                  {selAns?.submittedMain && selAns?.submittedTail && (
                    <div style={{ background: '#ECFDF5', border: '0.5px solid #6EE7B7', borderRadius: 10, padding: '12px 14px', textAlign: 'center' as const }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>✓ 이 질문 완료!</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>다음 질문으로 넘어가주세요</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 전공특화 섹션 */}
      {activeSection === 'major' && (
        <div style={{ flex: 1, overflow: 'hidden', background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>전공특화 문제 ({curSchedule?.level})</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>총 {majorQuestions.length}문항 · 답변을 작성해주세요</div>
            </div>
            <div style={{ fontSize: 12, color: '#3B5BDB', fontWeight: 600 }}>
              {majorAnsweredCount}/{majorQuestions.length} 작성완료
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {majorQuestions.map((q, i) => {
              const ans = curExam?.majorAnswers[q.id]
              return (
                <div key={q.id} style={{ border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', background: ans?.answer?.trim() ? '#F0FDF4' : '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#3B5BDB', background: '#EEF2FF', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>Q{i + 1}</span>
                    <span style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500, lineHeight: 1.5 }}>{q.q}</span>
                  </div>
                  <textarea
                    value={ans?.answer || ''}
                    onChange={e => updateMajorAnswer(q.id, e.target.value)}
                    placeholder="답변을 작성해주세요..."
                    rows={2}
                    style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none', resize: 'none' as const, fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' as const }} />
                  {ans?.score !== null && ans?.score !== undefined && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: ans.score === 100 ? '#059669' : ans.score === 50 ? '#D97706' : '#EF4444' }}>
                        {ans.score === 100 ? '○ 정답' : ans.score === 50 ? '△ 부분정답' : '✕ 오답'}
                      </span>
                      {ans.feedback && <span style={{ fontSize: 11, color: '#6B7280' }}>{ans.feedback}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}