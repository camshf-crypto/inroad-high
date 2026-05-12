// src/pages/admin/_hooks/middle/useAiEssay.ts
// 자소서 AI 분석 + 예상질문 생성 — Edge Function 호출

import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ============================================================
// 1. 자소서 항목별 AI 분석
// ============================================================
export interface SectionAnalysisResult {
  evalCriteria: string
  scores: { label: string; score: number; max: number; desc: string }[]
  studentScores: number[]
  totalScore: number
  summary: string
  strengths: string[]
  improvements: string[]
  reflectiveQuestions?: string[]
  keywordReflection: string
  teacherDraft: string
}

export interface AnalyzeSectionInput {
  schoolName: string
  sectionKey: '자기주도학습 과정' | '지원동기' | '활동계획' | '진로계획' | '인성'
  sectionLabel: string
  answerText: string
  keywords?: string[]
  studentName?: string
  previousAnswer?: string
  previousFeedback?: string
}

export function useAnalyzeSection() {
  return useMutation({
    mutationFn: async (input: AnalyzeSectionInput): Promise<SectionAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke('middle-essay-analyze', {
        body: input,
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'AI 분석 실패')

      return data.analysis as SectionAnalysisResult
    },
  })
}

// ============================================================
// 2. 자소서 → 예상질문 AI 생성
// ============================================================
export interface GeneratedQuestion {
  text: string
  tag: string
  purpose: string[]
  targetSection: string
}

export interface GenerateQuestionsInput {
  schoolName: string
  studentName?: string
  sections: {
    지원동기?: string
    활동계획?: string
    진로계획?: string
    인성?: string
  }
  keywords?: string[]
  count?: number
}

export function useGenerateQuestionsAi() {
  return useMutation({
    mutationFn: async (input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> => {
      const { data, error } = await supabase.functions.invoke('middle-essay-questions', {
        body: { count: 8, ...input },
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || '예상질문 생성 실패')

      return data.questions as GeneratedQuestion[]
    },
  })
}

// ============================================================
// 3. 학생 답변 분석 (예상질문에 대한 답변)
// ============================================================
export interface AnalyzeAnswerInput {
  schoolName: string
  questionText: string
  studentAnswer: string
  questionPurpose?: string[]
  studentName?: string
  isUpgrade?: boolean
  previousFeedback?: string
}

export function useAnalyzeAnswer() {
  return useMutation({
    mutationFn: async (input: AnalyzeAnswerInput): Promise<SectionAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke('middle-essay-analyze-answer', {
        body: {
          schoolName: input.schoolName,
          questionText: input.questionText,
          studentAnswer: input.studentAnswer,
          questionPurpose: input.questionPurpose,
          studentName: input.studentName,
          isUpgrade: input.isUpgrade,
          previousFeedback: input.previousFeedback,
        },
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || '답변 분석 실패')

      return data.analysis as SectionAnalysisResult
    },
  })
}