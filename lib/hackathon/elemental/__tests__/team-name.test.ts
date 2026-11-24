import { registrationSchema } from "../registration";
import { foldName, isRudeTeamName } from "../team-name";

describe("isRudeTeamName", () => {
  it.each(["Fuck Yeah", "f.u.c.k", "fuuuuck", "SH1T team", "ทีมเหี้ย", "ค ว ย", "มึงอะ", "b1tch"])("blocks %s", (name) => {
    expect(isRudeTeamName(name)).toBe(true);
  });

  it.each(["ไฟป่า", "หีบสมบัติ", "แม่งานตัวจริง", "สัดส่วนทองคำ", "ร้านน้ำ", "Peacock", "Document 5", "Bobby", "Grape", "Elemental 2026"])(
    "allows %s",
    (name) => {
      expect(isRudeTeamName(name)).toBe(false);
    },
  );

  it("folds spacing, look-alikes and repeats", () => {
    expect(foldName("S-h-1-1-t !!")).toBe("shit");
  });
});

describe("registrationSchema team name", () => {
  const base = {
    teamMode: "create",
    members: [{ fullName: "ทดสอบ ระบบ", age: 22, school: "ม.ทดสอบ" }],
    contactEmail: "a@b.co",
    contactPhone: "0812345678",
    noRefundAck: true,
  };

  it("rejects a rude team name on the server too", () => {
    const r = registrationSchema.safeParse({ ...base, teamName: "ทีมเหี้ย" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === "teamName" && i.message === "rude")).toBe(true);
  });

  it("accepts an ordinary one", () => {
    expect(registrationSchema.safeParse({ ...base, teamName: "ไฟป่า" }).success).toBe(true);
  });
});
