// supabase/functions/ai-generate-major-questions/index.ts
// 학생 생기부 + 학과 정보 → 전공 지식 기반 맞춤 문제 생성
// 6챕터 × (객관식 4 + 주관식 1) = 30문제

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY가 설정되지 않았습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase 환경변수가 없습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const {
      saenggibuId,           // high_major_saenggibu.id
      saenggibu_pdf_url,     // PDF 경로
      majorName,             // 학과명 (예: "간호학과")
    } = await req.json()

    if (!saenggibuId || !saenggibu_pdf_url || !majorName) {
      return new Response(
        JSON.stringify({ error: 'saenggibuId, saenggibu_pdf_url, majorName 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. status를 'generating'으로
    await supabase
      .from('high_major_saenggibu')
      .update({ 
        status: 'generating',
        updated_at: new Date().toISOString(),
      })
      .eq('id', saenggibuId)

    // 2. OCR로 생기부 텍스트 추출
    const { data: ocrData, error: ocrError } = await supabase.functions.invoke(
      'ocr-document',
      { body: { pdfPath: saenggibu_pdf_url } }
    )

    if (ocrError || !ocrData?.success || !ocrData?.text) {
      await supabase
        .from('high_major_saenggibu')
        .update({ 
          status: 'error',
          error_message: 'OCR 실패: ' + (ocrError?.message || '결과 없음'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', saenggibuId)
      
      return new Response(
        JSON.stringify({ error: 'OCR 실패', details: ocrError?.message || '결과 없음' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const saenggibuText = ocrData.text as string

    // 3. AI 프롬프트 — 전공 지식 기반 문제 생성 (3단계 통합)
    const prompt = `너는 ${majorName}의 전공 지식을 평가하는 입학사정관 면접 출제 전문가다.

학생의 생활기록부를 바탕으로, 학생이 관심 있는 활동/주제를 분석하고
${majorName}의 핵심 전공 지식을 묻는 면접 문제 30개를 생성하라.

────────────────────────
[학생 생기부]
${saenggibuText.substring(0, 12000)}

────────────────────────
[해야 할 일 - 단계별]

**1단계: 학생 활동 분석 (내부 처리, 출력 X)**
- 생기부에서 ${majorName}와 관련된 활동/세특/탐구주제 추출
- 학생의 관심 분야와 강점 파악

**2단계: 전공 지식 영역 선정 (내부 처리, 출력 X)**
- ${majorName}의 핵심 전공 지식 6개 영역 선정
- 학생 활동과 연결되는 영역 우선
- 6개 영역 = 6개 챕터

**3단계: 문제 생성 (출력)**
- 챕터당 객관식 4개 + 주관식 1개 = 5문제
- 총 6챕터 × 5문제 = 30문제

────────────────────────
[챕터 영역 예시 - ${majorName}]

학과별 주요 영역 (참고):
- 간호학과: 기초간호, 인체생리, 약리학, 간호윤리, 임상간호, 보건의료
- 경영학과: 경영원리, 마케팅, 회계, 재무관리, 인적자원, 전략경영
- 컴퓨터공학과: 자료구조, 알고리즘, 프로그래밍, 운영체제, 네트워크, AI/ML
- 의학과: 해부학, 생리학, 병리학, 진단학, 윤리, 임상의학
- 법학과: 헌법, 민법, 형법, 행정법, 상법, 법철학
- 심리학과: 발달심리, 인지심리, 사회심리, 임상심리, 통계, 신경과학
- 그 외 학과: 해당 학과의 핵심 6개 영역으로 자유롭게 구성

────────────────────────
[문제 작성 규칙]

**객관식**
- 5지선다 (A, B, C, D, E)
- ${majorName} 학부 1~2학년 수준 전공 지식
- 정답 1개 명확
- 오답도 그럴듯하게 (학부 신입생 헷갈릴 만한)
- 해설은 정답 이유 + 핵심 개념 설명 (2~4문장)

**주관식**
- ${majorName} 면접에서 실제 나올만한 전공 사고력 질문
- 단순 암기 X, 응용/비교/분석 위주
- 학생 활동과 연결될 수 있게
- 답변 형태가 자유롭게 가능한 개방형 질문

────────────────────────
[필수 출력 형식 - JSON ONLY, 마크다운 X]

{
  "chapters": [
    {
      "chapter_no": 1,
      "title": "챕터 제목 (예: 기초간호)",
      "objective": [
        {
          "question_text": "문제 텍스트",
          "choice_a": "선택지 A",
          "choice_b": "선택지 B",
          "choice_c": "선택지 C",
          "choice_d": "선택지 D",
          "choice_e": "선택지 E",
          "correct_answer": "B",
          "explanation": "정답 해설 (2~4문장)"
        }
      ],
      "subjective": {
        "question_text": "주관식 질문 텍스트"
      }
    }
  ]
}

[규칙]
- chapters 배열에 정확히 6개
- 각 chapter의 objective 배열에 정확히 4개
- subjective는 단일 객체
- correct_answer는 "A"|"B"|"C"|"D"|"E" 중 하나만
- choice_a~e는 모두 채울 것
- JSON만 출력 (다른 설명 X, 마크다운 X)`

    // 4. OpenAI 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `너는 ${majorName} 전공 지식 면접 출제 전문가다. JSON만 반환해.` 
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 8000,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      
      await supabase
        .from('high_major_saenggibu')
        .update({ 
          status: 'error',
          error_message: 'AI 호출 실패: ' + errText.substring(0, 200),
          updated_at: new Date().toISOString(),
        })
        .eq('id', saenggibuId)
      
      return new Response(
        JSON.stringify({
          error: 'OpenAI 호출 실패',
          details: errText.substring(0, 500),
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      await supabase
        .from('high_major_saenggibu')
        .update({ 
          status: 'error',
          error_message: 'AI 응답 없음',
          updated_at: new Date().toISOString(),
        })
        .eq('id', saenggibuId)
      
      return new Response(
        JSON.stringify({ error: 'AI 응답 없음' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const parsed = JSON.parse(content)
    const chapters = parsed.chapters

    // 5. 검증
    if (!Array.isArray(chapters) || chapters.length !== 6) {
      await supabase
        .from('high_major_saenggibu')
        .update({ 
          status: 'error',
          error_message: `챕터 6개 아님 (생성: ${chapters?.length || 0}개)`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', saenggibuId)
      
      return new Response(
        JSON.stringify({ error: '챕터 6개 검증 실패', chapters_count: chapters?.length }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. DB 저장 (성공)
    const { error: updateError } = await supabase
      .from('high_major_saenggibu')
      .update({
        ai_chapters: chapters,
        ai_generated_at: new Date().toISOString(),
        ai_model: 'gpt-4o',
        status: 'ready',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', saenggibuId)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'DB 저장 실패', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        chapters_count: chapters.length,
        total_questions: chapters.length * 5,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('ai-generate-major-questions 에러:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'AI 전공질문 생성 실패',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})