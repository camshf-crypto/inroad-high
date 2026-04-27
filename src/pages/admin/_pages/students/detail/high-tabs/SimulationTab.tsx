import { useState, useEffect } from 'react'
import {
  useStudentSimulations,
  useStudentSimulationQuestions,
  useUpdateSimulationFeedback,
  useDeleteStudentSimulation,
  getQuestionTypeLabel,
  formatSimDuration,
  type AdminSimulation,
} from '../../../../_hooks/useStudentSimulation'

// 파랑 테마
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

export default function SimulationTab({ student }: { student: any }) {
  const studentId = student?.id

  // DB
  const { data: simulations = [], isLoading } = useStudentSimulations(studentId)
  const [selSim, setSelSim] = useState<AdminSimulation | null>(null)
  const { data: questions = [] } = useStudentSimulationQuestions(selSim?.id)

  // Mutations
  const updateFeedback = useUpdateSimulationFeedback()
  const deleteSim = useDeleteStudentSimulation()

  const [feedback, setFeedback] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // 첫 로드 시 첫 시뮬레이션 자동 선택
  useEffect(() => {
    if (!selSim && simulations.length > 0) {
      setSelSim(simulations[0])
      setFeedback(simulations[0].teacher_feedback || '')
    }
  }, [simulations, selSim])

  const handleSelect = (sim: AdminSimulation) => {
    setSelSim(sim)
    setFeedback(sim.teacher_feedback || '')
  }

  const handleDelete = async (id: string) => {
    if (!studentId) return
    try {
      await deleteSim.mutateAsync({ simulationId: id, studentId })
      if (selSim?.id === id) setSelSim(null)
      setDeleteTarget(null)
    } catch (e: any) {
      alert('삭제 실패: ' + e.message)
    }
  }

  const handleSaveFeedback = async () => {
    if (!selSim) return
    try {
      await updateFeedback.mutateAsync({
        simulationId: selSim.id,
        feedback: feedback,
      })
      alert('피드백이 저장되었어요!')
    } catch (e: any) {
      alert('저장 실패: ' + e.message)
    }
  }

  // 시뮬레이션 제목
  const getSimTitle = (sim: AdminSimulation) => {
    if (sim.university && sim.department) return { univ: sim.university, dept: sim.department }
    return { univ: getQuestionTypeLabel(sim.question_type), dept: '' }
  }

  return (
    <div className="flex gap-4 h-full overflow-hidden">

      {/* ==================== 왼쪽 목록 ==================== */}
      <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="px-4 py-3 border-b border-line flex-shrink-0">
          <div className="text-[14px] font-extrabold text-ink tracking-tight">🎬 시뮬레이션 기록</div>
          <div className="text-[11px] font-medium text-ink-secondary mt-1">
            총 <span className="font-bold" style={{ color: THEME.accent }}>
              {simulations.length}회
            </span> 진행
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {isLoading ? (
            <div className="text-center py-10 text-ink-muted">
              <div className="text-[12px] font-medium">불러오는 중...</div>
            </div>
          ) : simulations.length === 0 ? (
            <div className="text-center py-10 text-ink-muted">
              <div className="text-3xl mb-2">🎬</div>
              <div className="text-[12px] font-medium">시뮬레이션 기록이 없어요.</div>
              <div className="text-[11px] mt-1">학생이 시뮬레이션을 진행하면 여기에 표시돼요.</div>
            </div>
          ) : simulations.map((sim, i) => {
            const isSelected = selSim?.id === sim.id
            const { univ, dept } = getSimTitle(sim)
            const hasFeedback = !!sim.teacher_feedback
            return (
              <div
                key={sim.id}
                onClick={() => handleSelect(sim)}
                className="rounded-xl px-3.5 py-3 mb-2 cursor-pointer transition-all relative"
                style={{
                  border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                  background: isSelected ? THEME.accentBg : '#fff',
                  boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                }}
              >
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(sim.id) }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-[10px] text-ink-secondary transition-colors"
                >
                  ✕
                </button>

                <div className="flex items-center justify-between mb-1.5 pr-6">
                  <span className="text-[11px] font-bold text-ink-secondary">
                    #{simulations.length - i} · 📅 {new Date(sim.created_at).toLocaleDateString('ko-KR')}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: hasFeedback ? '#ECFDF5' : THEME.accentBg,
                      color: hasFeedback ? '#059669' : THEME.accent,
                      border: `1px solid ${hasFeedback ? '#6EE7B7' : THEME.accentBorder}60`,
                    }}
                  >
                    {hasFeedback ? '✓ 피드백' : '⏳ 대기'}
                  </span>
                </div>

                <div className="text-[13px] font-bold text-ink mb-0.5">🎓 {univ}</div>
                {dept && <div className="text-[11px] font-medium text-ink-secondary mb-1.5">{dept}</div>}
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {sim.duration_sec > 0 && (
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: THEME.accent, background: THEME.accentBg }}
                    >
                      ⏱ {formatSimDuration(sim.duration_sec)}
                    </span>
                  )}
                  {sim.tail_question_enabled && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      🔗 꼬리
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ==================== 오른쪽 상세 ==================== */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
        {!selSim ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
            <div className="text-4xl">🎬</div>
            <div className="text-[14px] font-bold text-ink-secondary">
              시뮬레이션을 선택해주세요
            </div>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-line flex-shrink-0">
              <div className="text-[15px] font-extrabold text-ink tracking-tight">
                🎓 {getSimTitle(selSim).univ}
                {getSimTitle(selSim).dept && ` · ${getSimTitle(selSim).dept}`}
              </div>
              <div className="text-[11px] font-semibold text-ink-secondary mt-0.5">
                📅 {new Date(selSim.created_at).toLocaleDateString('ko-KR')} · ⏱ {formatSimDuration(selSim.duration_sec)} · 📝 {selSim.question_count}문제
              </div>
            </div>

            {/* 바디 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

              {/* 시뮬레이션 정보 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 border border-line rounded-xl px-3 py-2.5">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">유형</div>
                  <div className="text-[12px] font-bold text-ink">{getQuestionTypeLabel(selSim.question_type)}</div>
                </div>
                <div className="bg-gray-50 border border-line rounded-xl px-3 py-2.5">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">꼬리질문</div>
                  <div className="text-[12px] font-bold text-ink">{selSim.tail_question_enabled ? 'ON' : 'OFF'}</div>
                </div>
                <div className="bg-gray-50 border border-line rounded-xl px-3 py-2.5">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">질문 방식</div>
                  <div className="text-[12px] font-bold text-ink">
                    {selSim.question_mode === 'text' ? '텍스트' : selSim.question_mode === 'voice' ? '음성' : '텍스트+음성'}
                  </div>
                </div>
              </div>

              {/* 질문 + 답변 목록 */}
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="text-[12px] font-extrabold text-ink mb-3 tracking-tight">
                  📝 질문 & 답변 ({questions.length}개)
                </div>
                {questions.length === 0 ? (
                  <div className="text-[12px] text-ink-muted text-center py-4">
                    질문 정보가 없어요
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {questions.map((q) => (
                      <div
                        key={q.id}
                        className="rounded-lg p-3"
                        style={{
                          background: q.is_tail ? '#FFFBEB' : '#F9FAFB',
                          border: `1px solid ${q.is_tail ? '#FDE68A' : '#E5E7EB'}`,
                          marginLeft: q.is_tail ? 24 : 0,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: q.is_tail ? '#FEF3C7' : '#DBEAFE',
                              color: q.is_tail ? '#92400E' : '#1E40AF',
                            }}
                          >
                            {q.is_tail ? '🔗 꼬리질문' : `Q${q.order}`}
                          </span>
                          {q.duration_sec !== null && q.duration_sec !== undefined && (
                            <span className="text-[10px] font-semibold text-ink-muted ml-auto">
                              ⏱️ {q.duration_sec}초 사용
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] font-bold text-ink mb-2 leading-[1.5]">
                          {q.question_text}
                        </div>
                        {q.recording_url ? (
                          <audio src={q.recording_url} controls className="w-full h-9 mt-1" />
                        ) : (
                          <div className="text-[11px] text-ink-muted">녹음 없음</div>
                        )}
                        {q.transcript && (
                          <div className="bg-white border border-line rounded-md px-2.5 py-2 mt-2 text-[12px] text-ink leading-[1.7]">
                            {q.transcript}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 전체 녹음 (있다면) */}
              {selSim.recording_url && (
                <div className="bg-white border border-line rounded-xl px-5 py-4">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                    🎙️ 전체 녹음
                  </div>
                  <audio src={selSim.recording_url} controls className="w-full" />
                </div>
              )}

              {/* 선생님 피드백 */}
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">
                  💬 선생님 피드백
                </div>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="시뮬레이션을 듣고 피드백을 작성해주세요..."
                  rows={5}
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                  onFocus={e => {
                    e.target.style.borderColor = THEME.accent
                    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveFeedback}
                    disabled={updateFeedback.isPending || !feedback.trim()}
                    className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px disabled:opacity-50"
                    style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                  >
                    {updateFeedback.isPending ? '저장 중...' : '📤 피드백 저장'}
                  </button>
                </div>
              </div>

            </div>
          </>
        )}
      </div>

      {/* ==================== 삭제 확인 모달 ==================== */}
      {deleteTarget !== null && (
        <div
          onClick={() => setDeleteTarget(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[380px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-3xl mb-3">⚠️</div>
            <div className="text-[17px] font-extrabold text-ink mb-2">시뮬레이션을 삭제하시겠어요?</div>
            <div className="text-[13px] font-medium text-ink-secondary mb-6 leading-[1.6]">
              삭제하면 녹음 파일과<br />질문/답변 기록이 모두 사라져요.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => deleteTarget && handleDelete(deleteTarget)}
                disabled={deleteSim.isPending}
                className="flex-1 h-11 bg-red-600 text-white rounded-lg text-[13px] font-bold hover:bg-red-700 transition-all hover:-translate-y-px disabled:opacity-50"
                style={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
              >
                {deleteSim.isPending ? '삭제 중...' : '🗑️ 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}