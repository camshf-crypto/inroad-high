// src/pages/high-student/_pages/concept/ConceptResult.tsx

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { studentState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'
import { DEPARTMENTS } from './departments'
import { TYPE_NAMES, TYPE_DESC, TYPE_MAJORS } from './questions'
import type { ConceptData } from './CareerConcept'

interface Props {
  conceptData: ConceptData
  onRefresh: () => void | Promise<void>
  prevConcept?: ConceptData | null
  isDirectMode?: boolean
  studentId?: string
  academyId?: string
}

const KEYWORD_SUGGESTIONS = [
  '의료 봉사', '해외 취업', '연구 중심', '임상 중심', '창업',
  '공공기관', '대기업', '스타트업', '사회적 기업', '교육',
  '국제협력', '환경', '복지', 'AI 접목', '데이터 분석',
]

export default function ConceptResult({ conceptData, onRefresh, prevConcept, isDirectMode = false, studentId, academyId }: Props) {
  const navigate = useNavigate()
  const student = useAtomValue(studentState)
  const [step, setStep] = useState<'result' | 'major' | 'career' | 'keyword' | 'done'>(
    conceptData.major ? 'done' : isDirectMode ? 'major' : 'result'
  )
  const [selectedMajor, setSelectedMajor] = useState(conceptData.major ?? '')
  const [selectedCareer, setSelectedCareer] = useState(conceptData.career ?? '')
  const [customGoal, setCustomGoal] = useState(conceptData.custom_goal ?? '')
  const [keywords, setKeywords] = useState<string[]>(conceptData.keywords ?? [])
  const [saving, setSaving] = useState(false)

  const typeCode = conceptData.type_code ?? 'A'
  const typeName = conceptData.type_name ?? TYPE_NAMES[typeCode]
  const typeDesc = TYPE_DESC[typeCode] ?? ''
  const recommendedMajors = TYPE_MAJORS[typeCode] ?? []

  // 선택한 학과의 직업군 찾기
  const selMajorData = DEPARTMENTS.flatMap(d => d.majors).find(m => m.name === selectedMajor)

  const toggleKeyword = (kw: string) => {
    setKeywords(prev =>
      prev.includes(kw) ? prev.filter(k => k !== kw) : prev.length < 5 ? [...prev, kw] : prev
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isDirectMode) {
        // 직접 선택 모드: approved 상태로 바로 저장
        await supabase.from('student_concept').insert({
          student_id: studentId,
          academy_id: academyId,
          grade: conceptData.grade,
          status: 'approved',
          major: selectedMajor,
          career: selectedCareer || null,
          custom_goal: customGoal || null,
          keywords,
          approved_at: new Date().toISOString(),
          approved_by: 'self',
          answers: {},
          current_question: 0,
        })
      } else {
        await supabase
          .from('student_concept')
          .update({
            major: selectedMajor,
            career: selectedCareer || null,
            custom_goal: customGoal || null,
            keywords,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conceptData.id)
          .eq('grade', conceptData.grade)
      }
      setStep('done')
      onRefresh()
    } catch (e) {
      console.error(e)
      alert('저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  // ── 완료 화면 (가운데 정렬, 카드 높이 통일) ──
  if (step === 'done') {
    const hasKeywords = (conceptData.keywords?.length ?? 0) > 0
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center px-6 py-5 bg-[#F8FAFC]">
        <div className="max-w-[560px] w-full">
          {/* 헤더 - 아이콘 작게 */}
          <div className="text-center mb-4">
            <div className="w-10 h-10 mx-auto bg-gradient-to-br from-brand-high-dark to-brand-high rounded-lg flex items-center justify-center text-xl mb-2 shadow-[0_4px_12px_rgba(37,99,235,0.2)]">🎯</div>
            <div className="text-[17px] font-extrabold text-ink tracking-tight mb-0.5">진로 컨셉 완성!</div>
            <div className="text-[12px] text-ink-secondary">
              <span className="font-bold text-brand-high-dark">{conceptData.major} → {conceptData.career || conceptData.custom_goal}</span>
              <span className="mx-1">·</span>이 컨셉을 기반으로 독서리스트와 탐구주제를 추천해드릴게요.
            </div>
          </div>

          {/* 내 진로 컨셉 카드 - 항상 같은 높이 (키워드 줄 항상 표시) */}
          <div className="bg-white border border-brand-high-light rounded-xl p-4 mb-3 text-left shadow-sm">
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">내 진로 컨셉</div>
            <div className="flex flex-col gap-2">
              {[
                { label: '유형', value: typeName },
                { label: '학과', value: conceptData.major ?? '' },
                { label: '목표', value: (conceptData.career || conceptData.custom_goal) ?? '', highlight: true },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-ink-muted w-10 flex-shrink-0">{item.label}</span>
                  <span className={`text-[12.5px] font-bold ${item.highlight ? 'text-brand-high-dark' : 'text-ink'}`}>{item.value}</span>
                </div>
              ))}
              {/* 키워드 줄 - 항상 표시 (없으면 placeholder) */}
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-semibold text-ink-muted w-10 flex-shrink-0 mt-1">키워드</span>
                {hasKeywords ? (
                  <div className="flex flex-wrap gap-1.5">
                    {conceptData.keywords?.map(kw => (
                      <span key={kw} className="text-[10.5px] font-semibold px-2 py-0.5 bg-brand-high-pale text-brand-high-dark rounded-full border border-brand-high-light">{kw}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-ink-muted italic mt-0.5">키워드가 설정되지 않았어요</span>
                )}
              </div>
            </div>
          </div>

          {/* 액션 버튼 - 네비게이션 연결 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => navigate('/high-student/book')}
              className="py-2.5 bg-brand-high text-white rounded-lg text-[12.5px] font-bold hover:bg-brand-high-dark transition-all"
            >
              📚 독서리스트 보기
            </button>
            <button
              onClick={() => navigate('/high-student/topic')}
              className="py-2.5 bg-white text-brand-high-dark border border-brand-high-light rounded-lg text-[12.5px] font-bold hover:bg-brand-high-pale transition-all"
            >
              🔬 탐구주제 보기
            </button>
          </div>
          <div className="text-center">
            <button onClick={() => setStep('result')} className="text-[11px] text-ink-muted hover:text-ink transition-colors underline underline-offset-2">진로 컨셉 다시 설정하기</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC]">
      <div className="max-w-[640px] mx-auto px-6 py-5">

        {/* 헤더 - 컴팩트 */}
        <div className="mb-4">
          <div className="text-[10px] font-bold text-brand-high-dark uppercase tracking-wider mb-1">진로 컨셉 설정</div>
          <div className="text-[17px] font-extrabold text-ink tracking-tight mb-0.5">진단 결과를 확인하고 목표를 설정해요</div>
          <div className="text-[12px] text-ink-secondary">{student?.name}님의 계열 검사 결과가 나왔어요!</div>
        </div>

        {/* 스텝 - 컴팩트 */}
        <div className="flex items-center gap-1.5 mb-4">
          {[
            { key: 'result', label: '결과 확인' },
            { key: 'major', label: '학과 선택' },
            { key: 'career', label: '세부 목표' },
            { key: 'keyword', label: '키워드' },
          ].map((s, i) => {
            const steps = ['result', 'major', 'career', 'keyword']
            const curIdx = steps.indexOf(step)
            const sIdx = steps.indexOf(s.key)
            return (
              <div key={s.key} className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  step === s.key ? 'bg-brand-high text-white' : sIdx < curIdx ? 'bg-brand-high-pale text-brand-high-dark border border-brand-high-light' : 'bg-white text-ink-muted border border-line'
                }`}>
                  {sIdx < curIdx ? '✓' : i + 1} {s.label}
                </div>
                {i < 3 && <div className={`w-5 h-px ${sIdx < curIdx ? 'bg-brand-high-light' : 'bg-line'}`} />}
              </div>
            )
          })}
        </div>

        {/* Step: 결과 확인 - 컴팩트 */}
        {step === 'result' && (
          <div>
            <div className="bg-gradient-to-br from-brand-high-pale to-blue-50 border border-brand-high-light rounded-xl p-4 mb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl">{typeName.split(' ')[0]}</div>
                <div>
                  <div className="text-[17px] font-extrabold text-brand-high-dark">{typeName}</div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">유형 코드: {typeCode}</div>
                </div>
              </div>
              <div className="text-[12px] text-ink-secondary leading-relaxed mb-3">{typeDesc}</div>
              <div>
                <div className="text-[11px] font-bold text-ink-muted mb-1.5">추천 학과</div>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedMajors.map(major => (
                    <span key={major} className="text-[11px] font-semibold px-2.5 py-0.5 bg-white text-brand-high-dark rounded-full border border-brand-high-light">{major}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* 점수 차트 - 컴팩트 */}
            {conceptData.scores && (
              <div className="bg-white border border-line rounded-xl p-4 mb-3">
                <div className="text-[12px] font-bold text-ink mb-2.5">📊 유형별 점수</div>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(conceptData.scores).sort((a, b) => b[1] - a[1]).map(([type, score], idx) => {
                    const maxScore = Math.max(...Object.values(conceptData.scores!))
                    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${idx === 0 ? 'bg-brand-high text-white' : 'bg-gray-100 text-ink-muted'}`}>{idx + 1}</div>
                        <div className="w-24 text-[11px] font-semibold text-ink truncate flex-shrink-0">{TYPE_NAMES[type] || type}</div>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${idx === 0 ? 'bg-brand-high' : 'bg-gray-300'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[10px] text-ink-muted w-8 text-right flex-shrink-0">{score}점</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <button onClick={() => setStep('major')} className="w-full py-3 bg-gradient-to-r from-brand-high-dark to-brand-high text-white rounded-lg text-[13px] font-bold hover:opacity-90 transition-all shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
              학과 선택하러 가기 →
            </button>
          </div>
        )}

        {/* Step: 학과 선택 - 컴팩트 */}
        {step === 'major' && (
          <div>
            <button onClick={() => setStep('result')} className="text-[11px] text-ink-muted hover:text-ink transition-colors mb-3 flex items-center gap-1">← 결과 다시 보기</button>

            {/* 이전 학년 컨셉 참고 */}
            {prevConcept?.status === 'approved' && prevConcept?.major && (
              <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-[11px] font-bold text-amber-800 mb-1.5">📌 이전 학년 컨셉 참고</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-ink">{prevConcept.major}</span>
                  <span className="text-ink-muted text-[10px]">›</span>
                  <span className="text-[11px] font-bold text-amber-700">{prevConcept.career || prevConcept.custom_goal}</span>
                </div>
                <div className="text-[10px] text-amber-700 mb-1.5 font-medium">비슷한 계열 학과를 추천해드려요</div>
                <div className="flex flex-wrap gap-1">
                  {recommendedMajors
                    .filter(m => m !== prevConcept.major)
                    .slice(0, 4)
                    .map(m => (
                      <button key={m} onClick={() => setSelectedMajor(m)}
                        className={`text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${
                          selectedMajor === m
                            ? 'bg-brand-high text-white border-brand-high'
                            : 'bg-white text-amber-700 border-amber-300 hover:border-amber-500'
                        }`}>
                        {m}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* 추천 학과 */}
            <div className="mb-4">
              <div className="text-[12px] font-bold text-ink mb-0.5">⭐ 내 유형에 추천되는 학과</div>
              <div className="text-[11px] text-ink-muted mb-2">{typeName} 유형에 잘 맞는 학과예요</div>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {recommendedMajors.map(major => (
                  <button key={major} onClick={() => setSelectedMajor(major)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-[12px] font-medium transition-all hover:-translate-y-px ${
                      selectedMajor === major ? 'border-brand-high bg-brand-high text-white' : 'border-brand-high-light bg-brand-high-pale text-brand-high-dark hover:shadow-sm'
                    }`}>
                    <span className={`w-1 h-1 rounded-full flex-shrink-0 ${selectedMajor === major ? 'bg-white' : 'bg-brand-high'}`} />
                    {major}
                  </button>
                ))}
              </div>
            </div>

            {/* 전체 학과 */}
            <div className="mb-4">
              <div className="text-[12px] font-bold text-ink mb-0.5">📚 전체 학과에서 선택</div>
              <div className="text-[11px] text-ink-muted mb-2">추천 외 다른 학과를 선택할 수도 있어요</div>
              <div className="flex flex-col gap-2">
                {DEPARTMENTS.map(dept => (
                  <div key={dept.field} className="bg-white border border-line rounded-lg overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b border-line">
                      <span className="text-sm">{dept.icon}</span>
                      <span className="text-[12px] font-bold text-ink">{dept.field}</span>
                    </div>
                    <div className="p-2 grid grid-cols-3 gap-1">
                      {dept.majors.map(major => (
                        <button key={major.name} onClick={() => setSelectedMajor(major.name)}
                          className={`px-2 py-1.5 rounded-md text-[11px] font-medium text-left transition-all ${
                            selectedMajor === major.name ? 'bg-brand-high text-white' : 'bg-gray-50 text-ink hover:bg-brand-high-pale hover:text-brand-high-dark'
                          }`}>
                          {major.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setStep('career')} disabled={!selectedMajor}
              className="w-full py-3 bg-brand-high text-white rounded-lg text-[13px] font-bold hover:bg-brand-high-dark transition-all shadow-[0_4px_12px_rgba(37,99,235,0.25)] disabled:opacity-40 disabled:cursor-not-allowed">
              다음 단계로 → ({selectedMajor || '학과를 선택해주세요'})
            </button>
          </div>
        )}

        {/* Step: 세부 목표 - 컴팩트 */}
        {step === 'career' && selMajorData && (
          <div>
            <button onClick={() => setStep('major')} className="text-[11px] text-ink-muted hover:text-ink transition-colors mb-3 flex items-center gap-1">← 학과 다시 선택</button>
            <div className="text-[13px] font-bold text-ink mb-3">
              <span className="text-brand-high-dark">{selectedMajor}</span>에서 구체적으로 어떤 목표를 갖고 있나요?
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {selMajorData.careers.map(career => (
                <button key={career} onClick={() => setSelectedCareer(career)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-[12px] font-medium transition-all hover:-translate-y-px ${
                    selectedCareer === career ? 'border-brand-high bg-brand-high text-white' : 'border-line bg-white text-ink hover:border-brand-high-light'
                  }`}>
                  <span className={`w-1 h-1 rounded-full flex-shrink-0 ${selectedCareer === career ? 'bg-white' : 'bg-brand-high'}`} />
                  {career}
                </button>
              ))}
            </div>
            <div className="bg-white border border-dashed border-line rounded-lg p-3 mb-3">
              <div className="text-[11px] font-bold text-ink-muted mb-1.5">✏️ 목록에 없으면 직접 입력해요</div>
              <input type="text" value={customGoal} onChange={e => { setCustomGoal(e.target.value); setSelectedCareer('') }}
                placeholder="예: 소아 전문 응급의학과 의사, 해외 파견 간호사..."
                className="w-full px-2.5 py-2 border border-line rounded-md text-[12px] focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 placeholder:text-ink-muted" />
            </div>
            <button onClick={() => setStep('keyword')} disabled={!selectedCareer && !customGoal.trim()}
              className="w-full py-3 bg-brand-high text-white rounded-lg text-[13px] font-bold hover:bg-brand-high-dark transition-all shadow-[0_4px_12px_rgba(37,99,235,0.25)] disabled:opacity-40 disabled:cursor-not-allowed">
              다음 단계로 →
            </button>
          </div>
        )}

        {/* Step: 키워드 - 컴팩트 */}
        {step === 'keyword' && (
          <div>
            <button onClick={() => setStep('career')} className="text-[11px] text-ink-muted hover:text-ink transition-colors mb-3 flex items-center gap-1">← 목표 다시 선택</button>
            <div className="bg-gradient-to-br from-brand-high-pale to-blue-50 border border-brand-high-light rounded-xl p-3 mb-4">
              <div className="text-[10px] font-bold text-brand-high-dark uppercase tracking-wider mb-2">내 진로 컨셉</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 bg-white text-ink-secondary text-[11px] font-semibold rounded-full border border-line">{typeName}</span>
                <span className="text-ink-muted text-[10px]">›</span>
                <span className="px-2.5 py-0.5 bg-white text-ink-secondary text-[11px] font-semibold rounded-full border border-line">{selectedMajor}</span>
                <span className="text-ink-muted text-[10px]">›</span>
                <span className="px-2.5 py-0.5 bg-brand-high text-white text-[11px] font-bold rounded-full">{selectedCareer || customGoal}</span>
              </div>
            </div>
            <div className="text-[13px] font-bold text-ink mb-1">관심 키워드를 골라주세요 (최대 5개)</div>
            <div className="text-[11px] text-ink-muted mb-3">독서리스트·탐구주제 추천에 활용돼요</div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {KEYWORD_SUGGESTIONS.map(kw => (
                <button key={kw} onClick={() => toggleKeyword(kw)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                    keywords.includes(kw) ? 'bg-brand-high text-white border-brand-high' : 'bg-white text-ink-secondary border-line hover:border-brand-high-light'
                  } ${keywords.length >= 5 && !keywords.includes(kw) ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  {kw}
                </button>
              ))}
            </div>
            {keywords.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3 p-2.5 bg-brand-high-pale rounded-lg border border-brand-high-light flex-wrap">
                <span className="text-[11px] text-brand-high-dark font-semibold">선택됨:</span>
                {keywords.map(kw => <span key={kw} className="text-[10.5px] font-bold px-2 py-0.5 bg-brand-high text-white rounded-full">{kw}</span>)}
              </div>
            )}
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-brand-high-dark to-brand-high text-white rounded-lg text-[13px] font-bold hover:opacity-90 transition-all shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
              {saving ? '저장 중...' : '🎯 진로 컨셉 저장하기'}
            </button>
            <button onClick={handleSave} disabled={saving} className="w-full mt-1.5 py-2 text-[11px] text-ink-muted hover:text-ink transition-colors">
              키워드 없이 저장하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}