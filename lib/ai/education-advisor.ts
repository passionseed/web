"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { StudentProfile, RecommendedUniversity } from "@/types/education";
import { AssessmentAnswers, DirectionFinderResult } from "@/types/direction-finder";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
});

export async function recommendUniversities(
  profile: StudentProfile,
  language: "en" | "th" = "th"
): Promise<{ success: boolean; data?: RecommendedUniversity[]; error?: string }> {
  try {
    const prompt = `
      As an expert educational consultant for Thai universities, analyze this student profile and recommend the top 3 most suitable university programs in Thailand.

      Student Profile:
      - Interests: ${profile.interests.join(", ")}
      - Strengths: ${profile.strengths.join(", ")}
      - Preferred Location: ${profile.preferredLocation}
      - Campus Vibe: ${profile.campusVibe}
      - Extracurriculars: ${profile.extracurriculars.join(", ")}
      - Career Aspirations: ${profile.careerAspirations.join(", ")}
      - Industry Preference: ${profile.industryPreference}

      Please provide recommendations that specifically match their profile. Focus on well-known Thai universities (e.g., Chulalongkorn, Mahidol, Thammasat, Kasetsart, CMU, etc.) but prioritize the best fit.
      
      For each recommendation explain WHY it fits this specific student based on their profile.
      
      Language: ${language === "th" ? "Thai" : "English"}
    `;

    const { object } = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: z.object({
        recommendations: z.array(
          z.object({
            universityName: z.string(),
            faculty: z.string(),
            major: z.string(),
            matchScore: z.number().min(0).max(100),
            reasoning: z.string(),
          })
        ),
      }),
      prompt,
    });

    return { success: true, data: object.recommendations };
  } catch (error) {
    console.error("Error recommending universities:", error);
    return { success: false, error: "Failed to generate recommendations" };
  }
}

export async function conductDirectionConversation(
  history: { role: 'user' | 'assistant'; content: string }[],
  answers: AssessmentAnswers
): Promise<{ messages: string[]; options: string[] }> {
  try {
    console.log("conductDirectionConversation called");
    console.log("History length:", history.length);
    console.log("Answers keys:", Object.keys(answers));
    console.log("API Key present:", !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY));

    const systemPrompt = `
      You are a cool, casual mentor helping a high school student find their future path. You are NOT a stiff professor. Use emojis and keeping it high-energy.
      
      Your Goal: 
      Connect their "Inner Ikigai" (Passion + Skill, which we know from the assessment) to their "Outer Ikigai" (What the World Needs + What They Can Be Paid For).
      
      Student Assessment Context (Inner Ikigai):
      ${JSON.stringify(answers, null, 2)}
      
      Strategy:
      1. If this is the start: Hype up their strengths/interests! Then immediately ask a question to bridge to the real world.
      2. Explore "World Needs": Ask what problems annoy them, what causes they care about, or who they want to help.
      3. Explore "Reality/Market": Ask about lifestyle preferences, work environment (team vs solo), or industry interests.
      
      Constraints:
      - Output strictly valid JSON.
      - "messages": An array of 2-3 SHORT strings. Max 1-2 sentences per bubble. Split ideas into separate bubbles for better reading.
      - "options": An array of 3-4 distinct, short reply buttons for the user. 
        - Option 1: Enthusiastic/Agree.
        - Option 2: Neutral/Curious/Elaborate.
        - Option 3: A different angle/Disagree.
      
      Tone:
      - Short, punchy, conversational.
      - No walls of text.
    `;

    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: history,
      schema: z.object({
        messages: z.array(z.string()),
        options: z.array(z.string()),
      }),
    });

    return object;
  } catch (error) {
    console.error("Error in direction conversation:", error);
    // @ts-ignore
    if (error.response) {
        // @ts-ignore
        console.error("Error response:", JSON.stringify(error.response, null, 2));
    }
    return {
      messages: ["I'm having a bit of trouble connecting right now. 🔌", "Could you tell me a bit more about what you're looking for?"],
      options: ["I want to find a major", "I'm lost", "Just exploring"]
    };
  }
}

export async function generateDirectionProfile(
  history: { role: 'user' | 'assistant'; content: string }[],
  answers: AssessmentAnswers
): Promise<DirectionFinderResult> {
  try {
    const prompt = `
      Based on the student's assessment data and the conversation history, generate a comprehensive Direction Profile.
      
      Assessment Data:
      ${JSON.stringify(answers, null, 2)}
      
      Conversation History:
      ${history.map(m => `${m.role}: ${m.content}`).join('\n')}
      
      Generate a JSON object with:
      1. Ikigai Profile (Energizers, Strengths, Values, Reality)
      2. 3 Direction Vectors (distinct paths they could take)
      3. 3 Matched Programs (specific university programs or general fields if specific ones aren't clear)
      4. Suggested Commitments (micro-actions)
    `;

    const { object } = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: z.object({
        profile: z.object({
          energizers: z.array(z.string()),
          strengths: z.array(z.string()),
          values: z.array(z.string()),
          reality: z.array(z.string()),
        }),
        vectors: z.array(z.object({
          name: z.string(),
          fit_reason: z.object({
            interest_alignment: z.string(),
            strength_alignment: z.string(),
            value_alignment: z.string(),
          }),
          exploration_steps: z.array(z.object({
            type: z.enum(['camp', 'study', 'activity', 'person']),
            description: z.string(),
            reason: z.string().optional(),
          })),
          first_step: z.string(),
        })),
        programs: z.array(z.object({
          name: z.string(),
          match_level: z.enum(['High', 'Good', 'Stretch']),
          match_percentage: z.number(),
          reason: z.string(),
          deadline: z.string().optional(),
          application_link: z.string().optional(),
        })),
        commitments: z.object({
          this_week: z.array(z.string()),
          this_month: z.array(z.string()),
        }),
      }),
      prompt,
    });

    return object;
  } catch (error) {
    console.error("Error generating direction profile:", error);
    throw error;
  }
}
