import { useState, useEffect } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import {
  useStudentAnsweredSchools,
  useStudentSchoolQuestions,
  useStudentPastAnswers,
  useStudentPastFeedback,
  useSavePastFirstFeedback,
  useSavePastFinalFeedback,
  useUpdatePastTails,
} from "@/pages/admin/_hooks/middle/useStudentPast";

// 🌱 중등 초록 테마
const THEME = {
  accent: "#059669",
  accentDark: "#065F46",
  accentBg: "#ECFDF5",
  accentBorder: "#6EE7B7",
  accentLight: "#D1FAE5",
  accentShadow: "rgba(16, 185, 129, 0.15)",
  gradient: "linear-gradient(135deg, #065F46, #10B981)",
};

// AI mock 데이터
const AI_ANALYSIS_MOCK = {
  evalCriteria:
    "면접에서는 자기주도적 학습 능력과 지원 동기의 진정성을 중시합니다.",
  scores: [
    { label: "자기주도성", score: 24, max: 30, desc: "스스로 학습 계획을 세우고 실천한 경험이 드러났다." },
    { label: "전공적합성", score: 38, max: 50, desc: "지원 학교와의 연결성이 일부 드러났으나 구체성이 부족하다." },
    { label: "의사소통역량", score: 14, max: 20, desc: "답변 구조는 있으나 논리 전개가 다소 아쉽다." },
  ],
  summary: "자기주도성은 잘 드러났으나 학교 건학이념과의 연결이 부족하다.",
  strengths: [
    "자기주도적 학습 경험을 구체적으로 설명하였다.",
    "진로와 연결된 활동 경험이 잘 드러났다.",
  ],
  improvements: [
    "학교 건학이념과의 연결이 명확하지 않다.",
    "지원 동기가 추상적이어서 구체적인 사례가 필요하다.",
  ],
  teacherFirstFeedback:
    "○○이의 답변을 잘 읽었어요. 자기주도학습에 대한 의지가 잘 드러났네요! 한 가지만 보완해보면 좋겠어요. 자기주도학습 능력을 어떻게 키워왔는지 구체적인 사례를 하나 추가해보세요. 예를 들어 어떤 과목을 어떻게 스스로 공부했는지, 그 결과 어떤 변화가 있었는지 적으면 답변이 훨씬 설득력 있어질 거예요. 학교 건학이념과 본인의 학습 방식이 어떻게 연결되는지도 한 문장 추가하면 완벽해요! 화이팅 💪",
  teacherFinalFeedback:
    '업그레이드된 답변을 보니 정말 많이 좋아졌어요! 구체적인 사례가 추가되어서 자기주도성이 잘 드러납니다. 한 가지만 더 보완해보면, 면접관 입장에서 "그래서 이 학교에서만 가능한 게 뭔데?"라는 질문이 생길 수 있어요. 학교만의 특성과 본인의 학습 방식이 어떻게 만나는지 한 문장 더 추가하면 완벽해요. 잘했어요! 👏',
  tailSuggestions: [
    "학교의 자기주도학습 전형이 본인의 학습 방식과 어떻게 맞는지 구체적으로 설명해주세요.",
    "지원 동기에서 언급한 경험이 고등학교 입학 후 어떻게 발전될 것 같은지 말해보세요.",
    "본인이 가장 어려웠던 학습 경험과 극복 과정을 구체적으로 말씀해주세요.",
  ],
  second: {
    beforeDistribution: [
      { factorCode: "F01", factorName: "자기주도성", distribution: 35, evidence: "학습 계획 수립 경험 언급" },
      { factorCode: "F02", factorName: "전공적합성", distribution: 40, evidence: "지원 동기와 진로 연결" },
      { factorCode: "F03", factorName: "의사소통역량", distribution: 25, evidence: "논리적 전개 시도" },
    ],
    afterDistribution: [
      { factorCode: "F01", factorName: "자기주도성", distribution: 30, evidence: "구체적 실천 사례 보완 필요" },
      { factorCode: "F02", factorName: "전공적합성", distribution: 50, evidence: "학교 특성과의 연결이 강화됨" },
      { factorCode: "F03", factorName: "의사소통역량", distribution: 20, evidence: "논리 흐름은 유지됨" },
    ],
    structureComment:
      "2차 답변은 전공적합성 측면에서 학교와의 연결이 강화되었습니다. 경험 제시 → 의미 도출 → 학교 연결 순서로 재정렬하면 더 명확한 답변이 됩니다.",
    practiceAnswer:
      "저는 중학교 3년간 매일 아침 30분씩 스스로 학습 계획을 세우고 실천해왔습니다. 이 과정에서 자기주도학습의 중요성을 깊이 깨달았고, 학교의 자기주도학습 전형이 제 학습 방식과 가장 잘 맞는다고 생각해 지원하게 되었습니다.",
  },
};

const getMockScores = (criteria: any[]): number[] => {
  return criteria.map((c) => Math.max(c.standard - 15, c.standard - 10));
};

const TYPE_COLOR: Record<string, any> = {
  지원동기: { bg: "#ECFDF5", color: "#059669", border: "#6EE7B7" },
  자기주도: { bg: "#ECFDF5", color: "#059669", border: "#6EE7B7" },
  활동계획: { bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE" },
  인성: { bg: "#FFF3E8", color: "#D97706", border: "#FDBA74" },
  진로: { bg: "#F0FDF4", color: "#059669", border: "#6EE7B7" },
  전공: { bg: "#ECFDF5", color: "#059669", border: "#6EE7B7" },
  활동: { bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE" },
  자기소개: { bg: "#FFF7ED", color: "#C2410C", border: "#FDBA74" },
  공통: { bg: "#ECFDF5", color: "#059669", border: "#6EE7B7" },
};

const STEP_LABELS = ["첫 답변", "1차 피드백", "업그레이드", "최종 피드백", "꼬리질문"];

export default function MiddlePastTab({ student }: { student: any }) {
  const studentId = student?.id ? String(student.id) : undefined;

  // ⭐ 학생이 답변한 학교만 가져오기
  const { data: allSchools = [] } = useStudentAnsweredSchools(studentId);
  const [selSchool, setSelSchool] = useState("");

  const { data: questions = [] } = useStudentSchoolQuestions(selSchool || undefined);
  const { data: answers = [] } = useStudentPastAnswers(studentId, selSchool || undefined);

  const answerByQuestionId = answers.reduce((acc: Record<string, any>, a) => {
    acc[a.question_id] = a;
    return acc;
  }, {});

  const [selQId, setSelQId] = useState<string | null>(null);
  const selQ = questions.find((q) => q.id === selQId) ?? null;
  const selAnswer = selQ ? answerByQuestionId[selQ.id] : null;

  const { data: selFeedback } = useStudentPastFeedback(selAnswer?.id);

  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const [aiTab, setAiTab] = useState<"first" | "second">("first");
  const [secondAiLoading, setSecondAiLoading] = useState(false);
  const [showTailModal, setShowTailModal] = useState(false);
  const [tailInput, setTailInput] = useState("");
  const [showAiTailModal, setShowAiTailModal] = useState(false);
  const [aiTailLoading, setAiTailLoading] = useState(false);
  const [aiTails, setAiTails] = useState<string[]>([]);
  const [selectedAiTails, setSelectedAiTails] = useState<number[]>([]);
  const [aiWriting, setAiWriting] = useState<"first" | "final" | null>(null);

  // 학교 자동 선택 (첫 학교)
  useEffect(() => {
    if (allSchools.length > 0 && !selSchool) {
      setSelSchool(allSchools[0]);
    }
  }, [allSchools, selSchool]);

  useEffect(() => {
    setShowAiPanel(false);
    setAiData(null);
    setFeedback({});
  }, [selQId]);

  useEffect(() => {
    if (!selAnswer) return;
    setFeedback({
      [String(selAnswer.id)]: selFeedback?.teacher_first_feedback || "",
      [`${selAnswer.id}_final`]: selFeedback?.teacher_final_feedback || "",
    });
  }, [
    selAnswer?.id,
    selFeedback?.teacher_first_feedback,
    selFeedback?.teacher_final_feedback,
  ]);

  const saveFirstFb = useSavePastFirstFeedback();
  const saveFinalFb = useSavePastFinalFeedback();
  const updateTails = useUpdatePastTails();

  const answeredCount = questions.filter((q) => answerByQuestionId[q.id]?.answer).length;

  const getStep = (answer: any, fb: any) => {
    if (!answer?.answer) return 0;
    if (!fb?.teacher_first_feedback) return 1;
    if (!answer.upgraded_answer) return 2;
    if (!fb?.teacher_final_feedback) return 3;
    return 4;
  };

  const openAiAnalysis = (tab: "first" | "second" = "first") => {
    setShowAiPanel(true);
    setAiTab(tab);
    if (tab === "first") {
      setAiLoading(true);
      setAiData(null);
      setTimeout(() => {
        setAiData(AI_ANALYSIS_MOCK);
        setAiLoading(false);
      }, 1200);
    } else {
      setSecondAiLoading(true);
      setTimeout(() => {
        setSecondAiLoading(false);
      }, 1200);
    }
  };

  const writeAiTeacherFeedback = (type: "first" | "final") => {
    if (!selAnswer) return;
    setAiWriting(type);
    setTimeout(() => {
      if (type === "first") {
        setFeedback((prev) => ({
          ...prev,
          [String(selAnswer.id)]: AI_ANALYSIS_MOCK.teacherFirstFeedback,
        }));
      } else {
        setFeedback((prev) => ({
          ...prev,
          [`${selAnswer.id}_final`]: AI_ANALYSIS_MOCK.teacherFinalFeedback,
        }));
      }
      setAiWriting(null);
      setShowAiPanel(false);
    }, 1000);
  };

  const handleSendFirstFb = async () => {
    if (!selAnswer) return;
    const text = feedback[String(selAnswer.id)] || "";
    if (!text.trim()) return;
    try {
      await saveFirstFb.mutateAsync({
        answer_id: selAnswer.id,
        teacher_first_feedback: text,
      });
      alert("✅ 1차 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  const handleSendFinalFb = async () => {
    if (!selAnswer) return;
    const text = feedback[`${selAnswer.id}_final`] || "";
    if (!text.trim()) return;
    try {
      await saveFinalFb.mutateAsync({
        answer_id: selAnswer.id,
        teacher_final_feedback: text,
      });
      alert("✅ 최종 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  const handleAddTail = async () => {
    if (!tailInput.trim() || !selAnswer) return;
    const currentTails = selFeedback?.tail_questions || [];
    const newTails = [...currentTails, { text: tailInput.trim() }];
    try {
      await updateTails.mutateAsync({
        answer_id: selAnswer.id,
        tail_questions: newTails,
      });
      setTailInput("");
      setShowTailModal(false);
    } catch (e: any) {
      alert(`추가 실패: ${e.message}`);
    }
  };

  const openAiTailModal = () => {
    setShowAiTailModal(true);
    setAiTailLoading(true);
    setAiTails([]);
    setSelectedAiTails([]);
    setTimeout(() => {
      setAiTails(AI_ANALYSIS_MOCK.tailSuggestions);
      setAiTailLoading(false);
    }, 1200);
  };

  const deliverAiTails = async () => {
    if (!selAnswer || selectedAiTails.length === 0) return;
    const newTails = selectedAiTails.map((i) => ({ text: aiTails[i] }));
    const currentTails = selFeedback?.tail_questions || [];
    try {
      await updateTails.mutateAsync({
        answer_id: selAnswer.id,
        tail_questions: [...currentTails, ...newTails],
      });
      setShowAiTailModal(false);
      setAiTails([]);
      setSelectedAiTails([]);
    } catch (e: any) {
      alert(`추가 실패: ${e.message}`);
    }
  };

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

  const secondData = aiData?.second || null;

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent;
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`;
  };
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#E5E7EB";
    e.target.style.boxShadow = "none";
  };

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* ==================== ⭐ 학교 버튼 칩 (고등 스타일) ==================== */}
      {allSchools.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl px-6 py-10 text-center flex-shrink-0">
          <div className="text-3xl mb-2">🏫</div>
          <div className="text-[14px] font-bold text-ink-secondary mb-1">
            이 학생은 아직 기출문제를 풀지 않았어요
          </div>
          <div className="text-[12px] font-medium text-ink-muted">
            학생이 답변을 작성하면 여기에 학교가 표시돼요
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          {allSchools.map((school) => {
            const isSelected = selSchool === school;
            return (
              <button
                key={school}
                onClick={() => {
                  setSelSchool(school);
                  setSelQId(null);
                  setShowAiPanel(false);
                }}
                className="px-4 py-2 rounded-full text-[13px] font-bold transition-all hover:-translate-y-px"
                style={{
                  background: isSelected ? THEME.accent : "#fff",
                  color: isSelected ? "#fff" : THEME.accentDark,
                  border: `1px solid ${isSelected ? THEME.accent : THEME.accentBorder}`,
                  boxShadow: isSelected
                    ? `0 4px 12px ${THEME.accentShadow}`
                    : "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                🎓 {school}
              </button>
            );
          })}
        </div>
      )}

      {/* ==================== 메인 ==================== */}
      {selSchool && (
        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* 왼쪽: 질문 목록 */}
          <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-3 border-b border-line flex-shrink-0">
              <div className="text-[13.5px] font-extrabold text-ink tracking-tight">
                🎓 {selSchool}
              </div>
              <div className="text-[11px] font-medium text-ink-secondary mt-1">
                총 <span className="font-bold" style={{ color: THEME.accent }}>{questions.length}개</span>
                {" · "}
                답변완료 <span className="font-bold" style={{ color: THEME.accent }}>{answeredCount}개</span>
                {" · "}
                미답변 <span className="font-bold text-amber-600">{questions.length - answeredCount}개</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {questions.length === 0 ? (
                <div className="text-center py-10 text-ink-muted">
                  <div className="text-3xl mb-2">📝</div>
                  <div className="text-[12px] font-medium">기출문제가 없어요.</div>
                </div>
              ) : (
                questions.map((q, i) => {
                  const tc = TYPE_COLOR[q.type] || TYPE_COLOR["공통"];
                  const isSelected = selQId === q.id;
                  const ans = answerByQuestionId[q.id];
                  const answered = !!ans?.answer;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelQId(q.id)}
                      className="w-full rounded-xl px-3.5 py-3 mb-1.5 text-left transition-all"
                      style={{
                        border: `1px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                        background: isSelected ? THEME.accentBg : "#fff",
                        boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : "none",
                      }}
                    >
                      <div className="flex gap-1.5 mb-1.5 flex-wrap">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            color: THEME.accentDark,
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}60`,
                          }}
                        >
                          Q{i + 1}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: tc.bg,
                            color: tc.color,
                            border: `1px solid ${tc.border}60`,
                          }}
                        >
                          {q.type}
                        </span>
                      </div>
                      <div
                        className="text-[12.5px] font-semibold leading-[1.5] mb-1.5"
                        style={{ color: isSelected ? THEME.accentDark : "#1a1a1a" }}
                      >
                        {q.text}
                      </div>
                      {answered ? (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            color: THEME.accent,
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}60`,
                          }}
                        >
                          ✓ 답변완료
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ⏳ 미답변
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 가운데: 피드백 */}
          <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            {!selQ ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                <div className="text-4xl">🎓</div>
                <div className="text-[14px] font-bold text-ink-secondary">질문을 선택해주세요</div>
                <div className="text-[12px] font-medium">왼쪽에서 기출문제를 클릭하세요</div>
              </div>
            ) : (
              <>
                {/* 헤더 */}
                <div className="px-5 py-4 border-b border-line flex-shrink-0">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[13px] font-extrabold text-ink">
                        Q{questions.findIndex((q) => q.id === selQ.id) + 1}
                      </div>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: THEME.accentDark,
                          background: THEME.accentBg,
                          border: `1px solid ${THEME.accentBorder}60`,
                        }}
                      >
                        🏫 {selSchool}
                      </span>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: (TYPE_COLOR[selQ.type] || TYPE_COLOR["공통"]).bg,
                          color: (TYPE_COLOR[selQ.type] || TYPE_COLOR["공통"]).color,
                          border: `1px solid ${(TYPE_COLOR[selQ.type] || TYPE_COLOR["공통"]).border}60`,
                        }}
                      >
                        {selQ.type}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      {selAnswer?.answer && (
                        <button
                          onClick={() => {
                            if (showAiPanel) {
                              setShowAiPanel(false);
                              setAiData(null);
                            } else openAiAnalysis("first");
                          }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                          style={{
                            background: showAiPanel ? THEME.accent : "#fff",
                            color: showAiPanel ? "#fff" : THEME.accent,
                            border: `1px solid ${THEME.accent}`,
                            boxShadow: showAiPanel ? `0 4px 12px ${THEME.accentShadow}` : "none",
                          }}
                        >
                          ✨ AI 분석 {showAiPanel ? "닫기" : "보기"}
                        </button>
                      )}
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: selAnswer?.answer ? THEME.accentBg : "#FEF3C7",
                          color: selAnswer?.answer ? THEME.accentDark : "#92400E",
                          border: `1px solid ${selAnswer?.answer ? THEME.accentBorder : "#FCD34D"}60`,
                        }}
                      >
                        {selAnswer?.answer ? "✓ 답변완료" : "⏳ 미답변"}
                      </span>
                    </div>
                  </div>

                  {/* 5단계 */}
                  <div className="flex">
                    {STEP_LABELS.map((label, i) => {
                      const step = getStep(selAnswer, selFeedback);
                      const stepNum = i + 1;
                      const isDone = stepNum < step;
                      const isOn = stepNum === step;
                      const active = isDone || isOn;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                          {i < 4 && (
                            <div
                              className="absolute top-[11px] left-[55%] w-[90%] h-px"
                              style={{ background: isDone ? THEME.accent : "#E5E7EB" }}
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
                            style={{ color: active ? THEME.accentDark : "#9CA3AF" }}
                          >
                            {label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 바디 */}
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                  <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                      📌 기출 질문
                    </div>
                    <div className="text-[14px] font-bold text-ink leading-[1.6]">{selQ.text}</div>
                  </div>

                  <div className="bg-white border border-line rounded-xl px-5 py-4">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-3">
                      📜 답변 · 피드백 히스토리
                    </div>
                    <div className="flex flex-col gap-3.5">
                      {/* Step 1 */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">
                            Step 1
                          </span>
                          <span className="text-[11px] font-bold text-ink-secondary">👤 학생 첫 답변</span>
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
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span
                              className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                              style={{ background: THEME.accent }}
                            >
                              Step 2
                            </span>
                            <span className="text-[11px] font-bold text-ink-secondary">💬 선생님 1차 피드백</span>
                          </div>
                          <textarea
                            value={feedback[String(selAnswer.id)] || ""}
                            onChange={(e) =>
                              setFeedback((prev) => ({
                                ...prev,
                                [String(selAnswer.id)]: e.target.value,
                              }))
                            }
                            placeholder="학생 답변에 대한 피드백을 작성해주세요..."
                            rows={3}
                            className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                            onFocus={handleTextareaFocus}
                            onBlur={handleTextareaBlur}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={handleSendFirstFb}
                              disabled={!(feedback[String(selAnswer.id)] || "").trim() || saveFirstFb.isPending}
                              className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                              style={{
                                background:
                                  (feedback[String(selAnswer.id)] || "").trim() && !saveFirstFb.isPending
                                    ? THEME.accent
                                    : "#E5E7EB",
                                color:
                                  (feedback[String(selAnswer.id)] || "").trim() && !saveFirstFb.isPending
                                    ? "#fff"
                                    : "#9CA3AF",
                                boxShadow:
                                  (feedback[String(selAnswer.id)] || "").trim() && !saveFirstFb.isPending
                                    ? `0 4px 12px ${THEME.accentShadow}`
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
                        <div>
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">
                                Step 3
                              </span>
                              <span className="text-[11px] font-bold text-ink-secondary">👤 학생 업그레이드 답변</span>
                            </div>
                            {selAnswer?.upgraded_answer && (
                              <button
                                onClick={() => {
                                  if (showAiPanel && aiTab === "second") {
                                    setShowAiPanel(false);
                                    setAiData(null);
                                  } else openAiAnalysis("second");
                                }}
                                className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
                                style={{
                                  background: showAiPanel && aiTab === "second" ? THEME.accent : "#fff",
                                  color: showAiPanel && aiTab === "second" ? "#fff" : THEME.accent,
                                  border: `1px solid ${THEME.accent}`,
                                }}
                              >
                                ✨ 2차 AI 분석 {showAiPanel && aiTab === "second" ? "닫기" : "보기"}
                              </button>
                            )}
                          </div>
                          {selAnswer?.upgraded_answer ? (
                            <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                              {selAnswer.upgraded_answer}
                            </div>
                          ) : (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-4 text-[12px] font-medium text-amber-700 text-center">
                              ⏳ 학생이 업그레이드 답변을 작성중이에요
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 4 */}
                      {selAnswer?.upgraded_answer && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span
                              className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                              style={{ background: THEME.accent }}
                            >
                              Step 4
                            </span>
                            <span className="text-[11px] font-bold text-ink-secondary">💬 선생님 최종 피드백</span>
                          </div>
                          <textarea
                            value={feedback[`${selAnswer.id}_final`] || ""}
                            onChange={(e) =>
                              setFeedback((prev) => ({
                                ...prev,
                                [`${selAnswer.id}_final`]: e.target.value,
                              }))
                            }
                            placeholder="업그레이드된 답변에 대한 최종 피드백을 작성해주세요..."
                            rows={3}
                            className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                            onFocus={handleTextareaFocus}
                            onBlur={handleTextareaBlur}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={handleSendFinalFb}
                              disabled={!(feedback[`${selAnswer.id}_final`] || "").trim() || saveFinalFb.isPending}
                              className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                              style={{
                                background:
                                  (feedback[`${selAnswer.id}_final`] || "").trim() && !saveFinalFb.isPending
                                    ? THEME.accent
                                    : "#E5E7EB",
                                color:
                                  (feedback[`${selAnswer.id}_final`] || "").trim() && !saveFinalFb.isPending
                                    ? "#fff"
                                    : "#9CA3AF",
                                boxShadow:
                                  (feedback[`${selAnswer.id}_final`] || "").trim() && !saveFinalFb.isPending
                                    ? `0 4px 12px ${THEME.accentShadow}`
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
                        <div>
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            <span
                              className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                              style={{ background: THEME.accent }}
                            >
                              Step 5
                            </span>
                            <span className="text-[11px] font-bold text-ink-secondary">🔗 꼬리질문</span>
                            <div className="ml-auto flex gap-1.5">
                              <button
                                onClick={() => setShowTailModal(true)}
                                className="px-2.5 py-1 bg-white border rounded-md text-[11px] font-bold transition-all hover:-translate-y-px"
                                style={{ color: THEME.accent, borderColor: THEME.accent }}
                              >
                                ➕ 직접 추가
                              </button>
                              <button
                                onClick={openAiTailModal}
                                className="px-2.5 py-1 text-white rounded-md text-[11px] font-bold transition-all hover:-translate-y-px"
                                style={{ background: THEME.accent, boxShadow: `0 2px 6px ${THEME.accentShadow}` }}
                              >
                                ✨ AI 생성
                              </button>
                            </div>
                          </div>
                          {!selFeedback?.tail_questions || selFeedback.tail_questions.length === 0 ? (
                            <div className="text-[12px] font-medium text-ink-muted text-center py-3 bg-gray-50 rounded-lg">
                              꼬리질문이 없어요.
                            </div>
                          ) : (
                            selFeedback.tail_questions.map((t: any, i: number) => (
                              <div
                                key={i}
                                className="rounded-lg px-3 py-2.5 mb-1.5"
                                style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                              >
                                <div className="flex items-start gap-2 mb-1.5">
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                    style={{ color: "#fff", background: THEME.accent }}
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
                                  <div className="mt-2 pt-2 border-t" style={{ borderColor: THEME.accentBorder + "60" }}>
                                    <div className="text-[10px] font-bold text-ink-muted mb-1">👤 학생 답변</div>
                                    <div className="text-[12px] font-medium text-ink leading-[1.6] whitespace-pre-wrap bg-white rounded p-2">
                                      {t.answer}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== AI 분석 사이드 패널 ==================== */}
      {showAiPanel && selQ && (
        <div className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-line flex flex-col shadow-[-8px_0_24px_rgba(15,23,42,0.08)] z-50">
          <div className="px-4 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">✨ AI 분석</div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                🏫 {selSchool} · Q{questions.findIndex((q) => q.id === selQ.id) + 1}
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
              {!selAnswer?.upgraded_answer && <div className="text-[9px]">업그레이드 필요</div>}
            </button>
          </div>

          {/* 1차 분석 */}
          {aiTab === "first" &&
            (aiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted">
                <div className="text-3xl animate-pulse">✨</div>
                <div className="text-[13px] font-medium">AI가 답변을 분석 중이에요...</div>
              </div>
            ) : !aiData ? (
              <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px] font-medium">
                분석 데이터가 없어요.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                <div
                  className="rounded-xl px-4 py-3.5"
                  style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">✅</span>
                    <div className="text-[13px] font-extrabold" style={{ color: THEME.accentDark }}>
                      답변 정합성 분석
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-ink-secondary mb-3">
                    작성하신 답변을 학교별 핵심 평가 기준에 맞춰 분석한 결과입니다.
                  </div>

                  {selQ.evaluation_criteria && selQ.evaluation_criteria.length > 0 && (
                    <>
                      <div className="h-[240px] mb-2 bg-white rounded-lg p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            data={getRadarData(selQ.evaluation_criteria)}
                            margin={{ top: 24, right: 40, bottom: 24, left: 40 }}
                          >
                            <PolarGrid stroke="#E5E7EB" />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={{ fontSize: 11, fill: "#374151", fontWeight: 600 }}
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
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: THEME.accent }} />
                          학생 답변
                        </div>
                      </div>
                    </>
                  )}

                  {getBarData(aiData).map((d: any, i: number) => (
                    <div key={i} className="mb-2.5 bg-white rounded-lg px-3 py-2">
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="font-semibold text-ink">{d.name}</span>
                        <span className="font-bold" style={{ color: THEME.accent }}>
                          {d.score}/{d.max}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${d.pct}%`,
                            background: d.pct >= 80 ? THEME.accent : d.pct >= 60 ? "#F97316" : "#EF4444",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">📊</span>
                    <div className="text-[13px] font-extrabold text-ink">AI 종합 분석</div>
                  </div>

                  <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 mb-3 mt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                      🏫 {selSchool} 면접 평가 기준
                    </div>
                    <div className="text-[12px] font-medium text-ink leading-[1.7]">{aiData.evalCriteria}</div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 mt-2 mb-3">
                    <div className="text-[11px] font-bold text-orange-800 mb-1">📌 평가 요약</div>
                    <div className="text-[12px] font-medium text-orange-900 leading-[1.7]">{aiData.summary}</div>
                  </div>

                  <div className="mb-3">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: THEME.accent }}>
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

                <div className="bg-white rounded-xl px-4 py-3.5 border-2" style={{ borderColor: THEME.accent }}>
                  <div
                    className="text-[11px] font-extrabold uppercase tracking-wider mb-1"
                    style={{ color: THEME.accent }}
                  >
                    ✨ AI 자동 작성
                  </div>
                  <div className="text-[11px] text-ink-secondary mb-2.5 leading-[1.6]">
                    위 분석을 바탕으로 선생님 말투의 1차 피드백을 자동으로 작성해드릴게요. 클릭하면 작성창에 자동 입력돼요.
                  </div>
                  <button
                    onClick={() => writeAiTeacherFeedback("first")}
                    disabled={aiWriting === "first" || !selAnswer}
                    className="w-full h-10 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px disabled:cursor-not-allowed"
                    style={{
                      background: aiWriting === "first" ? "#9CA3AF" : THEME.accent,
                      boxShadow: aiWriting === "first" ? "none" : `0 4px 12px ${THEME.accentShadow}`,
                    }}
                  >
                    {aiWriting === "first" ? "✨ 작성 중..." : "✏️ 선생님 1차 답변 작성하기"}
                  </button>
                </div>
              </div>
            ))}

          {/* 2차 분석 */}
          {aiTab === "second" &&
            (secondAiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted">
                <div className="text-3xl animate-pulse">✨</div>
                <div className="text-[13px] font-medium">AI가 2차 답변을 분석 중...</div>
              </div>
            ) : !secondData ? (
              <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px] font-medium">
                2차 분석 데이터가 없어요.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                <div
                  className="rounded-xl px-4 py-3.5"
                  style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">📊</span>
                    <div className="text-[13px] font-extrabold" style={{ color: THEME.accentDark }}>
                      1차 vs 2차 평가요소 분포
                    </div>
                  </div>
                  {secondData.beforeDistribution.map((b: any, i: number) => {
                    const after = secondData.afterDistribution.find((a: any) => a.factorCode === b.factorCode);
                    const diff = (after?.distribution || 0) - b.distribution;
                    return (
                      <div key={i} className="mb-3 bg-white rounded-lg px-3 py-2.5">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[12px] font-bold text-ink">{b.factorName}</span>
                          <span
                            className="text-[11px] font-extrabold"
                            style={{
                              color: diff > 0 ? THEME.accent : diff < 0 ? "#EF4444" : "#6B7280",
                            }}
                          >
                            {diff > 0 ? `▲ +${diff}%` : diff < 0 ? `▼ ${diff}%` : "변동없음"}
                          </span>
                        </div>
                        <div className="mb-1">
                          <div className="text-[10px] font-semibold text-ink-muted mb-0.5">
                            1차 · {b.distribution}%
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${b.distribution}%`, background: "#A7F3D0" }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold text-ink-muted mb-0.5">
                            2차 · {after?.distribution || 0}%
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${after?.distribution || 0}%`, background: THEME.accent }}
                            />
                          </div>
                        </div>
                        {after?.evidence && (
                          <div className="text-[11px] font-medium text-ink-secondary mt-1.5 leading-[1.5]">
                            → {after.evidence}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">🏗️</span>
                    <div className="text-[13px] font-extrabold text-ink">구조 코멘트</div>
                  </div>
                  <div
                    className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8]"
                    style={{
                      background: THEME.accentBg,
                      border: `1px solid ${THEME.accentBorder}60`,
                      color: THEME.accentDark,
                    }}
                  >
                    {secondData.structureComment}
                  </div>
                </div>

                <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">🎤</span>
                    <div className="text-[13px] font-extrabold text-ink">연습 답변</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.9] italic">
                    "{secondData.practiceAnswer}"
                  </div>
                </div>

                <div className="bg-white rounded-xl px-4 py-3.5 border-2" style={{ borderColor: THEME.accent }}>
                  <div
                    className="text-[11px] font-extrabold uppercase tracking-wider mb-1"
                    style={{ color: THEME.accent }}
                  >
                    ✨ AI 자동 작성
                  </div>
                  <div className="text-[11px] text-ink-secondary mb-2.5 leading-[1.6]">
                    위 분석을 바탕으로 선생님 말투의 최종 피드백을 자동으로 작성해드릴게요. 클릭하면 작성창에 자동 입력돼요.
                  </div>
                  <button
                    onClick={() => writeAiTeacherFeedback("final")}
                    disabled={aiWriting === "final" || !selAnswer}
                    className="w-full h-10 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px disabled:cursor-not-allowed"
                    style={{
                      background: aiWriting === "final" ? "#9CA3AF" : THEME.accent,
                      boxShadow: aiWriting === "final" ? "none" : `0 4px 12px ${THEME.accentShadow}`,
                    }}
                  >
                    {aiWriting === "final" ? "✨ 작성 중..." : "✏️ 선생님 최종 답변 작성하기"}
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ==================== 꼬리질문 직접 추가 모달 ==================== */}
      {showTailModal && (
        <div
          onClick={() => setShowTailModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[460px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-[18px] font-extrabold text-ink mb-1">➕ 꼬리질문 추가</div>
            <div className="text-[12px] font-medium text-ink-secondary mb-4">
              학생에게 추가로 물어볼 꼬리질문을 작성해요.
            </div>
            <textarea
              value={tailInput}
              onChange={(e) => setTailInput(e.target.value)}
              placeholder="꼬리질문을 입력해주세요..."
              rows={4}
              autoFocus
              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-none leading-[1.7] mb-4 transition-all placeholder:text-ink-muted"
              onFocus={handleTextareaFocus}
              onBlur={handleTextareaBlur}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowTailModal(false);
                  setTailInput("");
                }}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddTail}
                disabled={!tailInput.trim() || updateTails.isPending}
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                style={{
                  background: tailInput.trim() && !updateTails.isPending ? THEME.accent : "#E5E7EB",
                  color: tailInput.trim() && !updateTails.isPending ? "#fff" : "#9CA3AF",
                  boxShadow:
                    tailInput.trim() && !updateTails.isPending ? `0 4px 12px ${THEME.accentShadow}` : "none",
                }}
              >
                {updateTails.isPending ? "추가 중..." : "📤 추가하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== AI 꼬리질문 모달 ==================== */}
      {showAiTailModal && (
        <div
          onClick={() => setShowAiTailModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[500px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-[18px] font-extrabold text-ink mb-1">✨ AI 꼬리질문 생성</div>
            <div className="text-[12px] font-medium text-ink-secondary mb-5">
              AI가 답변 내용을 분석해서 꼬리질문을 만들었어요. 전달할 것을 선택하세요.
            </div>

            {aiTailLoading ? (
              <div className="text-center py-10 text-ink-muted text-[13px] font-medium">
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                AI가 꼬리질문을 생성 중이에요...
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {aiTails.map((t, i) => {
                  const isSelected = selectedAiTails.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() =>
                        setSelectedAiTails((prev) =>
                          prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
                        )
                      }
                      className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-left transition-all"
                      style={{
                        border: `1px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                        background: isSelected ? THEME.accentBg : "#fff",
                        boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : "none",
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                        style={{
                          border: `1.5px solid ${isSelected ? THEME.accent : "#D1D5DB"}`,
                          background: isSelected ? THEME.accent : "#fff",
                        }}
                      >
                        {isSelected && <span className="text-[11px] text-white font-bold">✓</span>}
                      </div>
                      <span
                        className="text-[13px] font-medium leading-[1.6]"
                        style={{ color: isSelected ? THEME.accentDark : "#1a1a1a" }}
                      >
                        {t}
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
                disabled={selectedAiTails.length === 0 || aiTailLoading || updateTails.isPending}
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                style={{
                  background: selectedAiTails.length > 0 && !updateTails.isPending ? THEME.accent : "#E5E7EB",
                  color: selectedAiTails.length > 0 && !updateTails.isPending ? "#fff" : "#9CA3AF",
                  boxShadow:
                    selectedAiTails.length > 0 && !updateTails.isPending
                      ? `0 4px 12px ${THEME.accentShadow}`
                      : "none",
                }}
              >
                {updateTails.isPending ? "전달 중..." : `📤 ${selectedAiTails.length}개 전달`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}