import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RoadmapTab from './tabs/RoadmapTab'
import TopicTab from './tabs/TopicTab'
import BookTab from './tabs/BookTab'
import ExpectTab from './tabs/ExpectTab'
import PastTab from './tabs/PastTab'
import SimulationTab from './tabs/SimulationTab'
import PresentationTab from './tabs/PresentationTab'
import MajorTab from './tabs/MajorTab'

const STUDENTS = [
  { id: 1, name: '김민준', grade: '고2', month: '5월', pct: 25, files: 2, email: 'kim@example.com', joinDate: '2025-01-15' },
  { id: 2, name: '이수현', grade: '고3', month: '7월', pct: 75, files: 5, email: 'lee@example.com', joinDate: '2025-01-10' },
  { id: 3, name: '박지호', grade: '고1', month: '2월', pct: 100, files: 3, email: 'park@example.com', joinDate: '2025-02-01' },
  { id: 4, name: '최유진', grade: '고2', month: '5월', pct: 40, files: 1, email: 'choi@example.com', joinDate: '2025-01-20' },
  { id: 5, name: '정다은', grade: '고3', month: '8월', pct: 85, files: 4, email: 'jung@example.com', joinDate: '2025-01-05' },
  { id: 6, name: '강민서', grade: '고1', month: '3월', pct: 100, files: 2, email: 'kang@example.com', joinDate: '2025-02-10' },
  { id: 7, name: '윤서준', grade: '고2', month: '5월', pct: 60, files: 3, email: 'yoon@example.com', joinDate: '2025-01-25' },
  { id: 8, name: '임지수', grade: '고1', month: '3월', pct: 50, files: 1, email: 'lim@example.com', joinDate: '2025-02-15' },
  { id: 9, name: '한지원', grade: '고3', month: '10월', pct: 90, files: 6, email: 'han@example.com', joinDate: '2025-01-03' },
  { id: 10, name: '오민석', grade: '고2', month: '8월', pct: 55, files: 2, email: 'oh@example.com', joinDate: '2025-01-18' },
]

const ROADMAP: Record<string, any[]> = {
  '고1': [
    { m: '1월', theme: '겨울방학 집중 - 방향 설정', freq: '주 2회 (2주)', missions: [
      { t: '학과 적합도 정밀진단 (200문항)', ok: false },
      { t: '진로진학 AI로 관심 계열 및 학과 탐색', ok: false },
      { t: '관심 학과 방향 결정', ok: false },
      { t: '고1 1년 로드맵 학부모 공유', ok: false },
    ], files: [] },
    { m: '2월', theme: '겨울방학 집중 - 탐구 설계', freq: '주 1회 (4주)', missions: [
      { t: '세특라이트로 1학기 탐구주제 미리 설계', ok: false },
      { t: '전공특화문제 기초 전공 지식 첫 점검', ok: false },
      { t: '동아리 계열 연결 계획 수립', ok: false },
      { t: '진로진학 AI 독서 리스트 추천', ok: false },
    ], files: [] },
    { m: '3월', theme: '방향 확정 + 탐구 실행 시작', freq: '주 2회 (2주)', missions: [
      { t: '겨울방학에 설계한 탐구주제 실행 시작', ok: false },
      { t: '동아리 선택 - 계열 및 학과 연결', ok: false },
      { t: '수행평가 주제 입시 연결 전략', ok: false },
      { t: '예상 생기부 문구 확인', ok: false },
    ], files: [] },
    { m: '5월', theme: '수행평가 + 탐구 병행', freq: '주 2회 (2주)', missions: [
      { t: '수행평가 주제 입시 연결 점검', ok: false },
      { t: '세특라이트 탐구활동 중간 점검', ok: false },
      { t: '1학기 탐구 마무리 방향 설정', ok: false },
      { t: '2학기 탐구주제 미리 구상', ok: false },
    ], files: [] },
    { m: '7월', theme: '여름방학 집중 ① - 전공 + 스피치', freq: '주 2회 (2주)', missions: [
      { t: '전공특화문제 완성', ok: false },
      { t: '2학기 탐구주제 확정', ok: false },
      { t: '스피치 훈련 시작 - 말하는 습관 교정', ok: false },
      { t: '자기소개 / 지원동기 답변 초안 작성', ok: false },
    ], files: [] },
    { m: '8월', theme: '여름방학 집중 ② - 면접 기초', freq: '주 1회 (4주)', missions: [
      { t: '장단점 / 학과 선택 이유 답변 작성', ok: false },
      { t: '실전 면접 시뮬레이션 1회 체험', ok: false },
      { t: '시뮬레이션 영상 분석 + 약점 파악', ok: false },
      { t: '9월 2학기 탐구주제 실행 준비', ok: false },
    ], files: [] },
    { m: '10월', theme: '기출 경험 + 꼬리질문', freq: '주 1회 (4주)', missions: [
      { t: '지원 희망 대학 기출문제 처음 접하기', ok: false },
      { t: '학과별 기출 내 학과 집중 풀기', ok: false },
      { t: '꼬리질문 어떤 게 나오는지 파악', ok: false },
      { t: '스피치 훈련 심화', ok: false },
    ], files: [] },
    { m: '12월', theme: '1년 마무리 + 고2 준비', freq: '주 1회 (4주)', missions: [
      { t: '1년 탐구활동 정리 / 생기부 예상질문', ok: false },
      { t: '꼬리질문 대비 연습', ok: false },
      { t: '실전 면접 시뮬레이션 1회', ok: false },
      { t: '고2 겨울방학 커리큘럼 설계', ok: false },
    ], files: [] },
  ],
  '고2': [
    { m: '1월', theme: '고1 연결 점검 + 고2 전략 수립 ①', freq: '주 2회 (2주)', missions: [
      { t: '고1 생기부 업로드 → 현재 스토리 점검 및 갭 분석', ok: false },
      { t: '학과 확정 후 고2 탐구 방향 재설계', ok: false },
      { t: '고1 활동과 연결고리 만들기', ok: false },
      { t: '고1-고2 연결 스토리 설계', ok: false },
    ], files: [] },
    { m: '2월', theme: '고1 연결 점검 + 고2 전략 수립 ②', freq: '주 1회 (4주)', missions: [
      { t: '세특라이트로 학과 맞춤 심화 탐구주제 선택', ok: false },
      { t: '전공특화문제 심화 — 고1 부족 부분 집중 보완', ok: false },
      { t: '생기부 예상문제로 현재 질문 확인', ok: false },
      { t: '진로진학 AI로 독서 리스트 심화 추천', ok: false },
    ], files: [] },
    { m: '3월', theme: '심화 탐구 실행 시작', freq: '주 1회 (4주)', missions: [
      { t: '겨울방학에 설계한 심화 탐구주제 실행 시작', ok: false },
      { t: '고1-고2 탐구 연결성 점검하며 진행', ok: false },
      { t: '생기부 예상문제로 현재 생기부 질문 미리 확인', ok: false },
      { t: '진로진학 AI로 학과별 독서 리스트 심화 추천', ok: false },
    ], files: [] },
    { m: '5월', theme: '수행평가 심화 + 면접 답변 동시 준비', freq: '주 1회 (4주)', missions: [
      { t: '수행평가 주제를 학과 스토리와 연결 — 고1보다 심화', ok: false },
      { t: '전공특화문제로 수행평가 관련 전공 지식 보완', ok: false },
      { t: '수행평가 하면서 면접 답변 초안 동시 작성', ok: false },
      { t: '꼬리질문 어떤 게 나올지 미리 파악 + 생기부 중간 점검', ok: false },
    ], files: [] },
    { m: '7월', theme: '면접 실전 본격화 ① — 생기부 + 기출 시작', freq: '주 2회 (2주)', missions: [
      { t: '1학기 생기부 업로드 → 예상 면접질문 전체 뽑기', ok: false },
      { t: '지원 희망 대학 기출문제 집중 분석 시작', ok: false },
      { t: '생기부-기출 갭 파악 → 2학기 전략 수립', ok: false },
      { t: '지원 대학 범위 1차 확정', ok: false },
    ], files: [] },
    { m: '8월', theme: '면접 실전 본격화 ② — 시뮬레이션 + 제시문', freq: '주 2회 (2주)', missions: [
      { t: '생기부 예상질문 전체 답변 작성 + 대학별 분석', ok: false },
      { t: '실전 면접 시뮬레이션 2~3회 반복 (영상 + 음성 분석)', ok: false },
      { t: 'SKY·교대 지원자 → 제시문 면접 준비 시작', ok: false },
      { t: '꼬리질문 집중 대비 — 학과 맞춤 심화', ok: false },
    ], files: [] },
    { m: '10월', theme: '기출 완성 + 제시문 심화 + 2학기 탐구', freq: '주 1~2회', missions: [
      { t: '2학기 탐구활동 실행 — 고1-고2 연결성 완성', ok: false },
      { t: '지원 대학 기출 2~3회차 반복 → 패턴 완전히 파악', ok: false },
      { t: 'SKY·교대 지원자 → 제시문 심화 답변 완성도 높이기', ok: false },
      { t: '꼬리질문 실전 연습 심화 + 스피치 업그레이드', ok: false },
    ], files: [] },
    { m: '12월', theme: '면접 90% 완성 + 고3 준비', freq: '주 2회 (2주)', missions: [
      { t: '고1~고2 전체 생기부 예상질문 총정리', ok: false },
      { t: '실전 면접 시뮬레이션 3회 이상 — 약점 최종 보완', ok: false },
      { t: '부족한 전공 지식 마지막 점검', ok: false },
      { t: '고3 로드맵 설계 — 지원 대학 최종 확정', ok: false },
    ], files: [] },
  ],
  '고3': [
    { m: '1월', theme: '생기부 마지막 탐구주제 설계 ①', freq: '주 2회 (2주)', missions: [
      { t: '세특라이트로 고3 마지막 탐구주제 선택', ok: false },
      { t: '진로진학 AI로 독서 리스트 + 탐구 방향 최종 점검', ok: false },
      { t: '학과 스토리 완성에 필요한 활동 설계', ok: false },
      { t: '지원 대학 범위 사전 점검', ok: false },
    ], files: [] },
    { m: '2월', theme: '생기부 마지막 탐구주제 설계 ②', freq: '주 1회 (4주)', missions: [
      { t: '전공특화문제로 기초 전공 지식 점검 — 면접 답변 재료 확보', ok: false },
      { t: '지금까지 생기부 업로드 → 예상질문 뽑아서 부족한 부분 파악', ok: false },
      { t: '고1·고2 연결 스토리 최종 점검', ok: false },
      { t: '면접 답변 방향 설계', ok: false },
    ], files: [] },
    { m: '3월', theme: '탐구 실행 + 수행평가 마무리', freq: '주 1회 (4주)', missions: [
      { t: '겨울방학 설계 탐구주제 실행 — 고1·고2 연결 스토리 완성', ok: false },
      { t: '수행평가 주제 학과와 연결 — 마지막 학기 전략적 활용', ok: false },
      { t: '세특라이트로 탐구 방향 점검 + 예상 생기부 문구 확인', ok: false },
      { t: '전공특화문제로 수행평가 관련 전공 지식 동시에 보완', ok: false },
    ], files: [] },
    { m: '5월', theme: '생기부 완성 + 대학 제출 전 최종 점검', freq: '주 1~2회', missions: [
      { t: '생기부 완성본 업로드 → 예상 면접질문 전체 뽑기', ok: false },
      { t: '지원 대학 확정 + 5개년 기출문제 분석 시작', ok: false },
      { t: '스피치 훈련 시작 — 말투·속도·태도 교정', ok: false },
      { t: '생기부-기출 갭 분석 → 여름방학 집중 계획 수립', ok: false },
    ], files: [] },
    { m: '7월', theme: '수시 직전 최종 완성 ①', freq: '주 2~3회', missions: [
      { t: '생기부 예상질문 전체 답변 완성 + 대학별 맞춤 분석', ok: false },
      { t: '기출문제 집중 완성 — 지원 대학 패턴 완전히 내 것으로', ok: false },
      { t: 'SKY·교대 지원자 → 꼬리질문 집중 대비', ok: false },
      { t: '지원 대학 최종 확정', ok: false },
    ], files: [] },
    { m: '8월', theme: '수시 직전 최종 완성 ②', freq: '주 2~3회', missions: [
      { t: '실전 면접 시뮬레이션 3~5회 집중 반복', ok: false },
      { t: '영상·음성 분석 후 약점 최종 보완', ok: false },
      { t: 'SKY·교대 지원자 → 제시문 최종 완성 + 꼬리질문', ok: false },
      { t: '면접 전날 루틴 완성', ok: false },
    ], files: [] },
    { m: '10월', theme: '수시 면접 완주', freq: '면접일 맞춤', missions: [
      { t: '면접 일정 확인 후 대학별 맞춤 최종 점검', ok: false },
      { t: '면접 전날 시뮬레이션 1회 — 긴장감 조절 + 컨디션 체크', ok: false },
      { t: '앞선 면접 피드백 반영 → 다음 면접 바로 보완', ok: false },
      { t: 'SKY·교대 제시문 면접 최종 점검', ok: false },
    ], files: [] },
    { m: '12월', theme: '수시 결과 확인 + 마무리', freq: '필요시', missions: [
      { t: '수시 합격 → 마무리 및 대학 생활 준비', ok: false },
      { t: '정시 대비 필요 시 → 추가 전략 수립', ok: false },
      { t: '합격 후기 공유', ok: false },
      { t: '고등학교 생활 마무리', ok: false },
    ], files: [] },
  ],
}

type TabType = 'roadmap' | 'topic' | 'book' | 'expect' | 'past' | 'simulation' | 'presentation' | 'major'

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabType>('roadmap')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatType, setChatType] = useState<'topic' | 'book'>('topic')
  const [chatContext, setChatContext] = useState('')
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const student = STUDENTS.find(s => s.id === Number(id))
  if (!student) return <div style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>학생을 찾을 수 없어요.</div>

  const roadmap = ROADMAP[student.grade] || ROADMAP['고2']
  const totalMissions = roadmap.reduce((a: number, m: any) => a + m.missions.length, 0)
  const doneMissions = roadmap.reduce((a: number, m: any) => a + m.missions.filter((x: any) => x.ok).length, 0)
  const totalFiles = roadmap.reduce((a: number, m: any) => a + m.files.length, 0)
  const overallPct = totalMissions > 0 ? Math.round(doneMissions / totalMissions * 100) : 0

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const TABS = [
    { key: 'roadmap', label: '로드맵' },
    { key: 'topic', label: '탐구주제' },
    { key: 'book', label: '독서리스트' },
    { key: 'expect', label: '생기부 예상질문' },
    { key: 'past', label: '기출문제' },
    { key: 'simulation', label: '면접 시뮬레이션' },
    { key: 'presentation', label: '제시문 면접' },
    { key: 'major', label: '전공특화문제' },
  ]

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 50px)', overflow: 'hidden' }}>
      <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div onClick={() => navigate('/admin/students')} style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#6B7280' }}>←</div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#3B5BDB', fontWeight: 500 }}>{student.name[0]}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#1a1a1a' }}>{student.name}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{student.grade} · {student.email} · 가입일 {student.joinDate}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#6B7280', background: '#F3F4F6', padding: '3px 10px', borderRadius: 99 }}>{student.grade}</span>
            <span style={{ fontSize: 12, color: '#3B5BDB' }}>진행률 {overallPct}%</span>
            <span style={{ fontSize: 12, color: '#6B7280' }}>미션 {doneMissions}/{totalMissions}</span>
            <span style={{ fontSize: 12, color: '#6B7280' }}>파일 {totalFiles}개</span>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {TABS.map(t => (
            <div key={t.key} onClick={() => setTab(t.key as TabType)}
              style={{ padding: '7px 14px', borderRadius: 99, fontSize: 13, cursor: 'pointer', background: tab === t.key ? '#3B5BDB' : '#fff', color: tab === t.key ? '#fff' : '#6B7280', border: `0.5px solid ${tab === t.key ? '#3B5BDB' : '#E5E7EB'}`, fontWeight: tab === t.key ? 500 : 400, whiteSpace: 'nowrap' }}>
              {t.label}
            </div>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        {tab === 'roadmap' && <RoadmapTab roadmap={roadmap} student={student} />}
        {tab === 'topic' && <TopicTab student={student} onOpenChat={openChat} />}
        {tab === 'book' && <BookTab student={student} onOpenChat={openChat} />}
        {tab === 'expect' && <ExpectTab student={student} />}
        {tab === 'past' && <PastTab student={student} />}
        {tab === 'simulation' && <SimulationTab student={student} />}
        {tab === 'presentation' && <PresentationTab student={student} />}
        {tab === 'major' && <MajorTab student={student} />}
      </div>

      {/* 챗봇 사이드 패널 */}
      {chatOpen && (
        <div style={{ width: 360, borderLeft: '0.5px solid #E5E7EB', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0, height: 'calc(100vh - 50px)', position: 'sticky', top: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F9FF', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>✨ {chatType === 'topic' ? '탐구주제 고도화' : '도서 추천'} 챗봇</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{student.name} 학생 · {chatContext}</div>
            </div>
            <div onClick={() => setChatOpen(false)} style={{ cursor: 'pointer', fontSize: 14, color: '#6B7280', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: '#F3F4F6' }}>✕</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 3 }}>{msg.role === 'user' ? '선생님' : 'AI 챗봇'}</div>
                <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0', background: msg.role === 'user' ? '#3B5BDB' : '#F8F7F5', color: msg.role === 'user' ? '#fff' : '#1a1a1a', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ padding: '10px 14px', background: '#F8F7F5', borderRadius: '12px 12px 12px 0', fontSize: 13, color: '#6B7280' }}>답변 생성 중...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: '12px 16px', borderTop: '0.5px solid #E5E7EB', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()} placeholder="메시지를 입력하세요..." style={{ flex: 1, height: 40, border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none' }} />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ width: 40, height: 40, background: chatInput.trim() ? '#3B5BDB' : '#E5E7EB', color: '#fff', border: 'none', borderRadius: 8, cursor: chatInput.trim() ? 'pointer' : 'not-allowed', fontSize: 16 }}>→</button>
            </div>
            <div style={{ fontSize: 10, color: '#6B7280', marginTop: 6 }}>Enter로 전송 · 챗봇 답변을 피드백에 붙여넣기 가능</div>
          </div>
        </div>
      )}
    </div>
  )
}