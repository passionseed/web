import type { PathLabGeneratorRequestInput } from "@/lib/ai/pathlab-generator-schema";

export type ConversationParams = Partial<PathLabGeneratorRequestInput>;

export interface MissingParam {
  key: keyof PathLabGeneratorRequestInput;
  label: string;
  description: string;
}

const REQUIRED_PARAMS: MissingParam[] = [
  {
    key: "topic",
    label: "Topic",
    description: "The subject or skill to teach",
  },
  {
    key: "audience",
    label: "Audience",
    description: "Who this pathLab is for (e.g., high school students, professionals)",
  },
  {
    key: "difficulty",
    label: "Difficulty",
    description: "Learning level: beginner, intermediate, or advanced",
  },
  {
    key: "totalDays",
    label: "Duration",
    description: "Number of days (1-30, typically 5-7)",
  },
  {
    key: "tone",
    label: "Tone",
    description: "Style of content (e.g., engaging, professional, playful)",
  },
];

export function hasAllRequiredParams(params: ConversationParams): boolean {
  return REQUIRED_PARAMS.every((param) => {
    const value = params[param.key];
    if (value === undefined || value === null) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    return true;
  });
}

export function getMissingParams(params: ConversationParams): MissingParam[] {
  return REQUIRED_PARAMS.filter((param) => {
    const value = params[param.key];
    if (value === undefined || value === null) return true;
    if (typeof value === "string" && value.trim() === "") return true;
    return false;
  });
}

export function getNextQuestionPrompt(missingParams: MissingParam[]): string {
  if (missingParams.length === 0) return "";

  // Ask about first missing param
  const param = missingParams[0];

  const prompts: Record<string, string> = {
    topic:
      "What subject or skill would you like to teach? (e.g., 'Introduction to Python', 'Graphic Design Basics', 'Time Management')",
    audience:
      "Who is this pathLab for? (e.g., 'high school students', 'working professionals', 'complete beginners')",
    difficulty:
      "What difficulty level should this be? Choose: beginner, intermediate, or advanced",
    totalDays:
      "How many days should this pathLab run? I recommend 5-7 days for most topics, but you can choose 1-30 days.",
    tone: "What tone or style should the content have? (e.g., 'engaging and fun', 'professional and formal', 'casual and friendly')",
  };

  return prompts[param.key] || `Please provide: ${param.label} - ${param.description}`;
}

export function extractParamsFromMessage(
  message: string,
  currentParams: ConversationParams,
): ConversationParams {
  const lowerMessage = message.toLowerCase().trim();
  const updated: ConversationParams = { ...currentParams };

  // Extract difficulty - look for exact words first, then synonyms
  if (!updated.difficulty) {
    // Exact matches (priority)
    if (lowerMessage.includes("beginner")) {
      updated.difficulty = "beginner";
    } else if (lowerMessage.includes("intermediate")) {
      updated.difficulty = "intermediate";
    } else if (lowerMessage.includes("advanced")) {
      updated.difficulty = "advanced";
    }
    // Synonyms (fallback)
    else if (
      lowerMessage.includes("beginning") ||
      lowerMessage.includes("basic") ||
      lowerMessage.includes("easy") ||
      lowerMessage.includes("starter") ||
      lowerMessage.includes("introductory") ||
      lowerMessage.match(/\bbegin\b/)
    ) {
      updated.difficulty = "beginner";
    } else if (
      lowerMessage.includes("medium") ||
      lowerMessage.includes("middle") ||
      lowerMessage.includes("moderate")
    ) {
      updated.difficulty = "intermediate";
    } else if (
      lowerMessage.includes("expert") ||
      lowerMessage.includes("hard") ||
      lowerMessage.includes("difficult") ||
      lowerMessage.includes("professional") ||
      lowerMessage.includes("mastery")
    ) {
      updated.difficulty = "advanced";
    }
  }

  // Extract totalDays - look for numbers
  if (!updated.totalDays) {
    const dayMatch = lowerMessage.match(/(\d+)\s*(day|days)/);
    if (dayMatch) {
      const days = parseInt(dayMatch[1], 10);
      if (days >= 1 && days <= 30) {
        updated.totalDays = days;
      }
    } else {
      // Just a number might be days
      const numberMatch = lowerMessage.match(/\b(\d+)\b/);
      if (numberMatch) {
        const days = parseInt(numberMatch[1], 10);
        if (days >= 1 && days <= 30) {
          updated.totalDays = days;
        }
      }
    }
  }

  // Extract topic - if we need topic and message doesn't contain meta-conversation words
  if (!updated.topic) {
    const metaWords = [
      "help",
      "what",
      "how",
      "why",
      "which",
      "can you",
      "could you",
      "please",
      "i want",
      "i need",
    ];
    const hasMetaWord = metaWords.some((word) => lowerMessage.includes(word));

    // If it's a straightforward answer (no meta words), treat as topic
    if (!hasMetaWord && message.trim().length > 2 && message.trim().length < 160) {
      updated.topic = message.trim();
    }
  }

  // Extract audience - look for common patterns
  if (!updated.audience) {
    const audiencePatterns = [
      /for\s+(.+?)(?:\.|$)/i,
      /target audience[:\s]+(.+?)(?:\.|$)/i,
      /audience[:\s]+(.+?)(?:\.|$)/i,
    ];

    for (const pattern of audiencePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        updated.audience = match[1].trim();
        break;
      }
    }

    // If no pattern matched and we're asking for audience, treat whole message as audience
    if (!updated.audience && message.trim().length > 2 && message.trim().length < 120) {
      // Check if this seems like an audience description
      const audienceWords = [
        "student",
        "professional",
        "beginner",
        "kid",
        "adult",
        "teacher",
        "developer",
        "designer",
      ];
      if (audienceWords.some((word) => lowerMessage.includes(word))) {
        updated.audience = message.trim();
      }
    }
  }

  // Extract tone
  if (!updated.tone) {
    const tonePatterns = [
      /tone[:\s]+(.+?)(?:\.|$)/i,
      /style[:\s]+(.+?)(?:\.|$)/i,
      /(engaging|professional|playful|casual|formal|friendly|academic)/i,
    ];

    for (const pattern of tonePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        updated.tone = match[1].trim();
        break;
      }
    }

    // If we're on tone question and message is short, treat as tone
    if (!updated.tone && message.trim().length > 2 && message.trim().length < 80) {
      updated.tone = message.trim();
    }
  }

  return updated;
}

export function formatParamsSummary(params: ConversationParams): string {
  const parts: string[] = [];

  if (params.totalDays) {
    parts.push(`${params.totalDays}-day`);
  }
  if (params.difficulty) {
    parts.push(params.difficulty);
  }
  if (params.topic) {
    parts.push(`"${params.topic}"`);
  }
  if (params.audience) {
    parts.push(`for ${params.audience}`);
  }
  if (params.tone) {
    parts.push(`(tone: ${params.tone})`);
  }

  return parts.join(" ");
}
