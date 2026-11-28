import type { Metadata } from "next";
import Link from "next/link";

import { BoardHideButton } from "@/components/hackathon/elemental/leaderboard/BoardHideButton";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { rankBoard, type BoardEntry } from "@/lib/hackathon/elemental/team-style-board";
import { loadBoardEntries } from "@/lib/supabase/hackathon-leaderboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Elemental team board" };

/**
 * Staff view of the public team board (/hackathon/elemental/leaderboard):
 * every team with at least one device, and hidden ones, with a Hide / Show
 * button for a name that slipped past the word check. Needs the
 * 20261128120000 migration for hiding to work.
 */
export default async function AdminLeaderboardPage() {
  await requireAdmin();
  let entries: BoardEntry[] | null = null;
  try {
    entries = await loadBoardEntries(ELEMENTAL.slug);
  } catch (error) {
    console.error("[admin/hackathon/leaderboard] failed to load", error);
  }
  if (!entries) return <p className="text-sm text-muted-foreground">The board failed to load. Try again in a minute.</p>;

  const ranks = new Map(rankBoard(entries).map((e) => [e.key, e.rank]));
  const rows = entries
    .filter((e) => e.devices > 0 || e.hidden)
    .sort((a, b) => b.paid - a.paid || b.devices - a.devices);

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h2 className="text-lg font-medium tracking-tight">Team board</h2>
        <p className="text-sm text-muted-foreground">
          {rows.length} teams with share-link devices.{" "}
          <Link href="/hackathon/elemental/leaderboard" className="underline underline-offset-2">
            Open the public board
          </Link>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-normal">Rank</th>
              <th className="py-2 pr-3 font-normal">Team</th>
              <th className="py-2 pr-3 font-normal">Schools</th>
              <th className="py-2 pr-3 text-right font-normal">Paid</th>
              <th className="py-2 pr-3 text-right font-normal">Devices</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.key} className="border-t">
                <td className="py-2 pr-3 tabular-nums">{e.hidden ? "hidden" : (ranks.get(e.key) ?? "")}</td>
                <td className="py-2 pr-3">
                  {e.name ?? <span className="text-muted-foreground">(no board name yet, not listed)</span>}
                  {e.solo && <span className="ml-2 text-xs text-muted-foreground">solo</span>}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">{e.schools.join(", ")}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{e.paid}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{e.devices}</td>
                <td className="py-2 text-right">
                  <BoardHideButton kind={e.solo ? "solo" : "team"} id={e.id} hidden={e.hidden} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
