import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { academyState, teachersState } from '../../_store/auth'

const HIGH_STUDENTS = [
  { id: 1, name: '김민준', grade: '고2', month: '4~5월', pct: 25, files: 2, email: 'kim@example.com', joinDate: '2025-01-15' },
  { id: 2, name: '이수현', grade: '고3', month: '7~8월', pct: 75, files: 5, email: 'lee@example.com', joinDate: '2025-01-10' },
  { id: 3, name: '박지호', grade: '고1', month: '1~2월', pct: 100, files: 3, email: 'park@example.com', joinDate: '2025-02-01' },
  { id: 4, name: '최유진', grade: '고2', month: '4~5월', pct: 40, files: 1, email: 'choi@example.com', joinDate: '2025-01-20' },
  { id: 5, name: '정다은', grade: '고3', month: '9월', pct: 85, files: 4, email: 'jung@example.com', joinDate: '2025-01-05' },
  { id: 6, name: '강민서', grade: '고1', month: '3월', pct: 100, files: 2, email: 'kang@example.com', joinDate: '2025-02-10' },
  { id: 7, name: '윤서준', grade: '고2', month: '4~5월', pct: 60, files: 3, email: 'yoon@example.com', joinDate: '2025-01-25' },
  { id: 8, name: '임지수', grade: '고1', month: '3월', pct: 50, files: 1, email: 'lim@example.com', joinDate: '2025-02-15' },
  { id: 9, name: '한지원', grade: '고3', month: '10~11월', pct: 90, files: 6, email: 'han@example.com', joinDate: '2025-01-03' },
  { id: 10, name: '오민석', grade: '고2', month: '6월', pct: 55, files: 2, email: 'oh@example.com', joinDate: '2025-01-18' },
]

const MIDDLE_STUDENTS = [
  { id: 101, name: '김서아', grade: '중2', month: '4월', pct: 30, files: 1, email: 'kim2@example.com', joinDate: '2025-02-01' },
  { id: 102, name: '이준혁', grade: '중3', month: '6월', pct: 65, files: 3, email: 'lee2@example.com', joinDate: '2025-01-15' },
  { id: 103, name: '박민아', grade: '중1', month: '3월', pct: 20, files: 0, email: 'park2@example.com', joinDate: '2025-02-10' },
  { id: 104, name: '최현우', grade: '중2', month: '5월', pct: 50, files: 2, email: 'choi2@example.com', joinDate: '2025-01-20' },
  { id: 105, name: '정수빈', grade: '중3', month: '8월', pct: 80, files: 4, email: 'jung2@example.com', joinDate: '2025-01-05' },
  { id: 106, name: '강지유', grade: '중1', month: '2월', pct: 10, files: 0, email: 'kang2@example.com', joinDate: '2025-03-01' },
  { id: 107, name: '윤채원', grade: '중2', month: '4월', pct: 45, files: 2, email: 'yoon2@example.com', joinDate: '2025-01-28' },
  { id: 108, name: '임도윤', grade: '중3', month: '9월', pct: 90, files: 5, email: 'lim2@example.com', joinDate: '2025-01-08' },
]

const PAGE_SIZE = 10

export default function Students() {
  const navigate = useNavigate()
  const location = useLocation()
  const academy = useAtomValue(academyState)
  const teachers = useAtomValue(teachersState)

  const isOwner = academy.role === 'OWNER'

  // URL로 중등/고등 판단
  const isMiddle = location.pathname.startsWith('/admin/middle-students')

  // 동적 테마
  const theme = isMiddle ? {
    accent: '#059669',
    accentDark: '#065F46',
    accentBg: '#ECFDF5',
    accentBorder: '#6EE7B7',
    accentShadow: 'rgba(16, 185, 129, 0.15)',
    gradient: 'linear-gradient(135deg, #065F46, #10B981)',
  } : {
    accent: '#2563EB',
    accentDark: '#1E3A8A',
    accentBg: '#EFF6FF',
    accentBorder: '#93C5FD',
    accentShadow: 'rgba(37, 99, 235, 0.15)',
    gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
  }

  const allStudents = isMiddle ? MIDDLE_STUDENTS : HIGH_STUDENTS
  const GRADE_TABS = isMiddle
    ? ['전체', '중1', '중2', '중3']
    : ['전체', '고1', '고2', '고3']

  const baseStudents = isOwner
    ? allStudents
    : allStudents.filter(s => {
        const myTeacher = teachers.find((t: any) => t.id === academy.teacherId)
        return myTeacher?.assignedStudents.includes(s.id)
      })

  const [grade, setGrade] = useState('전체')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'pct'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const filtered = baseStudents
    .filter(s => grade === '전체' || s.grade === grade)
    .filter(s => s.name.includes(search) || s.email.includes(search))
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir
      return (a.pct - b.pct) * dir
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key: 'name' | 'pct') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const handleGrade = (g: string) => { setGrade(g); setPage(1) }
  const handleSearch = (v: string) => { setSearch(v); setPage(1) }

  const handleStudentClick = (id: number) => {
    if (isMiddle) navigate(`/admin/middle-students/${id}`)
    else navigate(`/admin/students/${id}`)
  }

  return (
    <div className="px-8 py-7 min-h-[calc(100vh-50px)] bg-[#F8FAFC] font-sans text-ink">

      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-2.5">
        <span className="text-2xl">{isMiddle ? '🌱' : '🌊'}</span>
        <div>
          <div className="text-[22px] font-extrabold text-ink tracking-tight mb-0.5">
            {isMiddle ? '중등 관리' : '고등 관리'}
          </div>
          <div className="text-[13px] text-ink-secondary font-medium">
            {isOwner
              ? `${isMiddle ? '중등' : '고등'} 학생 목록을 관리하세요.`
              : `담당 ${isMiddle ? '중등' : '고등'} 학생 ${baseStudents.length}명을 관리하세요.`}
          </div>
        </div>
      </div>

      {/* 필터 & 검색 */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {GRADE_TABS.map(g => (
            <button
              key={g}
              onClick={() => handleGrade(g)}
              className="px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
              style={{
                background: grade === g ? theme.accent : '#fff',
                color: grade === g ? '#fff' : '#6B7280',
                borderColor: grade === g ? theme.accent : '#E5E7EB',
                boxShadow: grade === g ? `0 2px 8px ${theme.accentShadow}` : 'none',
              }}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="이름 또는 이메일 검색"
            className="h-10 pl-9 pr-3 border border-line rounded-lg text-[12.5px] outline-none w-[240px] transition-all placeholder:text-ink-muted"
            onFocus={e => {
              e.target.style.borderColor = theme.accent
              e.target.style.boxShadow = `0 0 0 3px ${theme.accentShadow}`
            }}
            onBlur={e => {
              e.target.style.borderColor = '#E5E7EB'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>

      {/* 테이블 컨테이너 */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">

        {/* 테이블 헤더 정보 */}
        <div className="px-6 py-3.5 border-b border-line flex items-center justify-between bg-white">
          <div className="text-[13px] font-medium text-ink-secondary">
            총 <span className="font-extrabold text-[14px]" style={{ color: theme.accent }}>{filtered.length}명</span>
            {totalPages > 1 && <span className="text-ink-muted"> · {page}/{totalPages} 페이지</span>}
          </div>
          <div
            className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{
              color: theme.accent,
              background: theme.accentBg,
              border: `1px solid ${theme.accentBorder}60`,
            }}
          >
            {isMiddle ? '🌱 중등' : '🌊 고등'}
          </div>
        </div>

        {/* 테이블 */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC]">
              <th
                onClick={() => handleSort('name')}
                className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line cursor-pointer hover:text-ink transition-colors"
              >
                학생 {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">학년</th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">이메일</th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">현재 월</th>
              <th
                onClick={() => handleSort('pct')}
                className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line cursor-pointer hover:text-ink transition-colors"
              >
                진행률 {sortKey === 'pct' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">파일</th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">가입일</th>
              <th className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-10 py-12 text-center">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="text-[13px] text-ink-secondary font-medium">
                    {isOwner ? '검색 결과가 없어요.' : '담당 학생이 없어요. 원장님께 학생 배정을 요청해주세요.'}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((s, i) => (
                <tr
                  key={s.id}
                  onClick={() => handleStudentClick(s.id)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                  style={{
                    borderBottom: i < paginated.length - 1 ? '1px solid #F1F5F9' : 'none',
                  }}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                        style={{ background: theme.gradient }}
                      >
                        {s.name[0]}
                      </div>
                      <div className="text-[13px] font-semibold text-ink">{s.name}</div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2.5 py-1 rounded-full">
                      {s.grade}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] font-medium text-ink-secondary">{s.email}</td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-ink">{s.month}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-[100px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${s.pct}%`,
                            background: theme.accent,
                          }}
                        />
                      </div>
                      <span
                        className="text-[12px] font-bold"
                        style={{ color: theme.accent }}
                      >
                        {s.pct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[12px] font-semibold text-ink-secondary">{s.files}개</td>
                  <td className="px-5 py-3 text-[12px] font-medium text-ink-muted">{s.joinDate}</td>
                  <td className="px-5 py-3">
                    <span
                      className="text-[11px] font-bold px-3 py-1 rounded-full border"
                      style={{
                        color: theme.accent,
                        borderColor: theme.accent,
                        background: '#fff',
                      }}
                    >
                      상세보기 →
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-line flex items-center justify-between">
            <div className="text-[12px] text-ink-secondary font-medium">
              {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filtered.length)} / 총 <span className="font-bold" style={{ color: theme.accent }}>{filtered.length}명</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="h-8 px-2.5 border border-line rounded-md bg-white text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-ink-muted enabled:hover:text-ink"
                style={{ color: page === 1 ? '#D1D5DB' : '#6B7280' }}
              >
                처음
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 border border-line rounded-md bg-white text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-ink-muted enabled:hover:text-ink"
                style={{ color: page === 1 ? '#D1D5DB' : '#6B7280' }}
              >
                ←
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                return start + i
              }).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-md text-[13px] transition-all"
                  style={{
                    border: `1px solid ${page === p ? theme.accent : '#E5E7EB'}`,
                    background: page === p ? theme.accent : '#fff',
                    color: page === p ? '#fff' : '#6B7280',
                    fontWeight: page === p ? 700 : 500,
                    boxShadow: page === p ? `0 2px 8px ${theme.accentShadow}` : 'none',
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 border border-line rounded-md bg-white text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-ink-muted enabled:hover:text-ink"
                style={{ color: page === totalPages ? '#D1D5DB' : '#6B7280' }}
              >
                →
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="h-8 px-2.5 border border-line rounded-md bg-white text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-ink-muted enabled:hover:text-ink"
                style={{ color: page === totalPages ? '#D1D5DB' : '#6B7280' }}
              >
                마지막
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}