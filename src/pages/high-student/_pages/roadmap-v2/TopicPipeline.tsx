import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'

type StepKey = 'research' | 'report' | 'present' | 'debate' | 'archive'
type Status = 'todo' | 'doing' | 'done'
type ReportFormat = 'experiment' | 'analysis' | 'inquiry' | 'thesis' | 'critique'

const STEPS: {
  key: StepKey
  order: number
  title: string
  desc: string
  color: string
  what: (goal: string, verb: string) => string
  linked?: string
  fromPrev?: string
}[] = [
  {
    key: 'research', order: 1, title: '자료 조사', color: '#0EA5E9',
    desc: '논문·통계·기사로 근거 모으기',
    what: (goal) =>
      `주제와 관련된 논문, 통계 자료, 뉴스 기사를 찾아 정리해요. ${goal} 관점의 핵심 근거를 3~5개 모아두면 다음 단계가 훨씬 쉬워져요.`,
  },
  {
    key: 'report', order: 2, title: '보고서 작성', color: '#059669',
    desc: '수행평가형 보고서',
    linked: '수행평가 AI', fromPrev: '자료 조사',
    what: () =>
      `조사한 자료를 바탕으로 세특용 보고서를 써요. 어떤 형태의 보고서를 쓸지 먼저 고르면 그 양식에 맞는 개요가 나와요.`,
  },
  {
    key: 'present', order: 3, title: '3분 발표', color: '#D97706',
    desc: '발표 대본 + 연습',
    linked: '발표 분석', fromPrev: '보고서',
    what: () =>
      `보고서를 3분 발표로 압축해요. 대본을 만들고 실제로 녹음하면 전달력과 구성을 분석받을 수 있어요.`,
  },
  {
    key: 'debate', order: 4, title: '찬반 토론', color: '#7C3AED',
    desc: '주제를 놓고 AI와 토론',
    linked: 'AI 토론', fromPrev: '발표',
    what: () =>
      `탐구 주제로 찬반 토론을 해요. 발표에서 정리한 논거로 반박을 주고받으며 생각을 넓힙니다.`,
  },
  {
    key: 'archive', order: 5, title: '활동 이력 저장', color: '#DC2626',
    desc: '생기부 항목에 기록',
    fromPrev: '토론',
    what: () =>
      `자료조사부터 토론까지의 과정을 활동 이력에 저장해요. 5가지가 모이면 세특 문장으로 정리됩니다.`,
  },
]

const FORMATS: { key: ReportFormat; label: string; hint: string; sections: (goal: string, verb: string) => { part: string; items: string[] }[] }[] = [
  {
    key: 'experiment', label: '실험 보고서', hint: '과학 실험·탐구',
    sections: (goal, verb) => [
      { part: '서론', items: ['탐구 동기와 문제 제기', `${goal}와 연결되는 지점`] },
      { part: '이론적 배경', items: ['관련 개념·원리 정리', '선행 연구 조사'] },
      { part: '실험 방법', items: ['가설 설정', '변인 통제와 실험 설계'] },
      { part: '결과', items: ['데이터를 표·그래프로 정리', `결과를 ${verb}`] },
      { part: '고찰·결론', items: ['결과 해석과 오차 분석', `${goal} 진로와 연결한 제언`] },
    ],
  },
  {
    key: 'analysis', label: '조사·분석 보고서', hint: '사회 이슈·현황',
    sections: (goal, verb) => [
      { part: '서론', items: ['주제 선정 배경', '문제 제기'] },
      { part: '현황 분석', items: ['통계·자료로 현황 파악', '핵심 쟁점 정리'] },
      { part: '원인 분석', items: [`원인을 ${verb}`, '사례 분석'] },
      { part: '결론·제언', items: ['분석 종합', `${goal} 관점의 해결 방안`] },
    ],
  },
  {
    key: 'inquiry', label: '탐구 보고서', hint: '자유 주제 탐구',
    sections: (goal, verb) => [
      { part: '탐구 동기', items: ['관심을 갖게 된 계기', `${goal}와의 연결`] },
      { part: '탐구 내용', items: ['자료 조사·정리', `핵심 내용을 ${verb}`] },
      { part: '탐구 결과', items: ['알게 된 점 정리', '나만의 해석'] },
      { part: '느낀 점', items: ['배운 점과 성장', '후속 탐구 계획'] },
    ],
  },
  {
    key: 'thesis', label: '소논문', hint: '심화 연구 (고2~3)',
    sections: (goal, verb) => [
      { part: '초록', items: ['연구 요약 (목적·방법·결과)'] },
      { part: '서론', items: ['연구 배경과 목적', '연구 문제'] },
      { part: '선행 연구', items: ['기존 연구 검토', '연구의 차별점'] },
      { part: '본론', items: [`자료를 ${verb}`, '결과 제시'] },
      { part: '결론', items: ['연구 종합', `${goal} 관련 시사점·한계`] },
    ],
  },
  {
    key: 'critique', label: '감상·비평문', hint: '독서·작품 비평',
    sections: (goal, verb) => [
      { part: '도입', items: ['대상 소개', '관심 갖게 된 이유'] },
      { part: '분석', items: [`핵심 주제를 ${verb}`, '근거를 들어 해석'] },
      { part: '비평', items: ['나의 평가와 견해', '비판적 관점'] },
      { part: '결론', items: ['종합 의견', `${goal} 진로와의 연결`] },
    ],
  },
]

const STATUS_LABEL: Record<Status, string> = { todo: '시작 전', doing: '진행 중', done: '완료' }
const NEXT: Record<Status, Status> = { todo: 'doing', doing: 'done', done: 'todo' }

interface Row {
  id: string
  step: StepKey
  status: Status
  report_format: ReportFormat | null
}

interface Props {
  topicId: string
  goal: string
  verb: string
}

export default function TopicPipeline({ topicId, goal, verb }: Props) {
  const navigate = useNavigate()
  const student = useAtomValue(studentState)
  const qc = useQueryClient()
  const studentId = student?.id ? String(student.id) : undefined

  const [open, setOpen] = useState<StepKey | null>(null)

  const { data: rows = [] } = useQuery({
    queryKey: ['topic-pipeline', topicId],
    enabled: !!studentId,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_pipeline')
        .select('id, step, status, report_format')
        .eq('topic_id', topicId)
      if (error) throw error
      return (data ?? []) as Row[]
    },
  })

  const byStep = new Map(rows.map((r) => [r.step, r]))
  const doneCount = rows.filter((r) => r.status === 'done').length

  const upsert = useMutation({
    mutationFn: async (v: { step: StepKey; order: number; status?: Status; format?: ReportFormat }) => {
      if (!studentId) throw new Error('학생 정보가 없습니다')
      const cur = byStep.get(v.step)
      const status = v.status ?? cur?.status ?? 'todo'

      const { error } = await supabase.from('high_roadmap_pipeline').upsert(
        {
          topic_id: topicId,
          student_id: studentId,
          step: v.step,
          step_order: v.order,
          status,
          report_format: v.format ?? cur?.report_format ?? null,
          started_at: status !== 'todo' ? (new Date().toISOString()) : null,
          completed_at: status === 'done' ? new Date().toISOString() : null,
        },
        { onConflict: 'topic_id,step' },
      )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topic-pipeline', topicId] }),
  })

  return (
    <div className="mt-3 rounded-xl border border-line bg-gradient-to-br from-brand-high-pale/60 to-purple-50/60 p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[13px] font-extrabold text-brand-high-dark">
          이 주제 하나로 5가지 만들기
        </div>
        <div className="text-[11px] text-ink-muted">
          <b className="text-[13px] text-brand-high">{doneCount}</b> / 5 완료
        </div>
      </div>
      <div className="text-[11px] text-ink-muted mb-3">
        앞 단계 결과가 다음 단계의 재료가 돼요.
      </div>

      <div className="flex gap-1 mb-3">
        {STEPS.map((s) => {
          const st = byStep.get(s.key)?.status ?? 'todo'
          return (
            <div
              key={s.key}
              className="flex-1 h-1.5 rounded-full"
              style={{
                background: st === 'done' ? s.color : st === 'doing' ? `${s.color}55` : '#E2E8F0',
              }}
            />
          )
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        {STEPS.map((s) => {
          const row = byStep.get(s.key)
          const status: Status = row?.status ?? 'todo'
          const isOpen = open === s.key

          return (
            <div key={s.key}>
              <button
                onClick={() => setOpen(isOpen ? null : s.key)}
                className="w-full flex items-center gap-3 rounded-xl border bg-white/80 px-3.5 py-2.5 text-left transition-all"
                style={{ borderColor: isOpen ? s.color : '#E2E8F0' }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0"
                  style={{ background: status === 'done' ? s.color : `${s.color}99` }}
                >
                  {status === 'done' ? '✓' : s.order}
                </span>

                <span className="flex-1 min-w-0">
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: isOpen ? s.color : '#334155' }}
                  >
                    {s.title}
                  </span>
                  <span className="block text-[10.5px] text-ink-muted mt-0.5">{s.desc}</span>
                </span>

                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    upsert.mutate({ step: s.key, order: s.order, status: NEXT[status] })
                  }}
                  className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 cursor-pointer"
                  style={{
                    color: status === 'todo' ? '#94A3B8' : '#fff',
                    background: status === 'todo' ? '#F1F5F9' : status === 'doing' ? `${s.color}99` : s.color,
                  }}
                >
                  {STATUS_LABEL[status]}
                </span>
              </button>

              {isOpen && (
                <div
                  className="ml-9 mt-1 mb-1 rounded-lg border bg-white px-3.5 py-3"
                  style={{ borderColor: `${s.color}40` }}
                >
                  <div className="text-[12px] text-ink-secondary leading-relaxed">
                    {s.what(goal, verb)}
                  </div>

                  {s.key === 'report' && (
                    <ReportFormatPicker
                      current={row?.report_format ?? null}
                      goal={goal}
                      verb={verb}
                      color={s.color}
                      onPick={(f) => upsert.mutate({ step: 'report', order: 2, format: f })}
                    />
                  )}

                  {s.fromPrev && (
                    <div className="text-[10.5px] text-purple-600 mt-2.5">
                      ↑ 앞 단계({s.fromPrev}) 결과를 재료로 사용
                    </div>
                  )}

                  <button
                    onClick={() =>
                      navigate(`/high-student/roadmap-v2/topic/${topicId}?step=${s.key}`)
                    }
                    className="mt-3 h-9 px-4 rounded-lg text-[12px] font-bold text-white"
                    style={{ background: s.color }}
                  >
                    이 단계 작업하기 →
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {doneCount === 5 && (
        <div className="mt-3 rounded-lg bg-white border border-green-200 px-3.5 py-3 text-[11.5px] text-green-800 leading-relaxed">
          5단계를 모두 마쳤어요. 이 과정을 묶으면 세특 문장으로 정리할 수 있어요.
        </div>
      )}
    </div>
  )
}

// ============================================================

function ReportFormatPicker({
  current, goal, verb, color, onPick,
}: {
  current: ReportFormat | null
  goal: string
  verb: string
  color: string
  onPick: (f: ReportFormat) => void
}) {
  const fmt = FORMATS.find((f) => f.key === current)

  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold mb-1.5" style={{ color }}>
        어떤 보고서를 쓸까요?
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {FORMATS.map((f) => {
          const on = current === f.key
          return (
            <button
              key={f.key}
              onClick={() => onPick(f.key)}
              className="rounded-lg border px-2.5 py-1.5 text-left transition-all"
              style={{
                borderColor: on ? color : '#E5E7EB',
                background: on ? '#F0FDF4' : '#fff',
              }}
            >
              <div
                className="text-[11.5px] font-bold"
                style={{ color: on ? '#065F46' : '#334155' }}
              >
                {f.label}
              </div>
              <div className="text-[9.5px] text-ink-muted mt-0.5">{f.hint}</div>
            </button>
          )
        })}
      </div>

      {fmt && (
        <div>
          <div className="text-[10.5px] text-ink-muted mb-1.5">
            <b className="text-green-800">{fmt.label}</b> 개요
          </div>
          <div className="flex flex-col gap-1.5">
            {fmt.sections(goal, verb).map((sec) => (
              <div key={sec.part} className="flex gap-2">
                <div
                  className="flex-shrink-0 w-[68px] text-[10px] font-extrabold text-white rounded py-1 text-center h-fit"
                  style={{ background: color }}
                >
                  {sec.part}
                </div>
                <ul className="m-0 pl-4 flex flex-col gap-0.5 self-center list-disc">
                  {sec.items.map((it, i) => (
                    <li key={i} className="text-[11.5px] text-ink-secondary leading-snug">
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}