import { useState } from 'react'

type LeftTab = 'upload' | 'answers'

const MOCK_QUESTIONS = [
  {
    id: 1, text: '최근 관심 있는 IT 기술이나 이슈가 있다면 설명해 주세요.', tag: '진로탐색', answered: true, step: 3,
    purpose: ['지원자가 자기 주도적 탐색과 고민을 바탕으로 지원했는지 확인', '장기적인 목표와 학과 선택의 연계성 확인'],
    answer: '최근 가장 관심 있는 IT 기술은 생성형 AI입니다. 파이썬으로 챗봇도 구현해 봤습니다.',
    date: '2025-03-15',
    prevFeedback: '답변이 좋아요! 더 구체적인 프로젝트 경험을 언급하면 설득력이 높아질 것 같아요.',
    upgradedAnswer: 'GPT 계열 모델에 관심이 많습니다. OpenAI API로 챗봇을 구현하며 프롬프트 엔지니어링의 중요성을 깨달았습니다.',
    finalFeedback: '', tails: ['생성형 AI의 윤리적 문제에 대해 어떻게 생각하나요?'],
  },
  {
    id: 2, text: '고등학교 생활 중 가장 의미 있었던 탐구 활동은 무엇인가요?', tag: '학교생활', answered: true, step: 2,
    purpose: ['학생의 자기주도적 학습 역량 확인'],
    answer: '지구과학 시간에 기후변화와 식량 안보의 관계를 탐구했습니다.',
    date: '2025-03-16', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [],
  },
  {
    id: 3, text: '지원 학과를 선택한 구체적인 계기가 있나요?', tag: '지원동기', answered: false, step: 0,
    purpose: ['지원 동기의 진정성 확인'], answer: '', date: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [],
  },
  {
    id: 4, text: '본인의 장점과 단점을 솔직하게 말해보세요.', tag: '자기소개', answered: false, step: 0,
    purpose: ['자기 인식 능력 확인'], answer: '', date: '', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [],
  },
  {
    id: 5, text: '독서 활동 중 가장 인상 깊었던 책과 그 이유를 설명해주세요.', tag: '독서활동', answered: true, step: 2,
    purpose: ['독서 활동의 깊이와 사고력 확인'],
    answer: '사피엔스를 읽고 인류 문명의 발전이 협업에서 비롯됐다는 인사이트를 얻었습니다.',
    date: '2025-03-18', prevFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [],
  },
]

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']
const TOTAL_PAGES = 28
const PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1)

const AI_TAIL_SUGGESTIONS = [
  '생성형 AI의 윤리적 문제에 대해 구체적인 사례를 들어 설명해주세요.',
  '직접 구현한 챗봇에서 가장 어려웠던 기술적 문제는 무엇이었나요?',
  'AI 기술이 발전하면 어떤 직업이 가장 큰 영향을 받을 것 같나요?',
]

export default function ExpectTab({ student }: { student: any }) {
  const [leftTab, setLeftTab] = useState<LeftTab>('upload')
  const [hasFile] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState(MOCK_QUESTIONS)
  const [selQ, setSelQ] = useState<any>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [previewPage, setPreviewPage] = useState<number | null>(null)

  // 꼬리질문 직접 추가 모달
  const [showTailModal, setShowTailModal] = useState(false)
  const [tailInput, setTailInput] = useState('')

  // AI 꼬리질문 모달
  const [showAiTailModal, setShowAiTailModal] = useState(false)
  const [aiTailLoading, setAiTailLoading] = useState(false)
  const [aiTails, setAiTails] = useState<string[]>([])
  const [selectedAiTails, setSelectedAiTails] = useState<number[]>([])

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => { setGenerating(false); setLeftTab('answers') }, 1500)
  }

  const sendFeedback = (type: 'first' | 'final') => {
    if (!selQ) return
    const key = type === 'first' ? String(selQ.id) : `${selQ.id}_final`
    const val = feedback[key] || ''
    if (!val.trim()) return
    if (type === 'first') {
      const updated = questions.map(q => q.id === selQ.id ? { ...q, prevFeedback: val, step: Math.max(q.step, 3) } : q)
      setQuestions(updated)
      setSelQ({ ...selQ, prevFeedback: val, step: Math.max(selQ.step, 3) })
    } else {
      const updated = questions.map(q => q.id === selQ.id ? { ...q, finalFeedback: val, step: 5 } : q)
      setQuestions(updated)
      setSelQ({ ...selQ, finalFeedback: val, step: 5 })
    }
    setFeedback(prev => ({ ...prev, [key]: '' }))
  }

  const addTail = () => {
    if (!tailInput.trim() || !selQ) return
    const updated = questions.map(q => q.id === selQ.id ? { ...q, tails: [...q.tails, tailInput.trim()] } : q)
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
    const updated = questions.map(q => q.id === selQ.id ? { ...q, tails: [...q.tails, ...newTails] } : q)
    setQuestions(updated)
    setSelQ({ ...selQ, tails: [...selQ.tails, ...newTails] })
    setShowAiTailModal(false)
    setAiTails([]); setSelectedAiTails([])
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>

      {/* 왼쪽 */}
      <div style={{ width: 360, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
          {[{ key: 'upload', label: '생기부 확인' }, { key: 'answers', label: '답변 피드백' }].map(t => (
            <div key={t.key} onClick={() => setLeftTab(t.key as LeftTab)}
              style={{ flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: leftTab === t.key ? 600 : 400, color: leftTab === t.key ? '#3B5BDB' : '#6B7280', borderBottom: `2px solid ${leftTab === t.key ? '#3B5BDB' : 'transparent'}`, cursor: 'pointer' }}>
              {t.label}
            </div>
          ))}
        </div>

        {/* 생기부 확인 */}
        {leftTab === 'upload' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {!hasFile ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280', marginBottom: 6 }}>생기부 미업로드</div>
                <div style={{ fontSize: 12 }}>학생이 아직 생기부를 업로드하지 않았어요.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 8 }}>업로드된 생기부</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: '#F8F7F5', border: '0.5px solid #E5E7EB', borderRadius: 9, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, background: '#EF4444', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>PDF</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{student.name}_생기부_2025.pdf</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>2.3MB · 2025-03-15 업로드 · {TOTAL_PAGES}페이지</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #6EE7B7' }}>완료</span>
                </div>
                <button onClick={handleGenerate} disabled={generating}
                  style={{ width: '100%', padding: '11px 0', background: generating ? '#BAC8FF' : '#3B5BDB', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: 14 }}>
                  {generating ? '질문 생성 중...' : '✨ AI 예상질문 생성 + 학생에게 전달'}
                </button>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 8 }}>페이지 미리보기</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {PAGES.map(p => (
                    <div key={p} onClick={() => setPreviewPage(p)}
                      style={{ background: '#F8F7F5', border: '0.5px solid #E5E7EB', borderRadius: 7, aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, fontSize: 11, color: '#9CA3AF', cursor: 'pointer' }}>
                      <div style={{ fontSize: 18 }}>📄</div>
                      <div>{p}p</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 답변 피드백 */}
        {leftTab === 'answers' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
              총 <span style={{ color: '#3B5BDB', fontWeight: 600 }}>{questions.length}개</span> 질문 ·
              답변완료 <span style={{ color: '#059669', fontWeight: 600 }}>{questions.filter(q => q.answered).length}개</span>
            </div>
            {questions.map((q, i) => (
              <div key={q.id} onClick={() => setSelQ(q)}
                style={{ border: `0.5px solid ${selQ?.id === q.id ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 7, cursor: 'pointer', background: selQ?.id === q.id ? '#EEF2FF' : '#fff' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#3B5BDB', background: '#EEF2FF', padding: '1px 7px', borderRadius: 99, display: 'inline-block', marginBottom: 5 }}>질문 {i + 1}</span>
                <div style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.5, fontWeight: 500, marginBottom: 6 }}>{q.text}</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <span style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 99 }}>{q.tag}</span>
                  {q.answered
                    ? <span style={{ fontSize: 10, color: '#059669', background: '#ECFDF5', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #6EE7B7' }}>답변완료 · {q.step}/5단계</span>
                    : <span style={{ fontSize: 10, color: '#D97706', background: '#FFF3E8', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #FDBA74' }}>미답변</span>
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 오른쪽 */}
      <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selQ ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
            <div style={{ fontSize: 32 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>질문을 선택해주세요</div>
            <div style={{ fontSize: 12 }}>왼쪽에서 질문을 클릭하면 상세 내용을 볼 수 있어요</div>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div style={{ padding: '13px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>질문 {questions.findIndex(q => q.id === selQ.id) + 1}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{selQ.tag}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: selQ.answered ? '#ECFDF5' : '#FFF3E8', color: selQ.answered ? '#059669' : '#D97706', border: `0.5px solid ${selQ.answered ? '#6EE7B7' : '#FDBA74'}` }}>
                  {selQ.answered ? '답변완료' : '미답변'}
                </span>
              </div>
              <div style={{ display: 'flex' }}>
                {STEP_LABELS.map((label, i) => {
                  const stepNum = i + 1
                  const isDone = stepNum < selQ.step
                  const isOn = stepNum === selQ.step
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
                <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 5 }}>예상 질문</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.6 }}>{selQ.text}</div>
              </div>

              {/* 질문 목적 */}
              <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#3B5BDB', marginBottom: 6 }}>질문 목적</div>
                <ul style={{ paddingLeft: 14 }}>
                  {selQ.purpose.map((p: string, i: number) => (
                    <li key={i} style={{ fontSize: 12, color: '#1E3A8A', lineHeight: 1.7 }}>{p}</li>
                  ))}
                </ul>
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
                      {selQ.date && <span style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 'auto' }}>{selQ.date}</span>}
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
                            placeholder="학생의 첫 답변에 대한 피드백을 작성해주세요..." rows={3}
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
                  {selQ.step >= 3 && (
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
                  {selQ.step >= 4 && (
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
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: selQ.step >= 5 ? '#3B5BDB' : '#6B7280', padding: '2px 8px', borderRadius: 99 }}>Step 5</span>
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

      {/* 페이지 미리보기 모달 */}
      {previewPage !== null && (
        <div onClick={() => setPreviewPage(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: 600, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{previewPage}페이지</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setPreviewPage(p => Math.max(1, (p || 1) - 1))} disabled={previewPage === 1}
                  style={{ padding: '5px 12px', background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 7, fontSize: 12, cursor: previewPage === 1 ? 'not-allowed' : 'pointer', color: previewPage === 1 ? '#D1D5DB' : '#374151' }}>← 이전</button>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{previewPage} / {TOTAL_PAGES}</span>
                <button onClick={() => setPreviewPage(p => Math.min(TOTAL_PAGES, (p || 1) + 1))} disabled={previewPage === TOTAL_PAGES}
                  style={{ padding: '5px 12px', background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 7, fontSize: 12, cursor: previewPage === TOTAL_PAGES ? 'not-allowed' : 'pointer', color: previewPage === TOTAL_PAGES ? '#D1D5DB' : '#374151' }}>다음 →</button>
                <button onClick={() => setPreviewPage(null)}
                  style={{ width: 28, height: 28, background: '#F3F4F6', border: 'none', borderRadius: 7, cursor: 'pointer', color: '#6B7280', fontSize: 14 }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', aspectRatio: '3/4', background: '#F8F7F5', border: '0.5px solid #E5E7EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#9CA3AF' }}>
                <div style={{ fontSize: 48 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>{previewPage}페이지</div>
                <div style={{ fontSize: 12 }}>실제 서비스에서 PDF 이미지가 표시돼요</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}