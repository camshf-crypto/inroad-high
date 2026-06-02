// supabase/functions/past-analyze/index.ts
// ===============================================
// 🎓 기출문제 1차 답변 분석 (학교별 평가 기준 적용)
// 🔥 수정: 100% 한글 강제 + 점수 0/null 항목 자동 제외
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
}

// 9개 평가 항목 매핑 (라벨은 100% 한글)
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
    const { university, department, question, studentAnswer } = body

    if (!university || !question || !studentAnswer) {
      return new Response(
        JSON.stringify({ success: false, error: 'university, question, studentAnswer 필수' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1️⃣ 학교 메타 + 가중치 조회
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const [metaRes, weightsRes] = await Promise.all([
      supabase.from('university_meta').select('*').eq('university_name', university).maybeSingle(),
      supabase.from('university_weights').select('*').eq('university_name', university).maybeSingle(),
    ])

    const meta = metaRes.data
    const weights = weightsRes.data

    // 2️⃣ 가중치 > 0 인 항목만 추출 (0점 항목 자동 제외)
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

    // 3️⃣ 프롬프트 구성
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

    const fieldsSection = activeFields
      .map(f => `- ${f.label}: 만점 ${f.weight}점`)
      .join('\n')

    const fieldsScoreFormat = activeFields
      .map(f => `    { "label": "${f.label}", "score": (1~${f.weight} 사이 정수, 절대 0 금지), "max": ${f.weight}, "desc": "이 항목 평가 한 줄 (한글만)" }`)
      .join(',\n')

    // 🔥 강화된 한글 강제 + 0점 금지 시스템 프롬프트
    const systemPrompt = `당신은 ${university} 면접 평가 전문가입니다.
${schoolMetaSection}

【평가 항목 (이 항목들만 평가, 다른 항목 무시)】
${fieldsSection}

【⚠️ 절대 위반 금지 규칙】
1. 모든 응답은 100% 한글로만 작성 (영어 단어 절대 금지)
2. scores의 label은 반드시 위에 명시된 한글 라벨만 사용
   ✅ 올바른 예: "인성", "전공적합성", "학업역량", "의사소통역량"
   ❌ 절대 금지: "PERSONALITY", "MAJOR_FIT", "ACADEMIC", "COMMUNICATION" 등 영어 표기
3. scores 배열에는 위에 명시된 활성 항목만 포함 (가중치 0인 항목 절대 추가 금지)
4. score 값은 반드시 1점 이상 (0점 금지) - 최소 1점부터 만점까지
5. desc, summary, strengths, improvements, evalCriteria, tailSuggestions 모두 한글로만

【반드시 반영할 사항】
1. ${university}의 면접관 관점과 출제 특징을 반영해 평가
2. 학생 답변에서 각 항목의 근거를 찾아 desc에 짧게 작성 (한글)
3. evalCriteria에는 ${university}만의 평가 기준을 자연스러운 한 문장으로 요약 (한글)
4. summary는 ${university} 면접관 입장에서의 종합 평가 3~5문장 (한글)
5. strengths(강점)는 답변에서 잘 드러난 부분 2~3개 (구체적으로, 한글)
6. improvements(개선 포인트)는 보완 필요한 부분 2~4개 (실행 가능한 조언, 한글)
7. tailSuggestions(사유하는 질문)는 활성 평가 항목에 맞춘 후속 질문 4개 (한글)`

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
  "tailSuggestions": ["질문1 (한글)", "질문2 (한글)", "질문3 (한글)", "질문4 (한글)"]
}

⚠️ 절대 규칙:
- scores 배열에는 위에 명시된 한글 라벨 항목만 포함
- 영어 단어 절대 사용 금지 (PERSONALITY 등 X)
- score 값은 반드시 1 이상 (0 금지)
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

    // 5️⃣ 🔥 응답 검증 강화 - 한글 라벨 + score > 0 + 활성 항목만
    if (Array.isArray(analysis.scores)) {
      const activeLabels = activeFields.map(f => f.label)
      
      // 영어 라벨 → 한글 라벨 매핑 (안전장치)
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
          // 영어 라벨이면 한글로 변환
          if (s.label && englishToKorean[String(s.label).toUpperCase().trim()]) {
            s.label = englishToKorean[String(s.label).toUpperCase().trim()]
          }
          return s
        })
        .filter((s: any) => {
          // 활성 라벨 + score > 0 인 것만 통과
          const isActive = activeLabels.includes(s.label)
          const hasScore = Number(s.score) > 0
          const hasMax = Number(s.max) > 0
          return isActive && hasScore && hasMax
        })
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
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