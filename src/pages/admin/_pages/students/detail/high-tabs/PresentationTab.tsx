import { useState } from 'react'

// 파랑 테마
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

const PRESENTATIONS = [
  {
    id: 1, date: '2025-03-20', university: '서울대학교', type: '제시문 면접', status: '완료',
    text: `[제시문 가]\n인공지능 기술의 발전으로 인해 많은 직업이 자동화될 것으로 예측된다. 일부 학자들은 이러한 변화가 새로운 직업 창출로 이어질 것이라 주장하지만, 다른 학자들은 불평등 심화를 우려한다.\n\n[제시문 나]\n역사적으로 기술 혁명은 단기적으로 일자리를 감소시켰지만 장기적으로는 더 많은 일자리를 창출했다. 산업혁명 당시 방직기 도입으로 많은 직공들이 일자리를 잃었지만, 결국 더 많은 고용이 이루어졌다.`,
    question: '제시문 가와 나를 바탕으로 인공지능 기술 발전이 사회에 미치는 영향을 논하고, 이에 대한 본인의 견해를 말하시오.',
    intent: '제시문 가와 나의 상반된 관점을 파악하고, 기술 발전에 대한 균형 잡힌 시각을 갖고 있는지 평가합니다. 단순한 찬반이 아닌 복합적 사고력과 논리적 근거 제시 능력을 봅니다.',
    answer: '인공지능 기술의 발전은 단기적으로 일자리 감소를 야기할 수 있지만, 장기적으로는 새로운 산업과 직업을 창출할 것입니다.',
    prevFeedback: '제시문을 잘 이해하고 있어요. 다만 본인의 견해 부분에서 더 구체적인 근거를 들었으면 좋겠어요.',
    upgradedAnswer: '',
    finalFeedback: '',
    answered: true,
  },
  {
    id: 2, date: '2025-04-05', university: '연세대학교', type: '제시문 면접', status: '완료',
    text: `[제시문]\n최근 빅데이터와 AI를 활용한 개인 맞춤형 서비스가 급증하고 있다. 이는 소비자 편의를 높이지만, 개인정보 침해와 프라이버시 문제를 야기한다는 비판도 있다.`,
    question: '제시문을 바탕으로 개인정보 보호와 기술 발전의 균형에 대해 본인의 생각을 말하시오.',
    intent: '개인정보 보호와 기술 혁신 사이의 트레이드오프를 이해하는지 평가합니다. 사회적 가치와 기술 발전의 균형에 대한 본인만의 관점을 논리적으로 표현할 수 있는지 봅니다.',
    answer: '',
    prevFeedback: '',
    upgradedAnswer: '',
    finalFeedback: '',
    answered: false,
  },
]

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백']

export default function PresentationTab({ student }: { student: any }) {
  const [presentations, setPresentations] = useState(PRESENTATIONS)
  const [selPres, setSelPres] = useState<any>(PRESENTATIONS[0])
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const getStep = (p: any) => {
    if (!p.answered) return 0
    if (!p.prevFeedback) return 1
    if (!p.upgradedAnswer) return 2
    if (!p.finalFeedback) return 3
    return 4
  }

  const sendFeedback = (type: 'first' | 'final') => {
    if (!selPres) return
    const key = type === 'first' ? String(selPres.id) : `${selPres.id}_final`
    const val = feedback[key] || ''
    if (!val.trim()) return
    if (type === 'first') {
      const updated = presentations.map(p => p.id === selPres.id ? { ...p, prevFeedback: val } : p)
      setPresentations(updated)
      setSelPres({ ...selPres, prevFeedback: val })
    } else {
      const updated = presentations.map(p => p.id === selPres.id ? { ...p, finalFeedback: val } : p)
      setPresentations(updated)
      setSelPres({ ...selPres, finalFeedback: val })
    }
    setFeedback(prev => ({ ...prev, [key]: '' }))
  }

  const deletePres = (id: number) => {
    setPresentations(prev => prev.filter(p => p.id !== id))
    if (selPres?.id === id) setSelPres(null)
    setDeleteTarget(null)
  }

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
  }
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#E5E7EB'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div className="flex gap-4 h-full overflow-hidden">

      {/* ==================== 왼쪽 목록 ==================== */}
      <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="px-4 py-3 border-b border-line flex-shrink-0">
          <div className="text-[14px] font-extrabold text-ink tracking-tight">📄 제시문 목록</div>
          <div className="text-[11px] font-medium text-ink-secondary mt-1">
            총 <span className="font-bold" style={{ color: THEME.accent }}>{presentations.length}개</span> ·
            완료 <span className="text-green-600 font-bold">{presentations.filter(p => p.answered).length}개</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {presentations.length === 0 ? (
            <div className="text-center py-10 text-ink-muted">
              <div className="text-3xl mb-2">📝</div>
              <div className="text-[12px] font-medium">제시문이 없어요.</div>
            </div>
          ) : presentations.map(p => {
            const isSelected = selPres?.id === p.id
            return (
              <div
                key={p.id}
                onClick={() => setSelPres(p)}
                className="rounded-xl px-3.5 py-3 mb-2 cursor-pointer transition-all relative"
                style={{
                  border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                  background: isSelected ? THEME.accentBg : '#fff',
                  boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                }}
              >
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(p.id) }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-[10px] text-ink-secondary transition-colors"
                >
                  ✕
                </button>
                <div className="flex items-center justify-between mb-1.5 pr-6">
                  <span className="text-[11px] font-semibold text-ink-secondary">📅 {p.date}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: p.status === '완료' ? '#ECFDF5' : THEME.accentBg,
                      color: p.status === '완료' ? '#059669' : THEME.accent,
                      border: `1px solid ${p.status === '완료' ? '#6EE7B7' : THEME.accentBorder}60`,
                    }}
                  >
                    {p.status === '완료' ? '✓ 완료' : p.status}
                  </span>
                </div>
                <div className="text-[13px] font-bold text-ink mb-0.5">🎓 {p.university}</div>
                <div className="text-[11px] font-medium text-ink-secondary mb-2">{p.type}</div>
                {p.answered ? (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    ✓ {getStep(p)}/4단계
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    ⏳ 미답변
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ==================== 오른쪽 상세 ==================== */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
        {!selPres ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
            <div className="text-4xl">📝</div>
            <div className="text-[14px] font-bold text-ink-secondary">제시문을 선택해주세요</div>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-line flex-shrink-0">
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div>
                  <div className="text-[15px] font-extrabold text-ink tracking-tight">
                    🎓 {selPres.university} · {selPres.type}
                  </div>
                  <div className="text-[11px] font-semibold text-ink-secondary mt-0.5">📅 {selPres.date}</div>
                </div>
                <span
                  className="text-[11px] font-bold px-3 py-1 rounded-full"
                  style={{
                    background: selPres.answered ? '#ECFDF5' : '#FFF3E8',
                    color: selPres.answered ? '#059669' : '#D97706',
                    border: `1px solid ${selPres.answered ? '#6EE7B7' : '#FDBA74'}`,
                  }}
                >
                  {selPres.answered ? '✓ 답변완료' : '⏳ 미답변'}
                </span>
              </div>

              {/* 4단계 진행 */}
              <div className="flex">
                {STEP_LABELS.map((label, i) => {
                  const step = getStep(selPres)
                  const stepNum = i + 1
                  const isDone = stepNum < step
                  const isOn = stepNum === step
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                      {i < 3 && (
                        <div
                          className="absolute top-[11px] left-[55%] w-[90%] h-0.5 z-0"
                          style={{ background: isDone ? '#059669' : '#E5E7EB' }}
                        />
                      )}
                      <div
                        className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-extrabold z-10 relative"
                        style={{
                          background: isDone ? '#059669' : isOn ? THEME.accent : '#F3F4F6',
                          color: isDone || isOn ? '#fff' : '#9CA3AF',
                          border: `2px solid ${isDone ? '#059669' : isOn ? THEME.accent : '#E5E7EB'}`,
                        }}
                      >
                        {isDone ? '✓' : stepNum}
                      </div>
                      <div
                        className="text-[10px] whitespace-nowrap"
                        style={{
                          color: isDone ? '#059669' : isOn ? THEME.accentDark : '#9CA3AF',
                          fontWeight: isOn ? 700 : 500,
                        }}
                      >
                        {label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 바디 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

              {/* 제시문 */}
              <div className="bg-gray-50 border border-line rounded-xl px-5 py-4">
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">📄 제시문</div>
                <div className="text-[13px] font-medium text-ink leading-[1.9] whitespace-pre-wrap">{selPres.text}</div>
              </div>

              {/* 질문 */}
              <div
                className="rounded-xl px-5 py-4"
                style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
              >
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: THEME.accent }}>
                  📌 질문
                </div>
                <div className="text-[14px] font-bold leading-[1.7]" style={{ color: THEME.accentDark }}>
                  {selPres.question}
                </div>
              </div>

              {/* 질문 의도 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-amber-700">
                  💡 질문 의도
                </div>
                <div className="text-[13px] font-medium text-amber-800 leading-[1.7]">{selPres.intent}</div>
              </div>

              {/* 히스토리 */}
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-4">
                  💬 답변 · 피드백 히스토리
                </div>
                <div className="flex flex-col gap-4">

                  {/* Step 1 */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-extrabold text-white bg-ink-muted px-2 py-0.5 rounded-full">
                        Step 1
                      </span>
                      <span className="text-[11px] font-semibold text-ink-secondary">학생 첫 답변</span>
                    </div>
                    <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink leading-[1.8]">
                      {selPres.answered ? selPres.answer : <span className="text-ink-muted">아직 학생이 답변을 작성하지 않았어요.</span>}
                    </div>
                  </div>

                  {/* Step 2 */}
                  {selPres.answered && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                          style={{ background: THEME.accent }}
                        >
                          Step 2
                        </span>
                        <span className="text-[11px] font-semibold text-ink-secondary">선생님 1차 피드백</span>
                      </div>
                      {selPres.prevFeedback ? (
                        <div
                          className="rounded-lg px-3 py-2.5 text-[13px] font-medium leading-[1.8]"
                          style={{
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}60`,
                            color: THEME.accentDark,
                          }}
                        >
                          {selPres.prevFeedback}
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={feedback[String(selPres.id)] || ''}
                            onChange={e => setFeedback(prev => ({ ...prev, [String(selPres.id)]: e.target.value }))}
                            placeholder="학생 답변에 대한 피드백을 작성해주세요..."
                            rows={3}
                            className="w-full border border-line rounded-lg px-3 py-2.5 text-[12px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                            onFocus={handleTextareaFocus}
                            onBlur={handleTextareaBlur}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => sendFeedback('first')}
                              className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                              style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                            >
                              📤 1차 피드백 전달
                            </button>
                            <button
                              className="px-4 py-2 bg-white border rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                              style={{ color: THEME.accent, borderColor: THEME.accent }}
                            >
                              ✨ AI 제안
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 3 */}
                  {selPres.prevFeedback && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-extrabold text-white bg-ink-muted px-2 py-0.5 rounded-full">
                          Step 3
                        </span>
                        <span className="text-[11px] font-semibold text-ink-secondary">학생 업그레이드 답변</span>
                      </div>
                      <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink leading-[1.8]">
                        {selPres.upgradedAnswer || <span className="text-ink-muted">학생이 아직 업그레이드 답변을 작성하지 않았어요.</span>}
                      </div>
                    </div>
                  )}

                  {/* Step 4 */}
                  {selPres.upgradedAnswer && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-extrabold text-white bg-green-600 px-2 py-0.5 rounded-full">
                          Step 4
                        </span>
                        <span className="text-[11px] font-semibold text-ink-secondary">선생님 최종 피드백</span>
                      </div>
                      {selPres.finalFeedback ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-[13px] font-medium text-green-800 leading-[1.8]">
                          {selPres.finalFeedback}
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={feedback[`${selPres.id}_final`] || ''}
                            onChange={e => setFeedback(prev => ({ ...prev, [`${selPres.id}_final`]: e.target.value }))}
                            placeholder="업그레이드된 답변에 대한 최종 피드백을 작성해주세요..."
                            rows={3}
                            className="w-full border border-line rounded-lg px-3 py-2.5 text-[12px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                            onFocus={e => {
                              e.target.style.borderColor = '#059669'
                              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)'
                            }}
                            onBlur={handleTextareaBlur}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => sendFeedback('final')}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] font-bold hover:bg-green-700 transition-all hover:-translate-y-px"
                              style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                            >
                              ✓ 최종 피드백 전달
                            </button>
                            <button
                              className="px-4 py-2 bg-white border rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                              style={{ color: THEME.accent, borderColor: THEME.accent }}
                            >
                              ✨ AI 제안
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

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
            <div className="text-[17px] font-extrabold text-ink mb-2">제시문을 삭제하시겠어요?</div>
            <div className="text-[13px] font-medium text-ink-secondary mb-6 leading-[1.6]">
              삭제하면 답변과 피드백이<br />모두 사라져요.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => deletePres(deleteTarget)}
                className="flex-1 h-11 bg-red-600 text-white rounded-lg text-[13px] font-bold hover:bg-red-700 transition-all hover:-translate-y-px"
                style={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
              >
                🗑️ 삭제
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}