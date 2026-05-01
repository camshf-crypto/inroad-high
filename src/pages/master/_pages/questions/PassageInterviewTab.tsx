import { useState } from 'react'
import { PASSAGE_INTERVIEWS_MOCK, THEME } from './mock-data'
import type { Grade, PassageInterview } from './mock-data'
import ExcelUploadModal from './ExcelUploadModal'
import PassageDetailModal from './PassageDetailModal'

interface Props {
  grade: Grade
}

const TRACKS_HIGH = ['인문계열', '자연계열', '의학계열', '사범대']

export default function PassageInterviewTab({ grade }: Props) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PassageInterview | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [trackFilter, setTrackFilter] = useState('all')

  const filtered = PASSAGE_INTERVIEWS_MOCK.filter(p => {
    if (p.grade !== grade) return false
    const matchSearch =
      p.originalQuestion.includes(searchQuery) ||
      p.schoolName.includes(searchQuery) ||
      p.setCode.includes(searchQuery)
    const matchTrack =
      grade === 'middle' || trackFilter === 'all' || p.trackName === trackFilter
    return matchSearch && matchTrack
  })

  const isHigh = grade === 'high'
  const schoolLabel = isHigh ? '대학' : '학교'

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
              placeholder={`${schoolLabel}, 질문, 세트코드로 검색...`}
              className="w-full pl-10 pr-4 py-2 border border-line rounded-full text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all bg-white"
            />
          </div>

          {/* 계열 필터는 고등에만 */}
          {isHigh && (
            <select
              value={trackFilter}
              onChange={e => setTrackFilter(e.target.value)}
              className="px-3.5 py-2 border border-line rounded-full text-[12px] font-bold text-ink-secondary focus:outline-none cursor-pointer bg-white hover:border-purple-300 transition-all"
            >
              <option value="all">전체 계열</option>
              {TRACKS_HIGH.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px"
          style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
        >
          <span>↑</span>
          엑셀 + 이미지
        </button>
      </div>

      {/* 안내 박스 */}
      <div
        className="mb-4 px-4 py-2.5 border rounded-2xl flex items-start gap-2"
        style={{ background: THEME.accentBg, borderColor: THEME.accentBorder + '60' }}
      >
        <span className="text-base">💡</span>
        <div className="text-[12px] text-ink-secondary leading-[1.6]">
          <strong className="text-ink font-bold">
            {isHigh ? '고등' : '중등'} 제시문면접:
          </strong>{' '}
          행을 클릭하면 모든 컬럼을 상세히 볼 수 있어요. 엑셀(메타데이터) + 이미지 폴더를 ZIP으로
          묶어 업로드하세요.
        </div>
      </div>

      {/* 테이블 (핵심 컬럼만) */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC]">
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                {schoolLabel}
              </th>
              {isHigh && (
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                  계열
                </th>
              )}
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                회차
              </th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                원질문
              </th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-center border-b border-line">
                제시문
              </th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-center border-b border-line">
                이미지
              </th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                등록일
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                onClick={() => setSelectedItem(p)}
                className="cursor-pointer transition-colors hover:bg-gray-50"
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                }}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2.5 py-1 rounded-full">
                      {p.schoolName}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-ink-muted">
                      {p.schoolCode}
                    </span>
                  </div>
                </td>
                {isHigh && (
                  <td className="px-5 py-3">
                    {p.trackName && (
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: THEME.accentDark, background: THEME.accentBg }}
                      >
                        {p.trackName}
                      </span>
                    )}
                  </td>
                )}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] font-bold text-ink">
                      {p.year}년
                    </span>
                    <span className="text-[11px] font-semibold text-ink-secondary">
                      {p.round}회차
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-[13px] font-medium text-ink max-w-[300px]">
                  <div className="line-clamp-2">{p.originalQuestion}</div>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-full">
                    {p.passageCount}개
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full">
                    {p.imageCount}개
                  </span>
                </td>
                <td className="px-5 py-3 text-[12px] font-semibold text-ink-secondary">
                  {p.createdAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-[13px] font-medium text-ink-secondary">
              {isHigh ? '고등' : '중등'} 제시문면접이 아직 없습니다
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
          type="passage"
          grade={grade}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* 상세 모달 */}
      {selectedItem && (
        <PassageDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  )
}