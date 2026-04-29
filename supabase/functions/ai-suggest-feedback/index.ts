// supabase/functions/past-suggest-feedback/index.ts
// 학원 코치 친근한 반말로 피드백 작성
// - AI 분석 결과를 그대로 받아서 친근한 코치 말투로 변환

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 친근한 반말 강제 - System 메시지에 박음
const SYSTEM_PROMPT = `너는 입시 학원에서 학생을 1:1로 코칭하는 친근한 선생님이다.
학생에게 항상 **반말**로 친근하게 코칭한다.

[절대 금지]
- "지원자께서는", "~합니다", "~입니다", "~십시오", "~하시기 바랍니다" 같은 격식 존댓말 절대 사용 금지
- "학생님", "수험생님" 같은 표현 금지
- 면접관 보고서 같은 객관적/딱딱한 어조 금지

[반드시 사용]
- "~했어", "~봐", "~잖아", "~거든", "~지", "~네"
- "너 ~~ 했지?", "너의 답변에서"
- 학생 이름이 아니라 "너"로 호칭

[톤 예시 - 정확히 이 분위기를 따라할 것]
"답변 잘 봤어. 근데 이거 들으면 면접관이 '진짜 너가 했던 건가?' 의심할 수도 있어.
너 ~~ 했다고 했지? 그럼 ~~ 떠올려봐.
예를 들어, '~~~' 이런 식으로 말해봐.
이렇게 다시 써봐."

JSON으로만 응답한다.`

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
      university,
      department,
      question,
      studentAnswer,
      secondAnswer,
      aiAnalysis,
      feedbackType,
    } = await req.json()

    if (!university || !question || !studentAnswer) {
      return new Response(
        JSON.stringify({ error: 'university, question, studentAnswer는 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isFinal = feedbackType === 'final'

    // ⚠️ 학교 메타 (evaluation_tone 등) 일부러 안 가져옴 — 반말 톤 깨질 수 있어서

    // AI 분석 결과 정리
    const analysisSummary = aiAnalysis ? `
[AI 분석 결과 - 이 내용을 친근한 반말로 풀어쓰기]

종합 평가:
${aiAnalysis.summary || '(없음)'}

강점:
${(aiAnalysis.strengths || []).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

개선 포인트 (이 부분이 핵심 - 코치 말투로 풀어쓰기):
${(aiAnalysis.improvements || []).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

사유 질문:
${(aiAnalysis.tailSuggestions || []).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}
` : '(분석 결과 없음 - 학생 답변을 직접 보고 친근하게 피드백 작성)'

    let userPrompt = ''

    if (isFinal) {
      // ===== 2차 (최종) 피드백 =====
      userPrompt = `학생의 1차 답변과 업그레이드된 2차 답변을 보고, 면접 전 마지막 코칭을 작성해.

[참고 톤 - 정확히 이 말투로]
"지속 가능한 경영 답변 잘 봤어. 근데 이거 들으면 면접관이 '진짜 너가 했던 건가?' 의심할 수도 있어. 왜냐면 구체적인 활동이나 너의 역할이 안 보이거든.

너 동아리 활동에서 지속 가능 경영 배웠다 했지? 그럼 그 활동에서 뭐 했는지 떠올려봐. 예를 들어, '친환경 제품 개발 프로젝트에서 나는 자료 조사와 발표를 맡았어요.' 이런 식으로.

이렇게 하면 면접관이 '어, 진짜 했네' 하고 느낄 거야. 이렇게 다시 써봐."

[질문]
${question}

[학생 1차 답변]
${studentAnswer}

[학생 2차 (업그레이드) 답변]
${secondAnswer}
${analysisSummary}

[작성 규칙]
- 1차 → 2차에서 개선된 점 인정 ("이번에는 ~~ 좋아졌어")
- 그래도 면접 전에 마지막으로 보완할 1~2가지 짚어주기
- 구체적인 예시 답변 1~2개 인용 형식으로 ('~~~' 이런 식으로)
- 마지막에 행동 지시 ("이렇게 다시 정리해봐")
- 6~10문장, 한 문단씩 줄바꿈

[출력 - JSON만, 다른 텍스트 금지]
{
  "feedback": ""
}`
    } else {
      // ===== 1차 피드백 =====
      userPrompt = `학생의 첫 답변을 보고 친근한 코치 말투로 피드백을 작성해.

[참고 톤 - 정확히 이 말투로]
"지속 가능한 경영 답변 잘 봤어. 근데 이거 들으면 면접관이 '진짜 너가 했던 건가?' 의심할 수도 있어. 왜냐면 구체적인 활동이나 너의 역할이 안 보이거든.

너 동아리 활동에서 지속 가능 경영 배웠다 했지? 그럼 그 활동에서 뭐 했는지 떠올려봐. 어떤 프로젝트를 했고, 너는 그 안에서 무슨 역할을 맡았어? 예를 들어, '친환경 제품 개발 프로젝트에서 나는 자료 조사와 발표를 맡았어요. 시장에서 어떤 제품이 가장 수요가 높은지 분석했고, 이를 바탕으로 팀에게 새로운 아이디어를 제안했어요.' 이런 식으로.

또, 그 경험이 너한테 어떤 깨달음을 줬는지 말해봐. 이걸 통해 '와, 이런 게 중요하구나' 느꼈던 순간이 있었을 거야. 그걸 솔직하게 적어보는 거야.

그리고 이 경험이 경영학과와 어떻게 연결되는지 설명해야 해. '이 프로젝트를 통해 경영에서 지속 가능성이 얼마나 중요한지 깨달았고, 이런 걸 더 깊이 배우고 싶어서 경영학과에 지원하게 됐습니다' 이런 식으로.

이렇게 하면 면접관이 '어, 진짜 했네. 깊이 생각했네' 하고 느낄 거야. 이렇게 다시 써봐."

[질문]
${question}

[학생 첫 답변]
${studentAnswer}
${analysisSummary}

[작성 규칙]
1. 첫 문장: "~~ 답변 잘 봤어. 근데 ~~" 같은 도입
2. 면접관 입장 시뮬레이션 1~2번 ("면접관이 '...' 의심할 수도 있어")
3. 학생 답변 키워드 인용 ("너 ~~ 했다고 했지?")
4. 구체적인 예시 답변 1~2개 따옴표로 인용 ('~~~' 이런 식으로)
5. 마지막 문단은 행동 지시로 마무리 ("이렇게 다시 써봐")
6. 6~10문장, 한 문단씩 줄바꿈으로 구분

[금지]
- "~합니다", "~입니다" 같은 격식 존댓말 절대 금지
- "지원자께서는" 같은 표현 금지
- 객관적 평가 보고서 같은 톤 금지

[출력 - JSON만, 다른 텍스트 금지]
{
  "feedback": ""
}`
    }

    // OpenAI 호출
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
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,  // 자연스러운 말투
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

    const result = JSON.parse(content)
    let feedbackText = result.feedback || ''

    // ⚠️ 마지막 안전장치: 존댓말 감지하면 다시 호출
    const hasFormal = /합니다|입니다|십시오|하시기|하세요|지원자께서|학생님|수험생님|되었습니다|있습니다|하셨습니다/.test(feedbackText)
    
    if (hasFormal) {
      console.log('존댓말 감지 - 반말로 재시도')
      const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: '너는 친근한 학원 선생님이다. 무조건 반말로만 코칭한다. JSON만 반환.' },
            {
              role: 'user',
              content: `다음 피드백 텍스트를 의미는 그대로, 친근한 반말로 변환해. "~합니다", "~입니다"를 "~해", "~야"로. 예시 톤: "답변 잘 봤어. 근데 ~~ 거든. 너 ~~ 했지? 이런 식으로 ~~ 해봐."

원본 텍스트:
${feedbackText}

[출력 JSON]
{ "feedback": "" }`
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.5,
        }),
      })
      
      if (retryResponse.ok) {
        const retryData = await retryResponse.json()
        const retryContent = retryData.choices?.[0]?.message?.content
        if (retryContent) {
          const retryResult = JSON.parse(retryContent)
          feedbackText = retryResult.feedback || feedbackText
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        feedback: feedbackText,
        feedbackType,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('past-suggest-feedback 에러:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'AI 피드백 초안 생성 실패',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})