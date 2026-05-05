import { useState, useRef, useCallback, useEffect } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import {
  useStudentStartedProblems,
  useStudentProblemQuestions,
  useStudentPassageAnswers,
  useStudentPassageFeedback,
  useSavePassageFirstFeedback,
  useSavePassageFinalFeedback,
  useUpdatePassageTails,
} from "@/pages/admin/_hooks/middle/useStudentPresentation";

// 🌱 중등 초록 테마
const THEME = {
  accent: "#059669",
  accentDark: "#065F46",
  accentBg: "#ECFDF5",
  accentBorder: "#6EE7B7",
  accentShadow: "rgba(16, 185, 129, 0.15)",
  gradient: "linear-gradient(135deg, #065F46, #10B981)",
};

const STEP_LABELS = [
  "첫 답변",
  "1차 피드백",
  "업그레이드",
  "최종 피드백",
  "꼬리질문",
];

// AI mock (나중에 Claude API)
const AI_MOCK = {
  evalCriteria:
    "제시문 면접에서는 자료 해석 능력과 논리적 사고력을 중시합니다.",
  scores: [
    {
      label: "논리력",
      score: 24,
      max: 30,
      desc: "주장의 근거가 일부 부족합니다.",
    },
    {
      label: "분석력",
      score: 38,
      max: 50,
      desc: "제시문 핵심을 파악했지만 비교 분석이 약합니다.",
    },
    {
      label: "표현력",
      score: 14,
      max: 20,
      desc: "답변 구조는 있으나 논리 전개가 다소 아쉽습니다.",
    },
  ],
  summary: "제시문 핵심은 잡았으나, 두 사상의 비교 분석이 부족합니다.",
  strengths: [
    "핵심 키워드를 정확히 파악했어요",
    "본인의 견해를 명확히 밝혔어요",
  ],
  improvements: ["두 제시문의 비교 분석이 약해요", "구체적 사례 부족"],
  // 선생님 말투 피드백
  teacherFirstFeedback:
    '○○이의 답변을 잘 읽었어요! 제시문의 핵심 키워드(민주주의, 엘리트주의)를 정확히 파악한 점이 좋아요. 한 가지만 보완해보면 좋겠어요. 두 사상의 "비교 분석"이 좀 더 깊었으면 해요. 예를 들어 "정당성의 근거"가 무엇인지(민중의 의사 vs 전문성), "통치 방식"이 어떻게 다른지(다수결 vs 철인 통치) 구체적으로 비교해보세요. 그리고 제시문 (다)의 그래프도 함께 활용하면 답변이 훨씬 풍부해질 거예요. 화이팅 💪',
  teacherFinalFeedback:
    '업그레이드된 답변을 보니 정말 많이 좋아졌어요! 두 사상의 비교가 명확해졌고, 제시문 (다)도 잘 활용했네요. 한 가지만 더 보완하면, 본인의 견해를 한 문장 더 추가해보세요. "나는 어느 쪽에 더 공감하는가, 왜?"를 답하면 면접관이 학생의 사고력을 더 잘 평가할 수 있어요. 잘했어요! 👏',
  tailSuggestions: [
    "본인이 만약 정책 결정자라면 어떤 선택을 하시겠어요?",
    "제시문의 관점과 현재 한국 사회를 연결하면 어떤 시사점이 있나요?",
    "본인의 주장에 대한 반대 의견에 어떻게 대답하시겠어요?",
  ],
};

const getMockScores = (criteria: any[]): number[] => {
  return criteria.map((c) => Math.max(c.standard - 15, c.standard - 10));
};

export default function MiddlePassageTab({ student }: { student: any }) {
  const studentId = student?.id ? String(student.id) : undefined;

  // ⭐ DB 훅
  const { data: startedProblems = [], isLoading } =
    useStudentStartedProblems(studentId);
  const [filterSchool, setFilterSchool] = useState<string>("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 선택한 문제
  const [selProblemId, setSelProblemId] = useState<string | null>(null);
  const selProblem = startedProblems.find((p) => p.id === selProblemId) ?? null;

  // 선택한 문제의 질문/답변
  const { data: questions = [] } = useStudentProblemQuestions(
    selProblemId || undefined,
  );
  const { data: answers = [] } = useStudentPassageAnswers(
    studentId,
    selProblemId || undefined,
  );

  const answerByQuestionId = answers.reduce((acc: Record<string, any>, a) => {
    acc[a.question_id] = a;
    return acc;
  }, {});

  // 선택한 질문
  const [selQIdx, setSelQIdx] = useState(0);
  const selQ = questions[selQIdx] ?? null;
  const selAnswer = selQ ? answerByQuestionId[selQ.id] : null;

  // 선택한 답변의 피드백
  const { data: selFeedback } = useStudentPassageFeedback(selAnswer?.id);

  // 입력 state
  const [teacherFbText, setTeacherFbText] = useState("");
  const [finalFbText, setFinalFbText] = useState("");
  const [newTailText, setNewTailText] = useState("");

  // AI 패널
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const [aiTab, setAiTab] = useState<"first" | "second">("first");
  const [aiWriting, setAiWriting] = useState<"first" | "final" | null>(null);

  // AI 꼬리질문 모달
  const [showAiTailModal, setShowAiTailModal] = useState(false);
  const [aiTailLoading, setAiTailLoading] = useState(false);
  const [selectedAiTails, setSelectedAiTails] = useState<number[]>([]);

  // 분할 너비
  const [leftWidth, setLeftWidth] = useState(45);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 훅
  const saveFirstFb = useSavePassageFirstFeedback();
  const saveFinalFb = useSavePassageFinalFeedback();
  const updateTails = useUpdatePassageTails();

  // 문제 바뀌면 첫 질문으로
  useEffect(() => {
    setSelQIdx(0);
    setShowAiPanel(false);
    setAiData(null);
  }, [selProblemId]);

  // 질문 바뀌면 textarea 초기값
  useEffect(() => {
    if (!selAnswer) {
      setTeacherFbText("");
      setFinalFbText("");
      return;
    }
    setTeacherFbText(selFeedback?.teacher_first_feedback || "");
    setFinalFbText(selFeedback?.teacher_final_feedback || "");
  }, [
    selAnswer?.id,
    selFeedback?.teacher_first_feedback,
    selFeedback?.teacher_final_feedback,
  ]);

  // 드래그 핸들러
  const handleDragStart = useCallback(() => {
    isDragging.current = true;
  }, []);
  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
  }, []);
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftWidth(Math.min(70, Math.max(25, pct)));
  }, []);

  const getQStep = (questionId: string) => {
    const ans = answerByQuestionId[questionId];
    if (!ans?.answer) return 1;
    if (selQ?.id !== questionId) return 1; // 다른 질문은 1차 피드백 정보 없음
    if (!selFeedback?.teacher_first_feedback) return 2;
    if (!ans.upgraded_answer) return 3;
    if (!selFeedback?.teacher_final_feedback) return 4;
    return 5;
  };

  const getProblemStatus = (problemId: string) => {
    // sidebar용 — 시작했으니 진행중 또는 완료
    return "doing";
  };

  // 학교 필터
  const schools = Array.from(new Set(startedProblems.map((p) => p.school)));
  const filteredProblems =
    filterSchool === "all"
      ? startedProblems
      : startedProblems.filter((p) => p.school === filterSchool);

  // 1차 피드백 전달
  const handleSendFirstFb = async () => {
    if (!selAnswer || !teacherFbText.trim()) return;
    try {
      await saveFirstFb.mutateAsync({
        answer_id: selAnswer.id,
        teacher_first_feedback: teacherFbText,
      });
      alert("✅ 1차 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  // 최종 피드백 전달
  const handleSendFinalFb = async () => {
    if (!selAnswer || !finalFbText.trim()) return;
    try {
      await saveFinalFb.mutateAsync({
        answer_id: selAnswer.id,
        teacher_final_feedback: finalFbText,
      });
      alert("✅ 최종 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  // 꼬리질문 추가
  const handleAddTail = async () => {
    if (!selAnswer || !newTailText.trim()) return;
    const currentTails = selFeedback?.tail_questions || [];
    try {
      await updateTails.mutateAsync({
        answer_id: selAnswer.id,
        tail_questions: [...currentTails, { text: newTailText.trim() }],
      });
      setNewTailText("");
    } catch (e: any) {
      alert(`추가 실패: ${e.message}`);
    }
  };

  // 꼬리질문 삭제
  const handleRemoveTail = async (idx: number) => {
    if (!selAnswer) return;
    const currentTails = selFeedback?.tail_questions || [];
    const newTails = currentTails.filter((_: any, i: number) => i !== idx);
    try {
      await updateTails.mutateAsync({
        answer_id: selAnswer.id,
        tail_questions: newTails,
      });
    } catch (e: any) {
      alert(`삭제 실패: ${e.message}`);
    }
  };

  // AI 분석 패널 열기
  const openAiAnalysis = (tab: "first" | "second" = "first") => {
    setShowAiPanel(true);
    setAiTab(tab);
    setAiLoading(true);
    setAiData(null);
    setTimeout(() => {
      setAiData(AI_MOCK);
      setAiLoading(false);
    }, 1200);
  };

  // 선생님 말투 작성
  const writeAiTeacherFeedback = (type: "first" | "final") => {
    if (!selAnswer) return;
    setAiWriting(type);
    setTimeout(() => {
      if (type === "first") {
        setTeacherFbText(AI_MOCK.teacherFirstFeedback);
      } else {
        setFinalFbText(AI_MOCK.teacherFinalFeedback);
      }
      setAiWriting(null);
      setShowAiPanel(false);
    }, 1000);
  };

  // AI 꼬리질문 모달
  const openAiTailModal = () => {
    setShowAiTailModal(true);
    setAiTailLoading(true);
    setSelectedAiTails([]);
    setTimeout(() => setAiTailLoading(false), 1200);
  };

  const deliverAiTails = async () => {
    if (!selAnswer || selectedAiTails.length === 0) return;
    const currentTails = selFeedback?.tail_questions || [];
    const newTails = selectedAiTails.map((i) => ({
      text: AI_MOCK.tailSuggestions[i],
    }));
    try {
      await updateTails.mutateAsync({
        answer_id: selAnswer.id,
        tail_questions: [...currentTails, ...newTails],
      });
      setShowAiTailModal(false);
      setSelectedAiTails([]);
    } catch (e: any) {
      alert(`추가 실패: ${e.message}`);
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

  // 레이더 차트 데이터
  const getRadarData = (criteria: any[]) => {
    const scores = getMockScores(criteria);
    return criteria.map((c, i) => ({
      subject: c.name,
      standard: c.standard,
      student: scores[i] || 0,
      fullMark: 100,
    }));
  };

  const getBarData = (analysis: any) => {
    if (!analysis?.scores) return [];
    return analysis.scores.map((s: any) => ({
      name: s.label,
      score: s.score,
      max: s.max,
      pct: Math.round((s.score / s.max) * 100),
    }));
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      className="flex gap-3 h-full overflow-hidden"
    >
      {/* ==================== 왼쪽 목록 ==================== */}
      <div
        className="flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-300"
        style={{ width: sidebarCollapsed ? "60px" : "320px" }}
      >
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center py-3 h-full">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:bg-gray-50 mb-3"
              style={{ color: THEME.accent }}
              title="목록 펼치기"
            >
              <span className="text-lg">▶</span>
            </button>
            <div className="w-8 h-px bg-line mb-3" />
            <div className="flex-1 overflow-y-auto w-full flex flex-col items-center gap-1.5 px-2">
              {filteredProblems.map((p) => {
                const isSelected = selProblemId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelProblemId(p.id)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-extrabold transition-all flex-shrink-0"
                    style={{
                      background: isSelected ? THEME.accent : THEME.accentBg,
                      color: isSelected ? "#fff" : THEME.accentDark,
                      border: `1px solid ${isSelected ? THEME.accent : THEME.accentBorder + "60"}`,
                      boxShadow: isSelected
                        ? `0 2px 8px ${THEME.accentShadow}`
                        : "none",
                    }}
                    title={`${p.school} · ${p.problem_title}`}
                  >
                    {p.school[0]}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-line flex-shrink-0 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-extrabold text-ink tracking-tight">
                  📄 제시문 면접 기록
                </div>
                <div className="text-[11px] font-medium text-ink-secondary mt-1">
                  총{" "}
                  <span className="font-bold" style={{ color: THEME.accent }}>
                    {startedProblems.length}개
                  </span>{" "}
                  문제
                </div>
              </div>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:bg-gray-100 hover:text-ink transition-colors flex-shrink-0"
                title="목록 접기"
              >
                <span className="text-base">◀</span>
              </button>
            </div>

            {schools.length > 0 && (
              <div className="px-3 py-2.5 border-b border-line flex-shrink-0">
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => setFilterSchool("all")}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                    style={{
                      borderColor:
                        filterSchool === "all" ? THEME.accent : "#E5E7EB",
                      background:
                        filterSchool === "all" ? THEME.accentBg : "#fff",
                      color:
                        filterSchool === "all" ? THEME.accentDark : "#6B7280",
                    }}
                  >
                    전체
                  </button>
                  {schools.map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterSchool(s)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                      style={{
                        borderColor:
                          filterSchool === s ? THEME.accent : "#E5E7EB",
                        background:
                          filterSchool === s ? THEME.accentBg : "#fff",
                        color:
                          filterSchool === s ? THEME.accentDark : "#6B7280",
                      }}
                    >
                      🏫 {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {isLoading ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  불러오는 중...
                </div>
              ) : filteredProblems.length === 0 ? (
                <div className="text-center py-10 text-ink-muted">
                  <div className="text-3xl mb-2">📄</div>
                  <div className="text-[12px] font-medium">
                    학생이 답변한 문제가 없어요
                  </div>
                </div>
              ) : (
                filteredProblems.map((p) => {
                  const isSelected = selProblemId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelProblemId(p.id)}
                      className="w-full rounded-xl px-3.5 py-3 mb-1.5 text-left transition-all"
                      style={{
                        border: `1px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                        background: isSelected ? THEME.accentBg : "#fff",
                        boxShadow: isSelected
                          ? `0 2px 8px ${THEME.accentShadow}`
                          : "none",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-base">🏫</span>
                        <div
                          className="text-[13px] font-extrabold tracking-tight flex-1"
                          style={{
                            color: isSelected ? THEME.accentDark : "#1a1a1a",
                          }}
                        >
                          {p.school}
                        </div>
                        <span className="text-[10px] font-bold text-ink-muted">
                          {p.year}
                        </span>
                      </div>
                      <div className="text-[12px] font-semibold text-ink mb-1">
                        📄 {p.problem_title}
                      </div>
                      <div className="text-[10px] font-medium text-ink-muted mb-2">
                        {p.subject}
                      </div>
                      <div className="text-[10px] font-medium text-ink-muted">
                        📅 시작{" "}
                        {new Date(p.created_at).toLocaleDateString("ko-KR")}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ==================== 오른쪽 상세 ==================== */}
      {!selProblem ? (
        <div className="flex-1 bg-white border border-line rounded-2xl flex items-center justify-center shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-center text-ink-muted">
            <div className="text-4xl mb-2">📄</div>
            <div className="text-[14px] font-bold text-ink-secondary">
              학생이 답변한 문제를 선택해주세요
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          {/* 헤더 */}
          <div className="px-4 py-2.5 border-b border-line flex-shrink-0 flex items-center gap-2 flex-wrap">
            <div className="text-[14px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
              <span>🏫</span>
              <span>{selProblem.school}</span>
              <span className="text-ink-muted font-medium">·</span>
              <span>📄 {selProblem.problem_title}</span>
            </div>
            <span className="text-[10px] font-semibold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
              📅 {selProblem.year}
            </span>
            <span className="text-[10px] font-semibold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
              {selProblem.subject}
            </span>

            {/* 질문 탭 */}
            {questions.length > 1 && (
              <div className="flex gap-1 ml-auto">
                {questions.map((q, i) => {
                  const isActive = selQIdx === i;
                  const ans = answerByQuestionId[q.id];
                  const hasAnswer = !!ans?.answer;
                  const hasFinalFb = false; // 다른 질문은 피드백 정보 없음 — 이건 selFeedback이 selQ에만 있어서
                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelQIdx(i)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all whitespace-nowrap"
                      style={{
                        background: isActive ? THEME.accent : "#fff",
                        color: isActive ? "#fff" : "#6B7280",
                        borderColor: isActive ? THEME.accent : "#E5E7EB",
                        boxShadow: isActive
                          ? `0 2px 6px ${THEME.accentShadow}`
                          : "none",
                      }}
                    >
                      Q{i + 1} {hasAnswer ? "⏳" : "○"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 분할 컨텐츠 */}
          <div className="flex flex-1 overflow-hidden">
            {/* 왼쪽: 제시문 */}
            <div
              className="overflow-y-auto px-5 py-4 bg-[#FAFAFA] flex-shrink-0"
              style={{ width: `${leftWidth}%` }}
            >
              <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">
                📖 제시문
              </div>
              <div
                className="bg-white border border-line rounded-xl px-5 py-4 text-[13px] text-ink leading-[2] whitespace-pre-line"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {selProblem.passage_text}
              </div>
            </div>

            {/* 드래그 핸들 */}
            <div
              onMouseDown={handleDragStart}
              className="w-1 bg-line cursor-col-resize flex-shrink-0 flex items-center justify-center transition-colors hover:bg-[#6EE7B7]"
            >
              <div className="w-0.5 h-8 bg-ink-muted rounded-full" />
            </div>

            {/* 오른쪽: 질문 답변 */}
            {!selQ ? (
              <div className="flex-1 flex items-center justify-center text-ink-muted">
                <div className="text-[13px]">질문이 없어요</div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                {/* 질문 + 의도 */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    className="rounded-xl px-4 py-3"
                    style={{
                      background: THEME.accentBg,
                      border: `1px solid ${THEME.accentBorder}60`,
                    }}
                  >
                    <div
                      className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: THEME.accent }}
                    >
                      📌 문제 {selQIdx + 1}
                    </div>
                    <div
                      className="text-[13.5px] font-bold leading-[1.6]"
                      style={{ color: THEME.accentDark }}
                    >
                      {selQ.text}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">
                      💡 질문 의도
                    </div>
                    <ul className="pl-4">
                      {(selQ.intent || []).map((item: string, i: number) => (
                        <li
                          key={i}
                          className="text-[12px] font-medium text-amber-800 leading-[1.6] list-disc"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 5단계 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="flex">
                    {STEP_LABELS.map((label, i) => {
                      const qStep = getQStep(selQ.id);
                      const stepNum = i + 1;
                      const isDone = stepNum < qStep;
                      const isOn = stepNum === qStep;
                      const active = isDone || isOn;
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1 relative"
                        >
                          {i < 4 && (
                            <div
                              className="absolute top-[11px] left-[55%] w-[90%] h-px"
                              style={{
                                background: isDone ? THEME.accent : "#E5E7EB",
                              }}
                            />
                          )}
                          <div
                            className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-extrabold z-10 relative border"
                            style={{
                              background: active ? THEME.accent : "#F3F4F6",
                              color: active ? "#fff" : "#9CA3AF",
                              borderColor: active ? THEME.accent : "#E5E7EB",
                            }}
                          >
                            {isDone ? "✓" : stepNum}
                          </div>
                          <div
                            className="text-[10px] font-bold whitespace-nowrap"
                            style={{
                              color: active ? THEME.accentDark : "#9CA3AF",
                            }}
                          >
                            {label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI 분석 보기 버튼 */}
                {selAnswer?.answer && (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        if (showAiPanel && aiTab === "first") {
                          setShowAiPanel(false);
                          setAiData(null);
                        } else openAiAnalysis("first");
                      }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                      style={{
                        background:
                          showAiPanel && aiTab === "first"
                            ? THEME.accent
                            : "#fff",
                        color:
                          showAiPanel && aiTab === "first"
                            ? "#fff"
                            : THEME.accent,
                        border: `1px solid ${THEME.accent}`,
                        boxShadow:
                          showAiPanel && aiTab === "first"
                            ? `0 4px 12px ${THEME.accentShadow}`
                            : "none",
                      }}
                    >
                      ✨ 1차 AI 분석{" "}
                      {showAiPanel && aiTab === "first" ? "닫기" : "보기"}
                    </button>
                    {selAnswer?.upgraded_answer && (
                      <button
                        onClick={() => {
                          if (showAiPanel && aiTab === "second") {
                            setShowAiPanel(false);
                            setAiData(null);
                          } else openAiAnalysis("second");
                        }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                        style={{
                          background:
                            showAiPanel && aiTab === "second"
                              ? THEME.accent
                              : "#fff",
                          color:
                            showAiPanel && aiTab === "second"
                              ? "#fff"
                              : THEME.accent,
                          border: `1px solid ${THEME.accent}`,
                          boxShadow:
                            showAiPanel && aiTab === "second"
                              ? `0 4px 12px ${THEME.accentShadow}`
                              : "none",
                        }}
                      >
                        ✨ 2차 AI 분석{" "}
                        {showAiPanel && aiTab === "second" ? "닫기" : "보기"}
                      </button>
                    )}
                  </div>
                )}

                {/* Step 1 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">
                      Step 1
                    </span>
                    <span className="text-[11px] font-bold text-ink-secondary">
                      👤 학생 첫 답변
                    </span>
                  </div>
                  {selAnswer?.answer ? (
                    <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                      {selAnswer.answer}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg px-3 py-4 text-[12px] font-medium text-ink-muted text-center">
                      ⏳ 학생이 아직 답변하지 않았어요
                    </div>
                  )}
                </div>

                {/* Step 2 */}
                {selAnswer?.answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                        style={{ background: THEME.accent }}
                      >
                        Step 2
                      </span>
                      <span className="text-[11px] font-bold text-ink-secondary">
                        💬 선생님 1차 피드백
                      </span>
                    </div>
                    <textarea
                      value={teacherFbText}
                      onChange={(e) => setTeacherFbText(e.target.value)}
                      placeholder="학생 답변에 대한 피드백을 작성해주세요..."
                      rows={3}
                      className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                      onFocus={handleTextareaFocus}
                      onBlur={handleTextareaBlur}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleSendFirstFb}
                        disabled={
                          !teacherFbText.trim() || saveFirstFb.isPending
                        }
                        className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                        style={{
                          background:
                            teacherFbText.trim() && !saveFirstFb.isPending
                              ? THEME.accent
                              : "#E5E7EB",
                          color:
                            teacherFbText.trim() && !saveFirstFb.isPending
                              ? "#fff"
                              : "#9CA3AF",
                          boxShadow:
                            teacherFbText.trim() && !saveFirstFb.isPending
                              ? `0 2px 6px ${THEME.accentShadow}`
                              : "none",
                        }}
                      >
                        {saveFirstFb.isPending
                          ? "저장 중..."
                          : selFeedback?.teacher_first_feedback
                            ? "💾 업데이트"
                            : "📤 1차 피드백 전달"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {selFeedback?.teacher_first_feedback && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">
                        Step 3
                      </span>
                      <span className="text-[11px] font-bold text-ink-secondary">
                        👤 학생 업그레이드 답변
                      </span>
                    </div>
                    {selAnswer?.upgraded_answer ? (
                      <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                        {selAnswer.upgraded_answer}
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-4 text-[12px] font-medium text-amber-700 text-center">
                        ⏳ 학생이 업그레이드 답변 작성중이에요
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4 */}
                {selAnswer?.upgraded_answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                        style={{ background: THEME.accent }}
                      >
                        Step 4
                      </span>
                      <span className="text-[11px] font-bold text-ink-secondary">
                        💬 선생님 최종 피드백
                      </span>
                    </div>
                    <textarea
                      value={finalFbText}
                      onChange={(e) => setFinalFbText(e.target.value)}
                      placeholder="업그레이드 답변에 대한 최종 피드백을 작성해주세요..."
                      rows={3}
                      className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                      onFocus={handleTextareaFocus}
                      onBlur={handleTextareaBlur}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleSendFinalFb}
                        disabled={!finalFbText.trim() || saveFinalFb.isPending}
                        className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                        style={{
                          background:
                            finalFbText.trim() && !saveFinalFb.isPending
                              ? THEME.accent
                              : "#E5E7EB",
                          color:
                            finalFbText.trim() && !saveFinalFb.isPending
                              ? "#fff"
                              : "#9CA3AF",
                          boxShadow:
                            finalFbText.trim() && !saveFinalFb.isPending
                              ? `0 2px 6px ${THEME.accentShadow}`
                              : "none",
                        }}
                      >
                        {saveFinalFb.isPending
                          ? "저장 중..."
                          : selFeedback?.teacher_final_feedback
                            ? "💾 업데이트"
                            : "📤 최종 피드백 전달"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 5 꼬리질문 */}
                {selFeedback?.teacher_final_feedback && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      <span
                        className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                        style={{ background: THEME.accent }}
                      >
                        Step 5
                      </span>
                      <span className="text-[11px] font-bold text-ink-secondary">
                        🔗 꼬리질문
                      </span>
                      <span className="ml-auto text-[10px] font-bold text-ink-muted">
                        {selFeedback?.tail_questions?.length || 0}개
                      </span>
                    </div>

                    {selFeedback?.tail_questions &&
                      selFeedback.tail_questions.length > 0 && (
                        <div className="mb-3">
                          {selFeedback.tail_questions.map(
                            (t: any, i: number) => (
                              <div key={i} className="mb-2">
                                <div
                                  className="rounded-lg px-3 py-2.5 flex items-start gap-2 mb-1.5"
                                  style={{
                                    background: THEME.accentBg,
                                    border: `1px solid ${THEME.accentBorder}60`,
                                  }}
                                >
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                    style={{
                                      color: "#fff",
                                      background: THEME.accent,
                                    }}
                                  >
                                    꼬리{i + 1}
                                  </span>
                                  <span
                                    className="text-[12.5px] font-medium flex-1 leading-[1.6]"
                                    style={{ color: THEME.accentDark }}
                                  >
                                    {t.text}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveTail(i)}
                                    className="text-ink-muted hover:text-red-500 text-xs flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                                {t.answer && (
                                  <div className="ml-6 bg-gray-50 border border-line rounded-md px-3 py-2">
                                    <div className="text-[10px] font-bold text-ink-muted mb-1">
                                      👤 학생 답변
                                    </div>
                                    <div className="text-[12px] font-medium text-ink leading-[1.7] whitespace-pre-wrap">
                                      {t.answer}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}

                    <div className="flex gap-2 mb-2">
                      <input
                        value={newTailText}
                        onChange={(e) => setNewTailText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTail()}
                        placeholder="꼬리질문을 직접 추가..."
                        className="flex-1 h-9 border border-line rounded-lg px-3 text-[12px] font-medium outline-none transition-all placeholder:text-ink-muted"
                        onFocus={(e) => {
                          e.target.style.borderColor = THEME.accent;
                          e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "#E5E7EB";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                      <button
                        onClick={handleAddTail}
                        disabled={!newTailText.trim() || updateTails.isPending}
                        className="h-9 px-3 text-white rounded-lg text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                        style={{
                          background:
                            newTailText.trim() && !updateTails.isPending
                              ? THEME.accent
                              : "#E5E7EB",
                          color:
                            newTailText.trim() && !updateTails.isPending
                              ? "#fff"
                              : "#9CA3AF",
                        }}
                      >
                        ➕ 추가
                      </button>
                    </div>

                    <button
                      onClick={openAiTailModal}
                      className="w-full h-9 bg-white border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                      style={{ color: THEME.accent, borderColor: THEME.accent }}
                    >
                      ✨ AI 꼬리질문 제안 받기
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== AI 분석 사이드 패널 (fixed) ==================== */}
      {showAiPanel && selQ && (
        <div className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-line flex flex-col shadow-[-8px_0_24px_rgba(15,23,42,0.08)] z-50">
          <div className="px-4 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">
                ✨ AI 분석
              </div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                🏫 {selProblem?.school} · {selProblem?.problem_title} · Q
                {selQIdx + 1}
              </div>
            </div>
            <button
              onClick={() => {
                setShowAiPanel(false);
                setAiData(null);
              }}
              className="text-ink-muted hover:text-ink text-base w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* 탭 */}
          <div className="flex border-b border-line flex-shrink-0">
            <button
              onClick={() => {
                setAiTab("first");
                openAiAnalysis("first");
              }}
              className="flex-1 py-2.5 text-center text-[12px] font-bold transition-all border-b-2"
              style={{
                color: aiTab === "first" ? THEME.accentDark : "#9CA3AF",
                borderColor: aiTab === "first" ? THEME.accent : "transparent",
                background: aiTab === "first" ? THEME.accentBg : "transparent",
              }}
            >
              📊 1차 답변 분석
            </button>
            <button
              onClick={() => {
                if (selAnswer?.upgraded_answer) {
                  setAiTab("second");
                  openAiAnalysis("second");
                }
              }}
              disabled={!selAnswer?.upgraded_answer}
              className="flex-1 py-2.5 text-center text-[12px] font-bold transition-all border-b-2 disabled:cursor-not-allowed"
              style={{
                color: !selAnswer?.upgraded_answer
                  ? "#D1D5DB"
                  : aiTab === "second"
                    ? THEME.accentDark
                    : "#9CA3AF",
                borderColor: aiTab === "second" ? THEME.accent : "transparent",
                background: aiTab === "second" ? THEME.accentBg : "transparent",
              }}
            >
              📈 2차 답변 분석
              {!selAnswer?.upgraded_answer && (
                <div className="text-[9px]">업그레이드 필요</div>
              )}
            </button>
          </div>

          {/* 분석 내용 */}
          {aiLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted">
              <div className="text-3xl animate-pulse">✨</div>
              <div className="text-[13px] font-medium">
                AI가 답변을 분석 중이에요...
              </div>
            </div>
          ) : !aiData ? (
            <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px] font-medium">
              분석 데이터가 없어요.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {/* 정합성 분석 */}
              <div
                className="rounded-xl px-4 py-3.5"
                style={{
                  background: THEME.accentBg,
                  border: `1px solid ${THEME.accentBorder}60`,
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">✅</span>
                  <div
                    className="text-[13px] font-extrabold"
                    style={{ color: THEME.accentDark }}
                  >
                    답변 정합성 분석
                  </div>
                </div>

                {selQ.evaluation_criteria &&
                  selQ.evaluation_criteria.length > 0 && (
                    <>
                      <div className="h-[240px] mb-2 bg-white rounded-lg p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            data={getRadarData(selQ.evaluation_criteria)}
                            margin={{
                              top: 24,
                              right: 40,
                              bottom: 24,
                              left: 40,
                            }}
                          >
                            <PolarGrid stroke="#E5E7EB" />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={{
                                fontSize: 11,
                                fill: "#374151",
                                fontWeight: 600,
                              }}
                              tickLine={false}
                            />
                            <Radar
                              name="학교 기준"
                              dataKey="standard"
                              stroke="#F97316"
                              fill="#F97316"
                              fillOpacity={0.3}
                              strokeWidth={2}
                            />
                            <Radar
                              name="학생 답변"
                              dataKey="student"
                              stroke={THEME.accent}
                              fill={THEME.accent}
                              fillOpacity={0.5}
                              strokeWidth={2}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex gap-4 justify-center mb-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          학교 기준
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: THEME.accent }}
                          />
                          학생 답변
                        </div>
                      </div>
                    </>
                  )}

                {getBarData(aiData).map((d: any, i: number) => (
                  <div key={i} className="mb-2.5 bg-white rounded-lg px-3 py-2">
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="font-semibold text-ink">{d.name}</span>
                      <span
                        className="font-bold"
                        style={{ color: THEME.accent }}
                      >
                        {d.score}/{d.max}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${d.pct}%`,
                          background:
                            d.pct >= 80
                              ? THEME.accent
                              : d.pct >= 60
                                ? "#F97316"
                                : "#EF4444",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 종합 분석 */}
              <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">📊</span>
                  <div className="text-[13px] font-extrabold text-ink">
                    AI 종합 분석
                  </div>
                </div>

                <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 mb-3 mt-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                    🏫 {selProblem?.school} 면접 평가 기준
                  </div>
                  <div className="text-[12px] font-medium text-ink leading-[1.7]">
                    {aiData.evalCriteria}
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 mt-2 mb-3">
                  <div className="text-[11px] font-bold text-orange-800 mb-1">
                    📌 평가 요약
                  </div>
                  <div className="text-[12px] font-medium text-orange-900 leading-[1.7]">
                    {aiData.summary}
                  </div>
                </div>

                <div className="mb-3">
                  <div
                    className="text-[11px] font-extrabold uppercase tracking-wider mb-2"
                    style={{ color: THEME.accent }}
                  >
                    💪 강점 포인트
                  </div>
                  {(aiData.strengths || []).map((s: string, i: number) => (
                    <div
                      key={i}
                      className="text-[12px] font-medium leading-[1.6] px-3 py-2 rounded-lg mb-1.5"
                      style={{
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}40`,
                        color: THEME.accentDark,
                      }}
                    >
                      ✓ {s}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-red-500 uppercase tracking-wider mb-2">
                    ⚡ 개선 포인트
                  </div>
                  {(aiData.improvements || []).map((s: string, i: number) => (
                    <div
                      key={i}
                      className="text-[12px] font-medium text-red-900 leading-[1.6] px-3 py-2 bg-red-50 border border-red-200 rounded-lg mb-1.5"
                    >
                      △ {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* ✨ 선생님 답변 작성하기 */}
              <div
                className="bg-white rounded-xl px-4 py-3.5 border-2"
                style={{ borderColor: THEME.accent }}
              >
                <div
                  className="text-[11px] font-extrabold uppercase tracking-wider mb-1"
                  style={{ color: THEME.accent }}
                >
                  ✨ AI 자동 작성
                </div>
                <div className="text-[11px] text-ink-secondary mb-2.5 leading-[1.6]">
                  위 분석을 바탕으로 선생님 말투의{" "}
                  {aiTab === "first" ? "1차" : "최종"} 피드백을 자동으로
                  작성해드릴게요. 클릭하면 작성창에 자동 입력돼요.
                </div>
                <button
                  onClick={() =>
                    writeAiTeacherFeedback(
                      aiTab === "first" ? "first" : "final",
                    )
                  }
                  disabled={aiWriting !== null || !selAnswer}
                  className="w-full h-10 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px disabled:cursor-not-allowed"
                  style={{
                    background: aiWriting !== null ? "#9CA3AF" : THEME.accent,
                    boxShadow:
                      aiWriting !== null
                        ? "none"
                        : `0 4px 12px ${THEME.accentShadow}`,
                  }}
                >
                  {aiWriting !== null
                    ? "✨ 작성 중..."
                    : aiTab === "first"
                      ? "✏️ 선생님 1차 답변 작성하기"
                      : "✏️ 선생님 최종 답변 작성하기"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== AI 꼬리질문 모달 ==================== */}
      {showAiTailModal && (
        <div
          onClick={() => setShowAiTailModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[500px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-[18px] font-extrabold text-ink mb-1">
              ✨ AI 꼬리질문 제안
            </div>
            <div className="text-[12px] font-medium text-ink-secondary mb-5">
              제시문과 학생 답변을 분석해서 추천하는 꼬리질문이에요.
            </div>

            {aiTailLoading ? (
              <div className="text-center py-10 text-ink-muted text-[13px] font-medium">
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                AI가 꼬리질문을 생성 중이에요...
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {AI_MOCK.tailSuggestions.map((s, i) => {
                  const isSelected = selectedAiTails.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() =>
                        setSelectedAiTails((prev) =>
                          prev.includes(i)
                            ? prev.filter((x) => x !== i)
                            : [...prev, i],
                        )
                      }
                      className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-left transition-all"
                      style={{
                        border: `1px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                        background: isSelected ? THEME.accentBg : "#fff",
                        boxShadow: isSelected
                          ? `0 2px 8px ${THEME.accentShadow}`
                          : "none",
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                        style={{
                          border: `1.5px solid ${isSelected ? THEME.accent : "#D1D5DB"}`,
                          background: isSelected ? THEME.accent : "#fff",
                        }}
                      >
                        {isSelected && (
                          <span className="text-[11px] text-white font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[13px] font-medium leading-[1.6]"
                        style={{
                          color: isSelected ? THEME.accentDark : "#1a1a1a",
                        }}
                      >
                        {s}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowAiTailModal(false)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={deliverAiTails}
                disabled={
                  selectedAiTails.length === 0 ||
                  aiTailLoading ||
                  updateTails.isPending
                }
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                style={{
                  background:
                    selectedAiTails.length > 0 && !updateTails.isPending
                      ? THEME.accent
                      : "#E5E7EB",
                  color:
                    selectedAiTails.length > 0 && !updateTails.isPending
                      ? "#fff"
                      : "#9CA3AF",
                  boxShadow:
                    selectedAiTails.length > 0 && !updateTails.isPending
                      ? `0 4px 12px ${THEME.accentShadow}`
                      : "none",
                }}
              >
                {updateTails.isPending
                  ? "전달 중..."
                  : `📤 ${selectedAiTails.length}개 전달`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
