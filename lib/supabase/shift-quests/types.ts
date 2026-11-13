/**
 * Shapes shared by the SHIFT High Island web prototype (/shift/island).
 *
 * Client-safe: no server imports. The JSON shapes mirror what the
 * public.shift_quest_* functions return (migrations 2026111109*); the
 * database stays the only place where rules live.
 */
import type { Session } from "@/bot/src/quests/api";
import type { CanvasLinkState } from "@/lib/shift-island/quest-canvas";

import type { CharacterStats, IslandConsent, IslandNews } from "./playerTypes";

export type { Session as QuestSession } from "@/bot/src/quests/api";

export type ProjectRoute = "software" | "creative" | "service" | "other";
export const PROJECT_ROUTES: readonly ProjectRoute[] = ["software", "creative", "service", "other"];

export type QuestState =
  | "active"
  | "paused"
  | "submitted"
  | "clarification"
  | "approved"
  | "declined"
  | "appealed"
  | "archived";

/** Caps copied from the SQL (__check_len / __check_url). UI shows counters against these; actions enforce them. */
export const TEXT_LIMITS = {
  proof: 2000,
  reflection: 2000,
  artifactUrl: 500,
  note: 300,
  projectName: 80,
  ambition: 500,
  helpSummary: 1000,
  proposeTitle: 80,
  proposeWhy: 1000,
  proposeGoal: 1000,
  proposeCriteria: 1000,
  proposeNextStep: 500,
} as const;

export interface InFlight {
  instance_id: string;
  state: QuestState;
  version: number;
  mine: boolean;
  owner: string | null;
}

export interface IslandProject {
  id: string;
  name: string;
  route: ProjectRoute;
  slot: number;
  stage: number;
  milestones_done: number[];
  next_milestone: number | null;
  show_name: boolean;
  name_visible: boolean;
}
export interface IslandMilestone {
  milestone: number;
  template_id: string;
  title: string;
  purpose: string;
  evidence_criteria: string;
  reflection_prompt: string;
  done: boolean;
  in_flight: InFlight | null;
}
export interface SeasonUnlock {
  id: string;
  label: string;
  milestone_count: number;
  deadline: string;
  earned: boolean;
  expired?: boolean;
}
export interface SeasonGoal {
  milestone: number;
  target: number;
  count: number;
  deadline: string;
  unlock: string | null;
  reached: boolean;
  reached_at?: string | null;
}
export interface SeasonView {
  id?: string;
  name: string;
  starts_on?: string;
  ends_on?: string;
  demo_day: string;
  days_to_demo: number;
  table_bar: number;
  stage_bar: number;
  stage_at_cutoff: number;
  season_milestones?: number[];
  qualifies: "stage" | "table" | null;
  stage_with_pending?: number;
  qualifies_with_pending?: "stage" | "table" | null;
  goal: SeasonGoal | null;
  unlocks: SeasonUnlock[];
}
/** shift_quest_island(actor) */
export interface IslandView {
  project: IslandProject | null;
  milestones: IslandMilestone[];
  taps_today: number;
  resting: boolean;
  season: SeasonView | null;
}
/** One plot of shift_quest_island_map (same fields as IslandPlot in bot/src/quests/island/render.ts). */
export interface IslandMapPlot {
  slot: number;
  stage: number;
  visitor: boolean;
  key: boolean;
  helper: boolean;
  lantern: boolean;
  name: string | null;
  mine: boolean;
  plain: boolean;
  /** Roots level 1..3 (shift_quest_island_roots, schema 10, merged by slot); absent is 0. Never on a plain plot. */
  roots?: number;
}
/** shift_quest_island_map(actor) */
export interface IslandMapData {
  plots: IslandMapPlot[];
  goal: (SeasonGoal & { reached_at?: string | null }) | null;
  season: { name: string; demo_day: string; days_to_demo: number } | null;
}

export interface QuestMine {
  instance_id: string;
  state: QuestState;
  version: number;
  updated_at: string;
  latest_submission: { revision: number; status: string; created_at: string } | null;
  latest_review: {
    outcome: "approved" | "clarification" | "declined" | string;
    feedback: string | null;
    created_at: string;
  } | null;
}
export interface BoardMain {
  milestone: number;
  template_id: string;
  slug: string;
  title: string;
  purpose: string;
  evidence_criteria: string;
  reflection_prompt: string;
  done: boolean;
  in_flight: InFlight | null;
  mine: QuestMine | null;
}
export interface BoardSide {
  template_id: string;
  slug: string;
  title: string;
  purpose: string;
  examples: string;
  evidence_criteria: string;
  reflection_prompt: string;
  route_keys: ProjectRoute[] | null;
  route_match: boolean;
  branch_of: number | null;
  requires_milestones: number[];
  requires_slugs: string[];
  icon: string | null;
  repeatable: boolean;
  sort_order: number;
  locked: boolean;
  missing_milestones: number[];
  missing_slugs: string[];
  approved: boolean;
  mine: QuestMine | null;
}
export interface BoardProposed extends QuestMine {
  title: string;
  goal: string;
  criteria: string;
}
export interface BoardHelp {
  id: string;
  instance_id: string | null;
  status: "open" | "claimed";
  visibility: "community" | "mentors";
  created_at: string;
}
/** shift_quest_board(actor) */
export interface QuestBoard {
  project: { id: string; route: ProjectRoute; stage: number; milestones_done: number[] } | null;
  main: BoardMain[];
  side: BoardSide[];
  proposed: BoardProposed[];
  help_open: BoardHelp[];
}
/** A pending invite from shift_quest_project_list (status === "invited"). */
export interface ProjectInvite {
  projectId: string;
  name: string;
  route: ProjectRoute;
  inviter: string | null;
}

/**
 * Safe to pass to client components, and only to the viewer it describes.
 * Contains only the viewer's own avatar URL (which embeds their own Discord
 * id); never anyone else's. Never contains the Discord id as a field.
 */
export interface ViewerCard {
  name: string;
  /** Normalized on the server (avatar.ts): a Discord CDN avatar as a 64px PNG, or null. */
  avatarUrl: string | null;
  staff: boolean;
}

export type IslandViewer =
  | { state: "signed_out" }
  /** Signed in (e.g. Google) without a Discord identity. */
  | { state: "no_discord"; accountLabel: string | null }
  | { state: "unavailable"; reason: "not_configured" | "schema_outdated" | "db_error" }
  | {
      state: "not_eligible";
      me: ViewerCard;
      reason: "no_role" | "not_in_guild" | "pilot_closed" | "discord_unavailable";
    }
  /** Eligible, session.onboarded === false. */
  | { state: "not_started"; me: ViewerCard; actor: string; userId: string }
  | { state: "ready"; me: ViewerCard; actor: string; userId: string; session: Session };
export type ReadyViewer = Extract<IslandViewer, { state: "ready" }>;
// RULE: `actor` (the Discord snowflake) and `userId` (the Supabase user id, for
// whiteboard reads) are server-only. Never pass an IslandViewer with either to a
// client component.

export interface IslandPageData {
  me: ViewerCard;
  /** session.unread */
  unread: number;
  island: IslandView;
  map: IslandMapData;
  /** null when island.project is null */
  board: QuestBoard | null;
  /** only loaded when island.project is null, else [] */
  invites: ProjectInvite[];
  /**
   * Whether the quest project is linked to a SHIFT canvas (shift_quest_canvas_get).
   * Only the time: board and frame ids stay on the server. {linked:false} without
   * a project, or when the read fails.
   */
  canvasLink: CanvasLinkState;
  /**
   * Who is coworking in the SHIFT voice channel right now, as a count only
   * (shift_quest_campfire with names = false). Optional so older fixtures keep
   * compiling. null: no coworking channel set, the function is missing, or the
   * read failed; the world then draws no campfire.
   */
  campfire?: CampfireSummary | null;
  /**
   * The ⋯ menu's "เสนอไอเดีย / แจ้งบั๊ก" link,
   * https://discord.com/channels/<guild>/<suggest channel>
   * (shift_quest_island_links). Optional so older fixtures keep compiling.
   * null: no suggestions channel set, no guild configured, or the read failed;
   * the menu then hides the link.
   */
  suggestUrl?: string | null;
  /**
   * The viewer's own character sheet numbers and coin summary
   * (shift_quest_character). Optional so older fixtures keep compiling.
   * null: the function is missing or the read failed; no character stats
   * and no coin pill.
   */
  character?: CharacterStats | null;
  /**
   * Parent consent (or the adult's own) for appearing in public, redeeming
   * and money prizes (shift_quest_consent_get plus the SHIFT import).
   * null: the function is missing or the read failed; nothing is gated in the UI.
   */
  consent?: IslandConsent | null;
  /**
   * The AI island news of opted-in teams (shift_quest_island_news). null:
   * missing, failed, or the digest is off; no news menu row, no team cards.
   */
  news?: IslandNews | null;
}

/** Page payload for the voice campfire: no names, no ids. */
export interface CampfireSummary {
  count: number;
  /** https://discord.com/channels/<guild>/<channel> */
  joinUrl: string;
}
/** loadCampfire({ names: true }): display names as Discord shows them in the server, sanitised. */
export interface CampfireNames {
  count: number;
  names: string[];
  joinUrl: string;
}
/** loadCampfire: the database says no coworking channel is set; the island draws no campfire. */
export interface CampfireNone {
  none: true;
}

export type IslandActionResult<T = null> =
  | { ok: true; data: T }
  | {
      ok: false;
      /** Thai, user-facing. */
      error: string;
      /** sq code or 'invalid_input' | 'signed_out' | 'not_eligible' | 'not_started' | 'unavailable' | 'busy' | 'unknown' */
      code: string;
    };
export interface QuestSubmitResult {
  instanceId: string;
  revision: number;
  created: boolean;
}

export type TileStatus =
  | "locked"
  | "available"
  | "active"
  | "paused"
  | "submitted"
  | "clarification"
  | "appealed"
  | "declined"
  | "held"
  | "done";
