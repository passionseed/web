import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

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
 * Get AI model instance by name
 * Supports 9 models across 4 providers for A/B testing during 65-user load test
 */
export function getModel(modelName?: string) {
    if (!modelName) return google("gemini-2.5-flash");

    // Google Models (3 variants)
    if (modelName === 'gemini-3-flash') return google('gemini-3-flash');
    if (modelName === 'gemini-2.5-flash') return google('gemini-2.5-flash');
    if (modelName === 'gemini-flash-lite-latest') return google('gemini-flash-lite-latest');

    // Anthropic Claude Models (1 variant)
    if (modelName === 'claude-haiku-4-5') return anthropic('claude-haiku-4-5-20251001');

    // OpenAI Models (3 variants)
    if (modelName === 'gpt-5-mini-2025-08-07') return openai('gpt-5-mini-2025-08-07');
    if (modelName === 'gpt-5.2-chat-latest') return openai('gpt-5.2-chat-latest');
    if (modelName === 'codex-mini-latest') return openai('codex-mini-latest');

    // DeepSeek Models (2 variants)
    if (modelName.includes('deepseek')) {
        if (modelName.includes('reasoner') || modelName.includes('r1')) {
            return deepseek('deepseek-reasoner');
        }
        return deepseek('deepseek-chat');
    }

    // Default fallback
    return google("gemini-2.5-flash");
}
