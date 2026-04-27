import { useState, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  useMajorSeeds,
  useMajorChapters,
  useChapterQuestions,
  useChapterProgress,
  useMyProgress,
  useStartChapter,
  useSubmitObjective,
  useSubmitSubjective,
  useMySaenggibu,
  useSaveSaenggibu,
  uploadSaenggibuMajor,
  getAIFeedback,
  gradeStringToNum,
  type MajorChapter,
  type MajorQuestion,
} from '../../_hooks/useMyHighMajor'
import { supabase } from '../../../../lib/supabase'

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
}

export default function Major() {
  const navigate = useNavigate()
  const location = useLocation()

  const screen = location.pathname.endsWith('chapter') ? 'chapter'
    : location.pathname.endsWith('grade') ? 'grade'
    : 'dept'

  const [deptSearch, setDeptSearch] = useState('')
  const [selMajorId, setSelMajorId] = useState<string | null>(null)
  const [selMajorName, setSelMajorName] = useState('')
  const [selGrade, setSelGrade] = useState<string>('')
  const [selChapterId, setSelChapterId] = useState<string | null>(null)
  
  // 답변 상태
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [retryMode, setRetryMode] = useState(false)
  const [retryIndex, setRetryIndex] = useState(0)
  const [objAnswers, setObjAnswers] = useState<Record<string, string>>({}) // questionId -> answer
  const [retryAnswers, setRetryAnswers] = useState<Record<string, string>>({})
  const [subjInput, setSubjInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // 생기부
  const [bioFile, setBioFile] = useState<File | null>(null)
  const [bioWaiting, setBioWaiting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // DB 조회
  const { data: majors = [] } = useMajorSeeds()
  const gradeNum = selGrade ? gradeStringToNum(selGrade) : undefined
  const { data: chapters = [] } = useMajorChapters(selMajorId || undefined, gradeNum)
  const { data: questions } = useChapterQuestions(selChapterId || undefined)
  const { data: chapterProgress } = useChapterProgress(selChapterId || undefined)
  const { data: allProgress = [] } = useMyProgress(selMajorId || undefined, gradeNum)
  const { data: saenggibu } = useMySaenggibu(selMajorId || undefined)

  // 뮤테이션
  const startChapter = useStartChapter()
  const submitObj = useSubmitObjective()
  const submitSubj = useSubmitSubjective()
  const saveSaenggibu = useSaveSaenggibu()

  const filteredMajors = majors.filter(m => m.name.includes(deptSearch))
  
  const objQuestions = questions?.objective || []
  const subjQuestion = questions?.subjective || null
  
  // 진행 정보
  const isAnsweredObj = chapterProgress?.obj_answers && Array.isArray(chapterProgress.obj_answers) && chapterProgress.obj_answers.length > 0
  const objAnswered = isAnsweredObj ? chapterProgress.obj_answers : []
  const wrongQs = useMemo(() => {
    if (!objAnswered.length || !objQuestions.length) return []
    return objAnswered
      .filter((a: any) => !a.is_correct)
      .map((a: any) => objQuestions.find(q => q.id === a.question_id))
      .filter(Boolean) as MajorQuestion[]
  }, [objAnswered, objQuestions])

  const score = objAnswered.filter((a: any) => a.is_correct).length

  // 학과 선택
  const selectMajor = (m: { id: string; name: string }) => {
    setSelMajorId(m.id)
    setSelMajorName(m.name)
    setDeptSearch('')
    navigate('/high-student/major/grade')
  }

  // 학년 선택
  const selectGrade = (g: string) => {
    setSelGrade(g)
    setCurrentQIndex(0)
    setRetryMode(false)
    setObjAnswers({})
    setSubjInput('')
    if (g === '고3') {
      setBioWaiting(false)
      setBioFile(null)
    }
    navigate('/high-student/major/chapter')
  }

  // 챕터 선택
  const selectChapter = async (chapter: MajorChapter) => {
    if (!selMajorId) return
    try {
      await startChapter.mutateAsync({
        majorId: selMajorId,
        chapterId: chapter.id,
      })
      setSelChapterId(chapter.id)
      setCurrentQIndex(0)
      setRetryMode(false)
      setObjAnswers({})
      setSubjInput('')
    } catch (e: any) {
      alert('챕터 시작 실패: ' + e.message)
    }
  }

  // 객관식 답변
  const handleObjAnswer = (questionId: string, choice: string) => {
    setObjAnswers(prev => ({ ...prev, [questionId]: choice }))
  }

  // 객관식 다음 문제 / 객관식 4개 끝나면 한꺼번에 제출
  const handleNextObj = async () => {
    if (currentQIndex < 3) {
      setCurrentQIndex(i => i + 1)
      return
    }
    // 4번째 문제까지 풀었으면 일괄 제출
    if (!chapterProgress) return
    
    const answers = objQuestions.map(q => ({
      question_id: q.id,
      user_answer: objAnswers[q.id] || '',
      is_correct: objAnswers[q.id] === q.correct_answer,
    }))
    
    try {
      await submitObj.mutateAsync({ progressId: chapterProgress.id, answers })
      setCurrentQIndex(4) // 주관식
    } catch (e: any) {
      alert('객관식 저장 실패: ' + e.message)
    }
  }

  // 주관식 제출 + AI 피드백
  const handleSubmitSubj = async () => {
    if (!subjQuestion || !chapterProgress || !subjInput.trim()) return
    setAiLoading(true)
    try {
      const aiFeedback = await getAIFeedback(subjQuestion.question_text, subjInput, selMajorName)
      await submitSubj.mutateAsync({
        progressId: chapterProgress.id,
        questionId: subjQuestion.id,
        answer: subjInput,
        aiFeedback,
      })
      setSubjInput('')
    } catch (e: any) {
      alert('주관식 저장 실패: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  // 다시 풀기
  const handleRetryAnswer = (questionId: string, choice: string) => {
    setRetryAnswers(prev => ({ ...prev, [questionId]: choice }))
  }

  // 생기부 업로드
  const handleBioUpload = async (file: File) => {
    if (!selMajorId) return
    setBioFile(file)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const pdfUrl = await uploadSaenggibuMajor(file, user.id, selMajorId)
      await saveSaenggibu.mutateAsync({ majorId: selMajorId, pdfUrl })
      setBioWaiting(true)
    } catch (e: any) {
      alert('업로드 실패: ' + e.message)
    }
  }

  // ── 1. 학과 선택 ──
  if (screen === 'dept') return (
    <div className="h-full overflow-hidden px-6 py-5 flex flex-col font-sans text-ink">
      <div className="flex-shrink-0 mb-4">
        <div className="text-[20px] font-extrabold text-ink tracking-tight mb-0.5">전체 전공</div>
        <div className="text-[12px] text-ink-muted mb-4 font-medium">
          총 <span className="text-blue-700 font-bold">{filteredMajors.length}개</span>
        </div>
        <div className="relative max-w-[360px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={deptSearch}
            onChange={e => setDeptSearch(e.target.value)}
            placeholder="학과이름 입력해 주세요."
            className="w-full h-11 border border-line rounded-full pl-10 pr-4 text-[13px] outline-none focus:border-blue-500 transition-colors font-sans bg-white"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredMajors.length === 0 ? (
          <div className="text-center py-20 text-ink-muted">
            <div className="text-5xl mb-3">🔍</div>
            <div className="text-[13px]">검색 결과가 없어요</div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-3 max-md:grid-cols-2">
            {filteredMajors.map(m => (
              <button
                key={m.id}
                onClick={() => selectMajor(m)}
                className="bg-white border border-line rounded-2xl h-[120px] relative text-left overflow-hidden hover:border-blue-300 hover:shadow-[0_6px_20px_rgba(37,99,235,0.08)] hover:-translate-y-0.5 transition-all"
              >
                <div className="absolute top-3.5 left-3.5 right-16 z-10">
                  <div className="text-[13px] font-bold text-ink leading-snug mb-1.5">{m.name}</div>
                  <div className="text-[10px] text-ink-muted leading-relaxed font-medium">객관식 120문항, 주관식 30문항</div>
                </div>
                <div className="absolute bottom-0 right-0 w-[72px] h-[88px] flex items-end justify-center pb-0.5">
                  <div className="text-[52px] leading-none opacity-[0.12]">👤</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── 2. 학년 선택 ──
  if (screen === 'grade') return (
    <div className="px-7 py-6 font-sans text-ink">
      <div className="flex items-center gap-2.5 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-ink-secondary text-base hover:bg-gray-50 transition-all"
        >
          ←
        </button>
        <div className="text-[16px] font-bold text-ink tracking-tight">전공특화문제</div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl px-6 py-5 mb-7 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center text-3xl flex-shrink-0 shadow-sm">📚</div>
        <div>
          <div className="text-[16px] font-extrabold text-ink tracking-tight">{selMajorName}</div>
          <div className="text-[12px] text-ink-secondary mt-1 font-medium">학년을 선택해주세요</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        {[
          { g: '고1', emoji: '🌱', sub: '기초 개념 다지기', desc: '챕터 30개 · 문제 150개', cls: 'from-blue-50 to-white border-blue-200', textCls: 'text-blue-700' },
          { g: '고2', emoji: '🌿', sub: '심화 개념 학습', desc: '챕터 30개 · 문제 150개', cls: 'from-emerald-50 to-white border-emerald-200', textCls: 'text-emerald-700' },
          { g: '고3', emoji: '🎯', sub: '생기부 기반 맞춤', desc: '생기부 업로드 필요', cls: 'from-amber-50 to-white border-amber-200', textCls: 'text-amber-700' },
        ].map(({ g, emoji, sub, desc, cls, textCls }) => (
          <button
            key={g}
            onClick={() => selectGrade(g)}
            className={`bg-gradient-to-br border-[1.5px] rounded-2xl p-7 text-center hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(37,99,235,0.15)] transition-all ${cls}`}
          >
            <div className="text-5xl mb-3">{emoji}</div>
            <div className={`text-[24px] font-extrabold mb-1.5 ${textCls}`}>{g}</div>
            <div className="text-[12px] text-ink-secondary mb-4 leading-relaxed font-medium">{sub}</div>
            <div className={`py-2 bg-white rounded-lg text-[12px] font-bold border ${textCls.replace('text-', 'border-')}/30`}>
              {desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // ── 3. 고3 생기부 업로드 ──
  if (screen === 'chapter' && selGrade === '고3' && saenggibu?.status !== 'ready') {
    // 업로드 전
    if (!saenggibu || saenggibu.status === 'pending') return (
      <div className="px-7 py-6 font-sans text-ink">
        <div className="flex items-center gap-2.5 mb-5">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-ink-secondary text-base hover:bg-gray-50 transition-all">←</button>
          <div className="text-[16px] font-bold text-ink tracking-tight">전공특화문제 · 고3</div>
        </div>

        <div className="max-w-[480px] mx-auto mt-12 text-center">
          <div className="text-7xl mb-10">📋</div>
          <div className="text-[22px] font-extrabold text-ink tracking-tight mb-2.5">생기부를 업로드해주세요</div>
          <div className="text-[14px] text-ink-secondary leading-relaxed mb-8">
            고3 전공특화문제는 <span className="font-bold text-ink">본인의 생활기록부</span>를 바탕으로<br />
            AI가 맞춤 질문을 만들어줘요.
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleBioUpload(f) }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={saveSaenggibu.isPending}
            className="w-full h-14 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl text-[15px] font-bold shadow-[0_8px_24px_rgba(217,119,6,0.25)] hover:shadow-[0_12px_32px_rgba(217,119,6,0.35)] transition-all mb-2.5 disabled:opacity-60"
          >
            {saveSaenggibu.isPending ? '업로드 중...' : '📎 생기부 PDF 업로드'}
          </button>
          <div className="text-[12px] text-ink-muted font-medium">PDF 파일만 업로드 가능해요</div>
        </div>
      </div>
    )

    // AI 생성 대기
    return (
      <div className="px-7 py-6 font-sans text-ink">
        <div className="flex items-center gap-2.5 mb-5">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-ink-secondary text-base hover:bg-gray-50 transition-all">←</button>
          <div className="text-[16px] font-bold text-ink tracking-tight">전공특화문제 · 고3</div>
        </div>

        <div className="max-w-[480px] mx-auto mt-12 text-center">
          <div className="text-7xl mb-4">{saenggibu.status === 'error' ? '⚠️' : '⏳'}</div>
          <div className="text-[22px] font-extrabold text-ink tracking-tight mb-4">
            {saenggibu.status === 'error' ? 'AI 생성 실패' : '업로드 완료!'}
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 mb-5 flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <div className="text-left flex-1">
              <div className="text-[13px] font-bold text-emerald-800">생기부 업로드 완료</div>
              <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                ✓ {new Date(saenggibu.saenggibu_uploaded_at || '').toLocaleString('ko-KR')}
              </div>
            </div>
          </div>
          {saenggibu.status === 'error' ? (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 text-[13px] text-red-700">
              {saenggibu.error_message || 'AI 생성 중 오류가 발생했어요. 다시 업로드해주세요.'}
            </div>
          ) : (
            <>
              <div className="text-[14px] text-ink-secondary leading-relaxed mb-5">
                <span className="font-bold text-ink">AI가 생기부를 분석하고 있어요.</span><br />
                30챕터 맞춤 문제를 생성하고 있어요.
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3.5 text-[13px] text-blue-700 font-medium">
                💡 잠시만 기다려주세요. 자동으로 새로고침돼요.
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── 4. 챕터 풀기 ──
  if (screen === 'chapter') {
    const selChapter = chapters.find(c => c.id === selChapterId) || null
    const selProgress = chapterProgress

    // 다시 풀기
    if (retryMode && selChapter) {
      const retryQ = wrongQs[retryIndex]
      if (!retryQ) return (
        <div className="px-16 py-16 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <div className="text-[22px] font-extrabold text-emerald-600 mb-2 tracking-tight">모든 틀린 문제 완료!</div>
          <div className="text-[14px] text-ink-secondary mb-7 font-medium">수고했어요!</div>
          <button
            onClick={() => { setRetryMode(false); setRetryIndex(0); setRetryAnswers({}) }}
            className="px-9 py-3 bg-ink text-white rounded-xl text-[14px] font-bold hover:bg-ink-secondary transition-all shadow-lg"
          >
            챕터로 돌아가기
          </button>
        </div>
      )
      const userAns = retryAnswers[retryQ.id]
      const answered = !!userAns
      const isCorrect = userAns === retryQ.correct_answer

      return (
        <div className="px-7 py-6 max-w-[680px] mx-auto font-sans text-ink">
          <div className="flex items-center gap-2.5 mb-5">
            <button onClick={() => { setRetryMode(false); setRetryIndex(0); setRetryAnswers({}) }} className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-ink-secondary hover:bg-gray-50 transition-all">←</button>
            <div className="text-[15px] font-bold text-ink tracking-tight">틀린 문제 다시 풀기</div>
            <div className="ml-auto text-[12px] text-ink-secondary bg-gray-100 px-3 py-1 rounded-full font-semibold">
              {retryIndex + 1} / {wrongQs.length}
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4 text-[12px] text-red-600 font-bold">
            ❌ 처음에 틀린 문제예요. 다시 풀어보세요!
          </div>

          <div className="bg-white border border-line rounded-2xl px-6 py-5 mb-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] text-ink-muted mb-2 font-bold tracking-wider">문제</div>
            <div className="text-[14px] font-semibold text-ink leading-relaxed mb-5">{retryQ.question_text}</div>

            <div className="flex flex-col gap-2.5">
              {(['A', 'B', 'C', 'D'] as const).map(letter => {
                const text = retryQ[`choice_${letter.toLowerCase()}` as keyof MajorQuestion] as string
                if (!text) return null
                const isSel = userAns === letter
                const isAns = letter === retryQ.correct_answer
                let cls = 'bg-gray-50 border-line text-ink hover:border-blue-300'
                let labelCls = 'bg-gray-200 text-ink-secondary'
                if (answered) {
                  if (isAns) { cls = 'bg-emerald-50 border-emerald-300 text-emerald-800'; labelCls = 'bg-emerald-500 text-white' }
                  else if (isSel) { cls = 'bg-red-50 border-red-300 text-red-800'; labelCls = 'bg-red-500 text-white' }
                } else if (isSel) { cls = 'bg-blue-50 border-blue-500 text-blue-700'; labelCls = 'bg-blue-500 text-white' }
                return (
                  <button
                    key={letter}
                    onClick={() => !answered && handleRetryAnswer(retryQ.id, letter)}
                    disabled={answered}
                    className={`flex items-center gap-3 px-4 py-3 border rounded-xl transition-all ${cls} ${answered ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-extrabold flex-shrink-0 ${labelCls}`}>{letter}</div>
                    <span className={`text-[13px] flex-1 text-left ${isSel ? 'font-bold' : 'font-medium'}`}>{text}</span>
                    {answered && isAns && <span>✅</span>}
                    {answered && isSel && !isAns && <span>❌</span>}
                  </button>
                )
              })}
            </div>

            {answered && (
              <div className={`mt-4 border rounded-xl px-4 py-3 text-[13px] leading-relaxed ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <span className="font-bold">💡 해설</span>　{retryQ.explanation}
              </div>
            )}
          </div>

          {answered && (
            retryIndex < wrongQs.length - 1
              ? <button onClick={() => setRetryIndex(i => i + 1)} className="w-full h-12 bg-ink text-white rounded-xl text-[14px] font-bold hover:bg-ink-secondary transition-all shadow-lg">다음 →</button>
              : <button onClick={() => { setRetryMode(false); setRetryIndex(0); setRetryAnswers({}) }} className="w-full h-12 bg-emerald-600 text-white rounded-xl text-[14px] font-bold hover:bg-emerald-700 transition-all shadow-lg">🎉 복습 완료!</button>
          )}
        </div>
      )
    }

    return (
      <div className="flex h-full overflow-hidden bg-gray-50 font-sans text-ink">
        {/* 왼쪽 챕터 사이드바 */}
        <div className="w-[220px] flex-shrink-0 bg-white border-r border-line flex flex-col overflow-hidden">
          <div className="px-4 py-4 border-b border-line">
            <button onClick={() => navigate(-1)} className="text-[11px] text-ink-muted hover:text-ink font-semibold mb-2.5 flex items-center gap-1 transition-colors">
              ← 학년 선택
            </button>
            <div className="text-[13px] font-extrabold text-ink tracking-tight mb-0.5">{selMajorName}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[11px] font-bold text-white px-2 py-0.5 rounded-full ${selGrade === '고1' ? 'bg-blue-600' : selGrade === '고2' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                {selGrade}
              </span>
              <span className="text-[11px] text-ink-muted font-medium">
                완료 {allProgress.filter(p => p.status === 'completed').length}/{chapters.length}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5">
            {chapters.length === 0 ? (
              <div className="text-center py-8 text-ink-muted text-[12px]">
                챕터 데이터가 없어요
              </div>
            ) : chapters.map(ch => {
              const prog = allProgress.find(p => p.chapter_id === ch.id)
              const isDone = prog?.status === 'completed'
              return (
                <button
                  key={ch.id}
                  onClick={() => selectChapter(ch)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg mb-0.5 transition-all text-left ${
                    selChapterId === ch.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-ink-secondary hover:bg-gray-50 font-medium'
                  }`}
                >
                  <span className="text-[12px]">{ch.title}</span>
                  <span className={`text-[14px] ${isDone ? 'text-emerald-500' : 'text-gray-300'}`}>
                    {isDone ? '✓' : '○'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 오른쪽 문제 */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selChapter ? (
            <div className="flex flex-col items-center justify-center h-full text-ink-muted">
              <div className="text-5xl mb-3">📚</div>
              <div className="text-[14px] font-bold">챕터를 선택해주세요</div>
            </div>
          ) : !questions ? (
            <div className="flex items-center justify-center h-full text-ink-muted">불러오는 중...</div>
          ) : objQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-ink-muted">
              <div className="text-5xl mb-3">📝</div>
              <div className="text-[14px] font-bold">이 챕터에는 문제가 없어요</div>
            </div>
          ) : (
            <>
              {/* 헤더 */}
              <div className="bg-white border border-line rounded-2xl px-5 py-4 mb-5 flex items-center justify-between shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
                <div>
                  <div className="text-[16px] font-extrabold text-ink tracking-tight">{selMajorName} · {selGrade} · {selChapter.title}</div>
                  <div className="text-[12px] text-ink-muted mt-1 font-medium">
                    {currentQIndex < 4 ? `객관식 ${currentQIndex + 1} / 4` : '주관식'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-2.5 rounded-full transition-all ${i < currentQIndex ? 'w-2.5 bg-emerald-500' : i === currentQIndex ? 'w-7 bg-blue-600' : 'w-2.5 bg-gray-200'}`} />
                  ))}
                  <span className="text-[12px] text-ink-muted ml-1 font-semibold">{currentQIndex + 1}/5</span>
                </div>
              </div>

              {/* 객관식 */}
              {currentQIndex < 4 && (() => {
                const q = objQuestions[currentQIndex]
                if (!q) return null
                const userAns = objAnswers[q.id]
                const answered = !!userAns
                const correct = userAns === q.correct_answer
                return (
                  <div className={`bg-white rounded-2xl px-7 py-6 shadow-[0_1px_4px_rgba(15,23,42,0.03)] border ${answered ? (correct ? 'border-emerald-300' : 'border-red-300') : 'border-line'}`}>
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className={`text-[11px] font-extrabold text-white px-2.5 py-1 rounded-full ${answered ? (correct ? 'bg-emerald-500' : 'bg-red-500') : 'bg-ink-muted'}`}>
                        Q{currentQIndex + 1}
                      </span>
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">객관식</span>
                      {answered && (
                        <span className={`text-[11px] font-bold ${correct ? 'text-emerald-600' : 'text-red-600'}`}>
                          {correct ? '✅ 정답' : '❌ 오답'}
                        </span>
                      )}
                    </div>

                    <div className="text-[15px] font-semibold text-ink leading-relaxed mb-5">{q.question_text}</div>

                    <div className="flex flex-col gap-2.5">
                      {(['A', 'B', 'C', 'D'] as const).map(letter => {
                        const text = q[`choice_${letter.toLowerCase()}` as keyof MajorQuestion] as string
                        if (!text) return null
                        const isSel = userAns === letter
                        const isAns = letter === q.correct_answer
                        let cls = 'bg-gray-50 border-line text-ink hover:border-blue-300'
                        let labelCls = 'bg-gray-200 text-ink-secondary'
                        if (answered) {
                          if (isAns) { cls = 'bg-emerald-50 border-emerald-300 text-emerald-800'; labelCls = 'bg-emerald-500 text-white' }
                          else if (isSel) { cls = 'bg-red-50 border-red-300 text-red-800'; labelCls = 'bg-red-500 text-white' }
                        } else if (isSel) { cls = 'bg-blue-50 border-blue-500 text-blue-700'; labelCls = 'bg-blue-500 text-white' }
                        return (
                          <button
                            key={letter}
                            onClick={() => !answered && handleObjAnswer(q.id, letter)}
                            disabled={answered}
                            className={`flex items-center gap-3 px-4 py-3.5 border rounded-xl transition-all ${cls} ${answered ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-extrabold flex-shrink-0 ${labelCls}`}>{letter}</div>
                            <span className={`text-[14px] flex-1 text-left ${isSel ? 'font-bold' : 'font-medium'}`}>{text}</span>
                            {answered && isAns && <span>✅</span>}
                            {answered && isSel && !isAns && <span>❌</span>}
                          </button>
                        )
                      })}
                    </div>

                    {answered && (
                      <>
                        <div className={`mt-4 border rounded-xl px-4 py-3.5 text-[13px] leading-relaxed ${correct ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                          <span className="font-bold">💡 해설</span>　{q.explanation}
                        </div>
                        <button
                          onClick={handleNextObj}
                          disabled={submitObj.isPending}
                          className="w-full h-12 bg-ink text-white rounded-xl text-[14px] font-bold mt-3.5 hover:bg-ink-secondary transition-all shadow-lg disabled:opacity-50"
                        >
                          {currentQIndex < 3 ? '다음 문제 →' : (submitObj.isPending ? '저장 중...' : '주관식 풀기 →')}
                        </button>
                      </>
                    )}
                  </div>
                )
              })()}

              {/* 주관식 */}
              {currentQIndex === 4 && subjQuestion && (
                <div className={`bg-white rounded-2xl px-7 py-6 shadow-[0_1px_4px_rgba(15,23,42,0.03)] border ${selProgress?.subj_answer ? 'border-amber-300' : 'border-line'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">주관식</span>
                    {selProgress?.subj_answer && <span className="text-[11px] text-emerald-600 font-bold">✓ 제출 완료</span>}
                  </div>

                  <div className="bg-gray-50 border border-line rounded-xl px-4 py-3.5 mb-5">
                    <div className="text-[15px] font-semibold text-ink leading-relaxed">{subjQuestion.question_text}</div>
                  </div>

                  {selProgress?.subj_answer ? (
                    <div>
                      <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 text-[13px] text-ink leading-relaxed mb-3.5">
                        {selProgress.subj_answer}
                      </div>

                      {selProgress.subj_ai_feedback ? (
                        <>
                          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-[13px] text-amber-900 leading-relaxed mb-3.5">
                            <div className="font-extrabold mb-2 text-amber-700">✨ AI 피드백</div>
                            {selProgress.subj_ai_feedback}
                          </div>

                          {wrongQs.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 flex items-center justify-between mb-3.5">
                              <div className="text-[13px] font-bold text-red-600">
                                객관식 {score}/4 · 틀린 문제 {wrongQs.length}개
                              </div>
                              <button onClick={() => { setRetryMode(true); setRetryIndex(0); setRetryAnswers({}) }} className="px-4 py-2 bg-red-500 text-white rounded-lg text-[12px] font-bold hover:bg-red-600 transition-all shadow-sm">
                                다시 풀기
                              </button>
                            </div>
                          )}

                          {chapters.findIndex(c => c.id === selChapterId) < chapters.length - 1 && (
                            <button
                              onClick={() => {
                                const idx = chapters.findIndex(c => c.id === selChapterId)
                                if (idx >= 0 && idx < chapters.length - 1) {
                                  selectChapter(chapters[idx + 1])
                                }
                              }}
                              className="w-full h-12 bg-emerald-600 text-white rounded-xl text-[14px] font-bold hover:bg-emerald-700 transition-all shadow-lg"
                            >
                              🎉 다음 챕터로 →
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5 text-[13px] text-blue-700 font-semibold flex items-center gap-2.5">
                          <div className="w-4 h-4 border-[2.5px] border-blue-500 border-t-transparent rounded-full animate-spin" />
                          AI 피드백 생성 중...
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={subjInput}
                        onChange={e => setSubjInput(e.target.value)}
                        placeholder="답변을 작성해주세요..."
                        rows={5}
                        className="w-full border border-line rounded-xl px-3.5 py-3 text-[13px] outline-none resize-y leading-relaxed focus:border-blue-500 transition-colors font-sans"
                      />
                      <button
                        onClick={handleSubmitSubj}
                        disabled={!subjInput.trim() || aiLoading || submitSubj.isPending}
                        className={`w-full h-12 rounded-xl text-[14px] font-bold mt-3 transition-all ${subjInput.trim() ? 'bg-ink text-white hover:bg-ink-secondary shadow-lg' : 'bg-gray-200 text-ink-muted cursor-not-allowed'}`}
                      >
                        {aiLoading || submitSubj.isPending ? '제출 중...' : '제출하기'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return null
}