import { useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { academyState, teachersState } from '../../_store/auth'
import type { ITeacher } from '../../_store/auth'

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

const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
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
    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480 }}>
      <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>{teacher.name} 선생님 학생 배정</div>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
        현재 배정된 학생 <span style={{ color: '#3B5BDB', fontWeight: 500 }}>{selectedStudents.length}명</span> · 클릭해서 배정/해제할 수 있어요.
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 또는 이메일 검색"
        style={{ width: '100%', height: 38, border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', marginBottom: 12 }}
        onFocus={e => e.target.style.borderColor = '#3B5BDB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['전체', '고1', '고2', '고3'].map(g => (
            <div key={g} onClick={() => setGradeFilter(g)} style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, cursor: 'pointer', background: gradeFilter === g ? '#1a1a1a' : '#fff', color: gradeFilter === g ? '#fff' : '#6B7280', border: `0.5px solid ${gradeFilter === g ? '#1a1a1a' : '#E5E7EB'}` }}>{g}</div>
          ))}
        </div>
        <div onClick={() => setUnassignedOnly(!unassignedOnly)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <div style={{ width: 32, height: 18, borderRadius: 99, background: unassignedOnly ? '#3B5BDB' : '#E5E7EB', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: unassignedOnly ? 16 : 2, transition: 'left 0.2s' }} />
          </div>
          <span style={{ fontSize: 11, color: '#6B7280' }}>미배정만</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', marginBottom: 14 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: '#6B7280' }}>검색 결과가 없어요.</div>
        ) : filtered.map(s => {
          const isSelected = selectedStudents.includes(s.id)
          const assignedToOther = teachers.some(t => t.id !== teacher.id && t.assignedStudents.includes(s.id))
          const assignedTeacher = teachers.find(t => t.id !== teacher.id && t.assignedStudents.includes(s.id))
          return (
            <div key={s.id} onClick={() => !assignedToOther && onToggle(s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: `0.5px solid ${isSelected ? '#3B5BDB' : '#E5E7EB'}`, background: isSelected ? '#EEF2FF' : assignedToOther ? '#F8F7F5' : '#fff', cursor: assignedToOther ? 'not-allowed' : 'pointer', opacity: assignedToOther ? 0.6 : 1 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${isSelected ? '#3B5BDB' : '#D1D5DB'}`, background: isSelected ? '#3B5BDB' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isSelected && <span style={{ fontSize: 10, color: '#fff' }}>✓</span>}
              </div>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#3B5BDB', fontWeight: 500, flexShrink: 0 }}>{s.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#1a1a1a', fontWeight: isSelected ? 500 : 400 }}>{s.name}</span>
                  {isSelected && <span style={{ fontSize: 10, color: '#3B5BDB', background: '#EEF2FF', padding: '1px 6px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>배정됨</span>}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{s.email} · {s.grade}</div>
              </div>
              {assignedToOther && <span style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 99, flexShrink: 0 }}>{assignedTeacher?.name} 배정중</span>}
              {isSelected && !assignedToOther && <span style={{ fontSize: 10, color: '#DC2626', background: '#FEE2E2', padding: '2px 7px', borderRadius: 99, flexShrink: 0 }}>클릭시 해제</span>}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: '#6B7280' }}>선택된 학생 <span style={{ color: '#3B5BDB', fontWeight: 500 }}>{selectedStudents.length}명</span></span>
        <span style={{ fontSize: 11, color: '#6B7280' }}>{filtered.length}명 표시중</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
        <button onClick={onSave} style={{ flex: 1, height: 40, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>저장하기</button>
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

  // 선생님 추가
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

  const SEC = { background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, padding: 24 } as React.CSSProperties
  const LABEL = { fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 5, display: 'block' } as React.CSSProperties
  const INPUT = { width: '100%', height: 40, border: '0.5px solid #E5E7EB', borderRadius: 7, padding: '0 12px', fontSize: 13, outline: 'none' } as React.CSSProperties

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

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', marginBottom: 3 }}>학원 설정</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>학원 정보와 선생님을 관리하세요.</div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[{ key: 'basic', label: '기본 정보' }, { key: 'teachers', label: `선생님 관리 (${teachers.length})` }].map(t => (
          <div key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding: '7px 18px', borderRadius: 99, fontSize: 13, cursor: 'pointer', background: tab === t.key ? '#3B5BDB' : '#fff', color: tab === t.key ? '#fff' : '#6B7280', border: `0.5px solid ${tab === t.key ? '#3B5BDB' : '#E5E7EB'}`, fontWeight: tab === t.key ? 500 : 400 }}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'basic' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={SEC}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 20, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>학원 기본 정보</div>
            {[
              { label: '학원명', value: academyName, setter: setAcademyName, placeholder: '학원 이름을 입력해주세요' },
              { label: '원장명', value: ownerName, setter: setOwnerName, placeholder: '원장님 성함을 입력해주세요' },
              { label: '연락처', value: phone, setter: setPhone, placeholder: '010-0000-0000' },
              { label: '주소', value: address, setter: setAddress, placeholder: '학원 주소를 입력해주세요' },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <label style={LABEL}>{f.label}</label>
                <input value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} style={INPUT}
                  onFocus={e => e.target.style.borderColor = '#3B5BDB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
              </div>
            ))}
            <button onClick={handleSave} style={{ width: '100%', height: 42, background: saved ? '#059669' : '#3B5BDB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', marginTop: 8 }}>
              {saved ? '✓ 저장됐어요!' : '저장하기'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={SEC}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 16, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>학원 코드</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F7F5', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#3B5BDB', letterSpacing: '0.1em' }}>{academy.academyCode}</div>
                <button onClick={() => navigator.clipboard.writeText(academy.academyCode || '')} style={{ padding: '6px 14px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>복사</button>
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 10, lineHeight: 1.5 }}>학원 코드는 변경할 수 없어요. 학생들에게 이 코드를 공유해주세요.</div>
            </div>

            <div style={SEC}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 16, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>비밀번호 변경</div>
              {[
                { label: '현재 비밀번호', value: currentPw, setter: setCurrentPw },
                { label: '새 비밀번호', value: newPw, setter: setNewPw },
                { label: '새 비밀번호 확인', value: confirmPw, setter: setConfirmPw },
              ].map((f, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <label style={LABEL}>{f.label}</label>
                  <input type="password" value={f.value} onChange={e => { f.setter(e.target.value); setPwError('') }} placeholder="••••••••"
                    style={{ ...INPUT, borderColor: pwError ? '#DC2626' : '#E5E7EB' }}
                    onFocus={e => e.target.style.borderColor = pwError ? '#DC2626' : '#3B5BDB'}
                    onBlur={e => e.target.style.borderColor = pwError ? '#DC2626' : '#E5E7EB'} />
                </div>
              ))}
              <div style={{ background: '#F8F7F5', borderRadius: 7, padding: '8px 12px', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.8 }}>
                  {[
                    { label: '8자 이상', ok: newPw.length >= 8 },
                    { label: '숫자 포함', ok: /[0-9]/.test(newPw) },
                    { label: '특수문자 포함', ok: /[!@#$%^&*(),.?":{}|<>]/.test(newPw) },
                  ].map((c, i) => (
                    <span key={i} style={{ marginRight: 10, color: c.ok ? '#059669' : '#9CA3AF', fontWeight: c.ok ? 500 : 400 }}>
                      {c.ok ? '✓' : '○'} {c.label}
                    </span>
                  ))}
                </div>
              </div>
              {pwError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FEE2E2', borderRadius: 7, padding: '8px 12px', marginBottom: 10 }}>
                  <span style={{ fontSize: 13 }}>⚠️</span>
                  <span style={{ fontSize: 12, color: '#DC2626' }}>{pwError}</span>
                </div>
              )}
              <button onClick={handlePwChange} style={{ width: '100%', height: 38, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', marginTop: 4 }}>비밀번호 변경</button>
            </div>

            <div style={SEC}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 16, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>계정 관리</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14, lineHeight: 1.6 }}>학원 계정을 탈퇴하면 모든 학생 데이터와 기록이 삭제됩니다.<br />탈퇴 전 반드시 데이터를 백업해주세요.</div>
              <button onClick={() => setWithdrawStep(1)} style={{ width: '100%', height: 38, background: '#fff', color: '#DC2626', border: '0.5px solid #DC2626', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>학원 계정 탈퇴</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'teachers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#6B7280' }}>
              총 <span style={{ color: '#3B5BDB', fontWeight: 500 }}>{teachers.length}명</span> · 활성 {teachers.filter(t => t.status === '활성').length}명
            </div>
            <button onClick={() => setShowAddModal(true)} style={{ padding: '8px 16px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              + 선생님 추가
            </button>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8F7F5' }}>
                  {['이름', '이메일', '연락처', '담당 학생', '상태', '합류일', ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 20px', fontSize: 11, color: '#6B7280', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: i < teachers.length - 1 ? '0.5px solid #E5E7EB' : 'none' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#3B5BDB', fontWeight: 500 }}>{t.name[0]}</div>
                        <span style={{ fontSize: 13, color: '#1a1a1a' }}>{t.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: '#6B7280' }}>{t.email}</td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: '#6B7280' }}>{t.phone}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: 12, color: t.assignedStudents.length > 0 ? '#3B5BDB' : '#6B7280', background: t.assignedStudents.length > 0 ? '#EEF2FF' : '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>{t.assignedStudents.length}명</span>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: t.status === '활성' ? '#ECFDF5' : '#EEF2FF', color: t.status === '활성' ? '#059669' : '#3B5BDB', border: `0.5px solid ${t.status === '활성' ? '#6EE7B7' : '#BAC8FF'}` }}>{t.status}</span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: '#6B7280' }}>{t.joinDate}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openAssign(t)} style={{ fontSize: 11, color: '#3B5BDB', border: '0.5px solid #3B5BDB', background: '#fff', padding: '3px 10px', borderRadius: 99, cursor: 'pointer' }}>학생 배정</button>
                        <button onClick={() => setDeleteTarget(t)} style={{ fontSize: 11, color: '#DC2626', border: '0.5px solid #DC2626', background: '#fff', padding: '3px 10px', borderRadius: 99, cursor: 'pointer' }}>삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 선생님 추가 모달 */}
      {showAddModal && (
        <Modal onClose={() => { setShowAddModal(false); resetAdd() }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 420 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>선생님 추가</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>선생님 계정을 바로 만들어요.</div>
            {[
              { label: '이름', value: addName, setter: setAddName, placeholder: '선생님 성함', type: 'text' },
              { label: '이메일', value: addEmail, setter: setAddEmail, placeholder: 'teacher@example.com', type: 'email' },
              { label: '연락처', value: addPhone, setter: setAddPhone, placeholder: '010-0000-0000', type: 'text' },
              { label: '비밀번호', value: addPw, setter: setAddPw, placeholder: '4자 이상', type: 'password' },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <label style={LABEL}>{f.label}</label>
                <input type={f.type} value={f.value} onChange={e => { f.setter(e.target.value); setAddError('') }} placeholder={f.placeholder}
                  style={INPUT} onFocus={e => e.target.style.borderColor = '#3B5BDB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
              </div>
            ))}
            {addError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FEE2E2', borderRadius: 7, padding: '8px 12px', marginBottom: 12 }}>
                <span style={{ fontSize: 12 }}>⚠️</span>
                <span style={{ fontSize: 12, color: '#DC2626' }}>{addError}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => { setShowAddModal(false); resetAdd() }} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={handleAddTeacher} style={{ flex: 1, height: 40, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>계정 만들기</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 선생님 추가 확인 모달 */}
      {showAddConfirm && (
        <Modal onClose={() => setShowAddConfirm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>👨‍🏫</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>계정을 만드시겠어요?</div>
            <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#6B7280' }}>이름</span><span style={{ color: '#1a1a1a' }}>{addName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#6B7280' }}>이메일</span><span style={{ color: '#1a1a1a' }}>{addEmail}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#6B7280' }}>연락처</span><span style={{ color: '#1a1a1a' }}>{addPhone || '-'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAddConfirm(false)} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>돌아가기</button>
              <button onClick={confirmAddTeacher} style={{ flex: 1, height: 40, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>확인</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 학생 배정 모달 */}
      {assignTarget && !showAssignConfirm && (
        <Modal onClose={() => setAssignTarget(null)}>
          <AssignModal teacher={assignTarget} teachers={teachers} selectedStudents={selectedStudents} onToggle={toggleStudent} onSave={() => setShowAssignConfirm(true)} onClose={() => setAssignTarget(null)} />
        </Modal>
      )}

      {/* 학생 배정 확인 */}
      {showAssignConfirm && assignTarget && (
        <Modal onClose={() => setShowAssignConfirm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>학생을 배정하시겠어요?</div>
            <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#6B7280' }}>선생님</span><span style={{ color: '#1a1a1a' }}>{assignTarget.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#6B7280' }}>담당 학생</span><span style={{ color: '#3B5BDB', fontWeight: 500 }}>{selectedStudents.length}명</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAssignConfirm(false)} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>돌아가기</button>
              <button onClick={handleAssignSave} style={{ flex: 1, height: 40, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>확인</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 선생님 삭제 확인 */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>{deleteTarget.name} 선생님을 삭제하시겠어요?</div>
            <div style={{ background: '#FEE2E2', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#DC2626', lineHeight: 1.6 }}>담당 학생 {deleteTarget.assignedStudents.length}명의 배정이 해제됩니다.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={handleDeleteTeacher} style={{ flex: 1, height: 40, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>삭제</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 비밀번호 변경 완료 */}
      {showPwConfirm && (
        <Modal onClose={() => setShowPwConfirm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 340, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>비밀번호가 변경됐어요!</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 24 }}>다음 로그인부터 새 비밀번호를 사용해주세요.</div>
            <button onClick={() => { setShowPwConfirm(false); setCurrentPw(''); setNewPw(''); setConfirmPw('') }} style={{ width: '100%', height: 40, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>확인</button>
          </div>
        </Modal>
      )}

      {/* 탈퇴 1단계 */}
      {withdrawStep === 1 && (
        <Modal onClose={resetWithdraw}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 400 }}>
            <div style={{ fontSize: 11, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: 99, display: 'inline-block', marginBottom: 8 }}>1 / 3단계</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 6 }}>학원 코드를 입력해주세요</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>학원 코드를 정확히 입력해야 다음 단계로 넘어갑니다.</div>
            <label style={LABEL}>학원 코드</label>
            <input value={withdrawCode} onChange={e => setWithdrawCode(e.target.value)} placeholder={`예: ${academy.academyCode}`}
              style={{ ...INPUT, marginBottom: 20 }} onFocus={e => e.target.style.borderColor = '#DC2626'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={resetWithdraw} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={() => withdrawCode === academy.academyCode ? setWithdrawStep(2) : alert('학원 코드가 맞지 않아요.')}
                style={{ flex: 1, height: 40, background: withdrawCode ? '#DC2626' : '#E5E7EB', color: withdrawCode ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, cursor: withdrawCode ? 'pointer' : 'not-allowed' }}>다음</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 탈퇴 2단계 */}
      {withdrawStep === 2 && (
        <Modal onClose={resetWithdraw}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 400 }}>
            <div style={{ fontSize: 11, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: 99, display: 'inline-block', marginBottom: 8 }}>2 / 3단계</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 6 }}>원장님 연락처를 입력해주세요</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>등록된 연락처를 정확히 입력해야 다음 단계로 넘어갑니다.</div>
            <label style={LABEL}>연락처</label>
            <input value={withdrawPhone} onChange={e => setWithdrawPhone(e.target.value)} placeholder="010-0000-0000"
              style={{ ...INPUT, marginBottom: 20 }} onFocus={e => e.target.style.borderColor = '#DC2626'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setWithdrawStep(1)} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>이전</button>
              <button onClick={() => withdrawPhone === phone ? setWithdrawStep(3) : alert('연락처가 맞지 않아요.')}
                style={{ flex: 1, height: 40, background: withdrawPhone ? '#DC2626' : '#E5E7EB', color: withdrawPhone ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, cursor: withdrawPhone ? 'pointer' : 'not-allowed' }}>다음</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 탈퇴 3단계 */}
      {withdrawStep === 3 && (
        <Modal onClose={resetWithdraw}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 400 }}>
            <div style={{ fontSize: 11, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: 99, display: 'inline-block', marginBottom: 8 }}>3 / 3단계</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 6 }}>탈퇴 사유를 알려주세요</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>서비스 개선에 소중히 활용할게요.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {WITHDRAW_REASONS.map((r, i) => (
                <div key={i} onClick={() => setWithdrawReason(r)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: `0.5px solid ${withdrawReason === r ? '#DC2626' : '#E5E7EB'}`, background: withdrawReason === r ? '#FEE2E2' : '#fff', cursor: 'pointer' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${withdrawReason === r ? '#DC2626' : '#D1D5DB'}`, background: withdrawReason === r ? '#DC2626' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {withdrawReason === r && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 13, color: withdrawReason === r ? '#DC2626' : '#1a1a1a' }}>{r}</span>
                </div>
              ))}
            </div>
            {withdrawReason === '기타' && (
              <textarea value={withdrawReasonDetail} onChange={e => setWithdrawReasonDetail(e.target.value)} placeholder="탈퇴 사유를 직접 입력해주세요..." rows={3}
                style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: 14 }} />
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setWithdrawStep(2)} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>이전</button>
              <button onClick={() => withdrawReason ? setWithdrawStep(4) : alert('탈퇴 사유를 선택해주세요.')}
                style={{ flex: 1, height: 40, background: withdrawReason ? '#DC2626' : '#E5E7EB', color: withdrawReason ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, cursor: withdrawReason ? 'pointer' : 'not-allowed' }}>다음</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 탈퇴 최종 확인 */}
      {withdrawStep === 4 && (
        <Modal onClose={resetWithdraw}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>정말 탈퇴하시겠어요?</div>
            <div style={{ background: '#FEE2E2', borderRadius: 8, padding: '12px 14px', marginBottom: 20, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: '#DC2626', lineHeight: 1.7 }}>
                • 모든 학생 데이터가 삭제됩니다.<br />
                • 탐구주제 및 독서리스트 기록이 삭제됩니다.<br />
                • 결제 내역은 1년간 보관 후 삭제됩니다.<br />
                • 탈퇴 후 복구가 불가능합니다.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={resetWithdraw} style={{ flex: 1, height: 40, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={resetWithdraw} style={{ flex: 1, height: 40, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>탈퇴하기</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}