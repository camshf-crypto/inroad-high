// src/pages/admin/_hooks/useTeachers.ts
// 학원 선생님 관리 Hook

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase, type Profile } from '@/lib/supabase'
import { academyState } from '@/lib/auth/atoms'

/**
 * 현재 학원의 선생님 목록 조회
 * (role이 'teacher' 또는 'admin' 인 사람들)
 */
export function useAcademyTeachers() {
  const academy = useAtomValue(academyState)
  const academyId = academy.academyId

  return useQuery({
    queryKey: ['academy-teachers', academyId],
    enabled: !!academyId,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('academy_id', academyId!)
        .in('role', ['teacher', 'admin'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}

/**
 * 선생님 추가
 * 원장이 이메일+비밀번호 입력하면 바로 계정 생성
 *
 * ⚠️ 주의: 이 방식은 클라이언트에서 직접 supabase.auth.signUp을 호출하므로
 *   - 현재 로그인된 원장의 세션이 새 계정으로 바뀜
 *   - 임시로 다른 클라이언트 인스턴스를 만들어서 처리
 */
export function useAddTeacher() {
  const queryClient = useQueryClient()
  const academy = useAtomValue(academyState)

  return useMutation({
    mutationFn: async (input: {
      name: string
      email: string
      password: string
      phone?: string
    }) => {
      if (!academy.academyId) throw new Error('학원 정보가 없습니다.')

      // 임시 supabase 클라이언트 (원장 세션을 보호)
      const { createClient } = await import('@supabase/supabase-js')
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      )

      // 1. Auth 가입 (임시 클라이언트로)
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: input.email,
        password: input.password,
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('이미 가입된 이메일이에요.')
        }
        throw authError
      }

      if (!authData.user) {
        throw new Error('계정을 만들 수 없어요.')
      }

      // 2. profiles 테이블에 정보 저장 (원장 권한으로)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: input.email,
          name: input.name,
          phone: input.phone || null,
          role: 'teacher',
          academy_id: academy.academyId,
          status: 'active',
        })

      if (profileError) {
        throw new Error('프로필 저장 실패: ' + profileError.message)
      }

      return authData.user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-teachers'] })
    },
  })
}

/**
 * 선생님 삭제
 * profiles에서 academy_id를 null로 (실제 auth 계정 삭제는 안 함)
 */
export function useRemoveTeacher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (teacherId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          academy_id: null,
          status: 'rejected',
        })
        .eq('id', teacherId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-teachers'] })
    },
  })
}

/**
 * 선생님 정보 수정 (이름, 전화번호)
 */
export function useUpdateTeacher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      phone?: string
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.phone !== undefined && { phone: input.phone }),
        })
        .eq('id', input.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-teachers'] })
    },
  })
}