import { atomWithStorage } from 'jotai/utils'

export interface IToken {
  accessToken: string | undefined
  expiresIn: string | undefined
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

export interface IAcademy {
  academyCode: string | undefined
  academyName: string | undefined
  ownerName: string | undefined
  role: 'OWNER' | 'TEACHER'
  teacherId: number | undefined
  plans: ('high' | 'middle')[]
}

const DEFAULT_ACADEMY: IAcademy = {
  academyCode: undefined,
  academyName: undefined,
  ownerName: undefined,
  role: 'OWNER',
  teacherId: undefined,
  plans: ['high', 'middle'],
}

// 캐시된 academyInfo에 plans 없으면 자동으로 기본값 병합
const savedAcademy = localStorage.getItem('academyInfo')
if (savedAcademy) {
  try {
    const parsed = JSON.parse(savedAcademy)
    if (!parsed.plans) {
      localStorage.setItem('academyInfo', JSON.stringify({ ...parsed, plans: ['high', 'middle'] }))
    }
  } catch {
    localStorage.removeItem('academyInfo')
  }
}

export const tokenState = atomWithStorage<IToken>('adminToken', {
  accessToken: undefined,
  expiresIn: undefined,
})

export const academyState = atomWithStorage<IAcademy>('academyInfo', DEFAULT_ACADEMY)

export const teachersState = atomWithStorage<ITeacher[]>('teachers', [
  { id: 1, name: '김선생', email: 'kim.teacher@example.com', phone: '010-1111-2222', role: 'TEACHER', status: '활성', assignedStudents: [1, 2, 3, 4, 5], joinDate: '2025-01-15' },
  { id: 2, name: '이선생', email: 'lee.teacher@example.com', phone: '010-3333-4444', role: 'TEACHER', status: '활성', assignedStudents: [6, 7, 8, 9, 10], joinDate: '2025-02-01' },
  { id: 3, name: '박선생', email: 'park.teacher@example.com', phone: '010-5555-6666', role: 'TEACHER', status: '초대중', assignedStudents: [], joinDate: '2025-03-10' },
])