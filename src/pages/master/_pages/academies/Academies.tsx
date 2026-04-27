import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

const INIT_ACADEMIES = [
  { id: 1, name: '강남 에스엠 학원', code: 'BIKUS-SM01-0001', owner: '강원장', ownerEmail: 'sm@academy.com', ownerPhone: '010-1111-2222', region: '서울 강남', plan: '고등+중등', teachers: 8, students: 87, joined: '2025.04.14', status: 'active', monthlyFee: 870000, unpaidMonths: 0 },
  { id: 2, name: '목동 프리미엄 아카데미', code: 'BIKUS-MD02-0002', owner: '이원장', ownerEmail: 'md@academy.com', ownerPhone: '010-2222-3333', region: '서울 양천', plan: '고등', teachers: 5, students: 52, joined: '2025.04.12', status: 'active', monthlyFee: 520000, unpaidMonths: 0 },
  { id: 3, name: '분당 에듀케어', code: 'BIKUS-BD03-0003', owner: '박원장', ownerEmail: 'bd@academy.com', ownerPhone: '010-3333-4444', region: '경기 성남', plan: '중등', teachers: 4, students: 34, joined: '2025.04.10', status: 'trial', monthlyFee: 0, unpaidMonths: 0 },
  { id: 4, name: '일산 스마트학원', code: 'BIKUS-IL04-0004', owner: '최원장', ownerEmail: 'il@academy.com', ownerPhone: '010-4444-5555', region: '경기 고양', plan: '고등+중등', teachers: 7, students: 76, joined: '2025.04.08', status: 'active', monthlyFee: 760000, unpaidMonths: 0 },
  { id: 5, name: '판교 리버스쿨', code: 'BIKUS-PG05-0005', owner: '정원장', ownerEmail: 'pg@academy.com', ownerPhone: '010-5555-6666', region: '경기 성남', plan: '고등', teachers: 3, students: 45, joined: '2025.04.05', status: 'unpaid', monthlyFee: 450000, unpaidMonths: 2 },
  { id: 6, name: '대치 토스트교육', code: 'BIKUS-DC06-0006', owner: '윤원장', ownerEmail: 'dc@academy.com', ownerPhone: '010-6666-7777', region: '서울 강남', plan: '고등+중등', teachers: 12, students: 125, joined: '2025.03.28', status: 'active', monthlyFee: 1250000, unpaidMonths: 0 },
  { id: 7, name: '서초 아카데미', code: 'BIKUS-SC07-0007', owner: '한원장', ownerEmail: 'sc@academy.com', ownerPhone: '010-7777-8888', region: '서울 서초', plan: '고등', teachers: 6, students: 68, joined: '2025.03.20', status: 'active', monthlyFee: 680000, unpaidMonths: 0 },
  { id: 8, name: '송파 브레인스쿨', code: 'BIKUS-SP08-0008', owner: '임원장', ownerEmail: 'sp@academy.com', ownerPhone: '010-8888-9999', region: '서울 송파', plan: '중등', teachers: 3, students: 28, joined: '2025.03.15', status: 'trial', monthlyFee: 0, unpaidMonths: 0 },
  { id: 9, name: '광교 엘리트학원', code: 'BIKUS-GK09-0009', owner: '오원장', ownerEmail: 'gk@academy.com', ownerPhone: '010-9999-0000', region: '경기 수원', plan: '고등+중등', teachers: 9, students: 92, joined: '2025.03.10', status: 'active', monthlyFee: 920000, unpaidMonths: 0 },
  { id: 10, name: '수원 학습코칭', code: 'BIKUS-SW10-0010', owner: '서원장', ownerEmail: 'sw@academy.com', ownerPhone: '010-1010-2020', region: '경기 수원', plan: '고등', teachers: 4, students: 38, joined: '2025.03.05', status: 'unpaid', monthlyFee: 380000, unpaidMonths: 1 },
  { id: 11, name: '인천 미래교육', code: 'BIKUS-IC11-0011', owner: '권원장', ownerEmail: 'ic@academy.com', ownerPhone: '010-1111-3030', region: '인천', plan: '중등', teachers: 5, students: 47, joined: '2025.02.28', status: 'active', monthlyFee: 470000, unpaidMonths: 0 },
  { id: 12, name: '대전 지식의문', code: 'BIKUS-DJ12-0012', owner: '조원장', ownerEmail: 'dj@academy.com', ownerPhone: '010-1212-4040', region: '대전', plan: '고등+중등', teachers: 6, students: 58, joined: '2025.02.20', status: 'active', monthlyFee: 580000, unpaidMonths: 0 },
]

const STATUS_STYLE: Record<string, any> = {
  active: { color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', label: '✓ 활성' },
  trial: { color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD', label: '🎁 체험중' },
  unpaid: { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', label: '⚠️ 미납' },
  suspended: { color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB', label: '🚫 정지' },
}

const PLAN_STYLE: Record<string, any> = {
  '고등': { color: '#2563EB', bg: '#EFF6FF' },
  '중등': { color: '#059669', bg: '#ECFDF5' },
  '고등+중등': { color: '#7C3AED', bg: '#F5F3FF' },
}

const PLAN_FEES: Record<string, number> = {
  '고등': 500000,
  '중등': 400000,
  '고등+중등': 800000,
}

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const nums = '0123456789'
  let code = 'BIKUS-'
  for (let i = 0; i < 2; i++) code += chars[Math.floor(Math.random() * chars.length)]
  for (let i = 0; i < 2; i++) code += nums[Math.floor(Math.random() * nums.length)]
  code += '-'
  for (let i = 0; i < 4; i++) code += nums[Math.floor(Math.random() * nums.length)]
  return code
}

// 🔐 임시 비밀번호 자동 생성
const generatePassword = () => {
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

export default function MasterAcademies() {
  const navigate = useNavigate()

  const [academies, setAcademies] = useState<any[]>(() => {
    const saved = localStorage.getItem('master_academies')
    return saved ? JSON.parse(saved) : INIT_ACADEMIES
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'joined' | 'students' | 'fee'>('joined')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdAcademy, setCreatedAcademy] = useState<any>(null)

  const [newAcademy, setNewAcademy] = useState({
    name: '',
    region: '',
    address: '',
    owner: '',
    ownerEmail: '',
    ownerPhone: '',
    plan: '고등',
    trial: true,
    sendEmail: true,
  })

  const saveToStorage = (list: any[]) => {
    localStorage.setItem('master_academies', JSON.stringify(list))
    setAcademies(list)
  }

  const filtered = academies
    .filter(a => {
      if (search && !a.name.includes(search) && !a.owner.includes(search) && !a.code.includes(search)) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (planFilter !== 'all' && a.plan !== planFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'students') return b.students - a.students
      if (sortBy === 'fee') return b.monthlyFee - a.monthlyFee
      return b.joined.localeCompare(a.joined)
    })

  const stats = {
    total: academies.length,
    active: academies.filter(a => a.status === 'active').length,
    trial: academies.filter(a => a.status === 'trial').length,
    unpaid: academies.filter(a => a.status === 'unpaid').length,
  }

  const openAddModal = () => {
    setNewAcademy({ name: '', region: '', address: '', owner: '', ownerEmail: '', ownerPhone: '', plan: '고등', trial: true, sendEmail: true })
    setShowAddModal(true)
  }

  const handleAddAcademy = () => {
    if (!newAcademy.name.trim() || !newAcademy.owner.trim() || !newAcademy.ownerEmail.trim()) {
      alert('학원명, 원장명, 이메일은 필수입니다!')
      return
    }

    const newId = Math.max(...academies.map(a => a.id), 0) + 1
    const code = generateCode()
    const tempPassword = generatePassword()  // 🔐 자동 생성
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.')
    const monthlyFee = newAcademy.trial ? 0 : PLAN_FEES[newAcademy.plan]

    const academy = {
      id: newId,
      name: newAcademy.name,
      code,
      owner: newAcademy.owner,
      ownerEmail: newAcademy.ownerEmail,
      ownerPhone: newAcademy.ownerPhone || '-',
      region: newAcademy.region || '-',
      address: newAcademy.address || '-',
      plan: newAcademy.plan,
      teachers: 0,
      students: 0,
      joined: today,
      status: newAcademy.trial ? 'trial' : 'active',
      monthlyFee,
      unpaidMonths: 0,
      tempPassword,  // 🔐 임시 비밀번호 저장
      passwordChanged: false,  // 원장이 아직 안 바꿨음
    }

    saveToStorage([academy, ...academies])
    setShowAddModal(false)

    // 🎉 성공 모달 표시 (비밀번호 정보)
    setCreatedAcademy(academy)
    setShowSuccessModal(true)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    alert(`✅ ${label}이(가) 복사되었어요!`)
  }

  return (
    <div className="px-8 py-7 min-h-full">

      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏫</span>
            <div className="text-[22px] font-extrabold text-ink tracking-tight">학원 관리</div>
          </div>
          <div className="text-[13px] font-medium text-ink-secondary">
            비커스를 사용하는 전체 학원을 관리하세요.
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="h-10 px-5 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
          style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
        >
          ➕ 학원 추가
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 max-md:grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl px-5 py-4 shadow-[0_8px_24px_rgba(124,58,237,0.15)]" style={{ background: THEME.gradient }}>
          <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1">전체 학원</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-white tracking-tight">{stats.total}</div>
            <div className="text-[13px] font-semibold text-white/80">개</div>
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">✓ 활성 학원</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-green-600 tracking-tight">{stats.active}</div>
            <div className="text-[13px] font-semibold text-ink-muted">개</div>
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">🎁 체험중</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-blue-600 tracking-tight">{stats.trial}</div>
            <div className="text-[13px] font-semibold text-ink-muted">개</div>
          </div>
        </div>
        <div className="rounded-2xl px-5 py-4" style={{
          background: stats.unpaid > 0 ? '#FEF2F2' : '#fff',
          border: `1px solid ${stats.unpaid > 0 ? '#FCA5A5' : '#E5E7EB'}`,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: stats.unpaid > 0 ? '#991B1B' : '#6B7280' }}>⚠️ 미납 학원</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold tracking-tight" style={{ color: stats.unpaid > 0 ? '#991B1B' : '#1a1a1a' }}>{stats.unpaid}</div>
            <div className="text-[13px] font-semibold" style={{ color: stats.unpaid > 0 ? '#991B1B' : '#6B7280' }}>개</div>
          </div>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div className="bg-white border border-line rounded-2xl px-5 py-4 mb-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex gap-2.5 items-center flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 학원명, 원장명, 코드로 검색..."
              className="w-full h-10 px-4 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
              onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
              onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div className="flex gap-1">
            <span className="text-[10px] font-bold text-ink-muted self-center mr-1">상태:</span>
            {[{ key: 'all', label: '전체' }, { key: 'active', label: '✓ 활성' }, { key: 'trial', label: '🎁 체험' }, { key: 'unpaid', label: '⚠️ 미납' }, { key: 'suspended', label: '🚫 정지' }].map(s => {
              const active = statusFilter === s.key
              return (
                <button key={s.key} onClick={() => setStatusFilter(s.key)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all" style={{
                  borderColor: active ? THEME.accent : '#E5E7EB',
                  background: active ? THEME.accentBg : '#fff',
                  color: active ? THEME.accentDark : '#6B7280',
                }}>{s.label}</button>
              )
            })}
          </div>
          <div className="flex gap-1">
            <span className="text-[10px] font-bold text-ink-muted self-center mr-1">플랜:</span>
            {[{ key: 'all', label: '전체' }, { key: '고등', label: '고등' }, { key: '중등', label: '중등' }, { key: '고등+중등', label: '고+중' }].map(p => {
              const active = planFilter === p.key
              return (
                <button key={p.key} onClick={() => setPlanFilter(p.key)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all" style={{
                  borderColor: active ? THEME.accent : '#E5E7EB',
                  background: active ? THEME.accentBg : '#fff',
                  color: active ? THEME.accentDark : '#6B7280',
                }}>{p.label}</button>
              )
            })}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="h-9 px-3 border border-line rounded-lg text-[11px] font-bold text-ink bg-white outline-none cursor-pointer" style={{ minWidth: 120 }}>
            <option value="joined">📅 최근 가입순</option>
            <option value="students">🧑‍🎓 학생 많은순</option>
            <option value="fee">💰 매출 높은순</option>
          </select>
        </div>
      </div>

      {/* 결과 개수 */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[12px] font-medium text-ink-secondary">
          총 <span className="font-extrabold" style={{ color: THEME.accent }}>{filtered.length}개</span> 학원
          {filtered.length !== stats.total && ` / 전체 ${stats.total}개`}
        </div>
        <div className="text-[12px] font-medium text-ink-secondary">
          예상 월 매출: <span className="font-extrabold text-ink">₩{filtered.reduce((sum, a) => sum + a.monthlyFee, 0).toLocaleString()}</span>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-ink-muted">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-[14px] font-bold text-ink-secondary mb-1">검색 결과가 없어요</div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC]">
                {['학원명', '코드', '원장', '플랜', '선생님', '학생 수', '월 매출', '가입일', '상태'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const st = STATUS_STYLE[a.status] || STATUS_STYLE.active
                const pl = PLAN_STYLE[a.plan] || PLAN_STYLE['고등']
                return (
                  <tr key={a.id} onClick={() => navigate(`/master/academies/${a.id}`)} className="cursor-pointer transition-colors hover:bg-gray-50" style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                    opacity: a.status === 'suspended' ? 0.6 : 1,
                  }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-extrabold text-white flex-shrink-0" style={{ background: THEME.gradient }}>
                          {a.name[0]}
                        </div>
                        <div>
                          <div className="text-[13px] font-extrabold text-ink tracking-tight">{a.name}</div>
                          <div className="text-[10px] font-medium text-ink-muted">📍 {a.region}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded" style={{ color: THEME.accentDark, background: THEME.accentBg }}>{a.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[12.5px] font-semibold text-ink">{a.owner}</div>
                      <div className="text-[10px] font-medium text-ink-muted">{a.ownerPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: pl.color, background: pl.bg }}>{a.plan}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-bold text-ink">{a.teachers}명</td>
                    <td className="px-4 py-3 text-[13px] font-extrabold" style={{ color: THEME.accent }}>{a.students}명</td>
                    <td className="px-4 py-3">
                      {a.monthlyFee === 0 ? (
                        <span className="text-[11px] font-bold text-blue-600">체험중</span>
                      ) : (
                        <div>
                          <div className="text-[12.5px] font-extrabold text-ink">₩{a.monthlyFee.toLocaleString()}</div>
                          {a.unpaidMonths > 0 && (<div className="text-[10px] font-bold text-red-600">⚠️ {a.unpaidMonths}개월 미납</div>)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-semibold text-ink-secondary">{a.joined}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}60` }}>{st.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ============ 학원 추가 모달 ============ */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[560px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="px-6 py-5 relative overflow-hidden" style={{ background: THEME.gradient }}>
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }} />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white tracking-tight">➕ 신규 학원 추가</div>
                  <div className="text-[12px] font-medium text-white/80 mt-0.5">학원 코드와 원장 계정이 자동 생성돼요</div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>

            <div className="px-6 py-5">

              {/* 🔐 자동 생성 안내 */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">🔐</span>
                  <div>
                    <div className="text-[12px] font-bold text-purple-900 mb-1">자동 생성되는 항목</div>
                    <ul className="text-[11px] font-medium text-purple-700 leading-[1.6] list-disc pl-4">
                      <li><strong>학원 코드</strong> (학생 가입용)</li>
                      <li><strong>임시 비밀번호</strong> (원장 첫 로그인용)</li>
                      <li>원장님 이메일로 자동 발송</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">

                <div>
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">🏫 학원 정보</div>
                  <div className="flex flex-col gap-3">
                    {[
                      { key: 'name', label: '학원명 *', placeholder: '예: 강남 에스엠 학원' },
                      { key: 'region', label: '지역', placeholder: '예: 서울 강남' },
                      { key: 'address', label: '주소', placeholder: '상세 주소' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[11px] font-bold text-ink-secondary mb-1 block">{f.label}</label>
                        <input
                          value={(newAcademy as any)[f.key]}
                          onChange={e => setNewAcademy(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                          onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">👑 원장 정보</div>
                  <div className="flex flex-col gap-3">
                    {[
                      { key: 'owner', label: '원장 이름 *', placeholder: '예: 강원장' },
                      { key: 'ownerEmail', label: '이메일 * (로그인 아이디)', placeholder: 'example@academy.com' },
                      { key: 'ownerPhone', label: '전화번호', placeholder: '010-0000-0000' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[11px] font-bold text-ink-secondary mb-1 block">{f.label}</label>
                        <input
                          value={(newAcademy as any)[f.key]}
                          onChange={e => setNewAcademy(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                          onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">💎 플랜 선택</div>
                  <div className="grid grid-cols-3 gap-2">
                    {['고등', '중등', '고등+중등'].map(plan => {
                      const isActive = newAcademy.plan === plan
                      const fee = PLAN_FEES[plan]
                      return (
                        <button key={plan} onClick={() => setNewAcademy(prev => ({ ...prev, plan }))} className="px-3 py-3 rounded-xl border-2 transition-all text-center" style={{
                          borderColor: isActive ? THEME.accent : '#E5E7EB',
                          background: isActive ? THEME.accentBg : '#fff',
                        }}>
                          <div className="text-[13px] font-extrabold mb-0.5" style={{ color: isActive ? THEME.accentDark : '#1a1a1a' }}>{plan}</div>
                          <div className="text-[10px] font-bold" style={{ color: isActive ? THEME.accent : '#6B7280' }}>₩{fee.toLocaleString()}/월</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={newAcademy.trial} onChange={e => setNewAcademy(prev => ({ ...prev, trial: e.target.checked }))} className="w-4 h-4 cursor-pointer" />
                    <div>
                      <div className="text-[13px] font-bold text-ink">🎁 14일 무료 체험으로 시작</div>
                      <div className="text-[11px] font-medium text-ink-secondary mt-0.5">체험 기간 동안 결제 없이 사용 가능해요</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={newAcademy.sendEmail} onChange={e => setNewAcademy(prev => ({ ...prev, sendEmail: e.target.checked }))} className="w-4 h-4 cursor-pointer" />
                    <div>
                      <div className="text-[13px] font-bold text-ink">✉️ 원장님에게 환영 이메일 발송</div>
                      <div className="text-[11px] font-medium text-ink-secondary mt-0.5">학원 코드 + 임시 비밀번호가 포함돼요</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors">취소</button>
              <button onClick={handleAddAcademy} className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px" style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
                ✅ 학원 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 🎉 성공 모달 (계정 정보 표시) ============ */}
      {showSuccessModal && createdAcademy && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white rounded-2xl w-[540px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="px-6 py-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }} />
              <div className="relative">
                <div className="text-[22px] font-extrabold text-white tracking-tight mb-1">🎉 학원이 추가되었어요!</div>
                <div className="text-[12px] font-medium text-white/90">아래 정보를 원장님에게 전달하세요</div>
              </div>
            </div>

            <div className="px-6 py-5">

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
                <div className="text-[11px] font-bold text-green-800 uppercase tracking-wider mb-1">학원명</div>
                <div className="text-[16px] font-extrabold text-green-900">{createdAcademy.name}</div>
                <div className="text-[11px] font-medium text-green-700 mt-0.5">📍 {createdAcademy.region}</div>
              </div>

              {/* 학원 코드 */}
              <div className="mb-3">
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">🔑 학원 코드 (학생 가입용)</div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 px-4 py-3 rounded-xl font-mono text-[16px] font-extrabold tracking-wider"
                    style={{ background: THEME.accentBg, color: THEME.accentDark, border: `1px solid ${THEME.accentBorder}60` }}
                  >
                    {createdAcademy.code}
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdAcademy.code, '학원 코드')}
                    className="h-12 px-3 bg-white border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                    style={{ color: THEME.accent, borderColor: THEME.accent }}
                  >
                    📋 복사
                  </button>
                </div>
              </div>

              {/* 원장 이메일 */}
              <div className="mb-3">
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">✉️ 원장 이메일 (로그인 아이디)</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-[14px] font-bold text-ink">
                    {createdAcademy.ownerEmail}
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdAcademy.ownerEmail, '이메일')}
                    className="h-12 px-3 bg-white border border-line rounded-lg text-[11px] font-bold text-ink-secondary hover:bg-gray-50 transition-colors"
                  >
                    📋 복사
                  </button>
                </div>
              </div>

              {/* 🔐 임시 비밀번호 */}
              <div className="mb-4">
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">🔐 임시 비밀번호 (첫 로그인용)</div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 px-4 py-3 rounded-xl font-mono text-[16px] font-extrabold tracking-wider border-2"
                    style={{ background: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D' }}
                  >
                    {createdAcademy.tempPassword}
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdAcademy.tempPassword, '임시 비밀번호')}
                    className="h-12 px-3 bg-amber-500 text-white rounded-lg text-[11px] font-bold hover:bg-amber-600 transition-colors"
                  >
                    📋 복사
                  </button>
                </div>
                <div className="text-[10px] font-bold text-amber-700 mt-1.5 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>원장님이 첫 로그인 시 비밀번호 변경이 강제됩니다</span>
                </div>
              </div>

              {/* 이메일 발송 상태 */}
              {newAcademy.sendEmail && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
                  <span className="text-lg">✉️</span>
                  <div>
                    <div className="text-[12px] font-bold text-blue-900">환영 이메일이 발송됐어요!</div>
                    <div className="text-[11px] font-medium text-blue-700 mt-0.5">
                      <strong>{createdAcademy.ownerEmail}</strong>에 계정 정보가 전송되었어요.<br />
                      원장님이 10분 이내에 받지 못하면 다시 발송할 수 있어요.
                    </div>
                  </div>
                </div>
              )}

              {/* 모든 정보 복사 */}
              <button
                onClick={() => {
                  const text = `[비커스 계정 정보]\n\n학원명: ${createdAcademy.name}\n학원 코드: ${createdAcademy.code}\n\n원장 로그인:\n이메일: ${createdAcademy.ownerEmail}\n임시 비밀번호: ${createdAcademy.tempPassword}\n\n첫 로그인 시 비밀번호를 반드시 변경해주세요.`
                  copyToClipboard(text, '전체 계정 정보')
                }}
                className="w-full h-11 text-white rounded-xl text-[13px] font-bold transition-all hover:-translate-y-px"
                style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
              >
                📋 전체 정보 한번에 복사
              </button>
            </div>

            <div className="px-6 py-4 border-t border-line">
              <button
                onClick={() => { setShowSuccessModal(false); setCreatedAcademy(null) }}
                className="w-full h-11 bg-gray-100 text-ink rounded-lg text-[13px] font-bold hover:bg-gray-200 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}