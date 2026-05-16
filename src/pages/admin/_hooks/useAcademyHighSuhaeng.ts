// src/pages/admin/_hooks/high/useAcademyHighSuhaeng.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { academyState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'

export type HighSuhaengType = '탐구보고서' | '독서기록' | '발표·토론' | '프로젝트·산출물' | '실험·실습' | '글쓰기·논술'
export type HighSuhaengGrade = '고1' | '고2' | '고3' | '전체'

export interface HighSuhaengQuestion {
  id: string
  academy_id: string
  teacher_id: string | null
  type: HighSuhaengType
  subject: string
  title: string
  content: string
  min_chars: number | null
  max_chars: number | null
  grade: HighSuhaengGrade
  is_active: boolean
  is_draft: boolean
  eval_criteria: { name: string; score: number }[]
  created_at: string
  updated_at: string
}

export interface AcademyStudent {
  id: string
  name: string
  grade: string
  school: string | null
  email: string | null
}

export interface QuestionAssignment {
  id: string
  question_id: string
  student_id: string
  academy_id: string
  created_at: string
}

// ─────────────────────────────────────────────
// 문제 목록 조회
// ─────────────────────────────────────────────
export function useHighSuhaengQuestions() {
  const academy = useAtomValue(academyState)
  const academyId = academy.academyId

  return useQuery({
    queryKey: ['high-suhaeng-questions', academyId],
    enabled: !!academyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('high_suhaeng_questions')
        .select('*')
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as HighSuhaengQuestion[]
    },
  })
}

// ─────────────────────────────────────────────
// 문제 생성
// ─────────────────────────────────────────────
export function useCreateHighSuhaengQuestion() {
  const qc = useQueryClient()
  const academy = useAtomValue(academyState)

  return useMutation({
    mutationFn: async (input: {
      type: HighSuhaengType
      subject: string
      title: string
      content: string
      min_chars?: number | null
      max_chars?: number | null
      grade: HighSuhaengGrade
      eval_criteria?: { name: string; score: number }[]
      is_draft?: boolean
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('high_suhaeng_questions')
        .insert({
          academy_id: academy.academyId,
          teacher_id: user?.id ?? null,
          ...input,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['high-suhaeng-questions'] })
    },
  })
}

// ─────────────────────────────────────────────
// 문제 수정
// ─────────────────────────────────────────────
export function useUpdateHighSuhaengQuestion() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      type?: HighSuhaengType
      subject?: string
      title?: string
      content?: string
      min_chars?: number | null
      max_chars?: number | null
      grade?: HighSuhaengGrade
      is_active?: boolean
      is_draft?: boolean
      eval_criteria?: { name: string; score: number }[]
    }) => {
      const { id, ...rest } = input
      const { error } = await supabase
        .from('high_suhaeng_questions')
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['high-suhaeng-questions'] })
    },
  })
}

// ─────────────────────────────────────────────
// 문제 삭제
// ─────────────────────────────────────────────
export function useDeleteHighSuhaengQuestion() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('high_suhaeng_questions')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['high-suhaeng-questions'] })
    },
  })
}

// ─────────────────────────────────────────────
// 고등 학생 목록 조회
// ─────────────────────────────────────────────
export function useHighAcademyStudents() {
  const academy = useAtomValue(academyState)
  const academyId = academy.academyId

  return useQuery({
    queryKey: ['high-academy-students', academyId],
    enabled: !!academyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, grade, school, email')
        .eq('academy_id', academyId)
        .eq('role', 'high_student')
        .eq('status', 'active')
        .in('grade', ['고1', '고2', '고3'])
        .order('grade')
        .order('name')
      if (error) throw error
      return (data ?? []) as AcademyStudent[]
    },
  })
}

// ─────────────────────────────────────────────
// 특정 문제의 배정된 학생 목록 조회
// ─────────────────────────────────────────────
export function useHighQuestionAssignments(questionId: string | null) {
  return useQuery({
    queryKey: ['high-suhaeng-question-assignments', questionId],
    enabled: !!questionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('high_suhaeng_question_assignments')
        .select('*')
        .eq('question_id', questionId)
      if (error) throw error
      return (data ?? []) as QuestionAssignment[]
    },
  })
}

// ─────────────────────────────────────────────
// 학생 배정 동기화
// ─────────────────────────────────────────────
export function useSyncHighQuestionAssignments() {
  const qc = useQueryClient()
  const academy = useAtomValue(academyState)

  return useMutation({
    mutationFn: async (input: {
      question_id: string
      student_ids: string[]
    }) => {
      const { error: delError } = await supabase
        .from('high_suhaeng_question_assignments')
        .delete()
        .eq('question_id', input.question_id)
      if (delError) throw delError

      if (input.student_ids.length > 0) {
        const rows = input.student_ids.map(student_id => ({
          question_id: input.question_id,
          student_id,
          academy_id: academy.academyId,
        }))
        const { error: insError } = await supabase
          .from('high_suhaeng_question_assignments')
          .insert(rows)
        if (insError) throw insError
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['high-suhaeng-question-assignments'] })
    },
  })
}