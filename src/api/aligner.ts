// src/api/aligner.ts
const ALIGNER_URL = "https://aligner.aimeet.kr";

// ── API 응답 타입 ──────────────────────────────
export interface Span {
  char: string;
  start: number; // 초 (입력 오디오 기준 절대초)
  end: number;   // 초
}

export interface STTWord {
  word: string;
  start: number;
  end: number;
  probability: number; // 0~1, 발음 신뢰도
}

export interface AlignResponse {
  text: string;
  spans: Span[];
  spans_raw_aligned: Span[];
  pitch_step_sec: number;   // 보통 0.01 (10ms)
  pitch_hz: number[];       // F0 시계열, 무음/저신뢰 구간은 0
  pitch_conf: number[];     // 0~1
  pitch_voiced: number[];   // 0|1
  stt_words: STTWord[];
}

// ── 분석 결과 타입 ─────────────────────────────
export interface InterviewAnalysis {
  text: string;            // 인식된 답변 텍스트
  durationSec: number;     // 발화 총 길이(초)
  syllablesPerMin: number; // 분당 음절수 (말 속도)
  speedLabel: string;      // 느림 / 적정 / 빠름
  fillerWords: string[];   // 검출된 군말 목록
  fillerCount: number;     // 군말 개수
  pauseCount: number;      // 0.7초 이상 멈춤 횟수
  longestPauseSec: number; // 가장 긴 멈춤(초)
  pitchVariation: number;  // 억양 변화량 (표준편차, Hz)
  intonationLabel: string; // 단조로움 / 자연스러움
  clarityScore: number;    // 평균 발음 신뢰도 0~100
  clarityLabel: string;    // 명료 / 다소 불명확
  lowConfWords: string[];  // 웅얼거린(저신뢰) 단어들
}

// ── 1) align API 호출 ─────────────────────────
export async function alignAudio(audio: Blob): Promise<AlignResponse> {
  const fd = new FormData();
  fd.append("audio", audio, "answer.webm");
  // 면접 답변용 옵션
  fd.append("stt_prompt", "면접 답변");
  fd.append("pitch_backend", "crepe");

  const res = await fetch(`${ALIGNER_URL}/api/align?debug=false`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    throw new Error(`분석 서버 오류: ${res.status}`);
  }
  return res.json();
}

// ── 2) 면접 지표 계산 ─────────────────────────
const FILLER_PATTERNS = [
  "어", "음", "그", "저", "뭐", "이제", "약간", "막", "좀", "그니까", "그러니까",
];

export function analyzeInterview(r: AlignResponse): InterviewAnalysis {
  // ⚠️ 길이 0 스팬(start=end)은 매핑 안정용으로 섞여 들어오므로 제외
  const spans = (r.spans ?? []).filter(
    (s) => s.char.trim() !== "" && s.end > s.start
  );

  // 발화 길이: 첫 글자 시작 ~ 마지막 글자 끝
  const durationSec =
    spans.length > 0 ? spans[spans.length - 1].end - spans[0].start : 0;

  // 말 속도: 분당 음절수 (한국어는 글자수 ≈ 음절수)
  const syllableCount = spans.length;
  const syllablesPerMin =
    durationSec > 0 ? Math.round((syllableCount / durationSec) * 60) : 0;

  // 한국어 면접 적정 속도: 대략 280~360 음절/분
  let speedLabel = "적정";
  if (syllablesPerMin < 280) speedLabel = "느림";
  else if (syllablesPerMin > 360) speedLabel = "빠름";

  // 군말: STT 텍스트에서 패턴 카운트 (단어 경계 기준)
  const text = r.text ?? "";
  const fillerWords: string[] = [];
  for (const f of FILLER_PATTERNS) {
    const matches = text.match(new RegExp(`(^|\\s)${f}(\\s|[,.?!]|$)`, "g"));
    if (matches) fillerWords.push(...Array(matches.length).fill(f));
  }
  const fillerCount = fillerWords.length;

  // 멈춤: pitch_hz가 0(무음)인 구간이 연속으로 얼마나 이어지는지
  const step = r.pitch_step_sec || 0.01;
  const hz = r.pitch_hz ?? [];
  let pauseCount = 0;
  let longestPauseSec = 0;
  let run = 0;
  const PAUSE_THRESHOLD = 0.7; // 0.7초 이상이면 의미 있는 멈춤
  for (const v of hz) {
    if (v === 0) {
      run += step;
    } else {
      if (run >= PAUSE_THRESHOLD) pauseCount++;
      if (run > longestPauseSec) longestPauseSec = run;
      run = 0;
    }
  }
  if (run >= PAUSE_THRESHOLD) pauseCount++;
  if (run > longestPauseSec) longestPauseSec = run;

  // 억양: 발성 구간(voiced) 피치의 표준편차
  const voicedHz = hz.filter((v) => v > 0);
  let pitchVariation = 0;
  if (voicedHz.length > 1) {
    const mean = voicedHz.reduce((a, b) => a + b, 0) / voicedHz.length;
    const variance =
      voicedHz.reduce((a, b) => a + (b - mean) ** 2, 0) / voicedHz.length;
    pitchVariation = Math.round(Math.sqrt(variance));
  }
  // 표준편차 20Hz 미만이면 단조로운 편
  const intonationLabel = pitchVariation < 20 ? "단조로움" : "자연스러움";

  // 발음 명료도: stt_words의 probability 활용
  const words = r.stt_words ?? [];
  let clarityScore = 0;
  const lowConfWords: string[] = [];
  if (words.length > 0) {
    const avg =
      words.reduce((a, w) => a + (w.probability ?? 0), 0) / words.length;
    clarityScore = Math.round(avg * 100);
    for (const w of words) {
      if ((w.probability ?? 1) < 0.5 && w.word?.trim()) {
        lowConfWords.push(w.word);
      }
    }
  }
  const clarityLabel = clarityScore >= 75 ? "명료" : "다소 불명확";

  return {
    text,
    durationSec: Math.round(durationSec * 10) / 10,
    syllablesPerMin,
    speedLabel,
    fillerWords,
    fillerCount,
    pauseCount,
    longestPauseSec: Math.round(longestPauseSec * 10) / 10,
    pitchVariation,
    intonationLabel,
    clarityScore,
    clarityLabel,
    lowConfWords,
  };
}