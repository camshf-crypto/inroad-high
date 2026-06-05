// supabase/functions/generate-suhaeng-question/index.ts
//   (배포명이 middle-suhaeng-question 이면 그 폴더에 넣어서 배포할 것)
// 중등/고등 수행평가 문제 AI 자동 생성 — 유형별 상세 프롬프트
//   ★ topic(주제), semester(학기) 반영 추가

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `너는 15년 경력의 한국 중·고등학교 수행평가 전문 출제 교사야.
실제 학교 현장에서 출제되는 수행평가 문제를 만들어줘.

출제 원칙:
1. ★ 반드시 해당 학년(중1/중2/중3)이 실제로 수행할 수 있는 난이도로 출제할 것.
   - 중학생이 이해하고 풀 수 있는 어휘·개념·분량으로 맞출 것.
   - 대학생·고등학생 수준의 어려운 개념이나 전문 용어는 쓰지 말 것.
   - 어려운 주제가 주어져도 중학생 눈높이로 쉽게 풀어서 출제할 것.
2. 교육과정 성취 기준에 맞는 내용 수준
3. 학생이 주도적으로 사고하고 표현할 수 있는 열린 문제
4. 시의성 있는 실생활 주제와 교과 내용을 연결
5. 평가 기준이 문제 안에 명확히 드러날 것
6. 선생님이 주제를 지정하면 반드시 그 주제로 출제 (주제를 임의로 바꾸지 말 것)
   단, 주제가 어려워도 난이도는 중학생 수준으로 낮춰서 다룰 것.`

// 유형별 상세 프롬프트 생성
function buildPrompt(
  level: string,
  subject: string,
  type: string,
  grade: string,
  semester?: string,
  topic?: string
): string {
  const levelLabel = level === 'middle' ? '중학교' : '고등학교'

  const semesterNote = semester
    ? `\n\n[학기 정보]\n이 문제는 ${semester} 수행평가야. 학기에 맞는 교육과정 진도와 내용을 반영해줘.`
    : ''

  const topicNote = topic
    ? `\n\n[★ 선생님이 지정한 수행평가 주제 — 최우선 준수]\n"${topic}"\n반드시 이 주제로 문제를 만들어줘. 이 주제에서 절대 벗어나지 말 것.\n제목과 문제 내용 모두 "${topic}"와 직접 관련되어야 해. 다른 주제로 바꾸면 안 돼.\n\n[제목 작성 규칙 — 중요]\n- 제목은 입력 주제 "${topic}"를 살려서 구체적이고 흥미롭게 만들 것.\n- "${topic}"를 단순히 짧게 줄이거나 밋밋하게("~와 ~의 연결" 같은 식) 쓰지 말 것.\n- 학생이 무엇을 하게 되는지 드러나도록, 활동·탐구 방향이 담긴 제목으로.\n- 예) 주제가 "이차함수 활용되는 실생활"이면 → "우리 주변 속 이차함수: 실생활에서 찾는 포물선의 비밀" 처럼 구체적이고 생생하게.`
    : ''

  const typePrompts: Record<string, string> = {
    논술형: `
[유형 설명] 논술형은 특정 주제에 대해 자신의 주장을 논리적 근거와 함께 서술하는 유형이야.

출제 조건:
- ${subject} 교과와 연관된 사회적 이슈 또는 가치 충돌 주제 선택
- 찬반이 명확하거나 다양한 관점이 존재하는 주제 (예: 환경 vs 개발, 개인 vs 공동체)
- 400~800자 글쓰기 조건 명시
- 구체적인 평가 기준 3가지를 문제 안에 안내 (예: 주장의 명확성, 근거의 타당성, 논리적 구성)
- 학생이 실생활에서 경험하거나 뉴스에서 접할 수 있는 시의성 있는 주제

JSON 형식:
{
  "title": "논술 주제가 명확히 드러나는 제목 (예: OOO에 대한 나의 입장)",
  "content": "문제 내용: 1) 배경 상황 2~3문장 2) 구체적인 논술 지시사항 3) 글자수 조건 (400~800자) 4) 평가 기준 3가지 안내",
  "min_chars": 400,
  "max_chars": 800
}`,

    서술형: `
[유형 설명] 서술형은 ${subject} 교과의 핵심 개념이나 원리를 정확하고 간결하게 서술하는 유형이야.

출제 조건:
- ${subject} 교과의 핵심 개념·원리·현상을 묻는 문제
- 단순 암기가 아닌 이해와 적용을 확인하는 문제
- 150~300자 내외로 서술 (간결하고 정확하게)
- 예시나 근거를 포함하도록 요구
- 채점 기준이 명확한 문제 (정답 요소가 2~3개)

JSON 형식:
{
  "title": "핵심 개념이 드러나는 제목 (예: OOO의 원리와 사례 서술)",
  "content": "문제 내용: 1) 묻는 개념/현상 명시 2) 구체적인 서술 지시사항 3) 포함해야 할 요소 안내 4) 글자수 조건 (150~300자)",
  "min_chars": 150,
  "max_chars": 300
}`,

    주제탐구: `
[유형 설명] 주제탐구는 학생이 스스로 주제를 정하거나 제시된 주제에 대해 자료를 조사·분석하고 보고서를 작성하는 유형이야.

출제 조건:
- ${subject} 교과와 연관된 탐구 가능한 주제 (사회 현상, 과학 원리, 역사적 사건 등)
- 인터넷·도서관·실생활 자료 조사가 가능한 주제
- 보고서 구성 안내: 탐구 배경 → 조사 방법 → 조사 내용 → 분석 및 결론 → 참고 자료
- 단순 조사가 아닌 학생 자신의 분석과 시각이 들어가야 함
- 탐구 기간과 분량 안내 포함

JSON 형식:
{
  "title": "탐구 주제가 명확한 제목 (예: OOO 탐구 보고서)",
  "content": "문제 내용: 1) 탐구 배경 및 목적 2~3문장 2) 구체적인 탐구 지시사항 3) 보고서 구성 5단계 안내 4) 유의사항 (자료 출처 명시, 자신의 분석 포함)",
  "min_chars": null,
  "max_chars": null
}`,

    구술발표: `
[유형 설명] 구술발표는 특정 주제에 대해 발표 원고를 작성하고 실제로 발표(음성/영상)하는 유형이야.

출제 조건:
- ${subject} 교과와 연관된 발표 주제
- 3~5분 분량의 발표 (원고 200~500자 내외)
- 발표 구성 안내: 인사 → 주제 소개 → 본론(2~3가지 핵심 내용) → 결론 → 마무리
- 청중(선생님·친구들)을 설득하거나 정보를 전달하는 형태
- 시각 자료나 예시 활용 권장
- 발표 평가 기준 안내 (내용, 전달력, 시간 준수)

JSON 형식:
{
  "title": "발표 주제가 명확한 제목 (예: OOO에 대한 나의 발표)",
  "content": "문제 내용: 1) 발표 주제와 배경 2) 발표 구성 안내 3) 시간 조건 (3~5분) 4) 평가 기준 (내용의 충실성, 전달력, 시간 준수) 5) 원고 작성 후 음성/영상 녹음 안내",
  "min_chars": null,
  "max_chars": null
}`,

    탐구수행: `
[유형 설명] 탐구수행은 실험·관찰·조사를 직접 수행하고 그 과정과 결과를 보고서로 작성하는 유형이야.

출제 조건:
- ${subject} 교과의 실험·관찰 가능한 탐구 주제
- 가설 설정 → 실험 설계 → 수행 → 결과 분석 → 결론 도출 구조
- 집에서 또는 학교에서 할 수 있는 현실적인 실험 주제
- 사진 첨부로 실험 과정 증빙
- 과학적 사고력과 탐구 능력을 평가
- 실험 안전 유의사항 포함

JSON 형식:
{
  "title": "실험/탐구 주제가 명확한 제목 (예: OOO 실험 보고서)",
  "content": "문제 내용: 1) 탐구 주제와 목적 2) 보고서 구성 6단계 안내 (실험목적/가설/준비물/실험과정/결과데이터/결론) 3) 사진 첨부 안내 4) 유의사항 (안전, 반복 측정 등)",
  "min_chars": null,
  "max_chars": null
}`,
  }

  const typePrompt = typePrompts[type] || typePrompts['논술형']

  // ★ topic이 있으면 프롬프트 맨 앞에 최우선으로 배치
  const topicHeader = topic
    ? `[★ 가장 중요] 이번 수행평가의 주제는 반드시 "${topic}" 입니다. 이 주제로만 문제를 만드세요.\n\n`
    : ''

  return `${topicHeader}${levelLabel} ${grade} ${subject} 과목의 ${type} 수행평가 문제를 1개 만들어줘.
${typePrompt}${semesterNote}${topicNote}

[난이도 — 매우 중요]
이 문제는 ${levelLabel} ${grade} 학생이 푸는 거야. 반드시 ${grade} 학생 눈높이에 맞춰줘.
- ${grade} 학생이 아는 어휘와 개념만 사용
- 너무 전문적이거나 어려운 내용 금지 (어려운 주제면 쉽게 풀어서)
- 분량과 요구 수준도 ${grade}이 감당할 수 있게

위 조건에 맞게 실제 학교에서 출제될 법한 구체적인 문제를 만들어줘.${topic ? `\n다시 강조하지만, 반드시 "${topic}" 주제로, ${grade} 수준에 맞게 만들어야 해.` : ''}
JSON 형식으로만 응답해. 다른 설명 없이 JSON만. 마크다운 백틱(\`\`\`) 없이.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return new Response(
      JSON.stringify({ success: false, error: 'OPENAI_API_KEY 없음' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    const body = await req.json()
    // ★ topic, semester 도 받기
    const { level, subject, type, grade, semester, topic } = body

    if (!level || !subject || !type) {
      return new Response(
        JSON.stringify({ success: false, error: 'level, subject, type 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const gradeLabel = grade || (level === 'middle' ? '중2' : '고2')
    const prompt = buildPrompt(level, subject, type, gradeLabel, semester, topic)

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
        // ★ 주제를 잘 지키도록 temperature 약간 낮춤
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`OpenAI API 오류: ${response.status} ${errText}`)
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''

    // JSON 파싱
    let question
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim()
      question = JSON.parse(cleaned)
    } catch (e) {
      throw new Error(`JSON 파싱 실패: ${raw}`)
    }

    if (!question.title || !question.content) {
      throw new Error('AI 응답에 필수 필드(title, content)가 없어요')
    }

    return new Response(
      JSON.stringify({ success: true, question }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e: any) {
    console.error('[generate-suhaeng-question 오류]', e)
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})