import {
  customSchoolKey,
  demoPagesOn,
  foldSchoolName,
  rankSchools,
  SHARE_CODE_RE,
  shareCode,
  shareOpen,
  sharePhase,
  shareUrl,
  type SchoolRow,
} from "../share";
import { inAppBrowser, lineExternalUrl } from "../share";

describe("shareCode", () => {
  it("is the first 8 hex characters of the sign-up id", () => {
    const code = shareCode("3F9A2C1D-0b1c-4d2e-8f90-123456789abc");
    expect(code).toBe("3f9a2c1d");
    expect(SHARE_CODE_RE.test(code)).toBe(true);
  });

  it("makes a link the sign-up tracker keeps", () => {
    expect(shareUrl("3f9a2c1d")).toBe("https://www.passionseed.org/hackathon/elemental?src=share-3f9a2c1d");
  });
});

describe("foldSchoolName", () => {
  it("ignores โรงเรียน, รร., spaces, brackets and Thai digits", () => {
    expect(foldSchoolName("โรงเรียนบดินทรเดชา (สิงห์ สิงหเสนี) ๒")).toBe(foldSchoolName("บดินทรเดชา สิงห์สิงหเสนี 2"));
    expect(foldSchoolName("รร.สตรีวิทยา")).toBe("สตรีวิทยา");
  });
});

describe("rankSchools", () => {
  const rows: SchoolRow[] = [
    ["obec:1", "เตรียมอุดมศึกษาพัฒนาการ", "กรุงเทพมหานคร"],
    ["obec:2", "เตรียมอุดมศึกษา", "กรุงเทพมหานคร"],
    ["obec:3", "นวมินทราชินูทิศ เตรียมอุดมศึกษาน้อมเกล้า", "กรุงเทพมหานคร"],
    ["obec:4", "ยุพราชวิทยาลัย", "เชียงใหม่"],
    ["obec:5", "สตรีวิทยา ๒", "กรุงเทพมหานคร"],
  ];

  it("puts the exact name first, then names that start with it", () => {
    expect(rankSchools(rows, "เตรียมอุดมศึกษา").map((r) => r[0])).toEqual(["obec:2", "obec:1", "obec:3"]);
  });

  it("matches each word against the name or the province", () => {
    expect(rankSchools(rows, "ยุพราช เชียงใหม่").map((r) => r[0])).toEqual(["obec:4"]);
    expect(rankSchools(rows, "สตรีวิทยา 2").map((r) => r[0])).toEqual(["obec:5"]);
  });

  it("returns nothing for an empty search", () => {
    expect(rankSchools(rows, "  ")).toEqual([]);
  });
});

describe("customSchoolKey", () => {
  it("gives the same key to the same school typed two ways", () => {
    expect(customSchoolKey("โรงเรียนมหิดลวิทยานุสรณ์")).toBe(customSchoolKey("มหิดล วิทยานุสรณ์"));
  });
});

describe("shareOpen", () => {
  const env = (v?: string) => ({ ELEMENTAL_SHARE_OPEN: v }) as unknown as NodeJS.ProcessEnv;

  it("is off unless ELEMENTAL_SHARE_OPEN=1", () => {
    const before = new Date("2026-11-27T12:00:00+07:00");
    expect(shareOpen(env("1"), before)).toBe(true);
    expect(shareOpen(env(), before)).toBe(false);
    expect(shareOpen(env("true"), before)).toBe(false);
  });

  it("closes with sign-up", () => {
    expect(shareOpen(env("1"), new Date("2026-12-05T00:00:01+07:00"))).toBe(false);
  });
});

describe("demoPagesOn", () => {
  const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;

  it("is on in development and on PR previews, never in production", () => {
    expect(demoPagesOn(env({ NODE_ENV: "development" }))).toBe(true);
    expect(demoPagesOn(env({ NODE_ENV: "production", VERCEL_ENV: "preview" }))).toBe(true);
    expect(demoPagesOn(env({ NODE_ENV: "production", VERCEL_ENV: "production" }))).toBe(false);
    expect(demoPagesOn(env({ NODE_ENV: "production" }))).toBe(false);
  });
});

describe("sharePhase", () => {
  const on = { ELEMENTAL_SHARE_OPEN: "1" } as unknown as NodeJS.ProcessEnv;
  const off = {} as unknown as NodeJS.ProcessEnv;

  it("is open until sign-up closes (Fri 4 Dec 23:59 Bangkok)", () => {
    expect(sharePhase(on, new Date("2026-12-04T23:59:00+07:00"))).toBe("open");
  });

  it("is read-only from close to the end of Demo Day (Sat 12 Dec)", () => {
    expect(sharePhase(on, new Date("2026-12-05T00:00:01+07:00"))).toBe("after-close");
    expect(sharePhase(on, new Date("2026-12-12T23:59:00+07:00"))).toBe("after-close");
    expect(sharePhase(on, new Date("2026-12-13T00:00:01+07:00"))).toBe("off");
  });

  it("is off whenever ELEMENTAL_SHARE_OPEN isn't 1", () => {
    expect(sharePhase(off, new Date("2026-11-30T12:00:00+07:00"))).toBe("off");
  });
});


describe("Elemental quiz sharing", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101", "instagram"],
    ["Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 357.0.0.25.101 Android", "instagram"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]", "facebook"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.19.0", "line"],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 trill_350000 BytedanceWebview/d8a21c6", "tiktok"],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36", "webview"],
  ])("knows where it's open: %s", (ua, app) => {
    expect(inAppBrowser(ua)).toBe(app);
  });

  it.each([
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  ])("treats a real browser as a real browser: %s", (ua) => {
    expect(inAppBrowser(ua)).toBeNull();
  });

  it("asks LINE to open the same page in the phone's browser, keeping its query", () => {
    expect(lineExternalUrl("https://passionseed.org/hackathon/elemental/quiz/fire?me=1")).toBe(
      "https://passionseed.org/hackathon/elemental/quiz/fire?me=1&openExternalBrowser=1",
    );
  });
});
