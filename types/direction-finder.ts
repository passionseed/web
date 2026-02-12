// ==========================================
// Direction Finder Types - V2 (6 Questions)
// ==========================================

// Q1: Energy & Flow Discovery
export interface Q1FlowData {
  description: string;           // Free text (3-4 sentences) - min 20 chars
  activities: string[];          // Checkboxes: creating, helping, solving, etc.
  engagement_factors?: string;   // NEW: "What part of this activity kept you engaged?" (1 sentence)
}

// Q2: Zone Grid Item
export interface ZoneGridItem {
  domain: string;
  interest: number;     // 1-10 scale
  capability: number;   // 1-10 scale
  exposure_level?: 'school' | 'outside' | 'none'; // NEW: Reality check
}

// Q2: Zone Grid (2x2 matrix result)
export interface Q2ZoneGridData {
  items: ZoneGridItem[];  // All items with their ratings
}

// Q3: Work Style Preferences
export interface Q3WorkStyleData {
  indoor_outdoor: 'indoor' | 'outdoor' | 'neutral';
  structured_flexible: 'structured' | 'flexible' | 'neutral';
  solo_team: 'solo' | 'team' | 'neutral';
  hands_on_theory: 'hands_on' | 'theory' | 'neutral';
  steady_fast: 'steady' | 'fast' | 'neutral';
}

// Q5: Proud Moment
export interface Q5ProudData {
  story: string;          // Free text
  role_description: string; // NEW: "What part of this did you actually do?" (Initiator vs contributor)
  tags: string[];         // What made it meaningful
}

// Q6: Secret Weapon (Optional)
export interface Q6UniqueData {
  description: string;    // Free text (optional)
  skipped: boolean;       // "I can't think of anything"
}

// Main Assessment Answers Interface (V2 - 6 Questions)
export interface AssessmentAnswers {
  // Q1: Energy & Flow Discovery (Primary - 25%)
  q1_flow: Q1FlowData;

  // Q2: Zone Grid (Primary - 30%)
  q2_zone_grid: Q2ZoneGridData;

  // Q3: Work Style (Secondary - 15%)
  q3_work_style: Q3WorkStyleData;

  // Q4: Reputation (Primary - 20%) - Top 3 selections
  q4_reputation: string[];

  // Q5: Proud Moment (Secondary - 10%)
  q5_proud: Q5ProudData;

  // Q6: Secret Weapon (Bonus)
  q6_unique: Q6UniqueData;
}

// Profile Context for AI Prompt Weighting
export interface ProfileContext {
  primary_signals: {
    zone_of_genius: string[];     // Domains from Q2 with high interest + high capability
    flow_evidence: string;         // From Q1 description
    external_proof: string[];      // From Q4 reputation
    // MOVED FROM SECONDARY (Gold Signal)
    values: {
      story: string;               // From Q5
      role_description: string;    // From Q5
      drivers: string[];           // From Q5 tags
    };
    weight: number;                // 0.60
  };
  secondary_signals: {
    environment: Q3WorkStyleData;  // From Q3
    unique_edge: string;           // From Q6
    weight: number;                // 0.30
  };
  growth_edges: string[];          // Domains with high interest but low capability
  capability_traps: string[];      // Domains with low interest but high capability (AVOID)
}

// ==========================================
// Legacy Interface (V1) - For backwards compatibility
// ==========================================
export interface LegacyAssessmentAnswers {
  // Part 1: What Energizes You
  q1_time_flies: string[];
  q2_energy_sources: string[];
  q3_work_style: {
    indoor_outdoor: number;
    structured_flexible: number;
    solo_team: number;
    hands_on_theory: number;
    routine_challenge: number;
  };
  q4_subject_interests: {
    subject: string;
    love: number;
    capable: number;
  }[];
  q5_flow_state: {
    activity: string;
    engaging_factors: string[];
  };

  // Part 2: What You're Good At
  q6_strongest_skills: string[];
  q7_proud_moments: string[];
  q8_learning_style: string[];
  q9_help_requests: string[];
  q10_fast_learner: {
    is_fast_learner: boolean;
    topic?: string;
    speed?: 'bit' | 'noticeably' | 'way';
  };
  q12_confidence: {
    creative: number;
    analytical: number;
    technical: number;
    people: number;
    organizational: number;
    physical: number;
  };
  q13_recognition: string;
}

// ==========================================
// Result Types (Unchanged)
// ==========================================

export interface ProfileItem {
  name: string;
  description: string;
  insight: string;
}

export interface IkigaiProfile {
  energizers: ProfileItem[];
  strengths: ProfileItem[];
  values: ProfileItem[];
  reality: string[];
}

export interface SkillTreeLevel {
  skill_name: string;
  description: string;
  time_estimate: string;
  prerequisites?: string[];
}

export interface SkillTree {
  beginner_level: SkillTreeLevel[];
  intermediate_level: SkillTreeLevel[];
  advanced_level: SkillTreeLevel[];
}

export interface DirectionVector {
  name: string; // Keep for now, but will likely be Industry + Role
  industry: string;
  role: string;
  specialization: string; // Future potential/niche
  fit_reason: {
    interest_alignment: string;
    strength_alignment: string;
    value_alignment: string;
  };
  differentiators?: {
    main_focus: string;
    knowledge_base: string[];
    skill_tree: string[];
  };
  rarity?: 'Rare' | 'Epic' | 'Legendary' | 'Mythical';
  recommended_faculty?: string;
  match_context?: {
    passion_context: string;
    skill_context: string;
  };
  match_scores: {
    overall: number;
    passion: number;
    skill: number;
  };
  // NEW: Evidence tracking for V2
  evidence_used?: {
    q1_insight?: string;
    q2_quadrant?: string;
    q3_preferences?: string[];
    q4_validation?: string;
    q5_driver?: string;
    q6_bonus?: string;
  };
  exploration_steps: {
    type: 'camp' | 'study' | 'activity' | 'person' | 'project' | 'community';
    description: string;
    reason?: string;
  }[];
  skill_tree: SkillTree;
  first_step: string;
}

export interface RecommendedProgram {
  name: string;
  match_level: 'High' | 'Good' | 'Stretch';
  match_percentage: number;
  reason: string;
  deadline?: string;
  application_link?: string;
}

export interface MilestoneEvaluation {
  stepIndex: number;
  originalDescription?: string;
  description?: string;
  theoryScore: number;
  practiceScore: number;
  obstacle: string;
  plan: string;
}

export interface Commitment {
  agreedToViewDaily: boolean;
  duolingoMode: boolean;
}

export interface ActionPlan {
  selectedVectorIndex: number;
  evaluations: MilestoneEvaluation[];
  commitment: Commitment;
}

export interface DebugMetadata {
  modelId?: string;
  prompt?: string;
  generationTime?: number;
  engine?: string;
}

export interface DirectionFinderResult {
  profile: IkigaiProfile;
  vectors: DirectionVector[];
  programs: RecommendedProgram[];
  commitments: {
    this_week: string[];
    this_month: string[];
  };
  actionPlan?: ActionPlan;
  debugMetadata?: DebugMetadata;
}

// ==========================================
// Flow Types (Updated for V2)
// ==========================================

export type AssessmentStep =
  | 'intro'
  | 'q1'  // Energy & Flow Discovery
  | 'q2'  // Zone Grid
  | 'q3'  // Work Style
  | 'q4'  // Reputation
  | 'q5'  // Proud Moment
  | 'q6'  // Secret Weapon
  | 'ai_intro'
  | 'ai_chat'
  | 'results'
  | 'milestone_eval'
  | 'commitment';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ==========================================
// Helper Types
// ==========================================

// Redirect result for Q1 validation
export interface RedirectResult {
  shouldRedirect: boolean;
  path?: string;
  message?: string;
}

// Zone quadrant classification
export type ZoneQuadrant = 'genius' | 'growth' | 'trap' | 'ignore';

// Helper to classify a grid item into quadrant
export function classifyZoneItem(item: ZoneGridItem): ZoneQuadrant {
  const { interest, capability } = item;
  if (interest >= 7 && capability >= 7) return 'genius';
  if (interest >= 7 && capability < 5) return 'growth';
  if (interest < 4 && capability >= 7) return 'trap';
  return 'ignore';
}

// Helper to extract domains by quadrant
export function extractByQuadrant(
  items: ZoneGridItem[],
  quadrant: ZoneQuadrant
): string[] {
  return items
    .filter(item => classifyZoneItem(item) === quadrant)
    .map(item => item.domain);
}
