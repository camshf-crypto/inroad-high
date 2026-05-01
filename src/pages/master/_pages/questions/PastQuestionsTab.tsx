import { useState } from 'react'
import { PAST_QUESTIONS_MOCK, THEME } from './mock-data'
import type { Grade } from './mock-data'
import ExcelUploadModal from './ExcelUploadModal'

interface Props {
  grade: Grade
}

export default function PastQuestionsTab({ grade }: Props) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [universityFilter, setUniversityFilter] = useState('all')

  const filtered = PAST_QUESTIONS_MOCK.filter(q => {
    if (q.grade !== grade) return false
    const matchSearch =
      q.question.includes(searchQuery) ||
      (q.major?.includes(searchQuery) ?? false) ||
      q.formulaName.includes(searchQuery)
    const matchUni = universityFilter === 'all' || q.university === universityFilter
    return matchSearch && matchUni
  })

  const universities = Array.from(
    new Set(PAST_QUESTIONS_MOCK.filter(q => q.grade === grade).map(q => q.university)),
  )

  const schoolLabel = grade === 'high' ? '대학' : '학교'
  const isHigh = grade === 'high'

  return (
    <>
      {/* 액션 바 */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 flex-1">
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
              placeholder={
                isHigh
                  ? '대학, 학과, 질문, 공식으로 검색...'
                  : '학교, 질문, 공식으로 검색...'
              }
              className="w-full pl-10 pr-4 py-2 border border-line rounded-full text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all bg-white"
            />
          </div>

          <select
            value={universityFilter}
            onChange={e => setUniversityFilter(e.target.value)}
            className="px-3.5 py-2 border border-line rounded-full text-[12px] font-bold text-ink-secondary focus:outline-none cursor-pointer bg-white hover:border-purple-300 transition-all"
          >
            <option value="all">전체 {schoolLabel}</option>
            {universities.map(uni => (
              <option key={uni} value={uni}>
                {uni}
              </option>
            ))}
          </select>
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

      {/* 안내 박스 (학년에 따라 다름) */}
      <div
        className="mb-4 px-4 py-2.5 border rounded-2xl flex items-start gap-2"
        style={{ background: THEME.accentBg, borderColor: THEME.accentBorder + '60' }}
      >
        <span className="text-base">💡</span>
        <div className="text-[12px] text-ink-secondary leading-[1.6]">
          <strong className="text-ink font-bold">
            {isHigh ? '고등' : '중등'} 기출문제 엑셀 형식:
          </strong>{' '}
          {isHigh ? (
            <>대학 / 학과 / 전형 / 질문 / 유형(공식번호 1-67)</>
          ) : (
            <>학교 / 질문 / 유형(공식번호 1-67)</>
          )}
        </div>
      </div>

      {/* 테이블 (학년에 따라 컬럼 다름) */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC]">
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                번호
              </th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                {schoolLabel}
              </th>
              {/* 🆕 학과·전형은 고등에만 */}
              {isHigh && (
                <>
                  <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                    학과/계열
                  </th>
                  <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                    전형
                  </th>
                </>
              )}
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                질문
              </th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                유형 (공식)
              </th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                등록일
              </th>
              <th className="px-5 py-3 border-b border-line w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q, i) => (
              <tr
                key={q.id}
                className="cursor-pointer transition-colors hover:bg-gray-50"
                style={{
                  borderBottom:
                    i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                }}
              >
                <td className="px-5 py-3 text-[12px] font-semibold text-ink-muted">
                  {q.id}
                </td>
                <td className="px-5 py-3">
                  <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2.5 py-1 rounded-full">
                    {q.university}
                  </span>
                </td>
                {/* 🆕 학과·전형은 고등에만 */}
                {isHigh && (
                  <>
                    <td className="px-5 py-3 text-[13px] font-bold text-ink">
                      {q.major}
                    </td>
                    <td className="px-5 py-3 text-[12px] font-semibold text-ink-secondary">
                      {q.admissionType}
                    </td>
                  </>
                )}
                <td className="px-5 py-3 text-[13px] font-medium text-ink">
                  {q.question}
                </td>
                <td className="px-5 py-3">
                  <div className="inline-flex items-center gap-1.5">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: THEME.accent, background: THEME.accentBg }}
                    >
                      #{q.formulaId}
                    </span>
                    <span className="text-[12px] font-semibold text-ink-secondary">
                      {q.formulaName}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-[12px] font-semibold text-ink-secondary">
                  {q.createdAt}
                </td>
                <td className="px-5 py-3 text-center">
                  <button className="text-ink-muted hover:text-red-500 transition-colors">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-[13px] font-medium text-ink-secondary">
              {isHigh ? '고등' : '중등'} 기출문제가 아직 없습니다
            </p>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[12px] font-medium text-ink-secondary">
          총 <strong className="text-ink font-extrabold">{filtered.length}</strong>개 항목
        </p>
        <div className="flex gap-1">
          <button className="px-3 py-1.5 border border-line rounded-full text-[11px] font-bold text-ink-muted hover:bg-gray-50 transition-all">
            이전
          </button>
          <button
            className="px-3.5 py-1.5 rounded-full text-[11px] font-bold text-white"
            style={{ background: THEME.accent }}
          >
            1
          </button>
          <button className="px-3 py-1.5 border border-line rounded-full text-[11px] font-bold text-ink-muted hover:bg-gray-50 transition-all">
            다음
          </button>
        </div>
      </div>

      {/* 엑셀 업로드 모달 */}
      {showUploadModal && (
        <ExcelUploadModal
          type="past"
          grade={grade}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </>
  )
}