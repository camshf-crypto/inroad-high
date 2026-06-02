// supabase/functions/middle-interview-analysis/index.ts
// 학생 면접 답변 + 학교 평가 기준 → AI 분석 결과
// 🔥 캐시: answer_id 기준 DB 조회 → 있으면 캐시 반환, 없으면 GPT 호출 + 저장

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SchoolCriteria {
  school_name: string
  school_type: string
  region: string
  evaluator_perspective: string
  question_style: string
  high_score_answer: string
  preferred_type: string
  evaluation_tone: string
  score_self_directed: number
  score_humanity: number
  score_motivation: number
  score_current_affairs: number
  score_research_depth: number
  score_research_process: number
  score_research_ethics: number
  score_career_motivation: number
}

interface RequestBody {
  answerId: string
  forceRegenerate?: boolean
  analysisType: 'first' | 'second'
  questionText: string
  questionType?: string
  studentAnswer: string
  upgradedAnswer?: string
  school: SchoolCriteria
  studentName?: string
  studentGrade?: string
}

function buildSystemPrompt(school: SchoolCriteria): string {
  const allFactors = [
    { label: '자기주도학습', weight: school.score_self_directed },
    { label: '인성·공동체', weight: school.score_humanity },
    { label: '지원동기·학교이해', weight: school.score_motivation },
    { label: '시사·사고력', weight: school.score_current_affairs },
    { label: '탐구 심화', weight: school.score_research_depth },
    { label: '탐구 과정·사고', weight: school.score_research_process },
    { label: '연구윤리·인성', weight: school.score_research_ethics },
    { label: '진로·전공 동기', weight: school.score_career_motivation },
  ]
  const activeFactors = allFactors.filter(f => f.weight > 0)
  
  const scoringSection = `[${school.school_name} 점수 배분]
${activeFactors.map(f => `- ${f.label}: ${f.weight}점`).join('\n')}
(합계 100점)

⚠️ 위 항목들만 평가하고, 다른 항목은 절대 포함하지 마세요.`

  const scoresFormat = activeFactors
    .map(f => `    { "label": "${f.label}", "score": (0~${f.weight} 사이 정수), "max": ${f.weight}, "desc": "이 항목 평가 근거 한 줄" }`)
    .join(',\n')

  return `당신은 한국의 입시 전문 학원 선생님으로, 중학생의 ${school.school_name} 면접 답변을 분석하는 AI입니다.

[${school.school_name} 정보]
- 유형: ${school.school_type}
- 지역: ${school.region}

[면접 평가 기준]
${scoringSection}

[면접관 핵심 관점]
${school.evaluator_perspective}

[질문 출제 특징]
${school.question_style}

[고득점 답변 구성]
${school.high_score_answer}

[선호 유형]
${school.preferred_type}

[평가톤]
${school.evaluation_tone}

[당신의 임무]
- 학생의 답변을 위 ${school.school_name}의 평가 기준에 맞춰 분석
- 위에 명시된 평가 항목만 점수 산출 (다른 항목 절대 추가 금지)
- 강점과 개선점 도출 (학생 답변 내용을 구체적으로 인용)
- 학생이 답변을 더 깊게 만들 수 있도록 스스로 생각해볼 사유하는 질문 5개 제시
- 선생님이 학생에게 줄 피드백 초안 작성 (따뜻한 어조, 길고 구체적으로)

[teacherFeedback 작성 지침 - 반드시 따라야 함]
- ★ 분량: 250자~400자 (절대 너무 짧으면 안 됨) ★
- 학생 이름이 있으면 "○○님," 형태로 시작 (○○는 실제 이름 그대로 넣기. placeholder 사용 금지)
- 학생 이름이 없으면 "학생, "으로 시작
- "~예요/~해요" 따뜻한 톤
- 구조: 
  1. [총평] 2-3문장 - 답변 전체 느낌
  2. [잘한 점] 2문장 - 학생 답변에서 구체적으로 잘한 부분 인용
  3. [개선할 점] 2-3문장 - 부족한 부분 + 어떻게 보완할지 구체 제안
  4. [다음 단계] 1-2문장 - 응원 + 다음 액션 제시
- 마크다운 헤더(##, **) 사용 금지
- 학생 답변 내용을 직접 인용하면서 평가
- "구체적이지 않다" 같은 모호한 표현 금지 → "○○ 부분을 더 자세히 말해보면" 같이 구체적으로

[응답 형식 - 반드시 아래 JSON 형식으로]
{
  "evalCriteria": "이 학교의 핵심 평가 기준 설명 (1-2문장)",
  "scores": [
${scoresFormat}
  ],
  "summary": "전체 평가 요약 (1-2문장)",
  "strengths": ["강점1 (학생 답변 인용)", "강점2", "강점3"],
  "improvements": ["개선점1 (구체적 제안)", "개선점2", "개선점3"],
  "reflectiveQuestions": ["학생 답변에서 ○○라고 했는데, 그 이유는?", "사유질문2", "사유질문3", "사유질문4", "사유질문5"],
  "teacherFeedback": "250-400자의 따뜻하고 구체적인 피드백"
}

⚠️ scores 배열에는 위에 명시된 항목만 포함. teacherFeedback은 250-400자, 학생 답변 인용 필수. reflectiveQuestions는 학생 답변과 직접 연결된 사고 자극 질문. JSON 외 다른 텍스트 절대 추가 금지.`
}

function buildSecondAnalysisPrompt(school: SchoolCriteria): string {
  return `당신은 ${school.school_name} 면접 평가 전문가입니다. 학생의 1차 답변과 업그레이드된 답변을 비교 분석해주세요.

[응답 형식 - JSON]
{
  "structureComment": "답변 구조 개선 코멘트 (1-2문장)",
  "practiceAnswer": "학교 평가 기준에 가장 잘 맞는 모범 답변 (실제 면접에서 말할 수 있는 자연스러운 톤, 2-3문장)",
  "teacherFinalFeedback": "선생님이 학생에게 줄 최종 피드백 초안 (3-5문장, 1차보다 발전한 점 강조, 다음 단계 제시, '○○ 학생' 호칭)",
  "tailSuggestions": [
    "꼬리질문1 (학생 답변 깊이 확인용)",
    "꼬리질문2 (지원 학교 특성과 연결)",
    "꼬리질문3 (구체성 끌어내기)"
  ]
}

JSON 외 다른 텍스트 절대 추가하지 마세요.`
}

function buildUserPrompt(body: RequestBody): string {
  const nameSection = body.studentName 
    ? `[학생 이름]\n${body.studentName}\n(이 이름을 teacherFeedback 첫 머리에 "${body.studentName}님,"으로 사용)\n\n` 
    : '';

  if (body.analysisType === 'first') {
    return `${nameSection}[질문]
${body.questionText}

[학생 답변]
${body.studentAnswer}

위 답변을 ${body.school.school_name} 평가 기준에 맞춰 분석해주세요.

⚠️ 반드시 지킬 것:
- teacherFeedback은 250-400자 (너무 짧으면 안 됨)
- ${body.studentName ? `"${body.studentName}님,"으로 시작` : `"학생,"으로 시작`}
- 학생 답변 내용을 구체적으로 인용하면서 평가
- reflectiveQuestions도 학생 답변과 직접 연결된 질문`
  } else {
    return `${nameSection}[질문]
${body.questionText}

[학생 1차 답변]
${body.studentAnswer}

[학생 업그레이드 답변]
${body.upgradedAnswer || '(없음)'}

업그레이드된 답변이 1차에 비해 얼마나 발전했는지, 그리고 ${body.school.school_name} 평가 기준에 얼마나 부합하는지 분석해주세요.

⚠️ teacherFinalFeedback은 250-400자, ${body.studentName ? `"${body.studentName}님,"으로 시작` : ''}, 1차 → 2차 발전 부분 구체 인용.`
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다')
    }

    const body = await req.json() as RequestBody

    if (!body.answerId || !body.questionText || !body.studentAnswer || !body.school) {
      return new Response(
        JSON.stringify({ error: '필수 필드 누락: answerId, questionText, studentAnswer, school' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ============================================
    // 🔍 1️⃣ 캐시 조회 (강제 재생성 아니면)
    // ============================================
    if (!body.forceRegenerate) {
      const { data: cached } = await supabase
        .from('middle_interview_ai_analysis')
        .select('analysis_data, created_at')
        .eq('answer_id', body.answerId)
        .eq('analysis_type', body.analysisType)
        .maybeSingle()

      if (cached?.analysis_data) {
        console.log(`✅ 캐시 사용: ${body.answerId} ${body.analysisType}`)
        return new Response(
          JSON.stringify({
            analysis: cached.analysis_data,
            cached: true,
            cachedAt: cached.created_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ============================================
    // 🤖 2️⃣ GPT 호출
    // ============================================
    console.log(`🚀 GPT 호출: ${body.answerId} ${body.analysisType}`)

    const systemPrompt = body.analysisType === 'second'
      ? buildSecondAnalysisPrompt(body.school)
      : buildSystemPrompt(body.school)

    const userPrompt = buildUserPrompt(body)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenAI API error:', errText)
      return new Response(
        JSON.stringify({ error: 'OpenAI API 호출 실패', detail: errText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content || '{}'
    
    let parsed: any
    try {
      parsed = JSON.parse(rawContent)
    } catch (e) {
      console.error('JSON parse error:', rawContent)
      return new Response(
        JSON.stringify({ error: 'AI 응답을 파싱할 수 없어요', raw: rawContent }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 💾 3️⃣ DB에 저장 (upsert)
    // ============================================
    const { error: saveError } = await supabase
      .from('middle_interview_ai_analysis')
      .upsert({
        answer_id: body.answerId,
        analysis_type: body.analysisType,
        analysis_data: parsed,
        school_name: body.school.school_name,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'answer_id,analysis_type'
      })

    if (saveError) {
      console.error('DB 저장 실패:', saveError)
    } else {
      console.log(`💾 캐시 저장 완료: ${body.answerId} ${body.analysisType}`)
    }

    return new Response(
      JSON.stringify({
        analysis: parsed,
        cached: false,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e: any) {
    console.error('Edge function error:', e)
    return new Response(
      JSON.stringify({ error: e.message || '알 수 없는 에러' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})