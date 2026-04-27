import { useState } from 'react'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

// 🏆 역할 정의
const ROLES: Record<string, { label: string; icon: string; color: string; bg: string; border: string; desc: string; permissions: string[] }> = {
  super_admin: {
    label: '슈퍼 관리자',
    icon: '🏆',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#C4B5FD',
    desc: '모든 권한 · 시스템 최고 권한자',
    permissions: ['all'],
  },
  operator: {
    label: '운영 매니저',
    icon: '👨‍💼',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#93C5FD',
    desc: '학원 운영 관리 · 공지 발송',
    permissions: ['academy.view', 'academy.update', 'notice.send', 'audit.view', 'data.view'],
  },
  sales: {
    label: '영업팀',
    icon: '💼',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#6EE7B7',
    desc: '학원 추가 · 매출 조회',
    permissions: ['academy.view', 'academy.create', 'billing.view'],
  },
  cs: {
    label: 'CS팀',
    icon: '📞',
    color: '#F59E0B',
    bg: '#FEF3C7',
    border: '#FCD34D',
    desc: '비밀번호 재설정 · 문의 응대',
    permissions: ['academy.view', 'password.reset', 'notice.send'],
  },
  finance: {
    label: '재무팀',
    icon: '💰',
    color: '#EC4899',
    bg: '#FCE7F3',
    border: '#F9A8D4',
    desc: '환불 처리 · 세금계산서 발행',
    permissions: ['billing.view', 'billing.refund', 'academy.view'],
  },
  analyst: {
    label: '분석팀',
    icon: '🔍',
    color: '#6B7280',
    bg: '#F3F4F6',
    border: '#D1D5DB',
    desc: '데이터 조회 · 리포트 생성 (읽기 전용)',
    permissions: ['academy.view', 'data.view', 'billing.view'],
  },
}

// 🎯 전체 권한 목록
const ALL_PERMISSIONS = [
  { category: '🏫 학원 관리', items: [
    { key: 'academy.view', label: '학원 조회', risk: 'low' },
    { key: 'academy.create', label: '학원 추가', risk: 'mid' },
    { key: 'academy.update', label: '학원 수정', risk: 'mid' },
    { key: 'academy.delete', label: '학원 삭제', risk: 'high' },
    { key: 'academy.suspend', label: '계정 정지', risk: 'high' },
  ]},
  { category: '🔐 보안/계정', items: [
    { key: 'password.reset', label: '비밀번호 재설정', risk: 'mid' },
    { key: 'code.reissue', label: '학원 코드 재발급', risk: 'mid' },
    { key: 'plan.change', label: '플랜 변경', risk: 'mid' },
  ]},
  { category: '💰 재무', items: [
    { key: 'billing.view', label: '매출 조회', risk: 'low' },
    { key: 'billing.refund', label: '환불 처리', risk: 'high' },
    { key: 'billing.tax', label: '세금계산서 발행', risk: 'mid' },
  ]},
  { category: '📢 소통', items: [
    { key: 'notice.send', label: '공지 발송', risk: 'low' },
    { key: 'notice.urgent', label: '긴급 공지 발송', risk: 'mid' },
  ]},
  { category: '📊 데이터', items: [
    { key: 'data.view', label: '데이터 조회', risk: 'low' },
    { key: 'data.export', label: '데이터 내보내기', risk: 'mid' },
    { key: 'data.anonymize', label: '익명화 데이터 접근', risk: 'high' },
  ]},
  { category: '📝 시스템', items: [
    { key: 'audit.view', label: '감사 로그 조회', risk: 'low' },
    { key: 'staff.manage', label: '직원 관리', risk: 'high' },
    { key: 'staff.permission', label: '권한 관리', risk: 'high' },
  ]},
]

const INIT_STAFF = [
  { id: 1, name: '김대표', email: 'ceo@BIKUS.com', phone: '010-1234-5678', role: 'super_admin', status: 'active', joinDate: '2024.01.15', lastLogin: '2025.04.20 14:35', avatarColor: '#7C3AED' },
  { id: 2, name: '이매니저', email: 'manager@BIKUS.com', phone: '010-2345-6789', role: 'operator', status: 'active', joinDate: '2024.02.01', lastLogin: '2025.04.20 14:25', avatarColor: '#2563EB' },
  { id: 3, name: '박영업', email: 'sales1@BIKUS.com', phone: '010-3456-7890', role: 'sales', status: 'active', joinDate: '2024.02.10', lastLogin: '2025.04.20 13:55', avatarColor: '#059669' },
  { id: 4, name: '정영업', email: 'sales2@BIKUS.com', phone: '010-4567-8901', role: 'sales', status: 'active', joinDate: '2024.03.15', lastLogin: '2025.04.20 12:20', avatarColor: '#10B981' },
  { id: 5, name: '김CS', email: 'cs1@BIKUS.com', phone: '010-5678-9012', role: 'cs', status: 'active', joinDate: '2024.04.01', lastLogin: '2025.04.20 14:30', avatarColor: '#F59E0B' },
  { id: 6, name: '최CS', email: 'cs2@BIKUS.com', phone: '010-6789-0123', role: 'cs', status: 'invited', joinDate: '2025.04.18', lastLogin: '-', avatarColor: '#FBBF24' },
  { id: 7, name: '정재무', email: 'finance@BIKUS.com', phone: '010-7890-1234', role: 'finance', status: 'active', joinDate: '2024.05.10', lastLogin: '2025.04.20 14:10', avatarColor: '#EC4899' },
  { id: 8, name: '강분석', email: 'analyst@BIKUS.com', phone: '010-8901-2345', role: 'analyst', status: 'active', joinDate: '2024.06.20', lastLogin: '2025.04.20 13:40', avatarColor: '#6B7280' },
]

// 🔐 임시 비밀번호 자동 생성
const generateTempPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const nums = '23456789'
  const special = '@#$!'
  let pw = 'BIKUS'
  pw += upper[Math.floor(Math.random() * upper.length)]
  pw += lower[Math.floor(Math.random() * lower.length)]
  for (let i = 0; i < 4; i++) pw += nums[Math.floor(Math.random() * nums.length)]
  pw += special[Math.floor(Math.random() * special.length)]
  return pw
}

export default function MasterStaff() {
  const [staff, setStaff] = useState<any[]>(() => {
    const saved = localStorage.getItem('master_staff')
    return saved ? JSON.parse(saved) : INIT_STAFF
  })

  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showPermModal, setShowPermModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [inviteResult, setInviteResult] = useState<any>(null)

  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'cs',
  })

  const saveStaff = (list: any[]) => {
    localStorage.setItem('master_staff', JSON.stringify(list))
    setStaff(list)
  }

  const filtered = staff.filter(s => {
    if (roleFilter !== 'all' && s.role !== roleFilter) return false
    if (search && !s.name.includes(search) && !s.email.includes(search)) return false
    return true
  })

  // 역할별 통계
  const roleStats = Object.keys(ROLES).map(k => ({
    key: k,
    ...ROLES[k],
    count: staff.filter(s => s.role === k).length,
  }))

  // ============ 1. 직원 초대 ============
  const openInviteModal = () => {
    setInviteForm({ name: '', email: '', phone: '', role: 'cs' })
    setInviteResult(null)
    setShowInviteModal(true)
  }

  const handleInvite = () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      alert('이름과 이메일은 필수예요!')
      return
    }

    const newId = Math.max(...staff.map(s => s.id), 0) + 1
    const tempPassword = generateTempPassword()
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.')

    const newStaff = {
      id: newId,
      name: inviteForm.name,
      email: inviteForm.email,
      phone: inviteForm.phone || '-',
      role: inviteForm.role,
      status: 'invited',
      joinDate: today,
      lastLogin: '-',
      avatarColor: ROLES[inviteForm.role].color,
      tempPassword,
    }

    saveStaff([...staff, newStaff])
    setInviteResult(newStaff)
  }

  const closeInviteModal = () => {
    setShowInviteModal(false)
    setInviteResult(null)
  }

  // ============ 2. 권한 수정 ============
  const openPermModal = (s: any) => {
    setSelectedStaff(s)
    setShowPermModal(true)
  }

  const handleRoleChange = (newRole: string) => {
    if (!selectedStaff) return
    if (newRole === selectedStaff.role) return

    const updated = staff.map(s =>
      s.id === selectedStaff.id ? { ...s, role: newRole, avatarColor: ROLES[newRole].color } : s
    )
    saveStaff(updated)
    setSelectedStaff({ ...selectedStaff, role: newRole })
    alert(`✅ ${selectedStaff.name}의 역할이 [${ROLES[newRole].label}]로 변경됐어요!`)
  }

  const toggleStatus = (s: any) => {
    const newStatus = s.status === 'active' ? 'suspended' : 'active'
    const updated = staff.map(x =>
      x.id === s.id ? { ...x, status: newStatus } : x
    )
    saveStaff(updated)
    alert(newStatus === 'active' ? `✅ ${s.name} 계정이 활성화됐어요!` : `🚫 ${s.name} 계정이 비활성화됐어요.`)
  }

  // ============ 3. 직원 삭제 ============
  const openDeleteModal = (s: any) => {
    setSelectedStaff(s)
    setShowDeleteModal(true)
  }

  const handleDelete = () => {
    if (!selectedStaff) return
    if (selectedStaff.role === 'super_admin') {
      alert('🏆 슈퍼 관리자는 삭제할 수 없어요!')
      return
    }
    saveStaff(staff.filter(s => s.id !== selectedStaff.id))
    setShowDeleteModal(false)
    setSelectedStaff(null)
    alert('🗑️ 직원이 삭제됐어요.')
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    alert(`✅ ${label}이(가) 복사됐어요!`)
  }

  return (
    <div className="px-8 py-7 min-h-full">

      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">👥</span>
            <div className="text-[22px] font-extrabold text-ink tracking-tight">직원 / 권한 관리</div>
          </div>
          <div className="text-[13px] font-medium text-ink-secondary">
            본사 직원을 관리하고 역할별 권한을 설정하세요.
          </div>
        </div>

        <button
          onClick={openInviteModal}
          className="h-10 px-5 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
          style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
        >
          ➕ 직원 초대
        </button>
      </div>

      {/* 역할별 통계 카드 */}
      <div className="grid grid-cols-6 max-md:grid-cols-3 max-sm:grid-cols-2 gap-2.5 mb-5">
        {roleStats.map(r => (
          <button
            key={r.key}
            onClick={() => setRoleFilter(roleFilter === r.key ? 'all' : r.key)}
            className="rounded-xl px-3 py-3 text-left transition-all hover:-translate-y-0.5"
            style={{
              background: roleFilter === r.key ? r.bg : '#fff',
              border: `2px solid ${roleFilter === r.key ? r.color : '#E5E7EB'}`,
              boxShadow: roleFilter === r.key ? `0 4px 12px ${r.color}30` : '0 2px 8px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{r.icon}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: r.color }}>
                {r.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <div className="text-[22px] font-extrabold tracking-tight" style={{ color: r.color }}>{r.count}</div>
              <div className="text-[11px] font-semibold" style={{ color: r.color, opacity: 0.7 }}>명</div>
            </div>
          </button>
        ))}
      </div>

      {/* 검색 + 필터 */}
      <div className="bg-white border border-line rounded-2xl px-5 py-4 mb-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex gap-2.5 items-center flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 이름, 이메일로 검색..."
              className="w-full h-10 px-4 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
              onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
              onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => setRoleFilter('all')}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
              style={{
                borderColor: roleFilter === 'all' ? THEME.accent : '#E5E7EB',
                background: roleFilter === 'all' ? THEME.accentBg : '#fff',
                color: roleFilter === 'all' ? THEME.accentDark : '#6B7280',
              }}
            >
              전체 ({staff.length})
            </button>
          </div>

          <div className="text-[11px] font-medium text-ink-secondary ml-auto">
            검색 결과: <span className="font-extrabold" style={{ color: THEME.accent }}>{filtered.length}명</span>
          </div>
        </div>
      </div>

      {/* 직원 테이블 */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-ink-muted">
            <div className="text-4xl mb-3">👥</div>
            <div className="text-[14px] font-bold">조건에 맞는 직원이 없어요</div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC]">
                {['이름', '이메일', '역할', '상태', '가입일', '마지막 로그인', '작업'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const role = ROLES[s.role]
                return (
                  <tr
                    key={s.id}
                    className="transition-colors hover:bg-gray-50"
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                      opacity: s.status === 'suspended' ? 0.5 : 1,
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-extrabold text-white flex-shrink-0"
                          style={{ background: s.avatarColor }}
                        >
                          {s.name[0]}
                        </div>
                        <div>
                          <div className="text-[13px] font-extrabold text-ink tracking-tight">{s.name}</div>
                          <div className="text-[10px] font-medium text-ink-muted">{s.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-ink-secondary">{s.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1"
                        style={{ color: role.color, background: role.bg, border: `1px solid ${role.border}60` }}
                      >
                        <span>{role.icon}</span>
                        {role.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.status === 'active' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-green-700 bg-green-50 border border-green-200">
                          ✓ 활성
                        </span>
                      ) : s.status === 'invited' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-amber-700 bg-amber-50 border border-amber-200">
                          ⏳ 초대중
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-gray-700 bg-gray-100 border border-gray-300">
                          🚫 비활성
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-semibold text-ink-secondary">{s.joinDate}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-ink-muted">{s.lastLogin}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openPermModal(s)}
                          className="h-8 px-2.5 border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                          style={{ color: THEME.accent, borderColor: THEME.accentBorder, background: '#fff' }}
                          onMouseEnter={e => { e.currentTarget.style.background = THEME.accentBg }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                        >
                          🔐 권한
                        </button>
                        <button
                          onClick={() => toggleStatus(s)}
                          disabled={s.role === 'super_admin'}
                          className="h-8 px-2.5 border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{ color: s.status === 'active' ? '#F59E0B' : '#059669', borderColor: '#E5E7EB', background: '#fff' }}
                        >
                          {s.status === 'active' ? '🚫' : '🔓'}
                        </button>
                        <button
                          onClick={() => openDeleteModal(s)}
                          disabled={s.role === 'super_admin'}
                          className="h-8 px-2.5 border rounded-lg text-[11px] font-bold text-red-500 border-red-200 bg-white hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 역할별 권한 매트릭스 */}
      <div className="mt-5 bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="px-6 py-4 border-b border-line">
          <div className="text-[15px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
            📋 역할별 권한 매트릭스
          </div>
          <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
            각 역할이 수행할 수 있는 작업이에요. 권한은 최소한으로 부여하는 게 좋아요.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC]">
                <th className="px-4 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line sticky left-0 bg-[#F8FAFC] z-10 min-w-[200px]">
                  권한
                </th>
                {Object.keys(ROLES).map(k => (
                  <th key={k} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-center border-b border-line" style={{ color: ROLES[k].color }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-base">{ROLES[k].icon}</span>
                      <span className="text-[9px]">{ROLES[k].label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map(cat => (
                <>
                  <tr key={cat.category} className="bg-gray-50">
                    <td colSpan={Object.keys(ROLES).length + 1} className="px-4 py-2 text-[11px] font-bold text-ink-secondary">
                      {cat.category}
                    </td>
                  </tr>
                  {cat.items.map(p => (
                    <tr key={p.key} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 text-[12px] font-semibold text-ink sticky left-0 bg-white border-b border-line">
                        <div className="flex items-center gap-1.5">
                          <span>{p.label}</span>
                          {p.risk === 'high' && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1 rounded">위험</span>}
                          {p.risk === 'mid' && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded">주의</span>}
                        </div>
                      </td>
                      {Object.keys(ROLES).map(rk => {
                        const role = ROLES[rk]
                        const has = role.permissions.includes('all') || role.permissions.includes(p.key)
                        return (
                          <td key={rk} className="px-3 py-2 text-center border-b border-line">
                            {has ? (
                              <span className="text-[14px]" style={{ color: role.color }}>✓</span>
                            ) : (
                              <span className="text-[14px] text-gray-300">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ 직원 초대 모달 ============ */}
      {showInviteModal && (
        <div onClick={closeInviteModal} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[560px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">

            <div className="px-6 py-5 relative overflow-hidden" style={{ background: THEME.gradient }}>
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }} />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">➕ 직원 초대</div>
                  <div className="text-[12px] text-white/80 mt-0.5">
                    {inviteResult ? '초대가 완료됐어요!' : '새 직원에게 계정을 발급해요'}
                  </div>
                </div>
                <button onClick={closeInviteModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>

            {/* 초대 결과 */}
            {inviteResult ? (
              <div className="px-6 py-5">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🎉</span>
                    <div className="text-[14px] font-extrabold text-green-900">직원 초대 완료!</div>
                  </div>
                  <div className="text-[11px] font-medium text-green-700">
                    아래 계정 정보를 직원에게 전달하세요. 첫 로그인시 비밀번호 변경이 강제돼요.
                  </div>
                </div>

                {/* 직원 정보 */}
                <div className="bg-gray-50 rounded-xl px-4 py-3 mb-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">👤 직원</div>
                  <div className="text-[16px] font-extrabold text-ink mb-0.5">{inviteResult.name}</div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: ROLES[inviteResult.role].color, background: ROLES[inviteResult.role].bg }}
                    >
                      {ROLES[inviteResult.role].icon} {ROLES[inviteResult.role].label}
                    </span>
                  </div>
                </div>

                {/* 이메일 */}
                <div className="mb-3">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">✉️ 로그인 이메일</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-[14px] font-bold text-ink">
                      {inviteResult.email}
                    </div>
                    <button
                      onClick={() => copyToClipboard(inviteResult.email, '이메일')}
                      className="h-12 px-3 bg-white border border-line rounded-lg text-[11px] font-bold text-ink-secondary hover:bg-gray-50"
                    >
                      📋
                    </button>
                  </div>
                </div>

                {/* 임시 비밀번호 */}
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">🔐 임시 비밀번호</div>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 px-4 py-3 rounded-xl font-mono text-[16px] font-extrabold tracking-wider border-2"
                      style={{ background: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D' }}
                    >
                      {inviteResult.tempPassword}
                    </div>
                    <button
                      onClick={() => copyToClipboard(inviteResult.tempPassword, '임시 비밀번호')}
                      className="h-12 px-3 bg-amber-500 text-white rounded-lg text-[11px] font-bold hover:bg-amber-600"
                    >
                      📋
                    </button>
                  </div>
                  <div className="text-[10px] font-bold text-amber-700 mt-1.5 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>첫 로그인시 비밀번호 변경이 강제돼요</span>
                  </div>
                </div>

                {/* 이메일 발송 안내 */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
                  <span className="text-lg">✉️</span>
                  <div>
                    <div className="text-[12px] font-bold text-blue-900">초대 이메일이 자동 발송됐어요</div>
                    <div className="text-[11px] font-medium text-blue-700 mt-0.5">
                      <strong>{inviteResult.email}</strong>에 계정 정보가 전송되었어요.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const text = `[비커스 본사 계정 초대]\n\n${inviteResult.name}님, 환영합니다!\n\n역할: ${ROLES[inviteResult.role].label}\n이메일: ${inviteResult.email}\n임시 비밀번호: ${inviteResult.tempPassword}\n\n로그인: https://master.BIKUS.com\n\n첫 로그인시 비밀번호를 반드시 변경해주세요.`
                    copyToClipboard(text, '전체 계정 정보')
                  }}
                  className="w-full h-11 text-white rounded-xl text-[13px] font-bold transition-all hover:-translate-y-px mb-2"
                  style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                >
                  📋 전체 정보 복사 (카톡/이메일 전송용)
                </button>

                <button
                  onClick={closeInviteModal}
                  className="w-full h-11 bg-gray-100 text-ink rounded-lg text-[13px] font-bold hover:bg-gray-200"
                >
                  확인
                </button>
              </div>
            ) : (
              /* 초대 폼 */
              <div className="px-6 py-5">

                {/* 안내 */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">🔐</span>
                    <div>
                      <div className="text-[12px] font-bold text-purple-900 mb-1">자동 생성되는 항목</div>
                      <ul className="text-[11px] font-medium text-purple-700 leading-[1.6] list-disc pl-4">
                        <li><strong>임시 비밀번호</strong> (첫 로그인용)</li>
                        <li>역할별 권한 자동 부여</li>
                        <li>초대 이메일 자동 발송</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">

                  {/* 기본 정보 */}
                  <div>
                    <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">👤 기본 정보</div>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-ink-secondary mb-1 block">이름 *</label>
                        <input
                          value={inviteForm.name}
                          onChange={e => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="예: 김직원"
                          className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                          onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-ink-secondary mb-1 block">이메일 * (로그인 아이디)</label>
                        <input
                          type="email"
                          value={inviteForm.email}
                          onChange={e => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="example@BIKUS.com"
                          className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                          onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-ink-secondary mb-1 block">전화번호</label>
                        <input
                          value={inviteForm.phone}
                          onChange={e => setInviteForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="010-0000-0000"
                          className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                          onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 역할 선택 */}
                  <div>
                    <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">🎯 역할 선택 *</div>
                    <div className="flex flex-col gap-2">
                      {Object.entries(ROLES).filter(([k]) => k !== 'super_admin').map(([k, r]) => {
                        const isActive = inviteForm.role === k
                        return (
                          <button
                            key={k}
                            onClick={() => setInviteForm(prev => ({ ...prev, role: k }))}
                            className="px-4 py-3 rounded-xl border-2 transition-all text-left"
                            style={{
                              borderColor: isActive ? r.color : '#E5E7EB',
                              background: isActive ? r.bg : '#fff',
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{r.icon}</span>
                              <div className="flex-1">
                                <div className="text-[13px] font-extrabold" style={{ color: isActive ? r.color : '#1a1a1a' }}>
                                  {r.label}
                                </div>
                                <div className="text-[11px] font-medium mt-0.5" style={{ color: isActive ? r.color : '#6B7280', opacity: 0.8 }}>
                                  {r.desc}
                                </div>
                              </div>
                              {isActive && (
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ background: r.color }}>✓</div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!inviteResult && (
              <div className="px-6 py-4 border-t border-line flex gap-2">
                <button onClick={closeInviteModal} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50">
                  취소
                </button>
                <button onClick={handleInvite} className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px" style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
                  ➕ 초대 발송
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ 권한 수정 모달 ============ */}
      {showPermModal && selectedStaff && (
        <div onClick={() => setShowPermModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[520px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">

            <div className="px-6 py-5" style={{ background: THEME.gradient }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">🔐 권한 관리</div>
                  <div className="text-[12px] text-white/80 mt-0.5">{selectedStaff.name} · {selectedStaff.email}</div>
                </div>
                <button onClick={() => setShowPermModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>

            <div className="px-6 py-5">
              {/* 현재 역할 */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">현재 역할</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{ROLES[selectedStaff.role].icon}</span>
                  <div>
                    <div className="text-[14px] font-extrabold" style={{ color: ROLES[selectedStaff.role].color }}>
                      {ROLES[selectedStaff.role].label}
                    </div>
                    <div className="text-[11px] font-medium text-ink-muted mt-0.5">
                      {ROLES[selectedStaff.role].desc}
                    </div>
                  </div>
                </div>
              </div>

              {/* 역할 변경 */}
              <div className="mb-4">
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">역할 변경</div>
                <div className="flex flex-col gap-2">
                  {Object.entries(ROLES).map(([k, r]) => {
                    const isActive = selectedStaff.role === k
                    return (
                      <button
                        key={k}
                        onClick={() => handleRoleChange(k)}
                        disabled={isActive}
                        className="px-4 py-3 rounded-xl border-2 transition-all text-left disabled:opacity-60"
                        style={{
                          borderColor: isActive ? r.color : '#E5E7EB',
                          background: isActive ? r.bg : '#fff',
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{r.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <div className="text-[13px] font-extrabold" style={{ color: isActive ? r.color : '#1a1a1a' }}>
                                {r.label}
                              </div>
                              {isActive && <span className="text-[9px] font-bold text-ink-muted bg-white px-1.5 py-0.5 rounded-full border">현재</span>}
                            </div>
                            <div className="text-[10px] font-medium mt-0.5" style={{ color: isActive ? r.color : '#6B7280', opacity: 0.8 }}>
                              {r.desc}
                            </div>
                          </div>
                          {isActive && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ background: r.color }}>✓</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 현재 권한 목록 */}
              <div>
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                  ✨ 부여된 권한 ({ROLES[selectedStaff.role].permissions.includes('all') ? '전체' : ROLES[selectedStaff.role].permissions.length + '개'})
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-wrap gap-1.5">
                  {ROLES[selectedStaff.role].permissions.includes('all') ? (
                    <span
                      className="text-[11px] font-bold px-2 py-1 rounded-full"
                      style={{ color: '#7C3AED', background: '#F5F3FF', border: '1px solid #C4B5FD60' }}
                    >
                      🏆 모든 권한
                    </span>
                  ) : (
                    ALL_PERMISSIONS.flatMap(cat => cat.items).filter(p => ROLES[selectedStaff.role].permissions.includes(p.key)).map(p => (
                      <span
                        key={p.key}
                        className="text-[10px] font-bold px-2 py-1 rounded-full"
                        style={{ color: ROLES[selectedStaff.role].color, background: ROLES[selectedStaff.role].bg, border: `1px solid ${ROLES[selectedStaff.role].border}60` }}
                      >
                        ✓ {p.label}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line">
              <button onClick={() => setShowPermModal(false)} className="w-full h-11 bg-gray-100 text-ink rounded-lg text-[13px] font-bold hover:bg-gray-200">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 삭제 모달 ============ */}
      {showDeleteModal && selectedStaff && (
        <div onClick={() => setShowDeleteModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[440px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="px-6 py-5 bg-gradient-to-br from-red-500 to-red-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">🗑️ 직원 삭제</div>
                  <div className="text-[12px] text-white/80 mt-0.5">되돌릴 수 없는 작업이에요</div>
                </div>
                <button onClick={() => setShowDeleteModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <div className="text-[13px] font-bold text-red-800 mb-1">⚠️ 삭제 시 영향</div>
                <ul className="text-[11px] font-medium text-red-700 leading-[1.6] list-disc pl-4">
                  <li>해당 직원의 모든 권한 즉시 박탈</li>
                  <li>로그인 불가 (계정 영구 삭제)</li>
                  <li>작업 이력은 감사 로그에 남음</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">삭제 대상</div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-extrabold text-white"
                    style={{ background: selectedStaff.avatarColor }}
                  >
                    {selectedStaff.name[0]}
                  </div>
                  <div>
                    <div className="text-[14px] font-extrabold text-ink">{selectedStaff.name}</div>
                    <div className="text-[11px] font-medium text-ink-muted">{selectedStaff.email} · {ROLES[selectedStaff.role].label}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-line flex gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50">
                취소
              </button>
              <button onClick={handleDelete} className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px" style={{ background: 'linear-gradient(135deg, #DC2626, #991B1B)', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}>
                🗑️ 영구 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}