// src/pages/admin/_pages/lesson-run/LessonScreen.tsx
// 빔·TV 에 띄우는 학생용 화면. 슬라이드만 꽉 차게 보여준다.
// 원장 화면(LessonPpt)과 BroadcastChannel 로 페이지를 주고받는다.
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Document, Page, pdfjs } from 'react-pdf'
import { supabase } from '@/lib/supabase'

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

/** 원장 화면 ↔ 학생 화면 공용 채널 이름 */
export const LESSON_CHANNEL = 'bkurs-lesson-screen'

export type LessonMsg =
  | { kind: 'page'; missionKey: string; page: number }
  | { kind: 'pages'; missionKey: string; pages: number }
  | { kind: 'ping' }
  | { kind: 'hello'; missionKey: string }

export default function LessonScreen() {
  const { missionKey = '' } = useParams()
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [err, setErr] = useState('')
  const chan = useRef<BroadcastChannel | null>(null)

  /* PPT 주소 */
  const { data, isLoading } = useQuery({
    queryKey: ['lesson-screen-ppt', missionKey],
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

  /* 창 크기에 맞춰 슬라이드 크기 계산 (16:9 기준, 여백 없이) */
  useEffect(() => {
    const fit = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  /* 채널 연결 */
  useEffect(() => {
    const c = new BroadcastChannel(LESSON_CHANNEL)
    chan.current = c
    c.onmessage = (e: MessageEvent<LessonMsg>) => {
      const m = e.data
      if (m.kind === 'page' && m.missionKey === missionKey) setPage(m.page)
    }
    /* 열렸다고 알림 → 원장 화면이 현재 페이지를 다시 보내줌 */
    c.postMessage({ kind: 'hello', missionKey } as LessonMsg)
    return () => c.close()
  }, [missionKey])

  /* 학생 화면에서도 키보드로 넘길 수 있게 (원장 화면에도 전파) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      let next = page
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') next = Math.min(page + 1, pages || 1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') next = Math.max(page - 1, 1)
      else return
      e.preventDefault()
      setPage(next)
      chan.current?.postMessage({ kind: 'page', missionKey, page: next } as LessonMsg)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page, pages, missionKey])

  /* 페이지 수를 원장 화면에 알림 */
  useEffect(() => {
    if (pages > 0) chan.current?.postMessage({ kind: 'pages', missionKey, pages } as LessonMsg)
  }, [pages, missionKey])

  /* 16:9 로 맞춘 렌더 너비 */
  const renderWidth = Math.min(size.w, (size.h * 16) / 9)

  const shell = (children: React.ReactNode) => (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: '#000' }}
    >
      {children}
    </div>
  )

  if (isLoading) return shell(<div className="text-white/50 text-[15px]">불러오는 중…</div>)

  if (!url || !url.startsWith('http')) {
    return shell(
      <div className="text-center px-8">
        <div className="text-5xl mb-4">🖥️</div>
        <div className="text-white text-[20px] font-bold mb-2">수업 PPT가 아직 없어요</div>
        <div className="text-white/50 text-[14px]">{missionKey}</div>
      </div>,
    )
  }

  if (err) {
    return shell(
      <div className="text-center px-8">
        <div className="text-white text-[18px] font-bold mb-2">PDF를 불러오지 못했어요</div>
        <div className="text-white/50 text-[13px]">{err}</div>
      </div>,
    )
  }

  return shell(
    <>
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => { setPages(numPages); setErr('') }}
        onLoadError={e => setErr(e?.message ?? '알 수 없는 오류')}
        loading={<div className="text-white/50 text-[15px]">슬라이드 준비 중…</div>}
      >
        <Page
          pageNumber={page}
          width={renderWidth || undefined}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          loading={<div className="text-white/40 text-[14px]">…</div>}
        />
      </Document>

      {/* 페이지 표시 — 마우스를 올리면 보임 */}
      <div
        className="absolute bottom-4 right-5 text-white/25 text-[13px] font-bold transition-opacity hover:text-white/70"
      >
        {page} / {pages || '–'}
      </div>
    </>,
  )
}