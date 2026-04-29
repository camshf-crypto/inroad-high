// src/lib/auth/useLogin.ts
// 통합 로그인 훅 - 선생님/고등학생/중학생 모두 사용

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetAtom } from 'jotai'
import { supabase } from '../supabase'
import { tokenState, studentState, academyState } from './atoms'

type Role = 'admin' | 'teacher' | 'high_student' | 'middle_student'

interface UseLoginOptions {
  /**
   * 허용되는 role 배열
   * admin/teacher 페이지: ['admin', 'teacher']
   * 고등학생 페이지: ['high_student']
   * 중학생 페이지: ['middle_student']
   */
  allowedRoles: Role[]

  /**
   * 로그인 성공 후 이동할 경로
   * 예: '/admin', '/high-student/roadmap', '/middle-student/roadmap'
   */
  redirectTo: string

  /**
   * 로그인 타입 (state 저장 방식 다름)
   * 'admin': academyState만
   * 'student': studentState + academyState
   */
  loginType: 'admin' | 'student'

  /**
   * 학생일 때 기본 학년 (profile.grade 없을 때 fallback)
   * 고등학생: '고1', 중학생: '중1'
   */
  defaultGrade?: string

  /**
   * role이 안 맞을 때 표시할 에러 메시지
   * 예: '학원 관리자 계정만 접근 가능합니다.'
   */
  roleErrorMessage: string
}

export function useLogin(options: UseLoginOptions) {
  const navigate = useNavigate()
  const setToken = useSetAtom(tokenState)
  const setStudent = useSetAtom(studentState)
  const setAcademy = useSetAtom(academyState)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (email: string, password: string) => {
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

      // 2️⃣ profiles 테이블에서 role 확인 (status 포함)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, name, academy_id, grade, school, email, status')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) {
        setError('프로필 정보를 불러올 수 없습니다.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // 3️⃣ role 검증
      if (!options.allowedRoles.includes(profile.role as Role)) {
        setError(options.roleErrorMessage)
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // 3️⃣-1. 학생 status 체크 — rejected는 차단하지 않고 통과시킴
      // (rejected라도 로그인 후 재신청 가능하게)

      // 4️⃣ 학원 정보 가져오기
      let academyInfo: any = null
      if (profile.academy_id) {
        const { data: academy } = await supabase
          .from('academies')
          .select('*')
          .eq('id', profile.academy_id)
          .single()

        academyInfo = academy
      }

      // admin은 학원 정보 필수
      if (options.loginType === 'admin' && !academyInfo) {
        setError('소속된 학원 정보를 찾을 수 없습니다.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // 5️⃣ Jotai 상태 저장
      setToken({
        accessToken: authData.session?.access_token || '',
        expiresIn: String(
          authData.session?.expires_at || Date.now() / 1000 + 86400
        ),
      })

      if (options.loginType === 'admin') {
        // 선생님/원장
        setAcademy({
          academyId: academyInfo!.id,
          academyCode: academyInfo!.academy_code || '',
          academyName: academyInfo!.name,
          ownerName: profile.name || '',
          role: profile.role === 'admin' ? 'OWNER' : 'TEACHER',
          plans: ['high', 'middle'],
        })
      } else {
        // 학생 (고등/중등)
        setStudent({
          id: authData.user.id as any,
          name: profile.name || '',
          grade: (profile.grade || options.defaultGrade || '고1') as any,
          email: profile.email || email,
          role: 'STUDENT',
        })

        if (academyInfo) {
          setAcademy({
            academyId: academyInfo.id,
            academyCode: academyInfo.academy_code || '',
            academyName: academyInfo.name,
            teacherName: '',
            teacherId: undefined,
          })
        } else {
          // 학원 정보 없으면 명시적으로 비우기 (이전 세션 잔여 데이터 방지)
          setAcademy({
            academyId: undefined,
            academyCode: undefined,
            academyName: undefined,
            teacherName: undefined,
            teacherId: undefined,
          })
        }
      }

      // 6️⃣ 페이지 이동
      // 학생이 pending 상태면 승인 대기 페이지로
      if (options.loginType === 'student' && profile.status === 'pending') {
        const isHigh = options.allowedRoles.includes('high_student' as Role)
        navigate(isHigh ? '/high-student/pending' : '/middle-student/pending')
      } else {
        // 그 외 (active, rejected) 모두 로드맵으로
        // → Layout에서 academy_id 없으면 자동으로 학원 연결 폼 표시함
        navigate(options.redirectTo)
      }

    } catch (err) {
      console.error('로그인 에러:', err)
      setError('로그인 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return {
    handleLogin,
    loading,
    error,
    setError,
  }
}

/**
 * 비밀번호 재설정 훅 (학생 로그인에서 사용)
 */
export function usePasswordReset(redirectPath: string) {
  const [findResult, setFindResult] = useState('')
  const [findLoading, setFindLoading] = useState(false)

  const handleFindPw = async (email: string) => {
    if (!email.trim()) {
      setFindResult('error:이메일을 입력해주세요.')
      return
    }
    setFindLoading(true)
    setFindResult('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + redirectPath,
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

  return {
    handleFindPw,
    findResult,
    findLoading,
    setFindResult,
  }
}