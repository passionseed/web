import { generateObject } from "ai";
import { z } from "zod";
import { StudentProfile, RecommendedUniversity } from "@/types/education";
import { getModel } from "./modelRegistry";

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
            model: getModel("google/gemini-2.5-flash"),
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
