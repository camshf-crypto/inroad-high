import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  MajorQuestion,
  MajorDepartmentSummary,
  Grade,
} from '@/lib/types/questions'

/**
 * 전공질문 - 학과별 요약 (카드 화면용)
 *
 * 학과별로 그룹핑해서 총 문항 수를 계산
 */
export function useMasterMajorDepartments(grade: Grade) {
  return useQuery({
    queryKey: ['master-major-departments', grade],
    queryFn: async (): Promise<MajorDepartmentSummary[]> => {
      const { data, error } = await supabase
        .from('major_questions')
        .select('grade, school_year, department_code, department_name, master_code, total_days, created_at')
        .eq('grade', grade)
        .order('created_at', { ascending: false })

      if (error) throw error

      // master_code 기준으로 그룹핑
      const grouped = new Map<string, MajorDepartmentSummary>()

      for (const row of (data ?? [])) {
        const key = row.master_code
        if (!grouped.has(key)) {
          grouped.set(key, {
            grade: row.grade,
            school_year: row.school_year,
            department_code: row.department_code,
            department_name: row.department_name,
            master_code: row.master_code,
            total_days: row.total_days,
            question_count: 1,
            created_at: row.created_at,
          })
        } else {
          const existing = grouped.get(key)!
          existing.question_count += 1
        }
      }

      return Array.from(grouped.values())
    },
  })
}

/**
 * 특정 학과(master_code)의 모든 질문 조회 (상세 화면용)
 */
export function useMasterMajorQuestions(masterCode: string | null) {
  return useQuery({
    queryKey: ['master-major-questions', masterCode],
    enabled: !!masterCode,
    queryFn: async (): Promise<MajorQuestion[]> => {
      const { data, error } = await supabase
        .from('major_questions')
        .select('*')
        .eq('master_code', masterCode!)
        .order('day', { ascending: true })
        .order('seq', { ascending: true })

      if (error) throw error
      return (data ?? []) as MajorQuestion[]
    },
  })
}