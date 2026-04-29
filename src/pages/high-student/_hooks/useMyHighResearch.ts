import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'

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
  grade: number | null
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
}

// 폴링 주기 (ms)
const POLL_INTERVAL = 2000

// 학년 변환 헬퍼 ('고1' → 1)
const gradeToNum = (grade: string | undefined | null): number | null => {
  if (!grade) return null
  if (grade === '고1' || grade === '1') return 1
  if (grade === '고2' || grade === '2') return 2
  if (grade === '고3' || grade === '3') return 3
  return null
}

// ─────────────────────────────────────────────
// 조회 (폴링)
// ─────────────────────────────────────────────

export function useMyResearches() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined

  return useQuery({
    queryKey: ['my-researches', studentId],
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

export function buildMessages(
  research: Research | undefined,
  analyses: ResearchAnalysis[],
): Message[] {
  const msgs: Message[] = []
  if (!research) return msgs

  if (research.content || research.topic) {
    const parts: string[] = []
    if (research.topic) parts.push(`📌 탐구 제목\n${research.topic}`)
    if (research.subject) parts.push(`📚 연계 과목\n${research.subject}`)
    if (research.content) parts.push(`📝 탐구 내용\n${research.content}`)

    msgs.push({
      role: 'student',
      text: parts.join('\n\n'),
      date: formatDate(research.created_at),
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
// Mutation (학생 전용)
// ─────────────────────────────────────────────

export function useCreateResearch() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      topic: string
      subject?: string
      content: string
    }) => {
      if (!studentId) throw new Error('로그인이 필요해요')
      const { topic, subject, content } = params

      // 🎯 학생 학년 자동 저장
      const grade = gradeToNum(student?.grade as any)

      const { data, error } = await supabase
        .from('high_research')
        .insert({
          student_id: studentId,
          topic,
          subject: subject ?? null,
          content,
          status: 'in_progress',
          grade,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-researches', studentId] })
    },
  })
}

/**
 * 학생 메시지 전송 (409 Conflict 해결)
 *
 * 규칙:
 * - analysis가 없음 → round 1 새로 만들고 revised_content 채움
 * - 마지막 row에 teacher_feedback 있음 → 다음 round 새로 만들고 revised_content 채움
 * - 마지막 row에 teacher_feedback 없음 → 같은 row에 revised_content 업데이트 or append
 *   (unique constraint (research_id, round) 위반 방지)
 */
export function useSendStudentMessage(researchId: string) {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (text: string) => {
      if (!studentId) throw new Error('로그인이 필요해요')

      const { data: last, error: qErr } = await supabase
        .from('high_research_analysis')
        .select('id, round, teacher_feedback, revised_content')
        .eq('research_id', researchId)
        .order('round', { ascending: false })
        .limit(1)

      if (qErr) throw qErr

      const lastRow = last?.[0]

      if (!lastRow) {
        const { error } = await supabase
          .from('high_research_analysis')
          .insert({
            research_id: researchId,
            student_id: studentId,
            round: 1,
            revised_content: text,
            status: 'pending',
          })
        if (error) throw error
        return
      }

      if (lastRow.teacher_feedback) {
        const { error } = await supabase
          .from('high_research_analysis')
          .insert({
            research_id: researchId,
            student_id: studentId,
            round: lastRow.round + 1,
            revised_content: text,
            status: 'pending',
          })
        if (error) throw error
        return
      }

      const merged = lastRow.revised_content
        ? `${lastRow.revised_content}\n\n${text}`
        : text

      const { error } = await supabase
        .from('high_research_analysis')
        .update({ revised_content: merged })
        .eq('id', lastRow.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['research-analyses', researchId] })
    },
  })
}

export function useDeleteResearch() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (researchId: string) => {
      const { error } = await supabase
        .from('high_research')
        .delete()
        .eq('id', researchId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-researches', studentId] })
    },
  })
}