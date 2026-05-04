import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
export type MiddleGrade = '중1' | '중2' | '중3'

export interface MiddleLesson {
  id: string
  grade: MiddleGrade
  month_no: number
  month_label: string
  week_no: number
  lesson_key: string
  title: string
  sub_title: string | null
  page_range: string | null
  video_url: string | null
  thumbnail_url: string | null
  duration_seconds: number | null
  sort_order: number
  is_active: boolean
}

export interface MiddleLessonProgress {
  id: string
  student_id: string
  lesson_id: string
  is_completed: boolean
  completed_at: string | null
  is_reviewed: boolean
  reviewed_at: string | null
  teacher_memo: string | null
}

// ──────────────────────────────────────────
// 학년별 영상 마스터 조회 (모든 사용자 공통)
// ──────────────────────────────────────────
export function useMiddleLessons(grade: MiddleGrade) {
  return useQuery({
    queryKey: ['middle-lessons', grade],
    queryFn: async (): Promise<MiddleLesson[]> => {
      const { data, error } = await supabase
        .from('middle_lessons')
        .select('*')
        .eq('grade', grade)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return (data ?? []) as MiddleLesson[]
    },
    staleTime: 5 * 60 * 1000, // 영상 마스터는 자주 안 바뀜
  })
}

// ──────────────────────────────────────────
// 특정 학생의 진행 상황 조회 (어드민용)
// ──────────────────────────────────────────
export function useMiddleLessonsProgress(studentId: string | undefined) {
  return useQuery({
    queryKey: ['middle-lessons-progress', studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<Map<string, MiddleLessonProgress>> => {
      const { data, error } = await supabase
        .from('middle_lessons_progress')
        .select('*')
        .eq('student_id', studentId!)

      if (error) throw error

      // Map<lesson_id, progress>
      const map = new Map<string, MiddleLessonProgress>()
      for (const row of data ?? []) {
        map.set(row.lesson_id, row as MiddleLessonProgress)
      }
      return map
    },
  })
}

// ──────────────────────────────────────────
// 수업 완료 체크 토글 (원장이 누름)
// ──────────────────────────────────────────
export function useToggleLessonComplete(studentId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      lessonId: string
      isCompleted: boolean
    }) => {
      const { lessonId, isCompleted } = params

      const { error } = await supabase
        .from('middle_lessons_progress')
        .upsert(
          {
            student_id: studentId,
            lesson_id: lessonId,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,lesson_id' },
        )

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['middle-lessons-progress', studentId] })
    },
  })
}

// ──────────────────────────────────────────
// 선생님 메모 저장
// ──────────────────────────────────────────
export function useUpdateLessonMemo(studentId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      lessonId: string
      memo: string
    }) => {
      const { lessonId, memo } = params

      const { error } = await supabase
        .from('middle_lessons_progress')
        .upsert(
          {
            student_id: studentId,
            lesson_id: lessonId,
            teacher_memo: memo,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,lesson_id' },
        )

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['middle-lessons-progress', studentId] })
    },
  })
}