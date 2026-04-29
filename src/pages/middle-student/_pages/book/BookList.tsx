import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'

const CATEGORIES = ['리더십', '진로탐색', '인성/가치관', '사회/시사', '과학/기술', '문학', '역사', '기타']

const MOCK_SEARCH_RESULTS: Record<string, any[]> = {
  '리더십': [
    { isbn: '1', title: '리더십의 법칙', author: '존 맥스웰', publisher: '비즈니스북스', thumbnail: '', year: '2020', contents: '리더십 분야의 세계적인 권위자 존 맥스웰이 21가지 리더십 법칙을 통해 진정한 리더가 되는 방법을 알려주는 책.' },
    { isbn: '2', title: '나는 왜 이 일을 하는가', author: '사이먼 사이넥', publisher: '타임비즈', thumbnail: '', year: '2021', contents: 'WHY에서 시작하라! 애플, 마틴 루터 킹 등 위대한 리더들의 공통점을 분석한 책.' },
    { isbn: '3', title: '7가지 습관', author: '스티븐 코비', publisher: '김영사', thumbnail: '', year: '2019', contents: '전 세계 3000만 부 이상 판매된 자기계발의 고전. 효과적인 삶을 위한 7가지 습관을 통해 개인과 조직의 성공 원칙을 제시한다.' },
  ],
  '진로': [
    { isbn: '4', title: '열다섯 살의 진로', author: '이상엽', publisher: '팜파스', thumbnail: '', year: '2022', contents: '중학생들이 막막하게 느끼는 진로 탐색을 쉽고 재미있게 도와주는 책.' },
    { isbn: '5', title: '어떻게 살 것인가', author: '유시민', publisher: '아름다운사람들', thumbnail: '', year: '2020', contents: '삶의 의미와 가치에 대한 깊은 성찰을 담은 책.' },
  ],
  '인성': [
    { isbn: '7', title: '어린 왕자', author: '생텍쥐페리', publisher: '열린책들', thumbnail: '', year: '2019', contents: '전 세계에서 가장 많이 읽힌 소설 중 하나. 삶의 본질과 인간관계의 소중함을 일깨워준다.' },
    { isbn: '8', title: '아주 작은 습관의 힘', author: '제임스 클리어', publisher: '비즈니스북스', thumbnail: '', year: '2021', contents: '작은 습관이 어떻게 놀라운 결과를 만드는지 과학적으로 증명한 책.' },
  ],
}

const EMPTY_RECORD = { summary: '', quote: '', feeling: '', careerLink: '' }

export default function MiddleBookList() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const [books, setBooks] = useState<any[]>([])
  const [selBook, setSelBook] = useState<any>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selCategory, setSelCategory] = useState('')
  const [editRecord, setEditRecord] = useState(false)
  const [tempRecord, setTempRecord] = useState({ ...EMPTY_RECORD })

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    // TODO: GET /api/books/search?query={searchQuery} → 카카오 API 프록시
    const key = Object.keys(MOCK_SEARCH_RESULTS).find(k => searchQuery.includes(k)) || '리더십'
    setSearchResults(MOCK_SEARCH_RESULTS[key] || [])
  }

  const closeSearch = () => {
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
    setSelCategory('')
  }

  const addBook = (book: any) => {
    if (!selCategory) return
    const newBook = {
      ...book,
      category: selCategory,
      addedAt: new Date().toLocaleDateString('ko-KR'),
      record: { ...EMPTY_RECORD },
      feedback: '',
      feedbackDate: '',
    }
    setBooks(prev => [newBook, ...prev])
    setSelBook({ ...newBook })
    setEditRecord(false)
    closeSearch()
  }

  const saveRecord = () => {
    const idx = books.findIndex(b => b.isbn === selBook.isbn)
    if (idx < 0) return
    const next = [...books]
    const updated = { ...next[idx], record: { ...tempRecord } }
    next[idx] = updated
    setBooks(next)
    setSelBook({ ...updated })
    setEditRecord(false)
  }

  const startEdit = () => {
    setTempRecord({ ...selBook.record })
    setEditRecord(true)
  }

  const totalCount = books.length
  const recordedCount = books.filter(b => b.record.summary).length

  return (
    <div className="flex h-full overflow-hidden font-sans text-ink">

      {/* 왼쪽: 독서 기록장 */}
      <div className="flex-1 overflow-y-auto px-7 py-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[20px] font-extrabold text-ink tracking-tight">독서 리스트</div>
            <div className="text-[13px] text-ink-muted mt-0.5">{student?.name} · {academy?.academyName}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-brand-middle-bg text-brand-middle-dark text-[13px] font-semibold px-4 py-1.5 rounded-full border border-brand-middle-light">
              총 {totalCount}권 · {recordedCount}권 기록완료
            </div>
            <button
              onClick={() => setShowSearch(true)}
              className="h-9 px-4 bg-brand-middle hover:bg-brand-middle-hover text-white text-[13px] font-semibold rounded-lg transition-all hover:-translate-y-px hover:shadow-btn-middle"
            >
              + 책 추가
            </button>
          </div>
        </div>

        {/* 책 없음 */}
        {!selBook && (
          <div className="text-center py-20 text-ink-muted">
            <div className="text-5xl mb-3">📚</div>
            <div className="text-[15px] mb-1 font-medium">아직 읽은 책이 없어요.</div>
            <div className="text-[13px]">+ 책 추가 버튼을 눌러 첫 번째 책을 추가해보세요!</div>
          </div>
        )}

        {/* 책 상세 */}
        {selBook && (
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">

            {/* 책 정보 */}
            <div className="flex gap-4 mb-5">
              <div className="w-[70px] h-[92px] bg-brand-middle-pale rounded-lg flex items-center justify-center text-3xl flex-shrink-0 border border-line overflow-hidden">
                {selBook.thumbnail
                  ? <img src={selBook.thumbnail} alt={selBook.title} className="w-full h-full object-cover" />
                  : '📚'}
              </div>
              <div className="flex-1">
                <div className="text-[17px] font-bold text-ink mb-1 tracking-tight">{selBook.title}</div>
                <div className="text-[13px] text-ink-secondary mb-2">{selBook.author} · {selBook.publisher} · {selBook.year}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold bg-brand-middle-bg text-brand-middle-dark px-2.5 py-0.5 rounded-full border border-brand-middle-light">{selBook.category}</span>
                  <span className="text-[11px] text-ink-muted">{selBook.addedAt} 추가</span>
                </div>
              </div>
            </div>

            {/* 독서 기록장 */}
            <div className="border-t border-line-light pt-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[14px] font-bold text-ink">📖 독서 기록장</div>
                {!editRecord && (
                  <button
                    onClick={startEdit}
                    className="text-[12px] font-semibold text-brand-middle-dark bg-brand-middle-bg border border-brand-middle-light rounded-lg px-3 py-1.5 hover:bg-brand-middle hover:text-white transition-all"
                  >
                    ✏️ {selBook.record.summary ? '수정' : '작성하기'}
                  </button>
                )}
              </div>

              {/* 편집 모드 */}
              {editRecord && (
                <div>
                  {[
                    { key: 'summary', label: '📝 줄거리 요약', placeholder: '책의 주요 내용을 간단히 정리해보세요.' },
                    { key: 'quote', label: '💬 인상 깊은 구절', placeholder: '가장 기억에 남는 문장이나 구절을 적어보세요.' },
                    { key: 'feeling', label: '💭 느낀 점', placeholder: '이 책을 읽고 어떤 생각이나 감정이 들었나요?' },
                    { key: 'careerLink', label: '🎯 진로와의 연결점', placeholder: '이 책이 나의 진로나 꿈과 어떻게 연결되나요? 면접에서 활용할 내용을 적어보세요.' },
                  ].map(f => (
                    <div key={f.key} className="mb-3">
                      <label className="text-[12px] font-bold text-ink-secondary block mb-1.5">{f.label}</label>
                      <textarea
                        value={(tempRecord as any)[f.key]}
                        onChange={e => setTempRecord(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        rows={3}
                        className="w-full border border-line rounded-lg px-3.5 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setEditRecord(false)}
                      className="flex-1 h-10 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={saveRecord}
                      className="flex-[2] h-10 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px hover:shadow-btn-middle"
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}

              {/* 기록 있음 - 읽기 모드 */}
              {!editRecord && selBook.record.summary && (
                <div>
                  {[
                    { key: 'summary', label: '📝 줄거리 요약', bg: 'bg-gray-50', border: 'border-line', text: 'text-ink' },
                    { key: 'quote', label: '💬 인상 깊은 구절', bg: 'bg-[#F5F3FF]', border: 'border-[#DDD6FE]', text: 'text-[#4C1D95]' },
                    { key: 'feeling', label: '💭 느낀 점', bg: 'bg-[#FFF7ED]', border: 'border-[#FDBA74]', text: 'text-[#92400E]' },
                    { key: 'careerLink', label: '🎯 진로와의 연결점', bg: 'bg-brand-middle-bg', border: 'border-brand-middle-light', text: 'text-brand-middle-dark' },
                  ].map(f => (
                    (selBook.record as any)[f.key] ? (
                      <div key={f.key} className={`${f.bg} border ${f.border} rounded-xl px-4 py-3 mb-2.5`}>
                        <div className={`text-[12px] font-bold ${f.text} mb-1.5`}>{f.label}</div>
                        <div className={`text-[13px] ${f.text} leading-[1.7]`}>{(selBook.record as any)[f.key]}</div>
                      </div>
                    ) : null
                  ))}

                  {/* 선생님 피드백 */}
                  <div className={`${selBook.feedback ? 'bg-[#EEF2FF] border-[#BAC8FF]' : 'bg-gray-50 border-line'} border rounded-xl px-4 py-3 mt-1`}>
                    <div className={`text-[12px] font-bold ${selBook.feedback ? 'text-[#3B5BDB]' : 'text-ink-muted'} ${selBook.feedback ? 'mb-1.5' : ''}`}>
                      {selBook.feedback ? '💬 선생님 피드백' : '💬 선생님 피드백을 기다리는 중이에요...'}
                    </div>
                    {selBook.feedback && (
                      <>
                        <div className="text-[13px] text-[#1E3A8A] leading-[1.7]">{selBook.feedback}</div>
                        <div className="text-[11px] text-ink-muted mt-1">{selBook.feedbackDate}</div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 기록 없음 */}
              {!editRecord && !selBook.record.summary && (
                <div className="text-center py-10 text-ink-muted">
                  <div className="text-4xl mb-2.5">📖</div>
                  <div className="text-[13px] font-medium">아직 독서 기록이 없어요.</div>
                  <div className="text-[11px] mt-1">위의 작성하기 버튼을 눌러 기록을 남겨보세요!</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div className="w-px bg-line flex-shrink-0" />

      {/* 오른쪽: 책 목록 */}
      <div className="w-[300px] flex-shrink-0 overflow-y-auto px-4 py-6 bg-[#F8FAFC]">
        <div className="text-[13px] font-bold text-ink mb-3 px-1">읽은 책 목록</div>

        {books.length === 0 ? (
          <div className="text-center py-10 text-ink-muted text-[12px]">
            아직 추가된 책이 없어요.
          </div>
        ) : (
          books.map((b, i) => {
            const isSel = selBook?.isbn === b.isbn
            return (
              <div
                key={i}
                onClick={() => { setSelBook({ ...b }); setEditRecord(false) }}
                className={`p-3 rounded-xl mb-1.5 cursor-pointer border transition-all ${
                  isSel
                    ? 'border-brand-middle bg-white shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                    : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                }`}
              >
                <div className="flex gap-2.5">
                  <div className="w-8 h-10 bg-gray-100 rounded flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                    {b.thumbnail
                      ? <img src={b.thumbnail} alt={b.title} className="w-full h-full object-cover" />
                      : '📚'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12.5px] ${isSel ? 'font-semibold text-brand-middle-dark' : 'font-medium text-ink'} truncate`}>{b.title}</div>
                    <div className="text-[10px] text-ink-muted mt-0.5">{b.author}</div>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      <span className="text-[9px] font-bold bg-brand-middle-bg text-brand-middle-dark px-1.5 py-0.5 rounded-full">{b.category}</span>
                      {b.record.summary
                        ? <span className="text-[9px] text-green-600 font-semibold">기록완료</span>
                        : <span className="text-[9px] text-amber-500 font-semibold">기록없음</span>}
                      {b.feedback && <span className="text-[9px] text-[#3B5BDB] font-semibold">피드백완료</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 검색 모달 */}
      {showSearch && (
        <div
          onClick={closeSearch}
          className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[560px] max-h-[80vh] overflow-y-auto shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
          >

            <div className="flex items-center justify-between mb-5">
              <div className="text-lg font-bold text-ink tracking-tight">책 검색</div>
              <button onClick={closeSearch} className="text-ink-muted hover:text-ink text-xl transition-colors cursor-pointer">✕</button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="책 제목이나 저자를 검색해보세요"
                className="flex-1 h-11 border border-line rounded-lg px-4 text-[14px] focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                autoFocus
              />
              <button
                onClick={handleSearch}
                className="h-11 px-5 bg-brand-middle hover:bg-brand-middle-hover text-white text-[13px] font-semibold rounded-lg transition-all hover:-translate-y-px hover:shadow-btn-middle"
              >
                검색
              </button>
            </div>

            <div className="mb-5">
              <div className="text-[12px] font-bold text-ink-secondary mb-2">카테고리 선택 <span className="text-red-500">*</span></div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelCategory(c)}
                    className={`px-3 py-1 rounded-full text-[12px] cursor-pointer border-[1.5px] transition-all ${
                      selCategory === c
                        ? 'border-brand-middle bg-brand-middle-bg text-brand-middle-dark font-semibold'
                        : 'border-line bg-white text-ink-secondary hover:border-brand-middle-light'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 검색 전 안내 */}
            {searchResults.length === 0 && !searchQuery && (
              <div className="text-center py-10 text-ink-muted">
                <div className="text-4xl mb-2">🔍</div>
                <div className="text-[13px] font-medium">읽은 책을 검색해보세요</div>
                <div className="text-[11px] mt-1">카카오 도서 검색으로 책 정보를 자동으로 가져와요</div>
              </div>
            )}

            {/* 검색 결과 없음 */}
            {searchResults.length === 0 && searchQuery && (
              <div className="text-center py-10 text-ink-muted">
                <div className="text-4xl mb-2">😅</div>
                <div className="text-[13px] font-medium">검색 결과가 없어요</div>
                <div className="text-[11px] mt-1">다른 검색어로 시도해보세요</div>
              </div>
            )}

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div>
                <div className="text-[12px] font-bold text-ink-secondary mb-3">검색 결과 {searchResults.length}건</div>
                {searchResults.map((b, i) => (
                  <div key={i} className="border border-line rounded-xl p-4 mb-2.5 hover:border-brand-middle-light hover:shadow-sm transition-all">
                    <div className="flex gap-3">
                      <div className="w-[70px] h-[92px] rounded-lg overflow-hidden flex-shrink-0 bg-brand-middle-pale flex items-center justify-center border border-line">
                        {b.thumbnail
                          ? <img src={b.thumbnail} alt={b.title} className="w-full h-full object-cover" />
                          : <span className="text-2xl">📚</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold text-ink mb-1 tracking-tight">{b.title}</div>
                        <div className="text-[11px] text-ink-secondary mb-2">{b.author} · {b.publisher} · {b.year}</div>
                        {b.contents && (
                          <div className="text-[11px] text-ink-secondary leading-[1.6] mb-2.5 line-clamp-3">
                            {b.contents}
                          </div>
                        )}
                        <button
                          onClick={() => addBook(b)}
                          disabled={!selCategory}
                          className={`h-8 px-3.5 rounded-md text-[12px] font-semibold transition-all ${
                            selCategory
                              ? 'bg-brand-middle hover:bg-brand-middle-hover text-white cursor-pointer hover:-translate-y-px hover:shadow-btn-middle'
                              : 'bg-gray-100 text-ink-muted cursor-not-allowed'
                          }`}
                        >
                          {selCategory ? '추가하기' : '카테고리를 먼저 선택해주세요'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}