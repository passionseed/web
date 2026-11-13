/**
 * @jest-environment node
 */
import { MessageFlags, type Client } from "discord.js";

import { ACTION_HANDLERS } from "..";
import { QuestDbError, QuestError, type QuestApi, type Session } from "../api";
import type { Ctx } from "../context";
import { T } from "../copy";
import { LEARNED_MIN, R } from "../rounds-copy";
import { I } from "../island/copy";
import { ENCOUNTER_EVERY, ROUND_MARKER, encounterAt, roundAt, roundView, startRounds, type RoundAt, type RoundDeps } from "../rounds";
import { boardFixture, side, SIDE_IDS } from "../test-helpers/board";
import { renderView } from "../ui";
import { bodyText, customIds, viewText } from "../test-helpers/view";

const MIN = 60_000;
/** 2026-11-13 10:00 Bangkok (03:00 UTC). */
const TEN = Date.UTC(2026, 10, 13, 3, 0, 0);

describe("roundAt", () => {
  it("runs two rounds an hour on the clock: focus :00 to :25 and :30 to :55, rest after each", () => {
    const at = (m: number) => roundAt(TEN + m * MIN + 30_000);
    expect([0, 24, 25, 29, 30, 54, 55, 59].map((m) => at(m).phase)).toEqual(["focus", "focus", "rest", "rest", "focus", "focus", "rest", "rest"]);
    expect(at(0).round).toBe(at(29).round);
    expect(at(30).round).toBe(at(0).round + 1);
    expect(at(10).restAt).toBe((TEN + 25 * MIN) / 1000);
    expect(at(10).nextAt).toBe((TEN + 30 * MIN) / 1000);
    expect(at(40).restAt).toBe((TEN + 55 * MIN) / 1000);
  });
});

describe("roundView", () => {
  it("focus: when the rest starts, 🎯, the marker, nobody's minutes", () => {
    const p = renderView(roundView(roundAt(TEN)), { ephemeral: false });
    expect(p.flags).toBe(MessageFlags.IsComponentsV2);
    expect(bodyText(p).startsWith(`### ${R.focusTitle}\n`)).toBe(true);
    expect(viewText(p)).toContain(`<t:${(TEN + 25 * MIN) / 1000}:t>`);
    expect(viewText(p)).toContain(ROUND_MARKER);
    expect(customIds(p)).toEqual(["sq|rd_aim"]);
  });

  it("rest: a diffuse-mode tip that changes each round, ✍️ first", () => {
    const a = renderView(roundView(roundAt(TEN + 26 * MIN)), { ephemeral: false });
    const b = renderView(roundView(roundAt(TEN + 56 * MIN)), { ephemeral: false });
    expect(bodyText(a).startsWith(`### ${R.restTitle}\n`)).toBe(true);
    expect(customIds(a).slice(0, 2)).toEqual(["sq|rd_close", "sq|rd_aim"]);
    expect(viewText(a)).not.toBe(viewText(b));
    expect(R.tips.some((tip) => viewText(a).includes(tip))).toBe(true);
  });

  it("copy has no em dash and no streak wording", () => {
    const text = JSON.stringify(R);
    expect(text).not.toContain("—");
    expect(text).not.toContain("น้องๆ");
    expect(text).not.toContain("ปลูก");
    expect(text).not.toMatch(/สตรีค|streak|ติดต่อกัน/);
  });
});

/** The rest of a round, by its number. */
const restOf = (round: number): RoundAt => ({ round, phase: "rest", restAt: 0, nextAt: 60 });
/** The first rounds from TEN's whose rest carries an encounter, and one whose rest does not. */
const FIRST = roundAt(TEN).round;
const withEncounter = Array.from({ length: 200 }, (_, k) => FIRST + k).filter((r) => encounterAt(r));
const without = Array.from({ length: 200 }, (_, k) => FIRST + k).find((r) => !encounterAt(r))!;

describe("encounters", () => {
  it("come on about one rest in three, chosen by the round number alone, so a restart shows the same one", () => {
    const rounds = Array.from({ length: 3000 }, (_, k) => FIRST + k);
    const share = rounds.filter((r) => encounterAt(r)).length / rounds.length;
    expect(share).toBeGreaterThan(1 / ENCOUNTER_EVERY - 0.05);
    expect(share).toBeLessThan(1 / ENCOUNTER_EVERY + 0.05);
    for (const r of rounds.slice(0, 50)) expect(encounterAt(r)).toBe(encounterAt(r));
    // Every moment from the lore turns up, and not on a fixed beat.
    const keys = new Set(rounds.map((r) => encounterAt(r)?.key).filter(Boolean));
    expect([...keys].sort()).toEqual(R.encounters.map((e) => e.key).sort());
    const gaps = new Set(withEncounter.slice(1).map((r, k) => r - withEncounter[k]));
    expect(gaps.size).toBeGreaterThan(1);
    expect(encounterAt(Number.NaN)).toBeNull();
  });

  it("puts the encounter on the rest for everyone: its lines, its button with the round, the fine print, the marker", () => {
    const round = withEncounter[0];
    const encounter = encounterAt(round)!;
    const p = renderView(roundView(restOf(round)), { ephemeral: false });
    expect(p.flags).toBe(MessageFlags.IsComponentsV2);
    expect(bodyText(p)).toContain(encounter.text);
    expect(bodyText(p)).toContain(R.encounterFine);
    expect(viewText(p)).toContain(ROUND_MARKER);
    expect(viewText(p)).toContain(encounter.button);
    expect(customIds(p)).toEqual(["sq|rd_close", "sq|rd_aim", `sq|rd_enc|${round}`]);
    // A restart draws the same message.
    expect(JSON.stringify(renderView(roundView(restOf(round)), { ephemeral: false }))).toBe(JSON.stringify(p));
    // Nobody is named or pinged.
    expect(p.allowedMentions).toEqual({ parse: [] });
    expect(viewText(p)).not.toMatch(/<@|@everyone|@here/);
  });

  it("leaves most rests, and every focus, without one", () => {
    const rest = renderView(roundView(restOf(without)), { ephemeral: false });
    expect(customIds(rest)).toEqual(["sq|rd_close", "sq|rd_aim"]);
    expect(bodyText(rest)).not.toContain(R.encounterFine);
    const focus = renderView(roundView({ ...restOf(withEncounter[0]), phase: "focus" }), { ephemeral: false });
    expect(customIds(focus)).toEqual(["sq|rd_aim"]);
  });

  it("has one to two lines each, in the house style", () => {
    for (const e of R.encounters) {
      expect(e.text.split("\n").length).toBeLessThanOrEqual(2);
      expect(e.button.length).toBeLessThanOrEqual(80);
      expect(`${e.text}${e.button}${e.found}`).not.toMatch(/—|น้องๆ|ปลูก|เหรียญ|coin/i);
    }
  });
});

/** A voice channel's chat that records what the loop does. */
function world(start = TEN) {
  let now = start;
  let sitters = 0;
  let room: string | null = "700000000000000001";
  const log: string[] = [];
  const posted: { id: string; text: string; deleted: boolean }[] = [];
  /** Error codes the next edits fail with, in turn. */
  const editFailures: number[] = [];
  let next = 1;
  const message = (text: string, mine = true) => {
    const m = {
      id: `m${next++}`,
      text,
      deleted: false,
      author: { id: mine ? "bot" : "someone" },
      components: [{ text }],
      edit: async (payload: unknown) => {
        const code = editFailures.shift();
        if (code !== undefined) {
          log.push(`edit ${m.id} failed ${code}`);
          throw Object.assign(new Error("edit failed"), { code });
        }
        m.text = JSON.stringify(payload);
        m.components = [{ text: m.text }];
        log.push(`edit ${m.id}`);
      },
      delete: async () => {
        m.deleted = true;
        log.push(`delete ${m.id}`);
      },
    };
    return m;
  };
  const leftover = message(`old round ${ROUND_MARKER}`);
  const other = message("someone's message", false);
  const channel = {
    id: room!,
    send: async (payload: unknown) => {
      const m = message(JSON.stringify(payload));
      posted.push(m);
      log.push(`send ${m.id}`);
      return m as never;
    },
    messages: { fetch: async () => new Map([[leftover.id, leftover as never], [other.id, other as never]]) },
  };
  const deps: RoundDeps = { now: () => now, channelOf: (id) => (id === channel.id ? (channel as never) : null), botId: () => "bot" };
  const loop = startRounds({} as Client, { status: () => ({ channel: room, sitters }) }, deps);
  return {
    loop,
    log,
    posted,
    leftover,
    other,
    at: (minutes: number) => (now = start + minutes * MIN),
    sit: (n: number) => (sitters = n),
    failEdits: (...codes: number[]) => editFailures.push(...codes),
    close: () => (room = null),
  };
}

describe("startRounds", () => {
  const open: { loop: { stop: () => Promise<void> } }[] = [];
  afterEach(async () => {
    for (const w of open.splice(0)) await w.loop.stop();
  });
  const make = () => {
    const w = world();
    open.push(w);
    return w;
  };

  it("posts nothing while nobody sits at the fire", async () => {
    const w = make();
    await w.loop.tick();
    expect(w.log).toEqual([]);
  });

  it("posts once a round, edits it to the rest, then replaces it; its own leftovers go, nobody else's", async () => {
    const w = make();
    w.sit(2);
    w.at(3);
    await w.loop.tick();
    expect(w.log).toEqual(["delete m1", "send m3"]);
    expect([w.leftover.deleted, w.other.deleted]).toEqual([true, false]);
    w.at(10);
    await w.loop.tick();
    expect(w.log).toHaveLength(2);
    w.at(26);
    await w.loop.tick();
    expect(w.log.at(-1)).toBe("edit m3");
    expect(w.posted[0].text).toContain(R.btnClose);
    w.at(31);
    await w.loop.tick();
    expect(w.log.slice(-2)).toEqual(["delete m3", "send m4"]);
  });

  it("retries a failed edit on the same message, and posts anew only when the message is gone", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const w = make();
    w.sit(1);
    await w.loop.tick();
    w.failEdits(500);
    w.at(26);
    await w.loop.tick();
    await w.loop.tick();
    expect(w.log.slice(-2)).toEqual(["edit m3 failed 500", "edit m3"]);
    expect(w.posted).toHaveLength(1);
    w.at(31);
    await w.loop.tick();
    w.failEdits(10008);
    w.at(56);
    await w.loop.tick();
    await w.loop.tick();
    expect(w.log.slice(-2)).toEqual(["edit m4 failed 10008", "send m5"]);
    warn.mockRestore();
  });

  it("keeps the round's message when the fire empties, and removes it once that round is over", async () => {
    const w = make();
    w.sit(1);
    await w.loop.tick();
    w.sit(0);
    w.at(20);
    await w.loop.tick();
    expect(w.log.filter((l) => l.startsWith("delete m3"))).toEqual([]);
    w.at(30);
    await w.loop.tick();
    expect(w.log.at(-1)).toBe("delete m3");
    w.at(35);
    await w.loop.tick();
    expect(w.log.at(-1)).toBe("delete m3");
  });

  it("removes its message on stop", async () => {
    const w = world();
    w.sit(1);
    await w.loop.tick();
    await w.loop.stop();
    expect(w.log.at(-1)).toBe("delete m3");
  });
});

// ---------------------------------------------------------------------------
// The buttons
// ---------------------------------------------------------------------------

function session(): Session {
  return {
    member_id: "m",
    onboarded: true,
    roles: [],
    current_project_id: null,
    unread: 0,
    prefs: null,
    settings: {
      student_role_ids: ["555"],
      awards: true,
      redemption: false,
      sharing: false,
      reminders: false,
      reward_terms: null,
      redemption_terms: null,
      squads: true,
    },
  };
}

function ctx(call: (fn: string, ...args: unknown[]) => unknown = () => null): Ctx {
  const api = { call: jest.fn(async (fn: string, ...args: unknown[]) => (fn === "shift_quest_schema_version" ? call(fn, ...args) ?? 11 : call(fn, ...args))), rows: jest.fn() };
  return { api: api as unknown as QuestApi, userId: "1111111111", name: "x", memberRoleIds: ["555"], session: session() };
}
const calls = (c: Ctx) => (c.api.call as jest.Mock).mock.calls;

function interaction(kind: "button" | "modal", fields: Record<string, string> = {}) {
  const sent: { how: string; payload: unknown }[] = [];
  const modals: { custom_id?: string; components?: unknown[] }[] = [];
  const i: Record<string, unknown> = {
    id: "2",
    deferred: false,
    replied: false,
    customId: "sq|x",
    message: { content: "", embeds: [] },
    isChatInputCommand: () => false,
    isMessageComponent: () => kind === "button",
    isButton: () => kind === "button",
    isStringSelectMenu: () => false,
    isModalSubmit: () => kind === "modal",
    fields: { getTextInputValue: (id: string) => fields[id] ?? "" },
    reply: async (payload: unknown) => {
      i.replied = true;
      sent.push({ how: "reply", payload });
    },
    deferReply: async (payload: unknown) => {
      i.deferred = true;
      sent.push({ how: "deferReply", payload });
    },
    editReply: async (payload: unknown) => sent.push({ how: "editReply", payload }),
    update: async (payload: unknown) => sent.push({ how: "update", payload }),
    deferUpdate: async () => sent.push({ how: "deferUpdate", payload: null }),
    showModal: async (m: { toJSON: () => { custom_id?: string } }) => modals.push(m.toJSON()),
  };
  return { i: i as never, sent, modals };
}

describe("round buttons", () => {
  it("🎯 opens the intention form and starts a work session with it, privately", async () => {
    const a = interaction("button");
    await ACTION_HANDLERS.get("rd_aim")!(a.i, ctx(), []);
    expect(a.modals[0].custom_id).toBe("sq|rd_aim_go");

    const c = ctx();
    const b = interaction("modal", { intention: "ทำหน้า login" });
    await ACTION_HANDLERS.get("rd_aim_go")!(b.i, c, []);
    expect(calls(c)).toEqual([["shift_quest_work_start", "1111111111", "ทำหน้า login"]]);
    // Answered at once (deferred, private), then filled in.
    expect(b.sent.map((x) => x.how)).toEqual(["deferReply", "editReply"]);
    expect((b.sent[0].payload as { flags: number }).flags & MessageFlags.Ephemeral).toBeTruthy();
    expect(bodyText(b.sent[1].payload as never)).toContain("ทำหน้า login");
  });

  it("🎯 again with a round still open closes it without a reflection first", async () => {
    let started = 0;
    const c = ctx((fn) => {
      if (fn === "shift_quest_work_start" && started++ === 0) throw new QuestError("session_open");
      if (fn === "shift_quest_work_end") return { intention: "เก่า" };
      return null;
    });
    await ACTION_HANDLERS.get("rd_aim_go")!(interaction("modal", { intention: "ใหม่" }).i, c, []);
    expect(calls(c).map((x) => x[0])).toEqual(["shift_quest_work_start", "shift_quest_work_end", "shift_quest_work_start"]);
    expect(calls(c)[1]).toEqual(["shift_quest_work_end", "1111111111", null]);
  });

  it("✍️ asks what was learned (at least 10 characters) and where it is stuck", async () => {
    const a = interaction("button");
    await ACTION_HANDLERS.get("rd_close")!(a.i, ctx(), []);
    const json = JSON.stringify(a.modals[0]);
    expect(a.modals[0].custom_id).toBe("sq|rd_close_go|");
    expect(json).toContain('"min_length":10');
    expect(json).toContain(R.closeStuck);
  });

  it("✍️ saves a private journal entry under the round's intention, and offers help for a stuck note", async () => {
    const c = ctx((fn) => {
      if (fn === "shift_quest_work_end") return { id: "s", intention: "ทำหน้า login" };
      if (fn === "shift_quest_progress_add") return "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e51";
      return null;
    });
    const b = interaction("modal", { learned: "เข้าใจ session cookie แล้ว", stuck: "redirect วน" });
    await ACTION_HANDLERS.get("rd_close_go")!(b.i, c, []);
    expect(calls(c)).toEqual([
      ["shift_quest_schema_version"],
      ["shift_quest_work_end", "1111111111", "เข้าใจ session cookie แล้ว"],
      ["shift_quest_progress_add", "1111111111", "ทำหน้า login", "เข้าใจ session cookie แล้ว", null, "redirect วน", null, "private", null],
    ]);
    expect(b.sent.map((x) => x.how)).toEqual(["deferReply", "editReply"]);
    expect((b.sent[0].payload as { flags: number }).flags & MessageFlags.Ephemeral).toBeTruthy();
    expect(customIds(b.sent[1].payload as never)).toEqual(["sq|prog_help|3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e51"]);
    expect(viewText(b.sent[1].payload as never)).toContain(R.closed);
  });

  it("✍️ without a round started still saves, under the campfire's name, with no help button when not stuck", async () => {
    const c = ctx((fn) => {
      if (fn === "shift_quest_work_end") throw new QuestError("no_session");
      if (fn === "shift_quest_progress_add") return "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e52";
      return null;
    });
    const b = interaction("modal", { learned: "ลองใช้ git rebase ครั้งแรก" });
    await ACTION_HANDLERS.get("rd_close_go")!(b.i, c, []);
    expect(calls(c)[2].slice(0, 6)).toEqual(["shift_quest_progress_add", "1111111111", R.changedDefault, "ลองใช้ git rebase ครั้งแรก", null, null]);
    expect(customIds(b.sent[1].payload as never)).toEqual([]);
  });

  const SESSION = "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e51";

  it.each([SESSION, null])("captures the open session %s with one read before showing the form", async (id) => {
    const c = ctx((fn) => fn === "shift_quest_work_open" ? id : null);
    const a = interaction("button");
    await ACTION_HANDLERS.get("rd_close")!(a.i, c, []);
    expect(calls(c)).toEqual([["shift_quest_work_open", c.userId]]);
    expect(a.modals[0].custom_id).toBe(`sq|rd_close_go|${id ?? ""}`);
    expect(a.modals[0].custom_id!.length).toBeLessThanOrEqual(100);
  });

  it("opens on older schemas, but propagates other session-read failures", async () => {
    const old = ctx(() => { throw new QuestDbError("shift_quest_work_open", "42883"); });
    const a = interaction("button");
    await ACTION_HANDLERS.get("rd_close")!(a.i, old, []);
    expect(a.modals[0].custom_id).toBe("sq|rd_close_go|");
    const failed = ctx(() => { throw new QuestDbError("shift_quest_work_open", "08006"); });
    const b = interaction("button");
    await expect(ACTION_HANDLERS.get("rd_close")!(b.i, failed, [])).rejects.toThrow();
    expect(b.modals).toEqual([]);
  });

  it.each([[SESSION], [""], []])("schema 12 submits the captured session, including stale and empty IDs: %j", async (...args) => {
    const b = interaction("modal", { learned: "เข้าใจ session cookie แล้ว", stuck: "redirect วน" });
    const c = ctx((fn) => {
      expect(b.sent[0].how).toBe("deferReply");
      if (fn === "shift_quest_schema_version") return 12;
      if (fn === "shift_quest_round_close") return SESSION;
      throw new Error(`Unexpected call ${fn}`);
    });
    await ACTION_HANDLERS.get("rd_close_go")!(b.i, c, args);
    expect(calls(c)).toEqual([
      ["shift_quest_schema_version"],
      ["shift_quest_round_close", c.userId, args[0] || null, "เข้าใจ session cookie แล้ว", "redirect วน"],
    ]);
    expect(customIds(b.sent[1].payload as never)).toEqual([`sq|prog_help|${SESSION}`]);
    // The schema is cached per API, as with roots.
    await ACTION_HANDLERS.get("rd_close_go")!(b.i, c, args);
    expect(calls(c).filter(([fn]) => fn === "shift_quest_schema_version")).toHaveLength(1);
  });

  it("never falls back to actor-only close after an atomic write fails; a retry keeps the captured ID", async () => {
    let fail = true;
    const c = ctx((fn) => {
      if (fn === "shift_quest_schema_version") return 12;
      if (fn === "shift_quest_round_close") {
        if (fail) throw new QuestError("busy");
        return SESSION;
      }
      throw new Error(`Unexpected call ${fn}`);
    });
    const submit = () => ACTION_HANDLERS.get("rd_close_go")!(interaction("modal", { learned: "ลองใช้ git rebase ครั้งแรก" }).i, c, [SESSION]);
    await expect(submit()).rejects.toThrow("sq:busy");
    fail = false;
    await submit();
    expect(calls(c).map(([fn]) => fn)).toEqual(["shift_quest_schema_version", "shift_quest_round_close", "shift_quest_round_close"]);
    expect(calls(c).slice(1).map((call) => call[2])).toEqual([SESSION, SESSION]);
  });

  it("is for students who have started", async () => {
    const c = ctx();
    c.session = { ...c.session, member_id: null, onboarded: false };
    await expect(ACTION_HANDLERS.get("rd_close")!(interaction("button").i, c, [])).rejects.toThrow(T.notStarted);
  });
});

describe("the encounter's button", () => {
  const round = withEncounter[0];
  const press = async (c: Ctx, r: number | string = round) => {
    const b = interaction("button");
    await ACTION_HANDLERS.get("rd_enc")!(b.i, c, [String(r)]);
    return b;
  };

  it("answers privately with the note: one side quest the presser can take, read from the board, never an edit of the round message", async () => {
    const c = ctx((fn) => (fn === "shift_quest_board" ? boardFixture() : null));
    const b = await press(c);
    expect(calls(c)).toEqual([["shift_quest_board", "1111111111"]]);
    expect(b.sent.map((x) => x.how)).toEqual(["deferReply", "editReply"]);
    expect((b.sent[0].payload as { flags: number }).flags & MessageFlags.Ephemeral).toBeTruthy();
    const card = b.sent[1].payload as never;
    expect(bodyText(card)).toContain(encounterAt(round)!.found);
    expect(bodyText(card)).toContain(R.encounterNoteFine);
    // Only a side quest open to take: never the one in progress or the locked one.
    const ids = customIds(card);
    const take = ids.find((id) => id.startsWith("sq|qb_take|"))!;
    expect([SIDE_IDS[0], SIDE_IDS[3]]).toContain(take.split("|")[2]);
    expect(ids).toContain(`sq|qb_send|${take.split("|")[2]}`);
  });

  it("offers everyone at the fire the same quest in a round, when it is open to them", async () => {
    const picks = new Set<string>();
    for (const user of ["1", "2", "3"]) {
      const c = ctx((fn) => (fn === "shift_quest_board" ? boardFixture({ side: [side(0), side(1), side(2), side(3)] }) : null));
      c.userId = user;
      picks.add(customIds((await press(c)).sent[1].payload as never).find((id) => id.startsWith("sq|qb_take|"))!);
    }
    expect(picks.size).toBe(1);
  });

  it("says so, and points to the board or a plot, when no side quest is open to the presser", async () => {
    const none = ctx((fn) => (fn === "shift_quest_board" ? boardFixture({ side: [side(2, { locked: true, missing_milestones: [3] })] }) : null));
    let card = (await press(none)).sent[1].payload as never;
    expect(bodyText(card)).toContain(R.encounterNone);
    expect(customIds(card)).toEqual(["sq|is_board", "sq|is_view"]);

    const noPlot = ctx((fn) => (fn === "shift_quest_board" ? boardFixture({ project: null }) : null));
    card = (await press(noPlot)).sent[1].payload as never;
    expect(bodyText(card)).toContain(R.encounterNoPlot);
    expect(customIds(card)).toEqual(["sq|is_claim", "sq|is_view"]);
  });

  it("does nothing for a round without an encounter or a forged round, and is for students who have started", async () => {
    for (const r of [without, "abc", "-1", ""]) {
      const c = ctx();
      const b = await press(c, r);
      expect([r, b.sent, calls(c)]).toEqual([r, [], []]);
    }
    const c = ctx();
    c.session = { ...c.session, member_id: null, onboarded: false };
    await expect(press(c)).rejects.toThrow(T.notStarted);
  });
});


describe("island reflections", () => {
  it("opens the shared learned and optional stuck form", async () => {
    const b = interaction("button");
    await ACTION_HANDLERS.get("is_reflect")!(b.i, ctx(), []);
    const campfire = interaction("button");
    await ACTION_HANDLERS.get("rd_close")!(campfire.i, ctx(), []);
    expect(b.modals[0].custom_id).toBe("sq|is_reflect_go");
    expect(b.modals[0].components).toEqual(campfire.modals[0].components);
    expect(JSON.stringify(b.modals[0])).toContain(`"min_length":${LEARNED_MIN}`);
    expect(JSON.stringify(b.modals[0])).toContain('"max_length":1000');
  });

  it.each(["", "ติด API"])("defers privately before database access, saves without changing any work session (stuck: %s)", async (stuck) => {
    const b = interaction("modal", { learned: "ลองใช้ git rebase ครั้งแรก", stuck });
    const id = "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e51";
    const c = ctx((fn) => {
      expect(b.sent[0]).toEqual({ how: "deferReply", payload: { flags: MessageFlags.Ephemeral } });
      return fn === "shift_quest_island" ? { project: { id: "p" } } : id;
    });
    await ACTION_HANDLERS.get("is_reflect_go")!(b.i, c, []);
    expect(calls(c)).toEqual([
      ["shift_quest_island", c.userId],
      ["shift_quest_progress_add", c.userId, I.reflectionChanged, "ลองใช้ git rebase ครั้งแรก", null, stuck || null, null, "private", null],
    ]);
    expect(b.sent.map((s) => s.how)).toEqual(["deferReply", "editReply"]);
    const card = b.sent[1].payload as never;
    expect(viewText(card)).toContain(R.closedTitle);
    expect(viewText(card)).toContain(R.closed);
    expect(viewText(card)).toContain(R.closedFine);
    expect(customIds(card)).toEqual(stuck ? [`sq|prog_help|${id}`] : []);
  });

  it("offers a plot if the project is missing at submit time, without saving an unattached note", async () => {
    const c = ctx(() => ({ project: null }));
    const b = interaction("modal", { learned: "ลองใช้ git rebase ครั้งแรก" });
    await ACTION_HANDLERS.get("is_reflect_go")!(b.i, c, []);
    expect(calls(c)).toEqual([["shift_quest_island", c.userId]]);
    expect(bodyText(b.sent[1].payload as never)).toContain(I.noPlot);
    expect(customIds(b.sent[1].payload as never)).toEqual(["sq|is_claim", "sq|is_view"]);
  });

  it("lets the normal router handle RPC refusals after deferring", async () => {
    const c = ctx((fn) => {
      if (fn === "shift_quest_island") return { project: { id: "p" } };
      throw new QuestError("not_student");
    });
    const b = interaction("modal", { learned: "ลองใช้ git rebase ครั้งแรก" });
    await expect(ACTION_HANDLERS.get("is_reflect_go")!(b.i, c, [])).rejects.toThrow("sq:not_student");
    expect(b.sent.map((s) => s.how)).toEqual(["deferReply"]);
  });

  it.each(["is_reflect", "is_reflect_go"])("%s requires an onboarded student", async (action) => {
    const c = ctx();
    c.session = { ...c.session, member_id: null, onboarded: false };
    await expect(ACTION_HANDLERS.get(action)!(interaction(action === "is_reflect" ? "button" : "modal").i, c, [])).rejects.toThrow(T.notStarted);
    expect(calls(c)).toEqual([]);
  });
});
