import { useState } from 'react'

const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 5, display: 'block' }

const INIT_BOOKS = [
  {
    id: 1, grade: '고1', month: '7월', title: '사피엔스', author: '유발 하라리', subject: '역사·철학',
    reason: '인류의 발전 과정을 통해 AI 시대의 미래를 예측하고 싶어서요. 특히 인지혁명과 농업혁명이 현대 사회에 미친 영향이 궁금했습니다.',
    activity: '독서 후 AI와 인류의 미래에 대한 탐구 보고서를 작성하고, 세특 주제로 연결할 예정입니다.',
    feedback: '좋은 선택이에요! 4부 이후를 특히 집중해서 읽어보세요. 호모 데우스와 함께 읽으면 더 깊이 있는 탐구가 가능해요.',
    feedbackDate: '2025-01-17', revision: '4부 중심으로 다시 읽고, 호모 데우스도 함께 탐구 주제로 연결해보겠습니다.', revisionDate: '2025-01-20',
  },
  {
    id: 2, grade: '고2', month: '3월', title: '총균쇠', author: '재레드 다이아몬드', subject: '지리·역사',
    reason: '지리적 환경이 문명 발달에 미친 영향을 탐구하고 싶어요.',
    activity: '지리 세특과 연계해서 환경결정론에 대한 비판적 에세이를 작성할 예정입니다.',
    feedback: '', feedbackDate: '', revision: '', revisionDate: '',
  },
  {
    id: 3, grade: '고2', month: '5월', title: '이기적 유전자', author: '리처드 도킨스', subject: '생물·철학',
    reason: '생물학적 진화론을 통해 인간의 이타적 행동이 어떻게 설명될 수 있는지 이해하고 싶어요.',
    activity: '진화론적 관점에서 인간의 이타적 행동을 분석하는 에세이를 쓰고, 생물 세특에 연결할 예정입니다.',
    feedback: '', feedbackDate: '', revision: '', revisionDate: '',
  },
  {
    id: 4, grade: '고1', month: '9월', title: '코스모스', author: '칼 세이건', subject: '지구과학',
    reason: '우주의 탄생과 인류의 미래를 탐구하고 싶어요.',
    activity: '우주과학 탐구 보고서를 작성할 예정입니다.',
    feedback: '', feedbackDate: '', revision: '', revisionDate: '',
  },
  {
    id: 5, grade: '고2', month: '7월', title: '정의란 무엇인가', author: '마이클 샌델', subject: '윤리·사회',
    reason: '다양한 철학적 관점에서 정의의 의미를 탐구하고 싶어요.',
    activity: '정의에 대한 에세이를 작성할 예정입니다.',
    feedback: '', feedbackDate: '', revision: '', revisionDate: '',
  },
  {
    id: 6, grade: '고3', month: '2월', title: '넛지', author: '리처드 탈러', subject: '경제·심리학',
    reason: '행동경제학이 실생활에 어떻게 적용되는지 알고 싶어요.',
    activity: '행동경제학 탐구 보고서를 작성할 예정입니다.',
    feedback: '', feedbackDate: '', revision: '', revisionDate: '',
  },
  {
    id: 7, grade: '고3', month: '4월', title: '침묵의 봄', author: '레이첼 카슨', subject: '생물·환경',
    reason: '환경 파괴 문제를 과학적으로 이해하고 싶어요.',
    activity: '환경 관련 탐구 보고서를 작성할 예정입니다.',
    feedback: '', feedbackDate: '', revision: '', revisionDate: '',
  },
  {
    id: 8, grade: '고1', month: '11월', title: '82년생 김지영', author: '조남주', subject: '국어·사회',
    reason: '한국 사회의 구조적 문제를 이해하고 싶어요.',
    activity: '사회 불평등에 대한 에세이를 작성할 예정입니다.',
    feedback: '', feedbackDate: '', revision: '', revisionDate: '',
  },
]

const MOCK_SEARCH_RESULTS = [
  { title: '사피엔스', author: '유발 하라리', publisher: '김영사', description: '인지혁명부터 현재까지 인류의 역사를 새로운 시각으로 바라본 책.' },
  { title: '호모 데우스', author: '유발 하라리', publisher: '김영사', description: '미래 인류가 신과 같은 존재로 진화하는 과정을 예측한 책.' },
  { title: '총균쇠', author: '재레드 다이아몬드', publisher: '문학사상', description: '지리적 환경이 문명 발달에 미친 영향을 탐구합니다.' },
  { title: '이기적 유전자', author: '리처드 도킨스', publisher: '을유문화사', description: '진화론적 관점에서 인간 행동을 분석한 생물학 고전.' },
  { title: '코스모스', author: '칼 세이건', publisher: '사이언스북스', description: '과학적 사고방식으로 우주와 인류의 역사를 탐구한 고전.' },
  { title: '정의란 무엇인가', author: '마이클 샌델', publisher: '김영사', description: '다양한 철학적 관점에서 정의의 의미를 탐구한 철학서.' },
  { title: '82년생 김지영', author: '조남주', publisher: '민음사', description: '한국 사회에서 여성이 겪는 차별과 억압을 담담하게 그린 소설.' },
  { title: '채식주의자', author: '한강', publisher: '창비', description: '인간의 폭력성과 자유를 탐구한 소설.' },
  { title: '아몬드', author: '손원평', publisher: '창비', description: '감정을 느끼지 못하는 소년의 성장 이야기.' },
  { title: '넛지', author: '리처드 탈러', publisher: '리더스북', description: '행동경제학의 관점에서 선택 설계를 설명한 책.' },
  { title: '침묵의 봄', author: '레이첼 카슨', publisher: '에코리브르', description: '농약 남용으로 인한 환경 파괴를 경고한 환경 고전.' },
  { title: '수학의 쓸모', author: '닉 폴슨', publisher: '더퀘스트', description: 'AI, 빅데이터 등 일상 속 수학의 활용을 탐구한 책.' },
  { title: '물리의 정석', author: '레너드 서스킨드', publisher: '사이언스북스', description: '현대 물리학의 핵심 개념을 쉽게 설명한 책.' },
  { title: '원씽', author: '게리 켈러', publisher: '비즈니스북스', description: '한 가지에 집중하는 것이 성공의 핵심임을 설명한 책.' },
  { title: '죄와 벌', author: '도스토예프스키', publisher: '열린책들', description: '살인을 저지른 청년의 내면적 갈등과 속죄를 그린 러시아 문학의 걸작.' },
]

export default function BookList() {
  const [bookGrade, setBookGrade] = useState('전체')
  const [books, setBooks] = useState(INIT_BOOKS)
  const [selBook, setSelBook] = useState<any>(null)
  const [revisionInputs, setRevisionInputs] = useState<Record<number, string>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalStep, setModalStep] = useState<1 | 2>(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selSearchBook, setSelSearchBook] = useState<any>(null)
  const [newBook, setNewBook] = useState({ title: '', author: '', subject: '', reason: '', activity: '' })

  const filtered = books.filter(b => bookGrade === '전체' || b.grade === bookGrade)
  const searchResults = searchQuery.trim()
    ? MOCK_SEARCH_RESULTS.filter(b => b.title.includes(searchQuery) || b.author.includes(searchQuery))
    : []

  const selectSearchBook = (book: any) => {
    setSelSearchBook(book)
    setNewBook(p => ({ ...p, title: book.title, author: book.author }))
    setModalStep(2)
  }

  const sendRevision = (bookId: number) => {
    const text = revisionInputs[bookId] || ''
    if (!text.trim()) return
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const updated = books.map(b => b.id === bookId ? { ...b, revision: text.trim(), revisionDate: dateStr } : b)
    setBooks(updated)
    setSelBook(updated.find(b => b.id === bookId))
    setRevisionInputs(prev => ({ ...prev, [bookId]: '' }))
  }

  const deleteBook = (bookId: number) => {
    if (window.confirm('독서리스트에서 삭제할까요?')) {
      setBooks(prev => prev.filter(b => b.id !== bookId))
      if (selBook?.id === bookId) setSelBook(null)
    }
  }

  const addBook = () => {
    if (!newBook.title.trim() || !newBook.author.trim() || !newBook.reason.trim()) return
    const now = new Date()
    setBooks(prev => [...prev, {
      id: prev.length + 1, grade: '고1', month: `${now.getMonth() + 1}월`,
      title: newBook.title, author: newBook.author, subject: newBook.subject,
      reason: newBook.reason, activity: newBook.activity,
      feedback: '', feedbackDate: '', revision: '', revisionDate: '',
    }])
    closeModal()
  }

  const closeModal = () => {
    setShowAddModal(false); setModalStep(1); setSearchQuery('')
    setSelSearchBook(null); setNewBook({ title: '', author: '', subject: '', reason: '', activity: '' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100vh - 90px)', overflow: 'hidden', padding: '20px 24px' }}>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['전체', '고1', '고2', '고3'].map(g => (
            <div key={g} onClick={() => { setBookGrade(g); setSelBook(null) }}
              style={{ padding: '7px 16px', borderRadius: 99, fontSize: 13, cursor: 'pointer', background: bookGrade === g ? '#3B5BDB' : '#fff', color: bookGrade === g ? '#fff' : '#6B7280', border: `0.5px solid ${bookGrade === g ? '#3B5BDB' : '#E5E7EB'}`, fontWeight: bookGrade === g ? 500 : 400 }}>
              {g}
            </div>
          ))}
        </div>
        <button onClick={() => setShowAddModal(true)}
          style={{ padding: '9px 18px', background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + 도서 추가
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>

        <div style={{ width: 300, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>독서리스트</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              총 <span style={{ color: '#3B5BDB', fontWeight: 600 }}>{filtered.length}개</span> ·
              피드백 <span style={{ color: '#059669', fontWeight: 600 }}>{filtered.filter(b => b.feedback).length}개</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📚</div>
                독서리스트가 없어요.
              </div>
            ) : filtered.map(book => (
              <div key={book.id} onClick={() => setSelBook(book)}
                style={{ border: `0.5px solid ${selBook?.id === book.id ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 7, cursor: 'pointer', background: selBook?.id === book.id ? '#EEF2FF' : '#fff', position: 'relative' }}>
                <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', padding: '1px 7px', borderRadius: 99 }}>{book.grade} · {book.month}</span>
                  {book.feedback && !book.revision && (
                    <span style={{ fontSize: 10, color: '#fff', background: '#F97316', padding: '1px 7px', borderRadius: 99 }}>💬 피드백</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.5, fontWeight: 500, marginBottom: 2 }}>{book.title}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{book.author}</div>
                <span style={{ fontSize: 10, color: '#3B5BDB', background: '#EEF2FF', padding: '1px 7px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>{book.subject}</span>
                <div onClick={e => { e.stopPropagation(); deleteBook(book.id) }}
                  style={{ position: 'absolute', top: 8, right: 8, fontSize: 12, color: '#9CA3AF', cursor: 'pointer', lineHeight: 1 }}>✕</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selBook ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
              <div style={{ fontSize: 32 }}>📚</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>도서를 선택해주세요</div>
              <div style={{ fontSize: 12 }}>왼쪽에서 도서를 클릭하면 상세 내용을 볼 수 있어요</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '13px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{selBook.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>· {selBook.author}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>{selBook.grade} · {selBook.month}</span>
                  {selBook.subject && <span style={{ fontSize: 11, color: '#3B5BDB', background: '#EEF2FF', padding: '2px 8px', borderRadius: 99, border: '0.5px solid #BAC8FF' }}>{selBook.subject}</span>}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>나 · 읽으려는 이유</div>
                  <div style={{ maxWidth: 400, background: '#F3F4F6', border: '0.5px solid #E5E7EB', borderRadius: '12px 0 12px 12px', padding: '10px 14px', fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>{selBook.reason}</div>
                </div>
                {selBook.activity && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>나 · 독서 후 활동 계획</div>
                    <div style={{ maxWidth: 400, background: '#F3F4F6', border: '0.5px solid #E5E7EB', borderRadius: '12px 0 12px 12px', padding: '10px 14px', fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>{selBook.activity}</div>
                  </div>
                )}
                {selBook.feedback ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>선생님 · {selBook.feedbackDate}</div>
                    <div style={{ maxWidth: 400, background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: '0 12px 12px 12px', padding: '10px 14px', fontSize: 13, color: '#1E3A8A', lineHeight: 1.6 }}>{selBook.feedback}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>선생님 피드백을 기다리는 중이에요.</div>
                )}
                {selBook.revision && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>나 · {selBook.revisionDate}</div>
                    <div style={{ maxWidth: 400, background: '#F3F4F6', border: '0.5px solid #E5E7EB', borderRadius: '12px 0 12px 12px', padding: '10px 14px', fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>{selBook.revision}</div>
                  </div>
                )}
              </div>
              {selBook.feedback && (
                <div style={{ padding: '12px 16px', borderTop: '0.5px solid #E5E7EB', flexShrink: 0 }}>
                  <textarea
                    value={revisionInputs[selBook.id] || ''}
                    onChange={e => setRevisionInputs(prev => ({ ...prev, [selBook.id]: e.target.value }))}
                    placeholder="피드백을 반영한 내용을 작성해주세요..."
                    rows={3}
                    style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 8, boxSizing: 'border-box' as const }}
                  />
                  <button onClick={() => sendRevision(selBook.id)} disabled={!(revisionInputs[selBook.id] || '').trim()}
                    style={{ padding: '8px 18px', background: (revisionInputs[selBook.id] || '').trim() ? '#3B5BDB' : '#E5E7EB', color: (revisionInputs[selBook.id] || '').trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: (revisionInputs[selBook.id] || '').trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                    전달하기
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showAddModal && (
        <div onClick={closeModal} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: modalStep === 1 ? 520 : 480, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {modalStep === 2 && <div onClick={() => setModalStep(1)} style={{ cursor: 'pointer', fontSize: 14, color: '#6B7280' }}>←</div>}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>{modalStep === 1 ? '도서 검색' : '도서 등록'}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{modalStep === 1 ? '읽고 싶은 책을 검색해보세요' : '추가 정보를 입력해주세요'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2].map(s => <div key={s} style={{ width: s === modalStep ? 20 : 8, height: 8, borderRadius: 99, background: s === modalStep ? '#3B5BDB' : s < modalStep ? '#059669' : '#E5E7EB', transition: 'all 0.2s' }} />)}
                </div>
                <div onClick={closeModal} style={{ cursor: 'pointer', color: '#6B7280', fontSize: 18 }}>✕</div>
              </div>
            </div>

            {modalStep === 1 && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9CA3AF' }}>🔍</span>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="책 제목이나 저자명으로 검색해보세요" autoFocus
                    style={{ width: '100%', height: 44, border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '0 12px 0 36px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                </div>
                {!searchQuery && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280', marginBottom: 6 }}>읽고 싶은 책을 검색해보세요</div>
                    <div style={{ fontSize: 12, lineHeight: 1.8 }}>제목이나 저자명으로 검색하면<br />도서 정보를 자동으로 채워드려요</div>
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                    <div style={{ fontSize: 13 }}>검색 결과가 없어요.</div>
                  </div>
                )}
                {searchResults.map((book, i) => (
                  <div key={i} onClick={() => selectSearchBook(book)}
                    style={{ border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '14px 16px', marginBottom: 8, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fff' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8F9FF')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                    <div style={{ width: 40, height: 52, background: '#EEF2FF', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📖</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 3 }}>{book.title}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>{book.author} · {book.publisher}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>{book.description}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#3B5BDB', flexShrink: 0, marginTop: 2 }}>선택 →</div>
                  </div>
                ))}
                <div style={{ borderTop: '0.5px solid #E5E7EB', paddingTop: 12, marginTop: 8 }}>
                  <button onClick={() => setModalStep(2)}
                    style={{ width: '100%', height: 36, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    검색 없이 직접 입력
                  </button>
                </div>
              </div>
            )}

            {modalStep === 2 && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {selSearchBook && (
                  <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📖</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#1E3A8A', marginBottom: 2 }}>{selSearchBook.title}</div>
                      <div style={{ fontSize: 11, color: '#3B5BDB', marginBottom: 6 }}>{selSearchBook.author} · {selSearchBook.publisher}</div>
                      <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.6, background: '#fff', borderRadius: 6, padding: '8px 10px', border: '0.5px solid #BAC8FF' }}>{selSearchBook.description}</div>
                    </div>
                    <button onClick={() => { setSelSearchBook(null); setNewBook(p => ({ ...p, title: '', author: '' })) }}
                      style={{ fontSize: 11, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>제거</button>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={LABEL}>책 제목 *</label>
                    <input value={newBook.title} onChange={e => setNewBook(p => ({ ...p, title: e.target.value }))}
                      placeholder="책 제목을 입력해주세요"
                      style={{ width: '100%', height: 40, border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={LABEL}>저자 *</label>
                    <input value={newBook.author} onChange={e => setNewBook(p => ({ ...p, author: e.target.value }))}
                      placeholder="저자명을 입력해주세요"
                      style={{ width: '100%', height: 40, border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={LABEL}>연계 과목</label>
                    <input value={newBook.subject} onChange={e => setNewBook(p => ({ ...p, subject: e.target.value }))}
                      placeholder="예: 생물·화학"
                      style={{ width: '100%', height: 40, border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={LABEL}>읽으려는 이유 *</label>
                    <textarea value={newBook.reason} onChange={e => setNewBook(p => ({ ...p, reason: e.target.value }))}
                      placeholder="이 책을 읽고 싶은 이유를 적어주세요" rows={3}
                      style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6 }} />
                  </div>
                  <div>
                    <label style={LABEL}>독서 후 활동 계획</label>
                    <textarea value={newBook.activity} onChange={e => setNewBook(p => ({ ...p, activity: e.target.value }))}
                      placeholder="독서 후 어떤 활동을 할 계획인가요? (선택)" rows={2}
                      style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button onClick={closeModal}
                    style={{ flex: 1, height: 44, background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                  <button onClick={addBook} disabled={!newBook.title.trim() || !newBook.author.trim() || !newBook.reason.trim()}
                    style={{ flex: 1, height: 44, background: newBook.title && newBook.author && newBook.reason ? '#3B5BDB' : '#E5E7EB', color: newBook.title && newBook.author && newBook.reason ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: newBook.title && newBook.author && newBook.reason ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                    등록하기
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