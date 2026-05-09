/**
 * 중등 로드맵 (본사 공통 커리큘럼)
 *
 * - 학년: 중1 / 중2 / 중3
 * - 월: 1, 2, 3, 4, 5, 6, 7, 8 (8개월)
 * - 미션 타입:
 *   - inAnswer: 비커스 서비스로 진행 (보라)
 *   - tab: 특정 탭으로 이동 (파랑, tab 속성 참고)
 *   - teacher: 선생님 오프라인 지도 (초록)
 *
 * mission_key 규칙: middle{학년}-{월번호 2자리}-{순서}
 *   예: middle2-03-1 = 중2 3월 1번째 미션
 *
 * ⚠️ mission_key 는 절대 바꾸지 말 것 (바꾸면 기존 체크 데이터와 연결 끊어짐)
 *    미션 텍스트(t, theme, freq)는 자유롭게 수정 가능
 */

import type { GradeKey as HighGradeKey } from './roadmap'

export type MissionType = 'inAnswer' | 'tab' | 'teacher'

export interface Mission {
  key: string
  t: string
  type: MissionType
  tab?: string
}

export interface RoadmapMonth {
  m: string
  theme: string
  freq: string
  missions: Mission[]
}

export type MiddleGradeKey = '중1' | '중2' | '중3'

// 고등의 GradeKey와 충돌 방지용 재export
export type { HighGradeKey }

export const MIDDLE_ROADMAP: Record<MiddleGradeKey, RoadmapMonth[]> = {
  '중1': [
    {
      m: '1월', theme: '시작하기 (OT + 기초)', freq: '주 1회 (4주)', missions: [
        { key: 'middle1-01-1', t: 'OT · 수행평가 이해 (1년 로드맵, 수행평가 구조)', type: 'teacher' },
        { key: 'middle1-01-2', t: '자기소개 스피치 — 30초 자기PR 녹화', type: 'tab', tab: 'simulation' },
        { key: 'middle1-01-3', t: '흥미·강점 진단 (홀랜드 검사)', type: 'inAnswer' },
        { key: 'middle1-01-4', t: '직업 탐색 — 6대 직업군 조사', type: 'teacher' },
      ],
    },
    {
      m: '2월', theme: '논술·서술 기초', freq: '주 1회 (4주)', missions: [
        { key: 'middle1-02-1', t: '답안 구조 이해 — 두괄식 구조 학습', type: 'teacher' },
        { key: 'middle1-02-2', t: '문단 쓰기 — 200→400자 훈련', type: 'teacher' },
        { key: 'middle1-02-3', t: '주장 글쓰기 — 근거 제시법', type: 'teacher' },
        { key: 'middle1-02-4', t: '실전 논술 1차 — 첨삭·피드백', type: 'teacher' },
      ],
    },
    {
      m: '3월', theme: '주제탐구 + 스피치', freq: '주 1회 (4주)', missions: [
        { key: 'middle1-03-1', t: '주제 발굴 — 질문 만들기', type: 'teacher' },
        { key: 'middle1-03-2', t: '자료 조사법 — 출처 표기', type: 'teacher' },
        { key: 'middle1-03-3', t: '발성·호흡 — 복식 호흡', type: 'tab', tab: 'simulation' },
        { key: 'middle1-03-4', t: '자세·제스처 — 눈 맞춤 훈련', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '5월', theme: '수행평가 유형별 ①', freq: '주 1회 (4주)', missions: [
        { key: 'middle1-04-1', t: '국어 수행평가 실전 — 실제 기출 연습', type: 'tab', tab: 'past' },
        { key: 'middle1-04-2', t: '사회 수행평가 실전 — 실제 기출 연습', type: 'tab', tab: 'past' },
        { key: 'middle1-04-3', t: '1분 스피치 — 즉흥 발표', type: 'tab', tab: 'simulation' },
        { key: 'middle1-04-4', t: '발표 실전 — 과목별 시뮬', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '7월', theme: '고교 탐색 시작', freq: '주 1회 (4주)', missions: [
        { key: 'middle1-05-1', t: '고교 중요성 — 합격 사례 분석', type: 'teacher' },
        { key: 'middle1-05-2', t: '자사고·특목고 이해 — 유형 비교', type: 'teacher' },
        { key: 'middle1-05-3', t: '면접 맛보기 — 면접이란?', type: 'tab', tab: 'simulation' },
        { key: 'middle1-05-4', t: '인성 면접 기초 — 기본 질문 대응', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '8월', theme: '수행평가 유형별 ②', freq: '주 1회 (4주)', missions: [
        { key: 'middle1-06-1', t: '과학 수행평가 — 실험 보고서 기초', type: 'tab', tab: 'past' },
        { key: 'middle1-06-2', t: '역사 수행평가 — 주제탐구 연결', type: 'tab', tab: 'past' },
        { key: 'middle1-06-3', t: '탐구 보고서 작성 — 보고서 구조', type: 'teacher' },
        { key: 'middle1-06-4', t: '생기부 항목 이해 — 세특·활동', type: 'tab', tab: 'expect' },
      ],
    },
    {
      m: '10월', theme: '종합 실전', freq: '주 1회 (4주)', missions: [
        { key: 'middle1-07-1', t: '실전 논술 2차 — 심화 첨삭', type: 'teacher' },
        { key: 'middle1-07-2', t: '스토리텔링 스피치 — 경험 발표', type: 'tab', tab: 'simulation' },
        { key: 'middle1-07-3', t: '생기부 작성법 — 항목별 글쓰기', type: 'tab', tab: 'expect' },
        { key: 'middle1-07-4', t: '모의 면접 1차 — 1:1 면접', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '12월', theme: '마무리 + 포트폴리오', freq: '주 1회 (4주)', missions: [
        { key: 'middle1-08-1', t: '실전 논술 3차 — 최종 완성본', type: 'teacher' },
        { key: 'middle1-08-2', t: '자기소개서 기초 — 첫 초안 작성', type: 'tab', tab: 'expect' },
        { key: 'middle1-08-3', t: '스피치 완성 — 녹화·피드백', type: 'tab', tab: 'simulation' },
        { key: 'middle1-08-4', t: '학부모 발표회 — 1년 포트폴리오 발표', type: 'teacher' },
      ],
    },
  ],
  '중2': [
    {
      m: '1월', theme: '중2 전략 재설정', freq: '주 1회 (4주)', missions: [
        { key: 'middle2-01-1', t: '중2 OT · 내신 전략 — 수행평가 50% 재설정', type: 'teacher' },
        { key: 'middle2-01-2', t: '중1 리뷰 + 목표 TOP3 — 지망 고교 3개 선정', type: 'teacher' },
        { key: 'middle2-01-3', t: '국어 논술 심화 — 기출 분석', type: 'tab', tab: 'past' },
        { key: 'middle2-01-4', t: '사회 논술 심화 — 이슈 기반 글쓰기', type: 'teacher' },
      ],
    },
    {
      m: '2월', theme: '논술·서술 심화', freq: '주 1회 (4주)', missions: [
        { key: 'middle2-02-1', t: '역사 논술 — 연대·인과 구조', type: 'teacher' },
        { key: 'middle2-02-2', t: '수학 서술 — 풀이 서술법', type: 'teacher' },
        { key: 'middle2-02-3', t: '통합 논술 실전 — 3과목 통합', type: 'teacher' },
        { key: 'middle2-02-4', t: '설득 스피치 — 설득 구조 훈련', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '3월', theme: '주제탐구 심화', freq: '주 1회 (4주)', missions: [
        { key: 'middle2-03-1', t: '역사 탐구 — 주제 2개 선정', type: 'teacher' },
        { key: 'middle2-03-2', t: '과학 탐구 — 실험·분석·결론', type: 'teacher' },
        { key: 'middle2-03-3', t: '기가 보고서 — 탐구 활동 실무', type: 'teacher' },
        { key: 'middle2-03-4', t: '토론 스피치 — 찬반 토론 기초', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '5월', theme: '고입 전형 이해 + 내신 전략', freq: '주 1회 (4주)', missions: [
        { key: 'middle2-04-1', t: '고입 전형 구조 — 1·2단계 이해', type: 'teacher' },
        { key: 'middle2-04-2', t: '내신 반영 분석 — 학교별 비율', type: 'teacher' },
        { key: 'middle2-04-3', t: '합격 내신 갭 분석 — 필요 등급', type: 'teacher' },
        { key: 'middle2-04-4', t: '목표 전략서 작성 — 등급·계획', type: 'tab', tab: 'expect' },
      ],
    },
    {
      m: '7월', theme: '자기주도학습계획서 기초', freq: '주 1회 (4주)', missions: [
        { key: 'middle2-05-1', t: '자소서 항목 이해 — 요구 포인트', type: 'tab', tab: 'expect' },
        { key: 'middle2-05-2', t: 'STAR 경험 정리 — 구조화', type: 'tab', tab: 'expect' },
        { key: 'middle2-05-3', t: '초안 작성 — 항목별 초안', type: 'tab', tab: 'expect' },
        { key: 'middle2-05-4', t: '발표 스피치 심화 — 자세 완성', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '8월', theme: '면접 기초 시작', freq: '주 1회 (4주)', missions: [
        { key: 'middle2-06-1', t: '인성 면접 유형 — 공동체·리더십', type: 'tab', tab: 'simulation' },
        { key: 'middle2-06-2', t: '두괄식 답변 구조 — 답변 훈련', type: 'tab', tab: 'simulation' },
        { key: 'middle2-06-3', t: '답변집 20개 제작 — 녹화·피드백', type: 'tab', tab: 'simulation' },
        { key: 'middle2-06-4', t: '스피치 실전 — 과목별 발표', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '10월', theme: '면접 심화 + 학교별 기출', freq: '주 1회 (4주)', missions: [
        { key: 'middle2-07-1', t: '지원동기 답변 — 학교+진로 연결', type: 'tab', tab: 'simulation' },
        { key: 'middle2-07-2', t: '기출 분석 — 지망별 3년 기출', type: 'tab', tab: 'past' },
        { key: 'middle2-07-3', t: '수행평가 종합 1 — 국·사·역 통합', type: 'teacher' },
        { key: 'middle2-07-4', t: '수행평가 종합 2 — 과·기가 통합', type: 'teacher' },
      ],
    },
    {
      m: '12월', theme: '중간 점검 + 중3 준비', freq: '주 1회 (4주)', missions: [
        { key: 'middle2-08-1', t: '성과 점검 발표회 — 1년 발표', type: 'teacher' },
        { key: 'middle2-08-2', t: '취약점 진단 — 우선순위 재설정', type: 'teacher' },
        { key: 'middle2-08-3', t: '중3 대비 계획 — 방학 플랜', type: 'teacher' },
        { key: 'middle2-08-4', t: '중3 로드맵 발표 — 중간 리포트', type: 'teacher' },
      ],
    },
  ],
  '중3': [
    {
      m: '1월', theme: '전형 완전 정복 + 개인 전략', freq: '주 1회 (4주)', missions: [
        { key: 'middle3-01-1', t: 'OT · 개인 진단 — 개인 강점 분석', type: 'teacher' },
        { key: 'middle3-01-2', t: '고입 전형 완전 이해 — 자사고·특목·영재', type: 'teacher' },
        { key: 'middle3-01-3', t: '3지망 확정 — 1·2·3지망 분석', type: 'teacher' },
        { key: 'middle3-01-4', t: '맞춤 합격 전략 — 합격 포지셔닝', type: 'teacher' },
      ],
    },
    {
      m: '2월', theme: '자기주도학습계획서 완성', freq: '주 1회 (4주)', missions: [
        { key: 'middle3-02-1', t: '항목 분석 — 평가 기준 파악', type: 'tab', tab: 'expect' },
        { key: 'middle3-02-2', t: '3년 경험 정리 — STAR 구조', type: 'tab', tab: 'expect' },
        { key: 'middle3-02-3', t: '항목별 초안 — 4개 문항', type: 'tab', tab: 'expect' },
        { key: 'middle3-02-4', t: '완성본 제출 — 학교별 맞춤', type: 'tab', tab: 'expect' },
      ],
    },
    {
      m: '3월', theme: '독서 면접 대비', freq: '주 1회 (4주)', missions: [
        { key: 'middle3-03-1', t: '독서 면접 유형 — 자사고 유형', type: 'tab', tab: 'simulation' },
        { key: 'middle3-03-2', t: '전공별 독서 3권 — 계열별 선정', type: 'tab', tab: 'book' },
        { key: 'middle3-03-3', t: '책 기반 질문 대비 — 답변 구조', type: 'tab', tab: 'simulation' },
        { key: 'middle3-03-4', t: '심층 토론 연습 — 꼬리질문 대응', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '5월', theme: '인성 면접 훈련', freq: '주 1회 (4주)', missions: [
        { key: 'middle3-04-1', t: '인성 평가 요소 — 학교별 중시도', type: 'tab', tab: 'simulation' },
        { key: 'middle3-04-2', t: '리더십 답변 (STAR) — 구조화', type: 'tab', tab: 'simulation' },
        { key: 'middle3-04-3', t: '배려·성실성 답변 — 갈등 해결 사례', type: 'tab', tab: 'simulation' },
        { key: 'middle3-04-4', t: '답변집 30개 제작 — 녹화 피드백', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '7월', theme: '전공·학업 면접', freq: '주 1회 (4주)', missions: [
        { key: 'middle3-05-1', t: '지원동기 완성 — 학교+진로 연결', type: 'tab', tab: 'simulation' },
        { key: 'middle3-05-2', t: '학업 계획 답변 — 입학 후 설계', type: 'tab', tab: 'simulation' },
        { key: 'middle3-05-3', t: '전공 지식 대응 — 모르는 질문 대처', type: 'tab', tab: 'simulation' },
        { key: 'middle3-05-4', t: '답변집 30개 완성 — 전공·학업', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '8월', theme: '학교별 기출 & 맞춤', freq: '주 1회 (4주)', missions: [
        { key: 'middle3-06-1', t: '1지망 기출 5년 — 심층 분석', type: 'tab', tab: 'past' },
        { key: 'middle3-06-2', t: '1지망 답변집 40개 — 학교 맞춤', type: 'tab', tab: 'simulation' },
        { key: 'middle3-06-3', t: '2지망 답변집 30개 — 차별화', type: 'tab', tab: 'simulation' },
        { key: 'middle3-06-4', t: '3지망 답변집 30개 — 안정성', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '10월', theme: 'AI 압박면접 & 실전', freq: '주 1회 (4주)', missions: [
        { key: 'middle3-07-1', t: 'AI 모의면접 1차 — 전체 녹화·분석', type: 'tab', tab: 'simulation' },
        { key: 'middle3-07-2', t: '꼬리질문 대응 — 압박 대응', type: 'tab', tab: 'simulation' },
        { key: 'middle3-07-3', t: 'AI 모의면접 2차 — 난이도 상승', type: 'tab', tab: 'simulation' },
        { key: 'middle3-07-4', t: '대면 모의 면접 — 실제 면접관 투입', type: 'teacher' },
      ],
    },
    {
      m: '12월', theme: '최종 리허설 & 파이널', freq: '주 1회 (4주)', missions: [
        { key: 'middle3-08-1', t: '최종 점검 — 약점 보완', type: 'teacher' },
        { key: 'middle3-08-2', t: '리허설 1차 (1·2지망) — 완전 실전', type: 'tab', tab: 'simulation' },
        { key: 'middle3-08-3', t: '리허설 2차 (3지망) — 최종 피드백', type: 'tab', tab: 'simulation' },
        { key: 'middle3-08-4', t: '파이널 · 1:1 면접 — D-day 직전', type: 'teacher' },
      ],
    },
  ],
}

/**
 * month 문자열("3월")에서 숫자만 추출 → DB에 저장될 month 컬럼 값
 */
export function parseMiddleMonth(m: string): number {
  return parseInt(m.replace('월', ''), 10)
}

/**
 * 학년 문자열을 '중1', '중2', '중3' 형태로 변환
 */
export function toMiddleGradeKey(grade: string | null | undefined): MiddleGradeKey {
  if (grade?.includes('3')) return '중3'
  if (grade?.includes('2')) return '중2'
  return '중1'
}