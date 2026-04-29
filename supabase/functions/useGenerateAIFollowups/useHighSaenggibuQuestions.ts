// supabase/functions/ai-generate-followups/index.ts
// 학생 최종 답변 기반으로 꼬리질문 AI 생성
// 면접관이 답변 듣고 파고들 만한 질문들

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
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY가 설정되지 않았습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { 
      question,        // 원래 질문
      finalAnswer,     // 학생 최종 답변 (업그레이드된 답변)
      finalFeedback,   // 선생님 최종 피드백 (있으면)
      majorDept,       // 지원학과
      sourceText,      // 활동 원문 (있으면)
    } = await req.json()

    if (!question || !finalAnswer) {
      return new Response(
        JSON.stringify({ error: 'question과 finalAnswer가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = `너는 한국 대학 입시 면접관 출신 베테랑 컨설턴트야.
학생의 최종 답변을 듣고 면접관이 추가로 파고들 만한 꼬리질문을 만들어.

[중요한 면접 평가 철학]
면접의 본질은 "진짜 본인이 했는가" + "본인 사고가 진짜인가" 검증.
좋은 꼬리질문은 학생 답변에서 다음을 파고들어:

1. 구체적 디테일 요구
   - "방금 말한 ~을 더 자세히 설명해줄래요?"
   - "그때 정확히 어떤 일이 있었나요?"

2. 본인 사고 확인
   - "그 결정의 근거는 무엇이었나요?"
   - "왜 그렇게 생각했나요?"

3. 가정/대안 시나리오
   - "만약 다시 한다면 어떻게 하시겠어요?"
   - "다른 방법을 시도하지 않은 이유는?"

4. 학과 연결 심화
   - "이 경험이 ${majorDept || '학과'}와 어떻게 연결되나요?"
   - "${majorDept || '학과'}에서 이 경험을 어떻게 활용할 건가요?"

5. 한계/실패 인정
   - "이 활동에서 실패하거나 어려웠던 점은?"
   - "어떤 부분을 더 잘했어야 했다고 생각하나요?"

[학생 정보]
- 지원학과: ${majorDept || '미정'}

[원래 질문]
${question}

${sourceText ? `[활동 원문 - 생기부]\n${sourceText}\n` : ''}

[학생 최종 답변]
${finalAnswer}

${finalFeedback ? `[선생님 최종 피드백]\n${finalFeedback}\n` : ''}

[꼬리질문 생성 규칙]
1. 1개 생성
2. 학생 답변에서 **모호하거나 더 파고들 만한 부분** 찾기
3. 면접관이 진짜 던질 만한 자연스러운 질문
4. 학생을 곤란하게 만드는 게 아니라 **진정성 검증**이 목표
5. 답변 가능하지만 답변하려면 진짜 경험이 필요한 질문
6. ${majorDept ? `지원학과(${majorDept})와 연결된 질문 1개 이상 포함` : ''}
7. 정중한 존댓말 ("~할 수 있나요?", "~인가요?")

[하지 말 것]
- 너무 일반적인 질문 ("어려웠던 점은?")
- 학생이 답변에서 이미 명확히 말한 부분 다시 묻기
- 답변 불가능한 추상적 질문

JSON으로만 응답:
{
  "followups": [
    "꼬리질문 1",
    ...
  ]
}`

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
            content: '너는 한국 대학 입시 면접관 출신 컨설턴트야. 학생 답변에서 진정성을 검증하고 파고드는 꼬리질문을 만들어. JSON만 반환해.' 
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
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
      return new Response(
        JSON.stringify({ error: 'AI 응답 없음' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const parsed = JSON.parse(content)
    const followups = parsed.followups || []

    if (!Array.isArray(followups) || followups.length === 0) {
      return new Response(
        JSON.stringify({ error: '꼬리질문이 생성되지 않았어요' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        followups,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge Function 에러:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: '꼬리질문 생성 실패',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})