import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import type { Grade } from '@/lib/types/questions'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

interface Props {
  currentGrade: Grade
  onClose: () => void
}

type DataType = 'past' | 'major' | 'passage'
type GradeScope = 'current' | 'all'
type FileFormat = 'xlsx' | 'csv'

export default function ExportModal({ currentGrade, onClose }: Props) {
  const [selectedTypes, setSelectedTypes] = useState<Record<DataType, boolean>>({
    past: true,
    major: true,
    passage: true,
  })
  const [gradeScope, setGradeScope] = useState<GradeScope>('current')
  const [fileFormat, setFileFormat] = useState<FileFormat>('xlsx')
  const [splitByGrade, setSplitByGrade] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const dataTypeOptions: { key: DataType; label: string; icon: string; table: string }[] = [
    { key: 'past', label: '기출문제', icon: '📝', table: 'past_questions' },
    { key: 'major', label: '전공질문', icon: '🎓', table: 'major_questions' },
    { key: 'passage', label: '제시문면접', icon: '📜', table: 'passage_interviews' },
  ]

  const toggleType = (type: DataType) => {
    setSelectedTypes(prev => ({ ...prev, [type]: !prev[type] }))
  }

  // 실제 다운로드
  const handleExport = async () => {
    const selected = (Object.keys(selectedTypes) as DataType[]).filter(t => selectedTypes[t])
    if (selected.length === 0) {
      alert('내보낼 항목을 1개 이상 선택해주세요')
      return
    }

    setIsExporting(true)
    try {
      const wb = XLSX.utils.book_new()
      const today = new Date().toISOString().slice(0, 10)
      const grades: Grade[] = gradeScope === 'all' ? ['high', 'middle'] : [currentGrade]

      for (const type of selected) {
        const opt = dataTypeOptions.find(o => o.key === type)!

        for (const g of grades) {
          // Supabase에서 직접 조회
          const { data, error } = await supabase
            .from(opt.table)
            .select('*')
            .eq('grade', g)
            .order('created_at', { ascending: false })

          if (error) throw error

          const sheetName = splitByGrade && grades.length > 1
            ? `${opt.label}_${g === 'high' ? '고등' : '중등'}`
            : opt.label

          const sheet = XLSX.utils.json_to_sheet(data || [])
          XLSX.utils.book_append_sheet(wb, sheet, sheetName.slice(0, 31)) // 시트명 31자 제한
        }
      }

      const fileName = `질문관리_${today}.${fileFormat}`

      if (fileFormat === 'csv') {
        // CSV는 첫 번째 시트만
        const firstSheet = wb.Sheets[wb.SheetNames[0]]
        const csv = XLSX.utils.sheet_to_csv(firstSheet)
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }) // BOM 추가 (한글 깨짐 방지)
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.click()
        URL.revokeObjectURL(url)
      } else {
        XLSX.writeFile(wb, fileName)
      }

      alert('✅ 다운로드 완료!')
      onClose()
    } catch (err) {
      alert(`❌ 다운로드 실패: ${(err as Error).message}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⬇️</span>
            <div className="text-[15px] font-extrabold text-ink tracking-tight">데이터 내보내기</div>
          </div>
          <button onClick={onClose} disabled={isExporting} className="text-ink-muted hover:text-ink transition-colors p-1 disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. 데이터 선택 */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: THEME.accent }}>1</span>
              <span className="text-[12px] font-extrabold text-ink uppercase tracking-wider">내보낼 데이터</span>
            </div>
            <div className="space-y-2">
              {dataTypeOptions.map(opt => {
                const checked = selectedTypes[opt.key]
                return (
                  <label key={opt.key} className="flex items-center gap-3 px-4 py-3 border rounded-2xl cursor-pointer transition-all hover:bg-gray-50" style={{
                    borderColor: checked ? THEME.accentBorder : '#E5E7EB',
                    background: checked ? THEME.accentBg : '#fff',
                  }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleType(opt.key)} className="w-4 h-4 rounded cursor-pointer accent-purple-600" />
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-[13px] font-bold text-ink flex-1">{opt.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* 2. 학년 범위 */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: THEME.accent }}>2</span>
              <span className="text-[12px] font-extrabold text-ink uppercase tracking-wider">학년 범위</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 px-4 py-3 border rounded-2xl cursor-pointer transition-all hover:bg-gray-50" style={{
                borderColor: gradeScope === 'current' ? THEME.accentBorder : '#E5E7EB',
                background: gradeScope === 'current' ? THEME.accentBg : '#fff',
              }}>
                <input type="radio" name="gradeScope" checked={gradeScope === 'current'} onChange={() => setGradeScope('current')} className="w-4 h-4 cursor-pointer accent-purple-600" />
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-ink">{currentGrade === 'high' ? '🎓 고등만' : '📚 중등만'}</div>
                  <div className="text-[10px] font-medium text-ink-secondary">현재 선택</div>
                </div>
              </label>
              <label className="flex items-center gap-2 px-4 py-3 border rounded-2xl cursor-pointer transition-all hover:bg-gray-50" style={{
                borderColor: gradeScope === 'all' ? THEME.accentBorder : '#E5E7EB',
                background: gradeScope === 'all' ? THEME.accentBg : '#fff',
              }}>
                <input type="radio" name="gradeScope" checked={gradeScope === 'all'} onChange={() => setGradeScope('all')} className="w-4 h-4 cursor-pointer accent-purple-600" />
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-ink">📦 전체</div>
                  <div className="text-[10px] font-medium text-ink-secondary">고등+중등</div>
                </div>
              </label>
            </div>

            {gradeScope === 'all' && (
              <label className="mt-2 flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border border-line rounded-2xl cursor-pointer transition-all hover:bg-gray-100">
                <input type="checkbox" checked={splitByGrade} onChange={e => setSplitByGrade(e.target.checked)} className="w-4 h-4 cursor-pointer accent-purple-600" />
                <span className="text-[12px] font-semibold text-ink-secondary flex-1">시트별로 학년 분리</span>
                <span className="text-[10px] font-medium text-ink-muted">(시트 분리)</span>
              </label>
            )}
          </div>

          {/* 3. 파일 형식 */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: THEME.accent }}>3</span>
              <span className="text-[12px] font-extrabold text-ink uppercase tracking-wider">파일 형식</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 px-4 py-3 border rounded-2xl cursor-pointer transition-all hover:bg-gray-50" style={{
                borderColor: fileFormat === 'xlsx' ? THEME.accentBorder : '#E5E7EB',
                background: fileFormat === 'xlsx' ? THEME.accentBg : '#fff',
              }}>
                <input type="radio" name="fileFormat" checked={fileFormat === 'xlsx'} onChange={() => setFileFormat('xlsx')} className="w-4 h-4 cursor-pointer accent-purple-600" />
                <span className="text-lg">📊</span>
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-ink">엑셀</div>
                  <div className="text-[10px] font-medium text-ink-secondary">.xlsx (다중 시트)</div>
                </div>
              </label>
              <label className="flex items-center gap-2 px-4 py-3 border rounded-2xl cursor-pointer transition-all hover:bg-gray-50" style={{
                borderColor: fileFormat === 'csv' ? THEME.accentBorder : '#E5E7EB',
                background: fileFormat === 'csv' ? THEME.accentBg : '#fff',
              }}>
                <input type="radio" name="fileFormat" checked={fileFormat === 'csv'} onChange={() => setFileFormat('csv')} className="w-4 h-4 cursor-pointer accent-purple-600" />
                <span className="text-lg">📄</span>
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-ink">CSV</div>
                  <div className="text-[10px] font-medium text-ink-secondary">.csv (1개만)</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-line bg-[#F8FAFC] flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={isExporting} className="px-4 py-2 bg-white border border-line text-ink-secondary text-[12px] font-bold rounded-full hover:bg-gray-50 transition-all disabled:opacity-50">
            취소
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !Object.values(selectedTypes).some(v => v)}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{
              background: THEME.gradient,
              boxShadow: isExporting ? 'none' : `0 4px 12px ${THEME.accentShadow}`,
            }}
          >
            {isExporting ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                내보내는 중...
              </>
            ) : (
              <><span>⬇️</span> 내보내기</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}