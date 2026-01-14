import { generateObject } from "ai";
import { z } from "zod";
import { AssessmentAnswers, DirectionFinderResult } from "@/types/direction-finder";
import { getModel } from "./modelRegistry";

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
