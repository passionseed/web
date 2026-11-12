/** @jest-environment node */
import { lintText } from "@/lib/marketing/copyRules";

const send = jest.fn();
jest.mock("@/lib/trials/parent-email", () => ({
  ...jest.requireActual("@/lib/trials/parent-email"),
  configuredParentEmailTransport: () => ({ send }),
}));

import { buildIslandParentEmail, sendIslandParentEmail, thaiExpiry } from "../email";

const URL = "https://passionseed.org/shift/island/parent/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";
const EXPIRES = "2026-11-25T05:00:00.000Z";
const HASH = "a".repeat(64);
const PARENT = "parent@example.com";

let errorLog: jest.SpyInstance;

beforeEach(() => {
  send.mockReset();
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => errorLog.mockRestore());

/** The visible text of the email: tags dropped, entities decoded. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

describe("buildIslandParentEmail", () => {
  it("names only the nickname, links the page and says when the link ends", () => {
    const email = buildIslandParentEmail({ nickname: "มิ้นต์", url: URL, expiresAt: EXPIRES });
    expect(email.subject).toBe("ขอความยินยอมจากผู้ปกครอง: เกาะ SHIFT High ของ มิ้นต์");
    expect(email.html).toContain(`href="${URL}"`);
    expect(text(email.html)).toContain(`ลิงก์ใช้ได้ถึง ${thaiExpiry(EXPIRES)}`);
    expect(text(email.html)).toContain("ถ้าไม่ใช่ผู้ปกครองของ มิ้นต์ ไม่ต้องทำอะไรค่ะ");
  });

  it("cuts a nickname to plain letters, so it can never carry a link or markup", () => {
    const email = buildIslandParentEmail({ nickname: '<a href="https://evil.example">Mint</a>', url: URL, expiresAt: EXPIRES });
    expect(email.html).not.toContain("evil.example");
    expect(email.html).not.toContain("<a href=\"https://evil");
    expect(email.subject).not.toContain("<");
  });

  it("falls back to a neutral word when nothing is left of the nickname", () => {
    expect(buildIslandParentEmail({ nickname: "1234", url: URL, expiresAt: EXPIRES }).subject).toContain("ของ นักเรียน");
  });

  it("follows the copy rules", () => {
    const email = buildIslandParentEmail({ nickname: "มิ้นต์", url: URL, expiresAt: EXPIRES });
    for (const value of [email.subject, text(email.html)]) {
      expect(lintText(value, "email", "instagram")).toEqual([]);
      expect(value).not.toMatch(/[—–]/);
      expect(value).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(value).not.toMatch(/น้อง|ลูก(?!ค้า)|เด็ก/);
    }
  });

  it("leaves the date out rather than printing a broken one", () => {
    expect(thaiExpiry("not a date")).toBe("");
    expect(text(buildIslandParentEmail({ nickname: "มิ้นต์", url: URL, expiresAt: "nope" }).html)).not.toContain("ลิงก์ใช้ได้ถึง");
  });
});

describe("sendIslandParentEmail", () => {
  it("sends once per link with an idempotency key from the token hash", async () => {
    send.mockResolvedValue({ ok: true });
    expect(await sendIslandParentEmail({ to: PARENT, nickname: "มิ้นต์", url: URL, expiresAt: EXPIRES, tokenHash: HASH })).toBe(true);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: PARENT, idempotencyKey: `island-parent-${"a".repeat(32)}` }));
  });

  it("is false when the provider refuses or is not configured, logging a code and never the address", async () => {
    send.mockResolvedValue({ ok: false, transient: true, code: "email_unavailable" });
    expect(await sendIslandParentEmail({ to: PARENT, nickname: "มิ้นต์", url: URL, expiresAt: EXPIRES, tokenHash: HASH })).toBe(false);
    const logged = errorLog.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("email_unavailable");
    expect(logged).not.toContain(PARENT);
  });

  it("never throws", async () => {
    send.mockRejectedValue(new Error(`refused ${PARENT}`));
    expect(await sendIslandParentEmail({ to: PARENT, nickname: "มิ้นต์", url: URL, expiresAt: EXPIRES, tokenHash: HASH })).toBe(false);
    expect(errorLog.mock.calls.flat().map(String).join("\n")).not.toContain(PARENT);
  });
});
