import fs from "node:fs";

import { AttachmentBuilder, DiscordAPIError, type Client } from "discord.js";

import type { QuestApi } from "./api";
import { renderOutbox, safe } from "./copy";
import { renderIsland, type IslandPlot } from "./island/render";
import { NO_MENTIONS } from "./ui";

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

interface Claimed {
  id: string;
  kind: string;
  params: Record<string, unknown>;
  channel_id: string | null;
  dm_user_id: string | null;
  member_user_id: string | null;
  peer_user_id: string | null;
  attempts: number;
}

/**
 * The weekly island post: the picture plus the names teams chose to show.
 * Drawn at send time from shift_quest_island_post_map(): every plot as an
 * outsider sees it, so a plot shows its real stage and name only once every
 * member consented; any other plot is a plain slot. No identities.
 */
async function islandAttachment(api: QuestApi, content: string): Promise<{ content: string; files: AttachmentBuilder[] }> {
  const map = await api.call<{ plots: IslandPlot[]; season: unknown }>("shift_quest_island_post_map");
  const signs = map.plots
    .filter((p) => p.name)
    .map((p) => `#${p.slot} ${safe(p.name, 40)}`)
    .slice(0, 30);
  const text = signs.length ? `${content}\n🪧 ${signs.join(" · ")}` : content;
  try {
    // No pin: in a channel post no plot is "mine".
    const image = renderIsland(map.plots, { scale: 2, festival: Boolean(map.season) });
    return { content: text, files: [new AttachmentBuilder(image.png, { name: "shift-island.png", description: "เกาะ SHIFT" })] };
  } catch (error) {
    // A picture we cannot draw (an island too big, a bad plot) never blocks the post.
    console.error(`[shift-quests] island picture skipped: ${(error as Error).message}`);
    return { content: text, files: [] };
  }
}

async function send(client: Client, api: QuestApi, msg: Claimed): Promise<string> {
  const rendered = renderOutbox(msg.kind, msg.params, msg.member_user_id, msg.peer_user_id);
  if (!rendered) throw Object.assign(new Error(`unknown kind ${msg.kind}`), { permanent: true });
  const extra = msg.kind === "island_weekly" ? await islandAttachment(api, rendered.content) : null;
  const payload = {
    content: extra?.content ?? rendered.content,
    files: extra?.files ?? [],
    allowedMentions: { users: rendered.mentionUserIds, parse: [] as [] },
  };

  if (msg.dm_user_id) {
    const user = await client.users.fetch(msg.dm_user_id);
    const sent = await user.send({ content: rendered.content, allowedMentions: NO_MENTIONS });
    return sent.id;
  }
  if (!msg.channel_id) throw new Error("no target");
  const channel = await client.channels.fetch(msg.channel_id);
  if (!channel || !channel.isSendable()) throw new Error("channel not sendable");
  const sent = await channel.send(payload);
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
        const messageId = await send(client, api, msg);
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
