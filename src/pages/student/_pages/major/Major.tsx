import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const ALL_DEPTS = [
  { name: '경영학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '바이오공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '신소재공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '화학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '전자재료공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '국제통상학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '기계공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '생명공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '미디어커뮤니케이션학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '전기공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '물리학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '법학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '간호학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '건축학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '경제학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '고분자공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '광고홍보학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '교육학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '국어국문학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '기계공학부', sub: '객관식 120문항, 주관식 30문항' },
  { name: '데이터사이언스학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '디자인학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '디지털미디어학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '로봇공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '무역학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '문헌정보학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '바이오식품공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '법학부', sub: '객관식 120문항, 주관식 30문항' },
  { name: '사회복지학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '사회학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '산업공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '생명과학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '소프트웨어학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '소프트웨어학부', sub: '객관식 120문항, 주관식 30문항' },
  { name: '수학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '심리학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '약학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '언어학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '에너지공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '영어영문학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '의과대학', sub: '객관식 120문항, 주관식 30문항' },
  { name: '의류학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '인공지능학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '전기전자공학부', sub: '객관식 120문항, 주관식 30문항' },
  { name: '전자공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '정치외교학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '철학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '치의학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '컴퓨터공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '컴퓨터공학부', sub: '객관식 120문항, 주관식 30문항' },
  { name: '컴퓨터과학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '통계학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '행정학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '화학공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '화학공학부', sub: '객관식 120문항, 주관식 30문항' },
  { name: '환경공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '회계학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '물리치료학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '방사선학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '응급구조학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '보건행정학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '항공우주공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '토목공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '건설환경공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '도시공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '조경학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '금융학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '세무학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '관광학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '호텔경영학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '미술학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '음악학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '영상학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '게임학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '패션디자인학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '시각디자인학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '신학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '체육학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '스포츠과학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '한의학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '수의학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '치위생학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '임상병리학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '작업치료학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '언어치료학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '사회체육학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '레저스포츠학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '식품영양학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '식품공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '농업생명과학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '원예학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '산림학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '동물자원학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '해양학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '해양공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '조선공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '지구과학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '지질학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '천문학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '대기과학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '지리학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '역사학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '고고학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '문화재학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '문화콘텐츠학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '신문방송학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '연극영화학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '무용학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '만화애니메이션학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '사진학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '실내디자인학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '산업디자인학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '금속공예학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '도예학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '섬유공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '안전공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '소방방재학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '군사학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '경찰학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '법무행정학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '복지행정학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '국제학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '아동학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '청소년학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '노인복지학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '상담심리학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '특수교육학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '유아교육학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '초등교육학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '수학교육학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '영어교육학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '체육교육학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: 'IT융합학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '드론공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '핀테크학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '빅데이터학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '사이버보안학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '나노공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '재료공학과', sub: '객관식 120문항, 주관식 30문항' },
  { name: '세라믹공학과', sub: '객관식 120문항, 주관식 30문항' },
]

type Choice = { id: string; text: string }
type ObjQ = { id: number; text: string; choices: Choice[]; answer: string; explanation: string; userAnswer: string | null; retryAnswer: string | null }
type SubjQ = { id: number; text: string; userAnswer: string; aiFeedback: string; loadingFeedback: boolean }
type Chapter = { id: number; title: string; objQuestions: ObjQ[]; subjQuestion: SubjQ; done: boolean }

const makeChapters = (dept: string, grade: string): Chapter[] =>
  Array.from({ length: 30 }, (_, i) => ({
    id: i + 1, title: `${i + 1}챕터`, done: false,
    objQuestions: Array.from({ length: 4 }, (_, j) => ({
      id: j + 1,
      text: `[${dept} · ${grade}] ${i + 1}챕터 ${j + 1}번 — ${dept} 관련 핵심 개념 ${i * 4 + j + 1}에 대한 설명으로 옳은 것은?`,
      choices: [
        { id: 'A', text: `${dept} 기초 원리 A에 해당하는 내용` },
        { id: 'B', text: `${dept} 심화 원리 B에 해당하는 내용` },
        { id: 'C', text: `${dept} 응용 원리 C에 해당하는 내용` },
        { id: 'D', text: `${dept} 발전 원리 D에 해당하는 내용` },
      ],
      answer: ['A', 'B', 'C', 'D'][(i + j) % 4],
      explanation: `정답은 ${['A', 'B', 'C', 'D'][(i + j) % 4]}입니다. ${dept} 분야에서 이 개념은 핵심 원리이며 ${grade} 수준에서 반드시 이해해야 합니다.`,
      userAnswer: null, retryAnswer: null,
    })),
    subjQuestion: {
      id: 1,
      text: `[${dept} · ${grade}] ${i + 1}챕터 주관식 — ${dept} 분야의 핵심 개념을 설명하고 본인의 견해를 서술하시오.`,
      userAnswer: '', aiFeedback: '', loadingFeedback: false,
    },
  }))

const MOCK_G3_CHAPTERS: Chapter[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1, title: `생기부 챕터 ${i + 1}`, done: false,
  objQuestions: Array.from({ length: 4 }, (_, j) => ({
    id: j + 1,
    text: `[생기부 기반] ${i + 1}챕터 ${j + 1}번 — 생활기록부에 기재된 탐구활동 관련 개념으로 옳은 것은?`,
    choices: [
      { id: 'A', text: '생기부 관련 개념 A' }, { id: 'B', text: '생기부 관련 개념 B' },
      { id: 'C', text: '생기부 관련 개념 C' }, { id: 'D', text: '생기부 관련 개념 D' },
    ],
    answer: ['A', 'B', 'C', 'D'][(i + j) % 4],
    explanation: `정답은 ${['A', 'B', 'C', 'D'][(i + j) % 4]}입니다.`,
    userAnswer: null, retryAnswer: null,
  })),
  subjQuestion: { id: 1, text: `생기부 ${i + 1}챕터 주관식 — 생활기록부에 기재된 탐구활동을 바탕으로 전공 핵심 개념을 설명하시오.`, userAnswer: '', aiFeedback: '', loadingFeedback: false },
}))

let savedDept = ''
let savedGrade = ''
let savedChapters: Chapter[] = []
let savedChapterId = 1

export default function Major() {
  const navigate = useNavigate()
  const location = useLocation()

  const screen = location.pathname.endsWith('chapter') ? 'chapter'
    : location.pathname.endsWith('grade') ? 'grade'
    : 'dept'

  const [deptSearch, setDeptSearch] = useState('')
  const [selDept, setSelDept] = useState(savedDept)
  const [selGrade, setSelGrade] = useState(savedGrade)
  const [chapters, setChapters] = useState<Chapter[]>(savedChapters)
  const [selChapterId, setSelChapterId] = useState(savedChapterId)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [retryMode, setRetryMode] = useState(false)
  const [retryIndex, setRetryIndex] = useState(0)
  const [subjInput, setSubjInput] = useState('')
  const [bioFile, setBioFile] = useState<File | null>(null)
  const [bioUploaded, setBioUploaded] = useState(false)
  const [bioWaiting, setBioWaiting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const filteredDepts = ALL_DEPTS.filter(d => d.name.includes(deptSearch))
  const selChapter = chapters.find(c => c.id === selChapterId) || chapters[0]
  const allObjAnswered = selChapter?.objQuestions.every(q => q.userAnswer !== null) || false
  const score = selChapter?.objQuestions.filter(q => q.userAnswer === q.answer).length || 0
  const wrongQs = selChapter?.objQuestions.filter(q => q.userAnswer && q.userAnswer !== q.answer) || []

  const selectDept = (d: string) => {
    savedDept = d
    setSelDept(d); setDeptSearch('')
    navigate('/student/major/grade')
  }

  const selectGrade = (g: string) => {
    const chs = g === '고3' ? MOCK_G3_CHAPTERS : makeChapters(selDept, g)
    savedGrade = g; savedChapters = chs; savedChapterId = 1
    setSelGrade(g); setChapters(chs); setSelChapterId(1)
    setCurrentQIndex(0); setRetryMode(false)
    if (g === '고3') { setBioUploaded(false); setBioWaiting(false); setBioFile(null) }
    navigate('/student/major/chapter')
  }

  const handleObjAnswer = (qId: number, choiceId: string) => {
    const updated = chapters.map(ch => ch.id !== selChapterId ? ch : {
      ...ch, objQuestions: ch.objQuestions.map(q => q.id === qId && q.userAnswer === null ? { ...q, userAnswer: choiceId } : q)
    })
    savedChapters = updated; setChapters(updated)
  }

  const handleRetryAnswer = (qId: number, choiceId: string) => {
    const updated = chapters.map(ch => ch.id !== selChapterId ? ch : {
      ...ch, objQuestions: ch.objQuestions.map(q => q.id === qId ? { ...q, retryAnswer: choiceId } : q)
    })
    savedChapters = updated; setChapters(updated)
  }

  const submitSubj = async () => {
    if (!subjInput.trim() || !selChapter) return
    const updated = chapters.map(ch => ch.id !== selChapterId ? ch : {
      ...ch, done: true, subjQuestion: { ...ch.subjQuestion, userAnswer: subjInput, loadingFeedback: true }
    })
    savedChapters = updated; setChapters(updated); setSubjInput('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          system: `당신은 대입 면접 전문 코치입니다. ${selDept} 전공 면접 답변에 대해 구체적이고 건설적인 피드백을 한국어로 200자 내외로 제공하세요.`,
          messages: [{ role: 'user', content: `질문: ${selChapter.subjQuestion.text}\n\n학생 답변: ${subjInput}\n\n피드백을 제공해주세요.` }],
        }),
      })
      const data = await res.json()
      const feedback = data.content?.[0]?.text || '피드백을 불러오지 못했어요.'
      const final = chapters.map(ch => ch.id !== selChapterId ? ch : { ...ch, subjQuestion: { ...ch.subjQuestion, aiFeedback: feedback, loadingFeedback: false } })
      savedChapters = final; setChapters(final)
    } catch {
      const final = chapters.map(ch => ch.id !== selChapterId ? ch : { ...ch, subjQuestion: { ...ch.subjQuestion, aiFeedback: '오류가 발생했어요.', loadingFeedback: false } })
      savedChapters = final; setChapters(final)
    }
  }

  // ── 학과 선택 ──
  if (screen === 'dept') return (
    <div style={{ padding: '24px 28px', height: 'calc(100vh - 50px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>전체 전공</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>총 {filteredDepts.length}개</div>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={deptSearch} onChange={e => setDeptSearch(e.target.value)} placeholder="학과이름 입력해 주세요."
            style={{ width: '100%', height: 40, border: '1px solid #E5E7EB', borderRadius: 20, padding: '0 16px 0 38px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const, color: '#1a1a1a', background: '#fff' }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14 }}>
          {filteredDepts.map(d => (
            <div key={d.name} onClick={() => selectDept(d.name)}
              style={{ background: '#fff', border: '1px solid #F0F0F0', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', position: 'relative', height: 120, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.15s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; el.style.transform = 'translateY(0)' }}>
              <div style={{ position: 'absolute', top: 14, left: 14, right: 70, zIndex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.35, marginBottom: 6 }}>{d.name}</div>
                <div style={{ fontSize: 10, color: '#B0B0B0', lineHeight: 1.4 }}>{d.sub}</div>
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 72, height: 88 }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2 }}>
                  <div style={{ fontSize: 52, lineHeight: 1, opacity: 0.12 }}>👤</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── 학년 선택 ──
  if (screen === 'grade') return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', fontSize: 16 }}>←</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>전공특화문제</div>
      </div>
      <div style={{ background: '#F8F8F8', borderRadius: 16, padding: '18px 22px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: '#EFEFEF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>📚</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{selDept}</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>학년을 선택해주세요</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 }}>
        {[
          { g: '고1', emoji: '🌱', sub: '기초 개념 다지기', desc: '챕터 30개 · 문제 150개', color: '#3B5BDB', bg: '#F0F4FF', border: '#C7D2FE' },
          { g: '고2', emoji: '🌿', sub: '심화 개념 학습', desc: '챕터 30개 · 문제 150개', color: '#059669', bg: '#F0FDF4', border: '#A7F3D0' },
          { g: '고3', emoji: '🎯', sub: '생기부 기반 맞춤', desc: '생기부 업로드 필요', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
        ].map(({ g, emoji, sub, desc, color, bg, border }) => (
          <div key={g} onClick={() => selectGrade(g)}
            style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 16, padding: '28px 20px', textAlign: 'center' as const, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${color}25` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>{emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 6 }}>{g}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16, lineHeight: 1.5 }}>{sub}</div>
            <div style={{ padding: '8px 0', background: '#fff', borderRadius: 10, fontSize: 12, color, fontWeight: 600, border: `1px solid ${border}` }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── 고3 생기부 업로드 ──
  if (screen === 'chapter' && selGrade === '고3' && !bioUploaded) return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', fontSize: 16 }}>←</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>전공특화문제 · 고3</div>
      </div>
      <div style={{ maxWidth: 440, margin: '60px auto', textAlign: 'center' as const }}>
        <div style={{ fontSize: 64, marginBottom: 45 }}>📋</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>생기부를 업로드해주세요</div>
        <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.8, marginBottom: 32 }}>
          고3 전공특화문제는 <strong>본인의 생활기록부</strong>를 바탕으로<br />선생님이 맞춤 질문을 만들어줘요.
        </div>
        <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setBioFile(f); setBioUploaded(true); setBioWaiting(true) } }} />
        <button onClick={() => fileRef.current?.click()}
          style={{ width: '100%', height: 52, background: '#D97706', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
          📎 생기부 PDF 업로드
        </button>
        <div style={{ fontSize: 12, color: '#C0C0C0' }}>PDF 파일만 업로드 가능해요</div>
      </div>
    </div>
  )

  // ── 고3 선생님 대기 ──
  if (screen === 'chapter' && selGrade === '고3' && bioUploaded && bioWaiting) return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', fontSize: 16 }}>←</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>전공특화문제 · 고3</div>
      </div>
      <div style={{ maxWidth: 440, margin: '60px auto', textAlign: 'center' as const }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>업로드 완료!</div>
        <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>📄</span>
          <div style={{ textAlign: 'left' as const }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>{bioFile?.name}</div>
            <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>✓ 업로드 완료</div>
          </div>
        </div>
        <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.8, marginBottom: 20 }}>
          선생님이 생기부를 검토하고<br /><strong style={{ color: '#1a1a1a' }}>맞춤 전공 질문을 만들어주고 있어요.</strong>
        </div>
        <div style={{ background: '#F8F8F8', borderRadius: 12, padding: '14px 18px', fontSize: 13, color: '#9CA3AF' }}>
          💡 질문이 준비되면 알림을 보내드릴게요.
        </div>
        <button onClick={() => setBioWaiting(false)}
          style={{ marginTop: 16, padding: '8px 20px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          (테스트) 질문 받기
        </button>
      </div>
    </div>
  )

  // ── 챕터 풀기 ──
  if (screen === 'chapter' && selChapter) {

    // 틀린문제 다시 풀기
    if (retryMode) {
      const retryQ = wrongQs[retryIndex]
      if (!retryQ) return (
        <div style={{ padding: '60px', textAlign: 'center' as const }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#059669', marginBottom: 8 }}>모든 틀린 문제 완료!</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>수고했어요! 복습을 잘 마쳤어요.</div>
          <button onClick={() => { setRetryMode(false); setRetryIndex(0) }}
            style={{ padding: '12px 36px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            챕터로 돌아가기
          </button>
        </div>
      )
      const answered = retryQ.retryAnswer !== null
      const isCorrect = retryQ.retryAnswer === retryQ.answer
      return (
        <div style={{ padding: '28px 32px', maxWidth: 620, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div onClick={() => { setRetryMode(false); setRetryIndex(0) }} style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', fontSize: 16 }}>←</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>틀린 문제 다시 풀기</div>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9CA3AF', background: '#F3F4F6', padding: '4px 12px', borderRadius: 99 }}>{retryIndex + 1} / {wrongQs.length}</div>
          </div>
          <div style={{ background: '#FFF1F1', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
            ❌ 처음에 틀린 문제예요. 다시 풀어보세요!
          </div>
          <div style={{ background: '#fff', border: '1px solid #F0F0F0', borderRadius: 16, padding: '22px 24px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 11, color: '#C0C0C0', marginBottom: 8, fontWeight: 600 }}>Q{retryQ.id}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.7, marginBottom: 20 }}>{retryQ.text}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {retryQ.choices.map(c => {
                const isSel = retryQ.retryAnswer === c.id
                const isAns = c.id === retryQ.answer
                let bg = '#FAFAFA', border = '#EFEFEF', color = '#374151', labelBg = '#E5E7EB', labelColor = '#6B7280'
                if (answered) {
                  if (isAns) { bg = '#F0FDF4'; border = '#86EFAC'; color = '#166534'; labelBg = '#22C55E'; labelColor = '#fff' }
                  else if (isSel) { bg = '#FFF1F1'; border = '#FECACA'; color = '#991B1B'; labelBg = '#EF4444'; labelColor = '#fff' }
                } else if (isSel) { bg = '#F0F4FF'; border = '#A5B4FC'; color = '#1E40AF'; labelBg = '#6366F1'; labelColor = '#fff' }
                return (
                  <div key={c.id} onClick={() => !answered && handleRetryAnswer(retryQ.id, c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 12, cursor: answered ? 'default' : 'pointer' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: labelBg, color: labelColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{c.id}</div>
                    <span style={{ fontSize: 13, color, fontWeight: isSel ? 600 : 400, flex: 1 }}>{c.text}</span>
                    {answered && isAns && <span style={{ fontSize: 16 }}>✅</span>}
                    {answered && isSel && !isAns && <span style={{ fontSize: 16 }}>❌</span>}
                  </div>
                )
              })}
            </div>
            {answered && (
              <div style={{ marginTop: 16, background: isCorrect ? '#F0FDF4' : '#FFFBEB', border: `1px solid ${isCorrect ? '#86EFAC' : '#FDE68A'}`, borderRadius: 10, padding: '12px 16px', fontSize: 13, color: isCorrect ? '#166534' : '#92400E', lineHeight: 1.7 }}>
                <strong>💡 해설</strong>　{retryQ.explanation}
              </div>
            )}
          </div>
          {answered && (
            retryIndex < wrongQs.length - 1
              ? <button onClick={() => setRetryIndex(i => i + 1)} style={{ width: '100%', height: 48, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>다음 틀린 문제 →</button>
              : <button onClick={() => { setRetryMode(false); setRetryIndex(0) }} style={{ width: '100%', height: 48, background: '#059669', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🎉 복습 완료!</button>
          )}
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', height: 'calc(100vh - 50px)', overflow: 'hidden', background: '#F8F8F8' }}>

        {/* 왼쪽 챕터 사이드바 */}
        <div style={{ width: 210, flexShrink: 0, background: '#fff', borderRight: '1px solid #F0F0F0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #F5F5F5' }}>
            <div onClick={() => navigate(-1)} style={{ fontSize: 11, color: '#9CA3AF', cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>← 학년 선택</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 2 }}>{selDept}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: selGrade === '고1' ? '#3B5BDB' : selGrade === '고2' ? '#059669' : '#D97706', padding: '2px 8px', borderRadius: 99 }}>{selGrade}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>완료 {chapters.filter(c => c.done).length}/{chapters.length}</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
            {chapters.map(ch => (
              <div key={ch.id} onClick={() => { savedChapterId = ch.id; setSelChapterId(ch.id); setCurrentQIndex(0); setRetryMode(false) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, marginBottom: 3, cursor: 'pointer', background: selChapterId === ch.id ? '#F0F4FF' : 'transparent', transition: 'all 0.1s' }}
                onMouseEnter={e => { if (selChapterId !== ch.id) (e.currentTarget as HTMLElement).style.background = '#F8F8F8' }}
                onMouseLeave={e => { if (selChapterId !== ch.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <span style={{ fontSize: 12, fontWeight: selChapterId === ch.id ? 700 : 500, color: selChapterId === ch.id ? '#3B5BDB' : '#374151' }}>{ch.title}</span>
                <span style={{ fontSize: 14, color: ch.done ? '#22C55E' : '#D1D5DB' }}>{ch.done ? '✓' : '○'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽 문제 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* 헤더 */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 22px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>{selDept} · {selGrade} · {selChapter.title}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                {currentQIndex < 4 ? `객관식 ${currentQIndex + 1} / 4` : '주관식'}
              </div>
            </div>
            {/* 진행 표시 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  width: i === currentQIndex ? 28 : 10,
                  height: 10,
                  borderRadius: 99,
                  background: i < currentQIndex ? '#22C55E' : i === currentQIndex ? '#3B5BDB' : '#E5E7EB',
                  transition: 'all 0.25s',
                }} />
              ))}
              <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 4 }}>{currentQIndex + 1}/5</span>
            </div>
          </div>

          {/* 객관식 문제 1개씩 */}
          {currentQIndex < 4 && (() => {
            const q = selChapter.objQuestions[currentQIndex]
            const answered = q.userAnswer !== null
            const correct = q.userAnswer === q.answer
            return (
              <div style={{ background: '#fff', border: `1px solid ${answered ? (correct ? '#86EFAC' : '#FECACA') : '#F0F0F0'}`, borderRadius: 16, padding: '24px 26px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: answered ? (correct ? '#22C55E' : '#EF4444') : '#9CA3AF', padding: '3px 10px', borderRadius: 99 }}>Q{q.id}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#3B5BDB', background: '#F0F4FF', padding: '3px 10px', borderRadius: 99 }}>객관식</span>
                  {answered && <span style={{ fontSize: 11, fontWeight: 700, color: correct ? '#059669' : '#DC2626' }}>{correct ? '✅ 정답' : '❌ 오답'}</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.7, marginBottom: 22 }}>{q.text}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {q.choices.map(c => {
                    const isSel = q.userAnswer === c.id
                    const isAns = c.id === q.answer
                    let bg = '#FAFAFA', border = '#EFEFEF', color = '#374151', labelBg = '#E5E7EB', labelColor = '#6B7280'
                    if (answered) {
                      if (isAns) { bg = '#F0FDF4'; border = '#86EFAC'; color = '#166534'; labelBg = '#22C55E'; labelColor = '#fff' }
                      else if (isSel) { bg = '#FFF1F1'; border = '#FECACA'; color = '#991B1B'; labelBg = '#EF4444'; labelColor = '#fff' }
                    } else if (isSel) { bg = '#F0F4FF'; border = '#A5B4FC'; color = '#1E40AF'; labelBg = '#6366F1'; labelColor = '#fff' }
                    return (
                      <div key={c.id} onClick={() => !answered && handleObjAnswer(q.id, c.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: bg, border: `1px solid ${border}`, borderRadius: 12, cursor: answered ? 'default' : 'pointer', transition: 'all 0.1s' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: labelBg, color: labelColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{c.id}</div>
                        <span style={{ fontSize: 14, color, fontWeight: isSel ? 600 : 400, flex: 1 }}>{c.text}</span>
                        {answered && isAns && <span style={{ fontSize: 16 }}>✅</span>}
                        {answered && isSel && !isAns && <span style={{ fontSize: 16 }}>❌</span>}
                      </div>
                    )
                  })}
                </div>
                {answered && (
                  <>
                    <div style={{ marginTop: 16, background: correct ? '#F0FDF4' : '#FFFBEB', border: `1px solid ${correct ? '#86EFAC' : '#FDE68A'}`, borderRadius: 10, padding: '14px 16px', fontSize: 13, color: correct ? '#166534' : '#92400E', lineHeight: 1.7 }}>
                      <strong>💡 해설</strong>　{q.explanation}
                    </div>
                    <button onClick={() => setCurrentQIndex(i => i + 1)}
                      style={{ width: '100%', height: 48, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 14 }}>
                      {currentQIndex < 3 ? '다음 문제 →' : '주관식 풀기 →'}
                    </button>
                  </>
                )}
              </div>
            )
          })()}

          {/* 주관식 */}
          {currentQIndex === 4 && (
            <div style={{ background: '#fff', border: `1px solid ${selChapter.subjQuestion.userAnswer ? '#FDE68A' : '#F0F0F0'}`, borderRadius: 16, padding: '24px 26px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', background: '#FFFBEB', padding: '3px 10px', borderRadius: 99 }}>주관식</span>
                {selChapter.subjQuestion.userAnswer && <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>✓ 제출 완료</span>}
              </div>
              <div style={{ background: '#F8F8F8', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.7 }}>{selChapter.subjQuestion.text}</div>
              </div>
              {selChapter.subjQuestion.userAnswer ? (
                <div>
                  <div style={{ background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.8, marginBottom: 14 }}>{selChapter.subjQuestion.userAnswer}</div>
                  {selChapter.subjQuestion.loadingFeedback ? (
                    <div style={{ background: '#FFFBEB', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#D97706', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 16, height: 16, border: '2.5px solid #D97706', borderTop: '2.5px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      AI 피드백 생성 중...
                    </div>
                  ) : selChapter.subjQuestion.aiFeedback ? (
                    <>
                      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#92400E', lineHeight: 1.7, marginBottom: 14 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8, color: '#D97706' }}>✨ AI 피드백</div>
                        {selChapter.subjQuestion.aiFeedback}
                      </div>
                      {/* 틀린문제 다시풀기 */}
                      {wrongQs.length > 0 && (
                        <div style={{ background: '#FFF1F1', border: '1px solid #FECACA', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>객관식 {score}/4 · 틀린 문제 {wrongQs.length}개</div>
                          <button onClick={() => { setRetryMode(true); setRetryIndex(0) }}
                            style={{ padding: '8px 16px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            다시 풀기
                          </button>
                        </div>
                      )}
                      {/* 다음 챕터 */}
                      {selChapterId < chapters.length && (
                        <button onClick={() => { const next = selChapterId + 1; savedChapterId = next; setSelChapterId(next); setCurrentQIndex(0); setRetryMode(false) }}
                          style={{ width: '100%', height: 48, background: '#059669', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          🎉 다음 챕터로 →
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              ) : (
                <>
                  <textarea value={subjInput} onChange={e => setSubjInput(e.target.value)}
                    placeholder="답변을 작성해주세요..." rows={5}
                    style={{ width: '100%', border: '1px solid #EFEFEF', borderRadius: 12, padding: '12px 14px', fontSize: 13, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit', lineHeight: 1.7, boxSizing: 'border-box' as const }} />
                  <button onClick={submitSubj} disabled={!subjInput.trim()}
                    style={{ width: '100%', height: 48, background: subjInput.trim() ? '#1a1a1a' : '#E5E7EB', color: subjInput.trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: subjInput.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', marginTop: 12 }}>
                    제출하기
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}