import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState, academyState } from '@/lib/auth/atoms'
import {
  useHighRoadmapBoard,
  useMyCareerSeries,
  useToggleNodeComplete,
  useMySchoolActivities,
  type Grade,
} from '@/pages/high-student/_hooks/useRoadmap'
import RoadmapBoard from './RoadmapBoard'
import AptitudeTest from './AptitudeTest'
import SchoolActivityInput from './SchoolActivityInput'
import SubjectSetup from './SubjectSetup'
import TargetGoalSetup from './TargetGoalSetup'
import PivotSummary from './PivotSummary'
import NextIdeas from './NextIdeas'
import MonthlyScore from './MonthlyScore'
import AdmitCompare from './AdmitCompare'
import CareerConcept from '@/pages/high-student/_pages/concept/CareerConcept'
import { useMyReadings } from '@/pages/high-student/_hooks/useMyHighReading'
import BookChain from './BookChain'

type Step = 1 | 2 | 3 | 4 | 5 | 'board'

const STEP_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '성향 진단',
  2: '진로 계열 검사',
  3: '최종 목표',
  4: '내 과목 설정',
  5: '학교 활동 입력',
}

const TEXT_GRADE: Record<string, Grade> = { '고1': 1, '고2': 2, '고3': 3 }

export default function RoadmapV2() {
  const navigate = useNavigate()
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined
  const myGrade: Grade = TEXT_GRADE[String(student?.grade ?? '고1')] ?? 1

  /** 주소로 단계를 지정해 들어온 경우 (/roadmap-v2?step=4) */
  const [params] = useSearchParams()
  const stepParam = params.get('step')

  /** 학생이 단계를 직접 눌러 이동한 경우 (null이면 자동 판정) */
  const [manualStep, setManualStep] = useState<Step | null>(
    stepParam && ['1', '2', '3', '4', '5'].includes(stepParam)
      ? (Number(stepParam) as Step)
      : null,
  )
  /** 보드에서 열어본 진로 전환 (career.pivots 인덱스) */
  const [openPivot, setOpenPivot] = useState<number | null>(null)
  const [showNext, setShowNext] = useState(false)
  const [showScore, setShowScore] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [showBook, setShowBook] = useState(false)


  // 1단계 — 성향 진단
  const { data: aptitude, isLoading: aptLoading } = useQuery({
    queryKey: ['my-aptitude', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('high_aptitude_result')
        .select('type_key, type_name, scores, retake_count')
        .eq('student_id', studentId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  // 2단계 — 진로 계열 검사
  const { data: concepts, isLoading: conceptLoading } = useQuery({
    queryKey: ['my-concept-done', studentId, academyId],
    enabled: !!studentId && !!academyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_concept')
        .select('grade, status, major')
        .eq('student_id', studentId!)
        .eq('academy_id', academyId!)
      if (error) throw error
      return data ?? []
    },
  })

  // 3단계 — 최종 목표 (고3 행에 학과가 정해졌는지)
  const targetDone = useMemo(
    () =>
      (concepts ?? []).some(
        (c) => c.grade === '고3' && !!c.major && c.status === 'completed',
      ),
    [concepts],
  )

  // 4단계 — 학교 활동
  const { data: activities = [], isLoading: actLoading } = useMySchoolActivities()

  // 보드 데이터
  const { data: board, error: boardError } = useHighRoadmapBoard()
  const { data: career } = useMyCareerSeries()

  /** 🎯 선생님이 보낸 코멘트.
   *  과목에 들어가야만 보이면 학생이 놓친다. 로드맵을 열 때 바로 띄운다. */
  const { data: comments = [] } = useQuery({
    queryKey: ['my-topic-comments', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('high_roadmap_topic')
        .select(
          'id, node_id, title, teacher_comment, commented_at, high_roadmap_node(subject_name, grade)',
        )
        .eq('student_id', studentId!)
        .not('teacher_comment', 'is', null)
        .order('commented_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  /** 코멘트가 달린 노드 — 보드에 ! 표시 */
  const commentedNodes = useMemo(
    () => new Set((comments as any[]).map((c) => c.node_id)),
    [comments],
  )

  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeSeen, setNoticeSeen] = useState(false)

  // 코멘트가 있으면 한 번 띄운다. 닫으면 그 세션에선 다시 안 뜬다.
  useEffect(() => {
    if (noticeSeen) return
    if (comments.length === 0) return
    setNoticeOpen(true)
    setNoticeSeen(true)
  }, [comments.length, noticeSeen])
  const toggle = useToggleNodeComplete()

  const doneMap = useMemo(() => {
    const conceptDone = (concepts ?? []).some(
      (c) => !!c.major && (c.status === 'completed' || c.status === 'approved'),
    )
    return {
      1: !!aptitude,
      2: conceptDone,
      3: targetDone,
      // 과목을 하나라도 고르거나 체크했으면 통과 (기본 과목으로도 보드는 그려짐)
      4: (board?.progress.size ?? 0) > 0,
      5: activities.length > 0,
    }
  }, [aptitude, concepts, targetDone, activities, board])

  const loading = aptLoading || conceptLoading || actLoading

  // 아직 안 끝난 첫 단계가 현재 단계
  const autoStep: Step =
    !doneMap[1] ? 1
      : !doneMap[2] ? 2
        : !doneMap[3] ? 3
          : !doneMap[4] ? 4
            : !doneMap[5] ? 5
              : 'board'
  const step: Step = manualStep ?? autoStep
  const allDone = doneMap[1] && doneMap[2] && doneMap[3] && doneMap[4] && doneMap[5]

  /**
   * 내가 고른 과목 — 현재 학년에서 직접 선택한 것만.
   * 공통국어1·2 처럼 뒤에 숫자만 다른 과목은 하나로 묶는다.
   */
  const mySubjects = useMemo(() => {
    if (!board) return []
    const picked = new Set<string>()
    for (const byGrade of board.nodesByLine.values()) {
      for (const n of byGrade.get(myGrade) ?? []) {
        if (board.progress.has(n.id)) {
          picked.add(n.subject_name.replace(/\s*[12]$/, ''))
        }
      }
    }
    return [...picked].sort()
  }, [board, myGrade])

  /** 학년·과목별 담은 책 권수 — 보드 노드에 배지로 */
  const { data: allReadings = [] } = useMyReadings()
  const bookCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of allReadings as any[]) {
      const g = Number(r.grade) || myGrade
      const raw = (r.subject ?? '').trim()
      if (!raw) continue
      for (const sj of raw.split('·').map((x: string) => x.trim()).filter(Boolean)) {
        const k = `${g}|${sj}`
        m.set(k, (m.get(k) ?? 0) + 1)
      }
    }
    return m
  }, [allReadings, myGrade])

  /** 보드 탭 전환 */
  const openTab = (key: 'board' | 'score' | 'compare' | 'next' | 'book') => {
    setShowScore(key === 'score')
    setShowCompare(key === 'compare')
    setShowNext(key === 'next')
    setShowBook(key === 'book')
    setOpenPivot(null)
  }

  if (loading) {
    return <div className="p-6 text-[13px] text-ink-muted">불러오는 중…</div>
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="max-w-[1200px] mx-auto">
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[20px] font-extrabold text-brand-high-dark">입시 로드맵</div>
          <div className="text-[12px] text-ink-muted mt-0.5">
            3년 생기부, 한 흐름으로 설계하기
          </div>
        </div>

        {step === 'board' && (
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { key: 'board', label: '입시 로드맵' },
              { key: 'book', label: '독서' },
              { key: 'score', label: '월별 점수' },
              { key: 'compare', label: '합격 생기부 비교' },
              { key: 'next', label: '이어서 할 탐구' },
            ] as const).map((t) => {
              const on =
                t.key === 'board'
                  ? !showScore && !showCompare && !showNext && !showBook && openPivot === null
                  : t.key === 'score'
                    ? showScore
                    : t.key === 'compare'
                      ? showCompare
                      : t.key === 'book'
                        ? showBook
                        : showNext
              return (
                <button
                  key={t.key}
                  onClick={() => openTab(t.key)}
                  className="h-9 px-3.5 rounded-lg text-[12px] transition-all border"
                  style={{
                    background: on ? '#2563EB' : '#fff',
                    color: on ? '#fff' : '#6B7280',
                    borderColor: on ? '#2563EB' : '#E5E7EB',
                    fontWeight: on ? 700 : 600,
                  }}
                >
                  {t.label}
                </button>
              )
            })}

            <span className="w-px h-6 bg-slate-200 mx-0.5" />

            <button
              onClick={() => setManualStep(3)}
              className="h-9 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold hover:bg-gray-50"
            >
              진로 바꾸기
            </button>
            <button
              onClick={() => setManualStep(1)}
              className="h-9 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold hover:bg-gray-50"
            >
              준비 단계 수정
            </button>
            <button
              onClick={() => navigate('/high-student/record')}
              className="h-9 px-3.5 bg-brand-high text-white rounded-lg text-[12px] font-bold hover:bg-brand-high-dark transition-all"
            >
              내 생기부 보기 →
            </button>
          </div>
        )}
      </div>

      {/* 진행 표시 */}
      {step !== 'board' && (
        <div className="max-w-[760px] mx-auto mb-5">
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map((s) => {
              const on = step === s
              const ok = doneMap[s]
              return (
                <button
                  key={s}
                  onClick={() => setManualStep(s)}
                  className="flex-1 text-left group"
                  title={`${STEP_LABEL[s]}(으)로 이동`}
                >
                  <div
                    className="h-1 rounded-full mb-1.5 transition-all"
                    style={{ background: ok || on ? '#2563EB' : '#E2E8F0' }}
                  />
                  <div
                    className="text-[11px] transition-all"
                    style={{
                      color: ok || on ? '#1E3A8A' : '#94A3B8',
                      fontWeight: on ? 700 : 500,
                    }}
                  >
                    {ok ? '✓ ' : ''}
                    {STEP_LABEL[s]}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 mt-3">
            {step !== 1 && (
              <button
                onClick={() => setManualStep(((step as number) - 1) as Step)}
                className="h-9 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold hover:bg-gray-50"
              >
                ← 이전 단계
              </button>
            )}

            {step !== 5 && (
              <button
                onClick={() => setManualStep(((step as number) + 1) as Step)}
                className="h-9 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold hover:bg-gray-50"
              >
                다음 단계 →
              </button>
            )}

            {allDone && (
              <button
                onClick={() => setManualStep('board')}
                className="h-9 px-3.5 bg-brand-high text-white rounded-lg text-[12px] font-bold hover:bg-brand-high-dark ml-auto"
              >
                로드맵 보러 가기 →
              </button>
            )}
          </div>
        </div>
      )}

      {/* 단계별 화면 — 가운데 정렬 */}
      {step !== 'board' && (
        <div className="flex justify-center">
          <div className="w-full max-w-[760px]">
          {step === 1 && <AptitudeTest onDone={() => setManualStep(2)} />}

        {step === 2 && (
          <div>
            <div className="max-w-[680px] mb-3 rounded-xl border border-brand-high-light bg-brand-high-pale px-4 py-3 text-[12px] text-brand-high-dark">
              학년별로 계열 → 학과 → 직업군을 좁혀가요. 지금 학년만 먼저 해도 괜찮아요.
            </div>

            <CareerConcept />

            {doneMap[2] && (
              <button
                onClick={() => setManualStep(3)}
                className="mt-4 h-11 px-5 bg-brand-high text-white rounded-xl text-[13px] font-bold hover:bg-brand-high-dark transition-all"
              >
                다음: 최종 목표 정하기 →
              </button>
            )}
          </div>
        )}

        {step === 3 &&
          (!career ? (
            <div className="text-[13px] text-ink-muted">불러오는 중…</div>
          ) : (
            <TargetGoalSetup career={career} myGrade={myGrade} onDone={() => setManualStep(4)} />
          ))}

        {step === 4 &&
          (!board || !career ? (
            <div className="text-[13px] text-ink-muted">과목 목록을 불러오는 중…</div>
          ) : (
            <SubjectSetup
              board={board}
              career={career}
              myGrade={myGrade}
              onDone={() => setManualStep(5)}
            />
          ))}

        {step === 5 && (
          <SchoolActivityInput myGrade={myGrade} onDone={() => setManualStep('board')} />
        )}
          </div>
        </div>
      )}

      {/* 보드 */}
      {step === 'board' &&
        (boardError ? (
          <div className="text-[13px] text-red-600">
            불러오지 못했어요: {(boardError as Error).message}
          </div>
        ) : !board || !career ? (
          <div className="text-[13px] text-ink-muted">로드맵을 그리는 중…</div>
        ) : showScore ? (
          <MonthlyScore onClose={() => setShowScore(false)} />
        ) : showCompare ? (
          <AdmitCompare onClose={() => setShowCompare(false)} />
        ) : showNext ? (
          <NextIdeas myGrade={myGrade} onClose={() => setShowNext(false)} />
        ) : showBook ? (
          <div>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => openTab('board')}
                className="h-9 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
            <BookChain
              myGrade={myGrade}
              series={career.seriesUnion[0] ?? null}
              major={career.byGrade.get(myGrade)?.major ?? null}
              career={career.byGrade.get(myGrade)?.career ?? null}
              subjects={mySubjects}
            />
          </div>
        ) : openPivot !== null && career.pivots[openPivot] ? (
          <PivotSummary
            fromMajor={career.pivots[openPivot].fromMajor}
            toMajor={career.pivots[openPivot].toMajor}
            fromSeries={career.pivots[openPivot].fromSeries}
            toSeries={career.pivots[openPivot].toSeries}
            atGrade={career.pivots[openPivot].toGrade}
            ctaLabel="과목 설정으로 가기 →"
            onCta={() => { setOpenPivot(null); setManualStep(4) }}
            onClose={() => setOpenPivot(null)}
          />
        ) : (
          <>
            {career.pivots.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {career.pivots.map((p, i) => (
                  <button
                    key={`${p.fromGrade}-${p.toGrade}`}
                    onClick={() => setOpenPivot(i)}
                    className="w-full text-left rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 flex items-center gap-2 flex-wrap hover:bg-amber-100 transition-colors"
                  >
                    <span className="text-[11px] font-bold text-amber-900">
                      고{p.fromGrade} → 고{p.toGrade} 진로 변경
                    </span>
                    <span className="text-[12px] text-amber-900">
                      {p.fromMajor} → <b>{p.toMajor}</b>
                    </span>
                    <span className="ml-auto text-[11px] font-semibold text-amber-800">
                      승계 보기 →
                    </span>
                  </button>
                ))}
              </div>
            )}

            <RoadmapBoard
              board={board}
              career={career}
              myGrade={myGrade}
              bookCounts={bookCounts}
              commentedNodes={commentedNodes}
              onToggleComplete={(node, next) => toggle.mutate({ node, next })}
              onEditGoal={() => setManualStep(3)}
              onSetupSubjects={() => setManualStep(4)}
              onNodeClick={(_line, node) =>
                navigate(`/high-student/roadmap-v2/node/${node.id}`)
              }
            />
          </>
        ))}

      </div>

      {/* 🎯 선생님 코멘트 알림 — 로드맵을 열면 바로 뜬다.
          과목에 들어가야만 보이면 학생이 놓친다. */}
      {noticeOpen && comments.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          onClick={() => setNoticeOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[460px] max-h-[80vh] overflow-y-auto shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-start justify-between gap-3">
              <div>
                <div className="text-[16px] font-extrabold text-ink">
                  💬 선생님이 보낸 말이 있어요
                </div>
                <div className="text-[12px] text-ink-secondary mt-0.5">
                  {comments.length}개 · 눌러서 주제를 고쳐보세요
                </div>
              </div>
              <button
                onClick={() => setNoticeOpen(false)}
                className="text-[16px] text-ink-muted hover:text-ink flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex flex-col gap-2">
              {comments.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setNoticeOpen(false)
                    navigate(`/high-student/roadmap-v2/node/${c.node_id}`)
                  }}
                  className="text-left rounded-xl border-2 border-blue-200 bg-blue-50/60 px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-[10px] font-extrabold text-white bg-blue-600 px-2 py-0.5 rounded-full">
                      고{c.high_roadmap_node?.grade} ·{' '}
                      {c.high_roadmap_node?.subject_name}
                    </span>
                    {c.commented_at && (
                      <span className="text-[10px] text-ink-muted">
                        {new Date(c.commented_at).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] font-bold text-brand-high">
                      고치러 가기 →
                    </span>
                  </div>
                  <div className="text-[12.5px] font-bold text-ink leading-snug mb-1">
                    {c.title}
                  </div>
                  <div className="text-[12px] text-ink-secondary leading-[1.6] whitespace-pre-wrap">
                    {c.teacher_comment}
                  </div>
                </button>
              ))}
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => setNoticeOpen(false)}
                className="w-full h-10 bg-white border border-line text-ink-secondary rounded-xl text-[12.5px] font-bold hover:bg-gray-50"
              >
                나중에 볼게요
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}