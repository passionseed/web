/**
 * @jest-environment node
 */
import { InteractionContextType, MessageFlags, type Client } from "discord.js";

import { isValidIndex, noteIds } from "../../../../lib/elemental/canvas";
import { ElementalError, type ElementalApi } from "../api";
import type { RepliableInteraction } from "../context";
import { COMMON } from "../copy/common";
import { HANDIN, bangkokStamp, shipNoteText } from "../copy/handin";
import { ACTIONS, HANDIN_HOSTS, feature, handinDrafts, onCanvasLinked, parseHandinUrl, submittedAt } from "../features/handin";
import { createRuntime, handleElementalInteraction } from "../index";
import { createKeyedQueue } from "../queue";
import { registry } from "../registry";

// ---------------------------------------------------------------------------
// Fixtures: made-up snowflakes and ids only, no names, no real guild.
// ---------------------------------------------------------------------------

const GUILD = "100000000000000001";
const USER = "200000000000000001";
const OUTSIDER = "200000000000000099";
const PAID = "300000000000000006";
const MIRROR = "400000000000000003";
const FIRE_CAT = "500000000000000040";
const OTHER_CAT = "500000000000000099";
const FIRE_CHANNEL = "400000000000000071";
const GENERAL = "400000000000000009";
const BOARD = "00000000-0000-4000-8000-0000000000f1";
const OWNER = "00000000-0000-4000-8000-0000000000a0";
const TEAM = "00000000-0000-4000-8000-00000000f001";
const OTHER_TEAM = "00000000-0000-4000-8000-00000000f002";

const ENV = { guildIds: [GUILD], databaseUrl: "postgresql://stub:stub@127.0.0.1:5432/postgres", cardUrl: null, cardSecret: null };

/** Mon 7 Dec 2026 23:00 Bangkok, as the real edition's handin_due_at. */
const DUE = "2026-12-07T16:00:00.000Z";
const AT_2259_59 = Date.UTC(2026, 11, 7, 15, 59, 59);
const AT_2300_01 = Date.UTC(2026, 11, 7, 16, 0, 1);

const VIDEO = "https://youtu.be/abcDEF12345";
const VIDEO_2 = "https://www.youtube.com/watch?v=xyz98765432";

const ZONE = { x: 40, y: 900, width: 1300, height: 420 };
const FRAME = { x: 0, y: 0, width: 1800, height: 1400 };

interface FakeOptions {
  linked?: boolean;
  handin?: (args: unknown[]) => unknown;
  write?: (args: unknown[]) => unknown;
}

/** An in-memory stand-in for the elemental_bot_* functions /handin calls, with SQL's late rule. */
function fakeDb(opts: FakeOptions = {}) {
  const calls: { fn: string; args: unknown[] }[] = [];
  const log: string[] = [];
  const linked = opts.linked ?? true;
  const team = { id: TEAM, slot: 7, element: "fire", project_name: "Lantern Map", members: [USER], url: null as string | null, at: null as string | null };
  const board = new Map<string, Record<string, unknown>>([
    ["frame-a", { id: "frame-a", type: "frame", ...FRAME, index: "a0" }],
    ["zone-ship", { id: "zone-ship", type: "rectangle", ...ZONE, index: "a1", frameId: "frame-a", customData: { zone: "ship" } }],
  ]);

  const impl = async (fn: string, args: unknown[]): Promise<unknown> => {
    switch (fn) {
      case "elemental_bot_settings_get":
        return {
          guild_id: GUILD,
          edition: "elemental-2026",
          edition_kind: "event",
          roles: { paid: PAID },
          channels: { mirror: MIRROR },
          element_categories: { fire: [FIRE_CAT] },
        };
      case "elemental_bot_handin": {
        if (opts.handin) return opts.handin(args);
        if (args[1] !== FIRE_CHANNEL) throw new ElementalError("not_team_channel");
        if (!team.members.includes(String(args[4]))) throw new ElementalError("not_team_member");
        const at = String(args[3]);
        const resubmitted = team.url !== null;
        team.url = String(args[2]);
        team.at = at;
        return {
          team_id: TEAM,
          slot: team.slot,
          url: team.url,
          at,
          late: Date.parse(at) > Date.parse(DUE),
          due_at: DUE,
          resubmitted,
          note_id: TEAM,
          canvas_linked: linked,
        };
      }
      case "elemental_bot_canvas_target": {
        const id = String(args[1]);
        if (id !== TEAM || team.url === null) throw new ElementalError("entry_not_found");
        const ids = noteIds(id);
        const base = {
          entry_id: id,
          kind: "ship",
          source: "handin",
          team_id: TEAM,
          slot: team.slot,
          element: team.element,
          project_name: team.project_name,
          live: true,
          removed: false,
          canvas_status: null,
          fields: { url: team.url, at: team.at, late: Date.parse(String(team.at)) > Date.parse(DUE) },
          note_ids: ids,
          linked,
        };
        if (!linked) return base;
        const all = [...board.values()];
        const rect = board.get(ids.rect);
        const text = board.get(ids.text);
        const indices = all.map((el) => el.index as string).filter(isValidIndex).sort();
        return {
          ...base,
          board_id: BOARD,
          frame_id: "frame-a",
          owner_id: OWNER,
          frame: FRAME,
          zone: ZONE,
          after_index: indices.at(-1) ?? null,
          nearby: all
            .filter((el) => el.id !== "frame-a" && el.id !== ids.rect && el.id !== ids.text)
            .map((el) => ({ id: el.id, type: el.type, x: el.x, y: el.y, width: el.width, height: el.height, isDeleted: false, containerId: null, customData: el.customData ?? {} })),
          prev: rect && text ? [rect, text] : null,
          prev_deleted: rect ? rect.isDeleted === true : null,
          prev_on_frame: rect ? rect.frameId === "frame-a" : null,
        };
      }
      case "elemental_bot_canvas_write": {
        if (opts.write) return opts.write(args);
        const els = JSON.parse(String(args[2])) as Record<string, unknown>[];
        for (const el of els) board.set(String(el.id), el);
        return { ok: true, status: null, reason: null, ids: els.map((el) => el.id), dropped: [], present: true };
      }
      default:
        throw new Error(`unexpected ${fn}`);
    }
  };

  const api: ElementalApi = {
    call: jest.fn(async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });
      log.push(fn);
      return (await impl(fn, args)) as never;
    }) as ElementalApi["call"],
    rows: jest.fn(async (fn: string) => {
      throw new Error(`unexpected rows ${fn}`);
    }) as ElementalApi["rows"],
  };
  return { api, calls, log, board, team };
}

function fakeClient() {
  const get = jest.fn(async () => ({}));
  const post = jest.fn(async () => ({}));
  const patch = jest.fn(async () => ({}));
  const createDM = jest.fn();
  const client = { rest: { get, post, patch }, users: { createDM }, channels: { fetch: jest.fn() } };
  return { client: client as unknown as Client, get, post, patch, createDM };
}

type Kind = "command" | "button" | "modal";

interface FakeMocks {
  showModal: jest.Mock;
  deferReply: jest.Mock;
  reply: jest.Mock;
  editReply: jest.Mock;
  followUp: jest.Mock;
}

function interaction(kind: Kind, log: string[], over: Record<string, unknown> = {}) {
  const sent: Record<string, unknown>[] = [];
  const url = (over.url as string | undefined) ?? VIDEO;
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: FIRE_CHANNEL,
    channel: { parentId: FIRE_CAT },
    user: { id: USER },
    member: { roles: [PAID] },
    commandName: "handin",
    customId: "el|hdsave",
    createdTimestamp: AT_2259_59,
    deferred: false,
    replied: false,
    inGuild: () => i.guildId !== null,
    isAutocomplete: () => false,
    isChatInputCommand: () => kind === "command",
    isMessageComponent: () => kind === "button",
    isButton: () => kind === "button",
    isModalSubmit: () => kind === "modal",
    isFromMessage: () => false,
    options: { getSubcommand: () => null },
    fields: { getTextInputValue: (id: string) => (id === "url" ? url : "") },
    showModal: jest.fn(async (m: unknown) => {
      i.replied = true;
      log.push("showModal");
      sent.push({ modal: m });
    }),
    deferReply: jest.fn(async (o: unknown) => {
      i.deferred = true;
      log.push("deferReply");
      sent.push({ deferReply: o });
    }),
    deferUpdate: jest.fn(async () => {
      i.deferred = true;
    }),
    reply: jest.fn(async (p: Record<string, unknown>) => {
      i.replied = true;
      log.push("reply");
      sent.push(p);
    }),
    editReply: jest.fn(async (p: Record<string, unknown>) => {
      i.replied = true;
      log.push("editReply");
      sent.push(p);
    }),
    followUp: jest.fn(async (p: Record<string, unknown>) => {
      log.push("followUp");
      sent.push(p);
    }),
    deleteReply: jest.fn(async () => undefined),
    ...over,
  };
  delete i.url;
  return { i: i as unknown as RepliableInteraction & FakeMocks, sent };
}

function setup(dbOpts: FakeOptions = {}) {
  const db = fakeDb(dbOpts);
  const discord = fakeClient();
  const rt = createRuntime({ client: discord.client, api: db.api, env: ENV });
  rt.queues.canvas = createKeyedQueue("canvas", { sleep: async () => undefined, onRetry: () => undefined });
  const run = (kind: Kind, over: Record<string, unknown> = {}) => {
    const made = interaction(kind, db.log, over);
    return { ...made, done: handleElementalInteraction(rt, made.i as never) };
  };
  return { rt, ...db, ...discord, run };
}

function json(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (v && typeof v === "object" && typeof v.toJSON === "function" ? v.toJSON() : v));
}

const fns = (calls: { fn: string }[]) => calls.map((c) => c.fn);
const contents = (sent: Record<string, unknown>[]) => sent.map((p) => p.content).filter((c): c is string => typeof c === "string");
const last = (sent: Record<string, unknown>[]) => contents(sent).at(-1) ?? "";

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

// ---------------------------------------------------------------------------

describe("registration", () => {
  test("/handin is a guild-only command anyone can see; its actions do not clash with other features", () => {
    const reg = registry();
    const cmd = reg.commands.find((c) => c.name === "handin");
    expect(cmd).toBeDefined();
    expect(cmd!.contexts).toEqual([InteractionContextType.Guild]);
    expect(cmd!.default_member_permissions).toBeUndefined();
    expect(cmd!.description.length).toBeLessThanOrEqual(100);
    expect(reg.actions.get(ACTIONS.save)).toBe(feature.actions![ACTIONS.save]);
    expect(reg.actions.get(ACTIONS.fix)).toBe(feature.actions![ACTIONS.fix]);
    expect(feature.events?.["canvas.linked"]).toBeDefined();
  });

  test("the bot's host list is exactly SQL's (elemental_bot_handin)", () => {
    expect([...HANDIN_HOSTS].sort()).toEqual(
      ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "drive.google.com", "tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].sort()
    );
  });
});

describe("/handin form", () => {
  test("in a team channel the form opens at once with one link field", async () => {
    const { run, calls } = setup();
    const { i, done } = run("command");
    await done;
    expect(i.deferReply).not.toHaveBeenCalled();
    expect(i.showModal).toHaveBeenCalledTimes(1);
    const modal = json(i.showModal.mock.calls[0][0]);
    expect(modal).toContain('"custom_id":"el|hdsave"');
    expect(modal).toContain('"custom_id":"url"');
    expect(modal).toContain('"max_length":500');
    expect(fns(calls)).toEqual(["elemental_bot_settings_get"]);
  });

  test("outside the element categories, or in a shared channel, the form never opens", async () => {
    const { run, calls } = setup();
    for (const over of [
      { channelId: GENERAL, channel: { parentId: OTHER_CAT } },
      { channelId: MIRROR, channel: { parentId: FIRE_CAT } },
    ]) {
      const { i, done, sent } = run("command", over);
      await done;
      expect(i.showModal).not.toHaveBeenCalled();
      expect(sent).toContainEqual(expect.objectContaining({ content: HANDIN.notTeamChannel, flags: MessageFlags.Ephemeral }));
    }
    expect(fns(calls)).toEqual(["elemental_bot_settings_get"]);
  });

  test("someone without the Paid role is told to /join first", async () => {
    const { run } = setup();
    const { i, done, sent } = run("command", { member: { roles: [] } });
    await done;
    expect(i.showModal).not.toHaveBeenCalled();
    expect(contents(sent)).toContain(COMMON.paidOnly);
  });
});

describe("the link is checked before any call", () => {
  const refused: [string, string, keyof typeof HANDIN.url][] = [
    ["another site", "https://example.com/video/1", "host"],
    ["a look-alike host", "https://youtube.com.example.net/watch?v=1", "host"],
    ["Google Docs, not Drive", "https://docs.google.com/document/d/1", "host"],
    ["Instagram", "https://www.instagram.com/reel/abc", "host"],
    ["a trailing-dot host", "https://youtube.com./watch?v=1", "host"],
    ["another port", "https://youtube.com:8443/watch?v=1", "host"],
    ["a user name in the link", "https://someone@youtube.com/watch?v=1", "format"],
    ["plain http on another host", "http://example.com/v", "host"],
    ["ftp", "ftp://youtube.com/v", "format"],
    ["a script link", "javascript:alert(1)", "format"],
    ["plain words", "our video is on youtube", "format"],
    ["nothing", "   ", "empty"],
    ["too long", `https://youtu.be/${"a".repeat(490)}`, "too_long"],
  ];

  test.each(refused)("%s is refused in the bot, never echoed, and the form re-opens with it", async (_name, url, problem) => {
    const { run, calls, post } = setup();
    const { i, done, sent } = run("modal", { url });
    await done;
    expect(fns(calls)).toEqual(["elemental_bot_settings_get"]);
    expect(post).not.toHaveBeenCalled();
    expect(i.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    expect(last(sent)).toBe(HANDIN.url[problem]);
    if (url.trim()) expect(json(sent)).not.toContain(JSON.stringify(url).slice(1, -1));
    expect(json(sent)).toContain(`el|${ACTIONS.fix}`);
    // The fix button re-opens the form with what was typed.
    const fix = run("button", { customId: `el|${ACTIONS.fix}` });
    await fix.done;
    const modal = json(fix.i.showModal.mock.calls[0][0]);
    expect(modal).toContain('"custom_id":"el|hdsave"');
    if (url.trim() && url.length <= 500) expect(modal).toContain(JSON.stringify(url).slice(1, -1));
    expect(json(errorSpy.mock.calls)).not.toContain(url.trim() || "\u0000");
  });

  test.each([
    ["https://youtu.be/abcDEF12345", "https://youtu.be/abcDEF12345"],
    ["https://www.youtube.com/watch?v=abc&t=10", "https://www.youtube.com/watch?v=abc&t=10"],
    ["https://youtube.com/shorts/abc", "https://youtube.com/shorts/abc"],
    ["https://m.youtube.com/watch?v=abc", "https://m.youtube.com/watch?v=abc"],
    ["https://drive.google.com/file/d/abc/view?usp=sharing", "https://drive.google.com/file/d/abc/view?usp=sharing"],
    ["https://vm.tiktok.com/ZMabc/", "https://vm.tiktok.com/ZMabc/"],
    ["https://www.tiktok.com/@team/video/123", "https://www.tiktok.com/@team/video/123"],
    ["https://YouTu.be/abc", "https://YouTu.be/abc"],
    ["https://youtu.be:443/abc", "https://youtu.be:443/abc"],
    ["  <https://youtu.be/abc>  ", "https://youtu.be/abc"],
    ["http://youtu.be/abc", "https://youtu.be/abc"],
    ["HTTPS://youtu.be/abc", "https://youtu.be/abc"],
    ["youtu.be/abc", "https://youtu.be/abc"],
    ["our video: https://youtu.be/abc thanks", "https://youtu.be/abc"],
  ])("%j is read as %j", (input, url) => {
    expect(parseHandinUrl(input)).toEqual({ ok: true, url });
  });

  test("SQL's own bad_url refusal also keeps the link and offers the form", async () => {
    const { run } = setup({
      handin: () => {
        throw new ElementalError("bad_url", "host");
      },
    });
    const { done, sent } = run("modal");
    await done;
    expect(last(sent)).toBe(HANDIN.url.host);
    expect(json(sent)).toContain(`el|${ACTIONS.fix}`);
  });

  test("someone from another team is refused by SQL; nothing is written", async () => {
    const { run, calls } = setup();
    const { done, sent } = run("modal", { user: { id: OUTSIDER } });
    await done;
    expect(last(sent)).toBe(HANDIN.notTeamMember);
    expect(fns(calls)).not.toContain("elemental_bot_canvas_write");
  });
});

describe("on time or late (Mon 7 Dec 23:00 Bangkok)", () => {
  test("22:59:59 is on time: the submit's own time is what SQL judges", async () => {
    const { run, calls, board } = setup();
    const { done, sent } = run("modal", { createdTimestamp: AT_2259_59 });
    await done;
    const call = calls.find((c) => c.fn === "elemental_bot_handin")!;
    expect(call.args).toEqual([GUILD, FIRE_CHANNEL, VIDEO, "2026-12-07T15:59:59.000Z", USER]);
    expect(last(sent)).toBe([HANDIN.received("2026-12-07T15:59:59.000Z"), HANDIN.onTime, HANDIN.canvasWritten].join("\n"));
    expect(last(sent)).toContain("2026-12-07 22:59:59");
    const text = board.get(noteIds(TEAM).text)!;
    expect(text.originalText).toBe(shipNoteText({ url: VIDEO, at: "2026-12-07T15:59:59.000Z", late: false }));
    expect(String(text.originalText)).not.toContain(HANDIN.noteLate);
  });

  test("23:00:01 is accepted and flagged late, in the reply and on the note", async () => {
    const { run, calls, board } = setup();
    const { done, sent } = run("modal", { createdTimestamp: AT_2300_01 });
    await done;
    expect(calls.find((c) => c.fn === "elemental_bot_handin")!.args[3]).toBe("2026-12-07T16:00:01.000Z");
    expect(last(sent)).toBe([HANDIN.received("2026-12-07T16:00:01.000Z"), HANDIN.late(DUE), HANDIN.canvasWritten].join("\n"));
    expect(last(sent)).toContain("2026-12-07 23:00:00");
    const text = String(board.get(noteIds(TEAM).text)!.originalText);
    expect(text.split("\n").at(-1)).toBe(HANDIN.noteLate);
    expect(text).toContain("2026-12-07 23:00:01");
  });

  test("the time sent is the press, not when the bot got round to it", () => {
    expect(submittedAt({ createdTimestamp: AT_2259_59 }, AT_2300_01 + 60_000)).toBe("2026-12-07T15:59:59.000Z");
    expect(submittedAt({}, AT_2300_01)).toBe("2026-12-07T16:00:01.000Z");
    expect(bangkokStamp(AT_2259_59)).toBe("2026-12-07 22:59:59");
    expect(bangkokStamp(AT_2300_01)).toBe("2026-12-07 23:00:01");
  });
});

describe("the ship note", () => {
  test("lands in the frame's Ship zone as a 'ship' card from 'handin', after the reply", async () => {
    const { run, board, log } = setup();
    const { done } = run("modal");
    await done;
    const ids = noteIds(TEAM);
    const rect = board.get(ids.rect)!;
    expect(rect).toMatchObject({ type: "rectangle", frameId: "frame-a", version: 1, customData: { card: "ship", source: "handin" } });
    expect(Number(rect.x)).toBeGreaterThanOrEqual(ZONE.x);
    expect(Number(rect.y)).toBeGreaterThanOrEqual(ZONE.y);
    expect(Number(rect.x) + Number(rect.width)).toBeLessThanOrEqual(ZONE.x + ZONE.width);
    expect(isValidIndex(String(rect.index))).toBe(true);
    expect(String(rect.index) > "a1").toBe(true);
    // The person had their answer before the canvas was touched.
    expect(log.indexOf("editReply")).toBeLessThan(log.indexOf("elemental_bot_canvas_target"));
  });

  test("a resubmission keeps the element ids and rewrites the note one version up, no duplicate", async () => {
    const { run, board } = setup();
    const first = run("modal", { url: VIDEO });
    await first.done;
    const ids = noteIds(TEAM);
    const before = { rect: { ...board.get(ids.rect)! }, text: { ...board.get(ids.text)! } };
    const size = board.size;

    const again = run("modal", { url: VIDEO_2, createdTimestamp: AT_2259_59 + 60_000 });
    await again.done;
    expect(last(again.sent)).toContain(HANDIN.resubmitted);
    expect(board.size).toBe(size);
    const rect = board.get(ids.rect)!;
    const text = board.get(ids.text)!;
    expect(rect.id).toBe(before.rect.id);
    expect(text.id).toBe(before.text.id);
    expect(rect.version).toBe(Number(before.rect.version) + 1);
    expect(text.version).toBe(Number(before.text.version) + 1);
    expect(rect.index).toBe(before.rect.index);
    expect([rect.x, rect.y]).toEqual([before.rect.x, before.rect.y]);
    expect(String(text.originalText)).toContain(VIDEO_2);
    expect(String(text.originalText)).not.toContain(VIDEO);
  });

  test("no canvas yet: the link is kept and the reply says to link one; nothing is written", async () => {
    const { run, calls } = setup({ linked: false });
    const { done, sent } = run("modal");
    await done;
    expect(last(sent)).toBe([HANDIN.received("2026-12-07T15:59:59.000Z"), HANDIN.onTime, HANDIN.canvasNotLinked].join("\n"));
    expect(fns(calls)).not.toContain("elemental_bot_canvas_target");
    expect(fns(calls)).not.toContain("elemental_bot_canvas_write");
  });

  test("a write that cannot land edits the reply with the failed line; the hand-in stands", async () => {
    const { run } = setup({ write: () => ({ ok: false, status: null, reason: "bad_frame", ids: [], dropped: [], present: null }) });
    const { done, sent } = run("modal");
    await done;
    expect(contents(sent)).toContain([HANDIN.received("2026-12-07T15:59:59.000Z"), HANDIN.onTime, HANDIN.canvasPending].join("\n"));
    expect(last(sent)).toBe([HANDIN.received("2026-12-07T15:59:59.000Z"), HANDIN.onTime, HANDIN.canvasFailed].join("\n"));
  });

  test("after /canvas link, a team that handed in gets its note; a team that did not is left alone", async () => {
    const { rt, calls, board, team } = setup();
    expect(await onCanvasLinked(rt, GUILD, OTHER_TEAM)).toBeNull();
    expect(await onCanvasLinked(rt, GUILD, TEAM)).toBeNull();
    expect(fns(calls)).not.toContain("elemental_bot_canvas_write");
    expect(errorSpy).not.toHaveBeenCalled();

    team.url = VIDEO;
    team.at = "2026-12-07T15:00:00.000Z";
    await feature.events!["canvas.linked"]!(
      { guildId: GUILD, edition: "elemental-2026", teamId: TEAM, slot: 7, boardId: BOARD, frameId: "frame-a", replaced: null, via: "member" },
      rt
    );
    expect(board.get(noteIds(TEAM).rect)).toMatchObject({ customData: { card: "ship", source: "handin" } });
  });

  test("the link never reaches a log, a Discord post or a DM", async () => {
    const { run, post, createDM } = setup({ write: () => ({ ok: false, status: null, reason: "merge_error", ids: [], dropped: [], present: null }) });
    const { done } = run("modal");
    await done;
    expect(json(errorSpy.mock.calls)).not.toContain(VIDEO);
    expect(post).not.toHaveBeenCalled();
    expect(createDM).not.toHaveBeenCalled();
  });

  test("a successful hand-in clears the kept draft", async () => {
    const { run, rt } = setup();
    const bad = run("modal", { url: "https://example.com/v" });
    await bad.done;
    expect(handinDrafts(rt).size).toBe(1);
    const good = run("modal");
    await good.done;
    expect(handinDrafts(rt).size).toBe(0);
  });
});
