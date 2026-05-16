// supabase/functions/ai-suhaeng-presentation/index.ts
// 고등 수행평가 — 발표·토론 AI 피드백

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
    console.error("[ai-suhaeng-presentation]", e);
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
  const hasPosition = /입장|찬성|반대|주장|저는|생각합니다/.test(cleaned);
  const hasEvidence = /근거|통계|사례|연구|데이터|따르면|자료/.test(cleaned);
  const hasCounter = /반론|반박|하지만|그러나|다른 시각|상대방/.test(cleaned);
  const hasConclusion = /결론|따라서|정리하면|마무리/.test(cleaned);
  return { charCount, paragraphCount, hasPosition, hasEvidence, hasCounter, hasConclusion };
}

function buildFullSystem(evalCriteria?: EvalCriteria[]): string {
  const hasCustom = evalCriteria && evalCriteria.length > 0;
  const criteriaSection = hasCustom
    ? `[선생님이 설정한 평가 기준] — 반드시 이 기준으로 채점\n${evalCriteria!.map((c, i) => `[${i+1}] ${c.name} (${c.score}점 만점)`).join("\n")}\nscores 배열은 위 기준 순서대로, 각 max는 해당 기준의 만점으로 설정.`
    : `[기본 평가 기준 — 고등 발표·토론]
[1] 입장 명확성과 논제 이해 (20%) - 찬반 입장의 명확성, 논제 파악 수준
[2] 근거의 질과 다양성 (30%) - 통계·사례·전문가 의견 등 근거의 신뢰성과 다양성
[3] 반론 대응과 논리 흐름 (25%) - 예상 반론 설정과 논리적 대응, 전체 논거 흐름
[4] 발표 구성과 설득력 (15%) - 서론-본론-결론 구성, 청중 설득 전략
[5] 표현력과 전달력 (10%) - 어휘 수준, 문장 구성, 발표 원고 완성도`;

  return `당신은 고등학교 발표·토론 수행평가를 평가하는 전문 교사이자 입시 전문가입니다.
논리적 사고력과 설득 능력을 중심으로 평가하며, 면접·토론 대비 관점의 피드백을 제공합니다.

${criteriaSection}

핵심 평가 관점:
- 단순 의견 나열이 아닌 논리적 근거 체계를 갖췄는가
- 통계·사례·전문가 의견 등 다양한 근거를 활용했는가
- 예상 반론을 설정하고 논리적으로 대응했는가
- 입장→근거→반론대응→결론의 논거 흐름이 자연스러운가
- 대입 면접·구술고사에서도 활용 가능한 수준인가

점수 기준: 90+(대입 면접·토론 상위권), 80-89(우수), 70-79(평균), 60-69(기초), 60미만(재작성).

teacherDraft 구조 (400-600자, "~예요/~해요", 이름 있으면 "○○님,"으로 시작):
[총평] 논리 구조와 설득력 2-3문장 (면접 연계 포함)
[잘한 점] 강점 2-3개 (구체적 근거 인용)
[개선할 점] 2-3개 (반론 대응·근거 보강 방향)
[세특 힌트] 발표·토론 활동을 학생부에 기재하는 방향 1문장

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
    m.hasPosition ? "✓ 입장 명확" : "✗ 입장 불명확",
    m.hasEvidence ? "✓ 근거 있음" : "✗ 근거 부족",
    m.hasCounter ? "✓ 반론 대응 있음" : "✗ 반론 대응 없음",
    m.hasConclusion ? "✓ 결론 있음" : "✗ 결론 없음"].join(" / ");
  return [
    `[기본 정보]\n${meta.join(" / ")}`,
    `[출제 문제]\n${body.questionContent}`,
    `[사전 분석] ${note}`,
    `[학생 발표·토론 원고]\n${body.answerText}`,
    "위 발표·토론 원고를 고등 수준으로 심층 분석하고 JSON으로만 응답하세요."
  ].join("\n\n");
}

function buildComparisonSystem(): string {
  return `당신은 고등학교 발표·토론 수행평가를 평가하는 전문 교사입니다.
근거의 질적 향상과 반론 대응 능력 발전을 중심으로 비교 평가하세요.
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
    `[1차 원고]\n${body.previousAnswer}`,
    `[1차 피드백]\n${body.previousFeedback}`,
    `[2차 원고 (${m.charCount}자)]\n${body.answerText}`,
    "1차→2차 변화를 비교 분석하고 JSON으로만 응답하세요."
  ].join("\n\n");
}