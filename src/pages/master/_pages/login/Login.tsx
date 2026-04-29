import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetAtom } from 'jotai'
import { masterTokenState } from '../../_store/auth'
import { supabase } from '@/lib/supabase'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.48)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

export default function MasterLogin() {
  const navigate = useNavigate()
  const setToken = useSetAtom(masterTokenState)
  const [email, setEmail] = useState('company@masterway.co.kr')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요')
      return
    }

    setLoading(true)
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('이메일 인증이 완료되지 않았습니다')
        } else {
          setError('로그인에 실패했습니다: ' + authError.message)
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('로그인 정보를 가져올 수 없습니다')
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) {
        setError('프로필 정보를 불러올 수 없습니다')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      if (!profile.role.startsWith('master_')) {
        setError('본사 직원 계정만 접근 가능합니다')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      setToken({
        accessToken: authData.session?.access_token || '',
        expiresIn: new Date(
          (authData.session?.expires_at || Date.now() / 1000 + 86400) * 1000
        ).toISOString(),
      })

      navigate('/master')

    } catch (err) {
      console.error('로그인 에러:', err)
      setError('로그인 중 오류가 발생했습니다')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 font-sans relative overflow-hidden"
      style={{ background: THEME.gradient }}
    >
      <div
        className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)' }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)' }}
      />

      <div className="bg-white rounded-3xl px-10 py-12 w-[440px] shadow-[0_30px_80px_rgba(0,0,0,0.25)] relative">

        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_8px_24px_rgba(124,58,237,0.3)]"
            style={{ background: THEME.gradient }}
          >
            <span className="text-3xl">🏢</span>
          </div>
          <div className="text-[24px] font-extrabold tracking-tight mb-1" style={{ color: THEME.accentDark }}>
            BIKUS MASTER
          </div>
          <div className="text-[13px] font-medium text-ink-secondary">
            본사 관리 시스템
          </div>
        </div>

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

        {error && (
          <div className="rounded-xl px-4 py-3 mb-4 bg-red-50 border border-red-200">
            <div className="text-[12px] font-medium text-red-600 flex items-start gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 mb-5">
          <div>
            <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5 block">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              placeholder="company@masterway.co.kr"
              className="w-full h-12 px-4 border border-line rounded-lg text-[14px] font-medium outline-none transition-all placeholder:text-ink-muted disabled:opacity-60 disabled:bg-gray-50"
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
              onKeyDown={e => e.key === 'Enter' && !loading && handleLogin()}
              disabled={loading}
              placeholder="비밀번호 입력"
              className="w-full h-12 px-4 border border-line rounded-lg text-[14px] font-medium outline-none transition-all placeholder:text-ink-muted disabled:opacity-60 disabled:bg-gray-50"
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
          disabled={loading}
          className="w-full h-12 text-white rounded-lg text-[14px] font-extrabold transition-all hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: THEME.gradient,
            boxShadow: `0 8px 24px ${THEME.accentShadow}`,
          }}
        >
          {loading ? '로그인 중...' : '🔑 로그인'}
        </button>

        <div className="text-center mt-6 text-[11px] font-medium text-ink-muted">
          © 2026 BIKUS. All rights reserved.
        </div>
      </div>
    </div>
  )
}