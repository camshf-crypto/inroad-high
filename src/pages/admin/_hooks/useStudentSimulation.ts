import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface AdminSimulation {
  id: string
  student_id: string
  question_type: string
  tail_question_enabled: boolean
  question_mode: string
  university: string | null
  department: string | null
  grade: string | null
  duration_sec: number
  question_count: number
  recording_url: string | null
  transcript: string | null
  teacher_feedback: string | null
  created_at: string
  updated_at: string
}

export interface AdminSimulationQuestion {
  id: string
  simulation_id: string
  student_id: string
  order: number
  question_text: string
  is_tail: boolean
  parent_question_id: string | null
  recording_url: string | null
  transcript: string | null
  duration_sec: number | null
  created_at: string
}

// ─────────────────────────────────────────────
// 1. 학생의 시뮬레이션 목록
// ─────────────────────────────────────────────

export function useStudentSimulations(studentId: string | undefined) {
  return useQuery({
    queryKey: ['admin-simulations', studentId],
    queryFn: async (): Promise<AdminSimulation[]> => {
      if (!studentId) return []
      const { data, error } = await supabase
        .from('high_simulation')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as AdminSimulation[]
    },
    enabled: !!studentId,
    refetchInterval: 2000,  // 2초마다 자동 새로고침
  })
}

// ─────────────────────────────────────────────
// 2. 시뮬레이션 질문 조회
// ─────────────────────────────────────────────

export function useStudentSimulationQuestions(simulationId: string | undefined) {
  return useQuery({
    queryKey: ['admin-simulation-questions', simulationId],
    queryFn: async (): Promise<AdminSimulationQuestion[]> => {
      if (!simulationId) return []
      const { data, error } = await supabase
        .from('high_simulation_questions')
        .select('*')
        .eq('simulation_id', simulationId)
        .order('order', { ascending: true })
      if (error) throw error
      return (data ?? []) as AdminSimulationQuestion[]
    },
    enabled: !!simulationId,
    refetchInterval: 2000,  // 2초 폴링
  })
}

// ─────────────────────────────────────────────
// 3. 선생님 피드백 저장
// ─────────────────────────────────────────────

export function useUpdateSimulationFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      simulationId: string
      feedback: string
    }) => {
      const { error } = await supabase
        .from('high_simulation')
        .update({
          teacher_feedback: input.feedback,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.simulationId)

      if (error) throw error
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['admin-simulations'] })
    },
  })
}

// ─────────────────────────────────────────────
// 4. 시뮬레이션 삭제 (원장)
// ─────────────────────────────────────────────

export function useDeleteStudentSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { simulationId: string; studentId: string }) => {
      // Storage 파일 삭제
      const { data: files } = await supabase.storage
        .from('simulation-recordings')
        .list(`${input.studentId}/${input.simulationId}`)

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${input.studentId}/${input.simulationId}/${f.name}`)
        await supabase.storage
          .from('simulation-recordings')
          .remove(filePaths)
      }

      // DB 행 삭제
      const { error } = await supabase
        .from('high_simulation')
        .delete()
        .eq('id', input.simulationId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-simulations'] })
    },
  })
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

export function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    past: '5개년 핵심 기출문제',
    expect: '생기부 예상문제',
    ai: 'AI 문제 생성',
  }
  return labels[type] || type
}

export function formatSimDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}