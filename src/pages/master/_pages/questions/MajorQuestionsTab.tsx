import { useState } from 'react'
import { useMasterMajorDepartments } from '@/pages/master/_hooks/useMasterMajorQuestions'
import { useDeleteMajorDepartment } from '@/pages/master/_hooks/useDeleteQuestions'
import type { Grade, SchoolYear, MajorDepartmentSummary } from '@/lib/types/questions'
import ExcelUploadModal from './ExcelUploadModal'
import MajorDetailModal from './MajorDetailModal'

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

type YearFilter = 'all' | SchoolYear

export default function MajorQuestionsTab({ grade }: Props) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedDept, setSelectedDept] = useState<MajorDepartmentSummary | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [yearFilter, setYearFilter] = useState<YearFilter>('all')

  const { data: departments = [], isLoading, error } = useMasterMajorDepartments(grade)
  const deleteMutation = useDeleteMajorDepartment()

  const filtered = departments.filter(m => {
    if (yearFilter !== 'all' && m.school_year !== yearFilter) return false
    return (
      m.department_name.includes(searchQuery) ||
      m.department_code.includes(searchQuery) ||
      m.master_code.includes(searchQuery)
    )
  })

  const yearCounts = {
    all: departments.length,
    1: departments.filter(m => m.school_year === 1).length,
    2: departments.filter(m => m.school_year === 2).length,
    3: departments.filter(m => m.school_year === 3).length,
  }

  const yearChips: { value: YearFilter; label: string; count: number }[] = [
    { value: 'all', label: '전체', count: yearCounts.all },
    { value: 1, label: '1학년', count: yearCounts[1] },
    { value: 2, label: '2학년', count: yearCounts[2] },
    { value: 3, label: '3학년', count: yearCounts[3] },
  ]

  const handleDelete = (e: React.MouseEvent, masterCode: string, name: string) => {
    e.stopPropagation()
    if (!confirm(`"${name}" 전체를 삭제하시겠습니까? (모든 질문이 삭제됩니다)`)) return
    deleteMutation.mutate(masterCode, {
      onError: err => alert(`삭제 실패: ${(err as Error).message}`),
    })
  }

  return (
    <>
      {/* 액션 바 */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="relative flex-1 max-w-[400px]">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="학과명, 학과코드, 마스터코드로 검색..."
            className="w-full pl-10 pr-4 py-2 border border-line rounded-full text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all bg-white"
          />
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px"
          style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
        >
          <span>↑</span> 엑셀 업로드
        </button>
      </div>

      {/* 학년 칩 */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mr-1">학년</span>
        {yearChips.map(chip => {
          const active = yearFilter === chip.value
          return (
            <button
              key={chip.value}
              onClick={() => setYearFilter(chip.value)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all hover:-translate-y-px"
              style={{
                background: active ? THEME.accent : '#fff',
                color: active ? '#fff' : '#64748B',
                border: active ? `1px solid ${THEME.accent}` : '1px solid #E2E8F0',
                boxShadow: active ? `0 4px 12px ${THEME.accentShadow}` : 'none',
              }}
            >
              {chip.label}
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{
                background: active ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                color: active ? '#fff' : '#94A3B8',
              }}>
                {chip.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* 안내 박스 */}
      <div className="mb-4 px-4 py-2.5 border rounded-2xl flex items-start gap-2" style={{ background: THEME.accentBg, borderColor: THEME.accentBorder + '60' }}>
        <span className="text-base">💡</span>
        <div className="text-[12px] text-ink-secondary leading-[1.6]">
          <strong className="text-ink font-bold">{grade === 'high' ? '고등' : '중등'} 전공질문:</strong>{' '}
          학과 카드를 클릭하면 모든 질문을 확인할 수 있어요.
        </div>
      </div>

      {error && (
        <div className="rounded-2xl px-5 py-3.5 mb-4 bg-red-50 border border-red-200">
          <div className="text-[13px] font-bold text-red-700">⚠️ 전공질문을 불러오지 못했어요</div>
          <div className="text-[11px] text-red-600 mt-1">{(error as Error).message}</div>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white border border-line rounded-2xl px-10 py-16 text-center">
          <div className="inline-block w-6 h-6 border-2 border-gray-200 rounded-full animate-spin mb-3" style={{ borderTopColor: THEME.accent }} />
          <div className="text-[13px] text-ink-secondary font-medium">전공질문을 불러오는 중...</div>
        </div>
      ) : (
        <>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map(m => (
                <div
                  key={m.master_code}
                  onClick={() => setSelectedDept(m)}
                  className="bg-white border border-line rounded-2xl p-4 transition-all cursor-pointer hover:-translate-y-0.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] relative group"
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = THEME.accentBorder
                    e.currentTarget.style.boxShadow = `0 8px 24px ${THEME.accentShadow}`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#E5E7EB'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)'
                  }}
                >
                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => handleDelete(e, m.master_code, m.department_name)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-100 z-10"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {m.school_year}학년
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono" style={{ background: THEME.accentBg, color: THEME.accent }}>
                      {m.department_code}
                    </span>
                  </div>
                  <h3 className="text-[13px] font-extrabold text-ink leading-tight truncate mb-2.5">
                    {m.department_name}
                  </h3>

                  <div className="mb-3 px-2.5 py-1.5 bg-gray-50 rounded-xl">
                    <div className="text-[9px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">마스터코드</div>
                    <div className="text-[10px] font-mono font-bold text-ink-secondary truncate">{m.master_code}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                    <div className="text-center px-2 py-2 rounded-xl" style={{ background: THEME.accentBg }}>
                      <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: THEME.accent }}>총 일수</div>
                      <div className="text-[16px] font-extrabold leading-tight" style={{ color: THEME.accentDark }}>
                        {m.total_days}<span className="text-[9px] font-bold ml-0.5">일</span>
                      </div>
                    </div>
                    <div className="text-center px-2 py-2 rounded-xl bg-blue-50">
                      <div className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">총 문항</div>
                      <div className="text-[16px] font-extrabold text-blue-700 leading-tight">
                        {m.question_count}<span className="text-[9px] font-bold ml-0.5">개</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-line-light">
                    <span className="text-[10px] font-semibold text-ink-muted">{m.created_at?.slice(0, 10)}</span>
                    <span className="text-[10px] font-bold" style={{ color: THEME.accent }}>상세 →</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-white border border-line rounded-2xl">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-[13px] font-medium text-ink-secondary">
                {departments.length === 0
                  ? `${grade === 'high' ? '고등' : '중등'} 전공질문이 아직 없어요. 엑셀로 업로드해보세요!`
                  : `${grade === 'high' ? '고등' : '중등'} ${yearFilter === 'all' ? '' : `${yearFilter}학년 `}전공질문이 없어요`}
              </p>
            </div>
          )}
        </>
      )}

      {showUploadModal && (
        <ExcelUploadModal type="major" grade={grade} onClose={() => setShowUploadModal(false)} />
      )}

      {selectedDept && (
        <MajorDetailModal
          department={selectedDept}
          onClose={() => setSelectedDept(null)}
        />
      )}
    </>
  )
}