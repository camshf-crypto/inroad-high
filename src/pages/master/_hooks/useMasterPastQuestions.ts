import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PastQuestion, Grade } from '@/lib/types/questions'

/**
 * 기출문제 목록 조회 (학년별)
 * - 답변 공식과 조인해서 formula_name도 가져옴
 */
export function useMasterPastQuestions(grade: Grade) {
  return useQuery({
    queryKey: ['master-past-questions', grade],
    queryFn: async (): Promise<PastQuestion[]> => {
      // 1. 답변 공식 미리 가져오기 (조인 대신 매핑)
      const { data: formulas } = await supabase
        .from('answer_formulas')
        .select('id, name')

      const formulaMap = new Map((formulas ?? []).map(f => [f.id, f.name]))

      if (grade === 'high') {
        // 🎓 고등
        const { data, error } = await supabase
          .from('high_questions')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        return (data ?? []).map(row => ({
          id: row.id,
          grade: 'high' as Grade,
          university: row.university,
          major: row.department,
          admission_type: row.admission_type,
          question: row.question,
          formula_id: row.formula_id,
          formula_name: row.formula_id ? formulaMap.get(row.formula_id) ?? null : null,
          year: row.year,
          created_at: row.created_at,
        }))
      } else {
        // 📚 중등
        const { data, error } = await supabase
          .from('middle_questions')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        return (data ?? []).map(row => ({
          id: row.id,
          grade: 'middle' as Grade,
          university: row.school_name,
          school_type: row.school_type,
          question_type: row.question_type,
          answer_guide: row.answer_guide,
          difficulty: row.difficulty,
          question: row.question,
          formula_id: row.formula_id,
          formula_name: row.formula_id ? formulaMap.get(row.formula_id) ?? null : null,
          year: row.year,
          created_at: row.created_at,
        }))
      }
    },
  })
}