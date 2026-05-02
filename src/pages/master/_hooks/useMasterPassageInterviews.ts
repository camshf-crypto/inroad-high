import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PassageInterview, PassageImage, Grade } from '@/lib/types/questions'

/**
 * 제시문면접 목록 조회 (학년별)
 */
export function useMasterPassageInterviews(grade: Grade) {
  return useQuery({
    queryKey: ['master-passage-interviews', grade],
    queryFn: async (): Promise<PassageInterview[]> => {
      const { data, error } = await supabase
        .from('passage_interviews')
        .select('*')
        .eq('grade', grade)
        .order('year', { ascending: false })
        .order('round', { ascending: false })
        .order('question_order', { ascending: true })

      if (error) throw error
      return (data ?? []) as PassageInterview[]
    },
  })
}

/**
 * 특정 제시문의 이미지 목록 조회 (상세 모달용)
 */
export function usePassageImages(passageId: number | null) {
  return useQuery({
    queryKey: ['passage-images', passageId],
    enabled: !!passageId,
    queryFn: async (): Promise<PassageImage[]> => {
      const { data, error } = await supabase
        .from('passage_images')
        .select('*')
        .eq('passage_id', passageId!)
        .order('image_order', { ascending: true })

      if (error) throw error
      return (data ?? []) as PassageImage[]
    },
  })
}