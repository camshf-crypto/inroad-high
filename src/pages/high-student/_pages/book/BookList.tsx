import { useState, useRef, useEffect } from 'react'
import {
  useMyReadings,
  useReadingAnalyses,
  useCreateReading,
  useSendReadingStudentMessage,
  useDeleteReading,
  buildReadingMessages,
} from '../../_hooks/useMyHighReading'
import { searchBooksPaged, type BookSearchResult } from '../../../../lib/kakaoBooks'
import SubjectSelect from '../../../../components/SubjectSelect'

const PAGE_SIZE = 10

export default function BookList() {
  const [selReadingId, setSelReadingId] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageableCount, setPageableCount] = useState(0)
  const [isEnd, setIsEnd] = useState(false)
  const [selSearchBook, setSelSearchBook] = useState<BookSearchResult | null>(null)
  const [newBook, setNewBook] = useState({ title: '', author: '', subject: '', reason: '', activity: '' })

  const chatEndRef = useRef<HTMLDivElement>(null)
  const searchListRef = useRef<HTMLDivElement>(null)

  const { data: readings = [], isLoading } = useMyReadings()
  const { data: analyses = [] } = useReadingAnalyses(selReadingId ?? undefined)
  const createReading = useCreateReading()
  const sendMessage = useSendReadingStudentMessage(selReadingId ?? '')
  const deleteReading = useDeleteReading()

  const selected = readings.find(r => r.id === selReadingId)
  const messages = selected ? buildReadingMessages(selected, analyses) : []
  const isCompleted = selected?.status === 'completed'

  useEffect(() => {
    if (!selReadingId && readings.length > 0) {
      setSelReadingId(readings[0].id)
    }
  }, [readings, selReadingId])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  const runSearch = async (query: string, pageNum: number) => {
    setSearching(true)
    setSearchError('')
    try {
      const { results, totalCount, pageableCount, isEnd } = await searchBooksPaged(query, pageNum, PAGE_SIZE)
      setSearchResults(results)
      setTotalCount(totalCount)
      setPageableCount(pageableCount)
      setIsEnd(isEnd)
      setSearchQuery(query)
      setPage(pageNum)
      searchListRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error(err)
      setSearchError('검색에 실패했어요. 잠시 후 다시 시도해주세요.')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults([])
      setSearchError('')
      setPage(1)
      setTotalCount(0)
      setPageableCount(0)
      setIsEnd(false)
      return
    }

    const timer = setTimeout(() => {
      runSearch(searchInput, 1)
    }, 500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const goPage = (p: number) => {
    if (p < 1 || searching) return
    runSearch(searchInput, p)
  }

  const openBookDetail = (book: BookSearchResult) => {
    setSelSearchBook(book)
    setModalStep(2)
  }

  const goToRegister = () => {
    if (!selSearchBook) return
    setNewBook(p => ({
      ...p,
      title: selSearchBook.title,
      author: selSearchBook.author,
    }))
    setModalStep(3)
  }

  const backToSearch = () => { setModalStep(1) }
  const backToDetail = () => { setModalStep(2) }

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selReadingId || isCompleted) return
    sendMessage.mutate(messageInput.trim(), {
      onSuccess: () => setMessageInput(''),
    })
  }

  const handleDelete = (id: string) => {
    if (window.confirm('독서리스트에서 삭제할까요?')) {
      deleteReading.mutate(id, {
        onSuccess: () => {
          if (selReadingId === id) setSelReadingId(null)
        },
      })
    }
  }

  const addBook = () => {
    if (!newBook.title.trim() || !newBook.author.trim() || !newBook.reason.trim()) return
    createReading.mutate(
      {
        book_title: newBook.title,
        author: newBook.author,
        subject: newBook.subject || undefined,
        reason: newBook.reason,
        plan: newBook.activity || undefined,
      },
      {
        onSuccess: (data: any) => {
          closeModal()
          if (data?.id) setSelReadingId(data.id)
        },
      },
    )
  }

  const closeModal = () => {
    setShowAddModal(false); setModalStep(1)
    setSearchQuery(''); setSearchInput('')
    setSearchResults([]); setSearchError('')
    setPage(1); setTotalCount(0); setPageableCount(0); setIsEnd(false)
    setSelSearchBook(null); setNewBook({ title: '', author: '', subject: '', reason: '', activity: '' })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const stripHtml = (str: string) => str.replace(/<[^>]*>/g, '')

  const formatDate = (iso: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    } catch { return '' }
  }

  const totalPages = Math.ceil(pageableCount / PAGE_SIZE)
  const pageButtons = (() => {
    if (totalPages <= 1) return []
    const maxVisible = 5
    const startPage = Math.max(1, Math.min(page - Math.floor(maxVisible / 2), totalPages - maxVisible + 1))
    const endPage = Math.min(startPage + maxVisible - 1, totalPages)
    const arr: number[] = []
    for (let i = startPage; i <= endPage; i++) arr.push(i)
    return arr
  })()

  const modalTitle = modalStep === 1 ? '도서 검색' : modalStep === 2 ? '도서 상세' : '도서 등록'
  const modalDesc = modalStep === 1 ? '읽고 싶은 책을 검색해보세요 (카카오 도서 검색)'
    : modalStep === 2 ? '책 정보를 확인하고 등록할지 결정해주세요'
    : '추가 정보를 입력해주세요'

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">

      <div className="flex justify-between items-center flex-shrink-0 flex-wrap gap-2">
        <div className="text-[14px] font-bold text-ink tracking-tight">
          📘 내 독서리스트
          {readings.length > 0 && (
            <span className="text-[11px] text-ink-secondary ml-2 font-medium">
              총 {readings.length}권 · 완료 {readings.filter(r => r.status === 'completed').length}권
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-brand-high text-white rounded-lg text-[13px] font-semibold hover:bg-brand-high-dark transition-all shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
        >
          + 도서 추가
        </button>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">

        <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-3 border-b border-line-light flex-shrink-0">
            <div className="text-[13px] font-bold text-ink">독서리스트 목록</div>
            <div className="text-[11px] text-ink-secondary mt-0.5 font-medium">
              선생님과 대화하며 피드백 받으세요
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-brand-high rounded-full animate-spin" />
                <div className="text-[12px] text-ink-muted mt-2">불러오는 중...</div>
              </div>
            ) : readings.length === 0 ? (
              <div className="text-center py-10 text-ink-muted">
                <div className="text-3xl mb-2">📚</div>
                <div className="text-[12px] mb-3">도서가 없어요.</div>
                <div className="text-[11px] leading-relaxed">
                  우측 상단 '+ 도서 추가' 버튼으로<br />
                  첫 도서를 추가해보세요!
                </div>
              </div>
            ) : readings.map(book => (
              <div
                key={book.id}
                onClick={() => setSelReadingId(book.id)}
                className={`relative border rounded-xl px-3 py-2.5 mb-1.5 cursor-pointer transition-all ${
                  selReadingId === book.id
                    ? 'border-brand-high bg-brand-high-pale shadow-[0_2px_8px_rgba(37,99,235,0.1)]'
                    : 'border-line bg-white hover:border-brand-high-light hover:shadow-sm'
                }`}
              >
                <div className="flex gap-1 mb-1.5 flex-wrap">
                  {book.status === 'completed' ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ 완료됨
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      ⏳ 진행중
                    </span>
                  )}
                </div>
                <div className="text-[12.5px] font-semibold text-ink mb-0.5 leading-tight">{book.book_title}</div>
                {book.author && (
                  <div className="text-[11px] text-ink-secondary mb-1.5">{book.author}</div>
                )}
                {book.subject && (
                  <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale border border-brand-high-light px-2 py-0.5 rounded-full">
                    {book.subject}
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(book.id) }}
                  className="absolute top-2 right-2 text-ink-muted hover:text-red-500 text-[12px] leading-none w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">📚</div>
              <div className="text-[14px] font-semibold text-ink-secondary">도서를 선택해주세요</div>
              <div className="text-[12px]">왼쪽에서 도서를 클릭하면 선생님과 대화할 수 있어요</div>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-line-light flex-shrink-0 bg-white">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-[15px] font-bold text-ink tracking-tight">{selected.book_title}</div>
                  {selected.author && (
                    <div className="text-[12px] text-ink-secondary font-medium">· {selected.author}</div>
                  )}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {selected.subject && (
                    <span className="text-[11px] font-bold text-brand-high-dark bg-brand-high-pale border border-brand-high-light px-2 py-0.5 rounded-full">
                      {selected.subject}
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ 완료됨
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
                {messages.map((msg, i) => {
                  const isStudent = msg.role === 'student'
                  const showDate = i === 0 || messages[i - 1].date !== msg.date
                  return (
                    <div key={i}>
                      {showDate && (
                        <div className="text-center my-2">
                          <span className="text-[10px] font-semibold text-ink-muted bg-white border border-line px-3 py-1 rounded-full">
                            {msg.date}
                          </span>
                        </div>
                      )}
                      <div className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}>
                        <div className={`text-[10px] font-semibold text-ink-muted mb-1 ${isStudent ? 'mr-1' : 'ml-10'}`}>
                          {isStudent ? '나' : '👨‍🏫 선생님'}
                        </div>
                        <div className={`flex items-end gap-2 ${isStudent ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isStudent && (
                            <div className="w-8 h-8 rounded-full bg-brand-high text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                              T
                            </div>
                          )}
                          <div className={`max-w-md px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                            isStudent
                              ? 'bg-brand-high text-white rounded-[14px_2px_14px_14px]'
                              : 'bg-white border border-line text-ink rounded-[2px_14px_14px_14px] shadow-sm'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              <div className="px-4 py-3 border-t border-line-light bg-white flex-shrink-0">
                {isCompleted ? (
                  <div className="text-center py-3 text-[12px] text-ink-muted font-medium">
                    ✓ 완료 처리된 도서예요. 선생님께 새 메시지 전송 불가.
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 items-end">
                      <textarea
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="선생님께 질문이나 반영 내용을 작성해주세요... (Shift+Enter 줄바꿈)"
                        rows={2}
                        disabled={sendMessage.isPending}
                        className="flex-1 border border-line rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none leading-relaxed focus:border-brand-high transition-colors font-sans disabled:bg-gray-50 disabled:opacity-70"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || sendMessage.isPending}
                        className={`px-5 py-3 rounded-xl text-[13px] font-bold transition-all flex-shrink-0 ${
                          messageInput.trim() && !sendMessage.isPending
                            ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
                            : 'bg-gray-200 text-ink-muted cursor-not-allowed'
                        }`}
                      >
                        {sendMessage.isPending ? '전송 중...' : '전송'}
                      </button>
                    </div>
                    <div className="text-[10px] text-ink-muted mt-2 font-medium px-1">
                      💡 선생님께 궁금한 점이나 피드백 반영 내용을 자유롭게 작성해보세요
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showAddModal && (
        <div
          onClick={closeModal}
          className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`bg-white rounded-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl ${
              modalStep === 1 ? 'w-[620px]' : modalStep === 2 ? 'w-[600px]' : 'w-[480px]'
            } max-w-full`}
          >
            <div className="px-6 py-4 border-b border-line-light flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                {modalStep === 2 && (
                  <button onClick={backToSearch} className="text-ink-secondary hover:text-ink text-[14px] transition-colors">←</button>
                )}
                {modalStep === 3 && (
                  <button onClick={backToDetail} className="text-ink-secondary hover:text-ink text-[14px] transition-colors">←</button>
                )}
                <div>
                  <div className="text-[15px] font-bold text-ink tracking-tight">{modalTitle}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5 font-medium">{modalDesc}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {[1, 2, 3].map(s => (
                    <div
                      key={s}
                      className={`h-2 rounded-full transition-all ${
                        s === modalStep ? 'w-5 bg-brand-high' : s < modalStep ? 'w-2 bg-brand-high-dark' : 'w-2 bg-line'
                      }`}
                    />
                  ))}
                </div>
                <button onClick={closeModal} className="text-ink-muted hover:text-ink text-[18px] transition-colors">✕</button>
              </div>
            </div>

            {/* Step 1: 검색 */}
            {modalStep === 1 && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-5 pb-3 flex-shrink-0">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">🔍</span>
                    <input
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      placeholder="책 제목, 저자명, 키워드로 검색해보세요 (예: 컴퓨터, 경제학)"
                      autoFocus
                      className="w-full h-11 border border-line rounded-lg pl-10 pr-10 text-[13px] outline-none focus:border-brand-high transition-colors font-sans"
                    />
                    {searching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-200 border-t-brand-high rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div ref={searchListRef} className="flex-1 overflow-y-auto px-6">
                  {!searchInput && (
                    <div className="text-center py-10">
                      <div className="text-4xl mb-3">📚</div>
                      <div className="text-[14px] font-semibold text-ink-secondary mb-1.5">읽고 싶은 책을 검색해보세요</div>
                      <div className="text-[12px] text-ink-muted leading-relaxed">
                        제목, 저자명 또는 관심 키워드로 검색하면<br />
                        카카오에서 도서 정보를 찾아드려요
                      </div>
                    </div>
                  )}

                  {searchError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3">
                      <div className="text-[12px] text-red-600 font-medium">⚠️ {searchError}</div>
                    </div>
                  )}

                  {searchInput && !searching && !searchError && searchResults.length === 0 && (
                    <div className="text-center py-10">
                      <div className="text-3xl mb-2">🔍</div>
                      <div className="text-[13px] text-ink-muted">검색 결과가 없어요.</div>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="text-[11px] text-ink-muted mb-2 font-medium">
                      "<span className="text-brand-high-dark font-bold">{searchQuery}</span>" 검색 결과
                      총 <span className="text-brand-high-dark font-bold">{totalCount.toLocaleString()}</span>건
                      {totalCount > pageableCount && (
                        <span className="ml-1">· 상위 {pageableCount.toLocaleString()}건 노출</span>
                      )}
                    </div>
                  )}

                  {searchResults.map((book, i) => (
                    <div
                      key={i}
                      onClick={() => openBookDetail(book)}
                      className="border border-line rounded-xl px-4 py-3 mb-2 cursor-pointer flex gap-3 items-start bg-white hover:bg-brand-high-pale/50 hover:border-brand-high-light transition-all"
                    >
                      {book.thumbnail ? (
                        <img
                          src={book.thumbnail}
                          alt={book.title}
                          className="w-12 h-16 object-cover rounded flex-shrink-0 bg-gray-100"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-brand-high-pale rounded flex-shrink-0 flex items-center justify-center text-xl">📖</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-ink mb-0.5 line-clamp-1">
                          {stripHtml(book.title)}
                        </div>
                        <div className="text-[11px] text-ink-secondary mb-1.5 font-medium">
                          {book.author}{book.publisher && ` · ${book.publisher}`}
                        </div>
                        {book.description && (
                          <div className="text-[11px] text-ink-muted leading-relaxed line-clamp-2">
                            {stripHtml(book.description)}
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-brand-high-dark flex-shrink-0 mt-1">상세 →</div>
                    </div>
                  ))}
                </div>

                {searchResults.length > 0 && totalPages > 1 && (
                  <div className="px-6 py-3 border-t border-line-light flex-shrink-0 flex items-center justify-center gap-1">
                    <button onClick={() => goPage(1)} disabled={page === 1 || searching}
                      className="w-8 h-8 rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="처음">«</button>
                    <button onClick={() => goPage(page - 1)} disabled={page === 1 || searching}
                      className="w-8 h-8 rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="이전">‹</button>
                    {pageButtons.map(p => (
                      <button key={p} onClick={() => goPage(p)} disabled={searching}
                        className={`w-8 h-8 rounded-lg text-[12px] font-bold transition-all disabled:opacity-50 ${
                          p === page ? 'bg-brand-high text-white shadow-[0_2px_6px_rgba(37,99,235,0.25)]' : 'text-ink hover:bg-gray-100'
                        }`}>{p}</button>
                    ))}
                    <button onClick={() => goPage(page + 1)} disabled={isEnd || page >= totalPages || searching}
                      className="w-8 h-8 rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="다음">›</button>
                    <button onClick={() => goPage(totalPages)} disabled={page >= totalPages || searching}
                      className="w-8 h-8 rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="마지막">»</button>
                  </div>
                )}

                <div className="px-6 py-3 border-t border-line-light flex-shrink-0">
                  <button
                    onClick={() => { setSelSearchBook(null); setNewBook({ title: '', author: '', subject: '', reason: '', activity: '' }); setModalStep(3) }}
                    className="w-full h-10 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 hover:border-ink-muted transition-all"
                  >
                    검색 없이 직접 입력
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: 상세 */}
            {modalStep === 2 && selSearchBook && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <div className="flex gap-4 mb-5">
                    {selSearchBook.thumbnail ? (
                      <img
                        src={selSearchBook.thumbnail}
                        alt={selSearchBook.title}
                        className="w-[120px] h-[168px] object-cover rounded-lg flex-shrink-0 bg-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                      />
                    ) : (
                      <div className="w-[120px] h-[168px] bg-brand-high-pale rounded-lg flex-shrink-0 flex items-center justify-center text-4xl shadow-[0_4px_16px_rgba(0,0,0,0.08)]">📖</div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="text-[17px] font-bold text-ink leading-snug mb-2 tracking-tight">{stripHtml(selSearchBook.title)}</div>
                      <div className="text-[13px] font-semibold text-ink-secondary mb-1">{selSearchBook.author}</div>
                      {selSearchBook.translators.length > 0 && (
                        <div className="text-[12px] text-ink-muted mb-1">번역: {selSearchBook.translators.join(', ')}</div>
                      )}
                      {selSearchBook.publisher && (
                        <div className="text-[12px] text-ink-muted mb-1">출판사: <span className="font-semibold text-ink-secondary">{selSearchBook.publisher}</span></div>
                      )}
                      {selSearchBook.datetime && (
                        <div className="text-[12px] text-ink-muted mb-1">출간일: <span className="font-semibold text-ink-secondary">{formatDate(selSearchBook.datetime)}</span></div>
                      )}
                      {selSearchBook.isbn && (
                        <div className="text-[11px] text-ink-muted mb-1 font-mono">ISBN: {selSearchBook.isbn}</div>
                      )}
                      {selSearchBook.status && selSearchBook.status !== '정상판매' && (
                        <div className="mt-1">
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{selSearchBook.status}</span>
                        </div>
                      )}
                      {selSearchBook.url && (
                        <a href={selSearchBook.url} target="_blank" rel="noopener noreferrer"
                          className="mt-auto inline-flex items-center gap-1.5 text-[12px] font-bold text-brand-high-dark hover:text-brand-high bg-white border border-brand-high-light hover:border-brand-high px-3 py-1.5 rounded-lg transition-all self-start">
                          🔗 다음 책에서 보기
                        </a>
                      )}
                    </div>
                  </div>

                  {selSearchBook.description ? (
                    <div>
                      <div className="text-[12px] font-bold text-ink mb-2 flex items-center gap-1.5">📝 책 소개</div>
                      <div className="bg-gray-50 border border-line rounded-xl px-4 py-3.5 text-[13px] text-ink leading-[1.75] whitespace-pre-wrap">
                        {stripHtml(selSearchBook.description)}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-6 text-center">
                      <div className="text-[12px] text-ink-muted">이 책에 대한 소개 정보가 없어요.</div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-line-light flex gap-2 flex-shrink-0 bg-white">
                  <button
                    onClick={backToSearch}
                    className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-all"
                  >
                    ← 다른 책 보기
                  </button>
                  <button
                    onClick={goToRegister}
                    className="flex-[1.5] h-11 bg-brand-high text-white rounded-lg text-[13px] font-bold hover:bg-brand-high-dark transition-all shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                  >
                    이 책으로 등록하기 →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: 작성 */}
            {modalStep === 3 && (
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {selSearchBook && (
                  <div className="bg-brand-high-pale border border-brand-high-light rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
                    {selSearchBook.thumbnail ? (
                      <img
                        src={selSearchBook.thumbnail}
                        alt={selSearchBook.title}
                        className="w-10 h-14 object-cover rounded flex-shrink-0 bg-white"
                      />
                    ) : (
                      <span className="text-lg flex-shrink-0">📖</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-brand-high-dark mb-0.5">{stripHtml(selSearchBook.title)}</div>
                      <div className="text-[11px] text-brand-high-dark/80 font-medium">
                        {selSearchBook.author}{selSearchBook.publisher && ` · ${selSearchBook.publisher}`}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-ink-secondary mb-1 block">책 제목 *</label>
                    <input
                      value={newBook.title}
                      onChange={e => setNewBook(p => ({ ...p, title: e.target.value }))}
                      placeholder="책 제목을 입력해주세요"
                      className="w-full h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-brand-high transition-colors font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-ink-secondary mb-1 block">저자 *</label>
                    <input
                      value={newBook.author}
                      onChange={e => setNewBook(p => ({ ...p, author: e.target.value }))}
                      placeholder="저자명을 입력해주세요"
                      className="w-full h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-brand-high transition-colors font-sans"
                    />
                  </div>

                  {/* 🎯 연계 과목 - 드롭다운 */}
                  <div>
                    <label className="text-[11px] font-semibold text-ink-secondary mb-1 block">
                      연계 과목 <span className="text-ink-muted font-normal">(여러 개 선택 가능)</span>
                    </label>
                    <SubjectSelect
                      value={newBook.subject}
                      onChange={v => setNewBook(p => ({ ...p, subject: v }))}
                      placeholder="과목을 선택하거나 직접 입력해주세요"
                      multi
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-ink-secondary mb-1 block">읽으려는 이유 *</label>
                    <textarea
                      value={newBook.reason}
                      onChange={e => setNewBook(p => ({ ...p, reason: e.target.value }))}
                      placeholder="이 책을 읽고 싶은 이유를 적어주세요"
                      rows={3}
                      className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none resize-none leading-relaxed focus:border-brand-high transition-colors font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-ink-secondary mb-1 block">독서 후 활동 계획</label>
                    <textarea
                      value={newBook.activity}
                      onChange={e => setNewBook(p => ({ ...p, activity: e.target.value }))}
                      placeholder="독서 후 어떤 활동을 할 계획인가요? (선택)"
                      rows={2}
                      className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none resize-none leading-relaxed focus:border-brand-high transition-colors font-sans"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={closeModal}
                    className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-all"
                  >
                    취소
                  </button>
                  <button
                    onClick={addBook}
                    disabled={!newBook.title.trim() || !newBook.author.trim() || !newBook.reason.trim() || createReading.isPending}
                    className={`flex-1 h-11 rounded-lg text-[13px] font-bold transition-all ${
                      newBook.title && newBook.author && newBook.reason && !createReading.isPending
                        ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
                        : 'bg-gray-200 text-ink-muted cursor-not-allowed'
                    }`}
                  >
                    {createReading.isPending ? '저장 중...' : '등록하기'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}