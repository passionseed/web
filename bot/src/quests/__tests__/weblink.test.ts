/**
 * @jest-environment node
 */
import { ButtonStyle } from "discord.js";

import { ISLAND_LINK_LABEL, islandLinkButton, islandWebUrl } from "../weblink";

/** The island on the website: the bot's link button reads its address from the environment only. */

const env = (vars: Record<string, string | undefined>): NodeJS.ProcessEnv => vars as NodeJS.ProcessEnv;

describe("islandWebUrl", () => {
  it("is null when neither address is set, or both are blank", () => {
    expect(islandWebUrl(env({}))).toBeNull();
    expect(islandWebUrl(env({ SHIFT_ISLAND_URL: "  ", NEXT_PUBLIC_SITE_URL: "" }))).toBeNull();
  });

  it("uses SHIFT_ISLAND_URL as it is, ahead of the site address", () => {
    expect(
      islandWebUrl(env({ SHIFT_ISLAND_URL: "https://island.example.org/play", NEXT_PUBLIC_SITE_URL: "https://www.passionseed.org" }))
    ).toBe("https://island.example.org/play");
    expect(islandWebUrl(env({ SHIFT_ISLAND_URL: " https://www.passionseed.org/shift/island " }))).toBe(
      "https://www.passionseed.org/shift/island"
    );
  });

  it("falls back to the site address plus /shift/island, with or without a trailing slash", () => {
    expect(islandWebUrl(env({ NEXT_PUBLIC_SITE_URL: "https://www.passionseed.org" }))).toBe("https://www.passionseed.org/shift/island");
    expect(islandWebUrl(env({ NEXT_PUBLIC_SITE_URL: "https://www.passionseed.org/" }))).toBe("https://www.passionseed.org/shift/island");
    expect(islandWebUrl(env({ NEXT_PUBLIC_SITE_URL: "https://www.passionseed.org///" }))).toBe("https://www.passionseed.org/shift/island");
  });

  it("refuses plain http by default, even on this computer (Discord may refuse the button)", () => {
    expect(islandWebUrl(env({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }))).toBeNull();
    expect(islandWebUrl(env({ SHIFT_ISLAND_URL: "http://127.0.0.1:3000/shift/island" }))).toBeNull();
  });

  it("allows plain http only on this computer, and only when asked to", () => {
    const allow = { SHIFT_ISLAND_URL_ALLOW_HTTP: "1" };
    expect(islandWebUrl(env({ ...allow, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }))).toBe("http://localhost:3000/shift/island");
    expect(islandWebUrl(env({ ...allow, SHIFT_ISLAND_URL: "http://127.0.0.1:3000/shift/island" }))).toBe(
      "http://127.0.0.1:3000/shift/island"
    );
    expect(islandWebUrl(env({ ...allow, NEXT_PUBLIC_SITE_URL: "http://example.com" }))).toBeNull();
    expect(islandWebUrl(env({ ...allow, SHIFT_ISLAND_URL: "http://www.passionseed.org/shift/island" }))).toBeNull();
    expect(islandWebUrl(env({ ...allow, SHIFT_ISLAND_URL: "http://localhost.example.com/shift/island" }))).toBeNull();
    expect(islandWebUrl(env({ SHIFT_ISLAND_URL_ALLOW_HTTP: "true", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }))).toBeNull();
  });

  it("refuses garbage, other schemes, logins, spaces and overlong addresses", () => {
    for (const bad of [
      "not a url",
      "www.passionseed.org/shift/island",
      "javascript:alert(1)",
      "ftp://www.passionseed.org/shift/island",
      "https://user:secret@www.passionseed.org/shift/island",
      "https://www.passionseed.org/shift island",
      `https://www.passionseed.org/${"a".repeat(500)}`,
    ]) {
      expect([bad, islandWebUrl(env({ SHIFT_ISLAND_URL: bad }))]).toEqual([bad, null]);
    }
    // A site address with a query or fragment would swallow the path.
    expect(islandWebUrl(env({ NEXT_PUBLIC_SITE_URL: "https://www.passionseed.org/?a=1" }))).toBeNull();
    expect(islandWebUrl(env({ NEXT_PUBLIC_SITE_URL: "https://www.passionseed.org#top" }))).toBeNull();
    expect(islandWebUrl(env({ NEXT_PUBLIC_SITE_URL: "garbage" }))).toBeNull();
  });

  it("does not fall back when SHIFT_ISLAND_URL is set but refused", () => {
    expect(islandWebUrl(env({ SHIFT_ISLAND_URL: "http://example.com", NEXT_PUBLIC_SITE_URL: "https://www.passionseed.org" }))).toBeNull();
  });

  it("reads process.env when it is called, not when it is loaded", () => {
    const saved = { ...process.env };
    try {
      delete process.env.SHIFT_ISLAND_URL;
      delete process.env.NEXT_PUBLIC_SITE_URL;
      expect(islandWebUrl()).toBeNull();
      process.env.NEXT_PUBLIC_SITE_URL = "https://www.passionseed.org";
      expect(islandWebUrl()).toBe("https://www.passionseed.org/shift/island");
    } finally {
      process.env = saved;
    }
  });
});

describe("islandLinkButton", () => {
  it("is a link-style button to the island page with no custom id", () => {
    const button = islandLinkButton(env({ NEXT_PUBLIC_SITE_URL: "https://www.passionseed.org" }));
    expect(button).not.toBeNull();
    const json = button!.toJSON() as { style: number; url?: string; label?: string; custom_id?: string };
    expect(json.style).toBe(ButtonStyle.Link);
    expect(json.url).toBe("https://www.passionseed.org/shift/island");
    expect(json.label).toBe("🌐 เปิดเกาะบนเว็บ");
    expect(json.label).toBe(ISLAND_LINK_LABEL);
    expect(json.custom_id).toBeUndefined();
  });

  it("is null when no address is configured or the address is refused", () => {
    expect(islandLinkButton(env({}))).toBeNull();
    expect(islandLinkButton(env({ SHIFT_ISLAND_URL: "http://example.com" }))).toBeNull();
  });
});
