import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MiddleRoadmapProgress {
  mission_key: string
  is_completed: boolean
  completed_at: string | null
  teacher_memo: string | null
}

/**
 * 내 middle_roadmap 진행 상황 조회 (학생용 - 읽기 전용)
 *
 * RLS 정책에 의해 본인 데이터만 조회됨.
 * 원장님이 체크/메모를 남기면 여기에 반영됨.
 */
export function useMyMiddleRoadmapProgress() {
  return useQuery({
    queryKey: ['my-middle-roadmap-progress'],
    queryFn: async (): Promise<Map<string, MiddleRoadmapProgress>> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return new Map()

      const { data, error } = await supabase
        .from('middle_roadmap')
        .select('mission_key, is_completed, completed_at, teacher_memo')
        .eq('student_id', user.id)
        .not('mission_key', 'is', null)

      if (error) throw error

      const map = new Map<string, MiddleRoadmapProgress>()
      for (const row of data ?? []) {
        if (row.mission_key) {
          map.set(row.mission_key, row as MiddleRoadmapProgress)
        }
      }
      return map
    },
    refetchInterval: 3000, // 3초마다 폴링 (원장님이 체크하면 즉시 반영)
  })
}