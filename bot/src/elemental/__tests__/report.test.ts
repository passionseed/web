/**
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";

import { InteractionContextType, MessageFlags, Routes, type Client } from "discord.js";

import { ElementalError, type ElementalApi } from "../api";
import type { RepliableInteraction } from "../context";
import { COMMON } from "../copy/common";
import { REPORT } from "../copy/report";
import { FIELD_TEXT, FIELD_WHERE, REPORT_POST_KIND, feature } from "../features/report";
import { createRuntime, handleElementalInteraction } from "../index";
import { registry } from "../registry";

// Fixture ids only: no real guild, user, role or channel.
const GUILD = "100000000000000001";
const REHEARSAL = "100000000000000002";
const USER = "200000000000000001";
const STAFF_USER = "200000000000000002";
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
const REPORT_ID = "11111111-2222-4333-8444-555555555555";
const MESSAGE_ID = "700000000000000001";
// General words only, as a student might write them.
const TEXT = "someone keeps posting mean comments in the voice chat";
const WHERE = "general voice";

const ENV = { guildIds: [GUILD, REHEARSAL], databaseUrl: "postgresql://stub:stub@127.0.0.1:5432/postgres", cardUrl: null, cardSecret: null };

function rawSettings(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { guild_id: GUILD, edition: "elemental-2026", edition_kind: "event", roles: ROLE, channels: CHANNEL, ...over };
}

interface FakeDbOptions {
  settings?: Record<string, unknown> | null;
  reportAdd?: (args: unknown[]) => unknown;
  handled?: (args: unknown[]) => unknown;
}

/** An in-memory stand-in for the elemental_bot_* functions this feature calls. */
function fakeDb(opts: FakeDbOptions = {}) {
  const calls: { fn: string; args: unknown[] }[] = [];
  const posts = new Map<string, string>();
  const reports = new Map<string, string>();
  const impl = (fn: string, args: unknown[]): unknown => {
    switch (fn) {
      case "elemental_bot_settings_get":
        return opts.settings === undefined ? rawSettings() : opts.settings;
      case "elemental_bot_report_add": {
        if (opts.reportAdd) return opts.reportAdd(args);
        const repeated = reports.has(String(args[2]));
        reports.set(String(args[2]), REPORT_ID);
        return { report_id: REPORT_ID, created_at: "2026-12-05T10:00:00Z", repeated };
      }
      case "elemental_bot_post_claim": {
        const key = `${args[1]}:${args[2]}`;
        const state = posts.get(key);
        if (state === undefined || state === "failed") {
          posts.set(key, "claimed");
          return true;
        }
        return false;
      }
      case "elemental_bot_post_mark":
        posts.set(`${args[1]}:${args[2]}`, String(args[3]));
        return true;
      case "elemental_bot_report_handled":
        return opts.handled ? opts.handled(args) : { report_id: args[1], handled_at: "2026-12-05T10:05:00Z", already: false };
      default:
        throw new Error(`unexpected ${fn}`);
    }
  };
  const api: ElementalApi = {
    call: jest.fn(async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });
      return impl(fn, args) as never;
    }) as ElementalApi["call"],
    rows: jest.fn(async () => []) as ElementalApi["rows"],
  };
  return { api, calls, posts };
}

/** A Discord client whose only door out is a mocked REST post. */
function fakeClient(post: jest.Mock = jest.fn(async () => ({ id: MESSAGE_ID }))) {
  const createDM = jest.fn();
  const send = jest.fn();
  const client = {
    rest: { post },
    users: { createDM, send, fetch: jest.fn(async () => ({ send, createDM })) },
    channels: { fetch: jest.fn(async () => ({ send })) },
  };
  return { client: client as unknown as Client, post, createDM, send, channelsFetch: client.channels.fetch };
}

type Kind = "command" | "button" | "modal";

function interaction(kind: Kind, over: Record<string, unknown> = {}) {
  const sent: unknown[] = [];
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: CHANNEL.start_here,
    user: { id: USER },
    member: { roles: [] as string[] },
    commandName: "report",
    customId: "el|report",
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
    fields: { getTextInputValue: (id: string) => ({ [FIELD_TEXT]: TEXT, [FIELD_WHERE]: WHERE })[id] ?? "" },
    showModal: jest.fn(async (m: unknown) => {
      i.replied = true;
      sent.push({ modal: m });
    }),
    deferReply: jest.fn(async (o: unknown) => {
      i.deferred = true;
      sent.push({ deferReply: o });
    }),
    deferUpdate: jest.fn(async () => {
      i.deferred = true;
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
      i.replied = true;
      sent.push(p);
    }),
    deleteReply: jest.fn(async () => undefined),
    ...over,
  };
  return { i: i as unknown as RepliableInteraction & Record<string, jest.Mock>, sent };
}

function setup(dbOpts: FakeDbOptions = {}, post?: jest.Mock) {
  const db = fakeDb(dbOpts);
  const discord = fakeClient(post);
  const rt = createRuntime({ client: discord.client, api: db.api, env: ENV });
  return { rt, ...db, ...discord };
}

function json(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (v && typeof v === "object" && typeof v.toJSON === "function" ? v.toJSON() : v));
}

const fns = (calls: { fn: string }[]) => calls.map((c) => c.fn);

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errorSpy.mockRestore());

describe("/report registration", () => {
  test("/report is a top-level guild-only command anyone can see (not a staff /el tool)", () => {
    const cmd = registry().commands.find((c) => c.name === "report");
    expect(cmd).toBeDefined();
    expect(cmd!.contexts).toEqual([InteractionContextType.Guild]);
    expect(cmd!.default_member_permissions).toBeUndefined();
    expect(cmd!.description.length).toBeLessThanOrEqual(100);
    expect(feature.staffSubcommands ?? []).toEqual([]);
    expect(registry().commandHandlers.get("report")?.gate).toBeUndefined();
  });
});

describe("/report from anyone", () => {
  test("an unclaimed user in #start-here gets the modal at once: no defer, no role check, no member lookup", async () => {
    const { rt, calls } = setup();
    const { i } = interaction("command");
    await handleElementalInteraction(rt, i as never);
    expect(i.deferReply).not.toHaveBeenCalled();
    expect(i.showModal).toHaveBeenCalledTimes(1);
    const modal = json(i.showModal.mock.calls[0][0]);
    expect(modal).toContain('"custom_id":"el|report"');
    expect(modal).toContain(`"custom_id":"${FIELD_TEXT}"`);
    expect(modal).toContain(`"custom_id":"${FIELD_WHERE}"`);
    expect(fns(calls)).toEqual(["elemental_bot_settings_get"]);
  });

  test("an unclaimed user's submit from #start-here is saved, posted to #reports only, and acked ephemerally", async () => {
    const { rt, calls, post, createDM, send, channelsFetch } = setup();
    const { i, sent } = interaction("modal");
    await handleElementalInteraction(rt, i as never);

    expect(i.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    expect(calls.find((c) => c.fn === "elemental_bot_report_add")?.args).toEqual([GUILD, USER, TEXT, WHERE]);

    // Exactly one post, to the reports channel id from settings.
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe(Routes.channelMessages(CHANNEL.reports));
    const body = post.mock.calls[0][1].body;
    expect(json(body)).toContain(TEXT);
    expect(json(body)).toContain(WHERE);
    expect(json(body)).toContain(`<@${USER}>`);
    expect(json(body)).toContain(`<#${CHANNEL.start_here}>`);
    // Pings the Safety role only; never the reporter or anyone named in the text.
    expect(body.allowed_mentions).toEqual({ parse: [], roles: [ROLE.safety] });
    expect(json(body.components)).toContain(`el|report_handled|${REPORT_ID}`);

    // Claimed then marked sent with the message id.
    expect(calls.filter((c) => c.fn.startsWith("elemental_bot_post_")).map((c) => c.args)).toEqual([
      [GUILD, REPORT_POST_KIND, REPORT_ID, 60],
      [GUILD, REPORT_POST_KIND, REPORT_ID, "sent", MESSAGE_ID],
    ]);

    // One ephemeral answer, and it never repeats the text.
    expect(i.editReply).toHaveBeenCalledTimes(1);
    expect(sent).toContainEqual(expect.objectContaining({ content: REPORT.received, allowedMentions: { parse: [] } }));
    expect(i.followUp).not.toHaveBeenCalled();
    expect(i.reply).not.toHaveBeenCalled();
    expect(json(sent)).not.toContain(TEXT);

    // No DM, no other channel.
    expect(createDM).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(channelsFetch).not.toHaveBeenCalled();
  });

  test("the text goes nowhere but the #reports post (from a team channel too)", async () => {
    const { rt, post } = setup();
    const { i, sent } = interaction("modal", { channelId: TEAM_CHANNEL, member: { roles: [ROLE.paid] } });
    await handleElementalInteraction(rt, i as never);
    const outbound = [...post.mock.calls.map((c) => ({ route: c[0], body: c[1].body })), ...sent.map((p) => ({ route: "interaction", body: p }))];
    const carrying = outbound.filter((o) => json(o.body).includes(TEXT));
    expect(carrying.map((o) => o.route)).toEqual([Routes.channelMessages(CHANNEL.reports)]);
    expect(post.mock.calls.map((c) => c[0])).not.toContain(Routes.channelMessages(TEAM_CHANNEL));
    // Logs carry no text either.
    expect(json(errorSpy.mock.calls)).not.toContain(TEXT);
  });

  test("a retry of the same text posts once", async () => {
    const { rt, post } = setup();
    await handleElementalInteraction(rt, interaction("modal").i as never);
    const second = interaction("modal");
    await handleElementalInteraction(rt, second.i as never);
    expect(post).toHaveBeenCalledTimes(1);
    expect(second.sent).toContainEqual(expect.objectContaining({ content: REPORT.received }));
  });

  test("a failed post is marked failed, the reporter is told to retry, and the retry posts it", async () => {
    const forbidden = Object.assign(new Error("Missing Access"), { status: 403 });
    const post = jest.fn().mockRejectedValueOnce(forbidden).mockResolvedValue({ id: MESSAGE_ID });
    const { rt, posts } = setup({}, post);
    const first = interaction("modal");
    await handleElementalInteraction(rt, first.i as never);
    expect(post).toHaveBeenCalledTimes(1); // a 403 is not retried
    expect(posts.get(`${REPORT_POST_KIND}:${REPORT_ID}`)).toBe("failed");
    expect(first.sent).toContainEqual(expect.objectContaining({ content: REPORT.savedNotPosted }));

    const retry = interaction("modal");
    await handleElementalInteraction(rt, retry.i as never);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][0]).toBe(Routes.channelMessages(CHANNEL.reports));
    expect(posts.get(`${REPORT_POST_KIND}:${REPORT_ID}`)).toBe("sent");
    expect(retry.sent).toContainEqual(expect.objectContaining({ content: REPORT.received }));
  });

  test("with no #reports channel in settings the report is saved and never posted anywhere", async () => {
    const { rt, post, calls } = setup({ settings: rawSettings({ channels: { start_here: CHANNEL.start_here, news: CHANNEL.news } }) });
    const { i, sent } = interaction("modal");
    await handleElementalInteraction(rt, i as never);
    expect(fns(calls)).toContain("elemental_bot_report_add");
    expect(post).not.toHaveBeenCalled();
    expect(sent).toContainEqual(expect.objectContaining({ content: REPORT.savedNotPosted }));
  });

  test("an empty report is refused before the database; rate limits answer privately", async () => {
    const empty = setup();
    const a = interaction("modal", { fields: { getTextInputValue: () => "   " } });
    await handleElementalInteraction(empty.rt, a.i as never);
    expect(fns(empty.calls)).not.toContain("elemental_bot_report_add");
    expect(a.sent).toContainEqual(expect.objectContaining({ content: REPORT.emptyText }));

    const limited = setup({
      reportAdd: () => {
        throw new ElementalError("rate_limited");
      },
    });
    const b = interaction("modal");
    await handleElementalInteraction(limited.rt, b.i as never);
    expect(limited.post).not.toHaveBeenCalled();
    expect(b.sent).toContainEqual(expect.objectContaining({ content: REPORT.rateLimited }));
    expect(b.i.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
  });

  test("a guild that is not set up answers privately and saves nothing", async () => {
    const { rt, calls } = setup({ settings: null });
    const { i, sent } = interaction("modal");
    await handleElementalInteraction(rt, i as never);
    expect(fns(calls)).toEqual(["elemental_bot_settings_get"]);
    expect(sent).toContainEqual(expect.objectContaining({ content: COMMON.notSetUp }));
  });
});

describe("Handled button", () => {
  const button = (roles: string[], args = REPORT_ID) =>
    interaction("button", { customId: `el|report_handled|${args}`, channelId: CHANNEL.reports, user: { id: STAFF_USER }, member: { roles } });

  test.each([
    ["Safety", [ROLE.safety]],
    ["Host", [ROLE.host]],
  ])("%s can mark a report handled; the button is disabled with who pressed it", async (_label, roles) => {
    const { rt, calls } = setup();
    const { i } = button(roles);
    await handleElementalInteraction(rt, i as never);
    expect(i.deferUpdate).toHaveBeenCalled();
    expect(calls.find((c) => c.fn === "elemental_bot_report_handled")?.args).toEqual([GUILD, REPORT_ID, STAFF_USER]);
    const edit = i.editReply.mock.calls[0][0];
    expect(edit.content).toBe(REPORT.handledBy(`<@${STAFF_USER}>`));
    expect(edit.allowedMentions).toEqual({ parse: [] });
    expect(json(edit.components)).toContain('"disabled":true');
  });

  test.each([
    ["Helper", [ROLE.helper]],
    ["Mentor", [ROLE.mentor]],
    ["Judge", [ROLE.judge]],
    ["Paid", [ROLE.paid]],
    ["no role", []],
  ])("%s is refused and nothing changes", async (_label, roles) => {
    const { rt, calls } = setup();
    const { i } = button(roles);
    await handleElementalInteraction(rt, i as never);
    expect(fns(calls)).not.toContain("elemental_bot_report_handled");
    expect(i.editReply).not.toHaveBeenCalled();
    expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({ content: COMMON.staffOnly, flags: MessageFlags.Ephemeral }));
  });

  test("a second press says it was already handled, privately", async () => {
    const { rt } = setup({ handled: () => ({ report_id: REPORT_ID, already: true }) });
    const { i } = button([ROLE.safety]);
    await handleElementalInteraction(rt, i as never);
    expect(i.editReply.mock.calls[0][0].content).toBeUndefined();
    expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({ content: REPORT.alreadyHandled, flags: MessageFlags.Ephemeral }));
  });

  test("a forged id never reaches the database", async () => {
    const { rt, calls } = setup();
    const { i } = button([ROLE.safety], "not-a-uuid");
    await handleElementalInteraction(rt, i as never);
    expect(fns(calls)).not.toContain("elemental_bot_report_handled");
    expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({ content: REPORT.notFound }));
  });
});

describe("no direct messages", () => {
  test("the report feature and its copy never open a DM", () => {
    for (const file of ["../features/report.ts", "../copy/report.ts"]) {
      const source = fs.readFileSync(path.join(__dirname, file), "utf8");
      expect(source).not.toMatch(/createDM|\buser\.send\b|\busers\.send\b|\.dmChannel\b|ChannelType\.DM\b|member\.send\b/);
    }
  });
});
