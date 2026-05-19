// src/pages/high-student/_hooks/useStudentConcept.ts

import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'

export interface StudentConcept {
  id: string
  grade: string  // '고1' | '고2' | '고3' (text)
  status: 'in_progress' | 'completed' | 'approved' | null
  major: string | null
  career: string | null
  custom_goal: string | null
  keywords: string[] | null
  type_name: string | null
}

// 숫자 학년 → 텍스트 학년 변환
export const gradeNumToText = (gradeNum: number): string => {
  if (gradeNum === 1) return '고1'
  if (gradeNum === 2) return '고2'
  if (gradeNum === 3) return '고3'
  return '고1'
}

/**
 * 특정 학년의 진로 컨셉 조회
 * @param gradeNum 1 | 2 | 3 (숫자)
 */
export function useStudentConcept(gradeNum?: number) {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined
  const gradeText = gradeNum ? gradeNumToText(gradeNum) : undefined

  return useQuery({
    queryKey: ['student-concept', studentId, academyId, gradeText],
    queryFn: async (): Promise<StudentConcept | null> => {
      if (!studentId || !academyId || !gradeText) return null

      const { data, error } = await supabase
        .from('student_concept')
        .select('id, grade, status, major, career, custom_goal, keywords, type_name')
        .eq('student_id', studentId)
        .eq('academy_id', academyId)
        .eq('grade', gradeText)
        .maybeSingle()

      if (error) {
        console.error('컨셉 조회 실패:', error)
        return null
      }
      return data as StudentConcept | null
    },
    enabled: !!studentId && !!academyId && !!gradeText,
  })
}