// ============================================
// supabase/functions/admin-agent/index.ts
// 비커스 원장 AI 비서 — v2 (전체 기능 조회 연결, 읽기 전용)
//
// 도구 (모두 조회만)
//   공통   : find_student, open_screen, daily_briefing, student_overview
//   피드백 : feedback_queue
//   중등   : missing_missions, middle_essay_status
//   고등   : roadmap_status, roadmap_gaps, report_reviews, interview_progress, mock_exam_results
//   기타   : suhaeng_status, pending_approvals, monthly_reports, concept_results
//
// 권한: 로그인한 원장/선생님 토큰으로 조회 → 기존 RLS 그대로 (다른 학원 안 보임)
// 생기부 원본(업로드 PDF·원문)은 조회하지 않음
// 응답에 usage(토큰 사용량) 포함
// 모델: gpt-4.1-mini
// ============================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const MODEL = 'gpt-4.1-mini'
const MAX_TURNS = 5

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

// ── 화면 · 탭 ──
const SCREENS: Record<string, string> = {
  dashboard: '/admin', high_students: '/admin/students', middle_students: '/admin/middle-students',
  lesson_run: '/admin/lesson-run', middle_lessons: '/admin/middle-lessons', suhaeng_manage: '/admin/middle-suhaeng',
  mock_exam: '/admin/mock-exam', reports: '/admin/reports', student_approval: '/admin/student-approval',
  teachers: '/admin/teachers', academy: '/admin/academy', billing: '/admin/billing', settings: '/admin/settings',
}
const HIGH_TABS = ['roadmap', 'roadmap_activity', 'concept', 'topic', 'book', 'record', 'suhaeng', 'basic', 'expect', 'past', 'simulation', 'presentation', 'major']
const MIDDLE_TABS = ['roadmap', 'jinro', 'concept', 'suhaeng', 'record', 'book', 'debate', 'basic', 'expect', 'past', 'simulation', 'presentation']

const SYSTEM = `너는 비커스(B-KURS) 학원 원장님을 돕는 AI 비서다.
- 존댓말, 짧고 분명하게. 숫자·이름은 반드시 도구 결과로만 말하고 지어내지 않는다.
- 학생 이름이 나오면 먼저 find_student로 id를 찾는다. 동명이인이면 학년·학교로 물어본다.
- 학생 화면이나 탭을 보여달라고 하면 open_screen을 쓴다 (student_id는 반드시 find_student 결과의 id).
  탭: 기본 인성=basic, 기출=past, 생기부 예상질문(중등은 자소서·예상질문)=expect, 제시문=presentation, 시뮬레이션=simulation,
  전공특화=major, 수행평가=suhaeng, 생기부=record, 독서=book, 탐구주제=topic, 로드맵=roadmap, 로드맵 활동(입시 로드맵)=roadmap_activity, 진로 계열 검사=concept
- 지금은 조회만 가능하다. 저장·발송·설정 변경 요청엔 "다음 버전에서 확인 후 실행할 수 있어요"라고 안내한다.
- 생기부 원본 내용은 다루지 않는다.
- 긴 목록은 요약하고, 자세한 건 표로 넘어간다고 말한다.`

const P = (props: Record<string, any> = {}, required: string[] = []) => ({ type: 'object', properties: props, required })
const T = (name: string, description: string, parameters = P()) => ({ type: 'function', function: { name, description, parameters } })
const SID = { student_id: { type: 'string', description: 'find_student로 얻은 id' } }

const TOOLS = [
  T('find_student', '이름으로 학생 찾기 (id·학년·학교·고등/중등)', P({ name: { type: 'string' } }, ['name'])),
  T('open_screen', '원장 화면 열기. 학생이면 student_id+level(+tab)', P({
    screen: { type: 'string', enum: Object.keys(SCREENS) }, student_id: { type: 'string' },
    level: { type: 'string', enum: ['high', 'middle'] }, tab: { type: 'string', enum: [...new Set([...HIGH_TABS, ...MIDDLE_TABS])] },
  })),
  T('daily_briefing', '아침 브리핑: 피드백 대기, 미션 미제출, 학생 승인 대기, 보고서 검토 요청, 자소서 컨셉 확인 대기'),
  T('student_overview', '학생 한 명 종합 요약 (진로·검사·피드백 대기·면접·로드맵·수행평가)', P(SID, ['student_id'])),
  T('feedback_queue', '선생님 피드백 대기 목록', P({
    kind: { type: 'string', description: 'high_basic_past|high_record_q|middle_record_q|high_passage|high_simulation|high_suhaeng_first|high_suhaeng_final|middle_suhaeng_first|middle_suhaeng_final' },
    student_id: { type: 'string' }, limit: { type: 'number' },
  })),
  T('missing_missions', '중등: 최근 N일 온라인 미션 미제출 학생', P({ days: { type: 'number' } })),
  T('middle_essay_status', '중등 자소서 마법사 진행 단계 + 컨셉 확인 대기'),
  T('roadmap_status', '고등 입시 로드맵 학생별 상세 (준비 단계·과목·탐구·보고서·창체·독서)', P(SID, ['student_id'])),
  T('roadmap_gaps', '고등 반 전체: 준비 단계 미완료·탐구 없음·독서 없음 학생 찾기'),
  T('report_reviews', '고등 탐구 보고서 검토 요청 대기 목록'),
  T('interview_progress', '고등 면접 진행 (기본인성·기출·예상질문·제시문·시뮬레이션·전공특화·모의고사)', P(SID, ['student_id'])),
  T('mock_exam_results', '면접 모의고사 최근 결과 목록', P({ limit: { type: 'number' } })),
  T('suhaeng_status', '수행평가 제출·피드백 현황 (고등/중등)', P({ level: { type: 'string', enum: ['high', 'middle', 'all'] } })),
  T('pending_approvals', '학생·선생님 가입 승인 대기 목록'),
  T('monthly_reports', '학부모 월간 리포트 작성·발송 현황', P({ year_month: { type: 'string', description: 'YYYY-MM, 기본 이번 달' } })),
  T('concept_results', '진로 계열 검사 진행·승인 현황', P({ level: { type: 'string', enum: ['high', 'middle'] } })),
]

type Out = { cards: any[]; actions: any[] }
const daysAgo = (iso?: string | null) => {
  if (!iso) return '-'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d <= 0 ? '오늘' : `${d}일 전`
}
const countBy = (rows: any[], key: string) => rows.reduce((m: Record<string, number>, r) => { const k = r[key] ?? '없음'; m[k] = (m[k] ?? 0) + 1; return m }, {})
const table = (out: Out, title: string, columns: string[], rows: any[][], links?: string[]) => out.cards.push({ type: 'table', title, columns, rows, links })
const levelOf = (role?: string) => (role === 'middle_student' ? 'middle' : 'high')
const stuRoute = (id: string, role?: string, tab?: string) => (role === 'middle_student' ? '/admin/middle-students/' : '/admin/students/') + id + (tab ? `?tab=${tab}` : '')

async function names(db: any, ids: string[]) {
  const uniq = [...new Set(ids.filter(Boolean))]
  if (!uniq.length) return new Map<string, any>()
  const { data } = await db.from('profiles').select('id,name,grade,role').in('id', uniq)
  return new Map((data ?? []).map((p: any) => [p.id, p]))
}

// ── 도구 실행 ──
async function runTool(db: any, name: string, a: any, out: Out): Promise<any> {
  switch (name) {
    case 'find_student': {
      const { data, error } = await db.from('profiles').select('id,name,grade,school_name,role')
        .in('role', ['high_student', 'middle_student']).ilike('name', `%${(a.name ?? '').trim()}%`).limit(10)
      if (error) return { error: error.message }
      return { students: (data ?? []).map((s: any) => ({ id: s.id, 이름: s.name, 학년: s.grade, 학교: s.school_name, level: levelOf(s.role) })) }
    }

    case 'open_screen': {
      let route = SCREENS[a.screen] ?? '/admin'
      if (a.student_id) {
        const { data: p } = await db.from('profiles').select('id,name,role').eq('id', a.student_id).maybeSingle()
        if (!p) return { error: 'student_id가 올바르지 않아요. find_student로 먼저 찾아주세요.' }
        route = stuRoute(p.id, p.role, a.tab)
      }
      out.actions.push({ type: 'open', route })
      return { ok: true, route }
    }

    case 'feedback_queue': {
      let q = db.from('agent_feedback_queue').select('kind,label,student_id,student_name,detail,waiting_since,route')
        .order('waiting_since', { ascending: true }).limit(Math.min(a.limit ?? 30, 100))
      if (a.kind) q = q.eq('kind', a.kind)
      if (a.student_id) q = q.eq('student_id', a.student_id)
      const { data, error } = await q
      if (error) return { error: error.message }
      table(out, '피드백 대기 목록', ['기능', '학생', '내용', '기다린 날'], (data ?? []).map((r: any) => [r.label, r.student_name, r.detail, daysAgo(r.waiting_since)]), (data ?? []).map((r: any) => r.route))
      return { count: data?.length ?? 0, 기능별: countBy(data ?? [], 'label'), 오래된순_상위: (data ?? []).slice(0, 10).map((r: any) => `${r.student_name} · ${r.label} · ${daysAgo(r.waiting_since)}`) }
    }

    case 'missing_missions': {
      const days = Math.min(Math.max(a.days ?? 7, 1), 60)
      const since = new Date(Date.now() - days * 86400000).toISOString()
      const { data: st } = await db.from('profiles').select('id,name,grade').eq('role', 'middle_student')
      const ids = (st ?? []).map((s: any) => s.id)
      if (!ids.length) return { count: 0 }
      const { data: subs } = await db.from('mission_workbook_answer').select('student_id,submitted_at').in('student_id', ids).not('submitted_at', 'is', null)
      const last = new Map<string, string>()
      for (const s of subs ?? []) if (!last.get(s.student_id) || s.submitted_at > last.get(s.student_id)!) last.set(s.student_id, s.submitted_at)
      const miss = (st ?? []).filter((s: any) => !last.get(s.id) || last.get(s.id)! < since)
      table(out, `최근 ${days}일 미션 미제출`, ['학생', '학년', '마지막 제출'], miss.map((s: any) => [s.name, s.grade, last.get(s.id) ? daysAgo(last.get(s.id)) : '기록 없음']), miss.map((s: any) => `/admin/middle-students/${s.id}`))
      return { days, count: miss.length, 학생: miss.slice(0, 20).map((s: any) => s.name) }
    }

    case 'daily_briefing': {
      const fq: any = await runTool(db, 'feedback_queue', { limit: 100 }, { cards: [], actions: [] })
      const mm: any = await runTool(db, 'missing_missions', { days: 7 }, { cards: [], actions: [] })
      const { count: appr } = await db.from('pending_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: rev } = await db.from('high_roadmap_pipeline').select('id', { count: 'exact', head: true }).not('requested_at', 'is', null).is('reviewed_at', null)
      const { count: ess } = await db.from('middle_essay_wizard').select('id', { count: 'exact', head: true }).not('concept_sent_at', 'is', null).is('concept_checked_at', null)
      return { 피드백대기: fq.count, 피드백_기능별: fq.기능별, 미션미제출_7일: mm.count ?? 0, 학생승인대기: appr ?? 0, 보고서검토요청: rev ?? 0, 자소서컨셉확인대기: ess ?? 0 }
    }

    case 'student_overview': {
      const id = a.student_id
      const { data: p } = await db.from('profiles').select('id,name,grade,school_name,role,target_universities').eq('id', id).maybeSingle()
      if (!p) return { error: '학생을 찾을 수 없어요' }
      const middle = p.role === 'middle_student'
      const { data: concept } = await db.from(middle ? 'middle_student_concept' : 'student_concept').select('grade,status,type_name,major,career,custom_goal' + (middle ? '' : ',university')).eq('student_id', id)
      const fq: any = await runTool(db, 'feedback_queue', { student_id: id, limit: 50 }, { cards: [], actions: [] })
      const res: any = { 이름: p.name, 학년: p.grade, 학교: p.school_name, 구분: middle ? '중등' : '고등', 목표대학: p.target_universities, 진로검사: concept, 피드백대기: fq.count, 피드백_기능별: fq.기능별 }
      if (middle) {
        const { data: wb } = await db.from('mission_workbook_answer').select('mission_key,submitted_at').eq('student_id', id).order('submitted_at', { ascending: false }).limit(5)
        res.최근미션 = (wb ?? []).map((w: any) => `${w.mission_key} · ${daysAgo(w.submitted_at)}`)
        const { data: ess } = await db.from('middle_essay_wizard').select('current_step,concept_status,submitted').eq('student_id', id)
        res.자소서 = ess
      } else {
        const { data: apt } = await db.from('high_aptitude_result').select('type_name').eq('student_id', id).maybeSingle()
        res.성향진단 = apt?.type_name ?? '안 함'
        const { count: topics } = await db.from('high_roadmap_topic').select('id', { count: 'exact', head: true }).eq('student_id', id)
        const { count: books } = await db.from('high_reading').select('id', { count: 'exact', head: true }).eq('student_id', id)
        const { data: mock } = await db.from('high_mock_exam').select('status,total_score,submitted_at,target_univ,target_major').eq('student_id', id).order('created_at', { ascending: false }).limit(3)
        Object.assign(res, { 탐구주제수: topics ?? 0, 독서수: books ?? 0, 최근모의고사: mock })
      }
      return res
    }

    case 'middle_essay_status': {
      const { data, error } = await db.from('middle_essay_wizard').select('student_id,current_step,concept_status,concept_sent_at,concept_checked_at,submitted,updated_at')
      if (error) return { error: error.message }
      const nm = await names(db, (data ?? []).map((r: any) => r.student_id))
      const wait = (data ?? []).filter((r: any) => r.concept_sent_at && !r.concept_checked_at)
      table(out, '중등 자소서 진행', ['학생', '단계', '컨셉', '최근 작업'], (data ?? []).map((r: any) => [nm.get(r.student_id)?.name ?? '-', `${r.current_step ?? 0}단계`, r.concept_sent_at && !r.concept_checked_at ? '확인 대기' : (r.concept_status ?? '-'), daysAgo(r.updated_at)]), (data ?? []).map((r: any) => `/admin/middle-students/${r.student_id}?tab=expect`))
      return { 전체: data?.length ?? 0, 컨셉확인대기: wait.map((r: any) => nm.get(r.student_id)?.name), 단계별: countBy(data ?? [], 'current_step') }
    }

    case 'roadmap_status': {
      const id = a.student_id
      const [apt, concept, acts, prog, topics, pipe, chang, books] = await Promise.all([
        db.from('high_aptitude_result').select('type_name').eq('student_id', id).maybeSingle(),
        db.from('student_concept').select('grade,major,university,career,status').eq('student_id', id),
        db.from('high_school_activity').select('grade,category').eq('student_id', id),
        db.from('high_roadmap_progress').select('node_id,is_completed').eq('student_id', id),
        db.from('high_roadmap_topic').select('id,title,area,status,node_id,created_at').eq('student_id', id),
        db.from('high_roadmap_pipeline').select('topic_id,step,status,review_status,requested_at,reviewed_at').eq('student_id', id),
        db.from('high_roadmap_changche').select('activity_name,status').eq('student_id', id),
        db.from('high_reading').select('grade,semester,status').eq('student_id', id),
      ])
      const nodeIds = [...new Set([...(prog.data ?? []).map((r: any) => r.node_id), ...(topics.data ?? []).map((t: any) => t.node_id)].filter(Boolean))]
      const { data: nodes } = nodeIds.length ? await db.from('high_roadmap_node').select('id,grade,subject_name').in('id', nodeIds) : { data: [] }
      const nodeName = new Map((nodes ?? []).map((n: any) => [n.id, `고${n.grade} ${n.subject_name}`]))
      const 준비 = { 성향진단: !!apt.data, 진로계열검사: (concept.data ?? []).length > 0, 최종목표: (concept.data ?? []).some((c: any) => c.major), 학교활동입력: (acts.data ?? []).length > 0, 과목설정: (prog.data ?? []).length > 0 }
      table(out, '탐구주제', ['과목', '주제', '상태'], (topics.data ?? []).map((t: any) => [nodeName.get(t.node_id) ?? '-', t.title ?? '-', t.status ?? '-']))
      return {
        준비단계: 준비, 성향: apt.data?.type_name, 진로목표: concept.data,
        학교활동수_학년별: countBy(acts.data ?? [], 'grade'), 과목수: (prog.data ?? []).length, 이수완료과목: (prog.data ?? []).filter((r: any) => r.is_completed).length,
        탐구주제수: (topics.data ?? []).length,
        파이프라인_단계별: countBy((pipe.data ?? []).filter((p: any) => p.status === 'done'), 'step'),
        보고서검토대기: (pipe.data ?? []).filter((p: any) => p.requested_at && !p.reviewed_at).length,
        창체수: (chang.data ?? []).length, 독서_학년별: countBy(books.data ?? [], 'grade'),
      }
    }

    case 'roadmap_gaps': {
      const { data: st } = await db.from('profiles').select('id,name,grade').eq('role', 'high_student')
      const ids = (st ?? []).map((s: any) => s.id)
      if (!ids.length) return { count: 0 }
      const [apt, con, act, top, rd] = await Promise.all([
        db.from('high_aptitude_result').select('student_id').in('student_id', ids),
        db.from('student_concept').select('student_id,major').in('student_id', ids),
        db.from('high_school_activity').select('student_id').in('student_id', ids),
        db.from('high_roadmap_topic').select('student_id').in('student_id', ids),
        db.from('high_reading').select('student_id').in('student_id', ids),
      ])
      const has = (r: any) => new Set((r.data ?? []).map((x: any) => x.student_id))
      const A = has(apt), C = has(con), AC = has(act), TP = has(top), RD = has(rd)
      const G = new Set((con.data ?? []).filter((c: any) => c.major).map((c: any) => c.student_id))
      const rows = (st ?? []).map((s: any) => {
        const miss = [!A.has(s.id) && '성향진단', !C.has(s.id) && '계열검사', !G.has(s.id) && '최종목표', !AC.has(s.id) && '학교활동', !TP.has(s.id) && '탐구주제', !RD.has(s.id) && '독서'].filter(Boolean)
        return { s, miss }
      }).filter((r: any) => r.miss.length)
      table(out, '입시 로드맵 빈 곳', ['학생', '학년', '안 한 것'], rows.map((r: any) => [r.s.name, r.s.grade, r.miss.join(', ')]), rows.map((r: any) => `/admin/students/${r.s.id}?tab=roadmap_activity`))
      return { 전체: st?.length, 빈곳있는학생: rows.length, 항목별: rows.flatMap((r: any) => r.miss).reduce((m: any, k: string) => ({ ...m, [k]: (m[k] ?? 0) + 1 }), {}) }
    }

    case 'report_reviews': {
      const { data, error } = await db.from('high_roadmap_pipeline').select('student_id,topic_id,step,report_format,requested_at')
        .not('requested_at', 'is', null).is('reviewed_at', null).order('requested_at', { ascending: true }).limit(50)
      if (error) return { error: error.message }
      const nm = await names(db, (data ?? []).map((r: any) => r.student_id))
      const tids = (data ?? []).map((r: any) => r.topic_id).filter(Boolean)
      const { data: tp } = tids.length ? await db.from('high_roadmap_topic').select('id,title').in('id', tids) : { data: [] }
      const title = new Map((tp ?? []).map((t: any) => [t.id, t.title]))
      table(out, '보고서 검토 요청', ['학생', '탐구주제', '양식', '요청'], (data ?? []).map((r: any) => [nm.get(r.student_id)?.name ?? '-', title.get(r.topic_id) ?? '-', r.report_format ?? '-', daysAgo(r.requested_at)]), (data ?? []).map((r: any) => `/admin/students/${r.student_id}?tab=roadmap_activity`))
      return { count: data?.length ?? 0 }
    }

    case 'interview_progress': {
      const id = a.student_id
      const [qa, sq, pe, sim, maj, mock] = await Promise.all([
        db.from('high_questions_answer').select('answer_status').eq('student_id', id),
        db.from('high_saenggibu_questions').select('answer_status,is_practiced').eq('student_id', id),
        db.from('high_passage_exam').select('status,university,main_intent_score').eq('student_id', id),
        db.from('high_simulation').select('university,department,teacher_feedback,created_at').eq('student_id', id),
        db.from('high_major_progress').select('obj_score,obj_total,status').eq('student_id', id),
        db.from('high_mock_exam').select('status,total_score,target_univ,target_major,submitted_at').eq('student_id', id).order('created_at', { ascending: false }).limit(5),
      ])
      const majDone = (maj.data ?? []).filter((m: any) => m.obj_total)
      const fq: any = await runTool(db, 'feedback_queue', { student_id: id, limit: 50 }, { cards: [], actions: [] })
      return {
        기본인성_기출_답변상태: countBy(qa.data ?? [], 'answer_status'),
        생기부예상질문_답변상태: countBy(sq.data ?? [], 'answer_status'),
        제시문: (pe.data ?? []).map((p: any) => `${p.university ?? ''} ${p.status ?? ''} ${p.main_intent_score ?? ''}`),
        시뮬레이션: { 횟수: sim.data?.length ?? 0, 피드백대기: (sim.data ?? []).filter((s: any) => !s.teacher_feedback).length },
        전공특화: { 회차: majDone.length, 평균정답률: majDone.length ? Math.round(majDone.reduce((x: number, m: any) => x + m.obj_score / m.obj_total, 0) / majDone.length * 100) + '%' : '-' },
        모의고사: mock.data, 선생님피드백대기: fq.기능별,
      }
    }

    case 'mock_exam_results': {
      const { data, error } = await db.from('high_mock_exam').select('id,student_id,status,total_score,target_univ,target_major,interview_type,submitted_at')
        .not('submitted_at', 'is', null).order('submitted_at', { ascending: false }).limit(Math.min(a.limit ?? 20, 50))
      if (error) return { error: error.message }
      const nm = await names(db, (data ?? []).map((r: any) => r.student_id))
      table(out, '면접 모의고사 결과', ['학생', '목표', '점수', '응시'], (data ?? []).map((r: any) => [nm.get(r.student_id)?.name ?? '-', `${r.target_univ ?? ''} ${r.target_major ?? ''}`, r.total_score ?? '-', daysAgo(r.submitted_at)]), (data ?? []).map((r: any) => `/admin/students/${r.student_id}`))
      const sc = (data ?? []).map((r: any) => r.total_score).filter((x: any) => typeof x === 'number')
      return { count: data?.length ?? 0, 평균점수: sc.length ? Math.round(sc.reduce((x: number, y: number) => x + y, 0) / sc.length) : '-' }
    }

    case 'suhaeng_status': {
      const lv = a.level ?? 'all'
      const res: any = {}
      if (lv !== 'middle') { const { data } = await db.from('high_suhaeng_submissions').select('status'); res.고등_상태별 = countBy(data ?? [], 'status') }
      if (lv !== 'high') { const { data } = await db.from('suhaeng_submissions').select('status,question_school_name'); res.중등_상태별 = countBy(data ?? [], 'status'); res.중등_학교별 = countBy(data ?? [], 'question_school_name') }
      const fq: any = await runTool(db, 'feedback_queue', { limit: 100 }, { cards: [], actions: [] })
      res.피드백대기 = Object.fromEntries(Object.entries(fq.기능별 ?? {}).filter(([k]) => k.includes('수행평가')))
      return res
    }

    case 'pending_approvals': {
      const { data, error } = await db.from('pending_approvals').select('requested_role,academy_name,grade,contact_phone,created_at,user_id').eq('status', 'pending').order('created_at')
      if (error) return { error: error.message }
      const nm = await names(db, (data ?? []).map((r: any) => r.user_id))
      table(out, '가입 승인 대기', ['이름', '요청', '학년', '신청'], (data ?? []).map((r: any) => [nm.get(r.user_id)?.name ?? '-', r.requested_role, r.grade ?? '-', daysAgo(r.created_at)]))
      out.actions.push({ type: 'open', route: '/admin/student-approval' })
      return { count: data?.length ?? 0 }
    }

    case 'monthly_reports': {
      const ym = a.year_month ?? new Date().toISOString().slice(0, 7)
      const { data, error } = await db.from('parent_monthly_reports').select('student_id,is_published,ai_comment_draft,teacher_comment').eq('year_month', ym)
      if (error) return { error: error.message }
      const { count: total } = await db.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['high_student', 'middle_student'])
      return { 월: ym, 전체학생: total ?? 0, 리포트있음: data?.length ?? 0, 발송완료: (data ?? []).filter((r: any) => r.is_published).length, 초안만: (data ?? []).filter((r: any) => !r.is_published).length }
    }

    case 'concept_results': {
      const middle = a.level === 'middle'
      const { data, error } = await db.from(middle ? 'middle_student_concept' : 'student_concept').select('student_id,grade,status,type_name,major,updated_at')
      if (error) return { error: error.message }
      const nm = await names(db, (data ?? []).map((r: any) => r.student_id))
      table(out, `${middle ? '중등' : '고등'} 진로 계열 검사`, ['학생', '학년', '상태', '유형', '학과'], (data ?? []).map((r: any) => [nm.get(r.student_id)?.name ?? '-', r.grade ?? '-', r.status ?? '-', r.type_name ?? '-', r.major ?? '-']))
      return { 상태별: countBy(data ?? [], 'status') }
    }
  }
  return { error: '알 수 없는 도구' }
}

// ── 메인 ──
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ error: '로그인이 필요해요' }, 401)
    const db = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await db.auth.getUser()
    if (!user) return json({ error: '로그인이 필요해요' }, 401)
    const { data: me } = await db.from('profiles').select('name,role').eq('id', user.id).maybeSingle()
    if (!me || !['admin', 'teacher', 'super_admin'].includes(me.role)) return json({ error: '원장·선생님만 쓸 수 있어요' }, 403)

    const { message, history = [] } = await req.json()
    if (!message) return json({ error: 'message가 비었어요' }, 400)

    const messages: any[] = [
      { role: 'system', content: SYSTEM + `\n- 대화 상대: ${me.name ?? '원장'}님 · 오늘: ${new Date().toISOString().slice(0, 10)}` },
      ...history.slice(-10),
      { role: 'user', content: message },
    ]
    const out: Out = { cards: [], actions: [] }
    const usage = { input: 0, output: 0, calls: 0 }

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, temperature: 0.2, messages, tools: TOOLS }),
      })
      if (!res.ok) return json({ error: 'AI 호출 실패: ' + (await res.text()).slice(0, 300) }, 500)
      const body = await res.json()
      usage.input += body.usage?.prompt_tokens ?? 0
      usage.output += body.usage?.completion_tokens ?? 0
      usage.calls++
      const msg = body.choices[0].message
      messages.push(msg)

      if (!msg.tool_calls?.length) return json({ success: true, reply: msg.content, cards: out.cards, actions: out.actions, usage })
      for (const call of msg.tool_calls) {
        let args = {}
        try { args = JSON.parse(call.function.arguments || '{}') } catch { /* 빈 인자 */ }
        let result
        try { result = await runTool(db, call.function.name, args, out) } catch (e) { result = { error: String(e) } }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 6000) })
      }
    }
    return json({ success: true, reply: '조회가 길어져서 여기까지 정리했어요. 질문을 조금 좁혀주세요.', cards: out.cards, actions: out.actions, usage })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})