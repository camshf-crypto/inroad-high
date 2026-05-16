// src/pages/admin/_hooks/high/useStudentHighSuhaeng.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ──────────────────────────────────────────
// 학생의 고등 수행평가 제출 목록 조회 (선생님용)
// ──────────────────────────────────────────
export function useStudentHighSuhaengSubmissions(studentId: string | undefined) {
  return useQuery({
    queryKey: ['student-high-suhaeng-submissions', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return []
      const { data, error } = await supabase
        .from('high_suhaeng_submissions')
        .select(`
          *,
          high_suhaeng_questions (
            id, type, subject, title, content, grade, min_chars, max_chars, eval_criteria
          )
        `)
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    refetchInterval: 5000,
  })
}

// ──────────────────────────────────────────
// 피드백 조회
// ──────────────────────────────────────────
export function useHighSubmissionFeedback(submissionId: string | undefined) {
  return useQuery({
    queryKey: ['high-submission-feedback', submissionId],
    enabled: !!submissionId,
    queryFn: async () => {
      if (!submissionId) return null
      const { data, error } = await supabase
        .from('high_suhaeng_feedback')
        .select('*')
        .eq('submission_id', submissionId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    refetchInterval: 5000,
  })
}

// ──────────────────────────────────────────
// AI 분석 저장
// ──────────────────────────────────────────
export function useSaveHighAiAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ submission_id, ai_analysis }: { submission_id: string; ai_analysis: any }) => {
      // upsert feedback row
      const { data: existing } = await supabase
        .from('high_suhaeng_feedback')
        .select('id')
        .eq('submission_id', submission_id)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('high_suhaeng_feedback')
          .update({ ai_analysis, ai_analyzed_at: new Date().toISOString() })
          .eq('submission_id', submission_id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('high_suhaeng_feedback')
          .insert({ submission_id, ai_analysis, ai_analyzed_at: new Date().toISOString() })
        if (error) throw error
      }

      // status → analyzed
      await supabase
        .from('high_suhaeng_submissions')
        .update({ status: 'analyzed' })
        .eq('id', submission_id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-high-suhaeng-submissions'] })
      qc.invalidateQueries({ queryKey: ['high-submission-feedback'] })
    },
  })
}

// ──────────────────────────────────────────
// 1차 피드백 저장
// ──────────────────────────────────────────
export function useSaveHighFirstFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ submission_id, teacher_first_feedback }: { submission_id: string; teacher_first_feedback: string }) => {
      const { data: existing } = await supabase
        .from('high_suhaeng_feedback')
        .select('id')
        .eq('submission_id', submission_id)
        .maybeSingle()

      const now = new Date().toISOString()
      if (existing) {
        const { error } = await supabase
          .from('high_suhaeng_feedback')
          .update({ teacher_first_feedback, teacher_first_at: now })
          .eq('submission_id', submission_id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('high_suhaeng_feedback')
          .insert({ submission_id, teacher_first_feedback, teacher_first_at: now })
        if (error) throw error
      }

      await supabase
        .from('high_suhaeng_submissions')
        .update({ status: 'first_done' })
        .eq('id', submission_id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-high-suhaeng-submissions'] })
      qc.invalidateQueries({ queryKey: ['high-submission-feedback'] })
    },
  })
}

// ──────────────────────────────────────────
// 최종 피드백 저장
// ──────────────────────────────────────────
export function useSaveHighFinalFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ submission_id, teacher_final_feedback }: { submission_id: string; teacher_final_feedback: string }) => {
      const { data: existing } = await supabase
        .from('high_suhaeng_feedback')
        .select('id')
        .eq('submission_id', submission_id)
        .maybeSingle()

      const now = new Date().toISOString()
      if (existing) {
        const { error } = await supabase
          .from('high_suhaeng_feedback')
          .update({ teacher_final_feedback, teacher_final_at: now })
          .eq('submission_id', submission_id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('high_suhaeng_feedback')
          .insert({ submission_id, teacher_final_feedback, teacher_final_at: now })
        if (error) throw error
      }

      await supabase
        .from('high_suhaeng_submissions')
        .update({ status: 'completed' })
        .eq('id', submission_id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-high-suhaeng-submissions'] })
      qc.invalidateQueries({ queryKey: ['high-submission-feedback'] })
    },
  })
}