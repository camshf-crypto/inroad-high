import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SCHOOL_TYPES = ['중학교', '고등학교']
const GRADES_MIDDLE = ['중1', '중2', '중3']
const GRADES_HIGH = ['고1', '고2', '고3']

export default function StudentSignup() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPwC, setShowPwC] = useState(false)

  const [schoolType, setSchoolType] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [grade, setGrade] = useState('')
  const [academyCode, setAcademyCode] = useState('')
  const [codeStatus, setCodeStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')
  const [academyName, setAcademyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const gradeOptions = schoolType === '중학교' ? GRADES_MIDDLE : schoolType === '고등학교' ? GRADES_HIGH : []

  const formatPhone = (val: string) => {
    const num = val.replace(/\D/g, '')
    if (num.length <= 3) return num
    if (num.length <= 7) return `${num.slice(0, 3)}-${num.slice(3)}`
    return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 38, border: '0.5px solid #E5E7EB', borderRadius: 8,
    padding: '0 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', color: '#1a1a1a', background: '#fff',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, color: '#6B7280', display: 'block', marginBottom: 4,
  }

  const handleNextStep = () => {
    setError('')
    if (!name.trim()) return setError('이름을 입력해주세요.')
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) return setError('올바른 전화번호를 입력해주세요.')
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('올바른 이메일을 입력해주세요.')
    if (password.length < 6) return setError('비밀번호는 6자리 이상이어야 해요.')
    if (password !== passwordConfirm) return setError('비밀번호가 일치하지 않아요.')
    setStep(2)
  }

  const handleCheckCode = () => {
    if (!academyCode.trim()) return setError('학원 코드를 입력해주세요.')
    setError('')
    setCodeStatus('loading')
    setTimeout(() => {
      if (academyCode.toUpperCase() === 'ACA001') {
        setCodeStatus('ok')
        setAcademyName('대치 인데미학원')
      } else {
        setCodeStatus('fail')
        setAcademyName('')
        setError('존재하지 않는 학원 코드예요.')
      }
    }, 800)
  }

  const handleSignup = () => {
    setError('')
    if (!schoolType) return setError('학교 종류를 선택해주세요.')
    if (!schoolName.trim()) return setError('학교 이름을 입력해주세요.')
    if (!grade) return setError('학년을 선택해주세요.')
    if (codeStatus !== 'ok') return setError('학원 코드를 먼저 확인해주세요.')
    setLoading(true)
    // TODO: POST /api/student/signup { name, phone, email, password, schoolType, schoolName, grade, academyCode }
    setTimeout(() => { setLoading(false); navigate('/student/login') }, 800)
  }

  const ErrBox = ({ msg }: { msg: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FEE2E2', borderRadius: 7, padding: '6px 10px', marginTop: 6 }}>
      <span style={{ fontSize: 12 }}>⚠️</span>
      <span style={{ fontSize: 11, color: '#DC2626' }}>{msg}</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F8F7F5' }}>

      {/* 왼쪽 폼 */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px', background: '#fff', borderRight: '0.5px solid #E5E7EB', overflowY: 'auto' }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#3B5BDB', marginBottom: 2 }}>인데미</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>학생 회원가입</div>
        </div>

        {/* 스텝 인디케이터 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          {(['기본 정보', '학교 · 학원'] as const).map((label, i) => {
            const s = i + 1
            const done = step > s
            const active = step === s
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: done ? '#059669' : active ? '#3B5BDB' : '#E5E7EB',
                    color: done || active ? '#fff' : '#9CA3AF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, marginBottom: 3,
                  }}>
                    {done ? '✓' : s}
                  </div>
                  <div style={{ fontSize: 10, color: done ? '#059669' : active ? '#3B5BDB' : '#9CA3AF', fontWeight: active || done ? 600 : 400, whiteSpace: 'nowrap' }}>
                    {label}
                  </div>
                </div>
                {i < 1 && <div style={{ flex: 1, height: 1.5, background: done ? '#059669' : '#E5E7EB', margin: '0 8px', marginBottom: 16 }} />}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 2 }}>기본 정보 입력</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 12 }}>계정 정보를 입력해주세요.</div>

            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>이름</label>
              <input style={inputStyle} placeholder="홍길동" value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                onFocus={e => e.target.style.borderColor = '#3B5BDB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>전화번호</label>
              <input style={inputStyle} placeholder="010-0000-0000" value={phone}
                onChange={e => { setPhone(formatPhone(e.target.value)); setError('') }}
                onFocus={e => e.target.style.borderColor = '#3B5BDB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                maxLength={13} />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>이메일</label>
              <input style={inputStyle} type="email" placeholder="example@email.com" value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onFocus={e => e.target.style.borderColor = '#3B5BDB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>비밀번호</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: 50 }} type={showPw ? 'text' : 'password'}
                  placeholder="6자리 이상" value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onFocus={e => e.target.style.borderColor = '#3B5BDB'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                <button onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 11 }}>
                  {showPw ? '숨기기' : '보기'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 4 }}>
              <label style={labelStyle}>비밀번호 확인</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inputStyle, paddingRight: 50, borderColor: passwordConfirm && password !== passwordConfirm ? '#DC2626' : '#E5E7EB' }}
                  type={showPwC ? 'text' : 'password'}
                  placeholder="비밀번호를 다시 입력하세요" value={passwordConfirm}
                  onChange={e => { setPasswordConfirm(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleNextStep()}
                  onFocus={e => e.target.style.borderColor = '#3B5BDB'}
                  onBlur={e => e.target.style.borderColor = passwordConfirm && password !== passwordConfirm ? '#DC2626' : '#E5E7EB'} />
                <button onClick={() => setShowPwC(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 11 }}>
                  {showPwC ? '숨기기' : '보기'}
                </button>
              </div>
              {passwordConfirm && password !== passwordConfirm && (
                <div style={{ fontSize: 10, color: '#DC2626', marginTop: 3 }}>비밀번호가 일치하지 않아요.</div>
              )}
            </div>

            {error && <ErrBox msg={error} />}

            <button onClick={handleNextStep} style={{
              width: '100%', height: 42, background: '#3B5BDB', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', marginTop: 12,
            }}>
              다음 →
            </button>

            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>이미 계정이 있으신가요? </span>
              <span onClick={() => navigate('/student/login')} style={{ fontSize: 11, color: '#3B5BDB', fontWeight: 600, cursor: 'pointer' }}>로그인</span>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 2 }}>학교 · 학원 정보</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 12 }}>학교와 학원 정보를 입력해주세요.</div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>학교 종류</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {SCHOOL_TYPES.map(t => (
                  <div key={t} onClick={() => { setSchoolType(t); setGrade(''); setError('') }} style={{
                    flex: 1, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px solid ${schoolType === t ? '#3B5BDB' : '#E5E7EB'}`,
                    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: schoolType === t ? '#EEF2FF' : '#fff',
                    color: schoolType === t ? '#3B5BDB' : '#6B7280',
                  }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>학교 이름</label>
              <input style={inputStyle} placeholder="예: 대치중학교" value={schoolName}
                onChange={e => { setSchoolName(e.target.value); setError('') }}
                onFocus={e => e.target.style.borderColor = '#3B5BDB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>학년</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {gradeOptions.length > 0 ? gradeOptions.map(g => (
                  <div key={g} onClick={() => { setGrade(g); setError('') }} style={{
                    flex: 1, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px solid ${grade === g ? '#3B5BDB' : '#E5E7EB'}`,
                    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: grade === g ? '#EEF2FF' : '#fff',
                    color: grade === g ? '#3B5BDB' : '#6B7280',
                  }}>
                    {g}
                  </div>
                )) : (
                  <div style={{ fontSize: 11, color: '#9CA3AF', padding: '10px 0' }}>학교 종류를 먼저 선택해주세요.</div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>학원 코드</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1, borderColor: codeStatus === 'ok' ? '#059669' : codeStatus === 'fail' ? '#DC2626' : '#E5E7EB' }}
                  placeholder="예: ACA001"
                  value={academyCode}
                  onChange={e => { setAcademyCode(e.target.value.toUpperCase()); setCodeStatus('idle'); setAcademyName(''); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleCheckCode()}
                  onFocus={e => e.target.style.borderColor = '#3B5BDB'}
                  onBlur={e => e.target.style.borderColor = codeStatus === 'ok' ? '#059669' : codeStatus === 'fail' ? '#DC2626' : '#E5E7EB'}
                />
                <button onClick={handleCheckCode} disabled={codeStatus === 'loading'} style={{
                  flexShrink: 0, height: 38, padding: '0 12px',
                  background: codeStatus === 'ok' ? '#ECFDF5' : '#F3F4F6',
                  color: codeStatus === 'ok' ? '#059669' : '#6B7280',
                  border: `0.5px solid ${codeStatus === 'ok' ? '#6EE7B7' : '#E5E7EB'}`,
                  borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' as const,
                }}>
                  {codeStatus === 'loading' ? '확인 중...' : codeStatus === 'ok' ? '✓ 확인됨' : '코드 확인'}
                </button>
              </div>
              {codeStatus === 'ok' && academyName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ECFDF5', border: '0.5px solid #6EE7B7', borderRadius: 7, padding: '6px 10px', marginTop: 6 }}>
                  <span style={{ fontSize: 12 }}>🏫</span>
                  <span style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>{academyName}</span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>에 연결됩니다.</span>
                </div>
              )}
            </div>

            {error && <ErrBox msg={error} />}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => { setStep(1); setError('') }} style={{
                flex: 1, height: 42, background: '#fff', color: '#6B7280',
                border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>
                ← 이전
              </button>
              <button onClick={handleSignup} disabled={loading} style={{
                flex: 2, height: 42, background: loading ? '#BAC8FF' : '#3B5BDB', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? '가입 중...' : '가입 완료'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 오른쪽 소개 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, background: '#F8F7F5' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>면접 합격, 지금 시작하세요</div>
        <div style={{ fontSize: 15, color: '#6B7280', marginBottom: 48, textAlign: 'center', lineHeight: 1.6 }}>
          탐구주제 설계부터 실전 면접 시뮬레이션까지<br />인데미와 함께 단계별로 준비하세요.
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

    </div>
  )
}