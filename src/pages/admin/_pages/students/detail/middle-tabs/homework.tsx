import { useState, useEffect, useRef } from 'react'
import {
  fetchHomeworkForAdmin,
  triggerSttForSubmission,
  pollSttResult,
  generateAiFeedback,
  publishFeedback,
  allowResubmit,
  type HomeworkItem,
  type AiFeedback,
} from '@/lib/homework/api'

// 중등 초록 테마
const THEME = {
  accent: '#059669',
  accentDark: '#065F46',
  accentBg: '#ECFDF5',
  accentBorder: '#6EE7B7',
  accentShadow: 'rgba(16, 185, 129, 0.15)',
  gradient: 'linear-gradient(135deg, #065F46, #10B981)',
}

export default function MiddleHomeworkTab({ student }: { student: any }) {
  const grade = student?.grade || '중1'

  const [items, setItems] = useState<HomeworkItem[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [busyMsg, setBusyMsg] = useState('')
  const [error, setError] = useState('')

  // ============================================================
  // 데이터 로드
  // ============================================================
  useEffect(() => {
    if (!student?.id) return
    loadHomework()
  }, [student?.id, grade])

  const loadHomework = async () => {
    if (!student?.id) return
    try {
      setLoading(true)
      const data = await fetchHomeworkForAdmin(grade, student.id)
      setItems(data)
      if (!selId && data.length) setSelId(data[0].id)
    } catch (e: any) {
      setError(e.message || '숙제를 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // 월별 그룹화 + 카운트
  // ============================================================
  const grouped = items.reduce<Record<string, HomeworkItem[]>>((acc, h) => {
    if (!acc[h.month]) acc[h.month] = []
    acc[h.month].push(h)
    return acc
  }, {})
  const months = Object.keys(grouped)

  const selHW = items.find(h => h.id === selId)
  const submittedCount = items.filter(h => h.submitted).length
  const feedbackDoneCount = items.filter(h => h.hasFeedback).length

  // ============================================================
  // STT 수동 트리거
  // ============================================================
  const handleStartStt = async () => {
    if (!selHW?.submission) return
    try {
      setBusy(true)
      setBusyMsg('AI 음성 분석 시작...')
      setError('')
      const token = await triggerSttForSubmission(selHW.submission.id)
      await loadHomework()

      pollSttResult(token, selHW.submission.id, setBusyMsg)
        .then(() => {
          setBusyMsg('')
          loadHomework()
        })
        .catch(e => {
          setError(e.message)
          setBusyMsg('')
        })
    } catch (e: any) {
      setError(e.message || 'STT 시작 실패')
      setBusyMsg('')
    } finally {
      setBusy(false)
    }
  }

  // ============================================================
  // AI 피드백 생성
  // ============================================================
  const handleGenerateAi = async () => {
    if (!selHW?.submission) return
    try {
      setBusy(true)
      setBusyMsg('GPT-4o가 분석 중...')
      setError('')
      await generateAiFeedback(selHW.submission.id)
      await loadHomework()
      setBusyMsg('')
    } catch (e: any) {
      setError(e.message || 'AI 피드백 생성 실패')
      setBusyMsg('')
    } finally {
      setBusy(false)
    }
  }

  // ============================================================
  // 피드백 발행
  // ============================================================
  const handlePublish = async (edited: AiFeedback) => {
    if (!selHW?.submission) return
    try {
      setBusy(true)
      setBusyMsg('학생에게 전달 중...')
      setError('')
      await publishFeedback(selHW.submission.id, edited)
      await loadHomework()
      setBusyMsg('')
    } catch (e: any) {
      setError(e.message || '피드백 발행 실패')
      setBusyMsg('')
    } finally {
      setBusy(false)
    }
  }

  // ============================================================
  // 재제출 허용
  // ============================================================
  const handleAllowResubmit = async () => {
    if (!selHW?.submission) return
    const aiCount = (selHW.submission as any).ai_feedback_count ?? 0
    const remaining = 2 - aiCount
    if (remaining <= 0) {
      setError('이 숙제는 AI 피드백을 이미 2회 사용했어요. 더 이상 재제출을 허용할 수 없어요.')
      return
    }
    if (!confirm(
      '학생이 다시 수정해서 제출할 수 있게 풀어줄까요?\n\n' +
      '• 학생의 답변/영상은 그대로 유지되고, 학생이 그걸 토대로 수정해요.\n' +
      `• AI 피드백은 초기화되며, 재제출 후 다시 생성하면 ${remaining}회 중 1회를 사용해요.`
    )) return

    try {
      setBusy(true)
      setBusyMsg('재제출 허용 처리 중...')
      setError('')
      await allowResubmit(selHW.submission.id)
      await loadHomework()
      setBusyMsg('')
    } catch (e: any) {
      setError(e.message || '재제출 허용 실패')
      setBusyMsg('')
    } finally {
      setBusy(false)
    }
  }

  // ============================================================
  // 렌더
  // ============================================================
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-ink-muted text-[14px] font-medium">
        숙제를 불러오는 중...
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-full overflow-hidden">

      {/* ==================== 왼쪽 패널 ==================== */}
      <div className="w-[320px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="px-4 py-3 border-b border-line flex-shrink-0">
          <div className="text-[14px] font-extrabold text-ink tracking-tight">숙제 목록</div>
          <div className="text-[11px] font-medium text-ink-secondary mt-1 flex gap-3">
            <span>제출 <span className="font-bold" style={{ color: THEME.accent }}>{submittedCount}/{items.length}</span></span>
            <span>·</span>
            <span>피드백 <span className="font-bold" style={{ color: THEME.accent }}>{feedbackDoneCount}/{submittedCount}</span></span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {months.map((month, mi) => (
            <div key={month}>
              <div className={`text-[10px] font-bold text-ink-muted uppercase tracking-wider px-1 mb-1.5 ${mi > 0 ? 'mt-4' : ''}`}>
                {month}
              </div>
              {grouped[month].map(h => {
                const isSelected = selId === h.id
                const status = getListStatus(h)
                return (
                  <button
                    key={h.id}
                    onClick={() => { setSelId(h.id); setError('') }}
                    className="w-full rounded-xl px-3 py-2.5 mb-1.5 text-left transition-all"
                    style={{
                      border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                      background: isSelected ? THEME.accentBg : '#fff',
                      boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0"
                        style={{
                          background:
                            status === 'final' || status === 'feedback' ? THEME.accent
                            : status === 'draft' || status === 'resubmit' ? '#F59E0B'
                            : '#F3F4F6',
                          color: status === 'pending' ? '#9CA3AF' : '#fff',
                        }}
                      >
                        {status === 'final' || status === 'feedback' ? '✓'
                         : status === 'draft' ? '✎'
                         : status === 'resubmit' ? '↻'
                         : h.week}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[12.5px] truncate"
                          style={{
                            fontWeight: isSelected ? 700 : 600,
                            color: isSelected ? THEME.accentDark : '#1a1a1a',
                          }}
                        >
                          {h.title}
                        </div>
                        <div className="text-[10px] font-medium text-ink-muted mt-0.5 flex items-center gap-1 flex-wrap">
                          <span>{h.type === 'video' ? '영상' : '텍스트'}</span>
                          <span>·</span>
                          <ListStatusLabel status={status} />
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ==================== 오른쪽 상세 ==================== */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
        {!selHW ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
            <div className="text-[14px] font-bold text-ink-secondary">숙제를 선택해주세요</div>
          </div>
        ) : (
          <DetailPanel
            item={selHW}
            busy={busy}
            busyMsg={busyMsg}
            error={error}
            onStartStt={handleStartStt}
            onGenerateAi={handleGenerateAi}
            onPublish={handlePublish}
            onAllowResubmit={handleAllowResubmit}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================
// 리스트 상태
// ============================================================
type ListStatus = 'pending' | 'draft' | 'final' | 'resubmit' | 'feedback'

function getListStatus(h: HomeworkItem): ListStatus {
  const sub: any = h.submission
  if (!sub) return 'pending'
  if (sub.final_feedback) return 'feedback'
  if (sub.is_final && sub.resubmit_allowed) return 'resubmit'
  if (sub.is_final) return 'final'
  return 'draft'
}

function ListStatusLabel({ status }: { status: ListStatus }) {
  if (status === 'feedback') return <span className="font-bold text-green-600">피드백완료</span>
  if (status === 'final') return <span className="font-bold text-amber-600">피드백대기</span>
  if (status === 'resubmit') return <span className="font-bold text-amber-600">재제출 허용</span>
  if (status === 'draft') return <span className="font-bold text-amber-600">임시저장</span>
  return <span className="font-bold text-ink-muted">미제출</span>
}

// ============================================================
// 상세 패널
// ============================================================
function DetailPanel({
  item,
  busy,
  busyMsg,
  error,
  onStartStt,
  onGenerateAi,
  onPublish,
  onAllowResubmit,
}: {
  item: HomeworkItem
  busy: boolean
  busyMsg: string
  error: string
  onStartStt: () => void
  onGenerateAi: () => void
  onPublish: (edited: AiFeedback) => void
  onAllowResubmit: () => void
}) {
  const sub: any = item.submission
  const isVideo = item.type === 'video'
  const aiCount = sub?.ai_feedback_count ?? 0

  const isDraft = !!sub && !sub.is_final
  const isFinal = !!sub?.is_final
  const isResubmitAllowed = !!sub?.is_final && !!sub?.resubmit_allowed
  const isFeedbackPublished = !!sub?.final_feedback

  return (
    <>
      {/* ── 헤더 ── */}
      <div className="px-5 py-4 border-b border-line flex-shrink-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
            style={{
              color: THEME.accentDark,
              background: THEME.accentBg,
              border: `1px solid ${THEME.accentBorder}60`,
            }}
          >
            {item.month}
          </span>
          <span className="text-[11px] font-semibold text-ink-secondary bg-gray-100 px-2.5 py-0.5 rounded-full">
            {item.week}주차
          </span>
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
            style={{
              background: isVideo ? '#F5F3FF' : '#EFF6FF',
              color: isVideo ? '#7C3AED' : '#2563EB',
              border: `1px solid ${isVideo ? '#DDD6FE' : '#93C5FD'}60`,
            }}
          >
            {isVideo ? '영상 제출' : '텍스트 제출'}
          </span>
          <DetailStatusBadge item={item} />
        </div>
        <div className="text-[17px] font-extrabold text-ink tracking-tight">{item.title}</div>
      </div>

      {/* ── 바디 ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-[13px] font-medium">
            {error}
          </div>
        )}

        {busyMsg && (
          <div
            className="rounded-lg px-4 py-2.5 text-[12px] font-bold flex items-center gap-2"
            style={{ background: THEME.accentBg, color: THEME.accentDark, border: `1px solid ${THEME.accentBorder}60` }}
          >
            <span className="animate-pulse">●</span> {busyMsg}
          </div>
        )}

        {/* 재제출 허용 버튼 */}
        {isFinal && isFeedbackPublished && !isResubmitAllowed && aiCount < 2 && (
          <div className="flex justify-end">
            <button
              onClick={onAllowResubmit}
              disabled={busy}
              className="px-3 py-1.5 text-[12px] font-bold rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-50"
            >
              재제출 허용
            </button>
          </div>
        )}

        {/* AI 피드백 횟수 소진 안내 */}
        {aiCount >= 2 && isFeedbackPublished && (
          <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-[11px] font-medium text-ink-secondary">
            이 숙제는 AI 피드백을 2회 모두 사용했어요. 더 이상 재제출을 허용할 수 없어요.
          </div>
        )}

        {/* 숙제 내용 */}
        <div
          className="rounded-xl px-4 py-3.5"
          style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: THEME.accent }}>
            이번 주 숙제
          </div>
          <div className="text-[13px] font-bold leading-[1.7]" style={{ color: THEME.accentDark }}>
            {item.task}
          </div>
        </div>

        {/* 학생 제출물 */}
        <div className="bg-white border border-line rounded-xl px-5 py-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-2">
              학생 제출물
              {isDraft && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] normal-case tracking-normal">
                  임시저장 (학생 작성 중)
                </span>
              )}
            </div>
            {sub && (
              <span className="text-[10px] font-semibold text-ink-muted">
                {sub.is_final && sub.finalized_at
                  ? `${new Date(sub.finalized_at).toLocaleDateString('ko-KR')} 최종제출`
                  : `${new Date(sub.draft_updated_at ?? sub.submitted_at).toLocaleDateString('ko-KR')} 저장`}
              </span>
            )}
          </div>

          {!sub ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <div className="text-[13px] font-bold text-ink-secondary">아직 제출되지 않았어요.</div>
              <div className="text-[11px] font-medium text-ink-muted mt-1">학생이 숙제를 제출하면 여기에 표시돼요.</div>
            </div>
          ) : isVideo ? (
            <VideoSubmission sub={sub} busy={busy} onStartStt={onStartStt} />
          ) : (
            <div className="bg-gray-50 border border-line rounded-lg px-4 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
              {sub.answer}
            </div>
          )}
        </div>

        {/* AI 피드백 패널 (최종제출된 경우만) */}
        {isFinal && (
          <FeedbackPanel
            sub={sub}
            isVideo={isVideo}
            busy={busy}
            onGenerateAi={onGenerateAi}
            onPublish={onPublish}
          />
        )}

        {/* 임시저장 안내 */}
        {isDraft && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="text-[12px] font-bold text-amber-800 mb-1">학생이 임시저장한 상태예요</div>
            <div className="text-[11px] text-amber-700 leading-relaxed">
              학생이 최종 제출하면 STT 변환과 AI 피드백 생성이 가능해요.
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function DetailStatusBadge({ item }: { item: HomeworkItem }) {
  const sub: any = item.submission
  if (!sub) {
    return (
      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full ml-auto bg-gray-100 text-gray-600 border border-gray-200">
        미제출
      </span>
    )
  }
  if (sub.is_final && sub.resubmit_allowed) {
    return (
      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full ml-auto bg-amber-100 text-amber-700 border border-amber-200">
        재제출 허용됨 (학생 수정 대기)
      </span>
    )
  }
  if (sub.is_final && item.hasFeedback) {
    return (
      <span
        className="text-[11px] font-bold px-2.5 py-0.5 rounded-full ml-auto"
        style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #6EE7B760' }}
      >
        피드백 완료
      </span>
    )
  }
  if (sub.is_final) {
    return (
      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full ml-auto bg-orange-50 text-orange-700 border border-orange-200">
        피드백 대기
      </span>
    )
  }
  return (
    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full ml-auto bg-amber-100 text-amber-700 border border-amber-200">
      임시저장 (학생 작성 중)
    </span>
  )
}

// ============================================================
// 영상 제출물 (어드민)
// ============================================================
function VideoSubmission({
  sub,
  busy,
  onStartStt,
}: {
  sub: any
  busy: boolean
  onStartStt: () => void
}) {
  return (
    <div>
      {sub.video_url && (
        <div className="flex justify-center mb-3">
          <div
            className="relative bg-black rounded-xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
            style={{ width: '280px', aspectRatio: '9/16', maxHeight: '500px' }}
          >
            <video src={sub.video_url} controls className="w-full h-full" />
          </div>
        </div>
      )}

      <div
        className="mt-3 rounded-lg px-4 py-3"
        style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="text-[11px] font-bold mb-0.5" style={{ color: THEME.accentDark }}>
              AI 음성 → 텍스트 변환
            </div>
            <div className="text-[11px] font-medium" style={{ color: THEME.accent }}>
              {sub.stt_status === 'completed' && '변환 완료'}
              {sub.stt_status === 'transcribing' && '변환 진행 중...'}
              {sub.stt_status === 'failed' && `실패: ${sub.stt_error}`}
              {(!sub.stt_status || sub.stt_status === 'none') && '아직 변환되지 않았어요'}
            </div>
          </div>
          {(sub.stt_status === 'none' || sub.stt_status === 'failed' || !sub.stt_status) && (
            <button
              onClick={onStartStt}
              disabled={busy}
              className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all disabled:opacity-50"
              style={{ background: THEME.accent, boxShadow: `0 2px 6px ${THEME.accentShadow}` }}
            >
              변환 시작
            </button>
          )}
        </div>

        {sub.transcript && (
          <details className="mt-2">
            <summary className="text-[11px] font-bold cursor-pointer" style={{ color: THEME.accentDark }}>
              변환된 텍스트 보기
            </summary>
            <div
              className="text-[12px] leading-[1.7] mt-2 p-3 bg-white rounded border border-line whitespace-pre-wrap"
              style={{ color: THEME.accentDark }}
            >
              {sub.transcript}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// ============================================================
// 자동 높이 textarea
// ============================================================
function AutoGrowTextarea({
  value,
  onChange,
  className,
  placeholder,
  minRows = 1,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
  placeholder?: string
  minRows?: number
  disabled?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      disabled={disabled}
      className={className}
      style={{ overflow: 'hidden' }}
    />
  )
}

// ============================================================
// 피드백 패널 — 새 디자인 (좌우 2단 + 1줄 헤더 + 1줄 푸터)
// ============================================================
function FeedbackPanel({
  sub,
  isVideo,
  busy,
  onGenerateAi,
  onPublish,
}: {
  sub: any
  isVideo: boolean
  busy: boolean
  onGenerateAi: () => void
  onPublish: (edited: AiFeedback) => void
}) {
  const aiFb: AiFeedback | null = sub.ai_feedback
  const finalFb: AiFeedback | null = sub.final_feedback
  const [editFb, setEditFb] = useState<AiFeedback | null>(null)
  const [showNote, setShowNote] = useState(false)

  const aiCount = sub.ai_feedback_count ?? 0
  const canGenerateMore = aiCount < 2

  useEffect(() => {
    if (aiFb && !finalFb && !editFb) {
      setEditFb(JSON.parse(JSON.stringify(aiFb)))
    }
    if (finalFb) {
      setEditFb(JSON.parse(JSON.stringify(finalFb)))
    }
  }, [aiFb, finalFb])

  const canGenerate = (isVideo ? !!sub.transcript : !!sub.answer) && canGenerateMore

  // ============================================================
  // 1) AI 피드백 아직 없음
  // ============================================================
  if (!aiFb) {
    return (
      <div className="bg-white border border-line rounded-xl px-5 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">AI 피드백</div>
          <div className="text-[10px] font-bold text-ink-muted">
            사용 <span style={{ color: aiCount >= 2 ? '#D97706' : THEME.accent }}>{aiCount}/2</span>
          </div>
        </div>
        <div className="bg-gray-50 border border-dashed border-line rounded-lg px-4 py-5 text-center">
          {!canGenerateMore ? (
            <>
              <div className="text-[12px] font-bold text-amber-700">AI 피드백 사용 횟수 소진</div>
              <div className="text-[10px] font-medium text-ink-muted mt-1">이 숙제는 더 이상 AI 피드백을 생성할 수 없어요.</div>
            </>
          ) : !canGenerate ? (
            <>
              <div className="text-[12px] font-bold text-ink-secondary">먼저 STT 변환을 완료해주세요</div>
              <div className="text-[10px] font-medium text-ink-muted mt-1">변환 후 AI 피드백을 생성할 수 있어요.</div>
            </>
          ) : (
            <>
              <div className="text-[12px] font-bold text-ink mb-2.5">
                AI가 학생 답변을 분석해 피드백을 만들어드려요
              </div>
              <button
                onClick={onGenerateAi}
                disabled={busy}
                className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:opacity-50"
                style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
              >
                AI 피드백 생성 ({aiCount + 1}/2)
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ============================================================
  // 2) AI 피드백 있음 — 좌우 2단 새 레이아웃
  // ============================================================
  if (!editFb) return null
  const isPublished = !!finalFb

  return (
    <div
      className="bg-white border-2 rounded-xl overflow-hidden"
      style={{ borderColor: isPublished ? THEME.accent : THEME.accentBorder }}
    >
      {/* 헤더 — 1줄 */}
      <div className="px-3 py-2" style={{ background: THEME.gradient }}>
        <div className="flex items-center gap-2 text-white">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[11px] font-bold opacity-90">
              {isPublished ? '전달됨' : '검토 필요'}
            </span>
            <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[9px] font-bold">
              AI {aiCount}/2
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-1">
            <ScoreInline label="총점" score={editFb.totalScore} highlight />
            <span className="text-white/40 text-[10px]">|</span>
            <ScoreInline label="구조" score={editFb.structureScore} />
            <span className="text-white/40 text-[10px]">|</span>
            <ScoreInline label="내용" score={editFb.contentScore} />
          </div>

          <div className="flex-1 min-w-0">
            {isPublished ? (
              <div className="text-[12px] font-medium opacity-95 truncate">{editFb.summary}</div>
            ) : (
              <input
                type="text"
                value={editFb.summary}
                onChange={e => setEditFb({ ...editFb, summary: e.target.value })}
                className="w-full bg-white/15 border border-white/30 rounded px-2 py-1 text-[12px] font-medium text-white placeholder-white/60 focus:outline-none focus:bg-white/25"
                placeholder="요약"
              />
            )}
          </div>

          {!isPublished && canGenerateMore && (
            <button
              onClick={onGenerateAi}
              disabled={busy}
              className="flex-shrink-0 px-2 py-1 bg-white/20 backdrop-blur-sm text-white rounded-md text-[10px] font-bold hover:bg-white/30 transition-all disabled:opacity-50"
            >
              재생성
            </button>
          )}
        </div>
      </div>

      {/* 본문 — 좌우 2단 */}
      <div className="grid grid-cols-2 divide-x divide-line">
        <FeedbackEditableSection
          title="스피치 구조"
          data={editFb.structure}
          editable={!isPublished}
          onChange={(d) => setEditFb({ ...editFb, structure: d })}
        />
        <FeedbackEditableSection
          title="내용"
          data={editFb.content}
          editable={!isPublished}
          onChange={(d) => setEditFb({ ...editFb, content: d })}
        />
      </div>

      {/* 다음 스텝 — 1줄 */}
      <div className="px-3 py-2 bg-gray-50 border-t border-line">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider whitespace-nowrap flex-shrink-0">
            다음 스텝
          </span>
          {!isPublished ? (
            <AutoGrowTextarea
              value={editFb.nextStep}
              onChange={(v) => setEditFb({ ...editFb, nextStep: v })}
              className="flex-1 text-[12px] leading-[1.5] border border-line rounded px-2 py-1 resize-none bg-white focus:outline-none"
              minRows={1}
            />
          ) : (
            <div className="flex-1 text-[12px] text-ink leading-[1.5] font-medium">
              {editFb.nextStep}
            </div>
          )}
        </div>
      </div>

      {/* 푸터 — 메모 토글 + 학생전달 */}
      <div className="px-3 py-2 border-t border-line bg-white flex items-center gap-2">
        {editFb.teacherNote && (
          <button
            onClick={() => setShowNote(v => !v)}
            className="text-[10px] font-bold text-yellow-700 px-2 py-1 rounded bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition-colors"
          >
            {showNote ? '메모 접기' : '선생님 메모 보기'}
          </button>
        )}

        <div className="flex-1" />

        {!isPublished && (
          <button
            onClick={() => onPublish(editFb)}
            disabled={busy}
            className="px-4 py-1.5 text-white rounded-lg text-[12px] font-bold transition-all disabled:opacity-50"
            style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
          >
            학생에게 전달
          </button>
        )}
      </div>

      {/* 선생님 메모 (펼쳤을 때만) */}
      {editFb.teacherNote && showNote && (
        <div className="px-3 py-2 bg-yellow-50 border-t border-yellow-100">
          <div className="text-[10px] font-bold text-yellow-700 mb-1 uppercase tracking-wider">
            선생님 참고 메모 (학생 미공개)
          </div>
          <div className="text-[11.5px] text-yellow-900 leading-[1.5]">{editFb.teacherNote}</div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 인라인 점수
// ============================================================
function ScoreInline({ label, score, highlight }: { label: string; score: number; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className={`font-extrabold tracking-tight leading-none ${highlight ? 'text-[18px]' : 'text-[14px] opacity-80'}`}>
        {score}
      </span>
      <span className="text-[9px] font-bold opacity-70">{label}</span>
    </div>
  )
}

// ============================================================
// 강점/개선점 — 한 컬럼 (위: 강점, 아래: 개선점)
// ============================================================
function FeedbackEditableSection({
  title,
  data,
  editable,
  onChange,
}: {
  title: string
  data: { 강점: string[]; 개선점: string[] }
  editable: boolean
  onChange: (d: { 강점: string[]; 개선점: string[] }) => void
}) {
  const updateItem = (kind: '강점' | '개선점', i: number, v: string) => {
    const next = { ...data, [kind]: [...data[kind]] }
    next[kind][i] = v
    onChange(next)
  }

  return (
    <div className="px-3 py-2.5">
      <div className="text-[11px] font-extrabold text-ink mb-2">{title}</div>

      {/* 강점 */}
      <div className="mb-2">
        <div className="text-[9px] font-bold text-emerald-600 mb-1 uppercase tracking-wider">강점</div>
        <div className="flex flex-col gap-1">
          {data.강점?.map((s, i) => (
            editable ? (
              <AutoGrowTextarea
                key={i}
                value={s}
                onChange={(v) => updateItem('강점', i, v)}
                className="w-full text-[11.5px] text-ink leading-[1.5] px-2 py-1 border border-emerald-100 bg-emerald-50/30 rounded resize-none focus:outline-none focus:border-emerald-400 focus:bg-white"
                minRows={1}
              />
            ) : (
              <div
                key={i}
                className="text-[11.5px] text-ink leading-[1.5] pl-2.5 relative before:content-['•'] before:absolute before:left-0 before:text-emerald-500"
              >
                {s}
              </div>
            )
          ))}
        </div>
      </div>

      {/* 개선점 */}
      <div>
        <div className="text-[9px] font-bold text-amber-600 mb-1 uppercase tracking-wider">개선점</div>
        <div className="flex flex-col gap-1">
          {data.개선점?.map((s, i) => (
            editable ? (
              <AutoGrowTextarea
                key={i}
                value={s}
                onChange={(v) => updateItem('개선점', i, v)}
                className="w-full text-[11.5px] text-ink leading-[1.5] px-2 py-1 border border-amber-100 bg-amber-50/30 rounded resize-none focus:outline-none focus:border-amber-400 focus:bg-white"
                minRows={1}
              />
            ) : (
              <div
                key={i}
                className="text-[11.5px] text-ink leading-[1.5] pl-2.5 relative before:content-['•'] before:absolute before:left-0 before:text-amber-500"
              >
                {s}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  )
}