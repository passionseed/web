import { ApplicationCommandOptionType, Routes, type ChatInputCommandInteraction, type RESTPostAPIChannelMessageJSONBody } from "discord.js";

import { ElementalError } from "../api";
import { notify, say, type ElCtx, type ElementalFeature, type ElementalRuntime } from "../context";
import { CANVAS, canvasErrorText, type CanvasUrlProblem } from "../copy/canvas";
import { isSnowflake, isUuid } from "../ids";
import { withRetry, type RetryOptions } from "../queue";
import { requirePaid } from "../roles";

/**
 * /canvas link url: (E17). A team member pastes the link to the team's
 * project canvas (a frame tagged customData.project on their element's
 * board), in the team's own channel:
 *
 * 1. Paid (or staff other than Judge), in a team channel: the shared channels
 *    from settings are refused before any database call; any other channel
 *    is resolved to a team in SQL (el:not_team_channel otherwise).
 * 2. The link is read here: https://passionseed.org/whiteboard/<board>?focus=<frame>
 *    (Excalidraw's own "copy link to object" ?element=<frame> works too). A
 *    link that is not that never reaches the database and is never echoed.
 * 3. elemental_bot_canvas_link checks the board, element, frame, ownership
 *    (a team member signed in to PassionSeed with Discord) and that no other
 *    team holds the frame. Each refusal gets its own line.
 * 4. On success the canonical link is pinned in the team channel; a relink
 *    unpins the bot's previous canvas pin there. A pin that fails costs
 *    nothing: the link stands in SQL and the reply says so.
 * 5. 'canvas.linked' is emitted so the canvas writer (E18) can write the
 *    team's pending notes onto the new canvas at once.
 *
 * Open boards only see notes the bot wrote after a reload
 * (components/whiteboard/useWhiteboardSync.ts), so every answer says so.
 */

export const CANVAS_COMMAND = "canvas";
export const LINK_SUBCOMMAND = "link";
export const URL_OPTION = "url";
export const CANVAS_LINK_FN = "elemental_bot_canvas_link";

/** Where the canonical link points. Boards live on the production site for both guilds. */
export const CANVAS_SITE = "https://passionseed.org";
const CANVAS_HOSTS = new Set(["passionseed.org", "www.passionseed.org"]);
/** Same as lib/shift-island/canvas-link.ts ELEMENT_ID (a parity test holds it), the id app/whiteboard/[id] accepts in ?focus=. */
export const FRAME_ID = /^[A-Za-z0-9_-]{1,100}$/;
const BOARD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Longer than any real board link; anything longer is not read at all. */
const MAX_URL = 2_000;
/** Excalidraw's "copy link to object" query key (ELEMENT_LINK_KEY in @excalidraw/excalidraw 0.18). */
const EXCALIDRAW_LINK_KEY = "element";

export type ParsedCanvasUrl = { ok: true; boardId: string; frameId: string } | { ok: false; problem: CanvasUrlProblem };

const fail = (problem: CanvasUrlProblem): ParsedCanvasUrl => ({ ok: false, problem });

/**
 * Reads a pasted canvas link: passionseed.org/whiteboard/<board uuid>?focus=<frame id>.
 * Tolerates a missing scheme, Discord's <...> wrapper, www., a trailing slash,
 * other query keys and a #hash. The board id comes back lowercased.
 */
export function parseCanvasUrl(input: unknown): ParsedCanvasUrl {
  let text = typeof input === "string" ? input.trim() : "";
  if (!text || text.length > MAX_URL) return fail("garbage");
  // "here: https://..." pasted with words around it: the first token that looks like a link.
  if (/\s/.test(text)) text = text.split(/\s+/).find((token) => /^<?(https?:\/\/|(www\.)?passionseed\.org)/i.test(token)) ?? "";
  if (text.startsWith("<") && text.endsWith(">")) text = text.slice(1, -1).trim();
  if (!text) return fail("garbage");
  if (text.startsWith("//")) text = `https:${text}`;
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) {
    // "passionseed.org/whiteboard/..." without a scheme; plain words stay garbage.
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#]|$)/i.test(text)) return fail("garbage");
    text = `https://${text}`;
  }
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return fail("garbage");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return fail("garbage");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.username || url.password || url.port || !CANVAS_HOSTS.has(host)) return fail("host");

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "whiteboard") return fail("not_board");
  if (parts[1] === "join") return fail("invite");
  if (parts.length !== 2 || !BOARD_ID.test(parts[1])) return fail("not_board");

  const frameId = url.searchParams.get("focus") ?? url.searchParams.get(EXCALIDRAW_LINK_KEY);
  if (frameId === null || frameId === "") return fail("missing_focus");
  if (!FRAME_ID.test(frameId)) return fail("bad_focus");
  return { ok: true, boardId: parts[1].toLowerCase(), frameId };
}

/** The link the bot pins and shows: the whiteboard opens with the frame in view. */
export function canvasUrl(boardId: string, frameId: string): string {
  return `${CANVAS_SITE}/whiteboard/${boardId.toLowerCase()}?focus=${encodeURIComponent(frameId)}`;
}

/** A canvas link inside one of the bot's own pins (it is the only one the bot ever pins). */
const PINNED_LINK = /https:\/\/passionseed\.org\/whiteboard\/([0-9a-fA-F-]{36})\?focus=([A-Za-z0-9_-]{1,100})/;

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

/** What elemental_bot_canvas_link (and _canvas_override) return. */
export interface CanvasLinkResult {
  team_id: string;
  slot: number | null;
  board_id: string;
  frame_id: string;
  already: boolean;
  replaced: { board_id: string; frame_id: string } | null;
  via: "member" | "staff";
}

declare module "../context" {
  interface ElementalEventMap {
    /**
     * A team's canvas link was made or moved (not emitted when it was already
     * that canvas). Every entry not removed is canvas_status 'pending' now:
     * the canvas writer (E18) may write them onto the new frame.
     */
    "canvas.linked": {
      guildId: string;
      edition: string;
      teamId: string;
      slot: number | null;
      boardId: string;
      frameId: string;
      replaced: { boardId: string; frameId: string } | null;
      via: "member" | "staff";
    };
  }
}

/** The line for a refusal of _canvas_link or _canvas_override, or null when the error is not one. */
export function canvasRefusal(error: unknown): string | null {
  return error instanceof ElementalError ? canvasErrorText(error.code, error.detail) : null;
}

// ---------------------------------------------------------------------------
// The pin
// ---------------------------------------------------------------------------

/** Bounded: the person is waiting on a deferred reply. */
export const PIN_RETRY: RetryOptions = { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 5_000 };

/**
 * - pinned: a new message with the link is posted and pinned;
 * - kept: the bot's pin for this exact link was already there;
 * - posted: the message is in the channel but Discord refused the pin;
 * - failed: nothing could be posted.
 */
export type PinOutcome = "pinned" | "kept" | "posted" | "failed";

interface Rest {
  get(route: string, options?: unknown): Promise<unknown>;
  post(route: string, options?: unknown): Promise<unknown>;
  put(route: string, options?: unknown): Promise<unknown>;
  delete(route: string, options?: unknown): Promise<unknown>;
}

function rest(rt: ElementalRuntime): Rest {
  return rt.client.rest as unknown as Rest;
}

function status(error: unknown): string {
  const e = error as { status?: number; code?: number | string; name?: string } | null;
  return String(e?.status ?? e?.code ?? e?.name ?? "error");
}

interface CanvasPin {
  messageId: string;
  url: string;
}

interface PinnedMessage {
  id?: unknown;
  content?: unknown;
  author?: { id?: unknown; bot?: unknown };
}

/** The bot's own canvas pins in the channel (newest first, as Discord lists them). */
async function canvasPins(rt: ElementalRuntime, channelId: string): Promise<CanvasPin[]> {
  const listed = (await withRetry(
    () => rest(rt).get(Routes.channelMessagesPins(channelId), { query: new URLSearchParams({ limit: "50" }) }),
    PIN_RETRY
  )) as { items?: { message?: PinnedMessage }[] } | PinnedMessage[] | null;
  const messages: PinnedMessage[] = Array.isArray(listed)
    ? listed
    : (listed?.items ?? []).map((item) => item?.message).filter((m): m is PinnedMessage => Boolean(m));
  const botId = rt.client.user?.id ?? null;
  const pins: CanvasPin[] = [];
  for (const message of messages) {
    const mine = botId ? message.author?.id === botId : message.author?.bot === true;
    if (!mine || !isSnowflake(message.id) || typeof message.content !== "string") continue;
    const match = PINNED_LINK.exec(message.content);
    if (match) pins.push({ messageId: message.id, url: canvasUrl(match[1], match[2]) });
  }
  return pins;
}

/** One pin change per channel at a time, so two links in a row cannot unpin each other. */
const PIN_LOCKS = new WeakMap<ElementalRuntime, Map<string, Promise<unknown>>>();

async function oneAtATime<T>(rt: ElementalRuntime, key: string, task: () => Promise<T>): Promise<T> {
  let locks = PIN_LOCKS.get(rt);
  if (!locks) {
    locks = new Map();
    PIN_LOCKS.set(rt, locks);
  }
  const run = (locks.get(key) ?? Promise.resolve()).then(task);
  const tail = run.then(
    () => undefined,
    () => undefined
  );
  locks.set(key, tail);
  try {
    return await run;
  } finally {
    if (locks.get(key) === tail) locks.delete(key);
  }
}

export interface PinInput {
  url: string;
  slot: number | null;
  /** Who linked it, shown as a mention that pings nobody; null for none. */
  linkedBy: string | null;
}

export function pinBody(input: PinInput): RESTPostAPIChannelMessageJSONBody {
  const who = input.linkedBy && isSnowflake(input.linkedBy) ? `<@${input.linkedBy}>` : null;
  return { content: CANVAS.pinPost({ slot: input.slot, url: input.url, who }), allowed_mentions: { parse: [] } };
}

/**
 * Makes the team channel's pinned canvas link match input.url: keeps the
 * bot's pin when it already shows that link, else posts and pins a new one;
 * then unpins the bot's other canvas pins (the relink case). Other pins (the
 * team welcome, anything people pinned) are never touched. Never throws.
 * Exported for E20's /el canvas-link, which knows the team channel.
 */
export async function syncCanvasPin(rt: ElementalRuntime, channelId: string, input: PinInput): Promise<PinOutcome> {
  return oneAtATime(rt, channelId, async () => {
    let pins: CanvasPin[] = [];
    try {
      pins = await canvasPins(rt, channelId);
    } catch (error) {
      // Without the list the old pin cannot be found; the new one still goes up.
      console.warn(`[elemental] canvas pins not listed: ${status(error)}`);
    }

    let outcome: PinOutcome;
    if (pins.some((p) => p.url === input.url)) {
      outcome = "kept";
    } else {
      let messageId: string | null = null;
      try {
        const sent = (await withRetry(
          () => rest(rt).post(Routes.channelMessages(channelId), { body: pinBody(input) }),
          PIN_RETRY
        )) as { id?: unknown } | null;
        messageId = isSnowflake(sent?.id) ? sent.id : null;
      } catch (error) {
        console.warn(`[elemental] canvas link not posted: ${status(error)}`);
        return "failed";
      }
      if (!messageId) return "posted";
      try {
        await withRetry(() => rest(rt).put(Routes.channelMessagesPin(channelId, messageId)), PIN_RETRY);
        outcome = "pinned";
      } catch (error) {
        // Discord refused (no Pin Messages permission, or the channel's pin cap): the old pin stays.
        console.warn(`[elemental] canvas link not pinned: ${status(error)}`);
        return "posted";
      }
    }

    for (const stale of pins) {
      if (stale.url === input.url) continue;
      try {
        await withRetry(() => rest(rt).delete(Routes.channelMessagesPin(channelId, stale.messageId)), PIN_RETRY);
      } catch (error) {
        console.warn(`[elemental] old canvas pin not removed: ${status(error)}`);
      }
    }
    return outcome;
  });
}

// ---------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------

const PIN_LINE: Record<PinOutcome, string> = {
  pinned: CANVAS.pinned,
  kept: CANVAS.pinKept,
  posted: CANVAS.pinPostedOnly,
  failed: CANVAS.pinFailed,
};

function isSharedChannel(ctx: ElCtx, channelId: string): boolean {
  return Object.values(ctx.settings.channels).includes(channelId);
}

async function runLink(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  requirePaid(ctx);
  const channelId = ctx.channelId;
  if (!channelId || isSharedChannel(ctx, channelId)) {
    await notify(i, CANVAS.notTeamChannel);
    return;
  }

  const parsed = parseCanvasUrl(i.options.getString(URL_OPTION, false));
  if (!parsed.ok) {
    await notify(i, CANVAS.url[parsed.problem]);
    return;
  }

  let result: CanvasLinkResult;
  try {
    result = await ctx.api.call<CanvasLinkResult>(CANVAS_LINK_FN, ctx.guildId, channelId, parsed.boardId, parsed.frameId, ctx.userId);
  } catch (error) {
    const text = canvasRefusal(error);
    if (!text) throw error;
    await notify(i, text);
    return;
  }
  if (!result || !isUuid(result.team_id)) throw new ElementalError("failed", undefined, CANVAS_LINK_FN);

  const boardId = isUuid(result.board_id) ? result.board_id : parsed.boardId;
  const frameId = typeof result.frame_id === "string" && FRAME_ID.test(result.frame_id) ? result.frame_id : parsed.frameId;
  const slot = typeof result.slot === "number" ? result.slot : null;
  const url = canvasUrl(boardId, frameId);

  const pin = await syncCanvasPin(ctx.rt, channelId, { url, slot, linkedBy: ctx.userId });

  const lines = result.already
    ? [CANVAS.alreadyLinked, `<${url}>`, PIN_LINE[pin], CANVAS.reload]
    : [CANVAS.linked(slot), `<${url}>`, ...(result.replaced ? [CANVAS.replaced] : []), PIN_LINE[pin], CANVAS.reload];
  await say(i, lines.join("\n"));

  if (!result.already) {
    await ctx.rt.events.emit("canvas.linked", {
      guildId: ctx.guildId,
      edition: ctx.settings.edition,
      teamId: result.team_id,
      slot,
      boardId,
      frameId,
      replaced: result.replaced ? { boardId: result.replaced.board_id, frameId: result.replaced.frame_id } : null,
      via: result.via === "staff" ? "staff" : "member",
    });
  }
}

export const feature: ElementalFeature = {
  name: "canvas",
  commands: [
    {
      name: CANVAS_COMMAND,
      description: CANVAS.commandDescription,
      options: [
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: LINK_SUBCOMMAND,
          description: CANVAS.linkDescription,
          options: [
            {
              type: ApplicationCommandOptionType.String,
              name: URL_OPTION,
              description: CANVAS.urlDescription,
              required: true,
              min_length: 10,
              max_length: 500,
            },
          ],
        },
      ],
    },
  ],
  commandHandlers: {
    // Deferred (ephemeral) before the database call; the pin is the team-visible part.
    [`${CANVAS_COMMAND} ${LINK_SUBCOMMAND}`]: { ack: "ephemeral", run: runLink },
  },
};
