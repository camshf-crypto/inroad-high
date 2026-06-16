// supabase/functions/middle-basic-analyze/index.ts
// ===============================================
// 💎 중등 기본 인성질문 1차 분석
// 2가지 분석: ① 스피치 구조 충실도  ② 진로 컨셉 일치 검증
// 중등 테이블: middle_question_speech_map / middle_student_concept
// ===============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  questionId: string
  question: string
  studentAnswer: string
  studentId?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()
    const { questionId, question, studentAnswer, studentId } = body

    if (!question || !studentAnswer) {
      return new Response(
        JSON.stringify({ success: false, error: 'question, studentAnswer 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1️⃣ 스피치 구조 매핑 + 진로 컨셉 동시 조회
    const [mapRes, conceptRes] = await Promise.all([
      questionId
        ? supabase.from('middle_question_speech_map')
            .select('structure_no, speech_type, speech_structure')
            .eq('question_id', questionId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      studentId
        ? supabase.from('middle_student_concept')
            .select('type_code, type_name, major, career, keywords, custom_goal')
            .eq('student_id', studentId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const speechMap = mapRes.data
    const concept = conceptRes.data

    // 2️⃣ 스피치 구조 섹션
    const speechSection = speechMap ? `
═══════════════════════════════════════════
🎤 이 질문의 스피치 답변 구조 (반드시 이 구조로 평가)
═══════════════════════════════════════════

【스피치 유형】 ${speechMap.speech_type}
【답변 구성 순서】
${speechMap.speech_structure}
═══════════════════════════════════════════
` : `\n(이 질문의 스피치 구조 데이터 없음 — 일반 인성 답변 기준으로 분석)\n`

    // 3️⃣ 진로 컨셉 섹션
    const keywordsText = concept?.keywords
      ? (Array.isArray(concept.keywords) ? concept.keywords.join(', ') : String(concept.keywords))
      : ''

    const conceptSection = concept ? `
═══════════════════════════════════════════
🎯 학생 진로 컨셉 (진로계열검사 결과)
═══════════════════════════════════════════

【진로 유형】 ${concept.type_name || '(미정)'}${concept.type_code ? ` (${concept.type_code}형)` : ''}
【지망 계열/학과】 ${concept.major || '(미정)'}
【목표 진로】 ${concept.career || '(미정)'}
【핵심 키워드】 ${keywordsText || '(없음)'}
${concept.custom_goal ? `【세부 목표】 ${concept.custom_goal}` : ''}
═══════════════════════════════════════════
` : `\n(학생 진로 컨셉 데이터 없음)\n`

    const systemPrompt = `당신은 중학생의 고입(자사고·특목고) 면접 답변을 코칭하는 스피치 전문가입니다.
학생의 "기본 인성질문" 답변을 두 가지 관점에서 분석합니다.
${speechSection}
${conceptSection}

【⚠️ 절대 위반 금지 규칙】
1. 모든 응답은 100% 한글로만 작성 (영어 단어 절대 금지)
2. JSON 외의 다른 텍스트 절대 출력 금지
3. 점수(score)는 반드시 1~100 사이 정수 (0점 금지)
4. 중학생 눈높이에 맞춰 쉽고 따뜻하게 분석

【분석 1 — 스피치 구조 충실도】
${speechMap ? `이 질문은 "${speechMap.speech_type}" 유형이며, 정해진 답변 구성 순서가 있습니다.
학생 답변이 이 구조를 얼마나 충실히 따랐는지 분석하세요:
- 구조의 각 요소가 답변에 잘 들어있는지 확인하여 잘된 부분을 격려
- 구조에 맞게 답변을 더 좋게 보완하려면 어떻게 해야 하는지 실행 가능한 조언` : `정해진 스피치 구조 데이터가 없으므로, 일반적인 인성 면접 답변의 논리 구조(두괄식, 구체적 사례, 느낀 점/포부)를 기준으로 분석하세요.`}

【분석 2 — 진로 컨셉 일치 검증】
${concept ? `학생은 "${concept.type_name}" 유형이고, "${concept.major}" 지망, "${concept.career}" 목표입니다.
이 답변이 학생의 진로 컨셉과 얼마나 일치하는지, 진로 방향성이 답변에 잘 녹아있는지 분석하세요.` : `진로 컨셉 데이터가 없으므로 conceptCheck는 null로 작성하세요.`}`

    const userPrompt = `질문: ${question}

학생 답변:
${studentAnswer}

위 답변을 분석하고, 아래 JSON 형식으로만 응답:

{
  "structureCheck": {
    "speechType": "${speechMap ? speechMap.speech_type : '일반 인성'}",
    "score": (1~100 사이 정수, 구조 충실도 점수),
    "matchLevel": "높음" 또는 "보통" 또는 "낮음",
    "covered": ["답변에 잘 들어간 구조 요소 (한글)", "..."],
    "structureFeedback": "스피치 구조 관점에서의 종합 피드백 3~5문장 (한글)",
    "improvement": "구조에 맞게 답변을 보완하는 구체적 방법 3~5문장 (한글)"
  },
  "summary": "답변 전체에 대한 종합 평가 3~5문장 (한글)",
  "strengths": ["강점1 (한글)", "강점2 (한글)", "강점3 (한글)"],
  "improvements": ["개선점1 (한글)", "개선점2 (한글)", "개선점3 (한글)"],
  "conceptCheck": ${concept ? `{
    "isAligned": true 또는 false,
    "matchLevel": "높음" 또는 "보통" 또는 "낮음",
    "alignmentReason": "답변에서 학생의 진로 컨셉과 일치하는 부분 3~5문장 (한글)",
    "misalignment": "답변이 진로 컨셉과 어긋나거나 부족한 부분 3~5문장 (한글, 일치 시에도 보완점 작성)",
    "improvement": "진로 컨셉에 맞게 답변을 보완하는 방법 3~5문장 (한글)"
  }` : 'null'}
}

⚠️ 절대 규칙:
- 영어 단어 절대 사용 금지
- score 값은 반드시 1 이상 (0 금지)
- JSON 외 다른 텍스트 절대 금지`

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      throw new Error('OpenAI 호출 실패: ' + errText.substring(0, 300))
    }

    const aiData = await openaiRes.json()
    const content = aiData.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('OpenAI 응답이 비어있음')
    }

    let analysis
    try {
      analysis = JSON.parse(content)
    } catch (e) {
      throw new Error('JSON 파싱 실패: ' + content.substring(0, 200))
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        hasConcept: !!concept,
        hasSpeechMap: !!speechMap,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('middle-basic-analyze error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})