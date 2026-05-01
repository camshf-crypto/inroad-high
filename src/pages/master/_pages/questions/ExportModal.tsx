import { useState } from 'react'
import {
  PAST_QUESTIONS_MOCK,
  MAJOR_QUESTIONS_MOCK,
  PASSAGE_INTERVIEWS_MOCK,
  THEME,
} from './mock-data'
import type { Grade } from './mock-data'

interface Props {
  currentGrade: Grade
  onClose: () => void
}

type DataType = 'past' | 'major' | 'passage'
type GradeScope = 'current' | 'all'
type FileFormat = 'xlsx' | 'csv'

export default function ExportModal({ currentGrade, onClose }: Props) {
  // 어떤 데이터 내보낼지 (체크박스)
  const [selectedTypes, setSelectedTypes] = useState<Record<DataType, boolean>>({
    past: true,
    major: true,
    passage: true,
  })
  const [gradeScope, setGradeScope] = useState<GradeScope>('current')
  const [fileFormat, setFileFormat] = useState<FileFormat>('xlsx')
  const [splitByGrade, setSplitByGrade] = useState(false)

  // 학년 필터에 따른 카운트
  const getCount = (type: DataType): { high: number; middle: number; total: number } => {
    let mock: any[] = []
    if (type === 'past') mock = PAST_QUESTIONS_MOCK
    if (type === 'major') mock = MAJOR_QUESTIONS_MOCK
    if (type === 'passage') mock = PASSAGE_INTERVIEWS_MOCK

    const high = mock.filter(m => m.grade === 'high').length
    const middle = mock.filter(m => m.grade === 'middle').length
    return { high, middle, total: high + middle }
  }

  const counts = {
    past: getCount('past'),
    major: getCount('major'),
    passage: getCount('passage'),
  }

  // 선택된 항목 수 계산
  const totalSelected = (Object.keys(selectedTypes) as DataType[]).reduce((sum, type) => {
    if (!selectedTypes[type]) return sum
    if (gradeScope === 'current') {
      return sum + (currentGrade === 'high' ? counts[type].high : counts[type].middle)
    }
    return sum + counts[type].total
  }, 0)

  const dataTypeOptions: {
    key: DataType
    label: string
    icon: string
  }[] = [
    { key: 'past', label: '기출문제', icon: '📝' },
    { key: 'major', label: '전공질문', icon: '🎓' },
    { key: 'passage', label: '제시문면접', icon: '📜' },
  ]

  const handleExport = () => {
    const selectedList = (Object.keys(selectedTypes) as DataType[]).filter(
      t => selectedTypes[t],
    )
    if (selectedList.length === 0) {
      alert('내보낼 항목을 1개 이상 선택해주세요')
      return
    }

    const gradeLabel =
      gradeScope === 'current' ? (currentGrade === 'high' ? '고등' : '중등') : '전체'
    const formatLabel = fileFormat.toUpperCase()
    const splitLabel = splitByGrade && gradeScope === 'all' ? '\n학년별 분리: ON' : ''

    alert(
      `⬇️ 내보내기 시작!\n\n` +
        `데이터: ${selectedList.map(t => dataTypeOptions.find(o => o.key === t)?.label).join(', ')}\n` +
        `학년 범위: ${gradeLabel}\n` +
        `형식: ${formatLabel}\n` +
        `총 ${totalSelected}개 항목${splitLabel}`,
    )
    onClose()
  }

  const toggleType = (type: DataType) => {
    setSelectedTypes(prev => ({ ...prev, [type]: !prev[type] }))
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⬇️</span>
            <div className="text-[15px] font-extrabold text-ink tracking-tight">
              데이터 내보내기
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. 데이터 선택 */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
                style={{ background: THEME.accent }}
              >
                1
              </span>
              <span className="text-[12px] font-extrabold text-ink uppercase tracking-wider">
                내보낼 데이터
              </span>
            </div>
            <div className="space-y-2">
              {dataTypeOptions.map(opt => {
                const checked = selectedTypes[opt.key]
                const count =
                  gradeScope === 'current'
                    ? currentGrade === 'high'
                      ? counts[opt.key].high
                      : counts[opt.key].middle
                    : counts[opt.key].total

                return (
                  <label
                    key={opt.key}
                    className="flex items-center gap-3 px-4 py-3 border rounded-2xl cursor-pointer transition-all hover:bg-gray-50"
                    style={{
                      borderColor: checked ? THEME.accentBorder : '#E5E7EB',
                      background: checked ? THEME.accentBg : '#fff',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleType(opt.key)}
                      className="w-4 h-4 rounded cursor-pointer accent-purple-600"
                    />
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-[13px] font-bold text-ink flex-1">{opt.label}</span>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: checked ? '#fff' : '#F1F5F9',
                        color: checked ? THEME.accentDark : '#64748B',
                      }}
                    >
                      {count}개
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* 2. 학년 범위 */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
                style={{ background: THEME.accent }}
              >
                2
              </span>
              <span className="text-[12px] font-extrabold text-ink uppercase tracking-wider">
                학년 범위
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label
                className="flex items-center gap-2 px-4 py-3 border rounded-2xl cursor-pointer transition-all hover:bg-gray-50"
                style={{
                  borderColor: gradeScope === 'current' ? THEME.accentBorder : '#E5E7EB',
                  background: gradeScope === 'current' ? THEME.accentBg : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="gradeScope"
                  checked={gradeScope === 'current'}
                  onChange={() => setGradeScope('current')}
                  className="w-4 h-4 cursor-pointer accent-purple-600"
                />
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-ink">
                    {currentGrade === 'high' ? '🎓 고등만' : '📚 중등만'}
                  </div>
                  <div className="text-[10px] font-medium text-ink-secondary">현재 선택</div>
                </div>
              </label>

              <label
                className="flex items-center gap-2 px-4 py-3 border rounded-2xl cursor-pointer transition-all hover:bg-gray-50"
                style={{
                  borderColor: gradeScope === 'all' ? THEME.accentBorder : '#E5E7EB',
                  background: gradeScope === 'all' ? THEME.accentBg : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="gradeScope"
                  checked={gradeScope === 'all'}
                  onChange={() => setGradeScope('all')}
                  className="w-4 h-4 cursor-pointer accent-purple-600"
                />
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-ink">📦 전체</div>
                  <div className="text-[10px] font-medium text-ink-secondary">고등+중등</div>
                </div>
              </label>
            </div>

            {/* 학년별 파일 분리 (전체 선택 시만) */}
            {gradeScope === 'all' && (
              <label
                className="mt-2 flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border border-line rounded-2xl cursor-pointer transition-all hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  checked={splitByGrade}
                  onChange={e => setSplitByGrade(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-purple-600"
                />
                <span className="text-[12px] font-semibold text-ink-secondary flex-1">
                  학년별로 파일 분리하기
                </span>
                <span className="text-[10px] font-medium text-ink-muted">
                  (고등.xlsx, 중등.xlsx)
                </span>
              </label>
            )}
          </div>

          {/* 3. 파일 형식 */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
                style={{ background: THEME.accent }}
              >
                3
              </span>
              <span className="text-[12px] font-extrabold text-ink uppercase tracking-wider">
                파일 형식
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label
                className="flex items-center gap-2 px-4 py-3 border rounded-2xl cursor-pointer transition-all hover:bg-gray-50"
                style={{
                  borderColor: fileFormat === 'xlsx' ? THEME.accentBorder : '#E5E7EB',
                  background: fileFormat === 'xlsx' ? THEME.accentBg : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="fileFormat"
                  checked={fileFormat === 'xlsx'}
                  onChange={() => setFileFormat('xlsx')}
                  className="w-4 h-4 cursor-pointer accent-purple-600"
                />
                <span className="text-lg">📊</span>
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-ink">엑셀</div>
                  <div className="text-[10px] font-medium text-ink-secondary">.xlsx</div>
                </div>
              </label>

              <label
                className="flex items-center gap-2 px-4 py-3 border rounded-2xl cursor-pointer transition-all hover:bg-gray-50"
                style={{
                  borderColor: fileFormat === 'csv' ? THEME.accentBorder : '#E5E7EB',
                  background: fileFormat === 'csv' ? THEME.accentBg : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="fileFormat"
                  checked={fileFormat === 'csv'}
                  onChange={() => setFileFormat('csv')}
                  className="w-4 h-4 cursor-pointer accent-purple-600"
                />
                <span className="text-lg">📄</span>
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-ink">CSV</div>
                  <div className="text-[10px] font-medium text-ink-secondary">.csv</div>
                </div>
              </label>
            </div>
          </div>

          {/* 요약 */}
          <div
            className="px-4 py-3 border rounded-2xl"
            style={{ background: THEME.accentBg, borderColor: THEME.accentBorder + '60' }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-semibold text-ink-secondary">
                내보낼 항목 합계
              </div>
              <div
                className="text-[18px] font-extrabold"
                style={{ color: THEME.accentDark }}
              >
                {totalSelected}
                <span className="text-[12px] font-bold ml-0.5">개</span>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-line bg-[#F8FAFC] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-line text-ink-secondary text-[12px] font-bold rounded-full hover:bg-gray-50 transition-all"
          >
            취소
          </button>
          <button
            onClick={handleExport}
            disabled={totalSelected === 0}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{
              background: THEME.gradient,
              boxShadow: totalSelected === 0 ? 'none' : `0 4px 12px ${THEME.accentShadow}`,
            }}
          >
            <span>⬇️</span>
            내보내기
          </button>
        </div>
      </div>
    </div>
  )
}