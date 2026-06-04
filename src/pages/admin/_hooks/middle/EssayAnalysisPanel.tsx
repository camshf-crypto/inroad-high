// src/pages/admin/_hooks/middle/EssayAnalysisPanel.tsx
// 선생님용 AI 분석 사이드 패널 (가로 2단: 학생 진단 | 선생님 코칭)
// SectionAnalysisResult(feedback/coaching)를 렌더. 옛 형식이 와도 안 깨지게 폴백 처리.

import type { SectionAnalysisResult } from "@/pages/admin/_hooks/middle/useAiEssay";

const THEME = {
  accent: "#059669",
  accentDark: "#065F46",
  accentBg: "#ECFDF5",
  accentBorder: "#6EE7B7",
  info: "#2563EB",
  infoBg: "#EFF6FF",
  warn: "#D97706",
  warnBg: "#FFFBEB",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
};

const levelColor = (level: string) =>
  level === "high" ? THEME.accent : level === "low" ? THEME.danger : THEME.info;
const levelLabel = (level: string) =>
  level === "high" ? "충분" : level === "low" ? "미흡" : "보통";
const quoteStyle = (type: string) => {
  if (type === "strength")
    return { border: THEME.accentBorder, bg: THEME.accentBg, fg: THEME.accentDark, tag: "잘함" };
  if (type === "missing")
    return { border: "#CBD5E1", bg: "#F8FAFC", fg: "#475569", tag: "빠짐" };
  return { border: "#FCD34D", bg: THEME.warnBg, fg: "#92400E", tag: "아쉬움" };
};
const priColor = (p: string) => (p === "urgent" ? THEME.danger : THEME.warn);

export default function EssayAnalysisPanel({
  sectionLabel,
  usedCount,
  maxCount,
  isLoading,
  result,
  onClose,
  onUseFeedback,
}: {
  sectionLabel: string;
  usedCount: number;
  maxCount: number;
  isLoading: boolean;
  result?: SectionAnalysisResult;
  onClose: () => void;
  onUseFeedback: () => void;
}) {
  const fb = result?.feedback;
  const co = result?.coaching;
  const isPlatform = result?.scoringMode === "platform";

  return (
    <div className="fixed top-0 right-0 bottom-0 w-[760px] max-w-[92vw] bg-white border-l border-line flex flex-col shadow-[-8px_0_24px_rgba(15,23,42,0.08)] z-50">
      {/* 헤더 */}
      <div className="px-4 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
        <div>
          <div className="text-[14px] font-extrabold text-ink tracking-tight">✨ AI 분석 · {sectionLabel}</div>
          <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
            <span style={{ color: THEME.accent }}>{usedCount}/{maxCount} 사용됨</span>
            {isPlatform && <span className="text-ink-muted"> · 점수는 진단용 추정치(공식 아님)</span>}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-ink-muted hover:text-ink text-base w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* 로딩 */}
      {isLoading && !result && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-3xl mb-3 animate-pulse">🤖</div>
          <div className="text-[13px] font-bold text-ink-secondary">AI가 분석 중...</div>
        </div>
      )}

      {result && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row">
            {/* ── 왼쪽: 학생 진단 ── */}
            <div className="flex-1 min-w-0 p-4 md:border-r border-line flex flex-col gap-3">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink-secondary">📊 학생 진단</div>

              {/* 완성도 게이지 */}
              <div className="rounded-xl px-4 py-3" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <div className="text-[11px] text-ink-secondary">현재 완성도</div>
                    <div className="text-[11px] font-bold" style={{ color: THEME.accentDark }}>{fb?.statusLabel || "-"}</div>
                  </div>
                  <div className="text-[22px] font-extrabold" style={{ color: THEME.accentDark }}>
                    {fb?.completeness ?? 0}<span className="text-[11px] text-ink-muted">%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden relative" style={{ background: "#fff" }}>
                  <div className="h-full rounded-full" style={{ width: `${fb?.completeness ?? 0}%`, background: THEME.accent }} />
                  <div className="absolute top-[-3px] w-0.5 h-3.5" style={{ left: `${fb?.passLine ?? 80}%`, background: THEME.accent }} />
                </div>
                {fb?.summary && <p className="text-[11.5px] leading-[1.55] mt-2" style={{ color: THEME.accentDark }}>{fb.summary}</p>}
              </div>

              {/* 항목별 충족도 */}
              {fb?.criteria && fb.criteria.length > 0 && (
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink mb-2.5">문항 기준 충족도</div>
                  <div className="flex flex-col gap-2">
                    {fb.criteria.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[11px] text-ink-secondary w-[68px] flex-shrink-0 truncate" title={c.label}>{c.label}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${c.ratio}%`, background: levelColor(c.level) }} />
                        </div>
                        <span className="text-[10px] font-bold w-7 text-right" style={{ color: levelColor(c.level) }}>{levelLabel(c.level)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 문장별 진단 */}
              {fb?.quotes && fb.quotes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary">문장별 진단</div>
                  {fb.quotes.map((q, i) => {
                    const s = quoteStyle(q.type);
                    return (
                      <div key={i} className="px-3 py-2" style={{ borderLeft: `3px solid ${s.border}`, background: s.bg }}>
                        {q.type !== "missing" && <div className="text-[11.5px] leading-[1.5] text-ink mb-1">{q.text}</div>}
                        <div className="text-[11px] leading-[1.5]" style={{ color: s.fg }}>
                          <b className="font-bold">{s.tag}</b> · {q.comment || q.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 폴백: feedback 없고 옛 형식만 올 때 */}
              {!fb && result.strengths?.length > 0 && (
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink mb-1.5">강점</div>
                  <ul className="text-[12px] text-ink-secondary space-y-1 list-disc list-inside">
                    {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* ── 오른쪽: 선생님 코칭 ── */}
            <div className="flex-1 min-w-0 p-4 flex flex-col gap-3" style={{ background: THEME.infoBg }}>
              <div className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: THEME.info }}>
                🏫 선생님 지도 가이드
              </div>
              <p className="text-[11px] leading-[1.5]" style={{ color: THEME.info }}>
                아래 질문을 순서대로 학생에게 던져주세요.
              </p>

              {co?.steps && co.steps.length > 0 ? (
                <>
                  {co.steps.map((step, i) => (
                    <div key={i} className="bg-white rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-5 h-5 rounded-full text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0" style={{ background: priColor(step.priority) }}>
                          {step.order}
                        </span>
                        <span className="text-[12px] font-bold text-ink">{step.title}</span>
                        {step.priority === "urgent" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: THEME.dangerBg, color: THEME.danger }}>시급</span>
                        )}
                      </div>
                      {step.why && <div className="text-[10px] text-ink-muted leading-[1.45] mb-1.5">{step.why}</div>}
                      {step.askText && (
                        <div className="rounded-md px-2.5 py-2 mb-1" style={{ background: "#F8FAFC" }}>
                          <span className="text-[11.5px] leading-[1.5] text-ink">💬 {step.askText}</span>
                        </div>
                      )}
                      {step.followUp && <div className="text-[10px] text-ink-muted leading-[1.45]">→ {step.followUp}</div>}
                    </div>
                  ))}

                  {/* 효과 */}
                  <div className="rounded-md px-3 py-2 flex items-center justify-between" style={{ background: THEME.accentBg }}>
                    <span className="text-[10px]" style={{ color: THEME.accentDark }}>채우면</span>
                    <span className="text-[11px]" style={{ color: THEME.accentDark }}>
                      <b className="font-bold">{co.expectedFrom}%</b> → <b className="font-bold text-[14px]">{co.expectedTo}%</b>
                    </span>
                  </div>

                  {co.caution && (
                    <div className="text-[10px] leading-[1.5] px-1" style={{ color: THEME.warn }}>⚠ {co.caution}</div>
                  )}
                </>
              ) : (
                <div className="text-[12px] text-ink-muted">코칭 가이드가 아직 없어요. 다시 분석해보세요.</div>
              )}

              <button
                onClick={onUseFeedback}
                className="w-full h-10 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px mt-1"
                style={{ background: THEME.info, boxShadow: "0 4px 12px rgba(37,99,235,0.2)" }}
              >
                ✨ 이 분석으로 피드백 작성하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}