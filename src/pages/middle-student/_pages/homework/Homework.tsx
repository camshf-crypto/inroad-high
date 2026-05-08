import { useState, useEffect, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import {
  fetchHomeworkForStudent,
  saveDraftText,
  saveDraftVideo,
  finalizeSubmission,
  type HomeworkItem,
  type AiFeedback,
} from '@/lib/homework/api'

export default function MiddleHomework() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const grade = student?.grade || '중1'

  // ============================================================
  // 상태
  // ============================================================
  const [items, setItems] = useState<HomeworkItem[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // ============================================================
  // 데이터 로드
  // ============================================================
  useEffect(() => {
    if (!student?.id) return
    loadHomework()
    const onTeacherAction = () => loadHomework()
    window.addEventListener('teacher-action', onTeacherAction)
    return () => window.removeEventListener('teacher-action', onTeacherAction)
  }, [student?.id, grade])

  const loadHomework = async () => {
    if (!student?.id) return
    try {
      setLoading(true)
      const data = await fetchHomeworkForStudent(grade, String(student.id))
      setItems(data)
      // 첫 미완료(편집 가능) 항목 또는 첫 항목 선택
      const cur = data.find(d => d.isEditable) || data[0]
      if (cur) {
        setSelId(cur.id)
        primeInput(cur)
      }
    } catch (e: any) {
      setError(e.message || '숙제를 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }

  // 선택 시 입력에 임시저장본 미리 채워넣기
  const primeInput = (h: HomeworkItem) => {
    if (h.type === 'text' && h.submission && h.isEditable) {
      setInputText(h.submission.answer || '')
    } else {
      setInputText('')
    }
    setVideoFile(null)
  }

  const handleSelectHomework = (h: HomeworkItem) => {
    setSelId(h.id)
    setError('')
    primeInput(h)
  }

  // ============================================================
  // 월별 그룹화
  // ============================================================
  const grouped = items.reduce<Record<string, HomeworkItem[]>>((acc, h) => {
    if (!acc[h.month]) acc[h.month] = []
    acc[h.month].push(h)
    return acc
  }, {})
  const months = Object.keys(grouped)

  const selHW = items.find(h => h.id === selId)
  const finalCount = items.filter(h => h.submitted).length

  // ============================================================
  // 임시저장 — 텍스트
  // ============================================================
  const handleSaveDraftText = async () => {
    if (!selHW || !inputText.trim() || !student?.id) return
    try {
      setSaving(true)
      setError('')
      setStatusMsg('임시저장 중...')
      await saveDraftText({
        assignmentId: selHW.id,
        studentId: String(student.id),
        academyId: academy?.academyId ?? null,
        answer: inputText,
      })
      setStatusMsg('✓ 임시저장 완료')
      await loadHomework()
    } catch (e: any) {
      setError(e.message || '임시저장 실패')
      setStatusMsg('')
    } finally {
      setSaving(false)
      setTimeout(() => setStatusMsg(''), 2000)
    }
  }

  // ============================================================
  // 임시저장 — 영상
  // ============================================================
  const handleSaveDraftVideo = async () => {
    if (!selHW || !videoFile || !student?.id) return
    try {
      setSaving(true)
      setError('')
      await saveDraftVideo({
        assignmentId: selHW.id,
        studentId: String(student.id),
        academyId: academy?.academyId ?? null,
        file: videoFile,
        onProgress: setStatusMsg,
      })
      setStatusMsg('✓ 영상 임시저장 완료')
      setVideoFile(null)
      await loadHomework()
    } catch (e: any) {
      setError(e.message || '영상 임시저장 실패')
      setStatusMsg('')
    } finally {
      setSaving(false)
      setTimeout(() => setStatusMsg(''), 2500)
    }
  }

  // ============================================================
  // 최종 제출
  // ============================================================
  const handleFinalize = async () => {
    if (!selHW || !student?.id) return
    if (!confirm(
      '최종 제출하면 더 이상 수정할 수 없어요.\n' +
      '(선생님이 재제출을 허용해주신 경우에만 다시 수정 가능)\n\n진행할까요?'
    )) return

    try {
      setFinalizing(true)
      setError('')
      setStatusMsg('최종 제출 준비 중...')

      // 텍스트: 현재 입력 → 먼저 임시저장 (덮어쓰기)
      if (selHW.type === 'text') {
        if (!inputText.trim()) {
          throw new Error('답변이 비어있어요.')
        }
        const prevAnswer = selHW.submission?.answer ?? ''
        if (prevAnswer !== inputText) {
          await saveDraftText({
            assignmentId: selHW.id,
            studentId: String(student.id),
            academyId: academy?.academyId ?? null,
            answer: inputText,
          })
        }
      }

      // 영상: 새 파일 선택돼있으면 먼저 업로드
      if (selHW.type === 'video' && videoFile) {
        await saveDraftVideo({
          assignmentId: selHW.id,
          studentId: String(student.id),
          academyId: academy?.academyId ?? null,
          file: videoFile,
          onProgress: setStatusMsg,
        })
      }

      // 최종화
      await finalizeSubmission({
        assignmentId: selHW.id,
        studentId: String(student.id),
        onProgress: setStatusMsg,
      })

      setStatusMsg('✓ 최종 제출 완료')
      setVideoFile(null)
      await loadHomework()
    } catch (e: any) {
      setError(e.message || '최종 제출 실패')
      setStatusMsg('')
    } finally {
      setFinalizing(false)
      setTimeout(() => setStatusMsg(''), 3000)
    }
  }

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setVideoFile(f)
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
    <div className="flex h-full overflow-hidden font-sans text-ink">
      {/* 왼쪽: 숙제 상세 */}
      <div className="flex-1 overflow-y-auto px-7 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[20px] font-extrabold text-ink tracking-tight">숙제</div>
            <div className="text-[13px] text-ink-muted mt-0.5">
              {student?.name} · {academy?.academyName}
            </div>
          </div>
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[13px] font-bold px-4 py-1.5 rounded-full border border-brand-middle-light">
            {finalCount}/{items.length} 최종제출
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-[13px] font-medium">
            ⚠️ {error}
          </div>
        )}

        {selHW && (
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            {/* 주차 + 상태 배지 */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2.5 py-0.5 rounded-full border border-brand-middle-light">
                {selHW.month}
              </span>
              <span className="text-[11px] text-ink-secondary font-medium">{selHW.week}주차</span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${selHW.type === 'video'
                  ? 'bg-[#F5F3FF] text-[#7C3AED]'
                  : 'bg-[#EEF2FF] text-[#3B5BDB]'
                }`}>
                {selHW.type === 'video' ? '🎥 영상 제출' : '📝 텍스트 제출'}
              </span>
              <StatusBadge item={selHW} />
            </div>

            {/* 제목 */}
            <div className="text-[18px] font-extrabold text-ink tracking-tight mb-4">{selHW.title}</div>

            {/* 숙제 내용 */}
            <div className="bg-[#EEF2FF] border border-[#BAC8FF] rounded-xl px-4 py-3.5 mb-5">
              <div className="text-[11px] font-bold text-[#3B5BDB] mb-1.5">📋 이번 주 숙제</div>
              <div className="text-[13px] text-[#1E3A8A] leading-[1.7]">{selHW.task}</div>
            </div>

            {/* 진행 상태 메시지 */}
            {statusMsg && (
              <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-4 py-2.5 mb-3 text-[12px] font-bold text-brand-middle-dark flex items-center gap-2">
                <span className="animate-pulse">⏳</span> {statusMsg}
              </div>
            )}

            {/* 재제출 허용 안내 */}
            {selHW.submission?.is_final && selHW.submission?.resubmit_allowed && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
                <div className="text-[12px] font-bold text-amber-800 mb-1">
                  🔓 선생님이 재제출을 허용해주셨어요
                </div>
                <div className="text-[11px] text-amber-700 leading-relaxed">
                  기존에 제출한 내용을 토대로 수정해서 다시 제출할 수 있어요.
                </div>
              </div>
            )}

            {/* 본문: 편집 가능 / 잠김 분기 */}
            {selHW.isEditable ? (
              <EditableArea
                item={selHW}
                inputText={inputText}
                setInputText={setInputText}
                videoFile={videoFile}
                setVideoFile={setVideoFile}
                fileInputRef={fileInputRef}
                cameraInputRef={cameraInputRef}
                onFilePick={handleFilePick}
                saving={saving}
                finalizing={finalizing}
                onSaveDraftText={handleSaveDraftText}
                onSaveDraftVideo={handleSaveDraftVideo}
                onFinalize={handleFinalize}
              />
            ) : (
              <FinalizedView item={selHW} />
            )}
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div className="w-px bg-line flex-shrink-0" />

      {/* 오른쪽: 숙제 목록 */}
      <div className="w-[300px] flex-shrink-0 overflow-y-auto px-4 py-6 bg-[#F8FAFC]">
        <div className="text-[13px] font-bold text-ink mb-3 px-1">전체 숙제 목록</div>

        {months.map((month, mi) => (
          <div key={month}>
            <div className={`text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 px-1 ${mi > 0 ? 'mt-4' : ''}`}>
              {month}
            </div>
            {grouped[month].map(h => {
              const isSelected = selId === h.id
              const status = getStatus(h)
              return (
                <div
                  key={h.id}
                  onClick={() => handleSelectHomework(h)}
                  className={`p-3 rounded-xl mb-1.5 cursor-pointer border transition-all ${isSelected
                      ? 'border-brand-middle bg-white shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                      : status === 'final' || status === 'feedback_done'
                        ? 'border-brand-middle-light bg-brand-middle-pale/60 hover:shadow-sm'
                        : status === 'draft' || status === 'resubmit_open'
                          ? 'border-amber-200 bg-amber-50/40 hover:shadow-sm'
                          : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${status === 'final' || status === 'feedback_done' || isSelected
                        ? 'bg-brand-middle text-white'
                        : status === 'draft' || status === 'resubmit_open'
                          ? 'bg-amber-400 text-white'
                          : 'bg-gray-100 text-ink-muted'
                      }`}>
                      {status === 'final' || status === 'feedback_done' ? '✓'
                        : status === 'draft' ? '✎'
                          : status === 'resubmit_open' ? '↻'
                            : h.week}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12.5px] truncate ${isSelected
                          ? 'font-semibold text-brand-middle-dark'
                          : 'font-medium text-ink'
                        }`}>
                        {h.title}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">
                        {h.type === 'video' ? '🎥 영상' : '📝 텍스트'} · <StatusLabel status={status} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// 상태 헬퍼 (UI 표시용)
// ============================================================
type HwStatus = 'pending' | 'draft' | 'final' | 'resubmit_open' | 'feedback_done'

function getStatus(h: HomeworkItem): HwStatus {
  const sub = h.submission
  if (!sub) return 'pending'
  if (sub.final_feedback) return 'feedback_done'
  if (sub.is_final && sub.resubmit_allowed) return 'resubmit_open'
  if (sub.is_final) return 'final'
  return 'draft'
}

// ============================================================
// 상태 배지
// ============================================================
function StatusBadge({ item }: { item: HomeworkItem }) {
  const status = getStatus(item)
  const config: Record<HwStatus, { label: string; cls: string }> = {
    pending: { label: '○ 미제출', cls: 'bg-gray-100 text-gray-600' },
    draft: { label: '✎ 임시저장', cls: 'bg-amber-100 text-amber-700' },
    final: { label: '✓ 최종제출', cls: 'bg-emerald-100 text-emerald-700' },
    resubmit_open: { label: '↻ 재제출 가능', cls: 'bg-amber-100 text-amber-700' },
    feedback_done: { label: '💬 피드백 완료', cls: 'bg-brand-middle-bg text-brand-middle-dark border border-brand-middle-light' },
  }
  const c = config[status]
  return (
    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${c.cls}`}>
      {c.label}
    </span>
  )
}

function StatusLabel({ status }: { status: HwStatus }) {
  if (status === 'feedback_done') return <>피드백 완료</>
  if (status === 'final') return <>최종제출 · 피드백 대기</>
  if (status === 'resubmit_open') return <span className="text-amber-700 font-bold">재제출 가능</span>
  if (status === 'draft') return <span className="text-amber-700 font-bold">임시저장</span>
  return <>미제출</>
}

// ============================================================
// 편집 가능 영역 (텍스트/영상)
// ============================================================
function EditableArea({
  item,
  inputText,
  setInputText,
  videoFile,
  setVideoFile,
  fileInputRef,
  cameraInputRef,
  onFilePick,
  saving,
  finalizing,
  onSaveDraftText,
  onSaveDraftVideo,
  onFinalize,
}: {
  item: HomeworkItem
  inputText: string
  setInputText: (v: string) => void
  videoFile: File | null
  setVideoFile: (f: File | null) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  cameraInputRef: React.RefObject<HTMLInputElement | null>
  onFilePick: (e: React.ChangeEvent<HTMLInputElement>) => void
  saving: boolean
  finalizing: boolean
  onSaveDraftText: () => void
  onSaveDraftVideo: () => void
  onFinalize: () => void
}) {
  const sub = item.submission
  const busy = saving || finalizing
  const hasDraft = !!sub && !sub.is_final

  // ── 텍스트 ──
  if (item.type === 'text') {
    const canSaveDraft = inputText.trim().length > 0 && !busy
    const canFinalize = inputText.trim().length > 0 && !busy

    return (
      <>
        <div className="text-[12px] font-bold text-ink-secondary mb-2">
          ✏️ 원고 작성
          {hasDraft && <span className="ml-2 text-amber-700">(임시저장본 불러옴)</span>}
        </div>
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="여기에 원고를 작성해주세요..."
          rows={8}
          disabled={busy}
          className="w-full border border-line rounded-lg px-3.5 py-3 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted disabled:bg-gray-50"
        />

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={onSaveDraftText}
            disabled={!canSaveDraft}
            className={`flex-1 h-11 rounded-lg text-[13px] font-semibold transition-all border ${canSaveDraft
                ? 'bg-white border-brand-middle text-brand-middle-dark hover:bg-brand-middle-pale'
                : 'bg-gray-50 border-line text-ink-muted cursor-not-allowed'
              }`}
          >
            {saving ? '저장 중...' : '임시저장'}
          </button>
          <button
            onClick={onFinalize}
            disabled={!canFinalize}
            className={`flex-1 h-11 rounded-lg text-[14px] font-semibold transition-all ${canFinalize
                ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
                : 'bg-gray-100 text-ink-muted cursor-not-allowed'
              }`}
          >
            {finalizing ? '제출 중...' : '최종 제출'}
          </button>
        </div>
        <div className="text-[11px] text-ink-muted text-center mt-2">
          임시저장은 여러 번 가능해요. 최종 제출 후엔 선생님이 허용해주실 때만 다시 수정할 수 있어요.
        </div>
      </>
    )
  }

  // ── 영상 ──
  return (
    <>
      <div className="text-[12px] font-bold text-ink-secondary mb-2">
        🎥 영상 업로드
        {hasDraft && sub?.video_url && (
          <span className="ml-2 text-amber-700">(임시저장된 영상 있음)</span>
        )}
      </div>

      {/* 임시저장된 영상 미리보기 */}
      {hasDraft && sub?.video_url && !videoFile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
          <div className="text-[11px] font-bold text-amber-800 mb-2">📼 임시저장된 영상</div>
          <video src={sub.video_url} controls className="w-full max-h-56 rounded-lg bg-black" />
          <div className="text-[10px] text-amber-700 mt-1.5">
            새 영상을 올리면 임시저장본이 교체돼요.
          </div>
        </div>
      )}

      {/* 재제출 허용 시 이전 영상 (참고) */}
      {sub?.is_final && sub?.resubmit_allowed && sub?.video_url && !videoFile && (
        <div className="bg-gray-50 border border-line rounded-xl p-3 mb-3">
          <div className="text-[11px] font-bold text-ink-secondary mb-2">📼 이전 제출 영상 (참고용)</div>
          <video src={sub.video_url} controls className="w-full max-h-56 rounded-lg bg-black" />
        </div>
      )}

      {!videoFile ? (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={busy}
              className="border-[1.5px] border-dashed border-line rounded-xl p-6 text-center bg-gray-50 hover:border-brand-middle-light hover:bg-brand-middle-pale/50 transition-all disabled:opacity-50"
            >
              <div className="text-3xl mb-1.5">📹</div>
              <div className="text-[12px] font-bold text-ink-secondary">바로 촬영</div>
              <div className="text-[10px] text-ink-muted mt-1">카메라 켜기</div>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="border-[1.5px] border-dashed border-line rounded-xl p-6 text-center bg-gray-50 hover:border-brand-middle-light hover:bg-brand-middle-pale/50 transition-all disabled:opacity-50"
            >
              <div className="text-3xl mb-1.5">📁</div>
              <div className="text-[12px] font-bold text-ink-secondary">파일 선택</div>
              <div className="text-[10px] text-ink-muted mt-1">갤러리에서 선택</div>
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="video/*"
            capture="user"
            onChange={onFilePick}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-m4v,video/webm"
            onChange={onFilePick}
            className="hidden"
          />

          <div className="text-[11px] text-ink-muted text-center mb-3">
            MP4, MOV, WEBM · 최대 500MB
          </div>

          {/* 임시저장된 영상 그대로 최종제출 */}
          {hasDraft && sub?.video_url && (
            <button
              onClick={onFinalize}
              disabled={busy}
              className={`w-full h-11 rounded-lg text-[14px] font-semibold transition-all ${!busy
                  ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
                  : 'bg-gray-100 text-ink-muted cursor-not-allowed'
                }`}
            >
              {finalizing ? '제출 중...' : '임시저장 영상 그대로 최종 제출'}
            </button>
          )}
        </>
      ) : (
        /* 새 영상 선택됨 */
        <>
          <div className="bg-gray-50 border border-line rounded-xl p-4 mb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-brand-middle-bg flex items-center justify-center text-2xl flex-shrink-0">
                🎥
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-ink truncate">{videoFile.name}</div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
              <button
                onClick={() => setVideoFile(null)}
                disabled={busy}
                className="px-2.5 py-1.5 bg-white text-ink-secondary border border-line rounded-md text-[11px] font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                ✕ 다시
              </button>
            </div>
            <video src={URL.createObjectURL(videoFile)} controls className="w-full max-h-64 rounded-lg bg-black" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSaveDraftVideo}
              disabled={busy}
              className={`flex-1 h-11 rounded-lg text-[13px] font-semibold transition-all border ${!busy
                  ? 'bg-white border-brand-middle text-brand-middle-dark hover:bg-brand-middle-pale'
                  : 'bg-gray-50 border-line text-ink-muted cursor-not-allowed'
                }`}
            >
              {saving ? '저장 중...' : '임시저장'}
            </button>
            <button
              onClick={onFinalize}
              disabled={busy}
              className={`flex-1 h-11 rounded-lg text-[14px] font-semibold transition-all ${!busy
                  ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
                  : 'bg-gray-100 text-ink-muted cursor-not-allowed'
                }`}
            >
              {finalizing ? '제출 중...' : ' 최종 제출'}
            </button>
          </div>
        </>
      )}

      <div className="text-[11px] text-ink-muted text-center mt-3">
        임시저장은 여러 번 가능해요. 최종 제출하면 AI가 영상을 분석해 피드백을 만들어요.
      </div>
    </>
  )
}

// ============================================================
// 최종 제출 후 (수정 잠김) 표시
// ============================================================
function FinalizedView({ item }: { item: HomeworkItem }) {
  const sub = item.submission!
  const finalFb = sub.final_feedback
  const isVideo = item.type === 'video'

  return (
    <>
      {/* 제출물 */}
      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3 mb-3">
        <div className="text-[11px] font-bold text-brand-middle-dark mb-2 flex items-center gap-1">
          ✅ 최종 제출 완료
          <span className="ml-auto text-[10px] text-ink-muted font-medium">
            {sub.finalized_at
              ? new Date(sub.finalized_at).toLocaleDateString('ko-KR')
              : new Date(sub.submitted_at).toLocaleDateString('ko-KR')} 제출
          </span>
        </div>

        {isVideo ? (
          <>
            {sub.video_url && (
              <video src={sub.video_url} controls className="w-full max-h-64 rounded-lg bg-black mb-2" />
            )}
            {sub.stt_status === 'transcribing' && (
              <div className="text-[11px] text-brand-middle-dark font-medium animate-pulse">
                AI가 영상 음성을 분석하고 있어요...
              </div>
            )}
            {sub.stt_status === 'failed' && (
              <div className="text-[11px] text-red-600 font-medium">
                음성 분석 실패: {sub.stt_error}
              </div>
            )}
            {sub.transcript && (
              <details className="mt-2">
                <summary className="text-[11px] font-bold text-brand-middle-dark cursor-pointer">
                  발표 내용 텍스트 보기
                </summary>
                <div className="text-[12px] text-[#065F46] leading-[1.7] mt-2 p-2 bg-white/60 rounded">
                  {sub.transcript}
                </div>
              </details>
            )}
          </>
        ) : (
          <div className="text-[13px] text-[#065F46] leading-[1.7] whitespace-pre-wrap">
            {sub.answer}
          </div>
        )}
      </div>

      {/* 선생님 피드백 */}
      {finalFb ? (
        <FeedbackCard fb={finalFb} />
      ) : (
        <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] font-bold text-ink-muted">
            선생님 피드백을 기다리는 중이에요...
          </div>
          <div className="text-[10px] text-ink-muted mt-1">
            수정이 필요하면 선생님께 재제출 허용을 요청해주세요.
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================
// 피드백 카드
// ============================================================
function FeedbackCard({ fb }: { fb: AiFeedback }) {
  return (
    <div className="bg-white border-2 border-brand-middle-light rounded-xl overflow-hidden">
      <div className="bg-gradient-to-br from-[#065F46] to-[#10B981] px-5 py-4 text-white">
        <div className="text-[11px] font-bold opacity-80 mb-1">선생님 피드백</div>
        <div className="text-[14px] font-medium leading-[1.6] opacity-95">{fb.summary}</div>
      </div>

      <div className="px-5 py-4 border-b border-line">
        <div className="flex items-center justify-around">
          <ScoreItem label="총점" score={fb.totalScore} highlight />
          <ScoreItem label="구조" score={fb.structureScore} />
          <ScoreItem label="내용" score={fb.contentScore} />
        </div>
      </div>

      <div className="px-5 py-4 grid grid-cols-1 gap-3">
        <FeedbackSection title="스피치 구조" data={fb.structure} />
        <FeedbackSection title="내용" data={fb.content} />
      </div>

      <div className="px-5 py-4 bg-brand-middle-pale border-t border-line">
        <div className="text-[11px] font-bold text-brand-middle-dark mb-1.5">다음에는 이것!</div>
        <div className="text-[13px] text-[#065F46] leading-[1.7] font-medium">{fb.nextStep}</div>
      </div>
    </div>
  )
}

function ScoreItem({ label, score, highlight }: { label: string; score: number; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className={`font-extrabold tracking-tight ${highlight ? 'text-[28px] text-brand-middle-dark' : 'text-[20px] text-ink-secondary'}`}>
        {score}
      </div>
      <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

function FeedbackSection({ title, data }: { title: string; data: { 강점: string[]; 개선점: string[] } }) {
  return (
    <div>
      <div className="text-[12px] font-extrabold text-ink mb-2">{title}</div>
      {data.강점?.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-bold text-emerald-600 mb-1">강점</div>
          <ul className="text-[12px] text-ink leading-[1.7] pl-4">
            {data.강점.map((s, i) => <li key={i} className="list-disc">{s}</li>)}
          </ul>
        </div>
      )}
      {data.개선점?.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-amber-600 mb-1">개선점</div>
          <ul className="text-[12px] text-ink leading-[1.7] pl-4">
            {data.개선점.map((s, i) => <li key={i} className="list-disc">{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}