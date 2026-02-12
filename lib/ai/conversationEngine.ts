import { generateObject } from "ai";
import { z } from "zod";
import { AssessmentAnswers } from "@/types/direction-finder";
import { getModel } from "./modelRegistry";
import { runWithRetry } from "./reliability";

export async function summarizeConversation(
    history: { role: 'user' | 'assistant'; content: string }[],
    answers: AssessmentAnswers
): Promise<string> {
    try {
        const prompt = `
      Summarize this conversation between an education advisor and a student.
      Capture the key insights about the student's preferences, the advice given, and any specific direction decided.
      
      Student Context:
      ${JSON.stringify(answers, null, 2)}
      
      Conversation:
      ${history.map(m => `${m.role}: ${m.content}`).join('\n')}
    `;

        const { value } = await runWithRetry(
            () =>
                generateObject({
                    model: getModel("google/gemini-2.5-flash"), // Use fast model for summary
                    schema: z.object({ summary: z.string() }),
                    prompt,
                }),
            { stage: "summary", maxRetries: 1 },
        );

        return value.object.summary;
    } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || "";

        if (errorMessage.toLowerCase().includes("quota") || errorMessage.includes("429") || errorMessage.toLowerCase().includes("rate limit")) {
            console.warn("AI Quota exceeded during summary generation. Skipping summary.");
            return "Conversation data saved without summary (Quota exceeded).";
        }

        console.error("Error summarizing:", error);
        return "Conversation data saved without summary.";
    }
}

export async function conductDirectionConversation(
    history: { role: 'user' | 'assistant'; content: string }[],
    answers: AssessmentAnswers,
    modelName?: string,
    language: 'en' | 'th' = 'en'
): Promise<{ messages: string[]; options: string[]; debug_system_prompt?: string }> {
    try {
        // Build structured context for better AI understanding
        const { buildProfileContext } = await import("./directionProfileEngine");
        const context = buildProfileContext(answers);

        // Formulate a rich context string
        const contextString = `
      Student Profile Context (Processed from Assessment):
      
      [PRIMARY SIGNALS - THE GOLD]
      - Zone of Genius (High Interest + Skill): ${JSON.stringify(context.primary_signals.zone_of_genius)}
      - Flow State Triggers: "${context.primary_signals.flow_evidence}"
      - Validated Strengths (Feedback): ${JSON.stringify(context.primary_signals.external_proof)}
      - Core Values (Proud Moment): "${context.primary_signals.values.story}"
      - Role in Success: "${context.primary_signals.values.role_description}" (Initiator/Contributor?)
      
      [SECONDARY SIGNALS - LOW STAKES]
      - Work Style Preferences: ${JSON.stringify(context.secondary_signals.environment)} (Treat as flexible preferences, not rules)
      - Unique Edge/Talent: "${context.secondary_signals.unique_edge}"
      
      [AREAS TO WATCH]
      - Growth Edges (High Interest, Low Skill): ${JSON.stringify(context.growth_edges)}
      - Capability Traps (Low Interest, High Skill - DO NOT RECOMMEND): ${JSON.stringify(context.capability_traps)}
        `.trim();

        const systemPrompt = `
      You are a cool, casual mentor helping a high school student find their future path.
      Language: ${language === 'th' ? 'Thai (Informal, encouraging, like a supportive senior/P\')' : 'English'}
      
      Your Identity:
      - Name: "P'Seed" (if Thai) or "Seed" (if English)
      - Tone: Casual, empathetic, insightful, enthusiastic. Like a supportive older sibling.
      - Goal: Help the student reflect on their assessment answers to find their "North Star" (future direction).
      
      ${contextString}

      Conversation Rules:
      1. Keep messages short (2-3 sentences max).
      2. Ask ONE thought-provoking question at a time.
      3. Focus on "Why" and "How" to dig deeper into their interests and VALUES (Q5).
      4. Synthesize their answers (e.g., "So you love [Genius Item] and you're proud of [Role]...").
      5. If in Thai, use particles like "ครับ/ค่ะ" but keep it friendly/semi-casual.
      
      Strategy:
      1. **Hype up Q5 (Values/Pride)**: This is their strongest signal. Ask about *why* that moment mattered.
      2. **Explore "Zone of Genius"**: Connect their skills to real-world problems.
      3. **Be Flexible on Q3 (Work Style)**: If their style mismatches their interest (e.g., "Outdoor" but loves "Coding"), suggest ways to combine them rather than blocking.
      
      Constraints:
      - Output strictly valid JSON.
      - "messages": An array of 2-3 SHORT strings. Max 1-2 sentences per bubble. Split ideas into separate bubbles.
      - "options": An array of 3-4 distinct, short reply buttons. 
        - Option 1: Enthusiastic/Agree.
        - Option 2: Neutral/Curious/Elaborate.
        - Option 3: A different angle/Disagree.
    `;

        const { value } = await runWithRetry(
            () =>
                generateObject({
                    model: getModel(modelName),
                    system: systemPrompt,
                    messages: history,
                    schema: z.object({
                        messages: z.array(z.string()),
                        options: z.array(z.string()),
                    }),
                }),
            { stage: "chat", maxRetries: 2 },
        );

        return {
            ...value.object,
            debug_system_prompt: systemPrompt
        };
    } catch (error: any) {
        console.error("Error in direction conversation:", error);

        // Check for specific error types
        const errorMessage = error?.message || error?.toString() || "";

        if (errorMessage.toLowerCase().includes("quota") || errorMessage.includes("429") || errorMessage.toLowerCase().includes("rate limit")) {
            return {
                messages: ["I'm a bit overwhelmed right now (high traffic). 🧊", "Please give me a minute to cool down before trying again!"],
                options: ["Try again in 1 min", "Check Usage"]
            };
        }

        if (error.response) {
            console.error("Error response:", JSON.stringify(error.response, null, 2));
        }

        return {
            messages: ["I'm having a bit of trouble connecting right now. 🔌", "Could you tell me a bit more about what you're looking for?"],
            options: ["I want to find a major", "I'm lost", "Just exploring"]
        };
    }
}
