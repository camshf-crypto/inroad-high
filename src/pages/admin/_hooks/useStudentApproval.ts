// src/pages/admin/_hooks/useStudentApproval.ts
// 학생 승인 관리 Hook
//
// ⭐ pending_approvals 테이블 기반!
//   - 학생 신청 → pending_approvals.status = 'pending'
//   - 승인 → pending_approvals.status = 'approved' → 🪄 트리거가 자동으로 profiles 업데이트
//   - 거부 → pending_approvals.status = 'rejected'
//
// ⭐ 변경: RPC 함수(get_pending_students) 사용 - RLS 우회

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { academyState } from '@/lib/auth/atoms'

/**
 * 현재 학원의 승인 대기 학생 목록 (RPC 함수 호출)
 */
export function usePendingStudents() {
  const academy = useAtomValue(academyState)
  const academyId = academy.academyId

  return useQuery({
    queryKey: ['pending-students', academyId],
    enabled: !!academyId,
    queryFn: async (): Promise<any[]> => {
      // RPC 함수 호출 (RLS 우회)
      const { data, error } = await supabase.rpc('get_pending_students', {
        p_academy_id: academyId!,
      })

      if (error) {
        console.error('[usePendingStudents] error:', error)
        throw error
      }

      if (!data) return []

      // StudentApproval.tsx 호환 형식으로 매핑
      return data.map((row: any) => ({
        id: row.id,
        name: row.name || null,
        email: row.email || null,
        phone: row.phone || null,
        school: row.school || null,
        grade: row.grade,
        role: row.requested_role,
        status: 'pending',
        academy_id: row.academy_id,
        created_at: row.created_at || row.approval_created_at,
        updated_at: row.approval_created_at,
      }))
    },
    refetchInterval: 5000,
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
        .from('pending_approvals')
        .update({ status: 'approved' })
        .eq('user_id', studentId)
        .eq('status', 'pending')
        .eq('request_type', 'student')

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
 */
export function useRejectStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('pending_approvals')
        .update({
          status: 'rejected',
          rejection_reason: '선생님이 거절했습니다.',
        })
        .eq('user_id', studentId)
        .eq('status', 'pending')
        .eq('request_type', 'student')

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
        .from('pending_approvals')
        .update({ status: 'approved' })
        .eq('academy_id', academy.academyId)
        .eq('status', 'pending')
        .eq('request_type', 'student')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-students'] })
      queryClient.invalidateQueries({ queryKey: ['academy-students'] })
    },
  })
}