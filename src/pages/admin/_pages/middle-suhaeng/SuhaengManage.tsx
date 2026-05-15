// src/pages/admin/_pages/middle-suhaeng/SuhaengManage.tsx

import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { academyState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'
import {
  useAcademySuhaengQuestions,
  useCreateSuhaengQuestion,
  useUpdateSuhaengQuestion,
  useDeleteSuhaengQuestion,
  useAcademyStudents,
  useQuestionAssignments,
  useSyncQuestionAssignments,
  type SuhaengQuestion,
  type SuhaengLevel,
  type SuhaengType,
  type SuhaengGrade,
  type AcademyStudent,
} from '@/pages/admin/_hooks/middle/useAcademySuhaeng'

const MIDDLE_SUBJECTS = ['국어', '수학', '영어', '과학', '사회', '역사', '도덕', '기술가정', '체육', '음악', '미술', '진로', '기타']
const HIGH_SUBJECTS = ['국어', '수학', '영어', '한국사', '물리학', '화학', '생명과학', '지구과학', '사회', '경제', '정치와법', '생활과윤리', '체육', '음악', '미술', '진로', '기타']
const MIDDLE_GRADES: SuhaengGrade[] = ['중1', '중2', '중3']
const HIGH_GRADES: SuhaengGrade[] = ['고1', '고2', '고3']
const TYPE_LIST: SuhaengType[] = ['논술형', '서술형', '주제탐구', '구술발표', '탐구수행']

const TYPE_INFO: Record<SuhaengType, { icon: string; desc: string; hasChars: boolean; hasMedia: string | null }> = {
  논술형:   { icon: '', desc: '근거를 갖춘 긴 글쓰기',        hasChars: true,  hasMedia: null },
  서술형:   { icon: '', desc: '핵심 개념 요약 답안',           hasChars: true,  hasMedia: null },
  주제탐구: { icon: '', desc: '자료 조사·분석·보고서',         hasChars: false, hasMedia: null },
  구술발표: { icon: '', desc: '발표 원고 + 음성/영상 첨부',    hasChars: false, hasMedia: '음성/영상' },
  탐구수행: { icon: '', desc: '실험·관찰·분석 + 사진 첨부',   hasChars: false, hasMedia: '사진' },
}

const DEFAULT_EVAL_CRITERIA: Record<SuhaengType, { name: string; score: number }[]> = {
  논술형:   [{ name: '주장의 명확성', score: 30 }, { name: '근거의 타당성', score: 40 }, { name: '문장력', score: 30 }],
  서술형:   [{ name: '핵심 개념 이해', score: 40 }, { name: '정확성', score: 40 }, { name: '간결성', score: 20 }],
  주제탐구: [{ name: '자료 조사', score: 30 }, { name: '분석력', score: 40 }, { name: '결론 도출', score: 30 }],
  구술발표: [{ name: '내용의 충실성', score: 40 }, { name: '전달력', score: 40 }, { name: '시간 준수', score: 20 }],
  탐구수행: [{ name: '실험 설계', score: 30 }, { name: '결과 분석', score: 40 }, { name: '결론 도출', score: 30 }],
}

const GRADE_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  전체: { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD' },
  중1:  { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
  중2:  { bg: '#ECFDF5', color: '#065F46', border: '#6EE7B7' },
  중3:  { bg: '#FDF4FF', color: '#7E22CE', border: '#D8B4FE' },
  고1:  { bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74' },
  고2:  { bg: '#F0FDF4', color: '#14532D', border: '#86EFAC' },
  고3:  { bg: '#EFF6FF', color: '#1E40AF', border: '#93C5FD' },
}

const MIDDLE_THEME = { accent: '#059669', accentDark: '#065F46', accentBg: '#ECFDF5', accentBorder: '#6EE7B7', accentShadow: 'rgba(16,185,129,0.15)' }
const HIGH_THEME   = { accent: '#2563EB', accentDark: '#1E3A8A', accentBg: '#EFF6FF', accentBorder: '#93C5FD', accentShadow: 'rgba(37,99,235,0.15)' }

interface EvalItem { name: string; score: number }

function EvalCriteriaEditor({ items, onChange, theme }: {
  items: EvalItem[]
  onChange: (items: EvalItem[]) => void
  theme: typeof MIDDLE_THEME
}) {
  const total = items.reduce((sum, i) => sum + Number(i.score), 0)
  const isValid = total === 100

  const updateItem = (idx: number, field: 'name' | 'score', value: string) => {
    const next = items.map((item, i) =>
      i === idx ? { ...item, [field]: field === 'score' ? Number(value) : value } : item
    )
    onChange(next)
  }

  const addItem = () => {
    if (items.length >= 6) return
    onChange([...items, { name: '', score: 0 }])
  }

  const removeItem = (idx: number) => {
    if (items.length <= 1) return
    onChange(items.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[12px] font-bold text-ink">평가 요소 <span className="text-red-500">*</span></label>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          합계 {total}점 {isValid ? '✓' : '(100점이 되어야 해요)'}
        </span>
      </div>
      <div className="flex flex-col gap-2 mb-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: theme.accentBg, color: theme.accentDark }}>
              {idx + 1}
            </div>
            <input type="text" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
              placeholder="평가 항목명 (예: 주장의 명확성)"
              className="flex-1 px-3 py-1.5 border border-line rounded-lg text-[12px] focus:outline-none" />
            <div className="flex items-center gap-1 flex-shrink-0">
              <input type="number" value={item.score} onChange={e => updateItem(idx, 'score', e.target.value)}
                min={0} max={100}
                className="w-16 px-2 py-1.5 border border-line rounded-lg text-[12px] text-center focus:outline-none" />
              <span className="text-[11px] text-ink-muted">점</span>
            </div>
            {items.length > 1 && (
              <button onClick={() => removeItem(idx)}
                className="w-6 h-6 rounded-full bg-red-50 text-red-400 hover:bg-red-100 text-[12px] flex items-center justify-center flex-shrink-0">
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {items.length < 6 && (
        <button onClick={addItem}
          className="w-full py-1.5 rounded-lg text-[11px] font-bold border border-dashed transition-all"
          style={{ borderColor: theme.accentBorder, color: theme.accentDark, background: theme.accentBg }}>
          + 평가 항목 추가
        </button>
      )}
    </div>
  )
}

function QuestionFormModal({ level, initial, onClose, onSave, saving }: {
  level: SuhaengLevel
  initial?: SuhaengQuestion | null
  onClose: () => void
  onSave: (data: any) => void
  saving: boolean
}) {
  const theme = level === 'middle' ? MIDDLE_THEME : HIGH_THEME
  const subjects = level === 'middle' ? MIDDLE_SUBJECTS : HIGH_SUBJECTS
  const grades = level === 'middle' ? MIDDLE_GRADES : HIGH_GRADES

  const [mode, setMode] = useState<'direct' | 'ai'>('direct')
  const [type, setType] = useState<SuhaengType>(initial?.type || '논술형')
  const [grade, setGrade] = useState<SuhaengGrade>(initial?.grade || (level === 'middle' ? '중1' : '고1'))
  const [subject, setSubject] = useState(initial?.subject || '')
  const [title, setTitle] = useState(initial?.title || '')
  const [content, setContent] = useState(initial?.content || '')
  const [minChars, setMinChars] = useState(initial?.min_chars?.toString() || '')
  const [maxChars, setMaxChars] = useState(initial?.max_chars?.toString() || '')
  const [evalCriteria, setEvalCriteria] = useState<EvalItem[]>(
    (initial as any)?.eval_criteria?.length > 0
      ? (initial as any).eval_criteria
      : DEFAULT_EVAL_CRITERIA['논술형']
  )
  const [aiLoading, setAiLoading] = useState(false)

  const info = TYPE_INFO[type]
  const isEdit = !!initial

  const handleTypeChange = (t: SuhaengType) => {
    setType(t)
    if (!isEdit) setEvalCriteria(DEFAULT_EVAL_CRITERIA[t])
  }

  const evalTotal = evalCriteria.reduce((sum, i) => sum + Number(i.score), 0)

  const handleAiGenerate = async () => {
    if (!subject) { alert('과목을 먼저 선택해주세요.'); return }
    setAiLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('middle-suhaeng-question', {
        body: { level, subject, type, grade: grade === '전체' ? (level === 'middle' ? '중2' : '고2') : grade },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'AI 생성 실패')
      const q = data.question
      setTitle(q.title || '')
      setContent(q.content || '')
      if (q.min_chars) setMinChars(String(q.min_chars))
      if (q.max_chars) setMaxChars(String(q.max_chars))
      setMode('direct')
    } catch (e: any) {
      alert('AI 생성 실패: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = () => {
    if (!subject) { alert('과목을 선택해주세요.'); return }
    if (!title.trim()) { alert('문제 제목을 입력해주세요.'); return }
    if (!content.trim()) { alert('문제 내용을 입력해주세요.'); return }
    if (info.hasChars && (!minChars || !maxChars)) { alert('글자수 제한을 입력해주세요.'); return }
    if (evalTotal !== 100) { alert(`평가 요소 합계가 ${evalTotal}점이에요. 100점이 되어야 해요.`); return }
    if (evalCriteria.some(e => !e.name.trim())) { alert('평가 항목명을 모두 입력해주세요.'); return }
    onSave({
      level, type, grade, subject, title, content,
      min_chars: info.hasChars ? Number(minChars) : null,
      max_chars: info.hasChars ? Number(maxChars) : null,
      eval_criteria: evalCriteria,
      is_draft: false,
    })
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] w-[660px] max-h-[94vh]"
        onClick={e => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
          <div>
            <div className="text-[16px] font-extrabold text-ink tracking-tight">
              {isEdit ? '문제 수정' : '새 문제 만들기'}
            </div>
            <div className="text-[12px] text-ink-secondary mt-0.5">
              {level === 'middle' ? '중등' : '고등'} 수행평가
            </div>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl">×</button>
        </div>

        {!isEdit && (
          <div className="flex border-b border-line flex-shrink-0">
            <button onClick={() => setMode('direct')}
              className="flex-1 py-3 text-[13px] font-bold transition-all border-b-2 flex items-center justify-center gap-2"
              style={{ color: mode === 'direct' ? theme.accentDark : '#9CA3AF', borderColor: mode === 'direct' ? theme.accent : 'transparent', background: mode === 'direct' ? theme.accentBg : 'transparent' }}>
              직접 입력
            </button>
            <button onClick={() => setMode('ai')}
              className="flex-1 py-3 text-[13px] font-bold transition-all border-b-2 flex items-center justify-center gap-2"
              style={{ color: mode === 'ai' ? theme.accentDark : '#9CA3AF', borderColor: mode === 'ai' ? theme.accent : 'transparent', background: mode === 'ai' ? theme.accentBg : 'transparent' }}>
              AI가 만들어주기
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">

          {mode === 'ai' && !isEdit && (
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 rounded-2xl p-5">
              <div className="mb-4">
                <div className="text-[14px] font-extrabold text-ink">AI 문제 자동 생성</div>
                <div className="text-[11px] text-ink-secondary mt-0.5">과목·유형·학년 선택 후 AI가 수행평가 문제를 만들어드려요</div>
              </div>
              <div className="mb-3">
                <label className="block text-[11px] font-bold text-ink mb-1.5">과목</label>
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map(s => (
                    <button key={s} onClick={() => setSubject(s)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border"
                      style={{ background: subject === s ? theme.accent : '#fff', color: subject === s ? '#fff' : '#6B7280', borderColor: subject === s ? theme.accent : '#E5E7EB' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-[11px] font-bold text-ink mb-1.5">유형</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {TYPE_LIST.map(t => (
                    <button key={t} onClick={() => handleTypeChange(t)}
                      className="py-2 rounded-xl text-center transition-all border"
                      style={{ background: type === t ? theme.accent : '#fff', color: type === t ? '#fff' : '#374151', borderColor: type === t ? theme.accent : '#E5E7EB' }}>
                      <span className="text-[11px] font-bold">{t}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-ink mb-1.5">학년</label>
                <div className="flex gap-1.5">
                  {grades.map(g => {
                    const gc = GRADE_COLOR[g] || GRADE_COLOR['전체']
                    return (
                      <button key={g} onClick={() => setGrade(g)}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all border"
                        style={{ background: grade === g ? gc.bg : '#fff', color: grade === g ? gc.color : '#9CA3AF', borderColor: grade === g ? gc.border : '#E5E7EB' }}>
                        {g}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button onClick={handleAiGenerate} disabled={aiLoading || !subject}
                className="w-full py-3 text-white rounded-xl text-[13px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: aiLoading ? '#A7F3D0' : theme.accent, boxShadow: !aiLoading ? `0 4px 12px ${theme.accentShadow}` : 'none' }}>
                {aiLoading ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />AI가 문제를 만드는 중...</>) : 'AI로 문제 생성하기'}
              </button>
              {!subject && <div className="text-[11px] text-amber-600 text-center mt-2">과목을 먼저 선택해주세요</div>}
            </div>
          )}

          {mode === 'ai' && !isEdit && title && (
            <div className="border border-emerald-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
                <div className="text-[12px] font-bold text-emerald-800">AI 생성 결과</div>
                <button onClick={() => setMode('direct')} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800">수정하기</button>
              </div>
              <div className="p-4">
                <div className="text-[13px] font-bold text-ink mb-2">{title}</div>
                <div className="text-[12px] text-ink-secondary leading-[1.7]">{content}</div>
                {minChars && <div className="text-[11px] text-ink-muted mt-2">{minChars}~{maxChars}자</div>}
              </div>
            </div>
          )}

          {(mode === 'direct' || isEdit) && (
            <>
              {title && !isEdit && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  <div className="text-[12px] text-emerald-700 font-medium">AI가 문제를 만들었어요! 검토 후 저장해주세요.</div>
                </div>
              )}

              <div>
                <label className="block text-[12px] font-bold text-ink mb-2">수행평가 유형 <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-5 gap-2">
                  {TYPE_LIST.map(t => {
                    const isSelected = type === t
                    const ti = TYPE_INFO[t]
                    return (
                      <button key={t} onClick={() => handleTypeChange(t)}
                        className="rounded-xl px-2 py-3 text-center transition-all border flex flex-col items-center gap-1"
                        style={{ background: isSelected ? theme.accent : '#fff', color: isSelected ? '#fff' : '#374151', borderColor: isSelected ? theme.accent : '#E5E7EB', boxShadow: isSelected ? `0 4px 12px ${theme.accentShadow}` : 'none' }}>
                        <span className="text-[11px] font-bold">{t}</span>
                        {ti.hasMedia && <span className="text-[9px] opacity-80">{ti.hasMedia}</span>}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-1.5 text-[11px] text-ink-muted bg-gray-50 rounded-lg px-3 py-1.5">
                  <strong>{type}</strong> — {info.desc}
                  {info.hasMedia && ` · 학생이 ${info.hasMedia} 첨부 가능`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-ink mb-2">대상 학년 <span className="text-red-500">*</span></label>
                  <div className="flex gap-1">
                    {grades.map(g => {
                      const isSelected = grade === g
                      const gc = GRADE_COLOR[g] || GRADE_COLOR['전체']
                      return (
                        <button key={g} onClick={() => setGrade(g)}
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all border"
                          style={{ background: isSelected ? gc.bg : '#fff', color: isSelected ? gc.color : '#9CA3AF', borderColor: isSelected ? gc.border : '#E5E7EB' }}>
                          {g}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-ink mb-2">과목 <span className="text-red-500">*</span></label>
                  <select value={subject} onChange={e => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg text-[13px] focus:outline-none">
                    <option value="">과목 선택</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-ink mb-2">문제 제목 <span className="text-red-500">*</span></label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="예: 환경 보호를 위한 나의 실천 방안"
                  className="w-full px-3 py-2 border border-line rounded-lg text-[13px] focus:outline-none" />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-ink mb-2">문제 내용 <span className="text-red-500">*</span></label>
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  placeholder="학생에게 보여줄 문제 내용을 작성하세요." rows={5}
                  className="w-full px-3 py-2.5 border border-line rounded-lg text-[13px] resize-none focus:outline-none leading-[1.7]" />
                <div className="text-[10px] text-ink-muted mt-1 text-right">{content.length}자</div>
              </div>

              {info.hasChars && (
                <div>
                  <label className="block text-[12px] font-bold text-ink mb-2">글자수 제한</label>
                  <div className="flex items-center gap-3">
                    <input type="number" value={minChars} onChange={e => setMinChars(e.target.value)} placeholder="최소" min={0} className="w-28 px-3 py-2 border border-line rounded-lg text-[13px] focus:outline-none" />
                    <span className="text-ink-secondary">~</span>
                    <input type="number" value={maxChars} onChange={e => setMaxChars(e.target.value)} placeholder="최대" min={0} className="w-28 px-3 py-2 border border-line rounded-lg text-[13px] focus:outline-none" />
                    <span className="text-[12px] text-ink-secondary">자</span>
                  </div>
                </div>
              )}

              <EvalCriteriaEditor items={evalCriteria} onChange={setEvalCriteria} theme={theme} />

              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-[12px] text-blue-800 leading-relaxed">
                설정한 평가 요소로 <strong>AI가 항목별 점수를 채점</strong>해요. 학생 답안 제출 후 자동으로 분석돼요.
                {type === '구술발표' && ' 학생이 음성·영상도 함께 제출해요.'}
                {type === '탐구수행' && ' 학생이 실험 사진도 함께 제출해요.'}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line flex-shrink-0 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-colors">취소</button>
          {(mode === 'direct' || isEdit || title) && (
            <>
              <button onClick={() => onSave({
                level, type, grade, subject, title, content,
                min_chars: info.hasChars ? Number(minChars) : null,
                max_chars: info.hasChars ? Number(maxChars) : null,
                eval_criteria: evalCriteria,
                is_draft: true,
              })} disabled={saving || !title.trim()}
                className="px-4 py-2 rounded-lg text-[12px] font-bold transition-all disabled:opacity-60 border"
                style={{ background: '#FFF7ED', color: '#92400E', borderColor: '#FCD34D' }}>
                {saving ? '저장 중...' : '임시저장'}
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:opacity-60"
                style={{ background: theme.accent, boxShadow: `0 2px 8px ${theme.accentShadow}` }}>
                {saving ? '저장 중...' : isEdit ? '수정 완료' : '문제 저장'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AssignModal({ question, level, onClose }: {
  question: SuhaengQuestion
  level: SuhaengLevel
  onClose: () => void
}) {
  const theme = level === 'middle' ? MIDDLE_THEME : HIGH_THEME
  const { data: allStudents = [], isLoading: loadingStudents } = useAcademyStudents(level)
  const { data: assignments = [], isLoading: loadingAssignments } = useQuestionAssignments(question.id)
  const syncAssignments = useSyncQuestionAssignments()

  const assignedIds = (assignments as any[]).map((a: any) => a.student_id)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filterGrade, setFilterGrade] = useState<string>('전체')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!loadingAssignments) {
      setSelectedIds(assignedIds)
    }
  }, [loadingAssignments, assignments.length])

  const grades = level === 'middle' ? ['전체', '중1', '중2', '중3'] : ['전체', '고1', '고2', '고3']

  const filteredStudents = (allStudents as AcademyStudent[]).filter((s: AcademyStudent) => {
    if (filterGrade !== '전체' && s.grade !== filterGrade) return false
    if (search && !s.name.includes(search)) return false
    return true
  })

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleAll = () => {
    if (filteredStudents.every((s: AcademyStudent) => selectedIds.includes(s.id))) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredStudents.map((s: AcademyStudent) => s.id))
    }
  }

  const handleSave = async () => {
    try {
      await syncAssignments.mutateAsync({ question_id: question.id, student_ids: selectedIds })
      alert(`${selectedIds.length}명에게 배정되었어요!`)
      onClose()
    } catch (e: any) {
      alert('배정 실패: ' + e.message)
    }
  }

  const isLoading = loadingStudents || loadingAssignments

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] w-[520px] max-h-[90vh]"
        onClick={e => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-extrabold text-ink">학생 개별 배정</div>
            <div className="text-[11px] text-ink-secondary mt-0.5 line-clamp-1">{question.title}</div>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl">×</button>
        </div>

        <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 text-[11px] text-blue-700">
          학년 전체 공개와 별개로 특정 학생에게 추가 배정할 수 있어요.
        </div>

        <div className="px-5 py-3 border-b border-line flex-shrink-0 flex items-center gap-2">
          <div className="flex gap-1">
            {grades.map(g => {
              const gc = GRADE_COLOR[g] || GRADE_COLOR['전체']
              return (
                <button key={g} onClick={() => setFilterGrade(g)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border"
                  style={{ background: filterGrade === g ? gc.bg : '#fff', color: filterGrade === g ? gc.color : '#9CA3AF', borderColor: filterGrade === g ? gc.border : '#E5E7EB' }}>
                  {g}
                </button>
              )
            })}
          </div>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="이름 검색..."
            className="flex-1 px-3 py-1.5 border border-line rounded-lg text-[12px] focus:outline-none" />
        </div>

        <div className="px-5 py-2.5 border-b border-line flex-shrink-0 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox"
              checked={filteredStudents.length > 0 && filteredStudents.every((s: AcademyStudent) => selectedIds.includes(s.id))}
              onChange={toggleAll} className="w-4 h-4 accent-blue-600" />
            <span className="text-[12px] font-bold text-ink">전체 선택</span>
          </label>
          <span className="text-[11px] text-ink-muted">
            {selectedIds.length}명 선택 / 전체 {(allStudents as AcademyStudent[]).length}명
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {isLoading ? (
            <div className="text-center py-10 text-ink-muted text-[12px]">불러오는 중...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-ink-muted text-[12px]">
              {(allStudents as AcademyStudent[]).length === 0 ? '등록된 학생이 없어요' : '해당 조건의 학생이 없어요'}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredStudents.map((s: AcademyStudent) => {
                const isSelected = selectedIds.includes(s.id)
                const gc = GRADE_COLOR[s.grade] || GRADE_COLOR['전체']
                return (
                  <label key={s.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border"
                    style={{ background: isSelected ? '#EFF6FF' : '#fff', borderColor: isSelected ? '#93C5FD' : '#E5E7EB' }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleStudent(s.id)}
                      className="w-4 h-4 accent-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-ink">{s.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                          style={{ background: gc.bg, color: gc.color, borderColor: gc.border }}>
                          {s.grade}
                        </span>
                      </div>
                      {s.school && <div className="text-[11px] text-ink-muted mt-0.5">{s.school}</div>}
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line flex-shrink-0 flex justify-between items-center">
          <div className="text-[11px] text-ink-muted">학년 전체 공개 설정과 별개로 적용돼요</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-colors">취소</button>
            <button onClick={handleSave} disabled={syncAssignments.isPending}
              className="px-5 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:opacity-60"
              style={{ background: theme.accent, boxShadow: `0 2px 8px ${theme.accentShadow}` }}>
              {syncAssignments.isPending ? '저장 중...' : `${selectedIds.length}명 배정 저장`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionTab({ level }: { level: SuhaengLevel }) {
  const theme = level === 'middle' ? MIDDLE_THEME : HIGH_THEME
  const { data: questions = [], isLoading } = useAcademySuhaengQuestions(level)
  const createQ = useCreateSuhaengQuestion()
  const updateQ = useUpdateSuhaengQuestion()
  const deleteQ = useDeleteSuhaengQuestion()

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<SuhaengQuestion | null>(null)
  const [assignTarget, setAssignTarget] = useState<SuhaengQuestion | null>(null)
  const [filterType, setFilterType] = useState<SuhaengType | '전체'>('전체')
  const [filterGrade, setFilterGrade] = useState<string>('전체')

  // 목록 필터용 학년 (전체 포함)
  const filterGrades = level === 'middle' ? ['전체', '중1', '중2', '중3'] : ['전체', '고1', '고2', '고3']

  const filtered = questions.filter(q => {
    if (filterType !== '전체' && q.type !== filterType) return false
    if (filterGrade !== '전체' && q.grade !== '전체' && q.grade !== filterGrade) return false
    return true
  })

  const handleSave = async (data: any) => {
    try {
      if (editTarget) {
        const { level: _level, ...updateData } = data
        await updateQ.mutateAsync({ id: editTarget.id, ...updateData })
        if (updateData.is_draft) {
          alert('임시저장 되었어요!')
        } else {
          alert('문제가 수정되었어요!')
        }
      } else {
        await createQ.mutateAsync(data)
        if (data.is_draft) {
          alert('임시저장 되었어요!')
        } else {
          alert('문제가 만들어졌어요!')
        }
      }
      setShowForm(false)
      setEditTarget(null)
    } catch (e: any) {
      alert('저장 실패: ' + e.message)
    }
  }

  const handleDelete = async (q: SuhaengQuestion) => {
    const { count } = await supabase
      .from('suhaeng_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('question_key', `academy-${q.id}`)

    if (count && count > 0) {
      alert('학생이 이미 답안을 제출한 문제예요.\n제출된 답안이 있는 문제는 삭제할 수 없어요.')
      return
    }

    if (!window.confirm(`"${q.title}" 문제를 삭제할까요?`)) return

    try {
      await supabase.from('suhaeng_question_assignments').delete().eq('question_id', q.id)
      await deleteQ.mutateAsync(q.id)
    } catch (e: any) {
      alert('삭제 실패: ' + e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2 pl-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {(['전체', ...TYPE_LIST] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border"
                style={{ background: filterType === t ? theme.accent : '#fff', color: filterType === t ? '#fff' : '#6B7280', borderColor: filterType === t ? theme.accent : '#E5E7EB' }}>
                {t}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-line" />
          <div className="flex gap-1">
            {filterGrades.map(g => {
              const gc = GRADE_COLOR[g] || GRADE_COLOR['전체']
              return (
                <button key={g} onClick={() => setFilterGrade(g)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border"
                  style={{ background: filterGrade === g ? gc.bg : '#fff', color: filterGrade === g ? gc.color : '#9CA3AF', borderColor: filterGrade === g ? gc.border : '#E5E7EB' }}>
                  {g}
                </button>
              )
            })}
          </div>
        </div>
        <button onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="px-4 py-2 text-white rounded-xl text-[12px] font-bold transition-all hover:-translate-y-px"
          style={{ background: theme.accent, boxShadow: `0 4px 12px ${theme.accentShadow}` }}>
          새 문제 만들기
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-ink-muted">
          <div className="text-[13px]">불러오는 중...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-line rounded-2xl">
          <div className="text-[14px] font-bold text-ink mb-2">
            {questions.length === 0 ? '아직 만든 문제가 없어요' : '해당 조건의 문제가 없어요'}
          </div>
          {questions.length === 0 && (
            <button onClick={() => { setEditTarget(null); setShowForm(true) }}
              className="px-5 py-2.5 text-white rounded-xl text-[13px] font-bold mt-2"
              style={{ background: theme.accent }}>
              첫 문제 만들기
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="flex px-4 py-2.5 bg-gray-50 border-b border-line text-[11px] font-bold text-ink-muted">
            <div className="w-[22%]">제목</div>
            <div className="w-[10%]">과목</div>
            <div className="w-[10%]">유형</div>
            <div className="w-[8%]">학년</div>
            <div className="w-[30%]">평가 요소</div>
            <div className="w-[20%]"></div>
          </div>
          {filtered.map((q, idx) => {
            const gc = GRADE_COLOR[q.grade] || GRADE_COLOR['전체']
            const evalCriteria = (q as any).eval_criteria || []
            return (
              <div key={q.id}
                className={`flex px-4 py-3 items-center transition-colors hover:bg-gray-50 ${idx !== filtered.length - 1 ? 'border-b border-line' : ''}`}>
                <div className="w-[22%] min-w-0 pr-3">
                  <div className="text-[13px] font-bold text-ink truncate flex items-center gap-1.5">
                    {q.title}
                    {q.is_draft && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0"
                        style={{ background: '#FFF7ED', color: '#92400E', borderColor: '#FCD34D' }}>
                        임시저장
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {new Date(q.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  </div>
                </div>
                <div className="w-[10%] text-[12px] font-semibold text-ink-secondary">{q.subject}</div>
                <div className="w-[10%]">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: theme.accentBg, color: theme.accentDark, border: `1px solid ${theme.accentBorder}60` }}>
                    {q.type}
                  </span>
                </div>
                <div className="w-[8%]">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                    style={{ background: gc.bg, color: gc.color, borderColor: gc.border }}>
                    {q.grade}
                  </span>
                </div>
                <div className="w-[30%] flex items-center gap-1 overflow-hidden">
                  {evalCriteria.length > 0 ? evalCriteria.map((e: any, i: number) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-ink-secondary whitespace-nowrap flex-shrink-0">
                      {e.name} <span className="font-bold">{e.score}점</span>
                    </span>
                  )) : <span className="text-[11px] text-ink-muted">-</span>}
                </div>
                <div className="w-[20%] flex items-center gap-1.5 justify-end flex-shrink-0">
                  <button onClick={() => setAssignTarget(q)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap">
                    학생 배정
                  </button>
                  <button onClick={() => { setEditTarget(q); setShowForm(true) }}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-line text-ink-secondary hover:bg-gray-50 transition-colors whitespace-nowrap">
                    수정
                  </button>
                  <button onClick={() => handleDelete(q)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap">
                    삭제
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <QuestionFormModal
          level={level}
          initial={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onSave={handleSave}
          saving={createQ.isPending || updateQ.isPending}
        />
      )}

      {assignTarget && (
        <AssignModal
          question={assignTarget}
          level={level}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  )
}

export default function SuhaengManage() {
  const academy = useAtomValue(academyState)
  const [activeTab, setActiveTab] = useState<SuhaengLevel>('middle')

  return (
    <div className="p-6 max-w-[1100px] mx-auto font-sans">
      <div className="mb-6">
        <div className="text-[22px] font-extrabold text-ink tracking-tight">수행평가 관리</div>
        <div className="text-[13px] text-ink-secondary mt-1">
          {academy.academyName} · 문제를 만들고 학생들에게 공개해보세요
        </div>
      </div>

      <div className="flex gap-2 mb-6 bg-gray-100 rounded-2xl p-1.5">
        <button onClick={() => setActiveTab('middle')}
          className="flex-1 py-3 rounded-xl text-[14px] font-extrabold transition-all flex items-center justify-center gap-2"
          style={{ background: activeTab === 'middle' ? '#fff' : 'transparent', color: activeTab === 'middle' ? MIDDLE_THEME.accentDark : '#9CA3AF', boxShadow: activeTab === 'middle' ? '0 2px 8px rgba(15,23,42,0.08)' : 'none' }}>
          중등 수행평가
        </button>
        <button onClick={() => setActiveTab('high')}
          className="flex-1 py-3 rounded-xl text-[14px] font-extrabold transition-all flex items-center justify-center gap-2"
          style={{ background: activeTab === 'high' ? '#fff' : 'transparent', color: activeTab === 'high' ? HIGH_THEME.accentDark : '#9CA3AF', boxShadow: activeTab === 'high' ? '0 2px 8px rgba(15,23,42,0.08)' : 'none' }}>
          고등 수행평가
        </button>
      </div>

      <QuestionTab level={activeTab} />
    </div>
  )
}