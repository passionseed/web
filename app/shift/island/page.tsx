import type { Metadata, Viewport } from "next";

import { QuestError } from "@/bot/src/quests/api";
import { IslandApp } from "@/components/shift/island/IslandApp";
import { IslandGate, type GateViewer } from "@/components/shift/island/IslandGate";
import { IslandInvite } from "@/components/shift/island/IslandInvite";
import { IslandShell } from "@/components/shift/island/IslandShell";
import { StartCard } from "@/components/shift/island/StartCard";
import { SHIFT_ISLAND } from "@/lib/content/shift-island";
import { festivalLine } from "@/lib/content/shift-island-invite";
import { bangkokPhaseNow } from "@/lib/shift-island/live/lighting";
import { islandPicture } from "@/lib/shift-island/picture";
import { isShiftDiscordAuthError } from "@/lib/shift/discordAuth";
import { shiftDiscordUrls } from "@/lib/shift/discordGuild";
import { islandEntry, needsGameViewer, type IslandDoor } from "@/lib/shift/islandEntry";
import type { IslandViewer as InviteViewer } from "@/lib/shift/islandInvite";
import { loadIslandViewer } from "@/lib/supabase/shift-island-viewer";
import { getIslandPage } from "@/lib/supabase/shift-quests/page";
import type { IslandPageData, IslandViewer, ViewerCard } from "@/lib/supabase/shift-quests/types";
import { resolveIslandViewer } from "@/lib/supabase/shift-quests/viewer";

// Every view reads the signed-in student's own island; nothing here can be prerendered.
/**
 * /shift/island: one address for the SHIFT High Island.
 *
 * - Signed out, not alumni, not RSVPed, or RSVPed and not let into the game
 *   yet: the invitation, a message in a bottle (prologue, bottle, letter,
 *   wax seal to RSVP, ticket). Unlisted: the link goes out in each round's
 *   group.
 * - RSVPed (or staff) and let in by the game (Discord account, SHIFT server,
 *   SHIFT high role): the island game. Its story picks up from the ticket.
 *
 * The rule is lib/shift/islandEntry.ts. Reads the visitor's session cookie,
 * so it renders per request; nothing here runs at build time.
 */
export const dynamic = "force-dynamic";

const TITLE = "SHIFT High Island | เทศกาลเปิดเกาะ";

export const metadata: Metadata = {
  title: TITLE,
  robots: { index: false, follow: false },
  openGraph: {
    title: TITLE,
    type: "website",
    images: [
      {
        url: SHIFT_ISLAND.sample.src,
        width: SHIFT_ISLAND.sample.width,
        height: SHIFT_ISLAND.sample.height,
        alt: SHIFT_ISLAND.sample.alt,
      },
    ],
  },
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

const SIGNED_OUT: IslandViewer = { state: "signed_out" };

/** The invitation. `?at=seal` (back from sign-in) opens on the letter, at the seal; any other value is ignored. */
function Invitation({ viewer, at, door }: { viewer: InviteViewer; at: unknown; door: IslandDoor | null }) {
  // The festival line is computed here so the first client render never reads the clock.
  return (
    <IslandInvite
      viewer={viewer}
      festival={festivalLine()}
      initialScene={at === "seal" ? "letter" : undefined}
      door={door}
    />
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string | string[]; at?: string | string[] }>;
}) {
  const [{ auth_error: rawAuthError, at }, { viewer: invite }] = await Promise.all([searchParams, loadIslandViewer()]);
  const authError = typeof rawAuthError === "string" && isShiftDiscordAuthError(rawAuthError) ? rawAuthError : null;
  const viewer = needsGameViewer(invite) ? await resolveIslandViewer() : SIGNED_OUT;

  const entry = islandEntry(invite, {
    state: viewer.state,
    staff: viewer.state === "ready" || viewer.state === "not_started" ? viewer.me.staff : false,
  });
  if (entry.show === "invite") {
    // A failed Discord sign-in from the ticket's door: say so on the game's card, which offers the retry.
    if (authError && (viewer.state === "signed_out" || viewer.state === "no_discord") && entry.door === "discord") {
      return (
        <IslandShell>
          <IslandGate viewer={gateViewer(viewer)} authError={authError} discordUrls={shiftDiscordUrls()} />
        </IslandShell>
      );
    }
    return <Invitation viewer={invite} at={at} door={entry.door} />;
  }

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
          <IslandApp
            page={{ ...result.page, me: card(result.page.me) }}
            picture={islandPicture(result.page.map)}
            initialPhase={bangkokPhaseNow()}
            discordUrl={shiftDiscordUrls().server}
          />
        </IslandShell>
      );
    }
  }
}
