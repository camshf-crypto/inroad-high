import { useState, useEffect, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { studentState } from '@/lib/auth/atoms'
import {
  useMyTargetUniversities,
  useMyTargetUniversitiesAll,
  useUpdateMyTargets,
  useAllUniversities,
  useDepartmentsOfUniversity,
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

const MAX_TARGETS = 6

const TYPE_COLOR: Record<string, string> = {
  '공통': 'bg-brand-high-pale text-brand-high-dark border-brand-high-light',
  '전공': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '인성': 'bg-amber-50 text-amber-700 border-amber-200',
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

// ─────────────────────────────────────────────
// Blob → base64
// ─────────────────────────────────────────────
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ─────────────────────────────────────────────
// 자동저장 상태 표시
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// STT 마이크 버튼
// ─────────────────────────────────────────────
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
      className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 text-base transition-all ${
        recording ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100 animate-pulse'
          : processing ? 'bg-amber-50 border-amber-200 text-amber-600 cursor-wait'
          : 'bg-brand-high-pale border-brand-high-light text-brand-high-dark hover:bg-brand-high-pale'
      }`}>
      {recording ? '⏹' : processing ? '⏳' : '🎙️'}
    </button>
  )
}

// ─────────────────────────────────────────────
// Step1 박스
// ─────────────────────────────────────────────
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
  const { text, setText, status, lastSavedAt, clearDraft } = useDraftAutoSave(studentId, `past:answer:${questionId}`, initialValue, disabled)
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

// ─────────────────────────────────────────────
// Step3 박스
// ─────────────────────────────────────────────
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
  const { text, setText, status, lastSavedAt, clearDraft } = useDraftAutoSave(studentId, `past:upgraded:${questionId}`, initialValue, disabled)
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

// ─────────────────────────────────────────────
// Step5 꼬리질문 박스
// ─────────────────────────────────────────────
function Step5TailBox({ studentId, questionId, tailIndex, onSubmit, isPending }: {
  studentId: string | undefined
  questionId: string
  tailIndex: number
  onSubmit: (text: string, clearDraft: () => Promise<void>) => Promise<void>
  isPending: boolean
}) {
  const { text, setText, status, lastSavedAt, clearDraft } = useDraftAutoSave(studentId, `past:tail:${questionId}:${tailIndex}`, '')
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
export default function Past() {
  const student = useAtomValue(studentState)
  const studentId = student?.id ? String(student.id) : undefined

  const [selUnivName, setSelUnivName] = useState('')
  const [selDeptName, setSelDeptName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [univSearch, setUnivSearch] = useState('')
  const [deptSearch, setDeptSearch] = useState('')
  const [univDropOpen, setUnivDropOpen] = useState(false)
  const [deptDropOpen, setDeptDropOpen] = useState(false)
  const [pendingUniv, setPendingUniv] = useState('')
  const [pendingDept, setPendingDept] = useState('')

  const [selQ, setSelQ] = useState<QuestionWithAnswer | null>(null)
  const [editingStep1, setEditingStep1] = useState(false)
  const [editingStep3, setEditingStep3] = useState(false)

  const { data: myTargets = [] } = useMyTargetUniversities()
  const { data: allTargets = [] } = useMyTargetUniversitiesAll()
  const { data: allUnivs = [] } = useAllUniversities()
  const { data: allDepts = [] } = useDepartmentsOfUniversity(pendingUniv)
  const { data: curQuestions = [], isLoading: loadingQ } = useMyPastQuestions(selUnivName, selDeptName)

  const selAnswerId = selQ?.answer?.id
  const { data: analyses = [] } = useMyAnswerAnalyses(selAnswerId)
  const { data: followups = [] } = useMyAnswerFollowups(selAnswerId)

  const updateTargets = useUpdateMyTargets()
  const submitFirst = useSubmitFirstAnswer()
  const submitUpgrade = useSubmitUpgradedAnswer()
  const submitFollowup = useSubmitFollowupAnswer()

  useEffect(() => {
    if (myTargets.length > 0 && !selUnivName) {
      setSelUnivName(myTargets[0].university)
      setSelDeptName(myTargets[0].department)
    }
  }, [myTargets])

  useEffect(() => {
    if (selQ) {
      const updated = curQuestions.find(q => q.id === selQ.id)
      if (updated) setSelQ(updated)
    }
  }, [curQuestions])

  const filteredUnivs = allUnivs.filter(u => u.includes(univSearch))
  const filteredDepts = allDepts.filter(d => d.includes(deptSearch))

  const step = selQ ? getMyStep(selQ.answer, analyses) : 0
  const round1 = analyses.find(a => a.round === 1)
  const round2 = analyses.find(a => a.round === 2)

  const addNewTarget = () => {
    if (!pendingUniv || !pendingDept) { alert('학교와 학과를 모두 선택해주세요!'); return }
    if (myTargets.length >= MAX_TARGETS) { alert(`지원 학교는 최대 ${MAX_TARGETS}개까지 등록 가능해요.`); return }
    const exists = allTargets.find(t => t.university === pendingUniv && t.department === pendingDept)
    if (exists && !exists.hidden) { alert('이미 등록된 학교/학과예요!'); return }
    let newTargets
    if (exists && exists.hidden) {
      newTargets = allTargets.map(t => t.university === pendingUniv && t.department === pendingDept ? { ...t, hidden: false } : t)
    } else {
      newTargets = [...allTargets, { university: pendingUniv, department: pendingDept }]
    }
    updateTargets.mutate(newTargets, {
      onSuccess: () => {
        setSelUnivName(pendingUniv); setSelDeptName(pendingDept); setSelQ(null)
        setPendingUniv(''); setPendingDept(''); setUnivSearch(''); setDeptSearch(''); setShowAddForm(false)
      },
    })
  }

  const removeTarget = (univ: string, dept: string) => {
    if (!window.confirm(`"${univ} · ${dept}" 목록에서 숨길까요?\n\n⚠️ 답변/피드백은 모두 유지돼요.`)) return
    const newTargets = allTargets.map(t => t.university === univ && t.department === dept ? { ...t, hidden: true } : t)
    updateTargets.mutate(newTargets, {
      onSuccess: () => {
        if (selUnivName === univ && selDeptName === dept) {
          const remaining = newTargets.filter(t => !t.hidden && !(t.university === univ && t.department === dept))
          if (remaining.length > 0) { setSelUnivName(remaining[0].university); setSelDeptName(remaining[0].department) }
          else { setSelUnivName(''); setSelDeptName('') }
          setSelQ(null)
        }
      },
    })
  }

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

  const printAnswers = () => {
    const answeredQs = curQuestions.filter(q => q.answer?.student_answer)
    if (answeredQs.length === 0) { alert('답변한 질문이 없어요!'); return }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>기출문제 최종 답변집</title>
<style>body{font-family:'Malgun Gothic',sans-serif;padding:16px 24px;color:#1a1a1a;max-width:800px;margin:0 auto;font-size:11px;}h1{font-size:15px;font-weight:700;margin-bottom:2px;}.sub{font-size:11px;color:#6B7280;margin-bottom:10px;padding-bottom:8px;border-bottom:1.5px solid #1a1a1a;}.block{margin-bottom:10px;padding-bottom:8px;border-bottom:0.5px solid #E5E7EB;}.q-text{font-size:12px;font-weight:600;margin-bottom:5px;line-height:1.4;}.label{font-size:10px;font-weight:600;color:#6B7280;margin-bottom:3px;margin-top:5px;}.answer-box{background:#F8F9FA;border-radius:4px;padding:5px 8px;font-size:11px;line-height:1.5;white-space:pre-wrap;}.footer{text-align:center;font-size:10px;color:#9CA3AF;margin-top:12px;padding-top:8px;border-top:0.5px solid #E5E7EB;}@media print{body{padding:10px 16px;}}</style></head><body>
<h1>기출문제 최종 답변집</h1><div class="sub">${selUnivName} · ${selDeptName}</div>
${answeredQs.map((q, i) => `<div class="block"><div class="q-text">Q${i + 1}. ${q.question}</div><div class="label">내 답변</div><div class="answer-box">${q.answer?.student_answer || ''}</div></div>`).join('')}
<div class="footer">비커스 · ${selUnivName} ${selDeptName} 기출문제 답변집</div>
<script>window.onload=()=>{window.print()}</script></body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  const canAddMore = myTargets.length < MAX_TARGETS

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">

      {/* 상단 학교 탭 */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <div className="flex gap-1.5 items-center flex-wrap">
          <span className="text-[11px] text-ink-muted font-semibold mr-1">내 지원 학교 ({myTargets.length}/{MAX_TARGETS}):</span>
          {myTargets.map((t, i) => {
            const isSelected = selUnivName === t.university && selDeptName === t.department
            return (
              <div key={`${t.university}-${t.department}-${i}`}
                className={`inline-flex items-center gap-1 rounded-full border transition-all ${isSelected ? 'bg-brand-high border-brand-high' : 'bg-white border-line hover:border-brand-high-light'}`}>
                <button onClick={() => { setSelUnivName(t.university); setSelDeptName(t.department); setSelQ(null) }}
                  className={`px-3 py-1.5 text-[11px] ${isSelected ? 'text-white font-bold' : 'text-brand-high-dark font-semibold hover:text-brand-high'}`}>
                  🎓 {t.university} · {t.department}
                </button>
                <button onClick={() => removeTarget(t.university, t.department)}
                  className={`pr-2.5 text-[11px] leading-none ${isSelected ? 'text-white/70 hover:text-white' : 'text-red-400 hover:text-red-600'}`}
                  title="목록에서 숨김">✕</button>
              </div>
            )
          })}
          {canAddMore && !showAddForm && (
            <button onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-all">
              + 학교 추가
            </button>
          )}
          {!canAddMore && <div className="text-[10px] text-amber-600 font-medium px-2">⚠️ 최대 {MAX_TARGETS}개까지 등록 가능</div>}
          <button onClick={printAnswers}
            className="ml-auto px-4 py-1.5 bg-white text-brand-high-dark border border-brand-high-light rounded-full text-[12px] font-semibold hover:bg-brand-high-pale flex items-center gap-1.5 transition-all">
            🖨️ 최종 답변집 인쇄
          </button>
        </div>

        {showAddForm && (
          <div className="flex gap-2 items-center flex-wrap bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
            <span className="text-[11px] font-bold text-emerald-700">지원 학교:</span>
            <div className="relative w-[200px]">
              <div onClick={() => setUnivDropOpen(true)}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2 bg-white h-9 transition-colors cursor-text ${univDropOpen ? 'border-brand-high' : 'border-line hover:border-brand-high-light'}`}>
                <span className="text-[14px] flex-shrink-0">🏫</span>
                <input value={univDropOpen ? univSearch : pendingUniv}
                  onChange={e => { setUnivSearch(e.target.value); setUnivDropOpen(true) }}
                  onFocus={() => setUnivDropOpen(true)}
                  placeholder="학교 검색"
                  className="flex-1 border-none outline-none text-[12px] font-sans bg-transparent text-ink min-w-0" />
                {pendingUniv ? (
                  <button onClick={e => { e.stopPropagation(); setPendingUniv(''); setPendingDept(''); setUnivSearch('') }} className="text-[10px] text-ink-muted hover:text-ink">✕</button>
                ) : <span className="text-[10px] text-ink-muted">▼</span>}
              </div>
              {univDropOpen && (
                <>
                  <div onClick={() => setUnivDropOpen(false)} className="fixed inset-0 z-10" />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-lg z-20 max-h-[200px] overflow-y-auto shadow-lg">
                    {filteredUnivs.length === 0
                      ? <div className="px-3 py-2.5 text-[12px] text-ink-muted text-center">검색 결과 없음</div>
                      : filteredUnivs.map((u, i) => (
                        <div key={i} onClick={() => { setPendingUniv(u); setPendingDept(''); setUnivSearch(''); setDeptSearch(''); setUnivDropOpen(false) }}
                          className={`px-3 py-2 text-[12px] cursor-pointer transition-colors ${pendingUniv === u ? 'bg-brand-high-pale text-brand-high-dark font-semibold' : 'text-ink hover:bg-brand-high-pale/50'} ${i < filteredUnivs.length - 1 ? 'border-b border-line-light' : ''}`}>
                          {u}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
            <span className="text-[14px] text-ink-muted">›</span>
            <div className="relative w-[200px]">
              <div onClick={() => { if (pendingUniv) setDeptDropOpen(true) }}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2 h-9 transition-colors ${deptDropOpen ? 'border-brand-high bg-white' : pendingUniv ? 'border-line bg-white cursor-text hover:border-brand-high-light' : 'border-line-light bg-gray-50 cursor-not-allowed'}`}>
                <span className="text-[14px] flex-shrink-0">📚</span>
                <input value={deptDropOpen ? deptSearch : pendingDept}
                  onChange={e => { if (!pendingUniv) return; setDeptSearch(e.target.value); setDeptDropOpen(true) }}
                  onFocus={() => { if (pendingUniv) setDeptDropOpen(true) }}
                  placeholder={pendingUniv ? '학과 검색' : '학교 먼저 선택'}
                  disabled={!pendingUniv}
                  className="flex-1 border-none outline-none text-[12px] font-sans bg-transparent text-ink min-w-0 disabled:cursor-not-allowed" />
                {pendingDept
                  ? <button onClick={e => { e.stopPropagation(); setPendingDept(''); setDeptSearch('') }} className="text-[10px] text-ink-muted hover:text-ink">✕</button>
                  : <span className={`text-[10px] ${pendingUniv ? 'text-ink-muted' : 'text-gray-300'}`}>▼</span>}
              </div>
              {deptDropOpen && pendingUniv && (
                <>
                  <div onClick={() => setDeptDropOpen(false)} className="fixed inset-0 z-10" />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-lg z-20 max-h-[200px] overflow-y-auto shadow-lg">
                    {filteredDepts.length === 0
                      ? <div className="px-3 py-2.5 text-[12px] text-ink-muted text-center">검색 결과 없음</div>
                      : filteredDepts.map((d, i) => (
                        <div key={i} onClick={() => { setPendingDept(d); setDeptSearch(''); setDeptDropOpen(false) }}
                          className={`px-3 py-2 text-[12px] cursor-pointer transition-colors ${pendingDept === d ? 'bg-brand-high-pale text-brand-high-dark font-semibold' : 'text-ink hover:bg-brand-high-pale/50'} ${i < filteredDepts.length - 1 ? 'border-b border-line-light' : ''}`}>
                          {d}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={addNewTarget} disabled={!pendingUniv || !pendingDept || updateTargets.isPending}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {updateTargets.isPending ? '추가중...' : '✓ 추가'}
            </button>
            <button onClick={() => { setShowAddForm(false); setPendingUniv(''); setPendingDept(''); setUnivSearch(''); setDeptSearch('') }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white text-ink-secondary border border-line hover:bg-gray-50 transition-all">
              취소
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* 왼쪽 질문 목록 */}
        <div className="w-[360px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-3 border-b border-line-light flex-shrink-0">
            {selUnivName && selDeptName ? (
              <>
                <div className="text-[13px] font-bold text-ink tracking-tight">{selUnivName}</div>
                <div className="text-[11px] text-ink-secondary mt-0.5 font-medium">{selDeptName}</div>
                <div className="text-[11px] text-ink-secondary mt-1.5 font-medium leading-[1.7]">
                  총 <span className="text-brand-high-dark font-bold">{curQuestions.length}개</span><br />
                  답변완료 <span className="text-emerald-600 font-bold">{curQuestions.filter(q => q.answer?.student_answer).length}개</span> ·
                  미답변 <span className="text-amber-600 font-bold">{curQuestions.filter(q => !q.answer?.student_answer).length}개</span>
                </div>
              </>
            ) : (
              <div className="text-[12px] text-ink-muted font-medium">위에서 학교를 선택하거나 추가해주세요</div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {!selUnivName || !selDeptName ? (
              <div className="text-center py-10 text-ink-muted"><div className="text-3xl mb-2">🏫</div><div className="text-[12px]">위에서 지원 학교를 선택해주세요</div></div>
            ) : loadingQ ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">불러오는 중...</div>
            ) : curQuestions.length === 0 ? (
              <div className="text-center py-10 text-ink-muted"><div className="text-3xl mb-2">📝</div><div className="text-[12px]">기출문제가 없어요.</div></div>
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
              <div className="text-4xl">🎓</div>
              <div className="text-[14px] font-semibold text-ink-secondary">질문을 선택해주세요</div>
              <div className="text-[12px]">왼쪽에서 기출문제를 클릭하면 답변을 작성할 수 있어요</div>
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
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">기출 질문</div>
                  <div className="text-[14px] font-bold text-ink leading-relaxed">{selQ.question}</div>
                </div>

                {/* Step 1 */}
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

                {/* Step 2 */}
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

                {/* Step 3 */}
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

                {/* Step 4 */}
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

                {/* Step 5 꼬리질문 */}
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