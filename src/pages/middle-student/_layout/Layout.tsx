import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { academyState, tokenState, studentState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'

const MENUS = [
  { path: '/middle-student/roadmap', label: '내 커리큘럼', icon: '⊞' },
  { path: '/middle-student/lesson', label: '수업 영상', icon: '🎬' },
  { path: '/middle-student/homework', label: '숙제', icon: '📝' },
  { path: '/middle-student/suhaeng', label: '수행평가', icon: '🎯', isNew: true },
  { path: '/middle-student/book', label: '독서리스트', icon: '📚' },
  { path: '/middle-student/expect', label: '자소서 · 예상질문', icon: '💬' },
  { path: '/middle-student/past', label: '기출문제', icon: '🎓' },
  { path: '/middle-student/simulation', label: '면접 시뮬레이션', icon: '🎙️' },
  { path: '/middle-student/presentation', label: '제시문 면접', icon: '📄' },
]

const MIDDLE_GRADES = ['중1', '중2', '중3'] as const

export default function MiddleLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const academy = useAtomValue(academyState)
  const student = useAtomValue(studentState)
  const setToken = useSetAtom(tokenState)
  const setStudent = useSetAtom(studentState)
  const setAcademy = useSetAtom(academyState)

  // 학원 연결 여부
  const isAcademyConnected = !!academy.academyId

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setToken({ accessToken: undefined, expiresIn: undefined })
    setStudent(null)
    setAcademy({ academyCode: undefined, academyName: undefined, teacherName: undefined, teacherId: undefined, academyId: undefined, })
    navigate('/middle-student/login')
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans">

      {/* 사이드바 */}
      <aside className="w-[220px] bg-white border-r border-line flex flex-col flex-shrink-0">
        {/* 로고 + 학원 정보 */}
        <div className="px-5 pt-5 pb-4 border-b border-line-light">
          <div className="flex items-center gap-2 mb-3">
            <div className="font-extrabold text-[17px] text-ink tracking-tight">비커스</div>
          </div>

          {academy.academyName ? (
            <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg p-3">
              <div className="text-[13px] font-bold text-brand-middle-dark">{academy.academyCode}</div>
              <div className="text-[11px] text-ink-secondary mt-0.5">{academy.academyName}</div>
            </div>
          ) : (
            // 학원 미연결 - 정사각형 박스 (고등 스타일과 통일)
            <div className="flex items-center justify-center">
              <div className="w-20 h-20 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-line bg-gray-50">
                <span className="text-[20px] mb-0.5 opacity-40">🏫</span>
                <span className="text-[9px] font-medium text-ink-muted">미연결</span>
              </div>
            </div>
          )}
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          {MENUS.map(m => {
            const isActive = location.pathname === m.path || location.pathname.startsWith(m.path)
            const isLocked = !isAcademyConnected

            return (
              <button
                key={m.path}
                onClick={() => {
                  if (isLocked) return
                  navigate(m.path)
                }}
                disabled={isLocked}
                title={isLocked ? '학원 연결 후 사용 가능해요' : ''}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 transition-all text-[13px] ${
                  isLocked
                    ? 'text-ink-muted cursor-not-allowed opacity-50'
                    : isActive
                      ? 'bg-brand-middle-pale text-brand-middle-dark font-semibold'
                      : 'text-ink-secondary hover:bg-gray-50 hover:text-ink font-medium'
                }`}
              >
                <span className="text-[15px]">{m.icon}</span>
                <span className="flex-1 text-left">{m.label}</span>
                {m.isNew && !isLocked && (
                  <span className="text-[9px] font-extrabold text-white bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0.5 rounded-full tracking-tight shadow-sm">
                    NEW
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-line-light">
          <div className="text-[11px] text-ink-muted">© 2026 B-KEARS</div>
        </div>
      </aside>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* GNB */}
        <header className="h-12 bg-white border-b border-line flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            {!isAcademyConnected && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                학원 미연결
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {student?.name && (
              <div className="text-[13px] font-medium text-ink-secondary">
                <span className="text-ink font-semibold">{student.name}</span>님
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-[12px] font-medium text-ink-secondary px-3 py-1.5 border border-line rounded-lg hover:bg-gray-50 hover:border-ink-muted transition-all"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="flex-1 overflow-hidden bg-white relative">
          {!isAcademyConnected ? (
            <ConnectForm />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────
// 학원 연결 폼 (중등용 - 초록 테마)
// ───────────────────────────────────────────────
function ConnectForm() {
  const setAcademy = useSetAtom(academyState)
  const setStudent = useSetAtom(studentState)

  const [code, setCode] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState<typeof MIDDLE_GRADES[number] | ''>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    if (!code.trim()) {
      setError('학원 코드를 입력해주세요.')
      return
    }
    if (!school.trim()) {
      setError('학교 이름을 입력해주세요.')
      return
    }
    if (!grade) {
      setError('학년을 선택해주세요.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: dbError } = await supabase
        .from('academies')
        .select('id, academy_code, name')
        .eq('academy_code', code)
        .maybeSingle()

      if (dbError) throw dbError

      if (!data) {
        setError('올바르지 않은 학원 코드예요.')
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            academy_id: data.id,
            school: school.trim(),
            grade: grade,
            status: 'pending',
          })
          .eq('id', user.id)

        if (updateError) throw updateError

        setStudent(prev => prev ? {
          ...prev,
          grade: grade,
        } : prev)
      }

      setAcademy({
        academyId: data.id,
        academyCode: data.academy_code,
        academyName: data.name,
        teacherName: undefined,
        teacherId: undefined,
      })

      window.location.href = '/middle-student/pending'
    } catch (e: any) {
      setError('연결 중 오류가 발생했어요: ' + e.message)
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center p-6 bg-gradient-to-br from-[#F8FAFC] via-white to-brand-middle-pale/30">
      <div className="max-w-[480px] w-full">

        {/* 헤더 */}
        <div className="text-center mb-6">
          <div
            className="w-20 h-20 mx-auto bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-3xl flex items-center justify-center text-4xl mb-4"
            style={{ boxShadow: '0 12px 32px rgba(16, 185, 129, 0.25)' }}
          >
            🏫
          </div>
          <div className="text-[24px] font-extrabold text-ink tracking-tight mb-1.5">학원 연결하기</div>
          <div className="text-[13px] text-ink-secondary leading-relaxed">
            선생님께 받은 학원 코드와 본인 정보를 입력해주세요
          </div>
        </div>

        {/* 폼 카드 */}
        <div
          className="bg-white border-2 border-brand-middle-light rounded-3xl p-7"
          style={{ boxShadow: '0 12px 40px rgba(16, 185, 129, 0.1)' }}
        >

          {/* 학원 코드 */}
          <div className="mb-4">
            <label className="text-[11px] font-bold text-ink-secondary block mb-1.5 uppercase tracking-wider">학원 코드</label>
            <input
              type="text"
              placeholder="예: MW001"
              maxLength={10}
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
              disabled={loading}
              className={`w-full border rounded-xl px-4 py-3.5 text-[18px] font-extrabold tracking-[4px] text-center outline-none transition-all font-sans ${
                error.includes('코드')
                  ? 'border-red-500 bg-red-50'
                  : 'border-line focus:border-brand-middle focus:ring-2 focus:ring-brand-middle-pale'
              }`}
            />
          </div>

          {/* 학교 */}
          <div className="mb-4">
            <label className="text-[11px] font-bold text-ink-secondary block mb-1.5 uppercase tracking-wider">학교</label>
            <input
              type="text"
              placeholder="예: 서울중학교"
              value={school}
              onChange={e => { setSchool(e.target.value); setError('') }}
              disabled={loading}
              className={`w-full border rounded-xl px-4 py-3 text-[14px] font-medium outline-none transition-all placeholder:text-ink-muted ${
                error.includes('학교')
                  ? 'border-red-500 bg-red-50'
                  : 'border-line focus:border-brand-middle focus:ring-2 focus:ring-brand-middle-pale'
              }`}
            />
          </div>

          {/* 학년 */}
          <div className="mb-4">
            <label className="text-[11px] font-bold text-ink-secondary block mb-1.5 uppercase tracking-wider">학년</label>
            <div className="grid grid-cols-3 gap-2">
              {MIDDLE_GRADES.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => { setGrade(g); setError('') }}
                  disabled={loading}
                  className="py-3 rounded-xl border-2 text-[14px] font-bold transition-all"
                  style={{
                    borderColor: grade === g ? '#059669' : '#E5E7EB',
                    background: grade === g ? '#ECFDF5' : '#fff',
                    color: grade === g ? '#065F46' : '#6B7280',
                    boxShadow: grade === g ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 에러 */}
          {error && (
            <div className="text-[11px] text-red-500 font-semibold mb-3 flex items-center gap-1">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* 버튼 */}
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full py-3.5 bg-brand-middle text-white rounded-xl text-[14px] font-bold hover:bg-brand-middle-dark transition-all shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_16px_rgba(16,185,129,0.35)] disabled:opacity-60"
          >
            {loading ? '연결 중...' : '학원 연결 신청'}
          </button>
        </div>

        {/* 안내 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4">
          <div className="flex items-start gap-2">
            <span className="text-[14px] flex-shrink-0">💡</span>
            <div className="text-[12px] text-amber-800 leading-relaxed">
              <div className="font-semibold mb-0.5">학원 코드를 모르시나요?</div>
              <div className="text-amber-700">담당 선생님께 학원 코드를 받아주세요.</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}