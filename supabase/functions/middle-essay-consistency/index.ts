// supabase/functions/middle-essay-consistency/index.ts
// 자소서 4차 — 일관성 검토 (문항 "사이"를 본다)
//   1~3차는 문항 하나 안에서 보지만, 4차는 문항 전체를 이어 읽고 대조한다.
//   통과 기준 3개:
//     ① 세 문항의 학생이 같은 사람으로 읽히는가
//     ② 1차에서 정한 컨셉·직업군과 끝까지 맞는가
//     ③ 같은 경험이 여러 문항에 중복되지 않는가
// 철학: 자소서 문장을 대신 쓰지 않는다. 어긋난 지점을 짚고 어느 쪽에 맞출지 고르게 한다.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface SchoolProfile {
  ideal_student: string;
  eval_factors: string;
  programs: string;
  core_values: string;
  notes: string;
}

interface SectionInput {
  key: string;
  label: string;
  text: string;
  question?: string | null;
}

interface RequestBody {
  schoolName: string;
  studentName?: string;
  // 🎯 문항 전체 (1~3차를 거친 최신본)
  sections: SectionInput[];
  // 1차에서 잡은 컨셉 — 있으면 이 기준으로 대조한다
  conceptLabel?: string | null;
  studentConcept?: {
    major?: string | null;
    career?: string | null;
    keywords?: string[] | null;
    customGoal?: string | null;
  } | null;
  schoolProfile?: SchoolProfile | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();

    if (!body.schoolName) return jsonError("학교명이 필요해요.", 400);

    const filled = (body.sections ?? []).filter(
      (s) => s.text && s.text.trim().length >= 20
    );
    if (filled.length < 2) {
      return jsonError(
        "일관성 검토는 문항이 2개 이상 작성돼야 가능해요. (4차는 문항 사이를 보는 단계입니다)",
        400
      );
    }

    const { feedback, tokensUsed, model } = await callOpenAI({
      systemPrompt: buildSystemPrompt(body, filled),
      userPrompt: buildUserPrompt(body, filled),
      model: "gpt-4o",
      temperature: 0.3,
    });

    return jsonResponse({
      success: true,
      analysis: normalize(feedback, filled),
      meta: { model, tokensUsed, round: 4, sectionCount: filled.length },
    });
  } catch (e) {
    console.error("[middle-essay-consistency]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function buildSystemPrompt(body: RequestBody, sections: SectionInput[]): string {
  const profileBlock = body.schoolProfile
    ? `[학교 데이터]
학교명: ${body.schoolName}
인재상: ${body.schoolProfile.ideal_student}
평가에서 중시하는 요소: ${body.schoolProfile.eval_factors}
강조하는 가치: ${body.schoolProfile.core_values}`
    : `[학교 데이터]
학교명: ${body.schoolName}
(상세 특색 데이터 없음. 문항 사이의 일관성만 보라.)`;

  const conceptBlock = body.conceptLabel
    ? `[1차에서 정한 컨셉]
${body.conceptLabel}
[중요] 이 컨셉이 세 문항 끝까지 유지되는지가 이번 검토의 핵심 기준이다.`
    : `[1차에서 정한 컨셉]
(아직 없음. 문항 전체를 읽고 이 학생의 컨셉을 먼저 한 줄로 잡은 뒤, 그 기준으로 대조하라.)`;

  return `너는 고입 자기소개서 검토 전문가다. 지금은 **4차 — 일관성 검토** 단계다.

${profileBlock}

${conceptBlock}

[이번 단계의 성격 — 가장 중요]
1~3차는 이미 끝났다. 소재(1차)·근거(2차)·표현(3차)은 다시 건드리지 마라.
이번 차수는 문항 하나를 떼어 보는 게 아니라 **문항 사이**를 본다.
문항별 첨삭이 아니라 **문항 간 대조**다. 어긋나는 지점을 짚고, 어느 쪽에 맞출지 학생이 고르게 하라.

[절대 규칙]
1. 자소서 문장·수정문장·완성문장을 절대 쓰지 마라. 학생이 베껴 쓸 문장을 만들지 마라.
2. 문항 하나 안의 표현·분량·맞춤법을 지적하지 마라. 3차에서 끝난 일이다.
3. 이 단계에서 소재를 갈아엎으라고 하지 마라. 이미 늦었다. 맞추는 방향으로 조정하라.
4. 학생 답변에 없는 활동을 지어내지 마라.
5. 대입·전공적합성·학생부·세특 같은 표현을 쓰지 마라. 중학생이 알아듣는 말로.

[판정 기준 — 통과 기준 3개]
① 같은 사람: 세 문항의 학생이 같은 사람으로 읽히는가
② 컨셉 유지: 1차에서 정한 컨셉·직업군과 끝까지 맞는가
③ 중복 없음: 같은 경험이 여러 문항에 중복되지 않는가

[출력]

▶ conceptLabel: 이 자소서 전체를 관통하는 컨셉 한 줄. 형식 "OO(직업군)을 향해 △△를 해온 학생".
▶ career: 희망 직업군.

▶ overall (총평)
- passed: 세 기준을 모두 통과했으면 true, 하나라도 걸리면 false.
- score: 일관성 점수 0~100.
- summary: 2문장. 이 자소서가 하나의 이야기로 읽히는지, 어디가 어긋나는지.

▶ criteria: 위 통과 기준 3개를 그대로 평가. 라벨은 정확히 이 셋을 써라.
  "같은 사람" / "컨셉 유지" / "중복 없음"
  각 {label, level(high|mid|low), ratio(0~100), desc}

▶ persona: 문항마다 그 글만 읽었을 때 어떤 학생으로 보이는지. 각 {sectionLabel, impression}
  · impression은 한 줄. 여기서 서로 다르게 읽히면 그게 곧 ①의 문제다.

▶ conflicts: 어긋나는 지점 0~4개. 각 {sections(어긋나는 문항 라벨 배열), detail, fix}
  · detail: 무엇과 무엇이 어긋나는지. 반드시 두 문항을 비교해서 써라. 한 문항만 얘기하지 마라.
  · fix: 어느 쪽에 맞출지 두 선택지를 주고 학생이 고르게 하라. 문장을 써주지 마라.
  · 어긋나는 곳이 없으면 빈 배열.

▶ duplicates: 중복된 경험 0~3개. 각 {experience, sections(중복된 문항 라벨 배열), suggestion}
  · suggestion: 어느 문항에 남기고 어느 쪽을 다른 경험으로 바꿀지. 같은 경험을 각도만 달리 쓰는 것도 대안으로 제시 가능.
  · 중복이 없으면 빈 배열.

▶ coaching (선생님이 보는 지도 가이드)
- steps: 2~3개. 각 {order, priority(urgent|normal), title, why, askText, followUp}
  · askText는 선생님이 그대로 읽는 질문 대사다. 문항 두 개를 나란히 놓고 묻는 질문이어야 한다.
    예: "지원동기에서는 OO이라고 했는데 인성에서는 △△이야. 둘 중 어느 쪽이 진짜 너야?"
- caution: 한 줄.

[응답 형식 — 반드시 이 JSON만 출력. 마크다운 금지]
{
  "conceptLabel": "",
  "career": "",
  "overall": { "passed": false, "score": 0, "summary": "" },
  "criteria": [{ "label": "같은 사람", "level": "mid", "ratio": 0, "desc": "" }],
  "persona": [{ "sectionLabel": "", "impression": "" }],
  "conflicts": [{ "sections": [""], "detail": "", "fix": "" }],
  "duplicates": [{ "experience": "", "sections": [""], "suggestion": "" }],
  "coaching": {
    "steps": [{ "order": 1, "priority": "urgent", "title": "", "why": "", "askText": "", "followUp": "" }],
    "caution": ""
  }
}

각 필드를 실제 검토 내용으로 채워서 JSON으로만 응답하라.`;
}

function buildUserPrompt(body: RequestBody, sections: SectionInput[]): string {
  const parts: string[] = [];

  const meta: string[] = [`지원 학교: ${body.schoolName}`];
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  parts.push(`[기본 정보]\n${meta.join("\n")}`);

  const c = body.studentConcept;
  if (c && (c.major || c.career || c.customGoal || c.keywords?.length)) {
    const lines: string[] = [];
    if (c.career) lines.push(`희망 직업군: ${c.career}`);
    if (c.major) lines.push(`관심 계열·학과: ${c.major}`);
    if (c.customGoal) lines.push(`학생이 직접 쓴 목표: ${c.customGoal}`);
    if (c.keywords?.length) lines.push(`진로 키워드: ${c.keywords.join(", ")}`);
    parts.push(`[진로 정보]\n${lines.join("\n")}`);
  }

  // 🎯 문항 전체를 한 번에
  sections.forEach((s, i) => {
    const q = s.question ? `\n(학교 문항: ${s.question})` : "";
    parts.push(`[문항 ${i + 1} — ${s.label}]${q}\n${s.text}`);
  });

  parts.push(
    "위 문항들을 이어서 읽고 문항 '사이'의 일관성을 검토하라. 반드시 JSON만 응답하라.\n" +
      "- 문항 하나 안의 표현·분량을 지적하지 마라. 3차에서 끝난 일이다.\n" +
      "- conflicts.detail은 반드시 두 문항을 비교해서 써라.\n" +
      "- 자소서 문장을 대신 쓰지 마라."
  );

  return parts.join("\n\n");
}

function normalize(raw: any, sections: SectionInput[]) {
  const ov = raw.overall ?? {};
  const co = raw.coaching ?? {};
  const arr = (v: any) => (Array.isArray(v) ? v : []);

  return {
    round: 4,
    conceptLabel: raw.conceptLabel ?? "",
    career: raw.career ?? "",
    sectionLabels: sections.map((s) => s.label),

    overall: {
      passed: ov.passed === true,
      score: clamp(Number(ov.score) || 0, 0, 100),
      summary: ov.summary ?? "",
    },

    criteria: arr(raw.criteria).map((c: any) => ({
      label: c.label ?? "",
      level: ["high", "mid", "low"].includes(c.level) ? c.level : "mid",
      ratio: clamp(Number(c.ratio) || 0, 0, 100),
      desc: c.desc ?? "",
    })),

    persona: arr(raw.persona).map((p: any) => ({
      sectionLabel: p.sectionLabel ?? "",
      impression: p.impression ?? "",
    })),

    conflicts: arr(raw.conflicts).map((c: any) => ({
      sections: arr(c.sections).map((x: any) => String(x)),
      detail: c.detail ?? "",
      fix: c.fix ?? "",
    })),

    duplicates: arr(raw.duplicates).map((d: any) => ({
      experience: d.experience ?? "",
      sections: arr(d.sections).map((x: any) => String(x)),
      suggestion: d.suggestion ?? "",
    })),

    coaching: {
      steps: arr(co.steps).map((s: any, i: number) => ({
        order: Number(s.order) || i + 1,
        priority: s.priority === "urgent" ? "urgent" : "normal",
        title: s.title ?? "",
        why: s.why ?? "",
        askText: s.askText ?? "",
        followUp: s.followUp ?? "",
      })),
      caution:
        co.caution ??
        "어긋난 곳을 짚어주되, 어느 쪽에 맞출지는 학생이 고르게 하세요.",
    },
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}