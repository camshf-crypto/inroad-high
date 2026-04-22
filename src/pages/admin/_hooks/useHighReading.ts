import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface Reading {
  id: string
  student_id: string
  subject: string | null
  book_title: string
  author: string | null
  reason: string | null
  plan: string | null
  notes: string | null
  linked_research_id: string | null
  teacher_feedback: string | null
  status: string | null
  published_at: string | null
  created_at: string
}

export interface ReadingAnalysis {
  id: string
  reading_id: string
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
}

const POLL_INTERVAL = 2000

// ─────────────────────────────────────────────
// 조회
// ─────────────────────────────────────────────

export function useStudentReadings(studentId: string | undefined) {
  return useQuery({
    queryKey: ['readings', studentId],
    enabled: !!studentId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<Reading[]> => {
      const { data, error } = await supabase
        .from('high_reading')
        .select('*')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useReadingAnalyses(readingId: string | undefined) {
  return useQuery({
    queryKey: ['reading-analyses', readingId],
    enabled: !!readingId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<ReadingAnalysis[]> => {
      const { data, error } = await supabase
        .from('high_reading_analysis')
        .select('*')
        .eq('reading_id', readingId!)
        .order('round', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

/**
 * reading + analysis를 시간순 메시지 배열로 변환
 * 첫 메시지: 책 제목 + 저자 + 연계 과목 + 읽는 이유 + 활동 계획
 */
export function buildReadingMessages(
  reading: Reading | undefined,
  analyses: ReadingAnalysis[],
): Message[] {
  const msgs: Message[] = []
  if (!reading) return msgs

  // 첫 메시지: 책 정보 + 이유 + 활동 계획
  const parts: string[] = []
  if (reading.book_title) {
    const author = reading.author ? ` · ${reading.author}` : ''
    parts.push(`📘 책 정보\n${reading.book_title}${author}`)
  }
  if (reading.subject) parts.push(`🎯 연계 과목\n${reading.subject}`)
  if (reading.reason) parts.push(`💭 읽으려는 이유\n${reading.reason}`)
  if (reading.plan) parts.push(`📝 활동 계획\n${reading.plan}`)

  if (parts.length > 0) {
    msgs.push({
      role: 'student',
      text: parts.join('\n\n'),
      date: formatDate(reading.created_at),
    })
  }

  for (const a of analyses) {
    if (a.revised_content) {
      msgs.push({
        role: 'student',
        text: a.revised_content,
        date: formatDate(a.created_at),
      })
    }
    if (a.teacher_feedback) {
      msgs.push({
        role: 'teacher',
        text: a.teacher_feedback,
        date: formatDate(a.published_at ?? a.created_at),
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

export function useSendReadingTeacherFeedback(readingId: string, studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (feedback: string) => {
      const { data: rows, error: qErr } = await supabase
        .from('high_reading_analysis')
        .select('round')
        .eq('reading_id', readingId)
        .order('round', { ascending: false })
        .limit(1)

      if (qErr) throw qErr

      const nextRound = (rows && rows[0]?.round ? rows[0].round : 0) + 1

      const { error } = await supabase
        .from('high_reading_analysis')
        .insert({
          reading_id: readingId,
          student_id: studentId,
          round: nextRound,
          teacher_feedback: feedback,
          status: 'published',
          published_at: new Date().toISOString(),
        })

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reading-analyses', readingId] })
    },
  })
}

export function useCompleteReading(readingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('high_reading')
        .update({ status: 'completed' })
        .eq('id', readingId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['readings'] })
    },
  })
}

export function useUncompleteReading(readingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('high_reading')
        .update({ status: 'in_progress' })
        .eq('id', readingId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['readings'] })
    },
  })
}