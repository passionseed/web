import { Client, GatewayIntentBits, Partials } from "discord.js";

import { loadEnv } from "./env";
import { createDb } from "./db";
import { registerCommands } from "./commands";
import { startProjectSeed } from "./projectseed";
import { registerShiftVoice } from "./shift/voice";

async function main(): Promise<void> {
  const env = loadEnv();

  const intents = [
    GatewayIntentBits.Guilds,
    // Voice states are what presence, mic, stream and camera are read from.
    GatewayIntentBits.GuildVoiceStates,
  ];
  if (env.projectseed) {
    // Only so the DM guard can notice a message arrived. It never reads the
    // content — see dm-guard.ts.
    intents.push(GatewayIntentBits.DirectMessages);
  }

  const client = new Client({
    intents,
    // Without the Channel partial, a DM from someone the bot has never messaged
    // arrives with an uncached channel and the DM guard silently never fires.
    partials: env.projectseed ? [Partials.Channel, Partials.Message] : [],
  });

  const modules: { name: string; stop: () => Promise<void> }[] = [];

  if (env.shiftVoice) {
    modules.push({ name: "shift-voice", ...registerShiftVoice(client, env.shiftVoice) });
  }
  if (env.projectseed) {
    const db = createDb(env.projectseed);
    modules.push({ name: "projectseed", ...(await startProjectSeed(client, db, env.projectseed)) });
  }
  console.log(`Bot starting with modules: ${modules.map((m) => m.name).join(", ")}`);

  client.once("clientReady", () => {
    console.log(`Logged in as ${client.user?.tag}`);
  });

  let stopping = false;
  const shutdown = async (signal: string) => {
    // A second Ctrl-C, or a signal forwarded by pnpm as well, must not close twice.
    if (stopping) return;
    stopping = true;
    console.log(`\n${signal} received, shutting down`);
    for (const module of modules) {
      try {
        await module.stop();
      } catch (error) {
        console.error(`[shutdown] ${module.name} failed to stop cleanly:`, error);
      }
    }
    await client.destroy();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  if (process.argv.includes("--register-commands")) {
    if (env.projectseed) await registerCommands(env.projectseed);
    else console.log("No slash commands to register: only the projectseed module has any");
  }

  await client.login(env.core.discordToken);
}

main().catch((error) => {
  console.error("Bot failed to start:", error);
  process.exit(1);
});
