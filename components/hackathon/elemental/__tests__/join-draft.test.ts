import { registrationSchema } from "@/lib/hackathon/elemental/registration";

import {
  emptyDraft,
  firstInvalidStep,
  formatPhone,
  registrationBody,
  stepForServerPath,
  stepsFor,
  suggestTeamName,
  teamNameFor,
  validateStep,
  type Draft,
} from "../join/draft";

const filled = (patch: Partial<Draft> = {}): Draft => ({
  ...emptyDraft("solo"),
  fullName: "สมชาย ใจดี",
  nickname: "ชาย",
  age: "16",
  grade: "m5",
  school: "โรงเรียนตัวอย่าง",
  parentName: "สมศรี ใจดี",
  parentPhone: "081-234-5678",
  parentConsent: true,
  email: "a@example.com",
  phone: "089-999-9999",
  heardFrom: "passion_seed",
  noRefund: true,
  ...patch,
});

describe("stepsFor", () => {
  it("has no team-name screen, even when starting a team", () => {
    expect(stepsFor(filled({ mode: "create", age: "22" }))).toEqual(["mode", "name", "school", "contact", "heard", "review"]);
  });

  it("skips the parent step for adults", () => {
    expect(stepsFor(filled({ age: "16" }))).toContain("parent");
    expect(stepsFor(filled({ age: "22" }))).not.toContain("parent");
  });
});

describe("validateStep", () => {
  it("passes a complete draft", () => {
    expect(firstInvalidStep(filled())).toBeNull();
  });

  it("names the first step with a problem", () => {
    expect(firstInvalidStep(filled({ school: "" }))).toBe("school");
    expect(firstInvalidStep(filled({ parentConsent: false }))).toBe("parent");
    expect(firstInvalidStep(filled({ heardFrom: "" }))).toBe("heard");
    expect(firstInvalidStep(filled({ noRefund: false }))).toBe("review");
  });

  it("needs one of the listed answers for where they saw the post", () => {
    expect(validateStep("heard", filled({ heardFrom: "" })).heardFrom).toBeDefined();
    expect(validateStep("heard", filled({ heardFrom: "tiktok" })).heardFrom).toBeDefined();
    expect(validateStep("heard", filled({ heardFrom: "camp_hub" }))).toEqual({});
  });

  it("checks Thai phone numbers with or without dashes", () => {
    expect(validateStep("contact", filled({ phone: "0899999999" }))).toEqual({});
    expect(validateStep("contact", filled({ phone: "12345" })).phone).toBeDefined();
  });
});

describe("formatPhone", () => {
  it("adds dashes as people type", () => {
    expect(formatPhone("081")).toBe("081");
    expect(formatPhone("08123")).toBe("081-23");
    expect(formatPhone("0812345678")).toBe("081-234-5678");
    expect(formatPhone("081-234-56789")).toBe("081-234-5678");
  });
});

describe("stepForServerPath", () => {
  it("maps a rejected field back to its step", () => {
    expect(stepForServerPath(["members", 0, "age"])).toBe("school");
    expect(stepForServerPath(["members", 0, "parentPhone"])).toBe("parent");
    expect(stepForServerPath(["contactEmail"])).toBe("contact");
    expect(stepForServerPath(["heardFrom"])).toBe("heard");
  });
});

describe("registrationBody", () => {
  it("sends where they saw the post", () => {
    expect(registrationBody(filled({ heardFrom: "contester" }), undefined).heardFrom).toBe("contester");
  });

  it("is accepted by the API's schema", () => {
    const parsed = registrationSchema.safeParse(registrationBody(filled({ mode: "create", teamName: "ทีมไฟ" }), undefined, "ig"));
    expect(parsed.success).toBe(true);
  });

  it("drops parent details for adults", () => {
    const body = registrationBody(filled({ age: "21" }), undefined);
    expect(body.members[0].parentName).toBeUndefined();
    expect(registrationSchema.safeParse(body).success).toBe(true);
  });

  it("sends passCode and buddyOwe in buddy mode", () => {
    const body = registrationBody(filled({ mode: "buddy" }), undefined, undefined, undefined, {
      code: "0123456789ab",
      senderName: "บิ๊ก",
      owe: "mookata",
    });
    expect(body.passCode).toBe("0123456789ab");
    expect(body.buddyOwe).toBe("mookata");
    expect(registrationSchema.safeParse(body).success).toBe(true);
  });
});

describe("suggestTeamName", () => {
  it("starts from the nickname", () => {
    expect(suggestTeamName({ nickname: " ชาย ", fullName: "สมชาย ใจดี" })).toBe("ทีมชาย");
  });
  it("falls back to the first word of the full name", () => {
    expect(suggestTeamName({ nickname: "", fullName: "สมชาย ใจดี" })).toBe("ทีมสมชาย");
  });
  it("is empty when there's no name yet", () => {
    expect(suggestTeamName({ nickname: "", fullName: "  " })).toBe("");
  });
});

describe("teamNameFor", () => {
  it("names a new team after the nickname when no name was typed", () => {
    expect(teamNameFor(filled({ mode: "create", teamName: "" }))).toBe("ทีมชาย");
    expect(registrationBody(filled({ mode: "create", teamName: "" }), undefined).teamName).toBe("ทีมชาย");
  });
  it("keeps a name typed before the team-name screen was removed", () => {
    expect(teamNameFor(filled({ teamName: " ทีมไฟ " }))).toBe("ทีมไฟ");
  });
  it("sends no team name for solo sign-ups", () => {
    expect(registrationBody(filled({ mode: "solo" }), undefined).teamName).toBeUndefined();
  });
  it("blocks a rude nickname on the name step when it would name the team", () => {
    expect(validateStep("name", filled({ mode: "create", nickname: "ควย" })).nickname).toBeDefined();
    expect(validateStep("name", filled({ mode: "solo", nickname: "ควย" }))).toEqual({});
  });
  it("sends a rejected team name back to the name step", () => {
    expect(stepForServerPath(["teamName"])).toBe("name");
  });
});

describe("grade", () => {
  it("must be picked on the school step, and goes to the server with the member", () => {
    expect(validateStep("school", filled({ grade: "" })).grade).toBe("เลือกชั้น");
    expect(validateStep("school", filled({ grade: "m4" }))).toEqual({});
    expect(firstInvalidStep(filled({ grade: "" }))).toBe("school");
    expect(stepForServerPath(["members", 0, "grade"])).toBe("school");
    const body = registrationBody(filled({ grade: "m6" }), undefined);
    expect(body.members[0].grade).toBe("m6");
    expect(registrationSchema.parse(body).members[0].grade).toBe("m6");
  });
});
