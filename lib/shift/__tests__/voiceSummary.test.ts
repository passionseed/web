import {
  buildVoiceReport,
  formatDuration,
  sharePercent,
  type VoiceRosterStudent,
  type VoiceSpanRow,
} from "@/lib/shift/voiceSummary";

const at = (time: string) => `2026-11-10T${time}:00+07:00`;
const window = { from: new Date(at("19:00")), to: new Date(at("21:00")) };
const after = new Date(at("23:00"));
const MIN = 60_000;

function span(user: string, from: string, to: string, extra: Partial<VoiceSpanRow> = {}): VoiceSpanRow {
  return {
    discord_user_id: user,
    display_name: null,
    started_at: at(from),
    seen_at: at(to),
    ended_at: at(to),
    mic_open: false,
    streaming: false,
    camera: false,
    is_join: false,
    ...extra,
  };
}

const roster: VoiceRosterStudent[] = [
  { applicationId: "a1", name: "Mint", discordUserId: "d1", paid: true },
  { applicationId: "a2", name: "Phu", discordUserId: "d2", paid: true },
  { applicationId: "a3", name: "Earn", discordUserId: null, paid: true },
];

describe("buildVoiceReport", () => {
  it("adds up voice, mic, screen share and camera time per student", () => {
    const rows = buildVoiceReport(
      roster,
      [
        span("d1", "19:00", "19:30", { is_join: true }),
        span("d1", "19:30", "20:00", { mic_open: true, streaming: true }),
        span("d1", "20:00", "20:10", { mic_open: true, camera: true }),
      ],
      window,
      after,
    );
    const mint = rows.find((r) => r.name === "Mint")!;
    expect(mint.totals).toMatchObject({
      voiceMs: 70 * MIN,
      micMs: 40 * MIN,
      streamMs: 30 * MIN,
      cameraMs: 10 * MIN,
      joins: 1,
      firstAt: new Date(at("19:00")).getTime(),
      lastAt: new Date(at("20:10")).getTime(),
    });
  });

  it("clips rows to the window", () => {
    const rows = buildVoiceReport(roster, [span("d1", "18:30", "21:30", { is_join: true })], window, after);
    const mint = rows.find((r) => r.name === "Mint")!;
    expect(mint.totals.voiceMs).toBe(120 * MIN);
    // The join happened before the session started.
    expect(mint.totals.joins).toBe(0);
  });

  it("ends an open row at its last heartbeat, never at now", () => {
    const open = span("d1", "19:00", "19:20", { ended_at: null, is_join: true });
    const rows = buildVoiceReport(roster, [open], window, new Date(at("20:00")));
    const mint = rows.find((r) => r.name === "Mint")!;
    expect(mint.totals.voiceMs).toBe(20 * MIN);
    // The heartbeat is 40 minutes stale: the bot is down, so not "in voice now".
    expect(mint.totals.inVoiceNow).toBe(false);
  });

  it("marks a fresh open row as in voice now", () => {
    const open = span("d1", "19:00", "19:59", { ended_at: null });
    const rows = buildVoiceReport(roster, [open], window, new Date(at("20:00")));
    expect(rows[0]).toMatchObject({ name: "Mint", totals: { inVoiceNow: true } });
  });

  it("lists absent and unlinked students too", () => {
    const rows = buildVoiceReport(roster, [span("d1", "19:00", "20:00")], window, after);
    expect(rows.map((r) => [r.name, r.discordLinked, r.totals.voiceMs > 0])).toEqual([
      ["Mint", true, true],
      ["Phu", true, false],
      ["Earn", false, false],
    ]);
  });

  it("adds role-only students under their newest display name", () => {
    const rows = buildVoiceReport(
      roster,
      [
        span("d9", "19:00", "19:10", { display_name: "old name" }),
        span("d9", "19:10", "19:20", { display_name: "Palm" }),
      ],
      window,
      after,
    );
    expect(rows[0]).toMatchObject({ name: "Palm", kind: "role_only", totals: { voiceMs: 20 * MIN } });
  });

  it("folds duplicate applications for one Discord account into one row", () => {
    const rows = buildVoiceReport(
      [
        { applicationId: "a1", name: "Mint", discordUserId: "d1", paid: false },
        { applicationId: "a1b", name: "Mint again", discordUserId: "d1", paid: true },
      ],
      [span("d1", "19:00", "19:30")],
      window,
      after,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Mint", paid: true, totals: { voiceMs: 30 * MIN } });
  });
});

describe("formatDuration", () => {
  it("shows minutes under an hour and hours above", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(42 * MIN)).toBe("42 min");
    expect(formatDuration(65 * MIN)).toBe("1 h 05 min");
  });
});

describe("sharePercent", () => {
  it("is zero when there is no time in voice", () => {
    expect(sharePercent(10, 0)).toBe(0);
    expect(sharePercent(40, 70)).toBe(57);
  });
});
