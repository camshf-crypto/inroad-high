// src/pages/middle-student/_hooks/useSchoolSuhaeng.ts

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
  
  // 기본
  grade: string
  semester: string
  year: number
  
  // 과목/주제
  subject: string
  unit_topic: string | null
  achievement_standard: string | null
  core_concept: string | null
  
  // 평가
  task_title: string
  eval_type: string
  score: number | null
  eval_period: string | null
  
  // 채점 (AI 피드백용)
  scoring_factors: string | null
  grade_scale: string | null
  scoring_criteria_original: string | null
  scoring_criteria_ai: string | null
  
  // UI 표시용
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
}

// 학교 목록 조회 (학교 선택용)
export function useSchools(schoolType?: '중학교' | '고등학교') {
  return useQuery({
    queryKey: ['schools', schoolType],
    queryFn: async (): Promise<School[]> => {
      let q = supabase.from('schools').select('*').order('name')
      if (schoolType) q = q.eq('school_type', schoolType)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as School[]
    },
  })
}

// 특정 학교 1개 조회
export function useSchool(schoolId?: string | null) {
  return useQuery({
    queryKey: ['school', schoolId],
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

// 특정 학교의 수행평가 조회
export function useSchoolSuhaeng(schoolId?: string | null, grade?: string, semester?: string) {
  return useQuery({
    queryKey: ['school-suhaeng', schoolId, grade, semester],
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
export function useStudentSchool(studentId?: string) {
  return useQuery({
    queryKey: ['student-school', studentId],
    queryFn: async () => {
      if (!studentId) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('school_id, school_name')
        .eq('id', studentId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!studentId,
  })
}

// 학생 학교 정보 업데이트
export async function updateStudentSchool(studentId: string, schoolId: string, schoolName: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ school_id: schoolId, school_name: schoolName })
    .eq('id', studentId)
  if (error) throw error
}

// ⭐ NEIS 정보로 schools에 학교 찾기 또는 생성
export async function findOrCreateSchool(neisData: {
  SD_SCHUL_CODE: string
  SCHUL_NM: string
  SCHUL_KND_SC_NM: string
  LCTN_SC_NM: string
}): Promise<{ id: string; name: string }> {
  // 1. neis_code로 기존 학교 찾기
  const { data: existing, error: findError } = await supabase
    .from('schools')
    .select('id, name')
    .eq('neis_code', neisData.SD_SCHUL_CODE)
    .maybeSingle()

  if (findError) throw findError
  if (existing) return existing

  // 2. 없으면 새로 생성
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