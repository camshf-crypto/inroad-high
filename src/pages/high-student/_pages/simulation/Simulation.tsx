import { useState, useEffect, useRef } from 'react'

const QUESTION_TYPES = [
  { id: 'past', label: '5개년 핵심 기출문제', desc: '대학별 최근 5개년 기출 분석' },
  { id: 'expect', label: '생기부 예상문제', desc: '내 생기부 기반 예상 질문' },
  { id: 'ai', label: 'AI 문제 생성', desc: 'AI가 맞춤형 질문 생성' },
]

const QUESTION_MODES = [
  { id: 'text', label: '텍스트 표시', icon: '📝', desc: '질문을 화면에 보여줘요' },
  { id: 'voice', label: '음성만', icon: '🎙️', desc: '질문을 음성으로만 들려줘요' },
  { id: 'both', label: '텍스트 + 음성', icon: '📢', desc: '텍스트와 음성 동시에' },
]

const PAST_SCHOOLS = [
  { univ: '서울대학교', dept: '컴퓨터공학부' },
  { univ: '연세대학교', dept: '컴퓨터과학과' },
  { univ: '고려대학교', dept: '컴퓨터학과' },
  { univ: '한양대학교', dept: '소프트웨어학부' },
  { univ: '성균관대학교', dept: '소프트웨어학과' },
  { univ: '중앙대학교', dept: '소프트웨어학부' },
]

const EXPECT_SCHOOLS = [
  { univ: '서울대학교', dept: '컴퓨터공학부', grade: '고1' },
  { univ: '연세대학교', dept: '의과대학', grade: '고2' },
  { univ: '고려대학교', dept: '경영학과', grade: '고3' },
]

const ALL_UNIVS = ['서울대학교', '연세대학교', '고려대학교', '한양대학교', '성균관대학교', '중앙대학교', '경희대학교', '이화여자대학교', '가천대학교', '인하대학교']
const ALL_DEPTS = ['컴퓨터공학부', '의과대학', '간호학과', '경영학과', '법학과', '전기전자공학부', '기계공학부', '화학공학부', '생명과학과', '심리학과']

const MOCK_QUESTIONS = [
  { id: 1, text: '본인을 한 단어로 표현한다면?' },
  { id: 2, text: '고등학교 생활 중 가장 의미 있었던 경험을 말해보세요.' },
  { id: 3, text: '지원 학과를 선택한 구체적인 계기가 있나요?' },
  { id: 4, text: '본인의 장점이 학과 공부에 어떻게 도움이 될까요?' },
  { id: 5, text: '10년 후 본인의 모습을 어떻게 그리고 있나요?' },
]

const INTERVIEWERS = [
  { id: 1, emoji: '👨‍💼', name: '면접관 1' },
  { id: 2, emoji: '👨‍🏫', name: '면접관 2' },
  { id: 3, emoji: '👩‍💼', name: '면접관 3' },
]

export default function Simulation() {
  const [step, setStep] = useState<'list' | 'setup' | 'countdown' | 'interview' | 'result'>('list')
  const [questionType, setQuestionType] = useState<string>('')
  const [tailQ, setTailQ] = useState<boolean | null>(null)
  const [questionMode, setQuestionMode] = useState<string>('')
  const [selSchool, setSelSchool] = useState<any>(null)
  const [selUniv, setSelUniv] = useState('')
  const [selDept, setSelDept] = useState('')
  const [countdown, setCountdown] = useState(10)
  const [curQIdx, setCurQIdx] = useState(0)
  const [timer, setTimer] = useState(80)
  const [timerRunning, setTimerRunning] = useState(false)
  const [showQuestion, setShowQuestion] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [activeInterviewer, setActiveInterviewer] = useState(0)
  const [selSim, setSelSim] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const timerRef = useRef<any>(null)
  const interviewerRef = useRef<any>(null)

  const [simHistory, setSimHistory] = useState([
    { id: 1, date: '2026.04.14', title: '가천대학교 간호학과', tags: ['인성 질문', '기본질문', '꼬리질문'], duration: '00:13', transcript: '인로드니까 어... 그렇지 그렇지 어려운 상황에 타인의 도움 경험이 있습니다. 그를 통해 저는 공감을 배웠습니다.', teacherFeedback: '' },
    { id: 2, date: '2026.04.10', title: '서울대학교 컴퓨터공학부', tags: ['전공 질문', '기출문제'], duration: '00:18', transcript: '고2 때 들은 인공지능 수업이 가장 인상 깊었습니다. 음... 그래서 AI에 관심을 갖게 됐어요.', teacherFeedback: '답변 구조가 좋아요!' },
    { id: 3, date: '2026.04.05', title: '연세대학교 의과대학', tags: ['인성 질문', '생기부 예상'], duration: '00:21', transcript: '저는 봉사활동을 통해 의사라는 직업에 관심을 갖게 됐습니다.', teacherFeedback: '' },
  ])

  useEffect(() => {
    if (step !== 'countdown') return
    if (countdown <= 0) { setStep('interview'); setTimerRunning(true); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [step, countdown])

  useEffect(() => {
    if (!timerRunning) return
    if (timer <= 0) { setTimerRunning(false); return }
    timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timerRunning, timer])

  useEffect(() => {
    if (step !== 'interview') return
    interviewerRef.current = setInterval(() => setActiveInterviewer(Math.floor(Math.random() * 3)), 3000)
    return () => clearInterval(interviewerRef.current)
  }, [step])

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const nextQuestion = () => {
    if (curQIdx >= MOCK_QUESTIONS.length - 1) { setStep('result'); return }
    setCurQIdx(i => i + 1); setTimer(80); setTimerRunning(true); setIsRecording(false)
  }

  const getSelectedTitle = () => {
    if (questionType === 'ai') return selUniv && selDept ? `${selUniv} · ${selDept}` : ''
    return selSchool ? `${selSchool.univ} · ${selSchool.dept}` : ''
  }

  const canStart = questionType && tailQ !== null && questionMode && getSelectedTitle()

  const startSimulation = () => {
    if (!canStart) return
    setCountdown(10); setStep('countdown'); setCurQIdx(0); setTimer(80)
    setShowQuestion(questionMode !== 'voice')
  }

  const deleteSim = (id: number) => {
    setSimHistory(prev => prev.filter(s => s.id !== id))
    if (selSim?.id === id) setSelSim(null)
    setDeleteTarget(null)
  }

  const resetSetup = () => {
    setQuestionType(''); setTailQ(null); setQuestionMode('')
    setSelSchool(null); setSelUniv(''); setSelDept('')
  }

  const toggleType = (id: string) => {
    if (questionType === id) { setQuestionType(''); setSelSchool(null); setSelUniv(''); setSelDept('') }
    else { setQuestionType(id); setSelSchool(null); setSelUniv(''); setSelDept('') }
  }

  // 목록 화면
  if (step === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100vh - 90px)', overflow: 'hidden', padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
          <div style={{ width: 320, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>면접 시뮬레이션</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>총 <span style={{ color: '#3B5BDB', fontWeight: 600 }}>{simHistory.length}개</span></div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
              {simHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 12 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎙️</div>시뮬레이션 기록이 없어요.
                </div>
              ) : simHistory.map(s => (
                <div key={s.id} onClick={() => { setSelSim(s); setIsPlaying(false) }}
                  style={{ border: `0.5px solid ${selSim?.id === s.id ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 7, cursor: 'pointer', background: selSim?.id === s.id ? '#EEF2FF' : '#fff', position: 'relative' }}>
                  <div onClick={e => { e.stopPropagation(); setDeleteTarget(s.id) }}
                    style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#6B7280', cursor: 'pointer' }}>✕</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>{s.date}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', marginBottom: 6, paddingRight: 20 }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {s.tags.map((tag, i) => <span key={i} style={{ fontSize: 10, color: '#3B5BDB', background: '#EEF2FF', padding: '1px 7px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>{tag}</span>)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px', borderTop: '0.5px solid #E5E7EB', flexShrink: 0 }}>
              <button onClick={() => setStep('setup')}
                style={{ width: '100%', height: 42, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                + 시작하기
              </button>
            </div>
          </div>

          <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!selSim ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
                <div style={{ fontSize: 32 }}>🎙️</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>시뮬레이션을 선택해주세요</div>
                <div style={{ fontSize: 12 }}>왼쪽에서 기록을 클릭하면 피드백을 볼 수 있어요</div>
              </div>
            ) : (
              <>
                <div style={{ padding: '13px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>{selSim.title}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{selSim.date} · {selSim.duration}</div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                          <span>{isPlaying ? '00:05' : '00:00'}</span><span>{selSim.duration}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 5 }}>음성 텍스트 변환</div>
                      <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>{selSim.transcript}</div>
                    </div>
                  </div>
                  <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 8 }}>선생님 피드백</div>
                    {selSim.teacherFeedback ? (
                      <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#1E3A8A', lineHeight: 1.8 }}>{selSim.teacherFeedback}</div>
                    ) : (
                      <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>선생님 피드백을 기다리는 중이에요.</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 8 }}>태그</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {selSim.tags.map((tag: string, i: number) => <span key={i} style={{ fontSize: 11, color: '#3B5BDB', background: '#EEF2FF', padding: '3px 10px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>{tag}</span>)}
                    </div>
                  </div>
                  <div style={{ background: '#F8F7F5', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 8 }}>답변한 질문</div>
                    {MOCK_QUESTIONS.map((q, i) => (
                      <div key={q.id} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                        <span style={{ color: '#F97316', flexShrink: 0, fontWeight: 600 }}>Q{i + 1}.</span>{q.text}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {deleteTarget !== null && (
          <div onClick={() => setDeleteTarget(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>시뮬레이션을 삭제하시겠어요?</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>삭제하면 녹음 파일과 피드백이 모두 사라져요.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setDeleteTarget(null)}
                  style={{ flex: 1, height: 42, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                <button onClick={() => deleteSim(deleteTarget)}
                  style={{ flex: 1, height: 42, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>삭제</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 설정 모달
  if (step === 'setup') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: 520, maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>시뮬레이션 설정</div>
            <div onClick={() => setStep('list')} style={{ cursor: 'pointer', color: '#6B7280', fontSize: 18 }}>✕</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 36 }}>🤖</div>
            <div>
              <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.3)', color: '#fff', padding: '2px 8px', borderRadius: 99, display: 'inline-block', marginBottom: 4 }}>기초부터 차근차근 해보자!</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>원하는 문제 유형을 골라주세요!</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>하나만 선택해서 시작해요.</div>
            </div>
          </div>

          {/* 문제 유형 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 10 }}>문제 유형 (1개 선택)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* 5개년 기출문제 */}
              <div>
                <div onClick={() => toggleType('past')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: `1.5px solid ${questionType === 'past' ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, cursor: 'pointer', background: questionType === 'past' ? '#EEF2FF' : '#fff' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>5개년 핵심 기출문제</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>대학별 최근 5개년 기출 분석</div>
                  </div>
                  {questionType === 'past' && <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#3B5BDB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>✓</div>}
                </div>
                {questionType === 'past' && (
                  <div style={{ background: '#F8F9FF', border: '0.5px solid #BAC8FF', borderRadius: 8, padding: '12px 14px', marginTop: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#3B5BDB', marginBottom: 8 }}>🎓 기출문제 등록한 학교 선택</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {PAST_SCHOOLS.map((s, i) => (
                        <div key={i} onClick={() => setSelSchool(selSchool?.univ === s.univ && selSchool?.dept === s.dept ? null : s)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: `0.5px solid ${selSchool?.univ === s.univ && selSchool?.dept === s.dept ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 8, cursor: 'pointer', background: selSchool?.univ === s.univ && selSchool?.dept === s.dept ? '#EEF2FF' : '#fff' }}>
                          <span style={{ fontSize: 12, color: '#1a1a1a' }}>{s.univ} · {s.dept}</span>
                          {selSchool?.univ === s.univ && selSchool?.dept === s.dept && <span style={{ fontSize: 11, color: '#3B5BDB' }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 생기부 예상문제 */}
              <div>
                <div onClick={() => toggleType('expect')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: `1.5px solid ${questionType === 'expect' ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, cursor: 'pointer', background: questionType === 'expect' ? '#EEF2FF' : '#fff' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>생기부 예상문제</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>내 생기부 기반 예상 질문</div>
                  </div>
                  {questionType === 'expect' && <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#3B5BDB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>✓</div>}
                </div>
                {questionType === 'expect' && (
                  <div style={{ background: '#F8F9FF', border: '0.5px solid #BAC8FF', borderRadius: 8, padding: '12px 14px', marginTop: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#3B5BDB', marginBottom: 8 }}>📋 생기부 예상질문 등록한 학교 선택</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {EXPECT_SCHOOLS.map((s, i) => (
                        <div key={i} onClick={() => setSelSchool(selSchool?.univ === s.univ && selSchool?.dept === s.dept ? null : s)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: `0.5px solid ${selSchool?.univ === s.univ && selSchool?.dept === s.dept ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 8, cursor: 'pointer', background: selSchool?.univ === s.univ && selSchool?.dept === s.dept ? '#EEF2FF' : '#fff' }}>
                          <div>
                            <span style={{ fontSize: 12, color: '#1a1a1a' }}>{s.univ} · {s.dept}</span>
                            <span style={{ fontSize: 10, color: '#6B7280', marginLeft: 6 }}>{s.grade}</span>
                          </div>
                          {selSchool?.univ === s.univ && selSchool?.dept === s.dept && <span style={{ fontSize: 11, color: '#3B5BDB' }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* AI 문제 생성 */}
              <div>
                <div onClick={() => toggleType('ai')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: `1.5px solid ${questionType === 'ai' ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, cursor: 'pointer', background: questionType === 'ai' ? '#EEF2FF' : '#fff' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>AI 문제 생성</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>AI가 맞춤형 질문 생성</div>
                  </div>
                  {questionType === 'ai' && <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#3B5BDB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>✓</div>}
                </div>
                {questionType === 'ai' && (
                  <div style={{ background: '#F8F9FF', border: '0.5px solid #BAC8FF', borderRadius: 8, padding: '12px 14px', marginTop: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#3B5BDB', marginBottom: 8 }}>🤖 학교 · 학과 직접 선택</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select value={selUniv} onChange={e => setSelUniv(e.target.value)}
                        style={{ flex: 1, height: 36, border: '0.5px solid #E5E7EB', borderRadius: 7, padding: '0 10px', fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff' }}>
                        <option value=''>학교 선택</option>
                        {ALL_UNIVS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <select value={selDept} onChange={e => setSelDept(e.target.value)}
                        style={{ flex: 1, height: 36, border: '0.5px solid #E5E7EB', borderRadius: 7, padding: '0 10px', fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff' }}>
                        <option value=''>학과 선택</option>
                        {ALL_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    {selUniv && selDept && (
                      <div style={{ marginTop: 8, fontSize: 11, color: '#3B5BDB', background: '#EEF2FF', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>
                        ✓ {selUniv} · {selDept}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* 꼬리질문 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 10 }}>꼬리질문</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ val: true, label: 'ON' }, { val: false, label: 'OFF' }].map(o => (
                <div key={String(o.val)} onClick={() => setTailQ(o.val)}
                  style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${tailQ === o.val ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, cursor: 'pointer', background: tailQ === o.val ? '#EEF2FF' : '#fff', fontSize: 14, fontWeight: tailQ === o.val ? 600 : 400, color: tailQ === o.val ? '#3B5BDB' : '#6B7280' }}>
                  {o.label}
                </div>
              ))}
            </div>
          </div>

          {/* 질문 방식 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 10 }}>질문 방식</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUESTION_MODES.map(m => (
                <div key={m.id} onClick={() => setQuestionMode(m.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1.5px solid ${questionMode === m.id ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, cursor: 'pointer', background: questionMode === m.id ? '#EEF2FF' : '#fff' }}>
                  <span style={{ fontSize: 22 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{m.desc}</div>
                  </div>
                  {questionMode === m.id && <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: '#3B5BDB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>✓</div>}
                </div>
              ))}
            </div>
          </div>

          <button onClick={startSimulation} disabled={!canStart}
            style={{ width: '100%', height: 48, background: canStart ? '#3B5BDB' : '#E5E7EB', color: canStart ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: canStart ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
            다음으로
          </button>
        </div>
      </div>
    )
  }

  // 카운트다운
  if (step === 'countdown') {
    const title = questionType === 'ai' ? `${selUniv} · ${selDept}` : `${selSchool?.univ} · ${selSchool?.dept}`
    return (
      <div style={{ height: 'calc(100vh - 50px)', background: '#F8F7F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 12, background: '#FFF3E8', color: '#F97316', padding: '4px 12px', borderRadius: 99, fontWeight: 500 }}>{QUESTION_TYPES.find(t => t.id === questionType)?.label}</span>
          <span style={{ fontSize: 12, background: '#FEE2E2', color: '#DC2626', padding: '4px 12px', borderRadius: 99, fontWeight: 500 }}>꼬리질문 {tailQ ? 'ON' : 'OFF'}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 80, marginBottom: 8 }}>🤖</div>
        <div style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 1.8 }}>
          잠시 후 면접이 시작돼요.<br />깊게 숨 한번 쉬고, 천천히 호흡을 가다듬어볼까요?
        </div>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fff', border: '3px solid #EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#EF4444', marginTop: 8 }}>
          {countdown}
        </div>
      </div>
    )
  }

  // 면접 화면
  if (step === 'interview') {
    const curQ = MOCK_QUESTIONS[curQIdx]
    const title = questionType === 'ai' ? `${selUniv} · ${selDept}` : `${selSchool?.univ} · ${selSchool?.dept}`
    return (
      <div style={{ height: 'calc(100vh - 50px)', background: '#111', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
          <div onClick={() => setStep('list')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>← 처음으로</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>실전 면접 시뮬레이션</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>고민하는 시간도 성장의 일부예요!</div>
        </div>
        <div style={{ position: 'absolute', top: 44, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 20px' }}>
          <span style={{ fontSize: 11, background: '#FFF3E8', color: '#F97316', padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>{QUESTION_TYPES.find(t => t.id === questionType)?.label}</span>
          <span style={{ fontSize: 11, background: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>꼬리질문 {tailQ ? 'ON' : 'OFF'}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{title}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 120 }}>
          <div style={{ display: 'flex', gap: 4, width: '100%', height: '100%' }}>
            {INTERVIEWERS.map((iv, i) => (
              <div key={iv.id} style={{ flex: 1, background: activeInterviewer === i ? '#1a1a2e' : '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 4, transition: 'background 0.3s', border: activeInterviewer === i ? '1px solid rgba(59,91,219,0.5)' : 'none' }}>
                <div style={{ fontSize: 64, marginBottom: 8 }}>{iv.emoji}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{iv.name}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <div style={{ background: 'rgba(0,0,0,0.7)', borderRadius: 99, padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{formatTime(timer)} / 01:20</span>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', padding: '20px 24px 24px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,165,0,0.9)', marginBottom: 6 }}>
            *{QUESTION_TYPES.find(t => t.id === questionType)?.label} 중 {MOCK_QUESTIONS.length}문제가 무작위로 출제됩니다.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              {showQuestion ? (
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                  <span style={{ color: '#F97316' }}>질문 {curQIdx + 1}. </span>{curQ.text}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                    <span style={{ color: '#F97316' }}>질문 {curQIdx + 1}. </span>
                    <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '2px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>음성으로 확인하세요</span>
                  </div>
                  <button onClick={() => setShowQuestion(true)}
                    style={{ fontSize: 11, color: '#F97316', background: 'rgba(249,115,22,0.2)', border: '0.5px solid #F97316', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    텍스트 보기
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginLeft: 20 }}>
              <button onClick={() => setIsRecording(!isRecording)}
                style={{ height: 44, padding: '0 20px', background: isRecording ? '#EF4444' : '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {isRecording ? '⏹ 답변 종료' : '● 답변 시작'}
              </button>
              <button onClick={nextQuestion}
                style={{ height: 44, padding: '0 20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '0.5px solid rgba(255,255,255,0.3)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                다음 질문 →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 결과 화면
  if (step === 'result') {
    return (
      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div onClick={() => setStep('list')}
            style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#6B7280' }}>←</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>시뮬레이션 완료</div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>면접 시뮬레이션 완료!</div>
          <div style={{ fontSize: 14, color: '#6B7280' }}>총 {MOCK_QUESTIONS.length}개 질문에 답변했어요.</div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, padding: '20px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 14 }}>이번 시뮬레이션 요약</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: '답변한 질문', val: `${MOCK_QUESTIONS.length}개` },
              { label: '문제 유형', val: QUESTION_TYPES.find(t => t.id === questionType)?.label || '' },
              { label: '꼬리질문', val: tailQ ? 'ON' : 'OFF' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#F8F7F5', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#3B5BDB', marginBottom: 4 }}>선생님 피드백 대기중</div>
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>선생님이 녹음 내용을 분석하고 피드백을 남겨드릴 예정이에요.</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setStep('setup'); resetSetup() }}
            style={{ flex: 1, height: 48, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            다시 시뮬레이션하기
          </button>
          <button onClick={() => setStep('list')}
            style={{ flex: 1, height: 48, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            목록으로
          </button>
        </div>
      </div>
    )
  }

  return null
}