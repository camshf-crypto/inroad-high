import { useState, useRef, useCallback } from 'react'

const SNU_LOGO = "data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/..." // 기존 데이터 그대로 유지
const KOREA_LOGO = "data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/..." // 기존 데이터 그대로 유지
const YONSEI_LOGO = "data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/..." // 기존 데이터 그대로 유지
const EDU_LOGO = "data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/..." // 기존 데이터 그대로 유지

const SKY_SCHOOLS = [
  { id: 1, name: '서울대학교', color: '#1E40AF', bg: '#EEF2FF', logo: SNU_LOGO, type: 'sky' },
  { id: 2, name: '고려대학교', color: '#991B1B', bg: '#FEF2F2', logo: KOREA_LOGO, type: 'sky' },
  { id: 3, name: '연세대학교', color: '#1E40AF', bg: '#EFF6FF', logo: YONSEI_LOGO, type: 'sky' },
]

const EDUCATION_SCHOOLS = [
  { id: 10, name: '서울교육대학교', shortName: '서울교대', color: '#065F46', bg: '#ECFDF5', logo: EDU_LOGO, type: 'edu' },
  { id: 11, name: '경인교육대학교', shortName: '경인교대', color: '#065F46', bg: '#ECFDF5', logo: EDU_LOGO, type: 'edu' },
  { id: 12, name: '공주교육대학교', shortName: '공주교대', color: '#065F46', bg: '#ECFDF5', logo: EDU_LOGO, type: 'edu' },
  { id: 13, name: '광주교육대학교', shortName: '광주교대', color: '#065F46', bg: '#ECFDF5', logo: EDU_LOGO, type: 'edu' },
  { id: 14, name: '대구교육대학교', shortName: '대구교대', color: '#065F46', bg: '#ECFDF5', logo: EDU_LOGO, type: 'edu' },
  { id: 15, name: '부산교육대학교', shortName: '부산교대', color: '#065F46', bg: '#ECFDF5', logo: EDU_LOGO, type: 'edu' },
  { id: 16, name: '전주교육대학교', shortName: '전주교대', color: '#065F46', bg: '#ECFDF5', logo: EDU_LOGO, type: 'edu' },
  { id: 17, name: '진주교육대학교', shortName: '진주교대', color: '#065F46', bg: '#ECFDF5', logo: EDU_LOGO, type: 'edu' },
  { id: 18, name: '청주교육대학교', shortName: '청주교대', color: '#065F46', bg: '#ECFDF5', logo: EDU_LOGO, type: 'edu' },
  { id: 19, name: '춘천교육대학교', shortName: '춘천교대', color: '#065F46', bg: '#ECFDF5', logo: EDU_LOGO, type: 'edu' },
  { id: 20, name: '한국교원대학교', shortName: '한국교원대', color: '#1E3A5F', bg: '#EFF6FF', logo: EDU_LOGO, type: 'edu' },
  { id: 21, name: '이화여자대학교 사범대학', shortName: '이화 사범대', color: '#831843', bg: '#FDF2F8', logo: EDU_LOGO, type: 'edu' },
]

const TRACKS_SNU = [
  { id: 'human', name: '인문학', sub: '국어, 사회', icon: '📖' },
  { id: 'humansocial', name: '인문사회학', sub: '국어, 사회, 도덕', icon: '🏛️' },
  { id: 'social', name: '사회과학', sub: '국어, 사회', icon: '📊' },
  { id: 'science', name: '자연계열', sub: '수학, 과학', icon: '🔬' },
]

const TRACKS_SKY = [
  { id: 'humansocial', name: '인문사회학', sub: '국어, 사회, 도덕', icon: '🏛️' },
  { id: 'science', name: '자연계열', sub: '수학, 과학', icon: '🔬' },
]

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]

const PROBLEMS: Record<string, any[]> = {
  '1-social-2025': [
    {
      id: 1, title: '문제 1번', subject: '사회과학', totalQ: 2,
      pdfUrl: null,
      pdfMock: '(가)\n사회 불평등은 단순히 경제적 차원에 그치지 않고 교육, 문화, 건강 등 다양한 영역으로 확산된다. 특히 디지털 전환 시대에는 정보 접근성의 격차가 새로운 불평등의 축으로 부상하고 있다...\n\n(나)\n역사적으로 기술 혁신은 단기적으로는 일부 계층에게 불리하게 작용했지만, 장기적으로는 전반적인 생활 수준 향상에 기여했다.',
      questions: [
        { id: 1, text: '제시문 (가)와 (나)를 바탕으로 기술 발전과 사회적 불평등의 관계를 분석하시오.', intent: ['제시문의 핵심 논지를 정확히 파악하는지 확인', '기술 발전과 불평등의 인과관계를 논리적으로 연결할 수 있는지 평가'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
        { id: 2, text: '현대 사회에서 디지털 불평등을 해소하기 위한 정책적 방안을 두 가지 이상 제시하시오.', intent: ['현실적이고 구체적인 정책 제안 능력 평가', '문제 해결형 사고방식을 갖추고 있는지 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      ],
    },
  ],
  '10-2025': [
    {
      id: 1, title: '문제 1번', subject: '교직적성', totalQ: 2,
      pdfUrl: null,
      pdfMock: '(가)\n교사는 지식 전달자인 동시에 학생의 전인적 성장을 돕는 조력자이다...\n\n(나)\n한 초등학교 교사는 수업 중 갈등을 겪는 두 학생 사이에서 중재자 역할을 하며 공감하는 방식으로 문제를 해결하였다...',
      questions: [
        { id: 1, text: '제시문 (가)와 (나)를 바탕으로 미래 사회에서 초등교사에게 필요한 핵심 역량을 논하시오.', intent: ['교직에 대한 소명의식과 이해도 평가'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
        { id: 2, text: '(나)의 사례에서 교사가 취한 태도를 평가하고, 본인이 유사한 상황에 처한다면 어떻게 대처할지 서술하시오.', intent: ['갈등 해결 능력과 공감 능력 평가'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
      ],
    },
  ],
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

const MicBtn = ({ recording, onClick }: { recording: boolean; onClick: () => void }) => (
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

const SubmitBtn = ({ label, onClick, disabled, accentColor }: { label: string; onClick: () => void; disabled: boolean; accentColor?: string }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`h-9 px-4 rounded-lg text-[12px] font-bold flex-shrink-0 transition-all ${
      !disabled
        ? accentColor === 'emerald'
          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_2px_8px_rgba(5,150,105,0.2)]'
          : 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
        : 'bg-gray-200 text-ink-muted cursor-not-allowed'
    }`}
  >
    {label}
  </button>
)

export default function Presentation() {
  const [step, setStep] = useState<'school' | 'list' | 'solve'>('school')
  const [selSchool, setSelSchool] = useState<any>(null)
  const [selTrack, setSelTrack] = useState<any>(null)
  const [selYear, setSelYear] = useState(2025)
  const [selProblem, setSelProblem] = useState<any>(null)
  const [showTrackModal, setShowTrackModal] = useState(false)
  const [showEduModal, setShowEduModal] = useState(false)
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

  const isEdu = selSchool?.type === 'edu'
  const accent = isEdu ? 'emerald' : 'blue'

  const problemKey = selSchool
    ? isEdu ? `${selSchool.id}-${selYear}`
      : selTrack ? `${selSchool.id}-${selTrack.id}-${selYear}` : ''
    : ''
  const curProblems = problems[problemKey] || []

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

  const SchoolLogo = ({ school, size = 48 }: { school: any; size?: number }) => (
    <div
      style={{ width: size, height: size, background: school.bg, borderColor: school.color + '30' }}
      className="rounded-full overflow-hidden border flex items-center justify-center flex-shrink-0"
    >
      {school.logo ? (
        <img src={school.logo} alt={school.name} className="w-full h-full object-cover" />
      ) : (
        <span style={{ color: school.color, fontSize: size * 0.35 }} className="font-extrabold">
          {(school.shortName || school.name)[0]}
        </span>
      )}
    </div>
  )

  // ═══════════════════════════════════════════════
  // 1. 학교 선택 화면
  // ═══════════════════════════════════════════════
  if (step === 'school') {
    return (
      <div className="px-7 py-6 font-sans text-ink">
        <div className="text-[18px] font-bold text-ink tracking-tight mb-1">SKY·교대 제시문 면접</div>

        <div className="bg-gradient-to-br from-brand-high to-indigo-500 rounded-2xl px-7 py-6 mb-7 mt-4 flex items-center justify-between shadow-[0_8px_24px_rgba(37,99,235,0.2)]">
          <div>
            <div className="text-[20px] font-extrabold text-white mb-1.5 tracking-tight">합격을 노리는 최상위권 학생들을 위해!</div>
            <div className="text-[13px] text-white/90 font-medium">최근 9개년 기출을 분석한 맞춤형 문제로 실전 같은 제시문 면접을 경험하세요.</div>
          </div>
          <div className="text-5xl">🎓</div>
        </div>

        <div className="text-[14px] font-bold text-ink mb-3.5">학교 선택하기</div>

        <div className="grid grid-cols-4 gap-3.5 max-lg:grid-cols-2 max-md:grid-cols-1">
          {SKY_SCHOOLS.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelSchool(s); setSelTrack(null); setShowTrackModal(true) }}
              style={{ background: s.bg, borderColor: s.color + '30' }}
              className="border rounded-2xl p-7 text-center hover:shadow-[0_8px_24px_rgba(37,99,235,0.12)] hover:-translate-y-0.5 transition-all"
            >
              <div className="flex justify-center mb-3.5">
                <SchoolLogo school={s} size={64} />
              </div>
              <div style={{ color: s.color }} className="text-[15px] font-extrabold mb-3">{s.name}</div>
              <div
                style={{ color: s.color, borderColor: s.color }}
                className="inline-block px-5 py-1.5 bg-white border rounded-lg text-[13px] font-bold"
              >
                선택하기
              </div>
            </button>
          ))}

          <button
            onClick={() => setShowEduModal(true)}
            className="bg-emerald-50 border border-emerald-200 rounded-2xl p-7 text-center hover:shadow-[0_8px_24px_rgba(5,150,105,0.12)] hover:-translate-y-0.5 transition-all"
          >
            <div className="flex justify-center mb-3.5">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <img src={EDU_LOGO} alt="교육대학교" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="text-[15px] font-extrabold text-emerald-700 mb-3">교육대학교</div>
            <div className="inline-block px-5 py-1.5 bg-white text-emerald-700 border border-emerald-600 rounded-lg text-[13px] font-bold">
              선택하기
            </div>
          </button>
        </div>

        {/* 교대 선택 모달 */}
        {showEduModal && (
          <div
            onClick={() => setShowEduModal(false)}
            className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-7 w-full max-w-[560px] max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-[16px] font-bold text-ink tracking-tight">교육대학교 선택</div>
                <button onClick={() => setShowEduModal(false)} className="text-ink-secondary text-lg hover:text-ink">✕</button>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-[12px] text-emerald-800 mb-5 leading-relaxed">
                💡 교대 제시문 면접은 <span className="font-bold">교직적성·인성 면접</span>으로, 학교를 선택하면 바로 문제 목록으로 이동합니다.
              </div>

              <div className="grid grid-cols-3 gap-2.5 max-md:grid-cols-2">
                {EDUCATION_SCHOOLS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelSchool(s); setShowEduModal(false); setStep('list') }}
                    style={{ background: s.bg, borderColor: s.color + '30' }}
                    className="border rounded-xl p-3.5 text-center hover:-translate-y-0.5 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-center mb-2">
                      <SchoolLogo school={s} size={44} />
                    </div>
                    <div style={{ color: s.color }} className="text-[12px] font-extrabold">{s.shortName}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 계열 선택 모달 */}
        {showTrackModal && (
          <div
            onClick={() => setShowTrackModal(false)}
            className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-7 w-full max-w-[500px] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-[16px] font-bold text-ink tracking-tight">계열 선택</div>
                <button onClick={() => setShowTrackModal(false)} className="text-ink-secondary text-lg hover:text-ink">✕</button>
              </div>

              <div className="bg-brand-high-pale border border-brand-high-light rounded-xl px-4 py-3 text-[13px] text-brand-high-dark leading-relaxed mb-5">
                SKY 면접과 유사한 <span className="font-bold">제시문 기반 면접 문제</span>를 풀어보는 시간이에요!<br />
                전공과 관련된 계열을 골라야 문제를 만들 수 있어요.
              </div>

              <div className="flex flex-col gap-2 mb-5">
                {(selSchool?.id === 1 ? TRACKS_SNU : TRACKS_SKY).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelTrack(t)}
                    className={`flex items-center gap-3 px-4 py-3.5 border rounded-xl transition-all ${
                      selTrack?.id === t.id
                        ? 'border-brand-high bg-brand-high-pale'
                        : 'border-line bg-white hover:border-brand-high-light'
                    }`}
                  >
                    <div className="text-2xl">{t.icon}</div>
                    <div className="text-left flex-1">
                      <div className="text-[14px] font-bold text-ink">{t.name}</div>
                      <div className="text-[11px] text-ink-secondary font-medium">{t.sub}</div>
                    </div>
                    {selTrack?.id === t.id && (
                      <div className="w-5 h-5 rounded-full bg-brand-high flex items-center justify-center text-white text-[11px] font-bold">✓</div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => { if (selTrack) { setShowTrackModal(false); setStep('list') } }}
                disabled={!selTrack}
                className={`w-full h-11 rounded-xl text-[14px] font-bold transition-all ${
                  selTrack
                    ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
                    : 'bg-gray-200 text-ink-muted cursor-not-allowed'
                }`}
              >
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════
  // 2. 문제 목록 화면
  // ═══════════════════════════════════════════════
  if (step === 'list') {
    return (
      <div className="px-7 py-6 font-sans text-ink">
        <div className="flex items-center gap-2.5 mb-5">
          <button
            onClick={() => { setStep('school'); setSelTrack(null); setSelSchool(null) }}
            className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-ink-secondary hover:bg-gray-50 transition-all"
          >
            ←
          </button>
          <div className="text-[16px] font-bold text-ink tracking-tight">SKY·교대 제시문 면접</div>
        </div>

        <div className={`${isEdu ? 'bg-emerald-50 border-emerald-200' : 'bg-brand-high-pale border-brand-high-light'} border rounded-2xl px-5 py-4 mb-5 flex items-center gap-3.5`}>
          <SchoolLogo school={selSchool} size={48} />
          <div>
            <div className="text-[16px] font-extrabold text-ink tracking-tight">
              {selYear}년 {selSchool?.name} {isEdu ? '' : `${selTrack?.name} 계열`}
            </div>
            <div className="text-[12px] text-ink-secondary mt-0.5 font-medium">
              {isEdu ? '교직적성·인성 면접' : selTrack?.sub}
            </div>
          </div>
        </div>

        {/* 연도 탭 */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {YEARS.map(y => (
            <button
              key={y}
              onClick={() => setSelYear(y)}
              className={`px-4 py-1.5 rounded-full text-[13px] border font-semibold whitespace-nowrap transition-all ${
                selYear === y
                  ? isEdu
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-brand-high text-white border-brand-high'
                  : 'bg-white text-ink-secondary border-line hover:border-brand-high-light'
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        <div className="text-[13px] text-ink-secondary mb-3.5 font-medium">총 {curProblems.length}문제</div>

        {curProblems.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">
            <div className="text-4xl mb-3">📄</div>
            <div className="text-[14px] font-medium">해당 연도의 문제가 없어요.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
            {curProblems.map((p: any) => {
              const status = getProblemStatus(p)
              const statusStyle =
                status === 'done' ? { bg: 'bg-emerald-50', emoji: '✅' }
                : status === 'doing' ? { bg: 'bg-amber-50', emoji: '📝' }
                : { bg: 'bg-gray-100', emoji: '💡' }

              return (
                <div
                  key={p.id}
                  className="bg-white border border-line rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] transition-all"
                >
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <div className={`w-10 h-10 rounded-full ${statusStyle.bg} flex items-center justify-center text-lg`}>
                      {statusStyle.emoji}
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-ink tracking-tight">{p.title}</div>
                      <div className="text-[11px] text-ink-secondary font-medium">총 {p.totalQ}문항 | {p.subject}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelProblem(p); setStep('solve') }}
                      className={`flex-1 h-9 rounded-lg text-[13px] font-bold transition-all text-white shadow-sm ${
                        status === 'done'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : status === 'doing'
                            ? 'bg-amber-500 hover:bg-amber-600'
                            : isEdu
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : 'bg-brand-high hover:bg-brand-high-dark'
                      }`}
                    >
                      {status === 'done' ? '다시 풀기' : status === 'doing' ? '이어서 풀기' : '문제 풀기'}
                    </button>
                    <button className="flex-1 h-9 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-all">
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
  }

  // ═══════════════════════════════════════════════
  // 3. 문제 풀기 화면
  // ═══════════════════════════════════════════════
  if (step === 'solve' && selProblem) {
    const accentBgCls = isEdu ? 'bg-emerald-50' : 'bg-brand-high-pale'
    const accentBorderCls = isEdu ? 'border-emerald-200' : 'border-brand-high-light'
    const accentTextCls = isEdu ? 'text-emerald-700' : 'text-brand-high-dark'

    return (
      <div
        ref={containerRef}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        className="flex flex-col h-full overflow-hidden font-sans text-ink"
      >
        {/* 상단 헤더 */}
        <div className="h-12 bg-white border-b border-line flex items-center justify-between px-6 flex-shrink-0">
          <button
            onClick={() => setStep('list')}
            className="text-[13px] text-ink-secondary hover:text-ink font-semibold transition-colors"
          >
            ← 목록으로
          </button>
          <div className="text-[13px] font-bold text-ink tracking-tight">
            {selYear}학년도 {selSchool?.shortName || selSchool?.name} {isEdu ? '교직적성' : selTrack?.name} · {selProblem.title}
          </div>
          <div className="flex items-center gap-2">
            <SchoolLogo school={selSchool} size={24} />
            <span className="text-[12px] text-ink-secondary font-semibold">{selSchool?.shortName || selSchool?.name}</span>
          </div>
        </div>

        {/* 좌우 분할 */}
        <div className="flex flex-1 overflow-hidden">

          {/* 왼쪽: 제시문 */}
          <div
            style={{ width: `${leftWidth}%` }}
            className="border-r border-line overflow-y-auto p-6 bg-gray-50 flex-shrink-0"
          >
            <div className="text-[11px] font-bold text-ink-muted mb-2.5 tracking-widest uppercase">제시문</div>
            {selProblem.pdfUrl ? (
              <embed src={selProblem.pdfUrl} type="application/pdf" width="100%" className="min-h-[600px] rounded-lg" />
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
            className={`w-1.5 bg-line cursor-col-resize flex-shrink-0 flex items-center justify-center hover:bg-brand-high transition-colors`}
          >
            <div className="w-0.5 h-10 bg-ink-muted rounded-full" />
          </div>

          {/* 오른쪽: 답변 */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8 bg-gray-50">
            {selProblem.questions.map((q: any, qi: number) => {
              const qKey = `${selProblem.id}-${q.id}`
              const qStep = getQStep(q)

              return (
                <div
                  key={q.id}
                  className={qi < selProblem.questions.length - 1 ? 'border-b border-line-light pb-8' : ''}
                >
                  {/* 질문 */}
                  <div className={`${accentBgCls} border ${accentBorderCls} rounded-xl px-4 py-3 mb-2.5`}>
                    <div className={`text-[11px] font-bold ${accentTextCls} mb-1`}>문제 {qi + 1}.</div>
                    <div className="text-[13px] font-semibold leading-relaxed text-ink">{q.text}</div>
                  </div>

                  {/* 5단계 스테퍼 */}
                  <div className="flex items-start mb-4">
                    {STEP_LABELS.map((label, i) => {
                      const stepNum = i + 1
                      const isDone = stepNum < qStep
                      const isOn = stepNum === qStep
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                          {i < STEP_LABELS.length - 1 && (
                            <div className={`absolute top-3 left-[55%] w-[90%] h-[1.5px] z-0 ${isDone ? 'bg-emerald-500' : 'bg-line'}`} />
                          )}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 border-2 transition-all ${
                            isDone
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : isOn
                                ? isEdu
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-brand-high text-white border-brand-high shadow-[0_2px_8px_rgba(37,99,235,0.3)]'
                                : 'bg-gray-100 text-ink-muted border-line'
                          }`}>
                            {isDone ? '✓' : stepNum}
                          </div>
                          <div className={`text-[10px] font-semibold whitespace-nowrap ${
                            isDone ? 'text-emerald-600' : isOn ? accentTextCls : 'text-ink-muted'
                          }`}>
                            {label}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 질문 의도 (접기) */}
                  <div className="mb-3">
                    <button
                      onClick={() => setOpenIntents(p => ({ ...p, [qKey]: !p[qKey] }))}
                      className={`w-full flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all ${
                        openIntents[qKey]
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-gray-50 border-line'
                      }`}
                    >
                      <span className={`text-[11px] font-semibold ${openIntents[qKey] ? 'text-amber-700' : 'text-ink-secondary'}`}>
                        💡 질문 의도 파악
                      </span>
                      <span className="ml-auto text-[10px] text-ink-muted">{openIntents[qKey] ? '▲' : '▼'}</span>
                    </button>
                    {openIntents[qKey] && (
                      <div className="bg-amber-50/50 border border-amber-200 border-t-0 rounded-b-lg px-4 py-2.5 -mt-px">
                        <ul className="pl-4 m-0 list-disc">
                          {(q.intent || []).map((item: string, idx: number) => (
                            <li key={idx} className="text-[12px] text-amber-800 leading-relaxed">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Step 1 */}
                  <div className="bg-white border border-line rounded-xl px-4 py-3 mb-2.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${qStep > 1 ? 'bg-emerald-600' : 'bg-ink-secondary'}`}>
                        Step 1
                      </span>
                      <span className="text-[11px] font-semibold text-ink-secondary">내 첫 답변</span>
                    </div>
                    {q.answer && !editingStep1[qKey] ? (
                      <div>
                        <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2.5 text-[13px] text-ink leading-relaxed mb-2">
                          {q.answer}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => { setEditingStep1(p => ({ ...p, [qKey]: true })); setAnswers(p => ({ ...p, [qKey]: q.answer })) }}
                            className="text-[11px] font-semibold text-ink-secondary bg-white border border-line rounded-md px-3 py-1 hover:bg-gray-50 transition-all"
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
                            <span className="text-[12px] text-red-600 font-bold">녹음 중...</span>
                          </div>
                        )}
                        <textarea
                          value={answers[qKey] || ''}
                          onChange={e => setAnswers(p => ({ ...p, [qKey]: e.target.value }))}
                          placeholder="답변을 작성하거나 마이크로 녹음해주세요..."
                          rows={4}
                          className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none resize-y leading-relaxed focus:border-brand-high transition-colors font-sans"
                        />
                        <div className="flex gap-2 mt-2 justify-end">
                          {editingStep1[qKey] && (
                            <button
                              onClick={() => { setEditingStep1(p => ({ ...p, [qKey]: false })); setAnswers(p => ({ ...p, [qKey]: '' })) }}
                              className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-all"
                            >
                              취소
                            </button>
                          )}
                          <MicBtn recording={recordings[qKey] || false} onClick={() => setRecordings(p => ({ ...p, [qKey]: !p[qKey] }))} />
                          <SubmitBtn
                            label={editingStep1[qKey] ? '수정 완료' : '답변 제출'}
                            onClick={() => submitAnswer(selProblem.id, q)}
                            disabled={!(answers[qKey] || '').trim()}
                            accentColor={accent}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Step 2 */}
                  {q.answer && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3 mb-2.5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${
                          qStep > 2 ? 'bg-emerald-600' : isEdu ? 'bg-emerald-600' : 'bg-brand-high'
                        }`}>
                          Step 2
                        </span>
                        <span className="text-[11px] font-semibold text-ink-secondary">선생님 1차 피드백</span>
                      </div>
                      {q.teacherFeedback ? (
                        <div className={`${accentBgCls} border ${accentBorderCls} rounded-lg px-3 py-2.5 text-[13px] ${accentTextCls} leading-relaxed`}>
                          {q.teacherFeedback}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                          선생님 피드백을 기다리는 중이에요 ✏️
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3 */}
                  {q.teacherFeedback && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3 mb-2.5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${qStep > 3 ? 'bg-emerald-600' : 'bg-ink-secondary'}`}>
                          Step 3
                        </span>
                        <span className="text-[11px] font-semibold text-ink-secondary">업그레이드 답변</span>
                      </div>
                      {q.upgradedAnswer && !editingStep3[qKey] ? (
                        <div>
                          <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2.5 text-[13px] text-ink leading-relaxed mb-2">
                            {q.upgradedAnswer}
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => { setEditingStep3(p => ({ ...p, [qKey]: true })); setUpgradedAnswers(p => ({ ...p, [qKey]: q.upgradedAnswer })) }}
                              className="text-[11px] font-semibold text-ink-secondary bg-white border border-line rounded-md px-3 py-1 hover:bg-gray-50 transition-all"
                            >
                              ✏️ 수정
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-800 font-medium mb-2">
                            💡 선생님 피드백을 반영해서 답변을 업그레이드해보세요!
                          </div>
                          {recordings[`${qKey}-up`] && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-[12px] text-red-600 font-bold">녹음 중...</span>
                            </div>
                          )}
                          <textarea
                            value={upgradedAnswers[qKey] || ''}
                            onChange={e => setUpgradedAnswers(p => ({ ...p, [qKey]: e.target.value }))}
                            placeholder="피드백을 반영한 업그레이드 답변을 작성하거나 마이크로 녹음해주세요..."
                            rows={4}
                            className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none resize-y leading-relaxed focus:border-brand-high transition-colors font-sans"
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            {editingStep3[qKey] && (
                              <button
                                onClick={() => { setEditingStep3(p => ({ ...p, [qKey]: false })); setUpgradedAnswers(p => ({ ...p, [qKey]: '' })) }}
                                className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-all"
                              >
                                취소
                              </button>
                            )}
                            <MicBtn recording={recordings[`${qKey}-up`] || false} onClick={() => setRecordings(p => ({ ...p, [`${qKey}-up`]: !p[`${qKey}-up`] }))} />
                            <SubmitBtn
                              label={editingStep3[qKey] ? '수정 완료' : '업그레이드 제출'}
                              onClick={() => submitUpgrade(selProblem.id, q)}
                              disabled={!(upgradedAnswers[qKey] || '').trim()}
                              accentColor={accent}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 4 */}
                  {q.upgradedAnswer && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3 mb-2.5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">Step 4</span>
                        <span className="text-[11px] font-semibold text-ink-secondary">선생님 최종 피드백</span>
                      </div>
                      {q.finalFeedback ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-[13px] text-emerald-900 leading-relaxed">
                          {q.finalFeedback}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                          선생님 최종 피드백을 기다리는 중이에요 ✏️
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 5 - 꼬리질문 */}
                  {q.finalFeedback && q.tails && q.tails.length > 0 && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-[10px] font-bold text-white bg-brand-high px-2 py-0.5 rounded-full">Step 5</span>
                        <span className="text-[11px] font-semibold text-ink-secondary">꼬리질문</span>
                      </div>
                      {q.tails.map((tail: any, ti: number) => {
                        const tailKey = `${qKey}-tail-${ti}`
                        return (
                          <div key={ti} className={ti < q.tails.length - 1 ? 'mb-4' : ''}>
                            <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 border border-line-light rounded-lg mb-2 text-[12px] text-ink leading-relaxed">
                              <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">
                                꼬리 {ti + 1}
                              </span>
                              <span className="leading-relaxed">{typeof tail === 'string' ? tail : tail.text}</span>
                            </div>
                            {recordings[tailKey] && (
                              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-1.5 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[12px] text-red-600 font-bold">녹음 중...</span>
                              </div>
                            )}
                            {tail.answer ? (
                              <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2.5 text-[13px] text-ink leading-relaxed">
                                {tail.answer}
                              </div>
                            ) : (
                              <div className="bg-gray-50 rounded-lg p-2.5 border border-line-light">
                                <textarea
                                  value={tailAnswers[tailKey] || ''}
                                  onChange={e => setTailAnswers(p => ({ ...p, [tailKey]: e.target.value }))}
                                  placeholder="꼬리질문에 대한 답변을 작성하거나 마이크로 녹음해주세요..."
                                  rows={2}
                                  className="w-full border border-line rounded-lg px-2.5 py-2 text-[12px] outline-none resize-none leading-relaxed bg-white focus:border-brand-high transition-colors font-sans"
                                />
                                <div className="flex gap-2 mt-2 justify-end">
                                  <MicBtn recording={recordings[tailKey] || false} onClick={() => setRecordings(p => ({ ...p, [tailKey]: !p[tailKey] }))} />
                                  <button
                                    onClick={() => submitTail(selProblem.id, q, ti)}
                                    disabled={!(tailAnswers[tailKey] || '').trim()}
                                    className={`h-9 px-4 rounded-lg text-[12px] font-bold transition-all ${
                                      (tailAnswers[tailKey] || '').trim()
                                        ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
                                        : 'bg-gray-200 text-ink-muted cursor-not-allowed'
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
  }

  return null
}