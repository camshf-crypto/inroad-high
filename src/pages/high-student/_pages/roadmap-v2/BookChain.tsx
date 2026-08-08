import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { searchBooksPaged, type BookSearchResult } from '@/lib/kakaoBooks'
import {
  useMyReadings,
  useCreateReading,
  useReadingAnalyses,
} from '@/pages/high-student/_hooks/useMyHighReading'

interface Relation {
  key: string
  label: string
  description: string | null
}

/** AI가 제안한 책 + 카카오로 확인된 정보 */
interface Candidate {
  title: string
  author: string
  concept_tag: string
  why: string
  thumbnail?: string
  publisher?: string
}

interface Props {
  series?: string | null
  major?: string | null
  career?: string | null
  myGrade?: number
  /** 학생이 고른 과목 (없으면 직접 입력) */
  subjects?: string[]
}

export default function BookChain({ series, major, career, myGrade = 1, subjects = [] }: Props) {
  const { data: readings = [] } = useMyReadings()
  const createReading = useCreateReading()

  // 직접 검색해서 추가
  const [openSearch, setOpenSearch] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<BookSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<BookSearchResult | null>(null)
  const [reason, setReason] = useState('')
  const [subject, setSubject] = useState('')
  const [takeSubject, setTakeSubject] = useState('')

  // 이어읽기
  const [anchorId, setAnchorId] = useState<string | null>(null)
  const [relation, setRelation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cands, setCands] = useState<Candidate[]>([])
  const [error, setError] = useState('')
  const [added, setAdded] = useState<Set<string>>(new Set())

  const { data: relations = [] } = useQuery({
    queryKey: ['book-relations'],
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<Relation[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_book_relation')
        .select('key, label, description')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })

  const anchor = readings.find((r: any) => r.id === anchorId) ?? null

  /** 학년 × 과목으로 묶기 */
  const byGrade = useMemo(() => {
    const g = new Map<number, Map<string, any[]>>()
    for (const gr of [1, 2, 3]) g.set(gr, new Map())
    for (const r of readings as any[]) {
      const gr = Number(r.grade) || myGrade
      if (!g.has(gr)) g.set(gr, new Map())
      const k = r.subject?.trim() || '과목 미지정'
      const m = g.get(gr)!
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
    return g
  }, [readings, myGrade])

  const subjectsOf = (gr: number) =>
    [...(byGrade.get(gr)?.entries() ?? [])].sort((a, b) => {
      if (a[0] === '과목 미지정') return 1
      if (b[0] === '과목 미지정') return -1
      return a[0].localeCompare(b[0])
    })

  const countOf = (gr: number) =>
    [...(byGrade.get(gr)?.values() ?? [])].reduce((a, x) => a + x.length, 0)

  const relLabel = (k: string | null) => relations.find((r) => r.key === k)?.label ?? ''

  const input =
    'w-full h-10 border border-line rounded-lg px-3.5 text-[13px] outline-none focus:border-blue-400'

  // ── 카카오 검색 ──
  const doSearch = async () => {
    if (!q.trim()) return
    setSearching(true)
    try {
      const r = await searchBooksPaged(q.trim(), 1, 10)
      setHits(r.results)
    } catch (e: any) {
      alert(e?.message || '검색 실패')
    } finally {
      setSearching(false)
    }
  }

  const addPicked = () => {
    if (!picked) return
    createReading.mutate(
      {
        book_title: picked.title,
        author: picked.author,
        subject: subject.trim() || undefined,
        reason: reason.trim() || '직접 골라 읽기 시작한 책',
        grade: myGrade,
      },
      {
        onSuccess: () => {
          setPicked(null); setReason(''); setSubject('')
          setHits([]); setQ(''); setOpenSearch(false)
        },
        onError: (e: any) => alert('추가 실패: ' + (e?.message || '오류')),
      },
    )
  }

  // ── AI 추천 → 카카오 검증 ──
  const recommend = async (relKey: string) => {
    if (!anchor) return
    setRelation(relKey)
    setLoading(true)
    setError('')
    setCands([])

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('high-recommend-books', {
        body: {
          anchor: {
            title: anchor.book_title,
            author: anchor.author,
            subject: anchor.subject,
            summary: anchor.reason,
          },
          relation: relKey,
          context: {
            grade: myGrade,
            series,
            major,
            career,
            exclude: readings.map((r: any) => r.book_title),
          },
          count: 4,
        },
      })
      if (fnErr) throw new Error(fnErr.message)
      if (!data?.success) throw new Error(data?.error || 'AI 응답이 없어요')

      const checked = await Promise.all(
        (data.books ?? []).map(async (b: any) => {
          try {
            const r = await searchBooksPaged(`${b.title} ${b.author ?? ''}`.trim(), 1, 3)
            const flat = (x: string) => x.replace(/\s/g, '')
            const hit =
              r.results.find((x) => flat(x.title).includes(flat(b.title))) ?? r.results[0]
            if (!hit) return null
            return {
              title: hit.title,
              author: hit.author,
              publisher: hit.publisher,
              thumbnail: hit.thumbnail,
              concept_tag: b.concept_tag ?? '',
              why: b.why ?? '',
            } as Candidate
          } catch {
            return null
          }
        }),
      )

      const ok = checked.filter(Boolean) as Candidate[]
      if (ok.length === 0) setError('추천된 책을 찾지 못했어요. 다른 방향으로 눌러볼래요?')
      setCands(ok)
    } catch (e: any) {
      setError(e?.message || '추천을 받지 못했어요')
    } finally {
      setLoading(false)
    }
  }

  const take = (c: Candidate) => {
    if (!anchor) return
    createReading.mutate(
      {
        book_title: c.title,
        author: c.author,
        subject: takeSubject || anchor.subject || undefined,
        reason: `${anchor.book_title}에서 이어짐 · ${c.concept_tag || relLabel(relation)} — ${c.why}`,
        grade: myGrade,
      },
      {
        onSuccess: () => setAdded((s) => new Set(s).add(c.title)),
        onError: (e: any) => alert('담기 실패: ' + (e?.message || '오류')),
      },
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[16px] font-extrabold text-ink mb-1">독서 이어가기</div>
          <div className="text-[12px] text-ink-secondary leading-relaxed">
            읽은 책을 하나 고르고 어떤 방향으로 이어갈지 정하면 다음 책을 찾아줘요.
            <br />
            <span className="text-ink-muted">
              한 권에서 다음 권으로 이어지는 흐름이 그대로 탐구 근거가 돼요.
            </span>
          </div>
        </div>
        <button
          onClick={() => { setOpenSearch(!openSearch); setPicked(null) }}
          className="h-10 px-4 bg-brand-high text-white rounded-xl text-[13px] font-bold hover:bg-brand-high-dark transition-all flex-shrink-0"
        >
          {openSearch ? '닫기' : '+ 책 검색해서 추가'}
        </button>
      </div>

      {/* 직접 검색 */}
      {openSearch && (
        <div className="rounded-2xl border border-line bg-white p-4 mb-4">
          {!picked ? (
            <>
              <div className="flex gap-2 mb-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  placeholder="책 제목이나 저자로 검색"
                  autoFocus
                  className={input}
                />
                <button
                  onClick={doSearch}
                  disabled={searching}
                  className="h-10 px-4 bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-50 flex-shrink-0"
                >
                  {searching ? '검색 중…' : '검색'}
                </button>
              </div>

              {hits.length > 0 && (
                <div className="border border-line rounded-lg divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                  {hits.map((b, i) => (
                    <button
                      key={i}
                      onClick={() => setPicked(b)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50/40 flex gap-2.5"
                    >
                      {b.thumbnail ? (
                        <img src={b.thumbnail} alt="" className="w-9 h-12 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-12 rounded bg-gray-100 flex-shrink-0" />
                      )}
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-bold text-ink truncate">{b.title}</span>
                        <span className="block text-[11px] text-ink-muted truncate">
                          {b.author}
                          {b.publisher ? ` · ${b.publisher}` : ''}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex gap-3 mb-3">
                {picked.thumbnail ? (
                  <img src={picked.thumbnail} alt="" className="w-14 h-20 object-cover rounded flex-shrink-0" />
                ) : (
                  <div className="w-14 h-20 rounded bg-gray-100 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-ink">{picked.title}</div>
                  <div className="text-[11px] text-ink-muted">
                    {picked.author}
                    {picked.publisher ? ` · ${picked.publisher}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => setPicked(null)}
                  className="text-[11.5px] text-ink-muted hover:text-ink flex-shrink-0"
                >
                  다시 고르기
                </button>
              </div>

              <label className="text-[11.5px] font-bold text-ink-secondary block mb-1.5">
                어느 과목과 엮을까요? <span className="font-medium text-ink-muted">(비워도 돼요)</span>
              </label>
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {subjects.map((sj) => {
                    const on = subject === sj
                    return (
                      <button
                        key={sj}
                        onClick={() => setSubject(on ? '' : sj)}
                        className="text-[11.5px] font-bold px-2.5 py-1.5 rounded-lg border transition-all"
                        style={{
                          background: on ? '#2563EB' : '#fff',
                          color: on ? '#fff' : '#6B7280',
                          borderColor: on ? '#2563EB' : '#E5E7EB',
                        }}
                      >
                        {sj}
                      </button>
                    )
                  })}
                </div>
              )}
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="목록에 없으면 직접 입력 (예: 통합사회)"
                className={input + ' mb-3'}
              />

              <label className="text-[11.5px] font-bold text-ink-secondary block mb-1.5">
                읽으려는 이유
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="이 책을 왜 읽으려는지 한두 문장으로"
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-[13px] outline-none focus:border-blue-400 resize-none mb-3"
              />

              <button
                onClick={addPicked}
                disabled={createReading.isPending}
                className="w-full h-11 bg-brand-high text-white rounded-xl text-[13px] font-bold disabled:opacity-50"
              >
                {createReading.isPending ? '추가 중…' : '내 독서리스트에 추가'}
              </button>
            </>
          )}
        </div>
      )}

      {readings.length === 0 ? (
        <div className="rounded-2xl border border-line bg-gray-50 px-5 py-12 text-center">
          <div className="text-[13.5px] font-bold text-ink mb-1">아직 읽은 책이 없어요</div>
          <div className="text-[12px] text-ink-secondary">
            위에서 책을 검색해 첫 권을 추가하면 다음 책을 이어갈 수 있어요.
          </div>
        </div>
      ) : (
        <>
          {/* 1. 앵커 고르기 */}
          <div className="mb-4">
            <div className="text-[11.5px] font-bold text-ink-secondary mb-2">
              1. 이어갈 책 고르기
            </div>

            <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
              {[1, 2, 3].map((gr) => {
                const groups = subjectsOf(gr)
                const n = countOf(gr)
                const isMine = gr === myGrade
                return (
                  <div
                    key={gr}
                    className="rounded-2xl border bg-white p-3.5"
                    style={{ borderColor: isMine ? '#93C5FD' : '#E5E7EB' }}
                  >
                    <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-line">
                      <span className="text-[13px] font-extrabold text-brand-high-dark">고{gr}</span>
                      {isMine && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          현재
                        </span>
                      )}
                      <span className="ml-auto text-[10.5px] text-ink-muted">{n}권</span>
                    </div>

                    {groups.length === 0 ? (
                      <div className="text-[11.5px] text-ink-muted py-5 text-center">
                        담은 책이 없어요
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {groups.map(([sj, list]) => (
                          <div key={sj}>
                            <div
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mb-1"
                              style={
                                sj === '과목 미지정'
                                  ? { background: '#F3F4F6', color: '#9CA3AF' }
                                  : { background: '#EEF2FF', color: '#4338CA' }
                              }
                            >
                              {sj}
                            </div>
                            <div className="flex flex-col gap-1">
                              {list.map((r: any) => {
                                const on = anchorId === r.id
                                return (
                                  <button
                                    key={r.id}
                                    onClick={() => {
                                      setAnchorId(on ? null : r.id)
                                      setRelation(null)
                                      setCands([])
                                      setError('')
                                    }}
                                    className="rounded-lg border px-2.5 py-1.5 text-left transition-all"
                                    style={{
                                      borderColor: on ? '#2563EB' : '#E5E7EB',
                                      background: on ? '#EFF6FF' : '#fff',
                                    }}
                                  >
                                    <span
                                      className="block text-[12px] leading-[1.4]"
                                      style={{
                                        color: on ? '#1E3A8A' : '#334155',
                                        fontWeight: on ? 700 : 500,
                                      }}
                                    >
                                      {r.book_title}
                                    </span>
                                    {r.author && (
                                      <span className="block text-[10px] text-ink-muted truncate">
                                        {r.author}
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 고른 책 상세 */}
          {anchor && <BookDetail reading={anchor} />}

          {/* 2. 방향 고르기 */}
          {anchor && (
            <div className="mb-4">
              <div className="text-[11.5px] font-bold text-ink-secondary mb-2">
                2. 어떤 방향으로 이어갈까요?
              </div>
              <div className="flex flex-wrap gap-2">
                {relations.map((r) => {
                  const on = relation === r.key
                  return (
                    <button
                      key={r.key}
                      onClick={() => recommend(r.key)}
                      disabled={loading}
                      className="rounded-xl border px-3.5 py-2.5 text-left transition-all disabled:opacity-50"
                      style={{
                        borderColor: on ? '#2563EB' : '#E5E7EB',
                        background: on ? '#EFF6FF' : '#fff',
                        maxWidth: 230,
                      }}
                    >
                      <div
                        className="text-[12.5px] font-bold"
                        style={{ color: on ? '#1E3A8A' : '#334155' }}
                      >
                        {r.label}
                      </div>
                      {r.description && (
                        <div className="text-[10.5px] text-ink-muted mt-0.5 leading-[1.5]">
                          {r.description}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3. 결과 */}
          {loading && (
            <div className="rounded-2xl border border-line bg-white px-5 py-10 text-center">
              <div
                className="inline-block w-5 h-5 border-2 border-gray-200 rounded-full animate-spin mb-2"
                style={{ borderTopColor: '#2563EB' }}
              />
              <div className="text-[12.5px] text-ink-secondary">
                {anchor?.book_title}에서 이어질 책을 찾는 중…
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
              {error}
            </div>
          )}

          {!loading && cands.length > 0 && (
            <div>
              <div className="text-[11.5px] font-bold text-ink-secondary mb-2">
                3. 이어서 읽을 책 · {relLabel(relation)}
              </div>

              {subjects.length > 0 && (
                <div className="rounded-xl border border-line bg-white px-3.5 py-2.5 mb-2">
                  <div className="text-[11px] font-bold text-ink-secondary mb-1.5">
                    담을 때 엮을 과목
                    <span className="font-medium text-ink-muted ml-1">
                      (안 고르면 {anchor?.subject || '과목 없이'} 그대로)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.map((sj) => {
                      const on = takeSubject === sj
                      return (
                        <button
                          key={sj}
                          onClick={() => setTakeSubject(on ? '' : sj)}
                          className="text-[11.5px] font-bold px-2.5 py-1.5 rounded-lg border transition-all"
                          style={{
                            background: on ? '#2563EB' : '#fff',
                            color: on ? '#fff' : '#6B7280',
                            borderColor: on ? '#2563EB' : '#E5E7EB',
                          }}
                        >
                          {sj}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {cands.map((c) => {
                  const done = added.has(c.title)
                  return (
                    <div
                      key={c.title}
                      className="rounded-2xl border border-line bg-white p-4 flex gap-3.5"
                    >
                      {c.thumbnail ? (
                        <img src={c.thumbnail} alt="" className="w-14 h-20 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-20 rounded bg-gray-100 flex-shrink-0" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-bold text-ink">{c.title}</div>
                        <div className="text-[11px] text-ink-muted mb-2">
                          {c.author}
                          {c.publisher ? ` · ${c.publisher}` : ''}
                        </div>

                        {c.concept_tag && (
                          <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block mb-1.5">
                            {c.concept_tag}
                          </span>
                        )}
                        <div className="text-[12px] text-ink-secondary leading-[1.65]">{c.why}</div>
                      </div>

                      <button
                        onClick={() => take(c)}
                        disabled={done || createReading.isPending}
                        className="h-9 px-4 rounded-lg text-[12.5px] font-bold flex-shrink-0 self-center disabled:opacity-60"
                        style={{
                          background: done ? '#ECFDF5' : '#2563EB',
                          color: done ? '#047857' : '#fff',
                          border: done ? '1px solid #6EE7B7' : 'none',
                        }}
                      >
                        {done ? '✓ 담김' : '담기'}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="text-[11px] text-ink-muted mt-2.5 leading-[1.6]">
                담은 책은 독서리스트로 들어가요. 읽고 나면 거기서 기록을 남기고 선생님 피드백을 받을 수 있어요.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// 고른 책 상세 — 정보 · 읽으려는 이유 · 선생님 피드백
// ============================================================

function BookDetail({ reading }: { reading: any }) {
  const { data: analyses = [] } = useReadingAnalyses(reading.id)
  const feedbacks = (analyses as any[]).filter((a) => a.teacher_feedback)

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-4 mb-4">
      <div className="flex items-start gap-2 flex-wrap mb-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold text-ink">{reading.book_title}</div>
          <div className="text-[11.5px] text-ink-muted mt-0.5">
            {reading.author || '저자 미상'}
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {reading.subject && (
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              {reading.subject}
            </span>
          )}
          <span
            className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
            style={
              reading.status === 'completed'
                ? { background: '#ECFDF5', color: '#047857' }
                : { background: '#FFFBEB', color: '#92400E' }
            }
          >
            {reading.status === 'completed' ? '완료' : '읽는 중'}
          </span>
        </div>
      </div>

      {reading.reason && (
        <div className="mb-2.5">
          <div className="text-[10.5px] font-bold text-ink-secondary mb-0.5">읽으려는 이유</div>
          <div className="text-[12.5px] text-ink leading-[1.7] whitespace-pre-wrap">
            {reading.reason}
          </div>
        </div>
      )}

      {reading.plan && (
        <div className="mb-2.5">
          <div className="text-[10.5px] font-bold text-ink-secondary mb-0.5">읽고 나서 할 것</div>
          <div className="text-[12.5px] text-ink leading-[1.7] whitespace-pre-wrap">
            {reading.plan}
          </div>
        </div>
      )}

      {reading.teacher_feedback && (
        <div className="rounded-lg bg-white border border-blue-200 px-3 py-2.5 mb-2">
          <div className="text-[10.5px] font-bold text-blue-800 mb-1">👨‍🏫 선생님 피드백</div>
          <div className="text-[12px] text-ink-secondary leading-[1.7] whitespace-pre-wrap">
            {reading.teacher_feedback}
          </div>
        </div>
      )}

      {feedbacks.map((a, i) => (
        <div key={a.id} className="rounded-lg bg-white border border-blue-200 px-3 py-2.5 mb-2">
          <div className="text-[10.5px] font-bold text-blue-800 mb-1">
            👨‍🏫 선생님 피드백 {feedbacks.length > 1 ? `${i + 1}차` : ''}
          </div>
          <div className="text-[12px] text-ink-secondary leading-[1.7] whitespace-pre-wrap">
            {a.teacher_feedback}
          </div>
        </div>
      ))}

      {!reading.reason && !reading.teacher_feedback && feedbacks.length === 0 && (
        <div className="text-[11.5px] text-ink-muted">
          아직 기록이 없어요. 독서리스트에서 읽은 내용을 남기고 피드백을 받을 수 있어요.
        </div>
      )}
    </div>
  )
}