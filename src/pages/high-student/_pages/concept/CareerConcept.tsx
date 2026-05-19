// src/pages/high-student/_pages/concept/CareerConcept.tsx

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
  grade: string
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

const GRADES = ['고1', '고2', '고3'] as const
type Grade = typeof GRADES[number]

const GRADE_DESC: Record<Grade, string> = {
  '고1': '계열 탐색',
  '고2': '학과 좁히기',
  '고3': '세부 목표 확정',
}

export default function CareerConcept() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined
  const studentGrade = (student?.grade as Grade) ?? '고1'

  const [activeGrade, setActiveGrade] = useState<Grade>(studentGrade)
  const [conceptMap, setConceptMap] = useState<Record<string, ConceptData | null>>({})
  const [loading, setLoading] = useState(true)
  const [directSelect, setDirectSelect] = useState(false)

  useEffect(() => {
    if (!studentId || !academyId) return
    fetchAllConcepts()
  }, [studentId, academyId])

  const fetchAllConcepts = async () => {
    if (!studentId || !academyId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('student_concept')
        .select('*')
        .eq('student_id', studentId)
        .eq('academy_id', academyId)
      if (error) throw error

      const map: Record<string, ConceptData | null> = { '고1': null, '고2': null, '고3': null }
      for (const row of (data ?? [])) {
        map[row.grade] = row as ConceptData
      }
      setConceptMap(map)
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
          <div className="w-8 h-8 border-2 border-gray-200 border-t-brand-high rounded-full animate-spin mx-auto mb-2" />
          <div className="text-[12px] text-ink-muted">불러오는 중...</div>
        </div>
      </div>
    )
  }

  const conceptData = conceptMap[activeGrade]
  const status = conceptData?.status ?? null

  // 이전 학년 컨셉 (비슷한 계열 추천용)
  const prevGrade = activeGrade === '고2' ? '고1' : activeGrade === '고3' ? '고2' : null
  const prevConcept = prevGrade ? conceptMap[prevGrade] : null

  // 상태별 뱃지
  const getStatusBadge = (data: ConceptData | null) => {
    if (data?.status === 'approved' && data?.major) {
      return <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">완료</span>
    } else if (data?.status === 'completed') {
      return <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">대기</span>
    } else if (data?.status === 'in_progress') {
      return <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">진행중</span>
    } else {
      return <span className="text-[9px] font-medium text-ink-muted">미설정</span>
    }
  }

  return (
    <div className="h-full flex gap-4 px-6 py-5 overflow-hidden">

      {/* 왼쪽: 학년 사이드바 */}
      <div className="w-[220px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <div className="px-4 py-3 border-b border-line-light flex-shrink-0">
          <div className="text-[13px] font-bold text-ink">학년별 진로 컨셉</div>
        </div>

        {/* 학년 카드 영역 */}
        <div className="p-2 flex-shrink-0">
          {GRADES.map(g => {
            const data = conceptMap[g]
            const isActive = activeGrade === g
            const isMyGrade = g === studentGrade
            const isDone = data?.status === 'approved' && data?.major
            return (
              <button
                key={g}
                onClick={() => setActiveGrade(g)}
                className={`w-full relative border rounded-xl px-3 py-2.5 mb-1.5 cursor-pointer transition-all text-left ${
                  isActive
                    ? 'border-brand-high bg-brand-high-pale shadow-[0_2px_8px_rgba(37,99,235,0.1)]'
                    : 'border-line bg-white hover:border-brand-high-light hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[13px] font-bold ${isActive ? 'text-brand-high-dark' : 'text-ink'}`}>{g}</span>
                  {isMyGrade && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-brand-high text-white">현재</span>
                  )}
                  {isDone && <span className="text-[10px]">✓</span>}
                </div>
                <div className={`text-[10.5px] font-medium mb-1.5 ${isActive ? 'text-brand-high' : 'text-ink-muted'}`}>
                  {GRADE_DESC[g]}
                </div>
                {getStatusBadge(data)}
              </button>
            )
          })}
        </div>

        {/* 이전 학년 컨셉 박스 - 사이드바 맨 아래 고정 */}
        <div className="mt-auto p-2 flex-shrink-0">
          {prevConcept?.status === 'approved' && prevConcept?.major ? (
            <div className="px-3 py-2.5 bg-gray-50 border border-line rounded-xl">
              <div className="text-[10px] font-bold text-ink-muted mb-1.5">📌 {prevGrade} 컨셉 참고</div>
              <div className="text-[11px] font-semibold text-ink mb-0.5">{prevConcept.major}</div>
              <div className="text-[11px] font-bold text-brand-high-dark">{prevConcept.career || prevConcept.custom_goal}</div>
            </div>
          ) : activeGrade === '고1' ? (
            <div className="px-3 py-2.5 bg-gray-50/50 border border-dashed border-line rounded-xl">
              <div className="text-[10.5px] text-ink-muted leading-relaxed">
                🌱 첫 학년 진로 컨셉을<br />설정해보세요
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* 오른쪽: 콘텐츠 */}
      <div className="flex-1 bg-white border border-line rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        {status === 'approved' ? (
          <ConceptResult
            conceptData={conceptData!}
            onRefresh={fetchAllConcepts}
            prevConcept={prevConcept}
          />
        ) : status === 'completed' ? (
          <ConceptWaiting conceptData={conceptData!} />
        ) : directSelect ? (
          <ConceptResult
            conceptData={{ id: studentId!, grade: activeGrade, status: null, type_code: null, type_name: null, scores: null, answers: {}, current_question: 0, major: null, career: null, custom_goal: null, keywords: [] }}
            onRefresh={() => { setDirectSelect(false); fetchAllConcepts() }}
            prevConcept={prevConcept}
            isDirectMode
            studentId={studentId!}
            academyId={academyId!}
          />
        ) : (
          <ConceptDiagnosis
            conceptData={conceptData}
            studentId={studentId!}
            academyId={academyId!}
            grade={activeGrade}
            prevConcept={prevConcept}
            onComplete={fetchAllConcepts}
            onDirectSelect={() => setDirectSelect(true)}
          />
        )}
      </div>
    </div>
  )
}