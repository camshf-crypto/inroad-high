import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SYSTEM_PROMPT = `너는 중학생이 워크북에 쓴 답을 읽고, 그 학생이 오늘 무엇에 대해 활동했는지 짧은 말로 뽑는다.

[뽑는 규칙]
- 12자 이내. 공백 포함.
- 학생이 쓴 단어를 그대로 살려라. 다른 말로 바꾸거나 어렵게 만들지 마라.
- 학생 글에 없는 단어를 만들어 넣지 마라.
- "무엇에 대해" 했는지를 뽑는다. "어떻게" 했는지가 아니다.
  좋은 예 · 우리 동네 병원 수 / 응급실 대기시간 / 급식 잔반량 / 두 기사의 관점
  나쁜 예 · 자료 조사 / 비교 활동 / 과학 탐구 / 열심히 함
- 과목 이름만 쓰지 마라. 무엇을 다뤘는지가 들어가야 한다.
- 3개를 뽑는다. 학생 글이 짧으면 1~2개만 뽑아도 된다.

[분야 고르기]
각 키워드가 아래 목록 중 어디에 속하는지 함께 고른다.
목록에 없는 이름을 만들지 마라. 어디에도 안 맞으면 etc를 쓴다.

{{FIELD_LIST}}

[출력]
json 하나만. 설명이나 코드블록 없이.

{
  "items": [
    { "keyword": "우리 동네 병원 수", "field": "medical" }
  ]
}`

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { mission_title, subject, answers, fields } = await req.json()

    // fields: [{ code, name, hint }] — 프론트에서 middle_interest_field를 읽어 전달
    const fieldList = (fields ?? [])
      .map((f: any) => `${f.code} · ${f.name} — ${f.hint ?? ''}`)
      .join('\n')

    const text = Object.entries(answers ?? {})
      .filter(([, v]) => typeof v === 'string' ? v.trim() : Array.isArray(v) ? v.length : false)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\n')

    if (text.replace(/\s/g, '').length < 30) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const userMsg = [
      subject ? `[과목]\n${subject}` : '',
      `[오늘 활동]\n${mission_title}`,
      `[학생이 쓴 것]\n${text}`,
    ].filter(Boolean).join('\n\n')

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT.replace('{{FIELD_LIST}}', fieldList) },
          { role: "user", content: userMsg },
        ],
      }),
    })

    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)

    const data = await res.json()
    const parsed = JSON.parse(data.choices[0].message.content)

    const items = (parsed.items ?? [])
      .filter((x: any) => x?.keyword)
      .slice(0, 3)
      .map((x: any) => ({
        keyword: String(x.keyword).slice(0, 12),
        field: x.field ?? 'etc',
      }))

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), items: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})