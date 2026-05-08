import { useState, useEffect } from "react";
import {
  useStudentEssays,
  useStudentEssayFeedback,
  useStudentEssayAnswers,
  useAddSectionFeedback,
  useUpdateSectionFeedback,
  useDeleteSectionFeedback,
  useStudentQuestions,
  useStudentQuestionFeedback,
  useSaveFirstFeedback,
  useSaveFinalFeedback,
  useUpdateTailQuestions,
  useApproveDeleteEssay,
  useRejectDeleteRequest,
} from "@/pages/admin/_hooks/middle/useStudentExpect";
// ⭐ AI Edge Function hook
import {
  useAnalyzeSection,
  useGenerateQuestionsAi,
  useAnalyzeAnswer,
  type SectionAnalysisResult,
} from "@/pages/admin/_hooks/middle/useAiEssay";
import { supabase } from "@/lib/supabase";

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

// ⭐ 자소서 섹션 — 4개로 단순화 (selfStudy 제거, AI는 4개 항목만 분석)
const SECTIONS = [
  { key: "selfStudy", label: "📚 자기주도학습 과정", aiKey: null },
  { key: "reason", label: "🏫 지원동기 (건학이념 연계)", aiKey: "지원동기" },
  { key: "activity", label: "🎯 꿈과 끼를 살리기 위한 활동계획", aiKey: "활동계획" },
  { key: "career", label: "🚀 진로계획", aiKey: "진로계획" },
  { key: "character", label: "🤝 인성", aiKey: "인성" },
];

const AI_TAIL_SUGGESTIONS = [
  "그 경험에서 가장 어려웠던 점은 무엇이었나요?",
  "만약 다시 같은 상황이 온다면 어떻게 다르게 행동하시겠어요?",
  "이 활동이 본인의 진로 선택에 어떤 영향을 미쳤나요?",
];

export default function MiddleExpectTab({ student }: { student: any }) {
  const studentId = student?.id ? String(student.id) : undefined;
  const { data: essays = [], isLoading } = useStudentEssays(studentId);

  const [activeTab, setActiveTab] = useState<"essay" | "questions">("essay");

  const [selEssayId, setSelEssayId] = useState<string | null>(null);
  const selEssay = essays.find((e) => e.id === selEssayId) ?? null;

  useEffect(() => {
    if (!selEssayId && essays.length > 0) {
      setSelEssayId(essays[0].id);
    }
  }, [essays.length, selEssayId]);

  const { data: sectionFeedbacks = [] } = useStudentEssayFeedback(
    selEssayId ?? undefined,
  );

  const { data: essayAnswers = [] } = useStudentEssayAnswers(
    selEssayId ?? undefined,
  );

  const answersBySection = essayAnswers.reduce(
    (acc: Record<string, any[]>, a) => {
      if (!acc[a.section_key]) acc[a.section_key] = [];
      acc[a.section_key].push(a);
      return acc;
    },
    {},
  );

  const feedbackBySection = sectionFeedbacks.reduce(
    (acc: Record<string, any[]>, fb) => {
      if (!acc[fb.section_key]) acc[fb.section_key] = [];
      acc[fb.section_key].push(fb);
      return acc;
    },
    {},
  );

  const [newSectionFbs, setNewSectionFbs] = useState<Record<string, string>>(
    {},
  );
  const [editingSection, setEditingSection] = useState<{
    key: string;
    id: string;
  } | null>(null);
  const [editingText, setEditingText] = useState("");

  const addSectionFb = useAddSectionFeedback();
  const updateSectionFb = useUpdateSectionFeedback();
  const deleteSectionFb = useDeleteSectionFeedback();

  // ⭐ AI Edge Function hooks
  const analyzeSection = useAnalyzeSection();
  const generateQuestionsAi = useGenerateQuestionsAi();
  const analyzeAnswer = useAnalyzeAnswer();

  // ⭐ AI 분석 결과 캐시 (섹션별)
  const [aiResults, setAiResults] = useState<Record<string, SectionAnalysisResult>>({});
  // ⭐ 예상질문 답변 분석 결과 (질문 ID별)
  const [qaiResults, setQaiResults] = useState<Record<string, SectionAnalysisResult>>({});

  // 예상질문 탭
  const [selSchoolFilter, setSelSchoolFilter] = useState<string>("");
  const [selQId, setSelQId] = useState<string | null>(null);

  const filterEssay = essays.find((e) => e.school === selSchoolFilter);
  const { data: questions = [] } = useStudentQuestions(filterEssay?.id);

  useEffect(() => {
    if (!selSchoolFilter) {
      const generated = essays.find((e) => e.questions_generated);
      if (generated) {
        setSelSchoolFilter(generated.school);
      }
    }
  }, [essays, selSchoolFilter]);

  const selQ = questions.find((q) => q.id === selQId) ?? null;
  const { data: selQFeedback } = useStudentQuestionFeedback(
    selQId ?? undefined,
  );

  const [teacherFbText, setTeacherFbText] = useState("");
  const [finalFbText, setFinalFbText] = useState("");

  useEffect(() => {
    setTeacherFbText(selQFeedback?.teacher_first_feedback || "");
    setFinalFbText(selQFeedback?.teacher_final_feedback || "");
  }, [
    selQId,
    selQFeedback?.teacher_first_feedback,
    selQFeedback?.teacher_final_feedback,
  ]);

  const [showAiTailModal, setShowAiTailModal] = useState(false);
  const [aiTailLoading, setAiTailLoading] = useState(false);
  const [newTailText, setNewTailText] = useState("");

  // AI 분석 사이드 패널
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPanelSection, setAiPanelSection] = useState<string>("");
  // ⭐ 예상질문 답변용 사이드 패널
  const [showQAiPanel, setShowQAiPanel] = useState(false);
  const [qAiPanelKey, setQAiPanelKey] = useState<string>(""); // selQ.id 또는 selQ.id_upgrade

  const saveFirstFb = useSaveFirstFeedback();
  const saveFinalFb = useSaveFinalFeedback();
  const updateTails = useUpdateTailQuestions();

  const approveDelete = useApproveDeleteEssay();
  const rejectDelete = useRejectDeleteRequest();

  const handleApproveDelete = async () => {
    if (!selEssay) return;
    if (
      !confirm(
        `'${selEssay.school}' 자소서를 영구 삭제할까요?\n\n자소서, 모든 답변, 피드백, 예상질문이 삭제됩니다.\n이 작업은 되돌릴 수 없어요.`,
      )
    )
      return;
    try {
      await approveDelete.mutateAsync(selEssay.id);
      setSelEssayId(null);
      alert("✅ 자소서가 삭제되었어요.");
    } catch (e: any) {
      alert(`삭제 실패: ${e.message}`);
    }
  };

  const handleRejectDelete = async () => {
    if (!selEssay) return;
    if (!confirm("학생의 삭제 요청을 거부할까요?")) return;
    try {
      await rejectDelete.mutateAsync(selEssay.id);
      alert("✅ 삭제 요청을 거부했어요.");
    } catch (e: any) {
      alert(`거부 실패: ${e.message}`);
    }
  };

  const countChars = (content: any) =>
    Object.values(content || {})
      .join("")
      .replace(/\s/g, "").length;

  const getStep = (q: any, fb: any) => {
    if (!q?.answer) return 0;
    if (!fb?.teacher_first_feedback) return 1;
    if (!q.upgraded_answer) return 2;
    if (!fb?.teacher_final_feedback) return 3;
    return 4;
  };

  const handleAddSectionFb = async (key: string) => {
    const text = newSectionFbs[key] || "";
    if (!text.trim() || !selEssay) return;
    try {
      await addSectionFb.mutateAsync({
        essay_id: selEssay.id,
        section_key: key,
        text,
      });
      setNewSectionFbs((prev) => ({ ...prev, [key]: "" }));
    } catch (e: any) {
      alert(`피드백 저장 실패: ${e.message}`);
    }
  };

  const handleUpdateSectionFb = async () => {
    if (!editingText.trim() || !editingSection) return;
    try {
      await updateSectionFb.mutateAsync({
        feedback_id: editingSection.id,
        text: editingText,
      });
      setEditingSection(null);
      setEditingText("");
    } catch (e: any) {
      alert(`수정 실패: ${e.message}`);
    }
  };

  const handleDeleteSectionFb = async (id: string) => {
    if (!confirm("이 피드백을 삭제할까요?")) return;
    try {
      await deleteSectionFb.mutateAsync(id);
    } catch (e: any) {
      alert(`삭제 실패: ${e.message}`);
    }
  };

  // ⭐ 예상질문 생성 — 진짜 AI Edge Function 호출
  const handleGenerateQuestions = async () => {
    if (!selEssay) return;
    if (!selEssay.content) {
      alert("자소서 내용이 없어요.");
      return;
    }

    try {
      // 1. AI Edge Function 호출
      const generated = await generateQuestionsAi.mutateAsync({
        schoolName: selEssay.school,
        studentName: student?.name,
        sections: {
          지원동기: selEssay.content.reason || "",
          활동계획: selEssay.content.activity || "",
          진로계획: selEssay.content.career || "",
          인성: selEssay.content.character || "",
        },
        count: 8,
      });

      if (!generated || generated.length === 0) {
        alert("질문 생성 실패. 다시 시도해주세요.");
        return;
      }

      // 2. DB에 INSERT
      const rows = generated.map((q, idx) => ({
        essay_id: selEssay.id,
        question_index: idx,
        text: q.text,
        tag: q.tag,
        purpose: q.purpose,
      }));

      const { error: insertError } = await supabase
        .from("jaso_questions")
        .insert(rows);

      if (insertError) throw insertError;

      // 3. 자소서 questions_generated = true
      const { error: updateError } = await supabase
        .from("jaso_essays")
        .update({ questions_generated: true })
        .eq("id", selEssay.id);

      if (updateError) throw updateError;

      setSelSchoolFilter(selEssay.school);
      setActiveTab("questions");
      alert(`✅ 예상질문 ${generated.length}개가 AI로 생성되었어요!`);

      // 페이지 새로고침으로 강제 데이터 재조회
      window.location.reload();
    } catch (e: any) {
      console.error("질문 생성 실패:", e);
      alert(`질문 생성 실패: ${e.message}`);
    }
  };

  const handleSendFirstFb = async () => {
    if (!teacherFbText.trim() || !selQ) return;
    try {
      await saveFirstFb.mutateAsync({
        question_id: selQ.id,
        teacher_first_feedback: teacherFbText,
      });
      alert("✅ 1차 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  const handleSendFinalFb = async () => {
    if (!finalFbText.trim() || !selQ) return;
    try {
      await saveFinalFb.mutateAsync({
        question_id: selQ.id,
        teacher_final_feedback: finalFbText,
      });
      alert("✅ 최종 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  const handleAddTail = async (text: string) => {
    if (!text.trim() || !selQ) return;
    const currentTails = selQFeedback?.tail_questions || [];
    const newTails = [...currentTails, { text }];
    try {
      await updateTails.mutateAsync({
        question_id: selQ.id,
        tail_questions: newTails,
      });
      setNewTailText("");
    } catch (e: any) {
      alert(`추가 실패: ${e.message}`);
    }
  };

  const handleRemoveTail = async (idx: number) => {
    if (!selQ) return;
    const currentTails = selQFeedback?.tail_questions || [];
    const newTails = currentTails.filter((_: any, i: number) => i !== idx);
    try {
      await updateTails.mutateAsync({
        question_id: selQ.id,
        tail_questions: newTails,
      });
    } catch (e: any) {
      alert(`삭제 실패: ${e.message}`);
    }
  };

  const openAiTailModal = () => {
    setShowAiTailModal(true);
    setAiTailLoading(true);
    setTimeout(() => setAiTailLoading(false), 1200);
  };

  // ⭐ AI 분석 패널 토글 — 진짜 호출
  const toggleAiPanel = async (sectionKey: string) => {
    if (showAiPanel && aiPanelSection === sectionKey) {
      setShowAiPanel(false);
      return;
    }
    setAiPanelSection(sectionKey);
    setShowAiPanel(true);

    // 이미 분석 결과 있으면 그대로 사용
    if (aiResults[sectionKey]) return;

    // 섹션 매핑
    const sectionInfo = SECTIONS.find((s) => s.key === sectionKey);
    if (!sectionInfo?.aiKey) {
      // selfStudy 같은 건 AI 매핑 없음
      return;
    }

    // 학생이 작성한 답변 가져오기
    const sectionAnswers = answersBySection[sectionKey] || [];
    const latestAnswer = sectionAnswers.length > 0
      ? sectionAnswers[sectionAnswers.length - 1]
      : null;

    const answerText = latestAnswer?.content || (selEssay?.content as any)?.[sectionKey] || "";

    if (!answerText || answerText.length < 20) {
      alert("학생이 아직 충분한 답변을 작성하지 않았어요.");
      return;
    }

    try {
      const result = await analyzeSection.mutateAsync({
        schoolName: selEssay?.school || "",
        sectionKey: sectionInfo.aiKey as any,
        sectionLabel: sectionInfo.label,
        answerText,
        studentName: student?.name,
      });
      setAiResults((prev) => ({ ...prev, [sectionKey]: result }));
    } catch (e: any) {
      console.error("AI 분석 실패:", e);
      alert(`AI 분석 실패: ${e.message}`);
      setShowAiPanel(false);
    }
  };

  // ⭐ AI가 작성한 피드백 (teacherDraft) 그대로 textarea에 입력
  const writeAiFeedback = (sectionKey: string) => {
    const result = aiResults[sectionKey];
    if (!result?.teacherDraft) {
      alert("먼저 AI 분석을 받아주세요.");
      return;
    }
    setNewSectionFbs((prev) => ({ ...prev, [sectionKey]: result.teacherDraft }));
  };

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent;
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`;
  };
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#E5E7EB";
    e.target.style.boxShadow = "none";
  };

  const schoolsWithQuestions = essays
    .filter((e) => e.questions_generated)
    .map((e) => e.school);

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      <div className="w-[340px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex border-b border-line flex-shrink-0">
          {[
            { key: "essay", label: "📄 자기소개서" },
            { key: "questions", label: "💬 예상질문" },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className="flex-1 py-3 text-center text-[13px] font-bold transition-all border-b-2"
                style={{
                  color: isActive ? THEME.accentDark : "#9CA3AF",
                  borderColor: isActive ? THEME.accent : "transparent",
                  background: isActive ? THEME.accentBg : "transparent",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === "essay" && (
          <>
            <div className="px-4 py-2.5 border-b border-line flex-shrink-0">
              <div className="text-[12px] font-medium text-ink-secondary">
                총{" "}
                <span className="font-extrabold" style={{ color: THEME.accent }}>
                  {essays.length}개
                </span>{" "}
                학교
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {isLoading ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  <div className="text-2xl mb-2">⏳</div>
                  <div className="font-medium">불러오는 중...</div>
                </div>
              ) : essays.length === 0 ? (
                <div className="text-center py-10 text-ink-muted">
                  <div className="text-3xl mb-2">📄</div>
                  <div className="text-[12px] font-medium mb-1">
                    아직 자소서가 없어요
                  </div>
                  <div className="text-[10px]">
                    학생이 자소서를 추가하면 표시돼요.
                  </div>
                </div>
              ) : (
                essays.map((e) => {
                  const isSelected = selEssayId === e.id;
                  const hasContent = !!e.content?.selfStudy || !!e.content?.reason;

                  return (
                    <button
                      key={e.id}
                      onClick={() => {
                        setSelEssayId(e.id);
                        setNewSectionFbs({});
                        setEditingSection(null);
                        setAiResults({}); // 자소서 바뀌면 AI 분석 캐시 초기화
                      }}
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
                          className="text-[13.5px] font-extrabold tracking-tight flex-1"
                          style={{
                            color: isSelected ? THEME.accentDark : "#1a1a1a",
                          }}
                        >
                          {e.school}
                        </div>
                        {e.version > 1 && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{
                              color: THEME.accent,
                              background: THEME.accentBg,
                            }}
                          >
                            v{e.version}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-medium text-ink-muted mb-1.5">
                        📅 최근수정{" "}
                        {new Date(e.updated_at).toLocaleDateString("ko-KR")}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {hasContent ? (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              color: THEME.accentDark,
                              background: THEME.accentBg,
                              border: `1px solid ${THEME.accentBorder}60`,
                            }}
                          >
                            ✓ 작성 · {countChars(e.content)}자
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            ⏳ 미작성
                          </span>
                        )}
                        {e.questions_generated && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                            ✨ 질문완료
                          </span>
                        )}
                        {e.delete_requested && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                            ⚠️ 삭제 요청
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {activeTab === "questions" && (
          <>
            <div className="px-3 py-2.5 border-b border-line flex-shrink-0">
              {schoolsWithQuestions.length === 0 ? (
                <div className="text-[11px] font-medium text-ink-muted">
                  아직 생성된 예상질문이 없어요.
                </div>
              ) : (
                <div className="flex gap-1.5 flex-wrap">
                  {schoolsWithQuestions.map((school) => {
                    const isActive = selSchoolFilter === school;
                    return (
                      <button
                        key={school}
                        onClick={() => {
                          setSelSchoolFilter(school);
                          setSelQId(null);
                        }}
                        className="px-3 py-1 rounded-full text-[11px] font-bold border transition-all"
                        style={{
                          borderColor: isActive ? THEME.accent : "#E5E7EB",
                          background: isActive ? THEME.accentBg : "#fff",
                          color: isActive ? THEME.accentDark : "#6B7280",
                          boxShadow: isActive
                            ? `0 2px 6px ${THEME.accentShadow}`
                            : "none",
                        }}
                      >
                        🏫 {school}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-b border-line flex-shrink-0">
              <div className="text-[12px] font-medium text-ink-secondary">
                총{" "}
                <span className="font-extrabold" style={{ color: THEME.accent }}>
                  {questions.length}개
                </span>{" "}
                · 답변{" "}
                <span className="font-extrabold" style={{ color: THEME.accent }}>
                  {questions.filter((q) => q.answer).length}개
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {questions.length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  <div className="text-3xl mb-2">💬</div>
                  <div className="font-medium">예상질문이 없어요.</div>
                </div>
              ) : (
                questions.map((q, i) => {
                  const isSelected = selQId === q.id;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelQId(q.id)}
                      className="w-full rounded-xl px-3.5 py-3 mb-1.5 text-left transition-all"
                      style={{
                        border: `1px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                        background: isSelected ? THEME.accentBg : "#fff",
                        boxShadow: isSelected
                          ? `0 2px 8px ${THEME.accentShadow}`
                          : "none",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
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
                        {q.tag && (
                          <span className="text-[10px] font-semibold text-ink-secondary bg-gray-100 px-1.5 py-0.5 rounded-full">
                            {q.tag}
                          </span>
                        )}
                      </div>
                      <div
                        className="text-[12.5px] font-semibold leading-[1.5] mb-1.5"
                        style={{
                          color: isSelected ? THEME.accentDark : "#1a1a1a",
                        }}
                      >
                        {q.text}
                      </div>
                      {q.answer ? (
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
          </>
        )}
      </div>

      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
        {activeTab === "essay" && (
          <>
            {!selEssay ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                <div className="text-4xl">📄</div>
                <div className="text-[14px] font-bold text-ink-secondary">
                  학교를 선택해주세요
                </div>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-line flex-shrink-0">
                  {selEssay.delete_requested && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-3 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚠️</span>
                        <div>
                          <div className="text-[12px] font-bold text-amber-800">
                            학생이 자소서 삭제를 요청했어요
                          </div>
                          <div className="text-[10px] text-amber-700 mt-0.5">
                            요청일:{" "}
                            {selEssay.delete_requested_at
                              ? new Date(
                                  selEssay.delete_requested_at,
                                ).toLocaleDateString("ko-KR")
                              : "-"}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRejectDelete}
                          disabled={rejectDelete.isPending}
                          className="px-3 py-1.5 bg-white border border-line rounded-md text-[11px] font-bold text-ink-secondary hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                          {rejectDelete.isPending ? "처리 중..." : "❌ 거부"}
                        </button>
                        <button
                          onClick={handleApproveDelete}
                          disabled={approveDelete.isPending}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-[11px] font-bold transition-all hover:-translate-y-px disabled:opacity-50"
                        >
                          {approveDelete.isPending
                            ? "삭제 중..."
                            : "✅ 삭제 승인"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-[17px] font-extrabold text-ink tracking-tight">
                          🏫 {selEssay.school}
                        </div>
                        {selEssay.version > 1 && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              color: THEME.accentDark,
                              background: THEME.accentBg,
                              border: `1px solid ${THEME.accentBorder}60`,
                            }}
                          >
                            v{selEssay.version}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-medium text-ink-muted mt-0.5">
                        📅 작성{" "}
                        {new Date(selEssay.created_at).toLocaleDateString(
                          "ko-KR",
                        )}{" "}
                        · 최근수정{" "}
                        {new Date(selEssay.updated_at).toLocaleDateString(
                          "ko-KR",
                        )}{" "}
                        · 1,500자 이내
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(selEssay.content?.selfStudy || selEssay.content?.reason) &&
                        !selEssay.questions_generated && (
                          <button
                            onClick={handleGenerateQuestions}
                            disabled={generateQuestionsAi.isPending}
                            className="px-3 py-2 text-white rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px disabled:opacity-50"
                            style={{
                              background: THEME.accent,
                              boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                            }}
                          >
                            {generateQuestionsAi.isPending
                              ? "🤖 AI 생성 중..."
                              : "✨ AI로 예상질문 생성"}
                          </button>
                        )}
                      {selEssay.questions_generated && (
                        <span
                          className="px-3 py-2 rounded-lg text-[11px] font-bold"
                          style={{
                            color: THEME.accentDark,
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}60`,
                          }}
                        >
                          ✓ 질문생성완료
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {!selEssay.content?.selfStudy && !selEssay.content?.reason && (
                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-12 text-center">
                      <div className="text-4xl mb-3">📝</div>
                      <div className="text-[14px] font-bold text-ink-secondary">
                        학생이 아직 자소서를 작성하지 않았어요
                      </div>
                    </div>
                  )}

                  {(selEssay.content?.selfStudy || selEssay.content?.reason) && (
                    <div>
                      <div className="text-right text-[11px] font-semibold text-ink-muted mb-3">
                        총 {countChars(selEssay.content)} / 1,500자
                      </div>

                      {SECTIONS.map((s) => {
                        const currentContent = (selEssay.content as any)[s.key];
                        const answers = answersBySection[s.key] || [];
                        const sectionFbs = feedbackBySection[s.key] || [];

                        if (!currentContent && answers.length === 0)
                          return null;

                        const lastAnswerRound =
                          answers.length > 0
                            ? Math.max(...answers.map((a) => a.round))
                            : 0;
                        const lastFeedbackRound =
                          sectionFbs.length > 0
                            ? Math.max(...sectionFbs.map((f) => f.round))
                            : 0;
                        const maxRound = Math.max(
                          lastAnswerRound,
                          lastFeedbackRound,
                        );

                        const canWriteNextFb =
                          lastAnswerRound > lastFeedbackRound ||
                          (currentContent && answers.length === 0 && sectionFbs.length === 0);
                        const nextFbRound = Math.max(lastAnswerRound, 1);

                        return (
                          <div key={s.key} className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                              <div
                                className="text-[12px] font-extrabold tracking-tight"
                                style={{ color: THEME.accentDark }}
                              >
                                {s.label}
                              </div>
                              {answers.length > 1 && (
                                <span className="text-[10px] font-semibold text-ink-muted">
                                  총 {answers.length}차
                                </span>
                              )}
                            </div>

                            {/* 본문이 있고 답변 이력은 없으면 — 본문을 표시 */}
                            {currentContent && answers.length === 0 && (
                              <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-1.5">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span
                                    className="text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded-full"
                                    style={{ background: THEME.accent }}
                                  >
                                    학생 자소서
                                  </span>
                                  <span className="text-[10px] font-semibold text-ink-muted">
                                    {currentContent.length}자
                                  </span>
                                </div>
                                <div className="text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                                  {currentContent}
                                </div>
                              </div>
                            )}

                            {Array.from(
                              { length: maxRound },
                              (_, i) => i + 1,
                            ).map((round) => {
                              const ans = answers.find(
                                (a) => a.round === round,
                              );
                              const fb = sectionFbs.find(
                                (f) => f.round === round,
                              );

                              return (
                                <div key={round} className="mb-2">
                                  {ans && (
                                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-1.5">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className="text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded-full"
                                            style={{ background: THEME.accent }}
                                          >
                                            {round === 1
                                              ? "1차 자소서 작성"
                                              : `${round}차 자소서 수정`}
                                          </span>
                                          <span className="text-[9px] font-semibold text-ink-muted">
                                            {new Date(
                                              ans.created_at,
                                            ).toLocaleDateString("ko-KR")}
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-ink-muted">
                                          {ans.content.length}자
                                        </span>
                                      </div>
                                      <div className="text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                                        {ans.content}
                                      </div>
                                    </div>
                                  )}

                                  {fb && (
                                    <div
                                      className="rounded-md px-3 py-2.5 ml-3 mb-1.5"
                                      style={{
                                        background: THEME.accentBg,
                                        border: `1px solid ${THEME.accentBorder}80`,
                                      }}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className="text-[9px] font-extrabold text-white px-1.5 py-0.5 rounded-full"
                                            style={{ background: THEME.accent }}
                                          >
                                            {fb.round}차 피드백
                                          </span>
                                          <span className="text-[9px] font-semibold text-ink-muted">
                                            {new Date(
                                              fb.created_at,
                                            ).toLocaleDateString("ko-KR")}
                                          </span>
                                        </div>
                                        {!(
                                          editingSection?.key === s.key &&
                                          editingSection?.id === fb.id
                                        ) && (
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => {
                                                setEditingSection({
                                                  key: s.key,
                                                  id: fb.id,
                                                });
                                                setEditingText(fb.text);
                                              }}
                                              className="text-[9px] text-ink-secondary hover:text-ink"
                                            >
                                              ✏️
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleDeleteSectionFb(fb.id)
                                              }
                                              className="text-[9px] text-red-500 hover:text-red-700"
                                            >
                                              🗑️
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      {editingSection?.key === s.key &&
                                      editingSection?.id === fb.id ? (
                                        <>
                                          <textarea
                                            value={editingText}
                                            onChange={(e) =>
                                              setEditingText(e.target.value)
                                            }
                                            rows={2}
                                            className="w-full border border-line rounded px-2 py-1.5 text-[11.5px] font-medium outline-none resize-y leading-[1.6] transition-all bg-white"
                                            onFocus={handleTextareaFocus}
                                            onBlur={handleTextareaBlur}
                                          />
                                          <div className="flex gap-1 justify-end mt-1">
                                            <button
                                              onClick={() => {
                                                setEditingSection(null);
                                                setEditingText("");
                                              }}
                                              className="px-2 py-0.5 bg-white text-ink-secondary border border-line rounded text-[9px] font-bold"
                                            >
                                              취소
                                            </button>
                                            <button
                                              onClick={handleUpdateSectionFb}
                                              disabled={
                                                updateSectionFb.isPending
                                              }
                                              className="px-2 py-0.5 text-white rounded text-[9px] font-bold disabled:opacity-50"
                                              style={{
                                                background: THEME.accent,
                                              }}
                                            >
                                              {updateSectionFb.isPending
                                                ? "..."
                                                : "💾"}
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <div
                                          className="text-[11.5px] font-medium leading-[1.6]"
                                          style={{ color: THEME.accentDark }}
                                        >
                                          {fb.text}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {canWriteNextFb && (
                              <div
                                className="bg-white rounded-md p-2 mt-2"
                                style={{ border: `1px dashed ${THEME.accent}` }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div
                                    className="text-[9px] font-bold"
                                    style={{ color: THEME.accent }}
                                  >
                                    ➕ {nextFbRound}차 피드백 작성
                                  </div>
                                  {/* selfStudy는 AI 분석 안 됨 */}
                                  {s.aiKey && (
                                    <button
                                      onClick={() => toggleAiPanel(s.key)}
                                      disabled={analyzeSection.isPending && aiPanelSection === s.key}
                                      className="text-[9px] font-bold px-2 py-0.5 rounded-full transition-all hover:-translate-y-px disabled:opacity-50"
                                      style={{
                                        color:
                                          showAiPanel && aiPanelSection === s.key
                                            ? "#fff"
                                            : THEME.accent,
                                        background:
                                          showAiPanel && aiPanelSection === s.key
                                            ? THEME.accent
                                            : "#fff",
                                        border: `1px solid ${THEME.accent}`,
                                        boxShadow:
                                          showAiPanel && aiPanelSection === s.key
                                            ? `0 2px 6px ${THEME.accentShadow}`
                                            : "none",
                                      }}
                                    >
                                      {analyzeSection.isPending && aiPanelSection === s.key
                                        ? "🤖 분석 중..."
                                        : showAiPanel && aiPanelSection === s.key
                                        ? "✨ AI 분석 닫기"
                                        : "✨ AI 분석 보기"}
                                    </button>
                                  )}
                                </div>
                                <textarea
                                  value={newSectionFbs[s.key] || ""}
                                  onChange={(e) =>
                                    setNewSectionFbs((prev) => ({
                                      ...prev,
                                      [s.key]: e.target.value,
                                    }))
                                  }
                                  placeholder={`${nextFbRound}차 피드백을 작성해주세요...`}
                                  rows={3}
                                  className="w-full border border-line rounded px-2 py-1.5 text-[11.5px] font-medium outline-none resize-y leading-[1.6] transition-all placeholder:text-ink-muted"
                                  onFocus={handleTextareaFocus}
                                  onBlur={handleTextareaBlur}
                                />
                                <div className="flex justify-end mt-1">
                                  <button
                                    onClick={() => handleAddSectionFb(s.key)}
                                    disabled={
                                      !(newSectionFbs[s.key] || "").trim() ||
                                      addSectionFb.isPending
                                    }
                                    className="px-3 py-1 text-white rounded text-[10px] font-bold transition-all disabled:cursor-not-allowed"
                                    style={{
                                      background:
                                        (newSectionFbs[s.key] || "").trim() &&
                                        !addSectionFb.isPending
                                          ? THEME.accent
                                          : "#E5E7EB",
                                      color:
                                        (newSectionFbs[s.key] || "").trim() &&
                                        !addSectionFb.isPending
                                          ? "#fff"
                                          : "#9CA3AF",
                                    }}
                                  >
                                    {addSectionFb.isPending
                                      ? "전달 중..."
                                      : `📤 ${nextFbRound}차 피드백 전달`}
                                  </button>
                                </div>
                              </div>
                            )}

                            {!canWriteNextFb &&
                              lastFeedbackRound >= lastAnswerRound &&
                              lastFeedbackRound > 0 && (
                                <div className="bg-gray-50 border border-line rounded-md px-3 py-2 mt-2 text-center">
                                  <div className="text-[10px] font-medium text-ink-muted">
                                    ⏳ 학생이 다음 답변 작성을 기다리고 있어요
                                  </div>
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "questions" && (
          <>
            {!selQ ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                <div className="text-4xl">💬</div>
                <div className="text-[14px] font-bold text-ink-secondary">
                  질문을 선택해주세요
                </div>
              </div>
            ) : (
              <>
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
                        🏫 {selSchoolFilter}
                      </span>
                      {selQ.tag && (
                        <span className="text-[11px] font-semibold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
                          {selQ.tag}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
                      style={{
                        background: selQ.answer ? THEME.accentBg : "#FEF3C7",
                        color: selQ.answer ? THEME.accentDark : "#92400E",
                        borderColor: `${selQ.answer ? THEME.accentBorder : "#FCD34D"}60`,
                      }}
                    >
                      {selQ.answer ? "✓ 답변완료" : "⏳ 미답변"}
                    </span>
                  </div>

                  <div className="flex">
                    {STEP_LABELS.map((label, i) => {
                      const step = getStep(selQ, selQFeedback);
                      const stepNum = i + 1;
                      const isDone = stepNum < step;
                      const isOn = stepNum === step;
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

                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                  <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                      📌 예상 질문
                    </div>
                    <div className="text-[14px] font-bold text-ink leading-[1.6]">
                      {selQ.text}
                    </div>
                  </div>

                  {selQ.purpose && selQ.purpose.length > 0 && (
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
                        💡 질문 의도
                      </div>
                      <ul className="pl-4">
                        {selQ.purpose.map((p: string, i: number) => (
                          <li
                            key={i}
                            className="text-[12.5px] font-medium leading-[1.7] list-disc"
                            style={{ color: THEME.accentDark }}
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">
                        Step 1
                      </span>
                      <span className="text-[11px] font-bold text-ink-secondary">
                        👤 학생 첫 답변
                      </span>
                    </div>
                    {selQ.answer ? (
                      <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                        {selQ.answer}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-4 text-[12px] font-medium text-ink-muted text-center">
                        ⏳ 학생이 아직 답변하지 않았어요
                      </div>
                    )}
                  </div>

                  {selQ.answer && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <div className="flex items-center gap-1.5">
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
                        {/* ⭐ AI 분석 사이드 패널 열기 버튼 */}
                        <button
                          onClick={async () => {
                            // 이미 결과 있으면 패널만 열기
                            if (qaiResults[selQ.id]) {
                              setQAiPanelKey(selQ.id);
                              setShowQAiPanel(true);
                              return;
                            }
                            // 패널 먼저 열고 분석 시작
                            setQAiPanelKey(selQ.id);
                            setShowQAiPanel(true);
                            try {
                              const result = await analyzeAnswer.mutateAsync({
                                schoolName: selSchoolFilter,
                                questionText: selQ.text,
                                studentAnswer: selQ.answer || "",
                                questionPurpose: selQ.purpose,
                                studentName: student?.name,
                              });
                              setQaiResults((prev) => ({ ...prev, [selQ.id]: result }));
                            } catch (e: any) {
                              alert(`AI 분석 실패: ${e.message}`);
                              setShowQAiPanel(false);
                            }
                          }}
                          disabled={analyzeAnswer.isPending && qAiPanelKey === selQ.id}
                          className="text-[11px] font-bold px-3 py-1 rounded-md transition-all hover:-translate-y-px disabled:opacity-50"
                          style={{
                            color: showQAiPanel && qAiPanelKey === selQ.id ? "#fff" : THEME.accent,
                            background: showQAiPanel && qAiPanelKey === selQ.id ? THEME.accent : "#fff",
                            border: `1px solid ${THEME.accent}`,
                            boxShadow: showQAiPanel && qAiPanelKey === selQ.id
                              ? `0 2px 6px ${THEME.accentShadow}`
                              : "none",
                          }}
                        >
                          {analyzeAnswer.isPending && qAiPanelKey === selQ.id
                            ? "🤖 분석 중..."
                            : showQAiPanel && qAiPanelKey === selQ.id
                            ? "✨ AI 분석 닫기"
                            : "✨ AI 분석 보기"}
                        </button>
                      </div>

                      <textarea
                        value={teacherFbText}
                        onChange={(e) => setTeacherFbText(e.target.value)}
                        placeholder="학생 답변에 대한 피드백을 작성해주세요... (또는 위 ✨ AI 분석 버튼을 눌러주세요)"
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
                          }}
                        >
                          {saveFirstFb.isPending
                            ? "저장 중..."
                            : selQFeedback?.teacher_first_feedback
                              ? "💾 업데이트"
                              : "📤 피드백 전달"}
                        </button>
                      </div>
                    </div>
                  )}

                  {selQFeedback?.teacher_first_feedback && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">
                          Step 3
                        </span>
                        <span className="text-[11px] font-bold text-ink-secondary">
                          👤 학생 업그레이드 답변
                        </span>
                      </div>
                      {selQ.upgraded_answer ? (
                        <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                          {selQ.upgraded_answer}
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-4 text-[12px] font-medium text-amber-700 text-center">
                          ⏳ 학생이 업그레이드 답변 작성중이에요
                        </div>
                      )}
                    </div>
                  )}

                  {selQ.upgraded_answer && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <div className="flex items-center gap-1.5">
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
                        {/* ⭐ AI 분석 사이드 패널 (업그레이드 답변용) */}
                        <button
                          onClick={async () => {
                            const cacheKey = `${selQ.id}_upgrade`;
                            if (qaiResults[cacheKey]) {
                              setQAiPanelKey(cacheKey);
                              setShowQAiPanel(true);
                              return;
                            }
                            setQAiPanelKey(cacheKey);
                            setShowQAiPanel(true);
                            try {
                              const result = await analyzeAnswer.mutateAsync({
                                schoolName: selSchoolFilter,
                                questionText: selQ.text,
                                studentAnswer: selQ.upgraded_answer || "",
                                questionPurpose: selQ.purpose,
                                studentName: student?.name,
                                isUpgrade: true,
                                previousFeedback: selQFeedback?.teacher_first_feedback || undefined,
                              });
                              setQaiResults((prev) => ({ ...prev, [cacheKey]: result }));
                            } catch (e: any) {
                              alert(`AI 분석 실패: ${e.message}`);
                              setShowQAiPanel(false);
                            }
                          }}
                          disabled={analyzeAnswer.isPending && qAiPanelKey === `${selQ.id}_upgrade`}
                          className="text-[11px] font-bold px-3 py-1 rounded-md transition-all hover:-translate-y-px disabled:opacity-50"
                          style={{
                            color: showQAiPanel && qAiPanelKey === `${selQ.id}_upgrade` ? "#fff" : THEME.accent,
                            background: showQAiPanel && qAiPanelKey === `${selQ.id}_upgrade` ? THEME.accent : "#fff",
                            border: `1px solid ${THEME.accent}`,
                            boxShadow: showQAiPanel && qAiPanelKey === `${selQ.id}_upgrade`
                              ? `0 2px 6px ${THEME.accentShadow}`
                              : "none",
                          }}
                        >
                          {analyzeAnswer.isPending && qAiPanelKey === `${selQ.id}_upgrade`
                            ? "🤖 분석 중..."
                            : showQAiPanel && qAiPanelKey === `${selQ.id}_upgrade`
                            ? "✨ AI 분석 닫기"
                            : "✨ 2차 AI 분석 보기"}
                        </button>
                      </div>

                      <textarea
                        value={finalFbText}
                        onChange={(e) => setFinalFbText(e.target.value)}
                        placeholder="최종 피드백을 작성해주세요... (또는 위 ✨ AI 분석 버튼)"
                        rows={3}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                        onFocus={handleTextareaFocus}
                        onBlur={handleTextareaBlur}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={handleSendFinalFb}
                          disabled={
                            !finalFbText.trim() || saveFinalFb.isPending
                          }
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
                          }}
                        >
                          {saveFinalFb.isPending
                            ? "저장 중..."
                            : selQFeedback?.teacher_final_feedback
                              ? "💾 업데이트"
                              : "📤 최종 피드백 전달"}
                        </button>
                      </div>
                    </div>
                  )}

                  {selQFeedback?.teacher_final_feedback && (
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
                          {selQFeedback.tail_questions?.length || 0}개
                        </span>
                      </div>

                      {selQFeedback.tail_questions &&
                        selQFeedback.tail_questions.length > 0 && (
                          <div className="mb-3">
                            {selQFeedback.tail_questions.map(
                              (t: any, i: number) => (
                                <div
                                  key={i}
                                  className="rounded-lg px-3 py-2.5 mb-1.5"
                                  style={{
                                    background: THEME.accentBg,
                                    border: `1px solid ${THEME.accentBorder}60`,
                                  }}
                                >
                                  <div className="flex items-start gap-2 mb-1.5">
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
                                    <div className="mt-2 pt-2 border-t border-line">
                                      <div className="text-[10px] font-bold text-ink-muted mb-1">
                                        👤 학생 답변
                                      </div>
                                      <div className="text-[12px] font-medium text-ink leading-[1.6] whitespace-pre-wrap bg-white rounded p-2">
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
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddTail(newTailText)
                          }
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
                          onClick={() => handleAddTail(newTailText)}
                          disabled={
                            !newTailText.trim() || updateTails.isPending
                          }
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
                        style={{
                          color: THEME.accent,
                          borderColor: THEME.accent,
                        }}
                      >
                        ✨ AI 꼬리질문 제안 받기
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* AI 꼬리질문 모달 (mock 그대로 유지 — 토큰 부족) */}
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
            className="bg-white rounded-2xl p-7 w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-[18px] font-extrabold text-ink mb-1">
              ✨ AI 꼬리질문 제안
            </div>
            <div className="text-[12px] font-medium text-ink-secondary mb-5">
              학생의 답변을 분석해서 추천하는 꼬리질문이에요.
            </div>

            {aiTailLoading ? (
              <div className="text-center py-10 text-ink-muted text-[13px] font-medium">
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                AI가 꼬리질문을 생성 중이에요...
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {AI_TAIL_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      handleAddTail(s);
                      setShowAiTailModal(false);
                    }}
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
                        제안 {i + 1}
                      </span>
                      <span className="text-[13px] font-medium text-ink leading-[1.6]">
                        {s}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAiTailModal(false)}
              className="w-full h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ⭐⭐⭐ 우측 AI 분석 사이드 패널 — 진짜 데이터 ⭐⭐⭐ */}
      {showAiPanel && aiPanelSection && (
        <div className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-line flex flex-col shadow-[-8px_0_24px_rgba(15,23,42,0.08)] z-50">
          <div className="px-4 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">
                ✨ AI 분석
              </div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                {SECTIONS.find((s) => s.key === aiPanelSection)?.label}
              </div>
            </div>
            <button
              onClick={() => setShowAiPanel(false)}
              className="text-ink-muted hover:text-ink text-base w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {/* 로딩 */}
            {analyzeSection.isPending && !aiResults[aiPanelSection] && (
              <div className="text-center py-10">
                <div className="text-3xl mb-3 animate-pulse">🤖</div>
                <div className="text-[13px] font-bold text-ink-secondary mb-1">
                  AI가 자소서를 분석 중이에요...
                </div>
                <div className="text-[11px] text-ink-muted">
                  보통 5~15초 정도 걸려요
                </div>
              </div>
            )}

            {/* 분석 결과 있을 때 */}
            {aiResults[aiPanelSection] && (
              <>
                {/* 점수 요약 */}
                <div
                  className="rounded-xl px-4 py-3.5"
                  style={{
                    background: THEME.accentBg,
                    border: `1px solid ${THEME.accentBorder}60`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: THEME.accent }}
                    >
                      📊 종합 점수
                    </div>
                    <div
                      className="text-[24px] font-extrabold"
                      style={{ color: THEME.accentDark }}
                    >
                      {aiResults[aiPanelSection].totalScore}
                      <span className="text-[12px] text-ink-muted">/100</span>
                    </div>
                  </div>
                  {aiResults[aiPanelSection].summary && (
                    <div className="text-[11.5px] leading-[1.6] mt-1" style={{ color: THEME.accentDark }}>
                      {aiResults[aiPanelSection].summary}
                    </div>
                  )}
                </div>

                {/* 4축 점수 */}
                {aiResults[aiPanelSection].scores.length > 0 && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink mb-2">
                      📐 평가 4축
                    </div>
                    <div className="space-y-2">
                      {aiResults[aiPanelSection].scores.map((s, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-bold text-ink-secondary">
                              {s.label}
                            </span>
                            <span className="text-[11px] font-extrabold" style={{ color: THEME.accent }}>
                              {s.score}/{s.max}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-0.5">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(s.score / s.max) * 100}%`,
                                background: THEME.accent,
                              }}
                            />
                          </div>
                          <div className="text-[10px] text-ink-muted leading-[1.4]">{s.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 강점 */}
                {aiResults[aiPanelSection].strengths.length > 0 && (
                  <div
                    className="rounded-xl px-4 py-3.5"
                    style={{
                      background: THEME.accentBg,
                      border: `1px solid ${THEME.accentBorder}60`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">✅</span>
                      <div
                        className="text-[11px] font-extrabold uppercase tracking-wider"
                        style={{ color: THEME.accent }}
                      >
                        강점
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {aiResults[aiPanelSection].strengths.map((item, i) => (
                        <li
                          key={i}
                          className="text-[12px] font-medium leading-[1.6] flex gap-1.5"
                          style={{ color: THEME.accentDark }}
                        >
                          <span>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 개선점 */}
                {aiResults[aiPanelSection].improvements.length > 0 && (
                  <div className="rounded-xl px-4 py-3.5 bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">⚠️</span>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                        보완할 점
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {aiResults[aiPanelSection].improvements.map((item, i) => (
                        <li
                          key={i}
                          className="text-[12px] font-medium leading-[1.6] flex gap-1.5 text-amber-800"
                        >
                          <span>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 키워드 반영도 */}
                {aiResults[aiPanelSection].keywordReflection && (
                  <div className="rounded-xl px-4 py-3.5 bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">🎯</span>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                        키워드 반영도
                      </div>
                    </div>
                    <div className="text-[12px] font-medium leading-[1.6] text-blue-900">
                      {aiResults[aiPanelSection].keywordReflection}
                    </div>
                  </div>
                )}

                {/* AI 작성 피드백 미리보기 + 버튼 */}
                {aiResults[aiPanelSection].teacherDraft && (
                  <div
                    className="bg-white rounded-xl px-4 py-3.5 border-2"
                    style={{ borderColor: THEME.accent }}
                  >
                    <div
                      className="text-[11px] font-extrabold uppercase tracking-wider mb-2"
                      style={{ color: THEME.accent }}
                    >
                      ✨ AI가 작성한 피드백 초안
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-[12px] leading-[1.7] text-ink whitespace-pre-wrap mb-3">
                      {aiResults[aiPanelSection].teacherDraft}
                    </div>
                    <button
                      onClick={() => {
                        writeAiFeedback(aiPanelSection);
                        setShowAiPanel(false);
                      }}
                      className="w-full h-10 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                      style={{
                        background: THEME.accent,
                        boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                      }}
                    >
                      ✨ 이 피드백 사용하기
                    </button>
                  </div>
                )}
              </>
            )}

            {/* 분석 결과 없고 로딩도 아닐 때 — selfStudy 같은 경우 */}
            {!analyzeSection.isPending && !aiResults[aiPanelSection] && (
              <div className="text-center py-10">
                <div className="text-3xl mb-2">💭</div>
                <div className="text-[13px] font-bold text-ink-secondary">
                  이 항목은 AI 분석을 지원하지 않아요
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⭐⭐⭐ 예상질문 답변용 AI 분석 사이드 패널 ⭐⭐⭐ */}
      {showQAiPanel && qAiPanelKey && selQ && (
        <div className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-line flex flex-col shadow-[-8px_0_24px_rgba(15,23,42,0.08)] z-50">
          <div className="px-4 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">
                ✨ AI 분석
              </div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                🏫 {selSchoolFilter} · Q{questions.findIndex((q) => q.id === selQ.id) + 1}
                {qAiPanelKey.endsWith("_upgrade") && " · 업그레이드 답변"}
              </div>
            </div>
            <button
              onClick={() => setShowQAiPanel(false)}
              className="text-ink-muted hover:text-ink text-base w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {/* 로딩 */}
            {analyzeAnswer.isPending && !qaiResults[qAiPanelKey] && (
              <div className="text-center py-10">
                <div className="text-3xl mb-3 animate-pulse">🤖</div>
                <div className="text-[13px] font-bold text-ink-secondary mb-1">
                  AI가 답변을 분석 중이에요...
                </div>
                <div className="text-[11px] text-ink-muted">
                  보통 5~15초 정도 걸려요
                </div>
              </div>
            )}

            {/* 분석 결과 */}
            {qaiResults[qAiPanelKey] && (
              <>
                {/* 종합 점수 */}
                <div
                  className="rounded-xl px-4 py-3.5"
                  style={{
                    background: THEME.accentBg,
                    border: `1px solid ${THEME.accentBorder}60`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: THEME.accent }}
                    >
                      📊 종합 점수
                    </div>
                    <div
                      className="text-[24px] font-extrabold"
                      style={{ color: THEME.accentDark }}
                    >
                      {qaiResults[qAiPanelKey].totalScore}
                      <span className="text-[12px] text-ink-muted">/100</span>
                    </div>
                  </div>
                  {qaiResults[qAiPanelKey].summary && (
                    <div className="text-[11.5px] leading-[1.6] mt-1" style={{ color: THEME.accentDark }}>
                      {qaiResults[qAiPanelKey].summary}
                    </div>
                  )}
                </div>

                {/* 4축 점수 */}
                {qaiResults[qAiPanelKey].scores.length > 0 && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink mb-2">
                      📐 평가 4축
                    </div>
                    <div className="space-y-2">
                      {qaiResults[qAiPanelKey].scores.map((s, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-bold text-ink-secondary">
                              {s.label}
                            </span>
                            <span className="text-[11px] font-extrabold" style={{ color: THEME.accent }}>
                              {s.score}/{s.max}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-0.5">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(s.score / s.max) * 100}%`,
                                background: THEME.accent,
                              }}
                            />
                          </div>
                          <div className="text-[10px] text-ink-muted leading-[1.4]">{s.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 강점 */}
                {qaiResults[qAiPanelKey].strengths.length > 0 && (
                  <div
                    className="rounded-xl px-4 py-3.5"
                    style={{
                      background: THEME.accentBg,
                      border: `1px solid ${THEME.accentBorder}60`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">✅</span>
                      <div
                        className="text-[11px] font-extrabold uppercase tracking-wider"
                        style={{ color: THEME.accent }}
                      >
                        강점
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {qaiResults[qAiPanelKey].strengths.map((item, i) => (
                        <li
                          key={i}
                          className="text-[12px] font-medium leading-[1.6] flex gap-1.5"
                          style={{ color: THEME.accentDark }}
                        >
                          <span>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 개선점 */}
                {qaiResults[qAiPanelKey].improvements.length > 0 && (
                  <div className="rounded-xl px-4 py-3.5 bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">⚠️</span>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                        보완할 점
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {qaiResults[qAiPanelKey].improvements.map((item, i) => (
                        <li
                          key={i}
                          className="text-[12px] font-medium leading-[1.6] flex gap-1.5 text-amber-800"
                        >
                          <span>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI 작성 피드백 + 사용 버튼 */}
                {qaiResults[qAiPanelKey].teacherDraft && (
                  <div
                    className="bg-white rounded-xl px-4 py-3.5 border-2"
                    style={{ borderColor: THEME.accent }}
                  >
                    <div
                      className="text-[11px] font-extrabold uppercase tracking-wider mb-2"
                      style={{ color: THEME.accent }}
                    >
                      ✨ AI가 작성한 피드백 초안
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-[12px] leading-[1.7] text-ink whitespace-pre-wrap mb-3">
                      {qaiResults[qAiPanelKey].teacherDraft}
                    </div>
                    <button
                      onClick={() => {
                        const draft = qaiResults[qAiPanelKey].teacherDraft;
                        if (qAiPanelKey.endsWith("_upgrade")) {
                          setFinalFbText(draft);
                        } else {
                          setTeacherFbText(draft);
                        }
                        setShowQAiPanel(false);
                      }}
                      className="w-full h-10 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                      style={{
                        background: THEME.accent,
                        boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                      }}
                    >
                      ✏️ 이 피드백 사용하기
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}