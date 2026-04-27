import { atomWithStorage } from 'jotai/utils'

export interface IToken {
  accessToken: string | undefined
  expiresIn: string | undefined
}

export interface IStudent {
  id: number
  name: string
  email: string
  grade: '고1' | '고2' | '고3'
  role: 'STUDENT'
}

export interface IAcademy {
  academyId: string | undefined        // ← 추가
  academyCode: string | undefined
  academyName: string | undefined
  teacherName: string | undefined
  teacherId: number | undefined
}

export const tokenState = atomWithStorage<IToken>('studentToken', {
  accessToken: undefined,
  expiresIn: undefined,
})

export const studentState = atomWithStorage<IStudent | null>('studentInfo', null)

export const academyState = atomWithStorage<IAcademy>('studentAcademyInfo', {
  academyId: undefined,                // ← 추가
  academyCode: undefined,
  academyName: undefined,
  teacherName: undefined,
  teacherId: undefined,
})