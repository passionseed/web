import fs from "node:fs";

import { AttachmentBuilder, DiscordAPIError, type Client } from "discord.js";

import type { QuestApi } from "./api";
import { renderOutbox, safePost, type OutboxRender } from "./copy";
import { I } from "./island/copy";
import { renderIsland, type IslandPlot } from "./island/render";
import { renderView, type Block, type Tone, type View } from "./view";

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
  celebration: "success",
  recognition: "success",
  island_weekly: "island",
};

export interface IslandPost {
  /** "#slot name" for every plot whose team chose to show its name, by slot. */
  signs: string[];
  files: AttachmentBuilder[];
}

/**
 * The weekly island post: the picture plus the names teams chose to show.
 * Drawn at send time from shift_quest_island_post_map(): every plot as an
 * outsider sees it, so a plot shows its real stage and name only once every
 * member consented; any other plot is a plain slot. No identities.
 */
async function islandPost(api: QuestApi): Promise<IslandPost> {
  const map = await api.call<{ plots: IslandPlot[]; season: unknown }>("shift_quest_island_post_map");
  const signs = map.plots
    .filter((p) => p.name)
    .sort((a, b) => a.slot - b.slot)
    .map((p) => `#${p.slot} ${safePost(p.name, 40)}`);
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

/**
 * The card for one delivery: a heading, the facts, the fine print. The
 * weekly island post adds the picture above the heading and the signs below.
 */
export function outboxView(kind: string, post: OutboxRender, island: IslandPost | null = null): View {
  const blocks: Block[] = [];
  if (island?.files.length) blocks.push({ kind: "image", name: ISLAND_PNG, alt: "เกาะ SHIFT" });
  if (post.body) blocks.push({ kind: "text", text: post.body });
  if (island?.signs.length) {
    const rest = island.signs.length - SIGNS_SHOWN;
    const shown = island.signs.slice(0, SIGNS_SHOWN).join(" · ");
    blocks.push({ kind: "subtext", text: `${I.signs} ${shown}${rest > 0 ? ` · ${I.more(rest)}` : ""}` });
  }
  if (post.note) blocks.push({ kind: "subtext", text: post.note });
  return { tone: OUTBOX_TONE[kind] ?? "neutral", title: post.title, blocks, files: island?.files ?? [] };
}

/** Sends one claimed delivery as a card and returns the Discord message ID. */
export async function deliver(client: Client, api: QuestApi, msg: Claimed): Promise<string> {
  const post = renderOutbox(msg.kind, msg.params, msg.member_user_id, msg.peer_user_id);
  if (!post) throw Object.assign(new Error(`unknown kind ${msg.kind}`), { permanent: true });
  const island = msg.kind === "island_weekly" ? await islandPost(api) : null;

  if (msg.dm_user_id) {
    const user = await client.users.fetch(msg.dm_user_id);
    // Pings nobody (renderView's default).
    const sent = await user.send(
      renderView(outboxView(msg.kind, post), { ephemeral: false, action: msg.kind, commands: NO_COMMAND_LINKS })
    );
    return sent.id;
  }
  if (!msg.channel_id) throw new Error("no target");
  const channel = await client.channels.fetch(msg.channel_id);
  if (!channel || !channel.isSendable()) throw new Error("channel not sendable");
  const sent = await channel.send(
    renderView(outboxView(msg.kind, post, island), {
      ephemeral: false,
      action: msg.kind,
      // Only the people the post is about (help, celebration); never everyone or a role.
      allowedMentions: { users: post.mentionUserIds, parse: [] },
    })
  );
  return sent.id;
}

export function startOutbox(client: Client, api: QuestApi, isConnected: () => boolean): { stop: () => Promise<void> } {
  let running: Promise<void> | null = null;
  let lastMinute = 0;
  let stopped = false;

  async function tick(): Promise<void> {
    if (!isConnected() || stopped) return;
    const now = Date.now();
    if (now - lastMinute >= MINUTE_MS) {
      lastMinute = now;
      await api.call("shift_quest_enqueue_reminders");
      await api.call("shift_quest_enqueue_island_post");
      await api.call("shift_quest_outbox_unblock");
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
