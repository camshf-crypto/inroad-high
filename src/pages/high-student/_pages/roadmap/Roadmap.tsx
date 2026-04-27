import { useState, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '../../_store/auth'
import {
  ROADMAP,
  toGradeKey,
  type GradeKey,
  type Mission,
} from '../../../../constants/roadmap'
import { useMyHighRoadmapProgress } from '../../_hooks/useMyHighRoadmap'

// 파랑 테마
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

export default function Roadmap() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const [selMonth, setSelMonth] = useState<number | null>(null)

  // ✅ DB에서 내 진행 상태 조회
  const { data: progressMap, isLoading } = useMyHighRoadmapProgress()

  // 학생 본인 학년
  const myGrade: GradeKey = toGradeKey(student?.grade)
  const roadmap = ROADMAP[myGrade]
  const curMonth = new Date().getMonth() + 1 + '월'

  // 미션 완료 여부 조회
  const isDone = (key: string) => progressMap?.get(key)?.is_completed === true
  const getMemo = (key: string) => progressMap?.get(key)?.teacher_memo

  // 진행률 계산
  const { totalMissions, doneMissions, overallPct } = useMemo(() => {
    const total = roadmap.reduce((a, m) => a + m.missions.length, 0)
    const done = roadmap.reduce(
      (a, m) => a + m.missions.filter(ms => isDone(ms.key)).length,
      0,
    )
    return {
      totalMissions: total,
      doneMissions: done,
      overallPct: total > 0 ? Math.round((done / total) * 100) : 0,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap, progressMap])

  const selected = selMonth !== null ? roadmap[selMonth] : null

  const scColor = (type: Mission['type']) => {
    if (type === 'inAnswer') return { bg: '#EDE9FE', c: '#6D28D9', label: '✨ 비커스' }
    if (type === 'tab') return { bg: THEME.accentBg, c: THEME.accent, label: '🔗 바로가기' }
    return { bg: '#F0FDF4', c: '#15803D', label: '👨‍🏫 선생님' }
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-7 box-border font-sans text-ink">

      {/* 스탯 (오른쪽 정렬) */}
      <div className="flex items-center justify-end gap-2 mb-5 flex-wrap">
        <div
          className="rounded-xl px-4 py-2"
          style={{
            background: THEME.gradient,
            boxShadow: `0 4px 12px ${THEME.accentShadow}`,
          }}
        >
          <div className="text-[10px] text-white/80 mb-0.5 font-medium">전체 진행률</div>
          <div className="text-[15px] font-extrabold text-white">{overallPct}%</div>
        </div>
        {[
          { label: '완료 미션', val: `${doneMissions}/${totalMissions}` },
          { label: '현재 월', val: curMonth },
          { label: '소속 학원', val: academy.academyName || '미소속' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-line rounded-xl px-4 py-2">
            <div className="text-[10px] text-ink-secondary mb-0.5 font-medium">{s.label}</div>
            <div className="text-[15px] font-extrabold text-ink">{s.val}</div>
          </div>
        ))}
      </div>

      {/* 안내 배너 */}
      <div
        className="rounded-xl px-4 py-2.5 mb-4 text-[12px] font-medium flex items-center gap-2"
        style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60`, color: THEME.accentDark }}
      >
        👁️ 로드맵은 <b className="mx-1">원장님이 체크</b>해주세요. 여기서는 현황 확인만 가능해요.
      </div>

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
            {myGrade} 연간 로드맵 진행 현황
          </div>
          <div className="text-[11px] text-ink-secondary mb-4">월을 클릭하면 상세 미션을 확인할 수 있어요.</div>

          <div className="grid grid-cols-4 max-md:grid-cols-2 gap-2.5">
            {roadmap.map((m, i) => {
              const done = m.missions.filter(ms => isDone(ms.key)).length
              const pct = Math.round((done / m.missions.length) * 100)
              const isCur = m.m === curMonth
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
            className="bg-white rounded-2xl p-5 sticky top-0 max-h-[calc(100vh-200px)] overflow-y-auto"
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
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                      style={{ background: done ? '#059669' : '#D1D5DB' }}
                    >
                      {done ? '✓' : ''}
                    </div>
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

                  {/* 원장 메모 (있을 때만 표시, 읽기 전용) */}
                  {memo && (
                    <div
                      className="mt-2 ml-6 text-[11px] text-ink-secondary bg-white border rounded-md px-2.5 py-1.5 whitespace-pre-wrap"
                      style={{ borderColor: THEME.accentBorder + '60' }}
                    >
                      <div className="text-[10px] font-bold mb-1" style={{ color: THEME.accentDark }}>
                        👨‍🏫 원장님 메모
                      </div>
                      {memo}
                    </div>
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