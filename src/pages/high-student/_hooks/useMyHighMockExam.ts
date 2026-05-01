import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface MockExam {
  id: string
  student_id: string
  grade: string
  period: string
  exam_type: string | null
  major_level: string | null
  ai_generated: boolean
  status: string
  time_limit_min: number
  target_university: string | null
  target_department: string | null
  opened_at: string | null
  started_at: string | null
  submitted_at: string | null
  total_score: number | null
  teacher_comment: string | null
  created_at: string
  updated_at: string
}

export interface MockExamQuestion {
  id: string
  exam_id: string
  student_id: string
  order: number
  level: string
  parent_id: string | null
  tail_index: number | null
  type: string | null
  question_text: string
  ai_generated: boolean
  student_answer: string | null
  answered_at: string | null
  time_limit_sec: number | null
  time_spent_sec: number | null
  teacher_feedback: string | null
  created_at: string
}

export interface MockExamMajor {
  id: string
  exam_id: string
  student_id: string
  order: number
  question_text: string
  correct_answer: string
  question_type: string
  time_limit_sec: number
  options: string[] | null
  correct_index: number | null
  student_answer: string | null
  answered_at: string | null
  score: number | null
  scored_at: string | null
  created_at: string
}

export interface MockExamReport {
  id: string
  exam_id: string
  student_id: string
  scores: any
  strengths: string[] | null
  weaknesses: string[] | null
  comparison_prev: any
  summary_for_parents: string | null
  university_fit: any
  teacher_comment: string | null
  season_guide: any
  saenggibu_direction: any
  next_period_plan: string | null
  published_at: string | null
  created_at: string
}

export interface MockExamYearlyReport {
  id: string
  student_id: string
  grade: string
  year: number
  total_summary: string | null
  growth_trajectory: any
  parent_message: string | null
  saenggibu_direction: any
  next_year_plan: string | null
  university_recommendations: any
  teacher_comment: string | null
  published_at: string | null
  created_at: string
}

const POLL = 2000

// ─────────────────────────────────────────────
// 1. 내 회차 목록 (pending 제외, open 이상)
// ─────────────────────────────────────────────

export function useMyMockExams(grade?: string) {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined

  return useQuery({
    queryKey: ['my-mock-exams', studentId, grade],
    queryFn: async (): Promise<MockExam[]> => {
      if (!studentId) return []
      let query = supabase
        .from('high_mock_exam')
        .select('*')
        .eq('student_id', studentId)
        .neq('status', 'pending')
      if (grade) query = query.eq('grade', grade)

      const { data, error } = await query
        .order('grade', { ascending: true })
        .order('period', { ascending: true })
      if (error) throw error
      return (data ?? []) as MockExam[]
    },
    enabled: !!studentId,
    refetchInterval: POLL,
  })
}

// ─────────────────────────────────────────────
// 2. 회차 질문 조회 (본+꼬리)
// ─────────────────────────────────────────────

export function useMyMockExamQuestions(examId: string | undefined) {
  return useQuery({
    queryKey: ['my-mock-exam-questions', examId],
    queryFn: async (): Promise<MockExamQuestion[]> => {
      if (!examId) return []
      const { data, error } = await supabase
        .from('high_mock_exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order', { ascending: true })
        .order('level', { ascending: false })
        .order('tail_index', { ascending: true })
      if (error) throw error
      return (data ?? []) as MockExamQuestion[]
    },
    enabled: !!examId,
    refetchInterval: POLL,
  })
}

// ─────────────────────────────────────────────
// 3. 전공특화 문제 조회
// ─────────────────────────────────────────────

export function useMyMockExamMajor(examId: string | undefined) {
  return useQuery({
    queryKey: ['my-mock-exam-major', examId],
    queryFn: async (): Promise<MockExamMajor[]> => {
      if (!examId) return []
      const { data, error } = await supabase
        .from('high_mock_exam_major')
        .select('*')
        .eq('exam_id', examId)
        .order('order', { ascending: true })
      if (error) throw error
      return (data ?? []) as MockExamMajor[]
    },
    enabled: !!examId,
    refetchInterval: POLL,
  })
}

// ─────────────────────────────────────────────
// 4. 시험 시작 (status: open → in_progress + 타이머 시작)
// ─────────────────────────────────────────────

export function useStartMockExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (examId: string) => {
      const { error } = await supabase
        .from('high_mock_exam')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', examId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-mock-exams'] })
    },
  })
}

// ─────────────────────────────────────────────
// 5. 면접질문 답변 저장 (본/꼬리 공통)
// ─────────────────────────────────────────────

export function useSubmitQuestionAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ questionId, answer, timeSpentSec }: {
      questionId: string
      answer: string
      timeSpentSec?: number
    }) => {
      const { error } = await supabase
        .from('high_mock_exam_questions')
        .update({
          student_answer: answer,
          answered_at: new Date().toISOString(),
          time_spent_sec: timeSpentSec ?? null,
        })
        .eq('id', questionId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-mock-exam-questions'] })
    },
  })
}

// ─────────────────────────────────────────────
// 6. 전공특화 답변 저장
// ─────────────────────────────────────────────

export function useSubmitMajorAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ questionId, answer }: {
      questionId: string
      answer: string
    }) => {
      const { error } = await supabase
        .from('high_mock_exam_major')
        .update({
          student_answer: answer,
          answered_at: new Date().toISOString(),
        })
        .eq('id', questionId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-mock-exam-major'] })
    },
  })
}

// ─────────────────────────────────────────────
// 7. 회차 최종 제출
// ─────────────────────────────────────────────

export function useSubmitMockExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (examId: string) => {
      const { error } = await supabase
        .from('high_mock_exam')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', examId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-mock-exams'] })
    },
  })
}

// ─────────────────────────────────────────────
// 8. 내 회차 리포트 조회
// ─────────────────────────────────────────────

export function useMyMockExamReport(examId: string | undefined) {
  return useQuery({
    queryKey: ['my-mock-exam-report', examId],
    queryFn: async (): Promise<MockExamReport | null> => {
      if (!examId) return null
      const { data, error } = await supabase
        .from('high_mock_exam_report')
        .select('*')
        .eq('exam_id', examId)
        .maybeSingle()
      if (error) throw error
      return data as MockExamReport | null
    },
    enabled: !!examId,
    refetchInterval: POLL,
  })
}

// ─────────────────────────────────────────────
// 9. 연말 종합 리포트 조회
// ─────────────────────────────────────────────

export function useMyYearlyReport(grade: string, year: number) {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined

  return useQuery({
    queryKey: ['my-yearly-report', studentId, grade, year],
    queryFn: async (): Promise<MockExamYearlyReport | null> => {
      if (!studentId) return null
      const { data, error } = await supabase
        .from('high_mock_exam_yearly_report')
        .select('*')
        .eq('student_id', studentId)
        .eq('grade', grade)
        .eq('year', year)
        .maybeSingle()
      if (error) throw error
      return data as MockExamYearlyReport | null
    },
    enabled: !!studentId && !!grade,
    refetchInterval: POLL,
  })
}

// ─────────────────────────────────────────────
// 10. 🆕 AI 꼬리질문 실시간 생성 (모의고사 전용)
// ─────────────────────────────────────────────
//
// 흐름:
//   ① 학생이 본 질문에 답변 완료 (useSubmitQuestionAnswer)
//   ② 본 질문 + 학생 답변 → ai-generate-mock-tail Edge Function 호출
//   ③ 받은 꼬리질문(1개) → high_mock_exam_questions에 새 row insert (level='tail')
//   ④ 생성된 row 반환 → UI가 카운트다운 후 1.5분 타이머 시작
//
// 사용 예 (학생 MockExam.tsx 내부):
//   const generateTail = useGenerateMockTail()
//   const tail = await generateTail.mutateAsync({
//     examId,
//     studentId,
//     mainOrder: q.order,
//     mainQuestionId: q.id,
//     mainQuestionText: q.question_text,
//     studentAnswer,
//     questionType: q.type,
//   })
//   // tail.question_text 를 화면에 띄우고 타이머 시작

export function useGenerateMockTail() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      examId,
      studentId,
      mainOrder,
      mainQuestionId,
      mainQuestionText,
      studentAnswer,
      questionType,
      targetUniversity,
      targetDepartment,
      tailTimeLimitSec = 90,
    }: {
      examId: string
      studentId: string
      mainOrder: number
      mainQuestionId: string
      mainQuestionText: string
      studentAnswer: string
      questionType?: string | null
      targetUniversity?: string | null
      targetDepartment?: string | null
      tailTimeLimitSec?: number
    }): Promise<MockExamQuestion> => {
      // ── 1) 이미 같은 main에 대한 꼬리가 있으면 그대로 재사용 (중복 방지) ──
      const { data: existing } = await supabase
        .from('high_mock_exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .eq('parent_id', mainQuestionId)
        .eq('level', 'tail')
        .order('tail_index', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (existing && existing.question_text) {
        return existing as MockExamQuestion
      }

      // ── 2) Edge Function 호출 ──
      const { data, error } = await supabase.functions.invoke(
        'ai-generate-mock-tail',
        {
          body: {
            mainQuestion: mainQuestionText,
            studentAnswer,
            questionType: questionType ?? undefined,
            targetUniversity: targetUniversity ?? undefined,
            targetDepartment: targetDepartment ?? undefined,
          },
        }
      )

      if (error) {
        throw new Error(`AI 꼬리질문 생성 실패: ${error.message}`)
      }

      const tailText = (data?.tail as string | undefined)?.trim()
      if (!tailText) {
        throw new Error('AI 꼬리질문이 비어있어요. 잠시 후 다시 시도해주세요.')
      }

      // ── 3) 새 꼬리질문 row insert ──
      const { data: inserted, error: insErr } = await supabase
        .from('high_mock_exam_questions')
        .insert({
          exam_id: examId,
          student_id: studentId,
          order: mainOrder,
          level: 'tail',
          parent_id: mainQuestionId,
          tail_index: 0,
          type: questionType ?? null,
          question_text: tailText,
          ai_generated: true,
          time_limit_sec: tailTimeLimitSec,
        })
        .select()
        .single()

      if (insErr) throw insErr
      return inserted as MockExamQuestion
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['my-mock-exam-questions', v.examId] })
    },
  })
}

// ─────────────────────────────────────────────
// 헬퍼 유틸
// ─────────────────────────────────────────────

export function getStatusLabel(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'pending':
      return { label: '준비중', color: '#9CA3AF', bg: '#F3F4F6' }
    case 'open':
      return { label: '시작 가능', color: '#2563EB', bg: '#EFF6FF' }
    case 'in_progress':
      return { label: '진행중', color: '#D97706', bg: '#FFFBEB' }
    case 'submitted':
      return { label: '제출완료', color: '#7C3AED', bg: '#F5F3FF' }
    case 'analyzed':
      return { label: '리포트완성', color: '#059669', bg: '#ECFDF5' }
    default:
      return { label: status, color: '#6B7280', bg: '#F3F4F6' }
  }
}

export function getTypeColor(type: string | null): { color: string; bg: string; border: string } {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    '자기소개': { color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
    '지원동기': { color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
    '인성': { color: '#D97706', bg: '#FFF3E8', border: '#FDBA74' },
    '전공': { color: '#059669', bg: '#F0FDF4', border: '#6EE7B7' },
    '생기부': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    '학업': { color: '#059669', bg: '#F0FDF4', border: '#6EE7B7' },
    '진로': { color: '#D97706', bg: '#FFF7ED', border: '#FDBA74' },
    '탐구': { color: '#059669', bg: '#F0FDF4', border: '#6EE7B7' },
    '독서': { color: '#D97706', bg: '#FFF3E8', border: '#FDBA74' },
    '성장': { color: '#059669', bg: '#ECFDF5', border: '#6EE7B7' },
    '활동': { color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
    '전공연계': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    '기출': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    '학업연계': { color: '#059669', bg: '#F0FDF4', border: '#6EE7B7' },
  }
  return map[type || ''] || { color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' }
}