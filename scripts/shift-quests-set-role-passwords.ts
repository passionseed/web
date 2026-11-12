/**
 * Give the SHIFT High quest logins (shift_quest_bot, shift_quest_web) LOGIN
 * and a new password, or check whether they can log in. The migrations create
 * both roles NOLOGIN; this is the out-of-band step that switches them on.
 *
 *   read -rs SHIFT_QUEST_ADMIN_DATABASE_URL && export SHIFT_QUEST_ADMIN_DATABASE_URL
 *   read -rs SHIFT_QUEST_BOT_PASSWORD && export SHIFT_QUEST_BOT_PASSWORD
 *   read -rs SHIFT_QUEST_WEB_PASSWORD && export SHIFT_QUEST_WEB_PASSWORD
 *   pnpm shift:role-passwords --check     # changes nothing
 *   pnpm shift:role-passwords             # set both, then log in as each
 *   pnpm shift:role-passwords --only web  # rotate one
 *
 * Reads only environment variables (never .env files) and prints nothing
 * secret. Runbook: docs/runbooks/shift-high-island-rollout.md.
 */
import { connectPg, run } from "./lib/shift-quest-roles";

run(process.argv.slice(2), {
  env: process.env,
  connect: connectPg,
  out: (line) => console.log(line),
  err: (line) => console.error(line),
})
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    // Unexpected: print the kind of failure only, never the error object (it
    // could carry connection settings).
    console.error(`Unexpected failure: ${error instanceof Error ? error.name : "unknown"}`);
    process.exitCode = 1;
  });
