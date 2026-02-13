import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

const DEFAULT_GOOGLE_MODEL = "gemini-3-flash-preview";

const MODEL_ALIASES: Record<string, string> = {
  // Legacy model name that no longer exists on current Google endpoints.
  'gemini-3-flash': DEFAULT_GOOGLE_MODEL,
};

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Allow up to 300 seconds (5 minutes) for AI generation to handle 65 concurrent users
// Vercel Pro allows up to 300s, provides buffer for 190s generation + network overhead
export const maxDuration = 300;

/**
 * Available AI models organized by provider
 */
export const AVAILABLE_MODELS = {
  google: [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', speed: 'fast', cost: 'low' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', speed: 'fast', cost: 'low' },
    { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite', speed: 'fastest', cost: 'lowest' },
  ],
  anthropic: [
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', speed: 'fast', cost: 'medium' },
  ],
  openai: [
    { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini', speed: 'medium', cost: 'medium' },
    { id: 'gpt-5.2-chat-latest', name: 'GPT-5.2 Chat', speed: 'slow', cost: 'high' },
    { id: 'codex-mini-latest', name: 'Codex Mini', speed: 'medium', cost: 'medium' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', speed: 'medium', cost: 'low' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)', speed: 'slow', cost: 'medium' },
  ],
} as const;

/**
 * Get a flat list of all available models
 */
export function getAllModels() {
  return Object.entries(AVAILABLE_MODELS).flatMap(([provider, models]) =>
    models.map(model => ({ ...model, provider }))
  );
}

/**
 * Get AI model instance by name
 * Supports multiple models across 4 providers for A/B testing.
 */
export function normalizeModelName(modelName?: string): string | undefined {
  if (!modelName) return undefined;

  const trimmed = modelName.trim();
  if (!trimmed) return undefined;

  // Accept incoming values from several shapes:
  // - gemini-3-flash-preview
  // - google/gemini-3-flash-preview
  // - models/gemini-2.5-flash
  // - v1beta/models/gemini-2.5-flash:generateContent
  const baseName = trimmed
    .replace(/^google\//, '')
    .replace(/^models\//, '')
    .replace(/^v\d+(?:beta)?\/models\//, '')
    .split(':')[0];

  return MODEL_ALIASES[baseName] ?? baseName;
}

export function getModel(modelName?: string) {
  const resolvedModelName = normalizeModelName(modelName) ?? DEFAULT_GOOGLE_MODEL;

  if (
    modelName &&
    resolvedModelName === DEFAULT_GOOGLE_MODEL &&
    (modelName.includes('gemini-3-flash-preview') ||
      modelName.includes('gemini-3-flash'))
  ) {
    console.warn(
      `[AI] Deprecated model "${modelName}" requested. Using "${DEFAULT_GOOGLE_MODEL}" instead.`
    );
  }

  // Google Models (2 active variants + legacy alias mapping)
  if (resolvedModelName === 'gemini-3-flash-preview') return google('gemini-3-flash-preview');
  if (resolvedModelName === 'gemini-2.5-flash') return google('gemini-2.5-flash');
  if (resolvedModelName === 'gemini-flash-lite-latest') return google('gemini-flash-lite-latest');

  // Anthropic Claude Models (1 variant)
  if (resolvedModelName === 'claude-haiku-4-5') return anthropic('claude-haiku-4-5-20251001');

  // OpenAI Models (3 variants)
  if (resolvedModelName === 'gpt-5-mini-2025-08-07') return openai('gpt-5-mini-2025-08-07');
  if (resolvedModelName === 'gpt-5.2-chat-latest') return openai('gpt-5.2-chat-latest');
  // if (resolvedModelName === 'codex-mini-latest') return openai('codex-mini-latest');

  // DeepSeek Models (2 variants)
  if (resolvedModelName.includes('deepseek')) {
    if (resolvedModelName.includes('reasoner') || resolvedModelName.includes('r1')) {
      return deepseek('deepseek-reasoner');
    }
    return deepseek('deepseek-chat');
  }

  // Default fallback
  console.warn(`[AI] Unknown model "${modelName}". Falling back to "${DEFAULT_GOOGLE_MODEL}".`);
  return google(DEFAULT_GOOGLE_MODEL);
}
