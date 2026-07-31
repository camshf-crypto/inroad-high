import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { supabase } from '@/lib/supabase'
import { studentState, academyState } from '@/lib/auth/atoms'

interface Props {
  topicId: string
  content: string
  saving?: boolean
  onSave: (content: string) => void
}

const FIELDS = [
  {
    key: '한 일',
    label: '한 일',
    hint: '무엇을 했는지 사실만. 잘한 척 말고 있는 그대로.',
    placeholder: '논문 3편을 찾아 읽고, 실험을 두 번 반복해서…',
  },
  {
    key: '배운 점',
    label: '배운 점',
    hint: '생각이 바뀐 지점이나 새로 알게 된 것.',
    placeholder: '처음엔 ○○일 거라 생각했는데…',
  },
] as const

export default function ArchiveWriter({ topicId, content, saving, onSave }: Props) {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const qc = useQueryClient()

  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined

  const [did, setDid] = useState('')
  const [learned, setLearned] = useState('')
  const [next, setNext] = useState('')

  // 저장된 본문에서 세 칸 복원
  useEffect(() => {
    if (!content) return
    const pick = (label: string) => {
      const re = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n(?:한 일|배운 점|더 알고 싶은 것):|$)`)
      return content.match(re)?.[1]?.trim() ?? ''
    }
    setDid(pick('한 일'))
    setLearned(pick('배운 점'))
    setNext(pick('더 알고 싶은 것'))
  }, [content])

  const { data: ideas = [] } = useQuery({
    queryKey: ['next-ideas', topicId],
    enabled: !!studentId,
    queryFn: async (): Promise<{ id: string; text: string; status: string }[]> => {
      const { data, error } = await supabase
        .from('high_next_idea')
        .select('id, text, status')
        .eq('from_topic_id', topicId)
        .order('created_at')
      if (error) throw error
      return data ?? []
    },
  })

  const compiled = useMemo(
    () =>
      [
        did.trim() && `한 일: ${did.trim()}`,
        learned.trim() && `배운 점: ${learned.trim()}`,
        next.trim() && `더 알고 싶은 것: ${next.trim()}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    [did, learned, next],
  )

  const addIdea = useMutation({
    mutationFn: async (text: string) => {
      if (!studentId || !academyId) throw new Error('학생 정보가 없습니다')
      const { error } = await supabase.from('high_next_idea').insert({
        student_id: studentId,
        academy_id: academyId,
        from_topic_id: topicId,
        text: text.trim(),
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['next-ideas', topicId] }),
  })

  const removeIdea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('high_next_idea').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['next-ideas', topicId] }),
  })

  const save = () => {
    onSave(compiled)
    const t = next.trim()
    if (t && !ideas.some((i) => i.text === t)) addIdea.mutate(t)
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="text-[14px] font-extrabold text-ink mb-1">활동 정리하기</div>
      <div className="text-[11.5px] text-ink-muted mb-4 leading-relaxed">
        무엇을 했고 무엇을 배웠는지 적어두면, 선생님이 생기부를 쓸 때 그대로 재료가 돼요.
      </div>

      <div className="flex flex-col gap-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <div className="text-[12.5px] font-bold text-ink mb-0.5">{f.label}</div>
            <div className="text-[11px] text-ink-muted mb-1.5">{f.hint}</div>
            <textarea
              value={f.key === '한 일' ? did : learned}
              onChange={(e) =>
                f.key === '한 일' ? setDid(e.target.value) : setLearned(e.target.value)
              }
              placeholder={f.placeholder}
              rows={4}
              className="w-full border border-line rounded-xl px-3.5 py-2.5 text-[13px] leading-[1.7] outline-none resize-y focus:border-brand-high"
            />
          </div>
        ))}

        {/* 다음 탐구 씨앗 */}
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50/60 p-4">
          <div className="text-[12.5px] font-bold text-amber-900 mb-0.5">
            더 알고 싶은 것
          </div>
          <div className="text-[11px] text-amber-800 mb-2 leading-relaxed">
            여기 적은 건 따로 모아둬요. 다음 탐구를 뭘 할지 정할 때 이걸 보고 어느 과목에서 하면
            좋을지 추천해드려요.
          </div>
          <textarea
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="이번엔 ○○까지만 봤는데, 다음엔 △△를 알아보고 싶어요"
            rows={3}
            className="w-full border border-amber-300 rounded-xl px-3.5 py-2.5 text-[13px] leading-[1.7] outline-none resize-y focus:border-amber-500 bg-white"
          />

          {ideas.length > 0 && (
            <div className="mt-2.5">
              <div className="text-[10.5px] font-bold text-amber-800 mb-1.5">
                모아둔 것 {ideas.length}개
              </div>
              <div className="flex flex-col gap-1.5">
                {ideas.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-start gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2"
                  >
                    <span className="flex-1 text-[12px] text-ink leading-relaxed">{i.text}</span>
                    {i.status !== 'open' && (
                      <span className="text-[9.5px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">
                        진행함
                      </span>
                    )}
                    <button
                      onClick={() => removeIdea.mutate(i.id)}
                      className="text-[11px] text-ink-muted hover:text-red-500 flex-shrink-0"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <span className="text-[11px] text-ink-muted">
          공백 제외 {compiled.replace(/\s/g, '').length}자
        </span>
        <button
          onClick={save}
          disabled={!compiled.trim() || saving}
          className="ml-auto h-10 px-5 bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-40"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}