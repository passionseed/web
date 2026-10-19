import {
  normalizeCertificates,
  normalizeDashboard,
  normalizeEntries,
  normalizeEntryDetail,
  normalizeEvidence,
  normalizeJobs,
  normalizeRound,
  normalizeSteps,
  normalizeSummary,
} from "../normalize";

// Payload shapes copied from supabase/migrations/20261014090200_shift_rounds_admin_rpc.sql (lane A).

const missions = { missions: [], missions_complete: 4, people_talked_to: 7, eligible: false };

test("entries flatten squad (with icebreaker), missions and certificate; squads pass through", () => {
  const data = normalizeEntries({
    entries: [
      { id: "e1", handle: "ต้น", track: "high_school", outcome: "in_progress", missions, last_log_at: null, certificate: null,
        squad: { id: "s1", name: "Squad 1", icebreaker_question: { id: 4, th: "เก่งอะไร", en: "Good at?" }, icebreaker_answer: "วาดรูป" } },
      { id: "e2", handle: "มิว", track: "high_school", outcome: "certified", missions, squad: null, last_log_at: "2026-11-11T00:00:00Z", certificate: { id: "c", public_id: "X", status: "issued" } },
    ],
    squads: [
      { id: "s1", name: "Squad 1", mentor_user_id: "m", mentor_display_name: "พี่ปอ", discord_url: null, member_entry_ids: ["e1"] },
      { id: "s2", name: "Squad 2", mentor_user_id: null, mentor_display_name: null, discord_url: null, member_entry_ids: [] },
    ],
    squad_size: 3,
  });
  expect(data.entries[0]).toMatchObject({
    squad_id: "s1", squad_name: "Squad 1", missions_complete: 4, has_certificate: false,
    icebreaker_question: 4, icebreaker_text: "เก่งอะไร", icebreaker_answer: "วาดรูป",
  });
  expect(data.entries[1]).toMatchObject({ squad_id: null, has_certificate: true, icebreaker_question: null });
  expect(data.squads.map((s) => s.id)).toEqual(["s1", "s2"]);
  expect(data.squad_size).toBe(3);
});

test("evidence takes handle and squad from nested objects and media purged flag", () => {
  const e = normalizeEvidence({
    id: "v", entry_id: "e1", type: "interview", status: "submitted", payload: { who_label: "ครู" }, submitted_at: "t",
    media: [{ id: "m", kind: "audio", path: "a/b/c/audio.m4a", bytes: 10, duration_ms: 1000, purged: true, exif_found: null }],
    entry: { id: "e1", handle: "ต้น", track: "high_school" }, squad: { id: "s1", name: "Squad 1" }, source: null,
  });
  expect(e).toMatchObject({ handle: "ต้น", squad_id: "s1", squad_name: "Squad 1" });
  expect(e.media[0]).toMatchObject({ kind: "audio", purged: true });
});

test("entry detail normalizes nested entry and evidence", () => {
  const d = normalizeEntryDetail({
    entry: { id: "e1", handle: "ต้น", track: "high_school", outcome: "in_progress", squad: { id: "s1", name: "S" } },
    round: {}, missions, evidence: [{ id: "v", entry: { handle: "ต้น" }, payload: {}, media: [] }],
    checkins: [], summaries: [], certificate: null, events: [{ id: 1, name: "round_joined", created_at: "t", props: {} }],
  });
  expect(d.entry.squad_name).toBe("S");
  expect(d.evidence[0].handle).toBe("ต้น");
  expect(d.events).toHaveLength(1);
});

test("summary handle comes from entry", () => {
  expect(normalizeSummary({ id: "r", entry_id: "e", entry: { id: "e", handle: "ต้น" }, public_revision: null }).handle).toBe("ต้น");
});

test("certificates map holder handle, tombstone flag and outcome counts object", () => {
  const c = normalizeCertificates({
    certificates: [
      { id: "c1", public_id: "AAAA", status: "issued", tombstone: false, holder: { handle: "ต้น" }, render_version: 1 },
      { id: "c2", public_id: "BBBB", status: "revoked", tombstone: true, holder: null, render_version: 3 },
    ],
    outcomes: { certified: 2, not_eligible: 1 },
    last_issue_run: { job: "issue", status: "ok", started_at: "t" },
  });
  expect(c.certificates[0].handle).toBe("ต้น");
  expect(c.certificates[1].tombstone).toBe(true);
  expect(c.outcome_counts).toEqual({ certified: 2, not_eligible: 1 });
  expect(c.last_issue_run?.status).toBe("ok");
});

test("dashboard maps lane A key names", () => {
  const d = normalizeDashboard({
    entrants: 24, joins_per_day: [{ date: "2026-11-10", n: 20 }], logs_per_day: [{ date: "2026-11-10", type: "contact", n: 9 }],
    pending_review: 7, rejection_rate: 0.125, mission_distribution: { "0": 2, "6": 3 }, entrants_4_active_days: 15,
    certificates_issued: 3, certificates_revoked: 1, share_visits: 41, review_minutes_per_entrant: 2.25,
    next_round_joins: 6, non_alumni_4_missions: 5,
    jobs: { issue: { status: "failed", started_at: "t", finished_at: null, error: "boom" }, pushes: { status: "ok", started_at: "t", finished_at: "f", error: null } },
  });
  expect(d).toMatchObject({
    entrants_total: 24, active4_entrants: 15, non_alumni_4plus: 5, certificates: { issued: 3, revoked: 1 },
    joins_per_day: [{ date: "2026-11-10", count: 20 }], logs_per_day: [{ date: "2026-11-10", type: "contact", count: 9 }],
  });
  expect(d.jobs).toEqual([
    expect.objectContaining({ job: "issue", last_ok_at: null, last_run: expect.objectContaining({ status: "failed", error: "boom" }) }),
    expect.objectContaining({ job: "pushes", last_ok_at: "f" }),
  ]);
});

test("jobs map last_runs, last_ok and failures_7d", () => {
  const j = normalizeJobs({
    last_runs: [{ job: "issue", status: "failed", started_at: "t2" }, { job: "purge", status: "ok", started_at: "t" }],
    last_ok: { issue: "t1", purge: "t" },
    failures_7d: [{ job: "issue", status: "failed", started_at: "t2", error: "x" }],
    deletion_queue: { queued: 2, failed: 0 },
  });
  expect(j.jobs[0]).toMatchObject({ job: "issue", last_ok_at: "t1", failures_7d: 1, last_run: { status: "failed" } });
  expect(j.failures).toHaveLength(1);
  expect(j.deletion_queue).toEqual({ queued: 2, failed: 0 });
});

// ---- v2 counts json, round columns and the steps read model (scale spec 2.1, 2.3, 2.8) ----

const countsV2 = {
  missions: [
    { key: "interviews", n: 2, complete: false, title_th: null, title_en: null, parts: [{ type: "interview", have: 2, need: 3 }] },
    { key: "ideas", n: 1, complete: true, title_th: null, title_en: null, parts: [{ type: "ideas", have: 1, need: 1 }] },
  ],
  missions_complete: 1, missions_total: 7, people_talked_to: 5, eligible: false,
  daily: { days: 2, need: 7, today_logged: true },
  sessions: { attended: 1, held: 1, total: 5 },
};

test("counts json v2 keeps totals and habits, orders missions by n", () => {
  const entry = normalizeEntries({ entries: [{ id: "e1", handle: "ต้น", missions: countsV2 }] }).entries[0];
  expect(entry.missions).toMatchObject({
    missions_total: 7,
    daily: { days: 2, need: 7, today_logged: true },
    sessions: { attended: 1, held: 1, total: 5 },
  });
  expect(entry.missions?.missions.map((m) => m.key)).toEqual(["ideas", "interviews"]);
  // A pre-v2 payload: totals from the list, habits null.
  expect(normalizeEntryDetail({ entry: {}, missions }).missions).toMatchObject({ missions_complete: 4, daily: null, sessions: null });
});

test("rounds: v2 columns pass through; times become HH:MM; missing columns fall back to the SHIFT template", () => {
  const v2 = normalizeRound({
    id: "r", number: 3, nudge_local_time: "21:15:00", session_days: [7, 1, 2, 4, 6], session_start: "19:00:00", session_end: "21:00:00",
    curriculum_key: "3", application_cohort: "SHIFT[3]",
    missions: [{ key: "ideas", parts: [{ type: "ideas", need: 1 }] }, { key: "interviews", parts: [{ type: "interview", need: 3, distinct: true }], title_th: "คุย" }],
  });
  expect(v2).toMatchObject({
    nudge_local_time: "21:15", session_days: [1, 2, 4, 6, 7], session_start: "19:00", session_end: "21:00",
    curriculum_key: "3", application_cohort: "SHIFT[3]",
  });
  expect(v2.missions).toEqual([
    { key: "ideas", parts: [{ type: "ideas", need: 1 }], title_th: null, title_en: null },
    { key: "interviews", parts: [{ type: "interview", need: 3, distinct: true }], title_th: "คุย", title_en: null },
  ]);
  expect(normalizeRound({ id: "r", number: 1, nudge_local_time: "19:00:00" })).toMatchObject({
    session_days: [1, 2, 4, 6, 7], session_start: "19:00", session_end: "21:00", curriculum_key: null, application_cohort: null, missions: null,
  });
});

test("steps rows: counts, attendance list or map, squad flattening; bare list or {entries}", () => {
  const row = {
    entry_id: "e1", user_id: "u1", handle: "ต้น", display_name: "Ton", squad_id: "s1", squad_name: "Squad 1",
    joined_day: 1, last_log_at: "2026-10-15T12:00:00Z", counts: countsV2,
    attendance: [{ day: 2, status: "makeup" }, { day: 1, status: "present" }, { day: 4, status: "late" }],
  };
  const fromList = normalizeSteps([row]);
  expect(fromList.rows[0]).toMatchObject({ entry_id: "e1", handle: "ต้น", squad_name: "Squad 1", counts: { missions_total: 7 } });
  expect(fromList.rows[0].attendance).toEqual([{ day: 1, status: "present" }, { day: 2, status: "makeup" }]);
  const fromObject = normalizeSteps({ entries: [{ ...row, squad_id: undefined, squad_name: undefined, squad: { id: "s9", name: "Squad 9" }, attendance: { "1": "absent" } }] });
  expect(fromObject.rows[0]).toMatchObject({ squad_id: "s9", squad_name: "Squad 9", attendance: [{ day: 1, status: "absent" }] });
  expect(normalizeSteps({ rows: [row] }).rows).toHaveLength(1);
  expect(normalizeSteps(null).rows).toEqual([]);
});
