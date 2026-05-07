// supabase/functions/past-analyze/index.ts
// ===============================================
// 🎓 기출문제 1차 답변 분석 (학교별 평가 기준 적용)
// ===============================================
// 입력: university, department, question, studentAnswer
// 처리: university_meta + university_weights 조회
//       → 학교별 메타 + 가중치 0 아닌 항목만 프롬프트 주입
//       → GPT-4o로 분석
// 출력: { success, analysis: { evalCriteria, scores[], summary, strengths[], improvements[], tailSuggestions[] } }

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

// 9개 평가 항목 매핑
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
  // CORS preflight
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

    // ============================================
    // 1️⃣ 학교 메타 + 가중치 조회
    // ============================================
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const [metaRes, weightsRes] = await Promise.all([
      supabase
        .from('university_meta')
        .select('*')
        .eq('university_name', university)
        .maybeSingle(),
      supabase
        .from('university_weights')
        .select('*')
        .eq('university_name', university)
        .maybeSingle(),
    ])

    const meta = metaRes.data
    const weights = weightsRes.data

    // ============================================
    // 2️⃣ 가중치 0 아닌 항목만 추출 (✨ 핵심)
    // ============================================
    const activeFields = weights
      ? FIELD_MAP
          .map(f => ({ label: f.label, weight: (weights as any)[f.col] || 0 }))
          .filter(f => f.weight > 0)
      : []

    // 활성 항목이 하나도 없으면 fallback (인성/전공적합성/학업역량 균등)
    if (activeFields.length === 0) {
      activeFields.push(
        { label: '인성', weight: 33 },
        { label: '전공적합성', weight: 34 },
        { label: '학업역량', weight: 33 },
      )
    }

    // ============================================
    // 3️⃣ 학교별 프롬프트 구성
    // ============================================
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
      .map(f => `    { "label": "${f.label}", "score": (0~${f.weight} 사이 정수), "max": ${f.weight}, "desc": "이 항목에 대한 평가 한 줄" }`)
      .join(',\n')

    const systemPrompt = `당신은 ${university} 면접 평가 전문가입니다.
${schoolMetaSection}

【평가 항목 (이 항목들만 평가, 다른 항목 무시)】
${fieldsSection}

【반드시 반영할 사항】
1. ${university}의 면접관 관점과 출제 특징을 반영해 평가
2. 위 평가 항목들만 점수 매김 (다른 항목은 절대 포함 X)
3. 학생 답변에서 각 항목의 근거를 찾아 desc에 짧게 작성
4. evalCriteria에는 ${university}만의 평가 기준을 자연스러운 한 문장으로 요약
5. summary는 ${university} 면접관 입장에서의 종합 평가 (3~5문장)
6. strengths(강점)는 답변에서 잘 드러난 부분 2~3개 (구체적으로)
7. improvements(개선 포인트)는 보완 필요한 부분 2~4개 (실행 가능한 조언)
8. tailSuggestions(사유하는 질문)는 활성 평가 항목에 맞춘 후속 질문 4개`

    const userPrompt = `질문: ${question}

학과: ${department || '(미지정)'}

학생 답변:
${studentAnswer}

위 답변을 ${university} 면접 기준으로 분석하고, 아래 JSON 형식으로 응답:

{
  "evalCriteria": "${university}만의 평가 기준 한 문장",
  "scores": [
${fieldsScoreFormat}
  ],
  "summary": "종합 평가 3~5문장",
  "strengths": ["강점1", "강점2", "강점3"],
  "improvements": ["개선1", "개선2", "개선3"],
  "tailSuggestions": ["질문1", "질문2", "질문3", "질문4"]
}

⚠️ scores 배열에는 위에 명시된 항목들만 들어가야 합니다. 다른 항목 추가 금지.`

    // ============================================
    // 4️⃣ OpenAI 호출
    // ============================================
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

    // ============================================
    // 5️⃣ 응답 검증 — scores에 활성 항목만 있는지 확인 (안전장치)
    // ============================================
    if (Array.isArray(analysis.scores)) {
      const activeLabels = activeFields.map(f => f.label)
      analysis.scores = analysis.scores.filter((s: any) => activeLabels.includes(s.label))
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