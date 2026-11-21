import { Events, type Client } from "discord.js";

import type { HackathonOpsEnv } from "../env";
import { createRolePool } from "../pg";
import { OpsDbError, createOpsApi } from "./api";
import { handleOpsInteraction } from "./handlers";
import { configuredChannel, startMorningPost } from "./morning";

export { registerOpsCommands } from "./commands";

/**
 * The hackathon operations board (BOT_MODULES hackathon-ops): /ops for the
 * staff role in one server, and a morning post in one staff channel. It
 * stores no student data, never DMs, never pings, and posts nowhere but
 * HACKATHON_OPS_CHANNEL_ID.
 *
 * It never stops the process: a database that is missing the migration or
 * cannot be reached is logged, and /ops answers that the board could not be
 * reached, so the student-facing modules in the same process keep running.
 */
export async function registerHackathonOps(client: Client, env: HackathonOpsEnv): Promise<{ stop: () => Promise<void> }> {
  const pool = createRolePool(env.databaseUrl, "hackathon-ops");
  const api = createOpsApi(pool, env.board);
  try {
    const ops = await api.board();
    console.log(`[hackathon-ops] board "${env.board}" has ${ops.length} operation(s)`);
  } catch (error) {
    const missing = error instanceof OpsDbError && error.sqlstate === "42883";
    console.error(
      missing
        ? "[hackathon-ops] the database has no ops board yet: apply supabase/migrations/20261120100000_hackathon_ops_board.sql. /ops will say the board could not be reached until then."
        : "[hackathon-ops] could not read the board at startup; check HACKATHON_OPS_DATABASE_URL. Running anyway."
    );
  }

  let connected = false;
  const online = () => {
    connected = true;
  };
  const offline = () => {
    connected = false;
  };
  client.on(Events.ShardReady, online);
  client.on(Events.ShardResume, online);
  client.on(Events.ShardDisconnect, offline);
  client.on(Events.ShardReconnecting, offline);

  const ctx = { api, env, now: () => Date.now() };
  client.on(Events.InteractionCreate, (i) => {
    void handleOpsInteraction(ctx, i);
  });

  const morning = startMorningPost({
    api,
    now: () => Date.now(),
    connected: () => connected,
    channel: () => configuredChannel(client, env),
    log: (line) => console.log(line),
  });

  return {
    async stop() {
      await morning.stop();
      await pool.end();
    },
  };
}
