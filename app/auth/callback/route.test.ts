/** @jest-environment node */

import { GET } from "./route";
import { createServerClient } from "@supabase/ssr";
import { completeShiftJoin } from "@/lib/shift/join";

jest.mock("@supabase/ssr", () => ({ createServerClient: jest.fn() }));
jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({ getAll: () => [], set: jest.fn() })),
}));
jest.mock("@/lib/supabase/funnel-tracking", () => ({
  trackAppRegister: jest.fn(), assignUserToCohort: jest.fn(),
}));
jest.mock("@/lib/shift/join", () => ({ completeShiftJoin: jest.fn() }));

const token = "abcdefghijklmnopqrstuvwx";
const joinPath = `/shift/join/${token}`;

beforeEach(() => jest.clearAllMocks());

function callback(params: Record<string, string>) {
  const url = new URL("https://passionseed.org/auth/callback");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return GET(new Request(url));
}

it.each([
  [{ error_code: "identity_already_exists" }, "discord_identity_exists"],
  [{ error: "server_error", error_description: "Error getting user email from external provider" }, "discord_email"],
  [{ error_code: "provider_email_needs_verification" }, "discord_email"],
  [{ error: "access_denied" }, "discord_auth"],
])("returns a failed SHIFT OAuth flow to its personal join link", async (failure, expected) => {
  const response = await callback({ next: joinPath, ...failure });
  expect(response.headers.get("location")).toBe(`https://passionseed.org${joinPath}?error=${expected}`);
  expect(completeShiftJoin).not.toHaveBeenCalled();
});

it("preserves the join link when code exchange fails", async () => {
  (createServerClient as jest.Mock).mockReturnValue({
    auth: { exchangeCodeForSession: jest.fn().mockResolvedValue({ data: {}, error: { message: "expired code" } }) },
  });
  const response = await callback({ next: joinPath, code: "test-expired-code" });
  expect(response.headers.get("location")).toBe(`https://passionseed.org${joinPath}?error=discord_auth`);
  expect(completeShiftJoin).not.toHaveBeenCalled();
});

it("retains generic OAuth details and a safe destination outside SHIFT", async () => {
  const response = await callback({ next: "https://example.invalid", error_code: "identity_already_exists" });
  const target = new URL(response.headers.get("location")!);
  expect(target.pathname).toBe("/auth/auth-code-error");
  expect(target.searchParams.get("error_code")).toBe("identity_already_exists");
  expect(target.searchParams.get("next")).toBe("/me");
});

it.each([null, "taken"])("completes SHIFT using the existing Discord account and propagates result %s", async (joinError) => {
  const user = { id: "existing-discord-account", created_at: "2025-01-01T00:00:00Z" };
  const session = { provider_token: "test-discord-provider-token" };
  (completeShiftJoin as jest.Mock).mockResolvedValue(joinError);
  (createServerClient as jest.Mock).mockImplementation((_url, _key, options) => ({
    auth: {
      exchangeCodeForSession: jest.fn(async () => {
        options.cookies.setAll([{ name: "test-session", value: "test-session-value", options: { path: "/", httpOnly: true } }]);
        return { data: { user, session }, error: null };
      }),
    },
  }));
  const response = await callback({ next: joinPath, code: "test-oauth-code" });
  expect(completeShiftJoin).toHaveBeenCalledWith({ token, user, providerToken: session.provider_token });
  expect(response.headers.get("location")).toBe(`https://passionseed.org${joinPath}${joinError ? `?error=${joinError}` : ""}`);
  expect(response.headers.get("set-cookie")).toContain("test-session=test-session-value");
});
