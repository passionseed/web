import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  DiscordAPIError,
  Events,
  type Client,
  type Message,
  type MessageEditOptions,
  type TextChannel,
} from "discord.js";

import { QuestDbError, QuestError, type QuestApi } from "./api";
import { LIVE } from "./island/copy";
import { renderIsland, type IslandPlot } from "./island/render";
import { islandSigns, signsLine } from "./outbox";
import { renderView, type Block, type View, type ViewPayload } from "./view";
import { ISLAND_LINK_LABEL, islandWebUrl } from "./weblink";

/**
 * The live island post: one message in the live channel (/admin channel
 * kind:live) that the bot keeps editing in place, never a stream of new posts.
 * It shows the island picture and a short card: trees, and the confirmed
 * milestones of the trees shown by name (never a quiet project's), the island goal, the Demo Day countdown, how many people sit at
 * the campfire (a number, never who), and links to the web island and the
 * coworking voice channel.
 *
 * Everything comes from shift_quest_live_post() (20261111094000, schema 8):
 * the same outsider view of the island as the weekly public post (a plot
 * shows its stage and name only once every teammate consented), plus counts.
 * No identities reach this module, so none can reach the post.
 *
 * Finding its message again, without spam:
 * 1. The database keeps the message id with the channel it was posted in
 *    (shift_quest_live_state). The reader returns it only while that channel
 *    is still the live channel, so moving the live channel posts once there
 *    and leaves the old message alone.
 * 2. A new id is stored with shift_quest_live_mark(channel, new, previous), a
 *    compare-and-set: when two bot processes overlap (a deploy) and both post,
 *    the one that loses deletes its own message.
 * 3. When the database has no usable id (never posted, the write failed, or
 *    staff deleted the message), the bot first looks for a post of its own:
 *    one this process made but could not record, then its own pinned message
 *    carrying LIVE.marker. Only then does it post a new one, and pins it.
 * Any Discord error other than "unknown message" (an outage, missing access)
 * posts nothing: the next minute tries again, and the warning is logged once.
 * The one exception is a send or edit refused because of its picture (the bot
 * lost Attach Files, 50013, or the file is too large, 40005): the card goes
 * out once more without the picture, with LIVE.pictureFailed, and the next
 * edit tries the picture again.
 *
 * Updates: about 5 seconds after every gateway ready (always edits), then a
 * check every minute that edits only when something shown changed (approvals,
 * new plots, opt-ins, campfire count, the day count) or the last edit is 10
 * minutes old. Approvals made on the web are picked up the same way. At most
 * one edit a minute, which keeps well inside Discord's rate limits. A message
 * staff delete comes back within 10 minutes (the bot has no message intent,
 * so it learns of the deletion at its next edit).
 */

/** The island schema that adds shift_quest_live_post and shift_quest_live_mark (20261111094000_shift_quest_live.sql). */
export const LIVE_SCHEMA = 8;

/** The picture's attachment name. */
export const LIVE_PNG = "shift-island-live.png";

/** One check a minute: also the debounce for approvals, new plots, opt-ins and campfire changes. */
const TICK_MS = 60_000;
/** Edits at least this often even when nothing changed, so "อัปเดตล่าสุด" stays honest. */
const REFRESH_MS = 10 * 60_000;
/** After a gateway ready: lets the guild cache fill before the first edit. */
const READY_DELAY_MS = 5_000;
/** Pinned messages read when looking for the bot's own post (Discord's page size). */
const PINS_LIMIT = 50;
/** Discord: the message was deleted. */
const UNKNOWN_MESSAGE = 10008;
/**
 * Discord refusing a send or edit because of its picture: Missing Permissions
 * (the bot lost Attach Files in the live channel) or the file being too
 * large. The card then goes out once more without it.
 */
const PICTURE_REFUSED = new Set([50013, 40005]);

const SNOWFLAKE = /^[0-9]{5,25}$/;

export interface LivePostData {
  channel_id: string | null;
  message_id: string | null;
  coworking_channel_id: string | null;
  plots: IslandPlot[];
  goal: { milestone: number; target: number; count: number; reached: boolean; deadline: string } | null;
  season: { name: string; demo_day: string; days_to_demo: number } | null;
  trees: number;
  /**
   * Milestones mentors confirmed on the trees every member agreed to show
   * (the sum of the stages on the picture); quiet projects never count. Null
   * only for a malformed answer: then the line leaves the total out.
   */
  approved: number | null;
  campfire: { live: boolean; count: number };
}

export interface LivePost {
  stop(): Promise<void>;
}

function snowflake(value: unknown): string | null {
  return typeof value === "string" && SNOWFLAKE.test(value) ? value : null;
}

function whole(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** People at the campfire: the count while it is live, else 0. Never anything per person. */
function campers(d: LivePostData): number {
  return d.campfire?.live ? whole(d.campfire.count) : 0;
}

/** The database's answer with every field checked, so a surprise shape never reaches Discord. */
function normalize(raw: unknown): LivePostData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;
  const goal = r.goal && typeof r.goal === "object" && whole(r.goal.target) > 0 ? r.goal : null;
  const season = r.season && typeof r.season === "object" && typeof r.season.demo_day === "string" ? r.season : null;
  return {
    channel_id: snowflake(r.channel_id),
    message_id: snowflake(r.message_id),
    coworking_channel_id: snowflake(r.coworking_channel_id),
    plots: Array.isArray(r.plots) ? r.plots.filter((p: unknown) => p && typeof p === "object" && Number.isInteger((p as IslandPlot).slot)) : [],
    goal: goal
      ? {
          milestone: whole(goal.milestone),
          target: whole(goal.target),
          count: whole(goal.count),
          reached: goal.reached === true,
          deadline: String(goal.deadline ?? ""),
        }
      : null,
    season: season
      ? { name: String(season.name ?? ""), demo_day: season.demo_day, days_to_demo: Math.trunc(Number(season.days_to_demo) || 0) }
      : null,
    trees: whole(r.trees),
    approved: r.approved === null || r.approved === undefined ? null : whole(r.approved),
    campfire: { live: r.campfire?.live === true, count: whole(r.campfire?.count) },
  };
}

/**
 * Everything the post shows except the time: when it is unchanged and the
 * last edit is under 10 minutes old, the tick edits nothing. The message id
 * is left out (where the post is, not what it shows).
 */
export function liveSignature(d: LivePostData, webUrl: string | null): string {
  return JSON.stringify({
    plots: d.plots,
    goal: d.goal,
    season: d.season,
    trees: d.trees,
    approved: d.approved,
    campfire: campers(d),
    coworking: d.coworking_channel_id,
    webUrl,
  });
}

function linkButton(url: string, label: string): ButtonBuilder {
  return new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel(label);
}

/**
 * The live card: the picture above the title (when it could be drawn), the
 * numbers, the signs every teammate opted in to show, then when it was
 * updated and the marker the bot finds its post by. The buttons open the web
 * island and the coworking voice channel, each only when there is one.
 */
export function liveView(d: LivePostData, o: { nowMs: number; guildId: string; webUrl: string | null; picture: boolean }): View {
  const blocks: Block[] = [];
  if (o.picture) blocks.push({ kind: "image", name: LIVE_PNG, alt: "เกาะ SHIFT" });

  const room = snowflake(d.coworking_channel_id);
  const lines = [LIVE.trees(d.trees, d.approved)];
  if (d.goal && d.goal.target > 0) lines.push(LIVE.goal(d.goal.count, d.goal.target, d.goal.reached));
  if (d.season && d.season.days_to_demo >= 0) lines.push(LIVE.demo(d.season.demo_day, d.season.days_to_demo));
  if (room) lines.push(LIVE.campfire(campers(d)));
  blocks.push({ kind: "text", text: lines.join("\n") });

  const signs = signsLine(islandSigns(d.plots));
  if (signs) blocks.push({ kind: "subtext", text: signs });
  if (!o.picture) blocks.push({ kind: "subtext", text: LIVE.pictureFailed });
  blocks.push({ kind: "subtext", text: `${LIVE.updated(Math.floor(o.nowMs / 1000))} · ${LIVE.marker}` });

  const buttons: ButtonBuilder[] = [];
  if (o.webUrl) buttons.push(linkButton(o.webUrl, ISLAND_LINK_LABEL));
  if (room && SNOWFLAKE.test(o.guildId)) buttons.push(linkButton(`https://discord.com/channels/${o.guildId}/${room}`, LIVE.join));
  const rows = buttons.length ? [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)] : [];

  return { tone: "island", title: LIVE.title, blocks, rows };
}

/**
 * Starts the live post when the database has its functions; otherwise logs
 * one line and starts nothing, so the bot can deploy before the migration.
 */
export function liveFor(version: number, start: () => LivePost): LivePost | null {
  if (version >= LIVE_SCHEMA) return start();
  console.log(`[shift-quests] live post off (schema ${version} < ${LIVE_SCHEMA})`);
  return null;
}

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

function isPictureRefused(error: unknown): boolean {
  return error instanceof DiscordAPIError && PICTURE_REFUSED.has(Number(error.code));
}

/** The bot's own live post: its author is the bot and its card carries the marker. */
function isLivePost(message: Message, botId: string | undefined): boolean {
  if (!botId || message.author?.id !== botId) return false;
  try {
    return JSON.stringify(message.components ?? []).includes(LIVE.marker);
  } catch {
    return false;
  }
}

/** The card as an edit: the old picture is replaced (or removed when none could be drawn). */
function asEdit(payload: ViewPayload): MessageEditOptions {
  return {
    components: payload.components,
    files: payload.files,
    attachments: [],
    flags: payload.flags,
    allowedMentions: payload.allowedMentions,
  };
}

export function startLivePost(client: Client, api: QuestApi, guildId: string, connected: () => boolean): LivePost {
  let stopped = false;
  let running: Promise<void> | null = null;
  /** A forced run asked for while another run was going: the next run forces. */
  let forceNext = false;
  let readyTimer: ReturnType<typeof setTimeout> | null = null;
  /** What the last edit or post showed, and where. */
  let last: { where: string; sig: string; at: number } | null = null;
  /** A post this process made that the database did not record (the write failed): reused before any new post. */
  let unrecorded: { channel: string; id: string } | null = null;
  /** The last tick failure, so each cause is logged once. */
  let problem = "";
  let pinWarned = false;
  let pictureWarned = false;
  let attachWarned = false;

  function warnOnce(reason: string): void {
    if (problem === reason) return;
    problem = reason;
    console.warn(`[shift-quests] live post: ${reason}; nothing new posted, trying again in a minute`);
  }

  /** The island picture, or none when it cannot be drawn: the numbers still go out. */
  function picture(d: LivePostData): AttachmentBuilder[] {
    try {
      const image = renderIsland(d.plots, { scale: 2, festival: Boolean(d.season) });
      pictureWarned = false;
      return [new AttachmentBuilder(image.png, { name: LIVE_PNG, description: "เกาะ SHIFT" })];
    } catch (error) {
      if (!pictureWarned) {
        pictureWarned = true;
        console.error(`[shift-quests] live island picture skipped: ${(error as Error)?.message ?? "unknown"}`);
      }
      return [];
    }
  }

  async function liveChannel(channelId: string): Promise<TextChannel | null> {
    const channel = await client.channels.fetch(channelId);
    if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== guildId) {
      warnOnce(`channel ${channelId} is not a text channel of the SHIFT server the bot can see`);
      return null;
    }
    return channel;
  }

  /** Stores id as the live post unless another one won; returns the id the database kept (null: the channel moved). */
  async function mark(channelId: string, id: string, previous: string | null): Promise<string | null> {
    const kept = await api.call<string | null>("shift_quest_live_mark", channelId, id, previous);
    return snowflake(kept);
  }

  /** A post of the bot's own to reuse: one this process could not record, else its pinned post with the marker. */
  async function ownPost(channel: TextChannel, channelId: string): Promise<string | null> {
    if (unrecorded?.channel === channelId) return unrecorded.id;
    const pins = await channel.messages.fetchPins({ limit: PINS_LIMIT });
    const botId = client.user?.id;
    return pins.items.map((pin) => pin.message).find((m) => isLivePost(m, botId))?.id ?? null;
  }

  /**
   * Puts the card in the channel: edits the stored post, else adopts the
   * bot's own post, else posts and pins a new one. Returns the id now showing
   * the card, or null when another process's post won (the next tick edits it).
   */
  async function place(channel: TextChannel, channelId: string, stored: string | null, payload: ViewPayload): Promise<string | null> {
    if (stored) {
      try {
        await channel.messages.edit(stored, asEdit(payload));
        if (unrecorded) {
          // Another post was recorded meanwhile: the one this process could not record is a duplicate.
          const extra = unrecorded;
          unrecorded = null;
          if (extra.channel === channelId && extra.id !== stored) await channel.messages.delete(extra.id).catch(() => undefined);
        }
        return stored;
      } catch (error) {
        // Deleted: find or make another below. Anything else posts nothing.
        if (!isUnknownMessage(error)) throw error;
      }
    }

    const own = await ownPost(channel, channelId);
    if (own) {
      const kept = await mark(channelId, own, stored);
      if (unrecorded?.id === own) unrecorded = null;
      if (kept !== own) return null;
      try {
        await channel.messages.edit(own, asEdit(payload));
      } catch (error) {
        // Gone as well: the database now names a deleted post, so the next tick posts anew.
        if (isUnknownMessage(error)) return null;
        throw error;
      }
      return own;
    }

    const sent = await channel.send(payload);
    // Pinned before it is recorded: if the write fails, the pin is how the next tick finds it.
    await sent.pin().then(
      () => {
        pinWarned = false;
      },
      (error: unknown) => {
        if (pinWarned) return;
        pinWarned = true;
        console.warn(`[shift-quests] live post: could not pin it (${reasonOf(error)}); give the bot Pin Messages in the live channel`);
      }
    );
    let kept: string | null;
    try {
      kept = await mark(channelId, sent.id, stored);
    } catch (error) {
      unrecorded = { channel: channelId, id: sent.id };
      throw error;
    }
    if (kept !== sent.id) {
      // Another process posted first, or the live channel moved meanwhile: ours is the duplicate.
      await sent.delete().catch(() => undefined);
      return null;
    }
    return sent.id;
  }

  async function tick(force: boolean): Promise<void> {
    if (stopped || !connected()) return;
    const d = normalize(await api.call<unknown>("shift_quest_live_post"));
    const channelId = d?.channel_id ?? null;
    if (!d || !channelId) {
      // No live channel: nothing to do, and the last message (if any) stays as it was.
      last = null;
      problem = "";
      return;
    }
    const webUrl = islandWebUrl();
    const sig = liveSignature(d, webUrl);
    const now = Date.now();
    const where = `${channelId}:${d.message_id ?? ""}`;
    if (!force && last && last.where === where && last.sig === sig && now - last.at < REFRESH_MS) return;

    const channel = await liveChannel(channelId);
    if (!channel || stopped) return;
    const payload = (files: AttachmentBuilder[]): ViewPayload => {
      const view: View = { ...liveView(d, { nowMs: now, guildId, webUrl, picture: files.length > 0 }), files };
      return renderView(view, { ephemeral: false, action: "live_post" });
    };
    const files = picture(d);
    let placed: string | null;
    try {
      placed = await place(channel, channelId, d.message_id, payload(files));
      if (files.length > 0) attachWarned = false;
    } catch (error) {
      // Refused because of the picture: the numbers still go out, once more without it.
      // A retry that fails too throws its own error (then the picture was not the cause).
      if (files.length === 0 || !isPictureRefused(error)) throw error;
      placed = await place(channel, channelId, d.message_id, payload([]));
      if (!attachWarned) {
        attachWarned = true;
        console.warn(
          `[shift-quests] live post: the picture was refused (${reasonOf(error)}); sent the numbers only. Give the bot Attach Files in the live channel`
        );
      }
    }
    if (!placed) return;
    last = { where: `${channelId}:${placed}`, sig, at: now };
    problem = "";
  }

  function run(force: boolean): void {
    if (stopped) return;
    if (running) {
      if (force) forceNext = true;
      return;
    }
    const forced = force || forceNext;
    forceNext = false;
    running = tick(forced)
      .catch((error) => warnOnce(reasonOf(error)))
      .finally(() => {
        running = null;
        // A ready arrived mid-run: edit again now rather than at the next minute.
        if (forceNext && !stopped) run(true);
      });
  }

  const onReady = (): void => {
    if (stopped) return;
    if (readyTimer) clearTimeout(readyTimer);
    readyTimer = setTimeout(() => {
      readyTimer = null;
      run(true);
    }, READY_DELAY_MS);
    readyTimer.unref?.();
  };
  client.on(Events.ShardReady, onReady);

  const timer = setInterval(() => run(false), TICK_MS);
  timer.unref?.();

  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      if (readyTimer) clearTimeout(readyTimer);
      client.off(Events.ShardReady, onReady);
      // The post stays as it is: it says when it was last updated.
      await running;
    },
  };
}
