// src/pages/admin/_pages/lesson-run/LessonPpt.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Document, Page, pdfjs } from 'react-pdf'
import { supabase } from '@/lib/supabase'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

/* pdf.js 워커 — CDN 사용 (번들 설정 불필요) */
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface Theme {
  accent: string
  accentDark: string
  accentBg: string
  accentBorder: string
}

interface Props {
  missionKey: string
  theme: Theme
  title?: string
}

export default function LessonPpt({ missionKey, theme, title }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [pages, setPages] = useState(0)
  const [page, setPage] = useState(1)
  const [width, setWidth] = useState(900)
  const [full, setFull] = useState(false)
  const [err, setErr] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['lesson-ppt', missionKey],
    enabled: !!missionKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_workbook')
        .select('ppt_url, ppt_type, title')
        .eq('mission_key', missionKey)
        .maybeSingle()
      if (error) throw error
      return data as { ppt_url: string | null; ppt_type: string | null; title: string | null } | null
    },
  })

  const url = data?.ppt_url?.trim()
  const type = data?.ppt_type ?? 'pdf'

  /* 주차가 바뀌면 1페이지로 */
  useEffect(() => { setPage(1); setPages(0); setErr('') }, [missionKey])

  /* 박스 너비에 맞춰 렌더링 크기 조정 */
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      if (w > 0) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [url, full])

  /* 전체화면 상태 추적 */
  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const go = useCallback((d: number) => {
    setPage(p => Math.min(Math.max(1, p + d), pages || 1))
  }, [pages])

  /* 키보드 좌우 · 스페이스 */
  useEffect(() => {
    if (!url) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(1) }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [url, go])

  const toggleFull = () => {
    const el = boxRef.current?.parentElement
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.()
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-line rounded-2xl py-20 text-center text-[13px] text-ink-muted">
        불러오는 중…
      </div>
    )
  }

  if (!url || !url.startsWith('http')) {
    return (
      <div className="bg-white border border-line rounded-2xl py-20 text-center">
        <div className="text-3xl mb-3">🖥️</div>
        <div className="text-[15px] font-bold text-ink mb-1.5">이 주차 수업 PPT가 아직 없어요</div>
        <div className="text-[12px] text-ink-secondary">{missionKey}</div>
      </div>
    )
  }

  /* pptx 등 화면에 못 띄우는 형식 */
  if (type === 'file') {
    return (
      <div className="bg-white border border-line rounded-2xl py-16 text-center">
        <div className="text-3xl mb-3">📎</div>
        <div className="text-[15px] font-bold text-ink mb-1.5">수업 PPT 파일</div>
        <div className="text-[12px] text-ink-secondary mb-5">{data?.title ?? title ?? missionKey}</div>
        <a href={url} target="_blank" rel="noreferrer"
          className="inline-block rounded-xl px-6 py-3 text-[13px] font-bold text-white"
          style={{ background: theme.accent }}>
          파일 내려받기 ›
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-4" style={full ? { background: '#111' } : undefined}>

      {/* 상단 바 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
          style={{ background: theme.accentBg, color: theme.accentDark }}>
          수업 PPT
        </span>
        <span className="text-[12.5px] font-bold truncate" style={{ color: full ? '#fff' : undefined }}>
          {data?.title ?? title ?? missionKey}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={toggleFull}
            className="text-[12px] font-bold px-3 py-1.5 rounded-lg border"
            style={{ borderColor: theme.accentBorder, color: theme.accentDark, background: '#fff' }}>
            {full ? '전체화면 끄기' : '전체화면'}
          </button>
          <a href={url} target="_blank" rel="noreferrer"
            className="text-[12px] font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: theme.accent }}>
            새 창 ›
          </a>
        </div>
      </div>

      {/* 슬라이드 */}
      <div
        ref={boxRef}
        className="relative w-full rounded-xl overflow-hidden flex items-center justify-center"
        style={{ background: '#111', minHeight: 280 }}
        onClick={e => {
          /* 오른쪽 절반 클릭 → 다음, 왼쪽 절반 → 이전 */
          const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          go(e.clientX - r.left > r.width / 2 ? 1 : -1)
        }}
      >
        {err ? (
          <div className="py-20 text-center text-[13px] text-white/70 px-6">
            PDF를 불러오지 못했어요<br />
            <span className="text-[11px] opacity-70">{err}</span>
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => { setPages(numPages); setErr('') }}
            onLoadError={e => setErr(e?.message ?? '알 수 없는 오류')}
            loading={<div className="py-20 text-[13px] text-white/60">슬라이드 준비 중…</div>}
          >
            <Page
              pageNumber={page}
              width={width}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              loading={<div className="py-20 text-[13px] text-white/60">…</div>}
            />
          </Document>
        )}
      </div>

      {/* 페이지 이동 */}
      <div className="flex items-center justify-center gap-3 mt-3">
        <button onClick={() => go(-1)} disabled={page <= 1}
          className="text-[13px] font-bold px-4 py-2 rounded-lg border disabled:opacity-35"
          style={{ borderColor: '#E5E7EB', background: '#fff' }}>
          ‹ 이전
        </button>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={page}
            min={1}
            max={pages || 1}
            onChange={e => {
              const n = Number(e.target.value)
              if (n >= 1 && n <= (pages || 1)) setPage(n)
            }}
            className="w-14 text-center text-[13px] font-bold border border-line rounded-lg py-1.5 outline-none"
          />
          <span className="text-[12px] font-bold" style={{ color: full ? '#fff' : '#6B7280' }}>
            / {pages || '–'}
          </span>
        </div>

        <button onClick={() => go(1)} disabled={pages > 0 && page >= pages}
          className="text-[13px] font-bold px-4 py-2 rounded-lg text-white disabled:opacity-35"
          style={{ background: theme.accent }}>
          다음 ›
        </button>
      </div>

      {!full && (
        <div className="mt-2.5 text-center text-[11px] text-ink-muted">
          화면을 클릭하거나 키보드 ← → 로 넘길 수 있어요
        </div>
      )}
    </div>
  )
}