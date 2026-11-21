/**
 * The staff tools (E20) on a throwaway Postgres (scripts/elemental/harness.ts):
 * the real handlers, the real elemental_bot_* functions called as the
 * elemental_bot role, the real note builder and a fixture board. Discord is a
 * fake (no network). It proves every SQL call's arguments line up with the
 * functions in the migrations.
 *
 *   pnpm test:elemental:integration bot/src/elemental/__tests__/staff.int.test.ts
 */
import { Routes, type Client as DiscordClient } from "discord.js";
import { Client } from "pg";

import { noteIds } from "../../../../lib/elemental/canvas";
import { applyAll, connectionString, psql, start, stop } from "../../../../scripts/elemental/harness";
import { createElementalApi, type Queryable } from "../api";
import type { ElementalRuntime } from "../context";
import { STAFF } from "../copy/staff";
import { TESTER } from "../copy/tester";
import { ACTIONS, SUB, feature } from "../features/staff";
import { createRuntime, handleElementalInteraction } from "../index";
import { createKeyedQueue } from "../queue";

// Made-up ids only.
const GUILD = "800000000000000201";
const DRY = "800000000000000202";
const HOST = "300000000000000201";
const PAID = "300000000000000206";
const MIRROR = "400000000000000203";
const FIRE_CAT = "500000000000000240";
const STAFFER = "900000000000009001";
const uid = (n: number) => `9${String(n).padStart(17, "0")}`;
const chan = (n: number) => `7${String(n).padStart(17, "0")}`;
const acct = (suffix: string) => `00000000-0000-4000-8000-0000000000${suffix}`;
const OWNER = acct("b0");
const BOARD = acct("e1");
const LINK_REG = "00000000-0000-4000-8000-00000000cc01";

function fakeDiscord() {
  let n = 0;
  const log: { method: string; route: string; body?: unknown }[] = [];
  const rest = {
    get: jest.fn(async (route: string) => {
      log.push({ method: "get", route });
      return route.includes("/pins") ? { items: [] } : { threads: [] };
    }),
    post: jest.fn(async (route: string, o?: { body?: unknown }) => {
      log.push({ method: "post", route, body: o?.body });
      n += 1;
      return { id: `72000000000000${String(n).padStart(4, "0")}` };
    }),
    put: jest.fn(async (route: string) => void log.push({ method: "put", route })),
    patch: jest.fn(async (route: string) => void log.push({ method: "patch", route })),
    delete: jest.fn(async (route: string) => void log.push({ method: "delete", route })),
  };
  return { client: { rest, user: { id: "190000000000000201" } } as unknown as DiscordClient, log };
}

type Sent = { how: string; payload: Record<string, unknown> }[];

function interaction(kind: "command" | "button" | "modal", o: { guild?: string; sub?: string; options?: Record<string, unknown>; customId?: string; fields?: Record<string, string> }) {
  const sent: Sent = [];
  const opt = o.options ?? {};
  const i: Record<string, unknown> = {
    guildId: o.guild ?? GUILD,
    channelId: chan(900),
    user: { id: STAFFER },
    member: { roles: [HOST] },
    commandName: "el",
    customId: o.customId ?? "el|x",
    deferred: false,
    replied: false,
    inGuild: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => kind === "command",
    isMessageComponent: () => kind === "button",
    isButton: () => kind === "button",
    isModalSubmit: () => kind === "modal",
    isFromMessage: () => kind === "modal",
    fields: { getTextInputValue: (id: string) => o.fields?.[id] ?? "" },
    options: {
      getSubcommand: () => o.sub ?? null,
      getString: (name: string) => (typeof opt[name] === "string" ? opt[name] : null),
      getInteger: (name: string) => (typeof opt[name] === "number" ? opt[name] : null),
      getUser: (name: string) => opt[name] ?? null,
    },
    showModal: jest.fn(async () => void (i.replied = true)),
    deferReply: jest.fn(async () => void (i.deferred = true)),
    deferUpdate: jest.fn(async () => void (i.deferred = true)),
    reply: jest.fn(async (p: Record<string, unknown>) => void sent.push({ how: "reply", payload: p })),
    editReply: jest.fn(async (p: Record<string, unknown>) => void sent.push({ how: "editReply", payload: p })),
    followUp: jest.fn(async (p: Record<string, unknown>) => void sent.push({ how: "followUp", payload: p })),
    deleteReply: jest.fn(async () => undefined),
  };
  return { i, sent };
}

const content = (sent: Sent) => sent.map((s) => String(s.payload.content ?? "")).join("\n");

describe("staff tools on a real database", () => {
  let db: Client;
  let rt: ElementalRuntime;
  let discord: ReturnType<typeof fakeDiscord>;

  async function run(kind: "command" | "button" | "modal", o: Parameters<typeof interaction>[1]) {
    const made = interaction(kind, o);
    await handleElementalInteraction(rt, made.i as never);
    await rt.queues.canvas.idle();
    await rt.queues.channels.idle();
    return made.sent;
  }
  const el = (sub: string, options: Record<string, unknown> = {}, guild = GUILD) => run("command", { sub, options, guild });
  const entryIds = () => psql(`SELECT string_agg(id::text, ',' ORDER BY created_at) FROM public.elemental_tester_entries WHERE edition = 'elemental-2026'`).split(",");

  beforeAll(async () => {
    await start();
    applyAll();
    psql(`
      INSERT INTO public.elemental_settings (guild_id, edition, role_ids, channel_ids, element_category_ids)
      VALUES ('${GUILD}', 'elemental-2026', '{"host": "${HOST}", "paid": "${PAID}"}', '{"mirror": "${MIRROR}"}', '{"fire": ["${FIRE_CAT}"]}'),
             ('${DRY}', 'elemental-dryrun', '{"host": "${HOST}"}', '{}', '{"fire": ["${FIRE_CAT}"]}');
      DO $$
      DECLARE
        k integer;
        reg uuid;
        code text;
        team jsonb;
      BEGIN
        -- The real guild: people 1 and 2 claim seats and become one live fire team (plot 12).
        FOR k IN 1 .. 2 LOOP
          INSERT INTO public.hackathon_event_registrations (event_slug, status, team_name, member_count, amount_baht, contact_email, contact_phone)
          VALUES ('elemental-2026', 'paid', 'Test Group', 1, 0, 'test@example.invalid', '0') RETURNING id INTO reg;
          INSERT INTO public.hackathon_event_registration_members (registration_id, position, full_name, age, school, parent_name, parent_phone, parent_consent)
          VALUES (reg, 1, 'Member', 16, 'Test School', 'Parent', '0', true);
          code := (public.elemental__insert_claim('elemental-2026', 'member',
            (SELECT id FROM public.hackathon_event_registration_members WHERE registration_id = reg))).code;
          PERFORM public.elemental_bot_claim('${GUILD}', code, (900000000000000000 + k)::text);
        END LOOP;
        team := public.elemental_bot_team_create_staff('${GUILD}', '${STAFFER}', 'Ember Watch', 'fire',
          ARRAY['900000000000000001', '900000000000000002'], '{12}');
        PERFORM public.elemental_bot_team_set_channel('${GUILD}', (team ->> 'team_id')::uuid, '${chan(1)}');

        -- A paid registration of two whose second seat was never claimed (/el link).
        INSERT INTO public.hackathon_event_registrations (id, event_slug, status, team_name, member_count, amount_baht, contact_email, contact_phone)
        VALUES ('${LINK_REG}', 'elemental-2026', 'paid', 'Test Group', 2, 0, 'test@example.invalid', '0');
        INSERT INTO public.hackathon_event_registration_members (registration_id, position, full_name, age, school, parent_name, parent_phone, parent_consent)
        VALUES ('${LINK_REG}', 1, 'Member', 16, 'Test School', 'Parent', '0', true),
               ('${LINK_REG}', 2, 'Member', 16, 'Test School', 'Parent', '0', true);

        -- The rehearsal guild: people 11 and 12 with rehearsal codes, one team on plot 5.
        FOR k IN 11 .. 12 LOOP
          code := (SELECT c.code FROM public.elemental_issue_rehearsal_claims('elemental-dryrun', 1) AS c);
          PERFORM public.elemental_bot_claim('${DRY}', code, (900000000000000000 + k)::text);
        END LOOP;
        team := public.elemental_bot_team_create_staff('${DRY}', '${STAFFER}', 'Dry Run', 'fire',
          ARRAY['900000000000000011', '900000000000000012'], '{5}');
        PERFORM public.elemental_bot_team_set_channel('${DRY}', (team ->> 'team_id')::uuid, '${chan(5)}');
      END $$;

      -- A fire board with a project canvas and its Test zone.
      INSERT INTO auth.users (id) VALUES ('${OWNER}'), ('${acct("b1")}');
      INSERT INTO public.whiteboards (id, owner_id, title, elements) VALUES ('${BOARD}', '${OWNER}', 'Fire board', jsonb_build_array(
        jsonb_build_object('id', 'frame-a', 'type', 'frame', 'x', 0, 'y', 0, 'width', 1800, 'height', 1400, 'index', 'a0',
          'version', 1, 'versionNonce', 1, 'isDeleted', false, 'frameId', NULL,
          'customData', jsonb_build_object('project', 'proj-a', 'owner', '${acct("b1")}', 'createdBy', '${acct("b1")}', 'editors', '[]'::jsonb)),
        jsonb_build_object('id', 'zone-test', 'type', 'rectangle', 'x', 40, 'y', 300, 'width', 1300, 'height', 420, 'index', 'a1',
          'version', 1, 'versionNonce', 2, 'isDeleted', false, 'frameId', 'frame-a', 'locked', true,
          'customData', jsonb_build_object('zone', 'test'))));
      INSERT INTO public.elemental_boards (edition, board_id, element) VALUES ('elemental-2026', '${BOARD}', 'fire');`);

    db = new Client({ connectionString: connectionString() });
    await db.connect();
    await db.query("SET ROLE elemental_bot");
    discord = fakeDiscord();
    rt = createRuntime({
      client: discord.client,
      api: createElementalApi(db as unknown as Queryable),
      env: { guildIds: [GUILD, DRY], databaseUrl: "postgresql://unused", cardUrl: null, cardSecret: null },
    });
    rt.queues.canvas = createKeyedQueue("canvas", { sleep: async () => undefined });
    rt.queues.channels = createKeyedQueue("channels", { sleep: async () => undefined });
    // As startFeatures wires it.
    rt.events.on("canvas.linked", (p) => feature.events!["canvas.linked"]!(p, rt));
  }, 240_000);

  afterAll(async () => {
    await db?.end();
    stop();
  });

  it("/el tester-add counts like a normal entry, logged as staff", async () => {
    const sent = await run("modal", { customId: `el|${ACTIONS.testerAdd}|12`, fields: { who: "a parent", tried: "the sign-up page" } });
    expect(content(sent)).toBe([STAFF.testerAdded(12), TESTER.counted(1, 10), TESTER.canvasNotLinked].join("\n"));
    expect(psql(`SELECT source || ',' || counted || ',' || logger_discord_id FROM public.elemental_tester_entries`)).toBe(`staff,true,${STAFFER}`);
    expect(psql(`SELECT lit_at IS NOT NULL FROM public.elemental_teams WHERE slot = 12 AND edition = 'elemental-2026'`)).toBe("t");
  });

  it("/el canvas-link links the team, pins the link in its channel and writes its pending notes", async () => {
    const sent = await el(SUB.canvasLink, { slot: 12, url: `https://passionseed.org/whiteboard/${BOARD}?focus=frame-a` });
    expect(content(sent)).toContain(STAFF.canvasLinked(12));
    expect(psql(`SELECT board_id || ',' || frame_id FROM public.elemental_canvas_links`)).toBe(`${BOARD},frame-a`);
    expect(discord.log.some((l) => l.method === "post" && l.route === Routes.channelMessages(chan(1)))).toBe(true);
    const [entry] = entryIds();
    expect(psql(`SELECT canvas_status FROM public.elemental_tester_entries WHERE id = '${entry}'`)).toBe("written");
    expect(psql(`SELECT count(*) FROM public.whiteboards w, jsonb_array_elements(w.elements) el WHERE el ->> 'id' = '${noteIds(entry).rect}'`)).toBe("1");
  });

  it("/el sample shows only unreviewed entries; Reviewed takes one out", async () => {
    await run("modal", { customId: `el|${ACTIONS.testerAdd}|12`, fields: { who: "a friend", tried: "the map on a phone" } });
    const sent = await el(SUB.sample, { n: 10 });
    expect(sent.filter((s) => s.how === "followUp")).toHaveLength(2);
    const [first, second] = entryIds();
    await run("button", { customId: `el|rv|${first}` });
    expect(psql(`SELECT reviewed_by FROM public.elemental_tester_entries WHERE id = '${first}'`)).toBe(STAFFER);
    const again = await el(SUB.sample, { n: 10, element: "fire" });
    const shown = again.filter((s) => s.how === "followUp");
    expect(shown).toHaveLength(1);
    expect(String(shown[0].payload.content)).toContain(second);
  });

  it("Remove un-counts the entry and tombstones its note", async () => {
    const [first] = entryIds();
    const sent = await run("modal", { customId: `el|${ACTIONS.removeReason}|${first}`, fields: { reason: "not a real test" } });
    expect(content(sent)).toContain(TESTER.mirrorRemoved);
    expect(content(sent)).toContain(STAFF.tombstoned);
    expect(psql(`SELECT counted || ',' || (removed_at IS NOT NULL) || ',' || canvas_status FROM public.elemental_tester_entries WHERE id = '${first}'`)).toBe(
      "false,true,tombstoned"
    );
    expect(psql(`SELECT el ->> 'isDeleted' FROM public.whiteboards w, jsonb_array_elements(w.elements) el WHERE el ->> 'id' = '${noteIds(first).rect}'`)).toBe(
      "true"
    );
  });

  it("/el resync writes a failed note again and leaves written ones alone", async () => {
    const [, second] = entryIds();
    psql(`UPDATE public.elemental_tester_entries SET canvas_status = 'failed' WHERE id = '${second}'`);
    const sent = await el(SUB.resync);
    expect(content(sent)).toBe(STAFF.resyncDone({ written: 1, tombstoned: 0, failed: 0, skipped: 0 }));
    expect(psql(`SELECT canvas_status FROM public.elemental_tester_entries WHERE id = '${second}'`)).toBe("written");
    expect(content(await el(SUB.resync))).toBe(STAFF.resyncNone);
  });

  it("/el totals reads tonight's numbers", async () => {
    const sent = await el(SUB.totals);
    expect(content(sent)).toContain(STAFF.totalsHelped(1, 1));
  });

  it("/el whois gives the registration id and position only", async () => {
    const sent = await el(SUB.whois, { user: { id: uid(1) } });
    const reg = psql(`SELECT r.registration_id FROM public.hackathon_event_registration_members r
                      JOIN public.elemental_members m ON m.registration_member_id = r.id WHERE m.discord_user_id = '${uid(1)}'`);
    expect(content(sent)).toBe(STAFF.whois({ userId: uid(1), registrationId: reg, position: 1 }));
    expect(content(sent)).not.toMatch(/Member|Test School|Parent|example/);
  });

  it("/el link claims an unclaimed seat for a person and adds the Paid role", async () => {
    const sent = await el(SUB.link, { user: { id: uid(30) }, registration: LINK_REG, position: 2 });
    expect(content(sent)).toContain(STAFF.linked({ userId: uid(30), registrationId: LINK_REG, position: 2, already: false }));
    expect(psql(`SELECT r.position FROM public.elemental_members m JOIN public.hackathon_event_registration_members r ON r.id = m.registration_member_id
                 WHERE m.discord_user_id = '${uid(30)}'`)).toBe("2");
    expect(discord.log).toContainEqual({ method: "put", route: Routes.guildMemberRole(GUILD, uid(30), PAID) });
  });

  it("/el test-codes: refused in the real guild, codes in the rehearsal guild", async () => {
    const before = psql(`SELECT count(*) FROM public.elemental_claims`);
    expect(content(await el(SUB.testCodes, { n: 3 }))).toBe(STAFF.rehearsalOnly);
    expect(psql(`SELECT count(*) FROM public.elemental_claims`)).toBe(before);
    const sent = await el(SUB.testCodes, { n: 3 }, DRY);
    expect(content(sent).match(/^[A-HJ-NP-Z2-9]{8}$/gm)).toHaveLength(3);
    expect(psql(`SELECT count(*) FROM public.elemental_claims WHERE edition = 'elemental-dryrun' AND used_at IS NULL`)).toBe("3");
  });

  it("/el dryrun-cleanup: refused in the real guild and on a wrong confirm; clears the rehearsal guild only", async () => {
    expect(content(await el(SUB.cleanup, { confirm: "elemental-2026" }))).toBe(STAFF.rehearsalOnly);
    expect(content(await el(SUB.cleanup, { confirm: "elemental-2026" }, DRY))).toBe(STAFF.cleanupBadConfirm("elemental-dryrun"));
    expect(psql(`SELECT status FROM public.elemental_teams WHERE edition = 'elemental-dryrun'`)).toBe("active");

    const sent = await el(SUB.cleanup, { confirm: "elemental-dryrun" }, DRY);
    expect(content(sent)).toBe(STAFF.cleanupDone({ teams: 1, deleted: 1, failed: 0 }));
    expect(psql(`SELECT status FROM public.elemental_teams WHERE edition = 'elemental-dryrun'`)).toBe("archived");
    expect(discord.log.filter((l) => l.method === "delete").map((l) => l.route)).toEqual([Routes.channel(chan(5))]);
    // The real guild is untouched.
    expect(psql(`SELECT status || ',' || slot FROM public.elemental_teams WHERE edition = 'elemental-2026'`)).toBe("active,12");
  });
});
