/**
 * Types for the SHIFT rounds staff tools (web admin). They mirror the admin
 * RPC contract in the SHIFT rounds build spec, section 3.4. Shapes the spec
 * leaves open are documented on each type; the normalizers in api.ts accept
 * both a bare array and a `{ <key>: [...] }` object so small contract drift
 * does not break the pages.
 */

export type Track = "high_school" | "university";
export type RoundStatus = "draft" | "published" | "archived";
export type RoundPhase = "upcoming" | "active" | "review" | "finished";
export type JoinMode = "open" | "invite";
export type BetaGroup = "alumni" | "new";
export type EntryOutcome = "in_progress" | "certified" | "not_eligible";
export type RoundRole = "staff" | "mentor";

export type EvidenceType =
  | "contact"
  | "interview"
  | "problem_statement"
  | "mvp"
  | "tester"
  | "change"
  | "demo_post";

export type EvidenceStatus = "submitted" | "rejected" | "accepted" | "withdrawn";

export type RejectReasonCode =
  | "not_real_person"
  | "duplicate"
  | "missing_detail"
  | "wrong_mission"
  | "privacy"
  | "link_broken"
  | "other";

export type MissionKey =
  | "first_contact"
  | "interviews_problem"
  | "mvp"
  | "testers"
  | "change"
  | "demo_post";

export type ErrorCategory =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "unavailable"
  | "retryable";

export interface AdminError {
  code: string;
  category: ErrorCategory;
  field?: string | null;
  retry_after?: number | null;
  details?: Record<string, unknown>;
  request_id?: string;
  /** Developer-facing detail for unexpected failures; never shown raw to students. */
  message?: string;
}

export type AdminResult<T> =
  | { ok: true; data: T; request_id?: string }
  | { ok: false; error: AdminError };

/** Policy columns of `shift_rounds` (spec 2.2). */
export interface RoundPolicy {
  number: number;
  title_th: string;
  title_en: string;
  brief_th: string;
  brief_en: string;
  tracks_open: Track[];
  starts_at: string;
  duration_days: number;
  review_window_hours: number;
  join_cutoff_day: number;
  nudge_local_time: string;
  rate_limit_per_hour: number;
  grace_minutes: number;
  squad_size: number;
  retention_months: number;
  audio_retention_days: number;
  join_mode: JoinMode;
  mentor_led: boolean;
  discord_url: string | null;
}

export interface ShiftRound extends RoundPolicy {
  id: string;
  closes_at: string;
  review_ends_at: string;
  status: RoundStatus;
  extended_days: number;
  created_at?: string;
  updated_at?: string;
}

/** Row of `shift_round_admin_rounds`. Counts are optional until lane A confirms names. */
export interface AdminRoundListItem extends ShiftRound {
  /** duration_days + extended_days (lane A keeps duration_days as created). */
  effective_days?: number;
  /** Current ICT day number of the round. */
  day?: number;
  phase?: RoundPhase;
  entrants?: number;
  pending_review?: number;
  /** Caller's access level for this round. */
  my_role?: "global" | RoundRole;
}

export interface MissionPart {
  type: EvidenceType;
  have: number;
  need: number;
}

export interface MissionProgress {
  key: MissionKey;
  n: number;
  complete: boolean;
  parts: MissionPart[];
}

export interface MissionCounts {
  missions: MissionProgress[];
  missions_complete: number;
  people_talked_to: number;
  eligible: boolean;
}

/** Row of `shift_round_admin_entries`. */
export interface AdminEntry {
  id: string;
  user_id: string;
  handle: string;
  email?: string | null;
  track: Track;
  beta_group: BetaGroup | null;
  joined_at: string;
  joined_day: number;
  outcome: EntryOutcome;
  squad_id: string | null;
  squad_name?: string | null;
  icebreaker_question?: number | null;
  icebreaker_text?: string | null;
  icebreaker_answer?: string | null;
  missions_complete: number;
  missions?: MissionCounts;
  last_log_at: string | null;
  active_days?: number;
  has_certificate?: boolean;
  guardian_required?: boolean;
  rejected_count?: number;
}

export interface AdminSquad {
  id: string;
  name: string;
  mentor_user_id: string | null;
  mentor_display_name?: string | null;
  discord_url: string | null;
  member_entry_ids?: string[];
}

export interface AdminEntriesData {
  entries: AdminEntry[];
  /** Every squad of the round, including empty ones. */
  squads: AdminSquad[];
  squad_size?: number;
}

export interface EvidenceMedia {
  kind: "photo" | "audio";
  path: string;
  duration_ms?: number | null;
  purged_at?: string | null;
  /** Lane A returns a boolean instead of purged_at. */
  purged?: boolean;
}

export interface EvidenceSource {
  id: string;
  type: EvidenceType;
  status: EvidenceStatus;
  who_label?: string | null;
  key_point?: string | null;
}

/** Evidence row as returned by `review_queue` and `entry_detail`. */
export interface AdminEvidence {
  id: string;
  entry_id: string;
  handle?: string;
  squad_id?: string | null;
  squad_name?: string | null;
  type: EvidenceType;
  status: EvidenceStatus;
  payload: Record<string, unknown>;
  who_key?: string | null;
  submitted_at: string;
  counted?: boolean;
  after_close?: boolean;
  status_reason_code?: RejectReasonCode | null;
  status_note?: string | null;
  status_changed_at?: string | null;
  reviewed_at?: string | null;
  media: EvidenceMedia[];
  source?: EvidenceSource | null;
  source_evidence_id?: string | null;
}

export interface ReviewFilter {
  status?: EvidenceStatus | null;
  type?: EvidenceType | null;
  squad_id?: string | null;
  unreviewed_only?: boolean;
  sample?: boolean;
}

export interface AdminCheckin {
  checkpoint: "join" | "midpoint" | "close";
  answers: Record<string, unknown>;
  submitted_at: string;
}

export interface AdminEvent {
  id?: number | string;
  name: string;
  created_at: string;
  actor_id?: string | null;
  props?: Record<string, unknown>;
}

export interface AdminEntryDetail {
  entry: AdminEntry;
  missions: MissionCounts;
  evidence: AdminEvidence[];
  checkins: AdminCheckin[];
  events: AdminEvent[];
}

export interface RejectResult {
  missions: MissionCounts;
  invalidated_changes: string[];
  /** Mission keys that were complete before and are not after. */
  dropped?: MissionKey[];
}

export interface SummaryContent {
  title: string;
  description: string;
  demo_url: string | null;
  public_counts: Record<string, boolean>;
}

export type SummaryStatus = "pending" | "approved" | "rejected" | "superseded" | "taken_down";

export interface AdminSummaryRevision extends SummaryContent {
  id: string;
  entry_id: string;
  handle?: string;
  revision: number;
  status: SummaryStatus;
  created_at: string;
  decision_reason?: string | null;
  /** The currently approved revision of the same entry, for the diff. */
  public_revision?: (SummaryContent & { revision?: number }) | null;
}

export interface AdminCertificate {
  id: string;
  public_id: string;
  entry_id: string | null;
  handle?: string | null;
  status: "issued" | "revoked";
  issued_at: string;
  revoked_at: string | null;
  revoke_reason?: "staff" | "holder_deleted" | null;
  revoke_note?: string | null;
  tombstoned_at?: string | null;
  tombstone?: boolean;
  render_version: number;
  verify_url?: string | null;
}

export interface JobRun {
  id?: string;
  job: string;
  started_at: string;
  finished_at?: string | null;
  status: "running" | "ok" | "failed";
  due_count?: number | null;
  processed_count?: number | null;
  error?: string | null;
}

export interface AdminCertificatesData {
  certificates: AdminCertificate[];
  /** Count of entries per outcome. */
  outcome_counts: Record<string, number>;
  last_issue_run?: JobRun | null;
}

export interface JobHealth {
  job: string;
  last_run?: JobRun | null;
  last_ok_at?: string | null;
  failures_7d?: number;
}

export interface AdminJobsData {
  jobs: JobHealth[];
  failures: JobRun[];
  deletion_queue?: { queued: number; failed: number } | null;
}

/** `shift_round_admin_dashboard` (spec 6.4 dashboard list). Every field optional until lane A confirms. */
export interface AdminDashboard {
  entrants_total?: number;
  entrants_by_track?: Record<string, number>;
  entrants_by_group?: Record<string, number>;
  joins_per_day?: { date: string; count: number }[];
  logs_per_day?: { date: string; type: EvidenceType; count: number }[];
  pending_review?: number;
  rejection_rate?: number | null;
  mission_distribution?: number[] | Record<string, number>;
  active4_entrants?: number;
  certificates?: { issued?: number; revoked?: number };
  share_visits?: number;
  review_minutes_per_entrant?: number | null;
  next_round_joins?: number;
  non_alumni_4plus?: number;
  jobs?: JobHealth[];
}

export interface RoleGrant {
  id?: string;
  user_id: string;
  round_id: string | null;
  role: RoundRole;
  email?: string | null;
  display_name?: string | null;
}

export interface AppConfigRow {
  key: string;
  value: unknown;
  updated_at?: string | null;
}

export interface EmergencyMessage {
  th: string;
  en: string;
  url?: string | null;
}
