// supabase/functions/generate-tail-question/index.ts
// 면접 중 실시간 꼬리질문 생성 (고등/중등 공용)
//   - 입력: 원래 질문 + 학생 답변(STT 텍스트)
//   - 출력: 꼬리질문 1개 (짧고 빠르게)
//   - 학교 평가 기준 등 무거운 입력 없음. 가벼운 실시간용.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  questionText: string;   // 원래 질문
  studentAnswer: string;  // 학생 답변 (STT 결과)
  level?: "middle" | "high"; // 중등/고등 (말투 약간 조정용, 선택)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다");
    }

    const body = (await req.json()) as RequestBody;

    if (!body.questionText || !body.studentAnswer) {
      return new Response(
        JSON.stringify({ error: "필수 필드 누락: questionText, studentAnswer" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const levelLabel = body.level === "high" ? "고등학생(대학 입시)" : "중학생(고입)";

    const systemPrompt = `당신은 ${levelLabel} 면접관입니다.
학생의 답변을 듣고, 그 답변 내용을 더 깊이 파고드는 꼬리질문 1개를 만드세요.

[꼬리질문 규칙]
- 학생 답변에서 언급된 구체적 내용을 짚어서 물어볼 것 (막연한 일반 질문 금지)
- 한 문장, 면접관이 실제로 말하듯 자연스럽게
- 압박하지 않고, 학생이 더 생각하게 만드는 질문
- 30자~60자 내외로 간결하게

[응답 형식 - 반드시 JSON]
{ "tailQuestion": "꼬리질문 한 문장" }

JSON 외 다른 텍스트 절대 추가하지 마세요.`;

    const userPrompt = `[원래 질문]
${body.questionText}

[학생 답변]
${body.studentAnswer}

위 답변을 듣고 이어서 물어볼 꼬리질문 1개를 만들어주세요.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // 가볍고 빠른 모델 (실시간용)
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", errText);
      return new Response(
        JSON.stringify({ error: "OpenAI API 호출 실패", detail: errText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      console.error("JSON parse error:", rawContent);
      return new Response(
        JSON.stringify({ error: "AI 응답 파싱 실패", raw: rawContent }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ tailQuestion: parsed.tailQuestion || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "알 수 없는 에러" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});