import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState, academyState } from '@/lib/auth/atoms'

// ============================================================
// 4가지 성향 유형
// ============================================================

export const TYPES = {
  aa: { name: '학술·분석형', desc: '데이터와 논리로 깊이 파고드는', verb: '분석', color: '#2563EB' },
  ac: { name: '학술·창의형', desc: '분야를 넘나들며 새 관점을 찾는', verb: '융합 탐구', color: '#7C3AED' },
  ai: { name: '실천·개선형', desc: '문제를 찾아 해결하고 개선하는', verb: '개선', color: '#059669' },
  ar: { name: '실천·창작형', desc: '기획하고 직접 만들어내는', verb: '제작', color: '#D97706' },
} as const

export type TypeKey = keyof typeof TYPES

/** 각 문항의 보기는 aa / ac / ai / ar 순서 */
const QUESTIONS: { q: string; o: [string, string, string, string] }[] = [
  { q: '관심 있는 주제가 생기면 나는?', o: ['자료와 데이터를 모아 분석한다', '새로운 관점으로 접근해본다', '문제점을 찾아 개선 방법을 고민한다', '직접 기획해서 만들어본다'] },
  { q: '팀 프로젝트에서 주로 맡는 역할은?', o: ['자료 조사와 근거 정리', '아이디어 제안', '부족한 부분 보완', '전체 기획과 제작'] },
  { q: '수업 중 가장 재미있는 순간은?', o: ['원리가 논리적으로 딱 맞아떨어질 때', '배운 게 다른 과목과 연결될 때', '실생활 문제에 적용될 때', '직접 만들어보는 실습을 할 때'] },
  { q: '보고서를 쓸 때 가장 공들이는 부분은?', o: ['데이터와 근거', '참신한 관점', '문제 해결 방안', '표현과 구성'] },
  { q: '새로운 걸 배울 때 나는?', o: ['기본 원리부터 차근차근', '전체 그림을 먼저 그린다', '어디에 쓰이는지 먼저 확인한다', '일단 해보면서 익힌다'] },
  { q: '발표를 준비할 때 나는?', o: ['근거 자료를 충분히 모은다', '남들과 다른 각도를 찾는다', '듣는 사람에게 필요한 걸 생각한다', '슬라이드와 전달 방식을 다듬는다'] },
  { q: '실험 결과가 예상과 다르면?', o: ['왜 다른지 원인을 분석한다', '다른 해석이 가능한지 살펴본다', '실험 방법을 개선한다', '다른 방식으로 다시 설계한다'] },
  { q: '뉴스를 볼 때 눈이 가는 건?', o: ['통계와 수치', '여러 분야가 얽힌 이슈', '사회 문제와 해결 시도', '새로 나온 제품이나 콘텐츠'] },
  { q: '동아리를 고른다면?', o: ['학술 탐구 동아리', '융합 프로젝트 동아리', '봉사·캠페인 동아리', '창작·제작 동아리'] },
  { q: '과제 마감이 다가올 때 나는?', o: ['자료를 더 찾아 완성도를 높인다', '새 아이디어를 더 넣는다', '부족한 부분을 점검해 고친다', '결과물 형태를 다듬는다'] },
  { q: '친구가 고민을 털어놓으면?', o: ['상황을 정리해서 분석해준다', '다르게 볼 관점을 제안한다', '구체적인 해결 방법을 같이 찾는다', '같이 뭔가 해보자고 제안한다'] },
  { q: '책을 고를 때 손이 가는 건?', o: ['근거가 탄탄한 전문서', '분야를 넘나드는 교양서', '사회 문제를 다룬 르포', '창작물이나 에세이'] },
  { q: '가장 하고 싶은 과제 유형은?', o: ['자료 분석 보고서', '주제 융합 탐구', '문제 해결 제안서', '작품·산출물 제작'] },
  { q: '새로운 기술을 접하면 드는 생각은?', o: ['원리가 어떻게 되지?', '다른 분야에 어떻게 쓸까?', '어떤 불편을 해결하지?', '이걸로 뭘 만들 수 있을까?'] },
  { q: '조별 의견이 갈리면 나는?', o: ['근거를 비교해서 판단한다', '두 의견을 합칠 방법을 찾는다', '실행 가능한 쪽을 고른다', '일단 시안을 만들어 보여준다'] },
  { q: '관심 분야를 깊이 팔 때 나는?', o: ['논문과 통계까지 찾아본다', '인접 분야까지 넓혀본다', '실제 현장 사례를 찾아본다', '직접 만들어 시험해본다'] },
  { q: '가장 성취감을 느끼는 순간은?', o: ['복잡한 걸 명확하게 설명해냈을 때', '아무도 못 본 연결을 찾았을 때', '실제로 뭔가 나아졌을 때', '내 결과물이 완성됐을 때'] },
  { q: '진로를 상상할 때 떠오르는 장면은?', o: ['자료를 분석하는 연구실', '여러 분야 사람들이 모인 회의', '현장에서 문제를 푸는 모습', '만든 걸 사람들 앞에 선보이는 자리'] },
  { q: '수행평가 주제를 정한다면?', o: ['검증할 수 있는 주제', '색다른 주제', '개선이 필요한 주제', '직접 만들 수 있는 주제'] },
  { q: '1년 뒤 남기고 싶은 건?', o: ['깊이 있는 탐구 기록', '독창적인 관점의 결과물', '실제로 바꿔낸 경험', '완성한 작품이나 산출물'] },
]

const KEYS: TypeKey[] = ['aa', 'ac', 'ai', 'ar']

interface Props {
  /** 진단 완료 후 다음 단계로 */
  onDone?: () => void
}

export default function AptitudeTest({ onDone }: Props) {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const qc = useQueryClient()

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined

  const [answers, setAnswers] = useState<Record<number, TypeKey>>({})
  const [idx, setIdx] = useState(0)
  const [retaking, setRetaking] = useState(false)

  const { data: saved, isLoading } = useQuery({
    queryKey: ['my-aptitude', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('high_aptitude_result')
        .select('type_key, type_name, scores, retake_count')
        .eq('student_id', studentId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      if (!studentId || !academyId) throw new Error('학생 정보가 없습니다')

      const scores: Record<TypeKey, number> = { aa: 0, ac: 0, ai: 0, ar: 0 }
      Object.values(answers).forEach((k) => { scores[k] += 1 })

      // 동점이면 KEYS 순서가 앞선 쪽
      const winner = KEYS.reduce((best, k) => (scores[k] > scores[best] ? k : best), KEYS[0])

      const { error } = await supabase.from('high_aptitude_result').upsert(
        {
          student_id: studentId,
          academy_id: academyId,
          answers,
          scores,
          type_key: winner,
          type_name: TYPES[winner].name,
          retake_count: (saved?.retake_count ?? 0) + (retaking ? 1 : 0),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' },
      )
      if (error) throw error
      return winner
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-aptitude', studentId] })
      setRetaking(false)
    },
  })

  if (isLoading) {
    return <div className="p-6 text-[13px] text-ink-muted">불러오는 중…</div>
  }

  // ── 이미 완료한 경우: 결과 화면 ───────────────────────────
  if (saved && !retaking) {
    const t = TYPES[saved.type_key as TypeKey]
    const scores = (saved.scores ?? {}) as Record<TypeKey, number>

    return (
      <div className="max-w-[560px]">
        <div className="bg-white border border-line rounded-2xl p-6">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
            성향 진단 결과
          </div>
          <div className="text-[24px] font-extrabold mb-1" style={{ color: t.color }}>
            {t.name}
          </div>
          <div className="text-[13px] text-ink-secondary mb-5">{t.desc} 유형이에요.</div>

          <div className="flex flex-col gap-2 mb-5">
            {KEYS.map((k) => {
              const v = scores[k] ?? 0
              const pct = Math.round((v / QUESTIONS.length) * 100)
              return (
                <div key={k} className="flex items-center gap-2.5">
                  <div className="w-[76px] text-[11px] font-semibold text-ink-secondary">
                    {TYPES[k].name}
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: TYPES[k].color }}
                    />
                  </div>
                  <div className="w-7 text-[11px] font-bold text-ink-muted text-right">{v}</div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setAnswers({}); setIdx(0); setRetaking(true) }}
              className="h-11 px-4 bg-white border border-line text-ink-secondary rounded-xl text-[13px] font-semibold hover:bg-gray-50"
            >
              다시 검사하기
            </button>
            {onDone && (
              <button
                onClick={onDone}
                className="flex-1 h-11 bg-brand-high text-white rounded-xl text-[13px] font-bold hover:bg-brand-high-dark transition-all"
              >
                다음: 진로 계열 검사 →
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── 검사 진행 ────────────────────────────────────────────
  const q = QUESTIONS[idx]
  const picked = answers[idx]
  const done = Object.keys(answers).length
  const isLast = idx === QUESTIONS.length - 1

  const choose = (k: TypeKey) => {
    setAnswers((prev) => ({ ...prev, [idx]: k }))
    if (!isLast) setTimeout(() => setIdx((i) => i + 1), 180)
  }

  return (
    <div className="max-w-[560px]">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-ink-muted">
            {idx + 1} / {QUESTIONS.length}
          </span>
          <span className="text-[11px] font-semibold text-brand-high">{done}문항 응답</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-brand-high rounded-full transition-all"
            style={{ width: `${(done / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl p-6">
        <div className="text-[16px] font-extrabold text-ink mb-4 leading-snug">
          Q{idx + 1}. {q.q}
        </div>

        <div className="flex flex-col gap-2 mb-5">
          {q.o.map((label, i) => {
            const k = KEYS[i]
            const on = picked === k
            return (
              <button
                key={k}
                onClick={() => choose(k)}
                className="text-left rounded-xl px-4 py-3 border-2 transition-all text-[13.5px]"
                style={{
                  borderColor: on ? '#2563EB' : '#E5E7EB',
                  background: on ? '#EFF6FF' : '#fff',
                  color: on ? '#1E3A8A' : '#334155',
                  fontWeight: on ? 700 : 500,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="h-10 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold disabled:opacity-40"
          >
            ← 이전
          </button>

          {!isLast ? (
            <button
              onClick={() => setIdx((i) => Math.min(QUESTIONS.length - 1, i + 1))}
              className="h-10 px-3.5 bg-white border border-line text-ink-secondary rounded-lg text-[12px] font-semibold"
            >
              다음 →
            </button>
          ) : (
            <button
              onClick={() => save.mutate()}
              disabled={done < QUESTIONS.length || save.isPending}
              className="flex-1 h-10 bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-40"
            >
              {save.isPending
                ? '저장 중…'
                : done < QUESTIONS.length
                  ? `${QUESTIONS.length - done}문항 더 응답해주세요`
                  : '결과 보기'}
            </button>
          )}
        </div>

        {save.isError && (
          <div className="text-[12px] text-red-600 mt-3">
            저장하지 못했어요: {(save.error as Error).message}
          </div>
        )}
      </div>
    </div>
  )
}