import { useState, useRef, useEffect } from "react";
import { useAtomValue } from "jotai";
import { studentState, academyState } from "@/lib/auth/atoms";
import { searchBooksPaged, type BookSearchResult } from "@/lib/kakaoBooks";
import {
  useMyBooks,
  useAddBook,
  useUpdateBookRecord,
  useBookFeedback,
} from "@/pages/middle-student/_hooks/useBooklist";

const CATEGORIES = [
  { label: "🩺 의학", searchKeyword: "의학" },
  { label: "💊 약학", searchKeyword: "약학" },
  { label: "🦷 치의학", searchKeyword: "치의학" },
  { label: "🐾 수의학", searchKeyword: "수의학" },
  { label: "⚖️ 법학", searchKeyword: "법학" },
  { label: "🏛️ 정치/외교", searchKeyword: "정치학" },
  { label: "💻 컴퓨터/IT", searchKeyword: "컴퓨터" },
  { label: "🔧 공학", searchKeyword: "공학" },
  { label: "🏗️ 건축", searchKeyword: "건축" },
  { label: "💼 경영", searchKeyword: "경영학" },
  { label: "📈 경제", searchKeyword: "경제학" },
  { label: "🧮 회계/금융", searchKeyword: "회계" },
  { label: "🎓 교육", searchKeyword: "교육" },
  { label: "🧠 심리", searchKeyword: "심리학" },
  { label: "🤝 사회복지", searchKeyword: "사회복지" },
  { label: "✍️ 문학", searchKeyword: "문학" },
  { label: "🎨 예술/디자인", searchKeyword: "예술" },
  { label: "🔬 과학", searchKeyword: "과학" },
  { label: "🌱 생명/환경", searchKeyword: "생명과학" },
  { label: "📂 기타", searchKeyword: "" },
];

const EMPTY_RECORD = { summary: "", quote: "", feeling: "", careerLink: "" };
const PAGE_SIZE = 10;

const stripHtml = (str: string) => (str || "").replace(/<[^>]*>/g, "");
const formatDate = (iso: string) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
};

export default function MiddleBookList() {
  const student = useAtomValue(studentState);
  const academy = useAtomValue(academyState);

  const studentId = student?.id ? String(student.id) : undefined;
  const { data: books = [], isLoading } = useMyBooks(studentId);
  const addBook = useAddBook();
  const updateRecord = useUpdateBookRecord();

  const [selBookId, setSelBookId] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState(false);
  const [tempRecord, setTempRecord] = useState({ ...EMPTY_RECORD });

  // 모달 상태 (1: 카테고리/검색, 2: 상세, 3: 등록)
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageableCount, setPageableCount] = useState(0);
  const [isEnd, setIsEnd] = useState(false);
  const [selSearchBook, setSelSearchBook] = useState<BookSearchResult | null>(null);
  const [selCategory, setSelCategory] = useState("");

  const searchListRef = useRef<HTMLDivElement>(null);

  const selBook = books.find((b) => b.id === selBookId) ?? null;
  const { data: selBookFeedback } = useBookFeedback(selBookId ?? undefined);

  // 검색 실행
  const runSearch = async (query: string, pageNum: number) => {
    setSearching(true);
    setSearchError("");
    try {
      const { results, totalCount, pageableCount, isEnd } =
        await searchBooksPaged(query, pageNum, PAGE_SIZE);
      setSearchResults(results);
      setTotalCount(totalCount);
      setPageableCount(pageableCount);
      setIsEnd(isEnd);
      setSearchQuery(query);
      setPage(pageNum);
      searchListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error(err);
      setSearchError("검색에 실패했어요. 잠시 후 다시 시도해주세요.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // debounce 자동 검색
  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults([]);
      setSearchError("");
      setPage(1);
      setTotalCount(0);
      setPageableCount(0);
      setIsEnd(false);
      return;
    }
    const timer = setTimeout(() => runSearch(searchInput, 1), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const goPage = (p: number) => {
    if (p < 1 || searching) return;
    runSearch(searchInput, p);
  };

  // 카테고리 클릭 → 자동 검색
  const handleCategoryClick = (category: {
    label: string;
    searchKeyword: string;
  }) => {
    setSelCategory(category.label);
    if (category.searchKeyword) {
      setSearchInput(category.searchKeyword);
    } else {
      setSearchInput("");
      setTimeout(() => {
        const input = document.getElementById(
          "book-search-input",
        ) as HTMLInputElement;
        input?.focus();
      }, 100);
    }
  };

  const openBookDetail = (book: BookSearchResult) => {
    setSelSearchBook(book);
    setModalStep(2);
  };

  const goToRegister = () => {
    if (!selSearchBook) return;
    setModalStep(3);
  };

  const backToSearch = () => setModalStep(1);
  const backToDetail = () => setModalStep(2);

  // 책 등록
  const handleAddBook = async () => {
    if (!selSearchBook) return;
    if (!student?.id || !academy?.academyId) {
      alert("로그인 정보를 불러오지 못했어요.");
      return;
    }
    try {
      const newBook = await addBook.mutateAsync({
        student_id: String(student.id),
        academy_id: String(academy.academyId),
        isbn: (selSearchBook.isbn || "").split(" ")[0],
        title: stripHtml(selSearchBook.title),
        author: selSearchBook.author,
        publisher: selSearchBook.publisher,
        year: selSearchBook.datetime ? selSearchBook.datetime.slice(0, 4) : "",
        thumbnail: selSearchBook.thumbnail,
        contents: stripHtml(selSearchBook.description),
        category: selCategory || "기타",
      });
      setSelBookId(newBook.id);
      setEditRecord(false);
      closeModal();
    } catch (e: any) {
      alert(`책 추가 실패: ${e.message}`);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setModalStep(1);
    setSearchQuery("");
    setSearchInput("");
    setSearchResults([]);
    setSearchError("");
    setPage(1);
    setTotalCount(0);
    setPageableCount(0);
    setIsEnd(false);
    setSelSearchBook(null);
    setSelCategory("");
  };

  // 독서 기록 저장
  const saveRecord = async () => {
    if (!selBook) return;
    try {
      await updateRecord.mutateAsync({
        booklist_id: selBook.id,
        record: tempRecord,
      });
      setEditRecord(false);
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  const startEdit = () => {
    if (!selBook) return;
    setTempRecord({ ...EMPTY_RECORD, ...selBook.record });
    setEditRecord(true);
  };

  const totalPages = Math.ceil(pageableCount / PAGE_SIZE);
  const pageButtons = (() => {
    if (totalPages <= 1) return [];
    const maxVisible = 5;
    const startPage = Math.max(
      1,
      Math.min(page - Math.floor(maxVisible / 2), totalPages - maxVisible + 1),
    );
    const endPage = Math.min(startPage + maxVisible - 1, totalPages);
    const arr: number[] = [];
    for (let i = startPage; i <= endPage; i++) arr.push(i);
    return arr;
  })();

  const totalCountBooks = books.length;
  const recordedCount = books.filter((b) => b.record?.summary).length;

  const modalTitle =
    modalStep === 1 ? "📚 책 추가하기" : modalStep === 2 ? "도서 상세" : "도서 등록";
  const modalDesc =
    modalStep === 1
      ? "관심 분야를 선택하거나 직접 검색해보세요"
      : modalStep === 2
        ? "책 정보를 확인하고 등록할지 결정해주세요"
        : "이 책으로 등록할까요?";

  return (
    <div className="flex h-full overflow-hidden font-sans text-ink">
      {/* 왼쪽: 독서 기록장 */}
      <div className="flex-1 overflow-y-auto px-7 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[20px] font-extrabold text-ink tracking-tight">
              독서 리스트
            </div>
            <div className="text-[13px] text-ink-muted mt-0.5">
              {student?.name} · {academy?.academyName}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-brand-middle-bg text-brand-middle-dark text-[13px] font-semibold px-4 py-1.5 rounded-full border border-brand-middle-light">
              총 {totalCountBooks}권 · {recordedCount}권 기록완료
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="h-9 px-4 bg-brand-middle hover:bg-brand-middle-hover text-white text-[13px] font-semibold rounded-lg transition-all hover:-translate-y-px hover:shadow-btn-middle"
            >
              + 책 추가
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-20 text-ink-muted">
            <div className="text-3xl mb-3">⏳</div>
            <div className="text-[13px]">불러오는 중...</div>
          </div>
        )}

        {!isLoading && books.length === 0 && (
          <div className="text-center py-20 text-ink-muted">
            <div className="text-5xl mb-3">📚</div>
            <div className="text-[15px] mb-1 font-medium">
              아직 읽은 책이 없어요.
            </div>
            <div className="text-[13px]">
              + 책 추가 버튼을 눌러 첫 번째 책을 추가해보세요!
            </div>
          </div>
        )}

        {!isLoading && books.length > 0 && !selBook && (
          <div className="text-center py-20 text-ink-muted">
            <div className="text-5xl mb-3">📖</div>
            <div className="text-[15px] mb-1 font-medium">
              오른쪽에서 책을 선택해주세요
            </div>
          </div>
        )}

        {selBook && (
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            <div className="flex gap-4 mb-5">
              <div className="w-[70px] h-[92px] bg-brand-middle-pale rounded-lg flex items-center justify-center text-3xl flex-shrink-0 border border-line overflow-hidden">
                {selBook.thumbnail ? (
                  <img
                    src={selBook.thumbnail}
                    alt={selBook.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "📚"
                )}
              </div>
              <div className="flex-1">
                <div className="text-[17px] font-bold text-ink mb-1 tracking-tight">
                  {selBook.title}
                </div>
                <div className="text-[13px] text-ink-secondary mb-2">
                  {selBook.author} · {selBook.publisher} · {selBook.year}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold bg-brand-middle-bg text-brand-middle-dark px-2.5 py-0.5 rounded-full border border-brand-middle-light">
                    {selBook.category}
                  </span>
                  <span className="text-[11px] text-ink-muted">
                    {new Date(selBook.added_at).toLocaleDateString("ko-KR")}{" "}
                    추가
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-line-light pt-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[14px] font-bold text-ink">
                  📖 독서 기록장
                </div>
                {!editRecord && (
                  <button
                    onClick={startEdit}
                    className="text-[12px] font-semibold text-brand-middle-dark bg-brand-middle-bg border border-brand-middle-light rounded-lg px-3 py-1.5 hover:bg-brand-middle hover:text-white transition-all"
                  >
                    ✏️ {selBook.record?.summary ? "수정" : "작성하기"}
                  </button>
                )}
              </div>

              {editRecord && (
                <div>
                  {selBookFeedback?.teacher_feedback && (
                    <div className="bg-[#EEF2FF] border-2 border-[#BAC8FF] rounded-xl px-4 py-3 mb-4 sticky top-0">
                      <div className="text-[12px] font-bold text-[#3B5BDB] mb-1.5 flex items-center gap-1">
                        💬 선생님 피드백 (참고)
                      </div>
                      <div className="text-[13px] text-[#1E3A8A] leading-[1.7] whitespace-pre-wrap">
                        {selBookFeedback.teacher_feedback}
                      </div>
                      <div className="text-[10px] text-[#3B5BDB]/70 mt-2">
                        ⬇ 피드백을 참고해서 아래 기록을 수정해보세요
                      </div>
                    </div>
                  )}

                  {[
                    {
                      key: "summary",
                      label: "📝 줄거리 요약",
                      placeholder: "책의 주요 내용을 간단히 정리해보세요.",
                    },
                    {
                      key: "quote",
                      label: "💬 인상 깊은 구절",
                      placeholder: "가장 기억에 남는 문장이나 구절을 적어보세요.",
                    },
                    {
                      key: "feeling",
                      label: "💭 느낀 점",
                      placeholder: "이 책을 읽고 어떤 생각이나 감정이 들었나요?",
                    },
                    {
                      key: "careerLink",
                      label: "🎯 진로와의 연결점",
                      placeholder:
                        "이 책이 나의 진로나 꿈과 어떻게 연결되나요? 면접에서 활용할 내용을 적어보세요.",
                    },
                  ].map((f) => (
                    <div key={f.key} className="mb-3">
                      <label className="text-[12px] font-bold text-ink-secondary block mb-1.5">
                        {f.label}
                      </label>
                      <textarea
                        value={(tempRecord as any)[f.key]}
                        onChange={(e) =>
                          setTempRecord((p) => ({
                            ...p,
                            [f.key]: e.target.value,
                          }))
                        }
                        placeholder={f.placeholder}
                        rows={3}
                        className="w-full border border-line rounded-lg px-3.5 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setEditRecord(false)}
                      disabled={updateRecord.isPending}
                      className="flex-1 h-10 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      onClick={saveRecord}
                      disabled={updateRecord.isPending}
                      className="flex-[2] h-10 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px hover:shadow-btn-middle disabled:opacity-50"
                    >
                      {updateRecord.isPending ? "저장 중..." : "저장"}
                    </button>
                  </div>
                </div>
              )}

              {!editRecord && selBook.record?.summary && (
                <div>
                  {[
                    {
                      key: "summary",
                      label: "📝 줄거리 요약",
                      bg: "bg-gray-50",
                      border: "border-line",
                      text: "text-ink",
                    },
                    {
                      key: "quote",
                      label: "💬 인상 깊은 구절",
                      bg: "bg-[#F5F3FF]",
                      border: "border-[#DDD6FE]",
                      text: "text-[#4C1D95]",
                    },
                    {
                      key: "feeling",
                      label: "💭 느낀 점",
                      bg: "bg-[#FFF7ED]",
                      border: "border-[#FDBA74]",
                      text: "text-[#92400E]",
                    },
                    {
                      key: "careerLink",
                      label: "🎯 진로와의 연결점",
                      bg: "bg-brand-middle-bg",
                      border: "border-brand-middle-light",
                      text: "text-brand-middle-dark",
                    },
                  ].map((f) =>
                    (selBook.record as any)?.[f.key] ? (
                      <div
                        key={f.key}
                        className={`${f.bg} border ${f.border} rounded-xl px-4 py-3 mb-2.5`}
                      >
                        <div
                          className={`text-[12px] font-bold ${f.text} mb-1.5`}
                        >
                          {f.label}
                        </div>
                        <div className={`text-[13px] ${f.text} leading-[1.7]`}>
                          {(selBook.record as any)[f.key]}
                        </div>
                      </div>
                    ) : null,
                  )}

                  <div
                    className={`${selBookFeedback?.teacher_feedback ? "bg-[#EEF2FF] border-[#BAC8FF]" : "bg-gray-50 border-line"} border rounded-xl px-4 py-3 mt-1`}
                  >
                    <div
                      className={`text-[12px] font-bold ${selBookFeedback?.teacher_feedback ? "text-[#3B5BDB]" : "text-ink-muted"} ${selBookFeedback?.teacher_feedback ? "mb-1.5" : ""}`}
                    >
                      {selBookFeedback?.teacher_feedback
                        ? "💬 선생님 피드백"
                        : "💬 선생님 피드백을 기다리는 중이에요..."}
                    </div>
                    {selBookFeedback?.teacher_feedback && (
                      <>
                        <div className="text-[13px] text-[#1E3A8A] leading-[1.7] whitespace-pre-wrap">
                          {selBookFeedback.teacher_feedback}
                        </div>
                        {selBookFeedback.teacher_at && (
                          <div className="text-[11px] text-ink-muted mt-1">
                            {new Date(
                              selBookFeedback.teacher_at,
                            ).toLocaleDateString("ko-KR")}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {!editRecord && !selBook.record?.summary && (
                <div className="text-center py-10 text-ink-muted">
                  <div className="text-4xl mb-2.5">📖</div>
                  <div className="text-[13px] font-medium">
                    아직 독서 기록이 없어요.
                  </div>
                  <div className="text-[11px] mt-1">
                    위의 작성하기 버튼을 눌러 기록을 남겨보세요!
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-px bg-line flex-shrink-0" />

      {/* 오른쪽: 책 목록 */}
      <div className="w-[300px] flex-shrink-0 overflow-y-auto px-4 py-6 bg-[#F8FAFC]">
        <div className="text-[13px] font-bold text-ink mb-3 px-1">
          읽은 책 목록
        </div>

        {books.length === 0 ? (
          <div className="text-center py-10 text-ink-muted text-[12px]">
            아직 추가된 책이 없어요.
          </div>
        ) : (
          books.map((b) => {
            const isSel = selBookId === b.id;
            return (
              <div
                key={b.id}
                onClick={() => {
                  setSelBookId(b.id);
                  setEditRecord(false);
                }}
                className={`p-3 rounded-xl mb-1.5 cursor-pointer border transition-all ${
                  isSel
                    ? "border-brand-middle bg-white shadow-[0_4px_16px_rgba(16,185,129,0.12)]"
                    : "border-line bg-white hover:border-brand-middle-light hover:shadow-sm"
                }`}
              >
                <div className="flex gap-2.5">
                  <div className="w-8 h-10 bg-gray-100 rounded flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                    {b.thumbnail ? (
                      <img
                        src={b.thumbnail}
                        alt={b.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      "📚"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[12.5px] ${isSel ? "font-semibold text-brand-middle-dark" : "font-medium text-ink"} truncate`}
                    >
                      {b.title}
                    </div>
                    <div className="text-[10px] text-ink-muted mt-0.5">
                      {b.author}
                    </div>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      <span className="text-[9px] font-bold bg-brand-middle-bg text-brand-middle-dark px-1.5 py-0.5 rounded-full">
                        {b.category}
                      </span>
                      {b.record?.summary ? (
                        <span className="text-[9px] text-green-600 font-semibold">
                          기록완료
                        </span>
                      ) : (
                        <span className="text-[9px] text-amber-500 font-semibold">
                          기록없음
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ⭐⭐⭐ 3단계 모달 ⭐⭐⭐ */}
      {showAddModal && (
        <div
          onClick={closeModal}
          className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl ${
              modalStep === 1 ? "w-[640px]" : modalStep === 2 ? "w-[600px]" : "w-[480px]"
            } max-w-full`}
          >
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-line-light flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                {modalStep === 2 && (
                  <button
                    onClick={backToSearch}
                    className="text-ink-secondary hover:text-ink text-[14px] transition-colors"
                  >
                    ←
                  </button>
                )}
                {modalStep === 3 && (
                  <button
                    onClick={backToDetail}
                    className="text-ink-secondary hover:text-ink text-[14px] transition-colors"
                  >
                    ←
                  </button>
                )}
                <div>
                  <div className="text-[15px] font-bold text-ink tracking-tight">
                    {modalTitle}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5 font-medium">
                    {modalDesc}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`h-2 rounded-full transition-all ${
                        s === modalStep
                          ? "w-5 bg-brand-middle"
                          : s < modalStep
                            ? "w-2 bg-brand-middle-dark"
                            : "w-2 bg-line"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={closeModal}
                  className="text-ink-muted hover:text-ink text-[18px] transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Step 1: 카테고리 + 검색 (전체 스크롤) */}
            {modalStep === 1 && (
              <div ref={searchListRef} className="flex-1 overflow-y-auto">
                {/* 카테고리 */}
                <div className="px-6 pt-4 pb-2">
                  <div className="text-[12px] font-bold text-ink-secondary mb-2">
                    📂 어떤 분야 책이야?
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.label}
                        onClick={() => handleCategoryClick(c)}
                        disabled={searching}
                        className={`h-10 rounded-lg text-[11px] font-bold transition-all border-[1.5px] disabled:opacity-50 px-1 ${
                          selCategory === c.label
                            ? "border-brand-middle bg-brand-middle text-white shadow-[0_2px_8px_rgba(16,185,129,0.25)]"
                            : "border-line bg-white text-ink-secondary hover:border-brand-middle-light hover:bg-brand-middle-pale"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 검색 input */}
                <div className="px-6 pt-3 pb-3">
                  <div className="text-[11px] font-medium text-ink-muted mb-1.5">
                    또는 직접 검색해보기
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
                      🔍
                    </span>
                    <input
                      id="book-search-input"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="책 제목, 저자, 키워드로 검색"
                      className="w-full h-11 border border-line rounded-lg pl-10 pr-10 text-[13px] outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-colors font-sans"
                    />
                    {searching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-200 border-t-brand-middle rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 검색 결과 */}
                <div className="px-6 pb-4">
                  {!searchInput && searchResults.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <div className="text-3xl mb-2">📚</div>
                      <div className="text-[13px] font-medium text-ink-secondary mb-1">
                        위에서 분야를 선택하면 추천 책이 나타나요!
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        또는 책 제목으로 직접 검색해도 됩니다
                      </div>
                    </div>
                  )}

                  {searchError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3">
                      <div className="text-[12px] text-red-600 font-medium">
                        ⚠️ {searchError}
                      </div>
                    </div>
                  )}

                  {searchInput &&
                    !searching &&
                    !searchError &&
                    searchResults.length === 0 && (
                      <div className="text-center py-10">
                        <div className="text-3xl mb-2">🔍</div>
                        <div className="text-[13px] text-ink-muted">
                          검색 결과가 없어요.
                        </div>
                      </div>
                    )}

                  {searchResults.length > 0 && (
                    <div className="text-[11px] text-ink-muted mb-2 font-medium">
                      "
                      <span className="text-brand-middle-dark font-bold">
                        {searchQuery}
                      </span>
                      " 검색 결과 총{" "}
                      <span className="text-brand-middle-dark font-bold">
                        {totalCount.toLocaleString()}
                      </span>
                      건
                      {totalCount > pageableCount && (
                        <span className="ml-1">
                          · 상위 {pageableCount.toLocaleString()}건 노출
                        </span>
                      )}
                    </div>
                  )}

                  {searchResults.map((book, i) => (
                    <div
                      key={i}
                      onClick={() => openBookDetail(book)}
                      className="border border-line rounded-xl px-4 py-3 mb-2 cursor-pointer flex gap-3 items-start bg-white hover:bg-brand-middle-pale/50 hover:border-brand-middle-light transition-all"
                    >
                      {book.thumbnail ? (
                        <img
                          src={book.thumbnail}
                          alt={book.title}
                          className="w-12 h-16 object-cover rounded flex-shrink-0 bg-gray-100"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-brand-middle-pale rounded flex-shrink-0 flex items-center justify-center text-xl">
                          📖
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-ink mb-0.5 line-clamp-1">
                          {stripHtml(book.title)}
                        </div>
                        <div className="text-[11px] text-ink-secondary mb-1.5 font-medium">
                          {book.author}
                          {book.publisher && ` · ${book.publisher}`}
                        </div>
                        {book.description && (
                          <div className="text-[11px] text-ink-muted leading-relaxed line-clamp-2">
                            {stripHtml(book.description)}
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-brand-middle-dark flex-shrink-0 mt-1">
                        상세 →
                      </div>
                    </div>
                  ))}

                  {/* 페이지네이션 — 결과 리스트 바로 아래 */}
                  {searchResults.length > 0 && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 mt-4 pt-4 border-t border-line">
                      <button
                        onClick={() => goPage(1)}
                        disabled={page === 1 || searching}
                        className="w-8 h-8 rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="처음"
                      >
                        «
                      </button>
                      <button
                        onClick={() => goPage(page - 1)}
                        disabled={page === 1 || searching}
                        className="w-8 h-8 rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="이전"
                      >
                        ‹
                      </button>
                      {pageButtons.map((p) => (
                        <button
                          key={p}
                          onClick={() => goPage(p)}
                          disabled={searching}
                          className={`w-8 h-8 rounded-lg text-[12px] font-bold transition-all disabled:opacity-50 ${
                            p === page
                              ? "bg-brand-middle text-white shadow-[0_2px_6px_rgba(16,185,129,0.25)]"
                              : "text-ink hover:bg-gray-100"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => goPage(page + 1)}
                        disabled={isEnd || page >= totalPages || searching}
                        className="w-8 h-8 rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="다음"
                      >
                        ›
                      </button>
                      <button
                        onClick={() => goPage(totalPages)}
                        disabled={page >= totalPages || searching}
                        className="w-8 h-8 rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="마지막"
                      >
                        »
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: 도서 상세 */}
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
                      <div className="w-[120px] h-[168px] bg-brand-middle-pale rounded-lg flex-shrink-0 flex items-center justify-center text-4xl shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                        📖
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="text-[17px] font-bold text-ink leading-snug mb-2 tracking-tight">
                        {stripHtml(selSearchBook.title)}
                      </div>
                      <div className="text-[13px] font-semibold text-ink-secondary mb-1">
                        {selSearchBook.author}
                      </div>
                      {selSearchBook.translators &&
                        selSearchBook.translators.length > 0 && (
                          <div className="text-[12px] text-ink-muted mb-1">
                            번역: {selSearchBook.translators.join(", ")}
                          </div>
                        )}
                      {selSearchBook.publisher && (
                        <div className="text-[12px] text-ink-muted mb-1">
                          출판사:{" "}
                          <span className="font-semibold text-ink-secondary">
                            {selSearchBook.publisher}
                          </span>
                        </div>
                      )}
                      {selSearchBook.datetime && (
                        <div className="text-[12px] text-ink-muted mb-1">
                          출간일:{" "}
                          <span className="font-semibold text-ink-secondary">
                            {formatDate(selSearchBook.datetime)}
                          </span>
                        </div>
                      )}
                      {selSearchBook.isbn && (
                        <div className="text-[11px] text-ink-muted mb-1 font-mono">
                          ISBN: {selSearchBook.isbn}
                        </div>
                      )}
                      {selSearchBook.status &&
                        selSearchBook.status !== "정상판매" && (
                          <div className="mt-1">
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              {selSearchBook.status}
                            </span>
                          </div>
                        )}
                      {selSearchBook.url && (
                        <a
                          href={selSearchBook.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-auto inline-flex items-center gap-1.5 text-[12px] font-bold text-brand-middle-dark hover:text-brand-middle bg-white border border-brand-middle-light hover:border-brand-middle px-3 py-1.5 rounded-lg transition-all self-start"
                        >
                          🔗 내용 상세 보기
                        </a>
                      )}
                    </div>
                  </div>

                  {selSearchBook.description ? (
                    <div>
                      <div className="text-[12px] font-bold text-ink mb-2 flex items-center gap-1.5">
                        📝 책 소개
                      </div>
                      <div className="bg-gray-50 border border-line rounded-xl px-4 py-3.5 text-[13px] text-ink leading-[1.75] whitespace-pre-wrap">
                        {stripHtml(selSearchBook.description)}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-6 text-center">
                      <div className="text-[12px] text-ink-muted">
                        이 책에 대한 소개 정보가 없어요.
                      </div>
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
                    className="flex-[1.5] h-11 bg-brand-middle text-white rounded-lg text-[13px] font-bold hover:bg-brand-middle-hover transition-all hover:-translate-y-px hover:shadow-btn-middle"
                  >
                    이 책으로 등록하기 →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: 등록 확인 */}
            {modalStep === 3 && selSearchBook && (
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-4 mb-5 flex items-start gap-3">
                  {selSearchBook.thumbnail ? (
                    <img
                      src={selSearchBook.thumbnail}
                      alt={selSearchBook.title}
                      className="w-14 h-20 object-cover rounded flex-shrink-0 bg-white"
                    />
                  ) : (
                    <span className="text-2xl flex-shrink-0">📖</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-brand-middle-dark mb-1">
                      {stripHtml(selSearchBook.title)}
                    </div>
                    <div className="text-[12px] text-brand-middle-dark/80 font-medium mb-1">
                      {selSearchBook.author}
                      {selSearchBook.publisher && ` · ${selSearchBook.publisher}`}
                    </div>
                    {selCategory && (
                      <span className="inline-block text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full mt-1">
                        {selCategory}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex gap-2">
                  <span className="text-base flex-shrink-0">💡</span>
                  <div className="text-[12px] text-amber-900 leading-[1.6]">
                    이 책을 독서 리스트에 추가할까요?<br />
                    추가 후 줄거리·느낀점·진로 연결점을 기록할 수 있어요.
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={closeModal}
                    className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-all"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddBook}
                    disabled={addBook.isPending}
                    className={`flex-[2] h-11 rounded-lg text-[13px] font-bold transition-all ${
                      !addBook.isPending
                        ? "bg-brand-middle text-white hover:bg-brand-middle-hover hover:-translate-y-px hover:shadow-btn-middle"
                        : "bg-gray-200 text-ink-muted cursor-not-allowed"
                    }`}
                  >
                    {addBook.isPending ? "추가 중..." : "📚 독서 리스트에 추가"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}