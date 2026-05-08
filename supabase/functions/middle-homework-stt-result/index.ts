// supabase/functions/middle-homework-stt-result/index.ts
// Clova Speech 작업 결과 조회 (폴링용)
// stt-start에서 받은 token으로 호출. status가 'Completed'면 transcript 반환.
//
// 응답 status:
//   - 'Waiting' / 'Running': 진행 중 (transcript: null)
//   - 'Completed': 완료 (transcript: '...')
//   - 'Failed': 실패

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  token: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token }: RequestBody = await req.json();
    if (!token) return jsonError("token이 필요합니다.", 400);

    const INVOKE_URL = Deno.env.get("CLOVA_SPEECH_INVOKE_URL");
    const SECRET = Deno.env.get("CLOVA_SPEECH_SECRET");
    if (!INVOKE_URL || !SECRET) {
      throw new Error("Clova 환경변수가 설정되지 않았습니다.");
    }

    const res = await fetch(`${INVOKE_URL}/recognizer/${token}`, {
      method: "GET",
      headers: { "X-CLOVASPEECH-API-KEY": SECRET },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Clova 결과 조회 실패: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const status: string = data.status ?? "Unknown";

    if (status === "Completed") {
      // Clova 응답에서 텍스트 추출 — 두 가지 방식 모두 대비
      const fullText: string =
        data.result?.text ??
        (Array.isArray(data.segments)
          ? data.segments.map((s: any) => s.text).join(" ")
          : "");

      return jsonOk({
        status,
        transcript: fullText,
        segments: data.segments ?? null,
        durationSec: data.params?.duration
          ? Math.round(Number(data.params.duration) / 1000)
          : null,
      });
    }

    if (status === "Failed") {
      return jsonOk({
        status,
        transcript: null,
        error: data.message ?? "Clova 인식 실패",
      });
    }

    // Waiting / Running
    return jsonOk({ status, transcript: null });
  } catch (e) {
    console.error("[middle-homework-stt-result]", e);
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
});

function jsonOk(payload: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...payload }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}