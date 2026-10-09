// supabase/functions/middle-essay-concept-review/index.ts
// 자소서 마법사 — 컨셉 확인 (선생님용 AI 참고)
//   학생이 3단계에서 컨셉을 고르면 선생님께 넘어간다.
//   선생님이 [AI 피드백]을 누르면 이 함수가 돈다.
//
//   보는 것
//    1) 학생이 고른 컨셉 ↔ 학생이 꺼낸 활동(키워드·경험) : 컨셉을 받쳐 주는 활동이 있는가
//    2) 이 컨셉이 학생에게 어울리는가                    : 활동이 다른 쪽에 몰려 있지 않은가
//   컨셉 출처(진로검사 / 직접 작성 / AI 추천)에 따라 더 볼 곳이 다르다.
//
//   결과는 middle_essay_wizard.concept_review 에 저장한다.
//   철학: 자소서 문장을 쓰지 않는다. 선생님이 판단할 근거만 준다.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface RequestBody {
  essayId: string;
  schoolName?: string;
  concept?: {
    career?: string | null;
    label?: string | null;
    source?: string | null; // test / custom / ai
    fit?: number | null;
  } | null;
  keywords?: { keyword: string; experience: string }[];
  experiences?: { branch: string; text: string }[];
  existingConcept?: {
    career?: string | null;
    major?: string | null;
    typeName?: string | null;
  } | null;
}

const SOURCE_LABEL: Record<string, string> = {
  test: "진로 계열 검사 결과에서 고름",
  custom: "학생이 직접 적음",
  ai: "AI가 경험을 보고 추천한 것 중에서 고름",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();
    if (!body.essayId) return jsonError("essayId가 필요해요.", 400);
    if (!body.concept?.career) return jsonError("학생이 정한 컨셉이 없어요.", 400);

    const exps = (body.experiences ?? []).filter((e) => e.text?.trim());
    if (exps.length < 3) return jsonError("학생이 꺼낸 활동이 너무 적어요.", 400);

    const { feedback, tokensUsed, model } = await callOpenAI({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(body),
      model: "gpt-4o",
      temperature: 0.3,
    });

    const review = normalize(feedback, body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase
      .from("middle_essay_wizard")
      .update({ concept_review: review, concept_review_at: new Date().toISOString() })
      .eq("essay_id", body.essayId);
    if (error) console.error("[middle-essay-concept-review] save", error);

    return jsonResponse({ success: true, review, meta: { model, tokensUsed } });
  } catch (e) {
    console.error("[middle-essay-concept-review]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

const SYSTEM_PROMPT = `너는 특목·자사고 입시 자기소개서를 지도하는 선생님의 조수다.
중학생이 자소서를 쓰기 전에 "컨셉(향하는 직업군)"을 하나 골랐다.
선생님이 이 컨셉으로 진행시킬지, 다시 정하게 할지 판단할 수 있도록 근거를 정리한다.

보는 것
1. 컨셉 ↔ 학생 활동: 학생이 꺼낸 활동 중 이 컨셉을 받쳐 주는 것이 얼마나 있는가
2. 컨셉 ↔ 이 학생: 활동이 다른 쪽에 뚜렷이 몰려 있지 않은가. 그렇다면 더 어울리는 직업군은 무엇인가

컨셉 출처에 따라 더 볼 곳
- 학생이 직접 적음: 멋있어 보여서 골랐는데 받쳐 주는 활동이 실제로 있는지
- 진로 계열 검사: 검사 결과와 지금 활동이 같은 방향인지
- AI 추천: 활동에서 나온 것이라 대체로 맞다. 근거 활동이 너무 적지 않은지만 본다

판정
- "ok"      : 받쳐 주는 활동이 3개 이상이고 방향이 맞다. 이대로 진행해도 된다
- "check"   : 방향은 맞지만 받쳐 주는 활동이 1~2개뿐이다. 진행하되 보충이 필요하다
- "rethink" : 받쳐 주는 활동이 거의 없거나, 활동이 다른 쪽에 뚜렷이 몰려 있다

규칙
- 활동은 입력 목록에 있는 문장을 그대로 인용한다. 지어내지 않는다.
- 중학생 경험이다. 작은 활동이라도 컨셉과 이어지면 인정한다.
- 자소서 문장을 써 주지 않는다.
- 선생님이 읽는 글이다. 짧고 분명하게.
- studentMessage는 선생님이 학생에게 보낼 한마디 초안이다. 중학생에게 말하듯 2~3문장, 존댓말("~요")로 쓴다.

JSON만 응답한다.
{
  "verdict": "ok" | "check" | "rethink",
  "fit": 0~100,
  "headline": "한 줄 판단",
  "summary": "이 컨셉이 학생에게 어울리는지 2~3문장",
  "support": ["컨셉을 받쳐 주는 활동 (목록에서 인용)"],
  "unrelated": ["컨셉과 거리가 먼 활동 (목록에서 인용, 최대 5개)"],
  "gap": "이 컨셉에 비해 부족한 점 한 문장",
  "alternatives": [{ "career": "", "why": "" }],
  "questions": ["선생님이 학생에게 물어볼 질문"],
  "studentMessage": "학생에게 보낼 한마디 초안"
}
- alternatives는 verdict가 "rethink"일 때만 1~2개, 아니면 빈 배열
- questions는 2~3개`;

function buildUserPrompt(body: RequestBody): string {
  const parts: string[] = [];
  const c = body.concept!;

  const head: string[] = [];
  if (body.schoolName) head.push(`지원 학교: ${body.schoolName}`);
  head.push(`학생이 고른 컨셉: ${c.career}`);
  if (c.label) head.push(`컨셉 설명: ${c.label}`);
  head.push(`컨셉 출처: ${SOURCE_LABEL[c.source ?? ""] ?? "알 수 없음"}`);
  parts.push(`[컨셉]\n${head.join("\n")}`);

  const ec = body.existingConcept;
  if (ec && (ec.career || ec.major)) {
    const lines: string[] = [];
    if (ec.career) lines.push(`검사 결과 직업군: ${ec.career}`);
    if (ec.major) lines.push(`관심 계열·학과: ${ec.major}`);
    if (ec.typeName) lines.push(`진로 유형: ${ec.typeName}`);
    parts.push(`[진로 계열 검사 결과]\n${lines.join("\n")}`);
  }

  const kws = (body.keywords ?? []).filter((k) => k.keyword?.trim());
  if (kws.length) {
    parts.push(
      `[학생이 고른 나의 키워드]\n` +
        kws.map((k) => `· ${k.keyword}${k.experience?.trim() ? ` — ${k.experience.trim()}` : ""}`).join("\n"),
    );
  }

  const exps = (body.experiences ?? []).filter((e) => e.text?.trim());
  parts.push(
    `[학생이 꺼낸 활동 — ${exps.length}개]\n` +
      exps.map((e) => `· (${e.branch}) ${e.text.trim()}`).join("\n"),
  );

  parts.push("위 내용을 검토해서 JSON만 응답하라. 활동은 목록에서 그대로 인용하라.");
  return parts.join("\n\n");
}

function normalize(raw: any, body: RequestBody) {
  const arr = (v: any) => (Array.isArray(v) ? v : []);
  return {
    verdict: ["ok", "check", "rethink"].includes(raw.verdict) ? raw.verdict : "check",
    fit: Math.max(0, Math.min(100, Number(raw.fit) || 0)),
    headline: String(raw.headline ?? ""),
    summary: String(raw.summary ?? ""),
    support: arr(raw.support).map(String),
    unrelated: arr(raw.unrelated).slice(0, 5).map(String),
    gap: String(raw.gap ?? ""),
    alternatives: arr(raw.alternatives)
      .slice(0, 2)
      .map((a: any) => ({ career: String(a.career ?? ""), why: String(a.why ?? "") }))
      .filter((a: any) => a.career),
    questions: arr(raw.questions).slice(0, 3).map(String),
    studentMessage: String(raw.studentMessage ?? ""),
    // 어떤 컨셉을 보고 판단했는지 — 학생이 바꾸면 화면에서 "예전 분석"으로 표시
    career: body.concept?.career ?? "",
  };
}