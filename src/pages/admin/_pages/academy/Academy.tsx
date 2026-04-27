import { useAtomValue } from 'jotai'
import { academyState } from '../../_store/auth'
import { useState } from 'react'

// 파랑 테마
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

export default function Academy() {
  const academy = useAtomValue(academyState)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(academy.academyCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKakao = () => {
    // 카카오톡 공유 (추후 구현)
    alert('카카오톡 공유 기능은 곧 지원됩니다! 📢')
  }

  return (
    <div className="px-8 py-7 min-h-[calc(100vh-50px)] bg-[#F8FAFC] font-sans text-ink">

      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-2.5">
        <span className="text-2xl">🔑</span>
        <div>
          <div className="text-[22px] font-extrabold text-ink tracking-tight mb-0.5">학원 코드 관리</div>
          <div className="text-[13px] text-ink-secondary font-medium">
            학생들에게 학원 코드를 공유해주세요.
          </div>
        </div>
      </div>

      {/* 메인 코드 카드 */}
      <div
        className="rounded-2xl mb-5 p-10 text-center relative overflow-hidden"
        style={{
          background: THEME.gradient,
          boxShadow: '0 12px 32px rgba(37, 99, 235, 0.25)',
        }}
      >
        {/* 배경 장식 */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)',
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.1), transparent 70%)',
          }}
        />

        <div className="relative">
          <div className="inline-block text-[11px] font-bold text-white/90 uppercase tracking-[0.2em] px-3 py-1 bg-white/15 rounded-full mb-4 backdrop-blur-sm">
            학원 코드
          </div>
          <div
            className="text-[56px] font-black text-white tracking-[0.15em] mb-3"
            style={{
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            }}
          >
            {academy.academyCode}
          </div>
          <div className="text-[14px] text-white/90 font-semibold mb-8 flex items-center justify-center gap-1.5">
            <span>🏫</span>
            <span>{academy.academyName}</span>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleCopy}
              className="px-6 py-3 rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
              style={{
                background: copied ? '#059669' : '#fff',
                color: copied ? '#fff' : THEME.accentDark,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              {copied ? '✓ 복사됨!' : '📋 코드 복사'}
            </button>
            <button
              onClick={handleKakao}
              className="px-6 py-3 rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px border"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(10px)',
              }}
            >
              💬 카카오톡 공유
            </button>
          </div>
        </div>
      </div>

      {/* 안내 카드 */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-lg">💡</span>
          <div className="text-[15px] font-bold text-ink tracking-tight">학원 코드 사용 방법</div>
        </div>

        <div className="flex flex-col gap-3">
          {[
            '학생이 비커스에 회원가입을 합니다.',
            '마이페이지에서 학원 코드 입력 메뉴를 선택합니다.',
            '위 학원 코드를 입력하면 학원에 자동으로 연결됩니다.',
            '원장님 어드민에서 학생 목록에 추가된 것을 확인할 수 있어요.',
          ].map((t, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-gray-50"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0"
                style={{ background: THEME.gradient }}
              >
                {i + 1}
              </div>
              <div className="text-[13px] text-ink-secondary font-medium leading-[1.7] pt-0.5">{t}</div>
            </div>
          ))}
        </div>

        {/* 팁 박스 */}
        <div
          className="mt-5 rounded-lg px-4 py-3 flex items-start gap-2.5"
          style={{
            background: THEME.accentBg,
            border: `1px solid ${THEME.accentBorder}60`,
          }}
        >
          <span className="text-base flex-shrink-0 mt-0.5">✨</span>
          <div>
            <div className="text-[12px] font-bold mb-0.5" style={{ color: THEME.accentDark }}>
              Tip
            </div>
            <div className="text-[12px] font-medium leading-[1.6]" style={{ color: THEME.accentDark }}>
              코드를 카카오톡 공유하거나 학원 공지사항에 올리면 학생들이 편하게 연결할 수 있어요.
            </div>
          </div>
        </div>
      </div>

      {/* 추가 액션 카드 */}
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3 mt-5">
        <div
          className="bg-white border border-line rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = THEME.accentBorder
            e.currentTarget.style.boxShadow = `0 8px 24px ${THEME.accentShadow}`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#E5E7EB'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)'
          }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{ background: THEME.accentBg }}
            >
              📊
            </div>
            <div className="text-[14px] font-bold text-ink">연결된 학생 보기</div>
          </div>
          <div className="text-[12px] text-ink-secondary font-medium leading-[1.6]">
            학원 코드로 가입한 학생 목록을 확인하세요.
          </div>
        </div>

        <div
          className="bg-white border border-line rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = THEME.accentBorder
            e.currentTarget.style.boxShadow = `0 8px 24px ${THEME.accentShadow}`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#E5E7EB'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)'
          }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{ background: THEME.accentBg }}
            >
              🔄
            </div>
            <div className="text-[14px] font-bold text-ink">코드 재발급</div>
          </div>
          <div className="text-[12px] text-ink-secondary font-medium leading-[1.6]">
            보안 문제시 새 코드를 발급받을 수 있어요.
          </div>
        </div>
      </div>
    </div>
  )
}