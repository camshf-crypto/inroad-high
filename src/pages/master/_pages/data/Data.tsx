import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

const THEME = {
    accent: '#7C3AED',
    accentDark: '#5B21B6',
    accentBg: '#F5F3FF',
    accentBorder: '#C4B5FD',
    accentShadow: 'rgba(124, 58, 237, 0.15)',
    gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

// 🏫 학원별 데이터
const ACADEMIES_DATA: Record<string, any> = {
    all: {
        id: 'all',
        name: '전체 학원',
        icon: '🏢',
        stats: {
            students: 2341,
            essays: 1852,
            answers: 18420,
            simulations: 6187,
            feedbacks: 24891,
            dataSize: '45.8 GB',
        },
        grades: [
            { grade: '중1', count: 215, color: '#6EE7B7' },
            { grade: '중2', count: 342, color: '#34D399' },
            { grade: '중3', count: 428, color: '#10B981' },
            { grade: '고1', count: 512, color: '#93C5FD' },
            { grade: '고2', count: 468, color: '#60A5FA' },
            { grade: '고3', count: 376, color: '#3B82F6' },
        ],
        monthly: [
            { month: '2024.11', students: 1520, records: 12400, simulations: 4200 },
            { month: '2024.12', students: 1680, records: 13800, simulations: 4650 },
            { month: '2025.01', students: 1854, records: 15600, simulations: 5120 },
            { month: '2025.02', students: 2023, records: 17100, simulations: 5580 },
            { month: '2025.03', students: 2193, records: 18800, simulations: 5766 },
            { month: '2025.04', students: 2341, records: 24891, simulations: 6187 },
        ],
    },
    '1': {
        id: 1,
        name: '강남 에스엠 학원',
        icon: '🏫',
        region: '서울 강남',
        code: 'INROAD-SM01-0001',
        stats: {
            students: 87,
            essays: 68,
            answers: 684,
            simulations: 245,
            feedbacks: 923,
            dataSize: '1.8 GB',
        },
        grades: [
            { grade: '중1', count: 8, color: '#6EE7B7' },
            { grade: '중2', count: 12, color: '#34D399' },
            { grade: '중3', count: 15, color: '#10B981' },
            { grade: '고1', count: 18, color: '#93C5FD' },
            { grade: '고2', count: 20, color: '#60A5FA' },
            { grade: '고3', count: 14, color: '#3B82F6' },
        ],
        monthly: [
            { month: '2024.11', students: 68, records: 520, simulations: 178 },
            { month: '2024.12', students: 72, records: 580, simulations: 195 },
            { month: '2025.01', students: 76, records: 620, simulations: 208 },
            { month: '2025.02', students: 80, records: 680, simulations: 221 },
            { month: '2025.03', students: 84, records: 750, simulations: 233 },
            { month: '2025.04', students: 87, records: 923, simulations: 245 },
        ],
    },
    '2': {
        id: 2,
        name: '목동 프리미엄 아카데미',
        icon: '🏫',
        region: '서울 양천',
        code: 'INROAD-MD02-0002',
        stats: {
            students: 52,
            essays: 38,
            answers: 412,
            simulations: 142,
            feedbacks: 534,
            dataSize: '980 MB',
        },
        grades: [
            { grade: '고1', count: 18, color: '#93C5FD' },
            { grade: '고2', count: 20, color: '#60A5FA' },
            { grade: '고3', count: 14, color: '#3B82F6' },
        ],
        monthly: [
            { month: '2024.11', students: 42, records: 320, simulations: 108 },
            { month: '2024.12', students: 45, records: 365, simulations: 118 },
            { month: '2025.01', students: 47, records: 395, simulations: 124 },
            { month: '2025.02', students: 49, records: 425, simulations: 131 },
            { month: '2025.03', students: 51, records: 470, simulations: 137 },
            { month: '2025.04', students: 52, records: 534, simulations: 142 },
        ],
    },
    '6': {
        id: 6,
        name: '대치 토스트교육',
        icon: '🏫',
        region: '서울 강남',
        code: 'INROAD-DC06-0006',
        stats: {
            students: 125,
            essays: 98,
            answers: 1023,
            simulations: 356,
            feedbacks: 1423,
            dataSize: '2.4 GB',
        },
        grades: [
            { grade: '중1', count: 12, color: '#6EE7B7' },
            { grade: '중2', count: 18, color: '#34D399' },
            { grade: '중3', count: 22, color: '#10B981' },
            { grade: '고1', count: 25, color: '#93C5FD' },
            { grade: '고2', count: 28, color: '#60A5FA' },
            { grade: '고3', count: 20, color: '#3B82F6' },
        ],
        monthly: [
            { month: '2024.11', students: 98, records: 820, simulations: 267 },
            { month: '2024.12', students: 105, records: 910, simulations: 289 },
            { month: '2025.01', students: 112, records: 985, simulations: 305 },
            { month: '2025.02', students: 117, records: 1080, simulations: 322 },
            { month: '2025.03', students: 121, records: 1245, simulations: 340 },
            { month: '2025.04', students: 125, records: 1423, simulations: 356 },
        ],
    },
    '9': {
        id: 9,
        name: '광교 엘리트학원',
        icon: '🏫',
        region: '경기 수원',
        code: 'INROAD-GK09-0009',
        stats: {
            students: 92,
            essays: 72,
            answers: 754,
            simulations: 267,
            feedbacks: 1156,
            dataSize: '1.9 GB',
        },
        grades: [
            { grade: '중2', count: 10, color: '#34D399' },
            { grade: '중3', count: 15, color: '#10B981' },
            { grade: '고1', count: 20, color: '#93C5FD' },
            { grade: '고2', count: 25, color: '#60A5FA' },
            { grade: '고3', count: 22, color: '#3B82F6' },
        ],
        monthly: [
            { month: '2024.11', students: 72, records: 620, simulations: 195 },
            { month: '2024.12', students: 78, records: 695, simulations: 212 },
            { month: '2025.01', students: 82, records: 755, simulations: 225 },
            { month: '2025.02', students: 86, records: 830, simulations: 238 },
            { month: '2025.03', students: 89, records: 970, simulations: 253 },
            { month: '2025.04', students: 92, records: 1156, simulations: 267 },
        ],
    },
}

// 학원 목록 (필터용)
const ACADEMY_LIST = [
    { id: 'all', name: '🏢 전체 학원', region: '', students: 2341 },
    { id: '6', name: '🏫 대치 토스트교육', region: '서울 강남', students: 125 },
    { id: '9', name: '🏫 광교 엘리트학원', region: '경기 수원', students: 92 },
    { id: '1', name: '🏫 강남 에스엠 학원', region: '서울 강남', students: 87 },
    { id: '2', name: '🏫 목동 프리미엄 아카데미', region: '서울 양천', students: 52 },
]

const TOP_ACADEMIES = [
    { rank: 1, id: '6', name: '대치 토스트교육', students: 125, records: 1423, contribution: 18.2 },
    { rank: 2, id: '9', name: '광교 엘리트학원', students: 92, records: 1156, contribution: 14.8 },
    { rank: 3, id: '1', name: '강남 에스엠 학원', students: 87, records: 923, contribution: 12.6 },
    { rank: 4, id: '4', name: '일산 스마트학원', students: 76, records: 892, contribution: 11.4 },
    { rank: 5, id: '7', name: '서초 아카데미', students: 68, records: 734, contribution: 9.4 },
]

export default function MasterData() {
    const [selectedAcademy, setSelectedAcademy] = useState('all')
    const [showExport, setShowExport] = useState(false)

    const currentData = ACADEMIES_DATA[selectedAcademy] || ACADEMIES_DATA.all
    const isAll = selectedAcademy === 'all'

    // 성장률 계산
    const firstMonth = currentData.monthly[0]?.students || 0
    const lastMonth = currentData.monthly[currentData.monthly.length - 1]?.students || 0
    const growthRate = firstMonth > 0 ? Math.round(((lastMonth - firstMonth) / firstMonth) * 100) : 0

    // 통계 카드
    const statsCards = [
        { label: '학생 수', value: currentData.stats.students.toLocaleString(), suffix: '명', icon: '🧑‍🎓', main: true },
        { label: '자소서', value: currentData.stats.essays.toLocaleString(), suffix: '건', icon: '📝' },
        { label: '면접 답변', value: currentData.stats.answers.toLocaleString(), suffix: '건', icon: '💬' },
        { label: '시뮬레이션', value: currentData.stats.simulations.toLocaleString(), suffix: '건', icon: '🎙️' },
        { label: '피드백 이력', value: currentData.stats.feedbacks.toLocaleString(), suffix: '건', icon: '✅' },
        { label: '데이터 크기', value: currentData.stats.dataSize, suffix: '', icon: '🤖' },
    ]

    const handleExport = (type: string) => {
        alert(`📥 [${currentData.name}] ${type} 데이터를 다운로드합니다...\n\n(실제 서비스에서는 CSV/JSON 파일이 다운로드됩니다)`)
        setShowExport(false)
    }

    return (
        <div className="px-8 py-7 min-h-full">

            {/* 헤더 */}
            <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">🗄️</span>
                        <div className="text-[22px] font-extrabold text-ink tracking-tight">데이터 웨어하우스</div>
                    </div>
                    <div className="text-[13px] font-medium text-ink-secondary">
                        익명화된 학습 데이터를 분석하고 AI 학습에 활용하세요.
                    </div>
                </div>

                <button
                    onClick={() => setShowExport(true)}
                    className="h-10 px-5 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
                    style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                >
                    📥 데이터 내보내기
                </button>
            </div>

            {/* 🔥 학원 필터 선택 */}
            <div className="bg-white border border-line rounded-2xl px-5 py-4 mb-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-[12px] font-bold text-ink-secondary flex items-center gap-1.5 flex-shrink-0">
                        <span>🏫</span>
                        <span>학원 선택:</span>
                    </div>

                    {/* 드롭다운 */}
                    <select
                        value={selectedAcademy}
                        onChange={e => setSelectedAcademy(e.target.value)}
                        className="h-10 pl-4 pr-10 border rounded-lg text-[13px] font-bold outline-none cursor-pointer bg-white appearance-none"
            style={{ borderColor: THEME.accentBorder, color: THEME.accentDark, width: 380, backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237C3AED' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                    >
                        {ACADEMY_LIST.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.name} {a.region ? `· ${a.region}` : ''} {a.id !== 'all' ? `· ${a.students}명` : ''}
                            </option>
                        ))}
                    </select>

                    {/* 현재 선택 표시 */}
                    <div
                        className="rounded-lg px-3 py-2 flex items-center gap-2"
                        style={{ background: isAll ? THEME.gradient : THEME.accentBg, color: isAll ? '#fff' : THEME.accentDark }}
                    >
                        <span className="text-sm">{currentData.icon}</span>
                        <div>
                            <div className="text-[13px] font-extrabold leading-tight">{currentData.name}</div>
                            {!isAll && currentData.region && (
                                <div className="text-[10px] font-medium opacity-80 leading-tight">
                                    📍 {currentData.region} · 🔑 {currentData.code}
                                </div>
                            )}
                        </div>
                    </div>

                    {!isAll && (
                        <button
                            onClick={() => setSelectedAcademy('all')}
                            className="h-9 px-3 bg-white border border-line rounded-lg text-[11px] font-bold text-ink-secondary hover:bg-gray-50 transition-colors"
                        >
                            ← 전체로
                        </button>
                    )}
                </div>
            </div>

            {/* 법적 고지 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-5 flex items-start gap-3">
                <span className="text-xl">⚖️</span>
                <div className="flex-1">
                    <div className="text-[13px] font-bold text-amber-800 mb-0.5">개인정보 보호 안내</div>
                    <div className="text-[11px] font-medium text-amber-700 leading-[1.6]">
                        모든 데이터는 <strong>익명화 처리</strong>되어 개인 식별이 불가능해요. 학생 동의 하에 AI 학습 및 서비스 개선 목적으로만 사용돼요.
                    </div>
                </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-3 max-md:grid-cols-2 gap-3 mb-5">
                {statsCards.map((s, i) => (
                    <div
                        key={i}
                        className="rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5"
                        style={{
                            background: s.main ? THEME.gradient : '#fff',
                            border: s.main ? 'none' : '1px solid #E5E7EB',
                            boxShadow: s.main ? `0 8px 24px ${THEME.accentShadow}` : '0 2px 8px rgba(15, 23, 42, 0.04)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: s.main ? 'rgba(255,255,255,0.8)' : '#6B7280' }}>
                                {s.label}
                            </div>
                            <span className="text-xl">{s.icon}</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-1">
                            <div className="text-[28px] font-extrabold tracking-tight" style={{ color: s.main ? '#fff' : '#1a1a1a' }}>
                                {s.value}
                            </div>
                            <div className="text-[13px] font-semibold" style={{ color: s.main ? 'rgba(255,255,255,0.8)' : '#6B7280' }}>
                                {s.suffix}
                            </div>
                        </div>
                        {s.main && growthRate > 0 && (
                            <div className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                ▲ +{growthRate}% (6개월 기준)
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* 차트 2개 */}
            <div className="grid grid-cols-3 max-md:grid-cols-1 gap-3 mb-5">

                {/* 월별 데이터 증가 (2/3) */}
                <div className="col-span-2 bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-[14px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
                                📈 {isAll ? '전체' : currentData.name} 월별 데이터 축적량
                            </div>
                            <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                                최근 6개월 학생/기록/시뮬레이션 추이
                            </div>
                        </div>
                    </div>

                    <div style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={currentData.monthly}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }} />
                                <Line type="monotone" dataKey="students" name="학생" stroke="#7C3AED" strokeWidth={2.5} dot={{ fill: '#7C3AED', r: 4 }} />
                                <Line type="monotone" dataKey="records" name="학습기록" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 4 }} />
                                <Line type="monotone" dataKey="simulations" name="시뮬레이션" stroke="#F59E0B" strokeWidth={2.5} dot={{ fill: '#F59E0B', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex gap-4 justify-center mt-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                            <div className="w-3 h-3 rounded-sm" style={{ background: '#7C3AED' }} />학생
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                            <div className="w-3 h-3 rounded-sm bg-green-500" />학습기록
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                            <div className="w-3 h-3 rounded-sm bg-amber-500" />시뮬레이션
                        </div>
                    </div>
                </div>

                {/* 학년별 분포 (1/3) */}
                <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                    <div className="mb-3">
                        <div className="text-[14px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
                            🎓 학년별 분포
                        </div>
                        <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                            학생 {currentData.grades.reduce((s: number, g: any) => s + g.count, 0).toLocaleString()}명
                        </div>
                    </div>

                    <div style={{ height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={currentData.grades} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="count">
                                    {currentData.grades.map((entry: any, i: number) => (<Cell key={i} fill={entry.color} />))}
                                </Pie>
                                <Tooltip formatter={(v: any) => `${v}명`} contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex flex-col gap-1 mt-2">
                        {currentData.grades.map((g: any, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: g.color }} />
                                <div className="text-[11px] font-bold text-ink flex-1">{g.grade}</div>
                                <div className="text-[11px] font-extrabold" style={{ color: g.color }}>{g.count}명</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 데이터 기여도 TOP 학원 (전체 모드에서만 표시) */}
            {isAll && (
                <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] mb-5">
                    <div className="px-6 py-4 border-b border-line">
                        <div className="text-[15px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
                            🏆 데이터 기여도 TOP 5 (클릭해서 상세 보기)
                        </div>
                        <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                            가장 많은 학습 데이터를 제공하는 학원이에요
                        </div>
                    </div>

                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-[#F8FAFC]">
                                {['순위', '학원명', '학생 수', '학습 기록', '기여도', '액션'].map((h, i) => (
                                    <th key={i} className="px-4 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {TOP_ACADEMIES.map((a, i) => (
                                <tr key={a.rank} style={{ borderBottom: i < TOP_ACADEMIES.length - 1 ? '1px solid #F1F5F9' : 'none' }} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px] font-extrabold text-white" style={{ background: a.rank <= 3 ? THEME.gradient : '#9CA3AF' }}>
                                            {a.rank === 1 ? '🥇' : a.rank === 2 ? '🥈' : a.rank === 3 ? '🥉' : a.rank}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[13px] font-extrabold text-ink">{a.name}</td>
                                    <td className="px-4 py-3 text-[13px] font-bold" style={{ color: THEME.accent }}>{a.students}명</td>
                                    <td className="px-4 py-3 text-[13px] font-extrabold text-ink">{a.records.toLocaleString()}건</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${a.contribution}%`, background: THEME.gradient }} />
                                            </div>
                                            <span className="text-[12px] font-extrabold" style={{ color: THEME.accent }}>{a.contribution}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setSelectedAcademy(a.id)}
                                            className="h-8 px-3 border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                                            style={{ color: THEME.accent, borderColor: THEME.accentBorder, background: '#fff' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = THEME.accentBg }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                                        >
                                            🔍 상세 분석 →
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 학원별 모드일때 정보 */}
            {!isAll && (
                <div
                    className="rounded-2xl px-6 py-5 mb-5 border-2"
                    style={{ background: THEME.accentBg, borderColor: THEME.accentBorder }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">💡</span>
                        <div>
                            <div className="text-[15px] font-extrabold" style={{ color: THEME.accentDark }}>
                                {currentData.name} 데이터 인사이트
                            </div>
                            <div className="text-[11px] font-medium" style={{ color: THEME.accentDark, opacity: 0.8 }}>
                                이 학원의 학습 데이터 특징이에요
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 max-md:grid-cols-1 gap-3">
                        <div className="bg-white rounded-lg px-4 py-3">
                            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">📈 성장률 (6개월)</div>
                            <div className="text-[18px] font-extrabold" style={{ color: growthRate > 0 ? '#059669' : '#DC2626' }}>
                                {growthRate > 0 ? '▲' : '▼'} {Math.abs(growthRate)}%
                            </div>
                        </div>
                        <div className="bg-white rounded-lg px-4 py-3">
                            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">💬 학생당 답변 수</div>
                            <div className="text-[18px] font-extrabold" style={{ color: THEME.accent }}>
                                {Math.round(currentData.stats.answers / currentData.stats.students)}건
                            </div>
                        </div>
                        <div className="bg-white rounded-lg px-4 py-3">
                            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">✅ 학생당 피드백 수</div>
                            <div className="text-[18px] font-extrabold" style={{ color: THEME.accent }}>
                                {Math.round(currentData.stats.feedbacks / currentData.stats.students)}건
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI 활용 */}
            <div className="grid grid-cols-3 max-md:grid-cols-1 gap-3">
                {[
                    { icon: '🤖', title: 'AI 모델 학습', desc: `${isAll ? '전체' : currentData.name} 데이터로 면접 AI 모델 개선`, count: currentData.stats.dataSize, action: '학습 데이터셋 다운로드' },
                    { icon: '📊', title: '인사이트 리포트', desc: `${isAll ? '전체 학원' : currentData.name} 학습 패턴 분석`, count: '월 1회', action: '리포트 생성' },
                    { icon: '🎯', title: '개인화 추천', desc: '학생 데이터로 맞춤 학습 경로 제안', count: `${currentData.stats.students}명`, action: '추천 엔진 설정' },
                ].map((m, i) => (
                    <div key={i} className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: THEME.accentBg }}>
                                {m.icon}
                            </div>
                            <div>
                                <div className="text-[14px] font-extrabold text-ink">{m.title}</div>
                                <div className="text-[11px] font-bold" style={{ color: THEME.accent }}>{m.count}</div>
                            </div>
                        </div>
                        <div className="text-[11px] font-medium text-ink-secondary leading-[1.6] mb-3">{m.desc}</div>
                        <button
                            onClick={() => alert(`${m.action} (준비중)`)}
                            className="w-full h-9 border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                            style={{ color: THEME.accent, borderColor: THEME.accent, background: '#fff' }}
                            onMouseEnter={e => { e.currentTarget.style.background = THEME.accentBg }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                        >
                            {m.action} →
                        </button>
                    </div>
                ))}
            </div>

            {/* 데이터 내보내기 모달 */}
            {showExport && (
                <div onClick={() => setShowExport(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                        <div className="px-6 py-5" style={{ background: THEME.gradient }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-[18px] font-extrabold text-white">📥 데이터 내보내기</div>
                                    <div className="text-[12px] text-white/80 mt-0.5">{currentData.icon} {currentData.name} 데이터</div>
                                </div>
                                <button onClick={() => setShowExport(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
                            </div>
                        </div>

                        <div className="px-6 py-5">
                            <div className="flex flex-col gap-2">
                                {[
                                    { icon: '🧑‍🎓', label: '학생 데이터 (익명)', desc: `CSV · ${currentData.stats.students.toLocaleString()}행`, type: 'students' },
                                    { icon: '📝', label: '자소서 데이터 (익명)', desc: `JSON · ${currentData.stats.essays.toLocaleString()}건`, type: 'essays' },
                                    { icon: '💬', label: '면접 답변 데이터 (익명)', desc: `JSON · ${currentData.stats.answers.toLocaleString()}건`, type: 'answers' },
                                    { icon: '🤖', label: 'AI 학습용 데이터셋', desc: `JSONL · ${currentData.stats.dataSize}`, type: 'ai' },
                                    { icon: '📊', label: '통계 리포트', desc: 'PDF · 월간 리포트', type: 'report' },
                                    { icon: '🗄️', label: '전체 백업 (암호화)', desc: 'ZIP · 모든 데이터', type: 'backup' },
                                ].map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleExport(item.label)}
                                        className="px-4 py-3 rounded-xl border transition-all text-left flex items-center gap-3"
                                        style={{ borderColor: '#E5E7EB', background: '#fff' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = THEME.accent; e.currentTarget.style.background = THEME.accentBg }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#fff' }}
                                    >
                                        <span className="text-2xl">{item.icon}</span>
                                        <div className="flex-1">
                                            <div className="text-[13px] font-extrabold text-ink">{item.label}</div>
                                            <div className="text-[11px] font-medium text-ink-muted">{item.desc}</div>
                                        </div>
                                        <span className="text-[11px] font-bold" style={{ color: THEME.accent }}>📥</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-line">
                            <button onClick={() => setShowExport(false)} className="w-full h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors">
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}