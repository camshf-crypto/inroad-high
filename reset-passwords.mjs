import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrunxizfvssiwyieevgw.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 없어요.')
  process.exit(1)
}

const PASSWORD = '12341234'
const EMAILS = [
  'admin24@test.com',
  's34@test.com','s35@test.com','s36@test.com','s37@test.com','s38@test.com',
]

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUser(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (hit) return hit
    if (data.users.length < 200) return null
  }
  return null
}

let ok = 0, fail = 0
for (const email of EMAILS) {
  try {
    const user = await findUser(email)
    if (!user) { console.log(`x ${email} - 계정 없음`); fail++; continue }
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: PASSWORD })
    if (error) throw error
    console.log(`o ${email} -> ${PASSWORD}`)
    ok++
  } catch (e) {
    console.log(`x ${email} - ${e.message ?? e}`)
    fail++
  }
}
console.log(`\n완료: 성공 ${ok} / 실패 ${fail}`)
