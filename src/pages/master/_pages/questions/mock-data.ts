// 학년 타입
export type Grade = 'high' | 'middle'
export type SchoolYear = 1 | 2 | 3

// 인로드 답변 공식 (67개)
export const ANSWER_FORMULAS = [
  { id: 1, name: '지원동기' }, { id: 2, name: '자기소개' }, { id: 3, name: '장점 단점' },
  { id: 4, name: '가치관' }, { id: 5, name: '취미 특기' }, { id: 6, name: '동아리활동' },
  { id: 7, name: '봉사활동' }, { id: 8, name: '독서활동' }, { id: 9, name: '자율활동' },
  { id: 10, name: '진로활동' }, { id: 11, name: '협력활동' }, { id: 12, name: '활동과 학업 간 균형 유지' },
  { id: 13, name: '성공경험' }, { id: 14, name: '힘들었던 경험' }, { id: 15, name: '가장 인상싶은 경험' },
  { id: 16, name: '리더십' }, { id: 17, name: '전공질문' }, { id: 18, name: '전공분야 시사이슈' },
  { id: 19, name: '본인의 진로와 우리 학과와 무슨 연관이 있나요?' }, { id: 20, name: '대학생활에서 중요하다고 생각하는 것' },
  { id: 21, name: '지원하는 전공에 필요하다고 생각하는 역량' }, { id: 22, name: '직업에 필요한 자질' },
  { id: 23, name: '전공분야 중 관심 있는 분야' }, { id: 24, name: '타학교 지원했는지' },
  { id: 25, name: '전공 관련 외에 관심 있는 활동' }, { id: 26, name: '전공학과 위해 가장 열정을 쏟은 활동' },
  { id: 27, name: '지원한 대학, 학과에 대한 지식' }, { id: 28, name: '진로 계획 / 졸업 후 목표' },
  { id: 29, name: '입학 후 목표/포부' }, { id: 30, name: '대학에서 수행하고 싶은 연구, 프로젝트' },
  { id: 31, name: '대학원 관련' }, { id: 32, name: '성적향상 / 공부법' },
  { id: 33, name: '좋아하는 과목, 싫어하는 과목' }, { id: 34, name: '학업에서 가장 자신 있는 분야' },
  { id: 35, name: '가장 어려웠던 과목' }, { id: 36, name: 'ㅇㅇ과목을 좋아하게 된 계기' },
  { id: 37, name: '본인이 ㅇㅇ과목을 잘하는 것에 대한 감정' }, { id: 38, name: '전공과 관련된 과목에서 기억에 남는 내용' },
  { id: 39, name: '마지막 할 말' }, { id: 40, name: '존경하는 인물' },
  { id: 41, name: '지원자를 뽑아야 하는 이유' }, { id: 42, name: '여행을 가게 된다면 어디로 갈 것인지' },
  { id: 43, name: '진로가 바뀐 이유' }, { id: 44, name: '미래의 나의 모습' },
  { id: 45, name: '스트레스 해소 방법' }, { id: 46, name: '주장-이유-사례-주장' },
  { id: 47, name: '문제-상황-원인-해결' }, { id: 48, name: '해당 학과가 사회에 어떤 기여를 할 수 있는지' },
  { id: 49, name: '도전 경험' }, { id: 50, name: '좌우명' },
  { id: 51, name: '적성에 안 맞는다면 어떻게 대처' }, { id: 52, name: '전적대와 연관성' },
  { id: 53, name: '실패한 경험' }, { id: 54, name: '행복했던 경험' },
  { id: 55, name: 'oo 직업이 무슨 일인지' }, { id: 56, name: '대학교 알아본 것' },
  { id: 57, name: '꿈을 갖게 된 계기' }, { id: 58, name: '본인의 강점이 어떤 영향을 주는가' },
  { id: 59, name: '면접관에게 질문' }, { id: 60, name: '배웠던 이론 실생활 접목한 예시' },
  { id: 61, name: '해당전공/학과의 미래' }, { id: 62, name: '교육관 (교육학과 전용)' },
  { id: 63, name: '00직업으로써 본인의 역량' }, { id: 64, name: '희생했던 경험' },
  { id: 65, name: '00활동 및 해당 학과 공부를 잘 안한 이유' }, { id: 66, name: '본인 고등학교 소개' },
  { id: 67, name: '창의력을 발휘한 경험' },
]

// 기출문제 Mock (고등: 5컬럼, 중등: 3컬럼)
export const PAST_QUESTIONS_MOCK = [
  { id: 1, grade: 'high' as Grade, university: '서울대', major: '경영학과', admissionType: '학생부종합', question: '왜 우리 학과를 지원했나요?', formulaId: 1, formulaName: '지원동기', createdAt: '2026-04-28' },
  { id: 2, grade: 'high' as Grade, university: '연세대', major: '의예과', admissionType: '학생부종합', question: '본인의 장단점을 말씀해주세요', formulaId: 3, formulaName: '장점 단점', createdAt: '2026-04-28' },
  { id: 3, grade: 'high' as Grade, university: '고려대', major: '컴퓨터학과', admissionType: '학업우수형', question: '동아리 활동 중 가장 기억에 남는 경험은?', formulaId: 6, formulaName: '동아리활동', createdAt: '2026-04-27' },
  { id: 4, grade: 'high' as Grade, university: '서울대', major: '국어국문학과', admissionType: '지역균형', question: '졸업 후 어떤 일을 하고 싶나요?', formulaId: 28, formulaName: '진로 계획 / 졸업 후 목표', createdAt: '2026-04-26' },
  { id: 5, grade: 'high' as Grade, university: '한양대', major: '기계공학과', admissionType: '학생부교과', question: '지원자를 뽑아야 하는 이유는 무엇인가요?', formulaId: 41, formulaName: '지원자를 뽑아야 하는 이유', createdAt: '2026-04-25' },
  { id: 6, grade: 'middle' as Grade, university: '대원외고', major: undefined, admissionType: undefined, question: '왜 외고에 진학하고 싶나요?', formulaId: 1, formulaName: '지원동기', createdAt: '2026-04-24' },
  { id: 7, grade: 'middle' as Grade, university: '하나고', major: undefined, admissionType: undefined, question: '독서활동 중 가장 인상 깊었던 책은?', formulaId: 8, formulaName: '독서활동', createdAt: '2026-04-23' },
  { id: 8, grade: 'middle' as Grade, university: '경기과학고', major: undefined, admissionType: undefined, question: '학교 생활에서 리더십을 발휘한 경험은?', formulaId: 16, formulaName: '리더십', createdAt: '2026-04-22' },
  { id: 9, grade: 'middle' as Grade, university: '민사고', major: undefined, admissionType: undefined, question: '본인의 꿈을 갖게 된 계기는?', formulaId: 57, formulaName: '꿈을 갖게 된 계기', createdAt: '2026-04-21' },
] as Array<{
  id: number
  grade: Grade
  university: string
  major?: string
  admissionType?: string
  question: string
  formulaId: number
  formulaName: string
  createdAt: string
}>

// 전공질문 Mock (학년별)
export const MAJOR_QUESTIONS_MOCK = [
  { id: 1, grade: 'high' as Grade, schoolYear: 1 as SchoolYear, departmentCode: 'MED01-1', departmentName: '의예과 (1학년)', masterCode: 'MED-2024-1Y', totalDays: 14, questionCount: 42, createdAt: '2026-04-20' },
  { id: 2, grade: 'high' as Grade, schoolYear: 1 as SchoolYear, departmentCode: 'BIZ01-1', departmentName: '경영학과 (1학년)', masterCode: 'BIZ-2024-1Y', totalDays: 14, questionCount: 35, createdAt: '2026-04-19' },
  { id: 3, grade: 'high' as Grade, schoolYear: 2 as SchoolYear, departmentCode: 'MED01-2', departmentName: '의예과 (2학년)', masterCode: 'MED-2024-2Y', totalDays: 21, questionCount: 63, createdAt: '2026-04-18' },
  { id: 4, grade: 'high' as Grade, schoolYear: 2 as SchoolYear, departmentCode: 'CSE01-2', departmentName: '컴퓨터공학과 (2학년)', masterCode: 'CSE-2024-2Y', totalDays: 21, questionCount: 60, createdAt: '2026-04-17' },
  { id: 5, grade: 'high' as Grade, schoolYear: 3 as SchoolYear, departmentCode: 'MED01-3', departmentName: '의예과 (3학년 입시)', masterCode: 'MED-2024-3Y', totalDays: 30, questionCount: 90, createdAt: '2026-04-15' },
  { id: 6, grade: 'high' as Grade, schoolYear: 3 as SchoolYear, departmentCode: 'BIZ01-3', departmentName: '경영학과 (3학년 입시)', masterCode: 'BIZ-2024-3Y', totalDays: 30, questionCount: 75, createdAt: '2026-04-14' },
  { id: 7, grade: 'high' as Grade, schoolYear: 3 as SchoolYear, departmentCode: 'CSE01-3', departmentName: '컴퓨터공학과 (3학년 입시)', masterCode: 'CSE-2024-3Y', totalDays: 30, questionCount: 90, createdAt: '2026-04-13' },
  { id: 8, grade: 'high' as Grade, schoolYear: 3 as SchoolYear, departmentCode: 'LAW01-3', departmentName: '법학과 (3학년 입시)', masterCode: 'LAW-2024-3Y', totalDays: 20, questionCount: 60, createdAt: '2026-04-12' },
  { id: 9, grade: 'middle' as Grade, schoolYear: 1 as SchoolYear, departmentCode: 'M-HUM-1', departmentName: '외고 진학 준비 (1학년)', masterCode: 'M-HUM-2024-1Y', totalDays: 7, questionCount: 21, createdAt: '2026-04-10' },
  { id: 10, grade: 'middle' as Grade, schoolYear: 2 as SchoolYear, departmentCode: 'M-HUM-2', departmentName: '외고 인문계열 (2학년)', masterCode: 'M-HUM-2024-2Y', totalDays: 14, questionCount: 42, createdAt: '2026-04-08' },
  { id: 11, grade: 'middle' as Grade, schoolYear: 2 as SchoolYear, departmentCode: 'M-SCI-2', departmentName: '과학고 진학 (2학년)', masterCode: 'M-SCI-2024-2Y', totalDays: 14, questionCount: 42, createdAt: '2026-04-07' },
  { id: 12, grade: 'middle' as Grade, schoolYear: 3 as SchoolYear, departmentCode: 'M-HUM-3', departmentName: '외고 인문계열 (3학년 입시)', masterCode: 'M-HUM-2024-3Y', totalDays: 14, questionCount: 42, createdAt: '2026-04-05' },
  { id: 13, grade: 'middle' as Grade, schoolYear: 3 as SchoolYear, departmentCode: 'M-SCI-3', departmentName: '과학고 입시 (3학년)', masterCode: 'M-SCI-2024-3Y', totalDays: 21, questionCount: 63, createdAt: '2026-04-03' },
  { id: 14, grade: 'middle' as Grade, schoolYear: 3 as SchoolYear, departmentCode: 'M-INT-3', departmentName: '국제고 진학 (3학년)', masterCode: 'M-INT-2024-3Y', totalDays: 14, questionCount: 42, createdAt: '2026-04-01' },
]

// 🆕 제시문면접 (실제 엑셀 구조 반영)
// 고등: 학교코드/학교명/학교순서/계열코드/계열명/총일수/세트코드/연도/회차/회차순서/계열세부코드/질문코드/질문순서/원질문/세부질문/제시문개수/문항참고이미지개수
// 중등: 계열코드/계열명만 빼고 동일
export interface PassageInterview {
  id: number
  grade: Grade
  schoolCode: string         // 학교코드
  schoolName: string         // 학교명
  schoolOrder: number        // 학교순서
  trackCode?: string         // 계열코드 (중등은 없음)
  trackName?: string         // 계열명 (중등은 없음)
  totalDays: number          // 총일수
  setCode: string            // 세트코드
  year: number               // 연도
  round: number              // 회차
  roundOrder: number         // 회차순서
  trackDetailCode?: string   // 계열세부코드 (중등은 없음)
  questionCode: string       // 질문코드
  questionOrder: number      // 질문순서
  originalQuestion: string   // 원질문
  subQuestion: string        // 세부질문
  passageCount: number       // 제시문개수
  imageCount: number         // 문항참고이미지개수
  createdAt: string
}

export const PASSAGE_INTERVIEWS_MOCK: PassageInterview[] = [
  // ====== 고등 ======
  {
    id: 1, grade: 'high',
    schoolCode: 'SNU01', schoolName: '서울대', schoolOrder: 1,
    trackCode: 'HUM', trackName: '인문계열',
    totalDays: 30,
    setCode: 'SNU-HUM-2024-01', year: 2024, round: 1, roundOrder: 1,
    trackDetailCode: 'HUM-PHIL',
    questionCode: 'Q-001', questionOrder: 1,
    originalQuestion: '제시문에 등장하는 갈등의 본질은 무엇인가?',
    subQuestion: '제시문 (가)와 (나)에서 드러나는 가치관의 차이를 비교하시오.',
    passageCount: 2, imageCount: 1,
    createdAt: '2026-04-28',
  },
  {
    id: 2, grade: 'high',
    schoolCode: 'SNU01', schoolName: '서울대', schoolOrder: 1,
    trackCode: 'HUM', trackName: '인문계열',
    totalDays: 30,
    setCode: 'SNU-HUM-2024-01', year: 2024, round: 1, roundOrder: 2,
    trackDetailCode: 'HUM-PHIL',
    questionCode: 'Q-002', questionOrder: 2,
    originalQuestion: '제시문 (다)에 나타난 사회 현상의 원인을 분석하시오.',
    subQuestion: '본인의 견해를 1분 이내로 말해보시오.',
    passageCount: 2, imageCount: 1,
    createdAt: '2026-04-28',
  },
  {
    id: 3, grade: 'high',
    schoolCode: 'SNU01', schoolName: '서울대', schoolOrder: 1,
    trackCode: 'NAT', trackName: '자연계열',
    totalDays: 30,
    setCode: 'SNU-NAT-2024-01', year: 2024, round: 1, roundOrder: 1,
    trackDetailCode: 'NAT-PHYS',
    questionCode: 'Q-003', questionOrder: 1,
    originalQuestion: '도플러 효과를 설명하시오.',
    subQuestion: '제시된 그래프를 분석하여 답하시오.',
    passageCount: 1, imageCount: 2,
    createdAt: '2026-04-27',
  },
  {
    id: 4, grade: 'high',
    schoolCode: 'SNU01', schoolName: '서울대', schoolOrder: 1,
    trackCode: 'MED', trackName: '의학계열',
    totalDays: 30,
    setCode: 'SNU-MED-2024-01', year: 2024, round: 1, roundOrder: 1,
    trackDetailCode: 'MED-MED',
    questionCode: 'Q-004', questionOrder: 1,
    originalQuestion: '의료 윤리 딜레마 상황을 어떻게 해결할 것인가?',
    subQuestion: '위약효과 실험 설계의 윤리적 문제를 논하시오.',
    passageCount: 3, imageCount: 0,
    createdAt: '2026-04-26',
  },
  {
    id: 5, grade: 'high',
    schoolCode: 'YSU01', schoolName: '연세대', schoolOrder: 2,
    trackCode: 'HUM', trackName: '인문계열',
    totalDays: 25,
    setCode: 'YSU-HUM-2024-01', year: 2024, round: 1, roundOrder: 1,
    trackDetailCode: 'HUM-LAW',
    questionCode: 'Q-005', questionOrder: 1,
    originalQuestion: '공정과 분배의 정의에 대해 논하시오.',
    subQuestion: '롤스의 정의론과 비교하여 설명하시오.',
    passageCount: 2, imageCount: 0,
    createdAt: '2026-04-25',
  },
  {
    id: 6, grade: 'high',
    schoolCode: 'KU01', schoolName: '고려대', schoolOrder: 3,
    trackCode: 'NAT', trackName: '자연계열',
    totalDays: 28,
    setCode: 'KU-NAT-2024-01', year: 2024, round: 2, roundOrder: 1,
    trackDetailCode: 'NAT-BIO',
    questionCode: 'Q-006', questionOrder: 1,
    originalQuestion: '유전자 발현의 조절 메커니즘을 설명하시오.',
    subQuestion: '제시된 실험 결과를 해석하시오.',
    passageCount: 2, imageCount: 3,
    createdAt: '2026-04-23',
  },
  // ====== 중등 (계열 없음) ======
  {
    id: 7, grade: 'middle',
    schoolCode: 'DAEW01', schoolName: '대원외고', schoolOrder: 1,
    totalDays: 14,
    setCode: 'DAEW-2024-01', year: 2024, round: 1, roundOrder: 1,
    questionCode: 'Q-101', questionOrder: 1,
    originalQuestion: '청소년의 미디어 활용에 대한 본인의 견해는?',
    subQuestion: '제시된 자료를 토대로 의견을 제시하시오.',
    passageCount: 1, imageCount: 1,
    createdAt: '2026-04-22',
  },
  {
    id: 8, grade: 'middle',
    schoolCode: 'GGSCI01', schoolName: '경기과학고', schoolOrder: 2,
    totalDays: 21,
    setCode: 'GGSCI-2024-01', year: 2024, round: 1, roundOrder: 1,
    questionCode: 'Q-102', questionOrder: 1,
    originalQuestion: '환경 문제에 대한 과학적 해결 방안은?',
    subQuestion: '제시된 데이터를 분석하여 답하시오.',
    passageCount: 2, imageCount: 2,
    createdAt: '2026-04-21',
  },
]

// THEME (대시보드와 동일)
export const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}