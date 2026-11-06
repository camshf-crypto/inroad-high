// src/pages/admin/_pages/plaza/PlazaStatus.tsx
// 원장 화면 · 진로 광장 현황
//   - 이번 주(최근 7일) 광장에서 아무것도 안 한 학생을 먼저 보여 줘요 → 독려 문구 복사
//   - 버튼을 누르면 독려 문구 · 학부모 주간 리포트가 창으로 열려요 → 확인하고 [복사하기] (카톡·문자에 붙여 넣기)
//   읽는 표: middle_plaza_member(마지막 접속) · middle_plaza_lesson(회차) · middle_plaza_mission(역량 미션) · middle_plaza_dept_visit(학과 방문)
//   학생 화면에는 아무것도 안 보여요 (아이들끼리 비교 없음)

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { academyState } from '@/lib/auth/atoms'
import { useAcademyStudents } from '@/pages/admin/_hooks/useAcademyStudents'

const KIND: Record<string, string> = { Q: '질문력', R: '탐구력', E: '표현력', D: '토론력', C: '진로 설계력' }
const DAY = 864e5

function ago(t?: string | null) {
  if (!t) return '들어온 적 없음'
  const m = Math.max(1, Math.round((Date.now() - new Date(t).getTime()) / 6e4))
  return m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`
}
const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`

export default function PlazaStatus() {
  const academy = useAtomValue(academyState)
  const { data: students = [], isLoading: stLoading } = useAcademyStudents('middle')
  const [onlyIdle, setOnlyIdle] = useState(true)
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<{ title: string; to: string; text: string } | null>(null)
  const ids = students.map((s: any) => s.id)
  const since = useMemo(() => new Date(Date.now() - 7 * DAY), [])

  const { data, isLoading } = useQuery({
    queryKey: ['plaza-status', academy.academyId, ids.join(',')],
    enabled: ids.length > 0,
    queryFn: async () => {
      const [mem, les, mis, vis] = await Promise.all([
        supabase.from('middle_plaza_member').select('student_id, last_seen').in('student_id', ids),
        supabase.from('middle_plaza_lesson').select('student_id, grade, month, round, status, answer, done_at').in('student_id', ids),
        supabase.from('middle_plaza_mission').select('student_id, kind, body, updated_at').in('student_id', ids),
        supabase.from('middle_plaza_dept_visit').select('student_id, dept_name, visited_at').in('student_id', ids),
      ])
      return { mem: mem.data ?? [], les: les.data ?? [], mis: mis.data ?? [], vis: vis.data ?? [] }
    },
  })

  const rows = useMemo(() => {
    if (!data) return []
    const t0 = since.getTime()
    return students.map((s: any) => {
      const lastSeen = data.mem.find((m: any) => m.student_id === s.id)?.last_seen ?? null
      const les = data.les.filter((l: any) => l.student_id === s.id && (l.status ?? 'done') === 'done')
      const lesWeek = les.filter((l: any) => new Date(l.done_at).getTime() >= t0)
      const mis = data.mis.filter((m: any) => m.student_id === s.id)
      const misWeek = mis.filter((m: any) => new Date(m.updated_at).getTime() >= t0)
      const vis = data.vis.filter((v: any) => v.student_id === s.id)
      const visWeek = vis.filter((v: any) => new Date(v.visited_at).getTime() >= t0)
      const lastSentence = [...les].sort((a: any, b: any) => +new Date(b.done_at) - +new Date(a.done_at))[0]?.answer ?? ''
      const idle = lesWeek.length + misWeek.length + visWeek.length === 0
      return { s, lastSeen, les, lesWeek, misWeek, visWeek, lastSentence, idle }
    }).sort((a, b) => Number(b.idle) - Number(a.idle))
  }, [data, students, since])

  const shown = onlyIdle ? rows.filter(r => r.idle) : rows
  const idleCount = rows.filter(r => r.idle).length

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // 복사 안 되는 브라우저: 임시 입력칸으로 복사
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select()
      document.execCommand('copy'); t.remove()
    }
    setCopied(true); setTimeout(() => setCopied(false), 1600)
  }
  const open = (title: string, to: string, text: string) => { setCopied(false); setView({ title, to, text }) }
  const nudge = (name: string) =>
    `${name}아, 이번 주 진로 광장 수업 영상 열렸어! 10분이면 끝나 😊 영상 보고 확인 문제까지 해 오면 학원 수업 때 같이 보자 💚`
  const report = (r: (typeof rows)[number]) => {
    const name = r.s.name ?? '학생'
    const rounds = r.lesWeek.map((l: any) => `${l.month}개월 ${l.round}회차`).join(', ')
    const depts = [...new Set(r.visWeek.map((v: any) => v.dept_name))].slice(0, 5)
    const kinds = [...new Set(r.misWeek.map((m: any) => KIND[m.kind] ?? m.kind))]
    return [
      `[진로 광장 주간 리포트] ${name} 학생 (${md(since)}~${md(new Date())})`,
      `· 수업 영상 · 확인 문제: ${r.lesWeek.length ? `${r.lesWeek.length}회차 완료 (${rounds})` : '이번 주는 아직이에요'}`,
      `· AI 시대 역량 미션: ${r.misWeek.length ? `${r.misWeek.length}개 작성 (${kinds.join(' · ')})` : '아직이에요'}`,
      `· 둘러본 학과: ${depts.length ? `${r.visWeek.length}곳 (${depts.join(', ')}${r.visWeek.length > depts.length ? ' 등' : ''})` : '아직이에요'}`,
      r.lastSentence ? `· 오늘의 한 문장: "${r.lastSentence}"` : '',
      '',
      `집에서도 "이번 주 진로 광장에서 뭐 봤어?" 하고 한 번 물어봐 주세요. 큰 응원이 돼요. — ${academy.academyName ?? '학원'}`,
    ].filter(Boolean).join('\n')
  }

  const loading = stLoading || isLoading
  return (
    <div className="h-full overflow-y-auto px-8 py-7 box-border font-sans text-ink">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
        <div>
          <div className="text-[18px] font-extrabold tracking-tight">진로 광장 현황</div>
          <div className="text-[12px] text-ink-secondary mt-1">
            최근 7일({md(since)}~{md(new Date())}) 기준이에요. 학생 화면에는 이 숫자가 보이지 않아요.
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOnlyIdle(true)}
            className="h-9 px-4 rounded-lg text-[12.5px] font-bold border"
            style={{ background: onlyIdle ? '#10B981' : '#fff', color: onlyIdle ? '#fff' : '#6B7280', borderColor: onlyIdle ? '#10B981' : '#E5E7EB' }}
          >
            이번 주 안 한 학생 {idleCount}
          </button>
          <button
            onClick={() => setOnlyIdle(false)}
            className="h-9 px-4 rounded-lg text-[12.5px] font-bold border"
            style={{ background: !onlyIdle ? '#10B981' : '#fff', color: !onlyIdle ? '#fff' : '#6B7280', borderColor: !onlyIdle ? '#10B981' : '#E5E7EB' }}
          >
            전체 {rows.length}
          </button>
        </div>
      </div>

      <div className="rounded-xl px-4 py-2.5 text-[12px] font-medium mb-4" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
        독려할 때는 "왜 안 했어?" 대신 "영상 열렸어!"처럼 가볍게 보내 주세요. [독려 문구 복사]에 그렇게 넣어 뒀어요.
      </div>

      {loading && <div className="text-[13px] text-ink-secondary py-10 text-center">불러오는 중...</div>}
      {!loading && shown.length === 0 && (
        <div className="text-[13px] text-ink-secondary py-10 text-center">
          {onlyIdle ? '이번 주에 모두 진로 광장에 다녀왔어요 🎉' : '중등 학생이 없어요.'}
        </div>
      )}

      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        {shown.map(r => (
          <div key={r.s.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-line last:border-b-0 flex-wrap">
            <div className="min-w-[140px]">
              <div className="text-[14px] font-bold">
                {r.s.name ?? '이름 없음'} <span className="text-[11.5px] font-semibold text-ink-secondary">{r.s.grade ?? ''}</span>
              </div>
              <div className="text-[11.5px] mt-0.5" style={{ color: r.idle ? '#B45309' : '#6B7280' }}>
                {r.idle ? '이번 주 아직 · ' : ''}마지막 접속 {ago(r.lastSeen)}
              </div>
            </div>
            <div className="flex gap-2 flex-1 flex-wrap text-[12px]">
              <span className="px-2.5 py-1 rounded-full" style={{ background: '#F3F4F6' }}>회차 {r.lesWeek.length}</span>
              <span className="px-2.5 py-1 rounded-full" style={{ background: '#F3F4F6' }}>역량 미션 {r.misWeek.length}</span>
              <span className="px-2.5 py-1 rounded-full" style={{ background: '#F3F4F6' }}>학과 방문 {r.visWeek.length}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => open('독려 문구', `${r.s.name ?? ''} 학생에게`, nudge(r.s.name ?? ''))}
                className="h-8 px-3 rounded-lg text-[12px] font-bold border border-line bg-white"
              >
                독려 문구 보기
              </button>
              <button
                onClick={() => open('학부모 주간 리포트', `${r.s.name ?? ''} 학생 학부모님께`, report(r))}
                className="h-8 px-3 rounded-lg text-[12px] font-bold text-white"
                style={{ background: '#10B981' }}
              >
                학부모 리포트 보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {view && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.4)' }}
          onClick={e => { if (e.target === e.currentTarget) setView(null) }}
        >
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[16px] font-extrabold">{view.title}</div>
                <div className="text-[12px] text-ink-secondary mt-0.5">{view.to} · 아래 내용을 복사해서 카톡·문자로 보내 주세요</div>
              </div>
              <button onClick={() => setView(null)} className="text-[20px] leading-none text-ink-secondary px-1">×</button>
            </div>
            <div
              className="mt-4 rounded-xl p-4 text-[13.5px] leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
            >
              {view.text}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setView(null)} className="h-11 px-5 rounded-xl text-[13px] font-bold border border-line bg-white">닫기</button>
              <button
                onClick={() => copy(view.text)}
                className="h-11 flex-1 rounded-xl text-[13.5px] font-extrabold text-white"
                style={{ background: copied ? '#047857' : '#10B981' }}
              >
                {copied ? '✓ 복사됐어요 · 붙여 넣기만 하면 돼요' : '복사하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}