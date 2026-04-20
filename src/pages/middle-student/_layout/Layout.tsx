import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { academyState, tokenState, studentState } from '../_store/auth'

const MENUS = [
  { path: '/middle-student/roadmap', label: '내 커리큘럼', icon: '⊞' },
  { path: '/middle-student/lesson', label: '수업 영상', icon: '🎬' },
  { path: '/middle-student/homework', label: '숙제', icon: '📝' },
  { path: '/middle-student/book', label: '독서리스트', icon: '📚' },
  { path: '/middle-student/expect', label: '자소서 · 예상질문', icon: '💬' },
  { path: '/middle-student/past', label: '기출문제', icon: '🎓' },
  { path: '/middle-student/simulation', label: '면접 시뮬레이션', icon: '🎙️' },
  { path: '/middle-student/presentation', label: '제시문 면접', icon: '📄' },
]

export default function MiddleLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const academy = useAtomValue(academyState)
  const student = useAtomValue(studentState)
  const setToken = useSetAtom(tokenState)
  const setStudent = useSetAtom(studentState)
  const setAcademy = useSetAtom(academyState)

  const handleLogout = () => {
    setToken({ accessToken: undefined, expiresIn: undefined })
    setStudent(null)
    setAcademy({ academyCode: undefined, academyName: undefined, teacherName: undefined, teacherId: undefined })
    navigate('/middle-student/login')
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans">

      {/* 사이드바 */}
      <aside className="w-[220px] bg-white border-r border-line flex flex-col flex-shrink-0">
        {/* 로고 + 학원 정보 */}
        <div className="px-5 pt-5 pb-4 border-b border-line-light">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-lg flex items-center justify-center text-white font-black text-sm tracking-tighter">IR</span>
            <div className="font-extrabold text-[17px] text-ink tracking-tight">인로드</div>
            <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">중등</span>
          </div>

          {academy.academyName ? (
            <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg p-3">
              <div className="text-[13px] font-bold text-brand-middle-dark">{academy.academyCode}</div>
              <div className="text-[11px] text-ink-secondary mt-0.5">{academy.academyName}</div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/middle-student/connect')}
              className="w-full text-[12px] font-semibold text-brand-middle-dark bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2 hover:bg-brand-middle hover:text-white transition-all"
            >
              + 학원 연결하기
            </button>
          )}
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          {MENUS.map(m => {
            const isActive = location.pathname === m.path || location.pathname.startsWith(m.path)
            return (
              <button
                key={m.path}
                onClick={() => navigate(m.path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 transition-all text-[13px] ${
                  isActive
                    ? 'bg-brand-middle-pale text-brand-middle-dark font-semibold'
                    : 'text-ink-secondary hover:bg-gray-50 hover:text-ink font-medium'
                }`}
              >
                <span className="text-[15px]">{m.icon}</span>
                {m.label}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-line-light">
          <div className="text-[11px] text-ink-muted">© 2026 Inroad</div>
        </div>
      </aside>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* GNB */}
        <header className="h-12 bg-white border-b border-line flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-semibold text-ink">인로드</div>
            {student?.grade && (
              <span className="text-[11px] font-semibold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full border border-brand-middle-light">
                {student.grade}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {student?.name && (
              <div className="text-[13px] font-medium text-ink-secondary">
                <span className="text-ink font-semibold">{student.name}</span>님
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-[12px] font-medium text-ink-secondary px-3 py-1.5 border border-line rounded-lg hover:bg-gray-50 hover:border-ink-muted transition-all"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="flex-1 overflow-hidden bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}