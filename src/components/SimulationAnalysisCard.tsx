// ─────────────────────────────────────────────
// 어드민 시뮬레이션 음성분석 요약 카드 (고등/중등 공용)
//   - 질문별 분석 지표 배열을 받아 전체 1개로 합산/평균하여 표시
//   - 고등: high_simulation_questions 행들의 분석 컬럼을 metrics[]로 변환해 전달
//   - 중등: ai_analysis(jsonb)의 값들을 metrics[]로 변환해 전달
//   - 기준값/계산 로직은 여기 한 곳에서만 관리 (양쪽 화면 동일)
// 저장 위치 예시: src/pages/admin/_components/SimulationAnalysisCard.tsx
// ─────────────────────────────────────────────

// 평균 비교 기준 (고정값)
const AVG_SPEED = 170;

// 한 질문의 분석 지표 (고등 컬럼 / 중등 ai_analysis 공통 형태)
export interface QuestionMetric {
  speech_speed?: number | null;
  speed_label?: string | null;
  filler_count?: number | null;
  filler_words?: string[] | null;
  pause_count?: number | null;
  longest_pause_sec?: number | null;
  pitch_variation?: number | null;
  intonation_label?: string | null;
  clarity_score?: number | null;
  low_conf_words?: string[] | null;
}

// 합산 결과
interface Summary {
  avgSpeed: number;        // 평균 말 속도(음절/분)
  speedLabel: string;      // 느림/적정/빠름
  totalPause: number;      // 멈칫 총 횟수
  pauseLevel: string;      // 양호/주의
  pauseComment: string;
  fillerList: string[];    // 군말 모음 (중복 제거)
  avgClarity: number;      // 평균 명료도
  count: number;           // 분석된 질문 수
}

// 속도 라벨 (aligner.ts 기준과 동일하게 유지)
const speedLabelOf = (v: number) =>
  v < 280 ? "느림" : v > 360 ? "빠름" : "적정";

export function summarize(metrics: QuestionMetric[]): Summary | null {
  const valid = metrics.filter((m) => m && m.speech_speed != null);
  if (valid.length === 0) return null;

  const count = valid.length;

  const avgSpeed = Math.round(
    valid.reduce((s, m) => s + (m.speech_speed || 0), 0) / count,
  );

  const totalPause = valid.reduce((s, m) => s + (m.pause_count || 0), 0);

  const avgClarity = Math.round(
    valid.reduce((s, m) => s + (m.clarity_score || 0), 0) / count,
  );

  // 군말 모으기 (중복 제거)
  const fillerSet = new Set<string>();
  valid.forEach((m) => {
    (m.filler_words || []).forEach((w) => {
      if (w) fillerSet.add(w);
    });
  });

  // 멈칫 수준 판단 (질문당 평균 1.5회 미만이면 양호)
  const avgPausePerQ = totalPause / count;
  const pauseLevel = avgPausePerQ < 1.5 ? "양호" : "주의";
  const pauseComment =
    pauseLevel === "양호"
      ? "답변 중간 공백이 거의 없었어요. 좋은 흐름이에요!"
      : "답변 중간에 멈칫하는 구간이 있었어요. 호흡을 가다듬어 보면 좋아요.";

  return {
    avgSpeed,
    speedLabel: speedLabelOf(avgSpeed),
    totalPause,
    pauseLevel,
    pauseComment,
    fillerList: Array.from(fillerSet),
    avgClarity,
    count,
  };
}

// 속도 코멘트
const speedComment = (avg: number) => {
  if (avg < AVG_SPEED - 20) return "평균보다 느린 편이에요. 조금 더 자신감 있게 말해보세요.";
  if (avg > AVG_SPEED + 40) return "평균보다 빠른 편이에요. 또박또박 천천히 말해보세요.";
  return "적당한 속도로 잘 말하고 있어요.";
};

interface Props {
  metrics: QuestionMetric[];
  // 테마 색 (고등=파랑, 중등=초록)
  accent: string;
  accentDark: string;
  accentBg: string;
  accentBorder: string;
}

export default function SimulationAnalysisCard({
  metrics,
  accent,
  accentDark,
  accentBg,
  accentBorder,
}: Props) {
  const s = summarize(metrics);
  if (!s) return null; // 분석된 답변 없으면 카드 자체를 안 보여줌

  return (
    <div className="bg-white border border-line rounded-xl px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[12px] font-extrabold text-ink tracking-tight">
          ✨ 음성 분석 결과
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ color: accentDark, background: accentBg, border: `1px solid ${accentBorder}60` }}
        >
          질문 {s.count}개 종합
        </span>
      </div>

      {/* 말의 빠르기 + 말의 공백 */}
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        {/* 말의 빠르기 */}
        <div className="bg-gray-50 border border-line rounded-xl px-3.5 py-3">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
            🗣️ 말의 빠르기
          </div>
          <div className="flex gap-3 mb-2">
            <div>
              <div className="text-[10px] font-medium text-ink-muted mb-0.5">내 속도</div>
              <div className="text-[20px] font-extrabold tracking-tight leading-none" style={{ color: accent }}>
                {s.avgSpeed}
                <span className="text-[10px] ml-0.5">음절/분</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium text-ink-muted mb-0.5">평균</div>
              <div className="text-[20px] font-extrabold text-ink-secondary tracking-tight leading-none">
                {AVG_SPEED}
                <span className="text-[10px] ml-0.5">음절/분</span>
              </div>
            </div>
          </div>
          <div className="text-[11px] font-medium text-ink-secondary leading-[1.5]">
            {speedComment(s.avgSpeed)} <span className="font-bold">({s.speedLabel})</span>
          </div>
        </div>

        {/* 말의 공백 */}
        <div className="bg-gray-50 border border-line rounded-xl px-3.5 py-3">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
            ⏸ 말의 공백
          </div>
          <div className="text-[20px] font-extrabold tracking-tight leading-none mb-1.5" style={{ color: accent }}>
            {s.pauseLevel}
            <span className="text-[11px] ml-1.5 text-ink-muted font-bold">멈칫 {s.totalPause}회</span>
          </div>
          <div className="text-[11px] font-medium text-ink-secondary leading-[1.5]">
            {s.pauseComment}
          </div>
        </div>
      </div>

      {/* 습관어 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-2.5">
        <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">
          ⚠️ 습관어 (군말)
        </div>
        {s.fillerList.length === 0 ? (
          <div className="text-[12px] font-medium text-amber-800">
            군말이 거의 없었어요. 깔끔하게 답변했어요! 👍
          </div>
        ) : (
          <div className="flex gap-1.5 flex-wrap">
            {s.fillerList.map((h, i) => (
              <span key={i} className="text-[12px] font-bold text-amber-800 bg-yellow-100 border border-yellow-300 px-2.5 py-1 rounded-full">
                "{h}"
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 명료도 */}
      <div className="rounded-xl px-4 py-3" style={{ background: accentBg, border: `1px solid ${accentBorder}60` }}>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>
          🎯 발음 명료도
        </div>
        <div className="text-[13px] font-bold leading-[1.6]" style={{ color: accentDark }}>
          평균 명료도 {s.avgClarity}점{" "}
          <span className="text-[11px] font-medium">
            {s.avgClarity >= 75 ? "— 또박또박 명료하게 발음했어요." : "— 발음을 조금 더 또렷하게 해보면 좋아요."}
          </span>
        </div>
      </div>
    </div>
  );
}