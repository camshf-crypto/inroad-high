import { useState } from 'react'

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

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>

      {/* 왼쪽 목록 */}
      <div style={{ width: 300, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>제시문 목록</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
            총 <span style={{ color: '#3B5BDB', fontWeight: 600 }}>{presentations.length}개</span> ·
            완료 <span style={{ color: '#059669', fontWeight: 600 }}>{presentations.filter(p => p.answered).length}개</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {presentations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 12 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
              제시문이 없어요.
            </div>
          ) : presentations.map(p => (
            <div key={p.id} onClick={() => setSelPres(p)}
              style={{ border: `0.5px solid ${selPres?.id === p.id ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, padding: '12px 13px', marginBottom: 8, cursor: 'pointer', background: selPres?.id === p.id ? '#EEF2FF' : '#fff', position: 'relative' }}>
              <div onClick={e => { e.stopPropagation(); setDeleteTarget(p.id) }}
                style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#6B7280', cursor: 'pointer' }}>
                ✕
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, paddingRight: 20 }}>
                <span style={{ fontSize: 11, color: '#6B7280' }}>{p.date}</span>
                <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: p.status === '완료' ? '#ECFDF5' : '#EEF2FF', color: p.status === '완료' ? '#059669' : '#3B5BDB', border: `0.5px solid ${p.status === '완료' ? '#6EE7B7' : '#BAC8FF'}` }}>
                  {p.status}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 2 }}>{p.university}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>{p.type}</div>
              {p.answered
                ? <span style={{ fontSize: 10, color: '#059669', background: '#ECFDF5', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #6EE7B7' }}>답변완료 · {getStep(p)}/4단계</span>
                : <span style={{ fontSize: 10, color: '#D97706', background: '#FFF3E8', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #FDBA74' }}>미답변</span>
              }
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽 상세 */}
      <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selPres ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
            <div style={{ fontSize: 32 }}>📝</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>제시문을 선택해주세요</div>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div style={{ padding: '13px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{selPres.university} · {selPres.type}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{selPres.date}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: selPres.answered ? '#ECFDF5' : '#FFF3E8', color: selPres.answered ? '#059669' : '#D97706', border: `0.5px solid ${selPres.answered ? '#6EE7B7' : '#FDBA74'}` }}>
                  {selPres.answered ? '답변완료' : '미답변'}
                </span>
              </div>
              <div style={{ display: 'flex' }}>
                {STEP_LABELS.map((label, i) => {
                  const step = getStep(selPres)
                  const stepNum = i + 1
                  const isDone = stepNum < step
                  const isOn = stepNum === step
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}>
                      {i < 3 && <div style={{ position: 'absolute', top: 11, left: '55%', width: '90%', height: 1, background: isDone ? '#059669' : '#E5E7EB' }} />}
                      <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, zIndex: 1, position: 'relative', background: isDone ? '#059669' : isOn ? '#3B5BDB' : '#F3F4F6', color: isDone || isOn ? '#fff' : '#9CA3AF', border: `1px solid ${isDone ? '#059669' : isOn ? '#3B5BDB' : '#E5E7EB'}` }}>
                        {isDone ? '✓' : stepNum}
                      </div>
                      <div style={{ fontSize: 10, color: isDone ? '#059669' : isOn ? '#3B5BDB' : '#9CA3AF', fontWeight: isOn ? 500 : 400, whiteSpace: 'nowrap' }}>{label}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 바디 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* 제시문 */}
              <div style={{ background: '#F8F7F5', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 8 }}>제시문</div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{selPres.text}</div>
              </div>

              {/* 질문 */}
              <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#3B5BDB', marginBottom: 8 }}>질문</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1E3A8A', lineHeight: 1.7 }}>{selPres.question}</div>
              </div>

              {/* 질문 의도 */}
              <div style={{ background: '#FFF3E8', border: '0.5px solid #FDBA74', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#D97706', marginBottom: 8 }}>💡 질문 의도</div>
                <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.7 }}>{selPres.intent}</div>
              </div>

              {/* 히스토리 */}
              <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 12 }}>답변 · 피드백 히스토리</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Step 1 */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '2px 8px', borderRadius: 99 }}>Step 1</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>학생 첫 답변</span>
                    </div>
                    <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                      {selPres.answered ? selPres.answer : <span style={{ color: '#9CA3AF' }}>아직 학생이 답변을 작성하지 않았어요.</span>}
                    </div>
                  </div>

                  {/* Step 2 */}
                  {selPres.answered && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#3B5BDB', padding: '2px 8px', borderRadius: 99 }}>Step 2</span>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>선생님 1차 피드백</span>
                      </div>
                      {selPres.prevFeedback ? (
                        <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#1E3A8A', lineHeight: 1.8 }}>
                          {selPres.prevFeedback}
                        </div>
                      ) : (
                        <>
                          <textarea value={feedback[String(selPres.id)] || ''} onChange={e => setFeedback(prev => ({ ...prev, [String(selPres.id)]: e.target.value }))}
                            placeholder="학생 답변에 대한 피드백을 작성해주세요..." rows={3}
                            style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }} />
                          <div style={{ display: 'flex', gap: 7, marginTop: 7 }}>
                            <button onClick={() => sendFeedback('first')} style={{ padding: '7px 14px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>1차 피드백 전달</button>
                            <button style={{ padding: '7px 14px', background: '#fff', color: '#3B5BDB', border: '0.5px solid #3B5BDB', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>✨ AI 제안</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 3 */}
                  {selPres.prevFeedback && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '2px 8px', borderRadius: 99 }}>Step 3</span>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>학생 업그레이드 답변</span>
                      </div>
                      <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                        {selPres.upgradedAnswer || <span style={{ color: '#9CA3AF' }}>학생이 아직 업그레이드 답변을 작성하지 않았어요.</span>}
                      </div>
                    </div>
                  )}

                  {/* Step 4 */}
                  {selPres.upgradedAnswer && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#059669', padding: '2px 8px', borderRadius: 99 }}>Step 4</span>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>선생님 최종 피드백</span>
                      </div>
                      {selPres.finalFeedback ? (
                        <div style={{ background: '#ECFDF5', border: '0.5px solid #6EE7B7', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#065F46', lineHeight: 1.8 }}>
                          {selPres.finalFeedback}
                        </div>
                      ) : (
                        <>
                          <textarea value={feedback[`${selPres.id}_final`] || ''} onChange={e => setFeedback(prev => ({ ...prev, [`${selPres.id}_final`]: e.target.value }))}
                            placeholder="업그레이드된 답변에 대한 최종 피드백을 작성해주세요..." rows={3}
                            style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }} />
                          <div style={{ display: 'flex', gap: 7, marginTop: 7 }}>
                            <button onClick={() => sendFeedback('final')} style={{ padding: '7px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>최종 피드백 전달</button>
                            <button style={{ padding: '7px 14px', background: '#fff', color: '#3B5BDB', border: '0.5px solid #3B5BDB', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>✨ AI 제안</button>
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

      {/* 삭제 확인 모달 */}
      {deleteTarget !== null && (
        <div onClick={() => setDeleteTarget(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>제시문을 삭제하시겠어요?</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>삭제하면 답변과 피드백이 모두 사라져요.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, height: 42, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
              <button onClick={() => deletePres(deleteTarget)}
                style={{ flex: 1, height: 42, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>삭제</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}