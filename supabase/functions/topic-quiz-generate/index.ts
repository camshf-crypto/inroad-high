import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SYSTEM_PROMPT = `너는 고등학생의 탐구보고서를 읽고 확인 문제를 내는 교사다.
학생이 이 탐구를 실제로 이해하고 썼는지 확인하는 것이 목적이다.

[문제는 반드시 학생이 쓴 보고서 안에서 낸다]
- 보고서에 없는 지식을 묻지 마라. 일반 상식 문제가 아니다.
- 학생이 쓴 용어, 학생이 인용한 자료, 학생이 세운 논리로만 문제를 만든다.
- 보고서에 근거가 없으면 그 단계 문제는 쉽게 내되, 억지로 지어내지 마라.

[4단계 — 각 1문제씩, 순서대로 어려워진다]
1단계 핵심 파악 (객관식) — 이 탐구가 결국 무엇을 밝히려 했는지. 주제문을 고르게 한다.
2단계 개념 이해 (객관식) — 학생이 보고서에 쓴 용어 하나의 뜻. 낱개 개념을 묻는다.
3단계 관계 파악 (객관식) — 보고서에 나온 두 개념이 어떻게 엮이는지. 인과나 조건을 묻는다.
4단계 추론하기 (서술형) — 보고서에서 다루지 않은 조건을 하나 던지고, 학생이 배운 것을 적용해 2~3문장으로 답하게 한다.

[객관식 규칙]
- 보기는 4개. 오답도 그럴듯해야 한다. 명백히 틀린 보기를 넣어 답을 쉽게 만들지 마라.
- 오답은 학생이 흔히 헷갈리는 지점에서 만든다.
- 정답 위치를 매번 같은 번호로 두지 마라.

[해설]
- 정답이 왜 맞는지, 그리고 매력적인 오답 하나가 왜 틀렸는지를 함께 쓴다.
- 학생이 이 부분을 보고서에서 어떻게 고치면 좋을지 한 문장 덧붙인다.
- 학생에게 직접 말하듯 쓴다.

[서술형 4단계]
- explanation에는 정답이 아니라 "이런 점이 들어가면 좋은 답"의 기준을 쓴다.
- options와 answer는 null로 둔다.

[출력 형식]
json 하나만 출력한다. 설명, 인사말, 코드블록 표시 없이 json만.

{
  "questions": [
    {
      "step": 1,
      "kind": "choice",
      "question": "문제문",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "answer": 0,
      "explanation": "해설",
      "keywords": ["더 찾아볼 검색어"]
    },
    {
      "step": 4,
      "kind": "essay",
      "question": "문제문",
      "options": null,
      "answer": null,
      "explanation": "좋은 답의 기준",
      "keywords": []
    }
  ]
}`

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { topic_title, major, grade, report_format, report_content } = await req.json()

    if (!report_content || report_content.replace(/\s/g, "").length < 200) {
      throw new Error("보고서가 짧아서 문제를 만들 수 없어요. 200자 이상 써주세요.")
    }

    const userMsg = [
      `[탐구주제]\n${topic_title}`,
      major ? `[진로]\n${major}` : "",
      grade ? `[학년]\n고${grade}` : "",
      report_format ? `[보고서 형태]\n${report_format}` : "",
      `[학생이 쓴 보고서]\n${report_content}`,
    ].filter(Boolean).join("\n\n")

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    })

    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)

    const data = await res.json()
    const parsed = JSON.parse(data.choices[0].message.content)

    if (!Array.isArray(parsed.questions) || parsed.questions.length !== 4) {
      throw new Error("문제 4개가 만들어지지 않았어요. 다시 시도해주세요.")
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})