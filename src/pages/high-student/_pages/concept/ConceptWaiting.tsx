// src/pages/high-student/_pages/concept/ConceptWaiting.tsx

import { useAtomValue } from 'jotai'
import { studentState } from '@/lib/auth/atoms'
import type { ConceptData } from './CareerConcept'
import { TYPE_NAMES } from './questions'

interface Props {
  conceptData: ConceptData
}

export default function ConceptWaiting({ conceptData }: Props) {
  const student = useAtomValue(studentState)

  const scores = conceptData.scores
  const topScores = scores
    ? Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : []

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center px-6 py-5 bg-[#F8FAFC]">
      <div className="max-w-[560px] w-full">

        {/* 헤더 - 아이콘 작게 */}
        <div className="text-center mb-4">
          <div className="w-10 h-10 mx-auto bg-gradient-to-br from-amber-400 to-amber-500 rounded-lg flex items-center justify-center text-xl mb-2 shadow-[0_4px_12px_rgba(245,158,11,0.2)]">
            ⏳
          </div>
          <div className="text-[17px] font-extrabold text-ink tracking-tight mb-0.5">진단 완료!</div>
          <div className="text-[12px] text-ink-secondary leading-relaxed">
            <span className="font-bold text-ink">{student?.name}</span>님의 진단이 완료되었어요.
            <span className="mx-1">·</span>선생님이 결과를 확인하고 상담 후 승인해주실 거예요.
          </div>
        </div>

        {/* 결과 카드 - 컴팩트 */}
        <div className="bg-white border border-brand-high-light rounded-xl p-4 mb-3 text-left shadow-sm">
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">진단 결과 (잠정)</div>

          {conceptData.type_code && (
            <div className="flex items-center gap-2.5 mb-3 p-3 bg-brand-high-pale rounded-lg border border-brand-high-light">
              <div className="text-2xl">{conceptData.type_name?.split(' ')[0]}</div>
              <div>
                <div className="text-[14px] font-extrabold text-brand-high-dark">{conceptData.type_name}</div>
                <div className="text-[11px] text-ink-secondary mt-0.5">주 유형 코드: {conceptData.type_code}</div>
              </div>
            </div>
          )}

          {topScores.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-ink-muted mb-2">TOP 5 유형 점수</div>
              <div className="flex flex-col gap-1.5">
                {topScores.map(([type, score], idx) => {
                  const maxScore = topScores[0][1]
                  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
                  return (
                    <div key={type} className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${idx === 0 ? 'bg-brand-high text-white' : 'bg-gray-100 text-ink-muted'}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] font-semibold text-ink truncate">{TYPE_NAMES[type] || type}</span>
                          <span className="text-[10px] text-ink-muted ml-2 flex-shrink-0">{score}점</span>
                        </div>
                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${idx === 0 ? 'bg-brand-high' : 'bg-gray-300'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 안내 - 컴팩트 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-left">
          <div className="flex items-start gap-2">
            <span className="text-sm flex-shrink-0">📋</span>
            <div className="text-[11px] text-blue-800 leading-relaxed">
              <div className="font-bold mb-0.5">다음 단계 안내</div>
              <div>1. 선생님이 진단 결과를 검토합니다</div>
              <div>2. 선생님과 1:1 상담을 진행합니다</div>
              <div>3. 선생님이 결과를 승인하면 학과 선택 단계로 넘어갑니다</div>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-ink-muted">
          승인이 완료되면 이 화면이 자동으로 업데이트돼요
        </div>
      </div>
    </div>
  )
}