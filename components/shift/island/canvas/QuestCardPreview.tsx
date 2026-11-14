"use client";

import type { CSSProperties } from "react";

import { CARD_LIMITS } from "@/lib/shift-island/quest-canvas";
import type { SnapshotBlock } from "@/lib/supabase/shift-quests/canvas-snapshot";
import { SHIFT_CARDS } from "@/lib/whiteboard/shift-cards";

import { PREVIEW } from "./copy";
import styles from "./canvas.module.css";

export interface QuestCardPreviewProps {
  /** buildSnapshot's output: the exact text the server will store, and the same notes as blocks. */
  snapshot: { text: string; cut: boolean; length: number; blocks: SnapshotBlock[] };
}

/**
 * The quest card as the mentor will get it (step 2): one compact sticky per
 * note, in the stored order, with its version and "เปลี่ยนเพราะ" lines. Under
 * it, the exact stored text one tap away and the length against the 2000 cap.
 */
export function QuestCardPreview({ snapshot }: QuestCardPreviewProps) {
  return (
    <section className={styles.preview} aria-label={PREVIEW.heading}>
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
      {snapshot.cut ? <p className={styles.warn}>{PREVIEW.cut}</p> : null}
      <details className={styles.cardRaw}>
        <summary className={styles.cardRawSummary}>
          <span>{PREVIEW.raw}</span>
          <span className={styles.meter} data-near={snapshot.length >= CARD_LIMITS.evidence * 0.9 ? "true" : undefined}>
            {PREVIEW.meter(snapshot.length)}
          </span>
        </summary>
        <pre className={styles.card} lang="th" data-testid="quest-card-text">
          {snapshot.text}
        </pre>
      </details>
    </section>
  );
}
