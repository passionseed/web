/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "./route";
import { createAdminClient } from "@/utils/supabase/admin";
import { GUIDE_INDEX } from "@/lib/radar-guides";

const pending: Array<() => Promise<void>> = [];
jest.mock("next/server", () => ({ ...jest.requireActual("next/server"), after: (fn: () => Promise<void>) => pending.push(fn) }));
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

const IG_UA = "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 Instagram 334.0.4.32.98";

type Tables = {
  radar_links?: Record<string, unknown> | null;
  radar_fields?: Record<string, unknown> | null;
};

function mockDatabase(tables: Tables, insertError: { code: string } | null = null) {
  const insert = jest.fn().mockResolvedValue({ error: insertError });
  const from = jest.fn((table: string) => {
    if (table === "radar_link_clicks") return { insert };
    const filters: Record<string, unknown> = {};
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        filters[column] = value;
        return query;
      },
      maybeSingle: async () => {
        const row = tables[table as keyof Tables] ?? null;
        // radar_fields answers only for its own slug, like the real lookup.
        const matches = !row || table !== "radar_fields" || filters.slug === undefined || row.slug === filters.slug;
        return { data: matches ? row : null, error: null };
      },
    };
    return query;
  });
  (createAdminClient as jest.Mock).mockReturnValue({ from });
  return { insert, from };
}

function get(path: string, userAgent = IG_UA) {
  const url = `https://passionseed.org${path}`;
  const code = path.split("?")[0].replace(/^\/r\//, "");
  return GET(new NextRequest(url, { headers: { "user-agent": userAgent } }), {
    params: Promise.resolve({ code }),
  });
}

beforeEach(() => {
  pending.length = 0;
});

test("redirects a reel link to its guide page, and logs the click after the response", async () => {
  const { insert } = mockDatabase({
    radar_links: {
      code: "cyber-money-k3f9",
      field_slug: "cybersecurity",
      chapter_key: "money",
      utm_source: "ig-comment-dm",
      utm_medium: "dm",
      utm_campaign: "radar",
      utm_content: "cybersecurity-founder-DA1b2C3",
      is_active: true,
    },
    radar_fields: { slug: "cybersecurity" },
  });
  const response = await get("/r/cyber-money-k3f9");
  expect(response.status).toBe(302);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("location")).toBe(
    "https://passionseed.org/radar/cybersecurity/money?utm_source=ig-comment-dm&utm_medium=dm&utm_campaign=radar&utm_content=cybersecurity-founder-DA1b2C3"
  );
  expect(insert).not.toHaveBeenCalled();
  expect(pending).toHaveLength(1);
  await pending[0]();
  expect(insert).toHaveBeenCalledWith({
    code: "cyber-money-k3f9",
    field_slug: "cybersecurity",
    page_key: "money",
    ua_app: "instagram",
  });
});

test("a typed alias with a page lands on that guide page and logs the page", async () => {
  const { insert } = mockDatabase({ radar_links: null, radar_fields: { slug: "cybersecurity" } });
  const response = await get("/r/cyber-mythos");
  expect(response.headers.get("location")).toBe(
    "https://passionseed.org/radar/cybersecurity/mythos?utm_source=tiktok-alias&utm_medium=alias&utm_campaign=radar&utm_content=cybersecurity-mythos-alias"
  );
  await pending[0]();
  expect(insert).toHaveBeenCalledWith({ code: "cyber-mythos", field_slug: "cybersecurity", page_key: "mythos", ua_app: "instagram" });
});

test("a draft guide on production lands on the career, not a 404 page", async () => {
  const env = process.env.VERCEL_ENV;
  const meta = GUIDE_INDEX.cybersecurity as { status: string };
  const status = meta.status;
  process.env.VERCEL_ENV = "production";
  meta.status = "draft";
  try {
    mockDatabase({ radar_links: null, radar_fields: { slug: "cybersecurity" } });
    const response = await get("/r/cyber-mythos");
    expect(new URL(response.headers.get("location")!).pathname).toBe("/radar/cybersecurity");
  } finally {
    meta.status = status;
    if (env === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = env;
  }
});

test("a typeable TikTok alias lands on the career", async () => {
  const { insert } = mockDatabase({ radar_links: null, radar_fields: { slug: "cybersecurity" } });
  const response = await get("/r/cyber", "Mozilla/5.0 musical_ly_34.5.0");
  expect(response.headers.get("location")).toBe(
    "https://passionseed.org/radar/cybersecurity?utm_source=tiktok-alias&utm_medium=alias&utm_campaign=radar&utm_content=cybersecurity-alias"
  );
  await pending[0]();
  expect(insert).toHaveBeenCalledWith({ code: "cyber", field_slug: "cybersecurity", page_key: null, ua_app: "tiktok" });
});

test("does not accept arbitrary redirect destinations", async () => {
  mockDatabase({});
  for (const path of [
    "/r/zzz?to=https://evil.example",
    "/r/zzz?next=//evil.example&url=https://evil.example",
    "/r/https%3A%2F%2Fevil.example",
  ]) {
    pending.length = 0;
    const response = await get(path);
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("https://passionseed.org");
    expect(location.pathname).toBe("/radar");
    expect(location.searchParams.get("utm_source")).toBe("shortlink");
  }
});

test("lands on the code guide when the database is unavailable, and swallows logging failures", async () => {
  (createAdminClient as jest.Mock).mockImplementation(() => {
    throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
  });
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  const response = await get("/r/cyber-tt");
  expect(response.status).toBe(302);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("location")).toBe(
    "https://passionseed.org/radar/cybersecurity?utm_source=tiktok-bio&utm_medium=bio&utm_campaign=radar&utm_content=cybersecurity-tt"
  );
  await expect(pending[0]()).resolves.toBeUndefined();
  // Careers without a code guide still fall back to the hub.
  const other = await get("/r/software-engineer");
  expect(other.headers.get("location")?.startsWith("https://passionseed.org/radar?")).toBe(true);
  log.mockRestore();
});

test("a failed click insert does not throw", async () => {
  mockDatabase({ radar_links: null, radar_fields: null }, { code: "42P01" });
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  const response = await get("/r/zzz");
  expect(response.status).toBe(302);
  await expect(pending[0]()).resolves.toBeUndefined();
  expect(log).toHaveBeenCalledWith("[radar] short link click not logged", "42P01");
  log.mockRestore();
});

test("link preview crawlers are redirected but not counted as clicks", async () => {
  mockDatabase({ radar_links: null, radar_fields: { slug: "cybersecurity" } });
  const response = await get("/r/cyber", "facebookexternalhit/1.1");
  expect(response.status).toBe(302);
  expect(pending).toHaveLength(0);
});

test("a malformed code is redirected but not logged", async () => {
  mockDatabase({});
  const response = await get("/r/https%3A%2F%2Fevil.example");
  expect(response.status).toBe(302);
  expect(pending).toHaveLength(0);
});

test("one client's clicks are logged at most 20 times a minute; the redirect always works", async () => {
  mockDatabase({ radar_links: null, radar_fields: { slug: "cybersecurity" } });
  const send = (n: number) =>
    GET(
      new NextRequest("https://passionseed.org/r/cyber", {
        headers: { "user-agent": IG_UA, "x-forwarded-for": "203.0.113.77" },
      }),
      { params: Promise.resolve({ code: "cyber" }) }
    ).then((r) => ({ n, status: r.status }));
  const results = await Promise.all(Array.from({ length: 25 }, (_, i) => send(i)));
  expect(results.every((r) => r.status === 302)).toBe(true);
  expect(pending).toHaveLength(20);
});
