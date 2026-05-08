// supabase/functions/middle-essay-analyze/index.ts
// 중등 자소서 — 항목별 AI 분석 + 피드백
//
// 첫 분석: { evalCriteria, scores, summary, strengths, improvements, totalScore, teacherDraft }
// 재분석:  { isComparison: true, improvedPoints, remainingIssues, comparisonSummary, teacherDraft }

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface RequestBody {
  schoolName: string;       // 인천하늘고 등
  sectionKey: "지원동기" | "활동계획" | "진로계획" | "인성";
  sectionLabel: string;     // "지원동기 (건학이념 연계)" 등
  answerText: string;       // 학생 답변
  keywords?: string[];      // 1단계 키워드 5개
  studentName?: string;
  previousAnswer?: string;  // 재제출시 1차 답안
  previousFeedback?: string;// 재제출시 1차 피드백
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();

    if (!body.answerText || body.answerText.trim().length < 20) {
      return jsonError("자소서 항목이 너무 짧아요. (최소 20자)", 400);
    }
    if (!body.sectionKey || !body.schoolName) {
      return jsonError("학교명과 항목 정보가 필요해요.", 400);
    }

    const isResubmission = !!(body.previousAnswer && body.previousFeedback);
    const metrics = analyzeAnswer(body.answerText, body);

    const systemPrompt = isResubmission
      ? buildComparisonSystemPrompt(body.sectionKey)
      : buildFullSystemPrompt(body.sectionKey);
    const userPrompt = isResubmission
      ? buildComparisonUserPrompt(body, metrics)
      : buildFullUserPrompt(body, metrics);

    const { feedback, tokensUsed, model } = await callOpenAI({
      systemPrompt,
      userPrompt,
      model: "gpt-4o",
      temperature: 0.3,
    });

    const result = isResubmission
      ? normalizeComparison(feedback)
      : normalizeFullAnalysis(feedback);

    return jsonResponse({
      success: true,
      analysis: result,
      meta: { isResubmission, model, tokensUsed, metrics },
    });
  } catch (e) {
    console.error("[middle-essay-analyze]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

// ============================================================
// 응답 정규화
// ============================================================
function normalizeFullAnalysis(raw: any) {
  const scores = Array.isArray(raw.scores) ? raw.scores : [];
  const studentScores = scores.slice(0, 4).map((s: any) => Number(s.score) || 0);
  while (studentScores.length < 4) studentScores.push(70);

  return {
    evalCriteria: raw.evalCriteria ?? "",
    studentScores,
    scores: scores.map((s: any) => ({
      label: s.label ?? "",
      score: Number(s.score) || 0,
      max: Number(s.max) || 100,
      desc: s.desc ?? "",
    })),
    summary: raw.summary ?? "",
    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements : [],
    totalScore: Number(raw.totalScore) || 70,
    keywordReflection: raw.keywordReflection ?? "",
    teacherDraft: raw.teacherDraft ?? "",
  };
}

function normalizeComparison(raw: any) {
  return {
    isComparison: true,
    improvedPoints: Array.isArray(raw.improvedPoints) ? raw.improvedPoints : [],
    remainingIssues: Array.isArray(raw.remainingIssues) ? raw.remainingIssues : [],
    comparisonSummary: raw.comparisonSummary ?? "",
    teacherDraft: raw.teacherDraft ?? "",
  };
}

// ============================================================
// 메트릭
// ============================================================
interface Metrics {
  charCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  keywordHits: { keyword: string; count: number }[];
  hasNumbers: boolean;
  hasSpecificEvents: boolean;
}

function analyzeAnswer(text: string, body: RequestBody): Metrics {
  const cleaned = text.trim();
  const charCount = cleaned.replace(/\s/g, "").length;

  const sentences = cleaned
    .split(/[.!?。\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = sentences.length;
  const avgSentenceLength =
    sentenceCount > 0 ? Math.round(charCount / sentenceCount) : 0;

  const keywordHits = (body.keywords ?? []).map((k) => ({
    keyword: k,
    count: (cleaned.match(new RegExp(k, "g")) ?? []).length,
  }));

  // 숫자 포함 여부 (구체성 지표)
  const hasNumbers = /\d/.test(cleaned);
  // 학년/시기 등 구체적 사건 표현 여부
  const hasSpecificEvents = /[1-6]학년|초등|중[123]|작년|올해|지난|당시/.test(cleaned);

  return { charCount, sentenceCount, avgSentenceLength, keywordHits, hasNumbers, hasSpecificEvents };
}

// ============================================================
// 항목별 평가 기준
// ============================================================
const SECTION_RUBRICS: Record<string, string> = {
  지원동기: `[1] 학교 이해도 (건학이념·교육과정 인지) (30%)
[2] 동기의 진정성 (구체적 계기·경험) (30%)
[3] 자기 가치관과의 연결 (25%)
[4] 표현력·구체성 (15%)`,

  활동계획: `[1] 활동의 구체성 (어떤 활동을 어떻게) (30%)
[2] 자기주도성 (스스로 한 활동 vs 시켜서 한 활동) (25%)
[3] 진로 연결성 (꿈/끼와의 연관) (30%)
[4] 표현력·구체성 (15%)`,

  진로계획: `[1] 진로의 구체성 (학과·분야·직업) (30%)
[2] 단계적 계획성 (5년/10년 후) (25%)
[3] 현재 노력의 구체성 (이미 한 일들) (30%)
[4] 표현력·구체성 (15%)`,

  인성: `[1] 경험의 구체성 (언제/누구와/어떻게) (30%)
[2] 배움·성장의 깊이 (단순 행동 vs 깨달음) (35%)
[3] 인성 가치 표현 (배려·협력·책임 등) (20%)
[4] 표현력·구체성 (15%)`,
};

// ============================================================
// 첫 제출 — 풀 분석 프롬프트
// ============================================================
function buildFullSystemPrompt(sectionKey: string): string {
  const rubric = SECTION_RUBRICS[sectionKey] || SECTION_RUBRICS.지원동기;

  return `당신은 중학생의 고등학교 자기소개서를 평가하는 전문 입시 컨설턴트입니다.
학생이 작성한 "${sectionKey}" 항목을 분석해, 선생님이 검토 후 학생에게 그대로 전달할 수 있는
피드백 초안을 작성합니다.

═══════════════════════════════════════════
[중요] 자소서 피드백의 목적
═══════════════════════════════════════════
- "다시 어떻게 쓰면 좋을지" 알려주는 것이 목적.
- 따뜻하고 구체적이지만 모호한 칭찬 금지.
- 학생이 다음 수정에 적용할 수 있는 명확한 액션 아이템 제시.
- 자소서는 "구체성"이 핵심. 추상적 다짐("열심히 하겠다")보다 구체적 사건·숫자 강조.

═══════════════════════════════════════════
${sectionKey} 평가 4축 (반드시 이 순서로 scores 배열 작성)
═══════════════════════════════════════════
${rubric}

═══════════════════════════════════════════
점수 캘리브레이션 (모든 score는 0-100 정수)
═══════════════════════════════════════════
- 90+ : 또래 상위 5%
- 80-89 : 상위 20%
- 70-79 : 평범하지만 통과
- 60-69 : 핵심은 전달됐으나 부족함 다수
- 50-59 : 명백한 결함
- 50 미만 : 미달

대부분 60-80 사이.
totalScore = 4축 평균 (0-100).

═══════════════════════════════════════════
키워드 반영 평가
═══════════════════════════════════════════
학생이 1단계에서 정한 키워드들이 답변에 자연스럽게 녹아있는지 확인.
keywordReflection 필드에 한 문장으로 평가:
- "키워드 OOO이 자연스럽게 녹아있어요"
- "키워드를 더 적극적으로 활용해보세요"

═══════════════════════════════════════════
teacherDraft 작성 — 선생님이 학생에게 보낼 텍스트
═══════════════════════════════════════════
구조 (마크다운 헤더 X, 자연스러운 한국어 문단):

[총평] 2-3문장
[잘한 점] 강점 2-3개 (가능하면 학생 답안 인용)
[개선할 점] 개선점 2-3개 (what + how)
[다음 단계] 1-2문장

** 톤 **
- "~예요/~해요" 톤
- 학생 이름 있으면 "○○님,"로 시작
- 길이: 300-450자

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만)
═══════════════════════════════════════════
{
  "evalCriteria": "<${sectionKey} 평가 핵심 기준 한 문장>",
  "scores": [
    { "label": "<1번 축>", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "<2번 축>", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "<3번 축>", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "<4번 축>", "score": <0-100>, "max": 100, "desc": "<한 문장>" }
  ],
  "totalScore": <0-100 평균>,
  "summary": "<1-2문장>",
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "keywordReflection": "<키워드 반영도 한 문장>",
  "teacherDraft": "<300-450자>"
}`;
}

function buildFullUserPrompt(body: RequestBody, m: Metrics): string {
  const parts: string[] = [];

  const meta: string[] = [];
  meta.push(`지원 학교: ${body.schoolName}`);
  meta.push(`자소서 항목: ${body.sectionLabel}`);
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  if (body.keywords && body.keywords.length > 0) {
    meta.push(`학생이 정한 키워드 5개: ${body.keywords.join(", ")}`);
  }
  parts.push(`[기본 정보]\n${meta.join("\n")}`);

  const metricLines = [
    `총 글자 수 (띄어쓰기 제외): ${m.charCount}자`,
    `문장 수: ${m.sentenceCount}개`,
    `평균 문장 길이: ${m.avgSentenceLength}자`,
    `숫자 포함: ${m.hasNumbers ? "✓" : "✗"}`,
    `구체적 시기 표현: ${m.hasSpecificEvents ? "✓" : "✗"}`,
  ];
  if (m.keywordHits.length > 0) {
    const hits = m.keywordHits
      .filter((kh) => kh.count > 0)
      .map((kh) => `${kh.keyword}(${kh.count}회)`)
      .join(", ") || "없음";
    metricLines.push(`키워드 등장: ${hits}`);
  }
  parts.push(`[사전 분석 메트릭]\n${metricLines.join("\n")}`);

  parts.push(`[학생 자소서 — ${body.sectionKey}]\n${body.answerText}`);

  parts.push(
    `위 자소서 항목을 분석하고 JSON 형식으로 응답하세요.\n` +
      `1. 4개 축 각 0-100 점수와 한 문장 desc\n` +
      `2. totalScore는 4축 평균 (0-100)\n` +
      `3. keywordReflection: 키워드 반영도 한 문장\n` +
      `4. teacherDraft 300-450자\n` +
      `5. 반드시 JSON만 응답`
  );

  return parts.join("\n\n");
}

// ============================================================
// 재제출 — 비교 프롬프트
// ============================================================
function buildComparisonSystemPrompt(sectionKey: string): string {
  return `당신은 중학생의 고등학교 자기소개서를 평가하는 전문 입시 컨설턴트입니다.
학생이 1차 자소서에 대한 피드백을 받고 ${sectionKey} 항목을 수정해서 재제출했습니다.
1차 답안과 2차 답안을 비교해서, 무엇이 좋아졌고 무엇이 아직 부족한지 알려주는 피드백을 작성하세요.

═══════════════════════════════════════════
[중요] 비교 피드백의 핵심
═══════════════════════════════════════════
- 점수 산정 X. 강점/개선점 따로 나열 X. 오직 "1차 → 2차 변화"에 집중.
- 학생이 1차 피드백을 어떻게 반영했는지 정직하게 평가.
- 잘 반영했으면 잘 반영했다고, 거의 반영 안 됐으면 그렇게.
- "노력 인정" 모호한 칭찬 금지.

═══════════════════════════════════════════
분석 관점
═══════════════════════════════════════════
1) 1차 피드백의 개선점이 2차 답안에 어떻게 반영됐는가
2) 1차의 약점(추상성, 구체성 부족 등)이 2차에서 보완됐는가
3) 2차에서 새로 추가된 내용이 자소서 품질을 높였는가
4) 2차에서 여전히 부족한 부분 또는 새로 생긴 약점

═══════════════════════════════════════════
teacherDraft 작성 — 선생님이 학생에게 보낼 최종 피드백
═══════════════════════════════════════════
구조 (마크다운 헤더 X):

[총평] 2-3문장 (1차 대비 발전 한 마디, 모호한 칭찬 X)
[좋아진 점] 1차 → 2차 명확히 좋아진 부분 (구체적 인용)
[아직 보완할 점] 여전히 부족하거나 새로 생긴 약점 (있으면)
[격려] 짧은 한 문장

** 톤 ** "~예요/~해요", 학생 이름 있으면 "○○님,"로 시작, 250-400자.

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만)
═══════════════════════════════════════════
{
  "improvedPoints": ["<좋아진 점 1>", "<좋아진 점 2>"],
  "remainingIssues": ["<아직 부족한 점 1>", "<아직 부족한 점 2>"],
  "comparisonSummary": "<1차 대비 발전 1-2문장>",
  "teacherDraft": "<250-400자>"
}`;
}

function buildComparisonUserPrompt(body: RequestBody, m: Metrics): string {
  const parts: string[] = [];

  const meta: string[] = [];
  meta.push(`지원 학교: ${body.schoolName}`);
  meta.push(`자소서 항목: ${body.sectionLabel}`);
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  parts.push(`[기본 정보]\n${meta.join("\n")}`);

  parts.push(`[1차 답안]\n${body.previousAnswer}`);
  parts.push(`[1차 피드백 — 학생이 반영해야 했던 내용]\n${body.previousFeedback}`);
  parts.push(`[2차 답안 — 재제출본]\n${body.answerText}`);

  parts.push(
    `위 1차 답안과 2차 답안을 비교하세요.\n\n` +
      `체크리스트:\n` +
      `1. improvedPoints: 좋아진 점 2-3개 (구체적 인용)\n` +
      `2. remainingIssues: 여전히 부족한 점 0-2개\n` +
      `3. comparisonSummary: 1-2문장 요약\n` +
      `4. teacherDraft: 250-400자, [총평]/[좋아진 점]/[아직 보완할 점]/[격려] 구조\n` +
      `5. 반드시 JSON만 응답`
  );

  return parts.join("\n\n");
}