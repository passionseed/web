"use client";

import { useEffect, useRef } from "react";

import { StageSprite } from "@/components/home/StageSprite";
import { TICKET } from "@/lib/content/shift-island-invite";
import type { IslandTicket as Ticket } from "@/lib/shift/islandInvite";

import styles from "./islandInvite.module.css";
import { useInView } from "./useInView";

/**
 * The ticket that takes the seal's place once the RSVP is saved: who is
 * coming, from which round, when the festival runs, and the way into Discord.
 * The stub carries a sprout sprite, as decoration. Only admins and confirmed
 * members get the Discord link; anyone else is told the team checks first.
 * `focusHeading` moves focus here when the ticket replaces a pressed seal.
 */
export function IslandTicket({
  ticket,
  discordUrl,
  confirmed,
  festival,
  focusHeading = false,
}: {
  ticket: Ticket;
  discordUrl: string | null;
  confirmed: boolean;
  festival: string;
  focusHeading?: boolean;
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
      </div>
    </section>
  );
}
