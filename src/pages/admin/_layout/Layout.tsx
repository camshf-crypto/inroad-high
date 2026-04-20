import React from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { academyState, tokenState } from '../_store/auth'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const academy = useAtomValue(academyState)
  const setToken = useSetAtom(tokenState)
  const setAcademy = useSetAtom(academyState)

  const isOwner = academy.role === 'OWNER'

  const menus = [
    { path: '/admin', label: '대시보드', icon: '⊞', type: 'default' as const },
    { path: '/admin/students', label: '고등 관리', icon: '🌊', type: 'default' as const },
    { path: '/admin/middle-students', label: '중등 관리', icon: '🌱', type: 'middle' as const },
    { path: '/admin/academy', label: '학원 코드', icon: '🔑', type: 'default' as const },
    ...(isOwner ? [
      { path: '/admin/billing', label: '결제 관리', icon: '💳', type: 'default' as const },
      { path: '/admin/settings', label: '학원 설정', icon: '⚙️', type: 'default' as const },
    ] : []),
  ]

  const handleLogout = () => {
    setToken({ accessToken: undefined, expiresIn: undefined })
    setAcademy({
      academyCode: undefined,
      academyName: undefined,
      ownerName: undefined,
      role: 'OWNER',
      teacherId: undefined,
      plans: ['high', 'middle'],
    })
    navigate('/admin/login')
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-ink">

      {/* 사이드바 */}
      <div className="w-[190px] bg-white border-r border-line flex flex-col flex-shrink-0">

        {/* 로고 & 학원 정보 */}
        <div className="px-4 pt-5 pb-4 border-b border-line-light">
          <div
            className="flex items-center gap-2 mb-3 cursor-pointer"
            onClick={() => navigate('/admin')}
          >
            {/* IR 로고 - 인라인 스타일로 확실하게 */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[12px] font-extrabold flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              IR
            </div>
            <span className="text-[15px] font-extrabold tracking-tight" style={{ color: '#1E3A8A' }}>
              인로드
            </span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                color: '#1E3A8A',
                background: '#EFF6FF',
                border: '1px solid rgba(147, 197, 253, 0.6)',
              }}
            >
              {isOwner ? '원장' : '선생님'}
            </span>
          </div>

          {/* 학원 정보 박스 */}
          {academy.academyName && (
            <div
              className="rounded-lg px-3 py-2.5"
              style={{
                background: 'linear-gradient(135deg, #EFF6FF, #FFFFFF)',
                border: '1px solid rgba(147, 197, 253, 0.5)',
              }}
            >
              <div className="text-[9px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">학원 코드</div>
              <div className="text-[13px] font-extrabold tracking-wider mb-1" style={{ color: '#1E3A8A' }}>
                {academy.academyCode}
              </div>
              <div className="text-[10px] text-ink-secondary font-medium truncate">{academy.academyName}</div>
            </div>
          )}
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {menus.map(m => {
            const isActive = location.pathname === m.path || (m.path !== '/admin' && location.pathname.startsWith(m.path))
            const isMiddle = m.type === 'middle'

            // 컬러 정의
            const accent = isMiddle ? '#059669' : '#2563EB'
            const accentDark = isMiddle ? '#065F46' : '#1E3A8A'
            const accentBg = isMiddle ? '#ECFDF5' : '#EFF6FF'
            const accentShadow = isMiddle ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.12)'

            return (
              <div
                key={m.path}
                onClick={() => navigate(m.path)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-1 cursor-pointer transition-all"
                style={{
                  background: isActive ? accentBg : 'transparent',
                  color: isActive ? accentDark : '#6B7280',
                  fontWeight: isActive ? 700 : 500,
                  boxShadow: isActive ? `0 2px 8px ${accentShadow}` : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = accentBg
                    e.currentTarget.style.color = accentDark
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#6B7280'
                  }
                }}
              >
                <span className="text-sm flex-shrink-0">{m.icon}</span>
                <span className="text-[12.5px]">{m.label}</span>
                {isActive && (
                  <div
                    className="ml-auto w-1 h-4 rounded-full"
                    style={{ background: accent }}
                  />
                )}
              </div>
            )
          })}
        </nav>

        {/* 로그아웃 */}
        <div className="p-2 border-t border-line-light">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-ink-secondary text-[12.5px] font-medium hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <span className="text-sm">🚪</span>
            로그아웃
          </button>
        </div>

        {/* Footer */}
        <div className="px-3 pb-3 pt-1 text-[9px] text-ink-muted text-center font-medium">
          © 2026 Inroad
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* GNB */}
        <div className="h-12 bg-white border-b border-line flex items-center justify-between px-6 flex-shrink-0">
          {/* 학원명만 */}
          <div className="flex items-center gap-2">
            {academy.academyName ? (
              <span
                className="text-[13px] font-bold px-3 py-1 rounded-full"
                style={{
                  color: '#1E3A8A',
                  background: '#EFF6FF',
                  border: '1px solid rgba(147, 197, 253, 0.6)',
                }}
              >
                🏫 {academy.academyName}
              </span>
            ) : (
              <span className="text-[13px] font-semibold text-ink-secondary">학원 정보 없음</span>
            )}
            <span
              className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
              style={{
                background: isOwner ? '#2563EB' : '#6B7280',
              }}
            >
              {isOwner ? '학원 관리자' : '선생님'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* 프로필 */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full text-white flex items-center justify-center text-[11px] font-extrabold"
                style={{
                  background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                }}
              >
                {academy.ownerName?.[0] || '?'}
              </div>
              <span className="text-[13px] font-semibold text-ink">{academy.ownerName}님</span>
            </div>

            <button
              onClick={handleLogout}
              className="text-[12px] font-medium text-ink-secondary px-3 py-1.5 border border-line rounded-md hover:border-blue-300 hover:text-blue-700 transition-all"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>
      </div>

    </div>
  )
}