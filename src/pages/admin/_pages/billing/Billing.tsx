import { useState } from 'react'

const ACTIVE_MONTHS = [1, 2, 3, 5, 7, 8, 10, 12]

const PAYMENT_HISTORY = [
  { month: '2025-03', count: 28, unitPrice: 46000, total: 1288000, status: '완료', date: '2025-03-01', card: '신한카드 **** 1234', receiptNo: 'RCP-20250301-001' },
  { month: '2025-02', count: 28, unitPrice: 46000, total: 1288000, status: '완료', date: '2025-02-01', card: '신한카드 **** 1234', receiptNo: 'RCP-20250201-001' },
  { month: '2025-01', count: 25, unitPrice: 48000, total: 1200000, status: '완료', date: '2025-01-01', card: '신한카드 **** 1234', receiptNo: 'RCP-20250101-001' },
]

// 파랑 테마
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
    onClick={onClose}
  >
    <div onClick={e => e.stopPropagation()}>{children}</div>
  </div>
)

const getUnitPrice = (count: number) => {
  if (count < 10) return 50000
  if (count < 20) return 48000
  if (count < 30) return 46000
  if (count < 40) return 44000
  if (count < 60) return 42000
  return null
}

export default function Billing() {
  const [savedCount, setSavedCount] = useState(28)
  const [inputCount, setInputCount] = useState(28)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [saved, setSaved] = useState(false)

  const [receipt, setReceipt] = useState<typeof PAYMENT_HISTORY[0] | null>(null)

  const [hasCard, setHasCard] = useState(true)
  const [cardNumber, setCardNumber] = useState('**** **** **** 1234')
  const [cardHolder, setCardHolder] = useState('김원장')
  const [cardExpiry, setCardExpiry] = useState('12/27')

  const [showCardModal, setShowCardModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  const [inputNumber, setInputNumber] = useState('')
  const [inputHolder, setInputHolder] = useState('')
  const [inputExpiry, setInputExpiry] = useState('')
  const [inputCvc, setInputCvc] = useState('')

  const unitPrice = getUnitPrice(savedCount)
  const totalPrice = unitPrice ? savedCount * unitPrice : null

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const nextBillingMonth = ACTIVE_MONTHS.find(m => m > currentMonth) || ACTIVE_MONTHS[0]
  const nextBillingYear = nextBillingMonth <= currentMonth ? now.getFullYear() + 1 : now.getFullYear()
  const nextBillingDate = `${nextBillingYear}-${String(nextBillingMonth).padStart(2, '0')}-01`
  const isActiveMonth = ACTIVE_MONTHS.includes(currentMonth)

  const PLANS = [
    { range: '1~9명', price: '1인당 50,000원', active: savedCount < 10 },
    { range: '10~19명', price: '1인당 48,000원', active: savedCount >= 10 && savedCount < 20 },
    { range: '20~29명', price: '1인당 46,000원', active: savedCount >= 20 && savedCount < 30 },
    { range: '30~39명', price: '1인당 44,000원', active: savedCount >= 30 && savedCount < 40 },
    { range: '40~59명', price: '1인당 42,000원', active: savedCount >= 40 && savedCount < 60 },
    { range: '60명 이상', price: '별도 협의', active: savedCount >= 60 },
  ]

  const openCardModal = (edit: boolean) => {
    setIsEditMode(edit)
    setInputNumber(edit ? cardNumber : '')
    setInputHolder(edit ? cardHolder : '')
    setInputExpiry(edit ? cardExpiry : '')
    setInputCvc('')
    setShowCardModal(true)
  }

  const handleCardSave = () => {
    setShowCardModal(false)
    setShowConfirmModal(true)
  }

  const handleConfirm = () => {
    setCardNumber(inputNumber || cardNumber)
    setCardHolder(inputHolder || cardHolder)
    setCardExpiry(inputExpiry || cardExpiry)
    setHasCard(true)
    setShowConfirmModal(false)
  }

  const handleDelete = () => {
    setHasCard(false)
    setShowDeleteModal(false)
  }

  const handleSaveCount = () => {
    setSavedCount(inputCount)
    setShowSaveConfirm(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const isChanged = inputCount !== savedCount

  return (
    <div className="px-8 py-7 min-h-[calc(100vh-50px)] bg-[#F8FAFC] font-sans text-ink">

      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-2.5">
        <span className="text-2xl">💳</span>
        <div>
          <div className="text-[22px] font-extrabold text-ink tracking-tight mb-0.5">결제 / 플랜 관리</div>
          <div className="text-[13px] text-ink-secondary font-medium">수업이 있는 달 1일에 자동 결제됩니다. (연 8회)</div>
        </div>
      </div>

      {/* 연간 결제 스케줄 */}
      <div className="bg-white border border-line rounded-2xl p-6 mb-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="text-[15px] font-bold text-ink tracking-tight mb-4 flex items-center gap-2">
          <span>📅</span>
          <span>연간 결제 스케줄</span>
        </div>
        <div className="grid grid-cols-12 gap-1.5 max-md:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const isActive = ACTIVE_MONTHS.includes(m)
            const isCurrent = m === currentMonth
            return (
              <div
                key={m}
                className="text-center py-2.5 rounded-lg transition-all"
                style={{
                  background: isCurrent ? THEME.accent : isActive ? THEME.accentBg : '#F8FAFC',
                  border: `1px solid ${isCurrent ? THEME.accent : isActive ? THEME.accentBorder : '#E5E7EB'}`,
                  boxShadow: isCurrent ? `0 4px 12px ${THEME.accentShadow}` : 'none',
                }}
              >
                <div
                  className="text-[12px] font-bold"
                  style={{ color: isCurrent ? '#fff' : isActive ? THEME.accentDark : '#9CA3AF' }}
                >
                  {m}월
                </div>
                <div
                  className="text-[9px] font-semibold mt-1"
                  style={{ color: isCurrent ? 'rgba(255,255,255,0.85)' : isActive ? THEME.accent : '#D1D5DB' }}
                >
                  {isActive ? '결제' : '없음'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2컬럼 레이아웃 */}
      <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-4 mb-4">

        {/* 왼쪽 */}
        <div className="flex flex-col gap-4">

          {/* 학생 수 설정 */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="text-[15px] font-bold text-ink tracking-tight mb-4 pb-3 border-b border-line flex items-center gap-2">
              <span>👥</span>
              <span>학생 수 설정</span>
            </div>
            <div className="mb-4">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 block">등록 학생 수</label>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setInputCount(c => Math.max(1, c - 1))}
                  className="w-10 h-10 border border-line rounded-lg bg-white text-lg font-bold text-ink-secondary hover:border-blue-300 hover:text-blue-700 transition-all"
                >
                  −
                </button>
                <input
                  type="number"
                  value={inputCount}
                  onChange={e => setInputCount(Math.max(1, Number(e.target.value)))}
                  className="w-[90px] h-10 border border-line rounded-lg text-center text-[16px] font-extrabold text-ink outline-none focus:ring-2 transition-all"
                  onFocus={e => {
                    e.target.style.borderColor = THEME.accent
                    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  onClick={() => setInputCount(c => c + 1)}
                  className="w-10 h-10 border border-line rounded-lg bg-white text-lg font-bold text-ink-secondary hover:border-blue-300 hover:text-blue-700 transition-all"
                >
                  +
                </button>
                <span className="text-[13px] font-semibold text-ink-secondary ml-1">명</span>
              </div>
            </div>

            {isChanged && (
              <div
                className="rounded-lg px-4 py-2.5 mb-3 text-[12px] font-semibold flex items-center gap-2"
                style={{
                  background: THEME.accentBg,
                  border: `1px solid ${THEME.accentBorder}60`,
                  color: THEME.accentDark,
                }}
              >
                <span>ℹ️</span>
                <span>저장 전입니다. 저장해야 청구 금액에 반영돼요.</span>
              </div>
            )}

            <button
              onClick={() => setShowSaveConfirm(true)}
              disabled={!isChanged}
              className="w-full h-11 rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed"
              style={{
                background: saved ? '#059669' : isChanged ? THEME.accent : '#E5E7EB',
                color: saved || isChanged ? '#fff' : '#9CA3AF',
                boxShadow: isChanged && !saved ? `0 4px 12px ${THEME.accentShadow}` : 'none',
              }}
            >
              {saved ? '✓ 저장됐어요!' : '학생 수 저장하기'}
            </button>
          </div>

          {/* 이번 달 청구 */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="text-[15px] font-bold text-ink tracking-tight mb-4 pb-3 border-b border-line flex items-center gap-2">
              <span>💰</span>
              <span>이번 달 청구</span>
              {!isActiveMonth && (
                <span className="ml-auto text-[10px] font-bold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
                  수업 없는 달
                </span>
              )}
            </div>

            {!isActiveMonth ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">📅</div>
                <div className="text-[13px] text-ink-secondary font-medium leading-[1.6]">
                  이번 달은 수업이 없어서<br />결제가 발생하지 않아요.
                </div>
                <div className="mt-3 text-[12px] font-bold" style={{ color: THEME.accent }}>
                  다음 결제일: {nextBillingDate}
                </div>
              </div>
            ) : (
              <>
                <div
                  className="rounded-xl p-4 mb-4"
                  style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}
                >
                  <div className="flex justify-between text-[12px] mb-2">
                    <span className="text-ink-secondary font-medium">학생 수</span>
                    <span className="text-ink font-bold">{savedCount}명</span>
                  </div>
                  <div className="flex justify-between text-[12px] mb-2">
                    <span className="text-ink-secondary font-medium">적용 단가</span>
                    <span className="font-bold" style={{ color: THEME.accent }}>
                      {unitPrice ? `1인당 ${unitPrice.toLocaleString()}원` : '60명 이상 · 별도 협의'}
                    </span>
                  </div>
                  <div className="h-px my-3" style={{ background: `${THEME.accentBorder}60` }} />
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] font-bold text-ink">이번 달 청구액</span>
                    <span
                      className="text-[22px] font-extrabold"
                      style={{ color: savedCount >= 60 ? '#6B7280' : THEME.accentDark }}
                    >
                      {totalPrice ? `${totalPrice.toLocaleString()}원` : '협의 후 결정'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-[12px] text-ink-secondary mb-4 font-medium">
                  <span>다음 결제일</span>
                  <span className="text-ink font-semibold">{nextBillingDate}</span>
                </div>

                {savedCount >= 60 ? (
                  <button
                    className="w-full h-12 rounded-lg text-[13px] font-bold text-white transition-all hover:-translate-y-px"
                    style={{
                      background: THEME.accent,
                      boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                    }}
                  >
                    도입 문의하기 (60명 이상)
                  </button>
                ) : (
                  <button
                    disabled={!hasCard}
                    className="w-full h-12 rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                    style={{
                      background: hasCard ? THEME.accent : '#E5E7EB',
                      color: hasCard ? '#fff' : '#9CA3AF',
                      boxShadow: hasCard ? `0 4px 12px ${THEME.accentShadow}` : 'none',
                    }}
                  >
                    {hasCard ? `💳 결제하기 (${totalPrice?.toLocaleString()}원)` : '카드를 먼저 등록해주세요'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 오른쪽 */}
        <div className="flex flex-col gap-4">

          {/* 결제 수단 */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="text-[15px] font-bold text-ink tracking-tight mb-4 pb-3 border-b border-line flex items-center gap-2">
              <span>💳</span>
              <span>결제 수단</span>
            </div>
            {hasCard ? (
              <>
                {/* 카드 디자인 */}
                <div
                  className="rounded-xl p-6 mb-3.5 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #1E3A8A, #2563EB, #1E3A8A)',
                    boxShadow: '0 12px 32px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  <div
                    className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }}
                  />
                  <div className="relative">
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-[10px] text-white/60 font-bold tracking-[0.2em]">CREDIT CARD</div>
                      <div className="text-2xl">💳</div>
                    </div>
                    <div
                      className="text-[18px] text-white font-bold tracking-[0.15em] mb-5"
                      style={{ fontFamily: 'monospace' }}
                    >
                      {cardNumber}
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[9px] text-white/50 font-semibold mb-1">CARD HOLDER</div>
                        <div className="text-[12px] text-white font-bold">{cardHolder}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-white/50 font-semibold mb-1">EXPIRES</div>
                        <div className="text-[12px] text-white font-bold">{cardExpiry}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openCardModal(true)}
                    className="flex-1 h-10 bg-white border rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                    style={{
                      color: THEME.accent,
                      borderColor: THEME.accent,
                    }}
                  >
                    카드 변경
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex-1 h-10 bg-white border border-red-500 text-red-500 rounded-lg text-[12px] font-bold transition-all hover:bg-red-50 hover:-translate-y-px"
                  >
                    카드 삭제
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="text-5xl mb-3">💳</div>
                <div className="text-[13px] text-ink-secondary font-medium mb-4 leading-[1.6]">
                  등록된 카드가 없어요.<br />결제를 위해 카드를 등록해주세요.
                </div>
                <button
                  onClick={() => openCardModal(false)}
                  className="px-6 py-3 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
                  style={{
                    background: THEME.accent,
                    boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                  }}
                >
                  + 카드 등록하기
                </button>
              </div>
            )}
          </div>

          {/* 요금 안내 */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="text-[15px] font-bold text-ink tracking-tight mb-4 pb-3 border-b border-line flex items-center gap-2">
              <span>📋</span>
              <span>요금 안내</span>
            </div>
            <div className="flex flex-col gap-1.5 mb-4">
              {PLANS.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5 rounded-lg transition-all"
                  style={{
                    background: p.active ? THEME.accentBg : '#F8FAFC',
                    border: `1px solid ${p.active ? THEME.accentBorder : '#E5E7EB'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {p.active && (
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: THEME.accent }} />
                    )}
                    <span
                      className="text-[12px]"
                      style={{
                        fontWeight: p.active ? 700 : 500,
                        color: p.active ? THEME.accentDark : '#6B7280',
                      }}
                    >
                      {p.range}
                    </span>
                  </div>
                  <span
                    className="text-[12px]"
                    style={{
                      fontWeight: p.active ? 700 : 500,
                      color: p.active ? THEME.accentDark : '#6B7280',
                    }}
                  >
                    {p.price}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <div className="text-[11px] text-ink-secondary font-medium leading-[1.8]">
                • 수업이 있는 달 1일에 자동 결제됩니다.<br />
                • 수업 없는 달 (4월·6월·9월·11월)은 결제되지 않아요.<br />
                • 60명 이상은 별도 문의가 필요합니다.<br />
                • 문의: <span className="font-semibold" style={{ color: THEME.accent }}>contact@inanswer.co.kr</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 결제 내역 */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="px-6 py-4 border-b border-line flex items-center gap-2">
          <span>📄</span>
          <div className="text-[15px] font-bold text-ink tracking-tight">결제 내역</div>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC]">
              {['결제월', '학생 수', '단가', '결제금액', '결제 수단', '결제일', '상태', ''].map((h, i) => (
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
            {PAYMENT_HISTORY.map((p, i) => (
              <tr
                key={i}
                className="hover:bg-gray-50 transition-colors"
                style={{ borderBottom: i < PAYMENT_HISTORY.length - 1 ? '1px solid #F1F5F9' : 'none' }}
              >
                <td className="px-5 py-3 text-[13px] font-bold text-ink">{p.month}</td>
                <td className="px-5 py-3 text-[13px] font-semibold text-ink">{p.count}명</td>
                <td className="px-5 py-3 text-[13px] font-medium text-ink-secondary">{p.unitPrice.toLocaleString()}원</td>
                <td className="px-5 py-3 text-[13px] font-extrabold" style={{ color: THEME.accent }}>
                  {p.total.toLocaleString()}원
                </td>
                <td className="px-5 py-3 text-[12px] font-medium text-ink-secondary">{p.card}</td>
                <td className="px-5 py-3 text-[13px] font-medium text-ink-secondary">{p.date}</td>
                <td className="px-5 py-3">
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{
                      color: '#059669',
                      background: '#ECFDF5',
                      border: '1px solid #6EE7B7',
                    }}
                  >
                    ✓ {p.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => setReceipt(p)}
                    className="text-[11px] font-bold bg-white border px-3 py-1.5 rounded-full transition-all hover:-translate-y-px"
                    style={{
                      color: THEME.accent,
                      borderColor: THEME.accent,
                    }}
                  >
                    영수증
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* === 모달들 === */}

      {/* 학생 수 저장 확인 */}
      {showSaveConfirm && (
        <Modal onClose={() => setShowSaveConfirm(false)}>
          <div className="bg-white rounded-2xl p-8 w-[380px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-4xl mb-3">👥</div>
            <div className="text-[16px] font-extrabold text-ink mb-2">학생 수를 저장하시겠어요?</div>
            <div
              className="rounded-xl p-4 mb-5 text-left"
              style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}
            >
              <div className="flex justify-between text-[12px] mb-2">
                <span className="text-ink-secondary font-medium">학생 수</span>
                <span className="text-ink font-bold">{inputCount}명</span>
              </div>
              <div className="flex justify-between text-[12px] mb-2">
                <span className="text-ink-secondary font-medium">적용 단가</span>
                <span className="font-bold" style={{ color: THEME.accent }}>
                  {getUnitPrice(inputCount) ? `1인당 ${getUnitPrice(inputCount)?.toLocaleString()}원` : '별도 협의'}
                </span>
              </div>
              <div className="h-px my-2.5" style={{ background: `${THEME.accentBorder}60` }} />
              <div className="flex justify-between text-[14px] font-bold">
                <span className="text-ink">월 청구액</span>
                <span style={{ color: THEME.accentDark }}>
                  {getUnitPrice(inputCount) ? `${(inputCount * (getUnitPrice(inputCount) ?? 0)).toLocaleString()}원` : '협의 후 결정'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveConfirm(false)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveCount}
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
                style={{
                  background: THEME.accent,
                  boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                }}
              >
                저장
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 카드 등록/변경 */}
      {showCardModal && (
        <Modal onClose={() => setShowCardModal(false)}>
          <div className="bg-white rounded-2xl p-8 w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-[18px] font-extrabold text-ink mb-1">{isEditMode ? '카드 변경' : '카드 등록'}</div>
            <div className="text-[13px] text-ink-secondary font-medium mb-5">카드 정보를 입력해주세요.</div>
            {[
              { label: '카드 번호', value: inputNumber, setter: setInputNumber, placeholder: '1234 5678 9012 3456', type: 'text' },
              { label: '카드 소유자', value: inputHolder, setter: setInputHolder, placeholder: '이름을 입력해주세요', type: 'text' },
              { label: '유효기간', value: inputExpiry, setter: setInputExpiry, placeholder: 'MM/YY', type: 'text' },
              { label: 'CVC', value: inputCvc, setter: setInputCvc, placeholder: '카드 뒷면 3자리', type: 'password' },
            ].map((f, i) => (
              <div key={i} className="mb-3">
                <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => f.setter(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full h-11 border border-line rounded-lg px-3 text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                  onFocus={e => {
                    e.target.style.borderColor = THEME.accent
                    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            ))}
            <div
              className="rounded-lg px-4 py-3 mb-4 flex items-start gap-2"
              style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}
            >
              <span className="text-base">🔒</span>
              <div className="text-[11.5px] font-medium leading-[1.5]" style={{ color: THEME.accentDark }}>
                카드 정보는 포트원을 통해 안전하게 처리됩니다.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCardModal(false)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCardSave}
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
                style={{
                  background: THEME.accent,
                  boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                }}
              >
                저장하기
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 카드 저장 확인 */}
      {showConfirmModal && (
        <Modal onClose={() => setShowConfirmModal(false)}>
          <div className="bg-white rounded-2xl p-8 w-[380px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-4xl mb-3">💳</div>
            <div className="text-[16px] font-extrabold text-ink mb-4">
              {isEditMode ? '카드를 변경하시겠어요?' : '카드를 등록하시겠어요?'}
            </div>
            <div
              className="rounded-xl p-4 mb-5 text-left"
              style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}
            >
              {[
                { label: '카드 번호', value: inputNumber },
                { label: '소유자', value: inputHolder },
                { label: '유효기간', value: inputExpiry },
              ].map((r, i) => (
                <div key={i} className={`flex justify-between text-[12px] ${i < 2 ? 'mb-2' : ''}`}>
                  <span className="text-ink-secondary font-medium">{r.label}</span>
                  <span className="text-ink font-bold">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowConfirmModal(false); setShowCardModal(true) }}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                돌아가기
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
                style={{
                  background: THEME.accent,
                  boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                }}
              >
                확인
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 카드 삭제 확인 */}
      {showDeleteModal && (
        <Modal onClose={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl p-8 w-[380px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-4xl mb-3">🗑️</div>
            <div className="text-[16px] font-extrabold text-ink mb-2">카드를 삭제하시겠어요?</div>
            <div className="text-[12px] text-ink-secondary font-medium mb-3">{cardNumber}</div>
            <div className="text-[12px] text-red-600 font-semibold mb-5 bg-red-50 border border-red-200 px-4 py-3 rounded-lg flex items-center gap-2 justify-center">
              <span>⚠️</span>
              <span>카드 삭제 후 자동 결제가 중단됩니다.</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-11 bg-red-500 text-white rounded-lg text-[13px] font-bold hover:bg-red-600 transition-all hover:-translate-y-px"
                style={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
              >
                삭제
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 영수증 */}
      {receipt && (
        <Modal onClose={() => setReceipt(null)}>
          <div className="bg-white rounded-2xl p-8 w-[400px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                ✓
              </div>
              <div className="text-[18px] font-extrabold text-ink mb-1">결제 영수증</div>
              <div className="text-[11px] text-ink-muted font-medium">영수증 번호: {receipt.receiptNo}</div>
            </div>
            <div
              className="rounded-xl p-5 mb-5"
              style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}
            >
              {[
                { label: '결제월', value: receipt.month },
                { label: '학생 수', value: `${receipt.count}명` },
                { label: '적용 단가', value: `${receipt.unitPrice.toLocaleString()}원` },
                { label: '결제 수단', value: receipt.card },
                { label: '결제일', value: receipt.date },
              ].map((r, i) => (
                <div key={i} className={`flex justify-between text-[12px] ${i < 4 ? 'mb-2.5' : ''}`}>
                  <span className="text-ink-secondary font-medium">{r.label}</span>
                  <span className="text-ink font-bold">{r.value}</span>
                </div>
              ))}
              <div className="h-px my-3" style={{ background: `${THEME.accentBorder}60` }} />
              <div className="flex justify-between items-center">
                <span className="text-[15px] font-bold text-ink">총 결제금액</span>
                <span className="text-[20px] font-extrabold" style={{ color: THEME.accentDark }}>
                  {receipt.total.toLocaleString()}원
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 h-11 bg-white border rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
                style={{
                  color: THEME.accent,
                  borderColor: THEME.accent,
                }}
              >
                📄 PDF 다운로드
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="flex-1 h-11 bg-ink text-white rounded-lg text-[13px] font-bold hover:bg-ink/90 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}