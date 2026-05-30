// src/pages/admin/_pages/reports/Reports.tsx
// 어드민 사이드바 → 월간 보고서 (고등/중등 통합)
// 🚀 월말 일괄 발행 기능 추가

import { useState, useMemo, useEffect } from 'react'

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
const MOCK_MONTHS = ['2026-06', '2026-05', '2026-04', '2026-03']

// ========== 가짜 데이터 ==========
interface MockStudent {
  id: string
  name: string
  grade: '고1' | '고2' | '고3' | '중1' | '중2' | '중3'
  gradeLevel: Grade
  attendance: number
  homeworkSubmitted: number
  homeworkTotal: number
  simulationCount: number
  simulationAvgScore: number
  essayCount: number
  pastAnswerCount: number
  bookCount: number
  videoWatched: number
  videoTotal: number
  reportStatus: ReportStatus
  publishedAt?: string
  lastActivity: string
}

const INITIAL_STUDENTS: MockStudent[] = [
  { id: 'm1', name: '김민지', grade: '중2', gradeLevel: 'middle', attendance: 92, homeworkSubmitted: 8, homeworkTotal: 8, simulationCount: 5, simulationAvgScore: 82, essayCount: 3, pastAnswerCount: 5, bookCount: 3, videoWatched: 12, videoTotal: 15, reportStatus: 'draft', lastActivity: '2026-06-30' },
  { id: 'm2', name: '박서연', grade: '중1', gradeLevel: 'middle', attendance: 88, homeworkSubmitted: 6, homeworkTotal: 8, simulationCount: 3, simulationAvgScore: 75, essayCount: 1, pastAnswerCount: 2, bookCount: 2, videoWatched: 10, videoTotal: 15, reportStatus: 'published', publishedAt: '2026-07-01', lastActivity: '2026-06-28' },
  { id: 'm3', name: '이지훈', grade: '중3', gradeLevel: 'middle', attendance: 95, homeworkSubmitted: 8, homeworkTotal: 8, simulationCount: 8, simulationAvgScore: 87, essayCount: 5, pastAnswerCount: 12, bookCount: 4, videoWatched: 15, videoTotal: 15, reportStatus: 'draft', lastActivity: '2026-06-30' },
  { id: 'm4', name: '정유나', grade: '중2', gradeLevel: 'middle', attendance: 78, homeworkSubmitted: 4, homeworkTotal: 8, simulationCount: 1, simulationAvgScore: 65, essayCount: 0, pastAnswerCount: 1, bookCount: 1, videoWatched: 5, videoTotal: 15, reportStatus: 'none', lastActivity: '2026-06-20' },
  { id: 'm5', name: '최예린', grade: '중1', gradeLevel: 'middle', attendance: 90, homeworkSubmitted: 7, homeworkTotal: 8, simulationCount: 4, simulationAvgScore: 78, essayCount: 2, pastAnswerCount: 3, bookCount: 2, videoWatched: 11, videoTotal: 15, reportStatus: 'published', publishedAt: '2026-07-01', lastActivity: '2026-06-29' },
  { id: 'm6', name: '강도현', grade: '중3', gradeLevel: 'middle', attendance: 96, homeworkSubmitted: 8, homeworkTotal: 8, simulationCount: 7, simulationAvgScore: 85, essayCount: 4, pastAnswerCount: 10, bookCount: 5, videoWatched: 14, videoTotal: 15, reportStatus: 'published', publishedAt: '2026-07-01', lastActivity: '2026-06-30' },
  { id: 'm7', name: '윤하늘', grade: '중2', gradeLevel: 'middle', attendance: 82, homeworkSubmitted: 6, homeworkTotal: 8, simulationCount: 3, simulationAvgScore: 72, essayCount: 2, pastAnswerCount: 4, bookCount: 2, videoWatched: 9, videoTotal: 15, reportStatus: 'draft', lastActivity: '2026-06-27' },
  { id: 'm8', name: '조민서', grade: '중1', gradeLevel: 'middle', attendance: 85, homeworkSubmitted: 7, homeworkTotal: 8, simulationCount: 4, simulationAvgScore: 76, essayCount: 1, pastAnswerCount: 2, bookCount: 3, videoWatched: 12, videoTotal: 15, reportStatus: 'none', lastActivity: '2026-06-25' },

  { id: 'h1', name: '한지원', grade: '고2', gradeLevel: 'high', attendance: 94, homeworkSubmitted: 10, homeworkTotal: 10, simulationCount: 6, simulationAvgScore: 84, essayCount: 4, pastAnswerCount: 18, bookCount: 4, videoWatched: 18, videoTotal: 20, reportStatus: 'draft', lastActivity: '2026-06-30' },
  { id: 'h2', name: '오세현', grade: '고3', gradeLevel: 'high', attendance: 98, homeworkSubmitted: 10, homeworkTotal: 10, simulationCount: 12, simulationAvgScore: 91, essayCount: 8, pastAnswerCount: 35, bookCount: 6, videoWatched: 20, videoTotal: 20, reportStatus: 'published', publishedAt: '2026-07-01', lastActivity: '2026-06-30' },
  { id: 'h3', name: '서민준', grade: '고1', gradeLevel: 'high', attendance: 86, homeworkSubmitted: 8, homeworkTotal: 10, simulationCount: 4, simulationAvgScore: 77, essayCount: 2, pastAnswerCount: 8, bookCount: 3, videoWatched: 15, videoTotal: 20, reportStatus: 'none', lastActivity: '2026-06-26' },
  { id: 'h4', name: '임소영', grade: '고3', gradeLevel: 'high', attendance: 97, homeworkSubmitted: 10, homeworkTotal: 10, simulationCount: 10, simulationAvgScore: 89, essayCount: 7, pastAnswerCount: 28, bookCount: 5, videoWatched: 20, videoTotal: 20, reportStatus: 'published', publishedAt: '2026-07-01', lastActivity: '2026-06-30' },
  { id: 'h5', name: '권지안', grade: '고2', gradeLevel: 'high', attendance: 89, homeworkSubmitted: 9, homeworkTotal: 10, simulationCount: 5, simulationAvgScore: 80, essayCount: 3, pastAnswerCount: 14, bookCount: 3, videoWatched: 17, videoTotal: 20, reportStatus: 'draft', lastActivity: '2026-06-29' },
  { id: 'h6', name: '백시현', grade: '고1', gradeLevel: 'high', attendance: 91, homeworkSubmitted: 9, homeworkTotal: 10, simulationCount: 5, simulationAvgScore: 81, essayCount: 2, pastAnswerCount: 10, bookCount: 4, videoWatched: 16, videoTotal: 20, reportStatus: 'published', publishedAt: '2026-07-01', lastActivity: '2026-06-30' },
  { id: 'h7', name: '문채영', grade: '고3', gradeLevel: 'high', attendance: 95, homeworkSubmitted: 10, homeworkTotal: 10, simulationCount: 9, simulationAvgScore: 86, essayCount: 6, pastAnswerCount: 22, bookCount: 5, videoWatched: 19, videoTotal: 20, reportStatus: 'draft', lastActivity: '2026-06-30' },
  { id: 'h8', name: '장은우', grade: '고2', gradeLevel: 'high', attendance: 83, homeworkSubmitted: 7, homeworkTotal: 10, simulationCount: 3, simulationAvgScore: 73, essayCount: 1, pastAnswerCount: 6, bookCount: 2, videoWatched: 14, videoTotal: 20, reportStatus: 'none', lastActivity: '2026-06-24' },
]

const MOCK_AI_COMMENT_TEMPLATE = (s: MockStudent) => `${s.name}는 6월 들어 ${s.essayCount > 2 ? '자기소개서 작성에 본격적으로 들어갔어요' : '학습 기초를 다지는 데 집중했어요'}. ${s.essayCount > 0 ? `자소서 ${s.essayCount}건을 작성하면서 글의 구체성이 많이 향상되었습니다.` : ''}

${s.simulationCount > 0 ? `면접 시뮬레이션 ${s.simulationCount}회 진행하면서 평균 ${s.simulationAvgScore}점을 기록했고, 자신감이 많이 붙은 모습이 보였습니다.` : ''}

${s.bookCount > 0 ? `독서 활동도 꾸준히 ${s.bookCount}권을 완독했고, 책 내용을 ${s.gradeLevel === 'high' ? '논술' : '면접'} 답변에 잘 활용하고 있습니다.` : ''}

7월 학습 방향: ${s.gradeLevel === 'high' ? '자기소개서 마무리 작업과 면접 대비를 본격화할 예정입니다.' : '자기소개서 다음 문항 작성에 집중하면서, 제시문 면접을 차근차근 익혀나갈 예정입니다.'}`


// ========== 메인 ==========
export default function Reports() {
  const [students, setStudents] = useState<MockStudent[]>(INITIAL_STUDENTS)

  const [grade, setGrade] = useState<Grade>('middle')
  const [selectedStudent, setSelectedStudent] = useState<MockStudent | null>(null)
  const [selectedMonth, setSelectedMonth] = useState('2026-06')

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all')
  const [subGradeFilter, setSubGradeFilter] = useState<'all' | string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const [teacherComment, setTeacherComment] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // 🚀 일괄 발행 state
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, name: '' })
  const [bulkIncludePublished, setBulkIncludePublished] = useState(false)

  const THEME = THEMES[grade]

  useEffect(() => {
    setSelectedStudent(null)
    setSearchQuery('')
    setStatusFilter('all')
    setSubGradeFilter('all')
    setCurrentPage(1)
  }, [grade])

  useEffect(() => {
    setTeacherComment('')
  }, [selectedStudent])

  const studentsInGrade = useMemo(
    () => students.filter(s => s.gradeLevel === grade),
    [students, grade]
  )

  const subGrades = grade === 'high' ? ['고1', '고2', '고3'] : ['중1', '중2', '중3']

  const filteredStudents = useMemo(() => {
    return studentsInGrade.filter(s => {
      const matchSearch = !searchQuery.trim() || s.name.includes(searchQuery.trim())
      const matchStatus = statusFilter === 'all' || s.reportStatus === statusFilter
      const matchGrade = subGradeFilter === 'all' || s.grade === subGradeFilter
      return matchSearch && matchStatus && matchGrade
    })
  }, [studentsInGrade, searchQuery, statusFilter, subGradeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / CARDS_PER_PAGE))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE
    return filteredStudents.slice(start, start + CARDS_PER_PAGE)
  }, [filteredStudents, currentPage])

  useEffect(() => { setCurrentPage(1) }, [searchQuery, statusFilter, subGradeFilter])

  const stats = useMemo(() => {
    const total = studentsInGrade.length
    const published = studentsInGrade.filter(s => s.reportStatus === 'published').length
    const draft = studentsInGrade.filter(s => s.reportStatus === 'draft').length
    const none = studentsInGrade.filter(s => s.reportStatus === 'none').length
    return { total, published, draft, none }
  }, [studentsInGrade])

  // 일괄 발행 대상 수
  const bulkTargetCount = useMemo(() => {
    return studentsInGrade.filter(s =>
      bulkIncludePublished ? true : s.reportStatus !== 'published'
    ).length
  }, [studentsInGrade, bulkIncludePublished])

  // ========== AI 코멘트 (개별) ==========
  const handleGenerateAI = () => {
    if (!selectedStudent) return
    setAiGenerating(true)
    setTimeout(() => {
      setTeacherComment(MOCK_AI_COMMENT_TEMPLATE(selectedStudent))
      setAiGenerating(false)
    }, 1500)
  }

  const handlePublish = () => {
    if (!teacherComment.trim()) {
      alert('선생님 코멘트를 작성하거나 AI 초안을 생성해주세요!')
      return
    }
    if (!selectedStudent) return
    setPublishing(true)
    setTimeout(() => {
      setStudents(prev => prev.map(s =>
        s.id === selectedStudent.id
          ? { ...s, reportStatus: 'published', publishedAt: '2026-07-01' }
          : s
      ))
      alert('✅ 보고서가 발행됐어요!')
      setPublishing(false)
      setSelectedStudent(null)
    }, 1000)
  }

  const handleDownloadPDF = () => {
    alert('📄 PDF 다운로드 (가짜 데이터 모드)')
  }

  // ========== 🚀 일괄 발행 ==========
  const handleBulkPublish = async () => {
    setBulkConfirmOpen(false)
    setBulkRunning(true)

    const targets = studentsInGrade.filter(s =>
      bulkIncludePublished ? true : s.reportStatus !== 'published'
    )

    setBulkProgress({ current: 0, total: targets.length, name: '' })

    for (let i = 0; i < targets.length; i++) {
      const student = targets[i]
      setBulkProgress({ current: i, total: targets.length, name: student.name })

      // 실제로는: AI 코멘트 생성 → DB 저장 → PDF 생성
      // 여기는 가짜로 0.6초씩
      await new Promise(r => setTimeout(r, 600))

      setStudents(prev => prev.map(s =>
        s.id === student.id
          ? { ...s, reportStatus: 'published', publishedAt: '2026-07-01' }
          : s
      ))
    }

    setBulkProgress({ current: targets.length, total: targets.length, name: '' })
    await new Promise(r => setTimeout(r, 500))

    setBulkRunning(false)
    alert(`✅ ${targets.length}명의 보고서가 일괄 발행됐어요!`)
  }

  // ========== 편집 화면 ==========
  if (selectedStudent) {
    return (
      <ReportEditView
        student={selectedStudent}
        month={selectedMonth}
        theme={THEME}
        teacherComment={teacherComment}
        setTeacherComment={setTeacherComment}
        aiGenerating={aiGenerating}
        publishing={publishing}
        onBack={() => setSelectedStudent(null)}
        onGenerateAI={handleGenerateAI}
        onPublish={handlePublish}
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
              {MOCK_MONTHS.map(m => (
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
            <div className="text-[16px] font-extrabold text-white mb-0.5">월말 일괄 발행</div>
            <div className="text-[12px] text-white/85 font-medium">
              {stats.total - stats.published}명 미발행 학생의 AI 코멘트를 자동 생성하고 한 번에 발행해요.
              <span className="ml-1 font-bold">필요한 학생만 나중에 수정 가능!</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setBulkConfirmOpen(true)}
          disabled={stats.total === 0}
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
      {paginated.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl px-10 py-16 text-center">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-[13px] font-medium text-ink-secondary">
            {studentsInGrade.length === 0 ? `${THEME.label} 학생이 없어요` : '검색 결과가 없어요'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 gap-3 mb-5">
            {paginated.map(student => (
              <StudentCard
                key={student.id}
                student={student}
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

      {/* ============ 🚀 일괄 발행 확인 모달 ============ */}
      {bulkConfirmOpen && (
        <div onClick={() => setBulkConfirmOpen(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[480px] max-w-full shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden">

            <div className="px-6 py-5" style={{ background: THEME.gradient }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl border border-white/30">
                  🚀
                </div>
                <div>
                  <div className="text-[16px] font-extrabold text-white">월말 일괄 발행</div>
                  <div className="text-[11px] text-white/90 font-medium">
                    {selectedMonth.split('-')[0]}년 {parseInt(selectedMonth.split('-')[1])}월 · {THEME.label}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <div className="text-[12px] font-bold text-amber-900 mb-2">📋 작업 내용</div>
                <div className="text-[11px] text-amber-800 leading-[1.8]">
                  · 학생 데이터를 자동으로 수집해서 AI 코멘트 생성<br />
                  · 보고서를 PDF로 생성하고 발행 완료<br />
                  · 발행 후 필요한 학생은 개별로 수정 가능<br />
                  · 학생당 약 1~2초 소요됨
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
                    : `미발행 ${stats.none + stats.draft}명 (${stats.published}명은 이미 발행 완료)`
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

      {/* ============ 🚀 일괄 발행 진행 모달 ============ */}
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

            {/* 진행 바 */}
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
function StudentCard({ student, theme, onClick }: { student: MockStudent, theme: typeof THEMES.high, onClick: () => void }) {
  const statusConfig = {
    published: { label: '✓ 발행 완료', bg: '#ECFDF5', color: '#065F46', border: '#6EE7B7' },
    draft: { label: '📝 작성 중', bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
    none: { label: '⏳ 미작성', bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' },
  }
  const status = statusConfig[student.reportStatus]

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
          style={{ background: status.bg, color: status.color, borderColor: status.border }}>
          {status.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="text-[16px] font-extrabold text-ink mb-0.5">{student.name}</div>
        <div className="text-[11px] font-bold text-ink-muted">{student.grade}</div>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-ink-muted">출석률</span>
          <span className="text-[12px] font-extrabold" style={{ color: theme.accent }}>{student.attendance}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-ink-muted">숙제</span>
          <span className="text-[12px] font-bold text-ink-secondary">
            {student.homeworkSubmitted}/{student.homeworkTotal}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-ink-muted">면접 시뮬</span>
          <span className="text-[12px] font-bold text-ink-secondary">{student.simulationCount}회</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-ink-muted">자소서</span>
          <span className="text-[12px] font-bold text-ink-secondary">{student.essayCount}건</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-line-light">
        <div className="text-[10px] text-ink-muted">최근 {student.lastActivity.slice(5)}</div>
        <span className="text-[11px] font-bold transition-all group-hover:translate-x-0.5" style={{ color: theme.accent }}>
          {student.reportStatus === 'published' ? '수정 →' : '발행 →'}
        </span>
      </div>
    </button>
  )
}

// ========== 보고서 편집 화면 ==========
function ReportEditView({ student, month, theme, teacherComment, setTeacherComment, aiGenerating, publishing, onBack, onGenerateAI, onPublish, onDownloadPDF }: {
  student: MockStudent
  month: string
  theme: typeof THEMES.high
  teacherComment: string
  setTeacherComment: (v: string) => void
  aiGenerating: boolean
  publishing: boolean
  onBack: () => void
  onGenerateAI: () => void
  onPublish: () => void
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
                {student.name} 학생
              </div>
              <div className="text-[11px] font-medium text-ink-secondary">
                {student.grade} · {monthLabel} 월간 보고서
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onDownloadPDF}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border-2 text-[12px] font-bold rounded-full transition-all hover:-translate-y-px"
            style={{ borderColor: theme.accentBorder, color: theme.accentDark }}>
            📄 PDF 다운로드
          </button>
          <button onClick={onPublish} disabled={publishing}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px disabled:opacity-50"
            style={{ background: theme.gradient, boxShadow: `0 4px 12px ${theme.accentShadow}` }}>
            {publishing ? '발행 중...' : student.reportStatus === 'published' ? '✓ 재발행' : '✓ 발행하기'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_360px] max-lg:grid-cols-1 gap-4">

        <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="px-5 py-3 border-b border-line-light flex items-center justify-between bg-gray-50">
            <div className="text-[13px] font-extrabold text-ink">📄 보고서 미리보기</div>
            <div className="text-[11px] font-medium text-ink-muted">부모님께 전달될 화면</div>
          </div>

          <div className="p-8 text-white" style={{ background: theme.gradient }}>
            <div className="text-[11px] font-bold opacity-85 mb-2 tracking-wider">
              {monthLabel} 월간 학습 보고서
            </div>
            <h1 className="text-[28px] font-extrabold mb-1">{student.name} 학생</h1>
            <div className="text-[13px] opacity-95">{student.grade}</div>

            <div className="grid grid-cols-4 gap-2 mt-5">
              {[
                { num: `${student.attendance}%`, label: '출석률' },
                { num: `${student.homeworkSubmitted}/${student.homeworkTotal}`, label: '숙제' },
                { num: student.simulationCount, label: '면접 시뮬' },
                { num: `${student.bookCount}권`, label: '독서' },
              ].map((s, i) => (
                <div key={i} className="rounded-xl px-3 py-3 text-center backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <div className="text-[22px] font-extrabold leading-none mb-1">{s.num}</div>
                  <div className="text-[10px] opacity-90 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <ReportSection icon="📝" title="자기소개서 작성" meta={`${student.essayCount}건`} show={student.essayCount > 0} theme={theme}>
              <div className="text-[12px] text-ink-secondary">실제 발행 시 작성한 자소서 본문 전체가 들어갑니다.</div>
            </ReportSection>

            <ReportSection icon="🎓" title="기출문제 답변" meta={`${student.pastAnswerCount}건`} show={student.pastAnswerCount > 0} theme={theme}>
              <div className="text-[12px] text-ink-secondary">답변 본문 + 선생님 피드백이 들어갑니다.</div>
            </ReportSection>

            <ReportSection icon="🎙️" title="AI 면접 시뮬레이션" meta={`${student.simulationCount}회 · 평균 ${student.simulationAvgScore}점`} show={student.simulationCount > 0} theme={theme}>
              <div className="text-[12px] text-ink-secondary">점수 추이 그래프 + 베스트 답변이 들어갑니다.</div>
            </ReportSection>

            <ReportSection icon="📚" title="독서 활동" meta={`${student.bookCount}권 완독`} show={student.bookCount > 0} theme={theme}>
              <div className="text-[12px] text-ink-secondary">읽은 책 목록이 들어갑니다.</div>
            </ReportSection>

            <ReportSection icon="🎬" title="수업 영상 시청" meta={`${student.videoWatched}/${student.videoTotal}개`} show={student.videoWatched > 0} theme={theme}>
              <div className="text-[12px] text-ink-secondary">시청한 영상 목록이 들어갑니다.</div>
            </ReportSection>

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
              학생의 6월 데이터를 분석해서 코멘트 초안을 만들어드려요.
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
                ['출석률', `${student.attendance}%`],
                ['숙제 제출', `${student.homeworkSubmitted}/${student.homeworkTotal}`],
                ['면접 시뮬', `${student.simulationCount}회 (평균 ${student.simulationAvgScore}점)`],
                ['자소서', `${student.essayCount}건`],
                ['기출문제 답변', `${student.pastAnswerCount}건`],
                ['독서', `${student.bookCount}권`],
                ['수업 영상', `${student.videoWatched}/${student.videoTotal}개`],
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

function ReportSection({ icon, title, meta, show, theme, children }: {
  icon: string
  title: string
  meta?: string
  show: boolean
  theme: typeof THEMES.high
  children: React.ReactNode
}) {
  if (!show) return null
  return (
    <div className="pl-4 py-1" style={{ borderLeft: `3px solid ${theme.accentBorder}` }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{icon}</span>
        <span className="text-[13px] font-extrabold" style={{ color: theme.accentDark }}>{title}</span>
        {meta && <span className="text-[10px] font-bold ml-auto px-2 py-0.5 rounded-full" style={{ background: theme.accentBg, color: theme.accent }}>{meta}</span>}
      </div>
      {children}
    </div>
  )
}