import { useState, useMemo } from 'react'
import { useMasterMajorQuestions } from '@/pages/master/_hooks/useMasterMajorQuestions'
import type { MajorDepartmentSummary, MajorQuestion } from '@/lib/types/questions'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

interface Props {
  department: MajorDepartmentSummary
  onClose: () => void
}

type FilterType = 'all' | 'choice' | 'text'

export default function MajorDetailModal({ department, onClose }: Props) {
  const { data: questions = [], isLoading } = useMasterMajorQuestions(department.master_code)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1])) // Day 1만 기본 펼침

  // 객관식/주관식 분류
  const filtered = useMemo(() => {
    let list = questions

    if (filterType === 'choice') {
      list = list.filter(q => q.choice_1) // choice_1이 있으면 객관식
    } else if (filterType === 'text') {
      list = list.filter(q => !q.choice_1) // 없으면 주관식
    }

    if (searchQuery) {
      list = list.filter(q =>
        q.question.includes(searchQuery) ||
        (q.explanation?.includes(searchQuery) ?? false)
      )
    }

    return list
  }, [questions, filterType, searchQuery])

  // Day별 그룹핑
  const grouped = useMemo(() => {
    const map = new Map<number, MajorQuestion[]>()
    filtered.forEach(q => {
      if (!map.has(q.day)) map.set(q.day, [])
      map.get(q.day)!.push(q)
    })
    // seq 순으로 정렬
    map.forEach(list => list.sort((a, b) => a.seq - b.seq))
    return new Map([...map.entries()].sort((a, b) => a[0] - b[0]))
  }, [filtered])

  // 통계
  const stats = useMemo(() => {
    const choice = questions.filter(q => q.choice_1).length
    const text = questions.filter(q => !q.choice_1).length
    return { total: questions.length, choice, text }
  }, [questions])

  const toggleDay = (day: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  const expandAll = () => {
    setExpandedDays(new Set(grouped.keys()))
  }

  const collapseAll = () => {
    setExpandedDays(new Set())
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[920px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-line flex items-start justify-between" style={{ background: THEME.gradient }}>
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🎓</span>
              <div className="text-[18px] font-extrabold tracking-tight">{department.department_name}</div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20">
                {department.school_year}학년
              </span>
            </div>
            <div className="flex items-center gap-3 text-[12px] font-medium text-white/90">
              <span>학과코드: <strong className="font-bold">{department.department_code}</strong></span>
              <span>•</span>
              <span>마스터코드: <strong className="font-bold">{department.master_code}</strong></span>
              <span>•</span>
              <span>총 <strong className="font-bold">{department.total_days}</strong>일</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 통계 + 필터 + 검색 */}
        <div className="px-6 py-3 border-b border-line bg-[#F8FAFC] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[12px] font-bold">
            <span className="text-ink">총 <span style={{ color: THEME.accent }}>{stats.total}</span>문항</span>
            <span className="text-ink-muted">|</span>
            <span className="text-blue-600">객관식 {stats.choice}</span>
            <span className="text-ink-muted">|</span>
            <span className="text-emerald-600">주관식 {stats.text}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* 검색 */}
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="질문 검색..."
              className="w-[180px] px-3 py-1.5 border border-line rounded-full text-[12px] font-medium focus:outline-none focus:border-purple-400"
            />

            {/* 유형 필터 */}
            <div className="flex gap-1">
              {[
                { value: 'all', label: '전체' },
                { value: 'choice', label: '객관식' },
                { value: 'text', label: '주관식' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value as FilterType)}
                  className="px-3 py-1.5 text-[11px] font-bold rounded-full transition-all"
                  style={{
                    background: filterType === opt.value ? THEME.accent : '#fff',
                    color: filterType === opt.value ? '#fff' : '#64748B',
                    border: `1px solid ${filterType === opt.value ? THEME.accent : '#E2E8F0'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 펼치기/접기 */}
            <div className="flex gap-1">
              <button
                onClick={expandAll}
                className="px-2.5 py-1.5 text-[11px] font-bold rounded-full text-ink-secondary border border-line hover:bg-gray-50"
              >
                전체 펼침
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1.5 text-[11px] font-bold rounded-full text-ink-secondary border border-line hover:bg-gray-50"
              >
                전체 접음
              </button>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-6 h-6 border-2 border-gray-200 rounded-full animate-spin mb-3" style={{ borderTopColor: THEME.accent }} />
              <div className="text-[13px] text-ink-secondary font-medium">질문을 불러오는 중...</div>
            </div>
          ) : grouped.size === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-[13px] font-medium text-ink-secondary">
                {searchQuery ? '검색 결과가 없어요' : '질문이 없어요'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(grouped.entries()).map(([day, dayQuestions]) => {
                const isExpanded = expandedDays.has(day)
                const choiceCount = dayQuestions.filter(q => q.choice_1).length
                const textCount = dayQuestions.length - choiceCount

                return (
                  <div key={day} className="border border-line rounded-2xl overflow-hidden">
                    {/* Day 헤더 */}
                    <button
                      onClick={() => toggleDay(day)}
                      className="w-full px-5 py-3 flex items-center justify-between bg-[#F8FAFC] hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[16px]">📅</span>
                        <div className="text-left">
                          <div className="text-[14px] font-extrabold text-ink">Day {day}</div>
                          <div className="text-[11px] font-medium text-ink-secondary">
                            총 {dayQuestions.length}문항 · 객관식 {choiceCount} · 주관식 {textCount}
                          </div>
                        </div>
                      </div>
                      <span className="text-[14px] text-ink-muted">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </button>

                    {/* Day 내용 */}
                    {isExpanded && (
                      <div className="p-4 space-y-3">
                        {dayQuestions.map((q, idx) => (
                          <QuestionCard key={q.id} question={q} idx={idx + 1} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3 border-t border-line bg-[#F8FAFC] flex items-center justify-between">
          <div className="text-[11px] font-medium text-ink-secondary">
            {filtered.length !== questions.length && `필터 적용: ${filtered.length}/${questions.length}`}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px"
            style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 개별 질문 카드
// ============================================
function QuestionCard({ question, idx }: { question: MajorQuestion; idx: number }) {
  const isChoice = !!question.choice_1
  const choices = [
    { num: 1, text: question.choice_1 },
    { num: 2, text: question.choice_2 },
    { num: 3, text: question.choice_3 },
    { num: 4, text: question.choice_4 },
    { num: 5, text: question.choice_5 },
  ].filter(c => c.text)

  // 객관식 정답 (숫자)
  const correctNum = isChoice && question.answer ? Number(question.answer) : null

  return (
    <div className="bg-white border border-line rounded-xl p-4 hover:border-purple-200 transition-colors">
      {/* 헤더 */}
      <div className="flex items-start gap-2 mb-3">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
          background: isChoice ? '#EFF6FF' : '#ECFDF5',
          color: isChoice ? '#1D4ED8' : '#059669',
        }}>
          Q{idx} · {isChoice ? '객관식' : '주관식'}
        </span>
        {question.question_type && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: THEME.accentBg, color: THEME.accent }}>
            {question.question_type}
          </span>
        )}
      </div>

      {/* 질문 */}
      <div className="text-[13px] font-bold text-ink leading-relaxed mb-3">
        {question.question}
      </div>

      {/* 객관식 선택지 */}
      {isChoice && (
        <div className="space-y-1.5 mb-3">
          {choices.map(c => {
            const isCorrect = correctNum === c.num
            return (
              <div
                key={c.num}
                className="flex items-start gap-2 px-3 py-2 rounded-lg text-[12px] leading-relaxed"
                style={{
                  background: isCorrect ? '#ECFDF5' : '#F8FAFC',
                  border: isCorrect ? '1px solid #6EE7B7' : '1px solid transparent',
                }}
              >
                <span
                  className="font-bold flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                  style={{
                    background: isCorrect ? '#059669' : '#E5E7EB',
                    color: isCorrect ? '#fff' : '#64748B',
                  }}
                >
                  {c.num}
                </span>
                <span className={isCorrect ? 'text-emerald-900 font-bold' : 'text-ink'}>
                  {c.text}
                </span>
                {isCorrect && (
                  <span className="ml-auto text-[10px] font-bold text-emerald-700 flex-shrink-0">
                    ✓ 정답
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 주관식 모범답안 */}
      {!isChoice && question.answer && (
        <div className="mb-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">✅ 모범답안</div>
          <div className="text-[12px] text-emerald-900 leading-relaxed whitespace-pre-wrap">
            {question.answer}
          </div>
        </div>
      )}

      {/* 해설 */}
      {question.explanation && (
        <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">💡 해설</div>
          <div className="text-[12px] text-amber-900 leading-relaxed whitespace-pre-wrap">
            {question.explanation}
          </div>
        </div>
      )}
    </div>
  )
}