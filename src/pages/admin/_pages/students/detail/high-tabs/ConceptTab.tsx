// src/pages/admin/_pages/students/detail/high-tabs/ConceptTab.tsx

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TYPE_NAMES, TYPE_DESC, TYPE_MAJORS } from '@/pages/high-student/_pages/concept/questions'

interface Props {
  student: {
    id: string
    name: string
    academy_id: string
  }
}

interface ConceptData {
  id: string
  status: string
  type_code: string | null
  type_name: string | null
  scores: Record<string, number> | null
  answers: Record<string, string>
  current_question: number
  major: string | null
  career: string | null
  custom_goal: string | null
  keywords: string[]
  approved_at: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

export default function ConceptTab({ student }: Props) {
  const [conceptData, setConceptData] = useState<ConceptData | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    fetchConcept()
  }, [student.id])

  const fetchConcept = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('student_concept')
        .select('*')
        .eq('student_id', student.id)
        .eq('academy_id', student.academy_id)
        .maybeSingle()
      if (error) throw error
      setConceptData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!conceptData) return
    setApproving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from('student_concept')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id ?? '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conceptData.id)
      await fetchConcept()
    } catch (e) {
      console.error(e)
      alert('승인에 실패했어요.')
    } finally {
      setApproving(false)
    }
  }

  const handleRevoke = async () => {
    if (!conceptData) return
    if (!confirm('승인을 취소하고 학생이 다시 검사를 진행할 수 있도록 하시겠어요?')) return
    setApproving(true)
    try {
      await supabase
        .from('student_concept')
        .update({
          status: 'completed',
          approved_at: null,
          approved_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conceptData.id)
      await fetchConcept()
    } catch (e) {
      console.error(e)
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <div className="text-[13px] text-ink-secondary">불러오는 중...</div>
        </div>
      </div>
    )
  }

  // 진단 미완료
  if (!conceptData || conceptData.status === 'in_progress') {
    const answered = conceptData ? Object.keys(conceptData.answers || {}).length : 0
    const progress = Math.round((answered / 200) * 100)

    return (
      <div className="py-8">
        <div className="bg-white border border-line rounded-2xl p-8 text-center max-w-[480px] mx-auto">
          <div className="text-4xl mb-4">📝</div>
          <div className="text-[16px] font-bold text-ink mb-2">
            {conceptData ? '진단 진행 중' : '아직 진단을 시작하지 않았어요'}
          </div>
          <div className="text-[13px] text-ink-secondary mb-5">
            {conceptData
              ? `${student.name} 학생이 현재 200문항 진단을 진행 중이에요.`
              : `${student.name} 학생이 아직 진로 컨셉 진단을 시작하지 않았어요.`}
          </div>
          {conceptData && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-[12px] font-semibold mb-1.5">
                <span className="text-ink-muted">진행률</span>
                <span className="text-brand-high">{progress}% ({answered}/200)</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-high rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          <div className="text-[12px] text-ink-muted">학생이 진단을 완료하면 이 화면에서 결과를 확인할 수 있어요.</div>
        </div>
      </div>
    )
  }

  const typeCode = conceptData.type_code ?? ''
  const typeName = conceptData.type_name ?? TYPE_NAMES[typeCode] ?? typeCode
  const typeDesc = TYPE_DESC[typeCode] ?? ''
  const recommendedMajors = TYPE_MAJORS[typeCode] ?? []
  const scores = conceptData.scores ?? {}
  const topScores = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const maxScore = topScores[0]?.[1] ?? 1

  return (
    <div className="py-6 max-w-[900px]">

      {/* 상태 배지 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-[18px] font-extrabold text-ink">진로 컨셉 진단 결과</span>
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
            conceptData.status === 'approved'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            {conceptData.status === 'approved' ? '✓ 승인 완료' : '⏳ 승인 대기'}
          </span>
        </div>
        <div className="text-[12px] text-ink-muted">
          진단 완료: {conceptData.updated_at?.slice(0, 10)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">

        {/* 유형 결과 */}
        <div className="bg-gradient-to-br from-brand-high-pale to-blue-50 border-2 border-brand-high-light rounded-2xl p-6">
          <div className="text-[11px] font-bold text-brand-high-dark uppercase tracking-wider mb-4">진단 유형</div>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">{typeName.split(' ')[0]}</div>
            <div>
              <div className="text-[20px] font-extrabold text-brand-high-dark">{typeName}</div>
              <div className="text-[12px] text-ink-secondary">유형 코드: {typeCode}</div>
            </div>
          </div>
          <div className="text-[13px] text-ink-secondary leading-relaxed mb-4">{typeDesc}</div>
          <div>
            <div className="text-[11px] font-bold text-ink-muted mb-2">추천 학과</div>
            <div className="flex flex-wrap gap-1.5">
              {recommendedMajors.slice(0, 6).map(m => (
                <span key={m} className="text-[11px] font-semibold px-2.5 py-0.5 bg-white text-brand-high-dark rounded-full border border-brand-high-light">{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* 점수 차트 */}
        <div className="bg-white border border-line rounded-2xl p-6">
          <div className="text-[13px] font-bold text-ink mb-4">📊 유형별 점수</div>
          <div className="flex flex-col gap-2">
            {topScores.map(([type, score], idx) => {
              const pct = Math.round((score / maxScore) * 100)
              return (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${idx === 0 ? 'bg-brand-high text-white' : 'bg-gray-100 text-ink-muted'}`}>
                    {idx + 1}
                  </div>
                  <div className="w-24 text-[11px] font-semibold text-ink truncate flex-shrink-0">
                    {TYPE_NAMES[type] || type}
                  </div>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${idx === 0 ? 'bg-brand-high' : 'bg-gray-300'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[11px] text-ink-muted w-8 text-right flex-shrink-0">{score}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 학생이 선택한 학과/목표 (approved된 경우) */}
      {conceptData.status === 'approved' && conceptData.major && (
        <div className="bg-white border border-line rounded-2xl p-6 mb-5">
          <div className="text-[13px] font-bold text-ink mb-4">🎯 학생이 선택한 진로 컨셉</div>
          <div className="flex flex-col gap-3">
            {[
              { label: '선택 학과', value: conceptData.major },
              { label: '세부 목표', value: (conceptData.career || conceptData.custom_goal) ?? '-', highlight: true },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-ink-muted w-16 flex-shrink-0">{item.label}</span>
                <span className={`text-[13px] font-bold ${item.highlight ? 'text-brand-high-dark' : 'text-ink'}`}>{item.value}</span>
              </div>
            ))}
            {(conceptData.keywords?.length ?? 0) > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-semibold text-ink-muted w-16 flex-shrink-0 mt-1">키워드</span>
                <div className="flex flex-wrap gap-1.5">
                  {conceptData.keywords?.map(kw => (
                    <span key={kw} className="text-[11px] font-semibold px-2.5 py-0.5 bg-brand-high-pale text-brand-high-dark rounded-full border border-brand-high-light">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 승인 / 취소 버튼 */}
      <div className="bg-white border border-line rounded-2xl p-6">
        {conceptData.status === 'completed' ? (
          <div>
            <div className="text-[14px] font-bold text-ink mb-2">학생 상담 후 결과를 승인해주세요</div>
            <div className="text-[12px] text-ink-secondary mb-5 leading-relaxed">
              승인하면 학생이 학과 선택 및 세부 목표 설정 단계로 넘어갈 수 있어요.<br />
              학생과 충분히 상담한 후 승인해주세요.
            </div>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full py-3.5 bg-gradient-to-r from-brand-high-dark to-brand-high text-white rounded-xl text-[14px] font-bold hover:opacity-90 transition-all shadow-[0_4px_12px_rgba(37,99,235,0.25)] disabled:opacity-50"
            >
              {approving ? '승인 중...' : '✓ 진단 결과 승인하기'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-bold text-green-700">✓ 승인 완료</div>
              <div className="text-[12px] text-ink-muted mt-0.5">
                승인일: {conceptData.approved_at?.slice(0, 10)}
              </div>
            </div>
            <button
              onClick={handleRevoke}
              disabled={approving}
              className="px-4 py-2 border border-line rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              승인 취소
            </button>
          </div>
        )}
      </div>
    </div>
  )
}