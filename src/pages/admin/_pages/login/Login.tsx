import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetAtom } from 'jotai'
import { tokenState, academyState } from '../../_store/auth'

const MOCK_ACCOUNTS = [
  { email: 'owner@inanswer.com', password: '1234', role: 'OWNER' as const, name: '대치 인로드학원', code: 'ACA001', ownerName: '김원장', teacherId: undefined },
  { email: 'kim.teacher@example.com', password: '1234', role: 'TEACHER' as const, name: '대치 인로드학원', code: 'ACA001', ownerName: '김선생', teacherId: 1 },
  { email: 'lee.teacher@example.com', password: '1234', role: 'TEACHER' as const, name: '대치 인로드학원', code: 'ACA001', ownerName: '이선생', teacherId: 2 },
]

export default function Login() {
  const navigate = useNavigate()
  const setToken = useSetAtom(tokenState)
  const setAcademy = useSetAtom(academyState)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return }
    setLoading(true)
    setError('')
    setTimeout(() => {
      const account = MOCK_ACCOUNTS.find(a => a.email === email && a.password === password)
      if (!account) {
        setError('이메일 또는 비밀번호가 맞지 않아요.')
        setLoading(false)
        return
      }
      setToken({ accessToken: 'mock-token', expiresIn: '3600' })
      setAcademy({
        academyCode: account.code,
        academyName: account.name,
        ownerName: account.ownerName,
        role: account.role,
        teacherId: account.teacherId,
        plans: ['high', 'middle'],
      })
      setLoading(false)
      navigate('/admin')
    }, 800)
  }

  return (
    <div className="flex h-screen bg-white font-sans text-ink overflow-hidden">

      {/* 왼쪽 로그인 폼 (45%) */}
      <div className="w-[45%] flex-shrink-0 flex flex-col bg-white border-r border-line overflow-y-auto relative">

        {/* 로고 (좌측 상단 고정) */}
        <div className="px-9 pt-8 pb-5 flex-shrink-0 max-w-[440px] w-full mx-auto">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[13px] font-extrabold"
              style={{
                background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              IR
            </div>
            <span className="text-[18px] font-extrabold tracking-tight" style={{ color: '#1E3A8A' }}>
              인로드
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                color: '#1E3A8A',
                background: '#EFF6FF',
                border: '1px solid rgba(147, 197, 253, 0.6)',
              }}
            >
              학원용
            </span>
          </div>
        </div>

        {/* 폼 */}
        <div className="flex-1 flex flex-col justify-center px-9 pb-8 max-w-[440px] w-full mx-auto">

          <div className="mb-8 text-center">
            <div className="text-[26px] font-extrabold text-ink tracking-tight mb-2">로그인</div>
            <div className="text-[13px] text-ink-secondary">학원 관리자 계정으로 로그인하세요</div>
          </div>

          <div className="flex flex-col gap-3">

            <input
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="계정 이메일"
              className={`w-full h-12 px-4 border rounded-lg text-[14px] focus:outline-none focus:ring-2 transition-all placeholder:text-ink-muted ${
                error
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                  : 'border-line focus:border-blue-500 focus:ring-blue-500/10'
              }`}
            />

            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="비밀번호"
                className={`w-full h-12 pl-4 pr-12 border rounded-lg text-[14px] focus:outline-none focus:ring-2 transition-all placeholder:text-ink-muted ${
                  error
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                    : 'border-line focus:border-blue-500 focus:ring-blue-500/10'
                }`}
              />
              <button
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-blue-700 transition-colors"
                type="button"
              >
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-sm">⚠️</span>
                <span className="text-[12px] text-red-600 font-medium">{error}</span>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 rounded-lg text-[14px] font-bold text-white mt-2 transition-all disabled:cursor-not-allowed"
              style={{
                background: loading ? '#93C5FD' : '#2563EB',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.background = '#1D4ED8'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.35)'
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.currentTarget.style.background = '#2563EB'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.25)'
                }
              }}
            >
              {loading ? '로그인 중...' : '이메일로 로그인'}
            </button>

          </div>

          {/* 하단 링크 */}
          <div className="flex items-center justify-center gap-4 mt-6 text-[12px]">
            <button className="text-ink-secondary hover:text-blue-700 font-medium transition-colors">
              아이디 찾기
            </button>
            <span className="text-line">|</span>
            <button className="text-ink-secondary hover:text-blue-700 font-medium transition-colors">
              비밀번호 찾기
            </button>
            <span className="text-line">|</span>
            <button className="font-bold hover:underline" style={{ color: '#1E3A8A' }}>
              학원 등록 문의
            </button>
          </div>

          {/* 테스트 계정 */}
          <div className="mt-6 bg-gray-50 border border-line rounded-xl px-5 py-4">
            <div className="text-center mb-2">
              <span className="text-[12px] font-bold" style={{ color: '#1E3A8A' }}>🔑 테스트 계정</span>
            </div>
            <div className="text-[11.5px] text-ink-secondary text-center font-medium leading-[1.8]">
              <div>
                원장: <span className="font-semibold" style={{ color: '#1E3A8A' }}>owner@inanswer.com</span> / 1234
              </div>
              <div>
                선생님: <span className="font-semibold" style={{ color: '#1E3A8A' }}>kim.teacher@example.com</span> / 1234
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 오른쪽 소개 (55%) - 연파랑 그라데이션 */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center px-12 max-lg:hidden"
        style={{
          background: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 50%, #BFDBFE 100%)',
        }}
      >

        {/* 배경 장식 */}
        <div
          className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.25), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18), transparent 70%)' }}
        />

        <div className="relative w-full max-w-[560px]">

          <div className="mb-4 flex justify-center">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
              style={{
                background: '#EFF6FF',
                border: '1px solid rgba(147, 197, 253, 0.8)',
              }}
            >
              <span className="text-[12px] font-bold" style={{ color: '#1E3A8A' }}>🎓 학원 관리자 전용</span>
            </div>
          </div>

          <div className="text-[36px] font-extrabold tracking-tight leading-[1.2] mb-4 text-ink text-center">
            학원 관리를<br />
            <span style={{ color: '#1E3A8A' }}>더 스마트하게</span>
          </div>

          <div className="text-[15px] text-ink-secondary leading-[1.6] mb-10 text-center">
            학생 로드맵 관리부터 탐구주제 피드백까지<br />
            인로드 어드민으로 한 번에 관리하세요.
          </div>

          {/* 기능 카드 */}
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { icon: '📊', title: '로드맵 관리', desc: '학생별 월별 진행률' },
              { icon: '✨', title: 'AI 챗봇', desc: '탐구 고도화 & 추천' },
              { icon: '📚', title: '실시간 피드백', desc: '탐구/독서/숙제 관리' },
              { icon: '👥', title: '선생님 관리', desc: '담당 배정 & 권한' },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-white border border-line rounded-xl px-5 py-4 hover:-translate-y-0.5 transition-all cursor-default"
                style={{
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(147, 197, 253, 0.8)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.12)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = ''
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="text-[14px] font-bold text-ink mb-0.5 tracking-tight">{f.title}</div>
                <div className="text-[11.5px] text-ink-secondary font-medium">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}