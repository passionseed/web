import {
  normalizeCertificates,
  normalizeDashboard,
  normalizeEntries,
  normalizeEntryDetail,
  normalizeEvidence,
  normalizeJobs,
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
