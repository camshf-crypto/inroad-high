import { useState, useRef, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '../../_store/auth'

const ALL_SCHOOLS = [
  { id: 1, name: '인천하늘고', shortName: '인천하늘고', color: '#1E40AF', bg: '#EEF2FF' },
  { id: 2, name: '한국과학영재학교', shortName: '한국과학영재학교', color: '#065F46', bg: '#ECFDF5' },
  { id: 3, name: '경기과학고', shortName: '경기과학고', color: '#065F46', bg: '#ECFDF5' },
  { id: 4, name: '서울과학고', shortName: '서울과학고', color: '#065F46', bg: '#ECFDF5' },
  { id: 5, name: '대원외고', shortName: '대원외고', color: '#7C2D12', bg: '#FFF7ED' },
  { id: 6, name: '대일외고', shortName: '대일외고', color: '#7C2D12', bg: '#FFF7ED' },
  { id: 7, name: '명덕외고', shortName: '명덕외고', color: '#7C2D12', bg: '#FFF7ED' },
  { id: 8, name: '서울외고', shortName: '서울외고', color: '#7C2D12', bg: '#FFF7ED' },
  { id: 9, name: '이화외고', shortName: '이화외고', color: '#831843', bg: '#FDF2F8' },
  { id: 10, name: '한영외고', shortName: '한영외고', color: '#7C2D12', bg: '#FFF7ED' },
  { id: 11, name: '민족사관고', shortName: '민사고', color: '#1E3A5F', bg: '#EFF6FF' },
  { id: 12, name: '하나고', shortName: '하나고', color: '#1E40AF', bg: '#EEF2FF' },
  { id: 13, name: '외대부고', shortName: '외대부고', color: '#7C2D12', bg: '#FFF7ED' },
  { id: 14, name: '북일고', shortName: '북일고', color: '#1E3A5F', bg: '#EFF6FF' },
  { id: 15, name: '상산고', shortName: '상산고', color: '#1E3A5F', bg: '#EFF6FF' },
  { id: 16, name: '현대청운고', shortName: '현대청운고', color: '#1E3A5F', bg: '#EFF6FF' },
  { id: 17, name: '포항제철고', shortName: '포항제철고', color: '#1E3A5F', bg: '#EFF6FF' },
  { id: 18, name: '김천고', shortName: '김천고', color: '#1E3A5F', bg: '#EFF6FF' },
  { id: 19, name: '휘문고', shortName: '휘문고', color: '#374151', bg: '#F9FAFB' },
  { id: 20, name: '중동고', shortName: '중동고', color: '#374151', bg: '#F9FAFB' },
]

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]

const PROBLEMS: Record<string, any[]> = {
  '1-2025': [
    {
      id: 1, title: '문제 1번', subject: '인문사회', totalQ: 2,
      pdfUrl: null,
      pdfMock: `[제시문]\n\n(가)\n민주주의(democracy)는 '민중'이라는 뜻의 고대 그리스 어인 데모스(demos)와 그라토스(kratos)가 합해져서 생겨난 말이다. 이는 민주에 의한 지배가 아니라 한 사람이나 소수가 지배하는 것이 아니라 다수의 민중이 지배한다는 의미이다...\n\n(나)\n아테네의 철학자 플라톤은 이에아 혹은 형상에 관한 지식을 가진 소수의 능력을 갖춘 철학자가 정치를 할 때 진정한 이상 국가가 실현된다고 주장하였다.\n\n(다)\n[그림 제시문 - 소득 불평등 관련 그래프]\n소득을 가진 모든 개인이 가장행렬에 줄선다. 이 가장행렬에 줄선하는 사람들의 키는 그 사람의 소득 크기에 비례한다...`,
      questions: [
        {
          id: 1,
          text: '제시문 (가)와 (나)를 바탕으로 민주주의와 엘리트주의의 공통점과 차이점을 설명하시오.',
          intent: ['제시문의 핵심 논지를 정확히 파악하는지 확인', '두 사상의 비교 분석 능력 평가'],
          answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: []
        },
        {
          id: 2,
          text: '제시문 (다)의 그래프가 보여주는 사회 현상을 설명하고, 이것이 민주주의에 미치는 영향을 논하시오.',
          intent: ['자료 해석 능력 평가', '사회 현상과 정치 체제의 연관성 파악 능력 확인'],
          answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: []
        },
      ],
    },
    {
      id: 2, title: '문제 2번', subject: '영어 지문', totalQ: 2,
      pdfUrl: null,
      pdfMock: `[English Passage]\n\nMaybe a few were talking about it around here.\nNow, there is no more potential here...\n\nThe landscaper certainly was doing great in sales.\nA couple more won't hurt.\n\nProfits and sales are doing great, gave a few workers a bonus...\n\nWe need more cows.\n\nLater that year...`,
      questions: [
        {
          id: 1,
          text: '영어 제시문이 보여주는 경제적 현상을 요약하고, 이것이 지속 가능한 발전과 어떤 관련이 있는지 설명하시오.',
          intent: ['영어 독해 능력 및 핵심 내용 파악 능력 평가', '경제 개념과 환경의 연관성 이해 확인'],
          answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: []
        },
        {
          id: 2,
          text: '제시문에 나타난 사회 현상의 문제점을 지적하고, 해결 방안을 구체적으로 제시하시오.',
          intent: ['비판적 사고 능력 평가', '현실적인 문제 해결 방안 제시 능력 확인'],
          answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: []
        },
      ],
    },
  ],
  '11-2025': [
    {
      id: 1, title: '문제 1번', subject: '인문사회', totalQ: 2,
      pdfUrl: null,
      pdfMock: `[제시문]\n\n(가)\n세계화란 국가 간 경계가 낮아지고 사람, 자본, 정보가 자유롭게 이동하는 현상이다. 이를 통해 경제적 효율성이 높아지지만, 문화적 다양성이 약화될 수 있다는 우려도 있다.\n\n(나)\n한 연구에 따르면 세계화 이후 다국적 기업이 개발도상국에 진출하면서 현지 경제가 성장했지만, 전통 문화와 지역 산업이 위기를 맞았다는 사례가 보고되었다.`,
      questions: [
        {
          id: 1,
          text: '제시문 (가)와 (나)를 바탕으로 세계화의 긍정적 효과와 부정적 효과를 균형 있게 논하시오.',
          intent: ['균형 잡힌 시각으로 현상을 분석하는 능력 평가', '세계화의 다양한 측면 이해 확인'],
          answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: []
        },
        {
          id: 2,
          text: '세계화 시대에 문화적 다양성을 보존하기 위한 방안을 두 가지 이상 제시하시오.',
          intent: ['창의적 문제 해결 능력 평가', '구체적인 정책 제안 능력 확인'],
          answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: []
        },
      ],
    },
  ],
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

const MicBtn = ({ recording, onClick }: { recording: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 text-base transition-all ${
      recording
        ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
        : 'bg-brand-middle-pale border-brand-middle-light text-brand-middle-dark hover:bg-brand-middle-bg'
    }`}
  >
    {recording ? '⏹' : '🎙️'}
  </button>
)

const SubmitBtn = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`h-9 px-4 rounded-lg text-[12px] font-semibold flex-shrink-0 transition-all ${
      !disabled
        ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
        : 'bg-gray-100 text-ink-muted cursor-not-allowed'
    }`}
  >
    {label}
  </button>
)

export default function MiddlePresentation() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const [step, setStep] = useState<'school' | 'list' | 'solve'>('school')
  const [selSchool, setSelSchool] = useState<any>(null)
  const [selYear, setSelYear] = useState(2025)
  const [selProblem, setSelProblem] = useState<any>(null)
  const [schoolSearch, setSchoolSearch] = useState('')
  const [problems, setProblems] = useState(PROBLEMS)

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [upgradedAnswers, setUpgradedAnswers] = useState<Record<string, string>>({})
  const [tailAnswers, setTailAnswers] = useState<Record<string, string>>({})
  const [recordings, setRecordings] = useState<Record<string, boolean>>({})
  const [editingStep1, setEditingStep1] = useState<Record<string, boolean>>({})
  const [editingStep3, setEditingStep3] = useState<Record<string, boolean>>({})
  const [openIntents, setOpenIntents] = useState<Record<string, boolean>>({})

  const [leftWidth, setLeftWidth] = useState(50)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const problemKey = selSchool ? `${selSchool.id}-${selYear}` : ''
  const curProblems = problems[problemKey] || []
  const filteredSchools = ALL_SCHOOLS.filter(s => s.name.includes(schoolSearch))

  const handleDragStart = useCallback(() => { isDragging.current = true }, [])
  const handleDragEnd = useCallback(() => { isDragging.current = false }, [])
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setLeftWidth(Math.min(75, Math.max(25, pct)))
  }, [])

  const getProblemStatus = (p: any) => {
    const all = p.questions.every((q: any) => q.answer)
    if (all) return 'done'
    const any = p.questions.some((q: any) => q.answer)
    if (any) return 'doing'
    return 'new'
  }

  const getQStep = (q: any) => {
    if (!q.answer) return 1
    if (!q.teacherFeedback) return 2
    if (!q.upgradedAnswer) return 3
    if (!q.finalFeedback) return 4
    return 5
  }

  const updateQuestion = (problemId: number, questionId: number, patch: any) => {
    const updated = { ...problems }
    updated[problemKey] = updated[problemKey].map((p: any) =>
      p.id === problemId
        ? { ...p, questions: p.questions.map((q: any) => q.id === questionId ? { ...q, ...patch } : q) }
        : p
    )
    setProblems(updated)
    if (selProblem?.id === problemId) {
      setSelProblem((prev: any) => ({
        ...prev,
        questions: prev.questions.map((q: any) => q.id === questionId ? { ...q, ...patch } : q)
      }))
    }
  }

  const submitAnswer = (problemId: number, q: any) => {
    const key = `${problemId}-${q.id}`
    const val = answers[key] || ''
    if (!val.trim()) return
    updateQuestion(problemId, q.id, { answer: val, teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] })
    setAnswers(p => ({ ...p, [key]: '' }))
    setEditingStep1(p => ({ ...p, [key]: false }))
    setRecordings(p => ({ ...p, [key]: false }))
  }

  const submitUpgrade = (problemId: number, q: any) => {
    const key = `${problemId}-${q.id}`
    const val = upgradedAnswers[key] || ''
    if (!val.trim()) return
    updateQuestion(problemId, q.id, { upgradedAnswer: val, finalFeedback: '', tails: [] })
    setUpgradedAnswers(p => ({ ...p, [key]: '' }))
    setEditingStep3(p => ({ ...p, [key]: false }))
    setRecordings(p => ({ ...p, [`${key}-up`]: false }))
  }

  const submitTail = (problemId: number, q: any, tailIdx: number) => {
    const key = `${problemId}-${q.id}-tail-${tailIdx}`
    const val = tailAnswers[key] || ''
    if (!val.trim()) return
    const newTails = [...(q.tails || [])].map((t: any, i: number) =>
      i === tailIdx ? { ...t, answer: val } : t
    )
    updateQuestion(problemId, q.id, { tails: newTails })
    setTailAnswers(p => ({ ...p, [key]: '' }))
    setRecordings(p => ({ ...p, [key]: false }))
  }

  // ── 학교 선택 ──
  if (step === 'school') return (
    <div className="h-full overflow-y-auto px-8 py-7 font-sans text-ink">
      <div className="text-[18px] font-extrabold text-ink tracking-tight mb-1">제시문 면접</div>

      {/* 히어로 배너 */}
      <div className="bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-2xl px-7 py-6 mb-7 mt-4 flex items-center justify-between relative overflow-hidden shadow-[0_8px_24px_rgba(16,185,129,0.2)]">
        <div
          className="absolute -top-12 -right-12 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }}
        />
        <div className="relative">
          <div className="text-[20px] font-extrabold text-white mb-1.5 tracking-tight">자사고·특목고 제시문 면접!</div>
          <div className="text-[13px] text-white/85">학교별 기출 제시문으로 실전 같은 면접을 경험해보세요. 한국어 + 영어 지문 포함!</div>
        </div>
        <div className="text-5xl relative">📄</div>
      </div>

      <div className="text-[14px] font-bold text-ink mb-2.5">학교 선택하기</div>

      {/* 검색창 */}
      <div className="mb-3.5">
        <input
          value={schoolSearch}
          onChange={e => setSchoolSearch(e.target.value)}
          placeholder="학교 이름 검색 (예: 인천하늘고, 민사고...)"
          className="w-full h-11 px-3.5 border border-line rounded-lg text-[14px] focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
        />
      </div>

      {/* 학교 그리드 */}
      <div className="grid grid-cols-4 max-md:grid-cols-2 gap-2.5 pb-6">
        {filteredSchools.length === 0 ? (
          <div className="col-span-full text-center py-8 text-ink-muted text-[13px]">검색 결과가 없어요</div>
        ) : filteredSchools.map(s => (
          <div
            key={s.id}
            onClick={() => { setSelSchool(s); setStep('list') }}
            className="bg-white border border-line rounded-xl p-4 text-center cursor-pointer hover:border-brand-middle-light hover:shadow-[0_8px_24px_rgba(16,185,129,0.08)] hover:-translate-y-0.5 transition-all"
            style={{ background: s.bg }}
          >
            <div
              className="w-10 h-10 rounded-full bg-white border flex items-center justify-center mx-auto mb-2.5 text-base font-bold"
              style={{ borderColor: `${s.color}30`, color: s.color }}
            >
              {s.shortName[0]}
            </div>
            <div className="text-[12px] font-bold" style={{ color: s.color }}>{s.shortName}</div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── 문제 목록 ──
  if (step === 'list') return (
    <div className="h-full overflow-y-auto px-8 py-7 font-sans text-ink">
      <div className="flex items-center gap-2.5 mb-5">
        <button
          onClick={() => { setStep('school'); setSelSchool(null); setSchoolSearch('') }}
          className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-base text-ink-secondary hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
        >
          ←
        </button>
        <div className="text-[16px] font-semibold text-ink">제시문 면접</div>
      </div>

      {/* 학교 정보 배너 */}
      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-5 py-4 mb-5 flex items-center gap-3.5">
        <div
          className="w-12 h-12 rounded-full bg-white border flex items-center justify-center text-xl font-bold flex-shrink-0"
          style={{ borderColor: `${selSchool?.color}30`, color: selSchool?.color }}
        >
          {selSchool?.shortName[0]}
        </div>
        <div>
          <div className="text-[16px] font-extrabold text-ink tracking-tight">{selYear}년 {selSchool?.name}</div>
          <div className="text-[12px] text-ink-secondary mt-0.5">자사고·특목고 제시문 면접 기출</div>
        </div>
      </div>

      {/* 연도 선택 */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {YEARS.map(y => (
          <button
            key={y}
            onClick={() => setSelYear(y)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] border whitespace-nowrap transition-all ${
              selYear === y
                ? 'bg-brand-middle text-white border-brand-middle font-semibold'
                : 'bg-white text-ink-secondary border-line font-medium hover:border-brand-middle-light hover:text-brand-middle-dark'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="text-[13px] text-ink-secondary mb-3.5">총 {curProblems.length}문제</div>

      {curProblems.length === 0 ? (
        <div className="text-center py-16 text-ink-muted">
          <div className="text-4xl mb-3">📄</div>
          <div className="text-[14px]">해당 연도의 문제가 없어요.</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3.5 pb-6">
          {curProblems.map((p: any) => {
            const status = getProblemStatus(p)
            return (
              <div key={p.id} className="bg-white border border-line rounded-xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-2.5 mb-3.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    status === 'done'
                      ? 'bg-brand-middle-pale'
                      : status === 'doing'
                        ? 'bg-amber-50'
                        : 'bg-gray-100'
                  }`}>
                    {status === 'done' ? '✅' : status === 'doing' ? '📝' : '💡'}
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-ink tracking-tight">{p.title}</div>
                    <div className="text-[11px] text-ink-muted">총 {p.totalQ}문항 · {p.subject}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelProblem(p); setStep('solve') }}
                    className={`flex-1 h-9 rounded-lg text-[13px] font-semibold text-white transition-all hover:-translate-y-px ${
                      status === 'done'
                        ? 'bg-brand-middle hover:bg-brand-middle-hover hover:shadow-btn-middle'
                        : status === 'doing'
                          ? 'bg-orange-500 hover:bg-orange-600 hover:shadow-[0_4px_12px_rgba(249,115,22,0.3)]'
                          : 'bg-brand-middle hover:bg-brand-middle-hover hover:shadow-btn-middle'
                    }`}
                  >
                    {status === 'done' ? '다시 풀기' : status === 'doing' ? '이어서 풀기' : '문제 풀기'}
                  </button>
                  <button className="flex-1 h-9 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-medium hover:border-brand-middle-light hover:text-brand-middle-dark transition-all">
                    피드백 확인
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── 문제 풀기 ──
  if (step === 'solve' && selProblem) return (
    <div
      ref={containerRef}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      className="flex flex-col h-[calc(100vh-50px)] overflow-hidden font-sans text-ink"
    >

      {/* 상단바 */}
      <div className="h-12 bg-white border-b border-line flex items-center justify-between px-6 flex-shrink-0">
        <button
          onClick={() => setStep('list')}
          className="text-[13px] text-ink-secondary hover:text-brand-middle-dark font-medium transition-colors"
        >
          ← 목록으로
        </button>
        <div className="text-[13px] font-semibold text-ink">{selYear}년 {selSchool?.shortName} · {selProblem.title}</div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-6 rounded-full bg-brand-middle-bg border flex items-center justify-center text-[11px] font-bold"
            style={{ borderColor: `${selSchool?.color}30`, color: selSchool?.color }}
          >
            {selSchool?.shortName[0]}
          </div>
          <span className="text-[12px] text-ink-secondary font-medium">{selSchool?.shortName}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* 왼쪽: 제시문 */}
        <div
          className="border-r border-line overflow-y-auto px-6 py-5 bg-[#FAFAFA] flex-shrink-0"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="text-[11px] font-bold text-ink-muted mb-2.5 tracking-wider uppercase">제시문</div>
          {selProblem.pdfUrl ? (
            <embed src={selProblem.pdfUrl} type="application/pdf" width="100%" style={{ minHeight: 600 }} className="rounded-lg" />
          ) : (
            <div
              className="bg-white border border-line rounded-xl px-6 py-5 text-[14px] text-ink leading-[2] whitespace-pre-line"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {selProblem.pdfMock}
            </div>
          )}
        </div>

        {/* 드래그 핸들 */}
        <div
          onMouseDown={handleDragStart}
          className="w-1.5 bg-line cursor-col-resize flex-shrink-0 flex items-center justify-center hover:bg-brand-middle-light transition-colors"
        >
          <div className="w-0.5 h-10 bg-ink-muted rounded-full" />
        </div>

        {/* 오른쪽: 문제 답변 */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8">
          {selProblem.questions.map((q: any, qi: number) => {
            const qKey = `${selProblem.id}-${q.id}`
            const qStep = getQStep(q)

            return (
              <div
                key={q.id}
                className={qi < selProblem.questions.length - 1 ? 'border-b border-line-light pb-8' : ''}
              >

                {/* 질문 */}
                <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3 mb-2.5">
                  <div className="text-[11px] font-bold text-brand-middle-dark mb-1">문제 {qi + 1}.</div>
                  <div className="text-[13px] font-semibold text-ink leading-[1.7]">{q.text}</div>
                </div>

                {/* 5단계 */}
                <div className="flex items-start mb-4">
                  {STEP_LABELS.map((label, i) => {
                    const stepNum = i + 1
                    const isDone = stepNum < qStep
                    const isOn = stepNum === qStep
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                        {i < STEP_LABELS.length - 1 && (
                          <div className={`absolute top-[11px] left-[55%] w-[90%] h-0.5 z-0 ${isDone ? 'bg-brand-middle' : 'bg-line'}`} />
                        )}
                        <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold z-10 relative border-2 ${
                          isDone || isOn
                            ? 'bg-brand-middle text-white border-brand-middle'
                            : 'bg-gray-100 text-ink-muted border-line'
                        }`}>
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div className={`text-[10px] whitespace-nowrap ${
                          isDone || isOn ? 'text-brand-middle-dark font-semibold' : 'text-ink-muted font-medium'
                        }`}>
                          {label}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 질문 의도 (아코디언) */}
                <div className="mb-3">
                  <button
                    onClick={() => setOpenIntents(p => ({ ...p, [qKey]: !p[qKey] }))}
                    className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all ${
                      openIntents[qKey]
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-gray-50 border-line hover:bg-amber-50/50'
                    }`}
                  >
                    <span className={`text-[11px] font-semibold ${openIntents[qKey] ? 'text-amber-700' : 'text-ink-secondary'}`}>
                      💡 질문 의도 파악
                    </span>
                    <span className="ml-auto text-[10px] text-ink-muted">{openIntents[qKey] ? '▲' : '▼'}</span>
                  </button>
                  {openIntents[qKey] && (
                    <div className="bg-amber-50/50 border border-amber-200 border-t-0 rounded-b-lg px-3 py-2.5">
                      <ul className="pl-4 space-y-1">
                        {(q.intent || []).map((item: string, idx: number) => (
                          <li key={idx} className="text-[12px] text-amber-700 leading-[1.7] list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Step 1 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3 mb-2.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${
                      qStep > 1 ? 'bg-brand-middle' : 'bg-ink-muted'
                    }`}>
                      Step 1
                    </span>
                    <span className="text-[11px] text-ink-secondary font-medium">내 첫 답변</span>
                  </div>
                  {q.answer && !editingStep1[qKey] ? (
                    <div>
                      <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2">{q.answer}</div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setEditingStep1(p => ({ ...p, [qKey]: true })); setAnswers(p => ({ ...p, [qKey]: q.answer })) }}
                          className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
                        >
                          ✏️ 수정
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {recordings[qKey] && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[12px] text-red-600 font-semibold">녹음 중...</span>
                        </div>
                      )}
                      <textarea
                        value={answers[qKey] || ''}
                        onChange={e => setAnswers(p => ({ ...p, [qKey]: e.target.value }))}
                        placeholder="답변을 작성하거나 마이크로 녹음해주세요..."
                        rows={4}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                      />
                      <div className="flex gap-2 mt-2 justify-end">
                        {editingStep1[qKey] && (
                          <button
                            onClick={() => { setEditingStep1(p => ({ ...p, [qKey]: false })); setAnswers(p => ({ ...p, [qKey]: '' })) }}
                            className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
                          >
                            취소
                          </button>
                        )}
                        <MicBtn recording={recordings[qKey] || false} onClick={() => setRecordings(p => ({ ...p, [qKey]: !p[qKey] }))} />
                        <SubmitBtn label={editingStep1[qKey] ? '수정 완료' : '답변 제출'} onClick={() => submitAnswer(selProblem.id, q)} disabled={!(answers[qKey] || '').trim()} />
                      </div>
                    </>
                  )}
                </div>

                {/* Step 2 */}
                {q.answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3 mb-2.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">
                        Step 2
                      </span>
                      <span className="text-[11px] text-ink-secondary font-medium">선생님 1차 피드백</span>
                    </div>
                    {q.teacherFeedback ? (
                      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8]">{q.teacherFeedback}</div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">선생님 피드백을 기다리는 중이에요 ✏️</div>
                    )}
                  </div>
                )}

                {/* Step 3 */}
                {q.teacherFeedback && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3 mb-2.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${
                        qStep > 3 ? 'bg-brand-middle' : 'bg-ink-muted'
                      }`}>
                        Step 3
                      </span>
                      <span className="text-[11px] text-ink-secondary font-medium">업그레이드 답변</span>
                    </div>
                    {q.upgradedAnswer && !editingStep3[qKey] ? (
                      <div>
                        <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2">{q.upgradedAnswer}</div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => { setEditingStep3(p => ({ ...p, [qKey]: true })); setUpgradedAnswers(p => ({ ...p, [qKey]: q.upgradedAnswer })) }}
                            className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
                          >
                            ✏️ 수정
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-700 font-medium mb-2">
                          💡 선생님 피드백을 반영해서 답변을 업그레이드해보세요!
                        </div>
                        {recordings[`${qKey}-up`] && (
                          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[12px] text-red-600 font-semibold">녹음 중...</span>
                          </div>
                        )}
                        <textarea
                          value={upgradedAnswers[qKey] || ''}
                          onChange={e => setUpgradedAnswers(p => ({ ...p, [qKey]: e.target.value }))}
                          placeholder="피드백을 반영한 업그레이드 답변을 작성해주세요..."
                          rows={4}
                          className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                        />
                        <div className="flex gap-2 mt-2 justify-end">
                          {editingStep3[qKey] && (
                            <button
                              onClick={() => { setEditingStep3(p => ({ ...p, [qKey]: false })); setUpgradedAnswers(p => ({ ...p, [qKey]: '' })) }}
                              className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
                            >
                              취소
                            </button>
                          )}
                          <MicBtn recording={recordings[`${qKey}-up`] || false} onClick={() => setRecordings(p => ({ ...p, [`${qKey}-up`]: !p[`${qKey}-up`] }))} />
                          <SubmitBtn label={editingStep3[qKey] ? '수정 완료' : '업그레이드 제출'} onClick={() => submitUpgrade(selProblem.id, q)} disabled={!(upgradedAnswers[qKey] || '').trim()} />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 4 */}
                {q.upgradedAnswer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3 mb-2.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 4</span>
                      <span className="text-[11px] text-ink-secondary font-medium">선생님 최종 피드백</span>
                    </div>
                    {q.finalFeedback ? (
                      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8]">{q.finalFeedback}</div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">선생님 최종 피드백을 기다리는 중이에요 ✏️</div>
                    )}
                  </div>
                )}

                {/* Step 5 꼬리질문 */}
                {q.finalFeedback && q.tails && q.tails.length > 0 && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 5</span>
                      <span className="text-[11px] text-ink-secondary font-medium">꼬리질문</span>
                    </div>
                    {q.tails.map((tail: any, ti: number) => {
                      const tailKey = `${qKey}-tail-${ti}`
                      return (
                        <div key={ti} className={ti < q.tails.length - 1 ? 'mb-4' : ''}>
                          <div className="flex items-start gap-1.5 px-2.5 py-2 bg-gray-50 rounded-md mb-2 text-[12px] text-ink leading-[1.5]">
                            <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-1.5 py-0.5 rounded-full flex-shrink-0 mt-[1px]">꼬리 {ti + 1}</span>
                            {typeof tail === 'string' ? tail : tail.text}
                          </div>
                          {recordings[tailKey] && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-1.5 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-[12px] text-red-600 font-semibold">녹음 중...</span>
                            </div>
                          )}
                          {tail.answer ? (
                            <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8]">{tail.answer}</div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                              <textarea
                                value={tailAnswers[tailKey] || ''}
                                onChange={e => setTailAnswers(p => ({ ...p, [tailKey]: e.target.value }))}
                                placeholder="꼬리질문에 대한 답변을 작성해주세요..."
                                rows={2}
                                className="w-full border border-line rounded-md px-2.5 py-2 text-[12px] leading-[1.6] resize-none bg-white focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                              />
                              <div className="flex gap-2 mt-2 justify-end">
                                <MicBtn recording={recordings[tailKey] || false} onClick={() => setRecordings(p => ({ ...p, [tailKey]: !p[tailKey] }))} />
                                <button
                                  onClick={() => submitTail(selProblem.id, q, ti)}
                                  disabled={!(tailAnswers[tailKey] || '').trim()}
                                  className={`h-[34px] px-3.5 rounded-md text-[12px] font-semibold transition-all ${
                                    (tailAnswers[tailKey] || '').trim()
                                      ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
                                      : 'bg-gray-100 text-ink-muted cursor-not-allowed'
                                  }`}
                                >
                                  제출
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  return null
}