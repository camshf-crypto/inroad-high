import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Worker 설정 (Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// ─────────────────────────────────────────────
// 썸네일 그리드 (생기부 확인 탭에 표시)
// ─────────────────────────────────────────────

interface PdfThumbnailGridProps {
  pdfUrl: string
  onClickPage: (page: number) => void
  onTotalPages?: (n: number) => void
}

export function PdfThumbnailGrid({ pdfUrl, onClickPage, onTotalPages }: PdfThumbnailGridProps) {
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({})

  useEffect(() => {
    let cancelled = false

    const loadPdf = async () => {
      setLoading(true)
      setThumbnails({})
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        if (cancelled) return

        const pageCount = pdf.numPages
        setTotalPages(pageCount)
        onTotalPages?.(pageCount)
        setLoading(false)

        // 썸네일 순차 생성 (한꺼번에 하면 느림)
        for (let i = 1; i <= pageCount; i++) {
          if (cancelled) return
          try {
            const page = await pdf.getPage(i)
            const viewport = page.getViewport({ scale: 0.3 })
            const canvas = document.createElement('canvas')
            canvas.width = viewport.width
            canvas.height = viewport.height
            const ctx = canvas.getContext('2d')
            if (!ctx) continue

            await page.render({ canvasContext: ctx, viewport, canvas }).promise
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7)

            if (!cancelled) {
              setThumbnails(prev => ({ ...prev, [i]: dataUrl }))
            }
          } catch (err) {
            console.error(`썸네일 ${i} 생성 실패:`, err)
          }
        }
      } catch (err) {
        console.error('PDF 로드 실패:', err)
        setLoading(false)
      }
    }

    loadPdf()
    return () => { cancelled = true }
  }, [pdfUrl])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 12 }}>
        PDF 로딩 중...
      </div>
    )
  }

  if (totalPages === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 12 }}>
        페이지를 불러오지 못했어요.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
        const thumb = thumbnails[p]
        return (
          <div
            key={p}
            onClick={() => onClickPage(p)}
            style={{
              background: '#F8F7F5',
              border: '1px solid #E5E7EB',
              borderRadius: 7,
              aspectRatio: '3/4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 4,
              fontSize: 11,
              color: '#9CA3AF',
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563EB'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB'
            }}
          >
            {thumb ? (
              <>
                <img
                  src={thumb}
                  alt={`${p}p`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 99,
                }}>
                  {p}p
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 18 }}>📄</div>
                <div style={{ fontWeight: 600 }}>{p}p</div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// 뷰어 모달 - 전체 페이지를 canvas로 렌더링 + 스크롤 감지
// ─────────────────────────────────────────────

interface PdfViewerModalProps {
  pdfUrl: string
  initialPage: number
  onClose: () => void
}

export function PdfViewerModal({ pdfUrl, initialPage, onClose }: PdfViewerModalProps) {
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [loading, setLoading] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const pdfDocRef = useRef<any>(null)
  const hasScrolledToInitial = useRef(false)
  const renderedPages = useRef<Set<number>>(new Set())

  // PDF 로드
  useEffect(() => {
    let cancelled = false

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        if (cancelled) return

        pdfDocRef.current = pdf
        setTotalPages(pdf.numPages)
        setLoading(false)
      } catch (err) {
        console.error('PDF 로드 실패:', err)
        setLoading(false)
      }
    }

    loadPdf()
    return () => { cancelled = true }
  }, [pdfUrl])

  // 페이지 canvas 렌더링
  const renderPage = async (pageNum: number, canvas: HTMLCanvasElement) => {
    if (!pdfDocRef.current || renderedPages.current.has(pageNum)) return
    renderedPages.current.add(pageNum)

    try {
      const page = await pdfDocRef.current.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.5 })
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      await page.render({ canvasContext: ctx, viewport, canvas }).promise
    } catch (err) {
      console.error(`페이지 ${pageNum} 렌더링 실패:`, err)
      renderedPages.current.delete(pageNum)
    }
  }

  // 초기 페이지로 스크롤
  useEffect(() => {
    if (!loading && !hasScrolledToInitial.current && totalPages > 0) {
      setTimeout(() => {
        const el = pageRefs.current.get(initialPage)
        if (el && scrollRef.current) {
          scrollRef.current.scrollTo({
            top: el.offsetTop - 10,
            behavior: 'instant' as ScrollBehavior,
          })
          hasScrolledToInitial.current = true
        }
      }, 100)
    }
  }, [loading, initialPage, totalPages])

  // 스크롤 감지 - 현재 보이는 페이지 판단
  const handleScroll = () => {
    if (!scrollRef.current || totalPages === 0) return

    const scrollTop = scrollRef.current.scrollTop
    const midY = scrollTop + scrollRef.current.clientHeight / 2

    let closestPage = 1
    let closestDist = Infinity

    pageRefs.current.forEach((el, pageNum) => {
      const elMidY = el.offsetTop + el.offsetHeight / 2
      const dist = Math.abs(elMidY - midY)
      if (dist < closestDist) {
        closestDist = dist
        closestPage = pageNum
      }
    })

    if (closestPage !== currentPage) {
      setCurrentPage(closestPage)
    }
  }

  // 이전/다음 페이지로 스크롤
  const scrollToPage = (page: number) => {
    const el = pageRefs.current.get(page)
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: el.offsetTop - 10,
        behavior: 'smooth',
      })
    }
  }

  // 페이지별 canvas ref callback
  const canvasRefCallback = (pageNum: number) => (canvas: HTMLCanvasElement | null) => {
    if (canvas && pdfDocRef.current) {
      renderPage(pageNum, canvas)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 720,
          height: '97vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 헤더 */}
        <div style={{
          padding: '12px 18px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>
            📄 {currentPage}페이지
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '5px 12px',
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                fontSize: 11,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                color: currentPage === 1 ? '#D1D5DB' : '#374151',
                fontWeight: 600,
              }}
            >
              ← 이전
            </button>
            <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => scrollToPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '5px 12px',
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                fontSize: 11,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                color: currentPage === totalPages ? '#D1D5DB' : '#374151',
                fontWeight: 600,
              }}
            >
              다음 →
            </button>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '5px 12px',
                background: '#2563EB',
                color: '#fff',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              🔍 새 탭
            </a>
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                background: '#F3F4F6',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                color: '#6B7280',
                fontSize: 13,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            background: '#525659',
            padding: 10,
          }}
        >
          {loading ? (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
            }}>
              PDF 로딩 중...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <div
                  key={pageNum}
                  ref={el => {
                    if (el) pageRefs.current.set(pageNum, el)
                    else pageRefs.current.delete(pageNum)
                  }}
                  style={{
                    background: '#fff',
                    borderRadius: 4,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <canvas
                    ref={canvasRefCallback(pageNum)}
                    style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}