import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '../../../lib/supabase'
import { studentState } from '../_store/auth'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface ExpectQuestion {
  id: string
  student_id: string
  question: string
  teacher_edited_question: string | null
  source_subject: string | null
  source_text: string | null
  source_type: 'ai' | 'teacher_manual'
  category: string | null
  difficulty: number | null
  tag: string | null
  purpose: any
  grade: number | null
  question_status: 'draft' | 'published'
  question_published_at: string | null
  student_answer: string | null
  answer_status: string | null
  saenggibu_pdf_url: string | null
  major_dept: string | null
  created_at: string
}

export interface ExpectAnalysis {
  id: string
  question_id: string
  student_id: string
  round: number
  revised_answer: string | null
  teacher_feedback: string | null
  status: string | null
  published_at: string | null
  created_at: string
}

export interface ExpectFollowup {
  id: string
  question_id: string
  student_id: string
  ai_generated_question: string | null
  teacher_edited_question: string | null
  status: string | null
  published_at: string | null
  student_answer: string | null
  student_answered_at: string | null
  teacher_feedback: string | null
  created_at: string
}

export const gradeToNum = (grade: string | undefined | null): number | null => {
  if (!grade) return null
  if (grade === '고1' || grade === '1') return 1
  if (grade === '고2' || grade === '2') return 2
  if (grade === '고3' || grade === '3') return 3
  return null
}

// 폴링 주기 (ms) - 학생 화면 자동 새로고침용
const POLL_INTERVAL = 2000

// ─────────────────────────────────────────────
// 1. 학년별 받은 질문 조회 (published만)
// ─────────────────────────────────────────────

export function useMyQuestions(grade: number) {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined

  return useQuery({
    queryKey: ['my-expect-questions', studentId, grade],
    enabled: !!studentId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<ExpectQuestion[]> => {
      const { data, error } = await supabase
        .from('high_saenggibu_questions')
        .select('*')
        .eq('grade', grade)
        .eq('question_status', 'published')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as ExpectQuestion[]
    },
  })
}

// ─────────────────────────────────────────────
// 2. 특정 질문 analysis 조회
// ─────────────────────────────────────────────

export function useMyQuestionAnalyses(questionId: string | undefined) {
  return useQuery({
    queryKey: ['my-expect-analyses', questionId],
    enabled: !!questionId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<ExpectAnalysis[]> => {
      if (!questionId) return []
      const { data, error } = await supabase
        .from('high_saenggibu_questions_analysis')
        .select('*')
        .eq('question_id', questionId)
        .order('round', { ascending: true })
      if (error) throw error
      return (data ?? []) as ExpectAnalysis[]
    },
  })
}

// ─────────────────────────────────────────────
// 3. 꼬리질문 조회 (published만)
// ─────────────────────────────────────────────

export function useMyQuestionFollowups(questionId: string | undefined) {
  return useQuery({
    queryKey: ['my-expect-followups', questionId],
    enabled: !!questionId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<ExpectFollowup[]> => {
      if (!questionId) return []
      const { data, error } = await supabase
        .from('high_saenggibu_questions_followups')
        .select('*')
        .eq('question_id', questionId)
        .eq('status', 'published')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as ExpectFollowup[]
    },
  })
}

// ─────────────────────────────────────────────
// 4. PDF 업로드 (Supabase Storage)
// ─────────────────────────────────────────────

export function useUploadSaenggibuPdf() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined

  return useMutation({
    mutationFn: async ({ file, grade, majorDept }: {
      file: File
      grade: number
      majorDept: string
    }): Promise<{ path: string, majorDept: string }> => {
      if (!studentId) throw new Error('로그인이 필요해요')

      // 1. 기존 파일 있으면 삭제 (학년별 1개만 유지)
      const folderPath = studentId
      const { data: existingFiles } = await supabase.storage
        .from('saenggibu-pdfs')
        .list(folderPath, {
          search: `grade${grade}_`,
        })

      if (existingFiles && existingFiles.length > 0) {
        const pathsToRemove = existingFiles.map(f => `${folderPath}/${f.name}`)
        await supabase.storage.from('saenggibu-pdfs').remove(pathsToRemove)
      }

      // 2. 새 파일 업로드
      const timestamp = Date.now()
      const fileName = `grade${grade}_${timestamp}.pdf`
      const filePath = `${folderPath}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('saenggibu-pdfs')
        .upload(filePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) throw uploadError

      return { path: filePath, majorDept }
    },
  })
}

// ─────────────────────────────────────────────
// 5. 학년별 업로드된 PDF 조회 (학생 본인)
// ─────────────────────────────────────────────

export function useMyUploadedPdf(grade: number) {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined

  return useQuery({
    queryKey: ['my-saenggibu-pdf', studentId, grade],
    queryFn: async () => {
      if (!studentId) return null
      const { data: files, error } = await supabase.storage
        .from('saenggibu-pdfs')
        .list(studentId, {
          search: `grade${grade}_`,
          sortBy: { column: 'created_at', order: 'desc' },
        })
      if (error) throw error
      if (!files || files.length === 0) return null

      const file = files[0]
      const path = `${studentId}/${file.name}`
      return {
        path,
        name: file.name,
        size: file.metadata?.size ?? 0,
        created_at: file.created_at,
      }
    },
    enabled: !!studentId,
  })
}

// PDF 삭제
export function useDeleteMyPdf() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (path: string) => {
      const { error } = await supabase.storage
        .from('saenggibu-pdfs')
        .remove([path])
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-saenggibu-pdf', studentId] })
    },
  })
}

// ─────────────────────────────────────────────
// 6. 학생 첫 답변 작성 (question.student_answer + analysis round 1 생성)
// ─────────────────────────────────────────────

export function useSubmitFirstAnswer() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ questionId, answer }: {
      questionId: string
      answer: string
    }) => {
      if (!studentId) throw new Error('로그인이 필요해요')

      // 1. question 테이블의 student_answer 업데이트
      const { error: qErr } = await supabase
        .from('high_saenggibu_questions')
        .update({
          student_answer: answer,
          answer_status: 'submitted',
        })
        .eq('id', questionId)
      if (qErr) throw qErr

      // 2. analysis round 1 생성 or 업데이트 (업로드 시 revised_answer에도 저장)
      const { data: existing } = await supabase
        .from('high_saenggibu_questions_analysis')
        .select('id')
        .eq('question_id', questionId)
        .eq('round', 1)
        .maybeSingle()

      if (existing) {
        // 기존 round 1이 있으면 revised_answer만 업데이트
        const { error } = await supabase
          .from('high_saenggibu_questions_analysis')
          .update({ revised_answer: answer, status: 'pending' })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        // 새로 생성
        const { error } = await supabase
          .from('high_saenggibu_questions_analysis')
          .insert({
            question_id: questionId,
            student_id: studentId,
            round: 1,
            revised_answer: answer,
            status: 'pending',
          })
        if (error) throw error
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['my-expect-questions'] })
      qc.invalidateQueries({ queryKey: ['my-expect-analyses', v.questionId] })
    },
  })
}

// ─────────────────────────────────────────────
// 7. 학생 업그레이드 답변 (round 2)
// ─────────────────────────────────────────────

export function useSubmitUpgradedAnswer() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ questionId, answer }: {
      questionId: string
      answer: string
    }) => {
      if (!studentId) throw new Error('로그인이 필요해요')

      // round 2 row가 있는지 확인
      const { data: existing } = await supabase
        .from('high_saenggibu_questions_analysis')
        .select('id')
        .eq('question_id', questionId)
        .eq('round', 2)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('high_saenggibu_questions_analysis')
          .update({ revised_answer: answer, status: 'pending' })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('high_saenggibu_questions_analysis')
          .insert({
            question_id: questionId,
            student_id: studentId,
            round: 2,
            revised_answer: answer,
            status: 'pending',
          })
        if (error) throw error
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['my-expect-analyses', v.questionId] })
    },
  })
}

// ─────────────────────────────────────────────
// 8. 꼬리질문 답변
// ─────────────────────────────────────────────

export function useSubmitFollowupAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ followupId, answer }: {
      followupId: string
      answer: string
    }) => {
      const { error } = await supabase
        .from('high_saenggibu_questions_followups')
        .update({
          student_answer: answer,
          student_answered_at: new Date().toISOString(),
        })
        .eq('id', followupId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-expect-followups'] })
    },
  })
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

export function getStep(
  question: ExpectQuestion,
  analyses: ExpectAnalysis[]
): number {
  // 0: 미답변, 1: 답변완료, 2: 1차피드백, 3: 업그레이드, 4: 최종피드백, 5: 꼬리질문
  if (!question.student_answer) return 0
  const round1 = analyses.find(a => a.round === 1)
  if (!round1?.teacher_feedback) return 1
  const round2 = analyses.find(a => a.round === 2)
  if (!round2?.revised_answer) return 2
  if (!round2.teacher_feedback) return 3
  return 4
}