import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MiddleRoadmapProgress {
  mission_key: string
  is_completed: boolean
  completed_at: string | null
  teacher_memo: string | null
}

/**
 * 특정 학생의 middle_roadmap 완료/메모 데이터 전체 조회
 */
export function useMiddleRoadmapProgress(studentId: string | undefined) {
  return useQuery({
    queryKey: ['middle-roadmap-progress', studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<Map<string, MiddleRoadmapProgress>> => {
      const { data, error } = await supabase
        .from('middle_roadmap')
        .select('mission_key, is_completed, completed_at, teacher_memo')
        .eq('student_id', studentId!)
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
  })
}

/**
 * 미션 완료 체크 토글
 */
export function useToggleMiddleMissionComplete(studentId: string) {
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

      // 🔍 디버깅 로그
      const { data: userData, error: authError } = await supabase.auth.getUser()
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🔐 [TOGGLE] 현재 로그인 유저:', userData?.user)
      console.log('🆔 [TOGGLE] auth user.id:', userData?.user?.id)
      console.log('❌ [TOGGLE] auth error:', authError)
      console.log('🎯 [TOGGLE] studentId 타깃:', studentId)
      console.log('📤 [TOGGLE] 보낼 데이터:', {
        student_id: studentId,
        mission_key: missionKey,
        month,
        year,
        mission_title: missionTitle,
        is_completed: isCompleted,
      })

      // profiles에서 본인 정보 조회 (RLS가 정확히 본인 보는지 확인)
      const { data: myProfile, error: profErr } = await supabase
        .from('profiles')
        .select('id, role, academy_id')
        .eq('id', userData?.user?.id ?? '')
        .maybeSingle()
      console.log('👤 [TOGGLE] 내 profiles:', myProfile)
      console.log('❌ [TOGGLE] profiles 에러:', profErr)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      const { error } = await supabase
        .from('middle_roadmap')
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

      if (error) {
        console.log('💥 [TOGGLE] upsert 에러:', error)
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['middle-roadmap-progress', studentId] })
    },
  })
}

/**
 * 미션 선생님 메모 저장
 */
export function useUpdateMiddleMissionMemo(studentId: string) {
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
        .from('middle_roadmap')
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
      qc.invalidateQueries({ queryKey: ['middle-roadmap-progress', studentId] })
    },
  })
}