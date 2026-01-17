import { generateObject } from "ai";
import { z } from "zod";
import { AssessmentAnswers } from "@/types/direction-finder";
import { getModel } from "./modelRegistry";

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

        const { object } = await generateObject({
            model: getModel("google/gemini-2.5-flash"), // Use fast model for summary
            schema: z.object({ summary: z.string() }),
            prompt,
        });

        return object.summary;
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
        console.log("conductDirectionConversation called");
        console.log("History length:", history.length);
        console.log("Answers keys:", Object.keys(answers));
        console.log("Model:", modelName || "default");

        // Build structured context for better AI understanding
        const { buildProfileContext } = await import("./directionProfileEngine");
        const context = buildProfileContext(answers);

        // Formulate a rich context string
        const contextString = `
      Student Profile Context (Processed from Assessment):
      
      [PRIMARY SIGNALS]
      - Zone of Genius (High Interest + Skill): ${JSON.stringify(context.primary_signals.zone_of_genius)}
      - Flow State Triggers: "${context.primary_signals.flow_evidence}"
      - Validated Strengths (Feedback): ${JSON.stringify(context.primary_signals.external_proof)}
      
      [SECONDARY SIGNALS]
      - Work Style: ${JSON.stringify(context.secondary_signals.environment)}
      - Core Values: ${JSON.stringify(context.secondary_signals.values)}
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
      3. Focus on "Why" and "How" to dig deeper into their interests.
      4. Synthesize their answers to show you understand (e.g., "Since you love [Genius Item] and work well in [Style]...").
      5. If in Thai, use particles like "ครับ/ค่ะ" but keep it friendly/semi-casual.
      
      Strategy:
      1. If this is the start: Hype up their "Zone of Genius"! Then ask a bridging question about how they apply it.
      2. Explore "World Needs": Ask what problems they want to solve using their strengths.
      3. Explore "Reality": check if their work style preferences match their interests.
      
      Constraints:
      - Output strictly valid JSON.
      - "messages": An array of 2-3 SHORT strings. Max 1-2 sentences per bubble. Split ideas into separate bubbles.
      - "options": An array of 3-4 distinct, short reply buttons. 
        - Option 1: Enthusiastic/Agree.
        - Option 2: Neutral/Curious/Elaborate.
        - Option 3: A different angle/Disagree.
    `;

        const { object } = await generateObject({
            model: getModel(modelName),
            system: systemPrompt,
            messages: history,
            schema: z.object({
                messages: z.array(z.string()),
                options: z.array(z.string()),
            }),
        });

        return {
            ...object,
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
