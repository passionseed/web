/**
 * /tester end to end on a throwaway Postgres (scripts/elemental/harness.ts):
 * the real feature handler, the real elemental_bot_* functions called as the
 * elemental_bot role, the real note builder, and a fixture board. Discord is
 * a fake (no network).
 *
 * Proves: three entries make three notes in the linked frame's Test zone with
 * increasing valid fractional indices; an edit rewrites the same note one
 * version up with no duplicate; the replies say counted and written.
 *
 *   pnpm test:elemental:integration bot/src/elemental/__tests__/tester.int.test.ts
 */
import { Routes, type Client as DiscordClient } from "discord.js";
import { Client } from "pg";

import { isValidIndex, noteIds, type Box } from "../../../../lib/elemental/canvas";
import { applyAll, connectionString, psql, start, stop } from "../../../../scripts/elemental/harness";
import { createElementalApi, type Queryable } from "../api";
import type { ElementalRuntime, RepliableInteraction } from "../context";
import { TESTER, noteText } from "../copy/tester";
import { ACTIONS } from "../features/tester";
import { createRuntime, handleElementalInteraction } from "../index";
import { createKeyedQueue } from "../queue";

// Made-up ids only.
const GUILD = "800000000000000101";
const PAID = "300000000000000106";
const MIRROR = "400000000000000103";
const FIRE_CAT = "500000000000000140";
const THREAD = "600000000000000101";
const uid = (n: number) => `9${String(n).padStart(17, "0")}`;
const chan = (n: number) => `7${String(n).padStart(17, "0")}`;
const acct = (suffix: string) => `00000000-0000-4000-8000-0000000000${suffix}`;
const OWNER = acct("b0");
const BOARD = acct("e1");
const ZONE = { x: 40, y: 300, width: 1300, height: 420 };

/** People from..to claim seats and become one live fire team on channel `channel`. */
function seedTeam(name: string, from: number, to: number, channel: number, slot: number): string {
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

function fakeDiscord() {
  let n = 0;
  const posts: { route: string; body: unknown }[] = [];
  const rest = {
    get: jest.fn(async (route: string) =>
      route === Routes.guildActiveThreads(GUILD) ? { threads: [{ id: THREAD, parent_id: MIRROR, name: TESTER.threadName("fire") }] } : { threads: [] }
    ),
    post: jest.fn(async (route: string, o: { body?: unknown }) => {
      posts.push({ route, body: o?.body });
      n += 1;
      return { id: `71000000000000${String(n).padStart(4, "0")}` };
    }),
    patch: jest.fn(async () => ({})),
  };
  return { client: { rest } as unknown as DiscordClient, posts, rest };
}

function modal(person: number, customId: string, values: Record<string, string>) {
  const sent: Record<string, unknown>[] = [];
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: chan(1),
    channel: { parentId: FIRE_CAT },
    user: { id: uid(person) },
    member: { roles: [PAID] },
    customId,
    deferred: false,
    replied: false,
    inGuild: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => false,
    isMessageComponent: () => false,
    isModalSubmit: () => true,
    isFromMessage: () => false,
    fields: { getTextInputValue: (id: string) => values[id] ?? "" },
    deferReply: jest.fn(async () => {
      i.deferred = true;
    }),
    reply: jest.fn(async (p: Record<string, unknown>) => void sent.push(p)),
    editReply: jest.fn(async (p: Record<string, unknown>) => {
      i.replied = true;
      sent.push(p);
    }),
    followUp: jest.fn(async (p: Record<string, unknown>) => void sent.push(p)),
    deleteReply: jest.fn(async () => undefined),
  };
  return { i: i as unknown as RepliableInteraction, sent };
}

type BoardEl = Box & { id: string; index: string; version: number; isDeleted: boolean; frameId: string; originalText?: string; customData?: Record<string, unknown> };

const boardNotes = () =>
  JSON.parse(
    psql(`SELECT coalesce(jsonb_agg(el ORDER BY o), '[]') FROM public.whiteboards w, jsonb_array_elements(w.elements) WITH ORDINALITY x(el, o)
          WHERE w.id = '${BOARD}' AND el ->> 'id' LIKE 'el-%'`)
  ) as BoardEl[];

describe("/tester on a real database", () => {
  let db: Client;
  let rt: ElementalRuntime;
  let discord: ReturnType<typeof fakeDiscord>;
  const firsts: string[] = [];

  beforeAll(async () => {
    await start();
    applyAll();
    psql(`INSERT INTO public.elemental_settings (guild_id, edition, team_create_opens_at, role_ids, channel_ids, element_category_ids)
          VALUES ('${GUILD}', 'elemental-2026', now() - interval '1 hour',
                  '{"paid": "${PAID}"}', '{"mirror": "${MIRROR}"}', '{"fire": ["${FIRE_CAT}"]}');`);
    seedTeam("Ember Watch", 1, 2, 1, 12);
    // A staff-owned fire board with the team's project canvas (owner: person 1's site account), its Test zone and a sticky.
    psql(`
      INSERT INTO auth.users (id) VALUES ('${OWNER}'), ('${acct("b1")}');
      INSERT INTO auth.identities (provider, provider_id, user_id) VALUES ('discord', '${uid(1)}', '${acct("b1")}');
      INSERT INTO public.whiteboards (id, owner_id, title, elements) VALUES ('${BOARD}', '${OWNER}', 'Fire board', jsonb_build_array(
        jsonb_build_object('id', 'frame-a', 'type', 'frame', 'x', 0, 'y', 0, 'width', 1800, 'height', 1400, 'index', 'a0',
          'version', 1, 'versionNonce', 1, 'isDeleted', false, 'frameId', NULL,
          'customData', jsonb_build_object('project', 'proj-a', 'owner', '${acct("b1")}', 'createdBy', '${acct("b1")}', 'editors', '[]'::jsonb)),
        jsonb_build_object('id', 'zone-test', 'type', 'rectangle', 'x', ${ZONE.x}, 'y', ${ZONE.y}, 'width', ${ZONE.width}, 'height', ${ZONE.height}, 'index', 'a1',
          'version', 1, 'versionNonce', 2, 'isDeleted', false, 'frameId', 'frame-a', 'locked', true,
          'customData', jsonb_build_object('zone', 'test')),
        jsonb_build_object('id', 'sticky', 'type', 'rectangle', 'x', 64, 'y', 396, 'width', 240, 'height', 200, 'index', 'a2',
          'version', 1, 'versionNonce', 3, 'isDeleted', false, 'frameId', 'frame-a', 'customData', jsonb_build_object('card', 'idea'))));
      INSERT INTO public.elemental_boards (edition, board_id, element) VALUES ('elemental-2026', '${BOARD}', 'fire');`);

    db = new Client({ connectionString: connectionString() });
    await db.connect();
    await db.query("SET ROLE elemental_bot");
    await db.query("SELECT public.elemental_bot_canvas_link($1, $2, $3, $4, $5)", [GUILD, chan(1), BOARD, "frame-a", uid(1)]);

    discord = fakeDiscord();
    rt = createRuntime({
      client: discord.client,
      api: createElementalApi(db as unknown as Queryable),
      env: { guildIds: [GUILD], databaseUrl: "postgresql://unused", cardUrl: null, cardSecret: null },
    });
    rt.queues.canvas = createKeyedQueue("canvas", { sleep: async () => undefined });
    rt.events.on("tester.first", (p) => void firsts.push(p.entryId));
  }, 240_000);

  afterAll(async () => {
    await db?.end();
    stop();
  });

  const entries: string[] = [];

  it("counts three entries and writes three notes into the Test zone with increasing valid indices", async () => {
    const replies: string[] = [];
    for (const [person, tried] of [
      [1, "the map on a phone"],
      [2, "the paper map"],
      [1, "the big-text version"],
    ] as const) {
      const { i, sent } = modal(person, "el|tsadd", { who: "a neighbour", tried, quote: "", changed: "" });
      await handleElementalInteraction(rt, i as never);
      replies.push(String(sent.at(-1)?.content ?? ""));
    }
    expect(replies).toEqual([1, 2, 3].map((n) => `${TESTER.counted(n, 10)}\n${TESTER.canvasWritten}`));

    entries.push(...psql(`SELECT e.id FROM public.elemental_tester_entries e JOIN public.elemental_teams t ON t.id = e.team_id
                          WHERE t.slot = 12 ORDER BY e.created_at`).split("\n"));
    expect(entries).toHaveLength(3);
    expect(firsts).toEqual([entries[0]]);

    const notes = boardNotes();
    expect(notes.map((n) => n.id)).toEqual(entries.flatMap((id) => [noteIds(id).rect, noteIds(id).text]));
    const indices = notes.map((n) => n.index);
    expect(indices.every((k) => isValidIndex(k))).toBe(true);
    expect([...indices].sort()).toEqual(indices);
    expect(new Set(indices).size).toBe(indices.length);
    for (const r of notes.filter((n) => n.id.endsWith("-r"))) {
      expect(r.frameId).toBe("frame-a");
      expect(r.x).toBeGreaterThanOrEqual(ZONE.x);
      expect(r.x + r.width).toBeLessThanOrEqual(ZONE.x + ZONE.width);
      expect(r.y).toBeGreaterThanOrEqual(ZONE.y);
      expect(r.customData).toMatchObject({ card: "test", source: "tester", createdBy: OWNER, updatedBy: OWNER });
      // Never over the sticky already in the zone's first slot.
      expect(r.x >= 64 + 240 || r.y >= 396 + 200).toBe(true);
    }
    expect(notes[1].originalText).toBe(noteText({ who: "a neighbour", tried: "the map on a phone" }));
    expect(psql(`SELECT string_agg(DISTINCT canvas_status, ',') FROM public.elemental_tester_entries WHERE id IN ('${entries.join("','")}')`)).toBe(
      "written"
    );

    // Each entry mirrored to the fire thread, never with the logger.
    const mirrored = discord.posts.filter((p) => p.route === Routes.channelMessages(THREAD));
    expect(mirrored).toHaveLength(3);
    expect(JSON.stringify(mirrored)).not.toContain(uid(1));
    expect(JSON.stringify(mirrored)).not.toContain(uid(2));
  });

  it("an edit rewrites the same note one version up, with no duplicate", async () => {
    const [first] = entries;
    const { i, sent } = modal(1, `el|${ACTIONS.save}|${first}`, { who: "a neighbour", tried: "the map, again", quote: "easier now", changed: "" });
    await handleElementalInteraction(rt, i as never);
    expect(sent.at(-1)?.content).toBe(`${TESTER.edited}\n${TESTER.canvasWritten}`);

    const all = boardNotes();
    expect(all).toHaveLength(6);
    const mine = all.filter((n) => n.id.includes(first));
    expect(mine.map((n) => n.id)).toEqual([noteIds(first).rect, noteIds(first).text]);
    expect(mine.map((n) => n.version)).toEqual([2, 2]);
    expect(mine.every((n) => !n.isDeleted)).toBe(true);
    expect(mine[1].originalText).toBe(noteText({ who: "a neighbour", tried: "the map, again", quote: "easier now" }));
    expect(psql(`SELECT canvas_status FROM public.elemental_tester_entries WHERE id = '${first}'`)).toBe("written");
    // The mirror post was edited in place.
    expect(discord.rest.patch).toHaveBeenCalledTimes(1);
  });

  it("contacts are refused before the database is asked", async () => {
    const before = psql("SELECT count(*) FROM public.elemental_tester_entries");
    const { i, sent } = modal(2, "el|tsadd", { who: "a neighbour", tried: "call me 081-234-5678", quote: "", changed: "" });
    await handleElementalInteraction(rt, i as never);
    expect(sent.at(-1)?.content).toBe(TESTER.pii(TESTER.fieldNames.tried));
    expect(psql("SELECT count(*) FROM public.elemental_tester_entries")).toBe(before);
  });
});
