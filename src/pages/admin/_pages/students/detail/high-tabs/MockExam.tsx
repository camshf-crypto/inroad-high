import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  useStudentMockExams,
  useCreateMockExam,
  useGenerateQuestions,
  useGenerateMajorQuestions,
  useOpenMockExam,
  useMockExamQuestions,
  useMockExamMajor,
  useScoreMajorQuestion,
  useCompleteMockExam,
  useMockExamReport,
  useGenerateReport,
} from '../../../../_hooks/useHighMockExam'
import { getFixedQuestions } from '@/lib/mockExam/fixedQuestions'
import MockExamReportView from '@/components/MockExamReportView'

// 파랑 테마
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

// ─────────────────────────────────────────────
// 회차 일정 (고1 2월말 제거 → 8개 회차)
// ─────────────────────────────────────────────
const EXAM_SCHEDULE: Record<string, { period: string, type: string, level: string, aiGenerated: boolean }[]> = {
  '고1': [
    { period: '8월말', type: '기초', level: '전공기초', aiGenerated: false },
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

const Q1_INTRODUCTION = '본인을 소개해주세요.'
const MAIN_TIME_LIMIT_SEC = 120

// ─────────────────────────────────────────────
// 학생 생기부 예상질문 추출
// ─────────────────────────────────────────────

interface SaenggibuPick {
  question_text: string
  type: string
  source_question_id: string
}

async function pickSaenggibuQuestions(studentId: string): Promise<SaenggibuPick[]> {
  const { data, error } = await supabase
    .from('high_saenggibu_questions')
    .select('id, question, teacher_edited_question, category')
    .eq('student_id', studentId)
    .eq('question_status', 'published')

  if (error) throw new Error(`생기부 예상질문 조회 실패: ${error.message}`)
  if (!data || data.length < 2) {
    throw new Error('학생의 생기부 예상질문이 부족합니다. 먼저 생기부 탭에서 예상질문을 등록·발행해주세요.')
  }

  const byCategory: Record<string, typeof data> = {}
  for (const row of data) {
    const cat = row.category?.trim() || '기타'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(row)
  }

  const categories = Object.keys(byCategory)
  const picks: typeof data = []

  if (categories.length >= 2) {
    const shuffledCats = [...categories].sort(() => Math.random() - 0.5)
    for (let i = 0; i < 2; i++) {
      const cat = shuffledCats[i]
      const pool = byCategory[cat]
      const one = pool[Math.floor(Math.random() * pool.length)]
      picks.push(one)
    }
  } else {
    const pool = byCategory[categories[0]]
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    picks.push(shuffled[0], shuffled[1])
  }

  return picks.map(p => ({
    question_text: (p.teacher_edited_question?.trim() || p.question || '').trim(),
    type: '생기부',
    source_question_id: p.id,
  }))
}

// ─────────────────────────────────────────────
// 전공특화 시드 (기존 그대로)
// ─────────────────────────────────────────────

const MAJOR_QUESTIONS: Record<string, any[]> = {
  '전공기초': [
    { order: 1, q: '컴퓨터에서 이진수를 사용하는 이유는?', type: 'objective', timeLimitSec: 30, options: ['계산이 가장 빠르기 때문', '전기 신호의 ON/OFF 두 상태를 표현하기 위해', '숫자가 더 간단하기 때문', '메모리를 덜 쓰기 위해'], correctIndex: 1, correct: '전기 신호의 ON/OFF 두 가지 상태를 표현하기 위해' },
    { order: 2, q: '알고리즘이란 무엇인가?', type: 'objective', timeLimitSec: 30, options: ['컴퓨터 프로그램의 이름', '수학 공식의 모음', '문제를 해결하기 위한 단계적 절차나 방법', '데이터베이스의 일종'], correctIndex: 2, correct: '문제를 해결하기 위한 단계적 절차나 방법' },
    { order: 3, q: 'DNA의 이중나선 구조를 발견한 과학자는?', type: 'objective', timeLimitSec: 30, options: ['다윈과 멘델', '왓슨과 크릭', '뉴턴과 아인슈타인', '파스퇴르와 코흐'], correctIndex: 1, correct: '왓슨과 크릭 (1953년)' },
    { order: 4, q: '광합성의 기본 반응식에서 필요한 것이 아닌 것은?', type: 'objective', timeLimitSec: 30, options: ['이산화탄소(CO₂)', '물(H₂O)', '산소(O₂)', '빛 에너지'], correctIndex: 2, correct: '산소는 광합성의 결과물(생성물)이다.' },
    { order: 5, q: '뉴턴의 제2법칙을 수식으로 표현하고 그 의미를 설명하세요.', type: 'subjective', timeLimitSec: 120, correct: 'F = ma (힘 = 질량 × 가속도)' },
    { order: 6, q: '다음 중 세포분열의 종류에 해당하지 않는 것은?', type: 'objective', timeLimitSec: 30, options: ['유사분열(체세포분열)', '감수분열', '광합성분열', '모두 해당한다'], correctIndex: 2, correct: '세포분열은 유사분열과 감수분열 두 종류' },
    { order: 7, q: '수요와 공급의 법칙으로 옳은 것은?', type: 'objective', timeLimitSec: 30, options: ['가격이 오르면 수요도 오른다', '가격이 내리면 공급도 내린다', '가격이 오르면 수요는 줄고 공급은 늘어난다', '수요와 공급은 가격과 무관하다'], correctIndex: 2, correct: '가격이 오르면 수요 감소, 공급 증가' },
    { order: 8, q: '삼권분립에서 말하는 세 권력이 아닌 것은?', type: 'objective', timeLimitSec: 30, options: ['입법권', '행정권', '사법권', '언론권'], correctIndex: 3, correct: '입법·행정·사법 권력' },
    { order: 9, q: '미적분학에서 도함수가 의미하는 것은?', type: 'objective', timeLimitSec: 30, options: ['함수의 평균값', '함수의 순간 변화율', '함수의 총합', '함수의 최댓값'], correctIndex: 1, correct: '함수의 순간 변화율' },
    { order: 10, q: '빅뱅 이론을 간단히 설명하세요.', type: 'subjective', timeLimitSec: 120, correct: '약 138억 년 전 우주가 폭발적으로 팽창' },
  ],
  '전공기초심화': [
    { order: 1, q: '다음 중 평균 시간복잡도가 O(nlogn)인 정렬 알고리즘은?', type: 'objective', timeLimitSec: 30, options: ['버블 정렬', '퀵 정렬', '선택 정렬', '삽입 정렬'], correctIndex: 1, correct: '퀵 정렬, 병합 정렬' },
    { order: 2, q: 'DNA 복제의 특징은?', type: 'objective', timeLimitSec: 30, options: ['보존적 복제', '반보존적 복제', '분산적 복제', '무작위 복제'], correctIndex: 1, correct: '반보존적 복제' },
    { order: 3, q: '열역학 제2법칙의 핵심 내용은?', type: 'objective', timeLimitSec: 30, options: ['에너지는 보존된다', '엔트로피는 항상 증가하는 방향으로 진행', '절대영도에 도달할 수 없다', '열은 일로 변환된다'], correctIndex: 1, correct: '엔트로피는 항상 증가' },
    { order: 4, q: '케인즈 경제학의 핵심 주장은?', type: 'objective', timeLimitSec: 30, options: ['시장은 스스로 조절된다', '정부는 개입하지 말아야 한다', '정부의 적극적 재정정책으로 경기침체 극복 가능', '통화량은 경제에 영향 없다'], correctIndex: 2, correct: '정부의 적극적 재정정책' },
    { order: 5, q: '사회계약론의 주요 사상가 3명을 들고 각자 주장의 차이점을 설명하세요.', type: 'subjective', timeLimitSec: 120, correct: '홉스, 로크, 루소' },
    { order: 6, q: '미분방정식의 정의로 옳은 것은?', type: 'objective', timeLimitSec: 30, options: ['미지수와 상수의 관계식', '미지함수와 그 도함수를 포함하는 방정식', '다항식의 근을 구하는 방정식', '무한급수의 합을 구하는 식'], correctIndex: 1, correct: '미지함수와 도함수의 관계식' },
    { order: 7, q: '면역계에서 항원-항체 반응의 원리는?', type: 'objective', timeLimitSec: 30, options: ['항원이 항체를 만든다', '항원의 특이적 구조에 맞는 항체가 결합', '모든 항체는 모든 항원과 결합한다', '항체는 세포 내부에서만 작용한다'], correctIndex: 1, correct: '특이적 구조 결합' },
    { order: 8, q: '아인슈타인의 E=mc²가 의미하는 것은?', type: 'objective', timeLimitSec: 30, options: ['에너지는 빛보다 빠르다', '질량과 에너지는 상호 전환 가능', '물체가 빛의 속도로 움직인다', '에너지는 창조된다'], correctIndex: 1, correct: '질량-에너지 등가' },
    { order: 9, q: '빅데이터의 3V에 해당하지 않는 것은?', type: 'objective', timeLimitSec: 30, options: ['Volume', 'Velocity', 'Variety', 'Verification'], correctIndex: 3, correct: 'Volume, Velocity, Variety' },
    { order: 10, q: '다윈의 자연선택설을 설명하세요.', type: 'subjective', timeLimitSec: 120, correct: '환경에 적합한 변이가 다음 세대로 전달' },
  ],
  '전공심화': [
    { order: 1, q: '머신러닝에서 과적합(Overfitting)이란?', type: 'objective', timeLimitSec: 30, options: ['데이터가 너무 적어 학습 실패', '훈련 데이터에 지나치게 맞춰져 새 데이터에 성능 저하', '모델이 너무 단순함', '학습 속도가 너무 빠름'], correctIndex: 1, correct: '훈련 데이터에 지나치게 맞춤' },
    { order: 2, q: 'CRISPR-Cas9 기술의 핵심 기능은?', type: 'objective', timeLimitSec: 30, options: ['DNA 복제 속도 증가', '특정 DNA 서열을 정밀하게 편집', '단백질 합성 억제', '세포 분열 촉진'], correctIndex: 1, correct: '정밀 유전자 편집' },
    { order: 3, q: '양자역학의 불확정성 원리가 말하는 것은?', type: 'objective', timeLimitSec: 30, options: ['입자는 항상 위치가 정해져 있다', '위치와 운동량을 동시에 정확히 측정하는 것은 불가능', '관찰자는 실험에 영향을 주지 않는다', '양자는 고전역학을 따른다'], correctIndex: 1, correct: '위치-운동량 동시 측정 불가' },
    { order: 4, q: '행동경제학이 전통경제학과 구별되는 핵심 관점은?', type: 'objective', timeLimitSec: 30, options: ['모든 인간은 완전 합리적이다', '인간의 비합리적 의사결정 과정을 심리학적으로 분석', '수학적 모델이 경제를 완벽히 설명한다', '시장은 항상 효율적이다'], correctIndex: 1, correct: '비합리성 분석' },
    { order: 5, q: '포퓰리즘(Populism)의 특징과 등장 배경을 설명하세요.', type: 'subjective', timeLimitSec: 120, correct: '엘리트 반대 + 대중 감정 활용' },
    { order: 6, q: '미분기하학에서 곡률이란?', type: 'objective', timeLimitSec: 30, options: ['곡선의 길이', '곡선이나 곡면이 얼마나 구부러져 있는지를 나타내는 양', '곡선의 넓이', '곡선의 기울기'], correctIndex: 1, correct: '곡률' },
    { order: 7, q: '후성유전학(Epigenetics)의 핵심 개념은?', type: 'objective', timeLimitSec: 30, options: ['DNA 서열이 바뀌어 형질이 변함', 'DNA 서열 변화 없이 유전자 발현이 조절되는 현상', '세포가 돌연변이를 일으키는 과정', '유전자가 완전히 소멸하는 현상'], correctIndex: 1, correct: 'DNA 변화 없는 발현 조절' },
    { order: 8, q: '특수 상대성 이론의 시간 지연 효과란?', type: 'objective', timeLimitSec: 30, options: ['모든 관찰자에게 시간은 똑같이 흐른다', '빠르게 움직이는 물체에서 시간이 더 느리게 흐르는 현상', '중력이 강한 곳에서 시간이 빨라진다', '시간은 절대적이다'], correctIndex: 1, correct: '시간 지연' },
    { order: 9, q: 'TCP/IP 프로토콜의 4계층이 아닌 것은?', type: 'objective', timeLimitSec: 30, options: ['네트워크 접근 계층', '인터넷 계층', '전송 계층', '표현 계층'], correctIndex: 3, correct: '4계층: 네트워크 접근, 인터넷, 전송, 응용' },
    { order: 10, q: '신경가소성의 개념과 교육적 의의를 설명하세요.', type: 'subjective', timeLimitSec: 120, correct: '경험에 의한 뇌 변화' },
  ],
  '전공실전심화': [
    { order: 1, q: 'GPT의 Transformer 아키텍처에서 Attention 메커니즘의 역할은?', type: 'objective', timeLimitSec: 30, options: ['모델의 크기를 축소', '입력 시퀀스의 각 위치가 다른 위치와의 관계를 학습', '학습 속도를 줄임', '데이터를 정렬함'], correctIndex: 1, correct: 'Self-Attention' },
    { order: 2, q: 'mRNA 백신의 작동 원리는?', type: 'objective', timeLimitSec: 30, options: ['약화된 바이러스를 직접 주입', '스파이크 단백질 설계도를 세포에 전달, 면역반응 유도', '항체를 직접 주사함', '면역세포를 복제'], correctIndex: 1, correct: 'mRNA 전달' },
    { order: 3, q: '양자컴퓨터가 기존 컴퓨터보다 우수한 이유는?', type: 'objective', timeLimitSec: 30, options: ['전력 소모가 적어서', '큐비트의 중첩과 얽힘으로 병렬 연산 가능', '크기가 더 작아서', '더 빠른 전기 신호를 써서'], correctIndex: 1, correct: '중첩과 얽힘' },
    { order: 4, q: '양적완화(QE)의 메커니즘으로 옳은 것은?', type: 'objective', timeLimitSec: 30, options: ['세금을 올려 재정 수입 증가', '중앙은행이 채권 매입으로 시중 유동성 공급 확대', '기준금리를 인상', '정부 지출을 줄임'], correctIndex: 1, correct: '채권 매입' },
    { order: 5, q: '딥러닝의 역전파 알고리즘을 설명하고, 왜 중요한지 말하세요.', type: 'subjective', timeLimitSec: 120, correct: '오차 역전파' },
    { order: 6, q: '줄기세포의 분화 능력에 따라 분류한 것 중 가장 포괄적인 것은?', type: 'objective', timeLimitSec: 30, options: ['단능성', '다능성', '만능성', '전능성'], correctIndex: 3, correct: '전능성' },
    { order: 7, q: '블록체인의 대표적 합의 알고리즘은?', type: 'objective', timeLimitSec: 30, options: ['HTTP와 HTTPS', 'PoW와 PoS', 'TCP와 UDP', 'GET과 POST'], correctIndex: 1, correct: 'PoW, PoS' },
    { order: 8, q: '유전자 발현 조절에서 전사인자의 역할은?', type: 'objective', timeLimitSec: 30, options: ['RNA를 단백질로 번역', 'DNA의 프로모터 부위에 결합하여 전사 개시 조절', '세포막을 구성', '에너지를 생산'], correctIndex: 1, correct: '전사 개시 조절' },
    { order: 9, q: '현대 물리학의 표준 모형이 설명하는 것은?', type: 'objective', timeLimitSec: 30, options: ['지구의 구조', '소립자와 기본 힘을 설명하는 이론적 틀', '태양계의 운동', '원자의 구조만'], correctIndex: 1, correct: '소립자와 기본 힘' },
    { order: 10, q: '복잡계 이론에서 창발 현상을 예시와 함께 설명하세요.', type: 'subjective', timeLimitSec: 120, correct: '시스템 전체에서 새로운 성질 발생' },
  ],
  '전공고급심화': [
    { order: 1, q: '딥러닝에서 Vanishing Gradient 문제의 대표적 해결책은?', type: 'objective', timeLimitSec: 30, options: ['Sigmoid 활성화 함수 사용', 'ReLU 활성화 함수, 배치 정규화, 잔차 연결', '학습률을 올림', '데이터를 더 적게 사용'], correctIndex: 1, correct: 'ReLU, BN, ResNet' },
    { order: 2, q: 'CRISPR 치료제의 주요 윤리적 쟁점이 아닌 것은?', type: 'objective', timeLimitSec: 30, options: ['생식세포 편집의 유전성 문제', '치료 비용의 사회적 불평등', '피험자의 사전 동의 문제', '치료 효과의 부재'], correctIndex: 3, correct: '치료 효과는 우수' },
    { order: 3, q: '끈 이론의 핵심 개념은?', type: 'objective', timeLimitSec: 30, options: ['소립자는 점 입자이다', '소립자를 점이 아닌 1차원 끈으로 보는 물리학 이론', '우주는 단 1차원으로 구성', '입자는 파동으로 존재하지 않는다'], correctIndex: 1, correct: '1차원 끈' },
    { order: 4, q: 'ESG 투자에서 비재무적 요소를 재무 분석에 통합하는 방법은?', type: 'objective', timeLimitSec: 30, options: ['재무제표만 분석', '비재무적 요소를 정량화하여 재무모델에 통합', 'ESG는 무시함', '환경 요소만 고려'], correctIndex: 1, correct: '비재무적 정량화 통합' },
    { order: 5, q: 'LLM의 할루시네이션 문제와 최신 해결 방안을 설명하세요.', type: 'subjective', timeLimitSec: 120, correct: 'RLHF, RAG' },
    { order: 6, q: '합성생물학에서 최소 게놈 연구의 의의는?', type: 'objective', timeLimitSec: 30, options: ['게놈 크기를 늘리는 연구', '생명 유지에 필수적인 최소한의 유전자 집합', 'DNA 복제 속도 연구', '인공 바이러스 제작'], correctIndex: 1, correct: '필수 최소 유전자 집합' },
    { order: 7, q: '위상수학의 위상 동형을 정의하는 조건은?', type: 'objective', timeLimitSec: 30, options: ['두 공간이 같은 크기', '두 위상 공간 사이의 연속적이고 역연속적인 전단사 함수', '두 공간이 같은 색', '두 공간이 같은 재질'], correctIndex: 1, correct: '연속·역연속 전단사' },
    { order: 8, q: '의식에 대한 주요 신경과학 이론이 아닌 것은?', type: 'objective', timeLimitSec: 30, options: ['전역 작업공간 이론', '통합 정보 이론', '뉴런 분열 이론', '고차 이론'], correctIndex: 2, correct: 'GWT, IIT, HOT' },
    { order: 9, q: '포스트 AGI 시대의 경제적 영향으로 우려되는 것이 아닌 것은?', type: 'objective', timeLimitSec: 30, options: ['노동시장의 대규모 재편', '생산성의 폭발적 증가', '인구 자연 감소', '소득 불평등의 심화'], correctIndex: 2, correct: '인구 변화는 직접 관련 X' },
    { order: 10, q: '다중우주론의 주요 버전을 설명하고 각 이론의 차이점을 말하세요.', type: 'subjective', timeLimitSec: 120, correct: '에버렛, 린데, 테그마크' },
  ],
}

// ─────────────────────────────────────────────
// 색상
// ─────────────────────────────────────────────

const STATUS_COLOR = (s: string) => {
  if (s === 'analyzed') return { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7', label: '완료' }
  if (s === 'submitted') return { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE', label: '제출완료' }
  if (s === 'in_progress') return { bg: THEME.accentBg, color: THEME.accent, border: THEME.accentBorder, label: '진행중' }
  if (s === 'open') return { bg: '#FFF7ED', color: '#D97706', border: '#FDBA74', label: '대기' }
  return { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB', label: '준비중' }
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

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────

export default function MockExam({ student }: { student: any }) {
  const studentId: string = student.id
  const grade = student?.grade || '고1'
  const schedule = EXAM_SCHEDULE[grade] || []

  const [selPeriod, setSelPeriod] = useState(schedule[0]?.period || '')
  const [activeSection, setActiveSection] = useState<'main' | 'major' | 'report'>('main')
  const [selMainId, setSelMainId] = useState<string | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const { data: exams = [] } = useStudentMockExams(studentId, grade)
  const selExam = useMemo(() => exams.find(e => e.period === selPeriod), [exams, selPeriod])
  const { data: questions = [] } = useMockExamQuestions(selExam?.id)
  const { data: majors = [] } = useMockExamMajor(selExam?.id)
  const { data: report } = useMockExamReport(selExam?.id)

  const createExam = useCreateMockExam()
  const genQuestions = useGenerateQuestions()
  const genMajors = useGenerateMajorQuestions()
  const openExam = useOpenMockExam()
  const scoreMajor = useScoreMajorQuestion()
  const completeExam = useCompleteMockExam()
  const generateReport = useGenerateReport()

  useEffect(() => {
    setSelMainId(null)
    setCommentInput(selExam?.teacher_comment || '')
  }, [selPeriod, selExam?.id])

  const curSchedule = schedule.find(s => s.period === selPeriod)
  const mainQuestions = questions.filter(q => q.level === 'main').sort((a, b) => a.order - b.order)
  const selMain = mainQuestions.find(m => m.id === selMainId) || mainQuestions[0]
  const tails = selMain ? questions.filter(q => q.parent_id === selMain.id).sort((a, b) => (a.tail_index || 0) - (b.tail_index || 0)) : []

  const handleCreateExam = async () => {
    if (!curSchedule) return
    setIsCreating(true)
    let step = '회차 생성'
    try {
      const newExam = await createExam.mutateAsync({
        studentId, grade, period: selPeriod,
        examType: curSchedule.type, majorLevel: curSchedule.level,
        aiGenerated: curSchedule.aiGenerated,
      })

      step = 'Q2-Q3 생기부 추출'
      const saenggibuPicks = await pickSaenggibuQuestions(studentId)

      step = 'Q4-Q5 고정 질문'
      const fixedQs = getFixedQuestions(grade, selPeriod)
      if (fixedQs.length < 2) throw new Error(`${grade} ${selPeriod} 고정 질문 부족`)

      step = '본 질문 5개 insert'
      const mainRows = [
        { exam_id: newExam.id, student_id: studentId, order: 1, level: 'main', parent_id: null, tail_index: null, type: '자기소개', question_text: Q1_INTRODUCTION, ai_generated: false, time_limit_sec: MAIN_TIME_LIMIT_SEC },
        { exam_id: newExam.id, student_id: studentId, order: 2, level: 'main', parent_id: null, tail_index: null, type: saenggibuPicks[0].type, question_text: saenggibuPicks[0].question_text, ai_generated: true, time_limit_sec: MAIN_TIME_LIMIT_SEC },
        { exam_id: newExam.id, student_id: studentId, order: 3, level: 'main', parent_id: null, tail_index: null, type: saenggibuPicks[1].type, question_text: saenggibuPicks[1].question_text, ai_generated: true, time_limit_sec: MAIN_TIME_LIMIT_SEC },
        { exam_id: newExam.id, student_id: studentId, order: 4, level: 'main', parent_id: null, tail_index: null, type: fixedQs[0].type, question_text: fixedQs[0].questionText, ai_generated: false, time_limit_sec: MAIN_TIME_LIMIT_SEC },
        { exam_id: newExam.id, student_id: studentId, order: 5, level: 'main', parent_id: null, tail_index: null, type: fixedQs[1].type, question_text: fixedQs[1].questionText, ai_generated: false, time_limit_sec: MAIN_TIME_LIMIT_SEC },
      ]
      const { error: mainErr } = await supabase.from('high_mock_exam_questions').insert(mainRows)
      if (mainErr) throw mainErr

      step = '전공특화 생성'
      const seedMajors = MAJOR_QUESTIONS[curSchedule.level] || []
      const majorSeeds = seedMajors.map((m: any) => ({
        order: m.order, question: m.q, correct: m.correct,
        questionType: m.type, timeLimitSec: m.timeLimitSec,
        options: m.options || null,
        correctIndex: m.correctIndex !== undefined ? m.correctIndex : null,
      }))
      if (majorSeeds.length > 0) {
        await genMajors.mutateAsync({ examId: newExam.id, studentId, questions: majorSeeds })
      }

      step = '회차 오픈'
      await openExam.mutateAsync(newExam.id)
    } catch (e: any) {
      console.error(`[${step} 실패]`, e)
      alert(`[${step}] 실패: ${e.message || e.toString()}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleScoreMajor = (questionId: string, score: number) => {
    scoreMajor.mutate({ questionId, score })
  }

  const handleComplete = () => {
    if (!selExam) return
    completeExam.mutate({ examId: selExam.id, teacherComment: commentInput }, {
      onSuccess: () => {
        generateReport.mutate({ examId: selExam.id, studentId })
      },
    })
  }

  const handleDownloadPdf = () => {
    const reportEl = document.getElementById('admin-premium-report-content')
    if (!reportEl) return

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) return

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n')

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>면접 모의고사 리포트 - ${student?.name || ''}</title>
          ${styles}
          <style>
            body { margin: 0; padding: 20px; background: #F8FAFC; }
            @page { size: A4; margin: 10mm; }
            .report-page-card { page-break-inside: avoid !important; break-inside: avoid !important; }
            .report-page-break { page-break-before: always !important; break-before: page !important; }
          </style>
        </head>
        <body>${reportEl.innerHTML}</body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => { document.body.removeChild(iframe) }, 1000)
    }, 500)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* 시험 일정 탭 */}
      <div className="flex gap-2 mb-3 flex-shrink-0">
        {schedule.map(s => {
          const existExam = exams.find(e => e.period === s.period)
          const sc = STATUS_COLOR(existExam?.status || 'pending')
          const isSelected = selPeriod === s.period
          return (
            <button key={s.period} onClick={() => setSelPeriod(s.period)}
              className="flex-1 rounded-lg px-3 py-2 cursor-pointer transition-all flex items-center gap-2 min-w-0"
              style={{
                border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                background: isSelected ? THEME.accentBg : '#fff',
                boxShadow: isSelected ? `0 2px 6px ${THEME.accentShadow}` : 'none',
              }}>
              <div className="text-[12px] font-extrabold flex-shrink-0" style={{ color: isSelected ? THEME.accent : '#1a1a1a' }}>📅 {s.period}</div>
              <div className="text-[11px] font-semibold text-ink-secondary flex-shrink-0">· {s.type}</div>
              <div className="text-[10px] font-medium text-ink-muted truncate">{s.level}</div>
              {s.aiGenerated && <span className="text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full flex-shrink-0">✨ AI</span>}
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-auto" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}60` }}>{sc.label}</span>
            </button>
          )
        })}
      </div>

      {!selExam ? (
        <div className="flex-1 flex items-center justify-center bg-white border border-line rounded-2xl">
          <div className="text-center">
            <div className="text-4xl mb-3">📝</div>
            <div className="text-[15px] font-bold text-ink mb-1">아직 준비되지 않은 회차예요</div>
            <div className="text-[12px] text-ink-secondary mb-4 leading-relaxed">
              {grade} {selPeriod} · {curSchedule?.type} · {curSchedule?.level}<br />
              시작 버튼을 눌러 학생에게 오픈하세요.
            </div>
            <button onClick={handleCreateExam} disabled={isCreating || createExam.isPending || genQuestions.isPending || genMajors.isPending}
              className="px-6 py-3 text-white rounded-lg text-[13px] font-bold transition-all disabled:opacity-50"
              style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
              {isCreating ? '생성 중...' : '🚀 회차 시작 (학생에게 오픈)'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-1.5 mb-3.5 flex-shrink-0">
            {[
              { key: 'main', label: `📝 면접 질문 (${mainQuestions.length}문항)` },
              { key: 'major', label: `🧠 전공특화 (${majors.length}문항)` },
              { key: 'report', label: '📊 보고서' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveSection(tab.key as any)}
                className="px-4 py-2 rounded-full text-[12px] border transition-all"
                style={{
                  background: activeSection === tab.key ? THEME.accent : '#fff',
                  color: activeSection === tab.key ? '#fff' : '#6B7280',
                  borderColor: activeSection === tab.key ? THEME.accent : '#E5E7EB',
                  fontWeight: activeSection === tab.key ? 700 : 500,
                  boxShadow: activeSection === tab.key ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* 면접 질문 섹션 */}
          {activeSection === 'main' && (
            <div className="flex gap-3.5 flex-1 overflow-hidden">
              <div className="w-[260px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-line flex-shrink-0">
                  <div className="text-[13px] font-bold text-ink">본 질문 {mainQuestions.length}개</div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">꼬리질문은 학생 답변 후 AI 실시간 생성</div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3">
                  {mainQuestions.map((q, i) => {
                    const tc = TYPE_COLOR[q.type || ''] || TYPE_COLOR['인성']
                    const isSelected = (selMain?.id || mainQuestions[0]?.id) === q.id
                    return (
                      <button key={q.id} onClick={() => setSelMainId(q.id)}
                        className="w-full rounded-lg px-3 py-2.5 mb-1.5 text-left transition-all"
                        style={{ border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`, background: isSelected ? THEME.accentBg : '#fff' }}>
                        <div className="flex gap-1 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: THEME.accentDark, background: '#fff', border: `1px solid ${THEME.accentBorder}60` }}>Q{i + 1}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}60` }}>{q.type}</span>
                          {q.ai_generated && <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">AI</span>}
                        </div>
                        <div className="text-[11.5px] font-medium text-ink leading-[1.4] mb-1.5">{q.question_text}</div>
                        <div className="flex gap-1">
                          {q.student_answer
                            ? <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">✓ 답변완료</span>
                            : <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">⏳ 미답변</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0">
                {!selMain ? (
                  <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px]">질문을 선택해주세요</div>
                ) : (
                  <>
                    <div className="px-5 py-4 border-b border-line flex-shrink-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ color: THEME.accentDark, background: THEME.accentBg }}>Q{mainQuestions.findIndex(q => q.id === selMain.id) + 1}</span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: (TYPE_COLOR[selMain.type || ''] || TYPE_COLOR['인성']).bg, color: (TYPE_COLOR[selMain.type || ''] || TYPE_COLOR['인성']).color }}>{selMain.type}</span>
                        {selMain.ai_generated && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">✨ AI 생성</span>}
                      </div>
                      <div className="text-[14px] font-bold text-ink leading-[1.6]">{selMain.question_text}</div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5">
                      <div className="bg-gray-50 border border-line rounded-xl px-4 py-3.5">
                        <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">👤 학생 답변</div>
                        <div className="text-[13px] leading-[1.8] font-medium whitespace-pre-wrap" style={{ color: selMain.student_answer ? '#1a1a1a' : '#9CA3AF' }}>
                          {selMain.student_answer || '아직 학생이 답변을 작성하지 않았어요.'}
                        </div>
                      </div>

                      <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                        <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-3">🔗 꼬리질문 {tails.length > 0 ? `${tails.length}개` : '(아직 없음)'}</div>
                        {tails.length === 0 ? (
                          <div className="text-[12px] text-ink-muted leading-[1.7] font-medium bg-gray-50 rounded-md px-3 py-2.5">
                            학생이 본 질문에 답변하면 AI가 실시간으로 꼬리질문을 생성해요.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {tails.map((tail, idx) => (
                              <div key={tail.id} className="border border-line rounded-lg px-3 py-2.5 bg-gray-50">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: THEME.accentDark, background: '#fff', border: `1px solid ${THEME.accentBorder}60` }}>꼬리 {idx + 1}</span>
                                  <span className="text-[12px] font-semibold text-ink">{tail.question_text}</span>
                                </div>
                                <div className="text-[12px] bg-white rounded-md px-3 py-2 leading-[1.7] font-medium border border-line whitespace-pre-wrap" style={{ color: tail.student_answer ? '#1a1a1a' : '#9CA3AF' }}>
                                  {tail.student_answer || '학생 답변 없음'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 전공특화 섹션 */}
          {activeSection === 'major' && (
            <div className="flex-1 overflow-hidden flex gap-3.5">
              <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
                  <div>
                    <div className="text-[14px] font-bold text-ink">🧠 전공특화 문제 ({selExam?.major_level})</div>
                    <div className="text-[11px] text-ink-secondary mt-0.5">총 {majors.length}문항 · 채점: 0 / 50 / 100</div>
                  </div>
                  <div className="text-[12px] font-bold text-green-600">
                    채점완료: {majors.filter(m => m.score !== null).length}/{majors.length}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
                  {majors.map((q, i) => (
                    <div key={q.id} className="rounded-xl px-4 py-3.5 transition-all" style={{ border: `1px solid ${q.score !== null ? '#6EE7B7' : '#E5E7EB'}`, background: q.score !== null ? '#F0FDF4' : '#fff' }}>
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: THEME.accentDark, background: THEME.accentBg }}>Q{i + 1}</span>
                          <span className="text-[13px] font-semibold text-ink leading-[1.5]">{q.question_text}</span>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {[{ score: 100, label: '○', color: '#059669' }, { score: 50, label: '△', color: '#F97316' }, { score: 0, label: '✕', color: '#EF4444' }].map(({ score, label, color }) => (
                            <button key={score} onClick={() => handleScoreMajor(q.id, score)} disabled={scoreMajor.isPending}
                              className="w-10 h-8 rounded-md text-[13px] font-extrabold transition-all disabled:opacity-50"
                              style={{ background: q.score === score ? color : '#F3F4F6', color: q.score === score ? '#fff' : '#6B7280' }}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="text-[12px] text-ink-secondary mb-2 font-medium whitespace-pre-wrap">
                        <span className="font-bold">학생 답변: </span><span>{q.student_answer || '미작성'}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-md">
                        <span className="font-bold">✓ 정답: </span>{q.correct_answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 보고서 섹션 - 새 컴포넌트 */}
          {activeSection === 'report' && (
            <div className="flex-1 overflow-hidden bg-white border border-line rounded-2xl flex flex-col">
              <div className="px-5 py-3 border-b border-line flex-shrink-0 flex items-center justify-between gap-3 flex-wrap bg-white">
                <div className="text-[13px] font-bold text-ink">📊 프리미엄 학부모 리포트</div>
                <div className="flex gap-2 flex-wrap items-center">
                  <textarea value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder="종합 코멘트 작성..." rows={1}
                    className="w-[240px] border border-line rounded-lg px-3 py-2 text-[12px] font-medium outline-none resize-none" />
                  <button onClick={handleComplete} disabled={completeExam.isPending || generateReport.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] font-bold hover:bg-green-700 disabled:opacity-50">
                    {completeExam.isPending || generateReport.isPending ? '생성 중...' : '✓ 시험 완료 + 리포트 생성'}
                  </button>
                  <button onClick={handleDownloadPdf} className="px-4 py-2 text-white rounded-lg text-[12px] font-bold"
                    style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
                    🖨️ PDF 다운로드
                  </button>
                </div>
              </div>

              {!report ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted py-10">
                  <div className="text-5xl">📋</div>
                  <div className="text-[14px] font-bold text-ink">아직 리포트가 없어요</div>
                  <div className="text-[12px] text-ink-secondary text-center">
                    위 '시험 완료 + 리포트 생성' 버튼을 눌러<br />
                    AI 리포트를 자동으로 생성해주세요.
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto" style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
                  <MockExamReportView
                    student={student}
                    selExam={selExam}
                    report={report}
                    questions={questions}
                    majors={majors}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}