import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

export interface Simulation {
  id: string
  student_id: string
  question_type: string                // 'past' | 'expect' | 'ai'
  tail_question_enabled: boolean
  question_mode: string                // 'text' | 'voice' | 'both'
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

export interface SimulationQuestion {
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
// 1. 시뮬레이션 목록 조회
// ─────────────────────────────────────────────

export function useMySimulations() {
  return useQuery({
    queryKey: ['my-simulations'],
    queryFn: async (): Promise<Simulation[]> => {
      const { data, error } = await supabase
        .from('high_simulation')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Simulation[]
    },
    refetchInterval: 2000,  // 2초 폴링 (선생님 피드백 즉시 확인)
  })
}

// ─────────────────────────────────────────────
// 2. 특정 시뮬레이션 질문 조회
// ─────────────────────────────────────────────

export function useSimulationQuestions(simulationId: string | undefined) {
  return useQuery({
    queryKey: ['simulation-questions', simulationId],
    queryFn: async (): Promise<SimulationQuestion[]> => {
      if (!simulationId) return []
      const { data, error } = await supabase
        .from('high_simulation_questions')
        .select('*')
        .eq('simulation_id', simulationId)
        .order('order', { ascending: true })
      if (error) throw error
      return (data ?? []) as SimulationQuestion[]
    },
    enabled: !!simulationId,
  })
}

// ─────────────────────────────────────────────
// 3. 새 시뮬레이션 생성
// ─────────────────────────────────────────────

export function useCreateSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      questionType: string
      tailQuestionEnabled: boolean
      questionMode: string
      university?: string
      department?: string
      grade?: string
    }): Promise<Simulation> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인 필요')

      const { data, error } = await supabase
        .from('high_simulation')
        .insert({
          student_id: user.id,
          question_type: input.questionType,
          tail_question_enabled: input.tailQuestionEnabled,
          question_mode: input.questionMode,
          university: input.university || null,
          department: input.department || null,
          grade: input.grade || null,
        })
        .select()
        .single()

      if (error) throw error
      return data as Simulation
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-simulations'] })
    },
  })
}

// ─────────────────────────────────────────────
// 4. 질문 추가
// ─────────────────────────────────────────────

export function useAddSimulationQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      simulationId: string
      order: number
      questionText: string
      isTail?: boolean
      parentQuestionId?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인 필요')

      const { data, error } = await supabase
        .from('high_simulation_questions')
        .insert({
          simulation_id: input.simulationId,
          student_id: user.id,
          order: input.order,
          question_text: input.questionText,
          is_tail: input.isTail || false,
          parent_question_id: input.parentQuestionId || null,
        })
        .select()
        .single()

      if (error) throw error
      return data as SimulationQuestion
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['simulation-questions', v.simulationId] })
    },
  })
}

// ─────────────────────────────────────────────
// 5. 질문별 답변 저장 (녹음 + 트랜스크립트)
// ─────────────────────────────────────────────

export function useSubmitSimulationAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      questionId: string
      simulationId: string
      recordingUrl?: string
      transcript?: string
      durationSec?: number
    }) => {
      const { error } = await supabase
        .from('high_simulation_questions')
        .update({
          recording_url: input.recordingUrl || null,
          transcript: input.transcript || null,
          duration_sec: input.durationSec || null,
        })
        .eq('id', input.questionId)

      if (error) throw error
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['simulation-questions', v.simulationId] })
    },
  })
}

// ─────────────────────────────────────────────
// 6. 시뮬레이션 완료 (전체 녹음, 트랜스크립트, 시간)
// ─────────────────────────────────────────────

export function useCompleteSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      simulationId: string
      durationSec: number
      questionCount: number
      recordingUrl?: string
      transcript?: string
    }) => {
      const { error } = await supabase
        .from('high_simulation')
        .update({
          duration_sec: input.durationSec,
          question_count: input.questionCount,
          recording_url: input.recordingUrl || null,
          transcript: input.transcript || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.simulationId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-simulations'] })
    },
  })
}

// ─────────────────────────────────────────────
// 7. 시뮬레이션 삭제
// ─────────────────────────────────────────────

export function useDeleteSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (simulationId: string) => {
      // 1. Storage의 녹음 파일 먼저 삭제
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: files } = await supabase.storage
          .from('simulation-recordings')
          .list(`${user.id}/${simulationId}`)

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${user.id}/${simulationId}/${f.name}`)
          await supabase.storage
            .from('simulation-recordings')
            .remove(filePaths)
        }
      }

      // 2. DB 행 삭제 (cascade로 questions도 자동 삭제)
      const { error } = await supabase
        .from('high_simulation')
        .delete()
        .eq('id', simulationId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-simulations'] })
    },
  })
}

// ─────────────────────────────────────────────
// 8. 녹음 파일 업로드
// ─────────────────────────────────────────────

export async function uploadRecording(
  file: Blob,
  simulationId: string,
  fileName: string = `recording-${Date.now()}.webm`
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인 필요')

  const filePath = `${user.id}/${simulationId}/${fileName}`

  const { error } = await supabase.storage
    .from('simulation-recordings')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'audio/webm',
    })

  if (error) throw error

  // Public URL 받기 (RLS로 본인만 접근 가능)
  const { data } = supabase.storage
    .from('simulation-recordings')
    .getPublicUrl(filePath)

  return data.publicUrl
}

// ─────────────────────────────────────────────
// 9. 녹음 파일 다운로드 URL (Signed URL - 1시간 유효)
// ─────────────────────────────────────────────

export async function getRecordingUrl(filePath: string): Promise<string> {
  // filePath가 full URL이면 그대로 반환
  if (filePath.startsWith('http')) return filePath

  const { data, error } = await supabase.storage
    .from('simulation-recordings')
    .createSignedUrl(filePath, 3600) // 1시간 유효

  if (error) throw error
  return data.signedUrl
}

// ─────────────────────────────────────────────
// 10. 선생님 피드백 저장 (원장용 - 추후 사용)
// ─────────────────────────────────────────────

export function useUpdateTeacherFeedback() {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-simulations'] })
    },
  })
}

// ─────────────────────────────────────────────
// 헬퍼: 질문 유형 라벨
// ─────────────────────────────────────────────

export function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    past: '5개년 핵심 기출문제',
    expect: '생기부 예상문제',
    ai: 'AI 문제 생성',
  }
  return labels[type] || type
}

// 시간 포맷
export function formatSimDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}