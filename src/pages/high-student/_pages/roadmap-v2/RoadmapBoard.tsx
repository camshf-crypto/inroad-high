import { useMemo, useState } from 'react'
import {
  selectVisibleLines,
  type RoadmapBoardData,
  type RoadmapLine,
  type RoadmapNode,
} from '@/pages/high-student/_hooks/useRoadmap'
import {
  goalTextOf,
  GOAL_BASIS,
  type CareerSeriesData,
  type Grade,
} from '@/pages/high-student/_hooks/useRoadmap'

const GRADES: Grade[] = [1, 2, 3]

// 레이아웃 상수
const SVG_W = 820
const ROW_H = 62
const TOP = 70
const NODE_W = 168
const NODE_H = 44
const GREEN = '#10B981'

/** 보이는 학년 수에 따라 열 위치를 나눈다 */
function columnsFor(count: number): number[] {
  if (count >= 3) return [130, 400, 670]
  if (count === 2) return [200, 560]
  return [400]
}

interface Props {
  board: RoadmapBoardData
  career: CareerSeriesData
  /** 학생의 현재 학년 — 이 학년 +1 까지만 보여준다 */
  myGrade?: Grade
  /** `${학년}|${과목명}` → 담은 책 권수 */
  bookCounts?: Map<string, number>
  onNodeClick?: (line: RoadmapLine, node: RoadmapNode, grade: Grade) => void
  onToggleComplete?: (node: RoadmapNode, next: boolean) => void
  /** 헤더의 진로 카드를 눌렀을 때 (최종 목표 수정) */
  onEditGoal?: () => void
  /** 고른 과목이 없을 때 '과목 고르러 가기' */
  onSetupSubjects?: () => void
}

interface Cell {
  grade: Grade
  node: RoadmapNode
  done: boolean
  /** 고르지 않아도 항상 보이는 칸 (공통과목·창체) */
  fixed: boolean
}

export default function RoadmapBoard({
  board,
  career,
  myGrade = 1,
  bookCounts,
  onNodeClick,
  onToggleComplete,
  onEditGoal,
  onSetupSubjects,
}: Props) {
  const [hoverLine, setHoverLine] = useState<string | null>(null)

  /** 현재 학년 +1 까지만 */
  const maxGrade = Math.min(3, myGrade + 1) as Grade
  const visibleGrades = useMemo(() => GRADES.filter((g) => g <= maxGrade), [maxGrade])
  const colX = useMemo(() => columnsFor(visibleGrades.length), [visibleGrades])
  const xOf = (g: Grade) => colX[visibleGrades.indexOf(g)] ?? colX[0]

  const lines = useMemo(
    () => selectVisibleLines(board, career.seriesUnion),
    [board, career.seriesUnion],
  )

  /**
   * 세특 계통은 내가 고른 과목만 보여준다.
   * 공통과목과 창체활동은 전원 해당이라 고르지 않아도 항상 표시.
   */
  const cellsByLine = useMemo(() => {
    const m = new Map<string, Cell[]>()
    for (const l of lines) {
      const cells: Cell[] = []
      for (const g of visibleGrades) {
        const candidates = board.nodesByLine.get(l.id)?.get(g) ?? []
        if (candidates.length === 0) continue

        const chosen = candidates.find((n) => board.progress.has(n.id))
        // 창체는 전 학년 필수 · 세특은 공통과목만 항상 표시
        const always =
          l.kind === '창체'
            ? candidates.find((n) => n.is_default) ?? candidates[0]
            : candidates.find((n) => n.category === '공통')

        const node = chosen ?? always
        if (!node) continue

        cells.push({
          grade: g,
          node,
          done: board.progress.get(node.id)?.is_completed ?? false,
          fixed: !chosen && !!always,
        })
      }
      if (cells.length) m.set(l.id, cells)
    }
    return m
  }, [lines, board, visibleGrades])

  // 세특 먼저, 창체는 아래로 모아서 그린다
  const drawn = useMemo(() => {
    const has = lines.filter((l) => cellsByLine.has(l.id))
    return [
      ...has.filter((l) => l.kind !== '창체'),
      ...has.filter((l) => l.kind === '창체'),
    ]
  }, [lines, cellsByLine])

  const svgH = TOP + drawn.length * ROW_H + 20

  const total = [...cellsByLine.values()].reduce((a, c) => a + c.length, 0)
  const doneCount = [...cellsByLine.values()].reduce(
    (a, c) => a + c.filter((x) => x.done).length,
    0,
  )
  const pickedCount = [...cellsByLine.values()].reduce(
    (a, c) => a + c.filter((x) => !x.fixed).length,
    0,
  )

  // 고른 과목이 하나도 없고 고정 칸만 있는 상태
  const nothingPicked = pickedCount === 0

  return (
    <div>
      {/* 학년 헤더 */}
      <div
        className="grid gap-3 mb-1.5"
        style={{ gridTemplateColumns: `repeat(${visibleGrades.length}, minmax(0, 1fr))` }}
      >
        {visibleGrades.map((g) => {
          const c = career.byGrade.get(g)
          return (
            <button
              key={g}
              onClick={onEditGoal}
              disabled={!onEditGoal}
              title={onEditGoal ? '진로 바꾸기' : undefined}
              className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-left transition-all enabled:hover:border-brand-high-light enabled:hover:bg-brand-high-pale/40"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[16px] font-extrabold text-brand-high-dark">
                  고{g}
                </span>
                <span className="text-[10px] font-semibold text-white bg-brand-high px-2 py-0.5 rounded-full">
                  {GOAL_BASIS[g]} 중심
                </span>
                {onEditGoal && (
                  <span className="ml-auto text-[10px] text-ink-muted">수정</span>
                )}
              </div>
              <div className="text-[12px] font-bold text-brand-high">
                {goalTextOf(c)}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between mb-1.5">
        {maxGrade < 3 ? (
          <span className="text-[11px] text-ink-muted">
            고{maxGrade + 1}은 고{maxGrade}가 되면 열려요.
          </span>
        ) : (
          <span />
        )}
        <span className="text-[11px] text-ink-muted">
          진행 <b className="text-[13px]" style={{ color: GREEN }}>{doneCount}</b>
          <span className="text-ink-muted">/{total}</span>
        </span>
      </div>

      {/* 과목을 아직 안 골랐을 때 안내 */}
      {nothingPicked && onSetupSubjects && (
        <button
          onClick={onSetupSubjects}
          className="w-full mb-2 rounded-xl border border-brand-high-light bg-brand-high-pale/50 px-4 py-3 text-left transition-all hover:bg-brand-high-pale"
        >
          <div className="text-[12.5px] font-bold text-brand-high-dark mb-0.5">
            아직 고른 과목이 없어요
          </div>
          <div className="text-[11.5px] text-ink-secondary">
            시간표를 보면서 실제로 듣는 과목을 고르면 여기에 3년 흐름이 그려져요. 과목 고르러 가기 →
          </div>
        </button>
      )}

      {/* 곡선 그래프 */}
      {drawn.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-16 px-6 text-center">
          <div className="text-[14px] font-bold text-ink mb-1.5">
            보여줄 내용이 아직 없어요
          </div>
          <div className="text-[12px] text-ink-secondary leading-relaxed mb-4">
            과목을 고르면 여기에 3년 흐름이 그려져요.
          </div>
          {onSetupSubjects && (
            <button
              onClick={onSetupSubjects}
              className="h-11 px-6 bg-brand-high text-white rounded-xl text-[13px] font-bold hover:bg-brand-high-dark transition-all"
            >
              과목 고르러 가기 →
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl py-2 overflow-x-auto">
          <svg
            viewBox={`0 0 ${SVG_W} ${svgH}`}
            style={{ width: '100%', minWidth: 760, height: svgH }}
          >
            {colX.map((x, i) => (
              <line
                key={i}
                x1={x}
                y1={40}
                x2={x}
                y2={svgH - 10}
                stroke="#F1F5F9"
                strokeWidth={1}
              />
            ))}
            {visibleGrades.map((g, i) => (
              <text
                key={g}
                x={colX[i]}
                y={26}
                textAnchor="middle"
                fontSize={12}
                fontWeight={800}
                fill="#CBD5E1"
              >
                고{g}
              </text>
            ))}

            {drawn.map((line, li) => {
              const cells = cellsByLine.get(line.id)!
              const y = TOP + li * ROW_H
              const dim = hoverLine !== null && hoverLine !== line.id
              const active = hoverLine === line.id

              return (
                <g
                  key={line.id}
                  opacity={dim ? 0.22 : 1}
                  style={{ transition: 'opacity .18s' }}
                >
                  {/* 존재하는 칸끼리만 연결 — 빈 학년은 건너뛴다 */}
                  {cells.slice(0, -1).map((cell, i) => {
                    const next = cells[i + 1]
                    const x1 = xOf(cell.grade) + NODE_W / 2 - 6
                    const x2 = xOf(next.grade) - NODE_W / 2 + 6
                    const mid = (x1 + x2) / 2
                    const dy = (li % 2 === 0 ? -1 : 1) * 10
                    const segDone = cell.done && next.done
                    return (
                      <path
                        key={i}
                        d={`M ${x1} ${y} C ${mid} ${y + dy}, ${mid} ${y - dy}, ${x2} ${y}`}
                        fill="none"
                        stroke={line.color}
                        strokeWidth={active ? 2 : 1.2}
                        strokeDasharray={segDone ? '0' : '4 4'}
                        opacity={segDone ? 0.85 : 0.4}
                      />
                    )
                  })}

                  {cells.map((cell) => {
                    const x = xOf(cell.grade)
                    const { node, done } = cell
                    const isCustom = node.student_id !== null
                    const label =
                      node.subject_name.length > 10
                        ? node.subject_name.slice(0, 10) + '…'
                        : node.subject_name

                    return (
                      <g
                        key={node.id}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoverLine(line.id)}
                        onMouseLeave={() => setHoverLine(null)}
                        onClick={() => onNodeClick?.(line, node, cell.grade)}
                      >
                        <rect
                          x={x - NODE_W / 2}
                          y={y - NODE_H / 2}
                          width={NODE_W}
                          height={NODE_H}
                          rx={10}
                          fill={done ? '#F0FDF4' : '#fff'}
                          stroke={active ? line.color : done ? '#A7F3D0' : '#E2E8F0'}
                          strokeWidth={active ? 1.8 : 1}
                        />
                        <circle
                          cx={x - NODE_W / 2 + 14}
                          cy={y}
                          r={done ? 5 : 4}
                          fill={done ? line.color : '#fff'}
                          stroke={line.color}
                          strokeWidth={1.6}
                        />
                        <text
                          x={x - NODE_W / 2 + 26}
                          y={y - 3}
                          fontSize={11.5}
                          fontWeight={700}
                          fill={done ? '#065F46' : '#334155'}
                        >
                          {label}
                        </text>
                        {(() => {
                          const base = isCustom
                            ? '내가 추가함'
                            : cell.fixed
                              ? line.kind === '창체'
                                ? '창체활동'
                                : '공통과목'
                              : node.areas?.[0] ?? ''
                          const cnt = bookCounts?.get(`${cell.grade}|${node.subject_name}`) ?? 0
                          return (
                            <>
                              {base && (
                                <text
                                  x={x - NODE_W / 2 + 26}
                                  y={y + 11}
                                  fontSize={9}
                                  fill="#94A3B8"
                                >
                                  {base}
                                </text>
                              )}
                              {cnt > 0 && (
                                <text
                                  x={x - NODE_W / 2 + 26 + (base ? base.length * 8 + 8 : 0)}
                                  y={y + 11}
                                  fontSize={9}
                                  fill="#4338CA"
                                  fontWeight={700}
                                >
                                  독서 {cnt}
                                </text>
                              )}
                            </>
                          )
                        })()}

                        <g
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleComplete?.(node, !done)
                          }}
                        >
                          <rect
                            x={x + NODE_W / 2 - 24}
                            y={y - 8}
                            width={16}
                            height={16}
                            rx={4}
                            fill={done ? GREEN : '#fff'}
                            stroke={done ? GREEN : '#CBD5E1'}
                            strokeWidth={1.4}
                          />
                          {done && (
                            <text
                              x={x + NODE_W / 2 - 16}
                              y={y + 4}
                              fontSize={10}
                              fill="#fff"
                              textAnchor="middle"
                              fontWeight={800}
                            >
                              ✓
                            </text>
                          )}
                        </g>
                      </g>
                    )
                  })}

                  <text
                    x={8}
                    y={y + 3}
                    fontSize={9.5}
                    fontWeight={700}
                    fill={line.color}
                    opacity={0.85}
                  >
                    {line.name}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      )}

      {/* 범례 */}
      {drawn.length > 0 && (
        <div className="flex flex-wrap gap-3.5 items-center mt-2.5 text-[11px] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <svg width={26} height={8}>
              <line x1={0} y1={4} x2={26} y2={4} stroke="#64748B" strokeWidth={1.4} />
            </svg>
            완료된 연결
          </span>
          <span className="flex items-center gap-1.5">
            <svg width={26} height={8}>
              <line
                x1={0}
                y1={4}
                x2={26}
                y2={4}
                stroke="#94A3B8"
                strokeWidth={1.2}
                strokeDasharray="4 4"
              />
            </svg>
            앞으로 할 것
          </span>
          {onSetupSubjects && (
            <button
              onClick={onSetupSubjects}
              className="text-[11px] font-bold text-brand-high hover:underline"
            >
              고른 과목 {pickedCount}개 · 바꾸기
            </button>
          )}
          <span className="ml-auto text-[10.5px] text-slate-400">
            노드에 올리면 그 계통이 강조돼요 · 클릭하면 상세
          </span>
        </div>
      )}
    </div>
  )
}