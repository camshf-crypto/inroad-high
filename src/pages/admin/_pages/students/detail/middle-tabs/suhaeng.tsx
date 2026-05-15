import { useState, useEffect, useMemo } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase";
import {
  useStudentSuhaengSubmissions,
  useSubmissionFeedback,
  useSaveAiAnalysis,
  useSaveFirstFeedback,
  useSaveFinalFeedback,
} from "@/pages/admin/_hooks/middle/useStudentSuhaeng";

const THEME = {
  accent: "#059669",
  accentDark: "#065F46",
  accentBg: "#ECFDF5",
  accentBorder: "#6EE7B7",
  accentLight: "#D1FAE5",
  accentShadow: "rgba(16, 185, 129, 0.15)",
};

const STEP_LABELS = ["학생 답안", "AI 분석", "1차 피드백", "재제출 → 최종"];

const EVAL_CRITERIA: Record<string, { name: string; max: number; standard: number }[]> = {
  논술형: [
    { name: "구조", max: 100, standard: 80 },
    { name: "주장의 명확성", max: 100, standard: 85 },
    { name: "근거의 구체성", max: 100, standard: 75 },
    { name: "문장력", max: 100, standard: 70 },
  ],
  서술형: [
    { name: "핵심 개념", max: 100, standard: 90 },
    { name: "정확성", max: 100, standard: 85 },
    { name: "간결성", max: 100, standard: 80 },
  ],
  주제탐구: [
    { name: "자료 조사", max: 100, standard: 80 },
    { name: "분석력", max: 100, standard: 75 },
    { name: "결론 도출", max: 100, standard: 80 },
    { name: "형식", max: 100, standard: 70 },
  ],
  구술발표: [
    { name: "내용", max: 100, standard: 85 },
    { name: "구성", max: 100, standard: 80 },
    { name: "전달력", max: 100, standard: 75 },
  ],
  탐구수행: [
    { name: "가설", max: 100, standard: 75 },
    { name: "실험 설계", max: 100, standard: 80 },
    { name: "결과 해석", max: 100, standard: 80 },
    { name: "결론", max: 100, standard: 75 },
  ],
};

function getFunctionNameByType(questionType: string): string | null {
  switch (questionType) {
    case "논술형": return "middle-suhaeng-essay";
    case "서술형": return "middle-suhaeng-short";
    case "주제탐구": return "middle-suhaeng-research";
    case "구술발표": return "middle-suhaeng-presentation";
    case "탐구수행": return "middle-suhaeng-experiment";
    default: return null;
  }
}

type SubmissionStatus = "pending" | "analyzed" | "first_done" | "resubmitted" | "completed" | "not_submitted";
interface ScoreSection { label: string; score: number; max: number; desc: string; }
interface ComparisonAnalysis {
  isComparison: true;
  improvedPoints: string[];
  remainingIssues: string[];
  comparisonSummary: string;
  teacherDraft: string;
}
interface AiAnalysis {
  evalCriteria: string;
  studentScores: number[];
  scores: ScoreSection[];
  summary: string;
  strengths: string[];
  improvements: string[];
  totalScore: number;
  maxScore: number;
  second: ComparisonAnalysis | null;
  teacherDraft?: string;
}
interface Submission {
  id: string;
  questionType: string;
  category: string;
  schoolName: string;
  subject: string;
  title: string;
  questionContent: string;
  ratio: number;
  minChars?: number;
  maxChars?: number;
  studentAnswer: string;
  audioUrl: string | null;
  videoUrl: string | null;
  photoUrls: string[] | null;
  submittedAt: string;
  status: SubmissionStatus;
  aiAnalysis: AiAnalysis | null;
  teacherFirstFeedback: string;
  studentResubmission: string;
  teacherFinalFeedback: string;
}

const dbToSubmission = (db: any, fb: any | null): Submission => {
  let studentAnswer = "";
  if (db.answer_text) {
    studentAnswer = db.answer_text;
  } else if (db.answer_sections) {
    const sections = db.answer_sections as Record<string, string>;
    studentAnswer = Object.entries(sections).map(([key, value]) => {
      const labelMap: Record<string, string> = {
        background: "1. 탐구 배경", method: "2. 조사 방법", content: "3. 조사 내용",
        analysis: "4. 분석 및 결론", reference: "5. 참고 자료", purpose: "실험 목적",
        hypothesis: "가설", materials: "준비물", procedure: "실험 과정",
        result: "결과 및 데이터", conclusion: "결론", topic: "발표 주제", script: "발표 원고",
      };
      return `[${labelMap[key] || key}]\n${value}`;
    }).join("\n\n");
  }
  return {
    id: db.id,
    questionType: db.question_type || "논술형",
    category: db.question_category || "practice",
    schoolName: db.question_school_name || "",
    subject: db.question_subject || "",
    title: db.question_title || "",
    questionContent: db.question_content || "",
    ratio: db.question_ratio || 0,
    minChars: db.question_min_chars,
    maxChars: db.question_max_chars,
    studentAnswer,
    audioUrl: db.answer_audio_url ?? null,
    videoUrl: db.answer_video_url ?? null,
    photoUrls: db.answer_photo_urls ?? null,
    submittedAt: db.submitted_at
      ? new Date(db.submitted_at).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(/\. /g, ".").replace(".,", ",")
      : "",
    status: db.status,
    aiAnalysis: fb?.ai_analysis ?? null,
    teacherFirstFeedback: fb?.teacher_first_feedback || "",
    studentResubmission: db.resubmitted_text || "",
    teacherFinalFeedback: fb?.teacher_final_feedback || "",
  };
};

type CategoryTab = "school" | "academy";

export default function MiddleSuhaengTab({ student }: { student: any }) {
  const studentId = student?.id ? String(student.id) : undefined;
  const { data: dbSubmissions = [], isLoading } = useStudentSuhaengSubmissions(studentId);

  const [categoryTab, setCategoryTab] = useState<CategoryTab>("school");
  const [selSubId, setSelSubId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [firstFbText, setFirstFbText] = useState("");
  const [finalFbText, setFinalFbText] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTab, setAiTab] = useState<"first" | "second">("first");
  const [secondAiLoading, setSecondAiLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [localAiAnalysis, setLocalAiAnalysis] = useState<Map<string, AiAnalysis>>(new Map());

  const { data: selFeedback } = useSubmissionFeedback(selSubId ?? undefined);

  const submissions: Submission[] = useMemo(() => {
    return dbSubmissions.map((db: any) => {
      const fb = db.id === selSubId ? selFeedback : null;
      const sub = dbToSubmission(db, fb);
      const local = localAiAnalysis.get(db.id);
      if (local && !sub.aiAnalysis) sub.aiAnalysis = local;
      if (local?.second && sub.aiAnalysis && !sub.aiAnalysis.second) {
        sub.aiAnalysis = { ...sub.aiAnalysis, second: local.second };
      }
      return sub;
    });
  }, [dbSubmissions, selSubId, selFeedback, localAiAnalysis]);

  const schoolSubs = useMemo(() =>
    submissions.filter(s => s.status !== "not_submitted" && s.category === "school"),
    [submissions]
  );
  const academySubs = useMemo(() =>
    submissions.filter(s => s.status !== "not_submitted" && s.category === "academy"),
    [submissions]
  );
  const filteredSubs = categoryTab === "school" ? schoolSubs : academySubs;

  useEffect(() => {
    if (filteredSubs.length > 0) {
      const first = filteredSubs[0];
      setSelSubId(first.id);
      setFirstFbText(first.teacherFirstFeedback || "");
      setFinalFbText(first.teacherFinalFeedback || "");
      setShowAiPanel(false);
    } else {
      setSelSubId(null);
    }
  }, [categoryTab]);

  useEffect(() => {
    if (!selSubId && filteredSubs.length > 0) {
      setSelSubId(filteredSubs[0].id);
    }
  }, [filteredSubs.length, selSubId]);

  const saveAi = useSaveAiAnalysis();
  const saveFirst = useSaveFirstFeedback();
  const saveFinal = useSaveFinalFeedback();

  const selSub = submissions.find((s) => s.id === selSubId) ?? null;

  const handleSelect = (sub: Submission) => {
    setSelSubId(sub.id);
    setFirstFbText(sub.teacherFirstFeedback || "");
    setFinalFbText(sub.teacherFinalFeedback || "");
    setShowAiPanel(false);
    setAiTab("first");
  };

  const getStep = (sub: Submission | null) => {
    if (!sub) return 0;
    if (sub.status === "pending") return 1;
    if (sub.status === "analyzed") return 2;
    if (sub.status === "first_done") return 3;
    if (sub.status === "resubmitted" || sub.status === "completed") return 4;
    return 0;
  };

  const runAiAnalysis = async () => {
    if (!selSub) return;
    const fnName = getFunctionNameByType(selSub.questionType);
    if (!fnName) { alert(`${selSub.questionType} 유형의 AI 분석은 아직 준비 중이에요.`); return; }
    if (!selSub.studentAnswer || selSub.studentAnswer.length < 10) { alert("학생 답안이 너무 짧거나 없어요."); return; }
    setAnalyzing(true); setShowAiPanel(true); setAiTab("first");
    try {
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: {
          questionTitle: selSub.title, questionContent: selSub.questionContent,
          questionSubject: selSub.subject, minChars: selSub.minChars, maxChars: selSub.maxChars,
          answerText: selSub.studentAnswer, grade: student?.grade, studentName: student?.name, ratio: selSub.ratio,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "AI 분석 실패");
      const analysis: AiAnalysis = data.analysis;
      setLocalAiAnalysis(prev => { const next = new Map(prev); next.set(selSub.id, analysis); return next; });
      try { await saveAi.mutateAsync({ submission_id: selSub.id, ai_analysis: analysis }); } catch (e) { console.error("AI 분석 저장 실패:", e); }
    } catch (e: any) {
      alert(`AI 분석 실패: ${e?.message || "알 수 없는 오류"}`);
    } finally { setAnalyzing(false); }
  };

  const runSecondAnalysis = async () => {
    if (!selSub) return;
    if (!selSub.studentResubmission || selSub.studentResubmission.length < 10) { alert("학생 재제출 답안이 너무 짧거나 없어요."); return; }
    const fnName = getFunctionNameByType(selSub.questionType);
    if (!fnName) return;
    setSecondAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: {
          questionTitle: selSub.title, questionContent: selSub.questionContent,
          questionSubject: selSub.subject, minChars: selSub.minChars, maxChars: selSub.maxChars,
          answerText: selSub.studentResubmission, grade: student?.grade, studentName: student?.name, ratio: selSub.ratio,
          previousAnswer: selSub.studentAnswer || "", previousFeedback: selSub.teacherFirstFeedback || "",
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "2차 분석 실패");
      const comparison: ComparisonAnalysis = data.analysis;
      setLocalAiAnalysis(prev => {
        const next = new Map(prev);
        const existing = next.get(selSub.id) || selSub.aiAnalysis;
        if (existing) next.set(selSub.id, { ...existing, second: comparison });
        return next;
      });
    } catch (e: any) {
      alert(`2차 분석 실패: ${e?.message || "알 수 없는 오류"}`);
    } finally { setSecondAiLoading(false); }
  };

  const togglePanel = (tab: "first" | "second" = "first") => {
    if (showAiPanel && aiTab === tab) { setShowAiPanel(false); return; }
    setShowAiPanel(true); setAiTab(tab);
    if (tab === "second" && selSub?.studentResubmission && selSub?.aiAnalysis && !selSub.aiAnalysis.second && !secondAiLoading) {
      runSecondAnalysis();
    }
  };

  const generateTeacherDraft = () => {
    if (!selSub?.aiAnalysis) return;
    setDraftLoading(true);
    setTimeout(() => {
      if (aiTab === "first") {
        const draft = selSub.aiAnalysis?.teacherDraft || "";
        if (!draft) { alert("AI 작성 피드백이 없어요. AI 분석을 먼저 다시 시도해주세요."); setDraftLoading(false); return; }
        setFirstFbText(draft);
        alert(`✏️ AI가 1차 피드백을 작성했어요!\n\nStep 3에서 확인하고 수정 후 전달해주세요.`);
      } else {
        const draft = selSub.aiAnalysis?.second?.teacherDraft || "";
        if (!draft) { alert("AI 작성 피드백이 없어요. 2차 AI 분석을 먼저 시도해주세요."); setDraftLoading(false); return; }
        setFinalFbText(draft);
        alert(`✏️ AI가 최종 피드백을 작성했어요!\n\nStep 4에서 확인하고 수정 후 전달해주세요.`);
      }
      setDraftLoading(false);
    }, 300);
  };

  const sendFirstFeedback = async () => {
    if (!firstFbText.trim() || !selSub) return;
    try {
      await saveFirst.mutateAsync({ submission_id: selSub.id, teacher_first_feedback: firstFbText });
      alert("✅ 1차 피드백이 학생에게 전달되었어요!");
    } catch (e: any) { alert(`저장 실패: ${e.message}`); }
  };

  const sendFinalFeedback = async () => {
    if (!finalFbText.trim() || !selSub) return;
    try {
      await saveFinal.mutateAsync({ submission_id: selSub.id, teacher_final_feedback: finalFbText });
      alert("✅ 최종 피드백이 학생에게 전달되었어요!");
    } catch (e: any) { alert(`저장 실패: ${e.message}`); }
  };

  const getRadarData = () => {
    if (!selSub) return [];
    const criteria = EVAL_CRITERIA[selSub.questionType] || [];
    const scores = selSub.aiAnalysis?.studentScores || criteria.map(() => 0);
    return criteria.map((c, i) => ({ subject: c.name, standard: c.standard, student: scores[i] || 0, fullMark: 100 }));
  };

  const getBarData = () => {
    if (!selSub?.aiAnalysis) return [];
    return selSub.aiAnalysis.scores.map((s) => ({ name: s.label, score: s.score, max: s.max, pct: Math.round((s.score / s.max) * 100) }));
  };

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`; };
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; };

  const submittedCount = submissions.filter(s => s.status !== "not_submitted").length;
  const pendingCount = submissions.filter(s => s.status === "pending").length;
  const completedCount = submissions.filter(s => s.status === "completed").length;

  const rawSecond = selSub?.aiAnalysis?.second;
  const secondData = rawSecond ? {
    improvedPoints: Array.isArray((rawSecond as any).improvedPoints) ? (rawSecond as any).improvedPoints : [],
    remainingIssues: Array.isArray((rawSecond as any).remainingIssues) ? (rawSecond as any).remainingIssues : [],
    comparisonSummary: (rawSecond as any).comparisonSummary || (rawSecond as any).structureComment || "",
    teacherDraft: (rawSecond as any).teacherDraft || (rawSecond as any).practiceAnswer || "",
  } : null;

  const secondIsValid = secondData && (secondData.improvedPoints.length > 0 || (secondData?.remainingIssues?.length ?? 0) > 0 || secondData.comparisonSummary);
  const currentRoundHasAnalysis = aiTab === "first" ? !!selSub?.aiAnalysis : !!selSub?.aiAnalysis?.second;
  const currentRoundFeedbackDone = aiTab === "first" ? !!selSub?.teacherFirstFeedback : !!selSub?.teacherFinalFeedback;

  const getStatusInfo = (status: SubmissionStatus) => {
    if (status === "pending" || status === "analyzed") return { label: "⏳ 피드백 대기", bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" };
    if (status === "first_done") return { label: "📩 1차 피드백", bg: THEME.accentBg, color: THEME.accentDark, border: THEME.accentBorder };
    if (status === "resubmitted") return { label: "🔄 재제출됨", bg: "#FED7AA", color: "#9A3412", border: "#FB923C" };
    return { label: "✓ 피드백완료", bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" };
  };

  return (
    <>
      <div className="flex gap-4 h-full overflow-hidden">
        {/* ─── 좌측 사이드바 ─── */}
        <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[16px]">📝</span>
              <div className="text-[15px] font-extrabold text-ink tracking-tight">수행평가</div>
            </div>
            <div className="text-[11px] font-medium text-ink-secondary">
              총 <span className="font-bold" style={{ color: THEME.accent }}>{submittedCount}건</span>
              <span className="mx-1.5 text-ink-muted">·</span>
              대기 <span className="font-bold text-amber-700">{pendingCount}건</span>
              <span className="mx-1.5 text-ink-muted">·</span>
              완료 <span className="font-bold" style={{ color: THEME.accentDark }}>{completedCount}건</span>
            </div>
          </div>

          {/* ⭐ 우리학교 / 학원 탭 */}
          <div className="flex border-b border-line flex-shrink-0">
            <button
              onClick={() => setCategoryTab("school")}
              className="flex-1 py-2.5 text-[12px] font-bold transition-all border-b-2 flex items-center justify-center"
              style={{
                color: categoryTab === "school" ? THEME.accentDark : "#9CA3AF",
                borderColor: categoryTab === "school" ? THEME.accent : "transparent",
                background: categoryTab === "school" ? THEME.accentBg : "transparent",
              }}
            >
              🏫 우리 학교
            </button>
            <button
              onClick={() => setCategoryTab("academy")}
              className="flex-1 py-2.5 text-[12px] font-bold transition-all border-b-2 flex items-center justify-center"
              style={{
                color: categoryTab === "academy" ? THEME.accentDark : "#9CA3AF",
                borderColor: categoryTab === "academy" ? THEME.accent : "transparent",
                background: categoryTab === "academy" ? THEME.accentBg : "transparent",
              }}
            >
              📋 학원
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {isLoading ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">
                <div className="text-2xl mb-2">⏳</div>
                <div className="font-medium">불러오는 중...</div>
              </div>
            ) : filteredSubs.length === 0 ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">
                <div className="text-3xl mb-2">📭</div>
                <div className="font-medium mb-1">
                  {categoryTab === "school" ? "학교 수행평가 제출이 없어요" : "학원 수행평가 제출이 없어요"}
                </div>
              </div>
            ) : (
              filteredSubs.map((sub) => {
                const isSelected = selSubId === sub.id;
                const statusInfo = getStatusInfo(sub.status);
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSelect(sub)}
                    className="w-full rounded-xl px-3 py-3 mb-1.5 text-left transition-all"
                    style={{
                      border: `1.5px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                      background: isSelected ? THEME.accentBg : "#fff",
                      boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : "none",
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                        style={{ background: isSelected ? "#fff" : "#F3F4F6", border: `1px solid ${isSelected ? THEME.accentBorder : "#E5E7EB"}` }}
                      >
                        {categoryTab === "school" ? "🏫" : "📋"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-extrabold leading-[1.35] mb-0.5" style={{ color: isSelected ? THEME.accentDark : "#1a1a1a" }}>
                          {sub.title}
                        </div>
                        <div className="text-[11px] font-medium text-ink-muted mb-1.5">{sub.subject}</div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-ink-secondary">{sub.questionType}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                            style={{ background: statusInfo.bg, color: statusInfo.color, borderColor: `${statusInfo.border}80` }}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─── 가운데 메인 영역 ─── */}
        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
          {!selSub ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">📝</div>
              <div className="text-[14px] font-bold text-ink-secondary">
                {categoryTab === "school" ? "🏫 학교 수행평가 제출이 없어요" : "📋 학원 수행평가 제출이 없어요"}
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 py-5 border-b border-line flex-shrink-0">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-extrabold text-ink tracking-tight">📝</span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                      {selSub.questionType}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: categoryTab === "school" ? "#FEF3C7" : "#EFF6FF", color: categoryTab === "school" ? "#92400E" : "#1D4ED8", border: `1px solid ${categoryTab === "school" ? "#FCD34D" : "#93C5FD"}` }}>
                      {categoryTab === "school" ? `🏫 ${selSub.schoolName || "우리 학교"}` : "📋 학원 수행평가"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { if (selSub.aiAnalysis) { togglePanel("first"); } else { runAiAnalysis(); } }}
                      disabled={analyzing}
                      className="px-4 py-2 rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px disabled:cursor-not-allowed"
                      style={{
                        background: showAiPanel ? THEME.accent : "#fff",
                        color: showAiPanel ? "#fff" : THEME.accent,
                        border: `1.5px solid ${THEME.accent}`,
                        boxShadow: showAiPanel ? `0 4px 12px ${THEME.accentShadow}` : `0 2px 6px ${THEME.accentShadow}`,
                      }}
                    >
                      {analyzing ? "분석 중..." : !selSub.aiAnalysis ? "✨ AI 분석 시작" : `✨ AI 분석 ${showAiPanel ? "닫기" : "보기"}`}
                    </button>
                    <span className="px-4 py-2 rounded-lg text-[13px] font-bold"
                      style={{
                        background: selSub.status === "pending" || selSub.status === "analyzed" ? "#FEF3C7" : THEME.accentBg,
                        color: selSub.status === "pending" || selSub.status === "analyzed" ? "#92400E" : THEME.accentDark,
                        border: `1.5px solid ${selSub.status === "pending" || selSub.status === "analyzed" ? "#FCD34D" : THEME.accentBorder}`,
                      }}>
                      {selSub.status === "pending" || selSub.status === "analyzed" ? "⏳ 피드백 대기"
                        : selSub.status === "first_done" ? "📩 1차 피드백 전달"
                        : selSub.status === "resubmitted" ? "🔄 재제출됨" : "✓ 완료"}
                    </span>
                  </div>
                </div>

                <div className="flex px-8 mb-3">
                  {STEP_LABELS.map((label, i) => {
                    const step = getStep(selSub); const stepNum = i + 1;
                    const isDone = stepNum < step; const isOn = stepNum === step; const active = isDone || isOn;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 relative">
                        {i < STEP_LABELS.length - 1 && (
                          <div className="absolute top-[13px] left-[55%] w-[90%] h-px" style={{ background: isDone ? THEME.accent : "#E5E7EB" }} />
                        )}
                        <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-extrabold z-10 relative border-2"
                          style={{ background: active ? THEME.accent : "#F3F4F6", color: active ? "#fff" : "#9CA3AF", borderColor: active ? THEME.accent : "#E5E7EB" }}>
                          {isDone ? "✓" : stepNum}
                        </div>
                        <div className="text-[11px] font-bold whitespace-nowrap" style={{ color: active ? THEME.accentDark : "#9CA3AF" }}>{label}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                  <div>
                    <div className="text-[15px] font-extrabold text-ink tracking-tight">{selSub.title}</div>
                    <div className="text-[11px] font-medium text-ink-muted mt-0.5 flex items-center gap-2">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full">{selSub.subject}</span>
                      {selSub.ratio > 0 && <span>배점 {selSub.ratio}%</span>}
                      <span>· 📅 제출 {selSub.submittedAt}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">📌 출제 문제</div>
                  <div className="text-[13px] font-medium text-ink leading-[1.7]">{selSub.questionContent}</div>
                  {selSub.minChars && <div className="text-[10px] text-ink-muted mt-2 font-medium">조건: {selSub.minChars}~{selSub.maxChars}자</div>}
                </div>

                <div className="bg-white border border-line rounded-xl px-5 py-4">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-3">📜 답변 · 피드백 히스토리</div>
                  <div className="flex flex-col gap-3.5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 1</span>
                        <span className="text-[11px] font-bold text-ink-secondary">👤 학생 제출 답안</span>
                        <span className="ml-auto text-[10px] text-ink-muted font-medium">{selSub.studentAnswer.length}자</span>
                      </div>
                      <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                        {selSub.studentAnswer || "(텍스트 답변 없음)"}
                      </div>
                      {selSub.audioUrl && (
                        <div className="mt-2">
                          <div className="text-[11px] font-bold text-ink-secondary mb-1">🎙️ 음성 녹음</div>
                          <audio controls src={selSub.audioUrl} className="w-full h-9" />
                        </div>
                      )}
                      {selSub.videoUrl && (
                        <div className="mt-2">
                          <div className="text-[11px] font-bold text-ink-secondary mb-1">📹 발표 영상</div>
                          <video controls src={selSub.videoUrl} className="w-full rounded-lg max-h-48" />
                        </div>
                      )}
                      {selSub.photoUrls && selSub.photoUrls.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[11px] font-bold text-ink-secondary mb-1">📷 첨부 사진 ({selSub.photoUrls.length}장)</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {selSub.photoUrls.map((url: string, idx: number) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`사진 ${idx + 1}`} className="w-full aspect-square object-cover rounded-lg border border-line hover:opacity-90 transition-opacity" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>Step 3</span>
                        <span className="text-[11px] font-bold text-ink-secondary">👨‍🏫 선생님 1차 피드백</span>
                      </div>
                      {selSub.teacherFirstFeedback ? (
                        <div className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8] whitespace-pre-wrap"
                          style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60`, color: THEME.accentDark }}>
                          {selSub.teacherFirstFeedback}
                        </div>
                      ) : (
                        <>
                          <textarea value={firstFbText} onChange={(e) => setFirstFbText(e.target.value)}
                            placeholder={selSub.aiAnalysis ? "직접 피드백을 작성하거나, 우측 'AI 분석 보기'에서 '✏️ 선생님 답변 작성하기' 버튼을 활용하세요..." : "학생 답안에 대한 피드백을 작성해주세요."}
                            rows={5}
                            className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                            onFocus={handleTextareaFocus} onBlur={handleTextareaBlur} />
                          <div className="flex gap-2 mt-2 justify-end">
                            <button onClick={sendFirstFeedback} disabled={!firstFbText.trim()}
                              className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                              style={{ background: firstFbText.trim() ? THEME.accent : "#E5E7EB", color: firstFbText.trim() ? "#fff" : "#9CA3AF", boxShadow: firstFbText.trim() ? `0 4px 12px ${THEME.accentShadow}` : "none" }}>
                              📤 1차 피드백 전달
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {selSub.teacherFirstFeedback && (
                      <div>
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 4</span>
                            <span className="text-[11px] font-bold text-ink-secondary">👤 학생 재제출 답안</span>
                          </div>
                          {selSub.studentResubmission && (
                            <button onClick={() => togglePanel("second")}
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
                              style={{ background: showAiPanel && aiTab === "second" ? THEME.accent : "#fff", color: showAiPanel && aiTab === "second" ? "#fff" : THEME.accent, border: `1px solid ${THEME.accent}` }}>
                              ✨ 2차 AI 분석 {showAiPanel && aiTab === "second" ? "닫기" : "보기"}
                            </button>
                          )}
                        </div>
                        {selSub.studentResubmission ? (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                            {selSub.studentResubmission}
                          </div>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-4 text-[12px] font-medium text-amber-700 text-center">
                            ⏳ 학생이 1차 피드백을 보고 재제출 중이에요
                          </div>
                        )}
                      </div>
                    )}

                    {selSub.studentResubmission && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>Step 4</span>
                          <span className="text-[11px] font-bold text-ink-secondary">👨‍🏫 선생님 최종 피드백</span>
                        </div>
                        {selSub.teacherFinalFeedback ? (
                          <div className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8]"
                            style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60`, color: THEME.accentDark }}>
                            {selSub.teacherFinalFeedback}
                          </div>
                        ) : (
                          <>
                            <textarea value={finalFbText} onChange={(e) => setFinalFbText(e.target.value)}
                              placeholder="재제출된 답안에 대한 최종 피드백을 작성해주세요."
                              rows={4}
                              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                              onFocus={handleTextareaFocus} onBlur={handleTextareaBlur} />
                            <div className="flex justify-end mt-2">
                              <button onClick={sendFinalFeedback} disabled={!finalFbText.trim()}
                                className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                                style={{ background: finalFbText.trim() ? THEME.accent : "#E5E7EB", color: finalFbText.trim() ? "#fff" : "#9CA3AF", boxShadow: finalFbText.trim() ? `0 4px 12px ${THEME.accentShadow}` : "none" }}>
                                📤 최종 피드백 전달
                              </button>
                            </div>
                          </>
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

      {/* ─── AI 분석 패널 ─── */}
      {showAiPanel && selSub && selSub.aiAnalysis && (
        <div className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-line flex flex-col shadow-[-8px_0_24px_rgba(15,23,42,0.08)] z-50">
          <div className="px-4 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">✨ AI 분석</div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">{selSub.title}</div>
            </div>
            <button onClick={() => setShowAiPanel(false)} className="text-ink-muted hover:text-ink text-base w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">✕</button>
          </div>

          <div className="flex border-b border-line flex-shrink-0">
            <button onClick={() => setAiTab("first")}
              className="flex-1 py-3 text-center text-[12px] font-bold transition-all border-b-2"
              style={{ color: aiTab === "first" ? THEME.accentDark : "#9CA3AF", borderColor: aiTab === "first" ? THEME.accent : "transparent", background: aiTab === "first" ? THEME.accentBg : "transparent" }}>
              📊 1차 답변 분석
            </button>
            <button onClick={() => { if (selSub.studentResubmission) togglePanel("second"); }}
              disabled={!selSub.studentResubmission}
              className="flex-1 py-3 text-center text-[12px] font-bold transition-all border-b-2 disabled:cursor-not-allowed"
              style={{ color: !selSub.studentResubmission ? "#D1D5DB" : aiTab === "second" ? THEME.accentDark : "#9CA3AF", borderColor: aiTab === "second" ? THEME.accent : "transparent", background: aiTab === "second" ? THEME.accentBg : "transparent" }}>
              📈 2차 비교 분석
              {!selSub.studentResubmission && <div className="text-[9px]">재제출 필요</div>}
            </button>
          </div>

          {aiTab === "first" && (
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              <div className="rounded-xl px-4 py-3.5" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">✅</span>
                  <div className="text-[13px] font-extrabold" style={{ color: THEME.accentDark }}>답안 정합성 분석</div>
                </div>
                <div className="text-[11px] font-medium text-ink-secondary mb-3">답안을 {selSub.questionType} 평가 기준에 맞춰 분석한 결과입니다.</div>
                <div className="h-[260px] mb-2 bg-white rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={getRadarData()} margin={{ top: 24, right: 40, bottom: 24, left: 40 }}>
                      <PolarGrid stroke="#E5E7EB" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#374151", fontWeight: 600 }} tickLine={false} />
                      <Radar name="평가 기준" dataKey="standard" stroke="#F97316" fill="#F97316" fillOpacity={0.3} strokeWidth={2} />
                      <Radar name="학생 답안" dataKey="student" stroke={THEME.accent} fill={THEME.accent} fillOpacity={0.5} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                {getBarData().map((d, i) => (
                  <div key={i} className="mb-2.5 bg-white rounded-lg px-3 py-2">
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="font-semibold text-ink">{d.name}</span>
                      <span className="font-bold" style={{ color: THEME.accent }}>{d.score}/{d.max}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, background: d.pct >= 80 ? THEME.accent : d.pct >= 60 ? "#F97316" : "#EF4444" }} />
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
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">📝 {selSub.questionType} 평가 기준</div>
                  <div className="text-[12px] font-medium text-ink leading-[1.7]">{selSub.aiAnalysis.evalCriteria}</div>
                </div>
                <div className="mb-3">
                  <div className="text-[12px] font-bold text-ink mb-2">답안 적합성 평가</div>
                  {selSub.aiAnalysis.scores.map((s, i) => (
                    <div key={i} className="mb-2">
                      <div className="text-[12px] font-bold text-ink mb-0.5">{i + 1}. {s.label} ({s.max}점)</div>
                      <div className="text-[12px] font-medium text-ink-secondary leading-[1.6]">{s.desc}</div>
                    </div>
                  ))}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 mt-2">
                    <div className="text-[11px] font-bold text-orange-800 mb-1">📌 평가 요약</div>
                    <div className="text-[12px] font-medium text-orange-900 leading-[1.7]">{selSub.aiAnalysis.summary}</div>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: THEME.accent }}>💪 강점 포인트</div>
                  {selSub.aiAnalysis.strengths.map((s, i) => (
                    <div key={i} className="text-[12px] font-medium leading-[1.6] px-3 py-2 rounded-lg mb-1.5"
                      style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40`, color: THEME.accentDark }}>✓ {s}</div>
                  ))}
                </div>
                <div>
                  <div className="text-[11px] font-extrabold text-red-500 uppercase tracking-wider mb-2">⚡ 개선 포인트</div>
                  {selSub.aiAnalysis.improvements.map((s, i) => (
                    <div key={i} className="text-[12px] font-medium text-red-900 leading-[1.6] px-3 py-2 bg-red-50 border border-red-200 rounded-lg mb-1.5">△ {s}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {aiTab === "second" && (
            secondAiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted">
                <div className="text-3xl animate-pulse">✨</div>
                <div className="text-[13px] font-medium">AI가 1차/2차 답안을 비교 중...</div>
              </div>
            ) : !secondIsValid ? (
              <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px] font-medium px-4 text-center leading-[1.7]">
                재제출 답안이 있어야 2차 분석이 가능해요.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                <div className="rounded-xl px-4 py-3.5" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">🔄</span>
                    <div className="text-[13px] font-extrabold" style={{ color: THEME.accentDark }}>1차 → 2차 비교 요약</div>
                  </div>
                  <div className="text-[12px] font-medium text-ink leading-[1.7] bg-white rounded-lg px-3 py-2.5">{secondData?.comparisonSummary}</div>
                </div>
                <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-sm">📈</span>
                    <div className="text-[13px] font-extrabold" style={{ color: THEME.accent }}>좋아진 점</div>
                  </div>
                  {secondData?.improvedPoints?.length === 0 ? (
                    <div className="text-[12px] font-medium text-ink-muted py-2">AI가 좋아진 점을 찾지 못했어요.</div>
                  ) : (
                    secondData?.improvedPoints?.map((p: string, i: number) => (
                      <div key={i} className="text-[12px] font-medium leading-[1.7] px-3 py-2 rounded-lg mb-1.5"
                        style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40`, color: THEME.accentDark }}>▲ {p}</div>
                    ))
                  )}
                </div>
                {(secondData?.remainingIssues?.length ?? 0) > 0 && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span className="text-sm">⚠️</span>
                      <div className="text-[13px] font-extrabold text-amber-700">아직 보완할 점</div>
                    </div>
                    {secondData?.remainingIssues?.map((p: string, i: number) => (
                      <div key={i} className="text-[12px] font-medium leading-[1.7] px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-1.5 text-amber-900">△ {p}</div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {currentRoundHasAnalysis && !currentRoundFeedbackDone && (
            <div className="px-4 py-3 border-t border-line flex-shrink-0" style={{ background: "#FAFBFC" }}>
              <button onClick={generateTeacherDraft} disabled={draftLoading}
                className="w-full py-3 text-white rounded-lg text-[13px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: draftLoading ? "#A7F3D0" : THEME.accent, boxShadow: !draftLoading ? `0 4px 12px ${THEME.accentShadow}` : "none" }}>
                {draftLoading ? "✨ AI가 답변 작성 중..." : `✏️ 선생님 ${aiTab === "first" ? "1차" : "최종"} 답변 작성하기`}
              </button>
              <div className="text-[10px] text-ink-muted mt-1.5 text-center leading-[1.5]">AI가 분석 결과를 토대로 친근한 코치 말투로 작성해요</div>
            </div>
          )}

          {currentRoundFeedbackDone && (
            <div className="px-4 py-3 border-t border-line flex-shrink-0" style={{ background: THEME.accentBg }}>
              <div className="text-[12px] text-center font-bold" style={{ color: THEME.accentDark }}>
                ✓ 이미 {aiTab === "first" ? "1차" : "최종"} 피드백이 전달되었어요
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}