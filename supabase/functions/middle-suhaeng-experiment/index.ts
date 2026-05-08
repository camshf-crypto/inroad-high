// supabase/functions/middle-suhaeng-experiment/index.ts
// 중등 수행평가 — 탐구수행 AI 피드백
// 첫 제출: 풀 분석 (4축: 가설/실험설계/결과해석/결론)
// 재제출: 비교 중심

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

    if (!body.answerText || body.answerText.trim().length < 30) {
      return jsonError("답안이 비어있거나 너무 짧습니다.", 400);
    }
    if (!body.questionContent || !body.questionTitle) {
      return jsonError("문제 정보가 누락되었습니다.", 400);
    }

    const isResubmission = !!(body.previousAnswer && body.previousFeedback);
    const metrics = analyzeAnswer(body.answerText);

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
    console.error("[middle-suhaeng-experiment]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function normalizeFullAnalysis(raw: any, maxScore: number) {
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
  paragraphCount: number;
  hasHypothesis: boolean;
  hasNumbers: boolean;
  hasMethod: boolean;
}

function analyzeAnswer(text: string): Metrics {
  const cleaned = text.trim();
  const charCount = cleaned.length;
  const paragraphs = cleaned.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length;

  const hasHypothesis = /(가설|예상|예측|일 것이다|것으로 보)/.test(cleaned);
  const hasNumbers = /\d+\s*(g|kg|ml|L|cm|mm|°C|초|분|회|개|배|%)/.test(cleaned);
  const hasMethod = /(방법|순서|단계|준비물|먼저|다음으로|그리고나서|마지막으로)/.test(cleaned);

  return { charCount, paragraphCount, hasHypothesis, hasNumbers, hasMethod };
}

function buildFullSystemPrompt(): string {
  return `당신은 중학생의 탐구수행 수행평가를 평가하는 전문 교사입니다.
탐구수행은 학생이 직접 가설을 세우고 실험·관찰을 통해 결과를 도출하는 과제입니다.

═══════════════════════════════════════════
탐구수행 평가 4축 (반드시 이 순서)
═══════════════════════════════════════════
[1] 가설 (20%) — 검증 가능한가, 탐구 질문과 일관되는가
[2] 실험 설계 (30%) — 방법 명확, 변인 통제, 안전 고려
[3] 결과 해석 (30%) — 정량적 데이터, 패턴/경향 해석, 가설 일치/불일치
[4] 결론 (20%) — 결과에서 자연스럽게 도출, 처음 질문에 답함

═══════════════════════════════════════════
평가 작성 원칙
═══════════════════════════════════════════
- 모호한 칭찬 금지
- 가설 약함: "가설이 막연해요. '○○하면 △△할 것이다' 형식으로 구체화하면 좋아요"
- 변인 통제 부족: "한 번에 한 가지만 바꿔보세요"
- 정량화 부족: "관찰 결과를 숫자로 기록하면 비교가 쉬워져요"

═══════════════════════════════════════════
점수 캘리브레이션
═══════════════════════════════════════════
- 90+: 가설·설계·해석·결론 모두 탄탄
- 80-89: 1-2개 축 보완 필요
- 70-79: 정량화/변인통제 약함
- 60-69: 단순 활동 보고
- 60 미만: 흐름 자체가 안 잡힘

대부분 65-82 사이.

═══════════════════════════════════════════
teacherDraft 작성
═══════════════════════════════════════════
[총평] 2-3문장
[잘한 점] 2-3개 bullet
[개선할 점] 2-3개 bullet (다음 실험 때 적용 가능한 조언)
[다음 단계] 1-2문장

** 톤 ** 과학적 사고 격려, "○○님,"로 시작, 350-500자

═══════════════════════════════════════════
응답 형식 (JSON만)
═══════════════════════════════════════════
{
  "evalCriteria": "<탐구수행 평가 핵심 한 문장>",
  "scores": [
    { "label": "가설", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "실험 설계", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "결과 해석", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "결론", "score": <0-100>, "max": 100, "desc": "<한 문장>" }
  ],
  "totalScore": <환산>,
  "summary": "<1-2문장>",
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "teacherDraft": "<350-500자>"
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
  parts.push(`[기본 정보]\n${meta.join("\n")}`);
  parts.push(`[출제 문제]\n${body.questionContent}`);

  const metricLines = [
    `총 글자 수: ${m.charCount}자`,
    `문단 수: ${m.paragraphCount}개`,
    `가설 형식 감지: ${m.hasHypothesis ? "✓" : "✗"}`,
    `정량적 수치 포함: ${m.hasNumbers ? "✓" : "✗"}`,
    `실험 방법 명시: ${m.hasMethod ? "✓" : "✗"}`,
  ];
  parts.push(`[사전 분석]\n${metricLines.join("\n")}`);

  parts.push(`[학생 답안 — 6섹션 통합]\n${body.answerText}`);

  parts.push(
    `JSON으로 응답하세요.\n` +
      `1. 4개 축 각 0-100 점수\n` +
      `2. hasHypothesis, hasNumbers, hasMethod 반영\n` +
      `3. teacherDraft 350-500자\n` +
      `4. JSON만 응답`
  );

  return parts.join("\n\n");
}

function buildComparisonSystemPrompt(): string {
  return `당신은 중학생의 탐구수행 수행평가를 평가하는 전문 교사입니다.
학생이 1차 답안을 받은 피드백을 보고 수정해서 재제출했습니다.
1차/2차 답안을 비교해서 무엇이 좋아졌고 무엇이 부족한지 알려주세요.

═══════════════════════════════════════════
[중요] 비교 피드백의 핵심
═══════════════════════════════════════════
- 점수 산정 X. 강점/개선점 따로 나열 X. "1차 → 2차 변화"에 집중.
- 탐구수행은 다음 변화를 우선 비교:
  1) 가설이 더 검증 가능하고 구체적이 됐는가
  2) 변인 통제·실험 설계가 보완됐는가
  3) 결과의 정량화·해석이 깊어졌는가
  4) 결론이 결과로부터 더 자연스럽게 도출되는가
- 모호한 칭찬 금지

═══════════════════════════════════════════
teacherDraft
═══════════════════════════════════════════
[총평] 2-3문장
[좋아진 점] 구체적으로
[아직 보완할 점] 있으면
[격려] 한 문장

** 톤 ** 과학적 사고 격려 코치 톤, "○○님,"로 시작, 300-450자

═══════════════════════════════════════════
응답 형식 (JSON만)
═══════════════════════════════════════════
{
  "improvedPoints": ["...", "...", "..."],
  "remainingIssues": ["..."],
  "comparisonSummary": "<1-2문장>",
  "teacherDraft": "<300-450자>"
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
  parts.push(`[1차 피드백]\n${body.previousFeedback}`);
  parts.push(`[2차 답안]\n${body.answerText}`);

  parts.push(
    `1차/2차 비교하세요.\n` +
      `1. improvedPoints 2-3개\n` +
      `2. remainingIssues 0-2개\n` +
      `3. comparisonSummary 1-2문장\n` +
      `4. teacherDraft 300-450자\n` +
      `5. JSON만 응답`
  );

  return parts.join("\n\n");
}