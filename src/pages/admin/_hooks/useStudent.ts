import { useQuery } from '@tanstack/react-query'
import { supabase, type Profile } from '@/lib/supabase'

/**
 * 단일 학생 조회 (profiles 테이블, role이 high_student 또는 middle_student)
 */
export function useStudent(studentId: string | undefined) {
  return useQuery({
    queryKey: ['student', studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId!)
        .in('role', ['high_student', 'middle_student'])
        .maybeSingle()

      if (error) throw error
      return (data as Profile) ?? null
    },
  })
}