/**
 * @jest-environment node
 */
import { InteractionContextType, Routes, type Client } from "discord.js";

import { ELEMENT_ID } from "../../../../lib/shift-island/canvas-link";
import { ElementalError, type ElementalApi } from "../api";
import type { RepliableInteraction } from "../context";
import { COMMON } from "../copy/common";
import { CANVAS, CANVAS_ERRORS, canvasErrorText } from "../copy/canvas";
import {
  CANVAS_LINK_FN,
  FRAME_ID,
  canvasUrl,
  feature,
  parseCanvasUrl,
  syncCanvasPin,
  type CanvasLinkResult,
} from "../features/canvas";
import { createRuntime, handleElementalInteraction } from "../index";
import { registry } from "../registry";

// Fixture ids only: no real guild, user, role, channel or board.
const GUILD = "100000000000000001";
const REHEARSAL = "100000000000000002";
const USER = "200000000000000001";
const BOT = "200000000000000099";
const OTHER_USER = "200000000000000002";
const ROLE = {
  host: "300000000000000001",
  helper: "300000000000000002",
  mentor: "300000000000000003",
  judge: "300000000000000004",
  safety: "300000000000000005",
  paid: "300000000000000006",
};
const CHANNEL = {
  start_here: "400000000000000001",
  news: "400000000000000002",
  mirror: "400000000000000003",
  reports: "400000000000000004",
  campfire: "400000000000000005",
};
const TEAM_CHANNEL = "400000000000000077";
const TEAM_ID = "11111111-2222-4333-8444-555555555555";
const BOARD = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const OLD_BOARD = "aaaaaaaa-bbbb-4ccc-8ddd-000000000000";
const FRAME = "Frame_team-07";
const OLD_FRAME = "oldFrame01";
const GOOD_URL = `https://passionseed.org/whiteboard/${BOARD}?focus=${FRAME}`;
const NEW_MESSAGE = "700000000000000001";
const OLD_PIN = "700000000000000002";
const WELCOME_PIN = "700000000000000003";
const STUDENT_PIN = "700000000000000004";

const ENV = { guildIds: [GUILD, REHEARSAL], databaseUrl: "postgresql://stub:stub@127.0.0.1:5432/postgres", cardUrl: null, cardSecret: null };

function rawSettings(): Record<string, unknown> {
  return { guild_id: GUILD, edition: "elemental-2026", edition_kind: "event", roles: ROLE, channels: CHANNEL };
}

function linked(over: Partial<CanvasLinkResult> = {}): CanvasLinkResult {
  return { team_id: TEAM_ID, slot: 7, board_id: BOARD, frame_id: FRAME, already: false, replaced: null, via: "member", ...over };
}

function fakeDb(link: (args: unknown[]) => unknown = () => linked()) {
  const calls: { fn: string; args: unknown[] }[] = [];
  const api: ElementalApi = {
    call: jest.fn(async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });
      if (fn === "elemental_bot_settings_get") return rawSettings() as never;
      if (fn === CANVAS_LINK_FN) return link(args) as never;
      throw new Error(`unexpected ${fn}`);
    }) as ElementalApi["call"],
    rows: jest.fn(async () => []) as ElementalApi["rows"],
  };
  return { api, calls };
}

interface PinnedFixture {
  id: string;
  authorId: string;
  content: string;
}

/** A Discord REST double: pins live in a list the test can read back. */
function fakeDiscord(initialPins: PinnedFixture[] = [], over: { put?: jest.Mock; get?: jest.Mock; post?: jest.Mock } = {}) {
  const pins = [...initialPins];
  const posted: { channel: string; body: { content: string; allowed_mentions: unknown } }[] = [];
  const get =
    over.get ??
    jest.fn(async (route: string) => {
      expect(route).toBe(Routes.channelMessagesPins(TEAM_CHANNEL));
      return { items: pins.map((p) => ({ pinned_at: "2026-12-04T12:00:00Z", message: { id: p.id, content: p.content, author: { id: p.authorId } } })), has_more: false };
    });
  const bodies = new Map<string, string>();
  let seq = 0;
  const post =
    over.post ??
    jest.fn(async (route: string, opts: { body: { content: string; allowed_mentions: unknown } }) => {
      posted.push({ channel: route, body: opts.body });
      // The first post is NEW_MESSAGE, then 700000000000001001, 700000000000002001, ...
      const id = seq === 0 ? NEW_MESSAGE : `7000000000000${String(seq).padStart(2, "0")}001`;
      seq += 1;
      bodies.set(id, opts.body.content);
      return { id };
    });
  const put =
    over.put ??
    jest.fn(async (route: string) => {
      const id = route.split("/").pop()!;
      pins.unshift({ id, authorId: BOT, content: bodies.get(id) ?? "" });
    });
  const del = jest.fn(async (route: string) => {
    const id = route.split("/").pop()!;
    const at = pins.findIndex((p) => p.id === id);
    if (at >= 0) pins.splice(at, 1);
  });
  const createDM = jest.fn();
  const send = jest.fn();
  const client = {
    user: { id: BOT },
    rest: { get, post, put, delete: del },
    users: { createDM, send, fetch: jest.fn(async () => ({ send, createDM })) },
  };
  return { client: client as unknown as Client, pins, posted, get, post, put, del, createDM, send };
}

function interaction(opts: { url?: string | null; channelId?: string; roles?: string[] } = {}) {
  const sent: unknown[] = [];
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: opts.channelId ?? TEAM_CHANNEL,
    user: { id: USER },
    member: { roles: opts.roles ?? [ROLE.paid] },
    commandName: "canvas",
    deferred: false,
    replied: false,
    inGuild: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => true,
    isMessageComponent: () => false,
    isButton: () => false,
    isModalSubmit: () => false,
    isFromMessage: () => false,
    options: {
      getSubcommand: () => "link",
      getString: (name: string) => (name === "url" ? (opts.url === undefined ? GOOD_URL : opts.url) : null),
    },
    deferReply: jest.fn(async (o: unknown) => {
      i.deferred = true;
      sent.push({ deferReply: o });
    }),
    reply: jest.fn(async (p: unknown) => {
      i.replied = true;
      sent.push(p);
    }),
    editReply: jest.fn(async (p: unknown) => {
      i.replied = true;
      sent.push(p);
    }),
    followUp: jest.fn(async (p: unknown) => {
      sent.push(p);
    }),
    deleteReply: jest.fn(async () => undefined),
  };
  return { i: i as unknown as RepliableInteraction & Record<string, jest.Mock>, sent };
}

function setup(link?: (args: unknown[]) => unknown, pins: PinnedFixture[] = [], over: Parameters<typeof fakeDiscord>[1] = {}) {
  const db = fakeDb(link);
  const discord = fakeDiscord(pins, over);
  const rt = createRuntime({ client: discord.client, api: db.api, env: ENV });
  return { rt, ...db, ...discord };
}

/** The ephemeral answer the person saw last. */
function lastText(sent: unknown[]): string {
  const last = sent[sent.length - 1] as { content?: string } | string;
  return typeof last === "string" ? last : (last?.content ?? "");
}

const linkCalls = (calls: { fn: string; args: unknown[] }[]) => calls.filter((c) => c.fn === CANVAS_LINK_FN);

let warnSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;
beforeEach(() => {
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

// ---------------------------------------------------------------------------

describe("/canvas link registration", () => {
  test("a guild-only top-level /canvas with a link subcommand and a required url", () => {
    const cmd = registry().commands.find((c) => c.name === "canvas");
    expect(cmd).toBeDefined();
    expect(cmd!.contexts).toEqual([InteractionContextType.Guild]);
    expect(cmd!.default_member_permissions).toBeUndefined();
    const sub = (cmd!.options ?? [])[0] as { name: string; description: string; options: { name: string; required: boolean }[] };
    expect(sub.name).toBe("link");
    expect(sub.options).toEqual([expect.objectContaining({ name: "url", required: true })]);
    for (const text of [cmd!.description, sub.description, ...sub.options.map((o) => (o as unknown as { description: string }).description)]) {
      expect(text.length).toBeLessThanOrEqual(100);
    }
    expect(registry().commandHandlers.get("canvas link")).toBeDefined();
    expect(feature.staffSubcommands ?? []).toEqual([]);
  });

  test("FRAME_ID is the whiteboard page's ?focus= rule", () => {
    expect(FRAME_ID.source).toBe(ELEMENT_ID.source);
    expect(FRAME_ID.flags).toBe(ELEMENT_ID.flags);
  });
});

describe("parseCanvasUrl", () => {
  test.each([
    ["the canonical link", GOOD_URL],
    ["www and a trailing slash", `https://www.passionseed.org/whiteboard/${BOARD}/?focus=${FRAME}`],
    ["no scheme", `passionseed.org/whiteboard/${BOARD}?focus=${FRAME}`],
    ["Discord's <...> wrapper", `<${GOOD_URL}>`],
    ["other query keys and a hash", `https://passionseed.org/whiteboard/${BOARD}?template=x&focus=${FRAME}#top`],
    ["Excalidraw's copy-link ?element=", `https://passionseed.org/whiteboard/${BOARD}?element=${FRAME}`],
    ["an empty ?focus= beside ?element=", `https://passionseed.org/whiteboard/${BOARD}?focus=&element=${FRAME}`],
    ["an uppercase board id", `https://passionseed.org/whiteboard/${BOARD.toUpperCase()}?focus=${FRAME}`],
    ["words around it", `here is ours ${GOOD_URL} thanks`],
    ["http", `http://passionseed.org/whiteboard/${BOARD}?focus=${FRAME}`],
  ])("valid: %s", (_label, input) => {
    expect(parseCanvasUrl(input)).toEqual({ ok: true, boardId: BOARD, frameId: FRAME });
  });

  test.each([
    ["no query", `https://passionseed.org/whiteboard/${BOARD}`],
    ["empty focus", `https://passionseed.org/whiteboard/${BOARD}?focus=`],
    ["a group link", `https://passionseed.org/whiteboard/${BOARD}?group=abc`],
  ])("missing focus: %s", (_label, input) => {
    expect(parseCanvasUrl(input)).toEqual({ ok: false, problem: "missing_focus" });
  });

  test("a focus that is not an element id", () => {
    expect(parseCanvasUrl(`https://passionseed.org/whiteboard/${BOARD}?focus=a%20b`)).toEqual({ ok: false, problem: "bad_focus" });
    expect(parseCanvasUrl(`https://passionseed.org/whiteboard/${BOARD}?focus=${"x".repeat(101)}`)).toEqual({ ok: false, problem: "bad_focus" });
  });

  test.each([
    ["another site", `https://example.com/whiteboard/${BOARD}?focus=${FRAME}`],
    ["a look-alike suffix", `https://passionseed.org.example.com/whiteboard/${BOARD}?focus=${FRAME}`],
    ["a look-alike prefix", `https://notpassionseed.org/whiteboard/${BOARD}?focus=${FRAME}`],
    ["userinfo trick", `https://passionseed.org@example.com/whiteboard/${BOARD}?focus=${FRAME}`],
    ["credentials on our host", `https://user:pw@passionseed.org/whiteboard/${BOARD}?focus=${FRAME}`],
    ["a port", `https://passionseed.org:8443/whiteboard/${BOARD}?focus=${FRAME}`],
    ["a preview deployment", `https://web-git-branch.vercel.app/whiteboard/${BOARD}?focus=${FRAME}`],
  ])("foreign host: %s", (_label, input) => {
    expect(parseCanvasUrl(input)).toEqual({ ok: false, problem: "host" });
  });

  test.each([
    ["empty", ""],
    ["blank", "   "],
    ["not a string", undefined],
    ["plain words", "our canvas is the blue one"],
    ["a javascript: url", "javascript:alert(1)"],
    ["ftp", `ftp://passionseed.org/whiteboard/${BOARD}?focus=${FRAME}`],
    ["a broken url", "https://"],
    ["too long", `${GOOD_URL}&x=${"a".repeat(2_100)}`],
  ])("garbage: %s", (_label, input) => {
    expect(parseCanvasUrl(input)).toEqual({ ok: false, problem: "garbage" });
  });

  test.each([
    ["not a whiteboard path", `https://passionseed.org/map/${BOARD}?focus=${FRAME}`],
    ["a board id that is not a uuid", `https://passionseed.org/whiteboard/123?focus=${FRAME}`],
    ["the whiteboard list", "https://passionseed.org/whiteboard"],
    ["a deeper path", `https://passionseed.org/whiteboard/${BOARD}/extra?focus=${FRAME}`],
  ])("not a board link: %s", (_label, input) => {
    expect(parseCanvasUrl(input)).toEqual({ ok: false, problem: "not_board" });
  });

  test("the board's invite link gets its own answer", () => {
    expect(parseCanvasUrl("https://passionseed.org/whiteboard/join/abcdef123456")).toEqual({ ok: false, problem: "invite" });
  });

  test("canvasUrl rebuilds the canonical link", () => {
    expect(canvasUrl(BOARD.toUpperCase(), FRAME)).toBe(GOOD_URL);
  });
});

describe("/canvas link: refusals", () => {
  test.each([
    ["garbage", "not a link", CANVAS.url.garbage],
    ["foreign host", `https://example.com/whiteboard/${BOARD}?focus=${FRAME}`, CANVAS.url.host],
    ["missing focus", `https://passionseed.org/whiteboard/${BOARD}`, CANVAS.url.missing_focus],
    ["invite link", "https://passionseed.org/whiteboard/join/abcdef123456", CANVAS.url.invite],
  ])("a %s link is answered without a database call", async (_label, url, text) => {
    const { rt, calls, post } = setup();
    const { i, sent } = interaction({ url });
    await handleElementalInteraction(rt, i as never);
    expect(i.deferReply).toHaveBeenCalledTimes(1);
    expect(linkCalls(calls)).toHaveLength(0);
    expect(post).not.toHaveBeenCalled();
    expect(lastText(sent)).toBe(text);
    expect(lastText(sent)).not.toContain("example.com");
  });

  test("the shared channels (#start-here etc.) are refused before the database", async () => {
    for (const channelId of Object.values(CHANNEL)) {
      const { rt, calls } = setup();
      const { i, sent } = interaction({ channelId });
      await handleElementalInteraction(rt, i as never);
      expect(linkCalls(calls)).toHaveLength(0);
      expect(lastText(sent)).toBe(CANVAS.notTeamChannel);
    }
  });

  test("any other non-team channel is refused by SQL (el:not_team_channel)", async () => {
    const { rt, calls, post } = setup(() => {
      throw new ElementalError("not_team_channel");
    });
    const { i, sent } = interaction({ channelId: "400000000000000099" });
    await handleElementalInteraction(rt, i as never);
    expect(linkCalls(calls)).toHaveLength(1);
    expect(lastText(sent)).toBe(CANVAS.notTeamChannel);
    expect(post).not.toHaveBeenCalled();
  });

  test("someone without /join (or a Judge) is refused before the database", async () => {
    for (const roles of [[], [ROLE.judge]]) {
      const { rt, calls } = setup();
      const { i, sent } = interaction({ roles });
      await handleElementalInteraction(rt, i as never);
      expect(linkCalls(calls)).toHaveLength(0);
      expect(lastText(sent)).toBe(COMMON.paidOnly);
    }
  });

  test("a Helper may link for a team (in its channel)", async () => {
    const { rt, calls } = setup();
    const { i } = interaction({ roles: [ROLE.helper] });
    await handleElementalInteraction(rt, i as never);
    expect(linkCalls(calls)).toHaveLength(1);
  });

  const SQL_CODES: [string, string | undefined][] = [
    ["not_team_channel", undefined],
    ["board_not_found", undefined],
    ["wrong_element_board", "fire"],
    ["frame_not_found", undefined],
    ["not_project_frame", undefined],
    ["not_team_canvas", undefined],
    ["frame_linked", undefined],
    ["unknown_guild", undefined],
  ];

  test.each(SQL_CODES)("el:%s maps to its own line, nothing is pinned", async (code, detail) => {
    const { rt, post, put, del } = setup(() => {
      throw new ElementalError(code, detail, CANVAS_LINK_FN);
    });
    const { i, sent } = interaction();
    await handleElementalInteraction(rt, i as never);
    expect(lastText(sent)).toBe(canvasErrorText(code, detail));
    expect(post).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  test("every refusal line is distinct, and the special ones say what to do", () => {
    const lines = SQL_CODES.filter(([code]) => code !== "unknown_guild").map(([code, detail]) => canvasErrorText(code, detail));
    expect(new Set(lines).size).toBe(lines.length);
    expect(canvasErrorText("wrong_element_board", "fire")).toContain("ไฟ");
    expect(canvasErrorText("not_team_canvas")).toContain("Discord");
    expect(canvasErrorText("not_team_canvas")).toContain("ทีม");
    expect(canvasErrorText("unknown_guild")).toBe(COMMON.notSetUp);
    expect(canvasErrorText("no_such_code")).toBeNull();
    expect(Object.keys(CANVAS_ERRORS)).toEqual(expect.arrayContaining(["frame_linked", "team_not_found"]));
  });

  test("busy and unexpected database errors fall back to the shared lines", async () => {
    const busy = setup(() => {
      throw new ElementalError("busy");
    });
    const a = interaction();
    await handleElementalInteraction(busy.rt, a.i as never);
    expect(lastText(a.sent)).toBe(COMMON.busy);

    const weird = setup(() => {
      throw new ElementalError("bad_user");
    });
    const b = interaction();
    await handleElementalInteraction(weird.rt, b.i as never);
    expect(lastText(b.sent)).toBe(COMMON.failed);
  });
});

describe("/canvas link: success and the pin", () => {
  test("links with the parsed ids, pins the canonical link and says notes appear on reload", async () => {
    const { rt, calls, posted, put, pins } = setup();
    const { i, sent } = interaction({ url: `<passionseed.org/whiteboard/${BOARD.toUpperCase()}?element=${FRAME}>` });
    await handleElementalInteraction(rt, i as never);

    expect(linkCalls(calls)[0].args).toEqual([GUILD, TEAM_CHANNEL, BOARD, FRAME, USER]);
    // Deferred before the database call.
    expect((i.deferReply as unknown as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan((rt.api.call as jest.Mock).mock.invocationCallOrder[0]);

    expect(posted).toHaveLength(1);
    expect(posted[0].channel).toBe(Routes.channelMessages(TEAM_CHANNEL));
    expect(posted[0].body.content).toContain(`<${GOOD_URL}>`);
    expect(posted[0].body.content).toContain("07");
    expect(posted[0].body.allowed_mentions).toEqual({ parse: [] });
    expect(put).toHaveBeenCalledWith(Routes.channelMessagesPin(TEAM_CHANNEL, NEW_MESSAGE));
    expect(pins.map((p) => p.id)).toEqual([NEW_MESSAGE]);

    const text = lastText(sent);
    expect(text).toContain(CANVAS.linked(7));
    expect(text).toContain(GOOD_URL);
    expect(text).toContain(CANVAS.pinned);
    expect(text).toContain(CANVAS.reload);
  });

  test("relinking replaces the old pin and leaves every other pin alone", async () => {
    const before: PinnedFixture[] = [
      { id: OLD_PIN, authorId: BOT, content: `old\n<https://passionseed.org/whiteboard/${OLD_BOARD}?focus=${OLD_FRAME}>` },
      { id: WELCOME_PIN, authorId: BOT, content: "welcome to plot 07: run /canvas link" },
      { id: STUDENT_PIN, authorId: OTHER_USER, content: `https://passionseed.org/whiteboard/${OLD_BOARD}?focus=${OLD_FRAME}` },
    ];
    const { rt, pins, del, put } = setup(() => linked({ replaced: { board_id: OLD_BOARD, frame_id: OLD_FRAME } }), before);
    const { i, sent } = interaction();
    await handleElementalInteraction(rt, i as never);

    expect(put).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith(Routes.channelMessagesPin(TEAM_CHANNEL, OLD_PIN));
    // New pin pinned before the old one came down.
    expect(put.mock.invocationCallOrder[0]).toBeLessThan(del.mock.invocationCallOrder[0]);
    expect(pins.map((p) => p.id).sort()).toEqual([NEW_MESSAGE, STUDENT_PIN, WELCOME_PIN].sort());
    expect(lastText(sent)).toContain(CANVAS.replaced);
  });

  test("already linked to this canvas with its pin up: nothing is posted or unpinned", async () => {
    const before: PinnedFixture[] = [{ id: OLD_PIN, authorId: BOT, content: `team canvas\n<${GOOD_URL}>` }];
    const { rt, post, put, del } = setup(() => linked({ already: true }), before);
    const { i, sent } = interaction();
    await handleElementalInteraction(rt, i as never);
    expect(post).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(lastText(sent)).toContain(CANVAS.alreadyLinked);
    expect(lastText(sent)).toContain(CANVAS.pinKept);
  });

  test("already linked but the pin is gone: it is pinned again", async () => {
    const { rt, put } = setup(() => linked({ already: true }));
    const { i, sent } = interaction();
    await handleElementalInteraction(rt, i as never);
    expect(put).toHaveBeenCalledTimes(1);
    expect(lastText(sent)).toContain(CANVAS.alreadyLinked);
    expect(lastText(sent)).toContain(CANVAS.pinned);
  });

  test("Discord refusing the pin keeps the link, keeps the old pin and says so", async () => {
    const before: PinnedFixture[] = [{ id: OLD_PIN, authorId: BOT, content: `<https://passionseed.org/whiteboard/${OLD_BOARD}?focus=${OLD_FRAME}>` }];
    const put = jest.fn(async () => {
      throw Object.assign(new Error("Missing Permissions"), { status: 403 });
    });
    const { rt, del } = setup(() => linked({ replaced: { board_id: OLD_BOARD, frame_id: OLD_FRAME } }), before, { put });
    const { i, sent } = interaction();
    await handleElementalInteraction(rt, i as never);
    expect(put).toHaveBeenCalledTimes(1); // a 403 is not retried
    expect(del).not.toHaveBeenCalled();
    expect(lastText(sent)).toContain(CANVAS.linked(7));
    expect(lastText(sent)).toContain(CANVAS.pinPostedOnly);
  });

  test("a channel the bot cannot post in: linked, with the pin-failed line", async () => {
    const post = jest.fn(async () => {
      throw Object.assign(new Error("Missing Access"), { status: 403 });
    });
    const { rt } = setup(undefined, [], { post });
    const { i, sent } = interaction();
    await handleElementalInteraction(rt, i as never);
    expect(lastText(sent)).toContain(CANVAS.linked(7));
    expect(lastText(sent)).toContain(CANVAS.pinFailed);
  });

  test("'canvas.linked' is emitted for a new link, not for the same canvas again", async () => {
    const seen: unknown[] = [];
    const first = setup(() => linked({ replaced: { board_id: OLD_BOARD, frame_id: OLD_FRAME } }));
    first.rt.events.on("canvas.linked", (p) => void seen.push(p));
    await handleElementalInteraction(first.rt, interaction().i as never);
    expect(seen).toEqual([
      {
        guildId: GUILD,
        edition: "elemental-2026",
        teamId: TEAM_ID,
        slot: 7,
        boardId: BOARD,
        frameId: FRAME,
        replaced: { boardId: OLD_BOARD, frameId: OLD_FRAME },
        via: "member",
      },
    ]);

    const again = setup(() => linked({ already: true }));
    const none: unknown[] = [];
    again.rt.events.on("canvas.linked", (p) => void none.push(p));
    await handleElementalInteraction(again.rt, interaction().i as never);
    expect(none).toEqual([]);
  });

  test("'canvas.linked' is still emitted when the reply cannot be sent (the link is committed)", async () => {
    const seen: unknown[] = [];
    const { rt } = setup();
    rt.events.on("canvas.linked", (p) => void seen.push(p));
    const { i } = interaction();
    (i.editReply as unknown as jest.Mock).mockImplementationOnce(async () => {
      throw Object.assign(new Error("Unknown interaction"), { status: 404 });
    });
    await handleElementalInteraction(rt, i as never);
    expect(seen).toHaveLength(1);
  });

  test("two links in a row in one channel end with exactly one canvas pin, the last one", async () => {
    const { rt, pins } = setup();
    const a = canvasUrl(BOARD, "frameA");
    const b = canvasUrl(BOARD, "frameB");
    await Promise.all([
      syncCanvasPin(rt, TEAM_CHANNEL, { url: a, slot: 7, linkedBy: USER }),
      syncCanvasPin(rt, TEAM_CHANNEL, { url: b, slot: 7, linkedBy: USER }),
    ]);
    expect(pins).toHaveLength(1);
    expect(pins[0].content).toContain(b);
  });

  test("never a DM", async () => {
    const { rt, createDM, send } = setup();
    await handleElementalInteraction(rt, interaction().i as never);
    expect(createDM).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
