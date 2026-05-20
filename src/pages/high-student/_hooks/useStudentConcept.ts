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
 * 특정 학년의 진로 계열 검사 조회
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

      // 학년별 데이터 조회 (status 무관)
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

      // ⭐ 승인 + 학과 선택까지 완료된 경우만 유효한 컨셉으로 반환
      // (진단 중/대기 중/학과 미선택은 모두 null 반환 → "설정 안 됨"으로 표시)
      if (!data) return null
      if (data.status !== 'approved') return null
      if (!data.major) return null

      return data as StudentConcept
    },
    enabled: !!studentId && !!academyId && !!gradeText,
  })
}