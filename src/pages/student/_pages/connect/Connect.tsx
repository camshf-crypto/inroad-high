import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetAtom } from 'jotai'
import { academyState } from '../../_store/auth'

export default function Connect() {
  const navigate = useNavigate()
  const setAcademy = useSetAtom(academyState)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const handleConnect = () => {
    if (!code) { setError('학원 코드를 입력해주세요.'); return }
    if (code !== 'ACA001') { setError('올바르지 않은 학원 코드예요.'); return }
    setAcademy({ academyCode: 'ACA001', academyName: '대치 인로드학원', teacherName: '김선생님', teacherId: 1 })
    navigate('/student/roadmap')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 20, padding: '36px 40px', width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>학원 연결하기</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6 }}>선생님에게 받은 학원 코드를 입력해서<br />로드맵과 피드백을 받아보세요</div>
        </div>
        <div style={{ background: '#F8F7F5', borderRadius: 9, padding: '11px 14px', fontSize: 12, color: '#6B7280', lineHeight: 1.7, marginBottom: 20 }}>
          코드를 모르면 담당 선생님께 문의해주세요.<br />
          <strong style={{ color: '#3B5BDB' }}>코드 없이도 탐구주제, 독서리스트는 사용 가능해요.</strong>
        </div>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 5 }}>학원 코드</label>
        <input
          type="text"
          placeholder="예: ACA001"
          maxLength={10}
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleConnect()}
          style={{ width: '100%', border: `0.5px solid ${error ? '#EF4444' : '#E5E7EB'}`, borderRadius: 10, padding: '12px 14px', fontSize: 18, fontWeight: 700, letterSpacing: 4, textAlign: 'center', outline: 'none', fontFamily: 'inherit', marginBottom: 8 }}
        />
        {error && <div style={{ fontSize: 11, color: '#EF4444', marginBottom: 8 }}>{error}</div>}
        <button onClick={handleConnect}
          style={{ width: '100%', padding: 13, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          연결하기
        </button>
        <button onClick={() => navigate('/student/roadmap')}
          style={{ width: '100%', padding: 12, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}>
          나중에 연결할게요
        </button>
      </div>
    </div>
  )
}