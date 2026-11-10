/** @jest-environment node */
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "./proxy";

jest.mock("@supabase/ssr", () => ({ createServerClient: jest.fn() }));
jest.mock("@/lib/supabase/auth", () => ({ isAnonymousUser: () => false }));

const getUser = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  (createServerClient as jest.Mock).mockReturnValue({ auth: { getUser } });
});

it("denies protected pages when authentication throws", async () => {
  getUser.mockRejectedValue(new Error("Auth unreachable"));
  const response = await updateSession(new NextRequest("https://passionseed.org/admin"));
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});

it("keeps public pages available during an authentication outage", async () => {
  getUser.mockRejectedValue(new Error("Auth unreachable"));
  const response = await updateSession(new NextRequest("https://passionseed.org/shift"));
  expect(response.status).toBe(200);
});

it("redirects unauthenticated protected-page visitors to login", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  const response = await updateSession(new NextRequest("https://passionseed.org/admin"));
  expect(response.headers.get("location")).toBe("https://passionseed.org/login");
});

it("rejects an invalid user even when auth returns user data alongside an error", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "revoked" } }, error: { code: "bad_jwt" } });
  const response = await updateSession(new NextRequest("https://passionseed.org/admin"));
  expect(response.headers.get("location")).toBe("https://passionseed.org/login");
});

it("preserves cookie security attributes on a redirect", async () => {
  (createServerClient as jest.Mock).mockImplementation((_url, _key, options) => ({
    auth: { getUser: async () => {
      options.cookies.setAll([{ name: "session-test", value: "test", options: {
        path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 300,
      } }]);
      return { data: { user: null }, error: null };
    } },
  }));
  const response = await updateSession(new NextRequest("https://passionseed.org/admin"));
  const cookie = response.headers.get("set-cookie")!;
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("Secure");
  expect(cookie).toContain("SameSite=lax");
  expect(cookie).toContain("Max-Age=300");
});
