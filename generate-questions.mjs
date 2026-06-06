// generate-questions.js
// 학교 수행평가 예상 문항 일괄 생성 스크립트
//
// 동작:
//   1) school_suhaeng에서 question_content가 비어있는(=아직 문항 없는) 행을 모두 가져옴
//   2) 각 행마다 middle-school-suhaeng-title 함수를 호출해 예상 문항 생성
//   3) 생성된 문항을 question_content에 저장 (+ question_status='auto', question_generated_at=now())
//   4) 같은 학교의 같은 과제는 행 1개 = 문항 1개이므로,
//      그 학교 학생 전원이 동일한 문항 하나를 보게 됨 (학생별로 달라지지 않음)
//
// 실행법:
//   1) 아래 SERVICE_KEY 에 Supabase service_role 키를 넣는다 (절대 외부 공유 금지)
//   2) 터미널에서: node generate-questions.js
//   3) 특정 학교만 하려면: node generate-questions.js 264344b1-88f8-4291-aebe-476ac65161ef
//
// 주의:
//   - 이미 question_content가 채워진 행은 건너뜀 (재생성 안 함 = 비용 절약, 문항 고정)
//   - 다시 만들고 싶으면 해당 행의 question_content를 null로 지우고 다시 실행

import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────
const SUPABASE_URL = "https://yrunxizfvssiwyieevgw.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlydW54aXpmdnNzaXd5aWVldmd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY4MzY0NiwiZXhwIjoyMDkyMjU5NjQ2fQ.v8PLDJ3k4y5v2jujbhG74n2HRzlkf3Ws_t_YUDgADNI";
const FUNCTION_NAME = "middle-school-suhaeng-title";

// 명령행 인자로 특정 school_id만 처리 (없으면 전체)
const onlySchoolId = process.argv[2] || null;

// API 부하 방지용 대기 (ms)
const DELAY_MS = 1200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log("🔍 문항이 비어있는 수행평가 행을 조회합니다...");

  let query = supabase
    .from("school_suhaeng")
    .select(
      "id, school_id, grade, subject, unit_topic, achievement_standard, core_concept, task_title, eval_type, display_type, score, scoring_factors, min_chars, max_chars, present_time_min, present_time_max, question_content"
    )
    // question_content 가 null 이거나 빈 문자열인 것만
    .or("question_content.is.null,question_content.eq.");

  if (onlySchoolId) {
    query = query.eq("school_id", onlySchoolId);
    console.log(`   (school_id = ${onlySchoolId} 만 처리)`);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("❌ 조회 실패:", error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("✅ 채울 문항이 없어요. (모든 행에 이미 문항이 있음)");
    return;
  }

  console.log(`📝 총 ${rows.length}건의 문항을 생성합니다.\n`);

  let success = 0;
  let fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tag = `[${i + 1}/${rows.length}] ${r.subject} · ${r.display_type || r.eval_type} · ${r.task_title?.slice(0, 20) || r.unit_topic?.slice(0, 20) || ""}`;

    try {
      // 1) 문항 생성 함수 호출
      const { data, error: fnError } = await supabase.functions.invoke(FUNCTION_NAME, {
        body: {
          subject: r.subject || "",
          grade: String(r.grade || ""),
          unitTopic: r.unit_topic || "",
          achievementStandard: r.achievement_standard || "",
          coreConcept: r.core_concept || "",
          scoringFactors: r.scoring_factors || "",
          evalType: r.eval_type || "",
          displayType: r.display_type || "",
          taskTitle: r.task_title || "",
          score: r.score || undefined,
          minChars: r.min_chars || undefined,
          maxChars: r.max_chars || undefined,
          presentTimeMin: r.present_time_min || undefined,
          presentTimeMax: r.present_time_max || undefined,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "생성 실패(success=false)");

      const a = data.analysis || {};
      const questionContent = (a.questionContent || "").trim();
      if (!questionContent) throw new Error("questionContent가 비어있음");

      // conditions / guideForStudent 가 있으면 본문 뒤에 덧붙여 학생이 보기 좋게
      let fullText = questionContent;
      if (a.conditions) fullText += `\n\n📋 조건: ${a.conditions}`;
      if (a.guideForStudent) fullText += `\n💡 준비 팁: ${a.guideForStudent}`;

      // 2) DB 저장
      const { error: upError } = await supabase
        .from("school_suhaeng")
        .update({
          question_content: fullText,
          question_status: "auto",
          question_generated_at: new Date().toISOString(),
        })
        .eq("id", r.id);

      if (upError) throw new Error(upError.message);

      success++;
      console.log(`✅ ${tag}`);
      console.log(`   └ ${questionContent.slice(0, 60)}...`);
    } catch (e) {
      fail++;
      console.log(`❌ ${tag}`);
      console.log(`   └ 실패: ${e.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`완료: 성공 ${success}건 / 실패 ${fail}건`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch((e) => {
  console.error("스크립트 오류:", e);
  process.exit(1);
});