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

interface Alt {
  title: string
  desc?: string
  from: string
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
  /** 다시 추천받기 누를 때마다 올려서 새로 요청 */
  const [nonce, setNonce] = useState(0)
  /** 🎯 버튼을 눌러야 AI가 돈다. 화면에 들어오는 것만으로 호출되지 않게.
   *  null = 아직 안 누름 / 'career' = 진로 연계 / 'keep' = 과목 심화 */
  const [askedDir, setAskedDir] = useState<'career' | 'keep' | null>(null)

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
  /** 화면·프롬프트에는 계열이 아니라 학과를 쓴다 */
  const major = c?.major ?? goal
  const typeKey = (aptitude?.type_key as TypeKey) ?? 'aa'
  const type = TYPES[typeKey]
  const areas = node?.areas ?? []

  const splitMode = siblings[0]?.split_mode ?? 'full'
  const isSecondTerm = splitMode === 'term' && slot === 2
  const charLimit = splitMode === 'full' ? 500 : 250
  const prevTitle = isSecondTerm
    ? (siblings.find((t) => t.slot === 1)?.title ?? null)
    : null

  /** 추천 버튼을 누를 수 있는 상태인가 (학습영역이 있으면 먼저 골라야 함) */
  const canAsk = areas.length === 0 || !!area

  // ── AI 추천 (버튼을 눌러야 실행) ──────────────────────────
  const {
    data: aiAlts,
    isFetching: aiLoading,
    error: aiErrorObj,
    refetch: refetchAlts,
  } = useQuery({
    queryKey: ['topic-alts', nodeId, area, askedDir, nonce],
    // 🎯 askedDir 가 핵심. 이게 없으면 화면에 들어오는 순간 AI가 돈다.
    enabled: !!askedDir && !!node && !!nodeId && canAsk,
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<Alt[]> => {
      const { data, error } = await supabase.functions.invoke('research-coach', {
        body: {
          mode: 'alts',
          // 🎯 진로 연계 / 과목 심화 중 학생이 고른 쪽만 받는다.
          //    모든 과목을 진로에 억지로 엮으면 세특이 작위적이 된다.
          direction: askedDir ?? 'career',
          major,
          grade: `고${grade}`,
          job: c?.career ?? undefined,
          subject: node?.subject_name,
          topic: area ? `${node?.subject_name} - ${area}` : node?.subject_name,
          previousTopic: prevTitle ?? undefined,
        },
      })
      if (error || (data as any)?.error) {
        throw new Error(error?.message || (data as any)?.error)
      }
      const pack: Alt[] = [
        ...((data as any).dbAlts ?? []).map((a: any) => ({ ...a, from: '실제 사례' })),
        ...((data as any).careerAlts ?? []).map((a: any) => ({ ...a, from: '진로 연계' })),
        ...((data as any).keepAlts ?? []).map((a: any) => ({ ...a, from: '영역 심화' })),
      ]
      if (pack.length === 0) throw new Error('제안을 받지 못했어요')
      return pack
    },
  })

  const aiError = aiErrorObj ? ((aiErrorObj as Error).message ?? '알 수 없는 오류') : null

  /** 추천 버튼 — 같은 방향을 또 누르면 새로 요청 */
  const askAi = (dir: 'career' | 'keep') => {
    if (!canAsk) return
    if (askedDir === dir) setNonce((n) => n + 1)
    setAskedDir(dir)
  }

  /** AI가 실패했을 때만 보여주는 기본 틀 */
  const fallbackCandidates = useMemo(() => {
    if (!area) return []
    if (isSecondTerm) {
      return [
        `1학기 탐구를 확장해 「${area}」와 ${major}의 연결을 더 깊이 ${type.verb}`,
        `「${area}」에서 1학기에 남은 의문을 ${major} 관점에서 다시 ${type.verb}`,
        `1학기 결과를 바탕으로 「${area}」의 적용 범위를 ${major} 시각에서 ${type.verb}`,
      ]
    }
    return [
      `「${area}」 개념을 ${major} 관점에서 ${type.verb}하는 탐구`,
      `${major} 분야에서 「${area}」가 실제로 어떻게 쓰이는지 ${type.verb}`,
      `「${area}」의 한계를 ${major} 시각에서 짚고 대안을 ${type.verb}`,
    ]
  }, [area, major, type, isSecondTerm])

  const showFallback = !aiLoading && !!aiError && fallbackCandidates.length > 0

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
      const topicId = data.id as string

      // 🎯 생기부·탐구주제 탭·도서 탭은 high_research 를 본다.
      //    로드맵에서 정한 주제가 그쪽에도 보이도록 같이 넣는다.
      //    roadmap_topic_id 가 유니크라 주제를 바꿔도 행이 늘지 않고 갱신된다.
      const { error: rErr } = await supabase.from('high_research').upsert(
        {
          student_id: studentId,
          academy_id: academyId,
          roadmap_topic_id: topicId,
          subject: node?.subject_name ?? null,
          topic: v.title,
          grade,
          semester: isSecondTerm ? 2 : 1,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'roadmap_topic_id' },
      )
      // 생기부 연동이 실패해도 주제 저장 자체는 살린다
      if (rErr) console.error('[high_research 연동 실패]', rErr.message)

      return topicId
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
                <span className="w-2 h-2 rounded-full" style={{ background: line.color }} />
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
            {type.name} · {major} 기준 · 세특 {charLimit}자
            {splitMode !== 'full' && ` · ${isSecondTerm ? '2학기' : '1학기'}`}
          </div>
        </div>

        {isSecondTerm && prevTitle && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 mb-4">
            <div className="text-[11px] font-bold text-purple-800 mb-1">1학기에 한 탐구</div>
            <div className="text-[13px] text-purple-900">{prevTitle}</div>
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
                {node.subject_name}에서 배우는 영역이에요. 고른 다음 아래 추천 버튼을 눌러주세요.
              </div>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {areas.map((a) => {
                  const on = area === a
                  return (
                    <button
                      key={a}
                      // 영역을 바꾸면 이전 추천은 지우고 다시 누르게 한다
                      onClick={() => {
                        setArea(a)
                        setAskedDir(null)
                      }}
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
              이 과목엔 학습영역이 아직 등록돼 있지 않아요. 아래 추천을 보거나 직접 적어주세요.
            </div>
          )}

          {/* 추천 주제 */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 mb-5">
            <div className="text-[13px] font-bold text-purple-900 mb-1">추천 주제</div>
            <div className="text-[11px] text-ink-muted mb-3 leading-relaxed">
              어느 쪽으로 찾을지 골라주세요.
              {area && ` 「${area}」 영역 기준.`}
            </div>

            {areas.length > 0 && !area && (
              <div className="text-[12.5px] text-ink-muted py-3">
                위에서 학습영역을 먼저 골라주세요.
              </div>
            )}

            {/* 🎯 방향 두 갈래 — 모든 과목을 진로에 억지로 엮지 않는다 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => askAi('career')}
                disabled={!canAsk || aiLoading}
                className="text-left rounded-xl border-2 px-3.5 py-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: askedDir === 'career' ? '#7C3AED' : '#E9D5FF',
                  background: askedDir === 'career' ? '#7C3AED' : '#fff',
                }}
              >
                <div
                  className="text-[12.5px] font-extrabold mb-0.5"
                  style={{ color: askedDir === 'career' ? '#fff' : '#6D28D9' }}
                >
                  🎯 진로 연계
                  {askedDir === 'career' && !aiLoading && (
                    <span className="ml-1 text-[10px] font-bold opacity-80">· 다시 받기</span>
                  )}
                </div>
                <div
                  className="text-[10.5px] leading-[1.5]"
                  style={{ color: askedDir === 'career' ? 'rgba(255,255,255,0.85)' : '#94A3B8' }}
                >
                  {major}와 이어지는 주제로 찾아요
                </div>
              </button>

              <button
                onClick={() => askAi('keep')}
                disabled={!canAsk || aiLoading}
                className="text-left rounded-xl border-2 px-3.5 py-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: askedDir === 'keep' ? '#2563EB' : '#BFDBFE',
                  background: askedDir === 'keep' ? '#2563EB' : '#fff',
                }}
              >
                <div
                  className="text-[12.5px] font-extrabold mb-0.5"
                  style={{ color: askedDir === 'keep' ? '#fff' : '#1D4ED8' }}
                >
                  📚 과목 심화
                  {askedDir === 'keep' && !aiLoading && (
                    <span className="ml-1 text-[10px] font-bold opacity-80">· 다시 받기</span>
                  )}
                </div>
                <div
                  className="text-[10.5px] leading-[1.5]"
                  style={{ color: askedDir === 'keep' ? 'rgba(255,255,255,0.85)' : '#94A3B8' }}
                >
                  {node.subject_name}에서 배우는 걸로 파고들어요
                </div>
              </button>
            </div>

            {/* 아직 안 눌렀을 때 */}
            {!askedDir && !aiLoading && canAsk && (
              <div className="text-[12px] text-ink-muted leading-[1.6] bg-white/70 rounded-lg px-3 py-2.5">
                진로와 잘 안 엮이는 과목도 있어요. 그럴 땐 <b className="text-blue-700">📚 과목 심화</b>가
                더 자연스러운 세특이 됩니다.
              </div>
            )}

            {aiLoading && (
              <div className="text-[12.5px] text-ink-muted py-4 text-center">
                {area ? `「${area}」에서 ` : ''}맞는 주제를 찾는 중이에요…
              </div>
            )}

            {!aiLoading && aiError && (
              <div className="text-[12px] text-red-600 mb-2">
                {aiError}{' '}
                <button
                  onClick={() => refetchAlts()}
                  className="font-bold underline underline-offset-2"
                >
                  다시 시도
                </button>
              </div>
            )}

            {!aiLoading && aiAlts && (
              <div className="flex flex-col gap-2">
                {aiAlts.map((a, i) => (
                  <div key={`${a.title}-${i}`} className="bg-white border border-purple-200 rounded-lg p-3.5">
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

          {/* 추천을 못 받았을 때만 보이는 기본 틀 */}
          {showFallback && (
            <>
              <div className="text-[13px] font-bold text-ink mb-1">기본 주제 틀</div>
              <div className="text-[11px] text-ink-muted mb-2.5">
                추천을 받지 못해 기본형을 보여드려요. 그대로 쓰기보다 고쳐 쓰는 걸 권해요.
              </div>
              <div className="flex flex-col gap-2 mb-5">
                {fallbackCandidates.map((t, i) => (
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