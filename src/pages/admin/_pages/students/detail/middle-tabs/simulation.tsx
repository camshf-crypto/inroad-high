import { useState } from 'react'

// 🌱 중등 초록 테마
const THEME = {
  accent: '#059669',
  accentDark: '#065F46',
  accentBg: '#ECFDF5',
  accentBorder: '#6EE7B7',
  accentShadow: 'rgba(16, 185, 129, 0.15)',
  gradient: 'linear-gradient(135deg, #065F46, #10B981)',
}

const INIT_SIMULATIONS = [
  {
    id: 1,
    date: '2025-04-14',
    school: '인천하늘고',
    type: '기출문제',
    tags: ['기출문제', '꼬리질문ON'],
    duration: '04:32',
    status: '완료',
    questions: [
      { num: 1, text: '인천하늘고에 지원한 구체적인 이유를 말해보세요.', answered: true },
      { num: 2, text: '자기주도학습 경험을 구체적으로 말해보세요.', answered: true },
      { num: 3, text: '입학 후 어떤 활동을 통해 꿈을 키워나갈 계획인가요?', answered: true },
      { num: 4, text: '배려나 나눔을 실천한 경험을 말해보세요.', answered: true },
      { num: 5, text: '졸업 후 진로 계획을 구체적으로 말해보세요.', answered: true },
    ],
    transcript: '인천하늘고에 지원한 이유는 자기주도학습 전형이 저와 맞는다고 생각했기 때문입니다. 저는 중학교 3년 동안 매일 아침 30분씩 독서를 하며 스스로 학습하는 습관을 길러왔습니다. 음... 그래서 이런 학습 방식이 인천하늘고의 교육 철학과 잘 맞는다고 생각합니다.',
    aiAnalysis: {
      speed: { mine: 135, avg: 170, comment: '말의 속도가 평균보다 약간 느려요. 자신감 있게 말하는 연습을 해보세요.' },
      habits: ['음...', '그래서', '어...'],
      pause: { level: '양호', comment: '답변 중간 공백이 거의 없었어요. 좋은 흐름이에요!' },
      structure: '지원 동기를 명확히 밝혔고 본인 경험과 연결한 점이 좋습니다. 다만 "학교 교육 철학"에 대한 구체적 언급이 부족해요.',
    },
    teacherFeedback: '',
  },
  {
    id: 2,
    date: '2025-04-10',
    school: '인천하늘고',
    type: '자소서 예상질문',
    tags: ['자소서', '꼬리질문OFF'],
    duration: '03:18',
    status: '완료',
    questions: [
      { num: 1, text: '자소서에서 강조한 독서 활동에 대해 자세히 말해주세요.', answered: true },
      { num: 2, text: '가장 인상 깊었던 책과 그 이유는?', answered: true },
      { num: 3, text: '독서가 본인의 진로에 어떤 영향을 미쳤나요?', answered: true },
    ],
    transcript: '제 자소서에서 가장 강조한 부분은 3년간의 독서 활동입니다. 매달 2권씩 읽으며 독서 노트를 작성했고, 특히 과학 분야 책에 관심이 많았습니다.',
    aiAnalysis: {
      speed: { mine: 158, avg: 170, comment: '말의 속도가 적절해요!' },
      habits: ['그리고', '음...'],
      pause: { level: '보통', comment: '중간에 공백이 몇 번 있었어요.' },
      structure: '독서 활동을 구체적인 숫자(3년, 매달 2권)로 제시해서 좋아요. 본인이 얻은 통찰을 한 문장 더 추가하면 좋겠어요.',
    },
    teacherFeedback: '답변 구조가 좋아요! 더 구체적인 사례를 추가해보세요.',
  },
  {
    id: 3,
    date: '2025-04-05',
    school: '대원외고',
    type: '생기부 예상질문',
    tags: ['생기부', '꼬리질문ON'],
    duration: '02:45',
    status: '완료',
    questions: [
      { num: 1, text: '생기부에 기록된 영어 동아리 활동에 대해 말해보세요.', answered: true },
      { num: 2, text: '동아리에서 맡은 역할과 배운 점은?', answered: true },
    ],
    transcript: '영어 동아리에서 2학년 때 부장을 맡았습니다. 주 1회 원서 읽기 모임을 운영하며 친구들과 함께 토론했어요.',
    aiAnalysis: null,
    teacherFeedback: '',
  },
]

const AI_FEEDBACK_SUGGESTIONS = [
  '답변 구조가 체계적이에요! "결론 → 근거 → 사례" 순서로 말하는 습관이 잘 잡혀있어요. 다만 "음..." 같은 습관어를 줄이면 더 전문적으로 들릴 거예요.',
  '경험과 진로를 연결한 점이 좋아요! 면접관은 이런 연결성을 중요하게 봐요. 다음엔 답변 시간을 40초 이내로 조금 더 압축해보세요.',
  '전반적으로 잘했지만 "학교 교육 철학"과의 연결이 약해요. 학교 홈페이지에서 찾은 구체적 내용을 1-2개 언급하면 훨씬 강력한 답변이 돼요.',
]

export default function MiddleSimulationTab({ student }: { student: any }) {
  const [simulations, setSimulations] = useState(INIT_SIMULATIONS)
  const [selSim, setSelSim] = useState<any>(INIT_SIMULATIONS[0])
  const [feedback, setFeedback] = useState(INIT_SIMULATIONS[0]?.teacherFeedback || '')
  const [isPlaying, setIsPlaying] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [filterType, setFilterType] = useState<string>('all')

  const handleSelect = (sim: any) => {
    setSelSim(sim)
    setFeedback(sim.teacherFeedback || '')
    setIsPlaying(false)
  }

  const deleteSim = (id: number) => {
    setSimulations(prev => prev.filter(s => s.id !== id))
    if (selSim?.id === id) setSelSim(null)
    setDeleteTarget(null)
  }

  const sendFeedback = () => {
    if (!feedback.trim() || !selSim) return
    const next = simulations.map(s =>
      s.id === selSim.id ? { ...s, teacherFeedback: feedback } : s
    )
    setSimulations(next)
    setSelSim({ ...selSim, teacherFeedback: feedback })
  }

  const editFeedback = () => {
    setFeedback(selSim.teacherFeedback)
    const next = simulations.map(s =>
      s.id === selSim.id ? { ...s, teacherFeedback: '' } : s
    )
    setSimulations(next)
    setSelSim({ ...selSim, teacherFeedback: '' })
  }

  const openAiModal = () => {
    setShowAiModal(true)
    setAiLoading(true)
    setAiSuggestions([])
    setTimeout(() => {
      setAiSuggestions(AI_FEEDBACK_SUGGESTIONS)
      setAiLoading(false)
    }, 1200)
  }

  const applyAiSuggestion = (s: string) => {
    setFeedback(s)
    setShowAiModal(false)
  }

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
  }
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#E5E7EB'
    e.target.style.boxShadow = 'none'
  }

  const filteredSims = filterType === 'all'
    ? simulations
    : simulations.filter(s => s.type === filterType)

  const completedCount = simulations.filter(s => s.teacherFeedback).length
  const pendingCount = simulations.filter(s => !s.teacherFeedback).length

  return (
    <div className="flex gap-4 h-full overflow-hidden">

      {/* ==================== 왼쪽 목록 ==================== */}
      <div className="w-[340px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">

        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-line flex-shrink-0">
          <div className="text-[14px] font-extrabold text-ink tracking-tight">🎬 시뮬레이션 기록</div>
          <div className="text-[11px] font-medium text-ink-secondary mt-1 flex gap-2 flex-wrap">
            <span>총 <span className="font-bold" style={{ color: THEME.accent }}>{simulations.length}회</span></span>
            <span>·</span>
            <span>피드백 <span className="font-bold" style={{ color: THEME.accent }}>{completedCount}</span></span>
            <span>·</span>
            <span>대기 <span className="font-bold text-amber-600">{pendingCount}</span></span>
          </div>
        </div>

        {/* 필터 */}
        <div className="px-3 py-2.5 border-b border-line flex-shrink-0">
          <div className="flex gap-1 flex-wrap">
            {['all', '기출문제', '자소서 예상질문', '생기부 예상질문'].map(t => {
              const isActive = filterType === t
              const label = t === 'all' ? '전체' : t
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                  style={{
                    borderColor: isActive ? THEME.accent : '#E5E7EB',
                    background: isActive ? THEME.accentBg : '#fff',
                    color: isActive ? THEME.accentDark : '#6B7280',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 리스트 */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {filteredSims.length === 0 ? (
            <div className="text-center py-10 text-ink-muted">
              <div className="text-3xl mb-2">🎬</div>
              <div className="text-[12px] font-medium">시뮬레이션 기록이 없어요.</div>
            </div>
          ) : filteredSims.map((sim, i) => {
            const isSelected = selSim?.id === sim.id
            const hasFeedback = !!sim.teacherFeedback

            return (
              <div
                key={sim.id}
                onClick={() => handleSelect(sim)}
                className="rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all relative"
                style={{
                  border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                  background: isSelected ? THEME.accentBg : '#fff',
                  boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                }}
              >
                {/* X 버튼 */}
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(sim.id) }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-[10px] text-ink-secondary transition-colors"
                >
                  ✕
                </button>

                <div className="flex items-center justify-between mb-1.5 pr-6">
                  <span className="text-[11px] font-bold text-ink-secondary">#{i + 1} · 📅 {sim.date}</span>
                </div>

                <div className="flex items-center gap-1 mb-1">
                  <span className="text-base">🎓</span>
                  <div
                    className="text-[13px] font-extrabold tracking-tight"
                    style={{ color: isSelected ? THEME.accentDark : '#1a1a1a' }}
                  >
                    {sim.school}
                  </div>
                </div>

                <div className="text-[11px] font-semibold text-ink-secondary mb-2">{sim.type}</div>

                <div className="flex gap-1 flex-wrap">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: THEME.accent, background: THEME.accentBg }}
                  >
                    ⏱ {sim.duration}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: THEME.accent, background: THEME.accentBg }}
                  >
                    📋 {sim.questions.length}문항
                  </span>
                  {hasFeedback ? (
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      ✓ 피드백완료
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      ⏳ 피드백대기
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ==================== 오른쪽 상세 ==================== */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
        {!selSim ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
            <div className="text-4xl">🎬</div>
            <div className="text-[14px] font-bold text-ink-secondary">시뮬레이션을 선택해주세요</div>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-line flex-shrink-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                >
                  🎓 {selSim.school}
                </span>
                <span className="text-[11px] font-semibold text-ink-secondary bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {selSim.type}
                </span>
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full ml-auto"
                  style={{
                    background: selSim.teacherFeedback ? '#ECFDF5' : '#FFF7ED',
                    color: selSim.teacherFeedback ? '#059669' : '#D97706',
                    border: `1px solid ${selSim.teacherFeedback ? '#6EE7B7' : '#FDBA74'}60`,
                  }}
                >
                  {selSim.teacherFeedback ? '✓ 피드백완료' : '⏳ 피드백대기'}
                </span>
              </div>
              <div className="text-[16px] font-extrabold text-ink tracking-tight">
                🎬 시뮬레이션 #{selSim.id}
              </div>
              <div className="text-[11px] font-semibold text-ink-secondary mt-0.5">
                📅 {selSim.date} · ⏱ {selSim.duration} · 📋 {selSim.questions.length}문항
              </div>
            </div>

            {/* 바디 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

              {/* 녹음 플레이어 */}
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">
                  🎙️ 녹음 파일
                </div>
                <div
                  className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                >
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-10 h-10 rounded-full text-white flex items-center justify-center text-[14px] flex-shrink-0 transition-all hover:scale-105"
                    style={{
                      background: THEME.accent,
                      boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                    }}
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <div className="flex-1">
                    <div className="h-1.5 bg-white rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: isPlaying ? '40%' : '0%',
                          background: THEME.accent,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-semibold text-ink-secondary">
                      <span>{isPlaying ? '01:48' : '00:00'}</span>
                      <span>{selSim.duration}</span>
                    </div>
                  </div>
                </div>

                {/* 음성 변환 텍스트 */}
                <div className="mt-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                    📝 음성 → 텍스트 변환
                  </div>
                  <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8]">
                    {selSim.transcript}
                  </div>
                </div>
              </div>

              {/* 답변한 질문 리스트 */}
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">
                  📋 답변한 질문 ({selSim.questions.length}개)
                </div>
                <div className="flex flex-col gap-1.5">
                  {selSim.questions.map((q: any) => (
                    <div
                      key={q.num}
                      className="flex gap-2 items-start px-3 py-2 rounded-lg bg-gray-50 border border-line"
                    >
                      <span
                        className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{ color: '#fff', background: THEME.accent }}
                      >
                        Q{q.num}
                      </span>
                      <span className="text-[12.5px] font-medium text-ink leading-[1.6] flex-1">
                        {q.text}
                      </span>
                      {q.answered && (
                        <span className="text-[10px] text-green-600">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI 분석 */}
              {selSim.aiAnalysis && (
                <div className="bg-white border border-line rounded-xl px-5 py-4">
                  <div className="text-[12px] font-extrabold text-ink mb-3 tracking-tight">
                    ✨ AI 분석 결과
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                    {/* 말의 빠르기 */}
                    <div className="bg-gray-50 border border-line rounded-xl px-3.5 py-3">
                      <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                        🗣️ 말의 빠르기
                      </div>
                      <div className="flex gap-3 mb-2">
                        <div>
                          <div className="text-[10px] font-medium text-ink-muted mb-0.5">내 속도</div>
                          <div
                            className="text-[20px] font-extrabold tracking-tight leading-none"
                            style={{ color: selSim.aiAnalysis.speed.mine < 120 ? '#DC2626' : '#059669' }}
                          >
                            {selSim.aiAnalysis.speed.mine}
                            <span className="text-[10px] ml-0.5">wpm</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-medium text-ink-muted mb-0.5">평균</div>
                          <div className="text-[20px] font-extrabold text-ink-secondary tracking-tight leading-none">
                            {selSim.aiAnalysis.speed.avg}
                            <span className="text-[10px] ml-0.5">wpm</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-ink-secondary leading-[1.5]">
                        {selSim.aiAnalysis.speed.comment}
                      </div>
                    </div>

                    {/* 말의 공백 */}
                    <div className="bg-gray-50 border border-line rounded-xl px-3.5 py-3">
                      <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                        ⏸ 말의 공백
                      </div>
                      <div
                        className="text-[20px] font-extrabold tracking-tight leading-none mb-1.5"
                        style={{ color: selSim.aiAnalysis.pause.level === '양호' ? '#059669' : '#D97706' }}
                      >
                        {selSim.aiAnalysis.pause.level}
                      </div>
                      <div className="text-[11px] font-medium text-ink-secondary leading-[1.5]">
                        {selSim.aiAnalysis.pause.comment}
                      </div>
                    </div>
                  </div>

                  {/* 습관어 */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-2.5">
                    <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">
                      ⚠️ 습관어
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {selSim.aiAnalysis.habits.map((h: string, i: number) => (
                        <span
                          key={i}
                          className="text-[12px] font-bold text-amber-800 bg-yellow-100 border border-yellow-300 px-2.5 py-1 rounded-full"
                        >
                          "{h}"
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 답변 구성 분석 */}
                  <div
                    className="rounded-xl px-4 py-3"
                    style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                  >
                    <div
                      className="text-[11px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: THEME.accent }}
                    >
                      🎯 답변 구성 분석
                    </div>
                    <div
                      className="text-[13px] font-medium leading-[1.7]"
                      style={{ color: THEME.accentDark }}
                    >
                      {selSim.aiAnalysis.structure}
                    </div>
                  </div>
                </div>
              )}

              {/* 선생님 피드백 */}
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                    💬 선생님 피드백
                  </div>
                  {!selSim.teacherFeedback && (
                    <button
                      onClick={openAiModal}
                      className="px-2.5 py-1 text-white rounded-md text-[11px] font-bold transition-all"
                      style={{ background: THEME.accent, boxShadow: `0 2px 6px ${THEME.accentShadow}` }}
                    >
                      ✨ AI 피드백 제안
                    </button>
                  )}
                </div>

                {selSim.teacherFeedback ? (
                  <>
                    <div
                      className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8] mb-2"
                      style={{
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}60`,
                        color: THEME.accentDark,
                      }}
                    >
                      {selSim.teacherFeedback}
                    </div>
                    <button
                      onClick={editFeedback}
                      className="px-3 py-1.5 bg-white text-ink-secondary border border-line rounded-md text-[11px] font-bold hover:bg-gray-50 transition-colors"
                    >
                      ✏️ 수정하기
                    </button>
                  </>
                ) : (
                  <>
                    <textarea
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder="AI 분석 결과를 참고해서 피드백을 작성해주세요..."
                      rows={5}
                      className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                      onFocus={handleTextareaFocus}
                      onBlur={handleTextareaBlur}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={sendFeedback}
                        disabled={!feedback.trim()}
                        className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                        style={{
                          background: feedback.trim() ? THEME.accent : '#E5E7EB',
                          color: feedback.trim() ? '#fff' : '#9CA3AF',
                          boxShadow: feedback.trim() ? `0 4px 12px ${THEME.accentShadow}` : 'none',
                        }}
                      >
                        📤 피드백 전달
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </>
        )}
      </div>

      {/* ==================== 삭제 모달 ==================== */}
      {deleteTarget !== null && (
        <div
          onClick={() => setDeleteTarget(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[380px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-3xl mb-3">⚠️</div>
            <div className="text-[17px] font-extrabold text-ink mb-2">시뮬레이션을 삭제하시겠어요?</div>
            <div className="text-[13px] font-medium text-ink-secondary mb-6 leading-[1.6]">
              삭제하면 녹음 파일과<br />AI 분석 결과가 모두 사라져요.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => deleteSim(deleteTarget)}
                className="flex-1 h-11 bg-red-600 text-white rounded-lg text-[13px] font-bold hover:bg-red-700 transition-all hover:-translate-y-px"
                style={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
              >
                🗑️ 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== AI 피드백 제안 모달 ==================== */}
      {showAiModal && (
        <div
          onClick={() => setShowAiModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-[18px] font-extrabold text-ink mb-1">✨ AI 피드백 제안</div>
            <div className="text-[12px] font-medium text-ink-secondary mb-5">
              학생의 답변과 AI 분석 결과를 바탕으로 피드백 시안을 만들었어요.
            </div>

            {aiLoading ? (
              <div className="text-center py-10 text-ink-muted text-[13px] font-medium">
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                AI가 피드백을 생성 중이에요...
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {aiSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => applyAiSuggestion(s)}
                    className="text-left px-4 py-3 rounded-xl bg-white transition-all"
                    style={{ border: '1px solid #E5E7EB' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = THEME.accent
                      e.currentTarget.style.background = THEME.accentBg
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#E5E7EB'
                      e.currentTarget.style.background = '#fff'
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                      >
                        시안 {i + 1}
                      </span>
                      <span className="text-[13px] font-medium text-ink leading-[1.6]">{s}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAiModal(false)}
              className="w-full h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

    </div>
  )
}