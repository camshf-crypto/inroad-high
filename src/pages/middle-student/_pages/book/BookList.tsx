import { useState } from "react";
import { useAtomValue } from "jotai";
import { studentState, academyState } from "@/lib/auth/atoms";
import { searchBooks } from "@/lib/kakaoBooks";
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
  { label: "📂 기타", searchKeyword: "" }, // 빈 문자열 = 직접 검색
];

const EMPTY_RECORD = { summary: "", quote: "", feeling: "", careerLink: "" };

export default function MiddleBookList() {
  const student = useAtomValue(studentState);
  const academy = useAtomValue(academyState);

  // ⭐ DB 훅
  const studentId = student?.id ? String(student.id) : undefined;
  const { data: books = [], isLoading } = useMyBooks(studentId);
  const addBook = useAddBook();
  const updateRecord = useUpdateBookRecord();

  const [selBookId, setSelBookId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selCategory, setSelCategory] = useState("");
  const [editRecord, setEditRecord] = useState(false);
  const [tempRecord, setTempRecord] = useState({ ...EMPTY_RECORD });

  // ⭐ 선택된 책 + 피드백
  const selBook = books.find((b) => b.id === selBookId) ?? null;
  const { data: selBookFeedback } = useBookFeedback(selBookId ?? undefined);

  const [isSearching, setIsSearching] = useState(false);

  // ⭐ 검색 (카테고리 클릭 또는 직접 검색)
  const runSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchBooks(query, 10);
      const mapped = results.map((b) => ({
        isbn: (b.isbn || "").split(" ")[0],
        title: b.title,
        author: b.author,
        publisher: b.publisher,
        year: b.datetime ? b.datetime.slice(0, 4) : "",
        thumbnail: b.thumbnail,
        contents: b.description,
      }));
      setSearchResults(mapped);
    } catch (e: any) {
      alert(`검색 실패: ${e.message}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => runSearch(searchQuery);

  // ⭐ 카테고리 클릭 → 자동 검색 (기타는 검색창 포커스만)
  const handleCategoryClick = (category: {
    label: string;
    searchKeyword: string;
  }) => {
    setSelCategory(category.label);
    if (category.searchKeyword) {
      // 직업군 클릭 → 자동 검색
      setSearchQuery(category.searchKeyword);
      runSearch(category.searchKeyword);
    } else {
      // "기타" 클릭 → 검색창 비우고 포커스
      setSearchQuery("");
      setSearchResults([]);
      // 검색창에 포커스
      setTimeout(() => {
        const input = document.getElementById(
          "book-search-input",
        ) as HTMLInputElement;
        input?.focus();
      }, 100);
    }
  };

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelCategory("");
  };

  // ⭐ 책 추가 — DB INSERT
  const handleAddBook = async (book: any) => {
    if (!student?.id || !academy?.academyId) {
      alert("로그인 정보를 불러오지 못했어요.");
      return;
    }
    try {
      const newBook = await addBook.mutateAsync({
        student_id: String(student.id),
        academy_id: String(academy.academyId),
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        year: book.year,
        thumbnail: book.thumbnail,
        contents: book.contents,
        category: selCategory || "기타", // ⭐ 카테고리 안 골랐으면 "기타"
      });
      setSelBookId(newBook.id);
      setEditRecord(false);
      closeSearch();
    } catch (e: any) {
      alert(`책 추가 실패: ${e.message}`);
    }
  };

  // ⭐ 독서 기록 저장 — DB UPDATE
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

  const totalCount = books.length;
  const recordedCount = books.filter((b) => b.record?.summary).length;

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

        {/* 로딩 / 책 없음 */}
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

        {/* 책 상세 */}
        {selBook && (
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            {/* 책 정보 */}
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

            {/* 독서 기록장 */}
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

              {/* 편집 모드 */}
              {editRecord && (
                <div>
                  {/* ⭐ 편집 모드일 때도 선생님 피드백 위에 표시 (참고용) */}
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
                      placeholder:
                        "가장 기억에 남는 문장이나 구절을 적어보세요.",
                    },
                    {
                      key: "feeling",
                      label: "💭 느낀 점",
                      placeholder:
                        "이 책을 읽고 어떤 생각이나 감정이 들었나요?",
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

              {/* 기록 있음 - 읽기 모드 */}
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

                  {/* 선생님 피드백 */}
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

              {/* 기록 없음 */}
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

      {/* 구분선 */}
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

      {/* 검색 모달 */}
      {showSearch && (
        <div
          onClick={closeSearch}
          className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[600px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="text-[18px] font-extrabold text-ink tracking-tight">
                  📚 책 추가하기
                </div>
                <div className="text-[12px] text-ink-muted mt-0.5">
                  관심 분야를 선택하면 추천 책이 자동으로 나와요
                </div>
              </div>
              <button
                onClick={closeSearch}
                className="text-ink-muted hover:text-ink text-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 카테고리 선택 — 큰 버튼 (5×4 = 20개) */}
            <div className="mt-5 mb-4">
              <div className="text-[12px] font-bold text-ink-secondary mb-2">
                📂 어떤 분야 책이야?
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => handleCategoryClick(c)}
                    disabled={isSearching}
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

            {/* 또는 직접 검색 */}
            <div className="mt-4 mb-5">
              <div className="text-[11px] font-medium text-ink-muted mb-1.5">
                또는 직접 검색해보기
              </div>
              <div className="flex gap-2">
                <input
                  id="book-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="책 제목이나 저자로 검색"
                  className="flex-1 h-10 border border-line rounded-lg px-4 text-[13px] focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="h-10 px-4 bg-white border border-line text-ink-secondary text-[12px] font-semibold rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔍 검색
                </button>
              </div>
            </div>

            {/* 검색 전 안내 */}
            {searchResults.length === 0 && !searchQuery && !isSearching && (
              <div className="text-center py-10 text-ink-muted bg-gray-50 rounded-xl">
                <div className="text-4xl mb-2">📚</div>
                <div className="text-[13px] font-medium">
                  위에서 분야를 선택하면 추천 책이 나타나요!
                </div>
                <div className="text-[11px] mt-1">
                  또는 책 제목으로 직접 검색해도 됩니다
                </div>
              </div>
            )}

            {/* 검색 중 */}
            {isSearching && (
              <div className="text-center py-10 text-ink-muted">
                <div className="text-4xl mb-2 animate-pulse">🔍</div>
                <div className="text-[13px] font-medium">
                  카카오에서 책을 찾고 있어요...
                </div>
              </div>
            )}

            {/* 검색 결과 없음 */}
            {!isSearching && searchResults.length === 0 && searchQuery && (
              <div className="text-center py-10 text-ink-muted">
                <div className="text-4xl mb-2">😅</div>
                <div className="text-[13px] font-medium">
                  검색 결과가 없어요
                </div>
                <div className="text-[11px] mt-1">
                  다른 검색어로 시도해보세요
                </div>
              </div>
            )}

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div>
                <div className="text-[12px] font-bold text-ink-secondary mb-3">
                  검색 결과 {searchResults.length}건
                </div>
                {searchResults.map((b, i) => (
                  <div
                    key={i}
                    className="border border-line rounded-xl p-4 mb-2.5 hover:border-brand-middle-light hover:shadow-sm transition-all"
                  >
                    <div className="flex gap-3">
                      <div className="w-[70px] h-[92px] rounded-lg overflow-hidden flex-shrink-0 bg-brand-middle-pale flex items-center justify-center border border-line">
                        {b.thumbnail ? (
                          <img
                            src={b.thumbnail}
                            alt={b.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">📚</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold text-ink mb-1 tracking-tight">
                          {b.title}
                        </div>
                        <div className="text-[11px] text-ink-secondary mb-2">
                          {b.author} · {b.publisher} · {b.year}
                        </div>
                        {b.contents && (
                          <div className="text-[11px] text-ink-secondary leading-[1.6] mb-2.5 line-clamp-3">
                            {b.contents}
                          </div>
                        )}
                        <button
                          onClick={() => handleAddBook(b)}
                          disabled={addBook.isPending}
                          className={`h-9 px-4 rounded-lg text-[12.5px] font-bold transition-all ${
                            !addBook.isPending
                              ? "bg-brand-middle hover:bg-brand-middle-hover text-white cursor-pointer hover:-translate-y-px hover:shadow-btn-middle"
                              : "bg-gray-100 text-ink-muted cursor-not-allowed"
                          }`}
                        >
                          {addBook.isPending ? "추가 중..." : "📚 추가하기"}
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
  );
}
