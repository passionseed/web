export interface AssessmentAnswers {
  // Part 1: What Energizes You
  q1_time_flies: string[]; // Top 3 activities
  q2_energy_sources: string[]; // Top 3 energy sources
  q3_work_style: {
    indoor_outdoor: number; // 0-100 (0=Indoor, 100=Outdoor)
    structured_flexible: number; // 0=Structured, 100=Flexible
    solo_team: number; // 0=Solo, 100=Team
    hands_on_theory: number; // 0=Hands-on, 100=Theory
    routine_challenge: number; // 0=Routine, 100=Challenge
  };
  q4_subject_interests: {
    subject: string;
    love: number; // 1-5 stars (Interest)
    capable: number; // 1-5 stars (Competence)
  }[];
  q5_flow_state: {
    activity: string;
    engaging_factors: string[]; // Top 2
  };

  // Part 2: What You're Good At
  q6_strongest_skills: string[]; // Top 5
  q7_proud_moments: string[]; // Up to 3
  q8_learning_style: string[]; // Top 2
  q9_help_requests: string[]; // Select all
  q10_fast_learner: {
    is_fast_learner: boolean;
    topic?: string;
    speed?: 'bit' | 'noticeably' | 'way';
  };
  // q11_zone_activity removed as it was duplicate of q5
  q12_confidence: {
    creative: number; // 1-5 stars
    analytical: number;
    technical: number;
    people: number;
    organizational: number;
    physical: number;
  };
  q13_recognition: string;
}

export interface IkigaiProfile {
  energizers: string[];
  strengths: string[];
  values: string[];
  reality: string[]; // Constraints, resources, preferences
}

export interface DirectionVector {
  name: string;
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
  match_scores: {
    overall: number; // 0-100
    passion: number; // 0-100
    skill: number; // 0-100
  };
  exploration_steps: {
    type: 'camp' | 'study' | 'activity' | 'person' | 'project' | 'community';
    description: string;
    reason?: string;
  }[];
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
  originalDescription?: string; // To track what it was
  description?: string; // User edited description
  theoryScore: number; // 0-100
  practiceScore: number; // 0-100
  obstacle: string;
  plan: string;
}

export interface Commitment {
  agreedToViewDaily: boolean;
  duolingoMode: boolean; // Email reminders
}

export interface ActionPlan {
  selectedVectorIndex: number;
  evaluations: MilestoneEvaluation[];
  commitment: Commitment;
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
}

export type AssessmentStep =
  | 'intro'
  | 'q1' | 'q2' | 'q3' | 'q4' | 'q5' // Part 1
  | 'part2_intro'
  | 'q6' | 'q7' | 'q8' | 'q9' | 'q10' | 'q12' | 'q13' // Part 2
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
