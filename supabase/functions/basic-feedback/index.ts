// supabase/functions/basic-feedback/index.ts
// ===============================================
// 💎 기본 인성질문 2차 비교 분석 (1차 답변 → 2차 업그레이드 답변)
// 스피치 구조 요소 기준으로 1차/2차 충족도 분포를 비교
// 응답 형식은 기출문제(past-feedback)와 동일 → BasicTab 2차 패널 그대로 사용
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
  firstAnswer: string
  secondAnswer: string
  firstAnalysisJson?: any
  studentId?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()
    const { questionId, question, firstAnswer, secondAnswer, firstAnalysisJson, studentId } = body

    if (!question || !firstAnswer || !secondAnswer) {
      return new Response(
        JSON.stringify({ success: false, error: 'question, firstAnswer, secondAnswer 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1️⃣ 스피치 구조 + 진로 컨셉 조회
    const [mapRes, conceptRes] = await Promise.all([
      questionId
        ? supabase.from('high_question_speech_map')
            .select('structure_no, speech_type, speech_structure')
            .eq('question_id', questionId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      studentId
        ? supabase.from('student_concept')
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

    const speechSection = speechMap ? `
═══════════════════════════════════════════
🎤 이 질문의 스피치 답변 구조 (평가 기준)
═══════════════════════════════════════════
【스피치 유형】 ${speechMap.speech_type}
【답변 구성 순서】
${speechMap.speech_structure}
═══════════════════════════════════════════
` : `\n(이 질문의 스피치 구조 데이터 없음 — 일반 인성 답변 구조 기준으로 비교)\n`

    const keywordsText = concept?.keywords
      ? (Array.isArray(concept.keywords) ? concept.keywords.join(', ') : String(concept.keywords))
      : ''

    const conceptSection = concept ? `
═══════════════════════════════════════════
🎯 학생 진로 컨셉 (진로계열검사 결과)
═══════════════════════════════════════════
【진로 유형】 ${concept.type_name || '(미정)'}${concept.type_code ? ` (${concept.type_code}형)` : ''}
【지망 학과】 ${concept.major || '(미정)'}
【목표 진로】 ${concept.career || '(미정)'}
【핵심 키워드】 ${keywordsText || '(없음)'}
${concept.custom_goal ? `【세부 목표】 ${concept.custom_goal}` : ''}
═══════════════════════════════════════════
` : `\n(학생 진로 컨셉 데이터 없음)\n`

    const systemPrompt = `당신은 대입 면접 답변을 코칭하는 스피치 전문가입니다.
학생의 "기본 인성질문" 1차 답변과 2차(업그레이드) 답변을 비교 분석합니다.
${speechSection}
${conceptSection}

【⚠️ 절대 위반 금지 규칙】
1. 모든 응답은 100% 한글로만 작성 (영어 단어 절대 금지, factorCode 제외)
2. JSON 외의 다른 텍스트 절대 출력 금지
3. distribution(분포)은 0~100 사이 정수, 각 배열의 distribution 합은 100

【분석 방법】
${speechMap
  ? `이 질문의 스피치 구조("${speechMap.speech_type}")를 구성하는 핵심 요소들을 3~5개로 나누고,
1차 답변과 2차 답변이 각 요소를 얼마나 충족했는지 "분포(%)"로 표현하세요.
- 분포는 "그 답변에서 각 구조 요소가 차지하는 충실도 비중"입니다.
- 2차 답변에서 보완된 요소는 분포가 올라가고, 여전히 약한 요소는 낮게 유지됩니다.`
  : `일반 인성 답변의 핵심 요소(두괄식 핵심, 구체적 사례, 느낀점/성찰, 진로 연결)를 기준으로
1차와 2차 답변의 충족 분포(%)를 비교하세요.`}

【factorCode 규칙】
- factorCode는 영문 약어 (예: "CLAIM", "EXAMPLE", "INSIGHT", "CAREER")
- factorName은 한글 (예: "핵심 주장", "구체적 사례", "성찰", "진로 연결")
- before와 after의 factorCode/factorName은 반드시 동일하게 1:1 대응`

    const userPrompt = `질문: ${question}

[1차 답변]
${firstAnswer}

[2차 업그레이드 답변]
${secondAnswer}

${firstAnalysisJson ? `[1차 분석 참고]\n${JSON.stringify(firstAnalysisJson).substring(0, 1500)}\n` : ''}

위 1차/2차 답변을 스피치 구조 기준으로 비교하고, 아래 JSON 형식으로만 응답:

{
  "beforeDistribution": [
    { "factorCode": "CLAIM", "factorName": "핵심 주장 (한글)", "distribution": (0~100 정수), "evidence": "1차 답변 근거 (한글)" }
  ],
  "afterDistribution": [
    { "factorCode": "CLAIM", "factorName": "핵심 주장 (한글)", "distribution": (0~100 정수), "evidence": "2차 답변에서 어떻게 보완됐는지 (한글)" }
  ],
  "structureComment": "1차 대비 2차 답변이 스피치 구조 면에서 무엇이 좋아졌고 무엇이 여전히 부족한지 종합 코멘트 4~6문장 (한글)",
  "practiceAnswer": "이 질문의 스피치 구조와 학생 진로 컨셉을 완벽히 반영한 모범 연습 답변 (한글, 실제로 학생이 말하듯 자연스럽게)"
}

⚠️ 절대 규칙:
- before와 after의 factorCode는 동일하게 1:1 대응
- 각 배열의 distribution 합은 100
- 영어 단어 금지 (factorCode 약어만 예외)
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

    let feedback
    try {
      feedback = JSON.parse(content)
    } catch (e) {
      throw new Error('JSON 파싱 실패: ' + content.substring(0, 200))
    }

    return new Response(
      JSON.stringify({
        success: true,
        feedback,
        hasConcept: !!concept,
        hasSpeechMap: !!speechMap,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('basic-feedback error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})