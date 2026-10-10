import { SCHOOL_ARC } from "@/lib/content/shift-school";

import { SchoolSection } from "./SchoolSection";
import styles from "./shiftSchool.module.css";

/** The 7-day arc as a numbered rail: horizontal on desktop, vertical on phones. */
export function SchoolArc() {
  return (
    <SchoolSection id="arc" eyebrow={SCHOOL_ARC.eyebrow} heading={SCHOOL_ARC.heading} aside={SCHOOL_ARC.aside}>
      <ol className={styles.arc}>
        {SCHOOL_ARC.steps.map((step) => (
          <li key={step.day} className={styles.arcStep}>
            <p className={styles.arcDay}>{step.day}</p>
            <h3 className={`${styles.arcTitle} font-kodchasan`}>{step.title}</h3>
            <p className={styles.arcBody}>{step.body}</p>
            <p className={styles.arcWith}>{step.with}</p>
          </li>
        ))}
      </ol>
    </SchoolSection>
  );
}
