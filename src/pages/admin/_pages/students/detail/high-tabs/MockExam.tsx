import { useState, useEffect, useMemo } from 'react'
import {
  useStudentMockExams,
  useCreateMockExam,
  useGenerateQuestions,
  useGenerateMajorQuestions,
  useOpenMockExam,
  useMockExamQuestions,
  useMockExamMajor,
  useUpdateQuestionFeedback,
  useScoreMajorQuestion,
  useCompleteMockExam,
  useMockExamReport,
  useGenerateReport,
  type MockExam,
} from '../../../../_hooks/useHighMockExam'

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
// 시드 데이터 (기존 UI 데이터 그대로)
// ─────────────────────────────────────────────

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
      { order: 1, text: '자신을 간단히 소개해주세요.', type: '자기소개' },
      { order: 2, text: '해당 학과에 지원하게 된 동기는 무엇인가요?', type: '지원동기' },
      { order: 3, text: '본인의 장점과 단점을 말해주세요.', type: '인성' },
      { order: 4, text: '고등학교에서 가장 열심히 했던 활동은 무엇인가요?', type: '활동' },
    ],
    '8월말': [
      { order: 1, text: '1학기 동안 가장 인상 깊었던 수업과 이유를 말해주세요.', type: '학업' },
      { order: 2, text: '팀 프로젝트에서 갈등이 생겼을 때 어떻게 해결했나요?', type: '인성' },
      { order: 3, text: '본인이 꿈꾸는 미래 직업과 그 이유를 말해주세요.', type: '진로' },
      { order: 4, text: '독서를 통해 얻은 가장 큰 깨달음은 무엇인가요?', type: '독서' },
    ],
    '10월말': [
      { order: 1, text: '생기부에 기록된 탐구활동 중 가장 의미있었던 것을 설명해주세요.', type: '생기부', aiGenerated: true },
      { order: 2, text: '동아리 활동에서 본인의 역할과 성과를 말해주세요.', type: '생기부', aiGenerated: true },
      { order: 3, text: '수행평가에서 어떤 주제를 선택했고 왜 그 주제를 골랐나요?', type: '생기부', aiGenerated: true },
      { order: 4, text: '올해 가장 성장했다고 느끼는 부분은 무엇인가요?', type: '성장', aiGenerated: false },
    ],
  },
  '고2': {
    '2월말': [
      { order: 1, text: '고1 때 탐구활동이 고2 학습에 어떤 영향을 미쳤나요?', type: '학업연계' },
      { order: 2, text: '지원 학과와 관련된 시사 이슈에 대해 본인의 견해를 말해주세요.', type: '전공' },
      { order: 3, text: '리더십을 발휘했던 경험을 구체적으로 말해주세요.', type: '인성' },
      { order: 4, text: '본인의 학습 방법과 그 효과에 대해 설명해주세요.', type: '학업' },
    ],
    '8월말': [
      { order: 1, text: '1학기 탐구활동에서 가장 어려웠던 점과 극복 방법은?', type: '탐구' },
      { order: 2, text: '지원 학과 관련 책을 읽고 느낀 점을 말해주세요.', type: '독서' },
      { order: 3, text: '본인이 생각하는 해당 학과의 핵심 역량은 무엇인가요?', type: '전공' },
      { order: 4, text: '친구나 후배를 도왔던 경험과 그때 느낀 점을 말해주세요.', type: '인성' },
    ],
    '10월말': [
      { order: 1, text: '생기부의 세특에 기록된 활동 중 전공과 가장 연관된 것은?', type: '생기부', aiGenerated: true },
      { order: 2, text: '2년간의 탐구활동이 어떻게 발전해왔는지 설명해주세요.', type: '생기부', aiGenerated: true },
      { order: 3, text: '독서활동이 본인의 전공 선택에 어떤 영향을 미쳤나요?', type: '생기부', aiGenerated: true },
      { order: 4, text: '고3을 앞두고 본인의 각오와 목표를 말해주세요.', type: '진로' },
    ],
  },
  '고3': {
    '2월말': [
      { order: 1, text: '3년간의 고교생활을 통해 본인이 가장 성장한 점은 무엇인가요?', type: '성장' },
      { order: 2, text: '지원 학과에서 배우고 싶은 것과 졸업 후 계획을 말해주세요.', type: '진로' },
      { order: 3, text: '본인의 탐구활동이 지원 학과와 어떻게 연결되나요?', type: '전공연계' },
      { order: 4, text: '어려운 상황을 극복했던 경험과 그때 배운 점은?', type: '인성' },
    ],
    '8월말': [
      { order: 1, text: '생기부에 기록된 활동들이 지원 학과와 어떻게 연결되는지 설명해주세요.', type: '생기부', aiGenerated: true },
      { order: 2, text: '기출문제 준비 과정에서 가장 어려웠던 질문과 극복 방법은?', type: '기출', aiGenerated: true },
      { order: 3, text: '본인만의 차별화된 역량이 있다면 무엇인가요?', type: '생기부', aiGenerated: true },
      { order: 4, text: '입학 후 가장 먼저 하고 싶은 활동은 무엇인가요?', type: '진로' },
    ],
    '10월말': [
      { order: 1, text: '면접을 준비하면서 가장 많이 성장한 점은 무엇인가요?', type: '성장' },
      { order: 2, text: '지원 학과 교수님께 꼭 배우고 싶은 분야가 있다면?', type: '전공' },
      { order: 3, text: '본인이 지원 학과에 꼭 합격해야 하는 이유를 설명해주세요.', type: '지원동기' },
      { order: 4, text: '10년 후 본인의 모습을 구체적으로 그려주세요.', type: '진로' },
    ],
  },
}

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

// ─────────────────────────────────────────────
// 전공특화 문제 시드 (객관식 8 + 주관식 2)
// ─────────────────────────────────────────────

const MAJOR_QUESTIONS: Record<string, any[]> = {
  '전공기초': [
    { order: 1, q: '컴퓨터에서 이진수를 사용하는 이유는?', type: 'objective', timeLimitSec: 30,
      options: ['계산이 가장 빠르기 때문', '전기 신호의 ON/OFF 두 상태를 표현하기 위해', '숫자가 더 간단하기 때문', '메모리를 덜 쓰기 위해'],
      correctIndex: 1, correct: '전기 신호의 ON/OFF 두 가지 상태를 표현하기 위해' },
    { order: 2, q: '알고리즘이란 무엇인가?', type: 'objective', timeLimitSec: 30,
      options: ['컴퓨터 프로그램의 이름', '수학 공식의 모음', '문제를 해결하기 위한 단계적 절차나 방법', '데이터베이스의 일종'],
      correctIndex: 2, correct: '문제를 해결하기 위한 단계적 절차나 방법' },
    { order: 3, q: 'DNA의 이중나선 구조를 발견한 과학자는?', type: 'objective', timeLimitSec: 30,
      options: ['다윈과 멘델', '왓슨과 크릭', '뉴턴과 아인슈타인', '파스퇴르와 코흐'],
      correctIndex: 1, correct: '왓슨과 크릭 (1953년)' },
    { order: 4, q: '광합성의 기본 반응식에서 필요한 것이 아닌 것은?', type: 'objective', timeLimitSec: 30,
      options: ['이산화탄소(CO₂)', '물(H₂O)', '산소(O₂)', '빛 에너지'],
      correctIndex: 2, correct: '산소는 광합성의 결과물(생성물)이다. 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂' },
    { order: 5, q: '뉴턴의 제2법칙을 수식으로 표현하고 그 의미를 설명하세요.', type: 'subjective', timeLimitSec: 120,
      correct: 'F = ma (힘 = 질량 × 가속도). 물체에 작용하는 힘은 질량과 가속도의 곱과 같으며, 같은 힘이라면 질량이 클수록 가속도는 작아진다.' },
    { order: 6, q: '다음 중 세포분열의 종류에 해당하지 않는 것은?', type: 'objective', timeLimitSec: 30,
      options: ['유사분열(체세포분열)', '감수분열', '광합성분열', '모두 해당한다'],
      correctIndex: 2, correct: '세포분열은 유사분열(체세포분열)과 감수분열 두 종류가 있다.' },
    { order: 7, q: '수요와 공급의 법칙으로 옳은 것은?', type: 'objective', timeLimitSec: 30,
      options: ['가격이 오르면 수요도 오른다', '가격이 내리면 공급도 내린다', '가격이 오르면 수요는 줄고 공급은 늘어난다', '수요와 공급은 가격과 무관하다'],
      correctIndex: 2, correct: '가격이 오르면 수요 감소, 공급 증가' },
    { order: 8, q: '삼권분립에서 말하는 세 권력이 아닌 것은?', type: 'objective', timeLimitSec: 30,
      options: ['입법권', '행정권', '사법권', '언론권'],
      correctIndex: 3, correct: '입법·행정·사법 권력을 분리하여 견제와 균형 유지' },
    { order: 9, q: '미적분학에서 도함수가 의미하는 것은?', type: 'objective', timeLimitSec: 30,
      options: ['함수의 평균값', '함수의 순간 변화율', '함수의 총합', '함수의 최댓값'],
      correctIndex: 1, correct: '함수의 순간 변화율 (접선의 기울기)' },
    { order: 10, q: '빅뱅 이론을 간단히 설명하세요.', type: 'subjective', timeLimitSec: 120,
      correct: '약 138억 년 전 매우 작고 뜨거운 상태에서 우주가 폭발적으로 팽창하여 현재의 우주가 되었다는 이론.' },
  ],

  '전공기초심화': [
    { order: 1, q: '다음 중 평균 시간복잡도가 O(nlogn)인 정렬 알고리즘은?', type: 'objective', timeLimitSec: 30,
      options: ['버블 정렬', '퀵 정렬', '선택 정렬', '삽입 정렬'],
      correctIndex: 1, correct: '퀵 정렬(O(nlogn)), 병합 정렬(O(nlogn)). 버블/선택/삽입은 O(n²)' },
    { order: 2, q: 'DNA 복제의 특징은?', type: 'objective', timeLimitSec: 30,
      options: ['보존적 복제', '반보존적 복제', '분산적 복제', '무작위 복제'],
      correctIndex: 1, correct: '반보존적 복제 - 이중나선이 풀리고 각 가닥이 주형이 되어 새 가닥 합성' },
    { order: 3, q: '열역학 제2법칙의 핵심 내용은?', type: 'objective', timeLimitSec: 30,
      options: ['에너지는 보존된다', '엔트로피는 항상 증가하는 방향으로 진행', '절대영도에 도달할 수 없다', '열은 일로 변환된다'],
      correctIndex: 1, correct: '엔트로피는 항상 증가하는 방향으로 진행' },
    { order: 4, q: '케인즈 경제학의 핵심 주장은?', type: 'objective', timeLimitSec: 30,
      options: ['시장은 스스로 조절된다', '정부는 개입하지 말아야 한다', '정부의 적극적 재정정책으로 경기침체 극복 가능', '통화량은 경제에 영향 없다'],
      correctIndex: 2, correct: '정부의 적극적 재정정책으로 경기침체 극복 가능 (총수요 관리)' },
    { order: 5, q: '사회계약론의 주요 사상가 3명을 들고 각자 주장의 차이점을 설명하세요.', type: 'subjective', timeLimitSec: 120,
      correct: '홉스(강력한 국가 권력 필요), 로크(국민의 권리 보호, 저항권), 루소(일반의지, 직접민주주의)' },
    { order: 6, q: '미분방정식의 정의로 옳은 것은?', type: 'objective', timeLimitSec: 30,
      options: ['미지수와 상수의 관계식', '미지함수와 그 도함수를 포함하는 방정식', '다항식의 근을 구하는 방정식', '무한급수의 합을 구하는 식'],
      correctIndex: 1, correct: '미지함수와 그 도함수를 포함하는 방정식' },
    { order: 7, q: '면역계에서 항원-항체 반응의 원리는?', type: 'objective', timeLimitSec: 30,
      options: ['항원이 항체를 만든다', '항원의 특이적 구조에 맞는 항체가 결합', '모든 항체는 모든 항원과 결합한다', '항체는 세포 내부에서만 작용한다'],
      correctIndex: 1, correct: '항원의 특이적 구조에 맞는 항체가 결합하여 무력화 (열쇠-자물쇠 관계)' },
    { order: 8, q: '아인슈타인의 E=mc²가 의미하는 것은?', type: 'objective', timeLimitSec: 30,
      options: ['에너지는 빛보다 빠르다', '질량과 에너지는 상호 전환 가능', '물체가 빛의 속도로 움직인다', '에너지는 창조된다'],
      correctIndex: 1, correct: 'E=mc² - 질량과 에너지는 상호 전환 가능하며, 작은 질량도 엄청난 에너지가 된다' },
    { order: 9, q: '빅데이터의 3V에 해당하지 않는 것은?', type: 'objective', timeLimitSec: 30,
      options: ['Volume (양)', 'Velocity (속도)', 'Variety (다양성)', 'Verification (검증)'],
      correctIndex: 3, correct: 'Volume(양), Velocity(속도), Variety(다양성)' },
    { order: 10, q: '다윈의 자연선택설을 설명하세요.', type: 'subjective', timeLimitSec: 120,
      correct: '환경에 적합한 변이를 가진 개체가 생존과 번식에 유리하여 해당 형질이 다음 세대에 더 많이 전달되는 과정. 생물 진화의 핵심 메커니즘.' },
  ],

  '전공심화': [
    { order: 1, q: '머신러닝에서 과적합(Overfitting)이란?', type: 'objective', timeLimitSec: 30,
      options: ['데이터가 너무 적어 학습 실패', '훈련 데이터에 지나치게 맞춰져 새 데이터에 성능 저하', '모델이 너무 단순함', '학습 속도가 너무 빠름'],
      correctIndex: 1, correct: '훈련 데이터에만 지나치게 맞춰져 새 데이터에 성능 저하' },
    { order: 2, q: 'CRISPR-Cas9 기술의 핵심 기능은?', type: 'objective', timeLimitSec: 30,
      options: ['DNA 복제 속도 증가', '특정 DNA 서열을 정밀하게 편집', '단백질 합성 억제', '세포 분열 촉진'],
      correctIndex: 1, correct: '특정 DNA 서열을 정밀하게 편집하는 유전자 편집 기술' },
    { order: 3, q: '양자역학의 불확정성 원리가 말하는 것은?', type: 'objective', timeLimitSec: 30,
      options: ['입자는 항상 위치가 정해져 있다', '위치와 운동량을 동시에 정확히 측정하는 것은 불가능', '관찰자는 실험에 영향을 주지 않는다', '양자는 고전역학을 따른다'],
      correctIndex: 1, correct: '위치와 운동량을 동시에 정확히 측정하는 것은 불가능 (하이젠베르크)' },
    { order: 4, q: '행동경제학이 전통경제학과 구별되는 핵심 관점은?', type: 'objective', timeLimitSec: 30,
      options: ['모든 인간은 완전 합리적이다', '인간의 비합리적 의사결정 과정을 심리학적으로 분석', '수학적 모델이 경제를 완벽히 설명한다', '시장은 항상 효율적이다'],
      correctIndex: 1, correct: '인간의 비합리적 의사결정 과정을 심리학적으로 분석 (카너먼, 탈러)' },
    { order: 5, q: '포퓰리즘(Populism)의 특징과 등장 배경을 설명하세요.', type: 'subjective', timeLimitSec: 120,
      correct: '엘리트에 반대하는 대중 감정을 이용한 정치 현상. 경제적 불평등, 이민 문제, 기존 정치에 대한 불신이 배경.' },
    { order: 6, q: '미분기하학에서 곡률(curvature)이란?', type: 'objective', timeLimitSec: 30,
      options: ['곡선의 길이', '곡선이나 곡면이 얼마나 구부러져 있는지를 나타내는 양', '곡선의 넓이', '곡선의 기울기'],
      correctIndex: 1, correct: '곡선이나 곡면이 얼마나 구부러져 있는지를 나타내는 양' },
    { order: 7, q: '후성유전학(Epigenetics)의 핵심 개념은?', type: 'objective', timeLimitSec: 30,
      options: ['DNA 서열이 바뀌어 형질이 변함', 'DNA 서열 변화 없이 유전자 발현이 조절되는 현상', '세포가 돌연변이를 일으키는 과정', '유전자가 완전히 소멸하는 현상'],
      correctIndex: 1, correct: 'DNA 서열 변화 없이 유전자 발현이 조절되는 현상 (메틸화, 히스톤 변형 등)' },
    { order: 8, q: '특수 상대성 이론의 시간 지연 효과란?', type: 'objective', timeLimitSec: 30,
      options: ['모든 관찰자에게 시간은 똑같이 흐른다', '빠르게 움직이는 물체에서 시간이 더 느리게 흐르는 현상', '중력이 강한 곳에서 시간이 빨라진다', '시간은 절대적이다'],
      correctIndex: 1, correct: '빠르게 움직이는 물체에서 시간이 더 느리게 흐르는 현상' },
    { order: 9, q: 'TCP/IP 프로토콜의 4계층이 아닌 것은?', type: 'objective', timeLimitSec: 30,
      options: ['네트워크 접근 계층', '인터넷 계층', '전송 계층', '표현 계층'],
      correctIndex: 3, correct: 'TCP/IP 4계층: 네트워크 접근, 인터넷, 전송, 응용' },
    { order: 10, q: '신경가소성(Neuroplasticity)의 개념과 교육적 의의를 설명하세요.', type: 'subjective', timeLimitSec: 120,
      correct: '경험에 의해 뇌의 구조와 기능이 변화하는 능력. 평생 학습과 재활이 가능한 생물학적 근거.' },
  ],

  '전공실전심화': [
    { order: 1, q: 'GPT의 Transformer 아키텍처에서 Attention 메커니즘의 역할은?', type: 'objective', timeLimitSec: 30,
      options: ['모델의 크기를 축소', '입력 시퀀스의 각 위치가 다른 위치와의 관계를 학습', '학습 속도를 줄임', '데이터를 정렬함'],
      correctIndex: 1, correct: '입력 시퀀스의 각 위치가 다른 위치와의 관계를 학습 (Self-Attention)' },
    { order: 2, q: 'mRNA 백신의 작동 원리는?', type: 'objective', timeLimitSec: 30,
      options: ['약화된 바이러스를 직접 주입', '스파이크 단백질 설계도를 세포에 전달, 면역반응 유도', '항체를 직접 주사함', '면역세포를 복제'],
      correctIndex: 1, correct: '스파이크 단백질 설계도(mRNA)를 세포에 전달, 면역반응 유도' },
    { order: 3, q: '양자컴퓨터가 기존 컴퓨터보다 우수한 이유는?', type: 'objective', timeLimitSec: 30,
      options: ['전력 소모가 적어서', '큐비트의 중첩과 얽힘으로 병렬 연산 가능', '크기가 더 작아서', '더 빠른 전기 신호를 써서'],
      correctIndex: 1, correct: '큐비트의 중첩과 얽힘으로 병렬 연산 가능 (특정 문제에서 지수적 속도 향상)' },
    { order: 4, q: '양적완화(QE)의 메커니즘으로 옳은 것은?', type: 'objective', timeLimitSec: 30,
      options: ['세금을 올려 재정 수입 증가', '중앙은행이 채권 매입으로 시중 유동성 공급 확대', '기준금리를 인상', '정부 지출을 줄임'],
      correctIndex: 1, correct: '중앙은행이 채권 매입으로 시중 유동성 공급 확대' },
    { order: 5, q: '딥러닝의 역전파(Backpropagation) 알고리즘을 설명하고, 왜 중요한지 말하세요.', type: 'subjective', timeLimitSec: 120,
      correct: '출력층에서 입력층으로 오차를 역방향으로 전파하여 가중치를 업데이트. 딥러닝 학습의 핵심 메커니즘으로 효율적인 대규모 신경망 학습을 가능하게 함.' },
    { order: 6, q: '줄기세포의 분화 능력에 따라 분류한 것 중 가장 포괄적인 것은?', type: 'objective', timeLimitSec: 30,
      options: ['단능성(unipotent)', '다능성(multipotent)', '만능성(pluripotent)', '전능성(totipotent)'],
      correctIndex: 3, correct: '전능성 > 만능성 > 다능성 > 단능성. 전능성은 태반까지 포함한 모든 세포로 분화 가능' },
    { order: 7, q: '블록체인의 대표적 합의 알고리즘은?', type: 'objective', timeLimitSec: 30,
      options: ['HTTP와 HTTPS', 'PoW(작업증명)와 PoS(지분증명)', 'TCP와 UDP', 'GET과 POST'],
      correctIndex: 1, correct: 'PoW, PoS 등 분산 네트워크에서 데이터 무결성 검증 방식' },
    { order: 8, q: '유전자 발현 조절에서 전사인자의 역할은?', type: 'objective', timeLimitSec: 30,
      options: ['RNA를 단백질로 번역', 'DNA의 프로모터 부위에 결합하여 전사 개시 조절', '세포막을 구성', '에너지를 생산'],
      correctIndex: 1, correct: 'DNA의 프로모터 부위에 결합하여 전사 개시 조절' },
    { order: 9, q: '현대 물리학의 표준 모형(Standard Model)이 설명하는 것은?', type: 'objective', timeLimitSec: 30,
      options: ['지구의 구조', '소립자와 기본 힘을 설명하는 이론적 틀', '태양계의 운동', '원자의 구조만'],
      correctIndex: 1, correct: '소립자(쿼크, 렙톤 등)와 기본 힘(전자기력, 강력, 약력)을 설명하는 이론적 틀' },
    { order: 10, q: '복잡계(Complex System) 이론에서 창발(Emergence) 현상을 예시와 함께 설명하세요.', type: 'subjective', timeLimitSec: 120,
      correct: '개별 요소에는 없는 새로운 성질이 시스템 전체에서 나타나는 현상. 예: 뉴런 하나는 의식이 없지만 뇌 전체는 의식을 가짐.' },
  ],

  '전공고급심화': [
    { order: 1, q: '딥러닝에서 Vanishing Gradient(기울기 소실) 문제의 대표적 해결책은?', type: 'objective', timeLimitSec: 30,
      options: ['Sigmoid 활성화 함수 사용', 'ReLU 활성화 함수, 배치 정규화, 잔차 연결', '학습률을 올림', '데이터를 더 적게 사용'],
      correctIndex: 1, correct: 'ReLU 활성화 함수, 배치 정규화(BN), 잔차 연결(ResNet) 등으로 해결' },
    { order: 2, q: 'CRISPR 치료제의 주요 윤리적 쟁점이 아닌 것은?', type: 'objective', timeLimitSec: 30,
      options: ['생식세포 편집의 유전성 문제', '치료 비용의 사회적 불평등', '피험자의 사전 동의 문제', '치료 효과의 부재'],
      correctIndex: 3, correct: '치료 효과는 실제로 뛰어남. 문제는 유전성, 불평등, 동의 등 윤리적 측면' },
    { order: 3, q: '끈 이론(String Theory)의 핵심 개념은?', type: 'objective', timeLimitSec: 30,
      options: ['소립자는 점 입자이다', '소립자를 점이 아닌 1차원 끈으로 보는 물리학 이론', '우주는 단 1차원으로 구성', '입자는 파동으로 존재하지 않는다'],
      correctIndex: 1, correct: '소립자를 점이 아닌 1차원 끈으로 보는 물리학 이론 (10~11차원 시공간 가정)' },
    { order: 4, q: 'ESG 투자에서 비재무적 요소를 재무 분석에 통합하는 방법은?', type: 'objective', timeLimitSec: 30,
      options: ['재무제표만 분석', '비재무적 요소를 정량화하여 재무모델에 통합', 'ESG는 무시함', '환경 요소만 고려'],
      correctIndex: 1, correct: '비재무적(환경·사회·거버넌스) 요소를 정량화하여 재무모델에 통합하는 접근' },
    { order: 5, q: 'LLM의 할루시네이션(Hallucination) 문제와 최신 해결 방안을 설명하세요.', type: 'subjective', timeLimitSec: 120,
      correct: '모델이 사실이 아닌 정보를 그럴듯하게 생성하는 문제. RLHF, RAG, 팩트체킹 파이프라인 등이 해결 방안.' },
    { order: 6, q: '합성생물학에서 최소 게놈(Minimal Genome) 연구의 의의는?', type: 'objective', timeLimitSec: 30,
      options: ['게놈 크기를 늘리는 연구', '생명 유지에 필수적인 최소한의 유전자 집합', 'DNA 복제 속도 연구', '인공 바이러스 제작'],
      correctIndex: 1, correct: '생명 유지에 필수적인 최소한의 유전자 집합' },
    { order: 7, q: '위상수학의 위상 동형(Homeomorphism)을 정의하는 조건은?', type: 'objective', timeLimitSec: 30,
      options: ['두 공간이 같은 크기', '두 위상 공간 사이의 연속적이고 역연속적인 전단사 함수', '두 공간이 같은 색', '두 공간이 같은 재질'],
      correctIndex: 1, correct: '두 위상 공간 사이의 연속적이고 역연속적인 전단사 함수 (커피잔과 도넛은 위상동형)' },
    { order: 8, q: '의식에 대한 주요 신경과학 이론이 아닌 것은?', type: 'objective', timeLimitSec: 30,
      options: ['전역 작업공간 이론 (GWT)', '통합 정보 이론 (IIT)', '뉴런 분열 이론', '고차 이론 (HOT)'],
      correctIndex: 2, correct: '전역 작업공간(GWT), 통합 정보(IIT), 고차(HOT) 이론 등이 주요 의식 이론' },
    { order: 9, q: '포스트 AGI 시대의 경제적 영향으로 우려되는 것이 아닌 것은?', type: 'objective', timeLimitSec: 30,
      options: ['노동시장의 대규모 재편', '생산성의 폭발적 증가', '인구 자연 감소', '소득 불평등의 심화'],
      correctIndex: 2, correct: 'AGI는 경제 구조에 영향을 주지만 인구 변화는 직접 관련 없음' },
    { order: 10, q: '다중우주론(Multiverse Theory)의 주요 버전을 설명하고 각 이론의 차이점을 말하세요.', type: 'subjective', timeLimitSec: 120,
      correct: '양자 다중우주(에버렛), 인플레이션 다중우주(린데), 수학적 다중우주(테그마크).' },
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
  const [feedbackInput, setFeedbackInput] = useState<Record<string, string>>({})
  const [commentInput, setCommentInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // DB 조회
  const { data: exams = [] } = useStudentMockExams(studentId, grade)
  const selExam = useMemo(() => exams.find(e => e.period === selPeriod), [exams, selPeriod])
  const { data: questions = [] } = useMockExamQuestions(selExam?.id)
  const { data: majors = [] } = useMockExamMajor(selExam?.id)
  const { data: report } = useMockExamReport(selExam?.id)

  // 뮤테이션
  const createExam = useCreateMockExam()
  const genQuestions = useGenerateQuestions()
  const genMajors = useGenerateMajorQuestions()
  const openExam = useOpenMockExam()
  const updateFeedback = useUpdateQuestionFeedback()
  const scoreMajor = useScoreMajorQuestion()
  const completeExam = useCompleteMockExam()
  const generateReport = useGenerateReport()

  // 회차 바뀔 때 선택한 질문 리셋
  useEffect(() => {
    setSelMainId(null)
    setFeedbackInput({})
    setCommentInput(selExam?.teacher_comment || '')
  }, [selPeriod, selExam?.id])

  const curSchedule = schedule.find(s => s.period === selPeriod)

  // 본 질문 리스트
  const mainQuestions = questions.filter(q => q.level === 'main').sort((a, b) => a.order - b.order)
  // 현재 선택된 본 질문
  const selMain = mainQuestions.find(m => m.id === selMainId) || mainQuestions[0]
  // 선택된 본 질문의 꼬리
  const tails = selMain ? questions.filter(q => q.parent_id === selMain.id).sort((a, b) => (a.tail_index || 0) - (b.tail_index || 0)) : []

  // ── 회차 생성 + 시드 데이터 자동 생성
  const handleCreateExam = async () => {
    if (!curSchedule) return
    setIsCreating(true)
    let step = '회차 생성'
    try {
      console.log('[회차 생성 시작]', selPeriod)
      const newExam = await createExam.mutateAsync({
        studentId,
        grade,
        period: selPeriod,
        examType: curSchedule.type,
        majorLevel: curSchedule.level,
        aiGenerated: curSchedule.aiGenerated,
      })
      console.log('[회차 생성 완료]', newExam.id)

      step = '본+꼬리 질문 생성'
      const seedMains = MAIN_QUESTIONS[grade]?.[selPeriod] || []
      const questionSeeds = seedMains.map(m => ({
        order: m.order,
        type: m.type,
        question: m.text,
        tails: TAIL_QUESTIONS[m.type] || ['꼬리 1', '꼬리 2', '꼬리 3'],
        aiGenerated: !!m.aiGenerated,
      }))
      await genQuestions.mutateAsync({
        examId: newExam.id,
        studentId,
        questions: questionSeeds,
      })
      console.log('[질문 생성 완료]', questionSeeds.length, '개')

      step = '전공특화 생성'
      const seedMajors = MAJOR_QUESTIONS[curSchedule.level] || []
      const majorSeeds = seedMajors.map((m: any) => ({
        order: m.order,
        question: m.q,
        correct: m.correct,
        questionType: m.type,
        timeLimitSec: m.timeLimitSec,
        options: m.options || null,
        correctIndex: m.correctIndex !== undefined ? m.correctIndex : null,
      }))
      if (majorSeeds.length > 0) {
        await genMajors.mutateAsync({
          examId: newExam.id,
          studentId,
          questions: majorSeeds,
        })
        console.log('[전공특화 생성 완료]', majorSeeds.length, '개')
      }

      step = '회차 오픈'
      await openExam.mutateAsync(newExam.id)
      console.log('[회차 오픈 완료 ✅]')
    } catch (e: any) {
      console.error(`[${step} 실패]`, e)
      alert(`[${step}] 실패: ${e.message || e.toString()}`)
    } finally {
      setIsCreating(false)
    }
  }

  const sendFeedback = (questionId: string) => {
    const val = (feedbackInput[questionId] || '').trim()
    if (!val) return
    updateFeedback.mutate({ questionId, feedback: val }, {
      onSuccess: () => {
        setFeedbackInput(prev => ({ ...prev, [questionId]: '' }))
      },
    })
  }

  const handleScoreMajor = (questionId: string, score: number) => {
    scoreMajor.mutate({ questionId, score })
  }

  const handleComplete = () => {
    if (!selExam) return
    completeExam.mutate({ examId: selExam.id, teacherComment: commentInput }, {
      onSuccess: () => {
        // 리포트 자동 생성
        generateReport.mutate({ examId: selExam.id, studentId })
      },
    })
  }

  // 리포트만 PDF 저장
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
          </style>
        </head>
        <body>
          ${reportEl.innerHTML}
        </body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 500)
  }

  // ── UI
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* 시험 일정 탭 */}
      <div className="flex gap-2 mb-3 flex-shrink-0">
        {schedule.map(s => {
          const existExam = exams.find(e => e.period === s.period)
          const sc = STATUS_COLOR(existExam?.status || 'pending')
          const isSelected = selPeriod === s.period
          return (
            <button
              key={s.period}
              onClick={() => setSelPeriod(s.period)}
              className="flex-1 rounded-lg px-3 py-2 cursor-pointer transition-all flex items-center gap-2 min-w-0"
              style={{
                border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                background: isSelected ? THEME.accentBg : '#fff',
                boxShadow: isSelected ? `0 2px 6px ${THEME.accentShadow}` : 'none',
              }}
            >
              <div className="text-[12px] font-extrabold flex-shrink-0" style={{ color: isSelected ? THEME.accent : '#1a1a1a' }}>
                📅 {s.period}
              </div>
              <div className="text-[11px] font-semibold text-ink-secondary flex-shrink-0">· {s.type}</div>
              <div className="text-[10px] font-medium text-ink-muted truncate">{s.level}</div>
              {s.aiGenerated && (
                <span className="text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  ✨ AI
                </span>
              )}
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-auto"
                style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}60` }}
              >
                {sc.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* 회차가 없으면 생성 버튼 */}
      {!selExam ? (
        <div className="flex-1 flex items-center justify-center bg-white border border-line rounded-2xl">
          <div className="text-center">
            <div className="text-4xl mb-3">📝</div>
            <div className="text-[15px] font-bold text-ink mb-1">아직 준비되지 않은 회차예요</div>
            <div className="text-[12px] text-ink-secondary mb-4 leading-relaxed">
              {grade} {selPeriod} · {curSchedule?.type} · {curSchedule?.level}<br />
              시작 버튼을 눌러 학생에게 오픈하세요.
            </div>
            <button
              onClick={handleCreateExam}
              disabled={isCreating || createExam.isPending || genQuestions.isPending || genMajors.isPending}
              className="px-6 py-3 text-white rounded-lg text-[13px] font-bold transition-all disabled:opacity-50"
              style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
            >
              {isCreating ? '생성 중...' : '🚀 회차 시작 (학생에게 오픈)'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 섹션 탭 */}
          <div className="flex gap-1.5 mb-3.5 flex-shrink-0">
            {[
              { key: 'main', label: `📝 면접 질문 (${mainQuestions.length}문항)` },
              { key: 'major', label: `🧠 전공특화 (${majors.length}문항)` },
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

          {/* 면접 질문 섹션 */}
          {activeSection === 'main' && (
            <div className="flex gap-3.5 flex-1 overflow-hidden">
              {/* 질문 목록 */}
              <div className="w-[260px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-line flex-shrink-0">
                  <div className="text-[13px] font-bold text-ink">본 질문 {mainQuestions.length}개</div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">각 질문마다 꼬리질문 3개</div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3">
                  {mainQuestions.map((q, i) => {
                    const tc = TYPE_COLOR[q.type || ''] || TYPE_COLOR['인성']
                    const isSelected = (selMain?.id || mainQuestions[0]?.id) === q.id
                    return (
                      <button
                        key={q.id}
                        onClick={() => setSelMainId(q.id)}
                        className="w-full rounded-lg px-3 py-2.5 mb-1.5 text-left transition-all"
                        style={{
                          border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                          background: isSelected ? THEME.accentBg : '#fff',
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
                          {q.ai_generated && (
                            <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">AI</span>
                          )}
                        </div>
                        <div className="text-[11.5px] font-medium text-ink leading-[1.4] mb-1.5">{q.question_text}</div>
                        <div className="flex gap-1">
                          {q.student_answer ? (
                            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">✓ 답변완료</span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">⏳ 미답변</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 질문 상세 */}
              <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0">
                {!selMain ? (
                  <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px]">질문을 선택해주세요</div>
                ) : (
                  <>
                    <div className="px-5 py-4 border-b border-line flex-shrink-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                          style={{ color: THEME.accentDark, background: THEME.accentBg }}
                        >
                          Q{mainQuestions.findIndex(q => q.id === selMain.id) + 1}
                        </span>
                        <span
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                          style={{
                            background: (TYPE_COLOR[selMain.type || ''] || TYPE_COLOR['인성']).bg,
                            color: (TYPE_COLOR[selMain.type || ''] || TYPE_COLOR['인성']).color,
                          }}
                        >
                          {selMain.type}
                        </span>
                        {selMain.ai_generated && (
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                            ✨ AI 생성
                          </span>
                        )}
                      </div>
                      <div className="text-[14px] font-bold text-ink leading-[1.6]">{selMain.question_text}</div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5">
                      {/* 학생 답변 */}
                      <div className="bg-gray-50 border border-line rounded-xl px-4 py-3.5">
                        <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">👤 학생 답변</div>
                        <div
                          className="text-[13px] leading-[1.8] font-medium whitespace-pre-wrap"
                          style={{ color: selMain.student_answer ? '#1a1a1a' : '#9CA3AF' }}
                        >
                          {selMain.student_answer || '아직 학생이 답변을 작성하지 않았어요.'}
                        </div>
                      </div>

                      {/* 꼬리질문 */}
                      <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                        <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-3">🔗 꼬리질문 {tails.length}개</div>
                        <div className="flex flex-col gap-3">
                          {tails.map((tail, idx) => (
                            <div key={tail.id} className="border border-line rounded-lg px-3 py-2.5 bg-gray-50">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{ color: THEME.accentDark, background: '#fff', border: `1px solid ${THEME.accentBorder}60` }}
                                >
                                  꼬리 {idx + 1}
                                </span>
                                <span className="text-[12px] font-semibold text-ink">{tail.question_text}</span>
                              </div>
                              <div
                                className="text-[12px] bg-white rounded-md px-3 py-2 leading-[1.7] font-medium border border-line whitespace-pre-wrap"
                                style={{ color: tail.student_answer ? '#1a1a1a' : '#9CA3AF' }}
                              >
                                {tail.student_answer || '학생 답변 없음'}
                              </div>
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
                    <div
                      key={q.id}
                      className="rounded-xl px-4 py-3.5 transition-all"
                      style={{
                        border: `1px solid ${q.score !== null ? '#6EE7B7' : '#E5E7EB'}`,
                        background: q.score !== null ? '#F0FDF4' : '#fff',
                      }}
                    >
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ color: THEME.accentDark, background: THEME.accentBg }}
                          >
                            Q{i + 1}
                          </span>
                          <span className="text-[13px] font-semibold text-ink leading-[1.5]">{q.question_text}</span>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {[
                            { score: 100, label: '○', color: '#059669' },
                            { score: 50, label: '△', color: '#F97316' },
                            { score: 0, label: '✕', color: '#EF4444' },
                          ].map(({ score, label, color }) => (
                            <button
                              key={score}
                              onClick={() => handleScoreMajor(q.id, score)}
                              disabled={scoreMajor.isPending}
                              className="w-10 h-8 rounded-md text-[13px] font-extrabold transition-all disabled:opacity-50"
                              style={{
                                background: q.score === score ? color : '#F3F4F6',
                                color: q.score === score ? '#fff' : '#6B7280',
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="text-[12px] text-ink-secondary mb-2 font-medium whitespace-pre-wrap">
                        <span className="font-bold">학생 답변: </span>
                        <span>{q.student_answer || '미작성'}</span>
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

          {/* 보고서 섹션 */}
          {activeSection === 'report' && (
            <div className="flex-1 overflow-hidden bg-white border border-line rounded-2xl flex flex-col">
              {/* 상단 헤더 - 원장 액션 */}
              <div className="px-5 py-3 border-b border-line flex-shrink-0 flex items-center justify-between gap-3 flex-wrap bg-white">
                <div className="text-[13px] font-bold text-ink">📊 프리미엄 학부모 리포트</div>
                <div className="flex gap-2 flex-wrap items-center">
                  <textarea
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder="종합 코멘트 작성..."
                    rows={1}
                    className="w-[240px] border border-line rounded-lg px-3 py-2 text-[12px] font-medium outline-none resize-none"
                  />
                  <button
                    onClick={handleComplete}
                    disabled={completeExam.isPending || generateReport.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] font-bold hover:bg-green-700 disabled:opacity-50"
                  >
                    {completeExam.isPending || generateReport.isPending ? '생성 중...' : '✓ 시험 완료 + 리포트 생성'}
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    className="px-4 py-2 text-white rounded-lg text-[12px] font-bold"
                    style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                  >
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
                  <div id="admin-premium-report-content" className="max-w-[860px] mx-auto py-8 px-5">

                    {/* 1. 표지 */}
                    <div
                      className="rounded-[32px] p-12 mb-8 text-white relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, #0F172A 0%, ${THEME.accentDark} 40%, ${THEME.accent} 100%)`,
                        boxShadow: '0 25px 80px rgba(15, 23, 42, 0.4)',
                        minHeight: '420px',
                      }}
                    >
                      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)', transform: 'translate(-20%, 40%)' }} />
                      <div className="absolute top-12 right-12 w-16 h-0.5" style={{ background: 'linear-gradient(90deg, #FCD34D, transparent)' }} />
                      <div className="absolute bottom-12 left-12 w-16 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #FCD34D)' }} />

                      <div className="relative z-10 flex flex-col h-full" style={{ minHeight: '380px' }}>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-0.5" style={{ background: '#FCD34D' }} />
                            <div className="text-[10px] font-bold tracking-[6px]" style={{ color: '#FCD34D' }}>
                              BIKUS · PREMIUM REPORT
                            </div>
                          </div>
                          <div className="text-[11px] font-bold tracking-[3px] opacity-70 mb-4">
                            모의면접 리포트 · {selExam?.grade} {selExam?.period}
                          </div>
                          <div className="text-[46px] font-black leading-[1.1] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                            {student?.name}
                          </div>
                          <div className="text-[18px] font-light opacity-80 mb-10">
                            학생의 성장 여정을 담았습니다
                          </div>
                        </div>
                        <div className="border-t border-white/20 pt-6 flex items-end justify-between flex-wrap gap-4">
                          <div className="grid grid-cols-3 gap-8 flex-1 min-w-[400px]">
                            <div>
                              <div className="text-[9px] font-bold tracking-[3px] opacity-60 mb-1.5">EXAM TYPE</div>
                              <div className="text-[14px] font-bold">{selExam?.exam_type}</div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold tracking-[3px] opacity-60 mb-1.5">LEVEL</div>
                              <div className="text-[14px] font-bold">{selExam?.major_level}</div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold tracking-[3px] opacity-60 mb-1.5">ISSUED</div>
                              <div className="text-[14px] font-bold">
                                {report.published_at ? new Date(report.published_at).toLocaleDateString('ko-KR') : '-'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] font-bold tracking-[3px] opacity-60 mb-1">OVERALL SCORE</div>
                            <div className="flex items-baseline gap-1">
                              <div className="text-[64px] font-black leading-none" style={{ fontFamily: 'Georgia, serif', color: '#FCD34D' }}>
                                {report.scores?.total || 0}
                              </div>
                              <div className="text-[20px] font-bold opacity-60">/100</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. 영역별 점수 */}
                    {report.scores && (
                      <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-100 mb-8">
                        <div className="text-[10px] font-bold text-slate-400 tracking-[3px] uppercase mb-1">Performance Analysis</div>
                        <div className="text-[18px] font-extrabold text-slate-900 mb-5">3가지 영역 종합 분석</div>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { name: '인성', score: report.scores['인성'] || 0, color: '#3B82F6', desc: 'Character' },
                            { name: '전공적합성', score: report.scores['전공적합성'] || 0, color: '#10B981', desc: 'Major Fit' },
                            { name: '발전가능성', score: report.scores['발전가능성'] || 0, color: '#F59E0B', desc: 'Potential' },
                          ].map(cat => (
                            <div key={cat.name} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full" style={{ background: cat.color }} />
                              <div className="text-[9px] font-bold tracking-[3px] uppercase mb-1" style={{ color: cat.color }}>{cat.desc}</div>
                              <div className="flex items-end justify-between">
                                <div className="text-[13px] font-bold text-slate-700">{cat.name}</div>
                                <div className="text-[28px] font-black leading-none" style={{ color: cat.color, fontFamily: 'Georgia, serif' }}>
                                  {cat.score}
                                </div>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cat.score}%`, background: `linear-gradient(90deg, ${cat.color}aa, ${cat.color})` }} />
                              </div>
                              {report.comparison_prev?.category_diff?.[cat.name] !== undefined && (
                                <div className="text-[11px] font-bold mt-2" style={{ color: report.comparison_prev.category_diff[cat.name] >= 0 ? '#059669' : '#DC2626' }}>
                                  {report.comparison_prev.category_diff[cat.name] >= 0 ? '▲ +' : '▼ '}
                                  {report.comparison_prev.category_diff[cat.name]}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. 학부모 편지 */}
                    {report.summary_for_parents && (
                      <div
                        className="rounded-3xl p-10 mb-8 relative overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FBBF24 100%)',
                          boxShadow: '0 20px 60px rgba(251, 191, 36, 0.25)',
                        }}
                      >
                        <div className="absolute top-8 right-10 text-8xl opacity-15" style={{ fontFamily: 'Georgia, serif' }}>"</div>
                        <div className="absolute bottom-8 left-10 text-8xl opacity-15 rotate-180" style={{ fontFamily: 'Georgia, serif' }}>"</div>
                        <div className="relative z-10 max-w-2xl mx-auto">
                          <div className="flex items-center gap-3 mb-6 justify-center">
                            <div className="w-12 h-0.5" style={{ background: '#92400E' }} />
                            <div className="text-[10px] font-bold tracking-[4px]" style={{ color: '#92400E' }}>
                              LETTER TO PARENTS
                            </div>
                            <div className="w-12 h-0.5" style={{ background: '#92400E' }} />
                          </div>
                          <div className="text-[24px] font-extrabold text-center mb-6" style={{ color: '#78350F', fontFamily: 'Georgia, serif' }}>
                            학부모님께 드리는 메시지
                          </div>
                          <div className="text-[15px] leading-[2.2] text-center font-medium" style={{ color: '#78350F', fontFamily: 'Georgia, serif' }}>
                            {report.summary_for_parents}
                          </div>
                          <div className="text-right mt-8 text-[12px] font-bold" style={{ color: '#92400E', fontFamily: 'Georgia, serif' }}>
                            — BIKUS 입시 컨설팅 드림
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. 강점 & 개선점 */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      {report.strengths && report.strengths.length > 0 && (
                        <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-100 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #10B981, #34D399)' }} />
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[24px]" style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' }}>
                              💪
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-green-700 tracking-[3px] uppercase">Strengths</div>
                              <div className="text-[18px] font-extrabold text-green-800">강점 포인트</div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3">
                            {report.strengths.map((s: string, i: number) => (
                              <div key={i} className="flex gap-3 items-start bg-green-50/50 rounded-xl p-3">
                                <div className="w-7 h-7 rounded-full text-white flex items-center justify-center flex-shrink-0 text-[11px] font-black" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                                  {i + 1}
                                </div>
                                <div className="text-[13px] text-green-900 leading-[1.8] flex-1 font-medium">{s}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {report.weaknesses && report.weaknesses.length > 0 && (
                        <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-100 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #F59E0B, #FBBF24)' }} />
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[24px]" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' }}>
                              🎯
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-amber-700 tracking-[3px] uppercase">Improvements</div>
                              <div className="text-[18px] font-extrabold text-amber-800">개선 포인트</div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3">
                            {report.weaknesses.map((s: string, i: number) => (
                              <div key={i} className="flex gap-3 items-start bg-amber-50/50 rounded-xl p-3">
                                <div className="w-7 h-7 rounded-lg text-white flex items-center justify-center flex-shrink-0 text-[14px] font-black" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                                  ▸
                                </div>
                                <div className="text-[13px] text-amber-900 leading-[1.8] flex-1 font-medium">{s}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 5. 대학 적합도 */}
                    {report.university_fit && (
                      <div
                        className="rounded-3xl p-8 mb-8 relative overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                          boxShadow: '0 20px 60px rgba(15, 23, 42, 0.3)',
                        }}
                      >
                        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #DC2626 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="text-4xl">🎓</div>
                            <div>
                              <div className="text-[9px] font-bold text-red-300 tracking-[3px] uppercase">Target University</div>
                              <div className="text-[11px] font-bold text-slate-400">목표 대학 적합도</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-6 flex-wrap mb-6">
                            <div>
                              <div className="text-[28px] font-extrabold text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                                {report.university_fit.university}
                              </div>
                              <div className="text-[16px] font-bold text-slate-300">
                                {report.university_fit.department}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] font-bold text-red-300 tracking-[2px] uppercase mb-1">Fit Score</div>
                              <div className="flex items-baseline gap-1 justify-end">
                                <div className="text-[64px] font-black leading-none" style={{ color: '#F87171', fontFamily: 'Georgia, serif' }}>
                                  {report.university_fit.fit_score}
                                </div>
                                <div className="text-[24px] font-bold text-red-300">%</div>
                              </div>
                            </div>
                          </div>
                          <div className="h-4 bg-white/10 rounded-full overflow-hidden mb-4">
                            <div className="h-full rounded-full" style={{ width: `${report.university_fit.fit_score}%`, background: 'linear-gradient(90deg, #F87171, #DC2626, #B91C1C)', boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)' }} />
                          </div>
                          {report.university_fit.reason && (
                            <div className="text-[13px] text-slate-300 leading-[1.8] bg-white/5 rounded-xl p-4 border border-white/10">
                              💬 {report.university_fit.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 6. 시기별 가이드 */}
                    {report.season_guide && (
                      <div className="bg-white rounded-3xl p-8 mb-8 shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #10B981, #34D399, #6EE7B7)' }} />
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px]" style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' }}>
                            🌱
                          </div>
                          <div>
                            <div className="text-[9px] font-bold text-green-700 tracking-[3px] uppercase">Seasonal Guide</div>
                            <div className="text-[22px] font-extrabold text-green-800">{report.season_guide.title}</div>
                            <div className="text-[12px] font-semibold text-green-700 mt-0.5">{report.season_guide.subtitle}</div>
                          </div>
                        </div>
                        {Array.isArray(report.season_guide.content) && (
                          <div className="grid grid-cols-2 gap-3">
                            {report.season_guide.content.map((c: string, i: number) => (
                              <div key={i} className="flex gap-3 items-start rounded-2xl p-4 border border-green-100" style={{ background: 'linear-gradient(135deg, #ECFDF5, #F0FDF4)' }}>
                                <div className="w-8 h-8 rounded-xl text-white flex items-center justify-center flex-shrink-0 text-[12px] font-black" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                                  {String(i + 1).padStart(2, '0')}
                                </div>
                                <div className="text-[13px] text-green-900 leading-[1.8] flex-1 font-medium">{c}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 7. 생기부 방향성 */}
                    {report.saenggibu_direction && (
                      <div className="bg-white rounded-3xl p-8 mb-8 shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA, #C4B5FD)' }} />
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px]" style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' }}>
                            📚
                          </div>
                          <div>
                            <div className="text-[9px] font-bold text-purple-700 tracking-[3px] uppercase">Saenggibu Design</div>
                            <div className="text-[22px] font-extrabold text-purple-800">생활기록부 방향성 제안</div>
                            <div className="text-[12px] font-semibold text-purple-700 mt-0.5">전공 합격을 위한 핵심 설계</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(report.saenggibu_direction).map(([key, items]) => (
                            <div key={key} className="rounded-2xl p-5 border border-purple-100" style={{ background: 'linear-gradient(135deg, #FAF5FF, #F5F3FF)' }}>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #7C3AED, #A78BFA)' }} />
                                <div className="text-[14px] font-extrabold text-purple-900">{key}</div>
                              </div>
                              {Array.isArray(items) && (
                                <div className="flex flex-col gap-2">
                                  {(items as string[]).map((item, i) => (
                                    <div key={i} className="flex gap-2 items-start">
                                      <div className="text-purple-500 flex-shrink-0 text-[12px] font-bold mt-1">◆</div>
                                      <div className="text-[12px] text-purple-900 leading-[1.7] flex-1">{item}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 8. 다음 회차 계획 */}
                    {report.next_period_plan && (
                      <div
                        className="rounded-3xl p-8 mb-8 relative overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 50%, #FDBA74 100%)',
                          boxShadow: '0 20px 60px rgba(251, 146, 60, 0.2)',
                        }}
                      >
                        <div className="absolute top-4 right-6 text-8xl opacity-15">🎯</div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] bg-white shadow-md">
                              🎯
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-orange-800 tracking-[3px] uppercase">Next Period Plan</div>
                              <div className="text-[22px] font-extrabold text-orange-900">다음 회차까지 준비할 것</div>
                            </div>
                          </div>
                          <div className="text-[15px] leading-[2] text-orange-900 font-medium bg-white/40 rounded-2xl p-5 border border-orange-200" style={{ fontFamily: 'Georgia, serif' }}>
                            {report.next_period_plan}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 9. 선생님 코멘트 */}
                    {selExam?.teacher_comment && (
                      <div
                        className="rounded-3xl p-8 mb-8 relative overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)`,
                          borderLeft: `8px solid ${THEME.accent}`,
                          boxShadow: `0 20px 60px ${THEME.accentShadow}`,
                        }}
                      >
                        <div className="absolute top-6 right-8 text-8xl opacity-10" style={{ fontFamily: 'Georgia, serif' }}>"</div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] bg-white shadow-md">
                              👨‍🏫
                            </div>
                            <div>
                              <div className="text-[9px] font-bold tracking-[3px] uppercase" style={{ color: THEME.accentDark }}>Teacher's Note</div>
                              <div className="text-[22px] font-extrabold" style={{ color: THEME.accentDark }}>선생님 특별 코멘트</div>
                            </div>
                          </div>
                          <div className="text-[16px] leading-[2.2] font-medium italic" style={{ color: THEME.accentDark, fontFamily: 'Georgia, serif' }}>
                            "{selExam.teacher_comment}"
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 푸터 */}
                    <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-slate-100">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-12 h-0.5" style={{ background: THEME.accent }} />
                        <div className="text-[24px] font-black tracking-[4px]" style={{ color: THEME.accent, fontFamily: 'Georgia, serif' }}>
                          BIKUS
                        </div>
                        <div className="w-12 h-0.5" style={{ background: THEME.accent }} />
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 tracking-[3px] uppercase mb-2">
                        AI Premium College Admission Consulting
                      </div>
                      <div className="text-[10px] text-slate-400 leading-[1.8] max-w-lg mx-auto">
                        본 리포트는 AI 분석과 담당 선생님의 전문 코멘트를 바탕으로 작성되었습니다.<br />
                        © 2026 BIKUS · Powered by 마스터웨이학원
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}