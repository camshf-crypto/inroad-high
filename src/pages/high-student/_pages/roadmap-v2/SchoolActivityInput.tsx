import { useState } from 'react'
import {
  useMySchoolActivities,
  useChangcheSamples,
  useAddSchoolActivity,
  useDeleteSchoolActivity,
  CHANGCHE_CATEGORIES,
  CATEGORY_LABEL,
  type ChangcheCategory,
  type Grade,
} from '@/pages/high-student/_hooks/useRoadmap'

/** 샘플 테이블이 비어 있을 때 쓸 하위 활동 (교육과정 문서 기준) */
const FALLBACK_SUB: Record<ChangcheCategory, string[]> = {
  자율: ['자율활동', '자치활동'],
  동아리: ['학술문화 및 여가 활동', '봉사활동'],
  진로: ['진로 탐색 활동', '진로 설계 및 실천 활동'],
}

const GRADES: Grade[] = [1, 2, 3]

interface Props {
  /** 학생 본인 학년 — 기본 선택 탭 */
  myGrade?: Grade
  onDone?: () => void
}

export default function SchoolActivityInput({ myGrade = 1, onDone }: Props) {
  const [grade, setGrade] = useState<Grade>(myGrade)

  const { data: all = [] } = useMySchoolActivities()
  const { data: samples } = useChangcheSamples()
  const add = useAddSchoolActivity()
  const del = useDeleteSchoolActivity()

  const visible = all.filter((a) => a.grade === null || a.grade === grade)
  const totalCount = all.length

  return (
    <div className="max-w-[680px]">
      <div className="mb-4">
        <div className="text-[16px] font-extrabold text-ink mb-1">
          우리 학교 창의적 체험활동
        </div>
        <div className="text-[12px] text-ink-secondary leading-relaxed">
          우리 학교에서 실제로 할 수 있는 활동을 적어두면, 학년마다 여기서 골라 추천해요.
          <br />
          <span className="text-ink-muted">
            학교마다 활동이 다르니 기억나는 것만 먼저 적어도 괜찮아요.
          </span>
        </div>
      </div>

      {/* 학년 탭 */}
      <div className="flex gap-1.5 mb-4">
        {GRADES.map((g) => {
          const on = grade === g
          const cnt = all.filter((a) => a.grade === null || a.grade === g).length
          return (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className="px-3.5 py-1.5 rounded-full text-[12px] border transition-all flex items-center gap-1.5"
              style={{
                background: on ? '#2563EB' : '#fff',
                color: on ? '#fff' : '#6B7280',
                borderColor: on ? '#2563EB' : '#E5E7EB',
                fontWeight: on ? 700 : 500,
              }}
            >
              고{g}
              {cnt > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 rounded-full"
                  style={{
                    background: on ? 'rgba(255,255,255,.25)' : '#F1F5F9',
                    color: on ? '#fff' : '#94A3B8',
                  }}
                >
                  {cnt}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3">
        {CHANGCHE_CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat}
            category={cat}
            grade={grade}
            items={visible.filter((a) => a.category === cat)}
            subs={
              samples?.get(cat)
                ? [...samples.get(cat)!.keys()]
                : FALLBACK_SUB[cat]
            }
            samples={samples?.get(cat)}
            onAdd={(name, sub, everyYear) =>
              add.mutate({
                category: cat,
                name,
                subcategory: sub,
                grade: everyYear ? null : grade,
              })
            }
            onDelete={(id) => del.mutate(id)}
          />
        ))}
      </div>

      {onDone && (
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onDone}
            disabled={totalCount === 0}
            className="flex-1 h-12 bg-brand-high text-white rounded-xl text-[14px] font-bold hover:bg-brand-high-dark transition-all disabled:opacity-40"
          >
            {totalCount === 0 ? '활동을 하나 이상 입력해주세요' : '준비 완료! 로드맵 보기 →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================

interface CardProps {
  category: ChangcheCategory
  grade: Grade
  items: { id: string; name: string; grade: number | null; subcategory: string | null }[]
  subs: string[]
  samples?: Map<string, string[]>
  onAdd: (name: string, sub: string, everyYear: boolean) => void
  onDelete: (id: string) => void
}

function CategoryCard({ category, grade, items, subs, samples, onAdd, onDelete }: CardProps) {
  const [value, setValue] = useState('')
  const [sub, setSub] = useState(subs[0] ?? '')
  const [everyYear, setEveryYear] = useState(category === '동아리')

  const submit = () => {
    const v = value.trim()
    if (!v) return
    onAdd(v, sub, everyYear)
    setValue('')
  }

  const chips = samples?.get(sub) ?? []

  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="text-[14px] font-extrabold text-ink mb-3">
        {CATEGORY_LABEL[category]}
      </div>

      {/* 하위 활동 선택 */}
      {subs.length > 1 && (
        <div className="flex gap-1.5 mb-2.5">
          {subs.map((s) => {
            const on = sub === s
            return (
              <button
                key={s}
                onClick={() => setSub(s)}
                className="px-2.5 py-1 rounded-lg text-[11.5px] border transition-all"
                style={{
                  borderColor: on ? '#93C5FD' : '#E5E7EB',
                  background: on ? '#EFF6FF' : '#fff',
                  color: on ? '#1E3A8A' : '#6B7280',
                  fontWeight: on ? 700 : 500,
                }}
              >
                {s}
              </button>
            )
          })}
        </div>
      )}

      {/* 예시 칩 — 누르면 입력창에 채워짐 */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => setValue(c)}
              className="text-[11px] text-ink-muted bg-gray-50 border border-line rounded-full px-2.5 py-1 hover:bg-gray-100 transition-colors"
            >
              + {c}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-2.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="우리 학교에서 하는 활동을 적어주세요"
          className="flex-1 h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-brand-high"
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="h-10 px-4 bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-40"
        >
          추가
        </button>
      </div>

      <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={everyYear}
          onChange={(e) => setEveryYear(e.target.checked)}
        />
        <span className="text-[11.5px] text-ink-secondary">
          3년 내내 하는 활동이에요 (학년 구분 없이 저장)
        </span>
      </label>

      {/* 등록된 활동 */}
      {items.length === 0 ? (
        <div className="text-[12px] text-ink-muted text-center py-3">
          아직 입력한 활동이 없어요
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 bg-brand-high-pale border border-brand-high-light rounded-full pl-3 pr-2 py-1.5 text-[12px] font-semibold text-brand-high-dark"
            >
              {a.name}
              {a.grade === null && (
                <span className="text-[9.5px] font-bold text-ink-muted">매년</span>
              )}
              <button
                onClick={() => onDelete(a.id)}
                className="text-ink-muted hover:text-red-500 text-[14px] leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}