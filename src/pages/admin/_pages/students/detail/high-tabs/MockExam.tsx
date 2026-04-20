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

// ── 모의고사 데이터 구조 ──────────────────────────────
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

// 본 질문 목업
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
      { id: 4, text: '올해 가장 성장했다고 느끼는 부분은 무엇인가요?', type: '성장', aiGenerated: false },
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

// 꼬리질문 목업
const TAIL_QUESTIONS: Record<string, string[]> = {
  '자기소개': ['방금 말씀하신 내용 중 가장 자랑스러운 점은?', '본인을 한 단어로 표현한다면?', '친구들이 본인을 어떻게 표현하나요?'],
  '지원동기': ['구체적으로 언제 그 결심을 하게 됐나요?', '다른 학과가 아닌 이 학과를 선택한 이유는?', '학과 선택에 영향을 준 사람이 있나요?'],
  '인성': ['그 경험에서 배운 점을 지금 어떻게 적용하고 있나요?', '비슷한 상황이 다시 생기면 어떻게 할 건가요?', '주변 사람들의 반응은 어땠나요?'],
  '전공': ['그 이슈에 대한 해결책이 있다면?', '관련 분야의 최신 연구 동향은 알고 있나요?', '본인의 탐구활동과 어떻게 연결되나요?'],
  '생기부': ['그 활동을 통해 가장 크게 배운 점은?', '다시 한다면 어떻게 다르게 접근할 건가요?', '이 활동이 전공 선택에 어떤 영향을 미쳤나요?'],
  '학업': ['그 방법을 사용하게 된 계기는 무엇인가요?', '가장 어려운 과목과 극복 방법은?', '좋아하는 과목과 싫어하는 과목의 차이는?'],
  '진로': ['그 직업에 필요한 핵심 역량은 무엇이라고 생각하나요?', '현재 준비하고 있는 것이 있나요?', '관련 분야 종사자를 만나본 적 있나요?'],
  '탐구': ['탐구 결론에 한계점이 있다면?', '추가로 탐구하고 싶은 부분이 있나요?', '그 방법론을 선택한 이유는?'],
  '독서': ['그 책에서 가장 인상 깊은 구절은?', '저자의 주장에 동의하지 않는 부분이 있나요?', '그 책을 친구에게 추천한다면?'],
  '성장': ['성장하기 전 본인은 어땠나요?', '성장의 계기가 된 구체적 사건이 있나요?', '앞으로 더 성장하고 싶은 부분은?'],
  '활동': ['그 활동에서 본인의 역할은?', '가장 어려웠던 순간은 언제였나요?', '팀원들과 갈등은 없었나요?'],
  '전공연계': ['두 활동의 공통점은 무엇인가요?', '전공 공부에 어떻게 활용할 건가요?', '교수님께 어필하고 싶은 포인트는?'],
  '기출': ['그 답변을 어떻게 발전시켰나요?', '가장 어려웠던 기출 질문은?', '꼬리질문 대비는 어떻게 했나요?'],
  '학업연계': ['고1 탐구가 고2에 어떻게 심화됐나요?', '연결고리를 발견한 순간은?', '앞으로 어떻게 더 발전시킬 건가요?'],
}

// 전공특화 문제 목업
const MAJOR_QUESTIONS: Record<string, any[]> = {
  '전공기초': [
    { id: 1, q: '컴퓨터에서 이진수를 사용하는 이유는?', answer: '', correct: '전기 신호의 ON/OFF 두 가지 상태를 표현하기 위해' },
    { id: 2, q: '알고리즘이란 무엇인지 설명하세요.', answer: '', correct: '문제를 해결하기 위한 단계적 절차나 방법' },
    { id: 3, q: 'DNA의 이중나선 구조를 발견한 과학자는?', answer: '', correct: '왓슨과 크릭 (1953년)' },
    { id: 4, q: '광합성 반응식을 쓰세요.', answer: '', correct: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂' },
    { id: 5, q: '뉴턴의 제2법칙을 설명하세요.', answer: '', correct: 'F = ma (힘 = 질량 × 가속도)' },
    { id: 6, q: '세포분열의 종류 두 가지를 말하세요.', answer: '', correct: '유사분열(체세포분열)과 감수분열' },
    { id: 7, q: '수요와 공급의 법칙을 설명하세요.', answer: '', correct: '가격이 오르면 수요 감소, 공급 증가' },
    { id: 8, q: '삼권분립이란 무엇인지 설명하세요.', answer: '', correct: '입법·행정·사법 권력을 분리하여 견제와 균형 유지' },
    { id: 9, q: '미적분학에서 도함수의 의미는?', answer: '', correct: '함수의 순간 변화율' },
    { id: 10, q: '빅뱅 이론이란 무엇인지 설명하세요.', answer: '', correct: '약 138억 년 전 매우 작고 뜨거운 상태에서 우주가 팽창' },
  ],
  '전공기초심화': [
    { id: 1, q: '정렬 알고리즘 3가지를 말하고 시간복잡도를 설명하세요.', answer: '', correct: '버블(O(n²)), 퀵(O(nlogn)), 병합(O(nlogn))' },
    { id: 2, q: 'DNA 복제 과정을 설명하세요.', answer: '', correct: '반보존적 복제 - 이중나선이 풀리고 각 가닥이 주형이 됨' },
    { id: 3, q: '열역학 제2법칙을 설명하세요.', answer: '', correct: '엔트로피는 항상 증가하는 방향으로 진행' },
    { id: 4, q: '케인즈 경제학의 핵심 주장은?', answer: '', correct: '정부의 적극적 재정정책으로 경기침체 극복 가능' },
    { id: 5, q: '사회계약론의 주요 사상가 3명을 말하세요.', answer: '', correct: '홉스, 로크, 루소' },
    { id: 6, q: '미분방정식이란 무엇인지 설명하세요.', answer: '', correct: '미지함수와 그 도함수를 포함하는 방정식' },
    { id: 7, q: '면역계에서 항원-항체 반응을 설명하세요.', answer: '', correct: '항원의 특이적 구조에 맞는 항체가 결합하여 무력화' },
    { id: 8, q: '상대성 이론의 핵심 개념은?', answer: '', correct: 'E=mc² - 질량과 에너지는 상호 전환 가능' },
    { id: 9, q: '빅데이터의 3V를 설명하세요.', answer: '', correct: 'Volume(양), Velocity(속도), Variety(다양성)' },
    { id: 10, q: '자연선택설을 설명하세요.', answer: '', correct: '환경에 적합한 변이를 가진 개체가 생존·번식에 유리' },
  ],
  '전공심화': [
    { id: 1, q: '머신러닝에서 과적합(Overfitting)이란?', answer: '', correct: '훈련 데이터에만 지나치게 맞춰져 새 데이터에 성능 저하' },
    { id: 2, q: 'CRISPR-Cas9 기술을 설명하세요.', answer: '', correct: '특정 DNA 서열을 정밀하게 편집하는 유전자 편집 기술' },
    { id: 3, q: '양자역학의 불확정성 원리란?', answer: '', correct: '위치와 운동량을 동시에 정확히 측정하는 것은 불가능' },
    { id: 4, q: '행동경제학이 전통경제학과 다른 점은?', answer: '', correct: '인간의 비합리적 의사결정 과정을 심리학적으로 분석' },
    { id: 5, q: '포퓰리즘의 특징을 설명하세요.', answer: '', correct: '엘리트에 반대하는 대중 감정을 이용한 정치 현상' },
    { id: 6, q: '미분기하학에서 곡률이란?', answer: '', correct: '곡선이나 곡면이 얼마나 구부러져 있는지를 나타내는 양' },
    { id: 7, q: '후성유전학(Epigenetics)이란?', answer: '', correct: 'DNA 서열 변화 없이 유전자 발현이 조절되는 현상' },
    { id: 8, q: '특수 상대성 이론의 시간 지연 효과란?', answer: '', correct: '빠르게 움직이는 물체에서 시간이 더 느리게 흐르는 현상' },
    { id: 9, q: 'TCP/IP 프로토콜의 4계층을 설명하세요.', answer: '', correct: '네트워크 접근, 인터넷, 전송, 응용 계층' },
    { id: 10, q: '신경가소성(Neuroplasticity)이란?', answer: '', correct: '경험에 의해 뇌의 구조와 기능이 변화하는 능력' },
  ],
  '전공실전심화': [
    { id: 1, q: 'GPT 모델의 Transformer 아키텍처에서 Attention 메커니즘을 설명하세요.', answer: '', correct: '입력 시퀀스의 각 위치가 다른 위치와의 관계를 학습' },
    { id: 2, q: 'mRNA 백신의 작동 원리를 설명하세요.', answer: '', correct: '스파이크 단백질 설계도를 세포에 전달, 면역반응 유도' },
    { id: 3, q: '양자컴퓨터가 기존 컴퓨터보다 우수한 이유는?', answer: '', correct: '큐비트의 중첩과 얽힘으로 병렬 연산 가능' },
    { id: 4, q: '현대 통화정책에서 양적완화의 메커니즘을 설명하세요.', answer: '', correct: '중앙은행이 채권 매입으로 시중 유동성 공급 확대' },
    { id: 5, q: '딥러닝에서 역전파(Backpropagation) 알고리즘을 설명하세요.', answer: '', correct: '출력층에서 입력층으로 오차를 역방향으로 전파하여 가중치 업데이트' },
    { id: 6, q: '줄기세포의 종류와 특징을 설명하세요.', answer: '', correct: '전능성, 만능성, 다능성, 단능성 줄기세포로 분류' },
    { id: 7, q: '블록체인 기술의 합의 알고리즘을 설명하세요.', answer: '', correct: 'PoW, PoS 등 분산 네트워크에서 데이터 무결성 검증 방식' },
    { id: 8, q: '유전자 발현 조절에서 전사인자의 역할은?', answer: '', correct: 'DNA의 프로모터 부위에 결합하여 전사 개시 조절' },
    { id: 9, q: '현대 물리학에서 표준 모형이란?', answer: '', correct: '소립자와 기본 힘을 설명하는 이론적 틀' },
    { id: 10, q: '복잡계 이론에서 창발(Emergence)이란?', answer: '', correct: '개별 요소에는 없는 새로운 성질이 시스템 전체에서 나타나는 현상' },
  ],
  '전공고급심화': [
    { id: 1, q: '인공신경망에서 Vanishing Gradient 문제와 해결책을 설명하세요.', answer: '', correct: 'ReLU 활성화 함수, 배치 정규화, 잔차 연결 등으로 해결' },
    { id: 2, q: 'CRISPR 치료제의 윤리적 문제점을 설명하세요.', answer: '', correct: '생식세포 편집의 유전성, 사회적 불평등, 동의 문제' },
    { id: 3, q: '끈 이론(String Theory)의 핵심 개념을 설명하세요.', answer: '', correct: '소립자를 점이 아닌 1차원 끈으로 보는 물리학 이론' },
    { id: 4, q: 'ESG 투자와 전통적 재무 분석의 통합 방법론은?', answer: '', correct: '비재무적 요소를 정량화하여 재무모델에 통합하는 접근' },
    { id: 5, q: '언어 모델의 할루시네이션(Hallucination) 문제와 해결 방안은?', answer: '', correct: 'RLHF, RAG 등을 통한 사실성 강화 방법' },
    { id: 6, q: '합성생물학에서 최소 게놈(Minimal Genome)의 의미는?', answer: '', correct: '생명 유지에 필수적인 최소한의 유전자 집합' },
    { id: 7, q: '위상수학에서 위상 동형(Homeomorphism)이란?', answer: '', correct: '두 위상 공간 사이의 연속적이고 역연속적인 전단사 함수' },
    { id: 8, q: '신경과학에서 의식(Consciousness)에 대한 주요 이론은?', answer: '', correct: '전역 작업공간 이론, 통합 정보 이론 등' },
    { id: 9, q: '포스트 AGI 시대의 경제적 영향을 분석하세요.', answer: '', correct: '노동시장 재편, 생산성 폭발, 소득 불평등 문제' },
    { id: 10, q: '다중우주론(Multiverse Theory)의 주요 버전들을 설명하세요.', answer: '', correct: '양자 다중우주, 인플레이션 다중우주, 수학적 다중우주 등' },
  ],
}

const STATUS_COLOR = (s: string) => {
  if (s === '완료') return { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' }
  if (s === '진행중') return { bg: THEME.accentBg, color: THEME.accent, border: THEME.accentBorder }
  if (s === '채점중') return { bg: '#FFF7ED', color: '#D97706', border: '#FDBA74' }
  return { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' }
}

const TYPE_COLOR: Record<string, any> = {
  '자기소개': { bg: THEME.accentBg, color: THEME.accent, border: THEME.accentBorder },
  '지원동기': { bg: THEME.accentBg, color: THEME.accent, border: THEME.accentBorder },
  '인성': { bg: '#FFF3E8', color: '#D97706', border: '#FDBA74' },
  '전공': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '생기부': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '학업': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '진로': { bg: '#FFF7ED', color: '#D97706', border: '#FDBA74' },
  '탐구': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '독서': { bg: '#FFF3E8', color: '#D97706', border: '#FDBA74' },
  '성장': { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' },
  '활동': { bg: THEME.accentBg, color: THEME.accent, border: THEME.accentBorder },
  '전공연계': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '기출': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '학업연계': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
}

const initExamData = (grade: string) => {
  const schedule = EXAM_SCHEDULE[grade] || []
  const result: Record<string, any> = {}
  schedule.forEach(exam => {
    const questions = MAIN_QUESTIONS[grade]?.[exam.period] || []
    const majorQuestions = MAJOR_QUESTIONS[exam.level] || []
    result[exam.period] = {
      status: '대기',
      startedAt: null,
      completedAt: null,
      mainAnswers: Object.fromEntries(questions.map(q => [q.id, { answer: '', tailAnswers: ['', '', ''], feedback: '', tailFeedbacks: ['', '', ''] }])),
      majorAnswers: Object.fromEntries(majorQuestions.map(q => [q.id, { answer: '', score: null, feedback: '' }])),
      totalScore: null,
      teacherComment: '',
      reportVisible: false,
    }
  })
  return result
}

export default function MockExam({ student }: { student: any }) {
  const grade = student?.grade || '고1'
  const schedule = EXAM_SCHEDULE[grade] || []

  const [selPeriod, setSelPeriod] = useState(schedule[0]?.period || '')
  const [examData, setExamData] = useState(() => initExamData(grade))
  const [activeSection, setActiveSection] = useState<'main' | 'major' | 'report'>('main')
  const [selMainQ, setSelMainQ] = useState<number | null>(1)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [teacherComment, setTeacherComment] = useState('')

  const curExam = examData[selPeriod]
  const curSchedule = schedule.find(s => s.period === selPeriod)
  const mainQuestions = MAIN_QUESTIONS[grade]?.[selPeriod] || []
  const majorQuestions = MAJOR_QUESTIONS[curSchedule?.level || '전공기초'] || []
  const selQ = mainQuestions.find(q => q.id === selMainQ)

  const updateFeedback = (key: string, val: string) => {
    setFeedback(prev => ({ ...prev, [key]: val }))
  }

  const sendFeedback = (qId: number, type: 'main' | 'tail', tailIdx?: number) => {
    const key = type === 'main' ? `main-${selPeriod}-${qId}` : `tail-${selPeriod}-${qId}-${tailIdx}`
    const val = feedback[key] || ''
    if (!val.trim()) return
    setExamData(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      if (type === 'main') {
        next[selPeriod].mainAnswers[qId].feedback = val
      } else {
        next[selPeriod].mainAnswers[qId].tailFeedbacks[tailIdx!] = val
      }
      return next
    })
    setFeedback(prev => ({ ...prev, [key]: '' }))
  }

  const scoreMajor = (qId: number, score: number) => {
    setExamData(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next[selPeriod].majorAnswers[qId].score = score
      return next
    })
  }

  const completeExam = () => {
    setExamData(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const majorScores = Object.values(next[selPeriod].majorAnswers as Record<string, any>)
      const scored = majorScores.filter((a: any) => a.score !== null)
      const total = scored.length > 0 ? Math.round(scored.reduce((s: number, a: any) => s + a.score, 0) / scored.length) : null
      next[selPeriod].status = '완료'
      next[selPeriod].completedAt = new Date().toLocaleDateString()
      next[selPeriod].totalScore = total
      next[selPeriod].teacherComment = teacherComment
      return next
    })
  }

  const reportData = {
    student: student?.name,
    grade,
    period: selPeriod,
    examType: curSchedule?.type,
    level: curSchedule?.level,
    completedAt: curExam?.completedAt,
    totalScore: curExam?.totalScore,
    teacherComment: curExam?.teacherComment,
    mainAnswers: mainQuestions.map(q => ({
      question: q.text,
      type: q.type,
      answer: curExam?.mainAnswers[q.id]?.answer || '',
      feedback: curExam?.mainAnswers[q.id]?.feedback || '',
      tails: (TAIL_QUESTIONS[q.type] || []).map((t, i) => ({
        question: t,
        answer: curExam?.mainAnswers[q.id]?.tailAnswers[i] || '',
        feedback: curExam?.mainAnswers[q.id]?.tailFeedbacks[i] || '',
      }))
    })),
    majorAnswers: majorQuestions.map(q => ({
      question: q.q,
      answer: curExam?.majorAnswers[q.id]?.answer || '',
      correct: q.correct,
      score: curExam?.majorAnswers[q.id]?.score,
    }))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ==================== 시험 일정 탭 (가로 컴팩트) ==================== */}
      <div className="flex gap-2 mb-3 flex-shrink-0">
        {schedule.map(s => {
          const exam = examData[s.period]
          const sc = STATUS_COLOR(exam?.status)
          const isSelected = selPeriod === s.period
          return (
            <button
              key={s.period}
              onClick={() => { setSelPeriod(s.period); setSelMainQ(1); setActiveSection('main') }}
              className="flex-1 rounded-lg px-3 py-2 cursor-pointer transition-all flex items-center gap-2 min-w-0"
              style={{
                border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                background: isSelected ? THEME.accentBg : '#fff',
                boxShadow: isSelected ? `0 2px 6px ${THEME.accentShadow}` : 'none',
              }}
            >
              <div
                className="text-[12px] font-extrabold flex-shrink-0"
                style={{ color: isSelected ? THEME.accent : '#1a1a1a' }}
              >
                📅 {s.period}
              </div>
              <div className="text-[11px] font-semibold text-ink-secondary flex-shrink-0">
                · {s.type}
              </div>
              <div className="text-[10px] font-medium text-ink-muted truncate">
                {s.level}
              </div>
              {s.aiGenerated && (
                <span className="text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  ✨ AI
                </span>
              )}
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-auto"
                style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}60` }}
              >
                {exam?.status}
              </span>
            </button>
          )
        })}
      </div>

      {/* ==================== 섹션 탭 ==================== */}
      <div className="flex gap-1.5 mb-3.5 flex-shrink-0">
        {[
          { key: 'main', label: `📝 면접 질문 (${mainQuestions.length}문항)` },
          { key: 'major', label: `🧠 전공특화 (${majorQuestions.length}문항)` },
          { key: 'report', label: '📊 보고서' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key as any)}
            className="px-4 py-2 rounded-full text-[12px] border transition-all"
            style={{
              background: activeSection === tab.key ? THEME.accent : '#fff',
              color: activeSection === tab.key ? '#fff' : '#6B7280',
              borderColor: activeSection === tab.key ? THEME.accent : '#E5E7EB',
              fontWeight: activeSection === tab.key ? 700 : 500,
              boxShadow: activeSection === tab.key ? `0 2px 8px ${THEME.accentShadow}` : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== 면접 질문 섹션 ==================== */}
      {activeSection === 'main' && (
        <div className="flex gap-3.5 flex-1 overflow-hidden">

          {/* 왼쪽 질문 목록 */}
          <div className="w-[260px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-3 border-b border-line flex-shrink-0">
              <div className="text-[13px] font-bold text-ink tracking-tight">본 질문 {mainQuestions.length}개</div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">각 질문마다 꼬리질문 3개</div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {mainQuestions.map((q, i) => {
                const tc = TYPE_COLOR[q.type] || TYPE_COLOR['인성']
                const ans = curExam?.mainAnswers[q.id]
                const isSelected = selMainQ === q.id
                const hasFeedback = !!ans?.feedback
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelMainQ(q.id)}
                    className="w-full rounded-lg px-3 py-2.5 mb-1.5 text-left transition-all"
                    style={{
                      border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                      background: isSelected ? THEME.accentBg : '#fff',
                      boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                    }}
                  >
                    <div className="flex gap-1 mb-1.5 flex-wrap">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ color: THEME.accentDark, background: '#fff', border: `1px solid ${THEME.accentBorder}60` }}
                      >
                        Q{i + 1}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}60` }}
                      >
                        {q.type}
                      </span>
                      {q.aiGenerated && (
                        <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
                          AI
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] font-medium text-ink leading-[1.4] mb-1.5">{q.text}</div>
                    <div className="flex gap-1">
                      {ans?.answer ? (
                        <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                          ✓ 답변완료
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          ⏳ 미답변
                        </span>
                      )}
                      {hasFeedback && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: THEME.accent, background: THEME.accentBg }}
                        >
                          💬 피드백
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 오른쪽 상세 */}
          <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            {!selQ ? (
              <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px] font-medium">
                질문을 선택해주세요
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-line flex-shrink-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                    >
                      Q{mainQuestions.findIndex(q => q.id === selQ.id) + 1}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{
                        background: (TYPE_COLOR[selQ.type] || TYPE_COLOR['인성']).bg,
                        color: (TYPE_COLOR[selQ.type] || TYPE_COLOR['인성']).color,
                        border: `1px solid ${(TYPE_COLOR[selQ.type] || TYPE_COLOR['인성']).border}60`,
                      }}
                    >
                      {selQ.type}
                    </span>
                    {selQ.aiGenerated && (
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                        ✨ AI 생성
                      </span>
                    )}
                  </div>
                  <div className="text-[14px] font-bold text-ink leading-[1.6]">{selQ.text}</div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5">

                  {/* 학생 답변 */}
                  <div className="bg-gray-50 border border-line rounded-xl px-4 py-3.5">
                    <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">👤 학생 답변</div>
                    <div
                      className="text-[13px] leading-[1.8] font-medium"
                      style={{ color: curExam?.mainAnswers[selQ.id]?.answer ? '#1a1a1a' : '#9CA3AF' }}
                    >
                      {curExam?.mainAnswers[selQ.id]?.answer || '아직 학생이 답변을 작성하지 않았어요.'}
                    </div>
                  </div>

                  {/* 선생님 피드백 */}
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">💬 선생님 피드백</div>
                    {curExam?.mainAnswers[selQ.id]?.feedback ? (
                      <div
                        className="rounded-lg px-3 py-2.5 text-[13px] font-medium leading-[1.8]"
                        style={{
                          background: THEME.accentBg,
                          border: `1px solid ${THEME.accentBorder}60`,
                          color: THEME.accentDark,
                        }}
                      >
                        {curExam.mainAnswers[selQ.id].feedback}
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={feedback[`main-${selPeriod}-${selQ.id}`] || ''}
                          onChange={e => updateFeedback(`main-${selPeriod}-${selQ.id}`, e.target.value)}
                          placeholder="본 질문에 대한 피드백을 작성해주세요..."
                          rows={3}
                          className="w-full border border-line rounded-lg px-3 py-2.5 text-[12px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
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
                          onClick={() => sendFeedback(selQ.id, 'main')}
                          className="mt-2 px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                          style={{
                            background: THEME.accent,
                            boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                          }}
                        >
                          📤 피드백 전달
                        </button>
                      </>
                    )}
                  </div>

                  {/* 꼬리질문 */}
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-3">🔗 꼬리질문 3개</div>
                    <div className="flex flex-col gap-3">
                      {(TAIL_QUESTIONS[selQ.type] || ['꼬리질문 1', '꼬리질문 2', '꼬리질문 3']).map((tail, idx) => (
                        <div key={idx} className="border border-line rounded-lg px-3 py-2.5 bg-gray-50">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ color: THEME.accentDark, background: '#fff', border: `1px solid ${THEME.accentBorder}60` }}
                            >
                              꼬리 {idx + 1}
                            </span>
                            <span className="text-[12px] font-semibold text-ink">{tail}</span>
                          </div>
                          <div
                            className="text-[12px] bg-white rounded-md px-3 py-2 mb-2 leading-[1.7] font-medium border border-line"
                            style={{ color: curExam?.mainAnswers[selQ.id]?.tailAnswers[idx] ? '#1a1a1a' : '#9CA3AF' }}
                          >
                            {curExam?.mainAnswers[selQ.id]?.tailAnswers[idx] || '학생 답변 없음'}
                          </div>
                          {curExam?.mainAnswers[selQ.id]?.tailFeedbacks[idx] ? (
                            <div
                              className="rounded-md px-3 py-2 text-[12px] font-medium leading-[1.7]"
                              style={{
                                background: THEME.accentBg,
                                border: `1px solid ${THEME.accentBorder}60`,
                                color: THEME.accentDark,
                              }}
                            >
                              💬 {curExam.mainAnswers[selQ.id].tailFeedbacks[idx]}
                            </div>
                          ) : (
                            <div className="flex gap-1.5">
                              <input
                                value={feedback[`tail-${selPeriod}-${selQ.id}-${idx}`] || ''}
                                onChange={e => updateFeedback(`tail-${selPeriod}-${selQ.id}-${idx}`, e.target.value)}
                                placeholder="꼬리질문 피드백..."
                                className="flex-1 h-9 border border-line rounded-md px-3 text-[12px] font-medium outline-none transition-all placeholder:text-ink-muted"
                                onFocus={e => {
                                  e.target.style.borderColor = THEME.accent
                                  e.target.style.boxShadow = `0 0 0 2px ${THEME.accentShadow}`
                                }}
                                onBlur={e => {
                                  e.target.style.borderColor = '#E5E7EB'
                                  e.target.style.boxShadow = 'none'
                                }}
                              />
                              <button
                                onClick={() => sendFeedback(selQ.id, 'tail', idx)}
                                className="h-9 px-3 text-white rounded-md text-[11px] font-bold transition-all hover:-translate-y-px"
                                style={{
                                  background: THEME.accent,
                                  boxShadow: `0 2px 6px ${THEME.accentShadow}`,
                                }}
                              >
                                전달
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== 전공특화 섹션 ==================== */}
      {activeSection === 'major' && (
        <div className="flex-1 overflow-hidden flex gap-3.5">
          <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="px-5 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-bold text-ink tracking-tight">🧠 전공특화 문제 ({curSchedule?.level})</div>
                <div className="text-[11px] font-medium text-ink-secondary mt-0.5">총 {majorQuestions.length}문항 · 각 문항 채점 가능</div>
              </div>
              <div className="text-[12px] font-bold text-green-600">
                채점완료: {Object.values(curExam?.majorAnswers || {}).filter((a: any) => a.score !== null).length}/{majorQuestions.length}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
              {majorQuestions.map((q, i) => {
                const ans = curExam?.majorAnswers[q.id]
                return (
                  <div
                    key={q.id}
                    className="rounded-xl px-4 py-3.5 transition-all"
                    style={{
                      border: `1px solid ${ans?.score !== null ? '#6EE7B7' : '#E5E7EB'}`,
                      background: ans?.score !== null ? '#F0FDF4' : '#fff',
                    }}
                  >
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <div className="flex items-start gap-2 flex-1">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                        >
                          Q{i + 1}
                        </span>
                        <span className="text-[13px] font-semibold text-ink leading-[1.5]">{q.q}</span>
                      </div>
                      {/* 채점 */}
                      <div className="flex gap-1 flex-shrink-0">
                        {[
                          { score: 100, label: '○', color: '#059669' },
                          { score: 50, label: '△', color: '#F97316' },
                          { score: 0, label: '✕', color: '#EF4444' },
                        ].map(({ score, label, color }) => (
                          <button
                            key={score}
                            onClick={() => scoreMajor(q.id, score)}
                            className="w-10 h-8 rounded-md text-[13px] font-extrabold transition-all hover:-translate-y-px"
                            style={{
                              background: ans?.score === score ? color : '#F3F4F6',
                              color: ans?.score === score ? '#fff' : '#6B7280',
                              boxShadow: ans?.score === score ? `0 2px 6px ${color}50` : 'none',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-[12px] text-ink-secondary mb-2 font-medium">
                      <span className="font-bold">학생 답변: </span>
                      <span>{ans?.answer || '미작성'}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-md">
                      <span className="font-bold">✓ 정답: </span>{q.correct}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 보고서 섹션 ==================== */}
      {activeSection === 'report' && (
        <div className="flex-1 overflow-hidden bg-white border border-line rounded-2xl flex flex-col shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="px-5 py-3.5 border-b border-line flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[14px] font-bold text-ink tracking-tight">📊 모의고사 보고서</div>
            <div className="flex gap-2 flex-wrap items-center">
              <textarea
                value={teacherComment}
                onChange={e => setTeacherComment(e.target.value)}
                placeholder="종합 코멘트 작성..."
                rows={1}
                className="w-[240px] border border-line rounded-lg px-3 py-2 text-[12px] font-medium outline-none resize-none transition-all placeholder:text-ink-muted"
                onFocus={e => {
                  e.target.style.borderColor = THEME.accent
                  e.target.style.boxShadow = `0 0 0 2px ${THEME.accentShadow}`
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#E5E7EB'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                onClick={completeExam}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] font-bold hover:bg-green-700 transition-all hover:-translate-y-px"
                style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
              >
                ✓ 시험 완료
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                style={{
                  background: THEME.accent,
                  boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                }}
              >
                🖨️ PDF 저장
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">

            {/* 보고서 헤더 */}
            <div className="text-center mb-6 pb-5 border-b-2 border-ink">
              <div className="text-[24px] font-extrabold text-ink mb-1 tracking-tight">📋 면접 모의고사 보고서</div>
              <div className="text-[13px] font-semibold text-ink-secondary">
                {reportData.student} · {reportData.grade} · {reportData.period} · {reportData.examType}
              </div>
              {curExam?.completedAt && (
                <div className="text-[12px] text-ink-muted font-medium mt-1">완료일: {curExam.completedAt}</div>
              )}
            </div>

            {/* 점수 요약 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div
                className="rounded-xl px-4 py-4 text-center"
                style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}
              >
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">전공특화 평균</div>
                <div className="text-[26px] font-extrabold" style={{ color: THEME.accent }}>
                  {curExam?.totalScore !== null ? `${curExam.totalScore}점` : '-'}
                </div>
              </div>
              <div className="rounded-xl px-4 py-4 text-center bg-green-50 border border-green-200">
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">면접 피드백 완료</div>
                <div className="text-[26px] font-extrabold text-green-600">
                  {mainQuestions.filter(q => curExam?.mainAnswers[q.id]?.feedback).length}/{mainQuestions.length}
                </div>
              </div>
              <div className="rounded-xl px-4 py-4 text-center bg-amber-50 border border-amber-200">
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">시험 상태</div>
                <div className="text-[20px] font-extrabold text-amber-700">{curExam?.status}</div>
              </div>
            </div>

            {/* 종합 코멘트 */}
            {curExam?.teacherComment && (
              <div className="bg-gray-50 border border-line rounded-xl px-5 py-4 mb-5">
                <div className="text-[12px] font-bold text-ink-muted uppercase tracking-wider mb-2">👨‍🏫 선생님 종합 코멘트</div>
                <div className="text-[13px] font-medium text-ink leading-[1.8]">{curExam.teacherComment}</div>
              </div>
            )}

            {/* 면접 질문별 답변 */}
            <div className="mb-6">
              <div className="text-[15px] font-bold text-ink mb-4 pb-2 border-b border-line tracking-tight flex items-center gap-2">
                📝 면접 질문 답변
              </div>
              {reportData.mainAnswers.map((item, i) => (
                <div key={i} className="border border-line rounded-xl px-5 py-4 mb-3">
                  <div className="text-[13px] font-bold mb-2" style={{ color: THEME.accent }}>
                    Q{i + 1}. {item.question}
                  </div>
                  <div className={`text-[12.5px] font-medium text-ink leading-[1.8] px-3 py-2 bg-gray-50 rounded-md ${item.feedback ? 'mb-2' : ''}`}>
                    {item.answer || '미답변'}
                  </div>
                  {item.feedback && (
                    <div
                      className="text-[12.5px] font-medium leading-[1.8] px-3 py-2 rounded-md mb-2"
                      style={{
                        color: THEME.accentDark,
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}40`,
                      }}
                    >
                      💬 피드백: {item.feedback}
                    </div>
                  )}
                  {item.tails.map((tail, ti) => (
                    tail.answer && (
                      <div key={ti} className="ml-4 mb-1.5">
                        <div className="text-[11px] font-semibold text-ink-secondary mb-1">
                          ↳ 꼬리 {ti + 1}. {tail.question}
                        </div>
                        <div className="text-[12px] font-medium text-ink px-3 py-1.5 bg-gray-50 rounded-md leading-[1.7]">
                          {tail.answer}
                        </div>
                        {tail.feedback && (
                          <div
                            className="text-[11.5px] font-medium px-3 py-1.5 rounded-md mt-1"
                            style={{
                              color: THEME.accentDark,
                              background: THEME.accentBg,
                              border: `1px solid ${THEME.accentBorder}40`,
                            }}
                          >
                            💬 {tail.feedback}
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              ))}
            </div>

            {/* 전공특화 결과 */}
            <div>
              <div className="text-[15px] font-bold text-ink mb-4 pb-2 border-b border-line tracking-tight flex items-center gap-2">
                🧠 전공특화 결과 ({curSchedule?.level})
              </div>
              <table className="w-full border-collapse border border-line rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-line px-3 py-2.5 text-[11px] font-bold text-ink uppercase tracking-wider w-10 text-center">번호</th>
                    <th className="border border-line px-3 py-2.5 text-[11px] font-bold text-ink uppercase tracking-wider text-left">문제</th>
                    <th className="border border-line px-3 py-2.5 text-[11px] font-bold text-ink uppercase tracking-wider text-left">학생 답변</th>
                    <th className="border border-line px-3 py-2.5 text-[11px] font-bold text-ink uppercase tracking-wider w-14 text-center">결과</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.majorAnswers.map((item, i) => (
                    <tr
                      key={i}
                      style={{
                        background: item.score === 100 ? '#F0FDF4' : item.score === 0 ? '#FEF2F2' : item.score === 50 ? '#FFF7ED' : '#fff',
                      }}
                    >
                      <td className="border border-line px-3 py-2.5 text-[12px] font-semibold text-center text-ink-secondary">{i + 1}</td>
                      <td className="border border-line px-3 py-2.5 text-[12px] font-medium text-ink leading-[1.5]">{item.question}</td>
                      <td className="border border-line px-3 py-2.5 text-[12px] font-medium text-ink-secondary">{item.answer || '-'}</td>
                      <td className="border border-line px-3 py-2.5 text-center text-[16px] font-extrabold">
                        {item.score === 100 ? <span className="text-green-600">○</span> :
                         item.score === 50 ? <span className="text-orange-500">△</span> :
                         item.score === 0 ? <span className="text-red-500">✕</span> : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}