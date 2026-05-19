import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'

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
  grade: number | null
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

export const gradeToNum = (grade: string | undefined | null): number | null => {
  if (!grade) return null
  if (grade === '고1' || grade === '1') return 1
  if (grade === '고2' || grade === '2') return 2
  if (grade === '고3' || grade === '3') return 3
  return null
}

// ── gradeNum 파라미터 추가 (null/undefined면 전체) ──
export function useMyReadings(gradeNum?: number | null) {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined

  return useQuery({
    queryKey: ['my-readings', studentId, gradeNum],
    enabled: !!studentId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<Reading[]> => {
      let query = supabase
        .from('high_reading')
        .select('*')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false })

      if (gradeNum != null) {
        query = query.eq('grade', gradeNum)
      }

      const { data, error } = await query
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

export function buildReadingMessages(
  reading: Reading | undefined,
  analyses: ReadingAnalysis[],
): Message[] {
  const msgs: Message[] = []
  if (!reading) return msgs

  const parts: string[] = []
  if (reading.book_title) {
    const author = reading.author ? ` · ${reading.author}` : ''
    parts.push(`📘 책 정보\n${reading.book_title}${author}`)
  }
  if (reading.subject) parts.push(`🎯 연계 과목\n${reading.subject}`)
  if (reading.reason) parts.push(`💭 읽으려는 이유\n${reading.reason}`)
  if (reading.plan) parts.push(`📝 활동 계획\n${reading.plan}`)

  if (parts.length > 0) {
    msgs.push({ role: 'student', text: parts.join('\n\n'), date: formatDate(reading.created_at) })
  }

  for (const a of analyses) {
    if (a.revised_content) msgs.push({ role: 'student', text: a.revised_content, date: formatDate(a.created_at) })
    if (a.teacher_feedback) msgs.push({ role: 'teacher', text: a.teacher_feedback, date: formatDate(a.published_at ?? a.created_at) })
  }

  return msgs
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useCreateReading() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      book_title: string
      author?: string
      subject?: string
      reason: string
      plan?: string
      grade?: number
    }) => {
      if (!studentId) throw new Error('로그인이 필요해요')
      const { book_title, author, subject, reason, plan, grade: paramGrade } = params
      const grade = paramGrade ?? gradeToNum(student?.grade as any)

      const { data, error } = await supabase
        .from('high_reading')
        .insert({
          student_id: studentId,
          book_title,
          author: author ?? null,
          subject: subject ?? null,
          reason,
          plan: plan ?? null,
          status: 'in_progress',
          grade,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-readings', studentId] })
    },
  })
}

export function useSendReadingStudentMessage(readingId: string) {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (text: string) => {
      if (!studentId) throw new Error('로그인이 필요해요')

      const { data: last, error: qErr } = await supabase
        .from('high_reading_analysis')
        .select('id, round, teacher_feedback, revised_content')
        .eq('reading_id', readingId)
        .order('round', { ascending: false })
        .limit(1)
      if (qErr) throw qErr

      const lastRow = last?.[0]

      if (!lastRow) {
        const { error } = await supabase.from('high_reading_analysis').insert({
          reading_id: readingId, student_id: studentId, round: 1, revised_content: text, status: 'pending',
        })
        if (error) throw error
        return
      }

      if (lastRow.teacher_feedback) {
        const { error } = await supabase.from('high_reading_analysis').insert({
          reading_id: readingId, student_id: studentId, round: lastRow.round + 1, revised_content: text, status: 'pending',
        })
        if (error) throw error
        return
      }

      const merged = lastRow.revised_content ? `${lastRow.revised_content}\n\n${text}` : text
      const { error } = await supabase.from('high_reading_analysis').update({ revised_content: merged }).eq('id', lastRow.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reading-analyses', readingId] })
    },
  })
}

export function useDeleteReading() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (readingId: string) => {
      const { error } = await supabase.from('high_reading').delete().eq('id', readingId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-readings', studentId] })
    },
  })
}