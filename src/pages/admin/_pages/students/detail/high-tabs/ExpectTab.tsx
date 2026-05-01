import { useState, useEffect } from 'react'
import {
  useStudentSaenggibuPdf,
  useStudentQuestions,
  useQuestionAnalyses,
  useQuestionFollowups,
  useGenerateAIQuestions,
  useGenerateAIAnalysis,
  useGenerateAIFeedback,
  useAddManualQuestion,
  useToggleQuestionPublish,
  usePublishAllQuestions,
  useDeleteQuestion,
  useDeleteAllAIQuestions,
  useSendFirstFeedback,
  useSendFinalFeedback,
  useAddFollowup,
  useGenerateAIFollowups,
  useSaveSelectedFollowups,
  useDeleteFollowup,
  useDeleteStudentPdf,
  getSaenggibuPdfSignedUrl,
  gradeToNum,
  getQuestionStep,
  SAENGGIBU_AI_CALL_LIMITS,
  type ExpectQuestion,
  type AIAnalysisResult,
} from '../../../../_hooks/useHighSaenggibuQuestions'
import { PdfThumbnailGrid, PdfViewerModal } from './PdfViewer'

type LeftTab = 'upload' | 'answers'

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']
const GRADE_LIST = ['고1', '고2', '고3']
const TAG_OPTIONS = [
  '출결상황',
  '1학년 자율활동', '1학년 동아리활동', '1학년 진로활동',
  '2학년 자율활동', '2학년 진로활동',
  '3학년 자율활동', '3학년 동아리활동', '3학년 진로활동',
  '1학년 세특', '2학년 세특', '3학년 세특',
  '1학년 교과성적', '2학년 교과성적', '3학년 교과성적',
  '1학년 행특', '2학년 행특', '3학년 행특',
]

interface ManualQuestion {
  tag: string
  question: string
}

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
}

// 우측 AI 패널 너비
const AI_PANEL_WIDTH = 440

function AIAnalysisContent({ 
  analysis, 
  round,
}: { 
  analysis: AIAnalysisResult
  round: number
}) {
  return (
    <>
      {analysis.strengths && analysis.strengths.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 6 }}>
            ✅ {round === 2 ? '개선된 점' : '잘한 점'}
          </div>
          {analysis.strengths.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: '#065F46', background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 6, padding: '8px 10px', marginBottom: 4, lineHeight: 1.6 }}>
              {s}
            </div>
          ))}
        </div>
      )}

      {analysis.weaknesses && analysis.weaknesses.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', marginBottom: 6 }}>
            ⚠️ {round === 2 ? '여전히 부족한 점' : '보완할 점'}
          </div>
          {analysis.weaknesses.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: '#92400E', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 6, padding: '8px 10px', marginBottom: 4, lineHeight: 1.6 }}>
              {w}
            </div>
          ))}
        </div>
      )}

      {analysis.improvements && analysis.improvements.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.accent, marginBottom: 6 }}>
            💡 {round === 2 ? '면접 전 마지막 조언' : '개선 방향'}
          </div>
          {analysis.improvements.map((imp, i) => (
            <div key={i} style={{ fontSize: 12, color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60`, borderRadius: 6, padding: '8px 10px', marginBottom: 4, lineHeight: 1.6 }}>
              {imp}
            </div>
          ))}
        </div>
      )}

      {analysis.authenticity_concerns && analysis.authenticity_concerns.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
            ⚡ {round === 2 ? '남아있는 의심 포인트' : '면접관이 의심할 만한 부분'}
          </div>
          {analysis.authenticity_concerns.map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: '#991B1B', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, padding: '8px 10px', marginBottom: 4, lineHeight: 1.6 }}>
              {a}
            </div>
          ))}
        </div>
      )}

      {analysis.summary && (
        <div style={{ background: '#F8F7F5', border: '1px solid #E5E7EB', borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>📝 전반적 평가</div>
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{analysis.summary}</div>
        </div>
      )}
    </>
  )
}

export default function ExpectTab({ student }: { student: any }) {
  const studentId: string = student.id

  const [selGrade, setSelGrade] = useState('고1')
  const [leftTab, setLeftTab] = useState<LeftTab>('upload')
  const [selQId, setSelQId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  const [showTailModal, setShowTailModal] = useState(false)
  const [tailInput, setTailInput] = useState('')

  const [showAiTailModal, setShowAiTailModal] = useState(false)
  const [aiTails, setAiTails] = useState<string[]>([])
  const [selectedAiTails, setSelectedAiTails] = useState<number[]>([])

  const [showManualModal, setShowManualModal] = useState(false)
  const [manualItems, setManualItems] = useState<ManualQuestion[]>([
    { tag: '출결상황', question: '' },
  ])

  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [previewPage, setPreviewPage] = useState<number | null>(null)

  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiTab, setAiTab] = useState<'first' | 'second'>('first')
  const [aiSuggestLoading, setAiSuggestLoading] = useState<'first' | 'final' | null>(null)

  const gradeNum = gradeToNum(selGrade) ?? 1

  const { data: pdfInfo, refetch: refetchPdf } = useStudentSaenggibuPdf(studentId, gradeNum)
  const { data: questions = [], isLoading: loadingQ } = useStudentQuestions(studentId, gradeNum)
  const { data: analyses = [] } = useQuestionAnalyses(selQId ?? undefined)
  const { data: followups = [] } = useQuestionFollowups(selQId ?? undefined)

  const generateAI = useGenerateAIQuestions()
  const generateAIAnalysis = useGenerateAIAnalysis()
  const generateAIFeedback = useGenerateAIFeedback()
  const deleteAllAI = useDeleteAllAIQuestions()
  const addManual = useAddManualQuestion()
  const togglePublish = useToggleQuestionPublish()
  const publishAll = usePublishAllQuestions()
  const deleteQ = useDeleteQuestion()
  const sendFirst = useSendFirstFeedback()
  const sendFinal = useSendFinalFeedback()
  const addTail = useAddFollowup()
  const genAITails = useGenerateAIFollowups()
  const saveAITails = useSaveSelectedFollowups()
  const deleteTail = useDeleteFollowup()
  const deletePdf = useDeleteStudentPdf()

  const selQ = questions.find(q => q.id === selQId) ?? null
  const step = selQ ? getQuestionStep(selQ, analyses) : 0
  const round1 = analyses.find(a => a.round === 1)
  const round2 = analyses.find(a => a.round === 2)

  const aiQuestionCount = questions.filter(q => q.source_type === 'ai').length
  const hasAIQuestions = aiQuestionCount > 0

  const round1CallCount = round1?.ai_call_count || 0
  const round2CallCount = round2?.ai_call_count || 0

  useEffect(() => {
    if (pdfInfo?.saenggibu_pdf_url) {
      getSaenggibuPdfSignedUrl(pdfInfo.saenggibu_pdf_url).then((url) => setPdfUrl(url))
    } else {
      setPdfUrl(null)
      setTotalPages(0)
    }
  }, [pdfInfo?.saenggibu_pdf_url])

  useEffect(() => { 
    setSelQId(null)
    setShowAiPanel(false)
  }, [selGrade])

  useEffect(() => {
    setShowAiPanel(false)
  }, [selQId])

  useEffect(() => {
    const interval = setInterval(() => refetchPdf(), 3000)
    return () => clearInterval(interval)
  }, [refetchPdf])

  const handleGenerateAI = () => {
    if (!pdfInfo?.saenggibu_pdf_url) {
      alert('학생이 먼저 생기부를 업로드해야 해요!')
      return
    }
    if (!pdfInfo?.major_dept) {
      alert('학생이 학과를 선택하지 않았어요!')
      return
    }
    generateAI.mutate({
      studentId,
      grade: gradeNum,
      saenggibu_pdf_url: pdfInfo.saenggibu_pdf_url,
      major_dept: pdfInfo.major_dept,
    }, {
      onSuccess: () => setLeftTab('answers'),
      onError: (err: any) => {
        generateAI.reset()
        alert('AI 질문 생성 실패:\n' + (err?.message || '알 수 없는 오류'))
      },
    })
  }

  const handleDeleteAllAI = () => {
    if (!hasAIQuestions) return
    const confirmed = window.confirm(
      `정말 ${selGrade} AI 질문 ${aiQuestionCount}개를 모두 삭제할까요?\n\n` +
      `⚠️ 주의:\n• 학생 답변 / 피드백 / 꼬리질문도 함께 삭제돼요\n• 이 작업은 되돌릴 수 없어요\n• 삭제 후 AI 재생성 가능해져요`
    )
    if (!confirmed) return
    deleteAllAI.mutate({ studentId, grade: gradeNum }, {
      onSuccess: () => {
        setSelQId(null)
        alert('AI 질문이 모두 삭제됐어요. 이제 다시 생성할 수 있어요.')
      },
      onError: (err: any) => alert('삭제 실패: ' + (err?.message || '알 수 없는 오류')),
    })
  }

  const openAiAnalysis = (tab: 'first' | 'second' = 'first') => {
    if (!selQ) return

    setShowAiPanel(true)
    setAiTab(tab)

    const round = tab === 'first' ? 1 : 2
    const studentAnswer = round === 1 ? selQ.student_answer : round2?.revised_answer

    if (!studentAnswer) {
      alert(`학생이 ${round === 1 ? '첫' : '업그레이드'} 답변을 먼저 작성해야 합니다.`)
      return
    }

    const existingAnalysis = round === 1 ? round1?.ai_analysis : round2?.ai_analysis
    if (existingAnalysis) return

    const limit = round === 1 ? SAENGGIBU_AI_CALL_LIMITS.ROUND_1 : SAENGGIBU_AI_CALL_LIMITS.ROUND_2
    const current = round === 1 ? round1CallCount : round2CallCount
    if (current >= limit) {
      alert(`${round}차 답변 AI 분석은 최대 ${limit}회까지만 가능합니다.`)
      return
    }

    const params: any = {
      questionId: selQ.id,
      studentId,
      round,
      question: selQ.teacher_edited_question || selQ.question,
      studentAnswer,
      majorDept: selQ.major_dept,
      sourceText: selQ.source_text,
    }

    if (round === 2) {
      params.firstAnswer = selQ.student_answer
      params.firstFeedback = round1?.teacher_feedback
    }

    generateAIAnalysis.mutate(params, {
      onError: (err: any) => {
        alert('AI 분석 실패:\n' + (err?.message || '알 수 없는 오류'))
      },
    })
  }

  const reAnalyze = (round: number) => {
    if (!selQ) return
    
    const limit = round === 1 ? SAENGGIBU_AI_CALL_LIMITS.ROUND_1 : SAENGGIBU_AI_CALL_LIMITS.ROUND_2
    const current = round === 1 ? round1CallCount : round2CallCount
    if (current >= limit) {
      alert(`${round}차 답변 AI 분석은 최대 ${limit}회까지만 가능합니다. (이미 ${current}회 사용)`)
      return
    }

    if (!window.confirm(`AI 분석을 다시 실행할까요?\n\n현재 ${current}/${limit}회 사용\n실행 후 ${current + 1}/${limit}회`)) {
      return
    }

    const studentAnswer = round === 1 ? selQ.student_answer : round2?.revised_answer
    if (!studentAnswer) return

    const params: any = {
      questionId: selQ.id,
      studentId,
      round,
      question: selQ.teacher_edited_question || selQ.question,
      studentAnswer,
      majorDept: selQ.major_dept,
      sourceText: selQ.source_text,
    }

    if (round === 2) {
      params.firstAnswer = selQ.student_answer
      params.firstFeedback = round1?.teacher_feedback
    }

    generateAIAnalysis.mutate(params, {
      onError: (err: any) => {
        alert('AI 분석 실패:\n' + (err?.message || '알 수 없는 오류'))
      },
    })
  }

  const generateAIFeedbackText = async () => {
    if (!selQ) return
    
    const type = aiTab === 'first' ? 'first' : 'final'
    const round = aiTab === 'first' ? 1 : 2
    const analysis = round === 1 ? round1?.ai_analysis : round2?.ai_analysis
    const studentAnswer = round === 1 ? selQ.student_answer : round2?.revised_answer

    if (!analysis) {
      alert('AI 분석을 먼저 실행해주세요.')
      return
    }
    if (!studentAnswer) {
      alert('학생 답변이 없어요.')
      return
    }

    const params: any = {
      question: selQ.teacher_edited_question || selQ.question,
      studentAnswer,
      analysis,
      majorDept: selQ.major_dept,
      round,
    }

    if (round === 2) {
      params.firstAnswer = selQ.student_answer
      params.firstFeedback = round1?.teacher_feedback
    }

    setAiSuggestLoading(type)
    try {
      const draft = await generateAIFeedback.mutateAsync(params)
      const key = type === 'first' ? String(selQ.id) : `${selQ.id}_final`
      setFeedback(prev => ({ ...prev, [key]: draft }))
      alert(`✏️ AI가 ${type === 'first' ? '1차' : '최종'} 피드백을 작성했어요!\n\n${type === 'first' ? 'Step 2' : 'Step 4'}에서 확인하고 수정 후 전달해주세요.`)
    } catch (err: any) {
      alert('AI 답변 작성 실패:\n' + (err?.message || '알 수 없는 오류'))
    } finally {
      setAiSuggestLoading(null)
    }
  }

  const handleAddManual = async () => {
    const validItems = manualItems.filter(item => item.question.trim())
    if (validItems.length === 0) return
    try {
      for (const item of validItems) {
        await addManual.mutateAsync({
          student_id: studentId, grade: gradeNum,
          question: item.question.trim(), tag: item.tag, purpose: [],
          major_dept: pdfInfo?.major_dept ?? null, publish_now: false,
        })
      }
      setShowManualModal(false)
      setManualItems([{ tag: '출결상황', question: '' }])
      setLeftTab('answers')
    } catch (err: any) {
      alert('저장 실패: ' + (err?.message || '알 수 없는 오류'))
    }
  }

  const addManualRow = () => setManualItems(prev => [...prev, { tag: '출결상황', question: '' }])
  const removeManualRow = (index: number) => setManualItems(prev => prev.filter((_, i) => i !== index))
  const updateManualRow = (index: number, updates: Partial<ManualQuestion>) =>
    setManualItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item))

  const handlePublish = (q: ExpectQuestion) => togglePublish.mutate({ id: q.id, publish: q.question_status !== 'published' })
  const handlePublishAll = () => {
    if (window.confirm(`${selGrade} 미게시 질문을 모두 학생에게 게시할까요?`)) {
      publishAll.mutate({ studentId, grade: gradeNum })
    }
  }
  const handleDelete = (q: ExpectQuestion) => {
    if (window.confirm('이 질문을 삭제할까요? 답변/피드백/꼬리질문도 함께 삭제돼요.')) {
      deleteQ.mutate(q.id, { onSuccess: () => { if (selQId === q.id) setSelQId(null) } })
    }
  }

  const sendFirstFb = () => {
    if (!selQ) return
    const key = String(selQ.id)
    const val = (feedback[key] || '').trim()
    if (!val) return
    sendFirst.mutate({ questionId: selQ.id, studentId, feedback: val }, {
      onSuccess: () => setFeedback(prev => ({ ...prev, [key]: '' })),
    })
  }

  const sendFinalFb = () => {
    if (!selQ) return
    const key = `${selQ.id}_final`
    const val = (feedback[key] || '').trim()
    if (!val) return
    sendFinal.mutate({ questionId: selQ.id, studentId, feedback: val }, {
      onSuccess: () => setFeedback(prev => ({ ...prev, [key]: '' })),
    })
  }

  const submitTail = () => {
    if (!selQ || !tailInput.trim()) return
    addTail.mutate({
      question_id: selQ.id, student_id: studentId,
      text: tailInput.trim(), publish_now: true,
    }, {
      onSuccess: () => { setTailInput(''); setShowTailModal(false) },
    })
  }

  const openAiTailModal = () => {
    if (!selQ) return
    setShowAiTailModal(true)
    setAiTails([])
    setSelectedAiTails([])
    genAITails.mutate({
      question_id: selQ.id,
      question: selQ.teacher_edited_question || selQ.question,
      finalAnswer: round2?.revised_answer || selQ.student_answer || '',
      finalFeedback: round2?.teacher_feedback,
      majorDept: selQ.major_dept,
      sourceText: selQ.source_text,
    }, {
      onSuccess: (data) => setAiTails(data),
      onError: (err: any) => {
        alert('AI 꼬리질문 생성 실패:\n' + (err?.message || '알 수 없는 오류'))
        setShowAiTailModal(false)
      },
    })
  }

  const deliverAiTails = () => {
    if (!selQ || selectedAiTails.length === 0) return
    const selected = selectedAiTails.map(i => aiTails[i])
    saveAITails.mutate({
      question_id: selQ.id, student_id: studentId,
      questions: selected, publish_now: true,
    }, {
      onSuccess: () => {
        setShowAiTailModal(false)
        setAiTails([])
        setSelectedAiTails([])
      },
    })
  }

  const currentRoundHasAnalysis = aiTab === 'first' ? !!round1?.ai_analysis : !!round2?.ai_analysis
  const currentRoundFeedbackDone = aiTab === 'first' ? !!round1?.teacher_feedback : !!round2?.teacher_feedback

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 12, 
      height: '100%', 
      overflow: 'hidden',
      // ⭐ AI 패널 열렸을 때 우측 padding 추가 (가운데 콘텐츠가 안 가려지게)
      paddingRight: showAiPanel ? AI_PANEL_WIDTH + 16 : 0,
      transition: 'padding-right 0.2s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {GRADE_LIST.map(g => (
            <button key={g} onClick={() => setSelGrade(g)}
              style={{
                padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: `1px solid ${selGrade === g ? THEME.accent : '#E5E7EB'}`,
                background: selGrade === g ? THEME.accent : '#fff',
                color: selGrade === g ? '#fff' : '#6B7280', cursor: 'pointer',
              }}>{g}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {questions.filter(q => q.question_status === 'draft').length > 0 && (
            <button onClick={handlePublishAll} disabled={publishAll.isPending}
              style={{
                padding: '6px 14px', background: '#059669', color: '#fff',
                border: 'none', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
              {publishAll.isPending ? '처리중...' : `👁 ${questions.filter(q => q.question_status === 'draft').length}개 학생에게 전체 게시`}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
        {/* 왼쪽 질문 목록 */}
        <div style={{ width: 360, flexShrink: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
            {[{ key: 'upload', label: '생기부 확인' }, { key: 'answers', label: '답변 피드백' }].map(t => (
              <div key={t.key} onClick={() => setLeftTab(t.key as LeftTab)}
                style={{
                  flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 12,
                  fontWeight: leftTab === t.key ? 700 : 500,
                  color: leftTab === t.key ? THEME.accent : '#6B7280',
                  borderBottom: `2px solid ${leftTab === t.key ? THEME.accent : 'transparent'}`,
                  cursor: 'pointer',
                }}>{t.label}</div>
            ))}
          </div>

          {leftTab === 'upload' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {!pdfInfo?.saenggibu_pdf_url ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#6B7280', marginBottom: 6 }}>생기부 미업로드</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                    학생이 아직 {selGrade} 생기부를<br />업로드하지 않았어요.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 8 }}>업로드된 생기부</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#F8F7F5', border: '1px solid #E5E7EB', borderRadius: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, background: '#EF4444', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>PDF</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.name}_{selGrade}_생기부.pdf
                      </div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                        {pdfInfo.major_dept && <>🎓 {pdfInfo.major_dept} · </>}
                        {totalPages > 0 && <>{totalPages}페이지 · </>}
                        업로드 완료
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '3px 8px', borderRadius: 99, border: '1px solid #6EE7B7', flexShrink: 0 }}>완료</span>
                  </div>

                  {!hasAIQuestions && (
                    <>
                      <button
                        onClick={() => {
                          if (window.confirm(
                            `정말 학생의 ${selGrade} 생기부를 삭제할까요?\n\n⚠️ 주의:\n• 학생이 다시 업로드해야 해요\n• 이 작업은 되돌릴 수 없어요`
                          )) {
                            deletePdf.mutate({
                              studentId, path: pdfInfo.saenggibu_pdf_url!, grade: gradeNum,
                            }, {
                              onSuccess: () => alert('생기부가 삭제되었어요.'),
                              onError: (err: any) => alert('삭제 실패: ' + (err?.message || '알 수 없는 오류')),
                            })
                          }
                        }}
                        disabled={deletePdf.isPending}
                        style={{
                          width: '100%', padding: '8px 0', background: '#fff',
                          color: '#EF4444', border: '1px solid #FCA5A5', borderRadius: 8,
                          fontSize: 12, fontWeight: 700,
                          cursor: deletePdf.isPending ? 'not-allowed' : 'pointer', marginBottom: 10,
                        }}>
                        {deletePdf.isPending ? '삭제중...' : '🗑 생기부 삭제 (학생 재업로드 필요)'}
                      </button>

                      <button onClick={handleGenerateAI} disabled={generateAI.isPending}
                        style={{
                          width: '100%', padding: '12px 0',
                          background: generateAI.isPending ? '#BAC8FF' : THEME.accent,
                          color: '#fff', border: 'none', borderRadius: 10,
                          fontSize: 13, fontWeight: 700,
                          cursor: generateAI.isPending ? 'not-allowed' : 'pointer', marginBottom: 10,
                        }}>
                        {generateAI.isPending
                          ? '🤖 질문 생성 중... (1~2분 소요)'
                          : '✨ AI 예상질문 생성 + 학생에게 전달'}
                      </button>
                    </>
                  )}

                  {hasAIQuestions && (
                    <>
                      <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 16 }}>✓</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>
                            AI 질문 {aiQuestionCount}개 생성 완료
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#047857', lineHeight: 1.6 }}>
                          '답변 피드백' 탭에서 질문을 확인하고 학생에게 게시해주세요.
                        </div>
                      </div>

                      <button onClick={handleDeleteAllAI} disabled={deleteAllAI.isPending}
                        style={{
                          width: '100%', padding: '10px 0', background: '#fff',
                          color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: 10,
                          fontSize: 12, fontWeight: 700,
                          cursor: deleteAllAI.isPending ? 'not-allowed' : 'pointer', marginBottom: 10,
                        }}>
                        {deleteAllAI.isPending ? '삭제중...' : `🗑 AI 질문 ${aiQuestionCount}개 전체 삭제 (재생성 가능)`}
                      </button>
                    </>
                  )}

                  <button onClick={() => setShowManualModal(true)}
                    style={{
                      width: '100%', padding: '11px 0', background: '#fff',
                      color: THEME.accent, border: `1px solid ${THEME.accent}`, borderRadius: 10,
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 14,
                    }}>
                    ✏️ 직접 질문 작성
                  </button>

                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 8 }}>
                    페이지 미리보기 {totalPages > 0 && `(${totalPages}장)`}
                  </div>

                  {pdfUrl && (
                    <PdfThumbnailGrid pdfUrl={pdfUrl}
                      onClickPage={(p) => setPreviewPage(p)}
                      onTotalPages={(n) => setTotalPages(n)} />
                  )}
                </>
              )}
            </div>
          )}

          {leftTab === 'answers' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10, padding: '0 4px', lineHeight: 1.7 }}>
                총 <span style={{ color: THEME.accent, fontWeight: 700 }}>{questions.length}개</span> ·
                게시 <span style={{ color: '#059669', fontWeight: 700 }}>{questions.filter(q => q.question_status === 'published').length}개</span>
                <br />
                답변완료 <span style={{ color: '#059669', fontWeight: 700 }}>{questions.filter(q => !!q.student_answer).length}개</span> ·
                미답변 <span style={{ color: '#D97706', fontWeight: 700 }}>{questions.filter(q => !q.student_answer).length}개</span>
              </div>

              {loadingQ ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#9CA3AF', fontSize: 12 }}>불러오는 중...</div>
              ) : questions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>생성된 질문이 없어요.</div>
                </div>
              ) : questions.map((q, i) => {
                const isPublished = q.question_status === 'published'
                return (
                  <div key={q.id} onClick={() => setSelQId(q.id)}
                    style={{
                      border: `1px solid ${selQId === q.id ? THEME.accent : '#E5E7EB'}`,
                      borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                      cursor: 'pointer', background: selQId === q.id ? THEME.accentBg : '#fff',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: THEME.accent, background: THEME.accentBg, padding: '2px 8px', borderRadius: 99 }}>질문 {i + 1}</span>
                      {q.source_type === 'teacher_manual' && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#7C3AED', background: '#F3E8FF', padding: '2px 6px', borderRadius: 99 }}>원장 작성</span>
                      )}
                      {q.source_type === 'ai' && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#0891B2', background: '#ECFEFF', padding: '2px 6px', borderRadius: 99 }}>AI 생성</span>
                      )}
                      {isPublished ? (
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 6px', borderRadius: 99, border: '1px solid #6EE7B7' }}>게시됨</span>
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#D97706', background: '#FFF3E8', padding: '2px 6px', borderRadius: 99, border: '1px solid #FDBA74' }}>미게시</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#1a1a1a', lineHeight: 1.5, fontWeight: 500, marginBottom: 8 }}>
                      {q.teacher_edited_question || q.question}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {q.tag && <span style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 99 }}>{q.tag}</span>}
                      {q.student_answer ? (
                        <span style={{ fontSize: 10, color: '#059669', background: '#ECFDF5', padding: '2px 7px', borderRadius: 99, border: '1px solid #6EE7B7' }}>답변완료</span>
                      ) : (
                        <span style={{ fontSize: 10, color: '#D97706', background: '#FFF3E8', padding: '2px 7px', borderRadius: 99, border: '1px solid #FDBA74' }}>미답변</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                      <button onClick={(e) => { e.stopPropagation(); handlePublish(q) }}
                        style={{
                          flex: 1, padding: '4px 8px', fontSize: 10, fontWeight: 700, borderRadius: 6,
                          border: isPublished ? '1px solid #E5E7EB' : 'none',
                          background: isPublished ? '#fff' : THEME.accent,
                          color: isPublished ? '#6B7280' : '#fff', cursor: 'pointer',
                        }}>
                        {isPublished ? '🔒 비공개' : '👁 게시'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(q) }}
                        style={{
                          padding: '4px 10px', fontSize: 10, fontWeight: 700, borderRadius: 6,
                          border: '1px solid #FCA5A5', background: '#fff', color: '#EF4444', cursor: 'pointer',
                        }}>🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 가운데 피드백 패널 */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {!selQ ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
              <div style={{ fontSize: 36 }}>💬</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280' }}>질문을 선택해주세요</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                      질문 {questions.findIndex(q => q.id === selQ.id) + 1}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{selQ.tag || '기타'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {selQ.student_answer && (
                      <button
                        onClick={() => {
                          if (showAiPanel) setShowAiPanel(false)
                          else openAiAnalysis('first')
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          background: showAiPanel ? THEME.accent : THEME.accentBg,
                          color: showAiPanel ? '#fff' : THEME.accent,
                          border: `1px solid ${THEME.accent}`,
                        }}
                      >
                        ✨ AI 분석 {showAiPanel ? '닫기' : '보기'}
                      </button>
                    )}
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 99,
                      background: selQ.student_answer ? '#ECFDF5' : '#FFF3E8',
                      color: selQ.student_answer ? '#059669' : '#D97706',
                      border: `1px solid ${selQ.student_answer ? '#6EE7B7' : '#FDBA74'}`,
                    }}>
                      {selQ.student_answer ? '답변완료' : '미답변'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex' }}>
                  {STEP_LABELS.map((label, i) => {
                    const stepNum = i + 1
                    const isDone = stepNum < step
                    const isOn = stepNum === step
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
                        {i < 4 && (
                          <div style={{
                            position: 'absolute', top: 11, left: '55%', width: '90%', height: 1.5,
                            background: isDone ? '#059669' : '#E5E7EB',
                          }} />
                        )}
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, zIndex: 1, position: 'relative',
                          background: isDone ? '#059669' : isOn ? THEME.accent : '#F3F4F6',
                          color: isDone || isOn ? '#fff' : '#9CA3AF',
                          border: `2px solid ${isDone ? '#059669' : isOn ? THEME.accent : '#E5E7EB'}`,
                        }}>{isDone ? '✓' : stepNum}</div>
                        <div style={{
                          fontSize: 10,
                          color: isDone ? '#059669' : isOn ? THEME.accent : '#9CA3AF',
                          fontWeight: isOn ? 700 : 500, whiteSpace: 'nowrap',
                        }}>{label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#F8F7F5', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 6, letterSpacing: '0.5px' }}>예상 질문</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.6 }}>
                    {selQ.teacher_edited_question || selQ.question}
                  </div>
                </div>

                {selQ.source_text && (
                  <div style={{ background: '#FAFBFC', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 6 }}>📋 활동 원문</div>
                    {selQ.source_subject && (
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, fontWeight: 600 }}>
                        {selQ.source_subject}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                      {selQ.source_text}
                    </div>
                  </div>
                )}

                {selQ.purpose && Array.isArray(selQ.purpose) && selQ.purpose.length > 0 && (
                  <div style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.accent, marginBottom: 8 }}>💡 질문 목적</div>
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      {selQ.purpose.map((p: string, i: number) => (
                        <li key={i} style={{ fontSize: 12, color: THEME.accentDark, lineHeight: 1.7 }}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '3px 10px', borderRadius: 99 }}>Step 1</span>
                    <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>학생 첫 답변</span>
                  </div>
                  <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                    {selQ.student_answer || <span style={{ color: '#9CA3AF' }}>아직 학생이 답변을 작성하지 않았어요.</span>}
                  </div>
                </div>

                {selQ.student_answer && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: THEME.accent, padding: '3px 10px', borderRadius: 99 }}>Step 2</span>
                      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>선생님 1차 피드백</span>
                    </div>
                    {round1?.teacher_feedback ? (
                      <div style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60`, borderRadius: 8, padding: '11px 14px', fontSize: 13, color: THEME.accentDark, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {round1.teacher_feedback}
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={feedback[String(selQ.id)] || ''}
                          onChange={e => setFeedback(prev => ({ ...prev, [String(selQ.id)]: e.target.value }))}
                          placeholder="학생의 첫 답변에 대한 피드백을 작성해주세요... (또는 오른쪽 'AI 분석 보기' 후 'AI 답변 작성하기' 버튼 활용)"
                          rows={6}
                          style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px 14px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={sendFirstFb}
                            disabled={sendFirst.isPending || !(feedback[String(selQ.id)] || '').trim()}
                            style={{
                              padding: '8px 16px',
                              background: (feedback[String(selQ.id)] || '').trim() ? THEME.accent : '#E5E7EB',
                              color: (feedback[String(selQ.id)] || '').trim() ? '#fff' : '#9CA3AF',
                              border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}>
                            {sendFirst.isPending ? '전달중...' : '📤 1차 피드백 전달'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {round1?.teacher_feedback && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '3px 10px', borderRadius: 99 }}>Step 3</span>
                      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>학생 업그레이드 답변</span>
                      {round2?.revised_answer && (
                        <button
                          onClick={() => {
                            if (showAiPanel && aiTab === 'second') setShowAiPanel(false)
                            else openAiAnalysis('second')
                          }}
                          style={{
                            marginLeft: 'auto',
                            padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                            background: showAiPanel && aiTab === 'second' ? THEME.accent : THEME.accentBg,
                            color: showAiPanel && aiTab === 'second' ? '#fff' : THEME.accent,
                            border: `1px solid ${THEME.accent}`,
                          }}
                        >
                          ✨ 2차 AI 분석 {showAiPanel && aiTab === 'second' ? '닫기' : '보기'}
                        </button>
                      )}
                    </div>
                    <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                      {round2?.revised_answer || <span style={{ color: '#9CA3AF' }}>학생이 아직 업그레이드 답변을 작성하지 않았어요.</span>}
                    </div>
                  </div>
                )}

                {round2?.revised_answer && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#059669', padding: '3px 10px', borderRadius: 99 }}>Step 4</span>
                      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>선생님 최종 피드백</span>
                    </div>
                    {round2.teacher_feedback ? (
                      <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#065F46', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {round2.teacher_feedback}
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={feedback[`${selQ.id}_final`] || ''}
                          onChange={e => setFeedback(prev => ({ ...prev, [`${selQ.id}_final`]: e.target.value }))}
                          placeholder="업그레이드된 답변에 대한 최종 피드백을 작성해주세요... (또는 오른쪽 '2차 AI 분석' 후 'AI 답변 작성하기' 버튼 활용)"
                          rows={6}
                          style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px 14px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={sendFinalFb}
                            disabled={sendFinal.isPending || !(feedback[`${selQ.id}_final`] || '').trim()}
                            style={{
                              padding: '8px 16px',
                              background: (feedback[`${selQ.id}_final`] || '').trim() ? '#059669' : '#E5E7EB',
                              color: (feedback[`${selQ.id}_final`] || '').trim() ? '#fff' : '#9CA3AF',
                              border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}>
                            {sendFinal.isPending ? '전달중...' : '✓ 최종 피드백 전달'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: step >= 5 ? THEME.accent : '#6B7280', padding: '3px 10px', borderRadius: 99 }}>Step 5</span>
                    <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>꼬리질문</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      <button onClick={() => setShowTailModal(true)}
                        style={{ padding: '5px 12px', background: '#fff', color: THEME.accent, border: `1px solid ${THEME.accent}`, borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ 직접 추가</button>
                      <button onClick={openAiTailModal}
                        style={{ padding: '5px 12px', background: THEME.accent, color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✨ AI 생성</button>
                    </div>
                  </div>
                  {followups.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '14px 0', background: '#F8F7F5', borderRadius: 8 }}>
                      꼬리질문이 없어요.
                    </div>
                  ) : followups.map((fu, i) => (
                    <div key={fu.id} style={{ background: '#F8F7F5', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: THEME.accent, background: THEME.accentBg, padding: '3px 8px', borderRadius: 99, flexShrink: 0, marginTop: 1 }}>꼬리 {i + 1}</span>
                        <div style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                          {fu.teacher_edited_question || fu.ai_generated_question}
                        </div>
                        <button onClick={() => { if (window.confirm('꼬리질문 삭제?')) deleteTail.mutate(fu.id) }}
                          style={{ padding: '3px 8px', fontSize: 10, color: '#EF4444', background: '#fff', border: '1px solid #FCA5A5', borderRadius: 5, cursor: 'pointer' }}>
                          삭제
                        </button>
                      </div>
                      {fu.student_answer && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 4 }}>학생 답변</div>
                          <div style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{fu.student_answer}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ⭐ 우측 AI 패널 - position: fixed로 화면 우측 끝에 고정 */}
      {showAiPanel && selQ && (
        <div style={{ 
          position: 'fixed',
          top: 50,           // 헤더 아래
          right: 0,          // 우측 끝
          bottom: 0,         // 화면 끝까지
          width: AI_PANEL_WIDTH,
          background: '#fff',
          borderLeft: '1px solid #E5E7EB',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 90,        // 챗봇(100)보다는 낮게
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: THEME.accentBg }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.accentDark }}>✨ AI 분석</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                {student.name} · 질문 {questions.findIndex(q => q.id === selQ.id) + 1}
              </div>
            </div>
            <button
              onClick={() => setShowAiPanel(false)}
              style={{ color: '#6B7280', fontSize: 18, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#fff', cursor: 'pointer', borderRadius: 6 }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
            <button
              onClick={() => { setAiTab('first'); openAiAnalysis('first') }}
              style={{
                flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 12,
                fontWeight: aiTab === 'first' ? 700 : 500,
                color: aiTab === 'first' ? THEME.accent : '#6B7280',
                borderBottom: `2px solid ${aiTab === 'first' ? THEME.accent : 'transparent'}`,
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}
            >
              <div>📊 1차 답변 분석</div>
              <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2, fontWeight: 500 }}>
                {round1CallCount}/{SAENGGIBU_AI_CALL_LIMITS.ROUND_1}회 사용
              </div>
            </button>
            <button
              onClick={() => { 
                if (round2?.revised_answer) { 
                  setAiTab('second')
                  openAiAnalysis('second')
                }
              }}
              disabled={!round2?.revised_answer}
              style={{
                flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 12,
                fontWeight: aiTab === 'second' ? 700 : 500,
                color: !round2?.revised_answer ? '#D1D5DB' : aiTab === 'second' ? THEME.accent : '#6B7280',
                borderBottom: `2px solid ${aiTab === 'second' ? THEME.accent : 'transparent'}`,
                background: 'transparent', border: 'none', 
                cursor: !round2?.revised_answer ? 'not-allowed' : 'pointer',
              }}
            >
              <div>📈 2차 답변 분석</div>
              <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2, fontWeight: 500 }}>
                {!round2?.revised_answer ? '업그레이드 필요' : `${round2CallCount}/${SAENGGIBU_AI_CALL_LIMITS.ROUND_2}회 사용`}
              </div>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {generateAIAnalysis.isPending ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#9CA3AF' }}>
                <div style={{ fontSize: 32 }}>✨</div>
                <div style={{ fontSize: 13 }}>AI가 분석 중이에요...</div>
                <div style={{ fontSize: 11 }}>(10~20초 소요)</div>
              </div>
            ) : aiTab === 'first' ? (
              round1?.ai_analysis ? (
                <>
                  <AIAnalysisContent analysis={round1.ai_analysis} round={1} />
                  {round1CallCount < SAENGGIBU_AI_CALL_LIMITS.ROUND_1 && (
                    <button
                      onClick={() => reAnalyze(1)}
                      style={{
                        width: '100%', marginTop: 12, padding: '8px 0',
                        background: '#fff', color: THEME.accent,
                        border: `1px solid ${THEME.accent}`, borderRadius: 6,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      🔄 AI 분석 다시 실행 ({round1CallCount}/{SAENGGIBU_AI_CALL_LIMITS.ROUND_1}회 사용)
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#9CA3AF' }}>
                  <div style={{ fontSize: 32 }}>📊</div>
                  <div style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.7 }}>
                    AI 분석을 시작하려면<br />
                    위쪽 "✨ AI 분석 보기" 버튼을 눌러주세요
                  </div>
                </div>
              )
            ) : (
              round2?.ai_analysis ? (
                <>
                  <AIAnalysisContent analysis={round2.ai_analysis} round={2} />
                  {round2CallCount < SAENGGIBU_AI_CALL_LIMITS.ROUND_2 && (
                    <button
                      onClick={() => reAnalyze(2)}
                      style={{
                        width: '100%', marginTop: 12, padding: '8px 0',
                        background: '#fff', color: THEME.accent,
                        border: `1px solid ${THEME.accent}`, borderRadius: 6,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      🔄 AI 분석 다시 실행 ({round2CallCount}/{SAENGGIBU_AI_CALL_LIMITS.ROUND_2}회 사용)
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#9CA3AF' }}>
                  <div style={{ fontSize: 32 }}>📈</div>
                  <div style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.7 }}>
                    2차 답변 분석을 시작하려면<br />
                    Step 3의 "✨ 2차 AI 분석 보기" 버튼을 눌러주세요
                  </div>
                </div>
              )
            )}
          </div>

          {currentRoundHasAnalysis && !currentRoundFeedbackDone && (
            <div style={{ 
              padding: '12px 16px', 
              borderTop: '1px solid #E5E7EB', 
              flexShrink: 0,
              background: '#FAFBFC',
            }}>
              <button
                onClick={generateAIFeedbackText}
                disabled={aiSuggestLoading !== null}
                style={{
                  width: '100%', padding: '12px 0',
                  background: aiSuggestLoading !== null ? '#BAC8FF' : THEME.accent,
                  color: '#fff',
                  border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 700,
                  cursor: aiSuggestLoading !== null ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {aiSuggestLoading !== null ? '✨ AI가 답변 작성 중...' : `✏️ 선생님 ${aiTab === 'first' ? '1차' : '최종'} 답변 작성하기`}
              </button>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6, textAlign: 'center', lineHeight: 1.5 }}>
                AI가 분석 결과를 토대로 친근한 코치 말투로 작성해요
              </div>
            </div>
          )}

          {currentRoundFeedbackDone && (
            <div style={{ 
              padding: '12px 16px', 
              borderTop: '1px solid #E5E7EB', 
              flexShrink: 0,
              background: '#ECFDF5',
            }}>
              <div style={{ fontSize: 12, color: '#059669', textAlign: 'center', fontWeight: 600 }}>
                ✓ 이미 {aiTab === 'first' ? '1차' : '최종'} 피드백이 작성되었어요
              </div>
            </div>
          )}
        </div>
      )}

      {/* 모달들 */}
      {showTailModal && (
        <div onClick={() => setShowTailModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>꼬리질문 추가</div>
            <textarea value={tailInput} onChange={e => setTailInput(e.target.value)}
              placeholder="꼬리질문을 입력해주세요..." rows={4} autoFocus
              style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px 14px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.7, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowTailModal(false); setTailInput('') }}
                style={{ flex: 1, height: 42, background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={submitTail} disabled={!tailInput.trim() || addTail.isPending}
                style={{ flex: 1, height: 42, background: tailInput.trim() ? THEME.accent : '#E5E7EB', color: tailInput.trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: tailInput.trim() ? 'pointer' : 'not-allowed' }}>
                {addTail.isPending ? '추가중...' : '추가하고 게시'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAiTailModal && (
        <div onClick={() => setShowAiTailModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 28, width: 520 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>✨ AI 꼬리질문 생성</div>
            {genAITails.isPending ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: 13 }}>
                AI가 꼬리질문을 생성 중이에요...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {aiTails.map((t, i) => (
                  <div key={i} onClick={() => setSelectedAiTails(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', border: `1px solid ${selectedAiTails.includes(i) ? THEME.accent : '#E5E7EB'}`, borderRadius: 10, cursor: 'pointer', background: selectedAiTails.includes(i) ? THEME.accentBg : '#fff' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${selectedAiTails.includes(i) ? THEME.accent : '#D1D5DB'}`, background: selectedAiTails.includes(i) ? THEME.accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {selectedAiTails.includes(i) && <span style={{ fontSize: 11, color: '#fff' }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>{t}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAiTailModal(false)}
                style={{ flex: 1, height: 42, background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={deliverAiTails} disabled={selectedAiTails.length === 0 || genAITails.isPending || saveAITails.isPending}
                style={{ flex: 1, height: 42, background: selectedAiTails.length > 0 ? THEME.accent : '#E5E7EB', color: selectedAiTails.length > 0 ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: selectedAiTails.length > 0 ? 'pointer' : 'not-allowed' }}>
                {saveAITails.isPending ? '저장중...' : `선택한 ${selectedAiTails.length}개 전달`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManualModal && (
        <div onClick={() => setShowManualModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px 14px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>✏️ 직접 질문 작성</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>
              {manualItems.map((item, idx) => (
                <div key={idx} style={{
                  border: '1px solid #E5E7EB', borderRadius: 10, padding: 14, marginBottom: 10,
                  background: '#FAFBFC',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.accent, background: THEME.accentBg, padding: '3px 10px', borderRadius: 99 }}>
                      질문 {idx + 1}
                    </span>
                    {manualItems.length > 1 && (
                      <button onClick={() => removeManualRow(idx)}
                        style={{
                          padding: '3px 10px', fontSize: 11, color: '#EF4444', background: '#fff',
                          border: '1px solid #FCA5A5', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                        }}>✕ 삭제</button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 140, flexShrink: 0 }}>
                      <select value={item.tag} onChange={e => updateManualRow(idx, { tag: e.target.value })}
                        style={{
                          width: '100%', border: '1px solid #E5E7EB', borderRadius: 7, padding: '8px 6px',
                          fontSize: 11, outline: 'none', fontFamily: 'inherit', background: '#fff',
                        }}>
                        {TAG_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <textarea value={item.question}
                        onChange={e => updateManualRow(idx, { question: e.target.value })}
                        placeholder="학생에게 물어볼 예상질문을 작성해주세요..." rows={2}
                        style={{
                          width: '100%', border: '1px solid #E5E7EB', borderRadius: 7,
                          padding: '8px 10px', fontSize: 12, outline: 'none', resize: 'vertical',
                          fontFamily: 'inherit', lineHeight: 1.6,
                        }} />
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={addManualRow}
                style={{
                  width: '100%', padding: '10px 0', background: '#fff', color: THEME.accent,
                  border: '1.5px dashed #93C5FD', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>+ 질문 추가</button>
            </div>

            <div style={{ padding: '14px 28px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => {
                setShowManualModal(false)
                setManualItems([{ tag: '출결상황', question: '' }])
              }}
                style={{
                  flex: 1, height: 42, background: '#fff', color: '#6B7280',
                  border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                }}>취소</button>
              <button onClick={handleAddManual}
                disabled={manualItems.filter(i => i.question.trim()).length === 0 || addManual.isPending}
                style={{
                  flex: 2, height: 42,
                  background: manualItems.filter(i => i.question.trim()).length > 0 && !addManual.isPending ? THEME.accent : '#E5E7EB',
                  color: manualItems.filter(i => i.question.trim()).length > 0 && !addManual.isPending ? '#fff' : '#9CA3AF',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: manualItems.filter(i => i.question.trim()).length > 0 && !addManual.isPending ? 'pointer' : 'not-allowed',
                }}>
                {addManual.isPending ? '저장중...' : `${manualItems.filter(i => i.question.trim()).length}개 질문 저장`}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewPage !== null && pdfUrl && (
        <PdfViewerModal pdfUrl={pdfUrl} initialPage={previewPage}
          onClose={() => setPreviewPage(null)} />
      )}
    </div>
  )
}