import type { IslandConsent } from "@/lib/supabase/shift-quests/playerTypes";

import styles from "./consent.module.css";
import { CONSENT_BANNER } from "./copy";

type PendingState = keyof typeof CONSENT_BANNER.compact;

/**
 * The friendly next step while the island still needs consent: one line and
 * a button that opens the consent sheet. Renders nothing when consent is
 * unknown (null: nothing is gated in the UI) or already ok. `compact` is the
 * one-line strip for inside another sheet (character, wallet, prizes).
 */
export function ConsentBanner({
  consent,
  onOpen,
  compact = false,
}: {
  consent: IslandConsent | null | undefined;
  onOpen: () => void;
  compact?: boolean;
}) {
  if (!consent || consent.ok) return null;
  const state: PendingState = consent.state === "granted" ? "none" : consent.state;
  const text = compact ? CONSENT_BANNER.compact[state] : CONSENT_BANNER[state];
  return (
    <section className={styles.banner} data-compact={compact ? "true" : undefined} aria-label={CONSENT_BANNER.label}>
      <span className={styles.lamp} aria-hidden="true" />
      <p className={styles.bannerText}>{text}</p>
      <button type="button" className={styles.bannerButton} onClick={onOpen}>
        {CONSENT_BANNER.action}
      </button>
    </section>
  );
}
