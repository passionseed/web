"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

import { useReducedMotion } from "../useReducedMotion";
import { VOYAGE_COPY } from "./copy";
import { VOYAGE_HREF } from "./link";
import styles from "./voyage.module.css";

/** How long the page takes to fall into night before it leaves for the ship. */
export const BOARDING_MS = 520;

/** A full page load, so the server decides between the island and the ticket's door. Swappable in tests. */
export const boarding = {
  leave(href: string) {
    window.location.assign(href);
  },
};

/**
 * The ticket's way onto the ship: a plain link to `/shift/island?at=voyage`,
 * where the page shows the island (and the crossing plays) or, if something
 * still stands in the way, the ticket with its door. A plain click first
 * lets the page fall into night, the same night the crossing opens on, so
 * the beach, the dark and the ship read as one shot. New-tab clicks and
 * reduced motion just follow the link.
 */
export function BoardLink({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const [aboard, setAboard] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (reduced || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (aboard) return;
    setAboard(true);
    timer.current = window.setTimeout(() => boarding.leave(VOYAGE_HREF), BOARDING_MS);
  };

  return (
    <>
      <a href={VOYAGE_HREF} className={className} onClick={onClick} aria-busy={aboard || undefined} data-boarding={aboard || undefined}>
        <span>{aboard ? VOYAGE_COPY.boarding : VOYAGE_COPY.board}</span>
      </a>
      {/* On <body>: the letter's transforms would otherwise trap a fixed layer inside the paper. */}
      {aboard ? createPortal(<div className={styles.nightfall} aria-hidden="true" />, document.body) : null}
    </>
  );
}
