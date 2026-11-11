import type { Metadata, Viewport } from "next";

import { QuestError } from "@/bot/src/quests/api";
import { IslandApp } from "@/components/shift/island/IslandApp";
import { IslandGate, type GateViewer } from "@/components/shift/island/IslandGate";
import { IslandShell } from "@/components/shift/island/IslandShell";
import { StartCard } from "@/components/shift/island/StartCard";
import { islandPicture } from "@/lib/shift-island/picture";
import { isShiftDiscordAuthError } from "@/lib/shift/discordAuth";
import { shiftDiscordUrls } from "@/lib/shift/discordGuild";
import { getIslandPage } from "@/lib/supabase/shift-quests/page";
import type { IslandPageData, ViewerCard } from "@/lib/supabase/shift-quests/types";
import { resolveIslandViewer } from "@/lib/supabase/shift-quests/viewer";

// Every view reads the signed-in student's own island; nothing here can be prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "เกาะ SHIFT",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#000006",
  colorScheme: "dark",
  // The island fills the screen edge to edge; the HUD keeps clear of the notch with env(safe-area-inset-*).
  viewportFit: "cover",
};

/** Copies only the fields a client card shows, so nothing else on the server object can leak. */
function card(me: ViewerCard): ViewerCard {
  return { name: me.name, avatarUrl: me.avatarUrl, staff: me.staff };
}

/** The gate states rebuilt field by field: no actor, no session. */
function gateViewer(viewer: GateViewer): GateViewer {
  switch (viewer.state) {
    case "signed_out":
      return { state: "signed_out" };
    case "no_discord":
      return { state: "no_discord", accountLabel: viewer.accountLabel };
    case "unavailable":
      return { state: "unavailable", reason: viewer.reason };
    case "not_eligible":
      return { state: "not_eligible", reason: viewer.reason, me: card(viewer.me) };
  }
}

/** The 'sq:<code>' refusal behind a QuestError (or a look-alike from another bundle copy), else null. */
function questCode(error: unknown): string | null {
  if (error instanceof QuestError) return error.code;
  if (error instanceof Error && error.message.startsWith("sq:")) return error.message.slice(3);
  return null;
}

type PageResult = { ok: true; page: IslandPageData } | { ok: false; notStarted: boolean };

/** Loads the island; a refusal or database failure becomes a gate, never a crash. */
async function loadIsland(viewer: Parameters<typeof getIslandPage>[0]): Promise<PageResult> {
  try {
    return { ok: true, page: await getIslandPage(viewer) };
  } catch (error) {
    const code = questCode(error);
    if (code === "not_started") return { ok: false, notStarted: true };
    // Codes only: never student text or the Discord id.
    const name = error instanceof Error ? error.name : "unknown";
    console.error("[shift-island] page load failed:", code ? `sq:${code}` : name);
    return { ok: false, notStarted: false };
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ auth_error?: string }> }) {
  const { auth_error: rawAuthError } = await searchParams;
  const authError = typeof rawAuthError === "string" && isShiftDiscordAuthError(rawAuthError) ? rawAuthError : null;
  const viewer = await resolveIslandViewer();

  switch (viewer.state) {
    case "signed_out":
    case "no_discord":
    case "not_eligible":
    case "unavailable":
      return (
        <IslandShell>
          <IslandGate viewer={gateViewer(viewer)} authError={authError} discordUrls={shiftDiscordUrls()} />
        </IslandShell>
      );
    case "not_started":
      return (
        <IslandShell>
          <StartCard me={card(viewer.me)} />
        </IslandShell>
      );
    case "ready": {
      const result = await loadIsland(viewer);
      if (!result.ok) {
        return (
          <IslandShell>
            {result.notStarted ? (
              <StartCard me={card(viewer.me)} />
            ) : (
              <IslandGate viewer={{ state: "unavailable", reason: "db_error" }} />
            )}
          </IslandShell>
        );
      }
      // Only shaped data crosses to the client: no actor, no session.
      // Full screen unless the board failed to load (then IslandApp shows a gate card on the sky).
      const immersive = !result.page.island.project || result.page.board != null;
      return (
        <IslandShell immersive={immersive}>
          <IslandApp page={{ ...result.page, me: card(result.page.me) }} picture={islandPicture(result.page.map)} />
        </IslandShell>
      );
    }
  }
}
