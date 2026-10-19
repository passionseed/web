import { ShieldCheck } from "lucide-react";

import { ChromeWordmark } from "@/components/shift/poster/riso";
import { SCHOOL_PROMISE } from "@/lib/content/shift-school";

import { SchoolSection } from "./SchoolSection";
import styles from "./shiftSchool.module.css";

/** The one measurable promise, with the free extension if a student falls short. */
export function SchoolPromise() {
  return (
    <SchoolSection id="promise" eyebrow={SCHOOL_PROMISE.eyebrow} heading={SCHOOL_PROMISE.heading}>
      <div className={styles.promise}>
        <div className={styles.numeral}>
          <div aria-hidden="true">
            <ChromeWordmark size="clamp(96px, 12vw, 148px)" name={SCHOOL_PROMISE.numeral} />
          </div>
          <p className={styles.numeralCaption}>
            <span className="sr-only">{SCHOOL_PROMISE.numeral} </span>
            {SCHOOL_PROMISE.numeralCaption}
          </p>
        </div>
        <div>
          <p className={styles.lead}>{SCHOOL_PROMISE.body}</p>
          <p className={styles.guarantee}>
            <ShieldCheck size={18} aria-hidden="true" />
            <span>{SCHOOL_PROMISE.guarantee}</span>
          </p>
        </div>
      </div>
    </SchoolSection>
  );
}
