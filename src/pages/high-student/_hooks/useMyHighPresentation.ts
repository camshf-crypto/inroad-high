import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface PresentationSeed {
  id: string
  university: string
  category: string
  passage_title: string
  passage_pdf_url: string | null
  passage_text: string | null
  main_intent_question: string
  main_author_intent: string
  difficulty: string
  is_active: boolean
  created_at: string
}

export interface PresentationSeedQuestion {
  id: string
  seed_id: string
  order: number
  question: string
  author_intent: string
  tail_question: string | null
  tail_intent: string | null
  created_at: string
}

export interface PresentationExam {
  id: string
  student_id: string
  seed_id: string
  university: string
  category: string
  passage_title: string
  status: string                          // open / in_progress / submitted / analyzed
  
  // 원질문 의도파악
  main_intent_answer: string | null
  main_intent_recording_url: string | null
  main_intent_duration_sec: number | null
  main_intent_score: number | null
  main_intent_feedback: string | null
  main_intent_submitted_at: string | null
  
  opened_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface PresentationExamQuestion {
  id: string
  exam_id: string
  student_id: string
  seed_question_id: string | null
  order: number
  question: string
  author_intent: string
  
  // 1차
  first_answer: string | null
  first_recording_url: string | null
  first_duration_sec: number | null
  first_score: number | null
  first_feedback: string | null
  first_submitted_at: string | null
  
  // 2차
  second_answer: string | null
  second_recording_url: string | null
  second_duration_sec: number | null
  second_submitted_at: string | null
  
  // 최종
  final_feedback: string | null
  final_score: number | null
  final_at: string | null
  
  // 꼬리
  tail_question: string | null
  tail_answer: string | null
  tail_recording_url: string | null
  tail_duration_sec: number | null
  tail_feedback: string | null
  tail_submitted_at: string | null
  tail_feedback_at: string | null
  
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────
// 1. 제시문 시드 목록 (학교/계열로 필터)
// ─────────────────────────────────────────────

export function useAvailablePresentations(university?: string, category?: string) {
  return useQuery({
    queryKey: ['available-presentations', university, category],
    queryFn: async (): Promise<PresentationSeed[]> => {
      let query = supabase
        .from('high_passage_seed')
        .select('*')
        .eq('is_active', true)
      
      if (university) query = query.eq('university', university)
      if (category) query = query.eq('category', category)
      
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as PresentationSeed[]
    },
  })
}

// ─────────────────────────────────────────────
// 2. 시드 질문 조회
// ─────────────────────────────────────────────

export function useSeedQuestions(seedId: string | undefined) {
  return useQuery({
    queryKey: ['seed-questions', seedId],
    queryFn: async (): Promise<PresentationSeedQuestion[]> => {
      if (!seedId) return []
      const { data, error } = await supabase
        .from('high_passage_seed_questions')
        .select('*')
        .eq('seed_id', seedId)
        .order('order', { ascending: true })
      if (error) throw error
      return (data ?? []) as PresentationSeedQuestion[]
    },
    enabled: !!seedId,
  })
}

// ─────────────────────────────────────────────
// 3. 내 회차 목록
// ─────────────────────────────────────────────

export function useMyPresentationExams() {
  return useQuery({
    queryKey: ['my-presentation-exams'],
    queryFn: async (): Promise<PresentationExam[]> => {
      const { data, error } = await supabase
        .from('high_passage_exam')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as PresentationExam[]
    },
    refetchInterval: 2000, // 피드백 즉시 확인
  })
}

// ─────────────────────────────────────────────
// 4. 회차 질문 조회
// ─────────────────────────────────────────────

export function useExamQuestions(examId: string | undefined) {
  return useQuery({
    queryKey: ['presentation-exam-questions', examId],
    queryFn: async (): Promise<PresentationExamQuestion[]> => {
      if (!examId) return []
      const { data, error } = await supabase
        .from('high_passage_exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order', { ascending: true })
      if (error) throw error
      return (data ?? []) as PresentationExamQuestion[]
    },
    enabled: !!examId,
    refetchInterval: 2000,
  })
}

// ─────────────────────────────────────────────
// 5. 새 회차 생성 (학교+계열 선택 → 자동 매칭)
// ─────────────────────────────────────────────

export function useCreatePresentationExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { seedId: string }): Promise<PresentationExam> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인 필요')

      // 1. 시드 정보 가져오기
      const { data: seed, error: seedErr } = await supabase
        .from('high_passage_seed')
        .select('*')
        .eq('id', input.seedId)
        .single()
      if (seedErr) throw seedErr

      // 2. 시드 질문들 가져오기
      const { data: seedQs, error: seedQsErr } = await supabase
        .from('high_passage_seed_questions')
        .select('*')
        .eq('seed_id', input.seedId)
        .order('order', { ascending: true })
      if (seedQsErr) throw seedQsErr

      // 3. 회차 생성
      const { data: exam, error: examErr } = await supabase
        .from('high_passage_exam')
        .insert({
          student_id: user.id,
          seed_id: input.seedId,
          university: seed.university,
          category: seed.category,
          passage_title: seed.passage_title,
          status: 'in_progress',
          opened_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (examErr) throw examErr

      // 4. 질문 복사 생성
      if (seedQs && seedQs.length > 0) {
        const questionsToInsert = seedQs.map(q => ({
          exam_id: exam.id,
          student_id: user.id,
          seed_question_id: q.id,
          order: q.order,
          question: q.question,
          author_intent: q.author_intent,
          tail_question: q.tail_question,
        }))
        const { error: qInsertErr } = await supabase
          .from('high_passage_exam_questions')
          .insert(questionsToInsert)
        if (qInsertErr) throw qInsertErr
      }

      return exam as PresentationExam
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-presentation-exams'] })
    },
  })
}

// ─────────────────────────────────────────────
// 6. 원질문 의도파악 답변 제출
// ─────────────────────────────────────────────

export function useSubmitMainIntentAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      examId: string
      answer: string
      recordingUrl?: string
      durationSec?: number
    }) => {
      const { error } = await supabase
        .from('high_passage_exam')
        .update({
          main_intent_answer: input.answer,
          main_intent_recording_url: input.recordingUrl || null,
          main_intent_duration_sec: input.durationSec || null,
          main_intent_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.examId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-presentation-exams'] })
    },
  })
}

// ─────────────────────────────────────────────
// 7. 1차 답변 제출
// ─────────────────────────────────────────────

export function useSubmitFirstAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      questionId: string
      examId: string
      answer: string
      recordingUrl?: string
      durationSec?: number
    }) => {
      const { error } = await supabase
        .from('high_passage_exam_questions')
        .update({
          first_answer: input.answer,
          first_recording_url: input.recordingUrl || null,
          first_duration_sec: input.durationSec || null,
          first_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.questionId)
      if (error) throw error
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['presentation-exam-questions', v.examId] })
    },
  })
}

// ─────────────────────────────────────────────
// 8. 2차 답변 제출
// ─────────────────────────────────────────────

export function useSubmitSecondAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      questionId: string
      examId: string
      answer: string
      recordingUrl?: string
      durationSec?: number
    }) => {
      const { error } = await supabase
        .from('high_passage_exam_questions')
        .update({
          second_answer: input.answer,
          second_recording_url: input.recordingUrl || null,
          second_duration_sec: input.durationSec || null,
          second_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.questionId)
      if (error) throw error
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['presentation-exam-questions', v.examId] })
    },
  })
}

// ─────────────────────────────────────────────
// 9. 꼬리 답변 제출
// ─────────────────────────────────────────────

export function useSubmitTailAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      questionId: string
      examId: string
      answer: string
      recordingUrl?: string
      durationSec?: number
    }) => {
      const { error } = await supabase
        .from('high_passage_exam_questions')
        .update({
          tail_answer: input.answer,
          tail_recording_url: input.recordingUrl || null,
          tail_duration_sec: input.durationSec || null,
          tail_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.questionId)
      if (error) throw error
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['presentation-exam-questions', v.examId] })
    },
  })
}

// ─────────────────────────────────────────────
// 10. 회차 완료
// ─────────────────────────────────────────────

export function useCompletePresentationExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (examId: string) => {
      const { error } = await supabase
        .from('high_passage_exam')
        .update({
          status: 'submitted',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', examId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-presentation-exams'] })
    },
  })
}

// ─────────────────────────────────────────────
// 11. 회차 삭제
// ─────────────────────────────────────────────

export function useDeletePresentationExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (examId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: files } = await supabase.storage
          .from('passage-recordings')
          .list(`${user.id}/${examId}`)
        if (files && files.length > 0) {
          const paths = files.map(f => `${user.id}/${examId}/${f.name}`)
          await supabase.storage.from('passage-recordings').remove(paths)
        }
      }
      const { error } = await supabase
        .from('high_passage_exam')
        .delete()
        .eq('id', examId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-presentation-exams'] })
    },
  })
}

// ─────────────────────────────────────────────
// 12. 녹음 파일 업로드
// ─────────────────────────────────────────────

export async function uploadPresentationRecording(
  file: Blob,
  examId: string,
  fileName: string = `recording-${Date.now()}.webm`
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인 필요')

  const filePath = `${user.id}/${examId}/${fileName}`
  const { error } = await supabase.storage
    .from('passage-recordings')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'audio/webm',
    })
  if (error) throw error

  const { data } = supabase.storage
    .from('passage-recordings')
    .getPublicUrl(filePath)
  return data.publicUrl
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

export function getPresentationStatusLabel(status: string) {
  const labels: Record<string, { label: string; bg: string; color: string }> = {
    open: { label: '대기', bg: '#FEF3C7', color: '#92400E' },
    in_progress: { label: '진행 중', bg: '#DBEAFE', color: '#1E40AF' },
    submitted: { label: '제출 완료', bg: '#D1FAE5', color: '#065F46' },
    analyzed: { label: '분석 완료', bg: '#E9D5FF', color: '#6B21A8' },
  }
  return labels[status] || { label: status, bg: '#F3F4F6', color: '#374151' }
}

export const PRESENTATION_CATEGORIES = ['인문', '사회', '자연', '공학', '의학']