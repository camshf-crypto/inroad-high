import { useState } from 'react'

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
    id: 1, label: '1단계', sub: '기초', color: '#3B5BDB', bg: '#EEF2FF', border: '#BAC8FF',
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

// TODO: API 연동 시 제거
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

// TODO: API 연동 시 student.majors 로 교체
const MOCK_MAJORS = ['IT융합학과', '컴퓨터공학과', '소프트웨어학과']

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
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>

      {/* 왼쪽 */}
      <div style={{ width: 280, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 학과 드롭다운 */}
        <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0, position: 'relative', zIndex: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 6 }}>선택 학과</div>
          <div onClick={() => setShowMajorDrop(!showMajorDrop)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '0.5px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', background: '#F8F7F5' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{selMajor}</span>
            <span style={{ fontSize: 11, color: '#6B7280', display: 'inline-block', transform: showMajorDrop ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
          </div>
          {showMajorDrop && (
            <div style={{ position: 'absolute', top: '100%', left: 14, right: 14, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
              {majors.map(m => (
                <div key={m} onClick={() => handleMajorChange(m)}
                  style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', background: selMajor === m ? '#EEF2FF' : '#fff', color: selMajor === m ? '#3B5BDB' : '#1a1a1a', fontWeight: selMajor === m ? 600 : 400 }}>
                  {m}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 단계 탭 */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
          {stages.map(stage => (
            <div key={stage.id} onClick={() => handleStageChange(stage.id)}
              style={{ flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer', borderBottom: `2px solid ${selStageId === stage.id ? stage.color : 'transparent'}`, background: selStageId === stage.id ? stage.bg : '#fff' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: selStageId === stage.id ? stage.color : '#6B7280' }}>{stage.label}</div>
              <div style={{ fontSize: 10, color: selStageId === stage.id ? stage.color : '#9CA3AF', marginTop: 1 }}>{stage.sub}</div>
            </div>
          ))}
        </div>

        {/* 단계 요약 */}
        {selStage && (
          <div style={{ padding: '10px 14px', background: selStage.bg, borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: selStage.color, fontWeight: 600 }}>{completedSessions(selStage)}/{selStage.sessions.length}회차 완료</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: selStage.color }}>{avgScore(selStage) !== null ? `평균 ${avgScore(selStage)}점` : '미시작'}</span>
            </div>
            <div style={{ height: 5, background: '#fff', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${completedSessions(selStage) / selStage.sessions.length * 100}%`, height: '100%', background: selStage.color, borderRadius: 99, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* 회차 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {selStage?.sessions.map(session => (
            <div key={session.id} onClick={() => session.status !== '미시작' && setSelSession(session)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 9, marginBottom: 6, cursor: session.status === '미시작' ? 'default' : 'pointer', background: selSession?.id === session.id ? selStage.bg : '#F8F7F5', border: `0.5px solid ${selSession?.id === session.id ? selStage.color : '#E5E7EB'}`, opacity: session.status === '미시작' ? 0.5 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{session.title}</div>
                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: session.status === '완료' ? '#ECFDF5' : '#F3F4F6', color: session.status === '완료' ? '#059669' : '#9CA3AF', border: `0.5px solid ${session.status === '완료' ? '#6EE7B7' : '#E5E7EB'}` }}>
                  {session.status}
                </span>
              </div>
              {session.status === '완료' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{session.objScore}/{session.objTotal}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: (session.objScore / session.objTotal) >= 0.8 ? '#059669' : (session.objScore / session.objTotal) >= 0.6 ? '#D97706' : '#DC2626' }}>
                    {Math.round(session.objScore / session.objTotal * 100)}점
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽 상세 */}
      <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selSession ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
            <div style={{ fontSize: 32 }}>📚</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>회차를 선택해주세요</div>
            <div style={{ fontSize: 12 }}>완료된 회차를 클릭하면 결과를 볼 수 있어요</div>
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: selStage.color, background: selStage.bg, padding: '2px 9px', borderRadius: 99, border: `0.5px solid ${selStage.border}` }}>{selStage.label}</span>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{selSession.title}</div>
                  <span style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>{selMajor}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: (selSession.objScore / selSession.objTotal) >= 0.8 ? '#059669' : (selSession.objScore / selSession.objTotal) >= 0.6 ? '#D97706' : '#DC2626' }}>
                    {Math.round(selSession.objScore / selSession.objTotal * 100)}점
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>객관식 {selSession.objScore}/{selSession.objTotal} 정답</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {Array.from({ length: selSession.objTotal }, (_, i) => (
                  <div key={i} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: i < selSession.objScore ? '#ECFDF5' : '#FEE2E2', color: i < selSession.objScore ? '#059669' : '#DC2626', border: `0.5px solid ${i < selSession.objScore ? '#6EE7B7' : '#FCA5A5'}` }}>
                    {i < selSession.objScore ? 'O' : 'X'}
                  </div>
                ))}
                <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: '#EEF2FF', color: '#3B5BDB', border: '0.5px solid #BAC8FF', marginLeft: 4 }}>주관</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#F8F7F5', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 6 }}>객관식 결과</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 8, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${selSession.objScore / selSession.objTotal * 100}%`, height: '100%', background: (selSession.objScore / selSession.objTotal) >= 0.8 ? '#059669' : '#D97706', borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', flexShrink: 0 }}>{selSession.objScore}/{selSession.objTotal} 정답</span>
                </div>
              </div>

              {selSession.essay ? (
                <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 10 }}>주관식</div>
                  <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 5 }}>문제</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.6 }}>{selSession.essay.text}</div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 5 }}>학생 답변</div>
                    <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                      {selSession.essay.studentAnswer || <span style={{ color: '#9CA3AF' }}>아직 답변을 작성하지 않았어요.</span>}
                    </div>
                  </div>
                  <div style={{ background: '#FFF3E8', border: '0.5px solid #FDBA74', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 500, color: '#D97706', marginBottom: 5 }}>✨ AI 피드백</div>
                    <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>{selSession.essay.aiFeedback}</div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 13 }}>주관식 데이터가 없어요.</div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  )
}