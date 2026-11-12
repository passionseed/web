/**
 * Smoke check for a freshly built bot image, run once by bot/deploy.sh before
 * the old container is stopped:
 *
 *   docker run --rm --network none --env-file bot.env <image> node --import tsx bot/src/smoke.ts --env
 *   pnpm bot:smoke                                   # the same here, without --env
 *
 * Loads every module the bot loads (so a missing dependency, sprite file or CA
 * file fails here and not after the swap), draws a tiny island with the real
 * renderer and, with --env, validates the environment the way startup does.
 * Nothing here logs in to Discord or connects to a database.
 *
 * Prints one line, `smoke ok ... health=file|none`, and exits 0; or prints
 * `smoke failed: <step>: <reason>` and exits 1. `health=none` means no chosen
 * module touches the Docker health file (projectseed alone), so deploy waits
 * for a steady container instead of a healthy one.
 */
import { existsSync, readFileSync } from "node:fs";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

async function step<T>(name: string, run: () => Promise<T> | T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw new Error(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main(): Promise<string> {
  // The modules index.ts imports. Importing index.ts itself would start the bot.
  const { loadEnv } = await step("load env", () => import("./env"));
  await step("load commands", () => import("./commands"));
  await step("load db", () => import("./db"));
  await step("load projectseed", () => import("./projectseed"));
  await step("load shift-voice", () => import("./shift/voice"));
  await step("load shift-quests", () => import("./quests"));
  const { renderIsland } = await step("load renderer", () => import("./quests/island/render"));

  const island = await step("render island", () =>
    renderIsland(
      [
        { slot: 1, stage: 0, visitor: false, key: false, helper: false, lantern: false, name: null, mine: false },
        { slot: 2, stage: 4, visitor: true, key: true, helper: true, lantern: false, name: "smoke", mine: true },
        { slot: 3, stage: 7, visitor: true, key: false, helper: false, lantern: true, name: null, mine: false },
      ],
      { scale: 1, markMine: true, festival: true }
    )
  );
  const signed = PNG_SIGNATURE.every((byte, k) => island.png[k] === byte);
  if (!signed || island.width < 1 || island.height < 1 || island.numbers.size !== 3) {
    throw new Error(`render island: unexpected output (${island.width}x${island.height}, ${island.png.length} bytes)`);
  }

  let modules = "unchecked";
  let health = "unchecked";
  if (process.argv.includes("--env")) {
    const env = await step("env", () => loadEnv());
    const names = [env.shiftVoice && "shift-voice", env.shiftQuests && "shift-quests", env.projectseed && "projectseed"];
    modules = names.filter(Boolean).join(",");
    // shift-voice's heartbeat and the quests delivery loop touch the health file.
    health = env.shiftVoice || env.shiftQuests ? "file" : "none";
  }

  const revision = existsSync("REVISION") ? readFileSync("REVISION", "utf8").trim() : "local";
  return `smoke ok rev=${revision} modules=${modules} island=${island.width}x${island.height} png=${island.png.length}B health=${health}`;
}

main().then(
  (line) => {
    console.log(line);
    process.exit(0);
  },
  (error: unknown) => {
    console.error(`smoke failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
);
