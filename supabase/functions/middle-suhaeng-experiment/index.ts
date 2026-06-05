// supabase/functions/middle-suhaeng-experiment/index.ts
// 중등 수행평가 — 탐구수행/실기형 AI 피드백
// 핵심: 학교별 채점기준(scoringCriteriaAi 등)이 있으면 그것을 평가 골격으로 사용.
//       없으면 기존 4축(가설/실험설계/결과해석/결론)으로 fallback (하위호환).

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

  // ⭐ 학교별 채점기준 (school_suhaeng) — 있으면 평가 골격으로 사용
  scoringCriteriaAi?: string;        // 체크포인트/점수매핑/AI판단가이드/학원주의사항
  scoringFactors?: string;           // 채점 요소
  achievementStandard?: string;      // 성취기준
  coreConcept?: string;              // 핵심개념/출제포인트
  gradeScale?: string;              // 등급 체계 (상/중/하, A~E 등)
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
    // 채점기준이 들어왔는지 (핵심 기준: scoringCriteriaAi)
    const hasCriteria = !!(body.scoringCriteriaAi && body.scoringCriteriaAi.trim().length > 10);
    const metrics = analyzeAnswer(body.answerText);

    const systemPrompt = isResubmission
      ? buildComparisonSystemPrompt(hasCriteria)
      : buildFullSystemPrompt(hasCriteria);
    const userPrompt = isResubmission
      ? buildComparisonUserPrompt(body, metrics, hasCriteria)
      : buildFullUserPrompt(body, metrics, hasCriteria);

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
      meta: { isResubmission, hasCriteria, model, tokensUsed, metrics },
    });
  } catch (e) {
    console.error("[middle-suhaeng-experiment]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function normalizeFullAnalysis(raw: any, maxScore: number) {
  const scores = Array.isArray(raw.scores) ? raw.scores : [];
  // 채점기준 모드면 항목 수가 가변(보통 2개). 기존 모드면 4개.
  const studentScores = scores.map((s: any) => Number(s.score) || 0);
  while (studentScores.length < 2) studentScores.push(70);

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
    grade: raw.grade ?? "",              // ⭐ 채점기준 모드: 등급(상/중/하, A~E)
    gradeReason: raw.gradeReason ?? "",  // ⭐ 등급 산정 근거
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
  const hasNumbers = /\d+\s*(g|kg|ml|L|cm|mm|°C|℃|초|분|회|개|배|%)/.test(cleaned);
  const hasMethod = /(방법|순서|단계|준비물|먼저|다음으로|그리고나서|마지막으로)/.test(cleaned);

  return { charCount, paragraphCount, hasHypothesis, hasNumbers, hasMethod };
}

// ════════════════════════════════════════════════════════════
// 첫 제출 — 채점기준 모드 (hasCriteria === true)
// ════════════════════════════════════════════════════════════
function buildCriteriaSystemPrompt(): string {
  return `당신은 중학생 수행평가를 평가하는 베테랑 학원 전문 교사입니다.
일반적인 평가가 아니라, 아래 [학교 채점기준]에 **정확히 근거하여** 평가합니다.
이 채점기준은 해당 학교 담당 교사가 실제로 사용하는 기준이므로, 일반론으로 벗어나지 마세요.

═══════════════════════════════════════════
절대 원칙
═══════════════════════════════════════════
1. [학교 채점기준]의 "체크포인트"를 평가 골격으로 사용한다.
   - 각 체크포인트 = scores 배열의 한 항목(label). 일반적인 4축(가설/설계/해석/결론)을 멋대로 쓰지 말 것.
2. 등급/점수는 [점수 매핑]에 근거해 산정하고, 그 근거(gradeReason)를 반드시 밝힌다.
   - "감으로 B"가 아니라 "체크포인트 2개 중 1개 충족 → 약 ○○% → B등급" 식으로 계산 근거 제시.
3. 학생 답안의 **실제 문장/숫자를 직접 인용**한다. (예: "네가 쓴 '42℃ → 40℃' 기록은...")
   일반적 칭찬("잘했어요") 금지.
4. [학원 주의사항]의 함정/자주 놓치는 부분을 반드시 점검하여 피드백에 반영한다.
5. 개선점은 "답안의 어느 부분에 + 무엇을 더하면 + 어느 등급" 형식으로 구체적·실행 가능하게.
6. **학생이 그대로 베껴 제출할 수 있는 완성된 문장/문단은 절대 제공하지 않는다.**
   개선은 '방향'과 '예시 키워드'까지만. 답안 본문을 대신 써주지 말 것.

═══════════════════════════════════════════
teacherDraft (학생이 읽는 피드백 본문) 작성
═══════════════════════════════════════════
구조 고정:
■ 종합: <등급> (<점수>점 / 만점)
  - 이 과제의 핵심 평가 기준 한 줄 + 등급 근거 한 줄
■ 잘한 점
  - 학생 답안 인용 포함, 1~2개
■ 평가 기준에서 보완할 점 (여기를 채우면 상위 등급)
  - 체크포인트별로, "답안 위치 + 보완 내용 + 예상 등급"
■ 다음 목표 (딱 2개)
  - 실행 가능한 행동 2개

** 톤 ** "○○님,"으로 시작, 격려하되 정확하게. 분량 제한 없음(필요한 만큼 충실히, 보통 500~800자).

═══════════════════════════════════════════
응답 형식 (JSON만, 그 외 텍스트 금지)
═══════════════════════════════════════════
{
  "evalCriteria": "<이 과제 핵심 평가 기준 한 문장>",
  "scores": [
    { "label": "<체크포인트1 이름>", "score": <0-100>, "max": 100, "desc": "<학생 답안 근거 한 문장>" },
    { "label": "<체크포인트2 이름>", "score": <0-100>, "max": 100, "desc": "<학생 답안 근거 한 문장>" }
  ],
  "grade": "<상/중/하 또는 A~E — gradeScale에 맞춰>",
  "gradeReason": "<점수 매핑 근거 계산: 체크포인트 충족도 → 등급>",
  "totalScore": <배점 만점 기준 환산 점수>,
  "summary": "<1-2문장>",
  "strengths": ["<답안 인용 포함>", "..."],
  "improvements": ["<답안위치+보완+예상등급>", "..."],
  "teacherDraft": "<위 구조대로 작성한 피드백 본문>"
}`;
}

function buildCriteriaUserPrompt(body: RequestBody, m: Metrics): string {
  const parts: string[] = [];

  const meta: string[] = [];
  if (body.grade) meta.push(`학년: ${body.grade}`);
  if (body.questionSubject) meta.push(`과목: ${body.questionSubject}`);
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  meta.push(`수행평가 제목: ${body.questionTitle}`);
  if (body.ratio !== undefined) meta.push(`배점(만점): ${body.ratio}점`);
  if (body.gradeScale) meta.push(`등급 체계: ${body.gradeScale}`);
  parts.push(`[기본 정보]\n${meta.join("\n")}`);

  parts.push(`[출제 문제]\n${body.questionContent}`);

  // ⭐ 핵심: 학교 채점기준을 프롬프트에 그대로 투입
  const crit: string[] = [];
  if (body.achievementStandard) crit.push(`● 성취기준\n${body.achievementStandard}`);
  if (body.coreConcept) crit.push(`● 핵심개념/출제포인트\n${body.coreConcept}`);
  if (body.scoringFactors) crit.push(`● 채점 요소\n${body.scoringFactors}`);
  if (body.scoringCriteriaAi) crit.push(`● 채점기준 (체크포인트/점수매핑/AI판단가이드/학원주의사항)\n${body.scoringCriteriaAi}`);
  parts.push(`[학교 채점기준 — 이 기준에 정확히 근거하여 평가]\n${crit.join("\n\n")}`);

  const metricLines = [
    `총 글자 수: ${m.charCount}자`,
    `문단 수: ${m.paragraphCount}개`,
    `정량적 수치 포함: ${m.hasNumbers ? "✓" : "✗"}`,
  ];
  parts.push(`[사전 분석]\n${metricLines.join("\n")}`);

  parts.push(`[학생 답안]\n${body.answerText}`);

  parts.push(
    `위 [학교 채점기준]의 체크포인트를 골격으로 평가하세요.\n` +
      `- scores의 label은 채점기준의 체크포인트 이름을 그대로 사용\n` +
      `- 학생 답안의 실제 문장/숫자를 인용\n` +
      `- 학원 주의사항(함정/자주 놓치는 부분) 점검\n` +
      `- 개선점은 복붙용 완성문장 금지, 방향만\n` +
      `- JSON만 응답`
  );

  return parts.join("\n\n");
}

// ════════════════════════════════════════════════════════════
// 첫 제출 — 기존 4축 모드 (hasCriteria === false, 하위호환)
// ════════════════════════════════════════════════════════════
function buildFullSystemPrompt(hasCriteria: boolean): string {
  if (hasCriteria) return buildCriteriaSystemPrompt();
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

function buildFullUserPrompt(body: RequestBody, m: Metrics, hasCriteria: boolean): string {
  if (hasCriteria) return buildCriteriaUserPrompt(body, m);

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

// ════════════════════════════════════════════════════════════
// 재제출 — 비교 모드 (채점기준 있으면 기준 반영)
// ════════════════════════════════════════════════════════════
function buildComparisonSystemPrompt(hasCriteria: boolean): string {
  const criteriaNote = hasCriteria
    ? `\n※ 이 과제는 [학교 채점기준]이 제공됩니다. 1차→2차 변화를 평가할 때 반드시 그 체크포인트 기준으로 "어느 항목이 얼마나 보완됐는지"를 짚으세요.\n`
    : ``;

  return `당신은 중학생의 탐구수행 수행평가를 평가하는 전문 교사입니다.
학생이 1차 답안을 받은 피드백을 보고 수정해서 재제출했습니다.
1차/2차 답안을 비교해서 무엇이 좋아졌고 무엇이 부족한지 알려주세요.${criteriaNote}

═══════════════════════════════════════════
[중요] 비교 피드백의 핵심
═══════════════════════════════════════════
- 점수 산정 X. 강점/개선점 따로 나열 X. "1차 → 2차 변화"에 집중.
- ${hasCriteria ? "학교 채점기준의 체크포인트별로 보완 여부를 비교" : "탐구수행은 다음 변화를 우선 비교: 1)가설 구체화 2)변인통제·설계 보완 3)결과 정량화·해석 4)결론 도출"}
- 학생 답안의 실제 문장/숫자를 인용. 모호한 칭찬 금지.
- 완성문장 복붙 제공 금지.

═══════════════════════════════════════════
teacherDraft
═══════════════════════════════════════════
[총평] 2-3문장
[좋아진 점] 구체적으로 (답안 인용)
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

function buildComparisonUserPrompt(body: RequestBody, m: Metrics, hasCriteria: boolean): string {
  const parts: string[] = [];

  const meta: string[] = [];
  if (body.grade) meta.push(`학년: ${body.grade}`);
  if (body.questionSubject) meta.push(`과목: ${body.questionSubject}`);
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  meta.push(`수행평가 제목: ${body.questionTitle}`);
  parts.push(`[기본 정보]\n${meta.join("\n")}`);

  parts.push(`[출제 문제]\n${body.questionContent}`);

  // 채점기준 있으면 비교에도 투입
  if (hasCriteria) {
    const crit: string[] = [];
    if (body.scoringFactors) crit.push(`● 채점 요소\n${body.scoringFactors}`);
    if (body.scoringCriteriaAi) crit.push(`● 채점기준\n${body.scoringCriteriaAi}`);
    parts.push(`[학교 채점기준]\n${crit.join("\n\n")}`);
  }

  parts.push(`[1차 답안]\n${body.previousAnswer}`);
  parts.push(`[1차 피드백]\n${body.previousFeedback}`);
  parts.push(`[2차 답안]\n${body.answerText}`);

  parts.push(
    `1차/2차 비교하세요.\n` +
      `1. improvedPoints 2-3개 (답안 인용)\n` +
      `2. remainingIssues 0-2개\n` +
      `3. comparisonSummary 1-2문장\n` +
      `4. teacherDraft 300-450자\n` +
      `5. JSON만 응답`
  );

  return parts.join("\n\n");
}