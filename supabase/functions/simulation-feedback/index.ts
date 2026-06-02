// supabase/functions/simulation-feedback/index.ts
// 면접 시뮬레이션 종합 피드백 (고등/중등 공용)
//   - 입력: 면접 전체 질문+답변(본질문/꼬리질문) + 음성 분석 요약
//   - 출력: 원장이 학생에게 줄 종합 피드백 초안
//   - 답변 내용 + 말하기(속도/명료도/군말/멈칫)를 통합해서 평가

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface QAItem {
  question: string;
  answer: string;
  isTail?: boolean;
}

interface VoiceSummary {
  avgSpeed?: number;      // 평균 말 속도(음절/분)
  speedLabel?: string;    // 느림/적정/빠름
  totalPause?: number;    // 멈칫 횟수
  fillerList?: string[];  // 군말 목록
  avgClarity?: number;    // 평균 명료도
}

interface RequestBody {
  qaList: QAItem[];
  voice?: VoiceSummary;
  studentName?: string;
  level?: "middle" | "high";
  school?: string;
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

    if (!body.qaList || body.qaList.length === 0) {
      return new Response(
        JSON.stringify({ error: "필수 필드 누락: qaList" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const levelLabel = body.level === "high" ? "고등학생(대학 입시)" : "중학생(고입)";
    const nameLabel = body.studentName ? `${body.studentName}님` : "학생";

    // 질문-답변 텍스트 구성
    const qaText = body.qaList
      .map((qa, i) => {
        const tag = qa.isTail ? "[꼬리질문]" : `[질문 ${i + 1}]`;
        return `${tag} ${qa.question}\n[답변] ${qa.answer || "(답변 없음)"}`;
      })
      .join("\n\n");

    // 음성 분석 텍스트 구성
    let voiceText = "";
    if (body.voice) {
      const v = body.voice;
      const parts: string[] = [];
      if (v.avgSpeed != null)
        parts.push(`말 속도: ${v.avgSpeed}음절/분 (${v.speedLabel || ""}, 일반 평균 150)`);
      if (v.totalPause != null) parts.push(`멈칫(긴 공백): ${v.totalPause}회`);
      if (v.fillerList && v.fillerList.length > 0)
        parts.push(`군말: ${v.fillerList.join(", ")}`);
      else parts.push("군말: 거의 없음");
      if (v.avgClarity != null) parts.push(`발음 명료도: ${v.avgClarity}점(100점 만점)`);
      voiceText = parts.join("\n");
    }

    const systemPrompt = `당신은 한국의 입시 학원 선생님으로, ${levelLabel}의 면접 시뮬레이션을 종합 평가합니다.

[당신의 임무]
- 학생의 답변 내용(본질문 + 꼬리질문)과 말하기 방식(음성 분석)을 종합해 피드백 작성
- 답변의 내용적 측면과 전달력(말 속도/명료도/군말/멈칫)을 모두 짚을 것
- 따뜻하지만 구체적으로, 학생이 다음에 무엇을 개선하면 좋을지 명확히

[피드백 작성 지침]
- 분량: 300~450자
- "${nameLabel}," 으로 시작
- "~예요/~해요" 따뜻한 톤
- 구조:
  1. [총평] 2-3문장 - 면접 전체 인상
  2. [답변 내용] 2-3문장 - 답변에서 잘한 점 + 아쉬운 점 (구체적으로 인용)
  3. [말하기] 2문장 - 음성 분석 기반 (속도/명료도/군말 등 언급)
  4. [다음 단계] 1-2문장 - 응원 + 개선 액션
- 마크다운(##, **) 사용 금지
- 모호한 표현 금지, 구체적으로

[응답 형식 - 반드시 JSON]
{ "feedback": "300-450자 종합 피드백" }

JSON 외 다른 텍스트 절대 추가하지 마세요.`;

    const userPrompt = `${body.school ? `[지원 학교] ${body.school}\n\n` : ""}[면접 질문과 답변]
${qaText}

${voiceText ? `[음성 분석 결과]\n${voiceText}` : "[음성 분석 없음]"}

위 면접 전체를 종합해서 ${nameLabel}에게 줄 피드백을 작성해주세요. 답변 내용과 말하기 방식을 모두 짚어주세요.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 800,
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
      JSON.stringify({ feedback: parsed.feedback || "" }),
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