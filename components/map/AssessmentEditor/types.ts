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
    action: "add" | "delete" | "update"
  ) => void;
  onQuizQuestionsChange?: (questions: QuizQuestion[]) => void;
  // Optional props to support auto-saving temporary nodes
  nodeData?: any;
  mapId?: string;
  isSeedMap?: boolean; // NEW: Flag to indicate if this is a seed map
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
  onBatchImportQuestions?: (questions: QuestionFormData[]) => void;
}
