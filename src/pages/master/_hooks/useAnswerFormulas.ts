import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AnswerFormula } from '@/lib/types/questions'

/**
 * 인로드 답변 공식 67개 조회
 * - 변경이 거의 없는 마스터 데이터
 * - 캐시 시간 길게 (1시간)
 */
export function useAnswerFormulas() {
  return useQuery({
    queryKey: ['answer-formulas'],
    staleTime: 1000 * 60 * 60, // 1시간
    queryFn: async (): Promise<AnswerFormula[]> => {
      const { data, error } = await supabase
        .from('answer_formulas')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error
      return (data ?? []) as AnswerFormula[]
    },
  })
}