"use client";

import { AWAY } from "../copy";
import styles from "./away.module.css";

/**
 * The come-back DM's consent, asked once on the island (never in a DM): one
 * line and two equal buttons, ส่งได้ / ไม่ต้อง. Sits in the team sheet right
 * after the consent banner, and only when that banner shows nothing. The
 * choice stays changeable in ตั้งค่า and in Discord /settings.
 */
export function AwayStrip({ days, pending, onAnswer }: { days: number; pending: boolean; onAnswer: (on: boolean) => void }) {
  return (
    <section className={styles.strip} aria-label={AWAY.strip.label}>
      <p className={styles.stripText}>
        <span className={styles.lamp} aria-hidden="true" />
        {AWAY.strip.ask(days)}
      </p>
      <div className={styles.stripButtons}>
        <button type="button" className={styles.stripButton} disabled={pending} onClick={() => onAnswer(true)}>
          {AWAY.strip.yes}
        </button>
        <button type="button" className={styles.stripButton} disabled={pending} onClick={() => onAnswer(false)}>
          {AWAY.strip.no}
        </button>
      </div>
    </section>
  );
}
