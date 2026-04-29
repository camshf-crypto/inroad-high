import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RoadmapProgress {
  mission_key: string
  is_completed: boolean
  completed_at: string | null
  teacher_memo: string | null
}

/**
 * 특정 학생의 high_roadmap 완료/메모 데이터 전체 조회
 * (고1/고2/고3 모든 미션 통합)
 */
export function useHighRoadmapProgress(studentId: string | undefined) {
  return useQuery({
    queryKey: ['high-roadmap-progress', studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<Map<string, RoadmapProgress>> => {
      const { data, error } = await supabase
        .from('high_roadmap')
        .select('mission_key, is_completed, completed_at, teacher_memo')
        .eq('student_id', studentId!)
        .not('mission_key', 'is', null)

      if (error) throw error

      // Map<mission_key, progress> 로 변환 (조회 편의를 위해)
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

/**
 * 미션 완료 체크 토글
 * 있으면 update, 없으면 insert (upsert)
 */
export function useToggleMissionComplete(studentId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      missionKey: string
      month: number
      year: number
      missionTitle: string
      isCompleted: boolean
    }) => {
      const { missionKey, month, year, missionTitle, isCompleted } = params

      const { error } = await supabase
        .from('high_roadmap')
        .upsert(
          {
            student_id: studentId,
            mission_key: missionKey,
            month,
            year,
            mission_title: missionTitle,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
          },
          { onConflict: 'student_id,mission_key' },
        )

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['high-roadmap-progress', studentId] })
    },
  })
}

/**
 * 미션 선생님 메모 저장
 */
export function useUpdateMissionMemo(studentId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      missionKey: string
      month: number
      year: number
      missionTitle: string
      memo: string
    }) => {
      const { missionKey, month, year, missionTitle, memo } = params

      const { error } = await supabase
        .from('high_roadmap')
        .upsert(
          {
            student_id: studentId,
            mission_key: missionKey,
            month,
            year,
            mission_title: missionTitle,
            teacher_memo: memo,
          },
          { onConflict: 'student_id,mission_key' },
        )

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['high-roadmap-progress', studentId] })
    },
  })
}