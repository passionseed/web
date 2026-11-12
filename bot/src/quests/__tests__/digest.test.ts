/**
 * @jest-environment node
 */
import { ChannelType, MessageFlags, type Client } from "discord.js";

import { QuestDbError, QuestError, type QuestApi } from "../api";
import { DIGEST_SCHEMA, digestFor, digestLines, digestView, normalizeDigestPost, startDigestPost, type DigestPost, type DigestPostData } from "../digest";
import { DIGEST } from "../digestCopy";
import { renderView } from "../view";
import { bodyText, customIds, viewText } from "../test-helpers/view";

const GUILD = "100000000000000001";
const LIVE_CH = "200000000000000010";
const OTHER_GUILD_CH = "200000000000000099";
const DAY = "2026-11-12";
const WEB = "https://www.passionseed.org/shift/island";

function post(over: Partial<DigestPostData> = {}): DigestPostData {
  return {
    day: DAY,
    kind: "day",
    channel_id: LIVE_CH,
    entries: [
      { slot: 2, name: "เกมฝึกภาษา", summary: "ทีมทดสอบต้นแบบกับผู้ใช้ 5 คน" },
      { slot: 5, name: "ร้านขนม", summary: "ทีมส่งเควสต์คุยกับลูกค้าจริง" },
    ],
    ...over,
  };
}

const savedEnv = { island: process.env.SHIFT_ISLAND_URL, site: process.env.NEXT_PUBLIC_SITE_URL };

beforeEach(() => {
  process.env.SHIFT_ISLAND_URL = WEB;
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  for (const [key, value] of [
    ["SHIFT_ISLAND_URL", savedEnv.island],
    ["NEXT_PUBLIC_SITE_URL", savedEnv.site],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

// ---------------------------------------------------------------------------
// The post
// ---------------------------------------------------------------------------

describe("normalizeDigestPost", () => {
  it("keeps teams with a slot, a name and a summary, in plot order", () => {
    const d = normalizeDigestPost({
      day: DAY,
      kind: "day",
      channel_id: LIVE_CH,
      entries: [
        { slot: 5, name: " ร้านขนม ", summary: "ทีมส่งเควสต์" },
        { slot: 2, name: "เกม", summary: "ทีมทดสอบ" },
        { slot: 0, name: "x", summary: "y" },
        { slot: 3, name: "", summary: "y" },
        { slot: 4, name: "x", summary: "  " },
        "junk",
      ],
    });
    expect(d).toEqual({
      day: DAY,
      kind: "day",
      channel_id: LIVE_CH,
      entries: [
        { slot: 2, name: "เกม", summary: "ทีมทดสอบ" },
        { slot: 5, name: "ร้านขนม", summary: "ทีมส่งเควสต์" },
      ],
    });
  });

  it.each([
    ["null", null],
    ["no teams", { ...post(), entries: [] }],
    ["a bad day", { ...post(), day: "today" }],
    ["a channel that is not a snowflake", { ...post(), channel_id: "#live" }],
  ])("is null for %s", (_label, raw) => {
    expect(normalizeDigestPost(raw)).toBeNull();
  });

  it("reads the weekly recap", () => {
    expect(normalizeDigestPost(post({ kind: "week" }))?.kind).toBe("week");
  });
});

describe("digestView", () => {
  it("is one card with the AI title, a line per team, the fine print and the web island link", () => {
    const p = renderView(digestView(post(), WEB), { ephemeral: false });
    expect(p.flags).toBe(MessageFlags.IsComponentsV2);
    expect(p.allowedMentions).toEqual({ parse: [] });
    const body = bodyText(p);
    expect(body).toContain(DIGEST.title);
    expect(body).toContain("สรุปโดย AI");
    expect(body).toContain("แปลง 2 เกมฝึกภาษา: ทีมทดสอบต้นแบบกับผู้ใช้ 5 คน\nแปลง 5 ร้านขนม: ทีมส่งเควสต์คุยกับลูกค้าจริง");
    expect(body).toContain(DIGEST.fine);
    expect(viewText(p)).toContain("เปิดเกาะบนเว็บ");
    // A link button only: nothing a student can press that posts.
    expect(customIds(p)).toEqual([]);
  });

  it("uses the weekly title for the Sunday recap", () => {
    expect(bodyText(renderView(digestView(post({ kind: "week" }), WEB), { ephemeral: false }))).toContain(DIGEST.weekTitle);
  });

  it("has no button without a web address", () => {
    const p = renderView(digestView(post(), null), { ephemeral: false });
    expect(viewText(p)).not.toContain("เปิดเกาะบนเว็บ");
  });

  it("never pings: mentions in a team name or summary are defused and nothing may be parsed", () => {
    const p = renderView(
      digestView(post({ entries: [{ slot: 1, name: "@everyone", summary: "<@123456789012345678> ทีมทดสอบ @here" }] }), WEB),
      { ephemeral: false }
    );
    expect(p.allowedMentions).toEqual({ parse: [] });
    expect(bodyText(p)).not.toMatch(/(^|[^​])@(everyone|here)|<@\d/);
  });

  it("cuts the list when it runs out of room and says how many more are on the web", () => {
    const entries = Array.from({ length: 40 }, (_, i) => ({ slot: i + 1, name: `ทีม ${i + 1}`, summary: "ก".repeat(200) }));
    const lines = digestLines(entries);
    expect(lines.length).toBeLessThan(40);
    expect(lines[lines.length - 1]).toBe(DIGEST.more(40 - (lines.length - 1)));
    expect(lines.join("\n").length).toBeLessThanOrEqual(3300);
  });
});

describe("digest copy", () => {
  const strings = [DIGEST.title, DIGEST.weekTitle, DIGEST.fine, DIGEST.line(3, "ทีม", "สรุป"), DIGEST.more(4)];

  it.each(strings)("%s has no em dash, emoji or markdown and never talks down", (text) => {
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\*\*|__|`|^#/);
    expect(text).not.toMatch(/น้อง|ลูก(?!ค้า)|เด็ก/);
  });

  it("labels every post as written by AI", () => {
    expect(DIGEST.title).toContain("AI");
    expect(DIGEST.weekTitle).toContain("AI");
    expect(DIGEST.line(3, "ร้านขนม", "ทีมส่งเควสต์")).toBe("แปลง 3 ร้านขนม: ทีมส่งเควสต์");
  });
});

// ---------------------------------------------------------------------------
// The poster
// ---------------------------------------------------------------------------

describe("digestFor", () => {
  it("starts nothing below schema 9", () => {
    const start = jest.fn();
    expect(DIGEST_SCHEMA).toBe(9);
    expect(digestFor(8, start)).toBeNull();
    expect(start).not.toHaveBeenCalled();
  });

  it("starts the post from schema 9", () => {
    const started = { poll: jest.fn(), stop: jest.fn() } as unknown as DigestPost;
    expect(digestFor(9, () => started)).toBe(started);
    expect(digestFor(10, () => started)).toBe(started);
  });
});

interface FakeMessage {
  id: string;
  payload: { allowedMentions?: unknown; components?: unknown[] };
  components: unknown[];
  author: { id: string };
  delete: jest.Mock;
  edit: jest.Mock;
}

const BOT_ID = "300000000000000001";

function fakeChannel(id: string, over: Record<string, unknown> = {}) {
  const sent: FakeMessage[] = [];
  let next = 1;
  const make = (payload: FakeMessage["payload"], author = BOT_ID): FakeMessage => {
    const m: FakeMessage = {
      id: `90000000000000000${next++}`,
      payload,
      // As discord.js gives it back: the components as JSON.
      components: JSON.parse(JSON.stringify(payload.components ?? [])),
      author: { id: author },
      delete: jest.fn(async () => undefined),
      edit: jest.fn(async (p: FakeMessage["payload"]) => {
        m.payload = p;
        m.components = JSON.parse(JSON.stringify(p.components ?? []));
        return m;
      }),
    };
    return m;
  };
  const channel = {
    id,
    type: ChannelType.GuildText,
    guildId: GUILD,
    send: jest.fn(async (payload: FakeMessage["payload"]) => {
      const m = make(payload);
      sent.push(m);
      return m;
    }),
    messages: {
      fetch: jest.fn(async (arg: unknown) => {
        if (typeof arg === "string") {
          const found = sent.find((m) => m.id === arg);
          if (!found) throw new Error("unknown message");
          return found;
        }
        return new Map(sent.map((m) => [m.id, m]));
      }),
    },
    ...over,
  };
  return { channel, sent, make };
}

/**
 * shift_quest_digest_post_next, _claim, _mark and _post_current as the
 * database answers them: compare-and-set, a claim that is "new" once, and
 * the posted message with the teams eligible now (db.current).
 */
function fakeDb(answer: DigestPostData | null) {
  const db = {
    answer: answer as unknown,
    stored: null as string | null,
    markError: null as Error | null,
    /** Runs inside digest_mark before it decides: another process recording first. */
    beforeMark: null as null | (() => void),
    /** The claim's answer: "new" the first time, then null (claimed). */
    claim: "new" as string | null,
    /** The entries the posted message should show now; null: as posted. */
    current: null as DigestPostData["entries"] | null,
    calls: [] as unknown[][],
  };
  const call = jest.fn(async (fn: string, ...args: unknown[]) => {
    db.calls.push([fn, ...args]);
    if (fn === "shift_quest_digest_post_next") return db.stored ? null : db.answer;
    if (fn === "shift_quest_digest_claim") {
      const answer = db.claim;
      if (answer === "new") db.claim = null;
      return answer;
    }
    if (fn === "shift_quest_digest_mark") {
      if (db.markError) throw db.markError;
      db.beforeMark?.();
      if (!db.stored) db.stored = args[2] as string;
      return db.stored;
    }
    if (fn === "shift_quest_digest_post_current") {
      const a = db.answer as DigestPostData | null;
      if (!db.stored || !a) return [];
      return [{ ...a, message_id: db.stored, entries: db.current ?? a.entries }];
    }
    return null;
  });
  return { db, api: { call, rows: jest.fn() } as unknown as QuestApi };
}

const posters: DigestPost[] = [];

function world(answer: DigestPostData | null = post(), channels: Record<string, unknown> = {}) {
  const { db, api } = fakeDb(answer);
  const live = fakeChannel(LIVE_CH);
  const all = new Map<string, unknown>([[LIVE_CH, live.channel], ...Object.entries(channels)]);
  const client = {
    user: { id: BOT_ID },
    channels: {
      fetch: jest.fn(async (id: string) => all.get(id) ?? null),
    },
  };
  const state = { connected: true };
  const poster = startDigestPost(client as unknown as Client, api, { guildId: GUILD, connected: () => state.connected });
  posters.push(poster);
  return { db, api, live, client, state, poster };
}

const fnCalls = (w: ReturnType<typeof world>, fn: string) => w.db.calls.filter((c) => c[0] === fn);

afterEach(async () => {
  while (posters.length) await posters.pop()!.stop();
});

describe("startDigestPost", () => {
  it("posts once to the channel the database names, pinging nobody, then records it", async () => {
    const w = world();
    await w.poster.poll();
    expect(w.client.channels.fetch).toHaveBeenCalledWith(LIVE_CH);
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    expect(w.live.sent[0].payload.allowedMentions).toEqual({ parse: [] });
    expect(fnCalls(w, "shift_quest_digest_claim")).toEqual([["shift_quest_digest_claim", DAY, LIVE_CH, "day"]]);
    expect(fnCalls(w, "shift_quest_digest_mark")).toEqual([["shift_quest_digest_mark", DAY, LIVE_CH, w.live.sent[0].id]]);
    expect(w.live.sent[0].delete).not.toHaveBeenCalled();
    expect(JSON.stringify(w.live.sent[0].components)).toContain(DIGEST.dayLine(DAY));

    // The day is recorded: later checks post nothing, and the post is not edited while its teams are the same.
    await w.poster.poll();
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    expect(w.live.sent[0].edit).not.toHaveBeenCalled();
  });

  it("sends nothing when another process holds a fresh claim on the day", async () => {
    const w = world();
    w.db.claim = null;
    await w.poster.poll();
    expect(w.live.channel.send).not.toHaveBeenCalled();
    expect(fnCalls(w, "shift_quest_digest_mark")).toEqual([]);
  });

  it("on a stale claim, records its own earlier post of the day instead of posting again", async () => {
    const w = world();
    // A process sent the post, then stopped before the mark.
    const earlier = w.live.make(renderView(digestView(post(), WEB), { ephemeral: false }) as never);
    w.live.sent.push(earlier);
    // Someone else's message in the channel does not count.
    w.live.sent.push(w.live.make(renderView(digestView(post(), WEB), { ephemeral: false }) as never, "300000000000000999"));
    w.db.claim = "stale";
    await w.poster.poll();
    expect(w.live.channel.send).not.toHaveBeenCalled();
    expect(fnCalls(w, "shift_quest_digest_mark")).toEqual([["shift_quest_digest_mark", DAY, LIVE_CH, earlier.id]]);
  });

  it("on a stale claim with no earlier post found, posts once", async () => {
    const w = world();
    w.db.claim = "stale";
    await w.poster.poll();
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    expect(w.db.stored).toBe(w.live.sent[0].id);
  });

  it("edits the posted message when a team leaves the news, and takes it down when none is left", async () => {
    const w = world();
    await w.poster.poll();
    const posted = w.live.sent[0];
    w.db.current = [post().entries[1]];
    await w.poster.poll();
    expect(posted.edit).toHaveBeenCalledTimes(1);
    const after = JSON.stringify(posted.components);
    expect(after).not.toContain("เกมฝึกภาษา");
    expect(after).toContain("ร้านขนม");
    await w.poster.poll();
    expect(posted.edit).toHaveBeenCalledTimes(1);

    w.db.current = [];
    await w.poster.poll();
    expect(posted.edit).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(posted.components)).toContain(DIGEST.removed);
    expect(JSON.stringify(posted.components)).not.toContain("ร้านขนม");
  });

  it("does nothing when the database has nothing to post", async () => {
    const w = world(null);
    await w.poster.poll();
    expect(w.client.channels.fetch).not.toHaveBeenCalled();
    expect(fnCalls(w, "shift_quest_digest_mark")).toEqual([]);
  });

  it("does nothing while the gateway is disconnected", async () => {
    const w = world();
    w.state.connected = false;
    await w.poster.poll();
    expect(w.db.calls).toEqual([]);
  });

  it("deletes its own message when another process recorded today's post first", async () => {
    const w = world();
    w.db.beforeMark = () => {
      w.db.stored = "900000000000000777";
    };
    await w.poster.poll();
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    expect(w.live.sent[0].delete).toHaveBeenCalledTimes(1);
  });

  it("retries a failed mark before anything else, so the day is neither posted twice nor lost", async () => {
    const w = world();
    w.db.markError = new QuestDbError("shift_quest_digest_mark", "08006");
    await w.poster.poll();
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    expect(w.live.sent[0].delete).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("SQLSTATE 08006"));

    // Still failing: no second post.
    await w.poster.poll();
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    expect(fnCalls(w, "shift_quest_digest_post_next")).toHaveLength(1);

    // Back: the same message is recorded and kept.
    w.db.markError = null;
    await w.poster.poll();
    expect(w.db.stored).toBe(w.live.sent[0].id);
    expect(w.live.sent[0].delete).not.toHaveBeenCalled();
    expect(fnCalls(w, "shift_quest_digest_mark").map((c) => c[3])).toEqual([w.live.sent[0].id, w.live.sent[0].id, w.live.sent[0].id]);

    await w.poster.poll();
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
  });

  it("takes its message back when the database refuses the mark", async () => {
    const w = world();
    w.db.markError = new QuestError("bad_input");
    await w.poster.poll();
    expect(w.live.sent[0].delete).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a channel of another server", { guildId: "100000000000000002" }],
    ["a forum", { type: ChannelType.GuildForum }],
    ["a DM", { type: ChannelType.DM, guildId: undefined }],
  ])("never posts to %s and warns once", async (_label, over) => {
    const other = fakeChannel(OTHER_GUILD_CH, over);
    const w = world(post({ channel_id: OTHER_GUILD_CH }), { [OTHER_GUILD_CH]: other.channel });
    await w.poster.poll();
    await w.poster.poll();
    expect(other.channel.send).not.toHaveBeenCalled();
    expect(fnCalls(w, "shift_quest_digest_mark")).toEqual([]);
    expect((console.warn as jest.Mock).mock.calls).toHaveLength(1);
  });

  it("logs a database failure by code only and tries again next time", async () => {
    const w = world();
    (w.api.call as jest.Mock).mockRejectedValueOnce(new QuestDbError("shift_quest_digest_post_next", "42883"));
    await w.poster.poll();
    expect(w.live.channel.send).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("SQLSTATE 42883"));
    await w.poster.poll();
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
  });

  it("posts nothing after stop", async () => {
    const w = world();
    await w.poster.stop();
    await w.poster.poll();
    expect(w.db.calls).toEqual([]);
  });
});
