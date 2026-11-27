/**
 * Deletes every Elemental Instagram Story proof for an event: all files in
 * the private hackathon-story-proofs bucket under <event>/ (replaced uploads
 * left behind included) and every hackathon_story_proofs row. Staff run it
 * once after Demo Day (Big, 2026-11-27: proofs are deleted after Demo Day).
 *
 *   node scripts/delete-story-proofs.mjs                 # prints what it would delete, deletes nothing
 *   node scripts/delete-story-proofs.mjs --yes           # deletes
 *   node scripts/delete-story-proofs.mjs --event <slug>  # another event (default elemental-2026)
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. With
 * .env.local that is PRODUCTION. Prints counts only, never a path or an id.
 */
import { createClient } from "@supabase/supabase-js";

const BUCKET = "hackathon-story-proofs";
const TABLE = "hackathon_story_proofs";
const PAGE = 1000;
const REMOVE_BATCH = 100;

function parseArgs(argv) {
  const args = { yes: false, event: "elemental-2026", help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--yes") args.yes = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--event") args.event = argv[++i] ?? "";
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }
  if (!/^[a-z0-9-]{3,60}$/.test(args.event)) {
    console.error("--event must be an event slug like elemental-2026");
    process.exit(1);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log("Usage: node scripts/delete-story-proofs.mjs [--event <slug>] [--yes]");
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

/** Every entry directly under `prefix` (Supabase lists one folder level at a time). */
async function listAll(prefix) {
  const out = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: PAGE, offset });
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

/** Every file path under <event>/: <event>/<registration id>/<file>, plus any file sitting at the top. */
async function filePaths(event) {
  const paths = [];
  for (const entry of await listAll(event)) {
    // A folder has no id; a file has one.
    if (entry.id) {
      paths.push(`${event}/${entry.name}`);
      continue;
    }
    for (const file of await listAll(`${event}/${entry.name}`)) {
      if (file.id) paths.push(`${event}/${entry.name}/${file.name}`);
    }
  }
  return paths;
}

async function main() {
  const { count, error: countError } = await supabase.from(TABLE).select("id", { count: "exact", head: true }).eq("event_slug", args.event);
  if (countError) throw countError;
  const paths = await filePaths(args.event);

  console.log(`Event ${args.event}: ${count ?? 0} proof rows, ${paths.length} files in ${BUCKET}/${args.event}/`);
  if (!args.yes) {
    console.log("Nothing deleted. Run again with --yes to delete all of them.");
    return;
  }

  let removed = 0;
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const batch = paths.slice(i, i + REMOVE_BATCH);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) throw error;
    removed += batch.length;
  }
  const { error: deleteError, count: deleted } = await supabase.from(TABLE).delete({ count: "exact" }).eq("event_slug", args.event);
  if (deleteError) throw deleteError;

  const left = await filePaths(args.event);
  console.log(`Deleted ${removed} files and ${deleted ?? 0} rows. Files left: ${left.length}.`);
  if (left.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Failed:", error?.message ?? error);
  process.exit(1);
});
