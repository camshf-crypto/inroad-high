import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { academyState, tokenState, studentState } from '../_store/auth'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const academy = useAtomValue(academyState)
  const student = useAtomValue(studentState)
  const setToken = useSetAtom(tokenState)
  const setStudent = useSetAtom(studentState)
  const setAcademy = useSetAtom(academyState)

  const menus = [
    { path: '/student/roadmap', label: '내 로드맵', icon: '⊞' },
    { path: '/student/topic', label: '탐구주제', icon: '🔬' },
    { path: '/student/book', label: '독서리스트', icon: '📚' },
    { path: '/student/expect', label: '생기부 예상질문', icon: '💬' },
    { path: '/student/past', label: '기출문제', icon: '🎓' },
    { path: '/student/simulation', label: '면접 시뮬레이션', icon: '🎙️' },
    { path: '/student/presentation', label: '제시문 면접', icon: '📄' },
    { path: '/student/major', label: '전공특화문제', icon: '🧠' },
  ]

  const handleLogout = () => {
    setToken({ accessToken: undefined, expiresIn: undefined })
    setStudent(null)
    setAcademy({ academyCode: undefined, academyName: undefined, teacherName: undefined, teacherId: undefined })
    navigate('/student/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F8F7F5' }}>
      {/* 사이드바 */}
      <div style={{ width: 200, background: '#fff', borderRight: '0.5px solid #E5E7EB', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 20px 16px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3B5BDB', marginBottom: 2 }}>인로드</div>
          {academy.academyName ? (
            <>
              <div style={{ fontSize: 10, color: '#6B7280' }}></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#3B5BDB' }}>{academy.academyCode}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{academy.academyName}</div>
            </>
          ) : (
            <div onClick={() => navigate('/student/connect')} style={{ marginTop: 6, fontSize: 11, color: '#3B5BDB', border: '0.5px solid #3B5BDB', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', display: 'inline-block' }}>
              학원 연결하기
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 10, color: '#fff', background: '#3B5BDB', padding: '2px 8px', borderRadius: 99, display: 'inline-block' }}>학생</div>
        </div>

        <nav style={{ flex: 1, padding: '0 10px', overflowY: 'auto' }}>
          {menus.map(m => {
            const isActive = location.pathname === m.path || location.pathname.startsWith(m.path)
            return (
              <div key={m.path} onClick={() => navigate(m.path)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, marginBottom: 2, cursor: 'pointer', background: isActive ? '#EEF2FF' : 'transparent', color: isActive ? '#3B5BDB' : '#6B7280', fontSize: 13, fontWeight: isActive ? 500 : 400 }}>
                <span style={{ fontSize: 15 }}>{m.icon}</span>
                {m.label}
              </div>
            )
          })}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '0.5px solid #E5E7EB' }}>
          <div style={{ fontSize: 11, color: '#6B7280', padding: '0 12px' }}>© 2026 Inroad</div>
        </div>
      </div>

      {/* 메인 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* GNB */}
        <div style={{ height: 50, background: '#fff', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>인로드</div>
            <span style={{ fontSize: 11, color: '#fff', background: '#3B5BDB', padding: '2px 8px', borderRadius: 99 }}>학생</span>
            {student?.grade && (
              <span style={{ fontSize: 11, color: '#3B5BDB', background: '#EEF2FF', padding: '2px 8px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>
                {student.grade}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{student?.name}</div>
            <div onClick={handleLogout} style={{ fontSize: 12, color: '#6B7280', cursor: 'pointer', padding: '5px 12px', border: '0.5px solid #E5E7EB', borderRadius: 6 }}>
              로그아웃
            </div>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}