import { useState, useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { studentState, academyState } from "@/lib/auth/atoms";
import { supabase } from "@/lib/supabase";
import { alignAudio, analyzeInterview } from "@/api/aligner";
import {
  useMySimulations,
  useCreateSimulation,
  useDeleteSimulation,
  type SimulationAnswerInput,
} from "@/pages/middle-student/_hooks/useMySimulation";
// 🎯 기출문제 DB 훅
import {
  useAllSchools,
  useSchoolQuestions,
} from "@/pages/middle-student/_hooks/useMyPast";
// 🎯 자소서 DB 훅
import {
  useMyEssays,
  useEssayQuestions,
} from "@/pages/middle-student/_hooks/useExpect";

const QUESTION_TYPES = [
  { id: "past", label: "기출문제", desc: "자사고·특목고 기출 면접 질문" },
  { id: "essay", label: "자소서 예상질문", desc: "내 자소서 기반 예상 질문" },
  { id: "record", label: "생기부 예상질문", desc: "생활기록부 기반 예상 질문" },
];

const QUESTION_MODES = [
  { id: "text", label: "텍스트 표시", icon: "📝", desc: "질문을 화면에 보여줘요" },
  { id: "voice", label: "음성만", icon: "🎙️", desc: "질문을 음성으로만 들려줘요" },
  { id: "both", label: "텍스트 + 음성", icon: "📢", desc: "텍스트와 음성 동시에" },
];

// 🎯 생기부는 아직 미구현 → 더미 유지
const RECORD_SCHOOLS = [{ school: "인천하늘고", date: "2024.04.01" }];

const RECORD_DUMMY_QUESTIONS = [
  { num: 1, text: "생기부에 기록된 독서 활동 중 가장 인상 깊었던 책을 말해보세요." },
  { num: 2, text: "생기부의 봉사활동에서 어떤 점을 배웠나요?" },
  { num: 3, text: "생기부에 나온 동아리 활동을 구체적으로 설명해주세요." },
  { num: 4, text: "생기부에서 가장 자랑스러운 성취는 무엇인가요?" },
  { num: 5, text: "생기부 활동들이 본인의 진로와 어떻게 연결되나요?" },
];

// 🎬 면접관 영상 3개
const INTERVIEWERS = [
  {
    id: 1,
    name: "면접관 1",
    videoUrl: "https://yrunxizfvssiwyieevgw.supabase.co/storage/v1/object/public/simulation-videos/interviewer_left.mp4",
    loop: true,
  },
  {
    id: 2,
    name: "면접관 2",
    videoUrl: "https://yrunxizfvssiwyieevgw.supabase.co/storage/v1/object/public/simulation-videos/interviewer_center.mp4",
    loop: true,
  },
  {
    id: 3,
    name: "면접관 3",
    videoUrl: "https://yrunxizfvssiwyieevgw.supabase.co/storage/v1/object/public/simulation-videos/interviewer_right.mp4",
    loop: true,
  },
];

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDateTimeFull = (dateStr: string) =>
  new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// 🎯 배열에서 랜덤 N개 뽑기
const pickRandom = <T,>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};

export default function MiddleSimulation() {
  const student = useAtomValue(studentState);
  const academy = useAtomValue(academyState);
  const studentId = student?.id ? String(student.id) : undefined;

  const { data: simHistory = [], isLoading } = useMySimulations(studentId);
  const createSim = useCreateSimulation();
  const deleteSim = useDeleteSimulation();

  // 🎯 DB에서 학교/질문 가져오기
  const { data: allPastSchools = [] } = useAllSchools();
  const { data: myEssays = [] } = useMyEssays(studentId);
  // 예상질문 생성된 자소서만
  const availableEssays = myEssays.filter((e) => e.questions_generated);

  const [step, setStep] = useState<"list" | "setup" | "countdown" | "interview" | "result">("list");
  const [questionType, setQuestionType] = useState("");
  const [tailQ, setTailQ] = useState<boolean | null>(null);
  const [questionMode, setQuestionMode] = useState("");
  const [selSchool, setSelSchool] = useState("");
  const [selEssayId, setSelEssayId] = useState<string>("");  // 🎯 자소서 essay_id
  const [pastSchoolSearch, setPastSchoolSearch] = useState("");
  const [countdown, setCountdown] = useState(10);
  const [curQIdx, setCurQIdx] = useState(0);

  // 🎯 시뮬레이션용 질문 (DB에서 가져와서 랜덤 5개)
  const [questions, setQuestions] = useState<{ num: number; text: string }[]>([]);

  const [timer, setTimer] = useState(80);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showQuestion, setShowQuestion] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [activeInterviewer, setActiveInterviewer] = useState(0);
  const [selSim, setSelSim] = useState<any>(null);
  const [playingQNum, setPlayingQNum] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [interviewStartTime, setInterviewStartTime] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  // [추가] 꼬리질문 생성 중 표시 (답변 종료 → STT → AI 꼬리질문)
  const [tailLoading, setTailLoading] = useState(false);
  // [추가] 현재 질문이 꼬리질문인지 여부 (화면 표시용)
  const [isTailQuestion, setIsTailQuestion] = useState(false);

  const [answers, setAnswers] = useState<SimulationAnswerInput[]>([]);
  const recordStartTimeRef = useRef<number>(0);
  // [추가] finishInterview 중복 실행 방지 잠금
  const finishingRef = useRef(false);
  // [추가] 실제 녹음에 사용된 mime 타입 기억 (Blob 생성/재생 호환용)
  const recordedMimeRef = useRef<string>("audio/webm");
  // [추가] 마지막 본질문의 꼬리질문이면 true (꼬리질문 답변 후 종료 판단용)
  const tailIsLastRef = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const timerRef = useRef<any>(null);
  const interviewerRef = useRef<any>(null);

  // 🎯 선택된 학교에 따라 DB에서 질문 가져오기
  // 기출문제: useSchoolQuestions(selSchool)
  // 자소서: useEssayQuestions(selEssayId)
  const { data: pastDbQuestions = [] } = useSchoolQuestions(
    questionType === "past" ? selSchool : undefined,
  );
  const { data: essayDbQuestions = [] } = useEssayQuestions(
    questionType === "essay" ? selEssayId : undefined,
  );

  useEffect(() => {
    if (step !== "countdown") return;
    if (countdown <= 0) {
      setStep("interview");
      setTimerRunning(true);
      setInterviewStartTime(Date.now());
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  useEffect(() => {
    if (!timerRunning) return;
    if (timer <= 0) {
      setTimerRunning(false);
      return;
    }
    timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timerRunning, timer]);

  useEffect(() => {
    if (step !== "interview") return;
    interviewerRef.current = setInterval(
      () => setActiveInterviewer(Math.floor(Math.random() * 3)),
      3000,
    );
    return () => clearInterval(interviewerRef.current);
  }, [step]);

  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const startQuestionRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // [수정] 브라우저가 재생 가능한 코덱을 골라서 녹음
      //   webm/opus 우선, 안 되면 mp4, 그것도 안 되면 브라우저 기본
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType =
        candidates.find(
          (t) =>
            typeof MediaRecorder !== "undefined" &&
            MediaRecorder.isTypeSupported &&
            MediaRecorder.isTypeSupported(t),
        ) || "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recordedMimeRef.current = recorder.mimeType || mimeType || "audio/webm";
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      recordStartTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (err: any) {
      alert("🎙️ 마이크 권한이 필요해요. 브라우저 설정에서 허용해주세요.");
      console.error(err);
      setStep("list");
    }
  };

  const stopQuestionRecording = (): Promise<{ blob: Blob | null; durationSec: number }> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve({ blob: null, durationSec: 0 });
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recordedMimeRef.current || "audio/webm",
        });
        const durationSec = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
        resolve({ blob, durationSec });
      };

      recorder.stop();
    });
  };

  // [추가] blob 1개를 즉시 STT (middle-stt-short Edge Function)
  const sttOne = async (blob: Blob): Promise<string> => {
    try {
      const audioBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { data, error } = await supabase.functions.invoke("middle-stt-short", {
        body: { audioBase64 },
      });
      if (error) return "";
      if (data?.success && data?.text) return data.text as string;
      return "";
    } catch (e) {
      console.error("즉시 STT 실패:", e);
      return "";
    }
  };

  // [추가] 질문+답변 → 꼬리질문 1개 생성 (generate-tail-question Edge Function)
  const makeTailQuestion = async (
    questionText: string,
    studentAnswer: string,
  ): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-tail-question",
        { body: { questionText, studentAnswer, level: "middle" } },
      );
      if (error) return "";
      return (data?.tailQuestion as string) || "";
    } catch (e) {
      console.error("꼬리질문 생성 실패:", e);
      return "";
    }
  };

  const finishCurrentAnswer = async () => {
    setIsRecording(false);
    const { blob, durationSec } = await stopQuestionRecording();

    const curQ = questions[curQIdx];
    const newAnswer: SimulationAnswerInput = {
      num: curQ.num,
      text: curQ.text,
      audio_blob: blob,
      duration_sec: durationSec,
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    // [추가] 꼬리질문 ON + 방금 답변이 꼬리질문이 아니고 + 녹음이 있으면
    //        → 즉시 STT → 꼬리질문 생성 → 다음 질문으로 꼬리질문 삽입
    if (tailQ === true && !isTailQuestion && blob) {
      setTimerRunning(false);
      setTailLoading(true);
      try {
        const transcript = await sttOne(blob);
        if (transcript) {
          const tailText = await makeTailQuestion(curQ.text, transcript);
          if (tailText) {
            // 이 본질문이 마지막이었는지 기록 (꼬리질문 답변 후 종료 판단)
            tailIsLastRef.current = curQIdx >= questions.length - 1;
            // 다음 순번에 꼬리질문 삽입
            const tailNum = curQ.num + 0.5; // 꼬리질문은 소수 번호 (1.5 = Q1의 꼬리)
            const tailQuestionObj = { num: tailNum, text: tailText };
            const newQuestions = [...questions];
            newQuestions.splice(curQIdx + 1, 0, tailQuestionObj);
            setQuestions(newQuestions);
            setTailLoading(false);
            setIsTailQuestion(true);
            setCurQIdx((i) => i + 1);
            setTimer(80);
            setTimerRunning(true);
            return;
          }
        }
      } catch (e) {
        console.error("꼬리질문 처리 실패:", e);
      }
      setTailLoading(false);
    }

    // 방금이 꼬리질문이었으면: 마지막 본질문의 꼬리였으면 종료
    if (isTailQuestion) {
      setIsTailQuestion(false);
      if (tailIsLastRef.current) {
        tailIsLastRef.current = false;
        await finishInterview(newAnswers);
        return;
      }
      setCurQIdx((i) => i + 1);
      setTimer(80);
      setTimerRunning(true);
      return;
    }

    if (curQIdx >= questions.length - 1) {
      await finishInterview(newAnswers);
      return;
    }

    setCurQIdx((i) => i + 1);
    setTimer(80);
    setTimerRunning(true);
  };

  const skipQuestion = async () => {
    if (isRecording) {
      await finishCurrentAnswer();
      return;
    }

    const curQ = questions[curQIdx];
    const newAnswer: SimulationAnswerInput = {
      num: curQ.num,
      text: curQ.text,
      audio_blob: null,
      duration_sec: 0,
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (curQIdx >= questions.length - 1) {
      await finishInterview(newAnswers);
      return;
    }

    setCurQIdx((i) => i + 1);
    setTimer(80);
    setTimerRunning(true);
  };

  // ─────────────────────────────────────────────
  // [추가] 저장된 sim의 답변들을 align 분석 → ai_analysis(jsonb)에 저장
  //   - 화면엔 아무것도 안 보임. 어드민이 보도록 백그라운드 저장만 함
  //   - 훅은 건드리지 않고, 저장된 middle_simulations 행을 직접 update
  //   - 실패해도 전체 흐름은 막지 않음
  // ─────────────────────────────────────────────
  const runAnalysisForSim = async (
    savedSim: any,
    allAnswers: SimulationAnswerInput[],
  ) => {
    if (!savedSim?.id) return;

    const analysisMap: Record<string, any> = {};

    for (const a of allAnswers) {
      if (!a.audio_blob) continue; // 녹음 없으면 분석 생략
      try {
        const raw = await alignAudio(a.audio_blob);
        const analysis = analyzeInterview(raw);
        analysisMap[String(a.num)] = {
          speech_speed: analysis.syllablesPerMin,
          speed_label: analysis.speedLabel,
          filler_count: analysis.fillerCount,
          filler_words: analysis.fillerWords,
          pause_count: analysis.pauseCount,
          longest_pause_sec: analysis.longestPauseSec,
          pitch_variation: analysis.pitchVariation,
          intonation_label: analysis.intonationLabel,
          clarity_score: analysis.clarityScore,
          low_conf_words: analysis.lowConfWords,
        };
      } catch (e: any) {
        console.error(`음성 분석 실패 (num=${a.num}, 저장은 계속):`, e);
      }
    }

    if (Object.keys(analysisMap).length === 0) return;

    try {
      const { supabase } = await import("@/lib/supabase");
      await supabase
        .from("middle_simulations")
        .update({ ai_analysis: analysisMap })
        .eq("id", savedSim.id);
    } catch (e: any) {
      console.error("ai_analysis 저장 실패:", e);
    }
  };

  const finishInterview = async (allAnswers: SimulationAnswerInput[]) => {
    // [추가] 이미 저장 진행 중/완료면 두 번 실행 안 함 (중복 INSERT 방지)
    if (finishingRef.current) return;
    finishingRef.current = true;

    setSaving(true);
    setTimerRunning(false);
    if (interviewerRef.current) clearInterval(interviewerRef.current);

    const elapsed = Math.floor((Date.now() - interviewStartTime) / 1000);
    const duration = formatTime(elapsed);

    if (!student?.id || !academy?.academyId) {
      alert("로그인 정보 누락");
      setSaving(false);
      return;
    }

    try {
      const newSim = await createSim.mutateAsync({
        student_id: String(student.id),
        academy_id: String(academy.academyId),
        question_type: questionType as "past" | "essay" | "record",
        question_type_label: QUESTION_TYPES.find((t) => t.id === questionType)?.label || "",
        school: selSchool,
        tail_question: tailQ === true,
        question_mode: questionMode as "text" | "voice" | "both",
        answers: allAnswers,
        duration,
      });

      // [추가] 백그라운드 분석 저장 (await 안 함 — 실패해도 면접 저장/화면전환 막지 않음)
      runAnalysisForSim(newSim, allAnswers).catch((e) =>
        console.error("분석 저장 실패(무시):", e),
      );

      setSelSim(newSim);
      setStep("result");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const canStart = questionType && tailQ !== null && questionMode && selSchool;

  // 🎯 시뮬레이션 시작 — DB 질문 중 랜덤 5개 뽑기
  const startSimulation = () => {
    if (!canStart) return;

    // 질문 소스 결정
    let sourceQuestions: { text: string }[] = [];
    if (questionType === "past") {
      sourceQuestions = pastDbQuestions;
    } else if (questionType === "essay") {
      sourceQuestions = essayDbQuestions;
    } else if (questionType === "record") {
      sourceQuestions = RECORD_DUMMY_QUESTIONS;  // 생기부는 아직 더미
    }

    if (sourceQuestions.length === 0) {
      alert("이 학교에 등록된 질문이 없어요. 다른 학교를 선택해주세요.");
      return;
    }

    // 랜덤 5개 (또는 그보다 적으면 다 사용)
    const picked = pickRandom(sourceQuestions, Math.min(5, sourceQuestions.length));
    const numbered = picked.map((q, i) => ({ num: i + 1, text: q.text }));
    setQuestions(numbered);

    setCountdown(10);
    setStep("countdown");
    setCurQIdx(0);
    setTimer(80);
    setAnswers([]);
    setShowQuestion(questionMode !== "voice");
    setIsRecording(false);
    finishingRef.current = false; // [추가] 새 면접 시작 → 잠금 해제
    setIsTailQuestion(false); // [추가] 꼬리질문 플래그 초기화
    setTailLoading(false);
    tailIsLastRef.current = false;
  };

  const handleDeleteSim = async (id: string) => {
    try {
      await deleteSim.mutateAsync(id);
      if (selSim?.id === id) setSelSim(null);
      setDeleteTarget(null);
    } catch (e: any) {
      alert(`삭제 실패: ${e.message}`);
    }
  };

  const resetSetup = () => {
    setQuestionType("");
    setTailQ(null);
    setQuestionMode("");
    setSelSchool("");
    setSelEssayId("");
    setPastSchoolSearch("");
  };

  const toggleType = (id: string) => {
    if (questionType === id) {
      setQuestionType("");
      setSelSchool("");
      setSelEssayId("");
      setPastSchoolSearch("");
    } else {
      setQuestionType(id);
      setSelSchool("");
      setSelEssayId("");
      setPastSchoolSearch("");
    }
  };

  // 🎯 학교 검색 필터링 (DB에서 가져온 95개)
  const filteredPastSchools = allPastSchools.filter((s: string) =>
    s.includes(pastSchoolSearch),
  );

  // 음성 재생 함수 (안정성 강화)
  const playQuestionAudio = async (qNum: number, audioUrl: string) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (playingQNum === qNum) {
      audio.pause();
      setPlayingQNum(null);
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = audioUrl;
      audio.muted = false;
      audio.volume = 1.0;
      audio.load();

      await new Promise<void>((resolve) => {
        const onReady = () => {
          audio.removeEventListener("loadedmetadata", onReady);
          resolve();
        };
        audio.addEventListener("loadedmetadata", onReady);
        setTimeout(resolve, 1000);
      });

      await audio.play();
      setPlayingQNum(qNum);
    } catch (err: any) {
      console.error("재생 실패:", err);
      alert(`음성 재생 실패: ${err.message}`);
      setPlayingQNum(null);
    }
  };

  // ── 목록 화면 ──
  if (step === "list")
    return (
      <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">
        <div className="flex gap-4 flex-1 overflow-hidden">
          <div className="w-[340px] flex-shrink-0 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-3.5 py-3 border-b border-line flex-shrink-0">
              <div className="text-[14px] font-bold text-ink tracking-tight">
                면접 시뮬레이션
              </div>
              <div className="text-[11px] text-ink-secondary mt-0.5">
                총 <span className="text-brand-middle-dark font-bold">{simHistory.length}개</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2.5">
              {isLoading ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">불러오는 중...</div>
              ) : simHistory.length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  <div className="text-3xl mb-2">🎙️</div>
                  시뮬레이션 기록이 없어요.
                </div>
              ) : (
                simHistory.map((s) => {
                  const tags = [
                    s.question_type_label,
                    s.tail_question ? "꼬리질문ON" : "꼬리질문OFF",
                  ];
                  return (
                    <div
                      key={s.id}
                      onClick={() => { setSelSim(s); setPlayingQNum(null); }}
                      className={`border rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all relative ${
                        selSim?.id === s.id
                          ? "border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]"
                          : "border-line bg-white hover:border-brand-middle-light hover:shadow-sm"
                      }`}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(s.id); }}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 text-ink-muted flex items-center justify-center text-[10px] transition-colors"
                      >
                        ✕
                      </button>
                      <div className="text-[10px] text-ink-muted font-medium mb-1">
                        {formatDateTime(s.created_at)}
                      </div>
                      <div className="text-[12.5px] font-semibold text-ink mb-1.5 pr-6">
                        {s.school} · {s.question_type_label}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {tags.map((tag, i) => (
                          <span key={i} className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full border border-brand-middle-light">
                            {tag}
                          </span>
                        ))}
                        {s.teacher_feedback && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            ✓ 피드백
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t border-line flex-shrink-0">
              <button
                onClick={() => setStep("setup")}
                className="w-full h-11 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px hover:shadow-btn-middle"
              >
                + 모의면접 시작하기
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
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
                  onEnded={() => setPlayingQNum(null)}
                  className="hidden"
                />

                <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
                  <div className="text-[14px] font-extrabold text-ink tracking-tight mb-1">
                    {selSim.school} · {selSim.question_type_label}
                  </div>
                  <div className="text-[11px] text-ink-muted font-medium">
                    {formatDateTimeFull(selSim.created_at)} · {selSim.duration || "-"}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                      선생님 피드백
                    </div>
                    {selSim.teacher_feedback ? (
                      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8] whitespace-pre-wrap">
                        {selSim.teacher_feedback}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                        선생님 피드백을 기다리는 중이에요.
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider px-1">
                    질문별 답변 ({(selSim.questions || []).length}개)
                  </div>
                  {(selSim.questions || []).map((q: any) => (
                    <div key={q.num} className="bg-white border border-line rounded-xl px-4 py-3.5">
                      <div className="flex items-start gap-2 mb-2.5">
                        <span className="w-6 h-6 rounded-full bg-brand-middle text-white text-[11px] font-extrabold flex items-center justify-center flex-shrink-0">
                          Q{q.num}
                        </span>
                        <span className="text-[13px] font-semibold text-ink leading-[1.5] flex-1">
                          {q.text}
                        </span>
                        {q.answered ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
                            답변완료
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">
                            미답변
                          </span>
                        )}
                      </div>

                      {q.answer_audio_url && (
                        <div className="bg-gray-50 border border-line rounded-lg px-3 py-2 mb-2 flex items-center gap-2.5">
                          <button
                            onClick={() => playQuestionAudio(q.num, q.answer_audio_url)}
                            className="w-9 h-9 rounded-full bg-brand-middle hover:bg-brand-middle-hover text-white flex items-center justify-center text-xs flex-shrink-0 transition-all hover:scale-105 shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
                          >
                            {playingQNum === q.num ? "⏸" : "▶"}
                          </button>
                          <div className="flex-1 text-[11px] text-ink-secondary font-medium">
                            {playingQNum === q.num ? "재생 중..." : "재생하려면 클릭"}
                            <div className="text-[10px] text-ink-muted">
                              길이: {formatTime(q.answer_duration_sec || 0)}
                            </div>
                          </div>
                        </div>
                      )}

                      {q.answer_transcript ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-[12.5px] text-ink leading-[1.7] whitespace-pre-wrap">
                          <div className="text-[10px] font-bold text-emerald-700 mb-1">📝 음성 텍스트</div>
                          {q.answer_transcript}
                        </div>
                      ) : q.answered ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[11px] text-amber-800 text-center">
                          ⚠️ 텍스트 변환 실패 (음성은 재생 가능)
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {deleteTarget !== null && (
          <div onClick={() => setDeleteTarget(null)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center">
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-7 w-[380px] text-center shadow-[0_24px_64px_rgba(0,0,0,0.2)]">
              <div className="text-4xl mb-3">⚠️</div>
              <div className="text-[16px] font-bold text-ink mb-2 tracking-tight">
                시뮬레이션을 삭제하시겠어요?
              </div>
              <div className="text-[13px] text-ink-secondary mb-6 leading-[1.6]">
                삭제하면 녹음 파일과 피드백이 모두 사라져요.
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors">
                  취소
                </button>
                <button onClick={() => handleDeleteSim(deleteTarget)} disabled={deleteSim.isPending} className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(239,68,68,0.3)] disabled:opacity-50">
                  {deleteSim.isPending ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

  // ── 설정 모달 ──
  if (step === "setup")
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-7 w-[540px] max-h-[92vh] overflow-y-auto shadow-[0_24px_64px_rgba(0,0,0,0.2)] font-sans text-ink">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[17px] font-extrabold text-ink tracking-tight">시뮬레이션 설정</div>
            <button onClick={() => setStep("list")} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-ink-secondary transition-colors">✕</button>
          </div>

          <div className="bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-xl px-5 py-4 mb-5 flex items-center gap-3 relative overflow-hidden shadow-[0_8px_24px_rgba(16,185,129,0.2)]">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)" }} />
            <div className="text-4xl relative"></div>
            <div className="relative">
              <div className="text-[11px] bg-white/20 backdrop-blur-sm text-white font-semibold px-2 py-0.5 rounded-full inline-block mb-1">기초부터 차근차근 해보자!</div>
              <div className="text-[15px] font-extrabold text-white tracking-tight">원하는 문제 유형을 골라주세요!</div>
              <div className="text-[12px] text-white/90 font-medium">하나만 선택해서 시작해요.</div>
            </div>
          </div>

          <div className="mb-5">
            <div className="text-[13px] font-bold text-ink mb-2.5">문제 유형 (1개 선택)</div>
            <div className="flex flex-col gap-2">
              {/* 🎓 기출문제 */}
              <div>
                <button onClick={() => toggleType("past")} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${questionType === "past" ? "border-brand-middle bg-brand-middle-pale" : "border-line bg-white hover:border-brand-middle-light"}`}>
                  <div>
                    <div className="text-[13px] font-bold text-ink">🎓 기출문제</div>
                    <div className="text-[11px] text-ink-secondary font-medium">자사고·특목고 기출 면접 질문 ({allPastSchools.length}개교)</div>
                  </div>
                  {questionType === "past" && (
                    <div className="w-5 h-5 rounded-full bg-brand-middle flex items-center justify-center text-white text-[11px] font-bold">✓</div>
                  )}
                </button>
                {questionType === "past" && (
                  <div className="bg-brand-middle-pale/60 border border-brand-middle-light rounded-lg px-3.5 py-3 mt-1.5">
                    <div className="text-[11px] font-bold text-brand-middle-dark mb-2">🏫 학교 검색</div>
                    <input value={pastSchoolSearch} onChange={(e) => { setPastSchoolSearch(e.target.value); setSelSchool(""); }} placeholder="학교 이름 검색 (예: 인천하늘고, 민사고...)" className="w-full h-9 px-3 border border-line rounded-lg text-[12px] focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all mb-2 bg-white placeholder:text-ink-muted" />
                    {selSchool && (
                      <div className="flex items-center gap-1.5 bg-brand-middle-bg border border-brand-middle-light rounded-md px-2.5 py-1.5 mb-2">
                        <span className="text-[12px] text-brand-middle-dark font-bold">✓ {selSchool}</span>
                        <button onClick={() => setSelSchool("")} className="ml-auto text-[10px] text-ink-muted hover:text-ink">✕</button>
                      </div>
                    )}
                    <div className="max-h-[180px] overflow-y-auto flex flex-col gap-1">
                      {filteredPastSchools.length === 0 ? (
                        <div className="text-[12px] text-ink-muted text-center py-3">검색 결과가 없어요</div>
                      ) : (
                        filteredPastSchools.map((s: string, i: number) => (
                          <button key={i} onClick={() => setSelSchool(selSchool === s ? "" : s)} className={`flex items-center justify-between px-2.5 py-1.5 border rounded-md text-[12px] transition-all text-left ${selSchool === s ? "border-brand-middle bg-brand-middle-bg text-brand-middle-dark font-semibold" : "border-line bg-white text-ink hover:border-brand-middle-light hover:bg-brand-middle-pale/30"}`}>
                            {s}
                            {selSchool === s && <span className="text-[11px] text-brand-middle-dark">✓</span>}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 📝 자소서 예상질문 */}
              <div>
                <button onClick={() => toggleType("essay")} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${questionType === "essay" ? "border-brand-middle bg-brand-middle-pale" : "border-line bg-white hover:border-brand-middle-light"}`}>
                  <div>
                    <div className="text-[13px] font-bold text-ink">📝 자소서 예상질문</div>
                    <div className="text-[11px] text-ink-secondary font-medium">
                      내 자소서 기반 예상 질문 ({availableEssays.length}개 자소서)
                    </div>
                  </div>
                  {questionType === "essay" && (
                    <div className="w-5 h-5 rounded-full bg-brand-middle flex items-center justify-center text-white text-[11px] font-bold">✓</div>
                  )}
                </button>
                {questionType === "essay" && (
                  <div className="bg-brand-middle-pale/60 border border-brand-middle-light rounded-lg px-3.5 py-3 mt-1.5">
                    <div className="text-[11px] font-bold text-brand-middle-dark mb-2">📋 자소서 작성한 학교 선택</div>
                    {availableEssays.length === 0 ? (
                      <div className="bg-white border border-line rounded-md px-3 py-3 text-[12px] text-ink-muted text-center">
                        예상질문이 생성된 자소서가 없어요.<br />
                        <span className="text-[11px]">선생님이 예상질문을 만들 때까지 기다려주세요!</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {availableEssays.map((essay) => (
                          <button
                            key={essay.id}
                            onClick={() => {
                              if (selEssayId === essay.id) {
                                setSelEssayId("");
                                setSelSchool("");
                              } else {
                                setSelEssayId(essay.id);
                                setSelSchool(essay.school);
                              }
                            }}
                            className={`flex items-center justify-between px-3 py-2 border rounded-md transition-all text-left ${selEssayId === essay.id ? "border-brand-middle bg-brand-middle-bg" : "border-line bg-white hover:border-brand-middle-light"}`}
                          >
                            <div>
                              <span className="text-[12px] text-ink font-semibold">{essay.school}</span>
                              <span className="text-[10px] text-ink-muted ml-1.5 font-medium">
                                {new Date(essay.created_at).toLocaleDateString("ko-KR")} 작성
                              </span>
                            </div>
                            {selEssayId === essay.id && <span className="text-[11px] text-brand-middle-dark font-bold">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 📋 생기부 예상질문 (아직 더미) */}
              <div>
                <button onClick={() => toggleType("record")} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${questionType === "record" ? "border-brand-middle bg-brand-middle-pale" : "border-line bg-white hover:border-brand-middle-light"}`}>
                  <div>
                    <div className="text-[13px] font-bold text-ink">📋 생기부 예상질문</div>
                    <div className="text-[11px] text-ink-secondary font-medium">생활기록부 기반 예상 질문 (준비 중)</div>
                  </div>
                  {questionType === "record" && (
                    <div className="w-5 h-5 rounded-full bg-brand-middle flex items-center justify-center text-white text-[11px] font-bold">✓</div>
                  )}
                </button>
                {questionType === "record" && (
                  <div className="bg-brand-middle-pale/60 border border-brand-middle-light rounded-lg px-3.5 py-3 mt-1.5">
                    <div className="text-[11px] font-bold text-brand-middle-dark mb-2">🗂️ 생기부 예상질문 등록한 학교 선택</div>
                    <div className="flex flex-col gap-1.5">
                      {RECORD_SCHOOLS.map((s, i) => (
                        <button key={i} onClick={() => setSelSchool(selSchool === s.school ? "" : s.school)} className={`flex items-center justify-between px-3 py-2 border rounded-md transition-all text-left ${selSchool === s.school ? "border-brand-middle bg-brand-middle-bg" : "border-line bg-white hover:border-brand-middle-light"}`}>
                          <div>
                            <span className="text-[12px] text-ink font-semibold">{s.school}</span>
                            <span className="text-[10px] text-ink-muted ml-1.5 font-medium">{s.date} 등록</span>
                          </div>
                          {selSchool === s.school && <span className="text-[11px] text-brand-middle-dark font-bold">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-5">
            <div className="text-[13px] font-bold text-ink mb-2.5">꼬리질문</div>
            <div className="flex gap-2.5">
              {[{ val: true, label: "ON" }, { val: false, label: "OFF" }].map((o) => (
                <button key={String(o.val)} onClick={() => setTailQ(o.val)} className={`flex-1 h-11 rounded-xl text-[14px] border-2 transition-all ${tailQ === o.val ? "border-brand-middle bg-brand-middle-pale text-brand-middle-dark font-extrabold" : "border-line bg-white text-ink-secondary font-medium hover:border-brand-middle-light"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="text-[13px] font-bold text-ink mb-2.5">질문 방식</div>
            <div className="flex flex-col gap-2">
              {QUESTION_MODES.map((m) => (
                <button key={m.id} onClick={() => setQuestionMode(m.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${questionMode === m.id ? "border-brand-middle bg-brand-middle-pale" : "border-line bg-white hover:border-brand-middle-light"}`}>
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

          <button onClick={startSimulation} disabled={!canStart} className={`w-full h-12 rounded-xl text-[14px] font-bold transition-all ${canStart ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle" : "bg-gray-100 text-ink-muted cursor-not-allowed"}`}>
            다음으로 →
          </button>
        </div>
      </div>
    );

  // ── 카운트다운 ──
  if (step === "countdown")
    return (
      <div className="h-full bg-gradient-to-br from-brand-middle-pale via-white to-brand-middle-pale/60 flex flex-col items-center justify-center gap-5 font-sans text-ink relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)" }} />
        <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.1), transparent 70%)" }} />

        <div className="flex gap-2 mb-2 relative z-10">
          <span className="text-[12px] font-bold bg-brand-middle-bg text-brand-middle-dark px-3 py-1 rounded-full border border-brand-middle-light">
            {QUESTION_TYPES.find((t) => t.id === questionType)?.label}
          </span>
          <span className="text-[12px] font-bold bg-red-50 text-red-500 px-3 py-1 rounded-full border border-red-200">
            꼬리질문 {tailQ ? "ON" : "OFF"}
          </span>
        </div>

        <div className="text-[20px] font-extrabold text-ink tracking-tight relative z-10">{selSchool}</div>
        <div className="text-[80px] relative z-10"></div>
        <div className="text-[15px] text-ink-secondary text-center leading-[1.8] font-medium relative z-10">
          잠시 후 면접이 시작돼요.<br />
          깊게 숨 한번 쉬고, 천천히 호흡을 가다듬어볼까요?
        </div>
        <div className="w-20 h-20 rounded-full bg-white border-[3px] border-brand-middle flex items-center justify-center text-[32px] font-extrabold text-brand-middle-dark mt-2 shadow-[0_8px_24px_rgba(16,185,129,0.2)] relative z-10">
          {countdown}
        </div>
      </div>
    );

  // ── 면접 화면 (영상 면접관 3명) ──
  if (step === "interview") {
    const curQ = questions[curQIdx];
    if (!curQ) return null;

    return (
      <div className="h-full bg-[#0a0a0a] flex flex-col overflow-hidden relative font-sans">
        {/* [추가] 꼬리질문 생성 중 오버레이 */}
        {tailLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-4">
            <div className="text-5xl animate-pulse">🤔</div>
            <div className="text-[18px] font-extrabold text-white tracking-tight">
              면접관이 꼬리질문을 준비 중이에요...
            </div>
            <div className="text-[13px] text-white/60 font-medium">잠시만 기다려주세요</div>
            <div className="flex gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-brand-middle-light animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-brand-middle-light animate-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="w-2 h-2 rounded-full bg-brand-middle-light animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3">
          <button
            onClick={async () => {
              if (isRecording) await stopQuestionRecording();
              setStep("list");
            }}
            className="text-[13px] text-white/80 hover:text-white font-medium transition-colors"
          >
            ← 처음으로
          </button>
          <div className="text-[14px] font-bold text-white tracking-tight">실전 면접 시뮬레이션</div>
          <div className="text-[12px] text-white/60 font-medium">고민하는 시간도 성장의 일부예요!</div>
        </div>

        <div className="absolute top-11 left-0 right-0 z-10 flex items-center gap-2 px-5 py-1.5">
          <span className="text-[11px] font-bold bg-brand-middle-bg text-brand-middle-dark px-2 py-0.5 rounded-full">
            {QUESTION_TYPES.find((t) => t.id === questionType)?.label}
          </span>
          <span className="text-[11px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
            꼬리질문 {tailQ ? "ON" : "OFF"}
          </span>
          <span className="text-[11px] text-white/60 font-medium">{selSchool}</span>
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

        {/* 🎬 면접관 영상 3명 자동 재생 */}
        <div className="flex-1 flex items-center justify-center pt-20 pb-[120px]">
          <div className="flex gap-1 w-full h-full">
            {INTERVIEWERS.map((iv, i) => (
              <div
                key={iv.id}
                className={`flex-1 flex flex-col items-center justify-center rounded transition-all relative overflow-hidden ${
                  activeInterviewer === i
                    ? "bg-[#1a1a2e] border border-brand-middle/50 shadow-[inset_0_0_32px_rgba(16,185,129,0.1)]"
                    : "bg-[#0a0a0a] border border-transparent"
                }`}
              >
                <video
                  src={iv.videoUrl}
                  autoPlay
                  loop={iv.loop}
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                  <div
                    className={`text-[12px] font-medium transition-colors px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm ${
                      activeInterviewer === i ? "text-brand-middle-light" : "text-white/60"
                    }`}
                  >
                    {iv.name}
                  </div>
                  {activeInterviewer === i && (
                    <div className="flex gap-1 mt-1.5">
                      <div className="w-1 h-1 rounded-full bg-brand-middle-light animate-pulse" />
                      <div className="w-1 h-1 rounded-full bg-brand-middle-light animate-pulse" style={{ animationDelay: "0.2s" }} />
                      <div className="w-1 h-1 rounded-full bg-brand-middle-light animate-pulse" style={{ animationDelay: "0.4s" }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-black/70 backdrop-blur-md rounded-full px-4 py-1 flex items-center gap-2 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[14px] font-bold text-white font-mono">{formatTime(timer)} / 01:20</span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black via-black/90 to-transparent px-6 pt-5 pb-6">
          <div className="text-[11px] text-amber-300/90 mb-1.5 font-medium">
            * {QUESTION_TYPES.find((t) => t.id === questionType)?.label} 중 {questions.length}문제가 무작위로 출제됩니다.
          </div>
          <div className="flex items-center justify-between gap-5">
            <div className="flex-1 min-w-0">
              {showQuestion ? (
                <div className="text-[20px] font-extrabold text-white tracking-tight leading-[1.4]">
                  <span className="text-brand-middle-light">
                    {isTailQuestion ? "🔗 꼬리질문. " : `질문 ${Math.floor(curQ.num)}. `}
                  </span>
                  {curQ.text}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="text-[20px] font-extrabold text-white">
                    <span className="text-brand-middle-light">
                      {isTailQuestion ? "🔗 꼬리질문. " : `질문 ${Math.floor(curQ.num)}. `}
                    </span>
                    <span className="bg-white/10 backdrop-blur-sm rounded-md px-2 py-0.5 text-white/50 text-sm font-medium">음성으로 확인하세요</span>
                  </div>
                  <button onClick={() => setShowQuestion(true)} className="text-[11px] font-semibold text-brand-middle-light bg-brand-middle/20 border border-brand-middle/50 rounded-md px-2 py-1 hover:bg-brand-middle/30 transition-colors">
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
                    className="h-11 px-5 rounded-lg text-[13px] font-bold text-white transition-all hover:-translate-y-px bg-brand-middle hover:bg-brand-middle-hover shadow-[0_4px_16px_rgba(16,185,129,0.4)] disabled:opacity-50"
                  >
                    ● 답변 시작
                  </button>
                  <button
                    onClick={skipQuestion}
                    disabled={saving}
                    className="h-11 px-5 bg-white/10 backdrop-blur-sm text-white border border-white/30 rounded-lg text-[13px] font-semibold hover:bg-white/20 transition-all disabled:opacity-50"
                  >
                    {saving ? "저장 중..." : curQIdx >= questions.length - 1 ? "면접 종료 →" : "건너뛰기 →"}
                  </button>
                </>
              ) : (
                <button
                  onClick={finishCurrentAnswer}
                  disabled={saving}
                  className="h-11 px-5 rounded-lg text-[13px] font-bold text-white transition-all hover:-translate-y-px bg-red-500 hover:bg-red-600 shadow-[0_4px_16px_rgba(239,68,68,0.4)] disabled:opacity-50"
                >
                  {saving ? "저장 중..." : curQIdx >= questions.length - 1 ? "⏹ 답변 종료 (면접 종료)" : "⏹ 답변 종료 (다음 질문)"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 결과 화면 ──
  if (step === "result")
    return (
      <div className="px-6 py-4 font-sans text-ink h-full overflow-y-auto">
        <div className="flex items-center gap-2.5 mb-3">
          <button onClick={() => setStep("list")} className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-base text-ink-secondary hover:border-brand-middle-light hover:text-brand-middle-dark transition-all">←</button>
          <div className="text-[16px] font-semibold text-ink">시뮬레이션 완료</div>
        </div>

        <div className="text-center py-3 mb-3 relative overflow-hidden">
          <div className="relative">
            <div className="text-3xl mb-1">🎉</div>
            <div className="text-[18px] font-extrabold text-ink tracking-tight mb-0.5">면접 시뮬레이션 완료!</div>
            <div className="text-[12px] text-ink-secondary font-medium">
              총 {answers.length}개 질문에 답변했어요. 음성도 텍스트로 변환됐어요!
            </div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 mb-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="text-[13px] font-bold text-ink mb-2 tracking-tight">이번 시뮬레이션 요약</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "답변한 질문", val: `${answers.filter(a => a.audio_blob).length}/${answers.length}개` },
              { label: "문제 유형", val: QUESTION_TYPES.find((t) => t.id === questionType)?.label || "" },
              { label: "꼬리질문", val: tailQ ? "ON" : "OFF" },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 border border-line rounded-xl px-3 py-2 text-center">
                <div className="text-[10px] text-ink-muted font-medium mb-0.5">{s.label}</div>
                <div className="text-[14px] font-extrabold text-ink tracking-tight">{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3 mb-3">
          <div className="text-[12px] font-bold text-brand-middle-dark mb-0.5">💬 선생님 피드백 대기중</div>
          <div className="text-[11px] text-ink-secondary leading-[1.5]">
            선생님이 녹음 내용을 듣고 피드백을 남겨드릴 예정이에요.
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => { setStep("setup"); resetSetup(); }}
            className="flex-1 h-11 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-xl text-[13px] font-bold transition-all hover:-translate-y-px hover:shadow-btn-middle"
          >
            다시 시뮬레이션하기
          </button>
          <button 
            onClick={() => setStep("list")}
            className="flex-1 h-11 bg-white text-brand-middle-dark border-2 border-brand-middle rounded-xl text-[13px] font-bold hover:bg-brand-middle-pale transition-all"
          >
            📋 방금 한거 상세보기
          </button>
        </div>
      </div>
    );

  return null;
}