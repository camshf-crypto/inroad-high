// supabase/functions/middle-essay-analyze-answer/index.ts
// 중등 자소서 예상질문 — 답변 분석 + 피드백 (선생님용)

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface RequestBody {
  schoolName: string;
  questionText: string;
  studentAnswer: string;
  questionPurpose?: string[];
  studentName?: string;
  isUpgrade?: boolean;
  previousFeedback?: string;
  previousAnswer?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();

    if (!body.studentAnswer || body.studentAnswer.trim().length < 10) {
      return jsonError("학생 답변이 너무 짧아요. (최소 10자)", 400);
    }
    if (!body.questionText || !body.schoolName) {
      return jsonError("질문과 학교명이 필요해요.", 400);
    }

    const systemPrompt = body.isUpgrade ? buildUpgradeSystemPrompt() : buildFirstSystemPrompt();
    const userPrompt = body.isUpgrade ? buildUpgradeUserPrompt(body) : buildFirstUserPrompt(body);

    const { feedback, tokensUsed, model } = await callOpenAI({
      systemPrompt,
      userPrompt,
      model: "gpt-4o",
      temperature: 0.3,
    });

    const result = normalizeAnalysis(feedback);

    return jsonResponse({
      success: true,
      analysis: result,
      meta: { isUpgrade: body.isUpgrade, model, tokensUsed },
    });
  } catch (e) {
    console.error("[middle-essay-analyze-answer]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function normalizeAnalysis(raw: any) {
  const scores = Array.isArray(raw.scores) ? raw.scores : [];
  const studentScores = scores.slice(0, 3).map((s: any) => Number(s.score) || 0);
  while (studentScores.length < 3) studentScores.push(20);

  return {
    evalCriteria: raw.evalCriteria ?? "자사고·특목고 고입 면접 평가",
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
    reflectiveQuestions: Array.isArray(raw.reflectiveQuestions) ? raw.reflectiveQuestions : [],
    totalScore: Number(raw.totalScore) || 70,
    keywordReflection: "",
    teacherDraft: raw.teacherDraft ?? "",
  };
}

function buildFirstSystemPrompt(): string {
  return `너는 자사고·특목고 고입 면접 전문 평가관이다.

아래 예상질문은 학생의 자기소개서를 바탕으로 생성된 고입 면접 질문이다.
학생 답변을 면접관 관점에서 평가하라.

평가 핵심은 3가지다.
1. 질문 적합도: 질문에 맞게 답했는가
2. 실제 경험도: 실제로 해본 경험처럼 구체적이고 믿을 수 있는가
3. 발전 가능성: 경험을 통해 무엇을 배우고 어떻게 달라졌는가

대입, 전공적합성, 학생부, 생기부, 세특이라는 표현은 사용하지 마라.
중학생이 이해할 수 있는 쉬운 표현으로 작성하라.
없는 경험을 만들어내지 마라.

[점수 기준]
총점은 100점 만점이다.
- 질문 적합도: 30점
- 실제 경험도: 40점
- 발전 가능성: 30점

점수는 후하게 주지 마라.
학생 본인의 직접 경험, 행동, 생각 변화가 부족하면 실제 경험도와 발전 가능성 점수를 낮게 주어라.
인물·책·활동 설명만 있고 본인 이야기가 부족하면 실제 경험도는 25점 이하, 발전 가능성은 20점 이하로 평가하라.

[작성 지침]

1. reflectiveQuestions (사유하는 질문)
- 학생이 답변을 더 깊게 만들 수 있도록 스스로 생각해볼 질문 3가지를 제시하라.

2. strengths (강점 포인트)
- 현재 답변에서 잘한 점 2가지를 구체적으로 제시하라.

3. improvements (개선점 포인트)
- 반드시 고쳐야 할 점 2~3가지를 제시하라.
- 각 개선점은 "부족한 부분 / 왜 문제가 되는가 / 어떻게 고치면 좋은가" 순서로 작성하라.

4. summary (평가 요약)
- 전체 피드백을 90자~120자로 정리하라.

5. teacherDraft (선생님이 학생에게 전달할 피드백 초안)
- ★ 반드시 작성하라. 빈 문자열 금지. ★
- 위 분석을 바탕으로 선생님이 학생에게 보낼 따뜻한 피드백 초안을 작성하라.
- 학생 이름이 있으면 "○○님,"으로 시작.
- "~예요/~해요" 톤.
- 길이: 250~400자.
- 구조: [총평] 2-3문장 / [잘한 점] / [개선할 점] / [다음 단계] 1-2문장
- 마크다운 헤더 사용 금지.

[응답 형식 — 반드시 이 JSON만 출력]
[중요] 아래 형식의 빈 따옴표와 0 부분은 반드시 실제 내용으로 채워라.

{
  "evalCriteria": "자사고·특목고 고입 면접 평가",
  "scores": [
    { "label": "질문 적합도", "score": 0, "max": 30, "desc": "" },
    { "label": "실제 경험도", "score": 0, "max": 40, "desc": "" },
    { "label": "발전 가능성", "score": 0, "max": 30, "desc": "" }
  ],
  "totalScore": 0,
  "summary": "",
  "reflectiveQuestions": ["", "", ""],
  "strengths": ["", ""],
  "improvements": ["", ""],
  "teacherDraft": ""
}

위 형식의 각 필드를 실제 평가 내용으로 채워서 JSON으로만 응답하라.`;
}

function buildFirstUserPrompt(body: RequestBody): string {
  const parts: string[] = [];

  const meta: string[] = [];
  meta.push(`지원 학교: ${body.schoolName}`);
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  parts.push(`[기본 정보]\n${meta.join("\n")}`);

  parts.push(`[예상질문]\n${body.questionText}`);

  if (body.questionPurpose && body.questionPurpose.length > 0) {
    parts.push(`[질문 의도]\n${body.questionPurpose.map((p) => `- ${p}`).join("\n")}`);
  }

  parts.push(`[학생 답변]\n${body.studentAnswer}`);

  parts.push(
    "위 답변을 평가하고 반드시 JSON만 응답하라.\n" +
    "- totalScore는 세 점수 합.\n" +
    "- 점수 캘리브레이션 엄격히 따라라.\n" +
    "- teacherDraft는 반드시 250-400자의 실제 피드백을 작성하라. 빈 문자열 절대 금지."
  );

  return parts.join("\n\n");
}

function buildUpgradeSystemPrompt(): string {
  return `너는 자사고·특목고 고입 면접 전문 평가관이다.

학생이 1차 답변에 대한 피드백을 받고, 답변을 수정해서 재제출했다.
2차 답변을 1차 답변과 비교하여 평가하라.

평가 핵심은 1차와 동일한 3축이지만, "1차 피드백 반영도"를 가장 중시한다.
1. 질문 적합도: 30점
2. 실제 경험도: 40점
3. 발전 가능성: 30점

[중요]
- 1차 피드백이 2차 답변에 어떻게 반영됐는지를 가장 비중 있게 평가하라.
- 잘 반영됐으면 솔직하게 점수 올려주고, 거의 반영 안 됐으면 솔직하게 평가하라.
- "노력 인정" 모호한 칭찬 금지.
- 대입, 전공적합성, 학생부, 생기부, 세특이라는 표현 사용 금지.
- 없는 경험을 만들어내지 마라.

[작성 지침]

1. reflectiveQuestions: 2차 답변을 더 발전시킬 사유 질문 3가지
2. strengths: 1차 → 2차에서 명확히 좋아진 점 2가지 (구체적 인용)
3. improvements: 여전히 부족하거나 새로 생긴 약점 1~3가지 ("부족한 부분 / 왜 문제 / 어떻게 고칠지" 순서)
4. summary: 1차 대비 발전 정도를 90-120자로 압축

5. teacherDraft (선생님 최종 피드백 초안)
- ★ 반드시 작성하라. 빈 문자열 금지. ★
- 학생 이름 있으면 "○○님,"
- "~예요/~해요" 톤, 250-400자
- 구조: [총평] / [좋아진 점] / [아직 보완할 점] / [격려]
- 마크다운 헤더 사용 금지.

[응답 형식 — 반드시 JSON만]
[중요] 아래 형식의 빈 따옴표와 0 부분은 반드시 실제 내용으로 채워라.

{
  "evalCriteria": "자사고·특목고 고입 면접 평가 (재제출본)",
  "scores": [
    { "label": "질문 적합도", "score": 0, "max": 30, "desc": "" },
    { "label": "실제 경험도", "score": 0, "max": 40, "desc": "" },
    { "label": "발전 가능성", "score": 0, "max": 30, "desc": "" }
  ],
  "totalScore": 0,
  "summary": "",
  "reflectiveQuestions": ["", "", ""],
  "strengths": ["", ""],
  "improvements": ["", ""],
  "teacherDraft": ""
}

위 형식의 각 필드를 실제 평가 내용으로 채워서 JSON으로만 응답하라.`;
}

function buildUpgradeUserPrompt(body: RequestBody): string {
  const parts: string[] = [];

  const meta: string[] = [];
  meta.push(`지원 학교: ${body.schoolName}`);
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  parts.push(`[기본 정보]\n${meta.join("\n")}`);

  parts.push(`[예상질문]\n${body.questionText}`);

  if (body.questionPurpose && body.questionPurpose.length > 0) {
    parts.push(`[질문 의도]\n${body.questionPurpose.map((p) => `- ${p}`).join("\n")}`);
  }

  if (body.previousAnswer) {
    parts.push(`[1차 답변]\n${body.previousAnswer}`);
  }

  if (body.previousFeedback) {
    parts.push(`[1차 피드백 — 학생이 반영해야 했던 내용]\n${body.previousFeedback}`);
  }

  parts.push(`[2차 답변 — 재제출본]\n${body.studentAnswer}`);

  parts.push(
    "1차와 2차를 비교 평가하고 반드시 JSON만 응답하라.\n" +
    "- 1차 피드백 반영도를 가장 중시.\n" +
    "- totalScore는 세 점수 합.\n" +
    "- teacherDraft는 반드시 250-400자의 실제 피드백을 작성하라. 빈 문자열 절대 금지."
  );

  return parts.join("\n\n");
}