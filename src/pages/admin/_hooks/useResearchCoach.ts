import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SetechRef {
  id: number
  series: string
  grade: string
  major: string
  subject: string
  activity: string
  inquiry: string
  capability: string
}

export interface CoachResult {
  reply: string
  refs: SetechRef[]
  keyword: string | null
  isFirstTurn: boolean
  dataMode: 'matched' | 'major_only' | 'none'
}

interface CoachInput {
  major: string
  grade?: string
  month?: string
  subject?: string
  job?: string
  topic?: string
  content?: string
  message?: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export function useResearchCoach() {
  return useMutation({
    mutationFn: async (input: CoachInput): Promise<CoachResult> => {
      const { data, error } = await supabase.functions.invoke('research-coach', {
        body: input,
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data as CoachResult
    },
  })
}