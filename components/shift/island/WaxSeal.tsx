"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SEAL } from "@/lib/content/shift-island-invite";
import type { IslandTicket, IslandViewer } from "@/lib/shift/islandInvite";

import styles from "./islandInvite.module.css";
import { useInView } from "./useInView";
import { useReducedMotion } from "./useReducedMotion";

const LOGIN_HREF = "/login?next=%2Fshift%2Fisland";
const APPLY_HREF = "/shift/apply";
/** The wax lifts, presses down and settles, then the ticket takes its place. */
const STAMP_MS = 720;

type SealState = "idle" | "pending" | "stamped";

interface RsvpReply {
  ok?: boolean;
  ticket?: IslandTicket;
  discordUrl?: string | null;
  error?: string;
}

/**
 * The wax seal at the foot of the letter. Pressing it is the RSVP, so what it
 * shows depends on who is reading: a sign-in link, a line for people who have
 * not been through SHIFT, the closed line, or the seal itself.
 */
export function WaxSeal({
  viewer,
  onGoing,
}: {
  viewer: IslandViewer;
  onGoing: (ticket: IslandTicket, discordUrl: string | null) => void;
}) {
  switch (viewer.kind) {
    case "signedOut":
      return (
        <div className={styles.sealArea}>
          <PixelWax className={styles.sealWaxQuiet} />
          <SealLink href={LOGIN_HREF}>{SEAL.signIn}</SealLink>
        </div>
      );
    case "notAlumni":
      return (
        <div className={styles.sealArea}>
          <p className={styles.sealLine}>{SEAL.notAlumni}</p>
          <SealLink href={APPLY_HREF}>{SEAL.applyCta}</SealLink>
        </div>
      );
    case "closed":
      return (
        <div className={styles.sealArea}>
          <PixelWax className={styles.sealWaxQuiet} />
          <p className={styles.sealLine}>{SEAL.closed}</p>
        </div>
      );
    case "canRsvp":
      return <SealButton onGoing={onGoing} />;
    case "going":
      // The ticket is already showing in the seal's place.
      return null;
  }
}

/** Dawn call to action in place of the seal; glows on hover, or in view on touch. */
function SealLink({ href, children }: { href: string; children: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const inView = useInView(ref);
  return (
    <Link ref={ref} href={href} className={`ei-button-dawn ${styles.cta} ${inView ? "in-view" : ""}`}>
      <span>{children}</span>
    </Link>
  );
}

/** The seal for an alumnus who has not RSVPed yet. One press, one request. */
function SealButton({ onGoing }: { onGoing: (ticket: IslandTicket, discordUrl: string | null) => void }) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<SealState>("idle");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const timer = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inView = useInView(buttonRef);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const fail = (message: string) => {
    inFlight.current = false;
    setError(message);
    setState("idle");
  };

  const press = async () => {
    // A ref, not state: a second tap in the same frame must not send twice.
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setState("pending");

    let status: number;
    let body: RsvpReply = {};
    try {
      const res = await fetch("/api/shift/island/rsvp", { method: "POST" });
      status = res.status;
      body = (await res.json().catch(() => ({}))) as RsvpReply;
    } catch {
      fail(SEAL.error);
      return;
    }

    if (status === 200 && body.ok && body.ticket) {
      const { ticket } = body;
      const discordUrl = body.discordUrl ?? null;
      if (reduced) {
        onGoing(ticket, discordUrl);
        return;
      }
      setState("stamped");
      timer.current = window.setTimeout(() => onGoing(ticket, discordUrl), STAMP_MS);
      return;
    }
    // Only these two carry a line written for the reader.
    const known = (status === 403 || status === 422) && typeof body.error === "string";
    fail(known ? (body.error as string) : SEAL.error);
  };

  const busy = state !== "idle";

  return (
    <div className={styles.sealArea}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.seal}
        data-state={state}
        data-inview={inView ? "" : undefined}
        disabled={busy}
        aria-busy={state === "pending"}
        onClick={press}
      >
        <span className={styles.sealGlow} aria-hidden="true" />
        <PixelWax className={styles.sealWax} />
        <span className={styles.sealLabel}>{state === "pending" ? SEAL.pending : SEAL.press}</span>
      </button>
      {error && (
        <p className={styles.sealError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/*
 * Wax drop with a sprout pressed into it, 16x16. d: rim, x: wax, l: light,
 * i: the imprint.
 */
const WAX = [
  ".....dddddd.....",
  "...ddxxxxxxdd...",
  "..dxxllxxxxxxd..",
  ".dxllxxxxxxxxxd.",
  ".dxlxxxxiixxxxd.",
  "dxxxxxxiiiixxxxd",
  "dxxxxxiiiiiixxxd",
  "dxxxxxxiiiixxxxd",
  "dxxxxxxxiixxxxxd",
  "dxxxxxxxiixxxxxd",
  "dxxxxxxxiixxxxxd",
  ".dxxxxiiiiiixxd.",
  ".dxxxxxxxxxxxxd.",
  "..dxxxxxxxxxxd..",
  "...ddxxxxxxdd...",
  ".....dddddd.....",
] as const;

const WAX_FILL: Record<string, string> = {
  d: styles.waxRim,
  x: styles.waxBody,
  l: styles.waxLight,
  i: styles.waxImprint,
};

/** One rect per run of the same colour in a row. */
const WAX_RECTS = WAX.flatMap((row, y) => {
  const rects: { x: number; y: number; w: number; tone: string }[] = [];
  let x = 0;
  while (x < row.length) {
    const tone = row[x];
    let end = x + 1;
    while (end < row.length && row[end] === tone) end++;
    if (tone !== ".") rects.push({ x, y, w: end - x, tone });
    x = end;
  }
  return rects;
});

function PixelWax({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {WAX_RECTS.map(({ x, y, w, tone }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} className={WAX_FILL[tone]} />
      ))}
    </svg>
  );
}
