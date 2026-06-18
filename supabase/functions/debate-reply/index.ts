// supabase/functions/debate-reply/index.ts
// AI 토론 - 학생 발언에 대한 반박 생성

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

const stanceKo = (s: string) => (s === "pro" ? "찬성" : "반대");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  try {
    const { topic, aiStance, studentStance, history, studentText } = await req.json();
    if (!topic || !aiStance || !studentText) return jsonError("필수 값이 없습니다.", 400);

    const historyText = Array.isArray(history) && history.length > 0
      ? history
          .map((m: { speaker: string; text: string }) =>
            `${m.speaker === "ai" ? "서연" : "학생"}: ${m.text}`,
          )
          .join("\n")
      : "(아직 대화 없음)";

    const systemPrompt = `너는 중학생과 1:1로 토론하는 또래 AI 토론 상대 '서연'이야.
너의 입장은 '${stanceKo(aiStance)}', 학생의 입장은 '${stanceKo(studentStance)}'야.
학생은 자사고/특목고 입시를 준비하는 중학생이야.

[너의 역할]
- 학생의 방금 발언을 잘 듣고, 핵심을 짚어서 ${stanceKo(aiStance)} 입장에서 반박해.
- 무조건 반대만 하지 말고: 학생 말에서 일리 있는 부분은 인정 → 그래도 이런 점은? 하고 반박/되묻기.
- 학생이 근거가 약하면 부드럽게 "왜 그렇게 생각해?"라고 더 깊이 묻기.
- 학생이 논리적이면 칭찬도 해주되, 더 어려운 반례를 던져서 생각하게 만들기.

[말투 규칙]
- 친근한 또래 말투. 또박또박.
- 중학생 눈높이 단어. 전문용어 금지.
- 2~4문장, 250자 이내로 짧게. (음성으로 읽어줄 거라 길면 안 됨)
- 마지막은 학생이 답하기 쉽게 질문이나 되물음으로 끝내기.

JSON 형식으로만 응답: { "text": "서연의 반박 발언" }`;

    const userPrompt = `토론 주제: "${topic}"

[지금까지 대화]
${historyText}

[학생의 방금 발언]
${studentText}

위 학생 발언에 대해 ${stanceKo(aiStance)} 입장에서 반박/되물음 발언을 해줘.`;

    const { feedback } = await callOpenAI<{ text: string }>({
      systemPrompt,
      userPrompt,
      model: "gpt-4o",
      temperature: 0.7,
    });

    return jsonResponse({ success: true, text: feedback.text });
  } catch (e) {
    console.error("[debate-reply]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});