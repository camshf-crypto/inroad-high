// src/pages/master/_pages/academies/Academies.tsx
// 마스터 어드민 - 학원 관리 (Supabase 연동 + 승인 시스템)

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
  pending_review: { color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', label: '⏳ 승인 대기' },
  rejected: { color: '#991B1B', bg: '#FEF2F2', border: '#FCA5A5', label: '❌ 거부됨' },
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

  const [academies, setAcademies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'joined' | 'students' | 'fee'>('joined')

  // ⭐ 승인 모달
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedAcademy, setSelectedAcademy] = useState<any>(null)
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchAcademies = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: academiesData, error: academiesError } = await supabase
        .from('academies')
        .select('*')
        .order('created_at', { ascending: false })

      if (academiesError) throw academiesError

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('academy_id, role, name, email')

      if (profilesError) throw profilesError

      const mapped = (academiesData || []).map(a => {
        const profiles = (profilesData || []).filter(p => p.academy_id === a.id)
        const students = profiles.filter(p => p.role === 'high_student' || p.role === 'middle_student').length
        const teachers = profiles.filter(p => p.role === 'teacher' || p.role === 'admin').length
        const pendingOwner = profiles.find(p => p.role === 'pending')  // ⭐ 승인 대기 원장
        const plan = a.plan || getPlanFromMenus(a.enabled_menus)
        const menuCount = (a.enabled_menus || []).length

        return {
          id: a.id,
          name: a.name,
          code: a.academy_code || '코드 없음',
          owner: a.manager_name || '미설정',
          ownerEmail: a.manager_email || '',
          ownerPhone: a.phone || '-',
          region: a.region || '-',
          businessNumber: a.business_number || '-',
          businessVerified: a.business_verified || false,
          plan,
          menuCount,
          teachers,
          students,
          joined: a.created_at ? new Date(a.created_at).toISOString().slice(0, 10).replace(/-/g, '.') : '-',
          status: a.status || 'active',
          monthlyFee: a.status === 'pending_review' || a.status === 'trial' ? 0 : (PLAN_FEES[plan] || 0),
          unpaidMonths: 0,
          pendingOwnerId: pendingOwner?.academy_id ? pendingOwner.academy_id : null,
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
    pending: academies.filter(a => a.status === 'pending_review').length,
    active: academies.filter(a => a.status === 'active').length,
    trial: academies.filter(a => a.status === 'trial').length,
    unpaid: academies.filter(a => a.status === 'unpaid').length,
  }

  // ⭐ 승인 처리
  const handleApprove = async () => {
    if (!selectedAcademy) return
    setApprovalLoading(true)
    try {
      // 1. academies status를 'trial'로 변경
      const now = new Date()
      const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const { error: academyErr } = await supabase
        .from('academies')
        .update({
          status: 'trial',
          business_verified: true,
          trial_start_at: now.toISOString(),
          trial_end_at: trialEnd.toISOString(),
        })
        .eq('id', selectedAcademy.id)

      if (academyErr) throw academyErr

      // 2. 해당 학원의 pending 원장을 admin으로 변경
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('academy_id', selectedAcademy.id)
        .eq('role', 'pending')

      if (profileErr) throw profileErr

      alert(`✅ ${selectedAcademy.name} 학원이 승인됐어요!\n원장님이 1개월 무료 체험을 시작할 수 있어요.`)

      setShowApprovalModal(false)
      setSelectedAcademy(null)
      setApprovalAction(null)
      fetchAcademies()

    } catch (e: any) {
      console.error('[handleApprove]', e)
      alert('승인 중 오류: ' + (e.message || ''))
    } finally {
      setApprovalLoading(false)
    }
  }

  // ⭐ 거부 처리 (데이터 유지, status='rejected'로 변경)
  const handleReject = async () => {
    if (!selectedAcademy) return
    if (!rejectReason.trim()) {
      alert('거부 사유를 입력해주세요.')
      return
    }
    if (!confirm(`정말 ${selectedAcademy.name} 학원 신청을 거부하시겠어요?\n\n원장님은 거부 사유를 확인하고 다시 신청할 수 있어요.`)) return

    setApprovalLoading(true)
    try {
      const { error: academyErr } = await supabase
        .from('academies')
        .update({
          status: 'rejected',
          reject_reason: rejectReason.trim(),
          rejected_at: new Date().toISOString(),
        })
        .eq('id', selectedAcademy.id)

      if (academyErr) throw academyErr

      alert(`${selectedAcademy.name} 학원 신청이 거부됐어요.\n원장님이 사유를 확인하고 다시 신청할 수 있어요.`)

      setShowApprovalModal(false)
      setSelectedAcademy(null)
      setApprovalAction(null)
      setRejectReason('')
      fetchAcademies()

    } catch (e: any) {
      console.error('[handleReject]', e)
      alert('거부 처리 중 오류: ' + (e.message || ''))
    } finally {
      setApprovalLoading(false)
    }
  }

  const openApprovalModal = (academy: any, action: 'approve' | 'reject') => {
    setSelectedAcademy(academy)
    setApprovalAction(action)
    setRejectReason('')
    setShowApprovalModal(true)
  }

  return (
    <div className="px-8 py-7 min-h-full">

      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏫</span>
            <div className="text-[22px] font-extrabold text-ink tracking-tight">학원 관리</div>
            {stats.pending > 0 && (
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full animate-pulse"
                style={{ color: '#D97706', background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                ⏳ 승인 대기 {stats.pending}건
              </span>
            )}
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
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-xl px-5 py-3.5 mb-4 bg-red-50 border border-red-200">
          <div className="text-[13px] font-bold text-red-700">⚠️ 학원 목록을 불러오지 못했어요</div>
          <div className="text-[11px] text-red-600 mt-1">{error}</div>
        </div>
      )}

      {/* 승인 대기 알림 배너 */}
      {stats.pending > 0 && (
        <div className="rounded-2xl px-5 py-4 mb-5 flex items-center justify-between flex-wrap gap-3"
          style={{
            background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
            border: '1px solid #FCD34D',
          }}>
          <div className="flex items-center gap-3">
            <div className="text-3xl">⏳</div>
            <div>
              <div className="text-[15px] font-extrabold text-amber-900">
                {stats.pending}개의 학원이 승인을 기다리고 있어요
              </div>
              <div className="text-[12px] font-medium text-amber-800 mt-0.5">
                사업자등록번호를 검증하고 승인 처리해주세요
              </div>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('pending_review')}
            className="h-10 px-5 bg-amber-600 text-white rounded-lg text-[12px] font-bold transition-all hover:bg-amber-700"
          >
            승인 대기만 보기 →
          </button>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-5 max-md:grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl px-5 py-4 shadow-[0_8px_24px_rgba(124,58,237,0.15)]" style={{ background: THEME.gradient }}>
          <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1">전체 학원</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-white tracking-tight">{stats.total}</div>
            <div className="text-[13px] font-semibold text-white/80">개</div>
          </div>
        </div>
        <div className="rounded-2xl px-5 py-4" style={{
          background: stats.pending > 0 ? '#FEF3C7' : '#fff',
          border: `1px solid ${stats.pending > 0 ? '#FCD34D' : '#E5E7EB'}`,
        }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: stats.pending > 0 ? '#92400E' : '#6B7280' }}>⏳ 승인 대기</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold tracking-tight" style={{ color: stats.pending > 0 ? '#D97706' : '#1a1a1a' }}>{stats.pending}</div>
            <div className="text-[13px] font-semibold" style={{ color: stats.pending > 0 ? '#92400E' : '#6B7280' }}>개</div>
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl px-5 py-4">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">✓ 활성 학원</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-green-600 tracking-tight">{stats.active}</div>
            <div className="text-[13px] font-semibold text-ink-muted">개</div>
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl px-5 py-4">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">🎁 체험중</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-blue-600 tracking-tight">{stats.trial}</div>
            <div className="text-[13px] font-semibold text-ink-muted">개</div>
          </div>
        </div>
        <div className="rounded-2xl px-5 py-4" style={{
          background: stats.unpaid > 0 ? '#FEF2F2' : '#fff',
          border: `1px solid ${stats.unpaid > 0 ? '#FCA5A5' : '#E5E7EB'}`,
        }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: stats.unpaid > 0 ? '#991B1B' : '#6B7280' }}>⚠️ 미납</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold tracking-tight" style={{ color: stats.unpaid > 0 ? '#991B1B' : '#1a1a1a' }}>{stats.unpaid}</div>
            <div className="text-[13px] font-semibold" style={{ color: stats.unpaid > 0 ? '#991B1B' : '#6B7280' }}>개</div>
          </div>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div className="bg-white border border-line rounded-2xl px-5 py-4 mb-4">
        <div className="flex gap-2.5 items-center flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 학원명, 원장명, 코드로 검색..."
              className="w-full h-10 px-4 border border-line rounded-lg text-[13px] font-medium outline-none transition-all"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            <span className="text-[10px] font-bold text-ink-muted self-center mr-1">상태:</span>
            {[
              { key: 'all', label: '전체' },
              { key: 'pending_review', label: '⏳ 승인 대기' },
              { key: 'active', label: '✓ 활성' },
              { key: 'trial', label: '🎁 체험' },
              { key: 'unpaid', label: '⚠️ 미납' },
              { key: 'suspended', label: '🚫 정지' }
            ].map(s => {
              const active = statusFilter === s.key
              const isPending = s.key === 'pending_review'
              return (
                <button key={s.key} onClick={() => setStatusFilter(s.key)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all" style={{
                  borderColor: active ? (isPending ? '#D97706' : THEME.accent) : '#E5E7EB',
                  background: active ? (isPending ? '#FEF3C7' : THEME.accentBg) : '#fff',
                  color: active ? (isPending ? '#92400E' : THEME.accentDark) : '#6B7280',
                }}>{s.label}</button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 결과 개수 */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[12px] font-medium text-ink-secondary">
          총 <span className="font-extrabold" style={{ color: THEME.accent }}>{filtered.length}개</span> 학원
          {filtered.length !== stats.total && ` / 전체 ${stats.total}개`}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-gray-200 rounded-full animate-spin mb-3" style={{ borderTopColor: THEME.accent }} />
            <div className="text-[14px] font-bold text-ink-secondary">학원 목록 불러오는 중...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-ink-muted">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-[14px] font-bold text-ink-secondary">
              {academies.length === 0 ? '등록된 학원이 없어요' : '검색 결과가 없어요'}
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC]">
                {['학원명', '코드', '원장', '사업자번호', '플랜', '학생', '가입일', '상태', '작업'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const st = STATUS_STYLE[a.status] || STATUS_STYLE.active
                const pl = PLAN_STYLE[a.plan] || { color: '#6B7280', bg: '#F3F4F6' }
                const isPending = a.status === 'pending_review'
                return (
                  <tr key={a.id} className="transition-colors hover:bg-gray-50" style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                    background: isPending ? '#FFFBEB' : 'transparent',
                  }}>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/master/academies/${a.id}`)}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-extrabold text-white flex-shrink-0" style={{ background: isPending ? 'linear-gradient(135deg, #D97706, #F59E0B)' : THEME.gradient }}>
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
                      <div className="text-[10px] font-medium text-ink-muted">{a.ownerEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[11px] font-mono font-bold text-ink">{a.businessNumber}</div>
                      {a.businessVerified && <div className="text-[9px] font-bold text-green-600 mt-0.5">✓ 검증완료</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: pl.color, background: pl.bg }}>{a.plan}</span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-extrabold" style={{ color: THEME.accent }}>{a.students}명</td>
                    <td className="px-4 py-3 text-[11px] font-semibold text-ink-secondary">{a.joined}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}60` }}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); openApprovalModal(a, 'approve') }}
                            className="px-2.5 py-1 bg-green-600 text-white rounded-md text-[10px] font-bold hover:bg-green-700 transition-colors"
                          >
                            ✓ 승인
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openApprovalModal(a, 'reject') }}
                            className="px-2.5 py-1 bg-red-100 text-red-700 border border-red-200 rounded-md text-[10px] font-bold hover:bg-red-200 transition-colors"
                          >
                            ✕ 거부
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => navigate(`/master/academies/${a.id}`)}
                          className="text-[10px] font-bold text-ink-secondary hover:text-purple-700 transition-colors"
                        >
                          상세 →
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ⭐ 승인/거부 모달 */}
      {showApprovalModal && selectedAcademy && (
        <div onClick={() => !approvalLoading && setShowApprovalModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[520px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">

            {/* 헤더 */}
            <div className="px-6 py-5 relative overflow-hidden" style={{
              background: approvalAction === 'approve'
                ? 'linear-gradient(135deg, #059669, #10B981)'
                : 'linear-gradient(135deg, #DC2626, #EF4444)'
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white tracking-tight">
                    {approvalAction === 'approve' ? '✅ 학원 승인' : '❌ 학원 거부'}
                  </div>
                  <div className="text-[12px] font-medium text-white/80 mt-0.5">
                    {selectedAcademy.name}
                  </div>
                </div>
                <button onClick={() => setShowApprovalModal(false)} disabled={approvalLoading} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>

            {/* 내용 */}
            <div className="px-6 py-5">

              {/* 학원 정보 */}
              <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-4">
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">📋 신청 정보</div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <div className="text-[10px] text-ink-muted">학원명</div>
                    <div className="font-bold text-ink">{selectedAcademy.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-muted">학원 코드</div>
                    <div className="font-bold font-mono text-ink">{selectedAcademy.code}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-muted">원장님</div>
                    <div className="font-bold text-ink">{selectedAcademy.owner}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-muted">이메일</div>
                    <div className="font-bold text-ink text-[11px]">{selectedAcademy.ownerEmail}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-muted">사업자번호</div>
                    <div className="font-bold font-mono text-ink">{selectedAcademy.businessNumber}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-muted">플랜</div>
                    <div className="font-bold text-ink">{selectedAcademy.plan}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] text-ink-muted">지역 / 연락처</div>
                    <div className="font-bold text-ink">{selectedAcademy.region} · {selectedAcademy.ownerPhone}</div>
                  </div>
                </div>
              </div>

              {/* 승인 안내 */}
              {approvalAction === 'approve' && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
                  <div className="text-[12px] font-bold text-green-900 mb-1">✅ 승인 시 처리되는 내용</div>
                  <div className="text-[11px] text-green-800 leading-[1.7]">
                    · 학원 상태: 승인 대기 → <strong>체험중 (trial)</strong><br />
                    · 원장 권한: pending → <strong>admin</strong><br />
                    · 1개월 무료 체험 시작 (오늘부터)<br />
                    · 사업자번호 검증 완료 표시
                  </div>
                </div>
              )}

              {/* 거부 사유 입력 */}
              {approvalAction === 'reject' && (
                <div className="mb-4">
                  <label className="text-[11px] font-bold text-ink-secondary mb-1.5 block">
                    거부 사유 * <span className="font-medium text-ink-muted">(원장에게 안내됩니다)</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="예: 사업자등록번호가 유효하지 않습니다. 다시 확인해주세요."
                    rows={3}
                    disabled={approvalLoading}
                    className="w-full border border-line rounded-lg px-3 py-2.5 text-[12px] font-medium outline-none resize-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                  <div className="text-[10px] text-red-600 mt-1.5">
                    ⚠️ 거부 시 학원 정보가 삭제되고 원장은 다시 신청할 수 있어요
                  </div>
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className="px-6 py-4 border-t border-line flex gap-2">
              <button onClick={() => setShowApprovalModal(false)} disabled={approvalLoading} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 disabled:opacity-50">
                취소
              </button>
              {approvalAction === 'approve' ? (
                <button
                  onClick={handleApprove}
                  disabled={approvalLoading}
                  className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
                  {approvalLoading ? '승인 중...' : '✅ 승인하기'}
                </button>
              ) : (
                <button
                  onClick={handleReject}
                  disabled={approvalLoading || !rejectReason.trim()}
                  className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold disabled:opacity-60 disabled:bg-gray-400"
                  style={{ background: !rejectReason.trim() ? '#9CA3AF' : 'linear-gradient(135deg, #DC2626, #EF4444)' }}>
                  {approvalLoading ? '거부 중...' : '❌ 거부하기'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}