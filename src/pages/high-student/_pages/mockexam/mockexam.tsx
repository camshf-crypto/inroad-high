import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import {
  useMyMockExams,
  useMyMockExamQuestions,
  useMyMockExamMajor,
  useStartMockExam,
  useSubmitQuestionAnswer,
  useSubmitMajorAnswer,
  useSubmitMockExam,
  useMyMockExamReport,
  getStatusLabel,
  getTypeColor,
  type MockExamQuestion,
} from '../../_hooks/useMyHighMockExam'

// 내 프로필 조회 (이름, 학년 등)
function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile-for-mockexam'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      return data
    },
    refetchInterval: 2000, // 학년 변경 실시간 동기화
  })
}

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
}

const GRADE_OPTIONS = ['고1', '고2', '고3']

// 기본 시간 (초)
const DEFAULT_MAIN_TIME = 120
const DEFAULT_TAIL_TIME = 90
const DEFAULT_MAJOR_SUB_TIME = 120  // 주관식

type Phase = 'before' | 'interview' | 'interlude' | 'major' | 'done'

export default function MockExam({ student: studentProp }: { student?: any }) {
  // 내 프로필 직접 조회 (prop이 없으면 대체)
  const { data: myProfile } = useMyProfile()
  const student = myProfile || studentProp || {}
  
  const studentGrade = student?.grade || '고1'
  const [selGrade, setSelGrade] = useState(studentGrade)
  const [selExamId, setSelExamId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'main' | 'major' | 'report'>('main')
  const [answerInput, setAnswerInput] = useState('')
  const [majorAnswerInput, setMajorAnswerInput] = useState('')
  const [autoSelected, setAutoSelected] = useState(false)

  // 진행 상태
  const [phase, setPhase] = useState<Phase>('before')
  const [interviewIdx, setInterviewIdx] = useState(0)
  const [majorIdx, setMajorIdx] = useState(0)

  // 타이머
  const [remainSec, setRemainSec] = useState(0)
  const timerRef = useRef<any>(null)
  const questionStartRef = useRef<number>(0)

  // DB 조회
  const { data: allExams = [] } = useMyMockExams()
  const exams = allExams.filter(e => e.grade === selGrade)
  const selExam = useMemo(() => allExams.find(e => e.id === selExamId), [allExams, selExamId])
  const { data: questions = [] } = useMyMockExamQuestions(selExamId || undefined)
  const { data: majors = [] } = useMyMockExamMajor(selExamId || undefined)
  const { data: report } = useMyMockExamReport(selExamId || undefined)

  // 뮤테이션
  const startExam = useStartMockExam()
  const submitQuestion = useSubmitQuestionAnswer()
  const submitMajor = useSubmitMajorAnswer()
  const submitExam = useSubmitMockExam()

  // 면접 질문 순서대로 정렬 (본 Q1 → 꼬리 Q1-1/1-2/1-3 → 본 Q2 → ...)
  const orderedInterview = useMemo(() => {
    const mains = questions.filter(q => q.level === 'main').sort((a, b) => a.order - b.order)
    const result: MockExamQuestion[] = []
    for (const main of mains) {
      result.push(main)
      const tails = questions
        .filter(q => q.parent_id === main.id)
        .sort((a, b) => (a.tail_index || 0) - (b.tail_index || 0))
      result.push(...tails)
    }
    return result
  }, [questions])

  const mainCount = questions.filter(q => q.level === 'main').length
  const currentInterview = orderedInterview[interviewIdx]
  const currentMajor = majors[majorIdx]

  // 자동 학년 선택
  useEffect(() => {
    if (autoSelected || allExams.length === 0) return
    const myGradeExams = allExams.filter(e => e.grade === studentGrade)
    if (myGradeExams.length === 0) {
      const latest = allExams[allExams.length - 1]
      if (latest) setSelGrade(latest.grade)
    }
    setAutoSelected(true)
  }, [allExams, studentGrade, autoSelected])

  // 리셋
  useEffect(() => {
    setSelExamId(null)
    setPhase('before')
    setInterviewIdx(0)
    setMajorIdx(0)
    setAnswerInput('')
    setMajorAnswerInput('')
  }, [selGrade])

  useEffect(() => {
    setPhase(selExam?.status === 'in_progress' ? 'interview' : 'before')
    setInterviewIdx(0)
    setMajorIdx(0)
    setAnswerInput('')
    setMajorAnswerInput('')
  }, [selExamId])

  // 진행 중일 때 아직 답변 안 한 질문부터 시작
  useEffect(() => {
    if (selExam?.status !== 'in_progress' || orderedInterview.length === 0) return
    if (phase !== 'interview') return
    const firstUnanswered = orderedInterview.findIndex(q => !q.student_answer)
    if (firstUnanswered !== -1 && interviewIdx === 0) {
      setInterviewIdx(firstUnanswered)
    } else if (firstUnanswered === -1) {
      // 면접 다 했으면 전공특화로
      setPhase('interlude')
    }
  }, [selExam?.status, orderedInterview, phase])

  // 타이머 - 면접 진행
  useEffect(() => {
    if (phase !== 'interview' || !currentInterview) {
      if (timerRef.current) clearInterval(timerRef.current)
      setRemainSec(0)
      return
    }
    // 이미 답변한 것은 넘어감
    if (currentInterview.student_answer) {
      setRemainSec(0)
      return
    }

    const limit = currentInterview.time_limit_sec 
      ?? (currentInterview.level === 'main' ? DEFAULT_MAIN_TIME : DEFAULT_TAIL_TIME)
    setRemainSec(limit)
    setAnswerInput('')
    questionStartRef.current = Date.now()

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000)
      const remain = Math.max(0, limit - elapsed)
      setRemainSec(remain)
      if (remain === 0) {
        clearInterval(timerRef.current)
        goNextInterview()
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, interviewIdx, currentInterview?.id])

  // 타이머 - 전공특화
  useEffect(() => {
    if (phase !== 'major' || !currentMajor) {
      if (timerRef.current) clearInterval(timerRef.current)
      setRemainSec(0)
      return
    }
    if (currentMajor.student_answer) {
      setRemainSec(0)
      return
    }

    const limit = currentMajor.time_limit_sec ?? DEFAULT_MAJOR_SUB_TIME
    setRemainSec(limit)
    setMajorAnswerInput('')
    questionStartRef.current = Date.now()

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000)
      const remain = Math.max(0, limit - elapsed)
      setRemainSec(remain)
      if (remain === 0) {
        clearInterval(timerRef.current)
        goNextMajor()
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, majorIdx, currentMajor?.id])

  // 면접 다음 질문으로
  const goNextInterview = () => {
    if (!currentInterview) return
    const val = answerInput.trim()
    if (val && !currentInterview.student_answer) {
      const limit = currentInterview.time_limit_sec 
        ?? (currentInterview.level === 'main' ? DEFAULT_MAIN_TIME : DEFAULT_TAIL_TIME)
      submitQuestion.mutate({
        questionId: currentInterview.id,
        answer: val,
        timeSpentSec: limit - remainSec,
      })
    }
    setAnswerInput('')

    if (interviewIdx + 1 >= orderedInterview.length) {
      // 면접 끝 → 전공특화로 넘어갈 준비
      setPhase('interlude')
    } else {
      setInterviewIdx(interviewIdx + 1)
    }
  }

  // 전공특화 다음 질문으로
  const goNextMajor = () => {
    if (!currentMajor) return
    const val = majorAnswerInput.trim()
    if (val && !currentMajor.student_answer) {
      submitMajor.mutate({ questionId: currentMajor.id, answer: val })
    }
    setMajorAnswerInput('')

    if (majorIdx + 1 >= majors.length) {
      // 전공특화 끝 → 제출
      if (selExam) {
        submitExam.mutate(selExam.id, {
          onSuccess: () => setPhase('done'),
        })
      }
    } else {
      setMajorIdx(majorIdx + 1)
    }
  }

  // 시험 시작
  const handleStart = () => {
    if (!selExam) return
    const tailCount = orderedInterview.length - mainCount
    if (!window.confirm(
      `면접 모의고사를 시작합니다!\n\n` +
      `【1단계】 면접 질문\n` +
      `• 본 질문 ${mainCount}개 (각 ${DEFAULT_MAIN_TIME / 60}분)\n` +
      `• 꼬리질문 ${tailCount}개 (각 ${DEFAULT_TAIL_TIME}초)\n\n` +
      `【2단계】 전공특화\n` +
      `• ${majors.length}문제 (각 30초~2분)\n\n` +
      `⚠️ 각 질문별 시간이 끝나면 자동으로 다음으로 넘어가요.\n` +
      `중간에 멈출 수 없으니 집중해서 답변해주세요!`
    )) return

    startExam.mutate(selExam.id, {
      onSuccess: () => {
        setPhase('interview')
        setInterviewIdx(0)
      },
    })
  }

  // 전공특화 시작
  const handleStartMajor = () => {
    setPhase('major')
    setMajorIdx(0)
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // 리포트만 PDF 저장 (iframe 방식)
  const handleDownloadPdf = () => {
    const reportEl = document.getElementById('premium-report-content')
    if (!reportEl) return

    // 인쇄용 iframe 생성
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) return

    // 현재 페이지의 모든 스타일 복사
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n')

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>면접 모의고사 리포트 - ${student?.name || ''}</title>
          ${styles}
          <style>
            body { margin: 0; padding: 20px; background: #F8FAFC; }
            @page { size: A4; margin: 10mm; }
          </style>
        </head>
        <body>
          ${reportEl.innerHTML}
        </body>
      </html>
    `)
    iframeDoc.close()

    // 이미지/폰트 로드 대기 후 인쇄
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      // 인쇄 후 iframe 제거
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 500)
  }

  const isDone = selExam?.status === 'submitted' || selExam?.status === 'analyzed'
  const answeredInterview = orderedInterview.filter(q => q.student_answer).length
  const answeredMajor = majors.filter(m => m.student_answer).length

  return (
    <div className="flex flex-col h-full overflow-hidden px-6 py-5 gap-4">
      {/* 학년 탭 */}
      <div className="flex gap-1.5 flex-shrink-0">
        {GRADE_OPTIONS.map(g => {
          const examCount = allExams.filter(e => e.grade === g).length
          return (
            <button
              key={g}
              onClick={() => setSelGrade(g)}
              className="px-4 py-1.5 rounded-full text-[12px] border transition-all flex items-center gap-1.5"
              style={{
                background: selGrade === g ? THEME.accent : '#fff',
                color: selGrade === g ? '#fff' : '#6B7280',
                borderColor: selGrade === g ? THEME.accent : '#E5E7EB',
                fontWeight: selGrade === g ? 700 : 500,
              }}
            >
              <span>{g} {g === studentGrade && '👤'}</span>
              {examCount > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: selGrade === g ? '#fff' : THEME.accentBg,
                    color: THEME.accent,
                  }}
                >
                  {examCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {!selExamId ? (
        <div className="flex-1 overflow-y-auto">
          {exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-ink-muted gap-3">
              <div className="text-5xl">📝</div>
              <div className="text-[15px] font-bold text-ink">아직 오픈된 회차가 없어요</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {exams.map(exam => {
                const sl = getStatusLabel(exam.status)
                return (
                  <button
                    key={exam.id}
                    onClick={() => setSelExamId(exam.id)}
                    className="bg-white border border-line rounded-2xl p-5 text-left hover:shadow-md transition-all hover:border-brand-high"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-[16px] font-extrabold text-ink">📅 {exam.grade} · {exam.period}</div>
                        <span
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ background: sl.bg, color: sl.color }}
                        >
                          {sl.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-ink-secondary">
                      <span className="font-semibold">{exam.exam_type}</span>
                      <span>·</span>
                      <span>{exam.major_level}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 헤더 */}
          <div className="flex items-center justify-between flex-shrink-0 gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setSelExamId(null)} className="text-[11px] font-semibold text-ink-secondary hover:text-ink">
                ← 회차 목록
              </button>
              <span className="text-ink-muted">|</span>
              <div className="text-[14px] font-extrabold text-ink">📅 {selExam?.grade} · {selExam?.period}</div>
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: getStatusLabel(selExam?.status || '').bg, color: getStatusLabel(selExam?.status || '').color }}
              >
                {getStatusLabel(selExam?.status || '').label}
              </span>
              {(phase === 'interview' || phase === 'major') && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: phase === 'interview' ? '#DBEAFE' : '#FEF3C7',
                    color: phase === 'interview' ? '#1E40AF' : '#92400E',
                  }}
                >
                  {phase === 'interview' ? '1단계 면접' : '2단계 전공특화'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selExam?.status === 'open' && phase === 'before' && (
                <button
                  onClick={handleStart}
                  disabled={startExam.isPending}
                  className="px-4 py-2 text-white rounded-lg text-[12px] font-bold disabled:opacity-50"
                  style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                >
                  🚀 시험 시작
                </button>
              )}
              {(phase === 'interview' || phase === 'major') && (
                <div
                  className="px-4 py-2 rounded-lg font-extrabold text-[15px]"
                  style={{
                    background: remainSec < 10 ? '#FEE2E2' : remainSec < 30 ? '#FFF7ED' : '#ECFDF5',
                    color: remainSec < 10 ? '#DC2626' : remainSec < 30 ? '#D97706' : '#059669',
                    border: `1px solid ${remainSec < 10 ? '#FCA5A5' : remainSec < 30 ? '#FDBA74' : '#6EE7B7'}`,
                  }}
                >
                  ⏱️ {formatTime(remainSec)}
                </div>
              )}
              {isDone && (
                <div className="px-4 py-2 rounded-lg text-[12px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  ✓ 시험 완료
                </div>
              )}
            </div>
          </div>

          {/* 섹션 탭 - 시험 중에는 숨김 */}
          {phase !== 'interview' && phase !== 'major' && phase !== 'interlude' && (
            <div className="flex gap-1.5 flex-shrink-0">
              {[
                { key: 'main', label: `📝 면접 (${answeredInterview}/${orderedInterview.length})` },
                { key: 'major', label: `🧠 전공특화 (${answeredMajor}/${majors.length})` },
                { key: 'report', label: '📊 리포트' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key as any)}
                  className="px-4 py-2 rounded-full text-[12px] border transition-all"
                  style={{
                    background: activeSection === tab.key ? THEME.accent : '#fff',
                    color: activeSection === tab.key ? '#fff' : '#6B7280',
                    borderColor: activeSection === tab.key ? THEME.accent : '#E5E7EB',
                    fontWeight: activeSection === tab.key ? 700 : 500,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* 1단계: 면접 진행 */}
          {phase === 'interview' && currentInterview && (
            <div className="flex-1 overflow-hidden flex flex-col gap-3">
              {/* 진행률 */}
              <div className="bg-white border border-line rounded-xl p-3 flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11px] font-bold text-ink-muted">1단계 면접 진행률</div>
                  <div className="text-[11px] font-bold text-ink">{interviewIdx + 1} / {orderedInterview.length}</div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${((interviewIdx + 1) / orderedInterview.length) * 100}%`, background: THEME.accent }} />
                </div>
              </div>

              <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-line flex-shrink-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{ color: THEME.accentDark, background: THEME.accentBg }}
                    >
                      {currentInterview.level === 'main' ? `Q${currentInterview.order}` : `꼬리 ${(currentInterview.tail_index || 0) + 1}`}
                    </span>
                    {currentInterview.type && (
                      <span
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{
                          background: getTypeColor(currentInterview.type).bg,
                          color: getTypeColor(currentInterview.type).color,
                        }}
                      >
                        {currentInterview.type}
                      </span>
                    )}
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto"
                      style={{
                        background: currentInterview.level === 'main' ? '#DBEAFE' : '#FEF3C7',
                        color: currentInterview.level === 'main' ? '#1E40AF' : '#92400E',
                      }}
                    >
                      {currentInterview.level === 'main' 
                        ? `본 질문 · ${((currentInterview.time_limit_sec ?? DEFAULT_MAIN_TIME)) / 60}분`
                        : `꼬리 · ${currentInterview.time_limit_sec ?? DEFAULT_TAIL_TIME}초`}
                    </span>
                  </div>
                  <div className="text-[15px] font-bold text-ink leading-[1.6]">{currentInterview.question_text}</div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                  <textarea
                    value={answerInput}
                    onChange={e => setAnswerInput(e.target.value)}
                    placeholder="답변을 작성해주세요... (시간이 끝나면 자동으로 다음 질문으로 넘어가요)"
                    rows={8}
                    autoFocus
                    className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-none leading-[1.8]"
                    style={{ minHeight: '200px', borderColor: remainSec < 10 ? '#FCA5A5' : '#E5E7EB' }}
                  />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-[11px] text-ink-muted">⚠️ 시간이 끝나면 자동으로 다음 질문으로 넘어가요</div>
                    <button
                      onClick={goNextInterview}
                      disabled={!answerInput.trim()}
                      className="px-5 py-2 text-white rounded-lg text-[13px] font-bold disabled:opacity-50"
                      style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                    >
                      {interviewIdx + 1 === orderedInterview.length ? '🎯 면접 완료 (전공특화로)' : '➡️ 다음 질문'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 전환 화면: 면접 끝 → 전공특화 시작 */}
          {phase === 'interlude' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-lg bg-white border border-line rounded-2xl p-10">
                <div className="text-5xl mb-4">🎯</div>
                <div className="text-[18px] font-extrabold text-ink mb-2">1단계 면접 완료!</div>
                <div className="text-[12px] text-ink-secondary leading-[1.8] mb-5">
                  면접 질문 {orderedInterview.length}개에 모두 답변했어요.<br />
                  이제 <strong>2단계 전공특화 문제</strong>를 진행할게요.
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-left">
                  <div className="text-[12px] font-bold text-amber-800 mb-2">📋 전공특화 안내</div>
                  <div className="text-[11px] text-amber-700 leading-[1.7]">
                    • 총 <strong>{majors.length}문제</strong><br />
                    • 객관식은 30초, 주관식은 2분 제한<br />
                    • 각 문제 시간 끝나면 자동 다음 진행<br />
                    • 모두 완료되면 시험이 제출돼요
                  </div>
                </div>
                <button
                  onClick={handleStartMajor}
                  className="px-6 py-3 text-white rounded-lg text-[14px] font-bold"
                  style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                >
                  🧠 전공특화 시작
                </button>
              </div>
            </div>
          )}

          {/* 2단계: 전공특화 진행 */}
          {phase === 'major' && currentMajor && (
            <div className="flex-1 overflow-hidden flex flex-col gap-3">
              <div className="bg-white border border-line rounded-xl p-3 flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11px] font-bold text-amber-800">2단계 전공특화 진행률</div>
                  <div className="text-[11px] font-bold text-ink">{majorIdx + 1} / {majors.length}</div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${((majorIdx + 1) / majors.length) * 100}%`, background: '#F59E0B' }} />
                </div>
              </div>

              <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-line flex-shrink-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-amber-800 bg-amber-50 border border-amber-200">
                      전공특화 Q{majorIdx + 1}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto bg-amber-50 text-amber-800"
                    >
                      {currentMajor.question_type === 'objective' ? '객관식 · 30초' : '주관식 · 2분'}
                    </span>
                  </div>
                  <div className="text-[15px] font-bold text-ink leading-[1.6]">{currentMajor.question_text}</div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                  {currentMajor.question_type === 'objective' && currentMajor.options ? (
                    // 객관식: 보기 4개 버튼 (컴팩트)
                    <div className="flex flex-col gap-2">
                      {currentMajor.options.map((opt: string, idx: number) => {
                        const isSelected = majorAnswerInput === String(idx)
                        return (
                          <button
                            key={idx}
                            onClick={() => setMajorAnswerInput(String(idx))}
                            className="text-left rounded-lg px-3 py-2 transition-all flex items-center gap-2"
                            style={{
                              border: `2px solid ${isSelected ? '#F59E0B' : '#E5E7EB'}`,
                              background: isSelected ? '#FFFBEB' : '#fff',
                              boxShadow: isSelected ? '0 2px 8px rgba(245, 158, 11, 0.2)' : 'none',
                            }}
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-extrabold"
                              style={{
                                background: isSelected ? '#F59E0B' : '#F3F4F6',
                                color: isSelected ? '#fff' : '#6B7280',
                              }}
                            >
                              {['①', '②', '③', '④'][idx]}
                            </div>
                            <div className="text-[12px] font-medium text-ink leading-[1.4] flex-1">
                              {opt}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    // 주관식: textarea
                    <textarea
                      value={majorAnswerInput}
                      onChange={e => setMajorAnswerInput(e.target.value)}
                      placeholder="답변을 작성해주세요..."
                      rows={6}
                      autoFocus
                      className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-none leading-[1.8]"
                      style={{ borderColor: remainSec < 10 ? '#FCA5A5' : '#E5E7EB' }}
                    />
                  )}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-[11px] text-ink-muted">⚠️ 시간이 끝나면 자동으로 다음 문제로 넘어가요</div>
                    <button
                      onClick={goNextMajor}
                      disabled={!majorAnswerInput.trim()}
                      className="px-5 py-2 text-white rounded-lg text-[13px] font-bold disabled:opacity-50"
                      style={{ background: '#F59E0B' }}
                    >
                      {majorIdx + 1 === majors.length ? '🎯 최종 제출' : '➡️ 다음 문제'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 완료 전 화면: 보기 모드 */}
          {(phase === 'before' || phase === 'done' || isDone) && (
            <>
              {activeSection === 'main' && (
                <div className="flex-1 overflow-y-auto flex flex-col gap-3">
                  {phase === 'before' && !isDone && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="text-5xl mb-3">🎯</div>
                      <div className="text-[16px] font-bold text-ink mb-2">면접 모의고사 준비 완료</div>
                      <div className="text-[12px] text-ink-secondary leading-[1.8] mb-4 max-w-md">
                        본 질문 {mainCount}개 + 꼬리질문 {orderedInterview.length - mainCount}개 + 전공특화 {majors.length}문제
                        <br />각 질문별 시간이 끝나면 자동으로 다음으로 넘어가요.
                      </div>
                      <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 max-w-md">
                        ⚠️ 시작하면 <strong>중간에 멈출 수 없어요</strong>.
                      </div>
                    </div>
                  )}
                  {isDone && orderedInterview.map((q) => {
                    const isMain = q.level === 'main'
                    return (
                      <div key={q.id} className="bg-white border border-line rounded-xl p-4" style={{ marginLeft: isMain ? 0 : 24 }}>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: THEME.accentDark, background: isMain ? THEME.accentBg : '#fff', border: `1px solid ${THEME.accentBorder}60` }}>
                            {isMain ? `Q${q.order}` : `꼬리 ${(q.tail_index || 0) + 1}`}
                          </span>
                          {q.type && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: getTypeColor(q.type).bg, color: getTypeColor(q.type).color }}>
                              {q.type}
                            </span>
                          )}
                          {q.time_spent_sec !== null && q.time_spent_sec !== undefined && (
                            <span className="text-[10px] font-semibold text-ink-muted ml-auto">⏱️ {formatTime(q.time_spent_sec)} 사용</span>
                          )}
                        </div>
                        <div className={`${isMain ? 'text-[14px]' : 'text-[12px]'} font-bold text-ink mb-2 leading-[1.6]`}>{q.question_text}</div>
                        <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.8] whitespace-pre-wrap" style={{ color: q.student_answer ? '#1a1a1a' : '#9CA3AF' }}>
                          {q.student_answer || '답변 없음'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {activeSection === 'major' && (
                <div className="flex-1 overflow-y-auto flex flex-col gap-2.5">
                  {majors.map((q, i) => (
                    <div key={q.id} className="bg-white border border-line rounded-xl p-4" style={{ borderColor: q.student_answer ? '#6EE7B7' : '#E5E7EB', background: q.student_answer ? '#F0FDF4' : '#fff' }}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 text-amber-800 bg-amber-50 border border-amber-200">
                          Q{i + 1}
                        </span>
                        <span className="text-[13px] font-semibold text-ink leading-[1.5] flex-1">{q.question_text}</span>
                        {q.score !== null && (
                          <span className="text-[14px] font-extrabold" style={{ color: q.score === 100 ? '#059669' : q.score === 50 ? '#F97316' : '#EF4444' }}>
                            {q.score === 100 ? '○' : q.score === 50 ? '△' : '✕'}
                          </span>
                        )}
                      </div>
                      {q.student_answer ? (
                        <div className="bg-white border border-line rounded-md px-3 py-2 text-[12px] text-ink whitespace-pre-wrap leading-[1.7] mb-2">
                          {q.student_answer}
                        </div>
                      ) : (
                        <div className="text-[11px] text-ink-muted mb-2">답변 안 함</div>
                      )}
                      {q.score !== null && (
                        <div className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-md">
                          <span className="font-bold">✓ 정답: </span>{q.correct_answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeSection === 'report' && (
                <div className="flex-1 overflow-hidden bg-white border border-line rounded-2xl flex flex-col">
                  {!report ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted py-10">
                      <div className="text-5xl">📋</div>
                      <div className="text-[14px] font-bold text-ink">아직 리포트가 없어요</div>
                      <div className="text-[12px] text-ink-secondary text-center">
                        시험 완료 후 선생님이 리포트를 생성해주면 여기서 확인할 수 있어요.
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 상단 헤더 */}
                      <div className="px-5 py-3 border-b border-line flex items-center justify-between flex-shrink-0 bg-white">
                        <div className="text-[13px] font-bold text-ink">📊 프리미엄 학부모 리포트</div>
                        <button
                          onClick={handleDownloadPdf}
                          className="px-4 py-2 text-white rounded-lg text-[12px] font-bold"
                          style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                        >
                          🖨️ PDF 다운로드
                        </button>
                      </div>

                      <div 
                        className="flex-1 overflow-y-auto"
                        style={{
                          background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                        }}
                      >
                        <div id="premium-report-content" className="max-w-[860px] mx-auto py-8 px-5">
                          
                          {/* ============================================ */}
                          {/* 1. 표지 - 풀사이즈 임팩트 */}
                          {/* ============================================ */}
                          <div 
                            className="rounded-[32px] p-12 mb-8 text-white relative overflow-hidden"
                            style={{
                              background: `linear-gradient(135deg, #0F172A 0%, ${THEME.accentDark} 40%, ${THEME.accent} 100%)`,
                              boxShadow: '0 25px 80px rgba(15, 23, 42, 0.4)',
                              minHeight: '420px',
                            }}
                          >
                            {/* 장식 패턴 */}
                            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ 
                              background: 'radial-gradient(circle, #fff 0%, transparent 70%)',
                              transform: 'translate(30%, -30%)',
                            }} />
                            <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10" style={{ 
                              background: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)',
                              transform: 'translate(-20%, 40%)',
                            }} />

                            {/* 금색 장식 라인 */}
                            <div className="absolute top-12 right-12 w-16 h-0.5" style={{ background: 'linear-gradient(90deg, #FCD34D, transparent)' }} />
                            <div className="absolute bottom-12 left-12 w-16 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #FCD34D)' }} />

                            <div className="relative z-10 flex flex-col h-full" style={{ minHeight: '380px' }}>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-8">
                                  <div className="w-10 h-0.5" style={{ background: '#FCD34D' }} />
                                  <div className="text-[10px] font-bold tracking-[6px]" style={{ color: '#FCD34D' }}>
                                    BIKUS · PREMIUM REPORT
                                  </div>
                                </div>

                                <div className="text-[11px] font-bold tracking-[3px] opacity-70 mb-4">
                                  모의면접 리포트 · {selExam?.grade} {selExam?.period}
                                </div>
                                
                                <div className="text-[46px] font-black leading-[1.1] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                                  {student?.name}
                                </div>
                                <div className="text-[18px] font-light opacity-80 mb-10">
                                  학생의 성장 여정을 담았습니다
                                </div>
                              </div>

                              <div className="border-t border-white/20 pt-6 flex items-end justify-between flex-wrap gap-4">
                                <div className="grid grid-cols-3 gap-8 flex-1 min-w-[400px]">
                                  <div>
                                    <div className="text-[9px] font-bold tracking-[3px] opacity-60 mb-1.5">EXAM TYPE</div>
                                    <div className="text-[14px] font-bold">{selExam?.exam_type}</div>
                                  </div>
                                  <div>
                                    <div className="text-[9px] font-bold tracking-[3px] opacity-60 mb-1.5">LEVEL</div>
                                    <div className="text-[14px] font-bold">{selExam?.major_level}</div>
                                  </div>
                                  <div>
                                    <div className="text-[9px] font-bold tracking-[3px] opacity-60 mb-1.5">ISSUED</div>
                                    <div className="text-[14px] font-bold">
                                      {report.published_at ? new Date(report.published_at).toLocaleDateString('ko-KR') : '-'}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-[9px] font-bold tracking-[3px] opacity-60 mb-1">OVERALL SCORE</div>
                                  <div className="flex items-baseline gap-1">
                                    <div className="text-[64px] font-black leading-none" style={{ fontFamily: 'Georgia, serif', color: '#FCD34D' }}>
                                      {report.scores?.total || 0}
                                    </div>
                                    <div className="text-[20px] font-bold opacity-60">/100</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ============================================ */}
                          {/* 2. Executive Summary - 차트 */}
                          {/* ============================================ */}
                          <div className="grid grid-cols-5 gap-6 mb-8">
                            {/* 레이더 차트 */}
                            <div className="col-span-3 bg-white rounded-3xl p-7 shadow-sm border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-400 tracking-[3px] uppercase mb-1">Performance Analysis</div>
                              <div className="text-[18px] font-extrabold text-slate-900 mb-4">3가지 영역 종합 분석</div>
                              {report.scores && (
                                <div style={{ width: '100%', height: 260, minHeight: 260 }}>
                                  <RadarChart 
                                    width={400} 
                                    height={260}
                                    data={[
                                      { area: '인성', score: report.scores['인성'] || 0, fullMark: 100 },
                                      { area: '전공적합성', score: report.scores['전공적합성'] || 0, fullMark: 100 },
                                      { area: '발전가능성', score: report.scores['발전가능성'] || 0, fullMark: 100 },
                                    ]}
                                    style={{ margin: '0 auto' }}
                                  >
                                    <PolarGrid stroke="#E2E8F0" />
                                    <PolarAngleAxis dataKey="area" tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                                    <Radar name="점수" dataKey="score" stroke={THEME.accent} fill={THEME.accent} fillOpacity={0.4} strokeWidth={2} />
                                  </RadarChart>
                                </div>
                              )}
                            </div>

                            {/* 영역별 점수 */}
                            <div className="col-span-2 flex flex-col gap-3">
                              {report.scores && [
                                { name: '인성', score: report.scores['인성'] || 0, color: '#3B82F6', desc: 'Character' },
                                { name: '전공적합성', score: report.scores['전공적합성'] || 0, color: '#10B981', desc: 'Major Fit' },
                                { name: '발전가능성', score: report.scores['발전가능성'] || 0, color: '#F59E0B', desc: 'Potential' },
                              ].map(cat => (
                                <div key={cat.name} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex-1 flex flex-col justify-center relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-1 h-full" style={{ background: cat.color }} />
                                  <div className="text-[9px] font-bold tracking-[3px] uppercase mb-1" style={{ color: cat.color }}>{cat.desc}</div>
                                  <div className="flex items-end justify-between">
                                    <div className="text-[13px] font-bold text-slate-700">{cat.name}</div>
                                    <div className="text-[28px] font-black leading-none" style={{ color: cat.color, fontFamily: 'Georgia, serif' }}>
                                      {cat.score}
                                    </div>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-700"
                                      style={{
                                        width: `${cat.score}%`,
                                        background: `linear-gradient(90deg, ${cat.color}aa, ${cat.color})`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* ============================================ */}
                          {/* 3. 이전 회차 비교 (있을 때) */}
                          {/* ============================================ */}
                          {report.comparison_prev && (
                            <div className="bg-white rounded-3xl p-8 mb-8 shadow-sm border border-slate-100">
                              <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
                                <div>
                                  <div className="text-[10px] font-bold text-slate-400 tracking-[3px] uppercase mb-1">Growth Trajectory</div>
                                  <div className="text-[20px] font-extrabold text-slate-900">성장 궤적</div>
                                </div>
                                <div
                                  className="px-5 py-3 rounded-2xl flex items-center gap-3"
                                  style={{
                                    background: report.comparison_prev.diff >= 0 
                                      ? 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' 
                                      : 'linear-gradient(135deg, #FEE2E2, #FECACA)',
                                    border: `1px solid ${report.comparison_prev.diff >= 0 ? '#86EFAC' : '#FCA5A5'}`,
                                  }}
                                >
                                  <div className="text-[28px] leading-none">{report.comparison_prev.diff >= 0 ? '📈' : '📉'}</div>
                                  <div>
                                    <div className="text-[9px] font-bold tracking-[2px] uppercase" style={{ color: report.comparison_prev.diff >= 0 ? '#059669' : '#DC2626' }}>
                                      {report.comparison_prev.diff >= 0 ? 'improved' : 'decreased'}
                                    </div>
                                    <div className="text-[22px] font-black leading-none" style={{ color: report.comparison_prev.diff >= 0 ? '#059669' : '#DC2626', fontFamily: 'Georgia, serif' }}>
                                      {report.comparison_prev.diff >= 0 ? '+' : ''}{report.comparison_prev.diff}점
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div style={{ width: '100%', height: 200, minHeight: 200 }}>
                                <BarChart 
                                  width={760}
                                  height={200}
                                  data={[
                                    { name: '이전 회차', score: report.comparison_prev.prev_total },
                                    { name: '이번 회차', score: report.comparison_prev.current_total },
                                  ]}
                                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                                  style={{ margin: '0 auto' }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }} />
                                  <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                  <Tooltip />
                                  <Bar dataKey="score" fill={THEME.accent} radius={[8, 8, 0, 0]} />
                                </BarChart>
                              </div>
                            </div>
                          )}

                          {/* ============================================ */}
                          {/* 4. 학부모 편지 - 황금 카드 */}
                          {/* ============================================ */}
                          {report.summary_for_parents && (
                            <div 
                              className="rounded-3xl p-10 mb-8 relative overflow-hidden"
                              style={{
                                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FBBF24 100%)',
                                boxShadow: '0 20px 60px rgba(251, 191, 36, 0.25)',
                              }}
                            >
                              <div className="absolute top-8 right-10 text-8xl opacity-15" style={{ fontFamily: 'Georgia, serif' }}>"</div>
                              <div className="absolute bottom-8 left-10 text-8xl opacity-15 rotate-180" style={{ fontFamily: 'Georgia, serif' }}>"</div>
                              
                              <div className="relative z-10 max-w-2xl mx-auto">
                                <div className="flex items-center gap-3 mb-6 justify-center">
                                  <div className="w-12 h-0.5" style={{ background: '#92400E' }} />
                                  <div className="text-[10px] font-bold tracking-[4px]" style={{ color: '#92400E' }}>
                                    LETTER TO PARENTS
                                  </div>
                                  <div className="w-12 h-0.5" style={{ background: '#92400E' }} />
                                </div>
                                
                                <div className="text-[24px] font-extrabold text-center mb-6" style={{ color: '#78350F', fontFamily: 'Georgia, serif' }}>
                                  학부모님께 드리는 메시지
                                </div>
                                
                                <div 
                                  className="text-[15px] leading-[2.2] text-center font-medium"
                                  style={{ color: '#78350F', fontFamily: 'Georgia, serif' }}
                                >
                                  {report.summary_for_parents}
                                </div>
                                
                                <div className="text-right mt-8 text-[12px] font-bold" style={{ color: '#92400E', fontFamily: 'Georgia, serif' }}>
                                  — BIKUS 입시 컨설팅 드림
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ============================================ */}
                          {/* 5. 강점 & 개선점 */}
                          {/* ============================================ */}
                          <div className="grid grid-cols-2 gap-6 mb-8">
                            {report.strengths && report.strengths.length > 0 && (
                              <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-100 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #10B981, #34D399)' }} />
                                <div className="flex items-center gap-3 mb-5">
                                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[24px]" style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' }}>
                                    💪
                                  </div>
                                  <div>
                                    <div className="text-[9px] font-bold text-green-700 tracking-[3px] uppercase">Strengths</div>
                                    <div className="text-[18px] font-extrabold text-green-800">강점 포인트</div>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                  {report.strengths.map((s, i) => (
                                    <div key={i} className="flex gap-3 items-start bg-green-50/50 rounded-xl p-3">
                                      <div 
                                        className="w-7 h-7 rounded-full text-white flex items-center justify-center flex-shrink-0 text-[11px] font-black"
                                        style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                                      >
                                        {i + 1}
                                      </div>
                                      <div className="text-[13px] text-green-900 leading-[1.8] flex-1 font-medium">{s}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {report.weaknesses && report.weaknesses.length > 0 && (
                              <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-100 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #F59E0B, #FBBF24)' }} />
                                <div className="flex items-center gap-3 mb-5">
                                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[24px]" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' }}>
                                    🎯
                                  </div>
                                  <div>
                                    <div className="text-[9px] font-bold text-amber-700 tracking-[3px] uppercase">Improvements</div>
                                    <div className="text-[18px] font-extrabold text-amber-800">개선 포인트</div>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                  {report.weaknesses.map((s, i) => (
                                    <div key={i} className="flex gap-3 items-start bg-amber-50/50 rounded-xl p-3">
                                      <div 
                                        className="w-7 h-7 rounded-lg text-white flex items-center justify-center flex-shrink-0 text-[14px] font-black"
                                        style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
                                      >
                                        ▸
                                      </div>
                                      <div className="text-[13px] text-amber-900 leading-[1.8] flex-1 font-medium">{s}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ============================================ */}
                          {/* 6. 대학 적합도 */}
                          {/* ============================================ */}
                          {report.university_fit && (
                            <div 
                              className="rounded-3xl p-8 mb-8 relative overflow-hidden"
                              style={{
                                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                                boxShadow: '0 20px 60px rgba(15, 23, 42, 0.3)',
                              }}
                            >
                              <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20" style={{ 
                                background: 'radial-gradient(circle, #DC2626 0%, transparent 70%)',
                                transform: 'translate(30%, -30%)',
                              }} />
                              
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-5">
                                  <div className="text-4xl">🎓</div>
                                  <div>
                                    <div className="text-[9px] font-bold text-red-300 tracking-[3px] uppercase">Target University</div>
                                    <div className="text-[11px] font-bold text-slate-400">목표 대학 적합도</div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between gap-6 flex-wrap mb-6">
                                  <div>
                                    <div className="text-[28px] font-extrabold text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                                      {report.university_fit.university}
                                    </div>
                                    <div className="text-[16px] font-bold text-slate-300">
                                      {report.university_fit.department}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[11px] font-bold text-red-300 tracking-[2px] uppercase mb-1">Fit Score</div>
                                    <div className="flex items-baseline gap-1 justify-end">
                                      <div className="text-[64px] font-black leading-none" style={{ color: '#F87171', fontFamily: 'Georgia, serif' }}>
                                        {report.university_fit.fit_score}
                                      </div>
                                      <div className="text-[24px] font-bold text-red-300">%</div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="h-4 bg-white/10 rounded-full overflow-hidden mb-4">
                                  <div
                                    className="h-full rounded-full relative"
                                    style={{
                                      width: `${report.university_fit.fit_score}%`,
                                      background: 'linear-gradient(90deg, #F87171, #DC2626, #B91C1C)',
                                      boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)',
                                    }}
                                  />
                                </div>
                                
                                {report.university_fit.reason && (
                                  <div className="text-[13px] text-slate-300 leading-[1.8] bg-white/5 rounded-xl p-4 border border-white/10">
                                    💬 {report.university_fit.reason}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ============================================ */}
                          {/* 7. 시기별 가이드 */}
                          {/* ============================================ */}
                          {report.season_guide && (
                            <div className="bg-white rounded-3xl p-8 mb-8 shadow-sm border border-slate-100 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #10B981, #34D399, #6EE7B7)' }} />
                              
                              <div className="flex items-center gap-3 mb-6">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px]" style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' }}>
                                  🌱
                                </div>
                                <div>
                                  <div className="text-[9px] font-bold text-green-700 tracking-[3px] uppercase">Seasonal Guide</div>
                                  <div className="text-[22px] font-extrabold text-green-800">{report.season_guide.title}</div>
                                  <div className="text-[12px] font-semibold text-green-700 mt-0.5">{report.season_guide.subtitle}</div>
                                </div>
                              </div>
                              
                              {Array.isArray(report.season_guide.content) && (
                                <div className="grid grid-cols-2 gap-3">
                                  {report.season_guide.content.map((c: string, i: number) => (
                                    <div 
                                      key={i}
                                      className="flex gap-3 items-start rounded-2xl p-4 border border-green-100"
                                      style={{ background: 'linear-gradient(135deg, #ECFDF5, #F0FDF4)' }}
                                    >
                                      <div 
                                        className="w-8 h-8 rounded-xl text-white flex items-center justify-center flex-shrink-0 text-[12px] font-black"
                                        style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                                      >
                                        {String(i + 1).padStart(2, '0')}
                                      </div>
                                      <div className="text-[13px] text-green-900 leading-[1.8] flex-1 font-medium">{c}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ============================================ */}
                          {/* 8. 생기부 방향성 */}
                          {/* ============================================ */}
                          {report.saenggibu_direction && (
                            <div className="bg-white rounded-3xl p-8 mb-8 shadow-sm border border-slate-100 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA, #C4B5FD)' }} />
                              
                              <div className="flex items-center gap-3 mb-6">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px]" style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' }}>
                                  📚
                                </div>
                                <div>
                                  <div className="text-[9px] font-bold text-purple-700 tracking-[3px] uppercase">Saenggibu Design</div>
                                  <div className="text-[22px] font-extrabold text-purple-800">생활기록부 방향성 제안</div>
                                  <div className="text-[12px] font-semibold text-purple-700 mt-0.5">전공 합격을 위한 핵심 설계</div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                {Object.entries(report.saenggibu_direction).map(([key, items]) => (
                                  <div 
                                    key={key}
                                    className="rounded-2xl p-5 border border-purple-100"
                                    style={{ background: 'linear-gradient(135deg, #FAF5FF, #F5F3FF)' }}
                                  >
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #7C3AED, #A78BFA)' }} />
                                      <div className="text-[14px] font-extrabold text-purple-900">{key}</div>
                                    </div>
                                    {Array.isArray(items) && (
                                      <div className="flex flex-col gap-2">
                                        {items.map((item, i) => (
                                          <div key={i} className="flex gap-2 items-start">
                                            <div className="text-purple-500 flex-shrink-0 text-[12px] font-bold mt-1">◆</div>
                                            <div className="text-[12px] text-purple-900 leading-[1.7] flex-1">{item}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ============================================ */}
                          {/* 9. 다음 회차 계획 */}
                          {/* ============================================ */}
                          {report.next_period_plan && (
                            <div 
                              className="rounded-3xl p-8 mb-8 relative overflow-hidden"
                              style={{
                                background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 50%, #FDBA74 100%)',
                                boxShadow: '0 20px 60px rgba(251, 146, 60, 0.2)',
                              }}
                            >
                              <div className="absolute top-4 right-6 text-8xl opacity-15">🎯</div>
                              
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] bg-white shadow-md">
                                    🎯
                                  </div>
                                  <div>
                                    <div className="text-[9px] font-bold text-orange-800 tracking-[3px] uppercase">Next Period Plan</div>
                                    <div className="text-[22px] font-extrabold text-orange-900">다음 회차까지 준비할 것</div>
                                  </div>
                                </div>
                                <div 
                                  className="text-[15px] leading-[2] text-orange-900 font-medium bg-white/40 rounded-2xl p-5 border border-orange-200"
                                  style={{ fontFamily: 'Georgia, serif' }}
                                >
                                  {report.next_period_plan}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ============================================ */}
                          {/* 10. 선생님 코멘트 */}
                          {/* ============================================ */}
                          {selExam?.teacher_comment && (
                            <div 
                              className="rounded-3xl p-8 mb-8 relative overflow-hidden"
                              style={{
                                background: `linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)`,
                                borderLeft: `8px solid ${THEME.accent}`,
                                boxShadow: `0 20px 60px ${THEME.accentShadow}`,
                              }}
                            >
                              <div className="absolute top-6 right-8 text-8xl opacity-10" style={{ fontFamily: 'Georgia, serif' }}>"</div>
                              
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-5">
                                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] bg-white shadow-md">
                                    👨‍🏫
                                  </div>
                                  <div>
                                    <div className="text-[9px] font-bold tracking-[3px] uppercase" style={{ color: THEME.accentDark }}>Teacher's Note</div>
                                    <div className="text-[22px] font-extrabold" style={{ color: THEME.accentDark }}>선생님 특별 코멘트</div>
                                  </div>
                                </div>
                                <div 
                                  className="text-[16px] leading-[2.2] font-medium italic"
                                  style={{ color: THEME.accentDark, fontFamily: 'Georgia, serif' }}
                                >
                                  "{selExam.teacher_comment}"
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ============================================ */}
                          {/* 푸터 */}
                          {/* ============================================ */}
                          <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-slate-100">
                            <div className="flex items-center justify-center gap-3 mb-4">
                              <div className="w-12 h-0.5" style={{ background: THEME.accent }} />
                              <div className="text-[24px] font-black tracking-[4px]" style={{ color: THEME.accent, fontFamily: 'Georgia, serif' }}>
                                BIKUS
                              </div>
                              <div className="w-12 h-0.5" style={{ background: THEME.accent }} />
                            </div>
                            <div className="text-[11px] font-bold text-slate-600 tracking-[3px] uppercase mb-2">
                              AI Premium College Admission Consulting
                            </div>
                            <div className="text-[10px] text-slate-400 leading-[1.8] max-w-lg mx-auto">
                              본 리포트는 AI 분석과 담당 선생님의 전문 코멘트를 바탕으로 작성되었습니다.<br />
                              © 2026 BIKUS · Powered by 마스터웨이학원
                            </div>
                          </div>

                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}