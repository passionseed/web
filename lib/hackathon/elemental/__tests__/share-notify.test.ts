import { buildShareSeatPayload, shareNotifyLive } from "../share-notify";

jest.mock("next/server", () => ({ after: (fn: () => void) => fn() }));

describe("share seat pings", () => {
  it("only go out on the live site", () => {
    expect(shareNotifyLive({ VERCEL_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(shareNotifyLive({ VERCEL_ENV: "preview" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(shareNotifyLive({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it("carry the school, the link tag and the numbers, never a name", () => {
    const p = buildShareSeatPayload({ event: "qualified", kind: "student", code: "1a2b3c4d", school: "เตรียมอุดมศึกษา", devices: 52, paid: 1, seatIndex: 1 });
    expect(p.embeds[0].title).toBe("Student link earned free seat 1 (เตรียมอุดมศึกษา)");
    expect(p.embeds[0].description).toContain("share-1a2b3c4d · 52 devices · 1 paid (seat 1 needs 50 + 1)");
    const named = buildShareSeatPayload({ event: "named", kind: "teacher", code: "7e4c0b2a", school: "X", devices: 104, paid: 2, seatIndex: 2, recipientCode: "5e6f7a8b" });
    expect(named.embeds[0].title).toBe("Free seat 2 (X): the teacher named code 5E6F7A8B");
  });
});
