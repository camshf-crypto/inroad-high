// supabase/functions/middle-suhaeng-presentation/index.ts
// 중등 수행평가 — 구술발표 AI 피드백
// 첫 제출: 풀 분석 (3축: 내용/구성/전달력)
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
      return jsonError("발표 내용이 비어있거나 너무 짧습니다.", 400);
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
    console.error("[middle-suhaeng-presentation]", e);
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
  avgSentenceLength: number;
  hasIntro: boolean;
  hasConclusion: boolean;
  fillerCount: number;
}

function analyzeAnswer(text: string): Metrics {
  const cleaned = text.trim();
  const charCount = cleaned.length;

  const sentences = cleaned
    .split(/[.!?。\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = sentences.length;
  const avgSentenceLength =
    sentenceCount > 0 ? Math.round(charCount / sentenceCount) : 0;

  const first200 = cleaned.slice(0, 200);
  const last200 = cleaned.slice(-200);
  const hasIntro = /(안녕하세요|발표|시작|소개|오늘|주제)/.test(first200);
  const hasConclusion = /(마치|마무리|끝으로|결론|정리|감사)/.test(last200);

  const fillerMatches = cleaned.match(/(음음|어어|그그|음 |어 |그 |저기|뭐랄까)/g);
  const fillerCount = fillerMatches?.length || 0;

  return {
    charCount,
    sentenceCount,
    avgSentenceLength,
    hasIntro,
    hasConclusion,
    fillerCount,
  };
}

function buildFullSystemPrompt(): string {
  return `당신은 중학생의 구술발표 수행평가를 평가하는 전문 교사입니다.
구술발표는 학생이 정해진 주제로 청중 앞에서 구두 발표하는 형식입니다.
입력 텍스트는 발표 원고 또는 음성 STT 결과입니다.

═══════════════════════════════════════════
구술발표 평가 3축 (반드시 이 순서)
═══════════════════════════════════════════
[1] 내용 (40%) — 주제 부합, 핵심 메시지 명확, 정보 정확
[2] 구성 (30%) — 인사·도입, 본론 흐름, 결론·마무리
[3] 전달력 (30%) — 문장 길이 적절, 자연스러운 말걸기, 망설임 적음

═══════════════════════════════════════════
평가 작성 원칙
═══════════════════════════════════════════
- 모호한 칭찬 금지
- 도입 약함: "도입에서 청중 주의를 끌 한 마디가 있으면 좋아요. 예: ○○ 같은 질문으로 시작"
- 문장 너무 김: "한 문장이 너무 길어요. ○○ 부분을 두 문장으로 나누면 좋아요"
- 학생 표현 인용 권장

═══════════════════════════════════════════
점수 캘리브레이션 (0-100 정수)
═══════════════════════════════════════════
- 90+: 우수
- 80-89: 1-2개 보완
- 70-79: 통과 수준
- 60-69: 부족함 다수
- 60 미만: 발표로서 기능 부족

대부분 65-82 사이.

═══════════════════════════════════════════
teacherDraft 작성
═══════════════════════════════════════════
[총평] 2-3문장
[잘한 점] 2-3개 bullet
[개선할 점] 2-3개 bullet
[다음 단계] 1-2문장

** 톤 ** 친근하면서 격려하는 톤, "○○님,"로 시작, 300-450자

═══════════════════════════════════════════
응답 형식 (JSON만)
═══════════════════════════════════════════
{
  "evalCriteria": "<구술발표 평가 핵심 한 문장>",
  "scores": [
    { "label": "내용", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "구성", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "전달력", "score": <0-100>, "max": 100, "desc": "<한 문장>" }
  ],
  "totalScore": <환산>,
  "summary": "<1-2문장>",
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "teacherDraft": "<300-450자>"
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
    `문장 수: ${m.sentenceCount}개`,
    `평균 문장 길이: ${m.avgSentenceLength}자 (15-25자가 듣기 좋음)`,
    `인사·도입 감지: ${m.hasIntro ? "✓" : "✗"}`,
    `결론·마무리 감지: ${m.hasConclusion ? "✓" : "✗"}`,
    `망설임 단어 수: ${m.fillerCount}개`,
  ];
  parts.push(`[사전 분석]\n${metricLines.join("\n")}`);

  parts.push(`[학생 발표 내용]\n${body.answerText}`);

  parts.push(
    `JSON으로 응답하세요.\n` +
      `1. 3개 축 각 0-100 점수\n` +
      `2. 메트릭(hasIntro, hasConclusion, avgSentenceLength, fillerCount) 반영\n` +
      `3. teacherDraft 300-450자\n` +
      `4. JSON만 응답`
  );

  return parts.join("\n\n");
}

function buildComparisonSystemPrompt(): string {
  return `당신은 중학생의 구술발표 수행평가를 평가하는 전문 교사입니다.
학생이 1차 발표를 받은 피드백을 보고 수정해서 재제출했습니다.
1차/2차 발표를 비교해서 무엇이 좋아졌고 무엇이 부족한지 알려주세요.

═══════════════════════════════════════════
[중요] 비교 피드백의 핵심
═══════════════════════════════════════════
- 점수 산정 X. 강점/개선점 따로 나열 X. "1차 → 2차 변화"에 집중.
- 구술발표는 다음 변화를 우선 비교:
  1) 도입·결론이 보완됐는가
  2) 문장이 청중 친화적으로 짧아지고 자연스러워졌는가
  3) 망설임 단어가 줄어들었는가
- 모호한 칭찬 금지

═══════════════════════════════════════════
teacherDraft
═══════════════════════════════════════════
[총평] 2-3문장
[좋아진 점] 구체적으로
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
  parts.push(`[1차 발표]\n${body.previousAnswer}`);
  parts.push(`[1차 피드백]\n${body.previousFeedback}`);
  parts.push(`[2차 발표]\n${body.answerText}`);

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