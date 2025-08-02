import { QuizQuestion } from "@/types/map";
import { QuestionFormData, QuestionType } from "./types";

export const generateTempQuestionId = (): string =>
  `temp_question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const validateQuestionForm = (
  questionText: string,
  questionType: QuestionType,
  options: Array<{ option: string; text: string }>,
  correctOption: string
): string[] => {
  const errors: string[] = [];

  if (!questionText.trim()) {
    errors.push("Question text is required");
  }

  if (questionType === "single_answer") {
    if (!correctOption.trim()) {
      errors.push("Correct answer is required for single answer questions");
    }
  } else {
    if (!correctOption) {
      errors.push("Please select the correct option");
    }

    const hasEmptyOptions = options.some((opt) => !opt.text.trim());
    if (hasEmptyOptions) {
      errors.push("All answer options must have text");
    }

    const validCorrectOption = options.some(
      (opt) => opt.option === correctOption
    );
    if (!validCorrectOption) {
      errors.push("Selected correct option doesn't match available options");
    }
  }

  return errors;
};

export const getQuestionPreview = (question: QuizQuestion): string => {
  const preview = question.question_text.substring(0, 60);
  return preview + (question.question_text.length > 60 ? "..." : "");
};

export const getQuestionTypeLabel = (question: QuizQuestion): string => {
  if (!question.options) return "Single Answer";
  const options = question.options as Array<{ option: string; text: string }>;
  if (options.length === 2 && options.some((opt) => opt.option === "true")) {
    return "True/False";
  }
  return "Multiple Choice";
};

export const convertFormDataToQuestion = (
  questionData: QuestionFormData,
  assessmentId: string,
  existingId?: string
): QuizQuestion => ({
  id: existingId || generateTempQuestionId(),
  assessment_id: assessmentId,
  question_text: questionData.question_text,
  options: questionData.options.length > 0 ? questionData.options : null,
  correct_option: questionData.correct_option,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const detectQuestionType = (question: QuizQuestion): QuestionType => {
  if (!question.options) return "single_answer";

  const options = question.options as Array<{ option: string; text: string }>;
  if (options.length === 2 && options.some((opt) => opt.option === "true")) {
    return "true_false";
  }
  return "multiple_choice";
};
