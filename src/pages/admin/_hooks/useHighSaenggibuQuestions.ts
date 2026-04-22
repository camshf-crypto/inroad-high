import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

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
    refetchInterval: 5000,  // 5초마다 자동 새로고침
    refetchIntervalInBackground: false,
    queryFn: async () => {
      // 1. Storage에서 학생 폴더 직접 조회 (학생이 업로드한 PDF 직접 찾기)
      const { data: files, error: storageErr } = await supabase.storage
        .from('saenggibu-pdfs')
        .list(studentId, {
          search: `grade${grade}_`,
          sortBy: { column: 'created_at', order: 'desc' },
        })
      
      if (storageErr) {
        console.error('storage list error:', storageErr)
      }

      const latestFile = files && files.length > 0 ? files[0] : null

      // 2. 기존 질문에 저장된 major_dept 가져오기 (참고용)
      const { data: questionData } = await supabase
        .from('high_saenggibu_questions')
        .select('major_dept, created_at')
        .eq('student_id', studentId)
        .eq('grade', grade)
        .not('major_dept', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!latestFile) {
        return null
      }

      return {
        saenggibu_pdf_url: `${studentId}/${latestFile.name}`,
        major_dept: questionData?.major_dept ?? null,
        file_name: latestFile.name,
        file_size: latestFile.metadata?.size ?? 0,
        uploaded_at: latestFile.created_at,
      }
    },
    enabled: !!studentId,
  })
}

// Storage에서 서명 URL 받기 (PDF 미리보기용)
export async function getSaenggibuPdfSignedUrl(pdfPath: string): Promise<string | null> {
  if (!pdfPath) return null
  const { data, error } = await supabase.storage
    .from('saenggibu-pdfs')
    .createSignedUrl(pdfPath, 3600) // 1시간 유효
  if (error) {
    console.error('signed url error:', error)
    return null
  }
  return data?.signedUrl ?? null
}

// 원장이 학생 PDF 삭제
export function useDeleteStudentPdf() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, path, grade }: {
      studentId: string
      path: string
      grade: number
    }) => {
      const { error } = await supabase.storage
        .from('saenggibu-pdfs')
        .remove([path])
      if (error) throw error
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
    refetchInterval: 3000,  // 3초마다 자동 새로고침 (학생 답변 감지용)
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
// 3. 특정 질문의 analysis 조회
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
// 4. 특정 질문의 followups 조회
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
// 5. AI 예상질문 생성 (MOCK - 나중에 실제 AI 연결)
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
      // MOCK: 3개 질문 생성 (나중에 AI API 호출로 교체)
      const mockQuestions = [
        {
          question: `${major_dept || '지원 학과'}에 지원하게 된 계기와 고등학교 시기 탐구 활동의 연관성을 설명해주세요.`,
          tag: '지원동기',
          purpose: ['지원 동기의 진정성 확인', '학과에 대한 이해도 파악'],
        },
        {
          question: '가장 인상 깊었던 탐구 활동이나 독서 활동을 구체적으로 소개해주세요.',
          tag: '탐구활동',
          purpose: ['자기주도적 학습 역량 확인', '탐구 능력과 깊이 확인'],
        },
        {
          question: '학업 외 활동 중 본인의 성장에 가장 큰 영향을 준 활동은 무엇인가요?',
          tag: '학교생활',
          purpose: ['전인적 성장 확인', '협업 및 리더십 역량 파악'],
        },
      ]

      const inserts = mockQuestions.map(q => ({
        student_id: studentId,
        grade,
        question: q.question,
        tag: q.tag,
        purpose: q.purpose,
        source_type: 'ai' as const,
        saenggibu_pdf_url: saenggibu_pdf_url ?? null,
        major_dept: major_dept ?? null,
        question_status: 'draft' as const,
      }))

      const { data, error } = await supabase
        .from('high_saenggibu_questions')
        .insert(inserts)
        .select()
      if (error) throw error
      return data as ExpectQuestion[]
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-expect-questions', variables.studentId, variables.grade] })
    },
  })
}

// ─────────────────────────────────────────────
// 6. 원장이 직접 질문 추가
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
// 7. 질문 게시 (학생 공개)
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

// 학년 전체 게시
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
// 8. 질문 수정
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

// ─────────────────────────────────────────────
// 9. 피드백 작성 (1차 = round 1 업데이트)
//    학생이 답변 작성하면 analysis round 1 row가 자동 생성됨
//    원장은 그 row의 teacher_feedback만 업데이트
// ─────────────────────────────────────────────

export function useSendFirstFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ questionId, studentId, feedback }: {
      questionId: string
      studentId: string
      feedback: string
    }) => {
      // round 1 analysis 찾기
      const { data: existing } = await supabase
        .from('high_saenggibu_questions_analysis')
        .select('id')
        .eq('question_id', questionId)
        .eq('round', 1)
        .maybeSingle()

      if (existing) {
        // 업데이트
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
        // 없으면 새로 insert (학생이 아직 답변 안 한 경우)
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

// 최종 피드백 (round 2 업데이트 - 업그레이드 답변에 대한 피드백)
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
// 10. 꼬리질문 추가 (수동)
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

// AI 꼬리질문 생성 (MOCK)
export function useGenerateAIFollowups() {
  return useMutation({
    mutationFn: async (_input: { question_id: string, student_answer?: string | null }): Promise<string[]> => {
      // MOCK - 나중에 실제 AI
      await new Promise(r => setTimeout(r, 1200))
      return [
        '그 활동에서 가장 어려웠던 점은 무엇이었나요?',
        '구체적인 수치나 결과로 성과를 설명할 수 있나요?',
        '이 경험이 지원 학과 진학 후 어떻게 활용될 수 있을까요?',
      ]
    },
  })
}

// 선택한 AI 꼬리질문을 DB에 저장
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
  // 1: 답변 대기
  // 2: 답변함, 1차 피드백 대기
  // 3: 1차 피드백 받음, 업그레이드 답변 대기
  // 4: 업그레이드 답변함, 최종 피드백 대기
  // 5: 최종 피드백 완료 (또는 꼬리질문 단계)
  if (!question.student_answer) return 1
  const round1 = analyses.find(a => a.round === 1)
  if (!round1?.teacher_feedback) return 2
  const round2 = analyses.find(a => a.round === 2)
  if (!round2?.revised_answer) return 3
  if (!round2.teacher_feedback) return 4
  return 5
}