// supabase/functions/ai-suhaeng-research/index.ts
// 고등 수행평가 — 탐구보고서 AI 피드백

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
    console.error("[ai-suhaeng-research]", e);
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
  const sentences = cleaned.split(/[.!?。\n]+/).map(s => s.trim()).filter(s => s.length > 0);
  const paragraphCount = cleaned.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  const hasReference = /참고|출처|reference|인용/.test(cleaned.toLowerCase());
  const hasConclusion = /결론|따라서|시사점|느낀/.test(cleaned);
  const hasHypothesis = /가설|예상|추측|~할 것/.test(cleaned);
  return { charCount, sentenceCount: sentences.length, paragraphCount, hasReference, hasConclusion, hasHypothesis };
}

function buildFullSystem(evalCriteria?: EvalCriteria[]): string {
  const hasCustom = evalCriteria && evalCriteria.length > 0;
  const criteriaSection = hasCustom
    ? `[선생님이 설정한 평가 기준] — 반드시 이 기준으로 채점\n${evalCriteria!.map((c, i) => `[${i+1}] ${c.name} (${c.score}점 만점)`).join("\n")}\nscores 배열은 위 기준 순서대로, 각 max는 해당 기준의 만점으로 설정.`
    : `[기본 평가 기준 — 고등 탐구보고서]
[1] 탐구 주제 설정과 문제의식 (20%) - 탐구 질문의 명확성, 학문적 의미
[2] 자료 수집과 방법론의 타당성 (25%) - 1·2차 자료 활용, 출처 신뢰성, 조사 방법 적절성
[3] 분석 및 해석의 깊이 (30%) - 비판적 사고, 독자적 해석, 데이터 분석 수준
[4] 결론과 전공 연계 (15%) - 결론 도출, 시사점, 진로·전공 연결
[5] 보고서 형식과 완성도 (10%) - 구성 체계, 참고문헌, 학술적 표현`;

  return `당신은 고등학교 탐구보고서 수행평가를 평가하는 전문 교사이자 입시 전문가입니다.
학생의 탐구보고서를 분석해 학생부 세특 기재와 대입 연계 피드백을 제공합니다.

${criteriaSection}

핵심 평가 관점:
- 단순 인터넷 자료 복사 수준인가 vs 학생 자신의 분석이 있는가
- 탐구 질문(Research Question)이 명확하고 학문적인가
- 1차 자료(실험·설문·인터뷰)와 2차 자료의 균형
- 결론이 탐구 내용과 논리적으로 연결되는가
- 전공 관심 분야와의 연계성

점수 기준: 90+(대학 입학처에서 주목할 수준), 80-89(우수), 70-79(평균), 60-69(기초), 60미만(재작성).

teacherDraft 구조 (450-650자, "~예요/~해요", 이름 있으면 "○○님,"으로 시작):
[총평] 탐구의 학문적 가치와 완성도 2-3문장
[잘한 점] 강점 2-3개 (구체적 인용)
[개선할 점] 2-3개 (탐구 방법·분석 심화 방향)
[세특 힌트] "○○ 과목 세특에 '[주제]를 탐구하여...' 형태로 기재 가능"

응답 형식 (JSON만, 백틱 없이):
{
  "evalCriteria": "<핵심 평가 기준 한 문장>",
  "scores": [{ "label": "<기준명>", "score": <점수>, "max": <만점>, "desc": "<한 문장>" }, ...],
  "totalScore": <환산점수>, "summary": "<1-2문장>",
  "strengths": ["...", "...", "..."], "improvements": ["...", "...", "..."],
  "teacherDraft": "<450-650자>"
}`;
}

function buildFullUser(body: RequestBody, m: any): string {
  const meta = [`제목: ${body.questionTitle}`];
  if (body.grade) meta.unshift(`학년: ${body.grade}`);
  if (body.questionSubject) meta.push(`과목: ${body.questionSubject}`);
  if (body.studentName) meta.push(`학생: ${body.studentName}`);
  if (body.ratio !== undefined) meta.push(`배점: ${body.ratio}점`);
  if (body.evalCriteria?.length) meta.push(`평가기준: ${body.evalCriteria.map(c => `${c.name}(${c.score}점)`).join(", ")}`);
  const analysisNote = [`총 ${m.charCount}자 / 문단 ${m.paragraphCount}개`,
    m.hasReference ? "✓ 참고문헌 있음" : "✗ 참고문헌 없음",
    m.hasConclusion ? "✓ 결론 있음" : "✗ 결론 불명확",
    m.hasHypothesis ? "✓ 가설/예상 있음" : "✗ 가설 없음"].join(" / ");
  return [
    `[기본 정보]\n${meta.join(" / ")}`,
    `[출제 문제]\n${body.questionContent}`,
    `[사전 분석] ${analysisNote}`,
    `[학생 탐구보고서]\n${body.answerText}`,
    "위 탐구보고서를 고등 수준으로 심층 분석하고 JSON으로만 응답하세요."
  ].join("\n\n");
}

function buildComparisonSystem(): string {
  return `당신은 고등학교 탐구보고서 수행평가를 평가하는 전문 교사입니다.
1차 피드백 반영 여부와 탐구의 깊이·분석력 향상을 중심으로 비교 평가하세요.
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