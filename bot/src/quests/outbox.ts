import fs from "node:fs";

import { ActionRowBuilder, AttachmentBuilder, DiscordAPIError, type ButtonBuilder, type Client, type Message } from "discord.js";

import { QuestDbError, QuestError, type QuestApi } from "./api";
import { enqueueAway } from "./away";
import { TREE_GREW, renderOutbox, safePost, type OutboxRender } from "./copy";
import { I, STAGE_NAMES, stageBar } from "./island/copy";
import { renderIsland, type IslandPlot } from "./island/render";
import { renderView, type Block, type Row, type Tone, type View } from "./view";
import { islandLinkButton } from "./weblink";

/**
 * Delivers queued channel posts and DMs. The database decides what is due,
 * where it goes and whether it is still wanted (shift_quest_outbox_claim);
 * this loop only sends and reports back. A failure is retried with backoff
 * and never undoes the approval, help request or share that queued it.
 */

const TICK_MS = 10_000;
const MINUTE_MS = 60_000;
const BATCH = 10;

/** Errors no retry can fix: the person blocks DMs, or the kind is unknown. */
const PERMANENT_CODES = new Set([50007, 10013]);

/**
 * The founder's call (2026-11-18): when a team shows its name on the island
 * (every active member opted in and has consent), its tree_grew post in the
 * celebrate channel also pings the team's members, so they hear the cheer.
 * The ping shows who is in the team. false: name the team, ping nobody.
 * A team that does not show its name is never pinged either way.
 */
export const PING_NAMED_TEAMS = true;

/** The bot's own reactions under a tree_grew post, so others pile on. */
export const TREE_GREW_REACTIONS = ["🎉", "🌱"] as const;

/** At most this many members pinged in one post (a team is far smaller). */
const MAX_TEAM_PINGS = 10;

const SNOWFLAKE = /^\d{15,22}$/;

/** Same file as shift-voice: Docker's HEALTHCHECK reads its age. */
const HEALTH_FILE = "/tmp/shift-voice-healthy";

export interface Claimed {
  id: string;
  kind: string;
  params: Record<string, unknown>;
  channel_id: string | null;
  dm_user_id: string | null;
  member_user_id: string | null;
  peer_user_id: string | null;
  attempts: number;
}

const ISLAND_PNG = "shift-island.png";

/** Signs listed under the weekly picture (the plot numbers on it); the rest are counted. */
const SIGNS_SHOWN = 30;

/**
 * The commands are guild-only (commands.ts), so a DM shows "/inbox" as plain
 * text: a command mention there could not run.
 */
const NO_COMMAND_LINKS: ReadonlyMap<string, string> = new Map();

/** Accent colour per delivery kind; anything not listed is neutral. */
const OUTBOX_TONE: Record<string, Tone> = {
  review_needed: "staff",
  proposal_needs_agreement: "staff",
  help_mentors: "staff",
  redemption_requested: "staff",
  data_request: "staff",
  news_missed: "staff",
  celebration: "success",
  tree_grew: "success",
  recognition: "success",
  island_weekly: "island",
  // The come-back DM (schema 23): about the island, nothing else.
  away: "island",
};

export interface IslandPost {
  /** "#slot name" for every plot whose team chose to show its name, by slot. */
  signs: string[];
  files: AttachmentBuilder[];
}

/**
 * "#slot name" for every plot that carries a name, in slot order. The plots
 * must already be the outsider view (shift_quest_island_post_map or
 * shift_quest_live_post), where only fully consented plots have a name.
 */
export function islandSigns(plots: IslandPlot[]): string[] {
  return plots
    .filter((p) => p.name)
    .sort((a, b) => a.slot - b.slot)
    .map((p) => `#${p.slot} ${safePost(p.name, 40)}`);
}

/** The signs as one fine-print line: the first SIGNS_SHOWN, then how many more. Empty without signs. */
export function signsLine(signs: string[]): string {
  if (!signs.length) return "";
  const rest = signs.length - SIGNS_SHOWN;
  const shown = signs.slice(0, SIGNS_SHOWN).join(" · ");
  return `${I.signs} ${shown}${rest > 0 ? ` · ${I.more(rest)}` : ""}`;
}

/**
 * The weekly island post: the picture plus the names teams chose to show.
 * Drawn at send time from shift_quest_island_post_map(): every plot as an
 * outsider sees it, so a plot shows its real stage and name only once every
 * member consented; any other plot is a plain slot. No identities.
 */
async function islandPost(api: QuestApi): Promise<IslandPost> {
  const map = await api.call<{ plots: IslandPlot[]; season: unknown }>("shift_quest_island_post_map");
  const signs = islandSigns(map.plots);
  try {
    // No pin: in a channel post no plot is "mine".
    const image = renderIsland(map.plots, { scale: 2, festival: Boolean(map.season) });
    return { signs, files: [new AttachmentBuilder(image.png, { name: ISLAND_PNG, description: "เกาะ SHIFT" })] };
  } catch (error) {
    // A picture we cannot draw (an island too big, a bad plot) never blocks the post: the text still goes.
    console.error(`[shift-quests] island picture skipped: ${(error as Error).message}`);
    return { signs, files: [] };
  }
}

/** What shift_quest_tree_post says when a tree_grew post is sent (schema 16). */
interface TreePostRead {
  slot: number | null;
  title: string | null;
  /** Only while the team shows its name; null otherwise. */
  name: string | null;
  /** The active members' Discord ids, only while the team shows its name. */
  team_user_ids: string[];
}

/**
 * A tree_grew post's queued ids plus what the database says now: the plot,
 * the quest's title, and the team's name and members only while the team
 * shows its name. Read at send time, so a team that hid its name after the
 * approval is not named. The members are kept only with PING_NAMED_TEAMS.
 * A project that is gone fails the post permanently.
 */
export async function treeGrewParams(
  api: QuestApi,
  params: Record<string, unknown>,
  ping: boolean = PING_NAMED_TEAMS
): Promise<Record<string, unknown>> {
  const read = await api.call<TreePostRead | null>("shift_quest_tree_post", params.project_id ?? null, params.instance_id ?? null);
  if (!read) throw Object.assign(new Error("project gone"), { permanent: true });
  return {
    ...params,
    slot: read.slot,
    title: read.title,
    name: read.name,
    team_user_ids: ping && read.name ? read.team_user_ids ?? [] : [],
  };
}

function wholeNumber(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

/**
 * The tree_grew card: which team (its name only when shown, else
 * "ทีมปริศนา" with the plot number), which main quest, the new stage, a
 * cheer that pings the members of a named team, and for a mystery team a
 * light invitation to show its name. Words in TREE_GREW (./copy).
 */
export function renderTreeGrew(params: Record<string, any>): OutboxRender {
  const name = typeof params.name === "string" && params.name.trim() ? safePost(params.name, 60) : null;
  const title = typeof params.title === "string" && params.title.trim() ? safePost(params.title, 80) : null;
  const stage = wholeNumber(params.stage, 0, 7) ?? 0;
  const team = name && Array.isArray(params.team_user_ids)
    ? [...new Set(params.team_user_ids.filter((id: unknown): id is string => typeof id === "string" && SNOWFLAKE.test(id)))].slice(0, MAX_TEAM_PINGS)
    : [];
  const cheer = team.length ? `${team.map((id) => `<@${id}>`).join(" ")} ${TREE_GREW.cheer}` : TREE_GREW.cheer;
  return {
    title: TREE_GREW.title,
    body: [
      TREE_GREW.team(name, wholeNumber(params.slot, 1, Number.MAX_SAFE_INTEGER)),
      TREE_GREW.quest(wholeNumber(params.milestone, 1, 7), title),
      `${TREE_GREW.stageEmoji[stage]} ${stageBar(stage)} ${STAGE_NAMES[stage]} **${stage}**/7`,
      cheer,
    ].join("\n"),
    note: name ? "" : TREE_GREW.showName,
    mentionUserIds: team,
  };
}

/** Renders any queued kind; null for one the bot does not know (it fails permanently). */
export function renderDelivery(
  kind: string,
  params: Record<string, any>,
  memberUserId: string | null,
  peerUserId: string | null
): OutboxRender | null {
  return kind === "tree_grew" ? renderTreeGrew(params) : renderOutbox(kind, params, memberUserId, peerUserId);
}

/** "🌐 เปิดเกาะบนเว็บ" under a tree_grew post and in the come-back DM, when the island has an address. */
function islandRows(): Row[] {
  const button = islandLinkButton();
  return button ? [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] : [];
}

/**
 * The come-back DM's only row: the island's link button (a link, never an
 * interaction: the bot reads and answers nothing in a DM). Without an island
 * address the DM would point nowhere, so it fails permanently and nothing is
 * sent.
 */
export function awayRows(): Row[] {
  const rows = islandRows();
  if (!rows.length) throw Object.assign(new Error("no island address"), { permanent: true });
  return rows;
}

/**
 * Adds the bot's reactions under a post it just sent. The post already went
 * out, so a failure (no Add Reactions permission, a rate limit) is logged and
 * never fails the delivery: a retry would post the cheer twice.
 */
export async function addReactions(message: Pick<Message, "react">, emojis: readonly string[]): Promise<void> {
  for (const emoji of emojis) {
    try {
      await message.react(emoji);
    } catch (error) {
      const reason = error instanceof DiscordAPIError ? `discord ${error.code} (${error.status})` : (error as Error).message;
      console.error(`[shift-quests] reactions skipped: ${reason}`);
      return;
    }
  }
}

/**
 * The card for one delivery: a heading, the facts, the fine print. The
 * weekly island post adds the picture above the heading and the signs below;
 * rows (link buttons) sit at the bottom.
 */
export function outboxView(kind: string, post: OutboxRender, island: IslandPost | null = null, rows: Row[] = []): View {
  const blocks: Block[] = [];
  if (island?.files.length) blocks.push({ kind: "image", name: ISLAND_PNG, alt: "เกาะ SHIFT" });
  if (post.body) blocks.push({ kind: "text", text: post.body });
  if (island?.signs.length) blocks.push({ kind: "subtext", text: signsLine(island.signs) });
  if (post.note) blocks.push({ kind: "subtext", text: post.note });
  return { tone: OUTBOX_TONE[kind] ?? "neutral", title: post.title, blocks, rows, files: island?.files ?? [] };
}

/** Sends one claimed delivery as a card and returns the Discord message ID. */
export async function deliver(client: Client, api: QuestApi, msg: Claimed): Promise<string> {
  const tree = msg.kind === "tree_grew";
  const params = tree ? await treeGrewParams(api, msg.params) : msg.params;
  const post = renderDelivery(msg.kind, params, msg.member_user_id, msg.peer_user_id);
  if (!post) throw Object.assign(new Error(`unknown kind ${msg.kind}`), { permanent: true });
  const island = msg.kind === "island_weekly" ? await islandPost(api) : null;
  // The come-back DM is a DM or nothing: never a channel post.
  if (msg.kind === "away" && !msg.dm_user_id) throw Object.assign(new Error("away without a DM target"), { permanent: true });

  if (msg.dm_user_id) {
    // The come-back DM carries the island's link; every other DM no button at all.
    const rows = msg.kind === "away" ? awayRows() : [];
    const user = await client.users.fetch(msg.dm_user_id);
    // Pings nobody (renderView's default).
    const sent = await user.send(
      renderView(outboxView(msg.kind, post, null, rows), { ephemeral: false, action: msg.kind, commands: NO_COMMAND_LINKS })
    );
    return sent.id;
  }
  if (!msg.channel_id) throw new Error("no target");
  const channel = await client.channels.fetch(msg.channel_id);
  if (!channel || !channel.isSendable()) throw new Error("channel not sendable");
  const sent = await channel.send(
    renderView(outboxView(msg.kind, post, island, tree ? islandRows() : []), {
      ephemeral: false,
      action: msg.kind,
      // Only the people the post is about (help, celebration, a named team); never everyone or a role.
      allowedMentions: { users: post.mentionUserIds, parse: [] },
    })
  );
  if (tree) await addReactions(sent, TREE_GREW_REACTIONS);
  return sent.id;
}

/**
 * The minute block's come-back step (schema 23, ./away): never throws, so a
 * failure (or an older database) never holds back the deliveries. A failure
 * is logged when its reason changes, not every minute.
 */
export function awayStep(api: QuestApi, log: (line: string) => void = console.error): () => Promise<void> {
  let problem: string | null = null;
  return async () => {
    try {
      await enqueueAway(api);
      problem = null;
    } catch (error) {
      // The SQLSTATE or the refusal's code only: never a database message.
      const reason =
        error instanceof QuestDbError ? `SQLSTATE ${error.sqlstate}` : error instanceof QuestError ? `sq:${error.code}` : "unknown";
      if (reason !== problem) log(`[shift-quests] come-back DMs not queued this minute: ${reason}`);
      problem = reason;
    }
  };
}

export function startOutbox(client: Client, api: QuestApi, isConnected: () => boolean): { stop: () => Promise<void> } {
  let running: Promise<void> | null = null;
  let lastMinute = 0;
  let stopped = false;
  const away = awayStep(api);

  async function tick(): Promise<void> {
    if (!isConnected() || stopped) return;
    const now = Date.now();
    if (now - lastMinute >= MINUTE_MS) {
      lastMinute = now;
      await api.call("shift_quest_enqueue_reminders");
      await api.call("shift_quest_enqueue_island_post");
      await api.call("shift_quest_outbox_unblock");
      // The come-back DMs (schema 23): below it, only the version is read again, each minute.
      await away();
    }
    const due = await api.rows<Claimed>("shift_quest_outbox_claim", BATCH);
    try {
      fs.writeFileSync(HEALTH_FILE, new Date().toISOString());
    } catch {
      // Not in Docker; nothing reads it.
    }
    for (const msg of due) {
      try {
        const messageId = await deliver(client, api, msg);
        await api.call("shift_quest_outbox_done", msg.id, true, null, messageId, false);
      } catch (error) {
        const permanent =
          (error as { permanent?: boolean }).permanent === true ||
          (error instanceof DiscordAPIError && PERMANENT_CODES.has(Number(error.code)));
        // The code and status only: never the message content.
        const reason = error instanceof DiscordAPIError ? `discord ${error.code} (${error.status})` : (error as Error).message;
        console.error(`[shift-quests] delivery ${msg.kind} failed (attempt ${msg.attempts}): ${reason}`);
        await api.call("shift_quest_outbox_done", msg.id, false, reason, null, permanent);
      }
    }
  }

  const timer = setInterval(() => {
    if (running) return;
    running = tick()
      .catch((error) => console.error("[shift-quests] outbox tick failed:", (error as Error).message))
      .finally(() => {
        running = null;
      });
  }, TICK_MS);

  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      await running;
    },
  };
}
