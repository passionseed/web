/** @jest-environment node */
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import proxy from "@/proxy";
import { isAdminPagePath, routingPathname, updateSession } from "@/utils/supabase/proxy";

jest.mock("@supabase/ssr", () => ({ createServerClient: jest.fn() }));

/*
 * S1 and S3 from docs/features/admin-console.md: admin pages are gated in the
 * proxy (not only in app/admin/layout.tsx), and admin API GETs are never
 * given a public CDN cache header.
 */

const USER_ID = "11111111-1111-4111-8111-111111111111";
let roleReply: { data: unknown; error: unknown } = { data: [], error: null };
let claims: { data: unknown; error: unknown } | Error = { data: null, error: null };
interface RoleQuery {
  select: jest.Mock<RoleQuery>;
  eq: jest.Mock<RoleQuery>;
  limit: jest.Mock<Promise<{ data: unknown; error: unknown }>>;
}
const roleQuery: RoleQuery = {
  select: jest.fn((): RoleQuery => roleQuery),
  eq: jest.fn((): RoleQuery => roleQuery),
  limit: jest.fn(async () => roleReply),
};
const from = jest.fn(() => roleQuery);

function request(path: string, { userAgent, method = "GET" }: { userAgent?: string; method?: string } = {}) {
  return new NextRequest(`https://passionseed.test${path}`, {
    method,
    headers: {
      // Skip the onboarding gate's profile queries; this suite is about admin.
      cookie: `ps_onboarded=${USER_ID}`,
      ...(userAgent ? { "user-agent": userAgent } : {}),
      RSC: "1",
    },
  });
}

function signedInAs(isAdmin: boolean) {
  claims = { data: { claims: { sub: USER_ID, aud: "authenticated", app_metadata: { provider: "email" } } }, error: null };
  roleReply = { data: isAdmin ? [{ role: "admin" }] : [], error: null };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(createServerClient).mockImplementation(
    () =>
      ({
        auth: {
          getClaims: jest.fn(async () => {
            if (claims instanceof Error) throw claims;
            return claims;
          }),
        },
        from,
      }) as never,
  );
});

describe("S3: API cache headers", () => {
  test.each([
    "/api/admin/search",
    "/api/admin/hackathon/team-directions/search",
    "/api/admin/overview/counts",
    "/api/admin/maps/list",
    // Next decodes these before routing, so they reach the admin handlers.
    "/api/%61dmin/hackathon/team-directions/search",
    "/api/admin%2Fsearch",
    "/%61pi/admin/search",
  ])("GET %s is private and never stored", async (path) => {
    const response = await proxy(request(path));
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  test.each([
    ["/api/tcas/programs", "public, s-maxage=300, stale-while-revalidate=600"],
    ["/api/spotify/search", "public, s-maxage=300, stale-while-revalidate=600"],
    ["/api/deezer/search", "public, s-maxage=300, stale-while-revalidate=600"],
  ])("GET %s keeps its public cache rule", async (path, header) => {
    const response = await proxy(request(path));
    expect(response.headers.get("cache-control")).toBe(header);
  });

  // These answer per signed-in user: a public CDN copy would hand one
  // student's progress or assignments to the next request.
  test.each(["/api/maps/abc", "/api/assignments/xyz"])("GET %s is never publicly cached", async (path) => {
    const response = await proxy(request(path));
    expect(response.headers.get("cache-control")).toBeNull();
  });

  test("other API GETs are left to the route", async () => {
    const response = await proxy(request("/api/me"));
    expect(response.headers.get("cache-control")).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  test.each(["/api/universities/search", "/api/administrator/list", "/api/me/list"])(
    "GET %s gets no public header just for ending in /search or /list",
    async (path) => {
      const response = await proxy(request(path));
      expect(response.headers.get("cache-control")).toBeNull();
    },
  );
});

describe("S1: admin page gate", () => {
  test("matches /admin and below, not look-alikes", () => {
    expect(isAdminPagePath("/admin")).toBe(true);
    expect(isAdminPagePath("/admin/dm-leads")).toBe(true);
    expect(isAdminPagePath("/administrator")).toBe(false);
    expect(isAdminPagePath("/me")).toBe(false);
  });

  test("matches percent-encoded admin paths the way Next's router decodes them", () => {
    expect(isAdminPagePath("/%61dmin/dm-leads")).toBe(true);
    expect(isAdminPagePath("/admin%2Fdm-leads")).toBe(true);
    expect(isAdminPagePath("/%2561dmin")).toBe(true);
    expect(isAdminPagePath("//admin/users")).toBe(true);
    expect(isAdminPagePath("/admin.rsc")).toBe(true);
    expect(isAdminPagePath("/%61dmin/x/%zz")).toBe(true);
    expect(isAdminPagePath("/%61dministrator")).toBe(false);
    expect(isAdminPagePath("/blog/100%")).toBe(false);
    expect(routingPathname("/map/%E0%B8%81")).toBe("/map/ก");
  });

  test("an encoded admin path still sends a non-admin to /me", async () => {
    signedInAs(false);
    for (const path of ["/%61dmin/dm-leads", "/admin%2Fdm-leads"]) {
      const response = await updateSession(request(path));
      expect(new URL(response.headers.get("location")!).pathname).toBe("/me");
    }
  });

  test("a signed-out admin path ending in .md is not treated as public", async () => {
    claims = { data: null, error: null };
    const response = await updateSession(request("/admin/dm-leads/x.md"));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
    const encoded = await updateSession(request("/%61dmin/dm-leads/x.md"));
    expect(new URL(encoded.headers.get("location")!).pathname).toBe("/login");
  });

  test("a signed-in non-admin's RSC request to an admin page goes to /me", async () => {
    signedInAs(false);
    const response = await updateSession(request("/admin/dm-leads?_rsc=abc"));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/me");
    expect(new URL(response.headers.get("location")!).search).toBe("");
    expect(from).toHaveBeenCalledWith("user_roles");
    expect(roleQuery.eq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(roleQuery.eq).toHaveBeenCalledWith("role", "admin");
  });

  test("an admin passes through", async () => {
    signedInAs(true);
    const response = await updateSession(request("/admin"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("a failed role lookup fails closed", async () => {
    signedInAs(true);
    roleReply = { data: null, error: { message: "timeout" } };
    const response = await updateSession(request("/admin/line"));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/me");
  });

  test("signed-out visitors still go to /login", async () => {
    claims = { data: null, error: null };
    const response = await updateSession(request("/admin/talent"));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
    expect(from).not.toHaveBeenCalled();
  });

  test("an unreachable auth server fails closed for admin pages only", async () => {
    claims = new Error("fetch failed");
    const admin = await updateSession(request("/admin/trials"));
    expect(new URL(admin.headers.get("location")!).pathname).toBe("/login");
    const other = await updateSession(request("/me"));
    expect(other.headers.get("location")).toBeNull();
  });

  test("non-admin pages never query roles", async () => {
    signedInAs(false);
    const response = await updateSession(request("/administrator"));
    expect(response.headers.get("location")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  test("link-preview bots are rewritten before any session or role check", async () => {
    const response = await proxy(
      request("/admin/shift/views", { userAgent: "facebookexternalhit/1.1;line-poker/1.0" }),
    );
    expect(response.headers.get("x-middleware-rewrite")).toContain("/link-preview/admin/shift/views");
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
