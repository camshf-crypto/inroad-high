import { useState, useMemo } from 'react'
import {
  useAcademyTeachers,
  useTeacherProgress,
  useUpdateTeacherProgress,
} from '../../_hooks/middle/useTeacherProgress'

interface Props {
  level: 'high' | 'middle'
}

const GRADES = ['중1', '중2', '중3']

// 진도 월 옵션 (middle_lessons에 데이터 있는 달만)
const LESSON_MONTHS = [1, 2, 3, 5, 7, 8, 10, 12]
const WEEKS = [1, 2, 3, 4]

export default function TeacherProgressSection({ level }: Props) {
  const isMiddle = level === 'middle'

  // 고등은 아직 UI 없음 (DB만 준비됨)
  if (!isMiddle) return null

  return <MiddleProgressSection />
}

function MiddleProgressSection() {
  const { data: teachers = [], isLoading: teachersLoading } = useAcademyTeachers()
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)

  // 첫 선생님 자동 선택
  const activeTeacherId = selectedTeacherId ?? teachers[0]?.id ?? null

  if (teachersLoading) {
    return (
      <div className="bg-white border border-line rounded-2xl p-6 mb-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="text-[13px] text-ink-secondary">선생님 목록을 불러오는 중...</div>
      </div>
    )
  }

  if (teachers.length === 0) {
    return null
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-6 mb-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">📊</span>
        <div className="text-[15px] font-extrabold text-ink tracking-tight">선생님별 진도 관리</div>
      </div>
      <div className="text-[12px] text-ink-secondary mb-4">
        여기까지 학생에게 노출돼요. 각 반 진도에 맞춰 슬라이더를 조절해주세요.
      </div>

      {/* 선생님 탭 */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {teachers.map(t => {
          const isActive = activeTeacherId === t.id
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTeacherId(t.id)}
              className="px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
              style={{
                background: isActive ? '#059669' : '#fff',
                color: isActive ? '#fff' : '#6B7280',
                borderColor: isActive ? '#059669' : '#E5E7EB',
                boxShadow: isActive ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none',
              }}
            >
              {t.role === 'OWNER' ? '👑' : '👨‍🏫'} {t.name}
            </button>
          )
        })}
      </div>

      {/* 진도 카드들 */}
      {activeTeacherId && (
        <TeacherProgressCards teacherId={activeTeacherId} />
      )}
    </div>
  )
}

function TeacherProgressCards({ teacherId }: { teacherId: string }) {
  const { data: progressMap, isLoading } = useTeacherProgress(teacherId)

  if (isLoading) {
    return <div className="text-[12px] text-ink-secondary">진도를 불러오는 중...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {GRADES.map(grade => (
        <GradeProgressCard
          key={grade}
          teacherId={teacherId}
          grade={grade}
          progress={progressMap?.get(grade)}
        />
      ))}
    </div>
  )
}

function GradeProgressCard({
  teacherId,
  grade,
  progress,
}: {
  teacherId: string
  grade: string
  progress?: { lesson_month: number | null; lesson_week: number | null; homework_month: number | null; homework_week: number | null }
}) {
  const updateMutation = useUpdateTeacherProgress(teacherId)

  const lessonMonth = progress?.lesson_month ?? null
  const lessonWeek = progress?.lesson_week ?? null
  const homeworkMonth = progress?.homework_month ?? null
  const homeworkWeek = progress?.homework_week ?? null

  return (
    <div className="border border-line rounded-xl p-4 bg-[#F8FAFC]">
      <div className="text-[13px] font-extrabold text-ink mb-3 flex items-center gap-1.5">
        <span>🌱</span> {grade}
      </div>

      {/* 수업 진도 */}
      <ProgressRow
        icon="📚"
        label="수업 진도"
        month={lessonMonth}
        week={lessonWeek}
        onChange={(month, week) =>
          updateMutation.mutate({ grade, type: 'lesson', month, week })
        }
      />

      {/* 숙제 진도 */}
      <div className="mt-3">
        <ProgressRow
          icon="✏️"
          label="숙제 진도"
          month={homeworkMonth}
          week={homeworkWeek}
          onChange={(month, week) =>
            updateMutation.mutate({ grade, type: 'homework', month, week })
          }
        />
      </div>
    </div>
  )
}

function ProgressRow({
  icon,
  label,
  month,
  week,
  onChange,
}: {
  icon: string
  label: string
  month: number | null
  week: number | null
  onChange: (month: number | null, week: number | null) => void
}) {
  const display = useMemo(() => {
    if (month === null || week === null) return '시작 전'
    return `${month}월 ${week}주차`
  }, [month, week])

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12px] font-bold text-ink-secondary flex items-center gap-1">
          <span>{icon}</span> {label}
        </div>
        <div className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          {display}
        </div>
      </div>
      <div className="flex gap-1.5">
        <select
          value={month ?? ''}
          onChange={e => {
            const val = e.target.value
            onChange(val === '' ? null : parseInt(val), val === '' ? null : (week ?? 1))
          }}
          className="flex-1 h-8 px-2 border border-line rounded-md text-[11px] bg-white outline-none cursor-pointer"
        >
          <option value="">시작 전</option>
          {LESSON_MONTHS.map(m => (
            <option key={m} value={m}>{m}월</option>
          ))}
        </select>
        <select
          value={week ?? ''}
          onChange={e => {
            const val = e.target.value
            if (val === '') return
            onChange(month ?? 1, parseInt(val))
          }}
          disabled={month === null}
          className="flex-1 h-8 px-2 border border-line rounded-md text-[11px] bg-white outline-none cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
        >
          <option value="">-</option>
          {WEEKS.map(w => (
            <option key={w} value={w}>{w}주차</option>
          ))}
        </select>
      </div>
    </div>
  )
}