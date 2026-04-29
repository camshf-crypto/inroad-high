import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetAtom } from 'jotai'
import { tokenState, studentState, academyState } from '../../_store/auth'
import { supabase } from '../../../../lib/supabase'

type Modal = 'findEmail' | 'findPw' | null

export default function StudentLogin() {
  const navigate = useNavigate()
  const setToken = useSetAtom(tokenState)
  const setStudent = useSetAtom(studentState)
  const setAcademy = useSetAtom(academyState)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [modal, setModal] = useState<Modal>(null)
  const [findName, setFindName] = useState('')
  const [findPhone, setFindPhone] = useState('')
  const [findEmail, setFindEmail] = useState('')
  const [findResult, setFindResult] = useState('')
  const [findLoading, setFindLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { 
      setError('이메일과 비밀번호를 입력해주세요.')
      return 
    }
    
    setLoading(true)
    setError('')

    try {
      // 1️⃣ Supabase Auth 로그인
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않아요.')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('이메일 인증이 완료되지 않았습니다.')
        } else {
          setError('로그인에 실패했습니다.')
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('로그인 정보를 가져올 수 없습니다.')
        setLoading(false)
        return
      }

      // 2️⃣ profiles 테이블에서 role 확인
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, name, academy_id, grade, school, email')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) {
        setError('프로필 정보를 불러올 수 없습니다.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // 3️⃣ high_student만 허용
      if (profile.role !== 'high_student') {
        setError('고등학생 계정만 접근 가능합니다.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // 4️⃣ 학원 정보 가져오기
      let academyInfo = null
      if (profile.academy_id) {
        const { data: academy } = await supabase
          .from('academies')
          .select('*')
          .eq('id', profile.academy_id)
          .single()
        academyInfo = academy
      }

      // 5️⃣ Jotai state 저장
      setToken({
        accessToken: authData.session?.access_token || '',
        expiresIn: String(
          authData.session?.expires_at || Date.now() / 1000 + 86400
        ),
      })

      setStudent({
        id: authData.user.id as any,
        name: profile.name || '',
        grade: profile.grade || '고1',
        email: profile.email || email,
        role: 'STUDENT',
      })

      if (academyInfo) {
        setAcademy({
          academyId: academyInfo.id,
          academyCode: academyInfo.academy_code || '',
          academyName: academyInfo.name,
          teacherName: '',
          teacherId: undefined as any,
        })
      }

      // 6️⃣ 로드맵 페이지로 이동
      navigate('/high-student/roadmap')

    } catch (err) {
      console.error('로그인 에러:', err)
      setError('로그인 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleFindEmail = () => {
    if (!findName.trim() || !findPhone.trim()) { 
      setFindResult('error:이름과 전화번호를 입력해주세요.')
      return 
    }
    setFindLoading(true)
    setFindResult('')
    setTimeout(() => {
      setFindLoading(false)
      setFindResult('error:현재 지원하지 않는 기능입니다. 학원에 문의해주세요.')
    }, 500)
  }

  const handleFindPw = async () => {
    if (!findEmail.trim()) { 
      setFindResult('error:이메일을 입력해주세요.')
      return 
    }
    setFindLoading(true)
    setFindResult('')
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(findEmail, {
        redirectTo: window.location.origin + '/high-student/login',
      })
      
      if (error) {
        setFindResult('error:이메일 발송에 실패했습니다.')
      } else {
        setFindResult('ok:입력하신 이메일로 비밀번호 재설정 링크를 발송했어요.')
      }
    } catch (err) {
      setFindResult('error:오류가 발생했습니다.')
    } finally {
      setFindLoading(false)
    }
  }

  const closeModal = () => {
    setModal(null)
    setFindName('')
    setFindPhone('')
    setFindEmail('')
    setFindResult('')
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-ink">

      {/* 왼쪽 폼 (50%) */}
      <div className="flex-1 flex flex-col bg-white border-r border-line overflow-y-auto relative">

        {/* 상단 로고 */}
        <div className="absolute top-8 left-8 flex items-center gap-2">
          <span className="w-8 h-8 bg-gradient-to-br from-brand-high-dark to-brand-high rounded-lg flex items-center justify-center text-white font-black text-sm tracking-tighter">IR</span>
          <div className="font-extrabold text-[17px] text-ink tracking-tight">비커스</div>
        </div>

        {/* 가운데 정렬 폼 */}
        <div className="flex-1 flex flex-col justify-center px-8">
          <div className="w-full max-w-[360px] mx-auto">

            {/* 타이틀 */}
            <div className="mb-8 text-center">
              <h1 className="text-[28px] font-extrabold text-ink tracking-tight mb-2">로그인</h1>
              <p className="text-[13px] text-ink-secondary">고등 학생 계정으로 로그인하세요.</p>
            </div>

            {/* 이메일 */}
            <div className="mb-3">
              <input
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && !loading && handleLogin()}
                disabled={loading}
                placeholder="계정 이메일"
                className={`w-full h-12 px-4 border rounded-lg text-[14px] focus:outline-none focus:ring-2 transition-all placeholder:text-ink-muted disabled:opacity-60 disabled:bg-gray-50 ${
                  error
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                    : 'border-line focus:border-brand-high focus:ring-brand-high/10'
                }`}
              />
            </div>

            {/* 비밀번호 */}
            <div className="mb-3">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleLogin()}
                  disabled={loading}
                  placeholder="비밀번호"
                  className={`w-full h-12 pl-4 pr-12 border rounded-lg text-[14px] focus:outline-none focus:ring-2 transition-all placeholder:text-ink-muted disabled:opacity-60 disabled:bg-gray-50 ${
                    error
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                      : 'border-line focus:border-brand-high focus:ring-brand-high/10'
                  }`}
                />
                <button
                  onClick={() => setShowPw(v => !v)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-brand-high-dark transition-colors"
                  type="button"
                >
                  {showPw ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 에러 */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                <span className="text-sm">⚠️</span>
                <span className="text-[12px] text-red-600 font-medium">{error}</span>
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className={`w-full h-12 rounded-lg text-[14px] font-semibold text-white transition-all ${
                loading
                  ? 'bg-brand-high-light cursor-not-allowed'
                  : 'bg-brand-high hover:bg-brand-high-hover hover:-translate-y-px hover:shadow-btn-high'
              }`}
            >
              {loading ? '로그인 중...' : '이메일로 로그인'}
            </button>

            {/* 구분선 */}
            <div className="h-px bg-line my-6" />

            {/* 아이디/비밀번호 찾기 + 회원가입 */}
            <div className="flex items-center justify-center gap-4 text-[13px]">
              <button
                onClick={() => { setModal('findEmail'); setFindResult('') }}
                className="text-ink-secondary hover:text-brand-high-dark transition-colors"
              >
                아이디 찾기
              </button>
              <span className="text-line">|</span>
              <button
                onClick={() => { setModal('findPw'); setFindResult('') }}
                className="text-ink-secondary hover:text-brand-high-dark transition-colors"
              >
                비밀번호 찾기
              </button>
              <span className="text-line">|</span>
              <button
                onClick={() => navigate('/high-student/signup')}
                className="text-brand-high-dark font-bold hover:text-brand-high transition-colors"
              >
                회원가입
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 오른쪽 소개 (50%) */}
      <div className="flex-1 max-md:hidden flex flex-col items-center justify-center px-16 py-12 bg-gradient-to-br from-[#EFF6FF] to-[#F8FAFC] relative overflow-hidden">
        
        <div
          className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08), transparent 70%)' }}
        />

        <div className="relative text-center mb-12 max-w-[580px]">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-high-bg text-brand-high-dark text-[12px] font-bold rounded-full border border-brand-high-light mb-5">
            🎓 고등학생 전용
          </span>
          <h1 className="text-[40px] max-md:text-3xl font-extrabold text-ink tracking-[-0.03em] leading-[1.2] mb-4">
            대입 합격,<br />
            <span className="bg-gradient-to-br from-brand-high-dark to-brand-high bg-clip-text text-transparent">
              지금 시작하세요
            </span>
          </h1>
          <p className="text-[15px] text-ink-secondary leading-[1.7]">
            탐구주제 설계부터 실전 면접 시뮬레이션까지<br />
            비커스와 함께 단계별로 준비하세요.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-[520px] relative">
          {[
            { icon: '🗺️', title: '연간 로드맵', desc: '학년별 월별 맞춤 커리큘럼' },
            { icon: '🔬', title: '탐구주제 설계', desc: '세특라이트로 탐구 방향 잡기' },
            { icon: '🎤', title: '면접 시뮬레이션', desc: '실전처럼 연습하고 피드백 받기' },
            { icon: '📄', title: '제시문 면접', desc: 'SKY·교대 기출 제시문 풀기' },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl px-5 py-4 border border-line hover:border-brand-high-light hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] hover:-translate-y-0.5 transition-all"
            >
              <div className="w-10 h-10 bg-brand-high-pale rounded-xl flex items-center justify-center text-xl mb-3 border border-brand-high-light">
                {f.icon}
              </div>
              <div className="text-[13px] font-bold text-ink tracking-tight mb-1">{f.title}</div>
              <div className="text-[11px] text-ink-secondary leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 모달 */}
      {modal && (
        <div
          onClick={closeModal}
          className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[420px] shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="text-[18px] font-bold text-ink tracking-tight">
                {modal === 'findEmail' ? '아이디 찾기' : '비밀번호 찾기'}
              </div>
              <button onClick={closeModal} className="text-ink-muted hover:text-ink text-xl transition-colors">✕</button>
            </div>

            {modal === 'findEmail' && (
              <div>
                <div className="text-[13px] text-ink-secondary mb-5 leading-relaxed">
                  가입 시 입력한 이름과 전화번호로<br />아이디를 찾을 수 있어요.
                </div>
                <div className="mb-3">
                  <label className="text-[12px] font-semibold text-ink-secondary block mb-1.5">이름</label>
                  <input
                    className="w-full h-11 px-3.5 border border-line rounded-lg text-[14px] focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all placeholder:text-ink-muted"
                    placeholder="홍길동"
                    value={findName}
                    onChange={e => { setFindName(e.target.value); setFindResult('') }}
                  />
                </div>
                <div className="mb-4">
                  <label className="text-[12px] font-semibold text-ink-secondary block mb-1.5">전화번호</label>
                  <input
                    className="w-full h-11 px-3.5 border border-line rounded-lg text-[14px] focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all placeholder:text-ink-muted"
                    placeholder="010-0000-0000"
                    value={findPhone}
                    onChange={e => { setFindPhone(e.target.value); setFindResult('') }}
                  />
                </div>

                {findResult && (
                  <div className={`px-4 py-3 rounded-lg mb-4 text-[13px] border ${
                    findResult.startsWith('ok:')
                      ? 'bg-brand-high-pale border-brand-high-light text-brand-high-dark font-semibold'
                      : 'bg-red-50 border-red-200 text-red-600 font-medium'
                  }`}>
                    {findResult.startsWith('ok:') ? `찾은 아이디: ${findResult.slice(3)}` : findResult.slice(6)}
                  </div>
                )}

                <button
                  onClick={handleFindEmail}
                  disabled={findLoading}
                  className={`w-full h-11 rounded-lg text-[14px] font-semibold text-white transition-all ${
                    findLoading
                      ? 'bg-brand-high-light cursor-not-allowed'
                      : 'bg-brand-high hover:bg-brand-high-hover hover:-translate-y-px hover:shadow-btn-high'
                  }`}
                >
                  {findLoading ? '찾는 중...' : '아이디 찾기'}
                </button>
              </div>
            )}

            {modal === 'findPw' && (
              <div>
                <div className="text-[13px] text-ink-secondary mb-5 leading-relaxed">
                  가입한 이메일로 비밀번호 재설정 링크를<br />발송해드려요.
                </div>
                <div className="mb-4">
                  <label className="text-[12px] font-semibold text-ink-secondary block mb-1.5">이메일</label>
                  <input
                    className="w-full h-11 px-3.5 border border-line rounded-lg text-[14px] focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all placeholder:text-ink-muted"
                    type="email"
                    placeholder="example@email.com"
                    value={findEmail}
                    onChange={e => { setFindEmail(e.target.value); setFindResult('') }}
                    onKeyDown={e => e.key === 'Enter' && handleFindPw()}
                  />
                </div>

                {findResult && (
                  <div className={`px-4 py-3 rounded-lg mb-4 text-[13px] border ${
                    findResult.startsWith('ok:')
                      ? 'bg-brand-high-pale border-brand-high-light text-brand-high-dark font-semibold'
                      : 'bg-red-50 border-red-200 text-red-600 font-medium'
                  }`}>
                    {findResult.startsWith('ok:') ? findResult.slice(3) : findResult.slice(6)}
                  </div>
                )}

                <button
                  onClick={handleFindPw}
                  disabled={findLoading}
                  className={`w-full h-11 rounded-lg text-[14px] font-semibold text-white transition-all ${
                    findLoading
                      ? 'bg-brand-high-light cursor-not-allowed'
                      : 'bg-brand-high hover:bg-brand-high-hover hover:-translate-y-px hover:shadow-btn-high'
                  }`}
                >
                  {findLoading ? '발송 중...' : '재설정 링크 발송'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}