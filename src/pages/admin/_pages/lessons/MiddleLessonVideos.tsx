import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MiddleGrade } from '@/pages/admin/_hooks/middle/useMiddleLessons'

const GRADES: MiddleGrade[] = ['중1', '중2', '중3']
const PARTS = [1, 2, 3, 4] as const

interface LessonRow {
  id: string
  grade: MiddleGrade
  month_no: number
  month_label: string
  week_no: number
  title: string
  sub_title: string | null
  page_range: string | null
  video_url: string | null
  video_url_1: string | null
  video_url_2: string | null
  video_url_3: string | null
  video_url_4: string | null
  sort_order: number
}

/** 유튜브·비메오 링크에서 미리보기용 주소 */
function toEmbed(url: string): string | null {
  const u = url.trim()
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/)
  if (vimeo) {
    const [, id, hash] = vimeo
    return `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}`
  }
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`
  return null
}

export default function MiddleLessonVideos() {
  const qc = useQueryClient()
  const [grade, setGrade] = useState<MiddleGrade>('중1')
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<number, string>>({})
  const [applyBoth, setApplyBoth] = useState(true)
  const [preview, setPreview] = useState<string | null>(null)

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['admin-middle-lessons', grade],
    queryFn: async (): Promise<LessonRow[]> => {
      const { data, error } = await supabase
        .from('middle_lessons')
        .select(
          'id, grade, month_no, month_label, week_no, title, sub_title, page_range, video_url, video_url_1, video_url_2, video_url_3, video_url_4, sort_order',
        )
        .eq('grade', grade)
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as LessonRow[]
    },
  })

  const months = useMemo(() => {
    const m = new Map<string, LessonRow[]>()
    for (const l of lessons) {
      if (!m.has(l.month_label)) m.set(l.month_label, [])
      m.get(l.month_label)!.push(l)
    }
    return [...m.entries()].map(([label, list]) => ({
      label,
      list: list.sort((a, b) => a.week_no - b.week_no),
    }))
  }, [lessons])

  const save = useMutation({
    mutationFn: async (row: LessonRow) => {
      const payload: Record<string, string | null> = {}
      for (const p of PARTS) {
        payload[`video_url_${p}`] = (draft[p] ?? '').trim() || null
      }

      // 중1·2를 같이 쓰는 경우 두 학년 모두 갱신
      const targets: MiddleGrade[] =
        applyBoth && (row.grade === '중1' || row.grade === '중2')
          ? ['중1', '중2']
          : [row.grade]

      const { error } = await supabase
        .from('middle_lessons')
        .update(payload)
        .in('grade', targets)
        .eq('month_no', row.month_no)
        .eq('week_no', row.week_no)

      if (error) throw error
      return targets
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-middle-lessons'] })
      setOpenId(null)
    },
  })

  const openEditor = (l: LessonRow) => {
    setOpenId(l.id)
    setPreview(null)
    setDraft({
      1: l.video_url_1 ?? l.video_url ?? '',
      2: l.video_url_2 ?? '',
      3: l.video_url_3 ?? '',
      4: l.video_url_4 ?? '',
    })
  }

  const filledCount = (l: LessonRow) =>
    PARTS.filter((p) => (l as any)[`video_url_${p}`]).length

  const totalFilled = lessons.reduce((a, l) => a + filledCount(l), 0)

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-[1000px] mx-auto">
        <div className="mb-5">
          <div className="text-[20px] font-extrabold text-ink tracking-tight">수업 영상 관리</div>
          <div className="text-[13px] text-ink-muted mt-0.5">
            주차마다 영상 4편을 등록해요. 유튜브·비메오 링크를 그대로 붙여넣으면 됩니다.
          </div>
        </div>

        {/* 학년 탭 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {GRADES.map((g) => {
            const on = grade === g
            return (
              <button
                key={g}
                onClick={() => { setGrade(g); setOpenId(null) }}
                className="px-4 py-2 rounded-full text-[13px] border transition-all"
                style={{
                  background: on ? '#10B981' : '#fff',
                  color: on ? '#fff' : '#6B7280',
                  borderColor: on ? '#10B981' : '#E5E7EB',
                  fontWeight: on ? 700 : 500,
                }}
              >
                {g}
              </button>
            )
          })}

          <span className="ml-auto text-[12px] text-ink-muted">
            등록된 영상 <b className="text-[14px] text-brand-middle">{totalFilled}</b> / {lessons.length * 4}편
          </span>
        </div>

        {(grade === '중1' || grade === '중2') && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none bg-brand-middle-pale/60 border border-brand-middle-light rounded-xl px-4 py-2.5">
            <input
              type="checkbox"
              checked={applyBoth}
              onChange={(e) => setApplyBoth(e.target.checked)}
            />
            <span className="text-[12.5px] text-brand-middle-dark font-semibold">
              중1·중2에 같은 영상 적용
            </span>
            <span className="text-[11.5px] text-ink-muted">
              저장하면 두 학년 같은 주차가 함께 갱신돼요
            </span>
          </label>
        )}

        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin mb-3" />
            <div className="text-[13px] text-ink-secondary font-medium">불러오는 중...</div>
          </div>
        ) : lessons.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl py-16 text-center">
            <div className="text-[14px] font-bold text-ink mb-1">{grade} 수업이 등록되지 않았어요</div>
            <div className="text-[12px] text-ink-secondary">마스터에 문의해주세요</div>
          </div>
        ) : (
          months.map((m) => (
            <div key={m.label} className="mb-5">
              <div className="text-[13px] font-extrabold text-ink mb-2">{m.label}</div>

              <div className="flex flex-col gap-2">
                {m.list.map((l) => {
                  const isOpen = openId === l.id
                  const filled = filledCount(l)

                  return (
                    <div
                      key={l.id}
                      className="bg-white border rounded-2xl transition-all"
                      style={{ borderColor: isOpen ? '#10B981' : '#E5E7EB' }}
                    >
                      <button
                        onClick={() => (isOpen ? setOpenId(null) : openEditor(l))}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                      >
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{
                            background: filled === 4 ? '#10B981' : filled > 0 ? '#D1FAE5' : '#F1F5F9',
                            color: filled === 4 ? '#fff' : filled > 0 ? '#065F46' : '#94A3B8',
                          }}
                        >
                          {l.week_no}
                        </span>

                        <span className="flex-1 min-w-0">
                          <span className="block text-[13.5px] font-bold text-ink truncate">
                            {l.title}
                          </span>
                          <span className="block text-[11px] text-ink-muted mt-0.5">
                            {l.page_range ?? '교재 범위 미정'}
                          </span>
                        </span>

                        <span
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{
                            background: filled === 4 ? '#ECFDF5' : '#F8FAFC',
                            color: filled === 4 ? '#065F46' : '#94A3B8',
                          }}
                        >
                          {filled}/4편
                        </span>

                        <span className="text-[11px] text-ink-muted flex-shrink-0">
                          {isOpen ? '접기 ▲' : '편집 ▼'}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-line pt-3.5">
                          <div className="flex flex-col gap-2.5">
                            {PARTS.map((p) => {
                              const v = draft[p] ?? ''
                              const embed = v.trim() ? toEmbed(v) : null
                              return (
                                <div key={p} className="flex items-center gap-2">
                                  <span className="w-9 text-[12px] font-bold text-ink-secondary flex-shrink-0">
                                    {p}편
                                  </span>
                                  <input
                                    value={v}
                                    onChange={(e) =>
                                      setDraft((d) => ({ ...d, [p]: e.target.value }))
                                    }
                                    placeholder="https://youtu.be/... 또는 https://vimeo.com/..."
                                    className="flex-1 h-10 border border-line rounded-lg px-3 text-[12.5px] outline-none focus:border-brand-middle"
                                  />
                                  <button
                                    onClick={() => setPreview(embed)}
                                    disabled={!embed}
                                    className="h-10 px-3 bg-white border border-line text-ink-secondary rounded-lg text-[11.5px] font-semibold disabled:opacity-40 flex-shrink-0"
                                  >
                                    미리보기
                                  </button>
                                </div>
                              )
                            })}
                          </div>

                          {preview && (
                            <div className="mt-3 rounded-xl overflow-hidden bg-black aspect-video">
                              <iframe
                                src={preview}
                                title="미리보기"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full border-0"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-3.5">
                            <span className="text-[11.5px] text-ink-muted">
                              {applyBoth && (l.grade === '중1' || l.grade === '중2')
                                ? '중1·중2 두 학년에 저장돼요'
                                : `${l.grade}에만 저장돼요`}
                            </span>
                            <button
                              onClick={() => save.mutate(l)}
                              disabled={save.isPending}
                              className="ml-auto h-10 px-5 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-lg text-[13px] font-bold disabled:opacity-50"
                            >
                              {save.isPending ? '저장 중...' : '저장'}
                            </button>
                          </div>

                          {save.isError && (
                            <div className="text-[12px] text-red-600 mt-2">
                              저장하지 못했어요: {(save.error as Error).message}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}