import { useState, useEffect } from "react";
import { useStudentEssays, useStudentQuestions } from "@/pages/admin/_hooks/middle/useStudentExpect";
import ExpectEssayPanel from "./ExpectEssayPanel";
import ExpectQuestionPanel from "./ExpectQuestionPanel";

const THEME = {
  accent: "#059669",
  accentDark: "#065F46",
  accentBg: "#ECFDF5",
  accentBorder: "#6EE7B7",
  accentShadow: "rgba(16, 185, 129, 0.15)",
};

export default function MiddleExpectTab({ student }: { student: any }) {
  const studentId = student?.id ? String(student.id) : undefined;
  const { data: essays = [], isLoading } = useStudentEssays(studentId);

  const [activeTab, setActiveTab] = useState<"essay" | "questions">("essay");
  const [selEssayId, setSelEssayId] = useState<string | null>(null);
  const selEssay = essays.find((e) => e.id === selEssayId) ?? null;

  useEffect(() => {
    if (!selEssayId && essays.length > 0) {
      setSelEssayId(essays[0].id);
    }
  }, [essays.length, selEssayId]);

  const [selSchoolFilter, setSelSchoolFilter] = useState<string>("");
  const [selQId, setSelQId] = useState<string | null>(null);

  useEffect(() => {
    if (!selSchoolFilter) {
      const generated = essays.find((e) => e.questions_generated);
      if (generated) setSelSchoolFilter(generated.school);
    }
  }, [essays, selSchoolFilter]);

  const filterEssay = essays.find((e) => e.school === selSchoolFilter);
  const { data: questions = [] } = useStudentQuestions(filterEssay?.id);

  // 중복 학교 제거
  const schoolsWithQuestions = Array.from(
    new Set(essays.filter((e) => e.questions_generated).map((e) => e.school))
  );

  const countChars = (content: any) =>
    Object.values(content || {}).join("").replace(/\s/g, "").length;

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      {/* 왼쪽 사이드바 */}
      <div className="w-[340px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex border-b border-line flex-shrink-0">
          {[
            { key: "essay", label: "📄 자기소개서" },
            { key: "questions", label: "💬 예상질문" },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className="flex-1 py-3 text-center text-[13px] font-bold transition-all border-b-2"
                style={{
                  color: isActive ? THEME.accentDark : "#9CA3AF",
                  borderColor: isActive ? THEME.accent : "transparent",
                  background: isActive ? THEME.accentBg : "transparent",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 자소서 탭 사이드바 */}
        {activeTab === "essay" && (
          <>
            <div className="px-4 py-2.5 border-b border-line flex-shrink-0">
              <div className="text-[12px] font-medium text-ink-secondary">
                총 <span className="font-extrabold" style={{ color: THEME.accent }}>{essays.length}개</span> 학교
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {isLoading ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  <div className="text-2xl mb-2">⏳</div>
                  <div>불러오는 중...</div>
                </div>
              ) : essays.length === 0 ? (
                <div className="text-center py-10 text-ink-muted">
                  <div className="text-3xl mb-2">📄</div>
                  <div className="text-[12px] font-medium">아직 자소서가 없어요</div>
                </div>
              ) : (
                essays.map((e) => {
                  const isSelected = selEssayId === e.id;
                  const hasContent = !!e.content?.selfStudy || !!e.content?.reason;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelEssayId(e.id)}
                      className="w-full rounded-xl px-3.5 py-3 mb-1.5 text-left transition-all"
                      style={{
                        border: `1px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                        background: isSelected ? THEME.accentBg : "#fff",
                        boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : "none",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-base">🏫</span>
                        <div className="text-[13.5px] font-extrabold tracking-tight flex-1" style={{ color: isSelected ? THEME.accentDark : "#1a1a1a" }}>
                          {e.school}
                        </div>
                        {e.version > 1 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: THEME.accent, background: THEME.accentBg }}>
                            v{e.version}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-medium text-ink-muted mb-1.5">
                        📅 {new Date(e.updated_at).toLocaleDateString("ko-KR")}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {hasContent ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                            ✓ {countChars(e.content)}자
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">⏳ 미작성</span>
                        )}
                        {e.essay_completed && !e.questions_generated && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✓ 학생완료</span>
                        )}
                        {e.questions_generated && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">✨ 질문완료</span>
                        )}
                        {e.delete_requested && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">⚠️ 삭제요청</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* 예상질문 탭 사이드바 */}
        {activeTab === "questions" && (
          <>
            <div className="px-3 py-2.5 border-b border-line flex-shrink-0">
              {schoolsWithQuestions.length === 0 ? (
                <div className="text-[11px] font-medium text-ink-muted">
                  아직 생성된 예상질문이 없어요.
                </div>
              ) : (
                <div className="flex gap-1.5 flex-wrap">
                  {schoolsWithQuestions.map((school) => {
                    const isActive = selSchoolFilter === school;
                    return (
                      <button
                        key={school}
                        onClick={() => {
                          setSelSchoolFilter(school);
                          setSelQId(null);
                        }}
                        className="px-3 py-1 rounded-full text-[11px] font-bold border transition-all"
                        style={{
                          borderColor: isActive ? THEME.accent : "#E5E7EB",
                          background: isActive ? THEME.accentBg : "#fff",
                          color: isActive ? THEME.accentDark : "#6B7280",
                        }}
                      >
                        🏫 {school}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-b border-line flex-shrink-0">
              <div className="text-[12px] font-medium text-ink-secondary">
                총 <span className="font-extrabold" style={{ color: THEME.accent }}>{questions.length}개</span>
                {" · 답변 "}
                <span className="font-extrabold" style={{ color: THEME.accent }}>
                  {questions.filter((q) => q.answer).length}개
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {questions.length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  <div className="text-3xl mb-2">💬</div>
                  <div className="font-medium">예상질문이 없어요.</div>
                </div>
              ) : (
                questions.map((q, i) => {
                  const isSelected = selQId === q.id;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelQId(q.id)}
                      className="w-full rounded-xl px-3.5 py-3 mb-1.5 text-left transition-all"
                      style={{
                        border: `1px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                        background: isSelected ? THEME.accentBg : "#fff",
                        boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : "none",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                          Q{i + 1}
                        </span>
                        {q.tag && (
                          <span className="text-[10px] font-semibold text-ink-secondary bg-gray-100 px-1.5 py-0.5 rounded-full">
                            {q.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-[12.5px] font-semibold leading-[1.5] mb-1.5" style={{ color: isSelected ? THEME.accentDark : "#1a1a1a" }}>
                        {q.text}
                      </div>
                      {q.answer ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: THEME.accent, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                          ✓ 답변완료
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ⏳ 미답변
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* 메인 패널 */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
        {activeTab === "essay" && (
          <ExpectEssayPanel
            student={student}
            selEssay={selEssay}
            setSelEssayId={setSelEssayId}
            setActiveTab={setActiveTab}
            setSelSchoolFilter={setSelSchoolFilter}
          />
        )}
        {activeTab === "questions" && (
          <ExpectQuestionPanel
            student={student}
            essays={essays}
            selSchoolFilter={selSchoolFilter}
            selQId={selQId}
            setSelQId={setSelQId}
          />
        )}
      </div>
    </div>
  );
}