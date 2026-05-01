import {
  PAST_QUESTIONS_MOCK,
  MAJOR_QUESTIONS_MOCK,
  PASSAGE_INTERVIEWS_MOCK,
  ANSWER_FORMULAS,
} from './mock-data'

export default function QuestionsStats() {
  // 기출문제
  const pastTotal = PAST_QUESTIONS_MOCK.length
  const pastHigh = PAST_QUESTIONS_MOCK.filter(q => q.grade === 'high').length
  const pastMiddle = PAST_QUESTIONS_MOCK.filter(q => q.grade === 'middle').length

  // 전공질문 (학과 수 + 전체 문항 합계)
  const majorTotal = MAJOR_QUESTIONS_MOCK.length
  const majorHigh = MAJOR_QUESTIONS_MOCK.filter(m => m.grade === 'high').length
  const majorMiddle = MAJOR_QUESTIONS_MOCK.filter(m => m.grade === 'middle').length
  const majorQuestionTotal = MAJOR_QUESTIONS_MOCK.reduce(
    (sum, m) => sum + m.questionCount,
    0
  )

  // 제시문면접
  const passageTotal = PASSAGE_INTERVIEWS_MOCK.length
  const passageHigh = PASSAGE_INTERVIEWS_MOCK.filter(p => p.grade === 'high').length
  const passageMiddle = PASSAGE_INTERVIEWS_MOCK.filter(p => p.grade === 'middle').length

  // 답변 공식
  const formulaTotal = ANSWER_FORMULAS.length

  const cards = [
    {
      icon: '📝',
      label: '기출문제',
      value: pastTotal,
      unit: '개',
      sub: `고등 ${pastHigh} · 중등 ${pastMiddle}`,
      bgFrom: 'from-purple-500',
      bgTo: 'to-purple-600',
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-600',
    },
    {
      icon: '🎓',
      label: '전공질문',
      value: majorTotal,
      unit: '학과',
      sub: `총 ${majorQuestionTotal}개 문항 · 고등 ${majorHigh} 중등 ${majorMiddle}`,
      bgFrom: 'from-blue-500',
      bgTo: 'to-blue-600',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
    },
    {
      icon: '📜',
      label: '제시문면접',
      value: passageTotal,
      unit: '세트',
      sub: `고등 ${passageHigh} · 중등 ${passageMiddle}`,
      bgFrom: 'from-pink-500',
      bgTo: 'to-pink-600',
      iconBg: 'bg-pink-100',
      iconText: 'text-pink-600',
    },
    {
      icon: '⚡',
      label: '답변 공식',
      value: formulaTotal,
      unit: '종',
      sub: '인로드 면접 답변 IP',
      bgFrom: 'from-amber-500',
      bgTo: 'to-amber-600',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map(card => (
        <div
          key={card.label}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center text-xl`}
            >
              {card.icon}
            </div>
          </div>
          <div className="text-[12px] font-semibold text-slate-500 mb-1">
            {card.label}
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-[28px] font-extrabold text-slate-900 tracking-tight">
              {card.value.toLocaleString()}
            </span>
            <span className="text-[13px] font-semibold text-slate-500">{card.unit}</span>
          </div>
          <div className="text-[11px] text-slate-500 leading-relaxed">{card.sub}</div>
        </div>
      ))}
    </div>
  )
}