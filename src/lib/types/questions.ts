/**
 * 질문 관리 도메인 타입 (실제 DB 테이블 기반)
 * - 고등: high_questions
 * - 중등: middle_questions
 */

export type Grade = 'high' | 'middle'
export type SchoolYear = 1 | 2 | 3

// ============================================
// 답변 공식 (인로드 IP - 67개)
// ============================================
export interface AnswerFormula {
  id: number
  name: string
  guideline: string | null
  created_at: string
  updated_at: string
}

// ============================================
// 기출문제 (통합 타입 - 화면 표시용)
// ============================================
export interface PastQuestion {
  id: string
  grade: Grade

  // 학교/대학 정보
  university: string  // 고등=대학, 중등=학교명
  major?: string | null      // 고등 전용 (학과)
  admission_type?: string | null  // 고등 전용 (전형)

  // 중등 전용
  school_type?: string | null
  question_type?: string | null
  answer_guide?: string | null
  difficulty?: number | null

  // 공통
  question: string
  formula_id?: number | null     // 인로드 답변 공식 번호 (1~67)
  formula_name?: string | null   // 답변 공식 이름 (조인 결과)
  year?: number | null
  created_at: string
}

// ============================================
// 전공질문 (master만 사용 - 자체 테이블)
// ============================================
export interface MajorQuestion {
  id: number
  grade: Grade
  school_year: SchoolYear
  department_code: string
  department_name: string
  master_code: string
  total_days: number
  question_type_code: string | null
  question_type: string | null
  day: number
  seq: number
  question: string
  choice_1: string | null
  choice_2: string | null
  choice_3: string | null
  choice_4: string | null
  choice_5: string | null
  answer: string | null
  explanation: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface MajorQuestionInsert {
  grade: Grade
  school_year: SchoolYear
  department_code: string
  department_name: string
  master_code: string
  total_days: number
  question_type_code?: string | null
  question_type?: string | null
  day: number
  seq: number
  question: string
  choice_1?: string | null
  choice_2?: string | null
  choice_3?: string | null
  choice_4?: string | null
  choice_5?: string | null
  answer?: string | null
  explanation?: string | null
}

export interface MajorDepartmentSummary {
  grade: Grade
  school_year: SchoolYear
  department_code: string
  department_name: string
  master_code: string
  total_days: number
  question_count: number
  created_at: string
}

// ============================================
// 제시문면접 (master만 사용 - 자체 테이블)
// ============================================
export interface PassageInterview {
  id: number
  grade: Grade
  school_code: string
  school_name: string
  school_order: number
  track_code: string | null
  track_name: string | null
  track_detail_code: string | null
  total_days: number
  set_code: string
  year: number
  round: number
  round_order: number
  question_code: string
  question_order: number
  original_question: string
  sub_question: string | null
  passage_count: number
  image_count: number
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface PassageInterviewInsert {
  grade: Grade
  school_code: string
  school_name: string
  school_order: number
  track_code?: string | null
  track_name?: string | null
  track_detail_code?: string | null
  total_days: number
  set_code: string
  year: number
  round: number
  round_order: number
  question_code: string
  question_order: number
  original_question: string
  sub_question?: string | null
  passage_count?: number
  image_count?: number
}

export interface PassageImage {
  id: number
  passage_id: number
  image_type: 'passage' | 'reference'
  image_url: string
  image_order: number
  file_name: string | null
  created_at: string
}

export interface PassageImageInsert {
  passage_id: number
  image_type: 'passage' | 'reference'
  image_url: string
  image_order: number
  file_name?: string | null
}