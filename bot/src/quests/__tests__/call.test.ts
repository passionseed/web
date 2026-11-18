/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ChannelType, DiscordAPIError, MessageFlags, PermissionFlagsBits, type Client } from "discord.js";

import { FOCUS_MINUTES, REST_MINUTES } from "@/lib/shift-island/rounds-rules";

import { QuestDbError, QuestError, type QuestApi } from "../api";
import {
  CALL_SCHEMA,
  EDIT_EVERY_MS,
  callNonce,
  callPayload,
  callView,
  normalizeCall,
  normalizeOff,
  openerOf,
  pingHeard,
  roomProblem,
  stageAt,
  startCall,
  type CallData,
  type CallLoop,
  type CallStage,
} from "../call";
import { CALL, GUESTS, GUEST_KEYS, REVEAL, ROUND_GUEST } from "../callCopy";
import { T } from "../copy";
import { LIVE } from "../island/copy";
import { NEWS } from "../newsCopy";
import { bodyText, customIds } from "../test-helpers/view";
import { ISLAND_LINK_LABEL } from "../weblink";

const GUILD = "100000000000000001";
const NEWS_CH = "200000000000000020";
const ROOM = "200000000000000002";
const OTHER_CH = "200000000000000099";
const ROLE = "400000000000000001";
const ROLE2 = "400000000000000002";
const BOT_ID = "300000000000000001";
const DAY = "2026-11-18";
const YESTERDAY_MSG = "800000000000000001";
const WEB = "https://www.passionseed.org/shift/island";
const V2 = MessageFlags.IsComponentsV2;

/** 18:50 Bangkok on DAY (11:50 UTC), in ms; the evening's clock in unix seconds. */
const CALL_MS = Date.UTC(2026, 10, 18, 11, 50, 0);
const CALL_AT = CALL_MS / 1000;
const LIT_AT = CALL_AT + 10 * 60;
const GUEST_FROM = CALL_AT + 35 * 60;
const GUEST_UNTIL = CALL_AT + 130 * 60;
const MIN = 60_000;
/** ms at a number of minutes after 18:50 Bangkok. */
const at = (minutes: number) => CALL_MS + minutes * MIN;

/** shift_quest_call_today's answer, as the database sends it. */
function raw(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    day: DAY,
    guest: "boat",
    call_at: CALL_AT,
    lit_at: LIT_AT,
    guest_from: GUEST_FROM,
    guest_until: GUEST_UNTIL,
    channel_id: NEWS_CH,
    coworking_channel_id: ROOM,
    ping_role_ids: [ROLE],
    due: true,
    message_id: null,
    message_channel_id: null,
    previous: null,
    drop: null,
    ...over,
  };
}

const data = (over: Record<string, unknown> = {}): CallData => normalizeCall(raw(over))!;

const view = (d: CallData, stage: CallStage, sitters = 0) => callView(d, { stage, sitters, guildId: GUILD, webUrl: WEB });
const sent = (d: CallData, stage: CallStage, sitters = 0) => callPayload(view(d, stage, sitters), d, "send");

const savedEnv = process.env.SHIFT_ISLAND_URL;
beforeEach(() => {
  process.env.SHIFT_ISLAND_URL = WEB;
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  if (savedEnv === undefined) delete process.env.SHIFT_ISLAND_URL;
  else process.env.SHIFT_ISLAND_URL = savedEnv;
});

// ---------------------------------------------------------------------------
// The database's answer
// ---------------------------------------------------------------------------

describe("normalizeCall", () => {
  it("keeps a valid answer, roles as snowflakes only (at most 5, no repeats)", () => {
    const d = normalizeCall(
      raw({
        ping_role_ids: [ROLE, "everyone", ROLE, "@here", ROLE2, "400000000000000003", "400000000000000004", "400000000000000005", "400000000000000006"],
        message_id: "900000000000000001",
        message_channel_id: OTHER_CH,
        previous: { channel_id: NEWS_CH, message_id: YESTERDAY_MSG },
        drop: { teams: "3" },
      })
    );
    expect(d).toEqual({
      day: DAY,
      guest: "boat",
      callAt: CALL_AT,
      litAt: LIT_AT,
      guestFrom: GUEST_FROM,
      guestUntil: GUEST_UNTIL,
      channelId: NEWS_CH,
      coworkingId: ROOM,
      pingRoleIds: [ROLE, ROLE2, "400000000000000003", "400000000000000004", "400000000000000005"],
      due: true,
      messageId: "900000000000000001",
      messageChannelId: OTHER_CH,
      previous: { channelId: NEWS_CH, messageId: YESTERDAY_MSG },
      drop: { teams: 3 },
      off: false,
    });
  });

  it("keeps a withheld count (null) apart from no drop yet, and from 0", () => {
    expect(normalizeCall(raw({ drop: { teams: null } }))?.drop).toEqual({ teams: null });
    expect(normalizeCall(raw({ drop: {} }))?.drop).toEqual({ teams: null });
    expect(normalizeCall(raw({ drop: { teams: 0 } }))?.drop).toEqual({ teams: 0 });
    expect(normalizeCall(raw({ drop: null }))?.drop).toBeNull();
  });

  it("reads the switched-off answer only as the call to retire, never as tonight's call", () => {
    const off = { off: true, day: DAY, message_id: "900000000000000001", message_channel_id: NEWS_CH };
    expect(normalizeCall(off)).toBeNull();
    const d = normalizeOff(off)!;
    expect([d.off, d.day, d.messageId, d.messageChannelId, d.pingRoleIds, d.guest, d.due, d.drop]).toEqual([
      true,
      DAY,
      "900000000000000001",
      NEWS_CH,
      [],
      null,
      false,
      null,
    ]);
    expect(normalizeOff(raw())).toBeNull();
    expect(normalizeOff({ ...off, message_id: null })).toBeNull();
    expect(normalizeOff({ ...off, day: "today" })).toBeNull();
    expect(normalizeOff(null)).toBeNull();
  });

  it("reads an unknown guest as no guest, and a bad coworking channel as none", () => {
    const d = normalizeCall(raw({ guest: "dragon", coworking_channel_id: "#room", ping_role_ids: "nope", due: "yes" }))!;
    expect([d.guest, d.coworkingId, d.pingRoleIds, d.due]).toEqual([null, null, [], false]);
  });

  it.each([
    ["null (the call is off)", null],
    ["a bad day", raw({ day: "tonight" })],
    ["a channel that is not a snowflake", raw({ channel_id: "#island-news" })],
    ["no times", raw({ lit_at: null })],
    ["an array", [raw()]],
  ])("is null for %s", (_label, value) => {
    expect(normalizeCall(value)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

describe("stageAt", () => {
  it("invite before 19:00, lit until the guest, the guest until 21:00, then embers", () => {
    const d = data();
    expect([at(0), at(9.9), at(10), at(34.9), at(35), at(129.9), at(130), at(300)].map((t) => stageAt(d, t))).toEqual([
      "invite",
      "invite",
      "lit",
      "lit",
      "guest",
      "guest",
      "embers",
      "embers",
    ]);
  });

  it("stays lit until the embers on a night without a guest", () => {
    expect(stageAt(data({ guest: null }), at(60))).toBe("lit");
  });
});

describe("callView", () => {
  it("invite: the role line first, the opener, the first round as a live countdown, the teaser, the drop, the people line", () => {
    const p = sent(data(), "invite", 0);
    expect(p.flags).toBe(V2);
    const body = bodyText(p);
    expect(body.startsWith(`### ${CALL.title}\n<@&${ROLE}>\n`)).toBe(true);
    expect(body).toContain(openerOf(DAY));
    expect(body).toContain(CALL.invite);
    expect(body).toContain(`<t:${LIT_AT}:t> (<t:${LIT_AT}:R>)`);
    expect(body).toContain(`โฟกัส ${FOCUS_MINUTES} นาที พัก ${REST_MINUTES} นาที`);
    expect(body).toContain(CALL.teaser(GUEST_FROM));
    expect(body).toContain(CALL.drop);
    expect(body).toContain(CALL.people(0));
    expect(body).toContain(`-# ${CALL.mute}`);
    expect(body).toContain(`-# ${CALL.dayLine(DAY)}`);
  });

  it("never names the guest before it arrives", () => {
    for (const stage of ["invite", "lit"] as const) {
      const body = bodyText(sent(data(), stage, 4));
      for (const g of Object.values(GUESTS)) {
        expect(body).not.toContain(g.name);
        expect(body).not.toContain(g.arrive);
      }
    }
  });

  it("lit: the fire is lit, the teaser stays, the people line", () => {
    const body = bodyText(sent(data(), "lit", 2));
    expect(body.startsWith(`### ${CALL.litTitle}\n`)).toBe(true);
    expect(body).toContain(CALL.lit);
    expect(body).toContain(CALL.teaser(GUEST_FROM));
    expect(body).toContain(CALL.people(2));
  });

  it("guest: its arrival and stay; the drop's rule until it is made, then how many teams (never which) and the private check", () => {
    const before = sent(data(), "guest", 3);
    expect(bodyText(before).startsWith(`### ${GUESTS.boat.here}\n`)).toBe(true);
    expect(bodyText(before)).toContain(GUESTS.boat.arrive);
    expect(bodyText(before)).toContain(CALL.drop);
    expect(bodyText(before)).toContain(CALL.stay(GUESTS.boat, GUEST_UNTIL));
    expect(customIds(before)).toEqual([]);

    const after = sent(data({ drop: { teams: 3 } }), "guest", 3);
    expect(bodyText(after)).toContain(CALL.dropped(GUESTS.boat, 3));
    expect(bodyText(after)).not.toContain(CALL.drop);
    expect(customIds(after)).toEqual([`sq|rd_guest|${DAY}`]);

    const none = sent(data({ drop: { teams: 0 } }), "guest", 3);
    expect(bodyText(none)).toContain(CALL.dropped(GUESTS.boat, 0));

    // 1 or 2 teams, or all or none of them won: the database withholds the count.
    const withheld = sent(data({ drop: { teams: null } }), "guest", 3);
    expect(bodyText(withheld)).toContain(CALL.dropped(GUESTS.boat, null));
    expect(bodyText(withheld)).not.toContain(CALL.dropped(GUESTS.boat, 0));
    expect(customIds(withheld)).toEqual([`sq|rd_guest|${DAY}`]);
  });

  it("the public count never tells a team's result: no number when withheld, and it asks about your own team", () => {
    for (const g of Object.values(GUESTS)) {
      expect(CALL.dropped(g, null)).not.toMatch(/\d/);
      expect(CALL.dropped(g, null)).not.toBe(CALL.dropped(g, 0));
      expect(CALL.dropped(g, null)).toContain("ทีมคุณ");
      expect(CALL.dropped(g, 3)).toContain("ทีมคุณได้อะไร");
      // "ทีมไหนได้อะไร" reads as "see which team got what": the button only answers for the presser's own team.
      for (const n of [null, 0, 3]) expect(CALL.dropped(g, n)).not.toContain("ทีมไหน");
    }
  });

  it("off: a paused note with no people line, no ping line, no tomorrow promise and no guest check", () => {
    const d = normalizeOff({ off: true, day: DAY, message_id: "900000000000000001", message_channel_id: NEWS_CH })!;
    const p = callPayload(view(d, "off", 5), d, "edit");
    const body = bodyText(p);
    expect(body.startsWith(`### ${CALL.offTitle}\n`)).toBe(true);
    expect(body).toContain(CALL.off);
    expect(body).toContain(CALL.dayLine(DAY));
    for (const n of [0, 1, 5]) expect(body).not.toContain(CALL.people(n));
    expect(body).not.toContain(CALL.embers);
    expect(body).not.toContain("พรุ่งนี้");
    expect(body).not.toContain("<@&");
    expect(body).not.toContain(CALL.mute);
    expect(customIds(p)).toEqual([]);
    expect(p.allowedMentions).toEqual({ parse: [] });
    expect(stageAt(d, at(35))).toBe("off");
  });

  it("embers: no people line, the drop's count stays, the check stays", () => {
    const p = sent(data({ drop: { teams: 2 } }), "embers", 7);
    const body = bodyText(p);
    expect(body.startsWith(`### ${CALL.embersTitle}\n`)).toBe(true);
    expect(body).toContain(CALL.embers);
    expect(body).toContain(CALL.dropped(GUESTS.boat, 2));
    for (const n of [0, 1, 7]) expect(body).not.toContain(CALL.people(n));
    expect(customIds(p)).toEqual([`sq|rd_guest|${DAY}`]);
  });

  it("a night without a guest (no active season): no teaser, no drop, lit until the embers", () => {
    const d = data({ guest: null });
    for (const stage of ["invite", "lit", "guest", "embers"] as const) {
      const body = bodyText(sent(d, stage, 3));
      expect(body).not.toContain(CALL.drop);
      expect(body).not.toContain("🔭");
    }
    expect(bodyText(sent(d, "guest", 3)).startsWith(`### ${CALL.litTitle}\n`)).toBe(true);
  });

  it("floors the people line at 3 and counts no one by name", () => {
    expect(CALL.people(0)).toBe("👥 กองไฟยังว่าง มานั่งเป็นคนแรกได้");
    expect(CALL.people(1)).toBe(CALL.people(2));
    expect(CALL.people(1)).not.toMatch(/\d/);
    expect(CALL.people(3)).toContain("**3**");
    expect(NEWS).toBeTruthy();
  });

  it("links to the campfire voice channel and the web island", () => {
    const json = JSON.stringify(sent(data(), "invite").components);
    expect(json).toContain(`https://discord.com/channels/${GUILD}/${ROOM}`);
    expect(json).toContain(LIVE.join);
    expect(json).toContain(WEB);
    expect(json).toContain(ISLAND_LINK_LABEL);
    const noRoom = JSON.stringify(sent(data({ coworking_channel_id: null }), "invite").components);
    expect(noRoom).not.toContain("discord.com/channels");
  });

  it("the opener is picked by the day: the same all evening, and the days differ", () => {
    expect(openerOf(DAY)).toBe(openerOf(DAY));
    const days = Array.from({ length: 8 }, (_, k) => `2026-11-${String(10 + k).padStart(2, "0")}`);
    expect(new Set(days.map(openerOf)).size).toBe(CALL.openers.length);
  });
});

describe("the call's mentions", () => {
  it("a pinging send allows exactly the student roles, never users, @everyone or @here", () => {
    const d = data({ ping_role_ids: [ROLE, ROLE2] });
    const p = callPayload(view(d, "invite"), d, "send");
    expect(p.allowedMentions).toEqual({ roles: [ROLE, ROLE2], parse: [] });
    expect(bodyText(p).split("\n")[1]).toBe(`<@&${ROLE}> <@&${ROLE2}>`);
    expect(bodyText(p)).not.toMatch(/@everyone|@here|<@\d|<@!/);
  });

  it("without the ping: no mention line, no mute line, nothing allowed", () => {
    const d = data({ ping_role_ids: [] });
    const p = callPayload(view(d, "invite"), d, "send");
    expect(p.allowedMentions).toEqual({ parse: [] });
    expect(bodyText(p)).not.toContain("<@&");
    expect(bodyText(p)).not.toContain(CALL.mute);
  });

  it("an edit never allows a mention, even on a pinging call", () => {
    const d = data({ ping_role_ids: [ROLE] });
    for (const stage of ["invite", "lit", "guest", "embers"] as const) {
      expect(callPayload(view(d, stage), d, "edit").allowedMentions).toEqual({ parse: [] });
    }
  });
});

describe("the call's Thai copy (DRAFT)", () => {
  const all = JSON.stringify({ CALL, GUESTS, ROUND_GUEST, REVEAL }) + [
    ...GUEST_KEYS.flatMap((k) => [CALL.dropped(GUESTS[k], 0), CALL.dropped(GUESTS[k], 4), CALL.dropped(GUESTS[k], null), CALL.stay(GUESTS[k], 1), REVEAL.wonTitle(GUESTS[k]), REVEAL.lostTitle(GUESTS[k]), REVEAL.fullTitle(GUESTS[k]), REVEAL.full(GUESTS[k]), REVEAL.awayTitle(GUESTS[k]), REVEAL.quietTitle(GUESTS[k]), REVEAL.heading(GUESTS[k])]),
    CALL.round(1), CALL.teaser(1), CALL.people(0), CALL.people(1), CALL.people(5), CALL.dayLine(DAY), REVEAL.won("x"), REVEAL.looks(["a", "b"]),
  ].join("\n");

  it("follows the house rules: no dashes, no talking down, no streaks, no 'you missed', no coins", () => {
    expect(all).not.toMatch(/[—–]/);
    expect(all).not.toMatch(/น้องๆ|น้อง ๆ|เด็กๆ|เด็ก ๆ/);
    expect(all).not.toMatch(/สตรีค|streak|ติดต่อกัน/i);
    expect(all).not.toMatch(/ยังไม่ได้|พลาด|เมื่อวาน/);
    expect(all).not.toMatch(/เหรียญ|coin/i);
  });

  it("never counts anyone's minutes: the only minutes are the round lengths", () => {
    const minutes = all.match(/\d+ นาที/g) ?? [];
    expect(new Set(minutes)).toEqual(new Set([`${FOCUS_MINUTES} นาที`, `${REST_MINUTES} นาที`]));
  });

  it("says a look never grows the tree, and nobody counts your time", () => {
    expect(CALL.fine).toContain("ไม่มีใครนับเวลาของคุณ");
    expect(CALL.fine).toContain("ลุคไม่ทำให้ต้นไม้โต");
    expect(REVEAL.fine).toContain("ลุคไม่ทำให้ต้นไม้โต");
  });

  it("tells how to stop the ping with a setting that stops a role mention (a muted channel still notifies on mentions)", () => {
    expect(CALL.mute).not.toContain("ปิดเสียงห้องนี้ได้เลย");
    expect(CALL.mute).toContain("Suppress All Role @mentions");
    expect(T.callPing).toContain("Suppress All Role @mentions");
  });

  it("never says nobody can see which team got a look: a picked look shows on a shown team's tree", () => {
    for (const line of [ROUND_GUEST.fine, REVEAL.fine]) {
      expect(line).not.toContain("ไม่มีใครเห็นว่าทีมไหนได้");
      expect(line).toContain("บอทไม่ประกาศว่าทีมไหนได้");
    }
  });

  it("keeps its issue line apart from the news card's and the digest's", () => {
    expect(CALL.dayLine(DAY)).not.toContain(NEWS.dayLine(DAY));
    expect(CALL.dayLine(DAY)).not.toContain("ข่าวของ");
  });

  it("is marked DRAFT for the three-model review, and every button fits Discord", () => {
    const file = readFileSync(join(__dirname, "..", "callCopy.ts"), "utf8");
    expect(file).toContain("DRAFT");
    expect(CALL.btnCheck.length).toBeLessThanOrEqual(80);
  });
});

describe("roomProblem and pingHeard", () => {
  const me = { id: BOT_ID };
  const room = (canSend: boolean) => ({ guild: { members: { me } }, permissionsFor: () => ({ has: () => canSend }) });
  const client = (r: unknown) => ({ channels: { cache: new Map([[ROOM, r]]) } }) as unknown as Client;

  it("needs a coworking channel open to students, which the bot can post in", () => {
    expect(roomProblem(client(room(true)), ROOM, true)).toBeNull();
    expect(roomProblem(client(room(true)), null, true)).toContain("no coworking channel");
    expect(roomProblem(client(room(true)), ROOM, false)).toContain("not open to students");
    expect(roomProblem(client(room(false)), ROOM, true)).toContain("cannot send messages");
    expect(roomProblem(client(undefined), ROOM, true)).toContain("cannot see");
  });

  it("knows when a role ping would be silent", () => {
    const guild = (mentionable: boolean) => ({ roles: { cache: new Map([[ROLE, { mentionable }]]) }, members: { me } });
    const c = (mentionable: boolean) => ({ guilds: { cache: new Map([[GUILD, guild(mentionable)]]) } }) as unknown as Client;
    const channel = (all: boolean) => ({ permissionsFor: () => ({ has: (p: bigint) => all && p === PermissionFlagsBits.MentionEveryone }) });
    expect(pingHeard(c(true), GUILD, channel(false), [ROLE])).toBe(true);
    expect(pingHeard(c(false), GUILD, channel(true), [ROLE])).toBe(true);
    expect(pingHeard(c(false), GUILD, channel(false), [ROLE])).toBe(false);
    expect(pingHeard(c(false), GUILD, channel(false), [ROLE2])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

const DISCORD_UNKNOWN_MESSAGE = () => new DiscordAPIError({ message: "Unknown Message", code: 10008 }, 10008, 404, "GET", "/x", {});

interface FakeMessage {
  id: string;
  payload: Record<string, unknown>;
  components: unknown[];
  author: { id: string };
  edits: Record<string, unknown>[];
  deleted: boolean;
  delete: jest.Mock;
  edit: jest.Mock;
}

function fakeChannel(id: string, over: Record<string, unknown> = {}) {
  const sent: FakeMessage[] = [];
  let next = 1;
  const make = (payload: Record<string, unknown>, author = BOT_ID): FakeMessage => {
    const m: FakeMessage = {
      id: `90000000000000${String(next++).padStart(4, "0")}`,
      payload,
      components: JSON.parse(JSON.stringify(payload.components ?? [])),
      author: { id: author },
      edits: [],
      deleted: false,
      delete: jest.fn(async () => {
        m.deleted = true;
      }),
      edit: jest.fn(async (p: Record<string, unknown>) => {
        if (m.deleted) throw DISCORD_UNKNOWN_MESSAGE();
        m.edits.push(p);
        m.components = JSON.parse(JSON.stringify(p.components ?? []));
        return m;
      }),
    };
    return m;
  };
  const state = { readFails: false };
  const channel = {
    id,
    type: ChannelType.GuildAnnouncement,
    guildId: GUILD,
    send: jest.fn(async (payload: Record<string, unknown>) => {
      const m = make(payload);
      sent.push(m);
      return m;
    }),
    messages: {
      fetch: jest.fn(async (arg: unknown) => {
        if (state.readFails) throw new DiscordAPIError({ message: "Missing Access", code: 50001 }, 50001, 403, "GET", "/x", {});
        if (arg && typeof arg === "object" && "message" in arg) {
          const m = sent.find((s) => s.id === (arg as { message: string }).message);
          if (!m || m.deleted) throw DISCORD_UNKNOWN_MESSAGE();
          return m;
        }
        return new Map(sent.filter((m) => !m.deleted).map((m) => [m.id, m]));
      }),
    },
    ...over,
  };
  return { channel, sent, make, state };
}

/** The database as shift_quest_call_today, _claim, _mark and _campfire_drop answer, on a clock the test moves. */
function fakeDb(clock: { now: number }) {
  const db = {
    version: CALL_SCHEMA as number,
    off: false,
    guest: "boat" as string | null,
    stored: null as string | null,
    storedChannel: NEWS_CH,
    claimedAt: null as number | null,
    pingRoles: [ROLE] as string[],
    previous: null as null | { channel_id: string; message_id: string },
    drop: null as null | { teams: number | null },
    dropTeams: 2 as number | null,
    markError: null as Error | null,
    beforeMark: null as null | (() => void),
    /** Forces the claim's answer (else: 'new' when no claim, 'stale' for one 3 minutes old, else null). */
    claim: undefined as string | null | undefined,
    calls: [] as unknown[][],
  };
  const due = () => {
    if (db.stored) return false;
    const t = clock.now / 1000;
    if (t < CALL_AT) return false;
    if (db.claimedAt !== null && clock.now - db.claimedAt < 3 * MIN) return false;
    if (t < LIT_AT + 15 * 60) return true;
    return db.claimedAt !== null && t < LIT_AT + 30 * 60;
  };
  const call = jest.fn(async (fn: string, ...args: unknown[]) => {
    db.calls.push([fn, ...args]);
    if (fn === "shift_quest_schema_version") return db.version;
    if (fn === "shift_quest_call_today") {
      // Switched off: the latest recorded call, only to be retired.
      if (db.off) return db.stored ? { off: true, day: DAY, message_id: db.stored, message_channel_id: db.storedChannel } : null;
      return raw({
        guest: db.guest,
        ping_role_ids: db.pingRoles,
        due: due(),
        message_id: db.stored,
        message_channel_id: db.stored ? db.storedChannel : null,
        previous: db.previous,
        drop: db.drop,
      });
    }
    if (fn === "shift_quest_call_claim") {
      if (db.claim !== undefined) {
        const a = db.claim;
        db.claim = a === "new" || a === "stale" ? null : a;
        if (a === "new" || a === "stale") db.claimedAt = clock.now;
        return a;
      }
      if (!due()) return null;
      const answer = db.claimedAt === null ? "new" : "stale";
      db.claimedAt = clock.now;
      return answer;
    }
    if (fn === "shift_quest_call_mark") {
      if (db.markError) throw db.markError;
      db.beforeMark?.();
      if (!db.stored) {
        db.stored = args[2] as string;
        db.storedChannel = args[1] as string;
      }
      return db.stored;
    }
    if (fn === "shift_quest_campfire_drop") {
      db.drop = { teams: db.dropTeams };
      return { guest: "boat", done: true, fresh: true, teams: db.dropTeams };
    }
    throw new Error(`unexpected ${fn}`);
  });
  return { db, api: { call, rows: jest.fn() } as unknown as QuestApi };
}

const loops: CallLoop[] = [];
afterEach(async () => {
  while (loops.length) await loops.pop()!.stop();
});

function world(opts: { schema?: number } = {}) {
  const clock = { now: at(0) };
  const { db, api } = fakeDb(clock);
  const news = fakeChannel(NEWS_CH);
  const channels = new Map<string, unknown>([[NEWS_CH, news.channel]]);
  const room = { open: true, canSend: true, sitters: 0, present: [] as string[] };
  const voice = { guild: { members: { me: { id: BOT_ID } } }, permissionsFor: () => ({ has: () => room.canSend }) };
  const client = {
    user: { id: BOT_ID },
    channels: { fetch: jest.fn(async (id: string) => channels.get(id) ?? null), cache: new Map([[ROOM, voice]]) },
    guilds: { cache: new Map([[GUILD, { roles: { cache: new Map([[ROLE, { mentionable: true }]]) }, members: { me: { id: BOT_ID } } }]]) },
  };
  const state = { connected: true };
  const campfire = {
    status: () => ({ channel: ROOM, sitters: room.open ? room.sitters : 0 }),
    present: () => (room.open ? [...room.present] : null),
  };
  const start = () => {
    const loop = startCall(client as unknown as Client, api, {
      guildId: GUILD,
      connected: () => state.connected,
      campfire,
      schema: opts.schema ?? CALL_SCHEMA,
      now: () => clock.now,
    });
    loops.push(loop);
    return loop;
  };
  return { clock, db, api, news, channels, room, client, state, loop: start(), start };
}

const fnCalls = (w: ReturnType<typeof world>, fn: string) => w.db.calls.filter((c) => c[0] === fn);

describe("startCall: tonight's call", () => {
  it("claims, sends once pinging only the student role, records it, and sends nothing more", async () => {
    const w = world();
    await w.loop.poll();
    expect(fnCalls(w, "shift_quest_call_claim")).toEqual([["shift_quest_call_claim", DAY, NEWS_CH]]);
    expect(w.news.channel.send).toHaveBeenCalledTimes(1);
    const m = w.news.sent[0];
    expect(m.payload.allowedMentions).toEqual({ roles: [ROLE], parse: [] });
    expect(m.payload.flags).toBe(V2);
    expect(JSON.stringify(m.components)).toContain(CALL.dayLine(DAY));
    expect(fnCalls(w, "shift_quest_call_mark")).toEqual([["shift_quest_call_mark", DAY, NEWS_CH, m.id]]);
    // A stable nonce Discord enforces: a POST discord.js retries (a timeout, a reset, a 5xx) returns this call, never a second ping.
    expect([m.payload.nonce, m.payload.enforceNonce]).toEqual([callNonce(DAY), true]);
    expect(console.log).toHaveBeenCalledWith(`[shift-quests] campfire call posted for ${DAY} (pinged the student roles)`);
    for (const minutes of [0.5, 1, 5, 20]) {
      w.clock.now = at(minutes);
      await w.loop.poll();
    }
    expect(w.news.channel.send).toHaveBeenCalledTimes(1);
    expect(fnCalls(w, "shift_quest_call_claim")).toHaveLength(1);
  });

  it("without the ping switch: the same call, pinging nobody", async () => {
    const w = world();
    w.db.pingRoles = [];
    await w.loop.poll();
    expect(w.news.sent[0].payload.allowedMentions).toEqual({ parse: [] });
    expect(bodyText(w.news.sent[0].payload)).not.toContain("<@&");
  });

  it("does nothing while the call is off, or not due", async () => {
    const w = world();
    w.db.off = true;
    await w.loop.poll();
    expect(w.client.channels.fetch).not.toHaveBeenCalled();
    w.db.off = false;
    w.clock.now = at(-1);
    await w.loop.poll();
    w.clock.now = at(26);
    await w.loop.poll();
    expect(fnCalls(w, "shift_quest_call_claim")).toEqual([]);
    expect(w.news.channel.send).not.toHaveBeenCalled();
  });

  it("never invites to a fire students cannot join, or whose chat the bot cannot post in, and says so once", async () => {
    const w = world();
    w.room.open = false;
    await w.loop.poll();
    await w.loop.poll();
    expect(fnCalls(w, "shift_quest_call_claim")).toEqual([]);
    expect((console.warn as jest.Mock).mock.calls).toHaveLength(1);
    expect(String((console.warn as jest.Mock).mock.calls[0][0])).toContain("not open to students");
    w.room.open = true;
    w.room.canSend = false;
    await w.loop.poll();
    await w.loop.poll();
    expect(fnCalls(w, "shift_quest_call_claim")).toEqual([]);
    expect((console.warn as jest.Mock).mock.calls).toHaveLength(2);
    w.room.canSend = true;
    await w.loop.poll();
    expect(w.news.channel.send).toHaveBeenCalledTimes(1);
  });

  it("warns once when the ping would be silent, and still sends", async () => {
    const w = world();
    (w.client.guilds.cache.get(GUILD)!.roles.cache.get(ROLE) as { mentionable: boolean }).mentionable = false;
    Object.assign(w.news.channel, { permissionsFor: () => ({ has: () => false }) });
    await w.loop.poll();
    expect(String((console.warn as jest.Mock).mock.calls[0][0])).toContain("the ping will be silent");
    expect(w.news.channel.send).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a channel of another server", { guildId: "100000000000000002" }],
    ["a voice channel", { type: ChannelType.GuildVoice }],
    ["a DM", { type: ChannelType.DM, guildId: undefined }],
  ])("never posts to %s", async (_label, over) => {
    const w = world();
    const other = fakeChannel(NEWS_CH, over);
    w.channels.set(NEWS_CH, other.channel);
    await w.loop.poll();
    expect(other.channel.send).not.toHaveBeenCalled();
    expect(fnCalls(w, "shift_quest_call_claim")).toEqual([]);
  });

  it("on a stale claim, adopts its own call of the day by the issue line and pings nobody again", async () => {
    const w = world();
    const d = data();
    // Someone else's copy, and the bot's own call of another day: neither counts.
    w.news.sent.push(w.news.make(sent(d, "invite") as never, "300000000000000999"));
    w.news.sent.push(w.news.make(sent(data({ day: "2026-11-17" }), "invite") as never));
    const earlier = w.news.make(sent(d, "invite") as never);
    w.news.sent.push(earlier);
    w.db.claim = "stale";
    await w.loop.poll();
    expect(w.news.channel.send).not.toHaveBeenCalled();
    expect(fnCalls(w, "shift_quest_call_mark")).toEqual([["shift_quest_call_mark", DAY, NEWS_CH, earlier.id]]);
  });

  it("on a stale claim it cannot check (no Read Message History), sends nothing: never a second ping", async () => {
    const w = world();
    w.news.state.readFails = true;
    w.db.claim = "stale";
    await w.loop.poll();
    expect(w.news.channel.send).not.toHaveBeenCalled();
    expect(fnCalls(w, "shift_quest_call_mark")).toEqual([]);
    expect(String((console.warn as jest.Mock).mock.calls[0][0])).toContain("nobody is pinged twice");
  });

  it("on a stale claim with no call of its own in the channel, sends once", async () => {
    const w = world();
    w.db.claim = "stale";
    await w.loop.poll();
    expect(w.news.channel.send).toHaveBeenCalledTimes(1);
    expect(w.db.stored).toBe(w.news.sent[0].id);
  });

  it("deletes its own call when another process recorded tonight's first", async () => {
    const w = world();
    w.db.beforeMark = () => {
      w.db.stored = "900000000000000777";
    };
    await w.loop.poll();
    expect(w.news.sent[0].delete).toHaveBeenCalledTimes(1);
  });

  it("retries a failed mark before anything else; a refused mark takes the call back", async () => {
    const w = world();
    w.db.markError = new QuestDbError("shift_quest_call_mark", "08006");
    await w.loop.poll();
    expect(w.news.channel.send).toHaveBeenCalledTimes(1);
    w.clock.now = at(5);
    await w.loop.poll();
    expect(w.news.channel.send).toHaveBeenCalledTimes(1);
    w.db.markError = null;
    await w.loop.poll();
    expect(w.db.stored).toBe(w.news.sent[0].id);
    expect(w.news.sent[0].delete).not.toHaveBeenCalled();

    const r = world();
    r.db.markError = new QuestError("bad_input");
    await r.loop.poll();
    expect(r.news.sent[0].delete).toHaveBeenCalledTimes(1);
  });

  it("does nothing while the gateway is disconnected, or after stop; stop waits for a running check", async () => {
    const w = world();
    w.state.connected = false;
    await w.loop.poll();
    expect(w.db.calls).toEqual([]);
    w.state.connected = true;
    const running = w.loop.poll();
    const stopping = w.loop.stop();
    await running;
    await stopping;
    const calls = w.db.calls.length;
    await w.loop.poll();
    expect(w.db.calls).toHaveLength(calls);
  });

  it("below schema 21 reads only the version, each check, and starts once the migration is applied", async () => {
    const w = world({ schema: 20 });
    w.db.version = 20;
    await w.loop.poll();
    await w.loop.poll();
    expect(w.db.calls).toEqual([["shift_quest_schema_version"], ["shift_quest_schema_version"]]);
    w.db.version = 21;
    await w.loop.poll();
    expect(w.news.channel.send).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("[shift-quests] campfire call on (schema 21)");
  });
});

describe("callNonce", () => {
  it("is one per day, within Discord's 25 characters, and never the same two days", () => {
    expect(callNonce(DAY)).toBe(callNonce(DAY));
    expect(callNonce(DAY)).not.toBe(callNonce("2026-11-19"));
    expect(callNonce(DAY).length).toBeLessThanOrEqual(25);
    expect(callNonce(DAY)).not.toMatch(/[^A-Za-z0-9]/);
  });
});

describe("startCall: the call through the evening", () => {
  it("edits as the fire goes, at most once a minute, never pinging", async () => {
    const w = world();
    await w.loop.poll();
    const m = w.news.sent[0];
    // Same text: no edit.
    w.clock.now = at(0.5);
    await w.loop.poll();
    expect(m.edit).not.toHaveBeenCalled();
    // Someone sits down 30 seconds after the send: the people line waits for the minute.
    w.room.sitters = 1;
    await w.loop.poll();
    expect(m.edit).not.toHaveBeenCalled();
    w.clock.now = at(1);
    await w.loop.poll();
    expect(m.edit).toHaveBeenCalledTimes(1);
    expect(bodyText(m.edits[0])).toContain(CALL.people(1));
    // 19:00: lit.
    w.clock.now = at(10);
    await w.loop.poll();
    expect(bodyText(m.edits.at(-1))).toContain(CALL.lit);
    // 19:25: the guest.
    w.clock.now = at(35);
    await w.loop.poll();
    expect(bodyText(m.edits.at(-1))).toContain(GUESTS.boat.arrive);
    // 21:00: embers.
    w.clock.now = at(130);
    await w.loop.poll();
    expect(bodyText(m.edits.at(-1))).toContain(CALL.embers);
    const edits = m.edit.mock.calls.length;
    w.clock.now = at(200);
    await w.loop.poll();
    expect(m.edit.mock.calls.length).toBe(edits);
    for (const e of m.edits) expect(e.allowedMentions).toEqual({ parse: [] });
    expect(w.news.channel.send).toHaveBeenCalledTimes(1);
  });

  it("switched off: tonight's call is edited once into a paused note (no people line, no ping), and back on edits it back", async () => {
    const w = world();
    w.room.sitters = 4;
    await w.loop.poll();
    const m = w.news.sent[0];
    w.clock.now = at(20);
    w.db.off = true;
    await w.loop.poll();
    expect(m.edit).toHaveBeenCalledTimes(1);
    const paused = bodyText(m.edits[0]);
    expect(paused).toContain(CALL.offTitle);
    expect(paused).not.toContain(CALL.people(4));
    expect(paused).not.toContain("<@&");
    expect(m.edits[0].allowedMentions).toEqual({ parse: [] });
    // The rounds lose the guest while it is off.
    expect(w.loop.evening(w.clock.now)).toBeNull();
    for (const minutes of [21, 40, 200]) {
      w.clock.now = at(minutes);
      await w.loop.poll();
    }
    expect(m.edit).toHaveBeenCalledTimes(1);
    w.db.off = false;
    w.clock.now = at(210);
    await w.loop.poll();
    expect(m.edit).toHaveBeenCalledTimes(2);
    expect(bodyText(m.edits[1])).toContain(CALL.embers);
    expect(w.news.channel.send).toHaveBeenCalledTimes(1);
  });

  it("switched off before tonight: yesterday's call stops promising tomorrow, after a restart too", async () => {
    const w = world();
    await w.loop.poll();
    w.clock.now = at(130);
    await w.loop.poll();
    const m = w.news.sent[0];
    expect(bodyText(m.edits.at(-1))).toContain(CALL.embers);
    await w.loop.stop();
    w.db.off = true;
    const fresh = w.start();
    w.clock.now = at(20 * 60);
    await fresh.poll();
    expect(bodyText(m.edits.at(-1))).toContain(CALL.off);
    expect(bodyText(m.edits.at(-1))).not.toContain(CALL.embers);
  });

  it("stops editing a call staff deleted, and never posts it again", async () => {
    const w = world();
    await w.loop.poll();
    w.news.sent[0].deleted = true;
    w.clock.now = at(10);
    await w.loop.poll();
    w.clock.now = at(35);
    await w.loop.poll();
    expect(w.news.sent[0].edit).toHaveBeenCalledTimes(1);
    expect(w.news.channel.send).toHaveBeenCalledTimes(1);
  });

  it("after a restart reads the call once and edits only on a difference", async () => {
    const w = world();
    await w.loop.poll();
    await w.loop.stop();
    const fresh = w.start();
    w.clock.now = at(0.5);
    await fresh.poll();
    await fresh.poll();
    expect(w.news.sent[0].edit).not.toHaveBeenCalled();
    expect(w.news.channel.messages.fetch).toHaveBeenCalledTimes(1);
    expect(w.news.channel.send).toHaveBeenCalledTimes(1);

    const again = world();
    await again.loop.poll();
    await again.loop.stop();
    const later = again.start();
    again.clock.now = at(12);
    await later.poll();
    expect(again.news.sent[0].edit).toHaveBeenCalledTimes(1);
    expect(bodyText(again.news.sent[0].edits[0])).toContain(CALL.lit);
  });

  it("deletes yesterday's call once tonight's is recorded, only when the bot wrote it", async () => {
    const w = world();
    const mine = w.news.make({ components: [] });
    const theirs = w.news.make({ components: [] }, "300000000000000999");
    w.news.sent.push(mine, theirs);
    w.db.previous = { channel_id: NEWS_CH, message_id: mine.id };
    w.clock.now = at(-1);
    await w.loop.poll();
    expect(mine.delete).not.toHaveBeenCalled();
    w.clock.now = at(0);
    await w.loop.poll();
    expect(mine.delete).toHaveBeenCalledTimes(1);
    w.clock.now = at(1);
    await w.loop.poll();
    expect(mine.delete).toHaveBeenCalledTimes(1);

    const o = world();
    const other = o.news.make({ components: [] }, "300000000000000999");
    o.news.sent.push(other);
    o.db.previous = { channel_id: NEWS_CH, message_id: other.id };
    await o.loop.poll();
    expect(other.delete).not.toHaveBeenCalled();

    // Already gone (Unknown Message): fine, and not retried.
    const g = world();
    g.db.previous = { channel_id: NEWS_CH, message_id: YESTERDAY_MSG };
    await g.loop.poll();
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe("startCall: the evening guest's drop", () => {
  it("at the guest's arrival hands the ids at the fire to the database once, and remembers how many teams got a look", async () => {
    const w = world();
    await w.loop.poll();
    w.room.present = ["600000000000000001", "600000000000000002"];
    w.clock.now = at(34.9);
    await w.loop.poll();
    expect(fnCalls(w, "shift_quest_campfire_drop")).toEqual([]);
    expect(w.loop.evening(w.clock.now)).toEqual({
      day: DAY,
      guest: "boat",
      litAt: LIT_AT,
      guestFrom: GUEST_FROM,
      guestUntil: GUEST_UNTIL,
      drop: null,
    });
    w.clock.now = at(35);
    await w.loop.poll();
    expect(fnCalls(w, "shift_quest_campfire_drop")).toEqual([["shift_quest_campfire_drop", DAY, ["600000000000000001", "600000000000000002"]]]);
    expect(w.loop.evening(w.clock.now)?.drop).toEqual({ teams: 2 });
    expect(console.log).toHaveBeenCalledWith(`[shift-quests] campfire guest's drop for ${DAY} made (2 team(s) got a look)`);
    // Never the ids in a log line.
    for (const [line] of (console.log as jest.Mock).mock.calls) expect(String(line)).not.toContain("6000000000000000");
    w.clock.now = at(36);
    await w.loop.poll();
    expect(fnCalls(w, "shift_quest_campfire_drop")).toHaveLength(1);
    expect(bodyText(w.news.sent[0].edits.at(-1))).toContain(CALL.dropped(GUESTS.boat, 2));
  });

  it("an empty fire at the guest's arrival is still the moment: the drop is made then, so nobody is rewarded for coming first", async () => {
    const w = world();
    w.clock.now = at(35);
    await w.loop.poll();
    expect(fnCalls(w, "shift_quest_campfire_drop")).toEqual([["shift_quest_campfire_drop", DAY, []]]);
    w.room.present = ["600000000000000001"];
    w.clock.now = at(36);
    await w.loop.poll();
    expect(fnCalls(w, "shift_quest_campfire_drop")).toHaveLength(1);
  });

  it("waits only while the room is unknown or closed, and stops at the end of the first rest", async () => {
    const w = world();
    w.room.open = false;
    w.clock.now = at(35);
    await w.loop.poll();
    w.room.open = true;
    w.room.present = ["600000000000000001"];
    w.clock.now = at(40);
    await w.loop.poll();
    expect(fnCalls(w, "shift_quest_campfire_drop")).toEqual([]);
    w.clock.now = at(39.9);
    await w.loop.poll();
    expect(fnCalls(w, "shift_quest_campfire_drop")).toHaveLength(1);
  });

  it("keeps a withheld count as withheld, and logs no number for it", async () => {
    const w = world();
    w.db.dropTeams = null;
    w.room.present = ["600000000000000001"];
    w.clock.now = at(35);
    await w.loop.poll();
    expect(w.loop.evening(w.clock.now)?.drop).toEqual({ teams: null });
    expect(console.log).toHaveBeenCalledWith(`[shift-quests] campfire guest's drop for ${DAY} made (count withheld)`);
  });

  it("makes no drop on a night without a guest, or once the database has it", async () => {
    const w = world();
    w.room.present = ["600000000000000001"];
    w.db.drop = { teams: 1 };
    w.clock.now = at(35);
    await w.loop.poll();
    expect(fnCalls(w, "shift_quest_campfire_drop")).toEqual([]);
    expect(w.loop.evening(w.clock.now)?.drop).toEqual({ teams: 1 });

    const n = world();
    n.room.present = ["600000000000000001"];
    n.db.guest = null;
    n.clock.now = at(35);
    await n.loop.poll();
    expect(fnCalls(n, "shift_quest_campfire_drop")).toEqual([]);
    expect(n.loop.evening(n.clock.now)?.guest).toBeNull();
  });

  it("has no evening on another Bangkok day", async () => {
    const w = world();
    await w.loop.poll();
    expect(w.loop.evening(at(-19 * 60))).toBeNull();
    expect(w.loop.evening(at(6 * 60))).toBeNull();
    expect(w.loop.evening(at(0))?.day).toBe(DAY);
  });
});
