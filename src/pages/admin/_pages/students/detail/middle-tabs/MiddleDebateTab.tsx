// src/pages/admin/_pages/.../middle-tabs/MiddleDebateTab.tsx
// 어드민 - AI 토론 피드백 (수행평가 패턴: 본문 깔끔 + 우측 AI 패널 + AI 초안 작성)

import { useState, useEffect, useMemo, useCallback, type FocusEvent } from "react";
import { supabase } from "@/lib/supabase";

const THEME = {
  accent: "#059669",
  accentDark: "#065F46",
  accentBg: "#ECFDF5",
  accentBorder: "#6EE7B7",
  accentShadow: "rgba(16, 185, 129, 0.15)",
};

// ── 타입 ──
interface DebateMessage {
  speaker: "ai" | "student";
  text: string;
  timestamp?: number;
}
interface FeedbackCriterion {
  name: string;
  term: string;
  theory: string;
  score: number;
  quote: string;
  good: string;
  bad: string;
  tip: string;
}
interface AiFeedback {
  overall: { grade: string; summary: string };
  criteria: FeedbackCriterion[];
  teacherDraft?: string;
}
interface DebateSession {
  id: string;
  topic: string;
  topic_category: string;
  student_stance: string;
  ai_stance: string;
  messages: DebateMessage[];
  elapsed_sec: number;
  turn_count: number;
  ai_feedback: AiFeedback | null;
  teacher_feedback: string | null;
  status: string;
  created_at: string;
}

const stanceKo = (s: string) => (s === "pro" ? "찬성" : s === "con" ? "반대" : "중립");

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso)
      .toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .replace(/\. /g, ".")
      .replace(".,", ",");
  } catch {
    return "";
  }
}

const scoreColor = (score: number) => {
  if (score >= 4) return { text: "#15803D", bg: "#DCFCE7" };
  if (score === 3) return { text: "#1D4ED8", bg: "#DBEAFE" };
  return { text: "#B45309", bg: "#FEF3C7" };
};

export default function MiddleDebateTab({ student }: { student: any }) {
  const studentId = student?.id ? String(student.id) : undefined;

  const [sessions, setSessions] = useState<DebateSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [fbText, setFbText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  // 토론 세션 조회
  const fetchSessions = useCallback(async () => {
    if (!studentId) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("debate_sessions")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("토론 조회 실패:", error);
      setSessions([]);
    } else {
      setSessions((data || []) as DebateSession[]);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    setSelId(null);
    setFbText("");
    setShowAiPanel(false);
  }, [studentId]);

  useEffect(() => {
    if (!selId && sessions.length > 0) {
      setSelId(sessions[0].id);
      setFbText(sessions[0].teacher_feedback || "");
    }
  }, [sessions, selId]);

  const selSession = useMemo(
    () => sessions.find((s) => s.id === selId) ?? null,
    [sessions, selId],
  );

  const handleSelect = (s: DebateSession) => {
    setSelId(s.id);
    setFbText(s.teacher_feedback || "");
    setShowAiPanel(false);
  };

  const sendFeedback = async () => {
    if (!fbText.trim() || !selSession) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("debate_sessions")
        .update({ teacher_feedback: fbText, status: "completed" })
        .eq("id", selSession.id);
      if (error) throw error;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === selSession.id
            ? { ...s, teacher_feedback: fbText, status: "completed" }
            : s,
        ),
      );
      alert("✅ 토론 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // AI 분석(점수+항목별) + 초안을 조립해서 피드백란에 채우기
  const generateTeacherDraft = () => {
    if (!selSession?.ai_feedback) return;
    setDraftLoading(true);
    setTimeout(() => {
      const fb = selSession.ai_feedback!;
      const score = fb.criteria.reduce((sum, c) => sum + c.score, 0) * 5;

      // 점수 요약
      let text = `📊 AI 토론 평가: ${fb.overall.grade}등급 (${score}/100점)\n`;
      text += `${"─".repeat(20)}\n`;

      // 4항목별 점수 + 팁
      fb.criteria.forEach((c) => {
        text += `• ${c.name} ${c.score * 5}/25점`;
        if (c.tip) text += ` · ${c.tip}`;
        text += `\n`;
      });

      // 선생님 코멘트 (AI 초안 있으면 사용, 없으면 종합평가)
      text += `\n💬 선생님 코멘트\n`;
      const comment = fb.teacherDraft || fb.overall.summary || "";
      text += comment;

      setFbText(text);
      alert("✏️ AI 분석을 정리해서 피드백 초안을 만들었어요!\n아래에서 수정 후 전달해주세요.");
      setDraftLoading(false);
    }, 300);
  };

  const handleFocus = (e: FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent;
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`;
  };
  const handleBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#E5E7EB";
    e.target.style.boxShadow = "none";
  };

  const totalCount = sessions.length;
  const pendingCount = sessions.filter((s) => s.status === "pending").length;
  const completedCount = sessions.filter((s) => s.status === "completed").length;

  const totalScore = selSession?.ai_feedback
    ? selSession.ai_feedback.criteria.reduce((sum, c) => sum + c.score, 0) * 5
    : 0;

  const fbDone = !!selSession?.teacher_feedback;

  return (
    <>
      <div className="flex gap-4 h-full overflow-hidden">
        {/* ─── 좌측 목록 ─── */}
        <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[16px]">💬</span>
              <div className="text-[15px] font-extrabold text-ink tracking-tight">AI 토론</div>
            </div>
            <div className="text-[11px] font-medium text-ink-secondary">
              총 <span className="font-bold" style={{ color: THEME.accent }}>{totalCount}건</span>
              <span className="mx-1.5 text-ink-muted">·</span>
              대기 <span className="font-bold text-amber-700">{pendingCount}건</span>
              <span className="mx-1.5 text-ink-muted">·</span>
              완료 <span className="font-bold" style={{ color: THEME.accentDark }}>{completedCount}건</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {loading ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">
                <div className="text-2xl mb-2">⏳</div>
                <div className="font-medium">불러오는 중...</div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">
                <div className="text-3xl mb-2">📭</div>
                <div className="font-medium mb-1">아직 토론 기록이 없어요</div>
              </div>
            ) : (
              sessions.map((s) => {
                const isSel = selId === s.id;
                const isPending = s.status === "pending";
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    className="w-full rounded-xl px-3 py-3 mb-1.5 text-left transition-all"
                    style={{
                      border: `1.5px solid ${isSel ? THEME.accent : "#E5E7EB"}`,
                      background: isSel ? THEME.accentBg : "#fff",
                      boxShadow: isSel ? `0 2px 8px ${THEME.accentShadow}` : "none",
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                        style={{ background: isSel ? "#fff" : "#F3F4F6", border: `1px solid ${isSel ? THEME.accentBorder : "#E5E7EB"}` }}
                      >
                        💬
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-extrabold leading-[1.35] mb-0.5 line-clamp-2" style={{ color: isSel ? THEME.accentDark : "#1a1a1a" }}>
                          {s.topic}
                        </div>
                        <div className="text-[11px] font-medium text-ink-muted mb-1.5">
                          내 입장: {stanceKo(s.student_stance)} · {formatDate(s.created_at)}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-ink-secondary">
                            {s.topic_category === "admission" ? "입시 면접" : "사회 이슈"}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                            style={
                              isPending
                                ? { background: "#FEF3C7", color: "#92400E", borderColor: "#FCD34D80" }
                                : { background: "#D1FAE5", color: "#065F46", borderColor: "#6EE7B780" }
                            }
                          >
                            {isPending ? "⏳ 피드백 대기" : "✓ 완료"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─── 가운데 상세 (본문: 대화 + 피드백만) ─── */}
        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
          {!selSession ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">💬</div>
              <div className="text-[14px] font-bold text-ink-secondary">토론 기록을 선택해주세요</div>
            </div>
          ) : (
            <>
              {/* 헤더 */}
              <div className="px-5 py-5 border-b border-line flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px]">💬</span>
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                    >
                      {selSession.topic_category === "admission" ? "입시 면접" : "사회 이슈"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* AI 분석 보기 버튼 */}
                    <button
                      onClick={() => setShowAiPanel((v) => !v)}
                      disabled={!selSession.ai_feedback}
                      className="px-4 py-2 rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: showAiPanel ? THEME.accent : "#fff",
                        color: showAiPanel ? "#fff" : THEME.accent,
                        border: `1.5px solid ${THEME.accent}`,
                        boxShadow: showAiPanel ? `0 4px 12px ${THEME.accentShadow}` : `0 2px 6px ${THEME.accentShadow}`,
                      }}
                    >
                      ✨ AI 분석 {showAiPanel ? "닫기" : "보기"}
                    </button>
                    <span
                      className="px-4 py-2 rounded-lg text-[13px] font-bold"
                      style={
                        fbDone
                          ? { background: THEME.accentBg, color: THEME.accentDark, border: `1.5px solid ${THEME.accentBorder}` }
                          : { background: "#FEF3C7", color: "#92400E", border: "1.5px solid #FCD34D" }
                      }
                    >
                      {fbDone ? "✓ 피드백 완료" : "⏳ 피드백 대기"}
                    </span>
                  </div>
                </div>

                <div className="text-[15px] font-extrabold text-ink tracking-tight leading-[1.5]">{selSession.topic}</div>
                <div className="text-[11px] font-medium text-ink-muted mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="bg-gray-100 px-2 py-0.5 rounded-full">내 입장: {stanceKo(selSession.student_stance)}</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded-full">서연: {stanceKo(selSession.ai_stance)}</span>
                  <span>· ⏱️ {formatTime(selSession.elapsed_sec)}</span>
                  <span>· 💬 발언 {selSession.turn_count}회</span>
                  <span>· 📅 {formatDate(selSession.created_at)}</span>
                </div>
              </div>

              {/* 본문 */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                {/* 토론 대화 전체 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                  <div className="text-[12px] font-extrabold text-ink mb-3">🗣️ 토론 전체 내용</div>
                  <div className="flex flex-col gap-2.5">
                    {selSession.messages.length === 0 ? (
                      <div className="text-[12px] text-ink-muted text-center py-4">대화 내용이 없어요</div>
                    ) : (
                      selSession.messages.map((m, i) => (
                        <div key={i} className={`flex gap-2 ${m.speaker === "student" ? "flex-row-reverse" : ""}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] flex-shrink-0 ${m.speaker === "student" ? "bg-emerald-100" : "bg-pink-100"}`}>
                            {m.speaker === "student" ? "🙂" : "👩‍🎓"}
                          </div>
                          <div className="max-w-[78%]">
                            <div className={`text-[10px] font-semibold text-ink-muted mb-0.5 ${m.speaker === "student" ? "text-right" : ""}`}>
                              {m.speaker === "student" ? "학생" : "서연 (AI)"}
                            </div>
                            <div
                              className="px-3 py-2 rounded-2xl text-[12.5px] leading-relaxed"
                              style={
                                m.speaker === "student"
                                  ? { background: THEME.accent, color: "#fff" }
                                  : { background: "#F3F4F6", color: "#1a1a1a" }
                              }
                            >
                              {m.text}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 선생님 피드백 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>
                      선생님
                    </span>
                    <span className="text-[12px] font-bold text-ink-secondary">👨‍🏫 토론 피드백</span>
                  </div>
                  {fbDone ? (
                    <div
                      className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8] whitespace-pre-wrap"
                      style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60`, color: THEME.accentDark }}
                    >
                      {selSession.teacher_feedback}
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={fbText}
                        onChange={(e) => setFbText(e.target.value)}
                        placeholder="직접 작성하거나, 우측 'AI 분석 보기' → '✏️ 선생님 피드백 작성하기' 버튼으로 AI 초안을 받아 다듬으세요."
                        rows={6}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={sendFeedback}
                          disabled={!fbText.trim() || saving}
                          className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                          style={{
                            background: fbText.trim() && !saving ? THEME.accent : "#E5E7EB",
                            color: fbText.trim() && !saving ? "#fff" : "#9CA3AF",
                            boxShadow: fbText.trim() && !saving ? `0 4px 12px ${THEME.accentShadow}` : "none",
                          }}
                        >
                          {saving ? "전달 중..." : "📤 피드백 전달"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── 우측 AI 분석 슬라이드 패널 ─── */}
      {showAiPanel && selSession && selSession.ai_feedback && (
        <div className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-line flex flex-col shadow-[-8px_0_24px_rgba(15,23,42,0.08)] z-50">
          <div className="px-4 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">✨ AI 토론 분석</div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5 line-clamp-1">{selSession.topic}</div>
            </div>
            <button onClick={() => setShowAiPanel(false)} className="text-ink-muted hover:text-ink text-base w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {/* 종합 점수 */}
            <div className="rounded-xl px-5 py-4 text-center" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
              <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">AI 종합 평가</div>
              <div className="flex items-center justify-center gap-4">
                <div>
                  <div className="text-[10px] font-bold text-ink-muted mb-0.5">등급</div>
                  <div className="text-[40px] font-black leading-none" style={{ color: THEME.accentDark }}>
                    {selSession.ai_feedback.overall.grade}
                  </div>
                </div>
                <div className="w-px h-14 bg-line" />
                <div>
                  <div className="text-[10px] font-bold text-ink-muted mb-0.5">점수</div>
                  <div className="text-[32px] font-black leading-none" style={{ color: THEME.accentDark }}>
                    {totalScore}
                    <span className="text-[14px] font-bold text-ink-muted ml-1">/ 100</span>
                  </div>
                </div>
              </div>
              <div className="text-[12px] font-medium text-ink-secondary leading-[1.7] mt-3">
                {selSession.ai_feedback.overall.summary}
              </div>
            </div>

            {/* 4항목 분석 */}
            <div>
              <div className="text-[12px] font-extrabold text-ink mb-2.5">📋 항목별 분석 (각 25점)</div>
              <div className="flex flex-col gap-2.5">
                {selSession.ai_feedback.criteria.map((c, i) => {
                  const sc = scoreColor(c.score);
                  return (
                    <div key={i} className="bg-gray-50 border border-line rounded-lg px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[13px] font-bold text-ink">
                          {c.name} <span className="text-[10px] text-ink-muted font-medium">{c.term}</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ color: sc.text, background: sc.bg }}>
                          {c.score * 5} / 25점
                        </span>
                      </div>
                      {c.quote && (
                        <div className="text-[11px] text-ink-secondary italic mb-1 bg-white rounded px-2 py-1 border border-line">
                          💬 "{c.quote}"
                        </div>
                      )}
                      <div className="text-[12px] leading-[1.6] space-y-0.5">
                        {c.good && <div><span className="font-semibold" style={{ color: THEME.accent }}>좋은 점 · </span>{c.good}</div>}
                        {c.bad && <div><span className="font-semibold text-red-500">아쉬운 점 · </span>{c.bad}</div>}
                        {c.tip && <div className="text-ink-secondary"><span className="font-semibold" style={{ color: THEME.accentDark }}>→ 팁 · </span>{c.tip}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 하단: AI 초안 작성 버튼 */}
          {!fbDone && (
            <div className="px-4 py-3 border-t border-line flex-shrink-0" style={{ background: "#FAFBFC" }}>
              <button
                onClick={generateTeacherDraft}
                disabled={draftLoading}
                className="w-full py-3 text-white rounded-lg text-[13px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: draftLoading ? "#A7F3D0" : THEME.accent, boxShadow: !draftLoading ? `0 4px 12px ${THEME.accentShadow}` : "none" }}
              >
                {draftLoading ? "✨ 작성 중..." : "✏️ 선생님 피드백 작성하기"}
              </button>
              <div className="text-[10px] text-ink-muted mt-1.5 text-center leading-[1.5]">AI가 분석을 토대로 초안을 작성해요. 피드백란에서 수정 후 전달하세요.</div>
            </div>
          )}
          {fbDone && (
            <div className="px-4 py-3 border-t border-line flex-shrink-0" style={{ background: THEME.accentBg }}>
              <div className="text-[12px] text-center font-bold" style={{ color: THEME.accentDark }}>
                ✓ 이미 피드백이 전달되었어요
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}