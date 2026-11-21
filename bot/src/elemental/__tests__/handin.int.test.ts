/**
 * /handin end to end on a throwaway Postgres (scripts/elemental/harness.ts):
 * the real feature handler, the real elemental_bot_handin and canvas
 * functions called as the elemental_bot role, the real note builder, and a
 * fixture board. Discord is a fake (no network).
 *
 * Proves: 22:59:59 Bangkok on Mon 7 Dec is on time and 23:00:01 is late
 * (judged by SQL from the submit's own time); the 'ship' note lands in the
 * linked frame's Ship zone; a resubmission keeps both element ids and bumps
 * the version, with no duplicate.
 *
 *   pnpm test:elemental:integration bot/src/elemental/__tests__/handin.int.test.ts
 */
import { type Client as DiscordClient } from "discord.js";
import { Client } from "pg";

import { isValidIndex, noteIds, type Box } from "../../../../lib/elemental/canvas";
import { applyAll, connectionString, psql, start, stop } from "../../../../scripts/elemental/harness";
import { createElementalApi, type Queryable } from "../api";
import type { ElementalRuntime, RepliableInteraction } from "../context";
import { HANDIN } from "../copy/handin";
import { ACTIONS } from "../features/handin";
import { createRuntime, handleElementalInteraction } from "../index";
import { createKeyedQueue } from "../queue";

// Made-up ids only.
const GUILD = "800000000000000301";
const PAID = "300000000000000306";
const FIRE_CAT = "500000000000000340";
const CHANNEL = "700000000000000301";
const uid = (n: number) => `9${String(n).padStart(17, "0")}`;
const acct = (suffix: string) => `00000000-0000-4000-8000-0000000003${suffix}`;
const OWNER = acct("b0");
const BOARD = acct("e1");
const ZONE = { x: 40, y: 900, width: 1300, height: 420 };
const AT_2259_59 = Date.UTC(2026, 11, 7, 15, 59, 59);
const AT_2300_01 = Date.UTC(2026, 11, 7, 16, 0, 1);

function modal(person: number, url: string, createdTimestamp: number) {
  const sent: Record<string, unknown>[] = [];
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: CHANNEL,
    channel: { parentId: FIRE_CAT },
    user: { id: uid(person) },
    member: { roles: [PAID] },
    customId: `el|${ACTIONS.save}`,
    createdTimestamp,
    deferred: false,
    replied: false,
    inGuild: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => false,
    isMessageComponent: () => false,
    isModalSubmit: () => true,
    isFromMessage: () => false,
    fields: { getTextInputValue: (id: string) => (id === "url" ? url : "") },
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

describe("/handin on a real database", () => {
  let db: Client;
  let rt: ElementalRuntime;
  let teamId: string;

  beforeAll(async () => {
    await start();
    applyAll();
    psql(`INSERT INTO public.elemental_settings (guild_id, edition, team_create_opens_at, role_ids, channel_ids, element_category_ids)
          VALUES ('${GUILD}', 'elemental-2026', now() - interval '1 hour', '{"paid": "${PAID}"}', '{}', '{"fire": ["${FIRE_CAT}"]}');`);
    teamId = psql(`
      DO $$
      DECLARE
        k integer;
        reg uuid;
        code text;
        team jsonb;
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
        team := public.elemental_bot_team_create_staff('${GUILD}', '900000000000009999', 'Ember Watch', 'fire',
          ARRAY['900000000000000001', '900000000000000002'], '{12}');
        PERFORM public.elemental_bot_team_set_channel('${GUILD}', (team ->> 'team_id')::uuid, '${CHANNEL}');
      END $$;
      SELECT id FROM public.elemental_teams WHERE slot = 12 AND edition = 'elemental-2026';`);
    // A fire board with the team's project canvas (owner: person 1's site account) and its Ship zone.
    psql(`
      INSERT INTO auth.users (id) VALUES ('${OWNER}'), ('${acct("b1")}');
      INSERT INTO auth.identities (provider, provider_id, user_id) VALUES ('discord', '${uid(1)}', '${acct("b1")}');
      INSERT INTO public.whiteboards (id, owner_id, title, elements) VALUES ('${BOARD}', '${OWNER}', 'Fire board', jsonb_build_array(
        jsonb_build_object('id', 'frame-a', 'type', 'frame', 'x', 0, 'y', 0, 'width', 1800, 'height', 1400, 'index', 'a0',
          'version', 1, 'versionNonce', 1, 'isDeleted', false, 'frameId', NULL,
          'customData', jsonb_build_object('project', 'proj-a', 'owner', '${acct("b1")}', 'createdBy', '${acct("b1")}', 'editors', '[]'::jsonb)),
        jsonb_build_object('id', 'zone-ship', 'type', 'rectangle', 'x', ${ZONE.x}, 'y', ${ZONE.y}, 'width', ${ZONE.width}, 'height', ${ZONE.height}, 'index', 'a1',
          'version', 1, 'versionNonce', 2, 'isDeleted', false, 'frameId', 'frame-a', 'locked', true,
          'customData', jsonb_build_object('zone', 'ship'))));
      INSERT INTO public.elemental_boards (edition, board_id, element) VALUES ('elemental-2026', '${BOARD}', 'fire');`);

    db = new Client({ connectionString: connectionString() });
    await db.connect();
    await db.query("SET ROLE elemental_bot");
    await db.query("SELECT public.elemental_bot_canvas_link($1, $2, $3, $4, $5)", [GUILD, CHANNEL, BOARD, "frame-a", uid(1)]);

    rt = createRuntime({
      client: { rest: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } } as unknown as DiscordClient,
      api: createElementalApi(db as unknown as Queryable),
      env: { guildIds: [GUILD], databaseUrl: "postgresql://unused", cardUrl: null, cardSecret: null },
    });
    rt.queues.canvas = createKeyedQueue("canvas", { sleep: async () => undefined });
  }, 240_000);

  afterAll(async () => {
    await db?.end();
    stop();
  });

  const team = () =>
    psql(`SELECT handin_url || ' ' || to_char(handin_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI:SS') || ' ' ||
                 (handin_at > (SELECT handin_due_at FROM public.elemental_editions WHERE key = 'elemental-2026'))::text
          FROM public.elemental_teams WHERE id = '${teamId}'`);

  it("22:59:59 Bangkok is on time and the ship note lands in the Ship zone", async () => {
    const { i, sent } = modal(1, "https://youtu.be/firstCut", AT_2259_59);
    await handleElementalInteraction(rt, i as never);
    expect(String(sent.at(-1)?.content)).toBe(
      [HANDIN.received("2026-12-07T15:59:59.000Z"), HANDIN.onTime, HANDIN.canvasWritten].join("\n")
    );
    expect(team()).toBe("https://youtu.be/firstCut 2026-12-07 22:59:59 false");

    const notes = boardNotes();
    const ids = noteIds(teamId);
    expect(notes.map((n) => n.id)).toEqual([ids.rect, ids.text]);
    const [rect, text] = notes;
    expect(rect).toMatchObject({ frameId: "frame-a", version: 1, customData: { card: "ship", source: "handin", createdBy: OWNER, updatedBy: OWNER } });
    expect(rect.x).toBeGreaterThanOrEqual(ZONE.x);
    expect(rect.y).toBeGreaterThanOrEqual(ZONE.y);
    expect(isValidIndex(rect.index) && rect.index > "a1").toBe(true);
    expect(text.originalText).toContain("https://youtu.be/firstCut");
    expect(text.originalText).not.toContain(HANDIN.noteLate);
  });

  it("23:00:01 Bangkok is accepted and late; the resubmission keeps the ids with a higher version", async () => {
    const before = boardNotes();
    const { i, sent } = modal(2, "https://vm.tiktok.com/ZMfinal/", AT_2300_01);
    await handleElementalInteraction(rt, i as never);
    expect(String(sent.at(-1)?.content)).toBe(
      [HANDIN.received("2026-12-07T16:00:01.000Z"), HANDIN.late("2026-12-07T16:00:00+00:00"), HANDIN.resubmitted, HANDIN.canvasWritten].join("\n")
    );
    expect(team()).toBe("https://vm.tiktok.com/ZMfinal/ 2026-12-07 23:00:01 true");

    const after = boardNotes();
    expect(after.map((n) => n.id)).toEqual(before.map((n) => n.id));
    expect(after.map((n) => n.version)).toEqual(before.map((n) => n.version + 1));
    expect(after.map((n) => n.index)).toEqual(before.map((n) => n.index));
    expect(after.every((n) => !n.isDeleted)).toBe(true);
    expect(after[1].originalText).toContain("https://vm.tiktok.com/ZMfinal/");
    expect(after[1].originalText).not.toContain("firstCut");
    expect(String(after[1].originalText).split("\n").at(-1)).toBe(HANDIN.noteLate);
  });

  it("a link SQL would refuse never reaches it", async () => {
    const before = team();
    const { i, sent } = modal(1, "https://example.com/video", AT_2259_59);
    await handleElementalInteraction(rt, i as never);
    expect(String(sent.at(-1)?.content)).toBe(HANDIN.url.host);
    expect(team()).toBe(before);
  });
});
