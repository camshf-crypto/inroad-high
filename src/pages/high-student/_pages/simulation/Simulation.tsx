import { useState, useEffect, useRef } from "react"
import { useAtomValue } from "jotai"
import { studentState } from "@/lib/auth/atoms"
import {
  useMySimulations,
  useCreateSimulation,
  useAddSimulationQuestion,
  useSubmitSimulationAnswer,
  useCompleteSimulation,
  useDeleteSimulation,
  uploadRecording,
  getQuestionTypeLabel,
  formatSimDuration,
  type Simulation,
} from "@/pages/high-student/_hooks/useMyHighSimulation"
import {
  useAllUniversities,
  useDepartmentsOfUniversity,
  useMyPastQuestions,
  type QuestionWithAnswer,
} from "@/pages/high-student/_hooks/useMyHighQuestions"
import {
  useMyQuestions as useMyExpectQuestions,
  gradeToNum,
  type ExpectQuestion,
} from "@/pages/high-student/_hooks/useMyHighSaenggibuQuestions"

// ─────────────────────────────────────────────
// 테마 (어드민 훅의 THEME과 통일 — 파랑 #2563EB)
// ─────────────────────────────────────────────
const THEME = {
  accent: "#2563EB",
  accentDark: "#1E3A8A",
  accentHover: "#1D4ED8",
  accentBg: "#EFF6FF",
  accentPale: "#DBEAFE",
  accentBorder: "#93C5FD",
  accentBorderLight: "#BFDBFE",
  accentShadow: "rgba(37, 99, 235, 0.15)",
  accentShadowStrong: "rgba(37, 99, 235, 0.4)",
  gradient: "linear-gradient(135deg, #1E3A8A, #2563EB)",
}

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────
const QUESTION_TYPES = [
  { id: "past", label: "5개년 핵심 기출문제", desc: "대학 학과별 기출 면접 질문", icon: "🎓" },
  { id: "expect", label: "생기부 예상문제", desc: "내 생기부 기반 예상 질문", icon: "📋" },
  { id: "ai", label: "AI 문제 생성", desc: "AI가 생성하는 맞춤 질문 (준비 중)", icon: "🤖", disabled: true },
] as const

const QUESTION_MODES = [
  { id: "text", label: "텍스트 표시", icon: "📝", desc: "질문을 화면에 보여줘요" },
  { id: "voice", label: "음성만", icon: "🎙️", desc: "질문을 음성으로만 들려줘요" },
  { id: "both", label: "텍스트 + 음성", icon: "📢", desc: "텍스트와 음성 동시에" },
]

const GRADE_OPTIONS = [
  { val: 1, label: "고1" },
  { val: 2, label: "고2" },
  { val: 3, label: "고3" },
]

const INTERVIEWERS = [
  {
    id: 1,
    name: "면접관 1",
    videoUrl: "https://yrunxizfvssiwyieevgw.supabase.co/storage/v1/object/public/simulation-videos/interviewer_left.mp4",
  },
  {
    id: 2,
    name: "면접관 2",
    videoUrl: "https://yrunxizfvssiwyieevgw.supabase.co/storage/v1/object/public/simulation-videos/interviewer_center.mp4",
  },
  {
    id: 3,
    name: "면접관 3",
    videoUrl: "https://yrunxizfvssiwyieevgw.supabase.co/storage/v1/object/public/simulation-videos/interviewer_right.mp4",
  },
]

const TIMER_SEC = 80
const QUESTION_COUNT = 5
const COUNTDOWN_SEC = 10

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────
const formatDateTime = (s: string) =>
  new Date(s).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

const formatDateTimeFull = (s: string) =>
  new Date(s).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

const pickRandom = <T,>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────
type Step = "list" | "setup" | "countdown" | "interview" | "result"

interface PickedQuestion {
  order: number
  text: string
}

interface AnswerRecord {
  order: number
  text: string
  blob: Blob | null
  durationSec: number
}

export default function Simulation() {
  const student = useAtomValue(studentState)
  const myGrade = gradeToNum((student as any)?.grade)

  // ─── DB ───
  const { data: simHistory = [], isLoading } = useMySimulations()
  const createSim = useCreateSimulation()
  const addQuestion = useAddSimulationQuestion()
  const submitAnswer = useSubmitSimulationAnswer()
  const completeSim = useCompleteSimulation()
  const deleteSim = useDeleteSimulation()

  // ─── 단계 / 설정 ───
  const [step, setStep] = useState<Step>("list")
  const [questionType, setQuestionType] = useState<"past" | "expect" | "ai" | "">("")
  const [tailQ, setTailQ] = useState<boolean | null>(null)
  const [questionMode, setQuestionMode] = useState<"text" | "voice" | "both" | "">("")

  // past 전용 — 대학/학과
  const [selUniv, setSelUniv] = useState("")
  const [selDept, setSelDept] = useState("")
  const [univSearch, setUnivSearch] = useState("")

  // expect 전용 — 학년
  const [selGrade, setSelGrade] = useState<number | null>(null)

  // ─── 면접 진행 상태 ───
  const [questions, setQuestions] = useState<PickedQuestion[]>([])
  const [curQIdx, setCurQIdx] = useState(0)
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC)
  const [timer, setTimer] = useState(TIMER_SEC)
  const [timerRunning, setTimerRunning] = useState(false)
  const [showQuestion, setShowQuestion] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [activeInterviewer, setActiveInterviewer] = useState(0)
  const [interviewStartTime, setInterviewStartTime] = useState(0)
  const [saving, setSaving] = useState(false)

  // 진행중 시뮬레이션 정보
  const [currentSimId, setCurrentSimId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])

  // ─── 결과/상세 보기 ───
  const [selSim, setSelSim] = useState<Simulation | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [playingQId, setPlayingQId] = useState<string | null>(null)

  // ─── refs ───
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)
  const recordStartRef = useRef<number>(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<any>(null)
  const interviewerRef = useRef<any>(null)

  // ─── 질문 소스 데이터 ───
  // past: 대학/학과 선택 시 → useMyPastQuestions
  const { data: allUniversities = [] } = useAllUniversities()
  const { data: deptsOfUniv = [] } = useDepartmentsOfUniversity(selUniv)
  const { data: pastQuestions = [] } = useMyPastQuestions(
    questionType === "past" ? selUniv : "",
    questionType === "past" ? selDept : "",
  )

  // expect: 학년 선택 시 → useMyQuestions
  const { data: expectQuestions = [] } = useMyExpectQuestions(
    questionType === "expect" && selGrade ? selGrade : 0,
  )

  // ─── 시뮬레이션 상세 보기용 질문 목록 ───
  const [selSimQuestions, setSelSimQuestions] = useState<any[]>([])
  useEffect(() => {
    if (!selSim) {
      setSelSimQuestions([])
      return
    }
    // 직접 fetch (훅을 동적으로 못 부르므로 effect로 처리)
    ;(async () => {
      const { supabase } = await import("@/lib/supabase")
      const { data } = await supabase
        .from("high_simulation_questions")
        .select("*")
        .eq("simulation_id", selSim.id)
        .order("order", { ascending: true })
      setSelSimQuestions(data ?? [])
    })()
  }, [selSim])

  // ─── 타이머 / 카운트다운 / 면접관 효과 ───
  useEffect(() => {
    if (step !== "countdown") return
    if (countdown <= 0) {
      setStep("interview")
      setTimerRunning(true)
      setInterviewStartTime(Date.now())
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [step, countdown])

  useEffect(() => {
    if (!timerRunning) return
    if (timer <= 0) {
      setTimerRunning(false)
      return
    }
    timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timerRunning, timer])

  useEffect(() => {
    if (step !== "interview") return
    interviewerRef.current = setInterval(
      () => setActiveInterviewer(Math.floor(Math.random() * 3)),
      3000,
    )
    return () => clearInterval(interviewerRef.current)
  }, [step])

  useEffect(() => {
    return () => {
      audioStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // ─── 녹음 제어 ───
  const startQuestionRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      recordStartRef.current = Date.now()
      setIsRecording(true)
    } catch (e) {
      console.error(e)
      alert("🎙️ 마이크 권한이 필요해요. 브라우저 설정에서 허용해주세요.")
      setStep("list")
    }
  }

  const stopQuestionRecording = (): Promise<{ blob: Blob | null; durationSec: number }> => {
    return new Promise((resolve) => {
      const rec = mediaRecorderRef.current
      if (!rec || rec.state === "inactive") {
        resolve({ blob: null, durationSec: 0 })
        return
      }
      rec.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const durationSec = Math.floor((Date.now() - recordStartRef.current) / 1000)
        audioStreamRef.current?.getTracks().forEach((t) => t.stop())
        audioStreamRef.current = null
        resolve({ blob, durationSec })
      }
      rec.stop()
    })
  }

  const finishCurrentAnswer = async () => {
    setIsRecording(false)
    const { blob, durationSec } = await stopQuestionRecording()
    const curQ = questions[curQIdx]
    const newAnswer: AnswerRecord = {
      order: curQ.order,
      text: curQ.text,
      blob,
      durationSec,
    }
    const newAnswers = [...answers, newAnswer]
    setAnswers(newAnswers)

    if (curQIdx >= questions.length - 1) {
      await finishInterview(newAnswers)
      return
    }
    setCurQIdx((i) => i + 1)
    setTimer(TIMER_SEC)
    setTimerRunning(true)
  }

  const skipQuestion = async () => {
    if (isRecording) {
      await finishCurrentAnswer()
      return
    }
    const curQ = questions[curQIdx]
    const newAnswers = [
      ...answers,
      { order: curQ.order, text: curQ.text, blob: null, durationSec: 0 },
    ]
    setAnswers(newAnswers)

    if (curQIdx >= questions.length - 1) {
      await finishInterview(newAnswers)
      return
    }
    setCurQIdx((i) => i + 1)
    setTimer(TIMER_SEC)
    setTimerRunning(true)
  }

  // ─── 시뮬레이션 종료: 답변 업로드 + 질문/답변 DB 저장 + complete ───
  const finishInterview = async (allAnswers: AnswerRecord[]) => {
    if (!currentSimId) {
      alert("시뮬레이션 ID가 없어요. 다시 시도해주세요.")
      setStep("list")
      return
    }
    setSaving(true)
    setTimerRunning(false)
    if (interviewerRef.current) clearInterval(interviewerRef.current)

    const elapsedSec = Math.floor((Date.now() - interviewStartTime) / 1000)

    try {
      // 각 질문에 대해 1) 질문 행 INSERT 2) 녹음 업로드 3) answer UPDATE
      for (const a of allAnswers) {
        // 1. 질문 행 생성
        const qRow = await addQuestion.mutateAsync({
          simulationId: currentSimId,
          order: a.order,
          questionText: a.text,
          isTail: false,
        })

        // 2. 녹음 있으면 업로드
        let recordingUrl: string | undefined
        if (a.blob) {
          try {
            recordingUrl = await uploadRecording(
              a.blob,
              currentSimId,
              `q${a.order}-${Date.now()}.webm`,
            )
          } catch (e: any) {
            console.error("녹음 업로드 실패:", e)
          }
        }

        // 3. 답변 정보 업데이트 (있을 때만)
        if (recordingUrl || a.durationSec > 0) {
          await submitAnswer.mutateAsync({
            questionId: qRow.id,
            simulationId: currentSimId,
            recordingUrl,
            durationSec: a.durationSec,
          })
        }
      }

      // 시뮬레이션 완료 처리
      await completeSim.mutateAsync({
        simulationId: currentSimId,
        durationSec: elapsedSec,
        questionCount: allAnswers.length,
      })

      // 결과 화면용 데이터
      const updated = simHistory.find((s: Simulation) => s.id === currentSimId) ?? null
      setSelSim(updated)
      setStep("result")
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ─── 시작 가능 여부 ───
  const canStart = (() => {
    if (!questionType || tailQ === null || !questionMode) return false
    if (questionType === "past") return !!selUniv && !!selDept
    if (questionType === "expect") return !!selGrade
    return false
  })()

  // ─── 시뮬레이션 시작 ───
  const startSimulation = async () => {
    if (!canStart) return

    // 1. 질문 소스 결정
    let sourcePool: string[] = []
    if (questionType === "past") {
      sourcePool = pastQuestions
        .map((q: QuestionWithAnswer) => q.question)
        .filter((s: string | undefined): s is string => !!s)
    } else if (questionType === "expect") {
      sourcePool = expectQuestions
        .map((q: ExpectQuestion) => q.teacher_edited_question || q.question)
        .filter((s: string | null | undefined): s is string => !!s)
    }

    if (sourcePool.length === 0) {
      alert("해당 조건에 등록된 질문이 없어요. 다른 조건을 선택해주세요.")
      return
    }

    // 2. 랜덤 N개
    const picked = pickRandom(sourcePool, Math.min(QUESTION_COUNT, sourcePool.length))
    const numbered: PickedQuestion[] = picked.map((text, i) => ({
      order: i + 1,
      text,
    }))

    // 3. 시뮬레이션 행 생성 (질문은 면접 종료 시 한꺼번에 저장)
    try {
      const newSim = await createSim.mutateAsync({
        questionType,
        tailQuestionEnabled: tailQ === true,
        questionMode,
        university: questionType === "past" ? selUniv : undefined,
        department: questionType === "past" ? selDept : undefined,
        grade: questionType === "expect" && selGrade ? `고${selGrade}` : undefined,
      })
      setCurrentSimId(newSim.id)
    } catch (e: any) {
      alert(`시뮬레이션 생성 실패: ${e.message}`)
      return
    }

    // 4. 면접 진행 상태 초기화
    setQuestions(numbered)
    setCountdown(COUNTDOWN_SEC)
    setCurQIdx(0)
    setTimer(TIMER_SEC)
    setAnswers([])
    setShowQuestion(questionMode !== "voice")
    setIsRecording(false)
    setStep("countdown")
  }

  const handleDeleteSim = async (id: string) => {
    try {
      await deleteSim.mutateAsync(id)
      if (selSim?.id === id) setSelSim(null)
      setDeleteTarget(null)
    } catch (e: any) {
      alert(`삭제 실패: ${e.message}`)
    }
  }

  const resetSetup = () => {
    setQuestionType("")
    setTailQ(null)
    setQuestionMode("")
    setSelUniv("")
    setSelDept("")
    setUnivSearch("")
    setSelGrade(null)
    setCurrentSimId(null)
  }

  const toggleType = (id: "past" | "expect" | "ai") => {
    if (id === "ai") return // 비활성
    if (questionType === id) {
      setQuestionType("")
    } else {
      setQuestionType(id)
    }
    // 유형 바뀌면 종속 선택 초기화
    setSelUniv("")
    setSelDept("")
    setUnivSearch("")
    setSelGrade(null)
  }

  const filteredUnivs = allUniversities.filter((u: string) =>
    u.toLowerCase().includes(univSearch.toLowerCase()),
  )

  const playQuestionAudio = async (qId: string, audioUrl: string) => {
    if (!audioRef.current) return
    const audio = audioRef.current
    if (playingQId === qId) {
      audio.pause()
      setPlayingQId(null)
      return
    }
    try {
      audio.pause()
      audio.currentTime = 0
      audio.src = audioUrl
      audio.muted = false
      audio.volume = 1.0
      audio.load()
      await new Promise<void>((resolve) => {
        const onReady = () => {
          audio.removeEventListener("loadedmetadata", onReady)
          resolve()
        }
        audio.addEventListener("loadedmetadata", onReady)
        setTimeout(resolve, 1000)
      })
      await audio.play()
      setPlayingQId(qId)
    } catch (err: any) {
      console.error("재생 실패:", err)
      alert(`음성 재생 실패: ${err.message}`)
      setPlayingQId(null)
    }
  }

  // ─── 시뮬레이션 제목 ───
  const getSimTitle = (sim: Simulation) => {
    if (sim.university && sim.department) {
      return `${sim.university} · ${sim.department}`
    }
    if (sim.grade) return `${sim.grade} · ${getQuestionTypeLabel(sim.question_type)}`
    return getQuestionTypeLabel(sim.question_type)
  }

  // ═════════════════════════════════════════════
  // 목록 화면
  // ═════════════════════════════════════════════
  if (step === "list") {
    return (
      <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">
        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* ─── 왼쪽: 시뮬레이션 목록 ─── */}
          <div className="w-[340px] flex-shrink-0 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-3.5 py-3 border-b border-line flex-shrink-0">
              <div className="text-[14px] font-bold text-ink tracking-tight">
                면접 시뮬레이션
              </div>
              <div className="text-[11px] text-ink-secondary mt-0.5">
                총 <span className="font-bold" style={{ color: THEME.accent }}>
                  {simHistory.length}개
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2.5">
              {isLoading ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  불러오는 중...
                </div>
              ) : simHistory.length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  <div className="text-3xl mb-2">🎙️</div>
                  시뮬레이션 기록이 없어요.
                </div>
              ) : (
                simHistory.map((s: Simulation) => {
                  const isSel = selSim?.id === s.id
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelSim(s)
                        setPlayingQId(null)
                      }}
                      className="border rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all relative"
                      style={{
                        borderColor: isSel ? THEME.accent : "#E5E7EB",
                        background: isSel ? THEME.accentBg : "#fff",
                        boxShadow: isSel
                          ? `0 4px 16px ${THEME.accentShadow}`
                          : "none",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(s.id)
                        }}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 text-ink-muted flex items-center justify-center text-[10px] transition-colors"
                      >
                        ✕
                      </button>
                      <div className="text-[10px] text-ink-muted font-medium mb-1">
                        {formatDateTime(s.created_at)}
                      </div>
                      <div className="text-[12.5px] font-semibold text-ink mb-1.5 pr-6">
                        {getSimTitle(s)}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{
                            color: THEME.accentDark,
                            background: THEME.accentBg,
                            borderColor: THEME.accentBorderLight,
                          }}
                        >
                          {getQuestionTypeLabel(s.question_type)}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{
                            color: THEME.accentDark,
                            background: THEME.accentBg,
                            borderColor: THEME.accentBorderLight,
                          }}
                        >
                          꼬리질문 {s.tail_question_enabled ? "ON" : "OFF"}
                        </span>
                        {s.teacher_feedback && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            ✓ 피드백
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="p-3 border-t border-line flex-shrink-0">
              <button
                onClick={() => {
                  resetSetup()
                  setStep("setup")
                }}
                className="w-full h-11 text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px"
                style={{
                  background: THEME.accent,
                  boxShadow: `0 4px 16px ${THEME.accentShadow}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = THEME.accentHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = THEME.accent)}
              >
                + 모의면접 시작하기
              </button>
            </div>
          </div>

          {/* ─── 오른쪽: 상세 ─── */}
          <div className="flex-1 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)] min-w-0">
            {!selSim ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                <div className="text-4xl">🎙️</div>
                <div className="text-[14px] font-semibold text-ink-secondary">
                  시뮬레이션을 선택해주세요
                </div>
                <div className="text-[12px]">
                  왼쪽에서 기록을 클릭하면 피드백을 볼 수 있어요
                </div>
              </div>
            ) : (
              <>
                <audio
                  ref={audioRef}
                  onEnded={() => setPlayingQId(null)}
                  className="hidden"
                />
                <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
                  <div className="text-[14px] font-extrabold text-ink tracking-tight mb-1">
                    {getSimTitle(selSim)}
                  </div>
                  <div className="text-[11px] text-ink-muted font-medium">
                    {formatDateTimeFull(selSim.created_at)} ·{" "}
                    {formatSimDuration(selSim.duration_sec)} ·{" "}
                    {selSim.question_count}문제
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {/* 선생님 피드백 */}
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                      선생님 피드백
                    </div>
                    {selSim.teacher_feedback ? (
                      <div
                        className="rounded-lg px-3 py-2.5 text-[13px] leading-[1.8] whitespace-pre-wrap border"
                        style={{
                          background: THEME.accentBg,
                          color: THEME.accentDark,
                          borderColor: THEME.accentBorderLight,
                        }}
                      >
                        {selSim.teacher_feedback}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                        선생님 피드백을 기다리는 중이에요.
                      </div>
                    )}
                  </div>

                  {/* 질문 + 답변 */}
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider px-1">
                    질문별 답변 ({selSimQuestions.length}개)
                  </div>
                  {selSimQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="bg-white border border-line rounded-xl px-4 py-3.5"
                    >
                      <div className="flex items-start gap-2 mb-2.5">
                        <span
                          className="w-6 h-6 rounded-full text-white text-[11px] font-extrabold flex items-center justify-center flex-shrink-0"
                          style={{ background: THEME.accent }}
                        >
                          Q{q.order}
                        </span>
                        <span className="text-[13px] font-semibold text-ink leading-[1.5] flex-1">
                          {q.question_text}
                        </span>
                        {q.recording_url ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
                            답변완료
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">
                            미답변
                          </span>
                        )}
                      </div>

                      {q.recording_url && (
                        <div className="bg-gray-50 border border-line rounded-lg px-3 py-2 mb-2 flex items-center gap-2.5">
                          <button
                            onClick={() => playQuestionAudio(q.id, q.recording_url)}
                            className="w-9 h-9 rounded-full text-white flex items-center justify-center text-xs flex-shrink-0 transition-all hover:scale-105"
                            style={{
                              background: THEME.accent,
                              boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                            }}
                          >
                            {playingQId === q.id ? "⏸" : "▶"}
                          </button>
                          <div className="flex-1 text-[11px] text-ink-secondary font-medium">
                            {playingQId === q.id ? "재생 중..." : "재생하려면 클릭"}
                            <div className="text-[10px] text-ink-muted">
                              길이: {formatTime(q.duration_sec || 0)}
                            </div>
                          </div>
                        </div>
                      )}

                      {q.transcript && (
                        <div
                          className="rounded-lg px-3 py-2 text-[12.5px] leading-[1.7] whitespace-pre-wrap border"
                          style={{
                            background: THEME.accentBg,
                            color: THEME.accentDark,
                            borderColor: THEME.accentBorderLight,
                          }}
                        >
                          <div
                            className="text-[10px] font-bold mb-1"
                            style={{ color: THEME.accentDark }}
                          >
                            📝 음성 텍스트
                          </div>
                          {q.transcript}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── 삭제 모달 ─── */}
        {deleteTarget !== null && (
          <div
            onClick={() => setDeleteTarget(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-7 w-[380px] text-center shadow-[0_24px_64px_rgba(0,0,0,0.2)]"
            >
              <div className="text-4xl mb-3">⚠️</div>
              <div className="text-[16px] font-bold text-ink mb-2 tracking-tight">
                시뮬레이션을 삭제하시겠어요?
              </div>
              <div className="text-[13px] text-ink-secondary mb-6 leading-[1.6]">
                삭제하면 녹음 파일과 피드백이 모두 사라져요.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => handleDeleteSim(deleteTarget)}
                  disabled={deleteSim.isPending}
                  className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(239,68,68,0.3)] disabled:opacity-50"
                >
                  {deleteSim.isPending ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═════════════════════════════════════════════
  // 설정 모달
  // ═════════════════════════════════════════════
  if (step === "setup") {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-7 w-[560px] max-h-[92vh] overflow-y-auto shadow-[0_24px_64px_rgba(0,0,0,0.2)] font-sans text-ink">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[17px] font-extrabold text-ink tracking-tight">
              시뮬레이션 설정
            </div>
            <button
              onClick={() => setStep("list")}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-ink-secondary transition-colors"
            >
              ✕
            </button>
          </div>

          {/* 헤더 카드 */}
          <div
            className="rounded-xl px-5 py-4 mb-5 flex items-center gap-3 relative overflow-hidden"
            style={{
              background: THEME.gradient,
              boxShadow: `0 8px 24px ${THEME.accentShadow}`,
            }}
          >
            <div
              className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)",
              }}
            />
            <div className="text-4xl relative">🎯</div>
            <div className="relative">
              <div className="text-[11px] bg-white/20 backdrop-blur-sm text-white font-semibold px-2 py-0.5 rounded-full inline-block mb-1">
                실전처럼 차근차근 해보자!
              </div>
              <div className="text-[15px] font-extrabold text-white tracking-tight">
                원하는 문제 유형을 골라주세요
              </div>
              <div className="text-[12px] text-white/90 font-medium">
                하나만 선택해서 시작해요.
              </div>
            </div>
          </div>

          {/* 문제 유형 */}
          <div className="mb-5">
            <div className="text-[13px] font-bold text-ink mb-2.5">
              문제 유형 (1개 선택)
            </div>
            <div className="flex flex-col gap-2">
              {QUESTION_TYPES.map((t) => {
                const isSel = questionType === t.id
                const isDisabled = (t as any).disabled
                return (
                  <div key={t.id}>
                    <button
                      onClick={() => toggleType(t.id as any)}
                      disabled={isDisabled}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        borderColor: isSel ? THEME.accent : "#E5E7EB",
                        background: isSel ? THEME.accentBg : "#fff",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{t.icon}</span>
                        <div>
                          <div className="text-[13px] font-bold text-ink">{t.label}</div>
                          <div className="text-[11px] text-ink-secondary font-medium">
                            {t.desc}
                          </div>
                        </div>
                      </div>
                      {isSel && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                          style={{ background: THEME.accent }}
                        >
                          ✓
                        </div>
                      )}
                    </button>

                    {/* past: 대학 + 학과 선택 */}
                    {isSel && t.id === "past" && (
                      <div
                        className="rounded-lg px-3.5 py-3 mt-1.5 border"
                        style={{
                          background: `${THEME.accentBg}99`,
                          borderColor: THEME.accentBorderLight,
                        }}
                      >
                        <div
                          className="text-[11px] font-bold mb-2"
                          style={{ color: THEME.accentDark }}
                        >
                          🏫 대학 선택
                        </div>
                        <input
                          value={univSearch}
                          onChange={(e) => {
                            setUnivSearch(e.target.value)
                            setSelUniv("")
                            setSelDept("")
                          }}
                          placeholder="대학 이름 검색 (예: 서울대, 연세대...)"
                          className="w-full h-9 px-3 border border-line rounded-lg text-[12px] focus:outline-none transition-all mb-2 bg-white placeholder:text-ink-muted"
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = THEME.accent
                            e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#E5E7EB"
                            e.currentTarget.style.boxShadow = "none"
                          }}
                        />
                        {selUniv && (
                          <div
                            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 mb-2 border"
                            style={{
                              background: THEME.accentBg,
                              borderColor: THEME.accentBorderLight,
                            }}
                          >
                            <span
                              className="text-[12px] font-bold"
                              style={{ color: THEME.accentDark }}
                            >
                              ✓ {selUniv}
                            </span>
                            <button
                              onClick={() => {
                                setSelUniv("")
                                setSelDept("")
                              }}
                              className="ml-auto text-[10px] text-ink-muted hover:text-ink"
                            >
                              변경
                            </button>
                          </div>
                        )}
                        {!selUniv && (
                          <div className="max-h-[160px] overflow-y-auto flex flex-col gap-1 mb-3">
                            {filteredUnivs.length === 0 ? (
                              <div className="text-[12px] text-ink-muted text-center py-3">
                                {univSearch
                                  ? "검색 결과가 없어요"
                                  : "대학명을 입력해주세요"}
                              </div>
                            ) : (
                              filteredUnivs.slice(0, 30).map((u: string) => (
                                <button
                                  key={u}
                                  onClick={() => {
                                    setSelUniv(u)
                                    setSelDept("")
                                  }}
                                  className="flex items-center justify-between px-2.5 py-1.5 border border-line rounded-md text-[12px] bg-white text-ink hover:bg-gray-50 transition-all text-left"
                                >
                                  {u}
                                </button>
                              ))
                            )}
                          </div>
                        )}

                        {/* 학과 선택 */}
                        {selUniv && (
                          <>
                            <div
                              className="text-[11px] font-bold mb-2"
                              style={{ color: THEME.accentDark }}
                            >
                              📚 학과 선택
                            </div>
                            <div className="max-h-[160px] overflow-y-auto flex flex-col gap-1">
                              {deptsOfUniv.length === 0 ? (
                                <div className="text-[12px] text-ink-muted text-center py-3">
                                  등록된 학과가 없어요
                                </div>
                              ) : (
                                deptsOfUniv.map((d: string) => {
                                  const isD = selDept === d
                                  return (
                                    <button
                                      key={d}
                                      onClick={() => setSelDept(isD ? "" : d)}
                                      className="flex items-center justify-between px-2.5 py-1.5 border rounded-md text-[12px] transition-all text-left"
                                      style={{
                                        borderColor: isD ? THEME.accent : "#E5E7EB",
                                        background: isD ? THEME.accentBg : "#fff",
                                        color: isD ? THEME.accentDark : "#0F172A",
                                        fontWeight: isD ? 600 : 400,
                                      }}
                                    >
                                      {d}
                                      {isD && (
                                        <span
                                          className="text-[11px] font-bold"
                                          style={{ color: THEME.accentDark }}
                                        >
                                          ✓
                                        </span>
                                      )}
                                    </button>
                                  )
                                })
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* expect: 학년 선택 */}
                    {isSel && t.id === "expect" && (
                      <div
                        className="rounded-lg px-3.5 py-3 mt-1.5 border"
                        style={{
                          background: `${THEME.accentBg}99`,
                          borderColor: THEME.accentBorderLight,
                        }}
                      >
                        <div
                          className="text-[11px] font-bold mb-2"
                          style={{ color: THEME.accentDark }}
                        >
                          🎒 학년 선택
                        </div>
                        <div className="flex gap-2">
                          {GRADE_OPTIONS.map((g) => {
                            const isG = selGrade === g.val
                            return (
                              <button
                                key={g.val}
                                onClick={() => setSelGrade(isG ? null : g.val)}
                                className="flex-1 h-10 rounded-lg text-[13px] border-2 transition-all font-semibold"
                                style={{
                                  borderColor: isG ? THEME.accent : "#E5E7EB",
                                  background: isG ? THEME.accentBg : "#fff",
                                  color: isG ? THEME.accentDark : "#475569",
                                  fontWeight: isG ? 800 : 600,
                                }}
                              >
                                {g.label}
                              </button>
                            )
                          })}
                        </div>
                        {myGrade && selGrade !== myGrade && (
                          <div className="text-[10px] text-ink-muted mt-2">
                            ℹ 내 학년은 고{myGrade}이에요
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 꼬리질문 */}
          <div className="mb-5">
            <div className="text-[13px] font-bold text-ink mb-2.5">꼬리질문</div>
            <div className="flex gap-2.5">
              {[
                { val: true, label: "ON" },
                { val: false, label: "OFF" },
              ].map((o) => {
                const isSel = tailQ === o.val
                return (
                  <button
                    key={String(o.val)}
                    onClick={() => setTailQ(o.val)}
                    className="flex-1 h-11 rounded-xl text-[14px] border-2 transition-all"
                    style={{
                      borderColor: isSel ? THEME.accent : "#E5E7EB",
                      background: isSel ? THEME.accentBg : "#fff",
                      color: isSel ? THEME.accentDark : "#475569",
                      fontWeight: isSel ? 800 : 500,
                    }}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 질문 방식 */}
          <div className="mb-6">
            <div className="text-[13px] font-bold text-ink mb-2.5">질문 방식</div>
            <div className="flex flex-col gap-2">
              {QUESTION_MODES.map((m) => {
                const isSel = questionMode === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setQuestionMode(m.id as any)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
                    style={{
                      borderColor: isSel ? THEME.accent : "#E5E7EB",
                      background: isSel ? THEME.accentBg : "#fff",
                    }}
                  >
                    <span className="text-2xl">{m.icon}</span>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold text-ink">{m.label}</div>
                      <div className="text-[11px] text-ink-secondary font-medium">
                        {m.desc}
                      </div>
                    </div>
                    {isSel && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                        style={{ background: THEME.accent }}
                      >
                        ✓
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={startSimulation}
            disabled={!canStart || createSim.isPending}
            className="w-full h-12 rounded-xl text-[14px] font-bold transition-all"
            style={{
              background: canStart && !createSim.isPending ? THEME.accent : "#F3F4F6",
              color: canStart && !createSim.isPending ? "#fff" : "#94A3B8",
              cursor: canStart && !createSim.isPending ? "pointer" : "not-allowed",
              boxShadow:
                canStart && !createSim.isPending
                  ? `0 4px 16px ${THEME.accentShadow}`
                  : "none",
            }}
          >
            {createSim.isPending ? "준비 중..." : "다음으로 →"}
          </button>
        </div>
      </div>
    )
  }

  // ═════════════════════════════════════════════
  // 카운트다운
  // ═════════════════════════════════════════════
  if (step === "countdown") {
    const subtitle =
      questionType === "past"
        ? `${selUniv} · ${selDept}`
        : questionType === "expect"
        ? `고${selGrade} · ${getQuestionTypeLabel("expect")}`
        : ""

    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-5 font-sans text-ink relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${THEME.accentBg}, #fff, ${THEME.accentBg}99)`,
        }}
      >
        <div
          className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.15), transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.1), transparent 70%)",
          }}
        />

        <div className="flex gap-2 mb-2 relative z-10">
          <span
            className="text-[12px] font-bold px-3 py-1 rounded-full border"
            style={{
              background: THEME.accentBg,
              color: THEME.accentDark,
              borderColor: THEME.accentBorderLight,
            }}
          >
            {getQuestionTypeLabel(questionType)}
          </span>
          <span className="text-[12px] font-bold bg-red-50 text-red-500 px-3 py-1 rounded-full border border-red-200">
            꼬리질문 {tailQ ? "ON" : "OFF"}
          </span>
        </div>

        <div className="text-[20px] font-extrabold text-ink tracking-tight relative z-10">
          {subtitle}
        </div>
        <div className="text-[80px] relative z-10"></div>
        <div className="text-[15px] text-ink-secondary text-center leading-[1.8] font-medium relative z-10">
          잠시 후 면접이 시작돼요.
          <br />
          깊게 숨 한번 쉬고, 천천히 호흡을 가다듬어볼까요?
        </div>
        <div
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-[32px] font-extrabold mt-2 relative z-10"
          style={{
            border: `3px solid ${THEME.accent}`,
            color: THEME.accentDark,
            boxShadow: `0 8px 24px ${THEME.accentShadow}`,
          }}
        >
          {countdown}
        </div>
      </div>
    )
  }

  // ═════════════════════════════════════════════
  // 면접 화면
  // ═════════════════════════════════════════════
  if (step === "interview") {
    const curQ = questions[curQIdx]
    if (!curQ) return null

    const subtitle =
      questionType === "past"
        ? `${selUniv} · ${selDept}`
        : `고${selGrade}`

    return (
      <div className="h-full bg-[#0a0a0a] flex flex-col overflow-hidden relative font-sans">
        {/* 상단 바 */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3">
          <button
            onClick={async () => {
              if (isRecording) await stopQuestionRecording()
              setStep("list")
            }}
            className="text-[13px] text-white/80 hover:text-white font-medium transition-colors"
          >
            ← 처음으로
          </button>
          <div className="text-[14px] font-bold text-white tracking-tight">
            실전 면접 시뮬레이션
          </div>
          <div className="text-[12px] text-white/60 font-medium">
            고민하는 시간도 성장의 일부예요!
          </div>
        </div>

        {/* 정보 표시 */}
        <div className="absolute top-11 left-0 right-0 z-10 flex items-center gap-2 px-5 py-1.5">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: THEME.accentBg, color: THEME.accentDark }}
          >
            {getQuestionTypeLabel(questionType)}
          </span>
          <span className="text-[11px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
            꼬리질문 {tailQ ? "ON" : "OFF"}
          </span>
          <span className="text-[11px] text-white/60 font-medium">{subtitle}</span>
          <span className="text-[11px] text-white/60 font-medium ml-auto">
            {curQIdx + 1} / {questions.length}
          </span>
          {isRecording && (
            <span className="text-[11px] font-bold bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
          )}
        </div>

        {/* 면접관 영상 3명 */}
        <div className="flex-1 flex items-center justify-center pt-20 pb-[120px]">
          <div className="flex gap-1 w-full h-full">
            {INTERVIEWERS.map((iv, i) => {
              const isActive = activeInterviewer === i
              return (
                <div
                  key={iv.id}
                  className="flex-1 flex flex-col items-center justify-center rounded transition-all relative overflow-hidden"
                  style={{
                    background: isActive ? "#0F1B33" : "#0a0a0a",
                    border: isActive
                      ? `1px solid ${THEME.accent}80`
                      : "1px solid transparent",
                    boxShadow: isActive
                      ? `inset 0 0 32px ${THEME.accentShadow}`
                      : "none",
                  }}
                >
                  <video
                    src={iv.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                    <div
                      className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm"
                      style={{
                        color: isActive ? THEME.accentBorder : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {iv.name}
                    </div>
                    {isActive && (
                      <div className="flex gap-1 mt-1.5">
                        <div
                          className="w-1 h-1 rounded-full animate-pulse"
                          style={{ background: THEME.accentBorder }}
                        />
                        <div
                          className="w-1 h-1 rounded-full animate-pulse"
                          style={{
                            background: THEME.accentBorder,
                            animationDelay: "0.2s",
                          }}
                        />
                        <div
                          className="w-1 h-1 rounded-full animate-pulse"
                          style={{
                            background: THEME.accentBorder,
                            animationDelay: "0.4s",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 타이머 */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-black/70 backdrop-blur-md rounded-full px-4 py-1 flex items-center gap-2 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[14px] font-bold text-white font-mono">
              {formatTime(timer)} / 01:20
            </span>
          </div>
        </div>

        {/* 하단 질문 + 버튼 */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black via-black/90 to-transparent px-6 pt-5 pb-6">
          <div className="text-[11px] text-amber-300/90 mb-1.5 font-medium">
            * {getQuestionTypeLabel(questionType)} 중 {questions.length}문제가 무작위로 출제됩니다.
          </div>
          <div className="flex items-center justify-between gap-5">
            <div className="flex-1 min-w-0">
              {showQuestion ? (
                <div className="text-[20px] font-extrabold text-white tracking-tight leading-[1.4]">
                  <span style={{ color: THEME.accentBorder }}>
                    질문 {curQIdx + 1}.{" "}
                  </span>
                  {curQ.text}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="text-[20px] font-extrabold text-white">
                    <span style={{ color: THEME.accentBorder }}>
                      질문 {curQIdx + 1}.{" "}
                    </span>
                    <span className="bg-white/10 backdrop-blur-sm rounded-md px-2 py-0.5 text-white/50 text-sm font-medium">
                      음성으로 확인하세요
                    </span>
                  </div>
                  <button
                    onClick={() => setShowQuestion(true)}
                    className="text-[11px] font-semibold rounded-md px-2 py-1 border transition-colors"
                    style={{
                      color: THEME.accentBorder,
                      background: `${THEME.accent}33`,
                      borderColor: `${THEME.accent}80`,
                    }}
                  >
                    텍스트 보기
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2.5 flex-shrink-0">
              {!isRecording ? (
                <>
                  <button
                    onClick={startQuestionRecording}
                    disabled={saving}
                    className="h-11 px-5 rounded-lg text-[13px] font-bold text-white transition-all hover:-translate-y-px disabled:opacity-50"
                    style={{
                      background: THEME.accent,
                      boxShadow: `0 4px 16px ${THEME.accentShadowStrong}`,
                    }}
                  >
                    ● 답변 시작
                  </button>
                  <button
                    onClick={skipQuestion}
                    disabled={saving}
                    className="h-11 px-5 bg-white/10 backdrop-blur-sm text-white border border-white/30 rounded-lg text-[13px] font-semibold hover:bg-white/20 transition-all disabled:opacity-50"
                  >
                    {saving
                      ? "저장 중..."
                      : curQIdx >= questions.length - 1
                      ? "면접 종료 →"
                      : "건너뛰기 →"}
                  </button>
                </>
              ) : (
                <button
                  onClick={finishCurrentAnswer}
                  disabled={saving}
                  className="h-11 px-5 rounded-lg text-[13px] font-bold text-white transition-all hover:-translate-y-px bg-red-500 hover:bg-red-600 disabled:opacity-50"
                  style={{ boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}
                >
                  {saving
                    ? "저장 중..."
                    : curQIdx >= questions.length - 1
                    ? "⏹ 답변 종료 (면접 종료)"
                    : "⏹ 답변 종료 (다음 질문)"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═════════════════════════════════════════════
  // 결과 화면
  // ═════════════════════════════════════════════
  if (step === "result") {
    const answeredCount = answers.filter((a) => a.blob).length
    return (
      <div className="px-6 py-4 font-sans text-ink h-full overflow-y-auto">
        <div className="flex items-center gap-2.5 mb-3">
          <button
            onClick={() => setStep("list")}
            className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-base text-ink-secondary transition-all"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = THEME.accentBorder
              e.currentTarget.style.color = THEME.accentDark
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#E5E7EB"
              e.currentTarget.style.color = "#475569"
            }}
          >
            ←
          </button>
          <div className="text-[16px] font-semibold text-ink">시뮬레이션 완료</div>
        </div>

        <div className="text-center py-3 mb-3 relative overflow-hidden">
          <div className="relative">
            <div className="text-3xl mb-1">🎉</div>
            <div className="text-[18px] font-extrabold text-ink tracking-tight mb-0.5">
              면접 시뮬레이션 완료!
            </div>
            <div className="text-[12px] text-ink-secondary font-medium">
              총 {answers.length}개 질문에 답변했어요.
            </div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 mb-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="text-[13px] font-bold text-ink mb-2 tracking-tight">
            이번 시뮬레이션 요약
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "답변한 질문", val: `${answeredCount}/${answers.length}개` },
              {
                label: "문제 유형",
                val: getQuestionTypeLabel(questionType),
              },
              { label: "꼬리질문", val: tailQ ? "ON" : "OFF" },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-gray-50 border border-line rounded-xl px-3 py-2 text-center"
              >
                <div className="text-[10px] text-ink-muted font-medium mb-0.5">
                  {s.label}
                </div>
                <div className="text-[14px] font-extrabold text-ink tracking-tight">
                  {s.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-xl px-4 py-3 mb-3 border"
          style={{
            background: THEME.accentBg,
            borderColor: THEME.accentBorderLight,
          }}
        >
          <div
            className="text-[12px] font-bold mb-0.5"
            style={{ color: THEME.accentDark }}
          >
            💬 선생님 피드백 대기중
          </div>
          <div className="text-[11px] text-ink-secondary leading-[1.5]">
            선생님이 녹음 내용을 듣고 피드백을 남겨드릴 예정이에요.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              resetSetup()
              setStep("setup")
            }}
            className="flex-1 h-11 text-white rounded-xl text-[13px] font-bold transition-all hover:-translate-y-px"
            style={{
              background: THEME.accent,
              boxShadow: `0 4px 16px ${THEME.accentShadow}`,
            }}
          >
            다시 시뮬레이션하기
          </button>
          <button
            onClick={() => setStep("list")}
            className="flex-1 h-11 bg-white rounded-xl text-[13px] font-bold transition-all"
            style={{
              border: `2px solid ${THEME.accent}`,
              color: THEME.accentDark,
            }}
          >
            📋 방금 한거 상세보기
          </button>
        </div>
      </div>
    )
  }

  return null
}