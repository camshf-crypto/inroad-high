import type { MockExam, MockExamReport, MockExamQuestion, MockExamMajor } from '../../../../../_hooks/useHighMockExam'
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
}

interface Props {
  student: any
  selExam: MockExam
  report: MockExamReport
  questions: MockExamQuestion[]
  majors: MockExamMajor[]
}

// ═══════════════════════════════════════════════════════════
// 모의면접 결과 보고서 (학부모용 - 학생 답변 분석 + 전체 Q&A 표시)
//
// PDF 출력 시 페이지 단위로 자연스럽게 분할되도록
// 각 카드에 page-break-inside: avoid CSS 적용
// 큰 섹션 사이에는 page-break-before: always 적용
// ═══════════════════════════════════════════════════════════

export default function MockExamReportView({
  student,
  selExam,
  report,
  questions,
  majors,
}: Props) {
  // 본 질문 + 꼬리 정렬
  const mains = questions
    .filter(q => q.level === 'main')
    .sort((a, b) => a.order - b.order)

  const getTails = (mainId: string) =>
    questions
      .filter(q => q.parent_id === mainId)
      .sort((a, b) => (a.tail_index ?? 0) - (b.tail_index ?? 0))

  // 답변 케이스 판별
  const totalMains = mains.length
  const answeredMains = mains.filter(m => m.student_answer?.trim()).length
  const answerCase: 'none' | 'partial' | 'full' =
    answeredMains === 0 ? 'none' :
    answeredMains < totalMains ? 'partial' : 'full'

  // 세부 지표 라벨 매핑
  const detailedLabels: Record<string, string> = {
    답변_구체성: '답변 구체성',
    학과_전문성: '학과 전문성',
    스토리_일관성: '스토리 일관성',
    꼬리질문_대응력: '꼬리질문 대응력',
    표현_안정감: '표현 안정감',
    메타인지: '메타인지',
  }

  return (
    <>
      {/* PDF 페이지 분할용 글로벌 스타일 */}
      <style>{`
        @media print {
          .report-page-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .report-page-break {
            page-break-before: always;
            break-before: page;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>

      <div id="admin-premium-report-content" className="max-w-[860px] mx-auto py-8 px-5">

        {/* ══════════════════════════════════════════════ */}
        {/* 1. 표지 (페이지 1) */}
        {/* ══════════════════════════════════════════════ */}
        <div
          className="report-page-card rounded-[32px] p-12 mb-8 text-white relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #0F172A 0%, ${THEME.accentDark} 40%, ${THEME.accent} 100%)`,
            boxShadow: '0 25px 80px rgba(15, 23, 42, 0.4)',
            minHeight: '420px',
          }}
        >
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)', transform: 'translate(-20%, 40%)' }} />

          <div className="relative z-10 flex flex-col h-full" style={{ minHeight: '380px' }}>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-0.5" style={{ background: '#FCD34D' }} />
                <div className="text-[10px] font-bold tracking-[6px]" style={{ color: '#FCD34D' }}>
                  B-KEARS · PREMIUM REPORT
                </div>
              </div>
              <div className="text-[11px] font-bold tracking-[3px] opacity-70 mb-4">
                모의면접 리포트 · {selExam.grade} {selExam.period}
              </div>
              <div className="text-[46px] font-black leading-[1.1] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                {student?.name}
              </div>
              {report.growth_narrative?.stage_label && (
                <div className="inline-block text-[12px] font-bold px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(252, 211, 77, 0.2)', color: '#FCD34D', border: '1px solid rgba(252, 211, 77, 0.4)' }}>
                  현재 단계: {report.growth_narrative.stage_label}
                </div>
              )}
              <div className="text-[18px] font-light opacity-80 mb-10">
                학생의 성장 여정을 담았습니다
              </div>
            </div>
            <div className="border-t border-white/20 pt-6 flex items-end justify-between flex-wrap gap-4">
              <div className="grid grid-cols-3 gap-8 flex-1 min-w-[400px]">
                <div>
                  <div className="text-[9px] font-bold tracking-[3px] opacity-60 mb-1.5">EXAM TYPE</div>
                  <div className="text-[14px] font-bold">{selExam.exam_type}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold tracking-[3px] opacity-60 mb-1.5">LEVEL</div>
                  <div className="text-[14px] font-bold">{selExam.major_level}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold tracking-[3px] opacity-60 mb-1.5">ISSUED</div>
                  <div className="text-[14px] font-bold">
                    {report.published_at ? new Date(report.published_at).toLocaleDateString('ko-KR') : '-'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold tracking-[3px] opacity-60 mb-1">OVERALL SCORE</div>
                <div className="flex items-baseline gap-1">
                  <div className="text-[64px] font-black leading-none" style={{ fontFamily: 'Georgia, serif', color: '#FCD34D' }}>
                    {report.scores?.total || 0}
                  </div>
                  <div className="text-[20px] font-bold opacity-60">/100</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 답변 부족 케이스 경고 (전체 답변 안 한 경우) */}
        {answerCase === 'none' && (
          <div className="report-page-card mb-8 p-6 rounded-2xl border-2" style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}>
            <div className="flex items-start gap-3">
              <div className="text-3xl">⚠️</div>
              <div>
                <div className="text-[15px] font-extrabold text-red-800 mb-1">학생이 시험에 응시하지 않았어요</div>
                <div className="text-[13px] text-red-700 leading-[1.7]">
                  본 회차에서 학생이 단 하나의 본 질문에도 답변하지 않았습니다. 시간 관리·시험 준비도 측면에서 점검이 필요하며, 본사 시뮬레이션 시스템을 활용해 다시 응시할 수 있도록 학생을 격려해주세요.
                </div>
              </div>
            </div>
          </div>
        )}

        {answerCase === 'partial' && (
          <div className="report-page-card mb-8 p-5 rounded-2xl border-2" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
            <div className="flex items-start gap-3">
              <div className="text-2xl">📝</div>
              <div>
                <div className="text-[14px] font-extrabold text-amber-900 mb-1">
                  부분 응답 - 본 질문 {totalMains}개 중 {answeredMains}개 답변
                </div>
                <div className="text-[12px] text-amber-800 leading-[1.7]">
                  본 보고서는 답변한 부분만을 기준으로 평가되었습니다. 누락된 답변에 대한 학생 컨디션 점검이 필요합니다.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 2. 영역별 점수 (3개) */}
        {/* ══════════════════════════════════════════════ */}
        {report.scores && (
          <div className="report-page-card bg-white rounded-3xl p-7 shadow-sm border border-slate-100 mb-8">
            <div className="text-[10px] font-bold text-slate-400 tracking-[3px] uppercase mb-1">Performance Analysis</div>
            <div className="text-[18px] font-extrabold text-slate-900 mb-5">3가지 영역 종합 분석</div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: '인성', score: report.scores['인성'] || 0, color: '#3B82F6', desc: 'Character' },
                { name: '전공적합성', score: report.scores['전공적합성'] || 0, color: '#10B981', desc: 'Major Fit' },
                { name: '발전가능성', score: report.scores['발전가능성'] || 0, color: '#F59E0B', desc: 'Potential' },
              ].map(cat => (
                <div key={cat.name} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ background: cat.color }} />
                  <div className="text-[9px] font-bold tracking-[3px] uppercase mb-1" style={{ color: cat.color }}>{cat.desc}</div>
                  <div className="flex items-end justify-between">
                    <div className="text-[13px] font-bold text-slate-700">{cat.name}</div>
                    <div className="text-[28px] font-black leading-none" style={{ color: cat.color, fontFamily: 'Georgia, serif' }}>
                      {cat.score}
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cat.score}%`, background: `linear-gradient(90deg, ${cat.color}aa, ${cat.color})` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 3. 🆕 6개 세부 지표 */}
        {/* ══════════════════════════════════════════════ */}
        {report.detailed_scores && (
          <div className="report-page-card bg-white rounded-3xl p-7 shadow-sm border border-slate-100 mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[24px]" style={{ background: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)' }}>
                📊
              </div>
              <div>
                <div className="text-[9px] font-bold tracking-[3px] uppercase" style={{ color: THEME.accent }}>Detailed Metrics</div>
                <div className="text-[18px] font-extrabold text-slate-900">6개 세부 지표 (10점 만점)</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(report.detailed_scores).map(([key, value]) => {
                const score = typeof value === 'number' ? value : 6
                const label = detailedLabels[key] || key
                const pct = (score / 10) * 100
                const color = score >= 8 ? '#10B981' : score >= 6 ? '#3B82F6' : score >= 4 ? '#F59E0B' : '#EF4444'

                return (
                  <div key={key} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[12px] font-bold text-slate-700">{label}</div>
                      <div className="text-[16px] font-extrabold" style={{ color, fontFamily: 'Georgia, serif' }}>
                        {score}<span className="text-[11px] text-slate-400 font-bold">/10</span>
                      </div>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}aa, ${color})` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 4. 🆕 성장 서사 */}
        {/* ══════════════════════════════════════════════ */}
        {report.growth_narrative && (
          <div className="report-page-card bg-white rounded-3xl p-7 shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #06B6D4, #0EA5E9, #3B82F6)' }} />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[24px]" style={{ background: 'linear-gradient(135deg, #CFFAFE, #A5F3FC)' }}>
                📈
              </div>
              <div>
                <div className="text-[9px] font-bold text-cyan-700 tracking-[3px] uppercase">Growth Journey</div>
                <div className="text-[18px] font-extrabold text-cyan-900">학생의 성장 여정</div>
              </div>
            </div>

            {report.growth_narrative.from_to && (
              <div className="bg-cyan-50 rounded-xl p-4 mb-4 border border-cyan-200">
                <div className="text-[11px] font-bold text-cyan-700 mb-1">📍 시작점 → 현재 → 다음 목표</div>
                <div className="text-[14px] font-semibold text-cyan-900 leading-[1.7]">{report.growth_narrative.from_to}</div>
              </div>
            )}

            {report.growth_narrative.key_moment && (
              <div className="mb-4">
                <div className="text-[11px] font-bold text-slate-600 mb-2">⭐ 이번 회차 가장 인상적인 성장 순간</div>
                <div className="text-[13px] text-slate-800 leading-[1.8] bg-slate-50 rounded-xl p-4 border border-slate-200">
                  {report.growth_narrative.key_moment}
                </div>
              </div>
            )}

            {report.growth_narrative.compared_to_prev && (
              <div>
                <div className="text-[11px] font-bold text-slate-600 mb-2">🔄 이전 회차 대비 변화</div>
                <div className="text-[13px] text-slate-800 leading-[1.8] bg-slate-50 rounded-xl p-4 border border-slate-200">
                  {report.growth_narrative.compared_to_prev}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 5. 학부모 편지 (페이지 break 권장) */}
        {/* ══════════════════════════════════════════════ */}
        {report.summary_for_parents && (
          <div
            className="report-page-card report-page-break rounded-3xl p-10 mb-8 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FBBF24 100%)',
              boxShadow: '0 20px 60px rgba(251, 191, 36, 0.25)',
            }}
          >
            <div className="absolute top-8 right-10 text-8xl opacity-15" style={{ fontFamily: 'Georgia, serif' }}>"</div>
            <div className="absolute bottom-8 left-10 text-8xl opacity-15 rotate-180" style={{ fontFamily: 'Georgia, serif' }}>"</div>
            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-6 justify-center">
                <div className="w-12 h-0.5" style={{ background: '#92400E' }} />
                <div className="text-[10px] font-bold tracking-[4px]" style={{ color: '#92400E' }}>
                  LETTER TO PARENTS
                </div>
                <div className="w-12 h-0.5" style={{ background: '#92400E' }} />
              </div>
              <div className="text-[24px] font-extrabold text-center mb-6" style={{ color: '#78350F', fontFamily: 'Georgia, serif' }}>
                학부모님께 드리는 메시지
              </div>
              <div className="text-[15px] leading-[2.2] text-center font-medium" style={{ color: '#78350F', fontFamily: 'Georgia, serif' }}>
                {report.summary_for_parents}
              </div>
              <div className="text-right mt-8 text-[12px] font-bold" style={{ color: '#92400E', fontFamily: 'Georgia, serif' }}>
                — B-KEARS 입시 컨설팅 드림
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 6. 강점 & 개선점 */}
        {/* ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {report.strengths && report.strengths.length > 0 && (
            <div className="report-page-card bg-white rounded-3xl p-7 shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #10B981, #34D399)' }} />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[24px]" style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' }}>
                  💪
                </div>
                <div>
                  <div className="text-[9px] font-bold text-green-700 tracking-[3px] uppercase">Strengths</div>
                  <div className="text-[18px] font-extrabold text-green-800">강점 분석</div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {report.strengths.map((s: string, i: number) => (
                  <div key={i} className="flex gap-3 items-start bg-green-50/50 rounded-xl p-3">
                    <div className="w-7 h-7 rounded-full text-white flex items-center justify-center flex-shrink-0 text-[11px] font-black" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                      {i + 1}
                    </div>
                    <div className="text-[13px] text-green-900 leading-[1.8] flex-1 font-medium">{s}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.weaknesses && report.weaknesses.length > 0 && (
            <div className="report-page-card bg-white rounded-3xl p-7 shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #F59E0B, #FBBF24)' }} />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[24px]" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' }}>
                  🎯
                </div>
                <div>
                  <div className="text-[9px] font-bold text-amber-700 tracking-[3px] uppercase">Improvements</div>
                  <div className="text-[18px] font-extrabold text-amber-800">개선 + 보완법</div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {report.weaknesses.map((s: string, i: number) => (
                  <div key={i} className="flex gap-3 items-start bg-amber-50/50 rounded-xl p-3">
                    <div className="w-7 h-7 rounded-lg text-white flex items-center justify-center flex-shrink-0 text-[14px] font-black" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                      ▸
                    </div>
                    <div className="text-[13px] text-amber-900 leading-[1.8] flex-1 font-medium">{s}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* 7. 🆕 학원 효과 */}
        {/* ══════════════════════════════════════════════ */}
        {report.curriculum_effect && (
          <div className="report-page-card bg-white rounded-3xl p-7 shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA, #C4B5FD)' }} />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[24px]" style={{ background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)' }}>
                ✨
              </div>
              <div>
                <div className="text-[9px] font-bold text-purple-700 tracking-[3px] uppercase">Curriculum Impact</div>
                <div className="text-[18px] font-extrabold text-purple-900">본사 커리큘럼이 만든 변화</div>
              </div>
            </div>

            {report.curriculum_effect.highlight && (
              <div className="text-[13px] text-purple-900 leading-[1.8] bg-purple-50 rounded-xl p-4 border border-purple-200 mb-4">
                {report.curriculum_effect.highlight}
              </div>
            )}

            {report.curriculum_effect.evidence_quote && (
              <div className="border-l-4 border-purple-400 pl-4 mb-4 italic">
                <div className="text-[10px] font-bold text-purple-600 mb-1 not-italic">📌 답변에서 발견된 효과</div>
                <div className="text-[13px] text-purple-800 leading-[1.7]">"{report.curriculum_effect.evidence_quote}"</div>
              </div>
            )}

            {report.curriculum_effect.next_curriculum && (
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
                <div className="text-[11px] font-bold text-purple-700 mb-1">🎯 다음 회차까지 학원이 함께할 것</div>
                <div className="text-[13px] text-purple-900 leading-[1.7]">{report.curriculum_effect.next_curriculum}</div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 8. 🆕 미래 예측 */}
        {/* ══════════════════════════════════════════════ */}
        {report.future_projection && (
          <div className="report-page-card bg-white rounded-3xl p-7 shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #EC4899, #F472B6, #FBCFE8)' }} />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[24px]" style={{ background: 'linear-gradient(135deg, #FCE7F3, #FBCFE8)' }}>
                🔮
              </div>
              <div>
                <div className="text-[9px] font-bold text-pink-700 tracking-[3px] uppercase">Future Projection</div>
                <div className="text-[18px] font-extrabold text-pink-900">미래 성장 예측</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                <div className="text-[10px] font-bold text-pink-700 mb-1">📊 다음 회차 예상 점수</div>
                <div className="flex items-baseline gap-1">
                  <div className="text-[36px] font-black text-pink-700" style={{ fontFamily: 'Georgia, serif' }}>
                    {report.future_projection.next_period_score_estimate || '-'}
                  </div>
                  <div className="text-[14px] font-bold text-pink-500">/100</div>
                </div>
                {report.scores?.total && report.future_projection.next_period_score_estimate && (
                  <div className="text-[11px] font-bold text-pink-600 mt-1">
                    {report.future_projection.next_period_score_estimate >= report.scores.total ? '▲ ' : '▼ '}
                    {Math.abs(report.future_projection.next_period_score_estimate - report.scores.total)}점 변동 예상
                  </div>
                )}
              </div>
              <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                <div className="text-[10px] font-bold text-pink-700 mb-1">🎯 다음 회차 성장 영역</div>
                <div className="text-[12px] text-pink-900 leading-[1.7]">
                  {report.future_projection.next_period_growth_focus || '-'}
                </div>
              </div>
            </div>

            {report.future_projection.trajectory_assessment && (
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-200 mb-3">
                <div className="text-[10px] font-bold text-pink-700 mb-1">📈 입시까지의 추세</div>
                <div className="text-[13px] text-pink-900 leading-[1.7]">{report.future_projection.trajectory_assessment}</div>
              </div>
            )}

            {report.future_projection.milestone_distance && (
              <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200">
                <div className="text-[10px] font-bold text-rose-700 mb-1">🏁 합격선까지의 거리</div>
                <div className="text-[13px] text-rose-900 leading-[1.7]">{report.future_projection.milestone_distance}</div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 9. 대학 적합도 */}
        {/* ══════════════════════════════════════════════ */}
        {report.university_fit && (
          <div
            className="report-page-card rounded-3xl p-8 mb-8 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              boxShadow: '0 20px 60px rgba(15, 23, 42, 0.3)',
            }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #DC2626 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="text-4xl">🎓</div>
                <div>
                  <div className="text-[9px] font-bold text-red-300 tracking-[3px] uppercase">Target University</div>
                  <div className="text-[11px] font-bold text-slate-400">목표 대학 적합도</div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-6 flex-wrap mb-6">
                <div>
                  <div className="text-[28px] font-extrabold text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                    {report.university_fit.university}
                  </div>
                  <div className="text-[16px] font-bold text-slate-300">
                    {report.university_fit.department}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-red-300 tracking-[2px] uppercase mb-1">Fit Score</div>
                  <div className="flex items-baseline gap-1 justify-end">
                    <div className="text-[64px] font-black leading-none" style={{ color: '#F87171', fontFamily: 'Georgia, serif' }}>
                      {report.university_fit.fit_score}
                    </div>
                    <div className="text-[24px] font-bold text-red-300">%</div>
                  </div>
                </div>
              </div>
              <div className="h-4 bg-white/10 rounded-full overflow-hidden mb-4">
                <div className="h-full rounded-full" style={{ width: `${report.university_fit.fit_score}%`, background: 'linear-gradient(90deg, #F87171, #DC2626, #B91C1C)', boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)' }} />
              </div>
              {report.university_fit.reason && (
                <div className="text-[13px] text-slate-300 leading-[1.8] bg-white/5 rounded-xl p-4 border border-white/10">
                  💬 {report.university_fit.reason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 10. 🆕 모의면접 Q&A 전체 (페이지 break) */}
        {/* ══════════════════════════════════════════════ */}
        <div className="report-page-break bg-white rounded-3xl p-7 shadow-sm border border-slate-100 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[24px]" style={{ background: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)' }}>
              📝
            </div>
            <div>
              <div className="text-[9px] font-bold tracking-[3px] uppercase" style={{ color: THEME.accent }}>Interview Q&A</div>
              <div className="text-[18px] font-extrabold text-slate-900">모의면접 질문 + 답변 기록</div>
              <div className="text-[11px] text-slate-500 mt-0.5">실제 학생이 응답한 내용</div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {mains.map((m, i) => {
              const tails = getTails(m.id)
              return (
                <div key={m.id} className="report-page-card border border-slate-200 rounded-2xl p-5 bg-slate-50">
                  {/* 본 질문 */}
                  <div className="flex items-start gap-2 mb-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: THEME.accent, color: '#fff' }}
                    >
                      Q{i + 1}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: '#fff', color: THEME.accentDark, border: `1px solid ${THEME.accentBorder}` }}
                    >
                      {m.type}
                    </span>
                    <div className="text-[13px] font-bold text-slate-900 leading-[1.6] flex-1">{m.question_text}</div>
                  </div>

                  {/* 본 답변 */}
                  <div className="ml-8 mb-3">
                    <div className="text-[10px] font-bold text-slate-500 mb-1.5">👤 학생 답변</div>
                    <div
                      className="text-[12px] leading-[1.8] bg-white border border-slate-200 rounded-lg p-3 whitespace-pre-wrap"
                      style={{ color: m.student_answer?.trim() ? '#1e293b' : '#94a3b8' }}
                    >
                      {m.student_answer?.trim() || '(답변 없음 - 시간 초과)'}
                    </div>
                  </div>

                  {/* 꼬리 질문/답변 */}
                  {tails.length > 0 && (
                    <div className="ml-8 flex flex-col gap-2">
                      {tails.map((tail, ti) => (
                        <div key={tail.id} className="bg-white border border-slate-200 rounded-lg p-3">
                          <div className="flex items-start gap-2 mb-1.5">
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: '#EDE9FE', color: '#7C3AED', border: '1px solid #DDD6FE' }}
                            >
                              꼬리 {ti + 1}
                            </span>
                            <div className="text-[11.5px] font-semibold text-slate-700 leading-[1.6] flex-1">{tail.question_text}</div>
                          </div>
                          <div className="ml-3 pl-3 border-l-2 border-slate-200">
                            <div className="text-[9px] font-bold text-slate-500 mb-1">👤 답변</div>
                            <div
                              className="text-[11.5px] leading-[1.7] whitespace-pre-wrap"
                              style={{ color: tail.student_answer?.trim() ? '#1e293b' : '#94a3b8' }}
                            >
                              {tail.student_answer?.trim() || '(답변 없음)'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 전공특화 답변 요약 */}
          {majors.length > 0 && (
            <div className="report-page-card mt-6 pt-6 border-t border-slate-200">
              <div className="text-[14px] font-extrabold text-slate-900 mb-3">🧠 전공특화 시험 결과</div>
              <div className="grid grid-cols-2 gap-2">
                {majors.map((q, i) => {
                  const scoreInfo =
                    q.score === 100 ? { label: '○ 정답', bg: '#ECFDF5', color: '#059669' } :
                    q.score === 50 ? { label: '△ 부분', bg: '#FFF7ED', color: '#D97706' } :
                    q.score === 0 ? { label: '✕ 오답', bg: '#FEF2F2', color: '#DC2626' } :
                    { label: '미채점', bg: '#F3F4F6', color: '#6B7280' }
                  return (
                    <div key={q.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: THEME.accentBg, color: THEME.accentDark }}>
                          Q{i + 1}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: scoreInfo.bg, color: scoreInfo.color }}>
                          {scoreInfo.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-700 leading-[1.5] mb-1.5 line-clamp-2">{q.question_text}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-2">
                        <span className="font-bold">답변: </span>
                        {q.student_answer || '미작성'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* 11. AI 맞춤 시기별 가이드 (페이지 break) */}
        {/* ══════════════════════════════════════════════ */}
        {report.season_guide_ai && (
          <div className="report-page-card report-page-break bg-white rounded-3xl p-8 mb-8 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #10B981, #34D399, #6EE7B7)' }} />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px]" style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' }}>
                🌱
              </div>
              <div>
                <div className="text-[9px] font-bold text-green-700 tracking-[3px] uppercase">Seasonal Guide · AI Custom</div>
                <div className="text-[22px] font-extrabold text-green-800">{report.season_guide_ai.title}</div>
                <div className="text-[12px] font-semibold text-green-700 mt-0.5">{report.season_guide_ai.subtitle}</div>
              </div>
            </div>
            {Array.isArray(report.season_guide_ai.content) && (
              <div className="grid grid-cols-2 gap-3">
                {report.season_guide_ai.content.map((c: string, i: number) => (
                  <div key={i} className="flex gap-3 items-start rounded-2xl p-4 border border-green-100" style={{ background: 'linear-gradient(135deg, #ECFDF5, #F0FDF4)' }}>
                    <div className="w-8 h-8 rounded-xl text-white flex items-center justify-center flex-shrink-0 text-[12px] font-black" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="text-[13px] text-green-900 leading-[1.8] flex-1 font-medium">{c}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 12. AI 맞춤 생기부 방향성 */}
        {/* ══════════════════════════════════════════════ */}
        {report.saenggibu_direction_ai && (
          <div className="report-page-card bg-white rounded-3xl p-8 mb-8 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA, #C4B5FD)' }} />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px]" style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' }}>
                📚
              </div>
              <div>
                <div className="text-[9px] font-bold text-purple-700 tracking-[3px] uppercase">Saenggibu Design · AI Custom</div>
                <div className="text-[22px] font-extrabold text-purple-800">생활기록부 방향성 (학생 맞춤)</div>
                <div className="text-[12px] font-semibold text-purple-700 mt-0.5">학생의 약점·강점을 분석한 맞춤 제안</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(report.saenggibu_direction_ai).map(([key, items]) => (
                <div key={key} className="rounded-2xl p-5 border border-purple-100" style={{ background: 'linear-gradient(135deg, #FAF5FF, #F5F3FF)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #7C3AED, #A78BFA)' }} />
                    <div className="text-[14px] font-extrabold text-purple-900">{key}</div>
                  </div>
                  {Array.isArray(items) && (
                    <div className="flex flex-col gap-2">
                      {(items as string[]).map((item, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <div className="text-purple-500 flex-shrink-0 text-[12px] font-bold mt-1">◆</div>
                          <div className="text-[12px] text-purple-900 leading-[1.7] flex-1">{item}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 13. AI 맞춤 다음 회차 계획 */}
        {/* ══════════════════════════════════════════════ */}
        {report.next_period_plan_ai && (
          <div
            className="report-page-card rounded-3xl p-8 mb-8 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 50%, #FDBA74 100%)',
              boxShadow: '0 20px 60px rgba(251, 146, 60, 0.2)',
            }}
          >
            <div className="absolute top-4 right-6 text-8xl opacity-15">🎯</div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] bg-white shadow-md">
                  🎯
                </div>
                <div>
                  <div className="text-[9px] font-bold text-orange-800 tracking-[3px] uppercase">Next Period Plan · AI Custom</div>
                  <div className="text-[22px] font-extrabold text-orange-900">다음 회차까지 학생 맞춤 액션 플랜</div>
                </div>
              </div>
              <div className="text-[14px] leading-[2] text-orange-900 font-medium bg-white/40 rounded-2xl p-5 border border-orange-200 whitespace-pre-wrap" style={{ fontFamily: 'Georgia, serif' }}>
                {report.next_period_plan_ai}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 14. 선생님 코멘트 */}
        {/* ══════════════════════════════════════════════ */}
        {selExam.teacher_comment && (
          <div
            className="report-page-card rounded-3xl p-8 mb-8 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)`,
              borderLeft: `8px solid ${THEME.accent}`,
              boxShadow: `0 20px 60px ${THEME.accentShadow}`,
            }}
          >
            <div className="absolute top-6 right-8 text-8xl opacity-10" style={{ fontFamily: 'Georgia, serif' }}>"</div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] bg-white shadow-md">
                  👨‍🏫
                </div>
                <div>
                  <div className="text-[9px] font-bold tracking-[3px] uppercase" style={{ color: THEME.accentDark }}>Teacher's Note</div>
                  <div className="text-[22px] font-extrabold" style={{ color: THEME.accentDark }}>선생님 특별 코멘트</div>
                </div>
              </div>
              <div className="text-[16px] leading-[2.2] font-medium italic" style={{ color: THEME.accentDark, fontFamily: 'Georgia, serif' }}>
                "{selExam.teacher_comment}"
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 15. 푸터 */}
        {/* ══════════════════════════════════════════════ */}
        <div className="report-page-card bg-white rounded-3xl p-8 text-center shadow-sm border border-slate-100">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-0.5" style={{ background: THEME.accent }} />
            <div className="text-[24px] font-black tracking-[4px]" style={{ color: THEME.accent, fontFamily: 'Georgia, serif' }}>
              B-KEARS
            </div>
            <div className="w-12 h-0.5" style={{ background: THEME.accent }} />
          </div>
          <div className="text-[11px] font-bold text-slate-600 tracking-[3px] uppercase mb-2">
            AI Premium College Admission Consulting
          </div>
          <div className="text-[10px] text-slate-400 leading-[1.8] max-w-lg mx-auto">
            본 리포트는 AI 분석과 담당 선생님의 전문 코멘트를 바탕으로 작성되었습니다.<br />
            © 2026 B-KEARS · Powered by 마스터웨이학원
          </div>
        </div>

      </div>
    </>
  )
}