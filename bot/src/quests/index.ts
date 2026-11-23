import { Events, type Client, type Interaction } from "discord.js";

import type { ShiftQuestsEnv } from "../env";
import { createRolePool } from "../pg";
import { QuestDbError, createQuestApi, type QuestApi } from "./api";
import { campfireFor, startCampfire, type Campfire } from "./campfire";
import { loadCtx, requireStudent, type Ctx } from "./context";
import { admin } from "./handlers/admin";
import { island } from "./handlers/island";
import { panel } from "./handlers/panel";
import { board } from "./handlers/board";
import { rounds } from "./handlers/rounds";
import { squad } from "./handlers/squad";
import { journal } from "./handlers/journal";
import { project, newProjectModal } from "./handlers/project";
import { browse, proposeModal, quest } from "./handlers/quest";
import { review } from "./handlers/review";
import { student } from "./handlers/student";
import { tree } from "./handlers/tree";
import type { ActionHandler, AutocompleteHandler, CommandHandler, HandlerSet } from "./handlers/types";
import { parseCid } from "./ids";
import { startCall, type CallLoop } from "./call";
import { startDeepFire } from "./deepfire";
import { digestFor, startDigestPost } from "./digest";
import { liveFor, startLivePost } from "./live";
import { newsFor, startNewsPost } from "./news";
import { startRounds } from "./rounds";
import { chimeEnabled, createCampfireVoice, restMusicEnabled } from "./chime";
import { warmStory } from "./story";
import { commandIdMap, setCommandIds, showError } from "./ui";
import { startOutbox } from "./outbox";

export { registerQuestCommands } from "./commands";

const SETS: HandlerSet[] = [student, project, quest, journal, review, admin, island, squad, panel, rounds, board, tree];

function merge<T>(pick: (set: HandlerSet) => Record<string, T> | undefined): Map<string, T> {
  const map = new Map<string, T>();
  for (const set of SETS) {
    for (const [key, handler] of Object.entries(pick(set) ?? {})) {
      if (map.has(key)) throw new Error(`Duplicate quest handler: ${key}`);
      map.set(key, handler);
    }
  }
  return map;
}

export const COMMAND_HANDLERS = merge<CommandHandler>((s) => s.commands);
export const ACTION_HANDLERS = merge<ActionHandler>((s) => s.actions);
const AUTOCOMPLETE_HANDLERS = merge<AutocompleteHandler>((s) => s.autocomplete);

/** "Next step" buttons after /start reuse the commands' own flows. */
ACTION_HANDLERS.set("nav", async (i, ctx, [where]) => {
  requireStudent(ctx);
  if (where === "browse") return browse(i, ctx, true);
  if (where === "island") return ACTION_HANDLERS.get("is_view")!(i, ctx, []);
  if (!i.isButton()) return;
  if (where === "project_new") return i.showModal(newProjectModal());
  if (where === "propose") return i.showModal(proposeModal());
});

function commandKey(i: Interaction): string | null {
  if (!i.isChatInputCommand() && !i.isAutocomplete()) return null;
  const sub = i.options.getSubcommand(false);
  return sub ? `${i.commandName} ${sub}` : i.commandName;
}

export async function handleInteraction(api: QuestApi, guildId: string, i: Interaction, extras: Pick<Ctx, "campfire"> = {}): Promise<void> {
  if (!i.inGuild() || i.guildId !== guildId) return;

  if (i.isAutocomplete()) {
    const handler = AUTOCOMPLETE_HANDLERS.get(commandKey(i) ?? "");
    if (!handler) return;
    try {
      await handler(i, await loadCtx(api, i, extras));
    } catch {
      await i.respond([]).catch(() => undefined);
    }
    return;
  }

  if (i.isChatInputCommand()) {
    const handler = COMMAND_HANDLERS.get(commandKey(i) ?? "");
    if (!handler) return;
    try {
      await handler(i, await loadCtx(api, i, extras));
    } catch (error) {
      await showError(i, error);
    }
    return;
  }

  if (i.isMessageComponent() || i.isModalSubmit()) {
    const parsed = parseCid(i.customId);
    if (!parsed) return; // another module's component
    const handler = ACTION_HANDLERS.get(parsed.action);
    if (!handler) return;
    try {
      await handler(i, await loadCtx(api, i, extras), parsed.args);
    } catch (error) {
      await showError(i, error);
    }
  }
}

/**
 * The island schema this bot needs (public.shift_quest_schema_version()):
 * 1 is the island core (20261111090700_shift_quests_island), 2 adds seasons,
 * squads and the weekly post (20261111090800_shift_quests_seasons), which the
 * handlers and the delivery loop call. 3 (20261111090900_shift_quests_board)
 * adds the web quest board and side quests; this bot uses nothing from it and
 * works with it (shift_quest_templates leaves side quests out of its browse),
 * so it still needs only 2. Raise it with every migration whose contract the
 * bot starts to depend on. 7 (20261111093000_shift_quest_campfire) adds the
 * campfire; it is optional: below 7 the bot runs without it (CAMPFIRE_SCHEMA).
 * 8 (20261111094000_shift_quest_live) adds the live island post and the live
 * and suggest channel settings; also optional: below 8 the bot runs without
 * the live post (LIVE_SCHEMA).
 * 9 (20261111095000_shift_quest_player) adds the daily island news post;
 * also optional: below 9 the bot runs without it (DIGEST_SCHEMA).
 * 10 (20261113090000_shift_quest_roots) adds tree roots from reflections;
 * also optional: below 10 every tree is drawn without roots (ROOTS_SCHEMA).
 * 13 (20261114120000_shift_quest_tree_style) adds seeds, tree looks and gifts
 * (handlers/tree.ts); also optional: below 13 there are no tree buttons and
 * no gifts, and a round closes with shift_quest_round_close (TREE_SCHEMA).
 * 19 (20261118130000_shift_quest_island_news_daily) adds the nightly island
 * news card in the news channel; also optional: below 19 the bot runs without
 * it (NEWS_SCHEMA).
 * 20 (20261118140000_shift_quest_island_news_missed) adds the staff note when
 * the card did not post by 22:30; also optional: below 20 the card runs
 * without it, and reads the version again each check (NEWS_MISSED_SCHEMA).
 * 21 (20261118150000_shift_quest_campfire_call) adds the 18:50 campfire call
 * in the news channel and the evening guest's drop; also optional: below 21
 * the call loop only reads the version again each check and starts by itself
 * once the migration is applied (CALL_SCHEMA in call.ts).
 * 22 (20261120120000_shift_quest_deep_fire) adds the deep fire: a lobby voice
 * channel where joining builds a locked room of one's own; also optional:
 * below 22 the module only reads the version again each heartbeat and starts
 * by itself once the migration is applied (DEEPFIRE_SCHEMA in deepfire.ts).
 * 23 (20261121090000_shift_quest_away) adds the come-back DM (outbox kind
 * 'away') and its /settings line; also optional: below 23 the delivery loop
 * only reads the version again each minute and starts queueing by itself once
 * the migration is applied, and /settings shows no come-back line
 * (AWAY_SCHEMA in away.ts).
 */
export const REQUIRED_SCHEMA = 2;

/** The island schema that adds roots: read where the pictures are drawn (island/roots.ts). */
export { ROOTS_SCHEMA } from "./island/roots";

/**
 * Reads the database's island schema and refuses to start a bot that is newer
 * than its database: otherwise the first student to press a season button,
 * and the delivery loop every minute, would hit a missing function. A missing
 * version function (SQLSTATE 42883) means not even the island core is applied.
 */
export async function checkQuestSchema(api: QuestApi): Promise<number> {
  let version: number;
  try {
    version = Number(await api.call<number>("shift_quest_schema_version"));
  } catch (error) {
    if (error instanceof QuestDbError && error.sqlstate === "42883") {
      version = 0;
    } else {
      const reason = error instanceof QuestDbError ? `SQLSTATE ${error.sqlstate}` : (error as Error)?.name ?? "unknown";
      throw new Error(
        `[shift-quests] could not read the quest database schema version (${reason}). Check SHIFT_QUEST_DATABASE_URL and that the database is reachable; nothing was started.`
      );
    }
  }
  if (!Number.isInteger(version) || version < REQUIRED_SCHEMA) {
    throw new Error(
      `[shift-quests] this bot needs quest database schema ${REQUIRED_SCHEMA}, but the database has ${version}. ` +
        "Apply the shift_quest migrations up to 20261111090800_shift_quests_seasons.sql (supabase db push, after an explicit go), " +
        "then start the bot again; nothing was started."
    );
  }
  return version;
}

/**
 * Reads the guild's slash command IDs once logged in, so "/island" in bot
 * copy becomes a clickable command mention. Without them the copy stays
 * plain text; nothing else depends on this.
 */
export async function loadCommandIds(client: Client<true>, guildId: string): Promise<void> {
  try {
    const commands = await client.application.commands.fetch({ guildId });
    const ids = commandIdMap(commands.values());
    setCommandIds(ids);
    console.log(`[shift-quests] ${ids.size} command mention(s) ready`);
  } catch (error) {
    console.error(`[shift-quests] command mentions off: ${(error as Error)?.name ?? "unknown"} ${(error as Error)?.message ?? ""}`);
  }
}

/**
 * SHIFT High quests: slash commands, buttons and modals over the
 * shift_quest_* database functions, plus the delivery loop, from schema 7 the
 * island campfire, and from schema 8 the live island post (live.ts: one
 * message the bot keeps editing). The bot never reads message content. The
 * one thing it notices on its own is who is in the coworking voice
 * channel right now (campfire.ts): never audio, deleted on leave, no history.
 * From schema 22 it also keeps the deep fire's rooms (deepfire.ts): builds a
 * locked room for whoever joins the lobby, disconnects anyone else who gets
 * in, and deletes a room once it is empty, storing nothing per person.
 * Checks the database schema first and throws (starting nothing) when the
 * database is older than this bot.
 */
export async function registerShiftQuests(client: Client, env: ShiftQuestsEnv): Promise<{ stop: () => Promise<void> }> {
  const pool = createRolePool(env.databaseUrl, "shift-quests");
  const api = createQuestApi(pool);
  let version: number;
  try {
    version = await checkQuestSchema(api);
    console.log(`[shift-quests] database schema ${version} (bot needs ${REQUIRED_SCHEMA})`);
  } catch (error) {
    await pool.end().catch(() => undefined);
    throw error;
  }
  let connected = false;
  /** Set below once the campfire starts; /island reads who sits there for its picture. */
  let campfire: Campfire | null = null;
  const extras: Pick<Ctx, "campfire"> = { campfire: () => campfire?.status() ?? { channel: null, sitters: 0 } };

  client.on(Events.InteractionCreate, (i) => {
    void handleInteraction(api, env.guildId, i, extras);
  });
  client.once(Events.ClientReady, (ready) => {
    void loadCommandIds(ready, env.guildId);
    // The story's pictures, drawn now so the first /start never waits on them.
    warmStory();
  });
  client.on(Events.ShardReady, () => {
    connected = true;
  });
  client.on(Events.ShardResume, () => {
    connected = true;
  });
  client.on(Events.ShardDisconnect, () => {
    connected = false;
  });
  client.on(Events.ShardReconnecting, () => {
    connected = false;
  });

  const outbox = startOutbox(client, api, () => connected);
  // Started only on a database that has the campfire functions (schema 7).
  campfire = campfireFor(version, () => startCampfire(client, api, env.guildId, () => connected));
  /** The 18:50 campfire call; the rounds read tonight's evening guest from it. */
  let call: CallLoop | null = null;
  // Focus and rest rounds in the campfire's chat, only while someone sits at it (rounds.ts).
  // Sound in the voice channel (chime.ts): a chime as each focus starts, and
  // music that fades in before each rest. SHIFT_ROUND_CHIME=off mutes all of
  // it, SHIFT_REST_MUSIC=off only the music.
  const voice = chimeEnabled() ? createCampfireVoice(client, { music: restMusicEnabled() }) : null;
  const roundLoop = campfire
    ? startRounds(client, campfire, {
        evening: (nowMs) => call?.evening(nowMs) ?? null,
        ...(voice ? { chime: voice.chime, restMusic: voice.restMusic } : {}),
      })
    : null;
  // The campfire call in the news channel and the evening guest (schema 21): one call a day, one role ping at most.
  // Started with the campfire; below schema 21 it only reads the version again each check.
  call = campfire ? startCall(client, api, { guildId: env.guildId, connected: () => connected, campfire, schema: version }) : null;
  // Started only on a database that has the live post functions (schema 8).
  const live = liveFor(version, () => startLivePost(client, api, env.guildId, () => connected));
  // Started only on a database that has the island news functions (schema 9): one post a day, no pings.
  const digest = digestFor(version, () => startDigestPost(client, api, { guildId: env.guildId, connected: () => connected }));
  // Started only on a database that has the nightly island news functions (schema 19): one card a night, no pings.
  // From schema 20 each check also queues the staff note for a missed night (it reads the version again until then).
  const news = newsFor(version, () =>
    startNewsPost(client, api, { guildId: env.guildId, connected: () => connected, schema: version })
  );
  // The deep fire (schema 22): a locked room of one's own for whoever joins the lobby. Below 22 it only reads the
  // version again each heartbeat (no listener, no other call) and starts by itself once the migration is applied.
  const deepfire = startDeepFire(client, api, { guildId: env.guildId, connected: () => connected, schema: version });

  return {
    async stop() {
      // The deep fire: it waits for running work (a few seconds at most, so the modules below still stop before the
      // deploy's kill) and leaves every room as it is (a restart picks them up), then tells the database it is not
      // ready, so it still needs the pool.
      await deepfire.stop();
      // The campfire call: it waits for a running check, then sends and edits nothing more.
      await call?.stop();
      // The nightly island news card: it waits for a running check, then sends nothing more.
      await news?.stop();
      // The island news post: it waits for a running check, then posts nothing more.
      await digest?.stop();
      // The live post: it leaves its message as it is, so it only waits for a running edit.
      await live?.stop();
      // The rounds: their message goes, since no bot would keep it.
      await roundLoop?.stop();
      // Then the campfire: it still needs the pool to clear the campfire.
      await campfire?.stop();
      await outbox.stop();
      await pool.end();
    },
  };
}
