import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState, academyState } from '@/lib/auth/atoms'
import {
  goalTextOf,
  GOAL_BASIS,
  useMyCareerSeries,
  type Grade,
} from '@/pages/high-student/_hooks/useRoadmap'
import { TYPES, type TypeKey } from './AptitudeTest'

interface NodeRow {
  id: string
  grade: number
  subject_name: string
  areas: string[] | null
  high_roadmap_line: { name: string; color: string } | null
}

export default function TopicCreate() {
  const { nodeId, slot: slotParam } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined

  const slot = Number(slotParam ?? 1)

  const [area, setArea] = useState<string>('')
  const [custom, setCustom] = useState('')
  const [aiAlts, setAiAlts] = useState<{ title: string; desc: string; from: string }[] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const { data: node, isLoading } = useQuery({
    queryKey: ['roadmap-node', nodeId],
    enabled: !!nodeId,
    queryFn: async (): Promise<NodeRow | null> => {
      const { data, error } = await supabase
        .from('high_roadmap_node')
        .select('id, grade, subject_name, areas, high_roadmap_line(name, color)')
        .eq('id', nodeId!)
        .maybeSingle()
      if (error) throw error
      return data as unknown as NodeRow | null
    },
  })

  const { data: career } = useMyCareerSeries()

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

  /** 같은 노드의 다른 슬롯 (1학기 → 2학기 연결용) */
  const { data: siblings = [] } = useQuery({
    queryKey: ['node-topics', studentId, nodeId],
    enabled: !!studentId && !!nodeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('high_roadmap_topic')
        .select('id, slot, split_mode, title')
        .eq('student_id', studentId!)
        .eq('node_id', nodeId!)
        .order('slot')
      if (error) throw error
      return data ?? []
    },
  })

  const grade = (node?.grade ?? 1) as Grade
  const c = career?.byGrade.get(grade)
  const goal = goalTextOf(c)
  const typeKey = (aptitude?.type_key as TypeKey) ?? 'aa'
  const type = TYPES[typeKey]
  const areas = node?.areas ?? []

  const splitMode = siblings[0]?.split_mode ?? 'full'
  const isSecondTerm = splitMode === 'term' && slot === 2
  const charLimit = splitMode === 'full' ? 500 : 250

  const candidates = useMemo(() => {
    if (!area) return []
    if (isSecondTerm) {
      return [
        `1학기 탐구를 확장해 「${area}」와 ${goal}의 연결을 더 깊이 ${type.verb}`,
        `「${area}」에서 1학기에 남은 의문을 ${goal} 관점에서 다시 ${type.verb}`,
        `1학기 결과를 바탕으로 「${area}」의 적용 범위를 ${goal} 시각에서 ${type.verb}`,
      ]
    }
    return [
      `「${area}」 개념을 ${goal} 관점에서 ${type.verb}하는 탐구`,
      `${goal} 분야에서 「${area}」가 실제로 어떻게 쓰이는지 ${type.verb}`,
      `「${area}」의 한계를 ${goal} 시각에서 짚고 대안을 ${type.verb}`,
    ]
  }, [area, goal, type, isSecondTerm])

  /** 세특 라이브러리와 진로를 근거로 AI가 주제를 제안 */
  const askAI = async () => {
    if (aiLoading) return
    setAiLoading(true)
    setAiError(null)
    setAiAlts(null)
    try {
      const { data, error } = await supabase.functions.invoke('research-coach', {
        body: {
          mode: 'alts',
          direction: 'both',
          major: c?.major ?? goal,
          grade: `고${grade}`,
          job: c?.career ?? undefined,
          subject: node?.subject_name,
          topic: area ? `${node?.subject_name} - ${area}` : node?.subject_name,
        },
      })
      if (error || data?.error) throw new Error(error?.message || data?.error)

      const pack = [
        ...(data.dbAlts ?? []).map((a: any) => ({ ...a, from: '실제 사례' })),
        ...(data.careerAlts ?? []).map((a: any) => ({ ...a, from: '진로 연계' })),
        ...(data.keepAlts ?? []).map((a: any) => ({ ...a, from: '영역 심화' })),
      ]
      if (pack.length === 0) throw new Error('제안을 받지 못했어요')
      setAiAlts(pack)
    } catch (e: any) {
      setAiError(e?.message ?? '알 수 없는 오류')
    } finally {
      setAiLoading(false)
    }
  }

  const save = useMutation({
    mutationFn: async (v: { title: string; source: string }) => {
      if (!studentId || !academyId || !nodeId) throw new Error('정보가 없습니다')

      const parent = isSecondTerm ? (siblings.find((t) => t.slot === 1)?.id ?? null) : null

      const { data, error } = await supabase
        .from('high_roadmap_topic')
        .upsert(
          {
            student_id: studentId,
            academy_id: academyId,
            node_id: nodeId,
            slot,
            split_mode: splitMode,
            char_limit: charLimit,
            parent_topic_id: parent,
            link_type: parent ? 'deepen' : null,
            area: area || null,
            title: v.title,
            source: v.source,
            goal_basis: GOAL_BASIS[grade],
            goal_text: goal,
            series: c?.series ?? null,
            major: c?.major ?? null,
            type_key: typeKey,
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,node_id,slot' },
        )
        .select('id')
        .single()

      if (error) throw error
      return data.id as string
    },
    onSuccess: (topicId) => {
      qc.invalidateQueries({ queryKey: ['node-topics', studentId, nodeId] })
      navigate(`/high-student/roadmap-v2/topic/${topicId}`, { replace: true })
    },
  })

  if (isLoading || !node) {
    return <div className="p-6 text-[13px] text-ink-muted">불러오는 중…</div>
  }

  const line = node.high_roadmap_line

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="max-w-[760px] mx-auto">
        <button
          onClick={() => navigate(`/high-student/roadmap-v2/node/${nodeId}`)}
          className="text-[12px] font-semibold text-ink-secondary hover:text-ink mb-3"
        >
          ← 과목으로
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-1">
            {line && (
              <>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: line.color }}
                />
                <span className="text-[11px] font-bold" style={{ color: line.color }}>
                  {line.name}
                </span>
              </>
            )}
            <span className="text-[10.5px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full ml-1">
              고{grade} · {node.subject_name}
            </span>
          </div>

          <div className="text-[18px] font-extrabold text-ink">탐구주제 정하기</div>
          <div className="text-[12px] text-ink-secondary mt-0.5">
            {type.name} · {goal} 기준 · 세특 {charLimit}자
            {splitMode !== 'full' && ` · ${isSecondTerm ? '2학기' : '1학기'}`}
          </div>
        </div>

        {isSecondTerm && siblings.find((t) => t.slot === 1) && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 mb-4">
            <div className="text-[11px] font-bold text-purple-800 mb-1">1학기에 한 탐구</div>
            <div className="text-[13px] text-purple-900">
              {siblings.find((t) => t.slot === 1)?.title}
            </div>
            <div className="text-[11px] text-purple-700 mt-1.5">
              이걸 이어받아 더 깊이 들어가는 주제를 정해요.
            </div>
          </div>
        )}

        {siblings.find((t) => t.slot === slot) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-4">
            <div className="text-[11px] font-bold text-amber-900 mb-1">지금 정해둔 주제</div>
            <div className="text-[13px] text-amber-900">
              {siblings.find((t) => t.slot === slot)?.title}
            </div>
            <div className="text-[11px] text-amber-800 mt-1.5">
              새로 고르면 이 주제를 덮어써요. 이미 진행한 5단계 기록은 그대로 남아요.
            </div>
          </div>
        )}

        <div className="bg-white border border-line rounded-2xl p-5">
          {areas.length > 0 ? (
            <>
              <div className="text-[13px] font-bold text-ink mb-1">
                어느 학습영역에서 찾을까?
              </div>
              <div className="text-[11px] text-ink-muted mb-2.5">
                {node.subject_name}에서 배우는 영역이에요. 관심 가는 걸 고르면 주제 후보가 나와요.
              </div>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {areas.map((a) => {
                  const on = area === a
                  return (
                    <button
                      key={a}
                      onClick={() => setArea(a)}
                      className="px-3 py-2 rounded-lg text-[12.5px] border transition-all"
                      style={{
                        borderColor: on ? '#2563EB' : '#E5E7EB',
                        background: on ? '#EFF6FF' : '#fff',
                        color: on ? '#1E3A8A' : '#475569',
                        fontWeight: on ? 700 : 500,
                      }}
                    >
                      {a}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-5 text-[12px] text-amber-900">
              이 과목엔 학습영역이 아직 등록돼 있지 않아요. 아래에 주제를 직접 적어주세요.
            </div>
          )}

          {candidates.length > 0 && (
            <>
              <div className="text-[13px] font-bold text-ink mb-1">기본 주제 틀</div>
              <div className="text-[11px] text-ink-muted mb-2.5">
                학습영역 · 진로 · 성향을 조합한 기본형이에요. 아래 AI 추천이 더 구체적이에요.
              </div>
              <div className="flex flex-col gap-2 mb-5">
                {candidates.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <button
                      onClick={() => save.mutate({ title: t, source: 'ai' })}
                      disabled={save.isPending}
                      className="flex-1 text-left rounded-xl border border-line px-4 py-3 text-[13.5px] text-ink hover:border-brand-high hover:bg-brand-high-pale/40 transition-all disabled:opacity-50"
                    >
                      {t}
                    </button>
                    <button
                      onClick={() => setCustom(t)}
                      className="w-[64px] text-[11.5px] font-semibold text-ink-secondary border border-line rounded-xl hover:bg-gray-50"
                    >
                      고쳐쓰기
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* AI 추천 */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 mb-5">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[13px] font-bold text-purple-900">AI 추천</span>
              <button
                onClick={askAI}
                disabled={aiLoading}
                className="ml-auto h-9 px-3.5 bg-purple-600 text-white rounded-lg text-[12px] font-bold hover:bg-purple-700 disabled:opacity-40"
              >
                {aiLoading ? '찾는 중…' : aiAlts ? '다시 추천받기' : '주제 추천받기'}
              </button>
            </div>
            <div className="text-[11px] text-ink-muted mb-2.5 leading-relaxed">
              선배들의 실제 세특 사례와 {c?.major ?? goal} 진로를 근거로 제안해요.
              {area && ` 「${area}」 영역 기준.`}
            </div>

            {aiError && (
              <div className="text-[12px] text-red-600">{aiError}</div>
            )}

            {aiAlts && (
              <div className="flex flex-col gap-2">
                {aiAlts.map((a, i) => (
                  <div key={i} className="bg-white border border-purple-200 rounded-lg p-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9.5px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                        {a.from}
                      </span>
                    </div>
                    <div className="text-[13.5px] font-bold text-ink leading-snug mb-1">
                      {a.title}
                    </div>
                    {a.desc && (
                      <div className="text-[11.5px] text-ink-secondary leading-relaxed mb-2">
                        {a.desc}
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => save.mutate({ title: a.title, source: 'ai' })}
                        disabled={save.isPending}
                        className="h-8 px-3 bg-purple-600 text-white rounded-lg text-[11.5px] font-bold disabled:opacity-40"
                      >
                        이걸로 시작
                      </button>
                      <button
                        onClick={() => setCustom(a.title)}
                        className="h-8 px-3 bg-white border border-line text-ink-secondary rounded-lg text-[11.5px] font-semibold hover:bg-gray-50"
                      >
                        고쳐쓰기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[13px] font-bold text-ink mb-1">직접 적기</div>
          <div className="text-[11px] text-ink-muted mb-2">
            하고 싶은 게 따로 있으면 그게 제일 좋아요.
          </div>
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            rows={3}
            placeholder="예: 카페인이 청소년 수면에 미치는 영향을 자료로 확인해보기"
            className="w-full border border-line rounded-xl px-4 py-3 text-[13.5px] outline-none resize-y focus:border-brand-high mb-2.5"
          />

          <button
            onClick={() => custom.trim() && save.mutate({ title: custom.trim(), source: 'manual' })}
            disabled={!custom.trim() || save.isPending}
            className="w-full h-12 bg-brand-high text-white rounded-xl text-[14px] font-bold disabled:opacity-40"
          >
            {save.isPending ? '저장 중…' : '이 주제로 시작하기 →'}
          </button>

          {save.isError && (
            <div className="text-[12px] text-red-600 mt-2.5">
              {(save.error as Error).message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}