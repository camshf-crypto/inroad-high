// src/pages/admin/_pages/reports/_hooks/useReportData.ts
// 월간 보고서 - 학생 목록 + 저장/발행 mutation들

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface AcademyStudentReport {
  student_id: string
  student_name: string
  student_grade: string
  student_school: string | null
  student_avatar_url: string | null
  teacher_id: string | null

  // 12개 활동 카운트
  essay_count: number
  past_answer_count: number
  simulation_count: number
  interview_count: number
  passage_count: number
  reading_count: number
  lessons_progress_count: number
  homework_submission_count: number
  homework_progress_count: number
  suhaeng_count: number

  // 발행 상태
  report_id: string | null
  is_published: boolean | null
  ai_comment_draft: string | null
  teacher_comment: string | null
  published_at: string | null
  report_updated_at: string | null
}

export interface SaveReportInput {
  student_id: string
  academy_id: string
  grade_level: 'high' | 'middle'
  year_month: string
  ai_comment_draft?: string
  teacher_comment?: string
}

// ─────────────────────────────────────────────
// 1. 학원의 학생들 + 월간 데이터 + 발행 상태
// ─────────────────────────────────────────────

export function useAcademyMonthlySummary(
  academyId: string | null | undefined,
  gradeLevel: 'high' | 'middle',
  yearMonth: string
) {
  return useQuery({
    queryKey: ['academy-monthly-summary', academyId, gradeLevel, yearMonth],
    enabled: !!academyId,
    queryFn: async (): Promise<AcademyStudentReport[]> => {
      const { data, error } = await supabase.rpc(
        'get_academy_monthly_summary',
        {
          p_academy_id: academyId,
          p_year_month: yearMonth,
          p_grade_level: gradeLevel,
        }
      )

      if (error) {
        console.error('학원 학생 요약 조회 실패:', error)
        throw error
      }

      return (data as AcademyStudentReport[]) || []
    },
  })
}

// ─────────────────────────────────────────────
// 2. 보고서 저장 (upsert)
// ─────────────────────────────────────────────

export function useSaveReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SaveReportInput) => {
      const { data, error } = await supabase
        .from('parent_monthly_reports')
        .upsert(
          {
            student_id: input.student_id,
            academy_id: input.academy_id,
            grade_level: input.grade_level,
            year_month: input.year_month,
            ai_comment_draft: input.ai_comment_draft || null,
            teacher_comment: input.teacher_comment || null,
          },
          { onConflict: 'student_id,year_month' }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-monthly-summary'] })
    },
  })
}

// ─────────────────────────────────────────────
// 3. 보고서 발행 (is_published = true)
// ─────────────────────────────────────────────

export function usePublishReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SaveReportInput) => {
      const { data: userData } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('parent_monthly_reports')
        .upsert(
          {
            student_id: input.student_id,
            academy_id: input.academy_id,
            grade_level: input.grade_level,
            year_month: input.year_month,
            ai_comment_draft: input.ai_comment_draft || null,
            teacher_comment: input.teacher_comment || null,
            is_published: true,
            published_at: new Date().toISOString(),
            published_by: userData.user?.id || null,
          },
          { onConflict: 'student_id,year_month' }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-monthly-summary'] })
    },
  })
}

// ─────────────────────────────────────────────
// 4. 일괄 발행 - 여러 학생 한 번에
// ─────────────────────────────────────────────

export interface BulkPublishInput {
  academy_id: string
  grade_level: 'high' | 'middle'
  year_month: string
  students: { student_id: string; ai_comment_draft: string }[]
}

export function useBulkPublishReports() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BulkPublishInput) => {
      const { data: userData } = await supabase.auth.getUser()
      const now = new Date().toISOString()

      const rows = input.students.map(s => ({
        student_id: s.student_id,
        academy_id: input.academy_id,
        grade_level: input.grade_level,
        year_month: input.year_month,
        ai_comment_draft: s.ai_comment_draft,
        is_published: true,
        published_at: now,
        published_by: userData.user?.id || null,
      }))

      const { data, error } = await supabase
        .from('parent_monthly_reports')
        .upsert(rows, { onConflict: 'student_id,year_month' })
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-monthly-summary'] })
    },
  })
}