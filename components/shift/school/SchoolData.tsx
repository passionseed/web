import { NOTES } from "@/lib/content/pathlab-page";
import { SCHOOL_CONTACT_LINKS, SCHOOL_DATA, type SchoolConsentLayer } from "@/lib/content/shift-school";

import { SchoolList } from "./SchoolList";
import { SchoolSection } from "./SchoolSection";
import styles from "./shiftSchool.module.css";

function ConsentLayer({ layer }: { layer: SchoolConsentLayer }) {
  return (
    <li className={styles.layer} data-required={layer.required}>
      <span className={styles.layerTag}>{layer.tag}</span>
      <h3 className={`${styles.layerTitle} font-kodchasan`}>{layer.title}</h3>
      <p className={styles.listBody}>{layer.body}</p>
      {layer.options && (
        <ul className={styles.options} aria-label="ระดับที่เลือกได้">
          {layer.options.map((option) => (
            <li key={option}>{option}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Data and consent, written for the parent. Every SHIFT round is product
 * R&D, so this is consent to use learning data to improve the program, not
 * enrolment in an academic study: why we collect, the one required consent
 * and the two optional ones, what we collect, and what we promise.
 */
export function SchoolData() {
  return (
    <SchoolSection
      id="data"
      eyebrow={SCHOOL_DATA.eyebrow}
      heading={SCHOOL_DATA.heading}
      aside={SCHOOL_DATA.aside}
      note={NOTES.schoolData}
    >
      <h3 className={`${styles.calloutTitle} font-kodchasan`}>{SCHOOL_DATA.why.title}</h3>
      <p className={`${styles.lead} mt-1`}>{SCHOOL_DATA.why.body}</p>
      <p className={styles.joinLine}>{SCHOOL_DATA.joinLine}</p>

      <ol className={styles.layers}>
        {SCHOOL_DATA.layers.map((layer) => (
          <ConsentLayer key={layer.title} layer={layer} />
        ))}
      </ol>

      <div className={styles.columns}>
        <SchoolList title={SCHOOL_DATA.collect.title} items={SCHOOL_DATA.collect.items} />
        <SchoolList title={SCHOOL_DATA.promises.title} items={SCHOOL_DATA.promises.items} />
      </div>
      <p className={styles.contactLine}>
        {SCHOOL_DATA.contactLabel}{" "}
        <a href={`mailto:${SCHOOL_CONTACT_LINKS.dataEmail}`}>{SCHOOL_CONTACT_LINKS.dataEmail}</a>
      </p>
    </SchoolSection>
  );
}
