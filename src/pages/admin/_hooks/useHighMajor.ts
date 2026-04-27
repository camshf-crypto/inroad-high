import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

// ───────────────────────────────────────────────────────────
// 타입 정의
// ───────────────────────────────────────────────────────────
export interface AdminMajorSeed {
  id: string
  name: string
  description: string | null
}

export interface AdminMajorChapter {
  id: string
  major_id: string
  grade: number
  chapter_no: number
  title: string
  description: string | null
}

export interface AdminMajorProgress {
  id: string
  student_id: string
  major_id: string
  chapter_id: string
  obj_score: number
  obj_total: number
  obj_answers: any[]
  subj_question_id: string | null
  subj_answer: string | null
  subj_ai_feedback: string | null
  subj_teacher_feedback: string | null
  status: 'in_progress' | 'completed'
  completed_at: string | null
  created_at: string
}

export interface AdminMajorQuestion {
  id: string
  chapter_id: string
  question_type: 'objective' | 'subjective'
  question_text: string
  choice_a: string | null
  choice_b: string | null
  choice_c: string | null
  choice_d: string | null
  correct_answer: string | null
  explanation: string | null
  difficulty: string
}

export interface AdminMajorSaenggibu {
  id: string
  student_id: string
  major_id: string
  saenggibu_pdf_url: string | null
  saenggibu_uploaded_at: string | null
  ai_chapters: any[]
  ai_generated_at: string | null
  ai_model: string | null
  status: 'pending' | 'uploaded' | 'generating' | 'ready' | 'error'
  error_message: string | null
}

// ───────────────────────────────────────────────────────────
// 1. 학과 목록 (학생이 풀고 있는 학과만 표시 - 원장 입장)
// ───────────────────────────────────────────────────────────
export function useStudentMajors(studentId: string | undefined) {
  return useQuery({
    queryKey: ['admin-student-majors', studentId],
    queryFn: async (): Promise<AdminMajorSeed[]> => {
      if (!studentId) return []
      
      // 학생이 진행한 학과만
      const { data: progress } = await supabase
        .from('high_major_progress')
        .select('major_id')
        .eq('student_id', studentId)
      
      const majorIds = [...new Set((progress || []).map(p => p.major_id))]
      if (majorIds.length === 0) return []
      
      const { data, error } = await supabase
        .from('high_major_seed')
        .select('id, name, description')
        .in('id', majorIds)
        .order('name')
      
      if (error) throw error
      return (data ?? []) as AdminMajorSeed[]
    },
    enabled: !!studentId,
  })
}

// ───────────────────────────────────────────────────────────
// 2. 모든 학과 (학생이 안 풀어도 선택 가능)
// ───────────────────────────────────────────────────────────
export function useAllMajors() {
  return useQuery({
    queryKey: ['admin-all-majors'],
    queryFn: async (): Promise<AdminMajorSeed[]> => {
      const { data, error } = await supabase
        .from('high_major_seed')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      return (data ?? []) as AdminMajorSeed[]
    },
    staleTime: 1000 * 60 * 60,
  })
}

// ───────────────────────────────────────────────────────────
// 3. 특정 학과 × 학년의 챕터 목록
// ───────────────────────────────────────────────────────────
export function useChapters(majorId: string | undefined, grade: number | undefined) {
  return useQuery({
    queryKey: ['admin-chapters', majorId, grade],
    queryFn: async (): Promise<AdminMajorChapter[]> => {
      if (!majorId || !grade) return []
      const { data, error } = await supabase
        .from('high_major_chapter')
        .select('*')
        .eq('major_id', majorId)
        .eq('grade', grade)
        .eq('is_active', true)
        .order('chapter_no', { ascending: true })
      
      if (error) throw error
      return (data ?? []) as AdminMajorChapter[]
    },
    enabled: !!majorId && !!grade,
  })
}

// ───────────────────────────────────────────────────────────
// 4. 학생의 모든 진행 상황 (학과 × 학년)
// ───────────────────────────────────────────────────────────
export function useStudentProgress(
  studentId: string | undefined,
  majorId: string | undefined,
  grade: number | undefined
) {
  return useQuery({
    queryKey: ['admin-student-progress', studentId, majorId, grade],
    queryFn: async (): Promise<AdminMajorProgress[]> => {
      if (!studentId || !majorId || !grade) return []
      
      // 챕터 목록 가져오기
      const { data: chapters } = await supabase
        .from('high_major_chapter')
        .select('id')
        .eq('major_id', majorId)
        .eq('grade', grade)
      
      if (!chapters || chapters.length === 0) return []
      const chapterIds = chapters.map(c => c.id)
      
      const { data, error } = await supabase
        .from('high_major_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('major_id', majorId)
        .in('chapter_id', chapterIds)
      
      if (error) throw error
      return (data ?? []) as AdminMajorProgress[]
    },
    enabled: !!studentId && !!majorId && !!grade,
    refetchInterval: 3000,
  })
}

// ───────────────────────────────────────────────────────────
// 5. 특정 회차(챕터)의 학생 진행 상세 + 풀었던 문제들
// ───────────────────────────────────────────────────────────
export function useChapterDetail(
  studentId: string | undefined,
  chapterId: string | undefined
) {
  return useQuery({
    queryKey: ['admin-chapter-detail', studentId, chapterId],
    queryFn: async (): Promise<{
      progress: AdminMajorProgress | null
      objQuestions: AdminMajorQuestion[]
      subjQuestion: AdminMajorQuestion | null
    }> => {
      if (!studentId || !chapterId) return { progress: null, objQuestions: [], subjQuestion: null }
      
      // 1. 진행 상황
      const { data: progress } = await supabase
        .from('high_major_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('chapter_id', chapterId)
        .maybeSingle()
      
      if (!progress) return { progress: null, objQuestions: [], subjQuestion: null }
      
      // 2. 학생이 푼 객관식 문제들 (obj_answers의 question_id로 매칭)
      const objAnswerIds = (progress.obj_answers || []).map((a: any) => a.question_id).filter(Boolean)
      let objQuestions: AdminMajorQuestion[] = []
      if (objAnswerIds.length > 0) {
        const { data } = await supabase
          .from('high_major_question')
          .select('*')
          .in('id', objAnswerIds)
        objQuestions = (data ?? []) as AdminMajorQuestion[]
      }
      
      // 3. 주관식 문제
      let subjQuestion: AdminMajorQuestion | null = null
      if (progress.subj_question_id) {
        const { data } = await supabase
          .from('high_major_question')
          .select('*')
          .eq('id', progress.subj_question_id)
          .maybeSingle()
        subjQuestion = data as AdminMajorQuestion | null
      }
      
      return {
        progress: progress as AdminMajorProgress,
        objQuestions,
        subjQuestion,
      }
    },
    enabled: !!studentId && !!chapterId,
    refetchInterval: 3000,
  })
}

// ───────────────────────────────────────────────────────────
// 6. 고3 생기부 조회 (원장 입장 - 읽기만)
// ───────────────────────────────────────────────────────────
export function useStudentSaenggibu(
  studentId: string | undefined,
  majorId: string | undefined
) {
  return useQuery({
    queryKey: ['admin-student-saenggibu', studentId, majorId],
    queryFn: async (): Promise<AdminMajorSaenggibu | null> => {
      if (!studentId || !majorId) return null
      const { data, error } = await supabase
        .from('high_major_saenggibu')
        .select('*')
        .eq('student_id', studentId)
        .eq('major_id', majorId)
        .maybeSingle()
      
      if (error) throw error
      return data as AdminMajorSaenggibu | null
    },
    enabled: !!studentId && !!majorId,
    refetchInterval: 5000,
  })
}

// ───────────────────────────────────────────────────────────
// 7. 점수 색상 헬퍼
// ───────────────────────────────────────────────────────────
export function getScoreColor(score: number, total: number): string {
  if (total === 0) return '#9CA3AF'
  const ratio = score / total
  if (ratio >= 0.8) return '#059669'  // 초록
  if (ratio >= 0.6) return '#D97706'  // 주황
  return '#DC2626'                     // 빨강
}

export function gradeNumToString(n: number): string {
  return ['', '고1', '고2', '고3'][n] || '고1'
}