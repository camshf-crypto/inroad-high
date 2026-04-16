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
      })
      setLoading(false)
      navigate('/admin')
    }, 800)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F8F7F5' }}>

      {/* 왼쪽 로그인 폼 — 1/3 */}
      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 36px', background: '#fff', borderRight: '0.5px solid #E5E7EB' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3B5BDB', marginBottom: 6 }}>인로드</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>학원 관리자 어드민</div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>로그인</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>학원 계정으로 로그인하세요.</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 6, display: 'block' }}>이메일</label>
          <input
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="academy@example.com"
            style={{ width: '100%', height: 44, border: `0.5px solid ${error ? '#DC2626' : '#E5E7EB'}`, borderRadius: 8, padding: '0 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#3B5BDB'}
            onBlur={e => e.target.style.borderColor = error ? '#DC2626' : '#E5E7EB'}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 6, display: 'block' }}>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{ width: '100%', height: 44, border: `0.5px solid ${error ? '#DC2626' : '#E5E7EB'}`, borderRadius: 8, padding: '0 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#3B5BDB'}
            onBlur={e => e.target.style.borderColor = error ? '#DC2626' : '#E5E7EB'}
          />
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FEE2E2', borderRadius: 7, padding: '8px 12px', marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>⚠️</span>
            <span style={{ fontSize: 12, color: '#DC2626' }}>{error}</span>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', height: 46, background: loading ? '#BAC8FF' : '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 12, boxSizing: 'border-box' }}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>

        <div style={{ marginTop: 20, background: '#F8F7F5', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 6 }}>테스트 계정</div>
          <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.8 }}>
            원장: owner@inanswer.com / 1234<br />
            선생님: kim.teacher@example.com / 1234
          </div>
        </div>
      </div>

      {/* 오른쪽 — 2/3 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, background: '#F8F7F5' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>학원 관리를 더 스마트하게</div>
        <div style={{ fontSize: 15, color: '#6B7280', marginBottom: 48, textAlign: 'center', lineHeight: 1.6 }}>
          학생 로드맵 관리부터 탐구주제 피드백까지<br />인로드 어드민으로 한 번에 관리하세요.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 520 }}>
          {[
            { icon: '📊', title: '로드맵 관리', desc: '학생별 월별 진행률 한눈에' },
            { icon: '✨', title: 'AI 챗봇', desc: '탐구주제 고도화 & 독서 추천' },
            { icon: '📚', title: '탐구/독서 피드백', desc: '학생과 실시간 주고받기' },
            { icon: '👥', title: '선생님 관리', desc: '담당 학생 배정 & 권한 관리' },
          ].map((f, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '0.5px solid #E5E7EB' }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 5 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}