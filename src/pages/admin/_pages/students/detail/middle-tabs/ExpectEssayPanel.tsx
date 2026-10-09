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
import { getSchoolEssayData } from "@/constants/schoolEssayData";
import { getRoundDef, MAX_ESSAY_ROUND } from "@/constants/essayRounds";
import {
  useAnalyzeSection,
  useGenerateQuestionsAi,
  type SectionAnalysisResult,
} from "@/pages/admin/_hooks/middle/useAiEssay";
import EssayAnalysisPanel from "../../../../_hooks/middle/EssayAnalysisPanel";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const THEME = {
  accent: "#059669",
  accentDark: "#065F46",
  accentBg: "#ECFDF5",
  accentBorder: "#6EE7B7",
  accentShadow: "rgba(16, 185, 129, 0.15)",
};

// ════════════════════════════════════════════════════════════
// 🎯 학교별 동적 문항 (학생 화면과 동일 방식)
// ════════════════════════════════════════════════════════════
type SectionDef = {
  key: string;
  label: string;
  aiKey: string; // AI 분석에 넘길 영역명 (학교 문항 label 그대로)
};

const SECTION_ICON: Record<string, string> = {
  selfStudy: "🎓",
  reason: "🏫",
  career: "🚀",
  character: "💛",
  sciInquiry: "🔬",
  mathInquiry: "📐",
};

// 데이터 없는 학교 기본 4문항
const DEFAULT_SECTIONS: SectionDef[] = [
  { key: "selfStudy", label: "🎓 자기주도학습 과정", aiKey: "자기주도학습 과정" },
  { key: "reason", label: "🏫 지원동기 (건학이념 연계)", aiKey: "지원동기" },
  { key: "career", label: "🚀 진로계획", aiKey: "진로계획" },
  { key: "character", label: "💛 인성", aiKey: "인성" },
];

function getSectionsForSchool(schoolName: string): SectionDef[] {
  const data = getSchoolEssayData(schoolName);
  if (!data || !data.sections?.length) return DEFAULT_SECTIONS;
  return data.sections.map((s: any) => ({
    key: s.key,
    label: `${SECTION_ICON[s.key] || "📝"} ${s.label}`,
    aiKey: s.label, // 학교 문항 라벨을 그대로 AI 영역명으로
  }));
}

// 🎯 차수당 1회 × 4차수 (차수 정의는 src/constants/essayRounds.ts)
const MAX_ESSAY_AI_COUNT = 4;

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
      .update({ count: existing.count + 1, last_analyzed_at: new Date().toISOString(), result })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("jaso_essay_ai_count")
      .insert({ essay_id: essayId, section_key: sectionKey, count: 1, last_analyzed_at: new Date().toISOString(), result });
    if (error) throw error;
  }
}

// content에 내용이 하나라도 있으면 작성된 것으로 판단
function hasAnyContent(content: any): boolean {
  if (!content) return false;
  return Object.values(content).some((v) => typeof v === "string" && v.trim().length > 0);
}

// ════════════════════════════════════════════════════════════
// 🎯 컨셉 확인 — 학생이 3단계에서 고른 컨셉을 선생님이 확인한다
//    학생이 컨셉을 고르면 concept_status = 'pending' 으로 넘어온다.
//    선생님이 [AI 피드백]으로 참고 의견을 받고, 진행 / 다시 정하기를 고른다.
// ════════════════════════════════════════════════════════════
type ConceptStatus = "none" | "pending" | "approved" | "rejected";

interface ConceptReview {
  verdict: "ok" | "check" | "rethink";
  fit: number;
  headline: string;
  summary: string;
  support: string[];
  unrelated: string[];
  gap: string;
  alternatives: { career: string; why: string }[];
  questions: string[];
  studentMessage: string;
  career: string;
}

const SOURCE_KO: Record<string, string> = {
  test: "진로 계열 검사",
  custom: "학생이 직접 적음",
  ai: "AI 추천에서 고름",
};

const VERDICT_UI: Record<ConceptReview["verdict"], { label: string; bg: string; fg: string; border: string }> = {
  ok: { label: "괜찮아요", bg: "#ECFDF5", fg: "#065F46", border: "#6EE7B7" },
  check: { label: "확인 필요", bg: "#FFFBEB", fg: "#92400E", border: "#FCD34D" },
  rethink: { label: "컨셉 재검토 권장", bg: "#FEF2F2", fg: "#991B1B", border: "#FCA5A5" },
};

const BRANCH_ORDER = ["학교생활", "동아리", "독서학습", "봉사인성", "학교관심"];

function ConceptCheckCard({ essayId, schoolName, studentId }: { essayId: string; schoolName: string; studentId: string }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState<"" | "ai" | "approved" | "rejected">("");

  const { data: wiz } = useQuery({
    queryKey: ["concept-check", essayId],
    enabled: !!essayId,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("middle_essay_wizard")
        .select("keywords, mindmap, concept, concept_status, concept_review, concept_review_at, concept_feedback, concept_sent_at, concept_checked_at")
        .eq("essay_id", essayId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: testConcept } = useQuery({
    queryKey: ["concept-check-test", studentId],
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("middle_student_concept")
        .select("type_name, major, career")
        .eq("student_id", studentId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  const status: ConceptStatus = (wiz?.concept_status as ConceptStatus) ?? "none";
  const concept = wiz?.concept as { career?: string; label?: string; source?: string; fit?: number } | null;
  const review = wiz?.concept_review as ConceptReview | null;
  const reviewIsStale = !!review && !!concept?.career && review.career !== concept.career;

  // 이미 확인한 건 접어 둔다
  useEffect(() => {
    setOpen(status === "pending" || status === "rejected");
    setComment("");
  }, [essayId, status]);

  const keywords: { keyword: string; experience: string }[] = (wiz?.keywords ?? []).filter((k: any) => k?.keyword?.trim());
  const mindmap: Record<string, string[]> = wiz?.mindmap ?? {};
  const experiences = BRANCH_ORDER.flatMap((b) =>
    (mindmap[b] ?? []).filter((t) => t?.trim()).map((t) => ({ branch: b, text: t.trim() })),
  );

  const runAi = async () => {
    if (!concept?.career) return;
    setBusy("ai");
    try {
      const { data, error } = await supabase.functions.invoke("middle-essay-concept-review", {
        body: {
          essayId,
          schoolName,
          concept,
          keywords,
          experiences,
          existingConcept: testConcept ?? null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await qc.invalidateQueries({ queryKey: ["concept-check", essayId] });
      if (!comment.trim() && data?.review?.studentMessage) setComment(data.review.studentMessage);
    } catch (e: any) {
      alert(`AI 피드백을 받지 못했어요.\n${e.message ?? e}`);
    } finally {
      setBusy("");
    }
  };

  const decide = async (next: "approved" | "rejected") => {
    if (next === "rejected" && !comment.trim()) {
      alert("다시 정하게 할 때는 이유를 한마디 적어 주세요. 학생에게 그대로 보여요.");
      return;
    }
    setBusy(next);
    try {
      const { error } = await supabase
        .from("middle_essay_wizard")
        .update({
          concept_status: next,
          concept_feedback: comment.trim() || null,
          concept_checked_at: new Date().toISOString(),
        })
        .eq("essay_id", essayId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["concept-check", essayId] });
    } catch (e: any) {
      alert(`저장하지 못했어요.\n${e.message ?? e}`);
    } finally {
      setBusy("");
    }
  };

  if (!wiz || !concept?.career) {
    return (
      <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-4 text-[11.5px] text-ink-muted">
        🧭 컨셉 확인 — 학생이 아직 3단계에서 컨셉을 정하지 않았어요.
      </div>
    );
  }

  const badge =
    status === "pending"
      ? { text: "확인 대기", cls: "bg-amber-50 text-amber-700 border-amber-300" }
      : status === "approved"
        ? { text: "✓ 진행 확인함", cls: "bg-emerald-50 text-emerald-700 border-emerald-300" }
        : status === "rejected"
          ? { text: "다시 정하게 함", cls: "bg-red-50 text-red-700 border-red-200" }
          : { text: "아직 안 넘어옴", cls: "bg-gray-50 text-ink-muted border-line" };

  return (
    <div
      className="rounded-xl mb-5 overflow-hidden"
      style={{ border: `1.5px solid ${status === "pending" ? "#FCD34D" : THEME.accentBorder}` }}
    >
      {/* 머리 */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
        style={{ background: status === "pending" ? "#FFFBEB" : THEME.accentBg }}
      >
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-ink-muted">🧭 컨셉 확인</div>
          <div className="text-[14px] font-extrabold text-ink truncate">
            {concept.career}
            <span className="ml-2 text-[11px] font-semibold text-ink-muted">{SOURCE_KO[concept.source ?? ""] ?? ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10.5px] font-bold border rounded-full px-2 py-0.5 ${badge.cls}`}>{badge.text}</span>
          <span className="text-[11px] text-ink-muted">{open ? "접기 ▲" : "펼치기 ▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 py-4 bg-white">
          {/* 학생이 고른 것 */}
          {concept.label && <div className="text-[12.5px] text-ink-secondary leading-[1.6] mb-3">{concept.label}</div>}
          {testConcept?.career && concept.source !== "test" && (
            <div className="text-[11px] text-ink-muted mb-3">
              참고 · 진로 계열 검사 결과는 <strong className="text-ink-secondary">{testConcept.career}</strong>
              {testConcept.major ? ` (${testConcept.major})` : ""}
            </div>
          )}

          {/* 학생 활동 */}
          <div className="grid gap-3 md:grid-cols-2 mb-4">
            <div>
              <div className="text-[11px] font-bold text-ink-secondary mb-1.5">나의 키워드</div>
              <div className="flex flex-wrap gap-1.5">
                {keywords.length ? (
                  keywords.map((k, i) => (
                    <span key={i} title={k.experience} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 border border-line text-ink-secondary">
                      #{k.keyword}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-ink-muted">없음</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-ink-secondary mb-1.5">꺼낸 활동 {experiences.length}개</div>
              <div className="max-h-[180px] overflow-y-auto pr-1 grid gap-1">
                {experiences.map((e, i) => {
                  const sup = review && !reviewIsStale && review.support.some((x) => x.includes(e.text) || e.text.includes(x));
                  return (
                    <div key={i} className="text-[11.5px] leading-[1.5] flex gap-1.5">
                      <span className="text-ink-muted flex-shrink-0">{e.branch}</span>
                      <span style={{ color: sup ? THEME.accentDark : "#374151", fontWeight: sup ? 700 : 500 }}>
                        {sup ? "✓ " : ""}{e.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI 피드백 */}
          <div className="rounded-lg border border-line px-3.5 py-3 mb-4 bg-gray-50">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="text-[12px] font-extrabold text-ink">✨ AI 피드백 <span className="font-medium text-ink-muted">· 선생님만 봐요</span></div>
              <button
                type="button"
                onClick={runAi}
                disabled={busy !== "" || experiences.length < 3}
                className="h-8 px-3 rounded-lg text-[11.5px] font-bold text-white disabled:opacity-50"
                style={{ background: THEME.accent }}
              >
                {busy === "ai" ? "분석 중..." : review ? "다시 분석" : "AI 피드백 받기"}
              </button>
            </div>

            {!review ? (
              <div className="text-[11.5px] text-ink-muted leading-[1.6]">
                {experiences.length < 3
                  ? "학생이 꺼낸 활동이 3개 미만이라 분석할 수 없어요."
                  : "버튼을 누르면 이 컨셉이 학생 활동과 맞는지, 학생에게 어울리는지 정리해 드려요."}
              </div>
            ) : (
              <div className="mt-2">
                {reviewIsStale && (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mb-2">
                    학생이 컨셉을 바꿨어요. 아래는 예전 컨셉({review.career}) 분석이에요. 다시 분석해 주세요.
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className="text-[11px] font-bold rounded-full px-2 py-0.5"
                    style={{ background: VERDICT_UI[review.verdict].bg, color: VERDICT_UI[review.verdict].fg, border: `1px solid ${VERDICT_UI[review.verdict].border}` }}
                  >
                    {VERDICT_UI[review.verdict].label}
                  </span>
                  <span className="text-[11px] font-bold text-ink-secondary">적합도 {review.fit}%</span>
                  {wiz.concept_review_at && (
                    <span className="text-[10px] text-ink-muted">{new Date(wiz.concept_review_at).toLocaleDateString("ko-KR")}</span>
                  )}
                </div>
                {review.headline && <div className="text-[13px] font-bold text-ink mb-1">{review.headline}</div>}
                {review.summary && <div className="text-[12px] text-ink-secondary leading-[1.65] mb-2.5">{review.summary}</div>}

                <div className="grid gap-2.5 md:grid-cols-2">
                  {review.support.length > 0 && (
                    <div>
                      <div className="text-[10.5px] font-bold text-emerald-700 mb-1">받쳐 주는 활동</div>
                      {review.support.map((x, i) => (
                        <div key={i} className="text-[11.5px] text-ink leading-[1.55]">· {x}</div>
                      ))}
                    </div>
                  )}
                  {review.unrelated.length > 0 && (
                    <div>
                      <div className="text-[10.5px] font-bold text-ink-muted mb-1">거리가 먼 활동</div>
                      {review.unrelated.map((x, i) => (
                        <div key={i} className="text-[11.5px] text-ink-muted leading-[1.55]">· {x}</div>
                      ))}
                    </div>
                  )}
                </div>

                {review.gap && <div className="text-[11.5px] text-amber-700 leading-[1.55] mt-2">부족한 점 · {review.gap}</div>}

                {review.alternatives.length > 0 && (
                  <div className="mt-2.5 bg-white border border-line rounded-md px-3 py-2">
                    <div className="text-[10.5px] font-bold text-ink-secondary mb-1">더 어울릴 수 있는 쪽</div>
                    {review.alternatives.map((a, i) => (
                      <div key={i} className="text-[11.5px] leading-[1.55]">
                        <strong className="text-ink">{a.career}</strong>
                        <span className="text-ink-secondary"> — {a.why}</span>
                      </div>
                    ))}
                  </div>
                )}

                {review.questions.length > 0 && (
                  <div className="mt-2.5">
                    <div className="text-[10.5px] font-bold text-ink-secondary mb-1">학생에게 물어볼 것</div>
                    {review.questions.map((q, i) => (
                      <div key={i} className="text-[11.5px] text-ink leading-[1.55]">· {q}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 선생님 판단 */}
          {status !== "pending" && wiz.concept_feedback && (
            <div className="text-[11.5px] text-ink-secondary bg-gray-50 border border-line rounded-md px-3 py-2 mb-2 whitespace-pre-wrap">
              <span className="font-bold">보낸 한마디 · </span>{wiz.concept_feedback}
            </div>
          )}
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] font-bold text-ink-secondary">학생에게 보낼 한마디</div>
            {review?.studentMessage && (
              <button type="button" onClick={() => setComment(review.studentMessage)} className="text-[10.5px] font-bold" style={{ color: THEME.accent }}>
                AI 초안으로 채우기
              </button>
            )}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="예) 동아리 활동이 이 컨셉과 잘 이어져요. 매칭할 때 동아리 경험을 지원동기에 꼭 넣어 보세요."
            className="w-full border border-line rounded-lg px-3 py-2 text-[12px] leading-[1.6] outline-none resize-y focus:border-emerald-500"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => decide("rejected")}
              disabled={busy !== ""}
              className="h-9 px-4 rounded-lg text-[12px] font-bold bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {busy === "rejected" ? "보내는 중..." : "다시 정하게 하기"}
            </button>
            <button
              type="button"
              onClick={() => decide("approved")}
              disabled={busy !== ""}
              className="h-9 px-4 rounded-lg text-[12px] font-bold text-white disabled:opacity-50"
              style={{ background: THEME.accent }}
            >
              {busy === "approved" ? "보내는 중..." : "이 컨셉으로 진행"}
            </button>
          </div>
          {status !== "pending" && (
            <div className="text-[10.5px] text-ink-muted text-right mt-1">이미 판단했어도 다시 누르면 바뀌어요.</div>
          )}
        </div>
      )}
    </div>
  );
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

  // 🎯 현재 학교의 문항들
  const SECTIONS: SectionDef[] = selEssay ? getSectionsForSchool(selEssay.school) : DEFAULT_SECTIONS;

  useEffect(() => {
    if (!selEssay || essayAiCounts.length === 0) return;
    essayAiCounts.forEach((row: any) => {
      if (row.result) setAiResults((prev) => ({ ...prev, [row.section_key]: row.result }));
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
      await addSectionFb.mutateAsync({ essay_id: selEssay.id, section_key: key, text });
      setNewSectionFbs((prev) => ({ ...prev, [key]: "" }));
    } catch (e: any) {
      alert(`피드백 저장 실패: ${e.message}`);
    }
  };

  const handleUpdateSectionFb = async () => {
    if (!editingText.trim() || !editingSection) return;
    try {
      await updateSectionFb.mutateAsync({ feedback_id: editingSection.id, text: editingText });
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
    if (!confirm("예상질문을 생성하면 학생이 자소서를 더 이상 수정할 수 없어요.\n\n계속하시겠어요?")) return;
    try {
      // 🎯 학교 문항(label) → 내용 매핑으로 동적 전달
      const sectionsForAi: Record<string, string> = {};
      SECTIONS.forEach((s) => {
        sectionsForAi[s.aiKey] = (selEssay.content as any)?.[s.key] || "";
      });
      const generated = await generateQuestionsAi.mutateAsync({
        schoolName: selEssay.school,
        studentName: student?.name,
        sections: sectionsForAi as any,
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

  const toggleAiPanel = async (sectionKey: string, round: number) => {
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

    // 🎯 차수당 1회. 2차 피드백 중이면 누적 2회까지만 허용 (총 상한은 MAX_ESSAY_AI_COUNT)
    const roundLimit = Math.min(round, MAX_ESSAY_AI_COUNT);
    if ((countRow?.count || 0) >= roundLimit) {
      if (countRow?.result) setAiResults((prev) => ({ ...prev, [sectionKey]: countRow.result }));
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
        round,
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

  // 🎯 AI 분석 화면에 보이는 내용을 빠짐없이 피드백 입력란으로 옮긴다.
  //    선생님이 지우거나 고쳐 쓰는 건 자유. 모자란 것보다 넘치는 게 낫다.
  const writeAiFeedback = (sectionKey: string) => {
    const result = aiResults[sectionKey];
    if (!result) {
      alert("먼저 AI 분석을 받아주세요.");
      return;
    }

    const fb = result.feedback;
    const cp = result.concept;
    const co = result.coaching;
    const L: string[] = [];
    const levelKo = (lv: string) => (lv === "high" ? "충분" : lv === "low" ? "미흡" : "보통");
    const verdictKo = (v: string) =>
      v === "go" ? "이 소재로 간다" : v === "change" ? "이 소재는 바꾼다" : "둘 중 고민";

    // ── 컨셉·직업군
    if (cp?.label || cp?.career) {
      L.push("【컨셉】");
      if (cp.label) L.push(cp.label);
      if (cp.career) L.push(`희망 직업군: ${cp.career}`);
      if (cp.basis) L.push(`(근거: ${cp.basis})`);
      L.push("");
    }

    // ── 소재 판정
    if (cp?.materials?.length) {
      L.push("【소재 판정】");
      cp.materials.forEach((m) => {
        L.push(`· ${m.name} → ${verdictKo(m.verdict)}`);
        if (m.reason) L.push(`  ${m.reason}`);
        if (m.alternative) L.push(`  대안: ${m.alternative}`);
      });
      L.push("");
    }

    // ── 완성도
    if (fb?.completeness != null) {
      const to = co?.expectedTo;
      L.push(
        `【현재 완성도 ${fb.completeness}%${fb.statusLabel ? ` · ${fb.statusLabel}` : ""}】` +
          (to && to > fb.completeness ? ` → 보완하면 ${to}%` : "")
      );
    }
    if (fb?.summary) L.push(fb.summary);
    L.push("");

    // ── 문항 기준 충족도
    if (fb?.criteria?.length) {
      L.push("【문항 기준 충족도】");
      fb.criteria.forEach((c) => {
        L.push(`· ${c.label}: ${levelKo(c.level)}${c.desc ? ` — ${c.desc}` : ""}`);
      });
      L.push("");
    }

    // ── 문장별 진단 (원문 인용까지)
    const strengths = fb?.quotes?.filter((q) => q.type === "strength") ?? [];
    const weaks = fb?.quotes?.filter((q) => q.type === "weak") ?? [];
    const missings = fb?.quotes?.filter((q) => q.type === "missing") ?? [];

    if (strengths.length) {
      L.push("【잘한 점】");
      strengths.forEach((q) => {
        L.push(`· "${q.text}"`);
        if (q.comment) L.push(`  → ${q.comment}`);
      });
      L.push("");
    }
    if (weaks.length) {
      L.push("【보완하면 좋은 점】");
      weaks.forEach((q) => {
        L.push(`· "${q.text}"`);
        if (q.comment) L.push(`  → ${q.comment}`);
      });
      L.push("");
    }
    if (missings.length) {
      L.push("【빠진 내용】");
      missings.forEach((q) => L.push(`· ${q.comment || q.text}`));
      L.push("");
    }

    // ── 지도 순서 (선생님이 던질 질문)
    if (co?.steps?.length) {
      L.push("【지도 순서】");
      co.steps.forEach((st, i) => {
        L.push(`${st.order || i + 1}. ${st.title}${st.priority === "urgent" ? " (시급)" : ""}`);
        if (st.why) L.push(`   왜: ${st.why}`);
        if (st.askText) L.push(`   질문: "${st.askText}"`);
        if (st.followUp) L.push(`   이어서: ${st.followUp}`);
      });
      L.push("");
    }

    // ── 폴백 (구버전 응답)
    if (L.length === 0) {
      if (result.summary) L.push(result.summary);
      (result.improvements ?? []).forEach((x) => L.push(`· ${x}`));
    }

    setNewSectionFbs((prev) => ({
      ...prev,
      [sectionKey]: L.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    }));
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

  const essayWritten = hasAnyContent(selEssay.content);

  return (
    <>
      <div className="px-5 py-4 border-b border-line flex-shrink-0">
        {selEssay.delete_requested && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <div className="text-[12px] font-bold text-amber-800">학생이 자소서 삭제를 요청했어요</div>
                <div className="text-[10px] text-amber-700 mt-0.5">
                  요청일: {selEssay.delete_requested_at ? new Date(selEssay.delete_requested_at).toLocaleDateString("ko-KR") : "-"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRejectDelete} disabled={rejectDelete.isPending} className="px-3 py-1.5 bg-white border border-line rounded-md text-[11px] font-bold text-ink-secondary hover:bg-gray-50 transition-all disabled:opacity-50">
                {rejectDelete.isPending ? "처리 중..." : "❌ 거부"}
              </button>
              <button onClick={handleApproveDelete} disabled={approveDelete.isPending} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-[11px] font-bold transition-all hover:-translate-y-px disabled:opacity-50">
                {approveDelete.isPending ? "삭제 중..." : "✅ 삭제 승인"}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[17px] font-extrabold text-ink tracking-tight">🏫 {selEssay.school}</div>
              {selEssay.version > 1 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                  v{selEssay.version}
                </span>
              )}
              {selEssay.essay_completed && !selEssay.questions_generated && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-full px-2 py-0.5">✓ 학생 완료</span>
              )}
              {selEssay.questions_generated && (
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-300 rounded-full px-2 py-0.5">🔒 잠김</span>
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
              <button onClick={handleGenerateQuestions} disabled={generateQuestionsAi.isPending} className="px-3 py-2 text-white rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px disabled:opacity-50" style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
                {generateQuestionsAi.isPending ? "🤖 AI 생성 중..." : "✨ AI로 예상질문 생성"}
              </button>
            )}
            {!selEssay.questions_generated && !selEssay.essay_completed && essayWritten && (
              <span className="px-3 py-2 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">⏳ 학생이 작성중</span>
            )}
            {selEssay.questions_generated && (
              <span className="px-3 py-2 rounded-lg text-[11px] font-bold" style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>✓ 질문생성완료</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <ConceptCheckCard essayId={selEssay.id} schoolName={selEssay.school} studentId={student?.id} />
        {!essayWritten ? (
          <div className="bg-gray-50 border border-line rounded-xl px-4 py-12 text-center">
            <div className="text-4xl mb-3">📝</div>
            <div className="text-[14px] font-bold text-ink-secondary">학생이 아직 자소서를 작성하지 않았어요</div>
          </div>
        ) : (
          <div>
            <div className="text-right text-[11px] font-semibold text-ink-muted mb-3">총 {countChars(selEssay.content)} / 1,500자</div>
            {SECTIONS.map((s) => {
              const currentContent = (selEssay.content as any)[s.key];
              const answers = answersBySection[s.key] || [];
              const sectionFbs = feedbackBySection[s.key] || [];
              if (!currentContent && answers.length === 0) return null;

              const lastAnswerRound = answers.length > 0 ? Math.max(...answers.map((a) => a.round)) : 0;
              const lastFeedbackRound = sectionFbs.length > 0 ? Math.max(...sectionFbs.map((f) => f.round)) : 0;
              const maxRound = Math.max(lastAnswerRound, lastFeedbackRound);
              // 🎯 4차까지만. 4차 피드백이 끝나면 이 문항은 마무리된다.
              const isRoundDone = lastFeedbackRound >= MAX_ESSAY_ROUND;
              const canWriteNextFb =
                !isRoundDone &&
                (lastAnswerRound > lastFeedbackRound ||
                  (currentContent && answers.length === 0 && sectionFbs.length === 0));
              const nextFbRound = Math.min(Math.max(lastAnswerRound, 1), MAX_ESSAY_ROUND);
              const roundDef = getRoundDef(nextFbRound);
              const sectionAiCount = getEssayAiCount(s.key);
              // 🎯 이번 차수에서 이미 썼는지 (총량이 아니라 차수 기준)
              const sectionAiExhausted = sectionAiCount >= Math.min(nextFbRound, MAX_ESSAY_AI_COUNT);

              return (
                <div key={s.key} className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[12px] font-extrabold tracking-tight" style={{ color: THEME.accentDark }}>{s.label}</div>
                    {answers.length > 1 && (<span className="text-[10px] font-semibold text-ink-muted">총 {answers.length}차</span>)}
                  </div>

                  {currentContent && answers.length === 0 && (
                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-1.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded-full" style={{ background: THEME.accent }}>학생 자소서</span>
                        <span className="text-[10px] font-semibold text-ink-muted">{currentContent.length}자</span>
                      </div>
                      <div className="text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">{currentContent}</div>
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
                                <span className="text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded-full" style={{ background: THEME.accent }}>
                                  {round === 1 ? "1차 자소서 작성" : `${round}차 자소서 수정`}
                                </span>
                                <span className="text-[9px] font-semibold text-ink-muted">{new Date(ans.created_at).toLocaleDateString("ko-KR")}</span>
                              </div>
                              <span className="text-[10px] font-semibold text-ink-muted">{ans.content.length}자</span>
                            </div>
                            <div className="text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">{ans.content}</div>
                          </div>
                        )}
                        {fb && (
                          <div className="rounded-md px-3 py-2.5 ml-3 mb-1.5" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}80` }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-extrabold text-white px-1.5 py-0.5 rounded-full" style={{ background: THEME.accent }}>{fb.round}차 피드백</span>
                                <span className="text-[9px] font-semibold text-ink-muted">{new Date(fb.created_at).toLocaleDateString("ko-KR")}</span>
                              </div>
                              {!(editingSection?.key === s.key && editingSection?.id === fb.id) && (
                                <div className="flex gap-1">
                                  <button onClick={() => { setEditingSection({ key: s.key, id: fb.id }); setEditingText(fb.text); }} className="text-[9px] text-ink-secondary hover:text-ink">✏️</button>
                                  <button onClick={() => handleDeleteSectionFb(fb.id)} className="text-[9px] text-red-500 hover:text-red-700">🗑️</button>
                                </div>
                              )}
                            </div>
                            {editingSection?.key === s.key && editingSection?.id === fb.id ? (
                              <>
                                <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={2} className="w-full border border-line rounded px-2 py-1.5 text-[11.5px] font-medium outline-none resize-y leading-[1.6] bg-white" onFocus={handleTextareaFocus} onBlur={handleTextareaBlur} />
                                <div className="flex gap-1 justify-end mt-1">
                                  <button onClick={() => { setEditingSection(null); setEditingText(""); }} className="px-2 py-0.5 bg-white text-ink-secondary border border-line rounded text-[9px] font-bold">취소</button>
                                  <button onClick={handleUpdateSectionFb} disabled={updateSectionFb.isPending} className="px-2 py-0.5 text-white rounded text-[9px] font-bold disabled:opacity-50" style={{ background: THEME.accent }}>
                                    {updateSectionFb.isPending ? "..." : "💾"}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="text-[11.5px] font-medium leading-[1.6] whitespace-pre-wrap" style={{ color: THEME.accentDark }}>{fb.text}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {canWriteNextFb && (
                    <div className="bg-white rounded-md p-2 mt-2" style={{ border: `1px dashed ${THEME.accent}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[9px] font-bold" style={{ color: THEME.accent }}>➕ {nextFbRound}차 · {roundDef.short}</div>
                        {s.aiKey && (
                          <button
                            onClick={() => {
                              if (sectionAiExhausted && !aiResults[s.key]) {
                                alert(`${nextFbRound}차에서는 AI 분석을 이미 사용했어요.\n학생이 다음 차수 자소서를 내면 다시 쓸 수 있어요.`);
                                return;
                              }
                              toggleAiPanel(s.key, nextFbRound);
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
                      {/* 🎯 이번 차수에 무엇을 보는지 — 선생님마다 제각각 첨삭하지 않도록 */}
                      <div className="rounded-md px-2.5 py-2 mb-1.5" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                        <div className="text-[10px] font-extrabold mb-1" style={{ color: THEME.accentDark }}>{roundDef.title}</div>
                        <div className="text-[10px] leading-[1.55] mb-1.5" style={{ color: THEME.accentDark }}>{roundDef.feedbackStyle}</div>
                        <div className="text-[9.5px] leading-[1.5] text-amber-700 mb-1">🚫 {roundDef.notDoing}</div>
                        <div className="text-[9.5px] leading-[1.5] text-ink-secondary">✅ 통과 기준 — {roundDef.passCriteria.join(" / ")}</div>
                      </div>
                      <textarea
                        value={newSectionFbs[s.key] || ""}
                        onChange={(e) => setNewSectionFbs((prev) => ({ ...prev, [s.key]: e.target.value }))}
                        placeholder={`${nextFbRound}차 · ${roundDef.short} — 피드백을 작성해주세요...`}
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

                  {!canWriteNextFb && !isRoundDone && lastFeedbackRound >= lastAnswerRound && lastFeedbackRound > 0 && (
                    <div className="bg-gray-50 border border-line rounded-md px-3 py-2 mt-2 text-center">
                      <div className="text-[10px] font-medium text-ink-muted">
                        ⏳ 학생이 {lastFeedbackRound + 1}차 · {getRoundDef(lastFeedbackRound + 1).short} 작성을 기다리고 있어요
                      </div>
                    </div>
                  )}

                  {isRoundDone && (
                    <div className="rounded-md px-3 py-2 mt-2 text-center" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}80` }}>
                      <div className="text-[10px] font-bold" style={{ color: THEME.accentDark }}>
                        ✅ {MAX_ESSAY_ROUND}차까지 완료 — 이 문항은 마무리됐어요
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 자소서 AI 분석 사이드 패널 (2단: 학생 진단 | 선생님 코칭) */}
      {showAiPanel && aiPanelSection && (
        <EssayAnalysisPanel
          sectionLabel={SECTIONS.find((s) => s.key === aiPanelSection)?.label ?? ""}
          usedCount={getEssayAiCount(aiPanelSection)}
          maxCount={MAX_ESSAY_AI_COUNT}
          isLoading={analyzeSection.isPending}
          result={aiResults[aiPanelSection]}
          onClose={() => setShowAiPanel(false)}
          onUseFeedback={() => {
            writeAiFeedback(aiPanelSection);
            setShowAiPanel(false);
          }}
        />
      )}
    </>
  );
}