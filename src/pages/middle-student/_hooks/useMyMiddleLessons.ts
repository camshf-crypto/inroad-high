import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MiddleLesson, MiddleLessonProgress, MiddleGrade } from '@/pages/admin/_hooks/middle/useMiddleLessons'

// ──────────────────────────────────────────
// 학년별 영상 마스터 조회 (학생용 - 어드민과 동일하지만 별도 위치 유지)
// ──────────────────────────────────────────
export function useMyMiddleLessons(grade: MiddleGrade) {
  return useQuery({
    queryKey: ['my-middle-lessons', grade],
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
    staleTime: 5 * 60 * 1000,
  })
}

// ──────────────────────────────────────────
// 내 진행 상황 조회 (RLS로 본인 데이터만)
// ──────────────────────────────────────────
export function useMyMiddleLessonsProgress() {
  return useQuery({
    queryKey: ['my-middle-lessons-progress'],
    queryFn: async (): Promise<Map<string, MiddleLessonProgress>> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return new Map()

      const { data, error } = await supabase
        .from('middle_lessons_progress')
        .select('*')
        .eq('student_id', user.id)

      if (error) throw error

      const map = new Map<string, MiddleLessonProgress>()
      for (const row of data ?? []) {
        map.set(row.lesson_id, row as MiddleLessonProgress)
      }
      return map
    },
    refetchInterval: 3000, // 3초마다 폴링 (원장이 체크하면 즉시 반영)
  })
}

// ──────────────────────────────────────────
// 학생: 본인 복습 체크 토글
// ──────────────────────────────────────────
export function useToggleLessonReview() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      lessonId: string
      isReviewed: boolean
    }) => {
      const { lessonId, isReviewed } = params

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요해요.')

      const { error } = await supabase
        .from('middle_lessons_progress')
        .upsert(
          {
            student_id: user.id,
            lesson_id: lessonId,
            is_reviewed: isReviewed,
            reviewed_at: isReviewed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,lesson_id' },
        )

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-middle-lessons-progress'] })
    },
  })
}