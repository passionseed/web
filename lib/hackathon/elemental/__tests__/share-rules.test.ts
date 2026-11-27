import { countDevices, TRACKED_SOURCE_RE } from "../link-views";
import { freeSeatOutcome, linkSource, linkUrl, SHARE_CODE_RE, shareCode } from "../share";
import { newTeacherCode, newTeacherToken } from "../share-codes";
import {
  canChangeSchool,
  canNameRecipient,
  codeIdRange,
  deviceCount,
  GOALS,
  hasPaid,
  linkProgress,
  paidCount,
  parseOptionalPhone,
  parseShareCode,
  parseTeacherContact,
  pickSeatWinner,
  qualifies,
  reachedDevicesGoal,
  recipientProblem,
  remaining,
  seatRecipientId,
  seatView,
  sharePhase,
  TEACHER_TOKEN_RE,
  type SeatRow,
  type ViewEvent,
} from "../share-rules";

const at = (minute: number) => new Date(Date.UTC(2026, 11, 1, 3, minute)).toISOString();

/** n devices, each on its own network, one a minute from `start`. */
const devices = (n: number, start = 0, net = "n"): ViewEvent[] =>
  Array.from({ length: n }, (_, i) => ({ ipHash: `${net}${i}`, at: at(start + i) }));

describe("the goals", () => {
  it("are 50 devices and 3 paid seats", () => {
    expect(GOALS).toEqual({ devices: 50, paid: 3 });
  });

  it("qualify only when both are met", () => {
    expect(qualifies({ devices: 50, paid: 3 })).toBe(true);
    expect(qualifies({ devices: 80, paid: 5 })).toBe(true);
    expect(qualifies({ devices: 49, paid: 3 })).toBe(false);
    expect(qualifies({ devices: 50, paid: 2 })).toBe(false);
  });

  it("invite a teacher to Demo Day on devices alone", () => {
    expect(reachedDevicesGoal({ devices: 50, paid: 0 })).toBe(true);
    expect(reachedDevicesGoal({ devices: 49, paid: 3 })).toBe(false);
  });

  it("say what's left, never below zero", () => {
    expect(remaining({ devices: 12, paid: 1 })).toEqual({ devices: 38, paid: 2 });
    expect(remaining({ devices: 70, paid: 4 })).toEqual({ devices: 0, paid: 0 });
  });

  it("pick the words: start, early, close (70% of the way), done", () => {
    expect(sharePhase({ devices: 0, paid: 0 })).toBe("start");
    expect(sharePhase({ devices: 12, paid: 0 })).toBe("early");
    expect(sharePhase({ devices: 44, paid: 2 })).toBe("close");
    expect(sharePhase({ devices: 50, paid: 1 })).toBe("early");
    expect(sharePhase({ devices: 50, paid: 3 })).toBe("done");
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

describe("linkProgress", () => {
  it("qualifies when the later of the two goals is met", () => {
    const paid = [1, 2, 3].map((m) => ({ seats: 1, at: at(m) }));
    expect(linkProgress(devices(50, 10), paid)).toEqual({ devices: 50, paid: 3, qualifiedAt: at(59) });
    expect(linkProgress(devices(50), [{ seats: 3, at: at(58) }]).qualifiedAt).toBe(at(58));
  });

  it("isn't qualified until both goals are met", () => {
    expect(linkProgress(devices(49), [{ seats: 3, at: at(1) }]).qualifiedAt).toBeNull();
    expect(linkProgress(devices(60), [{ seats: 2, at: at(1) }]).qualifiedAt).toBeNull();
  });
});

describe("pickSeatWinner: one seat per school, first to qualify", () => {
  it("picks the link that qualified first, not the one that opened its page first", () => {
    const w = pickSeatWinner([
      { linkId: "teacher", qualifiedAt: at(30), createdAt: at(0) },
      { linkId: "student", qualifiedAt: at(20), createdAt: at(5) },
      { linkId: "slow", qualifiedAt: null, createdAt: at(1) },
    ]);
    expect(w?.linkId).toBe("student");
  });

  it("breaks a tie with the older link", () => {
    expect(pickSeatWinner([{ linkId: "b", qualifiedAt: at(9), createdAt: at(3) }, { linkId: "a", qualifiedAt: at(9), createdAt: at(1) }])?.linkId).toBe("a");
  });

  it("skips links staff turned down, and gives nothing when nobody qualified", () => {
    expect(pickSeatWinner([{ linkId: "a", qualifiedAt: at(1), createdAt: at(0), rejected: true }, { linkId: "b", qualifiedAt: at(2), createdAt: at(0) }])?.linkId).toBe("b");
    expect(pickSeatWinner([{ linkId: "a", qualifiedAt: null, createdAt: at(0) }])).toBeNull();
  });
});

describe("seatView: what a link's owner sees", () => {
  const me = "aaaaaaaa-0000-4000-8000-000000000001";
  const friend = "5e6f7a8b-0000-4000-8000-000000000002";
  const seat = (over: Partial<SeatRow> = {}): SeatRow => ({ id: "s", linkId: "L", status: "qualified", recipientRegistrationId: null, ...over });
  const view = (over: Partial<Parameters<typeof seatView>[0]> = {}) =>
    seatView({ linkId: "L", kind: "student", linkRejected: false, ownRegistrationId: me, selfPaid: false, seat: seat(), ...over });

  it("is open until someone at the school qualifies, or after a seat was turned down", () => {
    expect(view({ seat: null })).toEqual({ state: "open" });
    expect(view({ seat: seat({ status: "rejected" }) })).toEqual({ state: "open" });
  });

  it("says honestly when another link at the school got it first", () => {
    expect(view({ seat: seat({ linkId: "other" }) })).toEqual({ state: "taken" });
  });

  it("says when staff turned this link down", () => {
    expect(view({ linkRejected: true })).toEqual({ state: "rejected" });
  });

  it("gives an unpaid student's seat to themselves", () => {
    expect(view()).toEqual({ state: "checking", recipient: { who: "self" } });
    expect(view({ seat: seat({ status: "confirmed", recipientRegistrationId: me }) })).toEqual({ state: "given", recipient: { who: "self" } });
  });

  it("asks a paid student to name a friend, then shows the friend by code only", () => {
    expect(view({ selfPaid: true })).toEqual({ state: "checking", recipient: { who: "none" } });
    expect(view({ selfPaid: true, seat: seat({ recipientRegistrationId: friend }) })).toEqual({
      state: "checking",
      recipient: { who: "other", code: "5e6f7a8b" },
    });
    expect(view({ selfPaid: true, seat: seat({ status: "confirmed", recipientRegistrationId: friend }) })).toEqual({
      state: "given",
      recipient: { who: "other", code: "5e6f7a8b" },
    });
  });

  it("asks a teacher to name a student", () => {
    expect(view({ kind: "teacher", ownRegistrationId: null })).toEqual({ state: "checking", recipient: { who: "none" } });
  });
});

describe("who gets the free seat", () => {
  const me = "aaaaaaaa-0000-4000-8000-000000000001";
  const friend = "5e6f7a8b-0000-4000-8000-000000000002";

  it("an unpaid student: their own sign-up, which becomes free", () => {
    expect(seatRecipientId({ kind: "student", ownRegistrationId: me, ownStatus: "pending", namedRecipientId: null })).toBe(me);
    expect(freeSeatOutcome(199, 1)).toEqual({ amountBaht: 0, paid: true });
  });

  it("a paid student: nobody until they name a friend; then the friend's seat becomes free", () => {
    expect(seatRecipientId({ kind: "student", ownRegistrationId: me, ownStatus: "paid", namedRecipientId: null })).toBeNull();
    expect(seatRecipientId({ kind: "student", ownRegistrationId: me, ownStatus: "review", namedRecipientId: null })).toBeNull();
    expect(seatRecipientId({ kind: "student", ownRegistrationId: me, ownStatus: "paid", namedRecipientId: friend })).toBe(friend);
    expect(freeSeatOutcome(149, 1)).toEqual({ amountBaht: 0, paid: true });
  });

  it("a teacher: the student they named", () => {
    expect(seatRecipientId({ kind: "teacher", ownRegistrationId: null, ownStatus: null, namedRecipientId: null })).toBeNull();
    expect(seatRecipientId({ kind: "teacher", ownRegistrationId: null, ownStatus: null, namedRecipientId: friend })).toBe(friend);
  });

  it("a group sign-up: one seat comes off, the rest still to pay", () => {
    expect(freeSeatOutcome(447, 3)).toEqual({ amountBaht: 298, paid: false });
  });

  it("counts a slip waiting for a check as paid", () => {
    expect(hasPaid("paid")).toBe(true);
    expect(hasPaid("review")).toBe(true);
    expect(hasPaid("pending")).toBe(false);
  });

  it("lets a teacher or a paid student name someone only while staff are checking", () => {
    const checking = { state: "checking", recipient: { who: "none" } } as const;
    expect(canNameRecipient("teacher", false, checking)).toBe(true);
    expect(canNameRecipient("student", true, checking)).toBe(true);
    expect(canNameRecipient("student", false, checking)).toBe(false);
    expect(canNameRecipient("teacher", false, { state: "given", recipient: { who: "other", code: "5e6f7a8b" } })).toBe(false);
    expect(canNameRecipient("teacher", false, { state: "open" })).toBe(false);
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

describe("canChangeSchool", () => {
  it("only before the link has really started, and never once it holds a seat", () => {
    expect(canChangeSchool({ devices: 0, paid: 0 }, { state: "open" })).toBe(true);
    expect(canChangeSchool({ devices: 4, paid: 0 }, { state: "taken" })).toBe(true);
    expect(canChangeSchool({ devices: 5, paid: 0 }, { state: "open" })).toBe(false);
    expect(canChangeSchool({ devices: 0, paid: 1 }, { state: "open" })).toBe(false);
    expect(canChangeSchool({ devices: 0, paid: 0 }, { state: "checking", recipient: { who: "self" } })).toBe(false);
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
