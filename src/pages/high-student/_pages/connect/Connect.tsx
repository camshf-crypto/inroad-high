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
    if (!code) {
      setError('학원 코드를 입력해주세요.')
      return
    }
    if (code !== 'ACA001') {
      setError('올바르지 않은 학원 코드예요.')
      return
    }
    setAcademy({
      academyCode: 'ACA001',
      academyName: '대치 인로드학원',
      teacherName: '김선생님',
      teacherId: 1,
    })
    navigate('/high-student/roadmap')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans">
      <div className="bg-white border border-line rounded-3xl p-10 w-full max-w-[440px] shadow-[0_20px_60px_rgba(15,23,42,0.08)]">

        {/* 헤더 */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-brand-high-dark to-brand-high rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-[0_8px_24px_rgba(37,99,235,0.2)]">
            🏫
          </div>
          <div className="text-[22px] font-extrabold text-ink tracking-tight mb-1.5">학원 연결하기</div>
          <div className="text-[13px] text-ink-secondary leading-relaxed">
            선생님에게 받은 학원 코드를 입력해서<br />
            로드맵과 피드백을 받아보세요
          </div>
        </div>

        {/* 안내 */}
        <div className="bg-brand-high-pale border border-brand-high-light rounded-xl px-4 py-3 text-[12px] text-brand-high-dark leading-relaxed mb-5">
          <div className="flex items-start gap-2">
            <span className="text-[14px] flex-shrink-0">💡</span>
            <div>
              <div className="font-semibold mb-0.5">코드를 모르면 담당 선생님께 문의해주세요.</div>
              <div className="text-ink-secondary">코드 없이도 <span className="text-brand-high-dark font-bold">탐구주제, 독서리스트</span>는 사용 가능해요.</div>
            </div>
          </div>
        </div>

        {/* 입력 */}
        <label className="text-[11px] font-bold text-ink-secondary block mb-1.5 uppercase tracking-wider">학원 코드</label>
        <input
          type="text"
          placeholder="예: ACA001"
          maxLength={10}
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleConnect()}
          className={`w-full border rounded-xl px-4 py-3.5 text-[18px] font-extrabold tracking-[4px] text-center outline-none transition-all font-sans ${
            error
              ? 'border-red-500 bg-red-50'
              : 'border-line focus:border-brand-high focus:ring-2 focus:ring-brand-high-pale'
          }`}
        />

        {/* 에러 */}
        {error && (
          <div className="text-[11px] text-red-500 font-semibold mt-2 flex items-center gap-1">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* 버튼들 */}
        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={handleConnect}
            className="w-full py-3.5 bg-brand-high text-white rounded-xl text-[14px] font-bold hover:bg-brand-high-dark transition-all shadow-[0_4px_12px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.35)]"
          >
            연결하기
          </button>
          <button
            onClick={() => navigate('/high-student/roadmap')}
            className="w-full py-3 bg-white text-ink-secondary border border-line rounded-xl text-[13px] font-semibold hover:bg-gray-50 hover:border-ink-muted transition-all"
          >
            나중에 연결할게요
          </button>
        </div>

        {/* 예시 코드 안내 */}
        <div className="mt-5 pt-5 border-t border-line-light text-center">
          <div className="text-[10px] text-ink-muted font-medium">
            🔖 테스트 코드: <span className="text-brand-high-dark font-bold">ACA001</span>
          </div>
        </div>
      </div>
    </div>
  )
}