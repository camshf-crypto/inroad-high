import { useState, useRef, useEffect } from 'react'
import {
  useMyResearches,
  useResearchAnalyses,
  useCreateResearch,
  useSendStudentMessage,
  useDeleteResearch,
  buildMessages,
  type Research,
} from '../../_hooks/useMyHighResearch'
import SubjectSelect from '../../../../components/SubjectSelect'

const GRADES = ['전체', '고1', '고2', '고3']
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

export default function TopicList() {
  const [selResearchId, setSelResearchId] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')

  // 세특 모달
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

  const chatEndRef = useRef<HTMLDivElement>(null)

  // ─── DB 조회 ───
  const { data: researches = [], isLoading } = useMyResearches()
  const { data: analyses = [] } = useResearchAnalyses(selResearchId ?? undefined)
  const createResearch = useCreateResearch()
  const sendMessage = useSendStudentMessage(selResearchId ?? '')
  const deleteResearch = useDeleteResearch()

  const selected = researches.find(r => r.id === selResearchId)
  const messages = selected ? buildMessages(selected, analyses) : []
  const isCompleted = selected?.status === 'completed'

  useEffect(() => {
    if (!selResearchId && researches.length > 0) {
      setSelResearchId(researches[0].id)
    }
  }, [researches, selResearchId])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  const isFilterEmpty = filterGrade === '전체' && filterMajor === '전체' && filterSubject === '전체'
  const filteredSetech = isFilterEmpty ? [] : SETECH_DATA.filter(s =>
    (filterGrade === '전체' || s.grade === filterGrade) &&
    (filterMajor === '전체' || s.major.includes(filterMajor) || s.school.includes(filterMajor)) &&
    (filterSubject === '전체' || s.subject === filterSubject)
  )
  const filteredMajorOptions = MAJORS.filter(m => filterMajorInput && m.includes(filterMajorInput))

  // 세특 필터용 과목 (고정 배열)
  const FILTER_SUBJECTS = ['국어', '수학', '영어', '물리', '화학', '생물', '지구과학', '정보', '사회', '역사', '윤리', '경제', '정치', '심리학']
  const filteredSubjectOptions = FILTER_SUBJECTS.filter(s => !filterSubjectInput || s.includes(filterSubjectInput))

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selResearchId || isCompleted) return
    sendMessage.mutate(messageInput.trim(), {
      onSuccess: () => setMessageInput(''),
    })
  }

  const handleDeleteTopic = (topicId: string) => {
    if (window.confirm('탐구주제를 삭제할까요?')) {
      deleteResearch.mutate(topicId, {
        onSuccess: () => {
          if (selResearchId === topicId) setSelResearchId(null)
        },
      })
    }
  }

  const selectSetech = (s: any) => {
    setSelSetech(s)
    setNewTopic({ title: s.activity, subject: s.subject, content: s.topics.join('\n') })
    setModalStep(2)
  }

  const addTopic = () => {
    if (!newTopic.title.trim() || !newTopic.content.trim()) return
    createResearch.mutate(
      {
        topic: newTopic.title,
        subject: newTopic.subject || undefined,
        content: newTopic.content,
      },
      {
        onSuccess: (data: any) => {
          closeModal()
          if (data?.id) setSelResearchId(data.id)
        },
      },
    )
  }

  const closeModal = () => {
    setShowModal(false); setModalStep(1); setSelSetech(null)
    setFilterGrade('전체'); setFilterMajor('전체'); setFilterMajorInput('')
    setFilterSubject('전체'); setFilterSubjectInput(''); setExpandedSetech(null)
    setNewTopic({ title: '', subject: '', content: '' })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">

      {/* 상단 필터 + 추가 */}
      <div className="flex justify-between items-center flex-shrink-0 flex-wrap gap-2">
        <div className="text-[14px] font-bold text-ink tracking-tight">
          🔬 내 탐구주제
          {researches.length > 0 && (
            <span className="text-[11px] text-ink-secondary ml-2 font-medium">
              총 {researches.length}개 · 완료 {researches.filter(r => r.status === 'completed').length}개
            </span>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-brand-high text-white rounded-lg text-[13px] font-semibold hover:bg-brand-high-dark transition-all shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
        >
          + 탐구주제 작성
        </button>
      </div>

      {/* 좌우 패널 */}
      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* 왼쪽: 탐구주제 리스트 */}
        <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-3 border-b border-line-light flex-shrink-0">
            <div className="text-[13px] font-bold text-ink">탐구주제 목록</div>
            <div className="text-[11px] text-ink-secondary mt-0.5 font-medium">
              선생님과 대화하며 피드백 받으세요
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-brand-high rounded-full animate-spin" />
                <div className="text-[12px] text-ink-muted mt-2">불러오는 중...</div>
              </div>
            ) : researches.length === 0 ? (
              <div className="text-center py-10 text-ink-muted">
                <div className="text-3xl mb-2">🔬</div>
                <div className="text-[12px] mb-3">탐구주제가 없어요.</div>
                <div className="text-[11px] leading-relaxed">
                  우측 상단 '+ 탐구주제 작성' 버튼으로<br />
                  첫 탐구주제를 만들어보세요!
                </div>
              </div>
            ) : researches.map(topic => {
              const hasTeacher = topic.id === selResearchId && analyses.some(a => a.teacher_feedback)
              return (
                <div
                  key={topic.id}
                  onClick={() => setSelResearchId(topic.id)}
                  className={`relative border rounded-xl px-3 py-2.5 mb-1.5 cursor-pointer transition-all ${
                    selResearchId === topic.id
                      ? 'border-brand-high bg-brand-high-pale shadow-[0_2px_8px_rgba(37,99,235,0.1)]'
                      : 'border-line bg-white hover:border-brand-high-light hover:shadow-sm'
                  }`}
                >
                  <div className="flex gap-1 mb-1.5 flex-wrap">
                    {topic.status === 'completed' ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        ✓ 완료됨
                      </span>
                    ) : hasTeacher ? (
                      <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-bg px-2 py-0.5 rounded-full">
                        💬 선생님 답변 확인
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        ⏳ 피드백 대기
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] font-semibold text-ink mb-1.5 leading-tight line-clamp-2">
                    {topic.topic}
                  </div>
                  {topic.subject && (
                    <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale border border-brand-high-light px-2 py-0.5 rounded-full">
                      {topic.subject}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteTopic(topic.id) }}
                    className="absolute top-2 right-2 text-ink-muted hover:text-red-500 text-[12px] leading-none w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* 오른쪽: 채팅 */}
        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">🔬</div>
              <div className="text-[14px] font-semibold text-ink-secondary">탐구주제를 선택해주세요</div>
              <div className="text-[12px]">왼쪽에서 탐구주제를 클릭하면 선생님과 대화할 수 있어요</div>
            </div>
          ) : (
            <>
              {/* 헤더 */}
              <div className="px-5 py-3 border-b border-line-light flex-shrink-0 bg-white flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-ink tracking-tight mb-1.5 truncate">
                    {selected.topic}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {selected.subject && (
                      <span className="text-[11px] font-bold text-brand-high-dark bg-brand-high-pale border border-brand-high-light px-2 py-0.5 rounded-full">
                        {selected.subject}
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        ✓ 완료됨
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 채팅 */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
                {messages.map((msg, i) => {
                  const isStudent = msg.role === 'student'
                  const showDate = i === 0 || messages[i - 1].date !== msg.date
                  return (
                    <div key={i}>
                      {showDate && (
                        <div className="text-center my-2">
                          <span className="text-[10px] font-semibold text-ink-muted bg-white border border-line px-3 py-1 rounded-full">
                            {msg.date}
                          </span>
                        </div>
                      )}
                      <div className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}>
                        <div className={`text-[10px] font-semibold text-ink-muted mb-1 ${isStudent ? 'mr-1' : 'ml-10'}`}>
                          {isStudent ? '나' : '👨‍🏫 선생님'}
                        </div>
                        <div className={`flex items-end gap-2 ${isStudent ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isStudent && (
                            <div className="w-8 h-8 rounded-full bg-brand-high text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                              T
                            </div>
                          )}
                          <div className={`max-w-md px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                            isStudent
                              ? 'bg-brand-high text-white rounded-[14px_2px_14px_14px]'
                              : 'bg-white border border-line text-ink rounded-[2px_14px_14px_14px] shadow-sm'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              {/* 입력창 */}
              <div className="px-4 py-3 border-t border-line-light bg-white flex-shrink-0">
                {isCompleted ? (
                  <div className="text-center py-3 text-[12px] text-ink-muted font-medium">
                    ✓ 완료 처리된 탐구주제예요. 선생님께 새 메시지 전송 불가.
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 items-end">
                      <textarea
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="선생님께 질문이나 탐구 방향을 작성해주세요... (Shift+Enter 줄바꿈)"
                        rows={2}
                        disabled={sendMessage.isPending}
                        className="flex-1 border border-line rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none leading-relaxed focus:border-brand-high transition-colors font-sans disabled:bg-gray-50 disabled:opacity-70"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || sendMessage.isPending}
                        className={`px-5 py-3 rounded-xl text-[13px] font-bold transition-all flex-shrink-0 ${
                          messageInput.trim() && !sendMessage.isPending
                            ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
                            : 'bg-gray-200 text-ink-muted cursor-not-allowed'
                        }`}
                      >
                        {sendMessage.isPending ? '전송 중...' : '전송'}
                      </button>
                    </div>
                    <div className="text-[10px] text-ink-muted mt-2 font-medium px-1">
                      💡 선생님께 탐구 방향, 질문, 수정 내용을 자유롭게 작성해보세요
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 모달: 세특 사례 + 탐구 작성 */}
      {showModal && (
        <div
          onClick={closeModal}
          className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`bg-white rounded-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl ${modalStep === 1 ? 'w-[920px]' : 'w-[520px]'} max-w-full`}
          >
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-line-light flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                {modalStep === 2 && (
                  <button
                    onClick={() => setModalStep(1)}
                    className="text-ink-secondary hover:text-ink text-[14px] transition-colors"
                  >
                    ←
                  </button>
                )}
                <div>
                  <div className="text-[15px] font-bold text-ink tracking-tight">
                    {modalStep === 1 ? '세특 Lite 참고하기' : '탐구주제 작성'}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5 font-medium">
                    {modalStep === 1 ? '학년, 학과, 과목을 선택해서 세특 사례를 찾아보세요' : '세특을 참고해서 내 탐구주제를 작성해요'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {[1, 2].map(s => (
                    <div
                      key={s}
                      className={`h-2 rounded-full transition-all ${
                        s === modalStep ? 'w-5 bg-brand-high' : s < modalStep ? 'w-2 bg-brand-high-dark' : 'w-2 bg-line'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={closeModal}
                  className="text-ink-muted hover:text-ink text-[18px] transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Step 1: 세특 검색 */}
            {modalStep === 1 && (
              <div className="flex-1 overflow-hidden flex">
                <div className="w-[260px] flex-shrink-0 border-r border-line-light flex flex-col bg-gray-50 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="mb-4">
                      <div className="text-[11px] font-semibold text-ink-secondary mb-2">학년</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {GRADES.map(g => (
                          <button
                            key={g}
                            onClick={() => { setFilterGrade(g); setExpandedSetech(null) }}
                            className={`px-2.5 py-1 rounded-full text-[12px] border transition-all ${
                              filterGrade === g
                                ? 'bg-brand-high text-white border-brand-high font-semibold'
                                : 'bg-white text-ink-secondary border-line hover:border-brand-high-light'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-[11px] font-semibold text-ink-secondary mb-2">지원학과 및 계열</div>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-muted text-[12px]">🔍</span>
                        <input
                          value={filterMajorInput}
                          onChange={e => { setFilterMajorInput(e.target.value); setFilterMajor(e.target.value || '전체'); setShowMajorDrop(true) }}
                          onFocus={() => setShowMajorDrop(true)}
                          onBlur={() => setTimeout(() => setShowMajorDrop(false), 150)}
                          placeholder="학과 또는 계열 검색"
                          className="w-full h-9 border border-line rounded-lg pl-7 pr-2 text-[12px] outline-none focus:border-brand-high transition-colors font-sans bg-white"
                        />
                        {showMajorDrop && filteredMajorOptions.length > 0 && (
                          <div className="absolute top-10 left-0 right-0 bg-white border border-line rounded-lg z-10 max-h-[150px] overflow-y-auto shadow-lg">
                            {filteredMajorOptions.map(m => (
                              <div
                                key={m}
                                onClick={() => { setFilterMajorInput(m); setFilterMajor(m); setShowMajorDrop(false); setExpandedSetech(null) }}
                                className="px-3 py-2 text-[12px] cursor-pointer text-ink hover:bg-brand-high-pale transition-colors"
                              >
                                {m}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {filterMajor !== '전체' && (
                        <div className="mt-1.5">
                          <span className="text-[11px] bg-brand-high-pale text-brand-high-dark px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold">
                            {filterMajor}
                            <button onClick={() => { setFilterMajor('전체'); setFilterMajorInput('') }} className="hover:text-brand-high-dark">✕</button>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <div className="text-[11px] font-semibold text-ink-secondary mb-2">과목</div>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-muted text-[12px]">🔍</span>
                        <input
                          value={filterSubjectInput}
                          onChange={e => { setFilterSubjectInput(e.target.value); setFilterSubject(e.target.value || '전체'); setShowSubjectDrop(true) }}
                          onFocus={() => setShowSubjectDrop(true)}
                          onBlur={() => setTimeout(() => setShowSubjectDrop(false), 150)}
                          placeholder="과목 검색 (예: 화학)"
                          className="w-full h-9 border border-line rounded-lg pl-7 pr-2 text-[12px] outline-none focus:border-brand-high transition-colors font-sans bg-white"
                        />
                        {showSubjectDrop && (
                          <div className="absolute top-10 left-0 right-0 bg-white border border-line rounded-lg z-10 max-h-[150px] overflow-y-auto shadow-lg">
                            {filteredSubjectOptions.map(s => (
                              <div
                                key={s}
                                onClick={() => { setFilterSubjectInput(s); setFilterSubject(s); setShowSubjectDrop(false); setExpandedSetech(null) }}
                                className="px-3 py-2 text-[12px] cursor-pointer text-ink hover:bg-brand-high-pale transition-colors"
                              >
                                {s}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {filterSubject !== '전체' && (
                        <div className="mt-1.5">
                          <span className="text-[11px] bg-brand-high-pale text-brand-high-dark px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold">
                            {filterSubject}
                            <button onClick={() => { setFilterSubject('전체'); setFilterSubjectInput('') }} className="hover:text-brand-high-dark">✕</button>
                          </span>
                        </div>
                      )}
                    </div>

                    {!isFilterEmpty && (
                      <div className="text-[11px] text-ink-muted flex items-center justify-between font-medium">
                        <span>총 <span className="text-brand-high-dark font-bold">{filteredSetech.length}개</span></span>
                        <button
                          onClick={() => { setFilterGrade('전체'); setFilterMajor('전체'); setFilterMajorInput(''); setFilterSubject('전체'); setFilterSubjectInput(''); setExpandedSetech(null) }}
                          className="text-ink-secondary hover:text-ink underline"
                        >
                          초기화
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 border-t border-line-light flex-shrink-0">
                    <button
                      onClick={() => setModalStep(2)}
                      className="w-full h-9 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-100 hover:border-ink-muted transition-all"
                    >
                      세특 없이 직접 작성
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {isFilterEmpty ? (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-3">🔬</div>
                      <div className="text-[14px] font-semibold text-ink-secondary mb-1.5">세특 사례를 선택해보세요</div>
                      <div className="text-[12px] text-ink-muted leading-relaxed">
                        왼쪽에서 학년, 학과, 과목을 선택하면<br />관련 세특 사례를 볼 수 있어요
                      </div>
                    </div>
                  ) : filteredSetech.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-3xl mb-2">🔍</div>
                      <div className="text-[13px] text-ink-muted font-medium">해당 조건의 세특 사례가 없어요.</div>
                      <div className="text-[12px] text-ink-muted mt-1">필터를 조정해보세요.</div>
                    </div>
                  ) : filteredSetech.map((s: any) => (
                    <div
                      key={s.id}
                      className={`border rounded-xl mb-2.5 overflow-hidden transition-all ${
                        expandedSetech === s.id ? 'border-brand-high bg-brand-high-pale/20' : 'border-line bg-white'
                      }`}
                    >
                      <div
                        onClick={() => setExpandedSetech(expandedSetech === s.id ? null : s.id)}
                        className="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-brand-high-pale/10 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full">{s.subject}</span>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{s.major}</span>
                            <span className="text-[11px] font-medium text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">{s.grade}</span>
                            <span className="text-[11px] text-ink-muted font-medium">{s.school}</span>
                          </div>
                          <div className="text-[13px] font-semibold text-ink leading-relaxed">{s.activity}</div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <span className="text-[11px] text-ink-muted font-medium">👁 {s.views?.toLocaleString()}</span>
                          <span className={`text-[14px] text-ink-muted transition-transform ${expandedSetech === s.id ? 'rotate-180' : ''}`}>∨</span>
                        </div>
                      </div>

                      {expandedSetech === s.id && (
                        <div className="px-4 pb-4 border-t border-line-light">
                          {[
                            { label: '세특 활동', text: s.activity, id: `activity-${s.id}` },
                            { label: '탐구 역량', text: s.competency, id: `competency-${s.id}` },
                          ].map(item => (
                            <div key={item.id} className="mt-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="text-[12px] font-bold text-ink">{item.label}</div>
                                <button
                                  onClick={() => copyText(item.text, item.id)}
                                  className={`text-[11px] font-semibold transition-colors ${
                                    copiedId === item.id ? 'text-emerald-600' : 'text-ink-secondary hover:text-brand-high-dark'
                                  }`}
                                >
                                  {copiedId === item.id ? '✓ 복사됨' : '📋 복사'}
                                </button>
                              </div>
                              <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2.5 text-[12px] text-ink leading-relaxed">
                                {item.text}
                              </div>
                            </div>
                          ))}

                          <div className="mt-3 mb-3.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="text-[12px] font-bold text-ink">세특 탐구</div>
                              <button
                                onClick={() => copyText(s.topics.join('\n'), `topics-${s.id}`)}
                                className={`text-[11px] font-semibold transition-colors ${
                                  copiedId === `topics-${s.id}` ? 'text-emerald-600' : 'text-ink-secondary hover:text-brand-high-dark'
                                }`}
                              >
                                {copiedId === `topics-${s.id}` ? '✓ 복사됨' : '📋 복사'}
                              </button>
                            </div>
                            <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2.5">
                              {s.topics.map((t: string, i: number) => (
                                <div key={i} className={`flex gap-2 ${i < s.topics.length - 1 ? 'mb-1.5' : ''}`}>
                                  <span className="text-brand-high-dark flex-shrink-0 text-[12px] font-bold">•</span>
                                  <span className="text-[12px] text-ink leading-relaxed">{t}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => selectSetech(s)}
                            className="w-full h-10 bg-brand-high text-white rounded-lg text-[13px] font-bold hover:bg-brand-high-dark transition-all shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                          >
                            이걸로 탐구주제 작성하기 →
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: 탐구 작성 */}
            {modalStep === 2 && (
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {selSetech && (
                  <div className="bg-brand-high-pale border border-brand-high-light rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold bg-brand-high text-white px-2 py-0.5 rounded-full flex-shrink-0">참고</span>
                    <span className="text-[12px] text-brand-high-dark font-semibold flex-1 min-w-0 truncate">
                      {selSetech.subject} · {selSetech.major} · {selSetech.school}
                    </span>
                    <button
                      onClick={() => { setSelSetech(null); setNewTopic({ title: '', subject: '', content: '' }) }}
                      className="text-[11px] text-ink-secondary hover:text-ink font-medium flex-shrink-0 transition-colors"
                    >
                      제거
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-[11px] font-semibold text-ink-secondary mb-1 block">탐구 제목 *</label>
                    <input
                      value={newTopic.title}
                      onChange={e => setNewTopic(p => ({ ...p, title: e.target.value }))}
                      placeholder="예: 기후변화가 농업 생산량에 미치는 영향 분석"
                      className="w-full h-11 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-brand-high transition-colors font-sans"
                    />
                  </div>

                  {/* 🎯 연계 과목 - 드롭다운 */}
                  <div>
                    <label className="text-[11px] font-semibold text-ink-secondary mb-1 block">
                      연계 과목 <span className="text-ink-muted font-normal">(여러 개 선택 가능)</span>
                    </label>
                    <SubjectSelect
                      value={newTopic.subject}
                      onChange={v => setNewTopic(p => ({ ...p, subject: v }))}
                      placeholder="과목을 선택하거나 직접 입력해주세요"
                      multi
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-ink-secondary">탐구 내용 *</label>
                      {selSetech && <span className="text-[11px] text-emerald-600 font-semibold">✓ 세특 내용이 자동으로 채워졌어요</span>}
                    </div>
                    <textarea
                      value={newTopic.content}
                      onChange={e => setNewTopic(p => ({ ...p, content: e.target.value }))}
                      placeholder="어떤 내용을 탐구하고 싶은지 자세히 작성해주세요"
                      rows={6}
                      className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none resize-none leading-relaxed focus:border-brand-high transition-colors font-sans"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={closeModal}
                    className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-all"
                  >
                    취소
                  </button>
                  <button
                    onClick={addTopic}
                    disabled={!newTopic.title.trim() || !newTopic.content.trim() || createResearch.isPending}
                    className={`flex-1 h-11 rounded-lg text-[13px] font-bold transition-all ${
                      newTopic.title && newTopic.content && !createResearch.isPending
                        ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
                        : 'bg-gray-200 text-ink-muted cursor-not-allowed'
                    }`}
                  >
                    {createResearch.isPending ? '저장 중...' : '작성하기'}
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