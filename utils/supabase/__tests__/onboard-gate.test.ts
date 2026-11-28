/** @jest-environment node */
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { updateSession } from "@/utils/supabase/proxy";

jest.mock("@supabase/ssr", () => ({ createServerClient: jest.fn() }));

/*
 * The onboard gate in utils/supabase/proxy.ts: signed-in users who have not
 * finished the student onboard go to /onboard, except staff (admins and
 * instructors), who run the product and never take the student onboard.
 */

const USER_ID = "22222222-2222-4222-8222-222222222222";

let staffRoles: string[] = [];
let rolesError: unknown = null;
let profile: Record<string, unknown> | null = null;

interface RoleQuery {
  select: jest.Mock<RoleQuery>;
  eq: jest.Mock<RoleQuery, [string, string]>;
  in: jest.Mock<RoleQuery, [string, string[]]>;
  limit: jest.Mock<Promise<{ data: { role: string }[] | null; error: unknown }>>;
}

interface ConsentQuery {
  select: jest.Mock<ConsentQuery>;
  eq: jest.Mock<ConsentQuery>;
  maybeSingle: jest.Mock<Promise<{ data: null; error: null }>>;
}

function roleQuery(): RoleQuery {
  const filters: { roles?: string[] } = {};
  const query: RoleQuery = {
    select: jest.fn(() => query),
    eq: jest.fn((column: string, value: string) => {
      if (column === "role") filters.roles = [value];
      return query;
    }),
    in: jest.fn((column: string, values: string[]) => {
      if (column === "role") filters.roles = values;
      return query;
    }),
    limit: jest.fn(async () => ({
      data: rolesError ? null : staffRoles.filter((role) => !filters.roles || filters.roles.includes(role)).map((role) => ({ role })),
      error: rolesError,
    })),
  };
  return query;
}

function consentQuery(): ConsentQuery {
  const query: ConsentQuery = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    maybeSingle: jest.fn(async () => ({ data: null, error: null })),
  };
  return query;
}

const rpc = jest.fn((name: string) => {
  if (name === "get_my_profile") {
    return { select: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) };
  }
  // has_hackathon_registration
  return Promise.resolve({ data: false, error: null });
});

const from = jest.fn((table: string) => (table === "user_roles" ? roleQuery() : consentQuery()));

function request(path: string) {
  return new NextRequest(`https://passionseed.test${path}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  staffRoles = [];
  rolesError = null;
  profile = { full_name: "Test", username: "test", date_of_birth: "1990-01-01", is_onboarded: false };
  jest.mocked(createServerClient).mockImplementation(
    () =>
      ({
        auth: {
          getUser: jest.fn(async () => ({
            data: { user: { id: USER_ID, aud: "authenticated", is_anonymous: false, app_metadata: { provider: "email" } } },
            error: null,
          })),
        },
        from,
        rpc,
      }) as never,
  );
});

function redirectedTo(response: Response): string | null {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
}

describe("onboard gate", () => {
  test("a student who has not finished onboarding goes to /onboard", async () => {
    const response = await updateSession(request("/me"));
    expect(redirectedTo(response)).toBe("/onboard");
  });

  test.each(["admin", "instructor"])("a user with the %s role skips the onboard", async (role) => {
    staffRoles = [role];
    const response = await updateSession(request("/me"));
    expect(redirectedTo(response)).toBeNull();
  });

  test("an admin reaches an admin page without onboarding", async () => {
    staffRoles = ["admin"];
    const response = await updateSession(request("/admin/hackathon/elemental"));
    expect(redirectedTo(response)).toBeNull();
  });

  test("other roles still onboard", async () => {
    staffRoles = ["student"];
    const response = await updateSession(request("/me"));
    expect(redirectedTo(response)).toBe("/onboard");
  });

  test("a failed role lookup keeps the gate", async () => {
    rolesError = { message: "boom" };
    const response = await updateSession(request("/me"));
    expect(redirectedTo(response)).toBe("/onboard");
  });

  test("an onboarded student is let through", async () => {
    profile = { ...profile, is_onboarded: true };
    const response = await updateSession(request("/me"));
    expect(redirectedTo(response)).toBeNull();
  });
});
