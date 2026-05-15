import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export type SaenggibuCategory = '세특' | '동아리' | '자율' | '진로'
export type SaenggibuStatus = 'draft' | 'published'
export type GenerationMode = 'accumulating' | 'finalized'

export interface MiddleSaenggibuItem {
  id: string
  student_id: string
  grade: number
  semester: number
  category: SaenggibuCategory
  subject: string | null
  content: string | null
  char_count: number
  status: SaenggibuStatus
  generation_mode: GenerationMode
  ai_generated: boolean
  last_generated_at: string | null
  emphasis_direction: string | null
  source_submission_ids: string[]
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface MiddleSemesterLock {
  id: string
  academy_id: string
  grade: number
  semester: number
  deadline_at: string | null
  locked_at: string | null
  locked_manually: boolean
  note: string | null
  created_at: string
  updated_at: string
}

export interface MySuhaengSubmission {
  id: string
  student_id: string
  question_title: string | null
  question_content: string | null
  question_category: string | null
  question_subject: string | null
  answer_text: string | null
  answer_sections: any
  status: string
  submitted_at: string | null
  resubmitted_at: string | null
  created_at: string
}

// ─────────────────────────────────────────────
// 헬퍼: 학년/학기 변환
// ─────────────────────────────────────────────

export const gradeToNum = (grade: string | number): number => {
  if (typeof grade === 'number') return grade
  if (grade === '중1' || grade === '1') return 1
  if (grade === '중2' || grade === '2') return 2
  if (grade === '중3' || grade === '3') return 3
  return 1
}

export const numToGrade = (n: number): string => `중${n}`

export const SEMESTER_LIST = [1, 2] as const
export const GRADE_LIST = ['중1', '중2', '중3'] as const

/** 날짜 → 학기 (3~7월=1학기, 8~2월=2학기) */
export const getSemesterFromDate = (date: Date | string | null | undefined): 1 | 2 => {
  if (!date) return 1
  const month = new Date(date).getMonth() + 1
  if (month >= 3 && month <= 7) return 1
  return 2
}

/** 제출물의 학기 (resubmitted > submitted > created) */
export const getSubmissionSemester = (sub: MySuhaengSubmission): 1 | 2 => {
  return getSemesterFromDate(sub.resubmitted_at || sub.submitted_at || sub.created_at)
}

/** "국어·수학" → ["국어", "수학"] */
export const parseSubjects = (str: string | null | undefined): string[] => {
  if (!str) return []
  return str.split('·').map(s => s.trim()).filter(Boolean)
}

export const firstSubject = (str: string | null | undefined): string | null => {
  return parseSubjects(str)[0] || null
}

/** 헬퍼: 항목 찾기 (category + subject 조합) */
export function findItem(
  items: MiddleSaenggibuItem[],
  category: SaenggibuCategory,
  subject?: string | null
): MiddleSaenggibuItem | undefined {
  return items.find(
    (i: MiddleSaenggibuItem) => i.category === category && (i.subject || null) === (subject || null)
  )
}

/** 헬퍼: 세특에 등장한 과목 목록 (가나다순) */
export function getSubjectsInSemester(items: MiddleSaenggibuItem[]): string[] {
  const set = new Set<string>()
  items.forEach((i: MiddleSaenggibuItem) => {
    if (i.category === '세특' && i.subject) set.add(i.subject)
  })
  return Array.from(set).sort()
}

/** 잠금 여부 판정 (deadline_at이 지났거나 locked_at이 있으면 잠긴 것) */
export function isLocked(lock: MiddleSemesterLock | null | undefined): boolean {
  if (!lock) return false
  if (lock.locked_at) return true
  if (lock.deadline_at && new Date(lock.deadline_at) <= new Date()) return true
  return false
}

/** D-day 계산 (마감까지 남은 일수, 음수면 이미 지남) */
export function daysUntilDeadline(deadlineAt: string | null | undefined): number | null {
  if (!deadlineAt) return null
  const now = new Date()
  const deadline = new Date(deadlineAt)
  const diff = deadline.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─────────────────────────────────────────────
// 1. 내 생기부 항목 조회 (published만)
// ─────────────────────────────────────────────

export function useMyMiddleSaenggibu(grade: number, semester: number) {
  return useQuery({
    queryKey: ['my-middle-saenggibu', grade, semester],
    queryFn: async (): Promise<MiddleSaenggibuItem[]> => {
      const { data, error } = await supabase
        .from('middle_saenggibu_item')
        .select('*')
        .eq('grade', grade)
        .eq('semester', semester)
        .eq('status', 'published')
        .order('category')
        .order('subject')
      if (error) throw error
      return (data as MiddleSaenggibuItem[]) || []
    },
  })
}

// ─────────────────────────────────────────────
// 2. 내 학기 마감 정보 조회 (D-day 표시용)
// ─────────────────────────────────────────────

export function useMyMiddleLock(grade: number, semester: number) {
  return useQuery({
    queryKey: ['my-middle-lock', grade, semester],
    queryFn: async (): Promise<MiddleSemesterLock | null> => {
      const { data, error } = await supabase
        .from('middle_semester_lock')
        .select('*')
        .eq('grade', grade)
        .eq('semester', semester)
        .maybeSingle()
      if (error) throw error
      return (data as MiddleSemesterLock) || null
    },
    refetchInterval: 60_000,
  })
}

// ─────────────────────────────────────────────
// 3. 내 수행평가 조회 (학기별)
// ─────────────────────────────────────────────

export function useMySuhaengSubmissions(semester: number) {
  return useQuery({
    queryKey: ['my-suhaeng-submissions', semester],
    queryFn: async (): Promise<MySuhaengSubmission[]> => {
      // RLS가 본인 것만 보여줌
      const { data, error } = await supabase
        .from('suhaeng_submissions')
        .select('id, student_id, question_title, question_content, question_category, question_subject, answer_text, answer_sections, status, submitted_at, resubmitted_at, created_at')
        .order('submitted_at', { ascending: false, nullsFirst: false })
      if (error) throw error
      if (!data) return []

      // 학기 필터 (DB에 semester 컬럼 없어서 클라이언트에서)
      return (data as MySuhaengSubmission[]).filter(
        s => getSubmissionSemester(s) === semester
          && s.question_category === 'school'
      )
    },
  })
}