import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ───────────────────────────────────────────────────────────
// 타입 정의
// ───────────────────────────────────────────────────────────
export interface MajorSeed {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

export interface MajorChapter {
  id: string
  major_id: string
  grade: number  // 1, 2, 3
  chapter_no: number
  title: string
  description: string | null
}

export interface MajorQuestion {
  id: string
  chapter_id: string
  question_type: 'objective' | 'subjective'
  question_text: string
  choice_a: string | null
  choice_b: string | null
  choice_c: string | null
  choice_d: string | null
  correct_answer: string | null
  explanation: string | null
  difficulty: string
}

export interface MajorProgress {
  id: string
  student_id: string
  major_id: string
  chapter_id: string
  obj_score: number
  obj_total: number
  obj_answers: any[]
  subj_question_id: string | null
  subj_answer: string | null
  subj_ai_feedback: string | null
  subj_teacher_feedback: string | null
  status: 'in_progress' | 'completed'
  completed_at: string | null
}

export interface MajorSaenggibu {
  id: string
  student_id: string
  major_id: string
  saenggibu_pdf_url: string | null
  saenggibu_uploaded_at: string | null
  ai_chapters: any[]
  ai_generated_at: string | null
  ai_model: string | null
  status: 'pending' | 'uploaded' | 'generating' | 'ready' | 'error'
  error_message: string | null
}

// ───────────────────────────────────────────────────────────
// 1. 학과 목록 조회
// ───────────────────────────────────────────────────────────
export function useMajorSeeds() {
  return useQuery({
    queryKey: ['major-seeds'],
    queryFn: async (): Promise<MajorSeed[]> => {
      const { data, error } = await supabase
        .from('high_major_seed')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []) as MajorSeed[]
    },
    staleTime: 1000 * 60 * 60, // 1시간 캐싱 (학과는 자주 안 바뀜)
  })
}

// ───────────────────────────────────────────────────────────
// 2. 특정 학과 + 학년의 챕터 목록
// ───────────────────────────────────────────────────────────
export function useMajorChapters(majorId: string | undefined, grade: number | undefined) {
  return useQuery({
    queryKey: ['major-chapters', majorId, grade],
    queryFn: async (): Promise<MajorChapter[]> => {
      if (!majorId || !grade) return []
      const { data, error } = await supabase
        .from('high_major_chapter')
        .select('*')
        .eq('major_id', majorId)
        .eq('grade', grade)
        .eq('is_active', true)
        .order('chapter_no', { ascending: true })
      if (error) throw error
      return (data ?? []) as MajorChapter[]
    },
    enabled: !!majorId && !!grade,
  })
}

// ───────────────────────────────────────────────────────────
// 3. 챕터의 문제 (객관식 4개 + 주관식 1개 랜덤 추출)
// ───────────────────────────────────────────────────────────
export function useChapterQuestions(chapterId: string | undefined) {
  return useQuery({
    queryKey: ['chapter-questions', chapterId],
    queryFn: async (): Promise<{ objective: MajorQuestion[]; subjective: MajorQuestion | null }> => {
      if (!chapterId) return { objective: [], subjective: null }
      
      // 객관식 - 모든 문제 조회 후 클라이언트에서 4개 랜덤
      const { data: objData, error: objErr } = await supabase
        .from('high_major_question')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('question_type', 'objective')
        .eq('is_active', true)
      if (objErr) throw objErr
      
      const objectives = (objData ?? []) as MajorQuestion[]
      // 4개 랜덤 추출
      const shuffled = [...objectives].sort(() => Math.random() - 0.5)
      const selectedObj = shuffled.slice(0, 4)
      
      // 주관식 - 1개 랜덤
      const { data: subjData, error: subjErr } = await supabase
        .from('high_major_question')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('question_type', 'subjective')
        .eq('is_active', true)
      if (subjErr) throw subjErr
      
      const subjectives = (subjData ?? []) as MajorQuestion[]
      const selectedSubj = subjectives.length > 0
        ? subjectives[Math.floor(Math.random() * subjectives.length)]
        : null
      
      return { objective: selectedObj, subjective: selectedSubj }
    },
    enabled: !!chapterId,
    staleTime: Infinity, // 한번 뽑은 문제는 그대로 (페이지 이동 안 해도 됨)
  })
}

// ───────────────────────────────────────────────────────────
// 4. 학생 진행 상황 조회 (특정 학과 × 학년)
// ───────────────────────────────────────────────────────────
export function useMyProgress(majorId: string | undefined, grade: number | undefined) {
  return useQuery({
    queryKey: ['my-major-progress', majorId, grade],
    queryFn: async (): Promise<MajorProgress[]> => {
      if (!majorId || !grade) return []
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      
      // 학생 진행 + 챕터 정보 join 안 하고 직접 chapter_id로 매칭
      const { data: chapters } = await supabase
        .from('high_major_chapter')
        .select('id')
        .eq('major_id', majorId)
        .eq('grade', grade)
      
      if (!chapters || chapters.length === 0) return []
      const chapterIds = chapters.map(c => c.id)
      
      const { data, error } = await supabase
        .from('high_major_progress')
        .select('*')
        .eq('student_id', user.id)
        .eq('major_id', majorId)
        .in('chapter_id', chapterIds)
      
      if (error) throw error
      return (data ?? []) as MajorProgress[]
    },
    enabled: !!majorId && !!grade,
    refetchInterval: 5000,
  })
}

// ───────────────────────────────────────────────────────────
// 5. 특정 챕터 내 진행 상황 (1개 챕터)
// ───────────────────────────────────────────────────────────
export function useChapterProgress(chapterId: string | undefined) {
  return useQuery({
    queryKey: ['chapter-progress', chapterId],
    queryFn: async (): Promise<MajorProgress | null> => {
      if (!chapterId) return null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      
      const { data, error } = await supabase
        .from('high_major_progress')
        .select('*')
        .eq('student_id', user.id)
        .eq('chapter_id', chapterId)
        .maybeSingle()
      
      if (error) throw error
      return data as MajorProgress | null
    },
    enabled: !!chapterId,
    refetchInterval: 3000,
  })
}

// ───────────────────────────────────────────────────────────
// 6. 진행 시작 (chapter_id로 progress 행 생성/업데이트)
// ───────────────────────────────────────────────────────────
export function useStartChapter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { majorId: string; chapterId: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인 필요')
      
      // 이미 있으면 그대로, 없으면 생성
      const { data: existing } = await supabase
        .from('high_major_progress')
        .select('*')
        .eq('student_id', user.id)
        .eq('chapter_id', input.chapterId)
        .maybeSingle()
      
      if (existing) return existing as MajorProgress
      
      const { data, error } = await supabase
        .from('high_major_progress')
        .insert({
          student_id: user.id,
          major_id: input.majorId,
          chapter_id: input.chapterId,
          status: 'in_progress',
        })
        .select()
        .single()
      
      if (error) throw error
      return data as MajorProgress
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-major-progress'] })
      qc.invalidateQueries({ queryKey: ['chapter-progress'] })
    },
  })
}

// ───────────────────────────────────────────────────────────
// 7. 객관식 답변 제출 (일괄)
// ───────────────────────────────────────────────────────────
export function useSubmitObjective() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      progressId: string
      answers: { question_id: string; user_answer: string; is_correct: boolean }[]
    }) => {
      const score = input.answers.filter(a => a.is_correct).length
      
      const { error } = await supabase
        .from('high_major_progress')
        .update({
          obj_score: score,
          obj_total: input.answers.length,
          obj_answers: input.answers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.progressId)
      
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-major-progress'] })
      qc.invalidateQueries({ queryKey: ['chapter-progress'] })
    },
  })
}

// ───────────────────────────────────────────────────────────
// 8. 주관식 답변 + AI 피드백 저장
// ───────────────────────────────────────────────────────────
export function useSubmitSubjective() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      progressId: string
      questionId: string
      answer: string
      aiFeedback?: string
    }) => {
      const { error } = await supabase
        .from('high_major_progress')
        .update({
          subj_question_id: input.questionId,
          subj_answer: input.answer,
          subj_ai_feedback: input.aiFeedback || null,
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.progressId)
      
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-major-progress'] })
      qc.invalidateQueries({ queryKey: ['chapter-progress'] })
    },
  })
}

// ───────────────────────────────────────────────────────────
// 9. 고3 생기부 - 본인 데이터 조회
// ───────────────────────────────────────────────────────────
export function useMySaenggibu(majorId: string | undefined) {
  return useQuery({
    queryKey: ['my-major-saenggibu', majorId],
    queryFn: async (): Promise<MajorSaenggibu | null> => {
      if (!majorId) return null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      
      const { data, error } = await supabase
        .from('high_major_saenggibu')
        .select('*')
        .eq('student_id', user.id)
        .eq('major_id', majorId)
        .maybeSingle()
      
      if (error) throw error
      return data as MajorSaenggibu | null
    },
    enabled: !!majorId,
    refetchInterval: 5000, // AI 생성 진행 폴링
  })
}

// ───────────────────────────────────────────────────────────
// 10. 고3 생기부 PDF 업로드 + 진행 상태 변경
// ───────────────────────────────────────────────────────────
export async function uploadSaenggibuMajor(file: File, studentId: string, majorId: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const fileName = `${studentId}/${majorId}/saenggibu_${Date.now()}.${ext}`
  
  const { error: uploadErr } = await supabase.storage
    .from('saenggibu-pdfs')
    .upload(fileName, file, { upsert: true })
  
  if (uploadErr) throw uploadErr
  return fileName
}

export function useSaveSaenggibu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { majorId: string; pdfUrl: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인 필요')
      
      const { data, error } = await supabase
        .from('high_major_saenggibu')
        .upsert({
          student_id: user.id,
          major_id: input.majorId,
          saenggibu_pdf_url: input.pdfUrl,
          saenggibu_uploaded_at: new Date().toISOString(),
          status: 'uploaded',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'student_id,major_id',
        })
        .select()
        .single()
      
      if (error) throw error
      return data as MajorSaenggibu
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-major-saenggibu'] })
    },
  })
}

// ───────────────────────────────────────────────────────────
// 11. AI 피드백 호출 (Supabase Edge Function 사용 권장)
// 임시: 직접 Anthropic API 호출 (보안상 나중에 Edge Function으로 이동 필수!)
// ───────────────────────────────────────────────────────────
export async function getAIFeedback(question: string, answer: string, majorName: string): Promise<string> {
  // TODO: Supabase Edge Function으로 이동
  // 현재는 placeholder
  return `[AI 피드백] ${majorName} 답변에 대한 피드백입니다. 답변을 잘 작성했어요. 더 구체적인 사례를 추가하면 좋겠어요.`
}

// ───────────────────────────────────────────────────────────
// 12. 학년 변환 헬퍼
// ───────────────────────────────────────────────────────────
export function gradeStringToNum(g: string): number {
  if (g === '고1') return 1
  if (g === '고2') return 2
  if (g === '고3') return 3
  return 1
}

export function gradeNumToString(n: number): string {
  return ['', '고1', '고2', '고3'][n] || '고1'
}