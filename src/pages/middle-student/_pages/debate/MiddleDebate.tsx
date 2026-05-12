// src/pages/middle-student/_pages/debate/MiddleDebate.tsx
// ──────────────────────────────────────────────────────────────
// AI 토론 면접 시뮬레이션 - 7월 초 오픈 안내 모달 추가
// ──────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'

// ════════════════════════════════════════════════════════════
// 타입 + 상수
// ════════════════════════════════════════════════════════════
type Stage = 'setup' | 'in_progress' | 'report'
type Stance = 'pro' | 'con' | 'neutral'
type DebateFormat = 'all_against' | 'mixed' | 'free'
type TopicCategory = 'admission' | 'social'
type Difficulty = 'easy' | 'medium' | 'hard'

interface DebateTopic {
  id: string
  category: TopicCategory
  topic: string
  description: string
  difficulty: Difficulty
  targetSchool?: string
}

interface AICharacter {
  name: string
  emoji: string
  color: 'blue' | 'pink' | 'green' | 'purple'
  stance: Stance
}

interface DebateMessage {
  id: string
  speaker: string
  speakerType: 'ai' | 'student'
  stance: Stance
  text: string
  timestamp: number
  durationSec?: number
  isTyping?: boolean
}

const COLOR_MAP: Record<AICharacter['color'], { bg: string; text: string; border: string }> = {
  blue:   { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
  pink:   { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200' },
  green:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  purple: { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
}

const PRESET_CHARS: Record<string, AICharacter> = {
  minjun:  { name: '민준', emoji: '🧑‍🎓', color: 'blue',   stance: 'pro' },
  seoyeon: { name: '서연', emoji: '👩‍🎓', color: 'pink',   stance: 'con' },
  jihu:    { name: '지후', emoji: '🧑',    color: 'green',  stance: 'pro' },
  yuna:    { name: '유나', emoji: '👧',    color: 'purple', stance: 'con' },
}

const MOCK_TOPICS: DebateTopic[] = [
  { id: 't1', category: 'admission', topic: '중학교에서 휴대폰 사용을 자율화해야 한다.', description: '학교 내 휴대폰 정책 토론', difficulty: 'easy', targetSchool: '인천하늘고' },
  { id: 't2', category: 'admission', topic: '고등학교 입학 후 동아리 활동을 의무화해야 한다.', description: '진로 탐색과 자기주도성', difficulty: 'easy', targetSchool: '인천하늘고' },
  { id: 't3', category: 'admission', topic: 'AI 기술 발전이 청소년 진로에 미치는 영향', description: '미래 진로와 AI 시대', difficulty: 'medium', targetSchool: '서울과학고' },
  { id: 't4', category: 'admission', topic: '환경 보호와 경제 발전, 어느 것이 우선인가?', description: '가치 판단과 우선순위', difficulty: 'hard', targetSchool: '민족사관고' },
  { id: 't5', category: 'social', topic: '학교 급식은 무상으로 제공되어야 한다.', description: '복지와 형평성', difficulty: 'easy' },
  { id: 't6', category: 'social', topic: 'SNS 사용은 청소년에게 득보다 실이 많다.', description: '디지털 시대의 청소년', difficulty: 'medium' },
  { id: 't7', category: 'social', topic: '인공지능이 인간의 일자리를 위협한다.', description: 'AI와 노동 시장', difficulty: 'hard' },
]

const DIFFICULTY_SECONDS: Record<Difficulty, number> = {
  easy: 5 * 60,
  medium: 10 * 60,
  hard: 15 * 60,
}

// ════════════════════════════════════════════════════════════
// 헬퍼
// ════════════════════════════════════════════════════════════
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function stanceLabel(s: Stance): string {
  return s === 'pro' ? '찬성' : s === 'con' ? '반대' : '중립'
}

function difficultyLabel(d: Difficulty): string {
  return d === 'easy' ? '입문' : d === 'medium' ? '중급' : '심화'
}

function difficultyColor(d: Difficulty): string {
  return d === 'easy'
    ? 'bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light'
    : d === 'medium'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-700 border-red-200'
}

function difficultyMinutesLabel(d: Difficulty): string {
  return d === 'easy' ? '5분' : d === 'medium' ? '10분' : '15분'
}

function assignAICharacters(format: DebateFormat, studentStance: Stance): AICharacter[] {
  const opposite: Stance = studentStance === 'pro' ? 'con' : 'pro'
  const same: Stance = studentStance === 'neutral' ? 'pro' : studentStance

  if (format === 'all_against') {
    return [
      { ...PRESET_CHARS.minjun, stance: opposite },
      { ...PRESET_CHARS.seoyeon, stance: opposite },
    ]
  }
  if (format === 'mixed') {
    return [
      { ...PRESET_CHARS.minjun, stance: same },
      { ...PRESET_CHARS.seoyeon, stance: opposite },
    ]
  }
  return [
    { ...PRESET_CHARS.jihu, stance: 'pro' },
    { ...PRESET_CHARS.yuna, stance: 'con' },
  ]
}

// ════════════════════════════════════════════════════════════
// 메인
// ════════════════════════════════════════════════════════════
export default function MiddleDebate() {
  const [stage, setStage] = useState<Stage>('setup')

  const [selectedTopic, setSelectedTopic] = useState<DebateTopic | null>(null)
  const [studentStance, setStudentStance] = useState<Stance>('pro')
  const [debateFormat, setDebateFormat] = useState<DebateFormat>('mixed')
  const [aiChars, setAiChars] = useState<AICharacter[]>([])

  const [messages, setMessages] = useState<DebateMessage[]>([])
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('')
  const [isStudentMicOn, setIsStudentMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [turnCount, setTurnCount] = useState(0)

  const [totalSec, setTotalSec] = useState(0)
  const [remainingSec, setRemainingSec] = useState(0)

  // 🚧 7월 초 오픈 안내 모달
  const [showComingSoonModal, setShowComingSoonModal] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 🚧 토론 시작 버튼 클릭 → 모달만 띄움 (실제 토론 시작 막힘)
  const handleStartDebate = () => {
    if (!selectedTopic) return
    setShowComingSoonModal(true)
    return

    // ⚠️ 아래는 7월 초 오픈 시 활성화 (지금은 막혀있음)
    /*
    const seconds = DIFFICULTY_SECONDS[selectedTopic.difficulty]
    const chars = assignAICharacters(debateFormat, studentStance)

    setAiChars(chars)
    setTotalSec(seconds)
    setRemainingSec(seconds)
    setStage('in_progress')

    setTimeout(() => {
      const firstSpeaker = chars[0]
      setCurrentSpeaker(firstSpeaker.name)
      setMessages([{
        id: 'm1',
        speaker: firstSpeaker.name,
        speakerType: 'ai',
        stance: firstSpeaker.stance,
        text: `안녕하세요. 저는 "${selectedTopic.topic}"에 대해 ${
          firstSpeaker.stance === 'pro' ? '찬성' : '반대'
        } 입장에서 의견을 말씀드리겠습니다. 핵심 근거는 세 가지입니다...`,
        timestamp: Date.now(),
        durationSec: 25,
      }])
    }, 800)
    */
  }

  useEffect(() => {
    if (stage !== 'in_progress' || !isCameraOn) {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      return
    }

    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then(stream => {
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(err => console.warn('camera denied:', err))

    return () => { cancelled = true }
  }, [stage, isCameraOn])

  useEffect(() => {
    if (stage !== 'in_progress') return

    const t = setInterval(() => {
      setRemainingSec(prev => {
        if (prev <= 1) {
          streamRef.current?.getTracks().forEach(track => track.stop())
          streamRef.current = null
          setStage('report')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(t)
  }, [stage])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const handleStudentDone = () => {
    const studentMsg: DebateMessage = {
      id: `m${Date.now()}`,
      speaker: 'student',
      speakerType: 'student',
      stance: studentStance,
      text: '저는 ○○이라고 생각합니다. 그 이유는...',
      timestamp: Date.now(),
      durationSec: 32,
    }
    setMessages(prev => [...prev, studentMsg])
    setTurnCount(t => t + 1)

    const nextAi = aiChars[turnCount % 2]
    setCurrentSpeaker(nextAi.name)

    const typingMsg: DebateMessage = {
      id: `typing-${Date.now()}`,
      speaker: nextAi.name,
      speakerType: 'ai',
      stance: nextAi.stance,
      text: '',
      timestamp: Date.now(),
      isTyping: true,
    }
    setMessages(prev => [...prev, typingMsg])

    setTimeout(() => {
      setMessages(prev => prev.map(m =>
        m.id === typingMsg.id
          ? {
              ...m,
              isTyping: false,
              text: '말씀하신 부분에 대해 한 가지 짚고 싶은 게 있어요. ...',
              durationSec: 22,
            }
          : m
      ))
    }, 1500)
  }

  const handleEndDebate = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setStage('report')
  }

  const handleRestart = () => {
    setStage('setup')
    setSelectedTopic(null)
    setMessages([])
    setTurnCount(0)
    setTotalSec(0)
    setRemainingSec(0)
    setAiChars([])
    setCurrentSpeaker('')
  }

  const elapsedSec = totalSec - remainingSec

  return (
    <>
      {stage === 'setup' && (
        <DebateSetup
          selectedTopic={selectedTopic}
          setSelectedTopic={setSelectedTopic}
          studentStance={studentStance}
          setStudentStance={setStudentStance}
          debateFormat={debateFormat}
          setDebateFormat={setDebateFormat}
          onStart={handleStartDebate}
        />
      )}

      {stage === 'in_progress' && selectedTopic && (
        <DebateInProgress
          topic={selectedTopic}
          studentStance={studentStance}
          aiChars={aiChars}
          messages={messages}
          currentSpeaker={currentSpeaker}
          isStudentMicOn={isStudentMicOn}
          setIsStudentMicOn={setIsStudentMicOn}
          isCameraOn={isCameraOn}
          setIsCameraOn={setIsCameraOn}
          videoRef={videoRef}
          remainingSec={remainingSec}
          turnCount={turnCount}
          onStudentDone={handleStudentDone}
          onEnd={handleEndDebate}
        />
      )}

      {stage === 'report' && selectedTopic && (
        <DebateReport
          topic={selectedTopic}
          aiChars={aiChars}
          turnCount={turnCount}
          elapsedSec={elapsedSec}
          onRestart={handleRestart}
        />
      )}

      {/* 🚧 7월 초 오픈 안내 모달 */}
      {showComingSoonModal && (
        <div
          onClick={() => setShowComingSoonModal(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[420px] text-center shadow-[0_24px_64px_rgba(0,0,0,0.2)] relative"
          >
            <div className="text-5xl mb-3"></div>
            <div className="text-[18px] font-extrabold text-ink mb-2 tracking-tight">
              AI 토론 준비 중
            </div>
            <div className="text-[14px] text-ink-secondary leading-[1.7] mb-5">
              현재 준비 중이에요.<br />
              <span className="font-bold text-brand-middle-dark">7월 초</span>에 이용하실 수 있습니다.
            </div>
            <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3 mb-5">
              <div className="text-[12px] font-bold text-brand-middle-dark mb-1">✨ 곧 만나요!</div>
            </div>
            <button
              onClick={() => setShowComingSoonModal(false)}
              className="w-full h-11 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px hover:shadow-btn-middle"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════
// Stage 1: Setup
// ════════════════════════════════════════════════════════════
function DebateSetup({
  selectedTopic, setSelectedTopic,
  studentStance, setStudentStance,
  debateFormat, setDebateFormat,
  onStart,
}: {
  selectedTopic: DebateTopic | null
  setSelectedTopic: (t: DebateTopic) => void
  studentStance: Stance
  setStudentStance: (s: Stance) => void
  debateFormat: DebateFormat
  setDebateFormat: (f: DebateFormat) => void
  onStart: () => void
}) {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const [tab, setTab] = useState<TopicCategory>('admission')
  const filtered = MOCK_TOPICS.filter(t => t.category === tab)

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">AI 토론 </div>
          <div className="text-[12px] text-ink-muted mt-0.5">
            {student?.name} · {academy?.academyName}
          </div>
        </div>
        <div className="bg-amber-50 text-amber-700 text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-amber-200">
          ⏱️ 입문 5분 · 중급 10분 · 심화 15분
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)] px-6 py-5">

        {/* 인트로 */}
        <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3 mb-5">
          <div className="text-[14px] font-bold text-brand-middle-dark mb-0.5">AI 친구 2명과 토론하기</div>
          <div className="text-[12px] text-brand-middle-dark leading-relaxed">
            IB 교육과정 토론 실전처럼 — 카메라 켜고, 음성으로, 끝나면 AI 피드백까지
          </div>
        </div>

        {/* Step 1: 주제 */}
        <Section step={1} title="토론 주제 고르기">
          <div className="flex gap-1.5 mb-3">
            <TabBtn active={tab === 'admission'} onClick={() => setTab('admission')}>
              입시 토론 면접
            </TabBtn>
            <TabBtn active={tab === 'social'} onClick={() => setTab('social')}>
              사회 이슈
            </TabBtn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filtered.map(topic => {
              const isSelected = selectedTopic?.id === topic.id
              return (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className={`text-left border rounded-xl px-3.5 py-3 transition-all ${
                    isSelected
                      ? 'border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                      : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${difficultyColor(topic.difficulty)}`}>
                      {difficultyLabel(topic.difficulty)}
                    </span>
                    <span className="text-[10px] font-semibold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
                      ⏱️ {difficultyMinutesLabel(topic.difficulty)}
                    </span>
                    {topic.targetSchool && (
                      <span className="text-[10px] font-semibold text-ink-secondary bg-gray-100 px-1.5 py-0.5 rounded-full ml-auto">
                        {topic.targetSchool} 기출
                      </span>
                    )}
                  </div>
                  <div className={`text-[13px] font-bold leading-snug mb-1 ${isSelected ? 'text-brand-middle-dark' : 'text-ink'}`}>
                    {topic.topic}
                  </div>
                  <div className="text-[11px] text-ink-secondary">{topic.description}</div>
                </button>
              )
            })}
          </div>
        </Section>

        {/* Step 2: 입장 */}
        <Section step={2} title="내 입장 정하기">
          <div className="grid grid-cols-3 gap-2">
            <StanceBtn active={studentStance === 'pro'}     emoji="👍" label="찬성" sub="이 주제에 동의해요"   onClick={() => setStudentStance('pro')} />
            <StanceBtn active={studentStance === 'con'}     emoji="👎" label="반대" sub="이 주제에 반대해요"   onClick={() => setStudentStance('con')} />
            <StanceBtn active={studentStance === 'neutral'} emoji="⚖️" label="중립" sub="양쪽 다 일리있어요"   onClick={() => setStudentStance('neutral')} />
          </div>
        </Section>

        {/* Step 3: 구도 */}
        <Section step={3} title="토론 구도 정하기">
          <div className="space-y-1.5">
            <FormatRow
              active={debateFormat === 'all_against'}
              emoji="⚔️"
              label="1대2 반박 연습 (실전 입시)"
              sub="AI 2명 모두 반대편 — 협공을 받아내는 연습"
              onClick={() => setDebateFormat('all_against')}
            />
            <FormatRow
              active={debateFormat === 'mixed'}
              emoji="🤝"
              label="찬반 1명씩 (균형 토론)"
              sub="같은 편 AI 1 + 반대편 AI 1 — 자연스러운 토론"
              onClick={() => setDebateFormat('mixed')}
            />
            <FormatRow
              active={debateFormat === 'free'}
              emoji="💭"
              label="자유 토론 (3명 동등)"
              sub="입장 무관, 면접관 스타일로 의견 주고받기"
              onClick={() => setDebateFormat('free')}
            />
          </div>
        </Section>

        {/* 시작 버튼 */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onStart}
            disabled={!selectedTopic}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
              selectedTopic
                ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
                : 'bg-gray-100 text-ink-muted cursor-not-allowed'
            }`}
          >
            토론 시작하기
            {selectedTopic && (
              <span className="text-[11px] opacity-90">
                ({difficultyMinutesLabel(selectedTopic.difficulty)})
              </span>
            )}
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-5 h-5 rounded-full bg-brand-middle text-white text-[10px] font-extrabold flex items-center justify-center">
          {step}
        </span>
        <h2 className="text-[14px] font-bold text-ink tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[11px] border-[1.5px] transition-all ${
        active
          ? 'border-brand-middle bg-brand-middle-pale text-brand-middle-dark font-bold'
          : 'border-line bg-white text-ink-secondary font-medium hover:border-brand-middle-light'
      }`}
    >
      {children}
    </button>
  )
}

function StanceBtn({ active, emoji, label, sub, onClick }: {
  active: boolean; emoji: string; label: string; sub: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`border rounded-xl px-3.5 py-3 text-center transition-all ${
        active
          ? 'border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
          : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
      }`}
    >
      <div className="text-[22px] mb-1">{emoji}</div>
      <div className={`text-[13px] font-bold mb-0.5 ${active ? 'text-brand-middle-dark' : 'text-ink'}`}>{label}</div>
      <div className="text-[11px] text-ink-secondary">{sub}</div>
    </button>
  )
}

function FormatRow({ active, emoji, label, sub, onClick }: {
  active: boolean; emoji: string; label: string; sub: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 border rounded-xl px-3.5 py-3 text-left transition-all ${
        active
          ? 'border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
          : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
      }`}
    >
      <span className="text-[22px] flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-bold mb-0.5 ${active ? 'text-brand-middle-dark' : 'text-ink'}`}>{label}</div>
        <div className="text-[11px] text-ink-secondary leading-relaxed">{sub}</div>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
        active ? 'border-brand-middle' : 'border-line'
      }`}>
        {active && <div className="w-2 h-2 rounded-full bg-brand-middle" />}
      </div>
    </button>
  )
}

// ════════════════════════════════════════════════════════════
// Stage 2: In Progress
// ════════════════════════════════════════════════════════════
function DebateInProgress({
  topic, studentStance, aiChars, messages,
  currentSpeaker, isStudentMicOn, setIsStudentMicOn,
  isCameraOn, setIsCameraOn, videoRef,
  remainingSec, turnCount, onStudentDone, onEnd,
}: {
  topic: DebateTopic
  studentStance: Stance
  aiChars: AICharacter[]
  messages: DebateMessage[]
  currentSpeaker: string
  isStudentMicOn: boolean
  setIsStudentMicOn: (b: boolean) => void
  isCameraOn: boolean
  setIsCameraOn: (b: boolean) => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  remainingSec: number
  turnCount: number
  onStudentDone: () => void
  onEnd: () => void
}) {
  const isStudentSpeaking = currentSpeaker === 'student'

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="text-[18px] font-extrabold text-ink tracking-tight">AI 토론 </div>
          <span className="bg-brand-middle-bg text-brand-middle-dark text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-brand-middle-light">
            {topic.category === 'admission' ? '입시 면접' : '사회 이슈'}
          </span>
          <span className="bg-amber-50 text-amber-700 text-[12px] font-bold px-3 py-1 rounded-full border border-amber-200 tabular-nums">
            ⏱️ {formatTime(remainingSec)}
          </span>
          <span className="text-[12px] text-ink-secondary">턴 {turnCount}</span>
        </div>

        <button
          onClick={onEnd}
          className="text-[12px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-all"
        >
          ✕ 토론 종료
        </button>
      </div>

      {/* 주제 바 */}
      <div className="bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)] px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <span className="text-base flex-shrink-0">💬</span>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-ink-muted mb-0.5">토론 주제</div>
          <div className="text-[14px] font-bold text-ink leading-snug">{topic.topic}</div>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* 좌: 영상 + 컨트롤 */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            <SpeakerCard isSpeaking={currentSpeaker === aiChars[0]?.name} char={aiChars[0]} />
            <StudentCard
              isSpeaking={isStudentSpeaking}
              isCameraOn={isCameraOn}
              isMicOn={isStudentMicOn}
              videoRef={videoRef}
              stance={studentStance}
            />
            <SpeakerCard isSpeaking={currentSpeaker === aiChars[1]?.name} char={aiChars[1]} />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ControlBtn
              active={isCameraOn}
              onClick={() => setIsCameraOn(!isCameraOn)}
              emoji={isCameraOn ? '📹' : '📷'}
            />
            <ControlBtn
              active={isStudentMicOn}
              onClick={() => setIsStudentMicOn(!isStudentMicOn)}
              emoji={isStudentMicOn ? '🎙️' : '🔇'}
            />
            <button
              onClick={onStudentDone}
              className="flex-1 h-9 rounded-lg text-[13px] font-semibold bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle transition-all"
            >
              ✓ 내 답변 마침
            </button>
          </div>
        </div>

        {/* 우: 채팅 */}
        <ChatPanel messages={messages} aiChars={aiChars} />
      </div>
    </div>
  )
}

function SpeakerCard({ isSpeaking, char }: { isSpeaking: boolean; char?: AICharacter }) {
  if (!char) return null
  const color = COLOR_MAP[char.color]

  return (
    <div className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 transition-all ${
      isSpeaking ? 'ring-2 ring-brand-middle' : 'opacity-70'
    }`}>
      <div className="w-full h-full flex items-center justify-center">
        <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center text-[32px] lg:text-[40px] ${color.bg} ${color.border} border-2`}>
          {char.emoji}
        </div>
      </div>

      {isSpeaking && (
        <div className="absolute top-1.5 left-1.5 bg-brand-middle text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
          <span>🔊</span>
          말하는 중
        </div>
      )}

      {isSpeaking && (
        <div className="absolute bottom-12 left-0 right-0 flex items-end justify-center gap-0.5 h-4">
          {[0.3, 0.7, 1, 0.5, 0.8, 0.4, 0.9].map((h, i) => (
            <div
              key={i}
              className="w-0.5 bg-brand-middle-light rounded-full"
              style={{
                height: `${h * 100}%`,
                animation: `debateWave 0.9s ease-in-out infinite`,
                animationDelay: `${-i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/85 to-transparent">
        <div className="text-white text-[11px] font-bold">{char.name}</div>
        <div className="text-white/75 text-[10px]">AI · {stanceLabel(char.stance)}</div>
      </div>

      <style>{`
        @keyframes debateWave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

function StudentCard({ isSpeaking, isCameraOn, isMicOn, videoRef, stance }: {
  isSpeaking: boolean; isCameraOn: boolean; isMicOn: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  stance: Stance
}) {
  return (
    <div className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-900 transition-all ${
      isSpeaking ? 'ring-2 ring-brand-middle' : ''
    }`}>
      {isCameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white/60 gap-1.5">
          <span className="text-[28px]">📷</span>
          <span className="text-[10px] font-medium">카메라 꺼짐</span>
        </div>
      )}

      {isSpeaking && (
        <div className="absolute top-1.5 left-1.5 bg-brand-middle text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
          <span>🎙️</span>
          내 차례
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/85 to-transparent flex items-end justify-between">
        <div>
          <div className="text-white text-[11px] font-bold">나</div>
          <div className="text-white/75 text-[10px]">{stanceLabel(stance)}</div>
        </div>
        {!isMicOn && <span className="text-white/60 text-[12px]">🔇</span>}
      </div>
    </div>
  )
}

function ControlBtn({ active, onClick, emoji }: { active: boolean; onClick: () => void; emoji: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-lg border flex items-center justify-center text-base transition-all ${
        active
          ? 'bg-white border-line text-ink hover:bg-gray-50'
          : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
      }`}
    >
      {emoji}
    </button>
  )
}

function ChatPanel({ messages, aiChars }: { messages: DebateMessage[]; aiChars: AICharacter[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  const charByName: Record<string, AICharacter> = {}
  aiChars.forEach(c => { charByName[c.name] = c })

  return (
    <div className="w-[320px] flex-shrink-0 bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-line flex-shrink-0 flex items-center gap-1.5">
        <span className="text-[14px]">💬</span>
        <div className="text-[12px] font-bold text-ink">실시간 대화</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5">
        {messages.length === 0 && (
          <div className="text-center py-10 text-ink-muted text-[12px]">
            <div className="text-3xl mb-2">💬</div>
            <div>토론이 시작되면<br />여기에 대화가 표시돼요</div>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.speakerType === 'student'
          const char = charByName[msg.speaker]
          const colorPair = char ? COLOR_MAP[char.color] : null

          const bubbleClass = isMe
            ? 'bg-brand-middle text-white'
            : 'bg-gray-100 text-ink'

          const avatarClass = isMe
            ? 'bg-brand-middle-pale text-brand-middle-dark border-brand-middle-light'
            : colorPair
              ? `${colorPair.bg} ${colorPair.text} ${colorPair.border}`
              : 'bg-gray-100 text-ink-secondary border-line'

          return (
            <div key={msg.id} className={`flex gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] flex-shrink-0 border ${avatarClass}`}>
                {isMe ? '🙂' : char?.emoji || '🤖'}
              </div>
              <div className="max-w-[75%]">
                {!isMe && (
                  <div className="text-[10px] font-semibold text-ink-secondary mb-0.5">
                    {msg.speaker} · {stanceLabel(msg.stance)}
                  </div>
                )}
                <div className={`px-3 py-1.5 rounded-2xl text-[12px] leading-[1.6] ${bubbleClass}`}>
                  {msg.isTyping ? (
                    <div className="flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Stage 3: Report
// ════════════════════════════════════════════════════════════
function DebateReport({
  topic, aiChars, turnCount, elapsedSec, onRestart,
}: {
  topic: DebateTopic
  aiChars: AICharacter[]
  turnCount: number
  elapsedSec: number
  onRestart: () => void
}) {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const feedbacks = [
    { label: '주장의 명확성', score: 4, comment: '입장이 명확하게 드러났어요. 결론을 다시 강조하면 더 좋을 것 같아요.' },
    { label: '근거의 타당성', score: 3, comment: '근거가 추상적인 부분이 있어요. 구체적인 사례나 데이터를 제시해보세요.' },
    { label: '논리적 일관성', score: 4, comment: '주장과 근거가 잘 연결돼 있어요.' },
    { label: '반박 대응 능력', score: 3, comment: '상대 논리에 정면으로 답하기보다 다른 주제로 회피한 부분이 있어요.' },
    { label: '경청과 이해', score: 5, comment: '상대의 말을 잘 듣고 핵심을 파악했어요. 훌륭해요!' },
    { label: '발화 매너', score: 4, comment: '예의 바르게 말했어요. 다만 가끔 "음...", "그러니까" 같은 군말이 있었어요.' },
    { label: '시선 처리', score: 3, comment: '카메라보다 화면 아래쪽을 보는 시간이 길었어요. 카메라를 쳐다보는 연습 필요!' },
    { label: '시간 활용', score: 4, comment: '주어진 시간을 잘 활용했어요.' },
  ]

  const totalScore = feedbacks.reduce((sum, f) => sum + f.score, 0)
  const avgScore = (totalScore / feedbacks.length).toFixed(1)
  const grade = totalScore >= 36 ? 'A' : totalScore >= 28 ? 'B' : totalScore >= 20 ? 'C' : 'D'

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">토론 면접 완료</div>
          <div className="text-[12px] text-ink-muted mt-0.5">
            {student?.name} · {academy?.academyName}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRestart}
            className="text-[12px] font-semibold text-brand-middle-dark bg-brand-middle-bg border border-brand-middle-light rounded-lg px-3.5 py-1.5 hover:bg-brand-middle hover:text-white transition-all"
          >
            🔄 다시 토론하기
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)] px-6 py-5">

        {/* 주제 + 통계 */}
        <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-4">
          <div className="text-[10px] font-semibold text-ink-muted mb-1">토론 주제</div>
          <div className="text-[14px] font-bold text-ink mb-3 leading-snug">{topic.topic}</div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-line rounded-lg px-3 py-2.5 text-center">
              <div className="text-[10px] text-ink-muted font-medium mb-0.5">진행 시간</div>
              <div className="text-[18px] font-extrabold text-brand-middle-dark tabular-nums">{formatTime(elapsedSec)}</div>
            </div>
            <div className="bg-white border border-line rounded-lg px-3 py-2.5 text-center">
              <div className="text-[10px] text-ink-muted font-medium mb-0.5">발언 횟수</div>
              <div className="text-[18px] font-extrabold text-brand-middle-dark tabular-nums">{turnCount}회</div>
            </div>
            <div className="bg-white border border-line rounded-lg px-3 py-2.5 text-center">
              <div className="text-[10px] text-ink-muted font-medium mb-0.5">참여 AI</div>
              <div className="text-[18px] font-extrabold text-brand-middle-dark tabular-nums">{aiChars.length}명</div>
            </div>
          </div>
        </div>

        {/* 종합 점수 */}
        <div className="bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-xl px-5 py-5 mb-4 text-white text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 opacity-90">종합 평가</div>
          <div className="text-[48px] font-extrabold leading-none mb-1">{grade}</div>
          <div className="text-[14px] font-bold mb-2 tabular-nums">{totalScore} / 40점 · 평균 {avgScore}</div>
          <div className="text-[12px] opacity-90 leading-relaxed">
            {grade === 'A' && '훌륭한 토론이었어요! 입시 면접 실전에서도 자신 있게 임할 수 있을 것 같아요.'}
            {grade === 'B' && '잘했어요! 몇 가지 개선하면 더 완벽한 토론이 될 거예요.'}
            {grade === 'C' && '잘 시작했어요. 약점을 보완하면 크게 성장할 수 있을 거예요.'}
            {grade === 'D' && '괜찮아요, 처음엔 누구나 어려워요. 꾸준히 연습해봐요!'}
          </div>
        </div>

        {/* 항목별 피드백 */}
        <div className="text-[14px] font-bold text-ink mb-2.5">📋 항목별 상세 피드백</div>
        <div className="space-y-1.5">
          {feedbacks.map((fb, i) => (
            <div key={i} className="bg-white border border-line rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[13px] font-bold text-ink">{fb.label}</div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={idx < fb.score ? 'text-amber-400' : 'text-gray-200'}
                    >
                      ★
                    </span>
                  ))}
                  <span className="text-[10px] font-bold text-ink-secondary ml-1 tabular-nums">{fb.score}/5</span>
                </div>
              </div>
              <div className="text-[12px] text-ink-secondary leading-relaxed">{fb.comment}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onRestart}
            className="flex-1 h-10 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors"
          >
            🔄 다시 토론하기
          </button>
          <button
            onClick={onRestart}
            className="flex-[2] h-10 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-lg text-[13px] font-semibold hover:-translate-y-px hover:shadow-btn-middle transition-all"
          >
            🎯 새 주제로 도전
          </button>
        </div>
      </div>
    </div>
  )
}