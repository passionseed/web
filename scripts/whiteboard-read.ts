/**
 * Read whiteboards straight from the database, for people and AI agents.
 * Read-only: it never writes.
 *
 *   pnpm whiteboard:read                 list boards, newest first
 *   pnpm whiteboard:read --search retro  list boards whose title matches
 *   pnpm whiteboard:read <board-id>      print one board as Markdown
 */
import { listAllBoards, readBoardMarkdown } from "../lib/supabase/whiteboard-reader";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function main() {
  const args = process.argv.slice(2);
  const target = args.find((a) => UUID.test(a));

  if (target) {
    const markdown = await readBoardMarkdown(target);
    if (!markdown) throw new Error(`No whiteboard with id ${target}`);
    process.stdout.write(markdown);
    return;
  }

  const searchAt = args.indexOf("--search");
  const search = searchAt >= 0 ? args[searchAt + 1] : undefined;
  const boards = await listAllBoards(search);
  if (boards.length === 0) return console.log("No whiteboards found.");
  for (const b of boards) {
    console.log(
      `${b.id}  ${b.updatedAt.slice(0, 10)}  ${String(b.elementCount).padStart(4)} items  ${b.memberCount} members  ${b.title}  (by ${b.owner})`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
