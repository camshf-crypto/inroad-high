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
  const score = selChapter?.objQuestions.filter(q => q.userAnswer === q.answer).length || 0
  const wrongQs = selChapter?.objQuestions.filter(q => q.userAnswer && q.userAnswer !== q.answer) || []

  const selectDept = (d: string) => {
    savedDept = d
    setSelDept(d); setDeptSearch('')
    navigate('/high-student/major/grade')
  }

  const selectGrade = (g: string) => {
    const chs = g === '고3' ? MOCK_G3_CHAPTERS : makeChapters(selDept, g)
    savedGrade = g; savedChapters = chs; savedChapterId = 1
    setSelGrade(g); setChapters(chs); setSelChapterId(1)
    setCurrentQIndex(0); setRetryMode(false)
    if (g === '고3') { setBioUploaded(false); setBioWaiting(false); setBioFile(null) }
    navigate('/high-student/major/chapter')
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

  // ── 1. 학과 선택 ──
  if (screen === 'dept') return (
    <div className="h-full overflow-hidden px-6 py-5 flex flex-col font-sans text-ink">
      <div className="flex-shrink-0 mb-4">
        <div className="text-[20px] font-extrabold text-ink tracking-tight mb-0.5">전체 전공</div>
        <div className="text-[12px] text-ink-muted mb-4 font-medium">총 <span className="text-brand-high-dark font-bold">{filteredDepts.length}개</span></div>
        <div className="relative max-w-[360px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={deptSearch}
            onChange={e => setDeptSearch(e.target.value)}
            placeholder="학과이름 입력해 주세요."
            className="w-full h-11 border border-line rounded-full pl-10 pr-4 text-[13px] outline-none focus:border-brand-high transition-colors font-sans bg-white"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-3 max-md:grid-cols-2">
          {filteredDepts.map(d => (
            <button
              key={d.name}
              onClick={() => selectDept(d.name)}
              className="bg-white border border-line rounded-2xl h-[120px] relative text-left overflow-hidden hover:border-brand-high-light hover:shadow-[0_6px_20px_rgba(37,99,235,0.08)] hover:-translate-y-0.5 transition-all"
            >
              <div className="absolute top-3.5 left-3.5 right-16 z-10">
                <div className="text-[13px] font-bold text-ink leading-snug mb-1.5">{d.name}</div>
                <div className="text-[10px] text-ink-muted leading-relaxed font-medium">{d.sub}</div>
              </div>
              <div className="absolute bottom-0 right-0 w-[72px] h-[88px] flex items-end justify-center pb-0.5">
                <div className="text-[52px] leading-none opacity-[0.12]">👤</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // ── 2. 학년 선택 ──
  if (screen === 'grade') return (
    <div className="px-7 py-6 font-sans text-ink">
      <div className="flex items-center gap-2.5 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-ink-secondary text-base hover:bg-gray-50 hover:border-brand-high-light transition-all"
        >
          ←
        </button>
        <div className="text-[16px] font-bold text-ink tracking-tight">전공특화문제</div>
      </div>

      <div className="bg-gradient-to-br from-brand-high-pale to-white border border-brand-high-light rounded-2xl px-6 py-5 mb-7 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center text-3xl flex-shrink-0 shadow-sm">📚</div>
        <div>
          <div className="text-[16px] font-extrabold text-ink tracking-tight">{selDept}</div>
          <div className="text-[12px] text-ink-secondary mt-1 font-medium">학년을 선택해주세요</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        {[
          { g: '고1', emoji: '🌱', sub: '기초 개념 다지기', desc: '챕터 30개 · 문제 150개', color: 'blue', cls: 'from-blue-50 to-white border-blue-200 hover:shadow-blue-200/50' },
          { g: '고2', emoji: '🌿', sub: '심화 개념 학습', desc: '챕터 30개 · 문제 150개', color: 'emerald', cls: 'from-emerald-50 to-white border-emerald-200 hover:shadow-emerald-200/50' },
          { g: '고3', emoji: '🎯', sub: '생기부 기반 맞춤', desc: '생기부 업로드 필요', color: 'amber', cls: 'from-amber-50 to-white border-amber-200 hover:shadow-amber-200/50' },
        ].map(({ g, emoji, sub, desc, color, cls }) => (
          <button
            key={g}
            onClick={() => selectGrade(g)}
            className={`bg-gradient-to-br border-[1.5px] rounded-2xl p-7 text-center hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(37,99,235,0.15)] transition-all ${cls}`}
          >
            <div className="text-5xl mb-3">{emoji}</div>
            <div className={`text-[24px] font-extrabold mb-1.5 ${
              color === 'blue' ? 'text-blue-700' : color === 'emerald' ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {g}
            </div>
            <div className="text-[12px] text-ink-secondary mb-4 leading-relaxed font-medium">{sub}</div>
            <div className={`py-2 bg-white rounded-lg text-[12px] font-bold border ${
              color === 'blue' ? 'text-blue-700 border-blue-200' : color === 'emerald' ? 'text-emerald-700 border-emerald-200' : 'text-amber-700 border-amber-200'
            }`}>
              {desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // ── 3. 고3 생기부 업로드 ──
  if (screen === 'chapter' && selGrade === '고3' && !bioUploaded) return (
    <div className="px-7 py-6 font-sans text-ink">
      <div className="flex items-center gap-2.5 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-ink-secondary text-base hover:bg-gray-50 transition-all"
        >
          ←
        </button>
        <div className="text-[16px] font-bold text-ink tracking-tight">전공특화문제 · 고3</div>
      </div>

      <div className="max-w-[480px] mx-auto mt-12 text-center">
        <div className="text-7xl mb-10">📋</div>
        <div className="text-[22px] font-extrabold text-ink tracking-tight mb-2.5">생기부를 업로드해주세요</div>
        <div className="text-[14px] text-ink-secondary leading-relaxed mb-8">
          고3 전공특화문제는 <span className="font-bold text-ink">본인의 생활기록부</span>를 바탕으로<br />
          선생님이 맞춤 질문을 만들어줘요.
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setBioFile(f); setBioUploaded(true); setBioWaiting(true) } }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full h-14 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl text-[15px] font-bold shadow-[0_8px_24px_rgba(217,119,6,0.25)] hover:shadow-[0_12px_32px_rgba(217,119,6,0.35)] transition-all mb-2.5"
        >
          📎 생기부 PDF 업로드
        </button>
        <div className="text-[12px] text-ink-muted font-medium">PDF 파일만 업로드 가능해요</div>
      </div>
    </div>
  )

  // ── 4. 고3 선생님 대기 ──
  if (screen === 'chapter' && selGrade === '고3' && bioUploaded && bioWaiting) return (
    <div className="px-7 py-6 font-sans text-ink">
      <div className="flex items-center gap-2.5 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-ink-secondary text-base hover:bg-gray-50 transition-all"
        >
          ←
        </button>
        <div className="text-[16px] font-bold text-ink tracking-tight">전공특화문제 · 고3</div>
      </div>

      <div className="max-w-[480px] mx-auto mt-12 text-center">
        <div className="text-7xl mb-4">⏳</div>
        <div className="text-[22px] font-extrabold text-ink tracking-tight mb-4">업로드 완료!</div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 mb-5 flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <div className="text-left flex-1">
            <div className="text-[13px] font-bold text-emerald-800 truncate">{bioFile?.name}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">✓ 업로드 완료</div>
          </div>
        </div>
        <div className="text-[14px] text-ink-secondary leading-relaxed mb-5">
          선생님이 생기부를 검토하고<br /><span className="font-bold text-ink">맞춤 전공 질문을 만들어주고 있어요.</span>
        </div>
        <div className="bg-brand-high-pale border border-brand-high-light rounded-xl px-5 py-3.5 text-[13px] text-brand-high-dark font-medium">
          💡 질문이 준비되면 알림을 보내드릴게요.
        </div>
        <button
          onClick={() => setBioWaiting(false)}
          className="mt-4 px-5 py-2 bg-gray-100 text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-200 transition-all"
        >
          (테스트) 질문 받기
        </button>
      </div>
    </div>
  )

  // ── 5. 챕터 풀기 ──
  if (screen === 'chapter' && selChapter) {

    // 틀린문제 다시 풀기
    if (retryMode) {
      const retryQ = wrongQs[retryIndex]
      if (!retryQ) return (
        <div className="px-16 py-16 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <div className="text-[22px] font-extrabold text-emerald-600 mb-2 tracking-tight">모든 틀린 문제 완료!</div>
          <div className="text-[14px] text-ink-secondary mb-7 font-medium">수고했어요! 복습을 잘 마쳤어요.</div>
          <button
            onClick={() => { setRetryMode(false); setRetryIndex(0) }}
            className="px-9 py-3 bg-ink text-white rounded-xl text-[14px] font-bold hover:bg-ink-secondary transition-all shadow-lg"
          >
            챕터로 돌아가기
          </button>
        </div>
      )
      const answered = retryQ.retryAnswer !== null
      const isCorrect = retryQ.retryAnswer === retryQ.answer

      return (
        <div className="px-7 py-6 max-w-[680px] mx-auto font-sans text-ink">
          <div className="flex items-center gap-2.5 mb-5">
            <button
              onClick={() => { setRetryMode(false); setRetryIndex(0) }}
              className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-ink-secondary hover:bg-gray-50 transition-all"
            >
              ←
            </button>
            <div className="text-[15px] font-bold text-ink tracking-tight">틀린 문제 다시 풀기</div>
            <div className="ml-auto text-[12px] text-ink-secondary bg-gray-100 px-3 py-1 rounded-full font-semibold">
              {retryIndex + 1} / {wrongQs.length}
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4 text-[12px] text-red-600 font-bold flex items-center gap-2">
            ❌ 처음에 틀린 문제예요. 다시 풀어보세요!
          </div>

          <div className="bg-white border border-line rounded-2xl px-6 py-5 mb-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] text-ink-muted mb-2 font-bold tracking-wider">Q{retryQ.id}</div>
            <div className="text-[14px] font-semibold text-ink leading-relaxed mb-5">{retryQ.text}</div>

            <div className="flex flex-col gap-2.5">
              {retryQ.choices.map(c => {
                const isSel = retryQ.retryAnswer === c.id
                const isAns = c.id === retryQ.answer
                let cls = 'bg-gray-50 border-line text-ink hover:border-brand-high-light'
                let labelCls = 'bg-gray-200 text-ink-secondary'
                if (answered) {
                  if (isAns) { cls = 'bg-emerald-50 border-emerald-300 text-emerald-800'; labelCls = 'bg-emerald-500 text-white' }
                  else if (isSel) { cls = 'bg-red-50 border-red-300 text-red-800'; labelCls = 'bg-red-500 text-white' }
                } else if (isSel) { cls = 'bg-brand-high-pale border-brand-high text-brand-high-dark'; labelCls = 'bg-brand-high text-white' }
                return (
                  <button
                    key={c.id}
                    onClick={() => !answered && handleRetryAnswer(retryQ.id, c.id)}
                    disabled={answered}
                    className={`flex items-center gap-3 px-4 py-3 border rounded-xl transition-all ${cls} ${answered ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-extrabold flex-shrink-0 ${labelCls}`}>
                      {c.id}
                    </div>
                    <span className={`text-[13px] flex-1 text-left ${isSel ? 'font-bold' : 'font-medium'}`}>{c.text}</span>
                    {answered && isAns && <span className="text-base">✅</span>}
                    {answered && isSel && !isAns && <span className="text-base">❌</span>}
                  </button>
                )
              })}
            </div>

            {answered && (
              <div className={`mt-4 border rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <span className="font-bold">💡 해설</span>　{retryQ.explanation}
              </div>
            )}
          </div>

          {answered && (
            retryIndex < wrongQs.length - 1
              ? <button onClick={() => setRetryIndex(i => i + 1)} className="w-full h-12 bg-ink text-white rounded-xl text-[14px] font-bold hover:bg-ink-secondary transition-all shadow-lg">다음 틀린 문제 →</button>
              : <button onClick={() => { setRetryMode(false); setRetryIndex(0) }} className="w-full h-12 bg-emerald-600 text-white rounded-xl text-[14px] font-bold hover:bg-emerald-700 transition-all shadow-lg">🎉 복습 완료!</button>
          )}
        </div>
      )
    }

    return (
      <div className="flex h-full overflow-hidden bg-gray-50 font-sans text-ink">

        {/* 왼쪽 챕터 사이드바 */}
        <div className="w-[220px] flex-shrink-0 bg-white border-r border-line flex flex-col overflow-hidden">
          <div className="px-4 py-4 border-b border-line-light">
            <button
              onClick={() => navigate(-1)}
              className="text-[11px] text-ink-muted hover:text-ink font-semibold mb-2.5 flex items-center gap-1 transition-colors"
            >
              ← 학년 선택
            </button>
            <div className="text-[13px] font-extrabold text-ink tracking-tight mb-0.5">{selDept}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[11px] font-bold text-white px-2 py-0.5 rounded-full ${
                selGrade === '고1' ? 'bg-blue-600' : selGrade === '고2' ? 'bg-emerald-600' : 'bg-amber-600'
              }`}>
                {selGrade}
              </span>
              <span className="text-[11px] text-ink-muted font-medium">완료 {chapters.filter(c => c.done).length}/{chapters.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5">
            {chapters.map(ch => (
              <button
                key={ch.id}
                onClick={() => { savedChapterId = ch.id; setSelChapterId(ch.id); setCurrentQIndex(0); setRetryMode(false) }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg mb-0.5 transition-all text-left ${
                  selChapterId === ch.id
                    ? 'bg-brand-high-pale text-brand-high-dark font-bold'
                    : 'text-ink-secondary hover:bg-gray-50 font-medium'
                }`}
              >
                <span className="text-[12px]">{ch.title}</span>
                <span className={`text-[14px] ${ch.done ? 'text-emerald-500' : 'text-gray-300'}`}>
                  {ch.done ? '✓' : '○'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 오른쪽 문제 */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* 헤더 */}
          <div className="bg-white border border-line rounded-2xl px-5 py-4 mb-5 flex items-center justify-between shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
            <div>
              <div className="text-[16px] font-extrabold text-ink tracking-tight">{selDept} · {selGrade} · {selChapter.title}</div>
              <div className="text-[12px] text-ink-muted mt-1 font-medium">
                {currentQIndex < 4 ? `객관식 ${currentQIndex + 1} / 4` : '주관식'}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`h-2.5 rounded-full transition-all ${
                    i < currentQIndex ? 'w-2.5 bg-emerald-500'
                    : i === currentQIndex ? 'w-7 bg-brand-high'
                    : 'w-2.5 bg-line'
                  }`}
                />
              ))}
              <span className="text-[12px] text-ink-muted ml-1 font-semibold">{currentQIndex + 1}/5</span>
            </div>
          </div>

          {/* 객관식 */}
          {currentQIndex < 4 && (() => {
            const q = selChapter.objQuestions[currentQIndex]
            const answered = q.userAnswer !== null
            const correct = q.userAnswer === q.answer
            return (
              <div className={`bg-white rounded-2xl px-7 py-6 shadow-[0_1px_4px_rgba(15,23,42,0.03)] border ${
                answered ? (correct ? 'border-emerald-300' : 'border-red-300') : 'border-line'
              }`}>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className={`text-[11px] font-extrabold text-white px-2.5 py-1 rounded-full ${
                    answered ? (correct ? 'bg-emerald-500' : 'bg-red-500') : 'bg-ink-muted'
                  }`}>
                    Q{q.id}
                  </span>
                  <span className="text-[11px] font-bold text-brand-high-dark bg-brand-high-pale px-2.5 py-1 rounded-full">객관식</span>
                  {answered && (
                    <span className={`text-[11px] font-bold ${correct ? 'text-emerald-600' : 'text-red-600'}`}>
                      {correct ? '✅ 정답' : '❌ 오답'}
                    </span>
                  )}
                </div>

                <div className="text-[15px] font-semibold text-ink leading-relaxed mb-5">{q.text}</div>

                <div className="flex flex-col gap-2.5">
                  {q.choices.map(c => {
                    const isSel = q.userAnswer === c.id
                    const isAns = c.id === q.answer
                    let cls = 'bg-gray-50 border-line text-ink hover:border-brand-high-light'
                    let labelCls = 'bg-gray-200 text-ink-secondary'
                    if (answered) {
                      if (isAns) { cls = 'bg-emerald-50 border-emerald-300 text-emerald-800'; labelCls = 'bg-emerald-500 text-white' }
                      else if (isSel) { cls = 'bg-red-50 border-red-300 text-red-800'; labelCls = 'bg-red-500 text-white' }
                    } else if (isSel) { cls = 'bg-brand-high-pale border-brand-high text-brand-high-dark'; labelCls = 'bg-brand-high text-white' }
                    return (
                      <button
                        key={c.id}
                        onClick={() => !answered && handleObjAnswer(q.id, c.id)}
                        disabled={answered}
                        className={`flex items-center gap-3 px-4 py-3.5 border rounded-xl transition-all ${cls} ${answered ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-extrabold flex-shrink-0 ${labelCls}`}>
                          {c.id}
                        </div>
                        <span className={`text-[14px] flex-1 text-left ${isSel ? 'font-bold' : 'font-medium'}`}>{c.text}</span>
                        {answered && isAns && <span className="text-base">✅</span>}
                        {answered && isSel && !isAns && <span className="text-base">❌</span>}
                      </button>
                    )
                  })}
                </div>

                {answered && (
                  <>
                    <div className={`mt-4 border rounded-xl px-4 py-3.5 text-[13px] leading-relaxed ${
                      correct ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      <span className="font-bold">💡 해설</span>　{q.explanation}
                    </div>
                    <button
                      onClick={() => setCurrentQIndex(i => i + 1)}
                      className="w-full h-12 bg-ink text-white rounded-xl text-[14px] font-bold mt-3.5 hover:bg-ink-secondary transition-all shadow-lg"
                    >
                      {currentQIndex < 3 ? '다음 문제 →' : '주관식 풀기 →'}
                    </button>
                  </>
                )}
              </div>
            )
          })()}

          {/* 주관식 */}
          {currentQIndex === 4 && (
            <div className={`bg-white rounded-2xl px-7 py-6 shadow-[0_1px_4px_rgba(15,23,42,0.03)] border ${
              selChapter.subjQuestion.userAnswer ? 'border-amber-300' : 'border-line'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">주관식</span>
                {selChapter.subjQuestion.userAnswer && (
                  <span className="text-[11px] text-emerald-600 font-bold">✓ 제출 완료</span>
                )}
              </div>

              <div className="bg-gray-50 border border-line-light rounded-xl px-4 py-3.5 mb-5">
                <div className="text-[15px] font-semibold text-ink leading-relaxed">{selChapter.subjQuestion.text}</div>
              </div>

              {selChapter.subjQuestion.userAnswer ? (
                <div>
                  <div className="bg-gray-50 border border-line-light rounded-xl px-4 py-3 text-[13px] text-ink leading-relaxed mb-3.5">
                    {selChapter.subjQuestion.userAnswer}
                  </div>

                  {selChapter.subjQuestion.loadingFeedback ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-[13px] text-amber-700 font-semibold flex items-center gap-2.5">
                      <div className="w-4 h-4 border-[2.5px] border-amber-500 border-t-transparent rounded-full animate-spin" />
                      AI 피드백 생성 중...
                    </div>
                  ) : selChapter.subjQuestion.aiFeedback ? (
                    <>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-[13px] text-amber-900 leading-relaxed mb-3.5">
                        <div className="font-extrabold mb-2 text-amber-700">✨ AI 피드백</div>
                        {selChapter.subjQuestion.aiFeedback}
                      </div>

                      {wrongQs.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 flex items-center justify-between mb-3.5">
                          <div className="text-[13px] font-bold text-red-600">
                            객관식 {score}/4 · 틀린 문제 {wrongQs.length}개
                          </div>
                          <button
                            onClick={() => { setRetryMode(true); setRetryIndex(0) }}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg text-[12px] font-bold hover:bg-red-600 transition-all shadow-sm"
                          >
                            다시 풀기
                          </button>
                        </div>
                      )}

                      {selChapterId < chapters.length && (
                        <button
                          onClick={() => { const next = selChapterId + 1; savedChapterId = next; setSelChapterId(next); setCurrentQIndex(0); setRetryMode(false) }}
                          className="w-full h-12 bg-emerald-600 text-white rounded-xl text-[14px] font-bold hover:bg-emerald-700 transition-all shadow-lg"
                        >
                          🎉 다음 챕터로 →
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              ) : (
                <>
                  <textarea
                    value={subjInput}
                    onChange={e => setSubjInput(e.target.value)}
                    placeholder="답변을 작성해주세요..."
                    rows={5}
                    className="w-full border border-line rounded-xl px-3.5 py-3 text-[13px] outline-none resize-y leading-relaxed focus:border-brand-high transition-colors font-sans"
                  />
                  <button
                    onClick={submitSubj}
                    disabled={!subjInput.trim()}
                    className={`w-full h-12 rounded-xl text-[14px] font-bold mt-3 transition-all ${
                      subjInput.trim()
                        ? 'bg-ink text-white hover:bg-ink-secondary shadow-lg'
                        : 'bg-gray-200 text-ink-muted cursor-not-allowed'
                    }`}
                  >
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