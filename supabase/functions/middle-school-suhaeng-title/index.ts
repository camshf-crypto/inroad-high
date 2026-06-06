// supabase/functions/middle-school-suhaeng-title/index.ts
// 중등 학교 수행평가 — 예상 문항(발문) 생성
// 목적: 학교가 실제 발문을 공개하지 않으므로, 단원·성취기준·핵심개념·채점요소를 근거로
//       "이 수행평가에서 나올 법한 예상 문항" 1개를 생성한다. (학생 선행학습용)
//
// 분량 규칙 (중요):
//   - DB에 글자수(min/max) 또는 발표시간이 있으면 그 값을 그대로 쓴다.
//   - DB에 없으면 평가유형별 기본 분량을 코드에서 정해 AI에게 명확히 전달한다.
//   - "A4 O페이지", "슬라이드 O장" 같은 물리적 분량은 절대 만들지 않는다. (화면에 텍스트로 작성하는 서비스)
//   - 문항은 간결하게. 요구 단계를 줄줄이 나열하지 않는다.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface RequestBody {
  subject: string;
  grade: string;
  unitTopic: string;
  achievementStandard: string;
  coreConcept?: string;
  scoringFactors?: string;
  evalType: string;
  displayType?: string;
  taskTitle?: string;
  score?: number;
  minChars?: number;
  maxChars?: number;
  presentTimeMin?: number;
  presentTimeMax?: number;
}

// ─────────────────────────────────────────────
// 평가유형별 기본 분량 (DB에 분량 정보가 없을 때 사용)
//  - 글자수형: min~max 자
//  - 시간형: min~max 분 (구술발표)
// ─────────────────────────────────────────────
function resolveLength(body: RequestBody): { label: string; note: string } {
  const t = body.displayType || body.evalType || "";

  // 1) DB에 발표시간이 있으면 우선
  if (body.presentTimeMin || body.presentTimeMax) {
    return {
      label: `발표시간 ${body.presentTimeMin ?? 3}~${body.presentTimeMax ?? 5}분`,
      note: `발표 ${body.presentTimeMin ?? 3}~${body.presentTimeMax ?? 5}분 분량으로 준비하는 과제`,
    };
  }

  // 2) DB에 글자수가 있으면 우선
  if (body.minChars || body.maxChars) {
    const min = body.minChars ?? 200;
    const max = body.maxChars ?? 400;
    return {
      label: `${min}~${max}자로 작성`,
      note: `학생이 ${min}~${max}자 분량으로 글을 쓰는 과제`,
    };
  }

  // 3) DB에 분량 정보가 없으면 → 평가유형별 기본값
  if (t.includes("구술") || t.includes("발표")) {
    return { label: "발표시간 3~5분", note: "발표 3~5분 분량으로 준비하는 과제" };
  }
  if (t.includes("서술")) {
    return { label: "200~400자로 작성", note: "학생이 200~400자 분량으로 핵심을 쓰는 과제" };
  }
  if (t.includes("논술")) {
    return { label: "400~800자로 작성", note: "학생이 400~800자 분량으로 논하는 과제" };
  }
  if (t.includes("포트폴리오") || t.includes("주제탐구") || t.includes("프로젝트")) {
    return { label: "400~600자로 작성", note: "학생이 400~600자 분량의 글로 정리하는 과제 (페이지/슬라이드 아님)" };
  }
  if (t.includes("실기") || t.includes("탐구수행")) {
    return { label: "300~500자로 작성", note: "수행 과정과 결과를 300~500자 분량으로 기록하는 과제" };
  }
  // 기타
  return { label: "300~500자로 작성", note: "학생이 300~500자 분량으로 쓰는 과제" };
}

// 평가유형 → 문항이 갖춰야 할 형식 가이드
function typeGuide(displayType: string, evalType: string): string {
  const t = displayType || evalType || "";
  if (t.includes("논술")) {
    return `[논술형 문항 형식]
- 하나의 논제를 제시하고, 학생이 자기 주장과 근거를 갖춰 글로 논하도록 한다.
- "~에 대해 자신의 생각을 논하시오", "~을 비교하여 서술하시오" 형태.`;
  }
  if (t.includes("서술")) {
    return `[서술형 문항 형식]
- 핵심 개념을 정확히 설명하거나 적용하도록 하는 간결한 발문.
- "~을 설명하시오", "~의 과정을 서술하시오" 형태.`;
  }
  if (t.includes("포트폴리오") || t.includes("주제탐구") || t.includes("프로젝트")) {
    return `[포트폴리오/프로젝트 문항 형식]
- 하나의 주제를 조사·정리하는 활동 과제. 단, 학생은 화면에 글로 작성한다(종이 보고서·슬라이드 아님).
- "~을 조사하여 ~로 정리하시오" 형태. 단계를 너무 많이 늘어놓지 말 것.`;
  }
  if (t.includes("구술") || t.includes("발표")) {
    return `[구술발표 문항 형식]
- 학생이 준비해 발표할 주제를 제시한다. "~을 조사하여 발표하시오" 형태.`;
  }
  if (t.includes("실기") || t.includes("탐구수행")) {
    return `[실기/탐구수행 문항 형식]
- 직접 수행·관찰하고 과정을 기록하도록 한다. "~을 수행하고 그 과정을 기록하시오" 형태.`;
  }
  return `[일반 과제 문항 형식]\n- 학습 목표를 확인할 수 있는 명확하고 간결한 수행 지시문.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();

    if (!body.achievementStandard && !body.unitTopic && !body.taskTitle) {
      return jsonError("문항을 생성할 단원/성취기준 정보가 부족합니다.", 400);
    }

    const length = resolveLength(body);

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(body, length);

    const { feedback, tokensUsed, model } = await callOpenAI({
      systemPrompt,
      userPrompt,
      model: "gpt-4o",
      temperature: 0.6,
    });

    const result = normalize(feedback, length.label);

    return jsonResponse({
      success: true,
      analysis: result,
      meta: { model, tokensUsed },
    });
  } catch (e) {
    console.error("[middle-school-suhaeng-title]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function normalize(raw: any, lengthLabel: string) {
  // conditions는 코드가 결정한 분량(lengthLabel)을 우선 사용해 AI가 멋대로 부풀리는 것을 막음
  return {
    questionContent: raw.questionContent ?? "",
    conditions: lengthLabel,                       // ⭐ 코드가 정한 분량만 사용
    guideForStudent: raw.guideForStudent ?? "",
    basedOn: raw.basedOn ?? "",
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
1. 반드시 주어진 [성취기준]과 [핵심개념]의 범위 안에서 문항을 만든다. (범위 밖 주제 금지)
2. 주어진 [채점 요소]가 자연스럽게 평가될 수 있는 문항으로 만든다.
3. [평가유형]에 맞는 발문 형식을 지킨다.
4. 해당 학년 수준에 맞춘다. 너무 어렵거나 대학 수준으로 가지 말 것.
5. 정답이나 모범답안을 절대 쓰지 않는다. 문항(발문)만 만든다.

═══════════════════════════════════════════
[⭐ 분량 규칙 — 매우 중요]
═══════════════════════════════════════════
- 이 서비스의 학생은 화면에 '텍스트로' 답안을 작성한다. 실제 종이 보고서·슬라이드·전시물을 만드는 게 아니다.
- 따라서 "A4 O페이지", "슬라이드 O장", "O장 이상", "포스터", "전시" 같은 물리적 분량/형태 조건은 절대 쓰지 마라.
- 분량은 questionContent 본문 안에 굳이 넣지 마라. (분량은 시스템이 따로 안내한다)
- 만약 본문에 분량을 언급해야 한다면 아래 [목표 분량]에 주어진 값만 쓴다. 그 외 숫자를 지어내지 마라.

═══════════════════════════════════════════
[⭐ 간결함 규칙 — 매우 중요]
═══════════════════════════════════════════
- questionContent는 2~3문장 이내. 핵심 과제 하나에 집중한다.
- "조사하고 + 분석하고 + 작성하고 + 성찰하고..." 식으로 단계를 4개 이상 나열하지 마라.
- 중학생이 한눈에 "무엇을 하면 되는지" 알 수 있게 간결하게.

═══════════════════════════════════════════
[출력 항목]
═══════════════════════════════════════════
- questionContent: 학생이 보게 될 실제 발문. 2~3문장 이내, 간결하게. (페이지·슬라이드·장수 언급 금지)
- guideForStudent: 준비할 때 신경 쓸 점 1문장. (채점 요소와 연결)
- basedOn: 어떤 성취기준/핵심개념에 근거했는지 한 줄.

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만, 백틱 없이)
═══════════════════════════════════════════
{
  "questionContent": "<예상 발문 2~3문장, 간결하게>",
  "guideForStudent": "<준비 팁 1문장>",
  "basedOn": "<근거 성취기준/핵심개념 한 줄>"
}`;
}

function buildUserPrompt(body: RequestBody, length: { label: string; note: string }): string {
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

  // 코드가 결정한 목표 분량 전달
  parts.push(`═══ 목표 분량 (이 값만 사용, 페이지/슬라이드 금지) ═══\n${length.note}`);

  parts.push(typeGuide(body.displayType || "", body.evalType || ""));

  parts.push(`위 정보를 근거로, 이 수행평가에서 나올 법한 예상 문항 1개를 만드세요.

✅ 체크리스트:
1. 성취기준/핵심개념 범위 안에서만
2. 채점 요소가 평가될 수 있는 문항
3. ${body.displayType || body.evalType} 형식
4. ${body.grade}학년 수준
5. ⭐ 2~3문장 이내로 간결하게 (요구 단계 줄줄이 금지)
6. ⭐ 페이지/슬라이드/장수 같은 물리적 분량 절대 금지
7. 모범답안 쓰지 말 것 (발문만)
8. 반드시 JSON만 응답`);

  return parts.join("\n\n");
}