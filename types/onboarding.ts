export type OnboardingStep =
  | 'welcome'
  | 'interest'
  | 'assessment'
  | 'influence'
  | 'results'
  | 'account';

export type OnboardingMode = 'chat' | 'wizard';

export type Stage = 'exploring' | 'choosing' | 'applying_soon' | 'urgent';
export type TargetClarity = 'none' | 'field_only' | 'specific';
export type PrimaryBlocker =
  | 'dont_know'
  | 'low_profile'
  | 'financial'
  | 'family_pressure'
  | 'application_process';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type CareerDirection = 'no_idea' | 'some_ideas' | 'clear_goal';
export type CommitmentSignal = 'browsing' | 'researching' | 'preparing';

export type UserType = 'lost' | 'explorer' | 'planner' | 'executor';
export type NextAction = 'educate' | 'narrow' | 'execute' | 'escalate';
export type ConversionPriority = 'low' | 'medium' | 'high';

export type InfluenceSource =
  | 'self'
  | 'parents'
  | 'peers'
  | 'teachers'
  | 'social_media';

export interface CollectedData {
  language?: 'en' | 'th';
  name?: string;
  mode?: OnboardingMode;
  interests?: string[];
  stage?: Stage;
  target_clarity?: TargetClarity;
  primary_blocker?: PrimaryBlocker;
  confidence?: ConfidenceLevel;
  career_direction?: CareerDirection;
  commitment_signal?: CommitmentSignal;
  influencers?: InfluenceSource[];
  user_type?: UserType;
  next_action?: NextAction;
  conversion_priority?: ConversionPriority;
}

export interface OnboardingState {
  user_id: string;
  current_step: OnboardingStep;
  chat_history: Array<{ role: 'user' | 'assistant'; content: string }>;
  collected_data: CollectedData;
  updated_at: string;
}

export interface AssessmentExtractionResult {
  stage?: Stage;
  target_clarity?: TargetClarity;
  primary_blocker?: PrimaryBlocker;
  confidence?: ConfidenceLevel;
  career_direction?: CareerDirection;
  commitment_signal?: CommitmentSignal;
}

export function isAssessmentComplete(data: CollectedData): boolean {
  return !!(
    data.stage &&
    data.target_clarity &&
    data.primary_blocker &&
    data.confidence &&
    data.career_direction &&
    data.commitment_signal
  );
}
