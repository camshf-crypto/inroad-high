import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { MIDDLE_ROADMAP } from '@/constants/middleRoadmap'

// 초록 테마 (중등)
const THEME = {
  accent: '#10B981',
  accentDark: '#065F46',
  accentBg: '#ECFDF5',
  accentBorder: '#6EE7B7',
}

interface WbBlock {
  id: string
  label: string
  hint?: string
}

export default function MiddleWorkbookView() {
  const { id: studentId = '', missionKey = '' } = useParams()
  const navigate = useNavigate()

  // ── 커리큘럼 상수에서 미션 정보 ──
  const missionInfo = useMemo(() => {
    for (const [grade, months] of Object.entries(MIDDLE_ROADMAP)) {
      for (const month of months) {
        const found = month.missions.find(ms => ms.key === missionKey)
        if (found) {
          return {
            grade,
            month: month.m,
            theme: month.theme,
            output: month.output,
            subject: found.subject,
            text: found.t,
          }
        }
      }
    }
    return null
  }, [missionKey])

  // ── 학생 ──
  const { data: student } = useQuery({
    queryKey: ['wb-student', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, grade')
        .eq('id', studentId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  // ── 워크북 양식 ──
  const { data: form } = useQuery({
    queryKey: ['wb-form', missionKey],
    enabled: !!missionKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_workbook')
        .select('title, intro, blocks')
        .eq('mission_key', missionKey)
        .maybeSingle()
      if (error) throw error
      return data as { title: string; intro: string | null; blocks: WbBlock[] | null } | null
    },
  })

  // ── 학생 답안 ──
  const { data: answer, isLoading } = useQuery({
    queryKey: ['wb-answer', studentId, missionKey],
    enabled: !!studentId && !!missionKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_workbook_answer')
        .select('answers, submitted_at, updated_at')
        .eq('student_id', studentId)
        .eq('mission_key', missionKey)
        .maybeSingle()
      if (error) throw error
      return data as { answers: Record<string, string>; submitted_at: string | null; updated_at: string } | null
    },
  })

  const blocks: WbBlock[] = form?.blocks?.length
    ? form.blocks
    : Object.keys(answer?.answers ?? {}).map(k => ({ id: k, label: k }))

  const submitted = !!answer?.submitted_at
  const totalChars = Object.values(answer?.answers ?? {}).join('').length

  return (
    <div className="h-full overflow-y-auto px-8 py-7 box-border font-sans text-ink">
      <div className="max-w-4xl mx-auto pb-16">

        <button
          onClick={() => navigate(`/admin/middle-students/${studentId}`)}
          className="text-[12px] text-ink-muted hover:text-ink mb-4 flex items-center gap-1"
        >
          ← 학생 상세로
        </button>

        {/* 헤더 */}
        <div
          className="rounded-2xl px-6 py-5 mb-5"
          style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}` }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[11px] font-bold mb-1.5" style={{ color: THEME.accentDark }}>
                {missionInfo
                  ? `${missionInfo.grade} · ${missionInfo.month} · ${missionInfo.theme}`
                  : '워크북'}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {missionInfo?.subject && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#fff', color: THEME.accentDark }}
                  >
                    {missionInfo.subject}
                  </span>
                )}
                <h1 className="text-[19px] font-extrabold text-ink tracking-tight">
                  {missionInfo?.text ?? form?.title ?? missionKey}
                </h1>
              </div>
              {missionInfo?.output && (
                <div className="text-[11px] text-ink-secondary mt-2">
                  이 달에 남기는 것 — <b>{missionInfo.output}</b>
                </div>
              )}
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-[13px] font-bold text-ink">{student?.name ?? '—'}</div>
              <div className="text-[11px] text-ink-secondary mt-0.5">{student?.grade ?? ''}</div>
              <div
                className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1.5"
                style={{
                  background: submitted ? '#fff' : '#FFFBEB',
                  color: submitted ? '#047857' : '#92400E',
                  border: `1px solid ${submitted ? THEME.accentBorder : '#FDE68A'}`,
                }}
              >
                {answer ? (submitted ? '제출 완료' : '작성 중') : '미작성'}
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-[13px] text-ink-muted">불러오는 중…</div>
        ) : !answer ? (
          <div className="rounded-2xl border border-line bg-white text-center py-20 px-6">
            <div className="text-3xl mb-3">📄</div>
            <div className="text-[15px] font-bold text-ink mb-1.5">아직 작성한 내용이 없어요</div>
            <div className="text-[12px] text-ink-secondary">
              학생이 워크북을 열어 작성하면 여기에 표시돼요.
            </div>
          </div>
        ) : (
          <>
            {/* 안내문 */}
            {form?.intro && (
              <div
                className="rounded-2xl px-5 py-4 mb-5"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
              >
                <div className="text-[10px] font-bold text-amber-700 mb-1">워크북 안내</div>
                <div className="text-[12.5px] text-amber-900 leading-[1.7] whitespace-pre-wrap">
                  {form.intro}
                </div>
              </div>
            )}

            {/* 답안 */}
            <div className="rounded-2xl border border-line bg-white px-7 py-6">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-line">
                <div className="text-[14px] font-bold text-ink">
                  ✏️ {form?.title ?? '학생이 작성한 내용'}
                </div>
                <div className="text-[11px] text-ink-muted">
                  {submitted
                    ? `제출 ${new Date(answer.submitted_at!).toLocaleString('ko-KR')}`
                    : `마지막 작성 ${new Date(answer.updated_at).toLocaleString('ko-KR')}`}
                  {' · '}총 {totalChars}자
                </div>
              </div>

              {blocks.map((b, i) => {
                const val = answer.answers?.[b.id]?.trim()
                return (
                  <div key={b.id} className="mb-6 last:mb-0">
                    <div className="text-[13px] font-bold text-ink mb-1">{b.label}</div>
                    {b.hint && <div className="text-[11px] text-ink-muted mb-2">{b.hint}</div>}
                    <div
                      className="rounded-lg px-4 py-3.5 text-[13.5px] leading-[1.9] whitespace-pre-wrap"
                      style={{
                        background: val ? '#F8FAFC' : '#FCFCFD',
                        border: `1px solid ${val ? '#E5E7EB' : '#F1F2F4'}`,
                        color: val ? '#1a1a1a' : '#9CA3AF',
                        minHeight: '3.5rem',
                      }}
                    >
                      {val || '— 아직 안 썼어요'}
                    </div>
                    {val && (
                      <div className="text-[10px] text-ink-muted mt-1 text-right">{val.length}자</div>
                    )}
                    {i < blocks.length - 1 && <div className="h-0" />}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}