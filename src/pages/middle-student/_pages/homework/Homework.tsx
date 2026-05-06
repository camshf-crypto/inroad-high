import { useState, useEffect, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import {
  fetchHomeworkForStudent,
  submitTextHomework,
  submitVideoHomework,
  pollSttResult,
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
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState('')
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

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
      const data = await fetchHomeworkForStudent(grade, student.id)
      setItems(data)
      // 첫 미제출 또는 첫 항목 선택
      const cur = data.find(d => !d.submitted) || data[0]
      if (cur) setSelId(cur.id)
    } catch (e: any) {
      setError(e.message || '숙제를 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
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
  const submittedCount = items.filter(h => h.submitted).length

  // ============================================================
  // 텍스트 제출
  // ============================================================
  const handleTextSubmit = async () => {
    if (!selHW || !inputText.trim() || !student?.id) return
    try {
      setSubmitting(true)
      setError('')
      await submitTextHomework({
        assignmentId: selHW.id,
        studentId: student.id,
        academyId: academy?.id ?? null,
        answer: inputText,
      })
      setInputText('')
      await loadHomework()
    } catch (e: any) {
      setError(e.message || '제출 실패')
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================
  // 영상 제출 (업로드 + STT 자동 시작 + 폴링)
  // ============================================================
  const handleVideoSubmit = async () => {
    if (!selHW || !videoFile || !student?.id) return
    try {
      setSubmitting(true)
      setError('')

      const { submission, sttToken } = await submitVideoHomework({
        assignmentId: selHW.id,
        studentId: student.id,
        academyId: academy?.id ?? null,
        file: videoFile,
        onProgress: setSubmitStatus,
      })

      // STT 백그라운드 폴링 (UI 막지 않고 진행)
      setSubmitStatus('영상 제출 완료! AI 분석 진행 중...')
      setVideoFile(null)
      await loadHomework()

      // 폴링 백그라운드로 (사용자가 다른 거 봐도 됨)
      pollSttResult(sttToken, submission.id, setSubmitStatus)
        .then(() => loadHomework())
        .catch(e => console.error('STT 폴링 에러:', e))
    } catch (e: any) {
      setError(e.message || '영상 업로드 실패')
    } finally {
      setSubmitting(false)
      setTimeout(() => setSubmitStatus(''), 3000)
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
            <div className="text-[13px] text-ink-muted mt-0.5">{student?.name} · {academy?.academyName}</div>
          </div>
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[13px] font-bold px-4 py-1.5 rounded-full border border-brand-middle-light">
            {submittedCount}/{items.length} 제출완료
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-[13px] font-medium">
            ⚠️ {error}
          </div>
        )}

        {selHW && (
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">

            {/* 주차 배지 */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2.5 py-0.5 rounded-full border border-brand-middle-light">
                {selHW.month}
              </span>
              <span className="text-[11px] text-ink-secondary font-medium">{selHW.week}주차</span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                selHW.type === 'video'
                  ? 'bg-[#F5F3FF] text-[#7C3AED]'
                  : 'bg-[#EEF2FF] text-[#3B5BDB]'
              }`}>
                {selHW.type === 'video' ? '🎥 영상 제출' : '📝 텍스트 제출'}
              </span>
            </div>

            {/* 제목 */}
            <div className="text-[18px] font-extrabold text-ink tracking-tight mb-4">{selHW.title}</div>

            {/* 숙제 내용 */}
            <div className="bg-[#EEF2FF] border border-[#BAC8FF] rounded-xl px-4 py-3.5 mb-5">
              <div className="text-[11px] font-bold text-[#3B5BDB] mb-1.5">📋 이번 주 숙제</div>
              <div className="text-[13px] text-[#1E3A8A] leading-[1.7]">{selHW.task}</div>
            </div>

            {/* 진행 상태 */}
            {submitStatus && (
              <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-4 py-2.5 mb-3 text-[12px] font-bold text-brand-middle-dark flex items-center gap-2">
                <span className="animate-pulse">⏳</span> {submitStatus}
              </div>
            )}

            {/* 제출 영역 */}
            {!selHW.submitted ? (
              <>
                {selHW.type === 'text' ? (
                  /* 텍스트 제출 */
                  <>
                    <div className="text-[12px] font-bold text-ink-secondary mb-2">✏️ 원고 작성</div>
                    <textarea
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      placeholder="여기에 원고를 작성해주세요..."
                      rows={6}
                      disabled={submitting}
                      className="w-full border border-line rounded-lg px-3.5 py-3 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted disabled:bg-gray-50"
                    />
                    <button
                      onClick={handleTextSubmit}
                      disabled={!inputText.trim() || submitting}
                      className={`w-full h-11 rounded-lg text-[14px] font-semibold mt-3 transition-all ${
                        inputText.trim() && !submitting
                          ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
                          : 'bg-gray-100 text-ink-muted cursor-not-allowed'
                      }`}
                    >
                      {submitting ? '제출 중...' : '제출하기'}
                    </button>
                  </>
                ) : (
                  /* 영상 제출 */
                  <>
                    <div className="text-[12px] font-bold text-ink-secondary mb-2">🎥 영상 업로드</div>

                    {!videoFile ? (
                      <>
                        {/* 모바일 카메라 / 갤러리 / 데스크톱 파일 선택 */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {/* 모바일 카메라 직접 촬영 */}
                          <button
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={submitting}
                            className="border-[1.5px] border-dashed border-line rounded-xl p-6 text-center bg-gray-50 hover:border-brand-middle-light hover:bg-brand-middle-pale/50 transition-all disabled:opacity-50"
                          >
                            <div className="text-3xl mb-1.5">📹</div>
                            <div className="text-[12px] font-bold text-ink-secondary">바로 촬영</div>
                            <div className="text-[10px] text-ink-muted mt-1">카메라 켜기</div>
                          </button>

                          {/* 파일 선택 (갤러리/PC) */}
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={submitting}
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
                          onChange={handleFilePick}
                          className="hidden"
                        />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/mp4,video/quicktime,video/x-m4v,video/webm"
                          onChange={handleFilePick}
                          className="hidden"
                        />

                        <div className="text-[11px] text-ink-muted text-center">
                          MP4, MOV, WEBM · 최대 500MB
                        </div>
                      </>
                    ) : (
                      /* 선택된 영상 미리보기 */
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
                            disabled={submitting}
                            className="px-2.5 py-1.5 bg-white text-ink-secondary border border-line rounded-md text-[11px] font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            ✕ 다시
                          </button>
                        </div>

                        {/* 미리보기 비디오 */}
                        <video
                          src={URL.createObjectURL(videoFile)}
                          controls
                          className="w-full max-h-64 rounded-lg bg-black"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleVideoSubmit}
                      disabled={!videoFile || submitting}
                      className={`w-full h-11 rounded-lg text-[14px] font-semibold mt-3 transition-all ${
                        videoFile && !submitting
                          ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
                          : 'bg-gray-100 text-ink-muted cursor-not-allowed'
                      }`}
                    >
                      {submitting ? '업로드 중...' : '영상 제출하기'}
                    </button>
                  </>
                )}
              </>
            ) : (
              /* 제출 완료 */
              <SubmittedView item={selHW} />
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
              return (
                <div
                  key={h.id}
                  onClick={() => { setSelId(h.id); setInputText(''); setVideoFile(null); setError('') }}
                  className={`p-3 rounded-xl mb-1.5 cursor-pointer border transition-all ${
                    isSelected
                      ? 'border-brand-middle bg-white shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                      : h.submitted
                        ? 'border-brand-middle-light bg-brand-middle-pale/60 hover:shadow-sm'
                        : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      h.submitted || isSelected
                        ? 'bg-brand-middle text-white'
                        : 'bg-gray-100 text-ink-muted'
                    }`}>
                      {h.submitted ? '✓' : h.week}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12.5px] truncate ${
                        isSelected
                          ? 'font-semibold text-brand-middle-dark'
                          : 'font-medium text-ink'
                      }`}>
                        {h.title}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">
                        {h.type === 'video' ? '🎥 영상' : '📝 텍스트'} · {
                          h.submitted
                            ? (h.hasFeedback ? '피드백 완료' : '피드백 대기중')
                            : '미제출'
                        }
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
// 제출 완료 후 표시 컴포넌트
// ============================================================
function SubmittedView({ item }: { item: HomeworkItem }) {
  const sub = item.submission!
  const finalFb = sub.final_feedback
  const isVideo = item.type === 'video'

  return (
    <>
      {/* 제출물 */}
      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3 mb-3">
        <div className="text-[11px] font-bold text-brand-middle-dark mb-2 flex items-center gap-1">
          ✅ 제출 완료
          <span className="ml-auto text-[10px] text-ink-muted font-medium">
            {new Date(sub.submitted_at).toLocaleDateString('ko-KR')}
          </span>
        </div>

        {isVideo ? (
          <>
            {sub.video_url && (
              <video
                src={sub.video_url}
                controls
                className="w-full max-h-64 rounded-lg bg-black mb-2"
              />
            )}
            {/* STT 상태 */}
            {sub.stt_status === 'transcribing' && (
              <div className="text-[11px] text-brand-middle-dark font-medium animate-pulse">
                🎙️ AI가 영상 음성을 분석하고 있어요...
              </div>
            )}
            {sub.stt_status === 'failed' && (
              <div className="text-[11px] text-red-600 font-medium">
                ⚠️ 음성 분석 실패: {sub.stt_error}
              </div>
            )}
            {sub.transcript && (
              <details className="mt-2">
                <summary className="text-[11px] font-bold text-brand-middle-dark cursor-pointer">
                  📝 발표 내용 텍스트 보기
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
            💬 선생님 피드백을 기다리는 중이에요...
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================
// 피드백 카드 (학생용 — 선생님이 발행한 final_feedback 표시)
// ============================================================
function FeedbackCard({ fb }: { fb: AiFeedback }) {
  return (
    <div className="bg-white border-2 border-brand-middle-light rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-[#065F46] to-[#10B981] px-5 py-4 text-white">
        <div className="text-[11px] font-bold opacity-80 mb-1">💬 선생님 피드백</div>
        <div className="text-[14px] font-medium leading-[1.6] opacity-95">{fb.summary}</div>
      </div>

      {/* 점수 */}
      <div className="px-5 py-4 border-b border-line">
        <div className="flex items-center justify-around">
          <ScoreItem label="총점" score={fb.totalScore} highlight />
          <ScoreItem label="구조" score={fb.structureScore} />
          <ScoreItem label="내용" score={fb.contentScore} />
        </div>
      </div>

      {/* 강점/개선점 */}
      <div className="px-5 py-4 grid grid-cols-1 gap-3">
        <FeedbackSection title="🏗️ 스피치 구조" data={fb.structure} />
        <FeedbackSection title="📚 내용" data={fb.content} />
      </div>

      {/* 다음 스텝 */}
      <div className="px-5 py-4 bg-brand-middle-pale border-t border-line">
        <div className="text-[11px] font-bold text-brand-middle-dark mb-1.5">🎯 다음에는 이것!</div>
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
          <div className="text-[10px] font-bold text-emerald-600 mb-1">💚 강점</div>
          <ul className="text-[12px] text-ink leading-[1.7] pl-4">
            {data.강점.map((s, i) => <li key={i} className="list-disc">{s}</li>)}
          </ul>
        </div>
      )}
      {data.개선점?.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-amber-600 mb-1">🌱 개선점</div>
          <ul className="text-[12px] text-ink leading-[1.7] pl-4">
            {data.개선점.map((s, i) => <li key={i} className="list-disc">{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}