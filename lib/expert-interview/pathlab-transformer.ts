import type { ExtractedCareerData } from "@/types/expert-interview";
import type { PathLabGeneratorRequestInput } from "@/lib/ai/pathlab-generator-schema";

export function transformExpertDataToPathLabRequest(
  expertData: ExtractedCareerData,
  expertProfile: { name: string; title: string; company: string }
): PathLabGeneratorRequestInput {
  const topic = `${expertData.field}: ${expertData.role}`;
  const audience = "High school students (ages 15-18) exploring career options";
  const difficulty = assessFieldDifficulty(expertData.field);
  const totalDays = 5;
  const tone = `Conversational and encouraging. This PathLab is inspired by ${expertProfile.name}, a ${expertProfile.title} at ${expertProfile.company}. Weave in their real experiences and advice naturally.`;
  const constraints = buildConstraints(expertData);

  return { topic, audience, difficulty, totalDays, tone, constraints };
}

function buildConstraints(expertData: ExtractedCareerData): string {
  const parts: string[] = [];

  if (expertData.challenges.length > 0) {
    parts.push(
      `Include activities that let students experience: ${expertData.challenges.slice(0, 3).join(", ")}.`
    );
  }

  const allSkills = [
    ...expertData.skills.technical.slice(0, 3),
    ...expertData.skills.soft.slice(0, 2),
  ];
  if (allSkills.length > 0) {
    parts.push(`Build skill-building exercises around: ${allSkills.join(", ")}.`);
  }

  if (expertData.advice) {
    parts.push(`End with reflection on: "${expertData.advice.slice(0, 200)}"`);
  }

  if (expertData.entryPath.keySteps.length > 0) {
    parts.push(
      `Include a day exploring paths into this field: ${expertData.entryPath.keySteps.join(" → ")}.`
    );
  }

  if (expertData.misconceptions.length > 0) {
    parts.push(
      `Address these misconceptions: ${expertData.misconceptions.slice(0, 2).join(", ")}.`
    );
  }

  return parts.join(" ");
}

function assessFieldDifficulty(
  field: string
): "beginner" | "intermediate" | "advanced" {
  const advancedFields = ["medicine", "law", "aerospace", "quantum", "research", "surgery"];
  const intermediateFields = [
    "engineering",
    "data science",
    "finance",
    "architecture",
    "software",
  ];

  const fieldLower = field.toLowerCase();

  if (advancedFields.some((f) => fieldLower.includes(f))) return "advanced";
  if (intermediateFields.some((f) => fieldLower.includes(f))) return "intermediate";
  return "beginner";
}
