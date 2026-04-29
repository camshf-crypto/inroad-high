// src/lib/auth/atoms.ts
// 공통 인증 atom - admin/고등학생/중학생 모두 사용
//
// 마이그레이션 전략:
// - 기존 localStorage key: 'adminToken', 'studentToken', 'middleStudentToken'
// - 통합 후: 'authToken' (한 번에 하나의 사용자만 로그인)
// - 학원 정보, 학생 정보도 마찬가지로 통일
//
// IAcademy의 필드는 admin/student 양쪽 필드를 모두 optional로 포함

import { atomWithStorage } from 'jotai/utils'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface IToken {
  accessToken: string | undefined
  expiresIn: string | undefined
}

export interface IStudent {
  id: number | string
  name: string
  email: string
  grade: '고1' | '고2' | '고3' | '중1' | '중2' | '중3'
  role: 'STUDENT'
}

export interface ITeacher {
  id: number
  name: string
  email: string
  phone: string
  role: 'OWNER' | 'TEACHER'
  status: '활성' | '초대중'
  assignedStudents: number[]
  joinDate: string
}

/**
 * 통합 IAcademy
 * - 공통 필드: academyId, academyCode, academyName
 * - admin 전용: ownerName, role, plans
 * - student 전용: teacherName, teacherId
 *
 * 사용 시 자기 역할에 맞는 필드만 사용. 다른 필드는 undefined.
 */
export interface IAcademy {
  // 공통
  academyId: string | undefined
  academyCode: string | undefined
  academyName: string | undefined

  // admin 전용 (학생일 땐 undefined)
  ownerName?: string
  role?: 'OWNER' | 'TEACHER'
  plans?: ('high' | 'middle')[]

  // student 전용 (admin일 땐 undefined)
  teacherName?: string
  teacherId?: number | undefined
}

// ─────────────────────────────────────────────
// 마이그레이션: 기존 localStorage 정리
// ─────────────────────────────────────────────

if (typeof window !== 'undefined') {
  // 기존 key들이 있으면 통합 key로 옮기기
  // (한 번만 실행되도록 플래그 체크)
  const migrated = localStorage.getItem('_authMigrated_v1')
  if (!migrated) {
    try {
      // 기존 admin 토큰
      const adminToken = localStorage.getItem('adminToken')
      const academyInfo = localStorage.getItem('academyInfo')
      
      // 기존 학생 토큰
      const studentToken = localStorage.getItem('studentToken')
      const studentInfo = localStorage.getItem('studentInfo')
      const studentAcademyInfo = localStorage.getItem('studentAcademyInfo')
      
      // 기존 중학생 토큰
      const middleToken = localStorage.getItem('middleStudentToken')
      const middleStudentInfo = localStorage.getItem('middleStudentInfo')
      const middleAcademyInfo = localStorage.getItem('middleStudentAcademyInfo')

      // 우선순위: admin > 고등 > 중등 (둘 이상 있을 시 admin 우선)
      if (adminToken) {
        localStorage.setItem('authToken', adminToken)
        if (academyInfo) localStorage.setItem('authAcademy', academyInfo)
      } else if (studentToken) {
        localStorage.setItem('authToken', studentToken)
        if (studentInfo) localStorage.setItem('authStudent', studentInfo)
        if (studentAcademyInfo) localStorage.setItem('authAcademy', studentAcademyInfo)
      } else if (middleToken) {
        localStorage.setItem('authToken', middleToken)
        if (middleStudentInfo) localStorage.setItem('authStudent', middleStudentInfo)
        if (middleAcademyInfo) localStorage.setItem('authAcademy', middleAcademyInfo)
      }

      // 기존 키 정리
      localStorage.removeItem('adminToken')
      localStorage.removeItem('academyInfo')
      localStorage.removeItem('studentToken')
      localStorage.removeItem('studentInfo')
      localStorage.removeItem('studentAcademyInfo')
      localStorage.removeItem('middleStudentToken')
      localStorage.removeItem('middleStudentInfo')
      localStorage.removeItem('middleStudentAcademyInfo')

      localStorage.setItem('_authMigrated_v1', 'true')
    } catch (err) {
      console.error('[auth migration] failed:', err)
    }
  }
}

// ─────────────────────────────────────────────
// Atom 정의 (통합 - 모든 곳에서 같은 atom 사용)
// ─────────────────────────────────────────────

export const tokenState = atomWithStorage<IToken>('authToken', {
  accessToken: undefined,
  expiresIn: undefined,
})

export const studentState = atomWithStorage<IStudent | null>('authStudent', null)

export const academyState = atomWithStorage<IAcademy>('authAcademy', {
  academyId: undefined,
  academyCode: undefined,
  academyName: undefined,
})

// admin에서만 사용 (선생님 목록)
export const teachersState = atomWithStorage<ITeacher[]>('teachers', [
  { id: 1, name: '김선생', email: 'kim.teacher@example.com', phone: '010-1111-2222', role: 'TEACHER', status: '활성', assignedStudents: [1, 2, 3, 4, 5], joinDate: '2025-01-15' },
  { id: 2, name: '이선생', email: 'lee.teacher@example.com', phone: '010-3333-4444', role: 'TEACHER', status: '활성', assignedStudents: [6, 7, 8, 9, 10], joinDate: '2025-02-01' },
  { id: 3, name: '박선생', email: 'park.teacher@example.com', phone: '010-5555-6666', role: 'TEACHER', status: '초대중', assignedStudents: [], joinDate: '2025-03-10' },
])