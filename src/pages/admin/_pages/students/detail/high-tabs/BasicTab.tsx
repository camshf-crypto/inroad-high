// src/pages/admin/_pages/.../BasicTab.tsx
// 💎 기본 인성질문 어드민용 - 인성 전용 분석 (스피치 구조 + 진로 컨셉)
// AI 분석: basic-analyze(1차) / basic-feedback(2차)

import { useState, useEffect } from 'react'
import {
  useAnswerAnalyses,
  useAnswerFollowups,
  useSendFirstFeedback,
  useSendFinalFeedback,
  useAddFollowup,
  useGenerateAIFollowups,
  useSaveSelectedFollowups,
  useDeleteFollowup,
  useBasicQuestionsWithAnswer,
  useAIAnalyzeBasicAnswer,
  useAIGenerateBasicFeedback,
  useAISuggestBasicFeedback,
  getMockBasicAnalysis,
  getBasicStep,
  inferQuestionType,
  AI_CALL_LIMITS,
  type BasicAnalysisData,
  type BasicSecondData,
} from '../../../../_hooks/useBasicQuestions'
import { supabase } from '@/lib/supabase'

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
}

const TYPE_COLOR: Record<string, any> = {
  '공통': { bg: THEME.accentBg, color: THEME.accent, border: THEME.accentBorder },
  '전공': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '인성': { bg: '#FFF3E8', color: '#D97706', border: '#FDBA74' },
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']
const AI_PANEL_WIDTH = 440

const matchColor = (level?: string) =>
  level === '높음'
    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
    : level === '보통'
    ? 'bg-amber-100 text-amber-700 border border-amber-300'
    : 'bg-red-100 text-red-700 border border-red-300'

export default function BasicTab({ student }: { student: any }) {
  const studentId: string = student.id

  const [selQ, setSelQ] = useState<any | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiData, setAiData] = useState<BasicAnalysisData | null>(null)
  const [secondData, setSecondData] = useState<BasicSecondData | null>(null)
  const [aiTab, setAiTab] = useState<'first' | 'second'>('first')
  const [secondAiLoading, setSecondAiLoading] = useState(false)

  const [showTailModal, setShowTailModal] = useState(false)
  const [tailInput, setTailInput] = useState('')
  const [showAiTailModal, setShowAiTailModal] = useState(false)
  const [aiTails, setAiTails] = useState<string[]>([])
  const [selectedAiTails, setSelectedAiTails] = useState<number[]>([])
  const [aiSuggestLoading, setAiSuggestLoading] = useState<'first' | 'final' | null>(null)

  const [concept, setConcept] = useState<any>(null)

  useEffect(() => {
    if (!studentId) return
    supabase
      .from('student_concept')
      .select('type_code, type_name, major, career, keywords, custom_goal')
      .eq('student_id', studentId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setConcept(data))
  }, [studentId])

  const { data: curQuestions = [], isLoading: loadingQ } = useBasicQuestionsWithAnswer(studentId)

  const selAnswerId = selQ?.answer?.id
  const { data: analyses = [] } = useAnswerAnalyses(selAnswerId)
  const { data: followups = [] } = useAnswerFollowups(selAnswerId)

  const sendFirst = useSendFirstFeedback()
  const sendFinal = useSendFinalFeedback()
  const addTail = useAddFollowup()
  const genAITails = useGenerateAIFollowups()
  const saveAITails = useSaveSelectedFollowups()
  const deleteTail = useDeleteFollowup()

  const aiAnalyze = useAIAnalyzeBasicAnswer()
  const aiCompare = useAIGenerateBasicFeedback()
  const aiSuggestFeedback = useAISuggestBasicFeedback()

  useEffect(() => {
    setShowAiPanel(false)
    setAiData(null)
    setSecondData(null)
  }, [selQ])

  const step = getBasicStep(selQ?.answer || null, analyses)
  const round1 = analyses.find(a => a.round === 1)
  const round2 = analyses.find(a => a.round === 2)
  const round1CallCount = round1?.ai_call_count || 0
  const round2CallCount = round2?.ai_call_count || 0

  const openAiAnalysis = async (tab: 'first' | 'second' = 'first') => {
    if (!selQ) return
    setShowAiPanel(true)
    setAiTab(tab)

    if (tab === 'first') {
      if (!selQ.answer?.student_answer) {
        alert('학생이 먼저 답변을 제출해야 합니다.')
        return
      }
      // 이미 분석된 게 있으면 재사용
      if (round1?.ai_analysis && round1.ai_analysis.structureCheck) {
        setAiData(round1.ai_analysis)
        return
      }
      setAiLoading(true)
      try {
        const result = await aiAnalyze.mutateAsync({
          questionId: selQ.id,
          question: selQ.question,
          studentAnswer: selQ.answer.student_answer,
          answerId: selQ.answer.id,
          studentId,
        })
        setAiData(result)
      } catch (e: any) {
        console.error('AI 1차 분석 실패:', e)
        alert('AI 분석 실패:\n' + (e?.message || '알 수 없는 오류'))
        setAiData(getMockBasicAnalysis())
      } finally {
        setAiLoading(false)
      }
    } else {
      if (!round2?.revised_answer) {
        alert('학생이 2차 답변을 먼저 제출해야 합니다.')
        return
      }
      if (!selQ.answer?.student_answer) {
        alert('1차 답변이 없습니다.')
        return
      }
      // 이미 2차 분석된 게 있으면 재사용
      if (round2?.ai_analysis && round2.ai_analysis.beforeDistribution) {
        setSecondData(round2.ai_analysis)
        return
      }
      setSecondAiLoading(true)
      try {
        const compareResult = await aiCompare.mutateAsync({
          questionId: selQ.id,
          question: selQ.question,
          firstAnswer: selQ.answer.student_answer,
          secondAnswer: round2.revised_answer,
          firstAnalysisJson: round1?.ai_analysis || aiData,
          studentId,
          answerId: selQ.answer.id,
        })
        setSecondData(compareResult)
      } catch (e: any) {
        console.error('AI 2차 비교 실패:', e)
        alert('AI 비교 분석 실패:\n' + (e?.message || '알 수 없는 오류'))
      } finally {
        setSecondAiLoading(false)
      }
    }
  }

  const generateAIFeedback = async () => {
    if (!selQ?.answer?.student_answer) return
    const type = aiTab === 'first' ? 'first' : 'final'
    const hasAnalysis = aiTab === 'first'
      ? !!(round1?.ai_analysis || aiData)
      : !!(round2?.ai_analysis || secondData)
    if (!hasAnalysis) {
      alert('AI 분석을 먼저 실행해주세요.')
      return
    }
    const key = type === 'first' ? String(selQ.id) : `${selQ.id}_final`
    setAiSuggestLoading(type)
    try {
      const draft = await aiSuggestFeedback.mutateAsync({
        questionId: selQ.id,
        question: selQ.question,
        studentAnswer: selQ.answer.student_answer,
        secondAnswer: type === 'final' ? round2?.revised_answer || '' : undefined,
        aiAnalysis: aiTab === 'first' ? aiData : secondData,
        feedbackType: type,
        studentId,
      })
      setFeedback(prev => ({ ...prev, [key]: draft }))
      alert(`✏️ AI가 ${type === 'first' ? '1차' : '최종'} 피드백을 작성했어요!\n\n${type === 'first' ? 'Step 2' : 'Step 4'}에서 확인하고 수정 후 전달해주세요.`)
    } catch (e: any) {
      console.error('AI 답변 작성 실패:', e)
      alert('AI 답변 작성 실패:\n' + (e?.message || '알 수 없는 오류'))
    } finally {
      setAiSuggestLoading(null)
    }
  }

  const sendFeedback = (type: 'first' | 'final') => {
    if (!selQ?.answer) { alert('학생이 먼저 답변을 제출해야 해요.'); return }
    const key = type === 'first' ? String(selQ.id) : `${selQ.id}_final`
    const val = (feedback[key] || '').trim()
    if (!val) return
    const mutation = type === 'first' ? sendFirst : sendFinal
    mutation.mutate({ answerId: selQ.answer.id, studentId, feedback: val }, {
      onSuccess: () => setFeedback(prev => ({ ...prev, [key]: '' })),
    })
  }

  const submitTail = () => {
    if (!selQ?.answer || !tailInput.trim()) return
    addTail.mutate({
      answer_id: selQ.answer.id, student_id: studentId, text: tailInput.trim(), publish_now: true,
    }, { onSuccess: () => { setTailInput(''); setShowTailModal(false) } })
  }

  const openAiTailModal = () => {
    if (!selQ?.answer) return
    setShowAiTailModal(true)
    setAiTails([])
    setSelectedAiTails([])
    genAITails.mutate({
      answer_id: selQ.answer.id,
      student_answer: selQ.answer.student_answer,
      question_text: selQ.question,
    }, { onSuccess: (data) => setAiTails(data) })
  }

  const deliverAiTails = () => {
    if (!selQ?.answer || selectedAiTails.length === 0) return
    const selected = selectedAiTails.map(i => aiTails[i])
    saveAITails.mutate({
      answer_id: selQ.answer.id, student_id: studentId, questions: selected, publish_now: true,
    }, {
      onSuccess: () => { setShowAiTailModal(false); setAiTails([]); setSelectedAiTails([]) },
    })
  }

  const currentRoundHasAnalysis = aiTab === 'first'
    ? !!(round1?.ai_analysis || aiData)
    : !!(round2?.ai_analysis || secondData)
  const currentRoundFeedbackDone = aiTab === 'first'
    ? !!round1?.teacher_feedback
    : !!round2?.teacher_feedback

  return (
    <div
      className="flex flex-col gap-3 h-full overflow-hidden"
      style={{ paddingRight: showAiPanel ? AI_PANEL_WIDTH + 16 : 0, transition: 'padding-right 0.2s ease' }}
    >
      {/* 진로 컨셉 카드 */}
      {concept && concept.type_name && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border border-blue-200 rounded-xl px-4 py-2.5 flex-shrink-0">
          <span className="text-2xl">🎯</span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: THEME.accentDark }}>학생 진로 컨셉</div>
            <div className="flex items-center gap-2 flex-wrap text-[12px]">
              <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                {concept.type_name}
                {concept.type_code && <span className="text-gray-400 ml-1">({concept.type_code}형)</span>}
              </span>
              <span className="text-gray-400">·</span>
              <span className="font-semibold text-gray-900">📚 {concept.major}</span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-600">💼 {concept.career}</span>
              {Array.isArray(concept.keywords) && concept.keywords.length > 0 && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="font-semibold" style={{ color: THEME.accent }}>
                    {concept.keywords.map((k: string) => `#${k}`).join(' ')}
                  </span>
                </>
              )}
            </div>
            {concept.custom_goal && (
              <div className="text-[11px] text-gray-600 mt-1 italic">📝 {concept.custom_goal}</div>
            )}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex gap-1.5 flex-shrink-0 items-center">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: THEME.accent }}>
          💎 기본 인성질문 · {curQuestions.length}개
        </span>
        <span className="text-[10px] text-gray-400 font-medium">모든 대학 공통</span>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* 왼쪽 질문 목록 */}
        <div className="w-[300px] flex-shrink-0 bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
            <div className="text-[14px] font-extrabold text-gray-900 tracking-tight">💎 기본 인성질문</div>
            <div className="text-[11px] font-semibold text-gray-500 mt-0.5">모든 대학 공통</div>
            <div className="text-[11px] font-medium text-gray-500 mt-1.5 leading-[1.7]">
              총 <span className="font-bold" style={{ color: THEME.accent }}>{curQuestions.length}개</span><br />
              답변완료 <span className="text-green-600 font-bold">{curQuestions.filter((q: any) => q.answer?.student_answer).length}개</span> ·
              미답변 <span className="text-amber-600 font-bold">{curQuestions.filter((q: any) => !q.answer?.student_answer).length}개</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {loadingQ ? (
              <div className="text-center py-10 text-gray-400 text-[12px]">불러오는 중...</div>
            ) : curQuestions.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-3xl mb-2">📝</div>
                <div className="text-[12px] font-medium">기본 인성질문이 없어요.</div>
              </div>
            ) : curQuestions.map((q: any, i: number) => {
              const qType = inferQuestionType(q.question)
              const tc = TYPE_COLOR[qType]
              const isSelected = selQ?.id === q.id
              const isAnswered = !!q.answer?.student_answer
              return (
                <button key={q.id}
                  onClick={() => { setSelQ(q); setShowAiPanel(false); setAiData(null); setSecondData(null) }}
                  className="w-full rounded-xl px-3.5 py-3 mb-2 text-left transition-all"
                  style={{
                    border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                    background: isSelected ? THEME.accentBg : '#fff',
                    boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                  }}>
                  <div className="flex gap-1 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: THEME.accentDark, background: '#fff', border: `1px solid ${THEME.accentBorder}60` }}>Q{i + 1}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}60` }}>{qType}</span>
                  </div>
                  <div className="text-[12px] font-semibold text-gray-900 leading-[1.5] mb-1.5 line-clamp-3">{q.question}</div>
                  {isAnswered
                    ? <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✓ 답변완료</span>
                    : <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">⏳ 미답변</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* 가운데 패널 */}
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden min-w-0">
          {!selQ ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
              <div className="text-4xl">💎</div>
              <div className="text-[14px] font-bold text-gray-500">질문을 선택해주세요</div>
              <div className="text-[12px] font-medium">왼쪽에서 기본 인성질문을 클릭하면 상세 내용을 볼 수 있어요</div>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="text-[14px] font-extrabold text-gray-900 tracking-tight">Q{curQuestions.findIndex((q: any) => q.id === selQ.id) + 1}</div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{
                        background: TYPE_COLOR[inferQuestionType(selQ.question)].bg,
                        color: TYPE_COLOR[inferQuestionType(selQ.question)].color,
                        border: `1px solid ${TYPE_COLOR[inferQuestionType(selQ.question)].border}60`,
                      }}>
                      {inferQuestionType(selQ.question)}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    {selQ.answer?.student_answer && (
                      <button
                        onClick={() => { if (showAiPanel) { setShowAiPanel(false); setAiData(null) } else openAiAnalysis('first') }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border"
                        style={{ background: showAiPanel ? THEME.accent : THEME.accentBg, color: showAiPanel ? '#fff' : THEME.accent, borderColor: THEME.accent }}>
                        ✨ AI 분석 {showAiPanel ? '닫기' : '보기'}
                      </button>
                    )}
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full"
                      style={{
                        background: selQ.answer?.student_answer ? '#ECFDF5' : '#FFF3E8',
                        color: selQ.answer?.student_answer ? '#059669' : '#D97706',
                        border: `1px solid ${selQ.answer?.student_answer ? '#6EE7B7' : '#FDBA74'}`,
                      }}>
                      {selQ.answer?.student_answer ? '✓ 답변완료' : '⏳ 미답변'}
                    </span>
                  </div>
                </div>

                <div className="flex">
                  {STEP_LABELS.map((label, i) => {
                    const stepNum = i + 1
                    const isDone = stepNum < step
                    const isOn = stepNum === step
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                        {i < 4 && <div className="absolute top-[11px] left-[55%] w-[90%] h-0.5 z-0" style={{ background: isDone ? '#059669' : '#E5E7EB' }} />}
                        <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-extrabold z-10 relative"
                          style={{
                            background: isDone ? '#059669' : isOn ? THEME.accent : '#F3F4F6',
                            color: isDone || isOn ? '#fff' : '#9CA3AF',
                            border: `2px solid ${isDone ? '#059669' : isOn ? THEME.accent : '#E5E7EB'}`,
                          }}>
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div className="text-[10px] whitespace-nowrap" style={{ color: isDone ? '#059669' : isOn ? THEME.accentDark : '#9CA3AF', fontWeight: isOn ? 700 : 500 }}>{label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">📌 기본 인성 질문</div>
                  <div className="text-[14px] font-bold text-gray-900 leading-[1.6]">{selQ.question}</div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">💬 답변 · 피드백 히스토리</div>
                  <div className="flex flex-col gap-4">

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 1</span>
                        <span className="text-[11px] font-semibold text-gray-500">학생 첫 답변</span>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] font-medium text-gray-900 leading-[1.8] whitespace-pre-wrap">
                        {selQ.answer?.student_answer || <span className="text-gray-400">아직 학생이 답변을 작성하지 않았어요.</span>}
                      </div>
                    </div>

                    {selQ.answer?.student_answer && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>Step 2</span>
                          <span className="text-[11px] font-semibold text-gray-500">선생님 1차 피드백</span>
                        </div>
                        {round1?.teacher_feedback ? (
                          <div className="rounded-lg px-3 py-2.5 text-[13px] font-medium leading-[1.8] whitespace-pre-wrap" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60`, color: THEME.accentDark }}>
                            {round1.teacher_feedback}
                          </div>
                        ) : (
                          <>
                            <textarea value={feedback[String(selQ.id)] || ''}
                              onChange={e => setFeedback(prev => ({ ...prev, [String(selQ.id)]: e.target.value }))}
                              placeholder="학생 답변에 대한 피드백을 작성하거나, 우측 'AI 분석 보기' 후 'AI 답변 작성하기' 버튼 활용..."
                              rows={6}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[12px] font-medium outline-none resize-y leading-[1.7]" />
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => sendFeedback('first')} disabled={sendFirst.isPending || !(feedback[String(selQ.id)] || '').trim()}
                                className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:opacity-50" style={{ background: THEME.accent }}>
                                {sendFirst.isPending ? '전달 중...' : '📤 1차 피드백 전달'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {round1?.teacher_feedback && (
                      <div>
                        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 3</span>
                            <span className="text-[11px] font-semibold text-gray-500">학생 업그레이드 답변</span>
                          </div>
                          {round2?.revised_answer && (
                            <button onClick={() => { if (showAiPanel && aiTab === 'second') { setShowAiPanel(false); setSecondData(null) } else openAiAnalysis('second') }}
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border"
                              style={{ background: showAiPanel && aiTab === 'second' ? THEME.accent : THEME.accentBg, color: showAiPanel && aiTab === 'second' ? '#fff' : THEME.accent, borderColor: THEME.accent }}>
                              ✨ 2차 AI 분석 {showAiPanel && aiTab === 'second' ? '닫기' : '보기'}
                            </button>
                          )}
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] font-medium text-gray-900 leading-[1.8] whitespace-pre-wrap">
                          {round2?.revised_answer || <span className="text-gray-400">학생이 아직 업그레이드 답변을 작성하지 않았어요.</span>}
                        </div>
                      </div>
                    )}

                    {round2?.revised_answer && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-extrabold text-white bg-green-600 px-2 py-0.5 rounded-full">Step 4</span>
                          <span className="text-[11px] font-semibold text-gray-500">선생님 최종 피드백</span>
                        </div>
                        {round2.teacher_feedback ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-[13px] font-medium text-green-800 leading-[1.8] whitespace-pre-wrap">{round2.teacher_feedback}</div>
                        ) : (
                          <>
                            <textarea value={feedback[`${selQ.id}_final`] || ''}
                              onChange={e => setFeedback(prev => ({ ...prev, [`${selQ.id}_final`]: e.target.value }))}
                              placeholder="업그레이드된 답변에 대한 최종 피드백을 작성하거나, 우측 '2차 AI 분석' 후 'AI 답변 작성하기' 버튼 활용..."
                              rows={6}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[12px] font-medium outline-none resize-y leading-[1.7]" />
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => sendFeedback('final')} disabled={sendFinal.isPending || !(feedback[`${selQ.id}_final`] || '').trim()}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] font-bold disabled:opacity-50">
                                {sendFinal.isPending ? '전달 중...' : '✓ 최종 피드백 전달'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: step >= 4 ? THEME.accent : '#6B7280' }}>Step 5</span>
                        <span className="text-[11px] font-semibold text-gray-500">꼬리질문</span>
                        <div className="ml-auto flex gap-1.5">
                          <button onClick={() => setShowTailModal(true)} disabled={!selQ.answer}
                            className="px-2.5 py-1 bg-white border rounded-md text-[11px] font-bold transition-all disabled:opacity-50" style={{ color: THEME.accent, borderColor: THEME.accent }}>+ 직접 추가</button>
                          <button onClick={openAiTailModal} disabled={!selQ.answer?.student_answer}
                            className="px-2.5 py-1 text-white rounded-md text-[11px] font-bold transition-all disabled:opacity-50" style={{ background: THEME.accent }}>✨ AI 생성</button>
                        </div>
                      </div>
                      {followups.length === 0 ? (
                        <div className="text-center py-3 text-[12px] text-gray-400 font-medium bg-gray-50 rounded-lg">꼬리질문이 없어요.</div>
                      ) : followups.map((fu, i) => (
                        <div key={fu.id} className="bg-gray-50 rounded-lg mb-1.5 p-2.5 border border-gray-200">
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{ color: THEME.accentDark, background: '#fff', border: `1px solid ${THEME.accentBorder}60` }}>꼬리 {i + 1}</span>
                            <div className="flex-1 text-[12px] font-medium text-gray-900 leading-[1.5]">{fu.teacher_edited_question || fu.ai_generated_question}</div>
                            <button onClick={() => { if (window.confirm('꼬리질문 삭제?')) deleteTail.mutate(fu.id) }} className="px-2 py-1 text-[10px] text-red-500 bg-white border border-red-200 rounded hover:bg-red-50">삭제</button>
                          </div>
                          {fu.student_answer && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="text-[10px] font-bold text-green-600 mb-1">학생 답변</div>
                              <div className="text-[12px] text-gray-900 leading-[1.6] whitespace-pre-wrap">{fu.student_answer}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 우측 AI 분석 패널 */}
      {showAiPanel && selQ && (
        <div className="bg-white border-l border-gray-200 flex flex-col"
          style={{ position: 'fixed', top: 50, right: 0, bottom: 0, width: AI_PANEL_WIDTH, boxShadow: '-4px 0 16px rgba(0,0,0,0.05)', zIndex: 90 }}>
          <div className="px-5 py-3.5 border-b border-gray-200 flex-shrink-0 flex items-center justify-between" style={{ background: THEME.accentBg }}>
            <div>
              <div className="text-[14px] font-extrabold tracking-tight" style={{ color: THEME.accentDark }}>✨ AI 분석</div>
              <div className="text-[11px] font-medium text-gray-500 mt-0.5">{student.name} · Q{curQuestions.findIndex((q: any) => q.id === selQ.id) + 1} (기본 인성)</div>
            </div>
            <button onClick={() => { setShowAiPanel(false); setAiData(null); setSecondData(null) }} className="text-gray-500 text-lg w-7 h-7 flex items-center justify-center rounded-md bg-white hover:bg-gray-50">✕</button>
          </div>

          <div className="flex border-b border-gray-200 flex-shrink-0">
            <button onClick={() => { setAiTab('first'); openAiAnalysis('first') }}
              className="flex-1 py-3 text-center text-[12px] transition-all"
              style={{ fontWeight: aiTab === 'first' ? 700 : 500, color: aiTab === 'first' ? THEME.accent : '#6B7280', borderBottom: `2px solid ${aiTab === 'first' ? THEME.accent : 'transparent'}` }}>
              <div>🎤 1차 답변 분석</div>
              <div className="text-[9px] text-gray-400 mt-0.5 font-medium">{round1CallCount}/{AI_CALL_LIMITS.ROUND_1}회 사용</div>
            </button>
            <button onClick={() => { if (round2?.revised_answer) { setAiTab('second'); openAiAnalysis('second') } }} disabled={!round2?.revised_answer}
              className="flex-1 py-3 text-center text-[12px] transition-all disabled:cursor-not-allowed"
              style={{ fontWeight: aiTab === 'second' ? 700 : 500, color: !round2?.revised_answer ? '#D1D5DB' : aiTab === 'second' ? THEME.accent : '#6B7280', borderBottom: `2px solid ${aiTab === 'second' ? THEME.accent : 'transparent'}` }}>
              <div>📈 2차 답변 분석</div>
              <div className="text-[9px] text-gray-400 mt-0.5 font-medium">{!round2?.revised_answer ? '업그레이드 필요' : `${round2CallCount}/${AI_CALL_LIMITS.ROUND_2}회 사용`}</div>
            </button>
          </div>

          {/* ───── 1차 분석 ───── */}
          {aiTab === 'first' && (
            aiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
                <div className="text-4xl animate-pulse">✨</div>
                <div className="text-[13px]">AI가 분석 중이에요...</div>
              </div>
            ) : !aiData ? (
              <div className="flex-1 flex items-center justify-center text-[13px] text-gray-400 px-5 text-center leading-[1.7]">
                AI 분석을 시작하려면<br />위쪽 "✨ AI 분석 보기" 버튼을 눌러주세요
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

                {/* 🎤 스피치 구조 분석 */}
                {aiData.structureCheck && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="text-[13px] font-extrabold mb-1 flex items-center gap-1.5" style={{ color: THEME.accentDark }}>
                      🎤 스피치 구조 분석
                    </div>
                    <div className="text-[11px] text-gray-500 mb-3">
                      <span className="font-bold" style={{ color: THEME.accent }}>{aiData.structureCheck.speechType}</span> 유형 기준으로 답변 구조를 분석했어요
                    </div>

                    <div className="flex items-center gap-2 mb-3.5">
                      <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${matchColor(aiData.structureCheck.matchLevel)}`}>
                        구조 충실도: {aiData.structureCheck.matchLevel} ({aiData.structureCheck.score}점)
                      </span>
                    </div>

                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-emerald-700 mb-1.5">✓ 잘 들어간 구조 요소</div>
                      <div className="flex flex-col gap-1">
                        {aiData.structureCheck.covered.map((c, i) => (
                          <div key={i} className="text-[12px] text-gray-900 leading-[1.6] px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md">{c}</div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-red-600 mb-1.5">⚠️ 빠졌거나 부족한 요소</div>
                      <div className="flex flex-col gap-1">
                        {aiData.structureCheck.missing.map((m, i) => (
                          <div key={i} className="text-[12px] text-gray-900 leading-[1.6] px-3 py-2 bg-red-50 border border-red-200 rounded-md">{m}</div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-gray-700 mb-1.5">📋 구조 종합 피드백</div>
                      <div className="text-[12px] text-gray-900 leading-[1.7] px-3 py-2.5 bg-white border border-gray-200 rounded-md">{aiData.structureCheck.structureFeedback}</div>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold mb-1.5" style={{ color: THEME.accent }}>💡 구조에 맞게 보완하는 법</div>
                      <div className="text-[12px] text-gray-900 leading-[1.7] px-3 py-2.5 rounded-md" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>{aiData.structureCheck.improvement}</div>
                    </div>
                  </div>
                )}

                {/* 🎯 진로 컨셉 일치 검증 */}
                {aiData.conceptCheck && (
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
                    <div className="text-[13px] font-extrabold text-violet-700 mb-1 flex items-center gap-1.5">🎯 진로 컨셉 일치 검증</div>
                    <div className="text-[11px] text-gray-500 mb-3">학생의 진로 유형과 답변의 정합성을 분석했어요</div>

                    <div className="flex items-center gap-2 mb-3.5">
                      <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${matchColor(aiData.conceptCheck.matchLevel)}`}>
                        {aiData.conceptCheck.isAligned ? '✓' : '✗'} 컨셉 일치도: {aiData.conceptCheck.matchLevel}
                      </span>
                    </div>

                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-emerald-700 mb-1.5">💚 컨셉과 일치하는 부분</div>
                      <div className="text-[12px] text-gray-900 leading-[1.7] px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-md">{aiData.conceptCheck.alignmentReason}</div>
                    </div>
                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-red-600 mb-1.5">⚠️ 컨셉과 어긋나거나 부족한 부분</div>
                      <div className="text-[12px] text-gray-900 leading-[1.7] px-3 py-2.5 bg-red-50 border border-red-200 rounded-md">{aiData.conceptCheck.misalignment}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-violet-700 mb-1.5">💡 컨셉에 맞게 보완하는 방법</div>
                      <div className="text-[12px] text-gray-900 leading-[1.7] px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-md">{aiData.conceptCheck.improvement}</div>
                    </div>
                  </div>
                )}

                {/* 사유하는 질문 */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-[13px] font-extrabold text-gray-900 mb-1">💬 사유하는 질문</div>
                  <div className="text-[11px] text-gray-500 mb-2.5">답변을 깊이 있게 만들 후속 질문이에요.</div>
                  <div className="flex flex-col gap-2">
                    {aiData.tailSuggestions.map((t, i) => (
                      <div key={i} className="flex gap-2 items-start px-3 py-2 bg-gray-50 rounded-lg">
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{ color: THEME.accentDark, background: THEME.accentBg }}>{i + 1}</span>
                        <span className="text-[12px] text-gray-900 leading-[1.6]">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 종합 분석 */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-[13px] font-extrabold text-gray-900 mb-1">📊 AI 종합 분석</div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mt-2 mb-3.5">
                    <div className="text-[11px] font-bold text-amber-800 mb-1">■ 평가 요약</div>
                    <div className="text-[12px] text-amber-800 leading-[1.7]">{aiData.summary}</div>
                  </div>
                  <div className="mb-3.5">
                    <div className="text-[12px] font-extrabold text-green-600 mb-2">💪 강점 포인트</div>
                    {aiData.strengths.map((s, i) => (
                      <div key={i} className="text-[12px] text-gray-900 leading-[1.6] px-3 py-1.5 bg-green-50 border border-green-200 rounded-md mb-1.5">{s}</div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[12px] font-extrabold text-red-500 mb-2">⚡ 개선 포인트</div>
                    {aiData.improvements.map((s, i) => (
                      <div key={i} className="text-[12px] text-gray-900 leading-[1.6] px-3 py-1.5 bg-red-50 border border-red-200 rounded-md mb-1.5">{s}</div>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}

          {/* ───── 2차 분석 ───── */}
          {aiTab === 'second' && (
            secondAiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
                <div className="text-4xl animate-pulse">✨</div>
                <div className="text-[13px]">AI가 2차 답변을 분석 중이에요...</div>
              </div>
            ) : !secondData ? (
              <div className="flex-1 flex items-center justify-center text-[13px] text-gray-400 px-5 text-center leading-[1.7]">
                2차 분석을 시작하려면<br />Step 3의 "✨ 2차 AI 분석 보기" 버튼을 눌러주세요
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="text-[13px] font-extrabold text-green-800 mb-1">✅ 1차 vs 2차 구조 충족도 비교</div>
                  <div className="text-[11px] text-gray-500 mb-3.5">스피치 구조 요소별로 1차 → 2차 답변의 충족도 변화예요.</div>
                  {secondData.beforeDistribution.map((b, i) => {
                    const after = secondData.afterDistribution.find(a => a.factorCode === b.factorCode)
                    const diff = (after?.distribution || 0) - b.distribution
                    return (
                      <div key={i} className="mb-3 bg-white rounded-lg p-3 border border-green-200">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[12px] font-bold text-gray-900">{b.factorName}</span>
                          <span className="text-[11px] font-extrabold" style={{ color: diff > 0 ? '#059669' : diff < 0 ? '#EF4444' : '#6B7280' }}>
                            {diff > 0 ? `▲ +${diff}%` : diff < 0 ? `▼ ${diff}%` : '변동없음'}
                          </span>
                        </div>
                        <div className="mb-1.5">
                          <div className="text-[10px] text-gray-400 mb-0.5">1차 · {b.distribution}%</div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${b.distribution}%`, background: THEME.accentBorder }} />
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 mb-0.5">2차 · {after?.distribution || 0}%</div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-green-600" style={{ width: `${after?.distribution || 0}%` }} />
                          </div>
                        </div>
                        {after?.evidence && <div className="text-[11px] text-gray-500 mt-2 leading-[1.5]">→ {after.evidence}</div>}
                      </div>
                    )
                  })}
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-[13px] font-extrabold text-gray-900 mb-1">✅ 구조 코멘트</div>
                  <div className="rounded-lg px-3 py-3 text-[13px] leading-[1.8] mt-2" style={{ background: THEME.accentBg, color: THEME.accentDark, border: `1px solid ${THEME.accentBorder}60` }}>
                    {secondData.structureComment}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-[13px] font-extrabold text-gray-900 mb-1">✅ 모범 연습 답변</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-[13px] text-gray-900 leading-[1.9] italic mt-2">
                    "{secondData.practiceAnswer}"
                  </div>
                </div>
              </div>
            )
          )}

          {currentRoundHasAnalysis && !currentRoundFeedbackDone && (
            <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0" style={{ background: '#FAFBFC' }}>
              <button onClick={generateAIFeedback} disabled={aiSuggestLoading !== null}
                className="w-full py-3 text-white rounded-lg text-[13px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: aiSuggestLoading !== null ? '#BAC8FF' : THEME.accent }}>
                {aiSuggestLoading !== null ? '✨ AI가 답변 작성 중...' : `✏️ 선생님 ${aiTab === 'first' ? '1차' : '최종'} 답변 작성하기`}
              </button>
              <div className="text-[10px] text-gray-400 mt-1.5 text-center leading-[1.5]">AI가 분석 결과를 토대로 친근한 코치 말투로 작성해요</div>
            </div>
          )}

          {currentRoundFeedbackDone && (
            <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0" style={{ background: '#ECFDF5' }}>
              <div className="text-[12px] text-green-600 text-center font-semibold">✓ 이미 {aiTab === 'first' ? '1차' : '최종'} 피드백이 작성되었어요</div>
            </div>
          )}
        </div>
      )}

      {/* 꼬리질문 직접 추가 모달 */}
      {showTailModal && (
        <div onClick={() => setShowTailModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(15, 23, 42, 0.55)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-7 w-[460px]">
            <div className="text-[18px] font-extrabold text-gray-900 mb-1">✏️ 꼬리질문 추가</div>
            <div className="text-[12px] text-gray-500 mb-4">학생에게 추가로 물어볼 꼬리질문을 작성해요.</div>
            <textarea value={tailInput} onChange={e => setTailInput(e.target.value)} placeholder="꼬리질문을 입력해주세요..." rows={4} autoFocus
              className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-[13px] outline-none resize-none leading-[1.7] mb-4" />
            <div className="flex gap-2">
              <button onClick={() => { setShowTailModal(false); setTailInput('') }} className="flex-1 h-11 bg-white text-gray-500 border border-gray-200 rounded-lg text-[13px] font-semibold hover:bg-gray-50">취소</button>
              <button onClick={submitTail} disabled={!tailInput.trim() || addTail.isPending} className="flex-1 h-11 rounded-lg text-[13px] font-bold disabled:opacity-50"
                style={{ background: tailInput.trim() ? THEME.accent : '#E5E7EB', color: tailInput.trim() ? '#fff' : '#9CA3AF' }}>
                {addTail.isPending ? '추가중...' : '추가하고 게시'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 꼬리질문 모달 */}
      {showAiTailModal && (
        <div onClick={() => setShowAiTailModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(15, 23, 42, 0.55)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-7 w-[500px]">
            <div className="text-[18px] font-extrabold text-gray-900 mb-1">✨ AI 꼬리질문 생성</div>
            <div className="text-[12px] text-gray-500 mb-5">AI가 답변 내용을 분석해서 꼬리질문을 만들었어요. 전달할 질문을 선택해주세요.</div>
            {genAITails.isPending ? (
              <div className="text-center py-10 text-gray-400 text-[13px]"><div className="text-3xl mb-3 animate-pulse">✨</div>AI가 꼬리질문을 생성 중이에요...</div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {aiTails.map((t, i) => (
                  <button key={i} onClick={() => setSelectedAiTails(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                    className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-left transition-all"
                    style={{ border: `1px solid ${selectedAiTails.includes(i) ? THEME.accent : '#E5E7EB'}`, background: selectedAiTails.includes(i) ? THEME.accentBg : '#fff' }}>
                    <div className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ border: `2px solid ${selectedAiTails.includes(i) ? THEME.accent : '#D1D5DB'}`, background: selectedAiTails.includes(i) ? THEME.accent : '#fff' }}>
                      {selectedAiTails.includes(i) && <span className="text-[10px] text-white font-bold">✓</span>}
                    </div>
                    <span className="text-[13px] text-gray-900 leading-[1.6]">{t}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowAiTailModal(false)} className="flex-1 h-11 bg-white text-gray-500 border border-gray-200 rounded-lg text-[13px] font-semibold">취소</button>
              <button onClick={deliverAiTails} disabled={selectedAiTails.length === 0 || genAITails.isPending || saveAITails.isPending}
                className="flex-1 h-11 rounded-lg text-[13px] font-bold disabled:opacity-50"
                style={{ background: selectedAiTails.length > 0 ? THEME.accent : '#E5E7EB', color: selectedAiTails.length > 0 ? '#fff' : '#9CA3AF' }}>
                {saveAITails.isPending ? '저장중...' : `선택한 ${selectedAiTails.length}개 전달`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}