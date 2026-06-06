// supabase/functions/middle-school-suhaeng-essay/index.ts
// 중등 학교 수행평가 — 논술형/서술형/기타 AI 채점
// 강화 포인트:
//  1) 학교 채점기준의 "체크포인트"를 평가 골격으로 강제 (일반 논리/근거 틀 X)
//  2) 학생 답안의 실제 문장/표현 인용 의무화
//  3) 점수매핑 근거로 등급 산정 (gradeReason)
//  4) 학원 주의사항(함정/자주 놓치는 부분) 반드시 점검·반영
//  5) 복붙용 완성문장 금지
//  ※ 답안은 글 하나(answerText) 또는 섹션형(answerSections) 둘 다 지원
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
  answerText?: string;                          // 글 하나로 쓴 논술/서술 답안
  answerSections?: Record<string, string>;      // 섹션형 답안 (문항별)
  questionText?: string;                        // 논제/제시문/문항 (있으면)
  previousAnswerText?: string;
  previousAnswerSections?: Record<string, string>;
  previousFeedback?: string;
}

const SECTION_LABEL_MAP: Record<string, string> = {
  intro: "서론",
  body: "본론",
  conclusion: "결론",
  q1: "1번 문항",
  q2: "2번 문항",
  q3: "3번 문항",
  q4: "4번 문항",
  argument: "주장",
  reason: "근거",
  example: "예시",
};

function formatSections(sections: Record<string, string>): string {
  return Object.entries(sections)
    .map(([key, value]) => `[${SECTION_LABEL_MAP[key] || key}]\n${value}`)
    .join("\n\n");
}

// 답안을 글/섹션 어느 쪽이든 하나의 평가용 텍스트로 합침
function buildAnswerBlock(text?: string, sections?: Record<string, string>): string {
  if (sections && Object.keys(sections).length > 0) {
    return formatSections(sections);
  }
  return (text ?? "").trim();
}

function hasAnswer(text?: string, sections?: Record<string, string>): boolean {
  if (sections && Object.keys(sections).length > 0) {
    return Object.values(sections).some((v) => (v ?? "").trim().length > 0);
  }
  return !!(text && text.trim().length > 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();

    if (!hasAnswer(body.answerText, body.answerSections)) {
      return jsonError("답안이 비어있습니다.", 400);
    }
    if (!body.scoringCriteriaOriginal && !body.scoringCriteriaAi) {
      return jsonError("학교 채점 기준이 없습니다.", 400);
    }

    const isResubmission =
      !!body.previousFeedback &&
      hasAnswer(body.previousAnswerText, body.previousAnswerSections);

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
    console.error("[middle-school-suhaeng-essay]", e);
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

이 과제는 논술형/서술형 답안입니다. 학생이 자신의 생각을 글로 풀어낸 결과물을 평가합니다.

═══════════════════════════════════════════
[절대 원칙] — 일반 GPT와의 차별점
═══════════════════════════════════════════
1. [학교 채점 기준]의 "체크포인트"를 평가 골격으로 삼는다.
   - 예: 체크포인트가 ①논제에 대한 명확한 주장 ②타당한 근거 제시 ③개념의 정확한 사용 이라면, 평가도 정확히 그 항목들을 축으로 한다.
   - 일반적인 "서론/본론/결론" "논리/근거" 같은 정해진 틀로 멋대로 바꾸지 말 것.
2. 학생 답안의 **실제 문장이나 표현을 직접 인용**해서 평가한다.
   - 예: "'생물 다양성이 무너지면 결국 인간도 위험하다'라고 쓴 문장은 주장이 분명해서 좋아요."
   - "논리적이에요", "잘 썼어요" 같은 어디에나 갖다 붙일 수 있는 모호한 칭찬 금지.
3. 등급은 [점수 매핑]에 근거해 산정하고, gradeReason에 **계산 근거**를 남긴다.
   - 예: "체크포인트 3개 중 주장·개념은 충족, 근거의 타당성 미흡 → 약 75% → B"
   - 감으로 등급 매기지 말 것.
4. [학원 주의사항](함정 / 전략 / 자주 놓치는 부분)이 있으면 **반드시 학생 답안에 적용해 점검**하고 피드백에 녹인다.
   - 그 학교 학생들이 자주 놓치는 지점을 콕 집어주는 것이 이 피드백의 핵심 가치다.
5. 개선점은 "답안의 어느 부분을 + 무엇으로 보완하면 + 어느 등급" 형식으로 구체적·실행 가능하게.
6. **학생이 그대로 베껴 제출할 완성 문장/문단은 절대 제공하지 않는다.** 방향과 키워드까지만.
   - 예: ("이렇게 쓰세요: ~" 식의 완성 문장 X) → ("근거를 하나 더 든다면 통계 자료를 활용하는 방향이 좋아요" O)

═══════════════════════════════════════════
논술형/서술형 평가 특성 (참고)
═══════════════════════════════════════════
- 논제(제시문/문항)가 주어진 경우, 답안이 그 논제에 정확히 답했는지(논제 부합)를 먼저 본다.
- 주장 → 근거 → (예시) → 결론으로 이어지는 논리의 연결을 본다. 단, 평가 골격은 위 [학교 채점 기준]이다.
- 개념·용어를 정확히 썼는지(특히 과학/사회/도덕 등 교과 개념) 점검한다.
- 서술형(짧은 답)일 경우 핵심 개념을 정확히 짚었는지가 핵심이다. 분량이 짧다고 무조건 감점하지 말 것.

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
"○○님, 이번 논술은 B등급(20점 만점에 16점)이에요. 이 과제는 '①논제에 맞는 주장 ②타당한 근거'가 핵심 기준인데, 그중 ~"

📝 문단 2 (잘한 점 - 채점 기준 항목 + 답안 인용):
"~ 부분에서 ~한 점이 좋았어요. 특히 '인용'처럼 ~."

📝 문단 3 (보완할 점 - 채점 기준 항목별로 + 학원 주의사항 반영):
"다만 기준 ②(근거의 타당성)는 ~ 부분이 아쉬워요. 다음에는 ~해보면 상위 등급도 가능해요."
- 학원 주의사항의 함정/자주 놓치는 부분을 여기서 자연스럽게 짚기

📝 문단 4 (다음 목표 - 자연스러운 문장으로, 딱 2가지):
"우선 주장 뒤에 근거를 하나 더 들고, 결론에서 주장을 다시 짚어주면 충분히 더 높은 등급을 받을 수 있어요."

【⚠️ 절대 금지】
- 마크다운 헤더 ([채점 결과], [총평] 같은 거) 절대 X
- 불릿 포인트 (-, •, ✓, △) 절대 X
- 공허한 응원 멘트("앞으로도 화이팅"만 단독으로) X
- 채점 기준에 없는 일반론으로 감점/지적 금지 (기준에 있는 항목을 지적, 없는 걸 지어내지 말 것)
- 학생이 그대로 베낄 완성 문장 제공 금지 (방향·키워드까지만)

【톤】 "~예요/~해요" 친근한 선생님 말투. 길이: 450-650자 (충실하게)

【좋은 예시】
"민준님, 이번 논술 답안은 B등급(20점 만점에 16점)이에요. 이 과제의 핵심 평가 기준은 '논제에 맞는 주장을 분명히 했는지'와 '주장을 뒷받침하는 근거가 타당한지' 두 가지인데, 그 기준에 맞춰 평가했어요.

주장을 분명하게 세운 점이 좋았어요. '생물 다양성이 무너지면 결국 인간의 생존도 위협받는다'라고 입장을 명확히 밝혔고, 도입에서 문제 상황을 구체적인 사례로 제시한 것도 글의 설득력을 높였어요.

다만 두 번째 기준인 근거의 타당성이 조금 아쉬워요. 주장을 뒷받침하는 근거가 '환경이 중요하니까'처럼 일반적인 진술에 머물러서, 왜 그런지 한 단계 더 설명하면 좋아요. 통계나 구체적 사례를 근거로 들면 주장이 훨씬 단단해져요. 결론도 주장을 다시 한 번 짚어주면 글이 깔끔하게 마무리돼요.

우선 본론에 구체적 근거를 하나 더 들어보고, 결론에서 주장을 다시 정리해보면 충분히 더 높은 등급을 받을 수 있어요."

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만, 백틱 없이)
═══════════════════════════════════════════
{
  "grade": "<학교 등급 체계 중 하나>",
  "score": <배점 만점 기준 점수>,
  "gradeReason": "<점수 매핑 근거: 체크포인트 충족도 → 등급 (한 문장)>",
  "strengths": [
    "<잘한 점 1 — 채점 기준 항목 + 답안 인용>",
    "<잘한 점 2>"
  ],
  "weaknesses": [
    "<개선할 점 1 — 채점 기준 항목 + 답안 위치 + 보완 방향>",
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
  parts.push(`═══ 평가 정보 ═══\n${meta.join("\n")}`);

  if (body.questionText) {
    parts.push(`═══ 논제 / 제시문 / 문항 ═══\n${body.questionText}`);
  }

  parts.push(`═══ 채점 요소 ═══\n${body.scoringFactors}`);

  if (body.scoringCriteriaOriginal) {
    parts.push(`═══ 학교 공식 채점 기준 (원본) - 우선 사용 ═══\n${body.scoringCriteriaOriginal}`);
  }

  if (body.scoringCriteriaAi) {
    parts.push(`═══ AI 보조 채점 가이드 (체크포인트/점수매핑/AI판단가이드/학원주의사항) ═══\n${body.scoringCriteriaAi}`);
  }

  parts.push(`═══ 채점 방법 ═══
1. 위 채점 기준에서 "체크포인트"를 먼저 추출해, 그것을 평가 축으로 삼는다. (일반 서론/본론/결론 틀로 바꾸지 말 것)
2. 논제가 있으면 답안이 논제에 정확히 답했는지(논제 부합)를 먼저 점검한다.
3. 원본 기준이 명확하면 → 원본 우선, 모호하면 → AI 보조 가이드 참고, 충돌 시 → 원본 우선
4. 점수 매핑표에 근거해 등급을 계산하고 gradeReason에 근거를 남긴다.
5. 학원 주의사항(함정/전략/자주 놓치는 부분)을 학생 답안에 직접 적용해 점검한다.`);

  const answerBlock = buildAnswerBlock(body.answerText, body.answerSections);
  parts.push(`═══ 학생 답안 ═══\n${answerBlock}`);

  const totalChars = answerBlock.replace(/\[[^\]]*\]/g, "").replace(/\s/g, "").length;
  parts.push(`═══ 사전 분석 ═══\n답안 글자 수(공백·라벨 제외 대략): 약 ${totalChars}자`);

  parts.push(`위 [학교 채점 기준]의 체크포인트를 골격으로, 학생 답안의 실제 문장/표현을 인용하며 채점하세요.

✅ 응답 체크리스트:
1. grade: "${body.gradeScale}" 체계 중 하나
2. score: ${body.score}점 만점 기준
3. gradeReason: 체크포인트 충족도 → 등급 계산 근거
4. strengths: 잘한 점 2개 (채점 기준 항목 + 답안 인용)
5. weaknesses: 개선할 점 2개 (채점 기준 항목 + 답안 위치 + 보완 방향)
6. overallFeedback: 2-3문장 (채점 기준 기반)
7. teacherDraft: ⭐ 자연스러운 서술형 3~4문단! 헤더/불릿 절대 X! 답안 인용 포함! 채점 기준에 없는 일반론 지적 금지! 완성 문장 복붙 제공 금지!
8. criteriaReference: 어느 기준 참고
9. 반드시 JSON만 응답`);

  return parts.join("\n\n");
}

function buildComparisonSystemPrompt(): string {
  return `당신은 한국 중학교 수행평가 채점 전문가이자 학생에게 따뜻하게 피드백을 주는 선생님입니다.
학생이 1차 피드백을 받고 논술/서술 답안을 수정해서 재제출했습니다.
[학교 채점 기준]의 체크포인트를 기준으로, 1차 대비 무엇이 보완됐는지 비교하세요.

═══════════════════════════════════════════
비교 분석 관점 (채점 기준 체크포인트 기준)
═══════════════════════════════════════════
- 학교 채점 기준의 각 체크포인트가 1차 대비 얼마나 보완됐는지 항목별로 비교한다.
- 학생 답안의 실제 문장/표현을 인용한다. 모호한 칭찬 금지.
- 완성 문장 복붙 제공 금지.

═══════════════════════════════════════════
[⭐ 매우 중요] teacherDraft 작성 규칙
═══════════════════════════════════════════
**자연스러운 서술형 문단**으로 작성하세요. 섹션 헤더 절대 X!

【필수 구조】 2-3개 문단
📝 문단 1 (총평): "○○님, 재제출 답안 잘 봤어요. 1차에 비해 ~"
📝 문단 2 (좋아진 점 - 채점 기준 항목 + 답안 인용): "특히 ~ 기준이 ~하게 보완된 점이 좋았어요."
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
  "improvedPoints": ["<좋아진 점 1 — 채점 기준 항목 + 답안 인용>", "<좋아진 점 2>"],
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

  if (body.questionText) {
    parts.push(`═══ 논제 / 제시문 / 문항 ═══\n${body.questionText}`);
  }
  if (body.scoringCriteriaOriginal) {
    parts.push(`═══ 학교 채점 기준 (원본) ═══\n${body.scoringCriteriaOriginal}`);
  }
  if (body.scoringCriteriaAi) {
    parts.push(`═══ AI 보조 채점 가이드 ═══\n${body.scoringCriteriaAi}`);
  }

  parts.push(`═══ 1차 답안 ═══\n${buildAnswerBlock(body.previousAnswerText, body.previousAnswerSections)}`);
  parts.push(`═══ 1차 피드백 ═══\n${body.previousFeedback}`);
  parts.push(`═══ 2차 답안 (재제출) ═══\n${buildAnswerBlock(body.answerText, body.answerSections)}`);

  parts.push(`학교 채점 기준의 체크포인트를 기준으로 1차와 2차 답안을 비교하세요.

✅ 응답 체크리스트:
1. improvedPoints: 좋아진 점 2-3개 (채점 기준 항목 + 답안 인용)
2. remainingIssues: 아직 부족한 점 0-2개 (채점 기준 항목)
3. comparisonSummary: 1-2문장
4. teacherDraft: ⭐ 자연스러운 서술형 2-3문단! 헤더/불릿 절대 X! 응원멘트 X!
5. 반드시 JSON만 응답`);

  return parts.join("\n\n");
}