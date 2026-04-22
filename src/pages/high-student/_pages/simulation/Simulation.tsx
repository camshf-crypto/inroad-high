import { useState, useEffect, useRef } from 'react'

const QUESTION_TYPES = [
  { id: 'past', label: '5개년 핵심 기출문제', desc: '대학별 최근 5개년 기출 분석' },
  { id: 'expect', label: '생기부 예상문제', desc: '내 생기부 기반 예상 질문' },
  { id: 'ai', label: 'AI 문제 생성', desc: 'AI가 맞춤형 질문 생성' },
]

const QUESTION_MODES = [
  { id: 'text', label: '텍스트 표시', icon: '📝', desc: '질문을 화면에 보여줘요' },
  { id: 'voice', label: '음성만', icon: '🎙️', desc: '질문을 음성으로만 들려줘요' },
  { id: 'both', label: '텍스트 + 음성', icon: '📢', desc: '텍스트와 음성 동시에' },
]

const PAST_SCHOOLS = [
  { univ: '서울대학교', dept: '컴퓨터공학부' },
  { univ: '연세대학교', dept: '컴퓨터과학과' },
  { univ: '고려대학교', dept: '컴퓨터학과' },
  { univ: '한양대학교', dept: '소프트웨어학부' },
  { univ: '성균관대학교', dept: '소프트웨어학과' },
  { univ: '중앙대학교', dept: '소프트웨어학부' },
]

const EXPECT_SCHOOLS = [
  { univ: '서울대학교', dept: '컴퓨터공학부', grade: '고1' },
  { univ: '연세대학교', dept: '의과대학', grade: '고2' },
  { univ: '고려대학교', dept: '경영학과', grade: '고3' },
]

const ALL_UNIVS = ['서울대학교', '연세대학교', '고려대학교', '한양대학교', '성균관대학교', '중앙대학교', '경희대학교', '이화여자대학교', '가천대학교', '인하대학교']
const ALL_DEPTS = ['컴퓨터공학부', '의과대학', '간호학과', '경영학과', '법학과', '전기전자공학부', '기계공학부', '화학공학부', '생명과학과', '심리학과']

const MOCK_QUESTIONS = [
  { id: 1, text: '본인을 한 단어로 표현한다면?' },
  { id: 2, text: '고등학교 생활 중 가장 의미 있었던 경험을 말해보세요.' },
  { id: 3, text: '지원 학과를 선택한 구체적인 계기가 있나요?' },
  { id: 4, text: '본인의 장점이 학과 공부에 어떻게 도움이 될까요?' },
  { id: 5, text: '10년 후 본인의 모습을 어떻게 그리고 있나요?' },
]

const INTERVIEWERS = [
  { id: 1, emoji: '👨‍💼', name: '면접관 1' },
  { id: 2, emoji: '👨‍🏫', name: '면접관 2' },
  { id: 3, emoji: '👩‍💼', name: '면접관 3' },
]

export default function Simulation() {
  const [step, setStep] = useState<'list' | 'setup' | 'countdown' | 'interview' | 'result'>('list')
  const [questionType, setQuestionType] = useState<string>('')
  const [tailQ, setTailQ] = useState<boolean | null>(null)
  const [questionMode, setQuestionMode] = useState<string>('')
  const [selSchool, setSelSchool] = useState<any>(null)
  const [selUniv, setSelUniv] = useState('')
  const [selDept, setSelDept] = useState('')
  const [countdown, setCountdown] = useState(10)
  const [curQIdx, setCurQIdx] = useState(0)
  const [timer, setTimer] = useState(80)
  const [timerRunning, setTimerRunning] = useState(false)
  const [showQuestion, setShowQuestion] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [activeInterviewer, setActiveInterviewer] = useState(0)
  const [selSim, setSelSim] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const timerRef = useRef<any>(null)
  const interviewerRef = useRef<any>(null)

  const [simHistory, setSimHistory] = useState([
    { id: 1, date: '2026.04.14', title: '가천대학교 간호학과', tags: ['인성 질문', '기본질문', '꼬리질문'], duration: '00:13', transcript: '인로드니까 어... 그렇지 그렇지 어려운 상황에 타인의 도움 경험이 있습니다. 그를 통해 저는 공감을 배웠습니다.', teacherFeedback: '' },
    { id: 2, date: '2026.04.10', title: '서울대학교 컴퓨터공학부', tags: ['전공 질문', '기출문제'], duration: '00:18', transcript: '고2 때 들은 인공지능 수업이 가장 인상 깊었습니다. 음... 그래서 AI에 관심을 갖게 됐어요.', teacherFeedback: '답변 구조가 좋아요!' },
    { id: 3, date: '2026.04.05', title: '연세대학교 의과대학', tags: ['인성 질문', '생기부 예상'], duration: '00:21', transcript: '저는 봉사활동을 통해 의사라는 직업에 관심을 갖게 됐습니다.', teacherFeedback: '' },
  ])

  useEffect(() => {
    if (step !== 'countdown') return
    if (countdown <= 0) { setStep('interview'); setTimerRunning(true); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [step, countdown])

  useEffect(() => {
    if (!timerRunning) return
    if (timer <= 0) { setTimerRunning(false); return }
    timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timerRunning, timer])

  useEffect(() => {
    if (step !== 'interview') return
    interviewerRef.current = setInterval(() => setActiveInterviewer(Math.floor(Math.random() * 3)), 3000)
    return () => clearInterval(interviewerRef.current)
  }, [step])

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const nextQuestion = () => {
    if (curQIdx >= MOCK_QUESTIONS.length - 1) { setStep('result'); return }
    setCurQIdx(i => i + 1); setTimer(80); setTimerRunning(true); setIsRecording(false)
  }

  const getSelectedTitle = () => {
    if (questionType === 'ai') return selUniv && selDept ? `${selUniv} · ${selDept}` : ''
    return selSchool ? `${selSchool.univ} · ${selSchool.dept}` : ''
  }

  const canStart = questionType && tailQ !== null && questionMode && getSelectedTitle()

  const startSimulation = () => {
    if (!canStart) return
    setCountdown(10); setStep('countdown'); setCurQIdx(0); setTimer(80)
    setShowQuestion(questionMode !== 'voice')
  }

  const deleteSim = (id: number) => {
    setSimHistory(prev => prev.filter(s => s.id !== id))
    if (selSim?.id === id) setSelSim(null)
    setDeleteTarget(null)
  }

  const resetSetup = () => {
    setQuestionType(''); setTailQ(null); setQuestionMode('')
    setSelSchool(null); setSelUniv(''); setSelDept('')
  }

  const toggleType = (id: string) => {
    if (questionType === id) { setQuestionType(''); setSelSchool(null); setSelUniv(''); setSelDept('') }
    else { setQuestionType(id); setSelSchool(null); setSelUniv(''); setSelDept('') }
  }

  // ═══════════════════════════════════════════
  // 1. 목록 화면
  // ═══════════════════════════════════════════
  if (step === 'list') {
    return (
      <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">
        <div className="flex gap-4 flex-1 overflow-hidden">

          {/* 왼쪽: 시뮬레이션 목록 */}
          <div className="w-[340px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-3 border-b border-line-light flex-shrink-0">
              <div className="text-[14px] font-bold text-ink tracking-tight">면접 시뮬레이션</div>
              <div className="text-[11px] text-ink-secondary mt-1 font-medium">
                총 <span className="text-brand-high-dark font-bold">{simHistory.length}개</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {simHistory.length === 0 ? (
                <div className="text-center py-10 text-ink-muted">
                  <div className="text-3xl mb-2">🎙️</div>
                  <div className="text-[12px] font-medium">시뮬레이션 기록이 없어요.</div>
                </div>
              ) : simHistory.map(s => (
                <div
                  key={s.id}
                  onClick={() => { setSelSim(s); setIsPlaying(false) }}
                  className={`border rounded-xl px-3 py-2.5 mb-1.5 cursor-pointer transition-all relative ${
                    selSim?.id === s.id
                      ? 'border-brand-high bg-brand-high-pale shadow-[0_2px_8px_rgba(37,99,235,0.1)]'
                      : 'border-line bg-white hover:border-brand-high-light hover:shadow-sm'
                  }`}
                >
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(s.id) }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 text-[10px] text-ink-secondary flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                  <div className="text-[10px] text-ink-muted mb-1 font-medium">{s.date}</div>
                  <div className="text-[12px] font-semibold text-ink mb-1.5 pr-5">{s.title}</div>
                  <div className="flex gap-1 flex-wrap">
                    {s.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale border border-brand-high-light px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-line-light flex-shrink-0">
              <button
                onClick={() => setStep('setup')}
                className="w-full h-11 bg-brand-high text-white rounded-xl text-[13px] font-bold hover:bg-brand-high-dark transition-all shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
              >
                + 시작하기
              </button>
            </div>
          </div>

          {/* 오른쪽: 상세 */}
          <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            {!selSim ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                <div className="text-4xl">🎙️</div>
                <div className="text-[14px] font-semibold text-ink-secondary">시뮬레이션을 선택해주세요</div>
                <div className="text-[12px]">왼쪽에서 기록을 클릭하면 피드백을 볼 수 있어요</div>
              </div>
            ) : (
              <>
                <div className="px-5 py-3.5 border-b border-line-light flex-shrink-0">
                  <div className="text-[14px] font-bold text-ink tracking-tight mb-1">{selSim.title}</div>
                  <div className="text-[11px] text-ink-muted font-medium">{selSim.date} · {selSim.duration}</div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
                  {/* 녹음 파일 */}
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">녹음 파일</div>
                    <div className="bg-gray-50 border border-line-light rounded-lg px-4 py-3 flex items-center gap-3">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-9 h-9 rounded-full bg-brand-high text-white cursor-pointer text-[14px] flex items-center justify-center flex-shrink-0 hover:bg-brand-high-dark transition-all shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                      >
                        {isPlaying ? '⏸' : '▶'}
                      </button>
                      <div className="flex-1">
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                          <div
                            className="h-full bg-brand-high rounded-full transition-all duration-300"
                            style={{ width: isPlaying ? '40%' : '0%' }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-ink-muted font-medium">
                          <span>{isPlaying ? '00:05' : '00:00'}</span>
                          <span>{selSim.duration}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">음성 텍스트 변환</div>
                      <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2.5 text-[13px] text-ink leading-relaxed">
                        {selSim.transcript}
                      </div>
                    </div>
                  </div>

                  {/* 피드백 */}
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">선생님 피드백</div>
                    {selSim.teacherFeedback ? (
                      <div className="bg-brand-high-pale border border-brand-high-light rounded-lg px-3 py-2.5 text-[13px] text-brand-high-dark leading-relaxed">
                        {selSim.teacherFeedback}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                        선생님 피드백을 기다리는 중이에요.
                      </div>
                    )}
                  </div>

                  {/* 태그 */}
                  <div>
                    <div className="text-[11px] font-bold text-ink-secondary mb-2">태그</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {selSim.tags.map((tag: string, i: number) => (
                        <span key={i} className="text-[11px] font-semibold text-brand-high-dark bg-brand-high-pale border border-brand-high-light px-2.5 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 답변한 질문 */}
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="text-[11px] font-bold text-ink-secondary mb-2">답변한 질문</div>
                    {MOCK_QUESTIONS.map((q, i) => (
                      <div key={q.id} className="flex gap-2 mb-2 text-[12px] text-ink leading-relaxed">
                        <span className="text-orange-500 flex-shrink-0 font-extrabold">Q{i + 1}.</span>
                        <span>{q.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 삭제 확인 모달 */}
        {deleteTarget !== null && (
          <div
            onClick={() => setDeleteTarget(null)}
            className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-7 w-full max-w-[400px] text-center shadow-2xl"
            >
              <div className="text-3xl mb-3">⚠️</div>
              <div className="text-[16px] font-bold text-ink mb-2">시뮬레이션을 삭제하시겠어요?</div>
              <div className="text-[13px] text-ink-secondary mb-6 leading-relaxed">
                삭제하면 녹음 파일과 피드백이 모두 사라져요.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={() => deleteSim(deleteTarget)}
                  className="flex-1 h-11 bg-red-600 text-white rounded-lg text-[13px] font-bold hover:bg-red-700 transition-all shadow-[0_2px_8px_rgba(220,38,38,0.2)]"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // 2. 설정 모달
  // ═══════════════════════════════════════════
  if (step === 'setup') {
    return (
      <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-7 w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[16px] font-bold text-ink tracking-tight">시뮬레이션 설정</div>
            <button onClick={() => setStep('list')} className="text-ink-secondary text-lg hover:text-ink">✕</button>
          </div>

          {/* 헤더 배너 */}
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl px-5 py-4 mb-5 flex items-center gap-3 shadow-[0_8px_20px_rgba(249,115,22,0.2)]">
            <div className="text-4xl">🤖</div>
            <div>
              <div className="text-[11px] bg-white/30 text-white px-2 py-0.5 rounded-full inline-block mb-1 font-semibold">
                기초부터 차근차근 해보자!
              </div>
              <div className="text-[15px] font-extrabold text-white">원하는 문제 유형을 골라주세요!</div>
              <div className="text-[12px] text-white/90 font-medium">하나만 선택해서 시작해요.</div>
            </div>
          </div>

          {/* 문제 유형 */}
          <div className="mb-5">
            <div className="text-[13px] font-bold text-ink mb-2.5">문제 유형 (1개 선택)</div>
            <div className="flex flex-col gap-2">

              {/* 기출문제 */}
              <div>
                <button
                  onClick={() => toggleType('past')}
                  className={`w-full flex items-center justify-between px-4 py-3 border-[1.5px] rounded-xl transition-all ${
                    questionType === 'past'
                      ? 'border-brand-high bg-brand-high-pale'
                      : 'border-line bg-white hover:border-brand-high-light'
                  }`}
                >
                  <div className="text-left">
                    <div className="text-[13px] font-bold text-ink">5개년 핵심 기출문제</div>
                    <div className="text-[11px] text-ink-secondary font-medium">대학별 최근 5개년 기출 분석</div>
                  </div>
                  {questionType === 'past' && (
                    <div className="w-5 h-5 rounded-full bg-brand-high flex items-center justify-center text-white text-[11px] font-bold">✓</div>
                  )}
                </button>
                {questionType === 'past' && (
                  <div className="bg-brand-high-pale/50 border border-brand-high-light rounded-lg px-4 py-3 mt-1.5">
                    <div className="text-[11px] font-bold text-brand-high-dark mb-2">🎓 기출문제 등록한 학교 선택</div>
                    <div className="flex flex-col gap-1.5">
                      {PAST_SCHOOLS.map((s, i) => {
                        const selected = selSchool?.univ === s.univ && selSchool?.dept === s.dept
                        return (
                          <button
                            key={i}
                            onClick={() => setSelSchool(selected ? null : s)}
                            className={`flex items-center justify-between px-3 py-2 border rounded-lg transition-all ${
                              selected
                                ? 'border-brand-high bg-brand-high-pale'
                                : 'border-line bg-white hover:border-brand-high-light'
                            }`}
                          >
                            <span className="text-[12px] text-ink">{s.univ} · {s.dept}</span>
                            {selected && <span className="text-[11px] text-brand-high-dark font-bold">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 생기부 예상문제 */}
              <div>
                <button
                  onClick={() => toggleType('expect')}
                  className={`w-full flex items-center justify-between px-4 py-3 border-[1.5px] rounded-xl transition-all ${
                    questionType === 'expect'
                      ? 'border-brand-high bg-brand-high-pale'
                      : 'border-line bg-white hover:border-brand-high-light'
                  }`}
                >
                  <div className="text-left">
                    <div className="text-[13px] font-bold text-ink">생기부 예상문제</div>
                    <div className="text-[11px] text-ink-secondary font-medium">내 생기부 기반 예상 질문</div>
                  </div>
                  {questionType === 'expect' && (
                    <div className="w-5 h-5 rounded-full bg-brand-high flex items-center justify-center text-white text-[11px] font-bold">✓</div>
                  )}
                </button>
                {questionType === 'expect' && (
                  <div className="bg-brand-high-pale/50 border border-brand-high-light rounded-lg px-4 py-3 mt-1.5">
                    <div className="text-[11px] font-bold text-brand-high-dark mb-2">📋 생기부 예상질문 등록한 학교 선택</div>
                    <div className="flex flex-col gap-1.5">
                      {EXPECT_SCHOOLS.map((s, i) => {
                        const selected = selSchool?.univ === s.univ && selSchool?.dept === s.dept
                        return (
                          <button
                            key={i}
                            onClick={() => setSelSchool(selected ? null : s)}
                            className={`flex items-center justify-between px-3 py-2 border rounded-lg transition-all ${
                              selected
                                ? 'border-brand-high bg-brand-high-pale'
                                : 'border-line bg-white hover:border-brand-high-light'
                            }`}
                          >
                            <div className="text-left">
                              <span className="text-[12px] text-ink">{s.univ} · {s.dept}</span>
                              <span className="text-[10px] text-ink-secondary ml-1.5 font-medium">{s.grade}</span>
                            </div>
                            {selected && <span className="text-[11px] text-brand-high-dark font-bold">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* AI 문제 생성 */}
              <div>
                <button
                  onClick={() => toggleType('ai')}
                  className={`w-full flex items-center justify-between px-4 py-3 border-[1.5px] rounded-xl transition-all ${
                    questionType === 'ai'
                      ? 'border-brand-high bg-brand-high-pale'
                      : 'border-line bg-white hover:border-brand-high-light'
                  }`}
                >
                  <div className="text-left">
                    <div className="text-[13px] font-bold text-ink">AI 문제 생성</div>
                    <div className="text-[11px] text-ink-secondary font-medium">AI가 맞춤형 질문 생성</div>
                  </div>
                  {questionType === 'ai' && (
                    <div className="w-5 h-5 rounded-full bg-brand-high flex items-center justify-center text-white text-[11px] font-bold">✓</div>
                  )}
                </button>
                {questionType === 'ai' && (
                  <div className="bg-brand-high-pale/50 border border-brand-high-light rounded-lg px-4 py-3 mt-1.5">
                    <div className="text-[11px] font-bold text-brand-high-dark mb-2">🤖 학교 · 학과 직접 선택</div>
                    <div className="flex gap-2">
                      <select
                        value={selUniv}
                        onChange={e => setSelUniv(e.target.value)}
                        className="flex-1 h-9 border border-line rounded-lg px-2.5 text-[12px] outline-none bg-white focus:border-brand-high transition-colors font-sans"
                      >
                        <option value=''>학교 선택</option>
                        {ALL_UNIVS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <select
                        value={selDept}
                        onChange={e => setSelDept(e.target.value)}
                        className="flex-1 h-9 border border-line rounded-lg px-2.5 text-[12px] outline-none bg-white focus:border-brand-high transition-colors font-sans"
                      >
                        <option value=''>학과 선택</option>
                        {ALL_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    {selUniv && selDept && (
                      <div className="mt-2 text-[11px] font-bold text-brand-high-dark bg-brand-high-pale px-2.5 py-1 rounded-md inline-block">
                        ✓ {selUniv} · {selDept}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 꼬리질문 */}
          <div className="mb-5">
            <div className="text-[13px] font-bold text-ink mb-2.5">꼬리질문</div>
            <div className="flex gap-2.5">
              {[{ val: true, label: 'ON' }, { val: false, label: 'OFF' }].map(o => (
                <button
                  key={String(o.val)}
                  onClick={() => setTailQ(o.val)}
                  className={`flex-1 h-11 flex items-center justify-center border-[1.5px] rounded-xl text-[14px] transition-all ${
                    tailQ === o.val
                      ? 'border-brand-high bg-brand-high-pale text-brand-high-dark font-bold'
                      : 'border-line bg-white text-ink-secondary hover:border-brand-high-light font-semibold'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 질문 방식 */}
          <div className="mb-6">
            <div className="text-[13px] font-bold text-ink mb-2.5">질문 방식</div>
            <div className="flex flex-col gap-2">
              {QUESTION_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setQuestionMode(m.id)}
                  className={`flex items-center gap-3 px-4 py-3 border-[1.5px] rounded-xl transition-all ${
                    questionMode === m.id
                      ? 'border-brand-high bg-brand-high-pale'
                      : 'border-line bg-white hover:border-brand-high-light'
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <div className="text-left flex-1">
                    <div className="text-[13px] font-bold text-ink">{m.label}</div>
                    <div className="text-[11px] text-ink-secondary font-medium">{m.desc}</div>
                  </div>
                  {questionMode === m.id && (
                    <div className="w-5 h-5 rounded-full bg-brand-high flex items-center justify-center text-white text-[11px] font-bold">✓</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startSimulation}
            disabled={!canStart}
            className={`w-full h-12 rounded-xl text-[14px] font-bold transition-all ${
              canStart
                ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_4px_12px_rgba(37,99,235,0.25)]'
                : 'bg-gray-200 text-ink-muted cursor-not-allowed'
            }`}
          >
            다음으로
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // 3. 카운트다운
  // ═══════════════════════════════════════════
  if (step === 'countdown') {
    const title = questionType === 'ai' ? `${selUniv} · ${selDept}` : `${selSchool?.univ} · ${selSchool?.dept}`
    return (
      <div className="h-full bg-gray-50 flex flex-col items-center justify-center gap-5 font-sans text-ink">
        <div className="flex gap-2.5 mb-2">
          <span className="text-[12px] bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1 rounded-full font-bold">
            {QUESTION_TYPES.find(t => t.id === questionType)?.label}
          </span>
          <span className="text-[12px] bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full font-bold">
            꼬리질문 {tailQ ? 'ON' : 'OFF'}
          </span>
        </div>
        <div className="text-[18px] font-extrabold text-ink tracking-tight">{title}</div>
        <div className="text-7xl mb-2 animate-bounce">🤖</div>
        <div className="text-[16px] text-ink-secondary text-center leading-relaxed font-medium">
          잠시 후 면접이 시작돼요.<br />
          깊게 숨 한번 쉬고, 천천히 호흡을 가다듬어볼까요?
        </div>
        <div className="w-20 h-20 rounded-full bg-white border-[3px] border-red-500 flex items-center justify-center text-3xl font-extrabold text-red-500 mt-3 shadow-[0_8px_24px_rgba(239,68,68,0.2)]">
          {countdown}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // 4. 면접 화면
  // ═══════════════════════════════════════════
  if (step === 'interview') {
    const curQ = MOCK_QUESTIONS[curQIdx]
    const title = questionType === 'ai' ? `${selUniv} · ${selDept}` : `${selSchool?.univ} · ${selSchool?.dept}`
    return (
      <div className="h-full bg-black flex flex-col overflow-hidden relative font-sans">
        {/* 상단 바 */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3">
          <button
            onClick={() => setStep('list')}
            className="text-[13px] text-white/80 hover:text-white font-semibold transition-colors"
          >
            ← 처음으로
          </button>
          <div className="text-[14px] font-bold text-white tracking-tight">실전 면접 시뮬레이션</div>
          <div className="text-[12px] text-white/60 font-medium">고민하는 시간도 성장의 일부예요!</div>
        </div>

        {/* 서브 바 */}
        <div className="absolute top-11 left-0 right-0 z-10 flex items-center gap-2 px-5 py-1.5">
          <span className="text-[11px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold">
            {QUESTION_TYPES.find(t => t.id === questionType)?.label}
          </span>
          <span className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
            꼬리질문 {tailQ ? 'ON' : 'OFF'}
          </span>
          <span className="text-[11px] text-white/60 font-medium">{title}</span>
        </div>

        {/* 타이머 */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-black/70 backdrop-blur-sm rounded-full px-3.5 py-1 flex items-center gap-1.5 border border-white/20">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[14px] font-bold text-white font-mono">{formatTime(timer)} / 01:20</span>
          </div>
        </div>

        {/* 면접관 영역 */}
        <div className="flex-1 flex items-center justify-center pt-20 pb-32">
          <div className="flex gap-1 w-full h-full">
            {INTERVIEWERS.map((iv, i) => (
              <div
                key={iv.id}
                className={`flex-1 flex flex-col items-center justify-center rounded transition-all ${
                  activeInterviewer === i
                    ? 'bg-indigo-950 border border-brand-high/50 shadow-[0_0_30px_rgba(37,99,235,0.2)]'
                    : 'bg-gray-950'
                }`}
              >
                <div className="text-6xl mb-2">{iv.emoji}</div>
                <div className="text-[12px] text-white/40 font-medium">{iv.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 질문 바 */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/95 to-transparent px-6 py-5">
          <div className="text-[11px] text-orange-300 mb-1.5 font-medium">
            *{QUESTION_TYPES.find(t => t.id === questionType)?.label} 중 {MOCK_QUESTIONS.length}문제가 무작위로 출제됩니다.
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {showQuestion ? (
                <div className="text-[20px] font-bold text-white">
                  <span className="text-orange-400">질문 {curQIdx + 1}. </span>{curQ.text}
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="text-[20px] font-bold text-white">
                    <span className="text-orange-400">질문 {curQIdx + 1}. </span>
                    <span className="bg-white/20 rounded px-2 py-0.5 text-white/50 text-[14px]">음성으로 확인하세요</span>
                  </div>
                  <button
                    onClick={() => setShowQuestion(true)}
                    className="text-[11px] text-orange-400 bg-orange-400/20 border border-orange-400 rounded-md px-2.5 py-1 hover:bg-orange-400/30 transition-all font-semibold"
                  >
                    텍스트 보기
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 flex-shrink-0">
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`h-11 px-5 rounded-lg text-[13px] font-bold transition-all ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)] animate-pulse'
                    : 'bg-brand-high hover:bg-brand-high-dark text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                }`}
              >
                {isRecording ? '⏹ 답변 종료' : '● 답변 시작'}
              </button>
              <button
                onClick={nextQuestion}
                className="h-11 px-5 bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-lg text-[13px] font-semibold transition-all"
              >
                다음 질문 →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // 5. 결과 화면
  // ═══════════════════════════════════════════
  if (step === 'result') {
    return (
      <div className="px-7 py-6 font-sans text-ink">
        <div className="flex items-center gap-2.5 mb-5">
          <button
            onClick={() => setStep('list')}
            className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-ink-secondary hover:bg-gray-50 transition-all"
          >
            ←
          </button>
          <div className="text-[16px] font-bold text-ink tracking-tight">시뮬레이션 완료</div>
        </div>

        <div className="text-center py-10 mb-6">
          <div className="text-6xl mb-3">🎉</div>
          <div className="text-[22px] font-extrabold text-ink tracking-tight mb-1.5">면접 시뮬레이션 완료!</div>
          <div className="text-[14px] text-ink-secondary font-medium">
            총 {MOCK_QUESTIONS.length}개 질문에 답변했어요.
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="bg-white border border-line rounded-2xl p-5 mb-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="text-[14px] font-bold text-ink mb-3.5 tracking-tight">이번 시뮬레이션 요약</div>
          <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
            {[
              { label: '답변한 질문', val: `${MOCK_QUESTIONS.length}개` },
              { label: '문제 유형', val: QUESTION_TYPES.find(t => t.id === questionType)?.label || '' },
              { label: '꼬리질문', val: tailQ ? 'ON' : 'OFF' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 border border-line-light rounded-xl px-4 py-3 text-center">
                <div className="text-[11px] text-ink-muted mb-1 font-semibold">{s.label}</div>
                <div className="text-[14px] font-bold text-ink">{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 피드백 대기 */}
        <div className="bg-brand-high-pale border border-brand-high-light rounded-xl px-5 py-4 mb-5">
          <div className="text-[13px] font-bold text-brand-high-dark mb-1">💬 선생님 피드백 대기중</div>
          <div className="text-[12px] text-ink-secondary leading-relaxed font-medium">
            선생님이 녹음 내용을 분석하고 피드백을 남겨드릴 예정이에요.
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2.5 max-md:flex-col">
          <button
            onClick={() => { setStep('setup'); resetSetup() }}
            className="flex-1 h-12 bg-brand-high text-white rounded-xl text-[14px] font-bold hover:bg-brand-high-dark transition-all shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
          >
            다시 시뮬레이션하기
          </button>
          <button
            onClick={() => setStep('list')}
            className="flex-1 h-12 bg-white text-ink-secondary border border-line rounded-xl text-[14px] font-semibold hover:bg-gray-50 transition-all"
          >
            목록으로
          </button>
        </div>
      </div>
    )
  }

  return null
}