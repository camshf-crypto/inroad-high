import { useState } from 'react'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

const ACTION_TYPES: Record<string, { icon: string; color: string; bg: string; label: string; risk: 'low' | 'mid' | 'high' }> = {
  login: { icon: '🔑', color: '#2563EB', bg: '#EFF6FF', label: '로그인', risk: 'low' },
  logout: { icon: '🚪', color: '#6B7280', bg: '#F3F4F6', label: '로그아웃', risk: 'low' },
  view: { icon: '👁️', color: '#6B7280', bg: '#F3F4F6', label: '조회', risk: 'low' },
  create: { icon: '➕', color: '#059669', bg: '#ECFDF5', label: '생성', risk: 'mid' },
  update: { icon: '✏️', color: '#F59E0B', bg: '#FEF3C7', label: '수정', risk: 'mid' },
  delete: { icon: '🗑️', color: '#DC2626', bg: '#FEF2F2', label: '삭제', risk: 'high' },
  reset: { icon: '🔐', color: '#7C3AED', bg: '#F5F3FF', label: '재설정', risk: 'mid' },
  suspend: { icon: '🚫', color: '#DC2626', bg: '#FEF2F2', label: '정지', risk: 'high' },
  notice: { icon: '📢', color: '#2563EB', bg: '#EFF6FF', label: '공지발송', risk: 'low' },
  export: { icon: '📥', color: '#7C3AED', bg: '#F5F3FF', label: '다운로드', risk: 'mid' },
  payment: { icon: '💰', color: '#059669', bg: '#ECFDF5', label: '결제', risk: 'mid' },
  permission: { icon: '🔒', color: '#DC2626', bg: '#FEF2F2', label: '권한변경', risk: 'high' },
}

const STAFF_COLORS: Record<string, string> = {
  '김대표': '#7C3AED',
  '이매니저': '#2563EB',
  '박영업': '#059669',
  '정영업': '#10B981',
  '최CS': '#F59E0B',
  '정재무': '#EC4899',
  '강분석': '#6B7280',
  '김CS': '#F59E0B',
}

// 🎲 Mock 로그 생성 (100건)
const generateMockLogs = () => {
  const staffList = [
    { name: '김대표', role: '슈퍼관리자', ip: '221.140.55.66', device: 'Chrome / MacOS' },
    { name: '이매니저', role: '운영팀', ip: '101.22.33.44', device: 'Safari / MacOS' },
    { name: '박영업', role: '영업팀', ip: '112.34.56.78', device: 'Chrome / MacOS' },
    { name: '정영업', role: '영업팀', ip: '115.45.67.89', device: 'Chrome / Windows' },
    { name: '김CS', role: 'CS팀', ip: '123.45.67.89', device: 'Chrome / Windows' },
    { name: '최CS', role: 'CS팀', ip: '124.56.78.90', device: 'Chrome / Windows' },
    { name: '정재무', role: '재무팀', ip: '192.168.1.100', device: 'Edge / Windows' },
    { name: '강분석', role: '분석팀', ip: '175.32.44.55', device: 'Firefox / Linux' },
  ]

  const actions = [
    { type: 'login', targets: ['마스터 어드민 로그인'], details: ['정상 로그인', '2FA 인증 완료'] },
    { type: 'logout', targets: ['마스터 어드민 로그아웃'], details: ['세션 종료', '자동 로그아웃'] },
    { type: 'view', targets: ['학원 상세 조회: 강남 에스엠 학원', '학원 상세 조회: 목동 프리미엄', '데이터 웨어하우스 조회', '매출 대시보드 조회'], details: ['월별 수강생 추이 확인', '결제 내역 확인', '학습 데이터 분석'] },
    { type: 'update', targets: ['학원 정보 수정: 강남 에스엠 학원', '학원 정보 수정: 대치 토스트교육', '플랜 변경: 일산 스마트학원', '학원 코드 재발급: 광교 엘리트학원'], details: ['주소 변경', '원장 연락처 수정', '고등 → 고등+중등 변경', '보안 이슈로 코드 재발급'] },
    { type: 'create', targets: ['신규 학원 추가: 성남 에듀센터', '신규 학원 추가: 평촌 스마트', '신규 학원 추가: 분당 프리미엄', '신규 학원 추가: 용인 베스트'], details: ['체험 플랜 시작', '고등 플랜 / 월 500,000원', '고등+중등 플랜 / 월 800,000원'] },
    { type: 'delete', targets: ['학원 삭제: 대전 테스트 학원', '학원 삭제: 광주 미사용 학원'], details: ['테스트 계정 영구 삭제', '6개월 미사용으로 삭제'] },
    { type: 'reset', targets: ['비밀번호 재설정: 강남 에스엠 학원', '비밀번호 재설정: 판교 리버스쿨', '비밀번호 재설정: 송파 브레인스쿨', '비밀번호 재설정: 일산 스마트학원'], details: ['원장 비밀번호 재설정', '선생님 김선생 비밀번호 재설정', '학생 비밀번호 재설정'] },
    { type: 'suspend', targets: ['계정 정지: 수원 학습코칭', '계정 정지: 인천 미래교육'], details: ['사유: 3개월 연속 미납', '사유: 약관 위반'] },
    { type: 'notice', targets: ['전체 공지 발송', '개별 공지 발송: 강남 에스엠 학원', '개별 공지 발송: 일산 스마트학원'], details: ['서비스 업데이트 안내 (47개 학원)', '🚨 긴급: 결제 오류 안내', '이벤트 공지'] },
    { type: 'export', targets: ['매출 데이터 다운로드', '학원 데이터 다운로드', '익명화 데이터 다운로드'], details: ['2025년 4월 매출 전체 (Excel)', 'AI 학습용 JSONL 파일 (45.8GB)', '학원별 리스트 (CSV)'] },
    { type: 'payment', targets: ['환불 처리: 인천 미래교육', '환불 처리: 대전 지식의문', '세금계산서 발행: 강남 에스엠'], details: ['부분 환불 150,000원', '전액 환불 500,000원 (계약 해지)', '4월 세금계산서 발행'] },
    { type: 'permission', targets: ['권한 변경: 최CS', '권한 변경: 박영업', '직원 초대: 김신입'], details: ['CS팀 → CS팀 리더', '영업팀 → 영업 매니저', 'CS팀 신입 추가'] },
  ]

  const logs = []
  let id = 100

  // 4월 15일 ~ 4월 20일 까지 분산
  for (let day = 20; day >= 15; day--) {
    // 하루당 약 15-20건 생성
    const dailyCount = 15 + Math.floor(Math.random() * 5)
    for (let j = 0; j < dailyCount; j++) {
      const staff = staffList[Math.floor(Math.random() * staffList.length)]
      const actionGroup = actions[Math.floor(Math.random() * actions.length)]
      const target = actionGroup.targets[Math.floor(Math.random() * actionGroup.targets.length)]
      const detail = actionGroup.details[Math.floor(Math.random() * actionGroup.details.length)]

      const hour = 8 + Math.floor(Math.random() * 11)
      const minute = Math.floor(Math.random() * 60)

      logs.push({
        id: id--,
        date: `2025.04.${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        user: staff.name,
        role: staff.role,
        action: actionGroup.type,
        target,
        detail,
        ip: staff.ip,
        device: staff.device,
      })
    }
  }

  // 날짜 역순 정렬
  return logs.sort((a, b) => b.date.localeCompare(a.date))
}

const MOCK_LOGS = generateMockLogs()

const PERIOD_OPTIONS = [
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'all', label: '전체' },
]

const ITEMS_PER_PAGE = 40

export default function MasterAudit() {
  const [search, setSearch] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const uniqueUsers = Array.from(new Set(MOCK_LOGS.map(l => l.user)))

  const filtered = MOCK_LOGS.filter(l => {
    if (search && !l.target.includes(search) && !l.user.includes(search) && !l.detail.includes(search)) return false
    if (userFilter !== 'all' && l.user !== userFilter) return false
    if (actionFilter !== 'all' && l.action !== actionFilter) return false
    // 기간 필터 (간단 버전)
    if (periodFilter === 'today') return l.date.startsWith('2025.04.20')
    if (periodFilter === 'week') return ['2025.04.20', '2025.04.19', '2025.04.18', '2025.04.17', '2025.04.16', '2025.04.15'].some(d => l.date.startsWith(d))
    return true
  })

  // 페이지네이션
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
  const endIdx = startIdx + ITEMS_PER_PAGE
  const paginated = filtered.slice(startIdx, endIdx)

  const resetPage = () => setCurrentPage(1)

  // 통계
  const todayLogs = MOCK_LOGS.filter(l => l.date.startsWith('2025.04.20'))
  const stats = {
    total: todayLogs.length,
    highRisk: todayLogs.filter(l => ACTION_TYPES[l.action]?.risk === 'high').length,
    critical: todayLogs.filter(l => ['delete', 'permission'].includes(l.action)).length,
    uniqueUsers: Array.from(new Set(todayLogs.map(l => l.user))).length,
  }

  const handleExport = () => {
    alert(`📥 ${filtered.length}건의 로그를 Excel로 다운로드합니다.\n\n(실제 구현시 .xlsx 파일 생성)`)
  }

  return (
    <div className="px-8 py-7 min-h-full">

      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📊</span>
            <div className="text-[22px] font-extrabold text-ink tracking-tight">감사 로그</div>
          </div>
          <div className="text-[13px] font-medium text-ink-secondary">
            모든 작업 이력이 자동 기록됩니다. 법적 증빙 및 보안 추적용이에요.
          </div>
        </div>

        <button
          onClick={handleExport}
          className="h-10 px-5 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
          style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
        >
          📥 Excel 다운로드
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 max-md:grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl px-5 py-4 shadow-[0_8px_24px_rgba(124,58,237,0.15)]" style={{ background: THEME.gradient }}>
          <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1">오늘 총 활동</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-white tracking-tight">{stats.total}</div>
            <div className="text-[13px] font-semibold text-white/80">건</div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">👥 활동 직원</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-ink tracking-tight">{stats.uniqueUsers}</div>
            <div className="text-[13px] font-semibold text-ink-muted">명</div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">⚠️ 위험 작업</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-amber-600 tracking-tight">{stats.highRisk}</div>
            <div className="text-[13px] font-semibold text-ink-muted">건</div>
          </div>
        </div>

        <div
          className="rounded-2xl px-5 py-4"
          style={{
            background: stats.critical > 0 ? '#FEF2F2' : '#fff',
            border: `1px solid ${stats.critical > 0 ? '#FCA5A5' : '#E5E7EB'}`,
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: stats.critical > 0 ? '#991B1B' : '#6B7280' }}>
            🚨 삭제/권한변경
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold tracking-tight" style={{ color: stats.critical > 0 ? '#991B1B' : '#1a1a1a' }}>
              {stats.critical}
            </div>
            <div className="text-[13px] font-semibold" style={{ color: stats.critical > 0 ? '#991B1B' : '#6B7280' }}>건</div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white border border-line rounded-2xl px-5 py-4 mb-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex gap-2.5 items-center flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage() }}
              placeholder="🔍 직원명, 작업, 대상으로 검색..."
              className="w-full h-10 px-4 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
              onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
              onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <select
            value={userFilter}
            onChange={e => { setUserFilter(e.target.value); resetPage() }}
            className="h-9 px-3 border border-line rounded-lg text-[11px] font-bold text-ink bg-white outline-none cursor-pointer"
            style={{ minWidth: 120 }}
          >
            <option value="all">👥 모든 직원</option>
            {uniqueUsers.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); resetPage() }}
            className="h-9 px-3 border border-line rounded-lg text-[11px] font-bold text-ink bg-white outline-none cursor-pointer"
            style={{ minWidth: 120 }}
          >
            <option value="all">🎯 모든 작업</option>
            {Object.entries(ACTION_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>

          <div className="flex gap-1">
            {PERIOD_OPTIONS.map(p => {
              const active = periodFilter === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => { setPeriodFilter(p.key); resetPage() }}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
                  style={{
                    borderColor: active ? THEME.accent : '#E5E7EB',
                    background: active ? THEME.accentBg : '#fff',
                    color: active ? THEME.accentDark : '#6B7280',
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-[11px] font-medium text-ink-secondary">
            검색 결과: <span className="font-extrabold" style={{ color: THEME.accent }}>{filtered.length}건</span>
          </div>
          <div className="text-[10px] font-medium text-ink-muted">
            💡 로그는 법적 의무 보관 기간: 최소 3년
          </div>
        </div>
      </div>

      {/* 2단 레이아웃 */}
      <div className="flex gap-3">

        {/* 왼쪽: 로그 리스트 */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            {paginated.length === 0 ? (
              <div className="text-center py-20 text-ink-muted">
                <div className="text-4xl mb-3">🔍</div>
                <div className="text-[14px] font-bold">검색 결과가 없어요</div>
              </div>
            ) : (
              <div>
                {paginated.map((log, i) => {
                  const action = ACTION_TYPES[log.action] || ACTION_TYPES.view
                  const isSelected = selectedLog?.id === log.id
                  const userColor = STAFF_COLORS[log.user] || '#6B7280'

                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="px-4 py-2.5 cursor-pointer transition-all hover:bg-gray-50"
                      style={{
                        borderBottom: i < paginated.length - 1 ? '1px solid #F1F5F9' : 'none',
                        background: isSelected ? THEME.accentBg : action.risk === 'high' ? '#FEF2F2' : '#fff',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">

                        {/* 아이콘 */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                          style={{ background: action.bg }}
                        >
                          {action.icon}
                        </div>

                        {/* 시간 */}
                        <div className="flex-shrink-0 w-[90px]">
                          <div className="text-[11px] font-bold text-ink">{log.date.split(' ')[1]}</div>
                          <div className="text-[9px] font-medium text-ink-muted">{log.date.split(' ')[0]}</div>
                        </div>

                        {/* 작업 뱃지 */}
                        <div className="flex-shrink-0 flex items-center gap-1">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{ color: action.color, background: action.bg }}
                          >
                            {action.label}
                          </span>
                          {action.risk === 'high' && (
                            <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
                              ⚠️
                            </span>
                          )}
                        </div>

                        {/* 대상 */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-extrabold text-ink truncate">{log.target}</div>
                        </div>

                        {/* 직원 */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white"
                            style={{ background: userColor }}
                          >
                            {log.user[0]}
                          </div>
                          <span className="text-[11px] font-bold text-ink">{log.user}</span>
                          <span className="text-[10px] font-medium text-ink-muted">({log.role})</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 📄 페이지네이션 */}
          {filtered.length > 0 && (
            <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
              <div className="text-[11px] font-medium text-ink-secondary">
                전체 <span className="font-extrabold" style={{ color: THEME.accent }}>{filtered.length}건</span> 중{' '}
                <span className="font-extrabold text-ink">{startIdx + 1}-{Math.min(endIdx, filtered.length)}</span>건 표시
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {/* 처음 */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg border text-[12px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                    style={{ borderColor: '#E5E7EB', background: '#fff', color: '#6B7280' }}
                  >
                    «
                  </button>
                  {/* 이전 */}
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg border text-[12px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                    style={{ borderColor: '#E5E7EB', background: '#fff', color: '#6B7280' }}
                  >
                    ‹
                  </button>

                  {/* 페이지 번호 */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                    const showAll = totalPages <= 7
                    const showThis = showAll ||
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - currentPage) <= 1

                    if (!showThis) {
                      if (p === 2 || p === totalPages - 1) {
                        return (
                          <span key={p} className="px-1 text-[12px] font-bold text-ink-muted">…</span>
                        )
                      }
                      return null
                    }

                    const isActive = currentPage === p
                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className="min-w-[32px] h-8 px-2 rounded-lg border text-[12px] font-bold transition-all"
                        style={{
                          borderColor: isActive ? THEME.accent : '#E5E7EB',
                          background: isActive ? THEME.accent : '#fff',
                          color: isActive ? '#fff' : '#6B7280',
                        }}
                      >
                        {p}
                      </button>
                    )
                  })}

                  {/* 다음 */}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg border text-[12px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                    style={{ borderColor: '#E5E7EB', background: '#fff', color: '#6B7280' }}
                  >
                    ›
                  </button>
                  {/* 마지막 */}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg border text-[12px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                    style={{ borderColor: '#E5E7EB', background: '#fff', color: '#6B7280' }}
                  >
                    »
                  </button>
                </div>
              )}

              <div className="text-[11px] font-medium text-ink-secondary">
                <span className="font-extrabold text-ink">{currentPage}</span> / {totalPages} 페이지
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 상세 또는 빈 공간 */}
        <div className="w-[380px] flex-shrink-0">
          {selectedLog ? (
            <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.08)] sticky top-4">

              <div className="px-5 py-4 border-b border-line flex items-center justify-between">
                <div className="text-[13px] font-extrabold text-ink">📝 로그 상세</div>
                <button onClick={() => setSelectedLog(null)} className="text-ink-muted hover:text-ink">✕</button>
              </div>

              <div className="px-5 py-4">
                {(() => {
                  const action = ACTION_TYPES[selectedLog.action] || ACTION_TYPES.view
                  return (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                          style={{ background: action.bg }}
                        >
                          {action.icon}
                        </div>
                        <div>
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: action.color, background: action.bg }}
                          >
                            {action.label}
                          </span>
                          {action.risk === 'high' && (
                            <div className="text-[10px] font-bold text-red-700 mt-0.5">⚠️ 고위험 작업</div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">대상</div>
                        <div className="text-[14px] font-extrabold text-ink leading-[1.4]">{selectedLog.target}</div>
                      </div>

                      <div className="mb-4">
                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">📝 상세 내용</div>
                        <div className="bg-white border border-line rounded-lg px-3 py-2.5 text-[12px] font-medium text-ink leading-[1.6]">
                          {selectedLog.detail}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">👤 실행자</div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-extrabold text-white"
                            style={{ background: STAFF_COLORS[selectedLog.user] || '#6B7280' }}
                          >
                            {selectedLog.user[0]}
                          </div>
                          <div>
                            <div className="text-[13px] font-extrabold text-ink">{selectedLog.user}</div>
                            <div className="text-[10px] font-medium text-ink-muted">{selectedLog.role}</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">🕐 시간</div>
                          <div className="text-[12px] font-bold text-ink">{selectedLog.date}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">🌐 IP 주소</div>
                          <div className="text-[12px] font-bold text-ink font-mono">{selectedLog.ip}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">🖥️ 기기</div>
                          <div className="text-[12px] font-bold text-ink">{selectedLog.device}</div>
                        </div>
                      </div>

                      <div
                        className="mt-4 rounded-lg px-3 py-2"
                        style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                      >
                        <div className="text-[10px] font-bold mb-1" style={{ color: THEME.accentDark }}>⚖️ 법적 증빙</div>
                        <div className="text-[10px] font-medium leading-[1.6]" style={{ color: THEME.accentDark }}>
                          이 로그는 변경 불가하며 3년간 보관됩니다. 법적 분쟁시 증거로 활용 가능해요.
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-line border-dashed rounded-2xl px-6 py-16 text-center sticky top-4">
              <div className="text-5xl mb-4">👈</div>
              <div className="text-[14px] font-extrabold text-ink mb-1">로그를 클릭하세요</div>
              <div className="text-[11px] font-medium text-ink-muted leading-[1.6]">
                왼쪽 로그를 클릭하면<br />
                상세 정보가 여기에 표시됩니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}