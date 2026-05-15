// src/pages/auth/_pages/signup/index.tsx
// 통합 회원가입 페이지 - 중등/고등 학생, 선생님, 원장 모두 사용
// 가입 후 role: 'pending' → 마스터가 권한 부여

import { useNavigate } from 'react-router-dom'
import { useSignup } from '@/lib/auth/useSignup'

export default function Signup() {
  const navigate = useNavigate()
  const s = useSignup()  // ⭐ level 파라미터 제거! (통합)

  const STEPS = ['약관 동의', '기본 정보'] as const

  const ErrBox = ({ msg }: { msg: string }) => (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
      <span className="text-sm">⚠️</span>
      <span className="text-[11px] text-red-600 font-medium">{msg}</span>
    </div>
  )

  return (
    <div className="flex h-screen bg-white font-sans text-ink overflow-hidden">

      {/* 왼쪽 폼 (45%) */}
      <div className="w-[45%] flex-shrink-0 flex flex-col bg-white border-r border-line overflow-y-auto relative">

        {/* 로고 */}
        <div className="px-9 pt-8 pb-5 flex-shrink-0 max-w-[440px] w-full mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gradient-start to-brand-gradient-end flex items-center justify-center text-white text-[13px] font-extrabold shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
              IR
            </div>
            <span className="text-[18px] font-extrabold text-ink tracking-tight">비커스</span>
          </div>
        </div>

        {/* 폼 */}
        <div className="flex-1 flex flex-col justify-center px-9 pb-8 max-w-[440px] w-full mx-auto">

          <div className="mb-6">
            <div className="text-[22px] font-extrabold text-ink tracking-tight mb-1">회원가입</div>
            <div className="text-[13px] text-ink-secondary">비커스에 오신 것을 환영해요</div>
          </div>

          {/* 스텝 인디케이터 */}
          <div className="flex items-start mb-7">
            {STEPS.map((label, i) => {
              const stepNum = i + 1
              const done = s.step > stepNum
              const active = s.step === stepNum
              return (
                <div key={stepNum} className="flex items-start flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold mb-1.5 transition-all ${
                      done || active
                        ? 'bg-brand-primary text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)]'
                        : 'bg-gray-100 text-ink-muted'
                    }`}>
                      {done ? '✓' : stepNum}
                    </div>
                    <div className={`text-[10px] whitespace-nowrap ${
                      done || active ? 'text-brand-primary font-semibold' : 'text-ink-muted font-medium'
                    }`}>
                      {label}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 mt-3.5 transition-all ${done ? 'bg-brand-primary' : 'bg-line'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* ── STEP 1: 약관 동의 ── */}
          {s.step === 1 && (
            <div>
              <div className="text-[15px] font-bold text-ink tracking-tight mb-1">약관 동의</div>
              <div className="text-[12px] text-ink-secondary mb-4">서비스 이용을 위해 약관에 동의해주세요.</div>

              <div
                onClick={s.handleAgreeAll}
                className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl mb-3 cursor-pointer transition-all border ${
                  s.agreeAll
                    ? 'bg-brand-primary-bg border-brand-primary-light'
                    : 'bg-gray-50 border-line hover:bg-brand-primary-bg/40'
                }`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] text-white font-bold flex-shrink-0 transition-all ${
                  s.agreeAll ? 'bg-brand-primary' : 'bg-white border border-line'
                }`}>
                  {s.agreeAll ? '✓' : ''}
                </div>
                <span className={`text-[13px] font-bold flex-1 ${s.agreeAll ? 'text-brand-primary' : 'text-ink'}`}>
                  전체 동의하기
                </span>
              </div>

              <div className="flex flex-col gap-0.5 px-1">
                {[
                  { checked: s.agreeService, setChecked: (v: boolean) => { s.setAgreeService(v); s.syncAllCheck(v, s.agreePrivacy, s.agreeMarketing) }, label: '서비스 이용약관 동의', required: true },
                  { checked: s.agreePrivacy, setChecked: (v: boolean) => { s.setAgreePrivacy(v); s.syncAllCheck(s.agreeService, v, s.agreeMarketing) }, label: '개인정보 수집 및 이용 동의', required: true },
                  { checked: s.agreeMarketing, setChecked: (v: boolean) => { s.setAgreeMarketing(v); s.syncAllCheck(s.agreeService, s.agreePrivacy, v) }, label: '마케팅 정보 수신 동의', required: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2">
                    <div
                      onClick={() => item.setChecked(!item.checked)}
                      className={`w-[18px] h-[18px] rounded flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0 cursor-pointer transition-all ${
                        item.checked ? 'bg-brand-primary' : 'bg-white border border-line hover:border-brand-primary-light'
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
                    <button className="text-[11px] text-ink-muted hover:text-brand-primary font-medium transition-colors">
                      보기 →
                    </button>
                  </div>
                ))}
              </div>

              {s.error && <ErrBox msg={s.error} />}

              <button
                onClick={s.handleStep1Next}
                className="w-full h-11 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-[14px] font-semibold mt-6 transition-all hover:-translate-y-px shadow-btn-primary"
              >
                다음 →
              </button>

              <div className="text-center mt-3">
                <span className="text-[12px] text-ink-secondary">이미 계정이 있으신가요? </span>
                <button
                  onClick={() => navigate('/login')}
                  className="text-[12px] text-brand-primary font-bold hover:underline"
                >
                  로그인
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: 기본 정보 + 핸드폰 인증 ── */}
          {s.step === 2 && (
            <div>
              <div className="text-[15px] font-bold text-ink tracking-tight mb-1">기본 정보 입력</div>
              <div className="text-[12px] text-ink-secondary mb-4">계정 정보를 입력해주세요.</div>

              <div className="flex flex-col gap-3">

                {/* 이름 */}
                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">이름</label>
                  <input
                    value={s.name}
                    onChange={e => { s.setName(e.target.value); s.setError('') }}
                    placeholder="홍길동"
                    className="w-full h-10 px-3.5 border border-line rounded-lg text-[13px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all placeholder:text-ink-muted"
                  />
                </div>

                {/* 전화번호 + 인증 */}
                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">
                    전화번호
                    {s.phoneVerified && (
                      <span className="ml-2 text-[10px] font-bold text-emerald-600">✓ 인증완료</span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={s.phone}
                      onChange={e => s.handlePhoneChange(e.target.value)}
                      placeholder="010-0000-0000"
                      maxLength={13}
                      disabled={s.phoneVerified}
                      className={`flex-1 h-10 px-3.5 border rounded-lg text-[13px] focus:outline-none focus:ring-2 transition-all placeholder:text-ink-muted ${
                        s.phoneVerified
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'border-line focus:border-brand-primary focus:ring-brand-primary/10'
                      }`}
                    />
                    <button
                      onClick={s.handleSendPhoneCode}
                      disabled={s.phoneVerified}
                      className={`flex-shrink-0 h-10 px-3.5 rounded-lg text-[12px] font-semibold whitespace-nowrap border transition-all ${
                        s.phoneVerified
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-not-allowed'
                          : s.phoneCodeSent
                            ? 'bg-brand-primary-bg text-brand-primary border-brand-primary-light hover:border-brand-primary'
                            : 'bg-white text-ink-secondary border-line hover:border-brand-primary-light hover:text-brand-primary'
                      }`}
                    >
                      {s.phoneVerified ? '✓ 완료' : s.phoneCodeSent ? '재발송' : '인증번호 발송'}
                    </button>
                  </div>
                </div>

                {/* 인증번호 입력 */}
                {s.phoneCodeSent && !s.phoneVerified && (
                  <div>
                    <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">
                      인증번호
                      <span className="ml-2 text-[10px] text-ink-muted font-normal">
                        (테스트용: <span className="font-bold text-brand-primary">123456</span>)
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          value={s.phoneCode}
                          onChange={e => {
                            s.setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                            s.setPhoneCodeError('')
                          }}
                          onKeyDown={e => e.key === 'Enter' && s.handleVerifyPhoneCode()}
                          placeholder="6자리 숫자"
                          maxLength={6}
                          className="w-full h-10 pl-3.5 pr-16 border border-line rounded-lg text-[14px] font-bold tracking-[2px] text-center focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all placeholder:text-ink-muted placeholder:font-normal placeholder:tracking-normal"
                        />
                        {s.timer > 0 && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-red-500">
                            {s.formatTimer(s.timer)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={s.handleVerifyPhoneCode}
                        className="flex-shrink-0 h-10 px-3.5 bg-brand-primary text-white rounded-lg text-[12px] font-semibold hover:bg-brand-primary-hover transition-all"
                      >
                        확인
                      </button>
                    </div>
                    {s.phoneCodeError && (
                      <div className="text-[10px] text-red-500 mt-1 font-medium flex items-center gap-1">
                        <span>⚠️</span> {s.phoneCodeError}
                      </div>
                    )}
                    {s.timer === 0 && s.phoneCodeSent && !s.phoneVerified && (
                      <div className="text-[10px] text-amber-600 mt-1 font-medium flex items-center gap-1">
                        <span>⏰</span> 시간이 만료됐어요. 재발송 해주세요.
                      </div>
                    )}
                  </div>
                )}

                {/* 이메일 */}
                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">이메일</label>
                  <input
                    type="email"
                    value={s.email}
                    onChange={e => { s.setEmail(e.target.value); s.setError('') }}
                    placeholder="example@email.com"
                    className="w-full h-10 px-3.5 border border-line rounded-lg text-[13px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all placeholder:text-ink-muted"
                  />
                </div>

                {/* 비밀번호 */}
                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">비밀번호</label>
                  <div className="relative">
                    <input
                      type={s.showPw ? 'text' : 'password'}
                      value={s.password}
                      onChange={e => { s.setPassword(e.target.value); s.setError('') }}
                      placeholder="6자리 이상"
                      className="w-full h-10 pl-3.5 pr-14 border border-line rounded-lg text-[13px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all placeholder:text-ink-muted"
                    />
                    <button
                      onClick={() => s.setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted hover:text-brand-primary font-medium transition-colors"
                    >
                      {s.showPw ? '숨기기' : '보기'}
                    </button>
                  </div>
                </div>

                {/* 비밀번호 확인 */}
                <div>
                  <label className="text-[11px] font-semibold text-ink-secondary block mb-1.5">비밀번호 확인</label>
                  <div className="relative">
                    <input
                      type={s.showPwC ? 'text' : 'password'}
                      value={s.passwordConfirm}
                      onChange={e => { s.setPasswordConfirm(e.target.value); s.setError('') }}
                      onKeyDown={e => e.key === 'Enter' && s.handleSignup()}
                      placeholder="비밀번호를 다시 입력하세요"
                      className={`w-full h-10 pl-3.5 pr-14 border rounded-lg text-[13px] focus:outline-none focus:ring-2 transition-all placeholder:text-ink-muted ${
                        s.passwordConfirm && s.password !== s.passwordConfirm
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                          : 'border-line focus:border-brand-primary focus:ring-brand-primary/10'
                      }`}
                    />
                    <button
                      onClick={() => s.setShowPwC(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted hover:text-brand-primary font-medium transition-colors"
                    >
                      {s.showPwC ? '숨기기' : '보기'}
                    </button>
                  </div>
                  {s.passwordConfirm && s.password !== s.passwordConfirm && (
                    <div className="text-[10px] text-red-500 mt-1 font-medium">비밀번호가 일치하지 않아요.</div>
                  )}
                </div>

              </div>

              {/* 안내 박스 */}
              <div className="bg-brand-primary-bg border border-brand-primary-light rounded-lg px-3 py-2.5 mt-4 flex gap-2">
                <span className="text-base flex-shrink-0">💡</span>
                <div className="text-[11px] text-brand-primary leading-[1.6]">
                  <strong>회원가입 후 관리자 승인이 필요해요.</strong><br />
                  학생·선생님 구분 및 학원 배정은 관리자가 진행합니다.
                </div>
              </div>

              {s.error && <ErrBox msg={s.error} />}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => { s.setStep(1); s.setError('') }}
                  className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:border-brand-primary-light hover:text-brand-primary transition-all"
                >
                  ← 이전
                </button>
                <button
                  onClick={s.handleSignup}
                  disabled={s.loading}
                  className={`flex-[2] h-11 rounded-lg text-[13px] font-semibold text-white transition-all ${
                    s.loading
                      ? 'bg-brand-primary-light cursor-not-allowed'
                      : 'bg-brand-primary hover:bg-brand-primary-hover hover:-translate-y-px shadow-btn-primary'
                  }`}
                >
                  {s.loading ? '가입 중...' : '가입 완료'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽 소개 (55%, 파란 그라데이션) */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-brand-primary-bg via-white to-brand-primary-bg/60 flex items-center justify-center px-12 max-lg:hidden">

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
            <div className="inline-flex items-center gap-2 bg-brand-primary-bg border border-brand-primary-light rounded-full px-3.5 py-1.5">
              <span className="text-[12px] font-bold text-brand-primary">🎓 비커스 통합 가입</span>
            </div>
          </div>

          <div className="text-[36px] font-extrabold tracking-tight leading-[1.2] mb-4 text-ink text-center">
            입시의 답,<br />
            <span className="bg-gradient-to-r from-brand-gradient-start to-brand-gradient-end bg-clip-text text-transparent">
              지금 시작하세요
            </span>
          </div>

          <div className="text-[15px] text-ink-secondary leading-[1.6] mb-10 text-center">
            자사고·외고·과학고 입시부터 대입까지<br />
            AI 기반 비교과 컨설팅을 만나보세요.
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {[
              { icon: '', title: 'AI 자소서 컨설팅', desc: '학교별 맞춤 자기소개서 분석' },
              { icon: '', title: '면접 시뮬레이션', desc: '실전처럼 연습하고 피드백' },
              { icon: '', title: '95개 학교 기출', desc: '자사고·특목고·대학 기출 풀기' },
              { icon: '', title: '학년별 로드맵', desc: '맞춤형 입시 커리큘럼' },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-white border border-line rounded-xl px-5 py-4 hover:border-brand-primary-light hover:shadow-[0_8px_24px_rgba(37,99,235,0.1)] hover:-translate-y-0.5 transition-all cursor-default"
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