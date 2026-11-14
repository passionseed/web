"use client";

import { useId } from "react";

import type { QuestGuide } from "@/lib/shift-island/quest-canvas";

import { QUEST } from "./copy";
import styles from "./island.module.css";

/** What the mentor looks for: the guide's checklist (at most 3), else the quest's own criteria as one item. */
export function doneWhenItems(guide: QuestGuide, evidence: string): string[] {
  if (guide.checklist.length > 0) return guide.checklist.slice(0, 3).map((item) => item.label);
  const criteria = evidence.trim();
  return criteria ? [criteria] : [];
}

/**
 * "เสร็จเมื่อ" as one compact reminder on top of a send form, a line or two:
 * a reminder of what the mentor looks for, never a gate.
 */
export function DoneWhenLine({ items }: { items: string[] }) {
  const headingId = useId();
  if (items.length === 0) return null;
  return (
    <div className={styles.doneLine}>
      <span id={headingId} className={styles.doneLineHeading}>
        {QUEST.doneWhen.heading}
      </span>
      <ul aria-labelledby={headingId} className={styles.doneLineList}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
