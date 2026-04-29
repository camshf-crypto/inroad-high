import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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

// PastQuestion + 학생 답변 조인 결과
export interface QuestionWithAnswer extends PastQuestion {
  answer: PastAnswer | null
}

// ─────────────────────────────────────────────
// 1. 학생의 target_universities 조회
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
      // 원장은 hidden까지 전부 조회
      return (data?.target_universities || []) as Array<{ university: string; department: string; hidden?: boolean }>
    },
    enabled: !!studentId,
    refetchInterval: 2000,  // 2초마다 동기화 (학생이 학교 선택하면 즉시 반영)
  })
}

// 학생 대상 대학/학과 수정 (원장이 추가/복구/삭제)
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
// 2. 학교/학과별 기출문제 + 학생 답변 조회
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

      // 1. 해당 학교/학과의 모든 기출문제
      const { data: questions, error: qErr } = await supabase
        .from('high_questions')
        .select('*')
        .eq('university', university)
        .eq('department', department)
        .order('created_at', { ascending: true })
      if (qErr) throw qErr
      if (!questions || questions.length === 0) return []

      // 2. 해당 학생이 이 문제들에 단 답변
      const questionIds = questions.map(q => q.id)
      const { data: answers, error: aErr } = await supabase
        .from('high_questions_answer')
        .select('*')
        .eq('student_id', studentId)
        .in('question_id', questionIds)
      if (aErr) throw aErr

      // 3. 조인
      const answerMap = new Map((answers || []).map(a => [a.question_id, a]))
      return questions.map(q => ({
        ...q,
        answer: answerMap.get(q.id) || null,
      })) as QuestionWithAnswer[]
    },
    enabled: !!studentId && !!university && !!department,
    refetchInterval: 2000,  // 2초마다 동기화 (학생 답변 반영)
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
// 5. 원장 1차 피드백 전달
// ─────────────────────────────────────────────

export function useSendFirstFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ answerId, studentId, feedback }: {
      answerId: string
      studentId: string
      feedback: string
    }) => {
      // round 1 찾기 or 생성
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
// 6. 원장 최종 피드백 전달 (round 2)
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
// 8. AI 꼬리질문 생성 (MOCK)
// ─────────────────────────────────────────────

export function useGenerateAIFollowups() {
  return useMutation({
    mutationFn: async ({ answer_id, student_answer, question_text }: {
      answer_id: string
      student_answer: string | null
      question_text: string
    }): Promise<string[]> => {
      // MOCK: 실제로는 AI API 호출
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
// 9. 선택된 AI 꼬리질문 저장 + 게시
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
// 11. AI 분석 데이터 (MOCK) - 추후 실제 AI 연동
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

export function getMockAIAnalysis(questionText: string, studentAnswer: string | null): AIAnalysisData {
  return {
    evalCriteria: '지원자의 사고의 깊이와 변화의 흔적을 중시합니다. 질문의 목적은 지원자가 전공과 관련된 경험을 통해 어떻게 사고가 확장되었는지를 확인하는 것입니다.',
    scores: [
      { label: '인성', score: 24, max: 30, desc: '자신의 탐구 과정을 통해 얻은 통찰을 성찰하고 있다.' },
      { label: '전공적합성', score: 40, max: 50, desc: '정보 전달 방식에 대한 탐구가 전공과의 핵심 역량과 연결됨을 강조했다.' },
      { label: '의사소통역량', score: 16, max: 20, desc: '설문조사와 데이터를 바탕으로 발표를 통해 논리를 전개했다.' },
    ],
    summary: '답변에서 전공적합성이 상대적으로 잘 드러났으며, 정보 전달 방식의 탐구가 전공의 주요 역량과 연결되었다. 그러나 수업 내용과의 직접적인 연관성이 부족하여 전공 학습 내용과의 구체적인 연결이 아쉬운 부분이다.',
    strengths: [
      '구체적인 탐구 경험을 잘 설명하였다.',
      '스토리텔링 방식과 정보 전달 방식에 대한 탐구가 전공과의 연결성을 명확히 했다.',
      '설문조사와 데이터를 활용한 논리 전개가 의사소통 역량을 잘 드러냈다.',
    ],
    improvements: [
      '수업 내용과의 직접적인 연관성이 부족하다.',
      '전공의 구체적인 학습 내용과의 연결이 명확하지 않다.',
      '전공 탐색이나 진로 고민과의 직접적인 연결 설명이 미흡하다.',
    ],
    tailSuggestions: [
      '심화수학 시간에 진행한 활동이 해당 학과의 학습 내용과 어떻게 직접적으로 연결된다고 생각하나요?',
      '설문 조사 결과가 전공 선택에 어떤 영향을 주었는지 구체적으로 설명할 수 있나요?',
      '정보 전달 방식의 탐구 과정에서 어떤 어려움이 있었고, 이를 어떻게 극복했는지 설명해주세요.',
    ],
    second: {
      beforeDistribution: [
        { factorCode: 'F01', factorName: '인성', distribution: 30, evidence: '탐구 과정에서 성찰하는 모습이 드러남' },
        { factorCode: 'F02', factorName: '전공적합성', distribution: 50, evidence: '정보 전달 방식 탐구가 전공과 연결됨' },
        { factorCode: 'F03', factorName: '의사소통역량', distribution: 20, evidence: '데이터 기반 논리 전개' },
      ],
      afterDistribution: [
        { factorCode: 'F01', factorName: '인성', distribution: 25, evidence: '성찰은 있으나 구체적 사례 보완 필요' },
        { factorCode: 'F02', factorName: '전공적합성', distribution: 55, evidence: '전공 연결성이 더 명확해짐' },
        { factorCode: 'F03', factorName: '의사소통역량', distribution: 20, evidence: '논리 구조는 유지됨' },
      ],
      structureComment: '2차 답변은 전공적합성 측면에서 1차보다 연결성이 강화되었으나, 답변의 도입부에서 핵심 경험을 먼저 제시하는 구조가 아직 부족합니다. "경험 제시 → 의미 도출 → 전공 연결" 순서가 더 명확해야 하며, 연습 답변에서는 이 흐름에 맞게 문장 순서를 재정렬했습니다.',
      practiceAnswer: '저는 고등학교 2학년 때 데이터 저널리즘 프로젝트를 진행하면서 정보 전달 방식에 대해 깊이 고민하게 되었습니다. 설문조사 결과를 시각화하여 발표했을 때, 단순한 숫자보다 스토리텔링 방식이 청중에게 더 효과적으로 전달된다는 것을 경험했습니다. 이 경험을 통해 이 학과에서 배울 미디어 리터러시와 데이터 커뮤니케이션이 제가 탐구해 온 방향과 일치한다고 확신하게 되었습니다.',
    },
  }
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

export function getPastStep(
  answer: PastAnswer | null,
  analyses: PastAnalysis[]
): number {
  // 0: 미답변, 1: 답변완료, 2: 1차피드백, 3: 업그레이드, 4: 최종피드백, 5+: 꼬리질문 단계
  if (!answer?.student_answer) return 0
  const round1 = analyses.find(a => a.round === 1)
  if (!round1?.teacher_feedback) return 1
  const round2 = analyses.find(a => a.round === 2)
  if (!round2?.revised_answer) return 2
  if (!round2.teacher_feedback) return 3
  return 4
}

// 문제 타입 분류 (MOCK - 키워드 기반)
export function inferQuestionType(question: string): '공통' | '전공' | '인성' {
  const lower = question.toLowerCase()
  // 전공 관련 키워드
  if (/전공|학과|학부|연구|논문|이론|기술|과학|공학|전문|학문|AI|인공지능|컴퓨터|수학|물리|화학|생물|의학|법|경영|경제|심리|공부|수업|과목/.test(question)) {
    return '전공'
  }
  // 인성 관련 키워드
  if (/갈등|협업|협동|팀|리더십|친구|관계|성격|가치관|경험|어려움|극복|봉사|배려|존중|소통|태도|책임|노력/.test(question)) {
    return '인성'
  }
  return '공통'
}