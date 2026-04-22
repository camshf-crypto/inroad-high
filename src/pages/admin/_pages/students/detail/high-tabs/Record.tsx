import { useState } from 'react'
import {
  useStudentSaenggibu,
  useStudentSubjects,
  useUpsertSaenggibu,
  useTogglePublish,
  usePublishAllGrade,
  gradeToNum,
  findItem,
  type SaenggibuCategory,
  type SaenggibuItem,
} from '../../../../_hooks/useHighSaenggibu'
import {
  useStudentResearches,
} from '../../../../_hooks/useHighResearch'
import {
  useStudentReadings,
} from '../../../../_hooks/useHighReading'

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
}

const CREATIVE: SaenggibuCategory[] = ['자율', '동아리', '진로']
const CREATIVE_LABELS: Record<string, string> = {
  '자율': '자율활동',
  '동아리': '동아리활동',
  '진로': '진로활동',
}
const GRADE_LIST = ['고1', '고2', '고3']

// 첫 번째 과목만 추출 (· 로 분리된 경우)
const firstSubject = (subj: string | null | undefined): string | null => {
  if (!subj) return null
  return subj.split('·').map(s => s.trim()).filter(Boolean)[0] || null
}

// MOCK AI 보완점 (기존 UI에 있던 것 - 나중에 실제 AI 붙이기)
const getMockSuggestion = (type: 'topic' | 'book', subject: string | null) => ({
  strengths: [
    '논리적 분석 능력과 데이터 기반 사고가 돋보임',
    type === 'topic' ? '다양한 관점에서 주제를 다각도로 탐구함' : '독서와 진로를 연결하는 사고력이 뛰어남',
  ],
  improvements: [
    '탐구 방법론과 구체적 근거를 더 추가하면 좋음',
    '본인의 결론과 한계점을 명시하면 완성도 향상',
  ],
  connection: `${subject || '관련'} 전공 연계 가능, 심화 탐구로 발전 추천`,
})

export default function RecordTab({ student, onEditTopic, onEditBook }: {
  student: any
  onEditTopic: (id: number) => void
  onEditBook: (id: number) => void
}) {
  const studentId: string = student.id

  const [selGrade, setSelGrade] = useState('고1')
  const [selItem, setSelItem] = useState<{ type: 'topic' | 'book', id: string } | null>(null)
  const [fullScreen, setFullScreen] = useState(false)
  const [editingCell, setEditingCell] = useState<{ category: SaenggibuCategory, subject: string | null } | null>(null)
  const [editText, setEditText] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)
  // 활동별 AI 생성 결과 (탐구/독서별 생성된 문구)
  const [activityRecords, setActivityRecords] = useState<Record<string, string>>({})

  const gradeNum = gradeToNum(selGrade)

  // DB 조회
  const { data: saenggibuItems = [], isLoading: loadingItems } = useStudentSaenggibu(studentId, gradeNum)
  const { data: autoSubjects = [], isLoading: loadingSubjects } = useStudentSubjects(studentId, gradeNum)
  const { data: researches = [] } = useStudentResearches(studentId)
  const { data: readings = [] } = useStudentReadings(studentId)

  // 뮤테이션
  const upsertItem = useUpsertSaenggibu()
  const togglePublish = useTogglePublish()
  const publishAll = usePublishAllGrade()

  // 학년별 필터링된 활동 리스트
  const gradeTopics = researches.filter((r: any) => String(r.grade) === selGrade || String(r.grade) === String(gradeNum))
  const gradeBooks = readings.filter((b: any) => String(b.grade) === selGrade || String(b.grade) === String(gradeNum))

  // 세특 과목 리스트 (자동 추출된 것)
  const setechSubjects = autoSubjects

  // 선택된 활동
  const selectedTopic = selItem?.type === 'topic' ? researches.find((r: any) => r.id === selItem.id) : null
  const selectedBook = selItem?.type === 'book' ? readings.find((b: any) => b.id === selItem.id) : null
  const selectedActivity = selectedTopic || selectedBook

  // 선택 활동의 key와 AI 생성 결과
  const activityKey = selItem ? `${selItem.type}-${selItem.id}` : null
  const activityRecord = activityKey ? activityRecords[activityKey] : null
  const activitySuggestion = selItem && (selectedActivity as any)?.subject
    ? getMockSuggestion(selItem.type, firstSubject((selectedActivity as any).subject))
    : null

  // 셀 편집 시작
  const startEditCell = (category: SaenggibuCategory, subject: string | null) => {
    const existing = findItem(saenggibuItems, category, subject)
    setEditingCell({ category, subject })
    setEditText(existing?.content || '')
  }

  // 셀 저장
  const saveCell = () => {
    if (!editingCell) return
    upsertItem.mutate({
      student_id: studentId,
      grade: gradeNum,
      category: editingCell.category,
      subject: editingCell.subject,
      content: editText,
    }, {
      onSuccess: () => {
        setEditingCell(null)
        setEditText('')
      },
    })
  }

  // AI 생성 - 활동 기반 (가운데 패널에서 사용)
  const generateForActivity = () => {
    if (!selItem || !selectedActivity) return
    const key = activityKey!
    setGenerating(key)

    setTimeout(() => {
      // TODO: 나중에 실제 AI 연결
      const act = selectedActivity as any
      const generated = selItem.type === 'topic'
        ? `${firstSubject(act.subject) || '해당'} 교과 탐구활동에서 "${act.topic}"을 주제로 심화 탐구를 진행함. ${act.content || ''} 탐구 과정에서 관련 자료를 체계적으로 수집·분석하고 논리적 결론을 도출하는 역량을 보임.`
        : `"${act.book_title}"(${act.author || ''})을 읽고 ${firstSubject(act.subject) || '해당'} 분야에 대한 심화 탐구를 진행함. ${act.reason || ''} 독서 활동을 통해 비판적 사고력과 융합적 시각을 키움.`

      setActivityRecords(prev => ({ ...prev, [key]: generated }))
      setGenerating(null)
    }, 1500)
  }

  // AI 생성 결과 삭제
  const deleteActivityRecord = () => {
    if (!activityKey) return
    setActivityRecords(prev => {
      const next = { ...prev }
      delete next[activityKey]
      return next
    })
  }

  // 생성된 문구를 생기부 시트에 반영
  const applyToRecord = () => {
    if (!activityRecord || !selectedActivity) return
    const subject = firstSubject((selectedActivity as any).subject)
    if (!subject) {
      alert('이 활동에 연계 과목이 없어서 세특에 반영할 수 없어요.')
      return
    }

    // 기존 내용에 추가
    const existing = findItem(saenggibuItems, '세특', subject)
    const merged = existing?.content
      ? `${existing.content}\n\n${activityRecord}`
      : activityRecord

    upsertItem.mutate({
      student_id: studentId,
      grade: gradeNum,
      category: '세특',
      subject,
      content: merged,
      ai_generated: true,
    })
  }

  // AI 생성 - 셀 직접 (cell hover 시 ✨ AI 버튼)
  const generateForCell = (category: SaenggibuCategory, subject: string | null) => {
    const key = `cell-${category}-${subject || ''}`
    setGenerating(key)

    setTimeout(() => {
      const mockContent = category === '세특' && subject
        ? `${subject} 교과 탐구활동에서 심화 탐구를 진행하며 관련 자료를 체계적으로 수집·분석하고 논리적 결론을 도출하는 역량을 보임. 학업에 대한 열정과 자기주도적 학습 태도가 돋보이며, 수업 시간에 적극적으로 참여하여 동료들과의 협력 학습에도 긍정적인 영향을 미침.`
        : `${CREATIVE_LABELS[category] || category} 활동에서 능동적인 참여 태도를 보이며, 동료들과 협력하여 다양한 활동을 주도적으로 이끌어냄. 활동 과정에서 문제 해결 능력과 리더십 역량을 발휘함.`

      upsertItem.mutate({
        student_id: studentId,
        grade: gradeNum,
        category,
        subject,
        content: mockContent,
        ai_generated: true,
      }, {
        onSuccess: () => setGenerating(null),
        onError: () => setGenerating(null),
      })
    }, 1500)
  }

  // 게시 토글
  const handleTogglePublish = (item: SaenggibuItem) => {
    togglePublish.mutate({
      id: item.id,
      publish: item.status !== 'published',
    })
  }

  // 학년 전체 게시
  const handlePublishAllGrade = () => {
    const hasPublished = saenggibuItems.some(i => i.status === 'published')
    const message = hasPublished
      ? `${selGrade} 생기부 전체를 비공개로 전환할까요?`
      : `${selGrade} 생기부 전체를 학생에게 게시할까요?`
    if (window.confirm(message)) {
      publishAll.mutate({
        studentId,
        grade: gradeNum,
        publish: !hasPublished,
      })
    }
  }

  // 생기부 시트 컴포넌트
  const GradeSheet = ({ grade, inModal = false }: { grade: string, inModal?: boolean }) => {
    const g = gradeToNum(grade)
    const items = g === gradeNum ? saenggibuItems : []

    return (
      <div className={inModal ? 'mb-8' : 'mb-4'}>
        {inModal && (
          <div className="text-[15px] font-extrabold text-ink mb-3 pb-2 border-b-2 border-ink tracking-tight">
            📅 {grade}
          </div>
        )}

        {/* 세특 */}
        <div className={inModal ? 'mb-5' : 'mb-3'}>
          <div className={`font-extrabold text-ink mb-1.5 tracking-tight ${inModal ? 'text-[13px]' : 'text-[11px]'}`}>
            5. 교과학습발달상황 · 세부능력 및 특기사항
          </div>
          <table className="w-full border-collapse border border-gray-700">
            <thead>
              <tr className="bg-gray-100">
                <th className={`border border-gray-700 font-bold text-ink w-24 text-center ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                  과목
                </th>
                <th className={`border border-gray-700 font-bold text-ink text-center ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                  세부능력 및 특기사항
                </th>
              </tr>
            </thead>
            <tbody>
              {setechSubjects.length === 0 ? (
                <tr>
                  <td colSpan={2} className="border border-gray-700 p-4 text-center text-[11px] text-ink-muted">
                    학생이 탐구주제나 독서에서 선택한 과목이 없어요.
                  </td>
                </tr>
              ) : (
                setechSubjects.map(subject => {
                  const item = findItem(items, '세특', subject)
                  const isEditing = !inModal && editingCell?.category === '세특' && editingCell?.subject === subject
                  const genKey = `cell-세특-${subject}`
                  const isGenerating = generating === genKey

                  return (
                    <tr key={subject}>
                      <td className={`border border-gray-700 font-semibold text-ink text-center bg-gray-50 align-top whitespace-nowrap ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                        <div className="flex flex-col items-center gap-1">
                          <span>{subject}</span>
                          {!inModal && item?.status === 'published' && (
                            <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              게시됨
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-700 p-0 align-top">
                        {isEditing ? (
                          <div className="p-1">
                            <textarea
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              autoFocus
                              className="w-full border-none outline-none text-[11px] font-medium leading-[1.7] resize-y min-h-[80px] px-2 py-1 transition-all"
                              style={{ boxShadow: `inset 0 0 0 2px ${THEME.accent}` }}
                            />
                            <div className="flex items-center gap-1 px-2 py-1">
                              <button
                                onClick={saveCell}
                                disabled={upsertItem.isPending}
                                className="px-2.5 py-0.5 text-white rounded text-[11px] font-bold transition-all disabled:opacity-60"
                                style={{ background: THEME.accent }}
                              >
                                {upsertItem.isPending ? '저장중...' : '💾 저장'}
                              </button>
                              <button
                                onClick={() => { setEditingCell(null); setEditText('') }}
                                className="px-2.5 py-0.5 bg-white text-ink-secondary border border-line rounded text-[11px] font-semibold hover:bg-gray-50 transition-colors"
                              >
                                취소
                              </button>
                              <div className="text-[10px] text-ink-muted ml-auto font-medium">
                                {editText.length}자
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="group relative">
                            <div
                              onClick={() => !inModal && startEditCell('세특', subject)}
                              className={`leading-[1.8] whitespace-pre-wrap transition-colors ${inModal ? 'px-3 py-2 text-[12px] min-h-[50px]' : 'px-2 py-1.5 text-[10px] min-h-[32px] cursor-text hover:bg-blue-50/30'}`}
                              style={{ color: item?.content ? '#1a1a1a' : '#D1D5DB' }}
                            >
                              {item?.content || (inModal ? '' : '클릭하여 입력')}
                            </div>
                            {!inModal && (
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                {!item?.content && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); generateForCell('세특', subject) }}
                                    disabled={isGenerating}
                                    className="px-2 py-0.5 text-white rounded text-[9px] font-bold transition-all disabled:opacity-60"
                                    style={{ background: THEME.accent }}
                                    title="AI로 생성 (MOCK)"
                                  >
                                    {isGenerating ? '⏳' : '✨ AI'}
                                  </button>
                                )}
                                {item && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleTogglePublish(item) }}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                                      item.status === 'published'
                                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    }`}
                                    title={item.status === 'published' ? '비공개로 전환' : '학생에게 게시'}
                                  >
                                    {item.status === 'published' ? '🔒 비공개' : '👁 게시'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 창체 */}
        <div>
          <div className={`font-extrabold text-ink mb-1.5 tracking-tight ${inModal ? 'text-[13px]' : 'text-[11px]'}`}>
            8. 창의적 체험활동상황
          </div>
          <table className="w-full border-collapse border border-gray-700">
            <thead>
              <tr className="bg-gray-100">
                <th className={`border border-gray-700 font-bold text-ink w-24 text-center ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                  영역
                </th>
                <th className={`border border-gray-700 font-bold text-ink text-center ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                  특기사항
                </th>
              </tr>
            </thead>
            <tbody>
              {CREATIVE.map(cat => {
                const item = findItem(items, cat, null)
                const isEditing = !inModal && editingCell?.category === cat && editingCell?.subject === null
                const genKey = `cell-${cat}-`
                const isGenerating = generating === genKey

                return (
                  <tr key={cat}>
                    <td className={`border border-gray-700 font-semibold text-ink text-center bg-gray-50 align-top whitespace-nowrap ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                      <div className="flex flex-col items-center gap-1">
                        <span>{CREATIVE_LABELS[cat]}</span>
                        {!inModal && item?.status === 'published' && (
                          <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            게시됨
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-700 p-0 align-top">
                      {isEditing ? (
                        <div className="p-1">
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            autoFocus
                            className="w-full border-none outline-none text-[11px] font-medium leading-[1.7] resize-y min-h-[80px] px-2 py-1"
                            style={{ boxShadow: `inset 0 0 0 2px ${THEME.accent}` }}
                          />
                          <div className="flex items-center gap-1 px-2 py-1">
                            <button
                              onClick={saveCell}
                              disabled={upsertItem.isPending}
                              className="px-2.5 py-0.5 text-white rounded text-[11px] font-bold transition-all disabled:opacity-60"
                              style={{ background: THEME.accent }}
                            >
                              {upsertItem.isPending ? '저장중...' : '💾 저장'}
                            </button>
                            <button
                              onClick={() => { setEditingCell(null); setEditText('') }}
                              className="px-2.5 py-0.5 bg-white text-ink-secondary border border-line rounded text-[11px] font-semibold hover:bg-gray-50 transition-colors"
                            >
                              취소
                            </button>
                            <div className="text-[10px] text-ink-muted ml-auto font-medium">
                              {editText.length}자
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="group relative">
                          <div
                            onClick={() => !inModal && startEditCell(cat, null)}
                            className={`leading-[1.8] whitespace-pre-wrap transition-colors ${inModal ? 'px-3 py-2 text-[12px] min-h-[50px]' : 'px-2 py-1.5 text-[10px] min-h-[32px] cursor-text hover:bg-blue-50/30'}`}
                            style={{ color: item?.content ? '#1a1a1a' : '#D1D5DB' }}
                          >
                            {item?.content || (inModal ? '' : '클릭하여 입력')}
                          </div>
                          {!inModal && (
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                              {!item?.content && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); generateForCell(cat, null) }}
                                  disabled={isGenerating}
                                  className="px-2 py-0.5 text-white rounded text-[9px] font-bold transition-all disabled:opacity-60"
                                  style={{ background: THEME.accent }}
                                >
                                  {isGenerating ? '⏳' : '✨ AI'}
                                </button>
                              )}
                              {item && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleTogglePublish(item) }}
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                                    item.status === 'published'
                                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {item.status === 'published' ? '🔒 비공개' : '👁 게시'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden gap-3">

      {/* ==================== 왼쪽: 활동 목록 ==================== */}
      <div className="w-[240px] flex-shrink-0 flex flex-col overflow-hidden">

        <div className="flex gap-1 mb-3 flex-shrink-0">
          {GRADE_LIST.map(g => {
            const isActive = selGrade === g
            return (
              <button
                key={g}
                onClick={() => { setSelGrade(g); setSelItem(null) }}
                className="flex-1 py-1.5 rounded-full text-[11px] font-bold text-center transition-all border"
                style={{
                  background: isActive ? THEME.accent : '#fff',
                  color: isActive ? '#fff' : '#6B7280',
                  borderColor: isActive ? THEME.accent : '#E5E7EB',
                  boxShadow: isActive ? `0 2px 6px ${THEME.accentShadow}` : 'none',
                }}
              >
                {g}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-3">

          {/* 탐구주제 */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: THEME.accentBg, color: THEME.accent, border: `1px solid ${THEME.accentBorder}60` }}
              >
                🔬 탐구
              </span>
              <span className="text-[10px] font-semibold text-ink-secondary">{gradeTopics.length}개</span>
            </div>
            {gradeTopics.length === 0 ? (
              <div className="text-[11px] font-medium text-ink-muted text-center py-2 bg-gray-50 rounded-lg">
                없음
              </div>
            ) : gradeTopics.map((topic: any) => {
              const isSelected = selItem?.type === 'topic' && selItem?.id === topic.id
              const hasGenerated = !!activityRecords[`topic-${topic.id}`]
              return (
                <button
                  key={topic.id}
                  onClick={() => setSelItem({ type: 'topic', id: topic.id })}
                  className="w-full rounded-lg px-3 py-2 mb-1.5 text-left transition-all"
                  style={{
                    border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                    background: isSelected ? THEME.accentBg : '#fff',
                    boxShadow: isSelected ? `0 2px 6px ${THEME.accentShadow}` : 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-semibold text-ink-secondary">
                      {firstSubject(topic.subject) || '미분류'}
                    </span>
                    {hasGenerated && (
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                        ✓ 생성됨
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] font-semibold text-ink leading-[1.4] line-clamp-2">{topic.topic}</div>
                </button>
              )
            })}
          </div>

          {/* 독서 */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                📚 독서
              </span>
              <span className="text-[10px] font-semibold text-ink-secondary">{gradeBooks.length}개</span>
            </div>
            {gradeBooks.length === 0 ? (
              <div className="text-[11px] font-medium text-ink-muted text-center py-2 bg-gray-50 rounded-lg">
                없음
              </div>
            ) : gradeBooks.map((book: any) => {
              const isSelected = selItem?.type === 'book' && selItem?.id === book.id
              const hasGenerated = !!activityRecords[`book-${book.id}`]
              return (
                <button
                  key={book.id}
                  onClick={() => setSelItem({ type: 'book', id: book.id })}
                  className="w-full rounded-lg px-3 py-2 mb-1.5 text-left transition-all"
                  style={{
                    border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                    background: isSelected ? THEME.accentBg : '#fff',
                    boxShadow: isSelected ? `0 2px 6px ${THEME.accentShadow}` : 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-semibold text-ink-secondary">
                      {firstSubject(book.subject) || '미분류'}
                    </span>
                    {hasGenerated && (
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                        ✓ 생성됨
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] font-semibold text-ink line-clamp-1">{book.book_title}</div>
                  <div className="text-[10px] font-medium text-ink-muted line-clamp-1">{book.author}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ==================== 가운데: AI 생기부 문구 + 보완점 ==================== */}
      <div className="w-[320px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        {!selItem ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-ink-muted p-5">
            <div className="text-3xl">✨</div>
            <div className="text-[13px] font-bold text-ink-secondary text-center leading-relaxed">
              활동을 선택하면<br />AI 생기부 문구를 생성해드려요
            </div>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="px-4 py-3 border-b border-line flex-shrink-0">
              <div className="text-[11px] font-semibold text-ink-secondary mb-1">
                {selItem.type === 'topic' ? '🔬 탐구주제' : '📚 독서'} · {selGrade}
              </div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight line-clamp-2 leading-snug">
                {selItem.type === 'topic' ? (selectedActivity as any)?.topic : (selectedActivity as any)?.book_title}
              </div>
              {(selectedActivity as any)?.subject && (
                <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                  과목: <span className="font-bold">{(selectedActivity as any).subject}</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">

              {/* AI 생기부 문구 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] font-extrabold text-ink">✨ AI 생기부 문구</div>
                  <div className="flex gap-1">
                    {activityRecord && (
                      <button
                        onClick={deleteActivityRecord}
                        className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-md text-[10px] font-bold hover:bg-red-100 transition-colors"
                      >
                        🗑️ 삭제
                      </button>
                    )}
                    <button
                      onClick={generateForActivity}
                      disabled={generating === activityKey}
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all disabled:cursor-not-allowed"
                      style={{
                        background: generating === activityKey ? '#E5E7EB' : THEME.accent,
                        color: generating === activityKey ? '#9CA3AF' : '#fff',
                        boxShadow: generating === activityKey ? 'none' : `0 2px 4px ${THEME.accentShadow}`,
                      }}
                    >
                      {generating === activityKey ? '⏳ 생성중...' : activityRecord ? '🔄 재생성' : '✨ 생성'}
                    </button>
                  </div>
                </div>

                {generating === activityKey ? (
                  <div className="text-center py-5 text-ink-muted">
                    <div className="text-2xl mb-1.5 animate-pulse">✨</div>
                    <div className="text-[12px] font-medium">AI 분석 중...</div>
                  </div>
                ) : !activityRecord ? (
                  <div className="bg-gray-50 border border-line rounded-lg p-3 text-[12px] font-medium text-ink-muted text-center">
                    생성 버튼을 눌러주세요
                  </div>
                ) : (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-[12px] font-medium text-ink leading-[1.8] mb-2 whitespace-pre-wrap">
                      {activityRecord}
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: activityRecord.length > 500 ? '#EF4444' : '#059669' }}
                      >
                        {activityRecord.length}자 {activityRecord.length > 500 && '⚠️ 초과'}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigator.clipboard.writeText(activityRecord)}
                          className="px-2 py-1 bg-white text-ink-secondary border border-line rounded text-[10px] font-bold hover:bg-gray-50 transition-colors"
                        >
                          📋 복사
                        </button>
                        <button
                          onClick={applyToRecord}
                          disabled={upsertItem.isPending}
                          className="px-2 py-1 text-white rounded text-[10px] font-bold transition-all disabled:opacity-60"
                          style={{ background: THEME.accent, boxShadow: `0 2px 4px ${THEME.accentShadow}` }}
                        >
                          {upsertItem.isPending ? '반영중...' : '📥 생기부 반영'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 피드백 작성 요청 버튼 */}
              <div className="border-t border-line pt-2.5">
                <button
                  onClick={() => selItem.type === 'topic' ? onEditTopic(0) : onEditBook(0)}
                  className="w-full px-3 py-2.5 bg-gray-50 text-ink border border-line rounded-lg text-[12px] font-semibold text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <span>💬 {selItem.type === 'topic' ? '탐구주제' : '독서리스트'} 탭에서 피드백 작성하기</span>
                  <span className="text-ink-muted">→</span>
                </button>
              </div>

              {/* AI 보완점 */}
              {activitySuggestion && activityRecord && (
                <div className="border-t border-line pt-2.5">
                  <div className="text-[12px] font-extrabold text-ink mb-2">🔍 AI 보완점 분석</div>

                  {/* 강점 */}
                  <div className="mb-2.5">
                    <div className="text-[10px] font-extrabold text-green-600 mb-1.5">💪 강점</div>
                    {activitySuggestion.strengths.map((s, i) => (
                      <div
                        key={i}
                        className="text-[11px] font-medium text-ink leading-[1.6] px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-md mb-1"
                      >
                        ✓ {s}
                      </div>
                    ))}
                  </div>

                  {/* 개선 필요 */}
                  <div className="mb-2.5">
                    <div className="text-[10px] font-extrabold text-red-500 mb-1.5">⚡ 개선 필요</div>
                    {activitySuggestion.improvements.map((s, i) => (
                      <div
                        key={i}
                        className="text-[11px] font-medium text-ink leading-[1.6] px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-md mb-1"
                      >
                        △ {s}
                      </div>
                    ))}
                  </div>

                  {/* 전공 연계 */}
                  <div>
                    <div className="text-[10px] font-extrabold mb-1.5" style={{ color: THEME.accent }}>
                      🎓 전공 연계
                    </div>
                    <div
                      className="text-[11px] font-medium text-ink leading-[1.6] px-2.5 py-1.5 rounded-md"
                      style={{
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}60`,
                      }}
                    >
                      🎓 {activitySuggestion.connection}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ==================== 오른쪽: 실제 생기부 ==================== */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="px-4 py-3 border-b border-line flex-shrink-0 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="text-[14px] font-extrabold text-ink tracking-tight">📋 생기부</div>
            <div className="flex gap-1">
              {GRADE_LIST.map(g => {
                const isActive = selGrade === g
                return (
                  <button
                    key={g}
                    onClick={() => setSelGrade(g)}
                    className="px-3 py-1 rounded-full text-[11px] font-bold transition-all border"
                    style={{
                      background: isActive ? '#1a1a1a' : '#fff',
                      color: isActive ? '#fff' : '#6B7280',
                      borderColor: isActive ? '#1a1a1a' : '#E5E7EB',
                    }}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={handlePublishAllGrade}
              disabled={publishAll.isPending || saenggibuItems.length === 0}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px disabled:opacity-60"
              style={{
                background: saenggibuItems.some(i => i.status === 'published') ? '#fff' : '#059669',
                color: saenggibuItems.some(i => i.status === 'published') ? '#6B7280' : '#fff',
                border: saenggibuItems.some(i => i.status === 'published') ? '1px solid #E5E7EB' : 'none',
                boxShadow: saenggibuItems.some(i => i.status === 'published') ? 'none' : '0 2px 6px rgba(5, 150, 105, 0.25)',
              }}
              title={saenggibuItems.some(i => i.status === 'published') ? '전체 비공개' : '학생에게 전체 게시'}
            >
              {publishAll.isPending ? '처리중...' : saenggibuItems.some(i => i.status === 'published') ? '🔒 전체 비공개' : '👁 전체 게시'}
            </button>
            <button
              onClick={() => setFullScreen(true)}
              className="px-3 py-1.5 bg-white border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
              style={{ color: THEME.accent, borderColor: THEME.accent }}
            >
              ⛶ 전체화면
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loadingItems || loadingSubjects ? (
            <div className="text-center py-10">
              <div
                className="inline-block w-5 h-5 border-2 border-gray-200 rounded-full animate-spin"
                style={{ borderTopColor: THEME.accent }}
              />
              <div className="text-[12px] text-ink-muted mt-2">불러오는 중...</div>
            </div>
          ) : (
            <GradeSheet grade={selGrade} />
          )}
        </div>
      </div>

      {/* 전체화면 모달 */}
      {fullScreen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="bg-white rounded-2xl flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            style={{ width: '90vw', maxWidth: 980, maxHeight: '92vh' }}
          >
            <div className="px-6 py-4 border-b border-line flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[17px] font-extrabold text-ink tracking-tight">📋 학교생활기록부</div>
                <div className="text-[12px] font-medium text-ink-secondary mt-0.5">
                  {student?.name} · {selGrade}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                  style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                >
                  🖨️ PDF 저장 / 인쇄
                </button>
                <button
                  onClick={() => setFullScreen(false)}
                  className="px-4 py-2 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-7">
              <div className="text-center text-[22px] font-extrabold text-ink mb-3 tracking-tight">
                🎓 학교생활기록부
              </div>
              <div className="text-[13px] font-semibold text-ink-secondary mb-6 text-center pb-4 border-b border-line">
                {student?.name} · {student?.grade}
              </div>
              <GradeSheet grade={selGrade} inModal={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}