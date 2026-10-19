import { NOTES } from "@/lib/content/pathlab-page";
import { SCHOOL_PARTNERSHIP } from "@/lib/content/shift-school";

import { SchoolList } from "./SchoolList";
import { SchoolSection } from "./SchoolSection";
import styles from "./shiftSchool.module.css";

/** What the school gets, the two things it does, what it never has to do, and safeguarding. */
export function SchoolPartnership() {
  const { gets, does, doesNot, safeguarding, never } = SCHOOL_PARTNERSHIP;
  return (
    <SchoolSection
      id="school"
      eyebrow={SCHOOL_PARTNERSHIP.eyebrow}
      heading={SCHOOL_PARTNERSHIP.heading}
      aside={SCHOOL_PARTNERSHIP.aside}
      note={NOTES.schoolPartnership}
      noteTilt="right"
    >
      <div className={`${styles.columns} ${styles.columns3}`}>
        <SchoolList title={gets.title} items={gets.items} />
        <div>
          <SchoolList title={does.title} items={does.items} />
          <div className={styles.doesNot}>
            <p className="font-kodchasan font-semibold">{doesNot.title}</p>
            <p className={styles.listBody}>{doesNot.body}</p>
          </div>
        </div>
        <SchoolList title={safeguarding.title} items={safeguarding.items} />
      </div>
      <p className={styles.never}>{never}</p>
    </SchoolSection>
  );
}
