import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

export interface SuhaengSubmission {
  id: string
  student_id: string
  academy_id: string
  question_key: string | null
  question_type: string | null
  question_title: string | null
  question_content: string | null
  question_category: string | null
  question_school_name: string | null
  question_subject: string | null
  question_min_chars: number | null
  question_max_chars: number | null
  answer_text: string | null
  answer_sections: any
  answer_audio_url: string | null
  answer_video_url: string | null
  answer_photo_urls: string[] | null
  status: string
  submitted_at: string | null
  resubmitted_text: string | null
  resubmitted_at: string | null
  created_at: string
  updated_at: string
}

export interface MiddleSaenggibuHistory {
  id: string
  saenggibu_item_id: string
  student_id: string
  grade: number
  semester: number
  category: SaenggibuCategory
  subject: string | null
  content: string | null
  char_count: number
  generation_mode: GenerationMode
  source_submission_ids: string[]
  trigger_type: 'submission_added' | 'finalized' | 'manual_edit' | 'reverted'
  triggered_by: string | null
  related_submission_id: string | null
  snapshot_at: string
  created_at: string
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
  created_by: string | null
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

export const gradeToNum = (grade: string | number): number => {
  if (typeof grade === 'number') return grade
  if (grade === '중1' || grade === '1') return 1
  if (grade === '중2' || grade === '2') return 2
  if (grade === '중3' || grade === '3') return 3
  return 1
}

export const numToGrade = (n: number): string => `중${n}`

/** 날짜 → 학기 (3~7월=1학기, 8~2월=2학기) */
export const getSemesterFromDate = (date: Date | string | null | undefined): 1 | 2 => {
  if (!date) return 1
  const month = new Date(date).getMonth() + 1
  if (month >= 3 && month <= 7) return 1
  return 2
}

/** 제출물의 학기 (resubmitted > submitted > created) */
export const getSubmissionSemester = (sub: SuhaengSubmission): 1 | 2 => {
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

export function findItem(
  items: MiddleSaenggibuItem[],
  category: SaenggibuCategory,
  subject?: string | null
): MiddleSaenggibuItem | undefined {
  return items.find(
    i => i.category === category && (i.subject || null) === (subject || null)
  )
}

/** 잠금 여부 (deadline 지났거나 수동 잠금) */
export function isLocked(lock: MiddleSemesterLock | null | undefined): boolean {
  if (!lock) return false
  if (lock.locked_at) return true
  if (lock.deadline_at && new Date(lock.deadline_at) <= new Date()) return true
  return false
}

// ─────────────────────────────────────────────
// 1. 학생 수행평가 제출물 조회 (학기별)
// ─────────────────────────────────────────────

export function useStudentSubmissions(
  studentId: string,
  grade: number,
  semester: number
) {
  return useQuery({
    queryKey: ['middle-submissions', studentId, grade, semester],
    queryFn: async (): Promise<SuhaengSubmission[]> => {
      const { data, error } = await supabase
        .from('suhaeng_submissions')
        .select('*')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false, nullsFirst: false })
      if (error) throw error
      if (!data) return []

      // 학기 필터 (DB에 semester 컬럼 없어서 클라이언트에서)
      return (data as SuhaengSubmission[]).filter(
        s => getSubmissionSemester(s) === semester
      )
    },
    enabled: !!studentId,
  })
}

// ─────────────────────────────────────────────
// 2. 학생 세특 항목 전체 조회 (학기별)
// ─────────────────────────────────────────────

export function useStudentMiddleSaenggibu(
  studentId: string,
  grade: number,
  semester: number
) {
  return useQuery({
    queryKey: ['middle-saenggibu', studentId, grade, semester],
    queryFn: async (): Promise<MiddleSaenggibuItem[]> => {
      const { data, error } = await supabase
        .from('middle_saenggibu_item')
        .select('*')
        .eq('student_id', studentId)
        .eq('grade', grade)
        .eq('semester', semester)
        .order('category')
        .order('subject')
      if (error) throw error
      return (data as MiddleSaenggibuItem[]) || []
    },
    enabled: !!studentId,
  })
}

// ─────────────────────────────────────────────
// 3. 제출물 기반 과목 자동 추출
// ─────────────────────────────────────────────

export function useStudentSubmissionSubjects(
  studentId: string,
  grade: number,
  semester: number
) {
  return useQuery({
    queryKey: ['middle-submission-subjects', studentId, grade, semester],
    queryFn: async (): Promise<string[]> => {
      // 제출물에서 과목 추출
      const { data: subs } = await supabase
        .from('suhaeng_submissions')
        .select('question_subject, submitted_at, resubmitted_at, created_at')
        .eq('student_id', studentId)

      // 이미 세특 작성된 과목도 포함
      const { data: existing } = await supabase
        .from('middle_saenggibu_item')
        .select('subject')
        .eq('student_id', studentId)
        .eq('grade', grade)
        .eq('semester', semester)
        .eq('category', '세특')

      const set = new Set<string>()

      subs?.forEach((s: any) => {
        const sem = getSemesterFromDate(
          s.resubmitted_at || s.submitted_at || s.created_at
        )
        if (sem !== semester) return
        parseSubjects(s.question_subject).forEach(sub => set.add(sub))
      })

      existing?.forEach(e => {
        if (e.subject) set.add(e.subject)
      })

      return Array.from(set).sort()
    },
    enabled: !!studentId,
  })
}

// ─────────────────────────────────────────────
// 4. 학기 마감 정보 조회 (학원 단위)
// ─────────────────────────────────────────────

export function useMiddleSemesterLock(
  academyId: string,
  grade: number,
  semester: number
) {
  return useQuery({
    queryKey: ['middle-semester-lock', academyId, grade, semester],
    queryFn: async (): Promise<MiddleSemesterLock | null> => {
      const { data, error } = await supabase
        .from('middle_semester_lock')
        .select('*')
        .eq('academy_id', academyId)
        .eq('grade', grade)
        .eq('semester', semester)
        .maybeSingle()
      if (error) throw error
      return (data as MiddleSemesterLock) || null
    },
    enabled: !!academyId,
    refetchInterval: 60_000,
  })
}

// ─────────────────────────────────────────────
// 5. 세특 수동 저장 (insert/update)
// ─────────────────────────────────────────────

interface UpsertSaenggibuInput {
  student_id: string
  grade: number
  semester: number
  category: SaenggibuCategory
  subject?: string | null
  content: string
  status?: SaenggibuStatus
  generation_mode?: GenerationMode
  ai_generated?: boolean
  emphasis_direction?: string | null
  source_submission_ids?: string[]
}

export function useUpsertMiddleSaenggibu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpsertSaenggibuInput): Promise<MiddleSaenggibuItem> => {
      // 기존 row 조회 (subject가 null이면 .is, 아니면 .eq)
      let query = supabase
        .from('middle_saenggibu_item')
        .select('id')
        .eq('student_id', input.student_id)
        .eq('grade', input.grade)
        .eq('semester', input.semester)
        .eq('category', input.category)

      if (input.subject === null || input.subject === undefined) {
        query = query.is('subject', null)
      } else {
        query = query.eq('subject', input.subject)
      }

      const { data: existing, error: qErr } = await query.maybeSingle()
      if (qErr) throw qErr

      const payload: any = { content: input.content }
      if (input.status) payload.status = input.status
      if (input.generation_mode) payload.generation_mode = input.generation_mode
      if (input.emphasis_direction !== undefined) payload.emphasis_direction = input.emphasis_direction
      if (input.source_submission_ids) payload.source_submission_ids = input.source_submission_ids
      if (input.ai_generated !== undefined) {
        payload.ai_generated = input.ai_generated
        if (input.ai_generated) {
          payload.last_generated_at = new Date().toISOString()
        }
      }

      if (existing) {
        const { data, error } = await supabase
          .from('middle_saenggibu_item')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        return data as MiddleSaenggibuItem
      } else {
        const insertPayload = {
          student_id: input.student_id,
          grade: input.grade,
          semester: input.semester,
          category: input.category,
          subject: input.subject || null,
          status: input.status ?? 'draft',
          generation_mode: input.generation_mode ?? 'accumulating',
          ai_generated: input.ai_generated ?? false,
          source_submission_ids: input.source_submission_ids ?? [],
          ...payload,
        }
        const { data, error } = await supabase
          .from('middle_saenggibu_item')
          .insert(insertPayload)
          .select()
          .single()
        if (error) throw error
        return data as MiddleSaenggibuItem
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['middle-saenggibu', variables.student_id, variables.grade, variables.semester]
      })
      qc.invalidateQueries({
        queryKey: ['middle-submission-subjects', variables.student_id, variables.grade, variables.semester]
      })
    },
  })
}

// ─────────────────────────────────────────────
// 6. AI 요약 누적 (수행평가 1개 → 세특에 append)
// ─────────────────────────────────────────────

interface AccumulateInput {
  student_id: string
  submission_id: string
  subject: string
  grade: number
  semester: number
}

export function useAccumulateSaenggibu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AccumulateInput): Promise<MiddleSaenggibuItem> => {
      const startedAt = Date.now()

      // 1. 제출물 가져오기
      const { data: submission, error: subErr } = await supabase
        .from('suhaeng_submissions')
        .select('*')
        .eq('id', input.submission_id)
        .single()
      if (subErr) throw subErr

      // 2. 기존 세특 가져오기 (있으면 누적할 base)
      const { data: existing } = await supabase
        .from('middle_saenggibu_item')
        .select('*')
        .eq('student_id', input.student_id)
        .eq('grade', input.grade)
        .eq('semester', input.semester)
        .eq('category', '세특')
        .eq('subject', input.subject)
        .maybeSingle()

      // 3. AI 호출
      const { data: aiData, error: aiErr } = await supabase.functions.invoke(
        'middle-generate-saenggibu',
        {
          body: {
            mode: 'summarize',
            submission,
            existingContent: existing?.content || null,
            subject: input.subject,
            grade: input.grade,
            semester: input.semester,
          },
        }
      )
      if (aiErr) throw new Error('AI 호출 실패: ' + aiErr.message)
      if (!aiData?.success || !aiData?.text) {
        throw new Error('AI 응답이 없습니다: ' + JSON.stringify(aiData).substring(0, 200))
      }

      const newContent: string = aiData.text
      const duration = Date.now() - startedAt

      // 4. AI 로그 저장
      await supabase.from('middle_ai_generation_log').insert({
        student_id: input.student_id,
        mode: 'summarize',
        saenggibu_item_id: existing?.id || null,
        related_submission_id: input.submission_id,
        input_payload: {
          submission_id: input.submission_id,
          subject: input.subject,
          grade: input.grade,
          semester: input.semester,
          had_existing: !!existing,
        },
        output_text: newContent,
        output_metadata: aiData.metadata || null,
        model_name: aiData.model || null,
        prompt_version: 'middle-summarize-v1',
        grade: input.grade,
        semester: input.semester,
        subject: input.subject,
        status: 'success',
        duration_ms: duration,
      })

      // 5. 세특에 저장 (히스토리 트리거 컨텍스트 세팅)
      await supabase.rpc('set_config', {
        setting_name: 'app.saenggibu_trigger_type',
        new_value: 'submission_added',
        is_local: true,
      }).then(() => {}, () => {}) // 실패해도 무시 (트리거 안전망이 처리)
      await supabase.rpc('set_config', {
        setting_name: 'app.saenggibu_related_submission',
        new_value: input.submission_id,
        is_local: true,
      }).then(() => {}, () => {})

      const sources = [...(existing?.source_submission_ids || [])]
      if (!sources.includes(input.submission_id)) sources.push(input.submission_id)

      if (existing) {
        const { data, error } = await supabase
          .from('middle_saenggibu_item')
          .update({
            content: newContent,
            ai_generated: true,
            last_generated_at: new Date().toISOString(),
            generation_mode: 'accumulating',
            source_submission_ids: sources,
          })
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        return data as MiddleSaenggibuItem
      } else {
        const { data, error } = await supabase
          .from('middle_saenggibu_item')
          .insert({
            student_id: input.student_id,
            grade: input.grade,
            semester: input.semester,
            category: '세특',
            subject: input.subject,
            content: newContent,
            status: 'draft',
            generation_mode: 'accumulating',
            ai_generated: true,
            last_generated_at: new Date().toISOString(),
            source_submission_ids: sources,
          })
          .select()
          .single()
        if (error) throw error
        return data as MiddleSaenggibuItem
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['middle-saenggibu', variables.student_id, variables.grade, variables.semester]
      })
    },
  })
}

// ─────────────────────────────────────────────
// 7. 학기 세특 압축 (Finalize)
// ─────────────────────────────────────────────

interface FinalizeInput {
  student_id: string
  grade: number
  semester: number
  subject: string
  emphasis_direction?: string  // '자료조사 중심' / '표현력 중심' 등
  selected_submission_ids?: string[]  // 명시적으로 고른 제출물만 (안 주면 전체)
}

export function useFinalizeMiddleSaenggibu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: FinalizeInput): Promise<MiddleSaenggibuItem> => {
      const startedAt = Date.now()

      // 1. 기존 누적본 + 학기 제출물 가져오기
      const { data: existing } = await supabase
        .from('middle_saenggibu_item')
        .select('*')
        .eq('student_id', input.student_id)
        .eq('grade', input.grade)
        .eq('semester', input.semester)
        .eq('category', '세특')
        .eq('subject', input.subject)
        .maybeSingle()

      const { data: allSubs } = await supabase
        .from('suhaeng_submissions')
        .select('*')
        .eq('student_id', input.student_id)
        .order('submitted_at', { ascending: true, nullsFirst: false })

      // 학기 필터 + (선택 ID 있으면 그것만)
      const semesterSubs = (allSubs as SuhaengSubmission[] || []).filter(s => {
        if (getSubmissionSemester(s) !== input.semester) return false
        if (input.selected_submission_ids && input.selected_submission_ids.length > 0) {
          return input.selected_submission_ids.includes(s.id)
        }
        return true
      })

      // 2. AI 압축 호출
      const { data: aiData, error: aiErr } = await supabase.functions.invoke(
        'middle-generate-saenggibu',
        {
          body: {
            mode: 'finalize',
            existingContent: existing?.content || null,
            submissions: semesterSubs,
            subject: input.subject,
            grade: input.grade,
            semester: input.semester,
            emphasis_direction: input.emphasis_direction || null,
          },
        }
      )
      if (aiErr) throw new Error('AI 호출 실패: ' + aiErr.message)
      if (!aiData?.success || !aiData?.text) {
        throw new Error('AI 응답이 없습니다')
      }

      const finalContent: string = aiData.text
      const duration = Date.now() - startedAt
      const finalSources = semesterSubs.map(s => s.id)

      // 3. AI 로그
      await supabase.from('middle_ai_generation_log').insert({
        student_id: input.student_id,
        mode: 'finalize',
        saenggibu_item_id: existing?.id || null,
        input_payload: {
          subject: input.subject,
          grade: input.grade,
          semester: input.semester,
          emphasis_direction: input.emphasis_direction,
          submission_count: semesterSubs.length,
          submission_ids: finalSources,
        },
        output_text: finalContent,
        output_metadata: aiData.metadata || null,
        model_name: aiData.model || null,
        prompt_version: 'middle-finalize-v1',
        emphasis_direction: input.emphasis_direction || null,
        grade: input.grade,
        semester: input.semester,
        subject: input.subject,
        status: 'success',
        duration_ms: duration,
      })

      // 4. 히스토리 트리거 컨텍스트 ('finalized')
      await supabase.rpc('set_config', {
        setting_name: 'app.saenggibu_trigger_type',
        new_value: 'finalized',
        is_local: true,
      }).then(() => {}, () => {})

      // 5. 세특 압축본으로 교체 (트리거가 누적본을 히스토리에 백업)
      if (existing) {
        const { data, error } = await supabase
          .from('middle_saenggibu_item')
          .update({
            content: finalContent,
            ai_generated: true,
            last_generated_at: new Date().toISOString(),
            generation_mode: 'finalized',
            emphasis_direction: input.emphasis_direction || null,
            source_submission_ids: finalSources,
          })
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        return data as MiddleSaenggibuItem
      } else {
        const { data, error } = await supabase
          .from('middle_saenggibu_item')
          .insert({
            student_id: input.student_id,
            grade: input.grade,
            semester: input.semester,
            category: '세특',
            subject: input.subject,
            content: finalContent,
            status: 'draft',
            generation_mode: 'finalized',
            ai_generated: true,
            last_generated_at: new Date().toISOString(),
            emphasis_direction: input.emphasis_direction || null,
            source_submission_ids: finalSources,
          })
          .select()
          .single()
        if (error) throw error
        return data as MiddleSaenggibuItem
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['middle-saenggibu', variables.student_id, variables.grade, variables.semester]
      })
    },
  })
}

// ─────────────────────────────────────────────
// 8. 게시/비공개 토글
// ─────────────────────────────────────────────

export function useToggleMiddlePublish() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, publish }: { id: string, publish: boolean }): Promise<MiddleSaenggibuItem> => {
      const { data, error } = await supabase
        .from('middle_saenggibu_item')
        .update({
          status: publish ? 'published' : 'draft',
          published_at: publish ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as MiddleSaenggibuItem
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['middle-saenggibu'] })
    },
  })
}

// ─────────────────────────────────────────────
// 9. 학기 전체 일괄 게시
// ─────────────────────────────────────────────

export function usePublishAllSemester() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, grade, semester, publish }: {
      studentId: string, grade: number, semester: number, publish: boolean
    }): Promise<void> => {
      const { error } = await supabase
        .from('middle_saenggibu_item')
        .update({
          status: publish ? 'published' : 'draft',
          published_at: publish ? new Date().toISOString() : null,
        })
        .eq('student_id', studentId)
        .eq('grade', grade)
        .eq('semester', semester)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['middle-saenggibu', variables.studentId, variables.grade, variables.semester]
      })
    },
  })
}

// ─────────────────────────────────────────────
// 10. 세특 삭제
// ─────────────────────────────────────────────

export function useDeleteMiddleSaenggibu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('middle_saenggibu_item')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['middle-saenggibu'] })
    },
  })
}

// ─────────────────────────────────────────────
// 11. 학기 마감 설정/수정 (학원 단위)
// ─────────────────────────────────────────────

interface SetLockInput {
  academy_id: string
  grade: number
  semester: number
  deadline_at?: string | null  // ISO string
  locked_at?: string | null
  locked_manually?: boolean
  note?: string | null
  created_by?: string | null
}

export function useSetMiddleSemesterLock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SetLockInput): Promise<MiddleSemesterLock> => {
      // 기존 row 조회
      const { data: existing } = await supabase
        .from('middle_semester_lock')
        .select('id')
        .eq('academy_id', input.academy_id)
        .eq('grade', input.grade)
        .eq('semester', input.semester)
        .maybeSingle()

      const payload: any = {}
      if (input.deadline_at !== undefined) payload.deadline_at = input.deadline_at
      if (input.locked_at !== undefined) payload.locked_at = input.locked_at
      if (input.locked_manually !== undefined) payload.locked_manually = input.locked_manually
      if (input.note !== undefined) payload.note = input.note

      if (existing) {
        const { data, error } = await supabase
          .from('middle_semester_lock')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        return data as MiddleSemesterLock
      } else {
        const { data, error } = await supabase
          .from('middle_semester_lock')
          .insert({
            academy_id: input.academy_id,
            grade: input.grade,
            semester: input.semester,
            created_by: input.created_by || null,
            ...payload,
          })
          .select()
          .single()
        if (error) throw error
        return data as MiddleSemesterLock
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['middle-semester-lock', variables.academy_id, variables.grade, variables.semester]
      })
    },
  })
}

// ─────────────────────────────────────────────
// 12. 학기 마감 해제 (deadline_at, locked_at NULL)
// ─────────────────────────────────────────────

export function useUnlockMiddleSemester() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ academyId, grade, semester }: {
      academyId: string, grade: number, semester: number
    }): Promise<void> => {
      const { error } = await supabase
        .from('middle_semester_lock')
        .update({
          deadline_at: null,
          locked_at: null,
          locked_manually: false,
        })
        .eq('academy_id', academyId)
        .eq('grade', grade)
        .eq('semester', semester)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['middle-semester-lock', variables.academyId, variables.grade, variables.semester]
      })
    },
  })
}

// ─────────────────────────────────────────────
// 13. 히스토리 조회 (자산 확인용)
// ─────────────────────────────────────────────

export function useMiddleSaenggibuHistory(itemId: string) {
  return useQuery({
    queryKey: ['middle-saenggibu-history', itemId],
    queryFn: async (): Promise<MiddleSaenggibuHistory[]> => {
      const { data, error } = await supabase
        .from('middle_saenggibu_history')
        .select('*')
        .eq('saenggibu_item_id', itemId)
        .order('snapshot_at', { ascending: false })
      if (error) throw error
      return (data as MiddleSaenggibuHistory[]) || []
    },
    enabled: !!itemId,
  })
}