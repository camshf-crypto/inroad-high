import { useState, useEffect, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '../../_store/auth'

const QUESTION_TYPES = [
  { id: 'past', label: '기출문제', desc: '자사고·특목고 기출 면접 질문' },
  { id: 'essay', label: '자소서 예상질문', desc: '내 자소서 기반 예상 질문' },
  { id: 'record', label: '생기부 예상질문', desc: '생활기록부 기반 예상 질문' },
]

const QUESTION_MODES = [
  { id: 'text', label: '텍스트 표시', icon: '📝', desc: '질문을 화면에 보여줘요' },
  { id: 'voice', label: '음성만', icon: '🎙️', desc: '질문을 음성으로만 들려줘요' },
  { id: 'both', label: '텍스트 + 음성', icon: '📢', desc: '텍스트와 음성 동시에' },
]

const PAST_SCHOOLS = [
  '인천하늘고', '한국과학영재학교', '경기과학고', '서울과학고', '한성과학고',
  '세종과학고', '대전과학고', '광주과학고', '대구과학고', '부산과학고',
  '경남과학고', '전북과학고', '제주과학고', '강원과학고', '충북과학고',
  '대원외고', '대일외고', '명덕외고', '서울외고', '이화외고', '한영외고',
  '경기외고', '과천외고', '김포외고', '안양외고', '인천외고', '부산외고',
  '대구외고', '광주외고', '대전외고', '전북외고', '충남외고',
  '민족사관고', '하나고', '외대부고', '북일고', '상산고', '현대청운고',
  '포항제철고', '김천고', '휘문고', '중동고', '세화고', '양정고', '배재고',
  '이대부고', '숭문고', '신일고', '경희고', '한대부고', '성균관고',
  '동성고', '보성고', '용산고', '서울고', '경기고', '경복고', '대광고',
  '영동고', '진선여고', '숙명여고', '이화여고', '덕성여고', '창덕여고',
  '광성고', '광신고', '대신고', '서라벌고', '오산고', '한성고',
  '강서고', '구현고', '덕수고', '명일고', '배명고', '선덕고',
  '성동고', '수도고', '신도림고', '신목고', '양천고', '은광여고',
  '자양고', '장훈고', '풍문고', '한가람고', '홍익대부고', '화곡고',
  '광문고', '금천고', '대림고', '목동고', '문성고', '서서울생활과학고',
  '신림고', '신서고', '영일고', '우신고', '인헌고', '조원고',
  '경문고', '경신고', '광남고', '동대문고', '동성고', '성수고',
  '용문고', '청량고', '한양공고', '휘경여고', '선일여고', '성동글로벌경영고',
  '강일고', '고려고', '명성고', '성동고', '성일고', '천호고',
  '고원고', '면목고', '서울체고', '성심여고', '신현고', '중랑고',
  '공항고', '대진고', '도봉고', '방학고', '성북고', '수락고',
  '숭인고', '창동고', '한천고', '혜성여고', '의정부고', '양주고',
  '고양고', '백석고', '일산고', '화정고', '분당고', '성남고',
  '수원고', '매탄고', '영통고', '수원외고', '안산고', '안산동산고',
]

const ESSAY_SCHOOLS = [
  { school: '인천하늘고', date: '2024.03.15' },
  { school: '대원외고', date: '2024.03.20' },
]

const RECORD_SCHOOLS = [
  { school: '인천하늘고', date: '2024.04.01' },
]

const MOCK_QUESTIONS = [
  { id: 1, text: '이 학교에 지원한 구체적인 이유를 말해보세요.' },
  { id: 2, text: '자기주도학습 경험을 구체적으로 말해보세요.' },
  { id: 3, text: '입학 후 어떤 활동을 통해 꿈을 키워나갈 계획인가요?' },
  { id: 4, text: '배려나 나눔을 실천한 경험을 말해보세요.' },
  { id: 5, text: '졸업 후 진로 계획을 구체적으로 말해보세요.' },
]

const INTERVIEWERS = [
  { id: 1, emoji: '👨‍💼', name: '면접관 1' },
  { id: 2, emoji: '👨‍🏫', name: '면접관 2' },
  { id: 3, emoji: '👩‍💼', name: '면접관 3' },
]

export default function MiddleSimulation() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const [step, setStep] = useState<'list' | 'setup' | 'countdown' | 'interview' | 'result'>('list')
  const [questionType, setQuestionType] = useState('')
  const [tailQ, setTailQ] = useState<boolean | null>(null)
  const [questionMode, setQuestionMode] = useState('')
  const [selSchool, setSelSchool] = useState('')
  const [pastSchoolSearch, setPastSchoolSearch] = useState('')
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
    { id: 1, date: '2026.04.14', title: '인천하늘고 · 기출문제', tags: ['기출문제', '꼬리질문ON'], duration: '00:13', transcript: '인천하늘고에 지원한 이유는 자기주도학습 전형이 저와 맞는다고 생각했기 때문입니다.', teacherFeedback: '' },
    { id: 2, date: '2026.04.10', title: '인천하늘고 · 자소서 예상질문', tags: ['자소서', '꼬리질문OFF'], duration: '00:18', transcript: '제 자소서에서 가장 강조한 부분은 3년간의 독서 활동입니다.', teacherFeedback: '답변 구조가 좋아요! 더 구체적인 사례를 추가해보세요.' },
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

  const canStart = questionType && tailQ !== null && questionMode && selSchool

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
    setSelSchool(''); setPastSchoolSearch('')
  }

  const toggleType = (id: string) => {
    if (questionType === id) { setQuestionType(''); setSelSchool(''); setPastSchoolSearch('') }
    else { setQuestionType(id); setSelSchool(''); setPastSchoolSearch('') }
  }

  const filteredPastSchools = PAST_SCHOOLS.filter(s => s.includes(pastSchoolSearch))

  // ── 목록 화면 ──
  if (step === 'list') return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* 왼쪽 */}
        <div className="w-[340px] flex-shrink-0 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="px-3.5 py-3 border-b border-line flex-shrink-0">
            <div className="text-[14px] font-bold text-ink tracking-tight">면접 시뮬레이션</div>
            <div className="text-[11px] text-ink-secondary mt-0.5">총 <span className="text-brand-middle-dark font-bold">{simHistory.length}개</span></div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2.5">
            {simHistory.length === 0 ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">
                <div className="text-3xl mb-2">🎙️</div>
                시뮬레이션 기록이 없어요.
              </div>
            ) : simHistory.map(s => (
              <div
                key={s.id}
                onClick={() => { setSelSim(s); setIsPlaying(false) }}
                className={`border rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all relative ${
                  selSim?.id === s.id
                    ? 'border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                    : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                }`}
              >
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(s.id) }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 text-ink-muted flex items-center justify-center text-[10px] transition-colors"
                >
                  ✕
                </button>
                <div className="text-[10px] text-ink-muted font-medium mb-1">{s.date}</div>
                <div className="text-[12.5px] font-semibold text-ink mb-1.5 pr-6">{s.title}</div>
                <div className="flex gap-1 flex-wrap">
                  {s.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full border border-brand-middle-light">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-line flex-shrink-0">
            <button
              onClick={() => setStep('setup')}
              className="w-full h-11 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px hover:shadow-btn-middle"
            >
              + 모의면접 시작하기
            </button>
          </div>
        </div>

        {/* 오른쪽 */}
        <div className="flex-1 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          {!selSim ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">🎙️</div>
              <div className="text-[14px] font-semibold text-ink-secondary">시뮬레이션을 선택해주세요</div>
              <div className="text-[12px]">왼쪽에서 기록을 클릭하면 피드백을 볼 수 있어요</div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
                <div className="text-[14px] font-extrabold text-ink tracking-tight mb-1">{selSim.title}</div>
                <div className="text-[11px] text-ink-muted font-medium">{selSim.date} · {selSim.duration}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

                {/* 녹음 플레이어 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">녹음 파일</div>
                  <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-10 h-10 rounded-full bg-brand-middle hover:bg-brand-middle-hover text-white flex items-center justify-center text-sm flex-shrink-0 transition-all hover:scale-105 shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                    <div className="flex-1">
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                        <div
                          className="h-full bg-brand-middle rounded-full transition-all duration-300"
                          style={{ width: isPlaying ? '40%' : '0%' }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-ink-muted font-medium">
                        <span>{isPlaying ? '00:05' : '00:00'}</span>
                        <span>{selSim.duration}</span>
                      </div>
                    </div>
                  </div>

                  {/* 음성 텍스트 변환 */}
                  <div className="mt-3">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">음성 텍스트 변환</div>
                    <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8]">{selSim.transcript}</div>
                  </div>
                </div>

                {/* 선생님 피드백 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">선생님 피드백</div>
                  {selSim.teacherFeedback ? (
                    <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8]">{selSim.teacherFeedback}</div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">선생님 피드백을 기다리는 중이에요.</div>
                  )}
                </div>

                {/* 태그 */}
                <div>
                  <div className="text-[11px] font-semibold text-ink-secondary mb-2">태그</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {selSim.tags.map((tag: string, i: number) => (
                      <span key={i} className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2.5 py-1 rounded-full border border-brand-middle-light">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 답변한 질문 */}
                <div className="bg-gray-50 border border-line rounded-xl px-4 py-3.5">
                  <div className="text-[11px] font-semibold text-ink-secondary mb-2">답변한 질문</div>
                  {MOCK_QUESTIONS.map((q, i) => (
                    <div key={q.id} className="flex gap-2 mb-2 text-[12px] text-ink leading-[1.5]">
                      <span className="text-brand-middle-dark flex-shrink-0 font-bold">Q{i + 1}.</span>
                      {q.text}
                    </div>
                  ))}
                </div>

              </div>
            </>
          )}
        </div>
      </div>

      {/* 삭제 모달 */}
      {deleteTarget !== null && (
        <div
          onClick={() => setDeleteTarget(null)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[380px] text-center shadow-[0_24px_64px_rgba(0,0,0,0.2)]"
          >
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-[16px] font-bold text-ink mb-2 tracking-tight">시뮬레이션을 삭제하시겠어요?</div>
            <div className="text-[13px] text-ink-secondary mb-6 leading-[1.6]">삭제하면 녹음 파일과 피드백이 모두 사라져요.</div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => deleteSim(deleteTarget)}
                className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ── 설정 모달 ──
  if (step === 'setup') return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-7 w-[540px] max-h-[92vh] overflow-y-auto shadow-[0_24px_64px_rgba(0,0,0,0.2)] font-sans text-ink">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[17px] font-extrabold text-ink tracking-tight">시뮬레이션 설정</div>
          <button
            onClick={() => setStep('list')}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-ink-secondary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 히어로 배너 */}
        <div className="bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-xl px-5 py-4 mb-5 flex items-center gap-3 relative overflow-hidden shadow-[0_8px_24px_rgba(16,185,129,0.2)]">
          <div
            className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }}
          />
          <div className="text-4xl relative">🤖</div>
          <div className="relative">
            <div className="text-[11px] bg-white/20 backdrop-blur-sm text-white font-semibold px-2 py-0.5 rounded-full inline-block mb-1">
              기초부터 차근차근 해보자!
            </div>
            <div className="text-[15px] font-extrabold text-white tracking-tight">원하는 문제 유형을 골라주세요!</div>
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
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  questionType === 'past'
                    ? 'border-brand-middle bg-brand-middle-pale'
                    : 'border-line bg-white hover:border-brand-middle-light'
                }`}
              >
                <div>
                  <div className="text-[13px] font-bold text-ink">🎓 기출문제</div>
                  <div className="text-[11px] text-ink-secondary font-medium">자사고·특목고 기출 면접 질문</div>
                </div>
                {questionType === 'past' && (
                  <div className="w-5 h-5 rounded-full bg-brand-middle flex items-center justify-center text-white text-[11px] font-bold">✓</div>
                )}
              </button>
              {questionType === 'past' && (
                <div className="bg-brand-middle-pale/60 border border-brand-middle-light rounded-lg px-3.5 py-3 mt-1.5">
                  <div className="text-[11px] font-bold text-brand-middle-dark mb-2">🏫 학교 검색</div>

                  <input
                    value={pastSchoolSearch}
                    onChange={e => { setPastSchoolSearch(e.target.value); setSelSchool('') }}
                    placeholder="학교 이름 검색 (예: 인천하늘고, 민사고...)"
                    className="w-full h-9 px-3 border border-line rounded-lg text-[12px] focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all mb-2 bg-white placeholder:text-ink-muted"
                  />

                  {selSchool && (
                    <div className="flex items-center gap-1.5 bg-brand-middle-bg border border-brand-middle-light rounded-md px-2.5 py-1.5 mb-2">
                      <span className="text-[12px] text-brand-middle-dark font-bold">✓ {selSchool}</span>
                      <button
                        onClick={() => setSelSchool('')}
                        className="ml-auto text-[10px] text-ink-muted hover:text-ink"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="max-h-[180px] overflow-y-auto flex flex-col gap-1">
                    {filteredPastSchools.length === 0 ? (
                      <div className="text-[12px] text-ink-muted text-center py-3">검색 결과가 없어요</div>
                    ) : filteredPastSchools.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setSelSchool(selSchool === s ? '' : s)}
                        className={`flex items-center justify-between px-2.5 py-1.5 border rounded-md text-[12px] transition-all text-left ${
                          selSchool === s
                            ? 'border-brand-middle bg-brand-middle-bg text-brand-middle-dark font-semibold'
                            : 'border-line bg-white text-ink hover:border-brand-middle-light hover:bg-brand-middle-pale/30'
                        }`}
                      >
                        {s}
                        {selSchool === s && <span className="text-[11px] text-brand-middle-dark">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 자소서 예상질문 */}
            <div>
              <button
                onClick={() => toggleType('essay')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  questionType === 'essay'
                    ? 'border-brand-middle bg-brand-middle-pale'
                    : 'border-line bg-white hover:border-brand-middle-light'
                }`}
              >
                <div>
                  <div className="text-[13px] font-bold text-ink">📝 자소서 예상질문</div>
                  <div className="text-[11px] text-ink-secondary font-medium">내 자소서 기반 예상 질문</div>
                </div>
                {questionType === 'essay' && (
                  <div className="w-5 h-5 rounded-full bg-brand-middle flex items-center justify-center text-white text-[11px] font-bold">✓</div>
                )}
              </button>
              {questionType === 'essay' && (
                <div className="bg-brand-middle-pale/60 border border-brand-middle-light rounded-lg px-3.5 py-3 mt-1.5">
                  <div className="text-[11px] font-bold text-brand-middle-dark mb-2">📋 자소서 작성한 학교 선택</div>
                  {ESSAY_SCHOOLS.length === 0 ? (
                    <div className="text-[11px] text-ink-muted text-center py-3">아직 작성된 자소서가 없어요.</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {ESSAY_SCHOOLS.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setSelSchool(selSchool === s.school ? '' : s.school)}
                          className={`flex items-center justify-between px-3 py-2 border rounded-md transition-all text-left ${
                            selSchool === s.school
                              ? 'border-brand-middle bg-brand-middle-bg'
                              : 'border-line bg-white hover:border-brand-middle-light'
                          }`}
                        >
                          <div>
                            <span className="text-[12px] text-ink font-semibold">{s.school}</span>
                            <span className="text-[10px] text-ink-muted ml-1.5 font-medium">{s.date} 작성</span>
                          </div>
                          {selSchool === s.school && <span className="text-[11px] text-brand-middle-dark font-bold">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 생기부 예상질문 */}
            <div>
              <button
                onClick={() => toggleType('record')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  questionType === 'record'
                    ? 'border-brand-middle bg-brand-middle-pale'
                    : 'border-line bg-white hover:border-brand-middle-light'
                }`}
              >
                <div>
                  <div className="text-[13px] font-bold text-ink">📋 생기부 예상질문</div>
                  <div className="text-[11px] text-ink-secondary font-medium">생활기록부 기반 예상 질문</div>
                </div>
                {questionType === 'record' && (
                  <div className="w-5 h-5 rounded-full bg-brand-middle flex items-center justify-center text-white text-[11px] font-bold">✓</div>
                )}
              </button>
              {questionType === 'record' && (
                <div className="bg-brand-middle-pale/60 border border-brand-middle-light rounded-lg px-3.5 py-3 mt-1.5">
                  <div className="text-[11px] font-bold text-brand-middle-dark mb-2">🗂️ 생기부 예상질문 등록한 학교 선택</div>
                  {RECORD_SCHOOLS.length === 0 ? (
                    <div className="text-[11px] text-ink-muted text-center py-3">아직 등록된 생기부가 없어요.</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {RECORD_SCHOOLS.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setSelSchool(selSchool === s.school ? '' : s.school)}
                          className={`flex items-center justify-between px-3 py-2 border rounded-md transition-all text-left ${
                            selSchool === s.school
                              ? 'border-brand-middle bg-brand-middle-bg'
                              : 'border-line bg-white hover:border-brand-middle-light'
                          }`}
                        >
                          <div>
                            <span className="text-[12px] text-ink font-semibold">{s.school}</span>
                            <span className="text-[10px] text-ink-muted ml-1.5 font-medium">{s.date} 등록</span>
                          </div>
                          {selSchool === s.school && <span className="text-[11px] text-brand-middle-dark font-bold">✓</span>}
                        </button>
                      ))}
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
                className={`flex-1 h-11 rounded-xl text-[14px] border-2 transition-all ${
                  tailQ === o.val
                    ? 'border-brand-middle bg-brand-middle-pale text-brand-middle-dark font-extrabold'
                    : 'border-line bg-white text-ink-secondary font-medium hover:border-brand-middle-light'
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  questionMode === m.id
                    ? 'border-brand-middle bg-brand-middle-pale'
                    : 'border-line bg-white hover:border-brand-middle-light'
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-ink">{m.label}</div>
                  <div className="text-[11px] text-ink-secondary font-medium">{m.desc}</div>
                </div>
                {questionMode === m.id && (
                  <div className="w-5 h-5 rounded-full bg-brand-middle flex items-center justify-center text-white text-[11px] font-bold">✓</div>
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
              ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
              : 'bg-gray-100 text-ink-muted cursor-not-allowed'
          }`}
        >
          다음으로 →
        </button>
      </div>
    </div>
  )

  // ── 카운트다운 ──
  if (step === 'countdown') return (
    <div className="h-[calc(100vh-50px)] bg-gradient-to-br from-brand-middle-pale via-white to-brand-middle-pale/60 flex flex-col items-center justify-center gap-5 font-sans text-ink relative overflow-hidden">
      <div
        className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)' }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1), transparent 70%)' }}
      />

      <div className="flex gap-2 mb-2 relative z-10">
        <span className="text-[12px] font-bold bg-brand-middle-bg text-brand-middle-dark px-3 py-1 rounded-full border border-brand-middle-light">
          {QUESTION_TYPES.find(t => t.id === questionType)?.label}
        </span>
        <span className="text-[12px] font-bold bg-red-50 text-red-500 px-3 py-1 rounded-full border border-red-200">
          꼬리질문 {tailQ ? 'ON' : 'OFF'}
        </span>
      </div>

      <div className="text-[20px] font-extrabold text-ink tracking-tight relative z-10">{selSchool}</div>

      <div className="text-[80px] relative z-10">🤖</div>

      <div className="text-[15px] text-ink-secondary text-center leading-[1.8] font-medium relative z-10">
        잠시 후 면접이 시작돼요.<br />
        깊게 숨 한번 쉬고, 천천히 호흡을 가다듬어볼까요?
      </div>

      <div className="w-20 h-20 rounded-full bg-white border-[3px] border-brand-middle flex items-center justify-center text-[32px] font-extrabold text-brand-middle-dark mt-2 shadow-[0_8px_24px_rgba(16,185,129,0.2)] relative z-10">
        {countdown}
      </div>
    </div>
  )

  // ── 면접 화면 ──
  if (step === 'interview') {
    const curQ = MOCK_QUESTIONS[curQIdx]
    return (
      <div className="h-[calc(100vh-50px)] bg-[#0a0a0a] flex flex-col overflow-hidden relative font-sans">

        {/* 상단 바 */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3">
          <button
            onClick={() => setStep('list')}
            className="text-[13px] text-white/80 hover:text-white font-medium transition-colors"
          >
            ← 처음으로
          </button>
          <div className="text-[14px] font-bold text-white tracking-tight">실전 면접 시뮬레이션</div>
          <div className="text-[12px] text-white/60 font-medium">고민하는 시간도 성장의 일부예요!</div>
        </div>

        {/* 태그 바 */}
        <div className="absolute top-11 left-0 right-0 z-10 flex items-center gap-2 px-5 py-1.5">
          <span className="text-[11px] font-bold bg-brand-middle-bg text-brand-middle-dark px-2 py-0.5 rounded-full">
            {QUESTION_TYPES.find(t => t.id === questionType)?.label}
          </span>
          <span className="text-[11px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
            꼬리질문 {tailQ ? 'ON' : 'OFF'}
          </span>
          <span className="text-[11px] text-white/60 font-medium">{selSchool}</span>
        </div>

        {/* 면접관 화상 */}
        <div className="flex-1 flex items-center justify-center pt-20 pb-[120px]">
          <div className="flex gap-1 w-full h-full">
            {INTERVIEWERS.map((iv, i) => (
              <div
                key={iv.id}
                className={`flex-1 flex flex-col items-center justify-center rounded transition-all ${
                  activeInterviewer === i
                    ? 'bg-[#1a1a2e] border border-brand-middle/50 shadow-[inset_0_0_32px_rgba(16,185,129,0.1)]'
                    : 'bg-[#0a0a0a] border border-transparent'
                }`}
              >
                <div className="text-7xl mb-2">{iv.emoji}</div>
                <div className={`text-[12px] font-medium transition-colors ${
                  activeInterviewer === i ? 'text-brand-middle-light' : 'text-white/40'
                }`}>
                  {iv.name}
                </div>
                {activeInterviewer === i && (
                  <div className="flex gap-1 mt-2">
                    <div className="w-1 h-1 rounded-full bg-brand-middle-light animate-pulse" />
                    <div className="w-1 h-1 rounded-full bg-brand-middle-light animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1 h-1 rounded-full bg-brand-middle-light animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 타이머 */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-black/70 backdrop-blur-md rounded-full px-4 py-1 flex items-center gap-2 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[14px] font-bold text-white font-mono">{formatTime(timer)} / 01:20</span>
          </div>
        </div>

        {/* 하단 컨트롤 */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black via-black/90 to-transparent px-6 pt-5 pb-6">
          <div className="text-[11px] text-amber-300/90 mb-1.5 font-medium">
            * {QUESTION_TYPES.find(t => t.id === questionType)?.label} 중 {MOCK_QUESTIONS.length}문제가 무작위로 출제됩니다.
          </div>
          <div className="flex items-center justify-between gap-5">
            <div className="flex-1 min-w-0">
              {showQuestion ? (
                <div className="text-[20px] font-extrabold text-white tracking-tight leading-[1.4]">
                  <span className="text-brand-middle-light">질문 {curQIdx + 1}. </span>
                  {curQ.text}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="text-[20px] font-extrabold text-white">
                    <span className="text-brand-middle-light">질문 {curQIdx + 1}. </span>
                    <span className="bg-white/10 backdrop-blur-sm rounded-md px-2 py-0.5 text-white/50 text-sm font-medium">
                      음성으로 확인하세요
                    </span>
                  </div>
                  <button
                    onClick={() => setShowQuestion(true)}
                    className="text-[11px] font-semibold text-brand-middle-light bg-brand-middle/20 border border-brand-middle/50 rounded-md px-2 py-1 hover:bg-brand-middle/30 transition-colors"
                  >
                    텍스트 보기
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2.5 flex-shrink-0">
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`h-11 px-5 rounded-lg text-[13px] font-bold text-white transition-all hover:-translate-y-px ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 shadow-[0_4px_16px_rgba(239,68,68,0.4)]'
                    : 'bg-brand-middle hover:bg-brand-middle-hover shadow-[0_4px_16px_rgba(16,185,129,0.4)]'
                }`}
              >
                {isRecording ? '⏹ 답변 종료' : '● 답변 시작'}
              </button>
              <button
                onClick={nextQuestion}
                className="h-11 px-5 bg-white/10 backdrop-blur-sm text-white border border-white/30 rounded-lg text-[13px] font-semibold hover:bg-white/20 transition-all"
              >
                다음 질문 →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 결과 화면 ──
  if (step === 'result') return (
    <div className="px-8 py-7 font-sans text-ink">
      <div className="flex items-center gap-2.5 mb-5">
        <button
          onClick={() => setStep('list')}
          className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-base text-ink-secondary hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
        >
          ←
        </button>
        <div className="text-[16px] font-semibold text-ink">시뮬레이션 완료</div>
      </div>

      {/* 축하 영역 */}
      <div className="text-center py-10 mb-6 relative overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 60%)' }}
        />
        <div className="relative">
          <div className="text-6xl mb-3 animate-bounce" style={{ animationDuration: '1.5s' }}>🎉</div>
          <div className="text-[24px] font-extrabold text-ink tracking-tight mb-1.5">면접 시뮬레이션 완료!</div>
          <div className="text-[14px] text-ink-secondary font-medium">총 {MOCK_QUESTIONS.length}개 질문에 답변했어요.</div>
        </div>
      </div>

      {/* 요약 */}
      <div className="bg-white border border-line rounded-2xl p-5 mb-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <div className="text-[14px] font-bold text-ink mb-3.5 tracking-tight">이번 시뮬레이션 요약</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '답변한 질문', val: `${MOCK_QUESTIONS.length}개` },
            { label: '문제 유형', val: QUESTION_TYPES.find(t => t.id === questionType)?.label || '' },
            { label: '꼬리질문', val: tailQ ? 'ON' : 'OFF' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-50 border border-line rounded-xl px-4 py-3 text-center">
              <div className="text-[11px] text-ink-muted font-medium mb-1">{s.label}</div>
              <div className="text-[15px] font-extrabold text-ink tracking-tight">{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 대기중 안내 */}
      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-5 py-4 mb-5">
        <div className="text-[13px] font-bold text-brand-middle-dark mb-1">💬 선생님 피드백 대기중</div>
        <div className="text-[12px] text-ink-secondary leading-[1.6]">선생님이 녹음 내용을 분석하고 피드백을 남겨드릴 예정이에요.</div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2.5">
        <button
          onClick={() => { setStep('setup'); resetSetup() }}
          className="flex-1 h-12 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-xl text-[14px] font-bold transition-all hover:-translate-y-px hover:shadow-btn-middle"
        >
          다시 시뮬레이션하기
        </button>
        <button
          onClick={() => setStep('list')}
          className="flex-1 h-12 bg-white text-ink-secondary border border-line rounded-xl text-[14px] font-semibold hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
        >
          목록으로
        </button>
      </div>
    </div>
  )

  return null
}