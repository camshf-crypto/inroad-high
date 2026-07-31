import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState } from '@/lib/auth/atoms'
import TopicInterview from './TopicInterview'
import ReportWriter, { type ReportFormat } from './ReportWriter'
import ArchiveWriter from './ArchiveWriter'

type StepKey = 'research' | 'report' | 'present' | 'debate' | 'archive'
type Status = 'todo' | 'doing' | 'done'

const STEPS: { key: StepKey; order: number; label: string; color: string }[] = [
  { key: 'research', order: 1, label: '자료 조사', color: '#0EA5E9' },
  { key: 'report', order: 2, label: '보고서', color: '#059669' },
  { key: 'present', order: 3, label: '발표', color: '#D97706' },
  { key: 'debate', order: 4, label: '심층 질문', color: '#7C3AED' },
  { key: 'archive', order: 5, label: '활동 정리', color: '#DC2626' },
]

const KINDS: { key: string; label: string }[] = [
  { key: 'paper', label: '논문' },
  { key: 'stat', label: '통계' },
  { key: 'article', label: '기사' },
  { key: 'book', label: '책' },
  { key: 'site', label: '사이트' },
  { key: 'etc', label: '기타' },
]

const WRITE_STEPS: Record<string, { title: string; hint: string; placeholder: string }> = {
  report: {
    title: '보고서 쓰기',
    hint: '자료 조사에서 모은 근거를 바탕으로 써요. 개요는 과목 상세에서 고른 양식을 따르면 돼요.',
    placeholder: '서론부터 차례대로 적어보세요.',
  },
  present: {
    title: '발표 대본 쓰기',
    hint: '보고서를 3분 분량으로 압축해요. 말하듯이 쓰는 게 좋아요.',
    placeholder: '안녕하세요. 저는 ○○을 주제로 탐구했습니다…',
  },
}

interface TopicRow {
  id: string
  node_id: string
  title: string
  area: string | null
  goal_text: string | null
  char_limit: number
  high_roadmap_node: { subject_name: string; grade: number } | null
}

interface PipeRow {
  id: string
  step: StepKey
  status: Status
  content: string | null
  report_format: string | null
  review_status: string | null
  feedback: string | null
  final_content: string | null
}

interface SourceRow {
  id: string
  kind: string
  title: string
  author: string | null
  url: string | null
  published: string | null
  note: string | null
}

export default function TopicWorkspace() {
  const { topicId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const student = useAtomValue(studentState)
  const studentId = student?.id ? String(student.id) : undefined

  const stepParam = params.get('step') as StepKey | null
  const step: StepKey = STEPS.some((s) => s.key === stepParam) ? stepParam! : 'research'

  const { data: topic, isLoading } = useQuery({
    queryKey: ['workspace-topic', topicId],
    enabled: !!topicId,
    queryFn: async (): Promise<TopicRow | null> => {
      const { data, error } = await supabase
        .from('high_roadmap_topic')
        .select(
          'id, node_id, title, area, goal_text, char_limit, high_roadmap_node(subject_name, grade)',
        )
        .eq('id', topicId!)
        .maybeSingle()
      if (error) throw error
      return data as unknown as TopicRow | null
    },
  })

  const { data: pipes = [] } = useQuery({
    queryKey: ['topic-pipeline', topicId],
    enabled: !!topicId,
    queryFn: async (): Promise<PipeRow[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_pipeline')
        .select('id, step, status, content, report_format, review_status, feedback, final_content')
        .eq('topic_id', topicId!)
      if (error) throw error
      return (data ?? []) as PipeRow[]
    },
  })

  const current = pipes.find((p) => p.step === step)
  const doneCount = pipes.filter((p) => p.status === 'done').length

  const savePipe = useMutation({
    mutationFn: async (v: {
      content?: string
      status?: Status
      format?: string
      reviewStatus?: string
    }) => {
      if (!studentId || !topicId) throw new Error('정보가 없습니다')
      const order = STEPS.find((s) => s.key === step)!.order

      const { error } = await supabase.from('high_roadmap_pipeline').upsert(
        {
          topic_id: topicId,
          student_id: studentId,
          step,
          step_order: order,
          status: v.status ?? current?.status ?? 'doing',
          content: v.content ?? current?.content ?? null,
          report_format: v.format ?? current?.report_format ?? null,
          review_status: v.reviewStatus ?? current?.review_status ?? 'draft',
          requested_at: v.reviewStatus === 'requested' ? new Date().toISOString() : undefined,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'topic_id,step' },
      )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topic-pipeline', topicId] }),
  })

  if (isLoading) {
    return <div className="p-6 text-[13px] text-ink-muted">불러오는 중…</div>
  }

  if (!topic) {
    return (
      <div className="p-6">
        <div className="text-[13px] text-ink-secondary mb-3">탐구주제를 찾을 수 없어요.</div>
        <button
          onClick={() => navigate('/high-student/roadmap-v2')}
          className="h-9 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold"
        >
          ← 로드맵으로
        </button>
      </div>
    )
  }

  const node = topic.high_roadmap_node

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className={step === 'report' || step === 'research' ? 'max-w-[1180px] mx-auto' : 'max-w-[880px] mx-auto'}>
        {/* 헤더 */}
        <div className="mb-4">
          <button
            onClick={() => navigate(`/high-student/roadmap-v2/node/${topic.node_id}`)}
            className="text-[12px] font-semibold text-ink-secondary hover:text-ink mb-2"
          >
            ← 과목으로
          </button>

          <div className="flex items-center gap-2 flex-wrap mb-1">
            {node && (
              <span className="text-[10.5px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full">
                고{node.grade} · {node.subject_name}
              </span>
            )}
            {topic.area && (
              <span className="text-[10.5px] text-ink-muted">{topic.area}</span>
            )}
            <span className="ml-auto text-[11px] text-ink-muted">
              <b className="text-[13px] text-brand-high">{doneCount}</b> / 5 완료
            </span>
          </div>

          <div className="text-[18px] font-extrabold text-ink leading-snug">{topic.title}</div>
          {topic.goal_text && (
            <div className="text-[12px] text-ink-secondary mt-0.5">
              {topic.goal_text} 기준 · 세특 {topic.char_limit}자
            </div>
          )}
        </div>

        {/* 단계 탭 */}
        <div className="flex gap-1.5 overflow-x-auto pb-3">
          {STEPS.map((s) => {
            const p = pipes.find((x) => x.step === s.key)
            const on = step === s.key
            const done = p?.status === 'done'
            return (
              <button
                key={s.key}
                onClick={() => setParams({ step: s.key })}
                className="px-3.5 py-2 rounded-full text-[12.5px] border whitespace-nowrap flex items-center gap-1.5 transition-all flex-shrink-0"
                style={{
                  background: on ? s.color : '#fff',
                  color: on ? '#fff' : done ? '#065F46' : '#6B7280',
                  borderColor: on ? s.color : done ? '#A7F3D0' : '#E5E7EB',
                  fontWeight: on ? 700 : 500,
                }}
              >
                {done && !on ? '✓' : s.order}
                {s.label}
              </button>
            )
          })}
        </div>

        {/* 단계 내용 */}
        {step === 'research' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-3 items-start">
            <SearchPanel defaultQuery={topic.area || topic.title} />
            <SourceList topicId={topic.id} studentId={studentId} />
          </div>
        ) : step === 'report' ? (
          <ReportWriter
            topicId={topic.id}
            topicTitle={topic.title}
            major={topic.goal_text}
            grade={node?.grade}
            content={current?.content ?? ''}
            format={(current?.report_format as ReportFormat | null) ?? null}
            saving={savePipe.isPending}
            reviewStatus={current?.review_status}
            feedback={current?.feedback}
            finalContent={current?.final_content}
            onSave={(content) => savePipe.mutate({ content })}
            onPickFormat={(f) => savePipe.mutate({ format: f })}
            onRequestReview={() => savePipe.mutate({ reviewStatus: 'requested' })}
            onGoResearch={() => setParams({ step: 'research' })}
          />
        ) : step === 'archive' ? (
          <ArchiveWriter
            topicId={topic.id}
            content={current?.content ?? ''}
            saving={savePipe.isPending}
            onSave={(content) => savePipe.mutate({ content })}
          />
        ) : step === 'debate' ? (
          <TopicInterview
            topicTitle={topic.title}
            major={topic.goal_text}
            grade={node?.grade}
            saved={current?.content ?? null}
            saving={savePipe.isPending}
            onSaveContent={(content) => savePipe.mutate({ content })}
          />
        ) : (
          <WriteStep
            key={step}
            step={step}
            content={current?.content ?? ''}
            onSave={(content) => savePipe.mutate({ content })}
            saving={savePipe.isPending}
          />
        )}

        {/* 완료 토글 */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => {
              const done = current?.status === 'done'
              savePipe.mutate(
                { status: done ? 'doing' : 'done' },
                {
                  onSuccess: () => {
                    if (done) return
                    const i = STEPS.findIndex((x) => x.key === step)
                    if (i < STEPS.length - 1) setParams({ step: STEPS[i + 1].key })
                    else navigate('/high-student/roadmap-v2')
                  },
                },
              )
            }}
            className="h-11 px-5 rounded-xl text-[13px] font-bold transition-all"
            style={{
              background: current?.status === 'done' ? '#ECFDF5' : '#10B981',
              color: current?.status === 'done' ? '#065F46' : '#fff',
              border: current?.status === 'done' ? '1px solid #A7F3D0' : 'none',
            }}
          >
            {current?.status === 'done'
              ? '✓ 완료함 (다시 열기)'
              : step === 'archive'
                ? '탐구 마치고 로드맵으로 →'
                : '완료하고 다음 단계로 →'}
          </button>

          {savePipe.isError && (
            <span className="text-[12px] text-red-600">
              {(savePipe.error as Error).message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 1단계 — 자료 조사
// ============================================================

function SourceList({ topicId, studentId }: { topicId: string; studentId?: string }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    kind: 'article',
    title: '',
    author: '',
    url: '',
    published: '',
    note: '',
  })

  const { data: rows = [] } = useQuery({
    queryKey: ['topic-sources', topicId],
    queryFn: async (): Promise<SourceRow[]> => {
      const { data, error } = await supabase
        .from('high_roadmap_source')
        .select('id, kind, title, author, url, published, note')
        .eq('topic_id', topicId)
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      return (data ?? []) as SourceRow[]
    },
  })

  const add = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error('학생 정보가 없습니다')
      if (!form.title.trim()) throw new Error('자료 제목을 적어주세요')
      const { error } = await supabase.from('high_roadmap_source').insert({
        topic_id: topicId,
        student_id: studentId,
        kind: form.kind,
        title: form.title.trim(),
        author: form.author.trim() || null,
        url: form.url.trim() || null,
        published: form.published.trim() || null,
        note: form.note.trim() || null,
        sort_order: rows.length,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topic-sources', topicId] })
      setForm({ kind: 'article', title: '', author: '', url: '', published: '', note: '' })
      setOpen(false)
    },
  })

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('high_roadmap_source').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topic-sources', topicId] }),
  })

  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[14px] font-extrabold text-ink">모은 자료</div>
        <span className="text-[11px] text-ink-muted">{rows.length}건</span>
      </div>
      <div className="text-[11.5px] text-ink-muted mb-3 leading-relaxed">
        논문·통계·기사를 찾아 정리해요. 핵심 근거 3~5개면 보고서 쓰기가 훨씬 쉬워져요.
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {rows.map((r) => (
            <div key={r.id} className="border border-line rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-bold text-brand-high bg-brand-high-pale px-2 py-0.5 rounded-full">
                  {KINDS.find((k) => k.key === r.kind)?.label ?? r.kind}
                </span>
                <span className="text-[13px] font-bold text-ink">{r.title}</span>
                <button
                  onClick={() => del.mutate(r.id)}
                  className="ml-auto text-[11px] text-ink-muted hover:text-red-500"
                >
                  삭제
                </button>
              </div>
              {(r.author || r.published) && (
                <div className="text-[11px] text-ink-muted mb-1">
                  {[r.author, r.published].filter(Boolean).join(' · ')}
                </div>
              )}
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-brand-high hover:underline break-all"
                >
                  {r.url}
                </a>
              )}
              {r.note && (
                <div className="text-[12px] text-ink-secondary mt-1.5 leading-relaxed whitespace-pre-wrap">
                  {r.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full h-11 border border-dashed border-line rounded-xl text-[13px] font-semibold text-ink-secondary hover:border-brand-high-light hover:text-brand-high transition-all"
        >
          + 자료 추가
        </button>
      ) : (
        <div className="border border-brand-high rounded-xl p-4 flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => {
              const on = form.kind === k.key
              return (
                <button
                  key={k.key}
                  onClick={() => setForm({ ...form, kind: k.key })}
                  className="px-2.5 py-1 rounded-lg text-[11.5px] border transition-all"
                  style={{
                    borderColor: on ? '#2563EB' : '#E5E7EB',
                    background: on ? '#EFF6FF' : '#fff',
                    color: on ? '#1E3A8A' : '#6B7280',
                    fontWeight: on ? 700 : 500,
                  }}
                >
                  {k.label}
                </button>
              )
            })}
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="자료 제목 *"
            className="h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-brand-high"
          />
          <div className="flex gap-2">
            <input
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder="저자·기관"
              className="flex-1 h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-brand-high"
            />
            <input
              value={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.value })}
              placeholder="발행 연도"
              className="w-[110px] h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-brand-high"
            />
          </div>
          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="링크 (선택)"
            className="h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-brand-high"
          />
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="이 자료에서 얻은 근거를 적어두세요"
            rows={3}
            className="border border-line rounded-lg px-3 py-2 text-[13px] outline-none resize-y focus:border-brand-high"
          />

          <div className="flex gap-2">
            <button
              onClick={() => add.mutate()}
              disabled={!form.title.trim() || add.isPending}
              className="flex-1 h-10 bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-40"
            >
              {add.isPending ? '저장 중…' : '자료 추가'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="h-10 px-4 bg-white border border-line text-ink-secondary rounded-lg text-[13px] font-semibold"
            >
              취소
            </button>
          </div>

          {add.isError && (
            <div className="text-[12px] text-red-600">{(add.error as Error).message}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// 2~5단계 — 글 쓰기
// ============================================================

function WriteStep({
  step, content, onSave, saving,
}: {
  step: StepKey
  content: string
  onSave: (content: string) => void
  saving: boolean
}) {
  const [text, setText] = useState(content)
  const info = WRITE_STEPS[step]

  useEffect(() => setText(content), [content])

  const dirty = text !== content
  const charCount = useMemo(() => text.replace(/\s/g, '').length, [text])

  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="text-[14px] font-extrabold text-ink mb-1">{info.title}</div>
      <div className="text-[11.5px] text-ink-muted mb-3 leading-relaxed">{info.hint}</div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={info.placeholder}
        rows={16}
        className="w-full border border-line rounded-xl px-4 py-3 text-[13.5px] leading-[1.8] outline-none resize-y focus:border-brand-high"
      />

      <div className="flex items-center gap-2 mt-2.5">
        <span className="text-[11px] text-ink-muted">공백 제외 {charCount}자</span>
        <button
          onClick={() => onSave(text)}
          disabled={!dirty || saving}
          className="ml-auto h-10 px-5 bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-40"
        >
          {saving ? '저장 중…' : dirty ? '저장' : '저장됨'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// 자료 검색 — 밖에 나가서 찾아오는 걸 돕는 패널
// ============================================================

const ENGINES = [
  { key: 'naver', label: '네이버', url: (q: string) => `https://search.naver.com/search.naver?query=${q}` },
  { key: 'google', label: '구글', url: (q: string) => `https://www.google.com/search?q=${q}` },
]

const QUICK_LINKS = [
  { label: '네이버 지식백과', hint: '개념 잡을 때', url: (q: string) => `https://terms.naver.com/search.naver?query=${q}` },
  { label: '위키백과', hint: '전체 그림 보기', url: (q: string) => `https://ko.wikipedia.org/w/index.php?search=${q}` },
  { label: '통계청 KOSIS', hint: '숫자·통계 찾기', url: (q: string) => `https://kosis.kr/search/search.do?query=${q}` },
  { label: 'RISS 논문검색', hint: '논문·학술자료', url: (q: string) => `https://www.riss.kr/search/Search.do?query=${q}` },
  { label: '국회도서관', hint: '자료·보고서', url: (q: string) => `https://dl.nanet.go.kr/search/searchInnerList.do?searchKeyword=${q}` },
]

function SearchPanel({ defaultQuery }: { defaultQuery: string }) {
  const [engine, setEngine] = useState('naver')
  const [q, setQ] = useState(defaultQuery)

  const open = (url: string) => window.open(url, '_blank', 'noopener')
  const enc = encodeURIComponent(q.trim() || defaultQuery)

  const search = () => {
    const e = ENGINES.find((x) => x.key === engine)!
    open(e.url(enc))
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="text-[14px] font-extrabold text-ink mb-3">자료 검색</div>

      <div className="flex gap-1.5 mb-2.5">
        {ENGINES.map((e) => {
          const on = engine === e.key
          return (
            <button
              key={e.key}
              onClick={() => setEngine(e.key)}
              className="flex-1 h-10 rounded-lg text-[13px] font-bold transition-all"
              style={{
                background: on ? (e.key === 'naver' ? '#03C75A' : '#4285F4') : '#F1F5F9',
                color: on ? '#fff' : '#64748B',
              }}
            >
              {e.label}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          onKeyDown={(ev) => ev.key === 'Enter' && search()}
          placeholder="검색어를 입력하세요"
          className="flex-1 h-11 border border-line rounded-lg px-3.5 text-[13px] outline-none focus:border-brand-high"
        />
        <button
          onClick={search}
          className="w-[52px] bg-brand-high text-white rounded-lg text-[16px] font-bold"
        >
          🔍
        </button>
      </div>

      <div className="text-[11px] font-bold text-ink-muted mb-2">바로 가기</div>
      <div className="flex flex-col gap-1.5">
        {QUICK_LINKS.map((l) => (
          <button
            key={l.label}
            onClick={() => open(l.url(enc))}
            className="w-full flex items-center gap-2 text-left border border-line rounded-lg px-3.5 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px] font-semibold text-ink">{l.label}</span>
              <span className="block text-[10.5px] text-ink-muted mt-0.5">{l.hint}</span>
            </span>
            <span className="text-[12px] text-ink-muted flex-shrink-0">↗</span>
          </button>
        ))}
      </div>

      <div className="text-[10.5px] text-ink-muted mt-3 leading-relaxed">
        새 탭으로 열려요. 쓸 만한 걸 찾으면 오른쪽에 자료로 추가해두세요.
      </div>
    </div>
  )
}