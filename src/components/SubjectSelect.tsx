import { useState, useRef, useEffect } from 'react'
import { SUBJECTS_2022, type Subject } from '../constants/subjects'

interface Props {
  value: string
  onChange: (value: string) => void
  grade?: number
  placeholder?: string
  disabled?: boolean
  multi?: boolean
}

export default function SubjectSelect({
  value,
  onChange,
  grade,
  placeholder = '과목 선택 또는 직접 입력',
  disabled,
  multi = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 바깥 클릭 감지
  useEffect(() => {
    if (!open) return

    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const t = setTimeout(() => {
      document.addEventListener('click', handler)
    }, 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('click', handler)
    }
  }, [open])

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filteredSubjects = (() => {
    let list: Subject[] = SUBJECTS_2022
    if (grade) list = list.filter(s => s.grades.includes(grade))
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) || s.group.toLowerCase().includes(q)
      )
    }
    return list
  })()

  const grouped: Record<string, Subject[]> = {}
  for (const s of filteredSubjects) {
    if (!grouped[s.group]) grouped[s.group] = []
    grouped[s.group].push(s)
  }

  const handleSelect = (subjectName: string) => {
    if (multi) {
      const list = value ? value.split('·').map(s => s.trim()).filter(Boolean) : []
      if (!list.includes(subjectName)) {
        list.push(subjectName)
        onChange(list.join('·'))
      }
      setQuery('')
      inputRef.current?.focus()
    } else {
      onChange(subjectName)
      setOpen(false)
      setQuery('')
    }
  }

  const handleAddCustom = () => {
    const q = query.trim()
    if (!q) return
    handleSelect(q)
  }

  const handleRemoveTag = (name: string) => {
    if (!multi) return
    const list = value.split('·').map(s => s.trim()).filter(Boolean)
    onChange(list.filter(s => s !== name).join('·'))
  }

  const selectedList = multi && value
    ? value.split('·').map(s => s.trim()).filter(Boolean)
    : []

  return (
    <div ref={wrapperRef} className="relative">
      <div
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) setOpen(!open)
        }}
        className={`min-h-[40px] w-full border border-line rounded-lg px-3 py-2 text-[13px] cursor-pointer bg-white flex flex-wrap gap-1 items-center transition-colors ${
          open ? 'border-brand-high' : 'hover:border-brand-high-light'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
      >
        {multi && selectedList.length > 0 ? (
          <>
            {selectedList.map(name => (
              <span
                key={name}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold bg-brand-high-pale text-brand-high-dark border border-brand-high-light px-2 py-0.5 rounded-full"
              >
                {name}
                {!disabled && (
                  <button
                    onClick={e => { e.stopPropagation(); handleRemoveTag(name) }}
                    className="hover:text-red-500"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
            {!disabled && (
              <span className="text-[11.5px] text-ink-muted">+ 추가</span>
            )}
          </>
        ) : value ? (
          <span className="text-ink font-medium">{value}</span>
        ) : (
          <span className="text-ink-muted">{placeholder}</span>
        )}
        <span className="ml-auto text-ink-muted text-[11px]">{open ? '▲' : '▼'}</span>
      </div>

      {open && !disabled && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-lg shadow-lg z-[100] max-h-[400px] flex flex-col"
        >
          {/* 헤더 - 검색창 + 닫기 버튼 */}
          <div className="p-2 border-b border-line-light flex gap-2 items-center">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddCustom()
                } else if (e.key === 'Escape') {
                  setOpen(false)
                }
              }}
              placeholder="과목 검색 또는 직접 입력 후 Enter"
              className="flex-1 h-9 border border-line rounded-md px-2.5 text-[12.5px] outline-none focus:border-brand-high"
            />
            {query.trim() && (
              <button
                onClick={handleAddCustom}
                className="px-2.5 h-9 bg-brand-high text-white rounded-md text-[11px] font-bold hover:bg-brand-high-dark transition-all whitespace-nowrap"
              >
                + 추가
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="w-9 h-9 rounded-md text-ink-muted hover:text-ink hover:bg-gray-100 flex items-center justify-center flex-shrink-0 transition-colors text-[14px]"
              title="닫기 (ESC)"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            {Object.keys(grouped).length === 0 ? (
              <div className="text-center py-6">
                <div className="text-[12px] text-ink-muted mb-1">검색 결과가 없어요</div>
                {query.trim() && (
                  <div className="text-[11px] text-ink-muted">
                    Enter 눌러서 "{query}" 직접 추가 가능
                  </div>
                )}
              </div>
            ) : (
              Object.entries(grouped).map(([group, subjects]) => (
                <div key={group} className="mb-1.5">
                  <div className="text-[10px] font-bold text-ink-secondary uppercase tracking-wider px-2 py-1 sticky top-0 bg-white">
                    {group}
                  </div>
                  <div className="flex flex-wrap gap-1 px-1.5">
                    {subjects.map(s => {
                      const isSelected = multi
                        ? selectedList.includes(s.name)
                        : value === s.name
                      return (
                        <button
                          key={s.name}
                          onClick={() => handleSelect(s.name)}
                          className={`text-[12px] px-2.5 py-1 rounded-full border transition-all ${
                            isSelected
                              ? 'bg-brand-high text-white border-brand-high font-semibold'
                              : 'bg-white text-ink border-line hover:border-brand-high-light hover:bg-brand-high-pale/50'
                          }`}
                        >
                          {s.name}
                          <span className={`ml-1 text-[9px] ${
                            isSelected ? 'text-white/70' : 'text-ink-muted'
                          }`}>
                            {s.category === '공통' ? '공통'
                              : s.category === '일반선택' ? '일반'
                              : s.category === '진로선택' ? '진로'
                              : '융합'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {multi ? (
            <div className="px-3 py-2.5 border-t border-line-light flex items-center gap-2 bg-gray-50">
              <div className="text-[10px] text-ink-muted font-medium flex-1">
                💡 여러 과목 선택 가능
                {selectedList.length > 0 && (
                  <span className="ml-1 text-brand-high-dark font-bold">
                    · {selectedList.length}개 선택됨
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="px-4 h-8 bg-brand-high text-white rounded-md text-[12px] font-bold hover:bg-brand-high-dark transition-all shadow-[0_2px_6px_rgba(37,99,235,0.25)]"
              >
                완료
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}