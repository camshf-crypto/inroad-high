import { useState, useEffect } from 'react'
import {
  useMyTargetUniversities,
  useMyTargetUniversitiesAll,
  useUpdateMyTargets,
  useAllUniversities,
  useDepartmentsOfUniversity,
  useMyPastQuestions,
  useMyAnswerAnalyses,
  useMyAnswerFollowups,
  useSubmitFirstAnswer,
  useSubmitUpgradedAnswer,
  useSubmitFollowupAnswer,
  getMyStep,
  inferQuestionType,
  type QuestionWithAnswer,
} from '../../_hooks/useMyHighQuestions'

const TYPE_COLOR: Record<string, string> = {
  '공통': 'bg-brand-high-pale text-brand-high-dark border-brand-high-light',
  '전공': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '인성': 'bg-amber-50 text-amber-700 border-amber-200',
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

const MicBtn = ({ recording, onClick }: { recording: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-9 h-9 rounded-lg text-[15px] flex items-center justify-center flex-shrink-0 border transition-all ${
      recording
        ? 'bg-red-50 text-red-500 border-red-200 animate-pulse'
        : 'bg-brand-high-pale text-brand-high-dark border-brand-high-light hover:bg-brand-high hover:text-white'
    }`}
  >
    {recording ? '⏹' : '🎙️'}
  </button>
)

const SubmitBtn = ({ label, onClick, disabled }: { label: string, onClick: () => void, disabled: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-[108px] h-9 rounded-lg text-[12px] font-bold flex-shrink-0 transition-all ${
      !disabled
        ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
        : 'bg-gray-200 text-ink-muted cursor-not-allowed'
    }`}
  >
    {label}
  </button>
)

export default function Past() {
  const [selUnivName, setSelUnivName] = useState('')
  const [selDeptName, setSelDeptName] = useState('')
  const [univSearch, setUnivSearch] = useState('')
  const [deptSearch, setDeptSearch] = useState('')
  const [univDropOpen, setUnivDropOpen] = useState(false)
  const [deptDropOpen, setDeptDropOpen] = useState(false)

  const [selQ, setSelQ] = useState<QuestionWithAnswer | null>(null)
  const [myAnswer, setMyAnswer] = useState('')
  const [upgradedAnswer, setUpgradedAnswer] = useState('')
  const [followupAnswers, setFollowupAnswers] = useState<Record<string, string>>({})

  const [isRecording1, setIsRecording1] = useState(false)
  const [isRecording3, setIsRecording3] = useState(false)
  const [tailRecordings, setTailRecordings] = useState<Record<string, boolean>>({})
  const [editingStep1, setEditingStep1] = useState(false)
  const [editingStep3, setEditingStep3] = useState(false)

  // DB 조회
  const { data: myTargets = [] } = useMyTargetUniversities()
  const { data: allTargets = [] } = useMyTargetUniversitiesAll()  // hidden 포함 전체
  const { data: allUnivs = [] } = useAllUniversities()
  const { data: allDepts = [] } = useDepartmentsOfUniversity(selUnivName)
  const { data: curQuestions = [], isLoading: loadingQ } = useMyPastQuestions(selUnivName, selDeptName)

  const selAnswerId = selQ?.answer?.id
  const { data: analyses = [] } = useMyAnswerAnalyses(selAnswerId)
  const { data: followups = [] } = useMyAnswerFollowups(selAnswerId)

  // 뮤테이션
  const updateTargets = useUpdateMyTargets()
  const submitFirst = useSubmitFirstAnswer()
  const submitUpgrade = useSubmitUpgradedAnswer()
  const submitFollowup = useSubmitFollowupAnswer()

  // 첫 타깃 자동 선택
  useEffect(() => {
    if (myTargets.length > 0 && !selUnivName) {
      setSelUnivName(myTargets[0].university)
      setSelDeptName(myTargets[0].department)
    }
  }, [myTargets, selUnivName])

  // 학교+학과 선택 시 자동으로 target_universities에 추가 (hidden이면 복구)
  useEffect(() => {
    if (!selUnivName || !selDeptName) return
    const found = allTargets.find(
      t => t.university === selUnivName && t.department === selDeptName
    )
    if (!found) {
      // 새로 추가
      const newTargets = [...allTargets, { university: selUnivName, department: selDeptName }]
      updateTargets.mutate(newTargets)
    } else if (found.hidden) {
      // 숨김 처리된 걸 다시 선택하면 복구
      const newTargets = allTargets.map(t =>
        t.university === selUnivName && t.department === selDeptName
          ? { ...t, hidden: false }
          : t
      )
      updateTargets.mutate(newTargets)
    }
  }, [selUnivName, selDeptName, allTargets])

  // 질문 변경 시 선택 갱신
  useEffect(() => {
    if (selQ) {
      const updated = curQuestions.find(q => q.id === selQ.id)
      if (updated) setSelQ(updated)
    }
  }, [curQuestions])

  // 필터링된 대학/학과
  const filteredUnivs = allUnivs.filter(u => u.includes(univSearch))
  const filteredDepts = allDepts.filter(d => d.includes(deptSearch))

  const step = selQ ? getMyStep(selQ.answer, analyses) : 0
  const round1 = analyses.find(a => a.round === 1)
  const round2 = analyses.find(a => a.round === 2)

  const submitAnswer = () => {
    if (!myAnswer.trim() || !selQ) return
    submitFirst.mutate({
      questionId: selQ.id,
      answer: myAnswer.trim(),
    }, {
      onSuccess: () => {
        setMyAnswer('')
        setIsRecording1(false)
        setEditingStep1(false)
      },
      onError: (e: any) => alert('제출 실패: ' + e.message),
    })
  }

  const submitUpgradeFn = () => {
    if (!upgradedAnswer.trim() || !selQ?.answer) return
    submitUpgrade.mutate({
      answerId: selQ.answer.id,
      answer: upgradedAnswer.trim(),
    }, {
      onSuccess: () => {
        setUpgradedAnswer('')
        setIsRecording3(false)
        setEditingStep3(false)
      },
      onError: (e: any) => alert('제출 실패: ' + e.message),
    })
  }

  const submitFollowupFn = (followupId: string) => {
    const answer = (followupAnswers[followupId] || '').trim()
    if (!answer) return
    submitFollowup.mutate({ followupId, answer }, {
      onSuccess: () => {
        setFollowupAnswers(prev => ({ ...prev, [followupId]: '' }))
        setTailRecordings(prev => ({ ...prev, [followupId]: false }))
      },
    })
  }

  const resetAll = () => {
    setSelUnivName('')
    setSelDeptName('')
    setUnivSearch('')
    setDeptSearch('')
    setSelQ(null)
  }

  const printAnswers = () => {
    const answeredQs = curQuestions.filter(q => q.answer?.student_answer)
    if (answeredQs.length === 0) {
      alert('답변한 질문이 없어요!')
      return
    }
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>기출문제 최종 답변집</title>
<style>
  body { font-family: 'Malgun Gothic', sans-serif; padding: 16px 24px; color: #1a1a1a; max-width: 800px; margin: 0 auto; font-size: 11px; }
  h1 { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .sub { font-size: 11px; color: #6B7280; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1.5px solid #1a1a1a; }
  .block { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 0.5px solid #E5E7EB; }
  .badges { display: flex; gap: 4px; margin-bottom: 4px; }
  .badge { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 99px; }
  .q-text { font-size: 12px; font-weight: 600; margin-bottom: 5px; line-height: 1.4; }
  .label { font-size: 10px; font-weight: 600; color: #6B7280; margin-bottom: 3px; margin-top: 5px; }
  .answer-box { background: #F8F9FA; border-radius: 4px; padding: 5px 8px; font-size: 11px; line-height: 1.5; white-space: pre-wrap; }
  .final-box { background: #ECFDF5; border: 0.5px solid #6EE7B7; border-radius: 4px; padding: 5px 8px; font-size: 11px; line-height: 1.5; white-space: pre-wrap; }
  .footer { text-align: center; font-size: 10px; color: #9CA3AF; margin-top: 12px; padding-top: 8px; border-top: 0.5px solid #E5E7EB; }
  @media print { body { padding: 10px 16px; } }
</style></head><body>
<h1>기출문제 최종 답변집</h1>
<div class="sub">${selUnivName} · ${selDeptName}</div>
${answeredQs.map((q, i) => `
  <div class="block">
    <div class="badges"><span class="badge">Q${i + 1}</span></div>
    <div class="q-text">${q.question}</div>
    <div class="label">내 답변</div>
    <div class="answer-box">${q.answer?.student_answer || ''}</div>
  </div>
`).join('')}
<div class="footer">비커스 · ${selUnivName} ${selDeptName} 기출문제 답변집</div>
<script>window.onload = () => { window.print() }</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  const univInputValue = selUnivName && selDeptName ? '' : (selUnivName && !univDropOpen ? selUnivName : univSearch)
  const deptInputValue = selUnivName && selDeptName ? '' : (selDeptName && !deptDropOpen ? selDeptName : deptSearch)

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">

      {/* 상단: 학교/학과 선택 + 내 지원 탭 */}
      <div className="flex gap-2 flex-shrink-0 items-center flex-wrap">

        {/* 내 지원 학교 탭 (빠른 선택) */}
        {myTargets.length > 0 && !selUnivName && (
          <>
            <div className="text-[11px] text-ink-muted font-semibold">내 지원:</div>
            {myTargets.slice(0, 3).map((t, i) => (
              <button
                key={i}
                onClick={() => { setSelUnivName(t.university); setSelDeptName(t.department) }}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-brand-high-pale text-brand-high-dark border border-brand-high-light hover:bg-brand-high hover:text-white transition-all"
              >
                🎓 {t.university} · {t.department}
              </button>
            ))}
          </>
        )}

        {/* 학교 검색 */}
        <div className="relative w-[200px]">
          <div
            onClick={() => { if (!selUnivName || !selDeptName) setUnivDropOpen(true) }}
            className={`flex items-center gap-2 border rounded-lg px-3 py-2 bg-white h-9 transition-colors ${
              univDropOpen ? 'border-brand-high' : 'border-line'
            }`}
          >
            <span className="text-[14px] flex-shrink-0">🏫</span>
            <input
              value={univInputValue}
              onChange={e => { setUnivSearch(e.target.value); setSelUnivName(''); setSelDeptName(''); setSelQ(null); setUnivDropOpen(true) }}
              onFocus={() => { if (!selUnivName || !selDeptName) setUnivDropOpen(true) }}
              placeholder="학교 검색"
              className="flex-1 border-none outline-none text-[12px] font-sans bg-transparent text-ink min-w-0"
            />
            {selUnivName && !selDeptName ? (
              <button
                onClick={e => { e.stopPropagation(); setSelUnivName(''); setSelDeptName(''); setUnivSearch(''); setSelQ(null) }}
                className="text-[10px] text-ink-muted hover:text-ink flex-shrink-0"
              >
                ✕
              </button>
            ) : !selDeptName ? (
              <span
                onClick={e => { e.stopPropagation(); setUnivDropOpen(!univDropOpen) }}
                className="text-[10px] text-ink-muted cursor-pointer flex-shrink-0 select-none"
              >
                ▼
              </span>
            ) : null}
          </div>
          {univDropOpen && (
            <>
              <div onClick={() => setUnivDropOpen(false)} className="fixed inset-0 z-10" />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-lg z-20 max-h-[200px] overflow-y-auto shadow-lg">
                {filteredUnivs.length === 0 ? (
                  <div className="px-3 py-2.5 text-[12px] text-ink-muted text-center">검색 결과 없음</div>
                ) : filteredUnivs.map((u, i) => (
                  <div
                    key={i}
                    onClick={() => { setSelUnivName(u); setUnivSearch(''); setSelDeptName(''); setDeptSearch(''); setUnivDropOpen(false); setSelQ(null) }}
                    className={`px-3 py-2 text-[12px] cursor-pointer transition-colors ${
                      selUnivName === u
                        ? 'bg-brand-high-pale text-brand-high-dark font-semibold'
                        : 'text-ink hover:bg-brand-high-pale/50'
                    } ${i < filteredUnivs.length - 1 ? 'border-b border-line-light' : ''}`}
                  >
                    {u}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="text-[14px] text-ink-muted flex-shrink-0">›</span>

        {/* 학과 검색 */}
        <div className="relative w-[220px]">
          <div
            onClick={() => { if (selUnivName && !selDeptName) setDeptDropOpen(true) }}
            className={`flex items-center gap-2 border rounded-lg px-3 py-2 h-9 transition-colors ${
              deptDropOpen ? 'border-brand-high bg-white'
              : selUnivName ? 'border-line bg-white'
              : 'border-line-light bg-gray-50 cursor-not-allowed'
            }`}
          >
            <span className="text-[14px] flex-shrink-0">📚</span>
            <input
              value={deptInputValue}
              onChange={e => { if (!selUnivName) return; setDeptSearch(e.target.value); setSelDeptName(''); setSelQ(null); setDeptDropOpen(true) }}
              onFocus={() => { if (selUnivName && !selDeptName) setDeptDropOpen(true) }}
              placeholder={selUnivName ? '학과 검색' : '학교 먼저 선택'}
              disabled={!selUnivName}
              className="flex-1 border-none outline-none text-[12px] font-sans bg-transparent text-ink min-w-0 disabled:cursor-not-allowed"
            />
            {selDeptName && selUnivName ? null
              : selUnivName ? (
                <span
                  onClick={e => { e.stopPropagation(); setDeptDropOpen(!deptDropOpen) }}
                  className="text-[10px] text-ink-muted cursor-pointer flex-shrink-0 select-none"
                >
                  ▼
                </span>
              ) : (
                <span className="text-[10px] text-gray-300 flex-shrink-0">▼</span>
              )}
          </div>
          {deptDropOpen && selUnivName && (
            <>
              <div onClick={() => setDeptDropOpen(false)} className="fixed inset-0 z-10" />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-lg z-20 max-h-[200px] overflow-y-auto shadow-lg">
                {filteredDepts.length === 0 ? (
                  <div className="px-3 py-2.5 text-[12px] text-ink-muted text-center">검색 결과 없음</div>
                ) : filteredDepts.map((d, i) => (
                  <div
                    key={i}
                    onClick={() => { setSelDeptName(d); setDeptSearch(''); setDeptDropOpen(false); setSelQ(null) }}
                    className={`px-3 py-2 text-[12px] cursor-pointer transition-colors ${
                      selDeptName === d
                        ? 'bg-brand-high-pale text-brand-high-dark font-semibold'
                        : 'text-ink hover:bg-brand-high-pale/50'
                    } ${i < filteredDepts.length - 1 ? 'border-b border-line-light' : ''}`}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {selUnivName && selDeptName && (
          <div className="flex items-center gap-1.5 text-[11px] text-brand-high-dark bg-brand-high-pale px-3 py-1.5 rounded-full border border-brand-high-light flex-shrink-0 font-semibold">
            <span>✓ {selUnivName} · {selDeptName}</span>
            <button
              onClick={() => {
                if (!window.confirm(`"${selUnivName} · ${selDeptName}" 목록에서 숨길까요?\n\n⚠️ 답변/피드백은 모두 유지돼요.\n원장님이 언제든 다시 복구할 수 있어요.`)) return
                const newTargets = allTargets.map(t =>
                  t.university === selUnivName && t.department === selDeptName
                    ? { ...t, hidden: true }
                    : t
                )
                updateTargets.mutate(newTargets, {
                  onSuccess: () => {
                    resetAll()
                  },
                })
              }}
              className="text-[12px] text-red-500 hover:text-red-700 leading-none transition-colors font-bold"
              title="목록에서 숨김 (데이터는 유지)"
            >
              ✕
            </button>
          </div>
        )}

        <button
          onClick={printAnswers}
          className="ml-auto px-4 py-1.5 bg-white text-brand-high-dark border border-brand-high-light rounded-full text-[12px] font-semibold hover:bg-brand-high-pale flex items-center gap-1.5 transition-all"
        >
          🖨️ 최종 답변집 인쇄
        </button>
      </div>

      {/* 좌우 패널 */}
      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* 왼쪽: 질문 목록 */}
        <div className="w-[360px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-3 border-b border-line-light flex-shrink-0">
            {selUnivName && selDeptName ? (
              <>
                <div className="text-[13px] font-bold text-ink tracking-tight">{selUnivName}</div>
                <div className="text-[11px] text-ink-secondary mt-0.5 font-medium">{selDeptName}</div>
                <div className="text-[11px] text-ink-secondary mt-1.5 font-medium leading-[1.7]">
                  총 <span className="text-brand-high-dark font-bold">{curQuestions.length}개</span>
                  <br />
                  답변완료 <span className="text-emerald-600 font-bold">{curQuestions.filter(q => q.answer?.student_answer).length}개</span> ·
                  미답변 <span className="text-amber-600 font-bold">{curQuestions.filter(q => !q.answer?.student_answer).length}개</span>
                </div>
              </>
            ) : (
              <div className="text-[12px] text-ink-muted font-medium">학교와 학과를 선택해주세요</div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {!selUnivName || !selDeptName ? (
              <div className="text-center py-10 text-ink-muted">
                <div className="text-3xl mb-2">🏫</div>
                <div className="text-[12px]">위에서 학교와 학과를 선택해주세요</div>
              </div>
            ) : loadingQ ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">불러오는 중...</div>
            ) : curQuestions.length === 0 ? (
              <div className="text-center py-10 text-ink-muted">
                <div className="text-3xl mb-2">📝</div>
                <div className="text-[12px]">기출문제가 없어요.</div>
              </div>
            ) : curQuestions.map((q, i) => {
              const qType = inferQuestionType(q.question)
              const isAnswered = !!q.answer?.student_answer
              const qStep = getMyStep(q.answer, [])
              return (
                <div
                  key={q.id}
                  onClick={() => {
                    setSelQ(q); setMyAnswer(''); setUpgradedAnswer('')
                    setIsRecording1(false); setIsRecording3(false)
                    setEditingStep1(false); setEditingStep3(false)
                  }}
                  className={`border rounded-xl px-3 py-2.5 mb-1.5 cursor-pointer transition-all ${
                    selQ?.id === q.id
                      ? 'border-brand-high bg-brand-high-pale shadow-[0_2px_8px_rgba(37,99,235,0.1)]'
                      : 'border-line bg-white hover:border-brand-high-light hover:shadow-sm'
                  }`}
                >
                  <div className="flex gap-1 mb-1.5">
                    <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full">
                      Q{i + 1}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLOR[qType] || TYPE_COLOR['공통']}`}>
                      {qType}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-ink leading-relaxed font-semibold mb-1.5 line-clamp-3">{q.question}</div>
                  {isAnswered ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      답변완료
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      미답변
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 오른쪽: 상세 */}
        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          {!selQ ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">🎓</div>
              <div className="text-[14px] font-semibold text-ink-secondary">질문을 선택해주세요</div>
              <div className="text-[12px]">왼쪽에서 기출문제를 클릭하면 답변을 작성할 수 있어요</div>
            </div>
          ) : (
            <>
              {/* 헤더 + 스테퍼 */}
              <div className="px-5 py-3.5 border-b border-line-light flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-bold text-ink">Q{curQuestions.findIndex(q => q.id === selQ.id) + 1}</div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLOR[inferQuestionType(selQ.question)] || TYPE_COLOR['공통']}`}>
                      {inferQuestionType(selQ.question)}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    selQ.answer?.student_answer
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-amber-700 bg-amber-50 border-amber-200'
                  }`}>
                    {selQ.answer?.student_answer ? '답변완료' : '미답변'}
                  </span>
                </div>

                <div className="flex">
                  {STEP_LABELS.map((label, i) => {
                    const stepNum = i + 1
                    const isDone = stepNum < step
                    const isOn = stepNum === step
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                        {i < 4 && (
                          <div className={`absolute top-3 left-[55%] w-[90%] h-[1.5px] ${isDone ? 'bg-emerald-500' : 'bg-line'}`} />
                        )}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 border-2 transition-all ${
                          isDone
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : isOn
                              ? 'bg-brand-high text-white border-brand-high shadow-[0_2px_8px_rgba(37,99,235,0.3)]'
                              : 'bg-gray-100 text-ink-muted border-line'
                        }`}>
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div className={`text-[10px] font-semibold whitespace-nowrap ${
                          isDone ? 'text-emerald-600' : isOn ? 'text-brand-high-dark' : 'text-ink-muted'
                        }`}>
                          {label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 본문 */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">

                {/* 질문 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">기출 질문</div>
                  <div className="text-[14px] font-bold text-ink leading-relaxed">{selQ.question}</div>
                </div>

                {/* Step 1 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-bold text-white bg-ink-secondary px-2 py-0.5 rounded-full">Step 1</span>
                    <span className="text-[11px] font-semibold text-ink-secondary">내 첫 답변</span>
                  </div>
                  {selQ.answer?.student_answer && !editingStep1 ? (
                    <div>
                      <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2.5 text-[13px] text-ink leading-relaxed mb-2 whitespace-pre-wrap">
                        {selQ.answer.student_answer}
                      </div>
                      {!round1?.teacher_feedback && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => { setEditingStep1(true); setMyAnswer(selQ.answer!.student_answer!) }}
                            className="text-[11px] font-semibold text-ink-secondary bg-white border border-line rounded-md px-3 py-1 hover:bg-gray-50 transition-all"
                          >
                            ✏️ 수정
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {isRecording1 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[12px] text-red-600 font-bold">녹음 중...</span>
                        </div>
                      )}
                      <textarea
                        value={myAnswer}
                        onChange={e => setMyAnswer(e.target.value)}
                        placeholder="답변을 작성하거나 마이크로 녹음해주세요..."
                        rows={4}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none resize-y leading-relaxed focus:border-brand-high transition-colors font-sans"
                      />
                      <div className="flex gap-2 mt-2 justify-end">
                        {editingStep1 && (
                          <button
                            onClick={() => { setEditingStep1(false); setMyAnswer('') }}
                            className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-all"
                          >
                            취소
                          </button>
                        )}
                        <MicBtn recording={isRecording1} onClick={() => setIsRecording1(!isRecording1)} />
                        <SubmitBtn
                          label={submitFirst.isPending ? '저장중...' : editingStep1 ? '수정 완료' : '답변 제출'}
                          onClick={submitAnswer}
                          disabled={!myAnswer.trim() || submitFirst.isPending}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Step 2 */}
                {selQ.answer?.student_answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-high px-2 py-0.5 rounded-full">Step 2</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">선생님 1차 피드백</span>
                    </div>
                    {round1?.teacher_feedback ? (
                      <div className="bg-brand-high-pale border border-brand-high-light rounded-lg px-3 py-2.5 text-[13px] text-brand-high-dark leading-relaxed whitespace-pre-wrap">
                        {round1.teacher_feedback}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                        선생님 피드백을 기다리는 중이에요.
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3 */}
                {round1?.teacher_feedback && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-ink-secondary px-2 py-0.5 rounded-full">Step 3</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">업그레이드 답변</span>
                    </div>
                    {round2?.revised_answer && !editingStep3 ? (
                      <div>
                        <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2.5 text-[13px] text-ink leading-relaxed mb-2 whitespace-pre-wrap">
                          {round2.revised_answer}
                        </div>
                        {!round2.teacher_feedback && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => { setEditingStep3(true); setUpgradedAnswer(round2.revised_answer!) }}
                              className="text-[11px] font-semibold text-ink-secondary bg-white border border-line rounded-md px-3 py-1 hover:bg-gray-50 transition-all"
                            >
                              ✏️ 수정
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-800 font-medium mb-2">
                          💡 선생님 피드백을 반영해서 답변을 업그레이드해보세요!
                        </div>
                        {isRecording3 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[12px] text-red-600 font-bold">녹음 중...</span>
                          </div>
                        )}
                        <textarea
                          value={upgradedAnswer}
                          onChange={e => setUpgradedAnswer(e.target.value)}
                          placeholder="피드백을 반영한 업그레이드 답변을 작성하거나 마이크로 녹음해주세요..."
                          rows={4}
                          className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none resize-y leading-relaxed focus:border-brand-high transition-colors font-sans"
                        />
                        <div className="flex gap-2 mt-2 justify-end">
                          {editingStep3 && (
                            <button
                              onClick={() => { setEditingStep3(false); setUpgradedAnswer('') }}
                              className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-all"
                            >
                              취소
                            </button>
                          )}
                          <MicBtn recording={isRecording3} onClick={() => setIsRecording3(!isRecording3)} />
                          <SubmitBtn
                            label={submitUpgrade.isPending ? '저장중...' : editingStep3 ? '수정 완료' : '업그레이드 제출'}
                            onClick={submitUpgradeFn}
                            disabled={!upgradedAnswer.trim() || submitUpgrade.isPending}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 4 */}
                {round2?.revised_answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">Step 4</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">선생님 최종 피드백</span>
                    </div>
                    {round2.teacher_feedback ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-[13px] text-emerald-900 leading-relaxed whitespace-pre-wrap">
                        {round2.teacher_feedback}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                        선생님 최종 피드백을 기다리는 중이에요.
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5 꼬리질문 */}
                {followups.length > 0 && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-high px-2 py-0.5 rounded-full">Step 5</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">꼬리질문</span>
                    </div>
                    {followups.map((fu, i) => {
                      const fuKey = fu.id
                      return (
                        <div key={fu.id} className="mb-3">
                          <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 border border-line-light rounded-lg mb-2 text-[12px] text-ink leading-relaxed">
                            <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">
                              꼬리 {i + 1}
                            </span>
                            <span className="leading-relaxed">{fu.teacher_edited_question || fu.ai_generated_question}</span>
                          </div>
                          {fu.student_answer ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                              <div className="text-[10px] font-bold text-emerald-700 mb-1">✓ 내 답변</div>
                              <div className="text-[12px] text-ink leading-relaxed whitespace-pre-wrap">{fu.student_answer}</div>
                            </div>
                          ) : (
                            <>
                              {tailRecordings[fuKey] && (
                                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-1.5 flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                  <span className="text-[12px] text-red-600 font-bold">녹음 중...</span>
                                </div>
                              )}
                              <div className="bg-gray-50 rounded-lg p-2.5 border border-line-light">
                                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">꼬리질문 답변</div>
                                <textarea
                                  value={followupAnswers[fuKey] || ''}
                                  onChange={e => setFollowupAnswers(prev => ({ ...prev, [fuKey]: e.target.value }))}
                                  placeholder="꼬리질문에 대한 답변을 작성하거나 마이크로 녹음해주세요..."
                                  rows={2}
                                  className="w-full border border-line rounded-lg px-2.5 py-2 text-[12px] outline-none resize-none leading-relaxed bg-white focus:border-brand-high transition-colors font-sans"
                                />
                                <div className="flex gap-2 mt-2 justify-end">
                                  <MicBtn
                                    recording={!!tailRecordings[fuKey]}
                                    onClick={() => setTailRecordings(prev => ({ ...prev, [fuKey]: !prev[fuKey] }))}
                                  />
                                  <button
                                    onClick={() => submitFollowupFn(fu.id)}
                                    disabled={!(followupAnswers[fuKey] || '').trim() || submitFollowup.isPending}
                                    className="w-[102px] h-9 bg-brand-high text-white rounded-lg text-[12px] font-bold hover:bg-brand-high-dark transition-all shadow-[0_2px_8px_rgba(37,99,235,0.2)] disabled:opacity-50"
                                  >
                                    {submitFollowup.isPending ? '저장중...' : '제출'}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}