import { useState, useEffect } from "react";
import {
  useStudentBooks,
  useBookFeedbackForAdmin,
  useSaveBookAiAnalysis,
  useSaveBookFeedback,
  useClearBookFeedback,
} from "@/pages/admin/_hooks/middle/useStudentBooklist";

// 🌱 중등 초록 테마
const THEME = {
  accent: "#059669",
  accentDark: "#065F46",
  accentBg: "#ECFDF5",
  accentBorder: "#6EE7B7",
  accentShadow: "rgba(16, 185, 129, 0.15)",
  gradient: "linear-gradient(135deg, #065F46, #10B981)",
};

// AI 피드백 제안 mock (나중에 Claude API 연결)
const AI_FEEDBACK_SUGGESTIONS = [
  '책의 주제를 본인의 경험과 연결한 점이 좋아요! 특히 진로와의 연결이 구체적입니다. 다만 "인상 깊은 구절"에 대해 왜 그 구절이 와닿았는지 이유를 한 문장 추가하면 더 완성도 있어요.',
  "전반적으로 잘 정리되어 있어요. 다음에는 이 책의 저자가 말하는 핵심 메시지가 무엇인지, 본인의 삶에 어떻게 적용할 수 있는지 생각해보면 좋겠어요.",
  '요약과 느낀 점이 좋아요! 면접에서 활용하려면 이 책을 통해 "내가 어떻게 달라졌는가"를 구체적으로 설명할 수 있어야 해요. 실제 행동의 변화를 생각해보세요.',
];

export default function MiddleBookTab({ student }: { student: any }) {
  // ⭐ DB에서 학생 책 가져오기
  const studentId = student?.id ? String(student.id) : undefined;
  const { data: books = [], isLoading } = useStudentBooks(studentId);

  const [selBookId, setSelBookId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // ⭐ 선택된 책 + 피드백
  const selBook = books.find((b) => b.id === selBookId) ?? null;
  const { data: selFeedback } = useBookFeedbackForAdmin(selBookId ?? undefined);

  // ⭐ 첫 책 자동 선택
  useEffect(() => {
    if (!selBookId && books.length > 0) {
      setSelBookId(books[0].id);
    }
  }, [books.length, selBookId]);

  // ⭐ 선택 책 바뀌면 피드백 textarea 초기화
  useEffect(() => {
    setFeedback(selFeedback?.teacher_feedback || "");
  }, [selBookId, selFeedback?.teacher_feedback]);

  // ⭐ DB 저장 훅
  const saveAi = useSaveBookAiAnalysis();
  const saveFeedback = useSaveBookFeedback();
  const clearFeedback = useClearBookFeedback();

  const totalCount = books.length;
  const recordedCount = books.filter((b) => b.record?.summary).length;

  // 피드백 완료된 책 개수 (selFeedback은 선택된 책만 있어서 정확하지 않음 — 일단 책 데이터로 추산)
  const feedbackDoneCount = books.filter((b) => {
    // TODO: 모든 책의 피드백 한 번에 가져오기 (현재는 선택된 책만)
    return false;
  }).length;

  const selectBook = (b: any) => {
    setSelBookId(b.id);
  };

  // ⭐ 피드백 전달 — DB 저장
  const sendFeedback = async () => {
    if (!feedback.trim() || !selBook) return;
    try {
      await saveFeedback.mutateAsync({
        booklist_id: selBook.id,
        teacher_feedback: feedback,
      });
      alert("✅ 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  // ⭐ 피드백 수정 — DB에서 비우고 다시 작성 모드로
  const editFeedback = async () => {
    if (!selBook) return;
    setFeedback(selFeedback?.teacher_feedback || "");
    try {
      await clearFeedback.mutateAsync(selBook.id);
    } catch (e: any) {
      alert(`수정 모드 진입 실패: ${e.message}`);
    }
  };

  // AI 시안 모달 열기
  const openAiModal = async () => {
    if (!selBook) return;
    setShowAiModal(true);
    setAiLoading(true);
    setAiSuggestions([]);
    setTimeout(async () => {
      setAiSuggestions(AI_FEEDBACK_SUGGESTIONS);
      setAiLoading(false);
      // DB에도 저장
      try {
        await saveAi.mutateAsync({
          booklist_id: selBook.id,
          ai_analysis: { suggestions: AI_FEEDBACK_SUGGESTIONS },
        });
      } catch (e) {
        console.error("AI 시안 저장 실패:", e);
      }
    }, 1200);
  };

  const applyAiSuggestion = (s: string) => {
    setFeedback(s);
    setShowAiModal(false);
  };

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent;
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`;
  };
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#E5E7EB";
    e.target.style.boxShadow = "none";
  };

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      {/* ==================== 왼쪽 책 목록 ==================== */}
      <div className="w-[320px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-line flex-shrink-0">
          <div className="text-[14px] font-extrabold text-ink tracking-tight">
            📖 독서 리스트
          </div>
          <div className="text-[11px] font-medium text-ink-secondary mt-1 flex gap-2 flex-wrap">
            <span>
              총{" "}
              <span className="font-bold" style={{ color: THEME.accent }}>
                {totalCount}권
              </span>
            </span>
            <span>·</span>
            <span>
              기록{" "}
              <span className="font-bold" style={{ color: THEME.accent }}>
                {recordedCount}권
              </span>
            </span>
          </div>
        </div>

        {/* 책 리스트 */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {isLoading ? (
            <div className="text-center py-10 text-ink-muted text-[12px]">
              <div className="text-2xl mb-2">⏳</div>
              <div className="font-medium">불러오는 중...</div>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-10 text-ink-muted">
              <div className="text-3xl mb-2">📚</div>
              <div className="text-[12px] font-medium mb-1">
                아직 추가된 책이 없어요
              </div>
              <div className="text-[10px]">
                학생이 책을 추가하면 여기에 표시돼요.
              </div>
            </div>
          ) : (
            books.map((b) => {
              const isSelected = selBookId === b.id;
              const hasRecord = !!b.record?.summary;

              return (
                <button
                  key={b.id}
                  onClick={() => selectBook(b)}
                  className="w-full rounded-xl p-3 mb-1.5 text-left transition-all"
                  style={{
                    border: `1px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                    background: isSelected ? THEME.accentBg : "#fff",
                    boxShadow: isSelected
                      ? `0 2px 8px ${THEME.accentShadow}`
                      : "none",
                  }}
                >
                  <div className="flex gap-2.5">
                    {/* 썸네일 */}
                    <div
                      className="w-10 h-12 rounded flex items-center justify-center text-base flex-shrink-0 overflow-hidden border border-line"
                      style={{ background: THEME.accentBg }}
                    >
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

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[12.5px] truncate"
                        style={{
                          fontWeight: isSelected ? 700 : 600,
                          color: isSelected ? THEME.accentDark : "#1a1a1a",
                        }}
                      >
                        {b.title}
                      </div>
                      <div className="text-[10px] font-medium text-ink-muted truncate">
                        {b.author}
                      </div>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            color: THEME.accentDark,
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}60`,
                          }}
                        >
                          {b.category}
                        </span>
                        {hasRecord ? (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                            📝 기록완료
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-ink-muted bg-gray-100 px-1.5 py-0.5 rounded-full">
                            ○ 기록없음
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ==================== 오른쪽 상세 ==================== */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
        {!selBook ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
            <div className="text-4xl">📖</div>
            <div className="text-[14px] font-bold text-ink-secondary">
              {books.length === 0
                ? "학생이 책을 추가하면 표시돼요"
                : "책을 선택해주세요"}
            </div>
          </div>
        ) : (
          <>
            {/* 헤더 - 책 정보 */}
            <div className="px-5 py-4 border-b border-line flex-shrink-0">
              <div className="flex gap-4">
                {/* 썸네일 */}
                <div
                  className="w-[72px] h-[96px] rounded-lg flex items-center justify-center text-3xl flex-shrink-0 border border-line overflow-hidden"
                  style={{ background: THEME.accentBg }}
                >
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

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="text-[17px] font-extrabold text-ink mb-1 tracking-tight">
                    {selBook.title}
                  </div>
                  <div className="text-[12.5px] font-medium text-ink-secondary mb-2">
                    ✍️ {selBook.author} · {selBook.publisher} · {selBook.year}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{
                        color: THEME.accentDark,
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}60`,
                      }}
                    >
                      🏷️ {selBook.category}
                    </span>
                    <span className="text-[11px] font-semibold text-ink-secondary bg-gray-100 px-2.5 py-0.5 rounded-full">
                      📅{" "}
                      {new Date(selBook.added_at).toLocaleDateString("ko-KR")}{" "}
                      추가
                    </span>
                    {selBook.record?.summary ? (
                      selFeedback?.teacher_feedback ? (
                        <span className="text-[11px] font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
                          ✓ 피드백완료
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          ⏳ 피드백대기
                        </span>
                      )
                    ) : (
                      <span className="text-[11px] font-bold text-ink-secondary bg-gray-100 border border-line px-2.5 py-0.5 rounded-full">
                        ○ 기록없음
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 바디 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {/* 학생 기록 없을 때 */}
              {!selBook.record?.summary && (
                <div className="bg-gray-50 border border-line rounded-xl px-4 py-8 text-center">
                  <div className="text-3xl mb-2">📝</div>
                  <div className="text-[13px] font-bold text-ink-secondary">
                    학생이 아직 독서 기록을 작성하지 않았어요
                  </div>
                  <div className="text-[11px] font-medium text-ink-muted mt-1">
                    학생이 기록을 남기면 여기에 표시돼요.
                  </div>
                </div>
              )}

              {/* 학생 기록 */}
              {selBook.record?.summary && (
                <div className="bg-white border border-line rounded-xl px-5 py-4">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-3">
                    👤 학생 독서 기록
                  </div>

                  {/* 4개 필드 */}
                  {[
                    {
                      key: "summary",
                      label: "📝 줄거리 요약",
                      bg: "bg-gray-50",
                      border: "border-line",
                      color: "#1a1a1a",
                      labelColor: "#6B7280",
                    },
                    {
                      key: "quote",
                      label: "💬 인상 깊은 구절",
                      bg: "bg-[#F5F3FF]",
                      border: "border-[#DDD6FE]",
                      color: "#4C1D95",
                      labelColor: "#7C3AED",
                    },
                    {
                      key: "feeling",
                      label: "💭 느낀 점",
                      bg: "bg-[#FFF7ED]",
                      border: "border-[#FDBA74]",
                      color: "#92400E",
                      labelColor: "#D97706",
                    },
                    {
                      key: "careerLink",
                      label: "🎯 진로와의 연결점",
                      bg: "",
                      border: "",
                      color: THEME.accentDark,
                      labelColor: THEME.accent,
                      custom: true,
                    },
                  ].map((f) => {
                    const value = (selBook.record as any)?.[f.key];
                    if (!value) return null;
                    return (
                      <div
                        key={f.key}
                        className={`rounded-lg px-3.5 py-3 mb-2 ${!f.custom ? `${f.bg} border ${f.border}` : ""}`}
                        style={
                          f.custom
                            ? {
                                background: THEME.accentBg,
                                border: `1px solid ${THEME.accentBorder}60`,
                              }
                            : undefined
                        }
                      >
                        <div
                          className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
                          style={{ color: f.labelColor }}
                        >
                          {f.label}
                        </div>
                        <div
                          className="text-[13px] font-medium leading-[1.8] whitespace-pre-wrap"
                          style={{ color: f.color }}
                        >
                          {value}
                        </div>
                      </div>
                    );
                  })}

                  {/* 누락된 필드 안내 */}
                  {(!selBook.record?.feeling ||
                    !selBook.record?.careerLink) && (
                    <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="text-[11px] font-bold text-amber-700">
                        ⚠️ 학생이 아직 작성하지 않은 항목:
                        {!selBook.record?.feeling && " 💭 느낀 점"}
                        {!selBook.record?.feeling &&
                          !selBook.record?.careerLink &&
                          " ·"}
                        {!selBook.record?.careerLink && " 🎯 진로 연결점"}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 선생님 피드백 */}
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                    💬 선생님 피드백
                  </div>
                  {selBook.record?.summary &&
                    !selFeedback?.teacher_feedback && (
                      <button
                        onClick={openAiModal}
                        className="px-2.5 py-1 text-white rounded-md text-[11px] font-bold transition-all"
                        style={{
                          background: THEME.accent,
                          boxShadow: `0 2px 6px ${THEME.accentShadow}`,
                        }}
                      >
                        ✨ AI 피드백 제안
                      </button>
                    )}
                </div>

                {/* 기록 없음 */}
                {!selBook.record?.summary && (
                  <div className="bg-gray-50 border border-line rounded-lg px-4 py-5 text-center">
                    <div className="text-[12px] font-medium text-ink-muted">
                      📝 학생이 독서 기록을 작성하면 피드백을 남길 수 있어요.
                    </div>
                  </div>
                )}

                {/* 피드백 완료 */}
                {selBook.record?.summary && selFeedback?.teacher_feedback && (
                  <>
                    <div
                      className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8] mb-2 whitespace-pre-wrap"
                      style={{
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}60`,
                        color: THEME.accentDark,
                      }}
                    >
                      {selFeedback.teacher_feedback}
                    </div>
                    {selFeedback.teacher_at && (
                      <div className="text-[10px] font-medium text-ink-muted mb-2">
                        전달일:{" "}
                        {new Date(selFeedback.teacher_at).toLocaleDateString(
                          "ko-KR",
                        )}
                      </div>
                    )}
                    <button
                      onClick={editFeedback}
                      className="px-3 py-1.5 bg-white text-ink-secondary border border-line rounded-md text-[11px] font-bold hover:bg-gray-50 transition-colors"
                    >
                      ✏️ 수정하기
                    </button>
                  </>
                )}

                {/* 피드백 작성 */}
                {selBook.record?.summary && !selFeedback?.teacher_feedback && (
                  <>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="학생의 독서 기록에 대한 피드백을 작성해주세요..."
                      rows={5}
                      className="w-full border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                      onFocus={handleTextareaFocus}
                      onBlur={handleTextareaBlur}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={sendFeedback}
                        disabled={!feedback.trim() || saveFeedback.isPending}
                        className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                        style={{
                          background:
                            feedback.trim() && !saveFeedback.isPending
                              ? THEME.accent
                              : "#E5E7EB",
                          color:
                            feedback.trim() && !saveFeedback.isPending
                              ? "#fff"
                              : "#9CA3AF",
                          boxShadow:
                            feedback.trim() && !saveFeedback.isPending
                              ? `0 4px 12px ${THEME.accentShadow}`
                              : "none",
                        }}
                      >
                        {saveFeedback.isPending
                          ? "저장 중..."
                          : "📤 피드백 전달"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ==================== AI 피드백 제안 모달 ==================== */}
      {showAiModal && (
        <div
          onClick={() => setShowAiModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[500px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-[18px] font-extrabold text-ink mb-1">
              ✨ AI 피드백 제안
            </div>
            <div className="text-[12px] font-medium text-ink-secondary mb-5">
              학생의 독서 기록을 분석해서 AI가 3가지 피드백 시안을 만들었어요.
              마음에 드는 것을 선택하세요.
            </div>

            {aiLoading ? (
              <div className="text-center py-10 text-ink-muted text-[13px] font-medium">
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                AI가 피드백을 생성 중이에요...
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {aiSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => applyAiSuggestion(s)}
                    className="text-left px-4 py-3 rounded-xl bg-white transition-all"
                    style={{ border: "1px solid #E5E7EB" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = THEME.accent;
                      e.currentTarget.style.background = THEME.accentBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.background = "#fff";
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{
                          color: THEME.accentDark,
                          background: THEME.accentBg,
                          border: `1px solid ${THEME.accentBorder}60`,
                        }}
                      >
                        시안 {i + 1}
                      </span>
                      <span className="text-[13px] font-medium text-ink leading-[1.6]">
                        {s}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAiModal(false)}
              className="w-full h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
