/** @jest-environment node */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotEnv } from "dotenv";
import { generateDirectionProfileCore } from "@/lib/ai/directionProfileEngine";
import { getAllModelBuckets } from "@/lib/ai/modelSelector";
import type { AssessmentAnswers } from "@/types/direction-finder";

const ENV_LOCAL_PATH = resolve(process.cwd(), ".env.local");
const ENV_PATH = resolve(process.cwd(), ".env");

if (existsSync(ENV_LOCAL_PATH)) {
  loadDotEnv({ path: ENV_LOCAL_PATH, quiet: true });
}
if (existsSync(ENV_PATH)) {
  loadDotEnv({ path: ENV_PATH, quiet: true });
}

type ChatMessage = { role: "user" | "assistant"; content: string };

type TestContext = {
  answers: AssessmentAnswers;
  history: ChatMessage[];
  source: "database" | "fixture";
  sourceId?: string;
};

const RUN_LIVE_TESTS = process.env.RUN_LIVE_AI_MODEL_TESTS === "true";
const DB_CONTEXT_ENABLED = process.env.DIRECTION_FINDER_TEST_USE_DB !== "false";
const MODEL_TEST_TIMEOUT_MS = Number(
  process.env.DIRECTION_FINDER_MODEL_TEST_TIMEOUT_MS ?? 180_000,
);

const MODEL_NAMES = Array.from(
  new Set(getAllModelBuckets().map((bucket) => bucket.model)),
);

const FIXTURE_ANSWERS: AssessmentAnswers = {
  q1_flow: {
    description:
      "I lose track of time when I design product ideas, write prototypes, and test them with classmates.",
    activities: ["creating", "solving", "building"],
    engagement_factors: "Turning abstract ideas into real tools keeps me focused.",
  },
  q2_zone_grid: {
    items: [
      { domain: "Product Design", interest: 9, capability: 8 },
      { domain: "Software Engineering", interest: 8, capability: 7 },
      { domain: "Data Analysis", interest: 7, capability: 6 },
      { domain: "Public Speaking", interest: 5, capability: 8 },
      { domain: "Graphic Design", interest: 6, capability: 5 },
      { domain: "Accounting", interest: 2, capability: 7 },
    ],
  },
  q3_work_style: {
    indoor_outdoor: "indoor",
    structured_flexible: "flexible",
    solo_team: "team",
    hands_on_theory: "hands_on",
    steady_fast: "fast",
  },
  q4_reputation: [
    "People ask me to break down complex ideas into simple plans.",
    "Friends ask me to lead project demos and pitches.",
    "My team asks me to debug process bottlenecks.",
  ],
  q5_proud: {
    story:
      "I led a student team that built a scheduling app for school clubs and launched it to 300 students.",
    role_description:
      "I initiated the project, coordinated the team, and designed the product roadmap.",
    tags: ["ownership", "impact", "problem-solving"],
  },
  q6_unique: {
    description:
      "I can connect user problems, technical constraints, and communication quickly.",
    skipped: false,
  },
};

const FIXTURE_HISTORY: ChatMessage[] = [
  {
    role: "user",
    content:
      "I want a path where I can build products and help people solve practical problems.",
  },
  {
    role: "assistant",
    content:
      "Great signal. Which part of building products gives you the most energy?",
  },
  {
    role: "user",
    content:
      "I enjoy turning vague needs into clear features and getting feedback quickly.",
  },
];

function inferProvider(modelName: string): "google" | "anthropic" | "openai" | "deepseek" {
  if (modelName.includes("gemini")) return "google";
  if (modelName.includes("claude")) return "anthropic";
  if (modelName.includes("deepseek")) return "deepseek";
  return "openai";
}

function missingProviderKeys(models: string[]): string[] {
  const requiresGoogle = models.some((m) => inferProvider(m) === "google");
  const requiresAnthropic = models.some((m) => inferProvider(m) === "anthropic");
  const requiresOpenAI = models.some((m) => inferProvider(m) === "openai");
  const requiresDeepSeek = models.some((m) => inferProvider(m) === "deepseek");

  const missing: string[] = [];

  if (requiresGoogle && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    missing.push("GOOGLE_GENERATIVE_AI_API_KEY");
  }
  if (requiresAnthropic && !process.env.ANTHROPIC_API_KEY) {
    missing.push("ANTHROPIC_API_KEY");
  }
  if (requiresOpenAI && !process.env.OPENAI_API_KEY) {
    missing.push("OPENAI_API_KEY");
  }
  if (requiresDeepSeek && !process.env.DEEPSEEK_API_KEY) {
    missing.push("DEEPSEEK_API_KEY");
  }

  return missing;
}

function isValidAnswers(value: unknown): value is AssessmentAnswers {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AssessmentAnswers>;
  return Boolean(
    candidate.q1_flow &&
      candidate.q2_zone_grid &&
      candidate.q3_work_style &&
      candidate.q4_reputation &&
      candidate.q5_proud &&
      candidate.q6_unique,
  );
}

function extractHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is { role: string; content: string } =>
        Boolean(item && typeof item === "object" && "role" in item && "content" in item),
    )
    .map((item) => ({ role: item.role as "user" | "assistant", content: item.content }))
    .filter((item) => (item.role === "user" || item.role === "assistant") && item.content.trim().length > 0);
}

async function loadContextFromDatabase(): Promise<TestContext | null> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!DB_CONTEXT_ENABLED || !supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase
    .from("direction_finder_results")
    .select("id, answers, chat_history")
    .not("answers", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return null;

  for (const row of data) {
    if (!isValidAnswers(row.answers)) continue;
    const history = extractHistory(row.chat_history);
    if (history.length === 0) continue;

    return {
      answers: row.answers,
      history,
      source: "database",
      sourceId: row.id as string,
    };
  }

  return null;
}

async function loadTestContext(): Promise<TestContext> {
  const fromDb = await loadContextFromDatabase();
  if (fromDb) return fromDb;

  return {
    answers: FIXTURE_ANSWERS,
    history: FIXTURE_HISTORY,
    source: "fixture",
  };
}

const describeLive = RUN_LIVE_TESTS ? describe : describe.skip;

describeLive("directionProfileEngine model integration", () => {
  jest.setTimeout(MODEL_TEST_TIMEOUT_MS);

  let context: TestContext;

  beforeAll(async () => {
    const missing = missingProviderKeys(MODEL_NAMES);
    if (missing.length > 0) {
      throw new Error(
        `Missing API keys for live model test run: ${missing.join(", ")}`,
      );
    }

    context = await loadTestContext();
  });

  it("covers every configured model bucket", async () => {
    expect(MODEL_NAMES.length).toBeGreaterThan(0);
    expect(new Set(MODEL_NAMES).size).toBe(MODEL_NAMES.length);
  });

  it.each(MODEL_NAMES)("generates core profile using model '%s'", async (modelName) => {
    const core = await generateDirectionProfileCore(
      context.history,
      context.answers,
      modelName,
      "en",
    );

    expect(core.profile).toBeDefined();
    expect(core.profile?.energizers?.length).toBeGreaterThan(0);
    expect(core.profile?.strengths?.length).toBeGreaterThan(0);
    expect(core.profile?.values?.length).toBeGreaterThan(0);
    expect(core.vectors?.length).toBeGreaterThan(0);

    if (context.source === "database") {
      expect(context.sourceId).toBeDefined();
    }
  });
});
