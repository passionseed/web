/** @jest-environment node */
import { findPii } from "./pii";

describe("findPii", () => {
  it.each([
    ["email", "contact student@example.com"],
    ["phone", "call 081-234-5678"],
    ["phone", "call 0812345678"],
    ["phone", "call +66 81 234 5678"],
    ["thai_id", "id 1234567890123"],
    ["thai_id", "id 1-2345-67890-12-3"],
    ["card", "card 4111 1111 1111 1111"],
    ["card", "card 4111-1111-1111-1111"],
    ["token", "ghp_abcdefghijklmnopqrstuvwxyz0123456789"],
    ["token", "sk-abcdefghijklmnopqrstuvwxyz"],
    ["token", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ"],
  ])("finds %s in %p", (kind, text) => {
    expect(findPii(text)).toBe(kind);
  });

  it.each([
    "- 2026-10-21 · shift[3] round created in the web app, starts 2026-11-01, 7 days",
    "| shift[3] | Draft | 2026-11-01 | 7 | 2026-11-08 | passionseed.org admin, event 1a2b3c4d | 2026-10-21 |",
    "| shift[3] price per person | ฿1,500 | passionseed.org admin, event 1a2b3c4d | 2026-10-21 |",
    "(event `12345678-1234-4234-8234-123456789012`)",
    "Events: 12345678-1234-4234-8234-123456789012, 87654321-4321-4321-8321-210987654321",
    "|---|---|---|---|---|---|---|",
    "SHIFT camp cohort \"SHIFT[3] รุ่น 3\" created",
  ])("passes clean brain text %p", (text) => {
    expect(findPii(text)).toBeNull();
  });
});
