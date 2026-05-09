import { useState, useRef, useCallback, useEffect } from "react";
import { useAtomValue } from "jotai";
import { studentState, academyState } from "@/lib/auth/atoms";
import { supabase } from "@/lib/supabase";
import {
  useAllPassageSchools,
  usePassageYears,
  useSchoolYearProblems,
  useProblemQuestions,
  useMyPassageAnswers,
  usePassageFeedbacks,
  useSubmitPassageAnswer,
  useSubmitPassageUpgrade,
  useSubmitPassageTailAnswer,
} from "@/pages/middle-student/_hooks/useMyPresentation";

const SCHOOL_COLORS: Record<string, { color: string; bg: string }> = {
  인천하늘고: { color: "#1E40AF", bg: "#EEF2FF" },
  한국과학영재학교: { color: "#065F46", bg: "#ECFDF5" },
  경기과학고: { color: "#065F46", bg: "#ECFDF5" },
  서울과학고: { color: "#065F46", bg: "#ECFDF5" },
  한성과학고: { color: "#065F46", bg: "#ECFDF5" },
  대원외고: { color: "#7C2D12", bg: "#FFF7ED" },
  대일외고: { color: "#7C2D12", bg: "#FFF7ED" },
  명덕외고: { color: "#7C2D12", bg: "#FFF7ED" },
  서울외고: { color: "#7C2D12", bg: "#FFF7ED" },
  이화외고: { color: "#831843", bg: "#FDF2F8" },
  한영외고: { color: "#7C2D12", bg: "#FFF7ED" },
  민족사관고: { color: "#1E3A5F", bg: "#EFF6FF" },
  하나고: { color: "#1E40AF", bg: "#EEF2FF" },
  외대부고: { color: "#7C2D12", bg: "#FFF7ED" },
  북일고: { color: "#1E3A5F", bg: "#EFF6FF" },
  상산고: { color: "#1E3A5F", bg: "#EFF6FF" },
  현대청운고: { color: "#1E3A5F", bg: "#EFF6FF" },
  포항제철고: { color: "#1E3A5F", bg: "#EFF6FF" },
  김천고: { color: "#1E3A5F", bg: "#EFF6FF" },
  휘문고: { color: "#374151", bg: "#F9FAFB" },
  중동고: { color: "#374151", bg: "#F9FAFB" },
};

const STEP_LABELS = ["첫 답변", "1차 피드백", "업그레이드", "최종 피드백", "꼬리질문"];

// ─────────────────────────────────────────────
// ⭐ STT 마이크 버튼 (재사용)
// ─────────────────────────────────────────────
interface MicSTTBtnProps {
  studentId: string | undefined;
  onTranscript: (text: string) => void;
}

function MicSTTBtn({ studentId, onTranscript }: MicSTTBtnProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err: any) {
      alert("🎙️ 마이크 권한이 필요해요. 브라우저 설정에서 허용해주세요.");
      console.error(err);
    }
  };

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setRecording(false);
    setProcessing(true);

    const blobPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
        resolve(blob);
      };
      recorder.stop();
    });

    try {
      const blob = await blobPromise;

      if (!studentId) {
        alert("로그인 정보가 없어요");
        setProcessing(false);
        return;
      }

      const fileName = `${studentId}/passage-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("simulation-audio")
        .upload(fileName, blob, { contentType: "audio/webm" });

      if (uploadError) {
        alert("음성 업로드 실패: " + uploadError.message);
        setProcessing(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("simulation-audio")
        .getPublicUrl(fileName);

      const { data: sttData, error: sttError } =
        await supabase.functions.invoke("middle-homework-stt-start", {
          body: { videoUrl: urlData.publicUrl, language: "ko-KR" },
        });

      if (sttError || !sttData?.success) {
        alert("음성 변환 실패: " + (sttError?.message || sttData?.error || "unknown"));
        setProcessing(false);
        return;
      }

      const transcript = sttData?.transcript || "";
      if (transcript) {
        onTranscript(transcript);
      } else {
        alert("음성을 인식하지 못했어요. 다시 시도해주세요!");
      }
    } catch (e: any) {
      alert("STT 처리 중 오류: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleClick = () => {
    if (processing) return;
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={processing}
      title={recording ? "녹음 종료" : processing ? "변환 중..." : "음성으로 답변"}
      className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 text-base transition-all ${
        recording
          ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100 animate-pulse"
          : processing
            ? "bg-amber-50 border-amber-200 text-amber-600 cursor-wait"
            : "bg-brand-middle-pale border-brand-middle-light text-brand-middle-dark hover:bg-brand-middle-bg"
      }`}
    >
      {recording ? "⏹" : processing ? "⏳" : "🎙️"}
    </button>
  );
}

// ─────────────────────────────────────────────
// ⭐ localStorage 임시저장 헬퍼
// ─────────────────────────────────────────────
const DRAFT_PREFIX = "presentation_draft_";

function saveDraft(key: string, value: string) {
  try {
    if (value.trim()) {
      localStorage.setItem(DRAFT_PREFIX + key, value);
    } else {
      localStorage.removeItem(DRAFT_PREFIX + key);
    }
  } catch (e) {
    console.error("Draft save failed:", e);
  }
}

function loadDraft(key: string): string {
  try {
    return localStorage.getItem(DRAFT_PREFIX + key) || "";
  } catch {
    return "";
  }
}

function clearDraft(key: string) {
  try {
    localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {}
}

// ─────────────────────────────────────────────
// ⭐ 임시저장 버튼
// ─────────────────────────────────────────────
const SaveDraftBtn = ({
  draftKey,
  value,
}: {
  draftKey: string;
  value: string;
}) => {
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    saveDraft(draftKey, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return (
    <button
      onClick={handleSave}
      disabled={!value.trim()}
      title="브라우저에 임시저장"
      className={`h-9 px-3 rounded-lg text-[12px] font-semibold flex-shrink-0 transition-all ${
        saved
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : value.trim()
            ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            : "bg-gray-100 text-ink-muted border border-gray-200 cursor-not-allowed"
      }`}
    >
      {saved ? "✓ 저장됨" : "임시저장"}
    </button>
  );
};

const SubmitBtn = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`h-9 px-4 rounded-lg text-[12px] font-semibold flex-shrink-0 transition-all ${
      !disabled
        ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle"
        : "bg-gray-100 text-ink-muted cursor-not-allowed"
    }`}
  >
    {label}
  </button>
);

export default function MiddlePresentation() {
  const student = useAtomValue(studentState);
  const academy = useAtomValue(academyState);
  const studentId = student?.id ? String(student.id) : undefined;

  const [step, setStep] = useState<"school" | "list" | "solve">("school");
  const [selSchool, setSelSchool] = useState<string>("");
  const [selYear, setSelYear] = useState<number>(2025);
  const [selProblemId, setSelProblemId] = useState<string | null>(null);
  const [schoolSearch, setSchoolSearch] = useState("");

  const { data: allSchools = [] } = useAllPassageSchools();
  const { data: years = [] } = usePassageYears(selSchool || undefined);
  const { data: curProblems = [] } = useSchoolYearProblems(selSchool || undefined, selYear || undefined);
  const { data: questions = [] } = useProblemQuestions(selProblemId || undefined);
  const { data: myAnswers = [] } = useMyPassageAnswers(studentId, selProblemId || undefined);

  const answerByQuestionId = myAnswers.reduce((acc: Record<string, any>, a) => {
    acc[a.question_id] = a;
    return acc;
  }, {});

  const answerIds = myAnswers.map((a) => a.id);
  const { data: allFeedbacks = [] } = usePassageFeedbacks(answerIds);
  const feedbackByAnswerId = allFeedbacks.reduce((acc: Record<string, any>, f) => {
    acc[f.answer_id] = f;
    return acc;
  }, {});

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [upgradedAnswers, setUpgradedAnswers] = useState<Record<string, string>>({});
  const [tailAnswers, setTailAnswers] = useState<Record<string, string>>({});
  const [editingStep1, setEditingStep1] = useState<Record<string, boolean>>({});
  const [editingStep3, setEditingStep3] = useState<Record<string, boolean>>({});
  const [openIntents, setOpenIntents] = useState<Record<string, boolean>>({});

  const [leftWidth, setLeftWidth] = useState(50);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const submitAnswer = useSubmitPassageAnswer();
  const submitUpgrade = useSubmitPassageUpgrade();
  const submitTailAnswer = useSubmitPassageTailAnswer();

  useEffect(() => {
    if (years.length > 0 && !years.includes(selYear)) {
      setSelYear(years[0]);
    }
  }, [years]);

  // ⭐ 문제 바뀌면 localStorage에서 임시저장 불러오기
  useEffect(() => {
    if (!selProblemId || questions.length === 0) {
      setAnswers({});
      setUpgradedAnswers({});
      setTailAnswers({});
      return;
    }

    const loadedAnswers: Record<string, string> = {};
    const loadedUpgraded: Record<string, string> = {};
    const loadedTails: Record<string, string> = {};

    questions.forEach((q: any) => {
      const ans = answerByQuestionId[q.id];

      // Step 1 답변 안 된 거만 draft 불러오기
      if (!ans?.answer) {
        const draft = loadDraft(`p1-${q.id}`);
        if (draft) loadedAnswers[q.id] = draft;
      }

      // Step 3 업그레이드 안 된 거만
      if (ans && !ans.upgraded_answer) {
        const draft = loadDraft(`p3-${q.id}`);
        if (draft) loadedUpgraded[q.id] = draft;
      }

      // Step 5 꼬리질문
      if (ans) {
        const fb = feedbackByAnswerId[ans.id];
        if (fb?.tail_questions) {
          fb.tail_questions.forEach((tail: any, ti: number) => {
            if (!tail.answer) {
              const tailKey = `${q.id}-tail-${ti}`;
              const draft = loadDraft(`p5-${tailKey}`);
              if (draft) loadedTails[tailKey] = draft;
            }
          });
        }
      }
    });

    setAnswers(loadedAnswers);
    setUpgradedAnswers(loadedUpgraded);
    setTailAnswers(loadedTails);
    setEditingStep1({});
    setEditingStep3({});
    setOpenIntents({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selProblemId, questions.length]);

  const handleDragStart = useCallback(() => { isDragging.current = true; }, []);
  const handleDragEnd = useCallback(() => { isDragging.current = false; }, []);
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftWidth(Math.min(75, Math.max(25, pct)));
  }, []);

  const filteredSchools = allSchools.filter((s) => s.includes(schoolSearch));

  const getQStep = (questionId: string) => {
    const ans = answerByQuestionId[questionId];
    if (!ans?.answer) return 1;
    const fb = feedbackByAnswerId[ans.id];
    if (!fb?.teacher_first_feedback) return 2;
    if (!ans.upgraded_answer) return 3;
    if (!fb?.teacher_final_feedback) return 4;
    return 5;
  };

  const selProblem = curProblems.find((p) => p.id === selProblemId) ?? null;
  const schoolColor = selSchool
    ? SCHOOL_COLORS[selSchool] || { color: "#374151", bg: "#F9FAFB" }
    : null;

  const handleSubmitAnswer = async (questionId: string) => {
    const val = answers[questionId] || "";
    if (!val.trim()) return;
    if (!student?.id || !academy?.academyId) {
      alert("로그인 정보 누락");
      return;
    }
    try {
      await submitAnswer.mutateAsync({
        question_id: questionId,
        student_id: String(student.id),
        academy_id: String(academy.academyId),
        answer: val,
      });
      setAnswers((p) => ({ ...p, [questionId]: "" }));
      setEditingStep1((p) => ({ ...p, [questionId]: false }));
      // ⭐ 임시저장 삭제
      clearDraft(`p1-${questionId}`);
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  const handleSubmitUpgrade = async (questionId: string) => {
    const ans = answerByQuestionId[questionId];
    if (!ans) return;
    const val = upgradedAnswers[questionId] || "";
    if (!val.trim()) return;
    try {
      await submitUpgrade.mutateAsync({
        answer_id: ans.id,
        upgraded_answer: val,
      });
      setUpgradedAnswers((p) => ({ ...p, [questionId]: "" }));
      setEditingStep3((p) => ({ ...p, [questionId]: false }));
      clearDraft(`p3-${questionId}`);
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  const handleSubmitTailAnswer = async (questionId: string, tailIdx: number) => {
    const ans = answerByQuestionId[questionId];
    if (!ans) return;
    const tailKey = `${questionId}-tail-${tailIdx}`;
    const val = tailAnswers[tailKey] || "";
    if (!val.trim()) return;
    try {
      await submitTailAnswer.mutateAsync({
        answer_id: ans.id,
        tail_index: tailIdx,
        answer: val,
      });
      setTailAnswers((p) => ({ ...p, [tailKey]: "" }));
      clearDraft(`p5-${tailKey}`);
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  // ── 학교 선택 ──
  if (step === "school")
    return (
      <div className="h-full overflow-y-auto px-8 py-7 font-sans text-ink">
        <div className="text-[18px] font-extrabold text-ink tracking-tight mb-1">제시문 면접</div>

        <div className="bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-2xl px-7 py-6 mb-7 mt-4 flex items-center justify-between relative overflow-hidden shadow-[0_8px_24px_rgba(16,185,129,0.2)]">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)" }} />
          <div className="relative">
            <div className="text-[20px] font-extrabold text-white mb-1.5 tracking-tight">자사고·특목고 제시문 면접!</div>
            <div className="text-[13px] text-white/85">학교별 기출 제시문으로 실전 같은 면접을 경험해보세요.</div>
          </div>
          <div className="text-5xl relative">📄</div>
        </div>

        <div className="text-[14px] font-bold text-ink mb-2.5">학교 선택하기</div>

        <div className="mb-3.5">
          <input
            value={schoolSearch}
            onChange={(e) => setSchoolSearch(e.target.value)}
            placeholder="학교 이름 검색 (예: 인천하늘고, 민사고...)"
            className="w-full h-11 px-3.5 border border-line rounded-lg text-[14px] focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
          />
        </div>

        <div className="grid grid-cols-4 max-md:grid-cols-2 gap-2.5 pb-6">
          {filteredSchools.length === 0 ? (
            <div className="col-span-full text-center py-8 text-ink-muted text-[13px]">
              {allSchools.length === 0 ? "제시문이 등록된 학교가 없어요." : "검색 결과가 없어요"}
            </div>
          ) : (
            filteredSchools.map((s) => {
              const c = SCHOOL_COLORS[s] || { color: "#374151", bg: "#F9FAFB" };
              return (
                <div
                  key={s}
                  onClick={() => { setSelSchool(s); setStep("list"); }}
                  className="bg-white border border-line rounded-xl p-4 text-center cursor-pointer hover:border-brand-middle-light hover:shadow-[0_8px_24px_rgba(16,185,129,0.08)] hover:-translate-y-0.5 transition-all"
                  style={{ background: c.bg }}
                >
                  <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center mx-auto mb-2.5 text-base font-bold" style={{ borderColor: `${c.color}30`, color: c.color }}>
                    {s[0]}
                  </div>
                  <div className="text-[12px] font-bold" style={{ color: c.color }}>{s}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );

  // ── 문제 목록 ──
  if (step === "list") {
    const c = schoolColor!;
    return (
      <div className="h-full overflow-y-auto px-8 py-7 font-sans text-ink">
        <div className="flex items-center gap-2.5 mb-5">
          <button
            onClick={() => { setStep("school"); setSelSchool(""); setSchoolSearch(""); }}
            className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-base text-ink-secondary hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
          >
            ←
          </button>
          <div className="text-[16px] font-semibold text-ink">제시문 면접</div>
        </div>

        <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-5 py-4 mb-5 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-white border flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ borderColor: `${c.color}30`, color: c.color }}>
            {selSchool[0]}
          </div>
          <div>
            <div className="text-[16px] font-extrabold text-ink tracking-tight">{selYear}년 {selSchool}</div>
            <div className="text-[12px] text-ink-secondary mt-0.5">자사고·특목고 제시문 면접 기출</div>
          </div>
        </div>

        {years.length > 0 ? (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelYear(y)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] border whitespace-nowrap transition-all ${
                  selYear === y
                    ? "bg-brand-middle text-white border-brand-middle font-semibold"
                    : "bg-white text-ink-secondary border-line font-medium hover:border-brand-middle-light hover:text-brand-middle-dark"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-ink-muted mb-5">등록된 연도가 없어요.</div>
        )}

        <div className="text-[13px] text-ink-secondary mb-3.5">총 {curProblems.length}문제</div>

        {curProblems.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">
            <div className="text-4xl mb-3">📄</div>
            <div className="text-[14px]">해당 연도의 문제가 없어요.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3.5 pb-6">
            {curProblems.map((p) => (
              <ProblemCard
                key={p.id}
                problem={p}
                studentId={studentId}
                onSelect={() => { setSelProblemId(p.id); setStep("solve"); }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── 문제 풀기 ──
  if (step === "solve" && selProblem) {
    const c = schoolColor!;
    return (
      <div
        ref={containerRef}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        className="flex flex-col h-full overflow-hidden font-sans text-ink"
      >
        <div className="h-12 bg-white border-b border-line flex items-center justify-between px-6 flex-shrink-0">
          <button
            onClick={() => { setStep("list"); setSelProblemId(null); }}
            className="text-[13px] text-ink-secondary hover:text-brand-middle-dark font-medium transition-colors"
          >
            ← 목록으로
          </button>
          <div className="text-[13px] font-semibold text-ink">
            {selYear}년 {selSchool} · {selProblem.problem_title}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-brand-middle-bg border flex items-center justify-center text-[11px] font-bold" style={{ borderColor: `${c.color}30`, color: c.color }}>
              {selSchool[0]}
            </div>
            <span className="text-[12px] text-ink-secondary font-medium">{selSchool}</span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="border-r border-line overflow-y-auto px-6 py-5 bg-[#FAFAFA] flex-shrink-0" style={{ width: `${leftWidth}%` }}>
            <div className="text-[11px] font-bold text-ink-muted mb-2.5 tracking-wider uppercase">제시문</div>
            {selProblem.passage_pdf_url ? (
              <embed src={selProblem.passage_pdf_url} type="application/pdf" width="100%" style={{ minHeight: 600 }} className="rounded-lg" />
            ) : (
              <div className="bg-white border border-line rounded-xl px-6 py-5 text-[14px] text-ink leading-[2] whitespace-pre-line" style={{ fontFamily: "Georgia, serif" }}>
                {selProblem.passage_text}
              </div>
            )}
          </div>

          <div onMouseDown={handleDragStart} className="w-1.5 bg-line cursor-col-resize flex-shrink-0 flex items-center justify-center hover:bg-brand-middle-light transition-colors">
            <div className="w-0.5 h-10 bg-ink-muted rounded-full" />
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8">
            {questions.map((q, qi) => {
              const qKey = q.id;
              const ans = answerByQuestionId[q.id];
              const fb = ans ? feedbackByAnswerId[ans.id] : null;
              const qStep = getQStep(q.id);

              return (
                <div key={q.id} className={qi < questions.length - 1 ? "border-b border-line-light pb-8" : ""}>
                  <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3 mb-2.5">
                    <div className="text-[11px] font-bold text-brand-middle-dark mb-1">문제 {qi + 1}.</div>
                    <div className="text-[13px] font-semibold text-ink leading-[1.7]">{q.text}</div>
                  </div>

                  <div className="flex items-start mb-4">
                    {STEP_LABELS.map((label, i) => {
                      const stepNum = i + 1;
                      const isDone = stepNum < qStep;
                      const isOn = stepNum === qStep;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                          {i < STEP_LABELS.length - 1 && (
                            <div className={`absolute top-[11px] left-[55%] w-[90%] h-0.5 z-0 ${isDone ? "bg-brand-middle" : "bg-line"}`} />
                          )}
                          <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold z-10 relative border-2 ${
                            isDone || isOn ? "bg-brand-middle text-white border-brand-middle" : "bg-gray-100 text-ink-muted border-line"
                          }`}>
                            {isDone ? "✓" : stepNum}
                          </div>
                          <div className={`text-[10px] whitespace-nowrap ${isDone || isOn ? "text-brand-middle-dark font-semibold" : "text-ink-muted font-medium"}`}>
                            {label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ⭐ 질문 의도 (접었다 폈다) */}
                  {q.intent && q.intent.length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={() => setOpenIntents((p) => ({ ...p, [qKey]: !p[qKey] }))}
                        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all ${
                          openIntents[qKey] ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-line hover:bg-amber-50/50"
                        }`}
                      >
                        <span className={`text-[11px] font-semibold ${openIntents[qKey] ? "text-amber-700" : "text-ink-secondary"}`}>
                          💡 질문 의도 파악
                        </span>
                        <span className="ml-auto text-[10px] text-ink-muted">{openIntents[qKey] ? "▲" : "▼"}</span>
                      </button>
                      {openIntents[qKey] && (
                        <div className="bg-amber-50/50 border border-amber-200 border-t-0 rounded-b-lg px-3 py-2.5">
                          <ul className="pl-4 space-y-1">
                            {q.intent.map((item: string, idx: number) => (
                              <li key={idx} className="text-[12px] text-amber-700 leading-[1.7] list-disc">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 1 */}
                  <div className="bg-white border border-line rounded-xl px-4 py-3 mb-2.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${qStep > 1 ? "bg-brand-middle" : "bg-ink-muted"}`}>
                        Step 1
                      </span>
                      <span className="text-[11px] text-ink-secondary font-medium">내 첫 답변</span>
                    </div>
                    {ans?.answer && !editingStep1[qKey] ? (
                      <div>
                        <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2 whitespace-pre-wrap">
                          {ans.answer}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              setEditingStep1((p) => ({ ...p, [qKey]: true }));
                              setAnswers((p) => ({ ...p, [qKey]: ans.answer || "" }));
                            }}
                            className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
                          >
                            ✏️ 수정
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={answers[qKey] || ""}
                          onChange={(e) => setAnswers((p) => ({ ...p, [qKey]: e.target.value }))}
                          placeholder="답변을 작성하거나 마이크로 녹음해주세요..."
                          rows={4}
                          className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                        />
                        <div className="flex gap-2 mt-2 justify-end">
                          {editingStep1[qKey] && (
                            <button
                              onClick={() => {
                                setEditingStep1((p) => ({ ...p, [qKey]: false }));
                                setAnswers((p) => ({ ...p, [qKey]: "" }));
                              }}
                              className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
                            >
                              취소
                            </button>
                          )}
                          {!editingStep1[qKey] && (
                            <SaveDraftBtn draftKey={`p1-${qKey}`} value={answers[qKey] || ""} />
                          )}
                          <MicSTTBtn
                            studentId={studentId}
                            onTranscript={(text) =>
                              setAnswers((p) => ({
                                ...p,
                                [qKey]: p[qKey] ? p[qKey] + " " + text : text,
                              }))
                            }
                          />
                          <SubmitBtn
                            label={submitAnswer.isPending ? "제출 중..." : editingStep1[qKey] ? "수정 완료" : "답변 제출"}
                            onClick={() => handleSubmitAnswer(q.id)}
                            disabled={!(answers[qKey] || "").trim() || submitAnswer.isPending}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Step 2 */}
                  {ans?.answer && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3 mb-2.5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 2</span>
                        <span className="text-[11px] text-ink-secondary font-medium">선생님 1차 피드백</span>
                      </div>
                      {fb?.teacher_first_feedback ? (
                        <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8] whitespace-pre-wrap">
                          {fb.teacher_first_feedback}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                          선생님 피드백을 기다리는 중이에요 ✏️
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3 */}
                  {fb?.teacher_first_feedback && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3 mb-2.5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${qStep > 3 ? "bg-brand-middle" : "bg-ink-muted"}`}>
                          Step 3
                        </span>
                        <span className="text-[11px] text-ink-secondary font-medium">업그레이드 답변</span>
                      </div>
                      {ans?.upgraded_answer && !editingStep3[qKey] ? (
                        <div>
                          <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2 whitespace-pre-wrap">
                            {ans.upgraded_answer}
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                setEditingStep3((p) => ({ ...p, [qKey]: true }));
                                setUpgradedAnswers((p) => ({ ...p, [qKey]: ans.upgraded_answer || "" }));
                              }}
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
                          <textarea
                            value={upgradedAnswers[qKey] || ""}
                            onChange={(e) => setUpgradedAnswers((p) => ({ ...p, [qKey]: e.target.value }))}
                            placeholder="피드백을 반영한 업그레이드 답변을 작성해주세요..."
                            rows={4}
                            className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            {editingStep3[qKey] && (
                              <button
                                onClick={() => {
                                  setEditingStep3((p) => ({ ...p, [qKey]: false }));
                                  setUpgradedAnswers((p) => ({ ...p, [qKey]: "" }));
                                }}
                                className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
                              >
                                취소
                              </button>
                            )}
                            {!editingStep3[qKey] && (
                              <SaveDraftBtn draftKey={`p3-${qKey}`} value={upgradedAnswers[qKey] || ""} />
                            )}
                            <MicSTTBtn
                              studentId={studentId}
                              onTranscript={(text) =>
                                setUpgradedAnswers((p) => ({
                                  ...p,
                                  [qKey]: p[qKey] ? p[qKey] + " " + text : text,
                                }))
                              }
                            />
                            <SubmitBtn
                              label={submitUpgrade.isPending ? "제출 중..." : editingStep3[qKey] ? "수정 완료" : "업그레이드 제출"}
                              onClick={() => handleSubmitUpgrade(q.id)}
                              disabled={!(upgradedAnswers[qKey] || "").trim() || submitUpgrade.isPending}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 4 */}
                  {ans?.upgraded_answer && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3 mb-2.5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 4</span>
                        <span className="text-[11px] text-ink-secondary font-medium">선생님 최종 피드백</span>
                      </div>
                      {fb?.teacher_final_feedback ? (
                        <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8] whitespace-pre-wrap">
                          {fb.teacher_final_feedback}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                          선생님 최종 피드백을 기다리는 중이에요 ✏️
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 5 꼬리질문 */}
                  {fb?.teacher_final_feedback && fb?.tail_questions && fb.tail_questions.length > 0 && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 5</span>
                        <span className="text-[11px] text-ink-secondary font-medium">꼬리질문</span>
                      </div>
                      {fb.tail_questions.map((tail: any, ti: number) => {
                        const tailKey = `${qKey}-tail-${ti}`;
                        return (
                          <div key={ti} className={ti < fb.tail_questions.length - 1 ? "mb-4" : ""}>
                            <div className="flex items-start gap-1.5 px-2.5 py-2 bg-gray-50 rounded-md mb-2 text-[12px] text-ink leading-[1.5]">
                              <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-1.5 py-0.5 rounded-full flex-shrink-0 mt-[1px]">
                                꼬리 {ti + 1}
                              </span>
                              {tail.text}
                            </div>
                            {tail.answer ? (
                              <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">
                                {tail.answer}
                              </div>
                            ) : (
                              <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                                <textarea
                                  value={tailAnswers[tailKey] || ""}
                                  onChange={(e) => setTailAnswers((p) => ({ ...p, [tailKey]: e.target.value }))}
                                  placeholder="꼬리질문에 대한 답변을 작성해주세요..."
                                  rows={2}
                                  className="w-full border border-line rounded-md px-2.5 py-2 text-[12px] leading-[1.6] resize-none bg-white focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                                />
                                <div className="flex gap-2 mt-2 justify-end">
                                  <SaveDraftBtn draftKey={`p5-${tailKey}`} value={tailAnswers[tailKey] || ""} />
                                  <MicSTTBtn
                                    studentId={studentId}
                                    onTranscript={(text) =>
                                      setTailAnswers((p) => ({
                                        ...p,
                                        [tailKey]: p[tailKey] ? p[tailKey] + " " + text : text,
                                      }))
                                    }
                                  />
                                  <button
                                    onClick={() => handleSubmitTailAnswer(q.id, ti)}
                                    disabled={!(tailAnswers[tailKey] || "").trim() || submitTailAnswer.isPending}
                                    className={`h-[34px] px-3.5 rounded-md text-[12px] font-semibold transition-all ${
                                      (tailAnswers[tailKey] || "").trim() && !submitTailAnswer.isPending
                                        ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle"
                                        : "bg-gray-100 text-ink-muted cursor-not-allowed"
                                    }`}
                                  >
                                    {submitTailAnswer.isPending ? "제출 중..." : "제출"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ProblemCard({
  problem,
  studentId,
  onSelect,
}: {
  problem: any;
  studentId: string | undefined;
  onSelect: () => void;
}) {
  const { data: questions = [] } = useProblemQuestions(problem.id);
  const { data: answers = [] } = useMyPassageAnswers(studentId, problem.id);

  const totalQ = questions.length;
  const answeredCount = answers.filter((a) => a.answer).length;

  const status = answeredCount === 0 ? "new" : answeredCount === totalQ ? "done" : "doing";

  return (
    <div className="bg-white border border-line rounded-xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all">
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
          status === "done" ? "bg-brand-middle-pale" : status === "doing" ? "bg-amber-50" : "bg-gray-100"
        }`}>
          {status === "done" ? "✅" : status === "doing" ? "📝" : "💡"}
        </div>
        <div>
          <div className="text-[15px] font-bold text-ink tracking-tight">{problem.problem_title}</div>
          <div className="text-[11px] text-ink-muted">총 {totalQ}문항 · {problem.subject}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSelect}
          className={`flex-1 h-9 rounded-lg text-[13px] font-semibold text-white transition-all hover:-translate-y-px ${
            status === "done"
              ? "bg-brand-middle hover:bg-brand-middle-hover hover:shadow-btn-middle"
              : status === "doing"
                ? "bg-orange-500 hover:bg-orange-600 hover:shadow-[0_4px_12px_rgba(249,115,22,0.3)]"
                : "bg-brand-middle hover:bg-brand-middle-hover hover:shadow-btn-middle"
          }`}
        >
          {status === "done" ? "다시 풀기" : status === "doing" ? "이어서 풀기" : "문제 풀기"}
        </button>
      </div>
    </div>
  );
}