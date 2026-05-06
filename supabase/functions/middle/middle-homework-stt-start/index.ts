// supabase/functions/middle-homework-stt-start/index.ts
// 중등 숙제 영상 → Clova Speech 장문 인식 작업 시작
// Clova는 비동기. token만 즉시 반환 → stt-result에서 폴링.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  videoUrl: string;       // Supabase Storage public URL
  homeworkId?: string;    // DB 매핑용
  language?: string;      // 'ko-KR' (기본)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoUrl, homeworkId, language = "ko-KR" }: RequestBody =
      await req.json();

    if (!videoUrl) return jsonError("videoUrl이 필요합니다.", 400);

    const INVOKE_URL = Deno.env.get("CLOVA_SPEECH_INVOKE_URL");
    const SECRET = Deno.env.get("CLOVA_SPEECH_SECRET");
    if (!INVOKE_URL || !SECRET) {
      throw new Error(
        "CLOVA_SPEECH_INVOKE_URL / CLOVA_SPEECH_SECRET이 설정되지 않았습니다."
      );
    }

    // Clova Speech URL 방식 — 영상 URL을 Clova가 직접 다운로드해서 처리
    const clovaRes = await fetch(`${INVOKE_URL}/recognizer/url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CLOVASPEECH-API-KEY": SECRET,
      },
      body: JSON.stringify({
        url: videoUrl,
        language,
        completion: "async",
      }),
    });

    if (!clovaRes.ok) {
      const errText = await clovaRes.text();
      throw new Error(`Clova 작업 시작 실패: ${clovaRes.status} ${errText}`);
    }

    const data = await clovaRes.json();
    return new Response(
      JSON.stringify({
        success: true,
        token: data.token,
        homeworkId: homeworkId ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[middle-homework-stt-start]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}