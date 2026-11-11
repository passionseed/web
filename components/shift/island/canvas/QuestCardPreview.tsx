"use client";

import { useId } from "react";

import { CARD_LIMITS } from "@/lib/shift-island/quest-canvas";

import { PREVIEW } from "./copy";
import styles from "./canvas.module.css";

export interface QuestCardPreviewProps {
  /** buildSnapshot's output: the exact text the server will store. */
  snapshot: { text: string; cut: boolean; length: number };
  /** No note ticked yet. */
  empty: boolean;
}

/** The quest card as the mentor will read it, with its length against the 2000 cap. */
export function QuestCardPreview({ snapshot, empty }: QuestCardPreviewProps) {
  const headingId = useId();
  return (
    <section className={styles.preview} aria-labelledby={headingId}>
      <div className={styles.previewHead}>
        <h4 id={headingId} className={styles.subheading}>
          {PREVIEW.heading}
        </h4>
        {empty ? null : (
          <span className={styles.meter} data-near={snapshot.length >= CARD_LIMITS.evidence * 0.9 ? "true" : undefined}>
            {PREVIEW.meter(snapshot.length)}
          </span>
        )}
      </div>
      {empty ? (
        <p className={styles.quiet}>{PREVIEW.empty}</p>
      ) : (
        <pre className={styles.card} lang="th" data-testid="quest-card-text">
          {snapshot.text}
        </pre>
      )}
      {snapshot.cut ? <p className={styles.warn}>{PREVIEW.cut}</p> : null}
      <p className={styles.fine}>{PREVIEW.frozen}</p>
    </section>
  );
}
