// supabase/functions/debate-tts/index.ts
// AI 토론 - 텍스트를 음성(mp3)으로 변환 (네이버 CLOVA Voice)
// 응답: { success: true, audio: "<base64 mp3>" }
//
// 필요한 Supabase Secret:
//   CLOVA_VOICE_CLIENT_ID
//   CLOVA_VOICE_CLIENT_SECRET

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, jsonError, handleOptions } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  try {
    const { text, voice, speed, pitch } = await req.json();
    if (!text || typeof text !== "string") return jsonError("text가 필요합니다.", 400);

    const CLIENT_ID = Deno.env.get("CLOVA_VOICE_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("CLOVA_VOICE_CLIENT_SECRET");
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return jsonError("CLOVA_VOICE_CLIENT_ID / CLOVA_VOICE_CLIENT_SECRET가 설정되지 않았습니다.", 500);
    }

    // 음성: 서연(AI) 캐릭터 → 밝은 여성 음성. 기본 'nara'(여성)
    const selectedVoice = voice || "nara";
    const selectedSpeed = typeof speed === "number" ? speed : 0; // -5(빠름)~5(느림), 0=기본
    const selectedPitch = typeof pitch === "number" ? pitch : 0;

    const params = new URLSearchParams();
    params.set("speaker", selectedVoice);
    params.set("text", text.slice(0, 1000));
    params.set("format", "mp3");
    params.set("speed", String(selectedSpeed));
    params.set("pitch", String(selectedPitch));

    const res = await fetch(
      "https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts",
      {
        method: "POST",
        headers: {
          "X-NCP-APIGW-API-KEY-ID": CLIENT_ID,
          "X-NCP-APIGW-API-KEY": CLIENT_SECRET,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return jsonError(`CLOVA Voice 오류: ${res.status} ${errText}`, 500);
    }

    // mp3 바이너리 → base64
    const arrayBuf = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    return jsonResponse({ success: true, audio: base64 });
  } catch (e) {
    console.error("[debate-tts]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});