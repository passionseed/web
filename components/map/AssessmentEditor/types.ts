import { NodeAssessment, QuizQuestion } from "@/types/map";

export type QuestionType = "multiple_choice" | "true_false" | "single_answer";

export interface QuestionFormData {
  question_text: string;
  type: QuestionType;
  options: Array<{ option: string; text: string }>;
  correct_option: string;
}

export interface AssessmentEditorProps {
  nodeId: string;
  assessment: NodeAssessment | null;
  onAssessmentChange: (
    newAssessment: NodeAssessment | null,
    action: "add" | "delete"
  ) => void;
  onQuizQuestionsChange?: (questions: QuizQuestion[]) => void;
}

export interface QuestionFormProps {
  existingQuestion?: QuizQuestion;
  onSave: (questionData: QuestionFormData) => void;
  onCancel: () => void;
}

export interface QuizEditorProps {
  assessment: NodeAssessment;
  onQuestionChange: (
    q: QuizQuestion,
    action: "add" | "update" | "delete"
  ) => void;
}
