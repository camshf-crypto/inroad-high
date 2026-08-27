import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  description?: string
  /** 카카오에서 실제로 찾았는지 */
  verified?: boolean
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

  // 책 추가 팝업
  const [openSearch, setOpenSearch] = useState(false)
  const [addTab, setAddTab] = useState<'reco' | 'search' | 'chain'>('reco')
  /** 추천 범위 — 내 학과 / 내 계열 / 전체 */
  const [scope, setScope] = useState<'major' | 'series' | 'all'>('major')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<BookSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<BookSearchResult | null>(null)
  const [reason, setReason] = useState('')
  const [addGrade, setAddGrade] = useState<number>(myGrade)
  const [recordFor, setRecordFor] = useState<any | null>(null)
  const [editFor, setEditFor] = useState<any | null>(null)
  const [subject, setSubject] = useState('')
  const [takeSubject, setTakeSubject] = useState('')
  const [takeGrade, setTakeGrade] = useState<number>(myGrade)

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

  /** 본사·학원이 등록한 추천 도서 */
  const { data: recoBooks = [] } = useQuery({
    queryKey: ['reco-books', scope, series, major],
    enabled: openSearch && addTab === 'reco',
    queryFn: async () => {
      let q = supabase
        .from('high_roadmap_book')
        .select('id, title, author, publisher, series, major, subject, level, why_reco, concepts')
        .eq('is_active', true)
        .order('title')
      if (scope === 'major' && major) q = q.eq('major', major)
      else if (scope !== 'all' && series) q = q.eq('series', series)
      const { data, error } = await q
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
        book_description: (picked as any).description || null,
        subject: subject.trim() || undefined,
        reason: reason.trim() || '직접 골라 읽기 시작한 책',
        grade: addGrade,
      },
      {
        onSuccess: () => {
          setPicked(null); setReason(''); setSubject(''); setAddGrade(myGrade)
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
      // 담을 때 저장해둔 책 소개가 없으면 카카오에서 한 번 가져온다
      let desc: string = anchor.book_description ?? ''
      if (!desc) {
        try {
          const r = await searchBooksPaged(
            `${anchor.book_title} ${anchor.author ?? ''}`.trim(), 1, 3,
          )
          const flat = (x: string) => x.replace(/\s/g, '')
          const hit =
            r.results.find((x) => flat(x.title).includes(flat(anchor.book_title))) ?? r.results[0]
          desc = hit?.description ?? ''
          if (desc) {
            await supabase
              .from('high_reading')
              .update({ book_description: desc })
              .eq('id', anchor.id)
          }
        } catch {
          /* 소개를 못 가져와도 추천은 진행 */
        }
      }

      const { data, error: fnErr } = await supabase.functions.invoke('high-recommend-books', {
        body: {
          anchor: {
            title: anchor.book_title,
            author: anchor.author,
            description: desc || null,
            subject: anchor.subject,
            summary: anchor.reason,
          },
          relation: relKey,
          context: {
            grade: takeGrade,
            targetSubject: takeSubject || anchor.subject || null,
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

      const raw = (data.books ?? []) as any[]
      console.log('[AI 추천]', raw)

      const flat = (x: string) => x.replace(/\s/g, '')
      const checked = await Promise.all(
        raw.map(async (b: any) => {
          const base: Candidate = {
            title: b.title,
            author: b.author ?? '',
            concept_tag: b.concept_tag ?? '',
            why: b.why ?? '',
            verified: false,
          }
          // 제목+저자 → 안 나오면 제목만으로 한 번 더
          for (const q of [`${b.title} ${b.author ?? ''}`.trim(), b.title]) {
            try {
              const r = await searchBooksPaged(q, 1, 5)
              if (!r.results.length) continue
              const hit =
                r.results.find((x) => flat(x.title).includes(flat(b.title))) ??
                r.results.find((x) => flat(b.title).includes(flat(x.title))) ??
                r.results[0]
              return {
                ...base,
                title: hit.title,
                author: hit.author || base.author,
                publisher: hit.publisher,
                thumbnail: hit.thumbnail,
                description: hit.description ?? '',
                verified: true,
              } as Candidate
            } catch {
              /* 다음 시도 */
            }
          }
          return base
        }),
      )

      if (checked.length === 0) {
        setError(
          data.note
            ? `추천할 책을 찾지 못했어요 — ${data.note}. 과목이나 방향을 바꿔서 눌러볼래요?`
            : '추천을 받지 못했어요. 다른 방향으로 눌러볼래요?',
        )
      }
      setCands(checked)
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
        book_description: c.description || null,
        subject: takeSubject || anchor.subject || undefined,
        reason: `${anchor.book_title}에서 이어짐 · ${c.concept_tag || relLabel(relation)} — ${c.why}`,
        grade: takeGrade,
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
          onClick={() => { setOpenSearch(true); setPicked(null); setAddTab('reco') }}
          className="h-10 px-4 bg-brand-high text-white rounded-xl text-[13px] font-bold hover:bg-brand-high-dark transition-all flex-shrink-0"
        >
          + 책 추가
        </button>
      </div>

      {/* 책 추가 팝업 */}
      {openSearch && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(3px)' }}
          onClick={() => setOpenSearch(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[720px] max-h-[88vh] flex flex-col overflow-hidden"
            style={{ boxShadow: '0 24px 60px rgba(0,0,0,.28)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-line flex items-start justify-between gap-3 flex-shrink-0">
              <div>
                <div className="text-[16px] font-extrabold text-ink">책 추가</div>
                <div className="text-[11.5px] text-ink-muted mt-0.5">
                  계열·학과로 추천 도서를 보거나, 직접 검색해서 고를 수 있어요.
                </div>
              </div>
              <button
                onClick={() => setOpenSearch(false)}
                className="text-ink-muted hover:text-ink text-xl leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>

            {/* 탭 */}
            <div className="px-6 pt-3.5 flex gap-2 flex-shrink-0">
              {([
                { k: 'reco', label: '추천 도서' },
                { k: 'chain', label: '읽은 책 이어가기' },
                { k: 'search', label: '직접 검색하기' },
              ] as const).map((t) => {
                const on = addTab === t.k
                return (
                  <button
                    key={t.k}
                    onClick={() => { setAddTab(t.k); setPicked(null) }}
                    className="h-9 px-4 rounded-lg text-[12.5px] border transition-all"
                    style={{
                      background: on ? '#2563EB' : '#fff',
                      color: on ? '#fff' : '#6B7280',
                      borderColor: on ? '#2563EB' : '#E5E7EB',
                      fontWeight: on ? 700 : 600,
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {picked ? (
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
                    어느 학년에 담을까요?
                  </label>
                  <div className="flex gap-1.5 mb-3">
                    {[1, 2, 3].map((g) => {
                      const on = addGrade === g
                      return (
                        <button
                          key={g}
                          onClick={() => setAddGrade(g)}
                          className="px-4 py-1.5 rounded-lg text-[12.5px] border transition-all"
                          style={{
                            background: on ? '#2563EB' : '#fff',
                            color: on ? '#fff' : '#6B7280',
                            borderColor: on ? '#2563EB' : '#E5E7EB',
                            fontWeight: on ? 700 : 500,
                          }}
                        >
                          고{g}
                          {g === myGrade && <span className="text-[10px] ml-1 opacity-70">현재</span>}
                        </button>
                      )
                    })}
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
                    rows={3}
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
              ) : addTab === 'chain' ? (
                <>
                  <label className="text-[11.5px] font-bold text-ink-secondary block mb-1.5">
                    어떤 책에서 이어갈까요?
                  </label>
                  <select
                    value={anchorId ?? ''}
                    onChange={(e) => {
                      const id = e.target.value || null
                      setAnchorId(id)
                      const a = (readings as any[]).find((x) => x.id === id)
                      setTakeSubject(a?.subject ?? '')
                      setTakeGrade(Number(a?.grade) || myGrade)
                      setRelation(null)
                      setCands([])
                      setError('')
                    }}
                    className={input + ' mb-3'}
                  >
                    <option value="">읽은 책 고르기</option>
                    {(readings as any[]).map((r) => (
                      <option key={r.id} value={r.id}>
                        고{Number(r.grade) || myGrade} · {r.subject || '과목 미지정'} · {r.book_title}
                      </option>
                    ))}
                  </select>

                  {anchor && (
                    <>
                      <div
                        className="rounded-xl px-3.5 py-2.5 mb-3"
                        style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
                      >
                        <div className="text-[10.5px] font-bold text-blue-800 mb-0.5">
                          이 책에서 이어갑니다
                        </div>
                        <div className="text-[13px] font-bold text-ink">{anchor.book_title}</div>
                        <div className="text-[11px] text-ink-muted">{anchor.author}</div>
                      </div>

                      <label className="text-[11.5px] font-bold text-ink-secondary block mb-1.5">
                        담을 때 어느 학년에?
                      </label>
                      <div className="flex gap-1.5 mb-4">
                        {[1, 2, 3].map((g) => {
                          const on = takeGrade === g
                          return (
                            <button
                              key={g}
                              onClick={() => { setTakeGrade(g); setCands([]); setRelation(null) }}
                              className="px-4 py-1.5 rounded-lg text-[12.5px] border transition-all"
                              style={{
                                background: on ? '#2563EB' : '#fff',
                                color: on ? '#fff' : '#6B7280',
                                borderColor: on ? '#2563EB' : '#E5E7EB',
                                fontWeight: on ? 700 : 500,
                              }}
                            >
                              고{g}
                              {g === myGrade && <span className="text-[10px] ml-1 opacity-70">현재</span>}
                            </button>
                          )
                        })}
                      </div>

                      <label className="text-[11.5px] font-bold text-ink-secondary block mb-1.5">
                        담을 때 어느 과목과 엮을까요?
                      </label>
                      {subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {subjects.map((sj) => {
                            const on = takeSubject === sj
                            return (
                              <button
                                key={sj}
                                onClick={() => { setTakeSubject(on ? '' : sj); setCands([]); setRelation(null) }}
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
                        value={takeSubject}
                        onChange={(e) => setTakeSubject(e.target.value)}
                        placeholder="목록에 없으면 직접 입력"
                        className={input + ' mb-4'}
                      />

                      <label className="text-[11.5px] font-bold text-ink-secondary block mb-1.5">
                        어떤 방향으로?
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {relations.map((r) => {
                          const on = relation === r.key
                          return (
                            <button
                              key={r.key}
                              onClick={() => recommend(r.key)}
                              disabled={loading}
                              title={r.description ?? undefined}
                              className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50"
                              style={{
                                background: on ? '#2563EB' : '#fff',
                                color: on ? '#fff' : '#6B7280',
                                borderColor: on ? '#2563EB' : '#E5E7EB',
                              }}
                            >
                              {r.label}
                            </button>
                          )
                        })}
                      </div>

                      {loading && (
                        <div className="text-center py-10">
                          <div
                            className="inline-block w-5 h-5 border-2 border-gray-200 rounded-full animate-spin mb-2"
                            style={{ borderTopColor: '#2563EB' }}
                          />
                          <div className="text-[12.5px] text-ink-secondary">
                            이어질 책을 찾는 중…
                          </div>
                        </div>
                      )}

                      {!loading && error && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
                          {error}
                        </div>
                      )}

                      {!loading && cands.length > 0 && (
                        <div className="flex flex-col gap-2">
                          {cands.map((c) => {
                            const done = added.has(c.title)
                            return (
                              <div key={c.title} className="rounded-xl border border-line p-3.5 flex gap-3">
                                {c.thumbnail ? (
                                  <img src={c.thumbnail} alt="" className="w-12 h-16 object-cover rounded flex-shrink-0" />
                                ) : (
                                  <div className="w-12 h-16 rounded bg-gray-100 flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="text-[13px] font-bold text-ink">{c.title}</div>
                                  <div className="text-[10.5px] text-ink-muted mb-1.5">
                                    {c.author}
                                    {c.publisher ? ` · ${c.publisher}` : ''}
                                  </div>
                                  <span className="flex gap-1 flex-wrap mb-1">
                                    {c.concept_tag && (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                        {c.concept_tag}
                                      </span>
                                    )}
                                    {!c.verified && (
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                        서점 확인 안 됨
                                      </span>
                                    )}
                                  </span>
                                  <div className="text-[11.5px] text-ink-secondary leading-[1.6]">
                                    {c.why}
                                  </div>
                                </div>
                                <button
                                  onClick={() => take(c)}
                                  disabled={done || createReading.isPending}
                                  className="h-9 px-3.5 rounded-lg text-[12px] font-bold flex-shrink-0 self-center disabled:opacity-60"
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
                      )}
                    </>
                  )}
                </>
              ) : addTab === 'search' ? (
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

                  {hits.length === 0 ? (
                    <div className="text-center py-14 text-[12.5px] text-ink-muted">
                      읽고 싶은 책을 검색해 보세요.
                    </div>
                  ) : (
                    <div className="border border-line rounded-lg divide-y divide-slate-100">
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
                  <div
                    className="rounded-xl px-3.5 py-2.5 mb-3"
                    style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
                  >
                    <div className="text-[10.5px] font-bold text-blue-800 mb-0.5">
                      내 진로 기준으로 골랐어요
                    </div>
                    <div className="text-[12px] text-ink">
                      {[series ? `${series}계열` : null, major, career]
                        .filter(Boolean)
                        .join(' · ') || '진로 계열 검사를 먼저 하면 더 정확해져요'}
                    </div>
                  </div>

                  <div className="flex gap-1.5 mb-3">
                    {([
                      { k: 'major', label: major ? `${major} 맞춤` : '내 학과' },
                      { k: 'series', label: series ? `${series}계열 전체` : '내 계열' },
                      { k: 'all', label: '전체 보기' },
                    ] as const).map((t) => {
                      const on = scope === t.k
                      const off = (t.k === 'major' && !major) || (t.k === 'series' && !series)
                      return (
                        <button
                          key={t.k}
                          onClick={() => !off && setScope(t.k)}
                          disabled={off}
                          className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40"
                          style={{
                            background: on ? '#2563EB' : '#fff',
                            color: on ? '#fff' : '#6B7280',
                            borderColor: on ? '#2563EB' : '#E5E7EB',
                          }}
                        >
                          {t.label}
                        </button>
                      )
                    })}
                  </div>

                  {recoBooks.length === 0 ? (
                    <div className="text-center py-14">
                      <div className="text-[13px] font-bold text-ink mb-1">추천 도서를 준비 중이에요</div>
                      <div className="text-[12px] text-ink-secondary">
                        직접 검색하기 탭에서 원하는 책을 찾아 담을 수 있어요.
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {recoBooks.map((b: any) => (
                        <div key={b.id} className="rounded-xl border border-line p-3.5 flex gap-3">
                          <div className="w-12 h-16 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center text-[18px]">
                            📘
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-bold text-ink">{b.title}</div>
                            {b.why_reco && (
                              <div className="text-[11.5px] text-ink-secondary leading-[1.6] mt-0.5">
                                <b className="text-ink">추천 이유</b> {b.why_reco}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(b.concepts ?? []).map((c: string) => (
                                <span
                                  key={c}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700"
                                >
                                  {c}
                                </span>
                              ))}
                              {b.level && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-ink-secondary">
                                  {b.level}
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-ink-muted mt-1">{b.author}</div>
                          </div>
                          <button
                            onClick={() =>
                              setPicked({
                                title: b.title,
                                author: b.author ?? '',
                                publisher: b.publisher ?? '',
                                thumbnail: '',
                                isbn: '',
                                description: b.why_reco ?? '',
                                url: '',
                              } as any)
                            }
                            className="h-9 px-3.5 bg-white border rounded-lg text-[12px] font-bold flex-shrink-0 self-center"
                            style={{ borderColor: '#93C5FD', color: '#1E3A8A' }}
                          >
                            이 책 선택
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
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
                                    {on && (
                                      <span className="flex gap-1 mt-1.5">
                                        <span
                                          onClick={(e) => { e.stopPropagation(); setRecordFor(r) }}
                                          className="text-[10.5px] font-bold px-2 py-1 rounded-md text-white"
                                          style={{ background: '#2563EB' }}
                                        >
                                          독서기록
                                        </span>
                                        <span
                                          onClick={(e) => { e.stopPropagation(); setEditFor(r) }}
                                          className="text-[10.5px] font-bold px-2 py-1 rounded-md border"
                                          style={{ borderColor: '#CBD5E1', color: '#64748B', background: '#fff' }}
                                        >
                                          수정
                                        </span>
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

        </>
      )}

      {recordFor && <RecordModal reading={recordFor} onClose={() => setRecordFor(null)} />}
      {editFor && (
        <EditModal reading={editFor} subjects={subjects} onClose={() => setEditFor(null)} />
      )}
    </div>
  )
}

// ============================================================
// 독서기록 팝업
// ============================================================

function RecordModal({ reading, onClose }: { reading: any; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: analyses = [] } = useReadingAnalyses(reading.id)
  const feedbacks = (analyses as any[]).filter((a) => a.teacher_feedback)

  const [summary, setSummary] = useState(reading.summary ?? '')
  const [quotes, setQuotes] = useState(reading.quotes ?? '')
  const [impression, setImpression] = useState(reading.impression ?? '')
  const [done, setDone] = useState(reading.status === 'completed')

  const ta =
    'w-full border border-line rounded-lg px-3.5 py-2.5 text-[13px] outline-none focus:border-blue-400 resize-none'

  const save = useMutation({
    mutationFn: async () => {
      const patch: Record<string, unknown> = {
        summary: summary.trim() || null,
        quotes: quotes.trim() || null,
        impression: impression.trim() || null,
      }
      if (done) {
        patch.status = 'completed'
        patch.read_at = new Date().toISOString().slice(0, 10)
      }
      const { error } = await supabase.from('high_reading').update(patch).eq('id', reading.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-readings'] })
      onClose()
    },
    onError: (e: any) => alert('저장 실패: ' + (e?.message || '오류')),
  })

  return (
    <Modal title="독서기록" subtitle={reading.book_title} onClose={onClose}>
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
        {reading.reason && (
          <div className="rounded-lg bg-gray-50 border border-line px-3.5 py-2.5">
            <div className="text-[10.5px] font-bold text-ink-secondary mb-0.5">읽으려는 이유</div>
            <div className="text-[12px] text-ink leading-[1.7] whitespace-pre-wrap">
              {reading.reason}
            </div>
          </div>
        )}

        <div>
          <label className="text-[11.5px] font-bold text-ink-secondary block mb-1.5">
            줄거리·핵심 내용
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            placeholder="이 책이 무엇을 다루는지, 핵심 주장이 무엇인지"
            className={ta}
          />
        </div>

        <div>
          <label className="text-[11.5px] font-bold text-ink block mb-1">인상 깊은 구절</label>
          <div className="text-[11px] text-amber-700 mb-1.5">
            면접에서 "그 책에서 기억에 남는 부분은?"에 그대로 쓰여요. 쪽수도 같이 적어두면 좋아요.
          </div>
          <textarea
            value={quotes}
            onChange={(e) => setQuotes(e.target.value)}
            rows={4}
            placeholder={'예) "선택을 설계하는 사람이 결과를 만든다" (p.87)'}
            className={ta}
          />
        </div>

        <div>
          <label className="text-[11.5px] font-bold text-ink-secondary block mb-1.5">
            느낀점·내 생각
          </label>
          <textarea
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            rows={4}
            placeholder="어떤 점이 새로웠는지, 어떤 질문이 생겼는지"
            className={ta}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={done}
            onChange={(e) => setDone(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-[12.5px] font-bold text-ink">다 읽었어요</span>
        </label>

        {feedbacks.map((a: any, i: number) => (
          <div key={a.id} className="rounded-lg bg-blue-50/50 border border-blue-200 px-3.5 py-2.5">
            <div className="text-[10.5px] font-bold text-blue-800 mb-1">
              선생님 피드백 {feedbacks.length > 1 ? `${i + 1}차` : ''}
            </div>
            <div className="text-[12px] text-ink-secondary leading-[1.7] whitespace-pre-wrap">
              {a.teacher_feedback}
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 border-t border-line flex justify-end gap-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="h-10 px-4 bg-white border border-line text-ink-secondary rounded-lg text-[12.5px] font-semibold hover:bg-gray-50"
        >
          취소
        </button>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="h-10 px-5 bg-brand-high text-white rounded-lg text-[12.5px] font-bold disabled:opacity-50"
        >
          {save.isPending ? '저장 중…' : '저장'}
        </button>
      </div>
    </Modal>
  )
}

// ============================================================
// 책 정보 수정 팝업 — 학년 · 과목 · 읽으려는 이유
// ============================================================

function EditModal({
  reading, subjects, onClose,
}: { reading: any; subjects: string[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [grade, setGrade] = useState<number>(Number(reading.grade) || 1)
  const [subject, setSubject] = useState(reading.subject ?? '')
  const [reason, setReason] = useState(reading.reason ?? '')

  const input =
    'w-full h-10 border border-line rounded-lg px-3.5 text-[13px] outline-none focus:border-blue-400'

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('high_reading')
        .update({
          grade,
          subject: subject.trim() || null,
          reason: reason.trim() || null,
        })
        .eq('id', reading.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-readings'] })
      onClose()
    },
    onError: (e: any) => alert('저장 실패: ' + (e?.message || '오류')),
  })

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('high_reading').delete().eq('id', reading.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-readings'] })
      onClose()
    },
    onError: (e: any) => alert('삭제 실패: ' + (e?.message || '오류')),
  })

  return (
    <Modal title="책 정보 수정" subtitle={reading.book_title} onClose={onClose}>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <label className="text-[11.5px] font-bold text-ink-secondary block mb-1.5">
          어느 학년에 담을까요?
        </label>
        <div className="flex gap-1.5 mb-4">
          {[1, 2, 3].map((g) => {
            const on = grade === g
            return (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className="px-4 py-1.5 rounded-lg text-[12.5px] border transition-all"
                style={{
                  background: on ? '#2563EB' : '#fff',
                  color: on ? '#fff' : '#6B7280',
                  borderColor: on ? '#2563EB' : '#E5E7EB',
                  fontWeight: on ? 700 : 500,
                }}
              >
                고{g}
              </button>
            )
          })}
        </div>

        <label className="text-[11.5px] font-bold text-ink-secondary block mb-1.5">
          어느 과목과 엮을까요?
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
          placeholder="목록에 없으면 직접 입력"
          className={input + ' mb-4'}
        />

        <label className="text-[11.5px] font-bold text-ink-secondary block mb-1.5">
          읽으려는 이유
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="이 책을 왜 읽으려는지"
          className="w-full border border-line rounded-lg px-3.5 py-2.5 text-[13px] outline-none focus:border-blue-400 resize-none"
        />
      </div>

      <div className="px-6 py-4 border-t border-line flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => {
            if (window.confirm(`"${reading.book_title}"을 독서리스트에서 지울까요?`)) remove.mutate()
          }}
          disabled={remove.isPending}
          className="h-10 px-3.5 bg-white border border-line text-red-600 rounded-lg text-[12.5px] font-semibold hover:bg-red-50 disabled:opacity-50"
        >
          삭제
        </button>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="h-10 px-4 bg-white border border-line text-ink-secondary rounded-lg text-[12.5px] font-semibold hover:bg-gray-50"
        >
          취소
        </button>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="h-10 px-5 bg-brand-high text-white rounded-lg text-[12.5px] font-bold disabled:opacity-50"
        >
          {save.isPending ? '저장 중…' : '저장'}
        </button>
      </div>
    </Modal>
  )
}

// ============================================================

function Modal({
  title, subtitle, onClose, children,
}: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[640px] max-h-[88vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 24px 60px rgba(0,0,0,.28)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-line flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <div className="text-[16px] font-extrabold text-ink">{title}</div>
            {subtitle && (
              <div className="text-[11.5px] text-ink-muted mt-0.5 truncate">{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink text-xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}