import { useState } from 'react'

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
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>

      {/* 왼쪽 목록 */}
      <div style={{ width: 300, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>시뮬레이션 기록</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
            총 <span style={{ color: '#3B5BDB', fontWeight: 600 }}>{simulations.filter(s => s.status === '완료').length}회</span> 완료
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {simulations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 12 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎬</div>
              시뮬레이션 기록이 없어요.
            </div>
          ) : simulations.map((sim, i) => (
            <div key={sim.id} onClick={() => handleSelect(sim)}
              style={{ border: `0.5px solid ${selSim?.id === sim.id ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, padding: '12px 13px', marginBottom: 8, cursor: 'pointer', background: selSim?.id === sim.id ? '#EEF2FF' : '#fff', opacity: sim.status === '예정' ? 0.5 : 1, position: 'relative' }}>
              {/* X 버튼 */}
              <div onClick={e => { e.stopPropagation(); setDeleteTarget(sim.id) }}
                style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#6B7280', cursor: 'pointer' }}>
                ✕
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingRight: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>#{i + 1} · {sim.date}</span>
                <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: sim.status === '완료' ? '#ECFDF5' : '#EEF2FF', color: sim.status === '완료' ? '#059669' : '#3B5BDB', border: `0.5px solid ${sim.status === '완료' ? '#6EE7B7' : '#BAC8FF'}` }}>
                  {sim.status}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 2 }}>{sim.university}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: sim.duration ? 6 : 0 }}>{sim.dept}</div>
              {sim.duration && <span style={{ fontSize: 11, color: '#6B7280' }}>⏱ {sim.duration}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽 상세 */}
      <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selSim || selSim.status === '예정' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
            <div style={{ fontSize: 32 }}>🎬</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>
              {selSim?.status === '예정' ? '아직 진행되지 않은 시뮬레이션이에요' : '시뮬레이션을 선택해주세요'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{selSim.university} · {selSim.dept}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{selSim.date} · {selSim.duration}</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* 질문 */}
              <div style={{ background: '#F8F7F5', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 5 }}>면접 질문</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.6 }}>{selSim.question}</div>
              </div>

              {/* 녹음 플레이어 */}
              <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 10 }}>녹음 파일</div>
                <div style={{ background: '#F8F7F5', borderRadius: 9, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setIsPlaying(!isPlaying)}
                    style={{ width: 36, height: 36, borderRadius: '50%', background: '#3B5BDB', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 4, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ width: isPlaying ? '40%' : '0%', height: '100%', background: '#3B5BDB', borderRadius: 99, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF' }}>
                      <span>{isPlaying ? '00:05' : '00:00'}</span>
                      <span>{selSim.duration}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 5 }}>음성 텍스트 변환</div>
                  <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>{selSim.transcript}</div>
                </div>
              </div>

              {/* AI 분석 */}
              {selSim.aiAnalysis && (
                <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>✨ AI 분석 결과</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div style={{ background: '#F8F7F5', borderRadius: 9, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 8 }}>말의 빠르기</div>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>내 속도</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: selSim.aiAnalysis.speed.mine < 120 ? '#DC2626' : '#059669' }}>{selSim.aiAnalysis.speed.mine}wpm</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>평균 속도</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#6B7280' }}>{selSim.aiAnalysis.speed.avg}wpm</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{selSim.aiAnalysis.speed.comment}</div>
                    </div>
                    <div style={{ background: '#F8F7F5', borderRadius: 9, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 8 }}>말의 공백</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: selSim.aiAnalysis.pause.level === '양호' ? '#059669' : '#D97706', marginBottom: 6 }}>{selSim.aiAnalysis.pause.level}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{selSim.aiAnalysis.pause.comment}</div>
                    </div>
                  </div>
                  <div style={{ background: '#FEF9C3', border: '0.5px solid #FDE047', borderRadius: 9, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#854D0E', marginBottom: 7 }}>습관어</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {selSim.aiAnalysis.habits.map((h: string, i: number) => (
                        <span key={i} style={{ fontSize: 12, color: '#854D0E', background: '#FEF08A', padding: '3px 10px', borderRadius: 99, border: '0.5px solid #FDE047' }}>"{h}"</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 9, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#3B5BDB', marginBottom: 6 }}>답변 구성 분석</div>
                    <div style={{ fontSize: 13, color: '#1E3A8A', lineHeight: 1.7 }}>{selSim.aiAnalysis.structure}</div>
                  </div>
                </div>
              )}

              {/* 선생님 피드백 */}
              <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 8 }}>선생님 피드백</div>
                {selSim.teacherFeedback ? (
                  <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#1E3A8A', lineHeight: 1.8 }}>
                    {selSim.teacherFeedback}
                  </div>
                ) : (
                  <>
                    <textarea
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder="AI 분석 결과를 참고해서 피드백을 작성해주세요..."
                      rows={5}
                      style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
                    />
                    <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
                      <button style={{ padding: '7px 14px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>피드백 전달</button>
                      <button style={{ padding: '7px 14px', background: '#fff', color: '#3B5BDB', border: '0.5px solid #3B5BDB', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>✨ AI 피드백 제안</button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {deleteTarget !== null && (
        <div onClick={() => setDeleteTarget(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>시뮬레이션을 삭제하시겠어요?</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>삭제하면 녹음 파일과 AI 분석 결과가 모두 사라져요.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, height: 42, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
              <button onClick={() => { deleteSim(deleteTarget); setDeleteTarget(null) }}
                style={{ flex: 1, height: 42, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>삭제</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}