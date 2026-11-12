"use client";

import { useId, type CSSProperties } from "react";

import { CARD_LIMITS } from "@/lib/shift-island/quest-canvas";
import type { SnapshotBlock } from "@/lib/supabase/shift-quests/canvas-snapshot";
import { SHIFT_CARDS } from "@/lib/whiteboard/shift-cards";

import { PREVIEW } from "./copy";
import styles from "./canvas.module.css";

export interface QuestCardPreviewProps {
  /** buildSnapshot's output: the exact text the server will store, and the same notes as blocks. */
  snapshot: { text: string; cut: boolean; length: number; blocks: SnapshotBlock[] };
  /** No note ticked yet. */
  empty: boolean;
}

/**
 * The quest card as the mentor will get it: one compact sticky per note, in
 * the stored order, with its version and "เปลี่ยนเพราะ" lines, and its length
 * against the 2000 cap. The exact stored text stays one tap away.
 */
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
        <>
          <ul className={styles.cardTiles} lang="th">
            {snapshot.blocks.map((block, i) => (
              <li
                key={`${block.kind}:${block.day ?? 0}:${i}`}
                className={styles.cardTile}
                style={{ "--sticky": SHIFT_CARDS[block.kind]?.color ?? "#fff3bf" } as CSSProperties}
              >
                <p className={styles.cardTileHead}>{block.header}</p>
                <p className={styles.cardTileBody}>{block.body}</p>
                {block.whys.map((why) => (
                  <p key={why} className={styles.reason}>
                    {why}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          <details className={styles.cardRaw}>
            <summary className={styles.cardRawSummary}>{PREVIEW.raw}</summary>
            <pre className={styles.card} lang="th" data-testid="quest-card-text">
              {snapshot.text}
            </pre>
          </details>
        </>
      )}
      {snapshot.cut ? <p className={styles.warn}>{PREVIEW.cut}</p> : null}
      <p className={styles.fine}>{PREVIEW.frozen}</p>
    </section>
  );
}
