export type RoundScope = "section" | "overall";

export type RoundDef = {
  round: number;
  name: string;
  scope: RoundScope;
  focus: string;
  checklist: string[];
};

export const ROUND_DEFS: RoundDef[] = [
  {
    round: 1,
    name: "소재",
    scope: "section",
    focus: "무엇을 쓸지 정하는 단계예요. 문장은 아직 다듬지 않아요.",
    checklist: ["항목마다 경험이 하나로 정해졌는가", "학교 안에서 한 경험인가"],
  },
  {
    round: 2,
    name: "근거",
    scope: "section",
    focus: "정한 경험에 장면과 행동을 채우는 단계예요.",
    checklist: ["장면이 드러나는가", "내가 한 행동이 동사로 있는가", "결과·변화가 있는가"],
  },
  {
    round: 3,
    name: "표현",
    scope: "section",
    focus: "이제 문장과 분량을 다듬어요.",
    checklist: ["같은 표현이 반복되지 않는가", "글자수를 지켰는가", "금지 기재가 없는가"],
  },
  {
    round: 4,
    name: "통독",
    scope: "overall",
    focus: "항목 전체를 이어서 읽고 일관성을 확인해요.",
    checklist: ["항목마다 같은 사람으로 읽히는가", "같은 소재를 두 번 쓰지 않았는가", "시간 순서가 맞는가"],
  },
];

export const SECTION_ROUNDS = ROUND_DEFS.filter((r) => r.scope === "section");
export const MAX_SECTION_ROUND = SECTION_ROUNDS.length;

const getRoundDef = (round: number) => ROUND_DEFS.find((r) => r.round === round);

type AnswerRow = { id: string; round: number; content: string; created_at: string };
type FeedbackRow = { id: string; round: number; text: string; created_at: string };

interface EssayRoundsProps {
  sectionLabel: string;
  answers: AnswerRow[];
  feedbacks: FeedbackRow[];
  isLocked: boolean;
  activeRound: number;
  onChangeRound: (round: number) => void;
  draftText: string;
  onChangeDraft: (text: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

const fmtDate = (s: string) => new Date(s).toLocaleDateString("ko-KR");

function RoundBadge({ round, tone }: { round: number; tone: "answer" | "feedback" }) {
  const def = getRoundDef(round);
  return (
    <span
      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
        tone === "answer" ? "text-white bg-brand-middle" : "text-brand-middle-dark bg-brand-middle-bg"
      }`}
    >
      {round}차 {def?.name}
    </span>
  );
}

export default function EssayRounds({
  sectionLabel,
  answers,
  feedbacks,
  isLocked,
  activeRound,
  onChangeRound,
  draftText,
  onChangeDraft,
  onSubmit,
  isPending,
}: EssayRoundsProps) {
  const lastAnswerRound = answers.length ? Math.max(...answers.map((a) => a.round)) : 0;
  const lastFeedbackRound = feedbacks.length ? Math.max(...feedbacks.map((f) => f.round)) : 0;

  const canWriteNext =
    !isLocked && lastFeedbackRound >= lastAnswerRound && lastAnswerRound < MAX_SECTION_ROUND;
  const draftRound = canWriteNext ? lastAnswerRound + 1 : 0;
  const openUpTo = Math.max(lastAnswerRound, draftRound, 1);

  const activeDef = getRoundDef(activeRound);
  const activeAnswer = answers.find((a) => a.round === activeRound) ?? null;
  const activeFeedback = feedbacks.find((f) => f.round === activeRound) ?? null;
  const prevAnswer = answers.find((a) => a.round === activeRound - 1) ?? null;
  const prevFeedback = feedbacks.find((f) => f.round === activeRound - 1) ?? null;

  const isDraftTab = activeRound === draftRound && !activeAnswer;
  const waitingFeedback = lastAnswerRound > lastFeedbackRound;
  const allDone = lastAnswerRound >= MAX_SECTION_ROUND && lastFeedbackRound >= MAX_SECTION_ROUND;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12px] font-bold text-brand-middle-dark">{sectionLabel}</div>
        {allDone && (
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            ✓ 4차까지 마침
          </span>
        )}
      </div>

      <div className="flex gap-1.5 mb-2.5">
        {SECTION_ROUNDS.map((def) => {
          const isOpen = def.round <= openUpTo;
          const isOn = def.round === activeRound;
          return (
            <button
              key={def.round}
              onClick={() => isOpen && onChangeRound(def.round)}
              disabled={!isOpen}
              className={`px-3 py-1.5 rounded-lg text-[11px] border transition-all ${
                isOn
                  ? "border-brand-middle bg-brand-middle-pale text-brand-middle-dark font-bold"
                  : isOpen
                    ? "border-line bg-white text-ink-secondary font-medium hover:border-brand-middle-light"
                    : "border-line bg-gray-50 text-ink-muted font-medium cursor-not-allowed"
              }`}
            >
              {!isOpen && "🔒 "}
              {def.round}차 {def.name}
            </button>
          );
        })}
      </div>

      {activeDef && (
        <div className="text-[11px] text-ink-muted mb-2">{activeDef.focus}</div>
      )}

      <div className="grid grid-cols-2 gap-3 items-start">
        <div className="bg-white border border-line rounded-xl p-3">
          {activeRound === 1 ? (
            <div className="text-[11px] text-ink-muted text-center py-8 leading-relaxed">
              1차는 첫 작성이라
              <br />
              비교할 이전 차수가 없어요.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-2">
                <RoundBadge round={activeRound - 1} tone="answer" />
                {prevAnswer && (
                  <span className="text-[9px] text-ink-muted ml-auto">{fmtDate(prevAnswer.created_at)}</span>
                )}
              </div>
              <div className="text-[13px] text-ink-secondary leading-[1.8] whitespace-pre-wrap">
                {prevAnswer?.content || "이전 차수 답변이 없어요."}
              </div>

              {prevFeedback && (
                <div className="mt-3 pt-2.5 border-t border-line">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <RoundBadge round={prevFeedback.round} tone="feedback" />
                    <span className="text-[9px] text-ink-muted">피드백</span>
                  </div>
                  <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2 text-[12px] text-brand-middle-dark leading-[1.7] whitespace-pre-wrap">
                    {prevFeedback.text}
                  </div>
                  <div className="mt-2 space-y-1">
                    {getRoundDef(prevFeedback.round)?.checklist.map((c) => (
                      <div key={c} className="text-[11px] text-ink-secondary flex items-start gap-1.5">
                        <span className="text-ink-muted flex-shrink-0">☐</span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className={`bg-white rounded-xl p-3 border ${
            isDraftTab ? "border-brand-middle" : "border-line"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <RoundBadge round={activeRound} tone="answer" />
            {activeAnswer && (
              <span className="text-[9px] text-ink-muted ml-auto">{fmtDate(activeAnswer.created_at)}</span>
            )}
          </div>

          {isDraftTab ? (
            <>
              <textarea
                value={draftText}
                onChange={(e) => onChangeDraft(e.target.value)}
                rows={9}
                placeholder={`${activeRound}차 — ${activeDef?.focus ?? ""}`}
                className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
              />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-ink-muted mr-auto">
                  {draftText.replace(/\s/g, "").length}자
                </span>
                <button
                  onClick={onSubmit}
                  disabled={!draftText.trim() || isPending}
                  className={`h-9 px-4 rounded-lg text-[12px] font-semibold transition-all ${
                    draftText.trim() && !isPending
                      ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle"
                      : "bg-gray-100 text-ink-muted cursor-not-allowed"
                  }`}
                >
                  {isPending ? "저장 중..." : `${activeRound}차 제출`}
                </button>
              </div>
            </>
          ) : activeAnswer ? (
            <>
              <div className="text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">
                {activeAnswer.content}
              </div>
              {activeFeedback ? (
                <div className="mt-3 pt-2.5 border-t border-line">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <RoundBadge round={activeFeedback.round} tone="feedback" />
                    <span className="text-[9px] text-ink-muted">피드백</span>
                  </div>
                  <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2 text-[12px] text-brand-middle-dark leading-[1.7] whitespace-pre-wrap">
                    {activeFeedback.text}
                  </div>
                </div>
              ) : (
                waitingFeedback &&
                activeRound === lastAnswerRound && (
                  <div className="mt-3 bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[11px] text-ink-muted text-center">
                    선생님 피드백을 기다리는 중이에요.
                  </div>
                )
              )}
            </>
          ) : (
            <div className="text-[11px] text-ink-muted text-center py-10 leading-relaxed">
              {isLocked
                ? "자소서가 잠겨서 더 쓸 수 없어요."
                : "앞 차수 피드백을 받아야 열려요."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}