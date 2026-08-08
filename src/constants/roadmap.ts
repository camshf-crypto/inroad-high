/**
 * 고등 로드맵 (본사 공통 커리큘럼)
 *
 * - 학년: 고1 실행 / 고2 심화 / 고3 최종연구·대입
 * - 월: 1월 ~ 8월 (8개월 과정, 월 4회차)
 * - 미션 타입:
 *   - inAnswer: 비커스 서비스로 진행 (보라)
 *   - tab: 특정 탭으로 이동 (파랑, tab 속성 참고)
 *   - teacher: 선생님 오프라인 지도 (초록)
 *
 * mission_key 규칙: high{학년}-{월번호 2자리}-{순서}
 *   예: high2-03-1 = 고2 3월 1회차
 *
 * ⚠️ mission_key 는 절대 바꾸지 말 것 (바꾸면 기존 체크 데이터와 연결 끊어짐)
 *    미션 텍스트(t, theme, freq, output)는 자유롭게 수정 가능
 *
 */

export type MissionType = 'inAnswer' | 'tab' | 'teacher'

export interface Mission {
  key: string              // 고유 식별자 (DB에 저장됨) ⚠️ 변경 금지
  t: string                // 미션 텍스트 (자유롭게 수정 가능)
  type: MissionType
  tab?: string             // type === 'tab' 일 때 이동할 탭명
  /** 어느 과목·영역 활동인지 (선택) */
  subject?: string
}

export interface RoadmapMonth {
  m: string                // '1월'
  theme: string            // 월간 목표
  freq: string             // 진행 빈도
  /** 그 달에 남기는 결과물 (핵심 OUTPUT) */
  output?: string
  missions: Mission[]
}

export type GradeKey = '고1' | '고2' | '고3'

export const ROADMAP: Record<GradeKey, RoadmapMonth[]> = {
  '고1': [
    {
      m: '1월', theme: '고1 실전 계획', freq: '주 1회 (4주)', output: '고1 활동 지도',
      missions: [
        { key: 'high1-01-1', t: '중3 고1 미리보기 점검', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high1-01-2', t: '실제 학교 교과·수행평가 분석', type: 'teacher', tab: 'suhaeng' },
        { key: 'high1-01-3', t: '우선관리 교과 선정', type: 'tab', tab: 'roadmap-v2?step=4' },
        { key: 'high1-01-4', t: '고1 실제 활동계획 수정', type: 'inAnswer', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '2월', theme: '교과탐구 ①', freq: '주 1회 (4주)', output: '교과탐구보고서 ① (2과목)',
      missions: [
        { key: 'high1-02-1', subject: '국어·영어', t: '수업내용에서 질문 찾기', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high1-02-2', subject: '국어·영어', t: '탐구주제 구체화', type: 'tab', tab: 'roadmap-v2' },
        { key: 'high1-02-3', subject: '국어·영어', t: '자료조사·분석', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high1-02-4', subject: '국어·영어', t: '보고서·발표', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '3월', theme: '데이터 탐구', freq: '주 1회 (4주)', output: '데이터 탐구보고서 (2과목)',
      missions: [
        { key: 'high1-03-1', subject: '수학·과학', t: '데이터형 질문 설정', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high1-03-2', subject: '수학·과학', t: '설문·자료수집', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high1-03-3', subject: '수학·과학', t: '그래프·분석', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high1-03-4', subject: '수학·과학', t: '데이터 기반 주장·발표', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '4월', theme: '학교 수행평가 집중 훈련', freq: '주 1회 (4주)', output: '수행평가 모음집',
      missions: [
        { key: 'high1-04-1', t: '학교 수행평가 분석', type: 'tab', tab: 'suhaeng' },
        { key: 'high1-04-2', t: '유사과제 실습 ①', type: 'tab', tab: 'suhaeng' },
        { key: 'high1-04-3', t: '유사과제 실습 ②', type: 'tab', tab: 'suhaeng' },
        { key: 'high1-04-4', t: '결과물·발표 피드백', type: 'teacher', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '5월', theme: '교과탐구 ②', freq: '주 1회 (4주)', output: '교과탐구보고서 ② (2과목)',
      missions: [
        { key: 'high1-05-1', subject: '통합사회·한국사', t: '다른 교과에서 주제 찾기', type: 'tab', tab: 'roadmap-v2' },
        { key: 'high1-05-2', subject: '통합사회·한국사', t: '자료·사례 비교', type: 'teacher', tab: 'book' },
        { key: 'high1-05-3', subject: '통합사회·한국사', t: '탐구글쓰기', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high1-05-4', subject: '통합사회·한국사', t: '발표·질의응답', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '6월', theme: '교과 융합 프로젝트', freq: '주 1회 (4주)', output: '융합탐구보고서',
      missions: [
        { key: 'high1-06-1', subject: '앞 과목 중 2개', t: '두 교과 선정', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high1-06-2', t: '교과 연결 질문', type: 'tab', tab: 'roadmap-v2' },
        { key: 'high1-06-3', t: '융합탐구 수행', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high1-06-4', t: '연구발표', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '7월', theme: '후속탐구 프로젝트', freq: '주 1회 (4주)', output: '후속탐구보고서',
      missions: [
        { key: 'high1-07-1', t: '기존 탐구 한계 찾기', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high1-07-2', t: '새로운 질문', type: 'tab', tab: 'roadmap-v2' },
        { key: 'high1-07-3', t: '추가 조사·분석', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high1-07-4', t: '1차 ↔ 2차 비교 발표', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '8월', theme: '고1 성장 점검', freq: '주 1회 (4주)', output: '고1 활동 모음집',
      missions: [
        { key: 'high1-08-1', t: '실제 활동 정리', type: 'teacher', tab: 'record' },
        { key: 'high1-08-2', t: '교과별 강점 분석', type: 'tab', tab: 'expect' },
        { key: 'high1-08-3', t: '부족역량·후속주제', type: 'inAnswer', tab: 'roadmap-v2' },
        { key: 'high1-08-4', t: '고2 선택과목 방향 설계', type: 'inAnswer', tab: 'roadmap-v2?step=4' },
      ],
    },
  ],

  '고2': [
    {
      m: '1월', theme: '고2 수행평가 선행', freq: '주 1회 (4주)', output: '고2 수행평가 대비 노트',
      missions: [
        { key: 'high2-01-1', t: '내 선택과목 확인 · 핵심 3과목 정하기', type: 'inAnswer', tab: 'roadmap-v2?step=4' },
        { key: 'high2-01-2', t: '과목별 수행평가 유형 파악', type: 'tab', tab: 'suhaeng' },
        { key: 'high2-01-3', t: '작년 수행평가 과제 분석 · 유사과제 실습', type: 'tab', tab: 'suhaeng' },
        { key: 'high2-01-4', t: '1학기 수행평가 대비 계획', type: 'teacher', tab: 'suhaeng' },
      ],
    },
    {
      m: '2월', theme: '핵심과목 ① 탐구', freq: '주 1회 (4주)', output: '과목① 탐구보고서',
      missions: [
        { key: 'high2-02-1', t: '교과개념 분석', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high2-02-2', t: '탐구주제 선정', type: 'tab', tab: 'roadmap-v2' },
        { key: 'high2-02-3', t: '수행평가형 탐구', type: 'tab', tab: 'suhaeng' },
        { key: 'high2-02-4', t: '보고서·발표', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '3월', theme: '핵심과목 ② 탐구', freq: '주 1회 (4주)', output: '과목② 탐구보고서',
      missions: [
        { key: 'high2-03-1', t: '교과개념 → 질문', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high2-03-2', t: '전공과 연결', type: 'tab', tab: 'major' },
        { key: 'high2-03-3', t: '자료·데이터 분석', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high2-03-4', t: '결과 해석·발표', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '4월', theme: '핵심과목 ③ 탐구', freq: '주 1회 (4주)', output: '과목③ 탐구보고서',
      missions: [
        { key: 'high2-04-1', t: '교과 쟁점 찾기', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high2-04-2', t: '학술자료 비교', type: 'tab', tab: 'book' },
        { key: 'high2-04-3', t: '주장·논증', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high2-04-4', t: '연구발표', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '5월', theme: '확장과목 탐구', freq: '주 1회 (4주)', output: '과목④ 탐구 결과물',
      missions: [
        { key: 'high2-05-1', t: '다른 관점 찾기', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high2-05-2', t: '주제 설계', type: 'tab', tab: 'roadmap-v2' },
        { key: 'high2-05-3', t: '수행평가·프로젝트', type: 'tab', tab: 'suhaeng' },
        { key: 'high2-05-4', t: '결과발표', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '6월', theme: '교과 융합 프로젝트', freq: '주 1회 (4주)', output: '융합탐구보고서',
      missions: [
        { key: 'high2-06-1', t: '핵심과목 2개 선정', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high2-06-2', t: '융합질문', type: 'tab', tab: 'roadmap-v2' },
        { key: 'high2-06-3', t: '연구·분석', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high2-06-4', t: '연구 발표', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '7월', theme: '직업 문제해결 프로젝트', freq: '주 1회 (4주)', output: '직업 문제해결 보고서',
      missions: [
        { key: 'high2-07-1', t: '희망직업 업무 분석', type: 'inAnswer', tab: 'roadmap-v2' },
        { key: 'high2-07-2', t: '실제 문제 선정', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high2-07-3', t: '해결방안 연구', type: 'teacher', tab: 'book' },
        { key: 'high2-07-4', t: '직업인 관점 제안', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '8월', theme: '고2 전공 활동 모음집', freq: '주 1회 (4주)', output: '전공 활동 모음집',
      missions: [
        { key: 'high2-08-1', t: '과목별 활동 정리', type: 'teacher', tab: 'record' },
        { key: 'high2-08-2', t: '활동 간 연결', type: 'tab', tab: 'expect' },
        { key: 'high2-08-3', t: '대표연구 선정', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high2-08-4', t: '고3 최종연구 설계', type: 'inAnswer', tab: 'roadmap-v2' },
      ],
    },
  ],

  '고3': [
    {
      m: '1월', theme: '고3 수행평가 선행', freq: '주 1회 (4주)', output: '고3 수행평가 대비 노트 + 최종 연구축',
      missions: [
        { key: 'high3-01-1', t: '3년 탐구 훑고 최종 연구축 설정', type: 'inAnswer', tab: 'roadmap-v2' },
        { key: 'high3-01-2', t: '과목별 수행평가 유형 파악', type: 'tab', tab: 'suhaeng' },
        { key: 'high3-01-3', t: '작년 수행평가 과제 분석 · 유사과제 실습', type: 'tab', tab: 'suhaeng' },
        { key: 'high3-01-4', t: '1학기 수행평가 대비 계획', type: 'teacher', tab: 'suhaeng' },
      ],
    },
    {
      m: '2월', theme: '직업·산업 심층탐구', freq: '주 1회 (4주)', output: '직업·산업 이슈 보고서',
      missions: [
        { key: 'high3-02-1', t: '직업 실제 업무 분석', type: 'inAnswer', tab: 'major' },
        { key: 'high3-02-2', t: '산업 핵심 이슈', type: 'teacher', tab: 'book' },
        { key: 'high3-02-3', t: '전문가·학술자료 분석', type: 'tab', tab: 'book' },
        { key: 'high3-02-4', t: '해결할 문제 정의', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '3월', theme: '최종연구 설계', freq: '주 1회 (4주)', output: '연구계획서',
      missions: [
        { key: 'high3-03-1', t: '연구질문·가설', type: 'tab', tab: 'roadmap-v2' },
        { key: 'high3-03-2', t: '선행연구 비교', type: 'teacher', tab: 'book' },
        { key: 'high3-03-3', t: '조사·데이터 설계', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high3-03-4', t: '연구계획 발표', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '4월', theme: '최종연구 완성', freq: '주 1회 (4주)', output: '직업·전공 최종 연구보고서',
      missions: [
        { key: 'high3-04-1', t: '자료·데이터 분석', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high3-04-2', t: '결과 해석', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high3-04-3', t: '해결안·최종 보고서', type: 'teacher', tab: 'roadmap-v2' },
        { key: 'high3-04-4', t: '7분 연구발표·질의응답', type: 'tab', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '5월', theme: '학생부 × 대학 매칭', freq: '주 1회 (4주)', output: '대학 매칭 보고서',
      missions: [
        { key: 'high3-05-1', t: '대표활동 선정', type: 'tab', tab: 'record' },
        { key: 'high3-05-2', t: '전공역량 정리', type: 'tab', tab: 'major' },
        { key: 'high3-05-3', t: '대학·학과 분석', type: 'inAnswer', tab: 'roadmap-v2?step=3' },
        { key: 'high3-05-4', t: '지원전략 설계', type: 'teacher', tab: 'roadmap-v2' },
      ],
    },
    {
      m: '6월', theme: '대입면접 기본', freq: '주 1회 (4주)', output: '기본 답변집',
      missions: [
        { key: 'high3-06-1', t: '지원동기', type: 'tab', tab: 'basic' },
        { key: 'high3-06-2', t: '전공적합성', type: 'tab', tab: 'basic' },
        { key: 'high3-06-3', t: '인성·공동체', type: 'tab', tab: 'basic' },
        { key: 'high3-06-4', t: '미래발전성', type: 'tab', tab: 'basic' },
      ],
    },
    {
      m: '7월', theme: '학생부 심층면접', freq: '주 1회 (4주)', output: '개인 질문 모음',
      missions: [
        { key: 'high3-07-1', t: '교과탐구 질문', type: 'tab', tab: 'expect' },
        { key: 'high3-07-2', t: '선택과목 질문', type: 'tab', tab: 'expect' },
        { key: 'high3-07-3', t: '최종연구 질문', type: 'tab', tab: 'expect' },
        { key: 'high3-07-4', t: '꼬리·검증질문', type: 'tab', tab: 'expect' },
      ],
    },
    {
      m: '8월', theme: '대학별 최종 점검', freq: '주 1회 (4주)', output: '대입 준비 모음집',
      missions: [
        { key: 'high3-08-1', t: '대학별 기출', type: 'tab', tab: 'past' },
        { key: 'high3-08-2', t: '모의면접 ①', type: 'tab', tab: 'mockexam' },
        { key: 'high3-08-3', t: '영상 피드백', type: 'teacher', tab: 'simulation' },
        { key: 'high3-08-4', t: '최종 모의면접', type: 'tab', tab: 'mockexam' },
      ],
    },
  ],
}

/**
 * month 문자열("3월")에서 숫자만 추출 → DB에 저장될 month 컬럼 값
 */
export function parseMonth(m: string): number {
  return parseInt(m.replace(/[^0-9]/g, ''), 10) || 0
}

/**
 * 현재 학년 숫자 (1, 2, 3)를 '고1', '고2', '고3' 형태로 변환
 */
export function toGradeKey(grade: string | null | undefined): GradeKey {
  if (grade?.includes('3')) return '고3'
  if (grade?.includes('2')) return '고2'
  return '고1'
}