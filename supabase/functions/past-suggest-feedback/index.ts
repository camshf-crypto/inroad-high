// supabase/functions/past-suggest-feedback/index.ts
// ===============================================
// 🎓 1차/2차 피드백 작성 (학생용 통합 가이드)
// ===============================================
// 입력: university, department, question, studentAnswer, secondAnswer, aiAnalysis, feedbackType
// 처리: universities + university_factors 조회 → 학교 정보 + AI 분석 통합
// 출력: { success, feedback }
//
// 1차 피드백 (4단락):
//   📋 학교 평가 기준 안내
//   📊 답변 점수 + 분석 (강점/개선점)
//   💭 사유하는 질문 (학생이 생각하며 답변 업그레이드)
//   ✨ 격려 마무리
//
// 2차 피드백 (3단락 — 응원 빼고 실용적):
//   🎯 1차 → 2차 변화 분석
//   📊 최종 점수 + 학교 적합도
//   💎 진짜 면접에서 빛날 포인트

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

    if (!apiKey || !supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: '환경변수 누락' }),
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
      feedbackType, // 'first' | 'final'
    } = await req.json()

    if (!university || !question || !studentAnswer) {
      return new Response(
        JSON.stringify({ error: 'university, question, studentAnswer 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // ============================================
    // 1️⃣ 학교 메타 + 평가 항목 조회
    // ============================================
    const { data: univData } = await supabase
      .from('universities')
      .select(`
        name,
        interviewer_perspective,
        question_features,
        high_score_structure,
        emotion_type,
        evaluation_tone,
        university_factors (
          factor_code,
          max_score,
          standard_score,
          order_no,
          evaluation_factors (
            factor_name,
            factor_desc
          )
        )
      `)
      .eq('name', university)
      .eq('is_active', true)
      .maybeSingle()

    const interviewer = univData?.interviewer_perspective || ''
    const questionStyle = univData?.question_features || ''
    const highScoreStructure = univData?.high_score_structure || ''
    const evaluationTone = univData?.evaluation_tone || ''

    let factors: Array<{ name: string; max: number }> = []
    if (univData?.university_factors) {
      const sorted = [...univData.university_factors].sort((a: any, b: any) => a.order_no - b.order_no)
      factors = sorted.map((f: any) => ({
        name: f.evaluation_factors?.factor_name || f.factor_code,
        max: f.max_score,
      }))
    }

    // ============================================
    // 2️⃣ AI 분석 결과 정리
    // ============================================
    const scores = aiAnalysis?.scores || []
    const strengths = aiAnalysis?.strengths || []
    const improvements = aiAnalysis?.improvements || []
    const tailSuggestions = aiAnalysis?.tailSuggestions || []
    const summary = aiAnalysis?.summary || ''

    const scoresText = scores
      .map((s: any) => `${s.label} ${s.score}/${s.max}점`)
      .join(', ')

    const factorsText = factors
      .map(f => `${f.name}(${f.max}점)`)
      .join(' / ')

    // ============================================
    // 3️⃣ 프롬프트 구성
    // ============================================
    const isFirst = feedbackType === 'first' || feedbackType !== 'final'

    const systemPrompt = `너는 ${university} 입시 전문 선생님이다.
학생에게 ${isFirst ? '1차' : '최종'} 피드백을 작성한다.
친근하고 따뜻한 말투(~야, ~해보자, ~네)를 유지하며,
학생이 스스로 사유하고 성장하도록 가이드해야 한다.

[중요 원칙]
- 답을 직접 알려주지 말고, 학생이 스스로 생각하도록 질문 던지기
- 구체적인 답변 내용을 인용하며 분석 (추측 금지)
- 학생이 다음 답변을 어떻게 발전시킬지 명확하게 보여주기
- 한국어, 자연스럽고 따뜻하게`

    // ─────────────────────────────────────────────
    // 1차 피드백 (4단락 — 학교기준 + 점수분석 + 사유질문 + 격려)
    // ─────────────────────────────────────────────
    const firstPrompt = `
[학생 정보]
- 학교: ${university}
- 학과: ${department || '미지정'}

[기출 질문]
${question}

[학생의 1차 답변]
${studentAnswer}

[${university} 평가 정보]
- 면접관 핵심 관점: ${interviewer || '(자료 없음)'}
- 질문 출제 특징: ${questionStyle || '(자료 없음)'}
- 고득점 답변 구성: ${highScoreStructure || '(자료 없음)'}
- 평가톤: ${evaluationTone || '(자료 없음)'}

[평가 항목 가중치]
${factorsText || '(가중치 정보 없음)'}

[AI 분석 결과]
- 점수: ${scoresText}
- 강점: ${strengths.join(' / ')}
- 개선점: ${improvements.join(' / ')}
- 종합: ${summary}
- 사유 질문(참고): ${tailSuggestions.join(' / ')}

────────────────────────
[작성 형식 — 다음 4단락을 자연스럽게 이어서 써줘]

📋 1단락: ${university} 평가 기준 안내
- "${university}는 ${factorsText} 이렇게 보는 학교야"
- 면접관 관점/출제 특징을 학생이 이해하기 쉽게 풀어 설명
- 2~3문장

📊 2단락: 답변 점수 + 분석
- "이번 답변은 ${scoresText}으로 나왔어"
- 강점 1~2개 (구체적인 답변 부분 인용)
- 개선점 1~2개 (구체적으로)
- 3~4문장

💭 3단락: 사유하는 질문 (가장 중요!)
- "이 질문들에 대해 깊이 생각해보고 답변을 업그레이드해줘:"
- 위 [사유 질문] 참고해서 학생 답변과 ${university} 평가 기준에 맞게 3~5개
- 학생이 자기 생각을 확장하도록 유도하는 질문
- 단순 정보 묻기 X, 사고를 깊게 만드는 질문 O
- 번호 매겨서 (1. 2. 3.)

✨ 4단락: 격려 마무리
- 1~2문장
- 학생의 노력 인정 + 다음 답변 기대

[규칙]
- 4단락을 명확하게 구분 (이모지 헤더 사용)
- 친근한 선생님 말투 ("~야", "~해보자", "~네")
- 학생 답변에서 실제로 쓴 표현을 인용하면서 피드백
- ${university}만의 평가 특성을 반드시 반영
- JSON 형식 X — 자연스러운 텍스트로
- 길이: 600~900자

────────────────────────
[출력]
바로 학생에게 보낼 피드백 텍스트만 출력 (다른 설명 X)
`

    // ─────────────────────────────────────────────
    // 2차 피드백 (3단락 — 응원 빼고 실용적)
    // ─────────────────────────────────────────────
    const finalPrompt = `
[학생 정보]
- 학교: ${university}
- 학과: ${department || '미지정'}

[기출 질문]
${question}

[학생 1차 답변]
${studentAnswer}

[학생 2차(업그레이드) 답변]
${secondAnswer || '(없음)'}

[${university} 평가 정보]
- 면접관 관점: ${interviewer || '(자료 없음)'}
- 출제 특징: ${questionStyle || '(자료 없음)'}
- 고득점 구성: ${highScoreStructure || '(자료 없음)'}
- 평가톤: ${evaluationTone || '(자료 없음)'}

[평가 항목 가중치]
${factorsText || '(가중치 정보 없음)'}

[AI 분석 결과]
- 점수: ${scoresText}
- 강점: ${strengths.join(' / ')}
- 개선점: ${improvements.join(' / ')}

────────────────────────
[작성 형식 — 3단락 (응원 단락 없음, 실용적으로)]

🎯 1단락: 1차 → 2차 변화 분석
- 학생이 어떻게 발전했는지 (구체적으로)
- 1차에서 약했던 부분이 2차에서 얼마나 보완됐는지
- 1차/2차 답변 둘 다 인용하면서 비교
- 3~4문장

📊 2단락: 최종 점수 + ${university} 적합도
- "최종 점수는 ${scoresText}"
- ${university} 평가 기준 대비 어떤 위치인지
- 면접관 관점에서 봤을 때 어떻게 평가될지
- 3~4문장

💎 3단락: 진짜 면접에서 빛날 포인트
- 학생만의 강점 (구체적인 답변 부분 인용)
- 어떻게 면접관에게 어필할지 1~2가지 실용 팁
- 면접에서 활용할 수 있는 구체적인 행동 가이드
- 3~5문장

[규칙]
- 응원이나 격려 단락 없음 (실용적이고 분석적인 톤)
- 친근한 선생님 말투는 유지하되 더 진지하고 담담하게
- 1차/2차 답변에서 실제로 쓴 표현을 인용하면서 비교
- ${university}만의 평가 특성을 반드시 반영
- JSON 형식 X — 자연스러운 텍스트로
- 길이: 500~800자

────────────────────────
[출력]
바로 학생에게 보낼 텍스트만 출력 (다른 설명 X)
`

    const userPrompt = isFirst ? firstPrompt : finalPrompt

    // ============================================
    // 4️⃣ OpenAI 호출
    // ============================================
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
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
    const feedback = data.choices?.[0]?.message?.content?.trim()

    if (!feedback) {
      return new Response(
        JSON.stringify({ error: 'AI 응답 없음' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        feedback,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('past-suggest-feedback 에러:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'AI 피드백 생성 실패',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})