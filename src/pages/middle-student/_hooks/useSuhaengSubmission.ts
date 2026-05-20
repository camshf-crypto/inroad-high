// src/pages/middle-student/_hooks/useSuhaengSubmission.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SuhaengSubmission {
  id: string
  student_id: string
  academy_id: string
  question_key: string
  question_type: string
  question_title: string
  question_content: string | null
  question_category: string
  question_school_name: string | null
  question_subject: string | null
  question_ratio: number | null
  question_min_chars: number | null
  question_max_chars: number | null
  answer_text: string | null
  answer_sections: any | null
  answer_audio_url: string | null
  answer_video_url: string | null
  answer_photo_urls: string[] | null
  status: 'pending' | 'analyzed' | 'first_done' | 'resubmitted' | 'completed'
  submitted_at: string
  resubmitted_text: string | null
  resubmitted_at: string | null
  created_at: string
  updated_at: string
}

export interface SubmitAnswerInput {
  student_id: string
  academy_id: string
  question_key: string
  question_type: string
  question_title: string
  question_content?: string
  question_category?: 'school' | 'practice' | 'academy'
  question_school_name?: string
  question_subject?: string
  question_ratio?: number
  question_min_chars?: number
  question_max_chars?: number
  answer_text?: string
  answer_sections?: any
  answer_audio_url?: string
  answer_video_url?: string
  answer_photo_urls?: string[]
}

export interface AcademySuhaengQuestion {
  id: string
  academy_id: string
  teacher_id: string | null
  level: 'middle' | 'high'
  subject: string
  type: string
  title: string
  content: string
  min_chars: number | null
  max_chars: number | null
  grade: string
  is_active: boolean
  created_at: string
}

export function useMySuhaengSubmissions(studentId: string | undefined) {
  return useQuery({
    queryKey: ['my-suhaeng-submissions', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return []
      const { data, error } = await supabase
        .from('suhaeng_submissions')
        .select('*')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as SuhaengSubmission[]
    },
    refetchInterval: 5000,
  })
}

export function useMySubmissionByKey(
  studentId: string | undefined,
  questionKey: string | undefined,
) {
  return useQuery({
    queryKey: ['my-submission', studentId, questionKey],
    enabled: !!studentId && !!questionKey,
    queryFn: async () => {
      if (!studentId || !questionKey) return null
      const { data, error } = await supabase
        .from('suhaeng_submissions')
        .select('*')
        .eq('student_id', studentId)
        .eq('question_key', questionKey)
        .maybeSingle()
      if (error) throw error
      return data as SuhaengSubmission | null
    },
  })
}

// ⭐ 학원 수행평가 문제 조회 (학생용)
// 배정된 문제만 보이도록 수정 — 학년 전체 공개 제거
export function useMyAcademyQuestions(
  studentId: string | undefined,
  academyId: string | undefined,
  grade: string | undefined,
) {
  return useQuery({
    queryKey: ['my-academy-questions', studentId, academyId, grade],
    enabled: !!studentId && !!academyId,
    queryFn: async () => {
      if (!studentId || !academyId) return []

      // 나에게 개별 배정된 문제 ID 조회
      const { data: assignments, error: e1 } = await supabase
        .from('suhaeng_question_assignments')
        .select('question_id')
        .eq('student_id', studentId)
        .eq('academy_id', academyId)

      if (e1) throw e1
      if (!assignments || assignments.length === 0) return []

      const assignedIds = assignments.map((a: any) => a.question_id)

      // 배정된 문제만 조회
      const { data, error: e2 } = await supabase
        .from('suhaeng_questions')
        .select('*')
        .in('id', assignedIds)
        .eq('is_active', true)
        .eq('is_draft', false)
        .order('created_at', { ascending: false })

      if (e2) throw e2
      return (data ?? []) as AcademySuhaengQuestion[]
    },
  })
}

export function useSubmitAnswer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: SubmitAnswerInput) => {
      const { data: existing } = await supabase
        .from('suhaeng_submissions')
        .select('id')
        .eq('student_id', input.student_id)
        .eq('question_key', input.question_key)
        .maybeSingle()

      if (existing) {
        throw new Error('이미 제출한 답안이 있어요. 재제출은 다른 메뉴에서 가능합니다.')
      }

      const { data, error } = await supabase
        .from('suhaeng_submissions')
        .insert({
          student_id: input.student_id,
          academy_id: input.academy_id,
          question_key: input.question_key,
          question_type: input.question_type,
          question_title: input.question_title,
          question_content: input.question_content ?? null,
          question_category: input.question_category ?? 'practice',
          question_school_name: input.question_school_name ?? null,
          question_subject: input.question_subject ?? null,
          question_ratio: input.question_ratio ?? null,
          question_min_chars: input.question_min_chars ?? null,
          question_max_chars: input.question_max_chars ?? null,
          answer_text: input.answer_text ?? null,
          answer_sections: input.answer_sections ?? null,
          answer_audio_url: input.answer_audio_url ?? null,
          answer_video_url: input.answer_video_url ?? null,
          answer_photo_urls: input.answer_photo_urls ?? null,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error
      return data as SuhaengSubmission
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-suhaeng-submissions'] })
      qc.invalidateQueries({ queryKey: ['my-submission'] })
      qc.invalidateQueries({ queryKey: ['my-academy-questions'] })
    },
  })
}

export function useResubmitAnswer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: { submission_id: string; resubmitted_text: string }) => {
      const { data, error } = await supabase
        .from('suhaeng_submissions')
        .update({
          resubmitted_text: input.resubmitted_text,
          resubmitted_at: new Date().toISOString(),
          status: 'resubmitted',
        })
        .eq('id', input.submission_id)
        .select()
        .single()
      if (error) throw error
      return data as SuhaengSubmission
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-suhaeng-submissions'] })
      qc.invalidateQueries({ queryKey: ['my-submission'] })
    },
  })
}

export interface SuhaengFeedback {
  id: string
  submission_id: string
  ai_analysis: any | null
  ai_analyzed_at: string | null
  ai_second_analysis: any | null
  ai_second_analyzed_at: string | null
  teacher_first_feedback: string | null
  teacher_first_id: string | null
  teacher_first_at: string | null
  teacher_final_feedback: string | null
  teacher_final_id: string | null
  teacher_final_at: string | null
  created_at: string
  updated_at: string
}

export function useMyFeedback(submissionId: string | undefined) {
  return useQuery({
    queryKey: ['my-feedback', submissionId],
    enabled: !!submissionId,
    queryFn: async () => {
      if (!submissionId) return null
      const { data, error } = await supabase
        .from('suhaeng_feedback')
        .select('*')
        .eq('submission_id', submissionId)
        .maybeSingle()
      if (error) throw error
      return data as SuhaengFeedback | null
    },
    refetchInterval: 5000,
  })
}