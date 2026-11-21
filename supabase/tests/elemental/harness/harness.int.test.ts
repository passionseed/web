/**
 * The sample Elemental integration test: starts the throwaway Postgres from
 * scripts/elemental/harness.ts, applies every migration the SQL check applies,
 * and queries it with node-postgres. Copy this shape for other *.int.test.ts files.
 *
 *   pnpm test:elemental:integration
 */
import { Client } from "pg";

import { applyAll, connectionString, psql, start, stop } from "@/scripts/elemental/harness";

async function query<T extends Record<string, unknown>>(url: string, sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}

describe("elemental harness", () => {
  beforeAll(async () => {
    await start();
    applyAll();
  }, 240_000);

  afterAll(() => stop());

  it("applies the registration migration twice and leaves one slip bucket", async () => {
    const applied = await query<{ pass: number }>(
      connectionString(),
      "SELECT pass FROM test_harness.applied WHERE file = $1 ORDER BY pass",
      ["20261120100519_hackathon_event_registrations.sql"],
    );
    expect(applied.map((row) => row.pass)).toEqual([1, 2]);
    const buckets = await query<{ n: string }>(connectionString(), "SELECT count(*) AS n FROM storage.buckets WHERE id = 'hackathon-slips'");
    expect(Number(buckets[0].n)).toBe(1);
  });

  it("reads and writes the registration tables", async () => {
    const url = connectionString();
    const [reg] = await query<{ id: string }>(
      url,
      `INSERT INTO public.hackathon_event_registrations (event_slug, status, member_count, amount_baht, contact_email, contact_phone)
       VALUES ('elemental-2026', 'paid', 1, 0, 'test@example.invalid', '0') RETURNING id`,
    );
    const rows = await query<{ event_slug: string; status: string }>(
      url,
      "SELECT event_slug, status FROM public.hackathon_event_registrations WHERE id = $1",
      [reg.id],
    );
    expect(rows).toEqual([{ event_slug: "elemental-2026", status: "paid" }]);
  });

  it("checks passwords, so a login role can be tested as the bot would connect", async () => {
    psql(`DROP ROLE IF EXISTS harness_probe; CREATE ROLE harness_probe LOGIN PASSWORD 'probe-pass';`);
    const [row] = await query<{ who: string }>(connectionString("elemental", "harness_probe", "probe-pass"), "SELECT current_user AS who");
    expect(row.who).toBe("harness_probe");
    await expect(query(connectionString("elemental", "harness_probe", "wrong"), "SELECT 1")).rejects.toThrow(/password/);
  });
});
