/**
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";

import { ACTION_HANDLERS, COMMAND_HANDLERS, handleInteraction } from "..";
import { QuestError, toQuestError, type QuestApi, type Session } from "../api";
import { questCommands } from "../commands";
import { isEligible, type Ctx } from "../context";
import { DAY_NAMES, T, errorText, renderInbox, renderOutbox, safe } from "../copy";
import { dropDraft, getDraft, putDraft } from "../drafts";
import { cid, isUuid, parseCid } from "../ids";
import { parseDate } from "../ui";

const ROOT = path.join(__dirname, "..", "..", "..", "..");
const QUEST_SRC = path.join(__dirname, "..");
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");

function read(file: string): string {
  return fs.readFileSync(file, "utf8");
}

function questSources(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__tests__") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) files.push(full);
    }
  };
  walk(QUEST_SRC);
  return files;
}

function questMigrations(): string {
  return fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.includes("shift_quest"))
    .map((f) => read(path.join(MIGRATIONS, f)))
    .join("\n");
}

function session(overrides: Partial<Session> = {}, settings: Partial<Session["settings"]> = {}): Session {
  return {
    member_id: "m",
    onboarded: true,
    roles: [],
    current_project_id: null,
    unread: 0,
    prefs: null,
    ...overrides,
    settings: {
      student_role_ids: [],
      awards: false,
      redemption: false,
      sharing: false,
      reminders: false,
      reward_terms: null,
      redemption_terms: null,
      ...settings,
    },
  };
}

function ctx(s: Session, roles: string[] = []): Ctx {
  return { api: {} as QuestApi, userId: "1", name: "x", memberRoleIds: roles, session: s };
}

describe("custom ids", () => {
  it("round-trips actions and arguments", () => {
    const id = cid("qa", "submit", "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f", 7);
    expect(parseCid(id)).toEqual({ action: "qa", args: ["submit", "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f", "7"] });
  });

  it("ignores other modules' components and stays under Discord's limit", () => {
    expect(parseCid("pseed:stats")).toBeNull();
    const longest = cid("rv_dec", "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f", "clarification", "1");
    expect(longest.length).toBeLessThanOrEqual(100);
    expect(() => cid("x", "a".repeat(120))).toThrow();
    expect(() => cid("x", "a|b")).toThrow();
  });

  it("recognizes uuids only", () => {
    expect(isUuid("3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f")).toBe(true);
    expect(isUuid("3f1c2a64")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });

  it("every action a component can carry has a handler", () => {
    const actions = new Set<string>();
    for (const file of questSources()) {
      for (const match of read(file).matchAll(/cid\("([a-z_]+)"/g)) actions.add(match[1]);
    }
    expect(actions.size).toBeGreaterThan(20);
    for (const action of actions) expect([action, ACTION_HANDLERS.has(action)]).toEqual([action, true]);
  });
});

describe("slash commands", () => {
  const commands = questCommands();

  it("fit Discord's limits", () => {
    expect(commands.length).toBeLessThanOrEqual(100);
    for (const command of commands) {
      expect(command.name).toMatch(/^[a-z-]{1,32}$/);
      expect(command.description.length).toBeLessThanOrEqual(100);
      expect(command.options?.length ?? 0).toBeLessThanOrEqual(25);
      expect(command.contexts).toEqual([0]); // guild only, never DMs
      for (const option of command.options ?? []) {
        expect(option.description.length).toBeLessThanOrEqual(100);
        for (const sub of ("options" in option ? option.options : undefined) ?? []) {
          expect(sub.description.length).toBeLessThanOrEqual(100);
          expect(sub.name).toMatch(/^[a-z_-]{1,32}$/);
        }
      }
    }
  });

  it("every command and subcommand has a handler", () => {
    for (const command of commands) {
      const subs = (command.options ?? []).filter((o) => o.type === 1).map((o) => `${command.name} ${o.name}`);
      const keys = subs.length ? subs : [command.name];
      for (const key of keys) expect([key, COMMAND_HANDLERS.has(key)]).toEqual([key, true]);
    }
  });

  it("hides staff commands from members by default", () => {
    for (const name of ["admin", "review", "fulfill"]) {
      expect(commands.find((c) => c.name === name)?.default_member_permissions).toBe("0");
    }
  });
});

describe("eligibility", () => {
  it("is closed until an admin names a student role", () => {
    expect(isEligible(ctx(session(), ["123"]))).toBe(false);
  });

  it("admits holders of a configured role and staff, never server permissions", () => {
    const s = session({}, { student_role_ids: ["555"] });
    expect(isEligible(ctx(s, ["555"]))).toBe(true);
    expect(isEligible(ctx(s, ["999"]))).toBe(false);
    expect(isEligible(ctx(session({ roles: ["reviewer"] }), []))).toBe(true);
  });
});

describe("interaction routing", () => {
  it("ignores other guilds and touches no database", async () => {
    const api = { call: jest.fn(), rows: jest.fn() } as unknown as QuestApi;
    const interaction = { inGuild: () => true, guildId: "other" } as never;
    await handleInteraction(api, "shift", interaction);
    expect(api.call).not.toHaveBeenCalled();
  });
});

describe("errors", () => {
  it("maps database refusals to codes and hides everything else", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const refused = toQuestError({ message: "sq:stale_revision", detail: "x" }, "shift_quest_review_decide");
    expect(refused).toBeInstanceOf(QuestError);
    expect((refused as QuestError).code).toBe("stale_revision");

    const other = toQuestError({ message: 'new row violates check, Failing row contains (secret text)', code: "23514" }, "shift_quest_submit");
    expect(other).not.toBeInstanceOf(QuestError);
    expect(other.message).not.toContain("secret");
    expect(spy.mock.calls.flat().join(" ")).not.toContain("secret");

    const busy = toQuestError({ message: "deadlock detected", code: "40P01" }, "shift_quest_redeem_cancel");
    expect((busy as QuestError).code).toBe("busy");
    expect(errorText("busy")).not.toBe(T.generic);
    spy.mockRestore();
  });

  it("has words for every code the database raises", () => {
    const codes = new Set<string>();
    for (const match of questMigrations().matchAll(/shift_quest__fail\('([a-z_]+)'\)/g)) codes.add(match[1]);
    codes.add("config_incomplete");
    expect(codes.size).toBeGreaterThan(30);
    for (const code of codes) expect([code, errorText(code) !== T.generic]).toEqual([code, true]);
  });
});

describe("copy", () => {
  it("renders every message kind the database queues", () => {
    const sql = questMigrations();
    const kinds = new Set<string>(["celebration", "recognition", "intention", "nudge", "reminder"]);
    for (const match of sql.matchAll(/shift_quest__post\(\s*[^,]+,\s*'[a-z]+',\s*'([a-z_]+)'\s*,/g)) kinds.add(match[1]);
    expect(kinds.has("review_needed")).toBe(true);
    for (const kind of kinds) {
      const rendered = renderOutbox(kind, { title: "t", summary: "s", body: "b", item: "i", revision: 1 }, "111", "222");
      expect([kind, rendered?.title.length ?? 0]).not.toEqual([kind, 0]);
      expect([rendered!.title, rendered!.body, rendered!.note].join("\n").length).toBeLessThanOrEqual(2000);
    }
    expect(renderOutbox("mystery", {}, null, null)).toBeNull();
  });

  it("renders every private notice the database writes", () => {
    const sql = questMigrations();
    const kinds = new Set<string>([
      "review_approved",
      "review_clarification",
      "review_declined",
      "help_claim",
      "help_resolve",
      "redemption_start",
      "redemption_complete",
      "redemption_cancel",
    ]);
    for (const match of sql.matchAll(/shift_quest__notify\(\s*[^,]+,\s*[^,]+,\s*'([a-z_]+)'\s*,/g)) kinds.add(match[1]);
    for (const kind of kinds) expect([kind, renderInbox(kind, { title: "t", amount: 1 })]).not.toEqual([kind, "มีอัปเดตใหม่"]);
  });

  it("only pings the people a post is about", () => {
    const post = renderOutbox("help_community", { summary: "@everyone help" }, "111", null)!;
    expect(post.mentionUserIds).toEqual(["111"]);
    expect(post.body).not.toContain("@everyone help");
    expect(renderOutbox("review_needed", { title: "x", revision: 1 }, "111", null)!.mentionUserIds).toEqual([]);
  });

  it("escapes student text and caps its length", () => {
    expect(safe("**bold**")).toBe("\\*\\*bold\\*\\*");
    expect(safe("x".repeat(500), 10)).toHaveLength(10);
  });

  it("uses no em dashes in student-facing text", () => {
    for (const file of questSources()) expect([file, read(file).includes("—")]).toEqual([file, false]);
    expect(read(path.join(MIGRATIONS, "20261111090500_shift_quests_starter_templates.sql")).includes("—")).toBe(false);
  });

  it("never claims the quest bot records voice, screens or time", () => {
    // The full agreement sits behind the ℹ️ button; the welcome card keeps the one-line promise.
    expect(T.rules(false)).toContain("ไม่นับเวลาในห้องเสียง");
    expect(T.introPromise).toContain("ไม่บันทึกเสียงหรือภาพหน้าจอ");
    expect(DAY_NAMES).toHaveLength(7);
  });
});

describe("drafts", () => {
  it("belong to their author and expire", () => {
    const key = putDraft("a", { x: 1 }, 1_000);
    expect(getDraft(key, "a", 2_000)).toEqual({ x: 1 });
    expect(getDraft(key, "b", 2_000)).toBeNull();
    expect(getDraft(key, "a", 1_000 + 31 * 60_000)).toBeNull();
    dropDraft(key);
    expect(getDraft(key, "a", 2_000)).toBeNull();
  });
});

describe("dates", () => {
  it("accepts ISO dates and empty, refuses the rest", () => {
    expect(parseDate("2026-12-01")).toBe("2026-12-01");
    expect(parseDate(null)).toBeNull();
    expect(() => parseDate("1/12/2026")).toThrow(QuestError);
  });
});

describe("the player round (schema 9)", () => {
  // Loaded lazily so this file's other suites keep their import order.
  const student = () => import("../handlers/student");

  it("tells a student about a staff award and a parent's answer, privately and without a name", () => {
    const award = renderInbox("staff_award", { amount: 3000, rule_key: "taught-next-shift", reason: "สอนเรื่อง **ทดสอบ**" });
    expect(award.split("\n")[0]).toBe("🏅 ทีมพี่เลี้ยงมอบรางวัล **สอนใน SHIFT รอบถัดไป** ให้คุณ · ได้ **3000** Passioncoin");
    expect(award).toContain("> เหตุผล: สอนเรื่อง \\*\\*ทดสอบ\\*\\*");
    expect(renderInbox("staff_award", { amount: 1000, rule_key: "helped-most" })).toContain("**ช่วยเพื่อนมากที่สุด**");
    expect(renderInbox("staff_award", { amount: 5, rule_key: "mystery" })).not.toContain("mystery");
    for (const state of ["granted", "declined", "withdrawn", undefined]) {
      const notice = renderInbox("consent_recorded", { state });
      expect(notice).not.toBe("มีอัปเดตใหม่");
      expect(notice).not.toMatch(/ลูก(?!ค้า)|น้อง|—/);
    }
    expect(renderInbox("consent_recorded", { state: "granted" })).toContain("ผู้ปกครองยินยอมแล้ว");
  });

  it("names staff awards in the coin history by rule key, or by being an award with no title on /admin ledger", async () => {
    const { ledgerReason } = await student();
    expect(ledgerReason("award", "สอนใน SHIFT", null, null, "taught-next-shift")).toBe("🏅 รางวัลจากทีมงาน สอนใน SHIFT รอบถัดไป: สอนใน SHIFT");
    expect(ledgerReason("award", "ช่วยสามทีม", null, null, "helped-most")).toBe("🏅 รางวัลจากทีมงาน ช่วยเพื่อนมากที่สุด: ช่วยสามทีม");
    expect(ledgerReason("award", "ช่วยสามทีม", null)).toBe("🏅 รางวัลจากทีมงาน: ช่วยสามทีม");
    expect(ledgerReason("award", "quest_award", "แอป", null, "main-quest")).toBe("ได้จากเควสต์: แอป");
    expect(ledgerReason("award", "quest_award", null)).toBe("ได้จากเควสต์");
    expect(ledgerReason("award", "season_unlock", null, null, "main-quest")).toBe("ปลดล็อกของซีซัน");
  });

  it("shows why a shop item is locked and keeps its confirm button off", async () => {
    const { lockText } = await student();
    expect(lockText({ locked: "consent" })).toBe(T.rewardsLock.consent);
    expect(lockText({ locked: "stage", min_stage: 5 })).toBe("แลกได้เมื่อต้นไม้ของทีมถึงขั้น 5");
    expect(lockText({ locked: "community", min_stage: 5 })).toBe(T.rewardsLock.community);
    expect(lockText({ locked: null })).toBeNull();
    expect(lockText({})).toBeNull();
    for (const text of [T.rewardsLock.consent, T.rewardsLock.stage(6), T.rewardsLock.community]) {
      expect(text).not.toMatch(/—|น้อง|ลูก(?!ค้า)/);
    }

    const item = { id: "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f", name: "มัทฉะ", description: "ชาเขียว", cost: 8000, in_stock: true };
    const catalog = (locked: string | null) => ({
      live: true,
      terms: null,
      balance: 9000,
      items: [{ ...item, min_stage: 5, requires_community: true, locked, affordable: true }],
      mine: [],
    });
    const sentFor = async (locked: string | null) => {
      const sent: { components?: unknown[] }[] = [];
      const api = { call: jest.fn(async () => catalog(locked)), rows: jest.fn() } as unknown as QuestApi;
      const ctx = {
        api,
        userId: "1111111111",
        name: "x",
        memberRoleIds: ["555"],
        session: session({}, { student_role_ids: ["555"], redemption: true }),
      } as unknown as Ctx;
      const i = {
        id: "222222222222222222",
        isButton: () => false,
        isStringSelectMenu: () => true,
        isModalSubmit: () => false,
        isChatInputCommand: () => false,
        isMessageComponent: () => true,
        values: [item.id],
        customId: "sq|rw_pick",
        update: async (p: { components?: unknown[] }) => sent.push(p),
        reply: async (p: { components?: unknown[] }) => sent.push(p),
      };
      await ACTION_HANDLERS.get("rw_pick")!(i as never, ctx, []);
      const text = JSON.stringify(sent[0]);
      const go = (JSON.parse(text).components as unknown[]).flatMap(function walk(c: unknown): { custom_id?: string; disabled?: boolean }[] {
        const node = c as { custom_id?: string; components?: unknown[] };
        return [node, ...(node.components ?? []).flatMap(walk)];
      }).find((c) => c.custom_id?.startsWith("sq|rw_go|"));
      return { text, disabled: go?.disabled };
    };
    const locked = await sentFor("stage");
    expect(locked.text).toContain(`${T.rewardsLocked}: แลกได้เมื่อต้นไม้ของทีมถึงขั้น 5`);
    expect(locked.disabled).toBe(true);
    const open = await sentFor(null);
    expect(open.text).not.toContain(T.rewardsLocked);
    expect(open.disabled).toBe(false);
  });
});
