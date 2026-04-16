import { useAtomValue } from 'jotai'
import { useNavigate } from 'react-router-dom'
import { academyState, teachersState } from '../../_store/auth'
import { useState } from 'react'

const ALL_STUDENTS = [
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
  { id: 21, name: '서동현', grade: '고3', month: '12월', pct: 98, files: 8 },
  { id: 22, name: '남지수', grade: '고2', month: '7~8월', pct: 65, files: 3 },
  { id: 23, name: '황민준', grade: '고1', month: '4~5월', pct: 15, files: 0 },
  { id: 24, name: '송아영', grade: '고3', month: '9월', pct: 82, files: 5 },
  { id: 25, name: '류지호', grade: '고2', month: '6월', pct: 50, files: 2 },
  { id: 26, name: '채은지', grade: '고1', month: '3월', pct: 75, files: 2 },
  { id: 27, name: '변성훈', grade: '고3', month: '7~8월', pct: 88, files: 6 },
  { id: 28, name: '도하은', grade: '고2', month: '4~5월', pct: 42, files: 1 },
  { id: 29, name: '엄재영', grade: '고1', month: '1~2월', pct: 100, files: 3 },
  { id: 30, name: '방지수', grade: '고3', month: '10~11월', pct: 92, files: 7 },
]

export default function Dashboard() {
  const academy = useAtomValue(academyState)
  const teachers = useAtomValue(teachersState)
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const isOwner = academy.role === 'OWNER'

  const myStudents = isOwner
    ? ALL_STUDENTS
    : ALL_STUDENTS.filter(s => {
        const myTeacher = teachers.find(t => t.id === academy.teacherId)
        return myTeacher?.assignedStudents.includes(s.id)
      })

  const assignedIds = teachers.flatMap(t => t.assignedStudents)
  const unassignedStudents = ALL_STUDENTS.filter(s => !assignedIds.includes(s.id))
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 50px)', background: '#F8F7F5' }}>
      <div style={{ flex: 1, padding: '28px 32px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', marginBottom: 3 }}>대시보드</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            {isOwner ? '학원 전체 현황을 한눈에 확인하세요.' : `${academy.ownerName}님의 담당 학생 현황이에요.`}
          </div>
        </div>

        {/* 미배정 학생 알림 - 원장만 */}
        {isOwner && unassignedStudents.length > 0 && (
          <div onClick={() => navigate('/admin/settings?tab=teachers')}
            style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 10, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1E3A8A' }}>미배정 학생이 {unassignedStudents.length}명 있어요!</div>
                <div style={{ fontSize: 11, color: '#1E3A8A', marginTop: 2 }}>학원 설정 → 선생님 관리에서 담당 선생님을 배정해주세요.</div>
              </div>
            </div>
            <span style={{ fontSize: 12, color: '#3B5BDB' }}>배정하러 가기 →</span>
          </div>
        )}

        {/* 학원 코드 - 원장만 */}
        {isOwner && (
          <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>학원 코드</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: '#3B5BDB', letterSpacing: '0.1em' }}>{academy.academyCode}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>학생들에게 이 코드를 공유해주세요</div>
            </div>
            <button onClick={handleCopy} style={{ padding: '8px 16px', background: copied ? '#059669' : '#3B5BDB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>
              {copied ? '✓ 복사됨!' : '코드 복사'}
            </button>
          </div>
        )}

        {/* 요약 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 24 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: s.accent ? '#3B5BDB' : '#fff', border: `0.5px solid ${s.accent ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: s.accent ? 'rgba(255,255,255,0.8)' : '#6B7280', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.accent ? '#fff' : '#1a1a1a' }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* 학생 목록 */}
        <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>최근 학생</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                {isOwner ? '최근 등록된 학생 20명' : `담당 학생 ${myStudents.length}명`}
              </div>
            </div>
            <button onClick={() => navigate('/admin/students')} style={{ fontSize: 12, color: '#3B5BDB', border: '0.5px solid #3B5BDB', background: '#fff', padding: '5px 12px', borderRadius: 99, cursor: 'pointer' }}>
              전체 보기 →
            </button>
          </div>

          {recentStudents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
              담당 학생이 없어요. 원장님께 학생 배정을 요청해주세요.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8F7F5' }}>
                  {['학생', '학년', '현재 월', '진행률', '파일'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 20px', fontSize: 11, color: '#6B7280', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentStudents.map((s, i) => (
                  <tr key={s.id} onClick={() => navigate(`/admin/students/${s.id}`)}
                    style={{ borderBottom: i < recentStudents.length - 1 ? '0.5px solid #E5E7EB' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#3B5BDB', fontWeight: 500 }}>{s.name[0]}</div>
                        <div style={{ fontSize: 13, color: '#1a1a1a' }}>{s.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: 12, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>{s.grade}</span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: '#1a1a1a' }}>{s.month}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 4, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${s.pct}%`, height: '100%', background: s.pct === 100 ? '#059669' : '#3B5BDB', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{s.pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: '#6B7280' }}>{s.files}개</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#fff', borderTop: '0.5px solid #E5E7EB', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: '#6B7280' }}>인로드 학원 관리 서비스</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>이용약관</span>
          <span style={{ fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>개인정보처리방침</span>
          <span style={{ fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>고객센터</span>
        </div>
        <div style={{ fontSize: 10, color: '#6B7280' }}>© 2026 Inroad. All rights reserved.</div>
      </div>
    </div>
  )
}