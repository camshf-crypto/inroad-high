// supabase/functions/middle-suhaeng-essay/index.ts
// 중등 수행평가 — 논술형 AI 피드백
//
// 첫 제출 응답: { evalCriteria, scores, summary, strengths, improvements, totalScore, teacherDraft }
// 재제출 응답: { isComparison: true, improvedPoints, remainingIssues, comparisonSummary, teacherDraft }

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

    if (!body.answerText || body.answerText.trim().length < 10) {
      return jsonError("답안이 비어있거나 너무 짧습니다.", 400);
    }
    if (!body.questionContent || !body.questionTitle) {
      return jsonError("문제 정보가 누락되었습니다.", 400);
    }

    const isResubmission = !!(body.previousAnswer && body.previousFeedback);
    const metrics = analyzeAnswer(body.answerText, body);

    // 분기: 재제출이면 비교 모드, 첫 제출이면 풀 분석
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
    console.error("[middle-suhaeng-essay]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

// ============================================================
// 응답 정규화
// ============================================================
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

// ============================================================
// 메트릭
// ============================================================
interface Metrics {
  charCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  charRangeOk: boolean | null;
  keywordHits: { keyword: string; count: number }[];
  paragraphCount: number;
}

function analyzeAnswer(text: string, body: RequestBody): Metrics {
  const cleaned = text.trim();
  const charCount = cleaned.length;

  const sentences = cleaned
    .split(/[.!?。\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = sentences.length;
  const avgSentenceLength =
    sentenceCount > 0 ? Math.round(charCount / sentenceCount) : 0;

  let charRangeOk: boolean | null = null;
  if (body.minChars !== undefined && body.maxChars !== undefined) {
    charRangeOk = charCount >= body.minChars && charCount <= body.maxChars;
  }

  const keywordHits = (body.keywords ?? []).map((k) => ({
    keyword: k,
    count: (cleaned.match(new RegExp(k, "g")) ?? []).length,
  }));

  const paragraphs = cleaned.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length;

  return {
    charCount,
    sentenceCount,
    avgSentenceLength,
    charRangeOk,
    keywordHits,
    paragraphCount,
  };
}

// ============================================================
// 첫 제출 — 풀 분석 프롬프트 (기존 그대로)
// ============================================================
function buildFullSystemPrompt(): string {
  return `당신은 중학생의 논술형 수행평가를 평가하는 전문 국어 교사입니다.
학생이 제출한 답안을 분석해, 선생님이 검토 후 학생에게 그대로 전달할 수 있는
피드백 초안을 작성합니다.

═══════════════════════════════════════════
[중요] 피드백의 목적
═══════════════════════════════════════════
- 점수를 매기는 게 아니라 "학생이 다음에 어떻게 고치면 좋을지" 알려주는 것이 목적.
- 따뜻하고 구체적이지만, 모호한 칭찬은 금지.
- 학생이 다음에 적용할 수 있는 명확한 액션 아이템을 줘야 함.

═══════════════════════════════════════════
논술형 평가 4축 (반드시 이 순서로 scores 배열 작성)
═══════════════════════════════════════════

[1] 구조 (두괄식·문단·흐름) (25%)
[2] 주장의 명확성 (25%)
[3] 근거의 구체성 (35%)
[4] 표현·분량 (15%)

═══════════════════════════════════════════
점수 캘리브레이션 (모든 score는 0-100 정수)
═══════════════════════════════════════════
- 90+ : 또래 상위 5%
- 80-89 : 상위 20%
- 70-79 : 평범하지만 통과
- 60-69 : 핵심은 전달됐으나 부족함 다수
- 50-59 : 명백한 결함
- 50 미만 : 미달

대부분 60-80 사이.

totalScore는 maxScore(=배점) 기준 환산. 4축 평균을 maxScore 기준으로.

═══════════════════════════════════════════
teacherDraft 작성 — 선생님이 학생에게 보낼 텍스트
═══════════════════════════════════════════
구조 (마크다운 헤더 X, 자연스러운 한국어 문단으로):

[총평] 2-3문장
[잘한 점] 강점 2-3개 (가능하면 학생 답안 인용)
[개선할 점] 개선점 2-3개 (what + how)
[다음 단계] 1-2문장

** 톤 **
- "~예요/~해요" 톤
- 학생 이름 있으면 "○○님,"로 시작
- 길이: 300-500자

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만)
═══════════════════════════════════════════
{
  "evalCriteria": "<논술형 평가 핵심 기준 한 문장>",
  "scores": [
    { "label": "구조 (두괄식·흐름)", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "주장의 명확성", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "근거의 구체성", "score": <0-100>, "max": 100, "desc": "<한 문장>" },
    { "label": "표현·분량", "score": <0-100>, "max": 100, "desc": "<한 문장>" }
  ],
  "totalScore": <maxScore 환산 점수>,
  "summary": "<1-2문장>",
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "teacherDraft": "<300-500자>"
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
    `평균 문장 길이: ${m.avgSentenceLength}자`,
    `문단 수: ${m.paragraphCount}개`,
  ];
  if (m.charRangeOk !== null) {
    metricLines.push(
      `글자 수 제한: ${m.charRangeOk ? "✓ 준수" : "✗ 위반"} (${m.charCount}자, 제한 ${body.minChars}~${body.maxChars}자)`
    );
  }
  parts.push(`[사전 분석 메트릭]\n${metricLines.join("\n")}`);

  parts.push(`[학생 답안]\n${body.answerText}`);

  parts.push(
    `위 답안을 분석하고 JSON 형식으로 응답하세요.\n` +
      `1. 4개 축 각 0-100 점수와 한 문장 desc\n` +
      `2. totalScore는 평균을 maxScore 기준 환산\n` +
      `3. teacherDraft 300-500자\n` +
      `4. 반드시 JSON만 응답`
  );

  return parts.join("\n\n");
}

// ============================================================
// 재제출 — 비교 중심 프롬프트 (간단하게)
// ============================================================
function buildComparisonSystemPrompt(): string {
  return `당신은 중학생의 논술형 수행평가를 평가하는 전문 국어 교사입니다.
학생이 1차 답안을 받은 피드백을 보고 답안을 수정해서 재제출했습니다.
1차 답안과 2차 답안을 비교해서, 무엇이 좋아졌고 무엇이 아직 부족한지를 알려주는 피드백을 작성하세요.

═══════════════════════════════════════════
[중요] 비교 피드백의 핵심
═══════════════════════════════════════════
- 점수 산정 X. 강점/개선점 따로 나열 X. 오직 "1차 → 2차 변화"에 집중.
- 학생이 1차 피드백을 어떻게 반영했는지 정직하게 평가.
- 잘 반영했으면 잘 반영했다고, 거의 반영 안 됐으면 그렇게.
- "노력 인정" 따위 모호한 칭찬 금지.

═══════════════════════════════════════════
분석 관점 (어떤 부분이 변했나)
═══════════════════════════════════════════
1) 1차 피드백에서 지적한 개선점이 2차 답안에서 어떻게 반영됐는가
2) 1차 답안의 약점(근거 부족, 구조 모호 등)이 2차에서 보완됐는가
3) 2차에서 새로 추가된 내용이 답안 품질을 높였는가
4) 2차에서 여전히 부족한 부분 또는 새로 생긴 약점이 있는가

═══════════════════════════════════════════
[중요] teacherDraft 작성 — 선생님이 학생에게 보낼 최종 피드백
═══════════════════════════════════════════
구조 (마크다운 헤더 X):

[총평]
2-3문장으로 1차 대비 발전을 한 마디. 모호한 칭찬 X.
예: "1차에 비해 근거의 구체성이 크게 발전했어요. 통계 자료를 추가한 점이 인상적이에요."

[좋아진 점]
- 1차 → 2차에서 명확히 좋아진 부분 (구체적으로 인용)
- 또 좋아진 부분

[아직 보완할 점]
- 여전히 부족하거나 새로 생긴 약점 (있으면)

[격려]
짧은 격려 한 문장.

** 톤 ** 친근한 코치 톤, "~예요/~해요", 학생 이름 있으면 "○○님,"로 시작, 250-400자.

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만)
═══════════════════════════════════════════
{
  "improvedPoints": [
    "<좋아진 점 1 (구체적으로, 가능하면 인용)>",
    "<좋아진 점 2>",
    "<좋아진 점 3 (있으면)>"
  ],
  "remainingIssues": [
    "<아직 부족한 점 1 (있으면, 없으면 빈 배열)>",
    "<아직 부족한 점 2>"
  ],
  "comparisonSummary": "<1차 대비 2차의 발전을 1-2문장으로 요약>",
  "teacherDraft": "<선생님이 학생에게 그대로 보낼 텍스트 (250-400자)>"
}`;
}

function buildComparisonUserPrompt(body: RequestBody, m: Metrics): string {
  const parts: string[] = [];

  const meta: string[] = [];
  if (body.grade) meta.push(`학년: ${body.grade}`);
  if (body.questionSubject) meta.push(`과목: ${body.questionSubject}`);
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  meta.push(`수행평가 제목: ${body.questionTitle}`);
  if (body.minChars !== undefined && body.maxChars !== undefined) {
    meta.push(`글자 수 제한: ${body.minChars}자 ~ ${body.maxChars}자`);
  }
  parts.push(`[기본 정보]\n${meta.join("\n")}`);

  parts.push(`[출제 문제]\n${body.questionContent}`);

  parts.push(`[1차 답안]\n${body.previousAnswer}`);
  parts.push(`[1차 피드백 — 학생이 반영해야 했던 내용]\n${body.previousFeedback}`);
  parts.push(`[2차 답안 — 재제출본]\n${body.answerText}`);

  const metricLines = [
    `2차 답안 총 글자 수: ${m.charCount}자`,
    `2차 답안 문단 수: ${m.paragraphCount}개`,
  ];
  if (m.charRangeOk !== null) {
    metricLines.push(
      `글자 수 제한: ${m.charRangeOk ? "✓ 준수" : "✗ 위반"}`
    );
  }
  parts.push(`[2차 답안 사전 분석]\n${metricLines.join("\n")}`);

  parts.push(
    `위 1차 답안과 2차 답안을 비교하세요.\n\n` +
      `체크리스트:\n` +
      `1. improvedPoints: 1차 → 2차에서 좋아진 점 2-3개 (구체적으로, 가능하면 답안 인용)\n` +
      `2. remainingIssues: 여전히 부족한 점 0-2개 (없으면 빈 배열)\n` +
      `3. comparisonSummary: 1-2문장 요약\n` +
      `4. teacherDraft: 선생님이 학생에게 보낼 텍스트 (250-400자, [총평]/[좋아진 점]/[아직 보완할 점]/[격려] 구조)\n` +
      `5. 반드시 JSON만 응답`
  );

  return parts.join("\n\n");
}