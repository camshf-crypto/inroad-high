import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { academyState, tokenState, studentState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'

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

  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // 학원 로고 가져오기 (학생은 읽기 전용)
  useEffect(() => {
    const fetchLogo = async () => {
      if (!academy.academyId) return
      const { data } = await supabase
        .from('academies')
        .select('logo_url')
        .eq('id', academy.academyId)
        .maybeSingle()
      if (data?.logo_url) setLogoUrl(data.logo_url)
    }
    fetchLogo()
  }, [academy.academyId])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setToken({ accessToken: undefined, expiresIn: undefined })
    setStudent(null)
    setAcademy({ academyCode: undefined, academyName: undefined, teacherName: undefined, teacherId: undefined, academyId: undefined, })
    navigate('/high-student/login')
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans">

      {/* 사이드바 */}
      <aside className="w-[220px] bg-white border-r border-line flex flex-col flex-shrink-0">
        {/* 로고 + 학원 로고 */}
        <div className="px-5 pt-4 pb-3 border-b border-line-light flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="font-extrabold text-[17px] text-ink tracking-tight">비커스</div>
          </div>

          {/* 학원 로고 */}
          {academy.academyName ? (
            logoUrl ? (
              <div className="flex items-center justify-center">
                <div
                  className="w-20 h-20 rounded-lg overflow-hidden bg-white flex items-center justify-center border border-brand-high-light"
                >
                  <img src={logoUrl} alt="학원 로고" className="w-full h-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <div
                  className="w-20 h-20 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-brand-high-light bg-brand-high-pale"
                >
                  <span className="text-[20px] mb-0.5">🏫</span>
                  <span className="text-[9px] font-bold text-brand-high-dark">학원 로고</span>
                </div>
              </div>
            )
          ) : (
            <button
              onClick={() => navigate('/high-student/connect')}
              className="w-full text-[12px] font-semibold text-brand-high-dark bg-brand-high-pale border border-brand-high-light rounded-lg px-3 py-2 hover:bg-brand-high hover:text-white transition-all"
            >
              + 학원 연결하기
            </button>
          )}
        </div>

        {/* 메뉴 */}
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
          <div className="text-[11px] text-ink-muted">© 2026 BIKUS</div>
        </div>
      </aside>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* GNB */}
        <header className="h-12 bg-white border-b border-line flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
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