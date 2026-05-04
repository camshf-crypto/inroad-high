import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAtomValue } from 'jotai'
import { academyState } from '@/lib/auth/atoms'

/**
 * 선생님 정보 (원장 + 강사)
 */
export interface Teacher {
  id: string
  name: string
  role: 'OWNER' | 'TEACHER'
}

/**
 * 선생님별 학년별 진도 1행
 */
export interface TeacherProgress {
  teacher_id: string
  grade: string                    // '중1' | '중2' | '중3'
  lesson_month: number | null      // 현재 진도 월 (1~12)
  lesson_week: number | null       // 현재 진도 주차 (1~4)
  homework_month: number | null
  homework_week: number | null
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
        .in('role', ['OWNER', 'TEACHER'])
        .order('role', { ascending: true })  // OWNER 먼저
        .order('name', { ascending: true })

      if (error) throw error

      return (data ?? []).map(t => ({
        id: t.id,
        name: t.name ?? '이름없음',
        role: t.role as 'OWNER' | 'TEACHER',
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
        .select('teacher_id, grade, lesson_month, lesson_week, homework_month, homework_week, updated_at')
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
 * 선생님 진도 업데이트 (수업 또는 숙제)
 */
export function useUpdateTeacherProgress(teacherId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      grade: string
      type: 'lesson' | 'homework'
      month: number | null
      week: number | null
    }) => {
      const { grade, type, month, week } = params

      const updateData: any = {
        teacher_id: teacherId,
        grade,
      }

      if (type === 'lesson') {
        updateData.lesson_month = month
        updateData.lesson_week = week
      } else {
        updateData.homework_month = month
        updateData.homework_week = week
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