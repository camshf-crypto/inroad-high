import { atomWithStorage } from 'jotai/utils'

export interface IMasterToken {
  accessToken: string | undefined
  expiresIn: string | undefined
}

export interface IMaster {
  id: number | undefined
  name: string | undefined
  email: string | undefined
  role: 'SUPER_ADMIN' | 'STAFF'
}

const DEFAULT_MASTER: IMaster = {
  id: 1,
  name: '인로드 본사',
  email: 'master@inroad.com',
  role: 'SUPER_ADMIN',
}

export const masterTokenState = atomWithStorage<IMasterToken>('masterToken', {
  accessToken: undefined,
  expiresIn: undefined,
})

export const masterState = atomWithStorage<IMaster>('masterInfo', DEFAULT_MASTER)