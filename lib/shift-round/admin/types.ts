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
  | "ideas"
  | "interview"
  | "problem_statement"
  | "mvp"
  | "tester"
  | "change"
  | "demo_post"
  | "daily";

export type EvidenceStatus = "submitted" | "rejected" | "accepted" | "withdrawn";

export type RejectReasonCode =
  | "not_real_person"
  | "duplicate"
  | "missing_detail"
  | "wrong_mission"
  | "privacy"
  | "link_broken"
  | "other";

/**
 * Mission keys come from the round's `missions` config (v2 spec 2.1), so any
 * string is possible. The SHIFT default keys have copy (KnownMissionKey).
 */
export type MissionKey = string;
export type { KnownMissionKey } from "@/lib/shift-round/certificate/missions";

/** One part of a mission in the round config (v2 spec 2.1 `valid_missions`). */
export interface MissionPartConfig {
  type: EvidenceType;
  need: number;
  /** Count distinct people (`who_key`); only for interview and tester. */
  distinct?: boolean;
}

/** One mission of `shift_rounds.missions`. */
export interface MissionConfig {
  key: MissionKey;
  parts: MissionPartConfig[];
  title_th?: string | null;
  title_en?: string | null;
}

export type AttendanceStatus = "present" | "makeup" | "absent";

export interface AttendanceMark {
  day: number;
  status: AttendanceStatus;
}

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
  /** Round days with a live mentor session (v2 spec 2.1), each 1..duration_days. */
  session_days: number[];
  /** Session start/end, Bangkok wall clock `HH:MM`. */
  session_start: string;
  session_end: string;
  /** `shift_curriculum.round` this round's day plan is read from (soft reference). */
  curriculum_key: string | null;
  /** Accepted, paid applications of this cohort (`shift_applications.cohort`) may join (D6). */
  application_cohort: string | null;
}

export interface ShiftRound extends RoundPolicy {
  id: string;
  closes_at: string;
  review_ends_at: string;
  status: RoundStatus;
  extended_days: number;
  /** Read-only here; null/absent on databases before v2. */
  missions?: MissionConfig[] | null;
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
  /** 1-based position in the round's missions config. */
  n: number;
  complete: boolean;
  parts: MissionPart[];
  title_th?: string | null;
  title_en?: string | null;
}

/** Step 8: days with at least one counted log (v2 spec 2.3). */
export interface DailyHabit {
  days: number;
  /** = duration_days */
  need: number;
  today_logged: boolean;
}

/** Step 9: session attendance (v2 spec 2.3). */
export interface SessionHabit {
  /** Present or make-up on session days. */
  attended: number;
  /** Session days whose session_end (Bangkok) has passed. */
  held: number;
  /** Number of session days in the round. */
  total: number;
}

/**
 * `mission_counts(entry_id)` (v2 spec 2.3). The habit and total fields are
 * optional so older payloads still parse; normalizeMissionCounts fills them.
 */
export interface MissionCounts {
  missions: MissionProgress[];
  missions_complete: number;
  missions_total?: number;
  people_talked_to: number;
  eligible: boolean;
  daily?: DailyHabit | null;
  sessions?: SessionHabit | null;
}

/** Row of `shift_round_admin_steps` (v2 spec 2.8): one per entry. */
export interface AdminStepsRow {
  entry_id: string;
  user_id: string;
  handle: string;
  /** Only when staff may see it. Never exported. */
  display_name?: string | null;
  squad_id: string | null;
  squad_name: string | null;
  joined_day: number;
  last_log_at: string | null;
  counts: MissionCounts;
  attendance: AttendanceMark[];
}

export interface AdminStepsData {
  rows: AdminStepsRow[];
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

/**
 * Where a role comes from: a shift_round_roles grant (revocable here), or the web admin
 * role (user_roles admin = global SHIFT staff, decision 2026-10-13; managed on Users).
 */
export type RoleSource = "shift_round_roles" | "web_admin";

export interface RoleGrant {
  id?: string;
  user_id: string;
  round_id: string | null;
  role: RoundRole;
  email?: string | null;
  display_name?: string | null;
  source?: RoleSource;
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
