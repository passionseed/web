// Educational pathway types for university selection and AI roadmap system

export interface University {
  id: string;
  name: string;
  name_th?: string;
  name_en?: string;
  short_name?: string;
  short_name_th?: string;
  short_name_en?: string;
  category?: string;
  is_international?: boolean;
  university_name_th?: string;
  university_name_en?: string;
  country?: string;
  state?: string;
  city?: string;
  website_url?: string;
  logo_url?: string;
  description?: string;
  admission_requirements?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserUniversityTarget {
  id: string;
  user_id: string;
  university_id: string;
  university?: University; // Joined data
  priority_rank: 1 | 2 | 3; // Top 3 choices
  created_at: string;
  updated_at: string;
}

export interface UserInterestPriority {
  id: string;
  user_id: string;
  interest_name: string;
  priority_rank: number; // 1 = highest priority
  created_at: string;
  updated_at: string;
}

export interface SimpleMilestone {
  title: string;
  description: string;
  target_timeframe: string; // "End of Year 1", "Summer Year 2", etc.
  category: "academic" | "skill" | "application" | "experience";
  importance: "critical" | "important" | "beneficial";
}

export interface SimpleRoadmap {
  overview: {
    title: string; // "Path to [University] with [Interest] Focus"
    timeframe: "3 years";
    vision: string;
    primary_university: string;
    primary_interest: string;
  };
  milestones: SimpleMilestone[];
}

export interface StudentProfile {
  interests: string[];
  strengths: string[];
  preferredLocation: string;
  campusVibe: string;
  extracurriculars: string[];
  careerAspirations: string[];
  industryPreference: string;
}

export interface RecommendedUniversity {
  universityName: string;
  faculty: string;
  major: string;
  matchScore: number;
  reasoning: string;
}

export interface AIRoadmap {
  id: string;
  user_id: string;
  vision_statement: string;
  top_university_id?: string;
  top_university?: University; // Joined data
  primary_interest: string;
  roadmap_data: SimpleRoadmap;
  created_at: string;
  updated_at: string;
}

// Props for components
export interface UniversityPickerProps {
  universities: University[];
  selectedUniversities: University[];
  onSelectionChange: (universities: University[]) => void;
  maxSelections: 3;
}

export interface InterestPriorityProps {
  interests: UserInterestPriority[];
  onAdd: (interest: string) => void;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export interface EducationalFlowData {
  vision: string;
  selectedUniversities: University[];
  interests: string[]; // Ordered by priority
}

// API response types
export interface UniversitiesResponse {
  universities: University[];
  total: number;
}

export interface RoadmapGenerationRequest {
  vision_statement: string;
  top_university: University;
  primary_interest: string;
  secondary_interests: string[];
}

export interface RoadmapGenerationResponse {
  roadmap: SimpleRoadmap;
  success: boolean;
  error?: string;
}

// University Example Journey Maps
export interface UniversityExampleMap {
  id: string;
  university_id: string;
  title: string;
  description?: string;
  target_audience?: string;
  example_data: any; // JSON structure matching journey map format
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// AI Agents Archive
export interface AIAgent {
  id: string;
  name: string;
  description?: string;
  use_case: string;
  category: string;
  system_prompt: string;
  user_prompt_template?: string;
  model_config: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    [key: string]: any;
  };
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  last_used_at?: string;
}