// src/pages/middle-student/_pages/roadmap/CareerPlaza.tsx
// 진로 로드맵 → "진로 광장" 3D 화면 (휴대폰·태블릿·PC 모두 화면 전체로 띄움 · 닫기는 3D 화면 왼쪽 위 버튼 또는 ESC)
//   3D 화면 자체는 public/career-plaza/index.html (three.js)
//   저장은 여기서: 3D 화면이 보내는 메시지를 받아 Supabase에 읽고 쓴다
//     middle_plaza_profile    물방울 · 입은 옷 · 가진 옷
//     middle_plaza_dept_visit 들어가 본 학과(도장) · 끌린 학과
//     middle_plaza_quest      길 위 퀘스트 푼 기록

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function CareerPlaza({ name, room, onClose }: { name: string; room: string; onClose: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    let uid: string | null = null
    const toFrame = (msg: any) => frameRef.current?.contentWindow?.postMessage(msg, window.location.origin)

    // 처음 열 때: 저장된 진행 불러와서 3D 화면에 넘기기
    const loadState = async () => {
      const { data: u } = await supabase.auth.getUser()
      uid = u.user?.id ?? null
      if (!uid) return toFrame({ type: 'plaza-state', state: {} })
      const [p, v, q] = await Promise.all([
        supabase.from('middle_plaza_profile').select('drops, equip, owned').eq('student_id', uid).maybeSingle(),
        supabase.from('middle_plaza_dept_visit').select('dept_name, liked').eq('student_id', uid),
        supabase.from('middle_plaza_quest').select('quest_key').eq('student_id', uid),
      ])
      if (p.error || v.error || q.error) console.warn('[진로 광장] 불러오기 실패', p.error || v.error || q.error)
      toFrame({
        type: 'plaza-state',
        state: {
          drops: p.data?.drops ?? 120,
          equip: p.data?.equip ?? null,
          owned: p.data?.owned ?? [],
          visits: v.data ?? [],
          quests: (q.data ?? []).map((x: any) => x.quest_key),
        },
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
      if (r?.error) console.warn('[진로 광장] 저장 실패', kind, r.error.message)
    }

    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      const d = e.data || {}
      if (d.type === 'career-plaza-close') closeRef.current()
      if (d.type === 'plaza-ready') loadState()
      if (d.type === 'plaza-save') save(d.kind, d.data)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('message', onMsg)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('message', onMsg)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [])

  const src = `/career-plaza/index.html?name=${encodeURIComponent(name || '나')}&room=${encodeURIComponent(room)}`

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