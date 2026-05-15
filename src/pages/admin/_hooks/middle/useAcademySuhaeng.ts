// src/pages/admin/_hooks/middle/useAcademySuhaeng.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { academyState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'

export type SuhaengLevel = 'middle' | 'high'
export type SuhaengType = '논술형' | '서술형' | '주제탐구' | '구술발표' | '탐구수행'
export type SuhaengGrade = '중1' | '중2' | '중3' | '고1' | '고2' | '고3' | '전체'

export interface SuhaengQuestion {
  id: string
  academy_id: string
  teacher_id: string | null
  level: SuhaengLevel
  subject: string
  type: SuhaengType
  title: string
  content: string
  min_chars: number | null
  max_chars: number | null
  grade: SuhaengGrade
  is_active: boolean
  is_draft: boolean
  created_at: string
  eval_criteria?: { name: string; score: number }[]
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
  student?: AcademyStudent
}

// ─────────────────────────────────────────────
// 문제 목록 조회
// ─────────────────────────────────────────────
export function useAcademySuhaengQuestions(level: SuhaengLevel) {
  const academy = useAtomValue(academyState)
  const academyId = academy.academyId

  return useQuery({
    queryKey: ['academy-suhaeng-questions', academyId, level],
    enabled: !!academyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suhaeng_questions')
        .select('*')
        .eq('academy_id', academyId)
        .eq('level', level)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as SuhaengQuestion[]
    },
  })
}

// ─────────────────────────────────────────────
// 문제 생성
// ─────────────────────────────────────────────
export function useCreateSuhaengQuestion() {
  const qc = useQueryClient()
  const academy = useAtomValue(academyState)

  return useMutation({
    mutationFn: async (input: {
      level: SuhaengLevel
      subject: string
      type: SuhaengType
      title: string
      content: string
      min_chars?: number | null
      max_chars?: number | null
      grade: SuhaengGrade
      eval_criteria?: { name: string; score: number }[]
      is_draft?: boolean
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('suhaeng_questions')
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
      qc.invalidateQueries({ queryKey: ['academy-suhaeng-questions'] })
    },
  })
}

// ─────────────────────────────────────────────
// 문제 수정
// ─────────────────────────────────────────────
export function useUpdateSuhaengQuestion() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      subject?: string
      type?: SuhaengType
      title?: string
      content?: string
      min_chars?: number | null
      max_chars?: number | null
      grade?: SuhaengGrade
      is_active?: boolean
      is_draft?: boolean
      eval_criteria?: { name: string; score: number }[]
    }) => {
      const { id, ...rest } = input
      const { error } = await supabase
        .from('suhaeng_questions')
        .update(rest)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy-suhaeng-questions'] })
    },
  })
}

// ─────────────────────────────────────────────
// 문제 삭제
// ─────────────────────────────────────────────
export function useDeleteSuhaengQuestion() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suhaeng_questions')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy-suhaeng-questions'] })
    },
  })
}

// ─────────────────────────────────────────────
// 학원 학생 목록 조회
// ─────────────────────────────────────────────
export function useAcademyStudents(level: SuhaengLevel) {
  const academy = useAtomValue(academyState)
  const academyId = academy.academyId

  return useQuery({
    queryKey: ['academy-students-for-suhaeng', academyId, level],
    enabled: !!academyId,
    queryFn: async () => {
      const grades = level === 'middle'
        ? ['중1', '중2', '중3']
        : ['고1', '고2', '고3']

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, grade, school, email')
        .eq('academy_id', academyId)
        .eq('role', level === 'middle' ? 'middle_student' : 'high_student')
        .eq('status', 'active')
        .in('grade', grades)
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
export function useQuestionAssignments(questionId: string | null) {
  return useQuery({
    queryKey: ['suhaeng-question-assignments', questionId],
    enabled: !!questionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suhaeng_question_assignments')
        .select('*')
        .eq('question_id', questionId)
      if (error) throw error
      return (data ?? []) as QuestionAssignment[]
    },
  })
}

// ─────────────────────────────────────────────
// 학생 배정 (여러 명 한번에)
// ─────────────────────────────────────────────
export function useSyncQuestionAssignments() {
  const qc = useQueryClient()
  const academy = useAtomValue(academyState)

  return useMutation({
    mutationFn: async (input: {
      question_id: string
      student_ids: string[]
    }) => {
      // 기존 배정 전체 삭제
      const { error: delError } = await supabase
        .from('suhaeng_question_assignments')
        .delete()
        .eq('question_id', input.question_id)
      if (delError) throw delError

      // 새로 배정 (선택된 학생이 있을 때만)
      if (input.student_ids.length > 0) {
        const rows = input.student_ids.map(student_id => ({
          question_id: input.question_id,
          student_id,
          academy_id: academy.academyId,
        }))
        const { error: insError } = await supabase
          .from('suhaeng_question_assignments')
          .insert(rows)
        if (insError) throw insError
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suhaeng-question-assignments'] })
    },
  })
}