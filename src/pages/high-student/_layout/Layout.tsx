import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { academyState, tokenState, studentState } from '../_store/auth'
import { supabase } from '../../../lib/supabase'

const MENUS = [
  { path: '/high-student/roadmap', label: '내 로드맵', icon: '⊞' },
  { path: '/high-student/topic', label: '탐구주제', icon: '🔬' },
  { path: '/high-student/book', label: '독서리스트', icon: '📚' },
  { path: '/high-student/record', label: '나의 생기부', icon: '📋' },
  { path: '/high-student/expect', label: '생기부 예상질문', icon: '💬' },
  { path: '/high-student/past', label: '기출문제', icon: '🎓' },
  { path: '/high-student/simulation', label: '면접 시뮬레이션', icon: '🎙️' },
  { path: '/high-student/presentation', label: '제시문 면접', icon: '📄' },
  { path: '/high-student/major', label: '전공특화문제', icon: '🧠' },
  { path: '/high-student/mockexam', label: '면접 모의고사', icon: '📝' },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const academy = useAtomValue(academyState)
  const student = useAtomValue(studentState)
  const setToken = useSetAtom(tokenState)
  const setStudent = useSetAtom(studentState)
  const setAcademy = useSetAtom(academyState)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setToken({ accessToken: undefined, expiresIn: undefined })
    setStudent(null)
    setAcademy({ academyCode: undefined, academyName: undefined, teacherName: undefined, teacherId: undefined })
    navigate('/high-student/login')
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans">

      {/* 사이드바 */}
      <aside className="w-[220px] bg-white border-r border-line flex flex-col flex-shrink-0">
        {/* 로고 + 학원 정보 */}
        <div className="px-5 pt-4 pb-3 border-b border-line-light flex-shrink-0">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-7 h-7 bg-gradient-to-br from-brand-high-dark to-brand-high rounded-lg flex items-center justify-center text-white font-black text-sm tracking-tighter">IR</span>
            <div className="font-extrabold text-[17px] text-ink tracking-tight">인로드</div>
            <span className="text-[10px] font-bold text-white bg-brand-high px-2 py-0.5 rounded-full">고등</span>
          </div>

          {academy.academyName ? (
            <div className="bg-brand-high-pale border border-brand-high-light rounded-lg px-3 py-2">
              <div className="text-[12px] font-bold text-brand-high-dark">{academy.academyCode}</div>
              <div className="text-[10px] text-ink-secondary mt-0.5">{academy.academyName}</div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/high-student/connect')}
              className="w-full text-[12px] font-semibold text-brand-high-dark bg-brand-high-pale border border-brand-high-light rounded-lg px-3 py-2 hover:bg-brand-high hover:text-white transition-all"
            >
              + 학원 연결하기
            </button>
          )}
        </div>

        {/* 메뉴 (스크롤 없이 딱 맞춤!) */}
        <nav className="flex-1 px-2.5 py-2.5 flex flex-col">
          {MENUS.map(m => {
            const isActive = location.pathname === m.path || location.pathname.startsWith(m.path)
            return (
              <button
                key={m.path}
                onClick={() => navigate(m.path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 transition-all text-[13px] ${
                  isActive
                    ? 'bg-brand-high-pale text-brand-high-dark font-semibold'
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
        <div className="px-5 py-2 border-t border-line-light flex-shrink-0">
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
              <span className="text-[11px] font-semibold text-brand-high-dark bg-brand-high-bg px-2 py-0.5 rounded-full border border-brand-high-light">
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