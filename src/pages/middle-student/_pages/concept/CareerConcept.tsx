// src/pages/middle-student/_pages/concept/CareerConcept.tsx

import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'
import ConceptDiagnosis from './ConceptDiagnosis'
import ConceptWaiting from './ConceptWaiting'
import ConceptResult from './ConceptResult'

export type ConceptStatus = 'in_progress' | 'completed' | 'approved' | null

export interface ConceptData {
  id: string
  grade: string                              // 호환성을 위해 유지 (실제로는 사용 안 함)
  status: ConceptStatus
  type_code: string | null
  type_name: string | null
  scores: Record<string, number> | null
  answers: Record<string, string>
  current_question: number
  major: string | null
  career: string | null
  custom_goal: string | null
  keywords: string[]
}

export default function CareerConcept() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined
  // 중등은 학년 구분 없음. 그래도 grade 컬럼은 채워두기 위해 기본값 설정.
  const studentGrade = (student?.grade as string) ?? '중등'

  const [conceptData, setConceptData] = useState<ConceptData | null>(null)
  const [loading, setLoading] = useState(true)
  const [directSelect, setDirectSelect] = useState(false)

  useEffect(() => {
    if (!studentId || !academyId) return
    fetchConcept()
  }, [studentId, academyId])

  const fetchConcept = async () => {
    if (!studentId || !academyId) return
    setLoading(true)
    try {
      // 중등은 학생당 1개의 진단 결과만 가짐 (학년 구분 X)
      const { data, error } = await supabase
        .from('middle_student_concept')
        .select('*')
        .eq('student_id', studentId)
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') throw error  // PGRST116 = no rows
      setConceptData(data as ConceptData | null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-brand-middle rounded-full animate-spin mx-auto mb-2" />
          <div className="text-[12px] text-ink-muted">불러오는 중...</div>
        </div>
      </div>
    )
  }

  const status = conceptData?.status ?? null

  return (
    <div className="h-full px-6 py-5 overflow-hidden">
      {/* 콘텐츠 — 학년 사이드바 없이 풀폭 */}
      <div className="h-full bg-white border border-line rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        {status === 'approved' ? (
          <ConceptResult
            conceptData={conceptData!}
            onRefresh={fetchConcept}
          />
        ) : status === 'completed' ? (
          <ConceptWaiting conceptData={conceptData!} />
        ) : directSelect ? (
          <ConceptResult
            conceptData={{
              id: studentId!,
              grade: studentGrade,
              status: null,
              type_code: null,
              type_name: null,
              scores: null,
              answers: {},
              current_question: 0,
              major: null,
              career: null,
              custom_goal: null,
              keywords: [],
            }}
            onRefresh={() => { setDirectSelect(false); fetchConcept() }}
            isDirectMode
            studentId={studentId!}
            academyId={academyId!}
          />
        ) : (
          <ConceptDiagnosis
            conceptData={conceptData}
            studentId={studentId!}
            academyId={academyId!}
            grade={studentGrade}
            prevConcept={null}
            onComplete={fetchConcept}
            onDirectSelect={() => setDirectSelect(true)}
          />
        )}
      </div>
    </div>
  )
}