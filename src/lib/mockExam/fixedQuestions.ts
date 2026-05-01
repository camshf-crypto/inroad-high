// ════════════════════════════════════════════════════════════
// 모의고사 회차별 고정 질문 (Q4, Q5)
// ════════════════════════════════════════════════════════════
//
// 9개 회차 × 2개 = 18개 고정 질문
//   - 고1 / 고2 / 고3 × 2월말 / 8월말 / 10월말
//
// 모의고사 본 질문 구조:
//   Q1. 자기소개 (2분, 꼬리 X)              ← 모든 학생 동일
//   Q2-Q3. 생기부 기반 (2분 + 꼬리 1.5분)   ← 학생별 랜덤 추출
//   Q4-Q5. 회차별 고정 (2분 + 꼬리 1.5분)   ← 이 파일!
//
// 수정 방법:
//   - 그냥 이 파일에서 questionText 고치고 저장하면 끝
//   - 추후 원장이 직접 수정해야 할 필요가 생기면
//     같은 데이터 구조로 Supabase 테이블로 옮기면 됨
//
// 설계 의도:
//   - 고1: 자기 탐색, 진로 동기 형성기 → 가치관과 경험 묻기
//   - 고2: 심화 활동 본격화 → 전공 적합성, 사고의 깊이
//   - 고3: 입시 대비 → 비전, 사회 인식, 학업 태도
//
//   Q4: 경험·스토리 중심 (답하기 비교적 쉬움)
//   Q5: 가치관·사고력 중심 (생각이 필요함)
// ════════════════════════════════════════════════════════════

export type Grade = '고1' | '고2' | '고3'
export type Period = '2월말' | '8월말' | '10월말'

export interface FixedQuestion {
  order: 4 | 5
  questionText: string
  type: string         // 인성 / 전공 / 진로 / 학업 / 탐구 / 독서 / 성장 / 활동 / 전공연계 / 지원동기
  description?: string // 원장용 메모: 왜 이 시기에 이 질문인지
}

// ─────────────────────────────────────────────
// 메인 데이터: grade → period → [Q4, Q5]
// ─────────────────────────────────────────────
export const MOCK_EXAM_FIXED_QUESTIONS: Record<
  Grade,
  Record<Period, FixedQuestion[]>
> = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 고1 - 방향 설정의 시기
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  '고1': {
    '2월말': [
      {
        order: 4,
        type: '인성',
        questionText:
          '본인의 가장 큰 장점과 단점은 무엇이고, 단점을 보완하기 위해 어떤 노력을 하고 있나요?',
        description: '고1 출발선: 자기 객관화 능력 점검',
      },
      {
        order: 5,
        type: '진로',
        questionText:
          '고등학교에 입학한 지 얼마 되지 않았는데, 본인이 가장 이루고 싶은 목표 한 가지를 구체적으로 말씀해 주세요.',
        description: '방향성 점검: 막연한 목표가 아니라 구체적 그림이 있는지',
      },
    ],
    '8월말': [
      {
        order: 4,
        type: '학업',
        questionText:
          '1학기 동안 가장 인상 깊었던 수업이나 활동이 있다면, 무엇이고 왜 인상 깊었는지 말씀해 주세요.',
        description: '경험 기반: 학습 태도와 호기심',
      },
      {
        order: 5,
        type: '진로',
        questionText:
          '본인이 관심 있는 분야에서 최근 사회적으로 이슈가 된 사건 하나를 들고, 본인의 생각을 말씀해 주세요.',
        description: '시사 인식 + 자기 의견',
      },
    ],
    '10월말': [
      {
        order: 4,
        type: '성장',
        questionText:
          '올해 본인이 가장 성장했다고 느낀 부분과, 그 변화가 어떤 계기로 일어났는지 말씀해 주세요.',
        description: '1년 회고: 변화를 자각하고 원인을 짚는지',
      },
      {
        order: 5,
        type: '진로',
        questionText:
          '고2가 되면 본인이 가장 집중하고 싶은 한 가지 주제는 무엇이며, 왜 그것을 선택했나요?',
        description: '다음 학년 로드맵: 막연한 다짐이 아닌 구체적 선택',
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 고2 - 심화의 시작
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  '고2': {
    '2월말': [
      {
        order: 4,
        type: '전공연계',
        questionText:
          '지금까지 본인이 한 활동 중 지원하고자 하는 전공과 가장 잘 연결된다고 생각하는 활동은 무엇이고, 어떤 점에서 그렇게 연결되나요?',
        description: '전공 적합성 자각도',
      },
      {
        order: 5,
        type: '전공',
        questionText:
          '본인이 지원하려는 전공 분야가 사회에서 갖는 의미는 무엇이라고 생각하나요?',
        description: '거시적 시야: 흥미를 넘어 사회적 가치까지',
      },
    ],
    '8월말': [
      {
        order: 4,
        type: '탐구',
        questionText:
          '본인이 진행했던 탐구 활동이나 프로젝트 중 가장 어려웠던 것 하나를 골라, 어떻게 해결했는지 말씀해 주세요.',
        description: '문제 해결력: 어려움을 회피하지 않고 과정을 설명',
      },
      {
        order: 5,
        type: '독서',
        questionText:
          '최근 읽은 전공 관련 책이나 논문 중 본인의 생각을 바꾼 것이 있다면, 어떤 점이 어떻게 바뀌었나요?',
        description: '내면화 능력: 단순 요약이 아닌 생각의 변화',
      },
    ],
    '10월말': [
      {
        order: 4,
        type: '활동',
        questionText:
          '본인의 생기부 활동 중 한 가지를 면접관에게 30초 안에 소개한다면, 무엇을 어떻게 소개하시겠어요?',
        description: '핵심 압축력: 자기 강점을 짧게 (실전 면접 대비)',
      },
      {
        order: 5,
        type: '전공연계',
        questionText:
          '본인이 지원하려는 학과의 인재상과 본인이 어떻게 부합한다고 생각하는지 구체적인 근거를 들어 말씀해 주세요.',
        description: '학과 분석 + 자기 매칭',
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 고3 - 입시 원년
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  '고3': {
    '2월말': [
      {
        order: 4,
        type: '지원동기',
        questionText:
          '본인이 이 대학, 이 학과를 지원하는 가장 본질적인 이유 한 가지를 말씀해 주세요.',
        description: '지원동기 핵심: 화려한 수식 없이 진짜 이유',
      },
      {
        order: 5,
        type: '진로',
        questionText:
          '입학 후 4년 동안 가장 도전해 보고 싶은 한 가지가 있다면, 무엇이고 왜 그것을 선택했나요?',
        description: '입학 이후 비전: 단순 합격이 목표가 아닌 그 너머',
      },
    ],
    '8월말': [
      {
        order: 4,
        type: '인성',
        questionText:
          '학교생활을 하면서 본인의 의견과 다른 사람의 의견이 충돌했던 경험이 있다면, 어떻게 풀어 나갔는지 말씀해 주세요.',
        description: '갈등 해결력 + 협업 태도',
      },
      {
        order: 5,
        type: '전공',
        questionText:
          '본인이 지원하는 전공 분야에서 앞으로 10년 안에 가장 큰 변화가 일어날 영역은 어디라고 보며, 그 근거는 무엇인가요?',
        description: '미래 통찰 + 근거 제시: 트렌드 나열이 아닌 본인 분석',
      },
    ],
    '10월말': [
      {
        order: 4,
        type: '성장',
        questionText:
          '지난 3년간의 고등학교 생활을 한 문장으로 정의한다면 어떻게 표현하시겠어요?',
        description: '자기 서사 압축: 3년을 한 마디로',
      },
      {
        order: 5,
        type: '인성',
        questionText:
          '면접관이 본인을 합격시켜야 하는 가장 결정적인 이유 한 가지가 있다면, 무엇인가요?',
        description: '실전 마지막 질문 대비: 자기 확신과 차별점',
      },
    ],
  },
}

// ─────────────────────────────────────────────
// 헬퍼: 회차별 Q4-Q5 가져오기
// ─────────────────────────────────────────────
//
// 사용 예 (학생 MockExam.tsx에서):
//   const fixed = getFixedQuestions(exam.grade, exam.period)
//   // → [{order: 4, type: '인성', questionText: '...'}, {order: 5, ...}]
//
// 잘못된 grade/period 들어오면 빈 배열 반환 (안전)

export function getFixedQuestions(
  grade: string,
  period: string
): FixedQuestion[] {
  const gradeMap = MOCK_EXAM_FIXED_QUESTIONS[grade as Grade]
  if (!gradeMap) return []
  const periodList = gradeMap[period as Period]
  if (!periodList) return []
  return periodList
}

// ─────────────────────────────────────────────
// 헬퍼: 모든 회차 질문을 평면 배열로
// ─────────────────────────────────────────────
//
// 어드민에서 전체 보기/검색 등에 활용
//
// 사용 예:
//   const all = getAllFixedQuestions()
//   // → [{grade:'고1', period:'2월말', order:4, ...}, ...] 18개

export interface FixedQuestionFlat extends FixedQuestion {
  grade: Grade
  period: Period
}

export function getAllFixedQuestions(): FixedQuestionFlat[] {
  const result: FixedQuestionFlat[] = []
  ;(Object.keys(MOCK_EXAM_FIXED_QUESTIONS) as Grade[]).forEach((grade) => {
    const gradeMap = MOCK_EXAM_FIXED_QUESTIONS[grade]
    ;(Object.keys(gradeMap) as Period[]).forEach((period) => {
      gradeMap[period].forEach((q) => {
        result.push({ grade, period, ...q })
      })
    })
  })
  return result
}