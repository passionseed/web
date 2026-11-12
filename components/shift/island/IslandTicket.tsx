"use client";

import { useEffect, useRef } from "react";

import { StageSprite } from "./StageSprite";
import { ISLAND_DOOR, TICKET } from "@/lib/content/shift-island-invite";
import type { IslandDoor } from "@/lib/shift/islandEntry";
import type { IslandTicket as Ticket } from "@/lib/shift/islandInvite";

import { IslandDiscordButton } from "./IslandDiscordButton";
import styles from "./islandInvite.module.css";
import { useInView } from "./useInView";

/**
 * The ticket that takes the seal's place once the RSVP is saved: who is
 * coming, from which round, when the festival runs, and the way into Discord.
 * The stub carries a sprout sprite, as decoration. Only admins and confirmed
 * members get the Discord link; anyone else is told the team checks first.
 * `focusHeading` moves focus here when the ticket replaces a pressed seal.
 * `door` (from the page, lib/shift/islandEntry.ts) says what still stands
 * between an RSVPed visitor and the game on this same page.
 */
export function IslandTicket({
  ticket,
  discordUrl,
  confirmed,
  festival,
  focusHeading = false,
  door = null,
}: {
  ticket: Ticket;
  discordUrl: string | null;
  confirmed: boolean;
  festival: string;
  focusHeading?: boolean;
  door?: IslandDoor | null;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const ctaInView = useInView(ctaRef);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);

  return (
    <section className={styles.ticket} aria-labelledby="island-ticket-heading">
      <div className={styles.ticketStub} aria-hidden="true">
        <StageSprite stage={2} scale={2} className={styles.ticketSprite} />
      </div>
      <div className={styles.ticketBody}>
        <h2 id="island-ticket-heading" ref={headingRef} tabIndex={-1} className={styles.ticketHeading}>
          {TICKET.heading}
        </h2>
        <p className={styles.ticketName}>{ticket.nickname}</p>
        <p className={styles.ticketCohort}>{ticket.cohort}</p>
        <p className={styles.ticketFestival}>{festival}</p>
        {discordUrl ? (
          <a
            ref={ctaRef}
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`ei-button-dawn ${styles.cta} ${ctaInView ? "in-view" : ""}`}
          >
            <span>{TICKET.discordCta}</span>
          </a>
        ) : (
          <p className={styles.ticketNote}>{confirmed ? TICKET.noDiscord : TICKET.pendingDiscord}</p>
        )}
        {door ? <TicketDoor door={door} /> : null}
      </div>
    </section>
  );
}

/** The way from the ticket into the island game, on this same page. */
function TicketDoor({ door }: { door: IslandDoor }) {
  if (door !== "discord") {
    return (
      <p className={styles.ticketNote} data-door={door}>
        {ISLAND_DOOR[door]}
      </p>
    );
  }
  return (
    <div data-door={door}>
      <p className={styles.ticketNote}>{ISLAND_DOOR.discord}</p>
      <IslandDiscordButton label={ISLAND_DOOR.discordCta} switchAccount className={`ei-button-dawn ${styles.cta}`} />
    </div>
  );
}
