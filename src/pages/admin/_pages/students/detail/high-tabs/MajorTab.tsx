import { useState, useEffect } from 'react'
import {
  useStudentMajors,
  useChapters,
  useStudentProgress,
  useChapterDetail,
  useStudentSaenggibu,
  getScoreColor,
  type AdminMajorChapter,
  type AdminMajorQuestion,
} from '../../../../_hooks/useHighMajor'

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
}

const GRADE_LIST = [
  { num: 1, label: '고1' },
  { num: 2, label: '고2' },
  { num: 3, label: '고3' },
]

export default function MajorTab({ student }: { student: any }) {
  const studentId: string = student.id

  const [selMajorId, setSelMajorId] = useState<string | null>(null)
  const [selGrade, setSelGrade] = useState<number>(1)
  const [showMajorDrop, setShowMajorDrop] = useState(false)
  const [selChapterId, setSelChapterId] = useState<string | null>(null)

  // DB
  const { data: majors = [] } = useStudentMajors(studentId)
  const { data: chapters = [] } = useChapters(selMajorId || undefined, selGrade)
  const { data: progressList = [] } = useStudentProgress(studentId, selMajorId || undefined, selGrade)
  const { data: chapterDetail } = useChapterDetail(studentId, selChapterId || undefined)
  const { data: saenggibu } = useStudentSaenggibu(studentId, selMajorId || undefined)

  // 첫 학과 자동 선택
  useEffect(() => {
    if (majors.length > 0 && !selMajorId) {
      setSelMajorId(majors[0].id)
    }
  }, [majors, selMajorId])

  // 학년 바뀌면 챕터 선택 초기화
  useEffect(() => {
    setSelChapterId(null)
  }, [selGrade, selMajorId])

  const selMajor = majors.find(m => m.id === selMajorId)

  // 통계
  const completedCount = progressList.filter(p => p.status === 'completed').length
  const totalAvgScore = (() => {
    const completed = progressList.filter(p => p.status === 'completed')
    if (completed.length === 0) return null
    const total = completed.reduce((sum, p) => sum + (p.obj_score / Math.max(p.obj_total, 1) * 100), 0)
    return Math.round(total / completed.length)
  })()

  if (majors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-6">
        <div className="text-4xl">📚</div>
        <div className="text-[14px] font-bold text-gray-500">아직 진행한 전공특화문제가 없어요</div>
        <div className="text-[12px] text-center max-w-md">학생이 전공특화문제를 풀기 시작하면 여기에 표시돼요</div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 h-full overflow-hidden">

      {/* ━━━━━ 왼쪽: 학과 + 학년 + 회차 ━━━━━ */}
      <div className="w-[260px] flex-shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
        
        {/* 학과 드롭다운 (작게) */}
        <div className="px-3 py-2.5 border-b border-gray-200 flex-shrink-0 relative">
          <div className="text-[10px] font-bold text-gray-500 mb-1">🎓 학과</div>
          <button
            onClick={() => setShowMajorDrop(!showMajorDrop)}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all"
            style={{
              background: showMajorDrop ? THEME.accentBg : '#F8FAFC',
              border: `1px solid ${showMajorDrop ? THEME.accentBorder : '#E5E7EB'}`,
            }}
          >
            <span className="text-[12px] font-bold text-gray-900 truncate">{selMajor?.name || '선택'}</span>
            <span className="text-[10px] text-gray-500 flex-shrink-0 ml-1" style={{ transform: showMajorDrop ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </button>
          {showMajorDrop && (
            <div className="absolute left-3 right-3 mt-1 bg-white border border-gray-200 rounded-lg overflow-hidden z-50 max-h-[300px] overflow-y-auto"
              style={{ top: '100%', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)' }}>
              {majors.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelMajorId(m.id); setShowMajorDrop(false) }}
                  className="w-full px-3 py-2 text-[12px] text-left transition-colors hover:bg-gray-50"
                  style={{
                    background: selMajorId === m.id ? THEME.accentBg : '#fff',
                    color: selMajorId === m.id ? THEME.accent : '#1a1a1a',
                    fontWeight: selMajorId === m.id ? 700 : 500,
                  }}
                >
                  {selMajorId === m.id && '✓ '}{m.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 학년 탭 */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          {GRADE_LIST.map(g => (
            <button
              key={g.num}
              onClick={() => setSelGrade(g.num)}
              className="flex-1 py-2.5 text-[12px] transition-all"
              style={{
                fontWeight: selGrade === g.num ? 700 : 500,
                color: selGrade === g.num ? THEME.accent : '#6B7280',
                borderBottom: `2px solid ${selGrade === g.num ? THEME.accent : 'transparent'}`,
                background: selGrade === g.num ? THEME.accentBg : '#fff',
              }}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* 통계 요약 */}
        <div className="px-3 py-2.5 border-b border-gray-200 flex-shrink-0" style={{ background: THEME.accentBg }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold" style={{ color: THEME.accent }}>
              {completedCount}/{chapters.length}회차 완료
            </span>
            <span className="text-[11px] font-extrabold" style={{ color: THEME.accent }}>
              {totalAvgScore !== null ? `평균 ${totalAvgScore}점` : '미시작'}
            </span>
          </div>
          <div className="h-1 bg-white rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${chapters.length > 0 ? completedCount / chapters.length * 100 : 0}%`,
                background: THEME.accent,
              }}
            />
          </div>
        </div>

        {/* 회차 목록 (1회차, 2회차, ... 30회차) */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {selGrade === 3 && saenggibu && saenggibu.status !== 'ready' ? (
            <div className="text-center py-8 px-2 text-gray-400">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-[12px] font-bold text-gray-500">
                {saenggibu.status === 'pending' && '생기부 미업로드'}
                {saenggibu.status === 'uploaded' && 'AI 생성 대기 중'}
                {saenggibu.status === 'generating' && 'AI 생성 중...'}
                {saenggibu.status === 'error' && 'AI 생성 실패'}
              </div>
            </div>
          ) : chapters.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-[12px]">
              챕터 데이터 없음
            </div>
          ) : (
            chapters.map(ch => {
              const prog = progressList.find(p => p.chapter_id === ch.id)
              const isDone = prog?.status === 'completed'
              const isInProgress = prog && !isDone
              const isSelected = selChapterId === ch.id
              const score = prog?.obj_score ?? 0
              const total = prog?.obj_total ?? 4
              const ratio = total > 0 ? score / total : 0

              return (
                <button
                  key={ch.id}
                  onClick={() => isDone && setSelChapterId(ch.id)}
                  disabled={!isDone}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg mb-1 transition-all disabled:cursor-default"
                  style={{
                    background: isSelected ? THEME.accentBg : '#F8FAFC',
                    border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                    opacity: isDone ? 1 : isInProgress ? 0.7 : 0.5,
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-bold text-gray-900 flex-shrink-0">
                      {ch.chapter_no}회차
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: isDone ? '#ECFDF5' : isInProgress ? '#FEF3C7' : '#F3F4F6',
                        color: isDone ? '#059669' : isInProgress ? '#92400E' : '#9CA3AF',
                      }}
                    >
                      {isDone ? '✓' : isInProgress ? '진행' : '○'}
                    </span>
                  </div>
                  {isDone && (
                    <span
                      className="text-[11px] font-extrabold flex-shrink-0"
                      style={{ color: getScoreColor(score, total) }}
                    >
                      {Math.round(ratio * 100)}점
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ━━━━━ 오른쪽: 회차 상세 ━━━━━ */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
        {!selChapterId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
            <div className="text-4xl">📚</div>
            <div className="text-[14px] font-bold text-gray-500">회차를 선택해주세요</div>
            <div className="text-[12px] font-medium">완료된 회차를 클릭하면 결과를 볼 수 있어요</div>
          </div>
        ) : !chapterDetail?.progress ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-[12px]">
            불러오는 중...
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const ch = chapters.find(c => c.id === selChapterId)
                    return (
                      <>
                        <span
                          className="text-[11px] font-extrabold px-2.5 py-1 rounded-full"
                          style={{ color: THEME.accent, background: THEME.accentBg }}
                        >
                          {selGrade}단계
                        </span>
                        <div className="text-[15px] font-extrabold text-gray-900 tracking-tight">
                          {ch?.chapter_no}회차
                        </div>
                        <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                          🎓 {selMajor?.name}
                        </span>
                      </>
                    )
                  })()}
                </div>
                <div className="text-right">
                  <div
                    className="text-[28px] font-black tracking-tight leading-none"
                    style={{ color: getScoreColor(chapterDetail.progress.obj_score, chapterDetail.progress.obj_total) }}
                  >
                    {Math.round(chapterDetail.progress.obj_score / Math.max(chapterDetail.progress.obj_total, 1) * 100)}점
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 mt-0.5">
                    객관식 {chapterDetail.progress.obj_score}/{chapterDetail.progress.obj_total}
                  </div>
                </div>
              </div>

              {/* 문제 아이콘 그리드 */}
              <div className="flex gap-1.5 mt-3">
                {(chapterDetail.progress.obj_answers || []).map((a: any, i: number) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-extrabold"
                    style={{
                      background: a.is_correct ? '#ECFDF5' : '#FEE2E2',
                      color: a.is_correct ? '#059669' : '#DC2626',
                      border: `1px solid ${a.is_correct ? '#6EE7B7' : '#FCA5A5'}`,
                    }}
                  >
                    {a.is_correct ? 'O' : 'X'}
                  </div>
                ))}
                {chapterDetail.subjQuestion && (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-extrabold ml-1"
                    style={{ background: THEME.accentBg, color: THEME.accent, border: `1px solid ${THEME.accentBorder}60` }}
                  >
                    주관
                  </div>
                )}
              </div>
            </div>

            {/* 바디 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

              {/* 객관식 결과 요약 */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">📊 객관식 결과</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${chapterDetail.progress.obj_score / Math.max(chapterDetail.progress.obj_total, 1) * 100}%`,
                        background: getScoreColor(chapterDetail.progress.obj_score, chapterDetail.progress.obj_total),
                      }}
                    />
                  </div>
                  <span className="text-[14px] font-extrabold text-gray-900 flex-shrink-0">
                    {chapterDetail.progress.obj_score}/{chapterDetail.progress.obj_total} 정답
                  </span>
                </div>
              </div>

              {/* 객관식 문제별 상세 */}
              {chapterDetail.objQuestions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">📝 객관식 풀이</div>
                  <div className="flex flex-col gap-3">
                    {chapterDetail.progress.obj_answers.map((ans: any, i: number) => {
                      const q = chapterDetail.objQuestions.find(qq => qq.id === ans.question_id)
                      if (!q) return null
                      return (
                        <div
                          key={i}
                          className="border rounded-lg p-3"
                          style={{
                            borderColor: ans.is_correct ? '#6EE7B7' : '#FCA5A5',
                            background: ans.is_correct ? '#ECFDF5' : '#FEE2E2',
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                              style={{ background: ans.is_correct ? '#059669' : '#DC2626' }}
                            >
                              Q{i + 1}
                            </span>
                            <span className={`text-[11px] font-bold ${ans.is_correct ? 'text-emerald-700' : 'text-red-700'}`}>
                              {ans.is_correct ? '✅ 정답' : '❌ 오답'}
                            </span>
                            <span className="ml-auto text-[10px] font-medium text-gray-600">
                              학생: {ans.user_answer || '-'} / 정답: {q.correct_answer}
                            </span>
                          </div>
                          <div className="text-[12px] font-medium text-gray-900 mb-1.5 leading-[1.5]">
                            {q.question_text}
                          </div>
                          {q.explanation && (
                            <div className="text-[11px] text-gray-700 leading-[1.6] bg-white/60 rounded-md p-2 mt-1.5">
                              💡 {q.explanation}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 주관식 */}
              {chapterDetail.subjQuestion && chapterDetail.progress.subj_answer ? (
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">✏️ 주관식</div>

                  {/* 문제 */}
                  <div className="rounded-lg px-3 py-2.5 mb-3" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: THEME.accent }}>📌 문제</div>
                    <div className="text-[13px] font-bold leading-[1.6]" style={{ color: THEME.accentDark }}>
                      {chapterDetail.subjQuestion.question_text}
                    </div>
                  </div>

                  {/* 학생 답변 */}
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">👤 학생 답변</div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] font-medium text-gray-900 leading-[1.7] whitespace-pre-wrap">
                      {chapterDetail.progress.subj_answer}
                    </div>
                  </div>

                  {/* AI 피드백 */}
                  {chapterDetail.progress.subj_ai_feedback && (
                    <div className="rounded-lg px-3 py-2.5" style={{ background: '#FFF7ED', border: '1px solid #FDBA7460' }}>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#D97706' }}>
                        ✨ AI 피드백
                      </div>
                      <div className="text-[12px] font-medium text-amber-800 leading-[1.7] whitespace-pre-wrap">
                        {chapterDetail.progress.subj_ai_feedback}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-xl">
                  <div className="text-2xl mb-2">📝</div>
                  <div className="text-[12px] text-gray-500 font-medium">주관식 데이터가 없어요</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}