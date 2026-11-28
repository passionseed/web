import { cleanFunnelEvent, summarizeFunnel, worstDrop, type FunnelRow } from "../funnel";

const row = (sid: string, step: string, extra: Record<string, string> = {}, at = "2026-11-23T00:00:00Z"): FunnelRow => ({
  event_data: { sid, step, ...extra },
  created_at: at,
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
      row("a", "screen:about"),
    ];
    const { stages, sources } = summarizeFunnel(rows);
    const by = Object.fromEntries(stages.map((s) => [s.key, s]));
    expect(by.landing.people).toBe(4);
    expect(by.landing.fromPrevious).toBeNull();
    expect(by.join.people).toBe(2);
    expect(by.join.fromPrevious).toBe(0.5);
    expect(by["screen:about"].fromPrevious).toBe(0.5);
    expect(sources).toEqual([
      { source: "direct", people: 1 },
      { source: "ig", people: 1 },
    ]);
  });

  it("follows the three sign-up screens in order", () => {
    const rows = [
      ...["a", "b", "c", "d"].map((sid) => row(sid, "screen:about")),
      ...["a", "b"].map((sid) => row(sid, "screen:contact")),
      ...["a"].map((sid) => row(sid, "screen:review")),
      row("a", "submitted"),
    ];
    const by = Object.fromEntries(summarizeFunnel(rows).stages.map((s) => [s.key, s]));
    expect(by["screen:contact"].fromPrevious).toBe(0.5);
    expect(by["screen:review"].fromPrevious).toBe(0.5);
    expect(by.submitted.fromPrevious).toBe(1);
  });

  it("keeps the old form's screens listed with their counts, labelled removed, without a share", () => {
    const rows = [row("a", "join"), row("b", "join"), row("a", "step:mode"), row("a", "step:team"), row("a", "screen:about"), row("b", "screen:about")];
    const by = Object.fromEntries(summarizeFunnel(rows).stages.map((s) => [s.key, s]));
    for (const key of ["step:mode", "step:name", "step:team", "step:school", "step:parent", "step:contact", "step:heard", "step:review"]) {
      expect(by[key].removed).toBe(true);
      expect(by[key].optional).toBe(true);
      expect(by[key].fromPrevious).toBeNull();
      expect(by[key].label).toMatch(/screen removed/);
    }
    expect(by["step:mode"].people).toBe(1);
    // The removed screens don't sit in the chain: the next screen counts from "opened sign-up".
    expect(by["screen:about"].fromPrevious).toBe(1);
  });

  it("counts shares into and out of the new form only from its first event, so the old form's sign-ups don't skew them", () => {
    const before = "2026-11-25T00:00:00Z";
    const after = "2026-11-29T00:00:00Z";
    const rows = [
      // The old form: 10 opened sign-up, 6 signed up.
      ...Array.from({ length: 10 }, (_, i) => row(`old${i}`, "join", {}, before)),
      ...Array.from({ length: 6 }, (_, i) => row(`old${i}`, "step:mode", {}, before)),
      ...Array.from({ length: 6 }, (_, i) => row(`old${i}`, "submitted", {}, before)),
      // The new form: 5 opened it, all saw screen 1, 4 reached contact, 4 the review, 2 signed up.
      ...Array.from({ length: 5 }, (_, i) => row(`new${i}`, "join", {}, after)),
      ...Array.from({ length: 5 }, (_, i) => row(`new${i}`, "screen:about", {}, after)),
      ...Array.from({ length: 4 }, (_, i) => row(`new${i}`, "screen:contact", {}, after)),
      ...Array.from({ length: 4 }, (_, i) => row(`new${i}`, "screen:review", {}, after)),
      ...Array.from({ length: 2 }, (_, i) => row(`new${i}`, "submitted", {}, after)),
      ...Array.from({ length: 2 }, (_, i) => row(`new${i}`, "pay", {}, after)),
    ];
    const { stages } = summarizeFunnel(rows);
    const by = Object.fromEntries(stages.map((s) => [s.key, s]));
    expect(by.join.people).toBe(15);
    expect(by["screen:about"].fromPrevious).toBe(1);
    expect(by["screen:about"].outOf).toBe(5);
    expect(by.submitted.people).toBe(8);
    expect(by.submitted.fromPrevious).toBe(0.5);
    // After the form, both forms count again: 2 of the 8 who signed up opened the pay page.
    expect(by.pay.fromPrevious).toBe(0.25);
    expect(worstDrop(stages)?.key).not.toBe("screen:about");
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

  it("counts the paid page's invites (paid:line, paid:share, paid:copy) apart from the team card's", () => {
    const s = summarizeFunnel([
      row("a", "invite_shared", { detail: "paid:line" }),
      row("a", "invite_shared", { detail: "paid:line" }),
      row("b", "invite_shared", { detail: "paid:copy" }),
      row("c", "invite_shared", { detail: "paid:share" }),
      row("c", "invite_shared", { detail: "line" }),
    ]);
    expect(s.invitesShared).toEqual([
      { how: "paid:line", count: 2 },
      { how: "line", count: 1 },
      { how: "paid:copy", count: 1 },
      { how: "paid:share", count: 1 },
    ]);
    expect(s.stages.every((st) => st.people === 0)).toBe(true);
  });
});

describe("parent handoff", () => {
  it("counts pages sent to a parent by how, and parents who opened one by people, apart from the steps", () => {
    const s = summarizeFunnel([
      row("a", "parent_shared", { detail: "line" }),
      row("a", "parent_shared", { detail: "line" }),
      row("b", "parent_shared", { detail: "copy" }),
      row("p", "parent_opened"),
      row("p", "parent_opened"),
      row("q", "parent_opened"),
    ]);
    expect(s.parentShared).toEqual([
      { how: "line", count: 2 },
      { how: "copy", count: 1 },
    ]);
    expect(s.parentOpened).toBe(2);
    expect(s.invitesShared).toEqual([]);
    expect(s.stages.every((st) => st.people === 0)).toBe(true);
  });

  it("accepts the parent events from the browser", () => {
    const sid = "6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f";
    expect(cleanFunnelEvent({ sid, step: "parent_shared", detail: "line" }, "passionseed.org")?.step).toBe("parent_shared");
    expect(cleanFunnelEvent({ sid, step: "parent_opened" }, "passionseed.org")?.step).toBe("parent_opened");
  });
});

describe("worstDrop", () => {
  it("finds the step that loses the most once enough people arrive", () => {
    const rows = [
      ...["a", "b", "c", "d", "e", "f"].map((sid) => row(sid, "landing")),
      ...["a", "b", "c", "d", "e"].map((sid) => row(sid, "join")),
      ...["a", "b", "c", "d", "e"].map((sid) => row(sid, "screen:about")),
      ...["a"].map((sid) => row(sid, "screen:contact")),
    ];
    expect(worstDrop(summarizeFunnel(rows).stages)?.key).toBe("screen:contact");
  });

  it("never picks a removed screen", () => {
    const rows = [...["a", "b", "c", "d", "e", "f"].map((sid) => row(sid, "join")), row("a", "step:mode")];
    expect(worstDrop(summarizeFunnel(rows).stages)?.key).not.toBe("step:mode");
  });

  it("waits until enough people reached the step before", () => {
    const rows = [...["a", "b", "c"].map((sid) => row(sid, "screen:about")), row("a", "screen:contact")];
    expect(worstDrop(summarizeFunnel(rows).stages)).toBeNull();
  });
});

describe("cleanFunnelEvent", () => {
  const sid = "6f1c7c1e-1d2b-4c3a-9f00-0a1b2c3d4e5f";

  it("accepts the three sign-up screens", () => {
    for (const step of ["screen:about", "screen:contact", "screen:review"]) {
      expect(cleanFunnelEvent({ sid, step }, "passionseed.org")?.step).toBe(step);
    }
  });

  it("keeps a known step and takes the host from the request", () => {
    expect(cleanFunnelEvent({ sid, step: "step:name", host: "evil.example" }, "passionseed.org")).toEqual({
      sid,
      step: "step:name",
      host: "passionseed.org",
    });
  });

  it("keeps buddy-pass sign-ups' mode, so their steps count", () => {
    expect(cleanFunnelEvent({ sid, step: "step:name", mode: "buddy" }, "passionseed.org")).toEqual({
      sid,
      step: "step:name",
      mode: "buddy",
      host: "passionseed.org",
    });
    expect(cleanFunnelEvent({ sid, step: "step:name", mode: "friend" }, "passionseed.org")).toBeNull();
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
