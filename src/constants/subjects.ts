// 2022 개정 교육과정 고등학교 과목 리스트

export type SubjectCategory = '공통' | '일반선택' | '진로선택' | '융합선택'

export interface Subject {
  name: string
  category: SubjectCategory
  grades: number[]
  group: string
}

export const SUBJECTS_2022: Subject[] = [
  // ============= 국어 =============
  { name: '공통국어1', category: '공통', grades: [1], group: '국어' },
  { name: '공통국어2', category: '공통', grades: [1], group: '국어' },
  { name: '독서와 작문', category: '일반선택', grades: [2, 3], group: '국어' },
  { name: '문학', category: '일반선택', grades: [2, 3], group: '국어' },
  { name: '화법과 언어', category: '일반선택', grades: [2, 3], group: '국어' },
  { name: '주제 탐구 독서', category: '진로선택', grades: [2, 3], group: '국어' },
  { name: '문학과 영상', category: '진로선택', grades: [2, 3], group: '국어' },
  { name: '직무 의사소통', category: '진로선택', grades: [2, 3], group: '국어' },
  { name: '독서 토론과 글쓰기', category: '융합선택', grades: [2, 3], group: '국어' },
  { name: '매체 의사소통', category: '융합선택', grades: [2, 3], group: '국어' },
  { name: '언어생활 탐구', category: '융합선택', grades: [2, 3], group: '국어' },

  // ============= 수학 =============
  { name: '공통수학1', category: '공통', grades: [1], group: '수학' },
  { name: '공통수학2', category: '공통', grades: [1], group: '수학' },
  { name: '기본수학1', category: '공통', grades: [1], group: '수학' },
  { name: '기본수학2', category: '공통', grades: [1], group: '수학' },
  { name: '대수', category: '일반선택', grades: [2, 3], group: '수학' },
  { name: '미적분Ⅰ', category: '일반선택', grades: [2, 3], group: '수학' },
  { name: '확률과 통계', category: '일반선택', grades: [2, 3], group: '수학' },
  { name: '미적분Ⅱ', category: '진로선택', grades: [2, 3], group: '수학' },
  { name: '기하', category: '진로선택', grades: [2, 3], group: '수학' },
  { name: '경제 수학', category: '진로선택', grades: [2, 3], group: '수학' },
  { name: '인공지능 수학', category: '진로선택', grades: [2, 3], group: '수학' },
  { name: '직무 수학', category: '진로선택', grades: [2, 3], group: '수학' },
  { name: '수학과 문화', category: '융합선택', grades: [2, 3], group: '수학' },
  { name: '실용 통계', category: '융합선택', grades: [2, 3], group: '수학' },
  { name: '수학과제 탐구', category: '융합선택', grades: [2, 3], group: '수학' },

  // ============= 영어 =============
  { name: '공통영어1', category: '공통', grades: [1], group: '영어' },
  { name: '공통영어2', category: '공통', grades: [1], group: '영어' },
  { name: '기본영어1', category: '공통', grades: [1], group: '영어' },
  { name: '기본영어2', category: '공통', grades: [1], group: '영어' },
  { name: '영어Ⅰ', category: '일반선택', grades: [2, 3], group: '영어' },
  { name: '영어Ⅱ', category: '일반선택', grades: [2, 3], group: '영어' },
  { name: '영어 독해와 작문', category: '일반선택', grades: [2, 3], group: '영어' },
  { name: '영미 문학 읽기', category: '진로선택', grades: [2, 3], group: '영어' },
  { name: '영어 발표와 토론', category: '진로선택', grades: [2, 3], group: '영어' },
  { name: '직무 영어', category: '진로선택', grades: [2, 3], group: '영어' },
  { name: '심화 영어', category: '진로선택', grades: [2, 3], group: '영어' },
  { name: '심화 영어 독해와 작문', category: '진로선택', grades: [2, 3], group: '영어' },
  { name: '실생활 영어 회화', category: '융합선택', grades: [2, 3], group: '영어' },
  { name: '미디어 영어', category: '융합선택', grades: [2, 3], group: '영어' },
  { name: '세계 문화와 영어', category: '융합선택', grades: [2, 3], group: '영어' },

  // ============= 사회 =============
  { name: '한국사1', category: '공통', grades: [1], group: '사회' },
  { name: '한국사2', category: '공통', grades: [1], group: '사회' },
  { name: '통합사회1', category: '공통', grades: [1], group: '사회' },
  { name: '통합사회2', category: '공통', grades: [1], group: '사회' },
  { name: '세계시민과 지리', category: '일반선택', grades: [2, 3], group: '사회' },
  { name: '세계사', category: '일반선택', grades: [2, 3], group: '사회' },
  { name: '사회와 문화', category: '일반선택', grades: [2, 3], group: '사회' },
  { name: '현대사회와 윤리', category: '일반선택', grades: [2, 3], group: '사회' },
  { name: '한국지리 탐구', category: '진로선택', grades: [2, 3], group: '사회' },
  { name: '도시의 미래 탐구', category: '진로선택', grades: [2, 3], group: '사회' },
  { name: '동아시아 역사 기행', category: '진로선택', grades: [2, 3], group: '사회' },
  { name: '정치', category: '진로선택', grades: [2, 3], group: '사회' },
  { name: '법과 사회', category: '진로선택', grades: [2, 3], group: '사회' },
  { name: '경제', category: '진로선택', grades: [2, 3], group: '사회' },
  { name: '윤리와 사상', category: '진로선택', grades: [2, 3], group: '사회' },
  { name: '인문학과 윤리', category: '진로선택', grades: [2, 3], group: '사회' },
  { name: '국제 관계의 이해', category: '진로선택', grades: [2, 3], group: '사회' },
  { name: '여행지리', category: '융합선택', grades: [2, 3], group: '사회' },
  { name: '역사로 탐구하는 현대 세계', category: '융합선택', grades: [2, 3], group: '사회' },
  { name: '사회문제 탐구', category: '융합선택', grades: [2, 3], group: '사회' },
  { name: '금융과 경제생활', category: '융합선택', grades: [2, 3], group: '사회' },
  { name: '윤리문제 탐구', category: '융합선택', grades: [2, 3], group: '사회' },
  { name: '기후변화와 지속가능한 세계', category: '융합선택', grades: [2, 3], group: '사회' },

  // ============= 과학 =============
  { name: '통합과학1', category: '공통', grades: [1], group: '과학' },
  { name: '통합과학2', category: '공통', grades: [1], group: '과학' },
  { name: '과학탐구실험1', category: '공통', grades: [1], group: '과학' },
  { name: '과학탐구실험2', category: '공통', grades: [1], group: '과학' },
  { name: '물리학', category: '일반선택', grades: [2, 3], group: '과학' },
  { name: '화학', category: '일반선택', grades: [2, 3], group: '과학' },
  { name: '생명과학', category: '일반선택', grades: [2, 3], group: '과학' },
  { name: '지구과학', category: '일반선택', grades: [2, 3], group: '과학' },
  { name: '역학과 에너지', category: '진로선택', grades: [2, 3], group: '과학' },
  { name: '전자기와 양자', category: '진로선택', grades: [2, 3], group: '과학' },
  { name: '물질과 에너지', category: '진로선택', grades: [2, 3], group: '과학' },
  { name: '화학 반응의 세계', category: '진로선택', grades: [2, 3], group: '과학' },
  { name: '세포와 물질대사', category: '진로선택', grades: [2, 3], group: '과학' },
  { name: '생물의 유전', category: '진로선택', grades: [2, 3], group: '과학' },
  { name: '지구시스템과학', category: '진로선택', grades: [2, 3], group: '과학' },
  { name: '행성우주과학', category: '진로선택', grades: [2, 3], group: '과학' },
  { name: '과학의 역사와 문화', category: '융합선택', grades: [2, 3], group: '과학' },
  { name: '기후변화와 환경생태', category: '융합선택', grades: [2, 3], group: '과학' },
  { name: '융합과학 탐구', category: '융합선택', grades: [2, 3], group: '과학' },

  // ============= 체육 =============
  { name: '체육1', category: '일반선택', grades: [1, 2, 3], group: '체육' },
  { name: '체육2', category: '일반선택', grades: [1, 2, 3], group: '체육' },
  { name: '운동과 건강', category: '진로선택', grades: [2, 3], group: '체육' },
  { name: '스포츠 문화', category: '진로선택', grades: [2, 3], group: '체육' },
  { name: '스포츠 과학', category: '진로선택', grades: [2, 3], group: '체육' },
  { name: '스포츠 생활1', category: '융합선택', grades: [2, 3], group: '체육' },
  { name: '스포츠 생활2', category: '융합선택', grades: [2, 3], group: '체육' },

  // ============= 예술 =============
  { name: '음악', category: '일반선택', grades: [1, 2, 3], group: '예술' },
  { name: '미술', category: '일반선택', grades: [1, 2, 3], group: '예술' },
  { name: '연극', category: '일반선택', grades: [1, 2, 3], group: '예술' },
  { name: '음악 연주와 창작', category: '진로선택', grades: [2, 3], group: '예술' },
  { name: '음악 감상과 비평', category: '진로선택', grades: [2, 3], group: '예술' },
  { name: '미술 창작', category: '진로선택', grades: [2, 3], group: '예술' },
  { name: '미술 감상과 비평', category: '진로선택', grades: [2, 3], group: '예술' },
  { name: '음악과 미디어', category: '융합선택', grades: [2, 3], group: '예술' },
  { name: '미술과 매체', category: '융합선택', grades: [2, 3], group: '예술' },

  // ============= 기술·가정/정보 =============
  { name: '기술·가정', category: '일반선택', grades: [1, 2, 3], group: '기술·가정' },
  { name: '정보', category: '일반선택', grades: [1, 2, 3], group: '기술·가정' },
  { name: '로봇과 공학세계', category: '진로선택', grades: [2, 3], group: '기술·가정' },
  { name: '생활과학 탐구', category: '진로선택', grades: [2, 3], group: '기술·가정' },
  { name: '창의 공학 설계', category: '진로선택', grades: [2, 3], group: '기술·가정' },
  { name: '인공지능 기초', category: '진로선택', grades: [2, 3], group: '기술·가정' },
  { name: '데이터 과학', category: '진로선택', grades: [2, 3], group: '기술·가정' },
  { name: '지식 재산 일반', category: '융합선택', grades: [2, 3], group: '기술·가정' },
  { name: '생애 설계와 자립', category: '융합선택', grades: [2, 3], group: '기술·가정' },
  { name: '아동발달과 부모', category: '융합선택', grades: [2, 3], group: '기술·가정' },
  { name: '소프트웨어와 생활', category: '융합선택', grades: [2, 3], group: '기술·가정' },

  // ============= 제2외국어/한문 =============
  { name: '독일어', category: '일반선택', grades: [1, 2, 3], group: '제2외국어' },
  { name: '프랑스어', category: '일반선택', grades: [1, 2, 3], group: '제2외국어' },
  { name: '스페인어', category: '일반선택', grades: [1, 2, 3], group: '제2외국어' },
  { name: '중국어', category: '일반선택', grades: [1, 2, 3], group: '제2외국어' },
  { name: '일본어', category: '일반선택', grades: [1, 2, 3], group: '제2외국어' },
  { name: '러시아어', category: '일반선택', grades: [1, 2, 3], group: '제2외국어' },
  { name: '아랍어', category: '일반선택', grades: [1, 2, 3], group: '제2외국어' },
  { name: '베트남어', category: '일반선택', grades: [1, 2, 3], group: '제2외국어' },
  { name: '한문', category: '일반선택', grades: [1, 2, 3], group: '제2외국어' },

  // ============= 교양 =============
  { name: '진로와 직업', category: '일반선택', grades: [1, 2, 3], group: '교양' },
  { name: '생태와 환경', category: '일반선택', grades: [1, 2, 3], group: '교양' },
  { name: '인간과 철학', category: '진로선택', grades: [2, 3], group: '교양' },
  { name: '논리와 사고', category: '진로선택', grades: [2, 3], group: '교양' },
  { name: '인간과 심리', category: '진로선택', grades: [2, 3], group: '교양' },
  { name: '교육의 이해', category: '진로선택', grades: [2, 3], group: '교양' },
  { name: '삶과 종교', category: '진로선택', grades: [2, 3], group: '교양' },
  { name: '보건', category: '진로선택', grades: [2, 3], group: '교양' },
  { name: '인간과 경제활동', category: '융합선택', grades: [2, 3], group: '교양' },
  { name: '논술', category: '융합선택', grades: [2, 3], group: '교양' },
]

export function getSubjectsForGrade(grade: number): Subject[] {
  return SUBJECTS_2022.filter(s => s.grades.includes(grade))
}

export function getSubjectsByGroup(grade?: number): Record<string, Subject[]> {
  const subjects = grade ? getSubjectsForGrade(grade) : SUBJECTS_2022
  const grouped: Record<string, Subject[]> = {}
  for (const s of subjects) {
    if (!grouped[s.group]) grouped[s.group] = []
    grouped[s.group].push(s)
  }
  return grouped
}

export const ALL_SUBJECT_NAMES = SUBJECTS_2022.map(s => s.name)