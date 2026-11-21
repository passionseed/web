/**
 * elemental_web_lesson_answer under concurrency, as the web server action
 * meets it: two service_role connections finish the same lesson part for the
 * same member at once (a double tap). Exactly one of them is the first finish,
 * and the audit log gets one lesson_finish row.
 *
 *   pnpm test:elemental:integration supabase/tests/elemental/lessons
 */
import { Client } from "pg";

import { applyAll, connectionString, psql, start, stop } from "@/scripts/elemental/harness";

const GUILD = "800000000000000001";
/** Made-up Discord ids 9000000000000000nn (as strings: they pass 2^53). */
const uid = (n: number) => `9${String(n).padStart(17, "0")}`;

async function serviceClient(): Promise<Client> {
  const client = new Client({ connectionString: connectionString() });
  await client.connect();
  await client.query("SET ROLE service_role");
  return client;
}

type Answer = { first_finish: boolean; badge_awarded: boolean; finished_at: string };

const FINISH = "SELECT public.elemental_web_lesson_answer('elemental-2026', $1, 'interviews', 2, 'done', true) AS r";

describe("elemental lessons under concurrency", () => {
  beforeAll(async () => {
    await start();
    applyAll();
    // Two claimed members (people 1 and 2) on an active fire team, as superuser fixtures.
    psql(`
      INSERT INTO public.elemental_settings (guild_id, edition, team_create_opens_at)
      VALUES ('${GUILD}', 'elemental-2026', now() - interval '1 hour');
      DO $$
      DECLARE
        k integer;
        reg uuid;
        code text;
        team uuid;
      BEGIN
        FOR k IN 1 .. 2 LOOP
          INSERT INTO public.hackathon_event_registrations (event_slug, status, team_name, member_count, amount_baht, contact_email, contact_phone)
          VALUES ('elemental-2026', 'paid', 'Test Group', 1, 0, 'test@example.invalid', '0') RETURNING id INTO reg;
          INSERT INTO public.hackathon_event_registration_members (registration_id, position, full_name, age, school, parent_name, parent_phone, parent_consent)
          VALUES (reg, 1, 'Member', 16, 'Test School', 'Parent', '0', true);
          code := (public.elemental__insert_claim('elemental-2026', 'member',
            (SELECT id FROM public.hackathon_event_registration_members WHERE registration_id = reg))).code;
          PERFORM public.elemental_bot_claim('${GUILD}', code, (900000000000000000 + k)::text);
        END LOOP;
        team := (public.elemental_bot_team_create('${GUILD}', '${uid(1)}', 'Lesson Race', 'fire', ARRAY['${uid(2)}']) ->> 'team_id')::uuid;
        PERFORM public.elemental_bot_team_accept('${GUILD}', team, '${uid(2)}', ARRAY[10]);
      END $$;`);
  }, 240_000);

  afterAll(() => stop());

  it("gives one first finish and one audit row when the same member finishes twice at once", async () => {
    const a = await serviceClient();
    const b = await serviceClient();
    try {
      await a.query("BEGIN");
      const first = await a.query<{ r: Answer }>(FINISH, [uid(1)]);
      // B starts while A holds the new row, so B waits on A's insert.
      const second = b.query<{ r: Answer }>(FINISH, [uid(1)]);
      let waiting = 0;
      for (let i = 0; i < 50 && !waiting; i++) {
        waiting = Number(psql("SELECT count(*) FROM pg_locks WHERE NOT granted"));
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(waiting).toBeGreaterThan(0);
      await a.query("COMMIT");
      const late = await second;

      expect(first.rows[0].r.first_finish).toBe(true);
      expect(first.rows[0].r.badge_awarded).toBe(true);
      expect(late.rows[0].r.first_finish).toBe(false);
      expect(late.rows[0].r.badge_awarded).toBe(false);
      expect(late.rows[0].r.finished_at).toBe(first.rows[0].r.finished_at);
      expect(psql("SELECT count(*) FROM public.elemental_audit WHERE action = 'lesson_finish'").trim()).toBe("1");
      expect(psql("SELECT count(*) FROM public.elemental_badges WHERE kind = 'lesson'").trim()).toBe("1");
    } finally {
      await a.end();
      await b.end();
    }
  });
});
