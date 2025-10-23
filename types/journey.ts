// TypeScript type definitions for the journey map system
// Based on the personal journey tracking and project milestone features

// ========================================
// ENUMS
// ========================================

export type ProjectType =
  | "learning"
  | "career"
  | "personal"
  | "creative"
  | "research"
  | "community";

export type ProjectStatus =
  | "not_started"
  | "planning"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "archived";

export type MilestoneStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "completed"
  | "skipped";

export type ReflectionType =
  | "daily"
  | "weekly"
  | "monthly"
  | "milestone"
  | "project";

export type ActivityType =
  | "study"
  | "practice"
  | "meeting"
  | "research"
  | "creation"
  | "review"
  | "other";

export type MoodLevel =
  | "very_low"
  | "low"
  | "neutral"
  | "good"
  | "excellent";

export type EnergyLevel =
  | "depleted"
  | "low"
  | "moderate"
  | "high"
  | "peak";

export type FocusLevel =
  | "scattered"
  | "distracted"
  | "moderate"
  | "focused"
  | "flow";

export type ProgressConfidence =
  | "very_uncertain"
  | "uncertain"
  | "neutral"
  | "confident"
  | "very_confident";

// ========================================
// CORE TABLES
// ========================================

export interface JourneyProject {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  project_type: ProjectType;
  status: ProjectStatus;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  priority: number;
  tags: string[] | null;
  color: string | null;
  cover_image_url: string | null;
  cover_image_blurhash: string | null;
  cover_image_key: string | null;
  progress_percentage: number;
  is_public: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  completed_at: string | null;
  display_order: number;
  position: { x: number; y: number } | null;
  style: NodeStyle | null;
  dependencies: string[] | null;
  tags: string[] | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface MilestonePath {
  id: string;
  source_milestone_id: string;
  destination_milestone_id: string;
  path_type: "prerequisite" | "sequence" | "optional";
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface MilestoneJournal {
  id: string;
  milestone_id: string;
  user_id: string;
  entry_date: string;
  content: string;
  mood: MoodLevel | null;
  progress_notes: string | null;
  blockers: string | null;
  learnings: string | null;
  next_steps: string | null;
  attachments: string[] | null;
  time_spent_minutes: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectReflection {
  id: string;
  project_id: string;
  user_id: string;
  reflection_type: ReflectionType;
  reflection_date: string;
  title: string | null;
  content: string;
  mood: MoodLevel | null;
  energy_level: EnergyLevel | null;
  focus_level: FocusLevel | null;
  progress_confidence: ProgressConfidence | null;
  wins: string[] | null;
  challenges: string[] | null;
  learnings: string[] | null;
  next_period_goals: string[] | null;
  gratitude: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface DailyActivity {
  id: string;
  user_id: string;
  activity_date: string;
  project_id: string | null;
  milestone_id: string | null;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  mood_before: MoodLevel | null;
  mood_after: MoodLevel | null;
  energy_before: EnergyLevel | null;
  energy_after: EnergyLevel | null;
  focus_quality: FocusLevel | null;
  productivity_rating: number | null;
  notes: string | null;
  tags: string[] | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

// ========================================
// VISUAL AND STYLING TYPES
// ========================================

export interface NodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted";
  textColor?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold" | "semibold";
  iconUrl?: string;
  iconColor?: string;
  shape?: "circle" | "rectangle" | "rounded" | "hexagon" | "diamond";
  size?: "small" | "medium" | "large" | "custom";
  customWidth?: number;
  customHeight?: number;
  opacity?: number;
  shadow?: boolean;
  glow?: boolean;
  glowColor?: string;
}

export interface NodePosition {
  x: number;
  y: number;
  z?: number;
}

export interface PathStyle {
  color?: string;
  width?: number;
  style?: "solid" | "dashed" | "dotted" | "animated";
  animated?: boolean;
  label?: string;
  showArrow?: boolean;
}

// ========================================
// COMPOSITE AND HELPER TYPES
// ========================================

export interface ProjectWithMilestones extends JourneyProject {
  milestones: ProjectMilestone[];
  milestone_count?: number;
  completed_milestone_count?: number;
  reflection_count?: number;
}

export interface MilestoneWithJournals extends ProjectMilestone {
  journals: MilestoneJournal[];
  journal_count?: number;
  total_time_spent?: number;
}

export interface MilestoneWithPaths extends ProjectMilestone {
  paths_source: MilestonePath[];
  paths_destination: MilestonePath[];
  dependencies_resolved?: boolean;
}

export interface ProjectWithReflections extends JourneyProject {
  reflections: ProjectReflection[];
  latest_reflection?: ProjectReflection;
}

export interface DailyActivitySummary {
  date: string;
  activities: DailyActivity[];
  total_duration_minutes: number;
  activity_count: number;
  mood_average: number | null;
  energy_average: number | null;
  focus_average: number | null;
  productivity_average: number | null;
  projects_worked_on: string[];
  milestones_worked_on: string[];
}

export interface WeeklyProgress {
  week_start: string;
  week_end: string;
  projects_active: number;
  milestones_completed: number;
  total_hours: number;
  daily_summaries: DailyActivitySummary[];
  mood_trend: number[] | null;
  energy_trend: number[] | null;
  top_activities: ActivityType[];
}

export interface MonthlyInsights {
  month: string;
  year: number;
  projects_started: number;
  projects_completed: number;
  milestones_completed: number;
  total_hours: number;
  reflections_count: number;
  average_mood: number | null;
  average_energy: number | null;
  average_focus: number | null;
  most_productive_days: string[];
  top_learnings: string[];
}

// ========================================
// CREATE/UPDATE TYPES
// ========================================

export interface ProjectCreateData {
  title: string;
  description?: string;
  project_type: ProjectType;
  status?: ProjectStatus;
  start_date?: string;
  target_end_date?: string;
  priority?: number;
  tags?: string[];
  color?: string;
  is_public?: boolean;
  metadata?: Record<string, any>;
}

export interface ProjectUpdateData {
  title?: string;
  description?: string;
  project_type?: ProjectType;
  status?: ProjectStatus;
  start_date?: string;
  target_end_date?: string;
  actual_end_date?: string;
  priority?: number;
  tags?: string[];
  color?: string;
  cover_image_url?: string;
  cover_image_blurhash?: string;
  cover_image_key?: string;
  progress_percentage?: number;
  is_public?: boolean;
  metadata?: Record<string, any>;
}

export interface MilestoneCreateData {
  project_id: string;
  title: string;
  description?: string;
  status?: MilestoneStatus;
  estimated_hours?: number;
  due_date?: string;
  display_order?: number;
  position?: NodePosition;
  style?: NodeStyle;
  dependencies?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface MilestoneUpdateData {
  title?: string;
  description?: string;
  status?: MilestoneStatus;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  completed_at?: string;
  display_order?: number;
  position?: NodePosition;
  style?: NodeStyle;
  dependencies?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface JournalCreateData {
  milestone_id: string;
  entry_date?: string;
  content: string;
  mood?: MoodLevel;
  progress_notes?: string;
  blockers?: string;
  learnings?: string;
  next_steps?: string;
  attachments?: string[];
  time_spent_minutes?: number;
  metadata?: Record<string, any>;
}

export interface JournalUpdateData {
  entry_date?: string;
  content?: string;
  mood?: MoodLevel;
  progress_notes?: string;
  blockers?: string;
  learnings?: string;
  next_steps?: string;
  attachments?: string[];
  time_spent_minutes?: number;
  metadata?: Record<string, any>;
}

export interface ReflectionCreateData {
  project_id: string;
  reflection_type: ReflectionType;
  reflection_date?: string;
  title?: string;
  content: string;
  mood?: MoodLevel;
  energy_level?: EnergyLevel;
  focus_level?: FocusLevel;
  progress_confidence?: ProgressConfidence;
  wins?: string[];
  challenges?: string[];
  learnings?: string[];
  next_period_goals?: string[];
  gratitude?: string;
  metadata?: Record<string, any>;
}

export interface ReflectionUpdateData {
  reflection_type?: ReflectionType;
  reflection_date?: string;
  title?: string;
  content?: string;
  mood?: MoodLevel;
  energy_level?: EnergyLevel;
  focus_level?: FocusLevel;
  progress_confidence?: ProgressConfidence;
  wins?: string[];
  challenges?: string[];
  learnings?: string[];
  next_period_goals?: string[];
  gratitude?: string;
  metadata?: Record<string, any>;
}

export interface ActivityCreateData {
  activity_date?: string;
  project_id?: string;
  milestone_id?: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  duration_minutes?: number;
  mood_before?: MoodLevel;
  mood_after?: MoodLevel;
  energy_before?: EnergyLevel;
  energy_after?: EnergyLevel;
  focus_quality?: FocusLevel;
  productivity_rating?: number;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ActivityUpdateData {
  activity_date?: string;
  project_id?: string;
  milestone_id?: string;
  activity_type?: ActivityType;
  title?: string;
  description?: string;
  duration_minutes?: number;
  mood_before?: MoodLevel;
  mood_after?: MoodLevel;
  energy_before?: EnergyLevel;
  energy_after?: EnergyLevel;
  focus_quality?: FocusLevel;
  productivity_rating?: number;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// ========================================
// VISUALIZATION TYPES
// ========================================

export interface JourneyMapVisualization {
  project: JourneyProject;
  nodes: VisualMilestoneNode[];
  edges: VisualMilestonePath[];
  metadata: {
    total_milestones: number;
    completed_milestones: number;
    in_progress_milestones: number;
    blocked_milestones: number;
    estimated_total_hours: number;
    actual_total_hours: number;
  };
}

export interface VisualMilestoneNode {
  id: string;
  milestone: ProjectMilestone;
  position: NodePosition;
  style: NodeStyle;
  status: MilestoneStatus;
  isUnlocked: boolean;
  isCompleted: boolean;
  hasJournals: boolean;
  journalCount: number;
  progress: number;
}

export interface VisualMilestonePath {
  id: string;
  path: MilestonePath;
  source: string;
  target: string;
  style: PathStyle;
  pathType: "prerequisite" | "sequence" | "optional";
}

// ========================================
// ANALYTICS AND INSIGHTS TYPES
// ========================================

export interface ProductivityMetrics {
  period: "day" | "week" | "month" | "year";
  period_start: string;
  period_end: string;
  total_activities: number;
  total_hours: number;
  average_daily_hours: number;
  most_productive_activity_type: ActivityType | null;
  mood_distribution: Record<MoodLevel, number>;
  energy_distribution: Record<EnergyLevel, number>;
  focus_distribution: Record<FocusLevel, number>;
  productivity_score: number;
  consistency_score: number;
  active_days: number;
  total_days: number;
}

export interface ProjectProgress {
  project: JourneyProject;
  milestones_total: number;
  milestones_completed: number;
  milestones_in_progress: number;
  milestones_blocked: number;
  milestones_not_started: number;
  estimated_hours_total: number;
  actual_hours_total: number;
  estimated_completion_date: string | null;
  days_until_target: number | null;
  is_on_track: boolean;
  velocity_milestones_per_week: number | null;
  recent_activity: DailyActivity[];
  recent_reflections: ProjectReflection[];
}

export interface LearningInsights {
  period: string;
  total_learnings: number;
  learnings_by_project: Record<string, string[]>;
  learnings_by_milestone: Record<string, string[]>;
  common_themes: string[];
  skill_tags: Record<string, number>;
  growth_areas: string[];
}

export interface JourneyTimeline {
  user_id: string;
  start_date: string;
  end_date: string;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: "project_start" | "project_complete" | "milestone_complete" | "reflection" | "activity" | "journal";
  title: string;
  description: string | null;
  project_id: string | null;
  milestone_id: string | null;
  metadata: Record<string, any> | null;
}

// ========================================
// FILTER AND QUERY TYPES
// ========================================

export interface ProjectFilters {
  status?: ProjectStatus[];
  project_type?: ProjectType[];
  tags?: string[];
  is_public?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
  priority_min?: number;
  priority_max?: number;
}

export interface MilestoneFilters {
  project_id?: string;
  status?: MilestoneStatus[];
  tags?: string[];
  due_date_range?: {
    start: string;
    end: string;
  };
  has_dependencies?: boolean;
  is_blocked?: boolean;
}

export interface ReflectionFilters {
  project_id?: string;
  reflection_type?: ReflectionType[];
  date_range?: {
    start: string;
    end: string;
  };
  mood?: MoodLevel[];
  energy_level?: EnergyLevel[];
  focus_level?: FocusLevel[];
}

export interface ActivityFilters {
  project_id?: string;
  milestone_id?: string;
  activity_type?: ActivityType[];
  date_range?: {
    start: string;
    end: string;
  };
  tags?: string[];
  min_duration?: number;
  max_duration?: number;
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface JourneyDashboard {
  user_id: string;
  active_projects: ProjectWithMilestones[];
  recent_activities: DailyActivity[];
  upcoming_milestones: ProjectMilestone[];
  overdue_milestones: ProjectMilestone[];
  recent_reflections: ProjectReflection[];
  weekly_summary: WeeklyProgress;
  productivity_metrics: ProductivityMetrics;
  current_streak_days: number;
  longest_streak_days: number;
  total_hours_tracked: number;
  total_milestones_completed: number;
}

export interface ProjectDetails {
  project: JourneyProject;
  milestones: MilestoneWithPaths[];
  reflections: ProjectReflection[];
  activities: DailyActivity[];
  progress: ProjectProgress;
  timeline: TimelineEvent[];
  insights: LearningInsights;
}

export interface MilestoneDetails {
  milestone: ProjectMilestone;
  journals: MilestoneJournal[];
  activities: DailyActivity[];
  dependencies: ProjectMilestone[];
  dependents: ProjectMilestone[];
  total_time_spent: number;
  completion_percentage: number;
}
