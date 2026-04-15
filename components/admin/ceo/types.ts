export type FunnelEvent = 
  | 'hackathon_signup'
  | 'app_register'
  | 'onboarding_start'
  | 'onboarding_complete'
  | 'portfolio_start'
  | 'portfolio_upload'
  | 'portfolio_complete'
  | 'grading_request'
  | 'grading_complete'
  | 'payment_intent'
  | 'payment_convert';

export type AcquisitionChannel =
  | 'hackathon'
  | 'organic'
  | 'referral'
  | 'social_media'
  | 'paid_ads'
  | 'camp'
  | 'discord';

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';
export type AlertType = 
  | 'funnel_drop'
  | 'retention_drop'
  | 'conversion_spike'
  | 'churn_spike'
  | 'revenue_milestone'
  | 'users_stuck'
  | 'system_error';

export interface FunnelMetrics {
  event_name: string;
  event_count: number;
  unique_users: number;
}

export interface CohortData {
  cohort_date: string;
  total_users: number;
  retention: { week: number; users: number; rate: number }[];
}

export interface DashboardAlert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  metric_value?: number;
  metric_threshold?: number;
  affected_users?: number;
  is_resolved: boolean;
  created_at: string;
}

export interface AIAgentStatus {
  agent_name: string;
  status: 'running' | 'completed' | 'failed' | 'alert_triggered';
  last_run: string;
  alerts_generated: number;
  is_healthy: boolean;
}

export interface ContentSuggestion {
  id: string;
  suggested_date: string;
  platform: string;
  content_type: string;
  title: string;
  description?: string;
  suggested_copy?: string;
  ai_reasoning?: string;
  source_signal?: string;
  is_approved: boolean;
  is_posted: boolean;
}

export interface WeeklyRetro {
  id: string;
  week_ending: string;
  wins: string[];
  blockers: string[];
  action_items: { task: string; owner: string; due_date: string }[];
  metrics_snapshot: Record<string, number>;
  team_notes?: string;
}

export interface NorthStarMetrics {
  mrr: number;
  mrr_change: number;
  paying_customers: number;
  customers_change: number;
  week4_retention: number;
  retention_change: number;
  cac: number;
  cac_change: number;
  hackathon_signups: number;
  app_adoption: number;
  portfolio_completions: number;
}

export interface FunnelStage {
  name: string;
  count: number;
  previous_count: number;
  conversion_rate: number;
  is_target_met: boolean;
}
