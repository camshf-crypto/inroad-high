// supabase/functions/high-recommend-books/index.ts
// 읽은 책(앵커) + 관계 유형 → 이어서 읽을 책 후보 추천
//
// 관계 유형 5종
//   same_concept  같은 개념, 다른 사례
//   same_context  같은 배경, 다른 이야기
//   deeper        한 단계 더 깊게
//   counter       반대 주장
//   applied       현장에서는 어떻게

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RELATION_GUIDE: Record<string, string> = {
  same_concept:
    '앵커 책의 핵심 개념을 **다른 분야나 다른 사례**로 다룬 책. 개념은 같되 무대가 달라야 한다.',
  same_context:
    '앵커 책과 **같은 시대·지역·인물군**을 다른 각도에서 본 책. 배경이 같고 시선이 달라야 한다.',
  deeper:
    '같은 주제를 **한 단계 이론적·전문적으로** 파고든 책. 교양서 다음의 입문 학술서 수준.',
  counter:
    '앵커 책과 **다른 결론이나 반대 주장**을 펴는 책. 토론과 논증의 재료가 되어야 한다.',
  applied:
    '이론을 **실무·현장 사례**로 옮긴 책. 실제로 어떻게 쓰이는지 보여주는 책.',
}

const SYSTEM_PROMPT = `너는 한국 고등학생의 생기부 독서활동을 설계하는 진학 지도 전문가야.

가장 먼저 할 일:
- 앵커 책의 [소개]를 읽고 이 책이 실제로 무엇을 다루는 책인지 파악한다.
- 제목만 보고 짐작하지 않는다. 소개가 없으면 확신할 수 있는 범위에서만 판단한다.
- 앵커 책이 시험 문제집·자격증 대비서·수험서처럼 탐구로 이어지기 어려운 책이면,
  그 책이 다루는 **주제 영역**(예: 간호·보건, 창업·마케팅)으로 넓혀서 읽을 만한 교양·전공서를 고른다.

원칙:
- 한국에서 실제로 출간되어 구할 수 있는 책만 추천한다. 확실하지 않으면 넣지 않는다.
- 널리 알려진 책을 우선한다. 절판이나 희귀서는 피한다.
- 고등학생이 읽을 수 있는 수준이어야 한다. 대학원 교재나 원서는 제외.
- 왜 이 책이 앵커 책과 이어지는지를 **탐구 관점에서** 설명한다. 줄거리 요약이 아니다.
- 학생이 지정한 학년과 과목이 있으면, 그 과목 수업에서 다루는 내용과 닿는 책을 고른다.
- 앵커 책과 지정한 과목의 접점이 약하면, 억지로 잇지 말고 그 과목에서 출발해
  앵커 책의 주제와 만나는 지점을 찾아 고른다.
- 추천 이유는 한 문장, 60자 이내. 학생이 읽고 바로 이해할 수 있게.
- 절대 지어내지 않는다. 제목과 저자가 정확해야 한다.

응답은 JSON 배열만. 다른 말은 붙이지 않는다.
[
  { "title": "책 제목", "author": "저자", "concept_tag": "엮는 개념", "why": "이어지는 이유 한 문장" }
]`

interface Payload {
  anchor: {
    title: string
    author?: string | null
    /** 서점 책 소개 — 이게 있어야 무슨 책인지 정확히 판단됨 */
    description?: string | null
    /** 학생이 적은 읽으려는 이유 */
    summary?: string | null
    concepts?: string[] | null
    subject?: string | null
    viewpoint?: string | null
  }
  relation: string
  /** 학생 맥락 (있으면 정확도가 올라감) */
  context?: {
    /** 추천받은 책을 담을 학년 */
    grade?: number | string | null
    /** 추천받은 책을 엮을 과목 */
    targetSubject?: string | null
    series?: string | null
    major?: string | null
    career?: string | null
    /** 이미 읽었거나 담은 책 — 중복 추천 방지 */
    exclude?: string[] | null
  }
  /** 추천 개수 (기본 4) */
  count?: number
}

function buildPrompt(p: Payload): string {
  const a = p.anchor
  const c = p.context ?? {}
  const guide = RELATION_GUIDE[p.relation] ?? RELATION_GUIDE.same_concept
  const n = p.count ?? 4

  const lines: string[] = []
  lines.push('[읽은 책]')
  lines.push(`제목: ${a.title}`)
  if (a.author) lines.push(`저자: ${a.author}`)
  if (a.subject) lines.push(`과목: ${a.subject}`)
  if (a.concepts?.length) lines.push(`핵심 개념: ${a.concepts.join(', ')}`)
  if (a.viewpoint) lines.push(`관점: ${a.viewpoint}`)
  if (a.description) {
    lines.push(`소개: ${a.description.substring(0, 600)}`)
  } else {
    lines.push('소개: (없음 — 제목과 저자로만 판단해야 함. 확신이 서지 않으면 주제 영역을 넓게 잡을 것)')
  }
  if (a.summary) lines.push(`학생이 적은 읽으려는 이유: ${a.summary.substring(0, 200)}`)

  lines.push('')
  lines.push('[학생]')
  if (c.grade) lines.push(`학년: 고${c.grade}`)
  if (c.series) lines.push(`계열: ${c.series}`)
  if (c.major) lines.push(`희망 학과: ${c.major}`)
  if (c.career) lines.push(`희망 직업: ${c.career}`)

  if (c.targetSubject) {
    lines.push('')
    lines.push('[이어서 읽을 책을 쓸 곳]')
    lines.push(`고${c.grade ?? 1} · ${c.targetSubject} 세부능력 및 특기사항`)
  }

  if (c.exclude?.length) {
    lines.push('')
    lines.push(`[이미 읽었거나 담은 책 — 추천 금지]\n${c.exclude.join(', ')}`)
  }

  lines.push('')
  lines.push('[요청]')
  lines.push(guide)
  if (c.targetSubject) {
    lines.push(
      `추천하는 책은 고${c.grade ?? 1} ${c.targetSubject} 수업에서 다루는 내용과 이어져야 하고, ` +
      `그 과목 세특에 탐구 근거로 쓸 수 있어야 해.`,
    )
    lines.push(`이유를 쓸 때 ${c.targetSubject}의 어떤 개념·단원과 닿는지 한 번은 짚어줘.`)
  }
  lines.push(`위 기준에 맞는 책 ${n}권을 추천해줘.`)
  lines.push('제목과 저자는 실제 출간된 그대로 정확히 적어줘.')

  return lines.join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OPENAI_API_KEY가 없어요' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const payload: Payload = await req.json()

    if (!payload?.anchor?.title) {
      return new Response(
        JSON.stringify({ success: false, error: '읽은 책 정보가 없어요' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    if (!payload.relation || !RELATION_GUIDE[payload.relation]) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `relation은 ${Object.keys(RELATION_GUIDE).join(' / ')} 중 하나여야 해요. 받은 값: ${payload.relation}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const startedAt = Date.now()
    console.log('[요청]', JSON.stringify({
      anchor: payload.anchor?.title,
      hasDescription: !!payload.anchor?.description,
      relation: payload.relation,
      grade: payload.context?.grade,
      targetSubject: payload.context?.targetSubject,
      major: payload.context?.major,
    }))

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildPrompt(payload) },
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenAI 호출 실패',
          details: errText.substring(0, 500),
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim()
    if (!raw) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI 응답 없음' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log('[AI 원본]', raw.substring(0, 1200))

    // json_object 모드라 { "books": [...] } 또는 배열이 올 수 있어 둘 다 받는다
    let books: any[] = []
    try {
      const parsed = JSON.parse(raw)
      books = Array.isArray(parsed)
        ? parsed
        : (parsed.books ?? parsed.results ?? parsed.items ?? [])
    } catch {
      const m = raw.match(/\[[\s\S]*\]/)
      if (m) books = JSON.parse(m[0])
    }

    console.log('[파싱]', Array.isArray(books) ? `${books.length}권` : '배열 아님')

    books = (books ?? [])
      .filter((b: any) => b && typeof b.title === 'string' && b.title.trim())
      .map((b: any) => ({
        title: String(b.title).trim(),
        author: String(b.author ?? '').trim(),
        concept_tag: String(b.concept_tag ?? '').trim(),
        why: String(b.why ?? '').trim(),
      }))

    console.log('[응답]', books.map((b: any) => `${b.title} / ${b.author}`).join(' | '))

    return new Response(
      JSON.stringify({
        success: true,
        relation: payload.relation,
        books,
        model: 'gpt-4o',
        usage: data.usage,
        duration_ms: Date.now() - startedAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('[에러]', String(e))
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})