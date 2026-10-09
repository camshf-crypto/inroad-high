// src/pages/admin/_pages/mockexam/MockExamPage.tsx
// 면접 모의고사 (고등) — 왼쪽 메뉴에서 바로 들어오는 화면
//   · 현장 모의면접 시작 (학생 최대 6명 · 녹음 · AI가 받아 적고 나누고 피드백)
//   · 학생별 결과 목록 → 누르면 오른쪽에서 AI 피드백 확인 · 고쳐서 학생에게 보내기

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAcademyStudents } from '@/pages/admin/_hooks/useAcademyStudents'
import LiveInterview from '@/pages/admin/_pages/mockexam/LiveInterview'

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}


const TYPE_COLOR: Record<string, any> = {
  '자기소개': { bg: THEME.accentBg, color: THEME.accent, border: THEME.accentBorder },
  '지원동기': { bg: THEME.accentBg, color: THEME.accent, border: THEME.accentBorder },
  '인성': { bg: '#FFF3E8', color: '#D97706', border: '#FDBA74' },
  '전공': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '생기부': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '학업': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '진로': { bg: '#FFF7ED', color: '#D97706', border: '#FDBA74' },
  '탐구': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '독서': { bg: '#FFF3E8', color: '#D97706', border: '#FDBA74' },
  '성장': { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' },
  '활동': { bg: THEME.accentBg, color: THEME.accent, border: THEME.accentBorder },
  '전공연계': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '기출': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  '학업연계': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '추가': { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
}

// ─────────────────────────────────────────────
// 현장 모의면접 (녹음 답변 · AI 피드백 · 선생님 확인 후 학생에게 보내기)
// ─────────────────────────────────────────────

type Who = 'interviewer' | 'student'
interface LiveLine { who: Who; text: string }
interface LiveFeedback {
  summary?: string
  good?: string
  improve?: string
  tags?: { label: string; level: '상' | '중' | '하' }[]
  fillerCount?: number
  charsPerMin?: number | null
  followUps?: string[]
}

const AI_TAGS = ['질문 이해도', '답변 논리', '구체성', '전공 이해', '전달력']
const LEVEL_SCORE: Record<string, number> = { '상': 3, '중': 2, '하': 1 }
const scoreToLevel = (n: number) => (n >= 2.5 ? '상' : n >= 1.6 ? '중' : '하')

const LEVEL_STYLE: Record<string, { bg: string; color: string; bar: string; width: string }> = {
  '상': { bg: '#DBEAFE', color: '#1D4ED8', bar: '#2563EB', width: '100%' },
  '중': { bg: '#F1F5F9', color: '#334155', bar: '#2563EB', width: '62%' },
  '하': { bg: '#FFEDD5', color: '#C2410C', bar: '#F97316', width: '28%' },
}

const SOURCE_LABEL: Record<string, string> = {
  student: '생기부', common: '공통', past: '기출', custom: '직접 입력', voice: '말로 질문', followup: '꼬리질문',
}

const isLive = (q: any) => q?.answer_source === 'live'

// 군말이 많을 때만 한 줄 (예: 말버릇: “음” 5번, “어” 3번 …)
function fillerLine(fb: any) {
  const list = Object.entries((fb?.fillers ?? {}) as Record<string, number>).sort((a, b) => b[1] - a[1])
  const total = list.reduce((a, [, n]) => a + n, 0) || fb?.fillerCount || 0
  if (total < 4) return ''
  const words = list.slice(0, 3).map(([w, n]) => `“${w}” ${n}번`).join(', ')
  return `말버릇: ${words || `머뭇거림 ${total}번`} — 첫 문장을 미리 정해 두고, 생각할 땐 “음” 대신 잠깐 멈춰 보세요.`
}

// AI 피드백 → 학생에게 보낼 글 초안 (선생님이 고쳐서 보냄)
function draftFeedback(fb: LiveFeedback | null | undefined, name: string) {
  if (!fb) return ''
  const parts = [
    fb.good ? `잘한 점: ${fb.good}` : '',
    fb.improve ? `다음엔 이렇게: ${fb.improve}` : '',
    (fb as any).concept && (fb as any).concept.level !== '상' && (fb as any).concept.comment ? `컨셉: ${(fb as any).concept.comment}` : '',
    fillerLine(fb),
  ].filter(Boolean)
  return parts.length ? `${name} 학생, ${parts.join('\n')}` : ''
}

// 질문 여러 개의 AI 평가를 항목별 평균으로
function averageTags(rows: any[]) {
  const sum: Record<string, { s: number; n: number }> = {}
  for (const r of rows) {
    for (const t of (r.ai_feedback?.tags ?? []) as { label: string; level: string }[]) {
      if (!sum[t.label]) sum[t.label] = { s: 0, n: 0 }
      sum[t.label].s += LEVEL_SCORE[t.level] ?? 2
      sum[t.label].n += 1
    }
  }
  return AI_TAGS.filter(l => sum[l]).map(l => ({ label: l, level: scoreToLevel(sum[l].s / sum[l].n) }))
}

function TagBars({ tags }: { tags: { label: string; level: string }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {tags.map(t => {
        const ls = LEVEL_STYLE[t.level] ?? LEVEL_STYLE['중']
        return (
          <div key={t.label} className="flex items-center gap-2.5">
            <div className="w-[76px] flex-shrink-0 text-[12px] text-ink-secondary">{t.label}</div>
            <div className="flex-1 h-2 rounded bg-gray-100 overflow-hidden">
              <div className="h-full rounded" style={{ width: ls.width, background: ls.bar }} />
            </div>
            <div className="w-7 text-center text-[11px] font-extrabold rounded py-0.5" style={{ background: ls.bg, color: ls.color }}>{t.level}</div>
          </div>
        )
      })}
    </div>
  )
}


// 컨셉 맞춤 + 말버릇 (군말 횟수 · 반복 습관)
function ConceptHabits({ fb }: { fb: any }) {
  const fillers = Object.entries((fb?.fillers ?? {}) as Record<string, number>).sort((a, b) => b[1] - a[1])
  const habits: string[] = fb?.habits ?? []
  const c = fb?.concept as { level: string; comment: string } | null | undefined
  if (!c && !fillers.length && !habits.length) return null
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
    </div>
  )
}

// 학생 답변 한 개(본 질문 + 꼬리질문) — 선생님 확인 패널
function LiveAnswerPanel({ q, tails, student, onChanged }: {
  q: any
  tails: any[]
  student: any
  onChanged: () => void
}) {
  const name: string = student?.name || '학생'
  const fb: LiveFeedback | null = q.ai_feedback ?? null
  const [lines, setLines] = useState<LiveLine[]>(q.transcript ?? [])
  const [linesDirty, setLinesDirty] = useState(false)
  const [text, setText] = useState<string>(q.teacher_feedback ?? draftFeedback(fb, name))
  const [busy, setBusy] = useState<'' | 'regen' | 'send'>('')

  useEffect(() => {
    setLines(q.transcript ?? [])
    setLinesDirty(false)
    setText(q.teacher_feedback ?? draftFeedback(q.ai_feedback, name))
  }, [q.id, q.ai_feedback, q.teacher_feedback])

  const sent = !!q.feedback_sent_at

  const flip = (i: number) => {
    setLines(prev => prev.map((l, k) => (k === i ? { ...l, who: l.who === 'student' ? 'interviewer' : 'student' } : l)))
    setLinesDirty(true)
  }

  // 면접관/학생을 고쳤거나 피드백이 마음에 안 들 때 — 대화만 보내서 피드백 다시
  const regen = async () => {
    setBusy('regen')
    try {
      const { data, error } = await supabase.functions.invoke('mock-live-answer', {
        body: {
          meta: { questionText: q.question_text, questionType: q.type, studentName: name, grade: student?.grade, concept: (fb as any)?.conceptText ?? undefined },
          lines,
        },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'AI 피드백 실패')
      const { error: upErr } = await supabase.from('high_mock_exam_questions').update({
        transcript: data.lines,
        student_answer: data.answerText,
        ai_feedback: { ...data.feedback, charsPerMin: fb?.charsPerMin ?? data.feedback?.charsPerMin ?? null, conceptText: (fb as any)?.conceptText ?? null },
      }).eq('id', q.id)
      if (upErr) throw upErr
      setText(draftFeedback(data.feedback, name))
      setLinesDirty(false)
      onChanged()
    } catch (e: any) {
      alert(`AI 피드백 다시 받기 실패: ${e.message || e}`)
    } finally {
      setBusy('')
    }
  }

  // 학생에게 보내기 — 본 질문 + 딸린 꼬리질문까지 같이
  const send = async () => {
    if (!text.trim()) { alert('보낼 피드백을 적어 주세요.'); return }
    setBusy('send')
    try {
      const now = new Date().toISOString()
      const { error } = await supabase.from('high_mock_exam_questions')
        .update({ teacher_feedback: text.trim(), feedback_sent_at: now })
        .eq('id', q.id)
      if (error) throw error
      if (tails.length) {
        const { error: tErr } = await supabase.from('high_mock_exam_questions')
          .update({ feedback_sent_at: now })
          .in('id', tails.map(t => t.id))
        if (tErr) throw tErr
      }
      onChanged()
    } catch (e: any) {
      alert(`보내기 실패: ${e.message || e}`)
    } finally {
      setBusy('')
    }
  }

  const tc = TYPE_COLOR[q.type || ''] || TYPE_COLOR['인성']

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5">
      {/* 질문 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>{q.type}</span>
          {q.question_source && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-ink-secondary">{SOURCE_LABEL[q.question_source] ?? q.question_source}</span>}
          <span className="text-[11px] text-ink-muted">
            현장 녹음{q.answer_duration_sec ? ` · ${Math.floor(q.answer_duration_sec / 60)}분 ${q.answer_duration_sec % 60}초` : ''}
          </span>
          {sent
            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 ml-auto">학생에게 보냄</span>
            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 ml-auto">확인 전</span>}
        </div>
        <div className="text-[16px] font-bold text-ink leading-[1.55]">{q.question_text}</div>
      </div>

      {/* 받아 적은 대화 */}
      <div className="bg-gray-50 border border-line rounded-xl px-4 py-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[12px] font-bold text-ink-secondary">받아 적은 대화</div>
          <div className="text-[11px] text-ink-muted">AI가 나눴어요 · 이름표를 누르면 면접관↔학생이 바뀌어요</div>
        </div>
        {lines.length === 0 && <div className="text-[12px] text-ink-muted">받아 적은 내용이 없어요.</div>}
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2.5 items-start">
            <button onClick={() => flip(i)}
              className="w-[56px] flex-shrink-0 h-7 rounded-md text-[11px] font-extrabold"
              style={l.who === 'interviewer' ? { background: '#0F172A', color: '#fff' } : { background: '#DBEAFE', color: '#1D4ED8' }}>
              {l.who === 'interviewer' ? '면접관' : '학생'}
            </button>
            <div className="flex-1 text-[13.5px] leading-[1.75]" style={{ color: l.who === 'interviewer' ? '#0F172A' : '#334155' }}>{l.text}</div>
          </div>
        ))}
        {linesDirty && (
          <div className="flex items-center justify-between gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
            <div className="text-[12px] text-amber-800">면접관/학생을 바꿨어요. 고친 대로 피드백을 다시 받을까요?</div>
            <button onClick={regen} disabled={!!busy}
              className="px-3 py-1.5 rounded-md text-[12px] font-bold text-white disabled:opacity-50" style={{ background: THEME.accent }}>
              {busy === 'regen' ? '받는 중…' : '다시 받기'}
            </button>
          </div>
        )}
      </div>

      {/* AI 피드백 */}
      {fb ? (
        <div className="border border-line rounded-xl px-4 py-3.5 flex flex-col gap-3">
          <div className="text-[12px] font-bold text-ink-secondary">AI 피드백 (자동)</div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="flex flex-col gap-1">
              <div className="text-[12px] font-extrabold text-blue-700">잘한 점</div>
              <div className="text-[13px] leading-[1.7] text-ink">{fb.good || '—'}</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[12px] font-extrabold text-orange-700">보완할 점</div>
              <div className="text-[13px] leading-[1.7] text-ink">{fb.improve || '—'}</div>
            </div>
          </div>
          {fb.tags && fb.tags.length > 0 && <TagBars tags={fb.tags} />}
          <div className="text-[11px] text-ink-muted">
            {fb.charsPerMin ? `말 속도 1분 ${fb.charsPerMin}자 (보통 250~350)` : ''}
          </div>
          <ConceptHabits fb={fb} />
        </div>
      ) : (
        <div className="border border-dashed border-line rounded-xl px-4 py-3.5 text-[12px] text-ink-muted">AI 피드백이 아직 없어요.</div>
      )}

      {/* 꼬리질문 */}
      {tails.length > 0 && (
        <div className="border border-line rounded-xl px-4 py-3.5 flex flex-col gap-3">
          <div className="text-[12px] font-bold text-ink-secondary">이어서 한 꼬리질문 {tails.length}개</div>
          {tails.map((t, idx) => (
            <div key={t.id} className="flex flex-col gap-1 pl-3" style={{ borderLeft: '3px solid #BFDBFE' }}>
              <div className="text-[13px] font-semibold text-ink">꼬리 {idx + 1} · {t.question_text}</div>
              <div className="text-[12.5px] text-ink-secondary leading-[1.65] whitespace-pre-wrap">{t.student_answer || '답변 없음'}</div>
              {t.ai_feedback?.improve && <div className="text-[12px] text-orange-700 leading-[1.6]">보완: {t.ai_feedback.improve}</div>}
            </div>
          ))}
        </div>
      )}

      {/* 학생에게 보낼 피드백 */}
      <div className="rounded-xl px-4 py-3.5 flex flex-col gap-2.5" style={{ border: `2px solid ${sent ? '#E2E8F0' : THEME.accent}` }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label htmlFor={`tfb-${q.id}`} className="text-[14px] font-bold text-ink">학생에게 보낼 피드백</label>
          <div className="text-[11px] text-ink-muted">AI가 먼저 써 뒀어요 · 고쳐서 보내세요</div>
        </div>
        <textarea id={`tfb-${q.id}`} value={text} onChange={e => setText(e.target.value)} rows={4}
          className="border border-line rounded-lg px-3 py-2.5 text-[13.5px] leading-[1.7] outline-none resize-y focus:border-blue-400" />
        <div className="flex gap-2 justify-end flex-wrap">
          <button onClick={regen} disabled={!!busy}
            className="px-4 py-2.5 rounded-lg text-[12.5px] font-semibold border border-line bg-white text-ink-secondary disabled:opacity-50">
            {busy === 'regen' ? 'AI가 다시 보는 중…' : 'AI 피드백 다시 받기'}
          </button>
          <button onClick={send} disabled={!!busy}
            className="px-5 py-2.5 rounded-lg text-[13px] font-extrabold disabled:opacity-50"
            style={sent ? { background: '#E2E8F0', color: '#334155' } : { background: THEME.accent, color: '#fff', boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
            {busy === 'send' ? '보내는 중…' : sent ? '고친 내용으로 다시 보내기' : '이 질문 학생에게 보내기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 오른쪽: 학생 한 명 결과 (질문 목록 + 확인 패널)
// ─────────────────────────────────────────────
function ExamReview({ exam, student, onChanged }: { exam: any; student: any; onChanged: () => void }) {
  const { data: questions = [], refetch } = useQuery({
    queryKey: ['live-mock-questions', exam.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('high_mock_exam_questions').select('*').eq('exam_id', exam.id)
      if (error) throw error
      return (data ?? []) as any[]
    },
    refetchInterval: 5000,
  })
  const refresh = () => { void refetch(); onChanged() }

  const mains = questions.filter(q => q.level === 'main' && isLive(q)).sort((a, b) => a.order - b.order)
  const [selId, setSelId] = useState<string | null>(null)
  useEffect(() => { setSelId(null) }, [exam.id])
  const sel = mains.find(m => m.id === selId) ?? mains.find(m => !m.feedback_sent_at) ?? mains[0]
  const tails = sel ? questions.filter(q => q.parent_id === sel.id && q.student_answer).sort((a, b) => (a.tail_index || 0) - (b.tail_index || 0)) : []
  const waiting = mains.filter(q => !q.feedback_sent_at)
  const avg = useMemo(() => averageTags(questions.filter(isLive)), [questions])
  const ev = (exam.teacher_eval ?? {}) as { eye?: string; posture?: string; confidence?: string; memo?: string }
  const [sendingAll, setSendingAll] = useState(false)

  const sendAll = async () => {
    if (!waiting.length) return
    if (!confirm(`확인 안 한 질문 ${waiting.length}개를 ${student?.name ?? '학생'}에게 보낼까요?\n고치지 않은 질문은 AI가 쓴 피드백 그대로 가요.`)) return
    setSendingAll(true)
    try {
      const now = new Date().toISOString()
      for (const q of waiting) {
        const text = (q.teacher_feedback ?? draftFeedback(q.ai_feedback, student?.name || '학생')).trim()
        const { error } = await supabase.from('high_mock_exam_questions').update({ teacher_feedback: text || null, feedback_sent_at: now }).eq('id', q.id)
        if (error) throw error
        const tailIds = questions.filter(t => t.parent_id === q.id).map(t => t.id)
        if (tailIds.length) {
          const { error: tErr } = await supabase.from('high_mock_exam_questions').update({ feedback_sent_at: now }).in('id', tailIds)
          if (tErr) throw tErr
        }
      }
      refresh()
    } catch (e: any) {
      alert(`모두 보내기 실패: ${e.message || e}`)
    } finally {
      setSendingAll(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* 요약 */}
      <div className="flex gap-2.5 flex-wrap">
        <div className="flex-1 min-w-[200px] bg-white border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] font-bold text-ink-muted mb-1">{student?.name ?? ''} · 면접 설정</div>
          <div className="text-[14px] font-bold text-ink">{[exam.target_univ, exam.target_major].filter(Boolean).join(' ') || '대학·학과 미입력'}</div>
          <div className="text-[11.5px] text-ink-secondary mt-0.5">
            {[exam.interview_type, exam.live_group, exam.live_at ? new Date(exam.live_at).toLocaleDateString('ko-KR') : ''].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="flex-[1.4] min-w-[240px] bg-white border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] font-bold text-ink-muted mb-1.5">AI 평가 (질문 평균)</div>
          <div className="flex gap-1.5 flex-wrap">
            {avg.map(t => {
              const ls = LEVEL_STYLE[t.level]
              return <span key={t.label} className="text-[11.5px] font-bold px-2 py-1 rounded-md" style={{ background: ls.bg, color: ls.color }}>{t.label} {t.level}</span>
            })}
            {avg.length === 0 && <span className="text-[12px] text-ink-muted">아직 없어요</span>}
          </div>
        </div>
        <div className="flex-1 min-w-[180px] bg-white border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] font-bold text-ink-muted mb-1.5">원장 직접 평가</div>
          {ev.eye || ev.posture || ev.confidence ? (
            <>
              <div className="flex gap-1.5 flex-wrap">
                {[['시선', ev.eye], ['자세', ev.posture], ['자신감', ev.confidence]].filter(([, v]) => v).map(([k, v]) => (
                  <span key={k} className="text-[11.5px] font-bold px-2 py-1 rounded-md bg-slate-900 text-white">{k} {v}</span>
                ))}
              </div>
              {ev.memo && <div className="text-[11.5px] text-ink-secondary mt-1.5">“{ev.memo}”</div>}
            </>
          ) : <div className="text-[12px] text-ink-muted">입력 안 함</div>}
        </div>
        <div className="flex-shrink-0 rounded-xl px-4 py-3 flex flex-col justify-center gap-1.5 bg-slate-900">
          <div className="text-[11.5px] text-slate-300">확인 안 한 질문 <b className="text-white">{waiting.length}개</b></div>
          <button onClick={sendAll} disabled={sendingAll || waiting.length === 0}
            className="px-3.5 py-2 rounded-lg text-[12.5px] font-extrabold bg-white text-slate-900 disabled:opacity-40">
            {sendingAll ? '보내는 중…' : waiting.length ? '남은 질문 모두 보내기' : '모두 보냈어요'}
          </button>
        </div>
      </div>

      <div className="flex gap-3 items-start flex-wrap">
        {/* 질문 목록 */}
        <div className="w-[250px] flex-shrink-0 bg-white border border-line rounded-2xl p-3 flex flex-col gap-1.5">
          <div className="px-1 pb-1">
            <div className="text-[13px] font-bold text-ink">질문 {mains.length}개</div>
            <div className="text-[11px] text-ink-secondary">보냄 {mains.length - waiting.length}개</div>
          </div>
          {mains.map((q, i) => {
            const tc = TYPE_COLOR[q.type || ''] || TYPE_COLOR['인성']
            const on = sel?.id === q.id
            const tailN = questions.filter(t => t.parent_id === q.id && t.student_answer).length
            return (
              <button key={q.id} onClick={() => setSelId(q.id)} className="w-full rounded-lg px-3 py-2.5 text-left"
                style={{ border: `1px solid ${on ? THEME.accent : '#E5E7EB'}`, background: on ? THEME.accentBg : '#fff' }}>
                <div className="flex gap-1 mb-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white" style={{ color: THEME.accentDark, border: `1px solid ${THEME.accentBorder}60` }}>Q{i + 1}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>{q.type}</span>
                  {tailN > 0 && <span className="text-[9px] font-semibold text-ink-muted bg-gray-100 px-1.5 py-0.5 rounded-full">꼬리 {tailN}</span>}
                </div>
                <div className="text-[11.5px] font-medium text-ink leading-[1.4] mb-1.5">{q.question_text}</div>
                {q.feedback_sent_at
                  ? <span className="text-[9px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded-full">학생에게 보냄</span>
                  : <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full">AI 피드백 · 확인 전</span>}
              </button>
            )
          })}
          {mains.length === 0 && <div className="text-[12px] text-ink-muted px-1 py-4">녹음한 답변이 없어요.</div>}
        </div>

        {/* 확인 패널 */}
        <div className="flex-1 min-w-[360px] bg-white border border-line rounded-2xl flex flex-col max-h-[calc(100vh-260px)] overflow-hidden">
          {sel
            ? <LiveAnswerPanel q={sel} tails={tails} student={student} onChanged={refresh} />
            : <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px] py-16">질문을 골라 주세요</div>}
        </div>
      </div>

      {/* 아래쪽에도 한 번에 보내기 (긴 화면에서 위로 안 올라가도 되게) */}
      {mains.length > 0 && (
        <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap bg-slate-900 text-white">
          <div className="text-[13.5px] leading-[1.6]">
            {waiting.length
              ? <>확인 안 한 질문 <b>{waiting.length}개</b> · 보내면 {student?.name ?? '학생'} 화면에 질문 · 내 답변 · 피드백이 나타나요</>
              : <>{student?.name ?? '학생'}에게 모든 질문을 보냈어요</>}
          </div>
          <button onClick={sendAll} disabled={sendingAll || waiting.length === 0}
            className="h-11 px-4 rounded-xl bg-white text-slate-900 text-[14px] font-extrabold disabled:opacity-40">
            {sendingAll ? '보내는 중…' : waiting.length ? '남은 질문 모두 보내기' : '모두 보냈어요'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────
const GRADES = ['고1', '고2', '고3']

export default function MockExamPage() {
  const qc = useQueryClient()
  const [grade, setGrade] = useState('고1')
  const [onlyTodo, setOnlyTodo] = useState(false)
  const [selExamId, setSelExamId] = useState<string | null>(null)
  const [liveOpen, setLiveOpen] = useState(false)
  const [resume, setResume] = useState<any[] | null>(null)   // 이어서 할 기록들

  const { data: academyStudents = [] } = useAcademyStudents('high') as any
  const students = useMemo(() => (academyStudents as any[]).filter(s => s.grade === grade), [academyStudents, grade])
  const ids = students.map(s => s.id)

  // 이 학년 학생들의 현장 모의면접 기록 + 질문 상태 (확인 전 개수 계산용)
  const { data: list = { exams: [] as any[], qs: [] as any[] } } = useQuery({
    queryKey: ['live-mock-list', grade, ids.join(',')],
    enabled: ids.length > 0,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data: exams, error } = await supabase.from('high_mock_exam').select('*')
        .in('student_id', ids).not('live_at', 'is', null).order('live_at', { ascending: false })
      if (error) throw error
      const examIds = (exams ?? []).map((e: any) => e.id)
      let qs: any[] = []
      if (examIds.length) {
        const { data, error: qErr } = await supabase.from('high_mock_exam_questions')
          .select('id, exam_id, level, parent_id, answer_source, feedback_sent_at, student_answer')
          .in('exam_id', examIds)
        if (qErr) throw qErr
        qs = data ?? []
      }
      return { exams: exams ?? [], qs }
    },
  })

  const rows = useMemo(() => list.exams.map((e: any) => {
    const mine = list.qs.filter((q: any) => q.exam_id === e.id && q.answer_source === 'live' && q.student_answer)
    const mains = mine.filter((q: any) => q.level === 'main')
    return {
      exam: e,
      student: students.find(s => s.id === e.student_id),
      answered: mains.length,
      tails: mine.length - mains.length,
      waiting: mains.filter((q: any) => !q.feedback_sent_at).length,
    }
  }).filter((r: any) => !onlyTodo || r.waiting > 0), [list, students, onlyTodo])

  // 같은 날 같은 조끼리 묶기
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: any[] }[] = []
    for (const r of rows) {
      const d = new Date(r.exam.live_at)
      const label = `${d.getMonth() + 1}월 ${d.getDate()}일${r.exam.live_group ? ' · ' + r.exam.live_group : ''}`
      let g = out.find(x => x.label === label)
      if (!g) { g = { key: label, label, items: [] }; out.push(g) }
      g.items.push(r)
    }
    return out
  }, [rows])

  const todoStudents = rows.filter((r: any) => r.waiting > 0).length
  const todoQuestions = rows.reduce((a: number, r: any) => a + r.waiting, 0)
  const sel = rows.find((r: any) => r.exam.id === selExamId) ?? null
  const refreshAll = () => { void qc.invalidateQueries({ queryKey: ['live-mock-list'] }) }

  return (
    <div className="px-8 py-7 min-h-[calc(100vh-50px)] bg-[#F8FAFC] font-sans text-ink">
      {liveOpen && (
        <LiveInterview
          grade={grade}
          resumeExams={resume ?? undefined}
          onClose={() => { setLiveOpen(false); setResume(null); refreshAll() }}
          onPick={(id: string) => { setSelExamId(id); refreshAll() }}
        />
      )}

      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[22px] font-extrabold tracking-tight">면접 모의고사</div>
          <div className="text-[13px] text-ink-secondary font-medium mt-0.5">학원에서 현장 모의면접을 진행하고, 학생별 AI 피드백을 확인해서 보내요.</div>
        </div>
        <button onClick={() => { setResume(null); setLiveOpen(true) }}
          className="h-12 px-5 rounded-xl text-white text-[14px] font-extrabold flex items-center gap-2"
          style={{ background: THEME.accent, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>
          {grade} 현장 모의면접 시작
        </button>
      </div>

      {/* 학년 · 필터 */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex gap-1.5">
          {GRADES.map(g => (
            <button key={g} onClick={() => { setGrade(g); setSelExamId(null) }}
              className="px-4 py-1.5 rounded-full text-[12px] font-semibold border"
              style={{ background: grade === g ? THEME.accent : '#fff', color: grade === g ? '#fff' : '#6B7280', borderColor: grade === g ? THEME.accent : '#E5E7EB' }}>
              {g}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {todoQuestions > 0 && (
            <div className="text-[12.5px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              확인 안 한 학생 {todoStudents}명 · 질문 {todoQuestions}개
            </div>
          )}
          <label className="flex items-center gap-1.5 text-[12.5px] text-ink-secondary cursor-pointer">
            <input type="checkbox" checked={onlyTodo} onChange={e => setOnlyTodo(e.target.checked)} />
            확인 안 한 학생만
          </label>
        </div>
      </div>

      <div className="flex gap-4 items-start flex-wrap">
        {/* 왼쪽: 학생별 결과 목록 */}
        <div className="w-[320px] flex-shrink-0 flex flex-col gap-3">
          {groups.length === 0 && (
            <div className="bg-white border border-line rounded-2xl p-6 text-center text-[13px] text-ink-muted leading-[1.7]">
              {grade} 현장 모의면접 기록이 없어요.<br />위의 <b className="text-ink">현장 모의면접 시작</b>으로 진행해 보세요.
            </div>
          )}
          {groups.map(g => (
            <div key={g.key} className="bg-white border border-line rounded-2xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 px-1 pb-1">
                <div className="text-[12px] font-bold text-ink-muted">{g.label} · {g.items.length}명</div>
                <button onClick={() => { setResume(g.items.map((r: any) => r.exam)); setLiveOpen(true) }}
                  className="text-[11.5px] font-bold px-2.5 py-1 rounded-lg border" style={{ color: THEME.accentDark, borderColor: THEME.accentBorder, background: THEME.accentBg }}>
                  이어서 하기
                </button>
              </div>
              {g.items.map((r: any) => {
                const on = r.exam.id === selExamId
                return (
                  <button key={r.exam.id} onClick={() => setSelExamId(r.exam.id)}
                    className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3"
                    style={{ border: `1.5px solid ${on ? THEME.accent : '#F1F5F9'}`, background: on ? THEME.accentBg : '#fff' }}>
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[13px] font-bold" style={{ background: THEME.accent }}>
                      {(r.student?.name ?? '?').slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold truncate">{r.student?.name ?? '학생'}</div>
                      <div className="text-[11.5px] text-ink-secondary truncate">
                        {[r.exam.target_univ, r.exam.target_major].filter(Boolean).join(' ') || '—'} · 질문 {r.answered}{r.tails ? ` · 꼬리 ${r.tails}` : ''}
                      </div>
                    </div>
                    {r.waiting > 0
                      ? <span className="text-[10.5px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">확인 전 {r.waiting}</span>
                      : <span className="text-[10.5px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">보냄</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* 오른쪽: 선택한 학생 결과 */}
        <div className="flex-1 min-w-[560px]">
          {sel
            ? <ExamReview key={sel.exam.id} exam={sel.exam} student={sel.student} onChanged={refreshAll} />
            : (
              <div className="bg-white border border-line rounded-2xl py-20 text-center text-[13px] text-ink-muted">
                왼쪽에서 학생을 고르면 질문별 AI 피드백을 확인하고 학생에게 보낼 수 있어요.
              </div>
            )}
        </div>
      </div>
    </div>
  )
}