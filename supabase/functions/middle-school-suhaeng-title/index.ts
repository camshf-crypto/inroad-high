// supabase/functions/middle-school-suhaeng-question/index.ts
// 중등 학교 수행평가 — 예상 문항(발문) 생성
// 목적: 학교가 실제 발문을 공개하지 않으므로, 단원·성취기준·핵심개념·채점요소를 근거로
//       "이 수행평가에서 나올 법한 예상 문항" 1개를 생성한다. (학생 선행학습용)
// 제약: 성취기준/핵심개념 범위 안에서만, 학년 수준에 맞게, 실제 학교 문항처럼 자연스럽게.
//       채점 기준과 어긋나는 문항을 만들지 않는다.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface RequestBody {
  subject: string;
  grade: string;                 // "1" | "2" | "3"
  unitTopic: string;             // 단원/주제
  achievementStandard: string;   // 성취기준
  coreConcept?: string;          // 핵심개념
  scoringFactors?: string;       // 채점 요소
  evalType: string;              // 평가유형 (논술형/서술형/포트폴리오형/구술발표형/실기형/프로젝트형/기타)
  displayType?: string;          // 화면 유형 (논술형/서술형/포트폴리오/구술발표/탐구수행/주제탐구)
  taskTitle?: string;            // 과제 제목
  score?: number;                // 배점
  minChars?: number;
  maxChars?: number;
  presentTimeMin?: number;
  presentTimeMax?: number;
}

// 평가유형 → 문항이 갖춰야 할 형식 가이드
function typeGuide(displayType: string, evalType: string): string {
  const t = displayType || evalType || "";
  if (t.includes("논술")) {
    return `[논술형 문항 형식]
- 하나의 논제를 제시하고, 학생이 자기 주장과 근거를 갖춰 글로 논하도록 한다.
- "~에 대해 자신의 생각을 논하시오", "~을 비교하여 서술하시오" 같은 논술 발문으로 끝낸다.
- 분량 조건이 있으면 함께 안내한다.`;
  }
  if (t.includes("서술")) {
    return `[서술형 문항 형식]
- 핵심 개념을 정확히 설명하거나 적용하도록 하는 발문.
- "~을 설명하시오", "~의 과정을 서술하시오", "~을 구하고 풀이 과정을 쓰시오" 형태.
- 논술보다 짧고 개념 중심.`;
  }
  if (t.includes("포트폴리오") || t.includes("주제탐구") || t.includes("프로젝트")) {
    return `[포트폴리오/프로젝트 문항 형식]
- 여러 단계(조사→정리→분석→성찰)로 이루어진 활동 과제를 제시한다.
- "~을 조사하여 ~로 정리하고, ~에 대해 자신의 생각을 정리하시오" 같은 활동 지시형 발문.
- 어떤 결과물(보고서/지도/슬라이드/활동지 등)을 만드는지 분명히 한다.`;
  }
  if (t.includes("구술") || t.includes("발표")) {
    return `[구술발표 문항 형식]
- 학생이 준비해 발표할 주제를 제시한다.
- "~을 조사하여 발표하시오", "~에 대해 자신의 의견을 발표하시오" 형태.
- 발표 시간 조건이 있으면 함께 안내한다.`;
  }
  if (t.includes("실기") || t.includes("탐구수행")) {
    return `[실기/탐구수행 문항 형식]
- 직접 수행하거나 실험·관찰하고 그 과정을 기록하도록 한다.
- "~을 측정하여 ~을 기록하고, ~을 분석하시오", "~을 정확하게 수행하시오" 형태.
- 무엇을 관찰/측정/수행하고 무엇을 기록하는지 분명히 한다.`;
  }
  return `[일반 과제 문항 형식]
- 학습 목표를 확인할 수 있는 명확한 수행 지시문으로 작성한다.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();

    if (!body.achievementStandard && !body.unitTopic && !body.taskTitle) {
      return jsonError("문항을 생성할 단원/성취기준 정보가 부족합니다.", 400);
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(body);

    const { feedback, tokensUsed, model } = await callOpenAI({
      systemPrompt,
      userPrompt,
      model: "gpt-4o",
      temperature: 0.6,   // 문항 생성은 약간의 다양성 허용
    });

    const result = normalize(feedback);

    return jsonResponse({
      success: true,
      analysis: result,
      meta: { model, tokensUsed },
    });
  } catch (e) {
    console.error("[middle-school-suhaeng-question]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function normalize(raw: any) {
  return {
    questionContent: raw.questionContent ?? "",   // 학생에게 보여줄 발문 본문
    conditions: raw.conditions ?? "",              // 분량/시간/제출물 등 조건 안내 (한 줄)
    guideForStudent: raw.guideForStudent ?? "",    // 이 문항을 어떻게 준비하면 좋은지 짧은 팁
    basedOn: raw.basedOn ?? "",                    // 어떤 성취기준에 근거했는지
  };
}

function buildSystemPrompt(): string {
  return `당신은 한국 중학교 수행평가를 설계하는 경력 많은 교사입니다.
학교는 보통 실제 수행평가 문항을 시험 직전까지 공개하지 않습니다.
그래서 당신은 [단원 / 성취기준 / 핵심개념 / 채점 요소]를 근거로,
"이 수행평가에서 충분히 나올 법한 예상 문항" 1개를 만들어 학생이 미리 연습하도록 돕습니다.

═══════════════════════════════════════════
[절대 원칙]
═══════════════════════════════════════════
1. 반드시 주어진 [성취기준]과 [핵심개념]의 범위 안에서 문항을 만든다.
   - 범위 밖의 새로운 주제를 지어내지 말 것. (학교가 안 가르친 걸 물으면 선행학습에 해롭다)
2. 주어진 [채점 요소]가 자연스럽게 평가될 수 있는 문항으로 만든다.
   - 예: 채점 요소가 "발표의 전달력과 내용의 완성도"라면, 발표하는 문항이어야 한다.
3. [평가유형]에 맞는 발문 형식을 지킨다. (논술/서술/포트폴리오/구술발표/실기 형식이 각각 다름)
4. 해당 학년 수준에 맞춘다. 너무 어렵거나 대학 수준으로 가지 말 것.
5. 실제 학교 시험지에 나올 법한 자연스럽고 명확한 한국어 발문으로 쓴다.
   - 모호한 지시("잘 정리하시오") 금지. 무엇을, 어떻게, 무엇으로 제출하는지 분명히.
6. 정답이나 모범답안을 절대 쓰지 않는다. 문항(발문)만 만든다.

═══════════════════════════════════════════
[출력 항목]
═══════════════════════════════════════════
- questionContent: 학생이 보게 될 실제 발문. 2~4문장. 명확하고 구체적으로.
- conditions: 분량/발표시간/제출물 같은 조건을 한 줄로. (정보 없으면 평가유형에 맞게 합리적으로 제시)
- guideForStudent: 이 문항을 준비할 때 무엇에 신경 쓰면 좋은지 1~2문장. (채점 요소와 연결)
- basedOn: 어떤 성취기준/핵심개념에 근거해 만들었는지 한 줄.

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만, 백틱 없이)
═══════════════════════════════════════════
{
  "questionContent": "<예상 발문 2~4문장>",
  "conditions": "<분량/시간/제출물 조건 한 줄>",
  "guideForStudent": "<준비 팁 1~2문장>",
  "basedOn": "<근거 성취기준/핵심개념 한 줄>"
}`;
}

function buildUserPrompt(body: RequestBody): string {
  const parts: string[] = [];

  const meta: string[] = [];
  meta.push(`과목: ${body.subject}`);
  meta.push(`학년: ${body.grade}학년`);
  meta.push(`평가유형: ${body.displayType || body.evalType}`);
  if (body.score) meta.push(`배점: ${body.score}점`);
  if (body.taskTitle) meta.push(`과제 제목: ${body.taskTitle}`);
  parts.push(`═══ 평가 정보 ═══\n${meta.join("\n")}`);

  parts.push(`═══ 단원 / 주제 ═══\n${body.unitTopic || "(미입력)"}`);
  parts.push(`═══ 성취기준 ═══\n${body.achievementStandard || "(미입력)"}`);
  if (body.coreConcept) parts.push(`═══ 핵심개념 ═══\n${body.coreConcept}`);
  if (body.scoringFactors) parts.push(`═══ 채점 요소 ═══\n${body.scoringFactors}`);

  // 분량/시간 힌트
  const cond: string[] = [];
  if (body.minChars || body.maxChars) cond.push(`글자수: ${body.minChars ?? "?"}~${body.maxChars ?? "?"}자`);
  if (body.presentTimeMin || body.presentTimeMax) cond.push(`발표시간: ${body.presentTimeMin ?? "?"}~${body.presentTimeMax ?? "?"}분`);
  if (cond.length > 0) parts.push(`═══ 조건 힌트 ═══\n${cond.join(", ")}`);

  parts.push(typeGuide(body.displayType || "", body.evalType || ""));

  parts.push(`위 정보를 근거로, 이 수행평가에서 나올 법한 예상 문항 1개를 만드세요.

✅ 체크리스트:
1. 성취기준/핵심개념 범위 안에서만 (범위 밖 주제 금지)
2. 채점 요소가 평가될 수 있는 문항
3. ${body.displayType || body.evalType} 형식에 맞는 발문
4. ${body.grade}학년 수준
5. 모범답안 쓰지 말 것 (발문만)
6. 반드시 JSON만 응답`);

  return parts.join("\n\n");
}