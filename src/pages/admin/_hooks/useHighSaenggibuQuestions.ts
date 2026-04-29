import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ⭐ AI 호출 제한
export const SAENGGIBU_AI_CALL_LIMITS = {
  ROUND_1: 3,  // 1차 답변 분석 최대 3회
  ROUND_2: 2,  // 2차 답변 분석 최대 2회
}

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface ExpectQuestion {
  id: string
  student_id: string
  saenggibu_id: string | null
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
  ai_analysis: any
  ai_call_count: number  // ⭐ 추가
  status: string | null
  published_at: string | null
  created_at: string
}

export interface ExpectFollowup {
  id: string
  question_id: string
  analysis_id: string | null
  student_id: string
  ai_generated_question: string | null
  teacher_edited_question: string | null
  status: string | null
  published_at: string | null
  student_answer: string | null
  student_answered_at: string | null
  ai_feedback: any
  teacher_feedback: string | null
  created_at: string
}

export interface AIAnalysisResult {
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
  authenticity_concerns: string[]
  summary: string
}

export const gradeToNum = (grade: string | undefined | null): number | null => {
  if (!grade) return null
  if (grade === '고1' || grade === '1') return 1
  if (grade === '고2' || grade === '2') return 2
  if (grade === '고3' || grade === '3') return 3
  return null
}

// ─────────────────────────────────────────────
// 1. 학생 PDF 조회
// ─────────────────────────────────────────────

export function useStudentSaenggibuPdf(studentId: string, grade: number) {
  return useQuery({
    queryKey: ['admin-saenggibu-pdf', studentId, grade],
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data: uploadData } = await supabase
        .from('saenggibu_uploads')
        .select('*')
        .eq('student_id', studentId)
        .eq('grade', grade)
        .maybeSingle()

      const { data: files, error: storageErr } = await supabase.storage
        .from('saenggibu-pdfs')
        .list(studentId, {
          search: `grade${grade}_`,
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (storageErr) console.error('storage list error:', storageErr)

      const latestFile = files && files.length > 0 ? files[0] : null
      if (!latestFile) return null

      return {
        saenggibu_pdf_url: uploadData?.pdf_path || `${studentId}/${latestFile.name}`,
        major_dept: uploadData?.major_dept ?? null,
        file_name: latestFile.name,
        file_size: latestFile.metadata?.size ?? 0,
        uploaded_at: latestFile.created_at,
      }
    },
    enabled: !!studentId,
  })
}

export async function getSaenggibuPdfSignedUrl(pdfPath: string): Promise<string | null> {
  if (!pdfPath) return null
  const { data, error } = await supabase.storage
    .from('saenggibu-pdfs')
    .createSignedUrl(pdfPath, 3600)
  if (error) {
    console.error('signed url error:', error)
    return null
  }
  return data?.signedUrl ?? null
}

export function useDeleteStudentPdf() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, path, grade }: {
      studentId: string
      path: string
      grade: number
    }) => {
      const { error: storageError } = await supabase.storage
        .from('saenggibu-pdfs')
        .remove([path])
      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('saenggibu_uploads')
        .delete()
        .eq('student_id', studentId)
        .eq('grade', grade)
      if (dbError) throw dbError

      return { studentId, grade }
    },
    onSuccess: ({ studentId, grade }) => {
      qc.invalidateQueries({ queryKey: ['admin-saenggibu-pdf', studentId, grade] })
    },
  })
}

// ─────────────────────────────────────────────
// 2. 학년별 질문 조회
// ─────────────────────────────────────────────

export function useStudentQuestions(studentId: string, grade: number) {
  return useQuery({
    queryKey: ['admin-expect-questions', studentId, grade],
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<ExpectQuestion[]> => {
      const { data, error } = await supabase
        .from('high_saenggibu_questions')
        .select('*')
        .eq('student_id', studentId)
        .eq('grade', grade)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as ExpectQuestion[]
    },
    enabled: !!studentId,
  })
}

// ─────────────────────────────────────────────
// 3. analysis 조회
// ─────────────────────────────────────────────

export function useQuestionAnalyses(questionId: string | undefined) {
  return useQuery({
    queryKey: ['admin-expect-analyses', questionId],
    refetchInterval: 3000,
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
    enabled: !!questionId,
  })
}

// ─────────────────────────────────────────────
// 4. followups 조회
// ─────────────────────────────────────────────

export function useQuestionFollowups(questionId: string | undefined) {
  return useQuery({
    queryKey: ['admin-expect-followups', questionId],
    queryFn: async (): Promise<ExpectFollowup[]> => {
      if (!questionId) return []
      const { data, error } = await supabase
        .from('high_saenggibu_questions_followups')
        .select('*')
        .eq('question_id', questionId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as ExpectFollowup[]
    },
    enabled: !!questionId,
  })
}

// ─────────────────────────────────────────────
// 5. AI 예상질문 생성
// ─────────────────────────────────────────────

export function useGenerateAIQuestions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      studentId, grade, saenggibu_pdf_url, major_dept
    }: {
      studentId: string
      grade: number
      saenggibu_pdf_url?: string | null
      major_dept?: string | null
    }): Promise<ExpectQuestion[]> => {

      if (!saenggibu_pdf_url) {
        throw new Error('생기부 PDF가 없어요. 학생이 먼저 업로드해야 합니다.')
      }
      if (!major_dept) {
        throw new Error('지원학과 정보가 없어요. 학생이 업로드 시 학과를 선택해야 합니다.')
      }

      const { data: ocrData, error: ocrError } = await supabase.functions.invoke(
        'ocr-document',
        { body: { pdfPath: saenggibu_pdf_url } }
      )

      if (ocrError) throw new Error('OCR 호출 실패: ' + ocrError.message)
      if (!ocrData?.success || !ocrData?.text) {
        throw new Error('OCR 결과가 비어있어요: ' + JSON.stringify(ocrData).substring(0, 200))
      }

      const saenggibuText = ocrData.text as string

      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        'ai-generate-questions',
        {
          body: {
            saenggibuText,
            majorDept: major_dept,
          },
        }
      )

      if (aiError) throw new Error('AI 호출 실패: ' + aiError.message)
      if (!aiData?.success || !Array.isArray(aiData?.questions)) {
        throw new Error('AI 응답이 잘못됐어요: ' + JSON.stringify(aiData).substring(0, 200))
      }

      const generatedQuestions = aiData.questions as Array<{
        source_subject: string
        source_text: string
        question: string
        purpose: string[]
        tag: string
        difficulty: number
      }>

      if (generatedQuestions.length === 0) {
        throw new Error('생성된 질문이 없어요. 학과와 관련된 활동이 없을 수도 있어요.')
      }

      const inserts = generatedQuestions.map(q => ({
        student_id: studentId,
        grade,
        question: q.question,
        source_subject: q.source_subject || null,
        source_text: q.source_text || null,
        tag: q.tag || null,
        purpose: q.purpose || [],
        difficulty: q.difficulty || null,
        source_type: 'ai' as const,
        saenggibu_pdf_url: saenggibu_pdf_url ?? null,
        major_dept: major_dept ?? null,
        question_status: 'draft' as const,
      }))

      const { data: inserted, error: insertError } = await supabase
        .from('high_saenggibu_questions')
        .insert(inserts)
        .select()

      if (insertError) throw insertError

      return inserted as ExpectQuestion[]
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ 
        queryKey: ['admin-expect-questions', variables.studentId, variables.grade] 
      })
    },
  })
}

// ─────────────────────────────────────────────
// ⭐ 호출 횟수 가져오기 헬퍼
// ─────────────────────────────────────────────

async function getSaenggibuAICallCount(questionId: string, round: number): Promise<number> {
  const { data } = await supabase
    .from('high_saenggibu_questions_analysis')
    .select('ai_call_count')
    .eq('question_id', questionId)
    .eq('round', round)
    .maybeSingle()
  return data?.ai_call_count || 0
}

// ─────────────────────────────────────────────
// 6. ⭐ AI 답변 분석 (round 1/2 분기 + 호출수 제한)
// ─────────────────────────────────────────────

export function useGenerateAIAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      questionId, studentId, round, question, studentAnswer, majorDept, sourceText,
      firstAnswer, firstFeedback,
    }: {
      questionId: string
      studentId: string
      round: number
      question: string
      studentAnswer: string
      majorDept?: string | null
      sourceText?: string | null
      firstAnswer?: string | null
      firstFeedback?: string | null
    }): Promise<AIAnalysisResult> => {

      // ⭐ 호출수 체크
      const limit = round === 1 ? SAENGGIBU_AI_CALL_LIMITS.ROUND_1 : SAENGGIBU_AI_CALL_LIMITS.ROUND_2
      const currentCount = await getSaenggibuAICallCount(questionId, round)
      if (currentCount >= limit) {
        throw new Error(`${round}차 답변 AI 분석은 최대 ${limit}회까지만 가능합니다. (현재 ${currentCount}회 사용)`)
      }

      const body: any = {
        question,
        studentAnswer,
        majorDept,
        sourceText,
        round,
      }

      if (round === 2) {
        body.firstAnswer = firstAnswer
        body.firstFeedback = firstFeedback
      }

      const { data, error } = await supabase.functions.invoke('ai-analyze-answer', { body })

      if (error) throw new Error('AI 분석 실패: ' + error.message)
      if (!data?.success || !data?.analysis) {
        throw new Error('AI 분석 결과가 없어요: ' + JSON.stringify(data).substring(0, 200))
      }

      const analysis = data.analysis as AIAnalysisResult

      // ⭐ DB 저장 + 카운트 +1
      const { data: existing } = await supabase
        .from('high_saenggibu_questions_analysis')
        .select('id, ai_call_count')
        .eq('question_id', questionId)
        .eq('round', round)
        .maybeSingle()

      if (existing) {
        const { error: updateErr } = await supabase
          .from('high_saenggibu_questions_analysis')
          .update({ 
            ai_analysis: analysis,
            ai_call_count: (existing.ai_call_count || 0) + 1,
          })
          .eq('id', existing.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('high_saenggibu_questions_analysis')
          .insert({
            question_id: questionId,
            student_id: studentId,
            round,
            ai_analysis: analysis,
            ai_call_count: 1,
            status: 'pending',
          })
        if (insertErr) throw insertErr
      }

      return analysis
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-expect-analyses', variables.questionId] })
    },
  })
}

// ─────────────────────────────────────────────
// 7. AI 분석 → 선생님 말투 피드백 (제한 없음)
// ─────────────────────────────────────────────

export function useGenerateAIFeedback() {
  return useMutation({
    mutationFn: async ({
      question, studentAnswer, analysis, majorDept, round,
      firstAnswer, firstFeedback,
    }: {
      question: string
      studentAnswer: string
      analysis: AIAnalysisResult
      majorDept?: string | null
      round: number
      firstAnswer?: string | null
      firstFeedback?: string | null
    }): Promise<string> => {

      const body: any = {
        question,
        studentAnswer,
        analysis,
        majorDept,
        round,
      }

      if (round === 2) {
        body.firstAnswer = firstAnswer
        body.firstFeedback = firstFeedback
      }

      const { data, error } = await supabase.functions.invoke('ai-suggest-feedback', { body })

      if (error) throw new Error('AI 피드백 생성 실패: ' + error.message)
      if (!data?.success || !data?.feedback) {
        throw new Error('AI 피드백 결과가 없어요')
      }

      return data.feedback as string
    },
  })
}

// ─────────────────────────────────────────────
// 8. 원장 직접 질문 추가
// ─────────────────────────────────────────────

export function useAddManualQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      student_id: string
      grade: number
      question: string
      tag: string
      purpose: string[]
      major_dept?: string | null
      publish_now?: boolean
    }): Promise<ExpectQuestion> => {
      const { data, error } = await supabase
        .from('high_saenggibu_questions')
        .insert({
          student_id: input.student_id,
          grade: input.grade,
          question: input.question,
          tag: input.tag,
          purpose: input.purpose,
          source_type: 'teacher_manual',
          major_dept: input.major_dept ?? null,
          question_status: input.publish_now ? 'published' : 'draft',
          question_published_at: input.publish_now ? new Date().toISOString() : null,
        })
        .select()
        .single()
      if (error) throw error
      return data as ExpectQuestion
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-expect-questions', variables.student_id, variables.grade] })
    },
  })
}

// ─────────────────────────────────────────────
// 9. 게시 토글
// ─────────────────────────────────────────────

export function useToggleQuestionPublish() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, publish }: { id: string, publish: boolean }) => {
      const { error } = await supabase
        .from('high_saenggibu_questions')
        .update({
          question_status: publish ? 'published' : 'draft',
          question_published_at: publish ? new Date().toISOString() : null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-expect-questions'] })
    },
  })
}

export function usePublishAllQuestions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, grade }: { studentId: string, grade: number }) => {
      const { error } = await supabase
        .from('high_saenggibu_questions')
        .update({
          question_status: 'published',
          question_published_at: new Date().toISOString(),
        })
        .eq('student_id', studentId)
        .eq('grade', grade)
        .eq('question_status', 'draft')
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-expect-questions', variables.studentId, variables.grade] })
    },
  })
}

// ─────────────────────────────────────────────
// 10. 질문 수정/삭제
// ─────────────────────────────────────────────

export function useUpdateQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<ExpectQuestion> }) => {
      const { error } = await supabase
        .from('high_saenggibu_questions')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-expect-questions'] })
    },
  })
}

export function useDeleteQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('high_saenggibu_questions')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-expect-questions'] })
    },
  })
}

export function useDeleteAllAIQuestions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, grade }: { studentId: string, grade: number }) => {
      const { error } = await supabase
        .from('high_saenggibu_questions')
        .delete()
        .eq('student_id', studentId)
        .eq('grade', grade)
        .eq('source_type', 'ai')
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ 
        queryKey: ['admin-expect-questions', variables.studentId, variables.grade] 
      })
    },
  })
}

// ─────────────────────────────────────────────
// 11. 피드백 작성
// ─────────────────────────────────────────────

export function useSendFirstFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ questionId, studentId, feedback }: {
      questionId: string
      studentId: string
      feedback: string
    }) => {
      const { data: existing } = await supabase
        .from('high_saenggibu_questions_analysis')
        .select('id')
        .eq('question_id', questionId)
        .eq('round', 1)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('high_saenggibu_questions_analysis')
          .update({
            teacher_feedback: feedback,
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('high_saenggibu_questions_analysis')
          .insert({
            question_id: questionId,
            student_id: studentId,
            round: 1,
            teacher_feedback: feedback,
            status: 'published',
            published_at: new Date().toISOString(),
          })
        if (error) throw error
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-expect-analyses', v.questionId] })
    },
  })
}

export function useSendFinalFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ questionId, studentId, feedback }: {
      questionId: string
      studentId: string
      feedback: string
    }) => {
      const { data: existing } = await supabase
        .from('high_saenggibu_questions_analysis')
        .select('id')
        .eq('question_id', questionId)
        .eq('round', 2)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('high_saenggibu_questions_analysis')
          .update({
            teacher_feedback: feedback,
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('high_saenggibu_questions_analysis')
          .insert({
            question_id: questionId,
            student_id: studentId,
            round: 2,
            teacher_feedback: feedback,
            status: 'published',
            published_at: new Date().toISOString(),
          })
        if (error) throw error
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-expect-analyses', v.questionId] })
    },
  })
}

// ─────────────────────────────────────────────
// 12. 꼬리질문
// ─────────────────────────────────────────────

export function useAddFollowup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      question_id: string
      student_id: string
      text: string
      publish_now?: boolean
    }) => {
      const { error } = await supabase
        .from('high_saenggibu_questions_followups')
        .insert({
          question_id: input.question_id,
          student_id: input.student_id,
          teacher_edited_question: input.text,
          status: input.publish_now ? 'published' : 'draft',
          published_at: input.publish_now ? new Date().toISOString() : null,
        })
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-expect-followups', v.question_id] })
    },
  })
}

export function useGenerateAIFollowups() {
  return useMutation({
    mutationFn: async (input: { 
      question_id: string
      question: string
      finalAnswer: string
      finalFeedback?: string | null
      majorDept?: string | null
      sourceText?: string | null
    }): Promise<string[]> => {
      const { data, error } = await supabase.functions.invoke(
        'ai-generate-followups',
        {
          body: {
            question: input.question,
            finalAnswer: input.finalAnswer,
            finalFeedback: input.finalFeedback,
            majorDept: input.majorDept,
            sourceText: input.sourceText,
          },
        }
      )

      if (error) throw new Error('AI 꼬리질문 생성 실패: ' + error.message)
      if (!data?.success || !Array.isArray(data?.followups)) {
        throw new Error('AI 응답이 없어요: ' + JSON.stringify(data).substring(0, 200))
      }

      return data.followups as string[]
    },
  })
}

export function useSaveSelectedFollowups() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      question_id: string
      student_id: string
      questions: string[]
      publish_now?: boolean
    }) => {
      const inserts = input.questions.map(q => ({
        question_id: input.question_id,
        student_id: input.student_id,
        ai_generated_question: q,
        status: input.publish_now ? 'published' : 'draft',
        published_at: input.publish_now ? new Date().toISOString() : null,
      }))
      const { error } = await supabase
        .from('high_saenggibu_questions_followups')
        .insert(inserts)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-expect-followups', v.question_id] })
    },
  })
}

export function useDeleteFollowup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('high_saenggibu_questions_followups')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-expect-followups'] })
    },
  })
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

export function getQuestionStep(
  question: ExpectQuestion,
  analyses: ExpectAnalysis[]
): number {
  if (!question.student_answer) return 1
  const round1 = analyses.find(a => a.round === 1)
  if (!round1?.teacher_feedback) return 2
  const round2 = analyses.find(a => a.round === 2)
  if (!round2?.revised_answer) return 3
  if (!round2.teacher_feedback) return 4
  return 5
}