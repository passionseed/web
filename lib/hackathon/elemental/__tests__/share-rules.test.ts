import { countDevices, TRACKED_SOURCE_RE } from "../link-views";
import { freeSeatOutcome, linkSource, linkUrl, SHARE_CODE_RE, shareCode } from "../share";
import { newTeacherCode, newTeacherToken } from "../share-codes";
import {
  canNameSeat,
  codeIdRange,
  defaultRecipient,
  deviceCount,
  hasPaid,
  linkProgress,
  nextSeat,
  paidAt,
  paidCount,
  parseOptionalPhone,
  parseShareCode,
  parseTeacherContact,
  phonesMatch,
  progressPhase,
  reachedInvite,
  recipientProblem,
  schoolMatch,
  SEAT_RULE,
  seatGoal,
  seatProgressView,
  seatsEarned,
  TEACHER_TOKEN_RE,
  trafficStats,
  type SeatRow,
  type ViewEvent,
} from "../share-rules";

const at = (minute: number) => new Date(Date.UTC(2026, 11, 1, 3, minute)).toISOString();

/** n devices, each on its own network, one a minute from `start`. */
const devices = (n: number, start = 0, net = "n"): ViewEvent[] =>
  Array.from({ length: n }, (_, i) => ({ ipHash: `${net}${i}`, at: at(start + i) }));

describe("SEAT_RULE: 50 devices + 1 paid per seat, up to 2 per link", () => {
  it("is the one setting everything reads", () => {
    expect(SEAT_RULE).toEqual({ devicesPerSeat: 50, paidPerSeat: 1, maxSeatsPerLink: 2, onePerSchool: false });
  });

  it("earns 0, 1 or 2 seats", () => {
    expect(seatsEarned({ devices: 49, paid: 5 })).toBe(0);
    expect(seatsEarned({ devices: 120, paid: 0 })).toBe(0);
    expect(seatsEarned({ devices: 50, paid: 1 })).toBe(1);
    expect(seatsEarned({ devices: 99, paid: 2 })).toBe(1);
    expect(seatsEarned({ devices: 100, paid: 1 })).toBe(1);
    expect(seatsEarned({ devices: 100, paid: 2 })).toBe(2);
  });

  it("never goes past the cap", () => {
    expect(seatsEarned({ devices: 400, paid: 9 })).toBe(2);
  });

  it("never gives more seats than the paid sign-ups brought, whatever the rule says", () => {
    const loose = { devicesPerSeat: 10, paidPerSeat: 0.5, maxSeatsPerLink: 5, onePerSchool: false };
    expect(seatsEarned({ devices: 100, paid: 2 }, loose)).toBe(2);
    expect(seatsEarned({ devices: 100, paid: 0 }, loose)).toBe(0);
  });

  it("says what each seat needs and what's left for the next one", () => {
    expect(seatGoal(1)).toEqual({ devices: 50, paid: 1 });
    expect(seatGoal(2)).toEqual({ devices: 100, paid: 2 });
    expect(nextSeat({ devices: 12, paid: 0 }, 0)).toEqual({ index: 1, devicesLeft: 38, paidLeft: 1 });
    expect(nextSeat({ devices: 76, paid: 1 }, 1)).toEqual({ index: 2, devicesLeft: 24, paidLeft: 1 });
    expect(nextSeat({ devices: 130, paid: 3 }, 2)).toBeNull();
  });

  it("invites a teacher to Demo Day at 50 devices, paid or not", () => {
    expect(reachedInvite({ devices: 50, paid: 0 })).toBe(true);
    expect(reachedInvite({ devices: 49, paid: 3 })).toBe(false);
  });

  it("picks the words for the seat in progress", () => {
    expect(progressPhase({ devices: 0, paid: 0 })).toBe("start");
    expect(progressPhase({ devices: 12, paid: 0 })).toBe("early");
    expect(progressPhase({ devices: 44, paid: 1 })).toBe("close");
    expect(progressPhase({ devices: 60, paid: 1 }, 1)).toBe("early");
    expect(progressPhase({ devices: 100, paid: 2 }, 2)).toBe("done");
  });
});

describe("linkProgress", () => {
  it("counts devices and paid, and when each seat was earned (the later of its two goals)", () => {
    const paid = [{ seats: 1, at: at(5) }, { seats: 1, at: at(200) }];
    const p = linkProgress(devices(110), paid);
    expect(p.devices).toBe(110);
    expect(p.paid).toBe(2);
    expect(p.earnedAt).toEqual([at(49), at(200)]);
  });

  it("earns nothing until both parts are there", () => {
    expect(linkProgress(devices(80), []).earnedAt).toEqual([]);
    expect(linkProgress(devices(30), [{ seats: 3, at: at(1) }]).earnedAt).toEqual([]);
  });
});

describe("who gets each seat", () => {
  const me = "aaaaaaaa-0000-4000-8000-000000000001";
  const friend = "5e6f7a8b-0000-4000-8000-000000000002";

  it("an unpaid student's first seat is their own sign-up; every other seat waits for a name", () => {
    expect(defaultRecipient({ kind: "student", index: 1, ownRegistrationId: me, ownStatus: "pending" })).toBe(me);
    expect(defaultRecipient({ kind: "student", index: 2, ownRegistrationId: me, ownStatus: "pending" })).toBeNull();
    expect(defaultRecipient({ kind: "student", index: 1, ownRegistrationId: me, ownStatus: "paid" })).toBeNull();
    expect(defaultRecipient({ kind: "student", index: 1, ownRegistrationId: me, ownStatus: "review" })).toBeNull();
    expect(defaultRecipient({ kind: "teacher", index: 1, ownRegistrationId: null, ownStatus: null })).toBeNull();
  });

  it("makes the recipient's sign-up free (one seat off a group's)", () => {
    expect(freeSeatOutcome(199, 1)).toEqual({ amountBaht: 0, paid: true });
    expect(freeSeatOutcome(149, 1)).toEqual({ amountBaht: 0, paid: true });
    expect(freeSeatOutcome(447, 3)).toEqual({ amountBaht: 298, paid: false });
  });

  it("counts a slip waiting for a check as paid", () => {
    expect(hasPaid("paid")).toBe(true);
    expect(hasPaid("review")).toBe(true);
    expect(hasPaid("pending")).toBe(false);
  });

  it("only accepts an unpaid sign-up that isn't your own", () => {
    expect(recipientProblem([], me)).toBe("not_found");
    expect(recipientProblem([{ id: me, status: "pending" }], me)).toBe("self");
    expect(recipientProblem([{ id: friend, status: "paid" }], me)).toBe("paid");
    expect(recipientProblem([{ id: friend, status: "review" }], me)).toBe("paid");
    expect(recipientProblem([{ id: friend, status: "cancelled" }], me)).toBe("cancelled");
    expect(recipientProblem([{ id: friend, status: "pending" }, { id: me, status: "pending" }], me)).toBe("ambiguous");
    expect(recipientProblem([{ id: friend, status: "pending" }], me)).toBeNull();
    expect(recipientProblem([{ id: friend, status: "pending" }], null)).toBeNull();
  });
});

describe("seatProgressView: the view model the share pages draw", () => {
  const me = "aaaaaaaa-0000-4000-8000-000000000001";
  const friend = "5e6f7a8b-0000-4000-8000-000000000002";
  const row = (index: number, status: SeatRow["status"], recipient: string | null = null): SeatRow => ({ id: `s${index}`, index, status, recipientRegistrationId: recipient });
  const view = (devicesN: number, paidN: number, rows: SeatRow[], selfPaid = false, phase: "open" | "after-close" | "off" = "open") =>
    seatProgressView({ progress: { devices: devicesN, paid: paidN }, rows, ownRegistrationId: me, selfPaid, phase });

  it("before any seat: what's left for seat 1", () => {
    expect(view(12, 0, [])).toEqual({ rule: SEAT_RULE, phase: "open", devices: 12, paid: 0, seats: [], next: { index: 1, devicesLeft: 38, paidLeft: 1 }, maxed: false });
  });

  it("seat 1 for an unpaid student is theirs; staff are checking", () => {
    const v = view(53, 1, [row(1, "qualified", me)]);
    expect(v.seats).toEqual([{ index: 1, status: "qualified", mine: true }]);
    expect(v.next).toEqual({ index: 2, devicesLeft: 47, paidLeft: 1 });
    expect(canNameSeat(v.seats[0], v.phase)).toBe(false);
  });

  it("if they paid before staff confirmed, their seat waits for a friend's name instead", () => {
    const v = view(53, 1, [row(1, "qualified", me)], true);
    expect(v.seats).toEqual([{ index: 1, status: "needs_recipient" }]);
    expect(canNameSeat(v.seats[0], v.phase)).toBe(true);
  });

  it("shows a friend by code only, and lets the name change until staff confirm", () => {
    const v = view(110, 2, [row(1, "confirmed", me), row(2, "qualified", friend)], true);
    expect(v.seats).toEqual([
      { index: 1, status: "confirmed", mine: true },
      { index: 2, status: "qualified", recipientCode: "5e6f7a8b" },
    ]);
    expect(v.maxed).toBe(true);
    expect(v.next).toBeNull();
    expect(canNameSeat(v.seats[1], v.phase)).toBe(true);
    expect(canNameSeat(v.seats[0], v.phase)).toBe(false);
  });

  it("a teacher's seats always wait for a student's name", () => {
    const v = seatProgressView({ progress: { devices: 61, paid: 1 }, rows: [row(1, "needs_recipient")], ownRegistrationId: null, selfPaid: false, phase: "open" });
    expect(v.seats).toEqual([{ index: 1, status: "needs_recipient" }]);
    expect(canNameSeat(v.seats[0], "after-close")).toBe(true);
    expect(canNameSeat(v.seats[0], "off")).toBe(false);
  });

  it("counts a rejected seat as used", () => {
    expect(view(120, 3, [row(1, "rejected"), row(2, "confirmed", friend)]).maxed).toBe(true);
  });
});

describe("deviceCount", () => {
  it("gives the same total as countDevices, with each network capped", () => {
    const views: ViewEvent[] = [
      ...devices(7, 0, "school-wifi-").map((v) => ({ ...v, ipHash: "wifi" })),
      ...devices(4, 10),
      { ipHash: "home", at: at(20) },
      { ipHash: "home", at: at(21) },
    ];
    expect(deviceCount(views, 50).devices).toBe(countDevices(views));
    expect(deviceCount(views, 50).devices).toBe(5 + 4 + 2);
  });

  it("notes when the count reached the goal, skipping capped networks", () => {
    const views = [...devices(6, 0).map((v) => ({ ...v, ipHash: "same" })), ...devices(3, 10)];
    // 5 from "same" (the 6th is capped), then the 3 others: the 7th device is at minute 11.
    expect(deviceCount(views, 7)).toEqual({ devices: 8, reachedAt: at(11) });
    expect(deviceCount(views, 50).reachedAt).toBeNull();
  });

  it("orders by time, whatever order the rows come in", () => {
    const views = devices(3).reverse();
    expect(deviceCount(views, 2).reachedAt).toBe(at(1));
  });
});

describe("paidCount", () => {
  it("adds up seats, and notes when they first reached the goal", () => {
    expect(paidCount([{ seats: 2, at: at(5) }, { seats: 1, at: at(9) }, { seats: 1, at: at(12) }], 3)).toEqual({ paid: 4, reachedAt: at(9) });
    expect(paidCount([{ seats: 1, at: at(5) }], 3)).toEqual({ paid: 1, reachedAt: null });
  });
});

describe("codes", () => {
  it("reads a code however it's typed", () => {
    for (const typed of ["1a2b3c4d", "1A2B3C4D", " 1a2b 3c4d ", "No. 1A2B3C4D", "1a2b-3c4d"]) expect(parseShareCode(typed)).toBe("1a2b3c4d");
    expect(parseShareCode("1a2b3c4")).toBeNull();
    expect(parseShareCode("1a2b3c4g")).toBeNull();
  });

  it("finds a sign-up by its code as one range of ids", () => {
    const id = "3f9a2c1d-0b1c-4d2e-8f90-123456789abc";
    const { from, to } = codeIdRange(shareCode(id));
    expect(from <= id && id <= to).toBe(true);
    expect(from <= "3f9a2c1e-0000-0000-0000-000000000000").toBe(true);
    expect("3f9a2c1e-0000-0000-0000-000000000000" <= to).toBe(false);
  });

  it("gives teachers 8-hex codes and 32-hex private tokens, drawn at random", () => {
    const codes = new Set(Array.from({ length: 200 }, newTeacherCode));
    expect([...codes].every((c) => SHARE_CODE_RE.test(c))).toBe(true);
    expect(codes.size).toBe(200);
    expect(TEACHER_TOKEN_RE.test(newTeacherToken())).toBe(true);
  });

  it("tags students' links share-<code> and teachers' t-<code>, both counted by the device tracker", () => {
    expect(linkSource("student", "1a2b3c4d")).toBe("share-1a2b3c4d");
    expect(linkSource("teacher", "7e4c0b2a")).toBe("t-7e4c0b2a");
    expect(linkUrl("teacher", "7e4c0b2a")).toBe("https://www.passionseed.org/hackathon/elemental?src=t-7e4c0b2a");
    expect(TRACKED_SOURCE_RE.test(linkSource("student", "1a2b3c4d"))).toBe(true);
    expect(TRACKED_SOURCE_RE.test(linkSource("teacher", "7e4c0b2a"))).toBe(true);
  });
});

describe("teacher contact", () => {
  it("takes an email or a LINE ID, with one key per contact", () => {
    expect(parseTeacherContact(" Kru.Somchai@School.ac.th ")).toEqual({ kind: "email", value: "Kru.Somchai@School.ac.th", key: "email:kru.somchai@school.ac.th" });
    expect(parseTeacherContact("@KruSom")?.key).toBe("line:krusom");
    expect(parseTeacherContact("krusom")?.key).toBe("line:krusom");
    expect(parseTeacherContact("ครูสมชาย")).toBeNull();
    expect(parseTeacherContact("a b")).toBeNull();
  });

  it("takes an optional phone number", () => {
    expect(parseOptionalPhone("")).toEqual({ ok: true, value: null });
    expect(parseOptionalPhone(undefined)).toEqual({ ok: true, value: null });
    expect(parseOptionalPhone("081-234-5678")).toEqual({ ok: true, value: "081-234-5678" });
    expect(parseOptionalPhone("12345")).toEqual({ ok: false });
  });
});

describe("paidAt: when a payment counts for the race", () => {
  it("is when the slip was uploaded, from the slip's file name, not when staff approved it", () => {
    const ms = Date.UTC(2026, 11, 2, 5, 30);
    expect(paidAt({ slipPath: `3f9a2c1d-0b1c-4d2e-8f90-123456789abc/${ms}-a1b2c3d4e5f6.jpg`, createdAt: at(0) })).toBe(new Date(ms).toISOString());
  });

  it("is the sign-up time when there's no slip (marked paid by hand)", () => {
    expect(paidAt({ slipPath: null, createdAt: at(7) })).toBe(at(7));
    expect(paidAt({ slipPath: "odd/name.jpg", createdAt: at(7) })).toBe(at(7));
  });
});

describe("fraud check helpers", () => {
  it("trafficStats: networks, the last 24 hours, the busiest hour", () => {
    const now = new Date(at(0));
    const views: ViewEvent[] = [
      { ipHash: "a", at: new Date(now.getTime() - 2 * 3600_000).toISOString() },
      { ipHash: "a", at: new Date(now.getTime() - 2 * 3600_000 + 60_000).toISOString() },
      { ipHash: "b", at: new Date(now.getTime() - 30 * 3600_000).toISOString() },
    ];
    expect(trafficStats(views, now)).toEqual({ networks: 2, last24h: 2, peakHour: 2 });
    expect(trafficStats([], now)).toEqual({ networks: 0, last24h: 0, peakHour: 0 });
  });

  it("phonesMatch ignores dashes, spaces and +66", () => {
    expect(phonesMatch(["081-234-5678"], ["+66 81 234 5678"])).toBe(true);
    expect(phonesMatch(["0812345678", null], ["0899999999", undefined])).toBe(false);
    expect(phonesMatch([""], [""])).toBe(false);
  });

  it("schoolMatch: the same school, a name to check, or a different school", () => {
    expect(schoolMatch("เตรียมอุดมศึกษา", "โรงเรียนเตรียมอุดมศึกษา")).toBe("match");
    expect(schoolMatch("สตรีวิทยา ๒", "สตรีวิทยา 2")).toBe("match");
    // Sibling schools and abbreviations are never a silent match: a person checks.
    expect(schoolMatch("สตรีวิทยา", "สตรีวิทยา 2")).toBe("similar");
    expect(schoolMatch("เตรียมอุดมศึกษา", "เตรียมอุดมศึกษาพัฒนาการ")).toBe("similar");
    expect(schoolMatch("เตรียมอุดมศึกษา", "รร.เตรียมอุดม")).toBe("similar");
    expect(schoolMatch("บดินทรเดชา", "บดินทร์เดชา")).toBe("similar");
    expect(schoolMatch("สตรีวิทยา", "บดินทรเดชา")).toBe("different");
    expect(schoolMatch("สตรีวิทยา", "")).toBe("different");
  });
});
