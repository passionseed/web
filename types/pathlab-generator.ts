export type PathLabGeneratorDifficulty = "beginner" | "intermediate" | "advanced";

export type PathLabContentType =
  | "text"
  | "video"
  | "short_video"
  | "canva_slide"
  | "pdf"
  | "image"
  | "ai_chat"
  | "npc_chat";

export type PathLabAssessmentType =
  | "none"
  | "text_answer"
  | "file_upload"
  | "image_upload";

export interface PathLabLearningObjective {
  day: number;
  title: string;
  objective: string;
  studentDecisionQuestion: string;
}

export interface PathLabExpertIdentity {
  name: string;
  title: string;
  company: string;
  field: string;
  role: string;
  specialization?: string;
  workContext?: string;
  yearsInField?: number;
  experienceLevel?: string;
  credibilityMarkers?: string[];
}

export interface PathLabCareerTruths {
  mostImportant?: string[];
  mundaneButRequired?: string[];
  beginnersUnderestimate?: string[];
  hiddenChallenges?: string[];
  rewardingMoments?: string[];
  noviceToExpertShifts?: string[];
  misconceptions?: string[];
}

export interface PathLabExpertContext {
  identity: PathLabExpertIdentity;
  careerTruths: PathLabCareerTruths;
}

export interface PathLabGeneratorRequest {
  topic: string;
  audience: string;
  difficulty: PathLabGeneratorDifficulty;
  totalDays: number;
  tone: string;
  constraints?: string;
  categoryId?: string | null;
  expertContext?: PathLabExpertContext;
  learningObjectives?: PathLabLearningObjective[];
  fitSignals?: string[];
  misfitSignals?: string[];
  mustExperience?: string[];
  mustUnderstand?: string[];
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
