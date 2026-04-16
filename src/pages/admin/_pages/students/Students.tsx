import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { academyState, teachersState } from '../../_store/auth'

const ALL_STUDENTS = [
  { id: 1, name: '김민준', grade: '고2', month: '4~5월', pct: 25, files: 2, email: 'kim@example.com', joinDate: '2025-01-15' },
  { id: 2, name: '이수현', grade: '고3', month: '7~8월', pct: 75, files: 5, email: 'lee@example.com', joinDate: '2025-01-10' },
  { id: 3, name: '박지호', grade: '고1', month: '1~2월', pct: 100, files: 3, email: 'park@example.com', joinDate: '2025-02-01' },
  { id: 4, name: '최유진', grade: '고2', month: '4~5월', pct: 40, files: 1, email: 'choi@example.com', joinDate: '2025-01-20' },
  { id: 5, name: '정다은', grade: '고3', month: '9월', pct: 85, files: 4, email: 'jung@example.com', joinDate: '2025-01-05' },
  { id: 6, name: '강민서', grade: '고1', month: '3월', pct: 100, files: 2, email: 'kang@example.com', joinDate: '2025-02-10' },
  { id: 7, name: '윤서준', grade: '고2', month: '4~5월', pct: 60, files: 3, email: 'yoon@example.com', joinDate: '2025-01-25' },
  { id: 8, name: '임지수', grade: '고1', month: '3월', pct: 50, files: 1, email: 'lim@example.com', joinDate: '2025-02-15' },
  { id: 9, name: '한지원', grade: '고3', month: '10~11월', pct: 90, files: 6, email: 'han@example.com', joinDate: '2025-01-03' },
  { id: 10, name: '오민석', grade: '고2', month: '6월', pct: 55, files: 2, email: 'oh@example.com', joinDate: '2025-01-18' },
  { id: 11, name: '신예진', grade: '고1', month: '3월', pct: 30, files: 1, email: 'shin@example.com', joinDate: '2025-02-20' },
  { id: 12, name: '권태양', grade: '고3', month: '7~8월', pct: 80, files: 4, email: 'kwon@example.com', joinDate: '2025-01-08' },
  { id: 13, name: '문지현', grade: '고2', month: '4~5월', pct: 35, files: 2, email: 'moon@example.com', joinDate: '2025-01-22' },
  { id: 14, name: '배수현', grade: '고1', month: '1~2월', pct: 100, files: 3, email: 'bae@example.com', joinDate: '2025-02-05' },
  { id: 15, name: '유재민', grade: '고3', month: '9월', pct: 70, files: 5, email: 'yu@example.com', joinDate: '2025-01-12' },
  { id: 16, name: '홍서연', grade: '고2', month: '6월', pct: 45, files: 2, email: 'hong@example.com', joinDate: '2025-01-28' },
  { id: 17, name: '전민호', grade: '고1', month: '4~5월', pct: 20, files: 1, email: 'jun@example.com', joinDate: '2025-03-01' },
  { id: 18, name: '조아현', grade: '고3', month: '10~11월', pct: 95, files: 7, email: 'jo@example.com', joinDate: '2025-01-02' },
  { id: 19, name: '임태준', grade: '고2', month: '4~5월', pct: 30, files: 1, email: 'lim2@example.com', joinDate: '2025-02-12' },
  { id: 20, name: '노지은', grade: '고1', month: '3월', pct: 65, files: 2, email: 'noh@example.com', joinDate: '2025-02-18' },
  { id: 21, name: '서동현', grade: '고3', month: '12월', pct: 98, files: 8, email: 'seo@example.com', joinDate: '2025-01-01' },
  { id: 22, name: '남지수', grade: '고2', month: '7~8월', pct: 65, files: 3, email: 'nam@example.com', joinDate: '2025-01-30' },
  { id: 23, name: '황민준', grade: '고1', month: '4~5월', pct: 15, files: 0, email: 'hwang@example.com', joinDate: '2025-03-05' },
  { id: 24, name: '송아영', grade: '고3', month: '9월', pct: 82, files: 5, email: 'song@example.com', joinDate: '2025-01-06' },
  { id: 25, name: '류지호', grade: '고2', month: '6월', pct: 50, files: 2, email: 'ryu@example.com', joinDate: '2025-02-03' },
  { id: 26, name: '채은지', grade: '고1', month: '3월', pct: 75, files: 2, email: 'chae@example.com', joinDate: '2025-02-22' },
  { id: 27, name: '변성훈', grade: '고3', month: '7~8월', pct: 88, files: 6, email: 'byun@example.com', joinDate: '2025-01-04' },
  { id: 28, name: '도하은', grade: '고2', month: '4~5월', pct: 42, files: 1, email: 'do@example.com', joinDate: '2025-02-08' },
  { id: 29, name: '엄재영', grade: '고1', month: '1~2월', pct: 100, files: 3, email: 'um@example.com', joinDate: '2025-02-28' },
  { id: 30, name: '방지수', grade: '고3', month: '10~11월', pct: 92, files: 7, email: 'bang@example.com', joinDate: '2025-01-07' },
]

const PAGE_SIZE = 10
const GRADE_TABS = ['전체', '고1', '고2', '고3']

export default function Students() {
  const navigate = useNavigate()
  const academy = useAtomValue(academyState)
  const teachers = useAtomValue(teachersState)

  const isOwner = academy.role === 'OWNER'

  // 선생님이면 담당 학생만 표시
  const baseStudents = isOwner
    ? ALL_STUDENTS
    : ALL_STUDENTS.filter(s => {
        const myTeacher = teachers.find(t => t.id === academy.teacherId)
        return myTeacher?.assignedStudents.includes(s.id)
      })

  const [grade, setGrade] = useState('전체')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'pct'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const filtered = baseStudents
    .filter(s => grade === '전체' || s.grade === grade)
    .filter(s => s.name.includes(search) || s.email.includes(search))
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir
      return (a.pct - b.pct) * dir
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key: 'name' | 'pct') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const handleGrade = (g: string) => { setGrade(g); setPage(1) }
  const handleSearch = (v: string) => { setSearch(v); setPage(1) }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', marginBottom: 3 }}>학생 관리</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>
          {isOwner ? '학원에 등록된 학생 목록을 관리하세요.' : `담당 학생 ${baseStudents.length}명을 관리하세요.`}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {GRADE_TABS.map(g => (
            <div key={g} onClick={() => handleGrade(g)} style={{ padding: '6px 16px', borderRadius: 99, fontSize: 12, cursor: 'pointer', background: grade === g ? '#3B5BDB' : '#fff', color: grade === g ? '#fff' : '#6B7280', border: `0.5px solid ${grade === g ? '#3B5BDB' : '#E5E7EB'}` }}>{g}</div>
          ))}
        </div>
        <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="이름 또는 이메일 검색" style={{ height: 36, border: '0.5px solid #E5E7EB', borderRadius: 7, padding: '0 12px', fontSize: 12, outline: 'none', width: 220 }} />
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '0.5px solid #E5E7EB' }}>
          <div style={{ fontSize: 13, color: '#6B7280' }}>
            총 <span style={{ color: '#3B5BDB', fontWeight: 500 }}>{filtered.length}명</span>
            {totalPages > 1 && <span> · {page}/{totalPages} 페이지</span>}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8F7F5' }}>
              <th onClick={() => handleSort('name')} style={{ padding: '10px 20px', fontSize: 11, color: '#6B7280', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid #E5E7EB', cursor: 'pointer' }}>학생 {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th style={{ padding: '10px 20px', fontSize: 11, color: '#6B7280', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid #E5E7EB' }}>학년</th>
              <th style={{ padding: '10px 20px', fontSize: 11, color: '#6B7280', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid #E5E7EB' }}>이메일</th>
              <th style={{ padding: '10px 20px', fontSize: 11, color: '#6B7280', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid #E5E7EB' }}>현재 월</th>
              <th onClick={() => handleSort('pct')} style={{ padding: '10px 20px', fontSize: 11, color: '#6B7280', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid #E5E7EB', cursor: 'pointer' }}>진행률 {sortKey === 'pct' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th style={{ padding: '10px 20px', fontSize: 11, color: '#6B7280', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid #E5E7EB' }}>파일</th>
              <th style={{ padding: '10px 20px', fontSize: 11, color: '#6B7280', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid #E5E7EB' }}>가입일</th>
              <th style={{ padding: '10px 20px', fontSize: 11, color: '#6B7280', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid #E5E7EB' }}></th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
                {isOwner ? '검색 결과가 없어요.' : '담당 학생이 없어요. 원장님께 학생 배정을 요청해주세요.'}
              </td></tr>
            ) : (
              paginated.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: i < paginated.length - 1 ? '0.5px solid #E5E7EB' : 'none', cursor: 'pointer' }} onClick={() => navigate(`/admin/students/${s.id}`)} onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#3B5BDB', fontWeight: 500 }}>{s.name[0]}</div>
                      <div style={{ fontSize: 13, color: '#1a1a1a' }}>{s.name}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px' }}><span style={{ fontSize: 12, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>{s.grade}</span></td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: '#6B7280' }}>{s.email}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: '#1a1a1a' }}>{s.month}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 4, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${s.pct}%`, height: '100%', background: s.pct === 100 ? '#059669' : '#3B5BDB', borderRadius: 99 }}></div>
                      </div>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{s.pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: '#6B7280' }}>{s.files}개</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: '#6B7280' }}>{s.joinDate}</td>
                  <td style={{ padding: '12px 20px' }}><span style={{ fontSize: 11, color: '#3B5BDB', border: '0.5px solid #3B5BDB', padding: '3px 10px', borderRadius: 99 }}>상세보기</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filtered.length)} / 총 {filtered.length}명</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage(1)} disabled={page === 1} style={{ height: 32, padding: '0 10px', border: '0.5px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#D1D5DB' : '#6B7280', fontSize: 11 }}>처음</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 32, height: 32, border: '0.5px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#D1D5DB' : '#6B7280', fontSize: 13 }}>←</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                return start + i
              }).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{ width: 32, height: 32, border: `0.5px solid ${page === p ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 6, background: page === p ? '#3B5BDB' : '#fff', cursor: 'pointer', color: page === p ? '#fff' : '#6B7280', fontSize: 13, fontWeight: page === p ? 500 : 400 }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 32, height: 32, border: '0.5px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#D1D5DB' : '#6B7280', fontSize: 13 }}>→</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ height: 32, padding: '0 10px', border: '0.5px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#D1D5DB' : '#6B7280', fontSize: 11 }}>마지막</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}