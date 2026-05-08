// src/lib/homework/api.ts
// 중등 숙제 시스템 API
// - 인증 토큰 명시적으로 함수에 전달
// - STT는 sync 모드 (결과 바로 받음, 폴링 불필요)
// - 임시저장 → 최종제출 → (선생님 재제출 허용) 흐름 지원
// - AI 피드백 숙제당 최대 2회 제한

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
  stt_completed_at: string | null
  transcript: string | null
  ai_feedback: AiFeedback | null
  ai_feedback_generated_at: string | null
  ai_feedback_count: number
  final_feedback: AiFeedback | null
  feedback_status: 'none' | 'pending_review' | 'published'
  submitted_at: string
  published_at: string | null

  // 🆕 임시저장 / 최종 / 재제출
  is_final: boolean
  finalized_at: string | null
  resubmit_allowed: boolean
  resubmit_allowed_at: string | null
  draft_updated_at: string | null
}

export interface HomeworkItem extends Assignment {
  submission: Submission | null
  submitted: boolean       // 최종 제출 여부 (= submission?.is_final)
  hasDraft: boolean        // 임시저장 여부 (submission 있고 is_final=false)
  hasFeedback: boolean     // 선생님 발행 피드백 있음
  isEditable: boolean      // 학생이 지금 편집 가능?
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
// 인증 토큰 헬퍼
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
// 1. 숙제 목록 조회
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
    const hasDraft = !!sub && !sub.is_final
    const submitted = !!sub?.is_final
    const isEditable = !sub                                            // 미제출
                     || !sub.is_final                                  // 임시저장
                     || !!sub.resubmit_allowed                         // 재제출 허용
    return {
      ...a,
      submission: sub,
      submitted,
      hasDraft,
      hasFeedback: !!sub?.final_feedback,
      isEditable,
    }
  })
}

export const fetchHomeworkForAdmin = fetchHomeworkForStudent

// ============================================================
// 2. 텍스트 임시저장
//    - 학생이 무제한 호출 가능
//    - is_final 은 false 로 유지 (DB default)
// ============================================================
export async function saveDraftText(args: {
  assignmentId: string
  studentId: string
  academyId?: string | null
  answer: string
}): Promise<Submission> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('middle_homework_submissions')
    .upsert(
      {
        assignment_id: args.assignmentId,
        student_id: args.studentId,
        academy_id: args.academyId ?? null,
        answer: args.answer,
        is_final: false,
        draft_updated_at: now,
        // submitted_at은 row 최초 생성 시에만 채워지길 원하지만,
        // upsert면 매번 갱신될 수 있어 별도 RPC를 안 쓰는 한 그대로 둠.
        submitted_at: now,
      },
      { onConflict: 'assignment_id,student_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data as Submission
}

// ============================================================
// 3. 영상 임시저장
//    - Storage 업로드만, STT 트리거 X (비용 절약)
//    - 새 영상 올리면 기존 video_url/transcript 덮어쓰기
// ============================================================
export async function saveDraftVideo(args: {
  assignmentId: string
  studentId: string
  academyId?: string | null
  file: File
  onProgress?: (status: string) => void
}): Promise<Submission> {
  const { assignmentId, studentId, academyId, file, onProgress } = args

  onProgress?.('영상 업로드 중...')
  const ext = file.name.split('.').pop() || 'mp4'
  const fileName = `${studentId}/${assignmentId}-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('homework-videos')
    .upload(fileName, file, { contentType: file.type, upsert: false })

  if (upErr) throw upErr

  const { data: urlData } = supabase.storage
    .from('homework-videos')
    .getPublicUrl(fileName)
  const videoUrl = urlData.publicUrl

  onProgress?.('저장 중...')

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('middle_homework_submissions')
    .upsert(
      {
        assignment_id: assignmentId,
        student_id: studentId,
        academy_id: academyId ?? null,
        video_url: videoUrl,
        video_path: fileName,
        // 새 영상이면 기존 STT/transcript 무효화
        stt_status: 'none',
        stt_error: null,
        transcript: null,
        duration_sec: null,
        is_final: false,
        draft_updated_at: now,
        submitted_at: now,
      },
      { onConflict: 'assignment_id,student_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data as Submission
}

// ============================================================
// 4. 최종 제출
//    - is_final=true, finalized_at 기록, resubmit_allowed=false
//    - 영상이면 STT 트리거 (sync 모드라 함수 내에서 transcript까지 받음)
// ============================================================
export async function finalizeSubmission(args: {
  assignmentId: string
  studentId: string
  onProgress?: (status: string) => void
}): Promise<{ submission: Submission; transcript?: string }> {
  const { assignmentId, studentId, onProgress } = args

  // 1) 현재 submission 조회 (어떤 타입인지 + 영상 url 필요)
  const { data: cur, error: e1 } = await supabase
    .from('middle_homework_submissions')
    .select('id, video_url, answer, transcript')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .single()

  if (e1) throw new Error('임시저장된 제출물이 없어요. 먼저 작성하거나 영상을 올려주세요.')
  if (!cur.answer && !cur.video_url) {
    throw new Error('제출할 내용이 없어요.')
  }

  // 2) is_final 마킹
  onProgress?.('최종 제출 처리 중...')
  const finalizedAt = new Date().toISOString()
  const { data: fin, error: e2 } = await supabase
    .from('middle_homework_submissions')
    .update({
      is_final: true,
      finalized_at: finalizedAt,
      resubmit_allowed: false,
      resubmit_allowed_at: null,
    })
    .eq('id', cur.id)
    .select()
    .single()

  if (e2) throw e2

  // 3) 영상이고 아직 transcript 없으면 STT 트리거
  if (cur.video_url && !cur.transcript) {
    onProgress?.('AI 음성 분석 중... (1~2분 소요)')
    try {
      const transcript = await runSttSync(cur.id, cur.video_url)
      return {
        submission: { ...fin, transcript } as Submission,
        transcript,
      }
    } catch (err: any) {
      // STT 실패해도 최종제출 자체는 유지 (선생님이 어드민에서 재시도 가능)
      console.error('[finalizeSubmission] STT 실패:', err)
      throw new Error(
        `최종 제출은 완료됐지만 음성 분석에 실패했어요. 선생님이 어드민에서 재시도할 수 있어요.\n(${err.message})`
      )
    }
  }

  return { submission: fin as Submission }
}

// ============================================================
// 4-a. STT sync 호출 — 내부 헬퍼
// ============================================================
async function runSttSync(submissionId: string, videoUrl: string): Promise<string> {
  await supabase
    .from('middle_homework_submissions')
    .update({ stt_status: 'transcribing', stt_error: null })
    .eq('id', submissionId)

  const headers = await getAuthHeaders()
  const { data: sttData, error: sttErr } = await supabase.functions.invoke(
    'middle-homework-stt-start',
    {
      body: { videoUrl, homeworkId: submissionId },
      headers,
    }
  )

  if (sttErr) {
    await supabase
      .from('middle_homework_submissions')
      .update({ stt_status: 'failed', stt_error: sttErr.message })
      .eq('id', submissionId)
    throw sttErr
  }

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
    return sttData.transcript as string
  }

  // 비동기 폴백 — token만 저장하고 폴링은 호출측에서
  await supabase
    .from('middle_homework_submissions')
    .update({ stt_token: sttData?.token ?? null })
    .eq('id', submissionId)
  throw new Error('STT가 비동기 모드로 응답했어요. 잠시 후 다시 시도해주세요.')
}

// ============================================================
// 5. STT 폴링 (호환 유지)
// ============================================================
export async function pollSttResult(
  token: string,
  submissionId: string,
  onProgress?: (status: string) => void
): Promise<string> {
  const { data: sub } = await supabase
    .from('middle_homework_submissions')
    .select('transcript, stt_status')
    .eq('id', submissionId)
    .single()

  if (sub?.transcript) {
    onProgress?.('변환 완료!')
    return sub.transcript
  }

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
// 6. 어드민 STT 수동 트리거
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
    .update({ stt_status: 'transcribing', stt_error: null })
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

  await supabase
    .from('middle_homework_submissions')
    .update({ stt_token: sttData.token })
    .eq('id', submissionId)

  return sttData.token as string
}

// ============================================================
// 7. AI 피드백 생성 (어드민) - 횟수 제한 추가
// ============================================================
export async function generateAiFeedback(submissionId: string): Promise<AiFeedback> {
  const { data: sub, error } = await supabase
    .from('middle_homework_submissions')
    .select(
      `
      id, transcript, answer, duration_sec, ai_feedback_count, is_final,
      assignment:middle_homework_assignments (
        title, task, type, grade, lesson_context
      )
    `
    )
    .eq('id', submissionId)
    .single()

  if (error) throw error

  // 🆕 횟수 제한
  if ((sub.ai_feedback_count ?? 0) >= 2) {
    throw new Error('AI 피드백은 숙제당 최대 2회까지만 생성할 수 있어요.')
  }

  // 🆕 최종제출 안 됐으면 거부 (학생이 임시저장 중이면 분석 의미 없음)
  if (!sub.is_final) {
    throw new Error('학생이 아직 최종 제출하지 않았어요.')
  }

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
      ai_feedback_count: (sub.ai_feedback_count ?? 0) + 1,
      feedback_status: 'pending_review',
    })
    .eq('id', submissionId)

  return data.feedback as AiFeedback
}

// ============================================================
// 8. 선생님 피드백 발행
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
      // 발행 시점에 재제출 허용 상태 였으면 잠금
      resubmit_allowed: false,
    })
    .eq('id', submissionId)

  if (error) throw error
}

// ============================================================
// 9. 🆕 재제출 허용 (어드민)
//    - resubmit_allowed=true
//    - ai_feedback / final_feedback 비움 → 학생 재수정 후 다시 생성/발행 가능
//    - 학생 답변/영상/transcript 는 유지 (학생이 토대로 수정)
//    - ai_feedback_count 는 그대로 (다음 generateAiFeedback에서 +1)
// ============================================================
export async function allowResubmit(submissionId: string) {
  // 횟수 사전 검사
  const { data: cur, error: e1 } = await supabase
    .from('middle_homework_submissions')
    .select('ai_feedback_count')
    .eq('id', submissionId)
    .single()
  if (e1) throw e1
  if ((cur?.ai_feedback_count ?? 0) >= 2) {
    throw new Error('이 숙제는 AI 피드백을 이미 2회 사용했어요. 더 이상 재제출을 허용할 수 없어요.')
  }

  const { data, error } = await supabase
    .from('middle_homework_submissions')
    .update({
      resubmit_allowed: true,
      resubmit_allowed_at: new Date().toISOString(),
      ai_feedback: null,
      final_feedback: null,
      feedback_status: 'none',
      published_at: null,
    })
    .eq('id', submissionId)
    .select()
    .single()

  if (error) throw error
  return data as Submission
}

// ============================================================
// 10. 어드민 — 학원 전체 제출 현황
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

// ============================================================
// 11. 호환성 — 기존 함수 alias (점진적 마이그레이션용)
// ============================================================
// 기존 학생 페이지가 submitTextHomework / submitVideoHomework 를 사용 중이라면
// 그대로 두면 동작은 함. 단, "임시저장 없이 곧바로 최종제출" 행동을 함.
// 새 학생 페이지(MiddleHomework.tsx)는 saveDraft + finalize 를 사용하므로
// 점진적 전환 가능.

export async function submitTextHomework(args: {
  assignmentId: string
  studentId: string
  academyId?: string | null
  answer: string
}): Promise<Submission> {
  await saveDraftText(args)
  const { submission } = await finalizeSubmission({
    assignmentId: args.assignmentId,
    studentId: args.studentId,
  })
  return submission
}

export async function submitVideoHomework(args: {
  assignmentId: string
  studentId: string
  academyId?: string | null
  file: File
  onProgress?: (status: string) => void
}): Promise<{ submission: Submission; sttToken: string; transcript?: string }> {
  await saveDraftVideo(args)
  const { submission, transcript } = await finalizeSubmission({
    assignmentId: args.assignmentId,
    studentId: args.studentId,
    onProgress: args.onProgress,
  })
  return {
    submission,
    sttToken: submission.stt_token ?? '',
    transcript,
  }
}