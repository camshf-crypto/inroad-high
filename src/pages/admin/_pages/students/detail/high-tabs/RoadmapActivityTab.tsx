import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useUpsertSaenggibu, gradeToNum } from '@/pages/admin/_hooks/useHighSaenggibu'

type SaenggibuCategory = '세특' | '동아리' | '자율' | '진로'

/** 창체 과목명 → 생기부 카테고리 */
const CHANGCHE_CATEGORY: Record<string, SaenggibuCategory> = {
  '진로활동': '진로',
  '자율·자치활동': '자율',
  '자율활동': '자율',
  '동아리활동': '동아리',
}

const TYPE_NAME: Record<string, string> = {
  aa: '학술·분석형',
  ac: '학술·창의형',
  ai: '실천·개선형',
  ar: '실천·창작형',
}

const STEP_LABEL: Record<string, string> = {
  research: '자료조사',
  report: '보고서',
  present: '발표',
  debate: '토론',
  archive: '이력저장',
}

interface NodeRef {
  subject_name: string
  grade: number
}

interface TopicRow {
  id: string
  node_id: string
  slot: number
  area: string | null
  title: string
  goal_text: string | null
  series: string | null
  major: string | null
  type_key: string | null
  created_at: string
  high_roadmap_node: NodeRef | null
}

interface ChangcheRow {
  id: string
  activity_name: string
  diff_title: string
  diff_what: string | null
  diff_point: string | null
  goal_text: string | null
  created_at: string
  high_roadmap_node: NodeRef | null
}

interface PipelineRow {
  topic_id: string
  step: string
  status: string
}

interface Props {
  student: { id: string; name: string; grade: string }
  viewGrade?: string
}

export default function RoadmapActivityTab({ student, viewGrade }: Props) {
  const studentId = student.id
  const grade = gradeToNum(viewGrade ?? student.grade)
  const [copied, setCopied] = useState<string | null>(null)

  const upsert = useUpsertSaenggibu()

  const { data: topics = [], isLoading: tLoading } = useQuery({
    queryKey: ['admin-roadmap-topics', studentId],
    queryFn: async (): Promise<TopicRow[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_topic')
        .select(
          'id, node_id, slot, area, title, goal_text, series, major, type_key, created_at, high_roadmap_node(subject_name, grade)',
        )
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as TopicRow[]
    },
  })

  const { data: pipeline = [] } = useQuery({
    queryKey: ['admin-roadmap-pipeline', studentId],
    queryFn: async (): Promise<PipelineRow[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_pipeline')
        .select('topic_id, step, status')
        .eq('student_id', studentId)
      if (error) throw error
      return (data ?? []) as PipelineRow[]
    },
  })

  const { data: changche = [], isLoading: cLoading } = useQuery({
    queryKey: ['admin-roadmap-changche', studentId],
    queryFn: async (): Promise<ChangcheRow[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_changche')
        .select(
          'id, activity_name, diff_title, diff_what, diff_point, goal_text, created_at, high_roadmap_node(subject_name, grade)',
        )
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as ChangcheRow[]
    },
  })

  const doneByTopic = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const p of pipeline) {
      if (p.status !== 'done') continue
      const arr = m.get(p.topic_id)
      if (arr) arr.push(p.step)
      else m.set(p.topic_id, [p.step])
    }
    return m
  }, [pipeline])

  const gradeTopics = topics.filter((t) => t.high_roadmap_node?.grade === grade)
  const gradeChangche = changche.filter((c) => c.high_roadmap_node?.grade === grade)

  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const makeItem = (category: SaenggibuCategory, subject: string | null) => {
    upsert.mutate(
      {
        student_id: studentId,
        grade,
        category,
        subject,
        content: '',
        status: 'draft',
      } as any,
      {
        onSuccess: () =>
          alert(
            `생기부 항목이 만들어졌어요.\n생기부 탭에서 ${category}${subject ? ` · ${subject}` : ''} 문장을 작성해주세요.`,
          ),
        onError: (e: any) => alert('만들지 못했어요: ' + (e?.message ?? '')),
      },
    )
  }

  const loading = tLoading || cLoading

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: '#EFF6FF', border: '1px solid #93C5FD60' }}
      >
        <div className="text-[13px] font-extrabold text-blue-900 mb-0.5">
          학생이 로드맵에서 한 활동
        </div>
        <div className="text-[11.5px] font-medium text-ink-secondary leading-[1.6]">
          학생이 정한 탐구주제와 창체 활동이에요. 생기부 문장은 여기 기록을 참고해서
          <strong> 선생님이 직접 작성</strong>합니다.
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div
            className="inline-block w-7 h-7 border-2 border-gray-200 rounded-full animate-spin mb-3"
            style={{ borderTopColor: '#2563EB' }}
          />
          <div className="text-[13px] font-bold text-ink-secondary">불러오는 중...</div>
        </div>
      ) : (
        <>
          {/* 세특 — 탐구주제 */}
          <div>
            <div className="text-[14px] font-extrabold text-ink mb-2">
              탐구주제{' '}
              <span className="text-[11px] font-bold text-ink-muted">
                {gradeTopics.length}건
              </span>
            </div>

            {gradeTopics.length === 0 ? (
              <div className="bg-white border border-line rounded-xl text-center py-10 text-[13px] text-ink-muted">
                아직 이 학년에 만든 탐구주제가 없어요
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {gradeTopics.map((t) => {
                  const subject = t.high_roadmap_node?.subject_name ?? '-'
                  const done = doneByTopic.get(t.id) ?? []
                  const summary = [
                    `[${subject}] ${t.title}`,
                    t.area ? `학습영역: ${t.area}` : null,
                    t.goal_text ? `진로 기준: ${t.goal_text}` : null,
                    t.type_key ? `성향: ${TYPE_NAME[t.type_key] ?? t.type_key}` : null,
                    done.length
                      ? `완료 단계: ${done.map((d) => STEP_LABEL[d] ?? d).join(', ')}`
                      : '완료 단계: 없음',
                  ]
                    .filter(Boolean)
                    .join('\n')

                  return (
                    <div
                      key={t.id}
                      className="bg-white border border-line rounded-xl px-4 py-3.5"
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          {subject}
                        </span>
                        {t.area && (
                          <span className="text-[10.5px] text-ink-muted">{t.area}</span>
                        )}
                        <span className="ml-auto text-[10.5px] font-bold text-ink-muted">
                          {done.length}/5 완료
                        </span>
                      </div>

                      <div className="text-[13.5px] font-bold text-ink leading-snug mb-1.5">
                        {t.title}
                      </div>

                      <div className="flex gap-1 mb-2.5">
                        {['research', 'report', 'present', 'debate', 'archive'].map((s) => (
                          <span
                            key={s}
                            className="text-[9.5px] font-bold px-1.5 py-0.5 rounded"
                            style={{
                              color: done.includes(s) ? '#065F46' : '#94A3B8',
                              background: done.includes(s) ? '#ECFDF5' : '#F1F5F9',
                            }}
                          >
                            {STEP_LABEL[s]}
                          </span>
                        ))}
                      </div>

                      <div className="text-[11px] text-ink-muted mb-2.5">
                        {t.goal_text && <>진로 기준 {t.goal_text}</>}
                        {t.type_key && <> · {TYPE_NAME[t.type_key] ?? t.type_key}</>}
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => copy(t.id, summary)}
                          className="h-8 px-3 bg-white border border-line text-ink-secondary rounded-lg text-[11px] font-bold hover:bg-gray-50"
                        >
                          {copied === t.id ? '복사됨' : '활동 요약 복사'}
                        </button>
                        <button
                          onClick={() => makeItem('세특', subject)}
                          disabled={upsert.isPending}
                          className="h-8 px-3 bg-blue-600 text-white rounded-lg text-[11px] font-bold hover:bg-blue-700 disabled:opacity-60"
                        >
                          생기부 항목 만들기
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 창체 */}
          <div>
            <div className="text-[14px] font-extrabold text-ink mb-2">
              창의적 체험활동{' '}
              <span className="text-[11px] font-bold text-ink-muted">
                {gradeChangche.length}건
              </span>
            </div>

            {gradeChangche.length === 0 ? (
              <div className="bg-white border border-line rounded-xl text-center py-10 text-[13px] text-ink-muted">
                아직 이 학년에 정한 창체 활동이 없어요
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {gradeChangche.map((ch) => {
                  const nodeName = ch.high_roadmap_node?.subject_name ?? ''
                  const category = CHANGCHE_CATEGORY[nodeName] ?? '자율'
                  const summary = [
                    `[${nodeName}] ${ch.activity_name}`,
                    `차별화: ${ch.diff_title}`,
                    ch.diff_what,
                    ch.diff_point ? `생기부 포인트: ${ch.diff_point}` : null,
                    ch.goal_text ? `진로 기준: ${ch.goal_text}` : null,
                  ]
                    .filter(Boolean)
                    .join('\n')

                  return (
                    <div
                      key={ch.id}
                      className="bg-white border border-line rounded-xl px-4 py-3.5"
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                          {nodeName}
                        </span>
                        <span className="text-[13px] font-extrabold text-ink">
                          {ch.activity_name}
                        </span>
                      </div>

                      <div className="text-[12.5px] font-bold text-ink-secondary mb-1">
                        {ch.diff_title}
                      </div>
                      {ch.diff_what && (
                        <div className="text-[12px] text-ink-secondary leading-relaxed mb-1.5">
                          {ch.diff_what}
                        </div>
                      )}
                      {ch.diff_point && (
                        <div className="text-[11px] text-blue-700 mb-2.5">
                          {ch.diff_point}
                        </div>
                      )}

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => copy(ch.id, summary)}
                          className="h-8 px-3 bg-white border border-line text-ink-secondary rounded-lg text-[11px] font-bold hover:bg-gray-50"
                        >
                          {copied === ch.id ? '복사됨' : '활동 요약 복사'}
                        </button>
                        <button
                          onClick={() => makeItem(category, null)}
                          disabled={upsert.isPending}
                          className="h-8 px-3 bg-purple-600 text-white rounded-lg text-[11px] font-bold hover:bg-purple-700 disabled:opacity-60"
                        >
                          생기부 항목 만들기
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}