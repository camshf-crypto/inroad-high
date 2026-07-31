import { useMemo, useState } from 'react'
import {
  selectVisibleLines,
  useSelectNode,
  useAddCustomNode,
  type RoadmapBoardData,
  type RoadmapNode,
  type CareerSeriesData,
  type Grade,
} from '@/pages/high-student/_hooks/useRoadmap'

const GRADES: Grade[] = [1, 2, 3]

interface Props {
  board: RoadmapBoardData
  career: CareerSeriesData
  myGrade?: Grade
  onDone?: () => void
}

export default function SubjectSetup({ board, career, myGrade = 1, onDone }: Props) {
  const [grade, setGrade] = useState<Grade>(myGrade)

  const lines = useMemo(
    () => selectVisibleLines(board, career.seriesUnion),
    [board, career.seriesUnion],
  )

  const mySeries = career.seriesUnion[0] ?? null

  const { choosable, required } = useMemo(() => {
    const cells = lines
      .filter((l) => l.kind === '세특')
      .map((l) => ({
        line: l,
        all: board.nodesByLine.get(l.id)?.get(grade) ?? [],
      }))

    // 공통과목은 전원 이수라 고르는 게 아니다 — 이름 기준 중복 제거해서 따로 보여준다
    const seen = new Set<string>()
    const req: string[] = []
    for (const c of cells) {
      for (const n of c.all) {
        if (n.category !== '공통') continue
        if (seen.has(n.subject_name)) continue
        seen.add(n.subject_name)
        req.push(n.subject_name)
      }
    }

    // 선택 대상 = 공통이 아닌 후보
    const pick = cells
      .map((c) => ({ line: c.line, candidates: c.all.filter((n) => n.category !== '공통') }))
      .filter((c) => c.candidates.length > 0)

    return { choosable: pick, required: req }
  }, [lines, board, grade])

  const pickedCount = choosable.filter((c) =>
    c.candidates.some((n) => board.progress.has(n.id)),
  ).length

  return (
    <div className="max-w-[720px]">
      <div className="mb-4">
        <div className="text-[16px] font-extrabold text-ink mb-1">내가 듣는 과목</div>
        <div className="text-[12px] text-ink-secondary leading-relaxed">
          학교마다 개설 과목이 달라요. 시간표를 보면서 실제로 듣는 과목을 골라주세요.
          <br />
          <span className="text-ink-muted">
            지금 학년만 골라도 괜찮아요. 나머지는 나중에 채우면 돼요.
          </span>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4">
        {GRADES.map((g) => {
          const on = grade === g
          return (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className="px-3.5 py-1.5 rounded-full text-[12px] border transition-all"
              style={{
                background: on ? '#2563EB' : '#fff',
                color: on ? '#fff' : '#6B7280',
                borderColor: on ? '#2563EB' : '#E5E7EB',
                fontWeight: on ? 700 : 500,
              }}
            >
              고{g}
            </button>
          )
        })}
      </div>

      {choosable.length === 0 ? (
        <div className="rounded-xl border border-line bg-gray-50 px-4 py-6 text-center text-[13px] text-ink-secondary">
          고{grade}에는 고를 과목이 없어요. 다음 학년을 확인해보세요.
        </div>
      ) : (
        <>
          <div className="text-[11px] text-ink-muted mb-2">
            선택 필요 {choosable.length}개 중 <b className="text-brand-high">{pickedCount}개</b>{' '}
            선택
          </div>

          <div className="flex flex-col gap-3">
            {choosable.map(({ line, candidates }) => (
              <SubjectCell
                key={line.id}
                lineName={line.name}
                lineColor={line.color}
                grade={grade}
                lineId={line.id}
                candidates={candidates}
                progress={board.progress}
                mySeries={mySeries}
              />
            ))}
          </div>
        </>
      )}

      {required.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-gray-50 px-4 py-3">
          <div className="text-[11.5px] font-bold text-ink-secondary mb-0.5">
            공통과목 {required.length}개
          </div>
          <div className="text-[10.5px] text-ink-muted mb-2">
            전원이 이수하는 과목이라 고르지 않아도 돼요.
          </div>
          <div className="flex flex-wrap gap-1.5">
            {required.map((name) => (
              <span
                key={name}
                className="text-[11px] text-ink-secondary bg-white border border-line rounded-full px-2.5 py-1"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {onDone && (
        <button
          onClick={onDone}
          className="mt-5 w-full h-12 bg-brand-high text-white rounded-xl text-[14px] font-bold hover:bg-brand-high-dark transition-all"
        >
          {pickedCount === 0 ? '나중에 고르고 로드맵 보기 →' : '준비 완료! 로드맵 보기 →'}
        </button>
      )}
    </div>
  )
}

// ============================================================

function SubjectCell({
  lineName, lineColor, grade, lineId, candidates, progress, mySeries,
}: {
  lineName: string
  lineColor: string
  grade: Grade
  lineId: string
  candidates: RoadmapNode[]
  progress: Map<string, unknown>
  mySeries: string | null
}) {
  const select = useSelectNode()
  const addCustom = useAddCustomNode()
  const [custom, setCustom] = useState('')
  const [adding, setAdding] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const chosen = candidates.find((n) => progress.has(n.id))
  const shown = chosen ?? candidates.find((n) => n.is_default) ?? candidates[0]

  // 내 계열에 맞는 과목을 앞으로
  const isRec = (n: RoadmapNode) =>
    !!mySeries && !!n.recommended_series?.includes(mySeries)

  const recommended = candidates.filter(isRec)
  const others = candidates.filter((n) => !isRec(n))
  const hasRec = recommended.length > 0
  const visible = !hasRec || showAll ? candidates : recommended

  const submitCustom = () => {
    const name = custom.trim()
    if (!name) return
    addCustom.mutate(
      {
        lineId,
        grade,
        subjectName: name,
        electiveGroup: candidates[0]?.elective_group ?? null,
      },
      {
        onSuccess: (created) => {
          setCustom('')
          setAdding(false)
          select.mutate({ target: created, siblings: candidates })
        },
      },
    )
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="w-2 h-2 rounded-full" style={{ background: lineColor }} />
        <span className="text-[12px] font-bold" style={{ color: lineColor }}>
          {lineName}
        </span>
        {!chosen && (
          <span className="ml-auto text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            미선택 · 기본 {shown?.subject_name}
          </span>
        )}
      </div>

      {hasRec && !showAll && (
        <div className="text-[10.5px] text-ink-muted mb-1.5">
          {mySeries}계열에 맞는 과목이에요
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {visible.map((n) => {
          const on = chosen ? n.id === chosen.id : false
          const rec = isRec(n)
          return (
            <button
              key={n.id}
              onClick={() => select.mutate({ target: n, siblings: candidates })}
              disabled={select.isPending}
              className="rounded-lg border px-3 py-2 text-left transition-all disabled:opacity-50"
              style={{
                borderColor: on ? '#2563EB' : rec ? '#93C5FD' : '#E5E7EB',
                background: on ? '#EFF6FF' : '#fff',
              }}
            >
              <span
                className="text-[12.5px]"
                style={{ color: on ? '#1E3A8A' : '#334155', fontWeight: on ? 700 : 500 }}
              >
                {n.subject_name}
              </span>
              {rec && !on && (
                <span className="ml-1.5 text-[9.5px] font-bold text-brand-high">추천</span>
              )}
              {n.student_id && (
                <span className="ml-1.5 text-[9.5px] font-bold text-purple-700">추가</span>
              )}
            </button>
          )
        })}

        {hasRec && !showAll && others.length > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="rounded-lg border border-dashed border-line px-3 py-2 text-[12.5px] text-ink-muted hover:border-brand-high-light hover:text-brand-high"
          >
            다른 과목 {others.length}개 보기
          </button>
        )}

        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-lg border border-dashed border-line px-3 py-2 text-[12.5px] text-ink-muted hover:border-brand-high-light hover:text-brand-high"
          >
            + 직접 추가
          </button>
        )}
      </div>

      {adding && (
        <div className="flex gap-2 mt-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
            placeholder="목록에 없는 과목 이름"
            autoFocus
            className="flex-1 h-9 border border-line rounded-lg px-3 text-[12.5px] outline-none focus:border-brand-high"
          />
          <button
            onClick={submitCustom}
            disabled={!custom.trim() || addCustom.isPending}
            className="h-9 px-3.5 bg-brand-high text-white rounded-lg text-[12px] font-bold disabled:opacity-40"
          >
            추가
          </button>
          <button
            onClick={() => { setAdding(false); setCustom('') }}
            className="h-9 px-3 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold"
          >
            취소
          </button>
        </div>
      )}

      {(select.isError || addCustom.isError) && (
        <div className="text-[11.5px] text-red-600 mt-2">
          {((select.error ?? addCustom.error) as Error)?.message}
        </div>
      )}
    </div>
  )
}