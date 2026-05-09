// supabase/functions/middle-homework-stt-start/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  videoUrl: string;
  homeworkId?: string;
  language?: string;
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

    // sync 모드: 결과를 바로 받음. callback/obs 설정 불필요.
    // 영상 길이만큼 대기하므로 2분 이내 영상 권장.
    const clovaRes = await fetch(`${INVOKE_URL}/recognizer/url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CLOVASPEECH-API-KEY": SECRET,
      },
      body: JSON.stringify({
        url: videoUrl,
        language,
        completion: "sync",
      }),
    });

    if (!clovaRes.ok) {
      const errText = await clovaRes.text();
      throw new Error(`Clova 호출 실패: ${clovaRes.status} ${errText}`);
    }

    const data = await clovaRes.json();
    
    // sync 모드에서는 결과가 바로 옴
    // 응답 예: { result, message, segments, text, ... }
    const fullText: string =
      data.text ??
      (Array.isArray(data.segments)
        ? data.segments.map((s: any) => s.text).join(" ")
        : "");

    return new Response(
      JSON.stringify({
        success: true,
        // 기존 인터페이스 유지를 위해 token 자리에 임시 ID 넣음
        // (sync 모드라 폴링 불필요하지만 프론트 코드 호환 위해)
        token: `sync-${Date.now()}`,
        homeworkId: homeworkId ?? null,
        // sync 모드 결과 즉시 반환
        immediate: true,
        transcript: fullText,
        segments: data.segments ?? null,
        durationSec: data.params?.duration
          ? Math.round(Number(data.params.duration) / 1000)
          : null,
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