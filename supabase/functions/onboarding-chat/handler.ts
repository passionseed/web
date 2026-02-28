export interface ChatMessage {
  role: "user" | "model";
  parts: [{ text: string }];
}

export interface RequestBody {
  mode: "chat" | "generate_interests" | "suggest_careers";
  chat_history: ChatMessage[];
  user_context: {
    name: string;
    education_level: string;
    selected_interests?: string[];
  };
}

export interface OnboardingResponse {
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

export type GeminiCaller = (
  systemPrompt: string,
  history: ChatMessage[],
  userMessage?: string
) => Promise<string>;

const SYSTEM_PROMPTS: Record<RequestBody["mode"], string> = {
  chat: `You are a friendly onboarding guide for Passion Seed, a Thai app that helps students discover their career paths. You are having a warm, encouraging conversation with a new user.

Your goal is to understand their personality, values, and interests through natural conversation. Ask 2-4 thoughtful open-ended questions — one at a time. Keep responses concise and conversational (2-3 sentences max).

When you feel you have enough context to identify 3-4 distinct interest themes, end your message with the exact token: [READY_FOR_INTERESTS]

Do not mention this token to the user. Keep it casual and supportive.`,
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

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function toJsonResponse(
  payload: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function isMode(mode: unknown): mode is RequestBody["mode"] {
  return (
    mode === "chat" ||
    mode === "generate_interests" ||
    mode === "suggest_careers"
  );
}

function getRequestBody(payload: unknown): RequestBody {
  if (!payload || typeof payload !== "object") {
    throw new HttpError(400, "Invalid request body");
  }

  const body = payload as Partial<RequestBody>;
  if (!isMode(body.mode)) {
    throw new HttpError(400, `Unknown mode: ${String(body.mode)}`);
  }

  if (!Array.isArray(body.chat_history)) {
    throw new HttpError(400, "chat_history must be an array");
  }

  if (!body.user_context || typeof body.user_context !== "object") {
    throw new HttpError(400, "user_context is required");
  }

  return body as RequestBody;
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) {
    return null;
  }

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
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
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
    throw new Error("No JSON in Gemini response");
  }
  return JSON.parse(jsonBlock) as Record<string, unknown>;
}

export function createOnboardingHandler(callGemini: GeminiCaller) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const raw = await req.json();
      const { mode, chat_history, user_context } = getRequestBody(raw);

      let response: OnboardingResponse;

      if (mode === "chat") {
        const text = await callGemini(SYSTEM_PROMPTS.chat, chat_history);
        const readyForInterests = text.includes("[READY_FOR_INTERESTS]");
        const cleanText = text.replace("[READY_FOR_INTERESTS]", "").trim();

        response = {
          message: cleanText,
          action: readyForInterests ? "transition_to_interests" : null,
        };
      } else if (mode === "generate_interests") {
        const text = await callGemini(
          SYSTEM_PROMPTS.generate_interests,
          chat_history
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
        const text = await callGemini(SYSTEM_PROMPTS.suggest_careers, [
          { role: "user", parts: [{ text: prompt }] },
        ]);
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

      return toJsonResponse(response);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      const message = err instanceof Error ? err.message : String(err);
      return toJsonResponse({ error: message }, status);
    }
  };
}
