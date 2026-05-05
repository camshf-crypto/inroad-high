import { useState, useEffect } from 'react'
import {
  useAcademyTeachers,
  useTeacherProgress,
  useUpdateTeacherProgress,
  weekToLabel,
  MAX_VISIBLE_WEEK,
  ACTIVE_MONTHS,
  WEEKS_PER_MONTH,
} from '../../_hooks/middle/useTeacherProgress'

interface Props {
  level: 'high' | 'middle'
}

const GRADES = ['중1', '중2', '중3']

export default function TeacherProgressSection({ level }: Props) {
  const isMiddle = level === 'middle'

  // 고등은 아직 UI 없음 (DB만 준비됨)
  if (!isMiddle) return null

  return <MiddleProgressSection />
}

function MiddleProgressSection() {
  const { data: teachers = [], isLoading: teachersLoading } = useAcademyTeachers()
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)

  // 확인 모달 상태
  const [pendingChange, setPendingChange] = useState<{
    teacherId: string
    teacherName: string
    grade: string
    type: 'lesson' | 'homework'
    visibleUntil: number
    previousValue: number
  } | null>(null)

  const activeTeacherId = selectedTeacherId ?? teachers[0]?.id ?? null
  const activeTeacher = teachers.find(t => t.id === activeTeacherId)

  if (teachersLoading) {
    return (
      <div className="bg-white border border-line rounded-2xl p-6 mb-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="text-[13px] text-ink-secondary">선생님 목록을 불러오는 중...</div>
      </div>
    )
  }

  if (teachers.length === 0) {
    return (
      <div className="bg-white border border-line rounded-2xl p-6 mb-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">📊</span>
          <div className="text-[15px] font-extrabold text-ink tracking-tight">선생님별 진도 관리</div>
        </div>
        <div className="text-[12px] text-ink-secondary mt-3">
          아직 등록된 선생님이 없어요. 선생님을 등록하면 진도를 관리할 수 있어요.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-6 mb-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">📊</span>
        <div className="text-[15px] font-extrabold text-ink tracking-tight">선생님별 진도 관리</div>
      </div>
      <div className="text-[12px] text-ink-secondary mb-4">
        여기까지 학생에게 공개돼요. 각 반 진도에 맞춰 슬라이더를 조절해주세요.
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
              {t.role === 'admin' ? '👑' : '👨‍🏫'} {t.name}
            </button>
          )
        })}
      </div>

      {/* 진도 카드들 */}
      {activeTeacherId && activeTeacher && (
        <TeacherProgressCards
          teacherId={activeTeacherId}
          onRequestChange={(grade, type, visibleUntil, previousValue) =>
            setPendingChange({
              teacherId: activeTeacherId,
              teacherName: activeTeacher.name,
              grade,
              type,
              visibleUntil,
              previousValue,
            })
          }
        />
      )}

      {/* 확인 모달 */}
      {pendingChange && (
        <ConfirmModal
          pending={pendingChange}
          onCancel={() => setPendingChange(null)}
          onConfirm={() => setPendingChange(null)}
        />
      )}
    </div>
  )
}

function TeacherProgressCards({
  teacherId,
  onRequestChange,
}: {
  teacherId: string
  onRequestChange: (
    grade: string,
    type: 'lesson' | 'homework',
    visibleUntil: number,
    previousValue: number,
  ) => void
}) {
  const { data: progressMap, isLoading } = useTeacherProgress(teacherId)

  if (isLoading) {
    return <div className="text-[12px] text-ink-secondary">진도를 불러오는 중...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {GRADES.map(grade => (
        <GradeProgressCard
          key={grade}
          grade={grade}
          progress={progressMap?.get(grade)}
          onRequestChange={(type, visibleUntil, previousValue) =>
            onRequestChange(grade, type, visibleUntil, previousValue)
          }
        />
      ))}
    </div>
  )
}

function GradeProgressCard({
  grade,
  progress,
  onRequestChange,
}: {
  grade: string
  progress?: { lessons_visible_until: number; homework_visible_until: number }
  onRequestChange: (
    type: 'lesson' | 'homework',
    visibleUntil: number,
    previousValue: number,
  ) => void
}) {
  const lessonsWeek = progress?.lessons_visible_until ?? 0
  const homeworkWeek = progress?.homework_visible_until ?? 0

  return (
    <div className="border border-line rounded-xl p-4 bg-[#F8FAFC]">
      <div className="text-[13px] font-extrabold text-ink mb-3 flex items-center gap-1.5">
        <span>🌱</span> {grade}
      </div>

      {/* 수업 진도 */}
      <ProgressSlider
        icon="📚"
        label="수업 진도"
        value={lessonsWeek}
        onChange={(week) => onRequestChange('lesson', week, lessonsWeek)}
      />

      {/* 숙제 진도 */}
      <div className="mt-4">
        <ProgressSlider
          icon="✏️"
          label="숙제 진도"
          value={homeworkWeek}
          onChange={(week) => onRequestChange('homework', week, homeworkWeek)}
        />
      </div>
    </div>
  )
}

function ProgressSlider({
  icon,
  label,
  value,
  onChange,
}: {
  icon: string
  label: string
  value: number
  onChange: (week: number) => void
}) {
  const [localValue, setLocalValue] = useState(value)
  const [isDragging, setIsDragging] = useState(false)

  // 드래그 중이 아닐 때만 외부 value(prop)와 동기화
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value)
    }
  }, [value, isDragging])

  const display = weekToLabel(localValue)

  const handleRelease = () => {
    setIsDragging(false)
    if (localValue !== value) {
      onChange(localValue)
    }
  }

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

      {/* 슬라이더 */}
      <input
        type="range"
        min={0}
        max={MAX_VISIBLE_WEEK}
        step={1}
        value={localValue}
        onChange={e => setLocalValue(parseInt(e.target.value))}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
        onMouseUp={handleRelease}
        onTouchEnd={handleRelease}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
      />

      {/* 눈금 — 월별 큰 눈금 + 라벨 */}
      <div className="relative w-full mt-2 h-3">
        {ACTIVE_MONTHS.map((month, idx) => {
          // 각 월의 시작 위치 (1주차) 비율
          // 0 = 시작전, 1~4 = 1월 1~4주차, 5~8 = 2월, ...
          const startWeek = idx * WEEKS_PER_MONTH + 1  // 해당 월 1주차의 누적 주차
          const leftPct = (startWeek / MAX_VISIBLE_WEEK) * 100

          return (
            <div
              key={month}
              className="absolute -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${leftPct}%` }}
            >
              <div className="w-[2px] h-1.5 bg-gray-300" />
            </div>
          )
        })}
      </div>

      {/* 월 라벨 */}
      <div className="relative w-full h-4 mt-0.5">
        {ACTIVE_MONTHS.map((month, idx) => {
          const startWeek = idx * WEEKS_PER_MONTH + 1
          const leftPct = (startWeek / MAX_VISIBLE_WEEK) * 100
          const isCurrentMonth = localValue >= startWeek && localValue < startWeek + WEEKS_PER_MONTH

          return (
            <div
              key={month}
              className="absolute -translate-x-1/2 text-[10px] font-bold transition-colors"
              style={{
                left: `${leftPct}%`,
                color: isCurrentMonth ? '#059669' : '#9CA3AF',
              }}
            >
              {month}월
            </div>
          )
        })}
      </div>

      {/* 시작 전 / 완료 표시 */}
      <div className="flex justify-between text-[9px] text-ink-muted mt-1.5">
        <span>시작 전</span>
        <span>완료</span>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────
// 확인 모달 - 슬라이더 변경 시 학생에게 즉시 공개되는 점 확인
// ───────────────────────────────────────────────

function ConfirmModal({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: {
    teacherId: string
    teacherName: string
    grade: string
    type: 'lesson' | 'homework'
    visibleUntil: number
    previousValue: number
  }
  onCancel: () => void
  onConfirm: () => void
}) {
  const updateMutation = useUpdateTeacherProgress(pending.teacherId)

  const typeLabel = pending.type === 'lesson' ? '수업' : '숙제'
  const beforeLabel = weekToLabel(pending.previousValue)
  const afterLabel = weekToLabel(pending.visibleUntil)
  const isIncreasing = pending.visibleUntil > pending.previousValue

  const handleConfirm = async () => {
    try {
      await updateMutation.mutateAsync({
        grade: pending.grade,
        type: pending.type,
        visibleUntil: pending.visibleUntil,
      })
      onConfirm()
    } catch (err) {
      alert('저장에 실패했어요. 다시 시도해주세요.')
      console.error(err)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-6 w-[420px] max-w-[90vw] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{isIncreasing ? '📢' : '⚠️'}</span>
          <div className="text-[16px] font-extrabold text-ink">
            {isIncreasing ? '학생에게 공개하시겠어요?' : '진도를 되돌리시겠어요?'}
          </div>
        </div>

        <div className="bg-[#F8FAFC] rounded-xl p-4 mb-4 border border-line">
          <div className="text-[12px] font-medium text-ink-secondary mb-2">
            {pending.teacherName} · {pending.grade} · {typeLabel} 진도
          </div>
          <div className="flex items-center gap-2 text-[14px] font-bold">
            <span className="text-ink-muted">{beforeLabel}</span>
            <span className="text-emerald-600">→</span>
            <span className="text-emerald-700">{afterLabel}</span>
          </div>
        </div>

        <div className="text-[12.5px] text-ink-secondary leading-relaxed mb-5">
          {isIncreasing ? (
            <>
              저장하면 <strong className="text-ink">{pending.teacherName}</strong> 선생님 반의{' '}
              <strong className="text-ink">{pending.grade}</strong> 학생들에게{' '}
              <strong className="text-emerald-700">{afterLabel}</strong>까지의 {typeLabel} 영상이{' '}
              <strong className="text-ink">즉시 공개</strong>돼요.
              <br />
              <br />
              수업이 끝난 후에 공개하시는 게 맞나요?
            </>
          ) : (
            <>
              저장하면 학생들이 보던 <strong className="text-ink">{beforeLabel}</strong>까지의{' '}
              {typeLabel} 영상이 <strong className="text-red-600">다시 잠겨요</strong>.
              <br />
              <br />
              정말 되돌리시겠어요?
            </>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={updateMutation.isPending}
            className="px-5 h-10 rounded-lg bg-white border border-line text-[13px] font-semibold text-ink-secondary hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={updateMutation.isPending}
            className="px-5 h-10 rounded-lg text-[13px] font-bold text-white transition-colors disabled:opacity-50"
            style={{
              background: isIncreasing ? '#059669' : '#DC2626',
            }}
          >
            {updateMutation.isPending ? '저장 중...' : isIncreasing ? '공개하기' : '되돌리기'}
          </button>
        </div>
      </div>
    </div>
  )
}