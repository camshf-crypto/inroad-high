// src/lib/realtime/useStudentRealtime.ts
// 학생용: 선생님이 무언가 보냈을 때만 화면을 새로고침하기 위한 훅
//
// 핵심 동작:
//  1. Supabase Realtime 으로 student_id 가 자기 자신인 row 변경을 구독
//  2. payload.new 와 payload.old 를 비교해서 "선생님이 보낸 변경"인지 판별
//     (학생 본인 작성 → 무시, 선생님 행동 → onTeacherAction 호출)
//  3. 디바운스 적용: 같은 row가 2초 내에 여러 번 바뀌어도 1번만 콜백
//
// 사용법:
//   useStudentRealtime({
//     studentId: student.id,
//     tables: ['middle_homework_submissions', 'homework_submissions'], // 학년별
//     onTeacherAction: () => loadHomework(),
//   })

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../supabase'

type Row = Record<string, any>

/**
 * 어떤 컬럼이 바뀌면 "선생님 액션" 으로 간주할지.
 * 이 컬럼들 중 하나라도 old → new 로 변하면 콜백.
 */
const TEACHER_ACTION_COLUMNS = [
  'final_feedback',         // 피드백 발행
  'feedback_status',        // pending_review → published
  'published_at',
  'resubmit_allowed',       // 재제출 허용
  'resubmit_allowed_at',
  'ai_feedback',            // AI 피드백 생성 (선생님이 트리거)
  'transcript',             // STT 완료 (사실상 시스템이지만 학생이 기다리는 신호)
  'stt_status',
]

interface UseStudentRealtimeArgs {
  studentId: string | number | undefined
  tables: string[]                          // 구독할 테이블 (예: ['middle_homework_submissions'])
  onTeacherAction: () => void               // 선생님 액션이 감지되면 호출됨
  debounceMs?: number                       // 같은 row 여러 변경 묶기 (기본 1500ms)
  enabled?: boolean                         // false면 구독 안 함
}

export function useStudentRealtime({
  studentId,
  tables,
  onTeacherAction,
  debounceMs = 1500,
  enabled = true,
}: UseStudentRealtimeArgs) {
  // 콜백 ref 로 안정화 — 외부에서 closure 갱신해도 effect 재구독 안 함
  const cbRef = useRef(onTeacherAction)
  useEffect(() => {
    cbRef.current = onTeacherAction
  }, [onTeacherAction])

  // 디바운스 타이머
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || !studentId || tables.length === 0) return

    const channels: RealtimeChannel[] = []

    for (const table of tables) {
      const channel = supabase
        .channel(`student-rt-${table}-${studentId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',                                // INSERT는 학생 본인 행동이라 무시
            schema: 'public',
            table,
            filter: `student_id=eq.${studentId}`,            // 자기 row 만
          },
          (payload) => {
            const oldRow = payload.old as Row
            const newRow = payload.new as Row
            if (isTeacherAction(oldRow, newRow)) {
              // 디바운스
              if (timerRef.current) clearTimeout(timerRef.current)
              timerRef.current = setTimeout(() => {
                cbRef.current()
                timerRef.current = null
              }, debounceMs)
            }
          }
        )
        .subscribe()
      channels.push(channel)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      for (const ch of channels) {
        supabase.removeChannel(ch)
      }
    }
  }, [studentId, tables.join(','), debounceMs, enabled])
}

/**
 * old/new row 비교해서 "선생님 액션"으로 보이는지 판별.
 * TEACHER_ACTION_COLUMNS 중 하나라도 의미있게 변했으면 true.
 */
function isTeacherAction(oldRow: Row, newRow: Row): boolean {
  if (!oldRow || !newRow) return true   // payload 일부 누락 시 안전하게 갱신
  for (const col of TEACHER_ACTION_COLUMNS) {
    const o = oldRow[col]
    const n = newRow[col]
    if (!shallowEqual(o, n)) {
      return true
    }
  }
  return false
}

function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false
  if (typeof a === 'object') {
    // jsonb 컬럼(ai_feedback, final_feedback) 비교
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }
  return false
}