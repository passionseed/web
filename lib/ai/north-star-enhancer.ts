/**
 * AI Enhancement for North Star Creation
 *
 * Uses Gemini API to help users clarify vision and generate milestones
 * Rate limited: 1 enhancement per North Star creation session
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const AI_PROMPTS = {
  enhanceVision: (vision: string, language: "en" | "th") => {
    if (language === "th") {
      return `คุณคือโค้ชการวางแผนชีวิตที่ช่วยเหลือผู้คนในการชี้แจงเป้าหมายของพวกเขา

วิสัยทัศน์ของผู้ใช้ (3 ปีข้างหน้า):
"${vision}"

โปรดช่วย:
1. ทำให้วิสัยทัศน์นี้ชัดเจนและเฉพาะเจาะจงมากขึ้น
2. เพิ่มรายละเอียดที่วัดผลได้เกี่ยวกับความสำเร็จ
3. ทำให้สร้างแรงบันดาลใจและมีแรงจูงใจมากขึ้น

ตอบกลับด้วยวิสัยทัศน์ที่ปรับปรุงแล้วเท่านั้น (1-2 ย่อหน้า) โดยไม่ต้องมีคำอธิบายเพิ่มเติม`;
    }

    return `You are a life planning coach helping people clarify their goals.

User's vision (3 years from now):
"${vision}"

Please help by:
1. Making this vision more specific and concrete
2. Adding measurable details about what success looks like
3. Making it more inspiring and motivating

Respond with ONLY the improved vision (1-2 paragraphs), no additional explanation.`;
  },

  generateMilestones: (vision: string, language: "en" | "th") => {
    if (language === "th") {
      return `คุณคือที่ปรึกษาการวางแผนที่ช่วยแบ่งเป้าหมายขนาดใหญ่ออกเป็นขั้นตอนที่ดำเนินการได้

เป้าหมาย 3 ปี:
"${vision}"

สร้าง 5-7 ขั้นตอนสำคัญที่:
- เป็นลำดับเวลา (จากเริ่มต้นถึงเป้าหมาย)
- เฉพาะเจาะจงและดำเนินการได้
- สร้างความก้าวหน้าตามธรรมชาติ
- ครอบคลุม 3 ปี

รูปแบบ: ส่งคืนเฉพาะอาร์เรย์ JSON ของสตริง ไม่มีคำอธิบายเพิ่มเติม
ตัวอย่าง: ["ขั้นตอนที่ 1", "ขั้นตอนที่ 2", "ขั้นตอนที่ 3"]`;
    }

    return `You are a planning advisor helping break down big goals into actionable steps.

3-year goal:
"${vision}"

Generate 5-7 key milestones that are:
- Chronologically ordered (from start to goal)
- Specific and actionable
- Build on each other naturally
- Span the 3-year timeframe

Format: Return ONLY a JSON array of strings, no additional explanation.
Example: ["Step 1", "Step 2", "Step 3"]`;
  },
};

export interface EnhancementResult {
  success: boolean;
  data?: string | string[];
  error?: string;
}

/**
 * Enhance vision text using AI
 */
export async function enhanceVision(
  visionText: string,
  language: "en" | "th" = "en"
): Promise<EnhancementResult> {
  if (!visionText.trim()) {
    return { success: false, error: "Vision text is required" };
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("NEXT_PUBLIC_GEMINI_API_KEY not found");
      return { success: false, error: "AI service not configured" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = AI_PROMPTS.enhanceVision(visionText, language);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const enhancedVision = response.text().trim();

    return { success: true, data: enhancedVision };
  } catch (error: any) {
    console.error("Error enhancing vision:", error);
    return {
      success: false,
      error: error.message || "Failed to enhance vision",
    };
  }
}

/**
 * Generate milestone suggestions using AI
 */
export async function generateMilestones(
  visionText: string,
  language: "en" | "th" = "en"
): Promise<EnhancementResult> {
  if (!visionText.trim()) {
    return { success: false, error: "Vision text is required" };
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("NEXT_PUBLIC_GEMINI_API_KEY not found");
      return { success: false, error: "AI service not configured" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = AI_PROMPTS.generateMilestones(visionText, language);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    // Try to parse JSON response
    try {
      // Remove markdown code blocks if present
      const cleanedText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const milestones = JSON.parse(cleanedText);

      if (Array.isArray(milestones) && milestones.length > 0) {
        return { success: true, data: milestones };
      }

      return { success: false, error: "Invalid milestone format" };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return { success: false, error: "Failed to parse AI suggestions" };
    }
  } catch (error: any) {
    console.error("Error generating milestones:", error);
    return {
      success: false,
      error: error.message || "Failed to generate milestones",
    };
  }
}
