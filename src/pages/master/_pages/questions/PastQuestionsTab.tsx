import { useState, useMemo, useEffect } from 'react'
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

const CARDS_PER_PAGE = 12

interface Props {
  grade: Grade
}

export default function PastQuestionsTab({ grade }: Props) {
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<PastQuestion | null>(null)
  const [cardSearch, setCardSearch] = useState('')
  const [cardPage, setCardPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: questions = [], isLoading, error } = useMasterPastQuestions(grade)
  const deleteMutation = useDeletePastQuestion()
  const deleteMultipleMutation = useDeleteMultiplePastQuestions()

  const isHigh = grade === 'high'
  const schoolLabel = isHigh ? '대학' : '학교'

  const universityGroups = useMemo(() => {
    const map = new Map<string, PastQuestion[]>()
    questions.forEach(q => {
      if (!map.has(q.university)) map.set(q.university, [])
      map.get(q.university)!.push(q)
    })
    return Array.from(map.entries())
      .map(([university, qs]) => {
        const majors = new Set(qs.map(q => q.major).filter(Boolean) as string[])
        const formulas = new Set(qs.map(q => q.formula_id).filter(Boolean))
        const dates = qs.map(q => q.created_at).filter(Boolean) as string[]
        return {
          university,
          questions: qs,
          questionCount: qs.length,
          majorCount: majors.size,
          formulaCount: formulas.size,
          latestDate: dates.sort().reverse()[0] || null,
        }
      })
      .sort((a, b) => a.university.localeCompare(b.university, 'ko'))
  }, [questions])

  const filteredGroups = useMemo(() => {
    if (!cardSearch.trim()) return universityGroups
    const q = cardSearch.trim()
    return universityGroups.filter(g => g.university.includes(q))
  }, [universityGroups, cardSearch])

  const totalCardPages = Math.max(1, Math.ceil(filteredGroups.length / CARDS_PER_PAGE))
  const paginatedGroups = useMemo(() => {
    const start = (cardPage - 1) * CARDS_PER_PAGE
    return filteredGroups.slice(start, start + CARDS_PER_PAGE)
  }, [filteredGroups, cardPage])

  useEffect(() => { setCardPage(1) }, [cardSearch])
  useEffect(() => {
    if (cardPage > totalCardPages) setCardPage(totalCardPages)
  }, [totalCardPages, cardPage])

  const detailQuestions = useMemo(() => {
    if (!selectedUniversity) return []
    return questions.filter(q => q.university === selectedUniversity)
  }, [questions, selectedUniversity])

  const filteredDetail = useMemo(() => {
    if (!searchQuery.trim()) return detailQuestions
    const q = searchQuery.trim()
    return detailQuestions.filter(item =>
      item.question.includes(q) ||
      (item.major?.includes(q) ?? false) ||
      (item.formula_name?.includes(q) ?? false) ||
      (item.admission_type?.includes(q) ?? false)
    )
  }, [detailQuestions, searchQuery])

  const allSelected = filteredDetail.length > 0 && filteredDetail.every(q => selectedIds.has(q.id))
  const someSelected = filteredDetail.some(q => selectedIds.has(q.id)) && !allSelected

  const toggleAll = () => {
    if (allSelected) {
      const newSet = new Set(selectedIds)
      filteredDetail.forEach(q => newSet.delete(q.id))
      setSelectedIds(newSet)
    } else {
      const newSet = new Set(selectedIds)
      filteredDetail.forEach(q => newSet.add(q.id))
      setSelectedIds(newSet)
    }
  }

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const goBackToCards = () => {
    setSelectedUniversity(null)
    setSearchQuery('')
    setSelectedIds(new Set())
  }

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

  // 🔥 대학 카드 통째 삭제
  const handleDeleteUniversity = (e: React.MouseEvent, group: typeof universityGroups[number]) => {
    e.stopPropagation()
    const msg = `⚠️ "${group.university}"의 모든 기출문제를 삭제하시겠습니까?\n\n` +
                `삭제될 항목: ${group.questionCount}개\n` +
                `이 작업은 되돌릴 수 없어요!`
    if (!confirm(msg)) return

    const ids = group.questions.map(q => q.id)
    deleteMultipleMutation.mutate({ ids, grade }, {
      onSuccess: () => {
        alert(`✅ ${group.university}의 ${ids.length}개 항목이 모두 삭제됐어요!`)
      },
      onError: err => alert(`삭제 실패: ${(err as Error).message}`),
    })
  }

  const pageNumbers = useMemo(() => {
    const result: (number | 'ellipsis')[] = []
    const range = 2
    if (totalCardPages <= 7) {
      for (let i = 1; i <= totalCardPages; i++) result.push(i)
    } else {
      result.push(1)
      if (cardPage - range > 2) result.push('ellipsis')
      const start = Math.max(2, cardPage - range)
      const end = Math.min(totalCardPages - 1, cardPage + range)
      for (let i = start; i <= end; i++) result.push(i)
      if (cardPage + range < totalCardPages - 1) result.push('ellipsis')
      result.push(totalCardPages)
    }
    return result
  }, [totalCardPages, cardPage])

  const tableMinWidth = isHigh ? 1180 : 870
  const rangeStart = filteredGroups.length === 0 ? 0 : (cardPage - 1) * CARDS_PER_PAGE + 1
  const rangeEnd = Math.min(cardPage * CARDS_PER_PAGE, filteredGroups.length)

  // ====== 상세 화면 ======
  if (selectedUniversity) {
    return (
      <>
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={goBackToCards}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-line text-[12px] font-bold rounded-full text-ink-secondary hover:bg-gray-50 hover:border-purple-300 hover:text-purple-600 transition-all"
            >
              ← {schoolLabel} 목록
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏫</span>
              <div>
                <div className="text-[18px] font-extrabold tracking-tight" style={{ color: THEME.accentDark }}>
                  {selectedUniversity}
                </div>
                <div className="text-[11px] font-medium text-ink-secondary">
                  총 <strong style={{ color: THEME.accent }}>{detailQuestions.length}개</strong> 기출문제
                  {filteredDetail.length !== detailQuestions.length && ` · 검색 결과 ${filteredDetail.length}개`}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-[280px]">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="학과, 질문, 공식 검색..."
                className="w-full pl-10 pr-4 py-2 border border-line rounded-full text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all bg-white"
              />
            </div>

            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px whitespace-nowrap"
              style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
            >
              <span>↑</span> 엑셀 업로드
            </button>
          </div>
        </div>

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

        <div className="bg-white border border-line rounded-2xl overflow-x-auto shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <table className="w-full border-collapse" style={{ minWidth: tableMinWidth, tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-[#F8FAFC]">
                <th className="px-4 py-3 border-b border-line text-center" style={{ width: 44 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded cursor-pointer accent-purple-600"
                  />
                </th>
                {isHigh && (
                  <>
                    <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line" style={{ width: 200 }}>학과</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line" style={{ width: 130 }}>전형</th>
                  </>
                )}
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">질문</th>
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line" style={{ width: 180 }}>유형 (공식)</th>
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line" style={{ width: 110 }}>등록일</th>
                <th className="px-5 py-3 border-b border-line" style={{ width: 160 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredDetail.length === 0 ? (
                <tr>
                  <td colSpan={isHigh ? 7 : 5} className="py-12 text-center">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-[13px] font-medium text-ink-secondary">검색 결과가 없어요</p>
                  </td>
                </tr>
              ) : (
                filteredDetail.map((q, i) => {
                  const isSelected = selectedIds.has(q.id)
                  return (
                    <tr key={q.id} className="transition-colors hover:bg-gray-50"
                      style={{
                        borderBottom: i < filteredDetail.length - 1 ? '1px solid #F1F5F9' : 'none',
                        background: isSelected ? THEME.accentBg + '40' : undefined,
                      }}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(q.id)}
                          className="w-4 h-4 rounded cursor-pointer accent-purple-600"
                        />
                      </td>

                      {isHigh && (
                        <>
                          <td className="px-5 py-3 text-[13px] font-bold text-ink truncate" title={q.major || ''}>
                            {q.major || '-'}
                          </td>
                          <td className="px-5 py-3 text-[12px] font-semibold text-ink-secondary truncate" title={q.admission_type || ''}>
                            {q.admission_type || '-'}
                          </td>
                        </>
                      )}

                      <td className="px-5 py-3 text-[13px] font-medium text-ink leading-relaxed"
                        style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}
                      >
                        {q.question}
                      </td>

                      <td className="px-5 py-3">
                        {q.formula_id ? (
                          <div className="inline-flex items-center gap-1.5 max-w-full">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                              style={{ color: THEME.accent, background: THEME.accentBg }}
                            >
                              #{q.formula_id}
                            </span>
                            <span className="text-[12px] font-semibold text-ink-secondary truncate" title={q.formula_name || ''}>
                              {q.formula_name || ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-muted">-</span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-[12px] font-semibold text-ink-secondary whitespace-nowrap">
                        {q.created_at?.slice(0, 10) || '-'}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => setSelectedQuestion(q)}
                            className="px-3 py-1.5 text-[11px] font-bold rounded-full transition-all hover:-translate-y-px whitespace-nowrap"
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
        </div>

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

  // ====== 카드 일람 화면 ======
  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-[400px]">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={cardSearch}
              onChange={e => setCardSearch(e.target.value)}
              placeholder={`${schoolLabel} 이름으로 검색...`}
              className="w-full pl-10 pr-4 py-2 border border-line rounded-full text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all bg-white"
            />
          </div>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px whitespace-nowrap"
          style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
        >
          <span>↑</span> 엑셀 업로드
        </button>
      </div>

      <div className="mb-4 px-4 py-2.5 border rounded-2xl flex items-start gap-2" style={{ background: THEME.accentBg, borderColor: THEME.accentBorder + '60' }}>
        <span className="text-base">💡</span>
        <div className="text-[12px] text-ink-secondary leading-[1.6]">
          <strong className="text-ink font-bold">{isHigh ? '고등' : '중등'} 기출문제 엑셀 형식:</strong>{' '}
          {isHigh ? <>대학 / 학과 / 전형 / 질문 / <strong>유형(1~67)</strong></> : <>학교 / 질문 / <strong>유형(1~67)</strong></>}
          <span className="mx-1.5">·</span>
          {schoolLabel} 카드를 클릭하면 상세 문제 목록으로 들어가요.
        </div>
      </div>

      {error && (
        <div className="rounded-2xl px-5 py-3.5 mb-4 bg-red-50 border border-red-200">
          <div className="text-[13px] font-bold text-red-700">⚠️ 기출문제를 불러오지 못했어요</div>
          <div className="text-[11px] text-red-600 mt-1">{(error as Error).message}</div>
        </div>
      )}

      <div className="mb-4 px-4 py-3 bg-white border border-line rounded-2xl flex items-center gap-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">{schoolLabel} 수</span>
          <span className="text-[16px] font-extrabold" style={{ color: THEME.accent }}>
            {universityGroups.length.toLocaleString()}
          </span>
        </div>
        <div className="w-px h-5 bg-line" />
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">총 문제 수</span>
          <span className="text-[16px] font-extrabold text-ink">
            {questions.length.toLocaleString()}
          </span>
        </div>
        {cardSearch && (
          <>
            <div className="w-px h-5 bg-line" />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">검색 결과</span>
              <span className="text-[16px] font-extrabold" style={{ color: THEME.accentDark }}>
                {filteredGroups.length}개
              </span>
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white border border-line rounded-2xl px-10 py-16 text-center">
          <div className="inline-block w-6 h-6 border-2 border-gray-200 rounded-full animate-spin mb-3" style={{ borderTopColor: THEME.accent }} />
          <div className="text-[13px] text-ink-secondary font-medium">기출문제를 불러오는 중...</div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl px-10 py-16 text-center">
          <div className="text-4xl mb-2">{questions.length === 0 ? '📭' : '🔍'}</div>
          <p className="text-[13px] font-medium text-ink-secondary">
            {questions.length === 0
              ? `${isHigh ? '고등' : '중등'} 기출문제가 아직 없어요. 엑셀로 업로드해보세요!`
              : '검색 결과가 없어요'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 gap-3 mb-5">
            {paginatedGroups.map(group => (
              <div
                key={group.university}
                className="relative bg-white border-2 rounded-2xl transition-all hover:-translate-y-1 group"
                style={{ borderColor: '#E5E7EB' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = THEME.accentBorder
                  e.currentTarget.style.boxShadow = `0 8px 24px ${THEME.accentShadow}`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#E5E7EB'
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                {/* 우상단 삭제 버튼 - 호버 시 표시 */}
                <button
                  onClick={(e) => handleDeleteUniversity(e, group)}
                  disabled={deleteMultipleMutation.isPending}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white border border-line text-ink-muted opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all flex items-center justify-center z-10 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  title={`${group.university} 전체 삭제`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* 카드 본체 - 클릭 시 상세보기 */}
                <button
                  onClick={() => setSelectedUniversity(group.university)}
                  className="text-left w-full px-5 py-4 cursor-pointer"
                >
                  <div
                    className="h-1 rounded-full mb-3"
                    style={{ background: THEME.gradient, width: '40%' }}
                  />

                  <div className="flex items-start gap-2 mb-3 pr-8">
                    <span className="text-xl flex-shrink-0">🏫</span>
                    <div className="text-[15px] font-extrabold text-ink leading-tight line-clamp-2" title={group.university}>
                      {group.university}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-ink-muted">문제</span>
                      <span className="text-[14px] font-extrabold" style={{ color: THEME.accent }}>
                        {group.questionCount.toLocaleString()}개
                      </span>
                    </div>
                    {isHigh && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-ink-muted">학과</span>
                        <span className="text-[12px] font-bold text-ink-secondary">
                          {group.majorCount}개
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-ink-muted">유형</span>
                      <span className="text-[12px] font-bold text-ink-secondary">
                        {group.formulaCount}개
                      </span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between pt-2.5 border-t border-line-light">
                    <div>
                      <div className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">최근 등록</div>
                      <div className="text-[11px] font-bold text-ink-secondary">
                        {group.latestDate?.slice(0, 10) || '-'}
                      </div>
                    </div>
                    <span
                      className="text-[11px] font-bold transition-all group-hover:translate-x-0.5"
                      style={{ color: THEME.accent }}
                    >
                      상세보기 →
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-[12px] font-medium text-ink-secondary">
              <strong className="text-ink font-extrabold">{filteredGroups.length.toLocaleString()}</strong>개 중{' '}
              <strong className="text-ink font-extrabold">{rangeStart.toLocaleString()}-{rangeEnd.toLocaleString()}</strong>
            </p>

            {totalCardPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCardPage(1)}
                  disabled={cardPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-line bg-white text-[11px] font-bold text-ink-secondary hover:border-purple-300 hover:text-purple-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="처음"
                >
                  ‹‹
                </button>
                <button
                  onClick={() => setCardPage(p => Math.max(1, p - 1))}
                  disabled={cardPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-line bg-white text-[11px] font-bold text-ink-secondary hover:border-purple-300 hover:text-purple-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="이전"
                >
                  ‹
                </button>

                {pageNumbers.map((n, idx) =>
                  n === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-1 text-[11px] text-ink-muted">···</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setCardPage(n)}
                      className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-[12px] font-bold transition-all ${
                        cardPage === n
                          ? 'text-white border-0'
                          : 'border border-line bg-white text-ink-secondary hover:border-purple-300 hover:text-purple-600'
                      }`}
                      style={cardPage === n ? { background: THEME.gradient, boxShadow: `0 2px 8px ${THEME.accentShadow}` } : undefined}
                    >
                      {n}
                    </button>
                  )
                )}

                <button
                  onClick={() => setCardPage(p => Math.min(totalCardPages, p + 1))}
                  disabled={cardPage === totalCardPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-line bg-white text-[11px] font-bold text-ink-secondary hover:border-purple-300 hover:text-purple-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="다음"
                >
                  ›
                </button>
                <button
                  onClick={() => setCardPage(totalCardPages)}
                  disabled={cardPage === totalCardPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-line bg-white text-[11px] font-bold text-ink-secondary hover:border-purple-300 hover:text-purple-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="마지막"
                >
                  ››
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {showUploadModal && (
        <ExcelUploadModal type="past" grade={grade} onClose={() => setShowUploadModal(false)} />
      )}
    </>
  )
}