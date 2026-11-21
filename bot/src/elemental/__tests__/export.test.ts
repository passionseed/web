/**
 * @jest-environment node
 */
import { ApplicationCommandOptionType, MessageFlags, type Client } from "discord.js";

import { ElementalError, type ElementalApi } from "../api";
import { createEvents, createSettingsCache, type ElementalRuntime } from "../context";
import { COMMON } from "../copy/common";
import { EXPORT_COPY } from "../copy/export";
import { COLUMNS, SUB, csvField, feature, fileName, readHandin, toCsv, type IslandRow } from "../features/export";
import { handleElementalInteraction } from "../index";
import { createKeyedQueue } from "../queue";
import { buildRegistry, registry } from "../registry";

// ---------------------------------------------------------------------------
// Fixtures: made-up snowflakes and uuids only, no names.
// ---------------------------------------------------------------------------

const GUILD = "100000000000000001";
const HOST = "210000000000000001";
const OTHER = "210000000000000002";
const ROLE = {
  host: "300000000000000001",
  helper: "300000000000000002",
  mentor: "300000000000000003",
  judge: "300000000000000004",
  safety: "300000000000000005",
  paid: "300000000000000006",
};
const MEMBER_A = "220000000000000001";
const MEMBER_B = "220000000000000002";
const CHANNEL = "400000000000000009";
const OWNER = "aaaaaaaa-0000-4000-8000-00000000000a";
const BOARD = "bbbbbbbb-0000-4000-8000-00000000000b";

const team = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function rawSettings(): Record<string, unknown> {
  return { guild_id: GUILD, edition: "elemental-dryrun", edition_kind: "rehearsal", roles: ROLE, channels: {} };
}

/** What island_state returns, plus fields a careless export might copy (it must not). */
type FakeIsland = IslandRow & Record<string, unknown>;

interface FakeHandin {
  url: string;
  late: boolean;
}

/** A fake of the two read functions the export uses, with every extra field the real ones carry. */
class FakeDb {
  island: FakeIsland[] = [];
  handins = new Map<string, FakeHandin>();
  /** canvas_target raises this for every team (a database outage). */
  targetError: Error | null = null;
  calls: string[] = [];

  api(): ElementalApi {
    return {
      call: async <T>(fn: string, ...args: unknown[]): Promise<T> => {
        this.calls.push(fn);
        if (fn === "elemental_bot_settings_get") return rawSettings() as T;
        if (fn === "elemental_bot_canvas_target") {
          expect(args[0]).toBe(GUILD);
          if (this.targetError) throw this.targetError;
          const id = String(args[1]);
          const h = this.handins.get(id);
          if (!h) throw new ElementalError("entry_not_found", undefined, fn);
          const row = this.island.find((t) => t.team_id === id)!;
          return {
            entry_id: id,
            kind: "ship",
            source: "handin",
            team_id: id,
            slot: row.slot,
            element: row.element,
            project_name: row.project_name,
            live: true,
            removed: false,
            canvas_status: null,
            fields: { url: h.url, at: "2026-12-07T15:30:00.000Z", late: h.late },
            note_ids: { rect: `el-${id}-r`, text: `el-${id}-t` },
            linked: true,
            board_id: BOARD,
            frame_id: "frame-1",
            owner_id: OWNER,
            nearby: [{ id: "x", customData: { createdBy: OWNER } }],
          } as T;
        }
        throw new Error(`unexpected call ${fn}`);
      },
      rows: async <T>(fn: string, ...args: unknown[]): Promise<T[]> => {
        this.calls.push(fn);
        if (fn === "elemental_bot_island_state") {
          expect(args).toEqual(["elemental-dryrun"]);
          return this.island as T[];
        }
        throw new Error(`unexpected rows ${fn}`);
      },
    };
  }
}

function setup() {
  const db = new FakeDb();
  const api = db.api();
  const rt: ElementalRuntime = {
    client: {} as Client,
    api,
    env: { guildIds: [GUILD], databaseUrl: "postgresql://stub", cardUrl: null, cardSecret: null },
    settings: createSettingsCache(api),
    queues: {
      channels: createKeyedQueue("channels", { sleep: async () => undefined }),
      canvas: createKeyedQueue("canvas", { sleep: async () => undefined }),
    },
    events: createEvents(),
    connected: () => true,
  };
  return { db, rt };
}

function seed(db: FakeDb) {
  db.island = [
    // Out of slot order on purpose; extra fields a sloppy export would leak.
    {
      team_id: team(2),
      slot: 7,
      element: "fire",
      project_name: "ถังแยกขยะ, รุ่น 2",
      status: "active",
      counted: 10,
      lit: true,
      badges: ["voice"],
      member_ids: [MEMBER_A, MEMBER_B],
      channel_id: CHANNEL,
    },
    { team_id: team(1), slot: 3, element: "water", project_name: "Water map", status: "active", counted: 2, lit: true, badges: [] },
    { team_id: team(3), slot: 12, element: "aether", project_name: '=HYPERLINK("x")', status: "channel_pending", counted: 0, lit: false, badges: [] },
  ];
  db.handins.set(team(1), { url: "https://youtu.be/abc123", late: false });
  db.handins.set(team(2), { url: "https://drive.google.com/file/d/xyz/view?usp=sharing,1", late: true });
}

// ---------------------------------------------------------------------------
// A minimal Discord interaction.
// ---------------------------------------------------------------------------

function interaction(o: { user?: string; roles?: string[] } = {}) {
  const sent: { how: string; payload: unknown }[] = [];
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: "400000000000000001",
    user: { id: o.user ?? HOST },
    member: { roles: o.roles ?? [ROLE.host] },
    commandName: "el",
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
      getSubcommand: () => SUB,
      getString: () => null,
      getInteger: () => null,
      getUser: () => null,
    },
    deferReply: jest.fn(async (p: unknown) => {
      i.deferred = true;
      sent.push({ how: "deferReply", payload: p });
    }),
    deferUpdate: jest.fn(async () => {
      i.deferred = true;
    }),
    reply: jest.fn(async (p: unknown) => {
      i.replied = true;
      sent.push({ how: "reply", payload: p });
    }),
    editReply: jest.fn(async (p: unknown) => {
      i.replied = true;
      sent.push({ how: "editReply", payload: p });
    }),
    followUp: jest.fn(async (p: unknown) => {
      sent.push({ how: "followUp", payload: p });
    }),
    deleteReply: jest.fn(async () => undefined),
  };
  return { i: i as never, sent };
}

const reg = buildRegistry([feature]);

interface Sent {
  content?: string;
  files?: { attachment: Buffer; name: string }[];
}

async function runExport(rt: ElementalRuntime, o: { user?: string; roles?: string[] } = {}) {
  const made = interaction(o);
  await handleElementalInteraction(rt, made.i, reg);
  const answers = made.sent.filter((s) => s.how !== "deferReply");
  const lastAnswer = (answers.at(-1)?.payload ?? {}) as Sent;
  const file = lastAnswer.files?.[0];
  return { ...made, answer: lastAnswer, file, csv: file ? file.attachment.toString("utf8") : null };
}

/** A small RFC 4180 reader, so the test checks the file the way a spreadsheet reads it. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let k = 0; k < text.length; k++) {
    const ch = text[k];
    if (quoted) {
      if (ch === '"' && text[k + 1] === '"') {
        field += '"';
        k++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r" && text[k + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      k++;
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  errorSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("registration", () => {
  test("/el export sits in the real registry, Host only, ephemeral, no options", () => {
    const el = registry().commands.find((c) => c.name === "el")!;
    const sub = (el.options ?? []).find((o) => o.name === SUB);
    expect(sub).toMatchObject({ type: ApplicationCommandOptionType.Subcommand, name: "export" });
    expect((sub as { options?: unknown[] }).options ?? []).toHaveLength(0);
    expect(sub!.description.length).toBeLessThanOrEqual(100);
    const handler = registry().commandHandlers.get("el export")!;
    expect(handler.gate).toEqual(["host"]);
    expect(handler.ack ?? "ephemeral").toBe("ephemeral");
  });
});

// ---------------------------------------------------------------------------
// The file
// ---------------------------------------------------------------------------

describe("/el export", () => {
  test("the header is exactly the Teams-tab columns, in order", async () => {
    const { db, rt } = setup();
    seed(db);
    const { csv } = await runExport(rt);
    expect(csv).not.toBeNull();
    expect(csv!.startsWith("﻿")).toBe(true);
    const firstLine = csv!.slice(1).split("\r\n")[0];
    expect(firstLine).toBe("team_id,slot,project,element,counted_testers,handin_url,handin_late");
    expect([...COLUMNS]).toEqual(["team_id", "slot", "project", "element", "counted_testers", "handin_url", "handin_late"]);
  });

  test("one row per live team, by slot, with testers and hand-in state", async () => {
    const { db, rt } = setup();
    seed(db);
    const { csv, answer, file, sent } = await runExport(rt);
    expect(sent[0]).toEqual({ how: "deferReply", payload: { flags: MessageFlags.Ephemeral } });
    expect(file!.name).toMatch(/^elemental-teams-elemental-dryrun-\d{8}-\d{4}\.csv$/);
    expect(answer.content).toBe(EXPORT_COPY.ready({ teams: 3, handins: 2, late: 1, edition: "elemental-dryrun" }));

    const rows = parseCsv(csv!.slice(1));
    expect(rows).toEqual([
      [...COLUMNS],
      [team(1), "3", "Water map", "water", "2", "https://youtu.be/abc123", "false"],
      [team(2), "7", "ถังแยกขยะ, รุ่น 2", "fire", "10", "https://drive.google.com/file/d/xyz/view?usp=sharing,1", "true"],
      // No hand-in: both hand-in cells empty, never "false" (on time). A formula is defused.
      [team(3), "12", `'=HYPERLINK("x")`, "aether", "0", "", ""],
    ]);
  });

  test("no member fields: no Discord ids, owner ids, boards or extra columns reach the file", async () => {
    const { db, rt } = setup();
    seed(db);
    const { csv } = await runExport(rt);
    for (const leak of [MEMBER_A, MEMBER_B, CHANNEL, OWNER, BOARD, HOST, "frame-1", "voice", "member", "owner", "channel", "discord"]) {
      expect(csv).not.toContain(leak);
    }
    for (const row of parseCsv(csv!.slice(1))) expect(row).toHaveLength(COLUMNS.length);
  });

  test("no live team: a header-only file and the empty line", async () => {
    const { rt } = setup();
    const { csv, answer } = await runExport(rt);
    expect(answer.content).toBe(EXPORT_COPY.empty);
    expect(parseCsv(csv!.slice(1))).toEqual([[...COLUMNS]]);
  });

  test("a database failure on a hand-in read sends no file, only the error line", async () => {
    const { db, rt } = setup();
    seed(db);
    db.targetError = new ElementalError("busy");
    const { sent } = await runExport(rt);
    const answers = sent.filter((s) => s.how !== "deferReply");
    expect(answers.some((s) => (s.payload as Sent).files)).toBe(false);
    expect((answers.at(-1)!.payload as Sent).content).toBe(COMMON.busy);
  });
});

// ---------------------------------------------------------------------------
// The Host gate
// ---------------------------------------------------------------------------

describe("the Host gate", () => {
  test.each([
    ["judge", [ROLE.judge]],
    ["helper", [ROLE.helper]],
    ["mentor", [ROLE.mentor]],
    ["safety", [ROLE.safety]],
    ["judge and helper", [ROLE.judge, ROLE.helper]],
    ["paid student", [ROLE.paid]],
    ["no role", []],
  ])("%s is refused ephemerally and nothing is read", async (_label, roles) => {
    const { db, rt } = setup();
    seed(db);
    const { sent, file } = await runExport(rt, { user: OTHER, roles });
    expect(sent[0]).toEqual({ how: "deferReply", payload: { flags: MessageFlags.Ephemeral } });
    expect(file).toBeUndefined();
    const answers = sent.filter((s) => s.how !== "deferReply");
    expect((answers.at(-1)!.payload as Sent).content).toBe(COMMON.staffOnly);
    expect(db.calls.filter((fn) => fn !== "elemental_bot_settings_get")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

describe("pieces", () => {
  test("readHandin: none on entry_not_found, other errors thrown", async () => {
    const api: ElementalApi = {
      call: jest.fn(async () => {
        throw new ElementalError("entry_not_found");
      }) as ElementalApi["call"],
      rows: jest.fn() as ElementalApi["rows"],
    };
    await expect(readHandin(api, GUILD, team(1))).resolves.toBeNull();
    (api.call as jest.Mock).mockRejectedValueOnce(new ElementalError("unknown_guild"));
    await expect(readHandin(api, GUILD, team(1))).rejects.toMatchObject({ code: "unknown_guild" });
    (api.call as jest.Mock).mockResolvedValueOnce({ kind: "test", fields: { who: "x" } });
    await expect(readHandin(api, GUILD, team(1))).resolves.toBeNull();
  });

  test("csvField quotes commas, quotes and new lines, and defuses formulas", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(5)).toBe("5");
    expect(csvField(true)).toBe("true");
    expect(csvField("plain")).toBe("plain");
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("one\r\ntwo")).toBe('"one\ntwo"');
    expect(csvField("=1+1")).toBe("'=1+1");
    expect(csvField("+66")).toBe("'+66");
    expect(csvField("-x")).toBe("'-x");
    expect(csvField("@cmd")).toBe("'@cmd");
    expect(csvField("=a,b")).toBe(`"'=a,b"`);
  });

  test("toCsv: BOM, CRLF, a trailing line end", () => {
    const out = toCsv([]);
    expect(out).toBe(`﻿${COLUMNS.join(",")}\r\n`);
  });

  test("fileName uses Bangkok time and a safe edition", () => {
    // 2026-12-07 16:05 UTC is 23:05 in Bangkok.
    expect(fileName("elemental-2026", new Date(Date.UTC(2026, 11, 7, 16, 5)))).toBe("elemental-teams-elemental-2026-20261207-2305.csv");
    expect(fileName("../Odd Key", new Date(Date.UTC(2026, 11, 7, 16, 5)))).toBe("elemental-teams-odd-key-20261207-2305.csv");
  });
});
