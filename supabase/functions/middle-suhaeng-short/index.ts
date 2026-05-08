// supabase/functions/middle-suhaeng-short/index.ts
// 중등 수행평가 — 서술형 AI 피드백
// 첫 제출: 풀 분석 (3축: 핵심개념/정확성/간결성)
// 재제출: 비교 중심 (좋아진 점 / 부족한 점 / 요약 / teacherDraft)

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface RequestBody {
  questionTitle: string;
  questionContent: string;
  questionSubject?: string;
  minChars?: number;
  maxChars?: number;
  keywords?: string[];
  answerText: string;
  grade?: string;
  studentName?: string;
  ratio?: number;
  previousAnswer?: string;
  previousFeedback?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();

    if (!body.answerText || body.answerText.trim().length < 5) {
      return jsonError("답안이 비어있거나 너무 짧습니다.", 400);
    }
    if (!body.questionContent || !body.questionTitle) {
      return jsonError("문제 정보가 누락되었습니다.", 400);
    }

    const isResubmission = !!(body.previousAnswer && body.previousFeedback);
    const metrics = analyzeAnswer(body.answerText, body);

    const systemPrompt = isResubmission
      ? buildComparisonSystemPrompt()
      : buildFullSystemPrompt();
    const userPrompt = isResubmission
      ? buildComparisonUserPrompt(body, metrics)
      : buildFullUserPrompt(body, metrics);

    const { feedback, tokensUsed, model } = await callOpenAI({
      systemPrompt,
      userPrompt,
      model: "gpt-4o",
      temperature: 0.3,
    });

    const ratio = body.ratio ?? 100;
    const result = isResubmission
      ? normalizeComparison(feedback)
      : normalizeFullAnalysis(feedback, ratio);

    return jsonResponse({
      success: true,
      analysis: result,
      meta: { isResubmission, model, tokensUsed, metrics },
    });
  } catch (e) {
    console.error("[middle-suhaeng-short]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function normalizeFullAnalysis(raw: any, maxScore: number) {
  const scores = Array.isArray(raw.scores) ? raw.scores : [];
  const studentScores = scores.slice(0, 3).map((s: any) => Number(s.score) || 0);
  while (studentScores.length < 3) studentScores.push(70);

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
    totalScore: Number(raw.totalScore) || Math.round(maxScore * 0.7),
    maxScore,
    second: null,
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

interface Metrics {
  charCount: number;
  sentenceCount: number;
  charRangeOk: boolean | null;
  keywordHits: { keyword: string; count: number }[];
}

function analyzeAnswer(text: string, body: RequestBody): Metrics {
  const cleaned = text.trim();
  const charCount = cleaned.length;

  const sentences = cleaned
    .split(/[.!?。\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = sentences.length;

  let charRangeOk: boolean | null = null;
  if (body.minChars !== undefined && body.maxChars !== undefined) {
    charRangeOk = charCount >= body.minChars && charCount <= body.maxChars;
  }

  const keywordHits = (body.keywords ?? []).map((k) => ({
    keyword: k,
    count: (cleaned.match(new RegExp(k, "g")) ?? []).length,
  }));

  return { charCount, sentenceCount, charRangeOk, keywordHits };
}

// ============================================================
// 첫 제출 — 풀 분석
// ============================================================
function buildFullSystemPrompt(): string {
  return `당신은 중학생의 서술형 수행평가를 평가하는 전문 교사입니다.
서술형은 정해진 답이나 핵심 개념을 정확하게 짧게 서술하는 형식입니다.

═══════════════════════════════════════════
서술형 평가 3축 (반드시 이 순서로 scores 배열 작성)
═══════════════════════════════════════════
[1] 핵심 개념 (40%) — 출제 의도가 묻는 핵심 개념·용어가 정확히 들어갔는가
[2] 정확성 (40%) — 정의·사실·수치가 정확한가
[3] 간결성 (20%) — 군더더기 없이 핵심만 짧게 표현했는가

═══════════════════════════════════════════
평가 작성 원칙
═══════════════════════════════════════════
- 모호한 칭찬 금지. 어떤 개념이 정확했는지 짚어주세요.
- 빠진 핵심 요소가 있으면 명시: "○○ 개념이 빠졌어요"
- 부정확한 부분은 정정: "○○라고 썼는데 정확히는 △△예요"
- 학생이 쓴 표현 그대로 인용 권장

═══════════════════════════════════════════
점수 캘리브레이션 (모든 score는 0-100 정수)
═══════════════════════════════════════════
- 90+: 핵심 개념 모두 포함, 정확, 간결
- 80-89: 핵심 대부분 포함, 1-2개 보완점
- 70-79: 핵심 일부 빠짐 또는 표현 모호
- 60-69: 핵심 다수 빠짐 또는 부정확
- 60 미만: 핵심에서 크게 벗어남

대부분 65-85 사이.
totalScore는 maxScore 기준 환산.

═══════════════════════════════════════════
teacherDraft 작성
═══════════════════════════════════════════
[총평] 2-3문장
[잘한 점] 정확하게 짚은 개념 (구체적으로)
[개선할 점] 빠진 개념 또는 부정확한 부분 (정정 안내)
[다음 단계] 1문장

** 톤 ** 친근하지만 가르치는 톤, "~예요/~해요", 학생 이름 있으면 "○○님,"로 시작, 250-400자

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만)
═══════════════════════════════════════════
{
  "evalCriteria": "<서술형 평가 핵심 한 문장>",
  "scores": [
    { "label": "핵심 개념", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "정확성", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "간결성", "score": <0-100>, "max": 100, "desc": "<한 문장>" }
  ],
  "totalScore": <환산>,
  "summary": "<1-2문장>",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "teacherDraft": "<250-400자>"
}`;
}

function buildFullUserPrompt(body: RequestBody, m: Metrics): string {
  const parts: string[] = [];

  const meta: string[] = [];
  if (body.grade) meta.push(`학년: ${body.grade}`);
  if (body.questionSubject) meta.push(`과목: ${body.questionSubject}`);
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  meta.push(`수행평가 제목: ${body.questionTitle}`);
  if (body.ratio !== undefined) meta.push(`배점: ${body.ratio}점`);
  if (body.minChars !== undefined && body.maxChars !== undefined) {
    meta.push(`글자 수 제한: ${body.minChars}자 ~ ${body.maxChars}자`);
  }
  parts.push(`[기본 정보]\n${meta.join("\n")}`);
  parts.push(`[출제 문제]\n${body.questionContent}`);

  const metricLines = [
    `총 글자 수: ${m.charCount}자`,
    `문장 수: ${m.sentenceCount}개`,
  ];
  if (m.charRangeOk !== null) {
    metricLines.push(`글자 수 제한: ${m.charRangeOk ? "✓ 준수" : "✗ 위반"}`);
  }
  parts.push(`[사전 분석]\n${metricLines.join("\n")}`);

  parts.push(`[학생 답안]\n${body.answerText}`);

  parts.push(
    `위 답안을 분석하고 JSON 형식으로 응답하세요.\n` +
      `1. 3개 축(핵심개념/정확성/간결성) 각 0-100 점수\n` +
      `2. teacherDraft 250-400자\n` +
      `3. 반드시 JSON만 응답`
  );

  return parts.join("\n\n");
}

// ============================================================
// 재제출 — 비교 중심
// ============================================================
function buildComparisonSystemPrompt(): string {
  return `당신은 중학생의 서술형 수행평가를 평가하는 전문 교사입니다.
학생이 1차 답안을 받은 피드백을 보고 수정해서 재제출했습니다.
1차/2차 답안을 비교해서 무엇이 좋아졌고 무엇이 부족한지 알려주세요.

═══════════════════════════════════════════
[중요] 비교 피드백의 핵심
═══════════════════════════════════════════
- 점수 산정 X. 강점/개선점 따로 나열 X. 오직 "1차 → 2차 변화"에 집중.
- 서술형은 "정확한 개념·사실"이 핵심이므로 다음을 비교:
  1) 빠졌던 핵심 개념이 추가됐는가
  2) 부정확하던 부분이 정정됐는가
  3) 군더더기가 줄어들고 간결해졌는가
- 모호한 칭찬 금지. 잘 반영했으면 잘 반영했다고, 거의 반영 안 됐으면 그렇게.

═══════════════════════════════════════════
teacherDraft 작성
═══════════════════════════════════════════
[총평] 2-3문장 (1차 대비 발전을 한 마디)
[좋아진 점] 명확히 좋아진 부분 (구체적으로 인용)
[아직 보완할 점] 여전히 부족하거나 새로 생긴 약점 (있으면)
[격려] 짧은 격려 한 문장

** 톤 ** 친근한 코치 톤, "~예요/~해요", 학생 이름 있으면 "○○님,"로 시작, 200-350자

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만)
═══════════════════════════════════════════
{
  "improvedPoints": ["<좋아진 점 1>", "<좋아진 점 2>", ...],
  "remainingIssues": ["<부족한 점 1>", ...],
  "comparisonSummary": "<1-2문장 요약>",
  "teacherDraft": "<200-350자>"
}`;
}

function buildComparisonUserPrompt(body: RequestBody, m: Metrics): string {
  const parts: string[] = [];

  const meta: string[] = [];
  if (body.grade) meta.push(`학년: ${body.grade}`);
  if (body.questionSubject) meta.push(`과목: ${body.questionSubject}`);
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  meta.push(`수행평가 제목: ${body.questionTitle}`);
  parts.push(`[기본 정보]\n${meta.join("\n")}`);

  parts.push(`[출제 문제]\n${body.questionContent}`);
  parts.push(`[1차 답안]\n${body.previousAnswer}`);
  parts.push(`[1차 피드백 — 학생이 반영해야 했던 내용]\n${body.previousFeedback}`);
  parts.push(`[2차 답안 — 재제출본]\n${body.answerText}`);

  parts.push(
    `위 1차/2차 답안을 비교하세요.\n` +
      `1. improvedPoints: 좋아진 점 2-3개 (구체적으로)\n` +
      `2. remainingIssues: 부족한 점 0-2개\n` +
      `3. comparisonSummary: 1-2문장 요약\n` +
      `4. teacherDraft: 200-350자\n` +
      `5. JSON만 응답`
  );

  return parts.join("\n\n");
}