import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  DiscordAPIError,
  type Client,
  type Message,
  type MessageEditOptions,
} from "discord.js";

import { bangkokPhase } from "@/lib/shift-island/live/lighting";

import { QuestDbError, QuestError, type QuestApi } from "./api";
import { digestLines, entriesOf, type DigestPostEntry } from "./digest";
import { DIGEST } from "./digestCopy";
import { LIVE } from "./island/copy";
import { renderIslandGif } from "./island/gif";
import { renderIsland } from "./island/render";
import { readRoots, withRoots } from "./island/roots";
import { readStyles, withStyles } from "./island/tree";
import { LIVE_GIF_MAX_BYTES, isPictureRefused, normalizeLivePost, pictureCampfire } from "./live";
import { NEWS } from "./newsCopy";
import { renderView, type Block, type View } from "./view";
import { ISLAND_LINK_LABEL, islandWebUrl } from "./weblink";

/**
 * The nightly island news (ข่าวเกาะคืนนี้): one card every evening at 20:00
 * Bangkok in the news channel (/admin channel kind:news, #island-news), a
 * group text or announcement channel. Never a DM, never a ping, never
 * crossposted (published) to other servers.
 *
 * The card always has the night island picture (the moving GIF, else the
 * still PNG, else none), the island-wide totals of the last 24 hours (20:00
 * to 20:00: who checked in, quests approved, stages grown, campfire rounds;
 * people counts of 1 or 2 show without a number), the Demo Day countdown, a
 * lore line picked by the day, and links to the web island and the campfire.
 * When any team passes the AI consent gate, the same card also carries the AI
 * team lines (digest.ts's lines). Something posts every night: the card needs
 * only this bot, the database and a news channel, never the website, the
 * cron, the Anthropic key, digest_enabled or sharing.
 *
 * Everything comes from the schema 19 functions
 * (20261118130000_shift_quest_island_news_daily): the database decides when
 * (shift_quest_news_post_next answers from 20:00 to 22:30, a stale claim
 * until midnight, never a catch-up the next day) and what (totals only, no
 * names; AI lines only for eligible teams). The picture is the live post's
 * outsider island (shift_quest_live_post). No identities reach this module.
 *
 * Once a night, without doubles, as digest.ts: claim the day
 * (shift_quest_news_claim, which also freezes the totals), send, then record
 * the message with shift_quest_news_mark (compare-and-set). A process that
 * loses the mark deletes its own message; a failed mark is retried before
 * anything else; a refused mark takes the message back. After a stale claim
 * the bot first looks for its own card of the day (the issue line,
 * NEWS.dayLine, never the digest's) among the channel's latest messages.
 *
 * Kept true afterwards: every check reads the cards of the last 7 days as
 * they should read now (shift_quest_news_post_current) and edits one whose AI
 * lines changed (a late summary, a hidden team, a withdrawn consent, the AI
 * switched off). A card is always read from Discord, never discord.js's cache
 * (which keeps it as first sent). Each card is checked on its own, and apart
 * from tonight's post, so no failure holds back a take-down. An edit keeps
 * the picture by attaching the same bytes again, downloaded from the
 * message's own attachment: Discord removes an attachment an edit does not
 * carry. When the bytes cannot be had, an edit that only
 * adds waits for the next check; one that takes a line out (privacy) goes
 * without the picture, because a take-down always wins. After a restart the
 * bot compares each card's text with what it would render and edits only on
 * a difference, so a restart edits nothing.
 */

/** The island schema that adds the nightly card's functions (20261118130000_shift_quest_island_news_daily.sql). */
export const NEWS_SCHEMA = 19;

/** The moving picture's attachment name. */
export const NEWS_GIF = "shift-island-news.gif";
/** The still picture's attachment name (the fallback). */
export const NEWS_PNG = "shift-island-news.png";
const PICTURES = new Set([NEWS_GIF, NEWS_PNG]);

/** One check every 5 minutes: the card goes out within minutes of 20:00. */
const TICK_MS = 5 * 60_000;
/** After start: lets the gateway connect before the first check. */
const FIRST_DELAY_MS = 30_000;
/** Room for the AI team lines (Discord allows 4000 characters of text; the totals and fine print take the rest). */
const AI_BUDGET = 2600;
/** How many of the channel's latest messages a stale claim looks through for its own card. */
const FIND_LIMIT = 50;
/** Discord: the message was deleted. */
const UNKNOWN_MESSAGE = 10008;
/** The largest picture downloaded back to keep it on an edit. */
const KEEP_MAX_BYTES = 8 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 15_000;
/** Where Discord serves attachments: the only hosts a picture is downloaded back from. */
const DISCORD_CDN = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

const SNOWFLAKE = /^[0-9]{5,25}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** shift_quest__news_totals: island-wide integers and the Demo Day countdown. Never a name. */
export interface NewsTotals {
  checked_in: number;
  approved: number;
  grew: number;
  rounds: number;
  /** The people behind the rounds: the campfire line shows its number only from PEOPLE_FLOOR people. */
  rounders: number;
  demo: { day: string; days: number } | null;
}

/** shift_quest__news_ai: the AI lines of teams eligible now (empty while none is, or the AI is off). */
export interface NewsAi {
  kind: "day" | "week";
  entries: DigestPostEntry[];
}

export interface NewsData {
  day: string;
  channel_id: string;
  coworking_channel_id: string | null;
  totals: NewsTotals;
  ai: NewsAi;
}

/** A card already in Discord, as it should read now. */
export interface PostedNews extends NewsData {
  message_id: string;
}

export interface NewsPost {
  stop(): Promise<void>;
  /** One check now (tests, and the timer). Never throws: failures are logged by code. */
  poll(): Promise<void>;
}

export interface NewsOptions {
  guildId?: string;
  connected?: () => boolean;
  /** Draws tonight's picture (tests stub it). Never throws: none on failure. */
  draw?: (api: QuestApi, nowMs: number) => Promise<AttachmentBuilder[]>;
  /** Downloads a posted picture back, to keep it on an edit (tests stub it). Null on any failure. */
  download?: (url: string) => Promise<Buffer | null>;
}

// ---------------------------------------------------------------------------
// The database's answers
// ---------------------------------------------------------------------------

function snowflake(value: unknown): string | null {
  return typeof value === "string" && SNOWFLAKE.test(value) ? value : null;
}

/** A non-negative whole number; anything else is 0. */
function count(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function record(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function totalsOf(raw: unknown): NewsTotals {
  const r = record(raw);
  const demo = record(r.demo);
  const days = Number(demo.days);
  return {
    checked_in: count(r.checked_in),
    approved: count(r.approved),
    grew: count(r.grew),
    rounds: count(r.rounds),
    rounders: count(r.rounders),
    demo: typeof demo.day === "string" && DAY.test(demo.day) && Number.isInteger(days) && days >= 0 ? { day: demo.day, days } : null,
  };
}

function aiOf(raw: unknown): NewsAi {
  const r = record(raw);
  return { kind: r.kind === "week" ? "week" : "day", entries: entriesOf(r.entries) };
}

/** The day, channel and the rest of a card, checked; null when the day or channel is missing. */
function newsOf(raw: unknown): NewsData | null {
  const r = record(raw);
  if (typeof r.day !== "string" || !DAY.test(r.day)) return null;
  const channel = snowflake(r.channel_id);
  if (!channel) return null;
  return {
    day: r.day,
    channel_id: channel,
    coworking_channel_id: snowflake(r.coworking_channel_id),
    totals: totalsOf(r.totals),
    ai: aiOf(r.ai),
  };
}

/** shift_quest_news_post_next's answer with every field checked; null when there is nothing to send. */
export function normalizeNews(raw: unknown): NewsData | null {
  return newsOf(raw);
}

/** shift_quest_news_post_current's answer with every field checked. */
export function normalizePostedNews(raw: unknown): PostedNews[] {
  if (!Array.isArray(raw)) return [];
  const out: PostedNews[] = [];
  for (const row of raw) {
    const d = newsOf(row);
    const id = snowflake(record(row).message_id);
    if (d && id) out.push({ ...d, message_id: id });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

/**
 * The totals block: check-ins, approvals with the stages grown on the same
 * line, campfire rounds (floored by the people who made them). A 0 line is
 * left out; with nothing at all, the quiet line instead. No comparisons, no
 * rankings.
 */
export function totalsLines(t: NewsTotals): string[] {
  const lines: string[] = [];
  if (t.checked_in > 0) lines.push(NEWS.checkedIn(t.checked_in));
  if (t.approved > 0) lines.push(t.grew > 0 ? `${NEWS.approved(t.approved)} · ${NEWS.grew(t.grew)}` : NEWS.approved(t.approved));
  else if (t.grew > 0) lines.push(NEWS.grew(t.grew));
  if (t.rounds > 0) lines.push(NEWS.rounds(t.rounds, t.rounders));
  return lines.length > 0 ? lines : [NEWS.quiet];
}

/** The night's lore line: picked by the day, so a restart or an edit keeps the same one. */
export function momentOf(day: string): string {
  const at = Date.parse(`${day}T00:00:00Z`);
  const n = Number.isFinite(at) ? Math.floor(at / 86_400_000) : 0;
  const size = NEWS.moments.length;
  return NEWS.moments[((n % size) + size) % size];
}

export interface NewsViewOptions {
  /** The picture's attachment name, or false when the card goes without one. */
  picture: string | false;
  webUrl: string | null;
  guildId: string;
}

function linkButton(url: string, label: string): ButtonBuilder {
  return new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel(label);
}

/**
 * The card: the picture above the title, the totals and the Demo Day line,
 * the lore line, then (only when a team can be featured) the AI section, and
 * the fine print with the issue line. Link buttons only: the web island and
 * the campfire's voice channel, each when there is one.
 */
export function newsView(d: NewsData, o: NewsViewOptions): View {
  const blocks: Block[] = [];
  if (o.picture) blocks.push({ kind: "image", name: o.picture, alt: NEWS.pictureAlt });
  const lines = totalsLines(d.totals);
  if (d.totals.demo) lines.push(LIVE.demo(d.totals.demo.day, d.totals.demo.days));
  blocks.push({ kind: "text", text: lines.join("\n") });
  blocks.push({ kind: "text", text: momentOf(d.day) });
  if (d.ai.entries.length > 0) {
    const heading = d.ai.kind === "week" ? NEWS.weekHeading : NEWS.aiHeading;
    blocks.push({ kind: "divider" });
    blocks.push({ kind: "text", text: [`**${heading}**`, ...digestLines(d.ai.entries, AI_BUDGET)].join("\n") });
    blocks.push({ kind: "subtext", text: DIGEST.fine });
    blocks.push({ kind: "divider", line: false });
  }
  if (!o.picture) blocks.push({ kind: "subtext", text: NEWS.pictureFailed });
  blocks.push({ kind: "subtext", text: `${NEWS.fine} · ${NEWS.dayLine(d.day)}` });

  const links: ButtonBuilder[] = [];
  if (o.webUrl) links.push(linkButton(o.webUrl, ISLAND_LINK_LABEL));
  const room = snowflake(d.coworking_channel_id);
  if (room && SNOWFLAKE.test(o.guildId)) links.push(linkButton(`https://discord.com/channels/${o.guildId}/${room}`, LIVE.join));
  const rows = links.length > 0 ? [new ActionRowBuilder<ButtonBuilder>().addComponents(...links)] : [];
  return { tone: "island", title: NEWS.title, blocks, rows };
}

type Json = { type?: number; content?: unknown; label?: unknown; url?: unknown; components?: unknown; accessory?: unknown };

/** The text displays and link buttons of a card (builders, discord.js components or plain JSON), in order. */
function cardParts(components: unknown): { texts: string[]; links: string[] } {
  const texts: string[] = [];
  const links: string[] = [];
  const walk = (c: Json | null | undefined): void => {
    if (!c || typeof c !== "object") return;
    if (c.type === 10) texts.push(String(c.content ?? ""));
    if (c.type === 2 && typeof c.url === "string") links.push(`${String(c.label ?? "")} ${c.url}`);
    if (Array.isArray(c.components)) for (const child of c.components) walk(child as Json);
    if (c.accessory) walk(c.accessory as Json);
  };
  let plain: unknown;
  try {
    plain = JSON.parse(JSON.stringify(components ?? []));
  } catch {
    plain = [];
  }
  for (const c of Array.isArray(plain) ? plain : []) walk(c as Json);
  return { texts, links };
}

/**
 * What a card shows, for comparing a render with a message already in
 * Discord: its text and its link buttons (the picture is not text, so a
 * render without the file compares the same).
 */
export function cardSignature(components: unknown): string {
  return JSON.stringify(cardParts(components));
}

/**
 * Whether going from `before` to `after` takes any line of text away: a team
 * leaving the AI section (hidden, consent withdrawn, name no longer shown) or
 * the AI switched off. Such an edit is a take-down and goes out even when the
 * picture cannot be kept.
 */
export function removesText(before: unknown, after: unknown): boolean {
  const lines = (components: unknown) =>
    cardParts(components)
      .texts.flatMap((t) => t.split("\n"))
      .filter((l) => l.trim());
  const kept = new Set(lines(after));
  return lines(before).some((l) => !kept.has(l));
}

/**
 * The card as an edit. The picture is always passed as a file (the same
 * bytes again when it is kept), with attachments: [] so the old file goes:
 * Discord drops any attachment an edit does not carry, so an edit without
 * files would take the picture away. files: [] is the card without one.
 */
export function newsEdit(view: View, files: AttachmentBuilder[]): MessageEditOptions {
  const p = renderView({ ...view, files }, { ephemeral: false, action: "news_edit" });
  return { components: p.components, files: p.files, attachments: [], flags: p.flags, allowedMentions: p.allowedMentions };
}

/**
 * Starts the nightly card when the database has its functions; otherwise
 * logs one line and starts nothing, so the bot can deploy before the migration.
 */
export function newsFor(version: number, start: () => NewsPost): NewsPost | null {
  if (version >= NEWS_SCHEMA) return start();
  console.log(`[shift-quests] nightly island news off (schema ${version} < ${NEWS_SCHEMA})`);
  return null;
}

// ---------------------------------------------------------------------------
// The picture
// ---------------------------------------------------------------------------

/**
 * Tonight's island: the live post's outsider view (shift_quest_live_post,
 * with roots and looks), lit for the hour in Bangkok (night at 20:00), with
 * the festival bunting during a season and one figure per person at the
 * campfire (a count, never who). The moving GIF, else the still PNG when the
 * GIF cannot be drawn or is over 2 MB, else none: the totals go out anyway.
 */
export async function drawNewsPicture(api: QuestApi, nowMs: number): Promise<AttachmentBuilder[]> {
  let d: ReturnType<typeof normalizeLivePost> = null;
  try {
    d = normalizeLivePost(await api.call<unknown>("shift_quest_live_post"));
    if (d) d.plots = withStyles(withRoots(d.plots, await readRoots(api)), await readStyles(api));
  } catch (error) {
    console.warn(`[shift-quests] nightly island news: no picture tonight (${reasonOf(error)})`);
    return [];
  }
  if (!d) return [];
  const festival = Boolean(d.season);
  const campfire = pictureCampfire(d);
  try {
    const gif = renderIslandGif(d.plots, { scale: 2, festival, phase: bangkokPhase(nowMs), campfire }).gif;
    if (gif.length <= LIVE_GIF_MAX_BYTES) return [new AttachmentBuilder(gif, { name: NEWS_GIF, description: NEWS.pictureAlt })];
  } catch {
    // The still picture below.
  }
  try {
    const png = renderIsland(d.plots, { scale: 2, festival, campfire }).png;
    return [new AttachmentBuilder(png, { name: NEWS_PNG, description: NEWS.pictureAlt })];
  } catch (error) {
    console.warn(`[shift-quests] nightly island news: the picture could not be drawn (${(error as Error)?.name ?? "unknown"})`);
    return [];
  }
}

/**
 * A posted picture's bytes, downloaded back from Discord's own CDN to keep
 * it on an edit. Null for any other host, a failure, a timeout, or a file
 * over 8 MB.
 */
export async function downloadPicture(url: string): Promise<Buffer | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !DISCORD_CDN.has(parsed.hostname)) return null;
  try {
    const res = await fetch(parsed, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    // A redirect may only stay on Discord's CDN.
    const landed = res.url ? new URL(res.url).hostname : parsed.hostname;
    if (!res.ok || !DISCORD_CDN.has(landed) || Number(res.headers.get("content-length") ?? 0) > KEEP_MAX_BYTES) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length > 0 && bytes.length <= KEEP_MAX_BYTES ? bytes : null;
  } catch {
    return null;
  }
}

/** The card's picture among a message's attachments, by its name; null when it went without one. */
function pictureOn(message: Message): { name: string; url: string; description: string | null } | null {
  const attachments = (message.attachments as unknown as { values(): Iterable<{ name?: string; url?: string; description?: string | null }> } | undefined)?.values();
  for (const a of attachments ?? []) {
    if (a.name && PICTURES.has(a.name) && typeof a.url === "string") return { name: a.name, url: a.url, description: a.description ?? null };
  }
  return null;
}

// ---------------------------------------------------------------------------
// The poster
// ---------------------------------------------------------------------------

/** A failure as a code only: database messages can carry student text, which never goes to logs. */
function reasonOf(error: unknown): string {
  if (error instanceof DiscordAPIError) return `discord ${error.code} (${error.status})`;
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return (error as Error)?.name ?? "unknown";
}

function isUnknownMessage(error: unknown): boolean {
  return error instanceof DiscordAPIError && Number(error.code) === UNKNOWN_MESSAGE;
}

type Sendable = {
  send(payload: unknown): Promise<Message>;
  messages?: { fetch(arg: unknown): Promise<unknown> };
};

/** A message this process sent whose mark has not been recorded yet. */
interface Unmarked {
  day: string;
  channelId: string;
  message: Message;
  teams: number;
}

/** What a posted card (by message id) was last seen to show, and whether it carries the picture. */
interface Seen {
  sig: string;
  picture: string | false;
}

export function startNewsPost(client: Client, api: QuestApi, options: NewsOptions = {}): NewsPost {
  let stopped = false;
  let running: Promise<void> | null = null;
  /**
   * The last failure of each job, so each cause is logged once until that job
   * works again: "post" (tonight's card), "sync" (reading the cards to
   * re-check) and one per posted card ("card <message id>").
   */
  const problems = new Map<string, string>();
  let attachWarned = false;
  /** Sent, but the mark failed: the next check retries the mark before anything else. */
  let unmarked: Unmarked | null = null;
  const seen = new Map<string, Seen>();
  const guildId = options.guildId ?? "";
  const draw = options.draw ?? drawNewsPicture;
  const download = options.download ?? downloadPicture;

  const viewOf = (d: NewsData, picture: string | false) => newsView(d, { picture, webUrl: islandWebUrl(), guildId });
  /** What the card shows with or without its picture (text and links only). */
  const sigOf = (d: NewsData, picture: string | false) =>
    cardSignature(renderView(viewOf(d, picture), { ephemeral: false, action: "news_sig" }).components);

  function warnOnce(job: string, reason: string): void {
    if (problems.get(job) === reason) return;
    problems.set(job, reason);
    console.warn(`[shift-quests] nightly island news: ${reason}; trying again in 5 minutes`);
  }

  /** A text or announcement channel of the SHIFT server, or null (logged once for `job`). Never a DM or a thread. */
  async function target(channelId: string, job: string): Promise<Sendable | null> {
    const channel = await client.channels.fetch(channelId);
    const ok =
      !!channel &&
      (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) &&
      (!options.guildId || channel.guildId === options.guildId);
    if (!ok) {
      warnOnce(job, `channel ${channelId} is not a text or announcement channel of the SHIFT server`);
      return null;
    }
    return channel as unknown as Sendable;
  }

  /**
   * Records a sent card (compare-and-set). Keeps it when its id won; deletes
   * it when another process recorded tonight's card first. Throws (and
   * remembers it) when the mark fails, so nothing is sent again meanwhile.
   */
  async function mark(post: Unmarked): Promise<void> {
    let kept: string | null;
    try {
      kept = await api.call<string | null>("shift_quest_news_mark", post.day, post.channelId, post.message.id);
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
      // Another process sent tonight's card first: ours is the duplicate.
      await post.message.delete().catch(() => undefined);
      return;
    }
    problems.delete("post");
    console.log(`[shift-quests] nightly island news posted for ${post.day} (${post.teams} AI teams)`);
  }

  /** This bot's own card of `day` among the channel's latest messages, or null (none, or the channel cannot be read). */
  async function findPosted(channel: Sendable, day: string): Promise<Message | null> {
    if (!channel.messages) return null;
    const marker = NEWS.dayLine(day);
    try {
      const found = (await channel.messages.fetch({ limit: FIND_LIMIT })) as { values(): Iterable<Message> } | null;
      for (const m of found?.values() ?? []) {
        if (client.user && m.author?.id !== client.user.id) continue;
        if (JSON.stringify(m.components ?? []).includes(marker)) return m;
      }
    } catch (error) {
      warnOnce("post", `could not read the channel for a stale claim: ${reasonOf(error)}`);
    }
    return null;
  }

  /**
   * Sends the card with tonight's picture. Refused because of the picture
   * (the bot lost Attach Files, or the file is too large): once more without
   * it, so the totals always go out.
   */
  async function send(channel: Sendable, d: NewsData): Promise<{ message: Message; picture: string | false }> {
    const files = await draw(api, Date.now());
    const picture = files[0]?.name ?? false;
    try {
      const message = await channel.send(renderView({ ...viewOf(d, picture), files }, { ephemeral: false, action: "news_post" }));
      if (picture) attachWarned = false;
      return { message, picture };
    } catch (error) {
      if (!picture || !isPictureRefused(error)) throw error;
      if (!attachWarned) {
        attachWarned = true;
        console.warn(
          `[shift-quests] nightly island news: the picture was refused (${reasonOf(error)}); sent the card without it. Give the bot Attach Files in the news channel`
        );
      }
      const message = await channel.send(renderView(viewOf(d, false), { ephemeral: false, action: "news_post" }));
      return { message, picture: false };
    }
  }

  /** Tonight's card, once: claim, then send (or find the card a stopped process sent), then mark. */
  async function postToday(): Promise<void> {
    const d = normalizeNews(await api.call<unknown>("shift_quest_news_post_next"));
    if (!d) {
      problems.delete("post");
      return;
    }
    const channel = await target(d.channel_id, "post");
    if (!channel || stopped) return;
    const claim = await api.call<string | null>("shift_quest_news_claim", d.day, d.channel_id);
    if (claim !== "new" && claim !== "stale") return;
    const earlier = claim === "stale" ? await findPosted(channel, d.day) : null;
    let message: Message;
    if (earlier) {
      message = earlier;
    } else {
      const sent = await send(channel, d);
      message = sent.message;
      seen.set(message.id, { sig: sigOf(d, sent.picture), picture: sent.picture });
    }
    await mark({ day: d.day, channelId: d.channel_id, message, teams: d.ai.entries.length });
  }

  /**
   * Edits a card to read as it should now. With a picture: the same bytes
   * attached again. Without them, an edit that only adds waits for the next
   * check; a take-down goes out without the picture. Returns whether it edited.
   */
  async function edit(message: Message, p: PostedNews, job: string): Promise<boolean> {
    const kept = pictureOn(message);
    if (!kept) {
      await message.edit(newsEdit(viewOf(p, false), []));
      seen.set(p.message_id, { sig: sigOf(p, false), picture: false });
      return true;
    }
    const takeDown = removesText(message.components, renderView(viewOf(p, kept.name), { ephemeral: false, action: "news_edit" }).components);
    const bytes = await download(kept.url);
    if (bytes) {
      try {
        const file = new AttachmentBuilder(bytes, { name: kept.name, description: kept.description ?? NEWS.pictureAlt });
        await message.edit(newsEdit(viewOf(p, kept.name), [file]));
        seen.set(p.message_id, { sig: sigOf(p, kept.name), picture: kept.name });
        return true;
      } catch (error) {
        if (!takeDown || !isPictureRefused(error)) throw error;
      }
    } else if (!takeDown) {
      warnOnce(job, `could not download the picture of the card for ${p.day} to keep it; the edit waits`);
      return false;
    }
    // A take-down for privacy wins over keeping the picture.
    await message.edit(newsEdit(viewOf(p, false), []));
    seen.set(p.message_id, { sig: sigOf(p, false), picture: false });
    console.warn(`[shift-quests] nightly island news: the card for ${p.day} lost its picture to take a line down`);
    return true;
  }

  /**
   * Brings the cards of the last 7 days up to date; a card whose text is
   * unchanged is never fetched again. Each card on its own: one that keeps
   * failing (an edit Discord refuses, a channel the bot lost) is logged once
   * and tried again next check, and never holds back another card's take-down.
   */
  async function syncPosted(): Promise<void> {
    const posts = normalizePostedNews(await api.call<unknown>("shift_quest_news_post_current"));
    problems.delete("sync");
    for (const p of posts) {
      if (stopped) return;
      const known = seen.get(p.message_id);
      if (known && known.sig === sigOf(p, known.picture)) continue;
      const job = `card ${p.message_id}`;
      try {
        if (await syncOne(p, job)) problems.delete(job);
      } catch (error) {
        if (isUnknownMessage(error)) {
          // A card staff deleted (10008) stays gone: remember it so it is not fetched every 5 minutes.
          seen.set(p.message_id, { sig: sigOf(p, known?.picture ?? false), picture: known?.picture ?? false });
          problems.delete(job);
          continue;
        }
        warnOnce(job, `the card for ${p.day} is not up to date (${reasonOf(error)})`);
      }
    }
  }

  /**
   * One card: read it as Discord shows it now, and edit it when it reads
   * differently. False when it is not settled yet (an edit that waits).
   */
  async function syncOne(p: PostedNews, job: string): Promise<boolean> {
    const channel = await target(p.channel_id, job);
    if (!channel?.messages) return false;
    // Always from Discord (force), never discord.js's cache. The cache keeps a
    // card as it was sent: an edit returns a patched copy and leaves the
    // cached one as it was, and this bot gets no message events to update it.
    // A stale copy could read as already taken down, and its picture links
    // expire after a day or point at a file an earlier edit replaced.
    const message = (await channel.messages.fetch({ message: p.message_id, force: true })) as Message;
    const picture = pictureOn(message)?.name ?? false;
    const want = sigOf(p, picture);
    // After a restart (nothing seen yet): edit only when the card in Discord reads differently.
    if (cardSignature(message.components) === want) {
      seen.set(p.message_id, { sig: want, picture });
      return true;
    }
    if (!(await edit(message, p, job))) return false;
    console.log(`[shift-quests] nightly island news for ${p.day} brought up to date (${p.ai.entries.length} AI teams)`);
    return true;
  }

  /**
   * Tonight's card, then the 7-day re-check, each on its own: a failure in
   * one (a database timeout, a channel the bot cannot read, a mark being
   * retried) never holds back the other, so a take-down never waits for
   * tonight's card.
   */
  async function tick(): Promise<void> {
    if (stopped || (options.connected && !options.connected())) return;
    try {
      if (unmarked) await mark(unmarked);
      else await postToday();
    } catch (error) {
      warnOnce("post", reasonOf(error));
    }
    if (stopped) return;
    try {
      await syncPosted();
    } catch (error) {
      warnOnce("sync", reasonOf(error));
    }
  }

  function poll(): Promise<void> {
    if (stopped) return Promise.resolve();
    if (running) return running;
    running = tick()
      .catch((error) => warnOnce("post", reasonOf(error)))
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
