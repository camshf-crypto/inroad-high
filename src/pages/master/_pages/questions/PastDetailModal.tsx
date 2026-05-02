import { useState } from 'react'
import { useAnswerFormulas } from '@/pages/master/_hooks/useAnswerFormulas'
import { useUpdatePastQuestion } from '@/pages/master/_hooks/useDeleteQuestions'
import type { PastQuestion, Grade } from '@/lib/types/questions'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

interface Props {
  question: PastQuestion
  grade: Grade
  onClose: () => void
  onDelete?: (id: string) => void
}

interface EditForm {
  university: string
  department: string
  admission_type: string
  question: string
  formula_id: number | null
  // 중등 전용
  school_type: string
  question_type: string
}

export default function PastDetailModal({ question, grade, onClose, onDelete }: Props) {
  const { data: formulas = [] } = useAnswerFormulas()
  const updateMutation = useUpdatePastQuestion()

  const isHigh = grade === 'high'

  // 수정 모드 상태
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<EditForm>({
    university: question.university,
    department: question.major || '',
    admission_type: question.admission_type || '',
    question: question.question,
    formula_id: question.formula_id ?? null,
    school_type: question.school_type || '',
    question_type: question.question_type || '',
  })

  // 답변 공식 정보 찾기
  const formula = form.formula_id
    ? formulas.find(f => f.id === form.formula_id)
    : null

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    // 원본으로 되돌리기
    setForm({
      university: question.university,
      department: question.major || '',
      admission_type: question.admission_type || '',
      question: question.question,
      formula_id: question.formula_id ?? null,
      school_type: question.school_type || '',
      question_type: question.question_type || '',
    })
    setIsEditing(false)
  }

  const handleSave = () => {
    if (!form.question.trim()) {
      alert('질문을 입력해주세요')
      return
    }

    if (isHigh && !form.university.trim()) {
      alert('대학을 입력해주세요')
      return
    }

    if (isHigh && !form.department.trim()) {
      alert('학과를 입력해주세요')
      return
    }

    if (!isHigh && !form.university.trim()) {
      alert('학교명을 입력해주세요')
      return
    }

    const updateData: any = {
      university: form.university.trim(),
      question: form.question.trim(),
      formula_id: form.formula_id,
    }

    if (isHigh) {
      updateData.department = form.department.trim()
      updateData.admission_type = form.admission_type.trim() || null
    } else {
      updateData.school_type = form.school_type.trim() || null
      updateData.question_type = form.question_type.trim() || null
    }

    updateMutation.mutate(
      { id: question.id, grade, data: updateData },
      {
        onSuccess: () => {
          alert('✅ 수정 완료!')
          setIsEditing(false)
        },
        onError: err => alert(`수정 실패: ${(err as Error).message}`),
      }
    )
  }

  const handleDelete = () => {
    if (!onDelete) return
    if (!confirm('정말 이 기출문제를 삭제하시겠습니까?')) return
    onDelete(question.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={isEditing ? undefined : onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 relative overflow-hidden" style={{ background: THEME.gradient }}>
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }} />
          <div className="relative flex items-start justify-between gap-3">
            <div className="text-white flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{isHigh ? '🎓' : '📚'}</span>
                <div className="text-[18px] font-extrabold tracking-tight">
                  {isEditing ? '✏️ 기출문제 수정' : '기출문제 상세'}
                </div>
                {!isEditing && (
                  <span className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {isHigh ? '고등' : '중등'}
                  </span>
                )}
              </div>
              {isEditing && (
                <div className="text-[12px] font-medium text-white/80">
                  필수 항목을 모두 입력해주세요
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1 flex-shrink-0"
              disabled={updateMutation.isPending}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {isEditing ? (
            // ============================================
            // ✏️ 수정 모드
            // ============================================
            <>
              {/* 대학/학교 */}
              <div>
                <label className="block text-[11px] font-bold text-ink-secondary mb-1.5">
                  {isHigh ? '대학' : '학교'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.university}
                  onChange={e => setForm({ ...form, university: e.target.value })}
                  placeholder={isHigh ? '예: 서원대학교' : '예: 대원외고'}
                  className="w-full px-3.5 py-2.5 border border-line rounded-xl text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all"
                />
              </div>

              {/* 학과 (고등) */}
              {isHigh && (
                <div>
                  <label className="block text-[11px] font-bold text-ink-secondary mb-1.5">
                    학과 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    placeholder="예: 국어교육과"
                    className="w-full px-3.5 py-2.5 border border-line rounded-xl text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all"
                  />
                </div>
              )}

              {/* 전형 (고등) */}
              {isHigh && (
                <div>
                  <label className="block text-[11px] font-bold text-ink-secondary mb-1.5">
                    전형
                  </label>
                  <input
                    type="text"
                    value={form.admission_type}
                    onChange={e => setForm({ ...form, admission_type: e.target.value })}
                    placeholder="예: 학생부종합"
                    className="w-full px-3.5 py-2.5 border border-line rounded-xl text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all"
                  />
                </div>
              )}

              {/* 학교유형/질문유형 (중등) */}
              {!isHigh && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-ink-secondary mb-1.5">
                      학교 유형
                    </label>
                    <input
                      type="text"
                      value={form.school_type}
                      onChange={e => setForm({ ...form, school_type: e.target.value })}
                      placeholder="예: 외국어고, 자사고"
                      className="w-full px-3.5 py-2.5 border border-line rounded-xl text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-ink-secondary mb-1.5">
                      질문 유형
                    </label>
                    <input
                      type="text"
                      value={form.question_type}
                      onChange={e => setForm({ ...form, question_type: e.target.value })}
                      placeholder="예: 자기소개, 지원동기"
                      className="w-full px-3.5 py-2.5 border border-line rounded-xl text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all"
                    />
                  </div>
                </>
              )}

              {/* 질문 */}
              <div>
                <label className="block text-[11px] font-bold text-ink-secondary mb-1.5">
                  질문 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.question}
                  onChange={e => setForm({ ...form, question: e.target.value })}
                  placeholder="기출 질문을 입력하세요..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 border border-line rounded-xl text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all resize-y leading-relaxed"
                />
              </div>

              {/* 답변 공식 선택 */}
              <div>
                <label className="block text-[11px] font-bold text-ink-secondary mb-1.5">
                  답변 공식 (인로드 IP)
                </label>
                <select
                  value={form.formula_id ?? ''}
                  onChange={e => setForm({ ...form, formula_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3.5 py-2.5 border border-line rounded-xl text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all bg-white cursor-pointer"
                >
                  <option value="">선택 안 함</option>
                  {formulas.map(f => (
                    <option key={f.id} value={f.id}>
                      #{f.id} {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            // ============================================
            // 👁️ 보기 모드
            // ============================================
            <>
              {/* 학교 정보 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                    {isHigh ? '대학' : '학교'}
                  </div>
                  <div className="text-[14px] font-extrabold text-ink">
                    {question.university}
                  </div>
                </div>
                {isHigh && question.major && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">학과</div>
                    <div className="text-[14px] font-extrabold text-ink">{question.major}</div>
                  </div>
                )}
                {isHigh && question.admission_type && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">전형</div>
                    <div className="text-[14px] font-extrabold text-ink">{question.admission_type}</div>
                  </div>
                )}
                {!isHigh && question.school_type && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">학교 유형</div>
                    <div className="text-[14px] font-extrabold text-ink">{question.school_type}</div>
                  </div>
                )}
                {!isHigh && question.question_type && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">질문 유형</div>
                    <div className="text-[14px] font-extrabold text-ink">{question.question_type}</div>
                  </div>
                )}
              </div>

              {/* 질문 박스 */}
              <div className="bg-white border-2 rounded-2xl p-5" style={{ borderColor: THEME.accentBorder }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-[16px]">📝</span>
                  <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: THEME.accent }}>
                    기출 질문
                  </div>
                </div>
                <p className="text-[15px] font-bold text-ink leading-[1.7] whitespace-pre-wrap">
                  {question.question}
                </p>
              </div>

              {/* 답변 공식 */}
              {formula ? (
                <div className="bg-white border border-line rounded-2xl p-5">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[16px]">🎯</span>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                      답변 공식 (인로드 IP)
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[14px] font-extrabold px-3 py-1 rounded-full" style={{ background: THEME.accentBg, color: THEME.accent }}>
                      #{formula.id}
                    </span>
                    <span className="text-[16px] font-extrabold text-ink">
                      {formula.name}
                    </span>
                  </div>
                  {formula.guideline && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                      <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5">
                        💡 답변 가이드라인
                      </div>
                      <p className="text-[13px] text-amber-900 leading-relaxed whitespace-pre-wrap">
                        {formula.guideline}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-line rounded-2xl px-5 py-3 text-center">
                  <p className="text-[12px] font-medium text-ink-muted">
                    ℹ️ 답변 공식이 지정되지 않았어요
                  </p>
                </div>
              )}

              {/* 메타 정보 */}
              <div className="text-center text-[11px] font-semibold text-ink-muted">
                📅 {question.created_at?.slice(0, 10)} 등록
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-line bg-[#F8FAFC] flex items-center justify-between gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-white border border-line text-ink-secondary text-[12px] font-bold rounded-full hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                ✕ 취소
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-5 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px disabled:opacity-50"
                style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
              >
                {updateMutation.isPending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    저장 중...
                  </span>
                ) : (
                  <>💾 저장</>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-white border border-red-200 text-red-600 text-[12px] font-bold rounded-full hover:bg-red-50 transition-all"
                  >
                    🗑️ 삭제
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-white border-2 text-[12px] font-bold rounded-full transition-all hover:-translate-y-px"
                  style={{ borderColor: THEME.accent, color: THEME.accent }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = THEME.accent
                    e.currentTarget.style.color = '#fff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#fff'
                    e.currentTarget.style.color = THEME.accent
                  }}
                >
                  ✏️ 수정
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px"
                  style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                >
                  닫기
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}