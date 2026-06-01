import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SetechLite {
  id: number
  field: string        // 계열
  grade: number        // 1 | 2 | 3
  major: string        // 학과
  subject: string      // 과목
  activity: string     // 세특 활동
  topics: string[]     // 세특 탐구 (jsonb 배열)
  competency: string | null
  views: number
}

interface Filters {
  field?: string       // 계열
  grade?: number       // 학년
  major?: string       // 학과 (부분 일치)
  subject?: string     // 과목
}

/**
 * 세특 라이트 목록 조회
 * 필터(계열/학년/학과/과목)가 하나도 없으면 빈 배열 반환 (불필요한 전체 조회 방지)
 */
export function useSetechLite(filters: Filters = {}) {
  const { field, grade, major, subject } = filters
  // 학과 또는 과목이 지정됐을 때만 조회 (학년/계열만으로 전체를 긁지 않음)
  const hasMeaningfulFilter = !!(major || subject || field)

  return useQuery({
    queryKey: ['setech_lite', field ?? null, grade ?? null, major ?? null, subject ?? null],
    enabled: hasMeaningfulFilter,
    queryFn: async (): Promise<SetechLite[]> => {
      let q = supabase.from('setech_lite').select('*').order('views', { ascending: false })

      if (field) q = q.eq('field', field)
      if (grade) q = q.eq('grade', grade)
      if (major) q = q.ilike('major', `%${major}%`)   // 학과 부분 일치 ('기계' → 기계공학과)
      if (subject) q = q.eq('subject', subject)

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as SetechLite[]
    },
  })
}

/**
 * 특정 계열+학년에서 실제 존재하는 과목 목록 (칩 UI용)
 * 건수 많은 순으로 정렬해서 반환
 */
export function useSetechSubjects(field?: string, grade?: number) {
  return useQuery({
    queryKey: ['setech_subjects', field ?? null, grade ?? null],
    enabled: !!field,
    queryFn: async (): Promise<{ name: string; count: number }[]> => {
      let q = supabase.from('setech_lite').select('subject')
      if (field) q = q.eq('field', field)
      if (grade) q = q.eq('grade', grade)
      const { data, error } = await q
      if (error) throw error
      const counts: Record<string, number> = {}
      ;(data ?? []).forEach((r: any) => { counts[r.subject] = (counts[r.subject] ?? 0) + 1 })
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    },
  })
}

/** 조회수 증가 (상세 펼칠 때 호출) */
export async function incrementSetechView(id: number) {
  await supabase.rpc('increment_setech_view', { p_id: id })
}

/**
 * 학과 자동완성 목록 (검색어 부분 일치)
 * 입력이 비어있으면 빈 배열. 입력 있으면 매칭되는 학과명(중복 제거) 반환
 */
export function useSetechMajors(query: string) {
  const q = query.trim()
  return useQuery({
    queryKey: ['setech_majors', q],
    enabled: q.length > 0,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('setech_lite')
        .select('major')
        .ilike('major', `%${q}%`)
        .limit(500)
      if (error) throw error
      const set = new Set<string>()
      ;(data ?? []).forEach((r: any) => set.add(r.major))
      return Array.from(set).sort((a, b) => a.localeCompare(b))
    },
  })
}