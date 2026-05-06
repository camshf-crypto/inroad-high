// src/lib/homework/api.ts
// 중등 숙제 시스템 API
// - 인증 토큰 명시적으로 함수에 전달
// - STT는 sync 모드 (결과 바로 받음, 폴링 불필요)

import { supabase } from '../supabase'

// ============================================================
// 타입 정의
// ============================================================
export interface Assignment {
  id: string
  grade: string
  month: string
  week: number
  title: string
  task: string
  type: 'text' | 'video'
  lesson_context: string | null
  display_order: number
}

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  academy_id: string | null
  answer: string | null
  video_url: string | null
  video_path: string | null
  duration_sec: number | null
  stt_token: string | null
  stt_status: 'none' | 'transcribing' | 'completed' | 'failed'
  stt_error: string | null
  transcript: string | null
  ai_feedback: AiFeedback | null
  ai_feedback_generated_at: string | null
  final_feedback: AiFeedback | null
  feedback_status: 'none' | 'pending_review' | 'published'
  submitted_at: string
  published_at: string | null
}

export interface HomeworkItem extends Assignment {
  submission: Submission | null
  submitted: boolean
  hasFeedback: boolean
}

export interface AiFeedback {
  totalScore: number
  structureScore: number
  contentScore: number
  summary: string
  structure: { 강점: string[]; 개선점: string[] }
  content: { 강점: string[]; 개선점: string[] }
  specificQuotes: { quote: string; comment: string }[]
  nextStep: string
  teacherNote: string
}

// ============================================================
// 인증 토큰 가져오기 헬퍼
// ============================================================
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('로그인이 필요합니다.')
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
  }
}

// ============================================================
// 1. 숙제 목록 조회 (학생/어드민 공용)
// ============================================================
export async function fetchHomeworkForStudent(
  grade: string,
  studentId: string
): Promise<HomeworkItem[]> {
  const { data: assignments, error: aErr } = await supabase
    .from('middle_homework_assignments')
    .select('*')
    .eq('grade', grade)
    .order('display_order', { ascending: true })

  if (aErr) throw aErr
  if (!assignments) return []

  const { data: submissions, error: sErr } = await supabase
    .from('middle_homework_submissions')
    .select('*')
    .eq('student_id', studentId)

  if (sErr) throw sErr

  const subMap = new Map<string, Submission>()
  ;(submissions || []).forEach((s: any) => subMap.set(s.assignment_id, s))

  return assignments.map((a: Assignment) => {
    const sub = subMap.get(a.id) || null
    return {
      ...a,
      submission: sub,
      submitted: !!sub && (!!sub.answer || !!sub.video_url),
      hasFeedback: !!sub?.final_feedback,
    }
  })
}

export const fetchHomeworkForAdmin = fetchHomeworkForStudent

// ============================================================
// 2. 텍스트 제출
// ============================================================
export async function submitTextHomework(args: {
  assignmentId: string
  studentId: string
  academyId?: string | null
  answer: string
}): Promise<Submission> {
  const { data, error } = await supabase
    .from('middle_homework_submissions')
    .upsert(
      {
        assignment_id: args.assignmentId,
        student_id: args.studentId,
        academy_id: args.academyId ?? null,
        answer: args.answer,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'assignment_id,student_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data as Submission
}

// ============================================================
// 3. 영상 업로드 + STT (sync 모드 — 결과 바로 받음)
// ============================================================
export async function submitVideoHomework(args: {
  assignmentId: string
  studentId: string
  academyId?: string | null
  file: File
  onProgress?: (status: string) => void
}): Promise<{ submission: Submission; sttToken: string; transcript?: string }> {
  const { assignmentId, studentId, academyId, file, onProgress } = args

  // 1) Storage 업로드
  onProgress?.('영상 업로드 중...')
  const ext = file.name.split('.').pop() || 'mp4'
  const fileName = `${studentId}/${assignmentId}-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('homework-videos')
    .upload(fileName, file, { contentType: file.type, upsert: false })

  if (upErr) throw upErr

  // 2) Public URL
  const { data: urlData } = supabase.storage
    .from('homework-videos')
    .getPublicUrl(fileName)
  const videoUrl = urlData.publicUrl

  // 3) DB 제출 레코드 생성
  onProgress?.('제출 정보 저장 중...')
  const { data: subData, error: subErr } = await supabase
    .from('middle_homework_submissions')
    .upsert(
      {
        assignment_id: assignmentId,
        student_id: studentId,
        academy_id: academyId ?? null,
        video_url: videoUrl,
        video_path: fileName,
        stt_status: 'transcribing',
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'assignment_id,student_id' }
    )
    .select()
    .single()

  if (subErr) throw subErr

  // 4) Clova STT 호출 (sync 모드 — 영상 길이만큼 대기)
  onProgress?.('AI 음성 분석 중... (1~2분 소요)')

  const headers = await getAuthHeaders()
  const { data: sttData, error: sttErr } = await supabase.functions.invoke(
    'middle-homework-stt-start',
    {
      body: { videoUrl, homeworkId: subData.id },
      headers,
    }
  )

  if (sttErr) {
    await supabase
      .from('middle_homework_submissions')
      .update({ stt_status: 'failed', stt_error: sttErr.message })
      .eq('id', subData.id)
    throw sttErr
  }

  // 5) sync 모드: transcript 즉시 받음 → DB 저장
  if (sttData?.immediate && sttData?.transcript) {
    await supabase
      .from('middle_homework_submissions')
      .update({
        transcript: sttData.transcript,
        duration_sec: sttData.durationSec,
        stt_status: 'completed',
        stt_completed_at: new Date().toISOString(),
        stt_token: sttData.token,
      })
      .eq('id', subData.id)

    onProgress?.('변환 완료!')
    return {
      submission: { ...subData, transcript: sttData.transcript } as Submission,
      sttToken: sttData.token,
      transcript: sttData.transcript,
    }
  }

  // 혹시 비동기로 받으면 token만 저장 (방어 코드)
  await supabase
    .from('middle_homework_submissions')
    .update({ stt_token: sttData.token })
    .eq('id', subData.id)

  return {
    submission: { ...subData, stt_token: sttData.token } as Submission,
    sttToken: sttData.token,
  }
}

// ============================================================
// 4. STT 폴링 (호환성 유지용 — sync 모드면 즉시 'Completed' 반환)
// ============================================================
export async function pollSttResult(
  token: string,
  submissionId: string,
  onProgress?: (status: string) => void
): Promise<string> {
  // sync 모드라면 이미 DB에 transcript 저장돼있을 것
  const { data: sub } = await supabase
    .from('middle_homework_submissions')
    .select('transcript, stt_status')
    .eq('id', submissionId)
    .single()

  if (sub?.transcript) {
    onProgress?.('변환 완료!')
    return sub.transcript
  }

  // 비동기 모드 폴백 (혹시 모르니)
  const headers = await getAuthHeaders()
  const maxAttempts = 60

  for (let i = 0; i < maxAttempts; i++) {
    const { data, error } = await supabase.functions.invoke(
      'middle-homework-stt-result',
      { body: { token }, headers }
    )
    if (error) throw error

    if (data.status === 'Completed') {
      await supabase
        .from('middle_homework_submissions')
        .update({
          transcript: data.transcript,
          duration_sec: data.durationSec,
          stt_status: 'completed',
          stt_completed_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
      onProgress?.('변환 완료!')
      return data.transcript as string
    }

    if (data.status === 'Failed') {
      await supabase
        .from('middle_homework_submissions')
        .update({ stt_status: 'failed', stt_error: data.error })
        .eq('id', submissionId)
      throw new Error(`STT 실패: ${data.error}`)
    }

    onProgress?.(`AI 음성 분석 중... (${i * 5}초 경과)`)
    await new Promise((r) => setTimeout(r, 5000))
  }

  throw new Error('STT 타임아웃 (5분 초과)')
}

// ============================================================
// 5. 어드민 STT 수동 트리거 (영상 있는데 transcript 없을 때)
// ============================================================
export async function triggerSttForSubmission(submissionId: string) {
  const { data: sub, error } = await supabase
    .from('middle_homework_submissions')
    .select('id, video_url')
    .eq('id', submissionId)
    .single()

  if (error) throw error
  if (!sub.video_url) throw new Error('영상이 없습니다.')

  await supabase
    .from('middle_homework_submissions')
    .update({ stt_status: 'transcribing' })
    .eq('id', submissionId)

  const headers = await getAuthHeaders()
  const { data: sttData, error: sttErr } = await supabase.functions.invoke(
    'middle-homework-stt-start',
    {
      body: { videoUrl: sub.video_url, homeworkId: sub.id },
      headers,
    }
  )

  if (sttErr) throw sttErr

  // sync 모드면 바로 완료
  if (sttData?.immediate && sttData?.transcript) {
    await supabase
      .from('middle_homework_submissions')
      .update({
        transcript: sttData.transcript,
        duration_sec: sttData.durationSec,
        stt_status: 'completed',
        stt_completed_at: new Date().toISOString(),
        stt_token: sttData.token,
      })
      .eq('id', submissionId)
    return sttData.token as string
  }

  // 비동기 폴백
  await supabase
    .from('middle_homework_submissions')
    .update({ stt_token: sttData.token })
    .eq('id', submissionId)

  return sttData.token as string
}

// ============================================================
// 6. AI 피드백 생성 (어드민)
// ============================================================
export async function generateAiFeedback(submissionId: string): Promise<AiFeedback> {
  const { data: sub, error } = await supabase
    .from('middle_homework_submissions')
    .select(
      `
      id, transcript, answer, duration_sec,
      assignment:middle_homework_assignments (
        title, task, type, grade, lesson_context
      )
    `
    )
    .eq('id', submissionId)
    .single()

  if (error) throw error

  const assignment: any = Array.isArray(sub.assignment) ? sub.assignment[0] : sub.assignment
  const isVideo = assignment.type === 'video'
  const content = isVideo ? sub.transcript : sub.answer

  if (!content) {
    throw new Error(
      isVideo ? 'STT가 아직 완료되지 않았습니다.' : '학생이 아직 제출하지 않았습니다.'
    )
  }

  const headers = await getAuthHeaders()
  const { data, error: feedbackErr } = await supabase.functions.invoke(
    'middle-homework-feedback',
    {
      body: {
        transcript: content,
        homeworkTitle: assignment.title,
        lessonContext: assignment.lesson_context || assignment.task,
        grade: assignment.grade,
        durationSec: sub.duration_sec,
      },
      headers,
    }
  )

  if (feedbackErr) throw feedbackErr

  await supabase
    .from('middle_homework_submissions')
    .update({
      ai_feedback: data.feedback,
      ai_feedback_generated_at: new Date().toISOString(),
      feedback_status: 'pending_review',
    })
    .eq('id', submissionId)

  return data.feedback as AiFeedback
}

// ============================================================
// 7. 선생님 피드백 발행 (어드민)
// ============================================================
export async function publishFeedback(
  submissionId: string,
  finalFeedback: AiFeedback
) {
  const { error } = await supabase
    .from('middle_homework_submissions')
    .update({
      final_feedback: finalFeedback,
      feedback_status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (error) throw error
}

// ============================================================
// 8. 어드민 — 학원 전체 제출 현황
// ============================================================
export async function fetchAcademySubmissions(academyId: string) {
  const { data, error } = await supabase
    .from('middle_homework_submissions')
    .select(
      `
      *,
      assignment:middle_homework_assignments (*)
    `
    )
    .eq('academy_id', academyId)
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return data || []
}