import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  useStudentSimulations,
  useSaveSimulationFeedback,
  useDeleteStudentSimulation,
} from "@/pages/admin/_hooks/middle/useStudentSimulation";
import SimulationAnalysisCard, {
  type QuestionMetric,
} from "@/components/SimulationAnalysisCard";
import { summarize } from "@/components/SimulationAnalysisCard";

// 🌱 중등 초록 테마
const THEME = {
  accent: "#059669",
  accentDark: "#065F46",
  accentBg: "#ECFDF5",
  accentBorder: "#6EE7B7",
  accentShadow: "rgba(16, 185, 129, 0.15)",
  gradient: "linear-gradient(135deg, #065F46, #10B981)",
};

// 시간 포맷
const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function MiddleSimulationTab({ student }: { student: any }) {
  const studentId = student?.id ? String(student.id) : undefined;

  const { data: simulations = [], isLoading } = useStudentSimulations(studentId);
  const saveFeedback = useSaveSimulationFeedback();
  const deleteSim = useDeleteStudentSimulation();

  const [selSim, setSelSim] = useState<any>(null);
  const [playingQNum, setPlayingQNum] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 🆕 질문 캐러셀 인덱스
  const [qIdx, setQIdx] = useState(0);
  // 🆕 질문별 피드백 맵 { [num]: feedback }
  const [perQFeedback, setPerQFeedback] = useState<Record<string, string>>({});
  const [savingPerQ, setSavingPerQ] = useState(false);

  const questions: any[] = selSim?.questions || [];
  const curQ = questions[qIdx];

  // 선택한 시뮬레이션 변경 시 초기값 세팅
  useEffect(() => {
    if (selSim) {
      setQIdx(0);
      // questions 안에 저장된 질문별 피드백 불러오기
      const map: Record<string, string> = {};
      (selSim.questions || []).forEach((q: any) => {
        if (q.teacher_feedback) map[String(q.num)] = q.teacher_feedback;
      });
      setPerQFeedback(map);
    }
  }, [selSim?.id]);

  // 서버 데이터 갱신 시 selSim 동기화
  useEffect(() => {
    if (selSim) {
      const updated = simulations.find((s) => s.id === selSim.id);
      if (updated) setSelSim(updated);
    }
  }, [simulations]);

  const handleSelect = (sim: any) => {
    setSelSim(sim);
    setPlayingQNum(null);
    setQIdx(0);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSim.mutateAsync(id);
      if (selSim?.id === id) setSelSim(null);
      setDeleteTarget(null);
    } catch (e: any) {
      alert(`삭제 실패: ${e.message}`);
    }
  };

  // ✨ AI 질문별 + 종합 피드백 생성
  const generateAiFeedback = async () => {
    if (!selSim) return;
    setAiLoading(true);

    try {
      // 1. 질문+답변 목록 (num 포함, 답변 있는 것만 Edge에서 거름)
      const qaList = (selSim.questions || []).map((q: any) => ({
        num: q.num,
        question: q.text,
        answer: q.answer_transcript || "",
        isTail: !Number.isInteger(q.num),
      }));

      // 2. 음성 분석 요약
      const metrics = Object.values(selSim.ai_analysis || {}) as QuestionMetric[];
      const s = summarize(metrics);
      const voice = s
        ? {
            avgSpeed: s.avgSpeed,
            speedLabel: s.speedLabel,
            totalPause: s.totalPause,
            fillerList: s.fillerList,
            avgClarity: s.avgClarity,
          }
        : undefined;

      // 3. Edge Function 호출
      const { data, error } = await supabase.functions.invoke("simulation-feedback", {
        body: {
          qaList,
          voice,
          level: "middle",
          school: selSim.school,
          studentName: student?.name,
        },
      });

      if (error) throw error;

      // 4. 질문별 피드백 맵 구성
      const perQ: Record<string, string> = { ...perQFeedback };
      (data?.perQuestion || []).forEach((p: any) => {
        perQ[String(p.num)] = p.feedback || "";
      });
      setPerQFeedback(perQ);

      // 5. 질문별 피드백을 questions JSON에 저장 (재생성 방지 + 학생 활용)
      const updatedQuestions = (selSim.questions || []).map((q: any) => ({
        ...q,
        teacher_feedback: perQ[String(q.num)] ?? q.teacher_feedback ?? "",
      }));
      await supabase
        .from("middle_simulations")
        .update({ questions: updatedQuestions })
        .eq("id", selSim.id);

    } catch (e: any) {
      console.error("AI 피드백 생성 실패:", e);
      alert(`AI 피드백 생성 실패: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // 현재 질문의 피드백 수정
  const updateCurrentQFeedback = (val: string) => {
    if (!curQ) return;
    setPerQFeedback((prev) => ({ ...prev, [String(curQ.num)]: val }));
  };

  // 질문별 피드백 저장 (questions JSON 업데이트)
  const savePerQuestionFeedback = async () => {
    if (!selSim) return;
    setSavingPerQ(true);
    try {
      const updatedQuestions = (selSim.questions || []).map((q: any) => ({
        ...q,
        teacher_feedback: perQFeedback[String(q.num)] ?? q.teacher_feedback ?? "",
      }));
      // 질문별 피드백이 하나라도 있으면 시뮬레이션을 "피드백 완료"로 표시
      const hasAnyFeedback = updatedQuestions.some((q: any) => (q.teacher_feedback || "").trim());
      const { error } = await supabase
        .from("middle_simulations")
        .update({
          questions: updatedQuestions,
          teacher_feedback: hasAnyFeedback ? "질문별 피드백 작성됨" : null,
        })
        .eq("id", selSim.id);
      if (error) throw error;
      setSelSim({
        ...selSim,
        questions: updatedQuestions,
        teacher_feedback: hasAnyFeedback ? "질문별 피드백 작성됨" : null,
      });
      alert("✅ 질문별 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    } finally {
      setSavingPerQ(false);
    }
  };

  // 🎵 질문별 음성 재생
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

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent;
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`;
  };
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#E5E7EB";
    e.target.style.boxShadow = "none";
  };

  // 필터
  const filteredSims =
    filterType === "all"
      ? simulations
      : simulations.filter((s) => s.question_type_label === filterType);

  const completedCount = simulations.filter((s) => s.teacher_feedback).length;
  const pendingCount = simulations.filter((s) => !s.teacher_feedback).length;

  // 캐러셀 이동
  const goPrev = () => { setQIdx((i) => Math.max(0, i - 1)); setPlayingQNum(null); };
  const goNext = () => { setQIdx((i) => Math.min(questions.length - 1, i + 1)); setPlayingQNum(null); };

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      {/* ==================== 왼쪽 목록 ==================== */}
      <div className="w-[340px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="px-4 py-3 border-b border-line flex-shrink-0">
          <div className="text-[14px] font-extrabold text-ink tracking-tight">
            🎬 시뮬레이션 기록
          </div>
          <div className="text-[11px] font-medium text-ink-secondary mt-1 flex gap-2 flex-wrap">
            <span>
              총 <span className="font-bold" style={{ color: THEME.accent }}>{simulations.length}회</span>
            </span>
            <span>·</span>
            <span>
              피드백 <span className="font-bold" style={{ color: THEME.accent }}>{completedCount}</span>
            </span>
            <span>·</span>
            <span>
              대기 <span className="font-bold text-amber-600">{pendingCount}</span>
            </span>
          </div>
        </div>

        {/* 필터 */}
        <div className="px-3 py-2.5 border-b border-line flex-shrink-0">
          <div className="flex gap-1 flex-wrap">
            {["all", "기출문제", "자소서 예상질문", "생기부 예상질문"].map((t) => {
              const isActive = filterType === t;
              const label = t === "all" ? "전체" : t;
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                  style={{
                    borderColor: isActive ? THEME.accent : "#E5E7EB",
                    background: isActive ? THEME.accentBg : "#fff",
                    color: isActive ? THEME.accentDark : "#6B7280",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {isLoading ? (
            <div className="text-center py-10 text-ink-muted text-[12px]">불러오는 중...</div>
          ) : filteredSims.length === 0 ? (
            <div className="text-center py-10 text-ink-muted">
              <div className="text-3xl mb-2">🎬</div>
              <div className="text-[12px] font-medium">시뮬레이션 기록이 없어요.</div>
            </div>
          ) : (
            filteredSims.map((sim, i) => {
              const isSelected = selSim?.id === sim.id;
              const hasFeedback = !!sim.teacher_feedback;

              return (
                <div
                  key={sim.id}
                  onClick={() => handleSelect(sim)}
                  className="rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all relative"
                  style={{
                    border: `1px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                    background: isSelected ? THEME.accentBg : "#fff",
                    boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : "none",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(sim.id);
                    }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-[10px] text-ink-secondary transition-colors"
                  >
                    ✕
                  </button>

                  <div className="flex items-center justify-between mb-1.5 pr-6">
                    <span className="text-[11px] font-bold text-ink-secondary">
                      #{i + 1} · 📅 {new Date(sim.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-base">🎓</span>
                    <div
                      className="text-[13px] font-extrabold tracking-tight"
                      style={{ color: isSelected ? THEME.accentDark : "#1a1a1a" }}
                    >
                      {sim.school}
                    </div>
                  </div>

                  <div className="text-[11px] font-semibold text-ink-secondary mb-2">
                    {sim.question_type_label}
                  </div>

                  <div className="flex gap-1 flex-wrap">
                    {sim.duration && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: THEME.accent, background: THEME.accentBg }}
                      >
                        ⏱ {sim.duration}
                      </span>
                    )}
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: THEME.accent, background: THEME.accentBg }}
                    >
                      📋 {(sim.questions || []).length}문항
                    </span>
                    {hasFeedback ? (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        ✓ 피드백완료
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        ⏳ 피드백대기
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ==================== 오른쪽 상세 ==================== */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
        {!selSim ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
            <div className="text-4xl">🎬</div>
            <div className="text-[14px] font-bold text-ink-secondary">
              시뮬레이션을 선택해주세요
            </div>
          </div>
        ) : (
          <>
            {/* 🎵 숨겨진 audio 태그 */}
            <audio ref={audioRef} onEnded={() => setPlayingQNum(null)} className="hidden" />

            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-line flex-shrink-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    color: THEME.accentDark,
                    background: THEME.accentBg,
                    border: `1px solid ${THEME.accentBorder}60`,
                  }}
                >
                  🎓 {selSim.school}
                </span>
                <span className="text-[11px] font-semibold text-ink-secondary bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {selSim.question_type_label}
                </span>
                <span className="text-[11px] font-bold bg-red-50 text-red-500 px-2.5 py-0.5 rounded-full border border-red-200">
                  꼬리질문 {selSim.tail_question ? "ON" : "OFF"}
                </span>
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full ml-auto"
                  style={{
                    background: selSim.teacher_feedback ? "#ECFDF5" : "#FFF7ED",
                    color: selSim.teacher_feedback ? "#059669" : "#D97706",
                    border: `1px solid ${selSim.teacher_feedback ? "#6EE7B7" : "#FDBA74"}60`,
                  }}
                >
                  {selSim.teacher_feedback ? "✓ 피드백완료" : "⏳ 피드백대기"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-[16px] font-extrabold text-ink tracking-tight">🎬 시뮬레이션</div>
                  <div className="text-[11px] font-semibold text-ink-secondary mt-0.5">
                    📅 {new Date(selSim.created_at).toLocaleDateString("ko-KR")} · ⏱ {selSim.duration || "-"} · 📋 {questions.length}문항
                  </div>
                </div>
                <button
                  onClick={generateAiFeedback}
                  disabled={aiLoading}
                  className="px-3 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                  style={{ background: THEME.accent, boxShadow: `0 2px 6px ${THEME.accentShadow}` }}
                >
                  {aiLoading ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />AI 분석 중...</>
                  ) : (
                    "✨ AI 질문별 피드백 생성"
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {questions.length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-[13px]">질문 기록이 없어요.</div>
              ) : (
                <>
                  {/* 🆕 질문 캐러셀 네비게이션 */}
                  <div className="flex items-center justify-between bg-white border border-line rounded-xl px-3 py-2.5">
                    <button
                      onClick={goPrev}
                      disabled={qIdx === 0}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-[16px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ background: qIdx === 0 ? "#F3F4F6" : THEME.accentBg, color: THEME.accentDark }}
                    >
                      ◀
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-extrabold text-ink">
                        {Number.isInteger(curQ?.num) ? `Q${curQ?.num}` : `꼬리질문 (Q${curQ?.num})`}
                      </span>
                      <span className="text-[11px] font-bold text-ink-muted">
                        {qIdx + 1} / {questions.length}
                      </span>
                    </div>
                    <button
                      onClick={goNext}
                      disabled={qIdx === questions.length - 1}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-[16px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ background: qIdx === questions.length - 1 ? "#F3F4F6" : THEME.accentBg, color: THEME.accentDark }}
                    >
                      ▶
                    </button>
                  </div>

                  {/* 🆕 현재 질문 1개만 표시 */}
                  {curQ && (
                    <div className="border border-line rounded-xl px-5 py-4 bg-gray-50">
                      {/* 질문 헤더 */}
                      <div className="flex items-start gap-2 mb-3">
                        <span
                          className="px-2.5 h-6 rounded-full text-white text-[11px] font-extrabold flex items-center justify-center flex-shrink-0"
                          style={{ background: THEME.accent }}
                        >
                          Q{curQ.num}
                        </span>
                        <span className="text-[14px] font-semibold text-ink leading-[1.5] flex-1">
                          {curQ.text}
                        </span>
                        {curQ.answered ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
                            답변완료
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">
                            미답변
                          </span>
                        )}
                      </div>

                      {/* 음성 재생 */}
                      {curQ.answer_audio_url && (
                        <div className="bg-white border border-line rounded-lg px-3 py-2 mb-2 flex items-center gap-2.5">
                          <button
                            onClick={() => playQuestionAudio(curQ.num, curQ.answer_audio_url)}
                            className="w-9 h-9 rounded-full text-white flex items-center justify-center text-xs flex-shrink-0 transition-all hover:scale-105"
                            style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                          >
                            {playingQNum === curQ.num ? "⏸" : "▶"}
                          </button>
                          <div className="flex-1 text-[11px] text-ink-secondary font-medium">
                            {playingQNum === curQ.num ? "재생 중..." : "재생하려면 클릭"}
                            <div className="text-[10px] text-ink-muted">
                              길이: {formatTime(curQ.answer_duration_sec || 0)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 음성 텍스트 */}
                      {curQ.answer_transcript ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-[12.5px] text-ink leading-[1.7] whitespace-pre-wrap">
                          <div className="text-[10px] font-bold text-emerald-700 mb-1">📝 음성 텍스트</div>
                          {curQ.answer_transcript}
                        </div>
                      ) : curQ.answered ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[11px] text-amber-800 text-center">
                          ⚠️ 텍스트 변환 실패 (음성은 재생 가능)
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[11px] text-gray-400 text-center">
                          답변하지 않은 질문이에요
                        </div>
                      )}

                      {/* 🆕 이 질문의 음성 분석 (속도/군말/멈춤/명료도) */}
                      {(() => {
                        const a = (selSim.ai_analysis || {})[String(curQ.num)];
                        if (!a) return null;
                        const speedColor =
                          a.speed_label === "적정" ? "#059669" :
                          a.speed_label === "빠름" ? "#DC2626" : "#D97706";
                        return (
                          <div className="mt-2 bg-white border border-line rounded-lg px-3 py-2.5">
                            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                              🎙️ 이 답변 음성 분석
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {/* 말 속도 */}
                              <div className="rounded-lg px-2.5 py-1.5" style={{ background: "#F9FAFB" }}>
                                <div className="text-[9px] font-bold text-ink-muted mb-0.5">말 속도</div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-[15px] font-extrabold" style={{ color: speedColor }}>
                                    {a.speech_speed ?? "-"}
                                  </span>
                                  <span className="text-[9px] text-ink-muted">음절/분</span>
                                  <span className="text-[10px] font-bold ml-auto" style={{ color: speedColor }}>
                                    {a.speed_label || ""}
                                  </span>
                                </div>
                              </div>
                              {/* 명료도 */}
                              <div className="rounded-lg px-2.5 py-1.5" style={{ background: "#F9FAFB" }}>
                                <div className="text-[9px] font-bold text-ink-muted mb-0.5">발음 명료도</div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-[15px] font-extrabold" style={{ color: THEME.accent }}>
                                    {a.clarity_score ?? "-"}
                                  </span>
                                  <span className="text-[9px] text-ink-muted">/100</span>
                                </div>
                              </div>
                              {/* 군말 */}
                              <div className="rounded-lg px-2.5 py-1.5" style={{ background: "#F9FAFB" }}>
                                <div className="text-[9px] font-bold text-ink-muted mb-0.5">군말</div>
                                {a.filler_count > 0 ? (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-[13px] font-extrabold text-amber-600">{a.filler_count}회</span>
                                    {(a.filler_words || []).length > 0 && (
                                      <span className="text-[10px] text-ink-secondary">
                                        ({(a.filler_words || []).join(", ")})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[12px] font-bold text-emerald-600">없음 ✓</span>
                                )}
                              </div>
                              {/* 멈칫 */}
                              <div className="rounded-lg px-2.5 py-1.5" style={{ background: "#F9FAFB" }}>
                                <div className="text-[9px] font-bold text-ink-muted mb-0.5">멈칫 (긴 공백)</div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-[13px] font-extrabold" style={{ color: a.pause_count > 2 ? "#D97706" : "#059669" }}>
                                    {a.pause_count ?? 0}회
                                  </span>
                                  {a.longest_pause_sec != null && (
                                    <span className="text-[9px] text-ink-muted">최대 {a.longest_pause_sec}초</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 🆕 이 질문에 대한 AI 피드백 (수정 가능) */}
                      <div className="mt-3 pt-3 border-t border-line">
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: THEME.accentDark }}>
                          ✨ 이 질문 피드백
                        </div>
                        <textarea
                          value={perQFeedback[String(curQ.num)] || ""}
                          onChange={(e) => updateCurrentQFeedback(e.target.value)}
                          placeholder={curQ.answered ? "AI 피드백 생성 버튼을 누르거나 직접 작성하세요..." : "미답변 질문이에요."}
                          rows={4}
                          disabled={!curQ.answered}
                          className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted disabled:bg-gray-50 disabled:text-gray-400"
                          onFocus={handleTextareaFocus}
                          onBlur={handleTextareaBlur}
                        />
                      </div>
                    </div>
                  )}

                  {/* 질문별 피드백 저장 버튼 */}
                  <button
                    onClick={savePerQuestionFeedback}
                    disabled={savingPerQ}
                    className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:opacity-50 self-end"
                    style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                  >
                    {savingPerQ ? "전달 중..." : "📤 질문별 피드백 학생에게 전달"}
                  </button>

                  {/* 음성 분석 종합 카드 */}
                  <SimulationAnalysisCard
                    metrics={Object.values(selSim.ai_analysis || {}) as QuestionMetric[]}
                    accent="#059669"
                    accentDark="#065F46"
                    accentBg="#ECFDF5"
                    accentBorder="#6EE7B7"
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ==================== 삭제 모달 ==================== */}
      {deleteTarget !== null && (
        <div
          onClick={() => setDeleteTarget(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[380px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-3xl mb-3">⚠️</div>
            <div className="text-[17px] font-extrabold text-ink mb-2">시뮬레이션을 삭제하시겠어요?</div>
            <div className="text-[13px] font-medium text-ink-secondary mb-6 leading-[1.6]">
              삭제하면 녹음 파일과<br />분석 결과가 모두 사라져요.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                disabled={deleteSim.isPending}
                className="flex-1 h-11 bg-red-600 text-white rounded-lg text-[13px] font-bold hover:bg-red-700 transition-all hover:-translate-y-px disabled:opacity-50"
                style={{ boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)" }}
              >
                {deleteSim.isPending ? "삭제 중..." : "🗑️ 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}