"use client";

import { useEffect, useRef, useState } from "react";

import { ISLAND_DOOR, PROLOGUE, SHORE } from "@/lib/content/shift-island-invite";
import type { IslandDoor } from "@/lib/shift/islandEntry";
import type { IslandTicket as Ticket, IslandViewer } from "@/lib/shift/islandInvite";

import { BottleShore } from "./BottleShore";
import { IslandDiscordButton } from "./IslandDiscordButton";
import { InviteLetter } from "./InviteLetter";
import { IslandPrologue } from "./IslandPrologue";
import { IslandTicket } from "./IslandTicket";
import styles from "./islandInvite.module.css";
import { WaxSeal } from "./WaxSeal";

type Scene = "prologue" | "shore" | "letter";

/** A saved RSVP: what the ticket shows. */
interface Going {
  ticket: Ticket;
  discordUrl: string | null;
  /** False for a member the team has not confirmed yet (no Discord link). */
  confirmed: boolean;
  /** True when it came from pressing the seal just now, not from the server. */
  justSealed: boolean;
}

/**
 * Root of the SHIFT High Island invite. Holds which scene is on screen:
 * the island's story, the bottle on the shore, then the letter with its seal.
 * A visitor who has already RSVPed opens straight onto the letter and ticket.
 * `initialScene="letter"` (back from sign-in, `?at=seal`) skips the story and
 * brings the seal into view with focus on it.
 */
export function IslandInvite({
  viewer,
  festival,
  initialScene,
  door = null,
}: {
  viewer: IslandViewer;
  festival: string;
  initialScene?: "letter";
  /** For an RSVPed visitor the game does not let in yet: shown under the ticket. */
  door?: IslandDoor | null;
}) {
  const [scene, setScene] = useState<Scene>(
    initialScene === "letter" || viewer.kind === "going" ? "letter" : "prologue",
  );
  const rootRef = useRef<HTMLElement>(null);
  const focusedScene = useRef(scene);
  // Held here so a successful RSVP swaps the seal for the ticket without a reload.
  const [going, setGoing] = useState<Going | null>(
    viewer.kind === "going"
      ? { ticket: viewer.ticket, discordUrl: viewer.discordUrl, confirmed: viewer.confirmed, justSealed: false }
      : null,
  );

  // The control that changed the scene unmounts with it, so focus would fall
  // to the body. Move it into the new scene: its `data-scene-focus` element,
  // else the page root. Skipped on first load (and React's dev re-run of it).
  useEffect(() => {
    if (focusedScene.current === scene) return;
    focusedScene.current = scene;
    const root = rootRef.current;
    const target = root?.querySelector<HTMLElement>("[data-scene-focus]") ?? root;
    target?.focus({ preventScroll: true });
  }, [scene]);

  const goTo = (next: Scene) => {
    // Each scene starts at its own top; the prologue leaves the page scrolled.
    window.scrollTo(0, 0);
    setScene(next);
  };

  return (
    <main ref={rootRef} className={styles.root} data-scene={scene} tabIndex={-1}>
      {scene === "prologue" && <IslandPrologue lines={PROLOGUE} onDone={() => goTo("shore")} />}
      {scene === "shore" && <BottleShore onOpen={() => goTo("letter")} hint={SHORE.hint} />}
      {scene === "letter" && (
        <InviteLetter festival={festival}>
          {going ? (
            <IslandTicket
              ticket={going.ticket}
              discordUrl={going.discordUrl}
              confirmed={going.confirmed}
              festival={festival}
              focusHeading={going.justSealed}
              door={door}
            />
          ) : (
            <>
              <WaxSeal
                viewer={viewer}
                onGoing={(ticket, discordUrl, confirmed) => setGoing({ ticket, discordUrl, confirmed, justSealed: true })}
                focusOnMount={initialScene === "letter"}
              />
              {viewer.kind === "signedOut" && (
                // Same page as the game: a player already on the island signs in with Discord and lands in it.
                <div className={styles.returning} data-returning>
                  <p className={styles.ticketNote}>{ISLAND_DOOR.returning}</p>
                  <IslandDiscordButton label={ISLAND_DOOR.discordCta} className={`ei-button-dawn ${styles.cta}`} />
                </div>
              )}
            </>
          )}
        </InviteLetter>
      )}
    </main>
  );
}
