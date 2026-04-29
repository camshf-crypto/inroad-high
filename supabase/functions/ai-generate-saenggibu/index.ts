// supabase/functions/ai-generate-saenggibu/index.ts
// 탐구주제/독서/수행평가 정보를 받아 세특 문장 생성

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

    const body = await req.json()
    const {
      mode,         // 'activity' | 'cell'
      activityType, // 'topic' | 'book' (mode='activity'일 때)
      // activity 모드 데이터
      subject,      // 과목명
      topic,        // 탐구주제 (또는 책 제목)
      content,      // 탐구 내용 (또는 독서 이유)
      author,       // 책 저자 (book일 때)
      // cell 모드 데이터
      category,     // '세특' | '자율' | '동아리' | '진로'
      cellSubject,  // 세특일 때 과목명
      majorDept,    // 지원학과
    } = body

    let prompt = ''
    let systemPrompt = '너는 한국 고등학교 생기부 작성 전문 컨설턴트야. 교사가 작성하는 세특 양식의 문장을 자연스럽게 작성해줘.'

    if (mode === 'activity') {
      // 활동 기반 생성 (가운데 패널)
      if (activityType === 'topic') {
        prompt = `다음 탐구주제 정보를 보고 생기부 세특 양식의 문장을 작성해줘.

[과목] ${subject || '미정'}
[탐구주제] ${topic}
[탐구 내용] ${content || '(상세 내용 없음)'}
${majorDept ? `[지원학과] ${majorDept}` : ''}

[작성 규칙]
1. 실제 한국 고등학교 생기부 세특 양식 (교사가 작성하듯)
2. "~함", "~보임" 등의 격식 어조
3. 학생의 능동적 탐구/학습 태도 강조
4. 구체적 활동 내용 + 역량 도출
5. 분량: 250~400자 (1~2문장)
6. 학과 연관성 자연스럽게 포함 (있을 때만)
7. 추상적 표현 X, 구체적 표현 O

[출력]
세특 문장만 반환. 다른 설명 X. 마크다운 X. 
예시: "○○ 교과 탐구활동에서 '~~'을 주제로 심화 탐구를 진행함. ~~ 과정에서 ~~한 역량을 보임."`
      } else {
        // book
        prompt = `다음 독서 정보를 보고 생기부 세특 양식의 문장을 작성해줘.

[과목] ${subject || '미정'}
[책 제목] ${topic}
[저자] ${author || '미상'}
[선정 이유 / 느낀 점] ${content || '(상세 내용 없음)'}
${majorDept ? `[지원학과] ${majorDept}` : ''}

[작성 규칙]
1. 실제 한국 고등학교 생기부 세특 양식 (교사가 작성하듯)
2. "~함", "~보임" 등의 격식 어조
3. 학생의 능동적 독서/사고 태도 강조
4. 책에서 얻은 통찰 + 본인의 사고 발전
5. 분량: 250~400자 (1~2문장)
6. 학과 연관성 자연스럽게 포함 (있을 때만)
7. 추상적 표현 X, 구체적 표현 O

[출력]
세특 문장만 반환. 다른 설명 X. 마크다운 X.
예시: "'책제목'(저자, 출판연도)을 정독하며 ~~한 통찰을 얻고, ~~한 사고를 발전시킴."`
      }
    } else if (mode === 'cell') {
      // 셀별 직접 생성 (✨ AI 버튼)
      const categoryLabels: Record<string, string> = {
        '세특': '교과학습발달상황 세부능력 및 특기사항',
        '자율': '자율활동',
        '동아리': '동아리활동',
        '진로': '진로활동',
      }
      const label = categoryLabels[category] || category

      if (category === '세특' && cellSubject) {
        prompt = `다음 정보로 생기부 ${label} 양식의 문장을 작성해줘.

[과목] ${cellSubject}
${majorDept ? `[지원학과] ${majorDept}` : ''}

[작성 규칙]
1. 실제 한국 고등학교 생기부 세특 양식
2. ${cellSubject} 과목 학습 태도 + 역량 강조
3. "~함", "~보임" 등의 격식 어조
4. 자기주도 학습, 탐구 의지, 협력 학습 등 종합적 평가
5. 분량: 200~350자
6. 일반적이지만 자연스러운 평가 (구체 활동 모르므로)

[출력]
세특 문장만 반환. 다른 설명 X.`
      } else {
        // 창체 (자율/동아리/진로)
        prompt = `다음 정보로 생기부 ${label} 양식의 문장을 작성해줘.

[활동 영역] ${label}
${majorDept ? `[지원학과] ${majorDept}` : ''}

[작성 규칙]
1. 실제 한국 고등학교 생기부 ${label} 양식
2. 능동적 참여 + 협력 + 리더십/문제해결력
3. "~함", "~보임" 등의 격식 어조
4. 분량: 200~350자
5. ${category === '진로' && majorDept ? `${majorDept} 진로 탐색 의지 자연스럽게 포함` : '일반적이지만 자연스러운 평가'}

[출력]
${label} 특기사항 문장만 반환. 다른 설명 X.`
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'mode는 activity 또는 cell이어야 해요' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
          { role: 'system', content: systemPrompt },
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
    const generatedText = data.choices?.[0]?.message?.content?.trim()

    if (!generatedText) {
      return new Response(
        JSON.stringify({ error: 'AI 응답 없음' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        text: generatedText,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge Function 에러:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'AI 생기부 생성 실패',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})