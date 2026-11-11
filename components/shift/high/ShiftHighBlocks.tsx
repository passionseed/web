import Link from "next/link";
import { ArrowUpRight, Check, X } from "lucide-react";

import { RisoIcon } from "@/components/shift/poster/RisoIcons";
import {
  SHIFT_HIGH,
  SHIFT_HIGH_COMMUNITY,
  SHIFT_HIGH_GOALS,
  SHIFT_HIGH_PATH,
  SHIFT_HIGH_PRIZES,
  type ShiftHighPoint,
} from "@/lib/content/shift-high";

import styles from "./shiftHigh.module.css";

/** Aurora, nebula, sol: the accents of the space pages this section sits on. */
const INKS = ["#7fe3ff", "#9d8cff", "#ffd29a"];

function Label({ children, ink }: { children: string; ink: string }) {
  return (
    <p className={styles.label} style={{ color: ink }}>
      {children}
    </p>
  );
}

function Points({ points }: { points: readonly ShiftHighPoint[] }) {
  return (
    <ul className={styles.points}>
      {points.map((point, i) => (
        <li key={point.title}>
          <RisoIcon flat name={point.icon} ink={INKS[i % INKS.length]} size={36} />
          <div>
            <h4>{point.title}</h4>
            <p>{point.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The goal card as it looks on the alumni board, filled in as an example. */
function GoalCard() {
  const goals = SHIFT_HIGH_GOALS;
  return (
    <figure className={styles.card}>
      <figcaption className={styles.cardHead}>
        <span>{goals.cardName}</span>
        <span className={styles.cardTag}>{goals.cardTag}</span>
      </figcaption>
      <dl className={styles.cardRows}>
        {goals.rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.example}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.cardFoot}>
        <span className={styles.tick} aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
        <span className={styles.tick} aria-hidden="true"><X size={14} strokeWidth={3} /></span>
        {goals.checkIn}
      </p>
    </figure>
  );
}

/**
 * The SHIFT High pitch: community, goals, prizes. Each page gives it its own
 * heading; `sessionLine` is the weekly slot from the alumni calendar.
 */
export function ShiftHighBlocks({ sessionLine }: { sessionLine: string }) {
  const community = SHIFT_HIGH_COMMUNITY.points.map((point, i) =>
    i === 0 ? { ...point, body: sessionLine } : point,
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div>
          <Label ink={INKS[0]}>{SHIFT_HIGH_COMMUNITY.label}</Label>
          <h3 className={styles.blockTitle}>{SHIFT_HIGH_COMMUNITY.title}</h3>
          <Points points={community} />
        </div>
        <div>
          <Label ink={INKS[1]}>{SHIFT_HIGH_GOALS.label}</Label>
          <h3 className={styles.blockTitle}>{SHIFT_HIGH_GOALS.title}</h3>
          <p className={styles.blockBody}>{SHIFT_HIGH_GOALS.body}</p>
          <GoalCard />
        </div>
      </div>

      <div className={styles.prizes}>
        <Label ink={INKS[2]}>{SHIFT_HIGH_PRIZES.label}</Label>
        <h3 className={styles.blockTitle}>{SHIFT_HIGH_PRIZES.title}</h3>
        <ol className={styles.prizeGrid}>
          {SHIFT_HIGH_PRIZES.points.map((point, i) => (
            <li key={point.title} style={{ borderTopColor: INKS[i % INKS.length] }}>
              <RisoIcon flat name={point.icon} ink={INKS[i % INKS.length]} size={40} />
              <div>
                <h4>{point.title}</h4>
                <p>{point.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <Link href={SHIFT_HIGH_PATH} className={styles.cta}>
        {SHIFT_HIGH.cta} <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
