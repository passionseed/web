import type { AdminEntry, AdminEvidence, AdminRoundListItem } from "@/lib/shift-round/admin/types";

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
    status: "published",
    extended_days: 0,
    entrants: 12,
    pending_review: 3,
    ...overrides,
  };
}

let n = 0;
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
