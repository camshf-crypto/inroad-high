import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStudent } from '../../../_hooks/useStudent'
import { ROADMAP, toGradeKey, type GradeKey } from '../../../../../constants/roadmap'
import { useHighRoadmapProgress } from '../../../_hooks/useHighRoadmap'

// 고등 (high-tabs)
import RoadmapTab from './high-tabs/RoadmapTab'
import TopicTab from './high-tabs/TopicTab'
import BookTab from './high-tabs/BookTab'
import RecordTab from './high-tabs/Record'
import ExpectTab from './high-tabs/ExpectTab'
import PastTab from './high-tabs/PastTab'
import SimulationTab from './high-tabs/SimulationTab'
import PresentationTab from './high-tabs/PresentationTab'
import MajorTab from './high-tabs/MajorTab'
import MockExam from './high-tabs/MockExam'

// 중등 (middle-tabs)
import MiddleRoadmapTab from './middle-tabs/roadmap'
import MiddleLessonTab from './middle-tabs/lesson'
import MiddleHomeworkTab from './middle-tabs/homework'
import MiddleBookTab from './middle-tabs/booklist'
import MiddleExpectTab from './middle-tabs/expect'
import MiddlePastTab from './middle-tabs/past'
import MiddleSimulationTab from './middle-tabs/simulation'
import MiddlePresentationTab from './middle-tabs/presentation'

const HIGH_TABS = [
  { key: 'roadmap', label: '🗺️ 로드맵' },
  { key: 'topic', label: '🔬 탐구주제' },
  { key: 'book', label: '📖 독서리스트' },
  { key: 'record', label: '📋 생기부' },
  { key: 'expect', label: '💬 생기부 예상질문' },
  { key: 'past', label: '🎓 기출문제' },
  { key: 'mockexam', label: '📝 면접 모의고사' },
  { key: 'simulation', label: '🎤 면접 시뮬레이션' },
  { key: 'presentation', label: '📄 제시문 면접' },
  { key: 'major', label: '🧠 전공특화문제' },
]

const MIDDLE_TABS = [
  { key: 'roadmap', label: '🗺️ 로드맵' },
  { key: 'lesson', label: '📚 수업' },
  { key: 'homework', label: '✏️ 숙제' },
  { key: 'book', label: '📖 독서리스트' },
  { key: 'expect', label: '💬 자소서·예상질문' },
  { key: 'past', label: '🎓 기출문제' },
  { key: 'simulation', label: '🎤 면접 시뮬레이션' },
  { key: 'presentation', label: '📄 제시문 면접' },
]

const ALL_GRADES: GradeKey[] = ['고1', '고2', '고3']

type HighTabType = 'roadmap' | 'topic' | 'book' | 'record' | 'expect' | 'past' | 'mockexam' | 'simulation' | 'presentation' | 'major'
type MiddleTabType = 'roadmap' | 'lesson' | 'homework' | 'book' | 'expect' | 'past' | 'simulation' | 'presentation'

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [highTab, setHighTab] = useState<HighTabType>('roadmap')
  const [middleTab, setMiddleTab] = useState<MiddleTabType>('roadmap')
  const [openTopicId, setOpenTopicId] = useState<number | null>(null)
  const [openBookId, setOpenBookId] = useState<number | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatType, setChatType] = useState<'topic' | 'book'>('topic')
  const [chatContext, setChatContext] = useState('')
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [viewGrade, setViewGrade] = useState<GradeKey | null>(null)

  const { data: profile, isLoading, error } = useStudent(id)
  const { data: progressMap } = useHighRoadmapProgress(id)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-50px)]">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-3" />
          <div className="text-[13px] text-ink-secondary font-medium">학생 정보를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="p-8 text-center">
        <div className="text-3xl mb-3">😢</div>
        <div className="text-[15px] font-bold text-ink mb-1">학생을 찾을 수 없어요.</div>
        {error && (
          <div className="text-[12px] text-red-600 mb-4">{(error as Error).message}</div>
        )}
        <button
          onClick={() => navigate('/admin/students')}
          className="mt-4 px-4 py-2 text-[12px] font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          학생 목록으로
        </button>
      </div>
    )
  }

  const student = {
    id: profile.id,
    name: profile.name ?? '이름없음',
    grade: profile.grade ?? '-',
    type: profile.role === 'middle_student' ? 'middle' as const : 'high' as const,
    email: profile.email ?? '-',
    school: profile.school ?? '',
    phone: profile.phone ?? '',
    joinDate: profile.created_at ? profile.created_at.slice(0, 10) : '-',
    month: '-',
    pct: 0,
    files: 0,
  }

  const isMiddle = student.type === 'middle'
  const accentColor = isMiddle ? '#059669' : '#2563EB'
  const accentDark = isMiddle ? '#065F46' : '#1E3A8A'
  const accentBg = isMiddle ? '#ECFDF5' : '#EFF6FF'
  const accentShadow = isMiddle ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.15)'

  const studentGrade: GradeKey = toGradeKey(student.grade)
  const currentViewGrade = viewGrade ?? studentGrade

  const isDone = (key: string) => progressMap?.get(key)?.is_completed === true
  const roadmap = ROADMAP[currentViewGrade]
  const totalMissions = roadmap.reduce((a, m) => a + m.missions.length, 0)
  const doneMissions = roadmap.reduce((a, m) => a + m.missions.filter(ms => isDone(ms.key)).length, 0)
  const overallPct = totalMissions > 0 ? Math.round((doneMissions / totalMissions) * 100) : 0
  const curMonth = new Date().getMonth() + 1 + '월'

  const goEditTopic = (id: number) => {
    setOpenTopicId(id)
    setHighTab('topic')
  }

  const goEditBook = (id: number) => {
    setOpenBookId(id)
    setHighTab('book')
  }

  const openChat = (type: 'topic' | 'book', context: string) => {
    setChatType(type)
    setChatContext(context)
    setChatMessages([{
      role: 'assistant',
      text: type === 'topic'
        ? `안녕하세요! ${student.name} 학생의 탐구주제를 고도화해드릴게요.\n\n현재 주제: "${context}"\n\n어떤 방향으로 발전시키고 싶으신가요?`
        : `안녕하세요! ${student.name} 학생의 독서리스트를 추천해드릴게요.\n\n현재 도서: "${context}"\n\n학생의 전공이나 관심 분야를 알려주시면 더 좋은 추천을 드릴 수 있어요!`
    }])
    setChatOpen(true)
  }

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setChatLoading(true)
    setTimeout(() => {
      const response = chatType === 'topic'
        ? `"${userMsg}"를 반영해서 탐구주제를 고도화하면 좋을 것 같아요.\n\n제안드리는 방향:\n• 구체적인 연구 방법론 추가\n• 실제 사례 데이터 분석 포함\n• 전공 연계성 강화`
        : `말씀해주신 내용을 바탕으로 추천 도서 목록을 드릴게요:\n\n1. 관련 도서 1\n2. 관련 도서 2\n3. 관련 도서 3`
      setChatMessages(prev => [...prev, { role: 'assistant', text: response }])
      setChatLoading(false)
    }, 1000)
  }

  const currentTabs = isMiddle ? MIDDLE_TABS : HIGH_TABS
  const currentTab = isMiddle ? middleTab : highTab
  const setCurrentTab = isMiddle
    ? (t: string) => setMiddleTab(t as MiddleTabType)
    : (t: string) => {
        setHighTab(t as HighTabType)
        if (t !== 'topic') setOpenTopicId(null)
        if (t !== 'book') setOpenBookId(null)
      }

  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 50px)' }}>

      {/* ==================== 메인 영역 ==================== */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* 고정 헤더 영역 (헤더 + 탭) */}
        <div className="px-8 pt-7 pb-0 flex-shrink-0">

          {/* 헤더 - 깔끔하게 */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => navigate(isMiddle ? '/admin/middle-students' : '/admin/students')}
              className="w-9 h-9 rounded-lg bg-white border border-line flex items-center justify-center cursor-pointer text-base text-ink-secondary hover:bg-gray-50 transition-colors"
            >
              ←
            </button>
            <div>
              <div className="text-[20px] font-extrabold text-ink tracking-tight">{student.name}</div>
              <div className="text-[12px] font-medium text-ink-secondary mt-0.5">
                {student.grade} · 가입일 {student.joinDate}
              </div>
            </div>

            {/* ━━━━━ 오른쪽: 학년 탭 + 스탯 4개 ━━━━━ */}
            {!isMiddle && (
              <div className="ml-auto flex items-center gap-2">
                {/* 학년 탭 */}
                <div className="flex gap-1">
                  {ALL_GRADES.map(g => {
                    const isActive = currentViewGrade === g
                    const isStudentGrade = g === studentGrade
                    return (
                      <button
                        key={g}
                        onClick={() => setViewGrade(g)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all flex items-center gap-1"
                        style={{
                          background: isActive ? THEME.accent : '#fff',
                          color: isActive ? '#fff' : '#6B7280',
                          borderColor: isActive ? THEME.accent : '#E5E7EB',
                        }}
                      >
                        {g}
                        {isStudentGrade && (
                          <span
                            className="text-[8px] font-bold px-1 py-0.5 rounded-full"
                            style={{
                              background: isActive ? 'rgba(255,255,255,0.25)' : '#FEF3C7',
                              color: isActive ? '#fff' : '#92400E',
                            }}
                          >
                            현재
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* 스탯 카드 */}
                <div className="flex items-center gap-2">
                  <div
                    className="rounded-xl px-4 py-2"
                    style={{
                      background: THEME.gradient,
                      boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                    }}
                  >
                    <div className="text-[10px] text-white/80 mb-0.5 font-medium">{currentViewGrade} 진행률</div>
                    <div className="text-[15px] font-extrabold text-white">{overallPct}%</div>
                  </div>
                  {[
                    { label: '✅ 완료 미션', val: `${doneMissions}/${totalMissions}` },
                    { label: '📅 현재 월', val: curMonth },
                    { label: '🎓 학생 학년', val: studentGrade },
                  ].map((s, i) => (
                    <div key={i} className="bg-white border border-line rounded-xl px-4 py-2">
                      <div className="text-[10px] text-ink-secondary mb-0.5 font-medium">{s.label}</div>
                      <div className="text-[15px] font-extrabold text-ink">{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isMiddle && (
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[12px] font-semibold text-ink-secondary bg-gray-100 px-3 py-1 rounded-full">
                  {student.grade}
                </span>
              </div>
            )}
          </div>

          {/* 탭 */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 -mb-px">
            {currentTabs.map(t => {
              const isActive = currentTab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setCurrentTab(t.key)}
                  className="px-4 py-2 rounded-full text-[12.5px] transition-all border whitespace-nowrap flex-shrink-0"
                  style={{
                    background: isActive ? accentColor : '#fff',
                    color: isActive ? '#fff' : '#6B7280',
                    borderColor: isActive ? accentColor : '#E5E7EB',
                    fontWeight: isActive ? 700 : 500,
                    boxShadow: isActive ? `0 2px 8px ${accentShadow}` : 'none',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <div className={`flex-1 px-8 pb-7 pt-1 min-h-0 ${highTab === 'roadmap' && !isMiddle ? 'overflow-y-auto' : 'overflow-hidden'}`}>

          {!isMiddle && (
            <>
              {highTab === 'roadmap' && <RoadmapTab student={student} viewGrade={currentViewGrade} />}
              {highTab === 'topic' && <TopicTab student={student} onOpenChat={openChat} openId={openTopicId} onClearOpenId={() => setOpenTopicId(null)} />}
              {highTab === 'book' && <BookTab student={student} onOpenChat={openChat} openId={openBookId} onClearOpenId={() => setOpenBookId(null)} />}
              {highTab === 'record' && <RecordTab student={student} onEditTopic={goEditTopic} onEditBook={goEditBook} />}
              {highTab === 'expect' && <ExpectTab student={student} />}
              {highTab === 'past' && <PastTab student={student} />}
              {highTab === 'mockexam' && <MockExam student={student} />}
              {highTab === 'simulation' && <SimulationTab student={student} />}
              {highTab === 'presentation' && <PresentationTab student={student} />}
              {highTab === 'major' && <MajorTab student={student} />}
            </>
          )}

          {isMiddle && (
            <>
              {middleTab === 'roadmap' && <MiddleRoadmapTab student={student} />}
              {middleTab === 'lesson' && <MiddleLessonTab student={student} />}
              {middleTab === 'homework' && <MiddleHomeworkTab student={student} />}
              {middleTab === 'book' && <MiddleBookTab student={student} />}
              {middleTab === 'expect' && <MiddleExpectTab student={student} />}
              {middleTab === 'past' && <MiddlePastTab student={student} />}
              {middleTab === 'simulation' && <MiddleSimulationTab student={student} />}
              {middleTab === 'presentation' && <MiddlePresentationTab student={student} />}
            </>
          )}
        </div>
      </div>

      {/* ==================== 챗봇 사이드 패널 ==================== */}
      {chatOpen && (
        <div
          className="w-[380px] border-l border-line bg-white flex flex-col flex-shrink-0"
          style={{ height: 'calc(100vh - 50px)' }}
        >
          <div
            className="px-5 py-4 border-b border-line flex items-center justify-between flex-shrink-0"
            style={{ background: accentBg }}
          >
            <div>
              <div className="text-[14px] font-extrabold" style={{ color: accentDark }}>
                ✨ {chatType === 'topic' ? '탐구주제 고도화' : '도서 추천'} 챗봇
              </div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                {student.name} 학생 · {chatContext}
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="cursor-pointer text-sm text-ink-secondary w-8 h-8 flex items-center justify-center rounded-md bg-white hover:bg-gray-50 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className="flex flex-col"
                style={{ alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                <div className="text-[10px] font-semibold text-ink-muted mb-1">
                  {msg.role === 'user' ? '👨‍🏫 선생님' : '✨ AI 챗봇'}
                </div>
                <div
                  className="max-w-[85%] px-3.5 py-2.5 text-[13px] font-medium leading-[1.7] whitespace-pre-wrap"
                  style={{
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.role === 'user' ? accentColor : '#F8FAFC',
                    color: msg.role === 'user' ? '#fff' : '#1a1a1a',
                    border: msg.role === 'user' ? 'none' : '1px solid #E5E7EB',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-start">
                <div className="px-3.5 py-2.5 bg-gray-50 border border-line rounded-[12px_12px_12px_2px] text-[13px] text-ink-secondary font-medium">
                  <span className="animate-pulse">✨ 답변 생성 중...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="px-4 py-3 border-t border-line flex-shrink-0">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder="메시지를 입력하세요..."
                className="flex-1 h-10 border border-line rounded-lg px-3 text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                onFocus={e => {
                  e.target.style.borderColor = accentColor
                  e.target.style.boxShadow = `0 0 0 3px ${accentShadow}`
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#E5E7EB'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="w-10 h-10 text-white rounded-lg transition-all text-base disabled:cursor-not-allowed"
                style={{
                  background: chatInput.trim() ? accentColor : '#E5E7EB',
                  boxShadow: chatInput.trim() ? `0 2px 6px ${accentShadow}` : 'none',
                }}
              >
                →
              </button>
            </div>
            <div className="text-[10px] font-medium text-ink-muted mt-1.5">
              Enter로 전송 · 챗봇 답변을 피드백에 붙여넣기 가능
            </div>
          </div>
        </div>
      )}
    </div>
  )
}