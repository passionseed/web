"use client";

import { useEffect, useRef } from "react";

import { StageSprite } from "./StageSprite";
import { ISLAND_DOOR, TICKET } from "@/lib/content/shift-island-invite";
import type { IslandDoor } from "@/lib/shift/islandEntry";
import type { IslandTicket as Ticket } from "@/lib/shift/islandInvite";

import { IslandDiscordButton } from "./IslandDiscordButton";
import styles from "./islandInvite.module.css";
import { useInView } from "./useInView";
import { BoardLink } from "./voyage/BoardLink";

/**
 * The ticket that takes the seal's place once the RSVP is saved: who is
 * coming, from which round, when the festival runs, and the way into Discord.
 * The stub carries a sprout sprite, as decoration. Only admins and confirmed
 * members get the Discord link; anyone else is told the team checks first.
 * `focusHeading` moves focus here when the ticket replaces a pressed seal.
 * `door` (from the page, lib/shift/islandEntry.ts) says what still stands
 * between an RSVPed visitor and the game on this same page.
 * `board` (right after the seal, when the page has not looked at the game
 * yet): the way onto the ship, which sails to the island or comes back to
 * this ticket with its door. The Discord room steps down to a quiet link.
 */
export function IslandTicket({
  ticket,
  discordUrl,
  confirmed,
  festival,
  focusHeading = false,
  door = null,
  board = false,
}: {
  ticket: Ticket;
  discordUrl: string | null;
  confirmed: boolean;
  festival: string;
  focusHeading?: boolean;
  door?: IslandDoor | null;
  board?: boolean;
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
        {board ? <BoardLink className={`ei-button-dawn ${styles.cta} ${styles.boardCta}`} /> : null}
        {discordUrl ? (
          <a
            ref={ctaRef}
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={board ? styles.quietLink : `ei-button-dawn ${styles.cta} ${ctaInView ? "in-view" : ""}`}
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
