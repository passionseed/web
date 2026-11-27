import { buildShareSeatPayload, shareNotifyLive } from "../share-notify";

jest.mock("next/server", () => ({ after: (fn: () => void) => fn() }));

describe("share seat pings", () => {
  it("only go out on the live site", () => {
    expect(shareNotifyLive({ VERCEL_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(shareNotifyLive({ VERCEL_ENV: "preview" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(shareNotifyLive({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it("carry the school, the link tag and the numbers, never a name", () => {
    const p = buildShareSeatPayload({ event: "qualified", kind: "student", code: "1a2b3c4d", school: "เตรียมอุดมศึกษา", devices: 52, paid: 3 });
    expect(p.embeds[0].title).toBe("Student link qualified first at เตรียมอุดมศึกษา");
    expect(p.embeds[0].description).toContain("share-1a2b3c4d · 52/50 devices · 3/3 paid");
    const named = buildShareSeatPayload({ event: "named", kind: "teacher", code: "7e4c0b2a", school: "X", devices: 60, paid: 3, recipientCode: "5e6f7a8b" });
    expect(named.embeds[0].title).toContain("the teacher named code 5E6F7A8B");
  });
});
