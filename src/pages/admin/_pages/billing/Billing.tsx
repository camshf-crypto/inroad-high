import { useState } from 'react'

const ACTIVE_MONTHS = [1, 2, 3, 5, 7, 8, 10, 12]

const PAYMENT_HISTORY = [
  { month: '2025-03', count: 28, unitPrice: 46000, total: 1288000, status: '완료', date: '2025-03-01', card: '신한카드 **** 1234', receiptNo: 'RCP-20250301-001' },
  { month: '2025-02', count: 28, unitPrice: 46000, total: 1288000, status: '완료', date: '2025-02-01', card: '신한카드 **** 1234', receiptNo: 'RCP-20250201-001' },
  { month: '2025-01', count: 25, unitPrice: 48000, total: 1200000, status: '완료', date: '2025-01-01', card: '신한카드 **** 1234', receiptNo: 'RCP-20250101-001' },
]

const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
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
  // 저장된 학생 수 (실제 청구 기준)
  const [savedCount, setSavedCount] = useState(28)
  // 입력 중인 학생 수
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

  const SEC = { background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, padding: 24 } as React.CSSProperties
  const isChanged = inputCount !== savedCount

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', marginBottom: 3 }}>결제 / 플랜 관리</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>수업이 있는 달 1일에 자동 결제됩니다. (연 8회)</div>
      </div>

      {/* 연간 결제 스케줄 */}
      <div style={{ ...SEC, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 14 }}>연간 결제 스케줄</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const isActive = ACTIVE_MONTHS.includes(m)
            const isCurrent = m === currentMonth
            return (
              <div key={m} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: isCurrent ? '#3B5BDB' : isActive ? '#EEF2FF' : '#F8F7F5', border: `0.5px solid ${isCurrent ? '#3B5BDB' : isActive ? '#BAC8FF' : '#E5E7EB'}` }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: isCurrent ? '#fff' : isActive ? '#1E3A8A' : '#9CA3AF' }}>{m}월</div>
                <div style={{ fontSize: 9, marginTop: 3, color: isCurrent ? 'rgba(255,255,255,0.8)' : isActive ? '#3B5BDB' : '#D1D5DB' }}>
                  {isActive ? '결제' : '없음'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* 왼쪽 - 학생 수 설정 + 이번 달 청구 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 학생 수 설정 */}
          <div style={SEC}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 16, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>학생 수 설정</div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 6, display: 'block' }}>등록 학생 수</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setInputCount(c => Math.max(1, c - 1))} style={{ width: 36, height: 36, border: '0.5px solid #E5E7EB', borderRadius: 7, background: '#fff', fontSize: 18, cursor: 'pointer', color: '#6B7280' }}>−</button>
                <input
                  type="number"
                  value={inputCount}
                  onChange={e => setInputCount(Math.max(1, Number(e.target.value)))}
                  style={{ width: 80, height: 36, border: '0.5px solid #E5E7EB', borderRadius: 7, textAlign: 'center', fontSize: 16, fontWeight: 500, outline: 'none', color: '#1a1a1a' }}
                />
                <button onClick={() => setInputCount(c => c + 1)} style={{ width: 36, height: 36, border: '0.5px solid #E5E7EB', borderRadius: 7, background: '#fff', fontSize: 18, cursor: 'pointer', color: '#6B7280' }}>+</button>
                <span style={{ fontSize: 13, color: '#6B7280' }}>명</span>
              </div>
            </div>

            {isChanged && (
              <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#1E3A8A' }}>
                저장 전입니다. 저장해야 청구 금액에 반영돼요.
              </div>
            )}

            <button
              onClick={() => setShowSaveConfirm(true)}
              style={{ width: '100%', height: 40, background: saved ? '#059669' : isChanged ? '#3B5BDB' : '#E5E7EB', color: saved || isChanged ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: isChanged ? 'pointer' : 'not-allowed' }}
            >
              {saved ? '✓ 저장됐어요!' : '학생 수 저장하기'}
            </button>
          </div>

          {/* 이번 달 청구 */}
          <div style={SEC}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 16, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>
              이번 달 청구
              {!isActiveMonth && <span style={{ marginLeft: 8, fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>수업 없는 달</span>}
            </div>

            {!isActiveMonth ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📅</div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                  이번 달은 수업이 없어서<br />결제가 발생하지 않아요.
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: '#3B5BDB' }}>다음 결제일: {nextBillingDate}</div>
              </div>
            ) : (
              <>
                <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                    <span style={{ color: '#6B7280' }}>학생 수</span>
                    <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{savedCount}명</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                    <span style={{ color: '#6B7280' }}>적용 단가</span>
                    <span style={{ color: '#3B5BDB', fontWeight: 500 }}>
                      {unitPrice ? `1인당 ${unitPrice.toLocaleString()}원` : '60명 이상 · 별도 협의'}
                    </span>
                  </div>
                  <div style={{ height: '0.5px', background: '#E5E7EB', margin: '10px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>이번 달 청구액</span>
                    <span style={{ fontSize: 20, fontWeight: 600, color: savedCount >= 60 ? '#6B7280' : '#3B5BDB' }}>
                      {totalPrice ? `${totalPrice.toLocaleString()}원` : '협의 후 결정'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
                  <span>다음 결제일</span>
                  <span style={{ color: '#1a1a1a' }}>{nextBillingDate}</span>
                </div>

                {savedCount >= 60 ? (
                  <button style={{ width: '100%', height: 44, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>도입 문의하기 (60명 이상)</button>
                ) : (
                  <button style={{ width: '100%', height: 44, background: hasCard ? '#3B5BDB' : '#E5E7EB', color: hasCard ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: hasCard ? 'pointer' : 'not-allowed' }}>
                    {hasCard ? `💳 결제하기 (${totalPrice?.toLocaleString()}원)` : '카드를 먼저 등록해주세요'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 오른쪽 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 결제 수단 */}
          <div style={SEC}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 16, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>결제 수단</div>
            {hasCard ? (
              <>
                <div style={{ background: 'linear-gradient(135deg, #1a1a1a, #3d3d3d)', borderRadius: 10, padding: '20px 22px', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>CREDIT CARD</div>
                  <div style={{ fontSize: 16, color: '#fff', letterSpacing: '0.15em', marginBottom: 16, fontFamily: 'monospace' }}>{cardNumber}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>CARD HOLDER</div>
                      <div style={{ fontSize: 12, color: '#fff' }}>{cardHolder}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>EXPIRES</div>
                      <div style={{ fontSize: 12, color: '#fff' }}>{cardExpiry}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openCardModal(true)} style={{ flex: 1, height: 36, background: '#fff', color: '#3B5BDB', border: '0.5px solid #3B5BDB', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>카드 변경</button>
                  <button onClick={() => setShowDeleteModal(true)} style={{ flex: 1, height: 36, background: '#fff', color: '#DC2626', border: '0.5px solid #DC2626', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>카드 삭제</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>등록된 카드가 없어요.<br />결제를 위해 카드를 등록해주세요.</div>
                <button onClick={() => openCardModal(false)} style={{ padding: '10px 24px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>+ 카드 등록하기</button>
              </div>
            )}
          </div>

          {/* 요금 안내 */}
          <div style={SEC}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 16, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>요금 안내</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {PLANS.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderRadius: 8, background: p.active ? '#EEF2FF' : '#F8F7F5', border: `0.5px solid ${p.active ? '#BAC8FF' : '#E5E7EB'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {p.active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B5BDB', flexShrink: 0 }} />}
                    <span style={{ fontSize: 12, fontWeight: p.active ? 500 : 400, color: p.active ? '#1E3A8A' : '#6B7280' }}>{p.range}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: p.active ? 500 : 400, color: p.active ? '#1E3A8A' : '#6B7280' }}>{p.price}</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.8 }}>
                • 수업이 있는 달 1일에 자동 결제됩니다.<br />
                • 수업 없는 달 (4월·6월·9월·11월)은 결제되지 않아요.<br />
                • 60명 이상은 별도 문의가 필요합니다.<br />
                • 문의: contact@inanswer.co.kr
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 결제 내역 */}
      <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #E5E7EB' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>결제 내역</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8F7F5' }}>
              {['결제월', '학생 수', '단가', '결제금액', '결제 수단', '결제일', '상태', ''].map((h, i) => (
                <th key={i} style={{ padding: '10px 20px', fontSize: 11, color: '#6B7280', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid #E5E7EB' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PAYMENT_HISTORY.map((p, i) => (
              <tr key={i} style={{ borderBottom: i < PAYMENT_HISTORY.length - 1 ? '0.5px solid #E5E7EB' : 'none' }}>
                <td style={{ padding: '12px 20px', fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>{p.month}</td>
                <td style={{ padding: '12px 20px', fontSize: 13, color: '#1a1a1a' }}>{p.count}명</td>
                <td style={{ padding: '12px 20px', fontSize: 13, color: '#6B7280' }}>{p.unitPrice.toLocaleString()}원</td>
                <td style={{ padding: '12px 20px', fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>{p.total.toLocaleString()}원</td>
                <td style={{ padding: '12px 20px', fontSize: 12, color: '#6B7280' }}>{p.card}</td>
                <td style={{ padding: '12px 20px', fontSize: 13, color: '#6B7280' }}>{p.date}</td>
                <td style={{ padding: '12px 20px' }}>
                  <span style={{ fontSize: 11, color: '#059669', background: '#ECFDF5', border: '0.5px solid #6EE7B7', padding: '2px 8px', borderRadius: 99 }}>{p.status}</span>
                </td>
                <td style={{ padding: '12px 20px' }}>
                  <button onClick={() => setReceipt(p)} style={{ fontSize: 11, color: '#3B5BDB', border: '0.5px solid #3B5BDB', background: '#fff', padding: '4px 10px', borderRadius: 99, cursor: 'pointer' }}>영수증</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 학생 수 저장 확인 모달 */}
      {showSaveConfirm && (
        <Modal onClose={() => setShowSaveConfirm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>학생 수를 저장하시겠어요?</div>
            <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '14px 16px', marginBottom: 20, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: '#6B7280' }}>학생 수</span>
                <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{inputCount}명</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: '#6B7280' }}>적용 단가</span>
                <span style={{ color: '#3B5BDB', fontWeight: 500 }}>
                  {getUnitPrice(inputCount) ? `1인당 ${getUnitPrice(inputCount)?.toLocaleString()}원` : '별도 협의'}
                </span>
              </div>
              <div style={{ height: '0.5px', background: '#E5E7EB', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 500 }}>
                <span style={{ color: '#1a1a1a' }}>월 청구액</span>
                <span style={{ color: '#3B5BDB' }}>
                  {getUnitPrice(inputCount) ? `${(inputCount * (getUnitPrice(inputCount) ?? 0)).toLocaleString()}원` : '협의 후 결정'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowSaveConfirm(false)} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSaveCount} style={{ flex: 1, height: 40, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>저장</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 카드 등록/변경 모달 */}
      {showCardModal && (
        <Modal onClose={() => setShowCardModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>{isEditMode ? '카드 변경' : '카드 등록'}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>카드 정보를 입력해주세요.</div>
            {[
              { label: '카드 번호', value: inputNumber, setter: setInputNumber, placeholder: '1234 5678 9012 3456', type: 'text' },
              { label: '카드 소유자', value: inputHolder, setter: setInputHolder, placeholder: '이름을 입력해주세요', type: 'text' },
              { label: '유효기간', value: inputExpiry, setter: setInputExpiry, placeholder: 'MM/YY', type: 'text' },
              { label: 'CVC', value: inputCvc, setter: setInputCvc, placeholder: '카드 뒷면 3자리', type: 'password' },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 5, display: 'block' }}>{f.label}</label>
                <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} style={{ width: '100%', height: 40, border: '0.5px solid #E5E7EB', borderRadius: 7, padding: '0 12px', fontSize: 13, outline: 'none' }} onFocus={e => e.target.style.borderColor = '#3B5BDB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
              </div>
            ))}
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 16, lineHeight: 1.5 }}>🔒 카드 정보는 포트원을 통해 안전하게 처리됩니다.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCardModal(false)} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={handleCardSave} style={{ flex: 1, height: 40, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>저장하기</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 저장 확인 모달 */}
      {showConfirmModal && (
        <Modal onClose={() => setShowConfirmModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>💳</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>{isEditMode ? '카드를 변경하시겠어요?' : '카드를 등록하시겠어요?'}</div>
            <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, textAlign: 'left' }}>
              {[
                { label: '카드 번호', value: inputNumber },
                { label: '소유자', value: inputHolder },
                { label: '유효기간', value: inputExpiry },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: i < 2 ? 6 : 0 }}>
                  <span style={{ color: '#6B7280' }}>{r.label}</span>
                  <span style={{ color: '#1a1a1a' }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowConfirmModal(false); setShowCardModal(true) }} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>돌아가기</button>
              <button onClick={handleConfirm} style={{ flex: 1, height: 40, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>확인</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 카드 삭제 확인 모달 */}
      {showDeleteModal && (
        <Modal onClose={() => setShowDeleteModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>카드를 삭제하시겠어요?</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>{cardNumber}</div>
            <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 20, background: '#FEE2E2', padding: '10px 14px', borderRadius: 8 }}>카드 삭제 후 자동 결제가 중단됩니다.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={handleDelete} style={{ flex: 1, height: 40, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>삭제</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 영수증 모달 */}
      {receipt && (
        <Modal onClose={() => setReceipt(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 380 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20 }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>결제 영수증</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>영수증 번호: {receipt.receiptNo}</div>
            </div>
            <div style={{ background: '#F8F7F5', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
              {[
                { label: '결제월', value: receipt.month },
                { label: '학생 수', value: `${receipt.count}명` },
                { label: '적용 단가', value: `${receipt.unitPrice.toLocaleString()}원` },
                { label: '결제 수단', value: receipt.card },
                { label: '결제일', value: receipt.date },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: i < 4 ? 10 : 0 }}>
                  <span style={{ color: '#6B7280' }}>{r.label}</span>
                  <span style={{ color: '#1a1a1a' }}>{r.value}</span>
                </div>
              ))}
              <div style={{ height: '0.5px', background: '#E5E7EB', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 500 }}>
                <span style={{ color: '#1a1a1a' }}>총 결제금액</span>
                <span style={{ color: '#3B5BDB' }}>{receipt.total.toLocaleString()}원</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, height: 40, background: '#fff', color: '#3B5BDB', border: '0.5px solid #3B5BDB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>PDF 다운로드</button>
              <button onClick={() => setReceipt(null)} style={{ flex: 1, height: 40, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>닫기</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}