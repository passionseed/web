import { formatThaiWhen, summarizeSeedstackProgress, type SeedstackEventRow } from "@/lib/seedstack/dashboard";

function ev(partial: Partial<SeedstackEventRow> & Pick<SeedstackEventRow, "step" | "event">, at: string): SeedstackEventRow {
  return { minutes: null, next: null, detail: null, live_url: null, client_ts: at, created_at: at, ...partial };
}

function statusOf(events: SeedstackEventRow[]) {
  return Object.fromEntries(summarizeSeedstackProgress(events).steps.map((s) => [s.step, s.status]));
}

describe("summarizeSeedstackProgress", () => {
  it("lists every step in order, not started when there are no events", () => {
    const { steps, liveUrl } = summarizeSeedstackProgress([]);
    expect(steps.map((s) => s.step)).toEqual(["install", "scope", "ship", "test"]);
    expect(steps.every((s) => s.status === "not_started" && s.lastAt === null)).toBe(true);
    expect(liveUrl).toBeNull();
  });

  it("uses the latest event per step, whatever order the rows arrive in", () => {
    const events = [
      ev({ step: "scope", event: "done" }, "2026-10-02T00:00:00Z"),
      ev({ step: "scope", event: "start" }, "2026-10-01T00:00:00Z"),
      ev({ step: "install", event: "stuck" }, "2026-10-01T00:00:00Z"),
    ];
    expect(statusOf(events)).toMatchObject({ install: "stuck", scope: "done", ship: "not_started" });
  });

  it("goes back to in progress after stuck once the student moves again", () => {
    const events = [
      ev({ step: "ship", event: "stuck" }, "2026-10-01T00:00:00Z"),
      ev({ step: "ship", event: "changed" }, "2026-10-02T00:00:00Z"),
    ];
    expect(statusOf(events).ship).toBe("in_progress");
  });

  it("keeps done after a later start or stuck, like the mentor board", () => {
    const done = ev({ step: "test", event: "done" }, "2026-10-01T00:00:00Z");
    expect(statusOf([done, ev({ step: "test", event: "start" }, "2026-10-02T00:00:00Z")]).test).toBe("done");
    expect(statusOf([done, ev({ step: "test", event: "stuck" }, "2026-10-02T00:00:00Z")]).test).toBe("done");
  });

  it("orders by client time, falling back to when the server got it", () => {
    const late = { ...ev({ step: "install", event: "done" }, "2026-10-03T00:00:00Z"), client_ts: null };
    const early = ev({ step: "install", event: "stuck" }, "2026-10-02T00:00:00Z");
    const summary = summarizeSeedstackProgress([late, early]).steps[0];
    expect(summary.status).toBe("done");
    expect(summary.lastAt).toBe("2026-10-03T00:00:00Z");
  });

  it("keeps the latest next per step and the latest live link overall", () => {
    const events = [
      ev({ step: "scope", event: "start", next: "คุยกับคน 3 คน" }, "2026-10-01T00:00:00Z"),
      ev({ step: "scope", event: "changed" }, "2026-10-02T00:00:00Z"),
      ev({ step: "test", event: "done", live_url: "https://a.example" }, "2026-10-03T00:00:00Z"),
      ev({ step: "ship", event: "done", live_url: "https://b.example" }, "2026-10-04T00:00:00Z"),
    ];
    const progress = summarizeSeedstackProgress(events);
    expect(progress.steps[1].next).toBe("คุยกับคน 3 คน");
    expect(progress.liveUrl).toBe("https://b.example");
  });
});

describe("formatThaiWhen", () => {
  const NOW = Date.parse("2026-10-10T12:00:00Z");

  it("says just now, minutes, then hours", () => {
    expect(formatThaiWhen("2026-10-10T11:59:30Z", NOW)).toBe("เมื่อสักครู่");
    expect(formatThaiWhen("2026-10-10T11:55:00Z", NOW)).toBe("5 นาทีที่แล้ว");
    expect(formatThaiWhen("2026-10-10T09:00:00Z", NOW)).toBe("3 ชม.ที่แล้ว");
  });

  it("falls back to a Bangkok date after a day", () => {
    // 20:30 UTC on the 7th is 03:30 on the 8th in Bangkok.
    const text = formatThaiWhen("2026-10-07T20:30:00Z", NOW);
    expect(text).toContain("8");
    expect(text).toContain("03:30");
  });

  it("treats a clock slightly ahead as just now", () => {
    expect(formatThaiWhen("2026-10-10T12:01:00Z", NOW)).toBe("เมื่อสักครู่");
  });
});
