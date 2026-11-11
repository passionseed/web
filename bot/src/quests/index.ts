import { Events, type Client, type Interaction } from "discord.js";

import type { ShiftQuestsEnv } from "../env";
import { createRolePool } from "../pg";
import { QuestDbError, createQuestApi, type QuestApi } from "./api";
import { loadCtx, requireStudent } from "./context";
import { admin } from "./handlers/admin";
import { island } from "./handlers/island";
import { squad } from "./handlers/squad";
import { journal } from "./handlers/journal";
import { project, newProjectModal } from "./handlers/project";
import { browse, proposeModal, quest } from "./handlers/quest";
import { review } from "./handlers/review";
import { student } from "./handlers/student";
import type { ActionHandler, AutocompleteHandler, CommandHandler, HandlerSet } from "./handlers/types";
import { parseCid } from "./ids";
import { commandIdMap, setCommandIds, showError } from "./ui";
import { startOutbox } from "./outbox";

export { registerQuestCommands } from "./commands";

const SETS: HandlerSet[] = [student, project, quest, journal, review, admin, island, squad];

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

export async function handleInteraction(api: QuestApi, guildId: string, i: Interaction): Promise<void> {
  if (!i.inGuild() || i.guildId !== guildId) return;

  if (i.isAutocomplete()) {
    const handler = AUTOCOMPLETE_HANDLERS.get(commandKey(i) ?? "");
    if (!handler) return;
    try {
      await handler(i, await loadCtx(api, i));
    } catch {
      await i.respond([]).catch(() => undefined);
    }
    return;
  }

  if (i.isChatInputCommand()) {
    const handler = COMMAND_HANDLERS.get(commandKey(i) ?? "");
    if (!handler) return;
    try {
      await handler(i, await loadCtx(api, i));
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
      await handler(i, await loadCtx(api, i), parsed.args);
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
 * bot starts to depend on.
 */
export const REQUIRED_SCHEMA = 2;

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
 * shift_quest_* database functions, plus the delivery loop. The bot never
 * reads message content, never joins voice and records nothing passively.
 * Checks the database schema first and throws (starting nothing) when the
 * database is older than this bot.
 */
export async function registerShiftQuests(client: Client, env: ShiftQuestsEnv): Promise<{ stop: () => Promise<void> }> {
  const pool = createRolePool(env.databaseUrl, "shift-quests");
  const api = createQuestApi(pool);
  try {
    const version = await checkQuestSchema(api);
    console.log(`[shift-quests] database schema ${version} (bot needs ${REQUIRED_SCHEMA})`);
  } catch (error) {
    await pool.end().catch(() => undefined);
    throw error;
  }
  let connected = false;

  client.on(Events.InteractionCreate, (i) => {
    void handleInteraction(api, env.guildId, i);
  });
  client.once(Events.ClientReady, (ready) => {
    void loadCommandIds(ready, env.guildId);
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

  return {
    async stop() {
      await outbox.stop();
      await pool.end();
    },
  };
}
