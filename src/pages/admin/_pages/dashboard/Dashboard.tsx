import { useAtomValue } from 'jotai'
import { useNavigate } from 'react-router-dom'
import { academyState, teachersState } from '../../_store/auth'
import { useState } from 'react'

const HIGH_STUDENTS = [
  { id: 1, name: '김민준', grade: '고2', month: '4~5월', pct: 25, files: 2 },
  { id: 2, name: '이수현', grade: '고3', month: '7~8월', pct: 75, files: 5 },
  { id: 3, name: '박지호', grade: '고1', month: '1~2월', pct: 100, files: 3 },
  { id: 4, name: '최유진', grade: '고2', month: '4~5월', pct: 40, files: 1 },
  { id: 5, name: '정다은', grade: '고3', month: '9월', pct: 85, files: 4 },
  { id: 6, name: '강민서', grade: '고1', month: '3월', pct: 100, files: 2 },
  { id: 7, name: '윤서준', grade: '고2', month: '4~5월', pct: 60, files: 3 },
  { id: 8, name: '임지수', grade: '고1', month: '3월', pct: 50, files: 1 },
  { id: 9, name: '한지원', grade: '고3', month: '10~11월', pct: 90, files: 6 },
  { id: 10, name: '오민석', grade: '고2', month: '6월', pct: 55, files: 2 },
  { id: 11, name: '신예진', grade: '고1', month: '3월', pct: 30, files: 1 },
  { id: 12, name: '권태양', grade: '고3', month: '7~8월', pct: 80, files: 4 },
  { id: 13, name: '문지현', grade: '고2', month: '4~5월', pct: 35, files: 2 },
  { id: 14, name: '배수현', grade: '고1', month: '1~2월', pct: 100, files: 3 },
  { id: 15, name: '유재민', grade: '고3', month: '9월', pct: 70, files: 5 },
  { id: 16, name: '홍서연', grade: '고2', month: '6월', pct: 45, files: 2 },
  { id: 17, name: '전민호', grade: '고1', month: '4~5월', pct: 20, files: 1 },
  { id: 18, name: '조아현', grade: '고3', month: '10~11월', pct: 95, files: 7 },
  { id: 19, name: '임태준', grade: '고2', month: '4~5월', pct: 30, files: 1 },
  { id: 20, name: '노지은', grade: '고1', month: '3월', pct: 65, files: 2 },
]

const MIDDLE_STUDENTS = [
  { id: 101, name: '김서아', grade: '중2', month: '4월', pct: 30, files: 1 },
  { id: 102, name: '이준혁', grade: '중3', month: '6월', pct: 65, files: 3 },
  { id: 103, name: '박민아', grade: '중1', month: '3월', pct: 20, files: 0 },
  { id: 104, name: '최현우', grade: '중2', month: '5월', pct: 50, files: 2 },
  { id: 105, name: '정수빈', grade: '중3', month: '8월', pct: 80, files: 4 },
  { id: 106, name: '강지유', grade: '중1', month: '2월', pct: 10, files: 0 },
  { id: 107, name: '윤채원', grade: '중2', month: '4월', pct: 45, files: 2 },
  { id: 108, name: '임도윤', grade: '중3', month: '9월', pct: 90, files: 5 },
  { id: 109, name: '한지민', grade: '중1', month: '3월', pct: 15, files: 0 },
  { id: 110, name: '오서현', grade: '중2', month: '6월', pct: 55, files: 2 },
]

export default function Dashboard() {
  const academy = useAtomValue(academyState)
  const teachers = useAtomValue(teachersState)
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const isOwner = academy.role === 'OWNER'
  const plans = academy.plans || ['high']
  const showHigh = plans.includes('high')
  const showMiddle = plans.includes('middle')
  const showBothTabs = showHigh && showMiddle

  const defaultTab = showHigh ? 'high' : 'middle'
  const [schoolTab, setSchoolTab] = useState<'high' | 'middle'>(defaultTab)

  const isMiddle = schoolTab === 'middle'

  // 동적 컬러 (중등=초록, 고등=파랑)
  const theme = isMiddle ? {
    accent: '#059669',
    accentDark: '#065F46',
    accentBg: '#ECFDF5',
    accentBorder: '#6EE7B7',
    accentShadow: 'rgba(16, 185, 129, 0.15)',
    gradient: 'linear-gradient(135deg, #065F46, #10B981)',
  } : {
    accent: '#2563EB',
    accentDark: '#1E3A8A',
    accentBg: '#EFF6FF',
    accentBorder: '#93C5FD',
    accentShadow: 'rgba(37, 99, 235, 0.15)',
    gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
  }

  const allStudents = isMiddle ? MIDDLE_STUDENTS : HIGH_STUDENTS

  const myStudents = isOwner
    ? allStudents
    : allStudents.filter(s => {
        const myTeacher = teachers.find(t => t.id === academy.teacherId)
        return myTeacher?.assignedStudents.includes(s.id)
      })

  const assignedIds = teachers.flatMap(t => t.assignedStudents)
  const unassignedStudents = allStudents.filter(s => !assignedIds.includes(s.id))
  const recentStudents = myStudents.slice(0, 20)

  const handleCopy = () => {
    navigator.clipboard.writeText(academy.academyCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stats = [
    { label: isOwner ? '전체 학생' : '담당 학생', val: `${myStudents.length}명`, accent: true },
    { label: '이번 달 평균 진행률', val: myStudents.length > 0 ? `${Math.round(myStudents.reduce((a, s) => a + s.pct, 0) / myStudents.length)}%` : '0%', accent: false },
    { label: '완료 미션', val: '142', accent: false },
    { label: '업로드 파일', val: `${myStudents.reduce((a, s) => a + s.files, 0)}개`, accent: false },
  ]

  return (
    <div className="flex flex-col min-h-[calc(100vh-50px)] bg-[#F8FAFC] font-sans text-ink">

      <div className="flex-1 px-8 py-7">

        {/* 헤더 */}
        <div className="mb-6">
          <div className="text-[22px] font-extrabold text-ink tracking-tight mb-1">대시보드</div>
          <div className="text-[13px] text-ink-secondary font-medium">
            {isOwner ? '학원 전체 현황을 한눈에 확인하세요.' : `${academy.ownerName}님의 담당 학생 현황이에요.`}
          </div>
        </div>

        {/* 고등/중등 탭 */}
        {showBothTabs && (
          <div className="flex gap-0 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => setSchoolTab('high')}
              className="px-5 py-2 rounded-lg text-[13px] transition-all"
              style={{
                fontWeight: schoolTab === 'high' ? 700 : 500,
                background: schoolTab === 'high' ? '#fff' : 'transparent',
                color: schoolTab === 'high' ? '#2563EB' : '#6B7280',
                boxShadow: schoolTab === 'high' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
              }}
            >
              🌊 고등
            </button>
            <button
              onClick={() => setSchoolTab('middle')}
              className="px-5 py-2 rounded-lg text-[13px] transition-all"
              style={{
                fontWeight: schoolTab === 'middle' ? 700 : 500,
                background: schoolTab === 'middle' ? '#fff' : 'transparent',
                color: schoolTab === 'middle' ? '#059669' : '#6B7280',
                boxShadow: schoolTab === 'middle' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
              }}
            >
              🌱 중등
            </button>
          </div>
        )}

        {/* 미배정 학생 알림 - 원장만 */}
        {isOwner && unassignedStudents.length > 0 && (
          <div
            onClick={() => navigate('/admin/settings?tab=teachers')}
            className="rounded-xl px-5 py-3.5 mb-4 flex items-center justify-between cursor-pointer transition-all hover:-translate-y-px"
            style={{
              background: theme.accentBg,
              border: `1px solid ${theme.accentBorder}60`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <div className="text-[13px] font-bold text-ink">
                  {isMiddle ? '중등' : '고등'} 미배정 학생이 {unassignedStudents.length}명 있어요!
                </div>
                <div className="text-[11px] text-ink-secondary font-medium mt-0.5">
                  학원 설정 → 선생님 관리에서 담당 선생님을 배정해주세요.
                </div>
              </div>
            </div>
            <span className="text-[12px] font-bold" style={{ color: theme.accent }}>배정하러 가기 →</span>
          </div>
        )}

        {/* 학원 코드 - 원장만 */}
        {isOwner && (
          <div className="bg-white border border-line rounded-2xl px-6 py-5 mb-4 flex items-center justify-between shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div>
              <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">학원 코드</div>
              <div
                className="text-[26px] font-extrabold tracking-[0.1em] mb-1"
                style={{ color: theme.accent }}
              >
                {academy.academyCode}
              </div>
              <div className="text-[11px] text-ink-secondary font-medium">학생들에게 이 코드를 공유해주세요</div>
            </div>
            <button
              onClick={handleCopy}
              className="h-10 px-5 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
              style={{
                background: copied ? '#059669' : theme.accent,
                boxShadow: `0 4px 12px ${copied ? 'rgba(16, 185, 129, 0.3)' : theme.accentShadow}`,
              }}
            >
              {copied ? '✓ 복사됨!' : '📋 코드 복사'}
            </button>
          </div>
        )}

        {/* 요약 카드 */}
        <div className="grid grid-cols-4 max-md:grid-cols-2 gap-3 mb-6">
          {stats.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5"
              style={{
                background: s.accent ? theme.gradient : '#fff',
                border: s.accent ? 'none' : '1px solid #E5E7EB',
                boxShadow: s.accent
                  ? `0 8px 24px ${theme.accentShadow}`
                  : '0 2px 8px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div
                className="text-[11px] font-semibold mb-1.5"
                style={{ color: s.accent ? 'rgba(255, 255, 255, 0.8)' : '#6B7280' }}
              >
                {s.label}
              </div>
              <div
                className="text-[26px] font-extrabold tracking-tight"
                style={{ color: s.accent ? '#fff' : '#1a1a1a' }}
              >
                {s.val}
              </div>
            </div>
          ))}
        </div>

        {/* 학생 목록 */}
        <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <div>
              <div className="text-[15px] font-bold text-ink tracking-tight">
                최근 {isMiddle ? '중등' : '고등'} 학생
              </div>
              <div className="text-[11px] text-ink-secondary font-medium mt-0.5">
                {isOwner ? `최근 등록된 ${isMiddle ? '중등' : '고등'} 학생 20명` : `담당 학생 ${myStudents.length}명`}
              </div>
            </div>
            <button
              onClick={() => navigate(isMiddle ? '/admin/middle-students' : '/admin/students')}
              className="text-[12px] font-bold px-3.5 py-1.5 border rounded-full transition-all hover:-translate-y-px"
              style={{
                color: theme.accent,
                borderColor: theme.accent,
                background: '#fff',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.accentBg
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#fff'
              }}
            >
              전체 보기 →
            </button>
          </div>

          {recentStudents.length === 0 ? (
            <div className="px-10 py-10 text-center">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-[13px] text-ink-secondary font-medium">
                담당 학생이 없어요. 원장님께 학생 배정을 요청해주세요.
              </div>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {['학생', '학년', '현재 월', '진행률', '파일'].map((h, i) => (
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
                {recentStudents.map((s, i) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(isMiddle ? `/admin/middle-students/${s.id}` : `/admin/students/${s.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    style={{
                      borderBottom: i < recentStudents.length - 1 ? '1px solid #F1F5F9' : 'none',
                    }}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                          style={{ background: theme.gradient }}
                        >
                          {s.name[0]}
                        </div>
                        <div className="text-[13px] font-semibold text-ink">{s.name}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 px-2.5 py-1 rounded-full">
                        {s.grade}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-ink">{s.month}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-[100px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${s.pct}%`,
                              color: theme.accent,
                            }}
                          />
                        </div>
                        <span
                          className="text-[12px] font-bold"
                          style={{ color: theme.accent }}
                        >
                          {s.pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[12px] font-semibold text-ink-secondary">{s.files}개</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-line px-8 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="text-[11px] text-ink-muted font-medium">인로드 학원 관리 서비스</div>
        <div className="flex gap-4">
          <button className="text-[11px] text-ink-muted font-medium hover:text-brand-dark transition-colors">이용약관</button>
          <button className="text-[11px] text-ink-muted font-medium hover:text-brand-dark transition-colors">개인정보처리방침</button>
          <button className="text-[11px] text-ink-muted font-medium hover:text-brand-dark transition-colors">고객센터</button>
        </div>
        <div className="text-[10px] text-ink-muted font-medium">© 2026 Inroad. All rights reserved.</div>
      </div>
    </div>
  )
}