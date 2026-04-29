import { useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { academyState, teachersState } from '@/lib/auth/atoms'
import type { ITeacher } from '@/lib/auth/atoms'

const ALL_STUDENTS = [
  { id: 1, name: '김민준', grade: '고2', email: 'kim@example.com' },
  { id: 2, name: '이수현', grade: '고3', email: 'lee@example.com' },
  { id: 3, name: '박지호', grade: '고1', email: 'park@example.com' },
  { id: 4, name: '최유진', grade: '고2', email: 'choi@example.com' },
  { id: 5, name: '정다은', grade: '고3', email: 'jung@example.com' },
  { id: 6, name: '강민서', grade: '고1', email: 'kang@example.com' },
  { id: 7, name: '윤서준', grade: '고2', email: 'yoon@example.com' },
  { id: 8, name: '임지수', grade: '고1', email: 'lim@example.com' },
  { id: 9, name: '한지원', grade: '고3', email: 'han@example.com' },
  { id: 10, name: '오민석', grade: '고2', email: 'oh@example.com' },
  { id: 11, name: '신예진', grade: '고1', email: 'shin@example.com' },
  { id: 12, name: '권태양', grade: '고3', email: 'kwon@example.com' },
  { id: 13, name: '문지현', grade: '고2', email: 'moon@example.com' },
  { id: 14, name: '배수현', grade: '고1', email: 'bae@example.com' },
  { id: 15, name: '유재민', grade: '고3', email: 'yu@example.com' },
  { id: 16, name: '홍서연', grade: '고2', email: 'hong@example.com' },
  { id: 17, name: '전민호', grade: '고1', email: 'jun@example.com' },
  { id: 18, name: '조아현', grade: '고3', email: 'jo@example.com' },
  { id: 19, name: '임태준', grade: '고2', email: 'lim2@example.com' },
  { id: 20, name: '노지은', grade: '고1', email: 'noh@example.com' },
  { id: 21, name: '서동현', grade: '고3', email: 'seo@example.com' },
  { id: 22, name: '남지수', grade: '고2', email: 'nam@example.com' },
  { id: 23, name: '황민준', grade: '고1', email: 'hwang@example.com' },
  { id: 24, name: '송아영', grade: '고3', email: 'song@example.com' },
  { id: 25, name: '류지호', grade: '고2', email: 'ryu@example.com' },
  { id: 26, name: '채은지', grade: '고1', email: 'chae@example.com' },
  { id: 27, name: '변성훈', grade: '고3', email: 'byun@example.com' },
  { id: 28, name: '도하은', grade: '고2', email: 'do@example.com' },
  { id: 29, name: '엄재영', grade: '고1', email: 'um@example.com' },
  { id: 30, name: '방지수', grade: '고3', email: 'bang@example.com' },
]

// 파랑 테마
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
    onClick={onClose}
  >
    <div onClick={e => e.stopPropagation()}>{children}</div>
  </div>
)

const AssignModal = ({
  teacher, teachers, selectedStudents, onToggle, onSave, onClose
}: {
  teacher: ITeacher
  teachers: ITeacher[]
  selectedStudents: number[]
  onToggle: (id: number) => void
  onSave: () => void
  onClose: () => void
}) => {
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('전체')
  const [unassignedOnly, setUnassignedOnly] = useState(false)

  const filtered = ALL_STUDENTS.filter(s => {
    if (gradeFilter !== '전체' && s.grade !== gradeFilter) return false
    if (unassignedOnly && teachers.some(t => t.id !== teacher.id && t.assignedStudents.includes(s.id))) return false
    if (search && !s.name.includes(search) && !s.email.includes(search)) return false
    return true
  })

  return (
    <div className="bg-white rounded-2xl p-7 w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div className="text-[18px] font-extrabold text-ink mb-1">{teacher.name} 선생님 학생 배정</div>
      <div className="text-[12px] text-ink-secondary font-medium mb-4">
        현재 배정된 학생 <span className="font-bold" style={{ color: THEME.accent }}>{selectedStudents.length}명</span> · 클릭해서 배정/해제할 수 있어요.
      </div>

      {/* 검색 */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 이름 또는 이메일 검색"
        className="w-full h-11 border border-line rounded-lg px-3.5 text-[13px] font-medium outline-none transition-all mb-3 placeholder:text-ink-muted"
        onFocus={e => {
          e.target.style.borderColor = THEME.accent
          e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
        }}
        onBlur={e => {
          e.target.style.borderColor = '#E5E7EB'
          e.target.style.boxShadow = 'none'
        }}
      />

      {/* 필터 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {['전체', '고1', '고2', '고3'].map(g => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className="px-3 py-1 rounded-full text-[11px] font-semibold border transition-all"
              style={{
                background: gradeFilter === g ? THEME.accent : '#fff',
                color: gradeFilter === g ? '#fff' : '#6B7280',
                borderColor: gradeFilter === g ? THEME.accent : '#E5E7EB',
              }}
            >
              {g}
            </button>
          ))}
        </div>
        <button
          onClick={() => setUnassignedOnly(!unassignedOnly)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div
            className="w-8 h-4 rounded-full relative transition-all"
            style={{ background: unassignedOnly ? THEME.accent : '#E5E7EB' }}
          >
            <div
              className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all"
              style={{ left: unassignedOnly ? '18px' : '2px' }}
            />
          </div>
          <span className="text-[11px] font-semibold text-ink-secondary">미배정만</span>
        </button>
      </div>

      {/* 학생 목록 */}
      <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto mb-4 pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">🔍</div>
            <div className="text-[13px] text-ink-secondary font-medium">검색 결과가 없어요.</div>
          </div>
        ) : filtered.map(s => {
          const isSelected = selectedStudents.includes(s.id)
          const assignedToOther = teachers.some(t => t.id !== teacher.id && t.assignedStudents.includes(s.id))
          const assignedTeacher = teachers.find(t => t.id !== teacher.id && t.assignedStudents.includes(s.id))
          return (
            <div
              key={s.id}
              onClick={() => !assignedToOther && onToggle(s.id)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border transition-all"
              style={{
                borderColor: isSelected ? THEME.accent : '#E5E7EB',
                background: isSelected ? THEME.accentBg : assignedToOther ? '#F8FAFC' : '#fff',
                cursor: assignedToOther ? 'not-allowed' : 'pointer',
                opacity: assignedToOther ? 0.6 : 1,
              }}
            >
              {/* 체크박스 */}
              <div
                className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0"
                style={{
                  border: `2px solid ${isSelected ? THEME.accent : '#D1D5DB'}`,
                  background: isSelected ? THEME.accent : '#fff',
                }}
              >
                {isSelected && <span className="text-[10px] text-white font-bold">✓</span>}
              </div>

              {/* 아바타 */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                style={{ background: THEME.gradient }}
              >
                {s.name[0]}
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[13px] text-ink"
                    style={{ fontWeight: isSelected ? 700 : 500 }}
                  >
                    {s.name}
                  </span>
                  {isSelected && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        color: THEME.accentDark,
                        background: '#fff',
                        border: `1px solid ${THEME.accentBorder}`,
                      }}
                    >
                      배정됨
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-ink-secondary font-medium truncate">{s.email} · {s.grade}</div>
              </div>

              {/* 상태 뱃지 */}
              {assignedToOther && (
                <span className="text-[10px] font-semibold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  {assignedTeacher?.name} 배정중
                </span>
              )}
              {isSelected && !assignedToOther && (
                <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0">
                  클릭시 해제
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* 요약 */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-[12px] font-medium text-ink-secondary">
          선택된 학생 <span className="font-bold" style={{ color: THEME.accent }}>{selectedStudents.length}명</span>
        </span>
        <span className="text-[11px] text-ink-muted font-medium">{filtered.length}명 표시중</span>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          onClick={onSave}
          className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
          style={{
            background: THEME.accent,
            boxShadow: `0 4px 12px ${THEME.accentShadow}`,
          }}
        >
          저장하기
        </button>
      </div>
    </div>
  )
}

export default function Settings() {
  const academy = useAtomValue(academyState)
  const setAcademy = useSetAtom(academyState)
  const teachers = useAtomValue(teachersState)
  const setTeachers = useSetAtom(teachersState)

  const [tab, setTab] = useState<'basic' | 'teachers'>(
    new URLSearchParams(window.location.search).get('tab') === 'teachers' ? 'teachers' : 'basic'
  )
  const [academyName, setAcademyName] = useState(academy.academyName || '')
  const [ownerName, setOwnerName] = useState(academy.ownerName || '')
  const [phone, setPhone] = useState('010-1234-5678')
  const [address, setAddress] = useState('서울시 강남구 대치동 123-45')
  const [saved, setSaved] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [showPwConfirm, setShowPwConfirm] = useState(false)

  const [withdrawStep, setWithdrawStep] = useState(0)
  const [withdrawCode, setWithdrawCode] = useState('')
  const [withdrawPhone, setWithdrawPhone] = useState('')
  const [withdrawReason, setWithdrawReason] = useState('')
  const [withdrawReasonDetail, setWithdrawReasonDetail] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addPw, setAddPw] = useState('')
  const [addError, setAddError] = useState('')
  const [showAddConfirm, setShowAddConfirm] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ITeacher | null>(null)
  const [assignTarget, setAssignTarget] = useState<ITeacher | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [showAssignConfirm, setShowAssignConfirm] = useState(false)

  const WITHDRAW_REASONS = ['서비스가 기대에 못 미쳐서', '사용하기 불편해서', '다른 서비스로 이동', '학원을 더 이상 운영하지 않음', '기타']

  const handleSave = () => {
    setAcademy({ ...academy, academyName, ownerName })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePwChange = () => {
    if (currentPw !== '1234') { setPwError('현재 비밀번호가 맞지 않아요.'); return }
    if (newPw.length < 8) { setPwError('비밀번호는 8자 이상이어야 해요.'); return }
    if (!/[0-9]/.test(newPw)) { setPwError('숫자를 1개 이상 포함해야 해요.'); return }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPw)) { setPwError('특수문자를 1개 이상 포함해야 해요.'); return }
    if (newPw !== confirmPw) { setPwError('새 비밀번호가 일치하지 않아요.'); return }
    setPwError('')
    setShowPwConfirm(true)
  }

  const resetWithdraw = () => {
    setWithdrawStep(0); setWithdrawCode(''); setWithdrawPhone(''); setWithdrawReason(''); setWithdrawReasonDetail('')
  }

  const resetAdd = () => {
    setAddName(''); setAddEmail(''); setAddPhone(''); setAddPw(''); setAddError('')
  }

  const handleAddTeacher = () => {
    if (!addName.trim()) { setAddError('이름을 입력해주세요.'); return }
    if (!addEmail.trim() || !addEmail.includes('@')) { setAddError('올바른 이메일을 입력해주세요.'); return }
    if (addPw.length < 4) { setAddError('비밀번호는 4자 이상이어야 해요.'); return }
    setAddError('')
    setShowAddConfirm(true)
  }

  const confirmAddTeacher = () => {
    const newTeacher: ITeacher = {
      id: Date.now(), name: addName, email: addEmail, phone: addPhone,
      role: 'TEACHER', status: '활성', assignedStudents: [],
      joinDate: new Date().toISOString().split('T')[0],
    }
    setTeachers([...teachers, newTeacher])
    setShowAddConfirm(false)
    setShowAddModal(false)
    resetAdd()
  }

  const handleDeleteTeacher = () => {
    if (!deleteTarget) return
    setTeachers(teachers.filter(t => t.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const openAssign = (teacher: ITeacher) => {
    const current = teachers.find(t => t.id === teacher.id)
    setAssignTarget(current || teacher)
    setSelectedStudents([...(current?.assignedStudents || [])])
  }

  const handleAssignSave = () => {
    if (!assignTarget) return
    setTeachers(teachers.map(t => t.id === assignTarget.id ? { ...t, assignedStudents: selectedStudents } : t))
    setShowAssignConfirm(false)
    setAssignTarget(null)
  }

  const toggleStudent = (id: number) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  // 재사용 input focus 스타일
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
  }
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#E5E7EB'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div className="px-8 py-7 min-h-[calc(100vh-50px)] bg-[#F8FAFC] font-sans text-ink">

      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-2.5">
        <span className="text-2xl">⚙️</span>
        <div>
          <div className="text-[22px] font-extrabold text-ink tracking-tight mb-0.5">학원 설정</div>
          <div className="text-[13px] text-ink-secondary font-medium">학원 정보와 선생님을 관리하세요.</div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1.5 mb-5">
        {[
          { key: 'basic', label: '🏢 기본 정보' },
          { key: 'teachers', label: `👨‍🏫 선생님 관리 (${teachers.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className="px-5 py-2 rounded-full text-[13px] font-semibold border transition-all"
            style={{
              background: tab === t.key ? THEME.accent : '#fff',
              color: tab === t.key ? '#fff' : '#6B7280',
              borderColor: tab === t.key ? THEME.accent : '#E5E7EB',
              boxShadow: tab === t.key ? `0 4px 12px ${THEME.accentShadow}` : 'none',
              fontWeight: tab === t.key ? 700 : 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ============ 기본 정보 탭 ============ */}
      {tab === 'basic' && (
        <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-4">

          {/* 왼쪽: 학원 기본 정보 */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="text-[15px] font-bold text-ink tracking-tight mb-5 pb-3 border-b border-line flex items-center gap-2">
              <span>🏢</span>
              <span>학원 기본 정보</span>
            </div>
            {[
              { label: '학원명', value: academyName, setter: setAcademyName, placeholder: '학원 이름을 입력해주세요' },
              { label: '원장명', value: ownerName, setter: setOwnerName, placeholder: '원장님 성함을 입력해주세요' },
              { label: '연락처', value: phone, setter: setPhone, placeholder: '010-0000-0000' },
              { label: '주소', value: address, setter: setAddress, placeholder: '학원 주소를 입력해주세요' },
            ].map((f, i) => (
              <div key={i} className="mb-4">
                <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">{f.label}</label>
                <input
                  value={f.value}
                  onChange={e => f.setter(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full h-11 border border-line rounded-lg px-3.5 text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
            ))}
            <button
              onClick={handleSave}
              className="w-full h-12 text-white rounded-lg text-[13px] font-bold mt-2 transition-all hover:-translate-y-px"
              style={{
                background: saved ? '#059669' : THEME.accent,
                boxShadow: `0 4px 12px ${saved ? 'rgba(16,185,129,0.3)' : THEME.accentShadow}`,
              }}
            >
              {saved ? '✓ 저장됐어요!' : '💾 저장하기'}
            </button>
          </div>

          {/* 오른쪽 */}
          <div className="flex flex-col gap-4">

            {/* 학원 코드 */}
            <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <div className="text-[15px] font-bold text-ink tracking-tight mb-4 pb-3 border-b border-line flex items-center gap-2">
                <span>🔑</span>
                <span>학원 코드</span>
              </div>
              <div
                className="flex items-center justify-between rounded-xl p-4"
                style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}
              >
                <div className="text-[24px] font-extrabold tracking-[0.1em]" style={{ color: THEME.accentDark }}>
                  {academy.academyCode}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(academy.academyCode || '')}
                  className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                  style={{
                    background: THEME.accent,
                    boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                  }}
                >
                  📋 복사
                </button>
              </div>
              <div className="text-[11px] text-ink-secondary font-medium mt-3 leading-[1.5]">
                학원 코드는 변경할 수 없어요. 학생들에게 이 코드를 공유해주세요.
              </div>
            </div>

            {/* 비밀번호 변경 */}
            <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <div className="text-[15px] font-bold text-ink tracking-tight mb-4 pb-3 border-b border-line flex items-center gap-2">
                <span>🔒</span>
                <span>비밀번호 변경</span>
              </div>
              {[
                { label: '현재 비밀번호', value: currentPw, setter: setCurrentPw },
                { label: '새 비밀번호', value: newPw, setter: setNewPw },
                { label: '새 비밀번호 확인', value: confirmPw, setter: setConfirmPw },
              ].map((f, i) => (
                <div key={i} className="mb-3">
                  <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">{f.label}</label>
                  <input
                    type="password"
                    value={f.value}
                    onChange={e => { f.setter(e.target.value); setPwError('') }}
                    placeholder="••••••••"
                    className="w-full h-11 border rounded-lg px-3.5 text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                    style={{ borderColor: pwError ? '#DC2626' : '#E5E7EB' }}
                    onFocus={e => {
                      if (!pwError) {
                        e.target.style.borderColor = THEME.accent
                        e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
                      }
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = pwError ? '#DC2626' : '#E5E7EB'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              ))}
              <div className="bg-gray-50 rounded-lg px-3.5 py-2.5 mb-2.5">
                <div className="text-[11px] font-medium leading-[1.8]">
                  {[
                    { label: '8자 이상', ok: newPw.length >= 8 },
                    { label: '숫자 포함', ok: /[0-9]/.test(newPw) },
                    { label: '특수문자 포함', ok: /[!@#$%^&*(),.?":{}|<>]/.test(newPw) },
                  ].map((c, i) => (
                    <span
                      key={i}
                      className="mr-3"
                      style={{ color: c.ok ? '#059669' : '#9CA3AF', fontWeight: c.ok ? 700 : 500 }}
                    >
                      {c.ok ? '✓' : '○'} {c.label}
                    </span>
                  ))}
                </div>
              </div>
              {pwError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2.5">
                  <span className="text-sm">⚠️</span>
                  <span className="text-[12px] text-red-600 font-semibold">{pwError}</span>
                </div>
              )}
              <button
                onClick={handlePwChange}
                className="w-full h-11 bg-ink text-white rounded-lg text-[12px] font-bold mt-2 hover:bg-ink/90 transition-colors"
              >
                🔐 비밀번호 변경
              </button>
            </div>

            {/* 계정 관리 (탈퇴) */}
            <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <div className="text-[15px] font-bold text-ink tracking-tight mb-4 pb-3 border-b border-line flex items-center gap-2">
                <span>⚠️</span>
                <span>계정 관리</span>
              </div>
              <div className="text-[12px] text-ink-secondary font-medium mb-4 leading-[1.6]">
                학원 계정을 탈퇴하면 모든 학생 데이터와 기록이 삭제됩니다.<br />
                탈퇴 전 반드시 데이터를 백업해주세요.
              </div>
              <button
                onClick={() => setWithdrawStep(1)}
                className="w-full h-11 bg-white text-red-600 border border-red-500 rounded-lg text-[12px] font-bold hover:bg-red-50 transition-colors"
              >
                학원 계정 탈퇴
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 선생님 관리 탭 ============ */}
      {tab === 'teachers' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-[13px] font-medium text-ink-secondary">
              총 <span className="font-bold" style={{ color: THEME.accent }}>{teachers.length}명</span>
              <span className="text-ink-muted"> · 활성 {teachers.filter(t => t.status === '활성').length}명</span>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
              style={{
                background: THEME.accent,
                boxShadow: `0 4px 12px ${THEME.accentShadow}`,
              }}
            >
              + 선생님 추가
            </button>
          </div>

          <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {['이름', '이메일', '연락처', '담당 학생', '상태', '합류일', ''].map((h, i) => (
                    <th
                      key={i}
                      className="px-5 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider text-left border-b border-line"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, i) => (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{ borderBottom: i < teachers.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                          style={{ background: THEME.gradient }}
                        >
                          {t.name[0]}
                        </div>
                        <span className="text-[13px] font-semibold text-ink">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[12.5px] font-medium text-ink-secondary">{t.email}</td>
                    <td className="px-5 py-3 text-[12.5px] font-medium text-ink-secondary">{t.phone}</td>
                    <td className="px-5 py-3">
                      <span
                        className="text-[12px] font-bold px-2.5 py-1 rounded-full"
                        style={{
                          color: t.assignedStudents.length > 0 ? THEME.accent : '#6B7280',
                          background: t.assignedStudents.length > 0 ? THEME.accentBg : '#F3F4F6',
                        }}
                      >
                        {t.assignedStudents.length}명
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: t.status === '활성' ? '#ECFDF5' : THEME.accentBg,
                          color: t.status === '활성' ? '#059669' : THEME.accent,
                          border: `1px solid ${t.status === '활성' ? '#6EE7B7' : THEME.accentBorder}60`,
                        }}
                      >
                        {t.status === '활성' ? '✓' : '⏳'} {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12px] font-medium text-ink-secondary">{t.joinDate}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openAssign(t)}
                          className="text-[11px] font-bold bg-white border px-3 py-1.5 rounded-full transition-all hover:-translate-y-px"
                          style={{
                            color: THEME.accent,
                            borderColor: THEME.accent,
                          }}
                        >
                          학생 배정
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="text-[11px] font-bold bg-white text-red-600 border border-red-500 px-3 py-1.5 rounded-full hover:bg-red-50 transition-all"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ 모달들 ============ */}

      {/* 선생님 추가 */}
      {showAddModal && (
        <Modal onClose={() => { setShowAddModal(false); resetAdd() }}>
          <div className="bg-white rounded-2xl p-8 w-[440px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-[18px] font-extrabold text-ink mb-1">👨‍🏫 선생님 추가</div>
            <div className="text-[12px] text-ink-secondary font-medium mb-5">선생님 계정을 바로 만들어요.</div>
            {[
              { label: '이름', value: addName, setter: setAddName, placeholder: '선생님 성함', type: 'text' },
              { label: '이메일', value: addEmail, setter: setAddEmail, placeholder: 'teacher@example.com', type: 'email' },
              { label: '연락처', value: addPhone, setter: setAddPhone, placeholder: '010-0000-0000', type: 'text' },
              { label: '비밀번호', value: addPw, setter: setAddPw, placeholder: '4자 이상', type: 'password' },
            ].map((f, i) => (
              <div key={i} className="mb-3">
                <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">{f.label}</label>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => { f.setter(e.target.value); setAddError('') }}
                  placeholder={f.placeholder}
                  className="w-full h-11 border border-line rounded-lg px-3.5 text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
            ))}
            {addError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                <span className="text-sm">⚠️</span>
                <span className="text-[12px] text-red-600 font-semibold">{addError}</span>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setShowAddModal(false); resetAdd() }}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddTeacher}
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
                style={{
                  background: THEME.accent,
                  boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                }}
              >
                계정 만들기
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 선생님 추가 확인 */}
      {showAddConfirm && (
        <Modal onClose={() => setShowAddConfirm(false)}>
          <div className="bg-white rounded-2xl p-8 w-[380px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-4xl mb-3">👨‍🏫</div>
            <div className="text-[16px] font-extrabold text-ink mb-4">계정을 만드시겠어요?</div>
            <div
              className="rounded-xl p-4 mb-5 text-left"
              style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}
            >
              {[
                { label: '이름', value: addName },
                { label: '이메일', value: addEmail },
                { label: '연락처', value: addPhone || '-' },
              ].map((r, i) => (
                <div key={i} className={`flex justify-between text-[12px] ${i < 2 ? 'mb-2' : ''}`}>
                  <span className="text-ink-secondary font-medium">{r.label}</span>
                  <span className="text-ink font-bold">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddConfirm(false)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                돌아가기
              </button>
              <button
                onClick={confirmAddTeacher}
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
                style={{
                  background: THEME.accent,
                  boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                }}
              >
                확인
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 학생 배정 */}
      {assignTarget && !showAssignConfirm && (
        <Modal onClose={() => setAssignTarget(null)}>
          <AssignModal
            teacher={assignTarget}
            teachers={teachers}
            selectedStudents={selectedStudents}
            onToggle={toggleStudent}
            onSave={() => setShowAssignConfirm(true)}
            onClose={() => setAssignTarget(null)}
          />
        </Modal>
      )}

      {/* 학생 배정 확인 */}
      {showAssignConfirm && assignTarget && (
        <Modal onClose={() => setShowAssignConfirm(false)}>
          <div className="bg-white rounded-2xl p-8 w-[380px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-4xl mb-3">👥</div>
            <div className="text-[16px] font-extrabold text-ink mb-4">학생을 배정하시겠어요?</div>
            <div
              className="rounded-xl p-4 mb-5 text-left"
              style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40` }}
            >
              <div className="flex justify-between text-[12px] mb-2">
                <span className="text-ink-secondary font-medium">선생님</span>
                <span className="text-ink font-bold">{assignTarget.name}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-ink-secondary font-medium">담당 학생</span>
                <span className="font-bold" style={{ color: THEME.accent }}>{selectedStudents.length}명</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAssignConfirm(false)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                돌아가기
              </button>
              <button
                onClick={handleAssignSave}
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
                style={{
                  background: THEME.accent,
                  boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                }}
              >
                확인
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 선생님 삭제 확인 */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl p-8 w-[380px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-[16px] font-extrabold text-ink mb-3">
              {deleteTarget.name} 선생님을 삭제하시겠어요?
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
              <div className="text-[12px] text-red-600 font-semibold leading-[1.6]">
                담당 학생 {deleteTarget.assignedStudents.length}명의 배정이 해제됩니다.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteTeacher}
                className="flex-1 h-11 bg-red-500 text-white rounded-lg text-[13px] font-bold hover:bg-red-600 transition-all hover:-translate-y-px"
                style={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
              >
                삭제
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 비밀번호 변경 완료 */}
      {showPwConfirm && (
        <Modal onClose={() => setShowPwConfirm(false)}>
          <div className="bg-white rounded-2xl p-8 w-[360px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              ✓
            </div>
            <div className="text-[18px] font-extrabold text-ink mb-2">비밀번호가 변경됐어요!</div>
            <div className="text-[12px] text-ink-secondary font-medium mb-5">다음 로그인부터 새 비밀번호를 사용해주세요.</div>
            <button
              onClick={() => { setShowPwConfirm(false); setCurrentPw(''); setNewPw(''); setConfirmPw('') }}
              className="w-full h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
              style={{
                background: THEME.accent,
                boxShadow: `0 4px 12px ${THEME.accentShadow}`,
              }}
            >
              확인
            </button>
          </div>
        </Modal>
      )}

      {/* 탈퇴 1단계 */}
      {withdrawStep === 1 && (
        <Modal onClose={resetWithdraw}>
          <div className="bg-white rounded-2xl p-8 w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="inline-block text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full mb-3">
              1 / 3단계
            </div>
            <div className="text-[18px] font-extrabold text-ink mb-1.5">학원 코드를 입력해주세요</div>
            <div className="text-[12px] text-ink-secondary font-medium mb-5">학원 코드를 정확히 입력해야 다음 단계로 넘어갑니다.</div>
            <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">학원 코드</label>
            <input
              value={withdrawCode}
              onChange={e => setWithdrawCode(e.target.value)}
              placeholder={`예: ${academy.academyCode}`}
              className="w-full h-11 border border-line rounded-lg px-3.5 text-[13px] font-medium outline-none transition-all mb-5 placeholder:text-ink-muted"
              onFocus={e => {
                e.target.style.borderColor = '#DC2626'
                e.target.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E5E7EB'
                e.target.style.boxShadow = 'none'
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={resetWithdraw}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => withdrawCode === academy.academyCode ? setWithdrawStep(2) : alert('학원 코드가 맞지 않아요.')}
                disabled={!withdrawCode}
                className="flex-1 h-11 rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed"
                style={{
                  background: withdrawCode ? '#DC2626' : '#E5E7EB',
                  color: withdrawCode ? '#fff' : '#9CA3AF',
                  boxShadow: withdrawCode ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none',
                }}
              >
                다음
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 탈퇴 2단계 */}
      {withdrawStep === 2 && (
        <Modal onClose={resetWithdraw}>
          <div className="bg-white rounded-2xl p-8 w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="inline-block text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full mb-3">
              2 / 3단계
            </div>
            <div className="text-[18px] font-extrabold text-ink mb-1.5">원장님 연락처를 입력해주세요</div>
            <div className="text-[12px] text-ink-secondary font-medium mb-5">등록된 연락처를 정확히 입력해야 다음 단계로 넘어갑니다.</div>
            <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">연락처</label>
            <input
              value={withdrawPhone}
              onChange={e => setWithdrawPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full h-11 border border-line rounded-lg px-3.5 text-[13px] font-medium outline-none transition-all mb-5 placeholder:text-ink-muted"
              onFocus={e => {
                e.target.style.borderColor = '#DC2626'
                e.target.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E5E7EB'
                e.target.style.boxShadow = 'none'
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setWithdrawStep(1)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                이전
              </button>
              <button
                onClick={() => withdrawPhone === phone ? setWithdrawStep(3) : alert('연락처가 맞지 않아요.')}
                disabled={!withdrawPhone}
                className="flex-1 h-11 rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed"
                style={{
                  background: withdrawPhone ? '#DC2626' : '#E5E7EB',
                  color: withdrawPhone ? '#fff' : '#9CA3AF',
                  boxShadow: withdrawPhone ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none',
                }}
              >
                다음
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 탈퇴 3단계 */}
      {withdrawStep === 3 && (
        <Modal onClose={resetWithdraw}>
          <div className="bg-white rounded-2xl p-8 w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="inline-block text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full mb-3">
              3 / 3단계
            </div>
            <div className="text-[18px] font-extrabold text-ink mb-1.5">탈퇴 사유를 알려주세요</div>
            <div className="text-[12px] text-ink-secondary font-medium mb-4">서비스 개선에 소중히 활용할게요.</div>
            <div className="flex flex-col gap-2 mb-3">
              {WITHDRAW_REASONS.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setWithdrawReason(r)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left transition-all"
                  style={{
                    borderColor: withdrawReason === r ? '#DC2626' : '#E5E7EB',
                    background: withdrawReason === r ? '#FEE2E2' : '#fff',
                  }}
                >
                  <div
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      border: `2px solid ${withdrawReason === r ? '#DC2626' : '#D1D5DB'}`,
                      background: withdrawReason === r ? '#DC2626' : '#fff',
                    }}
                  >
                    {withdrawReason === r && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span
                    className="text-[13px]"
                    style={{
                      color: withdrawReason === r ? '#DC2626' : '#1a1a1a',
                      fontWeight: withdrawReason === r ? 700 : 500,
                    }}
                  >
                    {r}
                  </span>
                </button>
              ))}
            </div>
            {withdrawReason === '기타' && (
              <textarea
                value={withdrawReasonDetail}
                onChange={e => setWithdrawReasonDetail(e.target.value)}
                placeholder="탈퇴 사유를 직접 입력해주세요..."
                rows={3}
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none resize-none transition-all mb-3 placeholder:text-ink-muted"
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            )}
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setWithdrawStep(2)}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                이전
              </button>
              <button
                onClick={() => withdrawReason ? setWithdrawStep(4) : alert('탈퇴 사유를 선택해주세요.')}
                disabled={!withdrawReason}
                className="flex-1 h-11 rounded-lg text-[13px] font-bold transition-all disabled:cursor-not-allowed"
                style={{
                  background: withdrawReason ? '#DC2626' : '#E5E7EB',
                  color: withdrawReason ? '#fff' : '#9CA3AF',
                  boxShadow: withdrawReason ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none',
                }}
              >
                다음
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 탈퇴 최종 확인 */}
      {withdrawStep === 4 && (
        <Modal onClose={resetWithdraw}>
          <div className="bg-white rounded-2xl p-8 w-[400px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-[18px] font-extrabold text-ink mb-4">정말 탈퇴하시겠어요?</div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 mb-5 text-left">
              <div className="text-[12px] text-red-600 font-semibold leading-[1.8]">
                • 모든 학생 데이터가 삭제됩니다.<br />
                • 탐구주제 및 독서리스트 기록이 삭제됩니다.<br />
                • 결제 내역은 1년간 보관 후 삭제됩니다.<br />
                • 탈퇴 후 복구가 불가능합니다.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetWithdraw}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={resetWithdraw}
                className="flex-1 h-11 bg-red-500 text-white rounded-lg text-[13px] font-bold hover:bg-red-600 transition-all hover:-translate-y-px"
                style={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}