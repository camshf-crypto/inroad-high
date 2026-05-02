import { useState } from 'react'
import { useMasterPassageInterviews } from '@/pages/master/_hooks/useMasterPassageInterviews'
import { useDeletePassageInterview } from '@/pages/master/_hooks/useDeleteQuestions'
import type { Grade, PassageInterview } from '@/lib/types/questions'
import ExcelUploadModal from './ExcelUploadModal'
import PassageDetailModal from './PassageDetailModal'

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

const TRACKS_HIGH = ['인문계열', '자연계열', '의학계열', '사범대']

export default function PassageInterviewTab({ grade }: Props) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PassageInterview | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [trackFilter, setTrackFilter] = useState('all')

  // ✅ Supabase에서 제시문면접 조회
  const { data: passages = [], isLoading, error } = useMasterPassageInterviews(grade)
  const deleteMutation = useDeletePassageInterview()

  const isHigh = grade === 'high'
  const schoolLabel = isHigh ? '대학' : '학교'

  const filtered = passages.filter(p => {
    const matchSearch =
      p.original_question.includes(searchQuery) ||
      p.school_name.includes(searchQuery) ||
      p.set_code.includes(searchQuery)
    const matchTrack =
      grade === 'middle' || trackFilter === 'all' || p.track_name === trackFilter
    return matchSearch && matchTrack
  })

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
              placeholder={`${schoolLabel}, 질문, 세트코드로 검색...`}
              className="w-full pl-10 pr-4 py-2 border border-line rounded-full text-[13px] font-medium focus:outline-none focus:border-purple-400 transition-all bg-white"
            />
          </div>

          {isHigh && (
            <select
              value={trackFilter}
              onChange={e => setTrackFilter(e.target.value)}
              className="px-3.5 py-2 border border-line rounded-full text-[12px] font-bold text-ink-secondary focus:outline-none cursor-pointer bg-white hover:border-purple-300 transition-all"
            >
              <option value="all">전체 계열</option>
              {TRACKS_HIGH.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px"
          style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
        >
          <span>↑</span> 엑셀 + 이미지
        </button>
      </div>

      {/* 안내 */}
      <div className="mb-4 px-4 py-2.5 border rounded-2xl flex items-start gap-2" style={{ background: THEME.accentBg, borderColor: THEME.accentBorder + '60' }}>
        <span className="text-base">💡</span>
        <div className="text-[12px] text-ink-secondary leading-[1.6]">
          <strong className="text-ink font-bold">{isHigh ? '고등' : '중등'} 제시문면접:</strong>{' '}
          행을 클릭하면 모든 컬럼을 상세히 볼 수 있어요. 엑셀(메타데이터) + 이미지를 함께 업로드하세요.
        </div>
      </div>

      {/* 에러 배너 */}
      {error && (
        <div className="rounded-2xl px-5 py-3.5 mb-4 bg-red-50 border border-red-200">
          <div className="text-[13px] font-bold text-red-700">⚠️ 제시문면접을 불러오지 못했어요</div>
          <div className="text-[11px] text-red-600 mt-1">{(error as Error).message}</div>
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        {isLoading ? (
          <div className="px-10 py-16 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-200 rounded-full animate-spin mb-3" style={{ borderTopColor: THEME.accent }} />
            <div className="text-[13px] text-ink-secondary font-medium">제시문면접을 불러오는 중...</div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC]">
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">{schoolLabel}</th>
                {isHigh && <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">계열</th>}
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">회차</th>
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">원질문</th>
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-center border-b border-line">제시문</th>
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-center border-b border-line">이미지</th>
                <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">등록일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isHigh ? 7 : 6} className="py-12 text-center">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-[13px] font-medium text-ink-secondary">
                      {passages.length === 0
                        ? `${isHigh ? '고등' : '중등'} 제시문면접이 아직 없어요. 엑셀로 업로드해보세요!`
                        : '검색 결과가 없어요'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedItem(p)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2.5 py-1 rounded-full">{p.school_name}</span>
                        <span className="text-[10px] font-mono font-semibold text-ink-muted">{p.school_code}</span>
                      </div>
                    </td>
                    {isHigh && (
                      <td className="px-5 py-3">
                        {p.track_name && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: THEME.accentDark, background: THEME.accentBg }}>
                            {p.track_name}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] font-bold text-ink">{p.year}년</span>
                        <span className="text-[11px] font-semibold text-ink-secondary">{p.round}회차</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[13px] font-medium text-ink max-w-[300px]">
                      <div className="line-clamp-2">{p.original_question}</div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-full">
                        {p.passage_count}개
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full">
                        {p.image_count}개
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12px] font-semibold text-ink-secondary">{p.created_at?.slice(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[12px] font-medium text-ink-secondary">
          총 <strong className="text-ink font-extrabold">{filtered.length}</strong>개 항목
        </p>
      </div>

      {showUploadModal && (
        <ExcelUploadModal type="passage" grade={grade} onClose={() => setShowUploadModal(false)} />
      )}

      {selectedItem && (
        <PassageDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={(id) => {
            if (!confirm('정말 삭제하시겠습니까?')) return
            deleteMutation.mutate(id, {
              onSuccess: () => setSelectedItem(null),
              onError: err => alert(`삭제 실패: ${(err as Error).message}`),
            })
          }}
        />
      )}
    </>
  )
}