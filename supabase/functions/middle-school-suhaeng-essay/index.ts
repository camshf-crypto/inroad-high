// supabase/functions/middle-school-suhaeng-portfolio/index.ts
// 중등 학교 수행평가 — 포트폴리오/프로젝트형 AI 채점

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
  previousAnswerSections?: Record<string, string>;
  previousFeedback?: string;
}

const SECTION_LABEL_MAP: Record<string, string> = {
  background: "1. 탐구 배경",
  method: "2. 조사 방법",
  content: "3. 조사 내용",
  analysis: "4. 분석 및 결론",
  reference: "5. 참고 자료",
  summary: "1. 활동 요약",
  process: "2. 활동 과정",
  learning: "3. 배운 점",
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
      return jsonError("답안 섹션이 비어있습니다.", 400);
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
    console.error("[middle-school-suhaeng-portfolio]", e);
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
포트폴리오/프로젝트형 수행평가는 학생의 누적된 활동과 탐구 과정을 평가합니다.
학교 공식 채점 기준에 따라 정확하게 채점하고, 자연스러운 서술형 피드백을 작성합니다.

═══════════════════════════════════════════
[중요] 포트폴리오/프로젝트 평가 특성
═══════════════════════════════════════════
- 단일 답안이 아닌 여러 섹션으로 구성된 답안 평가
- 각 섹션의 완성도와 섹션 간 연결성을 모두 봄
- 학생의 탐구 과정과 사고력이 잘 드러나는지 평가

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
"○○님, 이번 ○○ 보고서는 B등급(30점 만점에 24점)을 받았어요."
"이번 ○○ 포트폴리오는 A등급으로 평가했어요."

📝 문단 2 (잘한 점 - 어떤 섹션이 좋았는지):
"~ 부분에서 ~한 점이 좋았어요. 특히 ~." 같은 톤
어떤 섹션이 잘 됐는지 + 구체적 인용
2가지 잘한 점을 한 문단에 자연스럽게

📝 문단 3 (개선할 점 - 어떤 섹션을 어떻게 보완할지):
"다만 ~ 섹션에서 ~ 부분이 아쉬워요. 다음에는 ~해보세요."
어떤 섹션을 + 어떻게 보완해야 하는지
2가지 개선점을 한 문단에 자연스럽게

【⚠️ 절대 금지】
- 마크다운 헤더 ([채점 결과], [총평] 같은 거) 절대 X
- 불릿 포인트 (-, •, ✓, △) 절대 X
- 응원 멘트: "앞으로도 화이팅" 등 X
- "[다음 단계]" 섹션 X
- 마지막은 개선 제안으로 자연스럽게 마무리

【톤】
- "~예요/~해요" 톤
- 친근한 선생님 말투
- 길이: 300-450자

【좋은 예시】
"민준님, 이번 사회 탐구 보고서는 B등급(30점 만점에 24점)을 받았어요.

탐구 배경에서 환경 보호의 필요성을 명확히 제시한 점이 인상 깊었어요. 특히 조사 방법 부분에서 인터뷰와 통계 자료를 함께 활용해 다각도로 접근한 게 좋았어요. 분석 및 결론에서도 자기만의 관점을 담아 정리한 점이 보였어요.

다만 조사 내용 부분이 다소 단편적이에요. 출처별로 자료를 정리하기보다 주제별로 묶어서 비교 분석하면 훨씬 깊이 있는 보고서가 될 거예요. 그리고 참고 자료를 좀 더 학술적인 출처로 보강하면 보고서의 신뢰도가 높아질 것 같아요."

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만)
═══════════════════════════════════════════
{
  "grade": "<학교 등급 체계 중 하나>",
  "score": <배점 만점 기준 점수>,
  "strengths": [
    "<잘한 점 1 (어떤 섹션)>",
    "<잘한 점 2>"
  ],
  "weaknesses": [
    "<개선할 점 1 (어떤 섹션)>",
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

  parts.push(`═══ 학생 답안 (섹션별) ═══\n${formatSections(body.answerSections)}`);

  const sectionCount = Object.keys(body.answerSections).length;
  const totalChars = Object.values(body.answerSections).join("").length;
  parts.push(`═══ 사전 분석 ═══
섹션 수: ${sectionCount}개
총 글자 수: ${totalChars}자`);

  parts.push(`위 학교 채점 기준에 정확히 맞춰서 채점하세요.

✅ 응답 체크리스트:
1. grade: "${body.gradeScale}" 체계 중 하나
2. score: ${body.score}점 만점 기준
3. strengths: 잘한 점 2개 (어떤 섹션에서)
4. weaknesses: 개선할 점 2개 (어떤 섹션을 어떻게)
5. overallFeedback: 2-3문장
6. teacherDraft: ⭐ 자연스러운 서술형 3문단! 헤더/불릿 절대 X! 응원멘트 X!
7. criteriaReference: 어느 기준 참고
8. 반드시 JSON만 응답`);

  return parts.join("\n\n");
}

function buildComparisonSystemPrompt(): string {
  return `당신은 한국 중학교 수행평가 채점 전문가이자 학생에게 따뜻하게 피드백을 주는 선생님입니다.
학생이 1차 피드백을 받고 포트폴리오/프로젝트 답안을 수정해서 재제출했습니다.

═══════════════════════════════════════════
비교 분석 관점
═══════════════════════════════════════════
1) 어떤 섹션이 개선됐는가
2) 학교 채점 기준에 더 가까워졌는가
3) 섹션 간 연결성이 좋아졌는가
4) 여전히 부족한 부분은 무엇인가

═══════════════════════════════════════════
[⭐ 매우 중요] teacherDraft 작성 규칙
═══════════════════════════════════════════
**자연스러운 서술형 문단**으로 작성하세요. 섹션 헤더 절대 X!

【필수 구조】 2-3개 문단

📝 문단 1 (총평):
"○○님, 재제출 답안 잘 봤어요. 1차에 비해 ~한 점이 많이 좋아졌어요."

📝 문단 2 (좋아진 섹션):
"특히 ~ 섹션이 ~하게 보완된 점이 좋았어요."
어떤 섹션이 + 어떻게 좋아졌는지

📝 문단 3 (아직 보완할 점, 있을 때만):
"다만 ~ 섹션은 좀 더 ~해보면 좋겠어요."

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

  parts.push(`═══ 1차 답안 ═══\n${formatSections(body.previousAnswerSections!)}`);
  parts.push(`═══ 1차 피드백 ═══\n${body.previousFeedback}`);
  parts.push(`═══ 2차 답안 (재제출) ═══\n${formatSections(body.answerSections)}`);

  parts.push(`1차와 2차를 섹션별로 비교하세요.

✅ 응답 체크리스트:
1. improvedPoints: 좋아진 점 2-3개
2. remainingIssues: 아직 부족한 점 0-2개
3. comparisonSummary: 1-2문장
4. teacherDraft: ⭐ 자연스러운 서술형 2-3문단! 헤더/불릿 절대 X! 응원멘트 X!
5. 반드시 JSON만 응답`);

  return parts.join("\n\n");
}