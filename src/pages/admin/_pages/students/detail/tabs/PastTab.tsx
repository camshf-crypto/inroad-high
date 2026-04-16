import { useState } from 'react'

const UNIVERSITIES = [
  { id: 1, name: '서울대학교', dept: '컴퓨터공학부' },
  { id: 2, name: '연세대학교', dept: '컴퓨터과학과' },
  { id: 3, name: '고려대학교', dept: '컴퓨터학과' },
  { id: 4, name: '한양대학교', dept: '소프트웨어학부' },
  { id: 5, name: '성균관대학교', dept: '소프트웨어학과' },
  { id: 6, name: '중앙대학교', dept: '소프트웨어학부' },
]

const PAST_QUESTIONS: Record<number, any[]> = {
  1: [
    { id: 1, text: '본인의 전공 선택 동기와 관련된 구체적인 경험을 말해보세요.', type: '공통', answered: true, answer: '중학교 때 코딩 동아리에서 처음 프로그래밍을 접했고 문제를 논리적으로 해결하는 과정이 재미있었습니다.', prevFeedback: '좋은 답변이에요! 더 구체적인 프로젝트 경험을 추가하면 좋겠어요.', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 2, text: '가장 인상 깊었던 수업과 그 이유를 설명해주세요.', type: '공통', answered: true, answer: '고2 때 들은 인공지능 수업이 가장 인상 깊었습니다.', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 3, text: '팀 프로젝트에서 갈등이 생겼을 때 어떻게 해결했나요?', type: '인성', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 4, text: 'AI 기술의 윤리적 문제에 대해 어떻게 생각하시나요?', type: '전공', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  2: [
    { id: 1, text: '지원 학과에서 배우고 싶은 것이 무엇인가요?', type: '공통', answered: true, answer: '자연어 처리와 컴퓨터 비전을 깊이 공부하고 싶습니다.', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 2, text: '본인의 강점이 학과 공부에 어떻게 도움이 될까요?', type: '인성', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  3: [
    { id: 1, text: '전공 관련 최근 이슈에 대해 본인의 견해를 말해주세요.', type: '전공', answered: false, answer: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  4: [], 5: [], 6: [],
}

const TYPE_COLOR: Record<string, any> = {
  '공통': { bg: '#EEF2FF', color: '#3B5BDB', border: '#BAC8FF' },
  '전공': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '인성': { bg: '#FFF3E8', color: '#D97706', border: '#FDBA74' },
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

const AI_TAIL_SUGGESTIONS = [
  '해당 프로젝트에서 본인이 기여한 부분을 구체적으로 설명해주세요.',
  '그 경험에서 가장 어려웠던 점은 무엇이었나요?',
  '같은 상황이 다시 생긴다면 어떻게 다르게 접근하겠나요?',
]

export default function PastTab({ student }: { student: any }) {
  const [selUniv, setSelUniv] = useState(UNIVERSITIES[0])
  const [selQ, setSelQ] = useState<any>(null)
  const [questions, setQuestions] = useState(PAST_QUESTIONS)
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  // 꼬리질문 모달
  const [showTailModal, setShowTailModal] = useState(false)
  const [tailInput, setTailInput] = useState('')

  // AI 꼬리질문 모달
  const [showAiTailModal, setShowAiTailModal] = useState(false)
  const [aiTailLoading, setAiTailLoading] = useState(false)
  const [aiTails, setAiTails] = useState<string[]>([])
  const [selectedAiTails, setSelectedAiTails] = useState<number[]>([])

  const curQuestions = questions[selUniv.id] || []

  const sendFeedback = (type: 'first' | 'final') => {
    if (!selQ) return
    const key = type === 'first' ? String(selQ.id) : `${selQ.id}_final`
    const val = feedback[key] || ''
    if (!val.trim()) return
    if (type === 'first') {
      const updated = { ...questions, [selUniv.id]: questions[selUniv.id].map(q => q.id === selQ.id ? { ...q, prevFeedback: val } : q) }
      setQuestions(updated)
      setSelQ({ ...selQ, prevFeedback: val })
    } else {
      const updated = { ...questions, [selUniv.id]: questions[selUniv.id].map(q => q.id === selQ.id ? { ...q, finalFeedback: val } : q) }
      setQuestions(updated)
      setSelQ({ ...selQ, finalFeedback: val })
    }
    setFeedback(prev => ({ ...prev, [key]: '' }))
  }

  const addTail = () => {
    if (!tailInput.trim() || !selQ) return
    const updated = { ...questions, [selUniv.id]: questions[selUniv.id].map(q => q.id === selQ.id ? { ...q, tails: [...q.tails, tailInput.trim()] } : q) }
    setQuestions(updated)
    setSelQ({ ...selQ, tails: [...selQ.tails, tailInput.trim()] })
    setTailInput('')
    setShowTailModal(false)
  }

  const openAiTailModal = () => {
    setShowAiTailModal(true)
    setAiTailLoading(true)
    setAiTails([])
    setSelectedAiTails([])
    setTimeout(() => { setAiTails(AI_TAIL_SUGGESTIONS); setAiTailLoading(false) }, 1200)
  }

  const deliverAiTails = () => {
    if (!selQ || selectedAiTails.length === 0) return
    const newTails = selectedAiTails.map(i => aiTails[i])
    const updated = { ...questions, [selUniv.id]: questions[selUniv.id].map(q => q.id === selQ.id ? { ...q, tails: [...q.tails, ...newTails] } : q) }
    setQuestions(updated)
    setSelQ({ ...selQ, tails: [...selQ.tails, ...newTails] })
    setShowAiTailModal(false)
    setAiTails([]); setSelectedAiTails([])
  }

  const getStep = (q: any) => {
    if (!q.answered) return 0
    if (!q.prevFeedback) return 1
    if (!q.upgradedAnswer) return 2
    if (!q.finalFeedback) return 3
    return 4
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'hidden' }}>

      {/* 대학 탭 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
        {UNIVERSITIES.map(u => (
          <div key={u.id} onClick={() => { setSelUniv(u); setSelQ(null) }}
            style={{ padding: '7px 16px', borderRadius: 99, fontSize: 13, cursor: 'pointer', background: selUniv.id === u.id ? '#3B5BDB' : '#fff', color: selUniv.id === u.id ? '#fff' : '#6B7280', border: `0.5px solid ${selUniv.id === u.id ? '#3B5BDB' : '#E5E7EB'}`, fontWeight: selUniv.id === u.id ? 500 : 400 }}>
            {u.name}
          </div>
        ))}
      </div>

      {/* 메인 */}
      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>

        {/* 왼쪽 질문 목록 */}
        <div style={{ width: 360, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{selUniv.name}</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{selUniv.dept}</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              총 <span style={{ color: '#3B5BDB', fontWeight: 600 }}>{curQuestions.length}개</span> ·
              답변완료 <span style={{ color: '#059669', fontWeight: 600 }}>{curQuestions.filter(q => q.answered).length}개</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {curQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
                기출문제가 없어요.
              </div>
            ) : curQuestions.map((q, i) => {
              const tc = TYPE_COLOR[q.type] || TYPE_COLOR['공통']
              return (
                <div key={q.id} onClick={() => setSelQ(q)}
                  style={{ border: `0.5px solid ${selQ?.id === q.id ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 7, cursor: 'pointer', background: selQ?.id === q.id ? '#EEF2FF' : '#fff' }}>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#3B5BDB', background: '#EEF2FF', padding: '1px 7px', borderRadius: 99 }}>Q{i + 1}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 7px', borderRadius: 99, background: tc.bg, color: tc.color, border: `0.5px solid ${tc.border}` }}>{q.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.5, fontWeight: 500, marginBottom: 5 }}>{q.text}</div>
                  {q.answered
                    ? <span style={{ fontSize: 10, color: '#059669', background: '#ECFDF5', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #6EE7B7' }}>답변완료 · {getStep(q)}/5단계</span>
                    : <span style={{ fontSize: 10, color: '#D97706', background: '#FFF3E8', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #FDBA74' }}>미답변</span>
                  }
                </div>
              )
            })}
          </div>
        </div>

        {/* 오른쪽 상세 */}
        <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selQ ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
              <div style={{ fontSize: 32 }}>🎓</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>질문을 선택해주세요</div>
              <div style={{ fontSize: 12 }}>왼쪽에서 기출문제를 클릭하면 상세 내용을 볼 수 있어요</div>
            </div>
          ) : (
            <>
              {/* 헤더 */}
              <div style={{ padding: '13px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>Q{curQuestions.findIndex(q => q.id === selQ.id) + 1}</div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: TYPE_COLOR[selQ.type]?.bg, color: TYPE_COLOR[selQ.type]?.color, border: `0.5px solid ${TYPE_COLOR[selQ.type]?.border}` }}>{selQ.type}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: selQ.answered ? '#ECFDF5' : '#FFF3E8', color: selQ.answered ? '#059669' : '#D97706', border: `0.5px solid ${selQ.answered ? '#6EE7B7' : '#FDBA74'}` }}>
                    {selQ.answered ? '답변완료' : '미답변'}
                  </span>
                </div>
                {/* 5단계 */}
                <div style={{ display: 'flex' }}>
                  {STEP_LABELS.map((label, i) => {
                    const step = getStep(selQ)
                    const stepNum = i + 1
                    const isDone = stepNum < step
                    const isOn = stepNum === step
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}>
                        {i < 4 && <div style={{ position: 'absolute', top: 11, left: '55%', width: '90%', height: 1, background: isDone ? '#059669' : '#E5E7EB' }} />}
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

                {/* 질문 */}
                <div style={{ background: '#F8F7F5', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 5 }}>기출 질문</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.6 }}>{selQ.text}</div>
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
                        {selQ.answered ? selQ.answer : <span style={{ color: '#9CA3AF' }}>아직 학생이 답변을 작성하지 않았어요.</span>}
                      </div>
                    </div>

                    {/* Step 2 */}
                    {selQ.answered && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#3B5BDB', padding: '2px 8px', borderRadius: 99 }}>Step 2</span>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>선생님 1차 피드백</span>
                        </div>
                        {selQ.prevFeedback ? (
                          <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#1E3A8A', lineHeight: 1.8 }}>
                            {selQ.prevFeedback}
                          </div>
                        ) : (
                          <>
                            <textarea value={feedback[String(selQ.id)] || ''} onChange={e => setFeedback(prev => ({ ...prev, [String(selQ.id)]: e.target.value }))}
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
                    {selQ.prevFeedback && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '2px 8px', borderRadius: 99 }}>Step 3</span>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>학생 업그레이드 답변</span>
                        </div>
                        <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                          {selQ.upgradedAnswer || <span style={{ color: '#9CA3AF' }}>학생이 아직 업그레이드 답변을 작성하지 않았어요.</span>}
                        </div>
                      </div>
                    )}

                    {/* Step 4 */}
                    {selQ.upgradedAnswer && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#059669', padding: '2px 8px', borderRadius: 99 }}>Step 4</span>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>선생님 최종 피드백</span>
                        </div>
                        {selQ.finalFeedback ? (
                          <div style={{ background: '#ECFDF5', border: '0.5px solid #6EE7B7', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#065F46', lineHeight: 1.8 }}>
                            {selQ.finalFeedback}
                          </div>
                        ) : (
                          <>
                            <textarea value={feedback[`${selQ.id}_final`] || ''} onChange={e => setFeedback(prev => ({ ...prev, [`${selQ.id}_final`]: e.target.value }))}
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

                    {/* Step 5 — 꼬리질문 */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: getStep(selQ) >= 5 ? '#3B5BDB' : '#6B7280', padding: '2px 8px', borderRadius: 99 }}>Step 5</span>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>꼬리질문</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          <button onClick={() => setShowTailModal(true)}
                            style={{ padding: '4px 10px', background: '#fff', color: '#3B5BDB', border: '0.5px solid #3B5BDB', borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                            + 직접 추가
                          </button>
                          <button onClick={openAiTailModal}
                            style={{ padding: '4px 10px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                            ✨ AI 생성
                          </button>
                        </div>
                      </div>
                      {selQ.tails.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>꼬리질문이 없어요.</div>
                      ) : selQ.tails.map((t: string, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 10px', background: '#F8F7F5', borderRadius: 7, marginBottom: 5, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                          <span style={{ fontSize: 10, fontWeight: 500, color: '#3B5BDB', background: '#EEF2FF', padding: '2px 6px', borderRadius: 99, flexShrink: 0, marginTop: 1 }}>꼬리 {i + 1}</span>
                          {t}
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 꼬리질문 직접 추가 모달 */}
      {showTailModal && (
        <div onClick={() => setShowTailModal(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>꼬리질문 추가</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>학생에게 추가로 물어볼 꼬리질문을 작성해요.</div>
            <textarea value={tailInput} onChange={e => setTailInput(e.target.value)}
              placeholder="꼬리질문을 입력해주세요..." rows={4} autoFocus
              style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.7, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowTailModal(false); setTailInput('') }}
                style={{ flex: 1, height: 42, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
              <button onClick={addTail}
                style={{ flex: 1, height: 42, background: tailInput.trim() ? '#3B5BDB' : '#E5E7EB', color: tailInput.trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: tailInput.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 꼬리질문 모달 */}
      {showAiTailModal && (
        <div onClick={() => setShowAiTailModal(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>✨ AI 꼬리질문 생성</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>AI가 답변 내용을 분석해서 꼬리질문을 만들었어요. 전달할 질문을 선택해주세요.</div>
            {aiTailLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>✨</div>
                AI가 꼬리질문을 생성 중이에요...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {aiTails.map((t, i) => (
                  <div key={i} onClick={() => setSelectedAiTails(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', border: `0.5px solid ${selectedAiTails.includes(i) ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, cursor: 'pointer', background: selectedAiTails.includes(i) ? '#EEF2FF' : '#fff' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${selectedAiTails.includes(i) ? '#3B5BDB' : '#D1D5DB'}`, background: selectedAiTails.includes(i) ? '#3B5BDB' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {selectedAiTails.includes(i) && <span style={{ fontSize: 10, color: '#fff' }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>{t}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAiTailModal(false)}
                style={{ flex: 1, height: 42, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
              <button onClick={deliverAiTails} disabled={selectedAiTails.length === 0 || aiTailLoading}
                style={{ flex: 1, height: 42, background: selectedAiTails.length > 0 ? '#3B5BDB' : '#E5E7EB', color: selectedAiTails.length > 0 ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: selectedAiTails.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                선택한 {selectedAiTails.length}개 전달
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}