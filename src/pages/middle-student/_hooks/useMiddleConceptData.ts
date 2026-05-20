// src/pages/middle-student/_hooks/useMiddleConceptData.ts

import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'

export interface MiddleConceptSummary {
  typeCode: string | null
  typeName: string | null
  major: string | null
  career: string | null
  customGoal: string | null
  keywords: string[]
  status: string | null
}

/**
 * 중등 학생의 진로 계열 검사 정보 조회 (간단 버전)
 *
 * 고등(useConceptData)과 동일한 패턴이지만 학년 구분 없이
 * 학생당 1개의 진단 결과만 가져옵니다.
 *
 * - 캐싱 없이 페이지 진입 시마다 조회
 * - status === 'approved' 인 경우만 데이터 반환
 */
export function useMiddleConceptData() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const [concept, setConcept] = useState<MiddleConceptSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const studentId = student?.id ? String(student.id) : null
    const academyId = academy?.academyId ? String(academy.academyId) : null
    if (!studentId || !academyId) { setLoading(false); return }

    supabase
      .from('middle_student_concept')
      .select('type_code, type_name, major, career, custom_goal, keywords, status')
      .eq('student_id', studentId)
      .eq('academy_id', academyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.status === 'approved') {
          setConcept({
            typeCode: data.type_code,
            typeName: data.type_name,
            major: data.major,
            career: data.career,
            customGoal: data.custom_goal,
            keywords: data.keywords ?? [],
            status: data.status,
          })
        }
        setLoading(false)
      })
  }, [student?.id, academy?.academyId])

  return { concept, loading }
}