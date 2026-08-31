// create-sejong.mjs
// 세종학원 원장 1명 + 중등 학생 2명 생성
//
// 실행:
//   node create-sejong.mjs
//
// ⚠️ SUPABASE_SERVICE_KEY 는 반드시 sb_secret_ 로 시작하는 키여야 합니다.
//    sb_publishable_ 키로는 Auth 사용자를 만들 수 없습니다.
//    Supabase 대시보드 → Project Settings → API Keys → service_role

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yrunxizfvssiwyieevgw.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "여기에_sb_secret_키_붙여넣기";

// ── 만들 계정 ─────────────────────────────────────
const PASSWORD = "12341234";
const ACADEMY_NAME = "세종학원";

const OWNER = {
  email: "sejong@test.com",
  name: "세종원장",
  role: "admin",
};

const STUDENTS = [
  { email: "stsejong1@test.com", name: "세종학생1", grade: "중3", school: "세종중학교" },
  { email: "stsejong2@test.com", name: "세종학생2", grade: "중3", school: "세종중학교" },
];
// ────────────────────────────────────────────────

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function die(msg, err) {
  console.error(`\n❌ ${msg}`);
  if (err) console.error(err.message || err);
  process.exit(1);
}

// 이미 있는 계정이면 재사용, 없으면 생성
async function ensureUser(email, name) {
  const { data: created, error } = await sb.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });

  if (!error) {
    console.log(`   ✅ 생성  ${email}`);
    return created.user.id;
  }

  // 이미 존재하면 찾아서 비밀번호만 맞춰준다
  if (/already|exists|registered/i.test(error.message)) {
    let page = 1;
    while (page <= 20) {
      const { data, error: le } = await sb.auth.admin.listUsers({ page, perPage: 200 });
      if (le) die(`사용자 목록 조회 실패 (${email})`, le);
      const found = data.users.find((u) => u.email === email);
      if (found) {
        await sb.auth.admin.updateUserById(found.id, { password: PASSWORD });
        console.log(`   ♻️  이미 있음 → 비밀번호 재설정  ${email}`);
        return found.id;
      }
      if (data.users.length < 200) break;
      page++;
    }
    die(`이미 있다는데 목록에서 못 찾음: ${email}`);
  }

  die(`계정 생성 실패 (${email})`, error);
}

async function main() {
  if (!SERVICE_KEY.startsWith("sb_secret_") && !SERVICE_KEY.startsWith("eyJ")) {
    die("SERVICE_KEY 가 service_role 키가 아닙니다. sb_secret_ 로 시작하는 키를 넣어주세요.");
  }

  // ── 1. 학원 ────────────────────────────────────
  console.log("\n🏫 학원 확인");
  let academyId;

  const { data: existing } = await sb
    .from("academies")
    .select("id, name")
    .eq("name", ACADEMY_NAME)
    .maybeSingle();

  if (existing) {
    academyId = existing.id;
    console.log(`   ♻️  이미 있음  ${ACADEMY_NAME} (${academyId})`);
  } else {
    // 기존 학원 한 곳을 본떠서 만든다.
    // (NOT NULL 컬럼이나 enabled_menus 를 빠뜨리지 않기 위해)
    const { data: sample, error: se } = await sb
      .from("academies")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (se) die("기존 학원 조회 실패", se);
    if (!sample) die("본뜰 학원이 없습니다. 학원을 먼저 하나 만들어주세요.");

    const row = { ...sample };
    delete row.id;
    delete row.created_at;
    delete row.updated_at;
    row.name = ACADEMY_NAME;
    row.status = "active";

    // 🎯 고유값 컬럼은 복사하면 안 된다 (academy_code 등)
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    if ("academy_code" in row) row.academy_code = `SEJONG${rand}`;
    if ("code" in row) row.code = `SEJONG${rand}`;
    if ("slug" in row) row.slug = `sejong-${rand.toLowerCase()}`;
    if ("business_number" in row) row.business_number = null;
    if ("email" in row) row.email = OWNER.email;

    const { data: inserted, error: ie } = await sb
      .from("academies")
      .insert(row)
      .select("id, enabled_menus")
      .single();
    if (ie) {
      console.error("\n   보낸 컬럼:", Object.keys(row).join(", "));
      die("학원 생성 실패", ie);
    }

    academyId = inserted.id;
    console.log(`   ✅ 생성  ${ACADEMY_NAME} (${academyId})`);
    console.log(`   📋 메뉴 (${sample.name} 에서 복사):`);
    console.log("      ", JSON.stringify(inserted.enabled_menus));
  }

  // ── 2. 원장 ────────────────────────────────────
  console.log("\n👤 원장");
  const ownerId = await ensureUser(OWNER.email, OWNER.name);

  const { error: op } = await sb.from("profiles").upsert(
    {
      id: ownerId,
      email: OWNER.email,
      name: OWNER.name,
      role: OWNER.role,
      academy_id: academyId,
      status: "active",
    },
    { onConflict: "id" }
  );
  if (op) die("원장 프로필 저장 실패", op);
  console.log(`   ✅ 프로필 저장 (role: ${OWNER.role})`);

  // ── 3. 학생 ────────────────────────────────────
  console.log("\n🎓 학생");
  for (const s of STUDENTS) {
    const uid = await ensureUser(s.email, s.name);
    const { error: sp } = await sb.from("profiles").upsert(
      {
        id: uid,
        email: s.email,
        name: s.name,
        role: "middle_student",
        academy_id: academyId,
        grade: s.grade,
        school: s.school,
        status: "active",
      },
      { onConflict: "id" }
    );
    if (sp) die(`학생 프로필 저장 실패 (${s.email})`, sp);
    console.log(`   ✅ 프로필 저장  ${s.name} (${s.grade})`);
  }

  // ── 완료 ──────────────────────────────────────
  console.log("\n────────────────────────────────");
  console.log(`🏫 ${ACADEMY_NAME}   ${academyId}`);
  console.log(`🔑 비밀번호 (공통)   ${PASSWORD}`);
  console.log("");
  console.log(`👤 원장   ${OWNER.email}`);
  STUDENTS.forEach((s) => console.log(`🎓 학생   ${s.email}  (${s.grade})`));
  console.log("────────────────────────────────\n");
}

main().catch((e) => die("예상치 못한 오류", e));