// supabase/functions/middle-essay-questions/index.ts
// 중등 자소서 — AI 예상질문 추출
//
// 응답: { questions: [{ text, tag, purpose: [...], targetSection }] }

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";

interface SectionContent {
  지원동기?: string;
  활동계획?: string;
  진로계획?: string;
  인성?: string;
}

interface RequestBody {
  schoolName: string;
  studentName?: string;
  sections: SectionContent;
  keywords?: string[];
  count?: number; // 생성할 질문 개수 (기본 8개)
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const body: RequestBody = await req.json();

    if (!body.schoolName || !body.sections) {
      return jsonError("학교명과 자소서 내용이 필요해요.", 400);
    }

    const filledSections = Object.entries(body.sections).filter(
      ([_, v]) => v && v.trim().length > 30,
    );
    if (filledSections.length === 0) {
      return jsonError("자소서 내용이 비어있어요. 작성 후 다시 시도해주세요.", 400);
    }

    const count = body.count ?? 8;

    const systemPrompt = buildSystemPrompt(count);
    const userPrompt = buildUserPrompt(body, count);

    const { feedback, tokensUsed, model } = await callOpenAI({
      systemPrompt,
      userPrompt,
      model: "gpt-4o",
      temperature: 0.5, // 다양한 질문 위해 약간 높임
    });

    const questions = normalizeQuestions(feedback);

    return jsonResponse({
      success: true,
      questions,
      meta: { model, tokensUsed, count: questions.length },
    });
  } catch (e) {
    console.error("[middle-essay-questions]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

// ============================================================
// 응답 정규화
// ============================================================
function normalizeQuestions(raw: any): Array<{
  text: string;
  tag: string;
  purpose: string[];
  targetSection: string;
}> {
  const list = Array.isArray(raw.questions) ? raw.questions : [];
  return list.map((q: any) => ({
    text: q.text ?? "",
    tag: q.tag ?? "일반",
    purpose: Array.isArray(q.purpose) ? q.purpose : [],
    targetSection: q.targetSection ?? "전체",
  })).filter((q) => q.text.length > 0);
}

// ============================================================
// 프롬프트
// ============================================================
function buildSystemPrompt(count: number): string {
  return `당신은 고등학교 입학 면접관 역할을 수행하는 전문 입시 컨설턴트입니다.
중학생이 작성한 자기소개서를 읽고, 면접에서 학생에게 던질 수 있는 예상질문 ${count}개를 만듭니다.

═══════════════════════════════════════════
[중요] 좋은 면접 질문의 조건
═══════════════════════════════════════════
1. **자소서 특정 부분을 파고들기** — 학생이 쓴 구체적 사건/활동/주장을 인용하며 질문
2. **사실 확인** — 자소서에 적은 활동·경험이 진짜인지 확인할 수 있는 질문
3. **깊이 평가** — 단순 행동 너머 그 의미·배움·고민을 묻는 질문
4. **연결 검증** — 활동과 진로/가치관 사이의 연결고리를 점검하는 질문
5. **취약점 공격** — 자소서의 모호하거나 추상적인 부분을 구체화하라고 요구
6. **상황·반대 입장** — "만약 ~라면?" 같은 상황 질문, 반대 사례 제시
7. **학교 적합성** — 지원 학교의 특성·이념과 학생의 어울림을 검증

═══════════════════════════════════════════
질문 카테고리 (각 질문에 tag로 명시)
═══════════════════════════════════════════
- "지원동기": 학교를 지원한 이유 검증
- "활동심화": 자소서의 활동 경험을 깊이 파고듦
- "진로검증": 진로 계획의 구체성·실현 가능성
- "인성": 가치관·태도·갈등 해결 방식
- "사실확인": 자소서 내용이 진짜인지 검증
- "취약점": 자소서의 모호한 부분 구체화 요구
- "상황대처": "만약 ~라면" 상황 질문
- "건학이념": 학교 건학이념과의 적합성

═══════════════════════════════════════════
질문 작성 원칙
═══════════════════════════════════════════
- 학생이 자소서에 적은 **구체적 단어·사건·숫자**를 인용해서 질문 시작
- 모호한 일반 질문 금지 ("학생은 어떤 사람인가요?" X)
- 답하기 어려운 날카로운 질문 1-2개 포함
- 학생이 키워드 정한 게 있으면 그 키워드 검증 질문도 1개 포함
- 각 질문은 한 문장 (50-120자)

═══════════════════════════════════════════
purpose 작성 — 질문 의도 (학생에게 보여주는 힌트)
═══════════════════════════════════════════
각 질문마다 2-3개 의도 bullet (배열). 학생이 답변 준비할 때 참고용:
- "이 활동의 진정성·구체성을 확인하려는 의도"
- "단순 참여 vs 주도적 역할 구분 의도"
- "진로 연결고리의 논리성 검증" 등

═══════════════════════════════════════════
응답 형식 (반드시 이 JSON만)
═══════════════════════════════════════════
{
  "questions": [
    {
      "text": "<예상 질문 한 문장>",
      "tag": "<카테고리>",
      "purpose": ["<의도 1>", "<의도 2>", "<의도 3>"],
      "targetSection": "<지원동기|활동계획|진로계획|인성|전체>"
    },
    ... (총 ${count}개)
  ]
}`;
}

function buildUserPrompt(body: RequestBody, count: number): string {
  const parts: string[] = [];

  const meta: string[] = [];
  meta.push(`지원 학교: ${body.schoolName}`);
  if (body.studentName) meta.push(`학생 이름: ${body.studentName}`);
  if (body.keywords && body.keywords.length > 0) {
    meta.push(`학생이 정한 키워드 5개: ${body.keywords.join(", ")}`);
  }
  parts.push(`[기본 정보]\n${meta.join("\n")}`);

  // 자소서 4개 항목
  parts.push(`[학생 자소서]`);
  if (body.sections.지원동기) {
    parts.push(`▶ 지원동기 (건학이념 연계)\n${body.sections.지원동기}`);
  }
  if (body.sections.활동계획) {
    parts.push(`▶ 꿈과 끼를 살리기 위한 활동계획\n${body.sections.활동계획}`);
  }
  if (body.sections.진로계획) {
    parts.push(`▶ 진로계획\n${body.sections.진로계획}`);
  }
  if (body.sections.인성) {
    parts.push(`▶ 인성 (배려·나눔·협력)\n${body.sections.인성}`);
  }

  parts.push(
    `위 자소서를 읽고 면접 예상질문 ${count}개를 만들어주세요.\n\n` +
      `체크리스트:\n` +
      `1. 각 질문은 자소서의 특정 부분을 인용하며 시작\n` +
      `2. 카테고리 다양하게 (지원동기/활동심화/진로검증/인성/사실확인/취약점/상황대처/건학이념)\n` +
      `3. 날카로운 질문 1-2개 포함\n` +
      `4. 키워드 검증 질문 1개 포함 (키워드가 있으면)\n` +
      `5. 각 질문에 purpose 2-3개 (질문 의도)\n` +
      `6. targetSection으로 어느 항목에서 파생됐는지 표시\n` +
      `7. 반드시 JSON만 응답`
  );

  return parts.join("\n\n");
}