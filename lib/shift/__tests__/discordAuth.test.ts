import { SHIFT_DISCORD_SCOPES, shiftDiscordAuthError, shiftDiscordCallbackUrl } from "../discordAuth";

const token = "abcdefghijklmnopqrstuvwx";

it.each(["https://passionseed.org", "http://localhost:3000"])("keeps the OAuth callback on %s", (origin) => {
  const url = new URL(shiftDiscordCallbackUrl(token, origin));
  expect(url.origin).toBe(origin);
  expect(url.pathname).toBe("/auth/callback");
  expect(url.searchParams.get("next")).toBe(`/shift/join/${token}`);
});

it.each(["http://0.0.0.0:3000", "http://[::]:3000"])("normalizes the development bind address %s", (origin) => {
  expect(new URL(shiftDiscordCallbackUrl(token, origin)).origin).toBe("http://localhost:3000");
});

it("requests identity, email and guild joining as separate Supabase scopes", () => {
  expect(SHIFT_DISCORD_SCOPES.split(",")).toEqual(["identify", "email", "guilds.join"]);
});

it.each([
  ["error_code=identity_already_exists", "discord_identity_exists"],
  ["error=server_error&error_description=Error+getting+user+email+from+external+provider", "discord_email"],
  ["error_code=provider_email_needs_verification", "discord_email"],
  ["error=access_denied", "discord_auth"],
])("gives actionable recovery for %s", (query, expected) => {
  expect(shiftDiscordAuthError(new URLSearchParams(query))).toBe(expected);
});
