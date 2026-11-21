/**
 * The Elemental tester and canvas migration (20261123100100) as the bot meets
 * it: several connections acting as elemental_bot at once, and notes built by
 * lib/elemental/canvas (the bot's own builder) written through
 * elemental_bot_canvas_write. Proves:
 *   - two concurrent first entries light a team's lantern once, and a burst of
 *     entries counts exactly tester_cap;
 *   - SQL's elemental__valid_index agrees with isValidIndex;
 *   - buildNote notes from elemental_bot_canvas_target land in the frame's
 *     zone with increasing valid indices; rewriteNote bumps the version with no
 *     duplicate; the tombstone deletes both elements;
 *   - the migration's SQL creates, alters or grants no whiteboard_* or
 *     shift_quest_* object (it only calls whiteboard_merge_elements).
 *
 *   pnpm test:elemental:integration supabase/tests/elemental/canvas
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Client } from "pg";

import {
  buildNote,
  isPlacementObstacle,
  isValidIndex,
  keyBetween,
  type Box,
  type Note,
  noteIds,
  rewriteNote,
} from "@/lib/elemental/canvas";
import {
  applyAll,
  connectionString,
  MIGRATIONS_DIR,
  psql,
  start,
  stop,
} from "@/scripts/elemental/harness";

const MIGRATION = "20261123100100_elemental_testers_canvas.sql";
const GUILD = "800000000000000001";
/** Made-up Discord ids 9000000000000000nn (as strings: they pass 2^53). */
const uid = (n: number) => `9${String(n).padStart(17, "0")}`;
/** Made-up channel ids 70000000000000000n. */
const chan = (n: number) => `7${String(n).padStart(17, "0")}`;
/** Made-up site accounts and boards. */
const acct = (suffix: string) => `00000000-0000-4000-8000-0000000000${suffix}`;
const OWNER = acct("a0");
const BOARD = acct("f1");

type Target = {
  kind: "test" | "reference" | "ship";
  linked: boolean;
  frame_id: string;
  owner_id: string;
  frame: Box | null;
  zone: Box | null;
  after_index: string | null;
  nearby: (Box & {
    id: string;
    type: string;
    isDeleted: boolean;
    containerId: string | null;
    customData: Record<string, unknown>;
  })[];
  prev: Note | null;
  fields: Record<string, string | null>;
};

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

/** People from..to claim seats and become one live fire team on channel `channel`; returns the team id. */
function seedTeam(
  name: string,
  from: number,
  to: number,
  channel: number,
  slot: number,
): string {
  return psql(`
    DO $$
    DECLARE
      k integer;
      reg uuid;
      code text;
      team jsonb;
    BEGIN
      FOR k IN ${from} .. ${to} LOOP
        INSERT INTO public.hackathon_event_registrations (event_slug, status, team_name, member_count, amount_baht, contact_email, contact_phone)
        VALUES ('elemental-2026', 'paid', 'Test Group', 1, 0, 'test@example.invalid', '0') RETURNING id INTO reg;
        INSERT INTO public.hackathon_event_registration_members (registration_id, position, full_name, age, school, parent_name, parent_phone, parent_consent)
        VALUES (reg, 1, 'Member', 16, 'Test School', 'Parent', '0', true);
        code := (public.elemental__insert_claim('elemental-2026', 'member',
          (SELECT id FROM public.hackathon_event_registration_members WHERE registration_id = reg))).code;
        PERFORM public.elemental_bot_claim('${GUILD}', code, (900000000000000000 + k)::text);
      END LOOP;
      team := public.elemental_bot_team_create_staff('${GUILD}', '900000000000009999', '${name}', 'fire',
        ARRAY(SELECT (900000000000000000 + g)::text FROM generate_series(${from}, ${to}) AS g), '{${slot}}');
      PERFORM public.elemental_bot_team_set_channel('${GUILD}', (team ->> 'team_id')::uuid, '${chan(channel)}');
    END $$;
    SELECT id FROM public.elemental_teams WHERE slot = ${slot} AND edition = 'elemental-2026';`);
}

/** One /tester entry as the bot; returns the reply. */
async function tester(
  client: Client,
  person: number,
  channel: number,
  tried: string,
) {
  const { rows } = await client.query<{
    r: {
      id: string;
      counted: boolean;
      first_counted: boolean;
      team_total: number;
    };
  }>(
    "SELECT public.elemental_bot_tester_add($1, $2, $3, $4, $5, NULL, NULL) AS r",
    [GUILD, chan(channel), uid(person), "a neighbour", tried],
  );
  return rows[0].r;
}

describe("elemental testers and canvases", () => {
  beforeAll(async () => {
    await start();
    applyAll();
    psql(`INSERT INTO public.elemental_settings (guild_id, edition, team_create_opens_at)
          VALUES ('${GUILD}', 'elemental-2026', now() - interval '1 hour');`);
  }, 240_000);

  afterAll(() => stop());

  it("lights the lantern once when two first entries race", async () => {
    const team = seedTeam("Ember Watch", 1, 2, 1, 12);
    const a = await botClient();
    const b = await botClient();
    try {
      await a.query("BEGIN");
      const first = await tester(a, 1, 1, "the map on a phone");
      // B's add waits on the team row A holds.
      const second = tester(b, 2, 1, "the paper map");
      let waiting = 0;
      for (let i = 0; i < 50 && !waiting; i++) {
        waiting = Number(
          psql("SELECT count(*) FROM pg_locks WHERE NOT granted"),
        );
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(waiting).toBe(1);
      await a.query("COMMIT");
      const litAfterFirst = psql(
        `SELECT lit_at FROM public.elemental_teams WHERE id = '${team}'`,
      );
      const other = await second;
      expect([first.first_counted, other.first_counted]).toEqual([true, false]);
      expect([first.team_total, other.team_total]).toEqual([1, 2]);
      expect(
        psql(`SELECT lit_at FROM public.elemental_teams WHERE id = '${team}'`),
      ).toBe(litAfterFirst);
    } finally {
      await a.end();
      await b.end();
    }
  });

  it("gives exactly one first and exactly tester_cap counted entries in a burst", async () => {
    const team = seedTeam("Spark Line", 3, 7, 2, 40);
    const replies = await Promise.all(
      Array.from({ length: 14 }, (_, k) =>
        withBot((client) => tester(client, 3 + (k % 5), 2, `try number ${k}`)),
      ),
    );
    expect(replies.filter((r) => r.first_counted)).toHaveLength(1);
    expect(replies.filter((r) => r.counted)).toHaveLength(10);
    expect(
      psql(
        `SELECT count(*) FROM public.elemental_tester_entries WHERE team_id = '${team}' AND counted`,
      ),
    ).toBe("10");
    expect(
      psql(
        `SELECT count(*) FROM public.elemental_tester_entries WHERE team_id = '${team}'`,
      ),
    ).toBe("14");
    expect(
      psql(
        `SELECT lit_at IS NOT NULL FROM public.elemental_teams WHERE id = '${team}'`,
      ),
    ).toBe("t");
  });

  it("agrees with isValidIndex on which keys are fractional indices", () => {
    const keys = [
      "a0",
      "a1",
      "aV",
      "Zz",
      "b00",
      "b0V",
      "a0V",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzz",
      "A00000000000000000000000001",
    ];
    let last: string | null = null;
    for (let i = 0; i < 300; i++) keys.push((last = keyBetween(last, null)));
    keys.push(
      keyBetween("a0", "a1"),
      keyBetween("a0", "a0V"),
      keyBetween(null, "a0"),
    );
    const invalid = [
      "",
      "a",
      "a00",
      "a0V0",
      "A" + "0".repeat(26),
      "!!",
      "a0-",
      "0a",
      "é0",
      " a0",
      "b0",
      "Z",
    ];
    const all = [...keys, ...invalid];
    const list = all.map((k) => `'${k.replace(/'/g, "''")}'`).join(", ");
    const sql =
      psql(`SELECT string_agg(public.elemental__valid_index(k)::text, ',' ORDER BY o)
                      FROM unnest(ARRAY[${list}]::text[]) WITH ORDINALITY AS v(k, o);`);
    expect(sql.split(",").map((v) => v === "true")).toEqual(
      all.map((k) => isValidIndex(k)),
    );
    expect(invalid.some((k) => isValidIndex(k))).toBe(false);
  });

  describe("notes built by lib/elemental/canvas", () => {
    const entries: string[] = [];

    beforeAll(async () => {
      // A board owned by staff with Ember Watch's project canvas (owner: person 1's site account) and its Test zone.
      psql(`
        INSERT INTO auth.users (id) VALUES ('${OWNER}'), ('${acct("a1")}');
        INSERT INTO auth.identities (provider, provider_id, user_id) VALUES ('discord', '${uid(1)}', '${acct("a1")}');
        INSERT INTO public.whiteboards (id, owner_id, title, elements) VALUES ('${BOARD}', '${OWNER}', 'Fire board', jsonb_build_array(
          jsonb_build_object('id', 'frame-a', 'type', 'frame', 'x', 0, 'y', 0, 'width', 1800, 'height', 1400, 'index', 'a0',
            'version', 1, 'versionNonce', 1, 'isDeleted', false, 'frameId', NULL,
            'customData', jsonb_build_object('project', 'proj-a', 'owner', '${acct("a1")}', 'createdBy', '${acct("a1")}', 'editors', '[]'::jsonb)),
          jsonb_build_object('id', 'zone-test', 'type', 'rectangle', 'x', 40, 'y', 300, 'width', 1300, 'height', 420, 'index', 'a1',
            'version', 1, 'versionNonce', 2, 'isDeleted', false, 'frameId', 'frame-a', 'locked', true,
            'customData', jsonb_build_object('zone', 'test')),
          jsonb_build_object('id', 'sticky', 'type', 'rectangle', 'x', 64, 'y', 396, 'width', 240, 'height', 200, 'index', 'a2',
            'version', 1, 'versionNonce', 3, 'isDeleted', false, 'frameId', 'frame-a', 'customData', jsonb_build_object('card', 'idea'))));
        INSERT INTO public.elemental_boards (edition, board_id, element) VALUES ('elemental-2026', '${BOARD}', 'fire');`);
      await withBot(async (client) => {
        const { rows } = await client.query<{ r: { frame_id: string } }>(
          "SELECT public.elemental_bot_canvas_link($1, $2, $3, $4, $5) AS r",
          [GUILD, chan(1), BOARD, "frame-a", uid(1)],
        );
        expect(rows[0].r.frame_id).toBe("frame-a");
      });
      // The two entries from the race are pending now; one more.
      await withBot((client) => tester(client, 1, 1, "the big-text version"));
      entries.push(
        ...psql(`SELECT e.id FROM public.elemental_tester_entries e JOIN public.elemental_teams t ON t.id = e.team_id
                            WHERE t.slot = 12 ORDER BY e.created_at`).split(
          "\n",
        ),
      );
    });

    /** What the bot's canvas writer builds: a new note, or the saved one rewritten with new text. */
    async function noteFor(
      client: Client,
      entryId: string,
      rewrite?: string,
    ): Promise<Note> {
      const target = (
        await client.query<{ t: Target }>(
          "SELECT public.elemental_bot_canvas_target($1, $2) AS t",
          [GUILD, entryId],
        )
      ).rows[0].t;
      expect(target.linked).toBe(true);
      return rewrite !== undefined && target.prev
        ? rewriteNote(target.prev, rewrite)
        : buildNote({
            entryId,
            kind: target.kind,
            text: `${target.fields.who}: ${target.fields.tried}`,
            frameId: target.frame_id,
            zoneBox: (target.zone ?? target.frame)!,
            obstacles: target.nearby.filter(isPlacementObstacle),
            afterIndex: target.after_index,
            ownerId: target.owner_id,
          });
    }

    async function write(client: Client, entryId: string, note: Note) {
      const { rows } = await client.query<{
        r: {
          ok: boolean;
          status: string;
          reason: string | null;
          dropped: unknown[];
        };
      }>("SELECT public.elemental_bot_canvas_write($1, $2, $3::jsonb) AS r", [
        GUILD,
        entryId,
        JSON.stringify(note),
      ]);
      return rows[0].r;
    }

    const boardNotes = () =>
      JSON.parse(
        psql(`SELECT coalesce(jsonb_agg(el ORDER BY o), '[]') FROM public.whiteboards w, jsonb_array_elements(w.elements) WITH ORDINALITY x(el, o)
              WHERE w.id = '${BOARD}' AND el ->> 'id' LIKE 'el-%'`),
      ) as (Box & {
        id: string;
        index: string;
        version: number;
        isDeleted: boolean;
        frameId: string;
        originalText?: string;
      })[];

    it("writes three notes into the Test zone with increasing valid indices", async () => {
      expect(entries).toHaveLength(3);
      await withBot(async (client) => {
        for (const id of entries) {
          const result = await write(client, id, await noteFor(client, id));
          expect(result).toMatchObject({
            ok: true,
            status: "written",
            reason: null,
            dropped: [],
          });
        }
      });
      const notes = boardNotes();
      expect(notes.map((n) => n.id)).toEqual(
        entries.flatMap((id) => [noteIds(id).rect, noteIds(id).text]),
      );
      const indices = notes.map((n) => n.index);
      expect(indices.every((i) => isValidIndex(i))).toBe(true);
      expect([...indices].sort()).toEqual(indices);
      expect(new Set(indices).size).toBe(indices.length);
      const zone = { x: 40, y: 300, width: 1300, height: 420 };
      const rects = notes.filter((n) => n.id.endsWith("-r"));
      for (const r of rects) {
        expect(r.frameId).toBe("frame-a");
        expect(r.x).toBeGreaterThanOrEqual(zone.x);
        expect(r.x + r.width).toBeLessThanOrEqual(zone.x + zone.width);
        expect(r.y).toBeGreaterThanOrEqual(zone.y);
        // Never over the sticky already in the zone's first slot.
        expect(r.x >= 64 + 240 || r.y >= 396 + 200).toBe(true);
      }
      expect(
        psql(
          `SELECT string_agg(DISTINCT canvas_status, ',') FROM public.elemental_tester_entries WHERE id IN ('${entries.join("','")}')`,
        ),
      ).toBe("written");
    });

    it("rewrites a note one version up with no duplicate, and tombstones both elements", async () => {
      const [first] = entries;
      await withBot(async (client) => {
        await client.query(
          "SELECT public.elemental_bot_tester_edit($1, $2, $3, $4, $5)",
          [GUILD, first, uid(1), "a neighbour", "the map, again"],
        );
        const note = await noteFor(
          client,
          first,
          "a neighbour: the map, again",
        );
        expect(await write(client, first, note)).toMatchObject({
          ok: true,
          status: "written",
        });
        // The same rewrite retried (a resync after a lost reply) changes nothing.
        expect(await write(client, first, note)).toMatchObject({
          ok: true,
          status: "written",
        });
      });
      let notes = boardNotes().filter((n) => n.id.includes(first));
      expect(notes).toHaveLength(2);
      expect(notes.map((n) => n.version)).toEqual([2, 2]);
      expect(notes[1].originalText).toBe("a neighbour: the map, again");

      await withBot(async (client) => {
        await client.query(
          "SELECT public.elemental_bot_tester_remove($1, $2, $3)",
          [GUILD, first, "900000000000009999"],
        );
        const { rows } = await client.query<{
          r: { ok: boolean; status: string };
        }>("SELECT public.elemental_bot_canvas_tombstone($1, $2, $3) AS r", [
          GUILD,
          first,
          "900000000000009999",
        ]);
        expect(rows[0].r).toMatchObject({ ok: true, status: "tombstoned" });
      });
      notes = boardNotes().filter((n) => n.id.includes(first));
      expect(notes.map((n) => [n.isDeleted, n.version])).toEqual([
        [true, 3],
        [true, 3],
      ]);
    });
  });

  it("creates, alters or grants no whiteboard_* or shift_quest_* object", () => {
    const sql = readFileSync(join(MIGRATIONS_DIR, MIGRATION), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/--[^\n]*/g, "");
    const named =
      sql.match(/\b(?:whiteboard_[a-z_]+|shift_quest_[a-z_]+)\b/g) ?? [];
    // It calls the merge (and reads whiteboard ids through its own tables), nothing else.
    expect([...new Set(named)]).toEqual(["whiteboard_merge_elements"]);
    expect(sql).not.toMatch(
      /(?:CREATE|ALTER|DROP|GRANT|REVOKE|COMMENT)[^;]*\b(?:whiteboard_|shift_quest_)/i,
    );
    // public.whiteboards is a foreign key target and read; written only through the merge.
    expect(sql).not.toMatch(
      /(?:ALTER|DROP)\s+TABLE(?:\s+IF\s+EXISTS)?\s+public\.whiteboards\b/i,
    );
    expect(sql).not.toMatch(/\bON\s+(?:TABLE\s+)?public\.whiteboards\b/i);
    expect(sql).not.toMatch(
      /\b(?:UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+public\.whiteboards\b/i,
    );
  });
});
