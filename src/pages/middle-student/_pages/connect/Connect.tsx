import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetAtom } from 'jotai'
import { academyState, studentState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'

const MIDDLE_GRADES = ['중1', '중2', '중3'] as const

export default function MiddleConnect() {
  const navigate = useNavigate()
  const setAcademy = useSetAtom(academyState)
  const setStudent = useSetAtom(studentState)

  const [code, setCode] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState<typeof MIDDLE_GRADES[number] | ''>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    // 입력값 검증
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
      // DB에서 학원 코드로 조회
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

      // 학생 본인의 academy_id, school, grade, status 업데이트
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

        // jotai studentState 업데이트
        setStudent(prev => prev ? {
          ...prev,
          grade: grade,
        } : prev)
      }

      // 학원 정보 저장
      setAcademy({
        academyId: data.id,
        academyCode: data.academy_code,
        academyName: data.name,
        teacherName: undefined,
        teacherId: undefined,
      })

      // 승인 대기 화면으로 이동
      navigate('/middle-student/pending')
    } catch (e: any) {
      setError('연결 중 오류가 발생했어요: ' + e.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans">
      <div className="bg-white border border-line rounded-3xl p-10 w-full max-w-[460px] shadow-[0_20px_60px_rgba(15,23,42,0.08)]">

        {/* 헤더 */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-[0_8px_24px_rgba(16,185,129,0.2)]">
            🏫
          </div>
          <div className="text-[22px] font-extrabold text-ink tracking-tight mb-1.5">학원 연결하기</div>
          <div className="text-[13px] text-ink-secondary leading-relaxed">
            선생님에게 받은 학원 코드와<br />
            본인 정보를 입력해주세요
          </div>
        </div>

        {/* 안내 */}
        <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3 text-[12px] text-brand-middle-dark leading-relaxed mb-5">
          <div className="flex items-start gap-2">
            <span className="text-[14px] flex-shrink-0">💡</span>
            <div>
              <div className="font-semibold mb-0.5">코드를 모르면 담당 선생님께 문의해주세요.</div>
              <div className="text-ink-secondary">코드 없이도 <span className="text-brand-middle-dark font-bold">탐구주제, 독서리스트</span>는 사용 가능해요.</div>
            </div>
          </div>
        </div>

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
          <div className="text-[11px] text-red-500 font-semibold mt-2 flex items-center gap-1">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* 버튼들 */}
        <div className="flex flex-col gap-2 mt-5">
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full py-3.5 bg-brand-middle text-white rounded-xl text-[14px] font-bold hover:bg-brand-middle-dark transition-all shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_16px_rgba(16,185,129,0.35)] disabled:opacity-60"
          >
            {loading ? '연결 중...' : '연결하기'}
          </button>
          <button
            onClick={() => navigate('/middle-student/roadmap')}
            disabled={loading}
            className="w-full py-3 bg-white text-ink-secondary border border-line rounded-xl text-[13px] font-semibold hover:bg-gray-50 hover:border-ink-muted transition-all"
          >
            나중에 연결할게요
          </button>
        </div>
      </div>
    </div>
  )
}