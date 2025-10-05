import { QuestionType } from "./types";

export const QUESTION_TYPE_CONFIG = {
  multiple_choice: {
    label: "Multiple Choice",
    description: "Question with multiple options (A, B, C, D)",
    defaultOptions: [
      { option: "A", text: "" },
      { option: "B", text: "" },
      { option: "C", text: "" },
      { option: "D", text: "" },
    ],
  },
  true_false: {
    label: "True/False",
    description: "Question with True or False options",
    defaultOptions: [
      { option: "true", text: "True" },
      { option: "false", text: "False" },
    ],
  },
  single_answer: {
    label: "Single Answer",
    description: "Question with a single correct text answer",
    defaultOptions: [],
  },
} as const;

export const ASSESSMENT_TYPE_CONFIG = {
  quiz: {
    label: "Quiz",
    description: "Multiple choice questions",
    icon: "📝",
  },
  text_answer: {
    label: "Text Answer",
    description: "Written response",
    icon: "✍️",
  },
  checklist: {
    label: "Checklist",
    description: "Task completion checklist",
    icon: "✅",
  },
  file_upload: {
    label: "File Upload",
    description: "Submit documents",
    icon: "📎",
  },
} as const;
