// supabase/functions/ai-suhaeng-project/index.ts
// 고등 수행평가 — 프로젝트·산출물 AI 피드백

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
    console.error("[ai-suhaeng-project]", e);
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
  const hasGoal = /목표|목적|문제|해결/.test(cleaned);
  const hasProcess = /과정|단계|진행|수행/.test(cleaned);
  const hasResult = /결과|산출물|완성|제작/.test(cleaned);
  const hasReflection = /성찰|느낀|어려웠|개선|배운/.test(cleaned);
  return { charCount, paragraphCount, hasGoal, hasProcess, hasResult, hasReflection };
}

function buildFullSystem(evalCriteria?: EvalCriteria[]): string {
  const hasCustom = evalCriteria && evalCriteria.length > 0;
  const criteriaSection = hasCustom
    ? `[선생님이 설정한 평가 기준] — 반드시 이 기준으로 채점\n${evalCriteria!.map((c, i) => `[${i+1}] ${c.name} (${c.score}점 만점)`).join("\n")}\nscores 배열은 위 기준 순서대로, 각 max는 해당 기준의 만점으로 설정.`
    : `[기본 평가 기준 — 고등 프로젝트·산출물]
[1] 문제 정의와 목표 설정 (20%) - 해결할 문제의 명확성, 목표의 구체성
[2] 기획과 실행 과정 (25%) - 체계적 계획, 단계별 실행, 문제 해결 과정
[3] 산출물의 창의성과 완성도 (30%) - 독창적 아이디어, 실현 가능성, 품질
[4] 성찰과 발전 가능성 (15%) - 어려움 극복 과정, 개선점 인식, 확장 방향
[5] 전공 연계와 사회적 가치 (10%) - 진로와의 연결, 사회 문제 해결 기여`;

  return `당신은 고등학교 프로젝트·산출물 수행평가를 평가하는 전문 교사이자 입시 전문가입니다.
기획력·실행력·창의성을 중심으로 평가하며, 학생부 세특과 대입 연계 피드백을 제공합니다.

${criteriaSection}

핵심 평가 관점:
- 단순 결과물 설명이 아닌 기획→실행→성찰의 전 과정이 담겼는가
- 창의적 문제 해결 접근이 있는가 (기존 방식과의 차별점)
- 실현 가능한 계획이었는가, 예상치 못한 문제를 어떻게 해결했는가
- 산출물이 교과 지식을 실제 문제 해결에 적용한 결과인가
- 진로·전공 연계성이 드러나는가

점수 기준: 90+(대입 서류·면접에서 차별화될 프로젝트), 80-89(우수), 70-79(평균), 60-69(기초), 60미만(재작성).

teacherDraft 구조 (400-600자, "~예요/~해요", 이름 있으면 "○○님,"으로 시작):
[총평] 프로젝트의 창의성과 완성도 2-3문장
[잘한 점] 강점 2-3개 (구체적 인용)
[개선할 점] 2-3개 (완성도·전공 연계 심화 방향)
[세특 힌트] 이 프로젝트를 학생부에 기재하는 방향 1문장

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
    m.hasGoal ? "✓ 목표 있음" : "✗ 목표 불명확",
    m.hasProcess ? "✓ 수행 과정 있음" : "✗ 수행 과정 없음",
    m.hasResult ? "✓ 결과물 설명 있음" : "✗ 결과물 설명 없음",
    m.hasReflection ? "✓ 성찰 있음" : "✗ 성찰 없음"].join(" / ");
  return [
    `[기본 정보]\n${meta.join(" / ")}`,
    `[출제 문제]\n${body.questionContent}`,
    `[사전 분석] ${note}`,
    `[학생 프로젝트 보고서]\n${body.answerText}`,
    "위 프로젝트 보고서를 고등 수준으로 심층 분석하고 JSON으로만 응답하세요."
  ].join("\n\n");
}

function buildComparisonSystem(): string {
  return `당신은 고등학교 프로젝트·산출물 수행평가를 평가하는 전문 교사입니다.
창의성·완성도·성찰의 향상을 중심으로 비교 평가하세요.
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