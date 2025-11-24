import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
});
import { z } from "zod";
import { StudentProfile, RecommendedUniversity } from "@/types/education";
import { AssessmentAnswers, DirectionFinderResult } from "@/types/direction-finder";

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
      model: google("gemini-2.5-flash"),
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
): Promise<string> {
  try {
    const systemPrompt = `
      You are an expert student direction counselor. Your goal is to help a student find their "Ikigai" (intersection of passion, skill, world need, and reality).
      
      You have access to their initial assessment data:
      ${JSON.stringify(answers, null, 2)}
      
      Your role is to:
      1. Ask follow-up questions to understand what problems/causes they care about (World Needs).
      2. Assess practical constraints and lifestyle preferences (Reality).
      3. Help synthesize their direction.
      
      Current Phase of Conversation:
      - If this is the start, acknowledge their strengths/interests from the assessment and ask about what problems in the world they care about.
      - If they've shared interests, ask about practical reality (constraints, resources).
      - If you have enough info, move to synthesis.
      
      Keep your responses short, encouraging, and conversational. Do not be a robot. Be a cool mentor.
      Ask only 1-2 questions at a time.
    `;

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: history,
    });

    return text;
  } catch (error) {
    console.error("Error in direction conversation:", error);
    return "I'm having a bit of trouble connecting right now. Could you tell me more about what you're looking for?";
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
      model: google("gemini-2.5-flash"),
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
