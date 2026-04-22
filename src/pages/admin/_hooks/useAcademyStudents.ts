import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase, type Profile } from '../../../lib/supabase'
import { academyState } from '../_store/auth'

/**
 * 현재 학원의 학생 목록을 학교급(고등/중등) 별로 조회
 */
export function useAcademyStudents(level: 'high' | 'middle') {
  const academy = useAtomValue(academyState)
  const academyId = academy.academyId
  const role = level === 'high' ? 'high_student' : 'middle_student'

  return useQuery({
    queryKey: ['academy-students', academyId, role],
    // academyId 없으면 (로그인 안 됐거나 기본값) 조회 안 함
    enabled: !!academyId && academyId !== 'A10901-dev',
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('academy_id', academyId!)
        .eq('role', role)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}