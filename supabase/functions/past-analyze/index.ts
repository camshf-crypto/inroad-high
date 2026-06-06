// supabase/functions/past-analyze/index.ts
// ===============================================
// 🎓 기출문제 1차 답변 분석 (학교별 평가 기준 + 진로 컨셉 검증)
// 🔥 수정: 한글 강제 + 0점 제외 + 학생 진로 컨셉 일치 검증 (최신 1개만)
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
  university: string
  department: string
  question: string
  studentAnswer: string
  studentId?: string
}

const FIELD_MAP = [
  { col: 'score_personality', label: '인성' },
  { col: 'score_major_fit', label: '전공적합성' },
  { col: 'score_academic', label: '학업역량' },
  { col: 'score_communication', label: '의사소통역량' },
  { col: 'score_community', label: '공동체역량' },
  { col: 'score_career', label: '진로' },
  { col: 'score_self_directed', label: '자기주도' },
  { col: 'score_admission_fit', label: '전형취지적합성' },
  { col: 'score_security', label: '안보관' },
] as const

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()
    const { university, department, question, studentAnswer, studentId } = body

    if (!university || !question || !studentAnswer) {
      return new Response(
        JSON.stringify({ success: false, error: 'university, question, studentAnswer 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1️⃣ 학교 메타 + 가중치 + 🔥 학생 진로 컨셉 동시 조회 (최신 1개만)
    const [metaRes, weightsRes, conceptRes] = await Promise.all([
      supabase.from('university_meta').select('*').eq('university_name', university).maybeSingle(),
      supabase.from('university_weights').select('*').eq('university_name', university).maybeSingle(),
      studentId
        ? supabase.from('student_concept')
            .select('type_code, type_name, major, career, keywords, custom_goal')
            .eq('student_id', studentId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })   // 🔥 최신순 정렬
            .limit(1)                                      // 🔥 1개만
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const meta = metaRes.data
    const weights = weightsRes.data
    const concept = conceptRes.data

    // 2️⃣ 가중치 > 0 인 항목만
    const activeFields = weights
      ? FIELD_MAP
          .map(f => ({ label: f.label, weight: Number((weights as any)[f.col]) || 0 }))
          .filter(f => f.weight > 0)
      : []

    if (activeFields.length === 0) {
      activeFields.push(
        { label: '인성', weight: 33 },
        { label: '전공적합성', weight: 34 },
        { label: '학업역량', weight: 33 },
      )
    }

    // 3️⃣ 학교 메타 섹션
    const schoolMetaSection = meta ? `
═══════════════════════════════════════════
📌 ${university} 면접 평가 기준
═══════════════════════════════════════════

【면접관 핵심 관점】
${meta.interviewer_perspective || '(정보 없음)'}

【질문 출제 특징】
${meta.question_style || '(정보 없음)'}

【고득점 답변 구성】
${meta.high_score_structure || '(정보 없음)'}

【선호하는 학생 유형】
${meta.preferred_student_type || '(정보 없음)'}

【평가 톤】
${meta.evaluation_tone || '(정보 없음)'}
═══════════════════════════════════════════
` : `\n(${university}의 학교별 평가 기준 데이터 없음 — 일반 기준으로 분석)\n`

    // 🔥 학생 진로 컨셉 섹션
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

    const fieldsSection = activeFields
      .map(f => `- ${f.label}: 만점 ${f.weight}점`)
      .join('\n')

    const fieldsScoreFormat = activeFields
      .map(f => `    { "label": "${f.label}", "score": (1~${f.weight} 사이 정수, 절대 0 금지), "max": ${f.weight}, "desc": "이 항목 평가 한 줄 (한글만)" }`)
      .join(',\n')

    const systemPrompt = `당신은 ${university} 면접 평가 전문가입니다.
${schoolMetaSection}
${conceptSection}

【평가 항목 (이 항목들만 평가, 다른 항목 무시)】
${fieldsSection}

【⚠️ 절대 위반 금지 규칙】
1. 모든 응답은 100% 한글로만 작성 (영어 단어 절대 금지)
2. scores의 label은 반드시 위에 명시된 한글 라벨만 사용
   ✅ 올바른 예: "인성", "전공적합성", "학업역량", "의사소통역량"
   ❌ 절대 금지: "PERSONALITY", "MAJOR_FIT", "ACADEMIC" 등 영어 표기
3. scores 배열에는 위에 명시된 활성 항목만 포함 (가중치 0인 항목 절대 추가 금지)
4. score 값은 반드시 1점 이상 (0점 금지) - 최소 1점부터 만점까지
5. 모든 텍스트는 한글로만

【반드시 반영할 사항】
1. ${university}의 면접관 관점과 출제 특징을 반영해 평가
2. 학생 답변에서 각 항목의 근거를 찾아 desc에 짧게 작성 (한글)
3. evalCriteria에는 ${university}만의 평가 기준을 자연스러운 한 문장으로 요약 (한글)
4. summary는 ${university} 면접관 입장에서의 종합 평가 3~5문장 (한글)
5. strengths(강점)는 답변에서 잘 드러난 부분 2~3개 (구체적으로, 한글)
6. improvements(개선 포인트)는 보완 필요한 부분 2~4개 (실행 가능한 조언, 한글)
7. tailSuggestions(사유하는 질문)는 활성 평가 항목에 맞춘 후속 질문 4개 (한글)
${concept ? `
【🎯 진로 컨셉 일치 검증 (필수)】
학생은 "${concept.type_name}" 유형이고, "${concept.major}" 지망, "${concept.career}" 목표입니다.
이 답변이 학생의 진로 컨셉과 얼마나 일치하는지 반드시 분석하세요:

1. isAligned: 답변이 컨셉과 일치하는지 (true/false)
2. matchLevel: "높음" / "보통" / "낮음" 중 하나
3. alignmentReason: 답변에서 학생의 진로 컨셉과 일치하는 부분을 구체적으로 설명 (3~5문장, 한글)
4. misalignment: 답변이 진로 컨셉과 어긋나거나 부족한 부분을 구체적으로 지적 (3~5문장, 한글)
   - 예: "답변에서 '${concept.major}' 분야에 대한 구체적 관심이 드러나지 않음"
   - 예: "${concept.type_name} 유형의 강점인 ○○이 답변에 부각되지 않음"
5. improvement: 진로 컨셉에 맞게 답변을 보완하려면 어떻게 해야 하는지 구체적 조언 (3~5문장, 한글)
` : ''}`

    const userPrompt = `질문: ${question}

학과: ${department || '(미지정)'}

학생 답변:
${studentAnswer}

위 답변을 ${university} 면접 기준으로 분석하고, 아래 JSON 형식으로 응답:

{
  "evalCriteria": "${university}만의 평가 기준 한 문장 (한글)",
  "scores": [
${fieldsScoreFormat}
  ],
  "summary": "종합 평가 3~5문장 (한글)",
  "strengths": ["강점1 (한글)", "강점2 (한글)", "강점3 (한글)"],
  "improvements": ["개선1 (한글)", "개선2 (한글)", "개선3 (한글)"],
  "tailSuggestions": ["질문1 (한글)", "질문2 (한글)", "질문3 (한글)", "질문4 (한글)"]${concept ? `,
  "conceptCheck": {
    "isAligned": true 또는 false,
    "matchLevel": "높음" 또는 "보통" 또는 "낮음",
    "alignmentReason": "답변에서 학생의 진로 컨셉과 일치하는 부분 3~5문장 (한글)",
    "misalignment": "답변이 진로 컨셉과 어긋나거나 부족한 부분 3~5문장 (한글, 일치 시에도 보완점 작성)",
    "improvement": "진로 컨셉에 맞게 답변을 보완하는 방법 3~5문장 (한글)"
  }` : ''}
}

⚠️ 절대 규칙:
- 영어 단어 절대 사용 금지 (PERSONALITY 등 X)
- score 값은 반드시 1 이상 (0 금지)
- scores 배열에는 위에 명시된 한글 라벨 항목만 포함
- JSON 외 다른 텍스트 절대 금지`

    // 4️⃣ OpenAI 호출
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

    // 5️⃣ 응답 검증 - 영어→한글 + 0점 제외
    if (Array.isArray(analysis.scores)) {
      const activeLabels = activeFields.map(f => f.label)

      const englishToKorean: Record<string, string> = {
        'PERSONALITY': '인성',
        'MAJOR_FIT': '전공적합성',
        'ACADEMIC': '학업역량',
        'COMMUNICATION': '의사소통역량',
        'COMMUNITY': '공동체역량',
        'CAREER': '진로',
        'SELF_DIRECTED': '자기주도',
        'ADMISSION_FIT': '전형취지적합성',
        'SECURITY': '안보관',
      }

      analysis.scores = analysis.scores
        .map((s: any) => {
          if (s.label && englishToKorean[String(s.label).toUpperCase().trim()]) {
            s.label = englishToKorean[String(s.label).toUpperCase().trim()]
          }
          return s
        })
        .filter((s: any) => {
          const isActive = activeLabels.includes(s.label)
          const hasScore = Number(s.score) > 0
          const hasMax = Number(s.max) > 0
          return isActive && hasScore && hasMax
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        hasConcept: !!concept,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('past-analyze error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})