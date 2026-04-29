// supabase/functions/ai-analyze-answer/index.ts
// 학생 답변 분석 - round 1 (첫 답변) / round 2 (업그레이드 답변) 분기

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
      question, 
      studentAnswer, 
      majorDept, 
      sourceText,
      round,                  // 1 또는 2
      // round 2일 때만 필요
      firstAnswer,            // 학생 첫 답변
      firstFeedback,          // 선생님 1차 피드백
    } = await req.json()

    if (!question || !studentAnswer) {
      return new Response(
        JSON.stringify({ error: 'question과 studentAnswer가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let prompt = ''

    if (round === 2) {
      // ==================== Round 2: 업그레이드 답변 분석 ====================
      prompt = `너는 한국 대학 입시 면접관 출신 전문 컨설턴트야.
학생이 1차 피드백을 받고 답변을 업그레이드 했어. 그 변화를 분석해.

[중요한 분석 관점 - Round 2]
이건 첫 답변이 아니라 **업그레이드된 답변**이야.
다음 관점으로 분석해야 해:
1. 1차 피드백을 잘 반영했는가?
2. 첫 답변 대비 무엇이 개선되었는가?
3. 여전히 부족한 부분이 있는가?
4. 면접까지 마지막으로 보강해야 할 부분은?

[학생 정보]
- 지원학과: ${majorDept || '미정'}

[질문]
${question}

${sourceText ? `[활동 원문 - 생기부에서 발췌]\n${sourceText}\n` : ''}

[학생 첫 답변]
${firstAnswer || '(첫 답변 정보 없음)'}

[선생님 1차 피드백]
${firstFeedback || '(피드백 정보 없음)'}

[학생 업그레이드 답변]
${studentAnswer}

[5가지 차원 평가 - 첫 답변과 비교 관점]

1. 구체성 변화
   - 첫 답변보다 디테일이 늘었나? 수치/사례가 추가됐나?
   - 여전히 추상적인 부분이 있나?

2. 진정성 변화
   - 본인의 감정/사고가 더 구체적으로 드러났나?
   - 1차 피드백에서 지적한 진정성 의심 부분이 해소됐나?

3. 주도성 변화
   - "내가 했다"가 더 명확해졌나?
   - 본인 역할 구분이 선명해졌나?

4. 학과 연관성 변화
   - 지원학과와의 연결이 더 자연스러워졌나?
   - 의식적이 아니라 자연스러운 연결인가?

5. 성장성 변화
   - "Before & After"가 더 잘 드러나나?
   - 의미있는 깨달음이 추가됐나?

[분석 작성 규칙]
- 첫 답변 대비 개선된 점 2~4개 (구체적으로 어떻게 변했는지)
- 여전히 보완 필요한 부분 2~4개 (1차 피드백 미반영 또는 새로 발견된 부분)
- 면접까지 마지막 조언 2~4개 (실행 가능한 것)
- 진정성 의심 포인트 1~2개 (남아있는 의심 가능성)
- 전반적 평가 (1~2문장 - 얼마나 개선됐는지)

JSON으로만 응답:
{
  "strengths": ["개선된 점 1", "개선된 점 2", ...],
  "weaknesses": ["여전히 부족한 점 1", "여전히 부족한 점 2", ...],
  "improvements": ["면접 전 마지막 조언 1", "조언 2", ...],
  "authenticity_concerns": ["남아있는 의심 포인트 1", ...],
  "summary": "첫 답변 대비 얼마나 개선됐는지 한 문장"
}`

    } else {
      // ==================== Round 1: 첫 답변 분석 (기존) ====================
      prompt = `너는 한국 대학 입시 면접관 출신 전문 컨설턴트야.

[중요한 면접 평가 철학]
면접의 본질은 "생기부 활동을 진짜 본인이 했는가?" 검증이야.
면접관은 학생이 그저 옆에서 본 게 아니라, 직접 주도적으로 활동했고
그 과정에서 진짜 자기만의 사고/감정/성장이 있었는지를 본다.

진짜 본인이 했다면 다음이 자연스럽게 나온다:
1. 구체적 디테일 (수치, 과정, 어려움, 시도한 방법)
2. 본인만의 감정/사고 (왜 그랬는지, 어떻게 느꼈는지)
3. 본인 역할의 명확한 구분 (팀이 한 것 vs 내가 한 것)
4. 그 경험을 학과/진로와 자연스럽게 연결
5. 그 경험으로 어떻게 변화/성장했는지

[학생 정보]
- 지원학과: ${majorDept || '미정'}

[질문]
${question}

${sourceText ? `[활동 원문 - 생기부에서 발췌]\n${sourceText}\n` : ''}

[학생 답변]
${studentAnswer}

[5가지 차원 평가]

1. 구체성 (Specificity)
   - 수치, 사례, 디테일이 있는가?
   - 추상적/일반적이지 않은가?
   - 면접관이 "그건 누구나 할 수 있는 말 아닌가?"라고 의심할 여지가 있는가?

2. 진정성 (Authenticity)
   - "왜 했는지", "그때 무엇을 느꼈는지"가 본인의 것인가?
   - 교과서/모범답안 같은 형식적 답변은 아닌가?
   - 학생만의 고유한 관점/감정이 보이는가?

3. 주도성 (Initiative)
   - "내가 했다"가 명확한가? "우리가 했다"에 머물러있지 않은가?
   - 본인이 어떤 결정/행동을 했는지 구체적인가?
   - 단순 참여가 아닌 주도적 역할이 보이는가?

4. 학과 연관성 (Major Relevance)
   - ${majorDept || '학과'} 진로와 자연스럽게 연결되는가?
   - 억지로 끼워맞춘 듯한 느낌은 아닌가?
   - 활동에서 얻은 것이 학과 공부에 어떻게 도움될지 보이는가?

5. 성장성 (Growth)
   - 그 경험으로 학생이 어떻게 변화했는지 보이는가?
   - "Before & After"가 드러나는가?
   - 단순 활동 나열이 아니라 의미있는 깨달음/성장이 있는가?

[분석 작성 규칙]
- 답변의 객관적 장점 2~4개 (구체적으로)
- 보완할 점 2~4개 (어떤 차원이 부족한지 명확히)
- 개선 방향 2~4개 (구체적이고 실행 가능)
- 진정성 의심 포인트 1~2개 (면접관이 의심할 만한 부분)
- 전반적 평가 (1~2문장 요약)

JSON으로만 응답:
{
  "strengths": ["장점1", "장점2", ...],
  "weaknesses": ["보완할점1", "보완할점2", ...],
  "improvements": ["개선방향1", "개선방향2", ...],
  "authenticity_concerns": ["의심포인트1", ...],
  "summary": "전반적 평가 한 문장"
}`
    }

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
            content: round === 2 
              ? '너는 한국 대학 입시 면접관 출신 컨설턴트야. 학생이 1차 피드백 후 업그레이드한 답변을 첫 답변과 비교 분석해. JSON만 반환해.' 
              : '너는 한국 대학 입시 면접관 출신 컨설턴트야. 답변이 진짜 본인 경험인지 검증하는 관점으로 분석해. JSON만 반환해.'
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
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

    const analysis = JSON.parse(content)

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        round: round || 1,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge Function 에러:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'AI 분석 실패',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})