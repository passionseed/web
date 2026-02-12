import { selectModelForUser } from "@/lib/ai/modelSelector";

export const DEFAULT_DIRECTION_MODEL = "gemini-2.5-flash";

export const DIRECTION_MODELS = [
  "gemini-2.5-flash",
  "gemini-3-flash",
  "gemini-flash-lite-latest",
  "claude-haiku-4-5",
  "gpt-5-mini-2025-08-07",
  "gpt-5.2-chat-latest",
  "codex-mini-latest",
  "deepseek-chat",
  "deepseek-reasoner",
] as const;

type DirectionModel = (typeof DIRECTION_MODELS)[number];
type ModelProvider = "google" | "anthropic" | "openai" | "deepseek";

export function isValidDirectionModel(modelName?: string | null): modelName is DirectionModel {
  if (!modelName) return false;
  return (DIRECTION_MODELS as readonly string[]).includes(modelName);
}

function getProviderForModel(modelName: string): ModelProvider {
  if (modelName.includes("gemini")) return "google";
  if (modelName.includes("claude")) return "anthropic";
  if (modelName.includes("deepseek")) return "deepseek";
  return "openai";
}

function hasProviderKey(provider: ModelProvider): boolean {
  if (provider === "google") return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (provider === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export function isModelAvailable(modelName: string): boolean {
  return hasProviderKey(getProviderForModel(modelName));
}

function firstAvailableDirectionModel(): string {
  const firstAvailable = DIRECTION_MODELS.find((modelName) => isModelAvailable(modelName));
  return firstAvailable ?? DEFAULT_DIRECTION_MODEL;
}

export function resolveDirectionModel({
  userId,
  explicitModel,
  allowExplicitOverride = false,
}: {
  userId?: string | null;
  explicitModel?: string;
  allowExplicitOverride?: boolean;
}): string {
  const forcedModel = process.env.FORCE_MODEL;
  if (isValidDirectionModel(forcedModel) && isModelAvailable(forcedModel)) {
    return forcedModel;
  }

  if (allowExplicitOverride && isValidDirectionModel(explicitModel) && isModelAvailable(explicitModel)) {
    return explicitModel;
  }

  if (process.env.DIRECTION_FINDER_STABLE_MODE === "true") {
    return isModelAvailable(DEFAULT_DIRECTION_MODEL)
      ? DEFAULT_DIRECTION_MODEL
      : firstAvailableDirectionModel();
  }

  if (userId) {
    const bucketModel = selectModelForUser(userId);
    if (isModelAvailable(bucketModel)) return bucketModel;
  }

  if (isValidDirectionModel(explicitModel) && isModelAvailable(explicitModel)) {
    return explicitModel;
  }

  return isModelAvailable(DEFAULT_DIRECTION_MODEL)
    ? DEFAULT_DIRECTION_MODEL
    : firstAvailableDirectionModel();
}

