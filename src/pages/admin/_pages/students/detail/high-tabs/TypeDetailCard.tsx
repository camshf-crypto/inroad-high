// src/pages/admin/_pages/students/detail/high-tabs/TypeDetailCard.tsx

import { TYPE_DETAIL } from './TypeDetailData'

interface Props {
  typeCode: string
  onOpenDetail: () => void
}

export default function TypeDetailCard({ typeCode, onOpenDetail }: Props) {
  const detail = TYPE_DETAIL[typeCode]

  // 데이터 없는 유형 코드일 때 fallback
  if (!detail) {
    return (
      <div className="bg-white border border-line rounded-2xl p-6">
        <div className="text-[13px] font-bold text-ink mb-2">💡 진단 유형 해설</div>
        <div className="text-[12px] text-ink-muted">
          해설 데이터를 준비 중이에요.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-6 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-bold text-ink">💡 진단 유형 해설</div>
        <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full border border-brand-high-light">
          상위 1유형
        </span>
      </div>

      {/* 캐치프레이즈 */}
      <div className="mb-3">
        <div className="text-[13px] font-extrabold text-ink leading-snug mb-1.5">
          {detail.catchphrase}
        </div>
        <div className="text-[11px] text-ink-secondary leading-relaxed line-clamp-3">
          {detail.summary}
        </div>
      </div>

      {/* 핵심 키워드 */}
      <div className="mb-3">
        <div className="text-[10px] font-bold text-ink-muted mb-1.5">핵심 키워드</div>
        <div className="flex flex-wrap gap-1">
          {detail.keywords.map(kw => (
            <span
              key={kw}
              className="text-[10px] font-semibold px-2 py-0.5 bg-brand-high-pale text-brand-high-dark rounded-full border border-brand-high-light"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* 강점·약점 미리보기 */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
        <div className="bg-green-50 border border-green-100 rounded-lg p-2.5">
          <div className="text-[10px] font-bold text-green-700 mb-1">✓ 강점</div>
          <div className="text-green-800 font-medium leading-snug">
            {detail.strengths.slice(0, 3).join(', ')}
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
          <div className="text-[10px] font-bold text-amber-700 mb-1">⚠ 약점</div>
          <div className="text-amber-800 font-medium leading-snug">
            {detail.weaknesses.slice(0, 3).join(', ')}
          </div>
        </div>
      </div>

      {/* 위험 신호 미리보기 */}
      <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 mb-4">
        <div className="text-[10px] font-bold text-red-700 mb-1">⚠️ 이런 경우 재검토</div>
        <div className="text-[11px] text-red-800 leading-snug line-clamp-2">
          {detail.warning}
        </div>
      </div>

      {/* 자세히 보기 버튼 */}
      <button
        onClick={onOpenDetail}
        className="mt-auto w-full py-2.5 bg-brand-high-pale text-brand-high-dark rounded-lg text-[12px] font-bold border border-brand-high-light hover:bg-brand-high-light hover:-translate-y-px transition-all"
      >
        자세히 보기 →
      </button>
    </div>
  )
}