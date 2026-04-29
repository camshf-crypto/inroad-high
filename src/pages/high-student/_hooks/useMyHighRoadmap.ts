import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'

export interface RoadmapProgress {
  mission_key: string
  is_completed: boolean
  completed_at: string | null
  teacher_memo: string | null
}

/**
 * 학생 본인의 high_roadmap 완료/메모 데이터 조회 (읽기 전용)
 * 학생은 RLS에 의해 자기 자신의 레코드만 조회 가능
 */
export function useMyHighRoadmapProgress() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined

  return useQuery({
    queryKey: ['my-high-roadmap-progress', studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<Map<string, RoadmapProgress>> => {
      const { data, error } = await supabase
        .from('high_roadmap')
        .select('mission_key, is_completed, completed_at, teacher_memo')
        .eq('student_id', studentId!)
        .not('mission_key', 'is', null)

      if (error) throw error

      const map = new Map<string, RoadmapProgress>()
      for (const row of data ?? []) {
        if (row.mission_key) {
          map.set(row.mission_key, row as RoadmapProgress)
        }
      }
      return map
    },
  })
}