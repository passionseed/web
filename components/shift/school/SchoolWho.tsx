import { SCHOOL_WHO } from "@/lib/content/shift-school";

import { SchoolSection } from "./SchoolSection";
import styles from "./shiftSchool.module.css";

/** Who is behind SHIFT, why, and the track record: parents and teachers ask this before they ask about price. */
export function SchoolWho() {
  return (
    <SchoolSection id="who" eyebrow={SCHOOL_WHO.eyebrow} heading={SCHOOL_WHO.heading}>
      <div className={styles.callout}>
        <p className={`${styles.calloutTitle} font-kodchasan`}>{SCHOOL_WHO.body}</p>
        <p className={styles.calloutBody}>{SCHOOL_WHO.why}</p>
      </div>
      <dl className={styles.proof}>
        {SCHOOL_WHO.proof.map((item) => (
          <div key={item.stat} className={styles.proofItem}>
            <dt className={`${styles.proofStat} font-kodchasan`}>{item.stat}</dt>
            <dd className={styles.proofLabel}>{item.label}</dd>
          </div>
        ))}
      </dl>
    </SchoolSection>
  );
}
