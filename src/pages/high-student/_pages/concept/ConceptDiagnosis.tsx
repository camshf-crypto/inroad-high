// src/pages/high-student/_pages/concept/ConceptDiagnosis.tsx

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { QUESTIONS, PARTS, calculateType } from './questions'
import type { ConceptData } from './CareerConcept'

interface Props {
  conceptData: ConceptData | null
  studentId: string
  academyId: string
  grade: string
  prevConcept: ConceptData | null
  onComplete: () => void
  onDirectSelect: () => void
}

const SAVE_INTERVAL = 10 // 10문항마다 자동 저장

export default function ConceptDiagnosis({ conceptData, studentId, academyId, grade, prevConcept, onComplete, onDirectSelect }: Props) {
  // 진입 시: 답변이 있으면 팝업 띄우기 / 없으면 첫 화면
  const hasExistingProgress = !!conceptData && Object.keys(conceptData.answers ?? {}).length > 0

  const [answers, setAnswers] = useState<Record<number, string>>(
    (conceptData?.answers as Record<number, string>) ?? {}
  )
  const [currentQ, setCurrentQ] = useState(conceptData?.current_question ?? 1)
  const [saving, setSaving] = useState(false)
  const [started, setStarted] = useState(false)
  const [showResumeDialog, setShowResumeDialog] = useState(hasExistingProgress)
  const [submitting, setSubmitting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalAnswered = Object.keys(answers).length
  const progress = Math.round((totalAnswered / 200) * 100)
  const currentQuestion = QUESTIONS.find(q => q.id === currentQ)
  const currentPart = PARTS.find(p => currentQ >= (p.part === 1 ? 1 : p.part === 2 ? 41 : p.part === 3 ? 101 : 141) &&
    currentQ <= (p.part === 1 ? 40 : p.part === 2 ? 100 : p.part === 3 ? 140 : 200))

  // 자동 저장
  const saveProgress = async (updatedAnswers: Record<number, string>, qNum: number) => {
    setSaving(true)
    try {
      const { data: existing } = await supabase
        .from('student_concept')
        .select('id')
        .eq('student_id', studentId)
        .eq('academy_id', academyId)
        .eq('grade', grade)
        .maybeSingle()

      const payload = {
        student_id: studentId,
        academy_id: academyId,
        grade,
        answers: updatedAnswers,
        current_question: qNum,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        await supabase.from('student_concept').update(payload).eq('id', existing.id)
      } else {
        await supabase.from('student_concept').insert(payload)
      }
    } catch (e) {
      console.error('저장 실패:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleAnswer = async (questionId: number, choice: string) => {
    const updatedAnswers = { ...answers, [questionId]: choice }
    setAnswers(updatedAnswers)

    const nextQ = questionId + 1
    if (nextQ <= 200) {
      setCurrentQ(nextQ)
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }

    if (questionId % SAVE_INTERVAL === 0 || questionId === 200) {
      await saveProgress(updatedAnswers, nextQ)
    }
  }

  const handlePrev = () => {
    if (currentQ > 1) {
      setCurrentQ(prev => prev - 1)
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToStart = () => {
    if (window.confirm('진로 계열 검사 처음 화면으로 돌아갈까요?\n지금까지 답변은 저장돼있어서 나중에 이어서 풀 수 있어요.')) {
      setStarted(false)
    }
  }

  const handleResume = () => {
    setShowResumeDialog(false)
    setStarted(true)
  }

  const handleRestart = async () => {
    if (!window.confirm('정말 처음부터 다시 시작할까요?\n기존 답변은 모두 삭제돼요.')) return

    setSaving(true)
    try {
      if (conceptData?.id) {
        await supabase
          .from('student_concept')
          .update({
            answers: {},
            current_question: 1,
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('id', conceptData.id)
      }

      setAnswers({})
      setCurrentQ(1)
      setShowResumeDialog(false)
      setStarted(false)
    } catch (e) {
      console.error(e)
      alert('초기화에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (totalAnswered < 200) {
      alert(`아직 ${200 - totalAnswered}문항이 남았어요. 모든 문항에 답해주세요.`)
      return
    }

    setSubmitting(true)
    try {
      const result = calculateType(answers)

      const { data: existing } = await supabase
        .from('student_concept')
        .select('id')
        .eq('student_id', studentId)
        .eq('academy_id', academyId)
        .eq('grade', grade)
        .maybeSingle()

      const payload = {
        student_id: studentId,
        academy_id: academyId,
        grade,
        answers,
        current_question: 200,
        status: 'completed',
        type_code: result.typeCode,
        type_name: result.typeName,
        scores: result.scores,
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        await supabase.from('student_concept').update(payload).eq('id', existing.id)
      } else {
        await supabase.from('student_concept').insert(payload)
      }

      onComplete()
    } catch (e) {
      console.error(e)
      alert('제출에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 이어하기 팝업 ──
  if (showResumeDialog) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center px-6 py-5 bg-[#F8FAFC]">
        <div className="max-w-[440px] w-full bg-white border border-line rounded-2xl p-5 shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
          <div className="text-center mb-4">
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center text-2xl mb-2.5 shadow-[0_4px_12px_rgba(245,158,11,0.2)]">
              📝
            </div>
            <div className="text-[16px] font-extrabold text-ink mb-1">이전에 풀던 진단이 있어요</div>
            <div className="text-[12px] text-ink-secondary leading-relaxed">
              <span className="font-bold text-brand-high-dark">Q.{String(conceptData?.current_question ?? 1).padStart(3, '0')}</span>까지 답변하셨어요
              <span className="mx-1">·</span>
              <span className="font-semibold">{totalAnswered}/200</span> ({progress}%)
            </div>
          </div>

          <div className="mb-4">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-high to-brand-high-dark rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleResume}
              className="w-full py-3 bg-gradient-to-r from-brand-high-dark to-brand-high text-white rounded-lg text-[13px] font-bold hover:opacity-90 transition-all shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
            >
              ▶ 이어서 풀기 ({totalAnswered + 1}번 문항부터)
            </button>
            <button
              onClick={handleRestart}
              disabled={saving}
              className="w-full py-2.5 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              {saving ? '초기화 중...' : '🔄 처음부터 다시 풀기'}
            </button>
            <button
              onClick={() => { setShowResumeDialog(false); setStarted(false) }}
              className="w-full py-2 text-[11px] text-ink-muted hover:text-ink transition-colors"
            >
              다른 방법 선택하기 (계열검사/직접선택)
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 시작 화면 ──
  if (!started) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center px-6 py-5 bg-[#F8FAFC]">
        <div className="max-w-[560px] w-full">
          <div className="text-center mb-4">
            <div className="w-10 h-10 mx-auto bg-gradient-to-br from-brand-high-dark to-brand-high rounded-lg flex items-center justify-center text-xl mb-2 shadow-[0_4px_12px_rgba(37,99,235,0.2)]">🎯</div>
            <div className="text-[17px] font-extrabold text-ink tracking-tight mb-0.5">{grade} 진로 계열 검사 설정</div>
            <div className="text-[12px] text-ink-secondary">방법을 선택해주세요</div>
          </div>

          {hasExistingProgress && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
              <div className="text-[11px] text-amber-800">
                <span className="font-bold">📝 저장된 진단:</span> {totalAnswered}/200 ({progress}%)
              </div>
              <button
                onClick={() => setStarted(true)}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline"
              >
                이어서 풀기 →
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={() => setStarted(true)}
              className="bg-white border-2 border-line rounded-xl p-4 text-left hover:border-brand-high hover:shadow-[0_4px_20px_rgba(37,99,235,0.1)] transition-all hover:-translate-y-px group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xl">📝</div>
                <div className="text-[14px] font-extrabold text-ink group-hover:text-brand-high-dark">계열 검사하기</div>
              </div>
              <div className="text-[11px] text-ink-secondary leading-relaxed mb-2.5">
                200문항으로 내 성향과 유형을 분석해 맞는 계열/학과를 추천받아요
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] text-ink-muted">⏱ 약 30~40분 소요</div>
                <div className="text-[10.5px] text-ink-muted">💾 중간 저장 가능</div>
                <div className="text-[10.5px] text-ink-muted">✓ 선생님 승인 후 결과 확인</div>
              </div>
            </button>

            <button
              onClick={onDirectSelect}
              className="bg-white border-2 border-line rounded-xl p-4 text-left hover:border-brand-high hover:shadow-[0_4px_20px_rgba(37,99,235,0.1)] transition-all hover:-translate-y-px group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xl">🎯</div>
                <div className="text-[14px] font-extrabold text-ink group-hover:text-brand-high-dark">직접 선택하기</div>
              </div>
              <div className="text-[11px] text-ink-secondary leading-relaxed mb-2.5">
                계열/학과/직업을 직접 선택해서 바로 진로 컨셉을 설정해요
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] text-ink-muted">⚡ 5분 이내 완료</div>
                <div className="text-[10.5px] text-ink-muted">🔄 언제든 수정 가능</div>
                {prevConcept?.major && <div className="text-[10.5px] text-brand-high font-semibold">↩ 이전 컨셉 참고 추천 제공</div>}
              </div>
            </button>
          </div>

          <div className="text-center text-[11px] text-ink-muted">
            계열 검사를 하면 더 정확한 추천을 받을 수 있어요
          </div>
        </div>
      </div>
    )
  }

  if (!currentQuestion) return null

  const isAnswered = !!answers[currentQ]
  const canSubmit = totalAnswered === 200

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F8FAFC]">
      {/* 상단 진행 바 - 컴팩트 */}
      <div className="bg-white border-b border-line px-6 py-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToStart}
              className="text-[11px] font-medium text-ink-secondary hover:text-brand-high-dark transition-colors flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-gray-50"
              title="진로 계열 검사 처음 화면으로 (답변은 저장돼요)"
            >
              ← 처음으로
            </button>
            <div className="w-px h-3 bg-line" />
            <span className="text-[11px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full border border-brand-high-light">
              {currentPart?.title}
            </span>
            <span className="text-[11px] text-ink-muted">
              Q.{String(currentQ).padStart(3, '0')} / 200
            </span>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-[10px] text-ink-muted">저장 중...</span>}
            <span className="text-[11px] font-semibold text-ink">{progress}% 완료</span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-high to-brand-high-dark rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ⭐ 문항 영역 - flex로 가운데 정렬 (위 진행률 바 제외하고 남은 공간 가운데) */}
      <div ref={containerRef} className="flex-1 overflow-y-auto flex items-center">
        <div className="max-w-[700px] mx-auto px-6 py-6 w-full">

          {/* 문항 번호 + 질문 */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-brand-high text-white text-[13px] font-extrabold flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(37,99,235,0.25)]">
                {currentQ}
              </span>
              <div className="text-[11px] font-semibold text-ink-muted">
                {currentPart?.title} · {currentPart?.desc}
              </div>
            </div>
            <div className="text-[17px] font-bold text-ink leading-[1.4] tracking-tight">
              {currentQuestion.text}
            </div>
          </div>

          {/* 선택지 */}
          <div className="flex flex-col gap-2.5 mb-5">
            {currentQuestion.choices.map((choice, idx) => {
              const choiceNum = String(idx + 1)
              const isSelected = answers[currentQ] === choiceNum
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(currentQ, choiceNum)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all hover:-translate-y-px text-[13.5px] font-medium leading-relaxed ${
                    isSelected
                      ? 'border-brand-high bg-brand-high text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)]'
                      : 'border-line bg-white text-ink hover:border-brand-high-light hover:shadow-sm'
                  }`}
                >
                  {choice}
                </button>
              )
            })}
          </div>

          {/* 이전/다음 버튼 */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentQ === 1}
              className="px-4 py-2 border border-line rounded-lg text-[12px] font-medium text-ink-secondary hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← 이전
            </button>

            <div className="text-[11px] text-ink-muted">
              답변: <span className="font-bold text-brand-high">{totalAnswered}</span> / 200
            </div>

            {currentQ < 200 ? (
              <button
                onClick={() => {
                  if (currentQ < 200) {
                    setCurrentQ(prev => prev + 1)
                    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
                disabled={!isAnswered}
                className="px-4 py-2 bg-brand-high text-white rounded-lg text-[12px] font-semibold hover:bg-brand-high-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                다음 →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="px-4 py-2 bg-gradient-to-r from-brand-high-dark to-brand-high text-white rounded-lg text-[12px] font-bold shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? '제출 중...' : '🎯 진단 제출하기'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}