import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MiddleGradeKey } from '@/constants/middleRoadmap'

const THEME = {
  accent: '#10B981',
  accentDark: '#065F46',
  accentBg: '#ECFDF5',
  accentBorder: '#6EE7B7',
  accentShadow: 'rgba(16, 185, 129, 0.15)',
}

/** 관심 방향 5개 */
export const DIRS: Record<string, { label: string; color: string; pale: string; deep: string }> = {
  people: { label: '사람 · 소통', color: '#10B981', pale: '#D6F2E6', deep: '#065F46' },
  nature: { label: '자연 · 생명', color: '#10B981', pale: '#D6F2E6', deep: '#065F46' },
  tech: { label: '기술 · 도구', color: '#10B981', pale: '#D6F2E6', deep: '#065F46' },
  data: { label: '자료 · 논리', color: '#10B981', pale: '#D6F2E6', deep: '#065F46' },
  make: { label: '표현 · 창작', color: '#10B981', pale: '#D6F2E6', deep: '#065F46' },
}

/** 마스터 행동동사 → 관심 방향 */
export const VERB_DIR: Record<string, string> = {
  '설명했다': 'people', '도왔다': 'people', '물었다': 'people',
  '설득했다': 'people', '의견을 맞췄다': 'people',
  '관찰했다': 'nature', '원인을 찾았다': 'nature', '탐구했다': 'nature', '확인했다': 'nature',
  '만들었다': 'tech', '고쳤다': 'tech', '바꿔봤다': 'tech', '시험했다': 'tech',
  '비교했다': 'data', '정리했다': 'data', '분류했다': 'data', '세어봤다': 'data', '기록했다': 'data',
  '그렸다': 'make', '썼다': 'make', '기획했다': 'make', '발표했다': 'make',
}
export const ALL_VERBS = Object.keys(VERB_DIR)

/**
 * 학기마다 한 칸씩 열린다
 *  키워드 → 관심 분야 25 → 계열 19 → 학과군 145 → 직업 580
 */
const STAGES = [
  { title: '일하는 방식', grade: 1, sem: 1, when: '중1 1학기' },
  { title: '나의 키워드', grade: 1, sem: 2, when: '중1 2학기' },
  { title: '관심 분야', grade: 2, sem: 1, when: '중2 1학기' },
  { title: '계열', grade: 2, sem: 2, when: '중2 2학기' },
  { title: '학과군과 직업', grade: 3, sem: 1, when: '중3 1학기' },
] as const

/** 학년·학기 → 순서 번호 (초5·초6은 0) */
const gradeNum = (g: string) => (g.startsWith('중1') ? 1 : g.startsWith('중2') ? 2 : g.startsWith('중3') ? 3 : 0)
const stepOf = (grade: number, sem: number) => grade * 2 + (sem - 1)

/** 2~5단계 잠금 칸이 놓이는 자리 — 위부터 시계 방향 */
const STAGE_SLOT = ['', 'data', 'people', 'nature', 'tech']

/* ── 좌표 ──────────────────────────────────── */
const CX = 600
const CY = 470
const R_VERB = 120
const R_DIR = 225
const VIEW_W = 1220
const VIEW_H = 900

const ANGLE: Record<string, number> = {
  data: -90, people: -18, nature: 54, tech: 126, make: 198,
}
const ORDER = ['data', 'people', 'nature', 'tech', 'make'] as const

/** 방향별 학과군 박스 자리 */
const BOX: Record<string, { x: number; y: number; w: number; h: number }> = {
  data: { x: CX - 175, y: CY - 400, w: 350, h: 124 },
  people: { x: CX + 228, y: CY - 190, w: 300, h: 124 },
  nature: { x: CX + 140, y: CY + 240, w: 316, h: 112 },
  tech: { x: CX - 456, y: CY + 240, w: 300, h: 112 },
  make: { x: CX - 520, y: CY - 190, w: 300, h: 112 },
}

const pos = (deg: number, r: number) => ({
  x: CX + r * Math.cos((deg * Math.PI) / 180),
  y: CY + r * Math.sin((deg * Math.PI) / 180),
})

interface DeptRow {
  id: string
  field: string
  name: string
  directions: string[] | null
}
interface JobRow {
  id: string
  department_id: string
  name: string
  directions: string[] | null
  display_order: number
}

interface Props {
  gradeKey: MiddleGradeKey
  /** 지금 학기 (1~4개월 = 1, 5~8개월 = 2) */
  semester?: 1 | 2
  verbCounts: Record<string, number>
  dirCounts: Record<string, number>
  totalActs: number
}

export default function JinroMap({ gradeKey, semester = 1, verbCounts, dirCounts, totalActs }: Props) {

  const nowStep = stepOf(gradeNum(gradeKey), semester)
  const isOpen = (i: number) => nowStep >= stepOf(STAGES[i].grade, STAGES[i].sem)
  const openCount = STAGES.filter((_, i) => isOpen(i)).length
  const nextIdx = STAGES.findIndex((_, i) => !isOpen(i))

  /** 학과군·직업은 마지막 단계 */
  const openDept = isOpen(STAGES.length - 1)

  const myDirs = useMemo(
    () =>
      Object.entries(dirCounts)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k),
    [dirCounts],
  )
  const top2 = myDirs.slice(0, 2)
  const maxDir = Math.max(1, ...Object.values(dirCounts))

  /** 방향마다 가장 많이 한 동사 2개 */
  const verbsByDir = useMemo(() => {
    const m: Record<string, { verb: string; n: number }[]> = {}
    for (const [verb, n] of Object.entries(verbCounts)) {
      if (!n) continue
      const d = VERB_DIR[verb]
      if (!d) continue
      ;(m[d] ??= []).push({ verb, n })
    }
    for (const d of Object.keys(m)) {
      m[d].sort((a, b) => b.n - a.n)
      m[d] = m[d].slice(0, 2)
    }
    return m
  }, [verbCounts])

  const { data: depts = [] } = useQuery({
    queryKey: ['career-depts'],
    enabled: openDept,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<DeptRow[]> => {
      const { data, error } = await supabase
        .from('middle_career_department')
        .select('id, field, name, directions')
        .eq('is_active', true)
      if (error) throw error
      return (data ?? []) as DeptRow[]
    },
  })

  const { data: jobs = [] } = useQuery({
    queryKey: ['career-jobs'],
    enabled: openDept,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<JobRow[]> => {
      const { data, error } = await supabase
        .from('middle_career_job')
        .select('id, department_id, name, directions, display_order')
        .eq('is_active', true)
      if (error) throw error
      return (data ?? []) as JobRow[]
    },
  })

  /** 방향마다 가장 잘 맞는 학과군 하나씩 → 상위 3개 */
  const boxes = useMemo(() => {
    if (!openDept || !depts.length || !top2.length) return []

    const score = (dirs: string[] | null) => {
      if (!dirs?.length) return 0
      return dirs.reduce((acc, d, i) => {
        const rank = top2.indexOf(d)
        if (rank === -1) return acc
        return acc + (rank === 0 ? 3 : 2) * (i === 0 ? 1.5 : 1)
      }, 0)
    }

    const jobsBy = new Map<string, JobRow[]>()
    for (const j of jobs) {
      const a = jobsBy.get(j.department_id) ?? []
      a.push(j)
      jobsBy.set(j.department_id, a)
    }

    const best = new Map<string, { dept: DeptRow; s: number }>()
    for (const d of depts) {
      const s = score(d.directions)
      if (s <= 0) continue
      const anchor = (d.directions ?? []).find(x => DIRS[x]) ?? 'data'
      const cur = best.get(anchor)
      if (!cur || s > cur.s) best.set(anchor, { dept: d, s })
    }

    return [...best.entries()]
      .sort((a, b) => b[1].s - a[1].s)
      .slice(0, 3)
      .map(([dir, { dept }], i) => ({
        dir,
        rank: i + 1,
        dept,
        jobs: (jobsBy.get(dept.id) ?? [])
          .slice()
          .sort((a, b) => {
            const ra = a.directions?.[0] ? top2.indexOf(a.directions[0]) : -1
            const rb = b.directions?.[0] ? top2.indexOf(b.directions[0]) : -1
            return (ra === -1 ? 9 : ra) - (rb === -1 ? 9 : rb) || a.display_order - b.display_order
          })
          .slice(0, 3),
      }))
  }, [depts, jobs, top2, openDept])

  const boxByDir = useMemo(() => {
    const m: Record<string, (typeof boxes)[number]> = {}
    for (const b of boxes) m[b.dir] = b
    return m
  }, [boxes])

  return (
    <div className="bg-white border border-line rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div>
          <div className="text-[16px] font-extrabold text-ink tracking-tight">나의 진로 지도</div>
          <div className="text-[11.5px] text-ink-secondary mt-0.5">
            {totalActs > 0
              ? `4년 · 활동 ${totalActs}건이 여기까지 자랐습니다`
              : '워크북을 하면 여기에 내 행동이 하나씩 쌓여요'}
          </div>
        </div>
        <span className="text-[11px] font-bold text-ink-muted flex-shrink-0 text-right">
          {gradeKey} {semester}학기 · {openCount}개 열림
          {STAGES.length - openCount > 0 && (
            <span className="block font-semibold" style={{ color: '#B6BCC4' }}>
              학기마다 한 칸씩 열려요
            </span>
          )}
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          style={{ width: '100%', minWidth: 760, height: 'auto', display: 'block' }}
        >
          {/* ── 1. 중심 → 방향 선 ───────────────── */}
          {ORDER.map(d => {
            const p = pos(ANGLE[d], R_DIR - 26)
            const n = dirCounts[d] ?? 0
            const on = n > 0
            const w = on ? 3 + (n / maxDir) * 6 : 1.5
            return (
              <line
                key={'l' + d}
                x1={CX} y1={CY} x2={p.x} y2={p.y}
                stroke={on ? THEME.accent : '#D8DEE6'}
                strokeWidth={w}
                strokeLinecap="round"
                strokeDasharray={on ? undefined : '5 6'}
                opacity={on ? (myDirs.indexOf(d) === 0 ? 1 : 0.65) : 1}
              />
            )
          })}

          {/* ── 2. 방향 → 학과군 박스 선 ────────── */}
          {ORDER.map(d => {
            const b = boxByDir[d]
            if (!openDept) return null
            if (!b) return null
            const p = pos(ANGLE[d], R_DIR)
            const box = BOX[d]
            const bx = box.x + box.w / 2
            const by = box.y + box.h / 2
            return (
              <line
                key={'bl' + d}
                x1={p.x} y1={p.y} x2={bx} y2={by}
                stroke={THEME.accent}
                strokeWidth={b.rank === 1 ? 7 : 5}
                strokeLinecap="round"
                opacity={b.rank === 3 ? 0.35 : 0.85}
              />
            )
          })}

          {/* ── 3. 행동동사 ────────────────────── */}
          {ORDER.map(d => {
            const list = verbsByDir[d] ?? []
            const on = (dirCounts[d] ?? 0) > 0
            return list.map((v, i) => {
              const off = list.length === 1 ? 0 : i === 0 ? -15 : 15
              const p = pos(ANGLE[d] + off, R_VERB)
              return (
                <g key={'v' + v.verb}>
                  <circle
                    cx={p.x} cy={p.y} r={26}
                    fill="#fff"
                    stroke={on ? THEME.accentBorder : '#E2E8F0'}
                    strokeWidth={1.5}
                    strokeDasharray={on ? undefined : '4 4'}
                  />
                  <text
                    x={p.x} y={p.y + 4}
                    fontSize={12} textAnchor="middle"
                    fill={on ? '#475569' : '#B6BCC4'} fontWeight={600}
                  >
                    {v.verb.replace(/했다$|다$/, '')}
                  </text>
                </g>
              )
            })
          })}

          {/* ── 4. 관심 방향 ───────────────────── */}
          {ORDER.map(d => {
            const p = pos(ANGLE[d], R_DIR)
            const n = dirCounts[d] ?? 0
            const on = n > 0
            const strong = myDirs.indexOf(d) === 0
            const mid = myDirs.indexOf(d) === 1
            const w = 178
            const h = 58
            return (
              <g key={'d' + d}>
                <rect
                  x={p.x - w / 2} y={p.y - h / 2}
                  width={w} height={h} rx={16}
                  fill={strong ? THEME.accentDark : mid ? '#9FD6C6' : on ? '#D6F2E6' : '#FAFBFC'}
                  stroke={on ? 'none' : '#E2E8F0'}
                  strokeWidth={1}
                  strokeDasharray={on ? undefined : '5 4'}
                />
                <text
                  x={p.x} y={p.y - 3}
                  fontSize={14} textAnchor="middle" fontWeight={800}
                  fill={strong ? '#fff' : mid ? '#04342C' : on ? THEME.accentDark : '#B6BCC4'}
                >
                  {DIRS[d].label}
                </text>
                <text
                  x={p.x} y={p.y + 17}
                  fontSize={12} textAnchor="middle" fontWeight={700}
                  fill={strong ? '#CFEAE1' : mid ? '#0F6E56' : on ? '#4B7F6E' : '#C4C9D0'}
                >
                  {n}회
                </text>
              </g>
            )
          })}

          {/* ── 5. 학과군 + 직업 박스 ──────────── */}
          {ORDER.map(d => {
            const box = BOX[d]
            const b = boxByDir[d]

            /* 중3 1학기 전 — 2~5단계 칸을 가지 끝 자리에 하나씩 */
            if (!openDept) {
              const i = STAGE_SLOT.indexOf(d)
              if (i < 1) return null
              const st = STAGES[i]
              const open = isOpen(i)
              const next = i === nextIdx
              return (
                <g key={'stage' + d}>
                  <rect
                    x={box.x} y={box.y} width={box.w} height={86} rx={18}
                    fill={open ? THEME.accentBg : '#FAFBFC'}
                    stroke={open ? THEME.accentBorder : next ? THEME.accent : '#D1D5DB'}
                    strokeWidth={next ? 2 : 1.5}
                    strokeDasharray={open ? undefined : '7 5'}
                  />
                  <text
                    x={box.x + box.w / 2} y={box.y + 36} fontSize={13} fontWeight={700}
                    fill={open || next ? THEME.accentDark : '#B6BCC4'} textAnchor="middle"
                  >
                    {open ? `✓ ${st.title}` : `🔒 ${st.title}`}
                  </text>
                  <text
                    x={box.x + box.w / 2} y={box.y + 58} fontSize={11.5} fontWeight={600}
                    fill={open ? '#4B7F6E' : next ? THEME.accent : '#C4C9D0'} textAnchor="middle"
                  >
                    {open ? '열렸어요' : next ? `다음 · ${st.when}에 열려요` : `${st.when}에 열려요`}
                  </text>
                </g>
              )
            }

            if (!b) return null
            const top = b.rank === 1
            const third = b.rank === 3
            const jobNames = b.jobs.map(j => j.name)
            const line1 = jobNames.slice(0, 2).join(' · ')
            const line2 = jobNames.slice(2).join(' · ')
            const verbs = (verbsByDir[d] ?? []).map(v => v.verb.replace(/했다$|다$/, '')).join(' · ')

            return (
              <g key={'box' + d}>
                <rect
                  x={box.x} y={box.y} width={box.w} height={box.h} rx={18}
                  fill="#fff"
                  stroke={top ? THEME.accentDark : third ? '#E5E7EB' : THEME.accent}
                  strokeWidth={top ? 2.5 : 1.5}
                />
                <text
                  x={box.x + 22} y={box.y + 34}
                  fontSize={14.5} fontWeight={800}
                  fill={third ? '#6B7280' : '#1a1a1a'}
                >
                  {b.rank}순위 · {b.dept.name}
                </text>
                <text x={box.x + 22} y={box.y + 60} fontSize={12.5} fontWeight={600} fill={third ? '#9CA3AF' : '#475569'}>
                  {line1}
                </text>
                {line2 && (
                  <text x={box.x + 22} y={box.y + 80} fontSize={12.5} fontWeight={600} fill={third ? '#9CA3AF' : '#475569'}>
                    {line2}
                  </text>
                )}
                <text
                  x={box.x + 22} y={box.y + (line2 ? 102 : 82)}
                  fontSize={11} fontWeight={700}
                  fill={third ? '#B6BCC4' : THEME.accentDark}
                >
                  {verbs ? `${verbs}에서 자람` : b.dept.field}
                  {third ? ' · 근거 적음' : ''}
                </text>
              </g>
            )
          })}

          {/* ── 6. 중심 ────────────────────────── */}
          <circle cx={CX} cy={CY} r={52} fill={THEME.accent} />
          <text x={CX} y={CY - 4} fontSize={19} textAnchor="middle" fill="#fff" fontWeight={800}>나</text>
          <text x={CX} y={CY + 18} fontSize={12} textAnchor="middle" fill="#D1FAE5" fontWeight={700}>
            활동 {totalActs}
          </text>

          {/* ── 7. 안내 ────────────────────────── */}
          <text x={CX - 440} y={CY + 372} fontSize={11.5} fontWeight={600} fill="#B6BCC4">
            가지가 얇은 쪽은
          </text>
          <text x={CX - 440} y={CY + 390} fontSize={11.5} fontWeight={600} fill="#B6BCC4">
            아직 덜 해본 방향이에요
          </text>
        </svg>
      </div>

      {/* 아래 요약 */}
      <div
        className="mt-1 pt-4 flex items-center gap-2 flex-wrap"
        style={{ borderTop: '1px dashed #E5E7EB' }}
      >
        <span className="text-[11px] font-bold text-ink-muted mr-1">지금까지 쌓인 방향</span>
        {ORDER.map(d => {
          const n = dirCounts[d] ?? 0
          const rank = myDirs.indexOf(d)
          return (
            <span
              key={d}
              className="text-[11.5px] font-bold px-2.5 py-1 rounded-lg"
              style={{
                background: rank === 0 ? THEME.accent : rank === 1 ? '#9FD6C6' : n > 0 ? '#D6F2E6' : '#F8FAFC',
                color: rank === 0 ? '#fff' : n > 0 ? '#04342C' : '#B6BCC4',
                border: n > 0 ? 'none' : '1px solid #E5E7EB',
              }}
            >
              {DIRS[d].label} {n}회
            </span>
          )
        })}
      </div>
    </div>
  )
}