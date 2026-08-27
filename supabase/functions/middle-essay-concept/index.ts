// supabase/functions/middle-essay-concept/index.ts
// 자소서 마법사 — 컨셉(직업군) 단계
//   학생이 적은 키워드·경험 더미를 읽고 직업군 후보를 "역산"한다.
//   중학생에게 "너 직업 뭐야?"를 먼저 묻지 않는다. 한 일을 보고 되돌려준다.
//
// 두 가지 모드
//   mode="suggest" : 경험 → 직업군 후보 3개 추천 (근거 포함)
//   mode="check"   : 학생이 직접 넣은 직업군 → 경험과 맞는지 대조
//
// 철학: 자소서 문장을 쓰지 않는다. 직업군과 경험이 맞는지만 본다.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface RequestBody {
  mode?: "suggest" | "check";
  studentName?: string;
  schoolName?: string;
  // 마법사 1단계 키워드
  keywords?: { keyword: string; experience: string }[];
  // 마법사 2단계 마인드맵 (학교생활 / 동아리 / 독서학습 / 봉사인성 / 학교관심)
  experiences?: { branch: string; text: string }[];
  // 진로계열검사 결과 (있으면 후보 0번으로 먼저 노출 — 화면에서 처리)
  existingConcept?: {
    career?: string | null;
    major?: string | null;
    keywords?: string[] | null;
    customGoal?: string | null;
    typeName?: string | null;
  } | null;
  // mode="check" 일 때 학생이 직접 정한 직업군
  chosenCareer?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();
    const mode = body.mode === "check" ? "check" : "suggest";

    const pool = buildPool(body);
    if (pool.length < 3) {
      return jsonError(
        "경험이 너무 적어요. 앞 단계에서 경험을 3개 이상 적어주세요.",
        400
      );
    }
    if (mode === "check" && !body.chosenCareer) {
      return jsonError("확인할 직업군이 필요해요.", 400);
    }

    const { feedback, tokensUsed, model } = await callOpenAI({
      systemPrompt:
        mode === "check" ? buildCheckPrompt(body) : buildSuggestPrompt(body),
      userPrompt: buildUserPrompt(body, pool, mode),
      model: "gpt-4o",
      temperature: 0.4,
    });

    return jsonResponse({
      success: true,
      analysis: mode === "check" ? normalizeCheck(feedback) : normalizeSuggest(feedback),
      meta: { model, tokensUsed, mode, poolSize: pool.length },
    });
  } catch (e) {
    console.error("[middle-essay-concept]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

// 키워드 + 마인드맵을 하나의 경험 더미로
function buildPool(body: RequestBody): string[] {
  const pool: string[] = [];
  (body.keywords ?? []).forEach((k) => {
    const t = [k.keyword, k.experience].filter((x) => x?.trim()).join(" — ");
    if (t.trim()) pool.push(t.trim());
  });
  (body.experiences ?? []).forEach((e) => {
    if (e.text?.trim()) pool.push(`[${e.branch}] ${e.text.trim()}`);
  });
  return pool;
}

const COMMON_RULES = `[절대 규칙]
1. 자소서 문장을 쓰지 마라. 학생이 베껴 쓸 문장을 만들지 마라.
2. [학생이 적은 경험]에 없는 활동을 지어내지 마라. 근거는 반드시 적힌 것에서 인용하라.
3. 대입·전공적합성·학생부·세특 같은 표현을 쓰지 마라. 중학생이 알아듣는 말로.
4. "열심히 하면 된다" 같은 덕담을 쓰지 마라. 경험과 직업의 연결만 말하라.
5. 직업군은 중학생이 실제로 들어본 이름으로 써라. 지나치게 세분화하지 마라.`;

function buildSuggestPrompt(body: RequestBody): string {
  const prior = body.existingConcept?.career
    ? `[참고 — 이 학생이 전에 받은 진로 검사 결과]
희망 직업군: ${body.existingConcept.career}
${body.existingConcept.major ? `관심 계열·학과: ${body.existingConcept.major}` : ""}
[중요] 이 결과는 참고만 하라. 경험과 맞지 않으면 다른 후보를 내도 된다.
다만 후보 중 하나가 이 직업군과 같은 계열이면 그 점을 근거에 밝혀라.`
    : `[참고] 이 학생은 아직 진로 검사 결과가 없다. 경험만 보고 판단하라.`;

  return `너는 중학생 진로·자기소개서 코치다.
지금은 자소서를 쓰기 전, **어떤 직업군을 향하는 학생인지 정하는 단계**다.

${prior}

[이번 단계의 핵심]
중학생에게 "너 직업 뭐야?"를 먼저 묻지 않는다.
학생이 **실제로 한 일들**을 읽고, 거기서 보이는 패턴으로 직업군을 되돌려준다.
학생이 스스로 "아, 내가 이런 걸 해왔구나"를 깨닫게 하는 게 목적이다.

${COMMON_RULES}

[출력]

▶ candidates: 직업군 후보 3개. 서로 다른 방향이어야 한다. 각 {career, label, why, evidence, supportCount, gap}
- career: 직업군 이름 (예: "생명공학 연구원", "특수교사", "통역가")
- label: 컨셉 한 줄. 형식 "OO를 향해 △△를 해온 학생"
- why: 왜 이 직업군으로 봤는지 한두 문장. 반드시 학생 경험을 근거로.
- evidence: 이 직업군을 뒷받침하는 경험 2~4개. [학생이 적은 경험]에서 **그대로 인용**하라.
- supportCount: evidence 개수 (숫자)
- gap: 이 직업군인데 아직 없는 경험 한 줄. "지금부터 만들면 좋을 것" 관점으로.

[후보 만드는 규칙]
- 1번은 경험이 가장 많이 뒷받침하는 직업군. supportCount가 가장 커야 한다.
- 2번은 다른 계열의 가능성. 1번과 같은 계열이면 안 된다.
- 3번은 학생이 스스로 생각 못 했을 만한 방향. 단 근거는 반드시 경험에 있어야 한다.
- 경험이 한쪽으로만 쏠려 있으면 그렇다고 summary에 밝혀라. 억지로 세 방향을 만들지 마라.

▶ summary: 2문장. 이 학생의 경험이 어느 쪽으로 모여 있는지, 무엇이 부족한지.

[응답 형식 — 반드시 이 JSON만 출력. 마크다운 금지]
{
  "summary": "",
  "candidates": [
    { "career": "", "label": "", "why": "", "evidence": [""], "supportCount": 0, "gap": "" }
  ]
}

각 필드를 실제 분석 내용으로 채워서 JSON으로만 응답하라.`;
}

function buildCheckPrompt(body: RequestBody): string {
  return `너는 중학생 진로·자기소개서 코치다.
학생이 직업군을 **직접 정했다**. 그 직업군과 학생의 경험이 맞는지 대조하는 게 이번 일이다.

[학생이 정한 직업군]
${body.chosenCareer}

[이번 단계의 핵심]
직업군을 부정하지 마라. 학생이 정한 건 존중한다.
대신 **어떤 경험이 이 직업군과 이어지고, 어떤 경험이 이어지지 않는지**를 정확히 갈라줘라.
이어지지 않는 경험은 자소서 소재로 쓰기 어렵다는 뜻이다. 그걸 학생이 알아야 한다.

${COMMON_RULES}

[출력]

▶ label: 컨셉 한 줄. 형식 "OO를 향해 △△를 해온 학생". 학생이 정한 직업군을 그대로 쓰되, △△는 경험에서 뽑아라.
▶ fit: 이 직업군과 경험이 얼마나 맞는지 0~100.
▶ verdict: "strong"(경험이 충분히 뒷받침) | "partial"(일부만) | "weak"(거의 이어지지 않음)
▶ summary: 2문장. 맞는지, 무엇이 모자란지.

▶ matched: 이 직업군과 이어지는 경험. 각 {experience, link}
  · experience: [학생이 적은 경험]에서 그대로 인용
  · link: 이 직업군과 어떻게 이어지는지 한 줄

▶ unmatched: 이어지지 않는 경험. 각 {experience, reason, rescue}
  · reason: 왜 이 직업군과 연결이 약한지 한 줄
  · rescue: 이 경험을 살릴 각도가 있으면 한 줄. 없으면 빈 문자열.
  · 이어지지 않는 게 없으면 빈 배열.

▶ missing: 이 직업군이면 있어야 하는데 아직 없는 경험 1~3개. 각 한 줄 문자열.
  · "지금부터 만들면 좋을 것" 관점으로. 이미 지난 일을 탓하지 마라.

[응답 형식 — 반드시 이 JSON만 출력. 마크다운 금지]
{
  "label": "",
  "fit": 0,
  "verdict": "partial",
  "summary": "",
  "matched": [{ "experience": "", "link": "" }],
  "unmatched": [{ "experience": "", "reason": "", "rescue": "" }],
  "missing": [""]
}

각 필드를 실제 분석 내용으로 채워서 JSON으로만 응답하라.`;
}

function buildUserPrompt(
  body: RequestBody,
  pool: string[],
  mode: string
): string {
  const parts: string[] = [];

  const meta: string[] = [];
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  if (body.schoolName) meta.push(`지원 학교: ${body.schoolName}`);
  if (meta.length) parts.push(`[기본 정보]\n${meta.join("\n")}`);

  const c = body.existingConcept;
  if (c && (c.career || c.major || c.customGoal || c.keywords?.length)) {
    const lines: string[] = [];
    if (c.career) lines.push(`진로 검사 결과 직업군: ${c.career}`);
    if (c.major) lines.push(`관심 계열·학과: ${c.major}`);
    if (c.typeName) lines.push(`진로 유형: ${c.typeName}`);
    if (c.customGoal) lines.push(`학생이 직접 쓴 목표: ${c.customGoal}`);
    if (c.keywords?.length) lines.push(`진로 키워드: ${c.keywords.join(", ")}`);
    parts.push(`[진로 검사 결과]\n${lines.join("\n")}`);
  }

  parts.push(
    `[학생이 적은 경험 — 총 ${pool.length}개]\n` +
      pool.map((p) => `· ${p}`).join("\n")
  );

  parts.push(
    mode === "check"
      ? `위 경험이 학생이 정한 직업군 "${body.chosenCareer}"와 맞는지 대조하라. 반드시 JSON만 응답하라.\n` +
          "- matched/unmatched의 experience는 위 목록에서 그대로 인용하라.\n" +
          "- 직업군을 바꾸라고 하지 마라. 맞는지 갈라주기만 하라."
      : "위 경험을 읽고 직업군 후보 3개를 뽑아라. 반드시 JSON만 응답하라.\n" +
          "- evidence는 위 목록에서 그대로 인용하라. 지어내지 마라.\n" +
          "- 후보 3개는 서로 다른 계열이어야 한다."
  );

  return parts.join("\n\n");
}

function normalizeSuggest(raw: any) {
  const arr = (v: any) => (Array.isArray(v) ? v : []);
  return {
    mode: "suggest",
    summary: raw.summary ?? "",
    candidates: arr(raw.candidates)
      .slice(0, 3)
      .map((c: any) => {
        const evidence = arr(c.evidence).map((x: any) => String(x));
        return {
          career: c.career ?? "",
          label: c.label ?? "",
          why: c.why ?? "",
          evidence,
          supportCount: Number(c.supportCount) || evidence.length,
          gap: c.gap ?? "",
        };
      }),
  };
}

function normalizeCheck(raw: any) {
  const arr = (v: any) => (Array.isArray(v) ? v : []);
  return {
    mode: "check",
    label: raw.label ?? "",
    fit: clamp(Number(raw.fit) || 0, 0, 100),
    verdict: ["strong", "partial", "weak"].includes(raw.verdict)
      ? raw.verdict
      : "partial",
    summary: raw.summary ?? "",
    matched: arr(raw.matched).map((m: any) => ({
      experience: m.experience ?? "",
      link: m.link ?? "",
    })),
    unmatched: arr(raw.unmatched).map((u: any) => ({
      experience: u.experience ?? "",
      reason: u.reason ?? "",
      rescue: u.rescue ?? "",
    })),
    missing: arr(raw.missing).map((x: any) => String(x)),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}