// src/pages/middle-student/_hooks/useMyMiddleConcept.ts

import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'

export interface MiddleStudentConcept {
  id: string
  grade: string | null  // 중등은 학년 구분 없이 사용하지만, DB 컬럼은 유지
  status: 'in_progress' | 'completed' | 'approved' | null
  major: string | null
  career: string | null
  custom_goal: string | null
  keywords: string[] | null
  type_name: string | null
}

/**
 * 중등 학생의 진로 계열 검사 조회
 *
 * 고등(useStudentConcept)과 달리 학년 구분 없이
 * 학생당 1개의 진단 결과만 가져옵니다.
 */
export function useMyMiddleConcept() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined

  return useQuery({
    queryKey: ['my-middle-concept', studentId, academyId],
    queryFn: async (): Promise<MiddleStudentConcept | null> => {
      if (!studentId || !academyId) return null

      // 학생당 1개의 진단 결과만 (학년 구분 X)
      const { data, error } = await supabase
        .from('middle_student_concept')
        .select('id, grade, status, major, career, custom_goal, keywords, type_name')
        .eq('student_id', studentId)
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('중등 컨셉 조회 실패:', error)
        return null
      }

      // ⭐ 승인 + 학과 선택까지 완료된 경우만 유효한 컨셉으로 반환
      // (진단 중/대기 중/학과 미선택은 모두 null 반환 → "설정 안 됨"으로 표시)
      if (!data) return null
      if (data.status !== 'approved') return null
      if (!data.major) return null

      return data as MiddleStudentConcept
    },
    enabled: !!studentId && !!academyId,
  })
}