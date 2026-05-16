// supabase/functions/ai-suhaeng-question/index.ts
// 고등 수행평가 문제 AI 자동 생성 — 6가지 유형별 심화 프롬프트

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `너는 20년 경력의 한국 고등학교 수행평가 전문 출제 교사이자 입시 전문가야.
실제 고등학교 현장과 대입을 연계한 심화 수행평가 문제를 만들어줘.

출제 원칙:
1. 2015/2022 개정 교육과정 성취 기준에 맞는 심화 수준
2. 학생의 고차원적 사고력(분석·종합·평가·창조)을 자극하는 문제
3. 학생부 세특(세부능력 및 특기사항)에 기재될 수 있는 의미 있는 활동
4. 전공 연계성이 드러나는 주제 (이공계/인문사회/예체능 계열 고려)
5. 대입 자기소개서·면접에서 활용 가능한 깊이 있는 탐구 유도
6. 단순 암기·요약이 아닌 학생 고유의 관점과 통찰이 담긴 산출물 요구`

function buildPrompt(subject: string, type: string, grade: string, evalCriteria?: { name: string; score: number }[]): string {

  // 선생님이 직접 설정한 평가 기준이 있으면 문제에 반영
  const criteriaNote = evalCriteria && evalCriteria.length > 0
    ? `\n\n[선생님이 설정한 평가 기준 — 문제에 반드시 반영]\n${evalCriteria.map(c => `- ${c.name} (${c.score}점)`).join('\n')}\n위 평가 기준이 문제 안에 명시되어야 해.`
    : ''

  const typePrompts: Record<string, string> = {

    '탐구보고서': `
[유형 설명] 학생이 관심 있는 학문적 주제를 선정하여 심층 탐구하고 학술적 형식의 보고서를 작성하는 유형이야.

출제 조건:
- ${subject} 교과의 핵심 개념을 실생활·사회 현상·최신 연구와 연결한 탐구 주제
- 탐구 질문(Research Question)이 명확한 문제 의식
- 보고서 구성: 탐구 주제 및 동기 → 이론적 배경 → 탐구 방법 → 탐구 내용 및 분석 → 결론 및 시사점 → 참고문헌
- 1차·2차 자료 활용 및 출처 표기 요구
- 학생 자신의 비판적 시각과 독창적 해석 포함
- 전공 연계 가능한 주제 권장
- 세특 기재를 고려한 심화 탐구 활동${criteriaNote}

JSON 형식:
{
  "title": "탐구 핵심이 담긴 학술적 제목",
  "content": "1) 탐구 배경 및 문제의식 2~3문장 2) 핵심 탐구 질문 3) 보고서 구성 6단계 안내 4) 자료 수집 방법 5) 독자적 분석 요구 6) 평가 기준 안내",
  "min_chars": null,
  "max_chars": null
}`,

    '독서기록': `
[유형 설명] 교과 관련 전문 서적이나 고전을 읽고 비판적·창의적으로 분석하는 유형이야.

출제 조건:
- ${subject} 교과와 연계된 전문 교양서·학술서·고전 읽기
- 비판적 읽기: 저자의 주장·근거·한계 분석
- 자신의 전공 관심사·진로와 연결하는 독서 활동
- 독서기록 구성: 도서 정보 → 핵심 내용 요약 → 인상 깊은 구절과 이유 → 비판적 분석 → 진로 연계 및 삶에의 적용
- 다른 도서나 학습 내용과 연결하는 비교 독서 권장${criteriaNote}

JSON 형식:
{
  "title": "독서 활동의 목적이 담긴 제목",
  "content": "1) 도서 선정 기준 안내 2) 독서기록 구성 5단계 3) 비판적 분석 요구 4) 진로·전공 연계 방향 5) 평가 기준 안내",
  "min_chars": null,
  "max_chars": null
}`,

    '발표·토론': `
[유형 설명] ${subject} 교과의 쟁점 주제에 대해 논리적으로 자신의 입장을 발표하거나 토론하는 유형이야.

출제 조건:
- ${subject} 교과와 연관된 사회적·학문적 쟁점 주제
- 찬반이 명확하거나 다양한 관점이 공존하는 논쟁적 주제
- 발표 구성: 입장 표명 → 근거 1·2·3 → 예상 반론과 대응 → 결론
- 통계·사례·전문가 의견·연구 결과 등 다양한 근거 활용 요구
- 5~7분 발표 기준${criteriaNote}

JSON 형식:
{
  "title": "쟁점이 명확한 토론 주제 제목",
  "content": "1) 토론 배경 2~3문장 2) 핵심 쟁점 질문 3) 발표 구성 안내 4) 근거 자료 활용 방법 5) 시간 조건 6) 평가 기준 안내",
  "min_chars": null,
  "max_chars": null
}`,

    '프로젝트·산출물': `
[유형 설명] 학생이 실제 문제를 해결하거나 창의적 결과물을 만들어내는 유형이야.

출제 조건:
- ${subject} 교과 지식을 실제 문제 해결에 적용하는 프로젝트
- 사회 문제·환경 문제·기술 혁신·문화 창작 등 다양한 분야
- 프로젝트 보고서 구성: 문제 정의 → 목표 설정 → 계획 수립 → 수행 과정 → 산출물 설명 → 성찰 및 개선점
- 최종 산출물: 보고서·포스터·영상·모델·앱 등 유형 선택 가능
- 창의성·실현 가능성·완성도를 평가${criteriaNote}

JSON 형식:
{
  "title": "프로젝트 목적이 드러나는 제목",
  "content": "1) 프로젝트 배경 및 해결할 문제 2) 보고서 구성 6단계 3) 산출물 형태 안내 4) 수행 기간 안내 5) 평가 기준 안내",
  "min_chars": null,
  "max_chars": null
}`,

    '실험·실습': `
[유형 설명] 과학적 탐구 과정을 직접 설계하고 수행하여 결과를 분석하는 유형이야.

출제 조건:
- ${subject} 교과의 핵심 개념을 검증하는 실험 설계
- 독립변인·종속변인·통제변인 명확히 설정
- 실험 설계 → 수행 → 데이터 수집 → 그래프/표 작성 → 오차 분석 → 결론
- 반복 측정과 평균값 계산 요구
- 이론값과 실험값 비교·오차 분석 포함
- 실생활 응용 사례 연결${criteriaNote}

JSON 형식:
{
  "title": "실험 목적이 담긴 제목",
  "content": "1) 실험 배경 및 탐구 질문 2) 보고서 구성 7단계 (목적/가설/변인설정/준비물/과정/결과분석/결론) 3) 변인 통제 방법 4) 데이터 처리 방법 5) 오차 분석 요구 6) 평가 기준 안내",
  "min_chars": null,
  "max_chars": null
}`,

    '글쓰기·논술': `
[유형 설명] ${subject} 교과의 핵심 쟁점에 대해 학문적 논거를 갖춘 심층 논술문을 작성하는 유형이야.

출제 조건:
- ${subject} 교과의 핵심 개념·이론·현상과 연관된 논술 주제
- 인문·사회·과학·기술·환경 등 학제적 접근이 가능한 주제
- 논술 구성: 서론(문제 제기) → 본론(주장+근거 2~3개+반론 수용) → 결론(요약+제언)
- 700~1200자 분량
- 객관적 근거(통계·사례·이론)와 주관적 해석의 균형
- 대입 수시 논술 수준의 사고력 요구${criteriaNote}

JSON 형식:
{
  "title": "논술 핵심 쟁점이 담긴 제목",
  "content": "1) 논술 배경 지문 또는 상황 제시 3~4문장 2) 핵심 논제 명시 3) 논술 구성 안내 (서론-본론-결론) 4) 글자수 조건 (700~1200자) 5) 평가 기준 안내",
  "min_chars": 700,
  "max_chars": 1200
}`,
  }

  const typePrompt = typePrompts[type] || typePrompts['글쓰기·논술']

  return `고등학교 ${grade} ${subject} 과목의 ${type} 수행평가 문제를 1개 만들어줘.
${typePrompt}

위 조건에 맞게 실제 고등학교에서 출제될 법한 구체적이고 심화된 문제를 만들어줘.
학생부 세특에 기재될 수 있는 의미 있는 활동이 되도록 해줘.
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
    const { subject, type, grade, evalCriteria } = body

    if (!subject || !type) {
      return new Response(
        JSON.stringify({ success: false, error: 'subject, type 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const gradeLabel = grade || '고2'
    const prompt = buildPrompt(subject, type, gradeLabel, evalCriteria)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.85,
        max_tokens: 1200,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`OpenAI API 오류: ${response.status} ${errText}`)
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''

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
    console.error('[ai-suhaeng-question 오류]', e)
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})