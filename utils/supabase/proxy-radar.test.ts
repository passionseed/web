/** @jest-environment node */
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "./proxy";

jest.mock("@supabase/ssr", () => ({ createServerClient: jest.fn() }));
jest.mock("@/lib/supabase/auth", () => ({ isAnonymousUser: () => false }));

// A signed-in student who has not finished onboarding.
function mockHalfOnboardedUser() {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  (createServerClient as jest.Mock).mockReturnValue({
    auth: { getUser: async () => ({ data: { user: { id: "student-1" } }, error: null }) },
    from: () => query,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHalfOnboardedUser();
});

it.each([
  "/radar?utm_source=ig-bio&utm_medium=bio&utm_campaign=radar",
  "/radar/cybersecurity?utm_source=ig-comment-dm&utm_medium=dm",
  "/r/cyber",
])("does not bounce a half-onboarded student from %s to /onboard", async (path) => {
  const response = await updateSession(new NextRequest(`https://passionseed.org${path}`));
  expect(response.headers.get("location")).toBeNull();
});

it("still sends a half-onboarded student elsewhere to /onboard", async () => {
  const response = await updateSession(new NextRequest("https://passionseed.org/me"));
  expect(response.headers.get("location")).toBe("https://passionseed.org/onboard");
});

it("does not exempt look-alike paths", async () => {
  const response = await updateSession(new NextRequest("https://passionseed.org/radarx"));
  expect(response.headers.get("location")).toBe("https://passionseed.org/onboard");
});
