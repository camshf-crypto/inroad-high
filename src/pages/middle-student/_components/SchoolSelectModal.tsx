// src/pages/middle-student/_components/SchoolSelectModal.tsx

import { useState, useMemo } from 'react'
import { useSchools, updateStudentSchool, type School } from '../_hooks/useSchoolSuhaeng'

interface Props {
  studentId: string
  currentSchoolId?: string | null
  onClose: () => void
  onChanged: (school: School) => void
}

export default function SchoolSelectModal({ studentId, currentSchoolId, onClose, onChanged }: Props) {
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const { data: schools = [], isLoading } = useSchools('중학교')

  const filteredSchools = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return schools
    return schools.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.region?.toLowerCase().includes(q) ?? false)
    )
  }, [schools, search])

  const handleSelect = async (school: School) => {
    if (school.id === currentSchoolId) {
      onClose()
      return
    }
    setSaving(true)
    try {
      await updateStudentSchool(studentId, school.id, school.name)
      onChanged(school)
      onClose()
    } catch (e: any) {
      alert(`학교 변경 실패: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[480px] max-h-[80vh] flex flex-col shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-line flex-shrink-0">
          <div>
            <div className="text-[15px] font-extrabold text-ink tracking-tight">🏫 학교 선택</div>
            <div className="text-[11px] text-ink-muted mt-0.5">우리 학교 수행평가를 보려면 학교를 선택해주세요</div>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl transition-colors">✕</button>
        </div>

        <div className="px-5 py-3 border-b border-line flex-shrink-0">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-[13px]">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="학교명 또는 지역 검색"
              autoFocus
              className="w-full h-10 pl-9 pr-3 text-[13px] border border-line rounded-lg focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-brand-middle rounded-full animate-spin" />
              <div className="text-[12px] text-ink-muted mt-2">불러오는 중...</div>
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="text-center py-10 text-ink-muted">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-[13px] font-medium mb-1">검색 결과가 없어요</div>
              <div className="text-[11px] leading-relaxed">학원에 문의해서 학교 등록을 요청해주세요</div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredSchools.map(school => {
                const isSelected = school.id === currentSchoolId
                return (
                  <button
                    key={school.id}
                    onClick={() => handleSelect(school)}
                    disabled={saving}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-brand-middle bg-brand-middle-pale'
                        : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base flex-shrink-0">🏫</span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-ink truncate">{school.name}</div>
                        {school.region && (
                          <div className="text-[10.5px] text-ink-muted">{school.region}</div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full flex-shrink-0">현재</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-line flex-shrink-0 bg-gray-50">
          <div className="text-[10.5px] text-ink-muted text-center leading-relaxed">
            💡 우리 학교가 없으면 학원 선생님께 등록을 요청해주세요
          </div>
        </div>
      </div>
    </div>
  )
}