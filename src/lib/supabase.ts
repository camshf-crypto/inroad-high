import { createClient } from '@supabase/supabase-js'

// 환경변수에서 URL과 Key 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 타입 정의: 사용자 역할
export type UserRole = 
  | 'master_super'
  | 'master_operator'
  | 'master_sales'
  | 'master_cs'
  | 'master_finance'
  | 'master_analyst'
  | 'admin'
  | 'teacher'
  | 'high_student'
  | 'middle_student'

// 타입 정의: 프로필
export interface Profile {
  id: string
  email: string
  role: UserRole
  academy_id: string | null
  name: string | null
  phone: string | null
  grade: string | null
  school: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}