// src/pages/high-student/_pages/basic/Basic.tsx
// 기본 인성질문 학생용 - Past.tsx와 동일한 구조 (학교 자동 고정)

import { useState, useEffect, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import {
  useMyPastQuestions,
  useMyAnswerAnalyses,
  useMyAnswerFollowups,
  useSubmitFirstAnswer,
  useSubmitUpgradedAnswer,
  useSubmitFollowupAnswer,
  getMyStep,
  inferQuestionType,
  type QuestionWithAnswer,
} from '../../_hooks/useMyHighQuestions'
import { useDraftAutoSave, type DraftStatus } from '../../_hooks/useDraftAutoSave'
import { supabase } from '@/lib/supabase'

// 🔥 기본 인성질문 고정값
const BASIC_UNIV = '기본 인성'
const BASIC_DEPT = '공통'

const TYPE_COLOR: Record<string, string> = {
  '공통': 'bg-brand-high-pale text-brand-high-dark border-brand-high-light',
  '전공': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '인성': 'bg-amber-50 text-amber-700 border-amber-200',
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function DraftStatusIndicator({ status, lastSavedAt }: { status: DraftStatus; lastSavedAt: Date | null }) {
  if (status === 'idle') return null
  if (status === 'saving') return (
    <span className="text-[10px] text-ink-muted flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />저장 중...
    </span>
  )
  if (status === 'error') return <span className="text-[10px] text-red-500 flex items-center gap-1">⚠️ 저장 실패</span>
  return (
    <span className="text-[10px] text-emerald-600 flex items-center gap-1">
      ✓ 자동 저장됨
      {lastSavedAt && <span className="text-ink-muted">({lastSavedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})</span>}
    </span>
  )
}

function MicSTTBtn({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => { if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop()) }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch {
      alert('마이크 권한이 필요해요. 브라우저 설정에서 허용해주세요.')
    }
  }

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    setRecording(false)
    setProcessing(true)
    const blobPromise = new Promise<Blob>(resolve => {
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach(t => t.stop()); audioStreamRef.current = null }
        resolve(blob)
      }
      recorder.stop()
    })
    try {
      const blob = await blobPromise
      const audioBase64 = await blobToBase64(blob)
      const { data, error } = await supabase.functions.invoke('middle-stt-short', { body: { audioBase64 } })
      if (error || !data?.success) { alert('음성 변환 실패: ' + (error?.message || data?.error || 'unknown')); return }
      const transcript = data?.text || ''
      if (transcript) onTranscript(transcript)
      else alert('음성을 인식하지 못했어요. 다시 시도해주세요!')
    } catch (e: any) {
      alert('STT 처리 중 오류: ' + e.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <button onClick={recording ? stopRecording : startRecording} disabled={processing}
      title={recording ? '녹음 종료' : processing ? '변환 중...' : '음성으로 답변 (1분 이내)'}
      className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 text-base transition-all ${recording ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100 animate-pulse'
        : processing ? 'bg-amber-50 border-amber-200 text-amber-600 cursor-wait'
          : 'bg-brand-high-pale border-brand-high-light text-brand-high-dark hover:bg-brand-high-pale'
        }`}>
      {recording ? '⏹' : processing ? '⏳' : '🎙️'}
    </button>
  )
}

function Step1Box({ studentId, questionId, existingAnswer, editingMode, onSubmit, onCancel, isPending }: {
  studentId: string | undefined
  questionId: string
  existingAnswer: string | null
  editingMode: boolean
  onSubmit: (text: string, clearDraft: () => Promise<void>) => Promise<void>
  onCancel: () => void
  isPending: boolean
}) {
  const disabled = !!existingAnswer && !editingMode
  const initialValue = editingMode && existingAnswer ? existingAnswer : ''
  const { text, setText, status, lastSavedAt, clearDraft } = useDraftAutoSave(studentId, `basic:answer:${questionId}`, initialValue, disabled)
  return (
    <>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="답변을 작성하거나 마이크로 녹음해주세요..."
        rows={4}
        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none resize-y leading-relaxed focus:border-brand-high transition-colors font-sans" />
      <div className="flex items-center mt-2">
        <DraftStatusIndicator status={status} lastSavedAt={lastSavedAt} />
        <div className="flex gap-2 ml-auto items-center">
          {editingMode && <button onClick={onCancel} className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-all">취소</button>}
          <MicSTTBtn onTranscript={t => setText(text ? text + ' ' + t : t)} />
          <button onClick={() => onSubmit(text, clearDraft)} disabled={!text.trim() || isPending}
            className={`w-[108px] h-9 rounded-lg text-[12px] font-bold flex-shrink-0 transition-all ${text.trim() && !isPending ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]' : 'bg-gray-200 text-ink-muted cursor-not-allowed'}`}>
            {isPending ? '저장중...' : editingMode ? '수정 완료' : '답변 제출'}
          </button>
        </div>
      </div>
    </>
  )
}

function Step3Box({ studentId, questionId, existingUpgrade, editingMode, onSubmit, onCancel, isPending }: {
  studentId: string | undefined
  questionId: string
  existingUpgrade: string | null
  editingMode: boolean
  onSubmit: (text: string, clearDraft: () => Promise<void>) => Promise<void>
  onCancel: () => void
  isPending: boolean
}) {
  const disabled = !!existingUpgrade && !editingMode
  const initialValue = editingMode && existingUpgrade ? existingUpgrade : ''
  const { text, setText, status, lastSavedAt, clearDraft } = useDraftAutoSave(studentId, `basic:upgraded:${questionId}`, initialValue, disabled)
  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-800 font-medium mb-2">
        💡 선생님 피드백을 반영해서 답변을 업그레이드해보세요!
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="피드백을 반영한 업그레이드 답변을 작성하거나 마이크로 녹음해주세요..."
        rows={4}
        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none resize-y leading-relaxed focus:border-brand-high transition-colors font-sans" />
      <div className="flex items-center mt-2">
        <DraftStatusIndicator status={status} lastSavedAt={lastSavedAt} />
        <div className="flex gap-2 ml-auto items-center">
          {editingMode && <button onClick={onCancel} className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-all">취소</button>}
          <MicSTTBtn onTranscript={t => setText(text ? text + ' ' + t : t)} />
          <button onClick={() => onSubmit(text, clearDraft)} disabled={!text.trim() || isPending}
            className={`w-[108px] h-9 rounded-lg text-[12px] font-bold flex-shrink-0 transition-all ${text.trim() && !isPending ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]' : 'bg-gray-200 text-ink-muted cursor-not-allowed'}`}>
            {isPending ? '저장중...' : editingMode ? '수정 완료' : '업그레이드 제출'}
          </button>
        </div>
      </div>
    </>
  )
}

function Step5TailBox({ studentId, questionId, tailIndex, onSubmit, isPending }: {
  studentId: string | undefined
  questionId: string
  tailIndex: number
  onSubmit: (text: string, clearDraft: () => Promise<void>) => Promise<void>
  isPending: boolean
}) {
  const { text, setText, status, lastSavedAt, clearDraft } = useDraftAutoSave(studentId, `basic:tail:${questionId}:${tailIndex}`, '')
  return (
    <div className="bg-gray-50 rounded-lg p-2.5 border border-line-light">
      <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">꼬리질문 답변</div>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="꼬리질문에 대한 답변을 작성하거나 마이크로 녹음해주세요..."
        rows={2}
        className="w-full border border-line rounded-lg px-2.5 py-2 text-[12px] outline-none resize-none leading-relaxed bg-white focus:border-brand-high transition-colors font-sans" />
      <div className="flex items-center mt-2">
        <DraftStatusIndicator status={status} lastSavedAt={lastSavedAt} />
        <div className="flex gap-2 ml-auto items-center">
          <MicSTTBtn onTranscript={t => setText(text ? text + ' ' + t : t)} />
          <button onClick={() => onSubmit(text, clearDraft)} disabled={!text.trim() || isPending}
            className={`w-[102px] h-9 rounded-lg text-[12px] font-bold transition-all ${text.trim() && !isPending ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]' : 'bg-gray-200 text-ink-muted cursor-not-allowed'}`}>
            {isPending ? '저장중...' : '제출'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────
export default function Basic() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const studentId = student?.id ? String(student.id) : undefined

  const [selQ, setSelQ] = useState<QuestionWithAnswer | null>(null)
  const [editingStep1, setEditingStep1] = useState(false)
  const [editingStep3, setEditingStep3] = useState(false)
  const [concept, setConcept] = useState<any>(null)

  // 🔥 학교/학과 자동 고정
  const { data: curQuestions = [], isLoading: loadingQ } = useMyPastQuestions(BASIC_UNIV, BASIC_DEPT)

  const selAnswerId = selQ?.answer?.id
  const { data: analyses = [] } = useMyAnswerAnalyses(selAnswerId)
  const { data: followups = [] } = useMyAnswerFollowups(selAnswerId)

  const submitFirst = useSubmitFirstAnswer()
  const submitUpgrade = useSubmitUpgradedAnswer()
  const submitFollowup = useSubmitFollowupAnswer()

  // 🔥 진로 컨셉 조회
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

  useEffect(() => {
    if (selQ) {
      const updated = curQuestions.find(q => q.id === selQ.id)
      if (updated) setSelQ(updated)
    }
  }, [curQuestions])

  const step = selQ ? getMyStep(selQ.answer, analyses) : 0
  const round1 = analyses.find(a => a.round === 1)
  const round2 = analyses.find(a => a.round === 2)

  const handleSubmitFirst = async (text: string, clearDraft: () => Promise<void>) => {
    if (!text.trim() || !selQ) return
    submitFirst.mutate({ questionId: selQ.id, answer: text.trim() }, {
      onSuccess: async () => { await clearDraft(); setEditingStep1(false) },
      onError: (e: any) => alert('제출 실패: ' + e.message),
    })
  }

  const handleSubmitUpgrade = async (text: string, clearDraft: () => Promise<void>) => {
    if (!text.trim() || !selQ?.answer) return
    submitUpgrade.mutate({ answerId: selQ.answer.id, answer: text.trim() }, {
      onSuccess: async () => { await clearDraft(); setEditingStep3(false) },
      onError: (e: any) => alert('제출 실패: ' + e.message),
    })
  }

  const handleSubmitFollowup = async (followupId: string, tailIndex: number, text: string, clearDraft: () => Promise<void>) => {
    if (!text.trim()) return
    submitFollowup.mutate({ followupId, answer: text }, {
      onSuccess: async () => { await clearDraft() },
    })
  }

  // 🔥 인쇄 - 최종 답변(업그레이드 있으면 업그레이드, 없으면 첫 답변) + 꼬리질문 답변
  const printAnswers = async () => {
    const answeredQs = curQuestions.filter(q => q.answer?.student_answer)
    if (answeredQs.length === 0) { alert('답변한 질문이 없어요!'); return }

    const answerIds = answeredQs.map(q => q.answer!.id)

    const { data: allAnalyses } = await supabase
      .from('high_questions_analysis')
      .select('answer_id, revised_answer')
      .in('answer_id', answerIds)
      .eq('round', 2)

    const { data: allFollowups } = await supabase
      .from('high_questions_followups')
      .select('answer_id, ai_generated_question, teacher_edited_question, student_answer, created_at')
      .in('answer_id', answerIds)
      .order('created_at', { ascending: true })

    const upgradeMap = new Map((allAnalyses || []).map(a => [a.answer_id, a.revised_answer]))
    const followupMap = new Map<string, any[]>()
    ;(allFollowups || []).forEach(f => {
      const list = followupMap.get(f.answer_id) || []
      list.push(f)
      followupMap.set(f.answer_id, list)
    })

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>기본 인성질문 최종 답변집</title>
<style>
body{font-family:'Malgun Gothic',sans-serif;padding:16px 24px;color:#1a1a1a;max-width:800px;margin:0 auto;font-size:11px;}
h1{font-size:15px;font-weight:700;margin-bottom:2px;}
.sub{font-size:11px;color:#6B7280;margin-bottom:10px;padding-bottom:8px;border-bottom:1.5px solid #1a1a1a;}
.block{margin-bottom:14px;padding-bottom:10px;border-bottom:0.5px solid #E5E7EB;}
.q-text{font-size:12px;font-weight:700;margin-bottom:6px;line-height:1.4;color:#1E3A8A;}
.label{font-size:10px;font-weight:600;color:#6B7280;margin-bottom:3px;margin-top:6px;}
.label-final{font-size:10px;font-weight:700;color:#059669;margin-bottom:3px;margin-top:6px;}
.answer-box{background:#F8F9FA;border-radius:4px;padding:6px 9px;font-size:11px;line-height:1.6;white-space:pre-wrap;}
.answer-box-final{background:#ECFDF5;border:1px solid #6EE7B7;border-radius:4px;padding:6px 9px;font-size:11px;line-height:1.6;white-space:pre-wrap;}
.tail-section{margin-top:8px;padding-top:6px;border-top:0.5px dashed #D1D5DB;}
.tail-label{font-size:10px;font-weight:700;color:#7C3AED;margin-bottom:4px;}
.tail-block{margin-bottom:6px;padding-left:8px;border-left:2px solid #DDD6FE;}
.tail-q{font-size:11px;font-weight:600;color:#1a1a1a;margin-bottom:2px;line-height:1.4;}
.tail-a{background:#F5F3FF;border-radius:3px;padding:4px 7px;font-size:10.5px;line-height:1.5;white-space:pre-wrap;color:#1a1a1a;}
.tail-empty{font-size:10px;color:#9CA3AF;font-style:italic;padding:2px 4px;}
.footer{text-align:center;font-size:10px;color:#9CA3AF;margin-top:12px;padding-top:8px;border-top:0.5px solid #E5E7EB;}
@media print{body{padding:10px 16px;}.block{page-break-inside:avoid;}}
</style></head><body>
<h1>기본 인성질문 최종 답변집</h1>
<div class="sub">기본 인성질문 · 30개</div>
${answeredQs.map((q, i) => {
  const answerId = q.answer!.id
  const upgradeAnswer = upgradeMap.get(answerId)
  const isUpgraded = !!upgradeAnswer
  const finalAnswer = upgradeAnswer || q.answer!.student_answer
  const tails = followupMap.get(answerId) || []

  return `<div class="block">
    <div class="q-text">Q${i + 1}. ${q.question}</div>
    <div class="${isUpgraded ? 'label-final' : 'label'}">${isUpgraded ? '✓ 최종 답변 (업그레이드 완료)' : '내 답변 (1차)'}</div>
    <div class="${isUpgraded ? 'answer-box-final' : 'answer-box'}">${finalAnswer}</div>
    ${tails.length > 0 ? `
      <div class="tail-section">
        <div class="tail-label">🎯 꼬리질문</div>
        ${tails.map((t, ti) => `
          <div class="tail-block">
            <div class="tail-q">꼬리 ${ti + 1}. ${t.teacher_edited_question || t.ai_generated_question}</div>
            ${t.student_answer
              ? `<div class="tail-a">${t.student_answer}</div>`
              : `<div class="tail-empty">⏳ 미답변</div>`}
          </div>
        `).join('')}
      </div>
    ` : ''}
  </div>`
}).join('')}
<div class="footer">비커스 · 기본 인성질문 답변집</div>
<script>window.onload=()=>{window.print()}</script></body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">

      {/* 진로 컨셉 카드 */}
      {concept && concept.type_name && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-brand-high-pale via-purple-50 to-pink-50 border border-brand-high-light rounded-xl px-4 py-2.5 flex-shrink-0 shadow-[0_2px_8px_rgba(37,99,235,0.06)]">
          <span className="text-2xl">🎯</span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-brand-high-dark uppercase tracking-wider mb-1">
              내 진로 컨셉
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[12px]">
              <span className="font-bold text-ink bg-white px-2 py-0.5 rounded-full border border-brand-high-light">
                {concept.type_name}
                {concept.type_code && <span className="text-ink-muted ml-1">({concept.type_code}형)</span>}
              </span>
              <span className="text-ink-muted">·</span>
              <span className="font-semibold text-ink">📚 {concept.major}</span>
              <span className="text-ink-muted">→</span>
              <span className="text-ink-secondary">💼 {concept.career}</span>
              {Array.isArray(concept.keywords) && concept.keywords.length > 0 && (
                <>
                  <span className="text-ink-muted">·</span>
                  <span className="text-brand-high font-semibold">
                    {concept.keywords.map((k: string) => `#${k}`).join(' ')}
                  </span>
                </>
              )}
            </div>
            {concept.custom_goal && (
              <div className="text-[11px] text-ink-secondary mt-1 italic">
                📝 {concept.custom_goal}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔥 큰 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">💎 기본 인성질문</div>
          <div className="text-[12px] text-ink-muted mt-0.5">
            {student?.name} · {academy?.academyName}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-brand-high-pale text-brand-high-dark text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-brand-high-light">
            {curQuestions.filter(q => q.answer?.student_answer).length}/{curQuestions.length} 답변완료
          </div>
          <button onClick={printAnswers}
            className="px-4 py-1.5 bg-white text-brand-high-dark border border-brand-high-light rounded-full text-[12px] font-semibold hover:bg-brand-high-pale flex items-center gap-1.5 transition-all">
            🖨️ 최종 답변집 인쇄
          </button>
        </div>
      </div>

      {/* 🔥 작은 알약 헤더 */}
      <div className="flex gap-1.5 flex-shrink-0 items-center">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-brand-high">
          💎 기본 인성질문 · 30개
        </span>
        <span className="text-[10px] text-gray-400 font-medium">모든 대학 공통</span>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* 왼쪽 질문 목록 */}
        <div className="w-[360px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-3 border-b border-line-light flex-shrink-0">
            <div className="text-[13px] font-bold text-ink tracking-tight">💎 기본 인성질문</div>
            <div className="text-[11px] text-ink-secondary mt-0.5 font-medium">모든 대학 공통</div>
            <div className="text-[11px] text-ink-secondary mt-1.5 font-medium leading-[1.7]">
              총 <span className="text-brand-high-dark font-bold">{curQuestions.length}개</span><br />
              답변완료 <span className="text-emerald-600 font-bold">{curQuestions.filter(q => q.answer?.student_answer).length}개</span> ·
              미답변 <span className="text-amber-600 font-bold">{curQuestions.filter(q => !q.answer?.student_answer).length}개</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {loadingQ ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">불러오는 중...</div>
            ) : curQuestions.length === 0 ? (
              <div className="text-center py-10 text-ink-muted"><div className="text-3xl mb-2">📝</div><div className="text-[12px]">기본 인성질문이 없어요.</div></div>
            ) : curQuestions.map((q, i) => {
              const qType = inferQuestionType(q.question)
              const isAnswered = !!q.answer?.student_answer
              return (
                <div key={q.id}
                  onClick={() => { setSelQ(q); setEditingStep1(false); setEditingStep3(false) }}
                  className={`border rounded-xl px-3 py-2.5 mb-1.5 cursor-pointer transition-all ${selQ?.id === q.id ? 'border-brand-high bg-brand-high-pale shadow-[0_2px_8px_rgba(37,99,235,0.1)]' : 'border-line bg-white hover:border-brand-high-light hover:shadow-sm'}`}>
                  <div className="flex gap-1 mb-1.5">
                    <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full">Q{i + 1}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLOR[qType] || TYPE_COLOR['공통']}`}>{qType}</span>
                  </div>
                  <div className="text-[12.5px] text-ink leading-relaxed font-semibold mb-1.5 line-clamp-3">{q.question}</div>
                  {isAnswered
                    ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">답변완료</span>
                    : <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">미답변</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* 오른쪽 상세 */}
        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          {!selQ ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">💎</div>
              <div className="text-[14px] font-semibold text-ink-secondary">질문을 선택해주세요</div>
              <div className="text-[12px]">왼쪽에서 기본 인성질문을 클릭하면 답변을 작성할 수 있어요</div>
            </div>
          ) : (
            <>
              <div className="px-5 py-3.5 border-b border-line-light flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-bold text-ink">Q{curQuestions.findIndex(q => q.id === selQ.id) + 1}</div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLOR[inferQuestionType(selQ.question)] || TYPE_COLOR['공통']}`}>
                      {inferQuestionType(selQ.question)}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${selQ.answer?.student_answer ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                    {selQ.answer?.student_answer ? '답변완료' : '미답변'}
                  </span>
                </div>
                <div className="flex">
                  {STEP_LABELS.map((label, i) => {
                    const stepNum = i + 1
                    const isDone = stepNum < step
                    const isOn = stepNum === step
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                        {i < 4 && <div className={`absolute top-3 left-[55%] w-[90%] h-[1.5px] ${isDone ? 'bg-emerald-500' : 'bg-line'}`} />}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 border-2 transition-all ${isDone ? 'bg-emerald-500 text-white border-emerald-500' : isOn ? 'bg-brand-high text-white border-brand-high shadow-[0_2px_8px_rgba(37,99,235,0.3)]' : 'bg-gray-100 text-ink-muted border-line'}`}>
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div className={`text-[10px] font-semibold whitespace-nowrap ${isDone ? 'text-emerald-600' : isOn ? 'text-brand-high-dark' : 'text-ink-muted'}`}>{label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">

                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">기본 인성 질문</div>
                  <div className="text-[14px] font-bold text-ink leading-relaxed">{selQ.question}</div>
                </div>

                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-bold text-white bg-ink-secondary px-2 py-0.5 rounded-full">Step 1</span>
                    <span className="text-[11px] font-semibold text-ink-secondary">내 첫 답변</span>
                  </div>
                  {selQ.answer?.student_answer && !editingStep1 ? (
                    <div>
                      <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2.5 text-[13px] text-ink leading-relaxed mb-2 whitespace-pre-wrap">{selQ.answer.student_answer}</div>
                      <div className="flex justify-end">
                        <button onClick={() => setEditingStep1(true)} className="text-[11px] font-semibold text-ink-secondary bg-white border border-line rounded-md px-3 py-1 hover:bg-gray-50 transition-all">✏️ 수정</button>
                      </div>
                    </div>
                  ) : (
                    <Step1Box
                      key={selQ.id}
                      studentId={studentId}
                      questionId={selQ.id}
                      existingAnswer={selQ.answer?.student_answer ?? null}
                      editingMode={editingStep1}
                      onSubmit={handleSubmitFirst}
                      onCancel={() => setEditingStep1(false)}
                      isPending={submitFirst.isPending}
                    />
                  )}
                </div>

                {selQ.answer?.student_answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-high px-2 py-0.5 rounded-full">Step 2</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">선생님 1차 피드백</span>
                    </div>
                    {round1?.teacher_feedback ? (
                      <div className="bg-brand-high-pale border border-brand-high-light rounded-lg px-3 py-2.5 text-[13px] text-brand-high-dark leading-relaxed whitespace-pre-wrap">{round1.teacher_feedback}</div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">선생님 피드백을 기다리는 중이에요.</div>
                    )}
                  </div>
                )}

                {round1?.teacher_feedback && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-ink-secondary px-2 py-0.5 rounded-full">Step 3</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">업그레이드 답변</span>
                    </div>
                    {round2?.revised_answer && !editingStep3 ? (
                      <div>
                        <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2.5 text-[13px] text-ink leading-relaxed mb-2 whitespace-pre-wrap">{round2.revised_answer}</div>
                        <div className="flex justify-end">
                          <button onClick={() => setEditingStep3(true)} className="text-[11px] font-semibold text-ink-secondary bg-white border border-line rounded-md px-3 py-1 hover:bg-gray-50 transition-all">✏️ 수정</button>
                        </div>
                      </div>
                    ) : (
                      <Step3Box
                        key={selQ.id}
                        studentId={studentId}
                        questionId={selQ.id}
                        existingUpgrade={round2?.revised_answer ?? null}
                        editingMode={editingStep3}
                        onSubmit={handleSubmitUpgrade}
                        onCancel={() => setEditingStep3(false)}
                        isPending={submitUpgrade.isPending}
                      />
                    )}
                  </div>
                )}

                {round2?.revised_answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">Step 4</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">선생님 최종 피드백</span>
                    </div>
                    {round2.teacher_feedback ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-[13px] text-emerald-900 leading-relaxed whitespace-pre-wrap">{round2.teacher_feedback}</div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">선생님 최종 피드백을 기다리는 중이에요.</div>
                    )}
                  </div>
                )}

                {followups.length > 0 && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-high px-2 py-0.5 rounded-full">Step 5</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">꼬리질문</span>
                    </div>
                    {followups.map((fu, i) => (
                      <div key={fu.id} className="mb-3">
                        <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 border border-line-light rounded-lg mb-2 text-[12px] text-ink leading-relaxed">
                          <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">꼬리 {i + 1}</span>
                          <span>{fu.teacher_edited_question || fu.ai_generated_question}</span>
                        </div>
                        {fu.student_answer ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                            <div className="text-[10px] font-bold text-emerald-700 mb-1">✓ 내 답변</div>
                            <div className="text-[12px] text-ink leading-relaxed whitespace-pre-wrap">{fu.student_answer}</div>
                          </div>
                        ) : (
                          <Step5TailBox
                            studentId={studentId}
                            questionId={selQ.id}
                            tailIndex={i}
                            onSubmit={(text, clearDraft) => handleSubmitFollowup(fu.id, i, text, clearDraft)}
                            isPending={submitFollowup.isPending}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}