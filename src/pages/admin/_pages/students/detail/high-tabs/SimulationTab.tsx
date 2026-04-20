import { useState } from 'react'

// 파랑 테마
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

const INIT_SIMULATIONS = [
  {
    id: 1, date: '2025-03-15', university: '서울대학교', dept: '컴퓨터공학부', status: '완료',
    question: '본인의 전공 선택 동기와 관련된 구체적인 경험을 말해보세요.',
    duration: '00:13',
    aiAnalysis: {
      speed: { mine: 83, avg: 170, comment: '말의 속도가 평균보다 느려요. 좀 더 자신감 있게 말하는 연습을 해보세요.' },
      habits: ['그저', '인제', '어...', '그러니까'],
      pause: { level: '양호', comment: '말의 공백이 거의 없었어요. 좋은 흐름이에요!' },
      structure: '지원자가 어려운 상황에서 타인을 돕고, 그 경험을 통해 공감 능력을 배웠다는 점은 학생으로서 중요한 자질을 보여줍니다.',
    },
    transcript: '인로드니까 인쿤 서비스 에, 그렇지 그렇지 어려운 상황에 타인의 도움 경험이 있습니다. 그를 통해 저는 공감을 배웠습니다.',
    teacherFeedback: '',
  },
  {
    id: 2, date: '2025-03-22', university: '연세대학교', dept: '컴퓨터과학과', status: '완료',
    question: '가장 인상 깊었던 수업과 그 이유를 설명해주세요.',
    duration: '00:18',
    aiAnalysis: {
      speed: { mine: 145, avg: 170, comment: '말의 속도가 적절해요!' },
      habits: ['음...', '그래서'],
      pause: { level: '보통', comment: '중간에 공백이 몇 번 있었어요.' },
      structure: '수업 경험을 구체적으로 설명했지만 그 수업이 본인에게 미친 영향을 더 구체적으로 연결했으면 좋겠어요.',
    },
    transcript: '고2 때 들은 인공지능 수업이 가장 인상 깊었습니다. 음... 그래서 AI에 관심을 갖게 됐어요.',
    teacherFeedback: '답변 구조가 좋아요! 다만 AI에 관심을 갖게 된 구체적인 계기를 더 자세히 말해주면 좋겠어요.',
  },
  {
    id: 3, date: '2025-04-01', university: '고려대학교', dept: '컴퓨터학과', status: '예정',
    question: '', duration: '', aiAnalysis: null, transcript: '', teacherFeedback: '',
  },
]

export default function SimulationTab({ student }: { student: any }) {
  const [simulations, setSimulations] = useState(INIT_SIMULATIONS)
  const [selSim, setSelSim] = useState<any>(INIT_SIMULATIONS[0])
  const [feedback, setFeedback] = useState(INIT_SIMULATIONS[0]?.teacherFeedback || '')
  const [isPlaying, setIsPlaying] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const handleSelect = (sim: any) => {
    setSelSim(sim)
    setFeedback(sim.teacherFeedback || '')
    setIsPlaying(false)
  }

  const deleteSim = (id: number) => {
    setSimulations(prev => prev.filter(s => s.id !== id))
    if (selSim?.id === id) setSelSim(null)
  }

  return (
    <div className="flex gap-4 h-full overflow-hidden">

      {/* ==================== 왼쪽 목록 ==================== */}
      <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="px-4 py-3 border-b border-line flex-shrink-0">
          <div className="text-[14px] font-extrabold text-ink tracking-tight">🎬 시뮬레이션 기록</div>
          <div className="text-[11px] font-medium text-ink-secondary mt-1">
            총 <span className="font-bold" style={{ color: THEME.accent }}>
              {simulations.filter(s => s.status === '완료').length}회
            </span> 완료
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {simulations.length === 0 ? (
            <div className="text-center py-10 text-ink-muted">
              <div className="text-3xl mb-2">🎬</div>
              <div className="text-[12px] font-medium">시뮬레이션 기록이 없어요.</div>
            </div>
          ) : simulations.map((sim, i) => {
            const isSelected = selSim?.id === sim.id
            const isPending = sim.status === '예정'
            return (
              <div
                key={sim.id}
                onClick={() => handleSelect(sim)}
                className="rounded-xl px-3.5 py-3 mb-2 cursor-pointer transition-all relative"
                style={{
                  border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                  background: isSelected ? THEME.accentBg : '#fff',
                  boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                  opacity: isPending ? 0.55 : 1,
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
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: sim.status === '완료' ? '#ECFDF5' : THEME.accentBg,
                      color: sim.status === '완료' ? '#059669' : THEME.accent,
                      border: `1px solid ${sim.status === '완료' ? '#6EE7B7' : THEME.accentBorder}60`,
                    }}
                  >
                    {sim.status === '완료' ? '✓ 완료' : '⏳ 예정'}
                  </span>
                </div>

                <div className="text-[13px] font-bold text-ink mb-0.5">🎓 {sim.university}</div>
                <div className="text-[11px] font-medium text-ink-secondary mb-1.5">{sim.dept}</div>
                {sim.duration && (
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-block"
                    style={{ color: THEME.accent, background: THEME.accentBg }}
                  >
                    ⏱ {sim.duration}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ==================== 오른쪽 상세 ==================== */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
        {!selSim || selSim.status === '예정' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
            <div className="text-4xl">🎬</div>
            <div className="text-[14px] font-bold text-ink-secondary">
              {selSim?.status === '예정' ? '아직 진행되지 않은 시뮬레이션이에요' : '시뮬레이션을 선택해주세요'}
            </div>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-line flex-shrink-0">
              <div className="text-[15px] font-extrabold text-ink tracking-tight">
                🎓 {selSim.university} · {selSim.dept}
              </div>
              <div className="text-[11px] font-semibold text-ink-secondary mt-0.5">
                📅 {selSim.date} · ⏱ {selSim.duration}
              </div>
            </div>

            {/* 바디 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

              {/* 질문 */}
              <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                  📌 면접 질문
                </div>
                <div className="text-[14px] font-bold text-ink leading-[1.6]">{selSim.question}</div>
              </div>

              {/* 녹음 플레이어 */}
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">
                  🎙️ 녹음 파일
                </div>

                {/* 플레이어 */}
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
                      <span>{isPlaying ? '00:05' : '00:00'}</span>
                      <span>{selSim.duration}</span>
                    </div>
                  </div>
                </div>

                {/* 음성 텍스트 변환 */}
                <div className="mt-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                    📝 음성 텍스트 변환
                  </div>
                  <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink leading-[1.8]">
                    {selSim.transcript}
                  </div>
                </div>
              </div>

              {/* AI 분석 */}
              {selSim.aiAnalysis && (
                <div className="bg-white border border-line rounded-xl px-5 py-4">
                  <div className="text-[12px] font-extrabold text-ink mb-3 tracking-tight">
                    ✨ AI 분석 결과
                  </div>

                  {/* 2x1 카드 */}
                  <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                    {/* 말의 빠르기 */}
                    <div className="bg-gray-50 border border-line rounded-xl px-3.5 py-3">
                      <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                        🗣️ 말의 빠르기
                      </div>
                      <div className="flex gap-4 mb-2">
                        <div>
                          <div className="text-[10px] font-medium text-ink-muted mb-0.5">내 속도</div>
                          <div
                            className="text-[22px] font-extrabold tracking-tight leading-none"
                            style={{ color: selSim.aiAnalysis.speed.mine < 120 ? '#DC2626' : '#059669' }}
                          >
                            {selSim.aiAnalysis.speed.mine}
                            <span className="text-[11px] ml-0.5">wpm</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-medium text-ink-muted mb-0.5">평균</div>
                          <div className="text-[22px] font-extrabold text-ink-secondary tracking-tight leading-none">
                            {selSim.aiAnalysis.speed.avg}
                            <span className="text-[11px] ml-0.5">wpm</span>
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
                        className="text-[22px] font-extrabold tracking-tight leading-none mb-1.5"
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
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">
                  💬 선생님 피드백
                </div>
                {selSim.teacherFeedback ? (
                  <div
                    className="rounded-lg px-3 py-2.5 text-[13px] font-medium leading-[1.8]"
                    style={{
                      background: THEME.accentBg,
                      border: `1px solid ${THEME.accentBorder}60`,
                      color: THEME.accentDark,
                    }}
                  >
                    {selSim.teacherFeedback}
                  </div>
                ) : (
                  <>
                    <textarea
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder="AI 분석 결과를 참고해서 피드백을 작성해주세요..."
                      rows={5}
                      className="w-full border border-line rounded-lg px-3 py-2.5 text-[12px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                      onFocus={e => {
                        e.target.style.borderColor = THEME.accent
                        e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = '#E5E7EB'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                        style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                      >
                        📤 피드백 전달
                      </button>
                      <button
                        className="px-4 py-2 bg-white border rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                        style={{ color: THEME.accent, borderColor: THEME.accent }}
                      >
                        ✨ AI 피드백 제안
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </>
        )}
      </div>

      {/* ==================== 삭제 확인 모달 ==================== */}
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
                onClick={() => { deleteSim(deleteTarget); setDeleteTarget(null) }}
                className="flex-1 h-11 bg-red-600 text-white rounded-lg text-[13px] font-bold hover:bg-red-700 transition-all hover:-translate-y-px"
                style={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
              >
                🗑️ 삭제
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}