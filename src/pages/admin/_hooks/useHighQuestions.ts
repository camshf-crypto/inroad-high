import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// AI 호출 제한
export const AI_CALL_LIMITS = {
  ROUND_1: 1,  // 1차 답변 분석 최대 1회
  ROUND_2: 1,  // 2차 답변 분석 최대 1회
}

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface PastQuestion {
  id: string
  university: string
  department: string
  admission_type: string | null
  question: string
  year: number | null
  created_at: string
}

export interface PastAnswer {
  id: string
  question_id: string
  student_id: string
  student_answer: string | null
  answer_status: string | null
  grade: number | null
  created_at: string
  updated_at: string
}

export interface PastAnalysis {
  id: string
  answer_id: string
  student_id: string
  round: number
  revised_answer: string | null
  teacher_feedback: string | null
  ai_analysis: any
  ai_call_count: number  // ⭐ 추가
  status: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface PastFollowup {
  id: string
  answer_id: string
  student_id: string
  ai_generated_question: string | null
  teacher_edited_question: string | null
  status: string | null
  published_at: string | null
  student_answer: string | null
  student_answered_at: string | null
  teacher_feedback: string | null
  created_at: string
  updated_at: string
}

export interface QuestionWithAnswer extends PastQuestion {
  answer: PastAnswer | null
}

// ─────────────────────────────────────────────
// 1. 학생 target_universities
// ─────────────────────────────────────────────

export function useStudentTargetUniversities(studentId: string) {
  return useQuery({
    queryKey: ['admin-target-universities', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('target_universities')
        .eq('id', studentId)
        .maybeSingle()
      if (error) throw error
      return (data?.target_universities || []) as Array<{ university: string; department: string; hidden?: boolean }>
    },
    enabled: !!studentId,
    refetchInterval: 2000,
  })
}

export function useUpdateStudentTargets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, targets }: {
      studentId: string
      targets: Array<{ university: string; department: string; hidden?: boolean }>
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ target_universities: targets })
        .eq('id', studentId)
      if (error) throw error
      return targets
    },
    onMutate: async ({ studentId, targets }) => {
      await qc.cancelQueries({ queryKey: ['admin-target-universities', studentId] })
      const prev = qc.getQueryData(['admin-target-universities', studentId])
      qc.setQueryData(['admin-target-universities', studentId], targets)
      return { prev, studentId }
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prev && ctx?.studentId) {
        qc.setQueryData(['admin-target-universities', ctx.studentId], ctx.prev)
      }
    },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: ['admin-target-universities', v.studentId] })
      qc.invalidateQueries({ queryKey: ['past-questions-with-answer', v.studentId] })
    },
  })
}

// ─────────────────────────────────────────────
// 2. 기출문제 + 답변 조회
// ─────────────────────────────────────────────

export function usePastQuestionsWithAnswer(
  studentId: string,
  university: string,
  department: string,
) {
  return useQuery({
    queryKey: ['past-questions-with-answer', studentId, university, department],
    queryFn: async (): Promise<QuestionWithAnswer[]> => {
      if (!university || !department) return []

      const { data: questions, error: qErr } = await supabase
        .from('high_questions')
        .select('*')
        .eq('university', university)
        .eq('department', department)
        .order('created_at', { ascending: true })
      if (qErr) throw qErr
      if (!questions || questions.length === 0) return []

      const questionIds = questions.map(q => q.id)
      const { data: answers, error: aErr } = await supabase
        .from('high_questions_answer')
        .select('*')
        .eq('student_id', studentId)
        .in('question_id', questionIds)
      if (aErr) throw aErr

      const answerMap = new Map((answers || []).map(a => [a.question_id, a]))
      return questions.map(q => ({
        ...q,
        answer: answerMap.get(q.id) || null,
      })) as QuestionWithAnswer[]
    },
    enabled: !!studentId && !!university && !!department,
    refetchInterval: 2000,
  })
}

// ─────────────────────────────────────────────
// 3. answer_id 기반 analysis 조회
// ─────────────────────────────────────────────

export function useAnswerAnalyses(answerId: string | undefined) {
  return useQuery({
    queryKey: ['past-analyses', answerId],
    queryFn: async (): Promise<PastAnalysis[]> => {
      if (!answerId) return []
      const { data, error } = await supabase
        .from('high_questions_analysis')
        .select('*')
        .eq('answer_id', answerId)
        .order('round', { ascending: true })
      if (error) throw error
      return (data ?? []) as PastAnalysis[]
    },
    enabled: !!answerId,
    refetchInterval: 2000,
  })
}

// ─────────────────────────────────────────────
// 4. 꼬리질문 조회
// ─────────────────────────────────────────────

export function useAnswerFollowups(answerId: string | undefined) {
  return useQuery({
    queryKey: ['past-followups', answerId],
    queryFn: async (): Promise<PastFollowup[]> => {
      if (!answerId) return []
      const { data, error } = await supabase
        .from('high_questions_followups')
        .select('*')
        .eq('answer_id', answerId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as PastFollowup[]
    },
    enabled: !!answerId,
    refetchInterval: 2000,
  })
}

// ─────────────────────────────────────────────
// 5. 1차 피드백 전달
// ─────────────────────────────────────────────

export function useSendFirstFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ answerId, studentId, feedback }: {
      answerId: string
      studentId: string
      feedback: string
    }) => {
      const { data: existing } = await supabase
        .from('high_questions_analysis')
        .select('id')
        .eq('answer_id', answerId)
        .eq('round', 1)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('high_questions_analysis')
          .update({
            teacher_feedback: feedback,
            status: 'delivered',
            published_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('high_questions_analysis')
          .insert({
            answer_id: answerId,
            student_id: studentId,
            round: 1,
            teacher_feedback: feedback,
            status: 'delivered',
            published_at: new Date().toISOString(),
          })
        if (error) throw error
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['past-analyses', v.answerId] })
    },
  })
}

// ─────────────────────────────────────────────
// 6. 최종 피드백 전달 (round 2)
// ─────────────────────────────────────────────

export function useSendFinalFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ answerId, studentId, feedback }: {
      answerId: string
      studentId: string
      feedback: string
    }) => {
      const { data: existing } = await supabase
        .from('high_questions_analysis')
        .select('id')
        .eq('answer_id', answerId)
        .eq('round', 2)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('high_questions_analysis')
          .update({
            teacher_feedback: feedback,
            status: 'delivered',
            published_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('high_questions_analysis')
          .insert({
            answer_id: answerId,
            student_id: studentId,
            round: 2,
            teacher_feedback: feedback,
            status: 'delivered',
            published_at: new Date().toISOString(),
          })
        if (error) throw error
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['past-analyses', v.answerId] })
    },
  })
}

// ─────────────────────────────────────────────
// 7. 꼬리질문 직접 추가
// ─────────────────────────────────────────────

export function useAddFollowup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ answer_id, student_id, text, publish_now = true }: {
      answer_id: string
      student_id: string
      text: string
      publish_now?: boolean
    }) => {
      const { error } = await supabase
        .from('high_questions_followups')
        .insert({
          answer_id,
          student_id,
          teacher_edited_question: text,
          status: publish_now ? 'published' : 'draft',
          published_at: publish_now ? new Date().toISOString() : null,
        })
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['past-followups', v.answer_id] })
    },
  })
}

// ─────────────────────────────────────────────
// 8. AI 꼬리질문 (Mock)
// ─────────────────────────────────────────────

export function useGenerateAIFollowups() {
  return useMutation({
    mutationFn: async ({ answer_id, student_answer, question_text }: {
      answer_id: string
      student_answer: string | null
      question_text: string
    }): Promise<string[]> => {
      await new Promise(r => setTimeout(r, 1200))
      return [
        `${question_text}에 대한 답변을 바탕으로, 본인이 경험한 가장 큰 어려움은 무엇이었나요?`,
        `그 경험을 통해 본인의 가치관이나 생각이 어떻게 변화했나요?`,
        `이 경험을 앞으로 대학 생활과 전공 학습에 어떻게 연결할 수 있을까요?`,
      ]
    },
  })
}

// ─────────────────────────────────────────────
// 9. AI 꼬리질문 저장
// ─────────────────────────────────────────────

export function useSaveSelectedFollowups() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ answer_id, student_id, questions, publish_now = true }: {
      answer_id: string
      student_id: string
      questions: string[]
      publish_now?: boolean
    }) => {
      if (questions.length === 0) return
      const rows = questions.map(q => ({
        answer_id,
        student_id,
        ai_generated_question: q,
        teacher_edited_question: q,
        status: publish_now ? 'published' : 'draft',
        published_at: publish_now ? new Date().toISOString() : null,
      }))
      const { error } = await supabase
        .from('high_questions_followups')
        .insert(rows)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['past-followups', v.answer_id] })
    },
  })
}

// ─────────────────────────────────────────────
// 10. 꼬리질문 삭제
// ─────────────────────────────────────────────

export function useDeleteFollowup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (followupId: string) => {
      const { data: fu } = await supabase
        .from('high_questions_followups')
        .select('answer_id')
        .eq('id', followupId)
        .maybeSingle()
      const answerId = fu?.answer_id

      const { error } = await supabase
        .from('high_questions_followups')
        .delete()
        .eq('id', followupId)
      if (error) throw error
      return { answerId }
    },
    onSuccess: ({ answerId }) => {
      if (answerId) qc.invalidateQueries({ queryKey: ['past-followups', answerId] })
    },
  })
}

// ─────────────────────────────────────────────
// 11. AI 분석 데이터 타입 + Mock
// ─────────────────────────────────────────────

export interface AIAnalysisData {
  evalCriteria: string
  scores: Array<{ label: string; score: number; max: number; desc: string }>
  summary: string
  strengths: string[]
  improvements: string[]
  tailSuggestions: string[]
  second?: {
    beforeDistribution: Array<{ factorCode: string; factorName: string; distribution: number; evidence: string }>
    afterDistribution: Array<{ factorCode: string; factorName: string; distribution: number; evidence: string }>
    structureComment: string
    practiceAnswer: string
  }
}

export function getMockAIAnalysis(_questionText: string, _studentAnswer: string | null): AIAnalysisData {
  return {
    evalCriteria: '지원자의 사고의 깊이와 변화의 흔적을 중시합니다.',
    scores: [
      { label: '인성', score: 24, max: 30, desc: '자신의 탐구 과정을 통해 얻은 통찰을 성찰하고 있다.' },
      { label: '전공적합성', score: 40, max: 50, desc: '정보 전달 방식에 대한 탐구가 전공과의 핵심 역량과 연결됨을 강조했다.' },
      { label: '의사소통역량', score: 16, max: 20, desc: '설문조사와 데이터를 바탕으로 발표를 통해 논리를 전개했다.' },
    ],
    summary: '답변에서 전공적합성이 상대적으로 잘 드러났으며, 정보 전달 방식의 탐구가 전공의 주요 역량과 연결되었다.',
    strengths: ['구체적인 탐구 경험을 잘 설명하였다.', '스토리텔링 방식과 정보 전달 방식에 대한 탐구가 전공과의 연결성을 명확히 했다.'],
    improvements: ['수업 내용과의 직접적인 연관성이 부족하다.', '전공의 구체적인 학습 내용과의 연결이 명확하지 않다.'],
    tailSuggestions: ['심화수학 시간에 진행한 활동이 해당 학과의 학습 내용과 어떻게 직접적으로 연결된다고 생각하나요?'],
  }
}

// ─────────────────────────────────────────────
// ⭐ 호출 횟수 가져오기
// ─────────────────────────────────────────────

async function getAICallCount(answerId: string, round: number): Promise<number> {
  const { data } = await supabase
    .from('high_questions_analysis')
    .select('ai_call_count')
    .eq('answer_id', answerId)
    .eq('round', round)
    .maybeSingle()
  return data?.ai_call_count || 0
}

// ─────────────────────────────────────────────
// 12. ⭐ AI 1차 답변 분석 (호출수 제한 추가)
// ─────────────────────────────────────────────

export function useAIAnalyzePastAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      university,
      department,
      question,
      studentAnswer,
      answerId,
    }: {
      university: string
      department: string
      question: string
      studentAnswer: string
      answerId?: string
    }) => {
      // ⭐ 1차 호출수 체크
      if (answerId) {
        const currentCount = await getAICallCount(answerId, 1)
        if (currentCount >= AI_CALL_LIMITS.ROUND_1) {
          throw new Error(`1차 답변 AI 분석은 최대 ${AI_CALL_LIMITS.ROUND_1}회까지만 가능합니다. (현재 ${currentCount}회 사용)`)
        }
      }

      const { data, error } = await supabase.functions.invoke('past-analyze', {
        body: {
          university,
          department,
          question,
          studentAnswer,
        },
      })

      if (error) {
        throw new Error('AI 분석 호출 실패: ' + error.message)
      }
      if (!data?.success || !data?.analysis) {
        throw new Error('AI 응답이 없습니다: ' + JSON.stringify(data).substring(0, 200))
      }

      const analysis = data.analysis as AIAnalysisData

      // ⭐ DB에 저장 + 카운트 +1
      if (answerId) {
        const { data: existing } = await supabase
          .from('high_questions_analysis')
          .select('id, ai_call_count')
          .eq('answer_id', answerId)
          .eq('round', 1)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('high_questions_analysis')
            .update({ 
              ai_analysis: analysis,
              ai_call_count: (existing.ai_call_count || 0) + 1,
            })
            .eq('id', existing.id)
        } else {
          // 처음 호출이면 row 만들고 count = 1
          const { data: answerData } = await supabase
            .from('high_questions_answer')
            .select('student_id')
            .eq('id', answerId)
            .maybeSingle()
          
          if (answerData?.student_id) {
            await supabase
              .from('high_questions_analysis')
              .insert({
                answer_id: answerId,
                student_id: answerData.student_id,
                round: 1,
                ai_analysis: analysis,
                ai_call_count: 1,
                status: 'pending',
              })
          }
        }
      }

      return analysis
    },
    onSuccess: (_d, v) => {
      if (v.answerId) {
        qc.invalidateQueries({ queryKey: ['past-analyses', v.answerId] })
      }
    },
  })
}

// ─────────────────────────────────────────────
// 13. ⭐ AI 1차/2차 비교 분석 (호출수 제한)
// ─────────────────────────────────────────────

export function useAIGeneratePastFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      university,
      department,
      question,
      firstAnswer,
      secondAnswer,
      firstAnalysisJson,
      speechStructure,
      answerId,
    }: {
      university: string
      department: string
      question: string
      firstAnswer: string
      secondAnswer: string
      firstAnalysisJson?: any
      speechStructure?: string
      answerId?: string
    }) => {
      // ⭐ 2차 호출수 체크
      if (answerId) {
        const currentCount = await getAICallCount(answerId, 2)
        if (currentCount >= AI_CALL_LIMITS.ROUND_2) {
          throw new Error(`2차 답변 AI 분석은 최대 ${AI_CALL_LIMITS.ROUND_2}회까지만 가능합니다. (현재 ${currentCount}회 사용)`)
        }
      }

      const { data, error } = await supabase.functions.invoke('past-feedback', {
        body: {
          university,
          department,
          question,
          firstAnswer,
          secondAnswer,
          firstAnalysisJson,
          speechStructure,
        },
      })

      if (error) {
        throw new Error('AI 비교 분석 호출 실패: ' + error.message)
      }
      if (!data?.success || !data?.feedback) {
        throw new Error('AI 응답이 없습니다: ' + JSON.stringify(data).substring(0, 200))
      }

      const feedback = data.feedback as {
        beforeDistribution: Array<{ factorCode: string; factorName: string; distribution: number; evidence: string }>
        afterDistribution: Array<{ factorCode: string; factorName: string; distribution: number; evidence: string }>
        structureComment: string
        practiceAnswer: string
      }

      // ⭐ DB에 저장 + 카운트 +1
      if (answerId) {
        const { data: existing } = await supabase
          .from('high_questions_analysis')
          .select('id, ai_call_count')
          .eq('answer_id', answerId)
          .eq('round', 2)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('high_questions_analysis')
            .update({ 
              ai_analysis: feedback,
              ai_call_count: (existing.ai_call_count || 0) + 1,
            })
            .eq('id', existing.id)
        } else {
          const { data: answerData } = await supabase
            .from('high_questions_answer')
            .select('student_id')
            .eq('id', answerId)
            .maybeSingle()
          
          if (answerData?.student_id) {
            await supabase
              .from('high_questions_analysis')
              .insert({
                answer_id: answerId,
                student_id: answerData.student_id,
                round: 2,
                ai_analysis: feedback,
                ai_call_count: 1,
                status: 'pending',
              })
          }
        }
      }

      return feedback
    },
    onSuccess: (_d, v) => {
      if (v.answerId) {
        qc.invalidateQueries({ queryKey: ['past-analyses', v.answerId] })
      }
    },
  })
}

// ─────────────────────────────────────────────
// 14. AI 선생님 말투 피드백 (호출 제한 없음 - 분석 결과 변환만)
// ─────────────────────────────────────────────

export function useAISuggestTeacherFeedback() {
  return useMutation({
    mutationFn: async ({
      university,
      department,
      question,
      studentAnswer,
      secondAnswer,
      aiAnalysis,
      feedbackType,
    }: {
      university: string
      department: string
      question: string
      studentAnswer: string
      secondAnswer?: string
      aiAnalysis?: any
      feedbackType: 'first' | 'final'
    }) => {
      const { data, error } = await supabase.functions.invoke('past-suggest-feedback', {
        body: {
          university,
          department,
          question,
          studentAnswer,
          secondAnswer,
          aiAnalysis,
          feedbackType,
        },
      })

      if (error) {
        throw new Error('AI 피드백 초안 호출 실패: ' + error.message)
      }
      if (!data?.success || !data?.feedback) {
        throw new Error('AI 응답이 없습니다: ' + JSON.stringify(data).substring(0, 200))
      }

      return data.feedback as string
    },
  })
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

export function getPastStep(
  answer: PastAnswer | null,
  analyses: PastAnalysis[]
): number {
  if (!answer?.student_answer) return 0
  const round1 = analyses.find(a => a.round === 1)
  if (!round1?.teacher_feedback) return 1
  const round2 = analyses.find(a => a.round === 2)
  if (!round2?.revised_answer) return 2
  if (!round2.teacher_feedback) return 3
  return 4
}

export function inferQuestionType(question: string): '공통' | '전공' | '인성' {
  if (/전공|학과|학부|연구|논문|이론|기술|과학|공학|전문|학문|AI|인공지능|컴퓨터|수학|물리|화학|생물|의학|법|경영|경제|심리|공부|수업|과목/.test(question)) {
    return '전공'
  }
  if (/갈등|협업|협동|팀|리더십|친구|관계|성격|가치관|경험|어려움|극복|봉사|배려|존중|소통|태도|책임|노력/.test(question)) {
    return '인성'
  }
  return '공통'
}