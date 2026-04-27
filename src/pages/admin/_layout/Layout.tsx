import React, { useRef, useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { academyState, tokenState } from '../_store/auth'
import { supabase } from '../../../lib/supabase'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const academy = useAtomValue(academyState)
  const setToken = useSetAtom(tokenState)
  const setAcademy = useSetAtom(academyState)

  const isOwner = academy.role === 'OWNER'

  // 로고 관련
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // 학원 로고 가져오기
  React.useEffect(() => {
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

  const handleLogoUpload = async (file: File) => {
    if (!academy.academyId) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${academy.academyId}/logo_${Date.now()}.${ext}`
      
      const { error: uploadErr } = await supabase.storage
        .from('academy-logos')
        .upload(fileName, file, { upsert: true })
      
      if (uploadErr) throw uploadErr
      
      const { data: { publicUrl } } = supabase.storage
        .from('academy-logos')
        .getPublicUrl(fileName)
      
      const { error: updateErr } = await supabase
        .from('academies')
        .update({ logo_url: publicUrl })
        .eq('id', academy.academyId)
      
      if (updateErr) throw updateErr
      
      setLogoUrl(publicUrl)
    } catch (e: any) {
      alert('로고 업로드 실패: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

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
      academyId: undefined,
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
            <span className="text-[15px] font-extrabold tracking-tight" style={{ color: '#1E3A8A' }}>
              비커스
            </span>
          </div>

          {/* 학원 로고 박스 */}
          {academy.academyName && (
            <div className="flex items-center justify-center">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }}
              />
              {logoUrl ? (
                <div
                  onClick={() => isOwner && fileRef.current?.click()}
                  className="w-20 h-20 rounded-lg overflow-hidden bg-white flex items-center justify-center border"
                  style={{
                    borderColor: 'rgba(147, 197, 253, 0.5)',
                    cursor: isOwner ? 'pointer' : 'default',
                  }}
                  title={isOwner ? '클릭해서 로고 변경' : ''}
                >
                  <img src={logoUrl} alt="학원 로고" className="w-full h-full object-cover" />
                </div>
              ) : (
                <button
                  onClick={() => isOwner && fileRef.current?.click()}
                  disabled={!isOwner || uploading}
                  className="w-20 h-20 rounded-lg flex flex-col items-center justify-center border-2 border-dashed transition-colors"
                  style={{
                    borderColor: 'rgba(147, 197, 253, 0.5)',
                    background: '#F8FAFC',
                    cursor: isOwner ? 'pointer' : 'default',
                  }}
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-[20px] mb-0.5">📷</span>
                      <span className="text-[9px] font-bold text-blue-700">
                        {isOwner ? '로고 추가' : '로고 없음'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {menus.map(m => {
            const isActive = location.pathname === m.path || (m.path !== '/admin' && location.pathname.startsWith(m.path))
            const isMiddle = m.type === 'middle'

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
          © 2026 BIKUS
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* GNB */}
        <div className="h-12 bg-white border-b border-line flex items-center justify-between px-6 flex-shrink-0">
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
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-ink">{academy.ownerName}님</span>

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