import { useState } from 'react'

// 파랑 테마 (기본)
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

type Essay = {
  text: string
  studentAnswer: string
  aiFeedback: string
}

type Session = {
  id: number
  title: string
  status: string
  objScore: number
  objTotal: number
  essay: Essay | null
}

type Stage = {
  id: number
  label: string
  sub: string
  color: string
  bg: string
  border: string
  sessions: Session[]
}

const makeStages = (): Stage[] => [
  {
    id: 1, label: '1단계', sub: '기초', color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD',
    sessions: [
      { id: 1, title: '1회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
      { id: 2, title: '2회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
      { id: 3, title: '3회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
      { id: 4, title: '4회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
      { id: 5, title: '5회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
    ]
  },
  {
    id: 2, label: '2단계', sub: '심화', color: '#059669', bg: '#F0FDF4', border: '#6EE7B7',
    sessions: [
      { id: 1, title: '1회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
      { id: 2, title: '2회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
      { id: 3, title: '3회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
      { id: 4, title: '4회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
      { id: 5, title: '5회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
    ]
  },
  {
    id: 3, label: '3단계', sub: '생기부 맞춤', color: '#D97706', bg: '#FFF3E8', border: '#FDBA74',
    sessions: [
      { id: 1, title: '1회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
      { id: 2, title: '2회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
      { id: 3, title: '3회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
      { id: 4, title: '4회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
      { id: 5, title: '5회차', status: '미시작', objScore: 0, objTotal: 4, essay: null },
    ]
  },
]

const MOCK_PROGRESS: Record<string, Stage[]> = {
  'IT융합학과': (() => {
    const s = makeStages()
    s[0].sessions[0] = { id: 1, title: '1회차', status: '완료', objScore: 3, objTotal: 4, essay: { text: 'AI 기술이 의료 분야에서 활용되는 사례와 한계점을 설명하시오.', studentAnswer: 'AI는 암 진단에 사용되고 있습니다. 하지만 오진 가능성이 있습니다.', aiFeedback: '기본적인 사례는 언급했지만 더 구체적인 기술명과 한계점을 보완하면 좋겠어요.' } }
    s[0].sessions[1] = { id: 2, title: '2회차', status: '완료', objScore: 2, objTotal: 4, essay: { text: '데이터 전처리가 머신러닝에서 중요한 이유를 설명하시오.', studentAnswer: '데이터를 정리해야 정확도가 높아집니다.', aiFeedback: '핵심 개념은 맞지만 구체적인 전처리 기법을 언급하면 더 좋겠어요.' } }
    s[1].sessions[0] = { id: 1, title: '1회차', status: '완료', objScore: 3, objTotal: 4, essay: { text: '트랜스포머 모델의 핵심 구조와 기존 RNN과의 차이점을 설명하시오.', studentAnswer: '트랜스포머는 어텐션 메커니즘을 사용합니다.', aiFeedback: '어텐션 메커니즘을 언급했지만 구체적인 차이점을 보완하면 좋겠어요.' } }
    return s
  })(),
  '컴퓨터공학과': (() => {
    const s = makeStages()
    s[0].sessions[0] = { id: 1, title: '1회차', status: '완료', objScore: 4, objTotal: 4, essay: { text: '운영체제에서 프로세스와 스레드의 차이를 설명하시오.', studentAnswer: '프로세스는 독립적인 실행 단위이고 스레드는 프로세스 내의 실행 단위입니다.', aiFeedback: '핵심 개념을 잘 설명했어요! 메모리 공유 여부도 추가하면 더 좋겠어요.' } }
    return s
  })(),
  '소프트웨어학과': makeStages(),
}

const MOCK_MAJORS = ['IT융합학과', '컴퓨터공학과', '소프트웨어학과']

// 점수에 따른 컬러
const getScoreColor = (ratio: number) => {
  if (ratio >= 0.8) return '#059669'
  if (ratio >= 0.6) return '#D97706'
  return '#DC2626'
}

export default function MajorTab({ student }: { student: any }) {
  const majors: string[] = student?.majors || MOCK_MAJORS

  const [selMajor, setSelMajor] = useState(majors[0])
  const [showMajorDrop, setShowMajorDrop] = useState(false)
  const [selStageId, setSelStageId] = useState(1)
  const [selSession, setSelSession] = useState<Session | null>(
    MOCK_PROGRESS[majors[0]]?.[0]?.sessions?.[0] || null
  )

  const stages: Stage[] = MOCK_PROGRESS[selMajor] || []
  const selStage = stages.find(s => s.id === selStageId) || stages[0]

  const completedSessions = (stage: Stage) =>
    stage.sessions.filter(s => s.status === '완료').length

  const avgScore = (stage: Stage) => {
    const done = stage.sessions.filter(s => s.status === '완료')
    if (done.length === 0) return null
    return Math.round(done.reduce((a, s) => a + (s.objScore / s.objTotal * 100), 0) / done.length)
  }

  const handleMajorChange = (major: string) => {
    setSelMajor(major)
    setShowMajorDrop(false)
    setSelStageId(1)
    setSelSession(MOCK_PROGRESS[major]?.[0]?.sessions?.[0] || null)
  }

  const handleStageChange = (stageId: number) => {
    setSelStageId(stageId)
    setSelSession(null)
  }

  return (
    <div className="flex gap-4 h-full overflow-hidden">

      {/* ==================== 왼쪽 패널 ==================== */}
      <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">

        {/* 학과 드롭다운 */}
        <div className="px-4 py-3.5 border-b border-line flex-shrink-0 relative z-10">
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">🎓 선택 학과</div>
          <button
            onClick={() => setShowMajorDrop(!showMajorDrop)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all"
            style={{
              background: showMajorDrop ? THEME.accentBg : '#F8FAFC',
              border: `1px solid ${showMajorDrop ? THEME.accentBorder : '#E5E7EB'}`,
            }}
          >
            <span className="text-[13px] font-bold text-ink">{selMajor}</span>
            <span
              className="text-[11px] text-ink-secondary inline-block transition-transform"
              style={{ transform: showMajorDrop ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              ▼
            </span>
          </button>
          {showMajorDrop && (
            <div
              className="absolute left-4 right-4 mt-1 bg-white border border-line rounded-lg overflow-hidden z-50"
              style={{ top: '100%', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)' }}
            >
              {majors.map(m => (
                <button
                  key={m}
                  onClick={() => handleMajorChange(m)}
                  className="w-full px-4 py-2.5 text-[13px] text-left transition-colors hover:bg-gray-50"
                  style={{
                    background: selMajor === m ? THEME.accentBg : '#fff',
                    color: selMajor === m ? THEME.accent : '#1a1a1a',
                    fontWeight: selMajor === m ? 700 : 500,
                  }}
                >
                  {selMajor === m && '✓ '}{m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 단계 탭 */}
        <div className="flex border-b border-line flex-shrink-0">
          {stages.map(stage => (
            <button
              key={stage.id}
              onClick={() => handleStageChange(stage.id)}
              className="flex-1 py-3 text-center transition-all"
              style={{
                borderBottom: `2px solid ${selStageId === stage.id ? stage.color : 'transparent'}`,
                background: selStageId === stage.id ? stage.bg : '#fff',
              }}
            >
              <div
                className="text-[12px]"
                style={{
                  fontWeight: selStageId === stage.id ? 700 : 500,
                  color: selStageId === stage.id ? stage.color : '#6B7280',
                }}
              >
                {stage.label}
              </div>
              <div
                className="text-[10px] mt-0.5 font-medium"
                style={{ color: selStageId === stage.id ? stage.color : '#9CA3AF' }}
              >
                {stage.sub}
              </div>
            </button>
          ))}
        </div>

        {/* 단계 요약 */}
        {selStage && (
          <div
            className="px-4 py-3 border-b border-line flex-shrink-0"
            style={{ background: selStage.bg }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-[12px] font-bold"
                style={{ color: selStage.color }}
              >
                {completedSessions(selStage)}/{selStage.sessions.length}회차 완료
              </span>
              <span
                className="text-[12px] font-extrabold"
                style={{ color: selStage.color }}
              >
                {avgScore(selStage) !== null ? `평균 ${avgScore(selStage)}점` : '미시작'}
              </span>
            </div>
            <div className="h-1.5 bg-white rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${completedSessions(selStage) / selStage.sessions.length * 100}%`,
                  background: selStage.color,
                }}
              />
            </div>
          </div>
        )}

        {/* 회차 목록 */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {selStage?.sessions.map(session => {
            const isSelected = selSession?.id === session.id
            const isDone = session.status === '완료'
            const ratio = session.objScore / session.objTotal

            return (
              <button
                key={session.id}
                onClick={() => isDone && setSelSession(session)}
                disabled={!isDone}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl mb-1.5 transition-all disabled:cursor-default"
                style={{
                  background: isSelected ? selStage.bg : '#F8FAFC',
                  border: `1px solid ${isSelected ? selStage.color : '#E5E7EB'}`,
                  opacity: isDone ? 1 : 0.5,
                  boxShadow: isSelected ? `0 2px 8px ${selStage.color}33` : 'none',
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="text-[13px] font-bold text-ink">{session.title}</div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: isDone ? '#ECFDF5' : '#F3F4F6',
                      color: isDone ? '#059669' : '#9CA3AF',
                      border: `1px solid ${isDone ? '#6EE7B7' : '#E5E7EB'}60`,
                    }}
                  >
                    {isDone ? '✓ 완료' : '○ 미시작'}
                  </span>
                </div>
                {isDone && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-ink-secondary">{session.objScore}/{session.objTotal}</span>
                    <span
                      className="text-[12px] font-extrabold"
                      style={{ color: getScoreColor(ratio) }}
                    >
                      {Math.round(ratio * 100)}점
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ==================== 오른쪽 상세 ==================== */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">

        {!selSession ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
            <div className="text-4xl">📚</div>
            <div className="text-[14px] font-bold text-ink-secondary">회차를 선택해주세요</div>
            <div className="text-[12px] font-medium">완료된 회차를 클릭하면 결과를 볼 수 있어요</div>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-line flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[11px] font-extrabold px-2.5 py-1 rounded-full"
                    style={{
                      color: selStage.color,
                      background: selStage.bg,
                      border: `1px solid ${selStage.border}60`,
                    }}
                  >
                    {selStage.label}
                  </span>
                  <div className="text-[15px] font-extrabold text-ink tracking-tight">{selSession.title}</div>
                  <span className="text-[11px] font-semibold text-ink-secondary bg-gray-100 px-2.5 py-1 rounded-full">
                    🎓 {selMajor}
                  </span>
                </div>
                <div className="text-right">
                  <div
                    className="text-[28px] font-black tracking-tight leading-none"
                    style={{ color: getScoreColor(selSession.objScore / selSession.objTotal) }}
                  >
                    {Math.round(selSession.objScore / selSession.objTotal * 100)}점
                  </div>
                  <div className="text-[10px] font-medium text-ink-muted mt-0.5">
                    객관식 {selSession.objScore}/{selSession.objTotal} 정답
                  </div>
                </div>
              </div>

              {/* 문제 아이콘 그리드 */}
              <div className="flex gap-1.5 mt-3">
                {Array.from({ length: selSession.objTotal }, (_, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-extrabold"
                    style={{
                      background: i < selSession.objScore ? '#ECFDF5' : '#FEE2E2',
                      color: i < selSession.objScore ? '#059669' : '#DC2626',
                      border: `1px solid ${i < selSession.objScore ? '#6EE7B7' : '#FCA5A5'}`,
                    }}
                  >
                    {i < selSession.objScore ? 'O' : 'X'}
                  </div>
                ))}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-extrabold ml-1"
                  style={{
                    background: THEME.accentBg,
                    color: THEME.accent,
                    border: `1px solid ${THEME.accentBorder}60`,
                  }}
                >
                  주관
                </div>
              </div>
            </div>

            {/* 바디 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

              {/* 객관식 결과 */}
              <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">📊 객관식 결과</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${selSession.objScore / selSession.objTotal * 100}%`,
                        background: getScoreColor(selSession.objScore / selSession.objTotal),
                      }}
                    />
                  </div>
                  <span className="text-[14px] font-extrabold text-ink flex-shrink-0">
                    {selSession.objScore}/{selSession.objTotal} 정답
                  </span>
                </div>
              </div>

              {/* 주관식 */}
              {selSession.essay ? (
                <div className="bg-white border border-line rounded-xl px-5 py-4">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-3">✏️ 주관식</div>

                  {/* 문제 */}
                  <div
                    className="rounded-lg px-4 py-3 mb-3"
                    style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: THEME.accent }}>
                      📌 문제
                    </div>
                    <div
                      className="text-[13px] font-bold leading-[1.6]"
                      style={{ color: THEME.accentDark }}
                    >
                      {selSession.essay.text}
                    </div>
                  </div>

                  {/* 학생 답변 */}
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                      👤 학생 답변
                    </div>
                    <div className="bg-gray-50 border border-line rounded-lg px-4 py-3 text-[13px] font-medium text-ink leading-[1.7]">
                      {selSession.essay.studentAnswer || (
                        <span className="text-ink-muted">아직 답변을 작성하지 않았어요.</span>
                      )}
                    </div>
                  </div>

                  {/* AI 피드백 */}
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{
                      background: '#FFF7ED',
                      border: '1px solid #FDBA7460',
                    }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#D97706' }}>
                      ✨ AI 피드백
                    </div>
                    <div className="text-[12.5px] font-medium text-amber-800 leading-[1.7]">
                      {selSession.essay.aiFeedback}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-xl">
                  <div className="text-3xl mb-2">📝</div>
                  <div className="text-[13px] text-ink-secondary font-medium">주관식 데이터가 없어요.</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  )
}