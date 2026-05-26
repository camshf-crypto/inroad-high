// src/components/SchoolSearchInput.tsx
// NEIS API로 학교 검색하는 컴포넌트 (실시간)

import { useState, useEffect, useRef } from 'react'

const NEIS_API_KEY = import.meta.env.VITE_NEIS_API_KEY

interface School {
  SD_SCHUL_CODE: string      // 학교 코드
  SCHUL_NM: string            // 학교명
  SCHUL_KND_SC_NM: string     // 학교 종류 (초/중/고)
  LCTN_SC_NM: string          // 지역
  ORG_RDNMA: string           // 주소
  ATPT_OFCDC_SC_NM: string    // 교육청
}

interface Props {
  schoolType: '중학교' | '고등학교'
  value?: string                  // 현재 선택된 학교명
  onSelect: (school: School) => void
  disabled?: boolean
  theme?: 'middle' | 'high'       // 색상 테마
  error?: boolean
}

export default function SchoolSearchInput({
  schoolType,
  value = '',
  onSelect,
  disabled = false,
  theme = 'middle',
  error = false
}: Props) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<School[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 색상 테마
  const colors = theme === 'middle' ? {
    border: '#10B981',       // 초록
    borderLight: '#A7F3D0',
    bgPale: '#ECFDF5',
    textDark: '#065F46',
    ring: 'rgba(16, 185, 129, 0.2)'
  } : {
    border: '#2563EB',       // 파랑
    borderLight: '#93C5FD',
    bgPale: '#EFF6FF',
    textDark: '#1E3A8A',
    ring: 'rgba(37, 99, 235, 0.2)'
  }

  // 디바운스 검색 (500ms 후 API 호출)
  useEffect(() => {
    if (selected) {
      setSelected(false)
      return
    }
    if (!query.trim() || query.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const url = new URL('https://open.neis.go.kr/hub/schoolInfo')
        url.searchParams.set('KEY', NEIS_API_KEY)
        url.searchParams.set('Type', 'json')
        url.searchParams.set('pIndex', '1')
        url.searchParams.set('pSize', '20')
        url.searchParams.set('SCHUL_NM', query.trim())

        const res = await fetch(url.toString())
        const data = await res.json()

        if (data.schoolInfo && data.schoolInfo[1]?.row) {
          // 학교 종류로 필터링
          const filtered = data.schoolInfo[1].row.filter(
            (s: School) => s.SCHUL_KND_SC_NM === schoolType
          )
          setResults(filtered)
          setShowDropdown(filtered.length > 0)
        } else {
          setResults([])
          setShowDropdown(false)
        }
      } catch (e) {
        console.error('[SchoolSearch]', e)
        setResults([])
        setShowDropdown(false)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [query, schoolType])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (school: School) => {
    setQuery(school.SCHUL_NM)
    setShowDropdown(false)
    setSelected(true)
    onSelect(school)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={`예: ${schoolType === '중학교' ? '서울중학교' : '대원고등학교'}`}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        disabled={disabled}
        className="w-full border rounded-xl px-4 py-3 text-[14px] font-medium outline-none transition-all placeholder:text-ink-muted disabled:opacity-60 disabled:bg-gray-50"
        style={{
          borderColor: error ? '#EF4444' : '#E5E7EB',
          background: error ? '#FEF2F2' : '#fff',
        }}
        onFocusCapture={e => {
          if (!error) {
            e.target.style.borderColor = colors.border
            e.target.style.boxShadow = `0 0 0 3px ${colors.ring}`
          }
        }}
        onBlurCapture={e => {
          e.target.style.borderColor = error ? '#EF4444' : '#E5E7EB'
          e.target.style.boxShadow = 'none'
        }}
      />

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && showDropdown && (
        <div ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-line rounded-xl shadow-lg p-4 text-center"
          style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <div className="text-3xl mb-2">🔍</div>
          <div className="text-[12px] font-bold text-ink mb-1">검색 결과가 없어요</div>
          <div className="text-[10px] text-ink-muted">학교명을 정확히 입력했는지 확인해주세요</div>
        </div>
      )}

      {showDropdown && results.length > 0 && (
        <div ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-line rounded-xl shadow-lg max-h-[280px] overflow-y-auto"
          style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          {results.map((school, i) => (
            <button
              key={school.SD_SCHUL_CODE}
              type="button"
              onClick={() => handleSelect(school)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-line-light last:border-b-0 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-[16px] flex-shrink-0">🏫</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-ink truncate">{school.SCHUL_NM}</div>
                  <div className="text-[10.5px] text-ink-muted truncate mt-0.5">
                    {school.LCTN_SC_NM} · {school.ORG_RDNMA}
                  </div>
                </div>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 text-[10px] text-ink-muted text-center border-t border-line bg-gray-50">
            💡 최대 20개까지 표시 · 더 자세히 입력하면 정확해져요
          </div>
        </div>
      )}
    </div>
  )
}