import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { academyState, tokenState, studentState } from '@/lib/auth/atoms'
import { supabase } from '@/lib/supabase'

export default function MiddlePending() {
  const navigate = useNavigate()
  const academy = useAtomValue(academyState)
  const setToken = useSetAtom(tokenState)
  const setStudent = useSetAtom(studentState)
  const setAcademy = useSetAtom(academyState)
  const [checking, setChecking] = useState(false)

  // 10초마다 자동으로 승인 상태 확인
  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('status, academy_id')
        .eq('id', user.id)
        .single()

      if (profile?.status === 'active') {
        navigate('/middle-student/roadmap')
      } else if (profile?.status === 'rejected') {
        alert('학원 가입이 거절되었습니다. 학원에 문의해주세요.')
        await handleLogout()
      } else if (!profile?.academy_id) {
        navigate('/middle-student/connect')
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 10000)
    return () => clearInterval(interval)
  }, [navigate])

  const handleManualCheck = async () => {
    setChecking(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setChecking(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single()

    if (profile?.status === 'active') {
      navigate('/middle-student/roadmap')
    } else if (profile?.status === 'rejected') {
      alert('학원 가입이 거절되었습니다.')
      await handleLogout()
    }
    setChecking(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setToken({ accessToken: undefined, expiresIn: undefined })
    setStudent(null)
    setAcademy({
      academyId: undefined,
      academyCode: undefined,
      academyName: undefined,
    })
    navigate('/middle-student/login')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans">
      <div className="bg-white border border-line rounded-3xl p-10 w-full max-w-[480px] shadow-[0_20px_60px_rgba(15,23,42,0.08)]">

        {/* 아이콘 */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-2xl flex items-center justify-center text-4xl mb-5 shadow-[0_8px_24px_rgba(16,185,129,0.2)] relative">
            <span className="relative z-10">⏳</span>
            <div className="absolute inset-0 rounded-2xl border-2 border-white/30 animate-pulse" />
          </div>
          <div className="text-[22px] font-extrabold text-ink tracking-tight mb-2">
            승인 대기 중이에요
          </div>
          <div className="text-[13px] text-ink-secondary leading-relaxed">
            원장님이 가입을 확인하고 있어요.<br />
            승인이 완료되면 자동으로 이동해요.
          </div>
        </div>

        {/* 학원 정보 */}
        {academy.academyName && (
          <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-5 py-4 mb-5">
            <div className="text-[11px] font-bold text-brand-middle-dark uppercase tracking-wider mb-1.5">
              연결된 학원
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[18px]">🏫</span>
              <span className="text-[16px] font-extrabold text-ink">{academy.academyName}</span>
            </div>
            {academy.academyCode && (
              <div className="text-[12px] text-ink-secondary font-medium mt-1">
                코드: <span className="font-bold tracking-wider">{academy.academyCode}</span>
              </div>
            )}
          </div>
        )}

        {/* 안내 박스 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0">💡</span>
            <div className="text-[12px] text-amber-800 leading-relaxed">
              <div className="font-semibold mb-1">승인이 안되고 있나요?</div>
              <div className="text-amber-700">
                원장님께 직접 연락하거나, 잠시 후 다시 확인해보세요.
                자동으로 10초마다 확인하고 있어요.
              </div>
            </div>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="w-full py-3.5 bg-brand-middle text-white rounded-xl text-[14px] font-bold hover:bg-brand-middle-dark transition-all shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_16px_rgba(16,185,129,0.35)] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>확인 중...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>지금 확인하기</span>
              </>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-white text-ink-secondary border border-line rounded-xl text-[13px] font-semibold hover:bg-gray-50 hover:border-ink-muted transition-all"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}