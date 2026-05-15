// src/pages/master/_pages/academies/Academies.tsx
// 마스터 어드민 - 학원 관리 (실제 Supabase 연동)
//
// ⭐ 변경:
//   - INIT_ACADEMIES (Mock) → Supabase academies 테이블에서 로드
//   - 학원 클릭 시 UUID로 상세 페이지 이동
//   - 통계는 실제 데이터로 집계
//   - 학원 추가는 일단 Mock 유지 (다음 단계)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

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
  let code = 'B-KURS-'
  for (let i = 0; i < 2; i++) code += chars[Math.floor(Math.random() * chars.length)]
  for (let i = 0; i < 2; i++) code += nums[Math.floor(Math.random() * nums.length)]
  code += '-'
  for (let i = 0; i < 4; i++) code += nums[Math.floor(Math.random() * nums.length)]
  return code
}

const generatePassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const nums = '23456789'
  const special = '@#$!'
  let pw = 'B-KURS'
  pw += upper[Math.floor(Math.random() * upper.length)]
  pw += lower[Math.floor(Math.random() * lower.length)]
  for (let i = 0; i < 4; i++) pw += nums[Math.floor(Math.random() * nums.length)]
  pw += special[Math.floor(Math.random() * special.length)]
  return pw
}

// ⭐ 메뉴 권한 기반으로 플랜 자동 판단
const getPlanFromMenus = (enabledMenus: string[] = []): string => {
  const hasHigh = enabledMenus.some(m => m.startsWith('high.'))
  const hasMiddle = enabledMenus.some(m => m.startsWith('middle.'))
  if (hasHigh && hasMiddle) return '고등+중등'
  if (hasHigh) return '고등'
  if (hasMiddle) return '중등'
  return '미설정'
}

export default function MasterAcademies() {
  const navigate = useNavigate()

  // ⭐ 학원 목록 (Supabase에서 로드)
  const [academies, setAcademies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // ⭐ Supabase에서 학원 + 학생 수 + 선생님 수 로드
  const fetchAcademies = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. 학원 목록 가져오기
      const { data: academiesData, error: academiesError } = await supabase
        .from('academies')
        .select('*')
        .order('created_at', { ascending: false })

      if (academiesError) throw academiesError

      // 2. 각 학원의 학생/선생님 수 가져오기
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('academy_id, role')

      if (profilesError) throw profilesError

      // 3. 데이터 매핑
      const mapped = (academiesData || []).map(a => {
        const profiles = (profilesData || []).filter(p => p.academy_id === a.id)
        const students = profiles.filter(p => p.role === 'high_student' || p.role === 'middle_student').length
        const teachers = profiles.filter(p => p.role === 'teacher' || p.role === 'admin').length
        const plan = getPlanFromMenus(a.enabled_menus)
        const menuCount = (a.enabled_menus || []).length

        return {
          id: a.id, // UUID
          name: a.name,
          code: a.academy_code || '코드 없음',
          owner: a.owner_name || '미설정',
          ownerEmail: a.owner_email || '',
          ownerPhone: a.owner_phone || '-',
          region: a.region || '-',
          address: a.address || '-',
          plan,
          menuCount,
          teachers,
          students,
          joined: a.created_at ? new Date(a.created_at).toISOString().slice(0, 10).replace(/-/g, '.') : '-',
          status: a.status || 'active',
          monthlyFee: PLAN_FEES[plan] || 0,
          unpaidMonths: 0,
        }
      })

      setAcademies(mapped)
    } catch (e: any) {
      console.error('[fetchAcademies]', e)
      setError(e.message || '학원 목록을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAcademies()
  }, [])

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

  // ⭐ 학원 추가 (일단 Mock - 다음 단계에서 Supabase 연동)
  const handleAddAcademy = () => {
    if (!newAcademy.name.trim() || !newAcademy.owner.trim() || !newAcademy.ownerEmail.trim()) {
      alert('학원명, 원장명, 이메일은 필수입니다!')
      return
    }

    alert('📌 학원 추가 기능은 곧 Supabase 연동으로 업데이트 예정이에요!\n\n현재는 Supabase에서 직접 학원을 추가해주세요.')
    setShowAddModal(false)
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

        <div className="flex gap-2">
          <button
            onClick={fetchAcademies}
            disabled={loading}
            className="h-10 px-4 bg-white border border-line text-ink-secondary rounded-lg text-[13px] font-bold transition-all hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? '🔄 로딩중...' : '🔄 새로고침'}
          </button>
          <button
            onClick={openAddModal}
            className="h-10 px-5 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
            style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
          >
            ➕ 학원 추가
          </button>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-xl px-5 py-3.5 mb-4 bg-red-50 border border-red-200">
          <div className="text-[13px] font-bold text-red-700">⚠️ 학원 목록을 불러오지 못했어요</div>
          <div className="text-[11px] text-red-600 mt-1">{error}</div>
        </div>
      )}

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
        {loading ? (
          <div className="text-center py-20 text-ink-muted">
            <div className="inline-block w-8 h-8 border-2 border-gray-200 rounded-full animate-spin mb-3" style={{ borderTopColor: THEME.accent }} />
            <div className="text-[14px] font-bold text-ink-secondary">학원 목록 불러오는 중...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-ink-muted">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-[14px] font-bold text-ink-secondary mb-1">
              {academies.length === 0 ? '등록된 학원이 없어요' : '검색 결과가 없어요'}
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC]">
                {['학원명', '코드', '원장', '플랜', '메뉴', '선생님', '학생 수', '월 매출', '가입일', '상태'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const st = STATUS_STYLE[a.status] || STATUS_STYLE.active
                const pl = PLAN_STYLE[a.plan] || { color: '#6B7280', bg: '#F3F4F6' }
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
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-bold" style={{ color: a.menuCount >= 15 ? '#7C3AED' : '#6B7280' }}>{a.menuCount}/20</span>
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

      {/* 학원 추가 모달 (Mock - 다음 단계에서 Supabase 연동) */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[560px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="px-6 py-5 relative overflow-hidden" style={{ background: THEME.gradient }}>
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white tracking-tight">➕ 신규 학원 추가</div>
                  <div className="text-[12px] font-medium text-white/80 mt-0.5">곧 Supabase 연동 예정</div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">🚧</span>
                  <div>
                    <div className="text-[13px] font-bold text-amber-800 mb-1">개발 중인 기능이에요</div>
                    <div className="text-[11px] font-medium text-amber-700 leading-[1.6]">
                      학원 추가는 곧 Supabase 연동으로 업데이트돼요.<br />
                      현재는 <strong>Supabase 대시보드</strong>에서 직접 추가해주세요.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line">
              <button onClick={() => setShowAddModal(false)} className="w-full h-11 bg-gray-100 text-ink rounded-lg text-[13px] font-bold hover:bg-gray-200 transition-colors">
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}