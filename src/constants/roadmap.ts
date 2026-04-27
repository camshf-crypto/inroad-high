/**
 * 고등 로드맵 (본사 공통 커리큘럼)
 *
 * - 학년: 고1 / 고2 / 고3
 * - 월: 2, 3, 5, 7, 8, 10, 12 (8개월)
 * - 미션 타입:
 *   - inAnswer: 비커스 서비스로 진행 (보라)
 *   - tab: 특정 탭으로 이동 (파랑, tab 속성 참고)
 *   - teacher: 선생님 오프라인 지도 (초록)
 *
 * mission_key 규칙: high{학년}-{월번호 2자리}-{순서}
 *   예: high2-03-1 = 고2 3월 1번째 미션
 *
 * ⚠️ mission_key 는 절대 바꾸지 말 것 (바꾸면 기존 체크 데이터와 연결 끊어짐)
 *    미션 텍스트(t, theme, freq)는 자유롭게 수정 가능
 */

export type MissionType = 'inAnswer' | 'tab' | 'teacher'

export interface Mission {
  key: string              // 고유 식별자 (DB에 저장됨) ⚠️ 변경 금지
  t: string                // 미션 텍스트 (자유롭게 수정 가능)
  type: MissionType
  tab?: string             // type === 'tab' 일 때 이동할 탭명
}

export interface RoadmapMonth {
  m: string                // '3월'
  theme: string            // 월 주제
  freq: string             // 진행 빈도
  missions: Mission[]
}

export type GradeKey = '고1' | '고2' | '고3'

export const ROADMAP: Record<GradeKey, RoadmapMonth[]> = {
  '고1': [
    {
      m: '1월', theme: '겨울방학 집중 - 방향 설정', freq: '주 2회 (2주)', missions: [
        { key: 'high1-01-1', t: '학과 적합도 정밀진단 (200문항)', type: 'inAnswer' },
        { key: 'high1-01-2', t: '진로진학 AI로 관심 계열 및 학과 탐색', type: 'inAnswer' },
        { key: 'high1-01-3', t: '관심 학과 방향 결정', type: 'teacher' },
        { key: 'high1-01-4', t: '고1 1년 로드맵 학부모 공유', type: 'teacher' },
      ],
    },
    {
      m: '2월', theme: '겨울방학 집중 - 탐구 설계', freq: '주 1회 (4주)', missions: [
        { key: 'high1-02-1', t: '세특라이트로 1학기 탐구주제 미리 설계', type: 'tab', tab: 'topic' },
        { key: 'high1-02-2', t: '전공특화문제 기초 전공 지식 첫 점검', type: 'tab', tab: 'major' },
        { key: 'high1-02-3', t: '동아리 계열 연결 계획 수립', type: 'teacher' },
        { key: 'high1-02-4', t: '진로진학 AI 독서 리스트 추천', type: 'tab', tab: 'book' },
      ],
    },
    {
      m: '3월', theme: '방향 확정 + 탐구 실행 시작', freq: '주 2회 (2주)', missions: [
        { key: 'high1-03-1', t: '겨울방학에 설계한 탐구주제 실행 시작', type: 'tab', tab: 'topic' },
        { key: 'high1-03-2', t: '동아리 선택 - 계열 및 학과 연결', type: 'teacher' },
        { key: 'high1-03-3', t: '수행평가 주제 입시 연결 전략', type: 'teacher' },
        { key: 'high1-03-4', t: '예상 생기부 문구 확인', type: 'tab', tab: 'expect' },
      ],
    },
    {
      m: '5월', theme: '수행평가 + 탐구 병행', freq: '주 2회 (2주)', missions: [
        { key: 'high1-05-1', t: '수행평가 주제 입시 연결 점검', type: 'teacher' },
        { key: 'high1-05-2', t: '세특라이트 탐구활동 중간 점검', type: 'tab', tab: 'topic' },
        { key: 'high1-05-3', t: '1학기 탐구 마무리 방향 설정', type: 'teacher' },
        { key: 'high1-05-4', t: '2학기 탐구주제 미리 구상', type: 'tab', tab: 'topic' },
      ],
    },
    {
      m: '7월', theme: '여름방학 집중 ① - 전공 + 스피치', freq: '주 2회 (2주)', missions: [
        { key: 'high1-07-1', t: '전공특화문제 완성', type: 'tab', tab: 'major' },
        { key: 'high1-07-2', t: '2학기 탐구주제 확정', type: 'tab', tab: 'topic' },
        { key: 'high1-07-3', t: '스피치 훈련 시작 - 말하는 습관 교정', type: 'tab', tab: 'simulation' },
        { key: 'high1-07-4', t: '자기소개 / 지원동기 답변 초안 작성', type: 'tab', tab: 'expect' },
      ],
    },
    {
      m: '8월', theme: '여름방학 집중 ② - 면접 기초', freq: '주 1회 (4주)', missions: [
        { key: 'high1-08-1', t: '장단점 / 학과 선택 이유 답변 작성', type: 'tab', tab: 'expect' },
        { key: 'high1-08-2', t: '실전 면접 시뮬레이션 1회 체험', type: 'tab', tab: 'simulation' },
        { key: 'high1-08-3', t: '시뮬레이션 영상 분석 + 약점 파악', type: 'teacher' },
        { key: 'high1-08-4', t: '9월 2학기 탐구주제 실행 준비', type: 'tab', tab: 'topic' },
      ],
    },
    {
      m: '10월', theme: '기출 경험 + 꼬리질문', freq: '주 1회 (4주)', missions: [
        { key: 'high1-10-1', t: '지원 희망 대학 기출문제 처음 접하기', type: 'tab', tab: 'past' },
        { key: 'high1-10-2', t: '학과별 기출 내 학과 집중 풀기', type: 'tab', tab: 'past' },
        { key: 'high1-10-3', t: '꼬리질문 어떤 게 나오는지 파악', type: 'tab', tab: 'expect' },
        { key: 'high1-10-4', t: '스피치 훈련 심화', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '12월', theme: '1년 마무리 + 고2 준비', freq: '주 1회 (4주)', missions: [
        { key: 'high1-12-1', t: '1년 탐구활동 정리 / 생기부 업로드 예상질문', type: 'tab', tab: 'expect' },
        { key: 'high1-12-2', t: '꼬리질문 대비 연습', type: 'tab', tab: 'expect' },
        { key: 'high1-12-3', t: '실전 면접 시뮬레이션 1회', type: 'tab', tab: 'simulation' },
        { key: 'high1-12-4', t: '고2 겨울방학 커리큘럼 설계', type: 'teacher' },
      ],
    },
  ],
  '고2': [
    {
      m: '1월', theme: '고1 연결 점검 + 고2 전략 수립 ①', freq: '주 2회 (2주)', missions: [
        { key: 'high2-01-1', t: '고1 생기부 업로드 → 현재 스토리 점검 및 갭 분석', type: 'tab', tab: 'expect' },
        { key: 'high2-01-2', t: '학과 확정 후 고2 탐구 방향 재설계', type: 'teacher' },
        { key: 'high2-01-3', t: '고1 활동과 연결고리 만들기', type: 'teacher' },
        { key: 'high2-01-4', t: '고1-고2 연결 스토리 설계', type: 'teacher' },
      ],
    },
    {
      m: '2월', theme: '고1 연결 점검 + 고2 전략 수립 ②', freq: '주 1회 (4주)', missions: [
        { key: 'high2-02-1', t: '세특라이트로 학과 맞춤 심화 탐구주제 선택', type: 'tab', tab: 'topic' },
        { key: 'high2-02-2', t: '전공특화문제 심화 — 고1 부족 부분 집중 보완', type: 'tab', tab: 'major' },
        { key: 'high2-02-3', t: '생기부 예상문제로 현재 질문 확인', type: 'tab', tab: 'expect' },
        { key: 'high2-02-4', t: '진로진학 AI로 독서 리스트 심화 추천', type: 'tab', tab: 'book' },
      ],
    },
    {
      m: '3월', theme: '심화 탐구 실행 시작', freq: '주 1회 (4주)', missions: [
        { key: 'high2-03-1', t: '겨울방학에 설계한 심화 탐구주제 실행 시작', type: 'tab', tab: 'topic' },
        { key: 'high2-03-2', t: '고1-고2 탐구 연결성 점검하며 진행', type: 'teacher' },
        { key: 'high2-03-3', t: '생기부 예상문제로 현재 생기부 질문 미리 확인', type: 'tab', tab: 'expect' },
        { key: 'high2-03-4', t: '진로진학 AI로 학과별 독서 리스트 심화 추천', type: 'tab', tab: 'book' },
      ],
    },
    {
      m: '5월', theme: '수행평가 심화 + 면접 답변 동시 준비', freq: '주 1회 (4주)', missions: [
        { key: 'high2-05-1', t: '수행평가 주제를 학과 스토리와 연결 — 고1보다 심화', type: 'teacher' },
        { key: 'high2-05-2', t: '전공특화문제로 수행평가 관련 전공 지식 보완', type: 'tab', tab: 'major' },
        { key: 'high2-05-3', t: '수행평가 하면서 면접 답변 초안 동시 작성', type: 'tab', tab: 'expect' },
        { key: 'high2-05-4', t: '꼬리질문 어떤 게 나올지 미리 파악 + 생기부 중간 점검', type: 'tab', tab: 'expect' },
      ],
    },
    {
      m: '7월', theme: '면접 실전 본격화 ① — 생기부 + 기출 시작', freq: '주 2회 (2주)', missions: [
        { key: 'high2-07-1', t: '1학기 생기부 업로드 → 예상 면접질문 전체 뽑기', type: 'tab', tab: 'expect' },
        { key: 'high2-07-2', t: '지원 희망 대학 기출문제 집중 분석 시작', type: 'tab', tab: 'past' },
        { key: 'high2-07-3', t: '생기부-기출 갭 파악 → 2학기 전략 수립', type: 'teacher' },
        { key: 'high2-07-4', t: '지원 대학 범위 1차 확정', type: 'teacher' },
      ],
    },
    {
      m: '8월', theme: '면접 실전 본격화 ② — 시뮬레이션 + 제시문', freq: '주 2회 (2주)', missions: [
        { key: 'high2-08-1', t: '생기부 예상질문 전체 답변 작성 + 대학별 분석', type: 'tab', tab: 'expect' },
        { key: 'high2-08-2', t: '실전 면접 시뮬레이션 2~3회 반복 (영상 + 음성 분석)', type: 'tab', tab: 'simulation' },
        { key: 'high2-08-3', t: 'SKY·교대 지원자 → 제시문 면접 준비 시작', type: 'tab', tab: 'presentation' },
        { key: 'high2-08-4', t: '꼬리질문 집중 대비 — 학과 맞춤 심화', type: 'tab', tab: 'expect' },
      ],
    },
    {
      m: '10월', theme: '기출 완성 + 제시문 심화 + 2학기 탐구', freq: '주 1~2회', missions: [
        { key: 'high2-10-1', t: '2학기 탐구활동 실행 — 고1-고2 연결성 완성', type: 'tab', tab: 'topic' },
        { key: 'high2-10-2', t: '지원 대학 기출 2~3회차 반복 → 패턴 완전히 파악', type: 'tab', tab: 'past' },
        { key: 'high2-10-3', t: 'SKY·교대 지원자 → 제시문 심화 답변 완성도 높이기', type: 'tab', tab: 'presentation' },
        { key: 'high2-10-4', t: '꼬리질문 실전 연습 심화 + 스피치 업그레이드', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '12월', theme: '면접 90% 완성 + 고3 준비', freq: '주 2회 (2주)', missions: [
        { key: 'high2-12-1', t: '고1~고2 전체 생기부 예상질문 총정리', type: 'tab', tab: 'expect' },
        { key: 'high2-12-2', t: '실전 면접 시뮬레이션 3회 이상 — 약점 최종 보완', type: 'tab', tab: 'simulation' },
        { key: 'high2-12-3', t: '부족한 전공 지식 마지막 점검', type: 'tab', tab: 'major' },
        { key: 'high2-12-4', t: '고3 로드맵 설계 — 지원 대학 최종 확정', type: 'teacher' },
      ],
    },
  ],
  '고3': [
    {
      m: '1월', theme: '생기부 마지막 탐구주제 설계 ①', freq: '주 2회 (2주)', missions: [
        { key: 'high3-01-1', t: '세특라이트로 고3 마지막 탐구주제 선택', type: 'tab', tab: 'topic' },
        { key: 'high3-01-2', t: '진로진학 AI로 독서 리스트 + 탐구 방향 최종 점검', type: 'tab', tab: 'book' },
        { key: 'high3-01-3', t: '학과 스토리 완성에 필요한 활동 설계', type: 'teacher' },
        { key: 'high3-01-4', t: '지원 대학 범위 사전 점검', type: 'teacher' },
      ],
    },
    {
      m: '2월', theme: '생기부 마지막 탐구주제 설계 ②', freq: '주 1회 (4주)', missions: [
        { key: 'high3-02-1', t: '전공특화문제로 기초 전공 지식 점검 — 면접 답변 재료 확보', type: 'tab', tab: 'major' },
        { key: 'high3-02-2', t: '지금까지 생기부 업로드 → 예상질문 뽑아서 부족한 부분 파악', type: 'tab', tab: 'expect' },
        { key: 'high3-02-3', t: '고1·고2 연결 스토리 최종 점검', type: 'teacher' },
        { key: 'high3-02-4', t: '면접 답변 방향 설계', type: 'teacher' },
      ],
    },
    {
      m: '3월', theme: '탐구 실행 + 수행평가 마무리', freq: '주 1회 (4주)', missions: [
        { key: 'high3-03-1', t: '겨울방학 설계 탐구주제 실행 — 고1·고2 연결 스토리 완성', type: 'tab', tab: 'topic' },
        { key: 'high3-03-2', t: '수행평가 주제 학과와 연결 — 마지막 학기 전략적 활용', type: 'teacher' },
        { key: 'high3-03-3', t: '세특라이트로 탐구 방향 점검 + 예상 생기부 문구 확인', type: 'tab', tab: 'expect' },
        { key: 'high3-03-4', t: '전공특화문제로 수행평가 관련 전공 지식 동시에 보완', type: 'tab', tab: 'major' },
      ],
    },
    {
      m: '5월', theme: '생기부 완성 + 대학 제출 전 최종 점검', freq: '주 1~2회', missions: [
        { key: 'high3-05-1', t: '생기부 완성본 업로드 → 예상 면접질문 전체 뽑기', type: 'tab', tab: 'expect' },
        { key: 'high3-05-2', t: '지원 대학 확정 + 5개년 기출문제 분석 시작', type: 'tab', tab: 'past' },
        { key: 'high3-05-3', t: '스피치 훈련 시작 — 말투·속도·태도 교정', type: 'tab', tab: 'simulation' },
        { key: 'high3-05-4', t: '생기부-기출 갭 분석 → 여름방학 집중 계획 수립', type: 'teacher' },
      ],
    },
    {
      m: '7월', theme: '수시 직전 최종 완성 ①', freq: '주 2~3회', missions: [
        { key: 'high3-07-1', t: '생기부 예상질문 전체 답변 완성 + 대학별 맞춤 분석', type: 'tab', tab: 'expect' },
        { key: 'high3-07-2', t: '기출문제 집중 완성 — 지원 대학 패턴 완전히 내 것으로', type: 'tab', tab: 'past' },
        { key: 'high3-07-3', t: 'SKY·교대 지원자 → 꼬리질문 집중 대비', type: 'tab', tab: 'expect' },
        { key: 'high3-07-4', t: '지원 대학 최종 확정', type: 'teacher' },
      ],
    },
    {
      m: '8월', theme: '수시 직전 최종 완성 ②', freq: '주 2~3회', missions: [
        { key: 'high3-08-1', t: '실전 면접 시뮬레이션 3~5회 집중 반복', type: 'tab', tab: 'simulation' },
        { key: 'high3-08-2', t: '영상·음성 분석 후 약점 최종 보완', type: 'teacher' },
        { key: 'high3-08-3', t: 'SKY·교대 지원자 → 제시문 최종 완성 + 꼬리질문', type: 'tab', tab: 'presentation' },
        { key: 'high3-08-4', t: '면접 전날 루틴 완성', type: 'teacher' },
      ],
    },
    {
      m: '10월', theme: '수시 면접 완주', freq: '면접일 맞춤', missions: [
        { key: 'high3-10-1', t: '면접 일정 확인 후 대학별 맞춤 최종 점검', type: 'teacher' },
        { key: 'high3-10-2', t: '면접 전날 시뮬레이션 1회 — 긴장감 조절 + 컨디션 체크', type: 'tab', tab: 'simulation' },
        { key: 'high3-10-3', t: '앞선 면접 피드백 반영 → 다음 면접 바로 보완', type: 'teacher' },
        { key: 'high3-10-4', t: 'SKY·교대 제시문 면접 최종 점검', type: 'tab', tab: 'presentation' },
      ],
    },
    {
      m: '12월', theme: '수시 결과 확인 + 마무리', freq: '필요시', missions: [
        { key: 'high3-12-1', t: '수시 합격 → 마무리 및 대학 생활 준비', type: 'teacher' },
        { key: 'high3-12-2', t: '정시 대비 필요 시 → 추가 전략 수립', type: 'teacher' },
        { key: 'high3-12-3', t: '합격 후기 공유', type: 'teacher' },
        { key: 'high3-12-4', t: '고등학교 생활 마무리', type: 'teacher' },
      ],
    },
  ],
}

/**
 * month 문자열("3월")에서 숫자만 추출 → DB에 저장될 month 컬럼 값
 */
export function parseMonth(m: string): number {
  return parseInt(m.replace('월', ''), 10)
}

/**
 * 현재 학년 숫자 (1, 2, 3)를 '고1', '고2', '고3' 형태로 변환
 */
export function toGradeKey(grade: string | null | undefined): GradeKey {
  if (grade?.includes('3')) return '고3'
  if (grade?.includes('2')) return '고2'
  return '고1'
}