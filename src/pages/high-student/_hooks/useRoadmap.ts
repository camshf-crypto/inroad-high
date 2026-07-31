import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState, academyState } from '@/lib/auth/atoms'


// ============================================================
// 보드 데이터 (라인 · 과목 · 진행상태)
// ============================================================

export interface RoadmapLine {
  id: string
  line_key: string
  name: string
  kind: '창체' | '세특'
  color: string
  series: string[] | null      // null = 전 계열 공통
  sort_order: number
}

export interface RoadmapNode {
  id: string
  line_id: string
  grade: number
  subject_name: string
  areas: string[] | null
  is_default: boolean
  elective_group: string | null
  /** 공통 / 일반선택 / 진로선택 / 융합선택 */
  category: string | null
  /** 이 과목이 특히 잘 맞는 계열 */
  recommended_series: string[] | null
  student_id: string | null    // null = 마스터, 값 있으면 학생이 추가한 과목
  sort_order: number
}

export interface NodeProgress {
  node_id: string
  is_completed: boolean
  completed_at: string | null
  teacher_memo: string | null
}

export interface RoadmapBoardData {
  lines: RoadmapLine[]
  /** line_id → grade → 그 칸의 과목 후보들 */
  nodesByLine: Map<string, Map<number, RoadmapNode[]>>
  /** node_id → 진행상태 */
  progress: Map<string, NodeProgress>
}

/**
 * 입시 로드맵 보드 원본 데이터 조회.
 * 계열 필터는 걸지 않고 전부 가져온다 — 학년마다 계열이 다를 수 있어서
 * 필터링은 selectVisibleLines()에서 처리한다.
 */
export function useHighRoadmapBoard() {
  const student = useAtomValue(studentState)
  const studentId = student?.id as string | undefined

  return useQuery({
    queryKey: ['high-roadmap-board', studentId],
    enabled: !!studentId,
    staleTime: 1000 * 60 * 30,   // 마스터 데이터라 30분 캐시
    queryFn: async (): Promise<RoadmapBoardData> => {
      const [lineRes, nodeRes, progRes] = await Promise.all([
        supabase
          .from('high_roadmap_line')
          .select('id, line_key, name, kind, color, series, sort_order')
          .eq('is_active', true)
          .order('sort_order'),

        supabase
          .from('high_roadmap_node')
          .select('id, line_id, grade, subject_name, areas, is_default, elective_group, category, recommended_series, student_id, sort_order')
          .or(`student_id.is.null,student_id.eq.${studentId!}`)
          .order('sort_order'),

        supabase
          .from('high_roadmap_progress')
          .select('node_id, is_completed, completed_at, teacher_memo')
          .eq('student_id', studentId!),
      ])

      if (lineRes.error) throw lineRes.error
      if (nodeRes.error) throw nodeRes.error
      if (progRes.error) throw progRes.error

      const nodesByLine = new Map<string, Map<number, RoadmapNode[]>>()
      for (const n of (nodeRes.data ?? []) as RoadmapNode[]) {
        let byGrade = nodesByLine.get(n.line_id)
        if (!byGrade) {
          byGrade = new Map()
          nodesByLine.set(n.line_id, byGrade)
        }
        const arr = byGrade.get(n.grade)
        if (arr) arr.push(n)
        else byGrade.set(n.grade, [n])
      }

      const progress = new Map<string, NodeProgress>()
      for (const p of (progRes.data ?? []) as NodeProgress[]) {
        progress.set(p.node_id, p)
      }

      return {
        lines: (lineRes.data ?? []) as RoadmapLine[],
        nodesByLine,
        progress,
      }
    },
  })
}

/**
 * 화면에 그릴 라인 고르기.
 *
 * 규칙: (학년별 계열 합집합에 속한 라인) ∪ (이미 진행한 라인)
 * 두 번째 조건이 안전장치 — 진로를 바꿔도 손댄 라인은 절대 사라지지 않는다.
 */
export function selectVisibleLines(
  data: RoadmapBoardData,
  seriesUnion: string[],
): RoadmapLine[] {
  const { lines, nodesByLine, progress } = data

  // 진행 이력이 있는 line_id 모으기
  const touched = new Set<string>()
  for (const [lineId, byGrade] of nodesByLine) {
    for (const nodes of byGrade.values()) {
      if (nodes.some((n) => progress.has(n.id))) {
        touched.add(lineId)
        break
      }
    }
  }

  return lines.filter((l) => {
    if (l.series === null) return true                    // 전 계열 공통 (창체 등)
    if (l.series.some((s) => seriesUnion.includes(s))) return true
    return touched.has(l.id)                              // 계열은 안 맞지만 이미 진행함
  })
}

/**
 * 한 칸(라인 × 학년)에 그릴 과목 1개 고르기.
 * 학생이 고른 게 있으면 그것, 없으면 is_default.
 */
export function pickNode(
  data: RoadmapBoardData,
  lineId: string,
  grade: number,
): RoadmapNode | null {
  const candidates = data.nodesByLine.get(lineId)?.get(grade)
  if (!candidates?.length) return null

  const chosen = candidates.find((n) => data.progress.has(n.id))
  if (chosen) return chosen

  return candidates.find((n) => n.is_default) ?? candidates[0]
}


// ============================================================
// 진로 계열 (학년별 · 합집합 · 전환 감지)
// ============================================================

export type Grade = 1 | 2 | 3

const GRADE_TEXT: Record<Grade, string> = { 1: '고1', 2: '고2', 3: '고3' }

/** 학년별 목표 기준 — 고1 계열 / 고2 학과 / 고3 직업군 */
export const GOAL_BASIS: Record<Grade, '계열' | '학과' | '직업군'> = {
  1: '계열',
  2: '학과',
  3: '직업군',
}

export interface GradeCareer {
  grade: Grade
  series: string | null      // high_career_department에서 조인
  major: string | null
  career: string | null
  customGoal: string | null
  typeName: string | null
  status: string | null
  /** 이 학년에 직접 정한 값인지 (false면 다른 학년에서 이어받음) */
  isOwn: boolean
}

export interface CareerPivot {
  fromGrade: Grade
  toGrade: Grade
  fromSeries: string | null
  toSeries: string | null
  fromMajor: string | null
  toMajor: string | null
  /** series가 바뀌면 'series', 계열은 같고 학과만 바뀌면 'major' */
  kind: 'series' | 'major'
}

export interface CareerSeriesData {
  byGrade: Map<Grade, GradeCareer>
  /** 고1~고3 계열 합집합 — selectVisibleLines()에 그대로 넘긴다 */
  seriesUnion: string[]
  /** 학년 사이 진로 전환 (고1→고2, 고2→고3) */
  pivots: CareerPivot[]
}

/**
 * 학년별 진로 계열 검사 결과를 한 번에 조회.
 *
 * student_concept에는 학과명만 있고 계열이 없어서
 * high_career_department.series를 붙여서 내려준다.
 */
export function useMyCareerSeries() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined

  return useQuery({
    queryKey: ['my-career-series', studentId, academyId],
    enabled: !!studentId && !!academyId,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<CareerSeriesData> => {
      const { data: concepts, error } = await supabase
        .from('student_concept')
        .select('grade, status, major, career, custom_goal, type_name, university')
        .eq('student_id', studentId!)
        .eq('academy_id', academyId!)

      if (error) throw error

      const rows = concepts ?? []

      // 학과명 → 계열 조회
      const majors = [...new Set(rows.map((r) => r.major).filter(Boolean))] as string[]
      const seriesOf = new Map<string, string>()

      if (majors.length) {
        const { data: depts, error: dErr } = await supabase
          .from('high_career_department')
          .select('name, series')
          .in('name', majors)

        if (dErr) throw dErr
        for (const d of depts ?? []) {
          if (d.series) seriesOf.set(d.name, d.series)
        }
      }

      // 학년별로 각각 진로를 정한다. 비어 있는 학년은 가장 가까운 앞 학년에서 이어받고,
      // 그것도 없으면 값이 있는 아무 학년에서 가져온다. (고1 학생이 고2·고3을 안 정해도 로드맵이 그려지게)
      const TEXT_GRADE: Record<string, Grade> = { '고1': 1, '고2': 2, '고3': 3 }

      const raw = new Map<Grade, (typeof rows)[number]>()
      for (const r of rows) {
        const g = TEXT_GRADE[r.grade as string]
        if (g && r.major) raw.set(g, r)
      }

      const byGrade = new Map<Grade, GradeCareer>()
      for (const g of [1, 2, 3] as Grade[]) {
        const own = raw.get(g)
        const inherited =
          own ??
          (g === 3 ? raw.get(2) ?? raw.get(1) : g === 2 ? raw.get(1) ?? raw.get(3) : raw.get(2) ?? raw.get(3))
        if (!inherited) continue

        byGrade.set(g, {
          grade: g,
          series: inherited.major ? seriesOf.get(inherited.major) ?? null : null,
          major: inherited.major ?? null,
          career: inherited.career ?? null,
          customGoal: inherited.custom_goal ?? null,
          typeName: inherited.type_name ?? null,
          status: inherited.status ?? null,
          /** 이 학년에 직접 정한 값인지 (false면 다른 학년에서 이어받은 것) */
          isOwn: !!own,
        })
      }

      const seriesUnion = [
        ...new Set(
          [...byGrade.values()].map((c) => c.series).filter(Boolean) as string[],
        ),
      ]

      // 직접 정한 학년끼리만 비교해서 전환을 잡는다
      const pivots: CareerPivot[] = []
      for (const [from, to] of [[1, 2], [2, 3]] as [Grade, Grade][]) {
        const a = raw.get(from)
        const b = raw.get(to)
        if (!a || !b) continue

        const aSeries = a.major ? seriesOf.get(a.major) ?? null : null
        const bSeries = b.major ? seriesOf.get(b.major) ?? null : null
        const seriesChanged = !!aSeries && !!bSeries && aSeries !== bSeries
        const majorChanged = !!a.major && !!b.major && a.major !== b.major
        if (!seriesChanged && !majorChanged) continue

        pivots.push({
          fromGrade: from,
          toGrade: to,
          fromSeries: aSeries,
          toSeries: bSeries,
          fromMajor: a.major ?? null,
          toMajor: b.major ?? null,
          kind: seriesChanged ? 'series' : 'major',
        })
      }

      return { byGrade, seriesUnion, pivots }
    },
  })
}

/**
 * 그 학년 헤더에 띄울 목표 문구.
 * 고1은 계열, 고2는 학과, 고3은 직업군을 우선한다.
 */
export function goalTextOf(c: GradeCareer | undefined): string {
  if (!c) return '진로 미설정'

  const basis = GOAL_BASIS[c.grade]
  if (basis === '계열' && c.series) return `${c.series}계열`
  if (basis === '학과' && c.major) return c.major
  if (basis === '직업군' && (c.career || c.customGoal)) return (c.career ?? c.customGoal)!

  // 기준에 맞는 값이 없으면 있는 것 중 아무거나
  return c.major ?? c.career ?? c.customGoal ?? (c.series ? `${c.series}계열` : '진로 미설정')
}

export { GRADE_TEXT }


// ============================================================
// 완료 토글
// ============================================================

interface ToggleVars {
  node: RoadmapNode
  next: boolean
}

/**
 * 노드 완료 체크 토글.
 *
 * high_roadmap_progress에 row가 없으면 만들고, 있으면 갱신한다.
 * (student_id, node_id) 유니크가 걸려 있어서 upsert 한 번으로 끝난다.
 *
 * row가 생긴다는 건 곧 "이 과목을 듣기로 했다"는 뜻이기도 하다 —
 * pickNode()가 progress 있는 노드를 우선 고르기 때문에,
 * 선택과목 후보 중 체크한 게 화면에 남는다.
 */
export function useToggleNodeComplete() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const qc = useQueryClient()

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined
  const key = ['high-roadmap-board', studentId]

  return useMutation({
    mutationFn: async ({ node, next }: ToggleVars) => {
      if (!studentId || !academyId) throw new Error('학생 정보가 없습니다')

      const now = new Date().toISOString()
      const { error } = await supabase
        .from('high_roadmap_progress')
        .upsert(
          {
            student_id: studentId,
            academy_id: academyId,
            node_id: node.id,
            is_completed: next,
            completed_at: next ? now : null,
            updated_at: now,
          },
          { onConflict: 'student_id,node_id' },
        )

      if (error) throw error
    },

    // 낙관적 업데이트 — 클릭 즉시 체크가 반영된다
    onMutate: async ({ node, next }: ToggleVars) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<RoadmapBoardData>(key)

      if (prev) {
        const progress = new Map(prev.progress)
        const cur = progress.get(node.id)
        progress.set(node.id, {
          node_id: node.id,
          is_completed: next,
          completed_at: next ? new Date().toISOString() : null,
          teacher_memo: cur?.teacher_memo ?? null,
        })
        qc.setQueryData<RoadmapBoardData>(key, { ...prev, progress })
      }

      return { prev }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key })
    },
  })
}


// ============================================================
// 학교 창체 활동
// ============================================================

export type ChangcheCategory = '진로' | '자율' | '동아리'

export const CHANGCHE_CATEGORIES: ChangcheCategory[] = ['자율', '동아리', '진로']

/** 창체 3영역의 정식 명칭 (생기부 표기용) */
export const CATEGORY_LABEL: Record<ChangcheCategory, string> = {
  자율: '자율·자치활동',
  동아리: '동아리활동',
  진로: '진로활동',
}

export interface SchoolActivity {
  id: string
  category: ChangcheCategory
  subcategory: string | null
  name: string
  /** null = 3년 내내 하는 활동 */
  grade: number | null
  sort_order: number
}

export interface ChangcheSample {
  id: string
  category: ChangcheCategory
  subcategory: string
  name: string
  sort_order: number
}

/**
 * 학생이 입력한 우리 학교 창체 활동.
 * grade를 넘기면 그 학년 것 + 3년 공통(grade null)만 걸러서 준다.
 */
export function useMySchoolActivities(grade?: Grade) {
  const student = useAtomValue(studentState)
  const studentId = student?.id ? String(student.id) : undefined

  return useQuery({
    queryKey: ['my-school-activities', studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<SchoolActivity[]> => {
      const { data, error } = await supabase
        .from('high_school_activity')
        .select('id, category, subcategory, name, grade, sort_order')
        .eq('student_id', studentId!)
        .order('sort_order')

      if (error) throw error
      return (data ?? []) as SchoolActivity[]
    },
    select: (rows) =>
      grade ? rows.filter((r) => r.grade === null || r.grade === grade) : rows,
  })
}

/** 영역별로 묶어서 꺼내기 */
export function groupByCategory(rows: SchoolActivity[]) {
  const m = new Map<ChangcheCategory, SchoolActivity[]>()
  for (const c of CHANGCHE_CATEGORIES) m.set(c, [])
  for (const r of rows) m.get(r.category)?.push(r)
  return m
}

/**
 * 활동 예시 (교육과정 문서 기준).
 * 입력창이 비어 있으면 학생이 뭘 적어야 할지 모르니 후보로 띄운다.
 */
export function useChangcheSamples() {
  return useQuery({
    queryKey: ['changche-samples'],
    staleTime: 1000 * 60 * 60,   // 안 바뀌는 마스터
    queryFn: async (): Promise<Map<ChangcheCategory, Map<string, string[]>>> => {
      const { data, error } = await supabase
        .from('high_changche_sample')
        .select('category, subcategory, name, sort_order')
        .order('sort_order')

      if (error) throw error

      const m = new Map<ChangcheCategory, Map<string, string[]>>()
      for (const r of (data ?? []) as ChangcheSample[]) {
        let bySub = m.get(r.category)
        if (!bySub) {
          bySub = new Map()
          m.set(r.category, bySub)
        }
        const arr = bySub.get(r.subcategory)
        if (arr) arr.push(r.name)
        else bySub.set(r.subcategory, [r.name])
      }
      return m
    },
  })
}

interface AddVars {
  category: ChangcheCategory
  name: string
  /** null이면 3년 공통 */
  grade: number | null
  subcategory?: string | null
}

export function useAddSchoolActivity() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const qc = useQueryClient()

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined

  return useMutation({
    mutationFn: async ({ category, name, grade, subcategory }: AddVars) => {
      if (!studentId || !academyId) throw new Error('학생 정보가 없습니다')

      const trimmed = name.trim()
      if (!trimmed) throw new Error('활동 이름을 입력해주세요')

      const { error } = await supabase.from('high_school_activity').insert({
        student_id: studentId,
        academy_id: academyId,
        category,
        name: trimmed,
        grade,
        subcategory: subcategory ?? null,
      })

      // 같은 활동을 이미 넣은 경우 (유니크 위반) — 조용히 넘긴다
      if (error && error.code !== '23505') throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-school-activities', studentId] })
    },
  })
}

export function useDeleteSchoolActivity() {
  const student = useAtomValue(studentState)
  const qc = useQueryClient()
  const studentId = student?.id ? String(student.id) : undefined

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('high_school_activity')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-school-activities', studentId] })
    },
  })
}


// ============================================================
// 과목 연결 (학생이 직접 긋는 선)
// ============================================================

export interface RoadmapLink {
  id: string
  from_node_id: string
  to_node_id: string
  note: string | null
}

/** 학생이 그은 연결 전부 */
export function useMyRoadmapLinks() {
  const student = useAtomValue(studentState)
  const studentId = student?.id ? String(student.id) : undefined

  return useQuery({
    queryKey: ['my-roadmap-links', studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<RoadmapLink[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_link')
        .select('id, from_node_id, to_node_id, note')
        .eq('student_id', studentId!)

      if (error) throw error
      return (data ?? []) as RoadmapLink[]
    },
  })
}

interface CreateLinkVars {
  from: RoadmapNode
  to: RoadmapNode
  note?: string
}

export function useCreateRoadmapLink() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const qc = useQueryClient()

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined

  return useMutation({
    mutationFn: async ({ from, to, note }: CreateLinkVars) => {
      if (!studentId || !academyId) throw new Error('학생 정보가 없습니다')

      // 앞 학년 → 뒤 학년 방향만 허용 (DB CHECK로는 다른 테이블 값을 못 봐서 여기서 막는다)
      if (to.grade <= from.grade) {
        throw new Error('앞 학년에서 뒤 학년으로만 이을 수 있어요')
      }

      const { error } = await supabase.from('high_roadmap_link').insert({
        student_id: studentId,
        academy_id: academyId,
        from_node_id: from.id,
        to_node_id: to.id,
        note: note ?? null,
      })

      // 이미 같은 연결이 있으면 조용히 넘긴다
      if (error && error.code !== '23505') throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-roadmap-links', studentId] })
    },
  })
}

export function useDeleteRoadmapLink() {
  const student = useAtomValue(studentState)
  const qc = useQueryClient()
  const studentId = student?.id ? String(student.id) : undefined

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('high_roadmap_link')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-roadmap-links', studentId] })
    },
  })
}


// ============================================================
// 내가 들을 과목 고르기 (과목 설정 화면 + 세특 상세 공용)
// ============================================================

/**
 * 한 칸(라인 × 학년)에서 들을 과목 확정.
 * progress row가 생기면 그게 선택 — pickNode()가 그 노드를 우선 고른다.
 * 같은 칸의 다른 과목 중 아직 완료 안 한 선택은 지운다.
 */
export function useSelectNode() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const qc = useQueryClient()

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined

  return useMutation({
    mutationFn: async (v: { target: RoadmapNode; siblings: RoadmapNode[] }) => {
      if (!studentId || !academyId) throw new Error('학생 정보가 없습니다')

      const others = v.siblings.filter((c) => c.id !== v.target.id).map((c) => c.id)
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
          node_id: v.target.id,
          is_completed: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,node_id', ignoreDuplicates: true },
      )
      if (error) throw error
      return v.target
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['high-roadmap-board', studentId] })
    },
  })
}

/** 목록에 없는 과목을 학생이 직접 추가 */
export function useAddCustomNode() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const qc = useQueryClient()

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined

  return useMutation({
    mutationFn: async (v: {
      lineId: string
      grade: number
      subjectName: string
      electiveGroup?: string | null
    }) => {
      if (!studentId || !academyId) throw new Error('학생 정보가 없습니다')

      const { data, error } = await supabase
        .from('high_roadmap_node')
        .insert({
          line_id: v.lineId,
          grade: v.grade,
          subject_name: v.subjectName.trim(),
          is_default: false,
          elective_group: v.electiveGroup ?? null,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['high-roadmap-board', studentId] })
    },
  })
}