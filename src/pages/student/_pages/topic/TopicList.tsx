import { useState } from 'react'

const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 5, display: 'block' }

const GRADES = ['전체', '고1', '고2', '고3']
const SUBJECTS = ['국어', '수학', '영어', '물리', '화학', '생물', '지구과학', '정보', '사회', '역사', '윤리', '경제', '정치', '심리학']
const MAJORS = ['공학계열', '자연과학', '의약계열', '인문사회', '사범교육', '예체능', 'IT/소프트웨어', '경영/경제', '법학', '건축학', '환경공학', '항공우주', '식품영양', '간호학', '약학', '의학', '치의학', '수의학', '농업생명']

const SETECH_DATA: any[] = [
  {
    id: 1, subject: '화학', grade: '고3', major: '자연과학', school: '한국우주공학과', views: 1523,
    activity: '화학II에서의 기초 화학 원리 탐구와 실험적 적용.',
    topics: [
      '화학 실험 과정에서 발생할 수 있는 변수와 오차를 최소화하는 방법을 탐색하고 적용함.',
      '물질의 화학적 반응을 관찰하고 결과를 분석하여 실험 보고서를 작성하며 논리적 사고를 강화함.',
      '화학II 수업에서 원자 구조와 주기율표의 기본 개념을 학습하고 이를 바탕으로 물질의 성질을 예측하는 실험을 수행함.',
    ],
    competency: '비판적 사고력과 문제 해결 능력을 통해 실험 과정에서의 변수 조절 및 데이터 분석 역량을 발휘함.',
  },
]

const INIT_TOPICS = [
  {
    id: 1, grade: '고1', month: '7월', title: '기후변화와 식량 안보',
    content: '기후변화로 인한 농업 생산량 변화를 데이터로 분석하고, 지속가능한 농업 기술 발전 방향을 제시하겠습니다.',
    subject: '지구과학·사회',
    feedback: '좋은 주제예요! 수직농장 기술 쪽으로 구체화해보는 건 어떨까요?',
    feedbackDate: '2025-01-17', revision: '', revisionDate: '',
  },
  {
    id: 2, grade: '고2', month: '1월', title: '인공지능 윤리와 편향성 문제',
    content: '머신러닝 모델의 학습 데이터 편향이 실제 사회적 차별로 이어지는 사례를 분석하겠습니다.',
    subject: '정보·윤리',
    feedback: '', feedbackDate: '', revision: '', revisionDate: '',
  },
]

export default function TopicList() {
  const [topicGrade, setTopicGrade] = useState('전체')
  const [topics, setTopics] = useState(INIT_TOPICS)
  const [selTopic, setSelTopic] = useState<any>(null)
  const [revisionInputs, setRevisionInputs] = useState<Record<number, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState<1 | 2>(1)
  const [filterGrade, setFilterGrade] = useState('전체')
  const [filterMajorInput, setFilterMajorInput] = useState('')
  const [filterMajor, setFilterMajor] = useState('전체')
  const [filterSubjectInput, setFilterSubjectInput] = useState('')
  const [filterSubject, setFilterSubject] = useState('전체')
  const [showMajorDrop, setShowMajorDrop] = useState(false)
  const [showSubjectDrop, setShowSubjectDrop] = useState(false)
  const [selSetech, setSelSetech] = useState<any>(null)
  const [expandedSetech, setExpandedSetech] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newTopic, setNewTopic] = useState({ title: '', subject: '', content: '' })

  const isFilterEmpty = filterGrade === '전체' && filterMajor === '전체' && filterSubject === '전체'
  const filtered = topics.filter(t => topicGrade === '전체' || t.grade === topicGrade)
  const filteredSetech = isFilterEmpty ? [] : SETECH_DATA.filter(s =>
    (filterGrade === '전체' || s.grade === filterGrade) &&
    (filterMajor === '전체' || s.major.includes(filterMajor) || s.school.includes(filterMajor)) &&
    (filterSubject === '전체' || s.subject === filterSubject)
  )
  const filteredMajorOptions = MAJORS.filter(m => filterMajorInput && m.includes(filterMajorInput))
  const filteredSubjectOptions = SUBJECTS.filter(s => !filterSubjectInput || s.includes(filterSubjectInput))

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const sendRevision = (topicId: number) => {
    const text = revisionInputs[topicId] || ''
    if (!text.trim()) return
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const updated = topics.map(t => t.id === topicId ? { ...t, revision: text.trim(), revisionDate: dateStr } : t)
    setTopics(updated)
    setSelTopic(updated.find(t => t.id === topicId))
    setRevisionInputs(prev => ({ ...prev, [topicId]: '' }))
  }

  const deleteTopic = (topicId: number) => {
    if (window.confirm('탐구주제를 삭제할까요?')) {
      setTopics(prev => prev.filter(t => t.id !== topicId))
      if (selTopic?.id === topicId) setSelTopic(null)
    }
  }

  const selectSetech = (s: any) => {
    setSelSetech(s)
    setNewTopic({ title: s.activity, subject: s.subject, content: s.topics.join('\n') })
    setModalStep(2)
  }

  const addTopic = () => {
    if (!newTopic.title.trim() || !newTopic.content.trim()) return
    const now = new Date()
    const t = {
      id: topics.length + 1, grade: '고1', month: `${now.getMonth() + 1}월`,
      title: newTopic.title, content: newTopic.content, subject: newTopic.subject,
      feedback: '', feedbackDate: '', revision: '', revisionDate: '',
    }
    setTopics(prev => [...prev, t])
    closeModal()
  }

  const closeModal = () => {
    setShowModal(false); setModalStep(1); setSelSetech(null)
    setFilterGrade('전체'); setFilterMajor('전체'); setFilterMajorInput('')
    setFilterSubject('전체'); setFilterSubjectInput(''); setExpandedSetech(null)
    setNewTopic({ title: '', subject: '', content: '' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100vh - 90px)', overflow: 'hidden', padding: '20px 24px' }}>

      {/* 상단 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {GRADES.map(g => (
            <div key={g} onClick={() => { setTopicGrade(g); setSelTopic(null) }}
              style={{ padding: '7px 16px', borderRadius: 99, fontSize: 13, cursor: 'pointer', background: topicGrade === g ? '#3B5BDB' : '#fff', color: topicGrade === g ? '#fff' : '#6B7280', border: `0.5px solid ${topicGrade === g ? '#3B5BDB' : '#E5E7EB'}`, fontWeight: topicGrade === g ? 500 : 400 }}>
              {g}
            </div>
          ))}
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ padding: '9px 18px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + 탐구주제 작성
        </button>
      </div>

      {/* 메인 2단 레이아웃 */}
      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>

        {/* 왼쪽 목록 */}
        <div style={{ width: 300, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>탐구주제</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              총 <span style={{ color: '#3B5BDB', fontWeight: 600 }}>{filtered.length}개</span> ·
              피드백 <span style={{ color: '#059669', fontWeight: 600 }}>{filtered.filter(t => t.feedback).length}개</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔬</div>
                탐구주제가 없어요.
              </div>
            ) : filtered.map(topic => (
              <div key={topic.id} onClick={() => setSelTopic(topic)}
                style={{ border: `0.5px solid ${selTopic?.id === topic.id ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 7, cursor: 'pointer', background: selTopic?.id === topic.id ? '#EEF2FF' : '#fff', position: 'relative' }}>
                <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', padding: '1px 7px', borderRadius: 99 }}>{topic.grade} · {topic.month}</span>
                  {topic.feedback && !topic.revision && (
                    <span style={{ fontSize: 10, color: '#fff', background: '#F97316', padding: '1px 7px', borderRadius: 99 }}>💬 피드백</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.5, fontWeight: 500, marginBottom: 4 }}>{topic.title}</div>
                <span style={{ fontSize: 10, color: '#3B5BDB', background: '#EEF2FF', padding: '1px 7px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>{topic.subject}</span>
                <div onClick={e => { e.stopPropagation(); deleteTopic(topic.id) }}
                  style={{ position: 'absolute', top: 8, right: 8, fontSize: 12, color: '#9CA3AF', cursor: 'pointer', lineHeight: 1 }}>✕</div>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽 상세 */}
        <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selTopic ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
              <div style={{ fontSize: 32 }}>🔬</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>탐구주제를 선택해주세요</div>
              <div style={{ fontSize: 12 }}>왼쪽에서 탐구주제를 클릭하면 상세 내용을 볼 수 있어요</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '13px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>{selTopic.title}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>{selTopic.grade} · {selTopic.month}</span>
                  <span style={{ fontSize: 11, color: '#3B5BDB', background: '#EEF2FF', padding: '2px 8px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>{selTopic.subject}</span>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 내가 작성한 내용 - 오른쪽 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>나</div>
                  <div style={{ maxWidth: 400, background: '#F3F4F6', border: '0.5px solid #E5E7EB', borderRadius: '12px 0 12px 12px', padding: '10px 14px', fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>
                    {selTopic.content}
                  </div>
                </div>

                {/* 선생님 피드백 - 왼쪽 */}
                {selTopic.feedback ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>선생님 · {selTopic.feedbackDate}</div>
                    <div style={{ maxWidth: 400, background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: '0 12px 12px 12px', padding: '10px 14px', fontSize: 13, color: '#1E3A8A', lineHeight: 1.6 }}>
                      {selTopic.feedback}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>
                    선생님 피드백을 기다리는 중이에요.
                  </div>
                )}

                {/* 내가 수정한 내용 - 오른쪽 */}
                {selTopic.revision && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>나 · {selTopic.revisionDate}</div>
                    <div style={{ maxWidth: 400, background: '#F3F4F6', border: '0.5px solid #E5E7EB', borderRadius: '12px 0 12px 12px', padding: '10px 14px', fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>
                      {selTopic.revision}
                    </div>
                  </div>
                )}
              </div>

              {/* 입력창 */}
              {selTopic.feedback && (
                <div style={{ padding: '12px 16px', borderTop: '0.5px solid #E5E7EB', flexShrink: 0 }}>
                  <textarea
                    value={revisionInputs[selTopic.id] || ''}
                    onChange={e => setRevisionInputs(prev => ({ ...prev, [selTopic.id]: e.target.value }))}
                    placeholder="피드백을 반영한 수정 내용을 작성해주세요..."
                    rows={3}
                    style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 8, boxSizing: 'border-box' as const }}
                  />
                  <button
                    onClick={() => sendRevision(selTopic.id)}
                    disabled={!(revisionInputs[selTopic.id] || '').trim()}
                    style={{ padding: '8px 18px', background: (revisionInputs[selTopic.id] || '').trim() ? '#3B5BDB' : '#E5E7EB', color: (revisionInputs[selTopic.id] || '').trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: (revisionInputs[selTopic.id] || '').trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                    전달하기
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 모달 */}
      {showModal && (
        <div onClick={closeModal}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: modalStep === 1 ? 920 : 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {modalStep === 2 && <div onClick={() => setModalStep(1)} style={{ cursor: 'pointer', fontSize: 14, color: '#6B7280' }}>←</div>}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>{modalStep === 1 ? '세특 Lite 참고하기' : '탐구주제 작성'}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{modalStep === 1 ? '학년, 학과, 과목을 선택해서 세특 사례를 찾아보세요' : '세특을 참고해서 내 탐구주제를 작성해요'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {[1, 2].map(s => <div key={s} style={{ width: s === modalStep ? 20 : 8, height: 8, borderRadius: 99, background: s === modalStep ? '#3B5BDB' : s < modalStep ? '#059669' : '#E5E7EB', transition: 'all 0.2s' }} />)}
                </div>
                <div onClick={closeModal} style={{ cursor: 'pointer', color: '#6B7280', fontSize: 18 }}>✕</div>
              </div>
            </div>

            {modalStep === 1 && (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: 260, flexShrink: 0, borderRight: '0.5px solid #E5E7EB', display: 'flex', flexDirection: 'column', background: '#FAFAFA', overflow: 'hidden' }}>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 8 }}>학년</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {GRADES.map(g => (
                          <div key={g} onClick={() => { setFilterGrade(g); setExpandedSetech(null) }}
                            style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, cursor: 'pointer', background: filterGrade === g ? '#3B5BDB' : '#fff', color: filterGrade === g ? '#fff' : '#6B7280', border: `0.5px solid ${filterGrade === g ? '#3B5BDB' : '#E5E7EB'}` }}>
                            {g}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 8 }}>지원학과 및 계열</div>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9CA3AF' }}>🔍</span>
                        <input value={filterMajorInput}
                          onChange={e => { setFilterMajorInput(e.target.value); setFilterMajor(e.target.value || '전체'); setShowMajorDrop(true) }}
                          onFocus={() => setShowMajorDrop(true)}
                          onBlur={() => setTimeout(() => setShowMajorDrop(false), 150)}
                          placeholder="학과 또는 계열 검색"
                          style={{ width: '100%', height: 34, border: '0.5px solid #E5E7EB', borderRadius: 7, padding: '0 8px 0 26px', fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' as const }} />
                        {showMajorDrop && filteredMajorOptions.length > 0 && (
                          <div style={{ position: 'absolute', top: 38, left: 0, right: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 8, zIndex: 10, maxHeight: 150, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            {filteredMajorOptions.map(m => (
                              <div key={m} onClick={() => { setFilterMajorInput(m); setFilterMajor(m); setShowMajorDrop(false); setExpandedSetech(null) }}
                                style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#1a1a1a' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#F8F7F5')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                {m}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {filterMajor !== '전체' && (
                        <div style={{ marginTop: 6 }}>
                          <span style={{ fontSize: 11, background: '#EEF2FF', color: '#3B5BDB', padding: '3px 8px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {filterMajor}<span onClick={() => { setFilterMajor('전체'); setFilterMajorInput('') }} style={{ cursor: 'pointer' }}>✕</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 8 }}>과목</div>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9CA3AF' }}>🔍</span>
                        <input value={filterSubjectInput}
                          onChange={e => { setFilterSubjectInput(e.target.value); setFilterSubject(e.target.value || '전체'); setShowSubjectDrop(true) }}
                          onFocus={() => setShowSubjectDrop(true)}
                          onBlur={() => setTimeout(() => setShowSubjectDrop(false), 150)}
                          placeholder="과목 검색 (예: 화학)"
                          style={{ width: '100%', height: 34, border: '0.5px solid #E5E7EB', borderRadius: 7, padding: '0 8px 0 26px', fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' as const }} />
                        {showSubjectDrop && (
                          <div style={{ position: 'absolute', top: 38, left: 0, right: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 8, zIndex: 10, maxHeight: 150, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            {filteredSubjectOptions.map(s => (
                              <div key={s} onClick={() => { setFilterSubjectInput(s); setFilterSubject(s); setShowSubjectDrop(false); setExpandedSetech(null) }}
                                style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#1a1a1a' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#F8F7F5')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                {s}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {filterSubject !== '전체' && (
                        <div style={{ marginTop: 6 }}>
                          <span style={{ fontSize: 11, background: '#EEF2FF', color: '#3B5BDB', padding: '3px 8px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {filterSubject}<span onClick={() => { setFilterSubject('전체'); setFilterSubjectInput('') }} style={{ cursor: 'pointer' }}>✕</span>
                          </span>
                        </div>
                      )}
                    </div>
                    {!isFilterEmpty && (
                      <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>총 <span style={{ color: '#3B5BDB', fontWeight: 600 }}>{filteredSetech.length}개</span></span>
                        <span onClick={() => { setFilterGrade('전체'); setFilterMajor('전체'); setFilterMajorInput(''); setFilterSubject('전체'); setFilterSubjectInput(''); setExpandedSetech(null) }}
                          style={{ color: '#6B7280', cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}>초기화</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: '0.5px solid #E5E7EB', flexShrink: 0 }}>
                    <button onClick={() => setModalStep(2)}
                      style={{ width: '100%', height: 36, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      세특 없이 직접 작성
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                  {isFilterEmpty ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
                      <div style={{ fontSize: 40, marginBottom: 14 }}>🔬</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280', marginBottom: 8 }}>세특 사례를 선택해보세요</div>
                      <div style={{ fontSize: 12, lineHeight: 1.8 }}>왼쪽에서 학년, 학과, 과목을 선택하면<br />관련 세특 사례를 볼 수 있어요</div>
                    </div>
                  ) : filteredSetech.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                      <div style={{ fontSize: 13 }}>해당 조건의 세특 사례가 없어요.</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>필터를 조정해보세요.</div>
                    </div>
                  ) : filteredSetech.map((s: any) => (
                    <div key={s.id} style={{ border: `0.5px solid ${expandedSetech === s.id ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 12, marginBottom: 10, overflow: 'hidden', background: expandedSetech === s.id ? '#FAFCFF' : '#fff' }}>
                      <div onClick={() => setExpandedSetech(expandedSetech === s.id ? null : s.id)}
                        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#3B5BDB', background: '#EEF2FF', padding: '2px 8px', borderRadius: 99 }}>{s.subject}</span>
                            <span style={{ fontSize: 11, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: 99 }}>{s.major}</span>
                            <span style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>{s.grade}</span>
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{s.school}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.5 }}>{s.activity}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>👁 {s.views?.toLocaleString()}</span>
                          <span style={{ fontSize: 14, color: '#9CA3AF', display: 'inline-block', transform: expandedSetech === s.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>∨</span>
                        </div>
                      </div>
                      {expandedSetech === s.id && (
                        <div style={{ padding: '0 16px 16px', borderTop: '0.5px solid #E5E7EB' }}>
                          {[{ label: '세특 활동', text: s.activity, id: `activity-${s.id}` }, { label: '탐구 역량', text: s.competency, id: `competency-${s.id}` }].map(item => (
                            <div key={item.id} style={{ marginTop: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>{item.label}</div>
                                <button onClick={() => copyText(item.text, item.id)} style={{ fontSize: 11, color: copiedId === item.id ? '#059669' : '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {copiedId === item.id ? '✓ 복사됨' : '📋 복사'}
                                </button>
                              </div>
                              <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{item.text}</div>
                            </div>
                          ))}
                          <div style={{ marginTop: 12, marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>세특 탐구</div>
                              <button onClick={() => copyText(s.topics.join('\n'), `topics-${s.id}`)} style={{ fontSize: 11, color: copiedId === `topics-${s.id}` ? '#059669' : '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                {copiedId === `topics-${s.id}` ? '✓ 복사됨' : '📋 복사'}
                              </button>
                            </div>
                            <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px' }}>
                              {s.topics.map((t: string, i: number) => (
                                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: i < s.topics.length - 1 ? 6 : 0 }}>
                                  <span style={{ color: '#3B5BDB', flexShrink: 0, fontSize: 12 }}>•</span>
                                  <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{t}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <button onClick={() => selectSetech(s)} style={{ width: '100%', height: 40, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                            이걸로 탐구주제 작성하기 →
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modalStep === 2 && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {selSetech && (
                  <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, background: '#3B5BDB', color: '#fff', padding: '2px 8px', borderRadius: 99, fontWeight: 500, flexShrink: 0 }}>참고</span>
                    <span style={{ fontSize: 12, color: '#1E3A8A' }}>{selSetech.subject} · {selSetech.major} · {selSetech.school}</span>
                    <button onClick={() => { setSelSetech(null); setNewTopic({ title: '', subject: '', content: '' }) }}
                      style={{ marginLeft: 'auto', fontSize: 11, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>제거</button>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={LABEL}>탐구 제목 *</label>
                    <input value={newTopic.title} onChange={e => setNewTopic(p => ({ ...p, title: e.target.value }))}
                      placeholder="예: 기후변화가 농업 생산량에 미치는 영향 분석"
                      style={{ width: '100%', height: 42, border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={LABEL}>연계 과목</label>
                    <input value={newTopic.subject} onChange={e => setNewTopic(p => ({ ...p, subject: e.target.value }))}
                      placeholder="예: 지구과학·사회"
                      style={{ width: '100%', height: 42, border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <label style={{ ...LABEL, marginBottom: 0 }}>탐구 내용 *</label>
                      {selSetech && <span style={{ fontSize: 11, color: '#059669' }}>✓ 세특 내용이 자동으로 채워졌어요</span>}
                    </div>
                    <textarea value={newTopic.content} onChange={e => setNewTopic(p => ({ ...p, content: e.target.value }))}
                      placeholder="어떤 내용을 탐구하고 싶은지 자세히 작성해주세요" rows={6}
                      style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.7 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button onClick={closeModal} style={{ flex: 1, height: 44, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                  <button onClick={addTopic} disabled={!newTopic.title.trim() || !newTopic.content.trim()}
                    style={{ flex: 1, height: 44, background: newTopic.title && newTopic.content ? '#3B5BDB' : '#E5E7EB', color: newTopic.title && newTopic.content ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: newTopic.title && newTopic.content ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                    작성하기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}