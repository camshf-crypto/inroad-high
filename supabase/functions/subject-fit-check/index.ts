// supabase/functions/subject-fit-check/index.ts
// 고등 과목 선택 — 진로와 맞는지 판정
//   학생이 고른 과목이 자기가 정한 학과·직업군과 이어지는지 대조한다.
//   과목은 자소서 소재보다 무겁다. 한번 고르면 1년을 그 과목으로 살고,
//   세특이 거기서 나오기 때문이다. 그래서 고르는 순간에 짚어줘야 한다.
//
// 철학
//   · 학생이 고른 과목을 부정하지 않는다. 무엇과 이어지고 무엇이 뜨는지만 갈라준다.
//   · 대안은 반드시 [고를 수 있는 과목] 안에서만, 그리고 **같은 계통 안에서만** 고른다.
//     체육을 안 듣고 정보를 듣는 건 불가능하다. 계통을 넘나드는 교체를 제안하지 않는다.
//   · 체육·음악·미술은 필수 이수 교과라 감점하지 않는다.
//   · 탐구 방향(어떤 주제를 하면 좋은지)은 여기서 말하지 않는다. 탐구주제 단계의 일이다.
//   · "열심히 하면 된다" 같은 덕담을 쓰지 않는다.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface SubjectIn {
  line: string;            // 계통 (음악 계통 / 정보·AI 계통 ...)
  name: string;            // 과목명
  category?: string | null; // 공통 / 일반선택 / 진로선택 ...
  recommendedSeries?: string[] | null; // 이 과목이 권장되는 계열
}

interface RequestBody {
  grade: number;                 // 1~3
  studentName?: string;
  // 진로 (학년별)
  series?: string | null;        // 계열
  major?: string | null;         // 학과
  career?: string | null;        // 직업
  // 학생이 고른 과목
  picked: SubjectIn[];
  // 고를 수 있었는데 안 고른 과목 — 대안은 여기서만 뽑는다
  available?: SubjectIn[];
  // 전원 이수라 고르는 게 아닌 과목
  required?: string[];
  needCount?: number;            // 몇 개 골라야 하는지
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();
    const picked = body.picked ?? [];

    if (picked.length === 0) {
      return jsonError("아직 고른 과목이 없어요. 과목을 먼저 골라주세요.", 400);
    }
    if (!body.major && !body.career && !body.series) {
      return jsonError(
        "진로가 아직 정해지지 않았어요. 진로 계열 검사를 먼저 해주세요.",
        400
      );
    }

    const { feedback, tokensUsed, model } = await callOpenAI({
      systemPrompt: buildSystemPrompt(body),
      userPrompt: buildUserPrompt(body),
      model: "gpt-4o",
      temperature: 0.3,
    });

    return jsonResponse({
      success: true,
      analysis: normalize(feedback, body),
      meta: { model, tokensUsed, grade: body.grade, pickedCount: picked.length },
    });
  } catch (e) {
    console.error("[subject-fit-check]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function buildSystemPrompt(body: RequestBody): string {
  const goal = [body.series, body.major, body.career].filter(Boolean).join(" · ");

  return `너는 고등 진로·교과 선택 상담 전문가다. 고${body.grade} 학생이 과목을 고르는 중이다.

[학생의 진로]
${goal}

[이번 판정의 성격 — 가장 중요]
과목은 한번 고르면 1년을 그 과목으로 산다. 그리고 세특이 거기서 나온다.
그래서 "이 과목으로 그 학과에 갈 수 있나"가 아니라
**"이 과목에서 그 학과와 이어지는 세특이 나오나"** 를 봐라.

[절대 규칙]
1. 학생이 고른 과목을 부정하지 마라. 고른 건 존중한다.
2. 대안은 반드시 [고를 수 있는 과목] 목록 안에서만 골라라. 목록에 없는 과목을 만들어내지 마라.
3. **계통을 넘나드는 교체를 절대 제안하지 마라.** 이게 가장 자주 하는 실수다.
   과목은 계통(체육 계통 / 음악 계통 / 정보·AI 계통 ...) 안에서 하나를 고르는 것이다.
   체육을 안 듣고 대신 정보를 듣는 일은 **불가능하다.**
   · "체육1 → 정보" (✗ 계통이 다르다)
   · "체육1 → 스포츠 과학" (○ 같은 체육 계통)
   swap 의 from 과 to 는 **반드시 같은 계통**이어야 한다. 아니면 아예 제안하지 마라.
4. **체육·음악·미술 계통은 필수 이수 교과다. 진로와 안 맞는다고 감점하지 마라.**
   경영학과 지망 학생도 체육을 반드시 듣는다. 그건 학생 잘못이 아니다.
   이 계통은 unmatched 에 넣지 마라. fit 점수를 깎지도 마라.
   그 계통 안에 진로에 조금이라도 더 가까운 과목이 있으면 그때만 swap 으로 제안하라.
5. 공통과목(전원 이수)은 고르는 게 아니다. 판정 대상이 아니다.
6. **탐구 방향을 말하지 마라.** "이런 주제로 탐구하면 좋다"는 여기서 할 얘기가 아니다.
   이 화면은 과목을 고르는 곳이다. 탐구주제는 다음 단계에서 따로 정한다.
7. "열심히 하면 된다", "다양한 경험이 중요하다" 같은 덕담을 쓰지 마라.
8. 중·고등학생이 알아듣는 말로. 전공적합성·세부능력특기사항 같은 용어 대신 쉬운 말로.
9. 겁주지 마라. 안 맞는 과목이 있어도 "망했다"가 아니라 담담하게 사실만.

[고1은 다르다]
고1은 공통과목이 대부분이라 고를 수 있는 게 몇 개 안 된다.
그러니 고1 판정에서 점수를 짜게 주지 마라. 고를 게 없는 걸 두고 낮은 점수를 주면 학생이 할 수 있는 게 없다.
고1은 "지금 조합이 나쁘다"보다 **"고2에 뭘 고르면 좋다"** 쪽으로 missing 을 채워라.

[판정]

▶ fit: 고른 과목이 진로와 얼마나 이어지는지 0~100.
▶ verdict: "strong"(충분히 이어짐) | "partial"(일부만) | "weak"(거의 안 이어짐)
▶ summary: 2문장. 지금 조합이 어떤 학생으로 보이는지, 무엇이 모자란지.

▶ matched: 진로와 이어지는 과목. 각 {subject, link}
  · link: 이 과목이 그 학과와 어떻게 이어지는지 **한 줄로 짧게**. 탐구 주제를 말하지 마라.

▶ unmatched: 진로와 연결이 약한 과목. 각 {subject, reason}
  · reason: 왜 연결이 약한지 한 줄.
  · **체육·음악·미술 계통은 여기 넣지 마라.** 필수 이수 교과다.
  · 연결이 약한 과목이 없으면 빈 배열.

▶ missing: 이 진로면 있으면 좋은데 아직 안 고른 과목 0~3개. 각 {subject, why}
  · subject 는 반드시 [고를 수 있는 과목] 목록에 있는 이름 그대로.
  · why: 왜 필요한지 한 줄. 그 학과에서 실제로 쓰이는 이유로.
  · 없으면 빈 배열.

▶ swap: 같은 계통 안에서 바꾸면 좋을 조합 0~2개. 각 {from, to, why}
  · **from 과 to 는 반드시 같은 계통이어야 한다.** 다르면 넣지 마라.
  · 정말 바꾸는 게 나을 때만. 억지로 만들지 마라. 없으면 빈 배열.

[응답 형식 — 반드시 이 JSON만 출력. 마크다운 금지]
{
  "fit": 0,
  "verdict": "partial",
  "summary": "",
  "matched": [{ "subject": "", "link": "" }],
  "unmatched": [{ "subject": "", "reason": "" }],
  "missing": [{ "subject": "", "why": "" }],
  "swap": [{ "from": "", "to": "", "why": "" }]
}

각 필드를 실제 분석 내용으로 채워서 JSON으로만 응답하라.`;
}

function buildUserPrompt(body: RequestBody): string {
  const parts: string[] = [];

  const meta: string[] = [`학년: 고${body.grade}`];
  if (body.studentName) meta.push(`학생: ${body.studentName}`);
  if (body.series) meta.push(`계열: ${body.series}`);
  if (body.major) meta.push(`학과: ${body.major}`);
  if (body.career) meta.push(`직업: ${body.career}`);
  if (body.needCount) meta.push(`골라야 할 과목 수: ${body.needCount}개`);
  parts.push(`[기본 정보]\n${meta.join("\n")}`);

  const fmt = (s: SubjectIn) => {
    const bits = [`[${s.line}] ${s.name}`];
    if (s.category) bits.push(`(${s.category})`);
    if (s.recommendedSeries?.length)
      bits.push(`권장계열: ${s.recommendedSeries.join(", ")}`);
    return `  · ${bits.join(" ")}`;
  };

  parts.push(
    `[학생이 고른 과목 — ${body.picked.length}개]\n` +
      body.picked.map(fmt).join("\n")
  );

  if (body.required?.length) {
    parts.push(
      `[전원 이수 과목 — 고르는 게 아님]\n  ${body.required.join(", ")}\n` +
        `(이건 판정 대상이 아니다. matched/unmatched 에 넣지 마라.)`
    );
  }

  if (body.available?.length) {
    parts.push(
      `[고를 수 있는데 안 고른 과목]\n` +
        body.available.map(fmt).join("\n") +
        `\n(missing 과 swap 의 대안은 반드시 이 목록 안에서만 골라라. 없는 과목을 만들지 마라.)`
    );
  } else {
    parts.push(
      `[고를 수 있는데 안 고른 과목]\n(목록 없음. missing 과 swap 은 빈 배열로 둬라.)`
    );
  }

  parts.push(
    "위 과목 조합이 학생의 진로와 이어지는지 판정하라. 반드시 JSON만 응답하라.\n" +
      "- subject 이름은 위 목록에 있는 그대로 써라.\n" +
      "- swap 의 from 과 to 는 반드시 [ ] 안의 계통이 같아야 한다. 다르면 넣지 마라.\n" +
      "- 체육·음악·미술 계통은 필수 이수 교과다. unmatched 에 넣지 말고 감점하지 마라.\n" +
      "- 탐구 주제나 탐구 방향은 말하지 마라. 다음 단계에서 정한다."
  );

  return parts.join("\n\n");
}

function normalize(raw: any, body: RequestBody) {
  const arr = (v: any) => (Array.isArray(v) ? v : []);
  const str = (v: any) => (typeof v === "string" ? v : "");

  // 과목명 → 계통 (프롬프트가 어겨도 코드에서 한 번 더 거른다)
  const lineOf = new Map<string, string>();
  [...(body.picked ?? []), ...(body.available ?? [])].forEach((x) =>
    lineOf.set(x.name, x.line)
  );
  // 필수 이수 교과 — 감점·교체 대상이 아니다
  const isMustLine = (line?: string) =>
    !!line && /체육|음악|미술|예술/.test(line);

  return {
    fit: clamp(Number(raw.fit) || 0, 0, 100),
    verdict: ["strong", "partial", "weak"].includes(raw.verdict)
      ? raw.verdict
      : "partial",
    summary: str(raw.summary),
    matched: arr(raw.matched).map((m: any) => ({
      subject: str(m.subject),
      link: str(m.link),
    })),
    // 필수 이수 교과는 "연결이 약함"에서 뺀다
    unmatched: arr(raw.unmatched)
      .map((u: any) => ({ subject: str(u.subject), reason: str(u.reason) }))
      .filter((u: any) => !isMustLine(lineOf.get(u.subject))),
    missing: arr(raw.missing).map((m: any) => ({
      subject: str(m.subject),
      why: str(m.why),
    })),
    // 계통이 다른 교체 제안은 버린다 (체육1 → 정보 같은 것)
    swap: arr(raw.swap)
      .map((s: any) => ({ from: str(s.from), to: str(s.to), why: str(s.why) }))
      .filter((s: any) => {
        const a = lineOf.get(s.from);
        const b = lineOf.get(s.to);
        return !!a && !!b && a === b;
      }),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}