// supabase/functions/_shared/cors.ts
// 모든 Edge Function이 공유하는 CORS 설정 + 응답 헬퍼

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function jsonError(message: string, status = 500) {
  return jsonResponse({ success: false, error: message }, status);
}

export function handleOptions() {
  return new Response("ok", { headers: corsHeaders });
}