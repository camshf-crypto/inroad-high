// supabase/functions/middle-school-suhaeng-presentation/index.ts
// 중등 학교 수행평가 — 구술발표형 AI 채점
// 강화 포인트:
//  1) 학교 채점기준의 "체크포인트"를 평가 골격으로 강제 (일반 내용/구성/전달력 틀 X)
//  2) 학생 발표 원고/답안의 실제 표현 인용 의무화
//  3) 점수매핑 근거로 등급 산정 (gradeReason)
//  4) 학원 주의사항(함정/자주 놓치는 부분) 반드시 점검·반영
//  5) 복붙용 완성문장 금지
//  ※ 출력 형식(grade/score/strengths/weaknesses/overallFeedback/teacherDraft/criteriaReference)은 어드민 호환 유지

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
  answerAudioUrl?: string;
  answerVideoUrl?: string;
  presentTimeMin?: number;
  presentTimeMax?: number;
  previousAnswerSections?: Record<string, string>;
  previousFeedback?: string;
}

const SECTION_LABEL_MAP: Record<string, string> = {
  topic: "발표 주제",
  script: "발표 원고",
  outline: "발표 개요",
  intro: "도입",
  body: "본론",
  conclusion: "마무리",
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
      return jsonError("발표 원고가 비어있습니다.", 400);
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
    console.error("[middle-school-suhaeng-presentation]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function normalizeGrading(raw: any, maxScore: number) {
  return {
    grade: raw.grade ?? "C",
    score: Number(raw.score) || Math.round(maxScore * 0.7),
    maxScore,
    gradeReason: raw.gradeReason ?? "",   // ⭐ 등급 산정 근거 (체크포인트 충족도 → 등급)
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
일반적인 평가가 아니라, 주어진 [학교 채점 기준]에 **정확히 근거하여** 채점합니다.
이 기준은 해당 학교 담당 교사가 실제로 쓰는 기준이므로, 임의의 일반론으로 벗어나지 마세요.

※ 구술발표 과제이지만 실제 음성/영상은 분석하지 않고, 학생이 제출한 발표 원고(텍스트)를 기준으로 평가합니다.
  (목소리 크기·시선·태도 같은 실연 요소는 원고만으로 판단할 수 없으므로 단정하지 말고, 원고에서 확인 가능한 내용·구성·표현 중심으로 평가하세요.)

═══════════════════════════════════════════
[절대 원칙] — 일반 GPT와의 차별점
═══════════════════════════════════════════
1. [학교 채점 기준]의 "체크포인트"를 평가 골격으로 삼는다.
   - 예: 체크포인트가 ①주제에 맞는 정보 구성 ②청중을 고려한 전달 방식 이라면, 평가도 정확히 그 항목들을 축으로 한다.
   - 일반적인 "내용/구성/전달력" 같은 정해진 틀로 멋대로 바꾸지 말 것.
2. 학생 발표 원고의 **실제 문장이나 표현을 직접 인용**해서 평가한다.
   - 예: "도입에서 '여러분은 하루에 물을 얼마나 쓰시나요?'라고 질문을 던진 부분은 청중의 관심을 끄는 좋은 시작이에요."
   - "잘 발표했어요", "구성이 좋아요" 같은 어디에나 갖다 붙일 수 있는 모호한 칭찬 금지.
3. 등급은 [점수 매핑]에 근거해 산정하고, gradeReason에 **계산 근거**를 남긴다.
   - 예: "체크포인트 2개 중 정보 구성은 충족, 청중 고려 전달은 미흡 → 약 75% → 중"
   - 감으로 등급 매기지 말 것.
4. [학원 주의사항](함정 / 전략 / 자주 놓치는 부분)이 있으면 **반드시 학생 원고에 적용해 점검**하고 피드백에 녹인다.
   - 그 학교 학생들이 자주 놓치는 지점을 콕 집어주는 것이 이 피드백의 핵심 가치다.
5. 개선점은 "원고의 어느 부분을 + 무엇으로 보완하면 + 어느 등급" 형식으로 구체적·실행 가능하게.
6. **학생이 그대로 베껴 발표할 완성 문장/문단은 절대 제공하지 않는다.** 방향과 키워드까지만.

═══════════════════════════════════════════
채점 기준 적용 순서
═══════════════════════════════════════════
1. 학교 공식 채점 기준(원본)을 우선 적용
2. 원본이 모호하면 AI 보조 가이드 참고
3. 충돌 시 원본 우선
4. 학생 학년 수준에 맞게 (과한 요구 금지)
5. 등급 체계/배점은 학교가 제시한 것을 그대로 사용

═══════════════════════════════════════════
[⭐ 매우 중요] teacherDraft 작성 규칙
═══════════════════════════════════════════
선생님이 학생에게 보낼 텍스트입니다. **자연스러운 서술형 문단**으로 작성하세요.
[채점결과], [총평], [잘한점] 같은 섹션 헤더를 절대 쓰지 마세요!

【필수 구조】 자연스러운 3~4개 문단

📝 문단 1 (호칭 + 채점 결과 + 근거 한 줄):
"○○님, 이번 발표는 B등급(20점 만점에 16점)이에요. 이 과제는 '①주제에 맞는 정보 ②청중을 고려한 구성'이 핵심 기준인데, 그중 ~"

📝 문단 2 (잘한 점 - 채점 기준 항목 + 원고 인용):
"~ 부분에서 ~한 점이 좋았어요. 특히 '인용'처럼 ~."

📝 문단 3 (보완할 점 - 채점 기준 항목별로 + 학원 주의사항 반영):
"다만 기준 ②(청중 고려)는 ~ 부분이 아쉬워요. 다음에는 ~해보면 상위 등급도 가능해요."
- 학원 주의사항의 함정/자주 놓치는 부분을 여기서 자연스럽게 짚기

📝 문단 4 (다음 목표 - 자연스러운 문장으로, 딱 2가지):
"우선 도입에 ~을 넣어보고, 마무리에 ~을 더해보면 충분히 더 높은 등급을 받을 수 있어요."

【⚠️ 절대 금지】
- 마크다운 헤더 ([채점 결과], [총평] 같은 거) 절대 X
- 불릿 포인트 (-, •, ✓, △) 절대 X
- 공허한 응원 멘트("발표 잘했어요"만 단독으로) X
- 채점 기준에 없는 일반론으로 감점/지적 금지 (기준에 있는 항목을 지적, 없는 걸 지어내지 말 것)
- 원고로 확인 불가능한 실연 요소(목소리, 시선 등)를 단정적으로 평가 금지

【톤】 "~예요/~해요" 친근한 선생님 말투. 길이: 450-650자 (충실하게)

【좋은 예시】
"민준님, 이번 발표 원고는 B등급(20점 만점에 16점)이에요. 이 과제의 핵심 평가 기준은 '주제에 맞는 정보를 구성했는지'와 '청중을 고려해 전달했는지' 두 가지인데, 그 기준에 맞춰 원고를 평가했어요.

주제에 맞는 정보를 잘 골랐어요. 발표 주제인 '플라스틱 줄이기'에 맞게 '하루 플라스틱 배출량이 1인당 약 0.3kg'이라는 구체적인 자료를 넣었고, 도입에서 '여러분은 오늘 플라스틱을 몇 개나 썼나요?'라고 질문을 던져 청중의 관심을 끄는 시작도 좋았어요.

다만 두 번째 기준인 청중을 고려한 구성이 조금 아쉬워요. 자료를 나열하는 데 그쳐서, 듣는 사람이 '그래서 나는 뭘 해야 하지?'를 느끼기 어려웠어요. 본론 뒤에 청중이 바로 실천할 수 있는 행동 한두 가지를 제안으로 넣으면 메시지가 훨씬 분명해져요. 마무리도 정보 요약으로 끝나는데, 핵심 메시지 한 문장으로 마무리하면 여운이 남아요.

우선 본론에 청중이 실천할 행동 제안을 넣어보고, 마무리를 핵심 메시지 한 문장으로 바꿔보면 충분히 더 높은 등급을 받을 수 있어요."

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만, 백틱 없이)
═══════════════════════════════════════════
{
  "grade": "<학교 등급 체계 중 하나>",
  "score": <배점 만점 기준 점수>,
  "gradeReason": "<점수 매핑 근거: 체크포인트 충족도 → 등급 (한 문장)>",
  "strengths": [
    "<잘한 점 1 — 채점 기준 항목 + 원고 인용>",
    "<잘한 점 2>"
  ],
  "weaknesses": [
    "<개선할 점 1 — 채점 기준 항목 + 원고 위치 + 보완 방향>",
    "<개선할 점 2>"
  ],
  "overallFeedback": "<2-3문장, 채점 기준 기반>",
  "teacherDraft": "<자연스러운 서술형 3~4문단, 헤더/불릿 절대 X>",
  "criteriaReference": "<참고한 기준: 원본/AI보조 등>"
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
  meta.push(`배점(만점): ${body.score}점`);
  meta.push(`등급 체계: ${body.gradeScale}`);
  if (body.presentTimeMin || body.presentTimeMax) {
    meta.push(`발표 시간: ${body.presentTimeMin ?? "?"}~${body.presentTimeMax ?? "?"}분`);
  }
  parts.push(`═══ 평가 정보 ═══\n${meta.join("\n")}`);

  parts.push(`═══ 채점 요소 ═══\n${body.scoringFactors}`);

  if (body.scoringCriteriaOriginal) {
    parts.push(`═══ 학교 공식 채점 기준 (원본) - 우선 사용 ═══\n${body.scoringCriteriaOriginal}`);
  }

  if (body.scoringCriteriaAi) {
    parts.push(`═══ AI 보조 채점 가이드 (체크포인트/점수매핑/AI판단가이드/학원주의사항) ═══\n${body.scoringCriteriaAi}`);
  }

  parts.push(`═══ 채점 방법 ═══
1. 위 채점 기준에서 "체크포인트"를 먼저 추출해, 그것을 평가 축으로 삼는다. (일반 내용/구성/전달력 틀로 바꾸지 말 것)
2. 원본 기준이 명확하면 → 원본 우선, 모호하면 → AI 보조 가이드 참고, 충돌 시 → 원본 우선
3. 점수 매핑표에 근거해 등급을 계산하고 gradeReason에 근거를 남긴다.
4. 학원 주의사항(함정/전략/자주 놓치는 부분)을 학생 원고에 직접 적용해 점검한다.
5. 음성/영상 실연 요소는 원고로 확인 불가하므로 단정하지 말 것.`);

  parts.push(`═══ 학생 발표 원고 ═══\n${formatSections(body.answerSections)}`);

  if (body.answerAudioUrl || body.answerVideoUrl) {
    parts.push(`═══ 참고 ═══\n학생이 음성/영상도 제출했으나, 이 평가에서는 원고(텍스트) 내용만 분석합니다.`);
  }

  parts.push(`위 [학교 채점 기준]의 체크포인트를 골격으로, 학생 발표 원고의 실제 표현을 인용하며 채점하세요.

✅ 응답 체크리스트:
1. grade: "${body.gradeScale}" 체계 중 하나
2. score: ${body.score}점 만점 기준
3. gradeReason: 체크포인트 충족도 → 등급 계산 근거
4. strengths: 잘한 점 2개 (채점 기준 항목 + 원고 인용)
5. weaknesses: 개선할 점 2개 (채점 기준 항목 + 원고 위치 + 보완 방향)
6. overallFeedback: 2-3문장 (채점 기준 기반)
7. teacherDraft: ⭐ 자연스러운 서술형 3~4문단! 헤더/불릿 절대 X! 원고 인용 포함! 채점 기준에 없는 일반론 지적 금지!
8. criteriaReference: 어느 기준 참고
9. 반드시 JSON만 응답`);

  return parts.join("\n\n");
}

function buildComparisonSystemPrompt(): string {
  return `당신은 한국 중학교 수행평가 채점 전문가이자 학생에게 따뜻하게 피드백을 주는 선생님입니다.
학생이 1차 피드백을 받고 발표 원고를 수정해서 재제출했습니다.
[학교 채점 기준]의 체크포인트를 기준으로, 1차 대비 무엇이 보완됐는지 비교하세요.

═══════════════════════════════════════════
비교 분석 관점 (채점 기준 체크포인트 기준)
═══════════════════════════════════════════
- 학교 채점 기준의 각 체크포인트가 1차 대비 얼마나 보완됐는지 항목별로 비교한다.
- 학생 원고의 실제 문장/표현을 인용한다. 모호한 칭찬 금지.
- 완성 문장 복붙 제공 금지.

═══════════════════════════════════════════
[⭐ 매우 중요] teacherDraft 작성 규칙
═══════════════════════════════════════════
**자연스러운 서술형 문단**으로 작성하세요. 섹션 헤더 절대 X!

【필수 구조】 2-3개 문단
📝 문단 1 (총평): "○○님, 재제출 원고 잘 봤어요. 1차에 비해 ~"
📝 문단 2 (좋아진 점 - 채점 기준 항목 + 원고 인용): "특히 ~ 기준이 ~하게 보완된 점이 좋았어요."
📝 문단 3 (아직 보완할 점, 있을 때만): "다만 ~ 기준은 좀 더 ~"

【⚠️ 절대 금지】
- 마크다운 헤더 / 불릿 포인트 절대 X
- 공허한 응원 멘트 X
- 마지막은 보완 제안으로 자연스럽게 마무리

【톤】 "~예요/~해요", 300-450자

═══════════════════════════════════════════
응답 형식
═══════════════════════════════════════════
{
  "improvedPoints": ["<좋아진 점 1 — 채점 기준 항목 + 원고 인용>", "<좋아진 점 2>"],
  "remainingIssues": ["<아직 부족한 점 — 채점 기준 항목>"],
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
    parts.push(`═══ 학교 채점 기준 (원본) ═══\n${body.scoringCriteriaOriginal}`);
  }
  if (body.scoringCriteriaAi) {
    parts.push(`═══ AI 보조 채점 가이드 ═══\n${body.scoringCriteriaAi}`);
  }

  parts.push(`═══ 1차 발표 원고 ═══\n${formatSections(body.previousAnswerSections!)}`);
  parts.push(`═══ 1차 피드백 ═══\n${body.previousFeedback}`);
  parts.push(`═══ 2차 발표 원고 (재제출) ═══\n${formatSections(body.answerSections)}`);

  parts.push(`학교 채점 기준의 체크포인트를 기준으로 1차와 2차 원고를 비교하세요.

✅ 응답 체크리스트:
1. improvedPoints: 좋아진 점 2-3개 (채점 기준 항목 + 원고 인용)
2. remainingIssues: 아직 부족한 점 0-2개 (채점 기준 항목)
3. comparisonSummary: 1-2문장
4. teacherDraft: ⭐ 자연스러운 서술형 2-3문단! 헤더/불릿 절대 X! 응원멘트 X!
5. 반드시 JSON만 응답`);

  return parts.join("\n\n");
}