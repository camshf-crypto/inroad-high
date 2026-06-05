// supabase/functions/simulation-feedback/index.ts
// 면접 시뮬레이션 피드백 (고등/중등 공용)
//   - 입력: 면접 전체 질문+답변(본질문/꼬리질문) + 음성 분석 요약
//   - 출력: ① 질문별 피드백(3~4줄씩) ② 전체 종합 피드백
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
  num?: number | string;  // 질문 번호 (1, 1.5, 2 ...)
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

    // 답변이 있는 질문만 추림 (미답변은 피드백 생성 대상에서 제외)
    const answered = body.qaList.filter((qa) => (qa.answer || "").trim().length > 0);

    if (answered.length === 0) {
      return new Response(
        JSON.stringify({ perQuestion: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 질문-답변 텍스트 구성 (num 포함 → AI가 어느 질문인지 식별)
    const qaText = answered
      .map((qa) => {
        const tag = qa.isTail ? `[꼬리질문 Q${qa.num}]` : `[질문 Q${qa.num}]`;
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

    // AI가 반환해야 할 질문 num 목록 (문자열로)
    const numList = answered.map((qa) => String(qa.num)).join(", ");

    const systemPrompt = `당신은 한국의 입시 학원 선생님으로, ${levelLabel}의 면접 시뮬레이션을 평가합니다.

[당신의 임무]
- 각 질문별로 학생 답변에 대한 짧은 피드백(3~4줄)을 작성
- 답변의 내용적 측면과 전달력(말 속도/명료도/군말/멈칫)을 함께 짚을 것
- 따뜻하지만 구체적으로

[질문별 피드백 지침]
- 각 질문마다 3~4줄(120~180자)
- 그 답변에서 잘한 점 1가지 + 아쉬운 점/개선점 1가지를 구체적으로
- 답변 내용을 짧게 인용하며 짚을 것
- "~예요/~해요" 따뜻한 톤 (${nameLabel}에게 말하듯)
- 말하기(속도/명료도/군말/멈칫)도 해당 답변과 관련 있으면 함께 언급
- 마크다운 사용 금지

[응답 형식 - 반드시 아래 JSON 구조]
{
  "perQuestion": [
    { "num": "1", "feedback": "이 질문 답변에 대한 3~4줄 피드백" },
    { "num": "1.5", "feedback": "..." }
  ]
}

- perQuestion 의 num 은 반드시 다음 값들과 정확히 일치: ${numList}
- 답변이 있는 질문만 포함
- JSON 외 다른 텍스트 절대 추가하지 마세요.`;

    const userPrompt = `${body.school ? `[지원 학교] ${body.school}\n\n` : ""}[면접 질문과 답변]
${qaText}

${voiceText ? `[음성 분석 결과]\n${voiceText}` : "[음성 분석 없음]"}

위 면접을 평가해서, 각 질문별 피드백(perQuestion)을 ${nameLabel}에게 줄 내용으로 작성해주세요. 답변 내용과 말하기 방식을 모두 짚어주세요.`;

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
        max_tokens: 2000,
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

    // perQuestion 의 num 을 문자열로 정규화
    const perQuestion = Array.isArray(parsed.perQuestion)
      ? parsed.perQuestion.map((p: any) => ({
          num: String(p.num),
          feedback: p.feedback || "",
        }))
      : [];

    return new Response(
      JSON.stringify({ perQuestion }),
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