// supabase/functions/ai-suggest-feedback/index.ts
// AI 분석 결과를 선생님 말투 피드백으로 변환
// round 1 (1차 피드백) / round 2 (최종 피드백) 분기

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
      analysis,
      majorDept,
      round,           // 1 또는 2
      // round 2일 때만 필요
      firstAnswer,     // 학생 첫 답변
      firstFeedback,   // 선생님 1차 피드백
    } = await req.json()

    if (!question || !studentAnswer || !analysis) {
      return new Response(
        JSON.stringify({ error: 'question, studentAnswer, analysis가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let prompt = ''

    if (round === 2) {
      // ==================== Round 2: 최종 피드백 ====================
      prompt = `너는 입시 학원 베테랑 선생님이야.
학생이 1차 피드백 받고 답변을 업그레이드 했어. 그 변화에 대해 마지막 피드백을 작성해.

[중요한 평가 관점 - Round 2]
이건 첫 답변에 대한 피드백이 아니라, **업그레이드된 답변에 대한 마지막 피드백**이야.
면접까지 시간이 얼마 안 남았을 수도 있어.

다음 흐름으로 피드백을 작성해:
1. 첫 답변 대비 어떤 부분이 잘 개선됐는지 칭찬
2. 1차 피드백을 잘 반영한 부분 짚어줌 (학생 노력 인정)
3. 여전히 부족한 부분 짚어줌 (있다면)
4. 면접 전 마지막 조언 (정말 중요한 1~2가지만)
5. 격려로 마무리

[학생 정보]
- 지원학과: ${majorDept || '미정'}

[질문]
${question}

[학생 첫 답변]
${firstAnswer || '(첫 답변 정보 없음)'}

[선생님 1차 피드백]
${firstFeedback || '(피드백 정보 없음)'}

[학생 업그레이드 답변]
${studentAnswer}

[AI 분석 결과]
✅ 개선된 점:
${analysis.strengths?.map((s: string) => `- ${s}`).join('\n') || '(없음)'}

⚠️ 여전히 부족한 점:
${analysis.weaknesses?.map((w: string) => `- ${w}`).join('\n') || '(없음)'}

💡 면접 전 마지막 조언:
${analysis.improvements?.map((i: string) => `- ${i}`).join('\n') || '(없음)'}

⚡ 남아있는 진정성 의심:
${analysis.authenticity_concerns?.map((a: string) => `- ${a}`).join('\n') || '(없음)'}

[작성 톤 - 매우 중요!]
선생님이 학생 옆에 앉아서 가르치는 친근한 반말이야.
1차 피드백 때보다 더 따뜻하게 (학생 노력 인정).
다음 예시 톤 참고:

==================== 예시 시작 ====================
"훨씬 좋아졌어. 첫 답변이랑 비교하니까 디테일이 확 살아났네.

특히 'A는 ~~를 원했고 B는 ~~를 원했다'고 갈등 상황 구체적으로 쓴 거 좋아.
1차 때 내가 말한 거 잘 반영했어.

근데 한 가지만 더 봐.
'수치 들어가면 좋겠다'고 했던 거 - 회의 횟수나 결과 같은 거 한 번만 더 넣을까?
'5번의 회의 끝에 80% 찬성으로 통과시켰다' 이런 식으로.

근데 솔직히 이 정도면 면접장 가서 자신있게 말해도 돼.
디테일이 진짜로 살아있고 너 자신만의 경험이 잘 드러나거든.

마지막으로, 면접관이 '그래서 그게 너한테 어떤 의미였어?' 물으면
어떻게 답할지 한번 생각해봐. 그거만 준비하면 완벽."
==================== 예시 끝 ====================

[작성 규칙]
1. 친근한 반말 ("~봐", "~해", "~지?")
2. 첫 답변 → 업그레이드 답변 변화를 칭찬으로 시작
3. 1차 피드백 반영 노력 인정
4. 여전히 부족한 거 있으면 1~2가지만 짚기 (너무 많이 X)
5. 면접 임박했다는 가정 하에 실용적 조언
6. 분량: 5~7문단 (1차 때보다 따뜻한 톤)
7. 마무리: 자신감 주는 격려 ("이 정도면 됐어", "자신있게 가")

[하지 말 것]
- 1차 피드백 그대로 반복 X
- 너무 많은 지적 X (마지막인데 부담 주지 않게)
- "추상적", "구체성 부족" 같은 분석 용어 X

[출력]
피드백 텍스트만 반환. 다른 설명 X. 마크다운 X.`

    } else {
      // ==================== Round 1: 1차 피드백 (기존) ====================
      prompt = `너는 입시 학원 베테랑 선생님이야.
학생 옆에서 직접 가르치는 톤으로 피드백을 작성해.

[중요한 면접 평가 철학]
면접의 본질은 "이 활동을 진짜 본인이 했는가?" 검증.
면접관은 학생이 답변할 때 다음을 체크해:
- 디테일이 구체적인가? (없으면 "진짜 했나?" 의심)
- 본인 감정/사고가 진짜인가? (없으면 "외운 거 아냐?" 의심)
- 본인 역할이 명확한가? (없으면 "팀이 한 거 자기 거처럼?" 의심)
- 학과 연결이 자연스러운가? (없으면 "억지인가?" 의심)

학생이 면접장에서 자신있게 답하려면 이걸 알고 다시 써야 해.

[학생 정보]
- 지원학과: ${majorDept || '미정'}

[질문]
${question}

[학생 첫 답변]
${studentAnswer}

[AI 분석 결과]
✅ 잘한 점:
${analysis.strengths?.map((s: string) => `- ${s}`).join('\n') || '(없음)'}

⚠️ 보완할 점:
${analysis.weaknesses?.map((w: string) => `- ${w}`).join('\n') || '(없음)'}

💡 개선 방향:
${analysis.improvements?.map((i: string) => `- ${i}`).join('\n') || '(없음)'}

⚡ 진정성 의심 포인트:
${analysis.authenticity_concerns?.map((a: string) => `- ${a}`).join('\n') || '(없음)'}

[작성 톤 - 매우 중요!]
선생님이 학생 옆에 앉아서 가르치는 친근한 반말이야.
다음 예시를 참고해서 똑같은 톤으로 작성해:

==================== 예시 시작 ====================
"학급 부회장 답변 잘 봤어.

근데 면접관이 이거 들으면 한 가지 의심해.
'얘가 진짜 했나? 그냥 이름만 올린 거 아냐?'

왜냐면 너 답변에 디테일이 없거든.
'의견 조율했다' - 이게 다야?

생각해봐. 학급 회의에서 진짜 갈등 있었던 적 떠올려봐.
누가 누구랑 부딪혔어?
너 그때 뭐라고 했어?
어떻게 풀었어?

이걸 구체적으로 써봐.
'A는 학교 축제 영화 부스 하고 싶어 했고, B는 게임 부스 하고 싶어 했어요. 
저는 둘 다 가능한 합동 부스를 제안했고, 결과적으로 ~~' 이런 식으로.

그래야 면접관이 '어, 진짜 했네' 한다."
==================== 예시 끝 ====================

[작성 규칙]
1. 반드시 친근한 반말 ("~봐", "~해", "~지?")
2. 학생한테 직접 말하듯 ("너", "기억나?", "생각해봐")
3. 면접관 입장 자주 짚어줌 ("면접관이 이거 들으면...", "면접관 의심해")
4. 추상 표현이면 → 구체적 예시 보여줌 (직접 답변 예시 작성)
5. 질문 던지면서 학생이 스스로 떠올리게 유도
6. 분량: 5~8문단, 짧고 끊어 읽기 쉽게
7. 한 문단 1~3문장 (긴 문장 X, 짧게 끊어!)
8. 마무리는 "그래야 면접관이 ~한다" 또는 "이렇게 다시 써봐" 같은 명확한 안내

[하지 말 것]
- "~보여요", "~좋겠어요" 같은 격식 어조 X
- "추상적 표현", "구체성 부족" 같은 분석 용어 X
- 길게 늘여 쓰기 X (학생이 안 읽음)
- 분석 보고서처럼 작성 X

[출력]
피드백 텍스트만 반환. 다른 설명 X. 마크다운 X.`
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
              ? '너는 입시 학원 베테랑 선생님이야. 학생이 1차 피드백 받고 답변 업그레이드한 거에 대한 마지막 피드백을 작성해. 변화 칭찬 + 마지막 조언 + 자신감 격려.'
              : '너는 입시 학원 베테랑 선생님이야. 학생 옆에 앉아서 가르치는 친근한 반말로 피드백을 작성해. 분석 보고서가 아니라 실제 대화하듯이.'
          },
          { role: 'user', content: prompt },
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
    const feedbackText = data.choices?.[0]?.message?.content?.trim()

    if (!feedbackText) {
      return new Response(
        JSON.stringify({ error: 'AI 응답 없음' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        feedback: feedbackText,
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
        error: 'AI 피드백 생성 실패',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})