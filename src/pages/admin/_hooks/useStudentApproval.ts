// src/pages/admin/_hooks/useStudentApproval.ts
// 학생 승인 관리 Hook

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase, type Profile } from '@/lib/supabase'
import { academyState } from '@/lib/auth/atoms'

/**
 * 현재 학원의 승인 대기 학생 목록
 */
export function usePendingStudents() {
  const academy = useAtomValue(academyState)
  const academyId = academy.academyId

  return useQuery({
    queryKey: ['pending-students', academyId],
    enabled: !!academyId,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('academy_id', academyId!)
        .eq('status', 'pending')
        .in('role', ['high_student', 'middle_student'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Profile[]
    },
    refetchInterval: 5000, // 5초마다 자동 새로고침 (새 신청 보이게)
  })
}

/**
 * 학생 승인
 */
export function useApproveStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', studentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-students'] })
      queryClient.invalidateQueries({ queryKey: ['academy-students'] })
    },
  })
}

/**
 * 학생 거절
 * status를 rejected로 + academy_id를 null로
 */
export function useRejectStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'rejected',
          academy_id: null,
        })
        .eq('id', studentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-students'] })
    },
  })
}

/**
 * 일괄 승인
 */
export function useApproveAll() {
  const queryClient = useQueryClient()
  const academy = useAtomValue(academyState)

  return useMutation({
    mutationFn: async () => {
      if (!academy.academyId) throw new Error('학원 정보가 없습니다.')

      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('academy_id', academy.academyId)
        .eq('status', 'pending')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-students'] })
      queryClient.invalidateQueries({ queryKey: ['academy-students'] })
    },
  })
}