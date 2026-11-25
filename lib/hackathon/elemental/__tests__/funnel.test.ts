import { cleanFunnelEvent, summarizeFunnel, worstDrop, type FunnelRow } from "../funnel";

const row = (sid: string, step: string, extra: Record<string, string> = {}): FunnelRow => ({
  event_data: { sid, step, ...extra },
  created_at: "2026-11-23T00:00:00Z",
});

describe("summarizeFunnel", () => {
  it("counts each person once per step and the share from the step before", () => {
    const rows = [
      row("a", "landing"),
      row("a", "landing"),
      row("b", "landing"),
      row("c", "landing"),
      row("d", "landing"),
      row("a", "join", { source: "ig" }),
      row("b", "join"),
      row("a", "step:mode"),
    ];
    const { stages, sources } = summarizeFunnel(rows);
    const by = Object.fromEntries(stages.map((s) => [s.key, s]));
    expect(by.landing.people).toBe(4);
    expect(by.landing.fromPrevious).toBeNull();
    expect(by.join.people).toBe(2);
    expect(by.join.fromPrevious).toBe(0.5);
    expect(by["step:mode"].fromPrevious).toBe(0.5);
    expect(sources).toEqual([
      { source: "direct", people: 1 },
      { source: "ig", people: 1 },
    ]);
  });

  it("skips optional steps when working out the share", () => {
    const rows = [row("a", "step:mode"), row("b", "step:mode"), row("a", "step:team"), row("a", "step:name"), row("b", "step:name")];
    const by = Object.fromEntries(summarizeFunnel(rows).stages.map((s) => [s.key, s]));
    expect(by["step:team"].optional).toBe(true);
    expect(by["step:name"].fromPrevious).toBe(1);
  });

  it("tallies failed fields by people, and slip results, without counting them as steps", () => {
    const rows = [
      row("a", "invalid", { detail: "phone,email" }),
      row("b", "invalid", { detail: "phone" }),
      row("b", "invalid", { detail: "phone" }),
      row("a", "slip_result", { detail: "rejected:amount" }),
      row("b", "slip_result", { detail: "paid" }),
      row("c", "slip_result", { detail: "paid" }),
      { event_data: null, created_at: "" },
      { event_data: { step: "landing" }, created_at: "" },
    ];
    const s = summarizeFunnel(rows);
    expect(s.invalidFields).toEqual([
      { field: "phone", count: 2 },
      { field: "email", count: 1 },
    ]);
    expect(s.slipResults[0]).toEqual({ result: "paid", count: 2 });
    expect(s.invitesShared).toEqual([]);
    expect(s.stages.every((st) => st.people === 0)).toBe(true);
  });
});

describe("invite sharing", () => {
  it("counts invite links sent by how, apart from the steps", () => {
    const s = summarizeFunnel([
      row("a", "invite_shared", { detail: "line" }),
      row("a", "invite_shared", { detail: "copy" }),
      row("b", "invite_shared", { detail: "line" }),
    ]);
    expect(s.invitesShared).toEqual([
      { how: "line", count: 2 },
      { how: "copy", count: 1 },
    ]);
    expect(s.stages.every((st) => st.people === 0)).toBe(true);
  });
});

describe("worstDrop", () => {
  it("finds the step that loses the most once enough people arrive", () => {
    const rows = [
      ...["a", "b", "c", "d", "e", "f"].map((sid) => row(sid, "landing")),
      ...["a", "b", "c", "d", "e"].map((sid) => row(sid, "join")),
      ...["a"].map((sid) => row(sid, "step:mode")),
    ];
    expect(worstDrop(summarizeFunnel(rows).stages)?.key).toBe("step:mode");
  });
});

describe("cleanFunnelEvent", () => {
  const sid = "6f1c7c1e-1d2b-4c3a-9f00-0a1b2c3d4e5f";

  it("keeps a known step and takes the host from the request", () => {
    expect(cleanFunnelEvent({ sid, step: "step:name", host: "evil.example" }, "passionseed.org")).toEqual({
      sid,
      step: "step:name",
      host: "passionseed.org",
    });
  });

  it("rejects unknown steps, bad ids and odd details", () => {
    expect(cleanFunnelEvent({ sid, step: "paid_for_real" }, "passionseed.org")).toBeNull();
    expect(cleanFunnelEvent({ sid: "abc", step: "landing" }, "passionseed.org")).toBeNull();
    expect(cleanFunnelEvent({ sid, step: "invalid", detail: "<script>" }, "passionseed.org")).toBeNull();
    expect(cleanFunnelEvent(null, "passionseed.org")).toBeNull();
  });

  it("drops the port from the host", () => {
    expect(cleanFunnelEvent({ sid, step: "landing" }, "localhost:3000")?.host).toBe("localhost");
  });
});
