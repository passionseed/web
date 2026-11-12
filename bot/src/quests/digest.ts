import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, DiscordAPIError, type Client, type Message } from "discord.js";

import { QuestDbError, QuestError, type QuestApi } from "./api";
import { safePost } from "./copy";
import { DIGEST } from "./digestCopy";
import { renderView, type Block, type View } from "./view";
import { ISLAND_LINK_LABEL, islandWebUrl } from "./weblink";

/**
 * The daily island news post (ข่าวเกาะ): one message a day in the live
 * channel (the celebrate channel when no live channel is set), listing the
 * AI summaries the website's daily job stored for teams that chose to show
 * their name and consented. A group channel only: never a DM, never a ping.
 *
 * Everything comes from shift_quest_digest_post_next() (20261111095000,
 * schema 9), which answers only while digest_enabled is on, a channel is
 * set and today's post is not out yet, and lists only teams eligible right
 * now with a stored summary. The bot never sees members, never calls a
 * model, and never imports the website's AI code.
 *
 * Once a day, without doubles: before sending, the bot claims the day
 * (shift_quest_digest_claim); after sending, the message id is stored with
 * shift_quest_digest_mark(day, channel, message), a compare-and-set. When two
 * bot processes overlap (a deploy) and both post, the one whose id did not
 * win deletes its own message. When the mark itself fails, nothing new is
 * posted: the next check (5 minutes later) tries the same mark again first.
 * When a process stops between send and mark, the claim goes stale after 15
 * minutes: the next process looks through the channel's latest messages for
 * its own post of that day (the date line) and records it, sending only when
 * there is none. So the day is neither posted twice nor lost.
 *
 * Kept true afterwards: every check also reads the posts of the last 7 days
 * as they should read now (shift_quest_digest_post_current) and edits a
 * message whose teams changed: staff hid a team, a parent withdrew, or a
 * member stopped showing the name. A post with no team left says it was
 * taken down.
 */

/** The island schema that adds the digest functions (20261111095000_shift_quest_player.sql). */
export const DIGEST_SCHEMA = 9;

/** One check every 5 minutes: the post goes out within minutes of the evening job. */
const TICK_MS = 5 * 60_000;
/** After start: lets the gateway connect before the first check. */
const FIRST_DELAY_MS = 30_000;
/**
 * Room for team lines in one card (Discord allows 4000 characters of text);
 * the title, the "more" line and the fine print fit in the rest.
 */
const LINES_BUDGET = 3200;
/** A team name or summary is never longer than this in the post. */
const MAX_NAME = 60;
const MAX_SUMMARY = 300;

const SNOWFLAKE = /^[0-9]{5,25}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface DigestPostEntry {
  slot: number;
  name: string;
  summary: string;
}

export interface DigestPostData {
  day: string;
  kind: "day" | "week";
  channel_id: string;
  entries: DigestPostEntry[];
}

/** A digest message already in Discord, as it should read now. */
export interface PostedDigest extends DigestPostData {
  message_id: string;
}

export interface DigestPost {
  stop(): Promise<void>;
  /** One check now (tests, and the timer). Never throws: failures are logged by code. */
  poll(): Promise<void>;
}

/** The database's answer with every field checked; null when there is nothing to post. */
export function normalizeDigestPost(raw: unknown): DigestPostData | null {
  const head = headOf(raw);
  if (!head) return null;
  const entries = entriesOf((raw as Record<string, unknown>).entries);
  if (entries.length === 0) return null;
  return { ...head, entries };
}

/** The day, kind and channel of a post, checked; null when any is missing. */
function headOf(raw: unknown): Omit<DigestPostData, "entries"> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.day !== "string" || !DAY.test(r.day)) return null;
  if (typeof r.channel_id !== "string" || !SNOWFLAKE.test(r.channel_id)) return null;
  return { day: r.day, kind: r.kind === "week" ? "week" : "day", channel_id: r.channel_id };
}

/** Teams with a slot, a name and a summary, in plot order. */
function entriesOf(raw: unknown): DigestPostEntry[] {
  return (Array.isArray(raw) ? raw : [])
    .map((e): DigestPostEntry | null => {
      if (!e || typeof e !== "object") return null;
      const x = e as Record<string, unknown>;
      const slot = Number(x.slot);
      const name = typeof x.name === "string" ? x.name.trim() : "";
      const summary = typeof x.summary === "string" ? x.summary.trim() : "";
      return Number.isInteger(slot) && slot >= 1 && name && summary ? { slot, name, summary } : null;
    })
    .filter((e): e is DigestPostEntry => e !== null)
    .sort((a, b) => a.slot - b.slot);
}

/** shift_quest_digest_post_current's answer with every field checked; entries may be empty (the post is taken down). */
export function normalizePosted(raw: unknown): PostedDigest[] {
  if (!Array.isArray(raw)) return [];
  const out: PostedDigest[] = [];
  for (const row of raw) {
    const head = headOf(row);
    const id = (row as Record<string, unknown> | null)?.message_id;
    if (!head || typeof id !== "string" || !SNOWFLAKE.test(id)) continue;
    out.push({ ...head, entries: entriesOf((row as Record<string, unknown>).entries), message_id: id });
  }
  return out;
}

/** One line per team, in plot order, while they fit; then how many more are on the web. */
export function digestLines(entries: DigestPostEntry[], budget = LINES_BUDGET): string[] {
  const lines: string[] = [];
  let used = 0;
  for (const [i, e] of entries.entries()) {
    const line = DIGEST.line(e.slot, safePost(e.name, MAX_NAME), safePost(e.summary, MAX_SUMMARY));
    if (used + line.length + 1 > budget) {
      lines.push(DIGEST.more(entries.length - i));
      break;
    }
    lines.push(line);
    used += line.length + 1;
  }
  return lines;
}

/**
 * The post: title, one line per team, the AI fine print with the day it is
 * for (also how a restarted process finds its own post), and a link to the
 * web island when one is configured. No team left: a short taken-down note.
 */
export function digestView(d: DigestPostData, webUrl: string | null): View {
  const blocks: Block[] = [
    { kind: "text", text: d.entries.length > 0 ? digestLines(d.entries).join("\n") : DIGEST.removed },
    { kind: "subtext", text: `${DIGEST.fine} · ${DIGEST.dayLine(d.day)}` },
  ];
  const rows = webUrl
    ? [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(webUrl).setLabel(ISLAND_LINK_LABEL))]
    : [];
  return { tone: "island", title: d.kind === "week" ? DIGEST.weekTitle : DIGEST.title, blocks, rows };
}

/**
 * Starts the digest post when the database has its functions; otherwise logs
 * one line and starts nothing, so the bot can deploy before the migration.
 */
export function digestFor(version: number, start: () => DigestPost): DigestPost | null {
  if (version >= DIGEST_SCHEMA) return start();
  console.log(`[shift-quests] island news post off (schema ${version} < ${DIGEST_SCHEMA})`);
  return null;
}

/** A failure as a code only: database messages can carry student text, which never goes to logs. */
function reasonOf(error: unknown): string {
  if (error instanceof DiscordAPIError) return `discord ${error.code} (${error.status})`;
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return (error as Error)?.name ?? "unknown";
}

type Sendable = {
  send(payload: unknown): Promise<Message>;
  messages?: { fetch(arg: unknown): Promise<unknown> };
};

/** How many of the channel's latest messages a stale claim looks through for its own post. */
const FIND_LIMIT = 50;

/** A message this process sent whose mark has not been recorded yet. */
interface Unmarked {
  day: string;
  channelId: string;
  message: Message;
  kind: DigestPostData["kind"];
  teams: number;
}

export function startDigestPost(
  client: Client,
  api: QuestApi,
  options: { guildId?: string; connected?: () => boolean } = {}
): DigestPost {
  let stopped = false;
  let running: Promise<void> | null = null;
  /** The last failure, so each cause is logged once until a post goes out. */
  let problem = "";
  /** Sent, but the mark failed: the next check retries the mark before anything else. */
  let unmarked: Unmarked | null = null;
  /** What each posted message (by id) was last rendered as, so it is edited only when that changes. */
  const rendered = new Map<string, string>();

  const payloadOf = (d: DigestPostData, action: string) => renderView(digestView(d, islandWebUrl()), { ephemeral: false, action });
  const keyOf = (payload: unknown) => JSON.stringify(payload);

  function warnOnce(reason: string): void {
    if (problem === reason) return;
    problem = reason;
    console.warn(`[shift-quests] island news post: ${reason}; trying again in 5 minutes`);
  }

  /** A text or announcement channel of the SHIFT server, or null (logged once). Never a DM or a thread. */
  async function target(channelId: string): Promise<Sendable | null> {
    const channel = await client.channels.fetch(channelId);
    const ok =
      !!channel &&
      (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) &&
      (!options.guildId || channel.guildId === options.guildId);
    if (!ok) {
      warnOnce(`channel ${channelId} is not a text channel of the SHIFT server`);
      return null;
    }
    return channel as unknown as Sendable;
  }

  /**
   * Records a sent message (compare-and-set). Keeps it when its id won;
   * deletes it when another process recorded today's post first. Throws (and
   * remembers it) when the mark fails, so nothing is posted again meanwhile.
   */
  async function mark(post: Unmarked): Promise<void> {
    let kept: string | null;
    try {
      kept = await api.call<string | null>("shift_quest_digest_mark", post.day, post.channelId, post.message.id);
    } catch (error) {
      if (error instanceof QuestError) {
        // A refusal will not change on a retry: take the unrecorded message back.
        unmarked = null;
        await post.message.delete().catch(() => undefined);
      } else {
        unmarked = post;
      }
      throw error;
    }
    unmarked = null;
    if (kept !== post.message.id) {
      // Another process posted today's news first: ours is the duplicate.
      await post.message.delete().catch(() => undefined);
      return;
    }
    problem = "";
    console.log(`[shift-quests] island news posted for ${post.day} (${post.kind}, ${post.teams} teams)`);
  }

  /** This bot's own post of `day` among the channel's latest messages, or null (none, or the channel cannot be read). */
  async function findPosted(channel: Sendable, day: string): Promise<Message | null> {
    if (!channel.messages) return null;
    const marker = DIGEST.dayLine(day);
    try {
      const found = (await channel.messages.fetch({ limit: FIND_LIMIT })) as { values(): Iterable<Message> } | null;
      for (const m of found?.values() ?? []) {
        if (client.user && m.author?.id !== client.user.id) continue;
        if (JSON.stringify(m.components ?? []).includes(marker)) return m;
      }
    } catch (error) {
      warnOnce(`could not read channel for a stale claim: ${reasonOf(error)}`);
    }
    return null;
  }

  /** Today's post, once: claim, then send (or find the message a stopped process sent), then mark. */
  async function postToday(): Promise<void> {
    const d = normalizeDigestPost(await api.call<unknown>("shift_quest_digest_post_next"));
    if (!d) {
      problem = "";
      return;
    }
    const channel = await target(d.channel_id);
    if (!channel || stopped) return;
    const claim = await api.call<string | null>("shift_quest_digest_claim", d.day, d.channel_id, d.kind);
    if (claim !== "new" && claim !== "stale") return;
    const payload = payloadOf(d, "digest_post");
    const post = { day: d.day, channelId: d.channel_id, kind: d.kind, teams: d.entries.length };
    const earlier = claim === "stale" ? await findPosted(channel, d.day) : null;
    const message = earlier ?? (await channel.send(payload));
    if (!earlier) rendered.set(message.id, keyOf(payload));
    await mark({ ...post, message });
  }

  /** Edits a posted message of the last 7 days whose teams changed since it was last rendered. */
  async function syncPosted(): Promise<void> {
    const posts = normalizePosted(await api.call<unknown>("shift_quest_digest_post_current"));
    for (const p of posts) {
      if (stopped) return;
      const payload = payloadOf(p, "digest_edit");
      const key = keyOf(payload);
      if (rendered.get(p.message_id) === key) continue;
      const channel = await target(p.channel_id);
      if (!channel?.messages) continue;
      try {
        const message = (await channel.messages.fetch(p.message_id)) as Message;
        await message.edit(payload as never);
      } catch (error) {
        // A message staff deleted (10008) stays gone: remember it so it is not fetched every 5 minutes.
        if (!(error instanceof DiscordAPIError && error.code === 10008)) throw error;
      }
      rendered.set(p.message_id, key);
      console.log(`[shift-quests] island news post for ${p.day} brought up to date (${p.entries.length} teams)`);
    }
  }

  async function tick(): Promise<void> {
    if (stopped || (options.connected && !options.connected())) return;
    if (unmarked) {
      await mark(unmarked);
      return;
    }
    await postToday();
    await syncPosted();
  }

  function poll(): Promise<void> {
    if (stopped) return Promise.resolve();
    if (running) return running;
    running = tick()
      .catch((error) => warnOnce(reasonOf(error)))
      .finally(() => {
        running = null;
      });
    return running;
  }

  const first = setTimeout(() => void poll(), FIRST_DELAY_MS);
  first.unref?.();
  const timer = setInterval(() => void poll(), TICK_MS);
  timer.unref?.();

  return {
    poll,
    async stop() {
      stopped = true;
      clearTimeout(first);
      clearInterval(timer);
      await running;
    },
  };
}
