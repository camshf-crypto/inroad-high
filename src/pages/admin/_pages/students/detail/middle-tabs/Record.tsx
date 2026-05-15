import { useState } from 'react'
import {
  useStudentSubmissions,
  useStudentMiddleSaenggibu,
  useStudentSubmissionSubjects,
  useMiddleSemesterLock,
  useUpsertMiddleSaenggibu,
  useAccumulateSaenggibu,
  useFinalizeMiddleSaenggibu,
  useToggleMiddlePublish,
  usePublishAllSemester,
  useSetMiddleSemesterLock,
  useUnlockMiddleSemester,
  gradeToNum,
  findItem,
  firstSubject,
  isLocked,
  type SaenggibuCategory,
  type MiddleSaenggibuItem,
  type SuhaengSubmission
} from '@/pages/admin/_hooks/middle/useMiddleSaenggibu'

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
}

const GRADE_LIST = ['중1', '중2', '중3']
const SEMESTER_LIST = [1, 2] as const

const EMPHASIS_OPTIONS = [
  { value: '자료 조사 중심', label: '자료 조사 중심' },
  { value: '개념 이해 중심', label: '개념 이해 중심' },
  { value: '분석력 중심', label: '분석력 중심' },
  { value: '표현력 중심', label: '표현력 중심' },
  { value: '진로 관심 연결', label: '진로 관심 연결' },
  { value: '고입 면접 소재 연결', label: '고입 면접 소재 연결' },
]

function daysUntil(target: string | null | undefined): number | null {
  if (!target) return null
  const diff = new Date(target).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getLockChipStyle(lock: any): { bg: string, color: string, border: string, label: string } {
  if (!lock) return { bg: '#F8FAFC', color: '#94A3B8', border: '#E2E8F0', label: '⏰ 마감 미설정' }
  if (lock.locked_at) return { bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5', label: '🔒 마감됨' }
  const days = daysUntil(lock.deadline_at)
  if (days === null) return { bg: '#F8FAFC', color: '#94A3B8', border: '#E2E8F0', label: '⏰ 마감 미설정' }
  if (days < 0) return { bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5', label: '🔒 마감됨' }
  if (days <= 3) return { bg: '#FEF3C7', color: '#B45309', border: '#FCD34D', label: `⚠️ 마감 D-${days}` }
  return { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC', label: `⏰ 마감 D-${days}` }
}

export default function Record({ student }: { student: any }) {
  const studentId: string = student.id
  const academyId: string = student.academy_id

  const [selGrade, setSelGrade] = useState<string>(student?.grade || '중1')
  const [selSemester, setSelSemester] = useState<number>(1)
  const [selSubmissionId, setSelSubmissionId] = useState<string | null>(null)
  const [fullScreen, setFullScreen] = useState(false)
  const [editingCell, setEditingCell] = useState<{ category: SaenggibuCategory, subject: string | null } | null>(null)
  const [editText, setEditText] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)
  const [lockModalOpen, setLockModalOpen] = useState(false)
  const [finalizeModal, setFinalizeModal] = useState<{ subject: string } | null>(null)

  const gradeNum = gradeToNum(selGrade)

  const { data: submissions = [], isLoading: loadingSubs } = useStudentSubmissions(studentId, gradeNum, selSemester)
  const { data: saenggibuItems = [], isLoading: loadingItems } = useStudentMiddleSaenggibu(studentId, gradeNum, selSemester)
  const { data: autoSubjects = [], isLoading: loadingSubjects } = useStudentSubmissionSubjects(studentId, gradeNum, selSemester)
  const { data: lock } = useMiddleSemesterLock(academyId, gradeNum, selSemester)

  const upsertItem = useUpsertMiddleSaenggibu()
  const accumulate = useAccumulateSaenggibu()
  const finalize = useFinalizeMiddleSaenggibu()
  const togglePublish = useToggleMiddlePublish()
  const publishAll = usePublishAllSemester()

  const selectedSubmission: SuhaengSubmission | null = selSubmissionId
    ? submissions.find((s: SuhaengSubmission) => s.id === selSubmissionId) || null
    : null

  const locked = isLocked(lock)
  const lockChip = getLockChipStyle(lock)

  const subsBySubject = submissions.reduce<Record<string, SuhaengSubmission[]>>((acc: Record<string, SuhaengSubmission[]>, s: SuhaengSubmission) => {
    const subj = firstSubject(s.question_subject) || '미분류'
    if (!acc[subj]) acc[subj] = []
    acc[subj].push(s)
    return acc
  }, {})

  const setechSubjects = autoSubjects

  const startEditCell = (category: SaenggibuCategory, subject: string | null) => {
    if (locked) { alert('학기가 마감되어 수정할 수 없어요.'); return }
    const existing = findItem(saenggibuItems, category, subject)
    setEditingCell({ category, subject })
    setEditText(existing?.content || '')
  }

  const saveCell = () => {
    if (!editingCell) return
    upsertItem.mutate({
      student_id: studentId,
      grade: gradeNum,
      semester: selSemester,
      category: editingCell.category,
      subject: editingCell.subject,
      content: editText,
    }, {
      onSuccess: () => { setEditingCell(null); setEditText('') },
      onError: (err: any) => alert('저장 실패:\n' + (err?.message || '알 수 없는 오류')),
    })
  }

  const handleAccumulate = async () => {
    if (!selectedSubmission) return
    if (locked) { alert('학기가 마감되어 누적할 수 없어요.'); return }
    const subject = firstSubject(selectedSubmission.question_subject)
    if (!subject) { alert('이 수행평가에 과목 정보가 없어요.'); return }
    const key = `accumulate-${selectedSubmission.id}`
    setGenerating(key)
    try {
      await accumulate.mutateAsync({ student_id: studentId, submission_id: selectedSubmission.id, subject, grade: gradeNum, semester: selSemester })
    } catch (err: any) {
      alert('AI 누적 실패:\n' + (err?.message || '알 수 없는 오류'))
    } finally {
      setGenerating(null)
    }
  }

  const handleFinalize = async (subject: string, emphasis: string, selectedIds: string[]) => {
    if (locked) { alert('학기가 마감되어 압축할 수 없어요.'); return }
    const key = `finalize-${subject}`
    setGenerating(key)
    try {
      await finalize.mutateAsync({ student_id: studentId, grade: gradeNum, semester: selSemester, subject, emphasis_direction: emphasis, selected_submission_ids: selectedIds })
      setFinalizeModal(null)
    } catch (err: any) {
      alert('AI 압축 실패:\n' + (err?.message || '알 수 없는 오류'))
    } finally {
      setGenerating(null)
    }
  }

  const handleTogglePublish = (item: MiddleSaenggibuItem) => {
    togglePublish.mutate({ id: item.id, publish: item.status !== 'published' })
  }

  const handlePublishAll = () => {
    const hasPublished = saenggibuItems.some((i: MiddleSaenggibuItem) => i.status === 'published')
    const msg = hasPublished
      ? `${selGrade} ${selSemester}학기 세특 전체를 비공개로 전환할까요?`
      : `${selGrade} ${selSemester}학기 세특 전체를 학생에게 게시할까요?`
    if (window.confirm(msg)) {
      publishAll.mutate({ studentId, grade: gradeNum, semester: selSemester, publish: !hasPublished })
    }
  }

  const GradeSheet = ({ inModal = false }: { inModal?: boolean }) => (
    <div className={inModal ? 'mb-8' : 'mb-4'}>
      {inModal && (
        <div className="text-[15px] font-extrabold text-ink mb-3 pb-2 border-b-2 border-ink tracking-tight">
          📅 {selGrade} · {selSemester}학기
        </div>
      )}
      <div className={inModal ? 'mb-5' : 'mb-3'}>
        <div className={`font-extrabold text-ink mb-1.5 tracking-tight ${inModal ? 'text-[13px]' : 'text-[11px]'}`}>
          교과학습발달상황 · 세부능력 및 특기사항
        </div>
        <table className="w-full border-collapse border border-gray-700">
          <thead>
            <tr className="bg-gray-100">
              <th className={`border border-gray-700 font-bold text-ink w-24 text-center ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>과목</th>
              <th className={`border border-gray-700 font-bold text-ink text-center ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>세부능력 및 특기사항</th>
              {!inModal && <th className="border border-gray-700 font-bold text-ink text-center w-28 px-2 py-1.5 text-[10px]">학기 정리</th>}
            </tr>
          </thead>
          <tbody>
            {setechSubjects.length === 0 ? (
              <tr>
                <td colSpan={inModal ? 2 : 3} className="border border-gray-700 p-4 text-center text-[11px] text-ink-muted">
                  {selSemester}학기 수행평가 제출 자료가 없어요.
                </td>
              </tr>
            ) : (
              setechSubjects.map((subject: string) => {
                const item = findItem(saenggibuItems, '세특', subject)
                const isEditing = !inModal && editingCell?.category === '세특' && editingCell?.subject === subject
                const isFinalizing = generating === `finalize-${subject}`
                return (
                  <tr key={subject}>
                    <td className={`border border-gray-700 font-semibold text-ink text-center bg-gray-50 align-top whitespace-nowrap ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                      <div className="flex flex-col items-center gap-1">
                        <span>{subject}</span>
                        {!inModal && item?.status === 'published' && (
                          <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">게시됨</span>
                        )}
                        {!inModal && item?.generation_mode === 'finalized' && (
                          <span className="text-[8px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">압축됨</span>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-700 p-0 align-top">
                      {isEditing ? (
                        <div className="p-1">
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            autoFocus
                            className="w-full border-none outline-none text-[11px] font-medium leading-[1.7] resize-y min-h-[80px] px-2 py-1"
                            style={{ boxShadow: `inset 0 0 0 2px ${THEME.accent}` }}
                          />
                          <div className="flex items-center gap-1 px-2 py-1">
                            <button onClick={saveCell} disabled={upsertItem.isPending} className="px-2.5 py-0.5 text-white rounded text-[11px] font-bold transition-all disabled:opacity-60" style={{ background: THEME.accent }}>
                              {upsertItem.isPending ? '저장중...' : '💾 저장'}
                            </button>
                            <button onClick={() => { setEditingCell(null); setEditText('') }} className="px-2.5 py-0.5 bg-white text-ink-secondary border border-line rounded text-[11px] font-semibold hover:bg-gray-50 transition-colors">
                              취소
                            </button>
                            <div className="text-[10px] text-ink-muted ml-auto font-medium">{editText.length}자</div>
                          </div>
                        </div>
                      ) : (
                        <div className="group relative">
                          <div
                            onClick={() => !inModal && !locked && startEditCell('세특', subject)}
                            className={`leading-[1.8] whitespace-pre-wrap transition-colors ${inModal ? 'px-3 py-2 text-[12px] min-h-[50px]' : 'px-2 py-1.5 text-[10px] min-h-[32px]'} ${!inModal && !locked ? 'cursor-text hover:bg-blue-50/30' : ''}`}
                            style={{ color: item?.content ? '#1a1a1a' : '#D1D5DB' }}
                          >
                            {item?.content || (inModal ? '' : locked ? '🔒 마감됨' : '클릭하여 입력')}
                          </div>
                          {!inModal && item && (
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleTogglePublish(item) }}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${item.status === 'published' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}
                              >
                                {item.status === 'published' ? '🔒 비공개' : '👁 게시'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    {!inModal && (
                      <td className="border border-gray-700 align-top p-1.5 text-center">
                        <button
                          onClick={() => setFinalizeModal({ subject })}
                          disabled={isFinalizing || locked}
                          className="w-full px-2 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50"
                          style={{ background: isFinalizing ? '#E5E7EB' : THEME.accent, color: isFinalizing ? '#9CA3AF' : '#fff' }}
                        >
                          {isFinalizing ? '⏳' : '📝 학기 정리'}
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="flex h-full overflow-hidden gap-3 font-sans">

      {/* 왼쪽: 수행평가 목록 */}
      <div className="w-[240px] flex-shrink-0 flex flex-col overflow-hidden">
        <div className="flex gap-1 mb-2 flex-shrink-0">
          {GRADE_LIST.map(g => {
            const isActive = selGrade === g
            return (
              <button key={g} onClick={() => { setSelGrade(g); setSelSubmissionId(null) }}
                className="flex-1 py-1.5 rounded-full text-[11px] font-bold text-center transition-all border"
                style={{ background: isActive ? THEME.accent : '#fff', color: isActive ? '#fff' : '#6B7280', borderColor: isActive ? THEME.accent : '#E5E7EB', boxShadow: isActive ? `0 2px 6px ${THEME.accentShadow}` : 'none' }}>
                {g}
              </button>
            )
          })}
        </div>
        <div className="flex gap-1 mb-3 flex-shrink-0">
          {SEMESTER_LIST.map(s => {
            const isActive = selSemester === s
            return (
              <button key={s} onClick={() => { setSelSemester(s); setSelSubmissionId(null) }}
                className="flex-1 py-1.5 rounded-full text-[11px] font-bold text-center transition-all border"
                style={{ background: isActive ? '#1a1a1a' : '#fff', color: isActive ? '#fff' : '#6B7280', borderColor: isActive ? '#1a1a1a' : '#E5E7EB' }}>
                {s}학기
              </button>
            )
          })}
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-3">
          {loadingSubs ? (
            <div className="text-center py-4 text-[11px] text-ink-muted">불러오는 중...</div>
          ) : Object.keys(subsBySubject).length === 0 ? (
            <div className="text-[11px] font-medium text-ink-muted text-center py-2 bg-gray-50 rounded-lg">제출 자료 없음</div>
          ) : (
            (Object.entries(subsBySubject) as Array<[string, SuhaengSubmission[]]>).map(([subject, subs]) => (
              <div key={subject}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: THEME.accentBg, color: THEME.accent, border: `1px solid ${THEME.accentBorder}60` }}>
                    📚 {subject}
                  </span>
                  <span className="text-[10px] font-semibold text-ink-secondary">{subs.length}개</span>
                </div>
                {subs.map((sub: SuhaengSubmission) => {
                  const isSelected = selSubmissionId === sub.id
                  return (
                    <button key={sub.id} onClick={() => setSelSubmissionId(sub.id)}
                      className="w-full rounded-lg px-3 py-2 mb-1.5 text-left transition-all"
                      style={{ border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`, background: isSelected ? THEME.accentBg : '#fff', boxShadow: isSelected ? `0 2px 6px ${THEME.accentShadow}` : 'none' }}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-ink-secondary">{sub.question_category || '수행평가'}</span>
                        <span className="text-[9px] font-medium text-ink-muted">
                          {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '—'}
                        </span>
                      </div>
                      <div className="text-[11.5px] font-semibold text-ink leading-[1.4] line-clamp-2">{sub.question_title || '제목 없음'}</div>
                      {/* 미디어 파일 아이콘 */}
                      {(sub.answer_audio_url || sub.answer_video_url || (sub.answer_photo_urls && sub.answer_photo_urls.length > 0)) && (
                        <div className="flex gap-1 mt-1">
                          {sub.answer_audio_url && <span className="text-[9px] text-ink-muted">🎙️</span>}
                          {sub.answer_video_url && <span className="text-[9px] text-ink-muted">📹</span>}
                          {sub.answer_photo_urls && sub.answer_photo_urls.length > 0 && <span className="text-[9px] text-ink-muted">📷{sub.answer_photo_urls.length}</span>}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 가운데: 제출물 상세 */}
      <div className="w-[320px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        {!selectedSubmission ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-ink-muted p-5">
            <div className="text-3xl">📝</div>
            <div className="text-[13px] font-bold text-ink-secondary text-center leading-relaxed">
              수행평가를 선택하면<br />상세 내용과 AI 누적 버튼이 나와요
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-line flex-shrink-0">
              <div className="text-[11px] font-semibold text-ink-secondary mb-1">
                📝 {selectedSubmission.question_subject || '미분류'} · {selectedSubmission.question_category || '수행평가'}
              </div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight line-clamp-2 leading-snug">
                {selectedSubmission.question_title || '제목 없음'}
              </div>
              {selectedSubmission.submitted_at && (
                <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                  제출: {new Date(selectedSubmission.submitted_at).toLocaleDateString('ko-KR')}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {selectedSubmission.question_content && (
                <div>
                  <div className="text-[11px] font-extrabold text-ink mb-1.5">📌 문제 / 주제</div>
                  <div className="bg-gray-50 border border-line rounded-lg px-3 py-2 text-[11.5px] text-ink leading-[1.7] whitespace-pre-wrap">
                    {selectedSubmission.question_content}
                  </div>
                </div>
              )}

              {/* ✍️ 학생 답변 + 미디어 */}
              <div>
                <div className="text-[11px] font-extrabold text-ink mb-1.5">✍️ 학생 답변</div>
                <div className="bg-blue-50/40 border border-blue-100 rounded-lg px-3 py-2 text-[11.5px] text-ink leading-[1.7] whitespace-pre-wrap">
                  {selectedSubmission.resubmitted_text || selectedSubmission.answer_text || '(텍스트 답변 없음)'}
                </div>

                {/* 🎙️ 음성 파일 */}
                {selectedSubmission.answer_audio_url && (
                  <div className="mt-2">
                    <div className="text-[11px] font-extrabold text-ink mb-1">🎙️ 음성 녹음</div>
                    <audio controls src={selectedSubmission.answer_audio_url} className="w-full h-9" />
                  </div>
                )}

                {/* 📹 영상 파일 */}
                {selectedSubmission.answer_video_url && (
                  <div className="mt-2">
                    <div className="text-[11px] font-extrabold text-ink mb-1">📹 발표 영상</div>
                    <video controls src={selectedSubmission.answer_video_url} className="w-full rounded-lg max-h-48" />
                  </div>
                )}

                {/* 📷 사진 파일들 */}
                {selectedSubmission.answer_photo_urls && selectedSubmission.answer_photo_urls.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[11px] font-extrabold text-ink mb-1">
                      📷 첨부 사진 ({selectedSubmission.answer_photo_urls.length}장)
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {selectedSubmission.answer_photo_urls.map((url: string, idx: number) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`첨부 사진 ${idx + 1}`}
                            className="w-full aspect-square object-cover rounded-lg border border-line hover:opacity-90 transition-opacity cursor-pointer" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedSubmission.answer_sections && typeof selectedSubmission.answer_sections === 'object' && (
                <div>
                  <div className="text-[11px] font-extrabold text-ink mb-1.5">📑 세부 섹션</div>
                  <div className="flex flex-col gap-1.5">
                    {Object.entries(selectedSubmission.answer_sections)
                      .filter(([_, v]) => v && typeof v === 'string' && (v as string).trim())
                      .map(([k, v]) => (
                        <div key={k} className="bg-white border border-line rounded-md p-2">
                          <div className="text-[10px] font-bold text-ink-secondary mb-0.5">{k}</div>
                          <div className="text-[11px] text-ink leading-[1.6] whitespace-pre-wrap">{v as string}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="border-t border-line pt-3">
                <button
                  onClick={handleAccumulate}
                  disabled={generating === `accumulate-${selectedSubmission.id}` || locked}
                  className="w-full py-2.5 rounded-lg text-[12px] font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: locked ? '#9CA3AF' : THEME.accent, boxShadow: locked ? 'none' : `0 2px 8px ${THEME.accentShadow}` }}
                >
                  {locked ? '🔒 학기 마감됨' : generating === `accumulate-${selectedSubmission.id}` ? '⏳ AI 분석 중... (10~20초)' : '✨ 세특에 AI 누적하기'}
                </button>
                <div className="text-[10px] text-ink-muted text-center mt-1.5 leading-relaxed">
                  AI가 이 수행평가를 요약해 <strong>{firstSubject(selectedSubmission.question_subject) || '해당 과목'}</strong> 세특에 추가해요
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 오른쪽: 세특 시트 */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="px-4 py-3 border-b border-line flex-shrink-0 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[14px] font-extrabold text-ink tracking-tight">📋 세특</div>
            <div className="flex gap-1">
              {GRADE_LIST.map(g => {
                const isActive = selGrade === g
                return (
                  <button key={g} onClick={() => setSelGrade(g)} className="px-3 py-1 rounded-full text-[11px] font-bold transition-all border"
                    style={{ background: isActive ? '#1a1a1a' : '#fff', color: isActive ? '#fff' : '#6B7280', borderColor: isActive ? '#1a1a1a' : '#E5E7EB' }}>
                    {g}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-1">
              {SEMESTER_LIST.map(s => {
                const isActive = selSemester === s
                return (
                  <button key={s} onClick={() => setSelSemester(s)} className="px-3 py-1 rounded-full text-[11px] font-bold transition-all border"
                    style={{ background: isActive ? THEME.accent : '#fff', color: isActive ? '#fff' : '#6B7280', borderColor: isActive ? THEME.accent : '#E5E7EB' }}>
                    {s}학기
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setLockModalOpen(true)} className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border"
              style={{ background: lockChip.bg, color: lockChip.color, borderColor: lockChip.border }}>
              {lockChip.label}
            </button>
            <button
              onClick={handlePublishAll}
              disabled={publishAll.isPending || saenggibuItems.length === 0 || locked}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px disabled:opacity-60"
              style={{
                background: saenggibuItems.some((i: MiddleSaenggibuItem) => i.status === 'published') ? '#fff' : '#059669',
                color: saenggibuItems.some((i: MiddleSaenggibuItem) => i.status === 'published') ? '#6B7280' : '#fff',
                border: saenggibuItems.some((i: MiddleSaenggibuItem) => i.status === 'published') ? '1px solid #E5E7EB' : 'none',
                boxShadow: saenggibuItems.some((i: MiddleSaenggibuItem) => i.status === 'published') ? 'none' : '0 2px 6px rgba(5, 150, 105, 0.25)',
              }}
            >
              {publishAll.isPending ? '처리중...' : saenggibuItems.some((i: MiddleSaenggibuItem) => i.status === 'published') ? '🔒 전체 비공개' : '👁 전체 게시'}
            </button>
            <button onClick={() => setFullScreen(true)} className="px-3 py-1.5 bg-white border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
              style={{ color: THEME.accent, borderColor: THEME.accent }}>
              ⛶ 전체화면
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loadingItems || loadingSubjects ? (
            <div className="text-center py-10">
              <div className="inline-block w-5 h-5 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: THEME.accent }} />
              <div className="text-[12px] text-ink-muted mt-2">불러오는 중...</div>
            </div>
          ) : (
            <GradeSheet />
          )}
        </div>
      </div>

      {/* 전체화면 모달 */}
      {fullScreen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)]" style={{ width: '90vw', maxWidth: 980, maxHeight: '92vh' }}>
            <div className="px-6 py-4 border-b border-line flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[17px] font-extrabold text-ink tracking-tight">📋 중학교 학교생활기록부</div>
                <div className="text-[12px] font-medium text-ink-secondary mt-0.5">{student?.name} · {selGrade} · {selSemester}학기</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                  style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
                  🖨️ PDF 저장 / 인쇄
                </button>
                <button onClick={() => setFullScreen(false)} className="px-4 py-2 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-colors">
                  닫기
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-7">
              <div className="text-center text-[22px] font-extrabold text-ink mb-3 tracking-tight">🎓 학교생활기록부</div>
              <div className="text-[13px] font-semibold text-ink-secondary mb-6 text-center pb-4 border-b border-line">
                {student?.name} · {selGrade} · {selSemester}학기
              </div>
              <GradeSheet inModal={true} />
            </div>
          </div>
        </div>
      )}

      {lockModalOpen && (
        <LockModal academyId={academyId} grade={gradeNum} semester={selSemester} gradeLabel={selGrade} currentLock={lock} onClose={() => setLockModalOpen(false)} />
      )}

      {finalizeModal && (
        <FinalizeModal
          subject={finalizeModal.subject}
          submissions={submissions.filter((s: SuhaengSubmission) => firstSubject(s.question_subject) === finalizeModal.subject)}
          existingContent={findItem(saenggibuItems, '세특', finalizeModal.subject)?.content || null}
          gradeLabel={selGrade}
          semester={selSemester}
          isGenerating={generating === `finalize-${finalizeModal.subject}`}
          onClose={() => setFinalizeModal(null)}
          onSubmit={(emphasis, ids) => handleFinalize(finalizeModal.subject, emphasis, ids)}
        />
      )}
    </div>
  )
}

// 학기 마감 모달
function LockModal({ academyId, grade, semester, gradeLabel, currentLock, onClose }: {
  academyId: string; grade: number; semester: number; gradeLabel: string; currentLock: any; onClose: () => void
}) {
  const setLock = useSetMiddleSemesterLock()
  const unlock = useUnlockMiddleSemester()
  const [deadlineDate, setDeadlineDate] = useState(currentLock?.deadline_at ? new Date(currentLock.deadline_at).toISOString().slice(0, 10) : '')
  const [deadlineTime, setDeadlineTime] = useState(currentLock?.deadline_at ? new Date(currentLock.deadline_at).toISOString().slice(11, 16) : '23:59')
  const [note, setNote] = useState(currentLock?.note || '')
  const [lockNow, setLockNow] = useState(!!currentLock?.locked_at)

  const handleSave = () => {
    let deadlineISO: string | null = null
    if (deadlineDate) deadlineISO = new Date(`${deadlineDate}T${deadlineTime}:00`).toISOString()
    setLock.mutate({
      academy_id: academyId, grade, semester,
      deadline_at: deadlineISO,
      locked_at: lockNow ? new Date().toISOString() : null,
      locked_manually: lockNow,
      note: note || null,
    }, {
      onSuccess: () => onClose(),
      onError: (err: any) => alert('저장 실패: ' + (err?.message || '오류')),
    })
  }

  const handleUnlock = () => {
    if (!window.confirm('학기 마감을 해제할까요? 학원 전체 학생의 제출 차단이 풀려요.')) return
    unlock.mutate({ academyId, grade, semester }, {
      onSuccess: () => onClose(),
      onError: (err: any) => alert('해제 실패: ' + (err?.message || '오류')),
    })
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] w-[480px] max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
          <div>
            <div className="text-[16px] font-extrabold text-ink tracking-tight">⏰ 학기 마감 설정</div>
            <div className="text-[12px] font-medium text-ink-secondary mt-0.5">{gradeLabel} · {semester}학기</div>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-5 flex items-start gap-2">
            <span className="text-red-600 text-base leading-none mt-0.5">⚠️</span>
            <div className="text-[12px] text-red-700 leading-relaxed font-medium">
              이 설정은 <strong>학원 전체 학생</strong>에게 적용돼요. 마감 후에는 수행평가 제출과 세특 수정이 모두 차단됩니다.
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-[12px] font-bold text-ink mb-2">📅 마감 예정일</label>
            <div className="flex gap-2">
              <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} className="flex-1 px-3 py-2 border border-line rounded-lg text-[13px] focus:outline-none" />
              <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} className="w-28 px-3 py-2 border border-line rounded-lg text-[13px] focus:outline-none" />
            </div>
            <div className="text-[10px] text-ink-muted mt-1">이 시각이 지나면 자동으로 마감 처리돼요.</div>
          </div>
          <div className="mb-5">
            <label className="block text-[12px] font-bold text-ink mb-2">📝 학생용 안내 메모 (선택)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="예: 기말고사 끝나기 전까지 다 제출하세요." rows={3} className="w-full px-3 py-2 border border-line rounded-lg text-[12px] resize-none focus:outline-none" />
          </div>
          <div className="mb-5">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={lockNow} onChange={e => setLockNow(e.target.checked)} className="mt-0.5 w-4 h-4 accent-red-600" />
              <div>
                <div className="text-[12px] font-bold text-ink">🔒 지금 즉시 마감 (수동 강제 잠금)</div>
                <div className="text-[10px] text-ink-muted mt-0.5">예약일과 무관하게 즉시 모든 제출/수정을 차단해요.</div>
              </div>
            </label>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-line flex-shrink-0 flex justify-between items-center">
          {currentLock ? (
            <button onClick={handleUnlock} disabled={unlock.isPending} className="px-3 py-2 text-[12px] font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60">
              마감 해제
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-colors">취소</button>
            <button onClick={handleSave} disabled={setLock.isPending} className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:opacity-60"
              style={{ background: THEME.accent, boxShadow: `0 2px 8px ${THEME.accentShadow}` }}>
              {setLock.isPending ? '저장중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 학기 정리(Finalize) 모달
function FinalizeModal({ subject, submissions, existingContent, gradeLabel, semester, isGenerating, onClose, onSubmit }: {
  subject: string; submissions: SuhaengSubmission[]; existingContent: string | null; gradeLabel: string; semester: number; isGenerating: boolean; onClose: () => void; onSubmit: (emphasis: string, ids: string[]) => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(submissions.map((s: SuhaengSubmission) => s.id))
  const [emphasis, setEmphasis] = useState(EMPHASIS_OPTIONS[0].value)
  const toggleId = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] w-[560px] max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
          <div>
            <div className="text-[16px] font-extrabold text-ink tracking-tight">📝 {gradeLabel} {semester}학기 {subject} 세특 정리</div>
            <div className="text-[12px] font-medium text-ink-secondary mt-0.5">누적된 수행평가를 한 문단으로 압축해요</div>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {existingContent && (
            <div className="mb-5">
              <div className="text-[12px] font-bold text-ink mb-2">📄 현재 누적된 내용</div>
              <div className="bg-gray-50 border border-line rounded-lg p-3 text-[11px] text-ink-secondary leading-[1.7] whitespace-pre-wrap max-h-32 overflow-y-auto">{existingContent}</div>
            </div>
          )}
          <div className="mb-5">
            <div className="text-[12px] font-bold text-ink mb-2">☑️ 반영할 수행평가 선택 ({selectedIds.length}/{submissions.length})</div>
            {submissions.length === 0 ? (
              <div className="text-[11px] text-ink-muted text-center py-4 bg-gray-50 rounded-lg">이 학기 {subject} 수행평가가 없어요.</div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {submissions.map((sub: SuhaengSubmission) => {
                  const isSelected = selectedIds.includes(sub.id)
                  return (
                    <label key={sub.id} className="flex items-start gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all"
                      style={{ background: isSelected ? THEME.accentBg : '#fff', borderColor: isSelected ? THEME.accent : '#E5E7EB' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleId(sub.id)} className="mt-0.5 w-4 h-4 accent-brand-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11.5px] font-semibold text-ink line-clamp-1">{sub.question_title || '제목 없음'}</div>
                        <div className="text-[10px] text-ink-muted">{sub.question_category} · {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('ko-KR') : '—'}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
          <div>
            <div className="text-[12px] font-bold text-ink mb-2">🎯 강조 방향 선택</div>
            <div className="grid grid-cols-2 gap-1.5">
              {EMPHASIS_OPTIONS.map(opt => {
                const isSelected = emphasis === opt.value
                return (
                  <button key={opt.value} onClick={() => setEmphasis(opt.value)} className="px-3 py-2 rounded-lg text-[11.5px] font-bold transition-all border text-left"
                    style={{ background: isSelected ? THEME.accent : '#fff', color: isSelected ? '#fff' : '#374151', borderColor: isSelected ? THEME.accent : '#E5E7EB' }}>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-line flex-shrink-0 flex justify-end gap-2">
          <button onClick={onClose} disabled={isGenerating} className="px-4 py-2 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60">취소</button>
          <button onClick={() => onSubmit(emphasis, selectedIds)} disabled={isGenerating || selectedIds.length === 0}
            className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:opacity-60"
            style={{ background: THEME.accent, boxShadow: `0 2px 8px ${THEME.accentShadow}` }}>
            {isGenerating ? '⏳ AI 생성 중... (10~30초)' : '✨ 학기 세특 생성'}
          </button>
        </div>
      </div>
    </div>
  )
}