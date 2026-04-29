import { useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { academyState } from '@/lib/auth/atoms'

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

export default function Settings() {
  const academy = useAtomValue(academyState)
  const setAcademy = useSetAtom(academyState)

  const [academyName, setAcademyName] = useState(academy.academyName || '')
  const [ownerName, setOwnerName] = useState(academy.ownerName || '')
  const [phone, setPhone] = useState('010-1234-5678')
  const [address, setAddress] = useState('서울시 강남구 대치동 123-45')
  const [saved, setSaved] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [showPwConfirm, setShowPwConfirm] = useState(false)

  const [withdrawStep, setWithdrawStep] = useState(0)
  const [withdrawCode, setWithdrawCode] = useState('')
  const [withdrawPhone, setWithdrawPhone] = useState('')
  const [withdrawReason, setWithdrawReason] = useState('')
  const [withdrawReasonDetail, setWithdrawReasonDetail] = useState('')

  const WITHDRAW_REASONS = ['서비스가 기대에 못 미쳐서', '사용하기 불편해서', '다른 서비스로 이동', '학원을 더 이상 운영하지 않음', '기타']

  const handleSave = () => {
    setAcademy({ ...academy, academyName, ownerName })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePwChange = () => {
    if (currentPw !== '1234') { setPwError('현재 비밀번호가 맞지 않아요.'); return }
    if (newPw.length < 8) { setPwError('비밀번호는 8자 이상이어야 해요.'); return }
    if (!/[0-9]/.test(newPw)) { setPwError('숫자를 1개 이상 포함해야 해요.'); return }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPw)) { setPwError('특수문자를 1개 이상 포함해야 해요.'); return }
    if (newPw !== confirmPw) { setPwError('새 비밀번호가 일치하지 않아요.'); return }
    setPwError('')
    setShowPwConfirm(true)
  }

  const resetWithdraw = () => {
    setWithdrawStep(0); setWithdrawCode(''); setWithdrawPhone(''); setWithdrawReason(''); setWithdrawReasonDetail('')
  }

  // 재사용 input focus 스타일
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
  }
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#E5E7EB'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div className="px-8 py-7 min-h-[calc(100vh-50px)] bg-[#F8FAFC] font-sans text-ink">

      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-2.5">
        <span className="text-2xl">⚙️</span>
        <div>
          <div className="text-[22px] font-extrabold text-ink tracking-tight mb-0.5">학원 설정</div>
          <div className="text-[13px] text-ink-secondary font-medium">학원 정보를 관리하세요.</div>
        </div>
      </div>

      {/* 본문 */}
      <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-4">

        {/* 왼쪽: 학원 기본 정보 */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[15px] font-bold text-ink tracking-tight mb-5 pb-3 border-b border-line flex items-center gap-2">
            <span>🏢</span>
            <span>학원 기본 정보</span>
          </div>
          {[
            { label: '학원명', value: academyName, setter: setAcademyName, placeholder: '학원 이름을 입력해주세요' },
            { label: '원장명', value: ownerName, setter: setOwnerName, placeholder: '원장님 성함을 입력해주세요' },
            { label: '연락처', value: phone, setter: setPhone, placeholder: '010-0000-0000' },
            { label: '주소', value: address, setter: setAddress, placeholder: '학원 주소를 입력해주세요' },
          ].map((f, i) => (
            <div key={i} className="mb-4">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">{f.label}</label>
              <input
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                placeholder={f.placeholder}
                className="w-full h-11 border border-line rounded-lg px-3.5 text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
          ))}
          <button
            onClick={handleSave}
            className="w-full h-12 text-white rounded-lg text-[13px] font-bold mt-2 transition-all hover:-translate-y-px"
            style={{
              background: saved ? '#059669' : THEME.accent,
              boxShadow: `0 4px 12px ${saved ? 'rgba(16,185,129,0.3)' : THEME.accentShadow}`,
            }}
          >
            {saved ? '✓ 저장됐어요!' : '💾 저장하기'}
          </button>
        </div>

        {/* 오른쪽 */}
        <div className="flex flex-col gap-4">

          {/* 학원 코드 */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="text-[15px] font-bold text-ink tracking-tight mb-4 pb-3 border-b border-line flex items-center gap-2">
              <span>🔑</span>
              <span>학원 코드</span>
            </div>
            <div
              className="flex items-center justify-between rounded-xl p-4"
              style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}
            >
              <div className="text-[24px] font-extrabold tracking-[0.1em]" style={{ color: THEME.accentDark }}>
                {academy.academyCode}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(academy.academyCode || '')}
                className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                style={{
                  background: THEME.accent,
                  boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                }}
              >
                📋 복사
              </button>
            </div>
            <div className="text-[11px] text-ink-secondary font-medium mt-3 leading-[1.5]">
              학원 코드는 변경할 수 없어요. 학생들에게 이 코드를 공유해주세요.
            </div>
          </div>

          {/* 비밀번호 변경 */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="text-[15px] font-bold text-ink tracking-tight mb-4 pb-3 border-b border-line flex items-center gap-2">
              <span>🔒</span>
              <span>비밀번호 변경</span>
            </div>
            {[
              { label: '현재 비밀번호', value: currentPw, setter: setCurrentPw },
              { label: '새 비밀번호', value: newPw, setter: setNewPw },
              { label: '새 비밀번호 확인', value: confirmPw, setter: setConfirmPw },
            ].map((f, i) => (
              <div key={i} className="mb-3">
                <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">{f.label}</label>
                <input
                  type="password"
                  value={f.value}
                  onChange={e => { f.setter(e.target.value); setPwError('') }}
                  placeholder="••••••••"
                  className="w-full h-11 border rounded-lg px-3.5 text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                  style={{ borderColor: pwError ? '#DC2626' : '#E5E7EB' }}
                  onFocus={e => {
                    if (!pwError) {
                      e.target.style.borderColor = THEME.accent
                      e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
                    }
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = pwError ? '#DC2626' : '#E5E7EB'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            ))}
            <div className="bg-gray-50 rounded-lg px-3.5 py-2.5 mb-2.5">
              <div className="text-[11px] font-medium leading-[1.8]">
                {[
                  { label: '8자 이상', ok: newPw.length >= 8 },
                  { label: '숫자 포함', ok: /[0-9]/.test(newPw) },
                  { label: '특수문자 포함', ok: /[!@#$%^&*(),.?":{}|<>]/.test(newPw) },
                ].map((c, i) => (
                  <span
                    key={i}
                    className="mr-3"
                    style={{ color: c.ok ? '#059669' : '#9CA3AF', fontWeight: c.ok ? 700 : 500 }}
                  >
                    {c.ok ? '✓' : '○'} {c.label}
                  </span>
                ))}
              </div>
            </div>
            {pwError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2.5">
                <span className="text-sm">⚠️</span>
                <span className="text-[12px] text-red-600 font-semibold">{pwError}</span>
              </div>
            )}
            <button
              onClick={handlePwChange}
              className="w-full h-11 bg-ink text-white rounded-lg text-[12px] font-bold mt-2 hover:bg-ink/90 transition-colors"
            >
              🔐 비밀번호 변경
            </button>
          </div>

          {/* 계정 관리 (탈퇴) */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="text-[15px] font-bold text-ink tracking-tight mb-4 pb-3 border-b border-line flex items-center gap-2">
              <span>⚠️</span>
              <span>계정 관리</span>
            </div>
            <div className="text-[12px] text-ink-secondary font-medium mb-4 leading-[1.6]">
              학원 계정을 탈퇴하면 모든 학생 데이터와 기록이 삭제됩니다.<br />
              탈퇴 전 반드시 데이터를 백업해주세요.
            </div>
            <button
              onClick={() => setWithdrawStep(1)}
              className="w-full h-11 bg-white text-red-600 border border-red-500 rounded-lg text-[12px] font-bold hover:bg-red-50 transition-colors"
            >
              학원 계정 탈퇴
            </button>
          </div>
        </div>
      </div>

      {/* ============ 모달들 ============ */}

      {/* 비밀번호 변경 완료 */}
      {showPwConfirm && (
        <Modal onClose={() => setShowPwConfirm(false)}>
          <div className="bg-white rounded-2xl p-8 w-[360px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              ✓
            </div>
            <div className="text-[18px] font-extrabold text-ink mb-2">비밀번호가 변경됐어요!</div>
            <div className="text-[12px] text-ink-secondary font-medium mb-5">다음 로그인부터 새 비밀번호를 사용해주세요.</div>
            <button
              onClick={() => { setShowPwConfirm(false); setCurrentPw(''); setNewPw(''); setConfirmPw('') }}
              className="w-full h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
              style={{
                background: THEME.accent,
                boxShadow: `0 4px 12px ${THEME.accentShadow}`,
              }}
            >
              확인
            </button>
          </div>
        </Modal>
      )}

      {/* 탈퇴 1단계 */}
      {withdrawStep === 1 && (
        <Modal onClose={resetWithdraw}>
          <div className="bg-white rounded-2xl p-8 w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="inline-block text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full mb-3">
              1 / 3단계
            </div>
            <div className="text-[18px] font-extrabold text-ink mb-1.5">학원 코드를 입력해주세요</div>
            <div className="text-[12px] text-ink-secondary font-medium mb-5">학원 코드를 정확히 입력해야 다음 단계로 넘어갑니다.</div>
            <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">학원 코드</label>
            <input
              value={withdrawCode}
              onChange={e => setWithdrawCode(e.target.value)}
              placeholder={`예: ${academy.academyCode}`}
              className="w-full h-11 border border-line rounded-lg px-3.5 text-[13px] font-medium outline-none transition-all mb-5 placeholder:text-ink-muted"
              onFocus={e => {
                e.target.style.borderColor = '#DC2626'
                e.target.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E5E7EB'
                e.target.style.boxShadow = 'none'
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={resetWithdraw}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => withdrawCode === academy.academyCode ? setWithdrawStep(2) : alert('학원 코드가 맞지 않아요.')}
                disabled={!withdrawCode}
                className="flex-1 h-11 rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed"
                style={{
                  background: withdrawCode ? '#DC2626' : '#E5E7EB',
                  color: withdrawCode ? '#fff' : '#9CA3AF',
                  boxShadow: withdrawCode ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none',
                }}
              >
                다음
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 탈퇴 2단계 */}
      {withdrawStep === 2 && (
        <Modal onClose={resetWithdraw}>
          <div className="bg-white rounded-2xl p-8 w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="inline-block text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full mb-3">
              2 / 3단계
            </div>
            <div className="text-[18px] font-extrabold text-ink mb-1.5">원장님 연락처를 입력해주세요</div>
            <div className="text-[12px] text-ink-secondary font-medium mb-5">등록된 연락처를 정확히 입력해야 다음 단계로 넘어갑니다.</div>
            <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">연락처</label>
            <input
              value={withdrawPhone}
              onChange={e => setWithdrawPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full h-11 border border-line rounded-lg px-3.5 text-[13px] font-medium outline-none transition-all mb-5 placeholder:text-ink-muted"
              onFocus={e => {
                e.target.style.borderColor = '#DC2626'
                e.target.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E5E7EB'
                e.target.style.boxShadow = 'none'
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setWithdrawStep(1)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                이전
              </button>
              <button
                onClick={() => withdrawPhone === phone ? setWithdrawStep(3) : alert('연락처가 맞지 않아요.')}
                disabled={!withdrawPhone}
                className="flex-1 h-11 rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed"
                style={{
                  background: withdrawPhone ? '#DC2626' : '#E5E7EB',
                  color: withdrawPhone ? '#fff' : '#9CA3AF',
                  boxShadow: withdrawPhone ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none',
                }}
              >
                다음
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 탈퇴 3단계 */}
      {withdrawStep === 3 && (
        <Modal onClose={resetWithdraw}>
          <div className="bg-white rounded-2xl p-8 w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="inline-block text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full mb-3">
              3 / 3단계
            </div>
            <div className="text-[18px] font-extrabold text-ink mb-1.5">탈퇴 사유를 알려주세요</div>
            <div className="text-[12px] text-ink-secondary font-medium mb-4">서비스 개선에 소중히 활용할게요.</div>
            <div className="flex flex-col gap-2 mb-3">
              {WITHDRAW_REASONS.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setWithdrawReason(r)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left transition-all"
                  style={{
                    borderColor: withdrawReason === r ? '#DC2626' : '#E5E7EB',
                    background: withdrawReason === r ? '#FEE2E2' : '#fff',
                  }}
                >
                  <div
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      border: `2px solid ${withdrawReason === r ? '#DC2626' : '#D1D5DB'}`,
                      background: withdrawReason === r ? '#DC2626' : '#fff',
                    }}
                  >
                    {withdrawReason === r && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span
                    className="text-[13px]"
                    style={{
                      color: withdrawReason === r ? '#DC2626' : '#1a1a1a',
                      fontWeight: withdrawReason === r ? 700 : 500,
                    }}
                  >
                    {r}
                  </span>
                </button>
              ))}
            </div>
            {withdrawReason === '기타' && (
              <textarea
                value={withdrawReasonDetail}
                onChange={e => setWithdrawReasonDetail(e.target.value)}
                placeholder="탈퇴 사유를 직접 입력해주세요..."
                rows={3}
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none resize-none transition-all mb-3 placeholder:text-ink-muted"
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            )}
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setWithdrawStep(2)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                이전
              </button>
              <button
                onClick={() => withdrawReason ? setWithdrawStep(4) : alert('탈퇴 사유를 선택해주세요.')}
                disabled={!withdrawReason}
                className="flex-1 h-11 rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed"
                style={{
                  background: withdrawReason ? '#DC2626' : '#E5E7EB',
                  color: withdrawReason ? '#fff' : '#9CA3AF',
                  boxShadow: withdrawReason ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none',
                }}
              >
                다음
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 탈퇴 최종 확인 */}
      {withdrawStep === 4 && (
        <Modal onClose={resetWithdraw}>
          <div className="bg-white rounded-2xl p-8 w-[400px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-[18px] font-extrabold text-ink mb-4">정말 탈퇴하시겠어요?</div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 mb-5 text-left">
              <div className="text-[12px] text-red-600 font-semibold leading-[1.8]">
                • 모든 학생 데이터가 삭제됩니다.<br />
                • 탐구주제 및 독서리스트 기록이 삭제됩니다.<br />
                • 결제 내역은 1년간 보관 후 삭제됩니다.<br />
                • 탈퇴 후 복구가 불가능합니다.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetWithdraw}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={resetWithdraw}
                className="flex-1 h-11 bg-red-500 text-white rounded-lg text-[13px] font-bold hover:bg-red-600 transition-all hover:-translate-y-px"
                style={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}