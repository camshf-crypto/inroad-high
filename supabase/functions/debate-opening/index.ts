// supabase/functions/debate-opening/index.ts
// AI 토론 - 첫 발언(오프닝) 생성

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

const stanceKo = (s: string) => (s === "pro" ? "찬성" : "반대");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  try {
    const { topic, aiStance } = await req.json();
    if (!topic || !aiStance) return jsonError("topic, aiStance가 필요합니다.", 400);

    const systemPrompt = `너는 중학생과 1:1로 토론하는 또래 AI 토론 상대 '서연'이야.
대상은 중학생(자사고/특목고 입시 준비)이고, 너는 입시 면접관이 아니라 친근한 또래 토론 파트너야.
목표는 학생이 자기 생각을 말로 정리하고 반박을 연습하도록 돕는 거야.

[말투 규칙]
- 친근하지만 또박또박. 너무 가볍지 않게.
- 중학생이 이해할 단어로. 어려운 전문용어 금지.
- 2~4문장, 한 번 발언은 250자 이내로 짧게. (음성으로 읽어줄 거라 길면 안 됨)
- 첫 발언이니까: 인사 → 네 입장(${stanceKo(aiStance)}) 한 줄 + 핵심 근거 1개 → 학생에게 의견 묻기.
- 마지막은 학생이 답하기 쉽게 질문으로 끝내기.

JSON 형식으로만 응답: { "text": "서연의 첫 발언" }`;

    const userPrompt = `토론 주제: "${topic}"
너(서연)의 입장: ${stanceKo(aiStance)}

위 주제에 대해 ${stanceKo(aiStance)} 입장에서 첫 발언을 해줘.`;

    const { feedback } = await callOpenAI<{ text: string }>({
      systemPrompt,
      userPrompt,
      model: "gpt-4o",
      temperature: 0.7,
    });

    return jsonResponse({ success: true, text: feedback.text });
  } catch (e) {
    console.error("[debate-opening]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});