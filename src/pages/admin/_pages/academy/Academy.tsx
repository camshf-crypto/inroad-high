import { useAtomValue } from 'jotai'
import { academyState } from '../../_store/auth'
import { useState } from 'react'

export default function Academy() {
  const academy = useAtomValue(academyState)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(academy.academyCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', marginBottom: 3 }}>학원 코드 관리</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>학생들에게 학원 코드를 공유해주세요.</div>
      </div>

      {/* 코드 카드 */}
      <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, padding: '32px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>학원 코드</div>
        <div style={{ fontSize: 48, fontWeight: 700, color: '#3B5BDB', letterSpacing: '0.15em', marginBottom: 8 }}>{academy.academyCode}</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>{academy.academyName}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={handleCopy}
            style={{ padding: '10px 24px', background: copied ? '#059669' : '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
          >
            {copied ? '✓ 복사됨!' : '코드 복사'}
          </button>
          <button
            style={{ padding: '10px 24px', background: '#fff', color: '#3B5BDB', border: '0.5px solid #3B5BDB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
          >
            카카오톡 공유
          </button>
        </div>
      </div>

      {/* 안내 */}
      <div style={{ background: '#FFF9F5', border: '0.5px solid #BAC8FF', borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1E3A8A', marginBottom: 12 }}>학원 코드 사용 방법</div>
        {[
          '학생이 인로드에 회원가입을 합니다.',
          '마이페이지에서 학원 코드 입력 메뉴를 선택합니다.',
          '위 학원 코드를 입력하면 학원에 자동으로 연결됩니다.',
          '원장님 어드민에서 학생 목록에 추가된 것을 확인할 수 있어요.',
        ].map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#3B5BDB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontSize: 13, color: '#1E3A8A', lineHeight: 1.5 }}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  )
}