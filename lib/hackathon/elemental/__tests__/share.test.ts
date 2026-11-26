import {
  customSchoolKey,
  demoPagesOn,
  foldSchoolName,
  freeSeatOutcome,
  rankSchools,
  SHARE_CODE_RE,
  shareCode,
  shareOpen,
  shareUrl,
  type SchoolRow,
} from "../share";

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

describe("freeSeatOutcome", () => {
  it("makes a one-person sign-up paid at ฿0", () => {
    expect(freeSeatOutcome(199, 1)).toEqual({ amountBaht: 0, paid: true });
    expect(freeSeatOutcome(149, 1)).toEqual({ amountBaht: 0, paid: true });
  });

  it("takes one seat off a group's sign-up", () => {
    expect(freeSeatOutcome(447, 3)).toEqual({ amountBaht: 298, paid: false });
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
