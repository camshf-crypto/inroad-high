// supabase/functions/middle-school-suhaeng-experiment/index.ts
// 중등 학교 수행평가 — 실기형/탐구수행 AI 채점

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface RequestBody {
  studentName?: string;
  studentGrade: string;
  subject: string;
  taskTitle: string;
  evalType: string;
  score: number;
  scoringFactors: string;
  gradeScale: string;
  scoringCriteriaOriginal: string;
  scoringCriteriaAi: string;
  answerSections: Record<string, string>;
  answerPhotoUrls?: string[];
  previousAnswerSections?: Record<string, string>;
  previousFeedback?: string;
}

const SECTION_LABEL_MAP: Record<string, string> = {
  purpose: "실험 목적",
  hypothesis: "가설",
  materials: "준비물",
  procedure: "실험 과정",
  result: "결과 및 데이터",
  conclusion: "결론",
};

function formatSections(sections: Record<string, string>): string {
  return Object.entries(sections)
    .map(([key, value]) => `[${SECTION_LABEL_MAP[key] || key}]\n${value}`)
    .join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();

    if (!body.answerSections || Object.keys(body.answerSections).length === 0) {
      return jsonError("실험 보고서가 비어있습니다.", 400);
    }
    if (!body.scoringCriteriaOriginal && !body.scoringCriteriaAi) {
      return jsonError("학교 채점 기준이 없습니다.", 400);
    }

    const isResubmission = !!(body.previousAnswerSections && body.previousFeedback);

    const systemPrompt = isResubmission
      ? buildComparisonSystemPrompt()
      : buildGradingSystemPrompt();
    const userPrompt = isResubmission
      ? buildComparisonUserPrompt(body)
      : buildGradingUserPrompt(body);

    const { feedback, tokensUsed, model } = await callOpenAI({
      systemPrompt,
      userPrompt,
      model: "gpt-4o",
      temperature: 0.4,
    });

    const result = isResubmission
      ? normalizeComparison(feedback)
      : normalizeGrading(feedback, body.score);

    return jsonResponse({
      success: true,
      analysis: result,
      meta: { isResubmission, model, tokensUsed },
    });
  } catch (e) {
    console.error("[middle-school-suhaeng-experiment]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function normalizeGrading(raw: any, maxScore: number) {
  return {
    grade: raw.grade ?? "C",
    score: Number(raw.score) || Math.round(maxScore * 0.7),
    maxScore,
    strengths: Array.isArray(raw.strengths) ? raw.strengths.slice(0, 2) : [],
    weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses.slice(0, 2) : [],
    overallFeedback: raw.overallFeedback ?? "",
    teacherDraft: raw.teacherDraft ?? "",
    criteriaReference: raw.criteriaReference ?? "원본 기준",
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

function buildGradingSystemPrompt(): string {
  return `당신은 한국 중학교 수행평가 채점 전문가이자 학생에게 따뜻하게 피드백을 주는 선생님입니다.
실기형/탐구수행 수행평가는 학생의 실험 능력과 과학적 사고를 평가합니다.
학교 공식 채점 기준에 따라 정확하게 채점하고, 자연스러운 서술형 피드백을 작성합니다.

═══════════════════════════════════════════
[중요] 실험/탐구 평가 특성
═══════════════════════════════════════════
- 실험 목적이 명확한지
- 가설이 논리적인지
- 실험 과정이 체계적이고 재현 가능한지
- 결과 분석이 객관적이고 정확한지
- 결론이 가설과 일치하는지

═══════════════════════════════════════════
[중요] 채점 원칙
═══════════════════════════════════════════
1. 학교 공식 채점 기준 (원본)을 우선 적용
2. 원본 기준이 모호하면 AI 보조 가이드 참고
3. 두 기준 충돌 시 원본 우선
4. 학생 학년 수준에 맞게 평가

═══════════════════════════════════════════
[중요] 등급 산정 방식
═══════════════════════════════════════════
- 학교가 제시한 등급 체계(A~E 또는 A~C 등)를 그대로 사용
- 점수는 학교가 제시한 배점 만점 기준

═══════════════════════════════════════════
[⭐ 매우 중요] teacherDraft 작성 규칙
═══════════════════════════════════════════
선생님이 학생에게 보낼 텍스트입니다. **자연스러운 서술형 문단**으로 작성하세요.
[채점결과], [총평], [잘한점] 같은 섹션 헤더를 절대 쓰지 마세요!

【필수 구조】 자연스러운 3개 문단

📝 문단 1 (시작 - 호칭 + 채점 결과):
"○○님, 이번 실험 보고서는 B등급(25점 만점에 20점)을 받았어요."

📝 문단 2 (잘한 점 - 어떤 단계가 좋았는지):
"~ 부분에서 ~한 점이 인상 깊었어요. 특히 ~."
실험의 어떤 단계(목적/가설/과정/결과/결론)가 잘 됐는지 + 구체적 인용
2가지 잘한 점을 한 문단에 자연스럽게

📝 문단 3 (개선할 점 - 어떤 단계를 어떻게 보완할지):
"다만 ~ 부분이 아쉬워요. 다음에는 ~해보세요."
실험의 어떤 단계를 + 어떻게 보완해야 하는지
2가지 개선점을 한 문단에 자연스럽게

【⚠️ 절대 금지】
- 마크다운 헤더 ([채점 결과], [총평] 같은 거) 절대 X
- 불릿 포인트 (-, •, ✓, △) 절대 X
- 응원 멘트 X
- 마지막은 개선 제안으로 자연스럽게 마무리

【톤】
- "~예요/~해요" 톤
- 친근한 선생님 말투
- 길이: 300-450자

【좋은 예시】
"민준님, 이번 실험 보고서는 B등급(25점 만점에 20점)을 받았어요.

온도 변화 과정을 시간에 따라 상세히 설명한 점이 좋았어요. 특히 두 물이 섞일 때 어떻게 온도가 바뀌는지 잘 관찰했고, 결론에서도 열의 이동 원리를 정확하게 짚어줬어요. 데이터를 시간 순서대로 정리한 것도 깔끔했어요.

다만 시간-온도 그래프가 빠진 점이 아쉬워요. 다음에는 측정한 데이터를 표나 그래프로 그려서 시각적으로 보여주면 평가자가 이해하기 훨씬 쉬울 거예요. 그리고 입자들이 어떻게 움직이면서 열이 전달되는지 그 과정을 좀 더 자세히 풀어주면 완벽한 답안이 될 것 같아요."

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만)
═══════════════════════════════════════════
{
  "grade": "<학교 등급 체계 중 하나>",
  "score": <배점 만점 기준 점수>,
  "strengths": [
    "<잘한 점 1 (어떤 단계)>",
    "<잘한 점 2>"
  ],
  "weaknesses": [
    "<개선할 점 1 (어떤 단계)>",
    "<개선할 점 2>"
  ],
  "overallFeedback": "<2-3문장>",
  "teacherDraft": "<자연스러운 서술형 3문단, 헤더/불릿 절대 X>",
  "criteriaReference": "<참고한 기준>"
}`;
}

function buildGradingUserPrompt(body: RequestBody): string {
  const parts: string[] = [];

  const meta: string[] = [];
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  meta.push(`학년: ${body.studentGrade}`);
  meta.push(`과목: ${body.subject}`);
  meta.push(`수행과제: ${body.taskTitle}`);
  meta.push(`평가유형: ${body.evalType}`);
  meta.push(`배점: ${body.score}점`);
  meta.push(`등급 체계: ${body.gradeScale}`);
  parts.push(`═══ 평가 정보 ═══\n${meta.join("\n")}`);

  parts.push(`═══ 채점 요소 ═══\n${body.scoringFactors}`);

  if (body.scoringCriteriaOriginal) {
    parts.push(`═══ 학교 공식 채점 기준 (원본) - 우선 사용 ═══\n${body.scoringCriteriaOriginal}`);
  }

  if (body.scoringCriteriaAi) {
    parts.push(`═══ AI 보조 채점 가이드 ═══\n${body.scoringCriteriaAi}`);
  }

  parts.push(`═══ 채점 방법 ═══
1. 원본 기준이 명확하면 → 원본 우선
2. 원본이 모호하면 → AI 보조 가이드 참고
3. 충돌 시 → 원본 우선`);

  parts.push(`═══ 학생 실험 보고서 ═══\n${formatSections(body.answerSections)}`);

  if (body.answerPhotoUrls && body.answerPhotoUrls.length > 0) {
    parts.push(`═══ 첨부 사진 ═══\n학생이 ${body.answerPhotoUrls.length}장의 실험 사진을 제출했습니다.\n(사진 자체는 분석하지 않으며, 보고서 내용만 평가합니다.)`);
  }

  parts.push(`위 학교 채점 기준에 정확히 맞춰서 실험 보고서를 채점하세요.

✅ 응답 체크리스트:
1. grade: "${body.gradeScale}" 체계 중 하나
2. score: ${body.score}점 만점 기준
3. strengths: 잘한 점 2개 (실험의 어떤 단계)
4. weaknesses: 개선할 점 2개 (실험의 어떤 단계)
5. overallFeedback: 2-3문장
6. teacherDraft: ⭐ 자연스러운 서술형 3문단! 헤더/불릿 절대 X! 응원멘트 X!
7. criteriaReference: 어느 기준 참고
8. 반드시 JSON만 응답`);

  return parts.join("\n\n");
}

function buildComparisonSystemPrompt(): string {
  return `당신은 한국 중학교 수행평가 채점 전문가이자 학생에게 따뜻하게 피드백을 주는 선생님입니다.
학생이 1차 피드백을 받고 실험 보고서를 수정해서 재제출했습니다.

═══════════════════════════════════════════
비교 분석 관점
═══════════════════════════════════════════
1) 실험 목적/가설이 더 명확해졌는가
2) 실험 과정이 더 체계적으로 정리됐는가
3) 결과 분석이 더 객관적이고 구체적이 됐는가
4) 결론이 더 논리적으로 발전했는가

═══════════════════════════════════════════
[⭐ 매우 중요] teacherDraft 작성 규칙
═══════════════════════════════════════════
**자연스러운 서술형 문단**으로 작성하세요. 섹션 헤더 절대 X!

【필수 구조】 2-3개 문단

📝 문단 1 (총평): "○○님, 재제출 답안 잘 봤어요. 1차에 비해 ~"
📝 문단 2 (좋아진 점): "특히 ~ 부분이 ~하게 보완된 점이 좋았어요."
📝 문단 3 (아직 보완할 점, 있을 때만): "다만 ~ 부분은 좀 더 ~"

【⚠️ 절대 금지】
- 마크다운 헤더 절대 X
- 불릿 포인트 절대 X
- 응원 멘트 X
- 마지막은 보완 제안으로 자연스럽게 마무리

【톤】 "~예요/~해요", 250-400자

═══════════════════════════════════════════
응답 형식
═══════════════════════════════════════════
{
  "improvedPoints": ["<좋아진 점 1>", "<좋아진 점 2>"],
  "remainingIssues": ["<아직 부족한 점>"],
  "comparisonSummary": "<1-2문장>",
  "teacherDraft": "<자연스러운 서술형 2-3문단, 헤더/불릿 절대 X>"
}`;
}

function buildComparisonUserPrompt(body: RequestBody): string {
  const parts: string[] = [];

  const meta: string[] = [];
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  meta.push(`학년: ${body.studentGrade}`);
  meta.push(`과목: ${body.subject}`);
  meta.push(`수행과제: ${body.taskTitle}`);
  parts.push(`═══ 평가 정보 ═══\n${meta.join("\n")}`);

  if (body.scoringCriteriaOriginal) {
    parts.push(`═══ 학교 채점 기준 ═══\n${body.scoringCriteriaOriginal}`);
  }

  parts.push(`═══ 1차 실험 보고서 ═══\n${formatSections(body.previousAnswerSections!)}`);
  parts.push(`═══ 1차 피드백 ═══\n${body.previousFeedback}`);
  parts.push(`═══ 2차 실험 보고서 (재제출) ═══\n${formatSections(body.answerSections)}`);

  parts.push(`1차와 2차 실험 보고서를 비교하세요.

✅ 응답 체크리스트:
1. improvedPoints: 좋아진 점 2-3개
2. remainingIssues: 아직 부족한 점 0-2개
3. comparisonSummary: 1-2문장
4. teacherDraft: ⭐ 자연스러운 서술형 2-3문단! 헤더/불릿 절대 X! 응원멘트 X!
5. 반드시 JSON만 응답`);

  return parts.join("\n\n");
}