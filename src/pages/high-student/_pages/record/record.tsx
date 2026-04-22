import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState } from '../../_store/auth'
import {
  useMySaenggibu,
  gradeToNum,
  findItem,
  getSubjectsInGrade,
} from '../../_hooks/useMyHighSaenggibu'
import {
  useMyResearches,
} from '../../_hooks/useMyHighResearch'
import {
  useMyReadings,
} from '../../_hooks/useMyHighReading'

const CREATIVE: Array<'자율' | '동아리' | '진로'> = ['자율', '동아리', '진로']
const CREATIVE_LABELS: Record<string, string> = {
  '자율': '자율활동',
  '동아리': '동아리활동',
  '진로': '진로활동',
}
const GRADE_LIST = ['고1', '고2', '고3']

export default function Record() {
  const student = useAtomValue(studentState)
  const [selGrade, setSelGrade] = useState<string>(student?.grade || '고1')
  const [selItem, setSelItem] = useState<{ type: 'topic' | 'book', id: string } | null>(null)
  const [fullScreen, setFullScreen] = useState(false)

  const gradeNum = gradeToNum(selGrade)

  // DB 조회
  const { data: saenggibuItems = [], isLoading: loadingItems } = useMySaenggibu(gradeNum)
  const { data: researches = [] } = useMyResearches()
  const { data: readings = [] } = useMyReadings()

  // 학년별 필터
  const gradeTopics = researches.filter((r: any) => String(r.grade) === selGrade || String(r.grade) === String(gradeNum))
  const gradeBooks = readings.filter((b: any) => String(b.grade) === selGrade || String(b.grade) === String(gradeNum))

  // 세특 과목 리스트 (생기부에 있는 것만)
  const setechSubjects = getSubjectsInGrade(saenggibuItems)

  // 현재 선택된 학년의 생기부 있는지
  const hasAnyContent = saenggibuItems.length > 0

  // 생기부 시트
  const GradeSheet = ({ grade, inModal = false }: { grade: string, inModal?: boolean }) => {
    // inModal에서 다른 학년 표시 시에도 같은 데이터 활용 (단순화 위해)
    const isCurrentGrade = gradeToNum(grade) === gradeNum
    const items = isCurrentGrade ? saenggibuItems : []
    const subjects = isCurrentGrade ? setechSubjects : []

    return (
      <div className={inModal ? 'mb-8' : 'mb-4'}>
        {inModal && (
          <div className="text-[16px] font-extrabold text-ink mb-3 pb-2 border-b-2 border-ink tracking-tight">
            {grade}
          </div>
        )}

        {/* 세특 */}
        <div className={inModal ? 'mb-5' : 'mb-3'}>
          <div className={`font-bold text-ink mb-1.5 ${inModal ? 'text-[13px]' : 'text-[11px]'}`}>
            5. 교과학습발달상황 · 세부능력 및 특기사항
          </div>
          <table className="w-full border-collapse border border-gray-700">
            <thead>
              <tr className="bg-gray-100">
                <th className={`border border-gray-700 font-bold text-gray-700 text-center w-24 ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                  과목
                </th>
                <th className={`border border-gray-700 font-bold text-gray-700 text-center ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                  세부능력 및 특기사항
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={2} className="border border-gray-700 p-4 text-center text-[11px] text-ink-muted">
                    아직 선생님이 작성한 세특 내용이 없어요.
                  </td>
                </tr>
              ) : (
                subjects.map(subject => {
                  const item = findItem(items, '세특', subject)
                  return (
                    <tr key={subject}>
                      <td className={`border border-gray-700 font-semibold text-gray-700 text-center bg-gray-50 align-top whitespace-nowrap ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                        {subject}
                      </td>
                      <td className={`border border-gray-700 align-top ${inModal ? 'px-3 py-2' : 'px-2 py-1.5'}`}>
                        <div className={`leading-relaxed whitespace-pre-wrap ${
                          item?.content ? 'text-ink' : 'text-gray-300'
                        } ${inModal ? 'text-[12px] min-h-[50px]' : 'text-[10px] min-h-[32px]'}`}>
                          {item?.content || '선생님이 작성 중이에요'}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 창체 (자율/동아리/진로) */}
        <div>
          <div className={`font-bold text-ink mb-1.5 ${inModal ? 'text-[13px]' : 'text-[11px]'}`}>
            8. 창의적 체험활동상황
          </div>
          <table className="w-full border-collapse border border-gray-700">
            <thead>
              <tr className="bg-gray-100">
                <th className={`border border-gray-700 font-bold text-gray-700 text-center w-24 ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                  영역
                </th>
                <th className={`border border-gray-700 font-bold text-gray-700 text-center ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                  특기사항
                </th>
              </tr>
            </thead>
            <tbody>
              {CREATIVE.map(cat => {
                const item = findItem(items, cat, null)
                return (
                  <tr key={cat}>
                    <td className={`border border-gray-700 font-semibold text-gray-700 text-center bg-gray-50 align-top whitespace-nowrap ${inModal ? 'px-3 py-2 text-[12px]' : 'px-2 py-1.5 text-[10px]'}`}>
                      {CREATIVE_LABELS[cat]}
                    </td>
                    <td className={`border border-gray-700 align-top ${inModal ? 'px-3 py-2' : 'px-2 py-1.5'}`}>
                      <div className={`leading-relaxed whitespace-pre-wrap ${
                        item?.content ? 'text-ink' : 'text-gray-300'
                      } ${inModal ? 'text-[12px] min-h-[50px]' : 'text-[10px] min-h-[32px]'}`}>
                        {item?.content || '선생님이 작성 중이에요'}
                      </div>
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
    <div className="flex h-full overflow-hidden px-7 py-6 gap-4 font-sans text-ink">

      {/* 왼쪽: 활동 목록 */}
      <div className="w-[260px] flex-shrink-0 flex flex-col overflow-hidden">

        <div className="flex gap-1.5 mb-3.5 flex-shrink-0">
          {GRADE_LIST.map(g => (
            <button
              key={g}
              onClick={() => { setSelGrade(g); setSelItem(null) }}
              className={`flex-1 py-1.5 rounded-full text-[12px] border font-semibold text-center transition-all ${
                selGrade === g
                  ? 'bg-brand-high text-white border-brand-high shadow-[0_2px_8px_rgba(37,99,235,0.15)]'
                  : 'bg-white text-ink-secondary border-line hover:border-brand-high-light hover:text-brand-high-dark'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-3">

          <div>
            <div className="text-[11px] font-bold text-ink-secondary mb-2 flex items-center gap-1.5">
              <span className="bg-brand-high-pale text-brand-high-dark px-2 py-0.5 rounded-full border border-brand-high-light">
                🔬 탐구주제
              </span>
              <span className="text-ink-muted">{gradeTopics.length}개</span>
            </div>

            {gradeTopics.length === 0 ? (
              <div className="text-[12px] text-ink-muted text-center py-3">없음</div>
            ) : gradeTopics.map((topic: any) => {
              const isSelected = selItem?.type === 'topic' && selItem?.id === topic.id
              return (
                <div
                  key={topic.id}
                  onClick={() => setSelItem({ type: 'topic', id: topic.id })}
                  className={`border rounded-xl px-3 py-2.5 mb-1.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-brand-high bg-brand-high-pale shadow-[0_2px_8px_rgba(37,99,235,0.1)]'
                      : 'border-line bg-white hover:border-brand-high-light hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-ink-secondary font-medium">
                      {topic.subject || '미분류'}
                    </span>
                    {topic.status === 'completed' && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        완료
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] font-semibold text-ink leading-snug line-clamp-2">{topic.topic}</div>
                </div>
              )
            })}
          </div>

          <div>
            <div className="text-[11px] font-bold text-ink-secondary mb-2 flex items-center gap-1.5">
              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                📚 독서
              </span>
              <span className="text-ink-muted">{gradeBooks.length}개</span>
            </div>

            {gradeBooks.length === 0 ? (
              <div className="text-[12px] text-ink-muted text-center py-3">없음</div>
            ) : gradeBooks.map((book: any) => {
              const isSelected = selItem?.type === 'book' && selItem?.id === book.id
              return (
                <div
                  key={book.id}
                  onClick={() => setSelItem({ type: 'book', id: book.id })}
                  className={`border rounded-xl px-3 py-2.5 mb-1.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-brand-high bg-brand-high-pale shadow-[0_2px_8px_rgba(37,99,235,0.1)]'
                      : 'border-line bg-white hover:border-brand-high-light hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-ink-secondary font-medium">
                      {book.subject || '미분류'}
                    </span>
                    {book.status === 'completed' && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        완료
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] font-semibold text-ink line-clamp-1">{book.book_title}</div>
                  <div className="text-[11px] text-ink-muted font-medium line-clamp-1">{book.author}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 오른쪽: 생기부 */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <div className="px-5 py-3 border-b border-line-light flex-shrink-0 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="text-[14px] font-bold text-ink tracking-tight">📋 나의 생기부</div>
            <div className="flex gap-1">
              {GRADE_LIST.map(g => (
                <button
                  key={g}
                  onClick={() => setSelGrade(g)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border font-semibold transition-all ${
                    selGrade === g
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-ink-secondary border-line hover:border-ink-secondary'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setFullScreen(true)}
            className="px-3 py-1.5 bg-white text-brand-high-dark border border-brand-high-light rounded-lg text-[11px] font-semibold hover:bg-brand-high-pale transition-all"
          >
            ⛶ 전체화면
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loadingItems ? (
            <div className="text-center py-10">
              <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-brand-high rounded-full animate-spin" />
              <div className="text-[12px] text-ink-muted mt-2">불러오는 중...</div>
            </div>
          ) : !hasAnyContent ? (
            <div className="text-center py-20 text-ink-muted">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-[14px] font-bold text-ink-secondary mb-2">
                아직 선생님이 작성한 내용이 없어요
              </div>
              <div className="text-[12px] leading-relaxed">
                탐구주제와 독서 활동을 꾸준히 하면<br />
                선생님이 생기부를 작성해주실 거예요!
              </div>
            </div>
          ) : (
            <GradeSheet grade={selGrade} />
          )}
        </div>
      </div>

      {/* 전체화면 모달 */}
      {fullScreen && (
        <div
          onClick={() => setFullScreen(false)}
          className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-[90vw] max-w-[960px] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-line-light flex-shrink-0 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-[17px] font-extrabold text-ink tracking-tight">📋 나의 학교생활기록부</div>
                <div className="text-[12px] text-ink-secondary mt-0.5 font-medium">
                  {student?.name} · {selGrade}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-brand-high text-white rounded-lg text-[12px] font-bold hover:bg-brand-high-dark transition-all shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                >
                  🖨️ PDF 저장 / 인쇄
                </button>
                <button
                  onClick={() => setFullScreen(false)}
                  className="px-4 py-2 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-all"
                >
                  닫기
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-7">
              <div className="text-center text-[22px] font-extrabold mb-7 text-ink tracking-tight">
                학교생활기록부
              </div>
              <div className="text-[13px] text-ink-secondary mb-6 text-center font-semibold">
                {student?.name}
              </div>
              <GradeSheet grade={selGrade} inModal={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}