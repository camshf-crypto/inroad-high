// supabase/functions/ai-monthly-report-comment/index.ts
// 학부모 월간 보고서 종합 코멘트 생성

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ════════════════════════════════════════════════════════════
// 📝 시스템 프롬프트
// ════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `당신은 한국의 입시 전문 학원 선생님이 학부모에게 매월 보내는 월간 학습 보고서의 종합 코멘트를 작성하는 AI 어시스턴트입니다.

[작성 원칙]
- 따뜻하고 친근한 어조 (~했어요, ~했습니다 혼용)
- 학생의 노력을 인정하고 응원하는 긍정적 톤
- 데이터 기반 - 실제 활동 수치를 자연스럽게 언급
- 부모님이 안심하고 학원을 신뢰할 수 있는 내용
- 학원/원장 홍보 금지
- 어머님/아버님 호칭 사용 금지 (부모님 일반 호칭 X)

[형식]
- 3-4문단, 총 250-350자
- 첫 문단: 이번 달 학생의 전반적인 모습과 성장 포인트
- 중간 문단(들): 구체적인 활동과 잘한 점 (수치 자연스럽게 포함)
- 마지막 문단: 다음 달 학습 방향 제시
- 문단 사이는 빈 줄로 구분

[주의]
- 활동 수가 0인 항목은 언급하지 않기
- 과장하거나 데이터에 없는 내용 추가하지 않기
- 학생 이름 + "학생" 표기 사용 (예: "김민지 학생")
- "○○이", "○○가" 같은 빈자리 채우기 표현 금지
- 부정적 표현 자제 (활동이 적어도 격려 톤)

[학년별 톤]
- 중등: 학습 습관 형성과 기초 다지기에 초점
- 고등: 입시 준비와 자기소개서/면접 본격화에 초점`

// ════════════════════════════════════════════════════════════
// 🔧 사용자 프롬프트 빌더
// ════════════════════════════════════════════════════════════
interface ActivityCounts {
  essay_count: number
  past_answer_count: number
  simulation_count: number
  interview_count: number
  passage_count: number
  reading_count: number
  lessons_progress_count: number
  homework_submission_count: number
  suhaeng_count: number
  major_answer_count: number
  research_count: number
}

interface RequestBody {
  studentName: string
  grade: string
  school?: string | null
  gradeLevel: 'high' | 'middle'
  yearMonth: string  // '2026-05'
  activities: ActivityCounts
}

function buildUserPrompt(body: RequestBody): string {
  const [year, month] = body.yearMonth.split('-')
  const monthLabel = `${year}년 ${parseInt(month)}월`
  const gradeLabel = body.gradeLevel === 'high' ? '고등부' : '중등부'
  const a = body.activities

  const items: string[] = []
  if (a.essay_count > 0) items.push(`- 자기소개서 작성 ${a.essay_count}건`)
  if (a.past_answer_count > 0) items.push(`- 기출문제 답변 ${a.past_answer_count}건`)
  if (a.simulation_count > 0) items.push(`- AI 면접 시뮬레이션 ${a.simulation_count}회`)
  if (a.interview_count > 0) items.push(`- 면접 연습 ${a.interview_count}회`)
  if (a.passage_count > 0) items.push(`- 제시문 면접 ${a.passage_count}회`)
  if (a.reading_count > 0) items.push(`- 독서 활동 ${a.reading_count}건`)
  if (a.lessons_progress_count > 0) items.push(`- 수업 영상 시청 ${a.lessons_progress_count}건`)
  if (a.homework_submission_count > 0) items.push(`- 숙제 제출 ${a.homework_submission_count}건`)
  if (a.suhaeng_count > 0) items.push(`- 수행평가 ${a.suhaeng_count}건`)
  if (a.major_answer_count > 0) items.push(`- 전공 질문 답변 ${a.major_answer_count}건`)
  if (a.research_count > 0) items.push(`- 탐구 활동 ${a.research_count}건`)

  const activitiesStr = items.length > 0
    ? items.join('\n')
    : '이번 달에는 학습 활동 기록이 적습니다. 다음 달부터 학습 루틴을 다질 수 있도록 격려하는 톤으로 작성해주세요.'

  return `다음 학생의 ${monthLabel} 활동을 바탕으로 학부모님께 보낼 종합 코멘트를 작성해주세요.

[학생 정보]
- 이름: ${body.studentName}
- 학년: ${body.grade} (${gradeLabel})
- 학교: ${body.school || '미입력'}

[월간 활동 데이터]
${activitiesStr}

위 데이터만 바탕으로 코멘트를 작성하세요. 데이터에 없는 활동을 만들어내지 마세요.`
}

// ════════════════════════════════════════════════════════════
// 🚀 메인 핸들러
// ════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다')
    }

    const body = await req.json() as RequestBody

    if (!body.studentName || !body.grade || !body.yearMonth || !body.activities) {
      return new Response(
        JSON.stringify({ error: '필수 필드 누락: studentName, grade, yearMonth, activities' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
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
    const comment = data.choices?.[0]?.message?.content?.trim() || ''

    if (!comment) {
      return new Response(
        JSON.stringify({ error: 'AI가 코멘트를 생성하지 못했어요' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        comment,
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