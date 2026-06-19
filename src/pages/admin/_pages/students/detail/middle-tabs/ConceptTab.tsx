// src/pages/admin/_pages/students/detail/middle-tabs/ConceptTab.tsx

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TYPE_NAMES, TYPE_DESC, TYPE_MAJORS } from '@/pages/middle-student/_pages/concept/questions'
import TypeDetailCard from './TypeDetailCard'
import TypeDetailModal from './TypeDetailModal'
import { TYPE_DETAIL } from './TypeDetailData'

interface Props {
  student: {
    id: string
    name: string
    academy_id: string
    grade?: string
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
  const [academyName, setAcademyName] = useState<string>('')

  // 학원명 조회 (PDF 출력용)
  useEffect(() => {
    if (!student.academy_id) return
    supabase
      .from('academies')
      .select('name')
      .eq('id', student.academy_id)
      .maybeSingle()
      .then(({ data }) => setAcademyName(data?.name || ''))
  }, [student.academy_id])

  useEffect(() => {
    fetchConcept()
  }, [student.id])

  const fetchConcept = async () => {
    setLoading(true)
    try {
      // 중등은 학년 구분 없이 학생당 1개
      const { data, error } = await supabase
        .from('middle_student_concept')
        .select('*')
        .eq('student_id', student.id)
        .eq('academy_id', student.academy_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      setConceptData(data as ConceptData | null)
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
        .from('middle_student_concept')
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
        .from('middle_student_concept')
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
          <div className="w-8 h-8 border-2 border-gray-200 border-t-brand-middle rounded-full animate-spin mx-auto mb-3" />
          <div className="text-[13px] text-ink-secondary">불러오는 중...</div>
        </div>
      </div>
    )
  }

  // 진단 데이터 자체가 없음
  if (!conceptData) {
    return (
      <div className="py-8">
        <div className="bg-white border border-line rounded-2xl p-8 text-center max-w-[480px] mx-auto">
          <div className="text-4xl mb-4">📝</div>
          <div className="text-[16px] font-bold text-ink mb-2">아직 진단을 시작하지 않았어요</div>
          <div className="text-[13px] text-ink-secondary mb-5">
            {student.name} 학생이 아직 진로 계열 검사 진단을 시작하지 않았어요.
          </div>
          <div className="text-[12px] text-ink-muted">학생이 진단을 완료하면 이 화면에서 결과를 확인할 수 있어요.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6 max-w-[1200px]">
      {conceptData.status === 'in_progress' ? (
        <InProgressView conceptData={conceptData} studentName={student.name} />
      ) : (
        <CompletedView
          conceptData={conceptData}
          student={student}
          academyName={academyName}
          onApprove={handleApprove}
          onRevoke={handleRevoke}
          approving={approving}
        />
      )}
    </div>
  )
}

// 진단 진행 중 화면
function InProgressView({ conceptData, studentName }: { conceptData: ConceptData; studentName: string }) {
  const answered = Object.keys(conceptData.answers || {}).length
  const progress = Math.round((answered / 200) * 100)
  return (
    <div className="bg-white border border-line rounded-2xl p-8 text-center max-w-[480px] mx-auto">
      <div className="text-4xl mb-4">📝</div>
      <div className="text-[16px] font-bold text-ink mb-2">진단 진행 중</div>
      <div className="text-[13px] text-ink-secondary mb-5">
        {studentName} 학생이 현재 200문항 진단을 진행 중이에요.
      </div>
      <div className="mb-4">
        <div className="flex items-center justify-between text-[12px] font-semibold mb-1.5">
          <span className="text-ink-muted">진행률</span>
          <span className="text-brand-middle">{progress}% ({answered}/200)</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-middle rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}

// HTML escape (PDF 출력 시 안전하게)
function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 진단 완료 화면
function CompletedView({
  conceptData,
  student,
  academyName,
  onApprove,
  onRevoke,
  approving,
}: {
  conceptData: ConceptData
  student: Props['student']
  academyName: string
  onApprove: () => void
  onRevoke: () => void
  approving: boolean
}) {
  const [detailOpen, setDetailOpen] = useState(false)

  const typeCode = conceptData.type_code ?? ''
  const typeName = conceptData.type_name ?? TYPE_NAMES[typeCode] ?? typeCode
  const typeDesc = TYPE_DESC[typeCode] ?? ''
  const recommendedMajors = TYPE_MAJORS[typeCode] ?? []
  const scores = conceptData.scores ?? {}
  const topScores = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const maxScore = topScores[0]?.[1] ?? 1

  // 🔥 진로계열검사 결과 PDF 출력
  const printConcept = () => {
    const gradeLabel = student.grade || '-'
    const diagnosedAt = conceptData.updated_at?.slice(0, 10) || '-'
    const isApproved = conceptData.status === 'approved'
    const approvedAt = conceptData.approved_at?.slice(0, 10) || '-'
    const brand = academyName || 'B-KURS'  // 학원명 우선, 없으면 B-KURS

    const scoreRows = topScores.map(([type, score], idx) => {
      const pct = Math.round((score / maxScore) * 100)
      const name = TYPE_NAMES[type] || type
      const isTop = idx === 0
      return `
        <div class="score-row">
          <div class="score-rank ${isTop ? 'top' : ''}">${idx + 1}</div>
          <div class="score-name">${esc(name)}</div>
          <div class="score-bar-wrap">
            <div class="score-bar ${isTop ? 'top' : ''}" style="width:${pct}%"></div>
          </div>
          <div class="score-val">${esc(score)}</div>
        </div>`
    }).join('')

    const majorChips = recommendedMajors
      .slice(0, 8)
      .map(m => `<span class="chip">${esc(m)}</span>`)
      .join('')

    const keywordChips = (conceptData.keywords?.length ?? 0) > 0
      ? conceptData.keywords!.map(k => `<span class="chip kw">#${esc(k)}</span>`).join('')
      : ''

    const selectionBlock = (isApproved && conceptData.major) ? `
      <div class="section">
        <div class="sec-title">🎯 학생이 선택한 진로 계열</div>
        <div class="kv"><span class="k">선택 학과</span><span class="v">${esc(conceptData.major)}</span></div>
        <div class="kv"><span class="k">세부 목표</span><span class="v hl">${esc(conceptData.career || conceptData.custom_goal || '-')}</span></div>
        ${keywordChips ? `<div class="kv"><span class="k">키워드</span><span class="v"><div class="chips">${keywordChips}</div></span></div>` : ''}
      </div>` : ''

    const statusBadge = isApproved
      ? `<span class="badge ok">✓ 승인 완료 (${esc(approvedAt)})</span>`
      : `<span class="badge wait">⏳ 승인 대기</span>`

    // ── 2페이지: 유형 해설 (TYPE_DETAIL) ──
    // 대학생활 적응 전략 / 재검토 / 학부모님께 드리는 말씀 섹션은 제외
    const detail = TYPE_DETAIL[typeCode]
    let detailPage = ''
    if (detail) {
      const strengthChips = (detail.strengths || []).map((s: string) => `<span class="chip green">${esc(s)}</span>`).join('')
      const weakChips = (detail.weaknesses || []).map((w: string) => `<span class="chip amber">${esc(w)}</span>`).join('')
      const majorCards = (detail.majors || []).map((m: any, i: number) => `
        <div class="major-card">
          <div class="major-num">${i + 1}</div>
          <div>
            <div class="major-name">${esc(m.name)}</div>
            <div class="major-desc">${esc(m.desc)}</div>
          </div>
        </div>`).join('')

      detailPage = `
<div class="page-break"></div>
<div class="head">
  <div>
    <div class="head-title">진단 유형 해설</div>
    <div class="head-sub">${esc(typeName)} (${esc(typeCode)})${detail.catchphrase ? ' · ' + esc(detail.catchphrase) : ''}</div>
  </div>
  <div class="head-meta"><div><b>${esc(student.name)}</b> 학생 · ${esc(gradeLabel)}</div></div>
</div>

<div class="section">
  <div class="sec-title">🧒 이 아이는 어떤 아이인가요?</div>
  <p class="para">${esc(detail.personality)}</p>
</div>

<div class="two-col">
  <div class="info-box"><div class="ib-title">🧠 사고방식</div><p>${esc(detail.thinking)}</p></div>
  <div class="info-box"><div class="ib-title">📚 학습 스타일</div><p>${esc(detail.learning)}</p></div>
</div>

<div class="two-col">
  <div class="sw-box green">
    <div class="sw-title">✓ 강점</div>
    <div class="chips">${strengthChips}</div>
    <p class="sw-detail">${esc(detail.strengthsDetail)}</p>
  </div>
  <div class="sw-box amber">
    <div class="sw-title">⚠ 보완할 점</div>
    <div class="chips">${weakChips}</div>
    <p class="sw-detail">${esc(detail.weaknessesDetail)}</p>
  </div>
</div>

<div class="two-col">
  <div class="info-box"><div class="ib-title">🔍 관심 분야</div><p>${esc(detail.interests)}</p></div>
  <div class="info-box"><div class="ib-title">🎯 미래 지향</div><p>${esc(detail.future)}</p></div>
</div>

<div class="section">
  <div class="sec-title">🏫 추천 학과 TOP 6</div>
  <div class="major-grid">${majorCards}</div>
</div>

<div class="footer">${esc(brand)} · 출처: 학과 적합도 정밀 진단 200 · 유형 결과 해설집</div>`
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>진로 계열 검사 결과 - ${esc(student.name)}</title>
<style>
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;padding:24px 28px;color:#1a1a1a;max-width:760px;margin:0 auto;font-size:12px;}
.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #064E3B;padding-bottom:10px;margin-bottom:14px;}
.head-title{font-size:18px;font-weight:800;color:#064E3B;}
.head-sub{font-size:11px;color:#6B7280;margin-top:3px;}
.head-meta{font-size:11px;color:#374151;text-align:right;line-height:1.7;}
.head-meta b{color:#064E3B;}
.badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 9px;border-radius:99px;}
.badge.ok{background:#ECFDF5;color:#047857;border:1px solid #6EE7B7;}
.badge.wait{background:#FFFBEB;color:#B45309;border:1px solid #FCD34D;}
.type-box{background:#ECFDF5;border:1.5px solid #A7F3D0;border-radius:10px;padding:14px 16px;margin-bottom:14px;}
.type-label{font-size:10px;font-weight:700;color:#059669;letter-spacing:0.05em;margin-bottom:6px;}
.type-name{font-size:20px;font-weight:800;color:#065F46;}
.type-code{font-size:11px;color:#6B7280;margin-top:2px;}
.type-desc{font-size:12px;color:#374151;line-height:1.7;margin-top:8px;}
.section{margin-bottom:14px;}
.sec-title{font-size:12px;font-weight:700;color:#064E3B;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #E5E7EB;}
.score-row{display:flex;align-items:center;gap:8px;margin-bottom:5px;}
.score-rank{width:16px;height:16px;border-radius:99px;background:#E5E7EB;color:#6B7280;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.score-rank.top{background:#059669;color:#fff;}
.score-name{width:110px;font-size:11px;font-weight:600;flex-shrink:0;}
.score-bar-wrap{flex:1;height:8px;background:#F1F5F9;border:0.5px solid #E2E8F0;border-radius:99px;overflow:hidden;}
.score-bar{height:100%;background:#CBD5E1;border-radius:99px;}
.score-bar.top{background:#059669;}
.score-val{width:28px;text-align:right;font-size:11px;color:#6B7280;flex-shrink:0;}
.chips{display:flex;flex-wrap:wrap;gap:5px;}
.chip{font-size:11px;font-weight:600;padding:3px 9px;background:#fff;border:1px solid #A7F3D0;color:#065F46;border-radius:99px;}
.chip.kw{background:#ECFDF5;}
.kv{display:flex;align-items:flex-start;gap:10px;margin-bottom:6px;}
.kv .k{width:64px;font-size:11px;font-weight:600;color:#6B7280;flex-shrink:0;padding-top:1px;}
.kv .v{font-size:12px;font-weight:700;color:#1a1a1a;}
.kv .v.hl{color:#065F46;}
.footer{text-align:center;font-size:10px;color:#9CA3AF;margin-top:18px;padding-top:10px;border-top:1px solid #E5E7EB;}
/* ── 2페이지: 유형 해설 ── */
.page-break{page-break-before:always;}
.para{font-size:12px;color:#374151;line-height:1.8;margin:0;}
.two-col{display:flex;gap:10px;margin-bottom:12px;}
.two-col>*{flex:1;}
.info-box{background:#F8FAFC;border:1px solid #E5E7EB;border-radius:8px;padding:10px 12px;}
.info-box .ib-title{font-size:11px;font-weight:700;color:#064E3B;margin-bottom:5px;}
.info-box p{font-size:11px;color:#374151;line-height:1.65;margin:0;}
.sw-box{border-radius:8px;padding:10px 12px;}
.sw-box.green{background:#ECFDF5;border:1px solid #A7F3D0;}
.sw-box.amber{background:#FFFBEB;border:1px solid #FDE68A;}
.sw-box .sw-title{font-size:11px;font-weight:700;margin-bottom:6px;}
.sw-box.green .sw-title{color:#047857;}
.sw-box.amber .sw-title{color:#B45309;}
.sw-box .sw-detail{font-size:10.5px;line-height:1.6;margin:6px 0 0;}
.sw-box.green .sw-detail{color:#065F46;}
.sw-box.amber .sw-detail{color:#92400E;}
.chip.green{background:#fff;border:1px solid #A7F3D0;color:#047857;}
.chip.amber{background:#fff;border:1px solid #FDE68A;color:#B45309;}
.major-grid{display:flex;flex-wrap:wrap;gap:8px;}
.major-card{width:calc(50% - 4px);display:flex;gap:8px;align-items:flex-start;background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:9px 10px;}
.major-num{width:18px;height:18px;border-radius:99px;background:#ECFDF5;color:#065F46;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.major-name{font-size:11.5px;font-weight:700;color:#1a1a1a;margin-bottom:2px;}
.major-desc{font-size:10px;color:#6B7280;line-height:1.4;}
@media print{html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}body{padding:14px 18px;}.type-box,.section,.major-card,.sw-box,.info-box{page-break-inside:avoid;}}
</style></head><body>
<div class="head">
  <div>
    <div class="head-title">진로 계열 검사 결과</div>
    <div class="head-sub">${esc(brand)} · 진로 계열 진단 리포트</div>
  </div>
  <div class="head-meta">
    <div><b>${esc(student.name)}</b> 학생 · ${esc(gradeLabel)}</div>
    <div>진단일: ${esc(diagnosedAt)}</div>
    <div>${statusBadge}</div>
  </div>
</div>

<div class="type-box">
  <div class="type-label">진단 유형</div>
  <div class="type-name">${esc(typeName)}</div>
  <div class="type-code">유형 코드: ${esc(typeCode)}</div>
  ${typeDesc ? `<div class="type-desc">${esc(typeDesc)}</div>` : ''}
</div>

<div class="section">
  <div class="sec-title">📊 유형별 점수</div>
  ${scoreRows || '<div style="font-size:11px;color:#9CA3AF;">점수 데이터가 없어요.</div>'}
</div>

<div class="section">
  <div class="sec-title">🎓 추천 학과</div>
  <div class="chips">${majorChips || '<span style="font-size:11px;color:#9CA3AF;">추천 학과 데이터가 없어요.</span>'}</div>
</div>

${selectionBlock}

<div class="footer">${esc(brand)} · ${esc(student.name)} 학생 진로 계열 검사 결과 리포트</div>
${detailPage}
<script>window.onload=()=>{window.print()}</script></body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
    else alert('팝업이 차단되었어요. 브라우저에서 팝업을 허용해주세요.')
  }

  return (
    <>
      {/* 상태 배지 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-[18px] font-extrabold text-ink">진로 계열 검사 진단 결과</span>
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
            conceptData.status === 'approved'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            {conceptData.status === 'approved' ? '✓ 승인 완료' : '⏳ 승인 대기'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* 🖨️ PDF 출력 버튼 */}
          <button
            onClick={printConcept}
            className="px-4 py-1.5 bg-white text-brand-middle-dark border border-brand-middle-light rounded-full text-[12px] font-semibold hover:bg-brand-middle-pale flex items-center gap-1.5 transition-all"
          >
            🖨️ PDF 출력
          </button>
          <div className="text-[12px] text-ink-muted">
            진단 완료: {conceptData.updated_at?.slice(0, 10)}
          </div>
        </div>
      </div>

      {/* 3열 그리드: 유형 결과 / 점수 차트 / 해설 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-5 max-lg:grid-cols-1">
        {/* 1열: 유형 결과 */}
        <div className="bg-gradient-to-br from-brand-middle-pale to-emerald-50 border-2 border-brand-middle-light rounded-2xl p-6">
          <div className="text-[11px] font-bold text-brand-middle-dark uppercase tracking-wider mb-4">진단 유형</div>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">{typeName.split(' ')[0]}</div>
            <div>
              <div className="text-[20px] font-extrabold text-brand-middle-dark">{typeName}</div>
              <div className="text-[12px] text-ink-secondary">유형 코드: {typeCode}</div>
            </div>
          </div>
          <div className="text-[13px] text-ink-secondary leading-relaxed mb-4">{typeDesc}</div>
          <div>
            <div className="text-[11px] font-bold text-ink-muted mb-2">추천 학과</div>
            <div className="flex flex-wrap gap-1.5">
              {recommendedMajors.slice(0, 6).map(m => (
                <span key={m} className="text-[11px] font-semibold px-2.5 py-0.5 bg-white text-brand-middle-dark rounded-full border border-brand-middle-light">{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* 2열: 점수 차트 */}
        <div className="bg-white border border-line rounded-2xl p-6">
          <div className="text-[13px] font-bold text-ink mb-4">📊 유형별 점수</div>
          <div className="flex flex-col gap-2">
            {topScores.map(([type, score], idx) => {
              const pct = Math.round((score / maxScore) * 100)
              return (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${idx === 0 ? 'bg-brand-middle text-white' : 'bg-gray-100 text-ink-muted'}`}>
                    {idx + 1}
                  </div>
                  <div className="w-20 text-[11px] font-semibold text-ink truncate flex-shrink-0">
                    {TYPE_NAMES[type] || type}
                  </div>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${idx === 0 ? 'bg-brand-middle' : 'bg-gray-300'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[11px] text-ink-muted w-7 text-right flex-shrink-0">{score}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 3열: 진단 유형 해설 카드 */}
        <TypeDetailCard
          typeCode={typeCode}
          onOpenDetail={() => setDetailOpen(true)}
        />
      </div>

      {/* 학생이 선택한 학과/목표 */}
      {conceptData.status === 'approved' && conceptData.major && (
        <div className="bg-white border border-line rounded-2xl p-6 mb-5">
          <div className="text-[13px] font-bold text-ink mb-4">🎯 학생이 선택한 진로 계열 검사</div>
          <div className="flex flex-col gap-3">
            {[
              { label: '선택 학과', value: conceptData.major },
              { label: '세부 목표', value: (conceptData.career || conceptData.custom_goal) ?? '-', highlight: true },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-ink-muted w-16 flex-shrink-0">{item.label}</span>
                <span className={`text-[13px] font-bold ${item.highlight ? 'text-brand-middle-dark' : 'text-ink'}`}>{item.value}</span>
              </div>
            ))}
            {(conceptData.keywords?.length ?? 0) > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-semibold text-ink-muted w-16 flex-shrink-0 mt-1">키워드</span>
                <div className="flex flex-wrap gap-1.5">
                  {conceptData.keywords?.map(kw => (
                    <span key={kw} className="text-[11px] font-semibold px-2.5 py-0.5 bg-brand-middle-pale text-brand-middle-dark rounded-full border border-brand-middle-light">{kw}</span>
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
              onClick={onApprove}
              disabled={approving}
              className="w-full py-3.5 bg-gradient-to-r from-brand-middle-dark to-brand-middle text-white rounded-xl text-[14px] font-bold hover:opacity-90 transition-all shadow-[0_4px_12px_rgba(16,185,129,0.25)] disabled:opacity-50"
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
              onClick={onRevoke}
              disabled={approving}
              className="px-4 py-2 border border-line rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              승인 취소
            </button>
          </div>
        )}
      </div>

      {/* 진단 유형 해설 상세 모달 */}
      <TypeDetailModal
        typeCode={typeCode}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </>
  )
}