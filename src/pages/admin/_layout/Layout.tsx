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
    { path: '/admin', label: '대시보드', icon: '⊞' },
    { path: '/admin/students', label: '학생 관리', icon: '👥' },
    { path: '/admin/academy', label: '학원 코드', icon: '🔑' },
    ...(isOwner ? [
      { path: '/admin/billing', label: '결제 관리', icon: '💳' },
      { path: '/admin/settings', label: '학원 설정', icon: '⚙️' },
    ] : []),
  ]

  const handleLogout = () => {
    setToken({ accessToken: undefined, expiresIn: undefined })
    setAcademy({ academyCode: undefined, academyName: undefined, ownerName: undefined, role: 'OWNER', teacherId: undefined })
    navigate('/admin/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F8F7F5', overflow: 'hidden' }}>

      {/* 사이드바 — 왼쪽 최소 너비 */}
      <div style={{ width: 160, background: '#fff', borderRight: '0.5px solid #E5E7EB', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '14px 10px 10px' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#3B5BDB', marginBottom: 4 }}>인로드</div>
          {academy.academyName && (
            <>
              <div style={{ fontSize: 9, color: '#9CA3AF' }}>학원 코드</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3B5BDB', letterSpacing: '0.05em' }}>{academy.academyCode}</div>
              <div style={{ fontSize: 10, color: '#6B7280', marginTop: 1 }}>{academy.academyName}</div>
            </>
          )}
          {!isOwner && (
            <div style={{ marginTop: 4, fontSize: 9, color: '#fff', background: '#3B5BDB', padding: '1px 6px', borderRadius: 99, display: 'inline-block' }}>선생님</div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '4px 6px' }}>
          {menus.map(m => {
            const isActive = location.pathname === m.path || (m.path !== '/admin' && location.pathname.startsWith(m.path))
            return (
              <div
                key={m.path}
                onClick={() => navigate(m.path)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px', borderRadius: 8, marginBottom: 2, cursor: 'pointer', background: isActive ? '#EEF2FF' : 'transparent', color: isActive ? '#3B5BDB' : '#6B7280', fontSize: 12, fontWeight: isActive ? 600 : 400 }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{m.icon}</span>
                {m.label}
              </div>
            )
          })}
        </nav>

        <div style={{ padding: '10px 6px', borderTop: '0.5px solid #E5E7EB' }}>
          <div onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px', borderRadius: 8, cursor: 'pointer', color: '#6B7280', fontSize: 12 }}>
            <span style={{ fontSize: 14 }}>🚪</span>
            로그아웃
          </div>
        </div>
      </div>

      {/* 메인 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* GNB */}
        <div style={{ height: 50, background: '#fff', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>인로드</div>
            <span style={{ fontSize: 11, color: '#fff', background: isOwner ? '#3B5BDB' : '#6B7280', padding: '2px 8px', borderRadius: 99 }}>
              {isOwner ? '학원 관리자' : '선생님'}
            </span>
            {academy.academyName && (
              <span style={{ fontSize: 11, color: '#3B5BDB', background: '#EEF2FF', padding: '2px 8px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>
                {academy.academyName}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{academy.ownerName}</div>
            <div onClick={handleLogout} style={{ fontSize: 12, color: '#6B7280', cursor: 'pointer', padding: '5px 12px', border: '0.5px solid #E5E7EB', borderRadius: 6 }}>로그아웃</div>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflowY: 'scroll', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent' }}>
          <Outlet />
        </div>
      </div>

    </div>
  )
}