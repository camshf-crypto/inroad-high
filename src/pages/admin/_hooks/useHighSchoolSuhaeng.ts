// src/pages/high-student/_hooks/useHighSchoolSuhaeng.ts

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface School {
  id: string
  name: string
  region: string | null
  school_type: string
  neis_code?: string | null
}

export interface SchoolSuhaeng {
  id: string
  school_id: string
  grade: string
  semester: string
  year: number
  subject: string
  unit_topic: string | null
  achievement_standard: string | null
  core_concept: string | null
  task_title: string
  eval_type: string
  score: number | null
  eval_period: string | null
  scoring_factors: string | null
  grade_scale: string | null
  scoring_criteria_original: string | null
  scoring_criteria_ai: string | null
  display_type: string
  min_chars: number | null
  max_chars: number | null
  time_limit: number
  present_time_min: number | null
  present_time_max: number | null
  sections: any[] | null
  hints: any[] | null
  checklist: string[] | null
  keywords: string[] | null
  question_content?: string | null
  question_status?: string | null
  question_generated_at?: string | null
}

// 고등학교 목록 조회 (학교 선택용)
export function useHighSchools() {
  return useQuery({
    queryKey: ['high-schools'],
    queryFn: async (): Promise<School[]> => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('school_type', '고등학교')
        .order('name')
      if (error) throw error
      return (data ?? []) as School[]
    },
  })
}

// 특정 학교 1개 조회
export function useHighSchool(schoolId?: string | null) {
  return useQuery({
    queryKey: ['high-school', schoolId],
    queryFn: async (): Promise<School | null> => {
      if (!schoolId) return null
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .maybeSingle()
      if (error) throw error
      return data as School | null
    },
    enabled: !!schoolId,
  })
}

// 특정 학교의 고등 수행평가 조회 (school_suhaeng)
export function useHighSchoolSuhaeng(schoolId?: string | null, grade?: string, semester?: string) {
  return useQuery({
    queryKey: ['high-school-suhaeng', schoolId, grade, semester],
    queryFn: async (): Promise<SchoolSuhaeng[]> => {
      if (!schoolId) return []
      let q = supabase.from('school_suhaeng').select('*').eq('school_id', schoolId)
      if (grade) q = q.eq('grade', grade)
      if (semester) q = q.eq('semester', semester)
      const { data, error } = await q.order('subject').order('task_title')
      if (error) throw error
      return (data ?? []) as SchoolSuhaeng[]
    },
    enabled: !!schoolId,
  })
}

// 학생 프로필에서 학교 정보 조회
export function useHighStudentSchool(studentId?: string) {
  return useQuery({
    queryKey: ['high-student-school', studentId],
    queryFn: async () => {
      if (!studentId) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('school_id, school_name, school_change_count')
        .eq('id', studentId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!studentId,
  })
}

// 학생 학교 정보 업데이트 + 카운트 증가
export async function updateHighStudentSchool(studentId: string, schoolId: string, schoolName: string) {
  const { data: current } = await supabase
    .from('profiles')
    .select('school_change_count')
    .eq('id', studentId)
    .maybeSingle()

  const newCount = (current?.school_change_count || 0) + 1

  const { error } = await supabase
    .from('profiles')
    .update({
      school_id: schoolId,
      school_name: schoolName,
      school_change_count: newCount,
    })
    .eq('id', studentId)
  if (error) throw error
}

// NEIS 정보로 schools에 학교 찾기 또는 생성
export async function findOrCreateHighSchool(neisData: {
  SD_SCHUL_CODE: string
  SCHUL_NM: string
  SCHUL_KND_SC_NM: string
  LCTN_SC_NM: string
}): Promise<{ id: string; name: string }> {
  const { data: byCode, error: codeError } = await supabase
    .from('schools')
    .select('id, name')
    .eq('neis_code', neisData.SD_SCHUL_CODE)
    .maybeSingle()

  if (codeError) throw codeError
  if (byCode) return byCode

  const { data: byName, error: nameError } = await supabase
    .from('schools')
    .select('id, name, neis_code')
    .eq('name', neisData.SCHUL_NM)
    .maybeSingle()

  if (nameError) throw nameError

  if (byName) {
    if (!byName.neis_code) {
      await supabase
        .from('schools')
        .update({ neis_code: neisData.SD_SCHUL_CODE })
        .eq('id', byName.id)
    }
    return { id: byName.id, name: byName.name }
  }

  const { data: created, error: createError } = await supabase
    .from('schools')
    .insert({
      name: neisData.SCHUL_NM,
      region: neisData.LCTN_SC_NM,
      school_type: neisData.SCHUL_KND_SC_NM,
      neis_code: neisData.SD_SCHUL_CODE,
    })
    .select('id, name')
    .single()

  if (createError) throw createError
  return created
}