const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_MODEL = "deepseek-v4-flash";

interface ChatMessage {
  role: "user" | "model";
  parts: [{ text: string }];
}

interface RequestBody {
  mode: "chat" | "generate_interests" | "suggest_careers";
  chat_history: ChatMessage[];
  user_context: {
    name: string;
    education_level: string;
    selected_interests?: string[];
  };
}

interface OnboardingResponse {
  message: string;
  action:
    | null
    | "transition_to_interests"
    | "show_interest_categories"
    | "show_career_suggestions";
  action_data?: {
    categories?: { name: string; statements: string[] }[];
    careers?: string[];
  };
}

const SYSTEM_PROMPTS: Record<RequestBody["mode"], string> = {
  chat: `You are a warm, curious guide for Passion Seed — a Thai app helping students discover career paths by learning from real people.

YOUR GOAL: In 2-3 quick exchanges, understand what DRIVES this person — their values, what energizes them, what problems they care about. This data feeds an interest-matching algorithm, so you need signal, not small talk.

RULES:
- 1-2 sentences max per response. Be brief.
- ONE question per message
- Ask questions that reveal VALUES and ENERGY, not job descriptions
- Never ask "what do you do" or "walk me through your day" — these are shallow
- If someone gives a low-effort answer, don't accept it. Gently push deeper with a more specific, provocative question
- Use max 1 emoji per message
- After 2-3 exchanges with real signal, end with [READY_FOR_INTERESTS]
- Do not mention the token to the user

GOOD OPENING QUESTIONS (pick one, adapt to context):
- "What's something you're working on right now that you'd keep doing even if nobody paid you?"
- "When you lose track of time, what are you usually doing?"
- "What's a problem in the world that genuinely bothers you?"

GOOD FOLLOW-UP QUESTIONS:
- "What's the hardest part of that — and why do you keep going?"
- "If you could mass-produce one skill or mindset for young people, what would it be?"
- "What did 15-year-old you need to hear that nobody told you?"

IF SOMEONE GIVES A VAGUE/LOW-EFFORT ANSWER like "I just work and sleep":
- Don't say "that's interesting!" — it's not
- Instead, challenge gently: "Haha fair — but there must be something that pulls you in. What's the one thing at work that actually gets you fired up?"

NEVER:
- Say "That's really interesting!" as filler
- Ask about typical days or routines
- Accept surface answers without pushing deeper`,
  generate_interests: `Based on the conversation history, generate exactly 3-4 interest categories that reflect this user's personality and values.

For each category:
- Give it a vivid, role-like name (e.g. "System Architect", "Human Connector", "Creative Catalyst")
- Write exactly 6 statements in first person starting with "I" that someone in that role would deeply resonate with
- Make statements specific and emotionally resonant, not generic

Respond ONLY with valid JSON in this exact shape:
{
  "categories": [
    {
      "name": "Category Name",
      "statements": ["I statement 1", "I statement 2", "I statement 3", "I statement 4", "I statement 5", "I statement 6"]
    }
  ]
}`,
  suggest_careers: `Based on the user's selected interest statements, suggest 6-8 specific career paths they might want to explore.

Rules:
- Be specific (e.g. "Product Designer" not "Designer")
- Mix conventional and unconventional options
- Bias toward careers that are explorable in a 4-5 day micro-journey format
- Consider the Thai education context

Respond ONLY with valid JSON:
{
  "careers": ["Career 1", "Career 2", "Career 3", "Career 4", "Career 5", "Career 6"]
}`,
};

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function toOpenAIMessages(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage?: string,
): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of history) {
    messages.push({
      role: msg.role === "model" ? "assistant" : "user",
      content: msg.parts.map((p) => p.text).join(""),
    });
  }

  if (userMessage) {
    messages.push({ role: "user", content: userMessage });
  }

  return messages;
}

async function callDeepSeek(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage?: string,
  outputFormat: "text" | "json" = "text",
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  const messages = toOpenAIMessages(systemPrompt, history, userMessage);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await fetch(DEEPSEEK_BASE_URL + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + DEEPSEEK_API_KEY,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature: 0.7,
        // V4 defaults to thinking mode; its reasoning can exhaust a short
        // token budget before the user-visible answer is generated.
        thinking: { type: "disabled" },
        max_tokens: outputFormat === "json" ? 2048 : 512,
        ...(outputFormat === "json"
          ? { response_format: { type: "json_object" } }
          : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `DeepSeek API error: status=${response.status} body=${errorText.substring(0, 300)}`,
      );
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const content = choice?.message?.content;
    if (
      typeof content === "string" &&
      content.trim() &&
      choice?.finish_reason !== "length"
    ) {
      return content;
    }

    console.warn(
      `[onboarding-chat] DeepSeek returned empty or truncated content (attempt ${attempt}, finish_reason=${choice?.finish_reason ?? "unknown"})`,
    );
  }

  throw new Error("DeepSeek returned empty or truncated content twice");
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
      continue;
    }

    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function parseJsonBlock(text: string): Record<string, unknown> {
  const jsonBlock = extractJsonObject(text);
  if (!jsonBlock) {
    throw new Error("No JSON in DeepSeek response");
  }
  return JSON.parse(jsonBlock) as Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[onboarding-chat] Request received");

    if (!DEEPSEEK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing DEEPSEEK_API_KEY" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { mode, chat_history, user_context } =
      (await req.json()) as RequestBody;

    let response: OnboardingResponse;

    if (mode === "chat") {
      const history =
        chat_history.length === 0
          ? [{ role: "user" as const, parts: [{ text: "Hi, I'm new here!" }] as [{ text: string }] }]
          : chat_history;
      const text = await callDeepSeek(SYSTEM_PROMPTS.chat, history);
      const readyForInterests = text.includes("[READY_FOR_INTERESTS]");
      const cleanText = text.replace("[READY_FOR_INTERESTS]", "").trim();

      response = {
        message: cleanText,
        action: readyForInterests ? "transition_to_interests" : null,
      };
    } else if (mode === "generate_interests") {
      const history =
        chat_history.length === 0
          ? [{ role: "user" as const, parts: [{ text: "Generate interest categories for me" }] as [{ text: string }] }]
          : chat_history;
      const text = await callDeepSeek(
        SYSTEM_PROMPTS.generate_interests,
        history,
        undefined,
        "json",
      );
      const parsed = parseJsonBlock(text);
      const categories = parsed.categories;

      if (!Array.isArray(categories)) {
        throw new Error("Invalid categories payload");
      }

      response = {
        message:
          "Here are some themes I noticed about you. Select statements that feel true:",
        action: "show_interest_categories",
        action_data: {
          categories: categories as { name: string; statements: string[] }[],
        },
      };
    } else {
      const interestContext = user_context.selected_interests?.join(", ") ?? "";
      const prompt = `User's selected interests: ${interestContext}`;
      const text = await callDeepSeek(
        SYSTEM_PROMPTS.suggest_careers,
        [{ role: "user", parts: [{ text: prompt }] }],
        undefined,
        "json",
      );
      const parsed = parseJsonBlock(text);
      const careers = parsed.careers;

      if (!Array.isArray(careers)) {
        throw new Error("Invalid careers payload");
      }

      response = {
        message:
          "Based on your interests, here are some paths you might want to try:",
        action: "show_career_suggestions",
        action_data: { careers: careers as string[] },
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[onboarding-chat error]", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "onboarding chat failed", details: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
