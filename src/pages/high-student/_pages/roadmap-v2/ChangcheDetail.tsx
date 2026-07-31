import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState, academyState } from '@/lib/auth/atoms'
import {
  goalTextOf,
  GOAL_BASIS,
  CATEGORY_LABEL,
  useMySchoolActivities,
  type RoadmapLine,
  type RoadmapNode,
  type CareerSeriesData,
  type ChangcheCategory,
  type Grade,
} from '@/pages/high-student/_hooks/useRoadmap'
import { TYPES, type TypeKey } from './AptitudeTest'

/** 라인 키 → 창체 영역 */
const LINE_CATEGORY: Record<string, ChangcheCategory> = {
  career: '진로',
  auto: '자율',
  club: '동아리',
}

/** 성향별로 잘 맞는 활동 키워드 */
const HINTS: Record<TypeKey, string[]> = {
  aa: ['탐구', '분석', '독서', '조사', '학술'],
  ac: ['융합', '기획', '아이디어', '프로젝트'],
  ai: ['캠페인', '자치', '회의', '개선', '봉사'],
  ar: ['축제', '제작', '방송', '창작', '공연'],
}

interface Diff {
  title: string
  what: string
  why: string
  point: string
}

function makeDiffs(activity: string, goal: string, typeName: string, verb: string): Diff[] {
  return [
    {
      title: `${goal} 관점의 특화 주제 맡기`,
      what: `${activity}에 참여하되, ${goal}와 연결된 주제나 코너를 하나 맡아서 진행해요.`,
      why: `친구들은 일반적으로 참여하지만, 나는 ${goal} 관심을 활동에 녹여 방향성을 보여줘요.`,
      point: '진로 연계성과 주도성이 함께 드러나요',
    },
    {
      title: `${verb} 기반 산출물 남기기`,
      what: `${activity} 과정을 ${verb}해서 보고서나 자료로 정리해 남겨요.`,
      why: `단순 참여로 끝내지 않고 ${typeName}답게 결과물을 만들어요.`,
      point: '과정과 결과가 기록으로 남아 역량을 입증해요',
    },
    {
      title: `${goal} 관련 문제 발견하고 제안하기`,
      what: `${activity}을(를) 하면서 ${goal} 시각으로 개선점을 찾아 대안을 제안해요.`,
      why: '수동적 참여가 아니라 문제의식을 갖고 능동적으로 기여해요.',
      point: '비판적 사고와 공동체 기여가 함께 드러나요',
    },
  ]
}

interface ChangcheRow {
  id: string
  activity_name: string
  diff_source: 'ai' | 'history'
  diff_title: string
  diff_what: string | null
  diff_why: string | null
  diff_point: string | null
  status: string
}

interface Props {
  line: RoadmapLine
  node: RoadmapNode
  grade: Grade
  career: CareerSeriesData
  onClose: () => void
}

export default function ChangcheDetail({ line, node, grade, career, onClose }: Props) {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const qc = useQueryClient()

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined

  const category = LINE_CATEGORY[line.line_key] ?? '자율'
  const c = career.byGrade.get(grade)
  const goal = goalTextOf(c)

  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null)

  const { data: aptitude } = useQuery({
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

  const typeKey = (aptitude?.type_key as TypeKey) ?? 'aa'
  const type = TYPES[typeKey]

  const { data: activities = [] } = useMySchoolActivities(grade)
  const mine = activities.filter((a) => a.category === category)

  // 지금까지 만든 탐구주제 — "내가 한 활동과 엮기"용
  const { data: history = [] } = useQuery({
    queryKey: ['my-topics-brief', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('high_roadmap_topic')
        .select('id, title, goal_text, created_at')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false })
        .limit(3)
      if (error) throw error
      return data ?? []
    },
  })

  const { data: saved } = useQuery({
    queryKey: ['node-changche', studentId, node.id],
    enabled: !!studentId,
    queryFn: async (): Promise<ChangcheRow | null> => {
      const { data, error } = await supabase
        .from('high_roadmap_changche')
        .select('id, activity_name, diff_source, diff_title, diff_what, diff_why, diff_point, status')
        .eq('student_id', studentId!)
        .eq('node_id', node.id)
        .maybeSingle()
      if (error) throw error
      return data as ChangcheRow | null
    },
  })

  const save = useMutation({
    mutationFn: async (v: {
      activityId: string | null
      activityName: string
      source: 'ai' | 'history'
      diff: Diff
      linkedId?: string
    }) => {
      if (!studentId || !academyId) throw new Error('학생 정보가 없습니다')

      const { error } = await supabase.from('high_roadmap_changche').upsert(
        {
          student_id: studentId,
          academy_id: academyId,
          node_id: node.id,
          activity_id: v.activityId,
          activity_name: v.activityName,
          diff_source: v.source,
          diff_title: v.diff.title,
          diff_what: v.diff.what,
          diff_why: v.diff.why,
          diff_point: v.diff.point,
          linked_table: v.linkedId ? 'high_roadmap_topic' : null,
          linked_id: v.linkedId ?? null,
          goal_basis: GOAL_BASIS[grade],
          goal_text: goal,
          type_key: typeKey,
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,node_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['node-changche', studentId, node.id] })
      setPicked(null)
    },
  })

  const isRecommended = (name: string) =>
    HINTS[typeKey].some((h) => name.includes(h))

  const diffs = useMemo(
    () => (picked ? makeDiffs(picked.name, goal, type.name, type.verb) : []),
    [picked, goal, type],
  )

  return (
    <div className="max-w-[880px]">
      <div className="bg-white border border-line rounded-2xl">
        <div className="px-6 py-5 border-b border-line sticky top-0 bg-white z-10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ background: line.color }} />
              <span className="text-[11px] font-bold" style={{ color: line.color }}>
                {CATEGORY_LABEL[category]}
              </span>
            </div>
            <div className="text-[18px] font-extrabold text-ink">
              고{grade} · {node.subject_name}
            </div>
            <div className="text-[12px] text-ink-secondary mt-0.5">
              {type.name} · {goal} 기준
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold hover:bg-gray-50 flex-shrink-0"
          >
            ← 로드맵으로
          </button>
        </div>

        <div className="px-6 py-5">
          {/* 이미 정한 경우 */}
          {saved && !picked && (
            <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 mb-5">
              <div className="text-[11px] font-bold text-green-800 mb-1">✓ 정한 차별화 활동</div>
              <div className="text-[14px] font-extrabold text-green-900 mb-1">
                {saved.activity_name}
              </div>
              <div className="text-[13px] text-green-800 leading-relaxed mb-2">
                {saved.diff_title}
              </div>
              {saved.diff_what && (
                <div className="text-[12px] text-green-700 leading-relaxed">{saved.diff_what}</div>
              )}
              <button
                onClick={() => setPicked({ id: '', name: saved.activity_name })}
                className="mt-3 text-[11.5px] font-semibold text-ink-secondary bg-white border border-line rounded-lg px-3 py-1.5 hover:bg-gray-50"
              >
                다시 정하기
              </button>
            </div>
          )}

          {!picked ? (
            <>
              <div className="text-[13px] font-bold text-ink mb-1">활동 고르기</div>
              <div className="text-[11px] text-ink-muted mb-3">
                우리 학교 {CATEGORY_LABEL[category]} 중에서 참여할 활동을 골라요 ·{' '}
                <span className="text-brand-high font-bold">추천</span>은 {type.name}에게 잘 맞는
                활동
              </div>

              {mine.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
                  이 학년의 {CATEGORY_LABEL[category]}이 아직 입력돼 있지 않아요. 준비 단계에서
                  학교 활동을 먼저 적어주세요.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {mine.map((a) => {
                    const rec = isRecommended(a.name)
                    return (
                      <button
                        key={a.id}
                        onClick={() => setPicked({ id: a.id, name: a.name })}
                        className="text-left rounded-xl border px-4 py-3 flex items-center justify-between gap-2.5 transition-all"
                        style={{
                          borderColor: rec ? '#93C5FD' : '#E5E7EB',
                          background: rec ? '#EFF6FF' : '#fff',
                        }}
                      >
                        <span
                          className="text-[14px] font-bold"
                          style={{ color: rec ? '#1E3A8A' : '#334155' }}
                        >
                          {a.name}
                        </span>
                        {rec && (
                          <span className="text-[10px] font-extrabold text-white bg-brand-high px-2.5 py-0.5 rounded-full flex-shrink-0">
                            추천
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900 leading-relaxed">
                활동 자체는 다른 친구들과 같아도 괜찮아요. 다음 단계에서{' '}
                <b>나만의 차별화 요소 한 가지</b>를 만들어요.
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                <span className="text-[12px] font-bold text-white bg-brand-high px-3 py-1.5 rounded-lg">
                  {picked.name}
                </span>
                <span className="text-ink-muted font-extrabold">×</span>
                <span className="text-[12px] font-bold text-white bg-purple-600 px-3 py-1.5 rounded-lg">
                  {goal}
                </span>
                <span className="text-ink-muted">→</span>
                <span className="text-[12px] font-bold text-amber-900 bg-amber-50 border border-amber-400 px-3 py-1.5 rounded-lg">
                  차별화 요소
                </span>
              </div>

              <div className="text-[12px] text-ink-secondary mb-3 leading-relaxed">
                같은 <b>{picked.name}</b>이라도 {goal} 관심과 {type.name} 성향을 살려 남들과 다르게
                만들어요.
              </div>

              <div className="text-[11.5px] font-extrabold text-brand-high mb-2">
                추천 차별화
              </div>
              <div className="flex flex-col gap-2 mb-5">
                {diffs.map((d, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      save.mutate({
                        activityId: picked.id || null,
                        activityName: picked.name,
                        source: 'ai',
                        diff: d,
                      })
                    }
                    disabled={save.isPending}
                    className="text-left rounded-xl border-2 border-line p-4 hover:border-amber-400 hover:bg-amber-50/60 transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-extrabold text-white bg-ink-muted px-2 py-0.5 rounded-full">
                        추천 {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-[14px] font-extrabold text-ink">{d.title}</span>
                    </div>
                    <div className="text-[12.5px] text-ink-secondary leading-relaxed mb-2">
                      {d.what}
                    </div>
                    <div className="text-[11.5px] text-amber-800 mb-0.5">
                      <b>왜 차별화</b> · {d.why}
                    </div>
                    <div className="text-[11.5px] text-brand-high">
                      <b>생기부 포인트</b> · {d.point}
                    </div>
                  </button>
                ))}
              </div>

              {history.length > 0 && (
                <>
                  <div className="text-[11.5px] font-extrabold text-purple-700 mb-2">
                    내가 한 탐구와 엮기
                  </div>
                  <div className="flex flex-col gap-2 mb-5">
                    {history.map((h) => {
                      const d: Diff = {
                        title: `${h.title}을(를) ${picked.name}로 확장`,
                        what: `이미 한 탐구를 ${picked.name}에서 이어가며 ${goal}와 연결된 후속 활동으로 발전시켜요.`,
                        why: '활동이 따로 놀지 않고 하나의 흐름으로 이어져요.',
                        point: '활동 간 연결로 일관된 탐구 스토리가 완성돼요',
                      }
                      return (
                        <button
                          key={h.id}
                          onClick={() =>
                            save.mutate({
                              activityId: picked.id || null,
                              activityName: picked.name,
                              source: 'history',
                              diff: d,
                              linkedId: h.id,
                            })
                          }
                          disabled={save.isPending}
                          className="text-left rounded-xl border-2 border-line p-4 hover:border-purple-400 hover:bg-purple-50/60 transition-all disabled:opacity-50"
                        >
                          <div className="text-[10px] font-bold text-white bg-purple-600 px-2 py-0.5 rounded-full inline-block mb-1.5">
                            내 탐구주제
                          </div>
                          <div className="text-[13.5px] font-extrabold text-ink mb-1.5">
                            {h.title}
                          </div>
                          <div className="text-[12px] text-ink-secondary leading-relaxed">
                            → {d.what}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              <button
                onClick={() => setPicked(null)}
                className="text-[12px] font-semibold text-brand-high bg-brand-high-pale border border-brand-high-light rounded-lg px-3.5 py-2"
              >
                ← 다른 활동 고르기
              </button>

              {save.isError && (
                <div className="text-[12px] text-red-600 mt-3">
                  저장하지 못했어요: {(save.error as Error).message}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}