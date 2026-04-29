// supabase/functions/ai-analyze-past-answer/index.ts
// 기출문제 1차 답변 분석
// - universities + university_factors 새 테이블 구조 사용
// - 학교 메타(면접관 관점, 평가톤 등) + 평가 항목(3~8개) 함께 활용

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
      university,        // 대학명 (예: 서울대학교)
      department,        // 학과명 (선택)
      question,
      studentAnswer,
    } = await req.json()

    if (!university || !question || !studentAnswer) {
      return new Response(
        JSON.stringify({ error: 'university, question, studentAnswer는 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. 학교 메타 + 평가 항목 가져오기 (JOIN)
    const { data: univData } = await supabase
      .from('universities')
      .select(`
        id,
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

    // 학교 정보 + 평가 항목 정리
    const universityMeta = univData ? {
      interviewer_perspective: univData.interviewer_perspective,
      question_features: univData.question_features,
      high_score_structure: univData.high_score_structure,
      emotion_type: univData.emotion_type,
      evaluation_tone: univData.evaluation_tone,
    } : null

    // 평가 항목을 정렬된 형태로 (3~8개)
    let factors: Array<{
      code: string
      name: string
      desc: string
      max: number
      standard: number
    }> = []

    if (univData?.university_factors) {
      const sorted = [...univData.university_factors].sort((a: any, b: any) => a.order_no - b.order_no)
      factors = sorted.map((f: any) => ({
        code: f.factor_code,
        name: f.evaluation_factors?.factor_name || f.factor_code,
        desc: f.evaluation_factors?.factor_desc || '',
        max: f.max_score,
        standard: f.standard_score,
      }))
    }

    // 평가 항목 없으면 기본값
    if (factors.length === 0) {
      factors = [
        { code: 'PERSONALITY', name: '인성', desc: '인성과 가치관', max: 100, standard: 80 },
        { code: 'MAJOR_FIT', name: '전공적합성', desc: '전공에 대한 이해와 관심', max: 100, standard: 80 },
        { code: 'ACADEMIC', name: '학업역량', desc: '학업수행능력, 탐구력', max: 100, standard: 80 },
        { code: 'COMMUNICATION', name: '의사소통역량', desc: '논리적 설명력', max: 100, standard: 80 },
      ]
    }

    // 평가 항목 문자열
    const factorsList = factors.map((f, i) => 
      `${i + 1}. ${f.name} (${f.code}, 만점 ${f.max}점, 합격 기준 ${f.standard}점)\n   - ${f.desc}`
    ).join('\n')

    // 학교 메타 문자열 (있을 때만)
    const metaSection = universityMeta ? `
────────────────────────
[${university} 면접 평가 자료]

■ 면접관 핵심 관점
${universityMeta.interviewer_perspective || '(자료 없음)'}

■ 질문 출제 특징
${universityMeta.question_features || '(자료 없음)'}

■ 고득점 답변 구성
${universityMeta.high_score_structure || '(자료 없음)'}

■ 감정 유형
${universityMeta.emotion_type || '(자료 없음)'}

■ 평가톤
${universityMeta.evaluation_tone || '(자료 없음)'}
` : ''

    // 프롬프트
    const prompt = `너는 ${university}${department ? ' ' + department : ''} 입학사정관 면접위원이다.
학생의 면접 답변을 ${university}의 평가 기준에 맞춰 분석하라.
${metaSection}
────────────────────────
[${university}의 평가 항목 ${factors.length}개]

${factorsList}

────────────────────────
[질문]
${question}

[학생 답변]
${studentAnswer}

────────────────────────
[해야 할 일 - 6가지]

1. evalCriteria
   - ${university}의 면접 평가 기준 요약 (2~3문장)
   - 위에 제공된 면접관 관점, 출제 특징을 반영

2. scores
   - 위 ${factors.length}개 평가 항목 각각에 대해:
     * label: 평가 항목명 (factor_name 그대로)
     * score: 학생 답변에서 드러난 점수 (0~max)
     * max: 만점
     * desc: 그 점수를 매긴 이유 (1~2문장)

3. summary
   - 종합 평가 (3~5문장)
   - 합격 가능성, 전반적 인상, 핵심 메시지

4. strengths
   - 학생 답변의 강점 2~4개 (구체적으로)

5. improvements
   - 보완할 점 2~4개 (실행 가능하게)

6. tailSuggestions
   - 학생이 사유해볼 만한 추가 질문 3~5개

────────────────────────
[규칙]
- 점수는 답변에 실제로 드러난 내용 근거로만 산정 (추측 금지)
- "~하고 싶다", "~가 되고 싶다"는 목표/지향으로만 처리
- desc는 답변 원문 표현을 인용/요약 (없는 내용 만들기 금지)
- ${university}의 평가톤(${universityMeta?.evaluation_tone || '객관적'})을 유지
- JSON만 출력 (Markdown, 코드블록 사용 금지)

────────────────────────
[필수 출력 형식 - JSON ONLY]
{
  "evalCriteria": "",
  "scores": [
    {
      "label": "",
      "score": 0,
      "max": 100,
      "desc": ""
    }
  ],
  "summary": "",
  "strengths": [""],
  "improvements": [""],
  "tailSuggestions": [""]
}`

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
            content: `너는 ${university} 입학사정관 면접위원이다. 학생 답변을 평가 기준에 맞춰 분석한다. JSON만 반환해.`
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
        factorsUsed: factors.length,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('ai-analyze-past-answer 에러:', error)
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