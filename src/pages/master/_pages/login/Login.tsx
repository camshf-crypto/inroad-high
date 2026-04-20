import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetAtom } from 'jotai'
import { masterTokenState } from '../../_store/auth'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

export default function MasterLogin() {
  const navigate = useNavigate()
  const setToken = useSetAtom(masterTokenState)
  const [email, setEmail] = useState('master@inroad.com')
  const [password, setPassword] = useState('')

  const handleLogin = () => {
    // 임시 로그인 (MVP)
    setToken({
      accessToken: 'master-demo-token',
      expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    navigate('/master')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 font-sans relative overflow-hidden"
      style={{ background: THEME.gradient }}
    >
      {/* 배경 장식 */}
      <div
        className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)' }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)' }}
      />

      <div className="bg-white rounded-3xl px-10 py-12 w-[440px] shadow-[0_30px_80px_rgba(0,0,0,0.25)] relative">

        {/* 로고 */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_8px_24px_rgba(124,58,237,0.3)]"
            style={{ background: THEME.gradient }}
          >
            <span className="text-3xl">🏢</span>
          </div>
          <div className="text-[24px] font-extrabold tracking-tight mb-1" style={{ color: THEME.accentDark }}>
            INROAD MASTER
          </div>
          <div className="text-[13px] font-medium text-ink-secondary">
            본사 관리 시스템
          </div>
        </div>

        {/* 경고 배너 */}
        <div
          className="rounded-xl px-4 py-3 mb-5 flex items-start gap-2"
          style={{
            background: THEME.accentBg,
            border: `1px solid ${THEME.accentBorder}60`,
          }}
        >
          <span className="text-base">🔐</span>
          <div className="text-[11px] font-medium leading-[1.6]" style={{ color: THEME.accentDark }}>
            <div className="font-bold mb-0.5">보안 등급: 최고</div>
            인가된 본사 직원만 접근할 수 있습니다.
          </div>
        </div>

        {/* 입력 */}
        <div className="flex flex-col gap-3 mb-5">
          <div>
            <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5 block">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="master@inroad.com"
              className="w-full h-12 px-4 border border-line rounded-lg text-[14px] font-medium outline-none transition-all placeholder:text-ink-muted"
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

          <div>
            <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5 block">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="비밀번호 입력"
              className="w-full h-12 px-4 border border-line rounded-lg text-[14px] font-medium outline-none transition-all placeholder:text-ink-muted"
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
        </div>

        <button
          onClick={handleLogin}
          className="w-full h-12 text-white rounded-lg text-[14px] font-extrabold transition-all hover:-translate-y-px"
          style={{
            background: THEME.gradient,
            boxShadow: `0 8px 24px ${THEME.accentShadow}`,
          }}
        >
          🔑 로그인
        </button>

        <div className="text-center mt-6 text-[11px] font-medium text-ink-muted">
          © 2025 INROAD. All rights reserved.
        </div>
      </div>
    </div>
  )
}