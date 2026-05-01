// supabase/functions/ai-generate-mock-report/index.ts
// 모의고사 리포트 생성 (GPT-4o 기반) - v4 완전 AI 맞춤화
//
// v4 핵심 변화:
//   1. 강점을 "답변 복붙"이 아닌 "무엇이 왜 강점인지 분석" 형식으로 강제
//   2. 시기별 가이드 / 생기부 방향성 / 다음 회차 계획도 AI가 학생 맞춤 생성
//   3. 기존 v3의 학부모 마케팅 강화 + 6개 세부지표 + 회차별 컨텍스트 유지

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface QA {
  order: number
  question: string
  answer: string | null
  type?: string | null
  is_tail?: boolean
  parent_order?: number
}

interface MajorQA {
  order: number
  question: string
  question_type: string
  student_answer: string | null
  correct_answer: string
  score: number | null
}

interface Body {
  exam: {
    grade: string
    period: string
    exam_type?: string | null
    major_level?: string | null
    target_university?: string | null
    target_department?: string | null
  }
  interviewQAs: QA[]
  majorQAs: MajorQA[]
  prevReport?: { period: string; total: number; scores?: any; detailed_scores?: any } | null
}

// ═══════════════════════════════════════════════════════════
// 회차별 평가 컨텍스트 + 본사 커리큘럼 정보
// ═══════════════════════════════════════════════════════════

interface EvaluationContext {
  stage: string
  focus: string
  expectations: string
  strictness: 'gentle' | 'normal' | 'strict'
  scoreRangeHint: string
  parentTone: string
  curriculumDone: string         // 이번 회차 직전까지 학원이 한 일
  curriculumNext: string         // 다음 회차까지 학원이 할 일
  upcomingMonths: string         // 다음 회차까지의 기간 (예: "9월~10월")
}

const EVAL_CONTEXT: Record<string, EvaluationContext> = {

  '고1_8월말': {
    stage: '고1 첫 모의면접 - 출발선 점검',
    focus: '학과 적합도 진단 결과와 답변의 일관성, 자기소개·지원동기 답변의 기본 구조, 1학기 탐구 활동의 답변 녹아듬, 여름방학 면접 기초 훈련의 효과',
    expectations: '면접 경험이 적은 시기. 답변 완성도보다 방향성과 진정성이 중요.',
    strictness: 'gentle',
    scoreRangeHint: '대부분 60~75 사이. 80+은 신중하게.',
    parentTone: '시작이 중요. 격려와 방향 제시 위주.',
    curriculumDone: '학과 적합도 정밀진단(200문항), 진로진학 AI 학과 탐색, 세특라이트 1학기 탐구주제 설계, 7월 스피치 훈련 + 자기소개·지원동기 답변 초안, 8월 면접 시뮬레이션 첫 체험',
    curriculumNext: '9월 2학기 탐구주제 실행 시작, 10월 지원 희망 대학 기출문제 첫 경험, 학과별 기출 집중 풀기, 꼬리질문 어떤 게 나오는지 패턴 파악, 스피치 훈련 심화',
    upcomingMonths: '9월~10월',
  },

  '고1_10월말': {
    stage: '고1 마무리 - 1년 누적 성과',
    focus: '8~10월 기출 학습 결과(학과 전문성 녹아듬), 꼬리질문 대응력, 1년 누적 탐구 활동의 스토리라인, 스피치 심화 훈련 결과',
    expectations: '8월말 시험 대비 명확한 성장. 기출 첫 경험과 꼬리질문 패턴이 답변에 드러나야 함.',
    strictness: 'gentle',
    scoreRangeHint: '대부분 65~80 사이. 1년 성장이 명확하면 80+.',
    parentTone: '1년 성과 인정 + 고2 진입 보완점.',
    curriculumDone: '지원 희망 대학 기출문제 첫 경험, 학과별 기출 집중, 꼬리질문 패턴 파악, 스피치 심화 훈련, 1년 탐구활동 정리',
    curriculumNext: '12월 1년 탐구활동 정리 → 생기부 업로드 → 예상질문 뽑기, 꼬리질문 대비 연습, 실전 면접 시뮬레이션 1회, 고2 겨울방학 커리큘럼 설계 (학과 확정 + 심화 탐구 방향)',
    upcomingMonths: '11월~12월',
  },

  '고2_2월말': {
    stage: '고2 출발 - 심화 진입',
    focus: '고1-고2 연결 스토리, 학과 확정 후 심화 탐구주제의 논리성, 고1 생기부 갭 분석, 진로진학 AI 심화 독서 활용도',
    expectations: '학과 확정 + 심화 탐구주제 선정 이유 명확. 고1 활동을 고2와 연결시키는 사고력.',
    strictness: 'normal',
    scoreRangeHint: '대부분 65~80 사이.',
    parentTone: '입시 본게임 전초전. 압박보다 전략적 관점.',
    curriculumDone: '고1 생기부 갭 분석, 학과 확정 후 고2 탐구 재설계, 세특라이트 학과 맞춤 심화 탐구, 전공특화문제 심화 (고1 부족 부분 보완), 진로진학 AI 심화 독서 리스트',
    curriculumNext: '3월 심화 탐구주제 실행 시작, 5월 수행평가 + 면접 답변 초안 동시 작성, 7월 1학기 생기부 업로드 → 예상 면접질문 전체 뽑기, 지원 희망 대학 기출 분석 시작',
    upcomingMonths: '3월~7월',
  },

  '고2_8월말': {
    stage: '고2 면접 실전 본격화',
    focus: '여름방학 시뮬레이션 2~3회 반복 결과, 1학기 생기부 기반 예상질문 답변 완성도, 지원 대학 기출 분석(학과 패턴 인식), 꼬리질문 학과 맞춤 심화',
    expectations: '답변이 매끄럽고 학과 패턴이 보여야 함. 시뮬레이션 효과로 말의 속도/태도 개선.',
    strictness: 'normal',
    scoreRangeHint: '대부분 70~85 사이. 여름 훈련 잘 반영되면 85+.',
    parentTone: '실전 본격화 성과 + 입시까지 잔여 시간 강조.',
    curriculumDone: '7월 1학기 생기부 업로드 → 예상 면접질문 전체 뽑기, 8월 실전 시뮬레이션 2~3회 반복 + 영상·음성 분석, 지원 대학 기출 집중 분석, SKY·교대 제시문 면접 시작',
    curriculumNext: '10월 2학기 탐구활동 실행(고1-고2 연결성 완성), 지원 대학 기출 2~3회차 반복, 제시문 심화 답변 완성도 높이기, 꼬리질문 실전 연습 + 스피치 업그레이드',
    upcomingMonths: '9월~10월',
  },

  '고2_10월말': {
    stage: '고2 마무리 - 면접 90% 완성',
    focus: '지원 대학 기출 패턴 체화, 꼬리질문 실전 일관성, 2학기 탐구활동까지 포함한 고1-고2 연결성, SKY·교대 제시문 답변 완성도',
    expectations: '답변 흔들림 없음. 학과 스토리 자연스러운 흐름. 꼬리질문에서 자기 페이스 유지.',
    strictness: 'normal',
    scoreRangeHint: '대부분 70~85 사이. 완성도 90% 수준이면 85+.',
    parentTone: '고3 진입 직전 결정적 시점. 마지막 도약 액션 제시.',
    curriculumDone: '2학기 탐구활동 실행, 지원 대학 기출 2~3회차 반복, 제시문 심화 답변, 꼬리질문 실전 + 스피치 업그레이드',
    curriculumNext: '12월 고1~고2 전체 생기부 예상질문 총정리, 실전 면접 시뮬레이션 3회 이상, 부족한 전공 지식 마지막 점검, 고3 로드맵 설계 (지원 대학 최종 확정)',
    upcomingMonths: '11월~12월',
  },

  '고3_2월말': {
    stage: '고3 입시 원년 출발',
    focus: '마지막 탐구주제 선정의 논리성, 고1·고2 누적 활동 답변 녹아듬, 면접 답변 방향 설계 결과, 지원 대학 범위 답변 톤',
    expectations: '학과 스토리 완결. 핵심 메시지 1줄 요약 가능. 입시 무게감 인식.',
    strictness: 'normal',
    scoreRangeHint: '대부분 70~85 사이.',
    parentTone: '입시 원년 무게감. 격려 + 명확한 액션 플랜.',
    curriculumDone: '세특라이트 마지막 탐구주제, 진로진학 AI 독서 + 탐구 방향 최종 점검, 전공특화문제 기초 점검, 고1·고2 연결 스토리 최종 점검',
    curriculumNext: '5월 생기부 완성본 업로드 → 예상 면접질문 전체 뽑기, 지원 대학 확정 + 5개년 기출문제 분석 시작, 스피치 훈련, 7월 생기부 예상질문 전체 답변 + 대학별 맞춤 분석',
    upcomingMonths: '3월~7월',
  },

  '고3_8월말': {
    stage: '고3 수시 면접 직전 - 최종 완성',
    focus: '5개년 기출 분석(지원 대학 패턴 완전 체화), 생기부 예상질문 + 대학별 맞춤 분석 완성도, 시뮬레이션 3~5회 반복 결과, 면접 전날 루틴',
    expectations: '거의 완벽. 어떤 질문도 흔들림 없이. 대학별 맞춤 답변 차이 명확.',
    strictness: 'strict',
    scoreRangeHint: '대부분 75~90 사이. 합격권이면 90+. 부족하면 70 이하.',
    parentTone: '수시 직전 긴장감 + 자신감 부여.',
    curriculumDone: '5개년 기출 집중 완성, 생기부 예상질문 전체 답변 + 대학별 맞춤 분석, 시뮬레이션 3~5회 반복 + 영상·음성 분석 후 약점 보완, SKY·교대 제시문 + 꼬리질문 최종',
    curriculumNext: '10월 면접 일정 확인 + 대학별 맞춤 최종 점검, 면접 전날 시뮬레이션 1회, 앞선 면접 피드백 즉시 반영, SKY·교대 제시문 면접 최종 점검',
    upcomingMonths: '9월~10월',
  },

  '고3_10월말': {
    stage: '고3 실제 면접 직전 - 최종 리허설',
    focus: '대학별 맞춤 답변, 긴장감 조절, 컨디션 관리, 앞선 시험 피드백 즉각 반영',
    expectations: '본 면접까지 며칠. 새 시도보다 안정화. 모든 답변이 "내 것"이어야 함.',
    strictness: 'normal',
    scoreRangeHint: '대부분 75~90 사이. 약점은 부드럽게(자신감 손상 방지).',
    parentTone: '면접 직전. 자신감 + 응원 메인. 비판 최소화.',
    curriculumDone: '면접 일정 확인 + 대학별 맞춤 최종 점검, 면접 전날 시뮬레이션, 앞선 면접 피드백 즉시 반영, SKY·교대 제시문 최종',
    curriculumNext: '실제 수시 면접 응시 → 합격 후 마무리 또는 정시 대비 추가 전략, 합격 후기 공유, 고등학교 생활 마무리',
    upcomingMonths: '11월~12월',
  },
}

const FALLBACK_CONTEXT: EvaluationContext = {
  stage: '모의면접 회차 점검',
  focus: '면접 답변 논리성, 학과 이해도, 꼬리질문 대응력',
  expectations: '회차에 맞는 적절한 답변 수준',
  strictness: 'normal',
  scoreRangeHint: '대부분 65~80 사이',
  parentTone: '균형 있는 격려와 방향 제시',
  curriculumDone: '본사 커리큘럼의 단계별 미션 진행',
  curriculumNext: '다음 회차 미션 진행',
  upcomingMonths: '다음 회차까지',
}

function getEvalContext(grade: string, period: string): EvaluationContext {
  return EVAL_CONTEXT[`${grade}_${period}`] ?? FALLBACK_CONTEXT
}

// ═══════════════════════════════════════════════════════════
// 시스템 프롬프트 (v4 - 완전 AI 맞춤화)
// ═══════════════════════════════════════════════════════════

function buildSystemPrompt(ctx: EvaluationContext, isFirst: boolean): string {
  return `너는 한국 대학 입시 모의면접 평가 전문가다. 학생의 면접 답변과 전공특화 시험을 분석해 학원의 모의면접 결과 리포트를 작성한다.

═══════════════════════════════════════════════════════
【⚠️ 가장 중요한 원칙 - 절대 어기지 말 것】
═══════════════════════════════════════════════════════

이 보고서는 **학부모가 읽고 학원을 계속 다닐지 결정**하는 자료다.

1. **학생의 성장이 눈에 보이도록** 구체적으로 표현 (수치/사례/전후 비교)
2. **본사 커리큘럼이 만든 효과**를 자연스럽게 드러냄 (셀프-마케팅처럼 어색하지 않게)
3. **다음 회차/대학 합격까지의 거리**를 명확히 보여줘 학부모가 미래를 그릴 수 있게
4. 솔직한 약점도 짚되, 반드시 **"이렇게 보완하면 된다"**까지 함께
5. 일반론 절대 금지. 학생의 실제 답변을 직접 인용해서 구체화

═══════════════════════════════════════════════════════
【⚠️ 강점·약점 작성 규칙 - 매우 중요】
═══════════════════════════════════════════════════════

❌ 절대 하지 말 것:
- 학생 답변 문장을 그대로 복사·붙여넣기 (예: "안녕하십니까 반갑습니다.")
- 답변 인용만 하고 분석 없음

✅ 반드시 할 것:
- "무엇이 왜 강점/약점인지" 분석으로 작성
- 학생 답변의 어떤 표현/맥락에서 그 강점이 보이는지 짧게 인용 후 분석
- 분석 = 어떤 능력/태도가 드러났는지, 어떤 관점이 보였는지

❌ 잘못된 강점 예시:
"안녕하십니까 반갑습니다."

✅ 올바른 강점 예시:
"자기소개 첫 문장에서 정중한 인사로 시작해 면접 분위기를 안정적으로 잡는 모습을 보여주었습니다. 긴장된 상황에서도 침착함을 유지하는 태도가 인성 평가에서 긍정적 인상을 줍니다."

❌ 잘못된 강점 예시:
"저는 지수 함수를 통한 상권 분석으로 마케팅에 활용한 법을 배웠습니다."

✅ 올바른 강점 예시:
"수학(지수 함수)을 마케팅 실무(상권 분석)에 응용하려는 시도가 돋보입니다. 단순 교과 학습을 넘어 학과(경영) 적합성을 자기 활동으로 보여주는 태도는 고2 심화 단계에서 특히 가치 있는 강점입니다."

═══════════════════════════════════════════════════════
【이번 회차의 평가 컨텍스트】
═══════════════════════════════════════════════════════

▶ 평가 단계: ${ctx.stage}
▶ 핵심 평가 관점: ${ctx.focus}
▶ 기대 수준: ${ctx.expectations}
▶ 평가 엄격도: ${
    ctx.strictness === 'gentle'
      ? '관대하게. 발전 단계 학생이므로 격려 위주. 약점도 다음 단계에서 보완 가능하다고 명시.'
      : ctx.strictness === 'strict'
      ? '엄격하게. 입시까지 시간이 얼마 남지 않음. 단 인격 비하 금지 + 액션 플랜은 반드시 함께.'
      : '균형 있게. 강점·약점을 정확히 짚되 건설적으로.'
  }
▶ 점수 가이드: ${ctx.scoreRangeHint}
▶ 학부모 톤: ${ctx.parentTone}

【본사 커리큘럼 - 이번 회차 직전까지 진행한 것】
${ctx.curriculumDone}

【본사 커리큘럼 - 다음 회차(${ctx.upcomingMonths})까지 진행할 것】
${ctx.curriculumNext}

═══════════════════════════════════════════════════════
【출력 JSON 스키마】
═══════════════════════════════════════════════════════

반드시 아래 JSON으로만 출력 (다른 텍스트, 마크다운 펜스 금지):

{
  "scores": {
    "인성": <number 0~100>,
    "전공적합성": <number 0~100>,
    "발전가능성": <number 0~100>,
    "total": <number 0~100, 위 3개 평균>
  },

  "detailed_scores": {
    "답변_구체성": <number 1~10>,
    "학과_전문성": <number 1~10>,
    "스토리_일관성": <number 1~10>,
    "꼬리질문_대응력": <number 1~10>,
    "표현_안정감": <number 1~10>,
    "메타인지": <number 1~10>
  },

  "strengths": [
    "<강점 1: 학생 답변에서 발견된 능력/태도/관점을 분석. 답변 그대로 복붙 금지. 80~150자>",
    "<강점 2>",
    "<강점 3>"
  ],

  "weaknesses": [
    "<약점 1: 약점 + 보완 방법까지 한 줄. 예: 'X가 부족 → Y하면 개선'. 80~150자>",
    "<약점 2>"
  ],

  "summary_for_parents": "<3~5문장. 학부모 톤 반영. 250~400자. 반드시:
    1) 이번 회차 핵심 성과 1개
    2) 본사 커리큘럼 효과가 드러난 부분 1개
    3) 다음 회차/대학 합격까지의 명확한 그림 1개>",

  "growth_narrative": {
    "stage_label": "<현재 단계 한 단어 라벨. 예: '입문', '심화 진입', '실전 본격화', '완성도 다지기', '최종 리허설'>",
    "from_to": "<시작점 → 현재 → 다음 목표 1문장>",
    "key_moment": "<이번 회차에서 가장 인상적인 성장 순간. 학생 답변 내용 직접 언급. 80~150자>",
    "compared_to_prev": ${
      isFirst
        ? '"첫 회차이므로 비교 데이터 없음. 출발선 명시."'
        : '"<이전 회차 대비 변화 구체적으로. 80~150자>"'
    }
  },

  "curriculum_effect": {
    "highlight": "<이번 회차 직전 본사 미션 중 답변에 가장 잘 녹아든 것 1~2개를 자연스럽게. 사실 진술처럼. 100~180자>",
    "evidence_quote": "<학생 답변 중 효과 드러나는 표현 일부 인용. 30~80자>",
    "next_curriculum": "<다음 회차까지 진행할 본사 미션을 학생 약점에 맞게 안내. 100~150자>"
  },

  "future_projection": {
    "next_period_score_estimate": <number 0~100>,
    "next_period_growth_focus": "<다음 회차 가장 큰 성장이 예상되는 영역과 근거. 80~150자>",
    "trajectory_assessment": "<'on-track' / 'needs-acceleration' / 'excellent' 중 하나로 시작 + 부연. 100~180자>",
    "milestone_distance": "<목표 대학(또는 일반 합격선)까지 거리감을 거리/퍼센트로. 예: '현재 합격선의 70% 도달. X, Y 보완하면 90% 가능'. 100~180자>"
  },

  "season_guide_ai": {
    "title": "<이번 회차에 어울리는 짧은 제목. 예: '🌱 첫 출발 점검', '🌸 심화 진입의 시기', '🎯 입시 원년 출발', '☀️ 수시 직전 최종'. 학생 상황 반영해서 약간 변형 가능>",
    "subtitle": "<1줄 요약 부제목. 학생 현재 상태와 시기적 의미 결합. 30~60자>",
    "content": [
      "<이번 회차 점검 포인트 1: 학생 답변에서 드러난 구체적 사항. 50~100자>",
      "<포인트 2>",
      "<포인트 3>",
      "<포인트 4>"
    ]
  },

  "saenggibu_direction_ai": {
    "자율활동": [
      "<학생 약점·강점 보고 자율활동에서 보완할 것 1: 50~80자>",
      "<항목 2>",
      "<항목 3>"
    ],
    "동아리": [
      "<학과(${ctx.upcomingMonths.includes('11월') || ctx.upcomingMonths.includes('9월') ? '본 회차 시점 기준' : ''}) 연결 동아리 활동 제안 1: 학생 답변에서 부족한 부분 보강 위주. 50~80자>",
      "<항목 2>",
      "<항목 3>"
    ],
    "진로독서": [
      "<학생 답변에서 드러난 학과 이해 수준에 맞춘 독서 방향 1: 50~80자>",
      "<항목 2>",
      "<항목 3>"
    ],
    "세특": [
      "<학생 답변 강약점 반영한 교과별 세특 방향 1: 50~80자>",
      "<항목 2>",
      "<항목 3>"
    ]
  },

  "next_period_plan_ai": "<다음 회차까지 학생 맞춤 액션 플랜. 본사 커리큘럼(${ctx.curriculumNext})을 참고하되 학생의 이번 회차 약점·부족함을 보완하는 방향으로 구체화. 4~6문장. 350~600자>",

  "university_fit": {
    "fit_score": <number 0~100>,
    "reason": "<왜 이 점수인지, 무엇이 더 필요한지 1~2문장>"
  }
}

목표 대학이 명시되지 않았으면 "university_fit"는 null로.
JSON 외 다른 텍스트는 절대 포함하지 않는다.`
}

// ═══════════════════════════════════════════════════════════
// 메인 핸들러
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY가 설정되어 있지 않습니다.')

    const body: Body = await req.json()
    const { exam, interviewQAs, majorQAs, prevReport } = body

    if (!exam || !interviewQAs || interviewQAs.length === 0) {
      throw new Error('필수 입력값이 없습니다.')
    }

    const evalCtx = getEvalContext(exam.grade, exam.period)
    const isFirst = !prevReport

    // ── 면접 텍스트 빌드 ──
    const interviewText = interviewQAs.map(qa => {
      const role = qa.is_tail ? `꼬리질문 (Q${qa.parent_order}의 후속)` : `본 질문 Q${qa.order}`
      const type = qa.type ? ` [${qa.type}]` : ''
      const answer = qa.answer?.trim() || '(답변 없음)'
      return `▶ ${role}${type}\n질문: ${qa.question}\n학생 답변: ${answer}`
    }).join('\n\n')

    // ── 전공특화 텍스트 빌드 ──
    const totalMajor = majorQAs.length
    const correctMajor = majorQAs.filter(m => m.score === 100).length
    const halfMajor = majorQAs.filter(m => m.score === 50).length
    const wrongMajor = majorQAs.filter(m => m.score === 0).length
    const ungraded = majorQAs.filter(m => m.score === null).length
    const majorAvg = totalMajor > 0
      ? Math.round(majorQAs.reduce((sum, m) => sum + (m.score ?? 0), 0) / totalMajor)
      : 0

    const majorText = majorQAs.length > 0
      ? majorQAs.map(m => {
          const scoreLabel = m.score === 100 ? '○ 정답' : m.score === 50 ? '△ 부분정답' : m.score === 0 ? '✕ 오답' : '미채점'
          return `Q${m.order}: ${m.question}\n학생 답변: ${m.student_answer || '(답변 없음)'}\n정답: ${m.correct_answer}\n채점: ${scoreLabel}`
        }).join('\n\n')
      : '(전공특화 문제 없음)'

    // ── 이전 회차 비교 ──
    const prevText = prevReport
      ? `이전 회차(${prevReport.period}) 종합점수: ${prevReport.total}점
이전 카테고리: 인성 ${prevReport.scores?.['인성'] ?? '-'}점 / 전공적합성 ${prevReport.scores?.['전공적합성'] ?? '-'}점 / 발전가능성 ${prevReport.scores?.['발전가능성'] ?? '-'}점${prevReport.detailed_scores
        ? `
이전 세부지표: ${Object.entries(prevReport.detailed_scores).map(([k, v]) => `${k} ${v}/10`).join(' / ')}`
        : ''}`
      : '(이전 회차 없음 - 첫 시험)'

    // ── 시스템 프롬프트 ──
    const systemPrompt = buildSystemPrompt(evalCtx, isFirst)

    // ── 유저 프롬프트 ──
    const userPrompt = `다음 학생의 모의면접 회차 데이터를 분석해서 학부모용 리포트를 작성해줘.

【학생 정보】
- 학년: ${exam.grade}
- 회차: ${exam.period}
- 시험 유형: ${exam.exam_type ?? '-'}
- 전공 레벨: ${exam.major_level ?? '-'}
- 목표 대학: ${exam.target_university ?? '미정'}
- 목표 학과: ${exam.target_department ?? '미정'}

【1단계: 면접 답변】
${interviewText}

【2단계: 전공특화 시험 결과】
총 ${totalMajor}문제 / 정답 ${correctMajor} / 부분정답 ${halfMajor} / 오답 ${wrongMajor} / 미채점 ${ungraded} / 평균: ${majorAvg}점

상세:
${majorText}

【이전 회차 비교】
${prevText}

【⚠️ 작성 시 절대 잊지 말 것】
- 학부모가 읽음 → 성장이 보여야 한다
- 강점은 답변 복붙이 아닌 분석으로
- 본사 커리큘럼 효과를 자연스럽게 드러낸다
- 다음 단계와 합격까지의 그림을 구체적으로
- 약점은 반드시 "이렇게 보완하면 된다"와 함께
- season_guide_ai / saenggibu_direction_ai / next_period_plan_ai 모두 학생 답변 분석 기반으로 맞춤 작성

위 모든 정보를 종합해서 시스템 프롬프트의 JSON 스키마로 출력해줘.`

    // ── OpenAI 호출 ──
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 5000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`OpenAI API 오류 (${resp.status}): ${errText}`)
    }

    const data = await resp.json()
    const rawContent: string = data.choices?.[0]?.message?.content || ''

    // ── JSON 파싱 ──
    let parsed: any
    try {
      parsed = JSON.parse(rawContent)
    } catch (e) {
      const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      parsed = JSON.parse(cleaned)
    }

    // ── 후처리 + 검증 ──
    const scores = parsed.scores || {}
    const ds = parsed.detailed_scores || {}

    const result = {
      scores: {
        인성: clamp100(scores['인성'] ?? 70),
        전공적합성: clamp100(scores['전공적합성'] ?? 70),
        발전가능성: clamp100(scores['발전가능성'] ?? 70),
        total: 0,
      },
      detailed_scores: {
        답변_구체성: clamp10(ds['답변_구체성'] ?? 6),
        학과_전문성: clamp10(ds['학과_전문성'] ?? 6),
        스토리_일관성: clamp10(ds['스토리_일관성'] ?? 6),
        꼬리질문_대응력: clamp10(ds['꼬리질문_대응력'] ?? 6),
        표현_안정감: clamp10(ds['표현_안정감'] ?? 6),
        메타인지: clamp10(ds['메타인지'] ?? 6),
      },
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 3) : [],
      summary_for_parents: typeof parsed.summary_for_parents === 'string'
        ? parsed.summary_for_parents
        : '',
      growth_narrative: {
        stage_label: parsed.growth_narrative?.stage_label || '',
        from_to: parsed.growth_narrative?.from_to || '',
        key_moment: parsed.growth_narrative?.key_moment || '',
        compared_to_prev: parsed.growth_narrative?.compared_to_prev || '',
      },
      curriculum_effect: {
        highlight: parsed.curriculum_effect?.highlight || '',
        evidence_quote: parsed.curriculum_effect?.evidence_quote || '',
        next_curriculum: parsed.curriculum_effect?.next_curriculum || '',
      },
      future_projection: {
        next_period_score_estimate: clamp100(
          parsed.future_projection?.next_period_score_estimate ?? 70
        ),
        next_period_growth_focus: parsed.future_projection?.next_period_growth_focus || '',
        trajectory_assessment: parsed.future_projection?.trajectory_assessment || '',
        milestone_distance: parsed.future_projection?.milestone_distance || '',
      },
      // 🆕 v4: AI가 만드는 시기별 가이드
      season_guide_ai: {
        title: parsed.season_guide_ai?.title || '',
        subtitle: parsed.season_guide_ai?.subtitle || '',
        content: Array.isArray(parsed.season_guide_ai?.content)
          ? parsed.season_guide_ai.content
          : [],
      },
      // 🆕 v4: AI가 만드는 생기부 방향성
      saenggibu_direction_ai: {
        자율활동: Array.isArray(parsed.saenggibu_direction_ai?.자율활동)
          ? parsed.saenggibu_direction_ai.자율활동
          : [],
        동아리: Array.isArray(parsed.saenggibu_direction_ai?.동아리)
          ? parsed.saenggibu_direction_ai.동아리
          : [],
        진로독서: Array.isArray(parsed.saenggibu_direction_ai?.진로독서)
          ? parsed.saenggibu_direction_ai.진로독서
          : [],
        세특: Array.isArray(parsed.saenggibu_direction_ai?.세특)
          ? parsed.saenggibu_direction_ai.세특
          : [],
      },
      // 🆕 v4: AI가 만드는 다음 회차 계획
      next_period_plan_ai: typeof parsed.next_period_plan_ai === 'string'
        ? parsed.next_period_plan_ai
        : '',
      university_fit: parsed.university_fit && exam.target_university
        ? {
            university: exam.target_university,
            department: exam.target_department || '',
            fit_score: clamp100(parsed.university_fit.fit_score ?? 70),
            reason: parsed.university_fit.reason || '',
          }
        : null,
    }
    result.scores.total = Math.round(
      (result.scores.인성 + result.scores.전공적합성 + result.scores.발전가능성) / 3
    )

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('[ai-generate-mock-report] 에러:', e)
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function clamp100(n: number, min = 0, max = 100): number {
  if (Number.isNaN(n)) return 70
  return Math.max(min, Math.min(max, Math.round(n)))
}

function clamp10(n: number, min = 1, max = 10): number {
  if (Number.isNaN(n)) return 6
  return Math.max(min, Math.min(max, Math.round(n)))
}