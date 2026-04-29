import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// 학생용 - 읽기 전용

export type SaenggibuCategory = '세특' | '동아리' | '자율' | '진로'

export interface SaenggibuItem {
  id: string
  student_id: string
  grade: number
  category: SaenggibuCategory
  subject: string | null
  content: string | null
  char_count: number
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
}

export const gradeToNum = (grade: string): number => {
  if (grade === '고1' || grade === '1') return 1
  if (grade === '고2' || grade === '2') return 2
  if (grade === '고3' || grade === '3') return 3
  return 1
}

// 폴링 주기 (ms) - 원장이 게시하면 학생 화면 자동 업데이트
const POLL_INTERVAL = 2000

// ─────────────────────────────────────────────
// 1. 내 생기부 조회 (학년별, published만)
// ─────────────────────────────────────────────

export function useMySaenggibu(grade: number) {
  return useQuery({
    queryKey: ['my-saenggibu', grade],
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<SaenggibuItem[]> => {
      // RLS 정책에서 본인 + published만 조회되도록 설정됨
      const { data, error } = await supabase
        .from('high_saenggibu_item')
        .select('*')
        .eq('grade', grade)
        .eq('status', 'published')
        .order('category')
        .order('subject')
      if (error) throw error
      return data as SaenggibuItem[]
    },
  })
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

export function findItem(
  items: SaenggibuItem[],
  category: SaenggibuCategory,
  subject?: string | null
): SaenggibuItem | undefined {
  return items.find(
    i => i.category === category && (i.subject || null) === (subject || null)
  )
}

// 학년의 모든 세특 과목 리스트
export function getSubjectsInGrade(items: SaenggibuItem[]): string[] {
  return items
    .filter(i => i.category === '세특' && i.subject)
    .map(i => i.subject!)
    .sort()
}