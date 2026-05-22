// src/lib/auth/useLogin.ts
// 통합 로그인 훅
//
// ⭐ 핵심 로직:
//   - pending → 어디든 통과 (ConnectForm으로)
//   - middle_student → 중등 페이지만 (redirectTo로 판단!)
//   - high_student → 고등 페이지만
//   - 잘못된 페이지 → 친절한 안내
//
// ⭐ 페이지 판단:
//   redirectTo가 '/high-student/...' → 고등 페이지
//   redirectTo가 '/middle-student/...' → 중등 페이지
//
// ⭐ 변경: setAcademy 시 enabledMenus도 함께 저장!

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetAtom } from 'jotai'
import { supabase } from '../supabase'
import { tokenState, studentState, academyState } from './atoms'

type Role = 'admin' | 'teacher' | 'high_student' | 'middle_student' | 'pending'

interface UseLoginOptions {
  allowedRoles: Role[]
  redirectTo: string
  loginType: 'admin' | 'student'
  defaultGrade?: string
  roleErrorMessage: string
}

export function useLogin(options: UseLoginOptions) {
  const navigate = useNavigate()
  const setToken = useSetAtom(tokenState)
  const setStudent = useSetAtom(studentState)
  const setAcademy = useSetAtom(academyState)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ⭐ redirectTo로 페이지 종류 판단
  const isHighPage = options.redirectTo.includes('/high-student/')
  const isMiddlePage = options.redirectTo.includes('/middle-student/')

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

      // 2️⃣ profiles에서 role 확인
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

      // ⭐⭐⭐ 디버그 로그 ⭐⭐⭐
      console.log('=== 로그인 디버그 ===')
      console.log('profile.role:', JSON.stringify(profile.role))
      console.log('options.loginType:', options.loginType)
      console.log('isHighPage:', isHighPage)
      console.log('isMiddlePage:', isMiddlePage)

      // 3️⃣ role 검증
      const isStudentLogin = options.loginType === 'student'
      const role = profile.role

      if (isStudentLogin) {
        // ⭐ 학생 로그인 처리

        // pending 사용자 → 어디든 통과 (ConnectForm으로)
        if (role === 'pending') {
          console.log('✅ pending 통과')
          console.log('=====================')
          // 통과 → 아래로
        }
        // middle_student → 중등 페이지만!
        else if (role === 'middle_student') {
          if (isHighPage) {
            // ❌ 중등인데 고등 페이지 → 차단!
            console.log('❌ 중등 계정인데 고등 페이지 → 차단')
            console.log('=====================')
            setError('이 계정은 중등 학생 계정이에요.\n중등 학생 로그인을 이용해주세요.')
            await supabase.auth.signOut()
            setLoading(false)
            return
          }
          console.log('✅ 중등 통과')
          console.log('=====================')
          // 중등 페이지 → 통과
        }
        // high_student → 고등 페이지만!
        else if (role === 'high_student') {
          if (isMiddlePage) {
            // ❌ 고등인데 중등 페이지 → 차단!
            console.log('❌ 고등 계정인데 중등 페이지 → 차단')
            console.log('=====================')
            setError('이 계정은 고등 학생 계정이에요.\n고등 학생 로그인을 이용해주세요.')
            await supabase.auth.signOut()
            setLoading(false)
            return
          }
          console.log('✅ 고등 통과')
          console.log('=====================')
          // 고등 페이지 → 통과
        }
        // 그 외 (admin, teacher 등) → 학생 페이지 접근 X
        else {
          console.log('❌ 학생이 아님')
          console.log('=====================')
          setError(options.roleErrorMessage)
          await supabase.auth.signOut()
          setLoading(false)
          return
        }
      } else {
        // ⭐ 관리자 로그인 처리
        // pending → 통과 (학원 등록 폼으로)
        if (role === 'pending') {
          console.log('✅ pending 통과 (학원 등록 필요)')
          console.log('=====================')
          // 통과 → 아래로
        }
        else if (!options.allowedRoles.includes(role as Role)) {
          console.log('❌ 관리자 권한 없음')
          console.log('=====================')
          setError(options.roleErrorMessage)
          await supabase.auth.signOut()
          setLoading(false)
          return
        }
        else {
          console.log('✅ 관리자 통과')
          console.log('=====================')
        }
      }

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

      // admin은 학원 정보 필수 (단, pending은 학원 등록 폼으로 통과)
      if (options.loginType === 'admin' && !academyInfo && profile.role !== 'pending') {
        
        // ⭐ 학원이 승인 대기 상태면 별도 처리
        const isPendingReview = options.loginType === 'admin' && academyInfo?.status === 'pending_review'
        if (isPendingReview) {
          console.log('⏳ 학원 승인 대기 상태')
        }
        setError('소속된 학원 정보를 찾을 수 없습니다.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }
      // ⭐ 학원이 승인 대기 상태면 별도 처리 (대시보드 진입 막지 않고, 학원 정보는 살림)
      const isPendingReview = options.loginType === 'admin' && academyInfo?.status === 'pending_review'
      if (isPendingReview) {
        console.log('⏳ 학원 승인 대기 상태')
      }

      // 5️⃣ Jotai 상태 저장
      setToken({
        accessToken: authData.session?.access_token || '',
        expiresIn: String(
          authData.session?.expires_at || Date.now() / 1000 + 86400
        ),
      })

      if (options.loginType === 'admin') {
        if (academyInfo) {
          // 정상 원장/선생님 (학원 정보 있음)
          setAcademy({
            academyId: academyInfo.id,
            academyCode: academyInfo.academy_code || '',
            academyName: academyInfo.name,
            enabledMenus: academyInfo.enabled_menus || [],
            ownerName: profile.name || '',
            role: profile.role === 'admin' ? 'OWNER' : 'TEACHER',
            plans: ['high', 'middle'],
          })
        } else {
          // pending 원장 (학원 미등록 → 학원 등록 폼 표시됨)
          setAcademy({
            academyId: undefined,
            academyCode: undefined,
            academyName: undefined,
            enabledMenus: [],
            ownerName: profile.name || '',
            role: 'OWNER',
            plans: ['high', 'middle'],
          })
        }
      } else {
        const fallbackGrade = profile.role === 'high_student' ? '고1' : '중1'

        setStudent({
          id: authData.user.id as any,
          name: profile.name || '',
          grade: (profile.grade || options.defaultGrade || fallbackGrade) as any,
          email: profile.email || email,
          role: 'STUDENT',
        })

        if (academyInfo) {
          setAcademy({
            academyId: academyInfo.id,
            academyCode: academyInfo.academy_code || '',
            academyName: academyInfo.name,
            enabledMenus: academyInfo.enabled_menus || [],  // ⭐ 추가!
            teacherName: '',
            teacherId: undefined,
          })
        } else {
          setAcademy({
            academyId: undefined,
            academyCode: undefined,
            academyName: undefined,
            enabledMenus: [],  // ⭐ 추가!
            teacherName: undefined,
            teacherId: undefined,
          })
        }
      }

      // 6️⃣ 페이지 이동
      if (options.loginType === 'student') {
        const actualRole = profile.role

        // pending → redirectTo로 (ConnectForm)
        if (actualRole === 'pending') {
          navigate(options.redirectTo)
          return
        }

        // status가 pending이면 (학원 연결은 했는데 승인 대기)
        if (profile.status === 'pending') {
          navigate(actualRole === 'high_student'
            ? '/high-student/pending'
            : '/middle-student/pending')
        } else {
          // 정상 학생 → 본인 페이지로
          navigate(actualRole === 'high_student'
            ? '/high-student/roadmap'
            : '/middle-student/roadmap')
        }
      } else {
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