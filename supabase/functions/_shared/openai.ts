// supabase/functions/_shared/openai.ts
// OpenAI ChatCompletion 호출 공통 헬퍼

interface OpenAICallArgs {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
}

interface OpenAIResult<T = any> {
  feedback: T;
  tokensUsed: number | null;
  model: string;
}

export async function callOpenAI<T = any>(
  args: OpenAICallArgs
): Promise<OpenAIResult<T>> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");

  const model = args.model ?? "gpt-4o";
  const temperature = args.temperature ?? 0.3;

  const body: any = {
    model,
    temperature,
    messages: [
      { role: "system", content: args.systemPrompt },
      { role: "user", content: args.userPrompt },
    ],
  };

  if (args.jsonMode !== false) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI 오류: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";

  let feedback: T;
  try {
    feedback = JSON.parse(content);
  } catch {
    throw new Error(`OpenAI 응답 파싱 실패: ${content.slice(0, 200)}`);
  }

  return {
    feedback,
    tokensUsed: data.usage?.total_tokens ?? null,
    model,
  };
}