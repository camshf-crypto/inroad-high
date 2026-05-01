import { useState } from 'react'
import { MAJOR_QUESTIONS_MOCK, THEME } from './mock-data'
import type { Grade, SchoolYear } from './mock-data'
import ExcelUploadModal from './ExcelUploadModal'

interface Props {
  grade: Grade
}

type YearFilter = 'all' | SchoolYear

export default function MajorQuestionsTab({ grade }: Props) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [yearFilter, setYearFilter] = useState<YearFilter>('all')

  const filtered = MAJOR_QUESTIONS_MOCK.filter(m => {
    if (m.grade !== grade) return false
    if (yearFilter !== 'all' && m.schoolYear !== yearFilter) return false
    return (
      m.departmentName.includes(searchQuery) ||
      m.departmentCode.includes(searchQuery) ||
      m.masterCode.includes(searchQuery)
    )
  })

  const yearCounts = {
    all: MAJOR_QUESTIONS_MOCK.filter(m => m.grade === grade).length,
    1: MAJOR_QUESTIONS_MOCK.filter(m => m.grade === grade && m.schoolYear === 1).length,
    2: MAJOR_QUESTIONS_MOCK.filter(m => m.grade === grade && m.schoolYear === 2).length,
    3: MAJOR_QUESTIONS_MOCK.filter(m => m.grade === grade && m.schoolYear === 3).length,
  }

  const yearChips: { value: YearFilter; label: string; count: number }[] = [
    { value: 'all', label: '전체', count: yearCounts.all },
    { value: 1, label: '1학년', count: yearCounts[1] },
    { value: 2, label: '2학년', count: yearCounts[2] },
    { value: 3, label: '3학년', count: yearCounts[3] },
  ]

  return (
    <>
      {/* 액션 바 */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="relative flex-1 max-w-[400px]">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
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
          <span>↑</span>
          엑셀 업로드
        </button>
      </div>

      {/* 학년 칩 */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mr-1">
          학년
        </span>
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
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: active ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                  color: active ? '#fff' : '#94A3B8',
                }}
              >
                {chip.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* 안내 박스 */}
      <div
        className="mb-4 px-4 py-2.5 border rounded-2xl flex items-start gap-2"
        style={{ background: THEME.accentBg, borderColor: THEME.accentBorder + '60' }}
      >
        <span className="text-base">💡</span>
        <div className="text-[12px] text-ink-secondary leading-[1.6]">
          <strong className="text-ink font-bold">
            {grade === 'high' ? '고등' : '중등'} 전공질문 엑셀 형식:
          </strong>{' '}
          학년 / 학과코드 / 학과명 / 마스터코드 / 총일수 / 질문유형코드 / 질문유형 / day / seq / 질문 /
          선택지1~5 / 정답·모범답안 / 해설{' '}
        </div>
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map(m => (
          <div
            key={m.id}
            className="bg-white border border-line rounded-2xl p-4 transition-all cursor-pointer hover:-translate-y-0.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = THEME.accentBorder
              e.currentTarget.style.boxShadow = `0 8px 24px ${THEME.accentShadow}`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#E5E7EB'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)'
            }}
          >
            {/* 카드 헤더 */}
            <div className="flex items-start justify-between mb-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                  {/* 학년 배지 (앞) */}
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {m.schoolYear}학년
                  </span>
                  {/* 학과코드 */}
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono"
                    style={{ background: THEME.accentBg, color: THEME.accent }}
                  >
                    {m.departmentCode}
                  </span>
                </div>
                <h3 className="text-[13px] font-extrabold text-ink leading-tight truncate">
                  {m.departmentName}
                </h3>
              </div>
            </div>

            {/* 마스터코드 */}
            <div className="mb-3 px-2.5 py-1.5 bg-gray-50 rounded-xl">
              <div className="text-[9px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">
                마스터코드
              </div>
              <div className="text-[10px] font-mono font-bold text-ink-secondary truncate">
                {m.masterCode}
              </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-2 gap-1.5 mb-2.5">
              <div
                className="text-center px-2 py-2 rounded-xl"
                style={{ background: THEME.accentBg }}
              >
                <div
                  className="text-[9px] font-bold uppercase tracking-wider mb-0.5"
                  style={{ color: THEME.accent }}
                >
                  총 일수
                </div>
                <div
                  className="text-[16px] font-extrabold leading-tight"
                  style={{ color: THEME.accentDark }}
                >
                  {m.totalDays}
                  <span className="text-[9px] font-bold ml-0.5">일</span>
                </div>
              </div>
              <div className="text-center px-2 py-2 rounded-xl bg-blue-50">
                <div className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
                  총 문항
                </div>
                <div className="text-[16px] font-extrabold text-blue-700 leading-tight">
                  {m.questionCount}
                  <span className="text-[9px] font-bold ml-0.5">개</span>
                </div>
              </div>
            </div>

            {/* 푸터 */}
            <div className="flex items-center justify-between pt-2 border-t border-line-light">
              <span className="text-[10px] font-semibold text-ink-muted">
                {m.createdAt}
              </span>
              <span
                className="text-[10px] font-bold"
                style={{ color: THEME.accent }}
              >
                상세 →
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center bg-white border border-line rounded-2xl">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-[13px] font-medium text-ink-secondary">
            {grade === 'high' ? '고등' : '중등'}{' '}
            {yearFilter === 'all' ? '' : `${yearFilter}학년 `}전공질문이 아직 없습니다
          </p>
        </div>
      )}

      {/* 엑셀 업로드 모달 */}
      {showUploadModal && (
        <ExcelUploadModal
          type="major"
          grade={grade}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </>
  )
}