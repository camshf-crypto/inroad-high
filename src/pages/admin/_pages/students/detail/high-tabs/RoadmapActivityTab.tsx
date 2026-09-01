// src/pages/admin/_pages/students/detail/high-tabs/RoadmapActivityTab.tsx
// 원장용 3년 로드맵 표 (기존 세로 카드 목록을 표로 교체)
//   학생 화면은 "이번 학기"를 본다. 원장은 "고1~고3"을 한 화면에서 훑는다.
//   원장이 하는 일은 하나다 — 이상한 걸 찾아내는 것.
//   그래서 화면의 기준은 "학생 화면과 얼마나 같은가"가 아니라
//   "이상한 게 얼마나 빨리 눈에 띄는가" 다.
//
// 흐름
//   표에서 훑기 → 이상한 칸 클릭 → 상세 패널에서 코멘트 → 학생에게 전달
//   주제를 원장이 직접 고치지 않는다. 학생이 "주제 바꾸기"로 직접 고쳐야 배운다.

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { gradeToNum } from '@/pages/admin/_hooks/useHighSaenggibu'
// 원장용 탐구주제 코칭 패널 — 평가 → 방향 선택 → 대안 → 대화 3턴이 이미 들어있다
import ResearchCoachPanel from './ResearchCoachPanel'
import type { Research } from '@/pages/admin/_hooks/useHighResearch'

const GRADES = [1, 2, 3] as const

const STEP_LABEL: Record<string, string> = {
  research: '자료조사',
  report: '보고서',
  present: '발표',
  debate: '토론',
  archive: '이력저장',
}
const STEP_ORDER = ['research', 'report', 'present', 'debate', 'archive']

interface NodeRef {
  subject_name: string
  grade: number
  high_roadmap_line?: {
    id: string
    name: string
    color: string
    sort_order: number
  } | null
}

interface TopicRow {
  id: string
  node_id: string
  slot: number
  area: string | null
  title: string
  major: string | null
  teacher_comment: string | null
  commented_at: string | null
  created_at: string
  high_roadmap_node: NodeRef | null
}

interface PipelineRow {
  topic_id: string
  step: string
  status: string
}

/** 학생이 로드맵에서 읽은 책 (high_reading) — 과목명·학년으로 칸에 붙는다 */
interface ReadingRow {
  id: string
  book_title: string
  author: string | null
  subject: string | null
  reason: string | null
  status: string | null
  grade: number | null
}

/** subject-fit-check 응답 */
interface FitResult {
  fit: number
  verdict: 'strong' | 'partial' | 'weak'
  summary: string
  matched: { subject: string; link: string }[]
  unmatched: { subject: string; reason: string }[]
  missing: { subject: string; why: string }[]
  swap: { from: string; to: string; why: string }[]
}

interface Props {
  student: { id: string; name: string; grade: string }
  /** 상단 학년 탭. 표는 3년을 한 번에 보므로 강조 표시에만 쓴다. */
  viewGrade?: string
}

export default function RoadmapActivityTab({ student, viewGrade }: Props) {
  const studentId = student.id
  const myGrade = gradeToNum(viewGrade ?? student.grade)
  const qc = useQueryClient()

  const [selId, setSelId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  /** AI 코칭 패널 열림 여부 */
  const [coachOpen, setCoachOpen] = useState(false)
  /** 과목 조합 검토 — 어느 학년을 보고 있나 */
  const [subjGrade, setSubjGrade] = useState<number | null>(null)
  const [fits, setFits] = useState<Record<number, FitResult>>({})
  const [subjDraft, setSubjDraft] = useState('')
  /** 이미 전달한 과목 코멘트 (학년별) — 같은 내용 재전송을 막는다 */
  const [subjSent, setSubjSent] = useState<Record<number, string>>({})

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['admin-grid-topics', studentId],
    queryFn: async (): Promise<TopicRow[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_topic')
        .select(
          'id, node_id, slot, area, title, major, teacher_comment, commented_at, created_at, high_roadmap_node(subject_name, grade, high_roadmap_line(id, name, color, sort_order))',
        )
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as TopicRow[]
    },
  })

  const { data: pipeline = [] } = useQuery({
    queryKey: ['admin-grid-pipeline', studentId],
    queryFn: async (): Promise<PipelineRow[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_pipeline')
        .select('topic_id, step, status')
        .eq('student_id', studentId)
      if (error) throw error
      return (data ?? []) as PipelineRow[]
    },
  })

  /** 🎯 학생이 고른 과목 전부.
   *  주제를 정한 과목만 보면 "간호학과인데 화학Ⅱ를 안 골랐다"를 못 잡는다.
   *  과목 선택은 되돌릴 수 없으니 이걸 원장이 봐야 한다. */
  const { data: board } = useQuery({
    queryKey: ['admin-grid-board', studentId],
    queryFn: async () => {
      const [lineRes, nodeRes, progRes] = await Promise.all([
        supabase
          .from('high_roadmap_line')
          .select('id, name, color, sort_order')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('high_roadmap_node')
          .select('id, line_id, grade, subject_name, category, recommended_series')
          .or(`student_id.is.null,student_id.eq.${studentId}`)
          .order('sort_order'),
        supabase
          .from('high_roadmap_progress')
          .select('node_id')
          .eq('student_id', studentId),
      ])
      if (lineRes.error) throw lineRes.error
      if (nodeRes.error) throw nodeRes.error
      if (progRes.error) throw progRes.error
      return {
        lines: lineRes.data ?? [],
        nodes: nodeRes.data ?? [],
        picked: new Set((progRes.data ?? []).map((p: any) => p.node_id)),
      }
    },
  })

  /** 🎯 행은 과목이 아니라 계통이다.
   *  과목은 학년마다 바뀐다 — 고1 공통국어 → 고2 독서와 작문 → 고3 화법과 언어.
   *  과목을 행으로 두면 고2·고3 칸이 영원히 빈다.
   *  그리고 주제가 없어도 "고른 과목"은 보여야 한다.
   *  안 고른 계통이 비어 보여야 "간호학과인데 화학이 없다"가 잡힌다. */
  const { rows, byCell } = useMemo(() => {
    interface Cell {
      subject: string
      nodeId: string
      topic: TopicRow | null
    }
    const cell = new Map<string, Cell[]>()
    const lines = new Map<
      string,
      { name: string; color: string; order: number }
    >()

    // 주제를 node_id 로 찾기 쉽게
    const topicByNode = new Map<string, TopicRow[]>()
    topics.forEach((t) => {
      const arr = topicByNode.get(t.node_id)
      if (arr) arr.push(t)
      else topicByNode.set(t.node_id, [t])
    })

    // ① 학생이 고른 과목을 먼저 깐다 (주제가 없어도 보여야 한다)
    if (board) {
      const lineById = new Map(board.lines.map((l: any) => [l.id, l]))
      board.nodes.forEach((n: any) => {
        // 공통과목은 전원 이수라 고른 게 아니지만 보여야 한다
        const isCommon = n.category === '공통'
        if (!board.picked.has(n.id) && !isCommon) return

        const ln: any = lineById.get(n.line_id)
        const lineKey = n.line_id ?? n.subject_name
        const key = `${lineKey}__${n.grade}`
        const mine = topicByNode.get(n.id) ?? []

        const list = cell.get(key) ?? []
        if (mine.length > 0) {
          mine.forEach((t) =>
            list.push({ subject: n.subject_name, nodeId: n.id, topic: t }),
          )
        } else {
          list.push({ subject: n.subject_name, nodeId: n.id, topic: null })
        }
        cell.set(key, list)

        if (!lines.has(lineKey)) {
          lines.set(lineKey, {
            name: ln?.name ?? n.subject_name,
            color: ln?.color ?? '#94A3B8',
            order: ln?.sort_order ?? 999,
          })
        }
      })
    }

    // ② 보드에 없는 주제도 빠뜨리지 않는다 (직접 추가한 과목 등)
    topics.forEach((t) => {
      const n = t.high_roadmap_node
      if (!n) return
      const ln = n.high_roadmap_line
      const lineKey = ln?.id ?? n.subject_name
      const key = `${lineKey}__${n.grade}`
      const list = cell.get(key) ?? []
      if (list.some((c) => c.topic?.id === t.id)) return
      list.push({ subject: n.subject_name, nodeId: t.node_id, topic: t })
      cell.set(key, list)
      if (!lines.has(lineKey)) {
        lines.set(lineKey, {
          name: ln?.name ?? n.subject_name,
          color: ln?.color ?? '#94A3B8',
          order: ln?.sort_order ?? 999,
        })
      }
    })

    return {
      rows: [...lines.entries()]
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => a.order - b.order),
      byCell: cell,
    }
  }, [topics, board])

  /** 그 학년에 고른 과목 / 안 고른 과목 — AI 판정에 둘 다 넘긴다.
   *  대안을 실제로 고를 수 있는 과목 중에서만 뽑게 하려고. */
  const subjectsOf = (g: number) => {
    if (!board) return { picked: [], available: [], required: [] as string[] }
    const lineById = new Map(board.lines.map((l: any) => [l.id, l]))
    const picked: any[] = []
    const available: any[] = []
    const required: string[] = []
    board.nodes
      .filter((n: any) => n.grade === g)
      .forEach((n: any) => {
        const ln: any = lineById.get(n.line_id)
        const item = {
          line: ln?.name ?? '기타',
          name: n.subject_name,
          category: n.category ?? null,
          recommendedSeries: n.recommended_series ?? null,
        }
        if (n.category === '공통') required.push(n.subject_name)
        else if (board.picked.has(n.id)) picked.push(item)
        else available.push(item)
      })
    return { picked, available, required }
  }

  const stepOf = (topicId: string) => {
    const mine = pipeline.filter((p) => p.topic_id === topicId)
    if (mine.length === 0) return null
    // 가장 멀리 간 단계
    let best = -1
    mine.forEach((p) => {
      const i = STEP_ORDER.indexOf(p.step)
      if (i > best) best = i
    })
    return best >= 0 ? STEP_ORDER[best] : null
  }

  const { data: readings = [] } = useQuery({
    queryKey: ['admin-grid-readings', studentId],
    queryFn: async (): Promise<ReadingRow[]> => {
      const { data, error } = await supabase
        .from('high_reading')
        .select('id, book_title, author, subject, reason, status, grade')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ReadingRow[]
    },
  })

  /** 진로 계열 검사 결과 — 표를 보는 내내 기준이 눈에 있어야
   *  어긋난 게 보인다. */
  const { data: concepts = [] } = useQuery({
    queryKey: ['admin-grid-concept', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_concept')
        .select('type_name, major, career, university, custom_goal, keywords, grade, created_at')
        .eq('student_id', studentId)
        // status 는 completed / approved 가 섞여 있다. 미완료(draft)만 뺀다.
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  /** 🎯 검사는 한 번만 한다. 진로가 바뀌면 검사를 다시 받는 게 아니라
   *  학과·직업만 고쳐 적는다. 그래서 가장 최근 것 하나가 3년 내내 기준이다. */
  const concept: any = concepts[0] ?? null

  /** 과목 + 학년으로 책 찾기 */
  const booksOf = (subject: string, grade: number) =>
    readings.filter((r) => r.subject === subject && (r.grade ?? 0) === grade)

  const selected = topics.find((t) => t.id === selId) ?? null
  const selBooks = selected
    ? booksOf(
        selected.high_roadmap_node?.subject_name ?? '',
        selected.high_roadmap_node?.grade ?? 0,
      )
    : []

  const checkSubjects = useMutation({
    mutationFn: async (g: number): Promise<FitResult> => {
      const { picked, available, required } = subjectsOf(g)
      if (picked.length === 0) throw new Error('이 학년에 고른 과목이 없어요.')
      const { data, error } = await supabase.functions.invoke('subject-fit-check', {
        body: {
          grade: g,
          studentName: student.name,
          series: null,
          major: concept?.major ?? null,
          career: concept?.career ?? null,
          picked,
          available,
          required,
          needCount: picked.length,
        },
      })
      if (error) {
        let detail = ''
        try {
          const res = (error as any)?.context
          if (res && typeof res.json === 'function') {
            const b = await res.json()
            detail = b?.error || b?.message || ''
          }
        } catch { /* JSON 아니면 무시 */ }
        throw new Error(detail || error.message || '검토에 실패했어요.')
      }
      if (!data?.success) throw new Error(data?.error || '검토에 실패했어요.')
      return data.analysis as FitResult
    },
    onSuccess: (r, g) => setFits((prev) => ({ ...prev, [g]: r })),
    onError: (e: any) => alert(e.message || '검토에 실패했어요.'),
  })

  const saveSubjectNote = useMutation({
    mutationFn: async (v: { grade: number; text: string }) => {
      const { data: me } = await supabase.auth.getUser()
      const { error } = await supabase.from('high_subject_note').upsert(
        {
          student_id: studentId,
          grade: v.grade,
          comment: v.text.trim(),
          teacher_id: me?.user?.id ?? null,
          ai_review: fits[v.grade] ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,grade' },
      )
      if (error) throw error
    },
    onSuccess: (_r, v) => {
      setSubjSent((prev) => ({ ...prev, [v.grade]: v.text.trim() }))
      alert('학생에게 전달했어요.')
    },
    onError: (e: any) => alert(`저장 실패: ${e.message}`),
  })

  const saveComment = useMutation({
    mutationFn: async (v: { topicId: string; text: string }) => {
      const { data: me } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('high_roadmap_topic')
        .update({
          teacher_comment: v.text.trim() || null,
          commented_at: v.text.trim() ? new Date().toISOString() : null,
          teacher_id: me?.user?.id ?? null,
        })
        .eq('id', v.topicId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-grid-topics', studentId] })
    },
    onError: (e: any) => alert(`저장 실패: ${e.message}`),
  })

  const commentedCount = topics.filter((t) => t.teacher_comment).length

  if (isLoading) {
    return <div className="p-6 text-[13px] text-ink-muted">불러오는 중…</div>
  }

  if (topics.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
        <div className="text-4xl mb-3">🗺️</div>
        <div className="text-[14px] font-bold text-ink-secondary">
          아직 정한 탐구주제가 없어요
        </div>
        <div className="text-[12px] text-ink-muted mt-1">
          학생이 로드맵에서 과목별 주제를 정하면 여기에 쌓여요.
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-3 border-b border-line flex items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="text-[15px] font-extrabold text-ink">3년 로드맵</div>
          <div className="text-[11px] text-ink-muted mt-0.5">
            주제 {topics.length}개 · 독서 {readings.length}권 · 코멘트 {commentedCount}개 · 칸을 누르면 자세히 볼 수 있어요
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10.5px] text-ink-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 진행 중
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> 코멘트 있음
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {/* ── 표 ── */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11px] font-bold text-ink-muted pb-2 pr-3 w-[110px]">
                계통
              </th>
              {GRADES.map((g) => (
                <th key={g} className="pb-2 px-1.5">
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className="text-[12px] font-extrabold"
                      style={{ color: g === myGrade ? '#2563EB' : '#94A3B8' }}
                    >
                      고{g}
                      {g === myGrade && (
                        <span className="ml-1 text-[9px] font-bold">지금</span>
                      )}
                    </span>
                    {/* 🎯 과목 조합이 진로와 맞는지. 고2·고3은 아직 고칠 수 있다. */}
                    <button
                      onClick={() => {
                        setSubjGrade(g)
                        setSubjDraft('')
                      }}
                      className="text-[10px] font-bold text-brand-high border border-brand-high-light rounded-full px-2 py-0.5 hover:bg-brand-high-pale transition-colors"
                    >
                      과목 검토
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 🎯 기준 — 검사는 한 번. 3년 내내 이 기준으로 본다. */}
            <tr className="align-top">
              <td colSpan={4} className="pb-3">
                {!concept ? (
                  <div className="rounded-xl border border-dashed border-line px-4 py-3 text-[12px] text-ink-muted">
                    진로 계열 검사 결과가 없어요. 검사를 먼저 하면 주제가 진로와 맞는지 볼 수 있어요.
                  </div>
                ) : (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                        이 학생의 기준
                      </span>
                      {concept.university && (
                        <span className="text-[14px] font-extrabold text-ink">
                          {concept.university}
                        </span>
                      )}
                      {concept.major && (
                        <span className="text-[14px] font-extrabold text-blue-700">
                          {concept.major}
                        </span>
                      )}
                      {concept.career && (
                        <span className="text-[12px] text-ink-secondary">
                          {concept.career}
                        </span>
                      )}
                      {concept.type_name && (
                        <span className="text-[11px] font-bold text-blue-700 bg-white border border-blue-200 rounded-full px-2 py-0.5">
                          {concept.type_name}
                        </span>
                      )}
                      {concept.keywords?.length > 0 && (
                        <div className="flex gap-1 flex-wrap ml-auto">
                          {concept.keywords.slice(0, 5).map((k: string) => (
                            <span
                              key={k}
                              className="text-[10px] font-semibold text-ink-secondary bg-white border border-line rounded-full px-2 py-0.5"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {concept.custom_goal && (
                      <div className="text-[11.5px] text-ink-secondary leading-[1.5] mt-1.5">
                        {concept.custom_goal}
                      </div>
                    )}
                  </div>
                )}
              </td>
            </tr>

            {rows.map((r) => (
              <tr key={r.key} className="align-top">
                <td className="py-1 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: r.color }}
                    />
                    <span className="text-[11px] font-semibold text-ink-muted truncate">
                      {r.name}
                    </span>
                  </div>
                </td>
                {GRADES.map((g) => {
                  const list = byCell.get(`${r.key}__${g}`) ?? []
                  return (
                    <td key={g} className="py-1 px-1.5 w-1/3">
                      {list.length === 0 ? (
                        <div className="h-[52px] rounded-lg border border-dashed border-line flex items-center justify-center">
                          <span className="text-[10.5px] text-ink-muted">안 고름</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {list.map((c, i) => {
                            const t = c.topic
                            // 주제가 없는 과목 — 고르기만 하고 아직 주제를 안 잡았다
                            if (!t) {
                              return (
                                <div
                                  key={`${c.nodeId}-${i}`}
                                  className="rounded-lg border border-line bg-gray-50 px-2.5 py-2"
                                >
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span
                                      className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
                                      style={{ color: r.color, background: `${r.color}18` }}
                                    >
                                      {c.subject}
                                    </span>
                                    <span className="text-[9px] font-bold text-ink-muted bg-white border border-line px-1.5 py-0.5 rounded-full">
                                      주제 없음
                                    </span>
                                  </div>
                                </div>
                              )
                            }

                            const on = selId === t.id
                            const step = stepOf(t.id)
                            const hasC = !!t.teacher_comment
                            const books = booksOf(c.subject, g)
                            return (
                              <button
                                key={t.id}
                                onClick={() => {
                                  setSelId(t.id)
                                  setDraft(t.teacher_comment ?? '')
                                }}
                                className="text-left rounded-lg border px-2.5 py-2 transition-all hover:-translate-y-px"
                                style={{
                                  borderColor: on
                                    ? '#2563EB'
                                    : hasC
                                      ? '#FCD34D'
                                      : '#E5E7EB',
                                  background: on
                                    ? '#EFF6FF'
                                    : hasC
                                      ? '#FFFBEB'
                                      : '#fff',
                                  borderWidth: on || hasC ? 2 : 1,
                                }}
                              >
                                <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                  <span
                                    className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ color: r.color, background: `${r.color}18` }}
                                  >
                                    {c.subject}
                                  </span>
                                  {t.slot > 1 && (
                                    <span className="text-[9px] font-bold text-ink-muted">
                                      {t.slot}번째
                                    </span>
                                  )}
                                  {step && (
                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                      {STEP_LABEL[step] ?? step}
                                    </span>
                                  )}
                                  {books.length > 0 ? (
                                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                      📚 {books.length}권
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-ink-muted bg-gray-100 px-1.5 py-0.5 rounded-full">
                                      독서 없음
                                    </span>
                                  )}
                                  {hasC && (
                                    <span className="ml-auto text-[10px]">💬</span>
                                  )}
                                </div>
                                <div className="text-[11.5px] font-semibold text-ink leading-[1.4] line-clamp-2">
                                  {t.title}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

      </div>

      {/* ── 상세 + 코멘트 (팝업) ─────────────────────────
          아래로 펼치면 표가 화면 밖으로 밀려서 어느 칸을 눌렀는지 잊는다.
          그래서 표 위에 띄운다. */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          onClick={() => setSelId(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[520px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
          {/* 🎯 AI 코칭을 누르면 같은 팝업 안에서 화면만 바뀐다.
              팝업 위에 팝업을 띄우면 어수선하다. */}
          {coachOpen ? (
            <div className="p-4">
              <ResearchCoachPanel
                student={student}
                research={
                  {
                    id: selected.id,
                    student_id: studentId,
                    subject: selected.high_roadmap_node?.subject_name ?? null,
                    topic: selected.title,
                    motivation: null,
                    plan: null,
                    content: selected.area ?? null,
                    result: null,
                    status: 'active',
                    created_at: selected.created_at,
                    updated_at: selected.created_at,
                    grade: selected.high_roadmap_node?.grade ?? null,
                    semester: null,
                  } as Research
                }
                onClose={() => setCoachOpen(false)}
                onUseAsFeedback={(text) => {
                  setDraft((d) => (d.trim() ? `${d}\n${text}` : text))
                  setCoachOpen(false)
                }}
              />
              <button
                onClick={() => setCoachOpen(false)}
                className="w-full h-9 mt-3 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-bold hover:bg-gray-50"
              >
                ← 주제 상세로 돌아가기
              </button>
            </div>
          ) : (
          <div className="rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 mb-1">
                    고{selected.high_roadmap_node?.grade} ·{' '}
                    {selected.high_roadmap_node?.subject_name}
                    {selected.area && ` · ${selected.area}`}
                  </div>
                  <div className="text-[14px] font-extrabold text-ink leading-snug">
                    {selected.title}
                  </div>
                  {selected.major && (
                    <div className="text-[11px] text-ink-secondary mt-1">
                      당시 진로 · {selected.major}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelId(null)}
                  className="text-[16px] text-ink-muted hover:text-ink flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 5단계 진행 */}
            <div className="px-4 py-3 border-b border-line">
              <div className="text-[10px] font-extrabold text-ink-secondary mb-1.5">
                탐구 진행
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STEP_ORDER.map((s) => {
                  const row = pipeline.find(
                    (p) => p.topic_id === selected.id && p.step === s,
                  )
                  const done = row?.status === 'done' || row?.status === 'complete'
                  const doing = !!row && !done
                  return (
                    <span
                      key={s}
                      className="text-[10.5px] font-semibold px-2 py-1 rounded-full border"
                      style={{
                        borderColor: done ? '#6EE7B7' : doing ? '#FCD34D' : '#E5E7EB',
                        background: done ? '#ECFDF5' : doing ? '#FFFBEB' : '#F8FAFC',
                        color: done ? '#065F46' : doing ? '#92400E' : '#94A3B8',
                      }}
                    >
                      {done ? '✓ ' : ''}
                      {STEP_LABEL[s]}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* 🎯 이 과목에서 읽은 책 */}
            <div className="px-4 py-3 border-b border-line">
              <div className="text-[10px] font-extrabold text-ink-secondary mb-1.5">
                이 과목에서 읽은 책
                <span className="ml-1 font-medium text-ink-muted">· 눌러서 책 정보 보기</span>
              </div>
              {selBooks.length === 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                  <div className="text-[11.5px] font-bold text-amber-900">
                    아직 읽은 책이 없어요
                  </div>
                  <div className="text-[11px] text-amber-800 leading-[1.5] mt-0.5">
                    이 주제와 이어지는 책을 한 권 정하라고 코멘트에 적어주세요.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {selBooks.map((b) => (
                    <a
                      key={b.id}
                      // 다음 통합검색은 사람 이름을 오타로 보고 멋대로 바꾼다
                      // (세스 고딘 → 섹스 고딩). 책 전문 검색을 쓴다.
                      href={`https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(
                        `${b.book_title} ${b.author ?? ''}`.trim(),
                      )}&target=total`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="교보문고에서 이 책 찾아보기"
                      className="block rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[12px] font-bold text-ink underline decoration-blue-300 underline-offset-2">
                          {b.book_title}
                        </span>
                        {b.author && (
                          <span className="text-[10.5px] text-ink-muted">{b.author}</span>
                        )}
                        <span className="text-[10px] text-blue-700">↗</span>
                        <span className="ml-auto text-[9.5px] font-bold text-blue-700">
                          {b.status === 'done' ? '읽음' : '읽는 중'}
                        </span>
                      </div>
                      {b.reason && (
                        <div className="text-[11px] text-ink-secondary leading-[1.5] mt-1">
                          {b.reason}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* 코멘트 */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="text-[10px] font-extrabold text-ink-secondary">
                  학생에게 보낼 코멘트
                </div>
                <div className="flex items-center gap-2">
                  {selected.commented_at && (
                    <span className="text-[10px] text-ink-muted">
                      마지막 전달{' '}
                      {new Date(selected.commented_at).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                  {/* 🎯 이미 있는 코칭 패널을 연다. 평가·대안·대화가 다 들어있다. */}
                  <button
                    onClick={() => setCoachOpen(true)}
                    className="h-7 px-3 rounded-lg text-[11px] font-bold text-white transition-all"
                    style={{ background: '#7C3AED' }}
                  >
                    ✨ AI 코칭
                  </button>
                </div>
              </div>

              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="이 주제가 왜 약한지, 어느 방향으로 바꾸면 좋을지 적어주세요. 주제를 대신 정해주지 말고 방향만 주면 학생이 스스로 고쳐요."
                className="w-full border border-line rounded-lg px-3 py-2 text-[12px] leading-[1.6] outline-none resize-y focus:border-brand-high"
              />

              <div className="flex items-center justify-between gap-2 mt-2">
                <div className="text-[10.5px] text-ink-muted leading-[1.5]">
                  보내면 학생 로드맵에 표시돼요. 학생이 직접 주제를 고칩니다.
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {selected.teacher_comment && (
                    <button
                      onClick={() => {
                        if (!confirm('코멘트를 지울까요?')) return
                        setDraft('')
                        saveComment.mutate({ topicId: selected.id, text: '' })
                      }}
                      disabled={saveComment.isPending}
                      className="h-8 px-3 bg-white border border-line text-ink-secondary rounded-lg text-[11.5px] font-semibold disabled:opacity-40"
                    >
                      지우기
                    </button>
                  )}
                  {/* 🎯 이미 보낸 내용과 같으면 잠근다. 안 그러면 같은 걸 계속 덮어쓴다. */}
                  <button
                    onClick={() =>
                      saveComment.mutate({ topicId: selected.id, text: draft })
                    }
                    disabled={
                      !draft.trim() ||
                      saveComment.isPending ||
                      draft.trim() === (selected.teacher_comment ?? '').trim()
                    }
                    className="h-8 px-3.5 bg-brand-high text-white rounded-lg text-[11.5px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saveComment.isPending
                      ? '전달 중…'
                      : draft.trim() &&
                          draft.trim() === (selected.teacher_comment ?? '').trim()
                        ? '✓ 전달됨'
                        : '📤 학생에게 전달'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}
          </div>
        </div>
      )}

      {/* 🎯 과목 조합 검토 (팝업) — 고2·고3은 아직 고칠 수 있는 자리다 */}
      {subjGrade !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          onClick={() => setSubjGrade(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 mb-1">
                  고{subjGrade} 과목 검토
                </div>
                <div className="text-[14px] font-extrabold text-ink">
                  {concept?.major ?? '진로 미정'}
                  {concept?.career && (
                    <span className="text-[12px] font-medium text-ink-secondary ml-1.5">
                      {concept.career}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSubjGrade(null)}
                className="text-[16px] text-ink-muted hover:text-ink flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* 고른 과목 */}
            <div className="px-4 py-3 border-b border-line">
              <div className="text-[10px] font-extrabold text-ink-secondary mb-1.5">
                고{subjGrade}에 고른 과목
              </div>
              {subjectsOf(subjGrade).picked.length === 0 ? (
                <div className="text-[11.5px] text-ink-muted">
                  아직 고른 과목이 없어요.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {subjectsOf(subjGrade).picked.map((p: any) => (
                    <span
                      key={p.name}
                      className="text-[11.5px] font-semibold text-ink bg-gray-50 border border-line rounded-full px-2.5 py-1"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
              {subjectsOf(subjGrade).required.length > 0 && (
                <div className="text-[10.5px] text-ink-muted mt-2 leading-[1.5]">
                  공통과목 · {subjectsOf(subjGrade).required.join(', ')}
                </div>
              )}
            </div>

            {/* AI 판정 */}
            <div className="px-4 py-3 border-b border-line">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="text-[10px] font-extrabold text-ink-secondary">
                  진로와 맞는지
                </div>
                <button
                  onClick={() => checkSubjects.mutate(subjGrade)}
                  disabled={checkSubjects.isPending || !concept?.major}
                  className="h-7 px-3 rounded-lg text-[11px] font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: '#7C3AED' }}
                >
                  {checkSubjects.isPending
                    ? '검토 중…'
                    : fits[subjGrade]
                      ? '다시 검토'
                      : '✨ AI 검토'}
                </button>
              </div>

              {!concept?.major && (
                <div className="text-[11.5px] text-amber-700">
                  진로 계열 검사 결과가 없어서 검토할 수 없어요.
                </div>
              )}

              {fits[subjGrade] && (
                <div className="flex flex-col gap-2">
                  <div
                    className="rounded-lg px-3 py-2"
                    style={{
                      background:
                        fits[subjGrade].verdict === 'strong'
                          ? '#ECFDF5'
                          : fits[subjGrade].verdict === 'weak'
                            ? '#FEF2F2'
                            : '#FFFBEB',
                      border: `1px solid ${
                        fits[subjGrade].verdict === 'strong'
                          ? '#6EE7B7'
                          : fits[subjGrade].verdict === 'weak'
                            ? '#FCA5A5'
                            : '#FCD34D'
                      }`,
                    }}
                  >
                    <div className="flex items-end justify-between mb-0.5">
                      <span className="text-[12px] font-extrabold text-ink">
                        {fits[subjGrade].verdict === 'strong'
                          ? '잘 이어져요'
                          : fits[subjGrade].verdict === 'weak'
                            ? '연결이 약해요'
                            : '일부만 이어져요'}
                      </span>
                      <span className="text-[16px] font-extrabold text-ink leading-none">
                        {fits[subjGrade].fit}
                        <span className="text-[10px] text-ink-muted">%</span>
                      </span>
                    </div>
                    <div className="text-[11.5px] text-ink-secondary leading-[1.6]">
                      {fits[subjGrade].summary}
                    </div>
                  </div>

                  {fits[subjGrade].missing.length > 0 && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
                      <div className="text-[11px] font-extrabold text-blue-900 mb-1">
                        ➕ 이 진로면 넣어야 할 과목
                      </div>
                      <div className="flex flex-col gap-1">
                        {fits[subjGrade].missing.map((m) => (
                          <div
                            key={m.subject}
                            className="text-[11.5px] text-blue-900 leading-[1.55]"
                          >
                            <b>{m.subject}</b> — {m.why}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {fits[subjGrade].unmatched.length > 0 && (
                    <div className="text-[11.5px] leading-[1.7] px-1">
                      <span className="text-amber-700 font-bold">연결이 약해요 · </span>
                      {fits[subjGrade].unmatched.map((u) => u.subject).join(', ')}
                    </div>
                  )}

                  {fits[subjGrade].swap.length > 0 && (
                    <div className="rounded-lg bg-gray-50 border border-line px-3 py-2">
                      <div className="text-[10.5px] font-bold text-ink-secondary mb-1">
                        🔄 바꿔볼 만한 조합
                      </div>
                      {fits[subjGrade].swap.map((sw, i) => (
                        <div
                          key={i}
                          className="text-[11px] text-ink-secondary leading-[1.55]"
                        >
                          <b className="text-ink">{sw.from}</b> →{' '}
                          <b className="text-brand-high">{sw.to}</b> · {sw.why}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 코멘트 */}
            <div className="px-4 py-3">
              <div className="text-[10px] font-extrabold text-ink-secondary mb-1.5">
                학생에게 보낼 코멘트
              </div>
              <textarea
                value={subjDraft}
                onChange={(e) => setSubjDraft(e.target.value)}
                rows={3}
                placeholder={
                  subjGrade <= myGrade
                    ? '이미 듣는 과목이라 바꿀 수 없어요. 다음 학년에 뭘 골라야 할지 적어주세요.'
                    : '어떤 과목을 넣고 빼야 하는지 적어주세요. 이 학년은 아직 고칠 수 있어요.'
                }
                className="w-full border border-line rounded-lg px-3 py-2 text-[12px] leading-[1.6] outline-none resize-y focus:border-brand-high"
              />
              <div className="flex items-center justify-between gap-2 mt-2">
                <div className="text-[10.5px] text-ink-muted leading-[1.5]">
                  {subjGrade <= myGrade
                    ? '이미 수강 중인 학년이에요'
                    : '아직 바꿀 수 있는 학년이에요'}
                </div>
                <button
                  onClick={() =>
                    saveSubjectNote.mutate({ grade: subjGrade, text: subjDraft })
                  }
                  disabled={
                    !subjDraft.trim() ||
                    saveSubjectNote.isPending ||
                    subjDraft.trim() === (subjSent[subjGrade] ?? '')
                  }
                  className="h-8 px-3.5 bg-brand-high text-white rounded-lg text-[11.5px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saveSubjectNote.isPending
                    ? '전달 중…'
                    : subjDraft.trim() && subjDraft.trim() === (subjSent[subjGrade] ?? '')
                      ? '✓ 전달됨'
                      : '📤 학생에게 전달'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}