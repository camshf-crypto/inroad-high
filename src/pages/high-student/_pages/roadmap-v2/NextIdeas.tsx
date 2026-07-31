import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { TYPES, type TypeKey } from './AptitudeTest'
import { studentState } from '@/lib/auth/atoms'
import {
  selectVisibleLines,
  useHighRoadmapBoard,
  useMyCareerSeries,
  type Grade,
} from '@/pages/high-student/_hooks/useRoadmap'

interface Idea {
  id: string
  text: string
  status: string
  from_topic_id: string | null
  linked_node_id: string | null
}

/** "~도 알아보고 싶어요" 같은 꼬리를 떼고 핵심만 남긴다 */
function core(text: string): string {
  return text
    .trim()
    .replace(/[.!?]+$/, '')
    .replace(/(도|를|을|이|가)?\s*(더|좀)?\s*(알아보고|찾아보고|해보고|공부해보고|살펴보고)?\s*싶(어요|다|습니다|어)$/, '')
    .replace(/(에 대해|에 관해)$/, '')
    .trim()
}

/** 두 글자 이상 토큰만 뽑는다 */
function tokens(s: string): string[] {
  return (s.match(/[가-힣A-Za-z]{2,}/g) ?? []).map((t) => t.toLowerCase())
}

interface Props {
  myGrade: Grade
  onClose?: () => void
}

export default function NextIdeas({ myGrade, onClose }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showDropped, setShowDropped] = useState(false)
  const student = useAtomValue(studentState)
  const studentId = student?.id ? String(student.id) : undefined

  const { data: board } = useHighRoadmapBoard()
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

  const verb = TYPES[(aptitude?.type_key as TypeKey) ?? 'aa'].verb

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['my-next-ideas', studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<Idea[]> => {
      const { data, error } = await supabase
        .from('high_next_idea')
        .select('id, text, status, from_topic_id, linked_node_id')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Idea[]
    },
  })

  const setStatus = useMutation({
    mutationFn: async (v: { id: string; status: string }) => {
      const { error } = await supabase
        .from('high_next_idea')
        .update({ status: v.status, updated_at: new Date().toISOString() })
        .eq('id', v.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-next-ideas', studentId] }),
  })

  /** 씨앗 하나에 맞는 과목 후보 찾기 */
  const suggest = useMemo(() => {
    if (!board || !career) return () => []

    const lines = selectVisibleLines(board, career.seriesUnion)
    const lineName = new Map(lines.map((l) => [l.id, { name: l.name, color: l.color }]))

    // 앞으로 남은 학년의 과목만
    const pool: { nodeId: string; grade: number; subject: string; areas: string[]; lineId: string }[] = []
    for (const l of lines) {
      if (l.kind !== '세특') continue
      const byGrade = board.nodesByLine.get(l.id)
      if (!byGrade) continue
      for (const [g, nodes] of byGrade) {
        if (g < myGrade) continue
        for (const n of nodes) {
          pool.push({
            nodeId: n.id,
            grade: n.grade,
            subject: n.subject_name,
            areas: n.areas ?? [],
            lineId: l.id,
          })
        }
      }
    }

    return (text: string) => {
      const t = new Set(tokens(text))
      const scored = pool
        .map((p) => {
          const hay = tokens([p.subject, ...p.areas].join(' '))
          const hit = hay.filter((h) => t.has(h)).length
          // 어느 학습영역이 걸렸는지 — 주제 문장에 쓴다
          const matchedArea =
            p.areas.find((a) => tokens(a).some((x) => t.has(x))) ?? p.areas[0] ?? null
          return { ...p, score: hit, matchedArea, line: lineName.get(p.lineId) }
        })
        .filter((p) => p.score > 0)
        .sort((a, b) => b.score - a.score || a.grade - b.grade)

      // 같은 과목 중복 제거
      const seen = new Set<string>()
      return scored
        .filter((p) => (seen.has(p.subject) ? false : (seen.add(p.subject), true)))
        .slice(0, 4)
    }
  }, [board, career, myGrade])

  const open = ideas.filter((i) => i.status === 'open' || i.status === 'planned')
  const dropped = ideas.filter((i) => i.status === 'dropped')

  if (isLoading) {
    return <div className="text-[13px] text-ink-muted">불러오는 중…</div>
  }

  return (
    <div className="max-w-[760px] mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[16px] font-extrabold text-ink mb-1">이어서 할 탐구</div>
          <div className="text-[12px] text-ink-secondary leading-relaxed">
            탐구를 마치며 "더 알고 싶다"고 적어둔 것들이에요. 어느 과목에서 이어가면 좋을지
            같이 봐드릴게요.
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="h-9 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold hover:bg-gray-50 flex-shrink-0"
          >
            닫기
          </button>
        )}
      </div>

      {open.length === 0 ? (
        <div className="rounded-xl border border-line bg-gray-50 px-4 py-8 text-center">
          <div className="text-[13px] font-semibold text-ink-secondary mb-1">
            아직 모아둔 게 없어요
          </div>
          <div className="text-[11.5px] text-ink-muted leading-relaxed">
            탐구 작업실 5단계 '활동 정리'에서 "더 알고 싶은 것"을 적으면 여기 쌓여요.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {open.map((idea) => {
            const picks = suggest(idea.text)
            return (
              <div key={idea.id} className="bg-white border border-line rounded-2xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-[13.5px] font-bold text-ink leading-relaxed flex-1">
                    {idea.text}
                  </span>
                  <button
                    onClick={() => setStatus.mutate({ id: idea.id, status: 'dropped' })}
                    className="text-[11px] text-ink-muted hover:text-red-500 flex-shrink-0"
                  >
                    접어두기
                  </button>
                </div>

                {picks.length === 0 ? (
                  <div className="text-[11.5px] text-ink-muted">
                    맞는 과목을 못 찾았어요. 보드에서 직접 골라 시작해도 돼요.
                  </div>
                ) : (
                  <>
                    <div className="text-[10.5px] font-bold text-ink-muted mb-1.5">
                      이 과목에서 이어가면 좋아요
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {picks.map((p) => (
                        <button
                          key={p.nodeId}
                          onClick={() =>
                            navigate(`/high-student/roadmap-v2/node/${p.nodeId}`)
                          }
                          className="w-full flex items-center gap-2 text-left border border-line rounded-lg px-3.5 py-2.5 hover:border-brand-high-light hover:bg-brand-high-pale/40 transition-all"
                        >
                          <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: p.line?.color ?? '#94A3B8' }}>
                            고{p.grade}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[12.5px] font-bold text-ink">
                              {p.subject}
                            </span>
                            {p.matchedArea && (
                              <span className="block text-[12px] text-brand-high-dark mt-1 leading-snug">
                                「{p.matchedArea}」 개념으로 {core(idea.text)} {verb}하기
                              </span>
                            )}
                            {p.areas.length > 0 && (
                              <span className="block text-[10.5px] text-ink-muted mt-0.5">
                                {p.areas.join(' · ')}
                              </span>
                            )}
                          </span>
                          <span className="text-[11.5px] font-semibold text-brand-high flex-shrink-0">
                            여기서 시작 →
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {dropped.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowDropped(!showDropped)}
            className="text-[12px] font-semibold text-ink-secondary hover:text-ink"
          >
            접어둔 것 {dropped.length}개 {showDropped ? '접기 ▲' : '보기 ▼'}
          </button>

          {showDropped && (
            <div className="flex flex-col gap-1.5 mt-2">
              {dropped.map((i) => (
                <div
                  key={i.id}
                  className="flex items-start gap-2 bg-gray-50 border border-line rounded-lg px-3.5 py-2.5"
                >
                  <span className="flex-1 text-[12.5px] text-ink-secondary leading-relaxed">
                    {i.text}
                  </span>
                  <button
                    onClick={() => setStatus.mutate({ id: i.id, status: 'open' })}
                    className="text-[11.5px] font-semibold text-brand-high hover:underline flex-shrink-0"
                  >
                    되살리기
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}