// src/pages/admin/_pages/reports/Reports.tsx
// 어드민 사이드바 → 월간 보고서 (고등/중등 통합)
// 실제 DB 연동 버전 - 단일 파일

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ════════════════════════════════════════════════════════
// 📡 DB Hooks (같은 파일에 통합)
// ════════════════════════════════════════════════════════

interface AcademyStudentReport {
  student_id: string
  student_name: string
  student_grade: string
  student_school: string | null
  student_avatar_url: string | null
  teacher_id: string | null
  essay_count: number
  past_answer_count: number
  simulation_count: number
  interview_count: number
  passage_count: number
  reading_count: number
  lessons_progress_count: number
  homework_submission_count: number
  suhaeng_count: number
  major_answer_count: number
  research_count: number
  report_id: string | null
  is_published: boolean | null
  ai_comment_draft: string | null
  teacher_comment: string | null
  published_at: string | null
  report_updated_at: string | null
}

interface SaveReportInput {
  student_id: string
  academy_id: string
  grade_level: 'high' | 'middle'
  year_month: string
  ai_comment_draft?: string
  teacher_comment?: string
}

// 학원의 학생들 + 월간 데이터 + 발행 상태
function useAcademyMonthlySummary(
  academyId: string | null,
  gradeLevel: 'high' | 'middle',
  yearMonth: string
) {
  return useQuery({
    queryKey: ['academy-monthly-summary', academyId, gradeLevel, yearMonth],
    enabled: !!academyId,
    queryFn: async (): Promise<AcademyStudentReport[]> => {
      const { data, error } = await supabase.rpc('get_academy_monthly_summary', {
        p_academy_id: academyId,
        p_year_month: yearMonth,
        p_grade_level: gradeLevel,
      })
      if (error) throw error
      return (data as AcademyStudentReport[]) || []
    },
  })
}

// 보고서 저장 (임시 저장)
function useSaveReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveReportInput) => {
      const { data, error } = await supabase
        .from('parent_monthly_reports')
        .upsert(
          {
            student_id: input.student_id,
            academy_id: input.academy_id,
            grade_level: input.grade_level,
            year_month: input.year_month,
            ai_comment_draft: input.ai_comment_draft || null,
            teacher_comment: input.teacher_comment || null,
          },
          { onConflict: 'student_id,year_month' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-monthly-summary'] })
    },
  })
}

// 보고서 발행 (is_published = true)
function usePublishReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveReportInput) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('parent_monthly_reports')
        .upsert(
          {
            student_id: input.student_id,
            academy_id: input.academy_id,
            grade_level: input.grade_level,
            year_month: input.year_month,
            ai_comment_draft: input.ai_comment_draft || null,
            teacher_comment: input.teacher_comment || null,
            is_published: true,
            published_at: new Date().toISOString(),
            published_by: userData.user?.id || null,
          },
          { onConflict: 'student_id,year_month' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-monthly-summary'] })
    },
  })
}

// ════════════════════════════════════════════════════════
// 🎨 Reports 메인 컴포넌트
// ════════════════════════════════════════════════════════

type Grade = 'high' | 'middle'
type ReportStatus = 'published' | 'draft' | 'none'

// ========== 학년별 테마 ==========
const THEMES = {
  high: {
    accent: '#2563EB',
    accentDark: '#1E3A8A',
    accentBg: '#EFF6FF',
    accentBorder: '#93C5FD',
    accentShadow: 'rgba(37, 99, 235, 0.15)',
    gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
    label: '고등',
    icon: '🎓',
  },
  middle: {
    accent: '#10B981',
    accentDark: '#065F46',
    accentBg: '#ECFDF5',
    accentBorder: '#6EE7B7',
    accentShadow: 'rgba(16, 185, 129, 0.15)',
    gradient: 'linear-gradient(135deg, #065F46, #10B981)',
    label: '중등',
    icon: '📚',
  },
}

const CARDS_PER_PAGE = 12

// ========== 현재 사용자(원장/선생님) 프로필 hook ==========
function useCurrentProfile() {
  return useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, academy_id, grade, email')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return data
    },
  })
}

// ========== 가능한 월 리스트 (최근 6개월) ==========
function getRecentMonths(count = 6): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

// ========== 상태 계산 ==========
function getReportStatus(s: AcademyStudentReport): ReportStatus {
  if (s.is_published === true) return 'published'
  if (s.teacher_comment || s.ai_comment_draft) return 'draft'
  return 'none'
}

// ========== AI 코멘트 생성 (Edge Function 호출) ==========
async function generateAIComment(
  s: AcademyStudentReport,
  gradeLevel: Grade,
  yearMonth: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-monthly-report-comment', {
    body: {
      studentName: s.student_name,
      grade: s.student_grade,
      school: s.student_school,
      gradeLevel,
      yearMonth,
      activities: {
        essay_count: s.essay_count,
        past_answer_count: s.past_answer_count,
        simulation_count: s.simulation_count,
        interview_count: s.interview_count,
        passage_count: s.passage_count,
        reading_count: s.reading_count,
        lessons_progress_count: s.lessons_progress_count,
        homework_submission_count: s.homework_submission_count,
        suhaeng_count: s.suhaeng_count,
        major_answer_count: s.major_answer_count,
        research_count: s.research_count,
      },
    },
  })

  if (error) throw error
  if (!data?.comment) throw new Error('AI 코멘트가 비어있어요')
  return data.comment as string
}

// ========== 메인 ==========
export default function Reports() {
  const { data: profile, isLoading: profileLoading } = useCurrentProfile()

  const [grade, setGrade] = useState<Grade>('middle')
  const [selectedStudent, setSelectedStudent] = useState<AcademyStudentReport | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(() => getRecentMonths(1)[0])

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all')
  const [subGradeFilter, setSubGradeFilter] = useState<'all' | string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const [teacherComment, setTeacherComment] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)

  // 일괄 발행 state
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, name: '' })
  const [bulkIncludePublished, setBulkIncludePublished] = useState(false)

  const THEME = THEMES[grade]
  const months = useMemo(() => getRecentMonths(6), [])

  // ===== DB hooks =====
  const academyId = profile?.academy_id || null
  const { data: students = [], isLoading: studentsLoading, refetch } = useAcademyMonthlySummary(
    academyId,
    grade,
    selectedMonth
  )

  const publishMutation = usePublishReport()
  const saveMutation = useSaveReport()

  // ===== 화면 전환 시 초기화 =====
  useEffect(() => {
    setSelectedStudent(null)
    setSearchQuery('')
    setStatusFilter('all')
    setSubGradeFilter('all')
    setCurrentPage(1)
  }, [grade, selectedMonth])

  useEffect(() => {
    if (selectedStudent) {
      setTeacherComment(selectedStudent.teacher_comment || '')
    } else {
      setTeacherComment('')
    }
  }, [selectedStudent])

  // ===== 필터링 =====
  const subGrades = grade === 'high' ? ['고1', '고2', '고3'] : ['중1', '중2', '중3']

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !searchQuery.trim() || s.student_name.includes(searchQuery.trim())
      const matchStatus = statusFilter === 'all' || getReportStatus(s) === statusFilter
      const matchGrade = subGradeFilter === 'all' || s.student_grade === subGradeFilter
      return matchSearch && matchStatus && matchGrade
    })
  }, [students, searchQuery, statusFilter, subGradeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / CARDS_PER_PAGE))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE
    return filteredStudents.slice(start, start + CARDS_PER_PAGE)
  }, [filteredStudents, currentPage])

  useEffect(() => { setCurrentPage(1) }, [searchQuery, statusFilter, subGradeFilter])

  // ===== 통계 =====
  const stats = useMemo(() => {
    const total = students.length
    const published = students.filter(s => s.is_published).length
    const draft = students.filter(s => !s.is_published && (s.teacher_comment || s.ai_comment_draft)).length
    const none = total - published - draft
    return { total, published, draft, none }
  }, [students])

  const bulkTargetCount = useMemo(() => {
    return students.filter(s => bulkIncludePublished ? true : !s.is_published).length
  }, [students, bulkIncludePublished])

  // ===== AI 코멘트 (개별) =====
  const handleGenerateAI = async () => {
    if (!selectedStudent) return
    setAiGenerating(true)
    try {
      const comment = await generateAIComment(selectedStudent, grade, selectedMonth)
      setTeacherComment(comment)
    } catch (e: any) {
      alert(`AI 코멘트 생성 실패: ${e.message}`)
    } finally {
      setAiGenerating(false)
    }
  }

  // ===== 발행 =====
  const handlePublish = async () => {
    if (!teacherComment.trim()) {
      alert('선생님 코멘트를 작성하거나 AI 초안을 생성해주세요!')
      return
    }
    if (!selectedStudent || !academyId) return

    try {
      await publishMutation.mutateAsync({
        student_id: selectedStudent.student_id,
        academy_id: academyId,
        grade_level: grade,
        year_month: selectedMonth,
        teacher_comment: teacherComment,
        ai_comment_draft: selectedStudent.ai_comment_draft || undefined,
      })
      alert('✅ 보고서가 발행됐어요!')
      setSelectedStudent(null)
    } catch (e: any) {
      alert(`발행 실패: ${e.message}`)
    }
  }

  const handleSaveDraft = async () => {
    if (!selectedStudent || !academyId) return
    try {
      await saveMutation.mutateAsync({
        student_id: selectedStudent.student_id,
        academy_id: academyId,
        grade_level: grade,
        year_month: selectedMonth,
        teacher_comment: teacherComment,
      })
      alert('💾 임시 저장됐어요!')
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`)
    }
  }

  const handleDownloadPDF = () => {
    alert('📄 PDF 다운로드는 다음 단계에서 연결할 예정이에요')
  }

  // ===== 일괄 발행 =====
  const handleBulkPublish = async () => {
    if (!academyId) return
    setBulkConfirmOpen(false)
    setBulkRunning(true)

    const targets = students.filter(s => bulkIncludePublished ? true : !s.is_published)
    setBulkProgress({ current: 0, total: targets.length, name: '' })

    try {
      // 한 명씩 진행 표시 위해 순차 처리
      for (let i = 0; i < targets.length; i++) {
        const s = targets[i]
        setBulkProgress({ current: i, total: targets.length, name: s.student_name })

        // 진짜 AI 코멘트 생성 (Edge Function)
        let aiComment: string
        try {
          aiComment = await generateAIComment(s, grade, selectedMonth)
        } catch (e: any) {
          console.warn(`AI 코멘트 생성 실패 (${s.student_name}):`, e.message)
          // AI 실패해도 발행은 계속 - 빈 코멘트로
          aiComment = `${s.student_name} 학생의 ${selectedMonth} 월간 보고서입니다. (AI 코멘트 생성 실패 - 직접 작성 필요)`
        }

        await publishMutation.mutateAsync({
          student_id: s.student_id,
          academy_id: academyId,
          grade_level: grade,
          year_month: selectedMonth,
          ai_comment_draft: aiComment,
          teacher_comment: s.teacher_comment || aiComment,
        })
      }

      setBulkProgress({ current: targets.length, total: targets.length, name: '' })
      await new Promise(r => setTimeout(r, 400))
      setBulkRunning(false)
      alert(`✅ ${targets.length}명의 보고서가 일괄 발행됐어요!`)
      refetch()
    } catch (e: any) {
      setBulkRunning(false)
      alert(`일괄 발행 중 에러: ${e.message}`)
    }
  }

  // ========== 로딩 ==========
  if (profileLoading) {
    return (
      <div className="px-8 py-7 min-h-full flex items-center justify-center">
        <div className="text-[13px] text-ink-secondary">사용자 정보를 불러오는 중...</div>
      </div>
    )
  }

  if (!academyId) {
    return (
      <div className="px-8 py-7 min-h-full">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-[14px] font-bold text-amber-900 mb-1">학원 정보가 없어요</div>
          <div className="text-[12px] text-amber-700">관리자에게 문의해주세요.</div>
        </div>
      </div>
    )
  }

  // ========== 편집 화면 ==========
  if (selectedStudent) {
    return (
      <ReportEditView
        student={selectedStudent}
        month={selectedMonth}
        theme={THEME}
        gradeLevel={grade}
        teacherComment={teacherComment}
        setTeacherComment={setTeacherComment}
        aiGenerating={aiGenerating}
        publishing={publishMutation.isPending}
        saving={saveMutation.isPending}
        onBack={() => setSelectedStudent(null)}
        onGenerateAI={handleGenerateAI}
        onPublish={handlePublish}
        onSaveDraft={handleSaveDraft}
        onDownloadPDF={handleDownloadPDF}
      />
    )
  }

  // ========== 학생 목록 화면 ==========
  return (
    <div className="px-8 py-7 min-h-full">
      {/* 헤더 */}
      <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📊</span>
            <div className="text-[22px] font-extrabold text-ink tracking-tight">월간 보고서</div>
          </div>
          <div className="text-[13px] font-medium text-ink-secondary">
            학생별 월간 학습 보고서를 생성하고 부모님께 전달해요.
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* 학년 토글 */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">학년</span>
            <div className="inline-flex p-1 rounded-full border" style={{ background: '#F1F5F9', borderColor: '#E2E8F0' }}>
              {(['high', 'middle'] as Grade[]).map(g => {
                const t = THEMES[g]
                const active = grade === g
                return (
                  <button key={g} onClick={() => setGrade(g)}
                    className="px-4 py-1.5 text-[12px] font-bold rounded-full transition-all flex items-center gap-1.5"
                    style={{
                      background: active ? '#fff' : 'transparent',
                      color: active ? t.accentDark : '#64748B',
                      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    }}>
                    <span>{t.icon}</span> {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 월 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">월</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3.5 py-2 border-2 rounded-lg text-[13px] font-bold focus:outline-none cursor-pointer bg-white transition-all"
              style={{ borderColor: THEME.accentBorder, color: THEME.accentDark }}
            >
              {months.map(m => (
                <option key={m} value={m}>
                  {m.split('-')[0]}년 {parseInt(m.split('-')[1])}월
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 🚀 일괄 발행 큰 배너 */}
      <div className="mb-5 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3"
        style={{ background: THEME.gradient, boxShadow: `0 8px 24px ${THEME.accentShadow}` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl border border-white/30">
            🚀
          </div>
          <div>
            <div className="text-[16px] font-extrabold mb-0.5" style={{ color: '#fff' }}>월말 일괄 발행</div>
            <div className="text-[12px] font-medium" style={{ color: '#fff', opacity: 0.85 }}>
              {stats.total - stats.published}명 미발행 학생의 AI 코멘트를 자동 생성하고 한 번에 발행해요.
              <span className="ml-1 font-bold" style={{ color: '#fff' }}>필요한 학생만 나중에 수정 가능!</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setBulkConfirmOpen(true)}
          disabled={stats.total === 0 || studentsLoading}
          className="px-6 py-3 bg-white text-[13px] font-extrabold rounded-xl transition-all hover:-translate-y-px shadow-lg disabled:opacity-50"
          style={{ color: THEME.accentDark }}
        >
          🚀 이번 달 일괄 발행 →
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 max-md:grid-cols-2 gap-3 mb-5">
        <div className="bg-white border-2 rounded-2xl px-5 py-4" style={{ borderColor: THEME.accentBorder }}>
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">
            {THEME.icon} {THEME.label} 학생
          </div>
          <div className="text-[26px] font-extrabold" style={{ color: THEME.accentDark }}>{stats.total}명</div>
        </div>
        <div className="bg-white border border-line rounded-2xl px-5 py-4">
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">✓ 발행 완료</div>
          <div className="text-[26px] font-extrabold" style={{ color: THEME.accent }}>{stats.published}명</div>
        </div>
        <div className="bg-white border border-line rounded-2xl px-5 py-4">
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">📝 작성 중</div>
          <div className="text-[26px] font-extrabold text-amber-600">{stats.draft}명</div>
        </div>
        <div className="bg-white border border-line rounded-2xl px-5 py-4">
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">⏳ 미작성</div>
          <div className="text-[26px] font-extrabold text-ink-secondary">{stats.none}명</div>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div className="bg-white border border-line rounded-2xl px-4 py-3 mb-4 flex items-center gap-2 flex-wrap shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="relative flex-1 max-w-[300px]">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="학생 이름 검색..."
            className="w-full pl-10 pr-4 py-2 border border-line rounded-full text-[13px] font-medium focus:outline-none transition-all bg-white"
          />
        </div>

        <select
          value={subGradeFilter}
          onChange={e => setSubGradeFilter(e.target.value)}
          className="px-3.5 py-2 border border-line rounded-full text-[12px] font-bold text-ink-secondary focus:outline-none cursor-pointer bg-white"
        >
          <option value="all">전체 학년</option>
          {subGrades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3.5 py-2 border border-line rounded-full text-[12px] font-bold text-ink-secondary focus:outline-none cursor-pointer bg-white"
        >
          <option value="all">전체 상태</option>
          <option value="published">✓ 발행 완료</option>
          <option value="draft">📝 작성 중</option>
          <option value="none">⏳ 미작성</option>
        </select>

        <div className="ml-auto text-[12px] font-bold text-ink-secondary">
          {filteredStudents.length}명 표시 중
        </div>
      </div>

      {/* 학생 카드 */}
      {studentsLoading ? (
        <div className="bg-white border border-line rounded-2xl px-10 py-16 text-center">
          <div className="inline-block w-6 h-6 border-2 border-gray-200 rounded-full animate-spin mb-3" style={{ borderTopColor: THEME.accent }} />
          <div className="text-[13px] font-medium text-ink-secondary">학생 데이터를 불러오는 중...</div>
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl px-10 py-16 text-center">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-[13px] font-medium text-ink-secondary">
            {students.length === 0 ? `${THEME.label} 학생이 없어요` : '검색 결과가 없어요'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 gap-3 mb-5">
            {paginated.map(student => (
              <StudentCard
                key={student.student_id}
                student={student}
                gradeLevel={grade}
                theme={THEME}
                onClick={() => setSelectedStudent(student)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-line bg-white text-[11px] font-bold text-ink-secondary transition-all disabled:opacity-40">
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setCurrentPage(n)}
                  className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-[12px] font-bold transition-all ${currentPage === n ? 'text-white' : 'border border-line bg-white text-ink-secondary'}`}
                  style={currentPage === n ? { background: THEME.gradient } : undefined}>
                  {n}
                </button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-line bg-white text-[11px] font-bold text-ink-secondary transition-all disabled:opacity-40">
                ›
              </button>
            </div>
          )}
        </>
      )}

      {/* ============ 일괄 발행 확인 모달 ============ */}
      {bulkConfirmOpen && (
        <div onClick={() => setBulkConfirmOpen(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[480px] max-w-full shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="px-6 py-5" style={{ background: THEME.gradient }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl border border-white/30">
                  🚀
                </div>
                <div>
                  <div className="text-[16px] font-extrabold" style={{ color: '#fff' }}>월말 일괄 발행</div>
                  <div className="text-[11px] font-medium" style={{ color: '#fff', opacity: 0.9 }}>
                    {selectedMonth.split('-')[0]}년 {parseInt(selectedMonth.split('-')[1])}월 · {THEME.label}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <div className="text-[12px] font-bold text-amber-900 mb-2">📋 작업 내용</div>
                <div className="text-[11px] text-amber-800 leading-[1.8]">
                  · 학생 활동 데이터를 자동 수집해서 AI 코멘트 생성<br />
                  · 보고서를 DB에 저장하고 발행 완료<br />
                  · 발행 후 필요한 학생은 개별로 수정 가능<br />
                  · 학생당 약 1초 소요
                </div>
              </div>

              <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-ink-secondary">발행 대상</span>
                  <span className="text-[20px] font-extrabold" style={{ color: THEME.accentDark }}>
                    {bulkTargetCount}명
                  </span>
                </div>
                <div className="text-[10px] text-ink-muted mt-1">
                  {bulkIncludePublished
                    ? `전체 ${stats.total}명 (이미 발행된 학생도 다시 발행)`
                    : `미발행 ${stats.none + stats.draft}명 (${stats.published}명은 이미 발행)`
                  }
                </div>
              </div>

              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkIncludePublished}
                  onChange={e => setBulkIncludePublished(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: THEME.accent }}
                />
                <span className="text-[12px] text-ink-secondary font-medium">
                  ✓ 이미 발행된 학생도 다시 발행 (덮어쓰기)
                </span>
              </label>

              <div className="flex gap-2">
                <button onClick={() => setBulkConfirmOpen(false)}
                  className="flex-1 py-3 bg-gray-100 text-ink-secondary rounded-xl text-[13px] font-bold hover:bg-gray-200 transition-all">
                  취소
                </button>
                <button onClick={handleBulkPublish} disabled={bulkTargetCount === 0}
                  className="flex-1 py-3 text-white rounded-xl text-[13px] font-extrabold transition-all hover:-translate-y-px disabled:opacity-50"
                  style={{ background: THEME.gradient }}>
                  🚀 {bulkTargetCount}명 발행하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ 일괄 발행 진행 모달 ============ */}
      {bulkRunning && (
        <div className="fixed inset-0 z-[201] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl w-[460px] max-w-full shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-8 text-center">
            <div className="text-5xl mb-4">🚀</div>
            <div className="text-[18px] font-extrabold mb-1" style={{ color: THEME.accentDark }}>
              일괄 발행 중...
            </div>
            <div className="text-[12px] text-ink-secondary mb-6">
              학생 한 명씩 AI 코멘트 생성 + 보고서 발행 중이에요. 잠시만 기다려주세요.
            </div>

            <div className="mb-2">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%`,
                    background: THEME.gradient
                  }}
                />
              </div>
            </div>

            <div className="text-[14px] font-extrabold mb-1" style={{ color: THEME.accentDark }}>
              {bulkProgress.current} / {bulkProgress.total}명
            </div>
            <div className="text-[11px] text-ink-secondary h-4">
              {bulkProgress.name && <>현재: <strong className="text-ink">{bulkProgress.name}</strong> 학생 처리 중</>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ========== 학생 카드 ==========
function StudentCard({ student, gradeLevel, theme, onClick }: {
  student: AcademyStudentReport
  gradeLevel: Grade
  theme: typeof THEMES.high
  onClick: () => void
}) {
  const status = getReportStatus(student)
  const statusConfig = {
    published: { label: '✓ 발행 완료', bg: '#ECFDF5', color: '#065F46', border: '#6EE7B7' },
    draft: { label: '📝 작성 중', bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
    none: { label: '⏳ 미작성', bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' },
  }
  const sc = statusConfig[status]

  return (
    <button
      onClick={onClick}
      className="text-left bg-white border-2 rounded-2xl px-5 py-4 transition-all hover:-translate-y-1 group"
      style={{ borderColor: '#E5E7EB' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = theme.accentBorder
        e.currentTarget.style.boxShadow = `0 8px 24px ${theme.accentShadow}`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#E5E7EB'
        e.currentTarget.style.boxShadow = ''
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="h-1 rounded-full" style={{ background: theme.gradient, width: 40 }} />
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
          style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
          {sc.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="text-[16px] font-extrabold text-ink mb-0.5">{student.student_name}</div>
        <div className="text-[11px] font-bold text-ink-muted">
          {student.student_grade}{student.student_school ? ` · ${student.student_school}` : ''}
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-ink-muted">자소서</span>
          <span className="text-[12px] font-extrabold" style={{ color: theme.accent }}>{student.essay_count}건</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-ink-muted">면접 시뮬</span>
          <span className="text-[12px] font-bold text-ink-secondary">{student.simulation_count}회</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-ink-muted">기출 답변</span>
          <span className="text-[12px] font-bold text-ink-secondary">{student.past_answer_count}건</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-ink-muted">독서</span>
          <span className="text-[12px] font-bold text-ink-secondary">{student.reading_count}건</span>
        </div>
        {gradeLevel === 'middle' && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-muted">숙제</span>
            <span className="text-[12px] font-bold text-ink-secondary">{student.homework_submission_count}건</span>
          </div>
        )}
        {gradeLevel === 'high' && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-muted">전공질문</span>
            <span className="text-[12px] font-bold text-ink-secondary">{student.major_answer_count}건</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-line-light">
        <div className="text-[10px] text-ink-muted">
          {student.published_at ? `발행 ${student.published_at.slice(5, 10)}` : '미발행'}
        </div>
        <span className="text-[11px] font-bold transition-all group-hover:translate-x-0.5" style={{ color: theme.accent }}>
          {status === 'published' ? '수정 →' : '작성 →'}
        </span>
      </div>
    </button>
  )
}

// ========== 보고서 편집 화면 ==========
function ReportEditView({
  student, month, theme, gradeLevel,
  teacherComment, setTeacherComment, aiGenerating, publishing, saving,
  onBack, onGenerateAI, onPublish, onSaveDraft, onDownloadPDF,
}: {
  student: AcademyStudentReport
  month: string
  theme: typeof THEMES.high
  gradeLevel: Grade
  teacherComment: string
  setTeacherComment: (v: string) => void
  aiGenerating: boolean
  publishing: boolean
  saving: boolean
  onBack: () => void
  onGenerateAI: () => void
  onPublish: () => void
  onSaveDraft: () => void
  onDownloadPDF: () => void
}) {
  const monthLabel = `${month.split('-')[0]}년 ${parseInt(month.split('-')[1])}월`

  return (
    <div className="px-8 py-7 min-h-full">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-line text-[12px] font-bold rounded-full text-ink-secondary hover:bg-gray-50 transition-all">
            ← 학생 목록
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{theme.icon}</span>
            <div>
              <div className="text-[18px] font-extrabold tracking-tight" style={{ color: theme.accentDark }}>
                {student.student_name} 학생
              </div>
              <div className="text-[11px] font-medium text-ink-secondary">
                {student.student_grade}{student.student_school ? ` · ${student.student_school}` : ''} · {monthLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onSaveDraft} disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-line text-ink-secondary text-[12px] font-bold rounded-full transition-all hover:bg-gray-50 disabled:opacity-50">
            {saving ? '저장 중...' : '💾 임시저장'}
          </button>
          <button onClick={onDownloadPDF}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border-2 text-[12px] font-bold rounded-full transition-all hover:-translate-y-px"
            style={{ borderColor: theme.accentBorder, color: theme.accentDark }}>
            📄 PDF
          </button>
          <button onClick={onPublish} disabled={publishing}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px disabled:opacity-50"
            style={{ background: theme.gradient, boxShadow: `0 4px 12px ${theme.accentShadow}` }}>
            {publishing ? '발행 중...' : student.is_published ? '✓ 재발행' : '✓ 발행하기'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_360px] max-lg:grid-cols-1 gap-4">

        <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="px-5 py-3 border-b border-line-light flex items-center justify-between bg-gray-50">
            <div className="text-[13px] font-extrabold text-ink">📄 보고서 미리보기</div>
            <div className="text-[11px] font-medium text-ink-muted">부모님께 전달될 화면</div>
          </div>

          <div className="p-8" style={{ background: theme.gradient, color: '#fff' }}>
            <div className="text-[11px] font-bold mb-2 tracking-wider" style={{ color: '#fff', opacity: 0.85 }}>
              {monthLabel} 월간 학습 보고서
            </div>
            <h1 className="text-[28px] font-extrabold mb-1" style={{ color: '#fff' }}>{student.student_name} 학생</h1>
            <div className="text-[13px]" style={{ color: '#fff', opacity: 0.95 }}>{student.student_grade}</div>

            <div className="grid grid-cols-4 gap-2 mt-5">
              {[
                { num: student.essay_count, label: '자소서' },
                { num: student.simulation_count, label: '면접 시뮬' },
                { num: student.past_answer_count, label: '기출 답변' },
                { num: student.reading_count, label: '독서' },
              ].map((s, i) => (
                <div key={i} className="rounded-xl px-3 py-3 text-center backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <div className="text-[22px] font-extrabold leading-none mb-1" style={{ color: '#fff' }}>{s.num}</div>
                  <div className="text-[10px] font-medium" style={{ color: '#fff', opacity: 0.9 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <ReportSection icon="📝" title="자기소개서 작성" meta={`${student.essay_count}건`} show={student.essay_count > 0} theme={theme} />
            <ReportSection icon="🎓" title="기출문제 답변" meta={`${student.past_answer_count}건`} show={student.past_answer_count > 0} theme={theme} />
            <ReportSection icon="🎙️" title="AI 면접 시뮬레이션" meta={`${student.simulation_count}회`} show={student.simulation_count > 0} theme={theme} />
            <ReportSection icon="🎤" title="면접" meta={`${student.interview_count}회`} show={student.interview_count > 0} theme={theme} />
            <ReportSection icon="📜" title="제시문 면접" meta={`${student.passage_count}회`} show={student.passage_count > 0} theme={theme} />
            <ReportSection icon="📚" title="독서 활동" meta={`${student.reading_count}건`} show={student.reading_count > 0} theme={theme} />
            {gradeLevel === 'middle' && (
              <>
                <ReportSection icon="🎬" title="수업 영상 시청" meta={`${student.lessons_progress_count}건`} show={student.lessons_progress_count > 0} theme={theme} />
                <ReportSection icon="📒" title="숙제 제출" meta={`${student.homework_submission_count}건`} show={student.homework_submission_count > 0} theme={theme} />
              </>
            )}
            {gradeLevel === 'high' && (
              <>
                <ReportSection icon="🎯" title="전공 질문 답변" meta={`${student.major_answer_count}건`} show={student.major_answer_count > 0} theme={theme} />
                <ReportSection icon="🔬" title="탐구 활동" meta={`${student.research_count}건`} show={student.research_count > 0} theme={theme} />
              </>
            )}
            <ReportSection icon="📝" title="수행평가" meta={`${student.suhaeng_count}건`} show={student.suhaeng_count > 0} theme={theme} />

            <div className="rounded-2xl p-5 border" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">💬</span>
                <span className="text-[13px] font-extrabold" style={{ color: '#92400E' }}>담임 선생님 종합 코멘트</span>
              </div>
              <div className="text-[12px] leading-[1.8] whitespace-pre-wrap" style={{ color: '#78350F' }}>
                {teacherComment || <span className="italic opacity-60">아직 작성되지 않았어요. 우측에서 입력하거나 AI 초안을 생성해주세요.</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="bg-white border-2 rounded-2xl p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]" style={{ borderColor: theme.accentBorder }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✨</span>
              <div className="text-[13px] font-extrabold" style={{ color: theme.accentDark }}>AI 코멘트 초안</div>
            </div>
            <div className="text-[11px] text-ink-secondary mb-3 leading-[1.6]">
              학생의 {monthLabel} 데이터를 분석해서 코멘트 초안을 만들어드려요.
            </div>
            <button onClick={onGenerateAI} disabled={aiGenerating}
              className="w-full py-2.5 text-white text-[12px] font-bold rounded-lg transition-all hover:-translate-y-px disabled:opacity-50"
              style={{ background: theme.gradient, boxShadow: `0 4px 12px ${theme.accentShadow}` }}>
              {aiGenerating ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI가 작성 중...
                </span>
              ) : (
                <>✨ AI 초안 생성하기</>
              )}
            </button>
          </div>

          <div className="bg-white border border-line rounded-2xl p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[13px] font-extrabold text-ink">📝 선생님 코멘트</div>
              {teacherComment && (
                <button onClick={() => setTeacherComment('')}
                  className="text-[10px] font-bold text-ink-muted hover:text-red-500 underline">
                  지우기
                </button>
              )}
            </div>
            <div className="text-[10px] text-ink-secondary mb-2">
              AI 초안을 수정하거나 직접 작성하세요. {teacherComment.length}자
            </div>
            <textarea
              value={teacherComment}
              onChange={e => setTeacherComment(e.target.value)}
              placeholder="학생에 대한 종합 코멘트를 작성하세요..."
              rows={14}
              className="w-full border border-line rounded-lg px-3 py-2.5 text-[12.5px] outline-none resize-y leading-relaxed font-sans"
            />
          </div>

          <div className="bg-white border border-line rounded-2xl p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="text-[12px] font-extrabold text-ink-muted uppercase tracking-wider mb-3">
              📊 자동 수집된 데이터
            </div>
            <div className="space-y-1.5">
              {[
                ['자소서', `${student.essay_count}건`],
                ['기출 답변', `${student.past_answer_count}건`],
                ['면접 시뮬', `${student.simulation_count}회`],
                ['면접', `${student.interview_count}회`],
                ['제시문', `${student.passage_count}회`],
                ['독서', `${student.reading_count}건`],
                ...(gradeLevel === 'middle' ? [
                  ['수업 영상', `${student.lessons_progress_count}건`],
                  ['숙제', `${student.homework_submission_count}건`],
                ] : []),
                ...(gradeLevel === 'high' ? [
                  ['전공 답변', `${student.major_answer_count}건`],
                  ['탐구', `${student.research_count}건`],
                ] : []),
                ['수행평가', `${student.suhaeng_count}건`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-muted font-medium">{k}</span>
                  <span className="font-bold text-ink">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportSection({ icon, title, meta, show, theme }: {
  icon: string
  title: string
  meta?: string
  show: boolean
  theme: typeof THEMES.high
}) {
  if (!show) return null
  return (
    <div className="pl-4 py-1" style={{ borderLeft: `3px solid ${theme.accentBorder}` }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{icon}</span>
        <span className="text-[13px] font-extrabold" style={{ color: theme.accentDark }}>{title}</span>
        {meta && <span className="text-[10px] font-bold ml-auto px-2 py-0.5 rounded-full" style={{ background: theme.accentBg, color: theme.accent }}>{meta}</span>}
      </div>
    </div>
  )
}