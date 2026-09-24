import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import {
  MIDDLE_ROADMAP,
  toMiddleGradeKey,
  JINRO_LAST_MONTHS,
  PREP_TRACKS,
  type MiddleGradeKey,
  type Mission,
  type RoadmapMonth,
} from '@/constants/middleRoadmap'
import { useMyMiddleRoadmapProgress } from '@/pages/middle-student/_hooks/useMyMiddleRoadmap'
import JinroMap from './JinroMap'

// 초록 테마 (중등)
const THEME = {
  accent: '#10B981',
  accentDark: '#065F46',
  accentBg: '#ECFDF5',
  accentBorder: '#6EE7B7',
  accentShadow: 'rgba(16, 185, 129, 0.15)',
  gradient: 'linear-gradient(135deg, #065F46, #10B981)',
}

/* ── 길 좌표 ───────────────────────────────── */
const LEFT = 175
const RIGHT = 925
const TOP = 66
const ROW_H = 112
const TURN = 58
const STEP = (RIGHT - LEFT) / 7
const LINE_W = 8

type Tab = 'road' | 'map'

interface Lane {
  key: MiddleGradeKey
  label: string
  sub: string
  months: RoadmapMonth[]
  locked: boolean
}

/**
 * ⚠️ 임시 데이터
 * 워크북에서 행동동사를 받기 시작하면 jinro_tally 집계로 교체한다.
 */
const MOCK_DIR_COUNTS: Record<string, number> = {
  data: 18, people: 12, nature: 5, make: 3, tech: 2,
}
const MOCK_VERB_COUNTS: Record<string, number> = {
  '비교했다': 7, '정리했다': 6, '기록했다': 5,
  '설명했다': 6, '도왔다': 4, '물었다': 2,
  '관찰했다': 3, '확인했다': 2,
  '썼다': 2, '발표했다': 1,
  '만들었다': 2,
}
const MOCK_TOTAL_ACTS = 26

export default function Roadmap() {
  const navigate = useNavigate()
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const [tab, setTab] = useState<Tab>('road')
  const [selMonth, setSelMonth] = useState<number | null>(null)

  const { data: progressMap, isLoading } = useMyMiddleRoadmapProgress()

  const myGrade: MiddleGradeKey = toMiddleGradeKey(
    student?.grade,
    (student as any)?.track,
  )
  const roadmap = MIDDLE_ROADMAP[myGrade] ?? []
  const myIsM3 = myGrade.startsWith('중3')

  const isDone = (key: string) => progressMap?.get(key)?.is_completed === true
  const getMemo = (key: string) => progressMap?.get(key)?.teacher_memo

  /** 아직 안 끝난 첫 달 = 지금 여기 */
  const nowIdx = useMemo(() => {
    if (!roadmap.length) return 0
    const i = roadmap.findIndex(m => m.missions.some(ms => !isDone(ms.key)))
    return i === -1 ? roadmap.length - 1 : i
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap, progressMap])

  const { totalMissions, doneMissions, overallPct } = useMemo(() => {
    const total = roadmap.reduce((a, m) => a + m.missions.length, 0)
    const done = roadmap.reduce(
      (a, m) => a + m.missions.filter(ms => isDone(ms.key)).length,
      0,
    )
    return {
      totalMissions: total,
      doneMissions: done,
      overallPct: total > 0 ? Math.round((done / total) * 100) : 0,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap, progressMap])

  const selected = selMonth !== null ? roadmap[selMonth] ?? null : null

  /* ESC로 팝업 닫기 */
  useEffect(() => {
    if (selMonth === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelMonth(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selMonth])

  const scColor = (type: Mission['type']) => {
    if (type === 'inAnswer') return { bg: '#EDE9FE', c: '#6D28D9', label: '✨ 비커스' }
    if (type === 'tab') return { bg: THEME.accentBg, c: THEME.accent, label: '🔗 바로가기' }
    return { bg: '#F0FDF4', c: '#15803D', label: '👨‍🏫 선생님' }
  }

  /** 길에 그릴 구간 */
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
  const stationX = (i: number, k: number) =>
    isLtr(i) ? LEFT + k * STEP : RIGHT - k * STEP

  const goMonth = (lane: Lane, idx: number) => {
    if (lane.locked) return
    if (lane.key !== myGrade) return
    setSelMonth(idx)
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-7 box-border font-sans text-ink">

      {/* 탭 + 스탯 */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          {([
            { k: 'road', label: '로드맵' },
            { k: 'map', label: '나의 진로 지도' },
          ] as const).map(t => {
            const on = tab === t.k
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className="h-9 px-4 rounded-lg text-[12.5px] transition-all"
                style={{
                  background: on ? THEME.accent : '#fff',
                  color: on ? '#fff' : '#6B7280',
                  border: `1px solid ${on ? THEME.accent : '#E5E7EB'}`,
                  fontWeight: on ? 700 : 600,
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="rounded-xl px-4 py-2"
            style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
          >
            <div className="text-[10px] text-white/80 mb-0.5 font-medium">전체 진행률</div>
            <div className="text-[15px] font-extrabold text-white">{overallPct}%</div>
          </div>
          {[
            { label: '완료 미션', val: `${doneMissions}/${totalMissions}` },
            { label: '지금 여기', val: roadmap[nowIdx]?.m ?? '-' },
            { label: '소속 학원', val: academy.academyName || '미소속' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-line rounded-xl px-4 py-2">
              <div className="text-[10px] text-ink-secondary mb-0.5 font-medium">{s.label}</div>
              <div className="text-[15px] font-extrabold text-ink">{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {tab === 'road' && (<>

        {/* ══ 진로 로드맵 카드 ══════════════════════ */}
        <div className="bg-white border border-line rounded-2xl p-5 mb-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">

          <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
            <div>
              <div className="text-[14px] font-bold text-ink tracking-tight">진로 로드맵</div>
              <div className="text-[11px] text-ink-secondary mt-0.5">
                초5부터 중3 1학기까지 한 길로 이어져요. 내 학년 정거장을 누르면 그 달 미션이 열려요.
              </div>
            </div>
            {roadmap.length > 0 && (
              <button
                onClick={() => setSelMonth(nowIdx)}
                className="h-9 px-4 rounded-lg text-[12px] font-bold text-white flex-shrink-0"
                style={{ background: THEME.accent }}
              >
                이번 달 미션 보기 →
              </button>
            )}
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
                const endX = empty
                  ? (ltr ? RIGHT : LEFT)
                  : stationX(i, lane.months.length - 1)
                const startX = ltr ? LEFT : RIGHT

                return (
                  <g key={'base' + i}>
                    <line
                      x1={startX} y1={y} x2={endX} y2={y}
                      stroke="#E5E7EB"
                      strokeWidth={LINE_W}
                      strokeLinecap="round"
                      strokeDasharray={empty ? '2 14' : undefined}
                    />
                    {i === lanes.length - 1 && !empty && (
                      <line
                        x1={endX} y1={y} x2={endX + STEP * 1.25} y2={y}
                        stroke="#E5E7EB" strokeWidth={LINE_W}
                        strokeLinecap="round" strokeDasharray="2 14"
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
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth={LINE_W}
                    strokeLinecap="round"
                  />
                )
              })}

              {/* 3. 지나온 길 (내 학년) */}
              {lanes.map((lane, i) => {
                if (lane.locked || lane.key !== myGrade || !lane.months.length) return null
                const y = laneY(i)
                const ltr = isLtr(i)
                const startX = ltr ? LEFT : RIGHT
                const endX = stationX(i, nowIdx)
                return (
                  <line
                    key={'done' + i}
                    x1={startX} y1={y} x2={endX} y2={y}
                    stroke={THEME.accent}
                    strokeWidth={LINE_W}
                    strokeLinecap="round"
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
                const color = mine ? THEME.accentDark : lane.locked ? '#C4C9D0' : '#9CA3AF'
                return (
                  <g key={'label' + i}>
                    <text x={lx} y={y + 2} fontSize={13} fontWeight={800} fill={color} textAnchor={anchor}>
                      {lane.label}
                    </text>
                    <text
                      x={lx} y={y + 19} fontSize={10.5} fontWeight={600}
                      fill={lane.locked ? '#C4C9D0' : '#B6BCC4'} textAnchor={anchor}
                    >
                      {mine ? '지금 여기' : lane.sub}
                    </text>
                  </g>
                )
              })}

              {/* 5. 구간 결과물 */}
              {lanes.map((lane, i) => {
                if (!lane.months.length) return null
                const y = laneY(i)
                const mine = !lane.locked && lane.key === myGrade
                const endX = stationX(i, lane.months.length - 1)
                const out = lane.months[lane.months.length - 1]?.output
                if (!out) return null
                return (
                  <text
                    key={'out' + i}
                    x={endX} y={y - 28} fontSize={11} fontWeight={700}
                    fill={mine ? THEME.accentDark : '#C4C9D0'} textAnchor="middle"
                  >
                    {out}
                  </text>
                )
              })}

              {/* 6. 준비 중 구간 */}
              {lanes.map((lane, i) => {
                if (lane.months.length) return null
                const y = laneY(i)
                return (
                  <text
                    key={'empty' + i}
                    x={(LEFT + RIGHT) / 2} y={y - 18} fontSize={11.5} fontWeight={600}
                    fill="#C4C9D0" textAnchor="middle"
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
                  const r = isNow ? 19 : 15

                  const fill = allDone
                    ? THEME.accent
                    : isNow
                      ? '#fff'
                      : mine
                        ? '#F3F4F6'
                        : '#F9FAFB'
                  const txt = allDone
                    ? '#fff'
                    : isNow
                      ? THEME.accentDark
                      : mine
                        ? '#6B7280'
                        : '#CBD5E1'
                  const stroke = isNow || allDone ? THEME.accent : '#E5E7EB'

                  return (
                    <g
                      key={lane.key + k}
                      onClick={() => goMonth(lane, k)}
                      style={{ cursor: mine ? 'pointer' : 'default' }}
                    >
                      <title>{`${mo.m} · ${mo.theme}`}</title>
                      <circle
                        cx={x} cy={y} r={r}
                        fill={fill} stroke={stroke} strokeWidth={isNow ? 3.5 : 2}
                      />
                      <text x={x} y={y + 4} fontSize={11.5} fontWeight={800} fill={txt} textAnchor="middle">
                        {allDone ? '✓' : k + 1}
                      </text>
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
                    {/* 예비고1 */}
                    <circle cx={starX} cy={y} r={15} fill="#F9FAFB" stroke="#E5E7EB" strokeWidth={2} />
                    <text x={starX} y={y + 5} fontSize={13} fill="#CBD5E1" textAnchor="middle">★</text>
                    <text x={starX} y={y - 30} fontSize={11.5} fontWeight={700} fill="#9CA3AF" textAnchor="middle">
                      예비고1 · 설계
                    </text>
                    <text x={starX} y={y + 36} fontSize={10} fontWeight={600} fill="#C4C9D0" textAnchor="middle">
                      학과군 3개와 직업이
                    </text>
                    <text x={starX} y={y + 50} fontSize={10} fontWeight={600} fill="#C4C9D0" textAnchor="middle">
                      정해져 넘어가요
                    </text>

                    {/* 고등으로 */}
                    <line
                      x1={starX + 19} y1={y} x2={boxX - 4} y2={y}
                      stroke="#E5E7EB" strokeWidth={LINE_W} strokeLinecap="round" strokeDasharray="2 14"
                    />
                    <rect
                      x={boxX} y={y - 26} width={186} height={52} rx={14}
                      fill="#EFF6FF" stroke="#BFDBFE" strokeWidth={1.5}
                    />
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

          {isLoading && (
            <div className="mt-2 pt-4 text-center" style={{ borderTop: '1px dashed #E5E7EB' }}>
              <div
                className="inline-block w-5 h-5 border-2 border-gray-200 rounded-full animate-spin mb-2"
                style={{ borderTopColor: THEME.accent }}
              />
              <div className="text-[12px] text-ink-secondary font-medium">진행 상황을 불러오는 중...</div>
            </div>
          )}

          {/* ── 갈림길 ──────────────────────────── */}
          <div className="mt-2 pt-4" style={{ borderTop: '1px dashed #E5E7EB' }}>
            <div className="text-[11px] font-bold mb-2" style={{ color: THEME.accentDark }}>
              길 끝에서 진로 결과가 나오고, 중3 2학기부터 갈라져요
            </div>
            <div className="flex gap-2.5 flex-wrap">
              {PREP_TRACKS.map(t => {
                const on = myGrade === t.key
                return (
                  <div
                    key={t.key}
                    className="rounded-xl px-4 py-2.5 flex-1 min-w-[170px]"
                    style={{
                      border: `1px solid ${on ? THEME.accent : '#E5E7EB'}`,
                      background: on ? THEME.accentBg : '#FAFBFC',
                    }}
                  >
                    <div
                      className="text-[12px] font-bold"
                      style={{ color: on ? THEME.accentDark : '#9CA3AF' }}
                    >
                      {t.label}
                      {on && (
                        <span
                          className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: THEME.accent, background: '#fff' }}
                        >
                          내 트랙
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] mt-0.5" style={{ color: on ? '#4B7F6E' : '#B6BCC4' }}>
                      {t.sub}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 안내 배너 */}
        <div
          className="rounded-xl px-4 py-2.5 text-[12px] font-medium flex items-center gap-2"
          style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60`, color: THEME.accentDark }}
        >
          👁️ 로드맵 체크는 <b className="mx-1">원장님이</b> 해주세요. 미션을 누르면 워크북으로 이동해요.
        </div>

        {/* ══ 미션 팝업 ═════════════════════════════ */}
        {selected && selMonth !== null && (
          <div
            onClick={() => setSelMonth(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-[860px] max-h-[86vh] overflow-y-auto"
              style={{ boxShadow: '0 24px 60px rgba(15,23,42,0.28)' }}
            >
              {/* 팝업 헤더 */}
              <div
                className="px-6 py-5 sticky top-0 z-10"
                style={{ background: THEME.accentBg, borderBottom: `1px solid ${THEME.accentBorder}80` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[18px] font-extrabold text-ink tracking-tight">
                        {selected.m} · {selected.theme}
                      </span>
                      {selMonth === nowIdx && (
                        <span
                          className="text-[9.5px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color: '#fff', background: THEME.accent }}
                        >
                          NOW
                        </span>
                      )}
                      {selected.phase === 'prep' && (
                        <span
                          className="text-[9.5px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A' }}
                        >
                          고입 준비
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span
                        className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: THEME.accentDark, background: '#fff', border: `1px solid ${THEME.accentBorder}` }}
                      >
                        ⏰ {selected.freq}
                      </span>
                      {selected.output && (
                        <span
                          className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A' }}
                        >
                          이 달에 남기는 것 · {selected.output}
                        </span>
                      )}
                      <span className="text-[11px] font-bold" style={{ color: THEME.accentDark }}>
                        {selected.missions.filter(ms => isDone(ms.key)).length} / {selected.missions.length} 완료
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelMonth(null)}
                    className="text-[18px] flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                    style={{ color: THEME.accentDark }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 미션 목록 */}
              <div className="p-5 grid grid-cols-2 max-md:grid-cols-1 gap-2.5">
                {selected.missions.map((ms, mi) => {
                  const tc = scColor(ms.type)
                  const done = isDone(ms.key)
                  const memo = getMemo(ms.key)

                  return (
                    <div
                      key={mi}
                      onClick={() => navigate(`/middle-student/workbook/${ms.key}`)}
                      className="rounded-xl px-4 py-3.5 transition-all cursor-pointer hover:shadow-md hover:-translate-y-px"
                      style={{
                        background: done ? '#ECFDF5' : '#F8FAFC',
                        border: `1px solid ${done ? '#6EE7B7' : '#E5E7EB'}`,
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                          style={{ background: done ? '#059669' : '#D1D5DB' }}
                        >
                          {done ? '✓' : ''}
                        </div>
                        <span className="text-[10.5px] font-bold text-ink-muted">{mi + 1}주차</span>
                        {ms.subject && (
                          <span
                            className="text-[9.5px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: '#EEF2FF', color: '#4338CA' }}
                          >
                            {ms.subject}
                          </span>
                        )}
                        <span
                          className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: tc.bg, color: tc.c }}
                        >
                          {tc.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className="flex-1 text-[13px] leading-[1.5]"
                          style={{ color: done ? '#059669' : '#1a1a1a', fontWeight: done ? 700 : 600 }}
                        >
                          {ms.t}
                        </span>
                        <span className="text-[14px] text-ink-muted flex-shrink-0 leading-none">›</span>
                      </div>

                      {memo && (
                        <div
                          className="mt-2.5 text-[11px] text-ink-secondary bg-white border rounded-md px-2.5 py-1.5 whitespace-pre-wrap"
                          style={{ borderColor: THEME.accentBorder + '60' }}
                        >
                          <div className="text-[10px] font-bold mb-1" style={{ color: THEME.accentDark }}>
                            👨‍🏫 원장님 메모
                          </div>
                          {memo}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 팝업 하단 */}
              <div
                className="px-5 pb-5 flex items-center gap-2 flex-wrap"
              >
                <span className="text-[11px] text-ink-muted">
                  미션을 누르면 워크북으로 이동해요
                </span>
                <button
                  onClick={() => setSelMonth(null)}
                  className="ml-auto h-10 px-5 rounded-xl text-[12.5px] font-bold"
                  style={{ background: '#F8FAFC', color: '#6B7280', border: '1px solid #E5E7EB' }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </>)}

      {/* ── 나의 진로 지도 ─────────────────────────── */}
      {tab === 'map' && (
        <JinroMap
          gradeKey={myGrade}
          verbCounts={MOCK_VERB_COUNTS}
          dirCounts={MOCK_DIR_COUNTS}
          totalActs={MOCK_TOTAL_ACTS}
        />
      )}

    </div>
  )
}