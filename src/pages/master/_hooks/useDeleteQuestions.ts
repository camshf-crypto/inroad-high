import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Grade } from '@/lib/types/questions'

/**
 * 기출문제 삭제 (단일)
 */
export function useDeletePastQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, grade }: { id: string; grade: Grade }) => {
      const tableName = grade === 'high' ? 'high_questions' : 'middle_questions'
      const { error } = await supabase.from(tableName).delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['master-past-questions', variables.grade],
      })
    },
  })
}

/**
 * 기출문제 일괄 삭제 (여러 개)
 */
export function useDeleteMultiplePastQuestions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, grade }: { ids: string[]; grade: Grade }) => {
      const tableName = grade === 'high' ? 'high_questions' : 'middle_questions'
      const { error } = await supabase.from(tableName).delete().in('id', ids)
      if (error) throw error
      return ids
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['master-past-questions', variables.grade],
      })
    },
  })
}

/**
 * 기출문제 전체 삭제 (학년별)
 */
export function useDeleteAllPastQuestions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ grade }: { grade: Grade }) => {
      const tableName = grade === 'high' ? 'high_questions' : 'middle_questions'
      // 모든 행 삭제 (id가 not null인 모든 것)
      const { error } = await supabase
        .from(tableName)
        .delete()
        .not('id', 'is', null)
      if (error) throw error
      return grade
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['master-past-questions', variables.grade],
      })
    },
  })
}

/**
 * 기출문제 수정
 */
export function useUpdatePastQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      grade,
      data,
    }: {
      id: string
      grade: Grade
      data: {
        university?: string
        department?: string
        admission_type?: string | null
        question?: string
        formula_id?: number | null
        // 중등 전용
        school_name?: string
        school_type?: string | null
        question_type?: string | null
        answer_guide?: string | null
        difficulty?: number | null
      }
    }) => {
      const tableName = grade === 'high' ? 'high_questions' : 'middle_questions'

      // 컬럼 매핑 (UI의 university/major → DB의 실제 컬럼)
      let updateData: any = {}

      if (grade === 'high') {
        if (data.university !== undefined) updateData.university = data.university
        if (data.department !== undefined) updateData.department = data.department
        if (data.admission_type !== undefined) updateData.admission_type = data.admission_type
        if (data.question !== undefined) updateData.question = data.question
        if (data.formula_id !== undefined) updateData.formula_id = data.formula_id
      } else {
        // 중등: university 필드는 school_name으로 매핑
        if (data.university !== undefined) updateData.school_name = data.university
        if (data.school_name !== undefined) updateData.school_name = data.school_name
        if (data.school_type !== undefined) updateData.school_type = data.school_type
        if (data.question_type !== undefined) updateData.question_type = data.question_type
        if (data.question !== undefined) updateData.question = data.question
        if (data.formula_id !== undefined) updateData.formula_id = data.formula_id
        if (data.answer_guide !== undefined) updateData.answer_guide = data.answer_guide
        if (data.difficulty !== undefined) updateData.difficulty = data.difficulty
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['master-past-questions', variables.grade],
      })
    },
  })
}

// ============================================
// 전공질문 삭제 (학과 통째로)
// ============================================
export function useDeleteMajorDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (masterCode: string) => {
      const { error } = await supabase
        .from('major_questions')
        .delete()
        .eq('master_code', masterCode)
      if (error) throw error
      return masterCode
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-major-departments'] })
      queryClient.invalidateQueries({ queryKey: ['master-major-questions'] })
    },
  })
}

// ============================================
// 제시문면접 삭제
// ============================================
export function useDeletePassageInterview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data: images } = await supabase
        .from('passage_images')
        .select('image_url, file_name')
        .eq('passage_id', id)

      if (images && images.length > 0) {
        const filesToDelete = images
          .map(img => {
            const match = img.image_url.match(/passage-images\/(.+)$/)
            return match ? match[1] : null
          })
          .filter(Boolean) as string[]

        if (filesToDelete.length > 0) {
          await supabase.storage.from('passage-images').remove(filesToDelete)
        }
      }

      const { error } = await supabase.from('passage_interviews').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-passage-interviews'] })
    },
  })
}