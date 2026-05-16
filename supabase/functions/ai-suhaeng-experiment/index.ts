// supabase/functions/ai-suhaeng-experiment/index.ts
// 고등 수행평가 — 실험·실습 AI 피드백

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface EvalCriteria { name: string; score: number }
interface RequestBody {
  questionTitle: string; questionContent: string; questionSubject?: string;
  answerText: string; grade?: string; studentName?: string; ratio?: number;
  evalCriteria?: EvalCriteria[]; previousAnswer?: string; previousFeedback?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  try {
    const body: RequestBody = await req.json();
    if (!body.answerText || body.answerText.trim().length < 10) return jsonError("답안이 너무 짧습니다.", 400);
    const isResubmission = !!(body.previousAnswer && body.previousFeedback);
    const metrics = analyzeAnswer(body.answerText);
    const systemPrompt = isResubmission ? buildComparisonSystem() : buildFullSystem(body.evalCriteria);
    const userPrompt = isResubmission ? buildComparisonUser(body, metrics) : buildFullUser(body, metrics);
    const { feedback, tokensUsed, model } = await callOpenAI({ systemPrompt, userPrompt, model: "gpt-4o", temperature: 0.3 });
    const ratio = body.ratio ?? 100;
    const result = isResubmission ? normalizeComparison(feedback) : normalizeFullAnalysis(feedback, ratio);
    return jsonResponse({ success: true, analysis: result, meta: { isResubmission, model, tokensUsed, metrics } });
  } catch (e) {
    console.error("[ai-suhaeng-experiment]", e);
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

function analyzeAnswer(text: string) {
  const cleaned = text.trim(); const charCount = cleaned.length;
  const paragraphCount = cleaned.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  const hasHypothesis = /가설|예상|~할 것이다|~것으로 예상/.test(cleaned);
  const hasVariables = /독립변인|종속변인|통제변인|변수/.test(cleaned);
  const hasData = /측정|데이터|수치|결과값|\d+[㎝㎜ml°%]/.test(cleaned);
  const hasErrorAnalysis = /오차|이유|한계|문제점|개선/.test(cleaned);
  const hasConclusion = /결론|따라서|가설.*맞|가설.*틀/.test(cleaned);
  return { charCount, paragraphCount, hasHypothesis, hasVariables, hasData, hasErrorAnalysis, hasConclusion };
}

function buildFullSystem(evalCriteria?: EvalCriteria[]): string {
  const hasCustom = evalCriteria && evalCriteria.length > 0;
  const criteriaSection = hasCustom
    ? `[선생님이 설정한 평가 기준] — 반드시 이 기준으로 채점\n${evalCriteria!.map((c, i) => `[${i+1}] ${c.name} (${c.score}점 만점)`).join("\n")}\nscores 배열은 위 기준 순서대로, 각 max는 해당 기준의 만점으로 설정.`
    : `[기본 평가 기준 — 고등 실험·실습]
[1] 가설 설정과 변인 통제 (25%) - 독립·종속·통제변인 명확성, 가설의 과학적 타당성
[2] 실험 설계와 수행 (25%) - 실험 방법의 적절성, 반복 측정, 안전 고려
[3] 데이터 수집과 분석 (25%) - 정량적 데이터, 그래프·표 작성, 통계적 사고
[4] 오차 분석과 결론 (15%) - 이론값과 비교, 오차 원인 분석, 결론의 논리성
[5] 실생활 연계와 과학적 사고 (10%) - 실험 결과의 응용, 추가 탐구 방향`;

  return `당신은 고등학교 실험·실습 수행평가를 평가하는 전문 과학 교사이자 입시 전문가입니다.
과학적 탐구 과정과 사고력을 중심으로 평가하며, 이공계 진로 연계 피드백을 제공합니다.

${criteriaSection}

핵심 평가 관점:
- 변인 통제가 제대로 됐는가 (독립·종속·통제변인 명확히 구분)
- 가설이 과학적으로 타당하고 검증 가능한가
- 정량적 데이터가 있고 적절히 분석됐는가 (단순 관찰 나열 X)
- 오차 분석이 구체적인가 (단순 "실수 때문" X, 구체적 원인 분석)
- 실험 결과가 이론과 어떻게 연결되는가
- 이공계 대입을 위한 탐구 능력이 드러나는가

점수 기준: 90+(이공계 대입 서류에서 주목할 탐구), 80-89(우수), 70-79(평균), 60-69(기초), 60미만(재작성).

teacherDraft 구조 (400-600자, "~예요/~해요", 이름 있으면 "○○님,"으로 시작):
[총평] 과학적 탐구 수준과 완성도 2-3문장 (이공계 연계 포함)
[잘한 점] 강점 2-3개 (구체적 수치·방법 인용)
[개선할 점] 2-3개 (변인 통제·오차 분석·데이터 처리 심화 방향)
[세특 힌트] 이공계 세특에 기재하는 방향 1문장

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
  const meta = [`제목: ${body.questionTitle}`];
  if (body.grade) meta.unshift(`학년: ${body.grade}`);
  if (body.questionSubject) meta.push(`과목: ${body.questionSubject}`);
  if (body.studentName) meta.push(`학생: ${body.studentName}`);
  if (body.ratio !== undefined) meta.push(`배점: ${body.ratio}점`);
  if (body.evalCriteria?.length) meta.push(`평가기준: ${body.evalCriteria.map(c => `${c.name}(${c.score}점)`).join(", ")}`);
  const note = [`총 ${m.charCount}자 / 문단 ${m.paragraphCount}개`,
    m.hasHypothesis ? "✓ 가설 있음" : "✗ 가설 없음",
    m.hasVariables ? "✓ 변인 명시" : "✗ 변인 미명시",
    m.hasData ? "✓ 정량 데이터 있음" : "✗ 정량 데이터 없음",
    m.hasErrorAnalysis ? "✓ 오차 분석 있음" : "✗ 오차 분석 없음",
    m.hasConclusion ? "✓ 결론 있음" : "✗ 결론 없음"].join(" / ");
  return [
    `[기본 정보]\n${meta.join(" / ")}`,
    `[출제 문제]\n${body.questionContent}`,
    `[사전 분석] ${note}`,
    `[학생 실험 보고서]\n${body.answerText}`,
    "위 실험 보고서를 고등 과학 탐구 기준으로 심층 분석하고 JSON으로만 응답하세요."
  ].join("\n\n");
}

function buildComparisonSystem(): string {
  return `당신은 고등학교 실험·실습 수행평가를 평가하는 전문 교사입니다.
변인 통제·오차 분석·데이터 처리의 향상을 중심으로 비교 평가하세요.
응답 형식 (JSON만):
{
  "improvedPoints": ["<좋아진 점>", "..."],
  "remainingIssues": ["<아직 부족한 점>", "..."],
  "comparisonSummary": "<1-2문장>",
  "teacherDraft": "<300-450자>"
}`;
}

function buildComparisonUser(body: RequestBody, m: any): string {
  return [
    `학년: ${body.grade || ""} / 과목: ${body.questionSubject || ""} / 학생: ${body.studentName || ""}`,
    `[출제 문제]\n${body.questionContent}`,
    `[1차 보고서]\n${body.previousAnswer}`,
    `[1차 피드백]\n${body.previousFeedback}`,
    `[2차 보고서 (${m.charCount}자)]\n${body.answerText}`,
    "1차→2차 변화를 비교 분석하고 JSON으로만 응답하세요."
  ].join("\n\n");
}