import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export interface AdminPresentationExam {
  id: string
  student_id: string
  seed_id: string
  university: string
  category: string
  passage_title: string
  status: string

  main_intent_answer: string | null
  main_intent_recording_url: string | null
  main_intent_duration_sec: number | null
  main_intent_score: number | null  // 컬럼은 두지만 UI에서 안 씀
  main_intent_feedback: string | null
  main_intent_submitted_at: string | null

  opened_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminPresentationExamQuestion {
  id: string
  exam_id: string
  student_id: string
  seed_question_id: string | null
  order: number
  question: string
  author_intent: string

  first_answer: string | null
  first_recording_url: string | null
  first_duration_sec: number | null
  first_score: number | null
  first_feedback: string | null
  first_submitted_at: string | null

  second_answer: string | null
  second_recording_url: string | null
  second_duration_sec: number | null
  second_submitted_at: string | null

  final_feedback: string | null
  final_score: number | null
  final_at: string | null

  tail_question: string | null
  tail_answer: string | null
  tail_recording_url: string | null
  tail_duration_sec: number | null
  tail_feedback: string | null
  tail_submitted_at: string | null
  tail_feedback_at: string | null

  created_at: string
  updated_at: string
}

export interface PresentationSeedDetail {
  id: string
  university: string
  category: string
  passage_title: string
  passage_pdf_url: string | null
  passage_text: string | null
  main_intent_question: string
  main_author_intent: string
  difficulty: string
}

// 학생 회차 목록
export function useStudentPresentationExams(studentId: string | undefined) {
  return useQuery({
    queryKey: ['admin-presentation-exams', studentId],
    queryFn: async (): Promise<AdminPresentationExam[]> => {
      if (!studentId) return []
      const { data, error } = await supabase
        .from('high_passage_exam')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as AdminPresentationExam[]
    },
    enabled: !!studentId,
    refetchInterval: 2000,
  })
}

// 회차 질문
export function useStudentPresentationQuestions(examId: string | undefined) {
  return useQuery({
    queryKey: ['admin-presentation-questions', examId],
    queryFn: async (): Promise<AdminPresentationExamQuestion[]> => {
      if (!examId) return []
      const { data, error } = await supabase
        .from('high_passage_exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order', { ascending: true })
      if (error) throw error
      return (data ?? []) as AdminPresentationExamQuestion[]
    },
    enabled: !!examId,
    refetchInterval: 2000,
  })
}

// 시드 상세
export function useSeedDetails(seedId: string | undefined) {
  return useQuery({
    queryKey: ['presentation-seed-detail', seedId],
    queryFn: async (): Promise<PresentationSeedDetail | null> => {
      if (!seedId) return null
      const { data, error } = await supabase
        .from('high_passage_seed')
        .select('*')
        .eq('id', seedId)
        .single()
      if (error) throw error
      return data as PresentationSeedDetail
    },
    enabled: !!seedId,
  })
}

// 의도파악 피드백 저장 (점수 X, 피드백만)
export function useUpdateMainIntentFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { examId: string; feedback: string }) => {
      const { error } = await supabase
        .from('high_passage_exam')
        .update({
          main_intent_feedback: input.feedback,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.examId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-presentation-exams'] })
    },
  })
}

// 1차 피드백 (점수 X)
export function useUpdateFirstFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { questionId: string; examId: string; feedback: string }) => {
      const { error } = await supabase
        .from('high_passage_exam_questions')
        .update({
          first_feedback: input.feedback,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.questionId)
      if (error) throw error
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['admin-presentation-questions', v.examId] })
    },
  })
}

// 최종 피드백 (점수 X)
export function useUpdateFinalFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { questionId: string; examId: string; feedback: string }) => {
      const { error } = await supabase
        .from('high_passage_exam_questions')
        .update({
          final_feedback: input.feedback,
          final_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.questionId)
      if (error) throw error
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['admin-presentation-questions', v.examId] })
    },
  })
}

// 꼬리 피드백
export function useUpdateTailFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { questionId: string; examId: string; feedback: string }) => {
      const { error } = await supabase
        .from('high_passage_exam_questions')
        .update({
          tail_feedback: input.feedback,
          tail_feedback_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.questionId)
      if (error) throw error
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['admin-presentation-questions', v.examId] })
    },
  })
}

// 회차 삭제
export function useDeleteStudentPresentation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { examId: string; studentId: string }) => {
      const { data: files } = await supabase.storage
        .from('passage-recordings')
        .list(`${input.studentId}/${input.examId}`)
      if (files && files.length > 0) {
        const paths = files.map(f => `${input.studentId}/${input.examId}/${f.name}`)
        await supabase.storage.from('passage-recordings').remove(paths)
      }
      const { error } = await supabase
        .from('high_passage_exam')
        .delete()
        .eq('id', input.examId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-presentation-exams'] })
    },
  })
}

export function getPresentationStatusLabel(status: string) {
  const labels: Record<string, { label: string; bg: string; color: string }> = {
    open: { label: '대기', bg: '#FEF3C7', color: '#92400E' },
    in_progress: { label: '진행 중', bg: '#DBEAFE', color: '#1E40AF' },
    submitted: { label: '제출 완료', bg: '#D1FAE5', color: '#065F46' },
    analyzed: { label: '분석 완료', bg: '#E9D5FF', color: '#6B21A8' },
  }
  return labels[status] || { label: status, bg: '#F3F4F6', color: '#374151' }
}

// 질문 진행 단계 계산 (1~6)
export function getQuestionStep(q: AdminPresentationExamQuestion): number {
  if (!q.first_answer) return 1                                 // Step 1: 1차 답변 대기
  if (!q.first_feedback) return 2                                // Step 2: 1차 피드백 작성
  if (!q.second_answer) return 3                                 // Step 3: 2차 답변 대기
  if (!q.final_feedback) return 4                                // Step 4: 최종 피드백 작성
  if (q.tail_question) {
    if (!q.tail_answer) return 5                                 // Step 5: 꼬리 답변 대기
    if (!q.tail_feedback) return 6                               // Step 6: 꼬리 피드백 작성
    return 7                                                     // 완료
  }
  return 5                                                       // 꼬리 없으면 5에서 완료
}