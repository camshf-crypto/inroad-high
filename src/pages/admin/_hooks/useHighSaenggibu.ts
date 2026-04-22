import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export type SaenggibuCategory = '세특' | '동아리' | '자율' | '진로'
export type SaenggibuStatus = 'draft' | 'published'

export interface SaenggibuItem {
  id: string
  student_id: string
  grade: number
  category: SaenggibuCategory
  subject: string | null
  content: string | null
  char_count: number
  status: SaenggibuStatus
  ai_generated: boolean
  last_generated_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export const gradeToNum = (grade: string): number => {
  if (grade === '고1' || grade === '1') return 1
  if (grade === '고2' || grade === '2') return 2
  if (grade === '고3' || grade === '3') return 3
  return 1
}

export const numToGrade = (n: number): string => `고${n}`

export const parseSubjects = (str: string | null | undefined): string[] => {
  if (!str) return []
  return str.split('·').map(s => s.trim()).filter(Boolean)
}

// ─────────────────────────────────────────────
// 1. 생기부 항목 전체 조회
// ─────────────────────────────────────────────

export function useStudentSaenggibu(studentId: string, grade: number) {
  return useQuery({
    queryKey: ['admin-saenggibu', studentId, grade],
    queryFn: async (): Promise<SaenggibuItem[]> => {
      const { data, error } = await supabase
        .from('high_saenggibu_item')
        .select('*')
        .eq('student_id', studentId)
        .eq('grade', grade)
        .order('category')
        .order('subject')
      if (error) throw error
      return data as SaenggibuItem[]
    },
    enabled: !!studentId,
  })
}

// ─────────────────────────────────────────────
// 2. 학생이 쓴 과목 자동 추출
// ─────────────────────────────────────────────

export function useStudentSubjects(studentId: string, grade: number) {
  return useQuery({
    queryKey: ['admin-student-subjects', studentId, grade],
    queryFn: async (): Promise<string[]> => {
      const gradeStr = numToGrade(grade)

      const { data: researches } = await supabase
        .from('high_research')
        .select('subject, grade')
        .eq('student_id', studentId)

      const { data: readings } = await supabase
        .from('high_reading')
        .select('subject, grade')
        .eq('student_id', studentId)

      const { data: existing } = await supabase
        .from('high_saenggibu_item')
        .select('subject')
        .eq('student_id', studentId)
        .eq('grade', grade)
        .eq('category', '세특')

      const subjectSet = new Set<string>()

      researches?.forEach(r => {
        if (!r.subject) return
        const rGrade = String(r.grade)
        if (rGrade === gradeStr || rGrade === String(grade)) {
          parseSubjects(r.subject).forEach(s => subjectSet.add(s))
        }
      })

      readings?.forEach(r => {
        if (!r.subject) return
        const rGrade = String(r.grade)
        if (rGrade === gradeStr || rGrade === String(grade)) {
          parseSubjects(r.subject).forEach(s => subjectSet.add(s))
        }
      })

      existing?.forEach(e => {
        if (e.subject) subjectSet.add(e.subject)
      })

      return Array.from(subjectSet).sort()
    },
    enabled: !!studentId,
  })
}

// ─────────────────────────────────────────────
// 3. 저장 (수동 insert/update - upsert 대신)
//    DB의 unique index가 coalesce 표현식이라 upsert가 안 먹음 → 수동 분기
// ─────────────────────────────────────────────

interface UpsertSaenggibuInput {
  student_id: string
  grade: number
  category: SaenggibuCategory
  subject?: string | null
  content: string
  status?: SaenggibuStatus
  ai_generated?: boolean
}

export function useUpsertSaenggibu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpsertSaenggibuInput): Promise<SaenggibuItem> => {
      // 1. 기존 row가 있는지 조회
      let query = supabase
        .from('high_saenggibu_item')
        .select('id')
        .eq('student_id', input.student_id)
        .eq('grade', input.grade)
        .eq('category', input.category)

      // subject가 null이면 .is('subject', null), 아니면 .eq
      if (input.subject === null || input.subject === undefined) {
        query = query.is('subject', null)
      } else {
        query = query.eq('subject', input.subject)
      }

      const { data: existing, error: qErr } = await query.maybeSingle()
      if (qErr) throw qErr

      // 2. 있으면 update, 없으면 insert
      const payload: any = {
        content: input.content,
      }
      if (input.status) payload.status = input.status
      if (input.ai_generated !== undefined) {
        payload.ai_generated = input.ai_generated
        if (input.ai_generated) {
          payload.last_generated_at = new Date().toISOString()
        }
      }

      if (existing) {
        // 기존 row 업데이트
        const { data, error } = await supabase
          .from('high_saenggibu_item')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        return data as SaenggibuItem
      } else {
        // 새 row 삽입
        const insertPayload = {
          student_id: input.student_id,
          grade: input.grade,
          category: input.category,
          subject: input.subject || null,
          status: input.status ?? 'draft',
          ai_generated: input.ai_generated ?? false,
          ...payload,
        }
        const { data, error } = await supabase
          .from('high_saenggibu_item')
          .insert(insertPayload)
          .select()
          .single()
        if (error) throw error
        return data as SaenggibuItem
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['admin-saenggibu', variables.student_id, variables.grade]
      })
      qc.invalidateQueries({
        queryKey: ['admin-student-subjects', variables.student_id, variables.grade]
      })
    },
  })
}

// ─────────────────────────────────────────────
// 4. 삭제
// ─────────────────────────────────────────────

export function useDeleteSaenggibu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('high_saenggibu_item')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-saenggibu'] })
      qc.invalidateQueries({ queryKey: ['admin-student-subjects'] })
    },
  })
}

// ─────────────────────────────────────────────
// 5. 게시/비공개 토글
// ─────────────────────────────────────────────

export function useTogglePublish() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, publish }: { id: string, publish: boolean }): Promise<SaenggibuItem> => {
      const { data, error } = await supabase
        .from('high_saenggibu_item')
        .update({
          status: publish ? 'published' : 'draft',
          published_at: publish ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as SaenggibuItem
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-saenggibu'] })
    },
  })
}

// ─────────────────────────────────────────────
// 6. 학년 전체 게시
// ─────────────────────────────────────────────

export function usePublishAllGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, grade, publish }: {
      studentId: string, grade: number, publish: boolean
    }): Promise<void> => {
      const { error } = await supabase
        .from('high_saenggibu_item')
        .update({
          status: publish ? 'published' : 'draft',
          published_at: publish ? new Date().toISOString() : null,
        })
        .eq('student_id', studentId)
        .eq('grade', grade)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['admin-saenggibu', variables.studentId, variables.grade]
      })
    },
  })
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

export function findItem(
  items: SaenggibuItem[],
  category: SaenggibuCategory,
  subject?: string | null
): SaenggibuItem | undefined {
  return items.find(
    i => i.category === category && (i.subject || null) === (subject || null)
  )
}