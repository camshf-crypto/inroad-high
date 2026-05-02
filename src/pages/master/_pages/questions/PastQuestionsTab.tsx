import { useState, useMemo } from 'react'
import { useMasterPastQuestions } from '@/pages/master/_hooks/useMasterPastQuestions'
import {
  useDeletePastQuestion,
  useDeleteMultiplePastQuestions,
} from '@/pages/master/_hooks/useDeleteQuestions'
import type { Grade, PastQuestion } from '@/lib/types/questions'
import ExcelUploadModal from './ExcelUploadModal'
import PastDetailModal from './PastDetailModal'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

interface Props {
  grade: Grade
}

export default function PastQuestionsTab({ grade }: Props) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<PastQuestion | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [universityFilter, setUniversityFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: questions = [], isLoading, error } = useMasterPastQuestions(grade)
  const deleteMutation = useDeletePastQuestion()
  const deleteMultipleMutation = useDeleteMultiplePastQuestions()

  const isHigh = grade === 'high'
  const schoolLabel = isHigh ? '대학' : '학교'

  const filtered = useMemo(() => {
    return questions.filter(q => {
      const matchSearch =
        q.question.includes(searchQuery) ||
        (q.major?.includes(searchQuery) ?? false) ||
        q.university.includes(searchQuery) ||
        (q.formula_name?.includes(searchQuery) ?? false)
      const matchUni = universityFilter === 'all' || q.university === universityFilter
      return matchSearch && matchUni
    })
  }, [questions, searchQuery, universityFilter])

  const universities = useMemo(
    () => Array.from(new Set(questions.map(q => q.university))),
    [questions]
  )

  // 현재 표시 중인 항목 중 선택된 것
  const selectedFromFiltered = useMemo(() => {
    return filtered.filter(q => selectedIds.has(q.id))
  }, [filtered, selectedIds])

  // 전체 선택 상태
  const allSelected = filtered.length > 0 && selectedFromFiltered.length === filtered.length
  const someSelected = selectedFromFiltered.length > 0 && !allSelected

  // 체크박스 핸들러
  const toggleAll = () => {
    if (allSelected) {
      // 전체 해제 (현재 보이는 것만)
      const newSet = new Set(selectedIds)
      filtered.forEach(q => newSet.delete(q.id))
      setSelectedIds(newSet)
    } else {
      // 전체 선택 (현재 보이는 것만)
      const newSet = new Set(selectedIds)
      filtered.forEach(q => newSet.add(q.id))
      setSelectedIds(newSet)
    }
  }

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // 단일 삭제
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('정말 삭제하시겠습니까?')) return
    deleteMutation.mutate({ id, grade }, {
      onError: err => alert(`삭제 실패: ${(err as Error).message}`),
    })
  }

  const handleDeleteFromModal = (id: string) => {
    deleteMutation.mutate({ id, grade }, {
      onError: err => alert(`삭제 실패: ${(err as Error).message}`),
    })
  }

  // 선택 항목 일괄 삭제
  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      alert('선택된 항목이 없어요')
      return
    }
    if (!confirm(`선택된 ${ids.length}개 항목을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없어요!`)) return

    deleteMultipleMutation.mutate({ ids, grade }, {
      onSuccess: () => {
        alert(`✅ ${ids.length}개 항목 삭제 완료!`)
        setSelectedIds(new Set())
      },
      onError: err => alert(`삭제 실패: ${(err as Error).message}`),
    })
  }

  return (
    <>
      {/* 액션 바 */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-[400px]">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isHigh ? '대학, 학과, 질문, 공식으로 검색...' : '학교, 질문, 공식으로 검색...'}
              className="w-full pl-10 pr-4 py-2 border border-line rounded-full text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all bg-white"
            />
          </div>

          <select
            value={universityFilter}
            onChange={e => setUniversityFilter(e.target.value)}
            className="px-3.5 py-2 border border-line rounded-full text-[12px] font-bold text-ink-secondary focus:outline-none cursor-pointer bg-white hover:border-purple-300 transition-all"
          >
            <option value="all">전체 {schoolLabel}</option>
            {universities.map(uni => <option key={uni} value={uni}>{uni}</option>)}
          </select>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px"
          style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
        >
          <span>↑</span> 엑셀 업로드
        </button>
      </div>

      {/* 안내 박스 */}
      <div className="mb-4 px-4 py-2.5 border rounded-2xl flex items-start gap-2" style={{ background: THEME.accentBg, borderColor: THEME.accentBorder + '60' }}>
        <span className="text-base">💡</span>
        <div className="text-[12px] text-ink-secondary leading-[1.6]">
          <strong className="text-ink font-bold">{isHigh ? '고등' : '중등'} 기출문제 엑셀 형식:</strong>{' '}
          {isHigh ? <>대학 / 학과 / 전형 / 질문 / <strong>유형(1~67)</strong></> : <>학교 / 질문 / <strong>유형(1~67)</strong></>}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl px-5 py-3.5 mb-4 bg-red-50 border border-red-200">
          <div className="text-[13px] font-bold text-red-700">⚠️ 기출문제를 불러오지 못했어요</div>
          <div className="text-[11px] text-red-600 mt-1">{(error as Error).message}</div>
        </div>
      )}

      {/* ⭐ 선택 액션 바 (선택된 게 있을 때 표시) */}
      {selectedIds.size > 0 && (
        <div className="mb-3 px-4 py-2.5 rounded-2xl border-2 flex items-center justify-between" style={{
          background: THEME.accentBg,
          borderColor: THEME.accentBorder,
        }}>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-extrabold" style={{ color: THEME.accentDark }}>
              ✓ {selectedIds.size}개 선택됨
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] font-bold text-ink-secondary hover:text-ink underline"
            >
              선택 해제
            </button>
          </div>
          <button
            onClick={handleDeleteSelected}
            disabled={deleteMultipleMutation.isPending}
            className="px-4 py-1.5 bg-red-500 text-white text-[12px] font-bold rounded-full hover:bg-red-600 transition-all disabled:opacity-50"
          >
            {deleteMultipleMutation.isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                삭제 중...
              </span>
            ) : (
              <>🗑️ 선택 항목 삭제 ({selectedIds.size})</>
            )}
          </button>
        </div>
      )}

      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        {isLoading ? (
          <div className="px-10 py-16 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-200 rounded-full animate-spin mb-3" style={{ borderTopColor: THEME.accent }} />
            <div className="text-[13px] text-ink-secondary font-medium">기출문제를 불러오는 중...</div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC]">
                {/* ⭐ 전체 선택 체크박스 */}
                <th className="px-4 py-3 border-b border-line w-[44px] text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded cursor-pointer accent-purple-600"
                  />
                </th>
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">{schoolLabel}</th>
                {isHigh && (
                  <>
                    <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">학과</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">전형</th>
                  </>
                )}
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">질문</th>
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">유형 (공식)</th>
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">등록일</th>
                <th className="px-5 py-3 border-b border-line w-[160px]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isHigh ? 8 : 6} className="py-12 text-center">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-[13px] font-medium text-ink-secondary">
                      {questions.length === 0
                        ? `${isHigh ? '고등' : '중등'} 기출문제가 아직 없어요. 엑셀로 업로드해보세요!`
                        : '검색 결과가 없어요'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((q, i) => {
                  const isSelected = selectedIds.has(q.id)
                  return (
                    <tr
                      key={q.id}
                      className="transition-colors hover:bg-gray-50"
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                        background: isSelected ? THEME.accentBg + '40' : undefined,
                      }}
                    >
                      {/* ⭐ 행 체크박스 */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(q.id)}
                          className="w-4 h-4 rounded cursor-pointer accent-purple-600"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2.5 py-1 rounded-full">{q.university}</span>
                      </td>
                      {isHigh && (
                        <>
                          <td className="px-5 py-3 text-[13px] font-bold text-ink">{q.major || '-'}</td>
                          <td className="px-5 py-3 text-[12px] font-semibold text-ink-secondary">{q.admission_type || '-'}</td>
                        </>
                      )}
                      <td className="px-5 py-3 text-[13px] font-medium text-ink">{q.question}</td>
                      <td className="px-5 py-3">
                        {q.formula_id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: THEME.accent, background: THEME.accentBg }}>
                              #{q.formula_id}
                            </span>
                            <span className="text-[12px] font-semibold text-ink-secondary">
                              {q.formula_name || ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-muted">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[12px] font-semibold text-ink-secondary">
                        {q.created_at?.slice(0, 10) || '-'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => setSelectedQuestion(q)}
                            className="px-3 py-1.5 text-[11px] font-bold rounded-full transition-all hover:-translate-y-px"
                            style={{
                              background: THEME.accentBg,
                              color: THEME.accent,
                              border: `1px solid ${THEME.accentBorder}80`,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = THEME.accent
                              e.currentTarget.style.color = '#fff'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = THEME.accentBg
                              e.currentTarget.style.color = THEME.accent
                            }}
                          >
                            상세보기
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, q.id)}
                            className="text-ink-muted hover:text-red-500 transition-colors p-1"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 푸터 - 통계만 */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[12px] font-medium text-ink-secondary">
          총 <strong className="text-ink font-extrabold">{filtered.length}</strong>개 항목
          {filtered.length !== questions.length && ` (전체 ${questions.length}개)`}
        </p>
      </div>

      {/* 모달들 */}
      {showUploadModal && (
        <ExcelUploadModal type="past" grade={grade} onClose={() => setShowUploadModal(false)} />
      )}

      {selectedQuestion && (
        <PastDetailModal
          question={selectedQuestion}
          grade={grade}
          onClose={() => setSelectedQuestion(null)}
          onDelete={handleDeleteFromModal}
        />
      )}
    </>
  )
}