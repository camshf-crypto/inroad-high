import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
        <SubjectDetail
          line={line}
          node={node}
          grade={grade}
          career={career}
          onClose={back}
          onSwitchNode={(n) => navigate(`/high-student/roadmap-v2/node/${n.id}`, { replace: true })}
        />
      )}
    </div>
  )
}