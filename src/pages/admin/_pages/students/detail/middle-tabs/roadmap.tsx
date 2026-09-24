import { useState, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  MIDDLE_ROADMAP,
  toMiddleGradeKey,
  parseMiddleMonth,
  JINRO_LAST_MONTHS,
  PREP_TRACKS,
  type MiddleGradeKey,
  type Mission,
  type RoadmapMonth,
} from '@/constants/middleRoadmap'
import {
  useMiddleRoadmapProgress,
  useToggleMiddleMissionComplete,
  useUpdateMiddleMissionMemo,
} from '@/pages/admin/_hooks/middle/useMiddleRoadmap'

/* ── 팔레트 — 학생 진로 로드맵과 같은 톤 ─────────────── */
const C = {
  ink: '#1F2937',
  muted: '#6B7280',
  faint: '#9CA3AF',
  track: '#E5E7EB',
  soft: '#F3F4F6',
  panel: '#F8FAFC',
  green: '#10B981',
  greenDeep: '#065F46',
  greenBg: '#ECFDF5',
  greenLine: '#A7F3D0',
  amber: '#F59E0B',
}

/* ── 길 좌표 (학생 화면과 동일) ───────────────────── */
const LEFT = 175
const RIGHT = 925
const TOP = 66
const ROW_H = 112
const TURN = 58
const STEP = (RIGHT - LEFT) / 7
const LINE_W = 8

interface Props {
  student: any
  viewGrade?: MiddleGradeKey
}

interface Lane {
  key: MiddleGradeKey
  label: string
  sub: string
  months: RoadmapMonth[]
  locked: boolean
}

/* 워크북 양식 — mission_workbook.blocks (Section[]) */
interface WbField { id: string; label?: string; type?: string }
interface WbSection { id: string; title: string; fields?: WbField[] }

interface WbAnswer {
  answers: Record<string, unknown>
  submitted_at: string | null
  updated_at: string
}

/** 답안 키(섹션.필드[.번호...])를 모아서 읽을 수 있는 한 줄로 */
function readValue(answers: Record<string, unknown>, base: string): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(answers)) {
    if (k !== base && !k.startsWith(`${base}.`)) continue
    if (v === undefined || v === null || v === '' || v === false) continue
    if (Array.isArray(v)) { if (v.length) parts.push(v.join(', ')); continue }
    if (v === true) { parts.push('✓'); continue }
    parts.push(String(v).trim())
  }
  return parts.filter(Boolean).join(' / ')
}

function Dot({
  on = false, size = 22, children,
}: { on?: boolean; size?: number; children?: ReactNode }) {
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
      style={{
        width: size,
        height: size,
        background: on ? C.green : '#fff',
        border: `2px solid ${on ? C.green : C.track}`,
        color: on ? '#fff' : C.faint,
      }}
    >
      {children}
    </span>
  )
}

/** 워크북 답안 — 활동 하나씩 옆으로 넘겨 보기 */
function WbAnswerSlider({
  sections, answers,
}: {
  sections: WbSection[]
  answers: Record<string, unknown>
}) {
  /* 적을 칸이 있는 활동만 */
  const list = sections
    .map(sec => ({ ...sec, fields: (sec.fields ?? []).filter(fl => fl.type !== 'info') }))
    .filter(sec => sec.fields.length > 0)

  const [i, setI] = useState(0)
  if (!list.length) return null
  const idx = Math.min(i, list.length - 1)
  const sec = list[idx]

  const filledOf = (s: (typeof list)[number]) =>
    s.fields.filter(fl => readValue(answers, `${s.id}.${fl.id}`)).length

  return (
    <div>
      {/* 활동 번호 길 */}
      <div className="relative overflow-x-auto pb-1">
        <div className="relative flex items-center" style={{ minWidth: list.length * 34 }}>
          <span
            aria-hidden
            className="absolute rounded-full"
            style={{ left: 13, right: 13, height: 3, background: C.track }}
          />
          <div className="relative flex w-full justify-between gap-1.5">
            {list.map((s, k) => {
              const now = k === idx
              const filled = filledOf(s)
              const full = filled === s.fields.length
              return (
                <button
                  key={s.id}
                  onClick={() => setI(k)}
                  title={s.title}
                  aria-current={now ? 'step' : undefined}
                  className="flex flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    width: now ? 28 : 24,
                    height: now ? 28 : 24,
                    background: now ? '#fff' : full ? C.green : filled ? C.greenBg : '#fff',
                    border: `${now ? 3 : 2}px solid ${now || full ? C.green : filled ? C.greenLine : C.track}`,
                    color: now ? C.greenDeep : full ? '#fff' : filled ? C.greenDeep : C.faint,
                  }}
                >
                  {k + 1}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 지금 활동 */}
      <div className="mt-3.5 flex items-baseline justify-between gap-2">
        <p className="text-[13.5px] font-bold" style={{ color: C.ink }}>{sec.title}</p>
        <span className="flex-shrink-0 text-[11px]" style={{ color: C.faint }}>
          {filledOf(sec)} / {sec.fields.length}칸 작성
        </span>
      </div>
      <div className="mt-2 grid gap-2" style={{ minHeight: 96 }}>
        {sec.fields.map(fl => {
          const v = readValue(answers, `${sec.id}.${fl.id}`)
          return (
            <div key={fl.id}>
              {fl.label && (
                <p className="text-[11.5px] font-semibold" style={{ color: C.faint }}>{fl.label}</p>
              )}
              {v
                ? <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: C.ink }}>{v}</p>
                : <p className="text-[12.5px]" style={{ color: '#C4C9D0' }}>아직 안 썼어요</p>}
            </div>
          )
        })}
      </div>

      {/* 넘기기 */}
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => setI(idx - 1)}
          disabled={idx === 0}
          className="h-8 px-3.5 rounded-full text-[12px] font-bold disabled:opacity-30"
          style={{ background: '#fff', color: C.muted, border: `1px solid ${C.track}` }}
        >
          ← 이전 활동
        </button>
        <span className="text-[11.5px] font-semibold" style={{ color: C.faint }}>
          {idx + 1} / {list.length}
        </span>
        <button
          onClick={() => setI(idx + 1)}
          disabled={idx === list.length - 1}
          className="h-8 px-3.5 rounded-full text-[12px] font-bold disabled:opacity-30"
          style={{ background: '#fff', color: C.greenDeep, border: `1px solid ${C.greenLine}` }}
        >
          다음 활동 →
        </button>
      </div>
    </div>
  )
}

export default function MiddleRoadmapTab({ student, viewGrade }: Props) {
  const studentId: string = student.id
  const studentGrade: MiddleGradeKey = toMiddleGradeKey(student?.grade, student?.track)
  const myGrade: MiddleGradeKey = viewGrade || studentGrade
  const myIsM3 = myGrade.startsWith('중3')

  const [sel, setSel] = useState<{ lane: MiddleGradeKey; idx: number } | null>(null)
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({})
  const [openWb, setOpenWb] = useState<string | null>(null)

  // ── 이 학생의 워크북 답안 전체 (한 번에) ──
  const { data: wbAnswers } = useQuery({
    queryKey: ['middle-workbook-answers', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_workbook_answer')
        .select('mission_key, answers, submitted_at, updated_at')
        .eq('student_id', studentId)
      if (error) throw error
      const map = new Map<string, WbAnswer>()
      for (const r of data ?? []) map.set(r.mission_key, r as WbAnswer)
      return map
    },
  })

  // ── 워크북 양식 (질문 라벨용) ──
  const { data: wbForms } = useQuery({
    queryKey: ['middle-workbook-forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_workbook')
        .select('mission_key, title, blocks')
        .eq('level', 'middle')
      if (error) throw error
      const map = new Map<string, { title: string; blocks: WbSection[] | null }>()
      for (const r of data ?? []) map.set(r.mission_key, r as any)
      return map
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: progressMap, isLoading } = useMiddleRoadmapProgress(studentId)
  const toggleMutation = useToggleMiddleMissionComplete(studentId)
  const memoMutation = useUpdateMiddleMissionMemo(studentId)

  const curYear = new Date().getFullYear()
  const roadmap = MIDDLE_ROADMAP[myGrade] ?? []

  const isDone = (key: string) => progressMap?.get(key)?.is_completed === true
  const getMemo = (key: string) =>
    memoDrafts[key] ?? progressMap?.get(key)?.teacher_memo ?? ''
  const hasMemo = (key: string) => !!progressMap?.get(key)?.teacher_memo?.trim()
  const isSubmitted = (key: string) => !!wbAnswers?.get(key)?.submitted_at

  /** 아직 안 끝난 첫 달 = 학생 위치 */
  const nowIdx = useMemo(() => {
    if (!roadmap.length) return 0
    const i = roadmap.findIndex(m => m.missions.some(ms => !isDone(ms.key)))
    return i === -1 ? roadmap.length - 1 : i
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap, progressMap])

  const { totalMissions, doneMissions, waiting } = useMemo(() => {
    let total = 0, done = 0, wait = 0
    for (const m of roadmap) for (const ms of m.missions) {
      total++
      if (isDone(ms.key)) done++
      else if (isSubmitted(ms.key)) wait++
    }
    return { totalMissions: total, doneMissions: done, waiting: wait }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap, progressMap, wbAnswers])

  /** 길에 그릴 구간 — 학생 화면과 같은 순서 */
  const m3Key: MiddleGradeKey = myIsM3 ? myGrade : '중3일반'
  const lanes: Lane[] = [
    { key: '초5', label: '초5', sub: '커리큘럼 준비 중', months: MIDDLE_ROADMAP['초5'] ?? [], locked: true },
    { key: '초6', label: '초6', sub: '커리큘럼 준비 중', months: MIDDLE_ROADMAP['초6'] ?? [], locked: true },
    { key: '중1', label: '중1 · 발견', sub: '나를 알아가기', months: MIDDLE_ROADMAP['중1'], locked: false },
    { key: '중2', label: '중2 · 탐색', sub: '분야를 직접 해보기', months: MIDDLE_ROADMAP['중2'], locked: false },
    {
      key: m3Key,
      label: '중3 1학기 · 선택',
      sub: '고교와 진로 정하기',
      months: (MIDDLE_ROADMAP[m3Key] ?? []).slice(0, JINRO_LAST_MONTHS),
      locked: false,
    },
  ]

  const SVG_H = TOP + (lanes.length - 1) * ROW_H + 96
  const laneY = (i: number) => TOP + i * ROW_H
  const isLtr = (i: number) => i % 2 === 0
  const stationX = (i: number, k: number) => (isLtr(i) ? LEFT + k * STEP : RIGHT - k * STEP)

  const selLane = sel ? lanes.find(l => l.key === sel.lane) ?? null : null
  const selected = sel && selLane ? selLane.months[sel.idx] ?? null : null
  /** 학생 학년 구간만 체크·메모 가능, 다른 학년은 미리보기 */
  const canEdit = !!sel && sel.lane === studentGrade

  useEffect(() => {
    if (!sel) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel])

  const openMonth = (lane: Lane, idx: number) => {
    if (lane.locked) return
    setOpenWb(null)
    setSel({ lane: lane.key, idx })
  }

  const scLabel = (type: Mission['type']) =>
    type === 'inAnswer' ? '비커스' : type === 'tab' ? '바로가기' : '선생님'

  const handleToggle = (mission: Mission, monthStr: string) => {
    if (!canEdit) return
    toggleMutation.mutate({
      missionKey: mission.key,
      month: parseMiddleMonth(monthStr),
      year: curYear,
      missionTitle: mission.t,
      isCompleted: !isDone(mission.key),
    })
  }

  const handleSaveMemo = (mission: Mission, monthStr: string) => {
    if (!canEdit) return
    const memo = memoDrafts[mission.key]
    if (memo === undefined) return
    memoMutation.mutate({
      missionKey: mission.key,
      month: parseMiddleMonth(monthStr),
      year: curYear,
      missionTitle: mission.t,
      memo,
    })
    setMemoDrafts(prev => {
      const next = { ...prev }
      delete next[mission.key]
      return next
    })
  }

  return (
    <div>
      {/* ══ 진로 로드맵 ═══════════════════════════ */}
      <div className="bg-white border border-line rounded-2xl p-5 mb-4">

        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
          <div>
            <div className="text-[14px] font-bold tracking-tight" style={{ color: C.ink }}>진로 로드맵</div>
            <div className="text-[11.5px] mt-0.5" style={{ color: C.muted }}>
              정거장을 누르면 그 달 미션을 체크하고 메모를 남길 수 있어요. 학생 화면과 같은 길이에요.
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[12px]" style={{ color: C.muted }}>
              완료 <b style={{ color: C.greenDeep }}>{doneMissions}</b> / {totalMissions}
            </span>
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: C.muted }}>
              <span className="rounded-full" style={{ width: 8, height: 8, background: C.amber }} />
              확인 대기 <b style={{ color: waiting ? '#92400E' : C.faint }}>{waiting}</b>
            </span>
            {roadmap.length > 0 && (
              <button
                onClick={() => {
                  const lane = lanes.find(l => l.key === myGrade)
                  if (lane) openMonth(lane, nowIdx)
                }}
                className="h-9 px-4 rounded-full text-[12px] font-bold text-white"
                style={{ background: C.green }}
              >
                이번 달 미션 열기
              </button>
            )}
          </div>
        </div>

        {/* ── 길 ─────────────────────────────── */}
        <div className="overflow-x-auto pb-1">
          <svg
            viewBox={`0 0 1080 ${SVG_H}`}
            style={{ width: '100%', minWidth: 820, height: 'auto', display: 'block' }}
          >
            {/* 1. 바닥 선 */}
            {lanes.map((lane, i) => {
              const y = laneY(i)
              const ltr = isLtr(i)
              const empty = lane.months.length === 0
              const endX = empty ? (ltr ? RIGHT : LEFT) : stationX(i, lane.months.length - 1)
              const startX = ltr ? LEFT : RIGHT
              return (
                <g key={'base' + i}>
                  <line
                    x1={startX} y1={y} x2={endX} y2={y}
                    stroke={C.track} strokeWidth={LINE_W} strokeLinecap="round"
                    strokeDasharray={empty ? '2 14' : undefined}
                  />
                  {i === lanes.length - 1 && !empty && (
                    <line
                      x1={endX} y1={y} x2={endX + STEP * 1.25} y2={y}
                      stroke={C.track} strokeWidth={LINE_W} strokeLinecap="round" strokeDasharray="2 14"
                    />
                  )}
                </g>
              )
            })}

            {/* 2. 구간을 잇는 곡선 */}
            {lanes.slice(0, -1).map((_, i) => {
              const y = laneY(i)
              const y2 = laneY(i + 1)
              const ltr = isLtr(i)
              const x = ltr ? RIGHT : LEFT
              const c = ltr ? x + TURN : x - TURN
              return (
                <path
                  key={'turn' + i}
                  d={`M ${x} ${y} C ${c} ${y}, ${c} ${y2}, ${x} ${y2}`}
                  fill="none" stroke={C.track} strokeWidth={LINE_W} strokeLinecap="round"
                />
              )
            })}

            {/* 3. 지나온 길 (학생 학년) */}
            {lanes.map((lane, i) => {
              if (lane.locked || lane.key !== myGrade || !lane.months.length) return null
              const y = laneY(i)
              const startX = isLtr(i) ? LEFT : RIGHT
              return (
                <line
                  key={'done' + i}
                  x1={startX} y1={y} x2={stationX(i, nowIdx)} y2={y}
                  stroke={C.green} strokeWidth={LINE_W} strokeLinecap="round"
                />
              )
            })}

            {/* 4. 구간 라벨 */}
            {lanes.map((lane, i) => {
              const y = laneY(i)
              const ltr = isLtr(i)
              const mine = !lane.locked && lane.key === myGrade
              const lx = ltr ? LEFT - 40 : RIGHT + 40
              const anchor = ltr ? 'end' : 'start'
              const color = mine ? C.greenDeep : lane.locked ? '#C4C9D0' : C.faint
              return (
                <g key={'label' + i}>
                  <text x={lx} y={y + 2} fontSize={13} fontWeight={800} fill={color} textAnchor={anchor}>
                    {lane.label}
                  </text>
                  <text
                    x={lx} y={y + 19} fontSize={10.5} fontWeight={600}
                    fill={lane.locked ? '#C4C9D0' : '#B6BCC4'} textAnchor={anchor}
                  >
                    {mine ? '학생 위치' : lane.sub}
                  </text>
                </g>
              )
            })}

            {/* 5. 구간 결과물 */}
            {lanes.map((lane, i) => {
              if (!lane.months.length) return null
              const out = lane.months[lane.months.length - 1]?.output
              if (!out) return null
              const mine = !lane.locked && lane.key === myGrade
              return (
                <text
                  key={'out' + i}
                  x={stationX(i, lane.months.length - 1)} y={laneY(i) - 28}
                  fontSize={11} fontWeight={700} textAnchor="middle"
                  fill={mine ? C.greenDeep : '#C4C9D0'}
                >
                  {out}
                </text>
              )
            })}

            {/* 6. 준비 중 구간 */}
            {lanes.map((lane, i) => {
              if (lane.months.length) return null
              return (
                <text
                  key={'empty' + i}
                  x={(LEFT + RIGHT) / 2} y={laneY(i) - 18}
                  fontSize={11.5} fontWeight={600} fill="#C4C9D0" textAnchor="middle"
                >
                  커리큘럼이 준비되면 정거장이 생겨요
                </text>
              )
            })}

            {/* 7. 정거장 */}
            {lanes.map((lane, i) =>
              lane.months.map((mo, k) => {
                const y = laneY(i)
                const x = stationX(i, k)
                const mine = !lane.locked && lane.key === myGrade
                const done = mo.missions.filter(ms => isDone(ms.key)).length
                const allDone = mine && done === mo.missions.length
                const isNow = mine && k === nowIdx
                const isSel = sel?.lane === lane.key && sel.idx === k
                const r = isNow || isSel ? 19 : 15

                /* 원장 전용 표시 */
                const wait = mine ? mo.missions.filter(ms => !isDone(ms.key) && isSubmitted(ms.key)).length : 0
                const memo = mine && mo.missions.some(ms => hasMemo(ms.key))

                const fill = allDone ? C.green : isNow || isSel ? '#fff' : mine ? C.soft : '#F9FAFB'
                const txt = allDone ? '#fff' : isNow || isSel ? C.greenDeep : mine ? C.muted : '#CBD5E1'
                const stroke = isNow || allDone || isSel ? C.green : C.track

                return (
                  <g
                    key={lane.key + k}
                    onClick={() => openMonth(lane, k)}
                    style={{ cursor: lane.locked ? 'default' : 'pointer' }}
                  >
                    <title>{`${mo.m} · ${mo.theme}${wait ? ` · 확인 대기 ${wait}` : ''}`}</title>
                    <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={isNow || isSel ? 3.5 : 2} />
                    <text x={x} y={y + 4} fontSize={11.5} fontWeight={800} fill={txt} textAnchor="middle">
                      {allDone ? '✓' : k + 1}
                    </text>

                    {/* 제출됐는데 아직 체크 안 한 워크북 수 */}
                    {wait > 0 && (
                      <g>
                        <circle cx={x + r - 1} cy={y - r + 1} r={8} fill={C.amber} stroke="#fff" strokeWidth={2} />
                        <text x={x + r - 1} y={y - r + 4.5} fontSize={9.5} fontWeight={800} fill="#fff" textAnchor="middle">
                          {wait}
                        </text>
                      </g>
                    )}

                    {/* 메모를 남긴 달 */}
                    {memo && (
                      <circle cx={x} cy={y + r + 9} r={3} fill={C.green} />
                    )}

                    {/* 몇 개 완료 */}
                    {mine && !allDone && done > 0 && (
                      <text x={x} y={y + r + (memo ? 24 : 16)} fontSize={9.5} fontWeight={700} fill={C.faint} textAnchor="middle">
                        {done}/{mo.missions.length}
                      </text>
                    )}
                  </g>
                )
              }),
            )}

            {/* 8. 예비고1 → 고등 */}
            {(() => {
              const i = lanes.length - 1
              const lane = lanes[i]
              if (!lane.months.length) return null
              const y = laneY(i)
              const endX = stationX(i, lane.months.length - 1)
              const starX = endX + STEP * 1.25
              const boxX = starX + 86
              return (
                <g>
                  <circle cx={starX} cy={y} r={15} fill="#F9FAFB" stroke={C.track} strokeWidth={2} />
                  <text x={starX} y={y + 5} fontSize={13} fill="#CBD5E1" textAnchor="middle">★</text>
                  <text x={starX} y={y - 30} fontSize={11.5} fontWeight={700} fill={C.faint} textAnchor="middle">
                    예비고1 · 설계
                  </text>
                  <text x={starX} y={y + 36} fontSize={10} fontWeight={600} fill="#C4C9D0" textAnchor="middle">
                    학과군 3개와 직업이
                  </text>
                  <text x={starX} y={y + 50} fontSize={10} fontWeight={600} fill="#C4C9D0" textAnchor="middle">
                    정해져 넘어가요
                  </text>
                  <line
                    x1={starX + 19} y1={y} x2={boxX - 4} y2={y}
                    stroke={C.track} strokeWidth={LINE_W} strokeLinecap="round" strokeDasharray="2 14"
                  />
                  <rect x={boxX} y={y - 26} width={186} height={52} rx={14} fill="#EFF6FF" stroke="#BFDBFE" strokeWidth={1.5} />
                  <text x={boxX + 93} y={y - 4} fontSize={12.5} fontWeight={800} fill="#1E3A8A" textAnchor="middle">
                    고등 입시 로드맵
                  </text>
                  <text x={boxX + 93} y={y + 14} fontSize={10.5} fontWeight={600} fill="#3B82F6" textAnchor="middle">
                    고1 · 고2 · 고3
                  </text>
                </g>
              )
            })()}
          </svg>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 flex-wrap text-[11px] mt-1" style={{ color: C.faint }}>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 12, height: 12, border: `3px solid ${C.green}` }} />학생 위치
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 12, height: 12, background: C.green }} />한 달 완료
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 12, height: 12, background: C.amber }} />제출됐는데 체크 전
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 6, height: 6, background: C.green }} />메모 있음
          </span>
        </div>

        {isLoading && (
          <div className="mt-3 pt-4 text-center text-[12px]" style={{ borderTop: `1px dashed ${C.track}`, color: C.muted }}>
            진행 상황을 불러오는 중...
          </div>
        )}

        {/* ── 갈림길 ──────────────────────────── */}
        <div className="mt-4 pt-4" style={{ borderTop: `1px dashed ${C.track}` }}>
          <div className="text-[11.5px] font-bold mb-2" style={{ color: C.greenDeep }}>
            길 끝에서 진로 결과가 나오고, 중3 2학기부터 갈라져요
          </div>
          <div className="flex gap-2.5 flex-wrap">
            {PREP_TRACKS.map(t => {
              const on = myGrade === t.key
              return (
                <div
                  key={t.key}
                  className="rounded-xl px-4 py-2.5 flex-1 min-w-[170px]"
                  style={{ border: `1px solid ${on ? C.green : C.track}`, background: on ? C.greenBg : '#FAFBFC' }}
                >
                  <div className="text-[12px] font-bold" style={{ color: on ? C.greenDeep : C.faint }}>
                    {t.label}
                    {on && (
                      <span className="ml-1.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: C.green, background: '#fff' }}>
                        학생 트랙
                      </span>
                    )}
                  </div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: on ? '#4B7F6E' : '#B6BCC4' }}>{t.sub}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ══ 미션 팝업 ═════════════════════════════ */}
      {selected && sel && (
        <div
          onClick={() => setSel(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-[820px] max-h-[88vh] overflow-y-auto"
            style={{ boxShadow: '0 24px 60px rgba(15,23,42,0.28)' }}
          >
            {/* 팝업 머리 */}
            <div className="px-6 pt-6 pb-4 sticky top-0 z-10 bg-white" style={{ borderBottom: `1px solid ${C.soft}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <span
                    className="flex flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold"
                    style={{ width: 46, height: 46, border: `3px solid ${C.green}`, color: C.greenDeep, background: '#fff' }}
                  >
                    {sel.idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold" style={{ color: C.faint }}>
                      {selLane?.label} · {selected.freq}
                    </p>
                    <h3 className="text-[19px] font-extrabold tracking-tight" style={{ color: C.ink }}>
                      {selected.m} · {selected.theme}
                    </h3>
                    {selected.output && (
                      <p className="mt-0.5 text-[12px]" style={{ color: C.muted }}>
                        이 달에 남기는 것 <b style={{ color: C.greenDeep }}>{selected.output}</b>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSel(null)}
                  className="text-[18px] flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                  style={{ color: C.muted }}
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
              {!canEdit && (
                <p className="mt-3 rounded-xl px-3.5 py-2 text-[12px]" style={{ background: '#FFFBEB', color: '#92400E' }}>
                  학생이 지금 {studentGrade}이라서 이 구간은 미리보기만 할 수 있어요.
                </p>
              )}
            </div>

            {/* 주차 — 세로 길 */}
            <ol className="relative px-6 py-5">
              <span
                aria-hidden
                className="absolute rounded-full"
                style={{ left: 24 + 15, top: 36, bottom: 36, width: 4, background: C.track }}
              />
              {selected.missions.map((ms, mi) => {
                const done = isDone(ms.key)
                const memo = getMemo(ms.key)
                const hasUnsavedMemo = memoDrafts[ms.key] !== undefined
                const wb = wbAnswers?.get(ms.key)
                const wbForm = wbForms?.get(ms.key)
                const wbOpen = openWb === ms.key
                const wbSubmitted = !!wb?.submitted_at

                return (
                  <li key={ms.key} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* 체크 = 정거장 */}
                    <button
                      onClick={() => handleToggle(ms, selected.m)}
                      disabled={!canEdit || toggleMutation.isPending}
                      title={canEdit ? '완료 체크' : '학생 학년에서만 체크할 수 있어요'}
                      className="relative z-10 flex flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold disabled:cursor-not-allowed"
                      style={{
                        width: 34,
                        height: 34,
                        background: done ? C.green : '#fff',
                        border: `${done ? 2 : 3}px solid ${done ? C.green : wbSubmitted ? C.amber : C.track}`,
                        color: done ? '#fff' : C.muted,
                      }}
                    >
                      {done ? '✓' : mi + 1}
                    </button>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold" style={{ color: C.faint }}>{mi + 1}주차</span>
                        {ms.subject && (
                          <span className="text-[12px] font-bold" style={{ color: C.greenDeep }}>{ms.subject}</span>
                        )}
                        <span className="text-[11px]" style={{ color: '#C4C9D0' }}>{scLabel(ms.type)}</span>
                      </div>
                      <p
                        className="mt-0.5 text-[14.5px] leading-snug"
                        style={{ color: done ? C.greenDeep : C.ink, fontWeight: done ? 700 : 600 }}
                      >
                        {ms.t}
                      </p>

                      {/* 워크북 */}
                      <div className="mt-2">
                        {wb ? (
                          <button
                            onClick={() => setOpenWb(wbOpen ? null : ms.key)}
                            className="inline-flex items-center gap-1.5 text-[12px] font-bold"
                            style={{ color: wbSubmitted ? (done ? C.greenDeep : '#92400E') : C.muted }}
                          >
                            <span
                              className="rounded-full"
                              style={{ width: 7, height: 7, background: wbSubmitted ? (done ? C.green : C.amber) : C.track }}
                            />
                            워크북 {wbSubmitted ? (done ? '제출 · 확인함' : '제출 · 확인 대기') : '작성 중'}
                            <span style={{ color: C.faint, fontWeight: 600 }}>{wbOpen ? '접기' : '답안 보기'}</span>
                          </button>
                        ) : (
                          <span className="text-[12px]" style={{ color: '#C4C9D0' }}>워크북 아직 안 열었어요</span>
                        )}
                      </div>

                      {/* 답안 */}
                      {wbOpen && wb && (
                        <div className="mt-2.5 rounded-xl px-4 py-3.5" style={{ background: C.panel }}>
                          <p className="text-[12px] font-bold mb-2.5" style={{ color: C.greenDeep }}>
                            {wbForm?.title ?? '학생이 작성한 내용'}
                          </p>
                          {wbForm?.blocks?.length ? (
                            <WbAnswerSlider key={ms.key} sections={wbForm.blocks} answers={wb.answers ?? {}} />
                          ) : (
                            <div className="grid gap-1">
                              {Object.entries(wb.answers ?? {}).map(([k, v]) => (
                                <div key={k} className="text-[12px]" style={{ color: C.muted }}>
                                  <span style={{ color: C.faint }}>{k} · </span>
                                  {Array.isArray(v) ? v.join(', ') : String(v)}
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-[11px] mt-3 pt-2" style={{ color: C.faint, borderTop: `1px solid ${C.track}` }}>
                            {wbSubmitted
                              ? `제출 ${new Date(wb.submitted_at!).toLocaleDateString('ko-KR')}`
                              : `마지막 작성 ${new Date(wb.updated_at).toLocaleDateString('ko-KR')}`}
                          </p>
                        </div>
                      )}

                      {/* 메모 */}
                      {canEdit ? (
                        <div className="mt-2.5">
                          <textarea
                            value={memo}
                            onChange={e => setMemoDrafts(prev => ({ ...prev, [ms.key]: e.target.value }))}
                            placeholder="학생에게 남길 메모 — 학생 화면에 그대로 보여요"
                            rows={2}
                            className="w-full text-[13px] rounded-xl border border-gray-200 px-3 py-2 resize-none outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                            style={{ color: C.ink }}
                          />
                          {hasUnsavedMemo && (
                            <div className="flex justify-end gap-2 mt-1.5">
                              <button
                                onClick={() => setMemoDrafts(prev => { const n = { ...prev }; delete n[ms.key]; return n })}
                                className="h-8 px-3 rounded-full text-[12px] font-semibold hover:bg-gray-100"
                                style={{ color: C.muted }}
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleSaveMemo(ms, selected.m)}
                                disabled={memoMutation.isPending}
                                className="h-8 px-4 rounded-full text-[12px] font-bold text-white disabled:opacity-60"
                                style={{ background: C.green }}
                              >
                                {memoMutation.isPending ? '저장 중...' : '메모 저장'}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        memo && (
                          <p className="mt-2.5 rounded-xl px-3.5 py-2.5 text-[12.5px] whitespace-pre-wrap" style={{ background: C.greenBg, color: C.greenDeep }}>
                            {memo}
                          </p>
                        )
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>

            {/* 팝업 아래 */}
            <div className="px-6 pb-6 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-2 text-[12px]" style={{ color: C.faint }}>
                <Dot size={18} />번호를 누르면 완료 체크
              </span>
              <button
                onClick={() => setSel(null)}
                className="ml-auto h-10 px-5 rounded-full text-[13px] font-bold"
                style={{ background: '#fff', color: C.muted, border: `1px solid ${C.track}` }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}