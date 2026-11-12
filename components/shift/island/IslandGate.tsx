"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { ShiftDiscordAuthError } from "@/lib/shift/discordAuth";
import type { IslandViewer } from "@/lib/supabase/shift-quests/types";

import { COMMON, GATE } from "./copy";
import styles from "./island.module.css";
import { IslandDiscordButton } from "./IslandDiscordButton";
import { PALETTE, treeGrid } from "./sprites";

/** The viewer states that show a gate card. None of them carries the Discord id. */
export type GateViewer = Extract<IslandViewer, { state: "signed_out" | "no_discord" | "unavailable" | "not_eligible" }>;

/** Where the SHIFT server lives (lib/shift/discordGuild shiftDiscordUrls), read on the server. */
export interface GateDiscordUrls {
  server: string | null;
  invite: string | null;
}

interface IslandGateProps {
  viewer: GateViewer;
  /** Links into Discord for the "not in the server" and "no role" cards; hidden when null. */
  discordUrls?: GateDiscordUrls;
  /** From /auth/callback when Discord sign-in failed. */
  authError?: ShiftDiscordAuthError | null;
  /** error.tsx passes its retry; otherwise the page is re-rendered on the server. */
  onRetry?: () => void;
}

/** One centred card per state: who you are on the island, and the one thing to do next. */
export function IslandGate({ viewer, authError = null, onRetry, discordUrls }: IslandGateProps) {
  if (authError && viewer.state !== "unavailable") {
    return (
      <GateCard heading={GATE.authError.heading} body={GATE.authError.body[authError]}>
        <IslandDiscordButton label={GATE.authError.action} switchAccount={viewer.state !== "signed_out"} />
      </GateCard>
    );
  }

  switch (viewer.state) {
    case "signed_out":
      return (
        <GateCard heading={GATE.signedOut.heading} body={GATE.signedOut.body} fine={GATE.signedOut.fine}>
          <IslandDiscordButton label={GATE.signedOut.action} />
        </GateCard>
      );
    case "no_discord":
      return (
        <GateCard
          heading={GATE.noDiscord.heading}
          body={viewer.accountLabel ? GATE.noDiscord.body(viewer.accountLabel) : GATE.noDiscord.bodyUnknown}
        >
          <IslandDiscordButton label={GATE.noDiscord.action} switchAccount />
        </GateCard>
      );
    case "not_eligible": {
      const copy = GATE.notEligible[viewer.reason];
      // Not in the server: the invite (else the server). No role: the server, to ask the team there.
      const link =
        viewer.reason === "not_in_guild"
          ? (discordUrls?.invite ?? discordUrls?.server ?? null)
          : viewer.reason === "no_role"
            ? (discordUrls?.server ?? null)
            : null;
      return (
        <GateCard heading={copy.heading} body={copy.body} fine={GATE.signedInAs(viewer.me.name)}>
          {viewer.reason === "discord_unavailable" ? <RetryButton onRetry={onRetry} /> : null}
          {(viewer.reason === "no_role" || viewer.reason === "not_in_guild") && link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={`ei-button-dawn ${styles.primary}`}
            >
              <span>{GATE.notEligible[viewer.reason].link}</span>
            </a>
          ) : null}
          {viewer.reason === "no_role" || viewer.reason === "not_in_guild" ? (
            <IslandDiscordButton
              label={GATE.notEligible[viewer.reason].action}
              switchAccount
              variant={link ? "quiet" : "primary"}
            />
          ) : null}
        </GateCard>
      );
    }
    case "unavailable":
      return (
        <GateCard heading={GATE.unavailable.heading} body={GATE.unavailable.body}>
          <RetryButton onRetry={onRetry} />
        </GateCard>
      );
  }
}

export function GateCard({
  heading,
  body,
  fine,
  children,
}: {
  heading: string;
  body: string;
  fine?: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.gate}>
      <GateBackdrop />
      <section className={`ei-card ei-card--static ${styles.gateCard}`} aria-labelledby="island-gate-heading">
        <h1 id="island-gate-heading" className={styles.gateHeading}>
          {heading}
        </h1>
        <p className={styles.gateBody}>{body}</p>
        {children ? <div className={styles.gateActions}>{children}</div> : null}
        {fine ? <p className={styles.hint}>{fine}</p> : null}
      </section>
    </div>
  );
}

/** The seven stages of a tree, dimmed behind the card: the island before you are on it. */
export function GateBackdrop() {
  return (
    <div className={styles.gateBackdrop} aria-hidden="true">
      {[1, 2, 3, 4, 5, 6, 7].map((stage) => (
        <PixelIcon key={stage} grid={treeGrid(stage)} palette={PALETTE} scale={2} />
      ))}
    </div>
  );
}

function RetryButton({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={`ei-button-dawn ${styles.primary}`}
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        if (onRetry) return onRetry();
        startTransition(() => router.refresh());
      }}
    >
      <span>{COMMON.retry}</span>
    </button>
  );
}
