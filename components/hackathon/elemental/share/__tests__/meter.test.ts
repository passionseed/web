import { seatProgressView, type SeatRow } from "@/lib/hackathon/elemental/share-rules";

import { cellColors, clearOrder, freshCells, inviteState, MAX_ANIMATED, seatCardModel, seatHeadline as headline, seatPlace } from "../seat-card-model";

const me = "aaaaaaaa-0000-4000-8000-000000000001";
const friend = "5e6f7a8b-0000-4000-8000-000000000002";
const row = (index: number, status: SeatRow["status"], recipient: string | null = null): SeatRow => ({ id: `s${index}`, index, status, recipientRegistrationId: recipient });
const view = (devices: number, paid: number, rows: SeatRow[] = [], phase: "open" | "after-close" = "open") =>
  seatProgressView({ progress: { devices, paid }, rows, ownRegistrationId: me, selfPaid: false, phase });

describe("seatCardModel: the grid counts toward the seat in progress", () => {
  it("starts empty and counts devices and paid toward seat 1", () => {
    expect(seatCardModel(view(0, 0))).toMatchObject({ index: 1, inSeat: 0, paidInSeat: 0, devicesLeft: 50, paidLeft: 1, last: false, devicesDone: false, maxed: false });
    expect(seatCardModel(view(12, 0))).toMatchObject({ index: 1, inSeat: 12, devicesLeft: 38 });
  });

  it("draws the last 10 cells as targets, and a clean grid waiting for the paid sign-up", () => {
    expect(seatCardModel(view(44, 0))).toMatchObject({ last: true, devicesLeft: 6 });
    expect(seatCardModel(view(39, 0)).last).toBe(false);
    expect(seatCardModel(view(53, 0))).toMatchObject({ inSeat: 50, devicesDone: true, last: false, paidLeft: 1 });
  });

  it("resets for seat 2 once seat 1 is earned", () => {
    expect(seatCardModel(view(76, 1, [row(1, "confirmed", me)]))).toMatchObject({ index: 2, inSeat: 26, paidInSeat: 0, devicesLeft: 24, paidLeft: 1, earned: 1 });
  });

  it("stays clean when maxed, and says when counting stopped", () => {
    expect(seatCardModel(view(112, 3, [row(1, "confirmed", me), row(2, "confirmed", friend)]))).toMatchObject({ maxed: true, inSeat: 50, index: 2 });
    expect(seatCardModel(view(74, 1, [row(1, "confirmed", me)], "after-close")).frozen).toBe(true);
  });
});

describe("seatHeadline: what's left, in one short line", () => {
  // The headline glues its phrases with non-breaking spaces; read them as spaces here.
  const seatHeadline = (v: Parameters<typeof headline>[0]) => headline(v).replace(/\u00a0/g, " ").replace(/\u2060/g, "");
  it("counts down, then nearly there, then the paid sign-up", () => {
    expect(seatHeadline(view(12, 0))).toBe("อีก 38 เครื่อง + 1 คนจ่าย ได้ที่นั่งฟรี");
    expect(seatHeadline(view(12, 1))).toBe("อีก 38 เครื่อง ได้ที่นั่งฟรี");
    expect(seatHeadline(view(44, 0))).toBe("อีกแค่ 6 เครื่อง + 1 คนจ่าย");
    expect(seatHeadline(view(44, 1))).toBe("อีกแค่ 6 เครื่อง");
    expect(seatHeadline(view(50, 0))).toBe("อีก 1 คนจ่าย ได้ที่นั่งฟรี");
  });

  it("keeps the phrases whole when the title wraps", () => {
    expect(headline(view(12, 0))).toBe("อีก\u00a038\u00a0เครื่อง +\u00a01\u00a0คน\u2060จ่าย ได้ที่นั่งฟรี");
  });

  it("names seat 2, the maximum, and close", () => {
    expect(seatHeadline(view(62, 1, [row(1, "confirmed", me)]))).toBe("อีก 38 เครื่อง + 1 คนจ่าย ได้ที่นั่งที่ 2");
    expect(seatHeadline(view(112, 3, [row(1, "confirmed", me), row(2, "qualified", friend)]))).toBe("ได้ครบ 2 ที่แล้ว");
    expect(seatHeadline(view(44, 1, [], "after-close"))).toBe("ปิดนับแล้ว");
    expect(seatHeadline(view(74, 1, [row(1, "confirmed", me)], "after-close"))).toBe("ปิดนับแล้ว · ได้ 1 ที่");
  });

  it("promises nothing once seats are closed or the link is shut", () => {
    const closed = seatProgressView({ progress: { devices: 62, paid: 1 }, rows: [row(1, "confirmed", me)], ownRegistrationId: me, selfPaid: true, phase: "open", seatsClosedReason: "cap" });
    expect(seatHeadline(closed)).toBe("ที่นั่งฟรีหมดแล้ว");
    expect(seatCardModel(closed)).toMatchObject({ noNext: true, devicesLeft: 0, paidLeft: 0, last: false, devicesDone: false });
    const shut = seatProgressView({ progress: { devices: 61, paid: 1 }, rows: [row(1, "rejected", me)], ownRegistrationId: me, selfPaid: false, phase: "open", linkRejected: true });
    expect(seatHeadline(shut)).toBe("ทีมงานปิดลิงก์นี้แล้ว");
  });
});

describe("the grid's pattern is the link's own", () => {
  it("clears every cell exactly once, the same way every time", () => {
    const rank = clearOrder("1a2b3c4d", 1);
    expect([...rank].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i));
    expect(clearOrder("1a2b3c4d", 1)).toEqual(rank);
    expect(clearOrder("1a2b3c4d", 2)).not.toEqual(rank);
    const colors = cellColors("1a2b3c4d", 1);
    expect(cellColors("1a2b3c4d", 1)).toEqual(colors);
    expect(colors).not.toContain("#fff4dc");
    const smoke = colors.filter((c) => ["#2a2826", "#6b6761", "#c9c4bb"].includes(c)).length;
    expect(smoke).toBeGreaterThan(5);
    expect(smoke).toBeLessThan(25);
  });

  it("heals a different place for seat 2", () => {
    expect(seatPlace("1a2b3c4d", 2).src).not.toBe(seatPlace("1a2b3c4d", 1).src);
  });
});

describe("freshCells: what animates on open", () => {
  const rank = clearOrder("1a2b3c4d", 1);
  it("animates nothing on a first visit or with no change", () => {
    expect(freshCells(rank, 12, null).size).toBe(0);
    expect(freshCells(rank, 12, 12).size).toBe(0);
  });

  it("animates the new cells, at most 8, the newest ones", () => {
    expect(freshCells(rank, 14, 12).size).toBe(2);
    const many = freshCells(rank, 40, 10);
    expect(many.size).toBe(MAX_ANIMATED);
    for (const cell of many) expect(rank[cell]).toBeGreaterThanOrEqual(40 - MAX_ANIMATED);
  });
});

describe("inviteState: a teacher's Demo Day stub", () => {
  it("lights at 50 devices and follows staff", () => {
    expect(inviteState({ devices: 49 }, { verified: true, invited: true })).toBe("todo");
    expect(inviteState({ devices: 50 }, { verified: false, invited: false })).toBe("earned");
    expect(inviteState({ devices: 57 }, { verified: true, invited: false })).toBe("verified");
    expect(inviteState({ devices: 64 }, { verified: true, invited: true })).toBe("sent");
  });
});
