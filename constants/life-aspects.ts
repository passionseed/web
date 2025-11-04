/**
 * Life Aspects Framework
 *
 * Holistic categorization for North Stars and Journey Projects
 * Replaces career-only focus with balanced life planning
 */

export const LIFE_ASPECTS = [
  {
    value: "career",
    label: "Career & Work",
    icon: "💼",
    color: "#3b82f6",
    description: "Professional growth, job advancement, career transitions",
  },
  {
    value: "learning",
    label: "Learning & Growth",
    icon: "📚",
    color: "#8b5cf6",
    description: "Education, skill development, personal growth",
  },
  {
    value: "health",
    label: "Health & Wellness",
    icon: "❤️",
    color: "#10b981",
    description: "Physical fitness, mental health, well-being",
  },
  {
    value: "relationships",
    label: "Relationships & Family",
    icon: "🤝",
    color: "#f59e0b",
    description: "Family bonds, friendships, social connections",
  },
  {
    value: "creativity",
    label: "Creativity & Hobbies",
    icon: "🎨",
    color: "#ec4899",
    description: "Arts, hobbies, creative pursuits, self-expression",
  },
  {
    value: "finance",
    label: "Financial Security",
    icon: "💰",
    color: "#14b8a6",
    description: "Savings, investments, financial independence",
  },
  {
    value: "contribution",
    label: "Community & Impact",
    icon: "🌍",
    color: "#06b6d4",
    description: "Social impact, volunteering, making a difference",
  },
  {
    value: "spirituality",
    label: "Purpose & Spirituality",
    icon: "✨",
    color: "#a855f7",
    description: "Meaning, values, spiritual growth, life purpose",
  },
] as const;

export type LifeAspectValue = (typeof LIFE_ASPECTS)[number]["value"];
