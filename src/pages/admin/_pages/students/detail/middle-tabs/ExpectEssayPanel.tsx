import { useState, useEffect } from "react";
import {
  useStudentEssayFeedback,
  useStudentEssayAnswers,
  useAddSectionFeedback,
  useUpdateSectionFeedback,
  useDeleteSectionFeedback,
  useApproveDeleteEssay,
  useRejectDeleteRequest,
} from "@/pages/admin/_hooks/middle/useStudentExpect";
import {
  useAnalyzeSection,
  useGenerateQuestionsAi,
  type SectionAnalysisResult,
} from "@/pages/admin/_hooks/middle/useAiEssay";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const THEME = {
  accent: "#059669",
  accentDark: "#065F46",
  accentBg: "#ECFDF5",
  accentBorder: "#6EE7B7",
  accentShadow: "rgba(16, 185, 129, 0.15)",
};

// 🎯 4영역으로 변경 (활동계획 제거)
const SECTIONS = [
  { key: "selfStudy", label: "🎓 자기주도학습 과정", aiKey: "자기주도학습 과정" },
  { key: "reason", label: "🏫 지원동기 (건학이념 연계)", aiKey: "지원동기" },
  { key: "career", label: "🚀 진로계획", aiKey: "진로계획" },
  { key: "character", label: "💛 인성", aiKey: "인성" },
];

const MAX_ESSAY_AI_COUNT = 2;

function useEssayAiCount(essayId: string | undefined) {
  return useQuery({
    queryKey: ["essay-ai-count", essayId],
    enabled: !!essayId,
    queryFn: async () => {
      if (!essayId) return [];
      const { data, error } = await supabase
        .from("jaso_essay_ai_count")
        .select("*")
        .eq("essay_id", essayId);
      if (error) throw error;
      return data || [];
    },
  });
}

async function incrementEssayAiCount(essayId: string, sectionKey: string, result: any) {
  const { data: existing } = await supabase
    .from("jaso_essay_ai_count")
    .select("id, count")
    .eq("essay_id", essayId)
    .eq("section_key", sectionKey)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("jaso_essay_ai_count")
      .update({
        count: existing.count + 1,
        last_analyzed_at: new Date().toISOString(),
        result,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("jaso_essay_ai_count")
      .insert({
        essay_id: essayId,
        section_key: sectionKey,
        count: 1,
        last_analyzed_at: new Date().toISOString(),
        result,
      });
    if (error) throw error;
  }
}

export default function MiddleExpectEssayPanel({
  student,
  selEssay,
  setSelEssayId,
  setActiveTab,
  setSelSchoolFilter,
}: {
  student: any;
  selEssay: any;
  setSelEssayId: (id: string | null) => void;
  setActiveTab: (tab: "essay" | "questions") => void;
  setSelSchoolFilter: (s: string) => void;
}) {
  const qc = useQueryClient();
  const { data: sectionFeedbacks = [] } = useStudentEssayFeedback(selEssay?.id);
  const { data: essayAnswers = [] } = useStudentEssayAnswers(selEssay?.id);
  const { data: essayAiCounts = [] } = useEssayAiCount(selEssay?.id);

  const addSectionFb = useAddSectionFeedback();
  const updateSectionFb = useUpdateSectionFeedback();
  const deleteSectionFb = useDeleteSectionFeedback();
  const analyzeSection = useAnalyzeSection();
  const generateQuestionsAi = useGenerateQuestionsAi();
  const approveDelete = useApproveDeleteEssay();
  const rejectDelete = useRejectDeleteRequest();

  const [aiResults, setAiResults] = useState<Record<string, SectionAnalysisResult>>({});
  const [newSectionFbs, setNewSectionFbs] = useState<Record<string, string>>({});
  const [editingSection, setEditingSection] = useState<{ key: string; id: string } | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPanelSection, setAiPanelSection] = useState<string>("");

  // DB에 저장된 분석 결과를 자동 로드 (중복 제거된 단일 useEffect)
  useEffect(() => {
    if (!selEssay || essayAiCounts.length === 0) return;
    essayAiCounts.forEach((row: any) => {
      if (row.result) {
        setAiResults((prev) => ({ ...prev, [row.section_key]: row.result }));
      }
    });
  }, [selEssay?.id, essayAiCounts]);

  const answersBySection = essayAnswers.reduce((acc: Record<string, any[]>, a) => {
    if (!acc[a.section_key]) acc[a.section_key] = [];
    acc[a.section_key].push(a);
    return acc;
  }, {});

  const feedbackBySection = sectionFeedbacks.reduce((acc: Record<string, any[]>, fb) => {
    if (!acc[fb.section_key]) acc[fb.section_key] = [];
    acc[fb.section_key].push(fb);
    return acc;
  }, {});

  const getEssayAiCount = (sectionKey: string): number => {
    const row = essayAiCounts.find((c: any) => c.section_key === sectionKey);
    return row?.count || 0;
  };

  const countChars = (content: any) =>
    Object.values(content || {}).join("").replace(/\s/g, "").length;

  const handleApproveDelete = async () => {
    if (!selEssay) return;
    if (!confirm(`'${selEssay.school}' 자소서를 영구 삭제할까요?\n\n이 작업은 되돌릴 수 없어요.`)) return;
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

  const handleGenerateQuestions = async () => {
    if (!selEssay) return;
    if (!selEssay.content) {
      alert("자소서 내용이 없어요.");
      return;
    }
    if (!selEssay.essay_completed) {
      alert("학생이 아직 자소서를 완료하지 않았어요.");
      return;
    }
    if (!confirm("예상질문을 생성하면 학생이 자소서를 더 이상 수정할 수 없어요.\n\n계속하시겠어요?")) {
      return;
    }
    try {
      // 🎯 4영역 (활동계획 제거, 자기주도학습 추가)
      const generated = await generateQuestionsAi.mutateAsync({
        schoolName: selEssay.school,
        studentName: student?.name,
        sections: {
          자기주도학습: selEssay.content.selfStudy || "",
          지원동기: selEssay.content.reason || "",
          진로계획: selEssay.content.career || "",
          인성: selEssay.content.character || "",
        } as any,
        count: 8,
      });
      if (!generated || generated.length === 0) {
        alert("질문 생성 실패. 다시 시도해주세요.");
        return;
      }
      const rows = generated.map((q, idx) => ({
        essay_id: selEssay.id,
        question_index: idx,
        text: q.text,
        tag: q.tag,
        purpose: q.purpose,
      }));
      const { error: insertError } = await supabase.from("jaso_questions").insert(rows);
      if (insertError) throw insertError;
      const { error: updateError } = await supabase
        .from("jaso_essays")
        .update({ questions_generated: true })
        .eq("id", selEssay.id);
      if (updateError) throw updateError;
      setSelSchoolFilter(selEssay.school);
      setActiveTab("questions");
      alert(`✅ 예상질문 ${generated.length}개가 AI로 생성되었어요!`);
      window.location.reload();
    } catch (e: any) {
      alert(`질문 생성 실패: ${e.message}`);
    }
  };

  const toggleAiPanel = async (sectionKey: string) => {
    if (showAiPanel && aiPanelSection === sectionKey) {
      setShowAiPanel(false);
      return;
    }
    setAiPanelSection(sectionKey);
    setShowAiPanel(true);

    if (aiResults[sectionKey]) return;

    const sectionInfo = SECTIONS.find((s) => s.key === sectionKey);
    if (!sectionInfo?.aiKey || !selEssay) return;

    const { data: countRow } = await supabase
      .from("jaso_essay_ai_count")
      .select("count, result")
      .eq("essay_id", selEssay.id)
      .eq("section_key", sectionKey)
      .maybeSingle();

    if ((countRow?.count || 0) >= MAX_ESSAY_AI_COUNT) {
      if (countRow?.result) {
        setAiResults((prev) => ({ ...prev, [sectionKey]: countRow.result }));
      }
      return;
    }

    const sectionAnswers = answersBySection[sectionKey] || [];
    const latestAnswer = sectionAnswers.length > 0 ? sectionAnswers[sectionAnswers.length - 1] : null;
    const answerText = latestAnswer?.content || (selEssay?.content as any)?.[sectionKey] || "";

    if (!answerText || answerText.length < 20) {
      alert("학생이 아직 충분한 답변을 작성하지 않았어요.");
      setShowAiPanel(false);
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
      await incrementEssayAiCount(selEssay.id, sectionKey, result);
      qc.invalidateQueries({ queryKey: ["essay-ai-count", selEssay.id] });
    } catch (e: any) {
      alert(`AI 분석 실패: ${e.message}`);
      setShowAiPanel(false);
    }
  };

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

  if (!selEssay) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
        <div className="text-4xl">📄</div>
        <div className="text-[14px] font-bold text-ink-secondary">학교를 선택해주세요</div>
      </div>
    );
  }

  return (
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
                  요청일: {selEssay.delete_requested_at
                    ? new Date(selEssay.delete_requested_at).toLocaleDateString("ko-KR")
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
                {approveDelete.isPending ? "삭제 중..." : "✅ 삭제 승인"}
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
              {selEssay.essay_completed && !selEssay.questions_generated && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-full px-2 py-0.5">
                  ✓ 학생 완료
                </span>
              )}
              {selEssay.questions_generated && (
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-300 rounded-full px-2 py-0.5">
                  🔒 잠김
                </span>
              )}
            </div>
            <div className="text-[11px] font-medium text-ink-muted mt-0.5">
              📅 작성 {new Date(selEssay.created_at).toLocaleDateString("ko-KR")}
              {" · 최근수정 "}{new Date(selEssay.updated_at).toLocaleDateString("ko-KR")}
              {" · 1,500자 이내"}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!selEssay.questions_generated && selEssay.essay_completed && (
              <button
                onClick={handleGenerateQuestions}
                disabled={generateQuestionsAi.isPending}
                className="px-3 py-2 text-white rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px disabled:opacity-50"
                style={{
                  background: THEME.accent,
                  boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                }}
              >
                {generateQuestionsAi.isPending ? "🤖 AI 생성 중..." : "✨ AI로 예상질문 생성"}
              </button>
            )}
            {!selEssay.questions_generated && !selEssay.essay_completed && (selEssay.content?.selfStudy || selEssay.content?.reason) && (
              <span className="px-3 py-2 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                ⏳ 학생이 작성중
              </span>
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
        {!selEssay.content?.selfStudy && !selEssay.content?.reason ? (
          <div className="bg-gray-50 border border-line rounded-xl px-4 py-12 text-center">
            <div className="text-4xl mb-3">📝</div>
            <div className="text-[14px] font-bold text-ink-secondary">
              학생이 아직 자소서를 작성하지 않았어요
            </div>
          </div>
        ) : (
          <div>
            <div className="text-right text-[11px] font-semibold text-ink-muted mb-3">
              총 {countChars(selEssay.content)} / 1,500자
            </div>
            {SECTIONS.map((s) => {
              const currentContent = (selEssay.content as any)[s.key];
              const answers = answersBySection[s.key] || [];
              const sectionFbs = feedbackBySection[s.key] || [];
              if (!currentContent && answers.length === 0) return null;

              const lastAnswerRound = answers.length > 0 ? Math.max(...answers.map((a) => a.round)) : 0;
              const lastFeedbackRound = sectionFbs.length > 0 ? Math.max(...sectionFbs.map((f) => f.round)) : 0;
              const maxRound = Math.max(lastAnswerRound, lastFeedbackRound);
              const canWriteNextFb =
                lastAnswerRound > lastFeedbackRound ||
                (currentContent && answers.length === 0 && sectionFbs.length === 0);
              const nextFbRound = Math.max(lastAnswerRound, 1);
              const sectionAiCount = getEssayAiCount(s.key);
              const sectionAiExhausted = sectionAiCount >= MAX_ESSAY_AI_COUNT;

              return (
                <div key={s.key} className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[12px] font-extrabold tracking-tight" style={{ color: THEME.accentDark }}>
                      {s.label}
                    </div>
                    {answers.length > 1 && (
                      <span className="text-[10px] font-semibold text-ink-muted">총 {answers.length}차</span>
                    )}
                  </div>

                  {currentContent && answers.length === 0 && (
                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-1.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded-full"
                          style={{ background: THEME.accent }}
                        >
                          학생 자소서
                        </span>
                        <span className="text-[10px] font-semibold text-ink-muted">{currentContent.length}자</span>
                      </div>
                      <div className="text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                        {currentContent}
                      </div>
                    </div>
                  )}

                  {Array.from({ length: maxRound }, (_, i) => i + 1).map((round) => {
                    const ans = answers.find((a) => a.round === round);
                    const fb = sectionFbs.find((f) => f.round === round);
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
                                  {round === 1 ? "1차 자소서 작성" : `${round}차 자소서 수정`}
                                </span>
                                <span className="text-[9px] font-semibold text-ink-muted">
                                  {new Date(ans.created_at).toLocaleDateString("ko-KR")}
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-ink-muted">{ans.content.length}자</span>
                            </div>
                            <div className="text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                              {ans.content}
                            </div>
                          </div>
                        )}

                        {fb && (
                          <div
                            className="rounded-md px-3 py-2.5 ml-3 mb-1.5"
                            style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}80` }}
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
                                  {new Date(fb.created_at).toLocaleDateString("ko-KR")}
                                </span>
                              </div>
                              {!(editingSection?.key === s.key && editingSection?.id === fb.id) && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingSection({ key: s.key, id: fb.id });
                                      setEditingText(fb.text);
                                    }}
                                    className="text-[9px] text-ink-secondary hover:text-ink"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSectionFb(fb.id)}
                                    className="text-[9px] text-red-500 hover:text-red-700"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
                            </div>
                            {editingSection?.key === s.key && editingSection?.id === fb.id ? (
                              <>
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  rows={2}
                                  className="w-full border border-line rounded px-2 py-1.5 text-[11.5px] font-medium outline-none resize-y leading-[1.6] bg-white"
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
                                    disabled={updateSectionFb.isPending}
                                    className="px-2 py-0.5 text-white rounded text-[9px] font-bold disabled:opacity-50"
                                    style={{ background: THEME.accent }}
                                  >
                                    {updateSectionFb.isPending ? "..." : "💾"}
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
                    <div className="bg-white rounded-md p-2 mt-2" style={{ border: `1px dashed ${THEME.accent}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[9px] font-bold" style={{ color: THEME.accent }}>
                          ➕ {nextFbRound}차 피드백 작성
                        </div>
                        {s.aiKey && (
                          <button
                            onClick={() => {
                              if (sectionAiExhausted && !aiResults[s.key]) {
                                alert(`이 항목은 이미 AI 분석 ${MAX_ESSAY_AI_COUNT}회를 모두 사용했어요.`);
                                return;
                              }
                              toggleAiPanel(s.key);
                            }}
                            disabled={analyzeSection.isPending && aiPanelSection === s.key}
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full transition-all hover:-translate-y-px disabled:opacity-50"
                            style={{
                              color: sectionAiExhausted && !aiResults[s.key] ? "#9CA3AF" : showAiPanel && aiPanelSection === s.key ? "#fff" : THEME.accent,
                              background: sectionAiExhausted && !aiResults[s.key] ? "#F3F4F6" : showAiPanel && aiPanelSection === s.key ? THEME.accent : "#fff",
                              border: `1px solid ${sectionAiExhausted && !aiResults[s.key] ? "#E5E7EB" : THEME.accent}`,
                            }}
                          >
                            {analyzeSection.isPending && aiPanelSection === s.key
                              ? "🤖 분석 중..."
                              : showAiPanel && aiPanelSection === s.key
                              ? "✨ AI 분석 닫기"
                              : sectionAiExhausted
                              ? `🚫 AI 분석 (${sectionAiCount}/${MAX_ESSAY_AI_COUNT})`
                              : `✨ AI 분석 보기 (${sectionAiCount}/${MAX_ESSAY_AI_COUNT})`}
                          </button>
                        )}
                      </div>
                      <textarea
                        value={newSectionFbs[s.key] || ""}
                        onChange={(e) => setNewSectionFbs((prev) => ({ ...prev, [s.key]: e.target.value }))}
                        placeholder={`${nextFbRound}차 피드백을 작성해주세요...`}
                        rows={3}
                        className="w-full border border-line rounded px-2 py-1.5 text-[11.5px] font-medium outline-none resize-y leading-[1.6] placeholder:text-ink-muted"
                        onFocus={handleTextareaFocus}
                        onBlur={handleTextareaBlur}
                      />
                      <div className="flex justify-end mt-1">
                        <button
                          onClick={() => handleAddSectionFb(s.key)}
                          disabled={!(newSectionFbs[s.key] || "").trim() || addSectionFb.isPending}
                          className="px-3 py-1 text-white rounded text-[10px] font-bold transition-all disabled:cursor-not-allowed"
                          style={{
                            background: (newSectionFbs[s.key] || "").trim() && !addSectionFb.isPending ? THEME.accent : "#E5E7EB",
                            color: (newSectionFbs[s.key] || "").trim() && !addSectionFb.isPending ? "#fff" : "#9CA3AF",
                          }}
                        >
                          {addSectionFb.isPending ? "전달 중..." : `📤 ${nextFbRound}차 피드백 전달`}
                        </button>
                      </div>
                    </div>
                  )}

                  {!canWriteNextFb && lastFeedbackRound >= lastAnswerRound && lastFeedbackRound > 0 && (
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

      {/* 자소서 AI 분석 사이드 패널 */}
      {showAiPanel && aiPanelSection && (
        <div className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-line flex flex-col shadow-[-8px_0_24px_rgba(15,23,42,0.08)] z-50">
          <div className="px-4 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">✨ AI 분석</div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                {SECTIONS.find((s) => s.key === aiPanelSection)?.label}
                {" · "}
                <span style={{ color: THEME.accent }}>
                  {getEssayAiCount(aiPanelSection)}/{MAX_ESSAY_AI_COUNT} 사용됨
                </span>
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
            {analyzeSection.isPending && !aiResults[aiPanelSection] && (
              <div className="text-center py-10">
                <div className="text-3xl mb-3 animate-pulse">🤖</div>
                <div className="text-[13px] font-bold text-ink-secondary">AI가 분석 중...</div>
              </div>
            )}

            {aiResults[aiPanelSection] && (
              <>
                <div
                  className="rounded-xl px-4 py-3.5"
                  style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: THEME.accent }}>
                      📊 종합 점수
                    </div>
                    <div className="text-[24px] font-extrabold" style={{ color: THEME.accentDark }}>
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

                {aiResults[aiPanelSection].scores.length > 0 && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink mb-2">평가</div>
                    <div className="space-y-2">
                      {aiResults[aiPanelSection].scores.map((s, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-bold text-ink-secondary">{s.label}</span>
                            <span className="text-[11px] font-extrabold" style={{ color: THEME.accent }}>
                              {s.score}/{s.max}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-0.5">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(s.score / s.max) * 100}%`, background: THEME.accent }}
                            />
                          </div>
                          <div className="text-[10px] text-ink-muted leading-[1.4]">{s.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResults[aiPanelSection].strengths.length > 0 && (
                  <div
                    className="rounded-xl px-4 py-3.5"
                    style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">✅</span>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: THEME.accent }}>
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
                        <li key={i} className="text-[12px] font-medium leading-[1.6] flex gap-1.5 text-amber-800">
                          <span>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

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
                      style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                    >
                      ✨ 이 피드백 사용하기
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}