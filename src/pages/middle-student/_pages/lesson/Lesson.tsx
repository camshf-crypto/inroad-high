import { useState, useMemo, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import {
  useMyMiddleLessons,
  useMyMiddleLessonsProgress,
  useToggleLessonReview,
  type MyMiddleLesson,
} from '@/pages/middle-student/_hooks/useMyMiddleLessons'
import type { MiddleGrade } from '@/pages/admin/_hooks/middle/useMiddleLessons'

function toGrade(g: string | null | undefined): MiddleGrade {
  if (g?.includes('3')) return '중3'
  if (g?.includes('2')) return '중2'
  return '중1'
}

// 영상 4편 정보 (1편/2편/3편/4편)
const VIDEO_PARTS = [
  { no: 1, label: '1편', subLabel: '0~5분' },
  { no: 2, label: '2편', subLabel: '5~10분' },
  { no: 3, label: '3편', subLabel: '10~15분' },
  { no: 4, label: '4편', subLabel: '15~20분' },
]

export default function MiddleLesson() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const myGrade = toGrade(student?.grade)

  const { data: lessons = [], isLoading } = useMyMiddleLessons(myGrade)
  const { data: progressMap } = useMyMiddleLessonsProgress()
  const toggleReview = useToggleLessonReview()

  const [selLessonId, setSelLessonId] = useState<string | null>(null)
  const [selPartNo, setSelPartNo] = useState<number>(1)  // 선택된 영상 편 (1~4)

  // 첫 로드 시 잠기지 않은 첫번째 레슨 자동 선택
  useEffect(() => {
    if (lessons.length > 0 && !selLessonId) {
      const firstUnlocked = lessons.find(l => !l.is_locked)
      setSelLessonId((firstUnlocked ?? lessons[0]).id)
    }
  }, [lessons, selLessonId])

  // 레슨이 바뀌면 1편으로 리셋
  useEffect(() => {
    setSelPartNo(1)
  }, [selLessonId])

  // 월별로 그룹핑
  const months = useMemo(() => {
    const map = new Map<string, MyMiddleLesson[]>()
    for (const l of lessons) {
      if (!map.has(l.month_label)) map.set(l.month_label, [])
      map.get(l.month_label)!.push(l)
    }
    return Array.from(map.entries()).map(([m, list]) => ({
      m,
      list: list.sort((a, b) => a.week_no - b.week_no),
    }))
  }, [lessons])

  const selLesson = lessons.find(l => l.id === selLessonId)

  const isReviewed = (lessonId: string) => progressMap?.get(lessonId)?.is_reviewed === true
  const isCompleted = (lessonId: string) => progressMap?.get(lessonId)?.is_completed === true
  const reviewedCount = lessons.filter(l => isReviewed(l.id)).length
  const unlockedCount = lessons.filter(l => !l.is_locked).length

  const handleToggleReview = () => {
    if (!selLesson || selLesson.is_locked) return
    toggleReview.mutate({
      lessonId: selLesson.id,
      isReviewed: !isReviewed(selLesson.id),
    })
  }

  const handleLessonClick = (lesson: MyMiddleLesson) => {
    setSelLessonId(lesson.id)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin mb-3" />
          <div className="text-[13px] text-ink-secondary font-medium">수업 영상을 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (lessons.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-8">
        <div className="bg-white border border-line rounded-2xl p-12 text-center max-w-md">
          <div className="text-4xl mb-2">📭</div>
          <div className="text-[14px] font-bold text-ink mb-1">{myGrade} 수업이 아직 등록되지 않았어요</div>
          <div className="text-[12px] text-ink-secondary">선생님께 문의해주세요</div>
        </div>
      </div>
    )
  }

  // 현재 선택된 영상 URL (DB에 4편 저장되면 그거 우선, 아니면 기존 video_url로 폴백)
  const currentVideoUrl = selLesson
    ? ((selLesson as any)[`video_url_${selPartNo}`] ?? selLesson.video_url ?? null)
    : null

  return (
    <div className="flex h-full overflow-hidden font-sans text-ink">

      {/* 왼쪽: 영상 + 정보 */}
      <div className="flex-1 overflow-y-auto px-7 py-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[20px] font-extrabold text-ink tracking-tight">수업 영상</div>
            <div className="text-[13px] text-ink-muted mt-0.5">{student?.name} · {academy?.academyName}</div>
          </div>
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[13px] font-bold px-4 py-1.5 rounded-full border border-brand-middle-light">
            {reviewedCount}/{unlockedCount} 복습 완료
          </div>
        </div>

        {/* 선택된 수업 영상 */}
        {selLesson && (
          <div className="bg-white border border-line rounded-2xl p-6 mb-4 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">

            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2.5 py-0.5 rounded-full border border-brand-middle-light">
                {selLesson.month_label}
              </span>
              <span className="text-[11px] text-ink-secondary font-medium">{selLesson.week_no}주차</span>
              {selLesson.is_locked ? (
                <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                  🔒 다음 수업 후 공개
                </span>
              ) : (
                isCompleted(selLesson.id) && (
                  <span className="text-[11px] font-bold text-white bg-brand-middle px-2.5 py-0.5 rounded-full">
                    ✓ 원장님 수업완료
                  </span>
                )
              )}
            </div>

            <div className="text-[18px] font-extrabold text-ink tracking-tight mb-1">{selLesson.title}</div>
            {selLesson.sub_title && (
              <div className="text-[13px] text-ink-secondary mb-5">{selLesson.sub_title}</div>
            )}

            {/* 영상 4편 탭 (잠긴 영상은 안 보여줌) */}
            {!selLesson.is_locked && (
              <div className="flex gap-2 mb-3">
                {VIDEO_PARTS.map(part => {
                  const isActive = selPartNo === part.no
                  return (
                    <button
                      key={part.no}
                      onClick={() => setSelPartNo(part.no)}
                      className={`flex-1 py-2.5 rounded-xl border-2 transition-all text-center ${
                        isActive
                          ? 'border-brand-middle bg-brand-middle-bg text-brand-middle-dark shadow-[0_2px_8px_rgba(16,185,129,0.15)]'
                          : 'border-line bg-white text-ink-secondary hover:border-brand-middle-light hover:bg-brand-middle-pale/40'
                      }`}
                    >
                      <div className={`text-[13px] font-extrabold ${isActive ? 'text-brand-middle-dark' : 'text-ink'}`}>
                        {part.label}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">{part.subLabel}</div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* 영상 영역 */}
            <div className="bg-[#0F172A] rounded-xl aspect-video flex items-center justify-center mb-4 relative overflow-hidden">
              {selLesson.is_locked ? (
                /* 잠금 화면 */
                <>
                  <div
                    className="absolute inset-0 pointer-events-none opacity-40"
                    style={{ background: 'radial-gradient(circle at 30% 40%, rgba(148, 163, 184, 0.2), transparent 60%)' }}
                  />
                  <div className="text-center relative px-6">
                    <div className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center text-4xl mx-auto mb-4 border border-white/10">
                      🔒
                    </div>
                    <div className="text-[15px] font-bold text-white mb-1.5">아직 공개되지 않은 영상이에요</div>
                    <div className="text-[12px] text-white/60 leading-relaxed max-w-[320px] mx-auto">
                      이 영상은 학원 수업이 끝난 후에 복습용으로 공개돼요.<br />
                      <span className="text-emerald-300 font-semibold">{selLesson.month_label} {selLesson.week_no}주차</span> 수업 후에 만나요!
                    </div>
                  </div>
                </>
              ) : currentVideoUrl ? (
                <video
                  key={currentVideoUrl}  /* 영상 바뀌면 리렌더링 */
                  src={currentVideoUrl}
                  controls
                  className="w-full h-full rounded-xl"
                />
              ) : (
                <>
                  <div
                    className="absolute inset-0 pointer-events-none opacity-50"
                    style={{ background: 'radial-gradient(circle at 30% 40%, rgba(16, 185, 129, 0.15), transparent 60%)' }}
                  />
                  <div className="text-center relative">
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl mx-auto mb-3">
                      ▶
                    </div>
                    <div className="text-[12px] text-white/60">{selPartNo}편 영상이 업로드되면 여기서 볼 수 있어요</div>
                  </div>
                </>
              )}
            </div>

            {/* 교재 페이지 (잠긴 영상은 안 보여줌) */}
            {!selLesson.is_locked && selLesson.page_range && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
                <span className="text-xl flex-shrink-0">📖</span>
                <div>
                  <div className="text-[12px] font-bold text-amber-700">이번 수업 교재 범위</div>
                  <div className="text-[11px] text-amber-600 mt-0.5">비커스 스피치 교재 — {selLesson.page_range}</div>
                </div>
              </div>
            )}

            {/* 복습 완료 버튼 */}
            {!selLesson.is_locked && (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleToggleReview}
                  disabled={toggleReview.isPending}
                  className={`h-10 px-5 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-60 ${
                    isReviewed(selLesson.id)
                      ? 'bg-brand-middle-bg text-brand-middle-dark border border-brand-middle-light hover:bg-brand-middle-pale'
                      : 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
                  }`}
                >
                  {toggleReview.isPending ? '저장 중...' : isReviewed(selLesson.id) ? '✓ 복습 완료' : '복습 완료'}
                </button>
                <span className="text-[12px] text-ink-muted">
                  {isReviewed(selLesson.id) ? '복습을 완료했어요!' : '4편 다 보고 복습 완료를 눌러주세요!'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 교재 구매 배너 */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[14px] font-bold text-amber-700 mb-0.5">📚 아직 교재가 없으신가요?</div>
            <div className="text-[12px] text-amber-600">비커스 스피치 교재를 구매하면 수업을 더 효과적으로 준비할 수 있어요.</div>
          </div>
          <button className="h-10 px-4 bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-bold rounded-lg whitespace-nowrap flex-shrink-0 transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(249,115,22,0.3)]">
            교재 구매하기 →
          </button>
        </div>
      </div>

      {/* 구분선 */}
      <div className="w-px bg-line flex-shrink-0" />

      {/* 오른쪽: 수업 목록 */}
      <div className="w-[300px] flex-shrink-0 overflow-y-auto px-4 py-6 bg-[#F8FAFC]">
        <div className="text-[13px] font-bold text-ink mb-3 px-1">전체 수업 목록</div>

        {months.map((m, mi) => (
          <div key={m.m}>
            <div className={`text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 px-1 ${mi > 0 ? 'mt-4' : ''}`}>
              {m.m}
            </div>
            {m.list.map(l => {
              const isSelected = selLessonId === l.id
              const reviewed = isReviewed(l.id)
              const completed = isCompleted(l.id)
              const locked = l.is_locked

              return (
                <div
                  key={l.id}
                  onClick={() => handleLessonClick(l)}
                  className={`p-3 rounded-xl mb-1.5 cursor-pointer border transition-all ${
                    locked
                      ? isSelected
                        ? 'border-gray-300 bg-gray-50'
                        : 'border-line bg-gray-50/60 hover:bg-gray-50'
                      : isSelected
                        ? 'border-brand-middle bg-white shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                        : reviewed
                          ? 'border-brand-middle-light bg-brand-middle-pale/60 hover:shadow-sm'
                          : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      locked
                        ? 'bg-gray-200 text-gray-400'
                        : reviewed || isSelected
                          ? 'bg-brand-middle text-white'
                          : 'bg-gray-100 text-ink-muted'
                    }`}>
                      {locked ? '🔒' : reviewed ? '✓' : l.week_no}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12.5px] truncate ${
                        locked
                          ? 'font-medium text-gray-400'
                          : isSelected
                            ? 'font-semibold text-brand-middle-dark'
                            : 'font-medium text-ink'
                      }`}>
                        {l.title}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">
                        {locked ? '아직 공개되지 않았어요' : l.page_range}
                      </div>
                    </div>
                    {!locked && completed && (
                      <span className="text-[9px] font-bold text-brand-middle-dark bg-brand-middle-bg px-1.5 py-0.5 rounded-full flex-shrink-0">
                        완료
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}