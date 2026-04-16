import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetAtom } from 'jotai'
import { tokenState, studentState, academyState } from '../../_store/auth'

type Modal = 'findEmail' | 'findPw' | null

export default function Login() {
  const navigate = useNavigate()
  const setToken = useSetAtom(tokenState)
  const setStudent = useSetAtom(studentState)
  const setAcademy = useSetAtom(academyState)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 모달
  const [modal, setModal] = useState<Modal>(null)
  const [findName, setFindName] = useState('')
  const [findPhone, setFindPhone] = useState('')
  const [findEmail, setFindEmail] = useState('')
  const [findResult, setFindResult] = useState('')
  const [findLoading, setFindLoading] = useState(false)

  const handleLogin = () => {
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return }
    setLoading(true)
    setError('')
    setTimeout(() => {
      if (email === 'student@example.com' && password === '1234') {
        setToken({ accessToken: 'student-token-demo', expiresIn: '3600' })
        setStudent({ id: 1, name: '강민서', grade: '고1', email: 'student@example.com', role: 'STUDENT' })
        setAcademy({ academyCode: 'ACA001', academyName: '대치 인데미학원', teacherName: '김선생님', teacherId: 1 })
        navigate('/student/roadmap')
      } else {
        setError('이메일 또는 비밀번호가 올바르지 않아요.')
      }
      setLoading(false)
    }, 800)
  }

  const handleFindEmail = () => {
    if (!findName.trim() || !findPhone.trim()) { setFindResult('error:이름과 전화번호를 입력해주세요.'); return }
    setFindLoading(true)
    setFindResult('')
    // TODO: POST /api/student/find-email { name, phone }
    setTimeout(() => {
      setFindLoading(false)
      setFindResult('ok:st***@example.com')
    }, 800)
  }

  const handleFindPw = () => {
    if (!findEmail.trim()) { setFindResult('error:이메일을 입력해주세요.'); return }
    setFindLoading(true)
    setFindResult('')
    // TODO: POST /api/student/reset-password { email }
    setTimeout(() => {
      setFindLoading(false)
      setFindResult('ok:입력하신 이메일로 임시 비밀번호를 발송했어요.')
    }, 800)
  }

  const closeModal = () => {
    setModal(null)
    setFindName('')
    setFindPhone('')
    setFindEmail('')
    setFindResult('')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, border: '0.5px solid #E5E7EB', borderRadius: 8,
    padding: '0 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F8F7F5' }}>

      {/* 왼쪽 폼 */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 36px', background: '#fff', borderRight: '0.5px solid #E5E7EB' }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3B5BDB', marginBottom: 4 }}>인로드</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>학생 로그인</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 3 }}>로그인</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>학생 계정으로 로그인하세요.</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', display: 'block', marginBottom: 6 }}>이메일</label>
          <input
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="example@email.com"
            style={{ ...inputStyle, borderColor: error ? '#DC2626' : '#E5E7EB' }}
            onFocus={e => e.target.style.borderColor = '#3B5BDB'}
            onBlur={e => e.target.style.borderColor = error ? '#DC2626' : '#E5E7EB'}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', display: 'block', marginBottom: 6 }}>비밀번호</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{ ...inputStyle, paddingRight: 56, borderColor: error ? '#DC2626' : '#E5E7EB' }}
              onFocus={e => e.target.style.borderColor = '#3B5BDB'}
              onBlur={e => e.target.style.borderColor = error ? '#DC2626' : '#E5E7EB'}
            />
            <button onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 12 }}>
              {showPw ? '숨기기' : '보기'}
            </button>
          </div>
        </div>

        {/* 아이디 찾기 / 비밀번호 찾기 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <span onClick={() => { setModal('findEmail'); setFindResult('') }}
            style={{ fontSize: 11, color: '#9CA3AF', cursor: 'pointer' }}>
            아이디 찾기
          </span>
          <span style={{ fontSize: 11, color: '#E5E7EB' }}>|</span>
          <span onClick={() => { setModal('findPw'); setFindResult('') }}
            style={{ fontSize: 11, color: '#9CA3AF', cursor: 'pointer' }}>
            비밀번호 찾기
          </span>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FEE2E2', borderRadius: 7, padding: '8px 12px', marginBottom: 4 }}>
            <span style={{ fontSize: 13 }}>⚠️</span>
            <span style={{ fontSize: 12, color: '#DC2626' }}>{error}</span>
          </div>
        )}

        <button onClick={handleLogin} disabled={loading} style={{
          width: '100%', height: 46, background: loading ? '#BAC8FF' : '#3B5BDB', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer', marginTop: 12,
        }}>
          {loading ? '로그인 중...' : '로그인'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>아직 계정이 없으신가요? </span>
          <span onClick={() => navigate('/student/signup')} style={{ fontSize: 12, color: '#3B5BDB', fontWeight: 600, cursor: 'pointer' }}>회원가입</span>
        </div>

        <div style={{ marginTop: 20, background: '#F8F7F5', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 4 }}>테스트 계정</div>
          <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.8 }}>student@example.com / 1234</div>
        </div>
      </div>

      {/* 오른쪽 소개 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, background: '#F8F7F5' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>진로 진학, 지금 시작하세요</div>
        <div style={{ fontSize: 15, color: '#6B7280', marginBottom: 48, textAlign: 'center', lineHeight: 1.6 }}>
          탐구주제 설계부터 실전 면접 시뮬레이션까지<br />인로드와 함께 단계별로 준비하세요.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 520 }}>
          {[
            { icon: '🗺️', title: '연간 로드맵', desc: '학년별 월별 맞춤 커리큘럼' },
            { icon: '🔬', title: '탐구주제 설계', desc: '세특라이트로 탐구 방향 잡기' },
            { icon: '🎤', title: '면접 시뮬레이션', desc: '실전처럼 연습하고 피드백 받기' },
            { icon: '📄', title: '제시문 면접', desc: 'SKY·교대 기출 제시문 풀기' },
          ].map((f, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '0.5px solid #E5E7EB' }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 5 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 모달 */}
      {modal && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380 }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>
                {modal === 'findEmail' ? '아이디 찾기' : '비밀번호 찾기'}
              </div>
              <div onClick={closeModal} style={{ cursor: 'pointer', color: '#9CA3AF', fontSize: 18 }}>✕</div>
            </div>

            {/* 아이디 찾기 */}
            {modal === 'findEmail' && (
              <div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>가입 시 입력한 이름과 전화번호로 아이디를 찾을 수 있어요.</div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', display: 'block', marginBottom: 6 }}>이름</label>
                  <input style={inputStyle} placeholder="홍길동" value={findName}
                    onChange={e => { setFindName(e.target.value); setFindResult('') }}
                    onFocus={e => e.target.style.borderColor = '#3B5BDB'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', display: 'block', marginBottom: 6 }}>전화번호</label>
                  <input style={inputStyle} placeholder="010-0000-0000" value={findPhone}
                    onChange={e => { setFindPhone(e.target.value); setFindResult('') }}
                    onFocus={e => e.target.style.borderColor = '#3B5BDB'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>
                {findResult && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
                    background: findResult.startsWith('ok:') ? '#ECFDF5' : '#FEE2E2',
                    color: findResult.startsWith('ok:') ? '#059669' : '#DC2626',
                    border: `0.5px solid ${findResult.startsWith('ok:') ? '#6EE7B7' : '#FCA5A5'}`,
                  }}>
                    {findResult.startsWith('ok:') ? `찾은 아이디: ${findResult.slice(3)}` : findResult.slice(6)}
                  </div>
                )}
                <button onClick={handleFindEmail} disabled={findLoading} style={{
                  width: '100%', height: 44, background: findLoading ? '#BAC8FF' : '#3B5BDB',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                }}>
                  {findLoading ? '찾는 중...' : '아이디 찾기'}
                </button>
              </div>
            )}

            {/* 비밀번호 찾기 */}
            {modal === 'findPw' && (
              <div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>가입한 이메일로 임시 비밀번호를 발송해드려요.</div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', display: 'block', marginBottom: 6 }}>이메일</label>
                  <input style={inputStyle} type="email" placeholder="example@email.com" value={findEmail}
                    onChange={e => { setFindEmail(e.target.value); setFindResult('') }}
                    onKeyDown={e => e.key === 'Enter' && handleFindPw()}
                    onFocus={e => e.target.style.borderColor = '#3B5BDB'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>
                {findResult && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
                    background: findResult.startsWith('ok:') ? '#ECFDF5' : '#FEE2E2',
                    color: findResult.startsWith('ok:') ? '#059669' : '#DC2626',
                    border: `0.5px solid ${findResult.startsWith('ok:') ? '#6EE7B7' : '#FCA5A5'}`,
                  }}>
                    {findResult.startsWith('ok:') ? findResult.slice(3) : findResult.slice(6)}
                  </div>
                )}
                <button onClick={handleFindPw} disabled={findLoading} style={{
                  width: '100%', height: 44, background: findLoading ? '#BAC8FF' : '#3B5BDB',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                }}>
                  {findLoading ? '발송 중...' : '임시 비밀번호 발송'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}