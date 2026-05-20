// src/pages/admin/_pages/students/detail/middle-tabs/TypeDetailModal.tsx

import { useEffect } from 'react'
import { TYPE_DETAIL } from './TypeDetailData'
import { TYPE_NAMES } from '@/pages/middle-student/_pages/concept/questions'

interface Props {
  typeCode: string
  open: boolean
  onClose: () => void
}

export default function TypeDetailModal({ typeCode, open, onClose }: Props) {
  const detail = TYPE_DETAIL[typeCode]
  const typeName = TYPE_NAMES[typeCode] ?? typeCode

  // ESC 키로 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open || !detail) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-[820px] max-h-[90vh] overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 (그라데이션 배경) */}
        <div className="relative bg-gradient-to-br from-brand-middle-pale to-emerald-50 border-b border-brand-middle-light px-8 py-6 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-line flex items-center justify-center text-ink-secondary hover:text-ink transition-colors"
            aria-label="닫기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            <div className="text-5xl">{detail.emoji}</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-brand-middle-dark uppercase tracking-wider">진단 유형 해설</span>
                <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">
                  {typeCode}
                </span>
              </div>
              <div className="text-[22px] font-extrabold text-brand-middle-dark mb-1">{typeName}</div>
              <div className="text-[13px] text-ink-secondary font-medium">{detail.catchphrase}</div>
            </div>
          </div>
        </div>

        {/* 본문 (스크롤) */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* 1. 이 아이는 어떤 아이인가요? */}
          <Section title="이 아이는 어떤 아이인가요?" emoji="🧒">
            <p className="text-[14px] text-ink-secondary leading-[1.75]">{detail.personality}</p>
          </Section>

          {/* 2. 사고방식 & 학습 스타일 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <InfoBox title="사고방식" emoji="🧠" content={detail.thinking} />
            <InfoBox title="학습 스타일" emoji="📚" content={detail.learning} />
          </div>

          {/* 3. 강점 & 약점 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* 강점 */}
            <div className="bg-green-50 border border-green-100 rounded-xl p-5">
              <div className="text-[13px] font-bold text-green-700 mb-3">✓ 강점</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {detail.strengths.map(s => (
                  <span key={s} className="text-[11px] font-semibold px-2.5 py-1 bg-white text-green-700 rounded-full border border-green-200">
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-[12px] text-green-900 leading-relaxed">{detail.strengthsDetail}</p>
            </div>

            {/* 약점 */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
              <div className="text-[13px] font-bold text-amber-700 mb-3">⚠ 보완할 점</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {detail.weaknesses.map(w => (
                  <span key={w} className="text-[11px] font-semibold px-2.5 py-1 bg-white text-amber-700 rounded-full border border-amber-200">
                    {w}
                  </span>
                ))}
              </div>
              <p className="text-[12px] text-amber-900 leading-relaxed">{detail.weaknessesDetail}</p>
            </div>
          </div>

          {/* 4. 관심 분야 & 미래 지향 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <InfoBox title="관심 분야" emoji="🔍" content={detail.interests} />
            <InfoBox title="미래 지향" emoji="🎯" content={detail.future} />
          </div>

          {/* 5. 추천 학과 TOP 6 */}
          <Section title="추천 학과 TOP 6" emoji="🏫">
            <div className="grid grid-cols-2 gap-2.5">
              {detail.majors.map((m, idx) => (
                <div
                  key={m.name}
                  className="bg-white border border-line rounded-xl p-3.5 hover:border-brand-middle-light hover:bg-brand-middle-pale/30 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-brand-middle-pale text-brand-middle-dark text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-ink mb-0.5">{m.name}</div>
                      <div className="text-[11px] text-ink-secondary leading-snug">{m.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* 6. 대학생활 적응 전략 */}
          <Section title="대학생활 적응 전략" emoji="🎓">
            <div className="bg-brand-middle-pale/40 border border-brand-middle-light rounded-xl p-4">
              <p className="text-[13px] text-ink-secondary leading-[1.75]">{detail.collegeStrategy}</p>
            </div>
          </Section>

          {/* 7. 이런 경우 재검토하세요 */}
          <Section title="이런 경우 재검토하세요" emoji="⚠️">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <ul className="flex flex-col gap-2">
                {detail.warningDetail.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-red-900 leading-relaxed">
                    <span className="text-red-500 font-bold flex-shrink-0 mt-0.5">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          {/* 8. 학부모님께 드리는 말씀 */}
          <Section title="학부모님께 드리는 말씀" emoji="💬" last>
            <div className="bg-gradient-to-br from-brand-middle-pale to-emerald-50 border border-brand-middle-light rounded-xl p-5">
              <p className="text-[13px] text-ink-secondary leading-[1.75] italic">
                "{detail.parentMessage}"
              </p>
            </div>
          </Section>
        </div>

        {/* 푸터 */}
        <div className="flex-shrink-0 border-t border-line bg-gray-50 px-8 py-4 flex items-center justify-between">
          <div className="text-[11px] text-ink-muted">
            출처: 학과 적합도 정밀 진단 200 · 유형 결과 해설집
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-brand-middle text-white rounded-lg text-[13px] font-bold hover:bg-brand-middle-dark transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 내부 헬퍼 컴포넌트 ───

function Section({
  title,
  emoji,
  children,
  last,
}: {
  title: string
  emoji: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div className={last ? '' : 'mb-6'}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[16px]">{emoji}</span>
        <h3 className="text-[15px] font-extrabold text-ink">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function InfoBox({ title, emoji, content }: { title: string; emoji: string; content: string }) {
  return (
    <div className="bg-gray-50 border border-line rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[13px]">{emoji}</span>
        <div className="text-[12px] font-bold text-ink">{title}</div>
      </div>
      <p className="text-[12px] text-ink-secondary leading-relaxed">{content}</p>
    </div>
  )
}