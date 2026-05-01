// supabase/functions/ai-generate-mock-tail/index.ts
//
// 모의고사 전용 꼬리질문 생성기 (1개만, 실전 면접관 톤)
// - 학생이 본 질문에 답변한 직후 호출
// - GPT-4o가 답변을 분석해서 "딱 한 개"의 꼬리질문 생성
// - 답변 시간 1.5분에 맞는 난이도/길이로 작성
//
// POST body:
//   {
//     mainQuestion: string       // 본 질문 (필수)
//     studentAnswer: string      // 학생 답변 (필수)
//     questionType?: string      // 인성 / 전공 / 생기부 / 기출 등
//     targetUniversity?: string  // 목표 대학
//     targetDepartment?: string  // 목표 학과
//   }
//
// 응답:
//   { tail: string }   // 꼬리질문 1개

import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  mainQuestion: string
  studentAnswer: string
  questionType?: string
  targetUniversity?: string
  targetDepartment?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as RequestBody
    const {
      mainQuestion,
      studentAnswer,
      questionType,
      targetUniversity,
      targetDepartment,
    } = body

    if (!mainQuestion || !studentAnswer) {
      return new Response(
        JSON.stringify({
          error: 'mainQuestion과 studentAnswer는 필수입니다.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY가 설정되지 않았습니다.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ── 학생 답변이 너무 짧을 때 (무성의 답변 → 일반 압박 질문) ──
    const trimmedAnswer = studentAnswer.trim()
    const isVeryShort = trimmedAnswer.length < 15

    // ── 컨텍스트 블록 ──
    const ctxLines: string[] = []
    if (targetUniversity) ctxLines.push(`목표 대학: ${targetUniversity}`)
    if (targetDepartment) ctxLines.push(`목표 학과: ${targetDepartment}`)
    if (questionType) ctxLines.push(`질문 유형: ${questionType}`)
    const contextBlock =
      ctxLines.length > 0 ? `\n[학생 정보]\n${ctxLines.join('\n')}\n` : ''

    // ── 시스템 프롬프트 ──
    const systemPrompt = `당신은 한국 대학 입학사정관 모의면접의 면접관입니다.
학생이 본 질문에 답한 직후, 그 답변을 더 깊이 파고드는 꼬리질문을 1개만 만듭니다.

[꼬리질문 작성 규칙]
1. 출력은 정확히 1개의 질문만. 번호, 머리말, 따옴표, 설명 일절 금지.
2. 한 문장, 30~60자, 정중한 존댓말.
3. 학생 답변에서 "구체적으로 등장한 키워드/사건/사람/책/활동"을 짚어 들어가세요.
   - 학생이 "독서 동아리에서 활동했다" → "그 동아리에서 본인이 직접 제안한 활동이 있다면 무엇인가요?"
   - 학생이 "리더십을 배웠다" → 추상적이므로 → "그 리더십이 가장 잘 드러난 구체적인 순간을 말씀해 주시겠어요?"
4. "왜 그렇게 생각하세요?", "어떤 점이 좋았나요?" 같은 평범한 질문은 금지.
5. 학생 답변이 모호하거나 일반론이면 "구체적인 사례를 한 가지 들어주세요" 류로 압박하세요.
6. 답변 자체를 평가하거나 칭찬하지 마세요. 면접관은 다음 질문만 던집니다.
7. 목표 학과가 주어지면, 답변 내용을 학과 적합성과 연결해서 파고드는 질문도 좋습니다.`

    // ── 유저 프롬프트 ──
    const userPrompt = isVeryShort
      ? `${contextBlock}
[본 질문]
${mainQuestion}

[학생 답변]
"${trimmedAnswer}"

학생의 답변이 매우 짧거나 부실합니다. 면접관 입장에서 답변을 보충하도록 요구하는 꼬리질문 1개를 만드세요. (예: "조금 더 구체적으로 말씀해 주시겠어요?" 같은 단순한 형태가 아니라, 본 질문의 핵심을 짚어 다시 묻는 형태로)
꼬리질문 1개만 출력. 다른 텍스트 금지.`
      : `${contextBlock}
[본 질문]
${mainQuestion}

[학생 답변]
${trimmedAnswer}

위 답변을 분석해서, 학생이 답변에서 언급한 구체적 내용 중 하나를 골라 더 깊이 파고드는 꼬리질문 1개를 만드세요.
꼬리질문 1개만 출력. 다른 텍스트 금지.`

    // ── OpenAI 호출 ──
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('OpenAI error:', errText)
      return new Response(
        JSON.stringify({ error: 'OpenAI 호출 실패', detail: errText }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const json = await openaiRes.json()
    let tail = (json.choices?.[0]?.message?.content ?? '').trim()

    // ── 후처리: 따옴표/번호/줄바꿈 제거, 줄이 여러 개면 첫 줄만 ──
    tail = tail
      .split('\n')
      .map((s: string) => s.trim())
      .filter(Boolean)[0] ?? ''
    tail = tail.replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '')
    tail = tail.replace(/^\s*\d+[.\)]\s*/, '') // "1. " 같은 번호 제거
    tail = tail.replace(/^[-•·]\s*/, '') // "- " 같은 불릿 제거

    if (!tail) {
      tail = '방금 말씀하신 내용 중 가장 핵심이 되는 부분을 한 가지만 더 자세히 설명해 주시겠어요?'
    }

    return new Response(JSON.stringify({ tail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('ai-generate-mock-tail error:', e)
    return new Response(
      JSON.stringify({ error: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})