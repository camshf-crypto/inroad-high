import { atomWithStorage } from 'jotai/utils'

export interface IToken {
  accessToken: string | undefined
  expiresIn: string | undefined
}

export interface IStudent {
  id: number
  name: string
  email: string
  grade: '중1' | '중2' | '중3'
  role: 'STUDENT'
}

export interface IAcademy {
  academyCode: string | undefined
  academyName: string | undefined
  teacherName: string | undefined
  teacherId: number | undefined
}

export const tokenState = atomWithStorage<IToken>('middleStudentToken', {
  accessToken: undefined,
  expiresIn: undefined,
})

export const studentState = atomWithStorage<IStudent | null>('middleStudentInfo', null)

export const academyState = atomWithStorage<IAcademy>('middleStudentAcademyInfo', {
  academyCode: undefined,
  academyName: undefined,
  teacherName: undefined,
  teacherId: undefined,
})