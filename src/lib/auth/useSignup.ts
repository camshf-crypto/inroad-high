// src/lib/auth/useSignup.ts
// 통합 회원가입 훅 - 고등/중등 학생 모두 사용 (Supabase 연동)

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

type Level = 'high' | 'middle'

interface UseSignupOptions {
  /**
   * 학생 레벨 ('high' | 'middle')
   * → profiles.role = 'high_student' 또는 'middle_student'
   */
  level: Level

  /**
   * 가입 성공 후 이동할 경로
   * 예: '/high-student/login', '/middle-student/login'
   */
  redirectTo: string
}

export function useSignup(options: UseSignupOptions) {
  const navigate = useNavigate()

  // 스텝
  const [step, setStep] = useState<1 | 2>(1)

  // 약관
  const [agreeAll, setAgreeAll] = useState(false)
  const [agreeService, setAgreeService] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)

  // 기본 정보
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPwC, setShowPwC] = useState(false)

  // 핸드폰 인증
  const [phoneCodeSent, setPhoneCodeSent] = useState(false)
  const [phoneCode, setPhoneCode] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [phoneCodeError, setPhoneCodeError] = useState('')
  const [timer, setTimer] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 공통 상태
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ── 유틸 ──
  const formatPhone = (val: string) => {
    const num = val.replace(/\D/g, '')
    if (num.length <= 3) return num
    if (num.length <= 7) return `${num.slice(0, 3)}-${num.slice(3)}`
    return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ── 약관 ──
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

  // ── 핸들러 ──
  const handleStep1Next = () => {
    setError('')
    if (!agreeService) return setError('필수 약관에 동의해주세요.')
    if (!agreePrivacy) return setError('개인정보 수집 및 이용에 동의해주세요.')
    setStep(2)
  }

  // 인증번호 발송 (더미)
  const handleSendPhoneCode = () => {
    setError('')
    setPhoneCodeError('')
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('올바른 전화번호를 입력해주세요.')
      return
    }

    setPhoneCodeSent(true)
    setPhoneVerified(false)
    setPhoneCode('')
    setTimer(180)

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  // 인증번호 확인 (더미: 123456)
  const handleVerifyPhoneCode = () => {
    setPhoneCodeError('')
    if (!phoneCode) {
      setPhoneCodeError('인증번호를 입력해주세요.')
      return
    }
    if (timer === 0) {
      setPhoneCodeError('인증 시간이 만료됐어요. 다시 발송해주세요.')
      return
    }
    if (phoneCode === '123456') {
      setPhoneVerified(true)
      setPhoneCodeError('')
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      setPhoneCodeError('인증번호가 맞지 않아요.')
    }
  }

  // 전화번호 변경 시 인증 초기화
  const handlePhoneChange = (val: string) => {
    setPhone(formatPhone(val))
    setError('')
    if (phoneVerified) {
      setPhoneVerified(false)
      setPhoneCodeSent(false)
      setPhoneCode('')
    }
  }

  // ── 가입 처리 (Supabase 연동) ──
  const handleSignup = async () => {
    setError('')

    // 1. 입력값 검증
    if (!name.trim()) return setError('이름을 입력해주세요.')
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) return setError('올바른 전화번호를 입력해주세요.')
    if (!phoneVerified) return setError('전화번호 인증을 완료해주세요.')
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('올바른 이메일을 입력해주세요.')
    if (password.length < 6) return setError('비밀번호는 6자리 이상이어야 해요.')
    if (password !== passwordConfirm) return setError('비밀번호가 일치하지 않아요.')

    setLoading(true)

    try {
      // 2. Supabase Auth 가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
          setError('이미 가입된 이메일이에요. 로그인해주세요.')
        } else if (authError.message.includes('Password')) {
          setError('비밀번호가 너무 약해요. 더 복잡하게 입력해주세요.')
        } else {
          setError('가입에 실패했어요: ' + authError.message)
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('계정 생성에 실패했어요.')
        setLoading(false)
        return
      }

      // 3. profiles 테이블에 정보 저장
      // role은 level에 따라 결정
      const role = options.level === 'high' ? 'high_student' : 'middle_student'

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email,
          name: name.trim(),
          phone: phone,
          role: role,
          status: 'active', // 학원 연결 전엔 active (학원 연결하면 pending으로 바뀜)
        })

      if (profileError) {
        // profiles 저장 실패 시 — auth 계정은 만들어졌지만 프로필이 없음
        console.error('[Signup] profile save failed:', profileError)
        setError('프로필 저장에 실패했어요: ' + profileError.message)
        setLoading(false)
        return
      }

      // 4. 가입 완료 — 로그인 페이지로 이동
      // (자동 로그인된 상태라면 일단 로그아웃 후 로그인 페이지로)
      await supabase.auth.signOut()

      alert('가입이 완료됐어요! 로그인해주세요.')
      navigate(options.redirectTo)
    } catch (err: any) {
      console.error('[Signup] error:', err)
      setError('가입 중 오류가 발생했어요: ' + (err.message || '알 수 없는 오류'))
      setLoading(false)
    }
  }

  return {
    // 스텝
    step,
    setStep,

    // 약관
    agreeAll,
    agreeService,
    setAgreeService,
    agreePrivacy,
    setAgreePrivacy,
    agreeMarketing,
    setAgreeMarketing,
    handleAgreeAll,
    syncAllCheck,

    // 기본 정보
    name,
    setName,
    phone,
    handlePhoneChange,
    email,
    setEmail,
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    showPw,
    setShowPw,
    showPwC,
    setShowPwC,

    // 핸드폰 인증
    phoneCodeSent,
    phoneCode,
    setPhoneCode,
    phoneVerified,
    phoneCodeError,
    setPhoneCodeError,
    timer,
    formatTimer,
    handleSendPhoneCode,
    handleVerifyPhoneCode,

    // 공통
    error,
    setError,
    loading,

    // 핸들러
    handleStep1Next,
    handleSignup,

    // 옵션
    level: options.level,
  }
}