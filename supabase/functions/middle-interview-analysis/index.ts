// supabase/functions/ai-interview-analysis/index.ts
// 학생 면접 답변 + 학교 평가 기준 → AI 분석 결과

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

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
  // 외고/자사고/국제고 (외고형 4개)
  score_self_directed: number
  score_humanity: number
  score_motivation: number
  score_current_affairs: number
  // 과학고/영재 (과고형 4개)
  score_research_depth: number
  score_research_process: number
  score_research_ethics: number
  score_career_motivation: number
}

interface RequestBody {
  // 분석 종류
  analysisType: 'first' | 'second'  // 1차 (첫 답변) 또는 2차 (업그레이드)
  
  // 질문 + 답변
  questionText: string
  questionType?: string  // 지원동기/자기주도/인성 등
  studentAnswer: string
  upgradedAnswer?: string  // 2차 분석일 때
  
  // 학교 평가 기준
  school: SchoolCriteria
  
  // 학생 정보 (선택)
  studentName?: string
  studentGrade?: string
}

// 학교 유형에 따라 외고형/과고형 점수 사용
function isResearchType(schoolType: string): boolean {
  return schoolType.includes('과학고') || schoolType.includes('영재')
}

function buildSystemPrompt(school: SchoolCriteria): string {
  const isResearch = isResearchType(school.school_type)
  
  let scoringSection = ''
  if (isResearch) {
    scoringSection = `[${school.school_name} 점수 배분 - 과학고/영재형]
- 탐구 심화: ${school.score_research_depth}점
- 탐구 과정·사고: ${school.score_research_process}점
- 연구윤리·인성: ${school.score_research_ethics}점
- 진로·전공 동기: ${school.score_career_motivation}점
(합계 100점)`
  } else {
    scoringSection = `[${school.school_name} 점수 배분 - 외고/국제고/자사고형]
- 자기주도학습: ${school.score_self_directed}점
- 인성·공동체: ${school.score_humanity}점
- 지원동기·학교이해: ${school.score_motivation}점
- 시사·사고력: ${school.score_current_affairs}점
(합계 100점)`
  }

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
- 평가 항목별 점수 산출 (각 항목 비중 반영)
- 강점과 개선점 도출
- 선생님이 학생에게 줄 피드백 초안 작성 (따뜻한 어조, "○○ 학생은..." 톤)

[응답 형식 - 반드시 아래 JSON 형식으로]
{
  "evalCriteria": "이 학교의 핵심 평가 기준 설명 (1-2문장)",
  "scores": [
    { "label": "평가 항목명", "score": 산출점수, "max": 최대점수, "desc": "이 점수의 근거" },
    ...
  ],
  "summary": "전체 평가 요약 (1-2문장)",
  "strengths": ["강점1", "강점2", "강점3"],
  "improvements": ["개선점1", "개선점2", "개선점3"],
  "teacherFeedback": "선생님이 학생에게 줄 피드백 초안 (3-5문장, 친근한 어조, ~했어요/~해요 톤, 구체적 사례 제시, '○○ 학생' 호칭, 응원 메시지 포함)"
}

JSON 외 다른 텍스트는 절대 추가하지 마세요.`
}

function buildSecondAnalysisPrompt(school: SchoolCriteria): string {
  const isResearch = isResearchType(school.school_type)
  
  let scoringFactors = ''
  if (isResearch) {
    scoringFactors = `자기주도학습, 인성·공동체, 지원동기·학교이해, 시사·사고력`
  } else {
    scoringFactors = `자기주도학습, 인성·공동체, 지원동기·학교이해, 시사·사고력`
  }
  
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
  if (body.analysisType === 'first') {
    return `[질문]
${body.questionText}

[학생 답변]
${body.studentAnswer}

위 답변을 ${body.school.school_name} 평가 기준에 맞춰 분석해주세요.`
  } else {
    return `[질문]
${body.questionText}

[학생 1차 답변]
${body.studentAnswer}

[학생 업그레이드 답변]
${body.upgradedAnswer || '(없음)'}

업그레이드된 답변이 1차에 비해 얼마나 발전했는지, 그리고 ${body.school.school_name} 평가 기준에 얼마나 부합하는지 분석해주세요.`
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

    if (!body.questionText || !body.studentAnswer || !body.school) {
      return new Response(
        JSON.stringify({ error: '필수 필드 누락: questionText, studentAnswer, school' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },  // JSON 강제
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

    return new Response(
      JSON.stringify({
        analysis: parsed,
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