import { useState } from 'react'
import {
  ROADMAP,
  toGradeKey,
  parseMonth,
  type GradeKey,
  type Mission,
} from '../../../../../../constants/roadmap'
import {
  useHighRoadmapProgress,
  useToggleMissionComplete,
  useUpdateMissionMemo,
} from '../../../../_hooks/useHighRoadmap'

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

interface Props {
  student: any
  viewGrade?: GradeKey
}

export default function RoadmapTab({ student, viewGrade }: Props) {
  const studentId: string = student.id
  const studentGrade: GradeKey = toGradeKey(student?.grade)

  const currentViewGrade: GradeKey = viewGrade || studentGrade

  const [selMonth, setSelMonth] = useState<number | null>(null)
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({})

  const { data: progressMap, isLoading } = useHighRoadmapProgress(studentId)
  const toggleMutation = useToggleMissionComplete(studentId)
  const memoMutation = useUpdateMissionMemo(studentId)

  const roadmap = ROADMAP[currentViewGrade]
  const curMonth = new Date().getMonth() + 1 + '월'
  const curYear = new Date().getFullYear()

  const canEdit = currentViewGrade === studentGrade

  const isDone = (key: string) => progressMap?.get(key)?.is_completed === true
  const getMemo = (key: string) =>
    memoDrafts[key] ?? progressMap?.get(key)?.teacher_memo ?? ''

  const selected = selMonth !== null ? roadmap[selMonth] : null

  const scColor = (type: Mission['type']) => {
    if (type === 'inAnswer') return { bg: '#EDE9FE', c: '#6D28D9', label: '✨ B-KEARS' }
    if (type === 'tab') return { bg: THEME.accentBg, c: THEME.accent, label: '🔗 바로가기' }
    return { bg: '#F0FDF4', c: '#15803D', label: '👨‍🏫 선생님' }
  }

  const handleToggle = (mission: Mission, monthStr: string) => {
    if (!canEdit) return
    toggleMutation.mutate({
      missionKey: mission.key,
      month: parseMonth(monthStr),
      year: curYear,
      missionTitle: mission.t,
      isCompleted: !isDone(mission.key),
    })
  }

  const handleSaveMemo = (mission: Mission, monthStr: string) => {
    if (!canEdit) return
    const memo = memoDrafts[mission.key]
    if (memo === undefined) return
    memoMutation.mutate({
      missionKey: mission.key,
      month: parseMonth(monthStr),
      year: curYear,
      missionTitle: mission.t,
      memo,
    })
    setMemoDrafts(prev => {
      const next = { ...prev }
      delete next[mission.key]
      return next
    })
  }

  return (
    <div>

      {/* 안내 배너 */}
      {canEdit ? (
        <div
          className="rounded-xl px-4 py-2.5 mb-4 text-[12px] font-medium flex items-center gap-2"
          style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60`, color: THEME.accentDark }}
        >
          ✏️ 미션을 <b className="mx-1">체크하고 메모</b>를 남겨주세요. 학생이 바로 확인할 수 있어요.
        </div>
      ) : (
        <div
          className="rounded-xl px-4 py-2.5 mb-4 text-[12px] font-medium flex items-center gap-2"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
        >
          👁️ 현재 학년이 <b className="mx-1">{studentGrade}</b>이라서 <b className="mx-1">{currentViewGrade}</b> 로드맵은 미리보기만 가능해요.
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="bg-white border border-line rounded-2xl p-10 text-center mb-4">
          <div
            className="inline-block w-6 h-6 border-2 border-gray-200 rounded-full animate-spin mb-3"
            style={{ borderTopColor: THEME.accent }}
          />
          <div className="text-[13px] text-ink-secondary font-medium">진행 상황을 불러오는 중...</div>
        </div>
      )}

      {/* 월 그리드 + 미션 패널 */}
      <div className={`grid gap-4 items-start ${selected ? 'grid-cols-[1fr_360px] max-lg:grid-cols-1' : 'grid-cols-1'}`}>

        {/* 왼쪽: 월 그리드 */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="text-[14px] font-bold text-ink mb-1 tracking-tight">
            {currentViewGrade} 연간 로드맵
          </div>
          <div className="text-[11px] text-ink-secondary mb-4">월을 클릭하면 상세 미션을 확인할 수 있어요.</div>

          <div className="grid grid-cols-4 max-md:grid-cols-2 gap-2.5">
            {roadmap.map((m, i) => {
              const done = m.missions.filter(ms => isDone(ms.key)).length
              const pct = Math.round((done / m.missions.length) * 100)
              const isCur = canEdit && m.m === curMonth
              const isSel = selMonth === i
              const isDoneAll = pct === 100

              return (
                <div
                  key={i}
                  onClick={() => setSelMonth(selMonth === i ? null : i)}
                  className="rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-0.5"
                  style={{
                    border: `1px solid ${isSel ? THEME.accent : isCur ? THEME.accentBorder : '#E5E7EB'}`,
                    background: isSel ? THEME.accentBg : isCur ? '#F8FAFF' : '#fff',
                    boxShadow: isSel ? `0 4px 16px ${THEME.accentShadow}` : 'none',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold mb-2"
                    style={{
                      background: isSel ? THEME.accent : isCur ? THEME.accentBorder : isDoneAll ? '#ECFDF5' : '#F3F4F6',
                      color: isSel ? '#fff' : isCur ? '#fff' : isDoneAll ? '#059669' : '#6B7280',
                    }}
                  >
                    {isDoneAll ? '✓' : m.m.replace('월', '')}
                  </div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <div className="text-[12.5px] font-bold text-ink">{m.m}</div>
                    {isCur && (
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ color: THEME.accent, background: THEME.accentBg }}
                      >
                        NOW
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-ink-secondary mb-2 leading-[1.4] h-7 line-clamp-2">{m.theme}</div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: isDoneAll ? '#059669' : THEME.accent,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-ink-muted font-medium">{done}/{m.missions.length} 완료</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 오른쪽: 미션 패널 */}
        {selected && selMonth !== null && (
          <div
            className="bg-white rounded-2xl p-5 sticky top-0"
            style={{
              border: `2px solid ${THEME.accent}`,
              boxShadow: `0 8px 24px ${THEME.accentShadow}`,
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[15px] font-extrabold text-ink tracking-tight">📅 {selected.m}</div>
                <div className="text-[11px] text-ink-secondary mt-1 font-medium">{selected.theme}</div>
                <div
                  className="text-[10px] font-bold mt-1.5 inline-block px-2 py-0.5 rounded-full"
                  style={{ color: THEME.accent, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                >
                  ⏰ {selected.freq}
                </div>
              </div>
              <button
                onClick={() => setSelMonth(null)}
                className="cursor-pointer text-ink-muted hover:text-ink text-base w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">📋 미션 목록</div>

            {selected.missions.map((ms, mi) => {
              const tc = scColor(ms.type)
              const done = isDone(ms.key)
              const memo = getMemo(ms.key)
              const hasUnsavedMemo = memoDrafts[ms.key] !== undefined

              return (
                <div
                  key={mi}
                  className="rounded-lg px-3 py-2.5 mb-1.5 transition-all"
                  style={{
                    background: done ? '#ECFDF5' : '#F8FAFC',
                    border: `1px solid ${done ? '#6EE7B7' : '#E5E7EB'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(ms, selected.m)}
                      disabled={!canEdit || toggleMutation.isPending}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 transition-all disabled:cursor-not-allowed"
                      style={{
                        background: done ? '#059669' : '#D1D5DB',
                        cursor: canEdit ? 'pointer' : 'not-allowed',
                        opacity: canEdit ? 1 : 0.6,
                      }}
                      title={canEdit ? '완료 토글' : '현재 학년에서만 체크 가능해요'}
                    >
                      {done ? '✓' : ''}
                    </button>
                    <span
                      className="text-[12px] flex-1 leading-[1.5]"
                      style={{
                        color: done ? '#059669' : '#1a1a1a',
                        fontWeight: done ? 700 : 600,
                      }}
                    >
                      {ms.t}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: tc.bg, color: tc.c }}
                    >
                      {tc.label}
                    </span>
                  </div>

                  {/* 메모 영역 */}
                  {canEdit ? (
                    <div className="mt-2 ml-6">
                      <textarea
                        value={memo}
                        onChange={e => setMemoDrafts(prev => ({ ...prev, [ms.key]: e.target.value }))}
                        placeholder="메모 (선생님용)"
                        rows={2}
                        className="w-full text-[11px] border border-line rounded-md px-2 py-1.5 resize-none outline-none transition-all placeholder:text-ink-muted"
                        style={{ background: '#fff' }}
                        onFocus={e => {
                          e.target.style.borderColor = THEME.accent
                          e.target.style.boxShadow = `0 0 0 2px ${THEME.accentShadow}`
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = '#E5E7EB'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                      {hasUnsavedMemo && (
                        <div className="flex justify-end gap-1.5 mt-1">
                          <button
                            onClick={() => setMemoDrafts(prev => {
                              const n = { ...prev }; delete n[ms.key]; return n
                            })}
                            className="text-[10px] font-semibold text-ink-secondary px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSaveMemo(ms, selected.m)}
                            disabled={memoMutation.isPending}
                            className="text-[10px] font-bold text-white px-2.5 py-0.5 rounded transition-colors disabled:opacity-60"
                            style={{ background: THEME.accent }}
                          >
                            {memoMutation.isPending ? '저장 중...' : '저장'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    memo && (
                      <div
                        className="mt-2 ml-6 text-[11px] text-ink-secondary bg-white border rounded-md px-2.5 py-1.5 whitespace-pre-wrap"
                        style={{ borderColor: THEME.accentBorder + '60' }}
                      >
                        <div className="text-[10px] font-bold mb-1" style={{ color: THEME.accentDark }}>
                          👨‍🏫 원장님 메모
                        </div>
                        {memo}
                      </div>
                    )
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}