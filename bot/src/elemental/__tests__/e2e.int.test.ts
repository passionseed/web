/**
 * The Elemental hackathon end to end (E32), on a throwaway Postgres
 * (scripts/elemental/harness.ts) with Discord faked (no network, no token).
 *
 * The same path Big and the students take, in order:
 *   1. Staff scripts: seed.ts (real guild -> elemental-2026, rehearsal guild ->
 *      elemental-dryrun, boards), set-role-password.ts, issue-claims.ts (event
 *      codes) and issue-claims.ts --rehearsal.
 *   2. The bot connects as the elemental_bot LOGIN with a password, through
 *      createRolePool and parseElementalEnv, exactly as startElemental does.
 *   3. /join for 5 people from 2 paid registrations (5 member rows) in the
 *      real guild; rehearsal codes in the rehearsal guild (and refused in the
 *      real one); the element picker; /team create with Accept for 2 teams.
 *   4. /canvas link on the fixture boards; 12 /tester submissions (1 refused
 *      for a phone number, 1 removed by staff from the mirror); /report;
 *      /checkin.
 *   5. The scheduler at 19:55 and 20:30 Bangkok: the campfire legend and the
 *      20:30 card.
 *   6. /el dryrun-cleanup in the rehearsal guild leaves elemental-2026
 *      untouched, row for row.
 *
 *   pnpm test:elemental:integration bot/src/elemental/__tests__/e2e.int.test.ts
 *
 * ELEMENTAL_E2E_OUT=<folder> also writes what the bot posted (card.png,
 * campfire-island.png, legend.txt, posts.json) there, so a person can look at
 * the card (docs/runbooks/elemental-island.md, "Local run").
 *
 * The event days are moved to today (seed.ts --days, as Big would for a
 * rehearsal on the real guild), because SQL stamps tester entries and
 * check-ins with today's Bangkok date. Run it away from Bangkok midnight.
 *
 * Fixtures are made up: ids 8000.../9000..., "Member", example.invalid.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Routes, type Client as DiscordClient, type MessageCreateOptions } from "discord.js";
import type pg from "pg";

import { isValidIndex, noteIds } from "../../../../lib/elemental/canvas";
import { atBangkok, bangkokDay } from "../../../../lib/elemental/core";
import { candidateSlots } from "../../../../lib/elemental/island/sectors";
import { connectPg, type Deps } from "../../../../scripts/elemental/admin-db";
import { DATABASE, applyAll, connectionString, psql, start, stop } from "../../../../scripts/elemental/harness";
import { run as issueClaims } from "../../../../scripts/elemental/issue-claims";
import { run as seed } from "../../../../scripts/elemental/seed";
import { run as setRolePassword } from "../../../../scripts/elemental/set-role-password";
import { createRolePool } from "../../pg";
import { createElementalApi, type ElementalApi } from "../api";
import { setChannelPortFactory, type ChannelInfo, type GuildChannelPort, type PlannedOverwrite } from "../channels";
import type { ElementalEventName, ElementalListener, ElementalRuntime } from "../context";
import { CANVAS, canvasErrorText } from "../copy/canvas";
import { JOIN } from "../copy/join";
import { REPORT } from "../copy/report";
import { SCHEDULE } from "../copy/schedule";
import { STAFF } from "../copy/staff";
import { opsErrorText } from "../copy/teamops";
import { COPY as TEAMS, teamErrorText } from "../copy/teams";
import { TESTER } from "../copy/tester";
import { parseElementalEnv } from "../env";
import { ElementalError } from "../api";
import { ACTIONS as STAFF_ACTIONS, SUB } from "../features/staff";
import { SUB as OPS_SUB } from "../features/teamops";
import { createScheduler } from "../features/schedule";
import { ACTIONS as TEAM_ACTIONS } from "../features/teams";
import { ACTIONS as TESTER_ACTIONS, MIRROR_ACTIONS } from "../features/tester";
import { createRuntime, handleElementalInteraction } from "../index";
import { buildLegend, legendRows } from "../legend";
import { createKeyedQueue } from "../queue";
import { registry } from "../registry";

// ---------------------------------------------------------------------------
// Made-up ids
// ---------------------------------------------------------------------------

const REAL = "800000000000003201";
const DRY = "800000000000003202";
const BOT = "190000000000003201";
const BOT_PASSWORD = "e2ebotpassword".padEnd(48, "3");
const ELEMENTS = ["water", "earth", "air", "fire", "aether"] as const;
type El = (typeof ELEMENTS)[number];
const ROLE_KEYS = ["host", "helper", "mentor", "judge", "safety", "paid", ...ELEMENTS] as const;
const CHANNEL_KEYS = ["start_here", "news", "mirror", "reports", "campfire"] as const;

/** 18-digit ids: 3<guild><n> roles, 4<guild><n> channels, 5<guild><n> categories. */
const snow = (lead: number, guild: string, n: number) => `${lead}${guild.slice(-2)}${String(n).padStart(15, "0")}`;
const roleIds = (guild: string) => Object.fromEntries(ROLE_KEYS.map((k, i) => [k, snow(3, guild, i + 1)])) as Record<(typeof ROLE_KEYS)[number], string>;
const channelIds = (guild: string) => Object.fromEntries(CHANNEL_KEYS.map((k, i) => [k, snow(4, guild, i + 1)])) as Record<(typeof CHANNEL_KEYS)[number], string>;
const categoryIds = (guild: string) => Object.fromEntries(ELEMENTS.map((e, i) => [e, snow(5, guild, i + 1)])) as Record<El, string>;

const ROLES: Record<string, ReturnType<typeof roleIds>> = { [REAL]: roleIds(REAL), [DRY]: roleIds(DRY) };
const CHANNELS: Record<string, ReturnType<typeof channelIds>> = { [REAL]: channelIds(REAL), [DRY]: channelIds(DRY) };
const CATEGORIES: Record<string, ReturnType<typeof categoryIds>> = { [REAL]: categoryIds(REAL), [DRY]: categoryIds(DRY) };

const uid = (n: number) => `9${String(n).padStart(17, "0")}`;
const HOST_PERSON = uid(900);
const acct = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const STAFF_ACCOUNT = acct(1);
/** Site accounts of person 1 (team A) and person 4 (team B), signed in with Discord. */
const SITE = { 1: acct(101), 4: acct(104) } as const;
/** Boards: 5 per edition (elemental_boards), in ELEMENTS order. */
const BOARDS: Record<string, string[]> = { [REAL]: ELEMENTS.map((_, i) => acct(201 + i)), [DRY]: ELEMENTS.map((_, i) => acct(301 + i)) };
const FIRE_BOARD = BOARDS[REAL][ELEMENTS.indexOf("fire")];
const WATER_BOARD = BOARDS[REAL][ELEMENTS.indexOf("water")];
const ZONE = { x: 40, y: 300, width: 1300, height: 420 };

const TODAY = bangkokDay(Date.now());
const DRY_DAY = "2026-12-02";

/**
 * The 20:30 card for exactly this run's fixtures (sha256 of the PNG the bot
 * posted). It changes only when the card, the island or the slot pool is
 * redrawn on purpose: then run this file, check card.png from
 * ELEMENTAL_E2E_OUT by eye, and paste the new hash here.
 */
const CARD_SHA256 = "59af4168ce12886d5795ff7f2c1f9bedc307eeb0158daa807617da6226556cb2";

// ---------------------------------------------------------------------------
// A fake Discord: REST for roles, posts, pins and threads; a channel port per guild.
// ---------------------------------------------------------------------------

interface Posted {
  route: string;
  channelId: string;
  body: Record<string, unknown>;
  files: { name: string; data: Buffer }[];
}

let nextSnow = BigInt("720000000000000000");
const newId = () => String(++nextSnow);

interface FakeChannel extends ChannelInfo {
  overwrites: PlannedOverwrite[];
  messages: { id: string; payload: MessageCreateOptions; pinned: boolean }[];
}

class FakeGuildPort implements GuildChannelPort {
  channels: FakeChannel[] = [];
  constructor(private readonly guild: string) {
    for (const id of Object.values(CATEGORIES[guild])) this.channels.push({ id, name: `cat-${id.slice(-1)}`, parentId: null, kind: "category", overwrites: [], messages: [] });
    for (const id of Object.values(CHANNELS[guild])) this.channels.push({ id, name: `ch-${id.slice(-1)}`, parentId: null, kind: "text", overwrites: [], messages: [] });
  }
  botUserId() {
    return BOT;
  }
  async list() {
    return this.channels.map(({ id, name, parentId, kind }) => ({ id, name, parentId, kind }));
  }
  async createText(input: { name: string; parentId: string; overwrites: PlannedOverwrite[] }) {
    const ch: FakeChannel = { id: newId(), name: input.name, parentId: input.parentId, kind: "text", overwrites: input.overwrites, messages: [] };
    this.channels.push(ch);
    return { id: ch.id, name: ch.name, parentId: ch.parentId, kind: ch.kind };
  }
  async edit(channelId: string, input: { name?: string; parentId?: string; overwrites?: PlannedOverwrite[] }) {
    const ch = this.byId(channelId);
    if (input.name !== undefined) ch.name = input.name;
    if (input.parentId !== undefined) ch.parentId = input.parentId;
    if (input.overwrites) ch.overwrites = input.overwrites;
  }
  async send(channelId: string, payload: MessageCreateOptions) {
    const msg = { id: newId(), payload, pinned: false };
    this.byId(channelId).messages.push(msg);
    return { id: msg.id };
  }
  async pin(channelId: string, messageId: string) {
    const m = this.byId(channelId).messages.find((x) => x.id === messageId);
    if (m) m.pinned = true;
  }
  byId(id: string): FakeChannel {
    const ch = this.channels.find((c) => c.id === id);
    if (!ch) throw Object.assign(new Error("Unknown Channel"), { status: 404 });
    return ch;
  }
  /** The live team channel named e.g. fire-07. */
  team(name: string): FakeChannel {
    const ch = this.channels.find((c) => c.kind === "text" && c.name === name);
    if (!ch) throw new Error(`no channel ${name} in ${this.guild}`);
    return ch;
  }
}

function fakeDiscord() {
  const roles = new Map<string, Set<string>>();
  const posts: Posted[] = [];
  const log: { method: string; route: string }[] = [];
  const threads: { id: string; parent_id: string; name: string }[] = [];
  const held = (guild: string, user: string) => {
    const key = `${guild}:${user}`;
    if (!roles.has(key)) roles.set(key, new Set());
    return roles.get(key)!;
  };
  const roleRoute = (route: string) => /^\/guilds\/(\d+)\/members\/(\d+)\/roles\/(\d+)$/.exec(route);
  const rest = {
    get: jest.fn(async (route: string) => {
      log.push({ method: "get", route });
      // GET guild member (the staff check): the roles this fake server holds for them.
      const member = /^\/guilds\/(\d+)\/members\/(\d+)$/.exec(route);
      if (member) return { user: { id: member[2] }, roles: [...held(member[1], member[2])] };
      if (route.endsWith("/threads/active")) return { threads };
      if (route.includes("/pins")) return { items: [] };
      return { threads: [] };
    }),
    post: jest.fn(async (route: string, o?: { body?: Record<string, unknown>; files?: { name: string; data: Buffer }[] }) => {
      log.push({ method: "post", route });
      const thread = /^\/channels\/(\d+)\/threads$/.exec(route);
      if (thread) {
        const made = { id: newId(), parent_id: thread[1], name: String(o?.body?.name ?? "") };
        threads.push(made);
        return made;
      }
      const channel = /^\/channels\/(\d+)\/messages$/.exec(route);
      const id = newId();
      if (channel) posts.push({ route, channelId: channel[1], body: o?.body ?? {}, files: (o?.files ?? []).map((f) => ({ name: f.name, data: f.data })) });
      return { id };
    }),
    put: jest.fn(async (route: string) => {
      log.push({ method: "put", route });
      const m = roleRoute(route);
      if (m) held(m[1], m[2]).add(m[3]);
    }),
    patch: jest.fn(async (route: string) => void log.push({ method: "patch", route })),
    delete: jest.fn(async (route: string) => {
      log.push({ method: "delete", route });
      const m = roleRoute(route);
      if (m) held(m[1], m[2]).delete(m[3]);
    }),
  };
  const client = { rest, user: { id: BOT } } as unknown as DiscordClient;
  return { client, rest, posts, log, threads, held };
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

type Kind = "command" | "button" | "modal" | "string" | "users";
interface Reply {
  how: string;
  payload: Record<string, unknown>;
}

interface Ask {
  guild: string;
  user: string;
  channel: string;
  command?: string;
  sub?: string;
  options?: Record<string, unknown>;
  customId?: string;
  fields?: Record<string, string>;
  values?: string[];
  fromMessage?: boolean;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

describe("Elemental end to end", () => {
  let tmp: string;
  let pool: pg.Pool;
  let api: ElementalApi;
  let rt: ElementalRuntime;
  let discord: ReturnType<typeof fakeDiscord>;
  const ports = new Map<string, FakeGuildPort>();
  /** Event codes by registration and position, from the CSV issue-claims wrote. */
  const codes: { registration: string; position: number; code: string }[] = [];
  let rehearsalCodes: string[] = [];
  const out = process.env.ELEMENTAL_E2E_OUT ? path.resolve(process.env.ELEMENTAL_E2E_OUT) : null;

  function deps(env: Record<string, string>) {
    const lines: string[] = [];
    const d: Deps = { env, connect: connectPg, out: (l) => lines.push(l), err: (l) => lines.push(l) };
    return { d, lines };
  }

  function interaction(kind: Kind, a: Ask) {
    const sent: Reply[] = [];
    const guildPort = ports.get(a.guild)!;
    const parentId = guildPort.channels.find((c) => c.id === a.channel)?.parentId ?? null;
    const opt = a.options ?? {};
    const i: Record<string, unknown> = {
      guildId: a.guild,
      channelId: a.channel,
      channel: { parentId },
      user: { id: a.user },
      member: { roles: [...discord.held(a.guild, a.user)] },
      commandName: a.command ?? "el",
      customId: a.customId ?? "el|x",
      values: a.values ?? [],
      users: (a.values ?? []).map((id) => ({ id, bot: false })),
      deferred: false,
      replied: false,
      inGuild: () => true,
      isAutocomplete: () => false,
      isChatInputCommand: () => kind === "command",
      isMessageComponent: () => kind === "button" || kind === "string" || kind === "users",
      isButton: () => kind === "button",
      isStringSelectMenu: () => kind === "string",
      isUserSelectMenu: () => kind === "users",
      isModalSubmit: () => kind === "modal",
      isFromMessage: () => kind === "modal" && a.fromMessage === true,
      fields: { getTextInputValue: (id: string) => a.fields?.[id] ?? "" },
      options: {
        getSubcommand: () => a.sub ?? null,
        getString: (name: string) => (typeof opt[name] === "string" ? opt[name] : null),
        getInteger: (name: string) => (typeof opt[name] === "number" ? opt[name] : null),
        getUser: (name: string) => opt[name] ?? null,
        getAttachment: () => null,
      },
      showModal: jest.fn(async (modal: unknown) => {
        i.replied = true;
        sent.push({ how: "modal", payload: JSON.parse(JSON.stringify(modal)) as Record<string, unknown> });
      }),
      deferReply: jest.fn(async () => void (i.deferred = true)),
      deferUpdate: jest.fn(async () => void (i.deferred = true)),
      reply: jest.fn(async (p: Record<string, unknown>) => void sent.push({ how: "reply", payload: p })),
      editReply: jest.fn(async (p: Record<string, unknown>) => void sent.push({ how: "editReply", payload: p })),
      followUp: jest.fn(async (p: Record<string, unknown>) => void sent.push({ how: "followUp", payload: p })),
      deleteReply: jest.fn(async () => undefined),
    };
    return { i, sent };
  }

  async function act(kind: Kind, a: Ask): Promise<Reply[]> {
    const made = interaction(kind, a);
    await handleElementalInteraction(rt, made.i as never);
    await rt.queues.channels.idle();
    await rt.queues.canvas.idle();
    return made.sent;
  }
  const text = (sent: Reply[]) => sent.map((s) => String(s.payload.content ?? "")).join("\n");
  const last = (sent: Reply[]) => String(sent.at(-1)?.payload.content ?? "");
  const host = (guild: string, sub: string, options: Record<string, unknown> = {}) =>
    act("command", { guild, user: HOST_PERSON, channel: CHANNELS[guild].mirror, command: "el", sub, options });

  /** /team create, the form, the element and teammates, send; then each invitee presses Accept. */
  async function makeTeam(guild: string, creator: string, invitees: string[], name: string, element: El): Promise<{ slot: number; channelId: string }> {
    const where = { guild, user: creator, channel: CHANNELS[guild].start_here };
    const opened = await act("command", { ...where, command: "team", sub: "create" });
    expect(opened[0]?.how).toBe("modal");
    await act("modal", { ...where, customId: `el|${TEAM_ACTIONS.name}`, fields: { name } });
    await act("string", { ...where, customId: `el|${TEAM_ACTIONS.element}`, values: [element] });
    await act("users", { ...where, customId: `el|${TEAM_ACTIONS.members}`, values: invitees });
    const created = await act("button", { ...where, customId: `el|${TEAM_ACTIONS.create}` });
    expect(last(created)).toBe(TEAMS.created({ name, invitees }));

    const startHere = ports.get(guild)!.byId(CHANNELS[guild].start_here);
    for (const invitee of invitees) {
      const invite = startHere.messages.find((m) => JSON.stringify(m.payload.components ?? []).includes(`|${invitee}|`) && m.payload.content?.includes(name));
      expect(invite).toBeDefined();
      const row = (invite!.payload.components as unknown as { components: { custom_id: string }[] }[])[0];
      const accept = row.components.find((c) => c.custom_id.startsWith(`el|${TEAM_ACTIONS.accept}|`))!.custom_id;
      await act("button", { guild, user: invitee, channel: CHANNELS[guild].start_here, customId: accept });
    }
    const team = JSON.parse(
      psql(`SELECT jsonb_build_object('slot', slot, 'channel', discord_channel_id, 'status', status)
            FROM public.elemental_teams WHERE project_name = '${name}'`)
    ) as { slot: number; channel: string; status: string };
    expect(team.status).toBe("active");
    return { slot: team.slot, channelId: team.channel };
  }

  /** Every row of the real edition (tables with an edition column, plus invites and canvas links by team), for the cleanup check. */
  function realEditionSnapshot(): string {
    const tables = psql(`SELECT string_agg(table_name, ',' ORDER BY table_name) FROM information_schema.columns
                         WHERE table_schema = 'public' AND table_name LIKE 'elemental\\_%' AND column_name = 'edition'`).split(",");
    const parts = tables.map(
      (t) =>
        `'${t}', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text), '[]') FROM public.${t} x WHERE x.edition = 'elemental-2026')`
    );
    return psql(`SELECT jsonb_build_object(${parts.join(", ")},
      'invites', (SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY to_jsonb(i)::text), '[]') FROM public.elemental_team_invites i
                  JOIN public.elemental_teams t ON t.id = i.team_id WHERE t.edition = 'elemental-2026'),
      'canvas_links', (SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY to_jsonb(l)::text), '[]') FROM public.elemental_canvas_links l
                       JOIN public.elemental_teams t ON t.id = l.team_id WHERE t.edition = 'elemental-2026'),
      'edition', (SELECT to_jsonb(e) FROM public.elemental_editions e WHERE e.key = 'elemental-2026'),
      'settings', (SELECT to_jsonb(s) FROM public.elemental_settings s WHERE s.guild_id = '${REAL}'),
      'boards', (SELECT jsonb_agg(w.elements ORDER BY w.id) FROM public.whiteboards w WHERE w.id IN ('${BOARDS[REAL].join("','")}')))::text`);
  }

  type BoardEl = { id: string; index: string; isDeleted: boolean; frameId: string | null; customData?: Record<string, unknown> };
  const boardElements = (board: string) =>
    JSON.parse(psql(`SELECT coalesce(jsonb_agg(el ORDER BY o), '[]') FROM public.whiteboards w, jsonb_array_elements(w.elements) WITH ORDINALITY x(el, o) WHERE w.id = '${board}'`)) as BoardEl[];

  beforeAll(async () => {
    await start();
    applyAll();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "elemental-e2e-"));

    // Fixtures the scripts read: 10 boards (5 per edition), two paid registrations (3 + 2 members),
    // a pending and another event's registration that must get no code, and two site accounts.
    psql(`
      INSERT INTO auth.users (id) VALUES ('${STAFF_ACCOUNT}'), ('${SITE[1]}'), ('${SITE[4]}');
      INSERT INTO auth.identities (provider, provider_id, user_id) VALUES ('discord', '${uid(1)}', '${SITE[1]}'), ('discord', '${uid(4)}', '${SITE[4]}');
      INSERT INTO public.whiteboards (id, owner_id, title)
      SELECT b, '${STAFF_ACCOUNT}', 'Element board' FROM unnest(ARRAY['${[...BOARDS[REAL], ...BOARDS[DRY]].join("','")}']::uuid[]) AS b;
      ${[
        [FIRE_BOARD, "frame-a", SITE[1]],
        [WATER_BOARD, "frame-b", SITE[4]],
      ]
        .map(
          ([board, frame, owner]) => `
      UPDATE public.whiteboards SET elements = jsonb_build_array(
        jsonb_build_object('id', '${frame}', 'type', 'frame', 'x', 0, 'y', 0, 'width', 1800, 'height', 1400, 'index', 'a0',
          'version', 1, 'versionNonce', 1, 'isDeleted', false, 'frameId', NULL,
          'customData', jsonb_build_object('project', 'proj-${frame}', 'owner', '${owner}', 'createdBy', '${owner}', 'editors', '[]'::jsonb)),
        jsonb_build_object('id', '${frame}-test', 'type', 'rectangle', 'x', ${ZONE.x}, 'y', ${ZONE.y}, 'width', ${ZONE.width}, 'height', ${ZONE.height}, 'index', 'a1',
          'version', 1, 'versionNonce', 2, 'isDeleted', false, 'frameId', '${frame}', 'locked', true,
          'customData', jsonb_build_object('zone', 'test'))) WHERE id = '${board}';`
        )
        .join("\n")}
      DO $$
      DECLARE reg uuid; n integer; slug text; st text;
      BEGIN
        FOR slug, st, n IN SELECT * FROM (VALUES ('elemental-2026', 'paid', 3), ('elemental-2026', 'paid', 2),
                                                 ('elemental-2026', 'pending', 2), ('another-event', 'paid', 1)) v LOOP
          INSERT INTO public.hackathon_event_registrations (event_slug, status, team_name, member_count, amount_baht, contact_email, contact_phone)
          VALUES (slug, st, 'Test Group', n, 0, 'test@example.invalid', '0') RETURNING id INTO reg;
          INSERT INTO public.hackathon_event_registration_members (registration_id, position, full_name, age, school, parent_name, parent_phone, parent_consent)
          SELECT reg, k, 'Member', 16, 'Test School', 'Parent', '0', true FROM generate_series(1, n) AS k;
        END LOOP;
      END $$;`);

    discord = fakeDiscord();
    for (const guild of [REAL, DRY]) {
      ports.set(guild, new FakeGuildPort(guild));
      // The Host's role, given by a server admin.
      discord.held(guild, HOST_PERSON).add(ROLES[guild].host);
    }
  }, 240_000);

  afterAll(async () => {
    await pool?.end();
    stop();
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // 1. Staff scripts
  // -------------------------------------------------------------------------

  it("seeds both guilds, gives elemental_bot a login and issues the codes", async () => {
    const guild = (id: string, edition: string, extra: Record<string, unknown>) => ({
      guild_id: id,
      edition,
      role_ids: ROLES[id],
      channel_ids: CHANNELS[id],
      element_category_ids: Object.fromEntries(ELEMENTS.map((e) => [e, [CATEGORIES[id][e]]])),
      boards: Object.fromEntries(ELEMENTS.map((e, i) => [e, [BOARDS[id][i]]])),
      team_create_opens_at: "2026-11-01T00:00:00+07:00",
      team_create_closes_at: null,
      ...extra,
    });
    const config = path.join(tmp, "seed.json");
    fs.writeFileSync(
      config,
      JSON.stringify({
        real_guild_id: REAL,
        guilds: [
          guild(REAL, "elemental-2026", { retention_until: "2027-03-31T00:00:00+07:00" }),
          guild(DRY, "elemental-dryrun", { schedule: { [DRY_DAY]: { opening_at: "19:00", call_at: "19:55", card_at: "20:30" } } }),
        ],
      })
    );
    const admin = { ELEMENTAL_ADMIN_DATABASE_URL: connectionString() };
    const seeded = deps(admin);
    expect(await seed(["--config", config, "--opening", `${TODAY}T19:00`, "--days", `${TODAY}..${TODAY}`, "--allow-date-change"], seeded.d)).toBe(0);
    expect(seeded.lines.join("\n")).toContain(`guild ${REAL} -> elemental-2026 (event): settings created`);
    expect(seeded.lines.join("\n")).toContain(`guild ${DRY} -> elemental-dryrun (rehearsal): settings created`);

    const password = deps({ ...admin, ELEMENTAL_BOT_PASSWORD: BOT_PASSWORD });
    expect(await setRolePassword([], password.d)).toBe(0);
    expect(password.lines.join("\n")).toMatch(/exposure outside elemental_bot_\*: none/);

    const claimsDir = path.join(tmp, "claims");
    const issued = deps(admin);
    expect(await issueClaims(["--out-dir", claimsDir], issued.d)).toBe(0);
    expect(issued.lines.join("\n")).toMatch(/2 paid registrations, 5 new, 0 already issued/);
    const rehearsal = deps(admin);
    expect(await issueClaims(["--rehearsal", "2", "--out-dir", claimsDir], rehearsal.d)).toBe(0);

    const files = fs.readdirSync(claimsDir);
    const csv = fs.readFileSync(path.join(claimsDir, files.find((f) => /^claims-\d{4}-\d{2}-\d{2}\.csv$/.test(f))!), "utf8").trimEnd().split("\n");
    expect(csv[0]).toBe("registration_id,team_name,position,code");
    for (const line of csv.slice(1)) {
      const [registration, , position, code] = line.split(",");
      codes.push({ registration, position: Number(position), code });
    }
    expect(codes).toHaveLength(5);
    rehearsalCodes = fs.readFileSync(path.join(claimsDir, files.find((f) => f.startsWith("rehearsal-"))!), "utf8").trimEnd().split("\n").slice(1);
    expect(rehearsalCodes).toHaveLength(2);

    // The bot's own login, as startElemental builds it.
    const env = parseElementalEnv({
      ELEMENTAL_GUILD_IDS: `${REAL},${DRY}`,
      ELEMENTAL_DATABASE_URL: connectionString(DATABASE, "elemental_bot", BOT_PASSWORD),
    });
    pool = createRolePool(env.databaseUrl, "elemental-e2e");
    api = createElementalApi(pool);
    rt = createRuntime({ client: discord.client, api, env });
    rt.queues.canvas = createKeyedQueue("canvas", { sleep: async () => undefined });
    rt.queues.channels = createKeyedQueue("channels", { sleep: async () => undefined });
    setChannelPortFactory(rt, (guildId) => ports.get(guildId)!);
    // As startFeatures wires listeners (without starting pollers: the scheduler is driven by hand below).
    for (const feature of registry().features) {
      for (const [name, listener] of Object.entries(feature.events ?? {})) {
        const bound = (payload: unknown) => (listener as (p: unknown, r: ElementalRuntime) => Promise<void> | void)(payload, rt);
        rt.events.on(name as ElementalEventName, bound as ElementalListener<ElementalEventName>);
      }
    }
    const who = await pool.query<{ u: string }>("SELECT current_user AS u");
    expect(who.rows[0].u).toBe("elemental_bot");
    await expect(pool.query("SELECT count(*) FROM public.elemental_members")).rejects.toThrow(/permission denied/);
  });

  // -------------------------------------------------------------------------
  // 2. Claims, rehearsal codes, the picker
  // -------------------------------------------------------------------------

  it("/join: 5 people from 2 registrations land in elemental-2026 with the Paid role", async () => {
    // The registration of three first, then the one of two, each by position.
    const groups = [...new Set(codes.map((c) => c.registration))]
      .map((r) => codes.filter((c) => c.registration === r).sort((a, b) => a.position - b.position))
      .sort((a, b) => b.length - a.length);
    expect(groups.map((g) => g.length)).toEqual([3, 2]);
    expect(codes.every((c) => /^[A-HJ-NP-Z2-9]{8}$/.test(c.code))).toBe(true);

    const people = groups.flat();
    for (const [k, c] of people.entries()) {
      // Typed with a dash and lower case, as people do.
      const typed = `${c.code.slice(0, 4)}-${c.code.slice(4)}`.toLowerCase();
      const sent = await act("command", { guild: REAL, user: uid(k + 1), channel: CHANNELS[REAL].start_here, command: "join", options: { code: typed } });
      expect(last(sent)).toBe(JOIN.joined);
      expect(discord.held(REAL, uid(k + 1)).has(ROLES[REAL].paid)).toBe(true);
    }
    // Used once: a second person with person 1's code is refused.
    const reused = await act("command", { guild: REAL, user: uid(6), channel: CHANNELS[REAL].start_here, command: "join", options: { code: people[0].code } });
    expect(last(reused)).toBe(JOIN.codeUsed);
    // Outside #start-here: refused before the database.
    const elsewhere = await act("command", { guild: REAL, user: uid(6), channel: CHANNELS[REAL].news, command: "join", options: { code: people[0].code } });
    expect(last(elsewhere)).toBe(JOIN.wrongChannel(CHANNELS[REAL].start_here));

    expect(psql(`SELECT edition || ':' || count(*) FROM public.elemental_members GROUP BY edition`)).toBe("elemental-2026:5");
    // Each member row once, both registrations.
    expect(psql(`SELECT count(DISTINCT r.registration_id) || ',' || count(DISTINCT m.registration_member_id) FROM public.elemental_members m
                 JOIN public.hackathon_event_registration_members r ON r.id = m.registration_member_id`)).toBe("2,5");
  });

  it("rehearsal codes work in the rehearsal guild only", async () => {
    const wrong = await act("command", { guild: REAL, user: uid(6), channel: CHANNELS[REAL].start_here, command: "join", options: { code: rehearsalCodes[0] } });
    expect(last(wrong)).toBe(JOIN.wrongEdition);

    const testCodes = await host(DRY, SUB.testCodes, { n: 1 });
    const fromTool = text(testCodes).match(/^[A-HJ-NP-Z2-9]{8}$/gm) ?? [];
    expect(fromTool).toHaveLength(1);
    expect(text(await host(REAL, SUB.testCodes, { n: 1 }))).toBe(STAFF.rehearsalOnly);

    for (const [k, code] of [...rehearsalCodes, ...fromTool].entries()) {
      const sent = await act("command", { guild: DRY, user: uid(11 + k), channel: CHANNELS[DRY].start_here, command: "join", options: { code } });
      expect(last(sent)).toBe(JOIN.joined);
      expect(discord.held(DRY, uid(11 + k)).has(ROLES[DRY].paid)).toBe(true);
    }
    expect(psql(`SELECT string_agg(edition || ':' || n, ',' ORDER BY edition) FROM
                 (SELECT edition, count(*) AS n FROM public.elemental_members GROUP BY edition) x`)).toBe("elemental-2026:5,elemental-dryrun:3");
  });

  it("the picker: Host posts it, each click sets one element role", async () => {
    const posted = await host(REAL, "picker");
    expect(last(posted)).toBe(JOIN.pickerPosted(CHANNELS[REAL].start_here));
    const picker = discord.posts.filter((p) => p.channelId === CHANNELS[REAL].start_here).at(-1)!;
    expect(JSON.stringify(picker.body.components)).toContain("el|pick|fire");

    const picks: Record<number, El> = { 1: "air", 2: "fire", 3: "fire", 4: "water", 5: "water" };
    for (const [n, element] of Object.entries(picks)) {
      const sent = await act("button", { guild: REAL, user: uid(Number(n)), channel: CHANNELS[REAL].start_here, customId: `el|pick|${element}` });
      expect(last(sent)).toBe(JOIN.picked(element));
    }
    // Person 1 changes their mind: still exactly one element role.
    await act("button", { guild: REAL, user: uid(1), channel: CHANNELS[REAL].start_here, customId: "el|pick|fire" });
    const elementRoles = (n: number) => ELEMENTS.filter((e) => discord.held(REAL, uid(n)).has(ROLES[REAL][e]));
    expect([1, 2, 3, 4, 5].map(elementRoles)).toEqual([["fire"], ["fire"], ["fire"], ["water"], ["water"]]);
  });

  // -------------------------------------------------------------------------
  // 3. Teams
  // -------------------------------------------------------------------------

  let teamA: { slot: number; channelId: string };
  let teamB: { slot: number; channelId: string };

  it("/team create with Accept makes 2 live teams with private channels", async () => {
    teamA = await makeTeam(REAL, uid(1), [uid(2), uid(3)], "Ember Watch", "fire");
    teamB = await makeTeam(REAL, uid(4), [uid(5)], "Tide Map", "water");
    expect(teamA.slot).toBe(candidateSlots("fire")[0]);
    expect(teamB.slot).toBe(candidateSlots("water")[0]);

    const port = ports.get(REAL)!;
    const a = port.byId(teamA.channelId);
    expect(a.name).toBe(`fire-${String(teamA.slot).padStart(2, "0")}`);
    expect(a.parentId).toBe(CATEGORIES[REAL].fire);
    const allowed = a.overwrites.filter((o) => o.allow > BigInt(0)).map((o) => o.id);
    expect(allowed).toEqual(expect.arrayContaining([uid(1), uid(2), uid(3), ROLES[REAL].host, ROLES[REAL].helper, ROLES[REAL].mentor, BOT]));
    expect(allowed).not.toContain(ROLES[REAL].judge);
    expect(allowed).not.toContain(uid(4));
    expect(a.overwrites.find((o) => o.id === REAL)?.allow).toBe(BigInt(0));
    // The welcome is posted and pinned in the team's own channel.
    expect(a.messages.filter((m) => m.pinned)).toHaveLength(1);
    expect(port.byId(teamB.channelId).name).toBe(`water-${String(teamB.slot).padStart(2, "0")}`);
  });

  // -------------------------------------------------------------------------
  // 4. Canvas, testers, report, check-in
  // -------------------------------------------------------------------------

  it("/canvas link on the fixture boards pins the link in each team channel", async () => {
    const link = async (person: number, channel: string, board: string, frame: string) =>
      act("command", { guild: REAL, user: uid(person), channel, command: "canvas", sub: "link", options: { url: `https://passionseed.org/whiteboard/${board}?focus=${frame}` } });
    // A water team cannot link the fire board.
    const wrongBoard = await link(4, teamB.channelId, FIRE_BOARD, "frame-a");
    expect(psql(`SELECT count(*) FROM public.elemental_canvas_links`)).toBe("0");
    expect(last(wrongBoard)).toContain(canvasErrorText("wrong_element_board", "fire")!);
    expect(last(wrongBoard)).not.toContain(CANVAS.linked(teamB.slot));

    expect(last(await link(1, teamA.channelId, FIRE_BOARD, "frame-a"))).toContain(CANVAS.linked(teamA.slot));
    expect(last(await link(4, teamB.channelId, WATER_BOARD, "frame-b"))).toContain(CANVAS.linked(teamB.slot));
    expect(psql(`SELECT string_agg(board_id || ':' || frame_id, ',' ORDER BY frame_id) FROM public.elemental_canvas_links`)).toBe(
      `${FIRE_BOARD}:frame-a,${WATER_BOARD}:frame-b`
    );
    for (const channel of [teamA.channelId, teamB.channelId]) {
      expect(discord.log).toContainEqual({ method: "put", route: expect.stringMatching(new RegExp(`^/channels/${channel}/messages/pins/\\d+$`)) });
    }
  });

  const TESTERS: [number, string, string][] = [
    [1, "a classmate", "the sign-up page on a phone"],
    [2, "a neighbour", "the paper map"],
    [3, "a younger cousin", "the big-text version"],
    [1, "a parent", "the first screen"],
    [2, "a teacher", "the quiz at the end"],
    [3, "a friend from the club", "the colour picker"],
    [1, "a shop owner", "the price list page"],
    [2, "an older student", "the night mode"],
    [3, "a grandparent", "the voice button"],
    [1, "a coach", "the timer"],
  ];
  const entryIds = () =>
    psql(`SELECT string_agg(e.id::text, ',' ORDER BY e.created_at) FROM public.elemental_tester_entries e
          JOIN public.elemental_teams t ON t.id = e.team_id WHERE t.edition = 'elemental-2026'`).split(",");

  it("12 /tester submissions: 1 refused for contacts, 1 removed by staff, 10 notes on the canvas", async () => {
    const submit = (person: number, who: string, tried: string) =>
      act("modal", { guild: REAL, user: uid(person), channel: teamA.channelId, customId: `el|${TESTER_ACTIONS.add}`, fields: { who, tried, quote: "", changed: "" } });

    // The command opens the form in the team channel.
    const form = await act("command", { guild: REAL, user: uid(1), channel: teamA.channelId, command: "tester" });
    expect(form[0]?.how).toBe("modal");

    // 1-6 counted.
    for (const [k, [person, who, tried]] of TESTERS.slice(0, 6).entries()) {
      expect(last(await submit(person, who, tried))).toBe(`${TESTER.counted(k + 1, 10)}\n${TESTER.canvasWritten}`);
    }
    // 7th submission: a phone number, refused in the bot before the database.
    const before = psql("SELECT count(*) FROM public.elemental_tester_entries");
    expect(last(await submit(2, "a neighbour", "call me 081-234-5678"))).toBe(TESTER.pii(TESTER.fieldNames.tried));
    expect(psql("SELECT count(*) FROM public.elemental_tester_entries")).toBe(before);
    // 8th-11th: up to the cap.
    for (const [k, [person, who, tried]] of TESTERS.slice(6, 10).entries()) {
      expect(last(await submit(person, who, tried))).toBe(`${TESTER.counted(k + 7, 10)}\n${TESTER.canvasWritten}`);
    }

    // Each counted entry went to the fire thread of the staff mirror channel, never naming who logged it.
    const thread = discord.threads.find((t) => t.parent_id === CHANNELS[REAL].mirror && t.name === TESTER.threadName("fire"));
    expect(thread).toBeDefined();
    const mirrored = discord.posts.filter((p) => p.channelId === thread!.id);
    expect(mirrored).toHaveLength(10);
    for (const n of [1, 2, 3]) expect(JSON.stringify(mirrored)).not.toContain(uid(n));

    // Staff remove the second entry from its mirror post (Remove, then the reason form).
    const second = entryIds()[1];
    const removeButton = `el|${MIRROR_ACTIONS.remove}|${second}`;
    expect(JSON.stringify(mirrored.map((m) => m.body.components))).toContain(removeButton);
    const opened = await act("button", { guild: REAL, user: HOST_PERSON, channel: thread!.id, customId: removeButton });
    expect(opened[0]?.how).toBe("modal");
    const removed = await act("modal", {
      guild: REAL,
      user: HOST_PERSON,
      channel: thread!.id,
      customId: `el|${STAFF_ACTIONS.removeReason}|${second}`,
      fields: { reason: "not a real test" },
      fromMessage: true,
    });
    expect(text(removed)).toContain(TESTER.mirrorRemoved);
    expect(text(removed)).toContain(STAFF.tombstoned);

    // 12th submission counts again (10/10).
    expect(last(await submit(2, "a bus driver", "the stop finder"))).toBe(`${TESTER.counted(10, 10)}\n${TESTER.canvasWritten}`);

    expect(psql(`SELECT count(*) || ',' || count(*) FILTER (WHERE counted) || ',' || count(*) FILTER (WHERE removed_at IS NOT NULL)
                 FROM public.elemental_tester_entries WHERE edition = 'elemental-2026'`)).toBe("11,10,1");
    expect(psql(`SELECT lit_at IS NOT NULL FROM public.elemental_teams WHERE slot = ${teamA.slot} AND edition = 'elemental-2026'`)).toBe("t");
  });

  it("the fixture canvas holds exactly 10 live notes with valid increasing indices", () => {
    const ids = entryIds();
    const removed = ids[1];
    const notes = boardElements(FIRE_BOARD).filter((e) => e.id.startsWith("el-"));
    // Rectangle and text per entry, all 11 placed; the removed one is a tombstone.
    expect(notes.map((n) => n.id)).toEqual(ids.flatMap((id) => [noteIds(id).rect, noteIds(id).text]));
    const live = notes.filter((n) => !n.isDeleted);
    expect(live.filter((n) => n.id.endsWith("-r"))).toHaveLength(10);
    expect(live.filter((n) => n.id.endsWith("-t"))).toHaveLength(10);
    expect(notes.filter((n) => n.isDeleted).map((n) => n.id)).toEqual([noteIds(removed).rect, noteIds(removed).text]);

    const indices = boardElements(FIRE_BOARD).map((e) => e.index);
    expect(indices.every((k) => isValidIndex(k))).toBe(true);
    for (let k = 1; k < indices.length; k++) expect(indices[k] > indices[k - 1]).toBe(true);
    for (const n of live) expect(n.frameId).toBe("frame-a");
    for (const n of live.filter((x) => x.id.endsWith("-r"))) {
      expect(n.customData).toMatchObject({ card: "test", source: "tester", updatedBy: STAFF_ACCOUNT });
    }
    // Nothing landed on the water board.
    expect(boardElements(WATER_BOARD).filter((e) => e.id.startsWith("el-"))).toHaveLength(0);
    // The first counted entry rang the bell in news once.
    expect(psql(`SELECT count(*) FROM public.elemental_posts WHERE kind = 'bell' AND status = 'sent'`)).toBe("1");
  });

  it("/report reaches #reports only", async () => {
    const opened = await act("command", { guild: REAL, user: uid(5), channel: CHANNELS[REAL].start_here, command: "report" });
    expect(opened[0]?.how).toBe("modal");
    const before = discord.posts.length;
    const sent = await act("modal", {
      guild: REAL,
      user: uid(5),
      channel: CHANNELS[REAL].start_here,
      customId: "el|report",
      fields: { text: "someone keeps posting mean jokes", where: "the voice chat" },
    });
    expect(last(sent)).toBe(REPORT.received);
    const posted = discord.posts.slice(before);
    expect(posted.map((p) => p.channelId)).toEqual([CHANNELS[REAL].reports]);
    expect(posted[0].body.allowed_mentions).toEqual({ parse: [], roles: [ROLES[REAL].safety] });
    expect(psql(`SELECT count(*) FROM public.elemental_reports WHERE edition = 'elemental-2026'`)).toBe("1");
  });

  it("/checkin: once per team per day", async () => {
    const first = await act("command", { guild: REAL, user: uid(4), channel: teamB.channelId, command: "checkin" });
    expect(last(first)).toBe(TESTER.checkedIn(teamB.slot));
    const again = await act("command", { guild: REAL, user: uid(5), channel: teamB.channelId, command: "checkin" });
    expect(last(again)).toBe(TESTER.alreadyCheckedIn);
    expect(psql(`SELECT count(*) FROM public.elemental_checkins WHERE edition = 'elemental-2026'`)).toBe("1");
  });

  // -------------------------------------------------------------------------
  // 5. The campfire legend and the 20:30 card
  // -------------------------------------------------------------------------

  it("19:55 posts the call, the island and the legend; 20:30 posts the card with the right totals", async () => {
    const totals = await api.call<Record<string, unknown>>("elemental_bot_totals", "elemental-2026", TODAY);
    expect(totals).toMatchObject({
      helped: 10,
      helped_today: 10,
      checked_in: 2,
      teams_total: 2,
      top_element: "fire",
      levels: { water: 0, earth: 0, air: 0, fire: 10, aether: 0 },
      teams: { water: 1, earth: 0, air: 0, fire: 1, aether: 0 },
    });

    let clock = atBangkok(TODAY, "19:55").getTime();
    const scheduler = createScheduler(rt, { now: () => clock, sleep: async () => undefined, fetch: () => Promise.reject(new Error("no network")) });
    const before = discord.posts.length;
    await scheduler.tick();
    const call = discord.posts.slice(before);
    const news = CHANNELS[REAL].news;
    const campfire = CHANNELS[REAL].campfire;
    expect(call.filter((p) => p.channelId === news).map((p) => p.body.content)).toEqual([
      SCHEDULE.opening(CHANNELS[REAL].start_here),
      SCHEDULE.call(campfire),
    ]);
    const fire = call.filter((p) => p.channelId === campfire);
    expect(fire[0].files.map((f) => f.name)).toEqual(["island.png"]);
    const expectedLegend = buildLegend(
      legendRows([
        { slot: teamA.slot, element: "fire", project_name: "Ember Watch" },
        { slot: teamB.slot, element: "water", project_name: "Tide Map" },
      ])
    );
    expect(expectedLegend.kind).toBe("messages");
    const legend = fire.slice(1).map((p) => String(p.body.content));
    expect(legend).toEqual(expectedLegend.kind === "messages" ? expectedLegend.messages : []);
    expect(legend.join("\n")).toContain(`${String(teamA.slot).padStart(2, "0")} · ${SCHEDULE.legendElement("fire")} · Ember Watch`);
    // Public posts name no person.
    for (const p of call) for (const n of [1, 2, 3, 4, 5]) expect(JSON.stringify(p.body)).not.toContain(uid(n));
    // A second poll in the same minute sends nothing again.
    await scheduler.tick();
    expect(discord.posts.length).toBe(before + call.length);

    clock = atBangkok(TODAY, "20:30").getTime();
    const beforeCard = discord.posts.length;
    await scheduler.tick();
    const cardPosts = discord.posts.slice(beforeCard);
    expect(cardPosts.map((p) => p.channelId)).toEqual([news]);
    const card = cardPosts[0];
    expect(card.body.content).toBe(
      SCHEDULE.caption({
        helped: 10,
        helpedToday: 10,
        checkedIn: 2,
        teamsTotal: 2,
        topElement: "fire",
        levels: { water: 0, earth: 0, air: 0, fire: 10, aether: 0 },
      })
    );
    expect(card.body.allowed_mentions).toEqual({ parse: [] });
    const png = card.files[0].data;
    expect(card.files[0].name).toBe("card.png");
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1920);
    const hash = createHash("sha256").update(png).digest("hex");
    expect(hash).toBe(CARD_SHA256);
    expect(psql(`SELECT string_agg(kind || ':' || status, ',' ORDER BY kind) FROM public.elemental_posts
                 WHERE edition = 'elemental-2026' AND kind IN ('sch_opening', 'sch_call', 'sch_card')`)).toBe("sch_call:sent,sch_card:sent,sch_opening:sent");
    await scheduler.stop();

    if (out) {
      fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, "card.png"), png);
      fs.writeFileSync(path.join(out, "campfire-island.png"), fire[0].files[0].data);
      fs.writeFileSync(path.join(out, "legend.txt"), `${legend.join("\n")}\n`);
      fs.writeFileSync(
        path.join(out, "posts.json"),
        JSON.stringify(
          discord.posts.map((p) => ({ channel: p.channelId, content: p.body.content ?? null, files: p.files.map((f) => f.name) })),
          null,
          2
        )
      );
    }
  });

  // -------------------------------------------------------------------------
  // 6. Rehearsal cleanup
  // -------------------------------------------------------------------------

  it("staff are never put on a team: a Judge is refused by the bot and by SQL (as elemental_bot), nothing is written", async () => {
    // Person 13 claimed a rehearsal code, then was given the Judge role.
    discord.held(DRY, uid(13)).add(ROLES[DRY].judge);
    const teamsBefore = psql(`SELECT count(*) FROM public.elemental_teams`);
    const invitesBefore = psql(`SELECT count(*) FROM public.elemental_team_invites`);
    const where = { guild: DRY, channel: CHANNELS[DRY].start_here };

    // The Judge cannot open /team create.
    const own = await act("command", { ...where, user: uid(13), command: "team", sub: "create" });
    expect(last(own)).toBe(TEAMS.staffNoTeam);

    // A student cannot invite the Judge.
    const by = { ...where, user: uid(11) };
    await act("modal", { ...by, customId: `el|${TEAM_ACTIONS.name}`, fields: { name: "Judge Inside" } });
    await act("string", { ...by, customId: `el|${TEAM_ACTIONS.element}`, values: ["earth"] });
    await act("users", { ...by, customId: `el|${TEAM_ACTIONS.members}`, values: [uid(13)] });
    const invited = await act("button", { ...by, customId: `el|${TEAM_ACTIONS.create}` });
    expect(last(invited)).toBe(teamErrorText("staff_member", uid(13)));

    // A Host cannot put the Judge on a team, by creating one or by moving them.
    const made = await host(DRY, OPS_SUB.create, { members: `<@${uid(12)}> <@${uid(13)}>`, project: "Judge Inside", element: "earth" });
    expect(last(made)).toBe(opsErrorText("staff_member", uid(13)));

    // SQL refuses what the bot flags, through the bot's own least-privilege login.
    await expect(api.call("elemental_bot_team_create_staff", DRY, HOST_PERSON, "Judge Inside", "earth", [uid(12), uid(13)], null, [uid(13)])).rejects.toEqual(
      new ElementalError("staff_member", uid(13))
    );
    await expect(api.call("elemental_bot_team_create", DRY, uid(13), "Judge Inside", "earth", [uid(12)], [uid(13)])).rejects.toMatchObject({
      code: "staff_member",
    });

    expect(psql(`SELECT count(*) FROM public.elemental_teams`)).toBe(teamsBefore);
    expect(psql(`SELECT count(*) FROM public.elemental_team_invites`)).toBe(invitesBefore);
    expect(ports.get(DRY)!.channels.filter((c) => c.name.startsWith("earth-"))).toHaveLength(0);
    discord.held(DRY, uid(13)).delete(ROLES[DRY].judge);
  });

  it("/el dryrun-cleanup clears the rehearsal guild and touches no elemental-2026 row", async () => {
    const dry = await makeTeam(DRY, uid(11), [uid(12)], "Dry Run Kiosk", "earth");
    const tester = await act("modal", {
      guild: DRY,
      user: uid(12),
      channel: dry.channelId,
      customId: `el|${TESTER_ACTIONS.add}`,
      fields: { who: "a staff member", tried: "the kiosk", quote: "", changed: "" },
    });
    expect(last(tester)).toBe(`${TESTER.counted(1, 10)}\n${TESTER.canvasNotLinked}`);
    // Nothing from the rehearsal guild went to a real-guild channel.
    const realChannels = new Set([...Object.values(CHANNELS[REAL]), teamA.channelId, teamB.channelId]);
    const rehearsalTeamChannels = ports.get(DRY)!.channels.filter((c) => c.name.startsWith("earth-"));
    expect(rehearsalTeamChannels.map((c) => c.id)).toEqual([dry.channelId]);

    const snapshot = realEditionSnapshot();
    const deletesBefore = discord.log.filter((l) => l.method === "delete").length;

    expect(text(await host(REAL, SUB.cleanup, { confirm: "elemental-2026" }))).toBe(STAFF.rehearsalOnly);
    expect(text(await host(DRY, SUB.cleanup, { confirm: "elemental-2026" }))).toBe(STAFF.cleanupBadConfirm("elemental-dryrun"));
    expect(text(await host(DRY, SUB.cleanup, { confirm: "elemental-dryrun" }))).toBe(STAFF.cleanupDone({ teams: 1, deleted: 1, failed: 0 }));

    const deleted = discord.log.filter((l) => l.method === "delete").slice(deletesBefore).map((l) => l.route);
    expect(deleted).toEqual([Routes.channel(dry.channelId)]);
    for (const id of realChannels) expect(deleted).not.toContain(Routes.channel(id));
    expect(psql(`SELECT status || ',' || (slot IS NULL) FROM public.elemental_teams WHERE edition = 'elemental-dryrun'`)).toBe("archived,true");
    expect(psql(`SELECT count(*) FILTER (WHERE counted) FROM public.elemental_tester_entries WHERE edition = 'elemental-dryrun'`)).toBe("0");

    // Row for row, the real edition is as it was.
    expect(realEditionSnapshot()).toBe(snapshot);
    expect(psql(`SELECT string_agg(status || ':' || slot, ',' ORDER BY slot) FROM public.elemental_teams WHERE edition = 'elemental-2026'`)).toBe(
      [teamA.slot, teamB.slot]
        .sort((x, y) => x - y)
        .map((s) => `active:${s}`)
        .join(",")
    );
  });
});
