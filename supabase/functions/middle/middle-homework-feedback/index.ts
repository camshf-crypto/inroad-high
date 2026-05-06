// supabase/functions/middle-homework-feedback/index.ts
// 중등 숙제 영상 STT 텍스트 → AI 스피치 피드백
// 어드민에서 선생님이 "AI 피드백 생성" 버튼 클릭 시 호출

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  transcript: string;        // Clova STT 결과 (필수)
  homeworkTitle?: string;    // 숙제 제목 (예: "조선 신분제 발표")
  lessonContext?: string;    // 수업 내용 요약 (있으면 정확도↑)
  grade?: string;            // 학년 (예: "중2")
  durationSec?: number;      // 영상 길이 — 분량 평가용
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      transcript,
      homeworkTitle,
      lessonContext,
      grade,
      durationSec,
    }: RequestBody = await req.json();

    if (!transcript || transcript.trim().length < 10) {
      return jsonError("transcript가 비어있거나 너무 짧습니다.", 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY가 없습니다.");

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      transcript,
      homeworkTitle,
      lessonContext,
      grade,
      durationSec,
    });

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI 오류: ${openaiRes.status} ${errText}`);
    }

    const data = await openaiRes.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const feedback = JSON.parse(content);

    return new Response(
      JSON.stringify({
        success: true,
        feedback,
        meta: {
          model: "gpt-4o",
          transcriptLength: transcript.length,
          tokensUsed: data.usage?.total_tokens ?? null,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[middle-homework-feedback]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function buildSystemPrompt(): string {
  return `당신은 중학생 발표/스피치를 코칭하는 전문 교사입니다.
학생이 수업 결과물로 작성한 발표 영상의 STT 텍스트를 분석하여,
선생님이 검토 후 학생에게 그대로 전달할 수 있는 수준의 피드백을 작성하세요.

평가 기준은 두 축입니다:

[1] 스피치 구조 (40%)
- 도입-전개-결론의 흐름이 명확한가
- 문장 간 논리적 연결이 자연스러운가
- 핵심 메시지가 분명히 드러나는가
- 분량과 페이싱이 적절한가 (영상 길이 대비)

[2] 내용 (60%)
- 수업 내용을 정확히 이해하고 있는가
- 근거나 예시가 적절히 제시되었는가
- 단순 암기를 넘어선 자신만의 해석/통찰이 있는가
- 주제에서 벗어나지 않고 일관성을 유지하는가

작성 원칙:
- "잘했어요" 같은 추상적 칭찬 금지. "○○ 부분에서 △△한 점이 좋았어요" 식으로 구체적으로.
- 중학생이 이해할 언어로 쓰되, 과하게 어린아이 취급하지 마세요.
- STT는 오타/띄어쓰기 오류 가능 → 명백한 STT 오인식은 무시하고 의미 위주로 평가.
- 따뜻하지만 정확하게.

반드시 아래 JSON 형식으로만 응답:
{
  "totalScore": 0-100 정수,
  "structureScore": 0-100 정수,
  "contentScore": 0-100 정수,
  "summary": "학생이 무엇을 발표했는지 한 줄 요약",
  "structure": {
    "강점": ["구조적으로 잘한 점 2-3개"],
    "개선점": ["구조적으로 보완할 점 2-3개"]
  },
  "content": {
    "강점": ["내용적으로 잘한 점 2-3개"],
    "개선점": ["내용적으로 보완할 점 2-3개"]
  },
  "specificQuotes": [
    { "quote": "STT에서 인상적인 학생 발화 (짧게)", "comment": "왜 좋았는지/보완할지" }
  ],
  "nextStep": "다음 발표에서 이것 하나만 신경쓰면 좋을 핵심 조언 한 문장",
  "teacherNote": "선생님이 학생에게 전달하기 전 참고할 메모"
}`;
}

function buildUserPrompt(args: {
  transcript: string;
  homeworkTitle?: string;
  lessonContext?: string;
  grade?: string;
  durationSec?: number;
}): string {
  const parts: string[] = [];
  if (args.grade) parts.push(`[학년] ${args.grade}`);
  if (args.homeworkTitle) parts.push(`[숙제 제목] ${args.homeworkTitle}`);
  if (args.durationSec) {
    const min = Math.floor(args.durationSec / 60);
    const sec = args.durationSec % 60;
    parts.push(`[영상 길이] ${min}분 ${sec}초`);
  }
  if (args.lessonContext) {
    parts.push(`[수업 맥락]\n${args.lessonContext}`);
  }
  parts.push(`[학생 발표 STT 텍스트]\n${args.transcript}`);
  parts.push(`\n위 발표를 분석해 JSON으로 피드백을 작성해주세요.`);
  return parts.join("\n\n");
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}