

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { StudentProfile, RecommendedUniversity } from "@/types/education";
import { AssessmentAnswers, DirectionFinderResult } from "@/types/direction-finder";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from '@ai-sdk/deepseek';

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

// Allow up to 60 seconds for AI generation (Vercel default is often 10s for Hobby, 15-60s for Pro)
export const maxDuration = 60;

function getModel(modelName?: string) {
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
      model: google("gemini-2.5-flash"), // Use fast model for summary
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
  answers: AssessmentAnswers,
  modelName?: string,
  language: 'en' | 'th' = 'en'
): Promise<{ messages: string[]; options: string[] }> {
  try {
    console.log("conductDirectionConversation called");
    console.log("History length:", history.length);
    console.log("Answers keys:", Object.keys(answers));
    console.log("Model:", modelName || "default");

    const systemPrompt = `
      You are a cool, casual mentor helping a high school student find their future path.
      Language: ${language === 'th' ? 'Thai (Informal, encouraging, like a supportive senior/P\')' : 'English'}
      
      Your Identity:
      - Name: "P'Seed" (if Thai) or "Seed" (if English)
      - Tone: Casual, empathetic, insightful, enthusiastic. Like a supportive older sibling.
      - Goal: Help the student reflect on their assessment answers to find their "North Star" (future direction).
      
      Student Assessment Context (Inner Ikigai):
      ${JSON.stringify(answers, null, 2)}

      Conversation Rules:
      1. Keep messages short (2-3 sentences max).
      2. Ask ONE thought-provoking question at a time.
      3. Focus on "Why" and "How" to dig deeper into their interests.
      4. Synthesize their answers to show you understand.
      5. If in Thai, use particles like "ครับ/ค่ะ" but keep it friendly/semi-casual.
      
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
      model: getModel(modelName),
      system: systemPrompt,
      messages: history,
      schema: z.object({
        messages: z.array(z.string()),
        options: z.array(z.string()),
      }),
    });

    return object;
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

export async function generateDirectionProfile(
  history: { role: 'user' | 'assistant'; content: string }[],
  answers: AssessmentAnswers,
  modelName?: string,
  language: 'en' | 'th' = 'en'
): Promise<DirectionFinderResult> {
  try {
    const prompt = `
      Based on the student's assessment data and the conversation history, generate a comprehensive Direction Profile.
      
      Language: ${language === 'th' ? 'Thai' : 'English'}
      
      Assessment Data:
      ${JSON.stringify(answers, null, 2)}
      
      Conversation History:
      ${JSON.stringify(history, null, 2)}
      
      Output JSON format:
      {
        "profile": {
          "energizers": ["List 3 specific things that give them energy"],
          "strengths": ["List 3 core strengths"],
          "values": ["List 3 core values"],
          "reality": ["List 3 aspects of reality/market they care about"]
        },
        "vectors": [
          {
            "name": "Creative/Cool/Inspiring Role Title",
            "fit_reason": {
              "interest_alignment": "One sentence on why this fits their interests",
              "strength_alignment": "One sentence on why this fits their strengths",
              "value_alignment": "One sentence on why this fits their values"
            },
            "differentiators": {
              "main_focus": "Short phrase describing the core focus (e.g. Building, Researching, Helping)",
              "knowledge_base": ["Subject 1", "Subject 2"],
              "skill_tree": ["Skill 1", "Skill 2"]
            },
            "rarity": "Legendary",
            "recommended_faculty": "Specific Faculty/Major Name",
            "match_context": {
                "passion_context": "You light up when discussing...", 
                "skill_context": "Your natural ability to..."
            },
            "match_scores": {
              "overall": 85,
              "passion": 85,
              "skill": 90
            },
            "exploration_steps": [
              { "type": "activity", "description": "Specific project/activity idea 1", "reason": "Why this matters" },
              { "type": "study", "description": "Specific study idea 2", "reason": "Why this matters" },
              { "type": "camp", "description": "Specific camp/event idea 3", "reason": "Why this matters" }
            ],
            "first_step": "The very first micro-step to take today"
          }
          // ... generate 3 vectors total
        ],
        "programs": [
          {
            "name": "Program Name",
            "match_level": "High",
            "match_percentage": 90,
            "reason": "Why this program fits",
            "deadline": "YYYY-MM-DD",
            "application_link": "https://example.com"
          }
        ],
        "commitments": {
          "this_week": ["Commitment 1", "Commitment 2"],
          "this_month": ["Commitment 1", "Commitment 2"]
        }
      }
      
      IMPORTANT: Ensure the JSON is valid. Do not include markdown formatting.
      If Language is Thai, all content in the JSON values MUST be in Thai. 
      For Rarity: Assign based on how unique/niche this combination is. 'Rare' (Common but good), 'Epic' (Strong niche), 'Legendary' (Very specific/unique combo), 'Mythical' (One of a kind/Visionary).
    `;

    const { object } = await generateObject({
      model: getModel(modelName),
      schema: z.object({
        profile: z.object({
          energizers: z.array(z.string()),
          strengths: z.array(z.string()),
          values: z.array(z.string()),
          reality: z.array(z.string()),
        }),
        vectors: z.array(z.object({
          name: z.string(),
          rarity: z.enum(['Rare', 'Epic', 'Legendary', 'Mythical']).optional(),
          recommended_faculty: z.string().optional(),
          match_context: z.object({
            passion_context: z.string(),
            skill_context: z.string(),
          }).optional(),
          fit_reason: z.object({
            interest_alignment: z.string(),
            strength_alignment: z.string(),
            value_alignment: z.string(),
          }),
          differentiators: z.object({
            main_focus: z.string(),
            knowledge_base: z.array(z.string()),
            skill_tree: z.array(z.string()),
          }).optional(),
          match_scores: z.object({
            overall: z.number().min(0).max(100),
            passion: z.number().min(0).max(100),
            skill: z.number().min(0).max(100),
          }),
          exploration_steps: z.array(z.object({
            type: z.enum(['project', 'study', 'activity', 'community', 'camp', 'person']).describe("The type of milestone project"),
            description: z.string().describe("Title of the project or milestone"),
            reason: z.string().optional().describe("Why this project matters"),
          })).describe("3-4 suggested projects or milestones to help the student progress in this direction"),
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

export async function generateDirectionProfileCore(
  history: { role: 'user' | 'assistant'; content: string }[],
  answers: AssessmentAnswers,
  modelName?: string,
  language: 'en' | 'th' = 'en'
): Promise<Partial<DirectionFinderResult>> {
  try {
    const prompt = `
      Based on the student's assessment data and conversation, generate the CORE Direction Profile (Profile + Vectors).
      
      Language: ${language === 'th' ? 'Thai' : 'English'}
      
      Assessment Data:
      ${JSON.stringify(answers, null, 2)}
      
      Conversation History:
      ${JSON.stringify(history, null, 2)}
      
      Output JSON format:
      {
        "profile": {
          "energizers": ["List 3 specific things that give them energy"],
          "strengths": ["List 3 core strengths"],
          "values": ["List 3 core values"],
          "reality": ["List 3 aspects of reality/market they care about"]
        },
        "vectors": [
          {
            "name": "Creative/Cool/Inspiring Role Title",
            "fit_reason": {
              "interest_alignment": "One sentence on why this fits their interests",
              "strength_alignment": "One sentence on why this fits their strengths",
              "value_alignment": "One sentence on why this fits their values"
            },
            "differentiators": {
              "main_focus": "Short phrase describing the core focus (e.g. Building, Researching, Helping)",
              "knowledge_base": ["Subject 1", "Subject 2"],
              "skill_tree": ["Skill 1", "Skill 2"]
            },
            "rarity": "Legendary",
            "recommended_faculty": "Specific Faculty/Major Name",
            "match_context": {
                "passion_context": "You light up when discussing...", 
                "skill_context": "Your natural ability to..."
            },
            "match_scores": {
              "overall": 85,
              "passion": 85,
              "skill": 90
            },
            "exploration_steps": [
              { "type": "activity", "description": "Specific project/activity idea 1", "reason": "Why this matters" },
              { "type": "study", "description": "Specific study idea 2", "reason": "Why this matters" },
              { "type": "camp", "description": "Specific camp/event idea 3", "reason": "Why this matters" }
            ],
            "first_step": "The very first micro-step to take today"
          }
          // ... generate 3 vectors total
        ]
      }
      
      Values MUST be in ${language === 'th' ? 'Thai' : 'English'}.
      Rarity: Rare, Epic, Legendary, Mythical.
    `;

    const { object } = await generateObject({
      model: getModel(modelName),
      schema: z.object({
        profile: z.object({
          energizers: z.array(z.string()),
          strengths: z.array(z.string()),
          values: z.array(z.string()),
          reality: z.array(z.string()),
        }),
        vectors: z.array(z.object({
          name: z.string(),
          rarity: z.enum(['Rare', 'Epic', 'Legendary', 'Mythical']).optional(),
          recommended_faculty: z.string().optional(),
          match_context: z.object({
            passion_context: z.string(),
            skill_context: z.string(),
          }).optional(),
          fit_reason: z.object({
            interest_alignment: z.string(),
            strength_alignment: z.string(),
            value_alignment: z.string(),
          }),
          differentiators: z.object({
            main_focus: z.string(),
            knowledge_base: z.array(z.string()),
            skill_tree: z.array(z.string()),
          }).optional(),
          match_scores: z.object({
            overall: z.number().min(0).max(100),
            passion: z.number().min(0).max(100),
            skill: z.number().min(0).max(100),
          }),
          exploration_steps: z.array(z.object({
            type: z.enum(['project', 'study', 'activity', 'community', 'camp', 'person']).describe("The type of milestone project"),
            description: z.string().describe("Title of the project or milestone"),
            reason: z.string().optional().describe("Why this project matters"),
          })).describe("3-4 suggested projects or milestones to help the student progress in this direction"),
          first_step: z.string(),
        })),
      }),
      prompt,
    });

    return object;
  } catch (error) {
    console.error("Error generating core profile:", error);
    throw error;
  }
}

export async function generateDirectionProfileDetails(
  coreResult: Partial<DirectionFinderResult>,
  answers: AssessmentAnswers,
  modelName?: string,
  language: 'en' | 'th' = 'en'
): Promise<Partial<DirectionFinderResult>> {
  try {
    const prompt = `
      Based on the student's Core Result (Vectors), generate supporting details (Programs & Commitments).
      
      Language: ${language === 'th' ? 'Thai' : 'English'}
      
      Core Vectors Identified:
      ${JSON.stringify(coreResult.vectors, null, 2)}
      
      Student Context:
      ${JSON.stringify(answers.q4_subject_interests, null, 2)}
      
      Output JSON format:
      {
        "programs": [
          {
            "name": "Program Name",
            "match_level": "High",
            "match_percentage": 90,
            "reason": "Why this program fits the vectors above",
            "deadline": "YYYY-MM-DD",
            "application_link": "https://example.com"
          }
           // ... generate 2-3 programs
        ],
        "commitments": {
          "this_week": ["Commitment 1", "Commitment 2"],
          "this_month": ["Commitment 1", "Commitment 2"]
        }
      }
      
      Values MUST be in ${language === 'th' ? 'Thai' : 'English'}.
    `;

    const { object } = await generateObject({
      model: getModel(modelName),
      schema: z.object({
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
    console.error("Error generating profile details:", error);
    throw error;
  }
}
