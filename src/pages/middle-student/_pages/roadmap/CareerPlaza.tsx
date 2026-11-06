// src/pages/middle-student/_pages/roadmap/CareerPlaza.tsx
// 진로 로드맵 → "진로 광장" 3D 화면 (휴대폰·태블릿·PC 모두 화면 전체로 띄움 · 닫기는 3D 화면 왼쪽 위 버튼 또는 ESC)
//   3D 화면 자체는 public/career-plaza/index.html (three.js)
//   저장은 여기서: 3D 화면이 보내는 메시지를 받아 Supabase에 읽고 쓴다
//     middle_plaza_profile    물방울 · 입은 옷 · 가진 옷
//     middle_plaza_dept_visit 들어가 본 학과(도장) · 끌린 학과
//     middle_plaza_quest      길 위 퀘스트 푼 기록
//     middle_plaza_mission    이번 달 역량 미션 (학년·월·역량 Q/R/E/D/C 하나에 한 줄)
//     middle_plaza_lesson     1~3회차 영상 확인 문제 (객관식 9 + 주관식 1)
//     middle_plaza_member     같은 학원 광장 친구 목록 (이름 · 마지막 접속)
//     middle_plaza_cheer      친구에게 보낸 응원 (없을 때 보내도 다음에 보여요)
//     middle_lessons          (읽기만) 원장 '수업 영상 관리'에 등록한 이번 달 1~3주차 영상 → 광장 1~3회차에서 재생
//   같은 학원 친구 실시간: Supabase Realtime 채널 plaza-{학원id} (presence = 지금 광장에 있는 사람, broadcast = 목적지·인사·응원)
//     위치는 '걸어갈 목적지가 바뀔 때'만 보내서 학생이 많아도 메시지가 적어요
//   grade(중1·중2·중3특목·중3일반)와 month(1~8, 지금 진행 중인 달)를 넘기면 그 학년·그 달 미션이 게시판에 떠요

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function CareerPlaza({ name, room, grade, month, academyId, onClose }: { name: string; room: string; grade: string; month: number; academyId?: string; onClose: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    let uid: string | null = null
    let ch: ReturnType<typeof supabase.channel> | null = null
    let look: any = { equip: null, title: '' }
    const toFrame = (msg: any) => frameRef.current?.contentWindow?.postMessage(msg, window.location.origin)

    // 처음 열 때: 저장된 진행 불러와서 3D 화면에 넘기기
    const loadState = async () => {
      const { data: u } = await supabase.auth.getUser()
      uid = u.user?.id ?? null
      if (!uid) return toFrame({ type: 'plaza-state', state: {} })
      // 수업 영상: 중3특목·중3일반은 '중3' 영상, 이번 달 = 진로 로드맵 month번째 달
      const lessonGrade = grade.startsWith('중3') ? '중3' : grade
      // 광장 친구 목록에 나를 올려 두기 (같은 학원 친구들이 응원을 보낼 수 있게)
      if (academyId) await supabase.from('middle_plaza_member').upsert({ student_id: uid, academy_id: academyId, name: name || '친구', grade, last_seen: new Date().toISOString() })
      const [p, v, q, m, ls, ld, cm, ch, ac] = await Promise.all([
        supabase.from('middle_plaza_profile').select('drops, equip, owned').eq('student_id', uid).maybeSingle(),
        supabase.from('middle_plaza_dept_visit').select('dept_name, liked').eq('student_id', uid),
        supabase.from('middle_plaza_quest').select('quest_key').eq('student_id', uid),
        supabase.from('middle_plaza_mission').select('grade, month, kind, dept_name, dept2, choice, body').eq('student_id', uid),
        supabase.from('middle_lessons')
          .select('month_no, week_no, title, sub_title, video_url, video_url_1, video_url_2, video_url_3, video_url_4')
          .eq('grade', lessonGrade).eq('is_active', true),
        supabase.from('middle_plaza_lesson').select('round, status, picks').eq('student_id', uid).eq('grade', grade).eq('month', month),
        academyId
          ? supabase.from('middle_plaza_member').select('student_id, name, last_seen').eq('academy_id', academyId).neq('student_id', uid).order('last_seen', { ascending: false }).limit(60)
          : Promise.resolve({ data: [] as any[], error: null }),
        supabase.from('middle_plaza_cheer').select('from_name, msg, created_at').eq('to_id', uid).eq('seen', false).order('created_at', { ascending: false }).limit(20),
        supabase.rpc('plaza_academy_month'),
      ])
      const rows: any[] = ls.data ?? []
      const monthNos = [...new Set(rows.map(r => r.month_no))].sort((a, b) => a - b)
      const thisMonth = monthNos[month - 1]
      const lessons = [1, 2, 3].map(w => {
        const r = rows.find(x => x.month_no === thisMonth && x.week_no === w)
        if (!r) return null
        const urls = [r.video_url_1 ?? r.video_url, r.video_url_2, r.video_url_3, r.video_url_4].filter((u: string | null) => u && u.trim())
        return { week: w, title: r.title ?? `${w}회차`, sub: r.sub_title ?? '', urls }
      })
      if (p.error || v.error || q.error || m.error || ls.error) console.warn('[진로 광장] 불러오기 실패', p.error || v.error || q.error || m.error || ls.error)
      toFrame({
        type: 'plaza-state',
        state: {
          drops: p.data?.drops ?? 120,
          equip: p.data?.equip ?? null,
          owned: p.data?.owned ?? [],
          visits: v.data ?? [],
          quests: (q.data ?? []).map((x: any) => x.quest_key),
          missions: m.data ?? [],
          lessons,
          classmates: (cm.data ?? []).map((x: any) => ({ id: x.student_id, name: x.name, last_seen: x.last_seen })),
          cheers: ch.data ?? [],
          academy: Array.isArray(ac.data) ? ac.data[0] ?? null : ac.data ?? null,
          lessonDone: (ld.data ?? []).filter((x: any) => x.status !== 'draft').map((x: any) => x.round),
          // 임시저장한 답 (회차 → 답) — 다음에 들어오면 이어서
          lessonDraft: Object.fromEntries((ld.data ?? []).filter((x: any) => x.status === 'draft').map((x: any) => [x.round, x.picks])),
        },
      })
      startNet()
    }

    // 같은 학원 친구 실시간 연결
    const startNet = () => {
      if (!uid || !academyId || ch) return
      const me = uid
      ch = supabase.channel(`plaza-${academyId}`, { config: { broadcast: { self: false }, presence: { key: me } } })
      ch.on('presence', { event: 'sync' }, () => {
        const st: Record<string, any[]> = (ch as any).presenceState()
        const peers = Object.entries(st)
          .filter(([k]) => k !== me)
          .map(([k, v]) => ({ id: k, name: v[0]?.name, equip: v[0]?.equip, title: v[0]?.title }))
        toFrame({ type: 'plaza-peers', peers })
      })
      ch.on('broadcast', { event: 'pos' }, ({ payload }) => toFrame({ type: 'plaza-peer-pos', ...payload }))
      ch.on('broadcast', { event: 'act' }, ({ payload }) => toFrame({ type: 'plaza-peer-act', ...payload }))
      ch.subscribe(async status => {
        if (status !== 'SUBSCRIBED') return
        await ch?.track({ name: name || '친구', grade, ...look })
        toFrame({ type: 'plaza-net-on', me })
      })
    }

    // 3D 화면에서 바뀐 것 저장
    const save = async (kind: string, data: any) => {
      if (!uid) return
      const now = new Date().toISOString()
      let r: any
      if (kind === 'profile') {
        r = await supabase.from('middle_plaza_profile').upsert({ student_id: uid, drops: data.drops, equip: data.equip, owned: data.owned, updated_at: now })
      } else if (kind === 'visit') {
        r = await supabase.from('middle_plaza_dept_visit').upsert({ student_id: uid, dept_name: data.dept_name, series: data.series }, { onConflict: 'student_id,dept_name', ignoreDuplicates: true })
      } else if (kind === 'like') {
        r = await supabase.from('middle_plaza_dept_visit').upsert({ student_id: uid, dept_name: data.dept_name, series: data.series, liked: data.liked }, { onConflict: 'student_id,dept_name' })
      } else if (kind === 'quest') {
        r = await supabase.from('middle_plaza_quest').upsert({ student_id: uid, quest_key: data.quest_key }, { onConflict: 'student_id,quest_key', ignoreDuplicates: true })
      }
      else if (kind === 'mission') {
        r = await supabase.from('middle_plaza_mission').upsert(
          { student_id: uid, grade: data.grade, month: data.month, kind: data.kind, dept_name: data.dept_name, dept2: data.dept2 ?? null, choice: data.choice ?? null, body: data.body, updated_at: now },
          { onConflict: 'student_id,grade,month,kind' },
        )
      }
      else if (kind === 'lesson') {
        r = await supabase.from('middle_plaza_lesson').upsert(
          { student_id: uid, grade: data.grade, month: data.month, round: data.round, picks: data.picks ?? [], correct: data.correct, total: data.total, answer: data.answer, status: data.status ?? 'done', done_at: now },
          { onConflict: 'student_id,grade,month,round' },
        )
      }
      else if (kind === 'cheer' && academyId) {
        r = await supabase.from('middle_plaza_cheer').insert({ academy_id: academyId, from_id: uid, from_name: name || '친구', to_id: data.to, msg: String(data.msg ?? '').slice(0, 40) })
      }
      else if (kind === 'cheer-seen') {
        r = await supabase.from('middle_plaza_cheer').update({ seen: true }).eq('to_id', uid).eq('seen', false)
      }
      if (r?.error) console.warn('[진로 광장] 저장 실패', kind, r.error.message)
    }

    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      const d = e.data || {}
      if (d.type === 'career-plaza-close') closeRef.current()
      if (d.type === 'plaza-ready') loadState()
      if (d.type === 'plaza-save') save(d.kind, d.data)
      if (d.type === 'plaza-net' && ch && uid) {
        if (d.ev === 'look') { look = d.d ?? look; ch.track({ name: name || '친구', grade, ...look }) }
        else ch.send({ type: 'broadcast', event: d.ev, payload: { id: uid, ...(d.d ?? {}) } })
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('message', onMsg)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('message', onMsg)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      if (ch) supabase.removeChannel(ch)
    }
  }, [])

  const src = `/career-plaza/index.html?name=${encodeURIComponent(name || '나')}&room=${encodeURIComponent(room)}&grade=${encodeURIComponent(grade)}&month=${month}`

  return (
    <div className="fixed inset-0 z-[100] bg-[#121a16] flex items-center justify-center">
      <iframe
        ref={frameRef}
        title="진로 광장"
        src={src}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen"
      />
    </div>
  )
}