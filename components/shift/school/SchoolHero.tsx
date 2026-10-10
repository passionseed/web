import { ArrowRight } from "lucide-react";

import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { ChromeBevelFilter, ChromeWordmark, OrbitSky } from "@/components/shift/poster/riso";
import gallery from "@/components/shift/shiftGallery.module.css";
import { NOTES } from "@/lib/content/pathlab-page";
import { SCHOOL_CONTACT_LINKS, SCHOOL_HERO, SCHOOL_OFFER, baht } from "@/lib/content/shift-school";

import styles from "./shiftSchool.module.css";

/** School-cohort price with the regular price struck through, read out in full. */
function SchoolPrice() {
  return (
    <p className={styles.price}>
      <span className={styles.priceLabel}>{SCHOOL_HERO.priceLabel}</span>
      <span className={`${styles.priceValue} font-kodchasan`}>{baht(SCHOOL_OFFER.priceBaht)}</span>
      <span className={styles.priceWas}>
        (จาก <s>{baht(SCHOOL_OFFER.regularPriceBaht)}</s>)
      </span>
      <span className={styles.priceUnit}>{SCHOOL_HERO.priceUnit}</span>
    </p>
  );
}

/**
 * Compact riso hero, same sky and chrome wordmark as /shift, with the facts
 * a teacher and a parent both need before scrolling: price, who pays, cohort
 * size and the minimum to open.
 */
export function SchoolHero() {
  return (
    <header className={gallery.hero}>
      <ChromeBevelFilter />
      <OrbitSky horizon="460px" speckle={0} />
      <ShiftTopBar back={{ href: "/shift", label: "SHIFT ทุกรุ่น" }} />
      <div className={`${gallery.container} ${gallery.heroInner} ${styles.heroInner}`}>
        <div className={gallery.heroBrand}>
          <p className={gallery.eyebrow}>{SCHOOL_HERO.eyebrow}</p>
          <div aria-hidden="true" className={gallery.wordmark}>
            <ChromeWordmark size="clamp(94px, 10vw, 136px)" name="SHIFT" />
          </div>
          <p className={styles.badge}>{SCHOOL_HERO.badge}</p>
        </div>

        <div className={gallery.heroCopy}>
          <h1 className="font-kodchasan">
            <span className="sr-only">SHIFT สำหรับโรงเรียน: </span>
            {SCHOOL_HERO.headline}
          </h1>
          <p>{SCHOOL_HERO.promise}</p>
          <SchoolPrice />
          <dl className={styles.heroFacts}>
            {SCHOOL_HERO.facts.map((fact) => (
              <div key={fact.term}>
                <dt>{fact.term}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.actions}>
            <a
              href={SCHOOL_CONTACT_LINKS.igDm}
              target="_blank"
              rel="noopener noreferrer"
              className={`shift-button ${styles.cta}`}
            >
              <span>{SCHOOL_HERO.primaryCta}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <p className={styles.readAs}>
              <span>{SCHOOL_HERO.readAs.label}</span>
              <a href={SCHOOL_HERO.readAs.teacher.href}>{SCHOOL_HERO.readAs.teacher.label}</a>
              <a href={SCHOOL_HERO.readAs.parent.href}>{SCHOOL_HERO.readAs.parent.label}</a>
            </p>
          </div>
          <p className={styles.heroNote}>
            <span className="pathlab-note">{NOTES.schoolHero}</span>
          </p>
        </div>
      </div>
    </header>
  );
}
