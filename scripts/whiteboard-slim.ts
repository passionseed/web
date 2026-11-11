/**
 * One-time slimming of boards already stored: strokes and lines go through
 * compact.ts (as every save now does), and deleted elements older than a day
 * are dropped (as the whiteboard_drop_old_tombstones trigger now does on
 * every write). Versions are unchanged, so open boards do not re-sync.
 *
 *   pnpm tsx scripts/whiteboard-slim.ts                 # dry run, every board: sizes only
 *   pnpm tsx scripts/whiteboard-slim.ts --board <id>    # dry run, one board
 *   pnpm tsx scripts/whiteboard-slim.ts --board <id> --apply
 *
 * Writes only if the board was not saved since it was read (matching
 * updated_at), so a save that lands meanwhile is never overwritten; it then
 * reads again and retries. Uses the HACKATHON_* pair, which is production.
 */
import { createClient } from "@supabase/supabase-js";

import { compactElements } from "../lib/whiteboard/compact";

const DAY_MS = 24 * 60 * 60 * 1000;

function db() {
  const url = process.env.HACKATHON_SUPABASE_URL;
  const key = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing HACKATHON_SUPABASE_URL / HACKATHON_SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

type El = { isDeleted?: boolean; updated?: number };

const mb = (value: unknown) => (Buffer.byteLength(JSON.stringify(value)) / 1e6).toFixed(2);

function slim(elements: El[]): El[] {
  const cutoff = Date.now() - DAY_MS;
  return compactElements(elements.filter((el) => !(el.isDeleted === true && typeof el.updated === "number" && el.updated < cutoff)));
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const boardArg = args.indexOf("--board");
  const only = boardArg >= 0 ? args[boardArg + 1] : null;
  if (apply && !only) {
    console.error("--apply needs --board <id>: slim one board at a time.");
    process.exit(1);
  }
  const client = db();

  const { data: boards, error } = await client.from("whiteboards").select("id, title").order("updated_at", { ascending: false });
  if (error) throw error;

  for (const board of boards ?? []) {
    if (only && board.id !== only) continue;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const { data: row, error: readError } = await client
        .from("whiteboards")
        .select("elements, updated_at")
        .eq("id", board.id)
        .single();
      if (readError) throw readError;
      const before = (row.elements as El[]) ?? [];
      const after = slim(before);
      console.log(`${board.title} (${board.id}): ${before.length} → ${after.length} elements, ${mb(before)} → ${mb(after)} MB`);
      if (!apply) break;

      const { data: written, error: writeError } = await client
        .from("whiteboards")
        .update({ elements: after })
        .eq("id", board.id)
        .eq("updated_at", row.updated_at)
        .select("id");
      if (writeError) throw writeError;
      if (written?.length) {
        console.log("  written.");
        break;
      }
      console.log(`  saved by someone meanwhile, reading again (${attempt}/5)`);
      if (attempt === 5) console.log("  gave up: try again when the board is quieter.");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
