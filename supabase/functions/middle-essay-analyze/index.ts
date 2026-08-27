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
  // 🎯 차수 (1~3). 없으면 1차로 본다. 4차(문항 간 일관성)는 이 함수가 아니라 전체 검토 함수가 처리한다.
  round?: number;
  // 🎯 컨셉·소재 분석용 재료 (기존 문항 분석과 별개로 추가 출력)
  studentConcept?: {
    major?: string | null;
    career?: string | null;
    keywords?: string[] | null;
    customGoal?: string | null;
    typeName?: string | null;
  } | null;
  experiencePool?: string[];
  otherSections?: { label: string; text: string }[];
}

// 과학고 공통 권장 루브릭 (100점 환산, 공식 아님)
const PLATFORM_RUBRIC = [
  { label: "수학 탐구력", max: 25 },
  { label: "과학 탐구력", max: 25 },
  { label: "자기주도성/문제해결", max: 20 },
  { label: "지원동기·진로계획", max: 15 },
  { label: "인성·협업", max: 15 },
];

// ============================================================
// 🎯 차수별 지침
// ⚠️ src/constants/essayRounds.ts 와 같은 내용을 유지할 것.
//    엣지 함수(Deno)는 프론트 constants 를 import 할 수 없어 여기 한 벌 더 둔다.
//    차수 기준을 바꾸면 두 파일을 함께 고쳐야 한다.
// ============================================================
function buildRoundGuide(round: number): string {
  if (round === 1) {
    return `[이번은 1차 — 소재가 맞나 (직업군·컨셉 정하기)]
이번 차수에 하는 일: 문항에 쓸 경험(소재)이 적절한지만 판정한다.
이번 차수에 절대 하지 않는 일:
  · 문장을 고치거나 다듬는 제안을 하지 마라.
  · 표현·분량·글자수·맞춤법·중복표현을 지적하지 마라. 아직 볼 단계가 아니다.
  · 장면을 더 채우라는 요구도 하지 마라. 그건 2차에서 한다.

coaching.steps 는 첨삭이 아니라 판정이다. 각 step 의 title 은 반드시 다음 셋 중 하나로 시작하라.
  "이 소재로 간다" / "이 소재는 바꾼다" / "둘 중 고민"
  · "바꾼다" 면 why 에 왜 약한지 한 줄, followUp 에 어떤 방향의 경험을 찾을지 한 줄.
  · askText 는 소재를 확정시키는 질문이어야 한다. 예: "이 활동 말고 그때 더 오래 붙잡고 있던 게 있었어?"

summary 는 "이 소재로 가도 되는가"에 대한 답으로 써라.`;
  }

  if (round === 2) {
    return `[이번은 2차 — 근거가 있나]
소재는 1차에서 이미 확정됐다. 이번 차수에 하는 일: 그 소재에 장면·행동·변화를 채우게 한다.
이번 차수에 절대 하지 않는 일:
  · 소재를 바꾸라고 하지 마라. 이미 정해진 것이다.
  · 문장을 고쳐주거나 표현을 다듬지 마라. 그건 3차에서 한다.
  · 글자수·분량을 지적하지 마라.

quotes 에서 type=weak 은 "추상적으로만 서술된 문장"을 골라라.
  (예: "최선을 다했습니다", "많은 것을 느꼈습니다" 처럼 장면이 없는 문장)

coaching.steps 의 askText 는 반드시 되묻는 질문이어야 한다. 답을 주지 말고 끌어내라.
  예: "그때 네가 실제로 한 행동이 뭐야?" / "그 전이랑 후에 뭐가 달라졌어?" / "왜 그 방법을 골랐어?"
  · 학생이 답하면 그 답이 곧 문장 재료가 된다. followUp 에 그 연결을 적어라.`;
  }

  return `[이번은 3차 — 읽히나, 그리고 면접에서 버티나]
소재(1차)와 근거(2차)는 이미 끝났다. 이번 차수에 처음으로 문장을 손댄다.
이번 차수에 하는 일: 표현·분량·중복 표현 정리 + 면접 대비.
이번 차수에 절대 하지 않는 일:
  · 소재나 경험을 새로 바꾸라고 하지 마라.
  · 학생이 쓰지 않은 내용을 새로 만들어 넣지 마라.
  · 문장을 완성해서 대신 써주지 마라. "이 문장은 같은 말이 두 번 나온다" 식으로 짚기만 하라.

금지 기재 점검을 반드시 포함하라. 아래가 있으면 quotes 에 type=weak 으로 짚어라.
  · 교내외 수상 실적, 각종 점수·등급·인증시험 결과
  · 부모·친인척의 사회경제적 지위를 짐작하게 하는 내용
  · 학교 밖(사교육 기관) 활동

coaching.steps 중 마지막 step 은 반드시 꼬리질문 단계로 만들어라.
  · title: "면접 꼬리질문 뽑기"
  · askText 에 이 자소서에서 나올 법한 꼬리질문 3개를 한 줄씩 담아라.
  · followUp: 학생이 3개 다 답할 수 있으면 이 문항은 통과다.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();

    if (!body.answerText || body.answerText.trim().length < 20) {
      return jsonError("학생 답변이 너무 짧아요. (최소 20자)", 400);
    }
    if (!body.schoolName) return jsonError("학교명이 필요해요.", 400);

    const maxScore = resolveMaxScore(body);

    // 🎯 차수 결정 (없으면 1차). 4차 이상은 이 함수 범위가 아니므로 3차 기준으로 처리한다.
    const round = Math.min(Math.max(Number(body.round) || 1, 1), 3);

    const systemPrompt = buildSystemPrompt(body, maxScore, round);
    const userPrompt = buildUserPrompt(body, round);

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
      meta: { model, tokensUsed, round, scoringMode: body.scoringMode ?? "official" },
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

function buildSystemPrompt(body: RequestBody, maxScore: number, round: number): string {
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

${buildRoundGuide(round)}

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

▶ concept (컨셉·직업군·소재 판정 — 위 문항 분석과 별개로 반드시 채워라)
- career: 이 학생의 희망 직업군. [진로 정보]에 있으면 그대로, 없으면 답변·경험에서 추론.
- label: 컨셉 한 줄. 형식 "OO(직업군)을 향해 △△를 해온 학생".
- basis: 그 컨셉을 무엇을 근거로 잡았는지 한 줄. 추론했으면 "추론"이라고 밝혀라.
- materials: 이 문항에 쓰인 소재를 1~3개 판정. 각 {name, verdict, reason, alternative}
  · name: 소재 이름 (학생 답변에 나온 활동·경험을 짧게)
  · verdict: "go"(이 소재로 간다) | "change"(바꾼다) | "hold"(둘 중 고민)
  · reason: 컨셉·문항과 맞는지/어긋나는지 한 줄. "구체적으로 써라" 같은 일반론 금지.
  · alternative: verdict가 change/hold일 때만. [학생이 가진 경험] 목록에서 골라 이름으로 지목하라.
    목록이 없으면 어떤 종류의 경험을 찾아야 하는지 한 줄. 없는 활동을 지어내지 마라.
  · [다른 문항에 쓴 소재]와 같은 경험이면 중복이므로 verdict를 "change"로 하라.

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
  "concept": {
    "career": "",
    "label": "",
    "basis": "",
    "materials": [{ "name": "", "verdict": "go", "reason": "", "alternative": "" }]
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

function buildUserPrompt(body: RequestBody, round: number): string {
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
    `[이번 차수] ${round}차\n\n` +
    "위 답변을 학교 문항·배점·인재상 기준으로, 반드시 이번 차수의 범위 안에서만 분석하고 JSON만 응답하라.\n" +
    "- 이번 차수에서 하지 말라고 한 것은 절대 하지 마라. 다음 차수의 일이다.\n" +
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
  const cp = raw.concept ?? {};
  const materials = Array.isArray(cp.materials) ? cp.materials : [];
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

    // 🎯 컨셉·직업군·소재 판정 (기존 문항 분석과 별개)
    concept: {
      career: cp.career ?? "",
      label: cp.label ?? "",
      basis: cp.basis ?? "",
      materials: materials.map((m: any) => ({
        name: m.name ?? "",
        verdict: ["go", "change", "hold"].includes(m.verdict) ? m.verdict : "hold",
        reason: m.reason ?? "",
        alternative: m.alternative ?? "",
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