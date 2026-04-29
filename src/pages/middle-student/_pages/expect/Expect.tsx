import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

const SCHOOLS = [
  '인천하늘고', '한국과학영재학교', '경기과학고', '서울과학고',
  '대원외고', '민족사관고', '하나고', '외대부고',
  '휘문고(자사고)', '중동고(자사고)', '직접입력'
]

const SECTIONS = [
  { key: 'selfStudy', label: '📚 자기주도학습 과정', placeholder: '스스로 학습계획을 세우고 학습해 온 과정과 그 과정에서 느꼈던 점을 구체적으로 작성해보세요.' },
  { key: 'reason', label: '🏫 지원동기 (건학이념 연계)', placeholder: '학교 건학이념과 연계하여 이 학교에 관심을 갖게 된 동기를 구체적으로 작성해보세요.' },
  { key: 'activity', label: '🎯 꿈과 끼를 살리기 위한 활동계획', placeholder: '고등학교 입학 후 자기주도적으로 꿈과 끼를 살리기 위한 활동계획을 작성해보세요.' },
  { key: 'career', label: '🚀 진로계획', placeholder: '고등학교 졸업 후 진로계획에 대해 구체적으로 작성해보세요.' },
  { key: 'character', label: '🤝 인성 (배려·나눔·협력·타인존중·규칙준수)', placeholder: '본인의 인성을 나타낼 수 있는 개인적 경험과 이를 통해 배우고 느낀 점을 구체적으로 작성해보세요.' },
]

const EMPTY_ESSAY = { selfStudy: '', reason: '', activity: '', career: '', character: '' }
const EMPTY_FEEDBACK = { selfStudy: '', reason: '', activity: '', career: '', character: '', overall: '' }

const MicBtn = ({ recording, onClick }: { recording: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 text-base transition-all ${
      recording
        ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
        : 'bg-brand-middle-pale border-brand-middle-light text-brand-middle-dark hover:bg-brand-middle-bg'
    }`}
  >
    {recording ? '⏹' : '🎙️'}
  </button>
)

const SubmitBtn = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-[108px] h-9 rounded-lg text-[12px] font-semibold flex-shrink-0 transition-all ${
      !disabled
        ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
        : 'bg-gray-100 text-ink-muted cursor-not-allowed'
    }`}
  >
    {label}
  </button>
)

export default function MiddleExpect() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const [activeTab, setActiveTab] = useState<'essay' | 'questions'>('essay')

  // 자소서
  const [essays, setEssays] = useState<any[]>([
    {
      id: 1, school: '인천하늘고',
      content: { selfStudy: '중학교 3년 동안 매일 아침 30분씩 독서하며 자기주도학습 습관을 길렀습니다.', reason: '인천하늘고의 자기주도학습 전형이 제 학습 방식과 잘 맞는다고 생각했습니다.', activity: '입학 후 과학 탐구 동아리를 만들어 친구들과 함께 연구 활동을 하고 싶습니다.', career: '과학자가 되어 기후변화 문제를 해결하는 연구를 하고 싶습니다.', character: '학급 반장으로서 갈등을 조율하고 모두가 함께할 수 있는 환경을 만들었습니다.' },
      sectionFeedback: { selfStudy: '구체적인 실천 방법을 더 추가해보세요!', reason: '', activity: '동아리 활동 계획이 구체적이어서 좋아요!', career: '', character: '리더십 경험이 잘 드러났어요!' },
      overallFeedback: '전반적으로 잘 작성됐어요! 지원동기 부분을 건학이념과 더 연결해보세요.',
      createdAt: '2024.03.15',
      questionsGenerated: true,
    }
  ])
  const [selEssay, setSelEssay] = useState<any>(null)
  const [showAddEssay, setShowAddEssay] = useState(false)
  const [newSchool, setNewSchool] = useState('')
  const [customSchool, setCustomSchool] = useState('')
  const [editingEssay, setEditingEssay] = useState(false)
  const [tempContent, setTempContent] = useState({ ...EMPTY_ESSAY })
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [tempSection, setTempSection] = useState('')

  // 예상질문 (학교별)
  const [questionsBySchool, setQuestionsBySchool] = useState<Record<string, any[]>>({
    '인천하늘고': [
      { id: 1, text: '인천하늘고에 지원한 구체적인 이유가 무엇인가요?', tag: '지원동기', answered: true, purpose: ['지원 동기의 진정성 확인', '학교에 대한 이해도 파악'], answer: '인천하늘고의 자기주도학습 전형이 제 학습 방식과 잘 맞아서 지원했습니다.', teacherFeedback: '좋은 답변이에요! 구체적인 경험을 더 추가해보세요.', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 2, text: '스스로 학습계획을 세우고 실천한 경험을 말해보세요.', tag: '자기주도학습', answered: false, purpose: ['자기주도학습 능력 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 3, text: '고등학교 입학 후 가장 하고 싶은 활동은 무엇인가요?', tag: '활동계획', answered: false, purpose: ['입학 후 계획의 구체성 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 4, text: '졸업 후 어떤 진로를 꿈꾸고 있나요?', tag: '진로계획', answered: false, purpose: ['진로에 대한 구체적인 고민 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 5, text: '배려나 나눔을 실천한 경험을 구체적으로 말해보세요.', tag: '인성', answered: false, purpose: ['인성 역량 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    ]
  })
  const [selSchoolFilter, setSelSchoolFilter] = useState<string>('인천하늘고')
  const [selQ, setSelQ] = useState<any>(null)
  const [myAnswer, setMyAnswer] = useState('')
  const [upgradedAnswer, setUpgradedAnswer] = useState('')
  const [isRecording1, setIsRecording1] = useState(false)
  const [isRecording3, setIsRecording3] = useState(false)
  const [editingStep1, setEditingStep1] = useState(false)
  const [editingStep3, setEditingStep3] = useState(false)
  const [tailRecordings, setTailRecordings] = useState<Record<number, boolean>>({})

  const countChars = (content: any) =>
    Object.values(content).join('').replace(/\s/g, '').length

  const charCount = countChars(tempContent)

  const getStep = (q: any) => {
    if (!q.answered) return 0
    if (!q.teacherFeedback) return 1
    if (!q.upgradedAnswer) return 2
    if (!q.finalFeedback) return 3
    return 4
  }

  const addEssay = () => {
    const school = newSchool === '직접입력' ? customSchool : newSchool
    if (!school) return
    const newE = {
      id: Date.now(), school,
      content: { ...EMPTY_ESSAY },
      sectionFeedback: { ...EMPTY_FEEDBACK },
      overallFeedback: '',
      createdAt: new Date().toLocaleDateString('ko-KR'),
      questionsGenerated: false,
    }
    setEssays(prev => [newE, ...prev])
    setSelEssay({ ...newE })
    setTempContent({ ...EMPTY_ESSAY })
    setEditingEssay(true)
    setShowAddEssay(false)
    setNewSchool('')
    setCustomSchool('')
  }

  const saveEssay = () => {
    const idx = essays.findIndex(e => e.id === selEssay.id)
    if (idx < 0) return
    const next = [...essays]
    const updated = { ...next[idx], content: { ...tempContent } }
    next[idx] = updated
    setEssays(next)
    setSelEssay({ ...updated })
    setEditingEssay(false)
  }

  const saveSectionEdit = (key: string) => {
    const idx = essays.findIndex(e => e.id === selEssay.id)
    if (idx < 0) return
    const next = [...essays]
    const updated = { ...next[idx], content: { ...next[idx].content, [key]: tempSection } }
    next[idx] = updated
    setEssays(next)
    setSelEssay({ ...updated })
    setEditingSection(null)
    setTempSection('')
  }

  const generateQuestions = (essay: any) => {
    const generated = [
      { id: 1, text: `${essay.school}에 지원한 구체적인 이유가 무엇인가요?`, tag: '지원동기', answered: false, purpose: ['지원 동기의 진정성 확인', '학교에 대한 이해도 파악'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 2, text: '스스로 학습계획을 세우고 실천한 경험을 말해보세요.', tag: '자기주도학습', answered: false, purpose: ['자기주도학습 능력 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 3, text: '고등학교 입학 후 가장 하고 싶은 활동은 무엇인가요?', tag: '활동계획', answered: false, purpose: ['입학 후 계획의 구체성 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 4, text: '졸업 후 어떤 진로를 꿈꾸고 있나요?', tag: '진로계획', answered: false, purpose: ['진로에 대한 구체적인 고민 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 5, text: '배려나 나눔을 실천한 경험을 구체적으로 말해보세요.', tag: '인성', answered: false, purpose: ['인성 역량 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      { id: 6, text: '어려운 상황에서 포기하지 않고 극복한 경험이 있나요?', tag: '인성', answered: false, purpose: ['도전 정신과 회복탄력성 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    ]
    const idx = essays.findIndex(e => e.id === essay.id)
    const next = [...essays]
    next[idx] = { ...next[idx], questionsGenerated: true }
    setEssays(next)
    setSelEssay({ ...next[idx] })
    setQuestionsBySchool(prev => ({ ...prev, [essay.school]: generated }))
    setSelSchoolFilter(essay.school)
    setSelQ(null)
    setActiveTab('questions')
  }

  const submitAnswer = () => {
    if (!myAnswer.trim() || !selQ || !selSchoolFilter) return
    const updated = (questionsBySchool[selSchoolFilter] || []).map(q =>
      q.id === selQ.id ? { ...q, answered: true, answer: myAnswer, teacherFeedback: '', upgradedAnswer: '', finalFeedback: '' } : q
    )
    setQuestionsBySchool(prev => ({ ...prev, [selSchoolFilter]: updated }))
    setSelQ({ ...selQ, answered: true, answer: myAnswer })
    setMyAnswer('')
    setIsRecording1(false)
    setEditingStep1(false)
  }

  const submitUpgrade = () => {
    if (!upgradedAnswer.trim() || !selQ || !selSchoolFilter) return
    const updated = (questionsBySchool[selSchoolFilter] || []).map(q =>
      q.id === selQ.id ? { ...q, upgradedAnswer, finalFeedback: '' } : q
    )
    setQuestionsBySchool(prev => ({ ...prev, [selSchoolFilter]: updated }))
    setSelQ({ ...selQ, upgradedAnswer })
    setUpgradedAnswer('')
    setIsRecording3(false)
    setEditingStep3(false)
  }

  const currentQuestions = questionsBySchool[selSchoolFilter] || []

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">자소서 · 예상질문</div>
          <div className="text-[12px] text-ink-muted mt-0.5">{student?.name} · {academy?.academyName}</div>
        </div>
        <div className="flex gap-2">
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-brand-middle-light">
            자소서 {essays.length}개
          </div>
          <div className="bg-[#EEF2FF] text-[#3B5BDB] text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-[#BAC8FF]">
            예상질문 {Object.values(questionsBySchool).flat().filter(q => q.answered).length}/{Object.values(questionsBySchool).flat().length} 답변완료
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* 왼쪽 패널 */}
        <div className="w-[360px] flex-shrink-0 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">

          {/* 탭 */}
          <div className="flex border-b border-line flex-shrink-0">
            {[{ key: 'essay', label: '📝 자기소개서' }, { key: 'questions', label: '💬 예상질문' }].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`flex-1 py-3 text-center text-[13px] transition-all ${
                  activeTab === t.key
                    ? 'text-brand-middle-dark font-bold border-b-2 border-brand-middle'
                    : 'text-ink-muted font-medium border-b-2 border-transparent hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 자소서 탭 왼쪽 */}
          {activeTab === 'essay' && (
            <>
              <div className="px-3.5 py-2.5 border-b border-line flex-shrink-0 flex items-center justify-between">
                <div className="text-[12px] text-ink-secondary">
                  총 <span className="text-brand-middle-dark font-bold">{essays.length}개</span>
                </div>
                <button
                  onClick={() => setShowAddEssay(true)}
                  className="h-7 px-3 bg-brand-middle hover:bg-brand-middle-hover text-white text-[11px] font-semibold rounded-md transition-all hover:-translate-y-px hover:shadow-btn-middle"
                >
                  + 학교 추가
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2.5">
                {essays.length === 0 ? (
                  <div className="text-center py-10 text-ink-muted text-[12px]">
                    <div className="text-3xl mb-2">📝</div>아직 자소서가 없어요.
                  </div>
                ) : essays.map((e, i) => {
                  const isSel = selEssay?.id === e.id
                  const hasFeedback = e.overallFeedback || Object.values(e.sectionFeedback || {}).some(v => v)
                  return (
                    <div
                      key={i}
                      onClick={() => { setSelEssay({ ...e }); setEditingEssay(false); setEditingSection(null) }}
                      className={`border rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all ${
                        isSel
                          ? 'border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                          : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                      }`}
                    >
                      <div className={`text-[13px] font-bold mb-1.5 ${isSel ? 'text-brand-middle-dark' : 'text-ink'}`}>{e.school}</div>
                      <div className="flex gap-1 flex-wrap">
                        {e.content.selfStudy
                          ? <span className="text-[10px] font-semibold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full border border-brand-middle-light">작성완료 · {countChars(e.content)}자</span>
                          : <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">미작성</span>}
                        {hasFeedback && <span className="text-[10px] font-semibold text-[#3B5BDB] bg-[#EEF2FF] px-2 py-0.5 rounded-full">피드백있음</span>}
                        {e.questionsGenerated && <span className="text-[10px] font-semibold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full">질문생성완료</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* 예상질문 탭 왼쪽 */}
          {activeTab === 'questions' && (
            <>
              {/* 학교 필터 */}
              <div className="px-3 py-2.5 border-b border-line flex-shrink-0">
                {Object.keys(questionsBySchool).length === 0 ? (
                  <div className="text-[11px] text-ink-muted">아직 생성된 예상질문이 없어요.</div>
                ) : (
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.keys(questionsBySchool).map(school => (
                      <button
                        key={school}
                        onClick={() => { setSelSchoolFilter(school); setSelQ(null) }}
                        className={`px-3 py-1 rounded-full text-[11px] border-[1.5px] transition-all ${
                          selSchoolFilter === school
                            ? 'border-brand-middle bg-brand-middle-pale text-brand-middle-dark font-bold'
                            : 'border-line bg-white text-ink-secondary font-medium hover:border-brand-middle-light'
                        }`}
                      >
                        {school}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-3.5 py-2 border-b border-line flex-shrink-0">
                <div className="text-[12px] text-ink-secondary">
                  총 <span className="text-brand-middle-dark font-bold">{currentQuestions.length}개</span> ·
                  답변완료 <span className="text-brand-middle-dark font-bold">{currentQuestions.filter(q => q.answered).length}개</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-2.5">
                {currentQuestions.length === 0 ? (
                  <div className="text-center py-10 text-ink-muted text-[12px]">
                    <div className="text-3xl mb-2">💬</div>
                    <div>아직 예상질문이 없어요.</div>
                    <div className="mt-1.5">자소서를 작성하고 저장하면<br />선생님이 예상질문을 만들어드려요!</div>
                  </div>
                ) : currentQuestions.map((q, i) => (
                  <div
                    key={q.id}
                    onClick={() => { setSelQ(q); setMyAnswer(''); setUpgradedAnswer(''); setIsRecording1(false); setIsRecording3(false); setEditingStep1(false); setEditingStep3(false) }}
                    className={`border rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all ${
                      selQ?.id === q.id
                        ? 'border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                        : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">질문 {i + 1}</span>
                      <span className="text-[10px] text-ink-secondary bg-gray-100 px-1.5 py-0.5 rounded-full">{q.tag}</span>
                    </div>
                    <div className="text-[12px] text-ink leading-relaxed font-semibold mb-1.5">{q.text}</div>
                    <div className="flex gap-1">
                      {q.answered
                        ? <span className="text-[10px] font-semibold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full border border-brand-middle-light">답변완료 · {getStep(q)}/5단계</span>
                        : <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">미답변</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 오른쪽 패널 */}
        <div className="flex-1 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">

          {/* 자소서 탭 오른쪽 */}
          {activeTab === 'essay' && (
            <>
              {!selEssay ? (
                <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                  <div className="text-4xl">📝</div>
                  <div className="text-[14px] font-semibold text-ink-secondary">학교를 선택해주세요</div>
                  <div className="text-[12px]">왼쪽에서 학교를 클릭하거나 추가해보세요</div>
                </div>
              ) : (
                <>
                  {/* 자소서 헤더 */}
                  <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[16px] font-extrabold text-ink tracking-tight">{selEssay.school}</div>
                        <div className="text-[11px] text-ink-muted mt-0.5">{selEssay.createdAt} 생성 · 1,500자 이내 (띄어쓰기 제외)</div>
                      </div>
                      <div className="flex gap-2">
                        {!editingEssay && !editingSection && (
                          <button
                            onClick={() => { setEditingEssay(true); setTempContent({ ...selEssay.content }) }}
                            className="text-[11px] font-semibold text-brand-middle-dark bg-brand-middle-bg border border-brand-middle-light rounded-md px-3 py-1.5 hover:bg-brand-middle hover:text-white transition-all"
                          >
                            ✏️ {selEssay.content.selfStudy ? '전체 수정' : '작성하기'}
                          </button>
                        )}
                        {selEssay.content.selfStudy && !selEssay.questionsGenerated && !editingEssay && !editingSection && (
                          <button
                            onClick={() => generateQuestions(selEssay)}
                            className="text-[11px] font-semibold text-white bg-[#3B5BDB] hover:bg-[#2E4AC4] rounded-md px-3 py-1.5 transition-all hover:-translate-y-px hover:shadow-md"
                          >
                            💬 예상질문 생성 요청
                          </button>
                        )}
                        {selEssay.questionsGenerated && !editingEssay && !editingSection && (
                          <span className="text-[11px] font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] rounded-md px-3 py-1.5">✓ 질문생성완료</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">

                    {/* 전체 작성 모드 */}
                    {editingEssay && (
                      <div>
                        {SECTIONS.map(s => (
                          <div key={s.key} className="mb-3.5">
                            <label className="text-[12px] font-bold text-ink-secondary block mb-1.5">{s.label}</label>
                            <textarea
                              value={(tempContent as any)[s.key]}
                              onChange={e => setTempContent(p => ({ ...p, [s.key]: e.target.value }))}
                              placeholder={s.placeholder}
                              rows={4}
                              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                            />
                          </div>
                        ))}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="text-[11px] text-ink-muted">* 띄어쓰기 제외 1,500자 이내</div>
                          <div className={`text-[13px] font-bold ${
                            charCount > 1500 ? 'text-red-500' : charCount > 1200 ? 'text-amber-500' : 'text-brand-middle-dark'
                          }`}>
                            {charCount} / 1,500자 {charCount > 1500 && <span className="text-[11px]">⚠️ 초과!</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingEssay(false)}
                            className="flex-1 h-10 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors"
                          >
                            취소
                          </button>
                          <button
                            onClick={saveEssay}
                            disabled={charCount > 1500}
                            className={`flex-[2] h-10 rounded-lg text-[13px] font-semibold transition-all ${
                              charCount > 1500
                                ? 'bg-gray-100 text-ink-muted cursor-not-allowed'
                                : 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
                            }`}
                          >
                            {charCount > 1500 ? `${charCount - 1500}자 초과` : '저장'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 읽기 모드 - 비어있음 */}
                    {!editingEssay && !selEssay.content.selfStudy && (
                      <div className="text-center py-16 text-ink-muted">
                        <div className="text-4xl mb-2.5">📝</div>
                        <div className="text-[13px] font-medium">아직 작성된 내용이 없어요.</div>
                        <div className="text-[11px] mt-1">작성하기 버튼을 눌러 자소서를 작성해보세요!</div>
                      </div>
                    )}

                    {!editingEssay && selEssay.content.selfStudy && (
                      <div>
                        {/* 전체 피드백 */}
                        {selEssay.overallFeedback && (
                          <div className="bg-[#EEF2FF] border border-[#BAC8FF] rounded-xl px-4 py-3 mb-4">
                            <div className="text-[11px] font-bold text-[#3B5BDB] mb-1.5">💬 선생님 전체 피드백</div>
                            <div className="text-[13px] text-[#1E3A8A] leading-[1.7]">{selEssay.overallFeedback}</div>
                          </div>
                        )}

                        {/* 글자수 */}
                        <div className="text-right text-[11px] text-ink-muted mb-3">
                          총 {countChars(selEssay.content)} / 1,500자
                        </div>

                        {/* 항목별 */}
                        {SECTIONS.map(s => (
                          (selEssay.content as any)[s.key] ? (
                            <div key={s.key} className="mb-3.5">

                              {/* 항목 내용 */}
                              <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="text-[11px] font-bold text-brand-middle-dark">{s.label}</div>
                                  {editingSection !== s.key && (
                                    <button
                                      onClick={() => { setEditingSection(s.key); setTempSection((selEssay.content as any)[s.key]) }}
                                      className="text-[10px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2 py-0.5 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
                                    >
                                      ✏️ 수정
                                    </button>
                                  )}
                                </div>

                                {editingSection === s.key ? (
                                  <div>
                                    <textarea
                                      value={tempSection}
                                      onChange={e => setTempSection(e.target.value)}
                                      rows={4}
                                      className="w-full border border-brand-middle rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:ring-2 focus:ring-brand-middle/10 transition-all mb-2"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => { setEditingSection(null); setTempSection('') }}
                                        className="flex-1 h-[34px] bg-white text-ink-secondary border border-line rounded-md text-[12px] font-medium hover:bg-gray-50 transition-colors"
                                      >
                                        취소
                                      </button>
                                      <button
                                        onClick={() => saveSectionEdit(s.key)}
                                        className="flex-[2] h-[34px] bg-brand-middle hover:bg-brand-middle-hover text-white rounded-md text-[12px] font-semibold transition-all hover:-translate-y-px hover:shadow-btn-middle"
                                      >
                                        저장
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[13px] text-ink leading-[1.8]">{(selEssay.content as any)[s.key]}</div>
                                )}
                              </div>

                              {/* 항목별 피드백 */}
                              {(selEssay.sectionFeedback as any)?.[s.key] ? (
                                <div className="bg-[#EEF2FF] border border-[#BAC8FF] rounded-md px-4 py-2.5 mt-1.5 flex gap-2">
                                  <span className="text-sm flex-shrink-0">💬</span>
                                  <div>
                                    <div className="text-[10px] font-bold text-[#3B5BDB] mb-0.5">선생님 피드백</div>
                                    <div className="text-[12px] text-[#1E3A8A] leading-[1.7]">{(selEssay.sectionFeedback as any)[s.key]}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-gray-50 border border-line rounded-md px-4 py-2 mt-1.5">
                                  <div className="text-[11px] text-ink-muted">💬 이 항목의 피드백을 기다리는 중이에요...</div>
                                </div>
                              )}
                            </div>
                          ) : null
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* 예상질문 탭 오른쪽 */}
          {activeTab === 'questions' && (
            <>
              {!selQ ? (
                <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                  <div className="text-4xl">💬</div>
                  <div className="text-[14px] font-semibold text-ink-secondary">질문을 선택해주세요</div>
                  <div className="text-[12px]">왼쪽에서 질문을 클릭하면 답변을 작성할 수 있어요</div>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-[13px] font-semibold text-ink">질문 {currentQuestions.findIndex(q => q.id === selQ.id) + 1}</div>
                          <span className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">{selSchoolFilter}</span>
                        </div>
                        <div className="text-[11px] text-ink-muted mt-0.5">{selQ.tag}</div>
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                        selQ.answered
                          ? 'bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {selQ.answered ? '답변완료' : '미답변'}
                      </span>
                    </div>

                    {/* 5단계 */}
                    <div className="flex">
                      {STEP_LABELS.map((label, i) => {
                        const step = getStep(selQ)
                        const stepNum = i + 1
                        const isDone = stepNum < step
                        const isOn = stepNum === step
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                            {i < 4 && <div className={`absolute top-[11px] left-[55%] w-[90%] h-px ${isDone ? 'bg-brand-middle' : 'bg-line'}`} />}
                            <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-semibold z-10 relative ${
                              isDone || isOn
                                ? 'bg-brand-middle text-white border border-brand-middle'
                                : 'bg-gray-100 text-ink-muted border border-line'
                            }`}>
                              {isDone ? '✓' : stepNum}
                            </div>
                            <div className={`text-[10px] whitespace-nowrap ${
                              isDone || isOn ? 'text-brand-middle-dark font-semibold' : 'text-ink-muted font-medium'
                            }`}>
                              {label}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-3">

                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                      <div className="text-[10px] font-semibold text-ink-muted mb-1">예상 질문</div>
                      <div className="text-[14px] font-semibold text-ink leading-[1.6]">{selQ.text}</div>
                    </div>

                    <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3">
                      <div className="text-[11px] font-bold text-brand-middle-dark mb-1.5">💡 질문 의도</div>
                      <ul className="pl-4">
                        {selQ.purpose.map((p: string, i: number) => (
                          <li key={i} className="text-[12px] text-[#065F46] leading-[1.7] list-disc">{p}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Step 1 */}
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-bold text-white bg-ink-muted px-2 py-0.5 rounded-full">Step 1</span>
                        <span className="text-[11px] text-ink-secondary font-medium">내 첫 답변</span>
                      </div>
                      {selQ.answer && !editingStep1 ? (
                        <div>
                          <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2">{selQ.answer}</div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => { setEditingStep1(true); setMyAnswer(selQ.answer) }}
                              className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
                            >
                              ✏️ 수정
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {isRecording1 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-[12px] text-red-600 font-semibold">녹음 중...</span>
                            </div>
                          )}
                          <textarea
                            value={myAnswer}
                            onChange={e => setMyAnswer(e.target.value)}
                            placeholder="답변을 작성하거나 마이크로 녹음해주세요..."
                            rows={4}
                            className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            {editingStep1 && (
                              <button
                                onClick={() => { setEditingStep1(false); setMyAnswer('') }}
                                className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
                              >
                                취소
                              </button>
                            )}
                            <MicBtn recording={isRecording1} onClick={() => setIsRecording1(!isRecording1)} />
                            <SubmitBtn label={editingStep1 ? '수정 완료' : '답변 제출'} onClick={submitAnswer} disabled={!myAnswer.trim()} />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Step 2 */}
                    {selQ.answered && (
                      <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 2</span>
                          <span className="text-[11px] text-ink-secondary font-medium">선생님 1차 피드백</span>
                        </div>
                        {selQ.teacherFeedback ? (
                          <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8]">{selQ.teacherFeedback}</div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">선생님 피드백을 기다리는 중이에요.</div>
                        )}
                      </div>
                    )}

                    {/* Step 3 */}
                    {selQ.teacherFeedback && (
                      <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-white bg-ink-muted px-2 py-0.5 rounded-full">Step 3</span>
                          <span className="text-[11px] text-ink-secondary font-medium">업그레이드 답변</span>
                        </div>
                        {selQ.upgradedAnswer && !editingStep3 ? (
                          <div>
                            <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2">{selQ.upgradedAnswer}</div>
                            <div className="flex justify-end">
                              <button
                                onClick={() => { setEditingStep3(true); setUpgradedAnswer(selQ.upgradedAnswer) }}
                                className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
                              >
                                ✏️ 수정
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-700 font-medium mb-2">
                              💡 선생님 피드백을 반영해서 답변을 업그레이드해보세요!
                            </div>
                            {isRecording3 && (
                              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[12px] text-red-600 font-semibold">녹음 중...</span>
                              </div>
                            )}
                            <textarea
                              value={upgradedAnswer}
                              onChange={e => setUpgradedAnswer(e.target.value)}
                              placeholder="피드백을 반영한 업그레이드 답변을 작성해주세요..."
                              rows={4}
                              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                              {editingStep3 && (
                                <button
                                  onClick={() => { setEditingStep3(false); setUpgradedAnswer('') }}
                                  className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
                                >
                                  취소
                                </button>
                              )}
                              <MicBtn recording={isRecording3} onClick={() => setIsRecording3(!isRecording3)} />
                              <SubmitBtn label={editingStep3 ? '수정 완료' : '업그레이드 제출'} onClick={submitUpgrade} disabled={!upgradedAnswer.trim()} />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 4 */}
                    {selQ.upgradedAnswer && (
                      <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 4</span>
                          <span className="text-[11px] text-ink-secondary font-medium">선생님 최종 피드백</span>
                        </div>
                        {selQ.finalFeedback ? (
                          <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8]">{selQ.finalFeedback}</div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">선생님 최종 피드백을 기다리는 중이에요.</div>
                        )}
                      </div>
                    )}

                    {/* Step 5 꼬리질문 */}
                    {selQ.tails && selQ.tails.length > 0 && (
                      <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 5</span>
                          <span className="text-[11px] text-ink-secondary font-medium">꼬리질문</span>
                        </div>
                        {selQ.tails.map((t: string, i: number) => (
                          <div key={i} className="mb-3">
                            <div className="flex items-start gap-1.5 px-2.5 py-2 bg-gray-50 rounded-md mb-2 text-[12px] text-ink leading-[1.5]">
                              <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-1.5 py-0.5 rounded-full flex-shrink-0 mt-[1px]">꼬리 {i + 1}</span>
                              {t}
                            </div>
                            {tailRecordings[i] && (
                              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-1.5 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[12px] text-red-600 font-semibold">녹음 중...</span>
                              </div>
                            )}
                            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                              <div className="text-[10px] text-ink-muted mb-1.5">꼬리질문 답변</div>
                              <textarea
                                placeholder="꼬리질문에 대한 답변을 작성해주세요..."
                                rows={2}
                                className="w-full border border-line rounded-md px-2.5 py-2 text-[12px] leading-[1.6] resize-none bg-white focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                              />
                              <div className="flex gap-2 mt-2 justify-end">
                                <MicBtn recording={tailRecordings[i]} onClick={() => setTailRecordings(prev => ({ ...prev, [i]: !prev[i] }))} />
                                <button className="w-[102px] h-[34px] bg-brand-middle hover:bg-brand-middle-hover text-white rounded-md text-[12px] font-semibold transition-all hover:-translate-y-px hover:shadow-btn-middle">
                                  제출
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 학교 추가 모달 */}
      {showAddEssay && (
        <div
          onClick={() => { setShowAddEssay(false); setNewSchool(''); setCustomSchool('') }}
          className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[460px] shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="text-[18px] font-bold text-ink tracking-tight">지원 학교 추가</div>
              <button
                onClick={() => { setShowAddEssay(false); setNewSchool(''); setCustomSchool('') }}
                className="text-ink-muted hover:text-ink text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="text-[12px] font-bold text-ink-secondary mb-2">
              학교 선택 <span className="text-red-500">*</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {SCHOOLS.map(s => (
                <button
                  key={s}
                  onClick={() => setNewSchool(s)}
                  className={`px-3 py-1 rounded-full text-[12px] border-[1.5px] transition-all ${
                    newSchool === s
                      ? 'border-brand-middle bg-brand-middle-pale text-brand-middle-dark font-bold'
                      : 'border-line bg-white text-ink-secondary font-medium hover:border-brand-middle-light'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {newSchool === '직접입력' && (
              <div className="mb-4">
                <input
                  value={customSchool}
                  onChange={e => setCustomSchool(e.target.value)}
                  placeholder="학교 이름을 직접 입력해주세요"
                  autoFocus
                  className="w-full h-11 px-3.5 border border-line rounded-lg text-[14px] focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                />
              </div>
            )}

            <button
              onClick={addEssay}
              disabled={!newSchool || (newSchool === '직접입력' && !customSchool)}
              className={`w-full h-11 rounded-lg text-[14px] font-semibold transition-all ${
                newSchool && (newSchool !== '직접입력' || customSchool)
                  ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
                  : 'bg-gray-100 text-ink-muted cursor-not-allowed'
              }`}
            >
              추가하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}