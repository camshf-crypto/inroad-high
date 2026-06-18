// src/pages/middle-student/_layout/Layout.tsx
// ⭐ 학교 선택 시 schools 테이블에 자동 INSERT
//    profiles에 school_id + school_name + school_change_count=1 저장

import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { academyState, tokenState, studentState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'
import { useStudentRealtime } from '@/lib/realtime/useStudentRealtime'
import SchoolSearchInput from '@/components/SchoolSearchInput'
import { findOrCreateSchool } from '@/pages/middle-student/_hooks/useSchoolSuhaeng'

const MENUS = [
  { path: '/middle-student/roadmap', label: '내 커리큘럼', icon: '⊞', menuKey: 'middle.roadmap' },
  { path: '/middle-student/concept', label: '진로 계열 검사', icon: '🧭', menuKey: 'middle.concept', isNew: true },
  { path: '/middle-student/lesson', label: '수업 영상', icon: '🎬', menuKey: 'middle.lesson' },
  { path: '/middle-student/homework', label: '숙제', icon: '📝', menuKey: 'middle.homework' },
  { path: '/middle-student/suhaeng', label: '수행평가', icon: '🎯', menuKey: 'middle.suhaeng' },
  { path: '/middle-student/record', label: '내 생기부', icon: '📋', menuKey: 'middle.record' },
  { path: '/middle-student/book', label: '독서리스트', icon: '📚', menuKey: 'middle.book' },
  { path: '/middle-student/debate', label: 'AI 토론', icon: '🎤', menuKey: 'middle.debate', isNew: true },
  { path: '/middle-student/basic', label: '기본 인성', icon: '💎', menuKey: 'middle.basic' },
  { path: '/middle-student/expect', label: '자소서 · 예상질문', icon: '💬', menuKey: 'middle.expect' },
  { path: '/middle-student/past', label: '기출문제', icon: '🎓', menuKey: 'middle.past' },
  { path: '/middle-student/simulation', label: '면접 시뮬레이션', icon: '🎙️', menuKey: 'middle.simulation' },
  { path: '/middle-student/presentation', label: '제시문 면접', icon: '📄', menuKey: 'middle.presentation' },
  { path: '/middle-student/record-expect', label: '생기부 예상질문', icon: '📋', menuKey: 'middle.record_expect' },
]

// 🔥 항상 표시되는 핵심 메뉴 (학원 설정과 무관하게 노출)
// ⚠️ middle.basic은 마스터에서 학원별로 켜고/끄게 하도록 제거됨!
const ALWAYS_VISIBLE_MIDDLE = ['middle.concept', 'middle.suhaeng', 'middle.debate']

const MIDDLE_GRADES = ['중1', '중2', '중3'] as const

const MIDDLE_STUDENT_TABLES = [
  'middle_roadmap', 'middle_homework_progress', 'middle_lessons_progress',
  'middle_homework_submissions', 'suhaeng_submissions', 'middle_reading',
  'jaso_essays', 'jaso_essay_answers', 'jaso_essay_feedback',
  'jaso_essay_section_history', 'jaso_questions', 'jaso_question_feedback',
  'middle_essay_wizard', 'middle_student_target_schools', 'middle_past_answers',
  'middle_simulations', 'middle_interview', 'middle_interview_analysis',
  'middle_interview_followups', 'middle_passage', 'middle_passage_answers',
  'middle_passage_analysis', 'middle_passage_followups', 'debate_sessions',
  'middle_saenggibu_item', 'middle_semester_lock', 'middle_student_concept',
]

export default function MiddleLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const academy = useAtomValue(academyState)
  const student = useAtomValue(studentState)
  const setToken = useSetAtom(tokenState)
  const setStudent = useSetAtom(studentState)
  const setAcademy = useSetAtom(academyState)

  const isAcademyConnected = !!academy.academyId
  const enabledMenus = academy.enabledMenus || []
  // 🔥 ALWAYS_VISIBLE 포함해서 필터링
  const visibleMenus = MENUS.filter(m =>
    enabledMenus.includes(m.menuKey) || ALWAYS_VISIBLE_MIDDLE.includes(m.menuKey)
  )

  useStudentRealtime({
    studentId: student?.id,
    tables: MIDDLE_STUDENT_TABLES,
    onTeacherAction: () => {
      window.dispatchEvent(new CustomEvent('teacher-action'))
    },
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setToken({ accessToken: undefined, expiresIn: undefined })
    setStudent(null)
    setAcademy({ academyCode: undefined, academyName: undefined, teacherName: undefined, teacherId: undefined, academyId: undefined, enabledMenus: [] })
    navigate('/middle-student/login')
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans">
      <aside className="w-[220px] bg-white border-r border-line flex flex-col flex-shrink-0">
        <div className="px-5 pt-3 pb-2.5 border-b border-line-light flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="font-extrabold text-[16px] text-ink tracking-tight">비커스</div>
          </div>
          {academy.academyName ? (
            <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg p-2">
              <div className="text-[12px] font-bold text-brand-middle-dark">{academy.academyCode}</div>
              <div className="text-[10px] text-ink-secondary mt-0.5">{academy.academyName}</div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="w-20 h-20 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-line bg-gray-50">
                <span className="text-[20px] mb-0.5 opacity-40">🏫</span>
                <span className="text-[9px] font-medium text-ink-muted">미연결</span>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2.5 py-1.5 overflow-hidden">
          {visibleMenus.length === 0 && isAcademyConnected ? (
            <div className="px-3 py-6 text-center">
              <div className="text-[12px] text-ink-muted font-medium">
                사용 가능한 메뉴가 없어요.<br />
                학원에 문의해주세요.
              </div>
            </div>
          ) : (
            visibleMenus.map(m => {
              const isActive = location.pathname === m.path || location.pathname.startsWith(m.path)
              const isLocked = !isAcademyConnected
              return (
                <button key={m.path} onClick={() => { if (isLocked) return; navigate(m.path) }} disabled={isLocked}
                  title={isLocked ? '학원 연결 후 사용 가능해요' : ''}
                  className={`relative w-full flex items-center gap-2 px-2.5 py-1.5 mb-0.5 rounded-lg transition-all text-[12px] ${isLocked ? 'text-ink-muted cursor-not-allowed opacity-50' : isActive ? 'bg-brand-middle-pale text-brand-middle-dark font-semibold' : 'text-ink-secondary hover:bg-gray-50 hover:text-ink font-medium'}`}>
                  <span className="text-[14px]">{m.icon}</span>
                  <span className="flex-1 text-left">{m.label}</span>
                  {m.isNew && !isLocked && <span className="text-[9px] font-extrabold text-white bg-rose-500 px-1.5 py-0.5 rounded-full leading-none">NEW</span>}
                </button>
              )
            })
          )}
        </nav>

        <div className="px-5 py-2.5 border-t border-line-light flex-shrink-0">
          <div className="text-[11px] text-ink-muted">© 2026 B-KURS</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
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
            <button onClick={handleLogout}
              className="text-[12px] font-medium text-ink-secondary px-3 py-1.5 border border-line rounded-lg hover:bg-gray-50 hover:border-ink-muted transition-all">
              로그아웃
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden bg-white relative">
          {!isAcademyConnected ? <ConnectForm /> : <Outlet />}
        </main>
      </div>
    </div>
  )
}

function ConnectForm() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [neisSchool, setNeisSchool] = useState<any>(null)
  const [grade, setGrade] = useState<typeof MIDDLE_GRADES[number] | ''>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [alreadyRequested, setAlreadyRequested] = useState(false)

  useEffect(() => {
    const checkExistingRequest = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('pending_approvals').select('id, status').eq('user_id', user.id).eq('status', 'pending').maybeSingle()
      if (data) setAlreadyRequested(true)
    }
    checkExistingRequest()
  }, [])

  const handleConnect = async () => {
    if (!code.trim()) { setError('학원 코드를 입력해주세요.'); return }
    if (!neisSchool) { setError('학교를 검색해서 선택해주세요.'); return }
    if (!grade) { setError('학년을 선택해주세요.'); return }

    setLoading(true); setError('')
    try {
      const { data, error: dbError } = await supabase.from('academies').select('id, academy_code, name').eq('academy_code', code).maybeSingle()
      if (dbError) throw dbError
      if (!data) { setError('올바르지 않은 학원 코드예요.'); setLoading(false); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('로그인 정보를 확인할 수 없어요.'); setLoading(false); return }

      // schools 테이블에 INSERT 또는 기존 ID 찾기
      const schoolInDb = await findOrCreateSchool(neisSchool)

      // ⭐ profiles에 학교 정보 + 카운트 1로 설정 (회원가입 = 1회 사용)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          school: neisSchool.SCHUL_NM,
          school_id: schoolInDb.id,
          school_name: schoolInDb.name,
          school_change_count: 1,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      const { error: approvalError } = await supabase.from('pending_approvals').insert({
        user_id: user.id, request_type: 'student', requested_role: 'middle_student',
        academy_code: code, academy_id: data.id, grade, status: 'pending',
      })

      if (approvalError) {
        if (approvalError.message.includes('duplicate')) setError('이미 신청한 내역이 있어요. 선생님 승인을 기다려주세요.')
        else throw approvalError
        setLoading(false); return
      }

      window.location.href = '/middle-student/pending'
    } catch (e: any) {
      setError('연결 중 오류가 발생했어요: ' + e.message)
      setLoading(false)
    }
  }

  if (alreadyRequested) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center p-6 bg-gradient-to-br from-[#F8FAFC] via-white to-brand-middle-pale/30">
        <div className="max-w-[480px] w-full">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-3xl flex items-center justify-center text-4xl mb-4" style={{ boxShadow: '0 12px 32px rgba(16, 185, 129, 0.25)' }}>⏳</div>
            <div className="text-[24px] font-extrabold text-ink tracking-tight mb-1.5">승인 대기 중</div>
            <div className="text-[13px] text-ink-secondary leading-relaxed">학원 연결 신청이 완료되었어요.<br />선생님 승인 후 사용할 수 있어요.</div>
          </div>
          <div className="bg-white border-2 border-brand-middle-light rounded-3xl p-7" style={{ boxShadow: '0 12px 40px rgba(16, 185, 129, 0.1)' }}>
            <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl p-4 mb-4">
              <div className="text-[14px] font-bold text-brand-middle-dark mb-1">📌 안내</div>
              <div className="text-[12px] text-ink-secondary leading-relaxed">선생님이 신청을 확인하고 승인하면<br />자동으로 정상 사용이 가능해요.<br /><br /><strong>학원에 직접 연락하면 더 빨라요!</strong></div>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/middle-student/login') }}
              className="w-full py-3 bg-gray-100 text-ink-secondary rounded-xl text-[13px] font-semibold hover:bg-gray-200 transition-all">
              로그아웃
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center p-6 bg-gradient-to-br from-[#F8FAFC] via-white to-brand-middle-pale/30">
      <div className="max-w-[480px] w-full">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-3xl flex items-center justify-center text-4xl mb-4" style={{ boxShadow: '0 12px 32px rgba(16, 185, 129, 0.25)' }}>🏫</div>
          <div className="text-[24px] font-extrabold text-ink tracking-tight mb-1.5">중등 학생 등록 신청</div>
          <div className="text-[13px] text-ink-secondary leading-relaxed">선생님께 받은 학원 코드와 본인 정보를 입력해주세요<br /><span className="text-[11px] text-brand-middle-dark font-semibold">선생님 승인 후 사용할 수 있어요</span></div>
        </div>

        <div className="bg-white border-2 border-brand-middle-light rounded-3xl p-7" style={{ boxShadow: '0 12px 40px rgba(16, 185, 129, 0.1)' }}>
          <div className="mb-4">
            <label className="text-[11px] font-bold text-ink-secondary block mb-1.5 uppercase tracking-wider">학원 코드</label>
            <input type="text" placeholder="예: MW001" maxLength={10} value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }} disabled={loading}
              className={`w-full border rounded-xl px-4 py-3.5 text-[18px] font-extrabold tracking-[4px] text-center outline-none transition-all font-sans ${error.includes('코드') ? 'border-red-500 bg-red-50' : 'border-line focus:border-brand-middle focus:ring-2 focus:ring-brand-middle-pale'}`} />
          </div>

          <div className="mb-4">
            <label className="text-[11px] font-bold text-ink-secondary block mb-1.5 uppercase tracking-wider">학교</label>
            <SchoolSearchInput
              schoolType="중학교"
              value={schoolName}
              onSelect={(s) => {
                setSchoolName(s.SCHUL_NM)
                setNeisSchool(s)
                setError('')
              }}
              disabled={loading}
              theme="middle"
              error={error.includes('학교')}
            />
            <div className="text-[10px] text-ink-muted mt-1">⚠️ 학교는 1회만 변경 가능해요</div>
          </div>

          <div className="mb-4">
            <label className="text-[11px] font-bold text-ink-secondary block mb-1.5 uppercase tracking-wider">학년</label>
            <div className="grid grid-cols-3 gap-2">
              {MIDDLE_GRADES.map(g => (
                <button key={g} type="button" onClick={() => { setGrade(g); setError('') }} disabled={loading}
                  className="py-3 rounded-xl border-2 text-[14px] font-bold transition-all"
                  style={{
                    borderColor: grade === g ? '#059669' : '#E5E7EB',
                    background: grade === g ? '#ECFDF5' : '#fff',
                    color: grade === g ? '#065F46' : '#6B7280',
                    boxShadow: grade === g ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none',
                  }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-[11px] text-red-500 font-semibold mb-3 flex items-center gap-1"><span>⚠️</span> {error}</div>}

          <button onClick={handleConnect} disabled={loading}
            className="w-full py-3.5 bg-brand-middle text-white rounded-xl text-[14px] font-bold hover:bg-brand-middle-dark transition-all shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_16px_rgba(16,185,129,0.35)] disabled:opacity-60">
            {loading ? '신청 중...' : '학원 연결 신청'}
          </button>
        </div>

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