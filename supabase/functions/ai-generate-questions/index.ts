// supabase/functions/ai-generate-questions/index.ts
// 방식 3: 정규식 + GPT 백업으로 카테고리별 분류 + 병렬 질문 생성
//
// [흐름]
// 1단계: 정규식으로 학년/카테고리별 분류 시도 → 실패 시 GPT 백업
// 2단계: 각 카테고리마다 GPT 병렬 호출하여 활동별 질문 생성
// 3단계: 모든 질문 합쳐서 반환

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 카테고리 정의
const CATEGORY_KEYWORDS = {
  '자율활동': ['자율활동', '자치활동'],
  '동아리활동': ['동아리활동', '동아리 활동'],
  '진로활동': ['진로활동', '진로 활동'],
  '봉사활동': ['봉사활동', '봉사 활동'],
  '행동특성': ['행동특성', '행동 특성', '종합의견'],
  '세부능력': ['세부능력', '세부 능력', '특기사항'],
}

// ─────────────────────────────────────────────
// 1단계: 정규식으로 학년/카테고리별 분류
// ─────────────────────────────────────────────
function parseSaenggibuByRegex(text: string): Record<string, string> {
  const sections: Record<string, string> = {}
  
  // 학년별로 자르기
  const grades = ['1학년', '2학년', '3학년']
  
  for (let i = 0; i < grades.length; i++) {
    const currentGrade = grades[i]
    const nextGrade = grades[i + 1]
    
    let pattern: RegExp
    if (nextGrade) {
      pattern = new RegExp(`${currentGrade}[\\s\\S]*?(?=${nextGrade})`)
    } else {
      pattern = new RegExp(`${currentGrade}[\\s\\S]*$`)
    }
    
    const match = text.match(pattern)
    if (!match) continue
    
    const gradeText = match[0]
    
    // 각 카테고리 분리
    extractCategory(gradeText, sections, currentGrade, '자율활동', ['동아리활동', '진로활동', '봉사활동', '세부능력', '세부 능력', '행동특성'])
    extractCategory(gradeText, sections, currentGrade, '동아리활동', ['진로활동', '봉사활동', '세부능력', '세부 능력', '행동특성'])
    extractCategory(gradeText, sections, currentGrade, '진로활동', ['봉사활동', '세부능력', '세부 능력', '행동특성'])
    extractCategory(gradeText, sections, currentGrade, '봉사활동', ['세부능력', '세부 능력', '행동특성'])
    extractCategory(gradeText, sections, currentGrade, '행동특성', [])
    
    // 세부능력(세특)은 과목별로 추가 분리
    extractSetuk(gradeText, sections, currentGrade)
  }
  
  return sections
}

function extractCategory(
  gradeText: string,
  sections: Record<string, string>,
  grade: string,
  category: string,
  endMarkers: string[]
): void {
  let pattern: RegExp
  
  if (endMarkers.length > 0) {
    const endPattern = endMarkers.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    pattern = new RegExp(`${category}[\\s\\S]*?(?=${endPattern}|$)`)
  } else {
    pattern = new RegExp(`${category}[\\s\\S]*$`)
  }
  
  const match = gradeText.match(pattern)
  if (match && match[0].length > category.length + 5) {
    const content = match[0].trim()
    if (content.length > 30) {  // 너무 짧은 건 제외
      sections[`${grade} ${category}`] = content
    }
  }
}

// 세특(세부능력 및 특기사항) 과목별 분리
function extractSetuk(
  gradeText: string,
  sections: Record<string, string>,
  grade: string
): void {
  // "세부능력 및 특기사항" 또는 "세부능력" 부분 찾기
  const setukMatch = gradeText.match(/세부능력[\s\S]*?(?=행동특성|$)/)
  if (!setukMatch) return
  
  const setukText = setukMatch[0]
  
  // 과목 키워드 (자주 나오는 것들)
  const subjects = [
    '국어', '수학', '영어', '한국사',
    '통합사회', '통합과학', '한국지리', '세계지리',
    '동아시아사', '세계사', '경제', '정치와법', '사회문화',
    '물리학', '화학', '생명과학', '지구과학',
    '기술가정', '정보', '체육', '음악', '미술',
    '독서', '문학', '화법과작문', '언어와매체',
    '수학Ⅰ', '수학Ⅱ', '미적분', '확률과통계', '기하',
    '영어Ⅰ', '영어Ⅱ', '영어회화', '영어독해와작문',
    '제2외국어', '한문',
    '진로와직업', '심화국어', '심화영어', '실용국어',
  ]
  
  // 과목별로 분리 시도 (단순 버전)
  // "국어:" 또는 "국어\n" 같은 패턴 찾기
  for (const subject of subjects) {
    const escaped = subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`${escaped}\\s*[:\\n][\\s\\S]{50,2000}?(?=${subjects.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|$)`)
    const match = setukText.match(pattern)
    if (match && match[0].length > 50) {
      sections[`${grade} 세특 ${subject}`] = match[0].trim()
    }
  }
  
  // 과목 분리 실패 시 통째로 저장
  if (!Object.keys(sections).some(k => k.startsWith(`${grade} 세특`))) {
    sections[`${grade} 세부능력`] = setukText.trim()
  }
}

// ─────────────────────────────────────────────
// 1단계 백업: GPT로 카테고리 분류
// ─────────────────────────────────────────────
async function parseSaenggibuByGPT(
  text: string,
  apiKey: string
): Promise<Record<string, string>> {
  const prompt = `다음은 한국 고등학교 생기부(학교생활기록부)의 OCR 텍스트야.
학년별, 카테고리별로 분류해서 JSON으로 반환해.

카테고리:
- 자율활동
- 동아리활동
- 진로활동
- 봉사활동
- 세부능력 및 특기사항 (세특) - 과목별로 분리
- 행동특성 및 종합의견 (행특)

JSON 형식 (key는 정확히 다음 형식 사용):
{
  "1학년 자율활동": "원문 텍스트",
  "1학년 동아리활동": "원문 텍스트",
  "1학년 진로활동": "원문 텍스트",
  "1학년 세특 수학": "원문 텍스트",
  "1학년 세특 정보": "원문 텍스트",
  "1학년 행동특성": "원문 텍스트",
  "2학년 ...": "...",
  "3학년 ...": "..."
}

원문은 OCR 결과 그대로 보존. 해당 항목 없으면 키 자체를 제외.

[OCR 텍스트]
${text}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: '너는 한국 고등학교 생기부 분석 전문가야. JSON만 반환해.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`GPT 분류 실패: ${errText.substring(0, 300)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('GPT 분류 응답 없음')

  return JSON.parse(content)
}

// ─────────────────────────────────────────────
// 2단계: 카테고리별로 활동 단위 질문 생성
// ─────────────────────────────────────────────
async function generateQuestionsForCategory(
  category: string,
  categoryText: string,
  majorDept: string,
  apiKey: string
): Promise<any[]> {
  const prompt = `너는 한국 대학 입시 면접 전문가야.
다음 학생 생기부의 "${category}" 부분을 보고, 활동 단위로 면접 예상 질문을 만들어줘.

[학생 정보]
- 지원학과: ${majorDept}

[규칙]
1. 이 카테고리 안에 있는 활동을 모두 찾아. (한 카테고리에 활동 여러 개 있을 수 있음)
2. 각 활동마다 질문 1개씩 만들어. 활동 단위로 1대1 매칭.
3. 활동이 ${majorDept}와 관련 있을 때만 질문 생성.
   - 학과 관련: 전공 직접 연관, 또는 인성/리더십/탐구자세 등 모든 학과 공통 역량
   - 학과 무관: 완전히 동떨어진 활동
4. 질문은 면접관이 실제로 물을법한 구체적 질문으로.
   - "그 활동에서 무엇을 배웠나요?" 같은 일반적 질문 X
   - 활동 내용에 기반한 구체적 질문 O
5. 학과 관련 활동이 하나도 없으면 빈 배열 [] 반환.

[입력]
${category}:
"""
${categoryText}
"""

[출력 - JSON 배열]
{
  "questions": [
    {
      "source_subject": "활동 이름 (간단히)",
      "source_text": "활동 원문 일부 (생기부 그대로 발췌, 100자 이내)",
      "question": "면접 질문 (한 문장)",
      "purpose": ["질문 의도 1", "질문 의도 2"],
      "tag": "${category}",
      "difficulty": 3
    }
  ]
}

questions 배열만 반환해. 다른 텍스트 X.
학과 관련 없으면 questions: [] 반환.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: '너는 입시 면접 전문가야. JSON만 반환해.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[${category}] GPT 호출 실패:`, errText.substring(0, 200))
      return []  // 실패해도 다른 카테고리는 계속
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return []

    const parsed = JSON.parse(content)
    const questions = parsed.questions || []
    
    console.log(`[${category}] ${questions.length}개 질문 생성`)
    return questions
  } catch (err) {
    console.error(`[${category}] 에러:`, err)
    return []  // 한 카테고리 실패해도 나머지 진행
  }
}

// ─────────────────────────────────────────────
// 메인 핸들러
// ─────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY가 설정되지 않았습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { saenggibuText, majorDept } = await req.json()

    if (!saenggibuText || !majorDept) {
      return new Response(
        JSON.stringify({ error: 'saenggibuText와 majorDept가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[시작] 학과: ${majorDept}, 텍스트: ${saenggibuText.length}자`)

    // ─── 1단계: 카테고리 분류 ───
    let sections: Record<string, string> = {}
    
    // 1-1: 정규식 시도
    sections = parseSaenggibuByRegex(saenggibuText)
    console.log(`[정규식 분류] ${Object.keys(sections).length}개 카테고리`)
    
    // 1-2: 정규식 실패 시 GPT 백업
    if (Object.keys(sections).length < 3) {
      console.log('[정규식 부족] GPT로 백업 분류 시도')
      try {
        sections = await parseSaenggibuByGPT(saenggibuText, apiKey)
        console.log(`[GPT 분류] ${Object.keys(sections).length}개 카테고리`)
      } catch (err) {
        console.error('GPT 분류 실패:', err)
      }
    }

    if (Object.keys(sections).length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: '생기부에서 카테고리를 분류하지 못했어요. PDF가 정상인지 확인해주세요.',
          sections: {},
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 분류 결과 로그
    console.log('[분류된 카테고리]:')
    Object.entries(sections).forEach(([k, v]) => {
      console.log(`  - ${k}: ${v.length}자`)
    })

    // ─── 2단계: 카테고리별 병렬 GPT 호출 ───
    const categoryEntries = Object.entries(sections).filter(([_, text]) => text.length > 30)
    console.log(`[질문 생성 시작] ${categoryEntries.length}개 카테고리 병렬 처리`)

    const questionPromises = categoryEntries.map(([category, text]) =>
      generateQuestionsForCategory(category, text, majorDept, apiKey)
    )
    
    const results = await Promise.all(questionPromises)
    const allQuestions = results.flat()

    console.log(`[완료] 총 ${allQuestions.length}개 질문 생성됨`)

    return new Response(
      JSON.stringify({
        success: true,
        questions: allQuestions,
        categoryCount: categoryEntries.length,
        sectionsInfo: Object.fromEntries(
          Object.entries(sections).map(([k, v]) => [k, v.length])
        ),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge Function 에러:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'AI 질문 생성 실패',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})