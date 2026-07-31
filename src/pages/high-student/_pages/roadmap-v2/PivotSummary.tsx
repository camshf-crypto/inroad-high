import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Grade } from '@/pages/high-student/_hooks/useRoadmap'

interface Props {
  fromMajor: string | null
  toMajor: string | null
  fromSeries: string | null
  toSeries: string | null
  /** 진로가 바뀐 학년 */
  atGrade: Grade
  ctaLabel?: string
  onCta?: () => void
  onClose?: () => void
}

export default function PivotSummary({
  fromMajor, toMajor, fromSeries, toSeries, atGrade, ctaLabel, onCta, onClose,
}: Props) {
  const { data: lines = [] } = useQuery({
    queryKey: ['pivot-lines'],
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<{ id: string; name: string; kind: string; series: string[] | null }[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_line')
        .select('id, name, kind, series')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })

  const { data: recoSubjects = [] } = useQuery({
    queryKey: ['pivot-reco-subjects', toSeries],
    enabled: !!toSeries,
    queryFn: async (): Promise<{ grade: number; subject_name: string }[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_node')
        .select('grade, subject_name')
        .is('student_id', null)
        .contains('recommended_series', [toSeries!])
        .order('grade')
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })

  const fits = (l: { series: string[] | null }, sr: string | null) =>
    l.series === null || (!!sr && l.series.includes(sr))

  const before = lines.filter((l) => l.kind === '세특' && fits(l, fromSeries))
  const after = lines.filter((l) => l.kind === '세특' && fits(l, toSeries))
  const beforeIds = new Set(before.map((l) => l.id))
  const afterIds = new Set(after.map((l) => l.id))

  const kept = after.filter((l) => beforeIds.has(l.id)).map((l) => l.name)
  const added = after.filter((l) => !beforeIds.has(l.id)).map((l) => l.name)
  const dropped = before.filter((l) => !afterIds.has(l.id)).map((l) => l.name)

  const past = atGrade > 1 ? Array.from({ length: atGrade - 1 }, (_, i) => i + 1) : []
  const ahead = ([1, 2, 3] as Grade[]).filter((g) => g >= atGrade)

  return (
    <div className="max-w-[680px] mx-auto">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[16px] font-extrabold text-ink mb-1">
            고{atGrade} 진로가 바뀌었어요
          </div>
          <div className="flex items-center gap-2 flex-wrap text-[13px]">
            <span className="text-ink-secondary">{fromMajor ?? '이전 진로'}</span>
            <span className="text-ink-muted">→</span>
            <span className="font-bold text-brand-high-dark">{toMajor}</span>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="h-9 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold hover:bg-gray-50 flex-shrink-0"
          >
            닫기
          </button>
        )}
      </div>

      <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '이어지는 계통', v: kept.length, color: '#059669' },
            { label: '새로 열린 계통', v: added.length, color: '#2563EB' },
            { label: '빠지는 계통', v: dropped.length, color: '#94A3B8' },
          ].map((x) => (
            <div key={x.label} className="rounded-xl border border-line px-3 py-2.5 text-center">
              <div className="text-[10.5px] text-ink-muted mb-0.5">{x.label}</div>
              <div className="text-[20px] font-extrabold" style={{ color: x.color }}>
                {x.v}
              </div>
            </div>
          ))}
        </div>

        {kept.length > 0 && (
          <div>
            <div className="text-[12px] font-bold text-green-800 mb-1.5">그대로 이어져요</div>
            <div className="flex flex-wrap gap-1.5">
              {kept.map((n) => (
                <span
                  key={n}
                  className="text-[11.5px] text-green-800 bg-green-50 border border-green-200 rounded-full px-2.5 py-1"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {added.length > 0 && (
          <div>
            <div className="text-[12px] font-bold text-brand-high-dark mb-1.5">새로 열렸어요</div>
            <div className="flex flex-wrap gap-1.5">
              {added.map((n) => (
                <span
                  key={n}
                  className="text-[11.5px] text-brand-high-dark bg-brand-high-pale border border-brand-high-light rounded-full px-2.5 py-1"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {dropped.length > 0 && (
          <div className="text-[11px] text-ink-muted leading-relaxed">
            {dropped.join(' · ')} 계통은 새 진로와 직접 이어지진 않아요. 다만 이미 진행한 건
            보드에 그대로 남아요.
          </div>
        )}

        {past.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-[12px] font-bold text-amber-900 mb-1">
              고{past.join('·')}에서 한 건 그대로 남아요
            </div>
            <div className="text-[11.5px] text-amber-900 leading-relaxed">
              이미 들은 과목과 탐구는 바꿀 수 없고, 바꿀 필요도 없어요. 그때 한 탐구를 새 진로
              관점에서 이어가면 오히려 "왜 진로가 바뀌었는지"가 설명되는 기록이 돼요.
            </div>
          </div>
        )}

        <div className="rounded-xl border border-brand-high-light bg-brand-high-pale/50 px-4 py-3.5">
          <div className="text-[12px] font-bold text-brand-high-dark mb-0.5">
            {toSeries ? `${toSeries}계열` : '새 진로'} 기준 추천 과목
          </div>
          <div className="text-[11px] text-ink-muted mb-2.5">
            앞으로 들을 과목이에요. 학교에 개설된 것 중에서 고르면 돼요.
          </div>

          {recoSubjects.length === 0 ? (
            <div className="text-[12px] text-ink-secondary">
              이 계열은 아직 추천 과목이 등록돼 있지 않아요. 과목 설정에서 직접 골라주세요.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {ahead.map((g) => {
                const list = recoSubjects.filter((r) => r.grade === g)
                if (list.length === 0) return null
                const seen = new Set<string>()
                const unique = list.filter((r) =>
                  seen.has(r.subject_name) ? false : (seen.add(r.subject_name), true),
                )
                return (
                  <div key={g} className="flex gap-2">
                    <div className="flex-shrink-0 w-8 text-[11.5px] font-extrabold text-brand-high-dark pt-1">
                      고{g}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {unique.map((r) => (
                        <span
                          key={r.subject_name}
                          className="text-[11.5px] font-semibold text-brand-high-dark bg-white border border-brand-high-light rounded-lg px-2.5 py-1"
                        >
                          {r.subject_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {onCta && (
          <button
            onClick={onCta}
            className="h-12 bg-brand-high text-white rounded-xl text-[14px] font-bold hover:bg-brand-high-dark transition-all"
          >
            {ctaLabel ?? '과목 다시 고르기 →'}
          </button>
        )}
      </div>
    </div>
  )
}