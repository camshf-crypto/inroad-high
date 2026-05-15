// supabase/functions/middle-generate-saenggibu/index.ts
// 중등 수행평가를 기반으로 학기 세특 생성
//
// mode: 'summarize' — 수행평가 1개 → 세특에 누적될 1~2문장
// mode: 'finalize'  — 누적본 + 학기 수행평가 → 한 문단으로 압축

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `너는 한국 중학교 생기부 작성 전문 컨설턴트야.
중학교 세부능력 및 특기사항(세특)은 고등학교와 달리, 학기 단위로 학생의 학습 태도, 참여도, 성취 수준, 활동 내역을 종합하여 교사가 관찰자 시점으로 기록하는 글이야.

작성 원칙:
- 교사가 관찰한 사실을 진술하는 어조 ("~함", "~보임", "~참여함")
- 과장된 미화 표현 금지 ("뛰어난 학생", "탁월한 능력" 같은 평가어 자제)
- 구체적 활동 + 드러난 역량 + 학습 태도 순으로 자연스럽게
- 중학교 수준에 맞는 어휘 (대입 학종 용어 사용 X)
- 자유학기/일반학기 구분 없이 동일한 톤
- "~위해 노력함", "~하려는 모습이 돋보임" 같은 태도 표현 적극 활용`

interface Submission {
  id: string
  question_title: string | null
  question_content: string | null
  question_subject: string | null
  question_category: string | null
  answer_text: string | null
  answer_sections: any
  resubmitted_text: string | null
  submitted_at: string | null
  resubmitted_at: string | null
}

function formatSubmission(s: Submission, index?: number): string {
  const prefix = typeof index === 'number' ? `[수행평가 ${index + 1}]` : '[수행평가]'
  const answer = s.resubmitted_text || s.answer_text || ''
  const sections = s.answer_sections && typeof s.answer_sections === 'object'
    ? Object.entries(s.answer_sections)
        .filter(([_, v]) => v && typeof v === 'string' && v.trim())
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join('\n')
    : ''

  return `${prefix}
- 수행평가명: ${s.question_title || '제목 없음'}
- 과목: ${s.question_subject || '미지정'}
- 분류: ${s.question_category || '미지정'}
- 문제/주제: ${s.question_content || '내용 없음'}
- 학생 답변: ${answer || '(답변 없음)'}${sections ? '\n- 세부 섹션:\n' + sections : ''}`
}

function buildSummarizePrompt(params: {
  submission: Submission
  existingContent: string | null
  subject: string
  grade: number
  semester: number
}): string {
  const { submission, existingContent, subject, grade, semester } = params

  return `다음 중${grade} ${semester}학기 ${subject} 수행평가를 기반으로,
학기 세특에 누적될 짧은 문장(1~2문장)을 작성해줘.

${formatSubmission(submission)}

${existingContent ? `[기존 누적된 세특 본문]
${existingContent}

위 누적본에 자연스럽게 이어지도록 새 문장을 작성해줘. 같은 활동을 반복하지 말고, 이 수행평가의 차별점을 드러내줘.` : '아직 누적된 내용이 없어. 이 수행평가가 첫 번째 활동이야.'}

[작성 규칙]
1. 1~2문장, 80~150자 분량
2. 어떤 활동을 했는지 + 드러난 학습 태도/역량
3. "~함", "~보임" 어조
4. 과장 X, 평가어 절제
5. 활동 내용을 구체적으로 (예: "주장하는 글쓰기 활동에서 ~~를 주제로")

[출력]
세특 누적 문장만 반환. 다른 설명 X. 마크다운 X.`
}

function buildFinalizePrompt(params: {
  existingContent: string | null
  submissions: Submission[]
  subject: string
  grade: number
  semester: number
  emphasis_direction: string | null
}): string {
  const { existingContent, submissions, subject, grade, semester, emphasis_direction } = params

  const submissionsText = submissions.length > 0
    ? submissions.map((s, i) => formatSubmission(s, i)).join('\n\n')
    : '(이번 학기 제출 자료 없음)'

  const emphasisLine = emphasis_direction
    ? `\n[강조 방향] "${emphasis_direction}" — 이 관점을 자연스럽게 부각해줘.`
    : ''

  return `다음은 중${grade} ${semester}학기 ${subject} 과목의 수행평가 ${submissions.length}건이야.
이 자료를 종합해서 학기 세특 본문을 한 문단으로 작성해줘.

${submissionsText}
${existingContent ? `\n[기존 누적본 (참고용)]
${existingContent}` : ''}
${emphasisLine}

[작성 규칙]
1. 한 문단, 300~500자 분량
2. 대표 활동 2~3개를 골라 자연스럽게 엮음 (모든 활동을 나열 X)
3. 첫 문장은 "${subject} 수업에서 ~~ 활동에 참여하며" 같은 종합 진술로 시작
4. 활동 내용 → 드러난 역량/태도 → 학습 결과 순서로
5. "~함", "~보임", "~노력함" 어조
6. 과장된 평가어("뛰어난", "탁월한") 사용 자제
7. 중학교 수준 어휘. 대입/학종 용어 X
8. 반복 활동은 한 번만 언급

[출력]
학기 세특 본문만 반환. 다른 설명 X. 마크다운 X.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OPENAI_API_KEY가 설정되지 않았습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const {
      mode,  // 'summarize' | 'finalize' | 'middle-summarize' | 'middle-finalize'
      submission,
      existingContent,
      submissions,
      subject,
      grade,
      semester,
      emphasis_direction,
    } = body

    // mode 정규화 (훅에서 'middle-summarize' / 'middle-finalize'로 보낼 수 있어 둘 다 허용)
    const normalizedMode = (mode || '').replace(/^middle-/, '')

    let prompt = ''

    if (normalizedMode === 'summarize') {
      if (!submission || !subject || !grade || !semester) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'summarize 모드: submission, subject, grade, semester가 필요해요',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      prompt = buildSummarizePrompt({
        submission,
        existingContent: existingContent || null,
        subject,
        grade,
        semester,
      })
    } else if (normalizedMode === 'finalize') {
      if (!Array.isArray(submissions) || !subject || !grade || !semester) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'finalize 모드: submissions(배열), subject, grade, semester가 필요해요',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      prompt = buildFinalizePrompt({
        existingContent: existingContent || null,
        submissions,
        subject,
        grade,
        semester,
        emphasis_direction: emphasis_direction || null,
      })
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `mode는 'summarize' 또는 'finalize'여야 해요. 받은 값: ${mode}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const startedAt = Date.now()

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenAI 호출 실패',
          details: errText.substring(0, 500),
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const generatedText = data.choices?.[0]?.message?.content?.trim()
    const duration = Date.now() - startedAt

    if (!generatedText) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI 응답 없음' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        text: generatedText,
        mode: normalizedMode,
        model: 'gpt-4o',
        usage: data.usage,
        metadata: {
          finish_reason: data.choices?.[0]?.finish_reason,
          duration_ms: duration,
          prompt_tokens: data.usage?.prompt_tokens,
          completion_tokens: data.usage?.completion_tokens,
          total_tokens: data.usage?.total_tokens,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge Function 에러:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: '중등 AI 생기부 생성 실패',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})