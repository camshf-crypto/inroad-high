import { useState, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import {
  useAvailablePresentations,
  useMyPresentationExams,
  useExamQuestions,
  useCreatePresentationExam,
  useSubmitMainIntentAnswer,
  useSubmitFirstAnswer,
  useSubmitSecondAnswer,
  useSubmitTailAnswer,
  useCompletePresentationExam,
  useDeletePresentationExam,
  uploadPresentationRecording,
  getPresentationStatusLabel,
  PRESENTATION_CATEGORIES,
  type PresentationSeed,
} from '../../_hooks/useMyHighPresentation'

function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile-for-presentation'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      return data
    },
    refetchInterval: 2000,
  })
}

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
}

const ALL_UNIVS = ['서울대학교', '연세대학교', '고려대학교', '한양대학교', '성균관대학교', '중앙대학교', '경희대학교']

type Phase = 'list' | 'select' | 'exam' | 'done'
type ActiveTab = 'intent' | string  // 'intent' or questionId
type QPhase = 'first' | 'firstFeedback' | 'second' | 'finalFeedback' | 'tail' | 'tailFeedback'

export default function Presentation() {
  const { data: myProfile } = useMyProfile()

  const [phase, setPhase] = useState<Phase>('list')
  const [selUniv, setSelUniv] = useState('')
  const [selCategory, setSelCategory] = useState('')
  const [selSeed, setSelSeed] = useState<PresentationSeed | null>(null)
  const [selExamId, setSelExamId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('intent')
  const [qPhase, setQPhase] = useState<QPhase>('first')
  const [answerInput, setAnswerInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const answerStartRef = useRef<number>(0)

  const { data: myExams = [] } = useMyPresentationExams()
  const { data: availableSeeds = [] } = useAvailablePresentations(selUniv, selCategory)
  const selExam = useMemo(() => myExams.find(e => e.id === selExamId), [myExams, selExamId])
  const { data: examQuestions = [] } = useExamQuestions(selExamId || undefined)
  const { data: seed } = useQuery({
    queryKey: ['presentation-seed', selExam?.seed_id],
    queryFn: async () => {
      if (!selExam) return null
      const { data } = await supabase.from('high_passage_seed').select('*').eq('id', selExam.seed_id).single()
      return data
    },
    enabled: !!selExam,
  })

  const createExam = useCreatePresentationExam()
  const submitMainIntent = useSubmitMainIntentAnswer()
  const submitFirst = useSubmitFirstAnswer()
  const submitSecond = useSubmitSecondAnswer()
  const submitTail = useSubmitTailAnswer()
  const completeExam = useCompletePresentationExam()
  const deleteExam = useDeletePresentationExam()

  // 현재 활성 질문
  const activeQuestion = activeTab !== 'intent' ? examQuestions.find(q => q.id === activeTab) : null

  // 탭 변경 시 답변 입력 비우고 phase 초기화
  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab)
    setAnswerInput('')
    if (tab !== 'intent') {
      const q = examQuestions.find(qq => qq.id === tab)
      if (q) {
        // 질문 진행 단계 추론
        if (q.tail_feedback) setQPhase('tailFeedback')
        else if (q.tail_answer) setQPhase('tailFeedback')
        else if (q.final_feedback && q.tail_question) setQPhase('tail')
        else if (q.final_feedback) setQPhase('finalFeedback')
        else if (q.second_answer) setQPhase('finalFeedback')
        else if (q.first_feedback) setQPhase('second')
        else if (q.first_answer) setQPhase('firstFeedback')
        else setQPhase('first')
      }
    }
  }

  // 녹음
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.start()
      answerStartRef.current = Date.now()
      setIsRecording(true)
    } catch (e: any) {
      alert('마이크 권한 필요: ' + e.message)
    }
  }

  const stopRecording = async (label: string): Promise<{ url: string | null; duration: number }> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current
      if (!mr || !selExamId) { resolve({ url: null, duration: 0 }); return }
      mr.onstop = async () => {
        mr.stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const duration = Math.floor((Date.now() - answerStartRef.current) / 1000)
        if (blob.size === 0) { resolve({ url: null, duration }); return }
        try {
          const url = await uploadPresentationRecording(blob, selExamId, `${label}-${Date.now()}.webm`)
          resolve({ url, duration })
        } catch {
          resolve({ url: null, duration })
        }
      }
      mr.stop()
      setIsRecording(false)
    })
  }

  const handleStartExam = async () => {
    if (!selSeed) return
    try {
      const exam = await createExam.mutateAsync({ seedId: selSeed.id })
      setSelExamId(exam.id)
      setActiveTab('intent')
      setPhase('exam')
    } catch (e: any) {
      alert('시작 실패: ' + e.message)
    }
  }

  // 의도파악 답변 제출
  const handleSubmitMainIntent = async () => {
    if (!selExamId || !answerInput.trim()) return
    let url: string | null = null, duration = 0
    if (isRecording) {
      const r = await stopRecording('intent')
      url = r.url; duration = r.duration
    }
    try {
      await submitMainIntent.mutateAsync({
        examId: selExamId, answer: answerInput,
        recordingUrl: url || undefined, durationSec: duration,
      })
      setAnswerInput('')
      // 첫 질문 탭으로 자동 이동
      if (examQuestions.length > 0) {
        switchTab(examQuestions[0].id)
      }
    } catch (e: any) {
      alert('저장 실패: ' + e.message)
    }
  }

  // 1차/2차/꼬리 답변 제출
  const handleSubmitAnswer = async () => {
    if (!activeQuestion || !selExamId || !answerInput.trim()) return
    let url: string | null = null, duration = 0
    if (isRecording) {
      const r = await stopRecording(qPhase)
      url = r.url; duration = r.duration
    }
    try {
      const args = {
        questionId: activeQuestion.id, examId: selExamId,
        answer: answerInput, recordingUrl: url || undefined, durationSec: duration,
      }
      if (qPhase === 'first') { await submitFirst.mutateAsync(args); setQPhase('firstFeedback') }
      else if (qPhase === 'second') { await submitSecond.mutateAsync(args); setQPhase('finalFeedback') }
      else if (qPhase === 'tail') { await submitTail.mutateAsync(args); setQPhase('tailFeedback') }
      setAnswerInput('')
    } catch (e: any) {
      alert('저장 실패: ' + e.message)
    }
  }

  // 다음 단계
  const goNext = () => {
    if (qPhase === 'firstFeedback') { setQPhase('second'); return }
    if (qPhase === 'finalFeedback') {
      if (activeQuestion?.tail_question) setQPhase('tail')
      else nextQuestion()
      return
    }
    if (qPhase === 'tailFeedback') { nextQuestion(); return }
  }

  const nextQuestion = async () => {
    const curIdx = examQuestions.findIndex(q => q.id === activeTab)
    if (curIdx + 1 >= examQuestions.length) {
      // 마지막 → 완료
      if (selExamId) await completeExam.mutateAsync(selExamId)
      setPhase('done')
      return
    }
    switchTab(examQuestions[curIdx + 1].id)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteExam.mutateAsync(id)
      if (selExamId === id) setSelExamId(null)
      setDeleteTarget(null)
    } catch (e: any) {
      alert('삭제 실패: ' + e.message)
    }
  }

  // ═══════════════════════════════════════════
  // 1. 목록
  // ═══════════════════════════════════════════
  if (phase === 'list') {
    return (
      <div className="flex flex-col gap-4 h-full overflow-hidden px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-extrabold text-ink">📜 제시문 면접</div>
            <div className="text-[12px] text-ink-secondary mt-1">
              {myProfile?.name && `${myProfile.name} 학생 · `}총 {myExams.length}회 진행
            </div>
          </div>
          <button
            onClick={() => setPhase('select')}
            className="px-5 py-2.5 text-white rounded-lg text-[13px] font-bold"
            style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
          >
            + 새 회차 시작
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {myExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-ink-muted gap-3">
              <div className="text-5xl">📜</div>
              <div className="text-[14px] font-bold text-ink">아직 진행한 회차가 없어요</div>
              <div className="text-[12px]">위 '+ 새 회차 시작' 버튼을 눌러 시작하세요</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {myExams.map(exam => {
                const sl = getPresentationStatusLabel(exam.status)
                return (
                  <div
                    key={exam.id}
                    onClick={() => {
                      setSelExamId(exam.id)
                      setActiveTab('intent')
                      setPhase('exam')
                    }}
                    className="bg-white border border-line rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all hover:border-blue-300 relative"
                  >
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(exam.id) }}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 text-[12px] text-ink-secondary flex items-center justify-center transition-colors"
                    >
                      ✕
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-[16px] font-extrabold text-ink">📜 {exam.passage_title}</div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: sl.bg, color: sl.color }}>
                        {sl.label}
                      </span>
                    </div>
                    <div className="text-[12px] text-ink-secondary">
                      🎓 {exam.university} · {exam.category} · 📅 {new Date(exam.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {deleteTarget !== null && (
          <DeleteModal
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => handleDelete(deleteTarget)}
            isLoading={deleteExam.isPending}
          />
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // 2. 학교/계열 선택
  // ═══════════════════════════════════════════
  if (phase === 'select') {
    return (
      <div className="flex flex-col h-full overflow-hidden px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setPhase('list')} className="text-[12px] font-semibold text-ink-secondary hover:text-ink">
            ← 뒤로
          </button>
          <div className="text-[15px] font-extrabold text-ink">학교 · 계열 선택</div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-6 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <div className="text-[12px] font-bold text-ink mb-2">🎓 학교</div>
              <select
                value={selUniv}
                onChange={e => { setSelUniv(e.target.value); setSelSeed(null) }}
                className="w-full h-11 border border-line rounded-lg px-3 text-[13px] outline-none bg-white focus:border-blue-500"
              >
                <option value="">전체 학교</option>
                {ALL_UNIVS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[12px] font-bold text-ink mb-2">📚 계열</div>
              <select
                value={selCategory}
                onChange={e => { setSelCategory(e.target.value); setSelSeed(null) }}
                className="w-full h-11 border border-line rounded-lg px-3 text-[13px] outline-none bg-white focus:border-blue-500"
              >
                <option value="">전체 계열</option>
                {PRESENTATION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="text-[12px] font-bold text-ink mb-2">
            📜 제시문 선택 ({availableSeeds.length}개)
          </div>
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {availableSeeds.length === 0 ? (
              <div className="text-center py-8 text-ink-muted text-[12px]">
                해당 조건의 제시문이 없어요. 다른 학교/계열을 선택해보세요.
              </div>
            ) : availableSeeds.map(seedItem => {
              const isSelected = selSeed?.id === seedItem.id
              return (
                <button
                  key={seedItem.id}
                  onClick={() => setSelSeed(seedItem)}
                  className="text-left rounded-xl px-4 py-3 transition-all"
                  style={{
                    border: `2px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                    background: isSelected ? THEME.accentBg : '#fff',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-extrabold text-ink">{seedItem.passage_title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#FEF3C7', color: '#92400E' }}>
                      {seedItem.difficulty}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-secondary">
                    🎓 {seedItem.university} · {seedItem.category}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <button
          onClick={handleStartExam}
          disabled={!selSeed || createExam.isPending}
          className="w-full h-12 text-white rounded-xl text-[14px] font-bold disabled:opacity-50"
          style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
        >
          {createExam.isPending ? '준비 중...' : '🚀 회차 시작'}
        </button>
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // 3. 응시 화면 (왼쪽 제시문 고정 + 오른쪽 탭)
  // ═══════════════════════════════════════════
  if (phase === 'exam' && selExam) {
    return (
      <div className="flex flex-col h-full overflow-hidden px-6 py-5">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSelExamId(null); setPhase('list') }}
              className="text-[12px] font-semibold text-ink-secondary hover:text-ink"
            >
              ← 목록
            </button>
            <div className="text-[15px] font-extrabold text-ink">📜 {selExam.passage_title}</div>
            {seed && (
              <span className="text-[11px] font-medium text-ink-secondary">
                🎓 {seed.university} · {seed.category}
              </span>
            )}
          </div>
        </div>

        {/* 좌우 반반 */}
        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">

          {/* ━━━ 왼쪽: 제시문 (스크롤 없이 한 화면에) ━━━ */}
          <div className="bg-white border border-line rounded-2xl p-6 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">📜 제시문</span>
              {seed?.difficulty && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
                  난이도 {seed.difficulty}
                </span>
              )}
            </div>
            {!seed ? (
              <div className="flex-1 flex items-center justify-center text-ink-muted">불러오는 중...</div>
            ) : seed.passage_pdf_url ? (
              <iframe src={seed.passage_pdf_url} className="flex-1 w-full border border-line rounded-lg" />
            ) : seed.passage_text ? (
              <div className="bg-gray-50 border border-line rounded-xl p-5 text-[14px] leading-[2] text-ink whitespace-pre-wrap flex-1">
                {seed.passage_text}
              </div>
            ) : (
              <div className="text-ink-muted">제시문이 등록되지 않았어요.</div>
            )}
          </div>

          {/* ━━━ 오른쪽: 탭 + 동적 화면 (전체 스크롤) ━━━ */}
          <div className="bg-white border border-line rounded-2xl flex flex-col overflow-hidden">
            {/* 탭 (고정) */}
            <div className="px-5 py-3 border-b border-line flex-shrink-0 flex gap-1.5 overflow-x-auto">
              {/* 의도파악 탭 */}
              <button
                onClick={() => switchTab('intent')}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all flex-shrink-0"
                style={{
                  background: activeTab === 'intent' ? THEME.accent : '#F3F4F6',
                  color: activeTab === 'intent' ? '#fff' : '#6B7280',
                }}
              >
                🌟 의도파악
              </button>
              {/* 질문 탭 (동적) */}
              {examQuestions.map((q, i) => {
                const isActive = activeTab === q.id
                const isCompleted = !!q.final_feedback && (!q.tail_question || !!q.tail_feedback)
                return (
                  <button
                    key={q.id}
                    onClick={() => switchTab(q.id)}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all flex-shrink-0"
                    style={{
                      background: isActive ? THEME.accent : isCompleted ? '#D1FAE5' : '#F3F4F6',
                      color: isActive ? '#fff' : isCompleted ? '#065F46' : '#6B7280',
                    }}
                  >
                    Q{i + 1}{isCompleted && ' ✓'}
                  </button>
                )
              })}
            </div>

            {/* 탭 내용 (전체 스크롤) */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'intent' ? (
                <IntentTab
                  exam={selExam}
                  seed={seed}
                  answerInput={answerInput}
                  setAnswerInput={setAnswerInput}
                  isRecording={isRecording}
                  startRecording={startRecording}
                  onSubmit={handleSubmitMainIntent}
                  isPending={submitMainIntent.isPending}
                />
              ) : activeQuestion ? (
                <QuestionTab
                  question={activeQuestion}
                  qIdx={examQuestions.findIndex(q => q.id === activeTab)}
                  qPhase={qPhase}
                  answerInput={answerInput}
                  setAnswerInput={setAnswerInput}
                  isRecording={isRecording}
                  startRecording={startRecording}
                  onSubmit={handleSubmitAnswer}
                  onNext={goNext}
                  isPending={submitFirst.isPending || submitSecond.isPending || submitTail.isPending}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // 4. 완료
  // ═══════════════════════════════════════════
  if (phase === 'done') {
    return (
      <div className="px-7 py-6 flex flex-col items-center justify-center h-full">
        <div className="text-6xl mb-3">🎉</div>
        <div className="text-[22px] font-extrabold text-ink mb-2">제시문 면접 완료!</div>
        <div className="text-[14px] text-ink-secondary mb-6 text-center max-w-md">
          모든 답변이 저장되었어요.<br />
          선생님이 피드백을 작성하면 알려드릴게요.
        </div>
        <button
          onClick={() => { setSelExamId(null); setPhase('list') }}
          className="px-6 py-3 text-white rounded-xl text-[14px] font-bold"
          style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
        >
          목록으로
        </button>
      </div>
    )
  }

  return null
}

// ═══════════════════════════════════════════
// 🌟 의도파악 탭
// ═══════════════════════════════════════════
function IntentTab({ exam, seed, answerInput, setAnswerInput, isRecording, startRecording, onSubmit, isPending }: any) {
  return (
    <div className="flex flex-col gap-3">
      {/* 질문 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="text-[10px] font-bold text-blue-700 mb-2">🌟 원질문 의도파악</div>
        <div className="text-[14px] font-bold text-blue-900 leading-[1.7]">{seed?.main_intent_question}</div>
      </div>

      {/* 학생이 이미 답변했으면 결과 */}
      {exam.main_intent_answer ? (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-50 border border-line rounded-xl p-4">
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">📝 내 답변</div>
            <div className="text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">{exam.main_intent_answer}</div>
          </div>
          {exam.main_intent_feedback ? (
            <div className="bg-white border border-line rounded-xl p-4">
              <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">💬 선생님 피드백</div>
              <div className="text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">{exam.main_intent_feedback}</div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center text-[12px] text-blue-700 font-semibold">
              ⏳ 선생님 피드백을 기다리는 중이에요
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            value={answerInput}
            onChange={e => setAnswerInput(e.target.value)}
            placeholder="제시문을 읽고 저자의 의도를 본인의 말로 설명해보세요..."
            rows={12}
            className="border border-line rounded-xl px-4 py-3 text-[13px] font-medium outline-none resize-none leading-[1.8]"
          />
          <div className="flex gap-2">
            <button
              onClick={startRecording}
              disabled={isRecording}
              className="px-4 py-3 rounded-lg text-[13px] font-bold border-2 disabled:opacity-50"
              style={isRecording 
                ? { borderColor: '#EF4444', background: '#FEE2E2', color: '#DC2626' }
                : { borderColor: THEME.accent, background: '#fff', color: THEME.accent }
              }
            >
              {isRecording ? '🔴' : '🎙️'}
            </button>
            <button
              onClick={onSubmit}
              disabled={!answerInput.trim() || isPending}
              className="flex-1 h-12 text-white rounded-lg text-[13px] font-bold disabled:opacity-50"
              style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
            >
              {isPending ? '저장 중...' : '✅ 의도파악 답변 제출'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// 질문 탭 (1차/2차/꼬리)
// ═══════════════════════════════════════════
function QuestionTab({ question, qIdx, qPhase, answerInput, setAnswerInput, isRecording, startRecording, onSubmit, onNext, isPending }: any) {
  const phaseLabel: Record<QPhase, { title: string; bg: string; color: string }> = {
    first: { title: '1차 답변', bg: '#DBEAFE', color: '#1E40AF' },
    firstFeedback: { title: '1차 피드백', bg: '#FEF3C7', color: '#92400E' },
    second: { title: '2차 답변', bg: '#DBEAFE', color: '#1E40AF' },
    finalFeedback: { title: '최종 피드백', bg: '#D1FAE5', color: '#065F46' },
    tail: { title: '🔗 꼬리질문', bg: '#DBEAFE', color: '#1E40AF' },
    tailFeedback: { title: '꼬리 피드백', bg: '#D1FAE5', color: '#065F46' },
  }
  const cur = phaseLabel[qPhase as QPhase]
  const isTailPhase = qPhase === 'tail' || qPhase === 'tailFeedback'

  return (
    <div className="flex flex-col gap-3">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <div className="text-[13px] font-extrabold text-ink">질문 {qIdx + 1}</div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cur.bg, color: cur.color }}>
          {cur.title}
        </span>
      </div>

      {/* 질문 + 의도 */}
      <div className="bg-white border border-line rounded-xl p-4">
        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">
          {isTailPhase ? '🔗 꼬리질문' : '📌 질문'}
        </div>
        <div className="text-[14px] font-bold text-ink leading-[1.7] mb-3">
          {isTailPhase ? question.tail_question : question.question}
        </div>
        {!isTailPhase && question.author_intent && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
            <div className="text-[10px] font-bold text-blue-700 mb-1">💡 질문 의도 (참고)</div>
            <div className="text-[11px] text-blue-900 leading-[1.6]">{question.author_intent}</div>
          </div>
        )}
      </div>

      {/* 단계별 화면 */}
      <div>
        {qPhase === 'first' && (
          <AnswerInput
            answerInput={answerInput} setAnswerInput={setAnswerInput}
            isRecording={isRecording} startRecording={startRecording}
            onSubmit={onSubmit} isPending={isPending}
            placeholder="1차 답변을 작성해주세요..."
            submitLabel="✅ 1차 답변 제출"
          />
        )}

        {qPhase === 'firstFeedback' && (
          <FeedbackView
            answer={question.first_answer}
            feedback={question.first_feedback}
            isWaiting={!question.first_feedback}
            onNext={onNext}
            nextLabel="📝 2차 답변하러 가기"
          />
        )}

        {qPhase === 'second' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 text-[12px] text-blue-800">
              <strong>1차 피드백:</strong> {question.first_feedback}
            </div>
            <AnswerInput
              answerInput={answerInput} setAnswerInput={setAnswerInput}
              isRecording={isRecording} startRecording={startRecording}
              onSubmit={onSubmit} isPending={isPending}
              placeholder="피드백을 참고해 답변을 보완해주세요..."
              submitLabel="✅ 2차 답변 제출"
            />
          </>
        )}

        {qPhase === 'finalFeedback' && (
          <FeedbackView
            answer={question.second_answer}
            feedback={question.final_feedback}
            isWaiting={!question.final_feedback}
            onNext={onNext}
            nextLabel={question.tail_question ? '🔗 꼬리질문 답변하기' : '➡️ 다음 질문'}
          />
        )}

        {qPhase === 'tail' && (
          <AnswerInput
            answerInput={answerInput} setAnswerInput={setAnswerInput}
            isRecording={isRecording} startRecording={startRecording}
            onSubmit={onSubmit} isPending={isPending}
            placeholder="꼬리질문에 답변해주세요..."
            submitLabel="✅ 꼬리 답변 제출"
          />
        )}

        {qPhase === 'tailFeedback' && (
          <FeedbackView
            answer={question.tail_answer}
            feedback={question.tail_feedback}
            isWaiting={!question.tail_feedback}
            onNext={onNext}
            nextLabel="➡️ 다음 질문"
          />
        )}
      </div>
    </div>
  )
}

function AnswerInput({ answerInput, setAnswerInput, isRecording, startRecording, onSubmit, isPending, placeholder, submitLabel }: any) {
  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={answerInput}
        onChange={e => setAnswerInput(e.target.value)}
        placeholder={placeholder}
        rows={12}
        autoFocus
        className="border border-line rounded-xl px-4 py-3 text-[13px] font-medium outline-none resize-none leading-[1.8]"
      />
      <div className="flex gap-2">
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="px-4 py-3 rounded-lg text-[13px] font-bold border-2 disabled:opacity-50"
          style={isRecording 
            ? { borderColor: '#EF4444', background: '#FEE2E2', color: '#DC2626' }
            : { borderColor: '#2563EB', background: '#fff', color: '#2563EB' }
          }
        >
          {isRecording ? '🔴' : '🎙️'}
        </button>
        <button
          onClick={onSubmit}
          disabled={!answerInput.trim() || isPending}
          className="flex-1 h-12 bg-blue-600 text-white rounded-lg text-[13px] font-bold disabled:opacity-50 hover:bg-blue-700"
        >
          {isPending ? '저장 중...' : submitLabel}
        </button>
      </div>
    </div>
  )
}

function FeedbackView({ answer, feedback, isWaiting, onNext, nextLabel }: any) {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white border border-line rounded-xl p-4">
        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">📝 내 답변</div>
        <div className="text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">{answer || '답변 없음'}</div>
      </div>
      
      {isWaiting ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">⏳</div>
          <div className="text-[14px] font-bold text-blue-800 mb-1">선생님 피드백을 기다리는 중이에요</div>
          <div className="text-[12px] text-blue-700">자동으로 새로고침돼요.</div>
        </div>
      ) : (
        <>
          <div className="bg-white border border-line rounded-xl p-4">
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">💬 선생님 피드백</div>
            <div className="text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">{feedback}</div>
          </div>
          <button
            onClick={onNext}
            className="w-full h-12 bg-blue-600 text-white rounded-xl text-[14px] font-bold hover:bg-blue-700"
          >
            {nextLabel}
          </button>
        </>
      )}
    </div>
  )
}

function DeleteModal({ onCancel, onConfirm, isLoading }: { onCancel: () => void; onConfirm: () => void; isLoading: boolean }) {
  return (
    <div onClick={onCancel} className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-7 w-full max-w-[400px] text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <div className="text-[16px] font-bold text-ink mb-2">회차를 삭제하시겠어요?</div>
        <div className="text-[13px] text-ink-secondary mb-6">삭제하면 답변과 녹음이 모두 사라져요.</div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50">취소</button>
          <button onClick={onConfirm} disabled={isLoading} className="flex-1 h-11 bg-red-600 text-white rounded-lg text-[13px] font-bold hover:bg-red-700 disabled:opacity-50">
            {isLoading ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}