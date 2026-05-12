// src/pages/middle-student/_hooks/useEssayWizard.ts
// 5단계 자소서 작성 마법사 DB 연동
// - 학생이 작성하는 동안 자동 저장 (debounce 1.5초)
// - 다시 들어오면 이어서 작성 가능
// - 🎯 4영역: 자기주도학습 / 지원동기 / 진로계획 / 인성
// - 🎯 마인드맵 5가지: 학교생활 / 동아리 / 독서학습 / 봉사인성 / 학교관심

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ============================================================
// 타입
// ============================================================
export interface KeywordRow {
  keyword: string
  experience: string
}

// 🎯 학교관심 가지 추가 (5가지)
export interface MindmapData {
  학교생활: string[]
  동아리: string[]
  독서학습: string[]
  봉사인성: string[]
  학교관심: string[]
}

// 🎯 4영역 (활동계획 제거 → 자기주도학습 추가)
export interface MatchingData {
  자기주도학습: string[]
  지원동기: string[]
  진로계획: string[]
  인성: string[]
}

export interface SubAnswer {
  q1: string
  q2: string
  q3: string
  q4: string
}

// 🎯 4영역
export interface SectionsData {
  자기주도학습: SubAnswer
  지원동기: SubAnswer
  진로계획: SubAnswer
  인성: SubAnswer
}

export interface EssayWizardRow {
  id: string
  essay_id: string
  student_id: string
  academy_id: string | null
  keywords: KeywordRow[]
  mindmap: MindmapData
  matching: MatchingData
  sections: SectionsData
  current_step: number
  created_at: string
  updated_at: string
  feedback?: FeedbackData
  submitted?: boolean
}

// 6단계: 선생님 피드백 데이터
export interface FeedbackItem {
  round: number
  text: string
  created_at: string
}

// 🎯 4영역에 맞춰 피드백 키도 변경
export interface FeedbackData {
  자기주도학습?: FeedbackItem[]
  지원동기?: FeedbackItem[]
  진로계획?: FeedbackItem[]
  인성?: FeedbackItem[]
}

export interface EssayWizardData {
  keywords: KeywordRow[]
  mindmap: MindmapData
  matching: MatchingData
  sections: SectionsData
  current_step: number
}

// ============================================================
// 1. 마법사 데이터 조회
// ============================================================
export function useEssayWizard(essayId: string | undefined) {
  return useQuery({
    queryKey: ['middle-essay-wizard', essayId],
    queryFn: async () => {
      if (!essayId) return null

      const { data, error } = await supabase
        .from('middle_essay_wizard')
        .select('*')
        .eq('essay_id', essayId)
        .maybeSingle()

      if (error) throw error
      return data as EssayWizardRow | null
    },
    enabled: !!essayId,
  })
}

// ============================================================
// 2. 마법사 데이터 저장 (upsert)
// ============================================================
export function useSaveEssayWizard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: {
      essay_id: string
      student_id: string
      academy_id: string | null
      data: EssayWizardData
    }) => {
      const { essay_id, student_id, academy_id, data } = args

      // 먼저 기존 row 있는지 확인
      const { data: existing } = await supabase
        .from('middle_essay_wizard')
        .select('id')
        .eq('essay_id', essay_id)
        .maybeSingle()

      if (existing) {
        // UPDATE
        const { data: updated, error } = await supabase
          .from('middle_essay_wizard')
          .update({
            keywords: data.keywords,
            mindmap: data.mindmap,
            matching: data.matching,
            sections: data.sections,
            current_step: data.current_step,
            updated_at: new Date().toISOString(),
          })
          .eq('essay_id', essay_id)
          .select()
          .single()

        if (error) throw error
        return updated as EssayWizardRow
      } else {
        // INSERT
        const { data: inserted, error } = await supabase
          .from('middle_essay_wizard')
          .insert({
            essay_id,
            student_id,
            academy_id,
            keywords: data.keywords,
            mindmap: data.mindmap,
            matching: data.matching,
            sections: data.sections,
            current_step: data.current_step,
          })
          .select()
          .single()

        if (error) throw error
        return inserted as EssayWizardRow
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['middle-essay-wizard', variables.essay_id],
      })
    },
  })
}

// ============================================================
// 3. 마법사 데이터 삭제 (자소서 삭제 시 같이)
// ============================================================
export function useDeleteEssayWizard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (essayId: string) => {
      const { error } = await supabase
        .from('middle_essay_wizard')
        .delete()
        .eq('essay_id', essayId)

      if (error) throw error
    },
    onSuccess: (_, essayId) => {
      queryClient.invalidateQueries({
        queryKey: ['middle-essay-wizard', essayId],
      })
    },
  })
}

// ============================================================
// 4. 선생님께 제출 (5단계 → 6단계 진입)
// ============================================================
export function useSubmitToTeacher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (essayId: string) => {
      const { error } = await supabase
        .from('middle_essay_wizard')
        .update({
          submitted: true,
          current_step: 6,
          updated_at: new Date().toISOString(),
        })
        .eq('essay_id', essayId)

      if (error) throw error
    },
    onSuccess: (_, essayId) => {
      queryClient.invalidateQueries({
        queryKey: ['middle-essay-wizard', essayId],
      })
    },
  })
}