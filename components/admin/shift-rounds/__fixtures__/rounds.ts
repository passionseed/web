import { DEFAULT_MISSIONS } from "@/lib/shift-round/admin/format";
import type {
  AdminEntry,
  AdminEvidence,
  AdminRoundListItem,
  AdminStepsRow,
  AttendanceMark,
  MissionCounts,
} from "@/lib/shift-round/admin/types";

export const ROUND_ID = "11111111-1111-4111-8111-111111111111";

export function makeRound(overrides: Partial<AdminRoundListItem> = {}): AdminRoundListItem {
  return {
    id: ROUND_ID,
    number: 4,
    title_th: "รอบทดลอง",
    title_en: "Beta round",
    brief_th: "โจทย์",
    brief_en: "Brief",
    tracks_open: ["high_school"],
    starts_at: "2026-11-09T17:00:00+00:00",
    duration_days: 14,
    closes_at: "2026-11-23T17:00:00.000Z",
    review_window_hours: 48,
    review_ends_at: "2026-11-25T17:00:00.000Z",
    join_cutoff_day: 7,
    nudge_local_time: "19:00:00",
    rate_limit_per_hour: 30,
    grace_minutes: 30,
    squad_size: 3,
    retention_months: 12,
    audio_retention_days: 30,
    join_mode: "invite",
    mentor_led: true,
    discord_url: null,
    session_days: [1, 2, 4, 6, 7],
    session_start: "19:00",
    session_end: "21:00",
    curriculum_key: "4",
    application_cohort: null,
    missions: DEFAULT_MISSIONS,
    status: "published",
    extended_days: 0,
    entrants: 12,
    pending_review: 3,
    ...overrides,
  };
}

/**
 * A SHIFT template round like SHIFT[2]: 7 days from Wed 14 Oct 2026 (00:00
 * Bangkok = 13 Oct 17:00 UTC), sessions on days 1, 2, 4, 6, 7 at 19:00-21:00.
 */
export function makeShiftRound(overrides: Partial<AdminRoundListItem> = {}): AdminRoundListItem {
  return makeRound({
    number: 2,
    title_th: "SHIFT[2]",
    title_en: "SHIFT[2]",
    starts_at: "2026-10-13T17:00:00.000Z",
    duration_days: 7,
    closes_at: "2026-10-20T17:00:00.000Z",
    review_ends_at: "2026-10-22T17:00:00.000Z",
    join_cutoff_day: 2,
    nudge_local_time: "21:15",
    curriculum_key: "2",
    application_cohort: "SHIFT[2]",
    ...overrides,
  });
}

/** Bangkok wall clock on round day `day` of makeShiftRound(): `at(3, "10:00")`. */
export function at(day: number, time = "12:00"): Date {
  const date = new Date(Date.UTC(2026, 9, 13 + day)).toISOString().slice(0, 10);
  return new Date(`${date}T${time}:00+07:00`);
}

type MissionHave = Partial<Record<"ideas" | "interviews" | "problem" | "prototype" | "testers" | "change" | "demo", number>>;

/**
 * Counts json (v2 spec 2.3) for the SHIFT default missions. `have` per mission
 * key; complete when have >= need.
 */
export function makeCounts(
  have: MissionHave = {},
  habits: Partial<Pick<MissionCounts, "daily" | "sessions">> = {},
): MissionCounts {
  const missions = DEFAULT_MISSIONS.map((m, i) => {
    const part = m.parts[0];
    const got = have[m.key as keyof MissionHave] ?? 0;
    return {
      key: m.key,
      n: i + 1,
      complete: got >= part.need,
      title_th: null,
      title_en: null,
      parts: [{ type: part.type, have: got, need: part.need }],
    };
  });
  const complete = missions.filter((m) => m.complete).length;
  return {
    missions,
    missions_complete: complete,
    missions_total: missions.length,
    people_talked_to: (have.interviews ?? 0) + (have.testers ?? 0),
    eligible: complete === missions.length,
    daily: { days: 0, need: 7, today_logged: false },
    sessions: { attended: 0, held: 0, total: 5 },
    ...habits,
  };
}

let n = 0;

export function makeStepsRow(overrides: Partial<AdminStepsRow> = {}, attendance: AttendanceMark[] = []): AdminStepsRow {
  n += 1;
  const id = `99999999-9999-4999-8999-${String(n).padStart(12, "0")}`;
  return {
    entry_id: id,
    user_id: id,
    handle: `kid${n}`,
    display_name: null,
    squad_id: null,
    squad_name: null,
    joined_day: 1,
    last_log_at: null,
    counts: makeCounts(),
    attendance,
    ...overrides,
  };
}

export function makeEntry(overrides: Partial<AdminEntry> = {}): AdminEntry {
  n += 1;
  const id = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  return {
    id,
    user_id: id,
    handle: `kid${n}`,
    track: "high_school",
    beta_group: null,
    joined_at: `2026-11-10T0${n % 10}:00:00Z`,
    joined_day: 1,
    outcome: "in_progress",
    squad_id: null,
    missions_complete: 0,
    last_log_at: null,
    ...overrides,
  };
}

export function makeEvidence(overrides: Partial<AdminEvidence> = {}): AdminEvidence {
  n += 1;
  return {
    id: `22222222-2222-4222-8222-${String(n).padStart(12, "0")}`,
    entry_id: "33333333-3333-4333-8333-333333333333",
    handle: "ต้น",
    squad_name: "Squad 1",
    type: "interview",
    status: "submitted",
    payload: { who_label: "ม.5 ห้อง 2", key_point: "ไม่มีเวลา", occurred_on: "2026-11-11" },
    submitted_at: "2026-11-11T05:00:00Z",
    media: [],
    ...overrides,
  };
}
