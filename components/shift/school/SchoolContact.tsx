import { ArrowRight, ArrowUp, MessageCircle } from "lucide-react";

import gallery from "@/components/shift/shiftGallery.module.css";
import { NOTES } from "@/lib/content/pathlab-page";
import { SCHOOL_CONTACT, SCHOOL_CONTACT_LINKS } from "@/lib/content/shift-school";

import styles from "./shiftSchool.module.css";

export const SCHOOL_CONTACT_ID = "start";

/**
 * Closing call to action. Same door as /pathlab/partner: an Instagram DM
 * thread that lands in the existing DM lead funnel, with the SHIFT LINE OA
 * beside it for parents who would rather ask there.
 */
export function SchoolContact() {
  return (
    <section
      id={SCHOOL_CONTACT_ID}
      aria-labelledby={`${SCHOOL_CONTACT_ID}-heading`}
      className={styles.contact}
      data-shift-reveal
    >
      <p className={`${gallery.eyebrow} ${styles.contactEyebrow}`}>
        {SCHOOL_CONTACT.eyebrow}
      </p>
      <h2 id={`${SCHOOL_CONTACT_ID}-heading`} className="font-kodchasan">
        {SCHOOL_CONTACT.heading}
      </h2>
      <p className={styles.lead}>{SCHOOL_CONTACT.body}</p>

      <ol className={styles.steps}>
        {SCHOOL_CONTACT.steps.map((step, index) => (
          <li key={step}>
            <span className={styles.stepNum} aria-hidden="true">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className={`${styles.actions} ${styles.contactActions}`}>
        <a
          href={SCHOOL_CONTACT_LINKS.igDm}
          target="_blank"
          rel="noopener noreferrer"
          className={`shift-button ${styles.cta}`}
        >
          <span>{SCHOOL_CONTACT.primaryCta}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </a>
        <a href={SCHOOL_CONTACT_LINKS.line} target="_blank" rel="noopener noreferrer" className={styles.secondary}>
          <MessageCircle size={16} aria-hidden="true" />
          {SCHOOL_CONTACT.secondaryCta}
        </a>
      </div>
      <p className={styles.parentLine}>{SCHOOL_CONTACT.parentLine}</p>
      <p className={styles.contactNote}>
        <span className="pathlab-note pathlab-note--tilt-r">{NOTES.schoolContact}</span>
      </p>

      <footer className={gallery.footer}>
        <span>{SCHOOL_CONTACT.footer}</span>
        <a href="#top" className={gallery.textLink}>
          {SCHOOL_CONTACT.backToTop} <ArrowUp size={16} aria-hidden="true" />
        </a>
      </footer>
    </section>
  );
}
