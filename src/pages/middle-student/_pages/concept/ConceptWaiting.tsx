// src/pages/middle-student/_pages/concept/ConceptWaiting.tsx

import { useAtomValue } from 'jotai'
import { studentState } from '@/lib/auth/atoms'
import type { ConceptData } from './CareerConcept'

interface Props {
  conceptData: ConceptData
}

export default function ConceptWaiting({ conceptData }: Props) {
  const student = useAtomValue(studentState)
  const answeredCount = Object.keys(conceptData.answers || {}).length

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC]">
      <div className="max-w-[480px] w-full mx-auto px-6 py-6">

        {/* 헤더 - 대기 분위기 */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center text-2xl mb-3 shadow-[0_8px_24px_rgba(245,158,11,0.25)] animate-pulse">
            ⏳
          </div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight mb-1">
            진단 완료!
          </div>
          <div className="text-[12px] text-ink-secondary leading-relaxed">
            <span className="font-bold text-ink">{student?.name}</span>님, 진단을 모두 완료했어요!
          </div>
        </div>

        {/* 메인 메시지 카드 */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 mb-3 shadow-[0_4px_16px_rgba(245,158,11,0.08)]">
          <div className="text-center mb-4">
            <div className="text-[15px] font-bold text-amber-700 mb-1.5">
              📋 선생님이 결과를 검토 중이에요
            </div>
            <div className="text-[12px] text-ink-secondary leading-relaxed">
              선생님과 상담 후 결과를 승인해주시면<br />
              나의 진로 계열 검사 결과를 확인할 수 있어요
            </div>
          </div>

          {/* 진행 상태 */}
          <div className="bg-gray-50 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-bold text-ink-muted">상태</span>
              <span className="font-bold text-amber-600">⏳ 승인 대기 중</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-ink-muted">제출 문항</span>
              <span className="font-bold text-ink">{answeredCount} / 200</span>
            </div>
          </div>

          {/* 다음 단계 안내 */}
          <div className="border-t border-line pt-3">
            <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">다음 단계</div>
            <div className="space-y-1.5">
              {[
                { num: '1', text: '선생님이 진단 결과를 검토해요', status: 'current' },
                { num: '2', text: '선생님과 1:1 상담을 진행해요', status: 'pending' },
                { num: '3', text: '승인 후 학과 선택 단계로 넘어가요', status: 'pending' },
              ].map((s) => (
                <div key={s.num} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    s.status === 'current'
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-gray-100 text-ink-muted'
                  }`}>
                    {s.num}
                  </div>
                  <div className={`text-[12px] font-medium ${
                    s.status === 'current' ? 'text-ink' : 'text-ink-muted'
                  }`}>
                    {s.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 안내 메시지 (초록색 톤) */}
        <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl p-3 mb-3">
          <div className="flex items-start gap-2">
            <span className="text-sm flex-shrink-0">💡</span>
            <div className="text-[11px] text-brand-middle-dark leading-relaxed">
              <div className="font-bold mb-0.5">진단 결과는 어떻게 확인하나요?</div>
              <div>선생님이 결과를 승인하시면 자동으로 다음 화면이 나타나요. 선생님께 직접 문의하셔도 좋아요!</div>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-ink-muted">
          이 페이지는 자동으로 새로고침돼요
        </div>
      </div>
    </div>
  )
}