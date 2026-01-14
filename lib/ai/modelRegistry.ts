import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createDeepSeek } from '@ai-sdk/deepseek';

const deepseek = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

// Allow up to 60 seconds for AI generation (Vercel default is often 10s for Hobby, 15-60s for Pro)
export const maxDuration = 60;

export function getModel(modelName?: string) {
    if (!modelName) return google("gemini-2.5-flash");

    if (modelName.includes('deepseek')) {
        // Basic mapping based on user request names
        if (modelName.includes('r1')) return deepseek('deepseek-reasoner');
        return deepseek('deepseek-chat');
    }

    // Handle specific google models if provided with prefix or just name
    // if (modelName.includes('lite')) return google('gemini-2.0-flash-lite-preview-02-05'); // Using preview for now as 2.5 lite might not be standard yet or use closest

    // if (modelName === 'google/gemini-2.5-flash-lite') return google('gemini-2.0-flash-lite-preview-02-05'); // fallback

    return google("gemini-2.5-flash");
}
