// supabase/functions/ai-suhaeng-reading/index.ts
// 고등 수행평가 — 독서기록 AI 피드백

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
    console.error("[ai-suhaeng-reading]", e);
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
  const hasCritical = /비판|한계|문제점|아쉬운|다른 시각|반론/.test(cleaned);
  const hasCareerLink = /진로|전공|꿈|미래|관심|연결|적용/.test(cleaned);
  const hasQuote = /["'"'「」『』]/.test(cleaned);
  return { charCount, paragraphCount, hasCritical, hasCareerLink, hasQuote };
}

function buildFullSystem(evalCriteria?: EvalCriteria[]): string {
  const hasCustom = evalCriteria && evalCriteria.length > 0;
  const criteriaSection = hasCustom
    ? `[선생님이 설정한 평가 기준] — 반드시 이 기준으로 채점\n${evalCriteria!.map((c, i) => `[${i+1}] ${c.name} (${c.score}점 만점)`).join("\n")}\nscores 배열은 위 기준 순서대로, 각 max는 해당 기준의 만점으로 설정.`
    : `[기본 평가 기준 — 고등 독서기록]
[1] 핵심 내용 이해와 요약 (20%) - 도서의 핵심 주장·내용 정확한 파악
[2] 비판적 독해 능력 (30%) - 저자 주장의 한계 분석, 대안적 시각 제시
[3] 전공·진로 연계 사고 (25%) - 독서 내용과 진로/관심 분야 연결의 깊이
[4] 독서의 내면화와 적용 (15%) - 삶에 적용하는 구체적 방향
[5] 표현력과 독서 태도 (10%) - 어휘·문장 수준, 성실성, 추가 탐구 의지`;

  return `당신은 고등학교 독서기록 수행평가를 평가하는 전문 교사이자 입시 전문가입니다.
단순 감상문이 아닌 학문적 독서 능력과 진로 연계 사고력을 중심으로 평가합니다.
학생부 세특의 "독서 활동" 항목과 직접 연결되는 피드백을 제공합니다.

${criteriaSection}

핵심 평가 관점:
- 줄거리 요약에 그치지 않고 저자의 논지를 분석했는가
- 비판적 독해: 저자 주장의 한계나 대안적 시각을 제시했는가
- 독서 내용이 학생의 진로·전공 관심사와 실질적으로 연결됐는가
- 단순 감상이 아닌 학문적 사고의 흔적이 보이는가
- 다른 도서나 학습 내용과 연결하는 비교 독서가 있는가

점수 기준: 90+(대입 서류에서 주목할 독서기록), 80-89(우수), 70-79(평균), 60-69(기초 감상문 수준), 60미만(재작성).

teacherDraft 구조 (400-600자, "~예요/~해요", 이름 있으면 "○○님,"으로 시작):
[총평] 독서의 학문적 깊이와 진로 연계 2-3문장
[잘한 점] 강점 2-3개 (구체적 인용)
[개선할 점] 2-3개 (비판적 독해·전공 연계 심화 방향)
[세특 힌트] 독서 활동을 학생부에 기재하는 방향 1문장

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
    m.hasCritical ? "✓ 비판적 시각 있음" : "✗ 비판적 시각 없음",
    m.hasCareerLink ? "✓ 진로 연계 있음" : "✗ 진로 연계 없음",
    m.hasQuote ? "✓ 인용구 있음" : "✗ 인용구 없음"].join(" / ");
  return [
    `[기본 정보]\n${meta.join(" / ")}`,
    `[출제 문제]\n${body.questionContent}`,
    `[사전 분석] ${note}`,
    `[학생 독서기록]\n${body.answerText}`,
    "위 독서기록을 고등 수준으로 심층 분석하고 JSON으로만 응답하세요."
  ].join("\n\n");
}

function buildComparisonSystem(): string {
  return `당신은 고등학교 독서기록 수행평가를 평가하는 전문 교사입니다.
비판적 독해와 진로 연계 사고의 향상을 중심으로 비교 평가하세요.
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
    `[1차 독서기록]\n${body.previousAnswer}`,
    `[1차 피드백]\n${body.previousFeedback}`,
    `[2차 독서기록 (${m.charCount}자)]\n${body.answerText}`,
    "1차→2차 변화를 비교 분석하고 JSON으로만 응답하세요."
  ].join("\n\n");
}