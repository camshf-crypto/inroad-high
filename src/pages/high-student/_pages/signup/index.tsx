import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const GRADES_HIGH = ['고1', '고2', '고3']

export default function StudentSignup() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPwC, setShowPwC] = useState(false)

  const [schoolName, setSchoolName] = useState('')
  const [grade, setGrade] = useState('')
  const [academyCode, setAcademyCode] = useState('')
  const [codeStatus, setCodeStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')
  const [academyName, setAcademyName] = useState('')

  // 약관 동의
  const [agreeAll, setAgreeAll] = useState(false)
  const [agreeService, setAgreeService] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const formatPhone = (val: string) => {
    const num = val.replace(/\D/g, '')
    if (num.length <= 3) return num
    if (num.length <= 7) return `${num.slice(0, 3)}-${num.slice(3)}`
    return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`
  }

  const handleAgreeAll = () => {
    const next = !agreeAll
    setAgreeAll(next)
    setAgreeService(next)
    setAgreePrivacy(next)
    setAgreeMarketing(next)
  }

  const syncAllCheck = (s: boolean, p: boolean, m: boolean) => {
    setAgreeAll(s && p && m)
  }

  const handleStep1Next = () => {
    setError('')
    if (!agreeService) return setError('필수 약관에 동의해주세요.')
    if (!agreePrivacy) return setError('개인정보 수집 및 이용에 동의해주세요.')
    setStep(2)
  }

  const handleStep2Next = () => {
    setError('')
    if (!name.trim()) return setError('이름을 입력해주세요.')
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) return setError('올바른 전화번호를 입력해주세요.')
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('올바른 이메일을 입력해주세요.')
    if (password.length < 6) return setError('비밀번호는 6자리 이상이어야 해요.')
    if (password !== passwordConfirm) return setError('비밀번호가 일치하지 않아요.')
    setStep(3)
  }

  const handleCheckCode = () => {
    if (!academyCode.trim()) return setError('학원 코드를 입력해주세요.')
    setError('')
    setCodeStatus('loading')
    setTimeout(() => {
      if (academyCode.toUpperCase() === 'ACA001') {
        setCodeStatus('ok')
        setAcademyName('대치 비커스학원')
      } else {
        setCodeStatus('fail')
        setAcademyName('')
        setError('존재하지 않는 학원 코드예요.')
      }
    }, 800)
  }

  const handleSignup = () => {
    setError('')
    if (!schoolName.trim()) return setError('학교 이름을 입력해주세요.')
    if (!grade) return setError('학년을 선택해주세요.')
    setLoading(true)
    setTimeout(() => { setLoading(false); navigate('/') }, 800)
  }

  const ErrBox = ({ msg }: { msg: string }) => (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
      <span className="text-sm">⚠️</span>
      <span className="text-[11px] text-red-600 font-medium">{msg}</span>
    </div>
  )

  const STEPS = ['약관 동의', '기본 정보', '학교 · 학원'] as const

  return (
    <div className="flex h-screen bg-white font-sans text-ink overflow-hidden">

      {/* 왼쪽 폼 (45%) */}
      <div className="w-[45%] flex-shrink-0 flex flex-col bg-white border-r border-line overflow-y-auto relative">

        {/* 로고 */}
        <div className="px-9 pt-8 pb-5 flex-shrink-0 max-w-[440px] w-full mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-high-dark to-brand-high flex items-center justify-center text-white text-[13px] font-extrabold shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
              IR
            </div>
            <span className="text-[18px] font-extrabold text-brand-high-dark tracking-tight">비커스</span>
          </div>
        </div>

        {/* 폼 */}
        <div className="flex-1 flex flex-col justify-center px-9 pb-8 max-w-[440px] w-full mx-auto">

          <div className="mb-6">
            <div className="text-[22px] font-extrabold text-ink tracking-tight mb-1">회원가입</div>
            <div className="text-[13px] text-ink-secondary">고등 학생 전용 서비스에 가입해주세요</div>
          </div>

          {/* 스텝 인디케이터 */}
          <div className="flex items-start mb-7">
            {STEPS.map((label, i) => {
              const s = i + 1
              const done = step > s
              const active = step === s
              return (
                <div key={s} className="flex items-start flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold mb-1.5 transition-all ${
                      done || active
                        ? 'bg-brand-high text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)]'
                        : 'bg-gray-100 text-ink-muted'
                    }`}>
                      {done ? '✓' : s}
                    </div>
                    <div className={`text-[10px] whitespace-nowrap ${
                      done || active ? 'text-brand-high-dark font-semibold' : 'text-ink-muted font-medium'
                    }`}>
                      {label}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 mt-3.5 transition-all ${done ? 'bg-brand-high' : 'bg-line'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* ── STEP 1: 약관 동의 ── */}
          {step === 1 && (
            <div>
              <div className="text-[15px] font-bold text-ink tracking-tight mb-1">약관 동의</div>
              <div className="text-[12px] text-ink-secondary mb-4">서비스 이용을 위해 약관에 동의해주세요.</div>

              {/* 전체 동의 */}
              <div
                onClick={handleAgreeAll}
                className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl mb-3 cursor-pointer transition-all border ${
                  agreeAll
                    ? 'bg-brand-high-pale border-brand-high-light'
                    : 'bg-gray-50 border-line hover:bg-brand-high-pale/40'
                }`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] text-white font-bold flex-shrink-0 transition-all ${
                  agreeAll ? 'bg-brand-high' : 'bg-white border border-line'
                }`}>
                  {agreeAll ? '✓' : ''}
                </div>
                <span className={`text-[13px] font-bold flex-1 ${agreeAll ? 'text-brand-high-dark' : 'text-ink'}`}>
                  전체 동의하기
                </span>
              </div>

              {/* 개별 약관 */}
              <div className="flex flex-col gap-0.5 px-1">
                {[
                  { checked: agreeService, setChecked: (v: boolean) => { setAgreeService(v); syncAllCheck(v, agreePrivacy, agreeMarketing) }, label: '서비스 이용약관 동의', required: true },
                  { checked: agreePrivacy, setChecked: (v: boolean) => { setAgreePrivacy(v); syncAllCheck(agreeService, v, agreeMarketing) }, label: '개인정보 수집 및 이용 동의', required: true },
                  { checked: agreeMarketing, setChecked: (v: boolean) => { setAgreeMarketing(v); syncAllCheck(agreeService, agreePrivacy, v) }, label: '마케팅 정보 수신 동의', required: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2">
                    <div
                      onClick={() => item.setChecked(!item.checked)}
                      className={`w-[18px] h-[18px] rounded flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0 cursor-pointer transition-all ${
                        item.checked ? 'bg-brand-high' : 'bg-white border border-line hover:border-brand-high-light'
                      }`}
                    >
                      {item.checked ? '✓' : ''}
                    </div>
                    <span
                      onClick={() => item.setChecked(!item.checked)}
                      className="text-[12.5px] text-ink flex-1 cursor-pointer"
                    >
                      {item.required && <span className="text-red-500 font-bold mr-1">[필수]</span>}
                      {!item.required && <span className="text-ink-muted font-medium mr-1">[선택]</span>}
                      {item.label}
                    </span>
                    <button className="text-[11px] text-ink-muted hover:text-brand-high-dark font-medium transition-colors">
                      보기 →
                    </button>
                  </div>
                ))}
              </div>

              {error && <ErrBox msg={error} />}

              <button
                onClick={handleStep1Next}
                className="w-full h-11 bg-brand-high hover:bg-brand-high-dark text-white rounded-lg text-[14px] font-semibold mt-6 transition-all hover:-translate-y-px shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
              >
                다음 →
              </button>

              <div className="text-center mt-3">
                <span className="text-[12px] text-ink-secondary">이미 계정이 있으신가요? </span>
                <button
                  onClick={() => navigate('/')}
                  className="text-[12px] text-brand-high-dark font-bold hover:underline"
                >
                  로그인
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: 기본 정보 ── */}
          {step === 2 && (
            <div>
              <div className="text-[15px] font-bold text-ink tracking-tight mb-1">기본 정보 입력</div>
              <div className="text-[12px] text-ink-secondary mb-4">계정 정보를 입력해주세요.</div>

              <div className="flex flex-col gap-3">

                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">이름</label>
                  <input
                    value={name}
                    onChange={e => { setName(e.target.value); setError('') }}
                    placeholder="홍길동"
                    className="w-full h-10 px-3.5 border border-line rounded-lg text-[13px] focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all placeholder:text-ink-muted"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">전화번호</label>
                  <input
                    value={phone}
                    onChange={e => { setPhone(formatPhone(e.target.value)); setError('') }}
                    placeholder="010-0000-0000"
                    maxLength={13}
                    className="w-full h-10 px-3.5 border border-line rounded-lg text-[13px] focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all placeholder:text-ink-muted"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">이메일</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="example@email.com"
                    className="w-full h-10 px-3.5 border border-line rounded-lg text-[13px] focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all placeholder:text-ink-muted"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">비밀번호</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="6자리 이상"
                      className="w-full h-10 pl-3.5 pr-14 border border-line rounded-lg text-[13px] focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all placeholder:text-ink-muted"
                    />
                    <button
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted hover:text-brand-high-dark font-medium transition-colors"
                    >
                      {showPw ? '숨기기' : '보기'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">비밀번호 확인</label>
                  <div className="relative">
                    <input
                      type={showPwC ? 'text' : 'password'}
                      value={passwordConfirm}
                      onChange={e => { setPasswordConfirm(e.target.value); setError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleStep2Next()}
                      placeholder="비밀번호를 다시 입력하세요"
                      className={`w-full h-10 pl-3.5 pr-14 border rounded-lg text-[13px] focus:outline-none focus:ring-2 transition-all placeholder:text-ink-muted ${
                        passwordConfirm && password !== passwordConfirm
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                          : 'border-line focus:border-brand-high focus:ring-brand-high/10'
                      }`}
                    />
                    <button
                      onClick={() => setShowPwC(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted hover:text-brand-high-dark font-medium transition-colors"
                    >
                      {showPwC ? '숨기기' : '보기'}
                    </button>
                  </div>
                  {passwordConfirm && password !== passwordConfirm && (
                    <div className="text-[10px] text-red-500 mt-1 font-medium">비밀번호가 일치하지 않아요.</div>
                  )}
                </div>

              </div>

              {error && <ErrBox msg={error} />}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => { setStep(1); setError('') }}
                  className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:border-brand-high-light hover:text-brand-high-dark transition-all"
                >
                  ← 이전
                </button>
                <button
                  onClick={handleStep2Next}
                  className="flex-[2] h-11 bg-brand-high hover:bg-brand-high-dark text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
                >
                  다음 →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: 학교 · 학원 ── */}
          {step === 3 && (
            <div>
              <div className="text-[15px] font-bold text-ink tracking-tight mb-1">학교 · 학원 정보</div>
              <div className="text-[12px] text-ink-secondary mb-4">학교와 학원 정보를 입력해주세요.</div>

              <div className="flex flex-col gap-3">

                {/* 고등학교 이름 */}
                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">고등학교 이름 🎓</label>
                  <input
                    value={schoolName}
                    onChange={e => { setSchoolName(e.target.value); setError('') }}
                    placeholder="예: 대치고등학교"
                    className="w-full h-10 px-3.5 border border-line rounded-lg text-[13px] focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all placeholder:text-ink-muted"
                  />
                </div>

                {/* 학년 - 고1/고2/고3만 */}
                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">학년</label>
                  <div className="flex gap-2">
                    {GRADES_HIGH.map(g => (
                      <button
                        key={g}
                        onClick={() => { setGrade(g); setError('') }}
                        className={`flex-1 h-10 rounded-lg text-[13px] font-semibold border-2 transition-all ${
                          grade === g
                            ? 'border-brand-high bg-brand-high-pale text-brand-high-dark'
                            : 'border-line bg-white text-ink-secondary hover:border-brand-high-light'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 학원 코드 */}
                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">
                    학원 코드 <span className="text-ink-muted font-normal">(선택 - 학원생인 경우)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={academyCode}
                      onChange={e => { setAcademyCode(e.target.value.toUpperCase()); setCodeStatus('idle'); setAcademyName(''); setError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleCheckCode()}
                      placeholder="예: ACA001"
                      className={`flex-1 h-10 px-3.5 border rounded-lg text-[13px] focus:outline-none focus:ring-2 transition-all placeholder:text-ink-muted ${
                        codeStatus === 'ok'
                          ? 'border-brand-high focus:ring-brand-high/10'
                          : codeStatus === 'fail'
                            ? 'border-red-400 focus:ring-red-500/10'
                            : 'border-line focus:border-brand-high focus:ring-brand-high/10'
                      }`}
                    />
                    <button
                      onClick={handleCheckCode}
                      disabled={codeStatus === 'loading'}
                      className={`flex-shrink-0 h-10 px-3.5 rounded-lg text-[12px] font-semibold whitespace-nowrap border transition-all ${
                        codeStatus === 'ok'
                          ? 'bg-brand-high-pale text-brand-high-dark border-brand-high-light'
                          : 'bg-white text-ink-secondary border-line hover:border-brand-high-light hover:text-brand-high-dark'
                      } ${codeStatus === 'loading' ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      {codeStatus === 'loading' ? '확인 중...' : codeStatus === 'ok' ? '✓ 확인됨' : '코드 확인'}
                    </button>
                  </div>
                  {codeStatus === 'ok' && academyName && (
                    <div className="flex items-center gap-1.5 bg-brand-high-pale border border-brand-high-light rounded-lg px-3 py-2 mt-2">
                      <span className="text-sm">🏫</span>
                      <span className="text-[12px] text-brand-high-dark font-bold">{academyName}</span>
                      <span className="text-[11px] text-ink-secondary">에 연결됩니다</span>
                    </div>
                  )}
                </div>

              </div>

              {error && <ErrBox msg={error} />}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => { setStep(2); setError('') }}
                  className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:border-brand-high-light hover:text-brand-high-dark transition-all"
                >
                  ← 이전
                </button>
                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className={`flex-[2] h-11 rounded-lg text-[13px] font-semibold text-white transition-all ${
                    loading
                      ? 'bg-brand-high-light cursor-not-allowed'
                      : 'bg-brand-high hover:bg-brand-high-dark hover:-translate-y-px shadow-[0_4px_12px_rgba(37,99,235,0.2)]'
                  }`}
                >
                  {loading ? '가입 중...' : '가입 완료 🎉'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽 소개 (55%, 파랑 그라데이션) */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-brand-high-pale via-white to-brand-high-pale/60 flex items-center justify-center px-12 max-lg:hidden">

        {/* 배경 장식 */}
        <div
          className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.12), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.08), transparent 70%)' }}
        />

        <div className="relative w-full max-w-[560px]">

          <div className="mb-4 flex justify-center">
            <div className="inline-flex items-center gap-2 bg-brand-high-pale border border-brand-high-light rounded-full px-3.5 py-1.5">
              <span className="text-[12px] font-bold text-brand-high-dark">🎓 고등학생 전용</span>
            </div>
          </div>

          <div className="text-[36px] font-extrabold tracking-tight leading-[1.2] mb-4 text-ink text-center">
            대입 합격,<br />
            <span className="text-brand-high-dark">지금 시작하세요</span>
          </div>

          <div className="text-[15px] text-ink-secondary leading-[1.6] mb-10 text-center">
            탐구주제 설계부터 실전 면접 시뮬레이션까지<br />
            비커스와 함께 단계별로 준비하세요.
          </div>

          {/* 기능 카드 */}
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { icon: '🗺️', title: '연간 로드맵', desc: '학년별 월별 맞춤 커리큘럼' },
              { icon: '🔬', title: '탐구주제 설계', desc: '세특라이트로 탐구 방향 잡기' },
              { icon: '🎤', title: '면접 시뮬레이션', desc: '실전처럼 연습하고 피드백 받기' },
              { icon: '📄', title: '제시문 면접', desc: 'SKY·교대 기출 제시문 풀기' },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-white border border-line rounded-xl px-5 py-4 hover:border-brand-high-light hover:shadow-[0_8px_24px_rgba(37,99,235,0.1)] hover:-translate-y-0.5 transition-all cursor-default"
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