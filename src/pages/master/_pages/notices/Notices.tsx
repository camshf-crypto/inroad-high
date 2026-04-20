import { useState } from 'react'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

const INIT_NOTICES = [
  { id: 1, title: '서비스 업데이트 안내', content: '4월 20일 오전 2시~4시 서비스 점검이 있어요.', category: 'update', target: 'all', urgent: true, sentAt: '2025.04.18 10:30', readCount: 42, totalCount: 47, sent: true },
  { id: 2, title: '봄맞이 이벤트 시작!', content: '신규 가입 학원에 3개월 20% 할인 쿠폰 제공!', category: 'event', target: 'all', urgent: false, sentAt: '2025.04.15 14:20', readCount: 47, totalCount: 47, sent: true },
  { id: 3, title: '신기능 출시: 제시문 면접 AI 분석', content: 'AI가 학생 답변을 분석해 자동으로 피드백을 제안합니다.', category: 'feature', target: 'all', urgent: false, sentAt: '2025.04.10 09:00', readCount: 45, totalCount: 47, sent: true },
  { id: 4, title: '[긴급] 미납 학원 결제 안내', content: '이번 달 결제가 미납된 학원은 24시간 내 결제 부탁드립니다.', category: 'payment', target: 'unpaid', urgent: true, sentAt: '2025.04.08 16:45', readCount: 2, totalCount: 3, sent: true },
]

const CATEGORIES = [
  { key: 'all', label: '📌 전체', color: '#7C3AED' },
  { key: 'update', label: '🔧 업데이트', color: '#2563EB' },
  { key: 'event', label: '🎉 이벤트', color: '#EC4899' },
  { key: 'feature', label: '✨ 신기능', color: '#059669' },
  { key: 'payment', label: '💰 결제', color: '#F59E0B' },
  { key: 'urgent', label: '🚨 긴급', color: '#DC2626' },
]

const TARGETS = [
  { key: 'all', label: '전체 학원', icon: '🏫', count: 47 },
  { key: 'active', label: '활성 학원만', icon: '✓', count: 42 },
  { key: 'trial', label: '체험중 학원', icon: '🎁', count: 3 },
  { key: 'unpaid', label: '미납 학원', icon: '⚠️', count: 2 },
  { key: 'custom', label: '직접 선택', icon: '🎯', count: 0 },
]

export default function MasterNotices() {
  const [notices, setNotices] = useState<any[]>(() => {
    const saved = localStorage.getItem('master_notices')
    return saved ? JSON.parse(saved) : INIT_NOTICES
  })
  const [filter, setFilter] = useState<string>('all')
  const [showCompose, setShowCompose] = useState(false)
  const [selNotice, setSelNotice] = useState<any>(null)

  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'update',
    target: 'all',
    urgent: false,
    sendEmail: true,
    sendPush: true,
  })

  const saveNotices = (list: any[]) => {
    localStorage.setItem('master_notices', JSON.stringify(list))
    setNotices(list)
  }

  const filtered = filter === 'all'
    ? notices
    : filter === 'urgent'
      ? notices.filter(n => n.urgent)
      : notices.filter(n => n.category === filter)

  const stats = {
    total: notices.length,
    urgent: notices.filter(n => n.urgent).length,
    sent: notices.filter(n => n.sent).length,
    avgRead: notices.length > 0
      ? Math.round(notices.reduce((sum, n) => sum + (n.readCount / n.totalCount) * 100, 0) / notices.length)
      : 0,
  }

  const openCompose = () => {
    setForm({
      title: '',
      content: '',
      category: 'update',
      target: 'all',
      urgent: false,
      sendEmail: true,
      sendPush: true,
    })
    setShowCompose(true)
  }

  const handleSend = () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('제목과 내용을 입력해주세요!')
      return
    }

    const target = TARGETS.find(t => t.key === form.target)
    if (!confirm(`${target?.label} (${target?.count}개 학원)에 발송하시겠어요?`)) return

    const newNotice = {
      id: Date.now(),
      title: form.title,
      content: form.content,
      category: form.category,
      target: form.target,
      urgent: form.urgent,
      sentAt: new Date().toLocaleString('ko-KR'),
      readCount: 0,
      totalCount: target?.count || 0,
      sent: true,
    }

    saveNotices([newNotice, ...notices])
    setShowCompose(false)
    alert(`📢 공지사항이 발송됐어요!\n${target?.count}개 학원에 전송됨`)
  }

  const handleDelete = (id: number) => {
    if (!confirm('이 공지사항을 삭제하시겠어요?')) return
    saveNotices(notices.filter(n => n.id !== id))
    if (selNotice?.id === id) setSelNotice(null)
  }

  return (
    <div className="px-8 py-7 min-h-full">

      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📢</span>
            <div className="text-[22px] font-extrabold text-ink tracking-tight">공지사항 관리</div>
          </div>
          <div className="text-[13px] font-medium text-ink-secondary">
            전체 학원에 공지/알림을 발송하세요.
          </div>
        </div>

        <button
          onClick={openCompose}
          className="h-10 px-5 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
          style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
        >
          ✏️ 새 공지 작성
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 max-md:grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl px-5 py-4 shadow-[0_8px_24px_rgba(124,58,237,0.15)]" style={{ background: THEME.gradient }}>
          <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1">총 발송 공지</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-white tracking-tight">{stats.total}</div>
            <div className="text-[13px] font-semibold text-white/80">건</div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">🚨 긴급 공지</div>
          <div className="text-[28px] font-extrabold text-red-600 tracking-tight">{stats.urgent}</div>
        </div>

        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">✓ 발송 완료</div>
          <div className="text-[28px] font-extrabold text-green-600 tracking-tight">{stats.sent}</div>
        </div>

        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">📖 평균 열람률</div>
          <div className="text-[28px] font-extrabold tracking-tight" style={{ color: THEME.accent }}>{stats.avgRead}%</div>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="bg-white border border-line rounded-2xl px-5 py-3 mb-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => {
            const active = filter === c.key
            return (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all"
                style={{
                  borderColor: active ? c.color : '#E5E7EB',
                  background: active ? `${c.color}15` : '#fff',
                  color: active ? c.color : '#6B7280',
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 공지 목록 */}
      <div className="flex gap-3 flex-wrap">

        {/* 왼쪽: 리스트 */}
        <div className="flex-1 min-w-[400px] flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="bg-white border border-line rounded-2xl px-6 py-16 text-center text-ink-muted">
              <div className="text-4xl mb-3">📭</div>
              <div className="text-[14px] font-bold">공지사항이 없어요</div>
            </div>
          ) : filtered.map(n => {
            const cat = CATEGORIES.find(c => c.key === n.category) || CATEGORIES[0]
            const isSelected = selNotice?.id === n.id
            const readRate = Math.round((n.readCount / n.totalCount) * 100)

            return (
              <div
                key={n.id}
                onClick={() => setSelNotice(n)}
                className="bg-white rounded-2xl px-5 py-4 cursor-pointer transition-all shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                style={{
                  border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                  boxShadow: isSelected ? `0 4px 16px ${THEME.accentShadow}` : undefined,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {n.urgent && (
                        <span className="text-[10px] font-extrabold text-white bg-red-500 px-2 py-0.5 rounded-full">
                          🚨 긴급
                        </span>
                      )}
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: cat.color, background: `${cat.color}15` }}
                      >
                        {cat.label}
                      </span>
                      <span className="text-[10px] font-medium text-ink-muted">{n.sentAt}</span>
                    </div>

                    <div className="text-[14px] font-extrabold text-ink tracking-tight mb-1">{n.title}</div>
                    <div className="text-[12px] font-medium text-ink-secondary line-clamp-2 leading-[1.6]">
                      {n.content}
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-ink-muted">📖 열람</span>
                        <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${readRate}%`, background: THEME.accent }}
                          />
                        </div>
                        <span className="text-[11px] font-bold" style={{ color: THEME.accent }}>
                          {n.readCount}/{n.totalCount} ({readRate}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(n.id) }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 오른쪽: 상세 */}
        {selNotice && (
          <div className="w-[400px] flex-shrink-0">
            <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.08)] sticky top-4">
              <div className="px-5 py-4 border-b border-line flex items-center justify-between">
                <div className="text-[13px] font-extrabold text-ink">📄 공지 상세</div>
                <button onClick={() => setSelNotice(null)} className="text-ink-muted hover:text-ink">✕</button>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  {selNotice.urgent && (
                    <span className="text-[10px] font-extrabold text-white bg-red-500 px-2 py-0.5 rounded-full">
                      🚨 긴급
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
                    {selNotice.sentAt}
                  </span>
                </div>

                <div className="text-[16px] font-extrabold text-ink tracking-tight mb-3">
                  {selNotice.title}
                </div>

                <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
                  <div className="text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                    {selNotice.content}
                  </div>
                </div>

                <div
                  className="rounded-xl px-4 py-3"
                  style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                >
                  <div className="text-[11px] font-bold mb-2" style={{ color: THEME.accentDark }}>
                    📊 발송 현황
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] font-bold text-ink-muted mb-0.5">발송 대상</div>
                      <div className="text-[14px] font-extrabold text-ink">{selNotice.totalCount}개 학원</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-ink-muted mb-0.5">열람 완료</div>
                      <div className="text-[14px] font-extrabold" style={{ color: THEME.accent }}>
                        {selNotice.readCount}개 ({Math.round((selNotice.readCount / selNotice.totalCount) * 100)}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 작성 모달 */}
      {showCompose && (
        <div onClick={() => setShowCompose(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[640px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="px-6 py-5" style={{ background: THEME.gradient }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">✏️ 새 공지사항 작성</div>
                  <div className="text-[12px] text-white/80 mt-0.5">학원 원장님에게 알림이 발송돼요</div>
                </div>
                <button onClick={() => setShowCompose(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="flex flex-col gap-4">

                {/* 카테고리 */}
                <div>
                  <label className="text-[11px] font-bold text-ink-secondary mb-2 block">카테고리</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {CATEGORIES.filter(c => c.key !== 'all' && c.key !== 'urgent').map(c => {
                      const active = form.category === c.key
                      return (
                        <button
                          key={c.key}
                          onClick={() => setForm(prev => ({ ...prev, category: c.key }))}
                          className="px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all"
                          style={{
                            borderColor: active ? c.color : '#E5E7EB',
                            background: active ? `${c.color}15` : '#fff',
                            color: active ? c.color : '#6B7280',
                          }}
                        >
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 제목 */}
                <div>
                  <label className="text-[11px] font-bold text-ink-secondary mb-1 block">제목 *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="예: 서비스 업데이트 안내"
                    className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                    onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                  />
                </div>

                {/* 내용 */}
                <div>
                  <label className="text-[11px] font-bold text-ink-secondary mb-1 block">내용 *</label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="공지 내용을 입력해주세요..."
                    rows={6}
                    className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                    onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                  />
                </div>

                {/* 발송 대상 */}
                <div>
                  <label className="text-[11px] font-bold text-ink-secondary mb-2 block">발송 대상</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TARGETS.map(t => {
                      const active = form.target === t.key
                      return (
                        <button
                          key={t.key}
                          onClick={() => setForm(prev => ({ ...prev, target: t.key }))}
                          className="px-3 py-2.5 rounded-xl border-2 transition-all text-left flex items-center gap-2"
                          style={{
                            borderColor: active ? THEME.accent : '#E5E7EB',
                            background: active ? THEME.accentBg : '#fff',
                          }}
                        >
                          <span className="text-lg">{t.icon}</span>
                          <div className="flex-1">
                            <div className="text-[12px] font-bold" style={{ color: active ? THEME.accentDark : '#1a1a1a' }}>
                              {t.label}
                            </div>
                            <div className="text-[10px] font-medium text-ink-muted">{t.count}개 학원</div>
                          </div>
                          {active && <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ background: THEME.accent }}>✓</div>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 긴급 & 발송 옵션 */}
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.urgent}
                      onChange={e => setForm(prev => ({ ...prev, urgent: e.target.checked }))}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div className="text-[12px] font-bold text-red-700">🚨 긴급 공지로 발송</div>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.sendEmail}
                      onChange={e => setForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div className="text-[12px] font-medium text-ink">✉️ 이메일로도 발송</div>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.sendPush}
                      onChange={e => setForm(prev => ({ ...prev, sendPush: e.target.checked }))}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div className="text-[12px] font-medium text-ink">🔔 푸시 알림 발송</div>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line flex gap-2">
              <button onClick={() => setShowCompose(false)} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50">
                취소
              </button>
              <button onClick={handleSend} className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px" style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
                📤 발송하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}