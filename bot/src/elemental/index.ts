import { Events, REST, type Client, type Interaction } from "discord.js";

import { upsertGuildCommands, type CommandRest } from "../commands";
import { createRolePool } from "../pg";
import { createElementalApi, type ElementalApi } from "./api";
import {
  createEvents,
  createSettingsCache,
  isElementalGuild,
  notify,
  runWithAck,
  settingsFast,
  buildCtx,
  type ElementalRuntime,
  type ElementalEventName,
  type ElementalListener,
  type StopFn,
} from "./context";
import { COMMON } from "./copy/common";
import type { ElementalEnv } from "./env";
import { startHeartbeat, type Heartbeat } from "./heartbeat";
import { parseCid } from "./ids";
import { createKeyedQueue } from "./queue";
import { registry, type Registry } from "./registry";

/**
 * The Elemental hackathon module (BOT_MODULES=elemental, alone in container
 * passionseed-discord-bot-elemental). Serves every guild in
 * ELEMENTAL_GUILD_IDS (the real guild and the rehearsal guild); each guild's
 * settings row says which edition it writes to.
 *
 * It never sends a DM (a grep test holds that) and never reads message
 * content: slash commands, buttons and modals only.
 */

function commandKey(i: Interaction): string | null {
  if (!i.isChatInputCommand() && !i.isAutocomplete()) return null;
  const sub = i.options.getSubcommand(false);
  return sub ? `${i.commandName} ${sub}` : i.commandName;
}

/** Routes one interaction. Ignores other guilds and other modules' custom ids; never throws. */
export async function handleElementalInteraction(rt: ElementalRuntime, i: Interaction, reg: Registry = registry()): Promise<void> {
  if (!isElementalGuild(rt.env.guildIds, i) || !i.inGuild()) return;
  try {
    if (i.isAutocomplete()) {
      const handler = reg.autocomplete.get(commandKey(i) ?? "");
      if (!handler) return;
      try {
        const settings = await settingsFast(rt, i.guildId);
        if (!settings) return void (await i.respond([]));
        await handler.run(i, buildCtx(rt, i, settings));
      } catch {
        await i.respond([]).catch(() => undefined);
      }
      return;
    }

    if (i.isChatInputCommand()) {
      const key = commandKey(i) ?? "";
      const handler = reg.commandHandlers.get(key);
      if (!handler) {
        // Registered but not built yet (a stub feature): say so instead of letting Discord time out.
        await runWithAck(rt, i, { ack: "ephemeral" }, `/${key}`, () => notify(i, COMMON.notAvailable));
        return;
      }
      await runWithAck(rt, i, handler, `/${key}`, (ctx) => handler.run(i, ctx));
      return;
    }

    if (i.isMessageComponent() || i.isModalSubmit()) {
      const parsed = parseCid(i.customId);
      if (!parsed) return; // not ours
      const handler = reg.actions.get(parsed.action);
      if (!handler) return;
      await runWithAck(rt, i, handler, `el|${parsed.action}`, (ctx) => handler.run(i, ctx, parsed.args));
    }
  } catch (error) {
    console.error(`[elemental] interaction failed: ${(error as Error)?.name ?? "error"}`);
  }
}

export interface RuntimeDeps {
  client: Client;
  api: ElementalApi;
  env: ElementalEnv;
  connected?: () => boolean;
}

export function createRuntime(deps: RuntimeDeps): ElementalRuntime {
  return {
    client: deps.client,
    api: deps.api,
    env: deps.env,
    settings: createSettingsCache(deps.api),
    queues: { channels: createKeyedQueue("channels"), canvas: createKeyedQueue("canvas") },
    events: createEvents(),
    connected: deps.connected ?? (() => true),
  };
}

/** The heartbeat's ping: every guild's settings, which also refreshes the cache. */
export function settingsPing(rt: ElementalRuntime): () => Promise<void> {
  return async () => {
    await Promise.all(rt.env.guildIds.map((guildId) => rt.settings.refresh(guildId)));
  };
}

/** Wires listeners and starts every feature. A feature whose start throws is disabled, alone. */
export async function startFeatures(rt: ElementalRuntime, reg: Registry = registry()): Promise<{ name: string; stop: StopFn }[]> {
  const stops: { name: string; stop: StopFn }[] = [];
  for (const feature of reg.features) {
    for (const [name, listener] of Object.entries(feature.events ?? {})) {
      if (!listener) continue;
      const bound = (payload: unknown) => (listener as (p: unknown, r: ElementalRuntime) => Promise<void> | void)(payload, rt);
      rt.events.on(name as ElementalEventName, bound as ElementalListener<ElementalEventName>);
    }
    if (!feature.start) continue;
    try {
      const stop = await feature.start(rt);
      if (stop) stops.push({ name: feature.name, stop });
    } catch (error) {
      console.error(`[elemental] feature ${feature.name} failed to start and is off: ${(error as Error)?.name ?? "error"}`);
    }
  }
  return stops;
}

/**
 * Starts the module. Never throws for a database that is down: the heartbeat
 * keeps trying, interactions answer "busy", and the container stays
 * unhealthy until the database answers.
 */
export async function startElemental(client: Client, env: ElementalEnv): Promise<{ stop: () => Promise<void> }> {
  const pool = createRolePool(env.databaseUrl, "elemental");
  let connected = false;
  const rt = createRuntime({ client, api: createElementalApi(pool), env, connected: () => connected });

  client.on(Events.ShardReady, () => (connected = true));
  client.on(Events.ShardResume, () => (connected = true));
  client.on(Events.ShardDisconnect, () => (connected = false));
  client.on(Events.ShardReconnecting, () => (connected = false));
  client.on(Events.InteractionCreate, (i) => void handleElementalInteraction(rt, i));

  const heartbeat: Heartbeat = startHeartbeat({ ping: settingsPing(rt), connected: rt.connected });
  const features = await startFeatures(rt);
  console.log(`[elemental] serving ${env.guildIds.length} guild(s); ${registry().commands.length} command(s) built`);

  return {
    async stop() {
      for (const feature of features.reverse()) {
        try {
          await feature.stop();
        } catch (error) {
          console.error(`[elemental] feature ${feature.name} failed to stop: ${(error as Error)?.name ?? "error"}`);
        }
      }
      await heartbeat.stop();
      await Promise.all([rt.queues.channels.stop(), rt.queues.canvas.stop()]);
      await pool.end();
    },
  };
}

/** --register-commands: POST each command to each guild in ELEMENTAL_GUILD_IDS. Never PUT. */
export async function registerElementalCommands(token: string, guildIds: readonly string[], rest?: CommandRest): Promise<number> {
  const client: CommandRest = rest ?? (new REST({ version: "10" }).setToken(token) as unknown as CommandRest);
  return upsertGuildCommands(client, guildIds, registry().commands, "elemental");
}
