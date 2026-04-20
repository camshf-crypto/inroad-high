import { useNavigate } from 'react-router-dom'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

const STATS = [
  { label: '전체 학원', value: '47', suffix: '개', trend: '+5', trendLabel: '이번 달', icon: '🏫', main: true },
  { label: '전체 원장', value: '47', suffix: '명', trend: '+5', icon: '👑' },
  { label: '전체 선생님', value: '152', suffix: '명', trend: '+12', icon: '👨‍🏫' },
  { label: '전체 학생', value: '2,341', suffix: '명', trend: '+148', icon: '🧑‍🎓' },
  { label: '이번 달 매출', value: '2,340', suffix: '만원', trend: '+18%', icon: '💰' },
  { label: '미납 학원', value: '3', suffix: '개', trend: '⚠️', icon: '⚠️', warn: true },
]

const RECENT_ACADEMIES = [
  { id: 1, name: '강남 에스엠 학원', owner: '강원장', plan: '고등+중등', students: 87, joined: '2025.04.14', status: 'active' },
  { id: 2, name: '목동 프리미엄 아카데미', owner: '이원장', plan: '고등', students: 52, joined: '2025.04.12', status: 'active' },
  { id: 3, name: '분당 에듀케어', owner: '박원장', plan: '중등', students: 34, joined: '2025.04.10', status: 'trial' },
  { id: 4, name: '일산 스마트학원', owner: '최원장', plan: '고등+중등', students: 76, joined: '2025.04.08', status: 'active' },
  { id: 5, name: '판교 리버스쿨', owner: '정원장', plan: '고등', students: 45, joined: '2025.04.05', status: 'unpaid' },
]

const STATUS_STYLE: Record<string, any> = {
  active: { color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', label: '✓ 활성' },
  trial: { color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD', label: '🎁 체험중' },
  unpaid: { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', label: '⚠️ 미납' },
}

export default function MasterDashboard() {
  const navigate = useNavigate()

  return (
    <div className="px-8 py-7 min-h-full">

      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🏢</span>
          <div className="text-[22px] font-extrabold text-ink tracking-tight">본사 대시보드</div>
        </div>
        <div className="text-[13px] font-medium text-ink-secondary">
          인로드 전체 현황을 한눈에 확인하세요.
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 max-md:grid-cols-2 gap-3 mb-6">
        {STATS.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5"
            style={{
              background: s.main ? THEME.gradient : s.warn ? '#FEF2F2' : '#fff',
              border: s.main ? 'none' : s.warn ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
              boxShadow: s.main
                ? `0 8px 24px ${THEME.accentShadow}`
                : '0 2px 8px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{
                  color: s.main ? 'rgba(255,255,255,0.8)' : s.warn ? '#991B1B' : '#6B7280',
                }}
              >
                {s.label}
              </div>
              <span className="text-lg">{s.icon}</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <div
                className="text-[28px] font-extrabold tracking-tight"
                style={{ color: s.main ? '#fff' : s.warn ? '#991B1B' : '#1a1a1a' }}
              >
                {s.value}
              </div>
              <div
                className="text-[13px] font-semibold"
                style={{ color: s.main ? 'rgba(255,255,255,0.8)' : s.warn ? '#991B1B' : '#6B7280' }}
              >
                {s.suffix}
              </div>
            </div>
            {s.trend && (
              <div
                className="text-[11px] font-bold"
                style={{
                  color: s.main ? 'rgba(255,255,255,0.9)' : s.warn ? '#DC2626' : THEME.accent,
                }}
              >
                {s.trend} {s.trendLabel}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 최근 가입 학원 */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] mb-6">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div>
            <div className="text-[15px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
              <span>🏫</span> 최근 가입 학원
            </div>
            <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
              최근 등록된 학원 {RECENT_ACADEMIES.length}개
            </div>
          </div>
          <button
            onClick={() => navigate('/master/academies')}
            className="text-[12px] font-bold px-3.5 py-1.5 border rounded-full transition-all hover:-translate-y-px"
            style={{
              color: THEME.accent,
              borderColor: THEME.accent,
              background: '#fff',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = THEME.accentBg }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
          >
            전체 보기 →
          </button>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC]">
              {['학원명', '원장', '플랜', '학생 수', '가입일', '상태'].map((h, i) => (
                <th
                  key={i}
                  className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_ACADEMIES.map((a, i) => {
              const st = STATUS_STYLE[a.status]
              return (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/master/academies/${a.id}`)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                  style={{
                    borderBottom: i < RECENT_ACADEMIES.length - 1 ? '1px solid #F1F5F9' : 'none',
                  }}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-extrabold text-white"
                        style={{ background: THEME.gradient }}
                      >
                        {a.name[0]}
                      </div>
                      <div className="text-[13px] font-bold text-ink">{a.name}</div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-ink">{a.owner}</td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2.5 py-1 rounded-full">
                      {a.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[13px] font-bold" style={{ color: THEME.accent }}>
                    {a.students}명
                  </td>
                  <td className="px-5 py-3 text-[12px] font-semibold text-ink-secondary">{a.joined}</td>
                  <td className="px-5 py-3">
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{
                        color: st.color,
                        background: st.bg,
                        border: `1px solid ${st.border}60`,
                      }}
                    >
                      {st.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-3 max-md:grid-cols-1 gap-3">
        {[
          { icon: '🏫', title: '학원 관리', desc: '전체 학원 목록 및 상세 관리', path: '/master/academies' },
          { icon: '💰', title: '매출 관리', desc: '결제 내역 및 미납 학원 확인', path: '/master/billing' },
          { icon: '📢', title: '공지사항', desc: '전체 학원에 공지 발송 (준비중)', path: null },
        ].map((m, i) => (
          <div
            key={i}
            onClick={() => m.path && navigate(m.path)}
            className="bg-white border border-line rounded-2xl p-5 transition-all shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
            style={{
              cursor: m.path ? 'pointer' : 'not-allowed',
              opacity: m.path ? 1 : 0.5,
            }}
            onMouseEnter={e => {
              if (m.path) {
                e.currentTarget.style.borderColor = THEME.accentBorder
                e.currentTarget.style.boxShadow = `0 8px 24px ${THEME.accentShadow}`
                e.currentTarget.style.transform = 'translateY(-2px)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#E5E7EB'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: THEME.accentBg }}
              >
                {m.icon}
              </div>
              <div className="text-[14px] font-extrabold text-ink">{m.title}</div>
            </div>
            <div className="text-[12px] font-medium text-ink-secondary leading-[1.6]">
              {m.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}