// supabase/functions/school-task-ai/index.ts
// 내 학교 과제 AI — 한 함수에서 단계별 action 처리
//   analyze  : 안내문(글·사진·PDF) 분석 + 입시로드맵 추천 (이미 한 탐구 → 심화 / 이번 학기 / 남겨 두기)
//   qa       : 질의응답 다음 질문 1개 (최대 5개, 보기 3개)
//   guide    : 학습가이드 (감점 방지 체크리스트 포함)
//   draft    : 1차 초안 (제출할 글의 완성본 · 빈칸 없음 · 출처가 필요한 항목은 서버가 자료를 찾아 넣음)
//   score    : 안내문 평가 기준으로 채점
//   review   : 선생님용 AI 첨삭 코멘트 (학생에게 숨김 상태로 저장)
//   finalize : 세특 예상 문장 + 면접 예상질문
//   sources  : 자료 찾기 — 조사·분석이 필요한 항목(section)마다 실제 웹 자료 5개 (생수면 탐구보고서와 같은 방식)
// 호출한 사람의 로그인 권한(RLS)으로만 읽고 쓴다 → 남의 과제는 못 건드림.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODEL = "gpt-4o";
const BLANK_RE = /\[\[직접 입력:[^\]]*\]\]/g;

// ---------- OpenAI ----------
async function ai(system: string, content: any[] | string, temperature = 0.5): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system + "\n반드시 json 객체 하나로만 답한다. 모든 글은 한국어." },
        { role: "user", content },
      ],
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error?.message ?? "AI 호출 실패");
  return JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
}

const str = (v: unknown, max = 4000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v: unknown) => (Array.isArray(v) ? v : []);
// 질의응답 답 — 첫 질문은 여러 개를 고를 수 있어 배열일 수 있다 ("A + B" 로 합침)
const ansOf = (x: any) => {
  const a = Array.isArray(x?.answer) ? x.answer.map((v: any) => str(v, 120)).filter(Boolean).join(" + ") : str(x?.answer, 200);
  return str(x?.custom, 300) || a;
};

// ---------- 학생 맥락: 진로 컨셉 · 로드맵 · 지난 과제 ----------
async function studentContext(db: SupabaseClient, task: any) {
  const sid = task.student_id;
  const [concept, topics, nodes, pipes, past, reads, apt, acts] = await Promise.all([
    db.from("student_concept").select("grade, major, university, career").eq("student_id", sid),
    db.from("high_roadmap_topic").select("id, node_id, parent_topic_id, area, title, detail, status, major, series").eq("student_id", sid).limit(80),
    db.from("high_roadmap_node").select("id, grade, subject_name, areas, category").or(`student_id.eq.${sid},student_id.is.null`).limit(200),
    db.from("high_roadmap_pipeline").select("topic_id, step, status, content, final_content").eq("student_id", sid).limit(120),
    db.from("high_school_task").select("id, grade, semester, subject, title, setuk_text").eq("student_id", sid).eq("status", "done").neq("id", task.id).limit(20),
    // 학생 독서 기록 (입시로드맵 · 독서) — 책이 들어가는 과제는 이 책들을 먼저 쓴다
    db.from("high_reading").select("*").eq("student_id", sid).limit(60),
    // 성향 진단 · 학교 활동 — 정보가 적은 고1도 학생마다 다른 방향이 나오게 하는 재료
    db.from("high_aptitude_result").select("type_name").eq("student_id", sid).maybeSingle(),
    db.from("high_school_activity").select("category, name, grade").eq("student_id", sid).limit(40),
  ]);

  const nodeById = new Map((nodes.data ?? []).map((n: any) => [n.id, n]));
  const pipeText = new Map<string, string>();
  for (const p of pipes.data ?? []) {
    const t = str(p.final_content || p.content, 300);
    if (t) pipeText.set(p.topic_id, (pipeText.get(p.topic_id) ?? "") + ` [${p.step}] ${t}`);
  }
  const topicList = (topics.data ?? []).map((t: any) => {
    const n: any = nodeById.get(t.node_id);
    return {
      topicId: t.id, parentTopicId: t.parent_topic_id, status: t.status,
      grade: n?.grade ?? null, subject: n?.subject_name ?? null, area: t.area,
      title: t.title, detail: str(t.detail, 200), did: str(pipeText.get(t.id), 500),
    };
  });
  const nodeList = (nodes.data ?? []).map((n: any) => ({ nodeId: n.id, grade: n.grade, subject: n.subject_name, areas: n.areas }));
  /*
   * 진로 컨셉(진로계열검사 → 정한 학과·직업) — 이번 과제 학년 것을 쓴다.
   * 학년 줄이 비어 있으면(학과 없음) 그 아래 학년 중 가장 최근 것, 그래도 없으면 학과가 적힌 아무 줄.
   * (고3 줄부터 집으면 비어 있는 껍데기 줄의 학과가 들어가는 문제가 있었음)
   */
  const rows = (concept.data ?? []).filter((c: any) => str(c.major));
  const gnum = (g: unknown) => Number(String(g ?? "").match(/[123]/)?.[0] ?? 0);
  const tg = gnum(task.grade);
  const pick =
    rows.find((c: any) => gnum(c.grade) === tg) ??
    rows.filter((c: any) => gnum(c.grade) < tg).sort((a: any, b: any) => gnum(b.grade) - gnum(a.grade))[0] ??
    rows.sort((a: any, b: any) => gnum(b.grade) - gnum(a.grade))[0] ??
    null;

  // 학과 → 계열 (high_career_department.series). 칸 이름이 달라도 되게 몇 가지를 시도
  let series = "";
  if (pick?.major) {
    for (const col of ["name", "department", "major", "dept_name"]) {
      const { data, error } = await db.from("high_career_department").select("series").eq(col, pick.major).limit(1);
      if (!error) {
        series = str(data?.[0]?.series, 30);
        break;
      }
    }
  }

  /*
   * 학년별로 무엇에 맞출지 (진로계열검사 결과 기준)
   *   고1 → 계열 (넓게)   고2 → 학과 (맞춤)   고3 → 직업군 (뾰족하게, 실제 직업 문제까지 깊게)
   * 그 학년 값이 없으면 한 단계 넓은 값으로
   */
  const focus =
    tg >= 3 ? (str(pick?.career) ? { level: "직업군", value: str(pick?.career, 60) } : pick?.major ? { level: "학과", value: str(pick.major, 60) } : null)
    : tg === 2 ? (pick?.major ? { level: "학과", value: str(pick.major, 60) } : series ? { level: "계열", value: series } : null)
    : series ? { level: "계열", value: series } : pick?.major ? { level: "학과", value: str(pick.major, 60) } : null;

  // 독서 기록 — 칸 이름이 달라도 되게 몇 가지를 받아 준다
  const readings = (reads.data ?? []).map((b: any) => ({
    title: str(b.book_title ?? b.title, 80),
    author: str(b.author, 40),
    grade: gradeLabel(b.grade),
    subject: str(b.subject, 40),
    summary: str(b.summary ?? b.book_description, 200),
    impression: str(b.impression, 200),
  })).filter((b: any) => b.title);

  return {
    focus,
    readings,
    aptitude: str((apt as any)?.data?.type_name, 40),
    activities: ((acts as any)?.data ?? []).map((a: any) => `${gradeLabel(a.grade)} ${str(a.category, 20)} · ${str(a.name, 60)}`),
    concept: pick ? { ...pick, series } : null,
    topics: topicList,
    nodes: nodeList.slice(0, 120),
    pastTasks: (past.data ?? []).map((p: any) => ({ grade: p.grade, semester: p.semester, subject: p.subject, title: p.title, setuk: str(p.setuk_text, 200) })),
  };
}

// 안내문 파일 → 모델 입력 (사진은 이미지로, PDF는 파일로)
async function sourceParts(db: SupabaseClient, task: any) {
  const parts: any[] = [];
  for (const f of arr(task.source_files).slice(0, 6)) {
    const { data, error } = await db.storage.from("school-task-files").download(f.path);
    if (error || !data) continue;
    const buf = new Uint8Array(await data.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const b64 = btoa(bin);
    const type = f.type || data.type || "";
    if (type.includes("pdf")) parts.push({ type: "file", file: { filename: f.name || "안내문.pdf", file_data: `data:application/pdf;base64,${b64}` } });
    else if (type.startsWith("image/")) parts.push({ type: "image_url", image_url: { url: `data:${type};base64,${b64}` } });
  }
  return parts;
}

// 같은 교과군으로 보는 과목 — 과제 과목과 같은 군의 로드맵 칸을 먼저 고른다
const SUBJECT_FAMILY: Record<string, string[]> = {
  국어: ["국어", "문학", "독서", "작문", "화법", "언어", "매체"],
  수학: ["수학", "대수", "미적분", "확률", "통계", "기하"],
  영어: ["영어", "영미"],
  사회: ["사회", "통합사회", "경제", "정치", "법", "윤리", "지리", "세계사", "한국사", "역사", "국제", "금융", "도시", "여행"],
  과학: ["과학", "통합과학", "물리", "화학", "생명", "지구", "역학", "전자기", "물질", "세포", "유전", "행성", "기후변화와 환경"],
  정보: ["정보", "인공지능", "데이터", "기술"],
};
function familyOf(subject: string) {
  const s = String(subject || "");
  for (const [fam, keys] of Object.entries(SUBJECT_FAMILY)) if (keys.some((k) => s.includes(k))) return fam;
  return "";
}
// "2" · "2학년" · "고2" → "고2"
const gradeLabel = (g: unknown) => {
  const m = String(g ?? "").match(/[123]/);
  return m ? `고${m[0]}` : str(g, 10);
};

// 조사·분석 출처 규칙 — 가이드에서 쓴다 (출처를 지어내지 않고, 실제로 있는 곳에서 찾게 안내)
const SOURCE_RULE = `조사·분석·통계·사례가 들어가는 부분은 출처가 반드시 있어야 한다. 출처는 지어내지 않는다(기사·논문 제목, 숫자, 주소를 만들지 말 것).
대신 "어디서 무엇을 찾을지"를 실제로 있는 곳으로 안내한다: KOSIS 국가통계포털, 한국은행 경제통계시스템(ECOS), 공공데이터포털, 국가법령정보센터, 빅카인즈(뉴스), RISS·DBpia(논문), 정부 부처·통계청 보도자료, 교과서·책.
학생은 찾은 자료를 "기관 · 자료 이름 · 발표 날짜 · 주소" 형식으로 적는다. 책은 『제목』(저자)만 적고 쪽수는 적지 않는다.`;


/*
 * 글 구조(양식) — 입시로드맵 보고서 작성(ReportWriter)과 같은 13종 + 기본 서론·본론·결론
 *   학생이 초안 만들기 전에 고르고, 초안의 문단 제목(##)은 이 순서를 그대로 쓴다
 *   안내문의 필수 항목·평가 기준은 문단 제목이 아니라 문단 내용 안에서 다 채운다
 */
const FORMATS: { key: string; label: string; hint: string; parts: [string, string][] }[] = [
  { key: "basic", label: "서론·본론·결론", hint: "가장 기본적인 글 구조", parts: [["서론", "문제 제기·이 주제를 고른 이유"], ["본론 1", "첫 번째 핵심 내용과 근거"], ["본론 2", "두 번째 핵심 내용·사례 적용"], ["결론", "정리와 나의 생각·느낀 점"]] },
  { key: "argument", label: "논술·주장하는 글", hint: "입장을 정하고 근거로 설득", parts: [["쟁점 제시", "무엇을 두고 의견이 갈리는지"], ["내 주장", "어느 쪽인지 분명하게"], ["근거", "왜 그렇게 생각하는지 두세 가지"], ["반론 검토", "반대 입장을 다루고 재반박"], ["결론", "주장 정리와 남은 문제"]] },
  { key: "experiment", label: "실험 보고서", hint: "직접 실험하고 측정한 탐구", parts: [["서론", "왜 이 실험을 했는지"], ["이론적 배경", "관련 개념과 선행 자료"], ["실험 방법", "바꾼 것과 고정한 것"], ["결과", "숫자와 그래프로"], ["고찰·결론", "예상과 다른 점, 진로 연결"]] },
  { key: "analysis", label: "조사·분석 보고서", hint: "통계·자료로 현황을 파헤침", parts: [["서론", "왜 이 문제를 들여다봤는지"], ["현황 분석", "통계·자료로 실태"], ["원인 분석", "왜 그런지 근거로"], ["결론·제언", "종합과 대안"]] },
  { key: "inquiry", label: "탐구 보고서", hint: "자유 주제를 파고든 탐구", parts: [["탐구 동기", "관심을 갖게 된 계기"], ["탐구 내용", "무엇을 어떻게 알아봤는지"], ["탐구 결과", "알게 된 것과 나만의 해석"], ["느낀 점", "배운 점과 다음에 할 것"]] },
  { key: "thesis", label: "소논문", hint: "형식을 갖춘 심화 연구", parts: [["초록", "목적·방법·결과 한 문단"], ["서론", "연구 배경과 연구 문제"], ["선행 연구", "기존 연구와 차별점"], ["본론", "자료 분석과 결과"], ["결론", "종합과 한계, 진로 연결"]] },
  { key: "critique", label: "감상·비평문", hint: "책·작품을 읽고 쓴 글", parts: [["도입", "무엇을 읽었고 왜 골랐는지"], ["분석", "핵심 주장과 근거"], ["비평", "동의하는 점과 아쉬운 점"], ["결론", "종합 의견과 진로 연결"]] },
  { key: "reading", label: "독서 보고서", hint: "책을 읽고 탐구로 이어감", parts: [["책 선정 이유", "왜 이 책을 골랐는지"], ["핵심 내용", "무엇을 다룬 책인지"], ["인상 깊은 부분", "한 대목과 그 이유"], ["이어진 탐구", "책에서 생긴 질문을 더 알아본 것"], ["느낀 점", "진로와의 연결"]] },
  { key: "project", label: "프로젝트·제작 보고서", hint: "무언가를 만들거나 설계", parts: [["기획 배경", "왜 만들려 했는지"], ["설계", "어떻게 만들 계획이었는지"], ["제작 과정", "만들며 겪은 일"], ["결과와 반응", "무엇이 나왔고 어떻게 쓰였는지"], ["보완할 점", "다음에 고친다면"]] },
  { key: "case", label: "사례 연구 보고서", hint: "사례 하나를 깊이", parts: [["사례 선정", "왜 이 사례인지"], ["사례 개요", "무슨 일이 있었는지"], ["분석", "왜 그런 결과가 나왔는지"], ["시사점", "여기서 배울 점"]] },
  { key: "survey", label: "설문·인터뷰 보고서", hint: "직접 묻고 모은 자료", parts: [["조사 목적", "무엇을 알고 싶었는지"], ["조사 방법", "누구에게 어떻게 물었는지"], ["결과", "숫자와 답변 정리"], ["해석", "숫자 뒤에 있는 것"], ["결론", "알게 된 것과 제안"]] },
  { key: "review", label: "문헌 조사 보고서", hint: "자료를 모아 정리", parts: [["조사 주제", "무엇을 정리하려 했는지"], ["자료 선정", "어떤 자료를 어떻게 골랐는지"], ["정리", "공통점과 차이"], ["종합", "밝혀진 것과 아직 모르는 것"]] },
  { key: "proposal", label: "제안서", hint: "문제를 찾아 해결책 제안", parts: [["문제 제기", "무엇이 문제인지"], ["원인 분석", "왜 그런지"], ["제안", "구체적으로 무엇을 하자는 건지"], ["기대 효과와 한계", "나아지는 것과 어려운 것"]] },
  { key: "field", label: "현장체험·견학 보고서", hint: "직접 가 보고 쓴 글", parts: [["사전 준비", "가기 전에 알아본 것"], ["체험 내용", "보고 들은 것"], ["인상 깊은 점", "예상과 달랐던 부분"], ["배운 점", "진로와의 연결"]] },
];
const formatOf = (k: unknown) => FORMATS.find((f) => f.key === k);

// 과제 형식·제목으로 어울리는 글 구조를 고른다 (학생이 바꿀 수 있음)
function recommendFormat(t: any): string {
  const s = `${t?.task_type ?? ""} ${t?.analysis?.format ?? ""} ${t?.title ?? ""} ${t?.analysis?.summary ?? ""}`;
  const rules: [RegExp, string][] = [
    [/실험|측정|관찰/, "experiment"], [/설문|인터뷰|면담/, "survey"], [/견학|현장|체험/, "field"],
    [/제작|만들|설계|캠페인|포스터|UCC/, "project"], [/제안|정책|해결 ?방안/, "proposal"],
    [/토론|찬반|논술|주장|논설|설득/, "argument"], [/비평|감상|작품/, "critique"],
    [/독서|책|도서/, "reading"], [/소논문|연구/, "thesis"], [/사례/, "case"],
    [/통계|데이터|분석|현황/, "analysis"], [/문헌|자료 ?조사/, "review"], [/탐구/, "inquiry"],
  ];
  return rules.find(([re]) => re.test(s))?.[1] ?? "basic";
}

// 화면에 보여 줄 목록 · 추천 · 지금 고른 것
function formatList(t: any) {
  const reco = recommendFormat(t);
  return {
    formats: FORMATS.map((f) => ({ key: f.key, label: f.label, hint: f.hint, parts: f.parts.map(([p]) => p) })),
    recommended: reco,
    current: formatOf(t?.analysis?.structure)?.key ?? reco,
  };
}

const taskBrief = (t: any) => JSON.stringify({
  학년: t.grade, 학기: t.semester, 과목: t.subject, 형식: t.task_type, 과제: t.title,
  분석: t.analysis, 로드맵추천: t.roadmap_reco,
});

/*
 * 같은 학원에서 같은 수행평가(같은 학년·과목, 비슷한 제목)를 한 다른 학생들이 고른 방향
 * 학생 화면 권한으로는 남의 과제를 못 읽으니 서버 키로 읽되, 이름 없이 '고른 방향'만 쓴다
 */
async function peerDirections(task: any) {
  try {
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key || !task.academy_id) return [];
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, key);
    const head = String(task.title ?? "").replace(/\s/g, "").slice(0, 6);
    let q = admin.from("high_school_task")
      .select("title, qa, roadmap_reco")
      .eq("academy_id", task.academy_id)
      .neq("id", task.id)
      .limit(40);
    if (task.grade) q = q.eq("grade", task.grade);
    if (task.subject) q = q.eq("subject", task.subject);
    const { data } = await q;
    return (data ?? [])
      .filter((t: any) => !head || String(t.title ?? "").replace(/\s/g, "").includes(head))
      .map((t: any) => ({
        picks: arr(t.qa).map((x: any) => ansOf(x).slice(0, 80)).filter(Boolean).slice(0, 5),
        how: str(t.roadmap_reco?.deepen?.how, 120),
      }))
      .filter((x: any) => x.picks.length || x.how)
      .slice(0, 15);
  } catch {
    return [];
  }
}

// ---------- actions ----------
async function analyze(db: SupabaseClient, task: any) {
  const ctx = await studentContext(db, task);
  const files = await sourceParts(db, task);
  if (!files.length && !str(task.source_text)) throw new Error("안내문 사진·PDF나 글을 먼저 올려 주세요.");
  const fam = familyOf(task.subject);
  // 앞 학년 활동 후보 — 바로 전 학년 먼저, 그다음 더 앞 학년, 같은 학년이면 이전 학기 · 다른 과목
  const gnum = (g: unknown) => Number(String(g ?? "").match(/[123]/)?.[0] ?? 0);
  const tg = gnum(task.grade);
  const ts = Number(task.semester) || 0;
  // 로드맵 탐구는 status 가 전부 'active' 라 한 것/계획만 한 것을 구분 못 한다
  // → 탐구 진행 단계(pipeline)에 실제로 적은 내용이 있어야 '한 활동'으로 본다. 내용이 없으면 계획(planned)
  const doneTopics = ctx.topics.filter((t: any) => str(t.did));
  const plannedTopics = ctx.topics
    .filter((t: any) => !str(t.did) && gnum(t.grade) === tg)
    .map((t: any) => ({ topicId: t.topicId, subject: t.subject, title: t.title, detail: t.detail }))
    .slice(0, 10);
  const earlier = [
    ...doneTopics.map((t: any) => ({ kind: "탐구", topicId: t.topicId, grade: gnum(t.grade), semester: 0, subject: t.subject, title: t.title, did: t.did })),
    ...ctx.pastTasks.map((p: any) => ({ kind: "수행평가", topicId: null, grade: gnum(p.grade), semester: Number(p.semester) || 0, subject: p.subject, title: p.title, did: p.setuk })),
  ]
    .map((x) => {
      // 심화: 앞 학년 활동, 또는 같은 학년 같은 교과군의 이전 학기 활동
      // 확장: 같은 학년의 다른 과목 활동 — 같은 깊이에서 다른 방향(관점·방법)으로 넓힌다
      const sameFam = fam && familyOf(x.subject) === fam;
      const relation =
        x.grade < tg ? "심화"
        : x.grade === tg && sameFam && x.semester && ts && x.semester < ts ? "심화"
        : x.grade === tg && !sameFam ? "확장"
        : "";
      return { ...x, relation };
    })
    .filter((x) => x.grade && x.relation)
    .sort((a, b) => (tg - a.grade) - (tg - b.grade) || b.semester - a.semester)
    .slice(0, 30)
    .map((x) => ({ ...x, when: `고${x.grade}${x.semester ? ` ${x.semester}학기` : ""}` }));

  // 과제 과목과 같은 교과군의 로드맵 칸 (학년이 맞는 것 먼저)
  const sameFamilyNodes = ctx.nodes
    .filter((n: any) => fam && familyOf(n.subject) === fam)
    .sort((a: any, b: any) => (gradeLabel(a.grade) === gradeLabel(task.grade) ? -1 : 0) - (gradeLabel(b.grade) === gradeLabel(task.grade) ? -1 : 0));

  const system = `너는 고등학교 수행평가와 학생부(세특)를 잘 아는 입시 코치다.
1) 학교 수행평가 안내문을 읽고 그대로 정리한다. 안내문에 없는 내용은 지어내지 않는다(없으면 빈 값).
2) 이 학생의 입시로드맵(이미 한 탐구, 과목 로드맵)과 진로 컨셉을 보고, 이번 과제를 로드맵 한 줄 위에 이어 붙이는 방향을 추천한다.
   - deepen: 학생이 앞 학년에 한 활동을 이번 과제로 이어서 깊게 만드는 것. 생기부는 학년이 올라가며 이어지고 깊어져야 한다.
       · [앞 학년 활동 후보] 중 이번 과제와 가장 잘 이어지는 것 1개를 고른다. 후보마다 relation 이 있다:
           relation "심화" (앞 학년 활동) → 아래 깊이 규칙대로 한 단계 끌어올린다.
           relation "확장" (같은 학년의 다른 과목 활동) → 깊이는 같게 두고, 같은 관심을 이번 과목의 다른 방향(다른 개념·관점·방법·자료)으로 넓힌다.
             예: 고1 국어에서 '광고 문구의 설득 전략'을 했으면, 고1 사회에서는 '광고 규제와 소비자 권리'처럼 같은 관심을 사회 관점으로. 같은 내용을 반복하면 안 된다.
         심화 후보와 확장 후보가 둘 다 있으면 이번 과제와 더 자연스럽게 이어지는 쪽을 고른다.
       · 결과 deepen 에 relation("심화"|"확장")을 그대로 적는다.
       · how 는 그 활동을 이번 학년 진로 초점 깊이로 한 단계 끌어올리는 방법이다:
           고1 활동(계열 수준) → 고2 과제에서 학과 개념·이론으로 파고들기
           고2 활동(학과 수준) → 고3 과제에서 직업 현장의 실제 문제로 좁혀 판단하기
         "같은 주제를 다시 한다"가 아니라 질문·자료·방법 중 무엇이 깊어지는지(확장이면 무엇이 달라지는지) 분명히 쓴다.
       · 과목은 달라도 된다(심화는 과목을 넘어 이어 가는 것). 주제·관점·방법이 이번 과제와 가장 잘 이어지는 것을 고른다.
       · 다른 과목이면 how 에 "예전 ○○ 탐구의 △△를 이번 □□ 과제에서 이렇게 이어 가요"처럼 이어지는 이유를 드러낸다.
       · when: "고1 1학기"처럼 언제 했는지. did: 그때 실제로 한 것(무슨 자료·결과물) — 제목을 되풀이하지 않는다.
       · how: 이번 과제 형식(예: 독서 활동지·찬반 토론)에 맞춰 무엇을 더 하는지 구체적으로. 이어질 게 없으면 null.
   - thisTerm: 이번 수행평가가 채우는 로드맵 칸. 반드시 [이번 과제 과목과 같은 교과군의 노드 후보] 안에서 고른다. 후보가 없으면 null.
       · skills: 채울 역량 2~3개(짧게).
       · links: 안내문의 필수 항목·평가 기준이 이 로드맵 칸을 어떻게 채우는지 2~3개 {"from":"필수 항목 또는 평가 기준 이름","to":"채워지는 역량·로드맵 내용"}.
   - perSection: 안내문 필수 항목마다 1개씩(최대 6개).
       · section: 그 항목의 짧은 이름 12자 안쪽 (예: "맞춤법 원리 이해", "일상 사례 적용"). 평가 기준 문장을 통째로 옮기지 않는다.
       · tip: 학생이 바로 할 수 있는 구체적인 할 일. 토론 주제를 정하는 항목이면 "~해야 한다" 형태의 찬반 주제 예시를 쓴다.
       · 책을 고르는 항목이면 반드시 [학생 독서 기록]에서 먼저 고른다: 과제 주제·과목·진로 초점과 맞는 책 1~2권을 "『책 제목』(이미 읽은 책)"으로 쓰고, 그 책의 어떤 내용을 쓰면 되는지 한 줄.
         맞는 책이 없을 때만 새 책을 추천하되 실제로 있는 책만, 확실하지 않으면 분야와 찾는 법으로 쓴다. 새로 읽으면 입시로드맵 독서에도 기록하라고 덧붙인다.
       · 조사·분석·근거가 필요한 항목(토론 근거, 사례 비교, 데이터 분석 등)이면 tip 에 "어디서(실제 기관·포털 이름) · 무엇을 · 검색어"를 넣고 "출처 꼭 적기"를 덧붙인다. 출처·숫자·기사 제목을 지어내지 않는다.
       · strengthens: 이걸 하면 강화되는 것 — 역량 이름과 로드맵 내용 한 줄.
       · criterion: 이 항목이 걸린 평가 기준 이름(analysis.criteria 의 name), 없으면 빈 값.
       · needSource: 이 항목에 조사·분석·통계·사례 같은 바깥 자료(출처)가 필요하면 true. 책을 읽고 정리·감상·토론만 하는 항목이면 false.
   - saveForLater: 이번에 깊게 쓰지 말고 다음 학기/학년 다른 과목 탐구로 남길 것 1개. grade 는 "고2"처럼. 없으면 null.
   - 모든 추천의 기준은 [진로 초점](진로계열검사 결과에서 학년에 맞춰 고른 것)이다. 학년마다 깊이가 다르다:
       · 고1 = 계열: 그 계열(예: 상경계열) 전반에 통하는 넓은 관점·개념으로. 특정 학과·직업으로 좁히지 않는다.
       · 고2 = 학과: 그 학과(예: 경제학과)에서 배우는 개념·이론과 직접 이어지게.
       · 고3 = 직업군: 그 직업이 실제로 다루는 문제·현장 상황까지 뾰족하고 깊게(직업인이 쓰는 기준·사례를 끌어와 판단하게).
     deepen.how · thisTerm.links · perSection 의 tip·strengthens 가 이 초점에 맞는 근거가 되도록 쓰고, 상관없는 관점을 끌어오지 않는다.
     진로 초점이 없으면(null) 과목 자체의 역량으로만 쓴다.
   - topicId, nodeId 는 주어진 목록의 id 만 쓴다. 없으면 null.
   - 학생에게 보이는 글(how, tip, strengthens, links)은 쉬운 말 "~해요"체로 쓴다.
   - 겹치지 않게: [같은 학원 다른 학생들이 고른 방향]과 같은 주제·책·토론 주제를 추천하지 않는다. [이 학생만의 재료](성향·학교 활동·독서)에서 이 학생만의 출발점을 찾는다.
3) analysis.criteria 는 안내문에 적힌 평가 항목 이름과 배점을 그대로 옮긴다. name 은 반드시 채운다(예: "도서 선정의 적절성").
json 형식:
{"title":"","subject":"","taskType":"보고서|발표|토론|논술|실험|프로젝트|기타",
 "analysis":{"overview":"","format":"","prompt":"","required":[""],"penalties":[""],"units":[""],"criteria":[{"name":"","points":0}],"limits":""},
 "roadmapReco":{"deepen":{"topicId":null,"relation":"심화","title":"","when":"","did":"","how":""}|null,
   "thisTerm":{"nodeId":null,"subject":"","title":"","skills":[""],"links":[{"from":"","to":""}]}|null,
   "perSection":[{"section":"","tip":"","strengthens":"","criterion":"","needSource":false}],
   "saveForLater":{"subject":"","grade":"","tip":""}|null},
 "summary":"이 과제를 한 문장으로"}`;

  const user: any[] = [
    { type: "text", text: `학생 정보: ${JSON.stringify({ 학년: task.grade, 학기: task.semester, 학교: task.school, 진로: ctx.concept })}` },
    { type: "text", text: `진로 초점: ${JSON.stringify(ctx.focus)}` },
    { type: "text", text: `입시로드맵 탐구(topics): ${JSON.stringify(ctx.topics)}` },
    { type: "text", text: `로드맵 과목(nodes): ${JSON.stringify(ctx.nodes)}` },
    { type: "text", text: `이번 과제 과목과 같은 교과군의 노드 후보: ${JSON.stringify(sameFamilyNodes)}` },
    { type: "text", text: `완료한 학교 과제(pastTasks): ${JSON.stringify(ctx.pastTasks)}` },
    { type: "text", text: `학생 독서 기록(readings — 학생이 실제로 읽은 책): ${JSON.stringify(ctx.readings)}` },
    { type: "text", text: `이번 학년에 계획만 해 둔 탐구(아직 안 함 — deepen 에 쓰지 말 것. 이번 과제로 실행할 수 있으면 perSection 의 tip 에 "로드맵에 계획한 ○○를 이 항목에서 해 볼 수 있어요"로만 언급): ${JSON.stringify(plannedTopics)}` },
    { type: "text", text: `앞 학년 활동 후보(deepen 은 여기서 고른다 · relation 심화=앞 학년, 확장=같은 학년 다른 과목 · 비어 있으면 deepen 은 null): ${JSON.stringify(earlier)}` },
    { type: "text", text: `이 학생만의 재료(성향 진단 · 학교 활동): ${JSON.stringify({ 성향: ctx.aptitude, 학교활동: ctx.activities })}` },
    { type: "text", text: `같은 학원에서 같은 과제를 한 다른 학생들이 고른 방향(겹치지 않게 피할 것): ${JSON.stringify(await peerDirections(task))}` },
    { type: "text", text: `안내문 글: ${str(task.source_text, 8000) || "(없음 — 첨부 파일을 읽을 것)"}` },
    ...files,
  ];
  const r = await ai(system, user, 0.3);

  const topicIds = new Set(ctx.topics.map((t: any) => t.topicId));
  const nodeIds = new Set(ctx.nodes.map((n: any) => n.nodeId));
  const reco = r.roadmapReco ?? {};
  if (reco.deepen && !topicIds.has(reco.deepen.topicId)) reco.deepen.topicId = null;
  if (reco.thisTerm && !nodeIds.has(reco.thisTerm.nodeId)) reco.thisTerm.nodeId = null;
  // 과제와 다른 교과군 칸을 골랐으면 같은 교과군 후보로 바꾼다 (사회 과제인데 국어 칸이 나오지 않게)
  if (reco.thisTerm && fam && familyOf(reco.thisTerm.subject) !== fam) {
    const alt: any = sameFamilyNodes[0];
    reco.thisTerm = alt ? { ...reco.thisTerm, nodeId: alt.nodeId, subject: alt.subject } : null;
  }
  if (reco.saveForLater) reco.saveForLater.grade = gradeLabel(reco.saveForLater.grade);
  if (reco.deepen) {
    reco.deepen.relation = reco.deepen.relation === "확장" ? "확장" : "심화";
    // 지금 화면은 how 만 보여 주므로 앞에 [심화]/[확장 · 다른 방향]을 붙여 둔다
    const tag = reco.deepen.relation === "확장" ? "[확장 · 같은 학년 다른 과목에서 다른 방향으로]" : "[심화 · 앞 학년에서 한 단계 깊게]";
    if (!String(reco.deepen.how ?? "").startsWith("[")) reco.deepen.how = `${tag} ${str(reco.deepen.how, 500)}`;
  }
  reco.perSection = arr(reco.perSection).map((p: any) => {
    const tip = str(p?.tip, 400);
    const st = str(p?.strengthens, 160);
    const cr = str(p?.criterion, 60);
    // 화면이 tip 만 보여 줘도 '무엇이 강화되는지'가 보이게 붙여 둔다
    const extra = [st && `강화돼요: ${st}`, cr && `평가 기준: ${cr}`].filter(Boolean).join(" · ");
    return { section: str(p?.section, 30), tip: extra ? `${tip}\n→ ${extra}` : tip, strengthens: st, criterion: cr, needSource: p?.needSource === true };
  });

  // 평가 기준 — 이름이 비면 화면에 빈칸이 생기므로 다른 칸 이름도 받아 주고, 그래도 없으면 버린다
  const analysis = r.analysis ?? {};
  analysis.criteria = arr(analysis.criteria)
    .map((c: any) => ({
      name: str(c?.name || c?.item || c?.criterion || c?.title || c?.label, 80),
      points: Number(c?.points ?? c?.score ?? c?.max) || 0,
    }))
    .filter((c: any) => c.name);

  const patch = {
    title: str(r.title, 200) || task.title,
    subject: str(r.subject, 60) || task.subject,
    task_type: str(r.taskType, 20) || task.task_type,
    analysis: { ...analysis, summary: str(r.summary, 300) },
    roadmap_reco: reco,
    parent_topic_id: reco.deepen?.topicId ?? null,
    node_id: reco.thisTerm?.nodeId ?? null,
    status: "analyzed",
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db.from("high_school_task").update(patch).eq("id", task.id).select().single();
  if (error) throw error;
  return { task: data };
}

async function nextQuestion(db: SupabaseClient, task: any) {
  const qa = arr(task.qa);
  const answered = qa.filter((x: any) => ansOf(x));
  if (answered.length >= 5) return { done: true, task };
  const ctx = await studentContext(db, task);
  const system = `너는 학생이 수행평가를 스스로 설계하도록 돕는 코치다. 답을 대신 정하지 않고, 학생이 고르게 한다.
지금까지의 답을 보고 다음 질문 1개를 만든다. 질문은 4~5개로 끝낸다(이미 ${answered.length}개 답함).
순서 가이드: 주제 범위 → 관점·개념 연결 → 자료(직접 비교할 것) → 해결·주장 → 진로 연결.
학생마다 다른 글이 나오게 한다(같은 학원에서 같은 과제를 하는 학생이 많다):
- 고1처럼 앞선 활동이 적으면 첫 질문은 "이 학생만의 출발점"을 묻는다: 일상에서 겪은 일, 요즘 관심 있는 것, 성향 진단·학교 활동에서 이어지는 것. 보기 3개도 [이 학생만의 재료]에서 만든다.
- 고2·고3처럼 앞선 활동이 있으면 그 활동을 이어 가는 보기를 먼저 둔다.
- [다른 학생들이 고른 방향]과 같은 보기는 만들지 않는다.
- 보기마다 학생이 직접 쓸 수 있게 화면에 '직접 입력'이 있으니, 보기는 서로 확실히 다른 방향으로.
- 보기마다 from 에 어디서 나온 보기인지 짧게 쓴다: "학교 활동 · 경제 동아리", "성향 진단 · 실천·개선형", "독서 기록 · 『넛지』", "고1 탐구 · ○○" 처럼. 재료에서 나온 게 아니면 "새 방향".
- 첫 질문(지금까지 답이 0개)만: "나만의 출발점"을 묻고 보기를 4개 만든다. 학생이 1~2개를 골라 섞을 수 있다(multi=true). 섞어도 말이 되게 서로 다른 재료에서 만든다.
- note: [다른 학생들이 고른 방향]을 피했으면 "같은 학원 친구들이 고른 '○○', '△△' 방향은 빼고 골랐어요"처럼 한 줄(이름 없이). 피할 게 없었으면 빈 문자열.
로드맵추천(deepen, perSection)을 질문에 녹인다. 질문마다 어떤 로드맵 역량을 채우는지 badge 로 짧게 적는다.
보기 3개는 서로 확실히 다르게, 각 보기에 한 줄 설명. 쉬운 말로.
충분히 모였으면 {"done":true}.
json: {"done":false,"q":"","badge":"","multi":false,"note":"","options":[{"label":"","desc":"","from":""}]}`;
  const user = `과제: ${taskBrief(task)}\n진로: ${JSON.stringify(ctx.concept)}\n진로 초점(고1 계열 · 고2 학과 · 고3 직업군 — 질문도 이 깊이로): ${JSON.stringify(ctx.focus)}\n이 학생만의 재료: ${JSON.stringify({ 성향: ctx.aptitude, 학교활동: ctx.activities, 독서: ctx.readings.map((b: any) => b.title).slice(0, 15), 한활동: ctx.topics.filter((t: any) => t.did).map((t: any) => t.title).slice(0, 10) })}\n다른 학생들이 고른 방향(피할 것): ${JSON.stringify(await peerDirections(task))}\n지금까지: ${JSON.stringify(answered.map((x: any) => ({ q: x.q, a: ansOf(x) })))}`;
  const r = await ai(system, user, 0.6);
  if (r.done) return { done: true, task };
  // 첫 질문만 여러 개 고르기(1~2개) · 보기 4개, 나머지는 하나 고르기 · 보기 3개
  const first = answered.length === 0;
  const item = {
    q: str(r.q, 300), badge: str(r.badge, 60),
    multi: first,
    maxPick: first ? 2 : 1,
    note: str(r.note, 160),
    options: arr(r.options).slice(0, first ? 4 : 3)
      .map((o: any) => ({ label: str(o?.label, 80), desc: str(o?.desc, 160), from: str(o?.from, 40) }))
      .filter((o: any) => o.label),
    answer: null, custom: null,
  };
  const newQa = [...answered, item];
  const { data, error } = await db.from("high_school_task").update({ qa: newQa, status: "qa", updated_at: new Date().toISOString() }).eq("id", task.id).select().single();
  if (error) throw error;
  return { done: false, task: data };
}

async function guide(db: SupabaseClient, task: any) {
  const ctx = await studentContext(db, task);
  const system = `수행평가 학습가이드를 마크다운으로 쓴다. 학생이 직접 쓰기 전에 읽는 안내서다.
${SOURCE_RULE}
"## 조사·분석에 쓸 출처" 칸은 조사·분석이 필요한 항목(로드맵추천 perSection 의 needSource=true)이 있을 때만 넣는다. 책을 읽고 정리·토론만 하는 과제면 이 칸을 빼고 "이 과제에 쓸 책"만 둔다.
넣을 때: [학생이 고른 자료]가 있으면 그 자료를 항목별로 배치하고(제목 · 발행처 · 주소 그대로), 없으면 ① 무엇을 찾을지 ② 어디서(위 기관·포털) ③ 검색어 2~3개를 쓰고 "학습가이드의 [자료 찾기]로 실제 자료를 찾을 수 있어요"라고 안내한다.
책이 필요한 과제면 [학생 독서 기록]의 책을 먼저 쓴다 — "## 이 과제에 쓸 책"에 이미 읽은 책 중 맞는 것 1~2권과 그 책에서 쓸 부분을 적고, 맞는 책이 없을 때만 새 책(실제로 있는 책만)을 추천한다.
구성: # 제목 / 한 문단 총평(학생 답과 진로·로드맵 연결) / ## 감점 방지 체크리스트(필수 항목, 감점 주의, 평가 포인트) /
## 문단별 쓰는 법(필수 항목 순서대로: 무엇을, 어떤 자료로, 로드맵 연결 포인트) / ## 조사·분석에 쓸 출처(필요할 때만) / ## 이번에 남겨 둘 것.
지어낸 통계·기사·논문 제목을 쓰지 않는다. 자료는 "어디서 무엇을 찾아라"로만 안내.
json: {"guide":"마크다운"}`;
  const r = await ai(system, `과제: ${taskBrief(task)}\n질의응답: ${JSON.stringify(arr(task.qa).map((x: any) => ({ q: x.q, a: ansOf(x) })))}\n진로 초점: ${JSON.stringify(ctx.focus)}\n학생 독서 기록: ${JSON.stringify(ctx.readings)}\n학생이 고른 자료: ${JSON.stringify(pickedSources(task))}`, 0.5);
  const { data, error } = await db.from("high_school_task").update({ guide: str(r.guide, 12000), status: "guide", updated_at: new Date().toISOString() }).eq("id", task.id).select().single();
  if (error) throw error;
  return { task: data };
}

async function draft(db: SupabaseClient, task: any, formatKey?: string) {
  /*
   * 1차 초안 = 학생이 제출할 글의 완성본. 학생은 이걸 조금 고치기만 한다.
   * 빈칸([[직접 입력]])은 만들지 않는다. 출처가 필요한 항목은 서버가 자료를 직접 찾아(웹 검색) 넣는다.
   */
  const ctx = await studentContext(db, task);

  // 글 구조 — 학생이 고른 것 > 전에 고른 것 > 추천. 고른 것은 analysis.structure 에 남겨 (analysis.format 은 안내문의 과제 형식이라 따로 둔다) 다시 만들 때도 쓴다
  const fmt = formatOf(formatKey) ?? formatOf(task.analysis?.structure) ?? formatOf(recommendFormat(task))!;
  if (task.analysis?.structure !== fmt.key) {
    const { data } = await db.from("high_school_task").update({ analysis: { ...(task.analysis ?? {}), structure: fmt.key }, updated_at: new Date().toISOString() }).eq("id", task.id).select().single();
    if (data) task = data;
  }
  const outline = fmt.parts.map(([p, g], i) => `${i + 1}. ## ${p} — ${g}`).join("\n");

  // 출처가 필요한 항목 — 분석 때 needSource 표시가 없던 예전 과제는 tip 글로 짐작
  const secs = arr(task.roadmap_reco?.perSection);
  const flagged = secs.some((p: any) => typeof p?.needSource === "boolean");
  let needSecs: any[] = secs
    .filter((p: any) => (flagged ? p.needSource === true : /자료|조사|사례|기사|통계|데이터|근거/.test(String(p?.tip ?? ""))))
    .slice(0, 2); // 시간·비용 때문에 최대 2개 항목
  // 출처 필요 항목이 없어도 글이 풍성하도록 과제 전체 주제로 한 번은 찾는다 (참고 자료 3개 정도)
  if (!needSecs.length) needSecs = [{ section: "" }];

  // 학생이 고른 자료가 없으면 서버가 찾아서 항목마다 점수 높은 2개를 골라 둔다
  if (!pickedSources(task).length && needSecs.length) {
    const found = await Promise.all(needSecs.map((p: any) => searchSection(task, ctx, p.section).catch(() => [])));
    // 참고 자료는 모두 3개 정도 — 항목이 하나면 3개, 둘이면 2개씩(최대 4개)
    const per = needSecs.length === 1 ? 3 : 2;
    const auto = found.flatMap((list: any[]) => list.slice(0, per).map((x) => ({ ...x, selected: true, auto: true })));
    if (auto.length) {
      const sources = [...arr(task.sources).filter((x: any) => !auto.some((y) => y.url === x.url)), ...auto];
      const { data } = await db.from("high_school_task").update({ sources, updated_at: new Date().toISOString() }).eq("id", task.id).select().single();
      if (data) task = data;
    }
  }
  const picked = pickedSources(task);

  const system = `학생의 질의응답 답과 학습가이드로 수행평가 "1차 초안 본문"을 마크다운으로 쓴다. 고1~고3 학생 문체(~했다, ~이다).
이건 학생이 그대로 내도 될 만큼 완성된 글이다. 학생은 마지막에 조금만 고친다:
- 맨 위 제목(#)은 과제 제목 그대로. "학습가이드", "감점 방지 체크리스트", "문단별 쓰는 법", "무엇을/어떤 자료로" 같은 안내 문구와 목록을 쓰지 않는다.
- 글 구조는 [글 구조]를 그대로 따른다: 문단 제목(##)은 그 이름과 순서 그대로 쓰고, 다른 제목을 만들지 않는다 ("## 참고 자료"만 예외).
- 안내문 필수 항목·평가 기준 문장을 문단 제목으로 쓰지 않는다. 대신 필수 항목마다 어느 문단에서 채울지 정해, 그 문단 안에서 빠짐없이 다룬다.
- 같은 말(예: "맞춤법은 중요하다")을 문단마다 되풀이하지 않는다. 문단마다 새 내용(개념 → 예시 → 분석 → 나의 생각 순으로 깊어지게).
- 문단마다 이어지는 글로 4~6문장. 불릿 목록으로 쪼개지 않는다(안내문이 표·목록 형식을 요구할 때만 예외).
- 학습가이드는 내용의 방향만 참고하고 문장을 옮기지 않는다. 로드맵추천의 deepen.how 와 perSection 을 해당 문단에 반영.
- 나의 생각·느낀 점: 질의응답에서 학생이 고른 답을 바탕으로, 생각이 들어가야 자연스러운 문단(느낀 점, 생각이 바뀐 점, 마무리) 2~3곳에 학생 목소리로 직접 쓴다.
책:
- 책이 필요한 과제면 [학생 독서 기록]에서 과제 주제에 맞는 책을 골라 처음 나오는 문단에서 한 번만 『제목』(저자)로 밝힌다. 책 쪽수는 쓰지 않는다. 책 내용은 독서 기록의 요약·감상에 있는 것만 쓴다.
출처:
- [참고할 자료]는 3개 정도 있다. 각 자료를 맞는 문단에 나눠 실제 근거(사례·수치·기준)로 활용해 내용을 풍성하게 하고, 쓴 문장 끝에 "(출처: 발행처, 「제목」)"을 붙인다. 자료 내용은 그 자료의 요약(summary)에 있는 것만 쓴다.
- [참고할 자료]에 없는 숫자·통계·기사·법령 조항·인용을 새로 만들지 않는다. 필요하면 일반적인 설명으로 쓴다.
- 글 맨 끝 "## 참고 자료"에 쓴 책(『제목』, 저자)과 [참고할 자료](발행처, 「제목」, 주소)를 적는다.
금지:
- 빈칸·자리표시를 절대 쓰지 않는다: [[...]], (직접 입력), ○○, OO, ___ 같은 것.
- 토론·발표처럼 실제로 일어난 일은 "~했다"로 꾸며 내지 말고, 쟁점과 내 입장, 준비한 근거 중심으로 쓴다.
json: {"content":"마크다운"}`;
  const r = await ai(system, `과제: ${taskBrief(task)}\n질의응답: ${JSON.stringify(arr(task.qa).map((x: any) => ({ q: x.q, a: ansOf(x) })))}\n학습가이드: ${str(task.guide, 6000)}\n진로 초점: ${JSON.stringify(ctx.focus)}\n학생 독서 기록: ${JSON.stringify(ctx.readings)}\n참고할 자료: ${JSON.stringify(picked)}\n[글 구조] ${fmt.label}\n${outline}`, 0.6);
  // 혹시 남은 빈칸 표시는 지운다 (학생은 완성본을 조금 고치기만 한다)
  const content = str(r.content, 20000).replace(BLANK_RE, "").replace(/\(\s*\)/g, "").replace(/[ \t]{2,}/g, " ");
  const round = (task.current_round ?? 0) + 1;
  const { data: d, error } = await db.from("high_school_task_draft")
    .insert({ task_id: task.id, round, content, blanks_left: (content.match(BLANK_RE) ?? []).length })
    .select().single();
  if (error) throw error;
  await db.from("high_school_task").update({ current_round: round, status: "writing", updated_at: new Date().toISOString() }).eq("id", task.id);
  return { draft: d };
}

async function score(db: SupabaseClient, task: any, draftRow: any, content?: string) {
  const text = typeof content === "string" ? content : draftRow.content ?? "";
  const criteria = arr(task.analysis?.criteria);
  const system = `수행평가 채점관. 안내문 평가 기준으로만 채점한다. 기준이 없으면 4개(자료의 적절성, 분석·해석, 문제 해결, 논리적 표현) 각 25점.
[[직접 입력: ...]] 칸이 남아 있으면 그 칸이 속한 기준에서 감점하고 tip 에 "칸 채우기"를 적는다.
조사·분석·통계·사례를 썼는데 출처(기관·자료 이름·날짜·주소, 책은 『제목』·저자)가 없으면 자료·근거 관련 기준에서 감점하고 tip 에 "출처 적기"를 적는다.
tip 은 "만점까지 몇 점 — 이렇게"로, 고칠 문장을 quote 에 원문 그대로 짧게.
json: {"total":0,"items":[{"name":"","got":0,"max":0,"tip":"","quote":""}],"roadmap":[{"skill":"","filled":true,"where":""}]}`;
  const r = await ai(system, `평가 기준: ${JSON.stringify(criteria)}\n감점: ${JSON.stringify(task.analysis?.penalties ?? [])}\n로드맵 추천: ${JSON.stringify(task.roadmap_reco ?? {})}\n본문:\n${str(text, 20000)}`, 0.2);
  const items = arr(r.items).map((i: any) => ({ name: str(i.name, 60), got: Number(i.got) || 0, max: Number(i.max) || 0, tip: str(i.tip, 300), quote: str(i.quote, 200) }));
  const total = items.reduce((s: number, i: any) => s + i.got, 0);
  const sc = { total, max: items.reduce((s: number, i: any) => s + i.max, 0) || 100, items, roadmap: arr(r.roadmap), at: new Date().toISOString() };
  const { data, error } = await db.from("high_school_task_draft")
    .update({ content: text, score: sc, blanks_left: (text.match(BLANK_RE) ?? []).length, updated_at: new Date().toISOString() })
    .eq("id", draftRow.id).select().single();
  if (error) throw error;
  return { draft: data };
}

async function review(db: SupabaseClient, task: any, draftRow: any) {
  const text = String(draftRow.content ?? "");
  // 책 쪽수 빈칸은 필요 없는 칸이라 첨삭 대상에서 뺀다
  const blanks = Array.from(text.matchAll(BLANK_RE)).map(m => m[0]).filter(b => !/쪽/.test(b));
  const system = `수행평가 첨삭 보조. 선생님이 골라서 학생에게 보낼 코멘트 5~8개를 만든다. 칭찬이 아니라 "고칠 곳"을 찾는 것이 목적이다.
우선순위(위에서부터 먼저 채운다):
① 본문에 남아 있는 [[직접 입력: …]] 칸 — 칸마다 하나씩, importance "필수". quote 는 그 칸을 포함한 문장의 앞부분, body 는 "아직 채우지 않은 칸이 있어요" + 무엇을 채워야 하는지.
② 출처 없이 쓴 수치·통계·인용·사례 — importance "필수", body 끝에 "(팩트체크 필요)".
③ 안내문 평가 기준 대비 부족한 곳 — 감점으로 이어지면 "필수", 점수를 올릴 여지면 "권장". body 에 해당 평가 기준 이름을 넣는다.
④ 논리·구조(주장과 근거 연결, 반론 고려, 문단 연결) — "권장".
⑤ 세특·입시로드맵 연결을 살릴 곳 — "제안".
규칙:
- 칭찬만 하는 코멘트 금지. 잘한 점은 최대 1개만, importance "제안", body 를 "잘한 점: "으로 시작.
- "필수"는 고치지 않으면 감점되는 것만.
- body: 무엇이 문제인지 + 왜(평가 기준) 1~2문장. suggestion: 학생이 바로 할 행동 한 줄 — 모범 문장을 대신 써 주지 않는다.
- quote 는 본문에서 그대로 복사한 15~60자 구절(글자 하나도 바꾸지 말 것). 글 전체 의견이면 quote 는 "".
- 사실 확인이 필요한 수치·출처는 지어내지 않는다.
- 책 쪽수는 요구하지 않는다. 책 출처는 『제목』(저자)면 충분하다. [[직접 입력: 쪽수]] 칸은 무시한다.
json: {"comments":[{"quote":"","importance":"필수","body":"","suggestion":""}]}`;
  const r = await ai(system, `과제: ${taskBrief(task)}
평가 기준: ${JSON.stringify(arr(task.analysis?.criteria))}
감점 요소: ${JSON.stringify(task.analysis?.penalties ?? [])}
제출 전 AI 채점: ${JSON.stringify(draftRow.score?.items ?? [])}
남은 [[직접 입력]] 칸 ${blanks.length}개: ${JSON.stringify(blanks.slice(0, 10))}
본문:
${str(text, 20000)}`, 0.3);
  const rows = arr(r.comments).slice(0, 10).map((c: any) => ({
    task_id: task.id, draft_id: draftRow.id, author: "ai",
    quote: str(c.quote, 300), importance: ["필수", "권장", "제안"].includes(c.importance) ? c.importance : "권장",
    body: str(c.body, 800), suggestion: str(c.suggestion, 800) || null, visible_to_student: false,
  })).filter((c: any) => c.body)
    // 본문에 없는 인용은 지워서 엉뚱한 곳에 표시되지 않게
    .map((c: any) => (c.quote && !text.replace(/\*\*/g, "").includes(c.quote.replace(/\*\*/g, "")) ? { ...c, quote: "" } : c));
  if (!rows.length) return { comments: [] };
  const { data, error } = await db.from("high_school_task_comment").insert(rows).select();
  if (error) throw error;
  return { comments: data };
}

async function finalize(db: SupabaseClient, task: any, draftRow: any) {
  const system = `완성된 수행평가로 학교 선생님이 쓸 법한 세특(교과 세부능력 및 특기사항) 예상 문장과 면접 예상질문을 만든다.
세특: 관찰자 시점, ~함/~임 체, 300~500자, 활동→역량→성장 순, 과장 금지, 본문에 없는 활동 금지.
면접 예상질문 3개: 이 과제 내용을 깊게 묻는 질문.
json: {"setuk":"","interview":[{"q":""}]}`;
  const r = await ai(system, `과제: ${taskBrief(task)}\n최종 본문:\n${str(draftRow?.content, 20000)}`, 0.4);
  const { data, error } = await db.from("high_school_task").update({
    setuk_text: str(r.setuk, 1200),
    interview_qs: arr(r.interview).slice(0, 5).map((x: any) => ({ q: str(x?.q, 300) })).filter((x: any) => x.q),
    updated_at: new Date().toISOString(),
  }).eq("id", task.id).select().single();
  if (error) throw error;
  return { task: data };
}

// ---------- 자료 찾기 (생수면 탐구보고서 '자료 찾기'와 같은 방식) ----------
//  ① 웹 검색(OpenAI Responses web_search)으로 후보 8~10개 — AI가 실제로 열어 본 링크만 남김
//  ② 링크가 열리는지 서버가 확인하고 본문 앞부분을 읽음
//  ③ 주제 관련 · 믿을 만한 출처 · 구체적 근거 · 고등학생 수준으로 점수 → 좋은 것 5개
//  결과는 task.sources 에 항목(section)별로 쌓인다. 학생이 화면에서 골라(selected) 초안 출처로 쓴다
const SEARCH_MODEL = "gpt-4.1";
const pickedSources = (t: any) =>
  arr(t.sources).filter((x: any) => x?.selected).map((x: any) => ({ section: x.section, title: x.title, publisher: x.publisher, url: x.url, summary: x.summary }));

async function pageText(url: string) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 7000);
    const r = await fetch(url, { redirect: "follow", signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0" } });
    clearTimeout(t);
    if (!r.ok || !String(r.headers.get("content-type") ?? "").includes("html")) return { ok: false, text: "" };
    const html = await r.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);
    return { ok: text.length > 200, text };
  } catch {
    return { ok: false, text: "" };
  }
}

async function searchSection(task: any, ctx: any, section?: string) {
  const sec = arr(task.roadmap_reco?.perSection).find((p: any) => p.section === section);
  const target = section ? `${section}${sec?.tip ? ` — ${str(sec.tip, 300)}` : ""}` : str(task.analysis?.overview, 300);

  const prompt = `고등학생 수행평가에 쓸 실제 자료를 웹에서 찾아라.
수행평가: ${task.title} (${task.subject ?? ""} · ${task.task_type ?? ""})
과제 내용: ${str(task.analysis?.prompt || task.analysis?.overview, 600)}
이번에 자료가 필요한 항목: ${target}
학생 진로 초점: ${JSON.stringify(ctx.focus)}
방법:
1) 항목을 쪼개 검색어 4~6개를 만든다 (핵심 개념, 사례 대상, 통계 이름, '보도자료·통계·보고서' 같은 말을 섞는다)
2) 검색어마다 따로 검색해 후보를 모은다
조건:
- 반드시 웹 검색으로 실제로 열어 확인한 자료만. 기억으로 제목을 만들지 않는다
- 한국어 자료 우선: 정부·공공기관, 통계(KOSIS·한국은행 등), 신문사, 국내 논문 사이트, 교육 자료. 필요하면 영어 1~2개
- 주제와 직접 관련 있고 구체적 근거(수치·기준·사례)가 있는 자료 우선
- 후보 8~10개, 요약은 그 자료에 실제로 쓰인 내용만 쉬운 말 두 문장
마지막에 아래 JSON만 출력:
{"sources":[{"title":"자료 제목","url":"https://...","publisher":"발행처","kind":"논문|기사|공식자료|통계|보고서|기타","summary":"두 문장 요약"}]}`;

  const call = (tool: string) =>
    fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: SEARCH_MODEL, tools: [{ type: tool }], include: ["web_search_call.action.sources"], input: prompt, max_output_tokens: 6000 }),
    });
  let res = await call("web_search");
  if (res.status === 400) res = await call("web_search_preview"); // 계정에 따라 도구 이름이 다름
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) throw new Error("자료를 찾지 못했어요. 잠시 후 다시 해 주세요.");

  // 답변 + 실제로 본 링크
  const norm = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
  let text = "";
  const seen = new Set<string>();
  for (const item of body.output ?? []) {
    if (item.type === "web_search_call") for (const s2 of item.action?.sources ?? []) if (s2?.url) seen.add(norm(s2.url));
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) {
      if (c.type !== "output_text") continue;
      text += c.text ?? "";
      for (const a of c.annotations ?? []) if (a.type === "url_citation" && a.url) seen.add(norm(a.url));
    }
  }
  let parsed: any = null;
  try {
    const m = text.match(/\{[\s\S]*"sources"[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : null;
  } catch { parsed = null; }
  const uniq = new Map<string, any>();
  for (const x of parsed?.sources ?? []) if (x?.url && x?.title && /^https?:\/\//.test(x.url) && !uniq.has(norm(x.url))) uniq.set(norm(x.url), x);
  const list = [...uniq.values()].slice(0, 10);

  // 실제로 본 링크이거나, 서버가 열어 봐서 열리는 링크만
  const checked = await Promise.all(list.map(async (x: any) => {
    const u = norm(x.url);
    if ([...seen].some((c) => c === u || c.startsWith(u) || u.startsWith(c))) return x;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 5000);
      const r = await fetch(x.url, { redirect: "follow", signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0" } });
      clearTimeout(t);
      return r.status < 400 ? x : null;
    } catch { return null; }
  }));
  const verified = checked.filter(Boolean) as any[];
  if (!verified.length) return [];

  // 본문 읽고 점수 매기기
  const pages = await Promise.all(verified.map((x) => pageText(x.url)));
  const judged = await ai(
    `고등학생 수행평가에 쓸 자료 후보를 평가한다. [본문]이 있으면 본문 기준으로만 판단하고 요약도 본문 내용으로 고친다. 모르면 낮게 준다. 쉬운 말.
점수(각 0~3): same 항목과 직접 관련 / trust 공공기관·학술지·언론처럼 믿을 만한 출처 / detail 구체적 근거(수치·기준·사례) / level 고등학생이 읽을 수 있는 수준
json: {"items":[{"i":1,"same":0,"trust":0,"detail":0,"level":0,"summary":"본문 기준 두 문장","use":"이 항목에서 어떻게 쓸지 한 줄"}]}`,
    `항목: ${target}\n\n${verified.map((x, i) => `[후보 ${i + 1}] ${x.title} (${x.publisher ?? ""})\n[요약] ${x.summary ?? ""}\n[본문] ${pages[i]?.ok ? pages[i].text.slice(0, 2500) : "(읽지 못함)"}`).join("\n\n")}`,
    0.2,
  );
  const n = (v: any) => Math.max(0, Math.min(3, Number(v) || 0));
  const scored = verified.map((x, i) => {
    const j = arr(judged?.items).find((y: any) => Number(y.i) === i + 1) ?? {};
    return {
      id: crypto.randomUUID(),
      section: section ?? "",
      title: str(x.title, 200),
      url: str(x.url, 500),
      publisher: str(x.publisher, 80),
      kind: str(x.kind, 20),
      summary: str(pages[i]?.ok && j.summary ? j.summary : x.summary, 400),
      use: str(j.use, 200),
      score: n(j.same) + n(j.trust) + n(j.detail) + n(j.level),
      checked: pages[i]?.ok ? "body" : "link", // body = 서버가 본문을 읽고 요약을 맞춤
      selected: false,
    };
  }).sort((a, b) => b.score - a.score);
  let good = scored.filter((x) => x.score >= 6);
  if (good.length < 3) good = scored.slice(0, 3);
  return good.slice(0, 5);
}

async function findSources(db: SupabaseClient, task: any, section?: string) {
  const ctx = await studentContext(db, task);
  const good = await searchSection(task, ctx, section);
  // 같은 항목의 예전 후보 중 고르지 않은 건 바꾸고, 고른 건 남긴다
  const keep = arr(task.sources).filter((x: any) => x.section !== (section ?? "") || x.selected);
  const sources = [...keep, ...good.filter((g) => !keep.some((k: any) => k.url === g.url))];
  const { data, error } = await db.from("high_school_task").update({ sources, updated_at: new Date().toISOString() }).eq("id", task.id).select().single();
  if (error) throw error;
  return { task: data, found: good.length };
}

// ---------- server ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  try {
    if (!OPENAI_KEY) return jsonError("OPENAI_API_KEY가 설정되지 않았어요.", 500);
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return jsonError("로그인이 필요해요.", 401);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });

    const { action, taskId, draftId, content, section, format } = await req.json();
    if (!taskId) return jsonError("taskId가 없어요.", 400);
    const { data: task, error } = await db.from("high_school_task").select("*").eq("id", taskId).single();
    if (error || !task) return jsonError("과제를 찾을 수 없거나 권한이 없어요.", 404);

    const getDraft = async () => {
      let q = db.from("high_school_task_draft").select("*").eq("task_id", taskId);
      q = draftId ? q.eq("id", draftId) : q.order("round", { ascending: false }).limit(1);
      const { data } = await q;
      if (!data?.[0]) throw new Error("초안이 없어요.");
      return data[0];
    };

    let out: any;
    switch (action) {
      case "analyze":  out = await analyze(db, task); break;
      case "sources":  out = await findSources(db, task, section); break;
      case "qa":       out = await nextQuestion(db, task); break;
      case "guide":    out = await guide(db, task); break;
      case "formats":  out = formatList(task); break;
      case "draft":    out = await draft(db, task, format); break;
      case "score":    out = await score(db, task, await getDraft(), content); break;
      case "review":   out = await review(db, task, await getDraft()); break;
      case "finalize": out = await finalize(db, task, await getDraft()); break;
      default: return jsonError(`모르는 action: ${action}`, 400);
    }
    return jsonResponse({ success: true, ...out });
  } catch (e) {
    console.error(e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});