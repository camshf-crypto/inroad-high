// supabase/functions/ocr-document/index.ts
// Google Document AI를 사용한 OCR Edge Function
// PDF 경로를 받아서 Edge Function 안에서 직접 다운로드
// imagelessMode 사용 → 30페이지까지 처리 가능

import { GoogleAuth } from "npm:google-auth-library@9"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1️⃣ Google Cloud 인증 정보
    const projectId = Deno.env.get('GOOGLE_PROJECT_ID')
    const clientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL')
    const privateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n')
    const processorId = Deno.env.get('GOOGLE_PROCESSOR_ID')
    const location = Deno.env.get('GOOGLE_LOCATION') || 'us'

    if (!projectId || !clientEmail || !privateKey || !processorId) {
      return new Response(
        JSON.stringify({ error: 'Google 환경변수가 설정되지 않았습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2️⃣ Supabase 인증 정보 (PDF 다운로드용)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // 3️⃣ 요청 본문 - PDF 경로 또는 base64 둘 다 지원 (호환성)
    const body = await req.json()
    const { pdfPath, fileBase64, mimeType } = body

    let base64Content: string
    let actualMimeType = mimeType || 'application/pdf'

    if (pdfPath) {
      // ⭐ Edge Function이 직접 PDF 다운로드 (큰 파일 OK)
      console.log('PDF 직접 다운로드:', pdfPath)
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const { data: pdfBlob, error: downloadError } = await supabase.storage
        .from('saenggibu-pdfs')
        .download(pdfPath)

      if (downloadError || !pdfBlob) {
        return new Response(
          JSON.stringify({ 
            error: 'PDF 다운로드 실패', 
            details: downloadError?.message || '파일을 찾을 수 없음' 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // base64 변환
      const arrayBuffer = await pdfBlob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      const chunkSize = 8192
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
        binary += String.fromCharCode.apply(null, Array.from(chunk))
      }
      base64Content = btoa(binary)
      
      console.log(`PDF 다운로드 완료: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`)
    } else if (fileBase64) {
      // 기존 방식: 직접 base64 받기 (작은 파일용 호환성)
      base64Content = fileBase64
    } else {
      return new Response(
        JSON.stringify({ error: 'pdfPath 또는 fileBase64가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4️⃣ Google OAuth2 토큰 발급
    console.log('Google 인증 중...')
    const auth = new GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })

    const client = await auth.getClient()
    const accessTokenResponse = await client.getAccessToken()
    const accessToken = accessTokenResponse.token

    if (!accessToken) {
      throw new Error('Google 액세스 토큰 발급 실패')
    }

    // 5️⃣ Document AI API 호출 (imagelessMode = 30페이지까지 OK)
    console.log('Document AI 호출 중... (imageless mode)')
    const url = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawDocument: {
          content: base64Content,
          mimeType: actualMimeType,
        },
        imagelessMode: true,  // ⭐ 30페이지까지 처리 가능 (텍스트만 추출)
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Document AI 에러:', errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Document AI 호출 실패', 
          details: errorText.substring(0, 500),
          status: response.status,
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()

    // 6️⃣ 결과 반환
    const extractedText = data.document?.text || ''
    const pages = data.document?.pages?.length || 0

    console.log(`OCR 완료: ${pages}페이지, ${extractedText.length}자`)

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        pages: pages,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge Function 에러:', error)
    return new Response(
      JSON.stringify({ 
        error: 'OCR 처리 실패',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})