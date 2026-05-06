import { useState, useEffect } from 'react'
import {
  fetchHomeworkForAdmin,
  triggerSttForSubmission,
  pollSttResult,
  generateAiFeedback,
  publishFeedback,
  type HomeworkItem,
  type AiFeedback,
} from '@/lib/homework/api'

// 🌱 중등 초록 테마
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
  // STT 수동 트리거 (영상 있는데 STT 안 했을 때)
  // ============================================================
  const handleStartStt = async () => {
    if (!selHW?.submission) return
    try {
      setBusy(true)
      setBusyMsg('AI 음성 분석 시작...')
      setError('')
      const token = await triggerSttForSubmission(selHW.submission.id)
      await loadHomework()

      // 폴링
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

        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-line flex-shrink-0">
          <div className="text-[14px] font-extrabold text-ink tracking-tight">✏️ 숙제 목록</div>
          <div className="text-[11px] font-medium text-ink-secondary mt-1 flex gap-3">
            <span>제출 <span className="font-bold" style={{ color: THEME.accent }}>{submittedCount}/{items.length}</span></span>
            <span>·</span>
            <span>피드백 <span className="font-bold" style={{ color: THEME.accent }}>{feedbackDoneCount}/{submittedCount}</span></span>
          </div>
        </div>

        {/* 숙제 리스트 */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {months.map((month, mi) => (
            <div key={month}>
              <div className={`text-[10px] font-bold text-ink-muted uppercase tracking-wider px-1 mb-1.5 ${mi > 0 ? 'mt-4' : ''}`}>
                📅 {month}
              </div>
              {grouped[month].map(h => {
                const isSelected = selId === h.id
                const hasFeedback = h.hasFeedback
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
                          background: h.submitted ? THEME.accent : '#F3F4F6',
                          color: h.submitted ? '#fff' : '#9CA3AF',
                        }}
                      >
                        {h.submitted ? '✓' : h.week}
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
                          <span>{h.type === 'video' ? '🎥 영상' : '📝 텍스트'}</span>
                          <span>·</span>
                          {h.submitted ? (
                            hasFeedback ? (
                              <span className="font-bold text-green-600">✓ 피드백완료</span>
                            ) : (
                              <span className="font-bold text-amber-600">⏳ 피드백대기</span>
                            )
                          ) : (
                            <span className="font-bold text-ink-muted">○ 미제출</span>
                          )}
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
            <div className="text-4xl">✏️</div>
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
          />
        )}
      </div>
    </div>
  )
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
}: {
  item: HomeworkItem
  busy: boolean
  busyMsg: string
  error: string
  onStartStt: () => void
  onGenerateAi: () => void
  onPublish: (edited: AiFeedback) => void
}) {
  const sub = item.submission
  const isVideo = item.type === 'video'

  return (
    <>
      {/* 헤더 */}
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
            📅 {item.month}
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
            {isVideo ? '🎥 영상 제출' : '📝 텍스트 제출'}
          </span>
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full ml-auto"
            style={{
              background: item.submitted ? (item.hasFeedback ? '#ECFDF5' : '#FFF7ED') : '#F3F4F6',
              color: item.submitted ? (item.hasFeedback ? '#059669' : '#D97706') : '#6B7280',
              border: `1px solid ${item.submitted ? (item.hasFeedback ? '#6EE7B7' : '#FDBA74') : '#E5E7EB'}60`,
            }}
          >
            {item.submitted ? (item.hasFeedback ? '✓ 피드백완료' : '⏳ 피드백대기') : '○ 미제출'}
          </span>
        </div>
        <div className="text-[17px] font-extrabold text-ink tracking-tight">{item.title}</div>
      </div>

      {/* 바디 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-[13px] font-medium">
            ⚠️ {error}
          </div>
        )}

        {busyMsg && (
          <div
            className="rounded-lg px-4 py-2.5 text-[12px] font-bold flex items-center gap-2"
            style={{ background: THEME.accentBg, color: THEME.accentDark, border: `1px solid ${THEME.accentBorder}60` }}
          >
            <span className="animate-pulse">⏳</span> {busyMsg}
          </div>
        )}

        {/* 숙제 내용 */}
        <div
          className="rounded-xl px-4 py-3.5"
          style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: THEME.accent }}>
            📋 이번 주 숙제
          </div>
          <div className="text-[13px] font-bold leading-[1.7]" style={{ color: THEME.accentDark }}>
            {item.task}
          </div>
        </div>

        {/* 학생 제출물 */}
        <div className="bg-white border border-line rounded-xl px-5 py-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              👤 학생 제출물
            </div>
            {sub && (
              <span className="text-[10px] font-semibold text-ink-muted">
                {new Date(sub.submitted_at).toLocaleDateString('ko-KR')} 제출
              </span>
            )}
          </div>

          {!item.submitted ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <div className="text-3xl mb-2">⏳</div>
              <div className="text-[13px] font-bold text-ink-secondary">아직 제출되지 않았어요.</div>
              <div className="text-[11px] font-medium text-ink-muted mt-1">학생이 숙제를 제출하면 여기에 표시돼요.</div>
            </div>
          ) : isVideo && sub ? (
            <VideoSubmission sub={sub} busy={busy} onStartStt={onStartStt} />
          ) : (
            <div className="bg-gray-50 border border-line rounded-lg px-4 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
              {sub?.answer}
            </div>
          )}
        </div>

        {/* AI 피드백 영역 */}
        {item.submitted && sub && (
          <FeedbackPanel
            sub={sub}
            isVideo={isVideo}
            busy={busy}
            onGenerateAi={onGenerateAi}
            onPublish={onPublish}
          />
        )}
      </div>
    </>
  )
}

// ============================================================
// 영상 제출물 표시 (어드민)
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
      {/* 영상 플레이어 */}
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

      {/* STT 상태 */}
      <div
        className="mt-3 rounded-lg px-4 py-3"
        style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🎙️</span>
          <div className="flex-1">
            <div className="text-[11px] font-bold mb-0.5" style={{ color: THEME.accentDark }}>
              AI 음성 → 텍스트 변환
            </div>
            <div className="text-[11px] font-medium" style={{ color: THEME.accent }}>
              {sub.stt_status === 'completed' && '✓ 변환 완료'}
              {sub.stt_status === 'transcribing' && '⏳ 변환 진행 중...'}
              {sub.stt_status === 'failed' && `⚠️ 실패: ${sub.stt_error}`}
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
              ✨ 변환 시작
            </button>
          )}
        </div>

        {sub.transcript && (
          <details className="mt-2">
            <summary className="text-[11px] font-bold cursor-pointer" style={{ color: THEME.accentDark }}>
              📝 변환된 텍스트 보기
            </summary>
            <div className="text-[12px] leading-[1.7] mt-2 p-3 bg-white rounded border border-line whitespace-pre-wrap" style={{ color: THEME.accentDark }}>
              {sub.transcript}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// ============================================================
// 피드백 패널 (AI 생성 + 검토 + 발행)
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
  // AI 피드백 있는데 final_feedback이 없으면 → 검토 모드 (편집 가능)
  // final_feedback 있으면 → 발행 완료 상태
  const aiFb: AiFeedback | null = sub.ai_feedback
  const finalFb: AiFeedback | null = sub.final_feedback
  const [editFb, setEditFb] = useState<AiFeedback | null>(null)

  // AI 피드백 생성됐는데 편집본이 없으면 AI 피드백을 편집본으로 초기화
  useEffect(() => {
    if (aiFb && !finalFb && !editFb) {
      setEditFb(JSON.parse(JSON.stringify(aiFb)))
    }
    if (finalFb) {
      setEditFb(JSON.parse(JSON.stringify(finalFb)))
    }
  }, [aiFb, finalFb])

  // AI 피드백 가능 여부
  const canGenerate = isVideo ? !!sub.transcript : !!sub.answer

  // ============================================================
  // 1) AI 피드백 아직 없음 → 생성 버튼만
  // ============================================================
  if (!aiFb) {
    return (
      <div className="bg-white border border-line rounded-xl px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
            💬 AI 피드백
          </div>
        </div>
        <div className="bg-gray-50 border border-dashed border-line rounded-lg px-4 py-6 text-center">
          {!canGenerate ? (
            <>
              <div className="text-3xl mb-2">🎙️</div>
              <div className="text-[13px] font-bold text-ink-secondary">먼저 STT 변환을 완료해주세요</div>
              <div className="text-[11px] font-medium text-ink-muted mt-1">변환 후 AI 피드백을 생성할 수 있어요.</div>
            </>
          ) : (
            <>
              <div className="text-3xl mb-2">✨</div>
              <div className="text-[13px] font-bold text-ink mb-3">
                AI가 학생 답변을 분석해서 피드백을 만들어드려요
              </div>
              <button
                onClick={onGenerateAi}
                disabled={busy}
                className="px-5 py-2.5 text-white rounded-lg text-[13px] font-bold transition-all disabled:opacity-50"
                style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
              >
                ✨ AI 피드백 생성
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ============================================================
  // 2) AI 피드백 있음 → 검토/편집/발행
  // ============================================================
  if (!editFb) return null
  const isPublished = !!finalFb

  return (
    <div className="bg-white border-2 rounded-xl overflow-hidden" style={{ borderColor: isPublished ? THEME.accent : THEME.accentBorder }}>
      {/* 헤더 */}
      <div
        className="px-5 py-4"
        style={{ background: THEME.gradient }}
      >
        <div className="flex items-center justify-between text-white">
          <div>
            <div className="text-[11px] font-bold opacity-80 mb-0.5">
              {isPublished ? '✅ 학생에게 전달된 피드백' : '✨ AI 생성 피드백 (검토 필요)'}
            </div>
            <div className="text-[13px] font-medium opacity-95">{editFb.summary}</div>
          </div>
          <div className="flex gap-1.5">
            {!isPublished && (
              <button
                onClick={onGenerateAi}
                disabled={busy}
                className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white rounded-md text-[11px] font-bold hover:bg-white/30 transition-all disabled:opacity-50"
              >
                🔄 재생성
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 점수 */}
      <div className="px-5 py-4 border-b border-line">
        <div className="flex items-center justify-around">
          <ScoreItem label="총점" score={editFb.totalScore} highlight />
          <ScoreItem label="구조" score={editFb.structureScore} />
          <ScoreItem label="내용" score={editFb.contentScore} />
        </div>
      </div>

      {/* 강점/개선점 (편집 가능) */}
      <div className="px-5 py-4 grid grid-cols-1 gap-3">
        <FeedbackEditableSection
          title="🏗️ 스피치 구조"
          data={editFb.structure}
          editable={!isPublished}
          onChange={(d) => setEditFb({ ...editFb, structure: d })}
        />
        <FeedbackEditableSection
          title="📚 내용"
          data={editFb.content}
          editable={!isPublished}
          onChange={(d) => setEditFb({ ...editFb, content: d })}
        />
      </div>

      {/* 다음 스텝 */}
      <div className="px-5 py-4 bg-gray-50 border-t border-line">
        <div className="text-[11px] font-bold text-ink-muted mb-1.5">🎯 다음 스텝</div>
        {!isPublished ? (
          <textarea
            value={editFb.nextStep}
            onChange={(e) => setEditFb({ ...editFb, nextStep: e.target.value })}
            className="w-full text-[13px] leading-[1.7] border border-line rounded p-2 resize-none"
            rows={2}
          />
        ) : (
          <div className="text-[13px] text-ink leading-[1.7] font-medium">{editFb.nextStep}</div>
        )}
      </div>

      {/* 선생님 메모 */}
      {editFb.teacherNote && (
        <div className="px-5 py-4 bg-yellow-50 border-t border-yellow-100">
          <div className="text-[11px] font-bold text-yellow-700 mb-1.5">📝 선생님 참고 메모 (학생 미공개)</div>
          <div className="text-[12px] text-yellow-900 leading-[1.7]">{editFb.teacherNote}</div>
        </div>
      )}

      {/* 액션 버튼 */}
      {!isPublished && (
        <div className="px-5 py-4 border-t border-line bg-white flex gap-2 justify-end">
          <button
            onClick={() => onPublish(editFb)}
            disabled={busy}
            className="px-5 py-2.5 text-white rounded-lg text-[13px] font-bold transition-all disabled:opacity-50"
            style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
          >
            📤 학생에게 전달
          </button>
        </div>
      )}
    </div>
  )
}

function ScoreItem({ label, score, highlight }: { label: string; score: number; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className={`font-extrabold tracking-tight ${highlight ? 'text-[28px]' : 'text-[20px] text-ink-secondary'}`} style={highlight ? { color: THEME.accentDark } : {}}>
        {score}
      </div>
      <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

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
    <div>
      <div className="text-[12px] font-extrabold text-ink mb-2">{title}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] font-bold text-emerald-600 mb-1.5">💚 강점</div>
          {data.강점?.map((s, i) => (
            editable ? (
              <textarea
                key={i}
                value={s}
                onChange={e => updateItem('강점', i, e.target.value)}
                className="w-full text-[12px] text-ink leading-[1.6] mb-1.5 p-2 border border-line rounded resize-none"
                rows={2}
              />
            ) : (
              <div key={i} className="text-[12px] text-ink leading-[1.6] mb-1.5 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-emerald-500">
                {s}
              </div>
            )
          ))}
        </div>
        <div>
          <div className="text-[10px] font-bold text-amber-600 mb-1.5">🌱 개선점</div>
          {data.개선점?.map((s, i) => (
            editable ? (
              <textarea
                key={i}
                value={s}
                onChange={e => updateItem('개선점', i, e.target.value)}
                className="w-full text-[12px] text-ink leading-[1.6] mb-1.5 p-2 border border-line rounded resize-none"
                rows={2}
              />
            ) : (
              <div key={i} className="text-[12px] text-ink leading-[1.6] mb-1.5 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-amber-500">
                {s}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  )
}