/**
 * 중등 로드맵 (본사 공통 커리큘럼)
 *
 * - 학년: 중1 / 중2 / 중3특목 / 중3일반
 *   · 중3특목 — 자사고·외고·국제고 (자기주도학습전형: 자소서 + 면접)
 *   · 중3일반 — 일반고 (PRE-BUILD: 고1 교과활동·탐구 선행)
 * - 월: 1, 2, 3, 4, 5, 6, 7, 8 (8개월)
 * - 미션 타입:
 *   - inAnswer: 비커스 서비스로 진행 (보라)
 *   - tab: 특정 탭으로 이동 (파랑, tab 속성 참고)
 *   - teacher: 선생님 오프라인 지도 (초록)
 *
 * mission_key 규칙: middle{학년}-{월번호 2자리}-{순서}
 *   예: middle2-03-1  = 중2 3월 1번째 미션
 *       middle3-03-1  = 중3 특목 트랙
 *       middle3g-03-1 = 중3 일반고 트랙 (g = general)
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
  /** 어느 과목 활동인지 (국어 / 수학 / 영어 / 사회 / 과학 / 정보 / 진로 / 발표 / 융합) */
  subject?: string
}

export interface RoadmapMonth {
  m: string
  theme: string
  freq: string
  /** 그 달에 남기는 결과물 */
  output?: string
  missions: Mission[]
}

export type MiddleGradeKey = '중1' | '중2' | '중3특목' | '중3일반'

// 고등의 GradeKey와 충돌 방지용 재export
export type { HighGradeKey }

export const MIDDLE_ROADMAP: Record<MiddleGradeKey, RoadmapMonth[]> = {
  '중1': [
    {
      m: '1개월', theme: '나를 이해하기', freq: '주 1회 (4주)', output: '개인 관심·강점 지도',
      missions: [
        { key: 'middle1-01-1', subject: '국어', t: '나를 보여주는 경험 5개 찾기', type: 'teacher' },
        { key: 'middle1-01-2', subject: '수학', t: '나의 하루·관심사를 데이터로 분석', type: 'teacher' },
        { key: 'middle1-01-3', subject: '영어', t: 'My Future Self 작성·발표', type: 'teacher' },
        { key: 'middle1-01-4', subject: '진로', t: '흥미·강점·관심 키워드 연결', type: 'inAnswer' },
      ],
    },
    {
      m: '2개월', theme: '직업 세계 탐색', freq: '주 1회 (4주)', output: '미래직업 탐색 리포트',
      missions: [
        { key: 'middle1-02-1', subject: '사회', t: '사회변화에 따라 사라지고 생기는 직업', type: 'teacher' },
        { key: 'middle1-02-2', subject: '과학', t: '과학기술이 만든 새로운 직업', type: 'teacher' },
        { key: 'middle1-02-3', subject: '정보·기가', t: 'AI 시대 미래직업 조사', type: 'teacher' },
        { key: 'middle1-02-4', subject: '영어', t: '관심 직업 해외 자료 조사·소개', type: 'teacher' },
      ],
    },
    {
      m: '3개월', theme: '학과 탐색', freq: '주 1회 (4주)', output: '학과 탐색 카드',
      missions: [
        { key: 'middle1-03-1', subject: '국어', t: '대학 학과 소개 자료 읽고 핵심 요약', type: 'teacher' },
        { key: 'middle1-03-2', subject: '사회', t: '직업과 대학 전공 연결', type: 'teacher' },
        { key: 'middle1-03-3', subject: '과학', t: '이공계 학과가 실제로 배우는 것', type: 'teacher' },
        { key: 'middle1-03-4', subject: '진로', t: '나에게 맞는 학과 TOP3 선정', type: 'inAnswer' },
      ],
    },
    {
      m: '4개월', theme: '탐구의 기초', freq: '주 1회 (4주)', output: '탐구주제 후보 5개',
      missions: [
        { key: 'middle1-04-1', subject: '과학', t: '관찰에서 질문 만들기', type: 'teacher' },
        { key: 'middle1-04-2', subject: '사회', t: '생활 속 사회문제 발견', type: 'teacher' },
        { key: 'middle1-04-3', subject: '국어', t: '단순 정보조사 vs 탐구 비교', type: 'teacher' },
        { key: 'middle1-04-4', subject: '정보', t: '검색·출처·자료 신뢰도 판단', type: 'teacher' },
      ],
    },
    {
      m: '5개월', theme: '좋은 질문 만들기', freq: '주 1회 (4주)', output: '나의 탐구질문 노트',
      missions: [
        { key: 'middle1-05-1', subject: '국어', t: '사실질문 → 생각질문 바꾸기', type: 'teacher' },
        { key: 'middle1-05-2', subject: '사회', t: '하나의 이슈에서 쟁점질문 만들기', type: 'teacher' },
        { key: 'middle1-05-3', subject: '과학', t: '가설형 질문 만들기', type: 'teacher' },
        { key: 'middle1-05-4', subject: '수학', t: '숫자로 확인할 수 있는 질문 만들기', type: 'teacher' },
      ],
    },
    {
      m: '6개월', theme: '첫 탐구 프로젝트', freq: '주 1회 (4주)', output: '첫 탐구보고서',
      missions: [
        { key: 'middle1-06-1', subject: '융합', t: '개인 탐구주제 선정·계획', type: 'inAnswer' },
        { key: 'middle1-06-2', subject: '정보', t: '자료검색·근거 수집', type: 'teacher' },
        { key: 'middle1-06-3', subject: '국어', t: '자료를 분석해 탐구보고서 작성', type: 'teacher' },
        { key: 'middle1-06-4', subject: '발표', t: '3분 탐구발표 + 질의응답', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '7개월', theme: '생각을 설명하기', freq: '주 1회 (4주)', output: '발표자료 + 발표영상',
      missions: [
        { key: 'middle1-07-1', subject: '국어', t: '주장 - 근거 - 사례 구성', type: 'teacher' },
        { key: 'middle1-07-2', subject: '사회', t: '찬반 토론 실습', type: 'tab', tab: 'debate' },
        { key: 'middle1-07-3', subject: '영어', t: '1~2분 Mini Presentation', type: 'teacher' },
        { key: 'middle1-07-4', subject: '발표', t: '연구내용 3분 발표 및 꼬리질문', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '8개월', theme: '1년 성장 정리', freq: '주 1회 (4주)', output: '중1 종합 Portfolio',
      missions: [
        { key: 'middle1-08-1', t: '과목별 결과물 정리', type: 'teacher' },
        { key: 'middle1-08-2', t: '과목별 가상 활동기록 작성', type: 'teacher' },
        { key: 'middle1-08-3', t: '관심학과와 활동 연결', type: 'inAnswer' },
        { key: 'middle1-08-4', subject: 'Portfolio Day', t: '1년 성장 발표', type: 'tab', tab: 'simulation' },
      ],
    },
  ],

  '중2': [
    {
      m: '1개월', theme: '관심분야 재진단', freq: '주 1회 (4주)', output: '중2 탐구 관심지도',
      missions: [
        { key: 'middle2-01-1', subject: '국어', t: '중1 활동에서 흥미 있었던 주제 찾기', type: 'teacher' },
        { key: 'middle2-01-2', subject: '사회', t: '관심 사회이슈 분석', type: 'teacher' },
        { key: 'middle2-01-3', subject: '과학', t: '관심 과학기술 분야 탐색', type: 'teacher' },
        { key: 'middle2-01-4', subject: '진로', t: '올해 탐구분야 2개 선정', type: 'inAnswer' },
      ],
    },
    {
      m: '2개월', theme: '교과 × 진로 연결', freq: '주 1회 (4주)', output: '교과 × 진로 MAP',
      missions: [
        { key: 'middle2-02-1', subject: '국어', t: '진로 관련 읽기자료에서 주제 찾기', type: 'teacher' },
        { key: 'middle2-02-2', subject: '수학', t: '관심분야 속 수학·통계 찾기', type: 'teacher' },
        { key: 'middle2-02-3', subject: '사회', t: '진로와 사회문제 연결', type: 'teacher' },
        { key: 'middle2-02-4', subject: '과학', t: '진로와 과학원리 연결', type: 'teacher' },
      ],
    },
    {
      m: '3개월', theme: '탐구주제 만들기', freq: '주 1회 (4주)', output: '과목별 탐구주제 리스트',
      missions: [
        { key: 'middle2-03-1', subject: '국어', t: '넓은 주제를 좁히는 방법', type: 'teacher' },
        { key: 'middle2-03-2', subject: '사회', t: '사회현상을 탐구질문으로 전환', type: 'teacher' },
        { key: 'middle2-03-3', subject: '과학', t: '가설·변수 설정', type: 'teacher' },
        { key: 'middle2-03-4', subject: '수학', t: '측정 가능한 데이터 질문 만들기', type: 'teacher' },
      ],
    },
    {
      m: '4개월', theme: '자료조사 능력', freq: '주 1회 (4주)', output: '탐구자료 분석표',
      missions: [
        { key: 'middle2-04-1', subject: '국어', t: '기사·칼럼 비교 읽기', type: 'teacher' },
        { key: 'middle2-04-2', subject: '영어', t: '해외자료 찾아 핵심 내용 파악', type: 'teacher' },
        { key: 'middle2-04-3', subject: '정보', t: '출처·검색·AI 자료 검증', type: 'teacher' },
        { key: 'middle2-04-4', subject: '사회', t: '공공통계 읽고 해석하기', type: 'teacher' },
      ],
    },
    {
      m: '5개월', theme: '탐구보고서 완성', freq: '주 1회 (4주)', output: '교과연계 탐구보고서',
      missions: [
        { key: 'middle2-05-1', t: '주제·문제의식 설정', type: 'inAnswer' },
        { key: 'middle2-05-2', t: '자료·통계 분석', type: 'teacher' },
        { key: 'middle2-05-3', subject: '국어', t: '서론 - 본론 - 결론 작성', type: 'teacher' },
        { key: 'middle2-05-4', t: '발표 및 피드백', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '6개월', theme: '수행평가 실전', freq: '주 1회 (4주)', output: '수행평가 Portfolio',
      missions: [
        { key: 'middle2-06-1', subject: '국어형', t: '발표·논설·독서 수행', type: 'tab', tab: 'suhaeng' },
        { key: 'middle2-06-2', subject: '사회형', t: '정책·토론·조사 수행', type: 'tab', tab: 'suhaeng' },
        { key: 'middle2-06-3', subject: '과학·수학형', t: '탐구·데이터 수행', type: 'tab', tab: 'suhaeng' },
        { key: 'middle2-06-4', subject: 'SCHOOL LAB', t: '학교별 수행평가 대비', type: 'teacher' },
      ],
    },
    {
      m: '7개월', theme: '탐구 확장', freq: '주 1회 (4주)', output: '후속탐구 보고서',
      missions: [
        { key: 'middle2-07-1', t: '기존 탐구의 한계 찾기', type: 'teacher' },
        { key: 'middle2-07-2', t: '새로운 후속질문 만들기', type: 'inAnswer' },
        { key: 'middle2-07-3', t: '추가 자료·데이터 조사', type: 'teacher' },
        { key: 'middle2-07-4', t: '1차 → 2차 탐구 비교발표', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '8개월', theme: '활동 연결', freq: '주 1회 (4주)', output: '중2 비교과 Portfolio',
      missions: [
        { key: 'middle2-08-1', t: '과목별 활동 분류', type: 'teacher' },
        { key: 'middle2-08-2', t: '활동 간 연결성 찾기', type: 'inAnswer' },
        { key: 'middle2-08-3', t: '가상 교과활동 기록 작성', type: 'teacher' },
        { key: 'middle2-08-4', subject: 'Research Conference', t: '탐구 성과 발표', type: 'tab', tab: 'simulation' },
      ],
    },
  ],

  // ───────────────────────────────────────────
  // 중3 특목 트랙 — 자사고·외고·국제고 (자기주도학습전형)
  // ───────────────────────────────────────────
  '중3특목': [
    {
      m: '1개월', theme: '고교 선택·진로 설계', freq: '주 1회 (4주)', output: '고교 선택 분석표',
      missions: [
        { key: 'middle3-01-1', t: '고교 유형 이해', type: 'teacher' },
        { key: 'middle3-01-2', t: '학교별 교육과정 분석', type: 'teacher' },
        { key: 'middle3-01-3', t: '나의 진로와 학교 매칭', type: 'inAnswer' },
        { key: 'middle3-01-4', t: '지원학교 비교·발표', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '2개월', theme: '고1 교과활동 Preview ①', freq: '주 1회 (4주)', output: '교과활동 Portfolio ①',
      missions: [
        { key: 'middle3-02-1', subject: '국어', t: '탐구', type: 'teacher' },
        { key: 'middle3-02-2', subject: '영어', t: '탐구', type: 'teacher' },
        { key: 'middle3-02-3', subject: '수학', t: '데이터 프로젝트', type: 'teacher' },
        { key: 'middle3-02-4', subject: '통합사회', t: '프로젝트', type: 'teacher' },
      ],
    },
    {
      m: '3개월', theme: '고1 교과활동 Preview ②', freq: '주 1회 (4주)', output: '교과활동 Portfolio ②',
      missions: [
        { key: 'middle3-03-1', subject: '통합과학', t: '탐구', type: 'teacher' },
        { key: 'middle3-03-2', subject: '정보·기술', t: '프로젝트', type: 'teacher' },
        { key: 'middle3-03-3', t: '전공 연계 프로젝트', type: 'teacher' },
        { key: 'middle3-03-4', t: '수행평가 Simulation', type: 'tab', tab: 'suhaeng' },
      ],
    },
    {
      m: '4개월', theme: '고1 학생부 미리 설계하기', freq: '주 1회 (4주)', output: 'MY 학생부 Preview',
      missions: [
        { key: 'middle3-04-1', subject: '국·영', t: '활동기록', type: 'teacher' },
        { key: 'middle3-04-2', subject: '수·과', t: '활동기록', type: 'teacher' },
        { key: 'middle3-04-3', subject: '사회·정보', t: '활동기록', type: 'teacher' },
        { key: 'middle3-04-4', t: '가상 고1 학생부 완성', type: 'inAnswer' },
      ],
    },
    {
      m: '5개월', theme: '고1 활동 로드맵 완성', freq: '주 1회 (4주)', output: '고1 MASTER PLAN',
      missions: [
        { key: 'middle3-05-1', t: '관심학과 핵심역량', type: 'inAnswer' },
        { key: 'middle3-05-2', t: '과목별 후속탐구', type: 'teacher' },
        { key: 'middle3-05-3', t: '동아리·진로활동 설계', type: 'teacher' },
        { key: 'middle3-05-4', t: '고1 1년 계획 발표', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '6개월', theme: '자소서 + 면접 BASIC', freq: '주 1회 (4주)', output: 'EXPERIENCE BANK + 자소서 초안',
      missions: [
        { key: 'middle3-06-1', t: '자소서 문항·소재 발굴', type: 'tab', tab: 'expect' },
        { key: 'middle3-06-2', t: '자기주도학습 작성·답변', type: 'tab', tab: 'expect' },
        { key: 'middle3-06-3', t: '지원동기·진로계획 작성·답변', type: 'tab', tab: 'expect' },
        { key: 'middle3-06-4', t: '인성·공동체 작성·답변', type: 'tab', tab: 'basic' },
      ],
    },
    {
      m: '7개월', theme: '자소서 완성 + 서류면접', freq: '주 1회 (4주)', output: '최종 자소서 + 예상질문집',
      missions: [
        { key: 'middle3-07-1', t: '학교별 자소서 완성', type: 'tab', tab: 'expect' },
        { key: 'middle3-07-2', t: '자소서 기반 질문', type: 'tab', tab: 'expect' },
        { key: 'middle3-07-3', t: '활동·학생부 기반 질문', type: 'tab', tab: 'record' },
        { key: 'middle3-07-4', t: '꼬리질문·검증질문', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '8개월', theme: '학교별 실전면접', freq: '주 1회 (4주)', output: '고입 면접 Portfolio',
      missions: [
        { key: 'middle3-08-1', t: '학교별 기출', type: 'tab', tab: 'past' },
        { key: 'middle3-08-2', t: '실전 모의면접 ①', type: 'tab', tab: 'simulation' },
        { key: 'middle3-08-3', t: '영상 피드백·집중교정', type: 'tab', tab: 'simulation' },
        { key: 'middle3-08-4', t: 'FINAL 모의면접', type: 'tab', tab: 'simulation' },
      ],
    },
  ],

  // ───────────────────────────────────────────
  // 중3 일반고 트랙 — PRE-BUILD "고1에서 처음 하지 않는다"
  // ───────────────────────────────────────────
  '중3일반': [
    {
      m: '1개월', theme: '고교 선택·진로 설계', freq: '주 1회 (4주)', output: '고교생활 방향표',
      missions: [
        { key: 'middle3g-01-1', t: '고교 유형 이해', type: 'teacher' },
        { key: 'middle3g-01-2', t: '학교별 교육과정 비교', type: 'teacher' },
        { key: 'middle3g-01-3', t: '관심 진로·계열 탐색', type: 'inAnswer' },
        { key: 'middle3g-01-4', t: '나에게 맞는 고교생활 설계', type: 'inAnswer' },
      ],
    },
    {
      m: '2개월', theme: '고1 교과활동 미리보기 ①', freq: '주 1회 (4주)', output: '교과활동 Preview ①',
      missions: [
        { key: 'middle3g-02-1', subject: '국어', t: '국어형 활동', type: 'teacher' },
        { key: 'middle3g-02-2', subject: '영어', t: '영어형 활동', type: 'teacher' },
        { key: 'middle3g-02-3', subject: '수학', t: '수학·데이터형 활동', type: 'teacher' },
        { key: 'middle3g-02-4', subject: '통합사회', t: '통합사회형 활동', type: 'teacher' },
      ],
    },
    {
      m: '3개월', theme: '고1 교과활동 미리보기 ②', freq: '주 1회 (4주)', output: '교과활동 Preview ②',
      missions: [
        { key: 'middle3g-03-1', subject: '통합과학', t: '통합과학형 활동', type: 'teacher' },
        { key: 'middle3g-03-2', subject: '과학탐구실험', t: '과학탐구실험형 활동', type: 'teacher' },
        { key: 'middle3g-03-3', subject: '정보·기술', t: '정보·기술 활용 활동', type: 'teacher' },
        { key: 'middle3g-03-4', t: '수행평가 유형 미리보기', type: 'tab', tab: 'suhaeng' },
      ],
    },
    {
      m: '4개월', theme: '고1 활동기록 미리보기', freq: '주 1회 (4주)', output: '교육용 고1 활동 Preview',
      missions: [
        { key: 'middle3g-04-1', subject: '국·영', t: '활동 정리', type: 'teacher' },
        { key: 'middle3g-04-2', subject: '수·과', t: '활동 정리', type: 'teacher' },
        { key: 'middle3g-04-3', subject: '사회·정보', t: '활동 정리', type: 'teacher' },
        { key: 'middle3g-04-4', t: '활동의 과정·성장 정리', type: 'inAnswer' },
      ],
    },
    {
      m: '5개월', theme: '고1 활동 로드맵', freq: '주 1회 (4주)', output: '고1 기본 로드맵',
      missions: [
        { key: 'middle3g-05-1', t: '관심학과 핵심역량', type: 'inAnswer' },
        { key: 'middle3g-05-2', t: '고1 과목과 진로 연결', type: 'inAnswer' },
        { key: 'middle3g-05-3', t: '과목별 탐구방향 설정', type: 'teacher' },
        { key: 'middle3g-05-4', t: '고1 활동계획 발표', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '6개월', theme: '고1 탐구 선행 ①', freq: '주 1회 (4주)', output: '교과탐구 예행 2개',
      missions: [
        { key: 'middle3g-06-1', t: '교과 A 단원 분석', type: 'teacher' },
        { key: 'middle3g-06-2', t: '교과 A 탐구 실습', type: 'teacher' },
        { key: 'middle3g-06-3', t: '교과 B 단원 분석', type: 'teacher' },
        { key: 'middle3g-06-4', t: '교과 B 탐구 실습', type: 'teacher' },
      ],
    },
    {
      m: '7개월', theme: '고1 탐구 선행 ②', freq: '주 1회 (4주)', output: '교과탐구 예행 2개',
      missions: [
        { key: 'middle3g-07-1', t: '교과 C 탐구 실습', type: 'teacher' },
        { key: 'middle3g-07-2', t: '자료·데이터 활용', type: 'teacher' },
        { key: 'middle3g-07-3', t: '교과 D 탐구 실습', type: 'teacher' },
        { key: 'middle3g-07-4', t: '보고서·발표 완성', type: 'tab', tab: 'simulation' },
      ],
    },
    {
      m: '8개월', theme: '고1 입학 실전 선행', freq: '주 1회 (4주)', output: '고1 시작 지도',
      missions: [
        { key: 'middle3g-08-1', t: '탐구주제 선정 실습', type: 'teacher' },
        { key: 'middle3g-08-2', t: '보고서형 활동', type: 'teacher' },
        { key: 'middle3g-08-3', t: '발표·토론형 활동', type: 'tab', tab: 'simulation' },
        { key: 'middle3g-08-4', t: '고1 첫 학기 탐구방향 완성', type: 'inAnswer' },
      ],
    },
  ],

}

/**
 * month 문자열("3개월")에서 숫자만 추출 → DB에 저장될 month 컬럼 값
 */
export function parseMiddleMonth(m: string): number {
  return parseInt(m.replace(/[^0-9]/g, ''), 10) || 0
}

/**
 * 학년 + 트랙 → 로드맵 키
 * track: 'general' 이면 일반고, 그 외(null 포함)는 특목
 */
export function toMiddleGradeKey(
  grade: string | null | undefined,
  track?: string | null,
): MiddleGradeKey {
  if (grade?.includes('3')) return track === 'general' ? '중3일반' : '중3특목'
  if (grade?.includes('2')) return '중2'
  return '중1'
}

/**
 * 로드맵 키 → profiles.grade 에 저장된 값
 * (DB에는 '중3' 하나로만 저장되므로 두 트랙 모두 '중3'으로 되돌림)
 */
export function toProfileGrade(key: MiddleGradeKey): string {
  return key.startsWith('중3') ? '중3' : key
}