import { SCHOOL_WHO } from "@/lib/content/shift-school";

import { SchoolSection } from "./SchoolSection";
import styles from "./shiftSchool.module.css";

/** Who is behind SHIFT and why, in two lines: parents and teachers ask this before they ask about price. */
export function SchoolWho() {
  return (
    <SchoolSection id="who" eyebrow={SCHOOL_WHO.eyebrow} heading={SCHOOL_WHO.heading}>
      <div className={styles.callout}>
        <p className={`${styles.calloutTitle} font-kodchasan`}>{SCHOOL_WHO.body}</p>
        <p className={styles.calloutBody}>{SCHOOL_WHO.why}</p>
      </div>
    </SchoolSection>
  );
}
