// src/pages/high-student/_hooks/useConceptData.ts

import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'

export interface ConceptSummary {
  typeCode: string | null
  typeName: string | null
  major: string | null
  career: string | null
  customGoal: string | null
  keywords: string[]
  status: string | null
}

export function useConceptData() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const [concept, setConcept] = useState<ConceptSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const studentId = student?.id ? String(student.id) : null
    const academyId = academy?.academyId ? String(academy.academyId) : null
    if (!studentId || !academyId) { setLoading(false); return }

    supabase
      .from('student_concept')
      .select('type_code, type_name, major, career, custom_goal, keywords, status')
      .eq('student_id', studentId)
      .eq('academy_id', academyId)
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