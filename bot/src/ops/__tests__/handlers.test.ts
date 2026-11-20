/**
 * @jest-environment node
 *
 * /ops (bot/src/ops/handlers.ts) with a fake board and fake interactions:
 * staff only, in one server only, private replies outside the staff channel,
 * every error private, no pings. Made-up operations only.
 */
import { MessageFlags, PermissionFlagsBits, type Interaction } from "discord.js";

import { OpsDbError, OpsError, type OpsApi } from "../api";
import { errorText, handleOpsInteraction, hasRole, isStaffChannel, type OpsContext } from "../handlers";
import type { OpDetail, OpSummary } from "../model";

const GUILD = "100000000000000001";
const CHANNEL = "100000000000000002";
const STAFF = "100000000000000003";

function summary(over: Partial<OpSummary> = {}): OpSummary {
  return {
    slug: "snack-run",
    title: "Snack run",
    owner: null,
    deadline_text: "Wed 9 Dec",
    deadline_on: "2026-12-09",
    status: "Not started",
    steps_done: 0,
    steps_total: 2,
    ...over,
  };
}

function fakeApi(): jest.Mocked<OpsApi> {
  const detail: OpDetail = {
    ...summary(),
    goal: "Enough snacks",
    done_when: null,
    steps: [
      { position: 1, text: "Buy fruit", done: false },
      { position: 2, text: "Buy water", done: true },
    ],
  };
  return {
    board: jest.fn().mockResolvedValue([summary(), summary({ slug: "venue", title: "Venue booking" })]),
    show: jest.fn().mockResolvedValue(detail),
    claim: jest.fn().mockImplementation(async (_slug: string, owner: string) => ({ ...summary(), owner, previous_owner: "Pat" })),
    setStep: jest.fn().mockImplementation(async (_slug: string, position: number, done: boolean) => ({
      ...summary({ steps_done: done ? 2 : 0 }),
      position,
      text: "Buy fruit",
      done,
      changed: true,
    })),
    setStatus: jest.fn().mockImplementation(async (_slug: string, status: string) => ({ ...summary(), status })),
    seed: jest.fn(),
    claimMorning: jest.fn(),
    releaseMorning: jest.fn(),
  };
}

/** A channel; `everyoneSees` says whether @everyone has View Channel there. */
function channel(id: string, everyoneSees: boolean) {
  const everyone = { id: GUILD };
  return {
    id,
    guild: { roles: { everyone } },
    permissionsFor: (who: unknown) => ({
      has: (flag: bigint) => (who === everyone && flag === PermissionFlagsBits.ViewChannel ? everyoneSees : true),
    }),
  };
}

interface FakeOptions {
  sub: string;
  values?: Record<string, string | boolean>;
  roles?: string[];
  guildId?: string;
  where?: ReturnType<typeof channel> | null;
}

function command({ sub, values = {}, roles = [STAFF], guildId = GUILD, where = channel(CHANNEL, false) }: FakeOptions) {
  const calls: { kind: string; payload: unknown }[] = [];
  const record = (kind: string) =>
    jest.fn(async (payload?: unknown) => {
      calls.push({ kind, payload });
    });
  const i = {
    commandName: "ops",
    guildId,
    channel: where,
    member: { roles, nick: null, displayName: "Sam Staff" },
    user: { username: "sam", globalName: "Sam" },
    inGuild: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => true,
    options: {
      getSubcommand: () => sub,
      getString: (name: string, required?: boolean) => {
        const value = values[name];
        if (value === undefined && required) throw new Error(`missing ${name}`);
        return (value as string | undefined) ?? null;
      },
      getBoolean: (name: string) => (values[name] as boolean | undefined) ?? null,
    },
    reply: record("reply"),
    deferReply: record("defer"),
    editReply: record("edit"),
    deleteReply: record("delete"),
    followUp: record("followUp"),
  };
  return { i: i as unknown as Interaction, calls };
}

function ctx(api: OpsApi): OpsContext {
  return {
    api,
    env: { guildId: GUILD, channelId: CHANNEL, staffRoleId: STAFF },
    now: () => Date.parse("2026-12-08T01:30:00Z"),
  };
}

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

describe("who may use /ops", () => {
  it("refuses a member without the staff role, privately, without touching the database", async () => {
    const api = fakeApi();
    const { i, calls } = command({ sub: "board", roles: ["100000000000000999"] });
    await handleOpsInteraction(ctx(api), i);
    expect(calls).toEqual([
      { kind: "reply", payload: { content: errorText(new OpsError("not_staff")), ...EPHEMERAL, allowedMentions: { parse: [] } } },
    ]);
    expect(api.board).not.toHaveBeenCalled();
  });

  it("ignores another server", async () => {
    const api = fakeApi();
    const { i, calls } = command({ sub: "board", guildId: "100000000000000777" });
    await handleOpsInteraction(ctx(api), i);
    expect(calls).toEqual([]);
  });

  it("reads roles from a cached member or the raw API member", () => {
    expect(hasRole({ roles: [STAFF] }, STAFF)).toBe(true);
    expect(hasRole({ roles: { cache: new Map([[STAFF, {}]]) } }, STAFF)).toBe(true);
    expect(hasRole({ roles: [] }, STAFF)).toBe(false);
    expect(hasRole(null, STAFF)).toBe(false);
  });
});

describe("where replies show", () => {
  it("replies in the open only in the configured channel when @everyone cannot see it", () => {
    expect(isStaffChannel(channel(CHANNEL, false), CHANNEL)).toBe(true);
    expect(isStaffChannel(channel(CHANNEL, true), CHANNEL)).toBe(false);
    expect(isStaffChannel(channel("100000000000000555", false), CHANNEL)).toBe(false);
    expect(isStaffChannel(null, CHANNEL)).toBe(false);
  });

  it("answers privately anywhere else", async () => {
    const { i, calls } = command({ sub: "board", where: channel("100000000000000555", false) });
    await handleOpsInteraction(ctx(fakeApi()), i);
    expect(calls[0]).toEqual({ kind: "defer", payload: EPHEMERAL });
  });

  it("answers privately in the configured channel if it became public", async () => {
    const { i, calls } = command({ sub: "board", where: channel(CHANNEL, true) });
    await handleOpsInteraction(ctx(fakeApi()), i);
    expect(calls[0]).toEqual({ kind: "defer", payload: EPHEMERAL });
  });
});

describe("subcommands", () => {
  it("board: shows every operation, without pings", async () => {
    const { i, calls } = command({ sub: "board" });
    await handleOpsInteraction(ctx(fakeApi()), i);
    expect(calls[0]).toEqual({ kind: "defer", payload: {} });
    const edit = calls[1].payload as { embeds: { fields: unknown[] }[]; allowedMentions: unknown };
    expect(edit.embeds[0].fields).toHaveLength(2);
    expect(edit.allowedMentions).toEqual({ parse: [] });
  });

  it("show: finds the operation by title too", async () => {
    const api = fakeApi();
    const { i, calls } = command({ sub: "show", values: { operation: "venue booking" } });
    await handleOpsInteraction(ctx(api), i);
    expect(api.show).toHaveBeenCalledWith("venue");
    expect(allText(calls[1].payload)).toContain("Buy fruit");
  });

  it("claim: the owner becomes the caller's display name", async () => {
    const api = fakeApi();
    const { i, calls } = command({ sub: "claim", values: { operation: "snack-run" } });
    await handleOpsInteraction(ctx(api), i);
    expect(api.claim).toHaveBeenCalledWith("snack-run", "Sam Staff");
    expect((calls[1].payload as { content: string }).content).toBe("**Sam Staff** now owns **Snack run** (was Pat).");
  });

  it("done: ticks the picked step, and undo unticks it", async () => {
    const api = fakeApi();
    const ticked = command({ sub: "done", values: { operation: "snack-run", step: "1" } });
    await handleOpsInteraction(ctx(api), ticked.i);
    expect(api.setStep).toHaveBeenLastCalledWith("snack-run", 1, true, "Sam Staff");
    expect((ticked.calls[1].payload as { content: string }).content).toContain("✅ Ticked step 1 of **Snack run**");

    const undone = command({ sub: "done", values: { operation: "snack-run", step: "buy f", undo: true } });
    await handleOpsInteraction(ctx(api), undone.i);
    expect(api.setStep).toHaveBeenLastCalledWith("snack-run", 1, false, "Sam Staff");
  });

  it("status: sets the line", async () => {
    const api = fakeApi();
    const { i, calls } = command({ sub: "status", values: { operation: "snack-run", text: "  Fruit bought  " } });
    await handleOpsInteraction(ctx(api), i);
    expect(api.setStatus).toHaveBeenCalledWith("snack-run", "Fruit bought");
    expect((calls[1].payload as { content: string }).content).toBe("Status of **Snack run**: Fruit bought");
  });
});

describe("errors are private", () => {
  it("an unknown operation in the staff channel: the public reply goes, the error comes privately", async () => {
    const { i, calls } = command({ sub: "show", values: { operation: "nope" } });
    await handleOpsInteraction(ctx(fakeApi()), i);
    expect(calls.map((c) => c.kind)).toEqual(["defer", "delete", "followUp"]);
    expect(calls[2].payload).toEqual({ content: errorText(new OpsError("not_found")), ...EPHEMERAL, allowedMentions: { parse: [] } });
  });

  it("an unknown step", async () => {
    const { i, calls } = command({ sub: "done", values: { operation: "snack-run", step: "9" }, where: null });
    await handleOpsInteraction(ctx(fakeApi()), i);
    expect(calls.map((c) => c.kind)).toEqual(["defer", "edit"]);
    expect((calls[1].payload as { content: string }).content).toBe(errorText(new OpsError("step_not_found")));
  });

  it("a database failure says only that the board could not be reached", async () => {
    const api = fakeApi();
    api.board.mockRejectedValue(new OpsDbError("hackathon_ops_board", "08006"));
    const { i, calls } = command({ sub: "board", where: null });
    await handleOpsInteraction(ctx(api), i);
    expect((calls[1].payload as { content: string }).content).toBe("The board could not be reached. Try again in a minute.");
  });

  it("no message contains an em dash", () => {
    for (const code of ["not_staff", "not_found", "step_not_found", "bad_status", "bad_owner", "other"]) {
      expect(errorText(new OpsError(code))).not.toContain("—");
    }
  });
});

describe("autocomplete", () => {
  function auto(focused: { name: string; value: string }, roles = [STAFF]) {
    const respond = jest.fn().mockResolvedValue(undefined);
    const i = {
      commandName: "ops",
      guildId: GUILD,
      member: { roles },
      inGuild: () => true,
      isAutocomplete: () => true,
      isChatInputCommand: () => false,
      options: { getFocused: () => focused, getString: (name: string) => (name === "operation" ? "snack-run" : null) },
      respond,
    };
    return { i: i as unknown as Interaction, respond };
  }

  it("lists operations and the chosen operation's steps", async () => {
    const api = fakeApi();
    const ops = auto({ name: "operation", value: "ven" });
    await handleOpsInteraction(ctx(api), ops.i);
    expect(ops.respond).toHaveBeenCalledWith([{ name: "Venue booking (0/2)", value: "venue" }]);

    const steps = auto({ name: "step", value: "" });
    await handleOpsInteraction(ctx(api), steps.i);
    expect(steps.respond).toHaveBeenCalledWith([
      { name: "1. Buy fruit", value: "1" },
      { name: "✓ 2. Buy water", value: "2" },
    ]);
  });

  it("shows nothing to someone without the staff role", async () => {
    const api = fakeApi();
    const { i, respond } = auto({ name: "operation", value: "" }, []);
    await handleOpsInteraction(ctx(api), i);
    expect(respond).toHaveBeenCalledWith([]);
    expect(api.board).not.toHaveBeenCalled();
  });
});

function allText(value: unknown): string {
  return JSON.stringify(value);
}
