import { registrationSchema } from "@/lib/hackathon/elemental/registration";

import {
  STEPS,
  ageChoicesFor,
  blurError,
  cleanEmailInput,
  defaultMode,
  emptyDraft,
  fieldError,
  firstInvalidStep,
  formatPhone,
  modeOf,
  registrationBody,
  restoredStep,
  stepForServerPath,
  suggestEmail,
  suggestTeamName,
  teamNameFor,
  validateStep,
  type Draft,
} from "../join/draft";

// Demo data only.
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

describe("three screens", () => {
  it("is about you, contact, review for everyone", () => {
    expect(STEPS).toEqual(["about", "contact", "review"]);
  });

  it("starts on a team, unless a friend's team link or buddy pass opened it", () => {
    expect(defaultMode()).toBe("create");
    expect(defaultMode({ team: true })).toBe("join");
    expect(defaultMode({ buddyPass: true })).toBe("buddy");
    expect(emptyDraft().mode).toBe("create");
  });

  it("reads a draft saved before the mode had a default as starting a team", () => {
    expect(modeOf({ mode: null })).toBe("create");
    expect(registrationBody(filled({ mode: null }), undefined).teamMode).toBe("create");
  });
});

describe("validateStep", () => {
  it("passes a complete draft", () => {
    expect(firstInvalidStep(filled())).toBeNull();
  });

  it("asks for name, grade, age and school on the first screen", () => {
    const e = validateStep("about", filled({ fullName: " ", grade: "", age: "", school: "" }));
    expect(Object.keys(e).sort()).toEqual(["age", "fullName", "grade", "school"]);
    expect(firstInvalidStep(filled({ school: "" }))).toBe("about");
  });

  it("puts the parent on the contact screen, only under 20", () => {
    expect(validateStep("contact", filled({ parentConsent: false })).parentConsent).toBeDefined();
    expect(firstInvalidStep(filled({ parentPhone: "" }))).toBe("contact");
    expect(validateStep("contact", filled({ age: "20", parentName: "", parentPhone: "", parentConsent: false }))).toEqual({});
  });

  it("checks Thai phone numbers with or without dashes", () => {
    expect(validateStep("contact", filled({ phone: "0899999999" }))).toEqual({});
    expect(validateStep("contact", filled({ phone: "12345" })).phone).toBeDefined();
  });

  it("needs the no-refund tick on the review", () => {
    expect(firstInvalidStep(filled({ noRefund: false }))).toBe("review");
  });

  it("no longer needs where they saw the post", () => {
    expect(firstInvalidStep(filled({ heardFrom: "" }))).toBeNull();
  });

  it("checks the email the way the API does", () => {
    expect(fieldError("email", filled({ email: "" }))).toBe("ใส่อีเมล");
    expect(fieldError("email", filled({ email: "a@b" }))).toBe("ใส่อีเมลที่ใช้ได้");
    expect(fieldError("email", filled({ email: "ชาย@gmail.com" }))).toMatch(/ภาษาอังกฤษ/);
    expect(fieldError("email", filled({ email: "a.b+c@school.ac.th" }))).toBeUndefined();
  });
});

describe("blurError", () => {
  it("says nothing about an empty box that's tabbed past", () => {
    const d = filled({ email: "", phone: "", fullName: "" });
    expect(blurError("email", d)).toBeUndefined();
    expect(blurError("phone", d)).toBeUndefined();
    expect(blurError("fullName", d)).toBeUndefined();
  });

  it("flags a badly typed email or phone as soon as the box loses focus", () => {
    expect(blurError("email", filled({ email: "a@gmail" }))).toBe("ใส่อีเมลที่ใช้ได้");
    expect(blurError("phone", filled({ phone: "081-234" }))).toBe("ใส่เบอร์โทร 10 หลัก");
    expect(blurError("parentPhone", filled({ parentPhone: "02" }))).toBe("ใส่เบอร์ผู้ปกครอง 10 หลัก");
    expect(blurError("email", filled())).toBeUndefined();
  });
});

describe("suggestEmail", () => {
  it("offers a fix for a mistyped mail provider", () => {
    expect(suggestEmail("name@gmial.com")).toBe("name@gmail.com");
    expect(suggestEmail("name@gmail.con")).toBe("name@gmail.com");
    expect(suggestEmail("Name@Hotmal.com")).toBe("name@hotmail.com");
    expect(suggestEmail("name@gmail")).toBe("name@gmail.com");
  });

  it("leaves real addresses alone", () => {
    expect(suggestEmail("name@gmail.com")).toBeNull();
    expect(suggestEmail("name@ymail.com")).toBeNull();
    expect(suggestEmail("name@hotmail.co.th")).toBeNull();
    expect(suggestEmail("name@school.ac.th")).toBeNull();
    expect(suggestEmail("name")).toBeNull();
    expect(suggestEmail("name@")).toBeNull();
  });
});

describe("cleanEmailInput", () => {
  it("drops spaces as they're typed", () => {
    expect(cleanEmailInput(" name@gmail.com ")).toBe("name@gmail.com");
  });
});

describe("ageChoicesFor", () => {
  it("offers ages that fit the school year, and none for other", () => {
    expect(ageChoicesFor("m3")).toEqual(["14", "15", "16"]);
    expect(ageChoicesFor("m6")).toEqual(["17", "18", "19"]);
    expect(ageChoicesFor("other")).toEqual([]);
    expect(ageChoicesFor("")).toEqual([]);
  });
});

describe("restoredStep", () => {
  it("keeps a saved screen of this form", () => {
    expect(restoredStep("contact", filled())).toBe("contact");
  });

  it("sends a screen saved by the old form to the first gap", () => {
    expect(restoredStep("heard", filled({ email: "" }))).toBe("contact");
    expect(restoredStep("mode", emptyDraft())).toBe("about");
    expect(restoredStep("name", filled())).toBe("review");
    expect(restoredStep(undefined, emptyDraft())).toBe("about");
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
  it("maps a rejected field back to its screen", () => {
    expect(stepForServerPath(["members", 0, "age"])).toBe("about");
    expect(stepForServerPath(["members", 0, "school"])).toBe("about");
    expect(stepForServerPath(["members", 0, "parentPhone"])).toBe("contact");
    expect(stepForServerPath(["contactEmail"])).toBe("contact");
    expect(stepForServerPath(["inviteCode"])).toBe("about");
    expect(stepForServerPath(["heardFrom"])).toBe("review");
    expect(stepForServerPath(["noRefundAck"])).toBe("review");
  });
});

describe("registrationBody", () => {
  it("sends where they saw the post", () => {
    expect(registrationBody(filled({ heardFrom: "contester" }), undefined).heardFrom).toBe("contester");
  });

  it("sends nothing for where they saw the post when it's skipped", () => {
    const body = registrationBody(filled({ heardFrom: "" }), undefined);
    expect(body.heardFrom).toBeUndefined();
    expect(registrationSchema.safeParse(body).success).toBe(true);
    expect(registrationBody(filled({ heardFrom: "tiktok" }), undefined).heardFrom).toBeUndefined();
  });

  it("is accepted by the API's schema", () => {
    const parsed = registrationSchema.safeParse(registrationBody(filled({ mode: "create", teamName: "ทีมไฟ" }), undefined, "ig"));
    expect(parsed.success).toBe(true);
  });

  it("is accepted for a new team by default, with the team named after the nickname", () => {
    const body = registrationBody(filled({ mode: "create" }), undefined);
    expect(body.teamName).toBe("ทีมชาย");
    expect(registrationSchema.safeParse(body).success).toBe(true);
  });

  it("is accepted for a school picked from the list", () => {
    const body = registrationBody(filled({ school: "โรงเรียนตัวอย่างวิทยา กรุงเทพมหานคร" }), undefined);
    expect(registrationSchema.safeParse(body).success).toBe(true);
  });

  it("drops parent details for adults", () => {
    const body = registrationBody(filled({ age: "21" }), undefined);
    expect(body.members[0].parentName).toBeUndefined();
    expect(registrationSchema.safeParse(body).success).toBe(true);
  });

  it("is rejected by the API without parent consent under 20, as the form says", () => {
    const body = registrationBody(filled({ parentConsent: false }), undefined);
    expect(registrationSchema.safeParse(body).success).toBe(false);
    expect(firstInvalidStep(filled({ parentConsent: false }))).toBe("contact");
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

  it("sends the invite code when joining a friend's team", () => {
    const body = registrationBody(filled({ mode: "join" }), "0123456789ab");
    expect(body.teamMode).toBe("join");
    expect(body.inviteCode).toBe("0123456789ab");
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
  it("blocks a rude nickname on the first screen when it would name the team", () => {
    expect(validateStep("about", filled({ mode: "create", nickname: "ควย" })).nickname).toBeDefined();
    expect(validateStep("about", filled({ mode: "solo", nickname: "ควย" }))).toEqual({});
  });
  it("sends a rejected team name back to the first screen", () => {
    expect(stepForServerPath(["teamName"])).toBe("about");
  });
});

describe("grade", () => {
  it("must be picked on the first screen, and goes to the server with the member", () => {
    expect(validateStep("about", filled({ grade: "" })).grade).toBe("เลือกชั้น");
    expect(validateStep("about", filled({ grade: "m4" }))).toEqual({});
    expect(firstInvalidStep(filled({ grade: "" }))).toBe("about");
    expect(stepForServerPath(["members", 0, "grade"])).toBe("about");
    const body = registrationBody(filled({ grade: "m6" }), undefined);
    expect(body.members[0].grade).toBe("m6");
    expect(registrationSchema.parse(body).members[0].grade).toBe("m6");
  });
});
