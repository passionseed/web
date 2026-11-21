/**
 * Concurrency in the Elemental core migration, as the bot meets it: several
 * connections acting as elemental_bot at once. Two activations in the same
 * element get distinct slots (the edition's advisory lock), a burst of
 * activations never shares a slot, and a code is used once when two people
 * race for it. Also checks the migration text never names a whiteboard_* or
 * shift_quest_* object, and that elemental_bot can log in and do nothing but
 * call its functions.
 *
 *   pnpm test:elemental:integration supabase/tests/elemental/core
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Client } from "pg";

import { applyAll, connectionString, MIGRATIONS_DIR, psql, start, stop } from "@/scripts/elemental/harness";

const MIGRATION = "20261123100000_elemental_core.sql";
const GUILD = "800000000000000001";
/** Made-up Discord ids 9000000000000000nn (as strings: they pass 2^53). */
const uid = (n: number) => `9${String(n).padStart(17, "0")}`;

/** A connection that acts as elemental_bot (it has no login of its own in the harness). */
async function botClient(): Promise<Client> {
  const client = new Client({ connectionString: connectionString() });
  await client.connect();
  await client.query("SET ROLE elemental_bot");
  return client;
}

async function withBot<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = await botClient();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** n claimed members (people from..from+n-1) in the real guild, as superuser fixtures. */
function seedMembers(from: number, n: number): void {
  psql(`
    DO $$
    DECLARE
      k integer;
      reg uuid;
      code text;
    BEGIN
      FOR k IN ${from} .. ${from + n - 1} LOOP
        INSERT INTO public.hackathon_event_registrations (event_slug, status, team_name, member_count, amount_baht, contact_email, contact_phone)
        VALUES ('elemental-2026', 'paid', 'Test Group', 1, 0, 'test@example.invalid', '0') RETURNING id INTO reg;
        INSERT INTO public.hackathon_event_registration_members (registration_id, position, full_name, age, school, parent_name, parent_phone, parent_consent)
        VALUES (reg, 1, 'Member', 16, 'Test School', 'Parent', '0', true);
        code := (public.elemental__insert_claim('elemental-2026', 'member',
          (SELECT id FROM public.hackathon_event_registration_members WHERE registration_id = reg))).code;
        PERFORM public.elemental_bot_claim('${GUILD}', code, (900000000000000000 + k)::text);
      END LOOP;
    END $$;`);
}

/** A pending fire team made by `creator` inviting `invitee`; returns its id. */
async function pendingTeam(creator: number, invitee: number, name: string): Promise<string> {
  return withBot(async (client) => {
    const { rows } = await client.query<{ r: { team_id: string } }>(
      "SELECT public.elemental_bot_team_create($1, $2, $3, 'fire', $4) AS r",
      [GUILD, uid(creator), name, [uid(invitee)]],
    );
    return rows[0].r.team_id;
  });
}

describe("elemental core under concurrency", () => {
  beforeAll(async () => {
    await start();
    applyAll();
    psql(`INSERT INTO public.elemental_settings (guild_id, edition, team_create_opens_at)
          VALUES ('${GUILD}', 'elemental-2026', now() - interval '1 hour');`);
    seedMembers(1, 40);
  }, 240_000);

  afterAll(() => stop());

  it("gives two concurrent fire activations distinct slots", async () => {
    const teamA = await pendingTeam(1, 2, "Ember Watch");
    const teamB = await pendingTeam(3, 4, "Spark Line");
    const a = await botClient();
    const b = await botClient();
    try {
      await a.query("BEGIN");
      const first = await a.query<{ r: { slot: number } }>(
        "SELECT public.elemental_bot_team_accept($1, $2, $3, $4::int[]) AS r",
        [GUILD, teamA, uid(2), [12, 40]],
      );
      // B starts while A still holds the edition lock, so it must wait for A.
      const second = b.query<{ r: { slot: number } }>(
        "SELECT public.elemental_bot_team_accept($1, $2, $3, $4::int[]) AS r",
        [GUILD, teamB, uid(4), [12, 40]],
      );
      let waiting = 0;
      for (let i = 0; i < 50 && !waiting; i++) {
        waiting = Number(psql("SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND NOT granted"));
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(waiting).toBe(1);
      await a.query("COMMIT");
      const slots = [first.rows[0].r.slot, (await second).rows[0].r.slot];
      expect(slots).toEqual([12, 40]);
    } finally {
      await a.end();
      await b.end();
    }
  });

  it("never gives two teams the same slot in a burst of activations", async () => {
    const teams: { id: string; invitee: number }[] = [];
    for (let k = 0; k < 8; k++) {
      const creator = 5 + 2 * k;
      teams.push({ id: await pendingTeam(creator, creator + 1, `Burst Team ${k}`), invitee: creator + 1 });
    }
    const results = await Promise.all(
      teams.map(({ id, invitee }) =>
        withBot(async (client) => {
          const { rows } = await client.query<{ r: { slot: number; activated: boolean } }>(
            "SELECT public.elemental_bot_team_accept($1, $2, $3, $4::int[]) AS r",
            [GUILD, id, uid(invitee), [12, 40, 41, 42]],
          );
          return rows[0].r;
        }),
      ),
    );
    expect(results.every((r) => r.activated)).toBe(true);
    const slots = results.map((r) => r.slot);
    expect(new Set(slots).size).toBe(slots.length);
    expect(slots.filter((s) => s === 41 || s === 42)).toHaveLength(2);
    expect(psql("SELECT count(DISTINCT slot) = count(*) FROM public.elemental_teams WHERE slot IS NOT NULL")).toBe("t");
  });

  it("lets only one of two people use the same code", async () => {
    psql(`DO $$
      DECLARE reg uuid;
      BEGIN
        INSERT INTO public.hackathon_event_registrations (event_slug, status, team_name, member_count, amount_baht, contact_email, contact_phone)
        VALUES ('elemental-2026', 'paid', 'Race Group', 1, 0, 'test@example.invalid', '0') RETURNING id INTO reg;
        INSERT INTO public.hackathon_event_registration_members (registration_id, position, full_name, age, school, parent_name, parent_phone, parent_consent)
        VALUES (reg, 1, 'Member', 16, 'Test School', 'Parent', '0', true);
      END $$;`);
    const code = psql("SELECT code FROM public.elemental_issue_claims('elemental-2026') WHERE team_name = 'Race Group'");
    const attempts = await Promise.allSettled(
      [101, 102, 103].map((n) =>
        withBot((client) => client.query("SELECT public.elemental_bot_claim($1, $2, $3) AS r", [GUILD, code, uid(n)])),
      ),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    for (const failed of attempts.filter((a): a is PromiseRejectedResult => a.status === "rejected")) {
      expect(String(failed.reason?.message)).toBe("el:code_used");
    }
    expect(psql(`SELECT count(*) FROM public.elemental_members WHERE claim_id = (SELECT id FROM public.elemental_claims WHERE code = '${code}')`)).toBe("1");
  });

  it("answers already_claimed when one person races two codes", async () => {
    psql(`DO $$
      DECLARE reg uuid;
      BEGIN
        INSERT INTO public.hackathon_event_registrations (event_slug, status, team_name, member_count, amount_baht, contact_email, contact_phone)
        VALUES ('elemental-2026', 'paid', 'Twin Group', 2, 0, 'test@example.invalid', '0') RETURNING id INTO reg;
        INSERT INTO public.hackathon_event_registration_members (registration_id, position, full_name, age, school, parent_name, parent_phone, parent_consent)
        SELECT reg, k, 'Member', 16, 'Test School', 'Parent', '0', true FROM generate_series(1, 2) AS k;
      END $$;`);
    const codes = psql("SELECT code FROM public.elemental_issue_claims('elemental-2026') WHERE team_name = 'Twin Group' ORDER BY position").split("\n");
    expect(codes).toHaveLength(2);
    const a = await botClient();
    const b = await botClient();
    try {
      await a.query("BEGIN");
      await a.query("SELECT public.elemental_bot_claim($1, $2, $3) AS r", [GUILD, codes[0], uid(110)]);
      // B inserts the same person's member row while A's is uncommitted, so it waits on A.
      const second = b.query("SELECT public.elemental_bot_claim($1, $2, $3) AS r", [GUILD, codes[1], uid(110)]).then(
        () => "ok",
        (error: Error) => error.message,
      );
      let waiting = 0;
      for (let i = 0; i < 50 && !waiting; i++) {
        waiting = Number(psql("SELECT count(*) FROM pg_locks WHERE locktype = 'transactionid' AND NOT granted"));
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(waiting).toBe(1);
      await a.query("COMMIT");
      expect(await second).toBe("el:already_claimed");
      expect(psql(`SELECT used_by IS NULL FROM public.elemental_claims WHERE code = '${codes[1]}'`)).toBe("t");
    } finally {
      await a.end();
      await b.end();
    }
  });

  it("lets elemental_bot log in, call its functions and read nothing", async () => {
    psql("ALTER ROLE elemental_bot WITH LOGIN PASSWORD 'harness-only-pass'");
    const client = new Client({ connectionString: connectionString("elemental", "elemental_bot", "harness-only-pass") });
    await client.connect();
    try {
      const { rows } = await client.query<{ r: { edition: string } }>("SELECT public.elemental_bot_settings_get($1) AS r", [GUILD]);
      expect(rows[0].r.edition).toBe("elemental-2026");
      await expect(client.query("SELECT count(*) FROM public.elemental_members")).rejects.toThrow(/permission denied/);
      await expect(client.query("SELECT * FROM public.elemental_island_public('elemental-2026')")).rejects.toThrow(/permission denied/);
    } finally {
      await client.end();
      psql("ALTER ROLE elemental_bot WITH NOLOGIN PASSWORD NULL");
    }
  });

  it("names no whiteboard_* or shift_quest_* object in the migration's SQL", () => {
    const sql = readFileSync(join(MIGRATIONS_DIR, MIGRATION), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/--[^\n]*/g, "");
    expect(sql.match(/\b(?:whiteboard_[a-z_]+|shift_quest_[a-z_]+)\b/g)).toBeNull();
    // It reads public.whiteboards only as a foreign key target.
    expect(sql.match(/public\.whiteboards\b/g)).toEqual(["public.whiteboards"]);
  });
});
