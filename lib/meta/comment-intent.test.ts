import {
  CAMPAIGN_KEYS,
  getCampaign,
  isCampaignRequest,
  isPortRequest,
  isRadarLinkRequest,
  isRadarRequest,
  isShiftRequest,
  isUniRequest,
} from "@/lib/meta/comment-intent";

describe("isPortRequest", () => {
  it.each(["port", "Port", "PORT", "portfolio", "ขอ port ครับ", "พอร์ต", "พอร์ท", "port ค่ะ", "อยากได้พอร์ตค่ะ"])(
    "treats %p as an opt-in",
    (text) => expect(isPortRequest(text)).toBe(true)
  );

  it.each(["support", "important", "airport", "Supporting you", "🔥🔥", "สวยมาก", "@friend ดูนี่", "", null, undefined])(
    "treats %p as not an opt-in",
    (text) => expect(isPortRequest(text as string | null | undefined)).toBe(false)
  );
});

describe("isUniRequest", () => {
  it.each(["uni", "Uni", "UNI", "ขอ uni ครับ", "uni ค่ะ", "ยูนิ"])(
    "treats %p as an opt-in",
    (text) => expect(isUniRequest(text)).toBe(true)
  );

  it.each([
    "university",
    "Universities",
    "uniform",
    "unique",
    "communication",
    "🔥🔥",
    "",
    null,
    undefined,
  ])("treats %p as not an opt-in", (text) =>
    expect(isUniRequest(text as string | null | undefined)).toBe(false)
  );
});

describe("isShiftRequest", () => {
  it.each(["SHIFT", "shift", "Shift ครับ", "ขอลิงก์ shift", "ชิฟ", "ชิฟท์ค่ะ", "SHIFT[1]"])(
    "treats %p as an opt-in",
    (text) => expect(isShiftRequest(text)).toBe(true)
  );

  it.each(["shifting gears", "shifted", "night shifts", "🔥", "", null, undefined])(
    "treats %p as not an opt-in",
    (text) => expect(isShiftRequest(text)).toBe(false)
  );

  it("attributes a SHIFT comment to the shift campaign, even with other keywords", () => {
    expect(getCampaign("shift")).toBe("shift");
    expect(getCampaign("shift port")).toBe("shift");
    expect(isCampaignRequest("ชิฟ")).toBe(true);
  });
});

describe("getCampaign", () => {
  it("attributes each keyword to its campaign", () => {
    expect(getCampaign("uni")).toBe("uni");
    expect(getCampaign("port")).toBe("port");
    expect(getCampaign("พอร์ต")).toBe("port");
  });

  it("attributes a comment naming both to the current campaign", () => {
    expect(getCampaign("uni port")).toBe("uni");
  });

  it("returns null when nothing was opted into", () => {
    expect(getCampaign("university")).toBeNull();
    expect(getCampaign("❤️")).toBeNull();
    expect(getCampaign(null)).toBeNull();
  });
});

describe("isCampaignRequest", () => {
  it("accepts either live campaign keyword", () => {
    expect(isCampaignRequest("port")).toBe(true);
    expect(isCampaignRequest("uni")).toBe(true);
  });

  it("still rejects comments that opted into nothing", () => {
    expect(isCampaignRequest("university")).toBe(false);
    expect(isCampaignRequest("❤️")).toBe(false);
  });
});

describe("isRadarRequest", () => {
  it.each([
    "RADAR",
    "radar",
    "Radar",
    "radar!",
    "RADAR ค่ะ",
    "ขอ radar ค่ะ",
    "#radar",
    "radar🙏",
    "1radar",
    "career radar",
    "เรดาร์",
    "เรด้าร์",
    "เรดาห์",
    "เรดดาร์",
    "ขอเรดาร์ค่ะ",
    "เรดาร์ครับพี่",
  ])("treats %p as an opt-in", (text) => expect(isRadarRequest(text)).toBe(true));

  it.each([
    "radars",
    "radarscope",
    "careerradar",
    "Radarr",
    "red",
    "rad",
    "เรด",
    "เรดบูล",
    "เรดดิท",
    "เรดวัน",
    "สวยมาก",
    "ขอลิงก์ค่ะ",
    "🔥🔥",
    "",
    null,
    undefined,
  ])("treats %p as not an opt-in", (text) =>
    expect(isRadarRequest(text as string | null | undefined)).toBe(false)
  );
});

describe("isRadarLinkRequest", () => {
  it.each([
    "ขอลิงก์ค่ะ",
    "ขอลิงค์ด้วยครับ",
    "ขอ ลิ้งค์ หน่อย",
    "ขอลิ้งหน่อยค่ะ",
    "ส่งลิงก์ด้วย",
    "ส่งลิงค์ให้หน่อย",
    "อยากได้ลิงก์ค่ะ",
    "ขอข้อมูลหน่อย",
    "ขอ radar",
    "link please",
    "Link pls",
    "ขอ link ค่ะ",
  ])("treats %p as an explicit link request", (text) =>
    expect(isRadarLinkRequest(text)).toBe(true)
  );

  it.each(["สวยมาก", "ขอค่ะ", "อยากได้", "ขอด้วย", "link", "ลิงก์อยู่ไหน", "", null, undefined])(
    "treats %p as not an explicit link request",
    (text) => expect(isRadarLinkRequest(text as string | null | undefined)).toBe(false)
  );

  it("is not a campaign keyword on its own", () => {
    expect(getCampaign("ขอลิงก์ค่ะ")).toBeNull();
    expect(isCampaignRequest("ขอลิงก์ค่ะ")).toBe(false);
  });
});

describe("radar precedence", () => {
  it("lists radar first among the live campaigns", () => {
    expect(CAMPAIGN_KEYS).toEqual(["radar", "shift", "uni", "port"]);
  });

  it("attributes a comment naming radar and another keyword to radar", () => {
    expect(getCampaign("shift radar")).toBe("radar");
    expect(getCampaign("radar port")).toBe("radar");
    expect(getCampaign("uni เรดาร์")).toBe("radar");
    expect(getCampaign("ชิฟ radar")).toBe("radar");
  });

  it("leaves the older campaigns' precedence unchanged", () => {
    expect(getCampaign("shift port")).toBe("shift");
    expect(getCampaign("uni port")).toBe("uni");
    expect(getCampaign("ขอลิงก์ shift")).toBe("shift");
    expect(getCampaign("radarscope port")).toBe("port");
  });

  it("counts radar as a campaign request", () => {
    expect(isCampaignRequest("RADAR")).toBe(true);
    expect(isCampaignRequest("เรดาร์")).toBe(true);
    expect(isCampaignRequest("radars")).toBe(false);
  });
});
