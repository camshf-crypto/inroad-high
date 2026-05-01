import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

const PLAN_FEES: Record<string, number> = {
  '고등': 500000,
  '중등': 400000,
  '고등+중등': 800000,
}

// Mock 학원 데이터
const INIT_DETAILS: Record<string, any> = {
  '1': {
    id: 1,
    name: '강남 에스엠 학원',
    code: 'B-KEARS-SM01-0001',
    region: '서울 강남',
    address: '서울특별시 강남구 테헤란로 123',
    phone: '02-1234-5678',
    plan: '고등+중등',
    status: 'active',
    joined: '2025.04.14',
    monthlyFee: 870000,
    unpaidMonths: 0,
    studentCount: 87,
    teacherCount: 8,
    avgProgress: 72,
    suspendReason: '',
    codeHistory: [
      { date: '2025.04.14', code: 'B-KEARS-SM01-0001', reason: '최초 발급' },
    ],
    owner: { name: '강원장', email: 'sm@academy.com', phone: '010-1111-2222', role: 'OWNER', joinDate: '2025.04.14', lastLogin: '2025.04.18 14:30' },
    monthlyStudents: [
      { month: '2024.05', count: 18, new: 5, churn: 1 },
      { month: '2024.06', count: 24, new: 8, churn: 2 },
      { month: '2024.07', count: 31, new: 10, churn: 3 },
      { month: '2024.08', count: 42, new: 14, churn: 3 },
      { month: '2024.09', count: 53, new: 15, churn: 4 },
      { month: '2024.10', count: 61, new: 12, churn: 4 },
      { month: '2024.11', count: 68, new: 11, churn: 4 },
      { month: '2024.12', count: 72, new: 7, churn: 3 },
      { month: '2025.01', count: 76, new: 8, churn: 4 },
      { month: '2025.02', count: 80, new: 7, churn: 3 },
      { month: '2025.03', count: 84, new: 6, churn: 2 },
      { month: '2025.04', count: 87, new: 5, churn: 2 },
    ],
    teachers: [
      { id: 1, name: '김선생', email: 'kim@sm.com', phone: '010-1001-2001', status: '활성', assignedStudents: 12, joinDate: '2025.04.15' },
      { id: 2, name: '이선생', email: 'lee@sm.com', phone: '010-1002-2002', status: '활성', assignedStudents: 15, joinDate: '2025.04.16' },
      { id: 3, name: '박선생', email: 'park@sm.com', phone: '010-1003-2003', status: '활성', assignedStudents: 10, joinDate: '2025.04.17' },
      { id: 4, name: '최선생', email: 'choi@sm.com', phone: '010-1004-2004', status: '활성', assignedStudents: 11, joinDate: '2025.04.18' },
      { id: 5, name: '정선생', email: 'jung@sm.com', phone: '010-1005-2005', status: '활성', assignedStudents: 14, joinDate: '2025.04.20' },
      { id: 6, name: '한선생', email: 'han@sm.com', phone: '010-1006-2006', status: '활성', assignedStudents: 9, joinDate: '2025.04.22' },
      { id: 7, name: '서선생', email: 'seo@sm.com', phone: '010-1007-2007', status: '초대중', assignedStudents: 0, joinDate: '2025.04.28' },
      { id: 8, name: '윤선생', email: 'yoon@sm.com', phone: '010-1008-2008', status: '활성', assignedStudents: 16, joinDate: '2025.04.30' },
    ],
    students: [
      { id: 101, name: '김민준', grade: '고2', progress: 75, teacher: '김선생', joinDate: '2025.04.20', status: '활동중' },
      { id: 102, name: '이수현', grade: '고3', progress: 90, teacher: '이선생', joinDate: '2025.04.21', status: '활동중' },
      { id: 103, name: '박지호', grade: '고1', progress: 45, teacher: '박선생', joinDate: '2025.04.22', status: '활동중' },
      { id: 104, name: '최유진', grade: '중2', progress: 60, teacher: '최선생', joinDate: '2025.04.23', status: '활동중' },
      { id: 105, name: '정다은', grade: '고3', progress: 85, teacher: '정선생', joinDate: '2025.04.24', status: '활동중' },
      { id: 106, name: '강민서', grade: '중3', progress: 70, teacher: '한선생', joinDate: '2025.04.25', status: '활동중' },
      { id: 107, name: '윤서준', grade: '고2', progress: 55, teacher: '윤선생', joinDate: '2025.04.26', status: '휴면' },
      { id: 108, name: '임지수', grade: '중1', progress: 30, teacher: '김선생', joinDate: '2025.04.27', status: '활동중' },
    ],
    payments: [
      { id: 1, date: '2025.04.14', amount: 870000, method: '카드', status: '완료', period: '2025년 4월' },
      { id: 2, date: '2025.03.14', amount: 870000, method: '계좌이체', status: '완료', period: '2025년 3월' },
      { id: 3, date: '2025.02.14', amount: 870000, method: '카드', status: '완료', period: '2025년 2월' },
    ],
    activity: [
      { date: '2025.04.18 14:30', event: '원장 로그인', detail: '강원장님이 로그인했습니다.' },
      { date: '2025.04.18 10:15', event: '학생 추가', detail: '신규 학생 3명이 가입했습니다.' },
      { date: '2025.04.17 16:20', event: '피드백 작성', detail: '김선생님이 피드백 12건을 작성했습니다.' },
      { date: '2025.04.17 09:00', event: '결제 완료', detail: '2025년 4월 월 구독료가 결제되었습니다.' },
      { date: '2025.04.16 13:45', event: '선생님 추가', detail: '윤선생님이 초대를 수락했습니다.' },
    ],
    notices: [],
  },
}

const getDefaultAcademy = (id: string) => ({
  id: Number(id),
  name: `학원 #${id}`,
  code: `B-KEARS-XXXX-${id.padStart(4, '0')}`,
  region: '서울',
  address: '주소 정보 없음',
  phone: '-',
  plan: '고등',
  status: 'active',
  joined: '2025.04.01',
  monthlyFee: 500000,
  unpaidMonths: 0,
  studentCount: 0,
  teacherCount: 0,
  avgProgress: 0,
  suspendReason: '',
  codeHistory: [],
  owner: { name: '원장', email: '-', phone: '-', role: 'OWNER', joinDate: '-', lastLogin: '-' },
  monthlyStudents: [],
  teachers: [],
  students: [],
  payments: [],
  activity: [],
  notices: [],
})

const STATUS_STYLE: Record<string, any> = {
  active: { color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', label: '✓ 활성' },
  trial: { color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD', label: '🎁 체험중' },
  unpaid: { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', label: '⚠️ 미납' },
  suspended: { color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB', label: '🚫 정지' },
}

// 코드 재발급 함수
const generateNewCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const nums = '0123456789'
  let code = 'B-KEARS-'
  for (let i = 0; i < 2; i++) code += chars[Math.floor(Math.random() * chars.length)]
  for (let i = 0; i < 2; i++) code += nums[Math.floor(Math.random() * nums.length)]
  code += '-'
  for (let i = 0; i < 4; i++) code += nums[Math.floor(Math.random() * nums.length)]
  return code
}

// 🔐 임시 비밀번호 자동 생성
const generateNewPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const nums = '23456789'
  const special = '@#$!'
  let pw = 'B-KEARS'
  pw += upper[Math.floor(Math.random() * upper.length)]
  pw += lower[Math.floor(Math.random() * lower.length)]
  for (let i = 0; i < 4; i++) pw += nums[Math.floor(Math.random() * nums.length)]
  pw += special[Math.floor(Math.random() * special.length)]
  return pw
}

export default function MasterAcademyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'growth' | 'teachers' | 'students' | 'payments' | 'activity'>('overview')

  const [academy, setAcademy] = useState<any>(() => {
    const saved = localStorage.getItem(`master_academy_${id}`)
    if (saved) return JSON.parse(saved)
    return INIT_DETAILS[id || '1'] || getDefaultAcademy(id || '1')
  })

  // ============ 모달 상태 ============
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showNoticeModal, setShowNoticeModal] = useState(false)
  // 🔐 비밀번호 재설정 모달
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<'owner' | 'teacher' | 'student'>('owner')
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [verifyEmail, setVerifyEmail] = useState('')
  const [verifyPhone, setVerifyPhone] = useState('')
  const [newPasswordResult, setNewPasswordResult] = useState<any>(null)

  // ============ 폼 상태 ============
  const [editForm, setEditForm] = useState({
    name: academy.name,
    region: academy.region,
    address: academy.address,
    phone: academy.phone,
    ownerName: academy.owner.name,
    ownerEmail: academy.owner.email,
    ownerPhone: academy.owner.phone,
  })
  const [codeReason, setCodeReason] = useState('')
  const [newPlan, setNewPlan] = useState(academy.plan)
  const [suspendReason, setSuspendReason] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', urgent: false })

  const st = STATUS_STYLE[academy.status] || STATUS_STYLE.active

  const saveAcademy = (updated: any) => {
    localStorage.setItem(`master_academy_${id}`, JSON.stringify(updated))
    setAcademy(updated)
    const listSaved = localStorage.getItem('master_academies')
    if (listSaved) {
      const list = JSON.parse(listSaved)
      const newList = list.map((a: any) => a.id === updated.id ? { ...a, ...updated, owner: updated.owner.name } : a)
      localStorage.setItem('master_academies', JSON.stringify(newList))
    }
  }

  // ============ 1. 학원 수정 ============
  const openEditModal = () => {
    setEditForm({
      name: academy.name,
      region: academy.region,
      address: academy.address,
      phone: academy.phone,
      ownerName: academy.owner.name,
      ownerEmail: academy.owner.email,
      ownerPhone: academy.owner.phone,
    })
    setShowEditModal(true)
  }
  const handleEditSubmit = () => {
    if (!editForm.name.trim() || !editForm.ownerName.trim()) {
      alert('학원명과 원장명은 필수예요!')
      return
    }
    const updated = {
      ...academy,
      name: editForm.name,
      region: editForm.region,
      address: editForm.address,
      phone: editForm.phone,
      owner: {
        ...academy.owner,
        name: editForm.ownerName,
        email: editForm.ownerEmail,
        phone: editForm.ownerPhone,
      },
      activity: [
        { date: new Date().toLocaleString('ko-KR'), event: '학원 정보 수정', detail: '본사에서 학원 정보를 수정했습니다.' },
        ...academy.activity,
      ],
    }
    saveAcademy(updated)
    setShowEditModal(false)
    alert('✅ 학원 정보가 수정되었어요!')
  }

  // ============ 2. 코드 재발급 ============
  const handleCodeReissue = () => {
    if (!codeReason.trim()) {
      alert('재발급 사유를 입력해주세요!')
      return
    }
    const newCode = generateNewCode()
    const updated = {
      ...academy,
      code: newCode,
      codeHistory: [
        { date: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').slice(0, -1), code: newCode, reason: codeReason },
        ...(academy.codeHistory || []),
      ],
      activity: [
        { date: new Date().toLocaleString('ko-KR'), event: '코드 재발급', detail: `새 코드 ${newCode} 발급 (사유: ${codeReason})` },
        ...academy.activity,
      ],
    }
    saveAcademy(updated)
    setShowCodeModal(false)
    setCodeReason('')
    alert(`✅ 새 학원 코드가 발급됐어요!\n${newCode}\n\n학원에 안내 메일이 자동 발송됩니다.`)
  }

  // ============ 3. 플랜 변경 ============
  const handlePlanChange = () => {
    if (newPlan === academy.plan) {
      alert('현재 플랜과 동일해요!')
      return
    }
    const newFee = PLAN_FEES[newPlan]
    const updated = {
      ...academy,
      plan: newPlan,
      monthlyFee: academy.status === 'trial' ? 0 : newFee,
      activity: [
        { date: new Date().toLocaleString('ko-KR'), event: '플랜 변경', detail: `${academy.plan} → ${newPlan}으로 변경됐어요.` },
        ...academy.activity,
      ],
    }
    saveAcademy(updated)
    setShowPlanModal(false)
    alert(`✅ 플랜이 변경됐어요!\n${academy.plan} → ${newPlan}\n월 구독료: ₩${newFee.toLocaleString()}`)
  }

  // ============ 4. 계정 정지/활성화 ============
  const handleSuspend = () => {
    const isActive = academy.status === 'active' || academy.status === 'trial'
    if (isActive && !suspendReason.trim()) {
      alert('정지 사유를 입력해주세요!')
      return
    }
    const updated = {
      ...academy,
      status: isActive ? 'suspended' : 'active',
      suspendReason: isActive ? suspendReason : '',
      activity: [
        {
          date: new Date().toLocaleString('ko-KR'),
          event: isActive ? '계정 정지' : '계정 활성화',
          detail: isActive ? `사유: ${suspendReason}` : '학원 서비스 이용이 재개됐어요.',
        },
        ...academy.activity,
      ],
    }
    saveAcademy(updated)
    setShowSuspendModal(false)
    setSuspendReason('')
    alert(isActive ? '🚫 학원이 정지됐어요.' : '✅ 학원이 다시 활성화됐어요!')
  }

  // ============ 5. 학원 삭제 ============
  const handleDelete = () => {
    if (deleteConfirmText !== academy.name) {
      alert('학원명이 일치하지 않아요!')
      return
    }
    const listSaved = localStorage.getItem('master_academies')
    if (listSaved) {
      const list = JSON.parse(listSaved)
      const newList = list.filter((a: any) => a.id !== academy.id)
      localStorage.setItem('master_academies', JSON.stringify(newList))
    }
    localStorage.removeItem(`master_academy_${id}`)
    alert(`🗑️ ${academy.name}이(가) 삭제되었어요.`)
    navigate('/master/academies')
  }

  // ============ 6. 공지사항 발송 ============
  const handleSendNotice = () => {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      alert('제목과 내용을 입력해주세요!')
      return
    }
    const notice = {
      id: Date.now(),
      title: noticeForm.title,
      content: noticeForm.content,
      urgent: noticeForm.urgent,
      sentAt: new Date().toLocaleString('ko-KR'),
    }
    const updated = {
      ...academy,
      notices: [notice, ...(academy.notices || [])],
      activity: [
        {
          date: new Date().toLocaleString('ko-KR'),
          event: '공지사항 발송',
          detail: `${noticeForm.urgent ? '🚨 긴급 공지: ' : ''}${noticeForm.title}`,
        },
        ...academy.activity,
      ],
    }
    saveAcademy(updated)
    setShowNoticeModal(false)
    setNoticeForm({ title: '', content: '', urgent: false })
    alert(`📢 공지사항이 발송되었어요!\n\n"${noticeForm.title}"\n\n학원 원장님이 알림을 받습니다.`)
  }

  // ============ 7. 🔐 비밀번호 재설정 ============
  const openPasswordModal = () => {
    setPasswordTarget('owner')
    setSelectedTeacherId(null)
    setSelectedStudentId(null)
    setVerifyEmail('')
    setVerifyPhone('')
    setNewPasswordResult(null)
    setShowPasswordModal(true)
  }

  const handlePasswordReset = () => {
    let targetName = ''
    let targetEmail = ''

    if (passwordTarget === 'owner') {
      targetName = academy.owner.name
      targetEmail = academy.owner.email

      if (verifyEmail !== academy.owner.email) {
        alert('❌ 이메일이 일치하지 않아요!\n본인 확인에 실패했습니다.')
        return
      }
      if (verifyPhone && verifyPhone !== academy.owner.phone) {
        alert('❌ 전화번호가 일치하지 않아요!')
        return
      }
    } else if (passwordTarget === 'teacher') {
      if (!selectedTeacherId) {
        alert('선생님을 선택해주세요!')
        return
      }
      const teacher = academy.teachers.find((t: any) => t.id === selectedTeacherId)
      if (!teacher) return
      targetName = teacher.name
      targetEmail = teacher.email
    } else if (passwordTarget === 'student') {
      if (!selectedStudentId) {
        alert('학생을 선택해주세요!')
        return
      }
      const student = academy.students.find((s: any) => s.id === selectedStudentId)
      if (!student) return
      targetName = student.name
      targetEmail = `student_${student.id}@${academy.code.toLowerCase()}.com`
    }

    const newPassword = generateNewPassword()

    const updated = {
      ...academy,
      activity: [
        {
          date: new Date().toLocaleString('ko-KR'),
          event: '비밀번호 재설정',
          detail: `${passwordTarget === 'owner' ? '원장' : passwordTarget === 'teacher' ? '선생님' : '학생'} ${targetName}(${targetEmail})의 비밀번호가 재설정됐어요.`,
        },
        ...academy.activity,
      ],
    }
    saveAcademy(updated)

    setNewPasswordResult({
      target: passwordTarget,
      name: targetName,
      email: targetEmail,
      password: newPassword,
    })
  }

  const closePasswordModal = () => {
    setShowPasswordModal(false)
    setNewPasswordResult(null)
    setVerifyEmail('')
    setVerifyPhone('')
    setSelectedTeacherId(null)
    setSelectedStudentId(null)
  }

  // 성장률 계산
  const monthlyData = academy.monthlyStudents || []
  const firstMonth = monthlyData[0]?.count || 0
  const lastMonth = monthlyData[monthlyData.length - 1]?.count || 0
  const prevMonth = monthlyData[monthlyData.length - 2]?.count || 0
  const totalGrowth = firstMonth > 0 ? Math.round(((lastMonth - firstMonth) / firstMonth) * 100) : 0
  const monthGrowth = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : 0
  const avgMonthlyGrowth = monthlyData.length > 1
    ? Math.round(((lastMonth / firstMonth) ** (1 / (monthlyData.length - 1)) - 1) * 100)
    : 0
  const totalNew = monthlyData.reduce((s: number, m: any) => s + m.new, 0)
  const totalChurn = monthlyData.reduce((s: number, m: any) => s + m.churn, 0)
  const churnRate = totalNew > 0 ? Math.round((totalChurn / totalNew) * 100) : 0

  return (
    <div className="px-8 py-7 min-h-full">

      <button
        onClick={() => navigate('/master/academies')}
        className="text-[12px] font-bold text-ink-secondary hover:text-ink mb-4 flex items-center gap-1 transition-colors"
      >
        ← 학원 목록으로
      </button>

      {academy.status === 'suspended' && (
        <div className="bg-red-50 border border-red-300 rounded-xl px-5 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚫</span>
            <div>
              <div className="text-[13px] font-extrabold text-red-800">계정 정지 상태</div>
              <div className="text-[11px] font-medium text-red-700 mt-0.5">
                사유: {academy.suspendReason || '사유 없음'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSuspendModal(true)}
            className="h-9 px-4 bg-red-500 text-white rounded-lg text-[12px] font-bold hover:bg-red-600 transition-colors"
          >
            🔓 활성화
          </button>
        </div>
      )}

      {/* 헤더 */}
      <div
        className="rounded-2xl px-6 py-5 mb-5 relative overflow-hidden"
        style={{ background: THEME.gradient, boxShadow: `0 12px 32px ${THEME.accentShadow}` }}
      >
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)' }}
        />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-extrabold text-white border border-white/30">
              {academy.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <div className="text-[22px] font-extrabold text-white tracking-tight">{academy.name}</div>
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}
                >
                  {st.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[12px] font-medium text-white/80 flex-wrap">
                <span>🔑 {academy.code}</span>
                <span>·</span>
                <span>📍 {academy.region}</span>
                <span>·</span>
                <span>📅 가입 {academy.joined}</span>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={openEditModal}
              className="h-9 px-3 bg-white/20 backdrop-blur-md text-white rounded-lg text-[11px] font-bold border border-white/30 transition-all hover:bg-white/30"
            >
              ✏️ 수정
            </button>
            <button
              onClick={() => setShowCodeModal(true)}
              className="h-9 px-3 bg-white/20 backdrop-blur-md text-white rounded-lg text-[11px] font-bold border border-white/30 transition-all hover:bg-white/30"
            >
              🔄 코드 재발급
            </button>
            <button
              onClick={() => { setNewPlan(academy.plan); setShowPlanModal(true) }}
              className="h-9 px-3 bg-white/20 backdrop-blur-md text-white rounded-lg text-[11px] font-bold border border-white/30 transition-all hover:bg-white/30"
            >
              💎 플랜 변경
            </button>
            {/* 🔐 신규 */}
            <button
              onClick={openPasswordModal}
              className="h-9 px-3 bg-white/20 backdrop-blur-md text-white rounded-lg text-[11px] font-bold border border-white/30 transition-all hover:bg-white/30"
            >
              🔐 비밀번호 재설정
            </button>
            <button
              onClick={() => setShowNoticeModal(true)}
              className="h-9 px-3 bg-white/20 backdrop-blur-md text-white rounded-lg text-[11px] font-bold border border-white/30 transition-all hover:bg-white/30"
            >
              📢 공지 발송
            </button>
            <button
              onClick={() => setShowSuspendModal(true)}
              className="h-9 px-3 bg-amber-500/80 backdrop-blur-md text-white rounded-lg text-[11px] font-bold border border-amber-300/40 transition-all hover:bg-amber-500"
            >
              {academy.status === 'suspended' ? '🔓 활성화' : '🚫 정지'}
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="h-9 px-3 bg-red-500/80 backdrop-blur-md text-white rounded-lg text-[11px] font-bold border border-red-300/40 transition-all hover:bg-red-500"
            >
              🗑️ 삭제
            </button>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 max-md:grid-cols-2 gap-3 mb-5">
        {[
          { label: '선생님 수', value: academy.teacherCount, suffix: '명', icon: '👨‍🏫' },
          { label: '학생 수', value: academy.studentCount, suffix: '명', icon: '🧑‍🎓' },
          { label: '평균 진행률', value: `${academy.avgProgress}%`, suffix: '', icon: '📊' },
          { label: '월 매출', value: `₩${academy.monthlyFee.toLocaleString()}`, suffix: '', icon: '💰', warn: academy.unpaidMonths > 0 },
        ].map((s, i) => (
          <div
            key={i}
            className="rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
            style={{
              background: s.warn ? '#FEF2F2' : '#fff',
              border: `1px solid ${s.warn ? '#FCA5A5' : '#E5E7EB'}`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">{s.label}</div>
              <span className="text-lg">{s.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <div className="text-[22px] font-extrabold tracking-tight" style={{ color: s.warn ? '#991B1B' : '#1a1a1a' }}>
                {s.value}
              </div>
              {s.suffix && <div className="text-[12px] font-semibold text-ink-muted">{s.suffix}</div>}
            </div>
            {s.warn && (
              <div className="text-[10px] font-bold text-red-600 mt-1">⚠️ {academy.unpaidMonths}개월 미납</div>
            )}
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex border-b border-line overflow-x-auto">
          {[
            { key: 'overview', label: '📋 개요', count: null },
            { key: 'growth', label: '📈 수강생 추이', count: null, highlight: true },
            { key: 'teachers', label: '👨‍🏫 선생님', count: academy.teachers.length },
            { key: 'students', label: '🧑‍🎓 학생', count: academy.students.length },
            { key: 'payments', label: '💳 결제', count: academy.payments.length },
            { key: 'activity', label: '📜 활동', count: academy.activity.length },
          ].map(t => {
            const isActive = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className="px-5 py-3 text-[13px] font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5"
                style={{
                  color: isActive ? THEME.accentDark : '#6B7280',
                  borderColor: isActive ? THEME.accent : 'transparent',
                  background: isActive ? THEME.accentBg : 'transparent',
                }}
              >
                {t.label}
                {t.count !== null && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      color: isActive ? THEME.accent : '#9CA3AF',
                      background: isActive ? '#fff' : '#F3F4F6',
                    }}
                  >
                    {t.count}
                  </span>
                )}
                {t.highlight && <span className="text-[9px]">⭐</span>}
              </button>
            )
          })}
        </div>

        <div className="p-6">

          {/* 개요 탭 */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">👑</span>
                  <div className="text-[14px] font-extrabold text-ink tracking-tight">원장 정보</div>
                </div>
                <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3">
                  {[
                    { label: '이름', value: academy.owner.name, icon: '👤' },
                    { label: '이메일', value: academy.owner.email, icon: '✉️' },
                    { label: '전화번호', value: academy.owner.phone, icon: '📞' },
                    { label: '가입일', value: academy.owner.joinDate, icon: '📅' },
                    { label: '마지막 로그인', value: academy.owner.lastLogin, icon: '🕐' },
                  ].map((f, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg px-3 py-2.5">
                      <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                        {f.icon} {f.label}
                      </div>
                      <div className="text-[13px] font-semibold text-ink">{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🏢</span>
                  <div className="text-[14px] font-extrabold text-ink tracking-tight">학원 정보</div>
                </div>
                <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3">
                  {[
                    { label: '학원명', value: academy.name, icon: '🏫' },
                    { label: '학원 코드', value: academy.code, icon: '🔑' },
                    { label: '지역', value: academy.region, icon: '📍' },
                    { label: '주소', value: academy.address, icon: '🗺️' },
                    { label: '전화번호', value: academy.phone, icon: '📞' },
                    { label: '플랜', value: academy.plan, icon: '💎' },
                    { label: '월 구독료', value: `₩${academy.monthlyFee.toLocaleString()}`, icon: '💰' },
                  ].map((f, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg px-3 py-2.5">
                      <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                        {f.icon} {f.label}
                      </div>
                      <div className="text-[13px] font-semibold text-ink">{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {academy.codeHistory && academy.codeHistory.length > 0 && (
                <div className="bg-white border border-line rounded-xl px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🔑</span>
                    <div className="text-[14px] font-extrabold text-ink tracking-tight">코드 재발급 이력</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {academy.codeHistory.map((h: any, i: number) => (
                      <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-3">
                        <span className="text-[11px] font-bold text-ink-muted">{h.date}</span>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded" style={{ color: THEME.accentDark, background: THEME.accentBg }}>
                          {h.code}
                        </span>
                        <span className="text-[11px] font-medium text-ink-secondary">사유: {h.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {academy.notices && academy.notices.length > 0 && (
                <div className="bg-white border border-line rounded-xl px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📢</span>
                    <div className="text-[14px] font-extrabold text-ink tracking-tight">발송한 공지사항 ({academy.notices.length})</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {academy.notices.map((n: any) => (
                      <div key={n.id} className="bg-gray-50 border border-line rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          {n.urgent && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">🚨 긴급</span>}
                          <div className="text-[13px] font-extrabold text-ink">{n.title}</div>
                          <span className="ml-auto text-[10px] font-medium text-ink-muted">{n.sentAt}</span>
                        </div>
                        <div className="text-[12px] font-medium text-ink-secondary leading-[1.6]">{n.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 📈 수강생 추이 탭 */}
          {activeTab === 'growth' && (
            <div className="flex flex-col gap-4">

              <div className="grid grid-cols-4 max-md:grid-cols-2 gap-3">
                <div
                  className="rounded-xl px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                  style={{ background: THEME.gradient }}
                >
                  <div className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-1">전체 성장률</div>
                  <div className="text-[22px] font-extrabold text-white tracking-tight">
                    {totalGrowth > 0 ? '▲' : '▼'} {Math.abs(totalGrowth)}%
                  </div>
                  <div className="text-[10px] font-bold text-white/80 mt-1">12개월 기준</div>
                </div>

                <div className="bg-white border border-line rounded-xl px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">전월 대비</div>
                  <div className="text-[22px] font-extrabold tracking-tight" style={{ color: monthGrowth >= 0 ? '#059669' : '#DC2626' }}>
                    {monthGrowth >= 0 ? '▲' : '▼'} {Math.abs(monthGrowth)}%
                  </div>
                  <div className="text-[10px] font-bold text-ink-muted mt-1">직전 1개월</div>
                </div>

                <div className="bg-white border border-line rounded-xl px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">평균 성장률</div>
                  <div className="text-[22px] font-extrabold tracking-tight" style={{ color: THEME.accent }}>
                    +{avgMonthlyGrowth}%
                  </div>
                  <div className="text-[10px] font-bold text-ink-muted mt-1">월 평균</div>
                </div>

                <div className="bg-white border border-line rounded-xl px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">이탈률</div>
                  <div className="text-[22px] font-extrabold tracking-tight" style={{ color: churnRate < 20 ? '#059669' : '#DC2626' }}>
                    {churnRate}%
                  </div>
                  <div className="text-[10px] font-bold text-ink-muted mt-1">신규 대비 이탈</div>
                </div>
              </div>

              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[14px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
                      📈 월별 수강생 추이
                    </div>
                    <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                      최근 12개월 학생 수 변화
                    </div>
                  </div>
                </div>

                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3}/>
                          <stop offset="100%" stopColor="#7C3AED" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(value: any) => [`${value}명`, '학생 수']}
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #E5E7EB',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#7C3AED"
                        strokeWidth={3}
                        fill="url(#colorStudents)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="mb-3">
                  <div className="text-[14px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
                    🔄 신규 가입 vs 이탈
                  </div>
                  <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                    월별 유입/유출 추이
                  </div>
                </div>

                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #E5E7EB',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                      <Line type="monotone" dataKey="new" name="신규" stroke="#059669" strokeWidth={2.5} dot={{ fill: '#059669', r: 3 }} />
                      <Line type="monotone" dataKey="churn" name="이탈" stroke="#DC2626" strokeWidth={2.5} dot={{ fill: '#DC2626', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex gap-4 justify-center mt-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                    <div className="w-3 h-3 rounded-sm bg-green-600" /> 신규: 총 {totalNew}명
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                    <div className="w-3 h-3 rounded-sm bg-red-600" /> 이탈: 총 {totalChurn}명
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl px-5 py-4"
                style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💡</span>
                  <div className="text-[14px] font-extrabold tracking-tight" style={{ color: THEME.accentDark }}>
                    AI 인사이트
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {totalGrowth > 100 && (
                    <div className="bg-white rounded-lg px-3 py-2 flex items-start gap-2 border border-green-200">
                      <span>🚀</span>
                      <div className="text-[12px] font-medium text-ink leading-[1.6]">
                        <strong className="text-green-700">급성장중!</strong> 12개월간 {totalGrowth}% 성장했어요.
                      </div>
                    </div>
                  )}
                  {totalGrowth > 0 && totalGrowth <= 100 && (
                    <div className="bg-white rounded-lg px-3 py-2 flex items-start gap-2 border border-blue-200">
                      <span>📈</span>
                      <div className="text-[12px] font-medium text-ink leading-[1.6]">
                        <strong className="text-blue-700">안정적 성장</strong>. 꾸준한 운영을 유지하고 있어요.
                      </div>
                    </div>
                  )}
                  {totalGrowth < 0 && (
                    <div className="bg-white rounded-lg px-3 py-2 flex items-start gap-2 border border-red-200">
                      <span>⚠️</span>
                      <div className="text-[12px] font-medium text-ink leading-[1.6]">
                        <strong className="text-red-700">이탈 위험!</strong> 학생 수가 감소 중이에요.
                      </div>
                    </div>
                  )}
                  {churnRate > 30 && (
                    <div className="bg-white rounded-lg px-3 py-2 flex items-start gap-2 border border-amber-200">
                      <span>🔥</span>
                      <div className="text-[12px] font-medium text-ink leading-[1.6]">
                        <strong className="text-amber-700">이탈률 {churnRate}%</strong> 평균보다 높아요. CS 팔로업 권장.
                      </div>
                    </div>
                  )}
                  {churnRate <= 15 && (
                    <div className="bg-white rounded-lg px-3 py-2 flex items-start gap-2 border border-green-200">
                      <span>💚</span>
                      <div className="text-[12px] font-medium text-ink leading-[1.6]">
                        <strong className="text-green-700">이탈률 낮음 ({churnRate}%)</strong>. 학생 만족도가 높은 학원이에요!
                      </div>
                    </div>
                  )}
                  {monthGrowth < 0 && (
                    <div className="bg-white rounded-lg px-3 py-2 flex items-start gap-2 border border-amber-200">
                      <span>📉</span>
                      <div className="text-[12px] font-medium text-ink leading-[1.6]">
                        <strong className="text-amber-700">전월 대비 {Math.abs(monthGrowth)}% 감소</strong>.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-line rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-line">
                  <div className="text-[13px] font-extrabold text-ink tracking-tight">📊 월별 상세 데이터</div>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC]">
                      {['월', '학생 수', '신규', '이탈', '순증가', '성장률'].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m: any, i: number) => {
                      const prevCount = i > 0 ? monthlyData[i - 1].count : m.count
                      const growth = prevCount > 0 ? Math.round(((m.count - prevCount) / prevCount) * 100) : 0
                      const net = m.new - m.churn
                      return (
                        <tr key={i} style={{ borderBottom: i < monthlyData.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                          <td className="px-4 py-2.5 text-[12px] font-bold text-ink">{m.month}</td>
                          <td className="px-4 py-2.5 text-[13px] font-extrabold" style={{ color: THEME.accent }}>{m.count}명</td>
                          <td className="px-4 py-2.5 text-[12px] font-bold text-green-600">+{m.new}</td>
                          <td className="px-4 py-2.5 text-[12px] font-bold text-red-600">-{m.churn}</td>
                          <td className="px-4 py-2.5 text-[12px] font-bold" style={{ color: net > 0 ? '#059669' : '#DC2626' }}>
                            {net > 0 ? '+' : ''}{net}
                          </td>
                          <td className="px-4 py-2.5 text-[12px] font-bold" style={{ color: growth > 0 ? '#059669' : growth < 0 ? '#DC2626' : '#6B7280' }}>
                            {i === 0 ? '-' : `${growth > 0 ? '+' : ''}${growth}%`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 선생님 탭 */}
          {activeTab === 'teachers' && (
            academy.teachers.length === 0 ? (
              <div className="text-center py-16 text-ink-muted">
                <div className="text-4xl mb-3">👨‍🏫</div>
                <div className="text-[14px] font-bold">아직 등록된 선생님이 없어요</div>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC]">
                    {['선생님', '이메일', '전화번호', '담당 학생', '가입일', '상태'].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {academy.teachers.map((t: any, i: number) => (
                    <tr key={t.id} style={{ borderBottom: i < academy.teachers.length - 1 ? '1px solid #F1F5F9' : 'none' }} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0" style={{ background: THEME.gradient }}>
                            {t.name[0]}
                          </div>
                          <div className="text-[13px] font-bold text-ink">{t.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-medium text-ink-secondary">{t.email}</td>
                      <td className="px-4 py-3 text-[12px] font-medium text-ink-secondary">{t.phone}</td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-extrabold" style={{ color: THEME.accent }}>{t.assignedStudents}명</span>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-ink-secondary">{t.joinDate}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                          color: t.status === '활성' ? '#059669' : '#D97706',
                          background: t.status === '활성' ? '#ECFDF5' : '#FEF3C7',
                          border: `1px solid ${t.status === '활성' ? '#6EE7B7' : '#FDE68A'}60`,
                        }}>
                          {t.status === '활성' ? '✓ 활성' : '⏳ 초대중'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {/* 학생 탭 */}
          {activeTab === 'students' && (
            academy.students.length === 0 ? (
              <div className="text-center py-16 text-ink-muted">
                <div className="text-4xl mb-3">🧑‍🎓</div>
                <div className="text-[14px] font-bold">아직 등록된 학생이 없어요</div>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC]">
                    {['학생', '학년', '담당 선생님', '진행률', '가입일', '상태'].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {academy.students.map((s: any, i: number) => (
                    <tr key={s.id} style={{ borderBottom: i < academy.students.length - 1 ? '1px solid #F1F5F9' : 'none' }} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0" style={{ background: THEME.gradient }}>
                            {s.name[0]}
                          </div>
                          <div className="text-[13px] font-bold text-ink">{s.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">{s.grade}</span>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-ink">{s.teacher}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${s.progress}%`, background: THEME.accent }} />
                          </div>
                          <span className="text-[12px] font-extrabold" style={{ color: THEME.accent }}>{s.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-ink-secondary">{s.joinDate}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                          color: s.status === '활동중' ? '#059669' : '#9CA3AF',
                          background: s.status === '활동중' ? '#ECFDF5' : '#F3F4F6',
                          border: `1px solid ${s.status === '활동중' ? '#6EE7B7' : '#E5E7EB'}60`,
                        }}>
                          {s.status === '활동중' ? '✓ 활동중' : '💤 휴면'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {/* 결제 탭 */}
          {activeTab === 'payments' && (
            <>
              {academy.unpaidMonths > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-red-800">미납금 발생</div>
                    <div className="text-[11px] font-medium text-red-700 mt-0.5">
                      {academy.unpaidMonths}개월 미납 · 총 ₩{(academy.monthlyFee * academy.unpaidMonths).toLocaleString()}
                    </div>
                  </div>
                  <button className="h-9 px-4 bg-red-500 text-white rounded-lg text-[12px] font-bold hover:bg-red-600 transition-colors" onClick={() => alert('미납 알림 발송 (Mock)')}>
                    📧 독촉 알림
                  </button>
                </div>
              )}
              {academy.payments.length === 0 ? (
                <div className="text-center py-16 text-ink-muted">
                  <div className="text-4xl mb-3">💳</div>
                  <div className="text-[14px] font-bold">결제 내역이 없어요</div>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC]">
                      {['결제일', '결제 기간', '금액', '결제 수단', '상태'].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {academy.payments.map((p: any, i: number) => (
                      <tr key={p.id} style={{ borderBottom: i < academy.payments.length - 1 ? '1px solid #F1F5F9' : 'none' }} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-[13px] font-semibold text-ink">{p.date}</td>
                        <td className="px-4 py-3 text-[12px] font-semibold text-ink-secondary">{p.period}</td>
                        <td className="px-4 py-3 text-[14px] font-extrabold" style={{ color: THEME.accent }}>₩{p.amount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
                            {p.method === '카드' ? '💳' : '🏦'} {p.method}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#059669', background: '#ECFDF5', border: '1px solid #6EE7B760' }}>
                            ✓ {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* 활동 로그 탭 */}
          {activeTab === 'activity' && (
            academy.activity.length === 0 ? (
              <div className="text-center py-16 text-ink-muted">
                <div className="text-4xl mb-3">📜</div>
                <div className="text-[14px] font-bold">활동 로그가 없어요</div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {academy.activity.map((a: any, i: number) => (
                  <div key={i} className="bg-gray-50 border border-line rounded-xl px-4 py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: THEME.accentBg }}>
                      {a.event.includes('로그인') ? '🔑' : a.event.includes('학생') ? '🧑‍🎓' : a.event.includes('피드백') ? '💬' : a.event.includes('결제') ? '💰' : a.event.includes('선생님') ? '👨‍🏫' : a.event.includes('공지') ? '📢' : a.event.includes('정지') ? '🚫' : a.event.includes('활성화') ? '✅' : a.event.includes('플랜') ? '💎' : a.event.includes('코드') ? '🔑' : a.event.includes('비밀번호') ? '🔐' : a.event.includes('수정') ? '✏️' : '📝'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <div className="text-[13px] font-extrabold text-ink">{a.event}</div>
                        <span className="text-[11px] font-medium text-ink-muted">{a.date}</span>
                      </div>
                      <div className="text-[12px] font-medium text-ink-secondary leading-[1.6]">{a.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ============ 1. 학원 수정 모달 ============ */}
      {showEditModal && (
        <div onClick={() => setShowEditModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[560px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="px-6 py-5 relative overflow-hidden" style={{ background: THEME.gradient }}>
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">✏️ 학원 정보 수정</div>
                  <div className="text-[12px] text-white/80 mt-0.5">학원 및 원장 정보를 수정해요</div>
                </div>
                <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">🏫 학원 정보</div>
                  <div className="flex flex-col gap-3">
                    {[
                      { key: 'name', label: '학원명 *', placeholder: '학원명' },
                      { key: 'region', label: '지역', placeholder: '예: 서울 강남' },
                      { key: 'address', label: '주소', placeholder: '상세 주소' },
                      { key: 'phone', label: '학원 전화번호', placeholder: '02-0000-0000' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[11px] font-bold text-ink-secondary mb-1 block">{f.label}</label>
                        <input
                          value={(editForm as any)[f.key]}
                          onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                          onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">👑 원장 정보</div>
                  <div className="flex flex-col gap-3">
                    {[
                      { key: 'ownerName', label: '원장명 *', placeholder: '원장 이름' },
                      { key: 'ownerEmail', label: '이메일', placeholder: 'example@example.com' },
                      { key: 'ownerPhone', label: '전화번호', placeholder: '010-0000-0000' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[11px] font-bold text-ink-secondary mb-1 block">{f.label}</label>
                        <input
                          value={(editForm as any)[f.key]}
                          onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                          onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-line flex gap-2">
              <button onClick={() => setShowEditModal(false)} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50">취소</button>
              <button onClick={handleEditSubmit} className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px" style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
                💾 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 2. 코드 재발급 모달 ============ */}
      {showCodeModal && (
        <div onClick={() => setShowCodeModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="px-6 py-5" style={{ background: THEME.gradient }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">🔄 학원 코드 재발급</div>
                  <div className="text-[12px] text-white/80 mt-0.5">기존 코드는 즉시 만료됩니다</div>
                </div>
                <button onClick={() => setShowCodeModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">⚠️</span>
                  <div>
                    <div className="text-[12px] font-bold text-amber-800 mb-1">재발급 시 주의사항</div>
                    <ul className="text-[11px] font-medium text-amber-700 leading-[1.6] list-disc pl-4">
                      <li>기존 코드는 즉시 사용 불가</li>
                      <li>이미 가입한 학생은 영향 없음</li>
                      <li>신규 가입자는 새 코드 필요</li>
                      <li>학원에 자동 이메일 안내</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">현재 코드</div>
                <div className="text-[18px] font-extrabold font-mono" style={{ color: THEME.accentDark }}>{academy.code}</div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-ink-secondary mb-1 block">재발급 사유 *</label>
                <textarea
                  value={codeReason}
                  onChange={e => setCodeReason(e.target.value)}
                  placeholder="예: 코드 유출 의심, 보안 강화 등"
                  rows={3}
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-none transition-all placeholder:text-ink-muted"
                  onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                  onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-line flex gap-2">
              <button onClick={() => setShowCodeModal(false)} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50">취소</button>
              <button onClick={handleCodeReissue} className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px" style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
                🔄 재발급
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 3. 플랜 변경 모달 ============ */}
      {showPlanModal && (
        <div onClick={() => setShowPlanModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="px-6 py-5" style={{ background: THEME.gradient }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">💎 플랜 변경</div>
                  <div className="text-[12px] text-white/80 mt-0.5">현재 플랜: {academy.plan}</div>
                </div>
                <button onClick={() => setShowPlanModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-col gap-2">
                {['고등', '중등', '고등+중등'].map(p => {
                  const isActive = newPlan === p
                  const isCurrent = academy.plan === p
                  const fee = PLAN_FEES[p]
                  return (
                    <button
                      key={p}
                      onClick={() => setNewPlan(p)}
                      disabled={isCurrent}
                      className="px-4 py-3 rounded-xl border-2 transition-all text-left disabled:opacity-50"
                      style={{
                        borderColor: isActive ? THEME.accent : '#E5E7EB',
                        background: isActive ? THEME.accentBg : '#fff',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <div className="text-[14px] font-extrabold" style={{ color: isActive ? THEME.accentDark : '#1a1a1a' }}>{p}</div>
                            {isCurrent && <span className="text-[9px] font-bold text-ink-muted bg-gray-100 px-1.5 py-0.5 rounded-full">현재 플랜</span>}
                          </div>
                          <div className="text-[12px] font-bold" style={{ color: isActive ? THEME.accent : '#6B7280' }}>₩{fee.toLocaleString()}/월</div>
                        </div>
                        {isActive && <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ background: THEME.accent }}>✓</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-line flex gap-2">
              <button onClick={() => setShowPlanModal(false)} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50">취소</button>
              <button onClick={handlePlanChange} className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px" style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
                💎 변경
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 4. 정지/활성화 모달 ============ */}
      {showSuspendModal && (
        <div onClick={() => setShowSuspendModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="px-6 py-5 bg-gradient-to-br from-amber-500 to-amber-600">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">
                    {academy.status === 'suspended' ? '🔓 계정 활성화' : '🚫 계정 정지'}
                  </div>
                  <div className="text-[12px] text-white/80 mt-0.5">
                    {academy.status === 'suspended' ? '학원 서비스 이용을 재개해요' : '학원 서비스 이용을 일시 중지해요'}
                  </div>
                </div>
                <button onClick={() => setShowSuspendModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>
            <div className="px-6 py-5">
              {academy.status === 'suspended' ? (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <div className="text-[13px] font-bold text-green-800 mb-1">🔓 정지 해제</div>
                  <div className="text-[11px] font-medium text-green-700 leading-[1.6]">
                    정지 사유: <strong>{academy.suspendReason || '-'}</strong><br />
                    활성화하면 학원이 다시 서비스를 이용할 수 있어요.
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                    <div className="text-[12px] font-bold text-red-800 mb-1">⚠️ 정지 시 영향</div>
                    <ul className="text-[11px] font-medium text-red-700 leading-[1.6] list-disc pl-4">
                      <li>원장/선생님/학생 모두 로그인 차단</li>
                      <li>학생들의 학습 진행 중지</li>
                      <li>결제 자동 중지</li>
                      <li>데이터는 삭제되지 않음</li>
                    </ul>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink-secondary mb-1 block">정지 사유 *</label>
                    <textarea
                      value={suspendReason}
                      onChange={e => setSuspendReason(e.target.value)}
                      placeholder="예: 장기 미납, 약관 위반, 원장 요청 등"
                      rows={3}
                      className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-none transition-all placeholder:text-ink-muted"
                      onFocus={e => { e.target.style.borderColor = '#F59E0B'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.15)' }}
                      onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-line flex gap-2">
              <button onClick={() => setShowSuspendModal(false)} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50">취소</button>
              <button onClick={handleSuspend} className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px" style={{
                background: academy.status === 'suspended' ? 'linear-gradient(135deg, #059669, #10B981)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                {academy.status === 'suspended' ? '🔓 활성화' : '🚫 정지'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 5. 삭제 모달 ============ */}
      {showDeleteModal && (
        <div onClick={() => setShowDeleteModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="px-6 py-5 bg-gradient-to-br from-red-500 to-red-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">🗑️ 학원 삭제</div>
                  <div className="text-[12px] text-white/80 mt-0.5">이 작업은 되돌릴 수 없어요</div>
                </div>
                <button onClick={() => setShowDeleteModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <div className="text-[13px] font-bold text-red-800 mb-2">🚨 영구 삭제 경고</div>
                <ul className="text-[11px] font-medium text-red-700 leading-[1.6] list-disc pl-4">
                  <li>학원 계정 영구 삭제</li>
                  <li>모든 선생님/학생 계정 삭제</li>
                  <li>학습 데이터 전부 삭제</li>
                  <li>결제 이력도 삭제</li>
                  <li><strong>복구 절대 불가</strong></li>
                </ul>
              </div>
              <div>
                <label className="text-[11px] font-bold text-ink-secondary mb-1 block">
                  확인: 학원명을 정확히 입력해주세요
                </label>
                <div className="text-[12px] font-bold mb-1.5" style={{ color: THEME.accentDark }}>
                  "{academy.name}"
                </div>
                <input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="학원명 입력"
                  className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                  onFocus={e => { e.target.style.borderColor = '#DC2626'; e.target.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.15)' }}
                  onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-line flex gap-2">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50">취소</button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== academy.name}
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                style={{
                  background: deleteConfirmText === academy.name ? 'linear-gradient(135deg, #DC2626, #991B1B)' : '#E5E7EB',
                  color: deleteConfirmText === academy.name ? '#fff' : '#9CA3AF',
                }}
              >
                🗑️ 영구 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 6. 공지사항 모달 ============ */}
      {showNoticeModal && (
        <div onClick={() => setShowNoticeModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[560px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="px-6 py-5" style={{ background: THEME.gradient }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">📢 공지사항 발송</div>
                  <div className="text-[12px] text-white/80 mt-0.5">원장님에게 직접 알림을 보내요</div>
                </div>
                <button onClick={() => setShowNoticeModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-bold text-ink-secondary mb-1 block">제목 *</label>
                  <input
                    value={noticeForm.title}
                    onChange={e => setNoticeForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="예: 서비스 업데이트 안내"
                    className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                    onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-ink-secondary mb-1 block">내용 *</label>
                  <textarea
                    value={noticeForm.content}
                    onChange={e => setNoticeForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="공지 내용을 입력해주세요..."
                    rows={6}
                    className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                    onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeForm.urgent}
                      onChange={e => setNoticeForm(prev => ({ ...prev, urgent: e.target.checked }))}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <div className="text-[13px] font-bold text-red-800">🚨 긴급 공지로 발송</div>
                      <div className="text-[11px] font-medium text-red-700 mt-0.5">
                        긴급 공지는 알림에 더 눈에 띄게 표시돼요
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-line flex gap-2">
              <button onClick={() => setShowNoticeModal(false)} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50">취소</button>
              <button onClick={handleSendNotice} className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px" style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}>
                📢 발송
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 7. 🔐 비밀번호 재설정 모달 ============ */}
      {showPasswordModal && (
        <div onClick={closePasswordModal} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[560px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">

            <div className="px-6 py-5 relative overflow-hidden" style={{ background: THEME.gradient }}>
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }} />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">🔐 비밀번호 재설정</div>
                  <div className="text-[12px] text-white/80 mt-0.5">임시 비밀번호를 생성해서 이메일로 전송해요</div>
                </div>
                <button onClick={closePasswordModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>

            {/* 결과 화면 */}
            {newPasswordResult ? (
              <div className="px-6 py-5">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">✅</span>
                    <div className="text-[14px] font-extrabold text-green-900">비밀번호가 재설정됐어요!</div>
                  </div>
                  <div className="text-[11px] font-medium text-green-700 leading-[1.6]">
                    새 임시 비밀번호가 생성되었고, 아래 이메일로 자동 발송됐어요.<br />
                    사용자는 <strong>첫 로그인 시 비밀번호를 변경</strong>해야 해요.
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">👤 대상</div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="text-[14px] font-extrabold text-ink mb-0.5">
                      {newPasswordResult.target === 'owner' ? '👑 원장' : newPasswordResult.target === 'teacher' ? '👨‍🏫 선생님' : '🧑‍🎓 학생'} · {newPasswordResult.name}
                    </div>
                    <div className="text-[11px] font-medium text-ink-muted">{newPasswordResult.email}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">🔐 새 임시 비밀번호</div>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 px-4 py-3 rounded-xl font-mono text-[16px] font-extrabold tracking-wider border-2"
                      style={{ background: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D' }}
                    >
                      {newPasswordResult.password}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newPasswordResult.password)
                        alert('✅ 비밀번호가 복사됐어요!')
                      }}
                      className="h-12 px-3 bg-amber-500 text-white rounded-lg text-[11px] font-bold hover:bg-amber-600 transition-colors"
                    >
                      📋 복사
                    </button>
                  </div>
                  <div className="text-[10px] font-bold text-amber-700 mt-1.5 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>이 창을 닫으면 비밀번호를 다시 볼 수 없어요! 반드시 복사하세요.</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2 mb-4">
                  <span className="text-lg">✉️</span>
                  <div>
                    <div className="text-[12px] font-bold text-blue-900">이메일이 자동 발송됐어요</div>
                    <div className="text-[11px] font-medium text-blue-700 mt-0.5">
                      <strong>{newPasswordResult.email}</strong>에 비밀번호 안내 메일이 전송되었어요.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const text = `[비커스 비밀번호 재설정]\n\n대상: ${newPasswordResult.name}\n이메일: ${newPasswordResult.email}\n새 임시 비밀번호: ${newPasswordResult.password}\n\n첫 로그인 시 비밀번호를 반드시 변경해주세요.`
                    navigator.clipboard.writeText(text)
                    alert('✅ 전체 정보가 복사됐어요!')
                  }}
                  className="w-full h-11 text-white rounded-xl text-[13px] font-bold transition-all hover:-translate-y-px mb-2"
                  style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                >
                  📋 전체 정보 복사 (카톡 전송용)
                </button>

                <button
                  onClick={closePasswordModal}
                  className="w-full h-11 bg-gray-100 text-ink rounded-lg text-[13px] font-bold hover:bg-gray-200 transition-colors"
                >
                  닫기
                </button>
              </div>
            ) : (
              /* 폼 화면 */
              <div className="px-6 py-5">

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">⚠️</span>
                    <div>
                      <div className="text-[12px] font-bold text-amber-800 mb-1">비밀번호 재설정 시 주의사항</div>
                      <ul className="text-[11px] font-medium text-amber-700 leading-[1.6] list-disc pl-4">
                        <li><strong>본인 확인</strong>을 반드시 해주세요</li>
                        <li>기존 비밀번호는 즉시 만료돼요</li>
                        <li>새 비밀번호는 자동 생성돼요</li>
                        <li>이메일로 자동 발송돼요</li>
                        <li>재설정 이력이 자동 기록돼요</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[11px] font-bold text-ink-secondary mb-2 block uppercase tracking-wider">
                    1️⃣ 누구의 비밀번호?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'owner', label: '👑 원장', desc: `${academy.owner.name}` },
                      { key: 'teacher', label: '👨‍🏫 선생님', desc: `${academy.teachers.length}명` },
                      { key: 'student', label: '🧑‍🎓 학생', desc: `${academy.students.length}명` },
                    ].map(t => {
                      const isActive = passwordTarget === t.key
                      return (
                        <button
                          key={t.key}
                          onClick={() => setPasswordTarget(t.key as any)}
                          className="px-3 py-3 rounded-xl border-2 transition-all text-center"
                          style={{
                            borderColor: isActive ? THEME.accent : '#E5E7EB',
                            background: isActive ? THEME.accentBg : '#fff',
                          }}
                        >
                          <div className="text-[13px] font-extrabold mb-0.5" style={{ color: isActive ? THEME.accentDark : '#1a1a1a' }}>
                            {t.label}
                          </div>
                          <div className="text-[10px] font-semibold" style={{ color: isActive ? THEME.accent : '#6B7280' }}>
                            {t.desc}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {passwordTarget === 'teacher' && (
                  <div className="mb-4">
                    <label className="text-[11px] font-bold text-ink-secondary mb-2 block uppercase tracking-wider">
                      2️⃣ 선생님 선택
                    </label>
                    <select
                      value={selectedTeacherId || ''}
                      onChange={e => setSelectedTeacherId(Number(e.target.value))}
                      className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none cursor-pointer bg-white"
                    >
                      <option value="">-- 선생님을 선택하세요 --</option>
                      {academy.teachers.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {t.email} ({t.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {passwordTarget === 'student' && (
                  <div className="mb-4">
                    <label className="text-[11px] font-bold text-ink-secondary mb-2 block uppercase tracking-wider">
                      2️⃣ 학생 선택
                    </label>
                    <select
                      value={selectedStudentId || ''}
                      onChange={e => setSelectedStudentId(Number(e.target.value))}
                      className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none cursor-pointer bg-white"
                    >
                      <option value="">-- 학생을 선택하세요 --</option>
                      {academy.students.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.grade} · 담당: {s.teacher}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {passwordTarget === 'owner' && (
                  <div className="mb-4">
                    <label className="text-[11px] font-bold text-ink-secondary mb-2 block uppercase tracking-wider">
                      2️⃣ 본인 확인 (원장)
                    </label>
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">
                      <div className="text-[11px] font-bold text-red-800 mb-1">🔒 보안 확인 필수</div>
                      <div className="text-[10px] font-medium text-red-700 leading-[1.6]">
                        원장 비밀번호 재설정은 민감한 작업이에요.<br />
                        등록된 이메일과 전화번호를 정확히 입력해주세요.
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-ink-secondary mb-1 block">등록된 이메일 *</label>
                        <input
                          value={verifyEmail}
                          onChange={e => setVerifyEmail(e.target.value)}
                          placeholder={`힌트: ${academy.owner.email.slice(0, 3)}***`}
                          className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                          onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-ink-secondary mb-1 block">전화번호 (선택)</label>
                        <input
                          value={verifyPhone}
                          onChange={e => setVerifyPhone(e.target.value)}
                          placeholder={`힌트: ${academy.owner.phone.slice(0, 3)}-****-${academy.owner.phone.slice(-4)}`}
                          className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                          onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">📋 재설정 대상</div>
                  <div className="text-[13px] font-extrabold text-ink">
                    {passwordTarget === 'owner' && (
                      <>
                        👑 원장: {academy.owner.name}
                        <div className="text-[11px] font-medium text-ink-muted mt-0.5">{academy.owner.email}</div>
                      </>
                    )}
                    {passwordTarget === 'teacher' && selectedTeacherId && (() => {
                      const t = academy.teachers.find((x: any) => x.id === selectedTeacherId)
                      return t ? (
                        <>
                          👨‍🏫 선생님: {t.name}
                          <div className="text-[11px] font-medium text-ink-muted mt-0.5">{t.email}</div>
                        </>
                      ) : <span className="text-ink-muted font-medium">선생님을 선택해주세요</span>
                    })()}
                    {passwordTarget === 'student' && selectedStudentId && (() => {
                      const s = academy.students.find((x: any) => x.id === selectedStudentId)
                      return s ? (
                        <>
                          🧑‍🎓 학생: {s.name} ({s.grade})
                          <div className="text-[11px] font-medium text-ink-muted mt-0.5">담당 선생님: {s.teacher}</div>
                        </>
                      ) : <span className="text-ink-muted font-medium">학생을 선택해주세요</span>
                    })()}
                  </div>
                </div>
              </div>
            )}

            {!newPasswordResult && (
              <div className="px-6 py-4 border-t border-line flex gap-2">
                <button onClick={closePasswordModal} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50">
                  취소
                </button>
                <button
                  onClick={handlePasswordReset}
                  className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
                  style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                >
                  🔐 비밀번호 재설정
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}