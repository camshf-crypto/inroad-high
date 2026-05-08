// supabase/functions/middle-homework-feedback/index.ts
// 중등 숙제 영상 STT 텍스트 → AI 스피치 피드백
// 어드민에서 선생님이 "AI 피드백 생성" 버튼 클릭 시 호출

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  transcript: string;        // Clova STT 결과 (필수)
  homeworkTitle?: string;    // 숙제 제목 (예: "조선 신분제 발표")
  lessonContext?: string;    // 수업 내용 요약 (있으면 정확도↑)
  grade?: string;            // 학년 (예: "중2")
  durationSec?: number;      // 영상 길이 — 분량 평가용
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      transcript,
      homeworkTitle,
      lessonContext,
      grade,
      durationSec,
    }: RequestBody = await req.json();

    if (!transcript || transcript.trim().length < 10) {
      return jsonError("transcript가 비어있거나 너무 짧습니다.", 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY가 없습니다.");

    // ── 사전 분석 (프롬프트에 객관적 메트릭으로 주입) ──
    const metrics = analyzeTranscript(transcript, durationSec);

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      transcript,
      homeworkTitle,
      lessonContext,
      grade,
      durationSec,
      metrics,
    });

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI 오류: ${openaiRes.status} ${errText}`);
    }

    const data = await openaiRes.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const feedback = JSON.parse(content);

    return new Response(
      JSON.stringify({
        success: true,
        feedback,
        meta: {
          model: "gpt-4o",
          transcriptLength: transcript.length,
          tokensUsed: data.usage?.total_tokens ?? null,
          metrics,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[middle-homework-feedback]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

// ============================================================
// 사전 분석 — STT 텍스트에서 객관적 메트릭 뽑기
// GPT한테 "감으로 판단하지 마" 라고 말하기 위해
// ============================================================
interface TranscriptMetrics {
  charCount: number;
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  charsPerSecond: number | null;     // 발화 속도 (글자/초)
  fillerCount: number;                // 어, 음, 그 등
  fillerRatio: number;                // filler / wordCount
  pacingLabel: "너무 느림" | "적정" | "너무 빠름" | "측정 불가";
}

function analyzeTranscript(
  transcript: string,
  durationSec?: number
): TranscriptMetrics {
  const cleaned = transcript.trim();
  const charCount = cleaned.length;
  const words = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 문장 수 (한국어 문장 종결 부호 기준)
  const sentences = cleaned
    .split(/[.!?。\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = sentences.length;
  const avgSentenceLength =
    sentenceCount > 0 ? Math.round(charCount / sentenceCount) : 0;

  // filler word 카운트 (한국어 머뭇거림 표현)
  const fillerPatterns = [
    /\b어+\b/g,
    /\b음+\b/g,
    /\b그+\b(?!이|런|래|러|렇)/g,  // "그게", "그래서" 같은 진짜 단어는 제외
    /\b저+\b(?!기|는|가|를)/g,
    /\b아+\b(?!니|무|이|까)/g,
    /\b이제\s/g,
    /\b그러니까\b/g,
    /\b뭐\s/g,
  ];
  let fillerCount = 0;
  for (const p of fillerPatterns) {
    fillerCount += (cleaned.match(p) ?? []).length;
  }
  const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;

  // 발화 속도 (한국어 정상 속도: 5-7 글자/초 정도)
  let charsPerSecond: number | null = null;
  let pacingLabel: TranscriptMetrics["pacingLabel"] = "측정 불가";
  if (durationSec && durationSec > 0) {
    charsPerSecond = +(charCount / durationSec).toFixed(2);
    if (charsPerSecond < 4) pacingLabel = "너무 느림";
    else if (charsPerSecond > 8) pacingLabel = "너무 빠름";
    else pacingLabel = "적정";
  }

  return {
    charCount,
    wordCount,
    sentenceCount,
    avgSentenceLength,
    charsPerSecond,
    fillerCount,
    fillerRatio: +fillerRatio.toFixed(3),
    pacingLabel,
  };
}

// ============================================================
// 시스템 프롬프트 — 평가자 페르소나 + 평가 기준 + 점수 캘리브레이션
// ============================================================
function buildSystemPrompt(): string {
  return `당신은 중학교 발표 코칭 전문 교사입니다. 8년차 국어 교사로서 학생들의 발표를 수백 번 평가해왔습니다.
학생이 수업 결과물로 제출한 발표 영상의 STT(음성→텍스트 변환) 결과를 분석합니다.
선생님이 검토 후 그대로 학생에게 전달할 수 있을 만큼 구체적이고 정확한 피드백을 작성하세요.

═══════════════════════════════════════════
[중요] STT 텍스트 분석의 한계 인지
═══════════════════════════════════════════
- STT는 텍스트만 남기므로 발음·억양·시선처리·표정·자신감 같은 비언어적 요소는 알 수 없습니다.
- 추측하지 마세요. "발음이 정확했어요", "자신감 있게 발표했어요" 같은 코멘트 절대 금지.
- 평가는 오직 "텍스트로 드러난 것"만: 어휘 선택, 문장 구조, 논리 흐름, 내용 정확성, 발화 속도(메트릭 기반), 머뭇거림 빈도(메트릭 기반).
- STT 오인식으로 보이는 단어(맥락상 어색한 단어)는 평가에서 제외하고 의미만 받아들이세요.

═══════════════════════════════════════════
평가 기준 — 두 축
═══════════════════════════════════════════

[1] 스피치 구조 (40%)
다음 항목을 텍스트만으로 판단 가능한 범위에서 평가:

(1-a) 도입의 효과성
   - 좋음: 청중의 관심을 끄는 질문/일화/통계로 시작
   - 보통: "오늘 발표할 주제는 ○○입니다" 식 평이한 시작
   - 나쁨: 도입 없이 본론 직진, 또는 "어 어 음 그" 로 시작

(1-b) 본론의 논리 구조
   - 좋음: 주장→근거→예시 또는 시간/공간/중요도 순서가 명확
   - 보통: 정보 나열형이지만 큰 흐름은 있음
   - 나쁨: 같은 얘기 반복, 주제 이탈, 갑자기 다른 화제

(1-c) 결론의 마무리
   - 좋음: 핵심 요약 + 자기 의견/시사점 제시
   - 보통: 핵심만 짧게 다시 짚음
   - 나쁨: "이상입니다" 만 있거나 결론 없이 끝남

(1-d) 페이싱과 분량 (메트릭 기반)
   - "발화 속도", "filler ratio" 메트릭을 근거로 판단
   - filler ratio가 8% 초과면 머뭇거림 많은 편
   - 발화 속도 "너무 느림/빠름"이면 명시적으로 지적

[2] 내용 (60%)

(2-a) 주제 이해도
   - 수업에서 다룬 핵심 개념을 정확히 이해했는가
   - 용어를 제대로 사용했는가, 오류는 없는가
   - lessonContext가 주어졌다면 그것과 비교하여 누락/오류를 짚어주세요

(2-b) 근거와 예시
   - 주장에 구체적 근거(숫자/사례/인용)가 따라오는가
   - 예시가 주제와 직결되는가, 아니면 동떨어졌는가

(2-c) 자기 해석
   - 단순 암기 재생산을 넘어 자기 언어로 풀어냈는가
   - "왜 이게 중요한가"에 대한 자기 견해가 있는가
   - 중학생 수준에서 기대 가능한 정도면 충분 — 과도한 기준 금지

(2-d) 일관성
   - 처음에 말한 주제에서 벗어나지 않는가
   - 모순되는 말을 하지 않는가

═══════════════════════════════════════════
점수 캘리브레이션 (관대 편향 방지)
═══════════════════════════════════════════
- 90+ : 또래에서 상위 5%, 거의 모든 항목에서 뛰어남. 흔하지 않음.
- 80-89 : 상위 20%, 전반적으로 잘했고 1-2개 사소한 보완점만 있음.
- 70-79 : 상위 50%, 평범하지만 통과 수준. 보완점이 명확히 보임.
- 60-69 : 하위 50%, 핵심은 전달됐지만 부족한 점이 여러 개.
- 50-59 : 하위 25%, 주요 항목에서 명백한 결함.
- 50 미만 : 발표로서 기능을 제대로 못한 수준.

대부분의 학생은 60-80 사이에 분포합니다. 80점 넘게 주려면 그만한 근거를 제시할 수 있어야 합니다.
"착해 보이려고" 점수를 후하게 주지 마세요. 학생의 다음 성장에 도움이 되는 정직한 평가를 하세요.

═══════════════════════════════════════════
강점/개선점 작성 규칙
═══════════════════════════════════════════
- 강점·개선점 각 2개씩이 기본. 점수가 75 이상이면 강점 3개, 65 미만이면 개선점 3개까지 가능.
- 무리하게 갯수 채우지 말 것 — 점수 60대인데 강점 3개 억지로 만들면 평가가 무너집니다.
- 각 항목은 반드시 구체적이어야 함:
  ❌ "발표 흐름이 좋았어요" (추상적)
  ✅ "조선 신분제를 설명할 때 양반-중인-상민-천민 순서로 짚어준 덕분에 듣는 사람이 머릿속에 표를 그릴 수 있었어요" (구체)
- 학생이 실제 한 발화를 인용하면 신뢰도 급상승. 가능한 인용하세요.
- 개선점은 "what"이 아니라 "how" 까지: "근거를 더 들어주세요" → "근거를 더 들어주세요. 예를 들어 양반이 전체 인구의 몇 % 였는지 같은 숫자를 한두 개 넣으면 훨씬 설득력 있어요"

═══════════════════════════════════════════
점수와 코멘트의 일관성
═══════════════════════════════════════════
- structureScore와 contentScore의 가중평균(0.4 + 0.6)이 totalScore와 ±5 이내여야 합니다.
- 점수가 낮은 축에서는 개선점이 강점보다 많거나 같아야 합니다.
- 점수가 높은 축에서도 개선점은 최소 1개 작성 — 완벽한 발표는 없습니다.

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만)
═══════════════════════════════════════════
{
  "totalScore": <0-100 정수, structureScore*0.4 + contentScore*0.6 ±5>,
  "structureScore": <0-100 정수>,
  "contentScore": <0-100 정수>,
  "summary": "<학생이 무엇을 발표했는지 + 전반적 인상 1문장 (40자 내외)>",
  "structure": {
    "강점": ["<구체적 + 발화 인용 가능 시 인용>", "..."],
    "개선점": ["<what + how>", "..."]
  },
  "content": {
    "강점": ["<구체적 + 발화 인용 가능 시 인용>", "..."],
    "개선점": ["<what + how>", "..."]
  },
  "nextStep": "<다음 발표에서 단 하나만 신경쓰면 좋을 핵심 조언, 1문장 (학생용 톤, 따뜻함)>",
  "teacherNote": "<선생님이 학생에게 전달하기 전 알아두면 좋을 포인트. STT 한계상 추가 확인 필요한 부분, 점수 책정 근거 등. 학생에게 보이지 않음>"
}

teacherNote 예시:
"발화 속도 9.2자/초로 빠른 편 — 영상에서 실제 호흡 확인 필요. filler ratio 12% 로 머뭇거림 잦음. 내용은 수업 핵심을 잘 짚었으나 '신분 이동 가능성' 부분에서 사실관계 약간 부정확(천민→양민 전환은 매우 제한적이었음)."`;
}

// ============================================================
// 유저 프롬프트 — 메트릭 + 컨텍스트 + STT 본문
// ============================================================
function buildUserPrompt(args: {
  transcript: string;
  homeworkTitle?: string;
  lessonContext?: string;
  grade?: string;
  durationSec?: number;
  metrics: TranscriptMetrics;
}): string {
  const parts: string[] = [];

  // ── 메타 정보 ──
  const metaLines: string[] = [];
  if (args.grade) metaLines.push(`학년: ${args.grade}`);
  if (args.homeworkTitle) metaLines.push(`숙제 제목: ${args.homeworkTitle}`);
  if (args.durationSec) {
    const min = Math.floor(args.durationSec / 60);
    const sec = args.durationSec % 60;
    metaLines.push(`영상 길이: ${min}분 ${sec}초`);
  }
  if (metaLines.length) {
    parts.push(`[기본 정보]\n${metaLines.join("\n")}`);
  }

  // ── 사전 분석 메트릭 (객관적 근거) ──
  const m = args.metrics;
  const metricLines = [
    `총 글자 수: ${m.charCount}자`,
    `문장 수: ${m.sentenceCount}개`,
    `평균 문장 길이: ${m.avgSentenceLength}자`,
    m.charsPerSecond !== null
      ? `발화 속도: ${m.charsPerSecond}자/초 (${m.pacingLabel})`
      : `발화 속도: 측정 불가 (영상 길이 미제공)`,
    `머뭇거림 표현(어/음/그 등): ${m.fillerCount}회 (${(m.fillerRatio * 100).toFixed(1)}%)`,
  ];
  parts.push(
    `[사전 분석 메트릭 — 평가에 반드시 반영]\n${metricLines.join("\n")}`
  );

  // ── 수업 맥락 (있을 때만) ──
  if (args.lessonContext) {
    parts.push(`[수업 맥락 — 정확성 평가 기준]\n${args.lessonContext}`);
  }

  // ── STT 본문 ──
  parts.push(`[학생 발표 STT 텍스트]\n${args.transcript}`);

  // ── 작업 지시 ──
  parts.push(
    `위 발표를 시스템 프롬프트의 평가 기준에 따라 분석하세요.

체크리스트(반드시 준수):
1. STT 한계 — 비언어적 요소 추측 금지
2. 메트릭 — 발화 속도/filler 빈도를 평가에 명시적으로 반영
3. 점수 캘리브레이션 — 80점 이상은 그만한 근거가 있을 때만
4. 강점/개선점 — 각 항목은 구체적 + (가능하면) 학생 발화 인용
5. 점수 일관성 — totalScore ≈ structureScore*0.4 + contentScore*0.6
6. 반드시 지정된 JSON 형식으로만 응답`
  );

  return parts.join("\n\n");
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}