// src/pages/middle-student/_pages/debate/MiddleDebate.tsx
// ──────────────────────────────────────────────────────────────
// AI 토론 (1:1, 3분 30초, 음성 + GPT + TTS)
// 종료 후 AI 분석 저장 → 선생님(원장) 피드백 대기
// ──────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'
import {
  generateDebateOpening,
  generateDebateReply,
  generateDebateFeedback,
  debateTextToSpeech,
  type DebateFeedback,
} from '@/lib/debate/debateService'
import { useSpeechRecognition } from '@/lib/debate/useSpeechRecognition'

// ════════════════════════════════════════════
// 타입 + 상수
// ════════════════════════════════════════════
type Stage = 'setup' | 'in_progress' | 'report'
type Stance = 'pro' | 'con'
type TopicCategory = 'admission' | 'social'

interface DebateTopic {
  id: string
  category: TopicCategory
  topic: string
  description: string
  targetSchool?: string
}

interface DebateMessage {
  id: string
  speaker: 'ai' | 'student'
  stance: Stance
  text: string
  timestamp: number
}

const DEBATE_DURATION = 210 // 3분 30초

const MOCK_TOPICS: DebateTopic[] = [
  { id: 't1', category: 'admission', topic: '중학교에서 휴대폰 사용을 자율화해야 한다.', description: '학교 내 휴대폰 정책', targetSchool: '인천하늘고' },
  { id: 't2', category: 'admission', topic: '고등학교 입학 후 동아리 활동을 의무화해야 한다.', description: '진로 탐색과 자기주도성', targetSchool: '인천하늘고' },
  { id: 't3', category: 'admission', topic: 'AI 기술 발전은 청소년 진로에 긍정적이다.', description: '미래 진로와 AI 시대', targetSchool: '서울과학고' },
  { id: 't4', category: 'admission', topic: '환경 보호가 경제 발전보다 우선되어야 한다.', description: '가치 판단과 우선순위', targetSchool: '민족사관고' },
  { id: 't5', category: 'social', topic: '학교 급식은 전면 무상으로 제공되어야 한다.', description: '복지와 형평성' },
  { id: 't6', category: 'social', topic: 'SNS 사용은 청소년에게 득보다 실이 많다.', description: '디지털 시대의 청소년' },
  { id: 't7', category: 'social', topic: '인공지능은 인간의 일자리를 위협한다.', description: 'AI와 노동 시장' },
]

// ════════════════════════════════════════════
// 헬퍼
// ════════════════════════════════════════════
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function stanceLabel(s: Stance): string {
  return s === 'pro' ? '찬성' : '반대'
}

function getAIStance(studentStance: Stance): Stance {
  return studentStance === 'pro' ? 'con' : 'pro'
}

// "이상" 등 발언 종료 키워드 감지
function isEndKeyword(text: string): boolean {
  const keywords = ['이상입니다', '이상이에요', '이상이야', '이상', '끝났습니다', '완료', '다음']
  const clean = text.trim()
  return keywords.some(kw => clean.includes(kw))
}

function stripEndKeyword(text: string): string {
  return text.replace(/이상입니다|이상이에요|이상이야|이상|끝났습니다|완료|다음/g, '').trim()
}

// ════════════════════════════════════════════
// 메인
// ════════════════════════════════════════════
export default function MiddleDebate() {
  const [stage, setStage] = useState<Stage>('setup')
  const [selectedTopic, setSelectedTopic] = useState<DebateTopic | null>(null)
  const [studentStance, setStudentStance] = useState<Stance>('pro')
  const [messages, setMessages] = useState<DebateMessage[]>([])
  const [elapsedSec, setElapsedSec] = useState(0)

  const handleStart = () => {
    if (!selectedTopic) return
    setStage('in_progress')
  }

  const handleEnd = (finalMessages: DebateMessage[], finalElapsed: number) => {
    setMessages(finalMessages)
    setElapsedSec(finalElapsed)
    setStage('report')
  }

  const handleRestart = () => {
    setStage('setup')
    setSelectedTopic(null)
    setMessages([])
    setElapsedSec(0)
  }

  return (
    <>
      {stage === 'setup' && (
        <DebateSetup
          selectedTopic={selectedTopic}
          setSelectedTopic={setSelectedTopic}
          studentStance={studentStance}
          setStudentStance={setStudentStance}
          onStart={handleStart}
        />
      )}

      {stage === 'in_progress' && selectedTopic && (
        <DebateInProgress
          topic={selectedTopic}
          studentStance={studentStance}
          onEnd={handleEnd}
        />
      )}

      {stage === 'report' && selectedTopic && (
        <DebateReport
          topic={selectedTopic}
          messages={messages}
          elapsedSec={elapsedSec}
          studentStance={studentStance}
          onRestart={handleRestart}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════
// Stage 1: Setup (클릭만, TTS 없음)
// ════════════════════════════════════════════
function DebateSetup({
  selectedTopic, setSelectedTopic,
  studentStance, setStudentStance,
  onStart,
}: {
  selectedTopic: DebateTopic | null
  setSelectedTopic: (t: DebateTopic) => void
  studentStance: Stance
  setStudentStance: (s: Stance) => void
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
          <div className="text-[18px] font-extrabold text-ink tracking-tight">AI 토론</div>
          <div className="text-[12px] text-ink-muted mt-0.5">
            {student?.name} · {academy?.academyName}
          </div>
        </div>
        <div className="bg-amber-50 text-amber-700 text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-amber-200">
          ⏱️ 3분 30초 · AI 1:1 토론
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)] px-6 py-5">

        {/* 인트로 */}
        <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3 mb-5">
          <div className="text-[14px] font-bold text-brand-middle-dark mb-0.5">AI 토론 파트너 '서연'과 1:1 토론</div>
          <div className="text-[12px] text-brand-middle-dark leading-relaxed">
            카메라 켜고, 음성으로 토론해요. 말 끝나면 "이상"이라고 하거나 버튼을 눌러요. 끝나면 AI가 분석하고 선생님이 피드백을 줘요.
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
                    <span className="text-[10px] font-semibold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
                      {topic.category === 'admission' ? '입시 면접' : '사회 이슈'}
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
          <div className="grid grid-cols-2 gap-2">
            <StanceBtn active={studentStance === 'pro'} emoji="👍" label="찬성" sub="이 주제에 동의해요" onClick={() => setStudentStance('pro')} />
            <StanceBtn active={studentStance === 'con'} emoji="👎" label="반대" sub="이 주제에 반대해요" onClick={() => setStudentStance('con')} />
          </div>
          {selectedTopic && (
            <div className="mt-3 text-[12px] text-ink-secondary bg-gray-50 border border-line rounded-lg px-3 py-2">
              서연(AI)은 자동으로 <strong className="text-brand-middle-dark">{stanceLabel(getAIStance(studentStance))}</strong> 입장이 돼서 너와 토론해요.
            </div>
          )}
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
            <span className="text-[11px] opacity-90">(3분 30초)</span>
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

// ════════════════════════════════════════════
// Stage 2: In Progress (음성 + TTS + GPT)
// ════════════════════════════════════════════
function DebateInProgress({
  topic, studentStance, onEnd,
}: {
  topic: DebateTopic
  studentStance: Stance
  onEnd: (messages: DebateMessage[], elapsed: number) => void
}) {
  const aiStanceRef = useRef<Stance>(getAIStance(studentStance))
  const aiStance = aiStanceRef.current

  const [messages, setMessages] = useState<DebateMessage[]>([])
  const [currentSpeaker, setCurrentSpeaker] = useState<'ai' | 'student' | 'idle'>('idle')
  const [remainingSec, setRemainingSec] = useState(DEBATE_DURATION)
  const [isPlayingTTS, setIsPlayingTTS] = useState(false)
  const [isThinking, setIsThinking] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isProcessingRef = useRef(false)
  const messagesRef = useRef<DebateMessage[]>([])
  const hasStartedRef = useRef(false)
  const logEndRef = useRef<HTMLDivElement>(null)
  const endedRef = useRef(false)

  const { transcript, isListening, supported, start, stop, reset } = useSpeechRecognition()

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, transcript])

  // 언마운트 정리 (Strict Mode 대응: mount 시 false 리셋)
  useEffect(() => {
    endedRef.current = false
    return () => {
      endedRef.current = true
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.onended = null
        audioRef.current.onerror = null
      }
      streamRef.current?.getTracks().forEach(t => t.stop())
      stop()
    }
  }, [])

  // 카메라
  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(err => console.warn('camera denied:', err))
    return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // 타이머
  useEffect(() => {
    const t = setInterval(() => {
      setRemainingSec(prev => {
        if (prev <= 1) { handleEndDebate(DEBATE_DURATION); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // AI 첫 발언
  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true
    const startDebate = async () => {
      setIsThinking(true)
      try {
        const opening = await generateDebateOpening({ topic: topic.topic, aiStance })
        if (endedRef.current) return
        setIsThinking(false)
        await aiSpeak(opening)
      } catch (err) {
        console.error('오프닝 실패:', err)
        if (endedRef.current) return
        setIsThinking(false)
        await aiSpeak(`안녕하세요. ${topic.topic}에 대해 ${stanceLabel(aiStance)} 입장에서 토론을 시작할게요. 먼저 어떻게 생각하는지 들려줄래요?`)
      }
    }
    startDebate()
    return () => { if (audioRef.current) audioRef.current.pause() }
  }, [])

  // 음성 인식 "이상" 감지
  useEffect(() => {
    if (endedRef.current) return
    if (!transcript) return
    if (isProcessingRef.current) return
    if (isPlayingTTS) return
    if (currentSpeaker !== 'student') return
    if (isEndKeyword(transcript)) {
      processStudentAnswer(transcript)
    }
  }, [transcript, isPlayingTTS, currentSpeaker])

  // 학생 답변 처리
  const processStudentAnswer = async (rawText: string) => {
    if (endedRef.current) return
    isProcessingRef.current = true
    stop()

    const studentText = stripEndKeyword(rawText)
    const finalText = studentText.length > 3 ? studentText : '(답변 완료)'

    const studentMsg: DebateMessage = {
      id: `s-${Date.now()}`, speaker: 'student', stance: studentStance, text: finalText, timestamp: Date.now(),
    }
    setMessages(prev => [...prev, studentMsg])
    setCurrentSpeaker('idle')

    setTimeout(async () => {
      if (endedRef.current) return
      setIsThinking(true)
      try {
        const reply = await generateDebateReply({
          topic: topic.topic,
          aiStance,
          studentStance,
          history: messagesRef.current.map(m => ({ speaker: m.speaker, text: m.text })),
          studentText: finalText,
        })
        if (endedRef.current) return
        setIsThinking(false)
        await aiSpeak(reply)
      } catch (err) {
        console.error('반박 실패:', err)
        if (endedRef.current) return
        setIsThinking(false)
        await aiSpeak('잠깐, 뭔가 문제가 생겼어. 다시 한번 말해줄래?')
      }
    }, 600)
  }

  const handleStudentDone = () => {
    if (endedRef.current) return
    if (isProcessingRef.current) return
    if (currentSpeaker !== 'student') return
    processStudentAnswer(transcript || '')
  }

  // AI 발언 (TTS)
  const aiSpeak = async (text: string) => {
    if (endedRef.current) return
    setCurrentSpeaker('ai')
    setIsPlayingTTS(true)
    isProcessingRef.current = false
    stop()
    reset()

    const aiMsg: DebateMessage = {
      id: `ai-${Date.now()}`, speaker: 'ai', stance: aiStance, text, timestamp: Date.now(),
    }
    setMessages(prev => [...prev, aiMsg])

    try {
      const audioUrl = await debateTextToSpeech(text)
      if (endedRef.current) return
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      const goToStudent = () => {
        if (endedRef.current) return
        setIsPlayingTTS(false)
        setCurrentSpeaker('student')
        setTimeout(() => {
          if (endedRef.current) return
          reset()
          start()
        }, 400)
      }

      audio.onended = goToStudent
      audio.onerror = goToStudent
      await audio.play()
    } catch (err) {
      console.error('TTS 에러:', err)
      if (endedRef.current) return
      setIsPlayingTTS(false)
      setCurrentSpeaker('student')
      setTimeout(() => { if (endedRef.current) return; reset(); start() }, 400)
    }
  }

  const handleEndDebate = (elapsed: number) => {
    if (endedRef.current) return
    endedRef.current = true
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    stop()
    reset()
    setIsPlayingTTS(false)
    setIsThinking(false)
    setCurrentSpeaker('idle')
    onEnd(messagesRef.current, elapsed)
  }

  const handleManualEnd = () => handleEndDebate(DEBATE_DURATION - remainingSec)

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="text-[18px] font-extrabold text-ink tracking-tight">AI 토론</div>
          <span className="bg-brand-middle-bg text-brand-middle-dark text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-brand-middle-light">
            {topic.category === 'admission' ? '입시 면접' : '사회 이슈'}
          </span>
          <span className="bg-amber-50 text-amber-700 text-[12px] font-bold px-3 py-1 rounded-full border border-amber-200 tabular-nums">
            ⏱️ {formatTime(remainingSec)}
          </span>
        </div>
        <button onClick={handleManualEnd} className="text-[12px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-all">
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

      {!supported && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-[12px] text-red-700 font-medium flex-shrink-0">
          ⚠️ 이 브라우저는 음성 인식을 지원하지 않아요. Chrome 브라우저를 사용해주세요. (버튼으로는 진행 가능)
        </div>
      )}

      {/* 메인 */}
      <div className="flex-1 grid grid-cols-[1.5fr_1fr] gap-4 min-h-0">
        {/* 좌: 영상 (AI | 나) */}
        <div className="grid grid-cols-2 gap-3 min-h-0">
          {/* AI */}
          <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 transition-all ${currentSpeaker === 'ai' ? 'ring-4 ring-brand-middle' : ''}`}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-24 rounded-full bg-pink-100 border-4 border-pink-300 flex items-center justify-center text-[56px]">👩‍🎓</div>
            </div>
            {currentSpeaker === 'ai' && (
              <div className="absolute top-3 left-3 bg-brand-middle text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 z-10">
                <span>🔊</span> 말하는 중
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/85 to-transparent z-10">
              <div className="text-white text-[15px] font-bold">서연 (AI)</div>
              <div className="text-white/80 text-[12px]">{stanceLabel(aiStance)} 입장</div>
            </div>
          </div>
          {/* 나 */}
          <div className={`relative rounded-2xl overflow-hidden bg-slate-900 transition-all ${currentSpeaker === 'student' ? 'ring-4 ring-red-500' : ''}`}>
            <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            {currentSpeaker === 'student' && isListening && (
              <div className="absolute top-3 left-3 bg-red-500 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 animate-pulse z-10">
                <span>🎙️</span> 듣는 중
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/85 to-transparent z-10">
              <div className="text-white text-[15px] font-bold">나</div>
              <div className="text-white/80 text-[12px]">{stanceLabel(studentStance)} 입장</div>
            </div>
          </div>
        </div>

        {/* 우: 채팅 로그 */}
        <div className="flex flex-col bg-white border border-line rounded-2xl overflow-hidden min-h-0">
          <div className="px-4 py-3 border-b border-line flex-shrink-0">
            <div className="text-[12px] font-bold text-ink-secondary">💬 토론 내용</div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            {messages.length === 0 ? (
              <div className="text-center text-ink-muted text-[13px] py-8">토론이 시작되면<br />여기에 대화가 표시돼요</div>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.speaker === 'student' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[14px] flex-shrink-0 ${msg.speaker === 'student' ? 'bg-brand-middle-pale' : 'bg-pink-100'}`}>
                      {msg.speaker === 'student' ? '🙂' : '👩‍🎓'}
                    </div>
                    <div className="max-w-[80%]">
                      <div className={`text-[10px] font-semibold text-ink-muted mb-1 ${msg.speaker === 'student' ? 'text-right' : ''}`}>
                        {msg.speaker === 'student' ? '나' : '서연'} · {stanceLabel(msg.stance)}
                      </div>
                      <div className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${msg.speaker === 'student' ? 'bg-brand-middle text-white' : 'bg-gray-100 text-ink'}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[14px] flex-shrink-0 bg-pink-100">👩‍🎓</div>
                    <div className="max-w-[80%]">
                      <div className="text-[10px] font-semibold text-ink-muted mb-1">서연 · {stanceLabel(aiStance)}</div>
                      <div className="px-3 py-2 rounded-2xl text-[13px] bg-gray-100 text-gray-400 italic">생각하는 중<span className="animate-pulse">...</span></div>
                    </div>
                  </div>
                )}
                {transcript && currentSpeaker === 'student' && (
                  <div className="flex gap-2 flex-row-reverse">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[14px] flex-shrink-0 bg-brand-middle-pale">🙂</div>
                    <div className="max-w-[80%]">
                      <div className="text-[10px] font-semibold text-red-500 mb-1 text-right animate-pulse">🎙️ 말하는 중...</div>
                      <div className="px-3 py-2 rounded-2xl text-[13px] leading-relaxed bg-brand-middle-pale text-brand-middle-dark italic">{transcript}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* 하단 상태 + 발언완료 버튼 */}
      <div className={`border rounded-xl px-5 py-4 flex-shrink-0 transition-all ${
        currentSpeaker === 'student' ? 'bg-red-50 border-red-200'
        : isPlayingTTS || isThinking ? 'bg-brand-middle-pale border-brand-middle-light'
        : 'bg-gray-50 border-gray-200'
      }`}>
        {isThinking && <div className="text-center text-brand-middle-dark font-bold text-[15px]">🤔 서연이가 생각하고 있어요...</div>}
        {!isThinking && isPlayingTTS && <div className="text-center text-brand-middle-dark font-bold text-[15px]">🔊 서연이가 말하고 있어요... 잠시만 기다려주세요</div>}
        {!isThinking && !isPlayingTTS && currentSpeaker === 'idle' && <div className="text-center text-gray-600 font-bold text-[15px]">⏳ 잠시만 기다려주세요...</div>}
        {!isThinking && !isPlayingTTS && currentSpeaker === 'student' && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="text-red-700 font-bold text-[16px] mb-1">🎤 답변하세요!</div>
              <div className="text-red-600 text-[12px]">
                말 끝나면 <span className="bg-red-200 px-2 py-0.5 rounded font-bold">"이상"</span> 이라고 하거나 오른쪽 버튼을 눌러주세요
              </div>
            </div>
            <button onClick={handleStudentDone} className="flex-shrink-0 px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-bold text-[16px] rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center gap-2">
              <span className="text-xl">✓</span> 발언 완료
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════
// Stage 3: Report (DB 저장 + AI 분석 + 선생님 피드백 대기)
// ════════════════════════════════════════════
const scoreColor = (score: number) => {
  if (score >= 4) return { text: 'text-green-700', bg: 'bg-green-100' }
  if (score === 3) return { text: 'text-blue-700', bg: 'bg-blue-100' }
  return { text: 'text-amber-700', bg: 'bg-amber-100' }
}

function DebateReport({
  topic, messages, elapsedSec, studentStance, onRestart,
}: {
  topic: DebateTopic
  messages: DebateMessage[]
  elapsedSec: number
  studentStance: Stance
  onRestart: () => void
}) {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const [feedback, setFeedback] = useState<DebateFeedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [savedId, setSavedId] = useState<string | null>(null)
  const startedRef = useRef(false)

  const studentMessages = messages.filter(m => m.speaker === 'student')
  const turnCount = studentMessages.length

  // AI 분석 + DB 저장 (한 번만)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const run = async () => {
      try {
        const result = await generateDebateFeedback({
          topic: topic.topic,
          studentStance,
          messages: messages.map(m => ({ speaker: m.speaker, text: m.text })),
        })
        setFeedback(result)

        // DB 저장 (pending - 선생님 피드백 대기)
        if (student?.id) {
          const aiStance = getAIStance(studentStance)
          const { data, error: dbErr } = await supabase
            .from('debate_sessions')
            .insert({
              student_id: String(student.id),
              academy_id: academy?.academyId ? String(academy.academyId) : null,
              topic: topic.topic,
              topic_category: topic.category,
              student_stance: studentStance,
              ai_stance: aiStance,
              messages: messages.map(m => ({ speaker: m.speaker, text: m.text, timestamp: m.timestamp })),
              elapsed_sec: elapsedSec,
              turn_count: turnCount,
              ai_feedback: result,
              status: 'pending',
            })
            .select('id')
            .single()
          if (dbErr) console.error('토론 저장 실패:', dbErr)
          else setSavedId(data?.id ?? null)
        }
      } catch (err) {
        console.error('토론 분석 실패:', err)
        setError('분석 중 문제가 생겼어요. 다시 시도해주세요.')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  // 로딩 게이지
  useEffect(() => {
    if (!loading) { setProgress(100); return }
    const t = setInterval(() => setProgress(p => (p >= 90 ? 90 : p + Math.random() * 8)), 600)
    return () => clearInterval(t)
  }, [loading])

  const totalScore = feedback ? feedback.criteria.reduce((s, c) => s + c.score, 0) * 5 : 0

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">토론 결과</div>
          <div className="text-[12px] text-ink-muted mt-0.5">{student?.name} · {academy?.academyName}</div>
        </div>
        <button onClick={onRestart} className="text-[12px] font-semibold text-brand-middle-dark bg-brand-middle-bg border border-brand-middle-light rounded-lg px-3.5 py-1.5 hover:bg-brand-middle hover:text-white transition-all">
          🔄 다시 토론하기
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)] px-6 py-5">
        {loading ? (
          <div className="text-center py-20 max-w-[420px] mx-auto">
            <div className="text-[60px] mb-4 animate-pulse"></div>
            <div className="text-[18px] font-bold text-ink mb-1">토론을 마무리하고 있어요...</div>
            <div className="text-[13px] text-gray-500 mb-6">조금만 기다려주세요</div>
            <div className="w-full h-3 bg-brand-middle-pale rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-middle to-emerald-400 rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(Math.round(progress), 100)}%` }} />
            </div>
            <div className="text-[13px] font-bold text-brand-middle-dark mt-2 tabular-nums">{Math.min(Math.round(progress), 100)}%</div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-[48px] mb-4">😢</div>
            <div className="text-[16px] font-bold text-ink mb-4">{error}</div>
            <button onClick={onRestart} className="px-6 py-3 bg-brand-middle text-white rounded-xl font-bold">다시 하기</button>
          </div>
        ) : feedback ? (
          <div className="max-w-[460px] mx-auto py-10">
            {/* 완료 안내 */}
            <div className="text-center mb-6">
              <div className="text-[64px] mb-3"></div>
              <div className="text-[20px] font-extrabold text-ink mb-1.5">토론을 끝까지 완주했어요!</div>
              <div className="text-[13px] text-ink-secondary leading-relaxed">
                서연이와의 토론, 정말 수고 많았어요.<br />
                선생님이 토론 내용을 확인하고 피드백을 줄 거예요.
              </div>
            </div>

            {/* 주제 + 통계 */}
            <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-4">
              <div className="text-[10px] font-semibold text-ink-muted mb-1">토론 주제</div>
              <div className="text-[14px] font-bold text-ink mb-3 leading-snug">{topic.topic}</div>
              <div className="grid grid-cols-3 gap-2">
                <Meta label="진행 시간" value={formatTime(elapsedSec)} />
                <Meta label="발언 횟수" value={`${turnCount}회`} />
                <Meta label="내 입장" value={stanceLabel(studentStance)} />
              </div>
            </div>

            {/* 선생님 피드백 대기 안내 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 mb-5 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">⏳</span>
              <div>
                <div className="text-[14px] font-bold text-amber-800">선생님 피드백을 기다리는 중이에요</div>
                <div className="text-[12px] text-amber-700 mt-1 leading-relaxed">선생님이 우리 토론을 직접 보고 피드백을 준비하고 있어요. 곧 확인할 수 있어요!</div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-2">
              <button onClick={onRestart} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors">🔄 다시 토론하기</button>
              <button onClick={onRestart} className="flex-[2] h-11 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-lg text-[13px] font-semibold hover:-translate-y-px hover:shadow-btn-middle transition-all">🎯 새 주제로 도전</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-line rounded-lg px-3 py-2.5 text-center">
      <div className="text-[10px] text-ink-muted font-medium mb-0.5">{label}</div>
      <div className="text-[18px] font-extrabold text-brand-middle-dark tabular-nums">{value}</div>
    </div>
  )
}