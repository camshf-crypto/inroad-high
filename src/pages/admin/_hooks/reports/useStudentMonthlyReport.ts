// src/pages/admin/_hooks/useStudentMonthlyReport.ts
// 학생 1명의 월간 활동 데이터를 한 번에 가져오는 hook

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────
export interface StudentMonthlyReportData {
  // 12개 활동 카운트
  essay_count: number              // 자소서
  past_answer_count: number        // 기출문제 답변
  simulation_count: number         // AI 면접 시뮬레이션
  interview_count: number          // 면접
  passage_count: number            // 제시문 면접
  reading_count: number            // 독서
  lessons_progress_count: number   // 수업 영상 진도
  homework_progress_count: number  // 숙제 진도
  homework_submission_count: number // 숙제 제출
  suhaeng_count: number            // 수행평가
  
  // 기간 정보
  period: {
    year_month: string             // '2026-06'
    start_date: string             // ISO timestamp
    end_date: string
  }
}

// ─────────────────────────────────────────────
// Hook: 학생 1명의 월간 활동 데이터 가져오기
// ─────────────────────────────────────────────
export function useStudentMonthlyReport(
  studentId: string | null | undefined,
  yearMonth: string  // '2026-06'
) {
  return useQuery({
    queryKey: ['student-monthly-report', studentId, yearMonth],
    enabled: !!studentId && !!yearMonth,
    queryFn: async (): Promise<StudentMonthlyReportData> => {
      const { data, error } = await supabase.rpc(
        'get_student_monthly_report_data',
        {
          p_student_id: studentId,
          p_year_month: yearMonth,
        }
      )
      
      if (error) {
        console.error('월간 보고서 데이터 조회 실패:', error)
        throw error
      }
      
      return data as StudentMonthlyReportData
    },
  })
}

// ─────────────────────────────────────────────
// 사용 예시 (Reports.tsx 편집 화면에서)
// ─────────────────────────────────────────────
//
// const { data: reportData, isLoading } = useStudentMonthlyReport(
//   selectedStudent?.id,
//   '2026-06'
// )
//
// if (isLoading) return <Loading />
// if (!reportData) return <Empty />
//
// // reportData.essay_count, reportData.simulation_count 등 사용
//