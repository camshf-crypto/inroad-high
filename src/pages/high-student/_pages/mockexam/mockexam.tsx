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

const TYPE_COLOR: Record<string, string> = {
  '자기소개': 'bg-brand-high-pale text-brand-high-dark border-brand-high-light',
  '지원동기': 'bg-brand-high-pale text-brand-high-dark border-brand-high-light',
  '인성': 'bg-amber-50 text-amber-700 border-amber-200',
  '전공': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '생기부': 'bg-purple-50 text-purple-700 border-purple-200',
  '학업': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '진로': 'bg-amber-50 text-amber-700 border-amber-200',
  '탐구': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '독서': 'bg-amber-50 text-amber-700 border-amber-200',
  '성장': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '활동': 'bg-brand-high-pale text-brand-high-dark border-brand-high-light',
  '전공연계': 'bg-purple-50 text-purple-700 border-purple-200',
  '기출': 'bg-purple-50 text-purple-700 border-purple-200',
  '학업연계': 'bg-emerald-50 text-emerald-700 border-emerald-200',
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

  const allMainDone = mainQuestions.every(q => {
    const ans = curExam?.mainAnswers[q.id]
    return ans?.submittedMain && ans?.submittedTail
  })

  const answeredCount = mainQuestions.filter(q => curExam?.mainAnswers[q.id]?.submittedMain).length
  const majorAnsweredCount = majorQuestions.filter(q => curExam?.majorAnswers[q.id]?.answer?.trim()).length

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
    <div className="h-full overflow-hidden px-6 py-5 flex flex-col gap-3 font-sans text-ink">

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-3">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">면접 모의고사</div>
          <div className="text-[12px] text-ink-secondary mt-0.5 font-medium">
            {student?.name} · {grade} · 분기별 실전 면접 대비
          </div>
        </div>
        <div className="flex gap-2">
          <div className="bg-brand-high-pale border border-brand-high-light rounded-xl px-4 py-2 text-center">
            <div className="text-[10px] text-ink-secondary font-semibold">면접 답변</div>
            <div className="text-[15px] font-extrabold text-brand-high-dark">{answeredCount}/{mainQuestions.length}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center">
            <div className="text-[10px] text-ink-secondary font-semibold">전공 답변</div>
            <div className="text-[15px] font-extrabold text-emerald-700">{majorAnsweredCount}/{majorQuestions.length}</div>
          </div>
        </div>
      </div>

      {/* 시험 일정 탭 */}
      <div className="flex gap-2 flex-shrink-0">
        {schedule.map(s => {
          const unlocked = isUnlocked(s.period)
          const isSelected = selPeriod === s.period
          const answered = (MAIN_QUESTIONS[grade]?.[s.period] || []).filter(q => examData[s.period]?.mainAnswers[q.id]?.submittedMain).length
          const total = (MAIN_QUESTIONS[grade]?.[s.period] || []).length
          return (
            <button
              key={s.period}
              onClick={() => { if (unlocked) { setSelPeriod(s.period); setSelMainQ(1); setActiveSection('main'); setInputAnswer(''); setInputTail('') } }}
              disabled={!unlocked}
              className={`flex-1 border rounded-xl px-3 py-2 text-left transition-all ${
                isSelected
                  ? 'border-brand-high bg-brand-high-pale shadow-[0_2px_8px_rgba(37,99,235,0.15)]'
                  : unlocked
                    ? 'border-line bg-white hover:border-brand-high-light'
                    : 'border-line-light bg-gray-50 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`text-[12px] font-bold ${
                  isSelected ? 'text-brand-high-dark' : unlocked ? 'text-ink' : 'text-ink-muted'
                }`}>
                  {!unlocked && '🔒 '}{s.period}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  answered === total && unlocked
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-ink-secondary bg-gray-100'
                }`}>
                  {unlocked ? `${answered}/${total}` : '잠금'}
                </span>
              </div>
              <div className="text-[10px] text-ink-muted mt-0.5 font-medium">{s.type} · {s.level}</div>
              {s.aiGenerated && unlocked && (
                <div className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                  ✨ AI
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 섹션 탭 */}
      <div className="flex gap-2 flex-shrink-0">
        {[
          { key: 'main', label: `📝 면접 질문 (${mainQuestions.length}문항)` },
          { key: 'major', label: `🧠 전공특화 (${majorQuestions.length}문항)` },
        ].map(tab => {
          const locked = tab.key === 'major' && !allMainDone
          const isActive = activeSection === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => { if (!locked) setActiveSection(tab.key as any) }}
              disabled={locked}
              className={`px-4 py-1.5 rounded-full text-[12px] border transition-all flex items-center gap-1 ${
                isActive
                  ? 'bg-brand-high text-white border-brand-high font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.15)]'
                  : locked
                    ? 'bg-gray-100 text-ink-muted border-line-light cursor-not-allowed'
                    : 'bg-white text-ink-secondary border-line hover:border-brand-high-light font-medium'
              }`}
            >
              {locked && '🔒 '}{tab.label}
              {locked && <span className="text-[10px] text-ink-muted">(면접 완료 후)</span>}
            </button>
          )
        })}
      </div>

      {/* 면접 질문 섹션 */}
      {activeSection === 'main' && (
        <div className="flex gap-4 flex-1 overflow-hidden">

          {/* 왼쪽: 질문 목록 */}
          <div className="w-[240px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-3 py-2.5 border-b border-line-light flex-shrink-0">
              <div className="text-[13px] font-bold text-ink">본 질문 {mainQuestions.length}개</div>
              <div className="text-[11px] text-ink-secondary mt-0.5 font-medium">답변 제출 후 꼬리질문 공개</div>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5">
              {mainQuestions.map((q, i) => {
                const ans = curExam?.mainAnswers[q.id]
                const isSelected = selMainQ === q.id
                const isFullDone = ans?.submittedMain && ans?.submittedTail
                return (
                  <button
                    key={q.id}
                    onClick={() => selectQuestion(q.id)}
                    className={`w-full border rounded-xl px-3 py-2.5 mb-1.5 text-left transition-all ${
                      isSelected
                        ? 'border-brand-high bg-brand-high-pale shadow-[0_2px_8px_rgba(37,99,235,0.1)]'
                        : 'border-line bg-white hover:border-brand-high-light hover:shadow-sm'
                    }`}
                  >
                    <div className="flex gap-1 mb-1">
                      <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full">
                        Q{i + 1}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLOR[q.type] || TYPE_COLOR['인성']}`}>
                        {q.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-ink leading-relaxed mb-1.5">{q.text}</div>
                    <div className="flex gap-1 flex-wrap">
                      {isFullDone ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ✓ 완료
                        </span>
                      ) : ans?.submittedMain ? (
                        <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                          꼬리 대기
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          미작성
                        </span>
                      )}
                      {ans?.feedback && (
                        <span className="text-[9px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full">
                          피드백
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 오른쪽: 답변 */}
          <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)] min-w-0">
            {!selQ ? (
              <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px]">
                질문을 선택해주세요
              </div>
            ) : (
              <>
                {/* 질문 헤더 */}
                <div className="px-5 py-3 border-b border-line-light flex-shrink-0 bg-brand-high-pale/30">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[11px] font-bold text-brand-high-dark bg-brand-high-pale px-2.5 py-1 rounded-full">
                      Q{mainQuestions.findIndex(q => q.id === selQ.id) + 1}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${TYPE_COLOR[selQ.type] || TYPE_COLOR['인성']}`}>
                      {selQ.type}
                    </span>
                    {selQ.aiGenerated && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
                        ✨ AI 생성
                      </span>
                    )}
                  </div>
                  <div className="text-[15px] font-bold text-ink leading-relaxed">{selQ.text}</div>
                </div>

                {/* 답변 영역 */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">

                  {/* 본 질문 답변 */}
                  {!selAns?.submittedMain ? (
                    <div className="bg-white border border-line rounded-xl p-4">
                      <div className="text-[12px] font-bold text-ink mb-2">✏️ 내 답변 작성</div>
                      <textarea
                        value={inputAnswer}
                        onChange={e => setInputAnswer(e.target.value)}
                        placeholder="답변을 작성해주세요..."
                        rows={4}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none resize-y leading-relaxed focus:border-brand-high transition-colors font-sans"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-ink-muted font-medium">{inputAnswer.length}자</span>
                        <button
                          onClick={() => submitMain(selQ.id)}
                          disabled={!inputAnswer.trim()}
                          className={`px-5 py-2 rounded-lg text-[12px] font-bold transition-all ${
                            inputAnswer.trim()
                              ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
                              : 'bg-gray-200 text-ink-muted cursor-not-allowed'
                          }`}
                        >
                          제출 → 꼬리질문 받기
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="text-[12px] font-bold text-emerald-700 mb-1.5">✓ 제출된 답변</div>
                      <div className="text-[13px] text-ink leading-relaxed">{selAns.answer}</div>
                      {selAns.feedback && (
                        <div className="mt-3 bg-brand-high-pale border border-brand-high-light rounded-lg px-3 py-2 text-[12px] text-brand-high-dark leading-relaxed">
                          💬 <span className="font-bold">선생님 피드백:</span> {selAns.feedback}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 꼬리질문 */}
                  {selAns?.revealedTail && (
                    <div className={`border rounded-xl p-4 ${
                      selAns.submittedTail
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-purple-200 bg-purple-50/30'
                    }`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-full flex-shrink-0">
                          꼬리질문
                        </span>
                        <div className="text-[13px] text-ink font-semibold leading-relaxed">
                          {TAIL_QUESTIONS[selQ.type] || '이 답변에서 가장 중요하게 생각한 부분은 무엇인가요?'}
                        </div>
                      </div>
                      {!selAns.submittedTail ? (
                        <>
                          <textarea
                            value={inputTail}
                            onChange={e => setInputTail(e.target.value)}
                            placeholder="꼬리질문 답변을 작성해주세요..."
                            rows={3}
                            className="w-full border border-line rounded-lg px-3 py-2.5 text-[12px] outline-none resize-none leading-relaxed focus:border-purple-500 transition-colors font-sans bg-white"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-ink-muted font-medium">{inputTail.length}자</span>
                            <button
                              onClick={() => submitTail(selQ.id)}
                              disabled={!inputTail.trim()}
                              className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                                inputTail.trim()
                                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-[0_2px_8px_rgba(147,51,234,0.2)]'
                                  : 'bg-gray-200 text-ink-muted cursor-not-allowed'
                              }`}
                            >
                              제출 완료
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[12px] text-ink leading-relaxed">{selAns.tailAnswer}</div>
                          {selAns.tailFeedback && (
                            <div className="bg-brand-high-pale border border-brand-high-light rounded-md px-3 py-2 text-[11px] text-brand-high-dark leading-relaxed mt-2">
                              💬 {selAns.tailFeedback}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* 완료 메시지 */}
                  {selAns?.submittedMain && selAns?.submittedTail && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                      <div className="text-[14px] font-bold text-emerald-700">✓ 이 질문 완료!</div>
                      <div className="text-[11px] text-ink-secondary mt-1 font-medium">다음 질문으로 넘어가주세요</div>
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
        <div className="flex-1 overflow-hidden bg-white border border-line rounded-2xl flex flex-col shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="px-5 py-3 border-b border-line-light flex-shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-bold text-ink tracking-tight">전공특화 문제 ({curSchedule?.level})</div>
              <div className="text-[11px] text-ink-secondary mt-0.5 font-medium">
                총 {majorQuestions.length}문항 · 답변을 작성해주세요
              </div>
            </div>
            <div className="text-[13px] text-brand-high-dark font-bold">
              {majorAnsweredCount}/{majorQuestions.length} 작성완료
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
            {majorQuestions.map((q, i) => {
              const ans = curExam?.majorAnswers[q.id]
              return (
                <div
                  key={q.id}
                  className={`border rounded-xl px-4 py-3 transition-all ${
                    ans?.answer?.trim()
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-line bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-[11px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-1 rounded-full flex-shrink-0">
                      Q{i + 1}
                    </span>
                    <span className="text-[13px] text-ink font-semibold leading-relaxed">{q.q}</span>
                  </div>
                  <textarea
                    value={ans?.answer || ''}
                    onChange={e => updateMajorAnswer(q.id, e.target.value)}
                    placeholder="답변을 작성해주세요..."
                    rows={2}
                    className="w-full border border-line rounded-lg px-3 py-2 text-[12px] outline-none resize-none leading-relaxed focus:border-brand-high transition-colors font-sans bg-white"
                  />
                  {ans?.score !== null && ans?.score !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-[12px] font-bold ${
                        ans.score === 100 ? 'text-emerald-700' : ans.score === 50 ? 'text-amber-700' : 'text-red-600'
                      }`}>
                        {ans.score === 100 ? '○ 정답' : ans.score === 50 ? '△ 부분정답' : '✕ 오답'}
                      </span>
                      {ans.feedback && <span className="text-[11px] text-ink-secondary font-medium">{ans.feedback}</span>}
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