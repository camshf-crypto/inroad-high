import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { masterState, masterTokenState } from '../_store/auth'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

const MENU = [
  { path: '/master', label: '대시보드' },
  { path: '/master/academies', label: '학원 관리' },
  { path: '/master/lessons', label: '강의 영상' },
  { path: '/master/questions', label: '질문 관리' },
  { path: '/master/billing', label: '매출 관리' },
  { path: '/master/notices', label: '공지사항' },
  { path: '/master/data', label: '데이터 웨어하우스' },
  { path: '/master/audit', label: '감사 로그' },
  { path: '/master/staff', label: '직원 관리' },
]

export default function MasterLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const master = useAtomValue(masterState)
  const setToken = useSetAtom(masterTokenState)

  const handleLogout = () => {
    if (!confirm('로그아웃 하시겠어요?')) return
    setToken({ accessToken: undefined, expiresIn: undefined })
    navigate('/master/login')
  }

  const isActive = (path: string) => {
    if (path === '/master') return location.pathname === '/master'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-ink">

      {/* 사이드바 */}
      <aside
        className="w-[240px] flex-shrink-0 flex flex-col text-white relative overflow-hidden"
        style={{ background: THEME.gradient }}
      >
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%)' }}
        />

        {/* 로고 */}
        <div className="px-5 py-5 border-b border-white/15 relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🏢</span>
            <div className="text-[17px] font-extrabold tracking-tight">B-KEARS</div>
            <span className="text-[9px] font-bold bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
              MASTER
            </span>
          </div>
          <div className="text-[11px] font-medium text-white/70">본사 관리 시스템</div>
        </div>

        {/* 메뉴 (단순 리스트) */}
        <nav className="flex-1 px-3 py-4 relative overflow-y-auto">
          {MENU.map(m => {
            const active = isActive(m.path)
            return (
              <button
                key={m.path}
                onClick={() => navigate(m.path)}
                className="w-full flex items-center px-3.5 py-2.5 rounded-lg mb-1 text-left transition-all"
                style={{
                  background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
                  backdropFilter: active ? 'blur(8px)' : 'none',
                  fontWeight: active ? 700 : 500,
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span className="text-[13px]">{m.label}</span>
                {active && (
                  <div className="ml-auto w-1 h-5 bg-white rounded-full" />
                )}
              </button>
            )
          })}
        </nav>

        {/* 하단 유저 정보 + 로그아웃 */}
        <div className="px-3 py-3 border-t border-white/15 relative">
          {/* Logout 버튼 (위) */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-2 mb-2 rounded-lg text-[11px] font-bold tracking-wider uppercase text-white/80 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>

          {/* 유저 정보 (아래) */}
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[14px] font-extrabold"
              style={{ color: THEME.accentDark }}
            >
              {master.name?.[0] || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold truncate">{master.name}</div>
              <div className="text-[10px] font-medium text-white/70 truncate">
                {master.role === 'SUPER_ADMIN' ? '🏆 슈퍼 관리자' : '스태프'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}