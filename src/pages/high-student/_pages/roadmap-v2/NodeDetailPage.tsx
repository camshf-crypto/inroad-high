import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'
import {
  useMyCareerSeries,
  type RoadmapLine,
  type RoadmapNode,
  type Grade,
} from '@/pages/high-student/_hooks/useRoadmap'
import SubjectDetail from './SubjectDetail'
import ChangcheDetail from './ChangcheDetail'

interface NodeWithLine extends RoadmapNode {
  high_roadmap_line: RoadmapLine | null
}

/* 수행평가 화면 주소 — 실제 주소와 다르면 여기 한 줄만 고치면 된다 */
const TASK_PATH = (id: string) => `/high-student/school-task/${id}`

/* 상태 이름 (high_school_task.status) */
const TASK_STATUS: Record<string, { label: string; cls: string }> = {
  done: { label: '완료', cls: 'bg-emerald-50 text-emerald-700' },
  writing: { label: '작성 중', cls: 'bg-amber-50 text-amber-700' },
  guide: { label: '준비 중', cls: 'bg-amber-50 text-amber-700' },
  qa: { label: '준비 중', cls: 'bg-amber-50 text-amber-700' },
  analyzed: { label: '분석 완료', cls: 'bg-brand-high-pale text-brand-high-dark' },
}

/**
 * 이 과목 칸에 연결된 수행평가 — 안내문을 분석할 때 서버가 이 칸(node_id)에 붙여 둔 것들
 * 로드맵은 계획표라 내용은 수행평가 화면에 두고, 여기는 목록과 상태만 보여 준다
 */
function NodeTasks({ nodeId }: { nodeId: string }) {
  const navigate = useNavigate()
  const student = useAtomValue(studentState)
  const studentId = student?.id ? String(student.id) : undefined
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['node-tasks', nodeId, studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('high_school_task')
        .select('id, title, subject, semester, status, task_type, updated_at')
        .eq('node_id', nodeId)
        .eq('student_id', studentId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })

  const done = tasks.filter((t: any) => t.status === 'done').length

  return (
    <section className="mt-4 rounded-2xl border border-line bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[14px] font-bold text-ink">이 과목 수행평가</h3>
        {tasks.length > 0 && (
          <span className="text-[12px] text-ink-muted">
            완료 <b className="text-emerald-600">{done}</b> / {tasks.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="mt-3 text-[12px] text-ink-muted">불러오는 중…</p>
      ) : tasks.length === 0 ? (
        <p className="mt-3 text-[12px] leading-relaxed text-ink-secondary">
          아직 연결된 수행평가가 없어요. 수행평가 안내문을 올리면 이 과목 칸에 자동으로 붙어요.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {tasks.map((t: any) => {
            const st = TASK_STATUS[t.status] ?? { label: '진행 중', cls: 'bg-slate-100 text-ink-secondary' }
            return (
              <li key={t.id}>
                <button
                  onClick={() => navigate(TASK_PATH(t.id))}
                  className="flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-left transition-all hover:border-brand-high-light hover:bg-brand-high-pale/40"
                >
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-bold ${st.cls}`}>{st.label}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{t.title || '제목 없는 수행평가'}</span>
                  <span className="shrink-0 text-[11px] text-ink-muted">
                    {t.semester ? `${t.semester}학기` : ''}
                    {t.task_type ? ` · ${t.task_type}` : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default function NodeDetailPage() {
  const { nodeId } = useParams()
  const navigate = useNavigate()

  const back = () => navigate('/high-student/roadmap-v2')

  const { data: node, isLoading, error } = useQuery({
    queryKey: ['roadmap-node', nodeId],
    enabled: !!nodeId,
    queryFn: async (): Promise<NodeWithLine | null> => {
      const { data, error } = await supabase
        .from('high_roadmap_node')
        .select(
          'id, line_id, grade, subject_name, areas, is_default, elective_group, student_id, sort_order, ' +
            'high_roadmap_line(id, line_key, name, kind, color, series, sort_order)',
        )
        .eq('id', nodeId!)
        .maybeSingle()
      if (error) throw error
      return data as unknown as NodeWithLine | null
    },
  })

  const { data: career } = useMyCareerSeries()

  if (isLoading) {
    return <div className="p-6 text-[13px] text-ink-muted">불러오는 중…</div>
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-[13px] text-red-600 mb-3">
          불러오지 못했어요: {(error as Error).message}
        </div>
        <button
          onClick={back}
          className="h-9 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold"
        >
          ← 로드맵으로
        </button>
      </div>
    )
  }

  const line = node?.high_roadmap_line ?? null

  if (!node || !line || !career) {
    return (
      <div className="p-6">
        <div className="text-[13px] text-ink-secondary mb-3">과목을 찾을 수 없어요.</div>
        <button
          onClick={back}
          className="h-9 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold"
        >
          ← 로드맵으로
        </button>
      </div>
    )
  }

  const grade = node.grade as Grade

  return (
    <div className="p-4 h-full overflow-y-auto">
      {line.kind === '창체' ? (
        <ChangcheDetail
          line={line}
          node={node}
          grade={grade}
          career={career}
          onClose={back}
        />
      ) : (
        <>
          <SubjectDetail
            line={line}
            node={node}
            grade={grade}
            career={career}
            onClose={back}
            onSwitchNode={(n) => navigate(`/high-student/roadmap-v2/node/${n.id}`, { replace: true })}
          />
          {/* 이 과목 칸에 연결된 수행평가 — 계획(로드맵) 아래에 실제로 한 것 */}
          <NodeTasks nodeId={node.id} />
        </>
      )}
    </div>
  )
}