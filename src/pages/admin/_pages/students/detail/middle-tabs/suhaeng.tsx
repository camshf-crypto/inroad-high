import { useState, useEffect, useMemo } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
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
  gradient: "linear-gradient(135deg, #065F46, #10B981)",
};

const STEP_LABELS = ["학생 답안", "AI 분석", "1차 피드백", "재제출 → 최종"];

const EVAL_CRITERIA: Record<
  string,
  { name: string; max: number; standard: number }[]
> = {
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

type SubmissionStatus =
  | "pending"
  | "analyzed"
  | "first_done"
  | "resubmitted"
  | "completed"
  | "not_submitted";

interface ScoreSection {
  label: string;
  score: number;
  max: number;
  desc: string;
}

interface SecondAnalysis {
  beforeDistribution: {
    factorCode: string;
    factorName: string;
    distribution: number;
    evidence: string;
  }[];
  afterDistribution: {
    factorCode: string;
    factorName: string;
    distribution: number;
    evidence: string;
  }[];
  structureComment: string;
  practiceAnswer: string;
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
  second: SecondAnalysis | null;
}

interface Submission {
  id: string; // ⭐ DB UUID로 변경 (number → string)
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
  submittedAt: string;
  status: SubmissionStatus;
  aiAnalysis: AiAnalysis | null;
  teacherFirstFeedback: string;
  studentResubmission: string;
  teacherFinalFeedback: string;
}

// ⭐ DB row → 화면 Submission 형식으로 변환
const dbToSubmission = (db: any, fb: any | null): Submission => {
  // answer_text가 있으면 그대로, answer_sections가 있으면 합쳐서
  let studentAnswer = "";
  if (db.answer_text) {
    studentAnswer = db.answer_text;
  } else if (db.answer_sections) {
    const sections = db.answer_sections as Record<string, string>;
    studentAnswer = Object.entries(sections)
      .map(([key, value]) => `[${key}]\n${value}`)
      .join("\n\n");
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
    submittedAt: db.submitted_at
      ? new Date(db.submitted_at)
          .toLocaleString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace(/\. /g, ".")
          .replace(".,", ",")
      : "",
    status: db.status,
    aiAnalysis: fb?.ai_analysis ?? null,
    teacherFirstFeedback: fb?.teacher_first_feedback || "",
    studentResubmission: db.resubmitted_text || "",
    teacherFinalFeedback: fb?.teacher_final_feedback || "",
  };
};
const generateAiAnalysis = (sub: Submission): AiAnalysis => {
  if (sub.questionType === "논술형") {
    return {
      evalCriteria:
        "논술형 평가는 구조의 명확성, 주장의 일관성, 근거의 구체성, 문장력을 종합적으로 평가합니다.",
      studentScores: [88, 90, 73, 70],
      scores: [
        {
          label: "구조 (두괄식)",
          score: 9,
          max: 10,
          desc: "주장이 첫 문장에 명확히 제시되어 두괄식 구조가 잘 잡혔다.",
        },
        {
          label: "주장의 명확성",
          score: 9,
          max: 10,
          desc: "입장이 일관되고 양면을 고려한 균형잡힌 논리이다.",
        },
        {
          label: "근거의 구체성",
          score: 11,
          max: 15,
          desc: "근거가 제시되어 있으나 실제 통계나 사례가 부족하다.",
        },
        {
          label: "문장력·맞춤법",
          score: 3,
          max: 5,
          desc: "대체로 자연스러우나 일부 표현이 어색하다.",
        },
      ],
      summary:
        "구조와 주장은 우수하나 근거의 구체성에서 통계·사례 보강이 필요하다.",
      strengths: [
        "두괄식 구조가 명확함 — 첫 문장에서 주장이 분명히 보임",
        "양면을 고려한 논리 — 부작용도 인정하면서 해결책 제시",
        '결론에서 "디지털 시대 생존력"이라는 새로운 관점 제시',
      ],
      improvements: [
        '구체적인 통계나 수치 추가 (예: "한국 청소년의 일평균 SNS 사용시간 ○○분")',
        "본인의 경험 사례 1~2개 더 넣으면 설득력 상승",
        '"양날의 검" 같은 비유 표현은 좋으나, 첫 문장의 임팩트가 약함',
      ],
      totalScore: 32,
      maxScore: sub.ratio,
      second: null,
    };
  }
  if (sub.questionType === "서술형") {
    return {
      evalCriteria:
        "서술형 평가는 핵심 개념의 이해, 정답의 정확성, 표현의 간결성을 중점적으로 평가합니다.",
      studentScores: [92, 85, 80],
      scores: [
        {
          label: "4가지 원리 정의",
          score: 9,
          max: 10,
          desc: "4가지 원리를 모두 정확하게 정의했다.",
        },
        {
          label: "예시의 구체성",
          score: 4,
          max: 5,
          desc: "권력 분립 예시는 적절하나, 더 구체적인 사례가 있으면 좋다.",
        },
        { label: "문장력", score: 4, max: 5, desc: "간결하고 명확하다." },
      ],
      summary: "핵심 개념을 잘 이해하고 있고 구조도 깔끔하나 예시 보강 필요.",
      strengths: [
        "핵심 개념을 정확하게 이해하고 있음",
        "간결한 표현력 — 군더더기 없는 답안",
        "구조가 잘 잡혀 있음",
      ],
      improvements: [
        "예시 부분에서 실제 사례(정부 부처명, 사건)를 추가하면 더 좋음",
        "각 원리간의 관계 언급 (예: 법치주의 → 기본권 보장의 토대)",
      ],
      totalScore: 17,
      maxScore: sub.ratio,
      second: null,
    };
  }
  return {
    evalCriteria: "다양한 평가 기준에 따라 답안을 종합적으로 분석합니다.",
    studentScores: [80, 75, 70, 65],
    scores: [
      { label: "내용", score: 8, max: 10, desc: "내용이 충실하다." },
      { label: "구성", score: 7, max: 10, desc: "구성이 적절하다." },
    ],
    summary: "전반적으로 양호한 답안.",
    strengths: ["내용 충실", "논리 명확"],
    improvements: ["예시 보강 필요"],
    totalScore: Math.floor(sub.ratio * 0.8),
    maxScore: sub.ratio,
    second: null,
  };
};

const generateSecondAnalysis = (): SecondAnalysis => ({
  beforeDistribution: [
    {
      factorCode: "F01",
      factorName: "구조",
      distribution: 30,
      evidence: "두괄식 시도",
    },
    {
      factorCode: "F02",
      factorName: "근거 구체성",
      distribution: 25,
      evidence: "근거 제시 부족",
    },
    {
      factorCode: "F03",
      factorName: "문장력",
      distribution: 25,
      evidence: "비유 표현 사용",
    },
    {
      factorCode: "F04",
      factorName: "결론",
      distribution: 20,
      evidence: "간단한 마무리",
    },
  ],
  afterDistribution: [
    {
      factorCode: "F01",
      factorName: "구조",
      distribution: 30,
      evidence: "구조 유지됨",
    },
    {
      factorCode: "F02",
      factorName: "근거 구체성",
      distribution: 40,
      evidence: "통계·사례 보강됨",
    },
    {
      factorCode: "F03",
      factorName: "문장력",
      distribution: 20,
      evidence: "간결성 향상",
    },
    {
      factorCode: "F04",
      factorName: "결론",
      distribution: 10,
      evidence: "결론 명확화",
    },
  ],
  structureComment:
    "재제출 답안은 근거의 구체성이 크게 향상되었습니다. 통계와 본인 경험이 추가되어 설득력이 높아졌어요. 다만 결론 부분이 짧아져서, 결론에서 다시 한 번 주장을 강조하는 문장을 추가하면 완성도가 더 올라갑니다.",
  practiceAnswer:
    "SNS는 청소년에게 양날의 검과 같다. 나는 청소년의 SNS 사용이 자기 관리만 동반된다면 긍정적인 효과가 더 크다고 생각한다. 한국 청소년의 일평균 SNS 사용시간은 2시간으로, 이를 활용하여 또래와의 소통과 정보 접근성 향상의 기회를 얻을 수 있다. 실제로 나는 SNS를 통해 진로 관련 자료를 찾고 또래와 학습 정보를 공유한 경험이 있다. 물론 중독·사이버폭력의 위험은 있으나, 사용 시간 제한과 미디어 리터러시 교육으로 해결 가능하다. 따라서 SNS는 막을 것이 아니라 올바르게 가르쳐야 할 디지털 시대의 도구이다.",
});

export default function MiddleSuhaengTab({ student }: { student: any }) {
  // ⭐ DB에서 학생 답안 가져오기
  const studentId = student?.id ? String(student.id) : undefined;
  const { data: dbSubmissions = [], isLoading } =
    useStudentSuhaengSubmissions(studentId);

  const [selSubId, setSelSubId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [firstFbText, setFirstFbText] = useState("");
  const [finalFbText, setFinalFbText] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTab, setAiTab] = useState<"first" | "second">("first");
  const [secondAiLoading, setSecondAiLoading] = useState(false);
  const [localAiAnalysis, setLocalAiAnalysis] = useState<
    Map<string, AiAnalysis>
  >(new Map());

  // ⭐ DB row를 화면 형식으로 변환
  // 선택된 답안의 피드백도 가져오기
  const { data: selFeedback } = useSubmissionFeedback(selSubId ?? undefined);

  // ⭐ 모든 답안의 피드백 한번에 가져오기 (간단하게 - 선택된 것만 포함)
  const submissions: Submission[] = useMemo(() => {
    return dbSubmissions.map((db: any) => {
      // 선택된 답안만 피드백 정보 포함
      const fb = db.id === selSubId ? selFeedback : null;
      const sub = dbToSubmission(db, fb);
      // 로컬 AI 분석 (메모리에만)
      const local = localAiAnalysis.get(db.id);
      if (local && !sub.aiAnalysis) {
        sub.aiAnalysis = local;
      }
      return sub;
    });
  }, [dbSubmissions, selSubId, selFeedback, localAiAnalysis]);

  // ⭐ 첫 답안 자동 선택
  useEffect(() => {
    if (!selSubId && submissions.length > 0) {
      setSelSubId(submissions[0].id);
    }
  }, [submissions.length, selSubId]);

  // ⭐ DB 저장 훅
  const saveAi = useSaveAiAnalysis();
  const saveFirst = useSaveFirstFeedback();
  const saveFinal = useSaveFinalFeedback();

  const selSub = submissions.find((s) => s.id === selSubId) ?? null;

  // 제출된 답안만 (미제출은 DB에 row 없으므로 빈 배열)
  const filteredSubs = submissions.filter((s) => s.status !== "not_submitted");
  const notSubmitted: Submission[] = []; // DB엔 미제출 row가 없음

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

  // ⭐ AI 분석 → 로컬 메모리 + DB 저장
  const runAiAnalysis = () => {
    if (!selSub) return;
    setAnalyzing(true);
    setShowAiPanel(true);
    setAiTab("first");
    setTimeout(async () => {
      const analysis = generateAiAnalysis(selSub);
      // 로컬 메모리 업데이트 (즉시 UI 반영)
      setLocalAiAnalysis((prev) => {
        const next = new Map(prev);
        next.set(selSub.id, analysis);
        return next;
      });
      // DB에도 저장
      try {
        await saveAi.mutateAsync({
          submission_id: selSub.id,
          ai_analysis: analysis,
        });
      } catch (e) {
        console.error("AI 분석 저장 실패:", e);
      }
      setAnalyzing(false);
    }, 1500);
  };

  const togglePanel = (tab: "first" | "second" = "first") => {
    if (showAiPanel && aiTab === tab) {
      setShowAiPanel(false);
      return;
    }
    setShowAiPanel(true);
    setAiTab(tab);
    if (tab === "second" && selSub?.aiAnalysis && !selSub.aiAnalysis.second) {
      setSecondAiLoading(true);
      setTimeout(() => {
        const second = generateSecondAnalysis();
        // 로컬 메모리만 업데이트 (2차는 mock으로만)
        setLocalAiAnalysis((prev) => {
          const next = new Map(prev);
          const existing = next.get(selSub.id) || selSub.aiAnalysis;
          if (existing) {
            next.set(selSub.id, { ...existing, second });
          }
          return next;
        });
        setSecondAiLoading(false);
      }, 1200);
    }
  };

  const importAiToFirstFeedback = () => {
    if (!selSub?.aiAnalysis) return;
    const a = selSub.aiAnalysis;
    const text =
      `[총평]\n${a.summary}\n\n` +
      `[잘한 점]\n${a.strengths.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n` +
      `[개선할 점]\n${a.improvements.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    setFirstFbText(text);
  };

  // ⭐ 1차 피드백 → DB 저장
  const sendFirstFeedback = async () => {
    if (!firstFbText.trim() || !selSub) return;
    try {
      await saveFirst.mutateAsync({
        submission_id: selSub.id,
        teacher_first_feedback: firstFbText,
      });
      alert("✅ 1차 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  // ⭐ 최종 피드백 → DB 저장
  const sendFinalFeedback = async () => {
    if (!finalFbText.trim() || !selSub) return;
    try {
      await saveFinal.mutateAsync({
        submission_id: selSub.id,
        teacher_final_feedback: finalFbText,
      });
      alert("✅ 최종 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  const getRadarData = () => {
    if (!selSub) return [];
    const criteria = EVAL_CRITERIA[selSub.questionType] || [];
    const scores = selSub.aiAnalysis?.studentScores || criteria.map(() => 0);
    return criteria.map((c, i) => ({
      subject: c.name,
      standard: c.standard,
      student: scores[i] || 0,
      fullMark: 100,
    }));
  };

  const getBarData = () => {
    if (!selSub?.aiAnalysis) return [];
    return selSub.aiAnalysis.scores.map((s) => ({
      name: s.label,
      score: s.score,
      max: s.max,
      pct: Math.round((s.score / s.max) * 100),
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

  const submittedCount = submissions.filter(
    (s) => s.status !== "not_submitted",
  ).length;
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const completedCount = submissions.filter(
    (s) => s.status === "completed",
  ).length;

  const secondData = selSub?.aiAnalysis?.second || null;

  return (
    <>
      {/* ========== 메인 콘텐츠 (2-pane: 사이드바 + 가운데) ========== */}
      <div className="flex gap-4 h-full overflow-hidden">
        {/* 좌측 사이드바 — 독서리스트 스타일 */}
        <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          {/* 헤더 — 가로 텍스트 통계 */}
          <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[16px]">📝</span>
              <div className="text-[15px] font-extrabold text-ink tracking-tight">
                수행평가
              </div>
            </div>
            <div className="text-[11px] font-medium text-ink-secondary">
              총{" "}
              <span className="font-bold" style={{ color: THEME.accent }}>
                {submittedCount}건
              </span>
              <span className="mx-1.5 text-ink-muted">·</span>
              대기{" "}
              <span className="font-bold text-amber-700">{pendingCount}건</span>
              <span className="mx-1.5 text-ink-muted">·</span>
              완료{" "}
              <span className="font-bold" style={{ color: THEME.accentDark }}>
                {completedCount}건
              </span>
            </div>
          </div>

          {/* 카드 리스트 — 좌측 아이콘 + 우측 정보 (독서리스트 스타일) */}
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
                  아직 제출한 답안이 없어요
                </div>
                <div className="text-[10px] text-ink-muted">
                  학생이 수행평가에 답안을 제출하면 여기에 표시돼요.
                </div>
              </div>
            ) : (
              filteredSubs.map((sub) => {
                const isSelected = selSubId === sub.id;
                const statusInfo =
                  sub.status === "pending"
                    ? {
                        label: "⏳ 피드백 대기",
                        bg: "#FEF3C7",
                        color: "#92400E",
                        border: "#FCD34D",
                      }
                    : sub.status === "analyzed"
                      ? {
                          label: "🤖 AI 분석 완료",
                          bg: "#DBEAFE",
                          color: "#1E40AF",
                          border: "#93C5FD",
                        }
                      : sub.status === "first_done"
                        ? {
                            label: "📩 1차 피드백",
                            bg: THEME.accentBg,
                            color: THEME.accentDark,
                            border: THEME.accentBorder,
                          }
                        : sub.status === "resubmitted"
                          ? {
                              label: "🔄 재제출됨",
                              bg: "#FED7AA",
                              color: "#9A3412",
                              border: "#FB923C",
                            }
                          : {
                              label: "✓ 피드백완료",
                              bg: "#D1FAE5",
                              color: "#065F46",
                              border: "#6EE7B7",
                            };

                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSelect(sub)}
                    className="w-full rounded-xl px-3 py-3 mb-1.5 text-left transition-all"
                    style={{
                      border: `1.5px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                      background: isSelected ? THEME.accentBg : "#fff",
                      boxShadow: isSelected
                        ? `0 2px 8px ${THEME.accentShadow}`
                        : "none",
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* 좌측 아이콘 */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                        style={{
                          background: isSelected ? "#fff" : "#F3F4F6",
                          border: `1px solid ${isSelected ? THEME.accentBorder : "#E5E7EB"}`,
                        }}
                      >
                        📝
                      </div>

                      {/* 우측 정보 */}
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[13px] font-extrabold leading-[1.35] mb-0.5"
                          style={{
                            color: isSelected ? THEME.accentDark : "#1a1a1a",
                          }}
                        >
                          {sub.title}
                        </div>
                        <div className="text-[11px] font-medium text-ink-muted mb-1.5">
                          {sub.category === "school"
                            ? `🏫 ${sub.schoolName}`
                            : "연습 문제"}{" "}
                          · {sub.subject}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-ink-secondary">
                            {sub.questionType}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                            style={{
                              background: statusInfo.bg,
                              color: statusInfo.color,
                              borderColor: `${statusInfo.border}80`,
                            }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}

            {notSubmitted.length > 0 && (
              <>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted mt-4 mb-2 px-1">
                  미제출 ({notSubmitted.length})
                </div>
                {notSubmitted.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-xl px-3 py-3 mb-1.5 bg-gray-50 border border-line opacity-60"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg bg-white border border-line">
                        📝
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-ink-muted leading-[1.35] mb-0.5 line-clamp-2">
                          {sub.title}
                        </div>
                        <div className="text-[11px] font-medium text-ink-muted mb-1.5">
                          {sub.category === "school"
                            ? `🏫 ${sub.schoolName}`
                            : "연습 문제"}{" "}
                          · {sub.subject}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-line text-ink-muted">
                            {sub.questionType}
                          </span>
                          <span className="text-[10px] font-bold text-ink-muted bg-white border border-line px-2 py-0.5 rounded-full">
                            ⏳ 미제출
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 가운데 메인 영역 */}
        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
          {!selSub ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">📝</div>
              <div className="text-[14px] font-bold text-ink-secondary">
                답안을 선택해주세요
              </div>
            </div>
          ) : selSub.status === "not_submitted" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">⏳</div>
              <div className="text-[14px] font-bold text-ink-secondary">
                학생이 아직 답안을 제출하지 않았어요
              </div>
            </div>
          ) : (
            <>
              {/* 헤더 — 좌상단 ID + 우상단 버튼 (큰 사이즈) */}
              <div className="px-5 py-5 border-b border-line flex-shrink-0">
                {/* 좌측 Q배지 + 우측 큰 버튼 */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-extrabold text-ink tracking-tight">
                      📝
                    </span>
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{
                        color: THEME.accentDark,
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}60`,
                      }}
                    >
                      {selSub.questionType}
                    </span>
                    {selSub.category === "school" && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        🏫 {selSub.schoolName}
                      </span>
                    )}
                  </div>

                  {/* 우상단 큰 버튼 두개 — 항상 표시 (기출문제처럼) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (selSub.aiAnalysis) {
                          togglePanel("first");
                        } else {
                          runAiAnalysis();
                        }
                      }}
                      disabled={analyzing}
                      className="px-4 py-2 rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px disabled:cursor-not-allowed"
                      style={{
                        background: showAiPanel ? THEME.accent : "#fff",
                        color: showAiPanel ? "#fff" : THEME.accent,
                        border: `1.5px solid ${THEME.accent}`,
                        boxShadow: showAiPanel
                          ? `0 4px 12px ${THEME.accentShadow}`
                          : `0 2px 6px ${THEME.accentShadow}`,
                      }}
                    >
                      {analyzing
                        ? "🤖 분석 중..."
                        : !selSub.aiAnalysis
                          ? "✨ AI 분석 시작"
                          : `✨ AI 분석 ${showAiPanel ? "닫기" : "보기"}`}
                    </button>
                    <span
                      className="px-4 py-2 rounded-lg text-[13px] font-bold"
                      style={{
                        background:
                          selSub.status === "pending"
                            ? "#FEF3C7"
                            : THEME.accentBg,
                        color:
                          selSub.status === "pending"
                            ? "#92400E"
                            : THEME.accentDark,
                        border: `1.5px solid ${selSub.status === "pending" ? "#FCD34D" : THEME.accentBorder}`,
                      }}
                    >
                      {selSub.status === "pending"
                        ? "⏳ 피드백 대기"
                        : selSub.status === "analyzed"
                          ? "🤖 AI 분석 완료"
                          : selSub.status === "first_done"
                            ? "📩 1차 피드백 전달"
                            : selSub.status === "resubmitted"
                              ? "🔄 재제출됨"
                              : "✓ 완료"}
                    </span>
                  </div>
                </div>

                {/* 4단계 스텝퍼 — 가운데 영역 */}
                <div className="flex px-8 mb-3">
                  {STEP_LABELS.map((label, i) => {
                    const step = getStep(selSub);
                    const stepNum = i + 1;
                    const isDone = stepNum < step;
                    const isOn = stepNum === step;
                    const active = isDone || isOn;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1.5 relative"
                      >
                        {i < STEP_LABELS.length - 1 && (
                          <div
                            className="absolute top-[13px] left-[55%] w-[90%] h-px"
                            style={{
                              background: isDone ? THEME.accent : "#E5E7EB",
                            }}
                          />
                        )}
                        <div
                          className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-extrabold z-10 relative border-2"
                          style={{
                            background: active ? THEME.accent : "#F3F4F6",
                            color: active ? "#fff" : "#9CA3AF",
                            borderColor: active ? THEME.accent : "#E5E7EB",
                          }}
                        >
                          {isDone ? "✓" : stepNum}
                        </div>
                        <div
                          className="text-[11px] font-bold whitespace-nowrap"
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

                {/* 답안 제목 + 정보 — 스텝퍼 아래에 깔끔하게 */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                  <div>
                    <div className="text-[15px] font-extrabold text-ink tracking-tight">
                      {selSub.title}
                    </div>
                    <div className="text-[11px] font-medium text-ink-muted mt-0.5 flex items-center gap-2">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                        {selSub.subject}
                      </span>
                      {selSub.ratio && <span>배점 {selSub.ratio}%</span>}
                      <span>· 📅 제출 {selSub.submittedAt}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                {/* 문제 */}
                <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                    📌 출제 문제
                  </div>
                  <div className="text-[13px] font-medium text-ink leading-[1.7]">
                    {selSub.questionContent}
                  </div>
                  {selSub.minChars && (
                    <div className="text-[10px] text-ink-muted mt-2 font-medium">
                      조건: {selSub.minChars}~{selSub.maxChars}자
                    </div>
                  )}
                </div>

                <div className="bg-white border border-line rounded-xl px-5 py-4">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-3">
                    📜 답변 · 피드백 히스토리
                  </div>
                  <div className="flex flex-col gap-3.5">
                    {/* Step 1: 학생 답안 */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">
                          Step 1
                        </span>
                        <span className="text-[11px] font-bold text-ink-secondary">
                          👤 학생 제출 답안
                        </span>
                        <span className="ml-auto text-[10px] text-ink-muted font-medium">
                          {selSub.studentAnswer.length}자
                        </span>
                      </div>
                      <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                        {selSub.studentAnswer}
                      </div>
                    </div>

                    {/* Step 2 (AI 분석)는 우상단 버튼 + 우측 패널로 처리됨 — 본문에서 제거 */}

                    {/* Step 3: 1차 피드백 — 항상 표시 */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span
                          className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                          style={{ background: THEME.accent }}
                        >
                          Step 3
                        </span>
                        <span className="text-[11px] font-bold text-ink-secondary">
                          👨‍🏫 선생님 1차 피드백
                        </span>
                      </div>
                      {selSub.teacherFirstFeedback ? (
                        <div
                          className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8] whitespace-pre-wrap"
                          style={{
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}60`,
                            color: THEME.accentDark,
                          }}
                        >
                          {selSub.teacherFirstFeedback}
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={firstFbText}
                            onChange={(e) => setFirstFbText(e.target.value)}
                            placeholder={
                              selSub.aiAnalysis
                                ? "AI 분석 결과를 참고해서 피드백을 작성해주세요..."
                                : "학생 답안에 대한 피드백을 작성해주세요. 우상단 'AI 분석'을 활용하면 더 좋아요."
                            }
                            rows={5}
                            className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                            onFocus={handleTextareaFocus}
                            onBlur={handleTextareaBlur}
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            {selSub.aiAnalysis && (
                              <button
                                onClick={importAiToFirstFeedback}
                                className="px-3 py-2 bg-white border rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                                style={{
                                  color: THEME.accent,
                                  borderColor: THEME.accent,
                                }}
                              >
                                ✨ AI 결과 가져오기
                              </button>
                            )}
                            <button
                              onClick={sendFirstFeedback}
                              disabled={!firstFbText.trim()}
                              className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                              style={{
                                background: firstFbText.trim()
                                  ? THEME.accent
                                  : "#E5E7EB",
                                color: firstFbText.trim() ? "#fff" : "#9CA3AF",
                                boxShadow: firstFbText.trim()
                                  ? `0 4px 12px ${THEME.accentShadow}`
                                  : "none",
                              }}
                            >
                              📤 1차 피드백 전달
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Step 4-A: 학생 재제출 */}
                    {selSub.teacherFirstFeedback && (
                      <div>
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">
                              Step 4
                            </span>
                            <span className="text-[11px] font-bold text-ink-secondary">
                              👤 학생 재제출 답안
                            </span>
                          </div>
                          {selSub.studentResubmission && (
                            <button
                              onClick={() => togglePanel("second")}
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
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
                              }}
                            >
                              ✨ 2차 AI 분석{" "}
                              {showAiPanel && aiTab === "second"
                                ? "닫기"
                                : "보기"}
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

                    {/* Step 4-B: 최종 피드백 */}
                    {selSub.studentResubmission && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span
                            className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                            style={{ background: THEME.accent }}
                          >
                            Step 4
                          </span>
                          <span className="text-[11px] font-bold text-ink-secondary">
                            👨‍🏫 선생님 최종 피드백
                          </span>
                        </div>
                        {selSub.teacherFinalFeedback ? (
                          <div
                            className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8]"
                            style={{
                              background: THEME.accentBg,
                              border: `1px solid ${THEME.accentBorder}60`,
                              color: THEME.accentDark,
                            }}
                          >
                            {selSub.teacherFinalFeedback}
                          </div>
                        ) : (
                          <>
                            <textarea
                              value={finalFbText}
                              onChange={(e) => setFinalFbText(e.target.value)}
                              placeholder="재제출된 답안에 대한 최종 피드백을 작성해주세요..."
                              rows={4}
                              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                              onFocus={handleTextareaFocus}
                              onBlur={handleTextareaBlur}
                            />
                            <div className="flex justify-end mt-2">
                              <button
                                onClick={sendFinalFeedback}
                                disabled={!finalFbText.trim()}
                                className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                                style={{
                                  background: finalFbText.trim()
                                    ? THEME.accent
                                    : "#E5E7EB",
                                  color: finalFbText.trim()
                                    ? "#fff"
                                    : "#9CA3AF",
                                  boxShadow: finalFbText.trim()
                                    ? `0 4px 12px ${THEME.accentShadow}`
                                    : "none",
                                }}
                              >
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

      {/* ========== 우측 AI 분석 패널 — fixed로 화면 끝까지 ========== */}
      {showAiPanel && selSub && selSub.aiAnalysis && (
        <div className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-line flex flex-col shadow-[-8px_0_24px_rgba(15,23,42,0.08)] z-50">
          <div className="px-4 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">
                ✨ AI 분석
              </div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                {selSub.title}
              </div>
            </div>
            <button
              onClick={() => setShowAiPanel(false)}
              className="text-ink-muted hover:text-ink text-base w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* 1차/2차 탭 */}
          <div className="flex border-b border-line flex-shrink-0">
            <button
              onClick={() => setAiTab("first")}
              className="flex-1 py-3 text-center text-[12px] font-bold transition-all border-b-2"
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
                if (selSub.studentResubmission) togglePanel("second");
              }}
              disabled={!selSub.studentResubmission}
              className="flex-1 py-3 text-center text-[12px] font-bold transition-all border-b-2 disabled:cursor-not-allowed"
              style={{
                color: !selSub.studentResubmission
                  ? "#D1D5DB"
                  : aiTab === "second"
                    ? THEME.accentDark
                    : "#9CA3AF",
                borderColor: aiTab === "second" ? THEME.accent : "transparent",
                background: aiTab === "second" ? THEME.accentBg : "transparent",
              }}
            >
              📈 2차 답변 분석
              {!selSub.studentResubmission && (
                <div className="text-[9px]">재제출 필요</div>
              )}
            </button>
          </div>

          {/* 1차 분석 */}
          {aiTab === "first" && (
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
                    답안 정합성 분석
                  </div>
                </div>
                <div className="text-[11px] font-medium text-ink-secondary mb-3">
                  답안을 {selSub.questionType} 평가 기준에 맞춰 분석한
                  결과입니다.
                </div>

                <div className="h-[260px] mb-2 bg-white rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={getRadarData()}
                      margin={{ top: 24, right: 40, bottom: 24, left: 40 }}
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
                        name="평가 기준"
                        dataKey="standard"
                        stroke="#F97316"
                        fill="#F97316"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Radar
                        name="학생 답안"
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
                    평가 기준
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: THEME.accent }}
                    />
                    학생 답안
                  </div>
                </div>

                {getBarData().map((d, i) => (
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
                    📝 {selSub.questionType} 평가 기준
                  </div>
                  <div className="text-[12px] font-medium text-ink leading-[1.7]">
                    {selSub.aiAnalysis.evalCriteria}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-[12px] font-bold text-ink mb-2">
                    답안 적합성 평가
                  </div>
                  {selSub.aiAnalysis.scores.map((s, i) => (
                    <div key={i} className="mb-2">
                      <div className="text-[12px] font-bold text-ink mb-0.5">
                        {i + 1}. {s.label} ({s.max}점)
                      </div>
                      <div className="text-[12px] font-medium text-ink-secondary leading-[1.6]">
                        {s.desc}
                      </div>
                    </div>
                  ))}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 mt-2">
                    <div className="text-[11px] font-bold text-orange-800 mb-1">
                      📌 평가 요약
                    </div>
                    <div className="text-[12px] font-medium text-orange-900 leading-[1.7]">
                      {selSub.aiAnalysis.summary}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div
                    className="text-[11px] font-extrabold uppercase tracking-wider mb-2"
                    style={{ color: THEME.accent }}
                  >
                    💪 강점 포인트
                  </div>
                  {selSub.aiAnalysis.strengths.map((s, i) => (
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
                  {selSub.aiAnalysis.improvements.map((s, i) => (
                    <div
                      key={i}
                      className="text-[12px] font-medium text-red-900 leading-[1.6] px-3 py-2 bg-red-50 border border-red-200 rounded-lg mb-1.5"
                    >
                      △ {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2차 분석 */}
          {aiTab === "second" &&
            (secondAiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted">
                <div className="text-3xl animate-pulse">✨</div>
                <div className="text-[13px] font-medium">
                  AI가 2차 답변을 분석 중...
                </div>
              </div>
            ) : !secondData ? (
              <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px] font-medium">
                2차 분석 데이터가 없어요.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                <div
                  className="rounded-xl px-4 py-3.5"
                  style={{
                    background: THEME.accentBg,
                    border: `1px solid ${THEME.accentBorder}60`,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">📊</span>
                    <div
                      className="text-[13px] font-extrabold"
                      style={{ color: THEME.accentDark }}
                    >
                      1차 vs 2차 평가요소 분포
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-ink-secondary mb-3">
                    1차 답안과 재제출(2차) 답안의 평가요소 변화를 확인해보세요.
                  </div>
                  <div className="flex gap-3 mb-2">
                    <div className="text-[10px] font-semibold text-ink-secondary flex items-center gap-1">
                      <div className="w-2 h-2 rounded bg-blue-300" />
                      1차
                    </div>
                    <div className="text-[10px] font-semibold text-ink-secondary flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded"
                        style={{ background: THEME.accent }}
                      />
                      2차
                    </div>
                  </div>
                  {secondData.beforeDistribution.map((b, i) => {
                    const after = secondData.afterDistribution.find(
                      (a) => a.factorCode === b.factorCode,
                    );
                    const diff = (after?.distribution || 0) - b.distribution;
                    return (
                      <div
                        key={i}
                        className="mb-3 bg-white rounded-lg px-3 py-2.5"
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[12px] font-bold text-ink">
                            {b.factorName}
                          </span>
                          <span
                            className="text-[11px] font-extrabold"
                            style={{
                              color:
                                diff > 0
                                  ? THEME.accent
                                  : diff < 0
                                    ? "#EF4444"
                                    : "#6B7280",
                            }}
                          >
                            {diff > 0
                              ? `▲ +${diff}%`
                              : diff < 0
                                ? `▼ ${diff}%`
                                : "변동없음"}
                          </span>
                        </div>
                        <div className="mb-1">
                          <div className="text-[10px] font-semibold text-ink-muted mb-0.5">
                            1차 · {b.distribution}%
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-300"
                              style={{ width: `${b.distribution}%` }}
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
                              style={{
                                width: `${after?.distribution || 0}%`,
                                background: THEME.accent,
                              }}
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
                    <div className="text-[13px] font-extrabold text-ink">
                      구조 코멘트
                    </div>
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
                    <span className="text-sm">✍️</span>
                    <div className="text-[13px] font-extrabold text-ink">
                      모범 답안
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-ink-secondary mb-2.5">
                    재제출 답안을 평가 기준에 맞게 재정렬한 모범 답안입니다.
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.9] italic">
                    "{secondData.practiceAnswer}"
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
