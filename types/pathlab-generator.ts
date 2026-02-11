export type PathLabGeneratorDifficulty = "beginner" | "intermediate" | "advanced";

export type PathLabContentType =
  | "text"
  | "video"
  | "pdf"
  | "image"
  | "resource_link";

export type PathLabAssessmentType =
  | "none"
  | "text_answer"
  | "quiz"
  | "file_upload"
  | "checklist";

export interface PathLabGeneratorRequest {
  topic: string;
  audience: string;
  difficulty: PathLabGeneratorDifficulty;
  totalDays: number;
  tone: string;
  constraints?: string;
  categoryId?: string | null;
}

export interface PathLabGeneratorSeedDraft {
  title: string;
  slogan: string;
  description: string;
  category_name: string;
}

export interface PathLabGeneratorPathDraft {
  total_days: number;
}

export interface PathLabGeneratorDayDraft {
  day_number: number;
  title?: string | null;
  context_text: string;
  reflection_prompts: string[];
  node_keys: string[];
}

export interface PathLabGeneratorContentDraft {
  type: PathLabContentType;
  title?: string | null;
  body?: string | null;
  url?: string | null;
}

export interface PathLabGeneratorQuizQuestionDraft {
  question_text: string;
  options: Array<{
    option: string;
    text: string;
  }>;
  correct_option: string;
}

export interface PathLabGeneratorAssessmentDraft {
  type: PathLabAssessmentType;
  prompt?: string | null;
  checklist_items?: string[];
  quiz_questions?: PathLabGeneratorQuizQuestionDraft[];
  points_possible?: number | null;
}

export interface PathLabGeneratorNodeDraft {
  key: string;
  title: string;
  instructions: string;
  difficulty: PathLabGeneratorDifficulty;
  content: PathLabGeneratorContentDraft[];
  assessment: PathLabGeneratorAssessmentDraft;
}

export interface PathLabGeneratorEdgeDraft {
  source_key: string;
  destination_key: string;
}

export interface PathLabGeneratorDraft {
  seed: PathLabGeneratorSeedDraft;
  path: PathLabGeneratorPathDraft;
  days: PathLabGeneratorDayDraft[];
  nodes: PathLabGeneratorNodeDraft[];
  edges: PathLabGeneratorEdgeDraft[];
}

export type PathLabQualityLevel = "error" | "warning";

export interface PathLabQualityIssue {
  code: string;
  level: PathLabQualityLevel;
  message: string;
  field?: string;
}

export interface PathLabQualityResult {
  valid: boolean;
  errors: PathLabQualityIssue[];
  warnings: PathLabQualityIssue[];
  issues: PathLabQualityIssue[];
}

export interface PathLabGenerateResponse {
  seedId: string;
  mapId: string;
  pathId: string;
  dayCount: number;
  nodeCount: number;
  warnings: string[];
}
