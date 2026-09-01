import { useEffect, useMemo, useState } from 'react'
import {
  selectVisibleLines,
  useSelectNode,
  useAddCustomNode,
  type RoadmapBoardData,
  type RoadmapNode,
  type CareerSeriesData,
  type Grade,
} from '@/pages/high-student/_hooks/useRoadmap'
// 🎯 고른 과목이 진로와 이어지는지 판정 (subject-fit-check 엣지 함수)
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const GRADES: Grade[] = [1, 2, 3]

interface FitResult {
  fit: number
  verdict: 'strong' | 'partial' | 'weak'
  summary: string
  matched: { subject: string; link: string; useIdea: string }[]
  unmatched: { subject: string; reason: string; rescue: string }[]
  missing: { subject: string; why: string }[]
  swap: { from: string; to: string; why: string }[]
  advice: string
}

/** 공통과목 중 목록에서 감출 대체 과목 */
const HIDDEN_COMMON = ['기본수학', '기본영어']

interface Props {
  board: RoadmapBoardData
  career: CareerSeriesData
  myGrade?: Grade
  onDone?: () => void
}

export default function SubjectSetup({ board, career, myGrade = 1, onDone }: Props) {
  const [grade, setGrade] = useState<Grade>(myGrade)

  /** 현재 학년 +1 까지만 열림 (고1 → 고2까지, 고2 → 고3까지) */
  const maxGrade = Math.min(3, myGrade + 1) as Grade

  // 잠긴 학년을 보고 있으면 열린 마지막 학년으로 되돌린다
  useEffect(() => {
    if (grade > maxGrade) setGrade(maxGrade)
  }, [grade, maxGrade])

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

    // 공통과목은 전원 이수라 고르는 게 아니다.
    // 공통국어1·2 처럼 뒤에 숫자만 다른 과목은 하나로 묶고,
    // 기본수학·기본영어는 대체 과목이라 목록에서 뺀다.
    const seen = new Set<string>()
    const req: string[] = []
    for (const c of cells) {
      for (const n of c.all) {
        if (n.category !== '공통') continue
        const base = n.subject_name.replace(/\s*[12]$/, '')
        if (HIDDEN_COMMON.includes(base)) continue
        if (seen.has(base)) continue
        seen.add(base)
        req.push(base)
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

  // ── 🎯 진로 적합도 판정 ───────────────────────────────
  const [fit, setFit] = useState<FitResult | null>(null)
  const myCareer = career.byGrade.get(grade)

  // 학년을 바꾸면 이전 판정은 지운다
  useEffect(() => { setFit(null) }, [grade])

  const pickedNodes = useMemo(
    () =>
      choosable.flatMap((c) =>
        c.candidates
          .filter((n) => board.progress.has(n.id))
          .map((n) => ({
            line: c.line.name,
            name: n.subject_name,
            category: n.category ?? null,
            recommendedSeries: n.recommended_series ?? null,
          })),
      ),
    [choosable, board.progress],
  )

  const availableNodes = useMemo(
    () =>
      choosable.flatMap((c) =>
        c.candidates
          .filter((n) => !board.progress.has(n.id))
          .map((n) => ({
            line: c.line.name,
            name: n.subject_name,
            category: n.category ?? null,
            recommendedSeries: n.recommended_series ?? null,
          })),
      ),
    [choosable, board.progress],
  )

  // 🎯 AI가 뽑은 과목만 배지로. 계열만 보고 미리 다는 배지는 쓰지 않는다.
  const aiPick = useMemo(() => {
    const m = new Map<string, string>()
    fit?.missing.forEach((x) => m.set(x.subject, x.why))
    fit?.swap.forEach((x) => { if (!m.has(x.to)) m.set(x.to, x.why) })
    return m
  }, [fit])

  const aiWeak = useMemo(() => {
    const m = new Map<string, string>()
    fit?.unmatched.forEach((x) => m.set(x.subject, x.reason))
    return m
  }, [fit])

  /** 🎯 선생님이 이 학년 과목 조합에 보낸 코멘트.
   *  "간호학과인데 화학Ⅱ가 없다" 같은 건 여기서 학생이 본다. */
  const { data: teacherNote } = useQuery({
    queryKey: ['subject-note', grade],
    queryFn: async () => {
      const { data: me } = await supabase.auth.getUser()
      if (!me?.user?.id) return null
      const { data, error } = await supabase
        .from('high_subject_note')
        .select('comment, commented_at:updated_at')
        .eq('student_id', me.user.id)
        .eq('grade', grade)
        .maybeSingle()
      if (error) return null
      return data
    },
  })

  const checkFit = useMutation({
    mutationFn: async (): Promise<FitResult> => {
      const { data, error } = await supabase.functions.invoke('subject-fit-check', {
        body: {
          grade,
          series: myCareer?.series ?? null,
          major: myCareer?.major ?? null,
          career: myCareer?.career ?? null,
          picked: pickedNodes,
          available: availableNodes,
          required,
          needCount: choosable.length,
        },
      })
      // invoke는 400/500에서 본문을 안 꺼내준다. 직접 읽어야 진짜 이유가 보인다.
      if (error) {
        let detail = ''
        try {
          const res = (error as any)?.context
          if (res && typeof res.json === 'function') {
            const b = await res.json()
            detail = b?.error || b?.message || ''
          }
        } catch { /* JSON이 아니면 무시 */ }
        throw new Error(detail || error.message || '확인에 실패했어요.')
      }
      if (!data?.success) throw new Error(data?.error || '확인에 실패했어요.')
      return data.analysis as FitResult
    },
    onSuccess: (r) => setFit(r),
    onError: (e: any) => alert(e.message || '확인에 실패했어요.'),
  })

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
          const locked = g > maxGrade
          return (
            <button
              key={g}
              onClick={() => !locked && setGrade(g)}
              disabled={locked}
              title={locked ? `고${maxGrade} 때 열려요` : undefined}
              className="px-3.5 py-1.5 rounded-full text-[12px] border transition-all flex items-center gap-1"
              style={{
                background: on ? '#2563EB' : locked ? '#F8FAFC' : '#fff',
                color: on ? '#fff' : locked ? '#CBD5E1' : '#6B7280',
                borderColor: on ? '#2563EB' : '#E5E7EB',
                fontWeight: on ? 700 : 500,
                cursor: locked ? 'not-allowed' : 'pointer',
              }}
            >
              고{g}
              {locked && <span className="text-[10px]">🔒</span>}
            </button>
          )
        })}
      </div>

      {maxGrade < 3 && (
        <div className="text-[11px] text-ink-muted mb-4 -mt-2">
          고{maxGrade + 1}은 고{maxGrade}가 되면 열려요.
        </div>
      )}

      {choosable.length === 0 ? (
        <div className="rounded-xl border border-line bg-gray-50 px-4 py-6 text-center text-[13px] text-ink-secondary">
          고{grade}에는 고를 과목이 없어요. 다음 학년을 확인해보세요.
        </div>
      ) : (
        <>
          {/* 🎯 선생님 코멘트 — 과목은 한번 고르면 1년을 산다.
              그래서 고르기 전에 제일 먼저 보여야 한다. */}
          {teacherNote?.comment && (
            <div className="rounded-xl bg-blue-50 border-2 border-blue-300 px-4 py-3 mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[12px] font-extrabold text-blue-800">
                  💬 선생님이 보낸 말
                </span>
                {teacherNote.commented_at && (
                  <span className="text-[10px] text-ink-muted">
                    {new Date(teacherNote.commented_at).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>
              <div className="text-[12.5px] text-ink leading-[1.7] whitespace-pre-wrap">
                {teacherNote.comment}
              </div>
            </div>
          )}

          {/* 🎯 진로 적합도 — 이 화면은 과목을 고르는 곳이다.
              탐구 방향은 여기서 말하지 않는다. 그건 탐구주제 단계의 일이다. */}
          <div className="rounded-xl border border-line bg-white px-4 py-3 mb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12.5px] font-bold text-ink">
                  지금 고른 과목, 진로랑 맞을까?
                </div>
                <div className="text-[11px] text-ink-secondary mt-0.5 leading-[1.5]">
                  {myCareer?.major || myCareer?.career || myCareer?.series ? (
                    <>
                      <b className="text-brand-high">
                        {[myCareer.series, myCareer.major, myCareer.career]
                          .filter(Boolean)
                          .join(' · ')}
                      </b>{' '}
                      기준
                    </>
                  ) : (
                    '진로 계열 검사를 먼저 해야 확인할 수 있어요.'
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={checkFit.isPending || pickedNodes.length === 0 || !myCareer}
                onClick={() => checkFit.mutate()}
                className="h-8 px-3.5 rounded-lg text-[11.5px] font-bold transition-all flex-shrink-0 disabled:opacity-40"
                style={{ background: '#2563EB', color: '#fff' }}
              >
                {checkFit.isPending ? '확인 중...' : fit ? '다시 확인' : '확인하기'}
              </button>
            </div>

            {fit && (
              <div className="mt-3 pt-3 border-t border-line">
                {/* 한 줄 요약 */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        fit.verdict === 'strong' ? '#ECFDF5'
                        : fit.verdict === 'weak' ? '#FEF2F2' : '#FFFBEB',
                      color:
                        fit.verdict === 'strong' ? '#065F46'
                        : fit.verdict === 'weak' ? '#991B1B' : '#92400E',
                    }}
                  >
                    {fit.verdict === 'strong' ? '잘 이어져요'
                      : fit.verdict === 'weak' ? '연결이 약해요' : '일부만 이어져요'}
                  </span>
                  <span className="text-[13px] font-extrabold text-ink">{fit.fit}%</span>
                </div>

                {/* 이어지는 과목 / 약한 과목 — 이름만 */}
                {fit.matched.length > 0 && (
                  <div className="text-[11.5px] leading-[1.7]">
                    <span className="text-ink-secondary">진로와 이어져요 · </span>
                    {fit.matched.map((m) => m.subject).join(', ')}
                  </div>
                )}
                {fit.unmatched.length > 0 && (
                  <div className="text-[11.5px] leading-[1.7]">
                    <span className="text-amber-700">연결이 약해요 · </span>
                    {fit.unmatched.map((u) => u.subject).join(', ')}
                  </div>
                )}

                {/* 추가하면 좋을 과목 — 과목 이름만 */}
                {fit.missing.length > 0 && (
                  <div className="text-[11.5px] leading-[1.7]">
                    <span className="text-brand-high">더 넣으면 좋아요 · </span>
                    {fit.missing.map((m) => m.subject).join(', ')}
                  </div>
                )}

                <div className="text-[10.5px] text-ink-muted mt-2 leading-[1.5]">
                  과목별로 어떤 탐구를 하면 좋을지는 로드맵의 탐구주제에서 알려줄게요.
                </div>
              </div>
            )}
          </div>

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
                aiPick={aiPick}
                aiWeak={aiWeak}
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
  lineName, lineColor, grade, lineId, candidates, progress, mySeries, aiPick, aiWeak,
}: {
  lineName: string
  lineColor: string
  grade: Grade
  lineId: string
  candidates: RoadmapNode[]
  progress: Map<string, unknown>
  mySeries: string | null
  /** AI가 "더 넣으면 좋다"고 뽑은 과목 → 이유 */
  aiPick: Map<string, string>
  /** AI가 "연결이 약하다"고 본 과목 → 이유 */
  aiWeak: Map<string, string>
}) {
  const select = useSelectNode()
  const addCustom = useAddCustomNode()
  const [custom, setCustom] = useState('')
  const [adding, setAdding] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const chosen = candidates.find((n) => progress.has(n.id))
  const shown = chosen ?? candidates.find((n) => n.is_default) ?? candidates[0]

  // 🎯 배지는 AI 판정 결과로만 단다.
  //    계열만 보고 미리 붙이면 한 계통 과목이 전부 "추천"이 돼서 의미가 없다.
  const isPicked = (n: RoadmapNode) => aiPick.has(n.subject_name)
  const isWeak = (n: RoadmapNode) => aiWeak.has(n.subject_name)

  // 접어두기는 계열 기준을 그대로 쓴다 (33개씩 쏟아지는 걸 막는 용도)
  const inMySeries = (n: RoadmapNode) =>
    !!mySeries && !!n.recommended_series?.includes(mySeries)

  const near = candidates.filter((n) => inMySeries(n) || isPicked(n) || progress.has(n.id))
  const others = candidates.filter((n) => !near.includes(n))
  const hasRec = near.length > 0 && others.length > 0
  const visible = !hasRec || showAll ? candidates : near

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
          {mySeries}계열에서 자주 듣는 과목이에요
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {visible.map((n) => {
          const on = chosen ? n.id === chosen.id : false
          const pick = isPicked(n)   // AI가 넣으라고 한 과목
          const weak = isWeak(n)     // AI가 약하다고 본 과목 (이미 고른 것)
          return (
            <button
              key={n.id}
              onClick={() => select.mutate({ target: n, siblings: candidates })}
              disabled={select.isPending}
              title={aiPick.get(n.subject_name) || aiWeak.get(n.subject_name) || undefined}
              className="rounded-lg border px-3 py-2 text-left transition-all disabled:opacity-50"
              style={{
                borderColor: on
                  ? weak ? '#FCD34D' : '#2563EB'
                  : pick ? '#2563EB' : '#E5E7EB',
                background: on ? (weak ? '#FFFBEB' : '#EFF6FF') : pick ? '#F8FAFF' : '#fff',
                borderWidth: pick && !on ? 2 : 1,
              }}
            >
              <span
                className="text-[12.5px]"
                style={{ color: on ? '#1E3A8A' : '#334155', fontWeight: on ? 700 : 500 }}
              >
                {n.subject_name}
              </span>
              {pick && !on && (
                <span className="ml-1.5 text-[9.5px] font-bold text-brand-high">+추천</span>
              )}
              {on && weak && (
                <span className="ml-1.5 text-[9.5px] font-bold text-amber-700">연결 약함</span>
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