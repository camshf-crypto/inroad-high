import { useState, useRef, useEffect } from "react";
import {
  useStudentSimulations,
  useSaveSimulationFeedback,
  useDeleteStudentSimulation,
} from "@/pages/admin/_hooks/middle/useStudentSimulation";

// 🌱 중등 초록 테마
const THEME = {
  accent: "#059669",
  accentDark: "#065F46",
  accentBg: "#ECFDF5",
  accentBorder: "#6EE7B7",
  accentShadow: "rgba(16, 185, 129, 0.15)",
  gradient: "linear-gradient(135deg, #065F46, #10B981)",
};

// AI 피드백 시안 mock
const AI_FEEDBACK_SUGGESTIONS = [
  '답변 구조가 체계적이에요! "결론 → 근거 → 사례" 순서로 말하는 습관이 잘 잡혀있어요. 다만 "음..." 같은 습관어를 줄이면 더 전문적으로 들릴 거예요.',
  "경험과 진로를 연결한 점이 좋아요! 면접관은 이런 연결성을 중요하게 봐요. 다음엔 답변 시간을 40초 이내로 조금 더 압축해보세요.",
  '전반적으로 잘했지만 "학교 교육 철학"과의 연결이 약해요. 학교 홈페이지에서 찾은 구체적 내용을 1-2개 언급하면 훨씬 강력한 답변이 돼요.',
];

const AI_ANALYSIS_MOCK = {
  speed: {
    mine: 135,
    avg: 170,
    comment: "말의 속도가 평균보다 약간 느려요. 자신감 있게 말하는 연습을 해보세요.",
  },
  habits: ["음...", "그래서", "어..."],
  pause: {
    level: "양호",
    comment: "답변 중간 공백이 거의 없었어요. 좋은 흐름이에요!",
  },
  structure:
    '지원 동기를 명확히 밝혔고 본인 경험과 연결한 점이 좋습니다. 다만 "학교 교육 철학"에 대한 구체적 언급이 부족해요.',
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
  const [feedback, setFeedback] = useState("");
  const [playingQNum, setPlayingQNum] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 선택한 시뮬레이션 변경 시 피드백 textarea 초기값 세팅
  useEffect(() => {
    if (selSim) {
      setFeedback(selSim.teacher_feedback || "");
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

  const handleSendFeedback = async () => {
    if (!feedback.trim() || !selSim) return;
    try {
      await saveFeedback.mutateAsync({
        sim_id: selSim.id,
        teacher_feedback: feedback,
      });
      alert("✅ 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  const openAiModal = () => {
    setShowAiModal(true);
    setAiLoading(true);
    setAiSuggestions([]);
    setTimeout(() => {
      setAiSuggestions(AI_FEEDBACK_SUGGESTIONS);
      setAiLoading(false);
    }, 1200);
  };

  const applyAiSuggestion = (s: string) => {
    setFeedback(s);
    setShowAiModal(false);
  };

  // 🎵 질문별 음성 재생 (학생 화면과 동일한 안정성 강화 로직)
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

  // 🎯 음성이 하나라도 있으면 AI 분석 영역 표시
  const hasAnyAudio = (selSim?.questions || []).some((q: any) => q.answer_audio_url);

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
            {/* 🎵 숨겨진 audio 태그 (onPause 핸들러 제거함!) */}
            <audio
              ref={audioRef}
              onEnded={() => setPlayingQNum(null)}
              className="hidden"
            />

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
              <div className="text-[16px] font-extrabold text-ink tracking-tight">🎬 시뮬레이션</div>
              <div className="text-[11px] font-semibold text-ink-secondary mt-0.5">
                📅 {new Date(selSim.created_at).toLocaleDateString("ko-KR")} · ⏱ {selSim.duration || "-"} · 📋 {(selSim.questions || []).length}문항
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {/* 🎯 질문별 답변 + 음성 재생 (학생 화면과 동일한 구조) */}
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-3">
                  🎙️ 질문별 답변 ({(selSim.questions || []).length}개)
                </div>
                <div className="flex flex-col gap-3">
                  {(selSim.questions || []).map((q: any) => (
                    <div key={q.num} className="border border-line rounded-xl px-4 py-3 bg-gray-50">
                      {/* 질문 헤더 */}
                      <div className="flex items-start gap-2 mb-2.5">
                        <span
                          className="w-6 h-6 rounded-full text-white text-[11px] font-extrabold flex items-center justify-center flex-shrink-0"
                          style={{ background: THEME.accent }}
                        >
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
                          <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">
                            미답변
                          </span>
                        )}
                      </div>

                      {/* 음성 재생 버튼 */}
                      {q.answer_audio_url && (
                        <div className="bg-white border border-line rounded-lg px-3 py-2 mb-2 flex items-center gap-2.5">
                          <button
                            onClick={() => playQuestionAudio(q.num, q.answer_audio_url)}
                            className="w-9 h-9 rounded-full text-white flex items-center justify-center text-xs flex-shrink-0 transition-all hover:scale-105"
                            style={{
                              background: THEME.accent,
                              boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                            }}
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

                      {/* 음성 → 텍스트 변환 결과 */}
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
              </div>

              {/* AI 분석 (mock) */}
              {hasAnyAudio && (
                <div className="bg-white border border-line rounded-xl px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-[12px] font-extrabold text-ink tracking-tight">✨ AI 분석 결과</div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Mock 데이터 (AI 통합 후 실제 분석)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                    <div className="bg-gray-50 border border-line rounded-xl px-3.5 py-3">
                      <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">🗣️ 말의 빠르기</div>
                      <div className="flex gap-3 mb-2">
                        <div>
                          <div className="text-[10px] font-medium text-ink-muted mb-0.5">내 속도</div>
                          <div className="text-[20px] font-extrabold tracking-tight leading-none" style={{ color: "#059669" }}>
                            {AI_ANALYSIS_MOCK.speed.mine}
                            <span className="text-[10px] ml-0.5">wpm</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-medium text-ink-muted mb-0.5">평균</div>
                          <div className="text-[20px] font-extrabold text-ink-secondary tracking-tight leading-none">
                            {AI_ANALYSIS_MOCK.speed.avg}
                            <span className="text-[10px] ml-0.5">wpm</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-ink-secondary leading-[1.5]">
                        {AI_ANALYSIS_MOCK.speed.comment}
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-line rounded-xl px-3.5 py-3">
                      <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">⏸ 말의 공백</div>
                      <div className="text-[20px] font-extrabold tracking-tight leading-none mb-1.5" style={{ color: "#059669" }}>
                        {AI_ANALYSIS_MOCK.pause.level}
                      </div>
                      <div className="text-[11px] font-medium text-ink-secondary leading-[1.5]">
                        {AI_ANALYSIS_MOCK.pause.comment}
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-2.5">
                    <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">⚠️ 습관어</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {AI_ANALYSIS_MOCK.habits.map((h: string, i: number) => (
                        <span key={i} className="text-[12px] font-bold text-amber-800 bg-yellow-100 border border-yellow-300 px-2.5 py-1 rounded-full">
                          "{h}"
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl px-4 py-3" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: THEME.accent }}>
                      🎯 답변 구성 분석
                    </div>
                    <div className="text-[13px] font-medium leading-[1.7]" style={{ color: THEME.accentDark }}>
                      {AI_ANALYSIS_MOCK.structure}
                    </div>
                  </div>
                </div>
              )}

              {/* 선생님 피드백 */}
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">💬 선생님 피드백</div>
                  <button
                    onClick={openAiModal}
                    className="px-2.5 py-1 text-white rounded-md text-[11px] font-bold transition-all"
                    style={{ background: THEME.accent, boxShadow: `0 2px 6px ${THEME.accentShadow}` }}
                  >
                    ✨ AI 피드백 제안
                  </button>
                </div>

                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="AI 분석 결과를 참고해서 피드백을 작성해주세요..."
                  rows={5}
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                  onFocus={handleTextareaFocus}
                  onBlur={handleTextareaBlur}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSendFeedback}
                    disabled={!feedback.trim() || saveFeedback.isPending}
                    className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                    style={{
                      background: feedback.trim() && !saveFeedback.isPending ? THEME.accent : "#E5E7EB",
                      color: feedback.trim() && !saveFeedback.isPending ? "#fff" : "#9CA3AF",
                      boxShadow: feedback.trim() && !saveFeedback.isPending ? `0 4px 12px ${THEME.accentShadow}` : "none",
                    }}
                  >
                    {saveFeedback.isPending ? "전달 중..." : selSim.teacher_feedback ? "💾 피드백 업데이트" : "📤 피드백 전달"}
                  </button>
                </div>
              </div>
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
              삭제하면 녹음 파일과<br />AI 분석 결과가 모두 사라져요.
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

      {/* ==================== AI 피드백 제안 모달 ==================== */}
      {showAiModal && (
        <div
          onClick={() => setShowAiModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-[18px] font-extrabold text-ink mb-1">✨ AI 피드백 제안</div>
            <div className="text-[12px] font-medium text-ink-secondary mb-5">
              학생의 답변과 AI 분석 결과를 바탕으로 피드백 시안을 만들었어요.
            </div>

            {aiLoading ? (
              <div className="text-center py-10 text-ink-muted text-[13px] font-medium">
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                AI가 피드백을 생성 중이에요...
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {aiSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => applyAiSuggestion(s)}
                    className="text-left px-4 py-3 rounded-xl bg-white transition-all"
                    style={{ border: "1px solid #E5E7EB" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = THEME.accent;
                      e.currentTarget.style.background = THEME.accentBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.background = "#fff";
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{
                          color: THEME.accentDark,
                          background: THEME.accentBg,
                          border: `1px solid ${THEME.accentBorder}60`,
                        }}
                      >
                        시안 {i + 1}
                      </span>
                      <span className="text-[13px] font-medium text-ink leading-[1.6]">{s}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAiModal(false)}
              className="w-full h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}