// supabase/functions/middle-basic-suggest-feedback/index.ts
// ===============================================
// 💎 중등 기본 인성질문 - 선생님 말투 피드백 초안 생성
// 스피치 구조 + 진로 컨셉 분석 결과를 바탕으로 따뜻한 코치 피드백 작성
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
  secondAnswer?: string
  aiAnalysis?: any
  feedbackType: 'first' | 'final'
  studentId?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()
    const { questionId, question, studentAnswer, secondAnswer, aiAnalysis, feedbackType, studentId } = body

    if (!question || !studentAnswer) {
      return new Response(
        JSON.stringify({ success: false, error: 'question, studentAnswer 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const [mapRes, conceptRes] = await Promise.all([
      questionId
        ? supabase.from('middle_question_speech_map')
            .select('speech_type, speech_structure')
            .eq('question_id', questionId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      studentId
        ? supabase.from('middle_student_concept')
            .select('type_name, major, career, keywords')
            .eq('student_id', studentId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const speechMap = mapRes.data
    const concept = conceptRes.data

    const speechType = speechMap?.speech_type || '일반 인성'
    const speechStructure = speechMap?.speech_structure || '두괄식 핵심 + 구체적 사례 + 느낀 점/포부'

    const conceptLine = concept
      ? `학생의 진로 컨셉: "${concept.type_name || ''}" 유형 · "${concept.major || ''}" 지망 · "${concept.career || ''}" 목표`
      : '학생 진로 컨셉 정보 없음'

    const sc = aiAnalysis?.structureCheck
    const cc = aiAnalysis?.conceptCheck
    const analysisDigest = `
[스피치 구조 분석]
- 충실도: ${sc?.matchLevel || '?'} (${sc?.score ?? '?'}점)
- 잘 들어간 요소: ${(sc?.covered || []).join(', ') || '없음'}
- 빠진 요소: ${(sc?.missing || []).join(', ') || '없음'}
- 보완 방법: ${sc?.improvement || ''}

[진로 컨셉 검증]
- 일치도: ${cc?.matchLevel || '정보 없음'}
- 어긋난 부분: ${cc?.misalignment || ''}
- 보완 방법: ${cc?.improvement || ''}

[종합 요약] ${aiAnalysis?.summary || ''}
[강점] ${(aiAnalysis?.strengths || []).join(', ')}
[개선점] ${(aiAnalysis?.improvements || []).join(', ')}
`.trim()

    const isFinal = feedbackType === 'final'

    const systemPrompt = `당신은 중학생을 따뜻하게 지도하는 고입(자사고·특목고) 면접 스피치 코치 선생님입니다.
학생의 "기본 인성질문" 답변에 대해, 학생에게 직접 전달할 ${isFinal ? '최종' : '1차'} 피드백을 작성합니다.

【이 질문의 스피치 구조】
- 유형: ${speechType}
- 답변 구성: ${speechStructure}

【${conceptLine}】

【⚠️ 절대 규칙】
1. 100% 한글로 작성 (영어 단어 금지)
2. "기본 인성"을 학교 이름처럼 부르지 마세요. 이것은 학교가 아니라 인성면접 질문 카테고리입니다.
3. 중학생에게 말하듯 친근하고 따뜻한 반말 코치 말투 (예: "~해보자", "~하면 좋겠어", "정말 잘했어")
4. 반드시 이 질문의 스피치 구조("${speechType}")를 기준으로 무엇이 들어갔고 무엇이 빠졌는지 짚어주세요.
5. 학생의 진로 컨셉과 연결해서 어떻게 답변을 발전시킬지 안내하세요.
6. 아래 4개 섹션 형식을 그대로 사용 (이모지 + 제목 유지)`

    const userPrompt = `질문: ${question}

학생 ${isFinal ? '업그레이드(2차)' : '첫(1차)'} 답변:
${isFinal ? (secondAnswer || studentAnswer) : studentAnswer}

AI 분석 결과:
${analysisDigest}

위 내용을 바탕으로, 아래 형식 그대로 학생에게 전달할 피드백을 작성해주세요.
각 섹션 제목(이모지 포함)은 그대로 두고, 내용만 채우세요. JSON 아니고 일반 텍스트로 작성:

🎤 스피치 구조 코칭
(이 질문은 "${speechType}" 유형이라는 걸 알려주고, 학생 답변에서 잘한 구조 요소와 빠진 요소를 구체적으로 짚어줘. 학생 답변의 실제 표현을 인용하면서 칭찬과 보완점을 함께. 3~5문장)

🎯 진로 연결 코칭
(학생의 진로 목표와 이 답변을 어떻게 연결하면 더 좋아지는지 구체적으로 안내. 3~4문장)

💭 이렇게 발전시켜보자
(스피치 구조에 맞게 답변을 업그레이드하는 구체적인 방향 2~3가지를 친근하게 제안. 번호 매겨서)

✨ 격려 마무리
(학생의 노력을 진심으로 칭찬하고, 다음 답변을 기대한다는 따뜻한 한두 문장)`

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.6,
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
    const feedback = aiData.choices?.[0]?.message?.content?.trim()
    if (!feedback) {
      throw new Error('OpenAI 응답이 비어있음')
    }

    return new Response(
      JSON.stringify({ success: true, feedback }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('middle-basic-suggest-feedback error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})