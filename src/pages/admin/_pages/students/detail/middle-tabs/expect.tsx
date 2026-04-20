import { useState } from 'react'

const THEME = {
  accent: '#059669',
  accentDark: '#065F46',
  accentBg: '#ECFDF5',
  accentBorder: '#6EE7B7',
  accentShadow: 'rgba(16, 185, 129, 0.15)',
  gradient: 'linear-gradient(135deg, #065F46, #10B981)',
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

const SECTIONS = [
  { key: 'selfStudy', label: '📚 자기주도학습 과정' },
  { key: 'reason', label: '🏫 지원동기 (건학이념 연계)' },
  { key: 'activity', label: '🎯 꿈과 끼를 살리기 위한 활동계획' },
  { key: 'career', label: '🚀 진로계획' },
  { key: 'character', label: '🤝 인성' },
]

const INITIAL_ESSAYS = [
  {
    id: 1,
    school: '인천하늘고',
    content: {
      selfStudy: '중학교 3년 동안 매일 아침 30분씩 독서하며 자기주도학습 습관을 길렀습니다. 수업 시간에 이해가 안 되는 부분은 밤에 스스로 찾아보며 해결했고, 주말에는 일주일 동안 배운 내용을 정리하는 복습 노트를 만들었습니다.',
      reason: '인천하늘고의 자기주도학습 전형이 제 학습 방식과 잘 맞는다고 생각했습니다. 또한 자연친화적 환경에서 공부하며 과학 탐구 활동을 할 수 있다는 점이 매력적이었습니다.',
      activity: '입학 후 과학 탐구 동아리를 만들어 친구들과 함께 기후변화 관련 연구 활동을 하고 싶습니다. 특히 우리 학교 주변 습지 생태계를 관찰하며 환경 변화를 기록하는 장기 프로젝트를 진행하고 싶습니다.',
      career: '과학자가 되어 기후변화 문제를 해결하는 연구를 하고 싶습니다. 특히 탄소 포집 기술 개발에 관심이 많아 관련 분야 전문가가 되는 것이 목표입니다.',
      character: '학급 반장으로서 갈등을 조율하고 모두가 함께할 수 있는 환경을 만들었습니다. 소외되는 친구가 없도록 자리 배치를 제안하고, 모둠 활동 시 모두의 의견을 듣는 규칙을 정했습니다.',
    },
    sectionFeedbacks: {
      selfStudy: [
        { text: '초안 잘 읽었어요! 구체적인 사례가 부족해요. 복습 노트 예시 하나를 추가하면 좋겠어요.', date: '2025.03.15', round: 1 },
        { text: '수정해주신 부분이 많이 구체화되었네요! 아주 좋아요. 한 가지만 더, 본인이 가장 어려웠던 과목 사례를 추가해보세요.', date: '2025.03.22', round: 2 },
      ],
      reason: [],
      activity: [
        { text: '동아리 활동 계획이 구체적이어서 좋아요!', date: '2025.03.15', round: 1 },
      ],
      career: [],
      character: [
        { text: '리더십 경험이 잘 드러났어요!', date: '2025.03.15', round: 1 },
      ],
    },
    createdAt: '2025.03.15',
    lastUpdated: '2025.03.22',
    version: 2,
    questionsGenerated: true,
  },
  {
    id: 2,
    school: '대원외고',
    content: {
      selfStudy: '영어 원서 읽기를 꾸준히 했습니다.',
      reason: '국제적인 감각을 키우고 싶어서 지원합니다.',
      activity: '', career: '', character: '',
    },
    sectionFeedbacks: {
      selfStudy: [], reason: [], activity: [], career: [], character: [],
    },
    createdAt: '2025.04.02',
    lastUpdated: '2025.04.02',
    version: 1,
    questionsGenerated: false,
  },
]

const INITIAL_QUESTIONS: Record<string, any[]> = {
  '인천하늘고': [
    {
      id: 1,
      text: '인천하늘고에 지원한 구체적인 이유가 무엇인가요?',
      tag: '지원동기',
      answered: true,
      purpose: ['지원 동기의 진정성 확인', '학교에 대한 이해도 파악'],
      answer: '인천하늘고의 자기주도학습 전형이 제 학습 방식과 잘 맞아서 지원했습니다. 스스로 계획하고 공부하는 것을 좋아하는데 이 학교 시스템이 저와 잘 맞을 것 같았습니다.',
      teacherFeedback: '좋은 답변이에요! 구체적인 경험을 더 추가해보세요.',
      upgradedAnswer: '인천하늘고의 자기주도학습 전형이 제 학습 방식과 잘 맞아서 지원했습니다. 중학교 3년 동안 매일 복습 노트를 만들며 스스로 학습하는 습관을 길러왔고, 학교 홈페이지에서 본 심화 프로젝트 수업이 제가 추구하는 학습 방향과 일치했습니다.',
      finalFeedback: '',
      tails: [],
    },
    {
      id: 2,
      text: '스스로 학습계획을 세우고 실천한 경험을 말해보세요.',
      tag: '자기주도학습',
      answered: true,
      purpose: ['자기주도학습 능력 확인'],
      answer: '저는 매일 복습 노트를 작성했습니다.',
      teacherFeedback: '',
      upgradedAnswer: '',
      finalFeedback: '',
      tails: [],
    },
    {
      id: 3,
      text: '고등학교 입학 후 가장 하고 싶은 활동은 무엇인가요?',
      tag: '활동계획',
      answered: false,
      purpose: ['입학 후 계획의 구체성 확인'],
      answer: '',
      teacherFeedback: '',
      upgradedAnswer: '',
      finalFeedback: '',
      tails: [],
    },
  ],
}

const AI_TAIL_SUGGESTIONS = [
  '그 경험에서 가장 어려웠던 점은 무엇이었나요?',
  '만약 다시 같은 상황이 온다면 어떻게 다르게 행동하시겠어요?',
  '이 활동이 본인의 진로 선택에 어떤 영향을 미쳤나요?',
]

export default function MiddleExpectTab({ student }: { student: any }) {
  const [activeTab, setActiveTab] = useState<'essay' | 'questions'>('essay')

  const [essays, setEssays] = useState(INITIAL_ESSAYS)
  const [selEssay, setSelEssay] = useState<any>(INITIAL_ESSAYS[0])

  const [questionsBySchool, setQuestionsBySchool] = useState(INITIAL_QUESTIONS)
  const [selSchoolFilter, setSelSchoolFilter] = useState<string>('인천하늘고')
  const [selQ, setSelQ] = useState<any>(null)

  const [newSectionFbs, setNewSectionFbs] = useState<Record<string, string>>({})
  const [teacherFbText, setTeacherFbText] = useState('')
  const [finalFbText, setFinalFbText] = useState('')

  const [showAiTailModal, setShowAiTailModal] = useState(false)
  const [aiTailLoading, setAiTailLoading] = useState(false)
  const [newTailText, setNewTailText] = useState('')

  const [editingSection, setEditingSection] = useState<{ key: string, round: number } | null>(null)
  const [editingText, setEditingText] = useState('')

  const countChars = (content: any) =>
    Object.values(content).join('').replace(/\s/g, '').length

  const getStep = (q: any) => {
    if (!q.answered) return 0
    if (!q.teacherFeedback) return 1
    if (!q.upgradedAnswer) return 2
    if (!q.finalFeedback) return 3
    return 4
  }

  const currentQuestions = questionsBySchool[selSchoolFilter] || []

  const selectEssay = (e: any) => {
    setSelEssay({ ...e })
    setNewSectionFbs({})
    setEditingSection(null)
  }

  const selectQ = (q: any) => {
    setSelQ({ ...q })
    setTeacherFbText(q.teacherFeedback || '')
    setFinalFbText(q.finalFeedback || '')
  }

  const addSectionFeedback = (key: string) => {
    const text = newSectionFbs[key] || ''
    if (!text.trim() || !selEssay) return
    const currentFbs = selEssay.sectionFeedbacks?.[key] || []
    const nextRound = currentFbs.length + 1
    const newFb = {
      text,
      date: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').slice(0, -1),
      round: nextRound,
    }
    const updatedSectionFbs = {
      ...selEssay.sectionFeedbacks,
      [key]: [...currentFbs, newFb],
    }
    const next = essays.map(e =>
      e.id === selEssay.id ? { ...e, sectionFeedbacks: updatedSectionFbs } : e
    )
    setEssays(next)
    setSelEssay({ ...selEssay, sectionFeedbacks: updatedSectionFbs })
    setNewSectionFbs(prev => ({ ...prev, [key]: '' }))
  }

  const updateSectionFeedback = (key: string, round: number) => {
    if (!editingText.trim() || !selEssay) return
    const currentFbs = selEssay.sectionFeedbacks?.[key] || []
    const updatedFbs = currentFbs.map((f: any) =>
      f.round === round ? { ...f, text: editingText, date: f.date + ' (수정)' } : f
    )
    const updatedSectionFbs = { ...selEssay.sectionFeedbacks, [key]: updatedFbs }
    const next = essays.map(e => e.id === selEssay.id ? { ...e, sectionFeedbacks: updatedSectionFbs } : e)
    setEssays(next)
    setSelEssay({ ...selEssay, sectionFeedbacks: updatedSectionFbs })
    setEditingSection(null)
    setEditingText('')
  }

  const deleteSectionFeedback = (key: string, round: number) => {
    if (!selEssay) return
    const currentFbs = selEssay.sectionFeedbacks?.[key] || []
    const updatedFbs = currentFbs.filter((f: any) => f.round !== round)
    const updatedSectionFbs = { ...selEssay.sectionFeedbacks, [key]: updatedFbs }
    const next = essays.map(e => e.id === selEssay.id ? { ...e, sectionFeedbacks: updatedSectionFbs } : e)
    setEssays(next)
    setSelEssay({ ...selEssay, sectionFeedbacks: updatedSectionFbs })
  }

  const generateQuestions = (essay: any) => {
    const generated = [
      { id: 1, text: `${essay.school}에 지원한 구체적인 이유가 무엇인가요?`, tag: '지원동기', answered: false, purpose: ['지원 동기의 진정성 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 2, text: '스스로 학습계획을 세우고 실천한 경험을 말해보세요.', tag: '자기주도학습', answered: false, purpose: ['자기주도학습 능력 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 3, text: '고등학교 입학 후 가장 하고 싶은 활동은 무엇인가요?', tag: '활동계획', answered: false, purpose: ['입학 후 계획의 구체성 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 4, text: '졸업 후 어떤 진로를 꿈꾸고 있나요?', tag: '진로계획', answered: false, purpose: ['진로에 대한 구체적인 고민 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 5, text: '배려나 나눔을 실천한 경험을 구체적으로 말해보세요.', tag: '인성', answered: false, purpose: ['인성 역량 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    ]
    const next = essays.map(e => e.id === essay.id ? { ...e, questionsGenerated: true } : e)
    setEssays(next)
    setSelEssay({ ...essay, questionsGenerated: true })
    setQuestionsBySchool(prev => ({ ...prev, [essay.school]: generated }))
    setSelSchoolFilter(essay.school)
    setSelQ(null)
    setActiveTab('questions')
  }

  const sendTeacherFeedback = () => {
    if (!teacherFbText.trim() || !selQ) return
    const updated = (questionsBySchool[selSchoolFilter] || []).map(q =>
      q.id === selQ.id ? { ...q, teacherFeedback: teacherFbText } : q
    )
    setQuestionsBySchool(prev => ({ ...prev, [selSchoolFilter]: updated }))
    setSelQ({ ...selQ, teacherFeedback: teacherFbText })
  }

  const sendFinalFeedback = () => {
    if (!finalFbText.trim() || !selQ) return
    const updated = (questionsBySchool[selSchoolFilter] || []).map(q =>
      q.id === selQ.id ? { ...q, finalFeedback: finalFbText } : q
    )
    setQuestionsBySchool(prev => ({ ...prev, [selSchoolFilter]: updated }))
    setSelQ({ ...selQ, finalFeedback: finalFbText })
  }

  const addTail = (text: string) => {
    if (!text.trim() || !selQ) return
    const updated = (questionsBySchool[selSchoolFilter] || []).map(q =>
      q.id === selQ.id ? { ...q, tails: [...(q.tails || []), text] } : q
    )
    setQuestionsBySchool(prev => ({ ...prev, [selSchoolFilter]: updated }))
    setSelQ({ ...selQ, tails: [...(selQ.tails || []), text] })
    setNewTailText('')
  }

  const openAiTailModal = () => {
    setShowAiTailModal(true)
    setAiTailLoading(true)
    setTimeout(() => setAiTailLoading(false), 1200)
  }

  const removeTail = (idx: number) => {
    if (!selQ) return
    const next = [...(selQ.tails || [])].filter((_, i) => i !== idx)
    const updated = (questionsBySchool[selSchoolFilter] || []).map(q =>
      q.id === selQ.id ? { ...q, tails: next } : q
    )
    setQuestionsBySchool(prev => ({ ...prev, [selSchoolFilter]: updated }))
    setSelQ({ ...selQ, tails: next })
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

      <div className="w-[340px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">

        <div className="flex border-b border-line flex-shrink-0">
          {[{ key: 'essay', label: '📄 자기소개서' }, { key: 'questions', label: '💬 예상질문' }].map(t => {
            const isActive = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className="flex-1 py-3 text-center text-[13px] font-bold transition-all border-b-2"
                style={{
                  color: isActive ? THEME.accentDark : '#9CA3AF',
                  borderColor: isActive ? THEME.accent : 'transparent',
                  background: isActive ? THEME.accentBg : 'transparent',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'essay' && (
          <>
            <div className="px-4 py-2.5 border-b border-line flex-shrink-0">
              <div className="text-[12px] font-medium text-ink-secondary">
                총 <span className="font-extrabold" style={{ color: THEME.accent }}>{essays.length}개</span> 학교
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {essays.map(e => {
                const isSelected = selEssay?.id === e.id
                const hasContent = !!e.content.selfStudy
                const totalFbCount = Object.values(e.sectionFeedbacks || {}).reduce((a: number, v: any) => a + (v?.length || 0), 0)

                return (
                  <button
                    key={e.id}
                    onClick={() => selectEssay(e)}
                    className="w-full rounded-xl px-3.5 py-3 mb-1.5 text-left transition-all"
                    style={{
                      border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                      background: isSelected ? THEME.accentBg : '#fff',
                      boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-base">🏫</span>
                      <div
                        className="text-[13.5px] font-extrabold tracking-tight flex-1"
                        style={{ color: isSelected ? THEME.accentDark : '#1a1a1a' }}
                      >
                        {e.school}
                      </div>
                      {e.version > 1 && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: THEME.accent, background: THEME.accentBg }}
                        >
                          v{e.version}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-medium text-ink-muted mb-1.5">
                      📅 최근수정 {e.lastUpdated}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {hasContent ? (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            color: THEME.accentDark,
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}60`,
                          }}
                        >
                          ✓ 작성 · {countChars(e.content)}자
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ⏳ 미작성
                        </span>
                      )}
                      {totalFbCount > 0 && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          💬 피드백 {totalFbCount}
                        </span>
                      )}
                      {e.questionsGenerated && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                          ✨ 질문완료
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {activeTab === 'questions' && (
          <>
            <div className="px-3 py-2.5 border-b border-line flex-shrink-0">
              {Object.keys(questionsBySchool).length === 0 ? (
                <div className="text-[11px] font-medium text-ink-muted">아직 생성된 예상질문이 없어요.</div>
              ) : (
                <div className="flex gap-1.5 flex-wrap">
                  {Object.keys(questionsBySchool).map(school => {
                    const isActive = selSchoolFilter === school
                    return (
                      <button
                        key={school}
                        onClick={() => { setSelSchoolFilter(school); setSelQ(null) }}
                        className="px-3 py-1 rounded-full text-[11px] font-bold border transition-all"
                        style={{
                          borderColor: isActive ? THEME.accent : '#E5E7EB',
                          background: isActive ? THEME.accentBg : '#fff',
                          color: isActive ? THEME.accentDark : '#6B7280',
                          boxShadow: isActive ? `0 2px 6px ${THEME.accentShadow}` : 'none',
                        }}
                      >
                        🏫 {school}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-b border-line flex-shrink-0">
              <div className="text-[12px] font-medium text-ink-secondary">
                총 <span className="font-extrabold" style={{ color: THEME.accent }}>{currentQuestions.length}개</span> ·
                답변 <span className="font-extrabold" style={{ color: THEME.accent }}>{currentQuestions.filter(q => q.answered).length}개</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {currentQuestions.length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  <div className="text-3xl mb-2">💬</div>
                  <div className="font-medium">예상질문이 없어요.</div>
                </div>
              ) : currentQuestions.map((q, i) => {
                const isSelected = selQ?.id === q.id
                const step = getStep(q)
                return (
                  <button
                    key={q.id}
                    onClick={() => selectQ(q)}
                    className="w-full rounded-xl px-3.5 py-3 mb-1.5 text-left transition-all"
                    style={{
                      border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                      background: isSelected ? THEME.accentBg : '#fff',
                      boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: THEME.accentDark,
                          background: THEME.accentBg,
                          border: `1px solid ${THEME.accentBorder}60`,
                        }}
                      >
                        Q{i + 1}
                      </span>
                      <span className="text-[10px] font-semibold text-ink-secondary bg-gray-100 px-1.5 py-0.5 rounded-full">
                        {q.tag}
                      </span>
                    </div>
                    <div
                      className="text-[12.5px] font-semibold leading-[1.5] mb-1.5"
                      style={{ color: isSelected ? THEME.accentDark : '#1a1a1a' }}
                    >
                      {q.text}
                    </div>
                    {q.answered ? (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: THEME.accent,
                          background: THEME.accentBg,
                          border: `1px solid ${THEME.accentBorder}60`,
                        }}
                      >
                        ✓ 답변 · {step}/5단계
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        ⏳ 미답변
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">

        {activeTab === 'essay' && (
          <>
            {!selEssay ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                <div className="text-4xl">📄</div>
                <div className="text-[14px] font-bold text-ink-secondary">학교를 선택해주세요</div>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-line flex-shrink-0 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-[17px] font-extrabold text-ink tracking-tight">🏫 {selEssay.school}</div>
                      {selEssay.version > 1 && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            color: THEME.accentDark,
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}60`,
                          }}
                        >
                          v{selEssay.version} · {selEssay.version}번 수정됨
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-medium text-ink-muted mt-0.5">
                      📅 작성 {selEssay.createdAt} · 최근수정 {selEssay.lastUpdated} · 1,500자 이내
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {selEssay.content.selfStudy && !selEssay.questionsGenerated && (
                      <button
                        onClick={() => generateQuestions(selEssay)}
                        className="px-3 py-2 text-white rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                        style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                      >
                        ✨ 예상질문 생성
                      </button>
                    )}
                    {selEssay.questionsGenerated && (
                      <span
                        className="px-3 py-2 rounded-lg text-[11px] font-bold"
                        style={{
                          color: THEME.accentDark,
                          background: THEME.accentBg,
                          border: `1px solid ${THEME.accentBorder}60`,
                        }}
                      >
                        ✓ 질문생성완료
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">

                  {!selEssay.content.selfStudy && (
                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-12 text-center">
                      <div className="text-4xl mb-3">📝</div>
                      <div className="text-[14px] font-bold text-ink-secondary">학생이 아직 자소서를 작성하지 않았어요</div>
                    </div>
                  )}

                  {selEssay.content.selfStudy && (
                    <div>
                      <div className="text-right text-[11px] font-semibold text-ink-muted mb-3">
                        총 {countChars(selEssay.content)} / 1,500자
                      </div>

                      {SECTIONS.map(s => {
                        const content = (selEssay.content as any)[s.key]
                        if (!content) return null
                        const sectionFbs = selEssay.sectionFeedbacks?.[s.key] || []

                        return (
                          <div key={s.key} className="mb-5">
                            <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-2">
                              <div className="flex items-center justify-between mb-2">
                                <div
                                  className="text-[11px] font-extrabold tracking-tight"
                                  style={{ color: THEME.accentDark }}
                                >
                                  {s.label}
                                </div>
                                <span className="text-[10px] font-semibold text-ink-muted">
                                  {content.length}자
                                </span>
                              </div>
                              <div className="text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                                {content}
                              </div>
                            </div>

                            <div
                              className="rounded-lg px-3 py-2.5"
                              style={{
                                background: sectionFbs.length > 0 ? THEME.accentBg : '#F9FAFB',
                                border: `1px solid ${sectionFbs.length > 0 ? `${THEME.accentBorder}60` : '#E5E7EB'}`,
                              }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs">📜</span>
                                  <div className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: THEME.accent }}>
                                    피드백 이력
                                  </div>
                                </div>
                                {sectionFbs.length > 0 && (
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ color: THEME.accent, background: '#fff' }}
                                  >
                                    {sectionFbs.length}차
                                  </span>
                                )}
                              </div>

                              {sectionFbs.length > 0 && (
                                <div className="flex flex-col gap-1.5 mb-2">
                                  {sectionFbs.map((fb: any) => (
                                    <div
                                      key={fb.round}
                                      className="bg-white rounded-md px-2.5 py-2"
                                      style={{ border: `1px solid ${THEME.accentBorder}80` }}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className="text-[9px] font-extrabold text-white px-1.5 py-0.5 rounded-full"
                                            style={{ background: THEME.accent }}
                                          >
                                            {fb.round}차
                                          </span>
                                          <span className="text-[9px] font-semibold text-ink-muted">{fb.date}</span>
                                        </div>
                                        {!(editingSection?.key === s.key && editingSection?.round === fb.round) && (
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => { setEditingSection({ key: s.key, round: fb.round }); setEditingText(fb.text) }}
                                              className="text-[9px] text-ink-secondary hover:text-ink"
                                            >
                                              ✏️
                                            </button>
                                            <button
                                              onClick={() => deleteSectionFeedback(s.key, fb.round)}
                                              className="text-[9px] text-red-500 hover:text-red-700"
                                            >
                                              🗑️
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      {editingSection?.key === s.key && editingSection?.round === fb.round ? (
                                        <>
                                          <textarea
                                            value={editingText}
                                            onChange={e => setEditingText(e.target.value)}
                                            rows={2}
                                            className="w-full border border-line rounded px-2 py-1.5 text-[11.5px] font-medium outline-none resize-y leading-[1.6] transition-all bg-white"
                                            onFocus={handleTextareaFocus}
                                            onBlur={handleTextareaBlur}
                                          />
                                          <div className="flex gap-1 justify-end mt-1">
                                            <button
                                              onClick={() => { setEditingSection(null); setEditingText('') }}
                                              className="px-2 py-0.5 bg-white text-ink-secondary border border-line rounded text-[9px] font-bold"
                                            >
                                              취소
                                            </button>
                                            <button
                                              onClick={() => updateSectionFeedback(s.key, fb.round)}
                                              className="px-2 py-0.5 text-white rounded text-[9px] font-bold"
                                              style={{ background: THEME.accent }}
                                            >
                                              💾
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="text-[11.5px] font-medium leading-[1.6]" style={{ color: THEME.accentDark }}>
                                          {fb.text}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="bg-white rounded-md p-2" style={{ border: `1px dashed ${THEME.accent}` }}>
                                <div className="text-[9px] font-bold mb-1" style={{ color: THEME.accent }}>
                                  ➕ {sectionFbs.length + 1}차 피드백
                                </div>
                                <textarea
                                  value={newSectionFbs[s.key] || ''}
                                  onChange={e => setNewSectionFbs(prev => ({ ...prev, [s.key]: e.target.value }))}
                                  placeholder={`${sectionFbs.length + 1}차 피드백을 작성해주세요...`}
                                  rows={2}
                                  className="w-full border border-line rounded px-2 py-1.5 text-[11.5px] font-medium outline-none resize-y leading-[1.6] transition-all placeholder:text-ink-muted"
                                  onFocus={handleTextareaFocus}
                                  onBlur={handleTextareaBlur}
                                />
                                <div className="flex justify-end mt-1">
                                  <button
                                    onClick={() => addSectionFeedback(s.key)}
                                    disabled={!(newSectionFbs[s.key] || '').trim()}
                                    className="px-2 py-0.5 text-white rounded text-[10px] font-bold transition-all disabled:cursor-not-allowed"
                                    style={{
                                      background: (newSectionFbs[s.key] || '').trim() ? THEME.accent : '#E5E7EB',
                                      color: (newSectionFbs[s.key] || '').trim() ? '#fff' : '#9CA3AF',
                                    }}
                                  >
                                    📤 전달
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'questions' && (
          <>
            {!selQ ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                <div className="text-4xl">💬</div>
                <div className="text-[14px] font-bold text-ink-secondary">질문을 선택해주세요</div>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-line flex-shrink-0">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[13px] font-extrabold text-ink">Q{currentQuestions.findIndex(q => q.id === selQ.id) + 1}</div>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                      >
                        🏫 {selSchoolFilter}
                      </span>
                      <span className="text-[11px] font-semibold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
                        {selQ.tag}
                      </span>
                    </div>
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
                      style={{
                        background: selQ.answered ? THEME.accentBg : '#FEF3C7',
                        color: selQ.answered ? THEME.accentDark : '#92400E',
                        borderColor: `${selQ.answered ? THEME.accentBorder : '#FCD34D'}60`,
                      }}
                    >
                      {selQ.answered ? '✓ 답변완료' : '⏳ 미답변'}
                    </span>
                  </div>

                  <div className="flex">
                    {STEP_LABELS.map((label, i) => {
                      const step = getStep(selQ)
                      const stepNum = i + 1
                      const isDone = stepNum < step
                      const isOn = stepNum === step
                      const active = isDone || isOn
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                          {i < 4 && (
                            <div className="absolute top-[11px] left-[55%] w-[90%] h-px" style={{ background: isDone ? THEME.accent : '#E5E7EB' }} />
                          )}
                          <div
                            className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-extrabold z-10 relative border"
                            style={{
                              background: active ? THEME.accent : '#F3F4F6',
                              color: active ? '#fff' : '#9CA3AF',
                              borderColor: active ? THEME.accent : '#E5E7EB',
                            }}
                          >
                            {isDone ? '✓' : stepNum}
                          </div>
                          <div className="text-[10px] font-bold whitespace-nowrap" style={{ color: active ? THEME.accentDark : '#9CA3AF' }}>
                            {label}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

                  <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">📌 예상 질문</div>
                    <div className="text-[14px] font-bold text-ink leading-[1.6]">{selQ.text}</div>
                  </div>

                  <div className="rounded-xl px-4 py-3" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: THEME.accent }}>💡 질문 의도</div>
                    <ul className="pl-4">
                      {selQ.purpose.map((p: string, i: number) => (
                        <li key={i} className="text-[12.5px] font-medium leading-[1.7] list-disc" style={{ color: THEME.accentDark }}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 1</span>
                      <span className="text-[11px] font-bold text-ink-secondary">👤 학생 첫 답변</span>
                    </div>
                    {selQ.answer ? (
                      <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">{selQ.answer}</div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-4 text-[12px] font-medium text-ink-muted text-center">⏳ 학생이 아직 답변하지 않았어요</div>
                    )}
                  </div>

                  {selQ.answered && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>Step 2</span>
                        <span className="text-[11px] font-bold text-ink-secondary">💬 선생님 1차 피드백</span>
                      </div>
                      <textarea
                        value={teacherFbText}
                        onChange={e => setTeacherFbText(e.target.value)}
                        placeholder="학생 답변에 대한 피드백을 작성해주세요..."
                        rows={3}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                        onFocus={handleTextareaFocus}
                        onBlur={handleTextareaBlur}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={sendTeacherFeedback}
                          disabled={!teacherFbText.trim()}
                          className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                          style={{
                            background: teacherFbText.trim() ? THEME.accent : '#E5E7EB',
                            color: teacherFbText.trim() ? '#fff' : '#9CA3AF',
                          }}
                        >
                          {selQ.teacherFeedback ? '💾 업데이트' : '📤 피드백 전달'}
                        </button>
                      </div>
                    </div>
                  )}

                  {selQ.teacherFeedback && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 3</span>
                        <span className="text-[11px] font-bold text-ink-secondary">👤 학생 업그레이드 답변</span>
                      </div>
                      {selQ.upgradedAnswer ? (
                        <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">{selQ.upgradedAnswer}</div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-4 text-[12px] font-medium text-amber-700 text-center">⏳ 학생이 업그레이드 답변 작성중이에요</div>
                      )}
                    </div>
                  )}

                  {selQ.upgradedAnswer && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>Step 4</span>
                        <span className="text-[11px] font-bold text-ink-secondary">💬 선생님 최종 피드백</span>
                      </div>
                      <textarea
                        value={finalFbText}
                        onChange={e => setFinalFbText(e.target.value)}
                        placeholder="최종 피드백을 작성해주세요..."
                        rows={3}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                        onFocus={handleTextareaFocus}
                        onBlur={handleTextareaBlur}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={sendFinalFeedback}
                          disabled={!finalFbText.trim()}
                          className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                          style={{
                            background: finalFbText.trim() ? THEME.accent : '#E5E7EB',
                            color: finalFbText.trim() ? '#fff' : '#9CA3AF',
                          }}
                        >
                          {selQ.finalFeedback ? '💾 업데이트' : '📤 최종 피드백 전달'}
                        </button>
                      </div>
                    </div>
                  )}

                  {selQ.finalFeedback && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>Step 5</span>
                        <span className="text-[11px] font-bold text-ink-secondary">🔗 꼬리질문</span>
                        <span className="ml-auto text-[10px] font-bold text-ink-muted">{selQ.tails?.length || 0}개</span>
                      </div>

                      {selQ.tails && selQ.tails.length > 0 && (
                        <div className="mb-3">
                          {selQ.tails.map((t: string, i: number) => (
                            <div key={i} className="rounded-lg px-3 py-2.5 mb-1.5 flex items-start gap-2" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ color: '#fff', background: THEME.accent }}>꼬리{i + 1}</span>
                              <span className="text-[12.5px] font-medium flex-1 leading-[1.6]" style={{ color: THEME.accentDark }}>{t}</span>
                              <button onClick={() => removeTail(i)} className="text-ink-muted hover:text-red-500 text-xs flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 transition-colors">✕</button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 mb-2">
                        <input
                          value={newTailText}
                          onChange={e => setNewTailText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addTail(newTailText)}
                          placeholder="꼬리질문을 직접 추가..."
                          className="flex-1 h-9 border border-line rounded-lg px-3 text-[12px] font-medium outline-none transition-all placeholder:text-ink-muted"
                          onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                        />
                        <button
                          onClick={() => addTail(newTailText)}
                          disabled={!newTailText.trim()}
                          className="h-9 px-3 text-white rounded-lg text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                          style={{ background: newTailText.trim() ? THEME.accent : '#E5E7EB', color: newTailText.trim() ? '#fff' : '#9CA3AF' }}
                        >
                          ➕ 추가
                        </button>
                      </div>

                      <button
                        onClick={openAiTailModal}
                        className="w-full h-9 bg-white border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                        style={{ color: THEME.accent, borderColor: THEME.accent }}
                      >
                        ✨ AI 꼬리질문 제안 받기
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showAiTailModal && (
        <div
          onClick={() => setShowAiTailModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-7 w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-[18px] font-extrabold text-ink mb-1">✨ AI 꼬리질문 제안</div>
            <div className="text-[12px] font-medium text-ink-secondary mb-5">학생의 답변을 분석해서 추천하는 꼬리질문이에요.</div>

            {aiTailLoading ? (
              <div className="text-center py-10 text-ink-muted text-[13px] font-medium">
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                AI가 꼬리질문을 생성 중이에요...
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {AI_TAIL_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { addTail(s); setShowAiTailModal(false) }}
                    className="text-left px-4 py-3 rounded-xl bg-white transition-all"
                    style={{ border: '1px solid #E5E7EB' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = THEME.accent; e.currentTarget.style.background = THEME.accentBg }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#fff' }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>제안 {i + 1}</span>
                      <span className="text-[13px] font-medium text-ink leading-[1.6]">{s}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => setShowAiTailModal(false)} className="w-full h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors">
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}