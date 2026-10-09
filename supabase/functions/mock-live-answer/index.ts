// supabase/functions/mock-live-answer/index.ts
// 현장 모의면접 — 질문 하나 녹음이 끝나면 한 번 호출
//   한 번 녹음 안에 "본 질문 → 대답 → (면접관이 바로 한) 꼬리질문 → 대답 → 꼬리질문 → 대답 …"이 다 들어 있다.
//   1) 녹음 → 글 (whisper, 문장마다 시간)
//   2) AI가 문장마다 면접관/학생 + 몇 번째 문답인지 정한다 (버튼 없이 말투·내용으로)
//        qa 0 = 본 질문과 그 대답, qa 1 = 꼬리질문 1과 그 대답, qa 2 = 꼬리질문 2와 그 대답 …
//   3) 문답마다 피드백: 잘한 점 · 보완할 점 · 5항목 · 말 속도 (+ 마지막 대답 기준 추천 꼬리질문)
//
// 두 가지로 부른다
//   · multipart/form-data : audio(파일) + meta(JSON 문자열)  → 받아 적기부터 전부
//       meta.studentAudioPath 가 있으면 학생 핸드폰 녹음(스토리지 live-mock-audio)도 같이 받아 적어
//       원장 노트북 = 면접관, 학생 핸드폰 = 학생으로 시간순 합침 (서로 새어 들어간 같은 말은 하나만)
//   · application/json     : { meta, lines }                   → 선생님이 면접관/학생을 고친 뒤 그 문답 하나만 피드백 다시
// 저장은 화면에서 한다 (qa 0 = 본 질문 줄, qa 1~ = 꼬리질문 줄).

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";
import { callOpenAI } from "../_shared/openai.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Who = "interviewer" | "student";
interface Line { who: Who; text: string }
interface Seg { start: number; end: number; text: string; src?: "T" | "S" }
interface Meta {
  questionText: string;        // 화면에 띄운 질문 (말로 질문이면 빈 값)
  questionType?: string;       // 자기소개 · 생기부 · 기출 …
  voiceQuestion?: boolean;     // 본 질문을 선생님이 말로 했나
  continuation?: boolean;      // 앞 질문에 이어서 꼬리질문만 녹음했나 (모든 문답이 꼬리질문)
  studentName?: string;
  grade?: string;
  school?: string;             // 지원 대학
  major?: string;              // 지원 학과
  interviewType?: string;      // 전형
  previous?: { q: string; a: string }[]; // 같은 학생 앞선 문답
  concept?: string;            // 학생 컨셉 (진로계열검사·목표: 학과 · 직업 · 대학) — 답변이 컨셉에 맞는지 확인용
  studentAudioPath?: string;   // 학생 핸드폰 녹음 (스토리지 live-mock-audio 안 경로)
  studentDelaySec?: number;    // 학생 핸드폰이 원장보다 늦게 녹음을 시작한 시간 (대략)
}

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const LEVELS = ["상", "중", "하"];
const TAGS = ["질문 이해도", "답변 논리", "구체성", "전공 이해", "전달력"];

// ─────────────────────────────────────────────
// 1) 받아 적기
// ─────────────────────────────────────────────
async function transcribe(audio: File, hint: string) {
  const fd = new FormData();
  fd.append("file", audio, audio.name || "answer.webm");
  fd.append("model", "whisper-1");
  fd.append("language", "ko");
  fd.append("response_format", "verbose_json");
  // 말버릇까지 보려고 머뭇거림을 지우지 말고 들리는 대로 적게 유도 (whisper는 prompt 문체를 따라감)
  fd.append("prompt", `${hint ? `면접 질문: ${hint}\n` : ""}음… 어… 저는, 그… 아 네, 그러니까 음… 들리는 대로 받아 적기.`);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: fd,
  });
  if (!res.ok) throw new Error(`받아 적기 실패: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const segments: Seg[] = (data.segments ?? [])
    .map((s: any) => ({ start: Number(s.start) || 0, end: Number(s.end) || 0, text: String(s.text ?? "").trim() }))
    .filter((s: Seg) => s.text);
  return { segments, duration: Math.round(Number(data.duration ?? 0)), full: String(data.text ?? "") };
}

// ─────────────────────────────────────────────
// 2) 나누기 — 문장마다 누가 말했나 + 몇 번째 문답인가
// ─────────────────────────────────────────────
function splitPrompt(meta: Meta, dual = false) {
  return `너는 학원 모의면접 녹음을 정리하는 사람이다. 면접관(선생님)과 학생 한 명이 번갈아 말했다.
${dual ? `이번엔 마이크가 두 개다. 문장마다 [면접관 마이크] 또는 [학생 마이크]와 시작 시각(초)이 붙어 있고 시간순으로 섞여 있다.
- [면접관 마이크] 문장은 거의 면접관, [학생 마이크] 문장은 거의 학생이다. 마이크를 먼저 믿고, 내용이 확실히 다를 때만 바꾼다.
- 같은 교실이라 상대 목소리가 작게 새어 들어간다. 몇 초 안에 거의 같은 말이 두 마이크에 다 있으면, 말한 사람 쪽 마이크 문장만 남기고 다른 쪽은 who를 "drop"으로 한다.` : `말하는 사람을 구분하는 장치는 없으니 내용으로 판단한다.`}

각 문장에 두 가지를 붙인다.
1) who: "interviewer" | "student"${dual ? ' | "drop"' : ""}
   - 면접관: 질문("~나요?", "~말해 볼래요?", "~설명해 주세요", "왜 그렇게 생각해요?"), 화면에 띄운 질문과 비슷한 문장, 맞장구·진행("네", "좋아요", "그렇군요", "그럼")
   - 학생: "저는 ~", 경험·이유·생각을 설명하는 문장, 머뭇거림이 섞인 긴 문장
2) qa: 몇 번째 문답인지 (0부터)
   ${meta.continuation
      ? `- 이번 녹음은 앞 질문에 이어서 면접관이 바로 꼬리질문을 하는 장면부터 시작한다. 첫 면접관 질문이 qa 0 (= 꼬리질문)이다.`
      : `- qa 0 = 본 질문과 그 대답. 화면에 띄운 질문(또는 처음 면접관 말)이 본 질문이다. 면접관 목소리가 작아 본 질문이 안 잡혔으면 처음부터 학생 대답일 수 있다 — 그래도 qa 0.`}
   - 학생 대답 뒤에 면접관이 "새로 묻는 질문"을 하면 거기서 qa가 1 늘어난다 (꼬리질문). 그 뒤 학생 대답은 같은 qa.
   - 면접관의 맞장구·짧은 진행("네", "좋아요")은 새 질문이 아니다 — 지금 qa 그대로 둔다.
   - qa는 줄어들지 않는다.
3) questions: qa마다 면접관이 물은 질문을 한 문장으로 다듬어서 (뜻은 그대로, 받아 적기 오타만 고침)
   ${meta.continuation ? "" : `- qa 0이 화면에 띄운 질문 그대로면 그 문장을 그대로 쓴다.${meta.voiceQuestion ? " (이번 본 질문은 선생님이 말로 했다)" : ""}`}

문장 내용은 고치지 말고 번호만 보고 붙인다. 반드시 아래 json 형식으로만 답한다.
{
  "labels": [{ "who": "interviewer", "qa": 0 }],   // 문장 번호 순서대로, 문장 수와 같은 길이
  "questions": [{ "qa": 0, "text": "" }]
}`;
}

// ─────────────────────────────────────────────
// 3) 문답마다 피드백
// ─────────────────────────────────────────────
function feedbackPrompt() {
  return `너는 고입·대입 면접을 오래 가르친 면접 코치다. 학원 모의면접에서 한 학생이 받은 질문과 대답 목록(본 질문 + 면접관이 이어서 한 꼬리질문들)을 받는다.
학생 대답만 평가한다. 처음 모의면접을 진행하는 선생님도 그대로 읽어 줄 수 있게 쉬운 말로 쓴다. 대신 답을 써 주지는 않는다.

문답마다:
- summary: 학생이 한 말을 1문장으로 요약
- good: 잘한 점 1~2문장. 학생이 실제로 한 말(경험·단어)을 짚어서.
- improve: 보완할 점 1~2문장. 무엇을 어떻게 바꾸면 좋은지 구체적으로.
  · 꼬리질문의 대답은 앞 대답과 이어지는지(말이 바뀌거나 어긋나지 않는지)도 본다.
- tags: 아래 5개를 순서대로, level은 "상" | "중" | "하"
  · "질문 이해도" — 질문 의도에 맞게 바로 답했나
  · "답변 논리" — 주장 → 근거 → 사례 → 마무리가 자연스럽게 이어지나
  · "구체성" — 실제 활동·경험·장면을 썼나
  · "전공 이해" — 지원 학과와 연결되는 개념을 이해하고 말했나 (학과 정보가 없거나 인성 질문이면 진로·학업 연결로 본다)
  · "전달력" — 머뭇거림·같은 말 반복 (받아 적은 글 기준. 시선·자세는 보지 않는다)
- fillerCount: "음", "어", "그…" 같은 머뭇거림 횟수 (대략)
- concept: 학생 컨셉이 주어졌을 때만. 이 대답이 학생 컨셉(희망 학과·직업)과 이어지는지 본다.
  · 학생은 대학별로 답변을 미리 만들어 왔기 때문에, 학교마다 말이 달라져 컨셉이 흐려졌는지 확인하는 게 목적이다.
  · level: "상"(컨셉이 분명히 드러남) | "중"(관련은 있지만 연결이 약함) | "하"(컨셉과 상관없거나 다른 진로처럼 들림)
  · comment: 1문장. 어디서 컨셉이 드러났는지, 또는 어떤 한 문장을 넣으면 컨셉과 이어지는지.
  · 인성 질문이어도 마지막에 컨셉으로 모이면 "상"이다. 컨셉이 없으면 null.
- habits: 말버릇 0~3개. 받아 적은 글에서 반복되는 말하기 습관만 (예: "문장 끝을 '~것 같습니다'로 흐림 4번", "'그래서'로 문장 시작 5번", "같은 말 되풀이", "문장이 끝나지 않고 '~고, ~고'로 길게 이어짐"). 없으면 빈 배열.
대답이 거의 없으면 good은 빈 문자열, improve에 "대답이 짧았어요 …"처럼 안내한다.

그리고 followUps: 마지막 대답에서 더 파고들 만한 꼬리질문 3개 (면접관이 이어서 물어볼 때 참고용). 짧고 실제 면접관 말투로, 이미 한 질문과 겹치지 않게.

반드시 아래 json 형식으로만 답한다.
{
  "pairs": [{ "qa": 0, "summary": "", "good": "", "improve": "", "tags": [{ "label": "질문 이해도", "level": "상" }], "fillerCount": 0, "concept": { "level": "중", "comment": "" }, "habits": [""] }],
  "followUps": ["", "", ""]
}`;
}

function contextHeader(meta: Meta) {
  const target = [meta.school, meta.major, meta.interviewType].filter(Boolean).join(" · ");
  const prev = (meta.previous ?? []).slice(-4)
    .map((p, i) => `${i + 1}. Q: ${p.q}\n   A: ${String(p.a ?? "").slice(0, 200)}`).join("\n");
  return `학생: ${meta.studentName ?? ""} (${meta.grade ?? ""})${target ? ` · 지원: ${target}` : ""}
학생 컨셉: ${meta.concept || "(없음)"}
화면에 띄운 질문: ${meta.questionText || (meta.continuation ? "(앞 질문에 이어지는 꼬리질문)" : "(선생님이 말로 질문함)")}${meta.questionType ? ` [${meta.questionType}]` : ""}
${prev ? `\n앞선 문답:\n${prev}\n` : ""}`;
}

function cleanFeedback(raw: any) {
  const tagsIn = Array.isArray(raw?.tags) ? raw.tags : [];
  return {
    summary: String(raw?.summary ?? ""),
    good: String(raw?.good ?? ""),
    improve: String(raw?.improve ?? ""),
    tags: TAGS.map((label) => {
      const hit = tagsIn.find((t: any) => t?.label === label);
      return { label, level: LEVELS.includes(hit?.level) ? hit.level : "중" };
    }),
    fillerCount: Number.isFinite(Number(raw?.fillerCount)) ? Number(raw.fillerCount) : 0,
    concept: raw?.concept && LEVELS.includes(raw.concept.level)
      ? { level: raw.concept.level, comment: String(raw.concept.comment ?? "") }
      : null,
    habits: (Array.isArray(raw?.habits) ? raw.habits : []).map((h: any) => String(h ?? "").trim()).filter(Boolean).slice(0, 3),
  };
}

// 군말(음·어·아·그·저·뭐…)을 단어별로 직접 셈 — AI 짐작보다 정확
const FILLERS: [string, RegExp][] = [
  ["음", /(^|[\s,.…])음+(?=[\s,.…?!]|$)/g],
  ["어", /(^|[\s,.…])어+(?=[\s,.…?!]|$)/g],
  ["아", /(^|[\s,.…])아+(?=[\s,.…?!]|$)/g],
  ["그", /(^|[\s,.…])그+(?=[\s,.…?!]|$)/g],
  ["저", /(^|[\s,.…])저(?=[\s,.…]|$)/g],
  ["뭐", /(^|[\s,.…])뭐(?=[\s,.…]|$)/g],
  ["약간", /약간/g],
  ["그러니까", /그러니까/g],
];
function countFillers(text: string) {
  const out: Record<string, number> = {};
  let total = 0;
  for (const [w, re] of FILLERS) {
    const n = (text.match(re) ?? []).length;
    if (n) { out[w] = n; total += n; }
  }
  return { fillers: out, total };
}

// 같은 사람이 이어 말한 문장은 한 덩어리로
function merge(lines: Line[]): Line[] {
  const out: Line[] = [];
  for (const l of lines) {
    const last = out[out.length - 1];
    if (last && last.who === l.who) last.text = `${last.text} ${l.text}`.trim();
    else out.push({ ...l });
  }
  return out;
}

interface Pair {
  qa: number
  kind: "main" | "followup"
  question: string
  answer: string
  lines: Line[]
  studentSec: number
  feedback?: any
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    if (!OPENAI_KEY) return jsonError("OPENAI_API_KEY가 설정되지 않았어요.", 500);

    const ctype = req.headers.get("content-type") ?? "";
    let meta: Meta;
    let pairs: Pair[] = [];
    let durationSec = 0;

    if (ctype.includes("multipart/form-data")) {
      // ── 녹음 → 받아 적기 → 나누기 ──
      const form = await req.formData();
      const audio = form.get("audio");
      meta = JSON.parse(String(form.get("meta") ?? "{}"));
      if (!(audio instanceof File)) return jsonError("녹음 파일이 없어요.", 400);
      if (audio.size < 2000) return jsonError("녹음이 너무 짧아요. 다시 녹음해 주세요.", 400);

      const t = await transcribe(audio, meta.questionText ?? "");
      durationSec = t.duration;
      let segs: Seg[] = (t.segments.length ? t.segments : (t.full ? [{ start: 0, end: t.duration, text: t.full }] : []))
        .map((x) => ({ ...x, src: "T" as const }));

      // 학생 핸드폰 녹음이 있으면 같이 받아 적고 시간순으로 합침
      let dual = false;
      if (meta.studentAudioPath) {
        try {
          const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          const { data: blob, error: dlErr } = await admin.storage.from("live-mock-audio").download(meta.studentAudioPath);
          if (dlErr || !blob) throw dlErr ?? new Error("학생 녹음 없음");
          if (blob.size >= 2000) {
            const ext = meta.studentAudioPath.split(".").pop() || "webm";   // 아이폰은 mp4
            const st = await transcribe(new File([blob], `student.${ext}`, { type: blob.type || `audio/${ext}` }), meta.questionText ?? "");
            const d = Number(meta.studentDelaySec ?? 0.3);
            const sSegs: Seg[] = (st.segments.length ? st.segments : (st.full ? [{ start: 0, end: st.duration, text: st.full }] : []))
              .map((x) => ({ start: x.start + d, end: x.end + d, text: x.text, src: "S" as const }));
            if (sSegs.length) {
              segs = [...segs, ...sSegs].sort((a, b) => a.start - b.start);
              dual = true;
              durationSec = Math.max(durationSec, Math.round(st.duration + d));
            }
          }
          await admin.storage.from("live-mock-audio").remove([meta.studentAudioPath]);
        } catch (e) {
          console.error("[mock-live-answer] 학생 녹음 실패 — 원장 녹음만 사용", e);
        }
      }
      if (!segs.length) return jsonError("목소리가 잡히지 않았어요. 마이크를 확인해 주세요.", 400);

      const numbered = segs.map((s, i) =>
        dual ? `${i + 1}. [${s.src === "T" ? "면접관 마이크" : "학생 마이크"} ${s.start.toFixed(1)}초] ${s.text}` : `${i + 1}. ${s.text}`
      ).join("\n");
      const { feedback: sp } = await callOpenAI({
        systemPrompt: splitPrompt(meta, dual),
        userPrompt: `${contextHeader(meta)}\n받아 적은 문장:\n${numbered}`,
        model: "gpt-4o",
        temperature: 0.1,
      });

      // 라벨 정리: qa는 줄어들지 않게
      const labels: any[] = Array.isArray(sp?.labels) ? sp.labels : [];
      let qaNow = 0;
      const tagged = segs.map((s, i) => {
        const l = labels[i] ?? {};
        const fallback: Who = dual ? (s.src === "T" ? "interviewer" : "student") : (i === 0 ? "interviewer" : "student");
        const drop = dual && l.who === "drop";
        const who: Who = l.who === "interviewer" ? "interviewer" : l.who === "student" ? "student" : fallback;
        const qa = Math.max(qaNow, Number.isFinite(Number(l.qa)) ? Number(l.qa) : qaNow);
        qaNow = qa;
        return { ...s, who, qa, drop };
      }).filter((x) => !x.drop);

      // qa 번호를 0,1,2… 로 다시 매김
      const qaIds = [...new Set(tagged.map((x) => x.qa))].sort((a, b) => a - b);
      const qMap: Record<number, string> = {};
      (Array.isArray(sp?.questions) ? sp.questions : []).forEach((q: any) => {
        if (Number.isFinite(Number(q?.qa))) qMap[Number(q.qa)] = String(q.text ?? "").trim();
      });

      pairs = qaIds.map((id, idx) => {
        const mine = tagged.filter((x) => x.qa === id);
        const interviewerText = mine.filter((x) => x.who === "interviewer").map((x) => x.text).join(" ").trim();
        const answer = mine.filter((x) => x.who === "student").map((x) => x.text).join(" ").trim();
        const isMain = idx === 0 && !meta.continuation;
        const question = isMain && meta.questionText && !meta.voiceQuestion
          ? meta.questionText
          : (qMap[id] || interviewerText || (isMain ? meta.questionText : "") || "(질문이 잘 안 들렸어요)");
        return {
          qa: idx,
          kind: isMain ? "main" : "followup",
          question,
          answer,
          lines: merge(mine.map((x) => ({ who: x.who, text: x.text }))),
          studentSec: mine.filter((x) => x.who === "student").reduce((a, x) => a + Math.max(0, x.end - x.start), 0),
        } as Pair;
      });
    } else {
      // ── 선생님이 고친 대화로 그 문답 하나만 다시 ──
      const body = await req.json();
      meta = body.meta ?? {};
      const lines: Line[] = (body.lines ?? []).filter((l: any) => l?.text?.trim());
      if (!lines.length) return jsonError("대화 내용이 없어요.", 400);
      pairs = [{
        qa: 0, kind: "main", question: meta.questionText, lines,
        answer: lines.filter((l) => l.who === "student").map((l) => l.text).join(" ").trim(),
        studentSec: 0,
      }];
    }

    // ── 문답마다 피드백 (한 번에) ──
    const pairsText = pairs.map((p) =>
      `[${p.kind === "main" ? "본 질문" : `꼬리질문 ${p.qa}`}]\n면접관: ${p.question}\n학생: ${p.answer || "(대답 없음)"}`
    ).join("\n\n");
    const { feedback: fb } = await callOpenAI({
      systemPrompt: feedbackPrompt(),
      userPrompt: `${contextHeader(meta)}\n이번 문답:\n${pairsText}`,
      model: "gpt-4o",
      temperature: 0.3,
    });
    const fbPairs: any[] = Array.isArray(fb?.pairs) ? fb.pairs : [];
    pairs = pairs.map((p, i) => {
      const raw = fbPairs.find((x) => Number(x?.qa) === p.qa) ?? fbPairs[i] ?? {};
      const chars = p.answer.replace(/\s/g, "").length;
      // 말 속도 (분당 글자, 공백 제외) — 학생이 말한 구간 기준. 한국어 면접은 보통 250~350
      const charsPerMin = p.studentSec > 5 ? Math.round((chars / p.studentSec) * 60) : null;
      const f = countFillers(p.answer);
      const fb = cleanFeedback(raw);
      return {
        ...p,
        feedback: {
          ...fb,
          charsPerMin,
          fillers: f.fillers,                                // { 음: 3, 어: 2 }
          fillerCount: f.total || fb.fillerCount,
          conceptText: meta.concept ?? null,                 // 다시 받기 때 그대로 넘기려고 저장
        },
      };
    });
    const followUps = (Array.isArray(fb?.followUps) ? fb.followUps : [])
      .map((s: any) => String(s ?? "").trim()).filter(Boolean).slice(0, 3);

    const first = pairs[0];
    return jsonResponse({
      success: true,
      durationSec,
      pairs,
      followUps,
      // 한 문답만 다시 받을 때(선생님 화면) 쓰는 값
      lines: first.lines,
      answerText: first.answer,
      question: first.question,
      feedback: { ...first.feedback, followUps },
    });
  } catch (e) {
    console.error("[mock-live-answer]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});