// ============================================
// supabase/functions/research-coach/index.ts
// 탐구 평가 + 코칭 (우리 세특 DB 기반)
//
// 1턴: 구조화 평가 (JSON) — 빠른판단 / 수정·심화제안 / 대안추천(DB+생성)
// 2턴+: 자유 코칭 (텍스트)
//
// 모델: gpt-4.1-mini
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
  major: string
  grade?: string
  month?: string
  subject?: string
  job?: string
  topic?: string
  content?: string
  message?: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body: Body = await req.json()
    const { major, grade, month, subject, job, topic, content, message, history = [] } = body
    if (!major) throw new Error('major(희망학과)는 필수입니다')

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const keywordSource = message || `${topic ?? ''} ${content ?? ''}`
    const keyword = extractKeyword(keywordSource)

    // ── 3단 폴백 검색 ──
    let refs: any[] = []
    let dataMode: 'matched' | 'major_only' | 'none' = 'none'

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

    const refText = refs
      .map((r: any, i: number) => `${i + 1}. [${r.grade}학년·${r.subject}] ${r.activity} → ${(r.inquiry ?? '').replace(/\n/g, ' ')}`)
      .join('\n')

    const isFirstTurn = history.length === 0

    // ───────── 1턴: 구조화 평가 (JSON) ─────────
    if (isFirstTurn) {
      const sys = buildEvalSystemJSON({ major, grade, subject, job, dataMode, refText })
      const userMsg = `[학생이 제출한 탐구]
희망학과: ${major}
희망직업군: ${job ?? '(미입력)'}
학년/월: ${grade ?? '?'}학년 ${month ?? ''}월
연계과목: ${subject ?? '(미입력)'}
탐구제목: ${topic ?? '(미입력)'}
탐구내용: ${content ?? '(미입력)'}`

      const raw = await callGPT(sys, [{ role: 'user', content: userMsg }], true)
      let evalResult: any = null
      try {
        evalResult = JSON.parse(stripFence(raw))
      } catch {
        evalResult = null
      }

      // DB 블록: GPT가 검색 결과 중 관련 있는 것만 골라 정제 (evalResult.dbAlts)
      // 폴백: GPT가 안 줬으면 원본 상위 2개
      const dbAlts = (evalResult?.dbAlts && Array.isArray(evalResult.dbAlts) && evalResult.dbAlts.length > 0)
        ? evalResult.dbAlts
        : refs.slice(0, 2).map((r: any) => ({
            title: r.activity,
            desc: `${r.major} ${r.grade}학년 · ${r.subject} 연계`,
          }))

      return new Response(
        JSON.stringify({
          type: 'eval',
          dataMode,
          refsCount: refs.length,
          eval: evalResult,
          dbAlts,
        }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // ───────── 2턴+: 자유 코칭 (텍스트) ─────────
    const sys = buildCoachSystem({ major, dataMode, refText })
    const messages = [...history, { role: 'user', content: message! }]
    const reply = await callGPT(sys, messages, false)

    return new Response(
      JSON.stringify({ type: 'chat', dataMode, refsCount: refs.length, reply }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

// ── 1턴 JSON 평가 프롬프트 ──
function buildEvalSystemJSON(p: {
  major: string; grade?: string; subject?: string; job?: string; dataMode: string; refText: string
}): string {
  const dataLine =
    p.dataMode === 'matched'
      ? `아래는 우리 DB에서 검색한 실제 "${p.major}" 세특 사례야. 이걸 근거로 평가하고, genAlts(생성 대안)는 이 사례를 참고해 학생 맞춤으로 새로 만들되 베끼지 마.\n\n[실제 세특 사례]\n${p.refText}`
      : p.dataMode === 'major_only'
      ? `아래는 "${p.major}" 학과의 일반적인 세특 사례야. 이걸 근거로 학생 주제를 학과에 맞게 트는 방향을 genAlts로 제안해.\n\n[학과 일반 세특]\n${p.refText}`
      : `우리 DB에 "${p.major}" 데이터가 없어. genAlts는 일반 입시 기준으로 만들되 과장하지 마.`

  return `너는 입시 탐구활동 평가 코치야. 학생 희망학과는 "${p.major}"${p.job ? `, 직업군은 "${p.job}"` : ''}야.
학생 탐구주제를 평가해서 아래 JSON 형식으로만 응답해. 다른 말, 마크다운, 코드펜스 없이 순수 JSON만:

{
  "fit": "적합" | "보완 필요" | "부적합",
  "fitReason": "한 줄 이유 (전공 관련성)",
  "subjectMatch": "과목 정합성 한 줄 (예: 화학II는 보통 고2~3)",
  "difficulty": "난이도/수준 한 줄 평가",
  "action": "수정 권장" | "유지 권장" | "재설정 권장",
  "suggestion": "수정·심화 제안 2~3문장",
  "dbAlts": [
    { "title": "검색된 실제 세특 중 이 학생에게 관련있는 것의 제목 (어색하면 자연스럽게 다듬어)", "desc": "어느 학년·과목 연계인지 + 왜 참고할 만한지 한 줄" }
  ],
  "genAlts": [
    { "title": "데이터 기반 새 대안 제목", "desc": "왜 이 학과/진로에 맞는지 1~2문장" },
    { "title": "또 다른 대안 제목", "desc": "설명 1~2문장" }
  ]
}

${dataLine}

모든 값은 한국어. 별표(*)나 마크다운 기호 쓰지 마.
dbAlts: 위 검색된 실제 세특 사례 중에서 이 학생(${p.major}${p.job ? '/' + p.job : ''})에게 진짜 관련있는 것만 1~2개 골라. 학과·진로와 동떨어진 건 빼. 제목이 어색하면 자연스럽게 다듬되 내용은 실제 사례 기반 유지. 관련있는 게 없으면 빈 배열 [].
genAlts: 데이터를 참고해 학생 맞춤으로 새로 만든 대안 2개.`
}

// ── 2턴+ 코칭 프롬프트 ──
function buildCoachSystem(p: { major: string; dataMode: string; refText: string }): string {
  const base = `너는 입시 탐구활동 코치야. 학생 희망학과는 "${p.major}"야. 이전 대화를 이어가며 학생 질문에 맞게 더 깊게 가공·심화해줘. 3~5문장, 한국어. 마크다운 기호(*, # 등) 쓰지 마.`
  if (p.dataMode === 'none') {
    return `${base}\n\n참고: 우리 DB에 "${p.major}" 데이터가 없어. 사례를 지어내지 말고 일반 기준으로 조언하되 데이터 기반 아님을 밝혀.`
  }
  const label = p.dataMode === 'matched' ? '이번 질문 관련' : `${p.major} 일반`
  return `${base}\n\n[${label} 실제 세특 사례 — 근거]\n${p.refText}\n\n이 사례를 근거로 삼되 베끼지 말고 학생 상황에 맞게 새로 가공해.`
}

function extractKeyword(text: string): string | null {
  if (!text) return null
  const cleaned = text.replace(/[^가-힣a-zA-Z0-9\s]/g, ' ')
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2)
  const stop = new Set(['탐구', '분석', '연구', '활동', '대한', '통해', '위한', '실험', '내용', '주제', '추천', '한개', '하나', '진학', '희망', '지원'])
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
    max_tokens: 900,
  }
  if (json) body.response_format = { type: 'json_object' }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`OpenAI ${resp.status}: ${err}`)
  }
  const data = await resp.json()
  const text = data.choices?.[0]?.message?.content ?? ''
  return text.replace(/\*\*/g, '')
}