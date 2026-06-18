// supabase/functions/debate-feedback/index.ts
// AI 토론 - 종료 후 최종 피드백(4항목 채점 + 선생님 초안) 생성

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

const stanceKo = (s: string) => (s === "pro" ? "찬성" : s === "con" ? "반대" : "중립");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  try {
    const { topic, studentStance, messages, studentName } = await req.json();
    if (!topic || !Array.isArray(messages)) return jsonError("topic, messages가 필요합니다.", 400);

    const studentLines = messages
      .filter((m: { speaker: string }) => m.speaker === "student")
      .map((m: { text: string }, i: number) => `${i + 1}. ${m.text}`)
      .join("\n");

    const transcript = messages
      .map((m: { speaker: string; text: string }) =>
        `${m.speaker === "ai" ? "서연(AI)" : "학생"}: ${m.text}`,
      )
      .join("\n");

    const systemPrompt = `너는 중학생 토론을 평가하는 친절한 토론 코치야.
학생은 자사고/특목고 입시를 준비하는 중학생이고, 방금 AI와 1:1 토론을 마쳤어.
IB 토론 평가 방식을 참고하되, 중학생 눈높이로 쉽고 따뜻하게 평가해.

[평가 4항목] — 각 항목 1~5점 (5점 만점)
1. 주장 (Claim): 자기 입장을 명확하게 밝혔는가
2. 근거 (Evidence): 주장을 뒷받침하는 구체적 근거/사례를 들었는가
3. 논리 (Warrant): 근거와 주장이 논리적으로 잘 연결됐는가
4. 반박 대응 (Rebuttal): 상대(서연)의 반박에 잘 대응했는가

[채점 기준]
- 5점: 또래 중 매우 우수 / 4점: 잘함 / 3점: 보통 / 2점: 부족 / 1점: 많이 부족
- 후하지도 박하지도 않게, 발언 내용에 근거해서 정직하게.
- 발언이 거의 없으면 낮은 점수. 발언이 적으면 그 사실을 반영.

[각 항목마다 채워야 할 것]
- name: 항목 한글 이름 (예: "주장")
- term: 영어 용어 (예: "Claim")
- theory: 이 항목이 뭔지 중학생에게 1문장 설명
- score: 1~5 정수
- quote: 학생의 실제 발언 중 이 항목과 관련된 부분 1개 인용 (없으면 "")
- good: 잘한 점 1문장 (없으면 "")
- bad: 아쉬운 점 1문장 (없으면 "")
- tip: 다음엔 이렇게 해보라는 구체적 조언 1문장

[종합]
- grade: A/B/C/D (4항목 합산 16~20=A, 12~15=B, 8~11=C, 4~7=D)
- summary: 전체 총평 2~3문장, 따뜻하고 격려하는 말투

[선생님 피드백 초안 - teacherDraft]
- 선생님(원장)이 학생에게 그대로 전달할 수 있는 피드백 초안 작성.
- 300~450자. "~했어요/~해봐요" 친근한 코치 말투.
- 구조: [총평] 2문장 -> [잘한 점] 구체적으로 1~2개 -> [더 연습할 점] 1~2개 + 어떻게 -> [격려] 1문장.
- 학생 실제 발언을 언급하면 더 좋음.
${studentName ? `- 학생 이름은 "${studentName}"이야. "${studentName}님," 으로 시작해도 좋아.` : ""}

반드시 아래 JSON 형식으로만 응답:
{
  "overall": { "grade": "B", "summary": "..." },
  "criteria": [
    { "name": "주장", "term": "Claim", "theory": "...", "score": 4, "quote": "...", "good": "...", "bad": "...", "tip": "..." },
    { "name": "근거", "term": "Evidence", "theory": "...", "score": 3, "quote": "...", "good": "...", "bad": "...", "tip": "..." },
    { "name": "논리", "term": "Warrant", "theory": "...", "score": 4, "quote": "...", "good": "...", "bad": "...", "tip": "..." },
    { "name": "반박 대응", "term": "Rebuttal", "theory": "...", "score": 3, "quote": "...", "good": "...", "bad": "...", "tip": "..." }
  ],
  "teacherDraft": "선생님이 학생에게 전달할 피드백 초안 (300~450자)"
}`;

    const userPrompt = `토론 주제: "${topic}"
학생 입장: ${stanceKo(studentStance)}
${studentName ? `학생 이름: ${studentName}` : ""}

[전체 토론 내용]
${transcript}

[학생 발언만 모음]
${studentLines || "(학생 발언이 거의 없음)"}

위 토론을 평가해서 JSON으로 응답해줘.`;

    const { feedback } = await callOpenAI({
      systemPrompt,
      userPrompt,
      model: "gpt-4o",
      temperature: 0.4,
    });

    return jsonResponse({ success: true, feedback });
  } catch (e) {
    console.error("[debate-feedback]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});