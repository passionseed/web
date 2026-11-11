/** @jest-environment node */
import type { User } from "@supabase/supabase-js";

jest.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => undefined }) }));

import { GET as authCallback } from "@/app/auth/callback/route";

import { accountLabel, discordActor } from "../identity";

const SNOWFLAKE = "123456789012345678";

function user(identities: unknown[], over: Partial<User> = {}): User {
  return {
    id: "user-1",
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-11-01T00:00:00Z",
    identities,
    ...over,
  } as User;
}

function discord(data: Record<string, unknown>, id: string = SNOWFLAKE) {
  return { id, identity_id: "identity-uuid", user_id: "user-1", provider: "discord", identity_data: data };
}

describe("discordActor", () => {
  it("reads a Discord account linked to a Google sign-in (linkIdentity)", () => {
    const u = user(
      [
        { id: "google-1", provider: "google", identity_data: { email: "a@example.com" } },
        discord({ user_name: "mintty#0", avatar_url: "https://cdn.discordapp.com/avatars/1/a.png" }),
      ],
      { email: "a@example.com" }
    );
    expect(discordActor(u)).toEqual({
      actor: SNOWFLAKE,
      name: "mintty",
      avatarUrl: "https://cdn.discordapp.com/avatars/1/a.png",
    });
  });

  it("prefers the Discord display name (custom_claims.global_name)", () => {
    const u = user([discord({ user_name: "mintty#0", full_name: "mintty", custom_claims: { global_name: "  Mint  " } })]);
    expect(discordActor(u)?.name).toBe("Mint");
  });

  it("falls back to full_name, then a neutral label", () => {
    expect(discordActor(user([discord({ full_name: "Ploy" })]))?.name).toBe("Ploy");
    expect(discordActor(user([discord({})]))?.name).toBe("สมาชิก SHIFT");
  });

  it("caps the name at 40 characters", () => {
    const long = "ก".repeat(60);
    expect(discordActor(user([discord({ custom_claims: { global_name: long } })]))?.name).toHaveLength(40);
  });

  it("drops a non-https avatar", () => {
    expect(discordActor(user([discord({ user_name: "a", avatar_url: "http://x/a.png" })]))?.avatarUrl).toBeNull();
  });

  it("refuses an id that is not a snowflake", () => {
    expect(discordActor(user([discord({ user_name: "a" }, "1234")]))).toBeNull();
    expect(discordActor(user([discord({ user_name: "a" }, "12345678901234567890123")]))).toBeNull();
    expect(discordActor(user([discord({ user_name: "a" }, "12345678901234567a")]))).toBeNull();
  });

  it("is null without a Discord identity or a user", () => {
    expect(discordActor(user([{ id: "g", provider: "google", identity_data: {} }]))).toBeNull();
    expect(discordActor(null)).toBeNull();
  });
});

describe("accountLabel", () => {
  it("is the email, or null", () => {
    expect(accountLabel(user([], { email: " a@example.com " }))).toBe("a@example.com");
    expect(accountLabel(user([], { email: "" }))).toBeNull();
    expect(accountLabel(null)).toBeNull();
  });
});

describe("a failed Discord sign-in from the island", () => {
  const failed = (next: string, extra = "") =>
    authCallback(
      new Request(`http://localhost:3000/auth/callback?next=${encodeURIComponent(next)}&error=access_denied${extra}`)
    );

  it.each([
    ["&error_code=identity_already_exists", "discord_identity_exists"],
    ["&error_code=provider_email_needs_verification", "discord_email"],
    ["", "discord_auth"],
  ])("returns to /shift/island with a reason (%s)", async (extra, reason) => {
    const res = await failed("/shift/island", extra);
    expect(res.headers.get("location")).toBe(`http://localhost:3000/shift/island?auth_error=${reason}`);
  });

  it("keeps the island for deeper island paths, and nothing else", async () => {
    expect((await failed("/shift/island/quest")).headers.get("location")).toBe(
      "http://localhost:3000/shift/island?auth_error=discord_auth"
    );
    expect((await failed("/shift/islands")).headers.get("location")).toContain("/auth/auth-code-error");
    expect((await failed("/me")).headers.get("location")).toContain("/auth/auth-code-error");
  });
});
