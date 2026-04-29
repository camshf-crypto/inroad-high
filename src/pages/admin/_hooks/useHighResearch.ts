import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface Research {
  id: string
  student_id: string
  subject: string | null
  topic: string
  motivation: string | null
  plan: string | null
  content: string | null
  result: string | null
  status: string | null
  created_at: string
  updated_at: string
}

export interface ResearchAnalysis {
  id: string
  research_id: string
  student_id: string
  round: number
  revised_content: string | null
  teacher_feedback: string | null
  status: string | null
  published_at: string | null
  created_at: string
}

export interface Message {
  role: 'student' | 'teacher'
  text: string
  date: string
  source: 'research' | 'analysis'
  round?: number
}

// 폴링 주기 (ms)
const POLL_INTERVAL = 2000

// ─────────────────────────────────────────────
// 조회 (폴링)
// ─────────────────────────────────────────────

export function useStudentResearches(studentId: string | undefined) {
  return useQuery({
    queryKey: ['researches', studentId],
    enabled: !!studentId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<Research[]> => {
      const { data, error } = await supabase
        .from('high_research')
        .select('*')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useResearchAnalyses(researchId: string | undefined) {
  return useQuery({
    queryKey: ['research-analyses', researchId],
    enabled: !!researchId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<ResearchAnalysis[]> => {
      const { data, error } = await supabase
        .from('high_research_analysis')
        .select('*')
        .eq('research_id', researchId!)
        .order('round', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

/**
 * 탐구주제 + analysis를 시간순 메시지 배열로 변환
 */
export function buildMessages(
  research: Research | undefined,
  analyses: ResearchAnalysis[],
): Message[] {
  const msgs: Message[] = []
  if (!research) return msgs

  // 첫 메시지: 탐구 제목 + 연계 과목 + 탐구 내용
  if (research.content || research.topic) {
    const parts: string[] = []
    if (research.topic) parts.push(`📌 탐구 제목\n${research.topic}`)
    if (research.subject) parts.push(`📚 연계 과목\n${research.subject}`)
    if (research.content) parts.push(`📝 탐구 내용\n${research.content}`)

    msgs.push({
      role: 'student',
      text: parts.join('\n\n'),
      date: formatDate(research.created_at),
      source: 'research',
    })
  }

  for (const a of analyses) {
    if (a.revised_content) {
      msgs.push({
        role: 'student',
        text: a.revised_content,
        date: formatDate(a.created_at),
        source: 'analysis',
        round: a.round,
      })
    }
    if (a.teacher_feedback) {
      msgs.push({
        role: 'teacher',
        text: a.teacher_feedback,
        date: formatDate(a.published_at ?? a.created_at),
        source: 'analysis',
        round: a.round,
      })
    }
  }

  return msgs
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─────────────────────────────────────────────
// Mutation (원장 전용)
// ─────────────────────────────────────────────

export function useSendTeacherFeedback(researchId: string, studentId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (feedback: string) => {
      const { data: rows, error: qErr } = await supabase
        .from('high_research_analysis')
        .select('round')
        .eq('research_id', researchId)
        .order('round', { ascending: false })
        .limit(1)

      if (qErr) throw qErr

      const nextRound = (rows && rows[0]?.round ? rows[0].round : 0) + 1

      const { error } = await supabase
        .from('high_research_analysis')
        .insert({
          research_id: researchId,
          student_id: studentId,
          round: nextRound,
          teacher_feedback: feedback,
          status: 'published',
          published_at: new Date().toISOString(),
        })

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['research-analyses', researchId] })
    },
  })
}

export function useCompleteResearch(researchId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('high_research')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', researchId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['researches'] })
    },
  })
}

export function useUncompleteResearch(researchId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('high_research')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', researchId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['researches'] })
    },
  })
}