// supabase/functions/ai-suggest-teacher-feedback/index.ts
// 선생님 말투로 피드백 초안 생성
// - 1차 피드백 (first): 첫 답변에 대한 피드백
// - 2차 피드백 (final): 업그레이드 답변에 대한 최종 피드백

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

    const {
      university,
      department,
      question,
      studentAnswer,        // 1차 답변 (first일 때 핵심)
      secondAnswer,         // 2차 답변 (final일 때 사용)
      aiAnalysis,           // AI 분석 결과 (있으면 활용)
      feedbackType,         // 'first' | 'final'
    } = await req.json()

    if (!university || !question || !studentAnswer) {
      return new Response(
        JSON.stringify({ error: 'university, question, studentAnswer는 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isFinal = feedbackType === 'final'
    if (isFinal && !secondAnswer) {
      return new Response(
        JSON.stringify({ error: 'final 피드백에는 secondAnswer가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 학교 메타 가져오기 (있으면 톤에 반영)
    let universityMeta: any = null
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data } = await supabase
        .from('universities')
        .select('interviewer_perspective, evaluation_tone')
        .eq('name', university)
        .maybeSingle()
      universityMeta = data
    }

    // AI 분석 요약 (있으면)
    const analysisSummary = aiAnalysis ? `
[AI 분석 결과 (참고)]
- 평가 요약: ${aiAnalysis.summary || ''}
- 강점: ${(aiAnalysis.strengths || []).join(', ')}
- 개선 포인트: ${(aiAnalysis.improvements || []).join(', ')}
` : ''

    let prompt = ''

    if (isFinal) {
      // ===== 2차 (최종) 피드백 =====
      prompt = `너는 ${university}${department ? ' ' + department : ''} 입시 컨설팅 전문가다.
학생의 1차 답변과 2차 업그레이드 답변을 보고, 선생님이 학생에게 전달할 **최종 피드백 초안**을 작성하라.

[톤]
- 전문적이고 객관적
- 입시 전문가 관점
- 격식 있는 존댓말
- 감정 표현 최소화, 구체적 분석 위주
- "~합니다", "~입니다" 어조

${universityMeta?.evaluation_tone ? `[${university} 평가톤]\n${universityMeta.evaluation_tone}` : ''}

[질문]
${question}

[학생 1차 답변]
${studentAnswer}

[학생 2차 (업그레이드) 답변]
${secondAnswer}
${analysisSummary}

[작성 규칙]
- 1차 → 2차의 개선된 부분을 구체적으로 짚어주기
- 면접 자리에서 보완해야 할 마지막 포인트 1~2개 짚어주기
- 길이: 4~7문장
- 학생을 격려하면서도 객관적인 평가
- 줄바꿈으로 가독성 확보

[출력 - JSON]
{
  "feedback": ""
}`
    } else {
      // ===== 1차 피드백 =====
      prompt = `너는 ${university}${department ? ' ' + department : ''} 입시 컨설팅 전문가다.
학생의 첫 답변을 보고, 선생님이 학생에게 전달할 **1차 피드백 초안**을 작성하라.

[톤]
- 전문적이고 객관적
- 입시 전문가 관점
- 격식 있는 존댓말
- 감정 표현 최소화, 구체적 분석 위주
- "~합니다", "~입니다" 어조

${universityMeta?.evaluation_tone ? `[${university} 평가톤]\n${universityMeta.evaluation_tone}` : ''}

[질문]
${question}

[학생 첫 답변]
${studentAnswer}
${analysisSummary}

[작성 규칙]
- 답변의 잘한 점 1~2개 구체적으로 (단순 칭찬 금지)
- 보완할 점 2~3개 구체적으로 (어떻게 개선할지 방향 제시)
- 면접 평가자 관점에서 무엇이 부족한지 짚어주기
- 학생이 2차 답변에서 보완할 수 있도록 명확한 가이드 제공
- 길이: 5~8문장
- 줄바꿈으로 가독성 확보

[출력 - JSON]
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
          {
            role: 'system',
            content: '너는 대학 입시 컨설팅 전문가다. 전문적이고 객관적인 톤으로 면접 답변에 대한 피드백 초안을 작성한다. JSON만 반환해.'
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
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
    const feedbackText = result.feedback || ''

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
    console.error('ai-suggest-teacher-feedback 에러:', error)
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