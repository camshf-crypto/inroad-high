import React, { useRef, useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAtomValue, useSetAtom, useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { academyState, tokenState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'

const sidebarCollapsedAtom = atomWithStorage<boolean>('sidebarCollapsed', false)

const SidebarIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <line x1="9" y1="5" x2="9" y2="19" stroke="currentColor" strokeWidth="1.8" />
  </svg>
)

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const academy = useAtomValue(academyState)
  const setToken = useSetAtom(tokenState)
  const setAcademy = useSetAtom(academyState)
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom)

  const isOwner = academy.role === 'OWNER'
  const enabledMenus = academy.enabledMenus || []
  const hasHighMenu = enabledMenus.some(m => m.startsWith('high.'))
  const hasMiddleMenu = enabledMenus.some(m => m.startsWith('middle.'))

  const isAcademyNotRegistered = !academy.academyId

  // ⭐ 학원 상태 체크 (로딩 추가)
  const [academyStatus, setAcademyStatus] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  React.useEffect(() => {
    const checkStatus = async () => {
      if (!academy.academyId) {
        setStatusLoading(false)
        return
      }
      const { data } = await supabase
        .from('academies')
        .select('status')
        .eq('id', academy.academyId)
        .maybeSingle()
      if (data) setAcademyStatus(data.status)
      setStatusLoading(false)
    }
    setStatusLoading(true)
    checkStatus()
  }, [academy.academyId])

  const isPendingReview = academyStatus === 'pending_review'
  const isRejected = academyStatus === 'rejected'

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
      const { error: uploadErr } = await supabase.storage.from('academy-logos').upload(fileName, file, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('academy-logos').getPublicUrl(fileName)
      const { error: updateErr } = await supabase.from('academies').update({ logo_url: publicUrl }).eq('id', academy.academyId)
      if (updateErr) throw updateErr
      setLogoUrl(publicUrl)
    } catch (e: any) {
      alert('로고 업로드 실패: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  const menus = [
    { path: '/admin', label: '대시보드', icon: '⊞', type: 'default' as const, show: true },
    hasHighMenu && { path: '/admin/students', label: '고등 관리', icon: '🌊', type: 'default' as const, show: true },
    hasMiddleMenu && { path: '/admin/middle-students', label: '중등 관리', icon: '🌱', type: 'middle' as const, show: true },
    hasMiddleMenu && { path: '/admin/middle-suhaeng', label: '수행평가 관리', icon: '📋', type: 'middle' as const, show: true },
    { path: '/admin/student-approval', label: '학생 승인', icon: '✋', type: 'default' as const, show: true },
    ...(isOwner ? [{ path: '/admin/teachers', label: '선생님 관리', icon: '👨‍🏫', type: 'default' as const, show: true }] : []),
    { path: '/admin/academy', label: '학원 코드', icon: '🔑', type: 'default' as const, show: true },
    ...(isOwner ? [
      { path: '/admin/billing', label: '결제 관리', icon: '💳', type: 'default' as const, show: true },
      { path: '/admin/settings', label: '학원 설정', icon: '⚙️', type: 'default' as const, show: true },
    ] : []),
  ].filter(Boolean) as Array<{ path: string; label: string; icon: string; type: 'default' | 'middle'; show: boolean }>

  const handleLogout = () => {
    setToken({ accessToken: undefined, expiresIn: undefined })
    setAcademy({ academyId: undefined, academyCode: undefined, academyName: undefined, ownerName: undefined, role: 'OWNER', teacherId: undefined, plans: ['high', 'middle'], enabledMenus: [] })
    navigate('/admin/login')
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-ink">

      {/* 사이드바 */}
      <div
        className="bg-white border-r border-line flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out"
        style={{ width: collapsed ? '60px' : '180px' }}
      >
        <div className="px-2.5 pt-4 pb-3 border-b border-line-light overflow-hidden">
          <div className="flex items-center mb-2.5" style={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
            {collapsed ? (
              <button onClick={() => setCollapsed(false)}
                className="w-9 h-9 rounded-lg hover:bg-blue-50 flex items-center justify-center text-ink-secondary hover:text-blue-700 transition-all">
                <SidebarIcon size={20} />
              </button>
            ) : (
              <>
                <span className="text-[14px] font-extrabold tracking-tight cursor-pointer whitespace-nowrap"
                  style={{ color: '#1E3A8A' }} onClick={() => navigate('/admin')}>
                  비커스
                </span>
                <button onClick={() => setCollapsed(true)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-ink-secondary hover:text-ink transition-all">
                  <SidebarIcon size={18} />
                </button>
              </>
            )}
          </div>

          {academy.academyName && (
            <div className="flex items-center justify-center">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }} />
              {logoUrl ? (
                <div onClick={() => isOwner && fileRef.current?.click()}
                  className="rounded-lg overflow-hidden bg-white flex items-center justify-center border transition-all duration-300"
                  style={{ width: collapsed ? '36px' : '64px', height: collapsed ? '36px' : '64px', borderColor: 'rgba(147, 197, 253, 0.5)', cursor: isOwner ? 'pointer' : 'default' }}>
                  <img src={logoUrl} alt="학원 로고" className="w-full h-full object-cover" />
                </div>
              ) : (
                <button onClick={() => isOwner && fileRef.current?.click()} disabled={!isOwner || uploading}
                  className="rounded-lg flex flex-col items-center justify-center border-2 border-dashed transition-all duration-300"
                  style={{ width: collapsed ? '36px' : '64px', height: collapsed ? '36px' : '64px', borderColor: 'rgba(147, 197, 253, 0.5)', background: '#F8FAFC', cursor: isOwner ? 'pointer' : 'default' }}>
                  {uploading ? (
                    <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : collapsed ? (
                    <span className="text-[12px]">📷</span>
                  ) : (
                    <>
                      <span className="text-[16px] mb-0.5">📷</span>
                      <span className="text-[9px] font-bold text-blue-700">{isOwner ? '로고 추가' : '로고 없음'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 px-1.5 py-2 overflow-hidden">
          {menus.map(m => {
            const isActive = location.pathname === m.path || (m.path !== '/admin' && location.pathname.startsWith(m.path))
            const isMiddle = m.type === 'middle'
            const accent = isMiddle ? '#059669' : '#2563EB'
            const accentDark = isMiddle ? '#065F46' : '#1E3A8A'
            const accentBg = isMiddle ? '#ECFDF5' : '#EFF6FF'
            const accentShadow = isMiddle ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.12)'
            const isLocked = isAcademyNotRegistered || isPendingReview || isRejected

            return (
              <div key={m.path}
                onClick={() => { if (isLocked) return; navigate(m.path) }}
                title={collapsed ? m.label : (isLocked ? '학원 승인 후 사용 가능해요' : '')}
                className="flex items-center rounded-lg mb-0.5 transition-all"
                style={{
                  background: isActive && !isLocked ? accentBg : 'transparent',
                  color: isLocked ? '#D1D5DB' : (isActive ? accentDark : '#6B7280'),
                  fontWeight: isActive ? 700 : 500,
                  boxShadow: isActive && !isLocked ? `0 2px 6px ${accentShadow}` : 'none',
                  padding: collapsed ? '8px 0' : '8px 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: collapsed ? 0 : '8px',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!isLocked && !isActive) { e.currentTarget.style.background = accentBg; e.currentTarget.style.color = accentDark } }}
                onMouseLeave={e => { if (!isLocked && !isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280' } }}
              >
                <span className="text-[14px] flex-shrink-0">{m.icon}</span>
                {!collapsed && <span className="text-[12px] whitespace-nowrap">{m.label}</span>}
                {!collapsed && isActive && !isLocked && <div className="ml-auto w-1 h-3.5 rounded-full" style={{ background: accent }} />}
              </div>
            )
          })}
        </nav>

        <div className="px-1.5 py-2 border-t border-line-light">
          <button onClick={handleLogout} title={collapsed ? '로그아웃' : ''}
            className="w-full flex items-center rounded-lg text-ink-secondary text-[12px] font-medium hover:bg-red-50 hover:text-red-500 transition-colors"
            style={{ padding: collapsed ? '8px 0' : '8px 10px', justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : '8px' }}>
            <span className="text-[14px] flex-shrink-0">🚪</span>
            {!collapsed && <span className="whitespace-nowrap">로그아웃</span>}
          </button>
        </div>

        {!collapsed && (
          <div className="px-3 pb-2 text-[9px] text-ink-muted text-center font-medium">© 2026 B-KURS</div>
        )}
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="h-12 bg-white border-b border-line flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            {isPendingReview ? (
              <span className="text-[12px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                승인 대기 중
              </span>
            ) : isRejected ? (
              <span className="text-[12px] font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                ❌ 신청 거부됨
              </span>
            ) : academy.academyName ? (
              <span className="text-[13px] font-bold px-3 py-1 rounded-full"
                style={{ color: '#1E3A8A', background: '#EFF6FF', border: '1px solid rgba(147, 197, 253, 0.6)' }}>
                🏫 {academy.academyName}
              </span>
            ) : (
              <span className="text-[12px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                ⏳ 학원 등록 필요
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-ink">{academy.ownerName}님</span>
            <button onClick={handleLogout}
              className="text-[12px] font-medium text-ink-secondary px-3 py-1.5 border border-line rounded-md hover:border-blue-300 hover:text-blue-700 transition-all">
              로그아웃
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {isAcademyNotRegistered ? (
            <OwnerSetupForm />
          ) : statusLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-2 border-gray-200 rounded-full animate-spin mb-3" style={{ borderTopColor: '#2563EB' }} />
                <div className="text-[13px] font-bold text-ink-secondary">학원 정보 확인 중...</div>
              </div>
            </div>
          ) : isPendingReview ? (
            <PendingReviewScreen />
          ) : isRejected ? (
            <RejectedScreen />
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────
// 학원 코드 자동 생성
// ───────────────────────────────────────────────
const generateAcademyCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const nums = '0123456789'
  let code = 'B-KURS-'
  for (let i = 0; i < 2; i++) code += chars[Math.floor(Math.random() * chars.length)]
  for (let i = 0; i < 2; i++) code += nums[Math.floor(Math.random() * nums.length)]
  code += '-'
  for (let i = 0; i < 4; i++) code += nums[Math.floor(Math.random() * nums.length)]
  return code
}

// ───────────────────────────────────────────────
// 플랜별 기본 메뉴
// ───────────────────────────────────────────────
const HIGH_MENU_KEYS = [
  'high.roadmap', 'high.topic', 'high.book', 'high.record',
  'high.expect', 'high.past', 'high.simulation', 'high.presentation',
  'high.major', 'high.mockexam',
]

const MIDDLE_MENU_KEYS = [
  'middle.roadmap', 'middle.lesson', 'middle.homework', 'middle.suhaeng',
  'middle.record', 'middle.book', 'middle.debate', 'middle.expect',
  'middle.past', 'middle.simulation', 'middle.presentation',
]

const getDefaultMenus = (plan: string): string[] => {
  if (plan === '고등') return HIGH_MENU_KEYS
  if (plan === '중등') return MIDDLE_MENU_KEYS
  return []
}

// ───────────────────────────────────────────────
// 원장 학원 등록 폼 + 승인 대기 모달
// ───────────────────────────────────────────────
function OwnerSetupForm() {
  const setAcademy = useSetAtom(academyState)

  const [name, setName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [region, setRegion] = useState('')
  const [phone, setPhone] = useState('')
  const [managerName, setManagerName] = useState('')
  const [plan, setPlan] = useState<'고등' | '중등' | ''>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registeredAcademy, setRegisteredAcademy] = useState<{
    name: string
    code: string
    plan: string
  } | null>(null)

  const PLAN_OPTIONS = [
    { key: '고등', label: '🎓 고등', desc: '고등학생 진학 컨설팅' },
    { key: '중등', label: '🌱 중등', desc: '중학생 학습 관리' },
  ] as const

  const formatBusinessNumber = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 10)
    if (nums.length <= 3) return nums
    if (nums.length <= 5) return `${nums.slice(0, 3)}-${nums.slice(3)}`
    return `${nums.slice(0, 3)}-${nums.slice(3, 5)}-${nums.slice(5)}`
  }

  const isValidBusinessNumber = (value: string) => {
    const nums = value.replace(/\D/g, '')
    return nums.length === 10
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('학원명을 입력해주세요.'); return }
    if (!businessNumber.trim()) { setError('사업자등록번호를 입력해주세요.'); return }
    if (!isValidBusinessNumber(businessNumber)) { setError('사업자등록번호 10자리를 정확히 입력해주세요.'); return }
    if (!region.trim()) { setError('지역을 입력해주세요.'); return }
    if (!phone.trim()) { setError('학원 연락처를 입력해주세요.'); return }
    if (!managerName.trim()) { setError('원장님 이름을 입력해주세요.'); return }
    if (!plan) { setError('플랜을 선택해주세요.'); return }

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('로그인 정보를 확인할 수 없어요. 다시 로그인해주세요.')
        setLoading(false)
        return
      }

      // ⭐ 이미 신청한 학원 체크 (중복 신청 방지)
      const { data: existingAcademy } = await supabase
        .from('academies')
        .select('id, name, status')
        .eq('manager_email', user.email)
        .maybeSingle()

      if (existingAcademy) {
        setError(`이미 신청한 학원이 있어요: ${existingAcademy.name}`)
        setLoading(false)
        return
      }

      const { data: existingBiz } = await supabase
        .from('academies')
        .select('id')
        .eq('business_number', businessNumber)
        .maybeSingle()

      if (existingBiz) {
        setError('이미 등록된 사업자등록번호예요. 본사로 문의해주세요.')
        setLoading(false)
        return
      }

      let academyCode = ''
      let attempts = 0
      while (attempts < 5) {
        const candidate = generateAcademyCode()
        const { data: existing } = await supabase
          .from('academies')
          .select('id')
          .eq('academy_code', candidate)
          .maybeSingle()
        if (!existing) {
          academyCode = candidate
          break
        }
        attempts++
      }
      if (!academyCode) {
        setError('학원 코드 생성에 실패했어요. 다시 시도해주세요.')
        setLoading(false)
        return
      }

      const now = new Date()
      const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const enabledMenus = getDefaultMenus(plan)

      const { data: academy, error: insertErr } = await supabase
        .from('academies')
        .insert({
          name: name.trim(),
          academy_code: academyCode,
          business_number: businessNumber,
          business_verified: false,
          region: region.trim(),
          phone: phone.trim(),
          manager_name: managerName.trim(),
          manager_email: user.email,
          plan: plan,
          status: 'pending_review',
          trial_start_at: now.toISOString(),
          trial_end_at: trialEnd.toISOString(),
          enabled_menus: enabledMenus,
        })
        .select('id, name, academy_code, enabled_menus')
        .single()

      if (insertErr) throw insertErr
      if (!academy) throw new Error('학원 등록에 실패했어요.')

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          academy_id: academy.id,
        })
        .eq('id', user.id)

      if (profileErr) throw profileErr

      setAcademy({
        academyId: academy.id,
        academyCode: academy.academy_code,
        academyName: academy.name,
        ownerName: managerName.trim(),
        role: 'OWNER',
        teacherId: undefined,
        plans: plan === '고등' ? ['high'] : ['middle'],
        enabledMenus: academy.enabled_menus || [],
      })

      setRegisteredAcademy({
        name: academy.name,
        code: academy.academy_code,
        plan: plan,
      })
      setShowSuccessModal(true)
      setLoading(false)

    } catch (e: any) {
      console.error('[OwnerSetupForm]', e)
      setError('등록 중 오류가 발생했어요: ' + (e.message || ''))
      setLoading(false)
    }
  }

  const handleStartService = () => {
    window.location.reload()
  }

  return (
    <>
      <div className="h-full overflow-y-auto flex items-center justify-center p-3"
        style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #FFFFFF 50%, #EFF6FF 100%)' }}>
        <div className="max-w-[380px] w-full my-2">

          <div className="bg-white rounded-xl p-4"
            style={{ border: '1px solid #BFDBFE', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.08)' }}>

            <div className="mb-2.5">
              <label className="text-[10px] font-bold text-ink-secondary block mb-1 uppercase tracking-wider">학원명 *</label>
              <input
                type="text"
                placeholder="예: 서울 비커스 학원"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                disabled={loading}
                className="w-full border border-line rounded-lg px-3 py-1.5 text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mb-2.5">
              <label className="text-[10px] font-bold text-ink-secondary block mb-1 uppercase tracking-wider">사업자등록번호 *</label>
              <input
                type="text"
                placeholder="123-45-67890"
                value={businessNumber}
                onChange={e => { setBusinessNumber(formatBusinessNumber(e.target.value)); setError('') }}
                disabled={loading}
                className="w-full border border-line rounded-lg px-3 py-1.5 text-[14px] font-bold tracking-wider outline-none transition-all placeholder:text-ink-muted placeholder:font-medium placeholder:tracking-normal focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mb-2.5">
              <label className="text-[10px] font-bold text-ink-secondary block mb-1 uppercase tracking-wider">원장님 이름 *</label>
              <input
                type="text"
                placeholder="예: 홍길동"
                value={managerName}
                onChange={e => { setManagerName(e.target.value); setError('') }}
                disabled={loading}
                className="w-full border border-line rounded-lg px-3 py-1.5 text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mb-2.5">
              <label className="text-[10px] font-bold text-ink-secondary block mb-1 uppercase tracking-wider">지역 (주소) *</label>
              <input
                type="text"
                placeholder="예: 서울 강남구 역삼동"
                value={region}
                onChange={e => { setRegion(e.target.value); setError('') }}
                disabled={loading}
                className="w-full border border-line rounded-lg px-3 py-1.5 text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mb-2.5">
              <label className="text-[10px] font-bold text-ink-secondary block mb-1 uppercase tracking-wider">학원 연락처 *</label>
              <input
                type="tel"
                placeholder="예: 02-1234-5678"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError('') }}
                disabled={loading}
                className="w-full border border-line rounded-lg px-3 py-1.5 text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mb-3">
              <label className="text-[10px] font-bold text-ink-secondary block mb-1 uppercase tracking-wider">플랜 선택 *</label>
              <div className="grid grid-cols-2 gap-2">
                {PLAN_OPTIONS.map(p => {
                  const isActive = plan === p.key
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => { setPlan(p.key); setError('') }}
                      disabled={loading}
                      className="px-3 py-2 rounded-lg border-2 text-center transition-all"
                      style={{
                        borderColor: isActive ? '#2563EB' : '#E5E7EB',
                        background: isActive ? '#EFF6FF' : '#fff',
                      }}
                    >
                      <div className="text-[13px] font-extrabold" style={{ color: isActive ? '#1E3A8A' : '#1a1a1a' }}>
                        {p.label}
                      </div>
                      <div className="text-[10px] font-medium text-ink-secondary mt-0.5 leading-tight">{p.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <div className="text-[11px] text-red-500 font-semibold mb-2 flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 text-white rounded-lg text-[13px] font-bold transition-all disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
              }}>
              {loading ? '신청 중...' : '🎁 1개월 무료 체험 신청하기'}
            </button>
          </div>
        </div>
      </div>

      {showSuccessModal && registeredAcademy && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl w-full max-w-[420px] overflow-hidden"
            style={{ boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)' }}>

            <div className="px-6 py-6 text-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}>
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }} />
              <div className="relative">
                <div className="text-4xl mb-2">⏳</div>
                <div className="text-[18px] font-extrabold text-white tracking-tight mb-0.5">승인 대기 중</div>
                <div className="text-[12px] font-semibold text-white/90">본사에서 사업자 정보를 검토하고 있어요</div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
                <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">신청한 학원</div>
                <div className="text-[14px] font-extrabold text-ink mb-2">{registeredAcademy.name}</div>
                <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">학원 코드 (승인 후 활성화)</div>
                <div className="px-3 py-2 bg-white rounded-lg border border-blue-200 text-[13px] font-extrabold font-mono tracking-wider"
                  style={{ color: '#1E3A8A' }}>
                  {registeredAcademy.code}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <div className="text-[11px] font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                  <span></span> 안내사항
                </div>
                <div className="text-[11px] text-amber-800 leading-[1.7]">
                  · 본사에서 사업자등록번호를 검증합니다<br />
                  · 보통 <strong>1~2일 이내</strong>에 승인돼요<br />
                  · 승인 완료 시 <strong>1개월 무료 체험</strong>이 시작됩니다<br />
                  · 문의: <strong>company@seumlearning.com</strong>
                </div>
              </div>

              <button onClick={handleStartService}
                className="w-full py-3 text-white rounded-xl text-[14px] font-extrabold transition-all hover:-translate-y-px"
                style={{ background: 'linear-gradient(135deg, #6B7280, #4B5563)', boxShadow: '0 8px 20px rgba(75, 85, 99, 0.3)' }}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ───────────────────────────────────────────────
// 승인 대기 화면
// ───────────────────────────────────────────────
function PendingReviewScreen() {
  const academy = useAtomValue(academyState)
  const setToken = useSetAtom(tokenState)
  const setAcademy = useSetAtom(academyState)
  const navigate = useNavigate()

  const [academyInfo, setAcademyInfo] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  React.useEffect(() => {
    const fetchInfo = async () => {
      if (!academy.academyId) return
      const { data } = await supabase
        .from('academies')
        .select('*')
        .eq('id', academy.academyId)
        .maybeSingle()
      if (data) setAcademyInfo(data)
    }
    fetchInfo()
  }, [academy.academyId])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setToken({ accessToken: undefined, expiresIn: undefined })
    setAcademy({ academyId: undefined, academyCode: undefined, academyName: undefined, ownerName: undefined, role: 'OWNER', teacherId: undefined, plans: ['high', 'middle'], enabledMenus: [] })
    navigate('/admin/login')
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => { window.location.reload() }, 800)
  }

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FFFFFF 50%, #FED7AA 100%)' }}>
      <div className="max-w-[480px] w-full my-4">

        <div className="bg-white rounded-3xl overflow-hidden"
          style={{ border: '1px solid #FCD34D', boxShadow: '0 12px 40px rgba(217, 119, 6, 0.15)' }}>

          <div className="px-6 py-7 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}>
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }} />
            <div className="relative">
              <div className="text-5xl mb-3">⏳</div>
              <div className="text-[22px] font-extrabold text-white tracking-tight mb-1">승인 대기 중</div>
              <div className="text-[13px] font-semibold text-white/90">본사에서 사업자 정보를 검토하고 있어요</div>
            </div>
          </div>

          <div className="px-6 py-5">

            {academyInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
                <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2">📋 신청 정보</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[12px]"><span className="text-ink-muted">학원명</span><span className="font-bold text-ink">{academyInfo.name}</span></div>
                  <div className="flex justify-between text-[12px]"><span className="text-ink-muted">사업자번호</span><span className="font-bold font-mono text-ink">{academyInfo.business_number}</span></div>
                  <div className="flex justify-between text-[12px]"><span className="text-ink-muted">플랜</span><span className="font-bold text-ink">{academyInfo.plan}</span></div>
                  <div className="flex justify-between text-[12px]"><span className="text-ink-muted">신청일</span><span className="font-bold text-ink">{academyInfo.created_at && new Date(academyInfo.created_at).toLocaleDateString('ko-KR')}</span></div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <div className="text-[12px] font-bold text-amber-900 mb-2 flex items-center gap-1.5"><span>💡</span> 안내사항</div>
              <div className="text-[11px] text-amber-800 leading-[1.8]">
                · 보통 <strong>1~2일 이내</strong>에 승인돼요<br />
                · 승인 완료 시 <strong>1개월 무료 체험</strong>이 시작됩니다<br />
                · 승인 후 새로고침하면 정상 이용 가능해요<br />
                · 문의: <strong>company@masterway.co.kr</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleLogout}
                className="flex-1 py-3 bg-gray-100 text-ink-secondary rounded-xl text-[13px] font-bold hover:bg-gray-200 transition-all">
                로그아웃
              </button>
              <button onClick={handleRefresh} disabled={refreshing}
                className="flex-1 py-3 text-white rounded-xl text-[13px] font-bold transition-all hover:-translate-y-px disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)' }}>
                {refreshing ? '확인 중...' : ' 승인 확인'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────
// 거부됨 화면 (재신청 가능)
// ───────────────────────────────────────────────
function RejectedScreen() {
  const academy = useAtomValue(academyState)
  const setToken = useSetAtom(tokenState)
  const setAcademy = useSetAtom(academyState)
  const navigate = useNavigate()

  const [academyInfo, setAcademyInfo] = useState<any>(null)
  const [reapplyLoading, setReapplyLoading] = useState(false)

  React.useEffect(() => {
    const fetchInfo = async () => {
      if (!academy.academyId) return
      const { data } = await supabase
        .from('academies')
        .select('*')
        .eq('id', academy.academyId)
        .maybeSingle()
      if (data) setAcademyInfo(data)
    }
    fetchInfo()
  }, [academy.academyId])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setToken({ accessToken: undefined, expiresIn: undefined })
    setAcademy({ academyId: undefined, academyCode: undefined, academyName: undefined, ownerName: undefined, role: 'OWNER', teacherId: undefined, plans: ['high', 'middle'], enabledMenus: [] })
    navigate('/admin/login')
  }

  const handleReapply = async () => {
    if (!academy.academyId) return
    if (!confirm('학원 정보를 다시 입력하시겠어요?\n\n기존 신청 정보는 삭제돼요.')) return

    setReapplyLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인 정보를 확인할 수 없어요.')

      await supabase.from('profiles').update({ academy_id: null }).eq('id', user.id)
      await supabase.from('academies').delete().eq('id', academy.academyId)

      setAcademy({
        academyId: undefined, academyCode: undefined, academyName: undefined,
        ownerName: undefined, role: 'OWNER', teacherId: undefined,
        plans: ['high', 'middle'], enabledMenus: [],
      })

      window.location.reload()

    } catch (e: any) {
      console.error('[handleReapply]', e)
      alert('재신청 처리 중 오류: ' + (e.message || ''))
      setReapplyLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #FEE2E2 0%, #FFFFFF 50%, #FECACA 100%)' }}>
      <div className="max-w-[480px] w-full my-4">

        <div className="bg-white rounded-3xl overflow-hidden"
          style={{ border: '1px solid #FCA5A5', boxShadow: '0 12px 40px rgba(220, 38, 38, 0.15)' }}>

          <div className="px-6 py-7 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}>
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }} />
            <div className="relative">
              <div className="text-5xl mb-3"></div>
              <div className="text-[22px] font-extrabold text-white tracking-tight mb-1">신청이 거부됐어요</div>
              <div className="text-[13px] font-semibold text-white/90">본사 검토 결과 승인되지 않았어요</div>
            </div>
          </div>

          <div className="px-6 py-5">

            {academyInfo?.reject_reason && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3 mb-4">
                <div className="text-[11px] font-bold text-red-900 mb-1.5 flex items-center gap-1.5"><span>📝</span> 거부 사유</div>
                <div className="text-[12px] text-red-800 leading-[1.6] font-medium">{academyInfo.reject_reason}</div>
              </div>
            )}

            {academyInfo && (
              <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-4">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">📋 신청했던 정보</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[12px]"><span className="text-ink-muted">학원명</span><span className="font-bold text-ink">{academyInfo.name}</span></div>
                  <div className="flex justify-between text-[12px]"><span className="text-ink-muted">사업자번호</span><span className="font-bold font-mono text-ink">{academyInfo.business_number}</span></div>
                  <div className="flex justify-between text-[12px]"><span className="text-ink-muted">거부일</span><span className="font-bold text-ink">{academyInfo.rejected_at && new Date(academyInfo.rejected_at).toLocaleDateString('ko-KR')}</span></div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <div className="text-[12px] font-bold text-amber-900 mb-2 flex items-center gap-1.5"><span>💡</span> 안내사항</div>
              <div className="text-[11px] text-amber-800 leading-[1.8]">
                · 위 사유를 확인하고 정보를 정정해서 다시 신청해주세요<br />
                · 사업자등록번호가 정확한지 확인해주세요<br />
                · 추가 문의: <strong>company@masterway.co.kr</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleLogout}
                className="flex-1 py-3 bg-gray-100 text-ink-secondary rounded-xl text-[13px] font-bold hover:bg-gray-200 transition-all">
                로그아웃
              </button>
              <button onClick={handleReapply} disabled={reapplyLoading}
                className="flex-1 py-3 text-white rounded-xl text-[13px] font-bold transition-all hover:-translate-y-px disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)' }}>
                {reapplyLoading ? '처리 중...' : '🔄 다시 신청하기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}