// src/pages/admin/_pages/student-approval/StudentApproval.tsx
// 학생 가입 승인 페이지

import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { academyState } from '@/lib/auth/atoms'
import {
  usePendingStudents,
  useApproveStudent,
  useRejectStudent,
  useApproveAll,
} from '../../_hooks/useStudentApproval'
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

export default function StudentApproval() {
  const academy = useAtomValue(academyState)
  const isOwner = academy.role === 'OWNER'

  const { data: pendingStudents = [], isLoading, error } = usePendingStudents()
  const approveStudent = useApproveStudent()
  const rejectStudent = useRejectStudent()
  const approveAll = useApproveAll()

  const [filter, setFilter] = useState<'all' | 'high' | 'middle'>('all')
  const [rejectTarget, setRejectTarget] = useState<Profile | null>(null)
  const [showApproveAllConfirm, setShowApproveAllConfirm] = useState(false)

  // 필터링
  const filtered = pendingStudents.filter(s => {
    if (filter === 'all') return true
    if (filter === 'high') return s.role === 'high_student'
    if (filter === 'middle') return s.role === 'middle_student'
    return true
  })

  const highCount = pendingStudents.filter(s => s.role === 'high_student').length
  const middleCount = pendingStudents.filter(s => s.role === 'middle_student').length

  const handleApprove = async (studentId: string) => {
    try {
      await approveStudent.mutateAsync(studentId)
    } catch (e: any) {
      alert('승인 실패: ' + e.message)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    try {
      await rejectStudent.mutateAsync(rejectTarget.id)
      setRejectTarget(null)
    } catch (e: any) {
      alert('거절 실패: ' + e.message)
    }
  }

  const handleApproveAll = async () => {
    try {
      await approveAll.mutateAsync()
      setShowApproveAllConfirm(false)
    } catch (e: any) {
      alert('일괄 승인 실패: ' + e.message)
    }
  }

  return (
    <div className="px-8 py-7 min-h-[calc(100vh-50px)] bg-[#F8FAFC] font-sans text-ink">

      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">✋</span>
          <div>
            <div className="text-[22px] font-extrabold text-ink tracking-tight mb-0.5">학생 승인</div>
            <div className="text-[13px] text-ink-secondary font-medium">
              학원 코드로 가입한 학생을 승인해주세요.
            </div>
          </div>
        </div>
        {isOwner && pendingStudents.length > 0 && (
          <button
            onClick={() => setShowApproveAllConfirm(true)}
            className="px-5 py-2.5 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
            style={{
              background: '#059669',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            }}
          >
            ✓ 전체 승인 ({pendingStudents.length})
          </button>
        )}
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">전체 대기</div>
          <div className="flex items-baseline gap-1">
            <span className="text-[28px] font-extrabold" style={{ color: THEME.accent }}>{pendingStudents.length}</span>
            <span className="text-[13px] font-semibold text-ink-secondary">명</span>
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">🌊 고등</div>
          <div className="flex items-baseline gap-1">
            <span className="text-[28px] font-extrabold" style={{ color: '#2563EB' }}>{highCount}</span>
            <span className="text-[13px] font-semibold text-ink-secondary">명</span>
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">🌱 중등</div>
          <div className="flex items-baseline gap-1">
            <span className="text-[28px] font-extrabold" style={{ color: '#059669' }}>{middleCount}</span>
            <span className="text-[13px] font-semibold text-ink-secondary">명</span>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-1.5 mb-4">
        {[
          { key: 'all', label: `전체 (${pendingStudents.length})` },
          { key: 'high', label: `🌊 고등 (${highCount})` },
          { key: 'middle', label: `🌱 중등 (${middleCount})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className="px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
            style={{
              background: filter === f.key ? THEME.accent : '#fff',
              color: filter === f.key ? '#fff' : '#6B7280',
              borderColor: filter === f.key ? THEME.accent : '#E5E7EB',
              boxShadow: filter === f.key ? `0 2px 8px ${THEME.accentShadow}` : 'none',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-xl px-5 py-3.5 mb-4 bg-red-50 border border-red-200">
          <div className="text-[13px] font-bold text-red-700">⚠️ 학생 목록을 불러오지 못했어요</div>
          <div className="text-[11px] text-red-600 mt-1">{(error as Error).message}</div>
        </div>
      )}

      {/* 학생 목록 */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        {isLoading ? (
          <div className="px-10 py-16 text-center">
            <div
              className="inline-block w-6 h-6 border-2 border-gray-200 rounded-full animate-spin mb-3"
              style={{ borderTopColor: THEME.accent }}
            />
            <div className="text-[13px] text-ink-secondary font-medium">대기 학생을 불러오는 중...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-10 py-16 text-center">
            <div className="text-4xl mb-3">{pendingStudents.length === 0 ? '' : '🔍'}</div>
            <div className="text-[14px] text-ink-secondary font-semibold mb-1">
              {pendingStudents.length === 0 ? '승인 대기 중인 학생이 없어요!' : '해당 조건의 학생이 없어요'}
            </div>
            <div className="text-[12px] text-ink-muted">
              {pendingStudents.length === 0
                ? '학생이 학원 코드를 입력하면 여기에 표시돼요.'
                : '다른 필터를 선택해보세요.'}
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC]">
                {['학생', '학년', '이메일', '학교', '연락처', '신청일', '액션'].map((h, i) => (
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
              {filtered.map((s, i) => {
                const isMiddle = s.role === 'middle_student'
                const accent = isMiddle ? '#059669' : '#2563EB'
                const accentBg = isMiddle ? '#ECFDF5' : '#EFF6FF'
                const accentBorder = isMiddle ? '#6EE7B7' : '#93C5FD'
                const gradient = isMiddle ? 'linear-gradient(135deg, #065F46, #10B981)' : 'linear-gradient(135deg, #1E3A8A, #2563EB)'

                return (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold text-white"
                          style={{ background: gradient }}
                        >
                          {(s.name || '?')[0]}
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-ink">{s.name || '이름없음'}</div>
                          <div
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5"
                            style={{
                              background: accentBg,
                              color: accent,
                              border: `1px solid ${accentBorder}60`,
                            }}
                          >
                            {isMiddle ? '🌱 중등' : '🌊 고등'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2.5 py-1 rounded-full">
                        {s.grade || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12.5px] font-medium text-ink-secondary">{s.email}</td>
                    <td className="px-5 py-3 text-[12.5px] font-semibold text-ink">{s.school || '-'}</td>
                    <td className="px-5 py-3 text-[12px] font-medium text-ink-secondary">{s.phone || '-'}</td>
                    <td className="px-5 py-3 text-[12px] font-medium text-ink-muted">
                      {s.created_at ? s.created_at.slice(0, 10) : '-'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleApprove(s.id)}
                          disabled={approveStudent.isPending}
                          className="text-[11px] font-bold text-white px-3 py-1.5 rounded-full transition-all hover:-translate-y-px disabled:opacity-60"
                          style={{
                            background: '#059669',
                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                          }}
                        >
                          ✓ 승인
                        </button>
                        <button
                          onClick={() => setRejectTarget(s)}
                          className="text-[11px] font-bold bg-white text-red-600 border border-red-500 px-3 py-1.5 rounded-full hover:bg-red-50 transition-all"
                        >
                          거절
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 거절 확인 모달 */}
      {rejectTarget && (
        <Modal onClose={() => setRejectTarget(null)}>
          <div className="bg-white rounded-2xl p-8 w-[400px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-[16px] font-extrabold text-ink mb-3">
              {rejectTarget.name} 학생의 가입을 거절하시겠어요?
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
              <div className="text-[12px] text-red-600 font-semibold leading-[1.6]">
                학생은 학원에서 제외되며, 다시 학원 코드를 입력해야 가입할 수 있어요.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRejectTarget(null)}
                disabled={rejectStudent.isPending}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={rejectStudent.isPending}
                className="flex-1 h-11 bg-red-500 text-white rounded-lg text-[13px] font-bold hover:bg-red-600 transition-all hover:-translate-y-px disabled:opacity-60"
                style={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
              >
                {rejectStudent.isPending ? '거절 중...' : '거절'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 전체 승인 확인 */}
      {showApproveAllConfirm && (
        <Modal onClose={() => setShowApproveAllConfirm(false)}>
          <div className="bg-white rounded-2xl p-8 w-[400px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-[16px] font-extrabold text-ink mb-3">
              대기 중인 {pendingStudents.length}명을 모두 승인하시겠어요?
            </div>
            <div
              className="rounded-lg px-4 py-3 mb-5"
              style={{ background: '#ECFDF5', border: '1px solid #6EE7B7' }}
            >
              <div className="text-[12px] font-semibold leading-[1.6]" style={{ color: '#065F46' }}>
                고등 {highCount}명 + 중등 {middleCount}명이 일괄 승인돼요.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowApproveAllConfirm(false)}
                disabled={approveAll.isPending}
                className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                취소
              </button>
              <button
                onClick={handleApproveAll}
                disabled={approveAll.isPending}
                className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px disabled:opacity-60"
                style={{
                  background: '#059669',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                {approveAll.isPending ? '승인 중...' : '전체 승인'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}