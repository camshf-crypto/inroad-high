// supabase/functions/middle-stt-short/index.ts
// ──────────────────────────────────────────────────────────────
// 단문 STT (CSR) - Naver CLOVA Speech Recognition
//
// 용도: 1분 이내 음성을 빠르게 텍스트로 변환
// 사용처:
//   - 면접 시뮬레이션 (useMySimulation.ts)
//   - 자소서 예상질문 (MiddleExpect.tsx)
//   - 기출문제 (MiddlePast.tsx)
//   - 제시문 면접 (MiddlePresentation.tsx)
//
// ⚠️ 숙제 페이지는 middle-homework-stt-start (장문) 그대로 사용
// ──────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CSR_API = 'https://naveropenapi.apigw.ntruss.com/recog/v1/stt?lang=Kor'

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clientId     = Deno.env.get('CLOVA_CSR_CLIENT_ID')
    const clientSecret = Deno.env.get('CLOVA_CSR_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'CSR credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 요청 본문 파싱 ─────────────────────────────────────
    // 방식 1: multipart/form-data (audio file)
    // 방식 2: JSON { audioBase64: "..." }
    const contentType = req.headers.get('content-type') || ''

    let audioBuffer: ArrayBuffer

    if (contentType.includes('multipart/form-data')) {
      // FormData로 파일 전송된 경우
      const formData = await req.formData()
      const file = formData.get('audio') as File | null
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'audio file is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      audioBuffer = await file.arrayBuffer()
    } else if (contentType.includes('application/json')) {
      // JSON으로 base64 전송된 경우
      const body = await req.json()
      const { audioBase64 } = body
      if (!audioBase64) {
        return new Response(
          JSON.stringify({ error: 'audioBase64 is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // base64 → ArrayBuffer
      const binary = atob(audioBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      audioBuffer = bytes.buffer
    } else {
      // raw binary로 전송된 경우
      audioBuffer = await req.arrayBuffer()
    }

    // ── 크기 체크 (CSR은 1분 이내 권장) ─────────────────────
    const sizeMB = audioBuffer.byteLength / 1024 / 1024
    if (sizeMB > 10) {
      return new Response(
        JSON.stringify({
          error: 'audio too large',
          message: '1분 이내 음성만 지원돼요. 짧게 말씀해주세요.',
          sizeMB: sizeMB.toFixed(2),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Naver CSR API 호출 ────────────────────────────────
    const csrResponse = await fetch(CSR_API, {
      method: 'POST',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY':    clientSecret,
        'Content-Type':           'application/octet-stream',
      },
      body: audioBuffer,
    })

    if (!csrResponse.ok) {
      const errorText = await csrResponse.text()
      console.error('CSR API error:', csrResponse.status, errorText)
      return new Response(
        JSON.stringify({
          error: 'CSR API failed',
          status: csrResponse.status,
          details: errorText,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await csrResponse.json()
    // CSR 응답: { text: "..." }
    const text = result.text ?? ''

    return new Response(
      JSON.stringify({ text, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('STT error:', error)
    return new Response(
      JSON.stringify({
        error: 'internal error',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})