import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.5-flash-lite";

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
  action: null | "transition_to_interests" | "show_interest_categories" | "show_career_suggestions";
  action_data?: {
    categories?: { name: string; statements: string[] }[];
    careers?: string[];
  };
}

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

async function callGemini(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage?: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const contents: ChatMessage[] = [...history];
  if (userMessage) {
    contents.push({ role: "user", parts: [{ text: userMessage }] });
  }

  const result = await model.generateContent({
    contents,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });

  return result.response.text() ?? "";
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mode, chat_history, user_context } = await req.json() as RequestBody;

    let response: OnboardingResponse;

    if (mode === "chat") {
      const userMsg = chat_history.length === 0 
        ? "Hi, I'm new here!" 
        : chat_history[chat_history.length - 1].parts[0]?.text || "Continue";
      const text = await callGemini(SYSTEM_PROMPTS.chat, chat_history, userMsg);
      const readyForInterests = text.includes("[READY_FOR_INTERESTS]");
      const cleanText = text.replace("[READY_FOR_INTERESTS]", "").trim();

      response = {
        message: cleanText,
        action: readyForInterests ? "transition_to_interests" : null,
      };
    } else if (mode === "generate_interests") {
      const userMsg = chat_history.length === 0 
        ? "Generate interest categories for me" 
        : chat_history[chat_history.length - 1].parts[0]?.text || "Continue";
      const text = await callGemini(SYSTEM_PROMPTS.generate_interests, chat_history, userMsg);
      const parsed = parseJsonBlock(text);
      const categories = parsed.categories;

      if (!Array.isArray(categories)) {
        throw new Error("Invalid categories payload");
      }

      response = {
        message: "Here are some themes I noticed about you. Select statements that feel true:",
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
        message: "Based on your interests, here are some paths you might want to try:",
        action: "show_career_suggestions",
        action_data: { careers: careers as string[] },
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[onboarding-chat error]", err);
    return new Response(JSON.stringify({ error: "onboarding chat failed", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
