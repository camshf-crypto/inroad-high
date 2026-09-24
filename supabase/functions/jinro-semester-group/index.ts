import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SYSTEM_PROMPT = `너는 중학생이 한 학기 동안 한 활동 목록을 읽고, 관심 분야로 묶는다.

[규칙]
- 아래 분야 목록에 있는 code만 쓴다. 새 이름을 만들지 마라.
- 한 학기에 3개 이하로 묶는다. 활동이 적으면 1~2개여도 된다.
- 억지로 묶지 마라. 어디에도 안 맞는 활동은 etc로 보낸다.
- 활동 하나는 한 분야에만 들어간다. 겹치게 하지 마라.
- 활동이 2개 이하인 분야는 만들지 마라. etc로 보낸다.
- 모든 활동이 어느 분야든 하나에는 들어가야 한다. 빠뜨리지 마라.

[분야 목록]
{{FIELD_LIST}}

[출력]
json 하나만. 설명이나 코드블록 없이.

{
  "groups": [
    { "field": "medical", "items": ["응급실 대기시간", "약 부작용 사례"] }
  ]
}`

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { keywords, fields } = await req.json()
    // keywords: string[] — 그 학기 키워드 전부
    // fields: [{ code, name, hint }]

    if (!Array.isArray(keywords) || keywords.length < 3) {
      return new Response(JSON.stringify({ groups: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const fieldList = (fields ?? [])
      .map((f: any) => `${f.code} · ${f.name} — ${f.hint ?? ''}`)
      .join('\n')

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
          { role: "user", content: `[이번 학기 활동 ${keywords.length}개]\n${keywords.join('\n')}` },
        ],
      }),
    })

    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)

    const data = await res.json()
    const parsed = JSON.parse(data.choices[0].message.content)

    const valid = new Set((fields ?? []).map((f: any) => f.code))
    const groups = (parsed.groups ?? [])
      .filter((g: any) => g?.field && valid.has(g.field) && Array.isArray(g.items) && g.items.length >= 3)
      .slice(0, 3)
      .map((g: any) => ({ field: g.field, items: g.items }))

    return new Response(JSON.stringify({ groups }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), groups: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})