export type MentoringPreference = "none" | "free" | "paid";
export type ExpertStatus = "pending" | "approved" | "rejected" | "claimed";
export type GenerationStatus = "pending" | "generating" | "completed" | "failed";
export type InterviewType = "expert" | "student";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface InterviewQuestion {
  id: string;
  text: string;
}

export interface InterviewProgress {
  current: number;
  total: number;
}

export interface ExtractedExpertIdentity {
  specialization?: string;
  workContext?: string;
  credibilityMarkers?: string[];
}

export interface ExtractedCareerTruths {
  mostImportant?: string[];
  mundaneButRequired?: string[];
  beginnersUnderestimate?: string[];
  hiddenChallenges?: string[];
  rewardingMoments?: string[];
  noviceToExpertShifts?: string[];
}

export interface ExtractedLearningObjective {
  day: number;
  title: string;
  objective: string;
  studentDecisionQuestion: string;
}

export interface ExtractedQuestBlueprint {
  studentGoal?: string;
  fitSignals?: string[];
  misfitSignals?: string[];
  mustExperience?: string[];
  mustUnderstand?: string[];
  learningObjectives?: ExtractedLearningObjective[];
}

export interface ExtractedCareerData {
  field: string;
  role: string;
  industry?: string;
  dailyTasks: string[];
  challenges: string[];
  rewards: string[];
  misconceptions: string[];
  skills: {
    technical: string[];
    soft: string[];
    hardToDevelop: string[];
  };
  advice: string;
  entryPath: {
    education?: string;
    firstJob?: string;
    keySteps: string[];
    alternatives?: string[];
  };
  experienceLevel: string;
  yearsInField: number;
  expertIdentity?: ExtractedExpertIdentity;
  careerTruths?: ExtractedCareerTruths;
  questBlueprint?: ExtractedQuestBlueprint;
}

export interface ExpertProfile {
  id: string;
  userId?: string;
  name: string;
  title: string;
  company: string;
  photoUrl?: string;
  fieldCategory: string;
  linkedinUrl?: string;
  interviewSessionId: string;
  interviewData: ExtractedCareerData;
  interviewTranscript: ChatMessage[];
  mentoringPreference: MentoringPreference;
  bookingUrl?: string;
  status: ExpertStatus;
  adminNotes?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface ExpertPathLab {
  id: string;
  expertProfileId: string;
  seedId?: string;
  pathId?: string;
  generationStatus: GenerationStatus;
  generationError?: string;
  createdAt: string;
  generatedAt?: string;
}

export interface MentorSession {
  id: string;
  expertProfileId: string;
  bookedByUserId?: string;
  sessionType: "free" | "paid";
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  scheduledAt: string;
  durationMinutes: number;
  notesFromBooker?: string;
  notesFromExpert?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewSessionResponse {
  sessionId: string;
  firstQuestion: InterviewQuestion;
}

export interface InterviewChatResponse {
  nextQuestion?: InterviewQuestion;
  progress: InterviewProgress;
  isComplete: boolean;
  extractedData?: ExtractedCareerData;
}
