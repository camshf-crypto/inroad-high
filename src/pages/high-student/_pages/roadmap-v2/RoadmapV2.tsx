import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
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
import CareerConcept from '@/pages/high-student/_pages/concept/CareerConcept'

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

  /** 학생이 단계를 직접 눌러 이동한 경우 (null이면 자동 판정) */
  const [manualStep, setManualStep] = useState<Step | null>(null)
  /** 보드에서 열어본 진로 전환 (career.pivots 인덱스) */
  const [openPivot, setOpenPivot] = useState<number | null>(null)
  const [showNext, setShowNext] = useState(false)


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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNext(true)}
              className="h-9 px-3.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-[12px] font-semibold hover:bg-amber-50"
            >
              이어서 할 탐구
            </button>
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
        <div className="max-w-[680px] mx-auto mb-5">
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

      {/* 단계별 화면 */}
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

      {/* 보드 */}
      {step === 'board' &&
        (boardError ? (
          <div className="text-[13px] text-red-600">
            불러오지 못했어요: {(boardError as Error).message}
          </div>
        ) : !board || !career ? (
          <div className="text-[13px] text-ink-muted">로드맵을 그리는 중…</div>
        ) : showNext ? (
          <NextIdeas myGrade={myGrade} onClose={() => setShowNext(false)} />
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
              onToggleComplete={(node, next) => toggle.mutate({ node, next })}
              onEditGoal={() => setManualStep(3)}
              onNodeClick={(_line, node) =>
                navigate(`/high-student/roadmap-v2/node/${node.id}`)
              }
            />
          </>
        ))}

      </div>
    </div>
  )
}