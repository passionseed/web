"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SEAL } from "@/lib/content/shift-island-invite";
import type { IslandTicket, IslandViewer } from "@/lib/shift/islandInvite";

import styles from "./islandInvite.module.css";
import { useInView } from "./useInView";
import { useReducedMotion } from "./useReducedMotion";

/** Back to this page after sign-in, opened on the letter at the seal. */
const LOGIN_HREF = "/login?next=%2Fshift%2Fisland%3Fat%3Dseal";
const APPLY_HREF = "/shift/apply";
/** Alumni with no record yet confirm themselves here first. */
const ALUMNI_BOARD_HREF = "/shift/alumni/board";
/** The wax lifts, presses down and settles, then the ticket takes its place. */
const STAMP_MS = 720;
/** A request that has not answered by now is treated as failed. */
const RSVP_TIMEOUT_MS = 15_000;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type SealState = "idle" | "pending" | "stamped";

interface RsvpReply {
  ok?: boolean;
  ticket?: IslandTicket;
  discordUrl?: string | null;
  confirmed?: boolean;
  error?: string;
}

/** A saved RSVP. `confirmed` is false for a member the team has not checked yet. */
export type OnGoing = (ticket: IslandTicket, discordUrl: string | null, confirmed: boolean) => void;

/**
 * The wax seal at the foot of the letter. Pressing it is the RSVP, so what it
 * shows depends on who is reading: a sign-in link, a line for people who have
 * not been through SHIFT, the closed line, or the seal itself.
 * `focusOnMount` scrolls to the seal and focuses it (back from sign-in).
 */
export function WaxSeal({
  viewer,
  onGoing,
  focusOnMount = false,
}: {
  viewer: IslandViewer;
  onGoing: OnGoing;
  focusOnMount?: boolean;
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
          <p className={styles.sealLine}>{SEAL.alumniHint}</p>
          <SealLink href={ALUMNI_BOARD_HREF}>{SEAL.alumniCta}</SealLink>
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
      return <SealButton onGoing={onGoing} focusOnMount={focusOnMount} />;
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
function SealButton({ onGoing, focusOnMount }: { onGoing: OnGoing; focusOnMount: boolean }) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<SealState>("idle");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const timer = useRef<number | null>(null);
  const requestTimer = useRef<number | null>(null);
  const request = useRef<AbortController | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inView = useInView(buttonRef);

  const settleRequest = () => {
    if (requestTimer.current !== null) window.clearTimeout(requestTimer.current);
    requestTimer.current = null;
    request.current = null;
  };

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (requestTimer.current !== null) window.clearTimeout(requestTimer.current);
      request.current?.abort();
    },
    [],
  );

  // Back from sign-in: bring the seal on screen and onto the keyboard. Read
  // the media query here, since the hook reports false until hydrated.
  useEffect(() => {
    const button = buttonRef.current;
    if (!focusOnMount || !button) return;
    const still = typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
    button.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
    button.focus({ preventScroll: true });
  }, [focusOnMount]);

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

    // A request that hangs (a dead connection) aborts, so the seal comes back.
    const controller = new AbortController();
    request.current = controller;
    requestTimer.current = window.setTimeout(() => controller.abort(), RSVP_TIMEOUT_MS);

    let status: number;
    let body: RsvpReply = {};
    try {
      const res = await fetch("/api/shift/island/rsvp", { method: "POST", signal: controller.signal });
      status = res.status;
      body = (await res.json().catch(() => ({}))) as RsvpReply;
    } catch {
      fail(SEAL.error);
      return;
    } finally {
      settleRequest();
    }

    if (status === 200 && body.ok && body.ticket) {
      const { ticket } = body;
      const discordUrl = body.discordUrl ?? null;
      const confirmed = body.confirmed === true;
      if (reduced) {
        onGoing(ticket, discordUrl, confirmed);
        return;
      }
      setState("stamped");
      timer.current = window.setTimeout(() => onGoing(ticket, discordUrl, confirmed), STAMP_MS);
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
