// src/pages/high-student/_hooks/useHighSuhaengSubmission.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ──────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────
export interface HighSuhaengSubmission {
  id: string
  question_id: string
  student_id: string
  academy_id: string
  answer_text: string | null
  answer_sections: any | null
  answer_audio_url: string | null
  answer_video_url: string | null
  answer_photo_urls: string[] | null
  status: 'pending' | 'analyzed' | 'first_done' | 'resubmitted' | 'completed'
  resubmitted_text: string | null
  resubmitted_at: string | null
  submitted_at: string
  created_at: string
  updated_at: string
}

export interface HighAcademySuhaengQuestion {
  id: string
  academy_id: string
  teacher_id: string | null
  type: string
  subject: string
  title: string
  content: string
  min_chars: number | null
  max_chars: number | null
  grade: string
  is_active: boolean
  is_draft: boolean
  eval_criteria: { name: string; score: number }[] | null
  created_at: string
  updated_at: string
}

export interface HighSuhaengFeedback {
  id: string
  submission_id: string
  ai_analysis: any | null
  ai_analyzed_at: string | null
  teacher_first_feedback: string | null
  teacher_first_at: string | null
  teacher_final_feedback: string | null
  teacher_final_at: string | null
  created_at: string
  updated_at: string
}

export interface SubmitHighAnswerInput {
  question_id?: string       // 학원 수행평가
  question_key?: string      // 우리 학교 수행평가 (목업)
  student_id: string
  academy_id: string
  answer_text?: string
  answer_sections?: any
  answer_audio_url?: string
  answer_video_url?: string
  answer_photo_urls?: string[]
}

// ──────────────────────────────────────────
// 학원 수행평가 문제 조회 (학생용)
// ──────────────────────────────────────────
export function useMyHighAcademyQuestions(
  studentId: string | undefined,
  academyId: string | undefined,
  grade: string | undefined,
) {
  return useQuery({
    queryKey: ['my-high-academy-questions', studentId, academyId, grade],
    enabled: !!studentId && !!academyId,
    queryFn: async () => {
      if (!studentId || !academyId) return []

      // 1. 학년 전체 공개 문제
      const { data: gradeQuestions, error: e1 } = await supabase
        .from('high_suhaeng_questions')
        .select('*')
        .eq('academy_id', academyId)
        .eq('is_active', true)
        .eq('is_draft', false)
        .in('grade', [grade ?? '', '전체'])

      if (e1) throw e1

      // 2. 개별 배정된 문제
      const { data: assignments, error: e2 } = await supabase
        .from('high_suhaeng_question_assignments')
        .select('question_id')
        .eq('student_id', studentId)
        .eq('academy_id', academyId)

      if (e2) throw e2

      let assignedQuestions: HighAcademySuhaengQuestion[] = []
      if (assignments && assignments.length > 0) {
        const assignedIds = assignments.map((a: any) => a.question_id)
        const { data: aq, error: e3 } = await supabase
          .from('high_suhaeng_questions')
          .select('*')
          .in('id', assignedIds)
          .eq('is_active', true)
          .eq('is_draft', false)
        if (e3) throw e3
        assignedQuestions = (aq ?? []) as HighAcademySuhaengQuestion[]
      }

      // 3. 중복 제거 후 합치기
      const allMap = new Map<string, HighAcademySuhaengQuestion>()
      ;[...(gradeQuestions ?? []), ...assignedQuestions].forEach((q: HighAcademySuhaengQuestion) => {
        allMap.set(q.id, q)
      })

      return Array.from(allMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    },
  })
}

// ──────────────────────────────────────────
// 내 제출 목록 조회
// ──────────────────────────────────────────
export function useMyHighSubmissions(studentId: string | undefined) {
  return useQuery({
    queryKey: ['my-high-submissions', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return []
      const { data, error } = await supabase
        .from('high_suhaeng_submissions')
        .select('*')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as HighSuhaengSubmission[]
    },
    refetchInterval: 5000,
  })
}

// ──────────────────────────────────────────
// 답안 제출
// ──────────────────────────────────────────
export function useSubmitHighAnswer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: SubmitHighAnswerInput) => {
      // 중복 제출 방지
      const dupQuery = supabase
        .from('high_suhaeng_submissions')
        .select('id')
        .eq('student_id', input.student_id)

      if (input.question_id) {
        dupQuery.eq('question_id', input.question_id)
      } else if (input.question_key) {
        dupQuery.eq('question_key', input.question_key)
      }

      const { data: existing } = await dupQuery.maybeSingle()
      if (existing) throw new Error('이미 제출한 답안이 있어요.')

      const { data, error } = await supabase
        .from('high_suhaeng_submissions')
        .insert({
          question_id: input.question_id ?? null,
          question_key: input.question_key ?? null,
          student_id: input.student_id,
          academy_id: input.academy_id,
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
      return data as HighSuhaengSubmission
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-high-submissions'] })
      qc.invalidateQueries({ queryKey: ['my-high-academy-questions'] })
    },
  })
}

// ──────────────────────────────────────────
// 재제출
// ──────────────────────────────────────────
export function useResubmitHighAnswer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: { submission_id: string; resubmitted_text: string }) => {
      const { data, error } = await supabase
        .from('high_suhaeng_submissions')
        .update({
          resubmitted_text: input.resubmitted_text,
          resubmitted_at: new Date().toISOString(),
          status: 'resubmitted',
        })
        .eq('id', input.submission_id)
        .select()
        .single()
      if (error) throw error
      return data as HighSuhaengSubmission
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-high-submissions'] })
    },
  })
}

// ──────────────────────────────────────────
// 피드백 조회
// ──────────────────────────────────────────
export function useMyHighFeedback(submissionId: string | undefined) {
  return useQuery({
    queryKey: ['my-high-feedback', submissionId],
    enabled: !!submissionId,
    queryFn: async () => {
      if (!submissionId) return null
      const { data, error } = await supabase
        .from('high_suhaeng_feedback')
        .select('*')
        .eq('submission_id', submissionId)
        .maybeSingle()
      if (error) throw error
      return data as HighSuhaengFeedback | null
    },
    refetchInterval: 5000,
  })
}