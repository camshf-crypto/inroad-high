// ============================================
// supabase/functions/research-coach/index.ts
// 탐구 평가 + 코칭 (우리 세특 DB 기반) — 대화형 좁혀가기
//
// 1턴(eval): 적합도 평가만 + 방향 질문 (대안 없음)
// 2턴(alts): 원장이 고른 방향으로 대안 생성 (direction: keep|career|both)
// 3턴+(chat): 자유 코칭
//
// 모델: gpt-4.1-mini
//
// 앞 학년 활동 연계 (2026-10)
//   studentId(없으면 로그인한 학생 본인)의 앞 학년 탐구 · 완료한 수행평가를 읽어서
//   대안 2개 중 1개는 "앞 학년 활동을 이어서 심화", 1개는 "새로 시작"으로 만든다.
//   깊이는 학년별 진로 초점: 고1 계열 → 고2 학과 → 고3 직업군
// ============================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MODEL = 'gpt-4.1-mini'

interface Body {
  mode: 'eval' | 'alts' | 'chat'      // 무슨 단계인지
  direction?: 'keep' | 'career' | 'both'  // alts일 때 방향
  major: string
  grade?: string
  subject?: string
  job?: string
  topic?: string
  content?: string
  message?: string
  history?: { role: 'user' | 'assistant'; content: string }[]
  studentId?: string        // 원장이 학생 대신 부를 때 (학생 본인이면 없어도 됨)
  semester?: string | number
  previousTopic?: string    // 같은 학년 1학기 탐구 제목 (화면이 넘겨줌)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body: Body = await req.json()
    const { mode, direction, major, grade, subject, job, topic, content, message, history = [] } = body
    if (!major) throw new Error('major(희망학과)는 필수입니다')

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    // 누구의 앞 학년 활동을 볼지 — 화면이 studentId 를 주면 그 학생, 아니면 로그인한 본인
    let studentId = body.studentId ?? null
    if (!studentId) {
      const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
      const { data: auth } = await supabase.auth.getUser(token).catch(() => ({ data: null as any }))
      studentId = auth?.user?.id ?? null
    }
    const hist = await studentHistory(supabase, studentId, grade, body.semester, body.previousTopic, major, job, subject)
    const keywordSource = message || `${topic ?? ''} ${content ?? ''}`
    const keyword = extractKeyword(keywordSource)

    // ── 검색 (alts/chat일 때만 필요, eval은 평가만이라 가볍게) ──
    let refs: any[] = []
    let dataMode: 'matched' | 'major_only' | 'none' = 'none'
    if (mode !== 'eval') {
      if (keyword) {
        const { data } = await supabase.rpc('search_setech', {
          p_major: major, p_keyword: keyword, p_grade: grade ?? null, p_limit: 6,
        })
        if (data && data.length > 0) { refs = data; dataMode = 'matched' }
      }
      if (refs.length === 0) {
        const { data } = await supabase.rpc('search_setech', {
          p_major: major, p_keyword: null, p_grade: null, p_limit: 6,
        })
        if (data && data.length > 0) { refs = data; dataMode = 'major_only' }
      }
    }
    const refText = refs
      .map((r: any, i: number) => `${i + 1}. [${r.grade}학년·${r.subject}] ${r.activity} → ${(r.inquiry ?? '').replace(/\n/g, ' ')}`)
      .join('\n')

    // ───────── 1턴: 적합도 평가 (JSON, 대안 없음) ─────────
    if (mode === 'eval') {
      const sys = buildEvalSystem({ major, job, hist })
      const userMsg = `[학생이 제출한 탐구]
희망학과: ${major}
희망직업군: ${job ?? '(미입력)'}
학년: ${grade ?? '?'}학년
연계과목: ${subject ?? '(미입력)'}
탐구제목: ${topic ?? '(미입력)'}
탐구내용: ${content ?? '(미입력)'}`
      const raw = await callGPT(sys, [{ role: 'user', content: userMsg }], true)
      let evalResult: any = null
      try { evalResult = JSON.parse(stripFence(raw)) } catch { evalResult = null }

      return new Response(
        JSON.stringify({ type: 'eval', eval: evalResult }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // ───────── 2턴: 방향별 대안 (JSON) ─────────
    if (mode === 'alts') {
      const sys = buildAltsSystem({ major, subject, job, direction: direction ?? 'both', dataMode, refText, hist })
      const userMsg = `희망학과 ${major}, 연계과목 ${subject ?? '미입력'}, 탐구제목 ${topic ?? '미입력'}, 탐구내용 ${content ?? '미입력'}`
      const raw = await callGPT(sys, [...history, { role: 'user', content: userMsg }], true)
      let altsResult: any = null
      try { altsResult = JSON.parse(stripFence(raw)) } catch { altsResult = null }

      // DB 사례: GPT가 고른 것 (없으면 빈 배열)
      const dbAlts = Array.isArray(altsResult?.dbAlts) ? altsResult.dbAlts : []
      // 이어 가는 대안은 desc 앞에 "고1 ○○에서 이어져요"를 붙여 둔다 (화면이 desc 만 보여 줘도 보이게)
      const withLink = (list: any) => (Array.isArray(list) ? list : []).map((a: any) => {
        const from = String(a?.from ?? '').trim()
        const deeper = String(a?.deeper ?? '').trim()
        const head = from ? `[${from}에서 이어져요${deeper ? ` · ${deeper}` : ''}] ` : '[새로 시작] '
        return { ...a, from, deeper, desc: hist.items.length ? head + String(a?.desc ?? '') : String(a?.desc ?? '') }
      })
      if (altsResult) {
        altsResult.keepAlts = withLink(altsResult.keepAlts)
        altsResult.careerAlts = withLink(altsResult.careerAlts)
      }

      return new Response(
        JSON.stringify({
          type: 'alts', direction: direction ?? 'both', dataMode,
          keepAlts: Array.isArray(altsResult?.keepAlts) ? altsResult.keepAlts : [],
          careerAlts: Array.isArray(altsResult?.careerAlts) ? altsResult.careerAlts : [],
          dbAlts,
        }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // ───────── 3턴+: 자유 코칭 ─────────
    const sys = buildCoachSystem({ major, dataMode, refText }) + '\n\n' + histBlock(hist)
    const reply = await callGPT(sys, [...history, { role: 'user', content: message! }], false)
    return new Response(
      JSON.stringify({ type: 'chat', dataMode, reply }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

// ── 1턴 평가 (대안 없이 판단만) ──
function buildEvalSystem(p: { major: string; job?: string; hist: History }): string {
  return `너는 입시 탐구활동 평가 코치야. 학생 희망학과는 "${p.major}"${p.job ? `, 직업군은 "${p.job}"` : ''}야.
${histBlock(p.hist)}
학생 탐구주제를 평가해서 아래 JSON으로만 응답해. 마크다운/코드펜스 없이 순수 JSON:

{
  "fit": "적합" | "보완 필요" | "부적합",
  "fitReason": "한 줄 이유 (전공 관련성)",
  "subjectMatch": "과목 정합성 한 줄 (예: 화학II는 보통 고2~3)",
  "difficulty": "난이도/수준 한 줄. 고등학생이 실제로 할 수 있는 수준인지 짚어줘. 너무 전문적이면 그 점 지적.",
  "action": "수정 권장" | "유지 권장" | "재설정 권장",
  "link": "앞 학년 활동과의 연계 한 줄. 이어지면 어떤 활동에서 무엇이 깊어지는지, 안 이어지면 '새로 시작하는 주제'라고. 앞 학년 활동이 없으면 빈 문자열.",
  "comment": "원장에게 한 마디. 2~3문장. 이 주제의 강점과 고민거리. 단, 모든 과목을 진로에 억지로 엮으면 작위적이라는 점, 너무 완벽하면 오히려 의심받는다는 점을 염두에 두고 현실적으로."
}

모든 값 한국어. 별표나 마크다운 기호 쓰지 마.`
}

// ── 2턴 방향별 대안 ──
function buildAltsSystem(p: {
  major: string; subject?: string; job?: string
  direction: string; dataMode: string; refText: string; hist: History
}): string {
  const dataBlock = p.dataMode === 'none'
    ? `우리 DB에 "${p.major}" 관련 데이터가 없어. dbAlts는 반드시 빈 배열 []. 대안은 일반 기준으로 만들되 과장 마.`
    : `아래는 DB에서 "${p.major}"로 검색한 세특 사례야. 단, 이 데이터는 학과 분류가 부정확할 수 있어서 학생 탐구주제나 진로와 전혀 무관한 게 섞여 있어.

[엄격 규칙 - dbAlts]
- 학생의 탐구주제(주제어/키워드)와 "직접" 관련된 사례만 dbAlts에 넣어.
- 학생 희망진로("${p.major}"/"${p.job ?? ''}")와 주제가 모두 어긋나는 사례는 절대 넣지 마.
- "참고 가능", "도움이 될 수 있음" 같은 억지 연결로 끼워맞추는 것 금지. 진짜 직접 관련된 게 아니면 버려.
- 애매하면 넣지 마. 관련된 게 하나도 없으면 dbAlts는 빈 배열 [].
- 예: 학생이 "AI 반도체 무역"을 탐구하는데 검색 결과가 "스포츠 커뮤니케이션 논리학"이면 → 무관하므로 제외(빈 배열).

[검색된 세특]${p.dataMode === 'major_only' ? ' (주의: 키워드 매칭 실패로 학과 전체에서 가져온 거라 학생 주제와 무관할 가능성 높음. dbAlts 더 엄격히 걸러.)' : ''}
${p.refText}`

  // 방향별로 뭘 채울지
  let dirInstruct = ''
  if (p.direction === 'keep') {
    dirInstruct = `keepAlts에 "과목 충실형" 대안 2개를 채우고 careerAlts는 빈 배열 []. 과목 충실형 = 연계과목(${p.subject ?? '현재 과목'}) 본연의 학습 취지에 충실하면서 진로와는 자연스럽게 연결되는 선에서만. 억지로 진로에 끼워맞추지 마.
[2개 차별화 필수] 두 대안은 반드시 뚜렷하게 다른 각도(다른 단원/개념/탐구방식)여야 해. 비슷하면 실패야.`
  } else if (p.direction === 'career') {
    dirInstruct = `careerAlts에 "진로 연계형" 대안 2개를 채우고 keepAlts는 빈 배열 []. 진로 연계형 = 학생 희망학과(${p.major})/직업(${p.job ?? ''})과 적극 연결한 발전 방향. 단 작위적이지 않게.
[2개 차별화 필수] 두 대안은 반드시 뚜렷하게 다른 각도여야 해. 제목·소재·접근법이 비슷하면 안 됨. 예시 축: (1) 정책·규제·제도 관점 vs 기술·산업 관점, (2) 거시(국가/국제기구) vs 미시(기업/사례), (3) 현황 분석 vs 미래 전망/대안 제시, (4) 다른 연계 과목으로 확장. 두 개가 같은 얘기의 말바꿈이면 실패야.`
  } else {
    dirInstruct = `keepAlts(과목 충실형: 과목 본연 충실 + 자연스러운 진로 연결)와 careerAlts(진로 연계형: 진로와 적극 연결)를 각각 2개씩 채워. 각 배열의 2개는 서로 뚜렷하게 다른 각도여야 함(말바꿈 금지). 원장이 비교해서 고르게.`
  }

  return `너는 입시 탐구활동 코치야. 학생 희망학과 "${p.major}", 연계과목 "${p.subject ?? '미입력'}".
아래 JSON으로만 응답해. 마크다운/코드펜스 없이 순수 JSON:

{
  "dbAlts": [ { "title": "실제 세특 제목(다듬어도 됨)", "desc": "학년·과목 + 학생 주제와 어떻게 이어지는지 한 줄" } ],
  "keepAlts": [ { "title": "과목 충실형 대안 제목", "subject": "${p.subject ?? ''}", "from": "", "deeper": "", "desc": "2~3문장. 과목 취지에 충실하면서 진로와 자연스럽게 닿는 방향." } ],
  "careerAlts": [ { "title": "진로 연계형 대안 제목", "subject": "연계 과목", "from": "", "deeper": "", "desc": "2~3문장. 진로와 적극 연결한 방향. 단 작위적이지 않게." } ]
}

${dirInstruct}

${histBlock(p.hist)}
[앞 학년 활동 연계 규칙]
${p.hist.items.length
  ? `- 각 배열(keepAlts, careerAlts)의 2개 중 1개는 위 [앞 학년 활동] 하나를 이어서 한 단계 깊게 하는 대안, 1개는 새로 시작하는 대안으로 만든다.
- 이어 가는 대안: from 에 "고1 1학기 통합사회 · 최저임금 기사 비교"처럼 어떤 활동인지, deeper 에 무엇이 달라지는지 한 줄. 같은 주제를 되풀이하지 말 것.
  · [심화] 활동을 이으면: 진로 초점 깊이로 한 단계 끌어올린다(질문·자료·방법 중 무엇이 깊어지는지).
  · [확장] 활동을 이으면: 같은 관심을 이번 과목의 다른 개념·관점·방법으로 넓힌다. 예) 고1 국어 '광고 문구의 설득 전략' → 고1 사회 '광고 규제와 소비자 권리'.
- 새로 시작하는 대안: from, deeper 는 빈 문자열.
- 억지로 잇지 말 것. 이어질 만한 활동이 정말 없으면 둘 다 새로 시작해도 된다.`
  : `- 앞 학년 활동이 없으니 from, deeper 는 모두 빈 문자열.`}

${dataBlock}

모든 값 한국어. 별표나 마크다운 기호 쓰지 마. 고등학생 수준 현실적으로, 완성본을 대신 써주지 말고 발전 방향만 제시. 각 대안 배열은 정확히 2개씩.`
}

function buildCoachSystem(p: { major: string; dataMode: string; refText: string }): string {
  const base = `너는 입시 탐구활동 코치야. 학생 희망학과 "${p.major}". 이전 대화를 이어가며 학생 질문에 맞게 더 깊게 가공·심화해줘. 3~5문장, 한국어. 마크다운 기호 쓰지 마. 고등학생이 실제 할 수 있는 수준으로, 완성본을 대신 써주지 말고 방향만.`
  if (p.dataMode === 'none') return `${base}\n\n참고: DB에 "${p.major}" 데이터 없어. 사례 지어내지 말고 일반 기준으로.`
  const label = p.dataMode === 'matched' ? '이번 질문 관련' : `${p.major} 일반`
  return `${base}\n\n[${label} 실제 세특 — 근거]\n${p.refText}\n\n이 사례 근거로 삼되 베끼지 말고 학생 맞춤으로.`
}

function extractKeyword(text: string): string | null {
  if (!text) return null
  const cleaned = text.replace(/[^가-힣a-zA-Z0-9\s]/g, ' ')
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2)
  const stop = new Set(['탐구', '분석', '연구', '활동', '대한', '통해', '위한', '실험', '내용', '주제', '추천', '한개', '하나', '진학', '희망', '지원', '방향', '과목', '충실', '진로', '연계'])
  const filtered = words.filter(w => !stop.has(w))
  return (filtered.sort((a, b) => b.length - a.length)[0]) ?? (words[0] ?? null)
}

function stripFence(s: string): string {
  return s.replace(/```json/gi, '').replace(/```/g, '').trim()
}

async function callGPT(system: string, messages: any[], json: boolean): Promise<string> {
  const body: any = {
    model: MODEL,
    messages: [{ role: 'system', content: system }, ...messages],
    temperature: 0.7,
    max_tokens: 1400,
  }
  if (json) body.response_format = { type: 'json_object' }
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`)
  const data = await resp.json()
  return (data.choices?.[0]?.message?.content ?? '').replace(/\*\*/g, '')
}
// ── 앞 학년 활동 · 진로 초점 ──
interface History {
  focus: { level: string; value: string } | null
  items: { when: string; kind: string; subject: string; title: string; did: string; relation: '심화' | '확장' }[]
}

const gnum = (g: unknown) => Number(String(g ?? '').match(/[123]/)?.[0] ?? 0)
const cut = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

async function studentHistory(
  db: any, studentId: string | null, grade: unknown, semester: unknown, previousTopic: string | undefined, major: string, job?: string, subject?: string,
): Promise<History> {
  const tg = gnum(grade)
  const ts = gnum(semester)
  const items: History['items'] = []

  if (studentId) {
    const [topics, nodes, tasks] = await Promise.all([
      db.from('high_roadmap_topic').select('id, node_id, title, detail, status').eq('student_id', studentId).limit(80),
      db.from('high_roadmap_node').select('id, grade, subject_name').or(`student_id.eq.${studentId},student_id.is.null`).limit(300),
      db.from('high_school_task').select('grade, semester, subject, title, setuk_text').eq('student_id', studentId).eq('status', 'done').limit(30),
    ])
    const nodeById = new Map((nodes.data ?? []).map((n: any) => [n.id, n]))
    // 로드맵 탐구는 status 가 전부 'active' → 진행 단계(pipeline)에 내용을 적은 탐구만 '한 활동'으로 본다
    const ids = (topics.data ?? []).map((t: any) => t.id)
    const { data: pipes } = ids.length
      ? await db.from('high_roadmap_pipeline').select('topic_id, content, final_content').in('topic_id', ids)
      : { data: [] }
    const didText = new Map<string, string>()
    for (const p of pipes ?? []) {
      const t = cut(p.final_content || p.content, 120)
      if (t) didText.set(p.topic_id, `${didText.get(p.topic_id) ?? ''} ${t}`.trim())
    }
    for (const t of topics.data ?? []) {
      if (!didText.has(t.id)) continue // 계획만 하고 아직 안 한 탐구는 빼기
      const n: any = nodeById.get(t.node_id)
      const g = gnum(n?.grade)
      const subj = cut(n?.subject_name, 30)
      // 앞 학년 = 심화 · 같은 학년 다른 과목 = 확장(같은 깊이에서 다른 방향)
      const relation = g && g < tg ? '심화' : g === tg && subj && subject && subj !== subject ? '확장' : null
      if (relation) items.push({ when: `고${g}`, kind: '탐구', subject: subj, title: cut(t.title, 80), did: cut(didText.get(t.id) || t.detail, 160), relation })
    }
    for (const p of tasks.data ?? []) {
      const g = gnum(p.grade)
      const sm = gnum(p.semester)
      const subj = cut(p.subject, 30)
      const relation =
        g && g < tg ? '심화'
        : g === tg && subj === subject && sm && ts && sm < ts ? '심화'
        : g === tg && subj && subject && subj !== subject ? '확장'
        : null
      if (relation) items.push({ when: `고${g}${sm ? ` ${sm}학기` : ''}`, kind: '수행평가', subject: subj, title: cut(p.title, 80), did: cut(p.setuk_text, 160), relation })
    }
  }
  if (previousTopic && tg) items.push({ when: `고${tg} 1학기`, kind: '탐구', subject: cut(subject, 30), title: cut(previousTopic, 80), did: '', relation: '심화' })
  // 바로 전 학년부터
  items.sort((a, b) => gnum(b.when) - gnum(a.when))

  // 학년별 진로 초점: 고1 계열 · 고2 학과 · 고3 직업군
  let series = ''
  if (major) {
    const { data } = await db.from('high_career_department').select('series').eq('name', major).limit(1)
    series = cut(data?.[0]?.series, 30)
  }
  const focus =
    tg >= 3 ? (job ? { level: '직업군', value: cut(job, 60) } : { level: '학과', value: cut(major, 60) })
    : tg === 2 ? { level: '학과', value: cut(major, 60) }
    : series ? { level: '계열', value: series } : { level: '학과', value: cut(major, 60) }

  return { focus, items: items.slice(0, 20) }
}

function histBlock(h: History): string {
  const depth = h.focus
    ? `[진로 초점] ${h.focus.level}: ${h.focus.value} — 고1은 계열 전반에 통하는 넓은 관점, 고2는 학과 개념·이론, 고3은 그 직업이 실제로 다루는 현장 문제까지 깊게. 이 깊이에 맞춰라.`
    : ''
  const list = h.items.length
    ? `[앞 학년 활동] (바로 전 학년부터 · 심화=앞 학년 활동이라 한 단계 깊게, 확장=같은 학년 다른 과목이라 같은 깊이에서 다른 방향으로)\n${h.items.map((x, i) => `${i + 1}. [${x.relation}] ${x.when} ${x.kind}${x.subject ? ` · ${x.subject}` : ''} — ${x.title}${x.did ? ` (${x.did})` : ''}`).join('\n')}`
    : '[앞 학년 활동] 없음'
  return [depth, list].filter(Boolean).join('\n')
}