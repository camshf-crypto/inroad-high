import { useState } from 'react'
import {
  useStudentPresentationExams,
  useStudentPresentationQuestions,
  useSeedDetails,
  useUpdateMainIntentFeedback,
  useUpdateFirstFeedback,
  useUpdateFinalFeedback,
  useUpdateTailFeedback,
  useDeleteStudentPresentation,
  getQuestionStep,
} from '../../../../_hooks/useHighPresentation'

const STEP_LABELS_WITH_TAIL = ['1차 답변', '1차 피드백', '2차 답변', '최종 피드백', '꼬리 답변', '꼬리 피드백']
const STEP_LABELS_NO_TAIL = ['1차 답변', '1차 피드백', '2차 답변', '최종 피드백']

type ActiveTab = 'intent' | string  // 'intent' or questionId

export default function PresentationTab({ student }: { student: any }) {
  const studentId: string = student.id

  const [selExamId, setSelExamId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('intent')
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showAiPanel, setShowAiPanel] = useState(false)

  const { data: exams = [], isLoading: loadingExams } = useStudentPresentationExams(studentId)
  const { data: questions = [], isLoading: loadingQ } = useStudentPresentationQuestions(selExamId ?? undefined)
  const selExam = exams.find(e => e.id === selExamId) ?? null
  const { data: seed } = useSeedDetails(selExam?.seed_id)

  const updateMain = useUpdateMainIntentFeedback()
  const updateFirst = useUpdateFirstFeedback()
  const updateFinal = useUpdateFinalFeedback()
  const updateTail = useUpdateTailFeedback()
  const deleteExam = useDeleteStudentPresentation()

  const selQ = activeTab !== 'intent' ? questions.find(q => q.id === activeTab) : null
  const step = selQ ? getQuestionStep(selQ) : 0
  const STEP_LABELS = selQ?.tail_question ? STEP_LABELS_WITH_TAIL : STEP_LABELS_NO_TAIL

  // 첫 회차 자동 선택
  if (!selExamId && exams.length > 0) {
    setTimeout(() => setSelExamId(exams[0].id), 0)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteExam.mutateAsync({ examId: id, studentId })
      if (selExamId === id) {
        setSelExamId(null)
        setActiveTab('intent')
      }
      setDeleteTarget(null)
    } catch (e: any) {
      alert('삭제 실패: ' + e.message)
    }
  }

  const sendIntentFb = () => {
    if (!selExam) return
    const key = `intent_${selExam.id}`
    const val = (feedback[key] || '').trim()
    if (!val) return
    updateMain.mutate(
      { examId: selExam.id, feedback: val },
      { onSuccess: () => setFeedback(prev => ({ ...prev, [key]: '' })) }
    )
  }

  const sendFirstFb = () => {
    if (!selQ || !selExamId) return
    const key = `${selQ.id}_first`
    const val = (feedback[key] || '').trim()
    if (!val) return
    updateFirst.mutate(
      { questionId: selQ.id, examId: selExamId, feedback: val },
      { onSuccess: () => setFeedback(prev => ({ ...prev, [key]: '' })) }
    )
  }

  const sendFinalFb = () => {
    if (!selQ || !selExamId) return
    const key = `${selQ.id}_final`
    const val = (feedback[key] || '').trim()
    if (!val) return
    updateFinal.mutate(
      { questionId: selQ.id, examId: selExamId, feedback: val },
      { onSuccess: () => setFeedback(prev => ({ ...prev, [key]: '' })) }
    )
  }

  const sendTailFb = () => {
    if (!selQ || !selExamId) return
    const key = `${selQ.id}_tail`
    const val = (feedback[key] || '').trim()
    if (!val) return
    updateTail.mutate(
      { questionId: selQ.id, examId: selExamId, feedback: val },
      { onSuccess: () => setFeedback(prev => ({ ...prev, [key]: '' })) }
    )
  }

  return (
    <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden', height: '100%' }}>

      {/* ━━━━━ 왼쪽: 회차 목록 ━━━━━ */}
      <div style={{ width: 320, flexShrink: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>📜 제시문 면접 회차</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
            총 <span style={{ color: '#2563EB', fontWeight: 700 }}>{exams.length}회</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {loadingExams ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#9CA3AF', fontSize: 12 }}>불러오는 중...</div>
          ) : exams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📜</div>
              <div style={{ fontSize: 12 }}>회차 기록이 없어요</div>
            </div>
          ) : exams.map((exam, i) => {
            const isSelected = selExamId === exam.id
            return (
              <div key={exam.id} style={{ marginBottom: 10 }}>
                <div
                  onClick={() => { setSelExamId(exam.id); setActiveTab('intent'); setShowAiPanel(false) }}
                  style={{
                    border: `1px solid ${isSelected ? '#2563EB' : '#E5E7EB'}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    background: isSelected ? '#EFF6FF' : '#fff',
                    position: 'relative',
                  }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(exam.id) }}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#F3F4F6', border: 'none',
                      fontSize: 10, color: '#6B7280', cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                  <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, marginBottom: 4, paddingRight: 24 }}>
                    #{exams.length - i} · {new Date(exam.created_at).toLocaleDateString('ko-KR')}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
                    📜 {exam.passage_title}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>
                    🎓 {exam.university} · {exam.category}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ━━━━━ 가운데: 탭 + 본문 ━━━━━ */}
      <div style={{ flex: 1, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {!selExam ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
            <div style={{ fontSize: 36 }}>📜</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280' }}>회차를 선택해주세요</div>
          </div>
        ) : (
          <>
            {/* 탭 헤더 */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', flexShrink: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {/* 의도파악 탭 */}
              <button
                onClick={() => { setActiveTab('intent'); setShowAiPanel(false) }}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: `1px solid ${activeTab === 'intent' ? '#2563EB' : '#E5E7EB'}`,
                  background: activeTab === 'intent' ? '#2563EB' : '#fff',
                  color: activeTab === 'intent' ? '#fff' : '#6B7280',
                }}
              >
                🌟 의도파악
              </button>
              {/* 질문 탭 */}
              {questions.map((q) => {
                const isActive = activeTab === q.id
                const isCompleted = !!q.final_feedback && (!q.tail_question || !!q.tail_feedback)
                return (
                  <button
                    key={q.id}
                    onClick={() => { setActiveTab(q.id); setShowAiPanel(false) }}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: `1px solid ${isActive ? '#2563EB' : '#E5E7EB'}`,
                      background: isActive ? '#2563EB' : isCompleted ? '#ECFDF5' : '#fff',
                      color: isActive ? '#fff' : isCompleted ? '#059669' : '#6B7280',
                    }}
                  >
                    Q{q.order}{isCompleted && ' ✓'}
                  </button>
                )
              })}
            </div>

            {/* 본문 (전체 스크롤) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

              {/* ═══ 의도파악 탭 ═══ */}
              {activeTab === 'intent' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* 헤더 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
                      🌟 원질문 의도파악
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 12px',
                      borderRadius: 99,
                      background: selExam.main_intent_feedback ? '#ECFDF5' : selExam.main_intent_answer ? '#FFF3E8' : '#F3F4F6',
                      color: selExam.main_intent_feedback ? '#059669' : selExam.main_intent_answer ? '#D97706' : '#6B7280',
                      border: `1px solid ${selExam.main_intent_feedback ? '#6EE7B7' : selExam.main_intent_answer ? '#FDBA74' : '#E5E7EB'}`,
                    }}>
                      {selExam.main_intent_feedback ? '✓ 피드백완료' : selExam.main_intent_answer ? '피드백 대기' : '미답변'}
                    </span>
                  </div>

                  {/* 질문 */}
                  {seed?.main_intent_question && (
                    <div style={{ background: '#F8F7F5', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 6, letterSpacing: '0.5px' }}>📌 질문</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.6 }}>
                        {seed.main_intent_question}
                      </div>
                    </div>
                  )}

                  {/* 정답 의도 (참고) */}
                  {seed?.main_author_intent && (
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginBottom: 6 }}>📖 정답 의도 (참고)</div>
                      <div style={{ fontSize: 12, color: '#1E3A8A', lineHeight: 1.7 }}>{seed.main_author_intent}</div>
                    </div>
                  )}

                  {/* 학생 답변 */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '3px 10px', borderRadius: 99 }}>학생 답변</span>
                    </div>
                    <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                      {selExam.main_intent_answer || <span style={{ color: '#9CA3AF' }}>아직 학생이 답변을 작성하지 않았어요.</span>}
                      {selExam.main_intent_recording_url && <audio src={selExam.main_intent_recording_url} controls style={{ width: '100%', height: 28, marginTop: 8 }} />}
                    </div>
                  </div>

                  {/* 선생님 피드백 */}
                  {selExam.main_intent_answer && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#2563EB', padding: '3px 10px', borderRadius: 99 }}>선생님 피드백</span>
                      </div>
                      {selExam.main_intent_feedback ? (
                        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#1E3A8A', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                          {selExam.main_intent_feedback}
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={feedback[`intent_${selExam.id}`] || ''}
                            onChange={e => setFeedback(prev => ({ ...prev, [`intent_${selExam.id}`]: e.target.value }))}
                            placeholder="의도파악에 대한 피드백을 작성해주세요..."
                            rows={4}
                            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px 14px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button
                              onClick={sendIntentFb}
                              disabled={updateMain.isPending || !(feedback[`intent_${selExam.id}`] || '').trim()}
                              style={{
                                padding: '8px 16px',
                                background: (feedback[`intent_${selExam.id}`] || '').trim() ? '#2563EB' : '#E5E7EB',
                                color: (feedback[`intent_${selExam.id}`] || '').trim() ? '#fff' : '#9CA3AF',
                                border: 'none',
                                borderRadius: 7,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {updateMain.isPending ? '전달중...' : '의도파악 피드백 전달'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ 질문 탭 ═══ */}
              {activeTab !== 'intent' && selQ && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* 헤더 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
                      Q{selQ.order} · 메인 질문
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {selQ.first_answer && (
                        <button
                          onClick={() => setShowAiPanel(v => !v)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: showAiPanel ? '#2563EB' : '#EFF6FF',
                            color: showAiPanel ? '#fff' : '#2563EB',
                            border: '1px solid #2563EB',
                          }}
                        >
                          ✨ AI 분석 {showAiPanel ? '닫기' : '보기'}
                        </button>
                      )}
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 12px',
                        borderRadius: 99,
                        background: selQ.first_answer ? '#ECFDF5' : '#FFF3E8',
                        color: selQ.first_answer ? '#059669' : '#D97706',
                        border: `1px solid ${selQ.first_answer ? '#6EE7B7' : '#FDBA74'}`,
                      }}>
                        {selQ.first_answer ? '답변진행중' : '미답변'}
                      </span>
                    </div>
                  </div>

                  {/* 스테퍼 */}
                  <div style={{ display: 'flex' }}>
                    {STEP_LABELS.map((label, i) => {
                      const stepNum = i + 1
                      const isDone = stepNum < step
                      const isOn = stepNum === step
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
                          {i < STEP_LABELS.length - 1 && (
                            <div style={{
                              position: 'absolute', top: 11, left: '55%', width: '90%', height: 1.5,
                              background: isDone ? '#059669' : '#E5E7EB',
                            }} />
                          )}
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, zIndex: 1, position: 'relative',
                            background: isDone ? '#059669' : isOn ? '#2563EB' : '#F3F4F6',
                            color: isDone || isOn ? '#fff' : '#9CA3AF',
                            border: `2px solid ${isDone ? '#059669' : isOn ? '#2563EB' : '#E5E7EB'}`,
                          }}>
                            {isDone ? '✓' : stepNum}
                          </div>
                          <div style={{
                            fontSize: 10,
                            color: isDone ? '#059669' : isOn ? '#2563EB' : '#9CA3AF',
                            fontWeight: isOn ? 700 : 500,
                            whiteSpace: 'nowrap',
                          }}>
                            {label}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 질문 */}
                  <div style={{ background: '#F8F7F5', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 6, letterSpacing: '0.5px' }}>📌 질문</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.6 }}>
                      {selQ.question}
                    </div>
                  </div>

                  {selQ.author_intent && (
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginBottom: 6 }}>💡 질문 의도</div>
                      <div style={{ fontSize: 12, color: '#1E3A8A', lineHeight: 1.7 }}>{selQ.author_intent}</div>
                    </div>
                  )}

                  {/* Step 1 - 1차 답변 */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '3px 10px', borderRadius: 99 }}>Step 1</span>
                      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>학생 1차 답변</span>
                    </div>
                    <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                      {selQ.first_answer || <span style={{ color: '#9CA3AF' }}>아직 학생이 답변을 작성하지 않았어요.</span>}
                      {selQ.first_recording_url && <audio src={selQ.first_recording_url} controls style={{ width: '100%', height: 28, marginTop: 8 }} />}
                    </div>
                  </div>

                  {/* Step 2 - 1차 피드백 */}
                  {selQ.first_answer && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#2563EB', padding: '3px 10px', borderRadius: 99 }}>Step 2</span>
                        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>선생님 1차 피드백</span>
                      </div>
                      {selQ.first_feedback ? (
                        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#1E3A8A', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                          {selQ.first_feedback}
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={feedback[`${selQ.id}_first`] || ''}
                            onChange={e => setFeedback(prev => ({ ...prev, [`${selQ.id}_first`]: e.target.value }))}
                            placeholder="학생의 1차 답변에 대한 피드백을 작성해주세요..."
                            rows={4}
                            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px 14px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button
                              onClick={sendFirstFb}
                              disabled={updateFirst.isPending || !(feedback[`${selQ.id}_first`] || '').trim()}
                              style={{
                                padding: '8px 16px',
                                background: (feedback[`${selQ.id}_first`] || '').trim() ? '#2563EB' : '#E5E7EB',
                                color: (feedback[`${selQ.id}_first`] || '').trim() ? '#fff' : '#9CA3AF',
                                border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              }}
                            >
                              {updateFirst.isPending ? '전달중...' : '1차 피드백 전달'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 3 - 2차 답변 */}
                  {selQ.first_feedback && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '3px 10px', borderRadius: 99 }}>Step 3</span>
                        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>학생 2차 답변</span>
                      </div>
                      <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {selQ.second_answer || <span style={{ color: '#9CA3AF' }}>학생이 아직 2차 답변을 작성하지 않았어요.</span>}
                        {selQ.second_recording_url && <audio src={selQ.second_recording_url} controls style={{ width: '100%', height: 28, marginTop: 8 }} />}
                      </div>
                    </div>
                  )}

                  {/* Step 4 - 최종 피드백 */}
                  {selQ.second_answer && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#059669', padding: '3px 10px', borderRadius: 99 }}>Step 4</span>
                        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>선생님 최종 피드백</span>
                      </div>
                      {selQ.final_feedback ? (
                        <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#065F46', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                          {selQ.final_feedback}
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={feedback[`${selQ.id}_final`] || ''}
                            onChange={e => setFeedback(prev => ({ ...prev, [`${selQ.id}_final`]: e.target.value }))}
                            placeholder="2차 답변에 대한 최종 피드백을 작성해주세요..."
                            rows={4}
                            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px 14px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button
                              onClick={sendFinalFb}
                              disabled={updateFinal.isPending || !(feedback[`${selQ.id}_final`] || '').trim()}
                              style={{
                                padding: '8px 16px',
                                background: (feedback[`${selQ.id}_final`] || '').trim() ? '#059669' : '#E5E7EB',
                                color: (feedback[`${selQ.id}_final`] || '').trim() ? '#fff' : '#9CA3AF',
                                border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              }}
                            >
                              {updateFinal.isPending ? '전달중...' : '최종 피드백 전달'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 5 - 꼬리 답변 */}
                  {selQ.tail_question && selQ.final_feedback && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '3px 10px', borderRadius: 99 }}>Step 5</span>
                        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>🔗 꼬리질문 답변</span>
                      </div>
                      <div style={{ background: '#FFF3E8', border: '1px solid #FDBA74', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>꼬리질문</div>
                        <div style={{ fontSize: 12, color: '#9A3412', lineHeight: 1.6, fontWeight: 600 }}>{selQ.tail_question}</div>
                      </div>
                      <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {selQ.tail_answer || <span style={{ color: '#9CA3AF' }}>학생이 아직 꼬리 답변을 작성하지 않았어요.</span>}
                        {selQ.tail_recording_url && <audio src={selQ.tail_recording_url} controls style={{ width: '100%', height: 28, marginTop: 8 }} />}
                      </div>
                    </div>
                  )}

                  {/* Step 6 - 꼬리 피드백 */}
                  {selQ.tail_answer && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#059669', padding: '3px 10px', borderRadius: 99 }}>Step 6</span>
                        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>꼬리 피드백</span>
                      </div>
                      {selQ.tail_feedback ? (
                        <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#065F46', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                          {selQ.tail_feedback}
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={feedback[`${selQ.id}_tail`] || ''}
                            onChange={e => setFeedback(prev => ({ ...prev, [`${selQ.id}_tail`]: e.target.value }))}
                            placeholder="꼬리질문 답변에 대한 피드백을 작성해주세요..."
                            rows={3}
                            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px 14px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button
                              onClick={sendTailFb}
                              disabled={updateTail.isPending || !(feedback[`${selQ.id}_tail`] || '').trim()}
                              style={{
                                padding: '8px 16px',
                                background: (feedback[`${selQ.id}_tail`] || '').trim() ? '#059669' : '#E5E7EB',
                                color: (feedback[`${selQ.id}_tail`] || '').trim() ? '#fff' : '#9CA3AF',
                                border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              }}
                            >
                              {updateTail.isPending ? '전달중...' : '꼬리 피드백 전달'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        )}
      </div>

      {/* ━━━━━ 오른쪽: AI 분석 패널 ━━━━━ */}
      {showAiPanel && selQ && (
        <div style={{ width: 440, flexShrink: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EFF6FF' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A' }}>✨ AI 답변 분석</div>
            <button
              onClick={() => setShowAiPanel(false)}
              style={{ width: 28, height: 28, background: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#6B7280', fontSize: 14 }}
            >✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
            <div style={{ background: '#F8F7F5', border: '1px dashed #D1D5DB', borderRadius: 12, padding: '40px 20px', textAlign: 'center', color: '#6B7280' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🤖</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 6 }}>AI 분석 준비 중</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                제시문 면접에 맞는 분석 프롬프트가<br />
                준비되면 여기에 표시될 예정이에요.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 모달 */}
      {deleteTarget !== null && (
        <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>회차를 삭제하시겠어요?</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>학생 답변과 녹음이 모두 사라져요.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, height: 42, background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={() => deleteTarget && handleDelete(deleteTarget)} disabled={deleteExam.isPending}
                style={{ flex: 1, height: 42, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {deleteExam.isPending ? '삭제중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}