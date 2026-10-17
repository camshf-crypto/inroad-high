// 현장 모의면접 — 원장이 학생 최대 6명을 한 조로 진행
//   준비: 학생 고르기 + 면접 설정(대학·학과·유형·조)
//   진행: 학생 칸 누르기 → 미리 뽑힌 질문 읽기 → 녹음 시작/끝 → AI가 받아 적고 나누고 피드백(자동)
//   저장: high_mock_exam_questions (본 질문 = 회차의 5문항, 꼬리질문 = tail, 추가 질문 = main 뒤에)
//   학생에게는 아직 안 보임 — 학생 상세 > 면접 모의고사 탭에서 선생님이 확인하고 보낸다.

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAcademyStudents } from '@/pages/admin/_hooks/useAcademyStudents'
import { useCreateMockExam, useOpenMockExam } from '@/pages/admin/_hooks/useHighMockExam'
import { getFixedQuestions } from '@/lib/mockExam/fixedQuestions'

const MAX_STUDENTS = 6
const EXTRA_COMMON = [
  '우리 학교(학과)에 지원한 이유는 무엇인가요?',
  '고등학교 생활에서 가장 기억에 남는 활동은 무엇인가요?',
  '친구와 의견이 달랐을 때 어떻게 해결했나요?',
  '입학 후 공부 계획을 말해 보세요.',
  '마지막으로 하고 싶은 말이 있나요?',
]
const TAG_LEVEL: Record<string, { bg: string; color: string; bar: string; width: string }> = {
  '상': { bg: '#DBEAFE', color: '#1D4ED8', bar: '#2563EB', width: '100%' },
  '중': { bg: '#F1F5F9', color: '#334155', bar: '#2563EB', width: '62%' },
  '하': { bg: '#FFEDD5', color: '#C2410C', bar: '#F97316', width: '28%' },
}

interface Eval { eye?: string; posture?: string; confidence?: string; memo?: string }
interface Seat {
  student: any
  exam: any
  rows: any[]          // 본 질문 (order 순)
  tails: any[]         // 꼬리질문
  pos: number          // 지금 읽을 본 질문 index
  saenggibu: string[]  // 바꾸기용 생기부 예상질문 (발행된 것)
  past: string[]       // 이 학생 대학·학과·전형의 기출문제
  concept: string      // 학생 컨셉 (진로계열검사 학과 · 직업 · 목표 대학)
}
interface Target { univ: string; major: string; track: string }
interface Src { sg: boolean; past: boolean; sgN: number; pastN: number }
const MAX_EACH = 5
interface PoolItem { type: string; text: string }
interface Job {
  id: string
  studentId: string
  name: string
  rowId: string | null  // 분석 중인 본 질문 줄 (추가 질문이면 null)
  label: string
  status: 'running' | 'error'
  error?: string
}
interface RecCtx {
  studentId: string
  rowId: string | null
  contParentId: string | null
  mode: null | 'custom' | 'voice'
  qText: string
  qTag: string
  customText: string
  recId: string           // 이번 녹음 번호 (학생 핸드폰 녹음과 짝 맞추기)
  phone: boolean          // 학생 핸드폰도 같이 녹음했나
  wmic: number | null     // 무선 마이크 번호 (1~6) — 쓰면 핸드폰 대신 이걸로
  facePhone: boolean      // 학생 핸드폰이 켜져 있어서 얼굴 분석을 받나
  startedAt: number       // 원장 노트북 녹음 시작 시각
}
interface LastResult {
  pairs: any[]         // [{ label, kind, question, answer, lines, feedback }] — 본 질문 + 꼬리질문들
  followUps: string[]  // 마지막 대답 기준 더 물어볼 만한 꼬리질문 (참고)
  parentId: string     // 꼬리질문이 붙은 본 질문 id
  createdIds: string[] // 이번 녹음으로 새로 만든 줄 (다시 녹음할 때 지움)
  face?: any           // 학생 핸드폰 얼굴 분석 (시선·표정·움직임 숫자)
}

// 얼굴 분석 숫자 → 한눈에 보는 칸
function FaceBox({ f }: { f: any }) {
  if (!f) return null
  const warn = (bad: boolean) => (bad ? { background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' } : { background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' })
  const items = [
    { k: '시선', v: `${f.gazePct}%`, sub: f.downPct >= 25 ? `아래 ${f.downPct}%` : '', bad: f.gazePct < 60 },
    { k: '미소', v: `${f.smilePct}%`, sub: '', bad: f.smilePct < 5 },
    { k: '찌푸림', v: `${f.browPct}%`, sub: '', bad: f.browPct >= 25 },
    { k: '고개 움직임', v: `${f.moves}번`, sub: `1분 ${f.movesPerMin}번`, bad: f.movesPerMin >= 12 },
    { k: '눈 깜빡임', v: `1분 ${f.blinkPerMin}번`, sub: '', bad: f.blinkPerMin >= 35 },
    { k: '처음 10초', v: f.earlyTensePct >= 50 ? '굳음' : '괜찮음', sub: '', bad: f.earlyTensePct >= 50 },
  ]
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold text-ink">표정 · 시선 <span className="text-[11.5px] font-medium text-slate-500">학생 핸드폰 카메라 · {f.sec}초</span></div>
        {f.facePct < 60 && <span className="text-[11.5px] font-semibold text-amber-700">얼굴이 {f.facePct}%만 잡혔어요</span>}
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
        {items.map(it => (
          <div key={it.k} className="rounded-lg px-2.5 py-2" style={warn(it.bad)}>
            <div className="text-[11px] font-semibold opacity-80">{it.k}</div>
            <div className="text-[14px] font-extrabold">{it.v}</div>
            {it.sub && <div className="text-[10.5px] opacity-80">{it.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)

// 회차 테이블 이름이 확정되기 전까지 두 이름을 차례로 시도 (설정·원장 평가 저장용)
async function updateExam(id: string, patch: Record<string, any>) {
  for (const t of ['high_mock_exam']) {
    const { error } = await supabase.from(t).update(patch).eq('id', id)
    if (!error) return true
  }
  console.warn('[LiveInterview] 회차 저장 실패 (SQL 실행 전이면 정상)', patch)
  return false
}

// 질문 출처 + 개수 고르기 (생기부 예상질문 / 기출문제)
function SrcPicker({ src, sgHave, pastHave, onChange }: { src: Src; sgHave?: number; pastHave?: number; onChange: (p: Partial<Src>) => void }) {
  const items = [
    { key: 'sg' as const, nKey: 'sgN' as const, label: '생기부 예상질문' },
    { key: 'past' as const, nKey: 'pastN' as const, label: '기출문제' },
  ]
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {items.map(it => {
        const on = src[it.key]
        return (
          <span key={it.key} className="inline-flex items-center rounded-lg overflow-hidden"
            style={{ border: `1px solid ${on ? '#0F172A' : '#CBD5E1'}` }}>
            <button type="button" onClick={() => onChange({ [it.key]: !on } as Partial<Src>)}
              className="h-8 px-2.5 text-[12.5px] font-bold"
              style={on ? { background: '#0F172A', color: '#fff' } : { background: '#fff', color: '#64748B' }}>
              {on ? '✓ ' : ''}{it.label}{it.key === 'sg' && sgHave !== undefined ? ` (${sgHave})` : ''}{it.key === 'past' && pastHave !== undefined ? ` (${pastHave})` : ''}
            </button>
            {on && (
              <>
                <button type="button" onClick={() => onChange({ [it.nKey]: src[it.nKey] - 1 } as Partial<Src>)}
                  className="w-7 h-8 bg-white text-[15px] font-bold text-slate-600" aria-label={`${it.label} 줄이기`}>−</button>
                <span className="w-6 text-center text-[13px] font-extrabold bg-white leading-8">{src[it.nKey]}</span>
                <button type="button" onClick={() => onChange({ [it.nKey]: src[it.nKey] + 1 } as Partial<Src>)}
                  className="w-7 h-8 bg-white text-[15px] font-bold text-slate-600" aria-label={`${it.label} 늘리기`}>+</button>
              </>
            )}
          </span>
        )
      })}
    </span>
  )
}


// 컨셉 맞춤 + 말버릇 (군말 횟수 · 반복 습관)
function ConceptHabits({ fb }: { fb: any }) {
  const fillers = Object.entries((fb?.fillers ?? {}) as Record<string, number>).sort((a, b) => b[1] - a[1])
  const habits: string[] = fb?.habits ?? []
  const c = fb?.concept as { level: string; comment: string } | null | undefined
  const face = fb?.face as { comment: string; tip: string } | null | undefined
  if (!c && !fillers.length && !habits.length && !face) return null
  const lv: Record<string, [string, string]> = { '상': ['#DBEAFE', '#1D4ED8'], '중': ['#F1F5F9', '#334155'], '하': ['#FFEDD5', '#C2410C'] }
  const [cbg, cfg] = c ? (lv[c.level] ?? lv['중']) : lv['중']
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-3">
      {c && (
        <div className="flex items-start gap-2">
          <span className="text-[11.5px] font-extrabold px-2 py-0.5 rounded-md flex-shrink-0" style={{ background: cbg, color: cfg }}>컨셉 {c.level}</span>
          <span className="text-[13px] leading-[1.6] text-slate-700">
            {c.comment}{fb?.conceptText ? <span className="text-slate-400"> · {fb.conceptText}</span> : null}
          </span>
        </div>
      )}
      {(fillers.length > 0 || habits.length > 0) && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[12px] font-bold text-slate-600">말버릇</div>
          {fillers.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {fillers.map(([w, n]) => (
                <span key={w} className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-300 text-slate-700">“{w}” {n}번</span>
              ))}
            </div>
          )}
          {habits.map(h => <div key={h} className="text-[12.5px] text-slate-600 leading-[1.5]">· {h}</div>)}
        </div>
      )}
      {face && (
        <div className="flex flex-col gap-1">
          <div className="text-[12px] font-bold text-slate-600">표정 · 시선</div>
          <div className="text-[13px] leading-[1.6] text-slate-700">{face.comment}</div>
          {face.tip && <div className="text-[12.5px] leading-[1.5] text-blue-700">→ {face.tip}</div>}
        </div>
      )}
    </div>
  )
}

function MicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
    </svg>
  )
}

const Q1_INTRODUCTION = '본인을 소개해주세요.'

export default function LiveInterview({ grade, onClose, onPick, resumeExams }: {
  grade: string
  onClose: () => void
  onPick?: (examId: string) => void   // 끝내기 창에서 "고쳐서 보내기" → 그 학생 결과 열기
  resumeExams?: any[]                  // 목록에서 "이어서 하기" → 그때 기록에 이어서 진행
}) {
  // 현장 모의면접 한 번 = 학생마다 기록 1개 (이름: "10월 9일 1조")
  const createExam = useCreateMockExam()
  const openExam = useOpenMockExam()
  const today = new Date()
  const period = `${today.getMonth() + 1}월 ${today.getDate()}일`
  // ───────── 준비 ─────────
  const { data: academyStudents = [] } = useAcademyStudents('high') as any
  const candidates = useMemo(
    () => (academyStudents as any[]).filter(s => (s.grade ?? '') === grade).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [academyStudents, grade],
  )
  const [step, setStep] = useState<'setup' | 'live'>('setup')
  const [picked, setPicked] = useState<string[]>(() => (resumeExams ?? []).map(e => e.student_id))
  // 학생별 지원 대학 · 학과 · 전형
  const [targets, setTargets] = useState<Record<string, Target>>(() => {
    const m: Record<string, Target> = {}
    ;(resumeExams ?? []).forEach(e => { m[e.student_id] = { univ: e.target_univ ?? '', major: e.target_major ?? '', track: e.interview_type ?? '' } })
    return m
  })
  const tgOf = (id: string): Target => targets[id] ?? { univ: '', major: '', track: '' }
  const setTg = (id: string, patch: Partial<Target>) => setTargets(t => ({ ...t, [id]: { ...tgOf(id), ...patch } }))
  // ── 기출문제 목록 (past_questions) : 대학 → 학과 → 전형 → 개수 ──
  const [pastIdx, setPastIdx] = useState<Record<string, Record<string, Record<string, number>>>>({})
  const [pastLoading, setPastLoading] = useState(true)
  useEffect(() => {
    void (async () => {
      const idx: Record<string, Record<string, Record<string, number>>> = {}
      const add = (u: string, m: string, t: string, n: number) => {
        if (!u || !m) return
        idx[u] ??= {}; idx[u][m] ??= {}
        idx[u][m][t || '전형 미지정'] = (idx[u][m][t || '전형 미지정'] ?? 0) + n
      }
      // 1) 묶음 뷰가 있으면 한 번에 (SQL 실행 후)
      const { data: v, error: vErr } = await supabase.from('past_question_targets')
        .select('university, major, admission_type, n').range(0, 9999)
      if (!vErr && v) {
        v.forEach((r: any) => add((r.university ?? '').trim(), (r.major ?? '').trim(), (r.admission_type ?? '').trim(), Number(r.n) || 0))
      } else {
        // 2) 없으면 원본을 1000줄씩 읽어서 셈
        for (let from = 0; from < 100000; from += 1000) {
          const { data, error } = await supabase.from('past_questions')
            .select('university, major, admission_type').range(from, from + 999)
          if (error || !data?.length) break
          data.forEach((r: any) => add((r.university ?? '').trim(), (r.major ?? '').trim(), (r.admission_type ?? '').trim(), 1))
          if (data.length < 1000) break
        }
      }
      setPastIdx(idx)
      setPastLoading(false)
    })()
  }, [])
  const univList = useMemo(() => Object.keys(pastIdx).sort((a, b) => a.localeCompare(b)), [pastIdx])
  const majorsOf = (u: string) => Object.keys(pastIdx[u] ?? {}).sort((a, b) => a.localeCompare(b))
  const tracksOf = (u: string, m: string) => Object.keys(pastIdx[u]?.[m] ?? {}).sort((a, b) => a.localeCompare(b))
  const pastCountOf = (id: string) => {
    const t = tgOf(id)
    const byTrack = pastIdx[t.univ]?.[t.major] ?? {}
    return t.track ? (byTrack[t.track] ?? 0) : Object.values(byTrack).reduce((a, b) => a + b, 0)
  }
  const tgReady = (id: string) => !!(pastIdx[tgOf(id).univ]?.[tgOf(id).major])
  const [group, setGroup] = useState(resumeExams?.[0]?.live_group ?? '1조')
  const [preparing, setPreparing] = useState('')

  const togglePick = (id: string) => {
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : p.length >= MAX_STUDENTS ? p : [...p, id]))
  }
  // 지난 현장 모의면접에서 적어 둔 대학·학과·전형이 있으면 채워 둠
  const [prefilled, setPrefilled] = useState<Record<string, boolean>>({})

  // ── 이어서 하기: 목록에서 넘겨받은 기록 + 오늘 같은 조 이름으로 이미 시작한 기록 ──
  const sessionLabel = `${period}${group.trim() ? ' ' + group.trim() : ''}`
  const [todayExams, setTodayExams] = useState<Record<string, any>>({})
  const [resumeMode, setResumeMode] = useState<'resume' | 'new'>('resume')
  useEffect(() => {
    if (!picked.length) { setTodayExams({}); return }
    let alive = true
    void (async () => {
      const { data } = await supabase.from('high_mock_exam').select('*')
        .in('student_id', picked).eq('grade', grade).like('period', `${sessionLabel}%`)
        .not('live_at', 'is', null).order('live_at', { ascending: false })
      if (!alive) return
      const m: Record<string, any> = {}
      ;(data ?? []).forEach((e: any) => { if (!m[e.student_id]) m[e.student_id] = e })
      setTodayExams(m)
    })()
    return () => { alive = false }
  }, [picked.join(','), sessionLabel])
  const resumeOf = (id: string): any | null => {
    const fromList = (resumeExams ?? []).find(e => e.student_id === id)
    if (fromList) return fromList
    return resumeMode === 'resume' ? todayExams[id] ?? null : null
  }
  const resumableNames = picked.filter(id => todayExams[id] && !(resumeExams ?? []).some(e => e.student_id === id))
  useEffect(() => {
    const need = picked.filter(id => !prefilled[id])
    if (!need.length) return
    void (async () => {
      const { data } = await supabase.from('high_mock_exam')
        .select('student_id, target_univ, target_major, interview_type, live_at')
        .in('student_id', need).not('live_at', 'is', null)
        .order('live_at', { ascending: false })
      const seen: Record<string, boolean> = {}
      ;(data ?? []).forEach((e: any) => {
        if (seen[e.student_id] || !e.target_univ) return
        seen[e.student_id] = true
        setTargets(t => (t[e.student_id] ? t : { ...t, [e.student_id]: { univ: e.target_univ ?? '', major: e.target_major ?? '', track: e.interview_type ?? '' } }))
      })
      setPrefilled(p => { const n = { ...p }; need.forEach(id => { n[id] = true }); return n })
    })()
  }, [picked])

  // 학생별 질문 출처 — 생기부 면접 학교는 생기부 예상질문, 기출만 보는 학교는 기출만
  const [srcs, setSrcs] = useState<Record<string, Src>>({})
  // 면접 설정의 기본값 → 학생 카드에서 따로 바꾸면 그 학생만
  const [defSrc, setDefSrc] = useState<Src>({ sg: true, past: true, sgN: 2, pastN: 2 })
  const srcOf = (id: string): Src => srcs[id] ?? defSrc
  const fixSrc = (now: Src, patch: Partial<Src>): Src | null => {
    const next = { ...now, ...patch }
    next.sgN = Math.max(1, Math.min(MAX_EACH, next.sgN))
    next.pastN = Math.max(1, Math.min(MAX_EACH, next.pastN))
    return !next.sg && !next.past ? null : next // 둘 다 끌 수는 없음
  }
  const changeSrc = (id: string | null, patch: Partial<Src>) => {
    if (id === null) { const n = fixSrc(defSrc, patch); if (n) setDefSrc(n); return }
    const n = fixSrc(srcOf(id), patch)
    if (n) setSrcs(s => ({ ...s, [id]: n }))
  }
  const countOf = (src: Src) => (src.sg ? src.sgN : 0) + (src.past ? src.pastN : 0)

  // 고른 학생의 발행된 생기부 예상질문 개수 (카드에 표시)
  const [sgCount, setSgCount] = useState<Record<string, number>>({})
  useEffect(() => {
    const need = picked.filter(id => !(id in sgCount))
    if (!need.length) return
    void (async () => {
      const { data } = await supabase.from('high_saenggibu_questions')
        .select('student_id').in('student_id', need).eq('question_status', 'published')
      const cnt: Record<string, number> = {}
      need.forEach(id => { cnt[id] = 0 })
      ;(data ?? []).forEach((r: any) => { cnt[r.student_id] = (cnt[r.student_id] ?? 0) + 1 })
      setSgCount(c => ({ ...c, ...cnt }))
    })()
  }, [picked])

  // ───────── 진행 ─────────
  const [seats, setSeats] = useState<Seat[]>([])
  const [sel, setSel] = useState(0)
  const [mode, setMode] = useState<null | 'custom' | 'voice'>(null)
  const [customText, setCustomText] = useState('')
  // 대답이 끝난 본 질문에 이어서 꼬리질문만 더 녹음할 때
  const [cont, setCont] = useState<null | { parentId: string }>(null)
  const [fbTab, setFbTab] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'rec'>('idle')
  const [sec, setSec] = useState(0)
  // AI 분석은 뒤에서 돌아감 — 원장은 기다리지 않고 바로 다음 질문·다음 학생 진행
  const [lastBy, setLastBy] = useState<Record<string, LastResult>>({})   // 학생별 마지막 결과
  const [jobs, setJobs] = useState<Job[]>([])                              // 분석 중·실패한 녹음
  const [evals, setEvals] = useState<Record<string, Eval>>({})
  const [err, setErr] = useState('')

  const streamRef = useRef<MediaStream | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const seatsRef = useRef<Seat[]>([])
  useEffect(() => { seatsRef.current = seats }, [seats])
  const selIdRef = useRef('')

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  // 기출 질문 풀 — 그 학생 대학·학과·전형 기출 → (모자라면) 회차 고정 질문 → 공통 질문
  const pastPool = (past: string[]): PoolItem[] => [
    ...shuffle(past).map(text => ({ type: '기출', text })),
    ...getFixedQuestions(grade, period).map((f: any) => ({ type: f.type || '공통', text: f.questionText })),
    ...EXTRA_COMMON.map(text => ({ type: '공통', text })),
  ]

  const seat = seats[sel]
  const cur = seat?.rows[seat.pos]
  const answered = (r: any) => !!r?.student_answer

  // 시작: 회차 준비(없으면 생성) → 질문 불러오기 → 생기부 풀 → 마이크
  const start = async () => {
    setErr('')
    try {
      setPreparing('마이크 연결 중…')
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })

      const list = picked.map(id => candidates.find(c => c.id === id) || { id })
      const exams: Record<string, any> = {}
      const resumed: Record<string, boolean> = {}
      for (const s of list) {
        setPreparing(`${s.name ?? ''} 질문 준비 중…`)
        const old = resumeOf(s.id)
        if (old) {
          // 이어서 하기 — 그때 기록 그대로 (답한 질문·남은 질문 유지)
          exams[s.id] = old
          resumed[s.id] = true
          continue
        }
        // 새로 시작 — 같은 날 같은 조 이름이 있으면 "(2회)", "(3회)"를 붙여서 새 기록
        let ex: any = null
        for (let n = 1; n <= 9 && !ex; n++) {
          const label = n === 1 ? sessionLabel : `${sessionLabel} (${n}회)`
          try {
            ex = await createExam.mutateAsync({
              studentId: s.id, grade, period: label,
              examType: '현장 모의면접', majorLevel: null, aiGenerated: false,
            } as any)
          } catch (e: any) {
            if (!String(e?.message ?? e).includes('이미')) throw e
          }
        }
        if (!ex) throw new Error(`${s.name ?? ''} 기록을 만들지 못했어요`)
        await openExam.mutateAsync(ex.id)
        const { error: introErr } = await supabase.from('high_mock_exam_questions').insert({
          exam_id: ex.id, student_id: s.id, order: 1, level: 'main', parent_id: null, tail_index: null,
          type: '자기소개', question_text: Q1_INTRODUCTION, ai_generated: false, time_limit_sec: 120,
        })
        if (introErr) throw introErr
        exams[s.id] = ex
        await updateExam(ex.id, {
          target_univ: tgOf(s.id).univ.trim() || null,
          target_major: tgOf(s.id).major.trim() || null,
          interview_type: tgOf(s.id).track.trim() || null,
          live_group: group.trim() || null,
          live_at: new Date().toISOString(),
        })
      }

      setPreparing('질문 불러오는 중…')
      const examIds = Object.values(exams).map((e: any) => e.id)
      const { data: qRows, error: qErr } = await supabase
        .from('high_mock_exam_questions').select('*').in('exam_id', examIds)
      if (qErr) throw qErr

      // 학생 컨셉 — 진로계열검사에서 정한 학과·직업·목표 대학 (이 학년 줄 우선)
      const { data: cRows } = await supabase.from('student_concept')
        .select('student_id, grade, major, university, career').in('student_id', list.map(s => s.id))
      const conceptOf = (id: string) => {
        const mine = (cRows ?? []).filter((r: any) => r.student_id === id)
        const r: any = mine.find((x: any) => x.grade === grade) ?? mine[0]
        if (!r) return ''
        return [r.major && `희망 학과 ${r.major}`, r.career && `희망 직업 ${r.career}`, r.university && `목표 대학 ${r.university}`].filter(Boolean).join(' · ')
      }

      const { data: sgRows } = await supabase
        .from('high_saenggibu_questions')
        .select('student_id, question, teacher_edited_question')
        .in('student_id', list.map(s => s.id))
        .eq('question_status', 'published')

      setPreparing('학생별 질문 배정 중…')
      const next: Seat[] = []
      for (const s of list) {
        const ex = exams[s.id]
        const mine = (qRows ?? []).filter((r: any) => r.exam_id === ex.id)
        let rows = mine.filter((r: any) => r.level === 'main').sort((a: any, b: any) => a.order - b.order)
        const tails = mine.filter((r: any) => r.level !== 'main')
        const tg = tgOf(s.id)
        let pq = supabase.from('past_questions').select('question')
          .eq('university', tg.univ).eq('major', tg.major)
        if (tg.track && tg.track !== '전형 미지정') pq = pq.eq('admission_type', tg.track)
        const { data: pRows, error: pErr } = await pq.range(0, 999)
        if (pErr) throw pErr
        const past: string[] = [...new Set((pRows ?? []).map((r: any) => (r.question ?? '').trim()).filter(Boolean))] as string[]
        const saenggibu: string[] = (sgRows ?? [])
          .filter((r: any) => r.student_id === s.id)
          .map((r: any) => (r.teacher_edited_question?.trim() || r.question || '').trim())
          .filter(Boolean)

        // 이어서 하기는 그때 뽑힌 질문 그대로 (질문이 자기소개만 있으면 새로 배정)
        if (!resumed[s.id] || rows.length <= 1) {
          // 자기소개(1번) 뒤 자리를 고른 출처·개수대로 랜덤 배정 (답한 질문은 그대로)
          const src = srcOf(s.id)
          const want: ('sg' | 'past')[] = [
            ...Array(src.sg ? src.sgN : 0).fill('sg'),
            ...Array(src.past ? src.pastN : 0).fill('past'),
          ]
          const used = new Set(rows.map((r: any) => r.question_text))
          const sgLeft = shuffle(saenggibu.filter(t => !used.has(t)))
          const pastLeft = pastPool(past).filter(p => !used.has(p.text))
          const take = (w: 'sg' | 'past'): PoolItem | undefined => {
            if (w === 'sg') { const t = sgLeft.shift(); return t ? { type: '생기부', text: t } : pastLeft.shift() }
            return pastLeft.shift()
          }
          for (let k = 0; k < want.length; k++) {
            const order = k + 2
            const row = rows.find((r: any) => r.order === order)
            if (row?.student_answer) continue
            if (row) {
              const isSg = row.type === '생기부'
              if ((want[k] === 'sg') === isSg) continue
              const item = take(want[k])
              if (!item) continue
              const { error: uErr } = await supabase.from('high_mock_exam_questions')
                .update({ type: item.type, question_text: item.text }).eq('id', row.id)
              if (uErr) throw uErr
              row.type = item.type; row.question_text = item.text
            } else {
              const item = take(want[k])
              if (!item) continue
              const { data: ins, error: iErr } = await supabase.from('high_mock_exam_questions').insert({
                exam_id: ex.id, student_id: s.id, order, level: 'main', parent_id: null, tail_index: null,
                type: item.type, question_text: item.text, ai_generated: item.type === '생기부', time_limit_sec: 120,
              }).select().single()
              if (iErr) throw iErr
              rows.push(ins)
            }
          }
          // 정한 개수보다 많은 자리 중 아직 안 답한 건 지움
          const extra = rows.filter((r: any) => r.order > want.length + 1 && !r.student_answer && r.type !== '추가')
          if (extra.length) {
            const { error: dErr } = await supabase.from('high_mock_exam_questions').delete().in('id', extra.map((r: any) => r.id))
            if (dErr) throw dErr
          }
          rows = rows.filter((r: any) => !extra.includes(r)).sort((a: any, b: any) => a.order - b.order)
        }

        const firstOpen = rows.findIndex((r: any) => !r.student_answer)
        next.push({ student: s, exam: ex, rows, tails, pos: firstOpen >= 0 ? firstOpen : 0, saenggibu, past, concept: conceptOf(s.id) })
      }
      const ev: Record<string, Eval> = {}
      next.forEach(st => { ev[st.student.id] = st.exam.teacher_eval ?? {} })
      setEvals(ev)
      setSeats(next)
      // 이어서 하기면 아직 다 못 한 첫 학생부터
      const firstOpen = next.findIndex(st => st.rows.some((r: any) => !r.student_answer))
      setSel(firstOpen >= 0 ? firstOpen : 0)
      setStep('live')
      return true
    } catch (e: any) {
      streamRef.current?.getTracks().forEach(t => t.stop())
      setErr(e?.name === 'NotAllowedError' ? '마이크 사용을 허용해 주세요. (주소창 왼쪽 자물쇠 → 마이크 허용)' : `시작 실패: ${e.message || e}`)
      return false
    } finally {
      setPreparing('')
    }
  }

  // 목록에서 "이어서 하기"로 들어오면 준비 화면 없이 바로 면접 화면으로
  const autoStarted = useRef(false)
  const [autoFailed, setAutoFailed] = useState(false)
  useEffect(() => {
    if (!resumeExams?.length || autoStarted.current) return
    if (!(academyStudents as any[]).length) return   // 학생 이름 불러온 뒤 시작
    autoStarted.current = true
    void start().then(ok => { if (!ok) setAutoFailed(true) })
  }, [academyStudents])

  const patchSeat = (i: number, fn: (s: Seat) => Seat) => setSeats(prev => prev.map((s, k) => (k === i ? fn(s) : s)))
  const patchStudent = (studentId: string, fn: (s: Seat) => Seat) =>
    setSeats(prev => prev.map(s => (s.student.id === studentId ? fn(s) : s)))

  const running = jobs.filter(j => j.status === 'running')
  const pendingRows = new Set(running.map(j => j.rowId).filter(Boolean) as string[])
  const isBusyRow = (r: any) => !!r && pendingRows.has(r.id)
  const doneOrBusy = (r: any) => answered(r) || isBusyRow(r)
  const last = seat ? lastBy[seat.student.id] ?? null : null
  // 이미 답한 질문을 누르면 그 질문(+ 꼬리질문)의 기록, 아니면 이 학생 마지막 녹음
  const pairsOfRow = (r: any) => [
    { label: '본 질문', kind: 'main', question: r.question_text, lines: r.transcript ?? [], feedback: r.ai_feedback ?? {} },
    ...(seat?.tails ?? []).filter(t => t.parent_id === r.id && t.student_answer)
      .sort((a, b) => (a.tail_index || 0) - (b.tail_index || 0))
      .map(t => ({ label: `꼬리 ${t.tail_index}`, kind: 'followup', question: t.question_text, lines: t.transcript ?? [], feedback: t.ai_feedback ?? {} })),
  ]
  const viewingRow = !cont && !mode && cur && answered(cur) ? cur : null
  const shown: LastResult | null = viewingRow
    ? {
        pairs: pairsOfRow(viewingRow),
        followUps: last && last.parentId === viewingRow.id ? last.followUps : [],
        parentId: viewingRow.id,
        createdIds: last && last.parentId === viewingRow.id ? last.createdIds : [],
        face: viewingRow.face_metrics ?? null,
      }
    : last
  const shownLabel = viewingRow ? `${(seat?.rows.indexOf(viewingRow) ?? 0) + 1}번 질문 기록` : '마지막 녹음'
  const runningHere = seat ? running.filter(j => j.studentId === seat.student.id) : []
  selIdRef.current = seat?.student.id ?? ''

  const pickStudent = (i: number) => {
    if (phase === 'rec') return
    setSel(i); setMode(null); setCont(null)
    const sid = seats[i]?.student.id
    setFbTab(Math.max(0, (lastBy[sid]?.pairs.length ?? 1) - 1))
  }
  const goPos = (k: number) => {
    if (phase === 'rec') return
    patchSeat(sel, s => ({ ...s, pos: k })); setMode(null); setCont(null); setFbTab(0)
  }

  // 같은 종류의 다른 질문으로 바꾸기 (답하기 전만)
  const swap = async () => {
    if (!seat || !cur || answered(cur)) return
    const used = new Set(seat.rows.map(r => r.question_text))
    const pool: PoolItem[] = cur.type === '생기부'
      ? seat.saenggibu.map(text => ({ type: '생기부', text }))
      : pastPool(seat.past)
    const fresh = pool.filter(p => !used.has(p.text))
    const options = cur.type === '생기부' ? shuffle(fresh) : fresh // 기출이 먼저, 모자라면 공통
    if (!options.length) { alert(cur.type === '생기부' ? '바꿀 생기부 예상질문이 더 없어요. (발행된 질문만 써요)' : '바꿀 질문이 더 없어요.'); return }
    const { type, text } = options[0]
    const { error } = await supabase.from('high_mock_exam_questions').update({ type, question_text: text }).eq('id', cur.id)
    if (error) { alert(`바꾸기 실패: ${error.message}`); return }
    patchSeat(sel, s => ({ ...s, rows: s.rows.map(r => (r.id === cur.id ? { ...r, type, question_text: text } : r)) }))
  }

  const qText = cont ? '녹음을 시작하고 이어서 꼬리질문을 하세요'
    : mode === 'custom' ? (customText.trim() || '아래에 질문을 적어 주세요')
    : mode === 'voice' ? '녹음을 시작하고 말로 질문하세요'
    : cur?.question_text ?? ''
  const qTag = cont ? '꼬리질문 이어서' : mode === 'custom' ? '직접 입력' : mode === 'voice' ? '말로 질문' : (cur?.type ?? '')

  // ───────── 녹음 ─────────
  // ───────── 학생 핸드폰 연결 (슈퍼베이스 실시간) ─────────
  //   학생이 핸드폰에서 "현장 면접 대기"를 켜 두면 채널 live-mock-{학생id}에 들어와 있음
  //   원장 녹음 시작/끝 → 학생 핸드폰도 녹음 시작/끝 → 학생이 녹음 파일을 올리고 "uploaded"로 알려 줌
  const [phones, setPhones] = useState<Record<string, boolean>>({})
  const chansRef = useRef<Record<string, any>>({})
  const uploadWaitRef = useRef<Record<string, (v: { path: string; startedAt: number } | null) => void>>({})
  const uploadedRef = useRef<Record<string, { path: string; startedAt: number } | null>>({})
  // 학생 핸드폰 얼굴 분석 결과 (녹음 끝나면 바로 옴)
  const faceGotRef = useRef<Record<string, any>>({})
  const faceWaitRef = useRef<Record<string, (v: any) => void>>({})
  const waitFace = (recId: string) => new Promise<any>(resolve => {
    if (recId in faceGotRef.current) { resolve(faceGotRef.current[recId]); return }
    const timer = window.setTimeout(() => { delete faceWaitRef.current[recId]; resolve(null) }, 8000)
    faceWaitRef.current[recId] = v => { window.clearTimeout(timer); delete faceWaitRef.current[recId]; resolve(v) }
  })
  const seatIds = seats.map(x => x.student.id).join(',')
  useEffect(() => {
    if (step !== 'live') return
    const ids = seatIds.split(',').filter(Boolean)
    ids.forEach(sid => {
      if (chansRef.current[sid]) return
      const ch = supabase.channel(`live-mock-${sid}`, { config: { broadcast: { self: false }, presence: { key: 'teacher' } } })
      ch.on('presence', { event: 'sync' }, () => {
        const st = ch.presenceState() as Record<string, any[]>
        setPhones(p => ({ ...p, [sid]: !!st.student?.length }))
      })
      ch.on('broadcast', { event: 'face' }, ({ payload }: any) => {
        const id = String(payload?.recId ?? '')
        faceGotRef.current[id] = payload?.metrics ?? null
        faceWaitRef.current[id]?.(payload?.metrics ?? null)
      })
      ch.on('broadcast', { event: 'uploaded' }, ({ payload }: any) => {
        const v = payload?.path ? { path: payload.path, startedAt: Number(payload.startedAt) || 0 } : null
        uploadedRef.current[payload?.recId] = v
        uploadWaitRef.current[payload?.recId]?.(v)
      })
      ch.subscribe((status: string) => { if (status === 'SUBSCRIBED') void ch.track({ role: 'teacher' }) })
      chansRef.current[sid] = ch
    })
  }, [step, seatIds])
  useEffect(() => () => {
    Object.values(chansRef.current).forEach((ch: any) => { void supabase.removeChannel(ch) })
    chansRef.current = {}
  }, [])
  const sendToPhone = (sid: string, event: string, payload: any) => {
    void chansRef.current[sid]?.send({ type: 'broadcast', event, payload })
  }
  // 학생 핸드폰 녹음 파일이 올라올 때까지 기다림 (최대 25초, 안 오면 원장 녹음만으로)
  const waitPhoneUpload = (recId: string) => new Promise<{ path: string; startedAt: number } | null>(resolve => {
    if (recId in uploadedRef.current) { resolve(uploadedRef.current[recId]); return }
    const timer = window.setTimeout(() => { delete uploadWaitRef.current[recId]; resolve(null) }, 25000)
    uploadWaitRef.current[recId] = v => { window.clearTimeout(timer); delete uploadWaitRef.current[recId]; resolve(v) }
  })

  // ───────── 무선 마이크 (학생 옷에 다는 마이크 1~6번) ─────────
  //   노트북에서 마이크 수신 프로그램(receiver.js)을 켜 두면 http://127.0.0.1:5006 으로 학생별 소리를 받을 수 있음
  //   학생마다 마이크 번호를 정해 두면, 녹음 시작/끝 때 그 마이크 소리만 가져와서 원장 노트북 녹음과 같이 AI로 보냄
  const WMIC = 'http://127.0.0.1:5006'
  const [wmics, setWmics] = useState<Record<number, { alive: boolean; level: number }>>({})
  const [wmicOn, setWmicOn] = useState(false)
  const [micOf, setMicOf] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('bkurs-wmic-map') || '{}') } catch { return {} }
  })
  const setMic = (sid: string, n: number) => setMicOf(m => {
    const next = { ...m }
    if (n) next[sid] = n; else delete next[sid]
    try { localStorage.setItem('bkurs-wmic-map', JSON.stringify(next)) } catch { /* 저장 안 돼도 괜찮음 */ }
    return next
  })
  useEffect(() => {
    if (step !== 'live') return
    let stopped = false
    const tick = async () => {
      try {
        const r = await fetch(`${WMIC}/status`, { cache: 'no-store' })
        const j = await r.json()
        if (stopped) return
        const m: Record<number, { alive: boolean; level: number }> = {}
        for (const x of j.mics ?? []) m[x.mic] = { alive: !!x.alive, level: Number(x.level) || 0 }
        setWmics(m); setWmicOn(true)
      } catch { if (!stopped) { setWmicOn(false); setWmics({}) } }
    }
    void tick()
    const t = window.setInterval(tick, 1500)
    return () => { stopped = true; window.clearInterval(t) }
  }, [step])
  const wmicFor = (sid: string): number | null => { const n = micOf[sid]; return n && wmics[n]?.alive ? n : null }
  const wmicBlobRef = useRef<Record<string, Promise<Blob | null>>>({})
  const curCtxRef = useRef<RecCtx | null>(null)

  const startRec = () => {
    if (!streamRef.current || !seat) { setErr('마이크가 연결되지 않았어요.'); return }
    if (mode === 'custom' && !customText.trim()) { alert('질문을 먼저 적어 주세요.'); return }
    if (!cont && !mode && cur && isBusyRow(cur)) { alert('이 질문은 아직 AI가 정리 중이에요. 다른 질문을 먼저 하세요.'); return }
    setErr('')
    // 녹음 시작 순간의 상황을 기억 (끝나고 다른 학생으로 넘어가도 이 학생에게 저장)
    const ctx: RecCtx = {
      studentId: seat.student.id,
      rowId: !cont && !mode && cur ? cur.id : null,
      contParentId: cont?.parentId ?? null,
      mode, qText, qTag, customText,
      recId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      phone: !wmicFor(seat.student.id) && !!phones[seat.student.id],
      wmic: wmicFor(seat.student.id),
      facePhone: !!phones[seat.student.id],
      startedAt: Date.now(),
    }
    curCtxRef.current = ctx
    if (ctx.wmic) void fetch(`${WMIC}/start?mic=${ctx.wmic}`, { method: 'POST' }).catch(() => { /* 실패하면 노트북 녹음만 */ })
    // 학생 핸드폰: 얼굴 분석은 항상, 소리 녹음은 무선 마이크가 없을 때만
    if (ctx.facePhone) {
      sendToPhone(ctx.studentId, 'start', {
        recId: ctx.recId,
        question: cont ? '꼬리질문에 대답해 주세요' : mode === 'voice' ? '선생님 질문을 듣고 대답해 주세요' : qText,
        teacherStartedAt: ctx.startedAt,
        audio: ctx.phone,
      })
    }
    chunksRef.current = []
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
    const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined)
    rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
    rec.onstop = () => { void analyze(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' }), ctx) }
    rec.start()
    recRef.current = rec
    setSec(0)
    timerRef.current = window.setInterval(() => setSec(s => s + 1), 1000)
    setPhase('rec')
  }

  // 끝 → 바로 다음 질문으로 (AI 분석은 뒤에서)
  const stopRec = () => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null }
    recRef.current?.stop()
    const c = curCtxRef.current
    if (c?.facePhone) sendToPhone(c.studentId, 'stop', { recId: c.recId })
    if (c?.wmic) {
      wmicBlobRef.current[c.recId] = fetch(`${WMIC}/stop?mic=${c.wmic}`, { method: 'POST' })
        .then(r => (r.ok ? r.blob() : null)).catch(() => null)
    }
    curCtxRef.current = null
    setPhase('idle')
    if (seat && !cont && !mode) {
      const open = seat.rows.findIndex((r, k) => k !== seat.pos && !doneOrBusy(r))
      if (open >= 0) patchSeat(sel, s => ({ ...s, pos: open }))
    }
    setCont(null); setMode(null); setCustomText('')
  }

  // 한 녹음 = 본 질문 + 대답 + (면접관이 바로 한) 꼬리질문 + 대답 … → AI가 문답별로 나눠 줌
  const analyze = async (blob: Blob, ctx: RecCtx) => {
    const s0 = seatsRef.current.find(x => x.student.id === ctx.studentId)
    if (!s0) return
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const row0 = ctx.rowId ? s0.rows.find(r => r.id === ctx.rowId) : null
    setJobs(js => [...js, {
      id: jobId, studentId: ctx.studentId, name: s0.student.name, rowId: ctx.rowId,
      label: ctx.contParentId ? '꼬리질문' : ctx.mode ? '추가 질문' : `${s0.rows.findIndex(r => r.id === ctx.rowId) + 1}번 질문`,
      status: 'running',
    }])
    const mainSource = ctx.mode ?? (row0?.type === '생기부' ? 'student' : row0?.type === '기출' ? 'past' : 'common')
    try {
      const previous = [...s0.rows, ...s0.tails].filter(answered).slice(-4)
        .map(r => ({ q: r.question_text, a: r.student_answer }))
      const tg = tgOf(ctx.studentId)
      // 학생 핸드폰도 녹음했으면 그 파일이 올라올 때까지 기다렸다가 같이 보냄
      let phone: { path: string; startedAt: number } | null = null
      const face = ctx.facePhone ? await waitFace(ctx.recId) : null
      delete faceGotRef.current[ctx.recId]
      const faceField = face ? { face_metrics: face } : {}
      if (ctx.phone) phone = await waitPhoneUpload(ctx.recId)
      // 무선 마이크로 녹음했으면 그 소리를 올려서 핸드폰 녹음과 똑같이 보냄 (같은 순간에 시작해서 시간차 0)
      if (ctx.wmic) {
        const wb = await (wmicBlobRef.current[ctx.recId] ?? Promise.resolve(null))
        delete wmicBlobRef.current[ctx.recId]
        if (wb && wb.size > 44 + 16000) {   // 0.5초 이상일 때만
          const { data: u } = await supabase.auth.getUser()
          if (u.user) {
            const path = `${u.user.id}/${ctx.recId}.wav`
            const up = await supabase.storage.from('live-mock-audio').upload(path, wb, { contentType: 'audio/wav', upsert: true })
            if (!up.error) phone = { path, startedAt: ctx.startedAt }
          }
        }
      }
      const delay = phone ? (phone.startedAt - ctx.startedAt) / 1000 : 0
      const fd = new FormData()
      fd.append('audio', new File([blob], (blob.type || '').includes('mp4') ? 'answer.mp4' : 'answer.webm', { type: blob.type || 'audio/webm' }))
      fd.append('meta', JSON.stringify({
        questionText: ctx.contParentId || ctx.mode === 'voice' ? '' : ctx.qText,
        questionType: ctx.contParentId ? '꼬리질문' : ctx.qTag,
        voiceQuestion: !ctx.contParentId && ctx.mode === 'voice',
        continuation: !!ctx.contParentId,
        studentName: s0.student.name,
        grade,
        school: tg.univ || s0.exam.target_univ || undefined,
        major: tg.major || s0.exam.target_major || undefined,
        interviewType: tg.track || s0.exam.interview_type || undefined,
        concept: s0.concept || undefined,
        previous,
        studentAudioPath: phone?.path,
        // 기기 시계가 어긋날 수 있어서 0~2초 사이일 때만 믿음
        studentDelaySec: phone ? (delay >= 0 && delay <= 2 ? delay : 0.3) : undefined,
        face: face || undefined,
      }))
      const { data, error } = await supabase.functions.invoke('mock-live-answer', { body: fd })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'AI 분석 실패')
      const pairs: any[] = data.pairs ?? []
      if (!pairs.length) throw new Error('대화를 나누지 못했어요')

      const now = new Date().toISOString()
      const liveOf = (p: any, source: string) => ({
        student_answer: p.answer,
        transcript: p.lines,
        ai_feedback: p.feedback,
        answer_source: 'live',
        question_source: source,
        answer_duration_sec: Math.round(p.studentSec || 0) || null,
        answered_at: now,
      })
      const createdIds: string[] = []
      const sNow = seatsRef.current.find(x => x.student.id === ctx.studentId) ?? s0
      let mainRow: any = ctx.contParentId ? sNow.rows.find(r => r.id === ctx.contParentId) : row0
      let tailPairs = pairs

      if (!ctx.contParentId) {
        const p0 = pairs[0]
        tailPairs = pairs.slice(1)
        if (ctx.mode) {
          // 목록에 없던 질문 → 본 질문 뒤에 추가
          const order = Math.max(0, ...sNow.rows.map(r => r.order || 0)) + 1
          const { data: ins, error: iErr } = await supabase.from('high_mock_exam_questions').insert({
            exam_id: s0.exam.id, student_id: ctx.studentId, order, level: 'main', parent_id: null, tail_index: null,
            type: '추가', question_text: (p0.question || ctx.customText).trim() || '(말로 한 질문)',
            ai_generated: false, time_limit_sec: 120, ...liveOf(p0, ctx.mode), ...faceField,
          }).select().single()
          if (iErr) throw iErr
          mainRow = ins
          createdIds.push(ins.id)
          patchStudent(ctx.studentId, x => ({ ...x, rows: [...x.rows, ins] }))
        } else if (row0) {
          const live = { ...liveOf(p0, mainSource), ...faceField }
          const { error: uErr } = await supabase.from('high_mock_exam_questions').update(live).eq('id', row0.id)
          if (uErr) throw uErr
          mainRow = { ...row0, ...live }
          patchStudent(ctx.studentId, x => ({ ...x, rows: x.rows.map(r => (r.id === row0.id ? { ...r, ...live } : r)) }))
        }
      }

      // 면접관이 이어서 한 꼬리질문들 → 그 본 질문 밑에 꼬리 1, 꼬리 2 … 로 저장
      const before = mainRow ? sNow.tails.filter(t => t.parent_id === mainRow.id).length : 0
      if (mainRow && tailPairs.length) {
        const { data: ins, error: iErr } = await supabase.from('high_mock_exam_questions').insert(
          tailPairs.map((p, i) => ({
            exam_id: s0.exam.id, student_id: ctx.studentId, order: mainRow.order, level: 'tail',
            parent_id: mainRow.id, tail_index: before + i + 1, type: mainRow.type,
            question_text: p.question, ai_generated: false, time_limit_sec: 120, ...liveOf(p, 'followup'),
            ...(ctx.contParentId && i === 0 ? faceField : {}),
          })),
        ).select()
        if (iErr) throw iErr
        ;(ins ?? []).forEach((r: any) => createdIds.push(r.id))
        patchStudent(ctx.studentId, x => ({ ...x, tails: [...x.tails, ...(ins ?? [])] }))
      }

      setLastBy(m => ({
        ...m,
        [ctx.studentId]: {
          pairs: pairs.map((p, i) => ({
            ...p,
            label: ctx.contParentId ? `꼬리 ${before + i + 1}` : i === 0 ? '본 질문' : `꼬리 ${before + i}`,
          })),
          followUps: data.followUps ?? [],
          parentId: mainRow?.id ?? '',
          createdIds,
          face,
        },
      }))
      if (selIdRef.current === ctx.studentId) setFbTab(pairs.length - 1)
      setJobs(js => js.filter(j => j.id !== jobId))
    } catch (e: any) {
      setJobs(js => js.map(j => (j.id === jobId ? { ...j, status: 'error', error: e.message || String(e) } : j)))
    }
  }

  // 실패한 녹음 → 그 학생·그 질문으로 돌아가서 다시
  const retryJob = (j: Job) => {
    const i = seats.findIndex(x => x.student.id === j.studentId)
    if (i >= 0) {
      setSel(i)
      const k = j.rowId ? seats[i].rows.findIndex(r => r.id === j.rowId) : -1
      if (k >= 0) patchSeat(i, x => ({ ...x, pos: k }))
    }
    setMode(null); setCont(null)
    setJobs(js => js.filter(x => x.id !== j.id))
  }

  // 대답 다 듣고 나서 꼬리질문을 더 하고 싶을 때 — 같은 본 질문 밑에 이어서 저장
  const continueTail = () => {
    if (!shown?.parentId) return
    setCont({ parentId: shown.parentId }); setMode(null)
  }

  // 원장 직접 평가 — 누를 때마다 저장
  const setEval = (key: keyof Eval, value: string) => {
    if (!seat) return
    const id = seat.student.id
    const nextEval = { ...(evals[id] ?? {}), [key]: value }
    setEvals(e => ({ ...e, [id]: nextEval }))
    if (key !== 'memo') void updateExam(seat.exam.id, { teacher_eval: nextEval })
  }
  const saveMemo = () => { if (seat) void updateExam(seat.exam.id, { teacher_eval: evals[seat.student.id] ?? {} }) }

  const close = () => {
    if (phase === 'rec') { if (!confirm('녹음 중이에요. 그래도 닫을까요?')) return }
    if (running.length) { if (!confirm(`AI가 아직 ${running.length}개를 정리하고 있어요. 지금 닫으면 저장이 안 될 수 있어요. 그래도 닫을까요?`)) return }
    recRef.current?.state === 'recording' && recRef.current.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    onClose()
  }

  // ───────── 면접 끝내기 → 학생별 정리 화면 ─────────
  const [ending, setEnding] = useState(false)
  const [sending, setSending] = useState('')
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({})
  const endInterview = () => {
    if (phase === 'rec') { if (!confirm('녹음 중이에요. 녹음을 끝내고 정리할까요?')) return; stopRec() }
    setEnding(true)
  }
  const liveDone = (s: Seat) => s.rows.filter(r => r.answer_source === 'live' && r.student_answer)
  const draftOf = (r: any, name: string) => {
    const fb = r.ai_feedback ?? {}
    const parts = [
      fb.good ? `잘한 점: ${fb.good}` : '',
      fb.improve ? `다음엔 이렇게: ${fb.improve}` : '',
      fb.face?.comment ? `표정·시선: ${fb.face.comment}${fb.face.tip ? ` ${fb.face.tip}` : ''}` : '',
    ].filter(Boolean)
    return parts.length ? `${name} 학생, ${parts.join('\n')}` : null
  }
  // 학생 한 명(또는 전부)에게 보내기 — AI가 쓴 피드백 그대로. 고쳐서 보내려면 학생 상세 화면에서.
  const sendTo = async (list: Seat[]) => {
    setSending(list.length > 1 ? 'all' : list[0]?.student.id ?? '')
    try {
      const now = new Date().toISOString()
      for (const s of list) {
        const mains = liveDone(s).filter(r => !r.feedback_sent_at)
        for (const r of mains) {
          const { error } = await supabase.from('high_mock_exam_questions')
            .update({ teacher_feedback: r.teacher_feedback ?? draftOf(r, s.student.name), feedback_sent_at: now }).eq('id', r.id)
          if (error) throw error
        }
        const tailIds = s.tails.filter(t => mains.some(m => m.id === t.parent_id)).map(t => t.id)
        if (tailIds.length) {
          const { error } = await supabase.from('high_mock_exam_questions').update({ feedback_sent_at: now }).in('id', tailIds)
          if (error) throw error
        }
        patchStudent(s.student.id, x => ({
          ...x,
          rows: x.rows.map(r => (mains.some(m => m.id === r.id) ? { ...r, feedback_sent_at: now } : r)),
          tails: x.tails.map(t => (tailIds.includes(t.id) ? { ...t, feedback_sent_at: now } : t)),
        }))
        setSentIds(m => ({ ...m, [s.student.id]: true }))
      }
    } catch (e: any) {
      alert(`보내기 실패: ${e.message || e}`)
    } finally {
      setSending('')
    }
  }

  const mmss = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
  const tagChip = (t: string) =>
    t === '생기부' ? 'bg-blue-100 text-blue-700' : t.startsWith('꼬리') ? 'bg-amber-100 text-amber-800' : t === '자기소개' ? 'bg-slate-100 text-slate-600' : 'bg-violet-100 text-violet-700'

  // ═════════════════════════ 화면 ═════════════════════════
  return (
    <div className="fixed inset-0 z-[100] bg-slate-100 overflow-y-auto font-sans text-ink">

      <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-col gap-4">
        {/* 상단 */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-[22px] font-extrabold">면접 모의고사</div>
            <span className="text-[12px] font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">현장 모드</span>
            <div className="text-[13px] text-slate-500">
              {grade} · {period}{step === 'live' ? ` · ${group ? group + ' · ' : ''}${seats.length}명` : ''}
            </div>
          </div>
          <button onClick={step === 'live' ? endInterview : close} className="h-11 px-4 rounded-xl bg-slate-900 text-white text-[14px] font-bold">
            {step === 'live' ? '면접 끝내기' : '닫기'}
          </button>
        </div>

        {err && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] font-semibold text-red-700">{err}</div>}

        {/* ═════ 면접 끝 — 학생별로 넘기기 ═════ */}
        {ending && (
          <div className="fixed inset-0 z-[110] bg-slate-900/50 flex items-start justify-center overflow-y-auto p-4">
            <div className="w-full max-w-[760px] mt-10 bg-white rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[20px] font-extrabold">면접 끝 · 학생별로 넘기기</div>
                  <div className="text-[13px] text-slate-500 mt-1">
                    학생마다 질문 · 내 답변 · 피드백이 각자 화면으로 가요. 바로 보내거나, 학생 상세 화면에서 피드백을 고친 뒤 보낼 수 있어요.
                  </div>
                </div>
                <button onClick={() => setEnding(false)} className="h-10 px-3 rounded-lg border border-slate-300 text-[13px] font-semibold text-slate-600 flex-shrink-0">면접 계속</button>
              </div>

              {running.length > 0 && (
                <div className="text-[13px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  AI가 아직 {running.length}개를 정리하고 있어요. 끝나면 자동으로 아래 숫자가 바뀌어요. (10~20초)
                </div>
              )}

              <div className="flex flex-col gap-2">
                {seats.map(s => {
                  const done = liveDone(s)
                  const tailN = s.tails.filter(t => t.answer_source === 'live' && done.some(d => d.id === t.parent_id)).length
                  const waiting = done.filter(r => !r.feedback_sent_at).length
                  const busy = running.filter(j => j.studentId === s.student.id).length
                  const failed = jobs.filter(j => j.studentId === s.student.id && j.status === 'error').length
                  const allSent = done.length > 0 && waiting === 0
                  return (
                    <div key={s.student.id} className="flex items-center gap-3 flex-wrap rounded-xl border border-slate-200 px-4 py-3">
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-[15px] font-bold">{s.student.name}</div>
                        <div className="text-[12.5px] text-slate-500">
                          답한 질문 {done.length}개{tailN ? ` · 꼬리 ${tailN}개` : ''}
                          {busy ? ` · AI 정리 중 ${busy}` : ''}{failed ? ` · 실패 ${failed}` : ''}
                        </div>
                      </div>
                      {done.length === 0 ? (
                        <span className="text-[12.5px] text-slate-400">답한 질문 없음</span>
                      ) : allSent || sentIds[s.student.id] ? (
                        <span className="text-[12.5px] font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">학생에게 보냄</span>
                      ) : (
                        <div className="flex gap-1.5">
                          <button onClick={() => { close(); onPick?.(s.exam.id) }} disabled={busy > 0}
                            className="h-10 px-3 rounded-lg border border-slate-300 text-[13px] font-semibold text-slate-700 disabled:opacity-40">고쳐서 보내기</button>
                          <button onClick={() => sendTo([s])} disabled={!!sending || busy > 0}
                            className="h-10 px-3.5 rounded-lg bg-blue-600 text-white text-[13px] font-bold disabled:opacity-40">
                            {sending === s.student.id ? '보내는 중…' : `바로 보내기 (${waiting})`}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2 justify-end flex-wrap border-t border-slate-100 pt-4">
                <button onClick={close} className="h-12 px-4 rounded-xl border border-slate-300 text-[14px] font-semibold text-slate-700">
                  나중에 학생별로 보낼게요 (닫기)
                </button>
                <button
                  onClick={async () => { await sendTo(seats.filter(s => liveDone(s).some(r => !r.feedback_sent_at))); }}
                  disabled={!!sending || running.length > 0 || !seats.some(s => liveDone(s).some(r => !r.feedback_sent_at))}
                  className="h-12 px-5 rounded-xl bg-blue-600 text-white text-[15px] font-extrabold disabled:opacity-40">
                  {sending === 'all' ? '보내는 중…' : running.length ? 'AI 정리 끝나면 보낼 수 있어요' : '모두 각자에게 보내기'}
                </button>
              </div>
              <div className="text-[12px] text-slate-400 text-right -mt-2">
                바로 보내면 AI가 쓴 피드백이 그대로 가요. 학생 화면에는 원장님이 보낸 질문만 보여요.
              </div>
            </div>
          </div>
        )}

        {/* ═════ 준비 ═════ */}
        {step === 'setup' && (resumeExams?.length ?? 0) > 0 && !autoFailed && (
          <div className="bg-white border border-slate-200 rounded-2xl py-20 flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            <div className="text-[15px] font-bold">{preparing || '이어서 시작하는 중…'}</div>
            <div className="text-[12.5px] text-slate-500">브라우저가 마이크를 물어보면 <b>허용</b>을 눌러 주세요.</div>
          </div>
        )}

        {step === 'setup' && (!(resumeExams?.length) || autoFailed) && (
          <div className="flex flex-col gap-4 max-w-[1000px]">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-[16px] font-bold">오늘 면접 볼 학생 ({grade})</div>
                <div className="text-[14px] font-bold text-blue-700">{picked.length} / {MAX_STUDENTS}명</div>
              </div>
              <div className="text-[12.5px] text-slate-500">고른 순서대로 1~{MAX_STUDENTS}번 칸이 돼요. 학생마다 지원 대학 → 학과 → 전형을 먼저 고르면 질문을 고를 수 있어요. (기출문제가 있는 대학·학과만 나와요)</div>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
                {candidates.map(c => {
                  const idx = picked.indexOf(c.id)
                  const on = idx >= 0
                  const full = !on && picked.length >= MAX_STUDENTS
                  return (
                    <div key={c.id} className="flex flex-col gap-2.5 p-3 rounded-xl border-2"
                      style={{ borderColor: on ? '#2563EB' : '#E2E8F0', background: on ? '#EFF6FF' : '#fff', opacity: full ? 0.5 : 1 }}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => togglePick(c.id)} disabled={full}
                        className="w-8 h-8 flex-shrink-0 rounded-lg text-[14px] font-extrabold flex items-center justify-center"
                        style={on ? { background: '#2563EB', color: '#fff' } : { border: '2px solid #CBD5E1', color: '#94A3B8' }}
                        aria-label={`${c.name} 선택`}>
                        {on ? idx + 1 : ''}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-bold truncate">{c.name}</div>
                        <div className="text-[12px] text-slate-500 truncate">
                          {c.school || ''}
                        </div>
                      </div>
                    </div>
                    {on && (
                      <div className="grid gap-1.5 pl-11" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                        <input value={tgOf(c.id).univ} list="live-univs"
                          onChange={e => setTg(c.id, { univ: e.target.value, major: '', track: '' })}
                          placeholder={pastLoading ? '대학 불러오는 중…' : '지원 대학 (검색)'} aria-label={`${c.name} 지원 대학`}
                          className="h-10 min-w-0 border border-slate-300 rounded-lg px-2.5 text-[13px] bg-white" />
                        <select value={tgOf(c.id).major} disabled={!pastIdx[tgOf(c.id).univ]}
                          onChange={e => setTg(c.id, { major: e.target.value, track: '' })} aria-label={`${c.name} 학과`}
                          className="h-10 min-w-0 border border-slate-300 rounded-lg px-2 text-[13px] bg-white disabled:bg-slate-50 disabled:text-slate-400">
                          <option value="">학과 선택</option>
                          {majorsOf(tgOf(c.id).univ).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={tgOf(c.id).track} disabled={!pastIdx[tgOf(c.id).univ]?.[tgOf(c.id).major]}
                          onChange={e => setTg(c.id, { track: e.target.value })} aria-label={`${c.name} 전형`}
                          className="h-10 min-w-0 border border-slate-300 rounded-lg px-2 text-[13px] bg-white disabled:bg-slate-50 disabled:text-slate-400">
                          <option value="">전형 전체</option>
                          {tracksOf(tgOf(c.id).univ, tgOf(c.id).major).map(t => <option key={t} value={t}>{t} ({pastIdx[tgOf(c.id).univ][tgOf(c.id).major][t]})</option>)}
                        </select>
                      </div>
                    )}
                    {on && !tgReady(c.id) && (
                      <div className="pl-11 text-[12px]" style={{ color: tgOf(c.id).univ && !pastIdx[tgOf(c.id).univ] && !pastLoading ? '#B45309' : '#94A3B8' }}>
                        {tgOf(c.id).univ && !pastIdx[tgOf(c.id).univ] && !pastLoading
                          ? '기출문제가 있는 대학 목록에서 골라 주세요'
                          : '대학과 학과를 고르면 질문을 고를 수 있어요'}
                      </div>
                    )}
                    {on && tgReady(c.id) && (
                      <div className="flex items-center gap-1.5 flex-wrap pl-11">
                        <span className="text-[12px] text-slate-500 mr-0.5">질문</span>
                        <SrcPicker src={srcOf(c.id)} sgHave={sgCount[c.id]} pastHave={pastCountOf(c.id)} onChange={p => changeSrc(c.id, p)} />
                        <span className="text-[12px] text-slate-500">총 {1 + countOf(srcOf(c.id))}문항</span>
                        {srcOf(c.id).sg && c.id in sgCount && sgCount[c.id] < srcOf(c.id).sgN && (
                          <span className="text-[11.5px] text-amber-700 w-full">
                            {sgCount[c.id] === 0 ? '발행된 생기부 예상질문이 없어' : `발행된 생기부 예상질문이 ${sgCount[c.id]}개뿐이라`} 모자라는 건 기출로 채워요
                          </span>
                        )}
                        {srcOf(c.id).past && pastCountOf(c.id) < srcOf(c.id).pastN && (
                          <span className="text-[11.5px] text-amber-700 w-full">
                            이 학과 기출이 {pastCountOf(c.id)}개뿐이라 모자라는 건 공통 질문으로 채워요
                          </span>
                        )}
                      </div>
                    )}
                    </div>
                  )
                })}
                {candidates.length === 0 && <div className="text-[13px] text-slate-400">{grade} 학생이 없어요.</div>}
              </div>
            </div>

            {(resumeExams?.length ?? 0) > 0 && (
              <div className="rounded-2xl p-4 bg-blue-50 border border-blue-200 text-[13.5px] text-blue-900 leading-[1.7]">
                <b>이어서 하기</b> — {resumeExams![0].period} 기록에 이어서 진행해요. 이미 답한 질문은 그대로 두고 남은 질문부터 시작해요.
              </div>
            )}
            {resumableNames.length > 0 && (
              <div className="rounded-2xl p-4 bg-amber-50 border border-amber-200 flex flex-col gap-2.5">
                <div className="text-[13.5px] text-amber-900 leading-[1.6]">
                  오늘 <b>{sessionLabel}</b>로 시작한 기록이 있어요 · {resumableNames.map(id => candidates.find(c => c.id === id)?.name ?? '').join(', ')}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {([['resume', '이어서 하기 (답한 질문 그대로)'], ['new', '처음부터 새로 하기']] as const).map(([k, label]) => (
                    <button key={k} onClick={() => setResumeMode(k)}
                      className="h-10 px-3.5 rounded-lg text-[13px] font-bold"
                      style={resumeMode === k ? { background: '#0F172A', color: '#fff' } : { background: '#fff', color: '#334155', border: '1px solid #CBD5E1' }}>
                      {resumeMode === k ? '✓ ' : ''}{label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3">
              <div className="text-[16px] font-bold">조 이름</div>
              <datalist id="live-univs">{univList.map(u => <option key={u} value={u} />)}</datalist>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <input value={group} onChange={e => setGroup(e.target.value)} aria-label="조 이름" placeholder="예: 1조"
                  className="h-11 border border-slate-300 rounded-lg px-3 text-[14px] text-ink" />
              </div>
            </div>

            <div className="rounded-2xl p-4 flex gap-3 items-start bg-amber-50 border border-amber-200 text-amber-900">
              <span className="mt-0.5 flex-shrink-0"><MicIcon size={20} /></span>
              <div className="text-[13px] leading-[1.7]">
                <b>핸드폰으로 녹음 (마이크 없어도 돼요)</b> — 학생이 자기 핸드폰으로 비커스에 로그인 → <b>면접 모의고사 → 현장 면접 대기</b>를 켜 두면,
                원장님이 녹음 시작을 누를 때 <b>원장 노트북(질문)과 학생 핸드폰(대답)이 같이 녹음</b>돼요. 학생 칸에 "핸드폰 연결됨"이 뜨면 준비 끝이에요.<br />
                핸드폰이 없는 학생은 원장 노트북 하나로 녹음돼요(핀마이크가 있으면 더 좋아요). 시작하면 브라우저가 마이크를 물어봐요 — <b>허용</b>을 눌러 주세요.
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={start} disabled={!picked.length || !!preparing || !picked.every(tgReady)}
                className="h-14 px-7 rounded-xl bg-blue-600 text-white text-[16px] font-extrabold disabled:opacity-50">
                {preparing || (!picked.length ? '학생을 골라 주세요' : !picked.every(tgReady) ? '학생마다 대학·학과를 골라 주세요' : `${picked.some(id => resumeOf(id)) ? '이어서 시작' : '면접 시작'} (${picked.length}명) →`)}
              </button>
            </div>
          </div>
        )}

        {/* ═════ 진행 ═════ */}
        {step === 'live' && seat && (
          <>
            {/* 학생 칸 */}
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
              {seats.map((s, i) => {
                const on = i === sel
                const total = s.rows.length || 5
                const done = s.rows.filter(doneOrBusy).length
                const busyN = running.filter(j => j.studentId === s.student.id).length
                const errN = jobs.filter(j => j.studentId === s.student.id && j.status === 'error').length
                const status = on && phase === 'rec' ? '녹음 중' : errN ? '다시 필요' : busyN ? 'AI 정리 중' : on ? '차례' : done >= total ? '끝' : done ? `${done}/${total}` : '대기'
                return (
                  <button key={s.student.id} onClick={() => pickStudent(i)}
                    className="min-h-[100px] p-3.5 rounded-2xl text-left flex flex-col gap-2 bg-white"
                    style={{ border: `2px solid ${on ? '#2563EB' : '#E2E8F0'}`, boxShadow: on ? '0 6px 18px rgba(37,99,235,.18)' : 'none' }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg text-[12px] font-extrabold flex items-center justify-center"
                          style={on ? { background: '#2563EB', color: '#fff' } : { background: '#F1F5F9', color: '#475569' }}>{i + 1}</span>
                        <span className="text-[15px] font-bold">{s.student.name}</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={on && phase === 'rec' ? { background: '#FEE2E2', color: '#B91C1C' } : errN ? { background: '#FEE2E2', color: '#B91C1C' } : busyN ? { background: '#FEF3C7', color: '#92400E' } : on ? { background: '#DBEAFE', color: '#1D4ED8' } : { background: '#F1F5F9', color: '#475569' }}>
                        {status}
                      </span>
                    </div>
                    <div className="text-[12px] text-slate-500 truncate">{[tgOf(s.student.id).univ, tgOf(s.student.id).major, tgOf(s.student.id).track].filter(Boolean).join(' · ')}</div>
                    <div className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: wmicFor(s.student.id) || phones[s.student.id] ? '#047857' : '#94A3B8' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: wmicFor(s.student.id) || phones[s.student.id] ? '#10B981' : '#CBD5E1' }} />
                      {wmicFor(s.student.id)
                        ? `무선 마이크 ${wmicFor(s.student.id)}번${phones[s.student.id] ? ' · 카메라' : ''}`
                        : phones[s.student.id] ? '핸드폰 연결됨 · 소리+카메라' : '핸드폰 미연결 · 노트북만'}
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: total }).map((_, k) => (
                        <div key={k} className="h-1.5 flex-1 rounded" style={{ background: answered(s.rows[k]) ? '#2563EB' : isBusyRow(s.rows[k]) ? '#93C5FD' : '#E2E8F0' }} />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 무선 마이크 연결 — 학생마다 마이크 번호 정하기 (다음에도 기억함) */}
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-x-4 gap-y-2 flex-wrap">
              <span className="text-[13px] font-bold text-ink">무선 마이크</span>
              {!wmicOn ? (
                <span className="text-[12px] text-slate-500">
                  마이크 수신 프로그램이 꺼져 있어요. 노트북에서 <b>node receiver.js</b>를 켜면 연결돼요. (안 켜도 노트북·핸드폰으로 녹음돼요)
                </span>
              ) : seats.map(s => {
                const n = micOf[s.student.id] ?? 0
                const st = n ? wmics[n] : undefined
                return (
                  <label key={s.student.id} className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
                    {s.student.name}
                    <select value={n} disabled={phase === 'rec'} onChange={e => setMic(s.student.id, Number(e.target.value))}
                      className="h-8 px-2 border border-slate-200 rounded-lg text-[12px] bg-white">
                      <option value={0}>안 씀</option>
                      {[1, 2, 3, 4, 5, 6].map(k => <option key={k} value={k}>{k}번{wmics[k]?.alive ? '' : ' (꺼짐)'}</option>)}
                    </select>
                    {n ? (
                      <span className="w-12 h-1.5 rounded bg-slate-100 overflow-hidden">
                        <span className="block h-full bg-blue-600" style={{ width: `${Math.min(100, (st?.level ?? 0) * 3)}%` }} />
                      </span>
                    ) : null}
                  </label>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-4 items-start">
              {/* 가운데 */}
              <div className="flex flex-col gap-4 min-w-0" style={{ flex: '999 1 560px' }}>
                {/* 질문 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-[14px] text-slate-500"><b className="text-[18px] text-ink">{seat.student.name}</b> 차례</div>
                    <div className="text-[14px] font-bold text-blue-700">
                      {cont ? '꼬리질문 이어서' : mode ? '추가 질문' : `질문 ${seat.pos + 1} / ${seat.rows.length}`}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-blue-50 p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-blue-700">지금 읽을 질문</span>
                      {qTag && <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${tagChip(qTag)}`}>{qTag}</span>}
                    </div>
                    <div className="text-[22px] font-bold leading-[1.5]">{qText}</div>
                    {!cont && !mode && cur && !doneOrBusy(cur) && cur.type !== '자기소개' && phase === 'idle' && (
                      <div>
                        <button onClick={swap} className="h-10 px-3.5 rounded-lg border border-blue-300 bg-white text-blue-700 text-[13px] font-bold">
                          다른 {cur.type === '생기부' ? '생기부 예상' : '기출·공통'} 질문으로 바꾸기
                        </button>
                      </div>
                    )}
                    {!cont && !mode && phase === 'idle' && (
                      <div className="text-[12.5px] text-blue-800/80">대답을 듣고 궁금한 게 있으면 <b>녹음을 끄지 말고</b> 바로 꼬리질문 하세요. AI가 질문별로 나눠서 저장해요.</div>
                    )}
                    {cont && (
                      <div>
                        <button onClick={() => setCont(null)} className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-600 text-[12.5px] font-semibold">이어서 녹음 취소</button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="text-[12px] text-slate-500">{seat.student.name} 오늘 질문</div>
                    {seat.rows.map((r, k) => {
                      const on = k === seat.pos && !mode && !cont
                      const done = answered(r)
                      const busy = isBusyRow(r)
                      const tailN = seat.tails.filter(t => t.parent_id === r.id).length
                      return (
                        <button key={r.id} onClick={() => goPos(k)}
                          className="min-h-[46px] px-3 py-2 rounded-xl flex items-center gap-2.5 text-left text-[14px] leading-[1.5]"
                          style={{ border: `2px solid ${on ? '#2563EB' : '#F1F5F9'}`, background: on ? '#EFF6FF' : '#fff', color: done && !on ? '#64748B' : '#0F172A' }}>
                          <span className="w-6 h-6 flex-shrink-0 rounded-full text-[12px] font-extrabold flex items-center justify-center"
                            style={done ? { background: '#2563EB', color: '#fff' } : busy ? { background: '#93C5FD', color: '#fff' } : on ? { background: '#0F172A', color: '#fff' } : { background: '#F1F5F9', color: '#475569' }}>
                            {done ? '✓' : busy ? '…' : k + 1}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${tagChip(r.type)}`}>{r.type}</span>
                          <span className="flex-1">{r.question_text}</span>
                          <span className="text-[12px] text-slate-400 flex-shrink-0">{busy ? 'AI 정리 중' : done ? `답함${tailN ? ` · 꼬리 ${tailN}` : ''}` : on ? '지금' : ''}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap border-t border-slate-100 pt-3">
                    <span className="text-[13px] text-slate-500">목록에 없는 질문</span>
                    {(['custom', 'voice'] as const).map(m => (
                      <button key={m} onClick={() => { if (phase === 'idle') { setMode(mode === m ? null : m); setCont(null) } }}
                        className="h-10 px-3.5 rounded-lg text-[13px] font-semibold flex items-center gap-1.5"
                        style={mode === m ? { background: '#0F172A', color: '#fff', border: '1px solid #0F172A' } : { background: '#fff', color: '#334155', border: '1px solid #CBD5E1' }}>
                        {m === 'voice' && <MicIcon size={15} />}{m === 'custom' ? '직접 입력' : '말로 질문'}
                      </button>
                    ))}
                  </div>
                  {mode === 'custom' && (
                    <label className="flex flex-col gap-1.5 text-[13px] text-slate-600">적어 두면 위에 띄워져요
                      <input value={customText} onChange={e => setCustomText(e.target.value)} placeholder="예: 친구와 의견이 달랐던 적이 있나요?"
                        className="h-12 border border-slate-300 rounded-lg px-3.5 text-[15px] text-ink" />
                    </label>
                  )}
                  {mode === 'voice' && (
                    <div className="rounded-xl border border-dashed border-slate-400 bg-slate-50 p-3.5 text-[13.5px] text-slate-700 leading-[1.6]">
                      그냥 <b>말로 질문</b>하세요. 녹음에서 질문도 같이 받아 적어서 이 학생 기록에 저장해요.
                    </div>
                  )}
                </div>

                {/* 녹음 */}
                <div className="rounded-2xl bg-slate-900 text-white p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3 h-3 rounded-full ${phase === 'rec' ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                      <span className="text-[16px] font-bold">
                        {phase === 'rec' ? `녹음 중 · ${wmicFor(seat.student.id) ? `원장 노트북 + 무선 마이크 ${wmicFor(seat.student.id)}번` : phones[seat.student.id] ? `원장 노트북 + ${seat.student.name} 핸드폰` : seat.student.name}` : '대기 중'}
                      </span>
                      {running.length > 0 && (
                        <span className="text-[12px] font-semibold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full">AI 정리 중 {running.length}개 · 기다리지 않아도 돼요</span>
                      )}
                    </div>
                    <span className="text-[26px] font-extrabold tabular-nums tracking-wide">{mmss(sec)}</span>
                  </div>
                  <div className="flex gap-2.5 flex-wrap">
                    {phase === 'idle' && (
                      <button onClick={startRec} className="flex-1 min-w-[240px] h-16 rounded-2xl bg-blue-600 text-[18px] font-extrabold flex items-center justify-center gap-2.5">
                        <MicIcon size={22} />녹음 시작
                      </button>
                    )}
                    {phase === 'rec' && (
                      <button onClick={stopRec} className="flex-1 min-w-[240px] h-16 rounded-2xl bg-white text-slate-900 text-[18px] font-extrabold flex items-center justify-center gap-2.5">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                        끝 · 바로 다음으로
                      </button>
                    )}
                  </div>
                  {jobs.filter(j => j.status === 'error').map(j => (
                    <div key={j.id} className="flex items-center justify-between gap-2 flex-wrap rounded-xl bg-red-500/15 border border-red-400/40 px-3.5 py-2.5">
                      <div className="text-[13px] text-red-200"><b>{j.name} · {j.label}</b> 정리 실패 — {j.error}</div>
                      <button onClick={() => retryJob(j)} className="h-9 px-3 rounded-lg bg-white text-slate-900 text-[12.5px] font-bold">그 질문 다시 녹음</button>
                    </div>
                  ))}
                  <div className="text-[12px] text-slate-400">시작·끝만 누르세요. 끝을 누르면 바로 다음 질문으로 넘어가요. 다른 학생은 위 학생 칸을 누르면 돼요.</div>
                </div>

                {/* 받아 적은 내용 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-center gap-2">
                    <div className="text-[16px] font-bold">받아 적은 내용 <span className="text-[12.5px] font-medium text-slate-500">· {shownLabel}</span></div>
                    <div className="text-[12px] text-slate-500">답한 질문을 누르면 그 기록이 보여요</div>
                  </div>
                  {shown?.face && <FaceBox f={shown.face} />}
                  {!shown && (
                    <div className="text-[14px] text-slate-400 py-3">
                      {runningHere.length ? 'AI가 뒤에서 정리하고 있어요. 다른 학생 진행해도 되고, 끝나면 여기에 나와요.' : phase === 'rec' ? '녹음 중이에요. 끝을 누르면 바로 다음으로 넘어가고, AI가 뒤에서 나눠 적어요.' : '녹음을 시작하면 여기에 면접관과 학생 말이 나눠서 적혀요.'}
                    </div>
                  )}
                  {shown?.pairs.map((p: any, pi: number) => (
                    <div key={pi} className="flex flex-col gap-2 rounded-xl p-3" style={{ background: p.kind === 'main' ? '#F8FAFC' : '#FFFBEB', border: `1px solid ${p.kind === 'main' ? '#E2E8F0' : '#FDE68A'}` }}>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${p.kind === 'main' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'}`}>{p.label}</span>
                        <span className="text-[13px] font-bold text-ink">{p.question}</span>
                      </div>
                      {(p.lines ?? []).map((l: any, i: number) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="w-[56px] flex-shrink-0 text-center text-[11.5px] font-extrabold py-1 rounded-md"
                            style={l.who === 'interviewer' ? { background: '#0F172A', color: '#fff' } : { background: '#DBEAFE', color: '#1D4ED8' }}>
                            {l.who === 'interviewer' ? '면접관' : '학생'}
                          </span>
                          <div className="flex-1 text-[14.5px] leading-[1.7]" style={{ color: l.who === 'interviewer' ? '#0F172A' : '#334155' }}>{l.text}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* 오른쪽 */}
              <div className="flex flex-col gap-4 min-w-0" style={{ flex: '1 1 360px' }}>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[16px] font-bold">AI 피드백</div>
                    <div className="text-[12px] text-slate-500">{seat.student.name} · {shownLabel}</div>
                  </div>
                  {runningHere.length > 0 && (
                    <div className="text-[12.5px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      AI가 {runningHere.map(j => j.label).join(', ')}을 정리하고 있어요 · 10초쯤 뒤 자동으로 바뀌어요
                    </div>
                  )}
                  {!shown ? (
                    <div className="text-[14px] text-slate-500 leading-[1.7] bg-slate-50 rounded-xl p-4">
                      <b>끝</b>을 누르면 바로 다음 질문으로 넘어가고, AI 피드백은 뒤에서 만들어져 여기에 나와요.<br />잘한 점 · 보완할 점 · 5항목 · 꼬리질문
                    </div>
                  ) : (
                    (() => {
                      const pf = shown.pairs[Math.min(fbTab, shown.pairs.length - 1)]
                      const fb = pf?.feedback ?? {}
                      return (
                        <>
                          {shown.pairs.length > 1 && (
                            <div className="flex gap-1.5 flex-wrap">
                              {shown.pairs.map((p: any, i: number) => (
                                <button key={i} onClick={() => setFbTab(i)}
                                  className="h-9 px-3 rounded-lg text-[12.5px] font-bold"
                                  style={i === fbTab ? { background: '#0F172A', color: '#fff' } : { background: '#F1F5F9', color: '#475569' }}>
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="text-[13px] text-slate-500 leading-[1.5]">Q. {pf?.question}</div>
                          <div className="flex flex-col gap-1">
                            <div className="text-[13px] font-extrabold text-blue-700">잘한 점</div>
                            <div className="text-[14px] leading-[1.7]">{fb.good || '—'}</div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="text-[13px] font-extrabold text-orange-700">보완할 점</div>
                            <div className="text-[14px] leading-[1.7]">{fb.improve || '—'}</div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {(fb.tags ?? []).map((t: any) => {
                              const ls = TAG_LEVEL[t.level] ?? TAG_LEVEL['중']
                              return (
                                <div key={t.label} className="flex items-center gap-2.5">
                                  <div className="w-[84px] flex-shrink-0 text-[13px] text-slate-600">{t.label}</div>
                                  <div className="flex-1 h-2 rounded bg-slate-100 overflow-hidden"><div className="h-full rounded" style={{ width: ls.width, background: ls.bar }} /></div>
                                  <div className="w-8 text-center text-[12px] font-extrabold rounded-md py-0.5" style={{ background: ls.bg, color: ls.color }}>{t.level}</div>
                                </div>
                              )
                            })}
                            <div className="text-[12px] text-slate-500">
                              {fb.charsPerMin ? `말 속도 1분 ${fb.charsPerMin}자 (보통 250~350)` : ''}
                            </div>
                          </div>
                          <ConceptHabits fb={fb} />
                          {shown.followUps.length > 0 && (
                            <div className="flex flex-col gap-2 border-t border-slate-200 pt-3.5">
                              <div className="text-[13px] font-extrabold">더 물어볼 만한 꼬리질문 <span className="font-medium text-slate-500">(참고 · 마지막 대답 기준)</span></div>
                              {shown.followUps.map(f => (
                                <div key={f} className="px-3.5 py-2.5 rounded-xl bg-blue-50 text-blue-900 text-[14px] leading-[1.5]">· {f}</div>
                              ))}
                              <button onClick={continueTail}
                                className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-[13.5px] font-semibold flex items-center justify-center gap-2">
                                <MicIcon size={15} />꼬리질문 더 하기 (이어서 녹음)
                              </button>
                            </div>
                          )}
                        </>
                      )
                    })()
                  )}
                </div>

                {/* 원장 직접 평가 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-baseline gap-2">
                    <div className="text-[16px] font-bold">원장 직접 평가</div>
                    <div className="text-[12px] text-slate-500">녹음으로 못 보는 것 · {seat.student.name}</div>
                  </div>
                  {([['eye', '시선'], ['posture', '자세'], ['confidence', '자신감']] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2.5">
                      <div className="w-16 flex-shrink-0 text-[14px] font-semibold">{label}</div>
                      <div className="flex gap-1.5 flex-1">
                        {['상', '중', '하'].map(lv => {
                          const on = evals[seat.student.id]?.[key] === lv
                          return (
                            <button key={lv} onClick={() => setEval(key, lv)}
                              className="flex-1 h-11 rounded-xl text-[15px] font-bold"
                              style={on ? { background: '#0F172A', color: '#fff', border: '1px solid #0F172A' } : { background: '#fff', color: '#334155', border: '1px solid #CBD5E1' }}>
                              {lv}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <label className="flex flex-col gap-1.5 text-[13px] text-slate-600">한 줄 메모
                    <input value={evals[seat.student.id]?.memo ?? ''} onChange={e => setEval('memo', e.target.value)} onBlur={saveMemo}
                      placeholder="예: 대답할 때 손을 자주 만짐" className="h-11 border border-slate-300 rounded-xl px-3 text-[14px] text-ink" />
                  </label>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}