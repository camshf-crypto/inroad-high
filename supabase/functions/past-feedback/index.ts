// supabase/functions/ai-generate-past-feedback/index.ts
// 기출문제 1차/2차 비교 분석
// - 1차 답변 + 2차 답변 + 1차 분석 결과 + 학교별 평가 기준 입력
// - 페이지 형식에 맞춰 응답: { beforeDistribution, afterDistribution, structureComment, practiceAnswer }

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
      university,           // 대학명
      department,           // 학과명
      question,             // 기출문제
      firstAnswer,          // 학생 1차 답변
      secondAnswer,         // 학생 2차 답변
      firstAnalysisJson,    // 1차 분석 결과 (선택)
      speechStructure,      // 권장 답변 구조 (선택)
    } = await req.json()

    if (!university || !question || !firstAnswer || !secondAnswer) {
      return new Response(
        JSON.stringify({ error: 'university, question, firstAnswer, secondAnswer는 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 학교별 평가 기준 가져오기
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: criteria } = await supabase
      .from('university_evaluation_criteria')
      .select('factor_code, factor_name, factor_desc, max_score, standard_score, order_no')
      .eq('university', university)
      .eq('is_active', true)
      .or(department ? `department.eq.${department},department.is.null` : 'department.is.null')
      .order('order_no')

    const finalCriteria = (criteria && criteria.length > 0) ? criteria : [
      { factor_code: 'AC_LEARNING', factor_name: '학업 역량', factor_desc: '지식의 깊이, 학업 성취', max_score: 100, standard_score: 80, order_no: 1 },
      { factor_code: 'MJ_FIT', factor_name: '전공 적합성', factor_desc: '전공에 대한 이해와 관심', max_score: 100, standard_score: 80, order_no: 2 },
      { factor_code: 'COM_COMMUNICATE', factor_name: '의사소통 역량', factor_desc: '논리적 설명력', max_score: 100, standard_score: 80, order_no: 3 },
      { factor_code: 'PERS_GROWTH', factor_name: '성장 가능성', factor_desc: '자기 성찰과 발전 의지', max_score: 100, standard_score: 80, order_no: 4 },
    ]

    const criteriaList = finalCriteria.map((c, i) => 
      `${i + 1}. ${c.factor_name} (${c.factor_code})\n   - ${c.factor_desc || ''}`
    ).join('\n')

    // 프롬프트
    const prompt = `너는 ${university}${department ? ' ' + department : ''} 입학사정관 면접위원이자 면접 답변 구조 코치다.

학생이 1차 피드백을 받고 2차로 답변을 업그레이드했다.
1차와 2차 답변을 비교 분석하고, 평가요소 분포 변화를 보여주며,
2차 답변을 ${university}이(가) 원하는 답변 구조로 재정리한 연습 답변을 생성하라.

────────────────────────
[${university}${department ? ' ' + department : ''} 평가 기준 ${finalCriteria.length}개 항목]

${criteriaList}

────────────────────────
[질문]
${question}

[학생 1차 답변]
${firstAnswer}

[학생 2차 답변 (업그레이드)]
${secondAnswer}

${firstAnalysisJson ? `[1차 분석 결과 (참고)]
${JSON.stringify(firstAnalysisJson, null, 2)}` : ''}

[권장 답변 구조]
${speechStructure || '결론 → 근거(구체적 경험과 역할) → 의의(배운 점/성장)'}

────────────────────────
[해야 할 일 - 4가지]

1. beforeDistribution (1차 답변의 평가요소 분포)
   - 위 평가 기준 ${finalCriteria.length}개 항목 중 1차 답변에서 드러난 것들
   - factorCode, factorName, distribution(0~100, 항목간 합계 100), evidence(답변 근거 1~2문장)
   - 답변에서 드러난 항목만 포함 (0%인 항목은 제외 가능)

2. afterDistribution (2차 답변의 평가요소 분포)
   - 위 평가 기준 ${finalCriteria.length}개 항목 중 2차 답변에서 드러난 것들
   - 동일한 factorCode 사용 (1차와 비교 가능하도록)
   - factorCode, factorName, distribution(합계 100), evidence
   - 1차에 없던 항목이 2차에 추가될 수 있고, 그 반대도 가능

3. structureComment
   - 1차→2차의 구조적 변화 코멘트 (3~5문장)
   - 권장 답변 구조 기준에서 2차 답변이 어떻게 보완됐는지/여전히 부족한지
   - 평가자 관점으로 객관적으로 작성

4. practiceAnswer
   - 학생의 2차 답변을 권장 답변 구조 순서에 맞게 재정리한 연습 답변
   - 새로운 경험, 사실, 감정, 활동 추가 금지
   - 2차 원답변 표현을 최대한 보존
   - 자연스러운 면접 말하기체로 작성
   - 너무 장황하지 않게 (1~2문단)
   - 원답변에 없는 내용을 새로 만들지 말 것

────────────────────────
[규칙]
- distribution 합계는 1차/2차 각각 100
- factorCode는 위 평가 기준 목록의 코드를 사용
- evidence는 답변 원문에서 인용 (없는 내용 만들기 금지)
- "~하고 싶다", "~가 되고 싶다" 표현은 목표/지향으로만 처리
- JSON만 출력 (Markdown, 코드블록 사용 금지)

────────────────────────
[필수 출력 형식 - JSON ONLY]
{
  "beforeDistribution": [
    {
      "factorCode": "",
      "factorName": "",
      "distribution": 0,
      "evidence": ""
    }
  ],
  "afterDistribution": [
    {
      "factorCode": "",
      "factorName": "",
      "distribution": 0,
      "evidence": ""
    }
  ],
  "structureComment": "",
  "practiceAnswer": ""
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
            content: `너는 ${university} 입학사정관 면접위원이자 답변 구조 코치다. 1차/2차 답변을 비교 분석하고 연습 답변을 생성한다. JSON만 반환해.`
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

    const feedback = JSON.parse(content)

    return new Response(
      JSON.stringify({
        success: true,
        feedback,
        criteriaUsed: finalCriteria.length,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('ai-generate-past-feedback 에러:', error)
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