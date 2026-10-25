import { bangkokInstant } from "./core";
import { DEFAULT_SHARE_TEMPLATE, discordCreatedBody, fillTemplate, notifySettingsSchema } from "./notify";

const block = {
  title: "นั่งทำโปรเจกต์ด้วยกัน",
  startsAt: bangkokInstant("2026-10-25", "19:00"),
  endsAt: bangkokInstant("2026-10-25", "20:00"),
  place: "Discord ห้อง 2",
};

describe("calendar share message", () => {
  it("fills the default template", () => {
    expect(fillTemplate(DEFAULT_SHARE_TEMPLATE, block, "https://x/calendar?block=1")).toBe(
      "📅 นั่งทำโปรเจกต์ด้วยกัน\n🕖 อา. 25 ต.ค. 19:00–20:00\n📍 Discord ห้อง 2\nใครไปด้วยกดตรงนี้ 👉 https://x/calendar?block=1",
    );
  });

  it("drops a line whose placeholder is empty and leaves unknown ones alone", () => {
    expect(fillTemplate("{title}\n📍 {place}\n{link} {who}", { ...block, place: null }, "L")).toBe(
      "นั่งทำโปรเจกต์ด้วยกัน\nL {who}",
    );
  });

  it("builds a Discord post with mentions off", () => {
    const body = discordCreatedBody({ ...block, title: "@everyone party" }, "Mint", "L");
    expect(body.content).toContain("**@everyone party**");
    expect(body.allowed_mentions.parse).toEqual([]);
  });
});

describe("notify settings", () => {
  const base = { igGroupUrl: "", template: "{title} {link}", discordOnCreate: true, remindMinutes: [60, 0] };

  it("accepts an IG thread link and a Discord webhook", () => {
    const parsed = notifySettingsSchema.safeParse({
      ...base,
      igGroupUrl: "https://www.instagram.com/direct/t/1234567890/",
      discordWebhookUrl: "https://discord.com/api/webhooks/123/abc_DEF-1",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invite links, other URLs, and templates without a link", () => {
    expect(notifySettingsSchema.safeParse({ ...base, igGroupUrl: "https://ig.me/j/abc" }).success).toBe(false);
    expect(notifySettingsSchema.safeParse({ ...base, discordWebhookUrl: "https://evil.example/hook" }).success).toBe(false);
    expect(notifySettingsSchema.safeParse({ ...base, template: "{title}" }).success).toBe(false);
  });
});
