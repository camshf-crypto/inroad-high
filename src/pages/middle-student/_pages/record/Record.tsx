import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState } from '@/lib/auth/atoms'
import {
  useMyMiddleSaenggibu,
  useMyMiddleLock,
  useMySuhaengSubmissions,
  gradeToNum,
  findItem,
  getSubjectsInSemester,
  isLocked,
  daysUntilDeadline,
  firstSubject,
  GRADE_LIST,
  SEMESTER_LIST,
  type MySuhaengSubmission,
} from '../../_hooks/useMyMiddleSaenggibu'

// ─────────────────────────────────────────────
// 마감 배너 색상 결정
// ─────────────────────────────────────────────
function getDeadlineBannerStyle(lock: any) {
  if (!lock) return null
  const locked = isLocked(lock)
  const days = daysUntilDeadline(lock.deadline_at)

  if (locked) {
    return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: '🔒',
      title: '학기 마감됨',
      titleColor: 'text-red-700',
    }
  }
  if (days === null) return null
  if (days <= 3) {
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: '⚠️',
      title: `마감까지 D-${days}`,
      titleColor: 'text-amber-700',
    }
  }
  return {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: '⏰',
    title: `마감까지 D-${days}`,
    titleColor: 'text-emerald-700',
  }
}

export default function Record() {
  const student = useAtomValue(studentState)
  const [selGrade, setSelGrade] = useState<string>(student?.grade || '중1')
  const [selSemester, setSelSemester] = useState<number>(1)
  const [selSubmissionId, setSelSubmissionId] = useState<string | null>(null)
  const [fullScreen, setFullScreen] = useState(false)

  const gradeNum = gradeToNum(selGrade)

  // DB 조회
  const { data: saenggibuItems = [], isLoading: loadingItems } = useMyMiddleSaenggibu(gradeNum, selSemester)
  const { data: lock } = useMyMiddleLock(gradeNum, selSemester)
  const { data: submissions = [] } = useMySuhaengSubmissions(selSemester)

  // 세특 과목 리스트
  const setechSubjects = getSubjectsInSemester(saenggibuItems)
  const hasAnyContent = saenggibuItems.length > 0
  const banner = getDeadlineBannerStyle(lock)

  // 과목별 수행평가 그룹
  const subsBySubject = submissions.reduce<Record<string, MySuhaengSubmission[]>>(
    (acc: Record<string, MySuhaengSubmission[]>, s: MySuhaengSubmission) => {
      const subj = firstSubject(s.question_subject) || '미분류'
      if (!acc[subj]) acc[subj] = []
      acc[subj].push(s)
      return acc
    }, {}
  )

  // 선택된 수행평가
  const selectedSubmission = selSubmissionId
    ? submissions.find((s: MySuhaengSubmission) => s.id === selSubmissionId)
    : null

  // 생기부 시트
  const SemesterSheet = ({ inModal = false }: { inModal?: boolean }) => {
    return (
      <div className={inModal ? 'mb-8' : 'mb-4'}>
        {inModal && (
          <div className="text-[16px] font-extrabold text-ink mb-3 pb-2 border-b-2 border-ink tracking-tight">
            {selGrade} · {selSemester}학기
          </div>
        )}

        <div className={inModal ? 'mb-5' : 'mb-3'}>
          <div className={`font-bold text-ink mb-1.5 ${inModal ? 'text-[13px]' : 'text-[11px]'}`}>
            교과학습발달상황 · 세부능력 및 특기사항
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
              {setechSubjects.length === 0 ? (
                <tr>
                  <td colSpan={2} className="border border-gray-700 p-4 text-center text-[11px] text-ink-muted">
                    아직 선생님이 작성한 세특 내용이 없어요.
                  </td>
                </tr>
              ) : (
                setechSubjects.map((subject: string) => {
                  const item = findItem(saenggibuItems, '세특', subject)
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
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden px-7 py-6 gap-4 font-sans text-ink">

      {/* 왼쪽: 수행평가 목록 */}
      <div className="w-[260px] flex-shrink-0 flex flex-col overflow-hidden">

        {/* 학년 토글 */}
        <div className="flex gap-1.5 mb-2 flex-shrink-0">
          {GRADE_LIST.map(g => (
            <button
              key={g}
              onClick={() => { setSelGrade(g); setSelSubmissionId(null) }}
              className={`flex-1 py-1.5 rounded-full text-[12px] border font-semibold text-center transition-all ${
                selGrade === g
                  ? 'bg-brand-middle text-white border-brand-middle shadow-[0_2px_8px_rgba(16,185,129,0.15)]'
                  : 'bg-white text-ink-secondary border-line hover:border-brand-middle-light hover:text-brand-middle-dark'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* 학기 토글 */}
        <div className="flex gap-1.5 mb-3.5 flex-shrink-0">
          {SEMESTER_LIST.map(s => (
            <button
              key={s}
              onClick={() => { setSelSemester(s); setSelSubmissionId(null) }}
              className={`flex-1 py-1.5 rounded-full text-[12px] border font-semibold text-center transition-all ${
                selSemester === s
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-ink-secondary border-line hover:border-ink-secondary'
              }`}
            >
              {s}학기
            </button>
          ))}
        </div>

        {/* 수행평가 목록 (과목별 그룹) */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3">
          {Object.keys(subsBySubject).length === 0 ? (
            <div className="text-[12px] text-ink-muted text-center py-6 bg-gray-50 rounded-lg">
              제출한 수행평가가 없어요
            </div>
          ) : (
            (Object.entries(subsBySubject) as Array<[string, MySuhaengSubmission[]]>).map(([subject, subs]) => (
              <div key={subject}>
                <div className="text-[11px] font-bold text-ink-secondary mb-2 flex items-center gap-1.5">
                  <span className="bg-brand-middle-pale text-brand-middle-dark px-2 py-0.5 rounded-full border border-brand-middle-light">
                    📚 {subject}
                  </span>
                  <span className="text-ink-muted">{subs.length}개</span>
                </div>

                {subs.map((sub: MySuhaengSubmission) => {
                  const isSelected = selSubmissionId === sub.id
                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelSubmissionId(sub.id)}
                      className={`border rounded-xl px-3 py-2.5 mb-1.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-brand-middle bg-brand-middle-pale shadow-[0_2px_8px_rgba(16,185,129,0.1)]'
                          : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-ink-secondary font-medium">
                          {sub.question_category || '수행평가'}
                        </span>
                        {sub.submitted_at && (
                          <span className="text-[9px] text-ink-muted font-medium">
                            {new Date(sub.submitted_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] font-semibold text-ink leading-snug line-clamp-2">{sub.question_title || '제목 없음'}</div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 가운데: 수행평가 상세 (선택 시) */}
      {selectedSubmission && (
        <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-3 border-b border-line flex-shrink-0">
            <div className="text-[11px] font-semibold text-ink-secondary mb-1">
              📝 {selectedSubmission.question_subject || '미분류'} · {selectedSubmission.question_category || '수행평가'}
            </div>
            <div className="text-[14px] font-extrabold text-ink tracking-tight line-clamp-2 leading-snug">
              {selectedSubmission.question_title || '제목 없음'}
            </div>
            {selectedSubmission.submitted_at && (
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                제출: {new Date(selectedSubmission.submitted_at).toLocaleDateString('ko-KR')}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {selectedSubmission.question_content && (
              <div>
                <div className="text-[11px] font-extrabold text-ink mb-1.5">📌 문제 / 주제</div>
                <div className="bg-gray-50 border border-line rounded-lg px-3 py-2 text-[11.5px] text-ink leading-[1.7] whitespace-pre-wrap">
                  {selectedSubmission.question_content}
                </div>
              </div>
            )}

            <div>
              <div className="text-[11px] font-extrabold text-ink mb-1.5">✍️ 내 답변</div>
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-lg px-3 py-2 text-[11.5px] text-ink leading-[1.7] whitespace-pre-wrap">
                {selectedSubmission.answer_text || '(답변 없음)'}
              </div>
            </div>

            {selectedSubmission.answer_sections && typeof selectedSubmission.answer_sections === 'object' && (
              <div>
                <div className="text-[11px] font-extrabold text-ink mb-1.5">📑 세부 섹션</div>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(selectedSubmission.answer_sections)
                    .filter(([_, v]) => v && typeof v === 'string' && (v as string).trim())
                    .map(([k, v]) => (
                      <div key={k} className="bg-white border border-line rounded-md p-2">
                        <div className="text-[10px] font-bold text-ink-secondary mb-0.5">{k}</div>
                        <div className="text-[11px] text-ink leading-[1.6] whitespace-pre-wrap">{v as string}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 오른쪽: 생기부 */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden min-w-0 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <div className="px-5 py-3 border-b border-line-light flex-shrink-0 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
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
            <div className="flex gap-1">
              {SEMESTER_LIST.map(s => (
                <button
                  key={s}
                  onClick={() => setSelSemester(s)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border font-semibold transition-all ${
                    selSemester === s
                      ? 'bg-brand-middle text-white border-brand-middle'
                      : 'bg-white text-ink-secondary border-line hover:border-brand-middle-light'
                  }`}
                >
                  {s}학기
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setFullScreen(true)}
            className="px-3 py-1.5 bg-white text-brand-middle-dark border border-brand-middle-light rounded-lg text-[11px] font-semibold hover:bg-brand-middle-pale transition-all"
          >
            ⛶ 전체화면
          </button>
        </div>

        {/* 마감 배너 */}
        {banner && (
          <div className={`${banner.bg} ${banner.border} border mx-5 mt-4 rounded-xl px-4 py-3 flex items-start gap-3 flex-shrink-0`}>
            <span className="text-xl flex-shrink-0">{banner.icon}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-bold ${banner.titleColor}`}>
                {banner.title}
              </div>
              {lock?.deadline_at && (
                <div className="text-[11px] text-ink-secondary mt-0.5 font-medium">
                  {new Date(lock.deadline_at).toLocaleString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}까지
                </div>
              )}
              {lock?.note && (
                <div className="text-[12px] text-ink mt-1.5 font-medium leading-relaxed">
                  {lock.note}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loadingItems ? (
            <div className="text-center py-10">
              <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-brand-middle rounded-full animate-spin" />
              <div className="text-[12px] text-ink-muted mt-2">불러오는 중...</div>
            </div>
          ) : !hasAnyContent ? (
            <div className="text-center py-20 text-ink-muted">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-[14px] font-bold text-ink-secondary mb-2">
                아직 선생님이 작성한 내용이 없어요
              </div>
              <div className="text-[12px] leading-relaxed">
                수행평가를 꾸준히 제출하면<br />
                선생님이 생기부를 작성해주실 거예요!
              </div>
            </div>
          ) : (
            <SemesterSheet />
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
                  {student?.name} · {selGrade} · {selSemester}학기
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-brand-middle text-white rounded-lg text-[12px] font-bold hover:bg-brand-middle-dark transition-all shadow-[0_2px_8px_rgba(16,185,129,0.2)]"
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
                {student?.name} · {selGrade} · {selSemester}학기
              </div>
              <SemesterSheet inModal={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}