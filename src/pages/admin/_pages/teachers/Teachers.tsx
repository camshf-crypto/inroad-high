// src/pages/admin/_pages/teachers/Teachers.tsx
// 선생님 관리 페이지 - 학원의 선생님 목록 관리

import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { academyState } from '@/lib/auth/atoms'
import { useAcademyTeachers, useAddTeacher, useRemoveTeacher } from '../../_hooks/useTeachers'
import type { Profile } from '@/lib/supabase'

const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
    onClick={onClose}
  >
    <div onClick={e => e.stopPropagation()}>{children}</div>
  </div>
)

export default function Teachers() {
  const academy = useAtomValue(academyState)
  const isOwner = academy.role === 'OWNER'

  const { data: teachers = [], isLoading, error } = useAcademyTeachers()
  const addTeacher = useAddTeacher()
  const removeTeacher = useRemoveTeacher()

  // 추가 모달
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addPw, setAddPw] = useState('')
  const [addError, setAddError] = useState('')

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)

  const resetAdd = () => {
    setAddName('')
    setAddEmail('')
    setAddPhone('')
    setAddPw('')
    setAddError('')
  }

  const handleAddTeacher = async () => {
    if (!addName.trim()) {
      setAddError('이름을 입력해주세요.')
      return
    }
    if (!addEmail.trim() || !addEmail.includes('@')) {
      setAddError('올바른 이메일을 입력해주세요.')
      return
    }
    if (addPw.length < 6) {
      setAddError('비밀번호는 6자 이상이어야 해요.')
      return
    }

    try {
      await addTeacher.mutateAsync({
        name: addName,
        email: addEmail,
        password: addPw,
        phone: addPhone,
      })
      setShowAddModal(false)
      resetAdd()
      alert(`${addName} 선생님이 추가되었어요!\n\n선생님께 이메일과 비밀번호를 알려주세요.\n선생님이 첫 로그인 후 비밀번호를 변경할 수 있어요.`)
    } catch (e: any) {
      setAddError(e.message || '추가에 실패했어요.')
    }
  }

  const handleDeleteTeacher = async () => {
    if (!deleteTarget) return
    try {
      await removeTeacher.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (e: any) {
      alert('삭제에 실패했어요: ' + e.message)
    }
  }

  return (
    <div className="px-8 py-7 min-h-[calc(100vh-50px)] bg-[#F8FAFC] font-sans text-ink">

      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">👨‍🏫</span>
          <div>
            <div className="text-[22px] font-extrabold text-ink tracking-tight mb-0.5">선생님 관리</div>
            <div className="text-[13px] text-ink-secondary font-medium">
              학원 선생님을 추가하고 관리하세요.
            </div>
          </div>
        </div>
        {isOwner && (
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
        )}
      </div>

      {/* 통계 */}
      <div className="mb-4">
        <div className="text-[13px] font-medium text-ink-secondary">
          총 <span className="font-bold" style={{ color: THEME.accent }}>{teachers.length}명</span>
          <span className="text-ink-muted"> · 선생님 {teachers.filter(t => t.role === 'teacher').length}명 · 원장 {teachers.filter(t => t.role === 'admin').length}명</span>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-xl px-5 py-3.5 mb-4 bg-red-50 border border-red-200">
          <div className="text-[13px] font-bold text-red-700">⚠️ 선생님 목록을 불러오지 못했어요</div>
          <div className="text-[11px] text-red-600 mt-1">{(error as Error).message}</div>
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        {isLoading ? (
          <div className="px-10 py-16 text-center">
            <div
              className="inline-block w-6 h-6 border-2 border-gray-200 rounded-full animate-spin mb-3"
              style={{ borderTopColor: THEME.accent }}
            />
            <div className="text-[13px] text-ink-secondary font-medium">선생님 목록을 불러오는 중...</div>
          </div>
        ) : teachers.length === 0 ? (
          <div className="px-10 py-16 text-center">
            <div className="text-4xl mb-3">👨‍🏫</div>
            <div className="text-[14px] text-ink-secondary font-semibold mb-1">아직 등록된 선생님이 없어요</div>
            <div className="text-[12px] text-ink-muted">
              {isOwner ? '+ 선생님 추가 버튼으로 선생님을 등록해주세요.' : '원장님이 선생님을 추가하면 여기에 표시돼요.'}
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC]">
                {['이름', '이메일', '연락처', '역할', '가입일', ''].map((h, i) => (
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
                        {(t.name || '?')[0]}
                      </div>
                      <span className="text-[13px] font-semibold text-ink">{t.name || '이름없음'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] font-medium text-ink-secondary">{t.email}</td>
                  <td className="px-5 py-3 text-[12.5px] font-medium text-ink-secondary">{t.phone || '-'}</td>
                  <td className="px-5 py-3">
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: t.role === 'admin' ? '#FEF3C7' : THEME.accentBg,
                        color: t.role === 'admin' ? '#92400E' : THEME.accent,
                        border: `1px solid ${t.role === 'admin' ? '#FCD34D' : THEME.accentBorder}60`,
                      }}
                    >
                      {t.role === 'admin' ? '👑 원장' : '👨‍🏫 선생님'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12px] font-medium text-ink-secondary">
                    {t.created_at ? t.created_at.slice(0, 10) : '-'}
                  </td>
                  <td className="px-5 py-3">
                    {isOwner && t.role !== 'admin' && (
                      <button
                        onClick={() => setDeleteTarget(t)}
                        className="text-[11px] font-bold bg-white text-red-600 border border-red-500 px-3 py-1.5 rounded-full hover:bg-red-50 transition-all"
                      >
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 선생님 추가 모달 */}
      {showAddModal && (
        <Modal onClose={() => { setShowAddModal(false); resetAdd() }}>
          <div className="bg-white rounded-2xl p-8 w-[440px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-[18px] font-extrabold text-ink mb-1">👨‍🏫 선생님 추가</div>
            <div className="text-[12px] text-ink-secondary font-medium mb-5">
              선생님 계정을 만들어요. 만든 후 이메일/비밀번호를 선생님께 전달해주세요.
            </div>

            {[
              { label: '이름', value: addName, setter: setAddName, placeholder: '선생님 성함', type: 'text' },
              { label: '이메일', value: addEmail, setter: setAddEmail, placeholder: 'teacher@example.com', type: 'email' },
              { label: '연락처', value: addPhone, setter: setAddPhone, placeholder: '010-0000-0000', type: 'text' },
              { label: '비밀번호 (임시)', value: addPw, setter: setAddPw, placeholder: '6자 이상', type: 'password' },
            ].map((f, i) => (
              <div key={i} className="mb-3">
                <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">{f.label}</label>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => { f.setter(e.target.value); setAddError('') }}
                  placeholder={f.placeholder}
                  className="w-full h-11 border border-line rounded-lg px-3.5 text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            ))}

            {addError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                <span className="text-sm">⚠️</span>
                <span className="text-[12px] text-red-600 font-semibold">{addError}</span>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              <div className="text-[11px] text-amber-800 leading-relaxed">
                💡 임시 비밀번호로 계정이 만들어져요. 선생님이 첫 로그인 후 비밀번호를 변경할 수 있어요.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddModal(false); resetAdd() }}
                disabled={addTeacher.isPending}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                취소
              </button>
              <button
                onClick={handleAddTeacher}
                disabled={addTeacher.isPending}
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: THEME.accent,
                  boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                }}
              >
                {addTeacher.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>추가 중...</span>
                  </>
                ) : (
                  <span>계정 만들기</span>
                )}
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
                선생님은 학원에서 제외되며 더 이상 학원 학생들을 볼 수 없어요.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={removeTeacher.isPending}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                취소
              </button>
              <button
                onClick={handleDeleteTeacher}
                disabled={removeTeacher.isPending}
                className="flex-1 h-11 bg-red-500 text-white rounded-lg text-[13px] font-bold hover:bg-red-600 transition-all hover:-translate-y-px disabled:opacity-60"
                style={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
              >
                {removeTeacher.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}