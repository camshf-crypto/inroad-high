import { useState, useRef } from 'react'
import {
  useUploadPastQuestions,
  useUploadMajorQuestions,
  useUploadPassageInterviews,
} from '@/pages/master/_hooks/useUploadQuestions'
import type { Grade } from '@/lib/types/questions'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

type UploadType = 'past' | 'major' | 'passage'

interface Props {
  type: UploadType
  grade: Grade
  onClose: () => void
}

const getColumns = (type: UploadType, grade: Grade): string[] => {
  if (type === 'past') {
    return grade === 'high'
      ? ['대학', '학과', '전형', '질문', '유형(1~67)']
      : ['학교', '질문', '유형(1~67)']
  }
  if (type === 'major') {
    return ['학과코드', '학과명', '마스터코드', '학년', '총일수', '질문유형코드', '질문유형', 'day', 'seq', '질문', '선택지1~5', '정답·모범답안', '해설']
  }
  return grade === 'high'
    ? ['학교코드', '학교명', '학교순서', '계열코드', '계열명', '총일수', '세트코드', '연도', '회차', '회차순서', '계열세부코드', '질문코드', '질문순서', '원질문', '세부질문', '제시문개수', '문항참고이미지개수']
    : ['학교코드', '학교명', '학교순서', '총일수', '세트코드', '연도', '회차', '회차순서', '질문코드', '질문순서', '원질문', '세부질문', '제시문개수', '문항참고이미지개수']
}

const typeConfig = {
  past: { title: '기출문제 업로드', icon: '📝' },
  major: { title: '전공질문 업로드', icon: '🎓' },
  passage: { title: '제시문면접 업로드', icon: '📜' },
}

export default function ExcelUploadModal({ type, grade, onClose }: Props) {
  const config = typeConfig[type]
  const columns = getColumns(type, grade)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const excelInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const uploadPast = useUploadPastQuestions()
  const uploadMajor = useUploadMajorQuestions()
  const uploadPassage = useUploadPassageInterviews()

  const isUploading = uploadPast.isPending || uploadMajor.isPending || uploadPassage.isPending

  const gradeLabel = grade === 'high' ? '고등' : '중등'
  const gradeIcon = grade === 'high' ? '🎓' : '📚'

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        setExcelFile(file)
      } else if (file.type.startsWith('image/')) {
        setImageFiles(prev => [...prev, file])
      }
    })
  }

  const handleSubmit = async () => {
    if (!excelFile) {
      alert('엑셀 파일을 선택해주세요')
      return
    }
    if (type === 'passage' && imageFiles.length === 0) {
      if (!confirm('이미지 없이 메타데이터만 업로드하시겠습니까?')) return
    }

    try {
      if (type === 'past') {
        const result = await uploadPast.mutateAsync({ grade, excelFile })
        alert(`✅ 기출문제 ${result?.length || 0}개 업로드 완료!\n학생/어드민 페이지에서 즉시 확인 가능해요!`)
      } else if (type === 'major') {
        const result = await uploadMajor.mutateAsync({ grade, excelFile })
        alert(`✅ 전공질문 ${result?.length || 0}개 업로드 완료!`)
      } else if (type === 'passage') {
        const result = await uploadPassage.mutateAsync({ grade, excelFile, imageFiles })
        alert(`✅ 제시문면접 ${result.passages?.length || 0}개 + 이미지 ${result.imageCount}개 업로드 완료!`)
      }
      onClose()
    } catch (err) {
      alert(`❌ 업로드 실패\n${(err as Error).message}`)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{config.icon}</span>
            <div className="text-[15px] font-extrabold text-ink tracking-tight">{config.title}</div>
            <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: THEME.accentBg, color: THEME.accent }}>
              <span>{gradeIcon}</span> {gradeLabel}
            </span>
          </div>
          <button onClick={onClose} disabled={isUploading} className="text-ink-muted hover:text-ink transition-colors p-1 disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 p-4 bg-[#F8FAFC] border border-line rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-extrabold text-ink flex items-center gap-1.5">
                <span>📋</span> 엑셀 컬럼 형식
                <span className="text-[10px] font-bold text-ink-muted ml-1">({columns.length}개)</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {columns.map((col, idx) => (
                <span key={idx} className="text-[10px] font-bold font-mono px-2 py-0.5 bg-white border border-line text-ink-secondary rounded-full">
                  {col}
                </span>
              ))}
            </div>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className="border-2 border-dashed rounded-2xl p-8 text-center transition-all"
            style={{
              borderColor: isDragging ? THEME.accent : '#CBD5E1',
              background: isDragging ? THEME.accentBg : '#F8FAFC',
              opacity: isUploading ? 0.5 : 1,
              pointerEvents: isUploading ? 'none' : 'auto',
            }}
          >
            <div className="text-4xl mb-2">{type === 'passage' ? '📦' : '📊'}</div>
            <p className="text-[13px] font-extrabold text-ink mb-1">
              {type === 'passage' ? '엑셀 + 이미지 드래그 앤 드롭' : '엑셀 파일을 드래그하거나 클릭'}
            </p>
            <p className="text-[11px] font-medium text-ink-secondary mb-3">
              {type === 'passage' ? '.xlsx + PNG/JPG 다중 선택' : '.xlsx, .xls, .csv 지원'}
            </p>

            <div className="flex items-center justify-center gap-1.5">
              <button
                onClick={() => excelInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-line rounded-full text-[11px] font-bold text-ink-secondary hover:border-purple-300 hover:text-purple-600 transition-all disabled:opacity-50"
              >
                📊 엑셀 선택
              </button>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) setExcelFile(file)
                }}
              />

              {type === 'passage' && (
                <>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-line rounded-full text-[11px] font-bold text-ink-secondary hover:border-purple-300 hover:text-purple-600 transition-all disabled:opacity-50"
                  >
                    🖼️ 이미지
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => { if (e.target.files) setImageFiles(Array.from(e.target.files)) }}
                  />
                </>
              )}
            </div>
          </div>

          {(excelFile || imageFiles.length > 0) && (
            <div className="mt-4 space-y-2">
              <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">선택된 파일</div>
              {excelFile && (
                <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-2xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <span>📊</span>
                    <span className="text-[12px] font-bold text-ink truncate">{excelFile.name}</span>
                    <span className="text-[10px] font-semibold text-ink-muted shrink-0">({(excelFile.size / 1024).toFixed(1)}KB)</span>
                  </div>
                  <button onClick={() => setExcelFile(null)} disabled={isUploading} className="text-ink-muted hover:text-red-500 shrink-0 ml-2 disabled:opacity-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {imageFiles.length > 0 && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span>🖼️</span>
                      <span className="text-[12px] font-bold text-ink">이미지 {imageFiles.length}개</span>
                    </div>
                    <button onClick={() => setImageFiles([])} disabled={isUploading} className="text-[10px] font-bold text-ink-muted hover:text-red-500 disabled:opacity-50">
                      전체 삭제
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {imageFiles.slice(0, 5).map((f, idx) => (
                      <span key={idx} className="text-[10px] font-semibold px-1.5 py-0.5 bg-white text-ink-secondary rounded-full border border-blue-200">
                        {f.name}
                      </span>
                    ))}
                    {imageFiles.length > 5 && (
                      <span className="text-[10px] font-semibold text-ink-muted px-1.5 py-0.5">외 {imageFiles.length - 5}개</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <p className="text-[11px] font-medium text-emerald-900 leading-[1.6]">
              <strong className="font-bold">✨ 알림:</strong> 업로드 즉시{' '}
              <strong className="font-bold">학생·학원 어드민 페이지에 자동 반영</strong>됩니다!
              {type === 'past' && ' 유형 컬럼에는 인로드 답변 공식 1~67번 중 숫자만 입력하세요.'}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-line bg-[#F8FAFC] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 bg-white border border-line text-ink-secondary text-[12px] font-bold rounded-full hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!excelFile || isUploading}
            className="px-4 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{
              background: THEME.gradient,
              boxShadow: !excelFile || isUploading ? 'none' : `0 4px 12px ${THEME.accentShadow}`,
            }}
          >
            {isUploading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                업로드 중...
              </span>
            ) : (
              <>{gradeLabel} 업로드 시작</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}