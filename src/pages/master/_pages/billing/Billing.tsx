import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

// 월별 매출 데이터 (12개월)
const MONTHLY_REVENUE = [
  { month: '2024.05', revenue: 12500000, academies: 28 },
  { month: '2024.06', revenue: 13800000, academies: 30 },
  { month: '2024.07', revenue: 14200000, academies: 31 },
  { month: '2024.08', revenue: 15600000, academies: 33 },
  { month: '2024.09', revenue: 17200000, academies: 35 },
  { month: '2024.10', revenue: 18500000, academies: 37 },
  { month: '2024.11', revenue: 19800000, academies: 39 },
  { month: '2024.12', revenue: 20100000, academies: 40 },
  { month: '2025.01', revenue: 21300000, academies: 41 },
  { month: '2025.02', revenue: 22100000, academies: 43 },
  { month: '2025.03', revenue: 22800000, academies: 45 },
  { month: '2025.04', revenue: 23400000, academies: 47 },
]

// 플랜별 매출 비중
const PLAN_REVENUE = [
  { name: '고등+중등', value: 14200000, count: 18, color: '#7C3AED' },
  { name: '고등만', value: 5800000, count: 15, color: '#2563EB' },
  { name: '중등만', value: 3400000, count: 11, color: '#059669' },
]

// 최근 결제 내역 (전체 학원)
const RECENT_PAYMENTS = [
  { id: 1, academy: '강남 에스엠 학원', owner: '강원장', plan: '고등+중등', amount: 870000, date: '2025.04.14', method: '카드', status: 'paid' },
  { id: 2, academy: '대치 토스트교육', owner: '윤원장', plan: '고등+중등', amount: 1250000, date: '2025.04.14', method: '카드', status: 'paid' },
  { id: 3, academy: '광교 엘리트학원', owner: '오원장', plan: '고등+중등', amount: 920000, date: '2025.04.13', method: '계좌이체', status: 'paid' },
  { id: 4, academy: '일산 스마트학원', owner: '최원장', plan: '고등+중등', amount: 760000, date: '2025.04.12', method: '카드', status: 'paid' },
  { id: 5, academy: '서초 아카데미', owner: '한원장', plan: '고등', amount: 680000, date: '2025.04.12', method: '카드', status: 'paid' },
  { id: 6, academy: '대전 지식의문', owner: '조원장', plan: '고등+중등', amount: 580000, date: '2025.04.11', method: '계좌이체', status: 'paid' },
  { id: 7, academy: '목동 프리미엄 아카데미', owner: '이원장', plan: '고등', amount: 520000, date: '2025.04.10', method: '카드', status: 'paid' },
  { id: 8, academy: '인천 미래교육', owner: '권원장', plan: '중등', amount: 470000, date: '2025.04.09', method: '카드', status: 'paid' },
  { id: 9, academy: '판교 리버스쿨', owner: '정원장', plan: '고등', amount: 450000, date: '2025.04.05', method: '-', status: 'unpaid' },
  { id: 10, academy: '수원 학습코칭', owner: '서원장', plan: '고등', amount: 380000, date: '2025.04.05', method: '-', status: 'unpaid' },
  { id: 11, academy: '송파 브레인스쿨', owner: '임원장', plan: '중등', amount: 0, date: '2025.04.08', method: '-', status: 'trial' },
  { id: 12, academy: '분당 에듀케어', owner: '박원장', plan: '중등', amount: 0, date: '2025.04.10', method: '-', status: 'trial' },
]

// 미납 학원
const UNPAID_ACADEMIES = [
  { id: 5, name: '판교 리버스쿨', owner: '정원장', amount: 450000, months: 2, lastPayment: '2025.02.05' },
  { id: 10, name: '수원 학습코칭', owner: '서원장', amount: 380000, months: 1, lastPayment: '2025.03.05' },
  { id: 99, name: '대구 미래학원', owner: '강원장', amount: 520000, months: 3, lastPayment: '2025.01.15' },
]

const STATUS_STYLE: Record<string, any> = {
  paid: { color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', label: '✓ 완료' },
  unpaid: { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', label: '⚠️ 미납' },
  trial: { color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD', label: '🎁 체험' },
}

export default function MasterBilling() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<'6m' | '12m'>('12m')

  // 통계 계산
  const currentRevenue = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 1].revenue
  const prevRevenue = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 2].revenue
  const growthRate = Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)

  const totalPaid = RECENT_PAYMENTS.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
  const totalUnpaid = UNPAID_ACADEMIES.reduce((sum, a) => sum + (a.amount * a.months), 0)
  const trialCount = RECENT_PAYMENTS.filter(p => p.status === 'trial').length

  const chartData = period === '6m' ? MONTHLY_REVENUE.slice(-6) : MONTHLY_REVENUE

  const formatKRW = (value: number) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(1)}천만`
    if (value >= 10000) return `${(value / 10000).toFixed(0)}만`
    return value.toLocaleString()
  }

  return (
    <div className="px-8 py-7 min-h-full">

      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">💰</span>
          <div className="text-[22px] font-extrabold text-ink tracking-tight">매출 관리</div>
        </div>
        <div className="text-[13px] font-medium text-ink-secondary">
          비커스 전체 매출 현황과 결제 내역을 관리하세요.
        </div>
      </div>

      {/* 핵심 통계 카드 */}
      <div className="grid grid-cols-4 max-md:grid-cols-2 gap-3 mb-5">
        {/* 이번 달 매출 (메인) */}
        <div
          className="rounded-2xl px-5 py-4 relative overflow-hidden"
          style={{
            background: THEME.gradient,
            boxShadow: `0 8px 24px ${THEME.accentShadow}`,
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                이번 달 매출
              </div>
              <span className="text-base">💰</span>
            </div>
            <div className="text-[24px] font-extrabold text-white tracking-tight mb-1">
              ₩{currentRevenue.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-white/90">
              <span>{growthRate > 0 ? '▲' : '▼'}</span>
              <span>{Math.abs(growthRate)}%</span>
              <span className="text-white/70">전월대비</span>
            </div>
          </div>
        </div>

        {/* 누적 결제 */}
        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              이번 달 결제 완료
            </div>
            <span className="text-base">✅</span>
          </div>
          <div className="text-[22px] font-extrabold text-green-600 tracking-tight mb-1">
            ₩{totalPaid.toLocaleString()}
          </div>
          <div className="text-[11px] font-bold text-ink-muted">
            {RECENT_PAYMENTS.filter(p => p.status === 'paid').length}건 결제
          </div>
        </div>

        {/* 미납 */}
        <div
          className="rounded-2xl px-5 py-4"
          style={{
            background: totalUnpaid > 0 ? '#FEF2F2' : '#fff',
            border: `1px solid ${totalUnpaid > 0 ? '#FCA5A5' : '#E5E7EB'}`,
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: totalUnpaid > 0 ? '#991B1B' : '#6B7280' }}
            >
              미납 금액
            </div>
            <span className="text-base">⚠️</span>
          </div>
          <div
            className="text-[22px] font-extrabold tracking-tight mb-1"
            style={{ color: totalUnpaid > 0 ? '#991B1B' : '#1a1a1a' }}
          >
            ₩{totalUnpaid.toLocaleString()}
          </div>
          <div
            className="text-[11px] font-bold"
            style={{ color: totalUnpaid > 0 ? '#DC2626' : '#6B7280' }}
          >
            {UNPAID_ACADEMIES.length}개 학원
          </div>
        </div>

        {/* 체험중 */}
        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              체험중 학원
            </div>
            <span className="text-base">🎁</span>
          </div>
          <div className="text-[22px] font-extrabold text-blue-600 tracking-tight mb-1">
            {trialCount}<span className="text-[13px] font-semibold text-ink-muted ml-1">개</span>
          </div>
          <div className="text-[11px] font-bold text-ink-muted">
            14일 무료 체험 중
          </div>
        </div>
      </div>

      {/* 차트 2개 (Line + Pie) */}
      <div className="grid grid-cols-3 max-md:grid-cols-1 gap-3 mb-5">

        {/* 월별 매출 추이 (2/3 너비) */}
        <div className="col-span-2 bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
                📈 월별 매출 추이
              </div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                최근 {period === '6m' ? '6' : '12'}개월 매출 현황
              </div>
            </div>
            <div className="flex gap-1">
              {[
                { key: '6m', label: '6개월' },
                { key: '12m', label: '12개월' },
              ].map(p => {
                const isActive = period === p.key
                return (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key as any)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all"
                    style={{
                      borderColor: isActive ? THEME.accent : '#E5E7EB',
                      background: isActive ? THEME.accentBg : '#fff',
                      color: isActive ? THEME.accentDark : '#6B7280',
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatKRW} tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: any) => [`₩${value.toLocaleString()}`, '매출']}
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7C3AED"
                  strokeWidth={3}
                  dot={{ fill: '#7C3AED', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 플랜별 매출 비중 (1/3 너비) */}
        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="mb-3">
            <div className="text-[14px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
              🎯 플랜별 매출
            </div>
            <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
              이번 달 플랜별 비중
            </div>
          </div>

          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PLAN_REVENUE}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {PLAN_REVENUE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => `₩${value.toLocaleString()}`}
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            {PLAN_REVENUE.map((p, i) => {
              const total = PLAN_REVENUE.reduce((s, x) => s + x.value, 0)
              const pct = Math.round((p.value / total) * 100)
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
                  <div className="text-[11px] font-bold text-ink flex-1">{p.name}</div>
                  <div className="text-[11px] font-semibold text-ink-muted">{p.count}개</div>
                  <div className="text-[11px] font-extrabold" style={{ color: p.color }}>{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 미납 학원 경고 */}
      {UNPAID_ACADEMIES.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <div className="text-[14px] font-extrabold text-red-900">미납 학원 {UNPAID_ACADEMIES.length}개</div>
                <div className="text-[11px] font-semibold text-red-700">
                  총 미납금 ₩{totalUnpaid.toLocaleString()}
                </div>
              </div>
            </div>
            <button
              onClick={() => alert(`${UNPAID_ACADEMIES.length}개 학원에 독촉 알림 발송 (Mock)`)}
              className="h-9 px-4 bg-red-500 text-white rounded-lg text-[12px] font-bold hover:bg-red-600 transition-colors"
            >
              📧 전체 독촉 알림 발송
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {UNPAID_ACADEMIES.map((a, i) => (
              <div
                key={a.id}
                onClick={() => navigate(`/master/academies/${a.id}`)}
                className="bg-white border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:border-red-400 transition-colors flex-wrap gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-[13px] font-extrabold text-red-700">
                    {a.name[0]}
                  </div>
                  <div>
                    <div className="text-[13px] font-extrabold text-ink">{a.name}</div>
                    <div className="text-[10px] font-medium text-ink-muted">
                      👑 {a.owner} · 최근결제 {a.lastPayment}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[13px] font-extrabold text-red-700">
                      ₩{(a.amount * a.months).toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold text-red-600">{a.months}개월 미납</div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      alert(`${a.name}에 독촉 알림 발송 (Mock)`)
                    }}
                    className="h-8 px-3 bg-red-500 text-white rounded-md text-[11px] font-bold hover:bg-red-600 transition-colors flex-shrink-0"
                  >
                    📧 알림
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 결제 내역 */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[15px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
              💳 최근 결제 내역
            </div>
            <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
              전체 학원 결제 기록
            </div>
          </div>
          <button
            onClick={() => alert('엑셀 다운로드 (Mock)')}
            className="h-9 px-3.5 bg-white border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
            style={{ color: THEME.accent, borderColor: THEME.accent }}
          >
            📥 엑셀 다운로드
          </button>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC]">
              {['학원명', '원장', '플랜', '결제일', '금액', '결제 수단', '상태'].map((h, i) => (
                <th key={i} className="px-4 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_PAYMENTS.map((p, i) => {
              const st = STATUS_STYLE[p.status]
              return (
                <tr
                  key={p.id}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                  style={{ borderBottom: i < RECENT_PAYMENTS.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0"
                        style={{ background: THEME.gradient }}
                      >
                        {p.academy[0]}
                      </div>
                      <div className="text-[13px] font-bold text-ink">{p.academy}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12.5px] font-semibold text-ink">{p.owner}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: p.plan === '고등' ? '#2563EB' : p.plan === '중등' ? '#059669' : '#7C3AED',
                        background: p.plan === '고등' ? '#EFF6FF' : p.plan === '중등' ? '#ECFDF5' : '#F5F3FF',
                      }}
                    >
                      {p.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] font-semibold text-ink-secondary">{p.date}</td>
                  <td className="px-4 py-3">
                    {p.amount === 0 ? (
                      <span className="text-[12px] font-bold text-blue-600">체험중</span>
                    ) : (
                      <div className="text-[13px] font-extrabold" style={{ color: p.status === 'unpaid' ? '#DC2626' : THEME.accent }}>
                        ₩{p.amount.toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold text-ink-secondary">
                      {p.method === '-' ? '-' : p.method === '카드' ? '💳 카드' : '🏦 계좌이체'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
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
    </div>
  )
}