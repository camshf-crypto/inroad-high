import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAtomValue } from 'jotai'
import { academyState } from '@/lib/auth/atoms'

/**
 * 선생님 정보 (원장 + 강사)
 *
 * 주의: DB의 profiles.role은 소문자 ('admin', 'teacher')
 *       atom의 academy.role은 대문자 ('OWNER', 'TEACHER') — useLogin.ts에서 변환됨
 *
 * 이 훅은 Supabase에서 직접 가져오므로 DB 값(소문자)을 그대로 사용
 */
export interface Teacher {
  id: string
  name: string
  role: 'admin' | 'teacher'
}

/**
 * 선생님별 학년별 진도 1행
 * - lessons_visible_until: 학생에게 공개되는 수업 누적 주차 (0 = 시작 전)
 * - homework_visible_until: 학생에게 공개되는 숙제 누적 주차 (0 = 시작 전)
 */
export interface TeacherProgress {
  teacher_id: string
  grade: string
  lessons_visible_until: number
  homework_visible_until: number
  updated_at: string | null
}

/**
 * 우리 학원 선생님 목록 조회 (원장 포함)
 */
export function useAcademyTeachers() {
  const academy = useAtomValue(academyState)

  return useQuery({
    queryKey: ['academy-teachers', academy.academyId],
    enabled: !!academy.academyId,
    queryFn: async (): Promise<Teacher[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('academy_id', academy.academyId!)
        .in('role', ['admin', 'teacher'])
        .order('role', { ascending: true })  // admin이 알파벳순으로 먼저
        .order('name', { ascending: true })

      if (error) throw error

      return (data ?? []).map(t => ({
        id: t.id,
        name: t.name ?? '이름없음',
        role: t.role as 'admin' | 'teacher',
      }))
    },
  })
}

/**
 * 특정 선생님의 학년별 진도 조회
 */
export function useTeacherProgress(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-progress', teacherId],
    enabled: !!teacherId,
    queryFn: async (): Promise<Map<string, TeacherProgress>> => {
      const { data, error } = await supabase
        .from('teacher_progress')
        .select('teacher_id, grade, lessons_visible_until, homework_visible_until, updated_at')
        .eq('teacher_id', teacherId!)

      if (error) throw error

      const map = new Map<string, TeacherProgress>()
      for (const row of data ?? []) {
        map.set(row.grade, row as TeacherProgress)
      }
      return map
    },
  })
}

/**
 * 선생님 진도 업데이트 (수업 또는 숙제, 누적 주차 단위)
 */
export function useUpdateTeacherProgress(teacherId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      grade: string
      type: 'lesson' | 'homework'
      visibleUntil: number
    }) => {
      const { grade, type, visibleUntil } = params

      // 기존 row 가져와서 다른 type 값은 보존
      const { data: existing } = await supabase
        .from('teacher_progress')
        .select('lessons_visible_until, homework_visible_until')
        .eq('teacher_id', teacherId)
        .eq('grade', grade)
        .maybeSingle()

      const updateData: any = {
        teacher_id: teacherId,
        grade,
        lessons_visible_until: existing?.lessons_visible_until ?? 0,
        homework_visible_until: existing?.homework_visible_until ?? 0,
      }

      if (type === 'lesson') {
        updateData.lessons_visible_until = visibleUntil
      } else {
        updateData.homework_visible_until = visibleUntil
      }

      const { error } = await supabase
        .from('teacher_progress')
        .upsert(updateData, { onConflict: 'teacher_id,grade' })

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-progress', teacherId] })
    },
  })
}

// ───────────────────────────────────────────────
// 누적 주차 ↔ 월/주차 변환 유틸
// 데이터가 있는 월만 카운트: 1, 2, 3, 5, 7, 8, 10, 12 (총 8개월 × 4주 = 32주)
// ───────────────────────────────────────────────

export const ACTIVE_MONTHS = [1, 2, 3, 5, 7, 8, 10, 12] as const
export const WEEKS_PER_MONTH = 4
export const MAX_VISIBLE_WEEK = ACTIVE_MONTHS.length * WEEKS_PER_MONTH  // 32

/**
 * 누적 주차 → "1월 2주차" 같은 표시 문자열
 */
export function weekToLabel(week: number): string {
  if (week <= 0) return '시작 전'
  if (week > MAX_VISIBLE_WEEK) return '완료'

  const monthIdx = Math.floor((week - 1) / WEEKS_PER_MONTH)
  const weekInMonth = ((week - 1) % WEEKS_PER_MONTH) + 1
  const month = ACTIVE_MONTHS[monthIdx]
  return `${month}월 ${weekInMonth}주차`
}