import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState, academyState } from '@/lib/auth/atoms'
import {
  goalTextOf,
  type RoadmapLine,
  type RoadmapNode,
  type CareerSeriesData,
  type Grade,
} from '@/pages/high-student/_hooks/useRoadmap'
import { TYPES, type TypeKey } from './AptitudeTest'

type SplitMode = 'full' | 'two' | 'term'

const SPLIT_OPTIONS: { key: SplitMode; title: string; desc: string; slots: number }[] = [
  { key: 'full', title: '선생님 1명 · 500자 통합', desc: '큰 탐구주제 1개', slots: 1 },
  { key: 'two', title: '선생님 2명 · 250자 + 250자', desc: '독립 주제 2개', slots: 2 },
  { key: 'term', title: '1학기 · 2학기 분리 · 250 + 250', desc: '연결된 주제 2개 (기초 → 심화)', slots: 2 },
]

interface TopicRow {
  id: string
  slot: number
  split_mode: SplitMode
  area: string | null
  title: string
  detail: string | null
  source: string
  status: string
}

interface Props {
  line: RoadmapLine
  node: RoadmapNode
  grade: Grade
  career: CareerSeriesData
  onClose: () => void
  /** 다른 과목으로 바꿨을 때 부모가 열려 있는 노드를 교체하도록 */
  onSwitchNode?: (node: RoadmapNode) => void
}

export default function SubjectDetail({ line, node, grade, career, onClose, onSwitchNode }: Props) {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined

  const [split, setSplit] = useState<SplitMode>('full')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customName, setCustomName] = useState('')

  const c = career.byGrade.get(grade)
  const goal = goalTextOf(c)
  const areas = node.areas ?? []

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

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['node-topics', studentId, node.id],
    enabled: !!studentId,
    queryFn: async (): Promise<TopicRow[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_topic')
        .select('id, slot, split_mode, area, title, detail, source, status')
        .eq('student_id', studentId!)
        .eq('node_id', node.id)
        .order('slot')
      if (error) throw error
      return (data ?? []) as TopicRow[]
    },
  })

  // ── 이 칸의 과목 후보 (마스터 + 내가 추가한 것) ──────────
  const { data: candidates = [] } = useQuery({
    queryKey: ['node-candidates', node.line_id, grade, studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<RoadmapNode[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_node')
        .select(
          'id, line_id, grade, subject_name, areas, is_default, elective_group, category, recommended_series, student_id, sort_order',
        )
        .eq('line_id', node.line_id)
        .eq('grade', grade)
        .or(`student_id.is.null,student_id.eq.${studentId!}`)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as RoadmapNode[]
    },
  })

  const refreshBoard = () => {
    qc.invalidateQueries({ queryKey: ['high-roadmap-board', studentId] })
    qc.invalidateQueries({ queryKey: ['node-candidates', node.line_id, grade, studentId] })
  }

  /** 이 칸에서 들을 과목 고르기 — progress row가 생기면 그게 선택 */
  const selectNode = useMutation({
    mutationFn: async (target: RoadmapNode) => {
      if (!studentId || !academyId) throw new Error('학생 정보가 없습니다')

      // 같은 칸의 다른 과목 중 아직 완료 안 한 선택은 지운다
      const others = candidates.filter((c) => c.id !== target.id).map((c) => c.id)
      if (others.length) {
        await supabase
          .from('high_roadmap_progress')
          .delete()
          .eq('student_id', studentId)
          .in('node_id', others)
          .eq('is_completed', false)
      }

      const { error } = await supabase.from('high_roadmap_progress').upsert(
        {
          student_id: studentId,
          academy_id: academyId,
          node_id: target.id,
          is_completed: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,node_id', ignoreDuplicates: true },
      )
      if (error) throw error
      return target
    },
    onSuccess: (target) => {
      refreshBoard()
      setPickerOpen(false)
      onSwitchNode?.(target)
    },
  })

  /** 목록에 없는 과목 직접 추가 */
  const addCustom = useMutation({
    mutationFn: async (name: string) => {
      if (!studentId || !academyId) throw new Error('학생 정보가 없습니다')

      const { data, error } = await supabase
        .from('high_roadmap_node')
        .insert({
          line_id: node.line_id,
          grade,
          subject_name: name.trim(),
          is_default: false,
          elective_group: node.elective_group,
          student_id: studentId,
          academy_id: academyId,
          source: 'custom',
          sort_order: 999,
        })
        .select(
          'id, line_id, grade, subject_name, areas, is_default, elective_group, category, recommended_series, student_id, sort_order',
        )
        .single()
      if (error) throw error
      return data as RoadmapNode
    },
    onSuccess: (created) => {
      setCustomName('')
      selectNode.mutate(created)
    },
  })

  // 저장된 주제가 있으면 그 배분 방식을 따라간다
  const effectiveSplit = topics[0]?.split_mode ?? split
  const slots = SPLIT_OPTIONS.find((o) => o.key === effectiveSplit)?.slots ?? 1

  return (
    <div className="max-w-[880px] mx-auto">
      <div className="bg-white border border-line rounded-2xl">
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-line sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: line.color }}
                />
                <span className="text-[11px] font-bold" style={{ color: line.color }}>
                  {line.name}
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
        </div>

        <div className="px-6 py-5">
          {/* 내가 듣는 과목 */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="text-[13px] font-bold text-ink">내가 듣는 과목</div>
              {candidates.length > 1 && (
                <button
                  onClick={() => setPickerOpen(!pickerOpen)}
                  className="h-8 px-3 bg-white border border-line text-ink-secondary rounded-lg text-[11.5px] font-semibold hover:bg-gray-50"
                >
                  {pickerOpen ? '닫기' : `바꾸기 (후보 ${candidates.length})`}
                </button>
              )}
            </div>
            <div className="text-[11px] text-ink-muted mb-2.5">
              학교마다 개설 과목이 달라요. 실제로 듣는 과목을 골라주세요.
            </div>

            {!pickerOpen ? (
              <div className="rounded-xl border border-line bg-gray-50 px-4 py-3 flex items-center gap-2 flex-wrap">
                <span className="text-[14px] font-bold text-ink">{node.subject_name}</span>
                {node.student_id && (
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    내가 추가함
                  </span>
                )}
                {candidates.length <= 1 && (
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="ml-auto text-[11.5px] font-semibold text-brand-high hover:underline"
                  >
                    다른 과목 추가
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {candidates.map((cd) => {
                  const on = cd.id === node.id
                  return (
                    <button
                      key={cd.id}
                      onClick={() => !on && selectNode.mutate(cd)}
                      disabled={selectNode.isPending}
                      className="text-left rounded-xl px-4 py-3 border transition-all flex items-center gap-2.5 disabled:opacity-50"
                      style={{
                        borderColor: on ? '#2563EB' : '#E5E7EB',
                        background: on ? '#EFF6FF' : '#fff',
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0 border-2"
                        style={{
                          borderColor: on ? '#2563EB' : '#CBD5E1',
                          background: on ? '#2563EB' : '#fff',
                        }}
                      />
                      <span className="flex-1 min-w-0">
                        <span
                          className="text-[13.5px]"
                          style={{ color: on ? '#1E3A8A' : '#334155', fontWeight: on ? 700 : 500 }}
                        >
                          {cd.subject_name}
                        </span>
                        {cd.areas && cd.areas.length > 0 && (
                          <span className="block text-[10.5px] text-ink-muted mt-0.5">
                            {cd.areas.join(' · ')}
                          </span>
                        )}
                      </span>
                      {cd.student_id && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full flex-shrink-0">
                          내가 추가함
                        </span>
                      )}
                    </button>
                  )
                })}

                <div className="flex gap-2 mt-1">
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && customName.trim() && addCustom.mutate(customName)
                    }
                    placeholder="목록에 없는 과목이면 직접 적어주세요"
                    className="flex-1 h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-brand-high"
                  />
                  <button
                    onClick={() => customName.trim() && addCustom.mutate(customName)}
                    disabled={!customName.trim() || addCustom.isPending}
                    className="h-10 px-4 bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-40"
                  >
                    추가
                  </button>
                </div>

                {(selectNode.isError || addCustom.isError) && (
                  <div className="text-[12px] text-red-600">
                    {((selectNode.error ?? addCustom.error) as Error)?.message}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 배분 선택 */}
          <div className="text-[13px] font-bold text-ink mb-1">
            이 과목 세특은 어떻게 작성되나요?
          </div>
          <div className="text-[11px] text-ink-muted mb-2.5">
            학교·과목마다 달라요. 배분에 따라 탐구주제 개수가 달라집니다.
          </div>

          <div className="flex flex-col gap-2 mb-6">
            {SPLIT_OPTIONS.map((o) => {
              const on = effectiveSplit === o.key
              const locked = topics.length > 0 && !on
              return (
                <button
                  key={o.key}
                  onClick={() => !locked && setSplit(o.key)}
                  disabled={locked}
                  className="text-left rounded-xl px-4 py-3 border transition-all flex items-center gap-2.5 disabled:opacity-40"
                  style={{
                    borderColor: on ? '#2563EB' : '#E5E7EB',
                    background: on ? '#EFF6FF' : '#fff',
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 border-2"
                    style={{
                      borderColor: on ? '#2563EB' : '#CBD5E1',
                      background: on ? '#2563EB' : '#fff',
                    }}
                  />
                  <span>
                    <span
                      className="text-[13px]"
                      style={{ color: on ? '#1E3A8A' : '#334155', fontWeight: on ? 700 : 500 }}
                    >
                      {o.title}
                    </span>
                    <span className="block text-[11px] text-ink-muted mt-0.5">→ {o.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {topics.length > 0 && (
            <div className="text-[11px] text-ink-muted mb-4 -mt-4">
              이미 주제를 만들어서 배분 방식은 고정돼 있어요. 바꾸려면 주제를 먼저 지워주세요.
            </div>
          )}

          {/* 탐구 시작 */}
          <div className="text-[13px] font-bold text-ink mb-1">탐구</div>
          <div className="text-[11px] text-ink-muted mb-3">
            주제를 정하면 자료조사부터 활동 정리까지 5단계로 진행해요.
          </div>

          {isLoading ? (
            <div className="text-[12px] text-ink-muted py-4">불러오는 중…</div>
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from({ length: slots }, (_, i) => i + 1).map((slot) => {
                const existing = topics.find((t) => t.slot === slot)
                const slotLabel =
                  slots === 1
                    ? '500자'
                    : effectiveSplit === 'term'
                      ? `${slot}학기 250자`
                      : `선생님${slot === 1 ? 'A' : 'B'} 250자`

                return (
                  <button
                    key={slot}
                    onClick={() =>
                      navigate(
                        existing
                          ? `/high-student/roadmap-v2/topic/${existing.id}`
                          : `/high-student/roadmap-v2/node/${node.id}/topic/${slot}`,
                      )
                    }
                    className="text-left rounded-xl border-2 px-4 py-3.5 transition-all"
                    style={{
                      borderColor: existing ? '#F59E0B' : '#E5E7EB',
                      background: existing ? '#FFFBEB' : '#fff',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                        style={{ background: existing ? '#F59E0B' : '#94A3B8' }}
                      >
                        {slotLabel}
                      </span>
                      {existing?.area && (
                        <span className="text-[10.5px] text-ink-muted">{existing.area}</span>
                      )}
                      <span className="ml-auto text-[11.5px] font-semibold text-brand-high">
                        {existing ? '이어서 하기 →' : '주제 정하기 →'}
                      </span>
                    </div>
                    <div
                      className="text-[14px] font-bold leading-snug"
                      style={{ color: existing ? '#78350F' : '#94A3B8' }}
                    >
                      {existing ? existing.title : '아직 주제를 정하지 않았어요'}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {areas.length === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
              이 과목엔 학습영역이 아직 등록돼 있지 않아요. 직접 입력으로 주제를 적을 수 있어요.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}