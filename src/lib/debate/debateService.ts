// src/lib/debate/debateService.ts
// AI 토론 - Edge Function 호출 래퍼 (디버그 로그 버전)

import { supabase } from "@/lib/supabase";

export type DebateStance = "pro" | "con";

export interface DebateHistoryItem {
  speaker: "ai" | "student";
  text: string;
}

export interface DebateFeedbackCriterion {
  name: string;
  term: string;
  theory: string;
  score: number;
  quote: string;
  good: string;
  bad: string;
  tip: string;
}

export interface DebateFeedback {
  overall: { grade: string; summary: string };
  criteria: DebateFeedbackCriterion[];
}

// ════════════════════════════════════════════
// 1) AI 첫 발언(오프닝)
// ════════════════════════════════════════════
export async function generateDebateOpening(args: {
  topic: string;
  aiStance: DebateStance;
}): Promise<string> {
  console.log("🟢 [opening] 호출 시작", args);
  const { data, error } = await supabase.functions.invoke("debate-opening", {
    body: { topic: args.topic, aiStance: args.aiStance },
  });
  console.log("🟢 [opening] 응답 data:", data);
  console.log("🟢 [opening] 응답 error:", error);
  if (error) {
    console.error("🔴 [opening] error 발생:", error);
    throw error;
  }
  if (!data?.success) {
    console.error("🔴 [opening] success 아님:", data);
    throw new Error(data?.error || "오프닝 생성 실패");
  }
  console.log("🟢 [opening] 성공! text:", data.text);
  return data.text as string;
}

// ════════════════════════════════════════════
// 2) AI 반박 발언
// ════════════════════════════════════════════
export async function generateDebateReply(args: {
  topic: string;
  aiStance: DebateStance;
  studentStance: DebateStance;
  history: DebateHistoryItem[];
  studentText: string;
}): Promise<string> {
  console.log("🟢 [reply] 호출 시작", args);
  const { data, error } = await supabase.functions.invoke("debate-reply", {
    body: {
      topic: args.topic,
      aiStance: args.aiStance,
      studentStance: args.studentStance,
      history: args.history,
      studentText: args.studentText,
    },
  });
  console.log("🟢 [reply] 응답 data:", data, "error:", error);
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "반박 생성 실패");
  return data.text as string;
}

// ════════════════════════════════════════════
// 3) 최종 피드백 (4항목 채점)
// ════════════════════════════════════════════
export async function generateDebateFeedback(args: {
  topic: string;
  studentStance: DebateStance | "neutral";
  messages: { speaker: "ai" | "student"; text: string }[];
}): Promise<DebateFeedback> {
  console.log("🟢 [feedback] 호출 시작");
  const { data, error } = await supabase.functions.invoke("debate-feedback", {
    body: {
      topic: args.topic,
      studentStance: args.studentStance,
      messages: args.messages,
    },
  });
  console.log("🟢 [feedback] 응답 data:", data, "error:", error);
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "피드백 생성 실패");
  return data.feedback as DebateFeedback;
}

// ════════════════════════════════════════════
// 4) TTS - 텍스트 → 음성(mp3 object URL)
//    CLOVA 'nara' 여성 음성
// ════════════════════════════════════════════
export async function debateTextToSpeech(
  text: string,
  voice: string = "nara",
): Promise<string> {
  console.log("🔵 [tts] 호출 시작:", text.slice(0, 20));
  const { data, error } = await supabase.functions.invoke("debate-tts", {
    body: { text, voice },
  });
  console.log("🔵 [tts] 응답 data:", data ? "있음" : "없음", "error:", error);
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "TTS 생성 실패");

  const base64 = data.audio as string;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "audio/mpeg" });
  return URL.createObjectURL(blob);
}