import { SCHOOL_FAQ } from "@/lib/content/shift-school";

import { SchoolSection } from "./SchoolSection";
import styles from "./shiftSchool.module.css";

/** Native details/summary: works without JS and with keyboards. */
export function SchoolFaq() {
  return (
    <SchoolSection id="faq" eyebrow={SCHOOL_FAQ.eyebrow} heading={SCHOOL_FAQ.heading}>
      <div className={styles.faq}>
        {SCHOOL_FAQ.items.map((item) => (
          <details key={item.q}>
            <summary className="font-kodchasan">
              <span>{item.q}</span>
              <span className={styles.faqToggle} aria-hidden="true">
                +
              </span>
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </SchoolSection>
  );
}
