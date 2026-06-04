// supabase/functions/middle-essay-analyze/index.ts
// 중등 자소서 항목별 분석 — 학교 특색 + 문항·배점을 반영해 채점
//   · 학생용 feedback (완성도·항목별 충족도·문장별 진단)
//   · 선생님용 coaching (단계별 코칭 질문)
// 철학: 자소서 문장을 대신 쓰지 않는다. 진단 + 코칭 질문만 제공한다.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface SchoolProfile {
  ideal_student: string;
  eval_factors: string;
  programs: string;
  core_values: string;
  notes: string;
}
interface RubricSection {
  label: string;
  max: number | null;
  charLimit: number | null;
  question: string;
}
interface RequestBody {
  schoolName: string;
  sectionKey: string;
  sectionLabel: string;
  answerText: string;
  studentName?: string;
  keywords?: string[];
  previousAnswer?: string;
  previousFeedback?: string;
  // 학교 데이터 (클라이언트에서 주입)
  schoolProfile?: SchoolProfile | null;
  scoringMode?: "official" | "platform";
  rubricSection?: RubricSection | null;
}

// 과학고 공통 권장 루브릭 (100점 환산, 공식 아님)
const PLATFORM_RUBRIC = [
  { label: "수학 탐구력", max: 25 },
  { label: "과학 탐구력", max: 25 },
  { label: "자기주도성/문제해결", max: 20 },
  { label: "지원동기·진로계획", max: 15 },
  { label: "인성·협업", max: 15 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();

    if (!body.answerText || body.answerText.trim().length < 20) {
      return jsonError("학생 답변이 너무 짧아요. (최소 20자)", 400);
    }
    if (!body.schoolName) return jsonError("학교명이 필요해요.", 400);

    const maxScore = resolveMaxScore(body);

    const systemPrompt = buildSystemPrompt(body, maxScore);
    const userPrompt = buildUserPrompt(body);

    const { feedback, tokensUsed, model } = await callOpenAI({
      systemPrompt,
      userPrompt,
      model: "gpt-4o",
      temperature: 0.3,
    });

    const result = normalize(feedback, body, maxScore);

    return jsonResponse({
      success: true,
      analysis: result,
      meta: { model, tokensUsed, scoringMode: body.scoringMode ?? "official" },
    });
  } catch (e) {
    console.error("[middle-essay-analyze]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

// 영역 만점 결정
function resolveMaxScore(body: RequestBody): number {
  if (body.scoringMode === "platform") return 100; // 과학고: 100점 환산
  return body.rubricSection?.max ?? 100;            // 외고: 학교 공식 배점
}

function buildSystemPrompt(body: RequestBody, maxScore: number): string {
  const isPlatform = body.scoringMode === "platform";

  // 점수 기준 안내
  const scoringGuide = isPlatform
    ? `이 학교(과학고)는 자소서 문항별 공식 배점을 공개하지 않는다.
아래 플랫폼 공통 권장 기준(100점 환산, 비공식 진단용)으로 평가하라.
${PLATFORM_RUBRIC.map((r) => `- ${r.label}: ${r.max}점`).join("\n")}
[중요] 점수는 "공식 입시 점수가 아니라 진단용 추정치"임을 summary에 반드시 명시하라.`
    : `이 영역의 만점은 ${maxScore}점이며, 이는 학교가 공개한 공식 배점이다.
totalScore는 0~${maxScore} 범위로 매겨라.`;

  // 학교 특색 블록
  const profileBlock = body.schoolProfile
    ? `[학교 데이터]
학교명: ${body.schoolName}
인재상: ${body.schoolProfile.ideal_student}
평가에서 중시하는 요소: ${body.schoolProfile.eval_factors}
특색 프로그램: ${body.schoolProfile.programs}
강조하는 가치: ${body.schoolProfile.core_values}`
    : `[학교 데이터]
학교명: ${body.schoolName}
(이 학교의 상세 특색 데이터가 아직 없다. 문항·배점 기준으로만 평가하고, 학교 특색 연계는 일반적 수준에서만 언급하라.)`;

  // 문항 블록
  const questionBlock = body.rubricSection
    ? `[이 영역의 평가 문항]
영역: ${body.rubricSection.label}${body.rubricSection.max ? ` (배점 ${body.rubricSection.max}점)` : ""}${body.rubricSection.charLimit ? ` (${body.rubricSection.charLimit}자 이내)` : ""}
학교 제시 문항: ${body.rubricSection.question}
[중요] 이 문항이 요구하는 모든 요소를 학생이 충족했는지 항목별로 따져라.`
    : `[이 영역의 평가 문항]
영역: ${body.sectionLabel}
(이 학교의 해당 영역 문항 데이터가 없다. 영역명 기준으로 일반적 평가를 하라.)`;

  return `너는 고입 자기소개서 분석 전문가다. 보습학원 선생님이 학생을 지도할 수 있도록 돕는다.

${profileBlock}

${questionBlock}

[채점 기준]
${scoringGuide}
점수는 후하게 주지 마라. 문항이 요구하는 요소가 빠지면 과감히 감점하라.

[절대 규칙 — 가장 중요]
1. 자소서 본문·첨삭문장·수정문장·완성문장을 절대 쓰지 마라. 학생이 그대로 베껴 쓸 수 있는 문장을 만들지 마라.
2. 학교 내용은 위 [학교 데이터]에 있는 사실만 써라. 없는 건 지어내지 마라.
3. 학생 경험은 [학생 답변]에 있는 것만 써라. 없는 활동을 만들지 마라.
4. 대입·전공적합성·학생부·생기부·세특 같은 표현을 쓰지 마라. 중학생도 이해할 쉬운 말로.

[출력 — 두 부분으로 나눠라]

▶ feedback (학생이 보는 진단)
- completeness: 현재 완성도 (0~100 정수). totalScore를 만점 대비 %로 환산하되, 동기를 주도록 "거의 다 왔다" 관점에서 너무 낮지 않게.
- passLine: 80 고정.
- statusLabel: 완성도에 맞는 한 줄 (예: "합격선 진입 직전", "기초는 갖춘 단계").
- summary: 2문장. 강점을 먼저, 그다음 핵심 보완점. 학부모가 봐도 "전문가가 봤다"는 느낌.
- criteria: 문항이 요구하는 항목별 충족도 3~5개. 각 {label, level(high|mid|low), ratio(0~100), desc}. 문항을 요소로 쪼개라(예: 목표·계획 / 실행 과정 / 결과 평가 / 학교 연계).
- quotes: 학생 답변에서 실제 문장을 2~5개 그대로 인용. 각 {text(원문 그대로), type(strength|weak|missing), comment}. type=missing은 "빠진 내용"이므로 text에 빠진 요소를 적어라.

▶ coaching (선생님이 보는 지도 가이드)
- steps: 코칭 순서 2~3개. 가장 시급한 것부터. 각 {order, priority(urgent|normal), title, why(왜 중요한지 입시맥락 한 줄), askText(학생에게 던질 실제 질문 대사), followUp(학생이 답하면 어떻게 이어갈지)}.
  · askText는 선생님이 그대로 읽으면 되는 질문이어야 한다. 자소서 문장이 아니라 "질문"이다.
- expectedFrom: feedback.completeness와 동일.
- expectedTo: 코칭을 다 반영하면 도달할 예상 완성도 %.
- caution: "문장을 대신 써주지 말고 질문으로 학생의 답을 끌어내세요" 취지의 한 줄.

[응답 형식 — 반드시 이 JSON만 출력. 마크다운 금지]
{
  "totalScore": 0,
  "summary": "",
  "feedback": {
    "completeness": 0,
    "passLine": 80,
    "statusLabel": "",
    "summary": "",
    "criteria": [{ "label": "", "level": "high", "ratio": 0, "desc": "" }],
    "quotes": [{ "text": "", "type": "strength", "comment": "" }]
  },
  "coaching": {
    "steps": [{ "order": 1, "priority": "urgent", "title": "", "why": "", "askText": "", "followUp": "" }],
    "expectedFrom": 0,
    "expectedTo": 0,
    "caution": ""
  }
}

각 필드를 실제 분석 내용으로 채워서 JSON으로만 응답하라.`;
}

function buildUserPrompt(body: RequestBody): string {
  const parts: string[] = [];
  const meta: string[] = [`지원 학교: ${body.schoolName}`];
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  parts.push(`[기본 정보]\n${meta.join("\n")}`);

  if (body.keywords?.length) {
    parts.push(`[학생 키워드]\n${body.keywords.join(", ")}`);
  }
  if (body.previousAnswer) {
    parts.push(`[이전 답변]\n${body.previousAnswer}`);
  }
  if (body.previousFeedback) {
    parts.push(`[이전 피드백]\n${body.previousFeedback}`);
  }

  parts.push(`[학생 답변 — ${body.sectionLabel}]\n${body.answerText}`);
  parts.push(
    "위 답변을 학교 문항·배점·인재상 기준으로 분석하고 반드시 JSON만 응답하라.\n" +
    "- quotes의 text는 학생 답변의 실제 문장을 그대로 인용하라.\n" +
    "- coaching.steps.askText는 자소서 문장이 아니라 '학생에게 물어볼 질문'이다.\n" +
    "- 자소서 문장을 대신 쓰지 마라."
  );
  return parts.join("\n\n");
}

// 결과 정규화 + 하위호환 필드 채우기
function normalize(raw: any, body: RequestBody, maxScore: number) {
  const fb = raw.feedback ?? {};
  const co = raw.coaching ?? {};
  const criteria = Array.isArray(fb.criteria) ? fb.criteria : [];
  const quotes = Array.isArray(fb.quotes) ? fb.quotes : [];
  const steps = Array.isArray(co.steps) ? co.steps : [];

  const completeness = clamp(Number(fb.completeness) || 0, 0, 100);

  return {
    evalCriteria: body.rubricSection?.label ?? body.sectionLabel,
    scoringMode: body.scoringMode ?? "official",
    maxScore,
    totalScore: clamp(Number(raw.totalScore) || 0, 0, maxScore),

    feedback: {
      completeness,
      passLine: Number(fb.passLine) || 80,
      statusLabel: fb.statusLabel ?? "",
      summary: fb.summary ?? raw.summary ?? "",
      criteria: criteria.map((c: any) => ({
        label: c.label ?? "",
        level: ["high", "mid", "low"].includes(c.level) ? c.level : "mid",
        ratio: clamp(Number(c.ratio) || 0, 0, 100),
        desc: c.desc ?? "",
      })),
      quotes: quotes.map((q: any) => ({
        text: q.text ?? "",
        type: ["strength", "weak", "missing"].includes(q.type) ? q.type : "weak",
        comment: q.comment ?? "",
      })),
    },

    coaching: {
      steps: steps.map((s: any, i: number) => ({
        order: Number(s.order) || i + 1,
        priority: s.priority === "urgent" ? "urgent" : "normal",
        title: s.title ?? "",
        why: s.why ?? "",
        askText: s.askText ?? "",
        followUp: s.followUp ?? "",
      })),
      expectedFrom: Number(co.expectedFrom) || completeness,
      expectedTo: clamp(Number(co.expectedTo) || completeness, 0, 100),
      caution: co.caution ?? "문장을 대신 써주지 말고, 질문으로 학생의 답을 끌어내세요.",
    },

    // 하위호환 (기존 화면 필드)
    scores: criteria.map((c: any) => ({
      label: c.label ?? "",
      score: Math.round(((Number(c.ratio) || 0) / 100) * maxScore),
      max: maxScore,
      desc: c.desc ?? "",
    })),
    studentScores: criteria.map((c: any) => Number(c.ratio) || 0),
    summary: raw.summary ?? fb.summary ?? "",
    strengths: quotes.filter((q: any) => q.type === "strength").map((q: any) => q.comment),
    improvements: quotes.filter((q: any) => q.type !== "strength").map((q: any) => q.comment),
    reflectiveQuestions: steps.map((s: any) => s.askText).filter(Boolean),
    keywordReflection: "",
    teacherDraft: "", // 철학상 더 이상 완성 문장 생성 안 함
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}