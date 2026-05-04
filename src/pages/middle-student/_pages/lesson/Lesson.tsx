import { useState, useMemo, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import {
  useMyMiddleLessons,
  useMyMiddleLessonsProgress,
  useToggleLessonReview,
} from '@/pages/middle-student/_hooks/useMyMiddleLessons'
import type { MiddleGrade, MiddleLesson } from '@/pages/admin/_hooks/middle/useMiddleLessons'

function toGrade(g: string | null | undefined): MiddleGrade {
  if (g?.includes('3')) return '중3'
  if (g?.includes('2')) return '중2'
  return '중1'
}

export default function MiddleLesson() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const myGrade = toGrade(student?.grade)

  const { data: lessons = [], isLoading } = useMyMiddleLessons(myGrade)
  const { data: progressMap } = useMyMiddleLessonsProgress()
  const toggleReview = useToggleLessonReview()

  const [selLessonId, setSelLessonId] = useState<string | null>(null)

  // 첫 로드 시 첫번째 레슨 자동 선택
  useEffect(() => {
    if (lessons.length > 0 && !selLessonId) {
      setSelLessonId(lessons[0].id)
    }
  }, [lessons, selLessonId])

  // 월별로 그룹핑
  const months = useMemo(() => {
    const map = new Map<string, MiddleLesson[]>()
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
  const totalCount = lessons.length

  const handleToggleReview = () => {
    if (!selLesson) return
    toggleReview.mutate({
      lessonId: selLesson.id,
      isReviewed: !isReviewed(selLesson.id),
    })
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
            {reviewedCount}/{totalCount} 복습완료
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
              {isCompleted(selLesson.id) && (
                <span className="text-[11px] font-bold text-white bg-brand-middle px-2.5 py-0.5 rounded-full">
                  ✓ 원장님 수업완료
                </span>
              )}
            </div>

            <div className="text-[18px] font-extrabold text-ink tracking-tight mb-1">{selLesson.title}</div>
            {selLesson.sub_title && (
              <div className="text-[13px] text-ink-secondary mb-5">{selLesson.sub_title}</div>
            )}

            {/* 영상 영역 */}
            <div className="bg-[#0F172A] rounded-xl aspect-video flex items-center justify-center mb-4 cursor-pointer relative overflow-hidden group">
              {selLesson.video_url ? (
                <video
                  src={selLesson.video_url}
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
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl mx-auto mb-3 group-hover:bg-brand-middle group-hover:scale-110 transition-all">
                      ▶
                    </div>
                    <div className="text-[12px] text-white/60">영상이 업로드되면 여기서 볼 수 있어요</div>
                  </div>
                </>
              )}
            </div>

            {/* 교재 페이지 */}
            {selLesson.page_range && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
                <span className="text-xl flex-shrink-0">📖</span>
                <div>
                  <div className="text-[12px] font-bold text-amber-700">이번 수업 교재 범위</div>
                  <div className="text-[11px] text-amber-600 mt-0.5">비커스 스피치 교재 — {selLesson.page_range}</div>
                </div>
              </div>
            )}

            {/* 복습 완료 버튼 */}
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
                {toggleReview.isPending ? '저장 중...' : isReviewed(selLesson.id) ? '✓ 복습 완료' : '복습하기'}
              </button>
              <span className="text-[12px] text-ink-muted">
                {isReviewed(selLesson.id) ? '복습을 완료했어요!' : '영상을 다시 보고 복습했다면 체크해주세요!'}
              </span>
            </div>
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
              return (
                <div
                  key={l.id}
                  onClick={() => setSelLessonId(l.id)}
                  className={`p-3 rounded-xl mb-1.5 cursor-pointer border transition-all ${
                    isSelected
                      ? 'border-brand-middle bg-white shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                      : reviewed
                        ? 'border-brand-middle-light bg-brand-middle-pale/60 hover:shadow-sm'
                        : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      reviewed || isSelected
                        ? 'bg-brand-middle text-white'
                        : 'bg-gray-100 text-ink-muted'
                    }`}>
                      {reviewed ? '✓' : l.week_no}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12.5px] truncate ${
                        isSelected
                          ? 'font-semibold text-brand-middle-dark'
                          : 'font-medium text-ink'
                      }`}>
                        {l.title}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">{l.page_range}</div>
                    </div>
                    {completed && (
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