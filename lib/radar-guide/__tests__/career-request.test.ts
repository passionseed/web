import {
  CAREER_REQUEST_MAX_CHARS,
  normalizeCareerRequest,
  validateCareerRequest,
} from "../career-request";

describe("validateCareerRequest", () => {
  it.each([
    "https://x.com",
    "http://example.org/page",
    "www.a.th",
    "ดูที่ myshop.co นะ",
    "@someone",
    "a@b.co",
    "081 234 5678",
    "0812345678",
    "081-234-5678",
  ])("rejects contact details: %s", (text) => {
    expect(validateCareerRequest(text)).toEqual({ ok: false, reason: "contact" });
  });

  it.each(["เชฟร้านเบอร์เกอร์", "อินฟลูเอนเซอร์ไอจี", "ไลน์แมน", "นักบัญชี", "Game designer", "หมอฟัน 2 ปี"])(
    "accepts real careers: %s",
    (text) => {
      expect(validateCareerRequest(text)).toEqual({ ok: true, text });
    }
  );

  it("does not treat a dotted word that is not a TLD as a domain", () => {
    expect(validateCareerRequest("Node.js developer").ok).toBe(true);
    expect(validateCareerRequest("นักออกแบบ .community").ok).toBe(true);
    // Postgres \y treats Thai letters as word characters (checked against a UTF-8 cluster).
    expect(validateCareerRequest("ร้าน.coกาแฟ").ok).toBe(true);
  });

  it("normalizes whitespace like the SQL", () => {
    expect(normalizeCareerRequest("  นัก   บัญชี \n")).toBe("นัก บัญชี");
    expect(validateCareerRequest("  นัก   บัญชี ")).toEqual({ ok: true, text: "นัก บัญชี" });
  });

  it("enforces 2 to 80 characters after normalizing", () => {
    expect(validateCareerRequest(" ")).toEqual({ ok: false, reason: "too_short" });
    expect(validateCareerRequest("ก")).toEqual({ ok: false, reason: "too_short" });
    expect(validateCareerRequest(null)).toEqual({ ok: false, reason: "too_short" });
    expect(validateCareerRequest("ก".repeat(CAREER_REQUEST_MAX_CHARS)).ok).toBe(true);
    expect(validateCareerRequest("ก".repeat(CAREER_REQUEST_MAX_CHARS + 1))).toEqual({ ok: false, reason: "too_long" });
  });
});
