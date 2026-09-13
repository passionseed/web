import { isCampaignRequest, isPortRequest, isUniRequest } from "@/lib/meta/comment-intent";

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
