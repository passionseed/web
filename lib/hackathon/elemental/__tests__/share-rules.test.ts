import { TRACKED_SOURCE_RE } from "../link-views";
import { linkSource, linkUrl, SHARE_CODE_RE, shareCode } from "../share";
import { newTeacherCode, newTeacherToken } from "../share-codes";
import { codeIdRange, paidAt, parseOptionalPhone, parseTeacherContact, shareLinkView, TEACHER_TOKEN_RE } from "../share-rules";

const at = (minute: number) => new Date(Date.UTC(2026, 11, 1, 3, minute)).toISOString();

describe("shareLinkView: the view model the share and teacher pages draw", () => {
  const school = { schoolName: "เตรียมอุดมศึกษา", province: "กรุงเทพมหานคร" };
  const student = { kind: "student" as const, code: "1a2b3c4d", ...school };
  const teacher = { kind: "teacher" as const, code: "7e4c0b2a", ...school };

  it("carries the link, its counts, the phase and the student's story proof", () => {
    expect(shareLinkView({ link: student, counts: { devices: 12, paid: 1 }, phase: "open", storyProof: "unlocked" })).toEqual({
      kind: "student",
      code: "1a2b3c4d",
      school: { name: "เตรียมอุดมศึกษา", province: "กรุงเทพมหานคร" },
      canChangeSchool: true,
      devices: 12,
      paid: 1,
      phase: "open",
      storyProof: "unlocked",
    });
  });

  it("has nothing about seats, verifying or invites, and nothing that names a person", () => {
    const view = shareLinkView({ link: { ...student, teacherName: "x" } as typeof student, counts: { devices: 1, paid: 0 }, phase: "open" });
    expect(Object.keys(view).sort()).toEqual(["canChangeSchool", "code", "devices", "kind", "paid", "phase", "school", "storyProof"]);
  });

  it("lets a student change school only while sign-up is open", () => {
    expect(shareLinkView({ link: student, counts: { devices: 0, paid: 0 }, phase: "after-close" }).canChangeSchool).toBe(false);
    expect(shareLinkView({ link: student, counts: { devices: 0, paid: 0 }, phase: "off" }).canChangeSchool).toBe(false);
  });

  it("never lets a teacher change school, and a teacher has no story proof", () => {
    const view = shareLinkView({ link: teacher, counts: { devices: 57, paid: 1 }, phase: "open", storyProof: "unlocked" });
    expect(view.canChangeSchool).toBe(false);
    expect(view.storyProof).toBe("none");
  });

  it("defaults a student's story proof to none, and never shows a negative count", () => {
    const view = shareLinkView({ link: student, counts: { devices: -3, paid: -1 }, phase: "open" });
    expect(view).toMatchObject({ storyProof: "none", devices: 0, paid: 0 });
  });
});

describe("codes", () => {
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

describe("paidAt: when a payment counts", () => {
  it("is when the slip was uploaded, from the slip's file name, not when staff approved it", () => {
    const ms = Date.UTC(2026, 11, 2, 5, 30);
    expect(paidAt({ slipPath: `3f9a2c1d-0b1c-4d2e-8f90-123456789abc/${ms}-a1b2c3d4e5f6.jpg`, createdAt: at(0) })).toBe(new Date(ms).toISOString());
  });

  it("is the sign-up time when there's no slip (marked paid by hand)", () => {
    expect(paidAt({ slipPath: null, createdAt: at(7) })).toBe(at(7));
    expect(paidAt({ slipPath: "odd/name.jpg", createdAt: at(7) })).toBe(at(7));
  });
});
