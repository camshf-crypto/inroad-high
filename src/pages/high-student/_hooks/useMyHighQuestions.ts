import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'

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

export interface QuestionWithAnswer extends PastQuestion {
  answer: PastAnswer | null
}

// 폴링 주기 (ms) — 5초로 늘려서 Network 부담 줄이기
const POLL_INTERVAL = 5000

// ─────────────────────────────────────────────
// 1. 내 target_universities 조회
// ─────────────────────────────────────────────

export function useMyTargetUniversities() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined

  return useQuery({
    queryKey: ['my-target-universities', studentId],
    queryFn: async () => {
      if (!studentId) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('target_universities')
        .eq('id', studentId)
        .maybeSingle()
      if (error) throw error
      const all = (data?.target_universities || []) as Array<{ university: string; department: string; hidden?: boolean }>
      return all.filter(t => !t.hidden)
    },
    enabled: !!studentId,
    refetchInterval: POLL_INTERVAL,
  })
}

export function useUpdateMyTargets() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (targets: Array<{ university: string; department: string; hidden?: boolean }>) => {
      if (!studentId) throw new Error('로그인 필요')
      const { error } = await supabase
        .from('profiles')
        .update({ target_universities: targets })
        .eq('id', studentId)
      if (error) throw error
      return targets
    },
    onMutate: async (newTargets) => {
      await qc.cancelQueries({ queryKey: ['my-target-universities', studentId] })
      const prev = qc.getQueryData(['my-target-universities', studentId])
      qc.setQueryData(
        ['my-target-universities', studentId],
        newTargets.filter(t => !t.hidden),
      )
      return { prev }
    },
    onError: (_err, _new, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['my-target-universities', studentId], ctx.prev)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['my-target-universities', studentId] })
    },
  })
}

export function useMyTargetUniversitiesAll() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined

  return useQuery({
    queryKey: ['my-target-universities-all', studentId],
    queryFn: async () => {
      if (!studentId) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('target_universities')
        .eq('id', studentId)
        .maybeSingle()
      if (error) throw error
      return (data?.target_universities || []) as Array<{ university: string; department: string; hidden?: boolean }>
    },
    enabled: !!studentId,
    refetchInterval: POLL_INTERVAL,
  })
}

// ─────────────────────────────────────────────
// 2. 전체 대학/학과 목록 조회 (드롭다운용)
// ⭐ 폴링 X — 학교 목록은 자주 안 바뀜
// ⭐ limit 풀음 (.range)
// ─────────────────────────────────────────────

export function useAllUniversities() {
  return useQuery({
    queryKey: ['all-universities'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('high_questions')
        .select('university')
        .order('university')
        .range(0, 199999)
      if (error) throw error
      const unique = Array.from(new Set((data ?? []).map(r => r.university)))
      return unique
    },
    staleTime: 60_000, // 1분 동안 캐시 유지 (재요청 안 함)
  })
}

export function useDepartmentsOfUniversity(university: string) {
  return useQuery({
    queryKey: ['departments', university],
    queryFn: async (): Promise<string[]> => {
      if (!university) return []
      const { data, error } = await supabase
        .from('high_questions')
        .select('department')
        .eq('university', university)
        .order('department')
        .range(0, 199999)
      if (error) throw error
      const unique = Array.from(new Set((data ?? []).map(r => r.department)))
      return unique
    },
    enabled: !!university,
    staleTime: 60_000,
  })
}

// ─────────────────────────────────────────────
// 3. 학교/학과별 기출문제 + 내 답변 조회
// ─────────────────────────────────────────────

export function useMyPastQuestions(
  university: string,
  department: string,
) {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined

  return useQuery({
    queryKey: ['my-past-questions', studentId, university, department],
    queryFn: async (): Promise<QuestionWithAnswer[]> => {
      if (!studentId || !university || !department) return []

      const { data: questions, error: qErr } = await supabase
        .from('high_questions')
        .select('*')
        .eq('university', university)
        .eq('department', department)
        .order('created_at', { ascending: true })
        .range(0, 9999)
      if (qErr) throw qErr
      if (!questions || questions.length === 0) return []

      const questionIds = questions.map(q => q.id)
      const { data: answers, error: aErr } = await supabase
        .from('high_questions_answer')
        .select('*')
        .in('question_id', questionIds)
        .range(0, 9999)
      if (aErr) throw aErr

      const answerMap = new Map((answers || []).map(a => [a.question_id, a]))
      return questions.map(q => ({
        ...q,
        answer: answerMap.get(q.id) || null,
      })) as QuestionWithAnswer[]
    },
    enabled: !!studentId && !!university && !!department,
    refetchInterval: POLL_INTERVAL,
  })
}

// ─────────────────────────────────────────────
// 4. answer별 analysis 조회
// ─────────────────────────────────────────────

export function useMyAnswerAnalyses(answerId: string | undefined) {
  return useQuery({
    queryKey: ['my-past-analyses', answerId],
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
    refetchInterval: POLL_INTERVAL,
  })
}

// ─────────────────────────────────────────────
// 5. 내가 받은 꼬리질문 조회 (published만)
// ─────────────────────────────────────────────

export function useMyAnswerFollowups(answerId: string | undefined) {
  return useQuery({
    queryKey: ['my-past-followups', answerId],
    queryFn: async (): Promise<PastFollowup[]> => {
      if (!answerId) return []
      const { data, error } = await supabase
        .from('high_questions_followups')
        .select('*')
        .eq('answer_id', answerId)
        .eq('status', 'published')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as PastFollowup[]
    },
    enabled: !!answerId,
    refetchInterval: POLL_INTERVAL,
  })
}

// ─────────────────────────────────────────────
// 6. 학생 첫 답변 작성 (answer + analysis round 1)
// ─────────────────────────────────────────────

export function useSubmitFirstAnswer() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ questionId, answer, grade }: {
      questionId: string
      answer: string
      grade?: number
    }) => {
      if (!studentId) throw new Error('로그인 필요')

      const { data: existingAnswer } = await supabase
        .from('high_questions_answer')
        .select('id')
        .eq('question_id', questionId)
        .eq('student_id', studentId)
        .maybeSingle()

      let answerId: string
      if (existingAnswer) {
        const { error } = await supabase
          .from('high_questions_answer')
          .update({
            student_answer: answer,
            answer_status: 'submitted',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAnswer.id)
        if (error) throw error
        answerId = existingAnswer.id
      } else {
        const { data, error } = await supabase
          .from('high_questions_answer')
          .insert({
            question_id: questionId,
            student_id: studentId,
            student_answer: answer,
            answer_status: 'submitted',
            grade: grade ?? null,
          })
          .select('id')
          .single()
        if (error) throw error
        answerId = data.id
      }

      const { data: existingR1 } = await supabase
        .from('high_questions_analysis')
        .select('id')
        .eq('answer_id', answerId)
        .eq('round', 1)
        .maybeSingle()

      if (existingR1) {
        const { error } = await supabase
          .from('high_questions_analysis')
          .update({
            revised_answer: answer,
            status: 'pending',
          })
          .eq('id', existingR1.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('high_questions_analysis')
          .insert({
            answer_id: answerId,
            student_id: studentId,
            round: 1,
            revised_answer: answer,
            status: 'pending',
          })
        if (error) throw error
      }

      return answerId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-past-questions'] })
      qc.invalidateQueries({ queryKey: ['my-past-analyses'] })
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
    mutationFn: async ({ answerId, answer }: {
      answerId: string
      answer: string
    }) => {
      if (!studentId) throw new Error('로그인 필요')

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
            revised_answer: answer,
            status: 'pending',
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
            revised_answer: answer,
            status: 'pending',
          })
        if (error) throw error
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['my-past-analyses', v.answerId] })
    },
  })
}

// ─────────────────────────────────────────────
// 8. 꼬리질문 답변 제출
// ─────────────────────────────────────────────

export function useSubmitFollowupAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ followupId, answer }: {
      followupId: string
      answer: string
    }) => {
      const { error } = await supabase
        .from('high_questions_followups')
        .update({
          student_answer: answer,
          student_answered_at: new Date().toISOString(),
        })
        .eq('id', followupId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-past-followups'] })
    },
  })
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

export function getMyStep(
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