// src/pages/admin/_hooks/useBasicQuestions.ts
// ===============================================
// 💎 기본 인성질문 전용 훅
// - AI 분석은 인성 전용 함수(basic-analyze) 호출: 스피치 구조 + 진로 컨셉 분석
// - 답변조회/피드백/꼬리질문은 기출문제와 동일 테이블이므로 재사용(re-export)
// ===============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// 🔁 안 바뀌는 로직은 기출문제 훅에서 그대로 재사용
export {
  useAnswerAnalyses,
  useAnswerFollowups,
  useSendFirstFeedback,
  useSendFinalFeedback,
  useAddFollowup,
  useGenerateAIFollowups,
  useSaveSelectedFollowups,
  useDeleteFollowup,
  getPastStep as getBasicStep,
  inferQuestionType,
  AI_CALL_LIMITS,
  type QuestionWithAnswer,
  type PastAnswer,
  type PastAnalysis,
  type PastFollowup,
} from './useHighQuestions'

// ─────────────────────────────────────────────
// 인성 고정값
// ─────────────────────────────────────────────
export const BASIC_UNIV = '기본 인성'
export const BASIC_DEPT = '공통'

// ─────────────────────────────────────────────
// 인성 AI 분석 데이터 타입
// 🔥 기출문제(scores)와 다름 → structureCheck + conceptCheck
// ─────────────────────────────────────────────

export interface StructureCheck {
  speechType: string
  score: number
  matchLevel: '높음' | '보통' | '낮음'
  covered: string[]
  missing: string[]
  structureFeedback: string
  improvement: string
}

export interface ConceptCheck {
  isAligned: boolean
  matchLevel: '높음' | '보통' | '낮음'
  alignmentReason: string
  misalignment: string
  improvement: string
}

export interface BasicAnalysisData {
  structureCheck: StructureCheck
  summary: string
  strengths: string[]
  improvements: string[]
  tailSuggestions: string[]
  conceptCheck?: ConceptCheck | null
}

// ─────────────────────────────────────────────
// 인성질문 + 학생 답변 조회 (학교 탭 없이 고정 쿼리)
// ─────────────────────────────────────────────

export function useBasicQuestionsWithAnswer(studentId: string) {
  return useQuery({
    queryKey: ['basic-questions-with-answer', studentId],
    queryFn: async (): Promise<any[]> => {
      const { data: questions, error: qErr } = await supabase
        .from('high_questions')
        .select('*')
        .eq('university', BASIC_UNIV)
        .eq('department', BASIC_DEPT)
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
      }))
    },
    enabled: !!studentId,
    refetchInterval: 2000,
  })
}

// ─────────────────────────────────────────────
// AI 호출 횟수
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
// 🔥 인성 AI 분석 - basic-analyze 호출 (스피치구조 + 진로컨셉)
// ─────────────────────────────────────────────

const BASIC_AI_LIMIT = 1  // 1차 분석 최대 1회

export function useAIAnalyzeBasicAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      questionId,
      question,
      studentAnswer,
      answerId,
      studentId,
    }: {
      questionId: string       // 🔥 스피치 구조 조회용 (필수)
      question: string
      studentAnswer: string
      answerId?: string
      studentId?: string       // 🔥 진로 컨셉 검증용
    }): Promise<BasicAnalysisData> => {
      // 호출수 제한 체크 (round 1)
      if (answerId) {
        const currentCount = await getAICallCount(answerId, 1)
        if (currentCount >= BASIC_AI_LIMIT) {
          throw new Error(`AI 분석은 최대 ${BASIC_AI_LIMIT}회까지만 가능합니다. (현재 ${currentCount}회 사용)`)
        }
      }

      // 🔥 인성 전용 함수 호출
      const { data, error } = await supabase.functions.invoke('basic-analyze', {
        body: {
          questionId,
          question,
          studentAnswer,
          studentId,
        },
      })

      if (error) {
        throw new Error('AI 분석 호출 실패: ' + error.message)
      }
      if (!data?.success || !data?.analysis) {
        throw new Error('AI 응답이 없습니다: ' + JSON.stringify(data).substring(0, 200))
      }

      const analysis = data.analysis as BasicAnalysisData

      // DB 저장 + 카운트 +1 (기출문제와 동일 테이블/구조)
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
// 🔥 인성 AI 2차 비교 분석 - basic-feedback 호출
// ─────────────────────────────────────────────

export interface BasicSecondData {
  beforeDistribution: Array<{ factorCode: string; factorName: string; distribution: number; evidence: string }>
  afterDistribution: Array<{ factorCode: string; factorName: string; distribution: number; evidence: string }>
  structureComment: string
  practiceAnswer: string
}

export function useAIGenerateBasicFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      questionId,
      question,
      firstAnswer,
      secondAnswer,
      firstAnalysisJson,
      studentId,
      answerId,
    }: {
      questionId: string
      question: string
      firstAnswer: string
      secondAnswer: string
      firstAnalysisJson?: any
      studentId?: string
      answerId?: string
    }): Promise<BasicSecondData> => {
      // 호출수 제한 체크 (round 2)
      if (answerId) {
        const currentCount = await getAICallCount(answerId, 2)
        if (currentCount >= BASIC_AI_LIMIT) {
          throw new Error(`2차 AI 분석은 최대 ${BASIC_AI_LIMIT}회까지만 가능합니다. (현재 ${currentCount}회 사용)`)
        }
      }

      const { data, error } = await supabase.functions.invoke('basic-feedback', {
        body: {
          questionId,
          question,
          firstAnswer,
          secondAnswer,
          firstAnalysisJson,
          studentId,
        },
      })

      if (error) {
        throw new Error('AI 비교 분석 호출 실패: ' + error.message)
      }
      if (!data?.success || !data?.feedback) {
        throw new Error('AI 응답이 없습니다: ' + JSON.stringify(data).substring(0, 200))
      }

      const feedback = data.feedback as BasicSecondData

      // DB 저장 + 카운트 +1 (round 2)
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
// 🔥 인성 전용 선생님 피드백 초안 - basic-suggest-feedback 호출
// (스피치 구조 + 진로 컨셉 기반, 학교평가기준 없음)
// ─────────────────────────────────────────────

export function useAISuggestBasicFeedback() {
  return useMutation({
    mutationFn: async ({
      questionId,
      question,
      studentAnswer,
      secondAnswer,
      aiAnalysis,
      feedbackType,
      studentId,
    }: {
      questionId: string
      question: string
      studentAnswer: string
      secondAnswer?: string
      aiAnalysis?: any
      feedbackType: 'first' | 'final'
      studentId?: string
    }): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('basic-suggest-feedback', {
        body: {
          questionId,
          question,
          studentAnswer,
          secondAnswer,
          aiAnalysis,
          feedbackType,
          studentId,
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
// Mock (함수 실패 시 폴백)
// ─────────────────────────────────────────────

export function getMockBasicAnalysis(): BasicAnalysisData {
  return {
    structureCheck: {
      speechType: '일반 인성',
      score: 50,
      matchLevel: '보통',
      covered: ['답변의 기본 요지를 제시함'],
      missing: ['구체적 사례가 부족함', '진로와의 연결이 약함'],
      structureFeedback: '(임시) AI 분석을 불러오지 못해 예시 데이터를 표시합니다.',
      improvement: '구체적인 경험과 느낀 점을 추가하면 답변이 탄탄해집니다.',
    },
    summary: '(임시) AI 분석 결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
    strengths: ['답변을 작성함'],
    improvements: ['구체화 필요'],
    tailSuggestions: ['그 경험에서 가장 기억에 남는 순간은?'],
    conceptCheck: null,
  }
}