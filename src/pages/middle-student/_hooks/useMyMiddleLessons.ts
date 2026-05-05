import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MiddleLesson, MiddleLessonProgress, MiddleGrade } from '@/pages/admin/_hooks/middle/useMiddleLessons'

// ───────────────────────────────────────────────
// 누적 주차 계산
// 데이터가 있는 월: 1, 2, 3, 5, 7, 8, 10, 12 (총 8개월)
// 각 월의 1~4주차를 누적 주차로 변환
// 예: 1월 1주차 = 1, 1월 4주차 = 4, 2월 1주차 = 5, 12월 4주차 = 32
// ───────────────────────────────────────────────

const ACTIVE_MONTHS = [1, 2, 3, 5, 7, 8, 10, 12]
const WEEKS_PER_MONTH = 4

function toCumulativeWeek(month_no: number, week_no: number): number {
  const idx = ACTIVE_MONTHS.indexOf(month_no)
  if (idx === -1) return 0
  return idx * WEEKS_PER_MONTH + week_no
}

// ───────────────────────────────────────────────
// 잠금 정보가 추가된 MiddleLesson
// ───────────────────────────────────────────────

export interface MyMiddleLesson extends MiddleLesson {
  is_locked: boolean
  cumulative_week: number
}

// ──────────────────────────────────────────
// 내 선생님의 진도(공개 한계) 조회
// ──────────────────────────────────────────
export function useMyTeacherProgress(grade: MiddleGrade) {
  return useQuery({
    queryKey: ['my-teacher-progress', grade],
    queryFn: async (): Promise<{ lessons_visible_until: number; homework_visible_until: number }> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { lessons_visible_until: 0, homework_visible_until: 0 }

      // 1. 내 teacher_id 조회
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('teacher_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profErr) throw profErr
      if (!profile?.teacher_id) {
        // 담당 선생님 미배정 → 모든 영상 잠금
        return { lessons_visible_until: 0, homework_visible_until: 0 }
      }

      // 2. 그 선생님의 해당 학년 진도 조회
      const { data: progress, error: progErr } = await supabase
        .from('teacher_progress')
        .select('lessons_visible_until, homework_visible_until')
        .eq('teacher_id', profile.teacher_id)
        .eq('grade', grade)
        .maybeSingle()

      if (progErr) throw progErr

      return {
        lessons_visible_until: progress?.lessons_visible_until ?? 0,
        homework_visible_until: progress?.homework_visible_until ?? 0,
      }
    },
    refetchInterval: 3000,  // 3초 폴링 (원장이 슬라이더 옮기면 즉시 반영)
  })
}

// ──────────────────────────────────────────
// 학년별 영상 마스터 조회 + 잠금 정보 자동 결합
// ──────────────────────────────────────────
export function useMyMiddleLessons(grade: MiddleGrade) {
  const { data: teacherProgress } = useMyTeacherProgress(grade)
  const visibleUntil = teacherProgress?.lessons_visible_until ?? 0

  return useQuery({
    queryKey: ['my-middle-lessons', grade, visibleUntil],
    queryFn: async (): Promise<MyMiddleLesson[]> => {
      const { data, error } = await supabase
        .from('middle_lessons')
        .select('*')
        .eq('grade', grade)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error

      return (data ?? []).map((l: MiddleLesson) => {
        const cumulative_week = toCumulativeWeek(l.month_no, l.week_no)
        return {
          ...l,
          cumulative_week,
          is_locked: cumulative_week > visibleUntil,
        }
      })
    },
    staleTime: 60 * 1000,
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
    refetchInterval: 3000, // 3초마다 폴링
  })
}

// ──────────────────────────────────────────
// 학생: 본인 수업 완료 체크 토글
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