// supabase/functions/middle-suhaeng-research/index.ts
// 중등 수행평가 — 주제탐구 AI 피드백
// 첫 제출: 풀 분석 (4축: 자료조사/분석력/결론도출/형식)
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
    console.error("[middle-suhaeng-research]", e);
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
  hasNumbers: boolean;
  hasReference: boolean;
}

function analyzeAnswer(text: string): Metrics {
  const cleaned = text.trim();
  const charCount = cleaned.length;
  const paragraphs = cleaned.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length;
  const hasNumbers = /\d+\s*(년|월|일|%|명|개|회|건|위|위[가는도])/.test(cleaned);
  const hasReference = /(출처|참고|자료|보고서|논문|기사|뉴스|책|저자|http|www)/.test(cleaned);

  return { charCount, paragraphCount, hasNumbers, hasReference };
}

function buildFullSystemPrompt(): string {
  return `당신은 중학생의 주제탐구 수행평가를 평가하는 전문 교사입니다.
주제탐구는 학생이 관심 주제를 정해 자료를 조사·분석하고 결론을 도출하는 과제입니다.

═══════════════════════════════════════════
주제탐구 평가 4축 (반드시 이 순서)
═══════════════════════════════════════════
[1] 자료 조사 (30%) — 적절한 자료, 명확한 출처, 구체적 수치/사례
[2] 분석력 (30%) — 단순 나열이 아닌 분석/해석, 자기 생각과 자료의 연결
[3] 결론 도출 (25%) — 결론이 분석에서 자연스럽게 나오는가, 명확한가
[4] 형식 (15%) — 5섹션 구조 (배경/방법/내용/분석/참고)

═══════════════════════════════════════════
평가 작성 원칙
═══════════════════════════════════════════
- 모호한 칭찬 금지
- 분석 부족: "자료는 좋은데 분석이 부족해요. 예: ○○ 자료를 보고 △△라는 점을 짚어주면 좋아요"
- 결론과 본문 어긋남: "결론에서 ○○라고 했는데 본문에 근거가 약해요"
- 학생 답안 인용 권장

═══════════════════════════════════════════
점수 캘리브레이션
═══════════════════════════════════════════
- 90+: 자료·분석·결론 모두 탄탄
- 80-89: 1-2개 축 보완 필요
- 70-79: 자료는 있으나 분석 약함
- 60-69: 단순 정보 나열
- 60 미만: 주제 이탈

대부분 65-82 사이.

═══════════════════════════════════════════
teacherDraft 작성
═══════════════════════════════════════════
[총평] 2-3문장
[잘한 점] 2-3개 bullet
[개선할 점] 2-3개 bullet (what + how)
[다음 단계] 1-2문장

** 톤 ** "~예요/~해요", 학생 이름 있으면 "○○님,"로 시작, 350-500자

═══════════════════════════════════════════
응답 형식 (JSON만)
═══════════════════════════════════════════
{
  "evalCriteria": "<주제탐구 평가 핵심 한 문장>",
  "scores": [
    { "label": "자료 조사", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "분석력", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "결론 도출", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "형식", "score": <0-100>, "max": 100, "desc": "<한 문장>" }
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
    `구체적 수치 포함: ${m.hasNumbers ? "✓" : "✗"}`,
    `출처/참고 자료 언급: ${m.hasReference ? "✓" : "✗"}`,
  ];
  parts.push(`[사전 분석]\n${metricLines.join("\n")}`);

  parts.push(`[학생 답안 — 5섹션 통합]\n${body.answerText}`);

  parts.push(
    `위 답안을 분석하고 JSON으로 응답하세요.\n` +
      `1. 4개 축 각 0-100 점수\n` +
      `2. hasNumbers, hasReference를 자료조사 점수에 반영\n` +
      `3. teacherDraft 350-500자\n` +
      `4. JSON만 응답`
  );

  return parts.join("\n\n");
}

function buildComparisonSystemPrompt(): string {
  return `당신은 중학생의 주제탐구 수행평가를 평가하는 전문 교사입니다.
학생이 1차 답안을 받은 피드백을 보고 수정해서 재제출했습니다.
1차/2차 답안을 비교해서 무엇이 좋아졌고 무엇이 부족한지 알려주세요.

═══════════════════════════════════════════
[중요] 비교 피드백의 핵심
═══════════════════════════════════════════
- 점수 산정 X. 강점/개선점 따로 나열 X. "1차 → 2차 변화"에 집중.
- 주제탐구는 다음 변화를 우선 비교:
  1) 자료/출처가 추가되거나 구체화됐는가
  2) 단순 나열에서 분석/해석으로 발전했는가
  3) 결론이 본문 분석으로부터 더 자연스럽게 도출되는가
- 모호한 칭찬 금지

═══════════════════════════════════════════
teacherDraft
═══════════════════════════════════════════
[총평] 2-3문장
[좋아진 점] 구체적으로 인용
[아직 보완할 점] 있으면
[격려] 한 문장

** 톤 ** 친근한 코치 톤, "○○님,"로 시작, 250-400자

═══════════════════════════════════════════
응답 형식 (JSON만)
═══════════════════════════════════════════
{
  "improvedPoints": ["...", "...", "..."],
  "remainingIssues": ["..."],
  "comparisonSummary": "<1-2문장>",
  "teacherDraft": "<250-400자>"
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
      `4. teacherDraft 250-400자\n` +
      `5. JSON만 응답`
  );

  return parts.join("\n\n");
}