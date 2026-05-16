// supabase/functions/ai-suhaeng-essay/index.ts
// 고등 수행평가 — 글쓰기·논술 AI 피드백

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface EvalCriteria { name: string; score: number }
interface RequestBody {
  questionTitle: string; questionContent: string; questionSubject?: string;
  minChars?: number; maxChars?: number; answerText: string;
  grade?: string; studentName?: string; ratio?: number;
  evalCriteria?: EvalCriteria[]; previousAnswer?: string; previousFeedback?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  try {
    const body: RequestBody = await req.json();
    if (!body.answerText || body.answerText.trim().length < 10) return jsonError("답안이 너무 짧습니다.", 400);
    // questionContent는 선택사항 (우리학교 수행평가는 없을 수 있음);
    const isResubmission = !!(body.previousAnswer && body.previousFeedback);
    const metrics = analyzeAnswer(body.answerText, body);
    const systemPrompt = isResubmission ? buildComparisonSystem() : buildFullSystem(body.evalCriteria);
    const userPrompt = isResubmission ? buildComparisonUser(body, metrics) : buildFullUser(body, metrics);
    const { feedback, tokensUsed, model } = await callOpenAI({ systemPrompt, userPrompt, model: "gpt-4o", temperature: 0.3 });
    const ratio = body.ratio ?? 100;
    const result = isResubmission ? normalizeComparison(feedback) : normalizeFullAnalysis(feedback, ratio);
    return jsonResponse({ success: true, analysis: result, meta: { isResubmission, model, tokensUsed, metrics } });
  } catch (e) {
    console.error("[ai-suhaeng-essay]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function normalizeFullAnalysis(raw: any, maxScore: number) {
  const scores = Array.isArray(raw.scores) ? raw.scores : [];
  return {
    evalCriteria: raw.evalCriteria ?? "",
    studentScores: scores.map((s: any) => Number(s.score) || 0),
    scores: scores.map((s: any) => ({ label: s.label ?? "", score: Number(s.score) || 0, max: Number(s.max) || 100, desc: s.desc ?? "" })),
    summary: raw.summary ?? "", strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements : [],
    totalScore: Number(raw.totalScore) || Math.round(maxScore * 0.7), maxScore, second: null, teacherDraft: raw.teacherDraft ?? "",
  };
}

function normalizeComparison(raw: any) {
  return {
    isComparison: true, improvedPoints: Array.isArray(raw.improvedPoints) ? raw.improvedPoints : [],
    remainingIssues: Array.isArray(raw.remainingIssues) ? raw.remainingIssues : [],
    comparisonSummary: raw.comparisonSummary ?? "", teacherDraft: raw.teacherDraft ?? "",
  };
}

function analyzeAnswer(text: string, body: RequestBody) {
  const cleaned = text.trim(); const charCount = cleaned.length;
  const sentences = cleaned.split(/[.!?。\n]+/).map(s => s.trim()).filter(s => s.length > 0);
  const charRangeOk = (body.minChars !== undefined && body.maxChars !== undefined) ? (charCount >= body.minChars && charCount <= body.maxChars) : null;
  const paragraphCount = cleaned.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  return { charCount, sentenceCount: sentences.length, charRangeOk, paragraphCount };
}

function buildFullSystem(evalCriteria?: EvalCriteria[]): string {
  const hasCustom = evalCriteria && evalCriteria.length > 0;
  const criteriaSection = hasCustom
    ? `═══════════════════════════════════════════
[선생님이 설정한 평가 기준] — 반드시 이 기준으로 채점
═══════════════════════════════════════════
${evalCriteria!.map((c, i) => `[${i+1}] ${c.name} (${c.score}점 만점)`).join("\n")}
scores 배열은 위 기준 순서대로, 각 max는 해당 기준의 만점으로 설정.`
    : `═══════════════════════════════════════════
[기본 평가 기준 — 고등 글쓰기·논술]
═══════════════════════════════════════════
[1] 논제 이해 및 구조 (25%) - 서론/본론/결론 구성, 논제 파악 정확도
[2] 주장과 근거의 논리성 (30%) - 주장 명확성, 근거의 타당성·다양성
[3] 비판적 사고와 독창성 (30%) - 다양한 관점, 반론 수용, 독자적 시각
[4] 학술적 표현력과 분량 (15%) - 고등 수준 어휘, 문장 완성도, 분량 준수`;

  return `당신은 고등학교 글쓰기·논술 수행평가를 평가하는 전문 교사이자 입시 전문가입니다.
대입 수시 논술·학생부 세특 기재와 연계한 심화 피드백을 제공합니다.

${criteriaSection}

점수 기준: 90+(대입 논술 상위권), 80-89(우수), 70-79(평균), 60-69(기초), 60미만(재작성 필요). 대부분 60-80.
totalScore = 각 축 가중 평균 → maxScore 기준 환산.

teacherDraft 구조 (400-600자, "~예요/~해요" 톤, 이름 있으면 "○○님,"으로 시작):
[총평] 2-3문장 (대입·세특 연계 관점)
[잘한 점] 강점 2-3개 (답안 직접 인용)
[개선할 점] 2-3개 (what + how + 대입 논술 연계)
[세특 힌트] 학생부 기재 방향 1문장

응답 형식 (JSON만, 백틱 없이):
{
  "evalCriteria": "<핵심 평가 기준 한 문장>",
  "scores": [{ "label": "<기준명>", "score": <점수>, "max": <만점>, "desc": "<한 문장>" }, ...],
  "totalScore": <환산점수>, "summary": "<1-2문장>",
  "strengths": ["...", "...", "..."], "improvements": ["...", "...", "..."],
  "teacherDraft": "<400-600자>"
}`;
}

function buildFullUser(body: RequestBody, m: any): string {
  const parts: string[] = [];
  const meta = [`제목: ${body.questionTitle}`];
  if (body.grade) meta.unshift(`학년: ${body.grade}`);
  if (body.questionSubject) meta.push(`과목: ${body.questionSubject}`);
  if (body.studentName) meta.push(`학생: ${body.studentName}`);
  if (body.ratio !== undefined) meta.push(`배점: ${body.ratio}점`);
  if (body.minChars && body.maxChars) meta.push(`글자수: ${body.minChars}~${body.maxChars}자`);
  if (body.evalCriteria?.length) meta.push(`평가기준: ${body.evalCriteria.map(c => `${c.name}(${c.score}점)`).join(", ")}`);
  parts.push(`[기본 정보]\n${meta.join(" / ")}`);
  parts.push(`[출제 문제]\n${body.questionContent}`);
  parts.push(`[사전 분석] 총 ${m.charCount}자 / 문장 ${m.sentenceCount}개 / 문단 ${m.paragraphCount}개${m.charRangeOk !== null ? ` / ${m.charRangeOk ? "✓ 분량 준수" : "✗ 분량 위반"}` : ""}`);
  parts.push(`[학생 답안]\n${body.answerText}`);
  parts.push("위 답안을 고등 논술 기준으로 심층 분석하고 JSON으로만 응답하세요.");
  return parts.join("\n\n");
}

function buildComparisonSystem(): string {
  return `당신은 고등학교 논술 수행평가를 평가하는 전문 교사입니다.
1차 피드백 반영 여부와 논리성·근거의 질적 향상을 중심으로 비교 평가하세요.
모호한 칭찬 금지. 구체적 인용 권장.
응답 형식 (JSON만):
{
  "improvedPoints": ["<좋아진 점 (구체적)>", "..."],
  "remainingIssues": ["<아직 부족한 점>", "..."],
  "comparisonSummary": "<1-2문장>",
  "teacherDraft": "<300-450자, [총평]/[좋아진 점]/[보완할 점]/[격려]>"
}`;
}

function buildComparisonUser(body: RequestBody, m: any): string {
  return [
    `학년: ${body.grade || ""} / 과목: ${body.questionSubject || ""} / 학생: ${body.studentName || ""}`,
    `[출제 문제]\n${body.questionContent}`,
    `[1차 답안]\n${body.previousAnswer}`,
    `[1차 피드백]\n${body.previousFeedback}`,
    `[2차 답안 (${m.charCount}자)]\n${body.answerText}`,
    "1차→2차 변화를 비교 분석하고 JSON으로만 응답하세요."
  ].join("\n\n");
}